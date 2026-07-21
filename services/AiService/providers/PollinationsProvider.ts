/**
 * Pollinations 提供商适配器
 * 支持能力：image
 *
 * 基于 BaseProvider 构建。
 * Pollinations 图像生成为直链拼接模式，因此不需要轮询或复杂响应解析。
 */
import type { Settings } from '../../../meta';
import {
    BaseProvider,
    AIServiceError,
    ErrorType
} from './base';
import { KeyService } from '../../KeyService';

//=============================================================================
// 参数类型
//=============================================================================
export interface PollinationsImageParams {
    model: string;
    prompt: string;
    width?: number;
    height?: number;
    seed?: number;
    apiKey?: string;
}

//=============================================================================
// Provider 实现
//=============================================================================
export class PollinationsProvider extends BaseProvider {
    constructor(settings: Settings) {
        super(settings, 'pollinations', 'Pollinations');
    }

    protected getApiKeys(): string[] {
        return this.settings.pollinationsKeys || [];
    }

    protected getBaseUrl(): string {
        return 'https://gen.pollinations.ai';
    }

    supports(capability: string): boolean {
        return capability === 'image';
    }

    //=========================================================================
    // 图像生成
    //=========================================================================
    async generateImage(params: PollinationsImageParams): Promise<string> {
        let apiKey: string | undefined;

        try {
            BaseProvider.validateRequiredParams(
                params as unknown as Record<string, unknown>,
                ['model', 'prompt'],
                `${this.providerName}.generateImage`
            );

            const prompt = params.prompt.trim();

            if (!prompt) {
                throw new AIServiceError(
                    '图像生成 Prompt 不能为空',
                    this.providerName,
                    params.model,
                    undefined,
                    undefined,
                    ErrorType.INVALID_REQUEST
                );
            }

            const configuredKeys = this.getApiKeys()
                .map((k) => k?.trim())
                .filter((k): k is string => Boolean(k));

            const candidateKeys = params.apiKey?.trim()
                ? [...configuredKeys, params.apiKey.trim()]
                : configuredKeys;

            BaseProvider.registerAndValidateKeys(
                candidateKeys,
                this.providerName,
                this.providerKey,
                params.model
            );

            apiKey =
                params.apiKey?.trim() ||
                KeyService.getNextKey(this.providerKey);

            BaseProvider.validateAPIKey(apiKey, this.providerName);
            const key = apiKey;

            const width = params.width ?? 1366;
            const height = params.height ?? 768;
            const seed =
                params.seed ?? Math.floor(Math.random() * 1_000_000);

            if (
                !Number.isFinite(width) ||
                width <= 0 ||
                !Number.isFinite(height) ||
                height <= 0
            ) {
                throw new AIServiceError(
                    '图像尺寸参数无效',
                    this.providerName,
                    params.model,
                    undefined,
                    undefined,
                    ErrorType.INVALID_REQUEST
                );
            }

            if (!Number.isFinite(seed) || seed < 0) {
                throw new AIServiceError(
                    '图像 seed 参数无效',
                    this.providerName,
                    params.model,
                    undefined,
                    undefined,
                    ErrorType.INVALID_REQUEST
                );
            }

            const url = new URL(
                `/image/${encodeURIComponent(prompt)}`,
                this.getBaseUrl()
            );

            url.searchParams.set('width', String(Math.floor(width)));
            url.searchParams.set('height', String(Math.floor(height)));
            url.searchParams.set('seed', String(Math.floor(seed)));
            url.searchParams.set('model', params.model);
            url.searchParams.set('nologo', 'true');
            url.searchParams.set('key', key);

            KeyService.reportSuccess(this.providerKey, key);

            BaseProvider.logDebug(
                this.providerName,
                '已生成图像直链',
                {
                    model: params.model,
                    width: Math.floor(width),
                    height: Math.floor(height),
                    seed: Math.floor(seed)
                }
            );

            return url.toString();
        } catch (error) {
            const normalizedError =
                error instanceof AIServiceError
                    ? error
                    : new AIServiceError(
                          `图像链接生成失败: ${
                              error instanceof Error
                                  ? error.message
                                  : String(error)
                          }`,
                          this.providerName,
                          params.model,
                          undefined,
                          error,
                          ErrorType.INVALID_REQUEST
                      );

            if (apiKey && this.shouldReportKeyFailure(normalizedError)) {
                KeyService.reportFailure(
                    this.providerKey,
                    apiKey,
                    normalizedError
                );
            }

            BaseProvider.logError(
                `${this.providerName}.generateImage failed`,
                normalizedError,
                {
                    model: params.model
                }
            );

            throw normalizedError;
        }
    }
}