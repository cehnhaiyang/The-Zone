/**
 * API Key 服务
 *
 * 统一管理所有平台的 API Key 池，提供：
 * - 多 Key 轮询：Round-Robin
 * - 健康检测：失败标记、冷却、禁用
 * - 冷却恢复：限流 / 认证 / 配额 / 临时错误分级处理
 * - 单 Key 直通：唯一 Key 时不做轮询阻断，但保留基础调用统计
 * - 状态可观测：可查询每个 Key 的健康状态与调用统计
 */

import type { ApiPlatform, Settings } from '../meta';

/** 单个 Key 的运行时状态 */
interface KeyState {
    /** 原始 Key 值 */
    key: string;
    /** 是否可用，未被永久禁用 */
    enabled: boolean;
    /** 连续失败次数 */
    consecutiveFailures: number;
    /** 累计成功调用次数 */
    totalSuccesses: number;
    /** 累计失败调用次数 */
    totalFailures: number;
    /** 上次成功调用时间戳 */
    lastSuccessAt: number;
    /** 上次失败调用时间戳 */
    lastFailureAt: number;
    /** 冷却结束时间戳 */
    cooldownUntil: number;
    /** 最后一次错误信息 */
    lastError: string;
    /** 本轮是否已尝试过 */
    triedInCurrentRound: boolean;
}

/** Key 健康状态别名 */
export type KeyStatus = 'active' | 'cooldown' | 'disabled';

/** Key 健康快照，对外暴露的只读视图 */
export interface KeyHealthSnapshot {
    /** 脱敏后的 Key */
    maskedKey: string;
    enabled: boolean;
    isAvailable: boolean;
    status: KeyStatus;
    consecutiveFailures: number;
    totalSuccesses: number;
    totalFailures: number;
    cooldownRemaining: number;
    lastError: string;
    lastSuccessAt: number;
    lastFailureAt: number;
}

/** 平台级别的健康快照 */
export interface PlatformHealthSnapshot {
    platform: ApiPlatform;
    totalKeys: number;
    availableKeys: number;
    disabledKeys: number;
    coolingDownKeys: number;
    hasAvailableKey: boolean;
    keys: KeyHealthSnapshot[];
}

/** 错误分类 */
type KeyErrorClass = 'auth' | 'rate_limit' | 'quota' | 'temporary' | 'unknown';

/** Settings 中各平台 Key 字段名 */
type PlatformKeyField = `${ApiPlatform}Keys`;

/** 连续失败超过此阈值后，Key 被自动禁用 */
const MAX_CONSECUTIVE_FAILURES = 5;

/** 限流冷却基础时间：30 秒 */
const RATE_LIMIT_COOLDOWN_BASE = 30_000;

/** 认证 / 配额失败冷却时间：10 分钟 */
const AUTH_FAILURE_COOLDOWN = 600_000;

/** 通用错误冷却时间：10 秒 */
const GENERIC_COOLDOWN = 10_000;

/** 支持的平台列表 */
const PLATFORMS: ReadonlyArray<ApiPlatform> = [
    'groq',
    'zhipu',
    'pollinations',
    'deapi',
    'qwenstudio',
    'volcengine',
    'nvidia',
] as const;

/** 平台到 Settings Key 字段的映射 */
const PLATFORM_KEY_FIELDS: Record<ApiPlatform, PlatformKeyField> = {
    groq: 'groqKeys',
    zhipu: 'zhipuKeys',
    pollinations: 'pollinationsKeys',
    deapi: 'deapiKeys',
    qwenstudio: 'qwenstudioKeys',
    volcengine: 'volcengineKeys',
    nvidia: 'nvidiaKeys',
} as const;

/** 创建初始 Key 状态 */
const createKeyState = (key: string): KeyState => ({
    key,
    enabled: true,
    consecutiveFailures: 0,
    totalSuccesses: 0,
    totalFailures: 0,
    lastSuccessAt: 0,
    lastFailureAt: 0,
    cooldownUntil: 0,
    lastError: '',
    triedInCurrentRound: false,
});

/**
 * 脱敏 Key 值，仅保留前 6 位和后 4 位
 */
function maskKey(key: string): string {
    const trimmed = key.trim();

    if (!trimmed) return '';
    if (trimmed.length <= 10) return '**';

    return `${trimmed.substring(0, 6)}...${trimmed.substring(trimmed.length - 4)}`;
}

/** 提取错误信息 */
function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;

    try {
        return JSON.stringify(error);
    } catch {
        return String(error);
    }
}

/** 提取 HTTP 状态码 */
function getStatusCode(error: unknown): number | undefined {
    if (typeof error !== 'object' || error === null) return undefined;

    const err = error as Record<string, unknown>;
    const response = err.response as Record<string, unknown> | undefined;

    const candidates = [err.statusCode, err.status, response?.status];

    return candidates.find((value): value is number => typeof value === 'number');
}

/**
 * 判断错误类型以确定冷却策略
 */
function classifyError(error: unknown): KeyErrorClass {
    const statusCode = getStatusCode(error);
    const msg = getErrorMessage(error).toLowerCase();

    if (
        statusCode === 401 ||
        statusCode === 403 ||
        msg.includes('unauthorized') ||
        msg.includes('authentication') ||
        msg.includes('api key') ||
        msg.includes('invalid api key') ||
        msg.includes('invalid key')
    ) {
        return 'auth';
    }

    if (
        statusCode === 429 ||
        msg.includes('rate limit') ||
        msg.includes('too many request')
    ) {
        return 'rate_limit';
    }

    if (
        statusCode === 402 ||
        msg.includes('quota') ||
        msg.includes('exceeded') ||
        msg.includes('billing') ||
        msg.includes('insufficient')
    ) {
        return 'quota';
    }

    if (
        statusCode === 408 ||
        statusCode === 502 ||
        statusCode === 503 ||
        statusCode === 504 ||
        (typeof statusCode === 'number' && statusCode >= 500) ||
        msg.includes('timeout') ||
        msg.includes('network') ||
        msg.includes('fetch failed') ||
        msg.includes('socket') ||
        msg.includes('econnreset')
    ) {
        return 'temporary';
    }

    return 'unknown';
}

/**
 * 核心 Key 管理器
 * 为每个平台维护独立的 Key 池和轮询状态
 */
class KeyServiceImpl {
    /** 各平台的 Key 状态池 */
    private readonly pools = new Map<ApiPlatform, KeyState[]>();

    /** 各平台的轮询下标 */
    private readonly roundRobinIndex = new Map<ApiPlatform, number>();

    /**
     * 注册 / 更新某平台的 Key 列表
     * 会保留已有 Key 的运行时状态，仅增减差异部分
     */
    registerKeys(platform: ApiPlatform, keys: string[]): void {
        const validKeys = Array.from(
            new Set(
                (keys ?? [])
                    .map((key) => (typeof key === 'string' ? key.trim() : ''))
                    .filter((key) => key !== '')
            )
        );

        if (validKeys.length === 0) {
            this.pools.set(platform, []);
            this.roundRobinIndex.set(platform, 0);
            return;
        }

        const existingPool = this.pools.get(platform) ?? [];
        const existingMap = new Map(existingPool.map((state) => [state.key, state]));

        const nextPool = validKeys.map(
            (key) => existingMap.get(key) ?? createKeyState(key)
        );

        /**
         * 单 Key 模式采取直通策略：
         * 不因历史失败而阻断唯一 Key，否则平台会完全不可用。
         */
        if (nextPool.length === 1) {
            nextPool[0].enabled = true;
            nextPool[0].cooldownUntil = 0;
            nextPool[0].triedInCurrentRound = false;
        }

        this.pools.set(platform, nextPool);

        const currentIndex = this.roundRobinIndex.get(platform) ?? 0;
        if (currentIndex >= nextPool.length) {
            this.roundRobinIndex.set(platform, 0);
        }
    }

    /**
     * 从 Settings 中批量注册所有平台的 Key
     *
     * 仅处理显式传入的 Key 字段，避免 Partial<Settings>
     * 因缺省字段误清空已有平台 Key 池。
     */
    registerFromSettings(settings: Partial<Settings> = {}): void {
        for (const platform of PLATFORMS) {
            const field = PLATFORM_KEY_FIELDS[platform];
            const keys = settings[field];

            if (keys !== undefined) {
                this.registerKeys(platform, keys);
            }
        }
    }

    /**
     * 重置某平台的轮次标记，允许重新开始轮询
     */
    resetRound(platform: ApiPlatform): void {
        const pool = this.pools.get(platform);
        if (!pool) return;

        for (const state of pool) {
            state.triedInCurrentRound = false;
        }
    }

    /**
     * 强行重置所有平台的轮询标记
     */
    resetAllRounds(): void {
        for (const platform of PLATFORMS) {
            this.resetRound(platform);
        }
    }

    /**
     * 获取下一个可用的 Key
     *
     * 策略：
     * - 若平台仅有 1 个 Key，直接返回该 Key，不做轮询阻断
     * - 若有多 Key，从当前轮询位置开始遍历
     * - 跳过已禁用、正在冷却中、或本轮已尝试过的 Key
     * - 如果所有可用 Key 都已尝试过，抛出错误
     * - 如果没有任何可用 Key，抛出错误
     */
    getNextKey(platform: ApiPlatform): string {
        const pool = this.pools.get(platform);

        if (!pool || pool.length === 0) {
            throw new Error(`[KeyService] 平台 ${platform} 没有配置任何 API Key`);
        }

        if (pool.length === 1) {
            return pool[0].key;
        }

        const now = Date.now();

        /**
         * 冷却结束后，释放该 Key 在本轮中的尝试标记，
         * 允许其重新参与当前任务轮询。
         */
        for (const state of pool) {
            if (
                state.enabled &&
                state.triedInCurrentRound &&
                state.cooldownUntil > 0 &&
                now >= state.cooldownUntil
            ) {
                state.triedInCurrentRound = false;
            }
        }

        const enabledKeys = pool.filter((state) => state.enabled);

        if (enabledKeys.length === 0) {
            throw new Error(`[KeyService] 平台 ${platform} 的所有 API Key 均已被禁用`);
        }

        const availableKeys = enabledKeys.filter((state) => now >= state.cooldownUntil);

        if (availableKeys.length === 0) {
            const earliestRecovery = Math.min(...enabledKeys.map((state) => state.cooldownUntil));
            const waitSeconds = Math.max(0, Math.ceil((earliestRecovery - now) / 1000));

            throw new Error(
                `[KeyService] 平台 ${platform} 当前所有 API Key 均处于冷却中，约 ${waitSeconds} 秒后恢复`
            );
        }

        const untriedAvailableKeys = availableKeys.filter(
            (state) => !state.triedInCurrentRound
        );

        if (untriedAvailableKeys.length === 0) {
            throw new Error(
                `[KeyService] 平台 ${platform} 本轮所有可用 API Key 均已尝试并失败，请求被阻断`
            );
        }

        const startIndex = this.roundRobinIndex.get(platform) ?? 0;

        for (let i = 0; i < pool.length; i += 1) {
            const idx = (startIndex + i) % pool.length;
            const state = pool[idx];

            if (
                state.enabled &&
                now >= state.cooldownUntil &&
                !state.triedInCurrentRound
            ) {
                state.triedInCurrentRound = true;
                this.roundRobinIndex.set(platform, (idx + 1) % pool.length);
                return state.key;
            }
        }

        throw new Error(`[KeyService] 平台 ${platform} 当前没有可用的 API Key`);
    }

    /**
     * 上报 Key 调用成功
     *
     * 重置连续失败计数、冷却状态，并在多 Key 模式下重置轮次。
     */
    reportSuccess(platform: ApiPlatform, key: string): void {
        const state = this.findKeyState(platform, key);
        if (!state) return;

        state.enabled = true;
        state.consecutiveFailures = 0;
        state.totalSuccesses += 1;
        state.lastSuccessAt = Date.now();
        state.lastError = '';
        state.cooldownUntil = 0;

        if (this.getKeyCount(platform) > 1) {
            this.resetRound(platform);
        }
    }

    /**
     * 上报 Key 调用失败
     *
     * 根据错误类型设置不同冷却时间。
     * 单 Key 模式只记录统计与错误，不进入冷却 / 禁用阻断。
     */
    reportFailure(platform: ApiPlatform, key: string, error: unknown): void {
        const state = this.findKeyState(platform, key);
        if (!state) return;

        state.consecutiveFailures += 1;
        state.totalFailures += 1;
        state.lastFailureAt = Date.now();
        state.lastError = getErrorMessage(error);

        /**
         * 单 Key 直通：
         * 保留错误统计，但不做冷却和禁用，避免唯一 Key 被服务层彻底阻断。
         */
        if (this.getKeyCount(platform) === 1) {
            return;
        }

        const errorClass = classifyError(error);
        const now = Date.now();
        const maskedKey = maskKey(key);

        switch (errorClass) {
            case 'auth': {
                const cooldown = AUTH_FAILURE_COOLDOWN + this.jitter(AUTH_FAILURE_COOLDOWN);
                state.cooldownUntil = now + cooldown;
                state.enabled = false;

                console.warn('[KeyService] Key 认证失败，已自动禁用', {
                    platform,
                    maskedKey,
                });
                break;
            }

            case 'rate_limit': {
                const exponent = Math.min(Math.max(0, state.consecutiveFailures - 1), 4);
                const cooldown = RATE_LIMIT_COOLDOWN_BASE * 2 ** exponent + this.jitter(RATE_LIMIT_COOLDOWN_BASE);

                state.cooldownUntil = now + cooldown;

                console.warn('[KeyService] Key 被限流，进入指数退避冷却', {
                    platform,
                    maskedKey,
                    cooldownSeconds: Math.round(cooldown / 1000),
                });
                break;
            }

            case 'quota': {
                const cooldown = AUTH_FAILURE_COOLDOWN + this.jitter(AUTH_FAILURE_COOLDOWN);
                state.cooldownUntil = now + cooldown;

                console.warn('[KeyService] Key 配额耗尽，进入长时间冷却', {
                    platform,
                    maskedKey,
                    cooldownSeconds: Math.round(cooldown / 1000),
                });
                break;
            }

            case 'temporary': {
                const cooldown = GENERIC_COOLDOWN + this.jitter(GENERIC_COOLDOWN);
                state.cooldownUntil = now + cooldown;
                break;
            }

            default: {
                const cooldown = GENERIC_COOLDOWN + this.jitter(GENERIC_COOLDOWN);
                state.cooldownUntil = now + cooldown;
                break;
            }
        }

        if (
            state.enabled &&
            state.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES
        ) {
            state.enabled = false;

            console.warn('[KeyService] Key 连续失败次数达到阈值，已自动禁用', {
                platform,
                maskedKey,
                consecutiveFailures: state.consecutiveFailures,
            });
        }
    }

    /**
     * 手动重置某平台的所有 Key
     *
     * 用户更换 Key、确认服务恢复、或主动重试时可调用。
     */
    resetPlatform(platform: ApiPlatform): void {
        const pool = this.pools.get(platform);
        if (!pool) return;

        for (const state of pool) {
            state.enabled = true;
            state.consecutiveFailures = 0;
            state.cooldownUntil = 0;
            state.lastError = '';
            state.triedInCurrentRound = false;
        }

        this.roundRobinIndex.set(platform, 0);

        console.info('[KeyService] 平台 Key 池已重置', { platform });
    }

    /**
     * 获取某平台的健康状态快照
     */
    getPlatformHealth(platform: ApiPlatform): PlatformHealthSnapshot {
        const pool = this.pools.get(platform) ?? [];
        const now = Date.now();

        const keys: KeyHealthSnapshot[] = pool.map((state) => {
            const cooldownRemaining = Math.max(0, state.cooldownUntil - now);
            const isAvailable = state.enabled && cooldownRemaining === 0;

            const status: KeyStatus = !state.enabled
                ? 'disabled'
                : cooldownRemaining > 0
                    ? 'cooldown'
                    : 'active';

            return {
                maskedKey: maskKey(state.key),
                enabled: state.enabled,
                isAvailable,
                status,
                consecutiveFailures: state.consecutiveFailures,
                totalSuccesses: state.totalSuccesses,
                totalFailures: state.totalFailures,
                cooldownRemaining,
                lastError: state.lastError,
                lastSuccessAt: state.lastSuccessAt,
                lastFailureAt: state.lastFailureAt,
            };
        });

        return {
            platform,
            totalKeys: pool.length,
            availableKeys: keys.filter((key) => key.isAvailable).length,
            disabledKeys: keys.filter((key) => !key.enabled).length,
            coolingDownKeys: keys.filter((key) => key.status === 'cooldown').length,
            hasAvailableKey: keys.some((key) => key.isAvailable),
            keys,
        };
    }

    /**
     * 获取所有平台的健康状态数组
     */
    getAllHealth(): PlatformHealthSnapshot[] {
        return PLATFORMS.map((platform) => this.getPlatformHealth(platform));
    }

    /**
     * 获取所有平台的健康状态映射
     */
    getHealthSnapshot(): Record<ApiPlatform, PlatformHealthSnapshot> {
        return PLATFORMS.reduce(
            (snapshot, platform) => {
                snapshot[platform] = this.getPlatformHealth(platform);
                return snapshot;
            },
            {} as Record<ApiPlatform, PlatformHealthSnapshot>
        );
    }

    /**
     * 检查某平台是否有可用的 Key
     */
    hasAvailableKey(platform: ApiPlatform): boolean {
        const pool = this.pools.get(platform);

        if (!pool || pool.length === 0) return false;

        if (pool.length === 1) {
            return pool[0].enabled;
        }

        const now = Date.now();

        return pool.some((state) => state.enabled && now >= state.cooldownUntil);
    }

    /**
     * 获取某平台已注册的 Key 总数
     */
    getKeyCount(platform: ApiPlatform): number {
        return this.pools.get(platform)?.length ?? 0;
    }

    /**
     * 内部：查找指定平台中的 Key 状态
     */
    private findKeyState(platform: ApiPlatform, key: string): KeyState | undefined {
        return this.pools.get(platform)?.find((state) => state.key === key);
    }

    /**
     * 内部：为冷却时间增加轻微随机抖动，避免多个 Key 同时恢复造成瞬时请求峰值
     */
    private jitter(base: number): number {
        const safeBase = Math.max(0, base);
        const maxJitter = Math.min(5_000, safeBase * 0.1);

        return Math.floor(Math.random() * maxJitter);
    }
}

/** 全局单例 */
export const KeyService = new KeyServiceImpl();