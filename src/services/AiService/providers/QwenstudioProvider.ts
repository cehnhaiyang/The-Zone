/**
 * Qwen Studio 提供商适配器 (qwen.aikit.club)
 *
 * 对照 README.md / qwen.json：
 * - 文本生成使用 /v1/chat/completions
 * - 图像生成使用 /v1/images/generations
 * - 图像编辑使用 /v1/images/edits
 * - 视频生成使用 /v1/videos/generations
 * - 令牌校验使用 /v1/validate
 * - 令牌刷新使用 /v1/refresh
 * - 模型列表使用 /v1/models
 * - 删除全部会话使用 /v1/chats/delete
 *
 * 说明：
 * - Qwen Web API / Proxy 不保证支持 OpenAI 的 response_format，因此文本请求中移除该字段。
 * - 支持通过 metadata 透传：
 *   - enable_thinking
 *   - thinking_budget
 *   - tools
 *   - tool_choice
 *   - webSearch
 *   - messages（完整 OpenAI 兼容消息，尤其适用于多模态）
 * - 支持解析 Qwen 的 reasoning_content，并映射到 AIResponse.thought。
 */
import type { Settings, ApiPlatform } from '../../../meta';
import { KeyService } from '../../KeyService';
import {
    BaseProvider,
    AIServiceError,
    ErrorType,
    type TextGenParams,
    type AIResponse
} from './base';

/** 本地 Python 代理网关，负责清洗 Electron 浏览器头后转发至 aikit.club */
const API_BASE = 'http://localhost:20260';
const QWENSTUDIO_PLATFORM = 'qwenstudio' as unknown as ApiPlatform;

//=============================================================================
// 参数类型
//=============================================================================
export interface QwenstudioImageParams {
    model: string;
    prompt: string;
    apiKey?: string;
    width?: number;
    height?: number;
    seed?: number;
}

export interface QwenstudioImageEditParams {
    model: string;
    prompt: string;
    /**
     * 支持：
     * - 远程 URL
     * - data URL
     * - base64 字符串
     * - 浏览器环境下的 File / Blob
     */
    image: string | Blob;
    apiKey?: string;
}

export interface QwenstudioVideoParams {
    model: string;
    prompt: string;
    apiKey?: string;
    width?: number;
    height?: number;
    seed?: number;
    /**
     * 兼容基类接口保留字段。
     * 当前 Qwen 文档中的 /v1/videos/generations 只定义了 prompt / size，
     * 因此 imageUrl 不会传入上游。
     */
    imageUrl?: string;
}

export interface QwenstudioRefreshResult {
    accessToken: string;
    expiresAt?: number;
    timestamp?: string;
    raw?: unknown;
}

//=============================================================================
// Provider
//=============================================================================
export class QwenstudioProvider extends BaseProvider {
    constructor(settings: Settings) {
        super(settings, QWENSTUDIO_PLATFORM, 'QwenStudio');
    }

    //=========================================================================
    // 基础配置
    //=========================================================================
    protected getApiKeys(): string[] {
        const raw = (this.settings as any)?.qwenstudioKeys;

        if (Array.isArray(raw)) {
            return raw
                .map((k) => String(k ?? '').trim())
                .filter(Boolean);
        }

        if (typeof raw === 'string' && raw.trim()) {
            return [raw.trim()];
        }

        return [];
    }

    protected getBaseUrl(): string {
        return `${API_BASE}/v1`;
    }

    protected getRequestUrl(
        _params: TextGenParams,
        _capability: string,
        _apiKey?: string
    ): string {
        return `${this.getBaseUrl()}/chat/completions`;
    }

    protected buildHeaders(
        apiKey: string,
        _params: TextGenParams,
        _capability: string
    ): Record<string, string> {
        return this.buildJsonHeaders(apiKey);
    }

    supports(capability: string): boolean {
        return [
            'zone',
            'npcDialogue',
            'npcReaction',
            'dyNarrative',
            'image',
            'imageEdit',
            'video',
            'models',
            'validate',
            'refresh',
            'deleteChats'
        ].includes(capability);
    }

    //=========================================================================
    // 请求体 / 响应解析
    //=========================================================================
    protected buildRequestBody(
        params: TextGenParams,
        capability: string
    ): Record<string, unknown> {
        const body = super.buildRequestBody(params, capability);

        // 头注释声明"移除 OpenAI 的 response_format"：
        // 基类在 jsonMode 时会写入 response_format，此处按声明意图显式移除，
        // 避免本地网关因未知字段拒绝请求（json_object 指令已存在 messages 中）。
        delete body.response_format;

        const metadata = (params.metadata || {}) as Record<string, unknown>;

        // 显式声明 stream=false，避免上游默认流式造成解析差异。
        // 如果业务侧通过 metadata.stream 显式指定，则尊重业务侧。
        if (metadata.stream !== undefined) {
            body.stream = this.toBoolean(metadata.stream);
        } else {
            body.stream = false;
        }

        // 完整 OpenAI 兼容消息透传。
        // 适用于多模态消息，例如 image_url / file_url / audio_url / video_url。
        if (Array.isArray(metadata.messages) && metadata.messages.length > 0) {
            body.messages = metadata.messages;
        }

        // Thinking / Reasoning 模式
        if (metadata.enable_thinking !== undefined) {
            body.enable_thinking = this.toBoolean(metadata.enable_thinking);
        }

        if (metadata.thinking_budget !== undefined) {
            const budget = Number(metadata.thinking_budget);
            if (Number.isFinite(budget) && budget > 0) {
                body.thinking_budget = Math.floor(budget);
            }
        }

        // OpenAI 兼容 tool calling / web search 透传
        if (Array.isArray(metadata.tools) && metadata.tools.length > 0) {
            body.tools = metadata.tools;
        } else if (this.toBoolean(metadata.webSearch)) {
            body.tools = [{ type: 'web_search' }];
        }

        if (metadata.tool_choice !== undefined) {
            body.tool_choice = metadata.tool_choice;
        }

        return body;
    }

    protected parseTextResponse(
        data: any,
        params: TextGenParams,
        capability: string
    ): AIResponse {
        // 优先复用基类对 refusal / content_filter / length / 空内容等的处理。
        try {
            const result = super.parseTextResponse(data, params, capability);

            // aikit.club 在响应末尾追加 <details>…Response ID…Request ID…</details> 元数据块，
            // 会破坏 JSON 解析。此处剥离后再检测是否为纯占位符。
            const stripped = result.text.replace(/<details>[\s\S]*?<\/details>/g, '').trim();
            if (!stripped) {
                throw new AIServiceError(
                    '服务端未返回有效生成内容（收到元数据占位符），请稍后重试',
                    this.providerName,
                    params.model,
                    503,
                    undefined,
                    ErrorType.SERVER
                );
            }
            result.text = stripped;

            return this.attachQwenReasoning(result, data);
        } catch (error) {
            // 如果基类因 content 为空判定为 PARSE，但响应实际包含 tool_calls，
            // 则将其序列化为 JSON 文本返回，便于业务侧继续消费。
            const choice = data?.choices?.[0];
            const toolCalls = choice?.message?.tool_calls;

            if (
                error instanceof AIServiceError &&
                error.errorType === ErrorType.PARSE &&
                Array.isArray(toolCalls) &&
                toolCalls.length > 0
            ) {
                const usage = this.parseUsage(data);
                const finishReason =
                    choice?.finish_reason ??
                    choice?.finishReason ??
                    undefined;

                const fallback: AIResponse = {
                    text: JSON.stringify(toolCalls),
                    raw: JSON.stringify(data),
                    finishReason,
                    usage
                };

                return this.attachQwenReasoning(fallback, data);
            }

            throw error;
        }
    }

    private attachQwenReasoning(result: AIResponse, data: any): AIResponse {
        const choice = data?.choices?.[0];

        const reasoning =
            choice?.message?.reasoning_content ??
            choice?.reasoning_content ??
            choice?.message?.reasoning ??
            data?.reasoning_content;

        if (reasoning && !result.thought) {
            result.thought = String(reasoning).trim();
        }

        return result;
    }

    //=========================================================================
    // 图像生成
    //=========================================================================
    async generateImage(params: QwenstudioImageParams): Promise<string> {
        BaseProvider.validateRequiredParams(
            params as unknown as Record<string, unknown>,
            ['prompt'],
            'QwenStudio.generateImage'
        );

        const key = this.resolveApiKey(params.model, params.apiKey);
        const size = `${params.width || 1024}x${params.height || 1024}`;

        try {
            const resp = await BaseProvider.fetchWithAbort(
                `${this.getBaseUrl()}/images/generations`,
                {
                    method: 'POST',
                    headers: this.buildJsonHeaders(key),
                    body: JSON.stringify({
                        model: params.model,
                        prompt: params.prompt,
                        size
                    })
                },
                {
                    provider: this.providerName,
                    model: params.model
                }
            );

            if (!resp.ok) {
                throw await BaseProvider.parseAPIError(
                    resp,
                    this.providerName,
                    params.model
                );
            }

            const data = await this.parseJsonResponse(resp, params.model);

            const url =
                data?.data?.[0]?.url ??
                data?.data?.[0]?.b64_json ??
                data?.url;

            if (!url) {
                throw new AIServiceError(
                    '图像返回格式异常',
                    this.providerName,
                    params.model,
                    undefined,
                    undefined,
                    ErrorType.PARSE
                );
            }

            KeyService.reportSuccess(this.providerKey, key);
            return this.normalizeDataUrl(String(url), 'image/png');
        } catch (error) {
            if (this.shouldReportKeyFailure(error)) {
                KeyService.reportFailure(this.providerKey, key, error);
            }
            throw error;
        }
    }

    //=========================================================================
    // 图像编辑
    //=========================================================================
    async generateImageEdit(
        params: QwenstudioImageEditParams
    ): Promise<string> {
        BaseProvider.validateRequiredParams(
            params as unknown as Record<string, unknown>,
            ['prompt', 'image'],
            'QwenStudio.generateImageEdit'
        );

        const key = this.resolveApiKey(params.model, params.apiKey);
        const context = {
            provider: this.providerName,
            model: params.model
        };

        try {
            let init: RequestInit;

            const image =
                typeof params.image === 'string'
                    ? this.normalizeDataUrl(params.image, 'image/png')
                    : params.image;

            if (typeof image === 'string') {
                // JSON 模式：远程 URL / data URL / base64 data URL
                init = {
                    method: 'POST',
                    headers: this.buildJsonHeaders(key),
                    body: JSON.stringify({
                        prompt: params.prompt,
                        image
                    })
                };
            } else {
                // FormData 模式：File / Blob 上传
                const formData = new FormData();
                formData.append('prompt', params.prompt);
                formData.append('image', image, 'image.png');

                const headers: Record<string, string> = {
                    Accept: 'application/json',
                    Authorization: `Bearer ${key}`
                };

                const requestId = BaseProvider.createRequestId();
                if (requestId) {
                    headers['X-Request-ID'] = requestId;
                }

                init = {
                    method: 'POST',
                    headers,
                    body: formData
                };
            }

            const resp = await BaseProvider.fetchWithAbort(
                `${this.getBaseUrl()}/images/edits`,
                init,
                context
            );

            if (!resp.ok) {
                throw await BaseProvider.parseAPIError(
                    resp,
                    this.providerName,
                    params.model
                );
            }

            const data = await this.parseJsonResponse(resp, params.model);

            const url =
                data?.data?.[0]?.url ??
                data?.data?.[0]?.b64_json ??
                data?.url;

            if (!url) {
                throw new AIServiceError(
                    '图像编辑返回格式异常',
                    this.providerName,
                    params.model,
                    undefined,
                    undefined,
                    ErrorType.PARSE
                );
            }

            KeyService.reportSuccess(this.providerKey, key);
            return this.normalizeDataUrl(String(url), 'image/png');
        } catch (error) {
            if (this.shouldReportKeyFailure(error)) {
                KeyService.reportFailure(this.providerKey, key, error);
            }
            throw error;
        }
    }

    //=========================================================================
    // 视频生成
    //=========================================================================
    async generateVideo(params: QwenstudioVideoParams): Promise<string> {
        BaseProvider.validateRequiredParams(
            params as unknown as Record<string, unknown>,
            ['prompt'],
            'QwenStudio.generateVideo'
        );

        const key = this.resolveApiKey(params.model, params.apiKey);
        const size = `${params.width || 1280}x${params.height || 720}`;

        if (params.imageUrl) {
            BaseProvider.logDebug(
                this.providerName,
                'QwenStudio 视频生成忽略 imageUrl：当前文档未定义图生视频字段',
                {
                    model: params.model
                }
            );
        }

        try {
            const resp = await BaseProvider.fetchWithAbort(
                `${this.getBaseUrl()}/videos/generations`,
                {
                    method: 'POST',
                    headers: this.buildJsonHeaders(key),
                    body: JSON.stringify({
                        model: params.model,
                        prompt: params.prompt,
                        size
                    })
                },
                {
                    provider: this.providerName,
                    model: params.model
                }
            );

            if (!resp.ok) {
                throw await BaseProvider.parseAPIError(
                    resp,
                    this.providerName,
                    params.model
                );
            }

            const data = await this.parseJsonResponse(resp, params.model);

            const url =
                data?.data?.[0]?.url ??
                data?.data?.[0]?.b64_json ??
                data?.url;

            if (!url) {
                throw new AIServiceError(
                    '视频返回格式异常',
                    this.providerName,
                    params.model,
                    undefined,
                    undefined,
                    ErrorType.PARSE
                );
            }

            KeyService.reportSuccess(this.providerKey, key);
            return this.normalizeDataUrl(String(url), 'video/mp4');
        } catch (error) {
            if (this.shouldReportKeyFailure(error)) {
                KeyService.reportFailure(this.providerKey, key, error);
            }
            throw error;
        }
    }

    //=========================================================================
    // 模型列表
    //=========================================================================
    async listModels(apiKey?: string): Promise<unknown> {
        const key = this.resolveApiKey('models', apiKey);

        const resp = await BaseProvider.fetchWithAbort(
            `${this.getBaseUrl()}/models`,
            {
                method: 'GET',
                headers: this.buildJsonHeaders(key)
            },
            {
                provider: this.providerName,
                model: 'models'
            }
        );

        if (!resp.ok) {
            throw await BaseProvider.parseAPIError(
                resp,
                this.providerName,
                'models'
            );
        }

        return this.parseJsonResponse(resp, 'models');
    }

    //=========================================================================
    // 令牌校验
    //=========================================================================
    async validateToken(token?: string): Promise<boolean> {
        try {
            await this.validateTokenRaw(token);
            return true;
        } catch (error) {
            BaseProvider.logWarn(
                this.providerName,
                'QwenStudio Token 校验失败',
                error instanceof Error
                    ? { message: error.message }
                    : { error }
            );
            return false;
        }
    }

    async validateTokenRaw(token?: string): Promise<unknown> {
        const key = this.resolveApiKey('validate', token);

        const resp = await BaseProvider.fetchWithAbort(
            `${this.getBaseUrl()}/validate`,
            {
                method: 'POST',
                headers: this.buildPlainJsonHeaders(),
                body: JSON.stringify({ token: key })
            },
            {
                provider: this.providerName,
                model: 'validate'
            }
        );

        if (!resp.ok) {
            throw await BaseProvider.parseAPIError(
                resp,
                this.providerName,
                'validate'
            );
        }

        return this.parseJsonResponse(resp, 'validate');
    }

    //=========================================================================
    // 令牌刷新
    //=========================================================================
    async refreshToken(token?: string): Promise<QwenstudioRefreshResult> {
        const key = this.resolveApiKey('refresh', token);

        const resp = await BaseProvider.fetchWithAbort(
            `${this.getBaseUrl()}/refresh`,
            {
                method: 'POST',
                headers: this.buildPlainJsonHeaders(),
                body: JSON.stringify({ token: key })
            },
            {
                provider: this.providerName,
                model: 'refresh'
            }
        );

        if (!resp.ok) {
            throw await BaseProvider.parseAPIError(
                resp,
                this.providerName,
                'refresh'
            );
        }

        const data = await this.parseJsonResponse(resp, 'refresh');
        const accessToken = data?.access_token;

        if (!accessToken || typeof accessToken !== 'string') {
            throw new AIServiceError(
                'QwenStudio 刷新令牌返回格式异常',
                this.providerName,
                'refresh',
                undefined,
                undefined,
                ErrorType.PARSE
            );
        }

        // 将刷新后的 Token 注册进 KeyService，便于后续请求复用。
        KeyService.registerKeys(this.providerKey, [accessToken]);
        KeyService.reportSuccess(this.providerKey, accessToken);

        return {
            accessToken,
            expiresAt:
                typeof data?.expires_at === 'number'
                    ? data.expires_at
                    : undefined,
            timestamp:
                typeof data?.timestamp === 'string'
                    ? data.timestamp
                    : undefined,
            raw: data
        };
    }

    //=========================================================================
    // 删除全部会话
    //=========================================================================
    async deleteAllChats(apiKey?: string): Promise<unknown> {
        const key = this.resolveApiKey('deleteChats', apiKey);

        const resp = await BaseProvider.fetchWithAbort(
            `${this.getBaseUrl()}/chats/delete`,
            {
                method: 'POST',
                headers: this.buildJsonHeaders(key),
                body: JSON.stringify({})
            },
            {
                provider: this.providerName,
                model: 'deleteChats'
            }
        );

        if (!resp.ok) {
            throw await BaseProvider.parseAPIError(
                resp,
                this.providerName,
                'deleteChats'
            );
        }

        return this.parseJsonResponse(resp, 'deleteChats');
    }

    //=========================================================================
    // 内部工具
    //=========================================================================
    private resolveApiKey(model: string, explicitKey?: string): string {
        // 优先使用显式传入的 Key / Token。
        if (explicitKey && explicitKey.trim()) {
            const key = explicitKey.trim();
            KeyService.registerKeys(this.providerKey, [key]);
            BaseProvider.validateAPIKey(key, this.providerName);
            return key;
        }

        // 否则从配置中注册并轮询获取 Key。
        const keys = this.getApiKeys();

        BaseProvider.registerAndValidateKeys(
            keys,
            this.providerName,
            this.providerKey,
            model
        );

        const key = KeyService.getNextKey(this.providerKey);
        BaseProvider.validateAPIKey(key, this.providerName);

        return key;
    }

    private buildJsonHeaders(apiKey: string): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${apiKey}`
        };

        const requestId = BaseProvider.createRequestId();
        if (requestId) {
            headers['X-Request-ID'] = requestId;
        }

        return headers;
    }

    private buildPlainJsonHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        };

        const requestId = BaseProvider.createRequestId();
        if (requestId) {
            headers['X-Request-ID'] = requestId;
        }

        return headers;
    }

    private async parseJsonResponse(
        resp: Response,
        model: string
    ): Promise<any> {
        const raw = await resp.text();

        if (!raw) {
            return {};
        }

        try {
            return JSON.parse(raw);
        } catch (error) {
            throw new AIServiceError(
                `${this.providerName} 响应不是有效 JSON`,
                this.providerName,
                model,
                undefined,
                error,
                ErrorType.PARSE
            );
        }
    }

    private normalizeDataUrl(url: string, mime: string): string {
        const value = String(url || '').trim();

        if (!value) {
            return value;
        }

        if (
            value.startsWith('data:') ||
            value.startsWith('http://') ||
            value.startsWith('https://')
        ) {
            return value;
        }

        if (value.startsWith('//')) {
            return `https:${value}`;
        }

        return `data:${mime};base64,${value}`;
    }

    private toBoolean(value: unknown): boolean {
        return (
            value === true ||
            value === 'true' ||
            value === 1 ||
            value === '1'
        );
    }
}