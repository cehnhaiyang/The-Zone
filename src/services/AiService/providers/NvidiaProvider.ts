/**
 * NVIDIA NIM (integrate.api.nvidia.com) 提供商适配器
 *
 * 参照参考实现 (参考/main.ts PROVIDERS.nvidia)：
 * - OpenAI 兼容接口：https://integrate.api.nvidia.com/v1/chat/completions
 * - 推荐模型：nvidia/nemotron-3-ultra-550b-a55b / thinkingmachines/inkling / z-ai/glm-5.2
 * - 支持能力：zone / npcDialogue / npcReaction / dyNarrative
 * - z-ai/glm-5.2 命中思考模型清单，自动注入 thinking 参数。
 */

import type { Settings, ApiPlatform } from '../../../meta';
import { BaseProvider } from './base';
import type { TextGenParams } from './base';
import { injectThinkParams } from './think';

/** NVIDIA 集成 API 接入点（OpenAI 兼容） */
const API_BASE = 'https://integrate.api.nvidia.com/v1';

export class NvidiaProvider extends BaseProvider {
    constructor(settings: Settings) {
        super(settings, 'nvidia' as ApiPlatform, 'NVIDIA');
    }

    protected getApiKeys(): string[] {
        return this.settings.nvidiaKeys || [];
    }

    protected getBaseUrl(): string {
        return `${API_BASE}/chat/completions`;
    }

    protected override get defaultTemperature(): number {
        return 0.92;
    }

    supports(capability: string): boolean {
        return [
            'text',
            'zone',
            'npcDialogue',
            'npcReaction',
            'dyNarrative',
        ].includes(capability);
    }

    protected override buildRequestBody(
        params: TextGenParams,
        capability: string
    ): Record<string, unknown> {
        return injectThinkParams(
            super.buildRequestBody(params, capability),
            params.model
        );
    }
}