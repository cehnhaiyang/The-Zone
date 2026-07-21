/**
 * API Key 服务
 * 统一管理所有平台的 API Key 池，提供：
 * - 多 Key 轮询（Round-Robin 与智能权重）
 * - 健康检测：Key 失效后自动标记并跳过
 * - 冷却恢复：被限流的 Key 在冷却期后自动恢复
 * - 状态可观测：可查询每个 Key 的健康状态与调用统计
 */

import { ApiPlatform, Settings } from "../meta";

/** 单个 Key 的运行时状态 */
interface KeyState {
    /** 原始 Key 值 */
    key: string;
    /** 是否可用（未被永久禁用） */
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
    /** 冷却结束时间戳（限流/临时错误后的恢复时间点） */
    cooldownUntil: number;
    /** 最后一次错误信息 */
    lastError: string;
    /** 本轮是否已尝试过（用于限制只轮询一次） */
    triedInCurrentRound: boolean;
}

/** Key 健康快照（对外暴露的只读视图） */
export interface KeyHealthSnapshot {
    key: string;
    /** 脱敏后的 Key（仅显示前6位和后4位） */
    maskedKey: string;
    enabled: boolean;
    isAvailable: boolean;
    /** 状态别名：active, cooldown, disabled */
    status: 'active' | 'cooldown' | 'disabled';
    consecutiveFailures: number;
    totalSuccesses: number;
    /** 别名兼容 */
    successCount: number;
    totalFailures: number;
    /** 别名兼容 */
    failureCount: number;
    cooldownRemaining: number;
    lastError: string;
}

/** 平台级别的健康快照 */
export interface PlatformHealthSnapshot {
    platform: ApiPlatform;
    totalKeys: number;
    availableKeys: number;
    disabledKeys: number;
    coolingDownKeys: number;
    keys: KeyHealthSnapshot[];
}

/** 连续失败超过此阈值后，Key 被自动禁用 */
const MAX_CONSECUTIVE_FAILURES = 5;

/** 限流冷却基础时间 (ms)：30秒 */
const RATE_LIMIT_COOLDOWN_BASE = 30_000;

/** 认证失败冷却时间 (ms)：10分钟（几乎等于永久禁用，需要用户手动更换 Key） */
const AUTH_FAILURE_COOLDOWN = 600_000;

/** 通用错误冷却时间 (ms)：10秒 */
const GENERIC_COOLDOWN = 10_000;

/**
 * 脱敏 Key 值，仅保留前6位和后4位
 */
function maskKey(key: string): string {
    if (!key) return '';
    if (key.length <= 10) return '***';
    return `${key.substring(0, 6)}...${key.substring(key.length - 4)}`;
}

/**
 * 判断错误类型以确定冷却策略
 */
function classifyError(error: unknown): 'auth' | 'rate_limit' | 'quota' | 'temporary' | 'unknown' {
    const msg = ((error as Error)?.message || String(error)).toLowerCase();
    const statusCode = (error as { statusCode?: number })?.statusCode;

    if (statusCode === 401 || msg.includes('api key') || msg.includes('unauthorized') || msg.includes('invalid')) {
        return 'auth';
    }
    if (statusCode === 429 || msg.includes('rate limit') || msg.includes('too many request')) {
        return 'rate_limit';
    }
    if (msg.includes('quota') || msg.includes('exceeded') || msg.includes('billing')) {
        return 'quota';
    }
    if (statusCode && statusCode >= 500) {
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
    private pools: Map<ApiPlatform, KeyState[]> = new Map();
    /** 各平台的轮询下标 */
    private roundRobinIndex: Map<ApiPlatform, number> = new Map();
    /** 各平台的轮次标记（用于重置 triedInCurrentRound） */
    private roundCounter: Map<ApiPlatform, number> = new Map();

    /** 平台枚举常量 */
    private readonly PLATFORMS: ApiPlatform[] = ['groq', 'google', 'zhipu', 'pollinations', 'chat2api', 'deapi', 'qwenstudio'];

    /**
     * 注册/更新某平台的 Key 列表
     * 会保留已有 Key 的运行时状态，仅增减差异部分
     */
    registerKeys(platform: ApiPlatform, keys: string[]): void {
        const validKeys = keys.filter(k => k && k.trim() !== '');

        if (validKeys.length === 0) {
            this.pools.set(platform, []);
            return;
        }

        const existingPool = this.pools.get(platform) || [];
        const existingMap = new Map(existingPool.map(s => [s.key, s]));

        const newPool: KeyState[] = validKeys.map(key => {
            // 保留已存在的 Key 状态，避免重复注册时丢失统计数据
            const existing = existingMap.get(key);
            if (existing) return existing;

            return {
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
            };
        });

        this.pools.set(platform, newPool);

        // 确保轮询下标不越界
        if (!this.roundRobinIndex.has(platform)) {
            this.roundRobinIndex.set(platform, 0);
        }
    }

    /**
     * 从 Settings 中批量注册所有平台的 Key
     * 在应用启动或设置变更时调用
     */
    registerFromSettings(settings: Partial<Settings>): void {
        this.registerKeys('groq', settings.groqKeys || []);
        this.registerKeys('google', settings.googleKeys || []);
        this.registerKeys('zhipu', settings.zhipuKeys || []);
        this.registerKeys('pollinations', settings.pollinationsKeys || []);
        this.registerKeys('chat2api', settings.chat2apiKeys || []);
        this.registerKeys('deapi', settings.deapiKeys || []);
        this.registerKeys('qwenstudio', settings.qwenstudioKeys || []);
    }

    /**
     * 重置某平台的轮次标记，允许重新开始轮询
     * (暴露为 public，供全局主循环或用户重试时主动解开死锁)
     */
    public resetRound(platform: ApiPlatform): void {
        const pool = this.pools.get(platform);
        if (!pool) return;

        // 重置所有 key 的尝试标记
        for (const state of pool) {
            state.triedInCurrentRound = false;
        }

        // 增加轮次计数
        const currentRound = this.roundCounter.get(platform) || 0;
        this.roundCounter.set(platform, currentRound + 1);
    }

    /**
     * 强行重置所有平台的轮询标记
     * (建议在玩家点击"重试"或进入新一回合探索时调用)
     */
    public resetAllRounds(): void {
        this.PLATFORMS.forEach(p => this.resetRound(p));
    }

    /**
     * 检查是否所有可用的 key 都已尝试过
     */
    private allKeysTried(platform: ApiPlatform): boolean {
        const pool = this.pools.get(platform);
        if (!pool || pool.length === 0) return true;

        // 如果只有一个 key，不进行轮询限制，直接 pass 允许重复使用
        if (pool.length === 1) {
            return false;
        }

        const now = Date.now();
        // 检查所有启用且不在冷却中的 key 是否都已尝试过
        const availableKeys = pool.filter(s => s.enabled && now >= s.cooldownUntil);
        if (availableKeys.length === 0) return true; // 没有可用Key，直接视同全试过

        return availableKeys.every(s => s.triedInCurrentRound);
    }

    /**
     * 获取下一个可用的 Key（核心轮询逻辑）
     *
     * 策略：
     * 1. 若平台仅有 1 个 Key，不进行轮询、健康/冷却管理，直接 pass 返回该 Key
     * 2. 若有多 Key，从当前轮询位置开始遍历
     * 3. 跳过已禁用、正在冷却中、或本轮已尝试过的 Key
     * 4. 如果所有可用 Key 都已尝试过，抛出错误（不再重复轮询）
     * 5. 如果确实没有任何 Key，抛出错误
     */
    getNextKey(platform: ApiPlatform): string {
        const pool = this.pools.get(platform);

        if (!pool || pool.length === 0) {
            throw new Error(`[KeyService] 平台 ${platform} 没有配置任何 API Key`);
        }

        // 单 Key 特殊处理：不轮询、不校验健康/冷却状态，直接 pass
        if (pool.length === 1) {
            return pool[0].key;
        }

        const now = Date.now();
        let startIndex = this.roundRobinIndex.get(platform) || 0;

        // 检查是否所有可用 key 都已尝试过
        if (this.allKeysTried(platform)) {
            throw new Error(`[KeyService] 平台 ${platform} 所有可用的 API Key 都已在此轮任务中尝试过并失败，请求被阻断。`);
        }

        // 寻找下一个可用且未尝试过的 Key
        for (let i = 0; i < pool.length; i++) {
            const idx = (startIndex + i) % pool.length;
            const state = pool[idx];

            // 跳过已禁用、冷却中、或本轮已尝试过的 key
            if (state.enabled && now >= state.cooldownUntil && !state.triedInCurrentRound) {
                // 标记为已尝试
                state.triedInCurrentRound = true;
                // 更新轮询下标到下一个位置
                this.roundRobinIndex.set(platform, (idx + 1) % pool.length);
                return state.key;
            }
        }

        // 如果走到这里，说明没有找到可用的 key (例如全在冷却中)
        throw new Error(`[KeyService] 平台 ${platform} 当前没有可用的 API Key (可能均在冷却或已被禁用)`);
    }

    /**
     * 上报 Key 调用成功
     * 重置连续失败计数，恢复信任，并重置轮次（允许重新开始轮询）
     */
    reportSuccess(platform: ApiPlatform, key: string): void {
        const pool = this.pools.get(platform);
        if (pool && pool.length === 1) return; // 单 Key 不进行轮询管理与统计，直接 pass

        const state = this.findKeyState(platform, key);
        if (!state) return;

        state.consecutiveFailures = 0;
        state.totalSuccesses++;
        state.lastSuccessAt = Date.now();
        state.lastError = '';

        // 如果之前被 cooldown，成功调用后立即清除
        state.cooldownUntil = 0;

        // 成功后重置该平台轮次，打破可能存在的池污染
        this.resetRound(platform);
    }

    /**
     * 上报 Key 调用失败
     * 根据错误类型设置不同的冷却时间
     */
    reportFailure(platform: ApiPlatform, key: string, error: unknown): void {
        const pool = this.pools.get(platform);
        if (pool && pool.length === 1) return; // 单 Key 不进行错误标记、冷却与健康管理，直接 pass

        const state = this.findKeyState(platform, key);
        if (!state) return;

        state.consecutiveFailures++;
        state.totalFailures++;
        state.lastFailureAt = Date.now();
        state.lastError = (error as Error)?.message || String(error);

        const errorClass = classifyError(error);
        const now = Date.now();

        switch (errorClass) {
            case 'auth':
                // 认证失败：长时间冷却（基本等于需要用户换 Key）
                state.cooldownUntil = now + AUTH_FAILURE_COOLDOWN;
                console.warn('[KeyService] Key 认证失败，已进入长时间冷却', { platform, maskedKey: maskKey(key) });
                break;

            case 'rate_limit':
                // 限流：指数退避冷却
                const rateLimitCooldown = RATE_LIMIT_COOLDOWN_BASE * Math.pow(2, Math.min(state.consecutiveFailures - 1, 4));
                state.cooldownUntil = now + rateLimitCooldown;
                console.warn('[KeyService] Key 被限流，冷却', Math.round(rateLimitCooldown / 1000), '秒', { platform, maskedKey: maskKey(key) });
                break;

            case 'quota':
                // 配额耗尽：长时间冷却
                state.cooldownUntil = now + AUTH_FAILURE_COOLDOWN;
                console.warn('[KeyService] Key 配额耗尽，已进入长时间冷却', { platform, maskedKey: maskKey(key) });
                break;

            case 'temporary':
                // 服务端临时错误：短冷却
                state.cooldownUntil = now + GENERIC_COOLDOWN;
                break;

            default:
                // 未知错误：短冷却
                state.cooldownUntil = now + GENERIC_COOLDOWN;
                break;
        }

        // 连续失败过多，自动禁用
        if (state.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            state.enabled = false;
            console.warn('[KeyService] Key 连续失败', state.consecutiveFailures, '次，已自动禁用', { platform, maskedKey: maskKey(key) });
        }
    }

    /**
     * 手动重新启用某平台的所有 Key（用户更换 Key 后调用）
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
        this.roundCounter.set(platform, 0);
        console.info('[KeyService] 平台', platform, '所有 Key 已重置');
    }

    /**
     * 获取某平台的健康状态快照
     */
    getPlatformHealth(platform: ApiPlatform): PlatformHealthSnapshot {
        const pool = this.pools.get(platform) || [];
        const now = Date.now();

        const keys: KeyHealthSnapshot[] = pool.map(s => {
            const isAvailable = s.enabled && now >= s.cooldownUntil;
            const cooldownRemaining = Math.max(0, s.cooldownUntil - now);
            let status: 'active' | 'cooldown' | 'disabled' = 'active';
            if (!s.enabled) status = 'disabled';
            else if (cooldownRemaining > 0) status = 'cooldown';

            return {
                key: s.key,
                maskedKey: maskKey(s.key),
                enabled: s.enabled,
                isAvailable,
                status,
                consecutiveFailures: s.consecutiveFailures,
                totalSuccesses: s.totalSuccesses,
                successCount: s.totalSuccesses, // 兼容字段
                totalFailures: s.totalFailures,
                failureCount: s.totalFailures,  // 兼容字段
                cooldownRemaining,
                lastError: s.lastError,
            };
        });

        return {
            platform,
            totalKeys: pool.length,
            availableKeys: keys.filter(k => k.isAvailable).length,
            disabledKeys: keys.filter(k => !k.enabled).length,
            coolingDownKeys: keys.filter(k => k.enabled && !k.isAvailable).length,
            keys,
        };
    }

    /**
     * 获取所有平台的健康状态（数组格式）
     */
    getAllHealth(): PlatformHealthSnapshot[] {
        return this.PLATFORMS.map(p => this.getPlatformHealth(p));
    }

    /**
     * 获取所有平台的健康状态（Record 映射格式，便于 UI 使用）
     */
    getHealthSnapshot(): Record<string, PlatformHealthSnapshot> {
        const snapshot: Record<string, PlatformHealthSnapshot> = {};
        for (const p of this.PLATFORMS) {
            snapshot[p] = this.getPlatformHealth(p);
        }
        return snapshot;
    }

    /**
     * 检查某平台是否有可用的 Key
     */
    hasAvailableKey(platform: ApiPlatform): boolean {
        const pool = this.pools.get(platform);
        if (!pool || pool.length === 0) return false;
        if (pool.length === 1) return true; // 单 Key 不做健康/冷却限制，直接 pass 可用

        const now = Date.now();
        return pool.some(s => s.enabled && now >= s.cooldownUntil);
    }

    /**
     * 获取某平台已注册的 Key 总数
     */
    getKeyCount(platform: ApiPlatform): number {
        return this.pools.get(platform)?.length || 0;
    }

    /** 内部：查找指定平台中的 Key 状态 */
    private findKeyState(platform: ApiPlatform, key: string): KeyState | undefined {
        const pool = this.pools.get(platform);
        return pool?.find(s => s.key === key);
    }
}

/** 全局单例 */
export const KeyService = new KeyServiceImpl();