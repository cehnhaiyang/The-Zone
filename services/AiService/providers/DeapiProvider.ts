/**
 * DeAPI 提供商适配器 (deapi.ai)
 *
 * 专用于图像与视频生成。使用 deAPI 原生端点 (api.deapi.ai)。
 * 支持模型（按账户实际可用）：
 *   - 图像: Flux1schnell / ZImageTurbo_INT8 / Flux_2_Klein_4B_BF16 / ZAnimeDistill_8Step_INT8
 *   - 视频: Ltxv_13B_0_9_8_Distilled_FP8 / Ltx2_19B_Dist_FP8 / Ltx2_3_22B_Dist_INT8
 */

import { Settings } from '../../../meta';
import { KeyService } from '../../KeyService';
import { BaseProvider, AIServiceError } from './base';

const API_BASE = 'https://api.deapi.ai';

export class DeapiProvider extends BaseProvider {
    constructor(settings: Settings) {
        super(settings, 'deapi', 'DeAPI');
    }

    protected getApiKeys(): string[] {
        return this.settings.deapiKeys || [];
    }

    /** 无 LLM 文本能力，基类 _generateText 路由不会触发此 provider */
    protected getBaseUrl(): string {
        return '';
    }

    supports(capability: string): boolean {
        return ['image', 'video'].includes(capability);
    }

    // ═══════════════════════════════════
    //  图像生成 — POST /txt2img → 轮询
    // ═══════════════════════════════════

    async generateImage(params: {
        model: string; prompt: string; apiKey?: string;
        width?: number; height?: number; seed?: number; steps?: number;
    }): Promise<string> {
        const keys = this.getApiKeys();
        BaseProvider.registerAndValidateKeys(keys, this.providerName, this.providerKey as any, params.model);

        const key = params.apiKey || KeyService.getNextKey(this.providerKey as any);

        const width = params.width || 1366;
        const height = params.height || 768;
        const seed = params.seed ?? Math.floor(Math.random() * 2147483647);
        const steps = params.steps || 4;

        try {
            const submitRes = await BaseProvider.fetchWithAbort(
                `${API_BASE}/api/v1/client/txt2img`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${key}`,
                    },
                    body: JSON.stringify({ model: params.model, prompt: params.prompt, width, height, seed, steps }),
                },
            );

            if (!submitRes.ok) {
                throw await BaseProvider.parseAPIError(submitRes, this.providerName, params.model);
            }

            const submitJson = await submitRes.json();
            const requestId = submitJson.data?.request_id;
            if (!requestId) {
                throw new AIServiceError('DeAPI txt2img: 未返回 request_id', this.providerName, params.model);
            }

            const url = await this._pollResult(requestId, key, 'txt2img');
            KeyService.reportSuccess(this.providerKey as any, key);
            return url;

        } catch (error) {
            KeyService.reportFailure(this.providerKey as any, key, error);
            throw error;
        }
    }

    // ═══════════════════════════════════
    //  视频生成 — POST /txt2video → 轮询
    // ═══════════════════════════════════

    async generateVideo(params: {
        model: string; prompt: string; apiKey?: string;
        width?: number; height?: number; seed?: number; steps?: number; frames?: number; fps?: number;
    }): Promise<string> {
        const keys = this.getApiKeys();
        BaseProvider.registerAndValidateKeys(keys, this.providerName, this.providerKey as any, params.model);

        const key = params.apiKey || KeyService.getNextKey(this.providerKey as any);

        const width = params.width || 1024;
        const height = params.height || 768;
        const seed = params.seed ?? Math.floor(Math.random() * 2147483647);
        const steps = params.steps || 2;
        const frames = params.frames || 120;
        const fps = params.fps || 24;

        try {
            const submitRes = await BaseProvider.fetchWithAbort(
                `${API_BASE}/api/v1/client/txt2video`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${key}`,
                    },
                    body: JSON.stringify({ model: params.model, prompt: params.prompt, width, height, seed, steps, frames, fps }),
                },
            );

            if (!submitRes.ok) {
                throw await BaseProvider.parseAPIError(submitRes, this.providerName, params.model);
            }

            const submitJson = await submitRes.json();
            const requestId = submitJson.data?.request_id;
            if (!requestId) {
                throw new AIServiceError('DeAPI txt2video: 未返回 request_id', this.providerName, params.model);
            }

            const url = await this._pollResult(requestId, key, 'txt2video');
            KeyService.reportSuccess(this.providerKey as any, key);
            return url;

        } catch (error) {
            KeyService.reportFailure(this.providerKey as any, key, error);
            throw error;
        }
    }

    // ═══════════════════════════════════
    //  通用异步轮询
    // ═══════════════════════════════════

    private async _pollResult(requestId: string, apiKey: string, taskType: string): Promise<string> {
        const maxRetries = 60;
        const interval = 3_000;

        for (let i = 0; i < maxRetries; i++) {
            await new Promise(r => setTimeout(r, interval));

            const statusRes = await fetch(
                `${API_BASE}/api/v1/client/request-status/${requestId}`,
                { headers: { 'Authorization': `Bearer ${apiKey}` } },
            );

            if (!statusRes.ok) {
                throw await BaseProvider.parseAPIError(statusRes, this.providerName, taskType);
            }

            const { data } = await statusRes.json();

            if (data.status === 'done') {
                if (data.result_url) return data.result_url;
                throw new AIServiceError(
                    `DeAPI ${taskType}: 完成但无 result_url`,
                    this.providerName, taskType,
                );
            }

            if (data.status === 'failed' || data.status === 'error') {
                throw new AIServiceError(
                    `DeAPI ${taskType} 失败: ${data.error || JSON.stringify(data).slice(0, 200)}`,
                    this.providerName, taskType,
                );
            }
            // processing / queued → 继续
        }

        throw new AIServiceError(
            `DeAPI ${taskType}: 轮询超时 (${maxRetries * interval / 1000}s)`,
            this.providerName, taskType,
        );
    }
}
