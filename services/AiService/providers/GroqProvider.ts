/**
 * Groq 提供商适配器
 *
 * 支持能力：
 * - text / zone / npcDialogue / npcReaction / dyNarrative
 *
 * 说明：
 * - Groq 使用 OpenAI 兼容接口。
 * - 因此直接复用 BaseProvider 默认请求体、响应解析与 Key 轮转逻辑。
 */

import type { Settings, ApiPlatform } from '../../../meta';
import { BaseProvider } from './base';

export class GroqProvider extends BaseProvider {
    constructor(settings: Settings) {
        super(settings, 'groq' as ApiPlatform, 'Groq');
    }

    protected getApiKeys(): string[] {
        return this.settings.groqKeys || [];
    }

    protected getBaseUrl(): string {
        return 'https://api.groq.com/openai/v1/chat/completions';
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
            'dyNarrative'
        ].includes(capability);
    }
}