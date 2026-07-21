/**
 * Google Gemini 提供商适配器
 *
 * 支持能力：
 * - text / zone / npcDialogue / npcReaction / dyNarrative
 * - image
 * - speech
 * - embedding
 *
 * 说明：
 * - 文本生成复用 BaseProvider 的统一请求链路。
 * - Google API 与 OpenAI 格式不兼容，因此重写 URL / Headers / RequestBody / ResponseParser。
 * - 图像、语音、嵌入统一走 executeGeminiRequest，获得 Key 轮转能力。
 */

import type { Settings, ApiPlatform } from '../../../meta';
import { KeyService } from '../../KeyService';
import {
    BaseProvider,
    AIServiceError,
    AIOutputTruncatedError,
    ErrorType,
    ParseError
} from './base';
import type {
    TextGenParams,
    AIResponse,
    AIUsage
} from './base';

interface GeminiContentPart {
    text?: string;
    inlineData?: {
        mimeType?: string;
        data?: string;
    };
}

interface GeminiContent {
    role?: 'user' | 'model';
    parts: GeminiContentPart[];
}

export class GoogleProvider extends BaseProvider {
    constructor(settings: Settings) {
        super(settings, 'google' as ApiPlatform, 'Google');
    }

    //=========================================================================
    // 基础配置
    //=========================================================================

    protected getApiKeys(): string[] {
        return this.settings.googleKeys || [];
    }

    protected getBaseUrl(): string {
        return 'https://generativelanguage.googleapis.com/v1beta';
    }

    protected override get defaultTemperature(): number {
        return 0.7;
    }

    supports(capability: string): boolean {
        return [
            'text',
            'zone',
            'npcDialogue',
            'npcReaction',
            'dyNarrative',
            'image',
            'speech',
            'embedding'
        ].includes(capability);
    }

    //=========================================================================
    // Google 文本生成适配
    //=========================================================================

    protected override getRequestUrl(
        params: TextGenParams,
        _capability: string,
        apiKey?: string
    ): string {
        if (!apiKey) {
            throw new AIServiceError(
                'Google 请求缺少 API Key',
                this.providerName,
                params.model,
                undefined,
                undefined,
                ErrorType.AUTH
            );
        }

        return this.buildGeminiUrl(params.model, 'generateContent', apiKey);
    }

    protected override buildHeaders(
        _apiKey: string,
        _params: TextGenParams,
        _capability: string
    ): Record<string, string> {
        /**
         * Google Gemini REST API 通过 query 参数传递 key，
         * 因此不使用 Authorization Bearer。
         */
        return {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        };
    }

    protected override buildRequestBody(
        params: TextGenParams,
        _capability: string
    ): Record<string, unknown> {
        const { contents, systemInstruction } = this.buildGeminiContents(params);

        const generationConfig: Record<string, unknown> = {
            temperature: params.temperature ?? this.defaultTemperature
        };

        if (params.topP !== undefined) {
            generationConfig.topP = params.topP;
        }

        if (params.topK !== undefined) {
            generationConfig.topK = params.topK;
        }

        if (params.maxTokens !== undefined) {
            generationConfig.maxOutputTokens = params.maxTokens;
        }

        if (params.stop !== undefined) {
            generationConfig.stopSequences = Array.isArray(params.stop)
                ? params.stop
                : [params.stop];
        }

        if (params.seed !== undefined) {
            generationConfig.seed = params.seed;
        }

        if (params.responseModalities?.length) {
            generationConfig.responseModalities = params.responseModalities;
        }

        if (params.schema) {
            generationConfig.responseMimeType = 'application/json';
            generationConfig.responseSchema = params.schema;
        } else if (params.jsonMode) {
            generationConfig.responseMimeType = 'application/json';
        }

        const body: Record<string, unknown> = {
            contents,
            generationConfig
        };

        if (systemInstruction) {
            body.systemInstruction = {
                parts: [{ text: systemInstruction }]
            };
        }

        return body;
    }

    protected override parseUsage(data: any): AIUsage | undefined {
        if (data?.usageMetadata) {
            return {
                promptTokens: data.usageMetadata.promptTokenCount,
                completionTokens: data.usageMetadata.candidatesTokenCount,
                totalTokens: data.usageMetadata.totalTokenCount
            };
        }

        return undefined;
    }

    protected override parseTextResponse(
        data: any,
        params: TextGenParams,
        _capability: string
    ): AIResponse {
        const candidate = data?.candidates?.[0];
        const finishReason: string | undefined = candidate?.finishReason;

        const blockReason: string | undefined =
            candidate?.promptFeedback?.blockReason ||
            data?.promptFeedback?.blockReason;

        if (
            blockReason ||
            finishReason === 'SAFETY' ||
            finishReason === 'RECITATION'
        ) {
            throw new AIServiceError(
                `内容被 Google 安全过滤器拦截${
                    blockReason ? `: ${blockReason}` : ''
                }`,
                this.providerName,
                params.model,
                undefined,
                undefined,
                ErrorType.SAFETY
            );
        }

        const parts: GeminiContentPart[] = candidate?.content?.parts || [];

        const text = parts
            .map((part) =>
                typeof part?.text === 'string' ? part.text : ''
            )
            .filter(Boolean)
            .join('\n')
            .trim();

        const usage = this.parseUsage(data);

        if (!text) {
            if (finishReason === 'MAX_TOKENS') {
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

        if (
            finishReason === 'MAX_TOKENS' &&
            BaseProvider.isTruncated(text)
        ) {
            throw new AIOutputTruncatedError();
        }

        const extracted = BaseProvider.extractThought(text);

        return {
            ...extracted,
            finishReason,
            usage,
            provider: this.providerName,
            model: params.model
        };
    }

    //=========================================================================
    // 图像生成
    //=========================================================================

    async generateImage(params: {
        model: string;
        prompt: string;
        width?: number;
        height?: number;
        seed?: number;
    }): Promise<string> {
        BaseProvider.validateRequiredParams(
            params as unknown as Record<string, unknown>,
            ['model', 'prompt'],
            'Google.generateImage'
        );

        const generationConfig: Record<string, unknown> = {
            responseModalities: ['IMAGE']
        };

        if (params.seed !== undefined) {
            generationConfig.seed = params.seed;
        }

        return this.executeGeminiRequest<string>({
            model: params.model,
            method: 'generateContent',
            capability: 'image',
            body: {
                contents: [
                    {
                        parts: [{ text: params.prompt }]
                    }
                ],
                generationConfig
            },
            parse: (data: any) => {
                const parts: GeminiContentPart[] =
                    data?.candidates?.[0]?.content?.parts || [];

                const imagePart = parts.find(
                    (part) => part?.inlineData?.data
                );

                if (!imagePart?.inlineData?.data) {
                    throw new AIServiceError(
                        'Gemini 图像生成未能正确返回内联图像有效载荷。',
                        this.providerName,
                        params.model,
                        undefined,
                        undefined,
                        ErrorType.PARSE
                    );
                }

                const mimeType = imagePart.inlineData.mimeType || 'image/png';
                return `data:${mimeType};base64,${imagePart.inlineData.data}`;
            }
        });
    }

    //=========================================================================
    // 语音合成
    //=========================================================================

    async generateSpeech(params: {
        model: string;
        text: string;
        voiceName?: string;
    }): Promise<string> {
        BaseProvider.validateRequiredParams(
            params as unknown as Record<string, unknown>,
            ['model', 'text'],
            'Google.generateSpeech'
        );

        return this.executeGeminiRequest<string>({
            model: params.model,
            method: 'generateContent',
            capability: 'speech',
            body: {
                contents: [
                    {
                        parts: [{ text: params.text }]
                    }
                ],
                generationConfig: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: params.voiceName || 'Kore'
                            }
                        }
                    }
                }
            },
            parse: (data: any) => {
                const parts: GeminiContentPart[] =
                    data?.candidates?.[0]?.content?.parts || [];

                const audioPart = parts.find(
                    (part) => part?.inlineData?.data
                );

                if (!audioPart?.inlineData?.data) {
                    throw new AIServiceError(
                        'Gemini 语音生成未能正确返回内联音频有效载荷。',
                        this.providerName,
                        params.model,
                        undefined,
                        undefined,
                        ErrorType.PARSE
                    );
                }

                /**
                 * 保持与原实现一致：返回 base64 音频数据。
                 * 如果上层需要 Data URI，可自行包装。
                 */
                return audioPart.inlineData.data;
            }
        });
    }

    //=========================================================================
    // 嵌入向量
    //=========================================================================

    async generateEmbedding(params: {
        model: string;
        text: string;
        apiKey?: string;
    }): Promise<number[]> {
        BaseProvider.validateRequiredParams(
            params as unknown as Record<string, unknown>,
            ['model', 'text'],
            'Google.generateEmbedding'
        );

        const truncatedText = params.text.slice(0, 8000);

        return this.executeGeminiRequest<number[]>({
            model: params.model,
            method: 'embedContent',
            capability: 'embedding',
            preferredKey: params.apiKey,
            body: {
                content: {
                    parts: [{ text: truncatedText }]
                }
            },
            parse: (data: any) => {
                const embedding = data?.embedding?.values;

                if (!Array.isArray(embedding)) {
                    throw new AIServiceError(
                        'Gemini 嵌入向量返回格式错误',
                        this.providerName,
                        params.model,
                        undefined,
                        undefined,
                        ErrorType.PARSE
                    );
                }

                return embedding as number[];
            }
        });
    }

    //=========================================================================
    // 内部工具
    //=========================================================================

    private buildGeminiUrl(
        model: string,
        method: string,
        apiKey: string
    ): string {
        return `${this.getBaseUrl()}/models/${encodeURIComponent(
            model
        )}:${method}?key=${encodeURIComponent(apiKey)}`;
    }

    private buildGeminiContents(params: TextGenParams): {
        contents: GeminiContent[];
        systemInstruction?: string;
    } {
        const contents: GeminiContent[] = [];

        let systemInstruction: string = params.systemPrompt?.trim() || '';

        if (params.messages?.length) {
            for (const msg of params.messages) {
                const text =
                    typeof msg.content === 'string' ? msg.content.trim() : '';

                if (!text) continue;

                if (msg.role === 'system') {
                    systemInstruction = systemInstruction
                        ? `${systemInstruction}\n${text}`
                        : text;
                    continue;
                }

                const role: 'user' | 'model' =
                    msg.role === 'assistant' || msg.role === 'model'
                        ? 'model'
                        : 'user';

                contents.push({
                    role,
                    parts: [{ text }]
                });
            }
        } else if (params.userPrompt?.trim()) {
            contents.push({
                role: 'user',
                parts: [{ text: params.userPrompt.trim() }]
            });
        }

        if (!contents.length) {
            throw new AIServiceError(
                'Google 请求缺少用户输入',
                this.providerName,
                params.model,
                undefined,
                undefined,
                ErrorType.INVALID_REQUEST
            );
        }

        return {
            contents,
            systemInstruction: systemInstruction || undefined
        };
    }

    /**
     * 通用 Gemini REST 请求执行器。
     * 用于 image / speech / embedding 等非默认文本链路。
     */
    private async executeGeminiRequest<T>(options: {
        model: string;
        method: string;
        body: unknown;
        parse: (data: any) => T;
        capability?: string;
        preferredKey?: string;
    }): Promise<T> {
        const baseKeys = this.getApiKeys();

        const keys = options.preferredKey
            ? Array.from(
                  new Set(
                      [options.preferredKey, ...baseKeys].filter(
                          (k): k is string => Boolean(k?.trim())
                      )
                  )
              )
            : baseKeys;

        BaseProvider.registerAndValidateKeys(
            keys,
            this.providerName,
            this.providerKey,
            options.model
        );

        let activeKey: string | undefined;

        try {
            activeKey = options.preferredKey
                ? options.preferredKey
                : KeyService.getNextKey(this.providerKey);

            BaseProvider.validateAPIKey(activeKey, this.providerName);

            const key = activeKey as string;
            const url = this.buildGeminiUrl(
                options.model,
                options.method,
                key
            );

            const response = await BaseProvider.fetchWithAbort(
                url,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json'
                    },
                    body: JSON.stringify(options.body)
                },
                {
                    provider: this.providerName,
                    model: options.model
                }
            );

            if (!response.ok) {
                throw await BaseProvider.parseAPIError(
                    response,
                    this.providerName,
                    options.model
                );
            }

            const rawText = await response.text();

            let data: any;
            try {
                data = JSON.parse(rawText);
            } catch (error) {
                throw new ParseError(
                    `${this.providerName} 响应不是有效 JSON`,
                    this.providerName,
                    options.model,
                    rawText.slice(0, 1000)
                );
            }

            const result = options.parse(data);

            KeyService.reportSuccess(this.providerKey, key);

            return result;
        } catch (error) {
            if (activeKey && this.shouldReportKeyFailure(error)) {
                KeyService.reportFailure(
                    this.providerKey,
                    activeKey,
                    error
                );
            }

            throw error;
        }
    }
}