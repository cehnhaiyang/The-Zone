/**
 * Chat2API 提供商适配器
 *
 * 支持能力：zone / npcDialogue / npcReaction / dyNarrative / image / embedding
 * 支持模型：deepseek-v4-flash, deepseek-v4-pro
 * 基于基类 BaseProvider 进行构建，复用了默认的 OpenAI /v1/chat/completions 文本生成处理逻辑。
 */

import { Settings } from '../../../meta';
import { BaseProvider } from './base';

export class Chat2ApiProvider extends BaseProvider {
    constructor(settings: Settings) {
        super(settings, 'chat2api', 'Chat2API');
    }

    protected getApiKeys(): string[] {
        return (this.settings as any).chat2apiKeys || [];
    }

    protected getBaseUrl(): string {
        return 'http://127.0.0.1:8080/v1/chat/completions';
    }

    supports(capability: string): boolean {
        return ['zone', 'npcDialogue', 'npcReaction', 'dyNarrative', 'image', 'embedding'].includes(capability);
    }
}
