/**
 * Zhipu (智谱) 提供商适配器
 * 支持能力：video
 *
 * 基于 BaseProvider 构建，复用统一的 Key 管理、Fetch、错误分类和日志。
 * 由于视频生成是异步任务，这里保留长时间轮询机制，不设置总超时。
 */
import type { Settings } from '../../../meta';
import type { TextGenParams } from './base';
import {
    BaseProvider,
    AIServiceError,
    ErrorType,
    ParseError,
    NetworkError
} from './base';
import { KeyService } from '../../KeyService';

//=============================================================================
// 参数与响应类型
//=============================================================================
export interface ZhipuVideoParams {
    model: string;
    prompt: string;
    imageUrl?: string;
    apiKey?: string;
    quality?: 'quality' | 'speed';
    withAudio?: boolean;
    watermarkEnabled?: boolean;
    size?: string;
    fps?: number;
    duration?: number;
    userId?: string;
    signal?: AbortSignal;
}

interface ZhipuTaskCreateResponse {
    id?: string;
    task_id?: string;
}

interface ZhipuVideoResultItem {
    url?: string;
    video_url?: string;
}

interface ZhipuTaskStatusResponse {
    task_status?: string;
    video_result?: ZhipuVideoResultItem[];
    result?: Array<{ url?: string }>;
    message?: string;
    error?: {
        message?: string;
    };
}

//=============================================================================
// Provider 实现
//=============================================================================
export class ZhipuProvider extends BaseProvider {
    private static readonly POLL_INTERVAL_MS = 2000;
    private static readonly MAX_CONSECUTIVE_POLL_FAILURES = 5;

    constructor(settings: Settings) {
        super(settings, 'zhipu', 'Zhipu');
    }

    protected getApiKeys(): string[] {
        return this.settings.zhipuKeys || [];
    }

    protected getBaseUrl(): string {
        return 'https://open.bigmodel.cn/api/paas/v4';
    }

    supports(capability: string): boolean {
        return capability === 'video';
    }

    //=========================================================================
    // 视频生成
    //=========================================================================
    async generateVideo(params: ZhipuVideoParams): Promise<string> {
        let apiKey: string | undefined;
        let taskId: string | undefined;

        try {
            BaseProvider.validateRequiredParams(
                params as unknown as Record<string, unknown>,
                ['model', 'prompt'],
                `${this.providerName}.generateVideo`
            );

            const prompt = params.prompt.trim();
            if (!prompt) {
                throw new AIServiceError(
                    '视频生成 Prompt 不能为空',
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

            const headerParams: TextGenParams = {
                model: params.model,
                systemPrompt: '',
                userPrompt: ''
            };

            BaseProvider.logDebug(this.providerName, '开始视频生成', {
                model: params.model,
                size: params.size ?? '1280x720',
                duration: params.duration ?? 10,
                quality: params.quality ?? 'quality'
            });

            const requestBody: Record<string, unknown> = {
                model: params.model,
                prompt,
                quality: params.quality ?? 'quality',
                with_audio: params.withAudio ?? false,
                watermark_enabled: params.watermarkEnabled ?? false,
                size: params.size ?? '1280x720',
                fps: params.fps ?? 60,
                duration: params.duration ?? 10
            };

            if (params.userId) {
                requestBody.user_id = params.userId;
            }

            if (params.imageUrl) {
                requestBody.image_url = params.imageUrl;
            }

            const createResponse = await BaseProvider.fetchWithAbort(
                `${this.getBaseUrl()}/videos/generations`,
                {
                    method: 'POST',
                    headers: this.buildHeaders(key, headerParams, 'video'),
                    body: JSON.stringify(requestBody),
                    signal: params.signal
                },
                {
                    provider: this.providerName,
                    model: params.model
                }
            );

            if (!createResponse.ok) {
                throw await BaseProvider.parseAPIError(
                    createResponse,
                    this.providerName,
                    params.model
                );
            }

            const rawText = await createResponse.text();

            let createData: ZhipuTaskCreateResponse;
            try {
                createData = JSON.parse(rawText) as ZhipuTaskCreateResponse;
            } catch {
                throw new ParseError(
                    `${this.providerName} 创建视频任务响应不是有效 JSON`,
                    this.providerName,
                    params.model,
                    rawText.slice(0, 1000)
                );
            }

            taskId = createData?.id || createData?.task_id;

            if (!taskId) {
                throw new AIServiceError(
                    'API 未返回任务 ID',
                    this.providerName,
                    params.model,
                    undefined,
                    undefined,
                    ErrorType.INVALID_REQUEST
                );
            }

            const videoUrl = await this.pollVideoTask(
                taskId,
                key,
                params,
                headerParams
            );

            KeyService.reportSuccess(this.providerKey, key);

            BaseProvider.logInfo(
                this.providerName,
                `视频任务 ${taskId} 生成成功`,
                {
                    model: params.model
                }
            );

            return videoUrl;
        } catch (error) {
            const aborted = params.signal?.aborted === true;

            if (apiKey && !aborted && this.shouldReportKeyFailure(error)) {
                KeyService.reportFailure(this.providerKey, apiKey, error);
            }

            BaseProvider.logError(
                `${this.providerName}.generateVideo failed`,
                error,
                {
                    model: params.model,
                    taskId
                }
            );

            throw error;
        }
    }

    //=========================================================================
    // 异步任务轮询
    //=========================================================================
    private async pollVideoTask(
        taskId: string,
        apiKey: string,
        params: ZhipuVideoParams,
        headerParams: TextGenParams
    ): Promise<string> {
        const statusUrl = `${this.getBaseUrl()}/async-result/${taskId}`;
        const headers = this.buildHeaders(apiKey, headerParams, 'video');

        let consecutiveFailures = 0;

        while (true) {
            if (params.signal?.aborted) {
                throw new NetworkError(
                    '请求被中止',
                    this.providerName,
                    params.model
                );
            }

            await this.sleep(
                ZhipuProvider.POLL_INTERVAL_MS,
                params.signal,
                params.model
            );

            let statusResponse: Response;

            try {
                statusResponse = await BaseProvider.fetchWithAbort(
                    statusUrl,
                    {
                        headers,
                        signal: params.signal
                    },
                    {
                        provider: this.providerName,
                        model: params.model
                    }
                );
            } catch (error) {
                if (params.signal?.aborted || this.isNonTransientError(error)) {
                    throw error;
                }

                consecutiveFailures += 1;

                if (
                    consecutiveFailures >=
                    ZhipuProvider.MAX_CONSECUTIVE_POLL_FAILURES
                ) {
                    throw error;
                }

                BaseProvider.logWarn(
                    this.providerName,
                    `轮询视频任务失败 (${consecutiveFailures}/${ZhipuProvider.MAX_CONSECUTIVE_POLL_FAILURES})`,
                    {
                        taskId
                    }
                );

                continue;
            }

            if (!statusResponse.ok) {
                const apiError = await BaseProvider.parseAPIError(
                    statusResponse,
                    this.providerName,
                    params.model
                );

                if (this.isNonTransientError(apiError)) {
                    throw apiError;
                }

                consecutiveFailures += 1;

                if (
                    consecutiveFailures >=
                    ZhipuProvider.MAX_CONSECUTIVE_POLL_FAILURES
                ) {
                    throw apiError;
                }

                BaseProvider.logWarn(
                    this.providerName,
                    `轮询视频任务状态异常 (${consecutiveFailures}/${ZhipuProvider.MAX_CONSECUTIVE_POLL_FAILURES})`,
                    {
                        taskId,
                        status: statusResponse.status
                    }
                );

                continue;
            }

            const rawText = await statusResponse.text();

            let statusData: ZhipuTaskStatusResponse;
            try {
                statusData = JSON.parse(rawText) as ZhipuTaskStatusResponse;
            } catch {
                consecutiveFailures += 1;

                if (
                    consecutiveFailures >=
                    ZhipuProvider.MAX_CONSECUTIVE_POLL_FAILURES
                ) {
                    throw new ParseError(
                        `${this.providerName} 视频任务状态响应不是有效 JSON`,
                        this.providerName,
                        params.model,
                        rawText.slice(0, 1000)
                    );
                }

                continue;
            }

            consecutiveFailures = 0;

            const taskStatus = String(
                statusData?.task_status ?? ''
            ).toUpperCase();

            if (taskStatus === 'SUCCESS') {
                const videoUrl =
                    statusData?.video_result?.[0]?.url ??
                    statusData?.video_result?.[0]?.video_url ??
                    statusData?.result?.[0]?.url;

                if (!videoUrl) {
                    throw new AIServiceError(
                        '任务成功但未返回视频地址',
                        this.providerName,
                        params.model,
                        undefined,
                        undefined,
                        ErrorType.PARSE
                    );
                }

                return String(videoUrl);
            }

            if (taskStatus === 'FAIL' || taskStatus === 'FAILED') {
                const msg =
                    statusData?.message ||
                    statusData?.error?.message ||
                    JSON.stringify(statusData);

                throw new AIServiceError(
                    `视频生成失败: ${msg}`,
                    this.providerName,
                    params.model,
                    undefined,
                    statusData
                );
            }

            BaseProvider.logDebug(
                this.providerName,
                `视频任务 ${taskId} 当前状态: ${taskStatus || 'UNKNOWN'}`
            );
        }
    }

    //=========================================================================
    // 工具方法
    //=========================================================================
    private isNonTransientError(error: unknown): boolean {
        if (error instanceof AIServiceError) {
            return [
                ErrorType.AUTH,
                ErrorType.QUOTA,
                ErrorType.INVALID_REQUEST,
                ErrorType.SAFETY
            ].includes(error.errorType);
        }

        return false;
    }

    private async sleep(
        ms: number,
        signal?: AbortSignal,
        model = 'unknown'
    ): Promise<void> {
        if (signal?.aborted) {
            throw new NetworkError(
                '请求被中止',
                this.providerName,
                model
            );
        }

        return new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
                cleanup();
                resolve();
            }, ms);

            const onAbort = () => {
                cleanup();
                reject(
                    new NetworkError(
                        '请求被中止',
                        this.providerName,
                        model
                    )
                );
            };

            const cleanup = () => {
                clearTimeout(timer);
                signal?.removeEventListener('abort', onAbort);
            };

            signal?.addEventListener('abort', onAbort, { once: true });
        });
    }
}