/**
 * AI 提供商抽象基类 (Base Provider)
 *
 * 在本项目中，LLM一次生成五六分钟是常事，因此不提供超时、重试等功能避免打断LLM生成。
 * 
 * 所有具体 Provider 必须继承此类。
 */

import type { Settings, ApiPlatform } from '../../../meta';
import { KeyService } from '../../KeyService';
import { MODEL_PROVIDER } from '../../../constants/config';

//=============================================================================
// 通用响应类型
//=============================================================================

export interface AIUsage {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
}

export interface AIResponse {
    /** 最终可展示/可消费文本 */
    text: string;
    /** 模型思考过程，若存在 <think> / <thinking> 标签则会被提取 */
    thought?: string;
    /** 原始返回文本 */
    raw?: string;
    /** 结束原因，例如 stop / length / content_filter / MAX_TOKENS */
    finishReason?: string;
    /** Token 使用情况 */
    usage?: AIUsage;
    /** 供应商标识 */
    provider?: string;
    /** 模型标识 */
    model?: string;
}

//=============================================================================
// 文本生成参数
//=============================================================================

export interface TextGenParams {
    model: string;
    systemPrompt: string;
    userPrompt: string;

    /**
     * 可选多轮消息。
     * 若提供，则优先使用该字段，否则回退到 systemPrompt + userPrompt。
     */
    messages?: Array<{
        role: string;
        content: string;
    }>;

    /** 是否强制 JSON 输出 */
    jsonMode?: boolean;

    /**
     * JSON Schema。
     * 对支持结构化输出的提供商可传递，例如 Google Gemini responseSchema。
     */
    schema?: Record<string, unknown>;

    temperature?: number;
    topP?: number;
    topK?: number;
    maxTokens?: number;
    stop?: string | string[];
    seed?: number;

    /**
     * 多模态输出能力，例如：
     * ['TEXT'] / ['IMAGE'] / ['AUDIO']
     */
    responseModalities?: string[];

    /** 业务侧透传元数据，不会必然进入请求体 */
    metadata?: Record<string, unknown>;
}

//=============================================================================
// JSON 修复结果
//=============================================================================

export interface JSONParseResult<T> {
    success: boolean;
    data: T;
    repaired: boolean;
    error?: string;
}

//=============================================================================
// 恢复策略
//=============================================================================

export interface RecoveryStrategy<T> {
    name: string;
    canHandle: (error: unknown) => boolean;
    recover: (error: unknown, context?: unknown) => Promise<T> | T;
}

//=============================================================================
// 错误类型
//=============================================================================

/**
 * 异常边界拦截网。
 * 区分可恢复异常与致命异常，用于上层 UI 展示与决策。
 */
export enum ErrorType {
    /** IO 异常，网络连接中断 */
    NETWORK = 'NETWORK',
    /** 凭据无效，需用户干预 */
    AUTH = 'AUTH',
    /** QPS 超限，需延长请求延迟 */
    RATE_LIMIT = 'RATE_LIMIT',
    /** 账单耗尽，属硬性阻塞 */
    QUOTA = 'QUOTA',
    /** 模型对齐拦截，应尝试调整 Prompt 降级 */
    SAFETY = 'SAFETY',
    /** 请求超时 */
    TIMEOUT = 'TIMEOUT',
    /** Token 溢出，触发上下文截断清理逻辑 */
    TRUNCATED = 'TRUNCATED',
    /** 序列化/反序列化校验失败 */
    INVALID_REQUEST = 'INVALID_REQUEST',
    /** 远端异常，服务端出错 */
    SERVER = 'SERVER',
    /** 服务不可达，触发本地或降级模型切换 */
    MODEL_UNAVAILABLE = 'MODEL_UNAVAILABLE',
    /** JSON 提取故障，应交由修复管道补救 */
    PARSE = 'PARSE',
    /** 兜底捕获，执行默认错误堆栈快照保存 */
    UNKNOWN = 'UNKNOWN'
}

/**
 * 错误降级策略级别。
 * 决定异常发生时是否继续维系主循环运行。
 */
export enum ErrorSeverity {
    /** 触发自愈逻辑，对玩家透明 */
    RECOVERABLE = 'RECOVERABLE',
    /** 弹出模态框等待显式操作 */
    USER_ACTION = 'USER_ACTION',
    /** 终止引擎，保存灾难恢复快照并宕机 */
    FATAL = 'FATAL'
}

/**
 * 遥测探针级别控制。
 * 控制向控制台或持久化层灌入日志的阈值，防止 IO 阻塞。
 */
export enum LogLevel {
    /** 记录全量变量状态，极耗性能，仅开发开启 */
    DEBUG = 0,
    /** 记录关键状态流转，用于常规行为回放 */
    INFO = 1,
    /** 记录非预期行为但被自愈逻辑兜底的事件 */
    WARN = 2,
    /** 记录未能处理必须抛出的异常事件 */
    ERROR = 3
}

//=============================================================================
// 错误配置
//=============================================================================

type ErrorMessageBuilder = (provider: string, model: string) => string;

const ERROR_CONFIG: Record<
    ErrorType,
    {
        sev: ErrorSeverity;
        msg: ErrorMessageBuilder;
        hint?: string;
    }
> = {
    [ErrorType.AUTH]: {
        sev: ErrorSeverity.USER_ACTION,
        msg: (p) => `${p} API 密钥无效或已过期`,
        hint: '请在设置中检查并更新 API Key'
    },
    [ErrorType.RATE_LIMIT]: {
        sev: ErrorSeverity.RECOVERABLE,
        msg: (p) => `请求过于频繁，${p} 服务暂时限流`,
        hint: '请稍等片刻或切换到其他模型'
    },
    [ErrorType.QUOTA]: {
        sev: ErrorSeverity.USER_ACTION,
        msg: (p) => `${p} API 配额已用尽`,
        hint: '请检查 API 账户余额，或切换到其他服务商'
    },
    [ErrorType.SAFETY]: {
        sev: ErrorSeverity.USER_ACTION,
        msg: () => '内容被安全过滤器拦截',
        hint: '请尝试调整输入内容后重新生成'
    },
    [ErrorType.TIMEOUT]: {
        sev: ErrorSeverity.RECOVERABLE,
        msg: () => '请求超时',
        hint: '可改善网络或切换到更稳定的模型'
    },
    [ErrorType.TRUNCATED]: {
        sev: ErrorSeverity.FATAL,
        msg: () => 'AI 输出被截断，数据不完整',
        hint: '可尝试减少生成内容的复杂度，或增加 token 限制'
    },
    [ErrorType.NETWORK]: {
        sev: ErrorSeverity.RECOVERABLE,
        msg: () => '网络连接失败，请检查网络状态',
        hint: '请检查网络连接是否正常'
    },
    [ErrorType.MODEL_UNAVAILABLE]: {
        sev: ErrorSeverity.RECOVERABLE,
        msg: (_, m) => `模型 ${m} 暂时不可用或过载`,
        hint: '请尝试切换到其他可用模型'
    },
    [ErrorType.SERVER]: {
        sev: ErrorSeverity.RECOVERABLE,
        msg: (p) => `${p} 服务器暂时不可用`,
        hint: '服务商可能正在维护，请稍后尝试'
    },
    [ErrorType.INVALID_REQUEST]: {
        sev: ErrorSeverity.FATAL,
        msg: () => '请求参数无效',
        hint: '请检查模型、参数或请求体格式'
    },
    [ErrorType.PARSE]: {
        sev: ErrorSeverity.FATAL,
        msg: () => 'AI 返回的数据格式异常',
        hint: '可尝试开启 JSON Mode 或调整 Prompt'
    },
    [ErrorType.UNKNOWN]: {
        sev: ErrorSeverity.FATAL,
        msg: (p) => `${p} 服务异常`
    }
};

//=============================================================================
// 自定义异常
//=============================================================================

export class AIServiceError extends Error {
    public readonly errorType: ErrorType;
    public readonly severity: ErrorSeverity;
    public readonly userMessage: string;
    public readonly recoveryHint?: string;
    public readonly timestamp: string = new Date().toISOString();

    constructor(
        message: string,
        public readonly provider: string,
        public readonly model: string,
        public readonly statusCode?: number,
        public readonly originalError?: unknown,
        errorType?: ErrorType
    ) {
        super(message);
        this.name = 'AIServiceError';
        this.errorType = errorType || this.inferErrorType(message, statusCode);

        const cfg = ERROR_CONFIG[this.errorType] || ERROR_CONFIG[ErrorType.UNKNOWN];
        this.severity = cfg.sev;
        this.userMessage = cfg.msg(provider, model);
        this.recoveryHint = cfg.hint;
    }

    private inferErrorType(msg: string, code?: number): ErrorType {
        const lower = msg.toLowerCase();

        if (
            code === 401 ||
            lower.includes('api key') ||
            lower.includes('unauthorized') ||
            lower.includes('invalid x-api-key') ||
            lower.includes('invalid api key')
        ) {
            return ErrorType.AUTH;
        }

        if (
            code === 429 ||
            lower.includes('rate limit') ||
            lower.includes('too many request') ||
            lower.includes('resource_exhausted')
        ) {
            return ErrorType.RATE_LIMIT;
        }

        if (
            lower.includes('quota') ||
            lower.includes('exceeded') ||
            lower.includes('insufficient_quota') ||
            lower.includes('billing')
        ) {
            return ErrorType.QUOTA;
        }

        if (
            lower.includes('safety') ||
            lower.includes('blocked') ||
            lower.includes('harmful') ||
            lower.includes('policy') ||
            lower.includes('content_filter') ||
            lower.includes('recitation')
        ) {
            return ErrorType.SAFETY;
        }

        if (
            lower.includes('truncat') ||
            lower.includes('stop sequence') ||
            lower.includes('max tokens') ||
            lower.includes('max_tokens')
        ) {
            return ErrorType.TRUNCATED;
        }

        if (
            lower.includes('network') ||
            lower.includes('fetch') ||
            lower.includes('connection') ||
            lower.includes('econn')
        ) {
            return ErrorType.NETWORK;
        }

        if (
            lower.includes('timeout') ||
            lower.includes('aborted') ||
            lower.includes('abort')
        ) {
            return ErrorType.TIMEOUT;
        }

        if (
            lower.includes('model') &&
            (lower.includes('not found') ||
                lower.includes('unavailable') ||
                lower.includes('overloaded'))
        ) {
            return ErrorType.MODEL_UNAVAILABLE;
        }

        if (code === 404) {
            return ErrorType.MODEL_UNAVAILABLE;
        }

        if (code && code >= 500) {
            return ErrorType.SERVER;
        }

        if (lower.includes('json') || lower.includes('parse')) {
            return ErrorType.PARSE;
        }

        if (code && code >= 400) {
            return ErrorType.INVALID_REQUEST;
        }

        return ErrorType.UNKNOWN;
    }

    public toLogObject = (): Record<string, unknown> => ({
        name: this.name,
        message: this.message,
        userMessage: this.userMessage,
        errorType: this.errorType,
        severity: this.severity,
        provider: this.provider,
        model: this.model,
        statusCode: this.statusCode,
        recoveryHint: this.recoveryHint,
        timestamp: this.timestamp,
        stack: this.stack
    });
}

export class AIOutputTruncatedError extends Error {
    public readonly errorType = ErrorType.TRUNCATED;
    public readonly severity = ErrorSeverity.FATAL;
    public readonly userMessage = 'AI 输出被截断，数据不完整';
    public readonly recoveryHint = '可尝试减少生成内容的复杂度，或增加 token 限制';

    constructor(message: string = 'Output was truncated by the model.') {
        super(message);
        this.name = 'AIOutputTruncatedError';
    }
}

export class NetworkError extends AIServiceError {
    constructor(
        message: string,
        provider: string,
        model: string,
        originalError?: unknown
    ) {
        super(
            message,
            provider,
            model,
            undefined,
            originalError,
            ErrorType.NETWORK
        );
        this.name = 'NetworkError';
    }
}

export class RequestTimeoutError extends AIServiceError {
    constructor(
        message: string,
        provider: string,
        model: string,
        originalError?: unknown
    ) {
        super(
            message,
            provider,
            model,
            undefined,
            originalError,
            ErrorType.TIMEOUT
        );
        this.name = 'RequestTimeoutError';
    }
}

export class ParseError extends AIServiceError {
    constructor(
        message: string,
        provider: string,
        model: string,
        public readonly rawText?: string
    ) {
        super(
            message,
            provider,
            model,
            undefined,
            undefined,
            ErrorType.PARSE
        );
        this.name = 'ParseError';
    }
}

export class UnsupportedOperationError extends AIServiceError {
    constructor(provider: string, operation: string) {
        super(
            `${provider} 不支持 ${operation}`,
            provider,
            'unknown',
            undefined,
            undefined,
            ErrorType.INVALID_REQUEST
        );
        this.name = 'UnsupportedOperationError';
    }
}

//=============================================================================
// 日志系统模块级全局状态
//=============================================================================

let currentLogLevel: LogLevel = LogLevel.INFO;

interface ErrorHistoryEntry {
    timestamp: string;
    context: string;
    error: Record<string, unknown>;
}

const errorHistory: ErrorHistoryEntry[] = [];

//=============================================================================
// Fetch 扩展类型
//=============================================================================

export interface FetchOptions extends RequestInit {
    // 不再内置超时控制，允许长时间 AI 生成
}

export interface FetchContext {
    provider: string;
    model: string;
}

//=============================================================================
// IProvider 协议
//=============================================================================

interface IProvider {
    supports(capability: string): boolean;

    generateZone?(params: TextGenParams): Promise<AIResponse>;
    generateNpcDialogue?(params: TextGenParams): Promise<AIResponse>;
    generateNpcReaction?(params: TextGenParams): Promise<AIResponse>;
    generateDyNarrative?(params: TextGenParams): Promise<AIResponse>;

    generateImage?(params: {
        model: string;
        prompt: string;
        width?: number;
        height?: number;
        seed?: number;
    }): Promise<string>;

    generateVideo?(params: {
        model: string;
        prompt: string;
        imageUrl?: string;
    }): Promise<string>;

    generateSpeech?(params: {
        model: string;
        text: string;
        voiceName?: string;
    }): Promise<string>;

    generateEmbedding?(params: {
        model: string;
        text: string;
        apiKey?: string;
    }): Promise<number[]>;
}

//=============================================================================
// 抽象基类
//=============================================================================

export abstract class BaseProvider implements IProvider {
    constructor(
        protected readonly settings: Settings,
        protected readonly providerKey: ApiPlatform,
        protected readonly providerName: string
    ) {}

    //=========================================================================
    // 抽象能力
    //=========================================================================

    abstract supports(capability: string): boolean;

    protected abstract getApiKeys(): string[];

    protected abstract getBaseUrl(): string;

    //=========================================================================
    // 可重写配置
    //=========================================================================

    protected get defaultTemperature(): number {
        return 1.0;
    }

    //=========================================================================
    // 请求构建
    //=========================================================================

    protected getRequestUrl(
        _params: TextGenParams,
        _capability: string,
        _apiKey?: string
    ): string {
        const url = this.getBaseUrl();
        if (!url) {
            throw new AIServiceError(
                `${this.providerName} 未配置 Base URL`,
                this.providerName,
                _params.model,
                undefined,
                undefined,
                ErrorType.INVALID_REQUEST
            );
        }
        return url;
    }

    protected buildHeaders(
        apiKey: string,
        _params: TextGenParams,
        _capability: string
    ): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        };

        if (apiKey) {
            headers.Authorization = `Bearer ${apiKey}`;
        }

        const requestId = BaseProvider.createRequestId();
        if (requestId) {
            headers['X-Request-ID'] = requestId;
        }

        return headers;
    }

    /**
     * 默认使用 OpenAI 兼容格式。
     * 子类如果请求体格式不同，可重写此方法。
     */
    protected buildRequestBody(
        params: TextGenParams,
        _capability: string
    ): Record<string, unknown> {
        const messages: Array<{ role: string; content: string }> = [];

        if (params.messages?.length) {
            for (const msg of params.messages) {
                const content = typeof msg.content === 'string' ? msg.content.trim() : '';
                if (!content) continue;
                messages.push({
                    role: msg.role,
                    content
                });
            }
        } else {
            if (params.systemPrompt?.trim()) {
                messages.push({
                    role: 'system',
                    content: params.systemPrompt.trim()
                });
            }

            if (params.userPrompt?.trim()) {
                messages.push({
                    role: 'user',
                    content: params.userPrompt.trim()
                });
            }
        }

        const body: Record<string, unknown> = {
            model: params.model,
            messages,
            temperature: params.temperature ?? this.defaultTemperature
        };

        if (params.topP !== undefined) {
            body.top_p = params.topP;
        }

        if (params.seed !== undefined) {
            body.seed = params.seed;
        }

        if (params.maxTokens !== undefined) {
            body.max_tokens = params.maxTokens;
        }

        if (params.stop !== undefined) {
            body.stop = params.stop;
        }

        if (params.jsonMode || params.schema) {
            body.response_format = { type: 'json_object' };
        }

        return body;
    }

    //=========================================================================
    // 响应解析
    //=========================================================================

    protected parseUsage(data: any): AIUsage | undefined {
        if (data?.usage) {
            return {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens
            };
        }
        return undefined;
    }

    /**
     * 默认解析 OpenAI 兼容响应。
     * 子类可重写以适配自己的响应结构。
     */
    protected parseTextResponse(
        data: any,
        params: TextGenParams,
        _capability: string
    ): AIResponse {
        const choice = data?.choices?.[0];
        const finishReason: string | undefined =
            choice?.finish_reason ?? choice?.finishReason;

        if (choice?.message?.refusal) {
            throw new AIServiceError(
                choice.message.refusal,
                this.providerName,
                params.model,
                undefined,
                undefined,
                ErrorType.SAFETY
            );
        }

        let content: unknown =
            choice?.message?.content ??
            choice?.text ??
            '';

        if (Array.isArray(content)) {
            content = content
                .map((c: any) => (typeof c?.text === 'string' ? c.text : ''))
                .join('');
        }

        const text = String(content ?? '').trim();
        const usage = this.parseUsage(data);

        if (finishReason === 'content_filter') {
            throw new AIServiceError(
                '内容被安全过滤器拦截',
                this.providerName,
                params.model,
                undefined,
                undefined,
                ErrorType.SAFETY
            );
        }

        if (!text) {
            if (finishReason === 'length') {
                throw new AIOutputTruncatedError();
            }

            throw new AIServiceError(
                `${this.providerName} 返回空内容`,
                this.providerName,
                params.model,
                undefined,
                undefined,
                ErrorType.PARSE
            );
        }

        if (finishReason === 'length' && BaseProvider.isTruncated(text)) {
            throw new AIOutputTruncatedError();
        }

        const extracted = BaseProvider.extractThought(text);

        return {
            ...extracted,
            finishReason,
            usage
        };
    }

    //=========================================================================
    // Key 健康度上报策略
    //=========================================================================

    /**
     * 并非所有失败都应归咎于 API Key。
     * 例如 JSON 解析失败、安全拦截、输出截断等，不应降低 Key 健康度。
     */
    protected shouldReportKeyFailure(error: unknown): boolean {
        if (error instanceof AIServiceError) {
            return [
                ErrorType.NETWORK,
                ErrorType.AUTH,
                ErrorType.RATE_LIMIT,
                ErrorType.QUOTA,
                ErrorType.SERVER,
                ErrorType.TIMEOUT,
                ErrorType.MODEL_UNAVAILABLE
            ].includes(error.errorType);
        }

        if (error instanceof AIOutputTruncatedError) {
            return false;
        }

        return true;
    }

    //=========================================================================
    // 核心请求执行
    //=========================================================================

    protected async executeTextRequest(
        params: TextGenParams,
        capability: string
    ): Promise<AIResponse> {
        const keys = this.getApiKeys();
        BaseProvider.registerAndValidateKeys(
            keys,
            this.providerName,
            this.providerKey,
            params.model
        );

        let activeKey: string | undefined;

        try {
            activeKey = KeyService.getNextKey(this.providerKey);
            BaseProvider.validateAPIKey(activeKey, this.providerName);

            const key = activeKey as string;
            const url = this.getRequestUrl(params, capability, key);
            const headers = this.buildHeaders(key, params, capability);
            const requestBody = this.buildRequestBody(params, capability);

            const response = await BaseProvider.fetchWithAbort(
                url,
                {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(requestBody)
                },
                {
                    provider: this.providerName,
                    model: params.model
                }
            );

            if (!response.ok) {
                throw await BaseProvider.parseAPIError(
                    response,
                    this.providerName,
                    params.model
                );
            }

            const rawText = await response.text();

            let data: unknown;
            try {
                data = JSON.parse(rawText);
            } catch (error) {
                throw new ParseError(
                    `${this.providerName} 响应不是有效 JSON`,
                    this.providerName,
                    params.model,
                    rawText.slice(0, 1000)
                );
            }

            const result = this.parseTextResponse(data, params, capability);

            if (!result.text?.trim()) {
                throw new AIServiceError(
                    `${this.providerName} 返回空内容`,
                    this.providerName,
                    params.model,
                    undefined,
                    undefined,
                    ErrorType.PARSE
                );
            }

            KeyService.reportSuccess(this.providerKey, key);

            return {
                ...result,
                provider: this.providerName,
                model: params.model
            };
        } catch (error) {
            if (activeKey && this.shouldReportKeyFailure(error)) {
                KeyService.reportFailure(this.providerKey, activeKey, error);
            }
            throw error;
        }
    }

    /**
     * 通用文本生成入口。
     * 子类通常无需重写该方法，除非提供商协议差异极大。
     */
    protected async _generateText(
        params: TextGenParams,
        capability: string
    ): Promise<AIResponse> {
        if (!this.supports(capability)) {
            throw new UnsupportedOperationError(this.providerName, capability);
        }

        BaseProvider.validateRequiredParams(
            params as unknown as Record<string, unknown>,
            ['model'],
            `${this.providerName}.${capability}`
        );

        BaseProvider.logDebug(
            this.providerName,
            `开始 ${capability} 请求`,
            {
                model: params.model,
                jsonMode: params.jsonMode,
                hasSchema: Boolean(params.schema),
                messagesCount: params.messages?.length ?? 0
            }
        );

        return this.executeTextRequest(params, capability);
    }

    //=========================================================================
    // 文本能力路由
    //=========================================================================

    async generateZone(params: TextGenParams): Promise<AIResponse> {
        return this._generateText(params, 'zone');
    }

    async generateNpcDialogue(params: TextGenParams): Promise<AIResponse> {
        return this._generateText(params, 'npcDialogue');
    }

    async generateNpcReaction(params: TextGenParams): Promise<AIResponse> {
        return this._generateText(params, 'npcReaction');
    }

    async generateDyNarrative(params: TextGenParams): Promise<AIResponse> {
        return this._generateText(params, 'dyNarrative');
    }

    //=========================================================================
    // 非文本能力默认实现
    //=========================================================================

    async generateImage(_params: {
        model: string;
        prompt: string;
        width?: number;
        height?: number;
        seed?: number;
    }): Promise<string> {
        throw new UnsupportedOperationError(this.providerName, '图像生成');
    }

    async generateVideo(_params: {
        model: string;
        prompt: string;
        imageUrl?: string;
    }): Promise<string> {
        throw new UnsupportedOperationError(this.providerName, '视频生成');
    }

    async generateSpeech(_params: {
        model: string;
        text: string;
        voiceName?: string;
    }): Promise<string> {
        throw new UnsupportedOperationError(this.providerName, '语音合成');
    }

    async generateEmbedding(_params: {
        model: string;
        text: string;
        apiKey?: string;
    }): Promise<number[]> {
        throw new UnsupportedOperationError(this.providerName, '嵌入向量');
    }

    //=========================================================================
    // API Key 校验与注册
    //=========================================================================

    protected static registerAndValidateKeys(
        apiKeys: string[] | string,
        provider: string,
        providerKey: ApiPlatform,
        model: string
    ): void {
        const keys = (Array.isArray(apiKeys) ? apiKeys : [apiKeys])
            .map((k) => k?.trim())
            .filter((k): k is string => Boolean(k));

        if (!keys.length) {
            throw new AIServiceError(
                `未配置 ${provider} API Key`,
                provider,
                model,
                undefined,
                undefined,
                ErrorType.AUTH
            );
        }

        KeyService.registerKeys(providerKey, keys);
    }

    protected static validateAPIKey(
        key: string | undefined,
        provider: string
    ): asserts key is string {
        if (!key?.trim()) {
            throw new AIServiceError(
                `未配置 ${provider} API Key`,
                provider,
                'unknown',
                undefined,
                undefined,
                ErrorType.AUTH
            );
        }
    }

    //=========================================================================
    // Fetch 与错误解析
    //=========================================================================

    protected static async fetchWithAbort(
        url: string,
        options: FetchOptions = {},
        context: FetchContext = {
            provider: 'Unknown',
            model: 'Unknown'
        }
    ): Promise<Response> {
        const { signal, ...init } = options;

        const controller = new AbortController();

        if (signal) {
            if (signal.aborted) {
                controller.abort();
            } else {
                signal.addEventListener(
                    'abort',
                    () => controller.abort(),
                    { once: true }
                );
            }
        }

        try {
            const response = await fetch(url, {
                ...init,
                signal: controller.signal
            });

            return response;
        } catch (error: any) {
            if (error?.name === 'AbortError') {
                throw new NetworkError(
                    `请求被中止`,
                    context.provider,
                    context.model,
                    error
                );
            }

            throw new NetworkError(
                `网络请求失败: ${error?.message || String(error)}`,
                context.provider,
                context.model,
                error
            );
        }
    }

    protected static async parseAPIError(
        response: Response,
        provider: string,
        model: string
    ): Promise<AIServiceError> {
        let body = '';

        try {
            body = await response.text();
        } catch {
            // ignore body read failure
        }

        let msg = response.statusText || `HTTP ${response.status}`;

        if (body) {
            try {
                const d = JSON.parse(body);
                msg =
                    d?.error?.message ||
                    d?.error?.error?.message ||
                    d?.message ||
                    msg;
            } catch {
                if (body.length <= 300) {
                    msg = body;
                }
            }
        }

        return new AIServiceError(
            msg,
            provider,
            model,
            response.status
        );
    }

    //=========================================================================
    // 参数与模型工具
    //=========================================================================

    public static validateRequiredParams(
        params: Record<string, unknown>,
        requiredFields: string[],
        context = 'Unknown operation'
    ): void {
        const missing = requiredFields.filter(
            (field) =>
                params?.[field] == null ||
                params?.[field] === ''
        );

        if (missing.length) {
            throw new Error(
                `${context}: Missing required parameters: ${missing.join(', ')}`
            );
        }
    }

    public static parseModelKey = (
        k: string
    ): {
        provider: string;
        model: string;
    } => {
        const i = k.indexOf(':');
        if (i < 0) {
            throw new Error(`模型键格式错误: ${k}`);
        }

        return {
            provider: k.substring(0, i),
            model: k.substring(i + 1)
        };
    };

    public static getProviderConfig = (id: string) => {
        return MODEL_PROVIDER.find((p) => p.id === id);
    };

    public static createRequestId(): string | undefined {
        try {
            if (
                typeof crypto !== 'undefined' &&
                typeof crypto.randomUUID === 'function'
            ) {
                return crypto.randomUUID();
            }
        } catch {
            // ignore
        }

        return undefined;
    }

    //=========================================================================
    // JSON / 文本处理工具
    //=========================================================================

    public static isTruncated = (text: string): boolean => {
        const trimmed = text.trim();
        if (!trimmed) return false;

        if (trimmed.startsWith('{') && !trimmed.endsWith('}')) {
            return true;
        }

        if (trimmed.startsWith('[') && !trimmed.endsWith(']')) {
            return true;
        }

        return false;
    };

    public static safeJSONParseWithInfo<T>(
        text: string,
        fallback: T
    ): JSONParseResult<T> {
        const clean = BaseProvider.extractJsonCandidate(text);

        const attempts: string[] = [clean];

        const noTrailingCommas = clean.replace(/,\s*([}\]])/g, '$1');
        if (noTrailingCommas !== clean) {
            attempts.push(noTrailingCommas);
        }

        const singleToDoubleQuotes = noTrailingCommas.replace(/'/g, '"');
        if (singleToDoubleQuotes !== noTrailingCommas) {
            attempts.push(singleToDoubleQuotes);
        }

        for (const candidate of attempts) {
            try {
                return {
                    success: true,
                    data: JSON.parse(candidate),
                    repaired: candidate !== clean
                };
            } catch {
                // try next candidate
            }
        }

        BaseProvider.logError(
            'JSON Parse Failed',
            new Error('JSON 解析失败'),
            {
                textLength: text.length,
                preview: clean.slice(0, 200)
            }
        );

        return {
            success: false,
            data: fallback,
            repaired: false,
            error: 'JSON 解析失败'
        };
    }

    private static extractJsonCandidate(text: string): string {
        let clean = text.trim();

        const fenceMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (fenceMatch?.[1]) {
            clean = fenceMatch[1].trim();
        }

        const firstBrace = clean.indexOf('{');
        const firstBracket = clean.indexOf('[');

        const start =
            firstBrace > -1 && firstBracket > -1
                ? Math.min(firstBrace, firstBracket)
                : Math.max(firstBrace, firstBracket);

        if (start < 0) {
            return clean;
        }

        const open = clean[start];
        const close = open === '{' ? '}' : ']';

        let depth = 0;
        let inString = false;
        let escaped = false;

        for (let i = start; i < clean.length; i++) {
            const ch = clean[i];

            if (inString) {
                if (escaped) {
                    escaped = false;
                } else if (ch === '\\') {
                    escaped = true;
                } else if (ch === '"') {
                    inString = false;
                }
                continue;
            }

            if (ch === '"') {
                inString = true;
                continue;
            }

            if (ch === open) {
                depth++;
            } else if (ch === close) {
                depth--;
                if (depth === 0) {
                    return clean.slice(start, i + 1);
                }
            }
        }

        return clean.slice(start);
    }

    protected static extractThought = (raw: string): AIResponse => {
        const match = raw.match(/<(think|thinking)>([\s\S]*?)<\/\1>/i);
        const thought = match?.[2]?.trim();

        const text = raw
            .replace(/<(think|thinking)>[\s\S]*?<\/\1>/gi, '')
            .trim();

        return thought
            ? {
                  thought,
                  text,
                  raw
              }
            : {
                  text,
                  raw
              };
    };

    public static simpleHash = (s: string): string => {
        let h = 0;

        for (const c of s) {
            h = (h << 5) - h + (c.codePointAt(0) ?? 0);
            h |= 0;
        }

        return `asset_${Math.abs(h).toString(16)}`;
    };

    //=========================================================================
    // 错误格式化工具
    //=========================================================================

    public static buildDebugInfo = (
        ctx: object,
        extra?: object
    ): Record<string, unknown> => ({
        timestamp: new Date().toISOString(),
        contextKeys: Object.keys(ctx || {}),
        ...ctx,
        ...extra
    });

    public static handleServiceError(
        error: unknown,
        opName: string,
        debugInfo: object,
        fallbackResult?: unknown
    ): unknown {
        BaseProvider.logError(
            `${opName} failed`,
            error,
            BaseProvider.buildDebugInfo(debugInfo, {
                errorType:
                    error instanceof Error ? error.constructor.name : 'Unknown'
            })
        );

        if (fallbackResult !== undefined) {
            return fallbackResult;
        }

        throw error;
    }

    public static formatErrorForUser = (e: any): string => {
        if (e instanceof AIServiceError) {
            return e.userMessage + (e.recoveryHint ? `。${e.recoveryHint}` : '');
        }

        if (e instanceof AIOutputTruncatedError) {
            return e.userMessage;
        }

        return e?.message || String(e);
    };

    //=========================================================================
    // 日志系统集成
    //=========================================================================

    public static setLogLevel(level: LogLevel): void {
        currentLogLevel = level;
    }

    public static getErrorHistory(): ErrorHistoryEntry[] {
        return [...errorHistory];
    }

    public static clearErrorHistory(): void {
        errorHistory.length = 0;
    }

    public static logError(
        context: string,
        error: unknown,
        info?: object
    ): void {
        const timestamp = new Date().toISOString();

        const errObj: Record<string, unknown> =
            error instanceof AIServiceError
                ? {
                      ...error.toLogObject(),
                      ...info
                  }
                : {
                      timestamp,
                      context,
                      name: (error as Error)?.name,
                      message: (error as Error)?.message || String(error),
                      stack: (error as Error)?.stack,
                      ...info
                  };

        errorHistory.push({
            timestamp,
            context,
            error: errObj
        });

        if (errorHistory.length > 50) {
            errorHistory.shift();
        }

        if (currentLogLevel <= LogLevel.ERROR) {
            console.error(`[Error] ${context}:`, errObj);
        }
    }

    public static logWarn(ctx: string, msg: string, info?: object): void {
        if (currentLogLevel <= LogLevel.WARN) {
            console.warn(`[Warn] ${ctx}:`, msg, info || '');
        }
    }

    public static logInfo(ctx: string, msg: string, info?: object): void {
        if (currentLogLevel <= LogLevel.INFO) {
            console.info(`[Info] ${ctx}:`, msg, info || '');
        }
    }

    public static logDebug(ctx: string, msg: string, info?: object): void {
        if (currentLogLevel <= LogLevel.DEBUG) {
            console.debug(`[Debug] ${ctx}:`, msg, info || '');
        }
    }
}

//=============================================================================
// 通用缓存管理器
//=============================================================================

export class GenericCacheManager<T> {
    private cache = new Map<
        string,
        {
            content: T;
            timestamp: number;
            lastAccess: number;
        }
    >();

    private hits = 0;
    private misses = 0;

    constructor(
        private maxSize: number = 150,
        private ttl: number = 8 * 60 * 1000
    ) {}

    cleanExpiredCache(): void {
        const now = Date.now();

        for (const [key, value] of this.cache) {
            if (now - value.timestamp > this.ttl) {
                this.cache.delete(key);
            }
        }

        if (this.cache.size > this.maxSize) {
            [...this.cache.entries()]
                .sort((a, b) => a[1].lastAccess - b[1].lastAccess)
                .slice(0, this.cache.size - this.maxSize)
                .forEach(([key]) => this.cache.delete(key));
        }
    }

    get(key: string): T | null {
        const cached = this.cache.get(key);

        if (!cached) {
            this.misses++;
            return null;
        }

        if (Date.now() - cached.timestamp >= this.ttl) {
            this.cache.delete(key);
            this.misses++;
            return null;
        }

        cached.lastAccess = Date.now();
        this.hits++;

        return cached.content;
    }

    set(key: string, content: T): void {
        const now = Date.now();

        this.cache.set(key, {
            content,
            timestamp: now,
            lastAccess: now
        });

        this.cleanExpiredCache();
    }

    delete = (key: string): boolean => {
        return this.cache.delete(key);
    };

    clear = (): void => {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    };

    getStats = () => ({
        size: this.cache.size,
        maxSize: this.maxSize,
        ttl: this.ttl,
        hits: this.hits,
        misses: this.misses,
        hitRate:
            this.hits + this.misses === 0
                ? 0
                : this.hits / (this.hits + this.misses)
    });
}