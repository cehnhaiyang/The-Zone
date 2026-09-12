/**
 * 火山方舟 (Volcano Ark) 提供商适配器
 *
 * 参照参考实现 (参考/main.ts PROVIDERS.volcengine)：
 * - OpenAI 兼容接口：https://ark.cn-beijing.volces.com/api/v3/chat/completions
 * - 推荐模型：glm-5-2-260617 / doubao-seed-evolving / deepseek-v4-flash-ga-260731
 * - 支持能力：zone / npcDialogue / npcReaction / dyNarrative
 * - deepseek-v4-flash-ga-260731 命中思考模型清单，自动注入 thinking 参数。
 */

import type { Settings, ApiPlatform } from '../../../meta';
import { BaseProvider } from './base';
import type { TextGenParams } from './base';
import { injectThinkParams } from './think';

/** 火山方舟 OpenAI 兼容接入点 */
const API_BASE = 'https://ark.cn-beijing.volces.com/api/v3';

export class VolcengineProvider extends BaseProvider {
    constructor(settings: Settings) {
        super(settings, 'volcengine' as ApiPlatform, 'Volcengine');
    }

    protected getApiKeys(): string[] {
        return this.settings.volcengineKeys || [];
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