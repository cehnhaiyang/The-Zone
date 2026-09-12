/**
 * AI Provider 层唯一对外出口 (index.ts)
 *
 * 合并了原有的 ProviderFactory 路由映射逻辑。
 * 外部只需传入提供商 ID 和所需能力，底层将自动路由到对应的适配器，完美解耦。
 */

import { Settings } from '../../../meta';

import { BaseProvider, AIResponse } from './base';

// 引入具体的提供商实现
import { GroqProvider } from './GroqProvider';
import { PollinationsProvider } from './PollinationsProvider';
import { ZhipuProvider } from './ZhipuProvider';
import { DeapiProvider } from './DeapiProvider';
import { QwenstudioProvider } from './QwenstudioProvider';
import { VolcengineProvider } from './VolcengineProvider';
import { NvidiaProvider } from './NvidiaProvider';

const PROVIDER_REGISTRY: Record<string, new (settings: Settings) => BaseProvider> = {
    groq: GroqProvider,
    pollinations: PollinationsProvider,
    zhipu: ZhipuProvider,
    deapi: DeapiProvider,
    qwenstudio: QwenstudioProvider,
    volcengine: VolcengineProvider,
    nvidia: NvidiaProvider,
};

class ProviderCache {
    private static instances = new Map<string, BaseProvider>();

    static get(providerId: string, settings: Settings): BaseProvider {
        const cacheKey = `${providerId}_${JSON.stringify(settings)}`;
        if (this.instances.has(cacheKey)) {
            return this.instances.get(cacheKey)!;
        }

        const ProviderClass = PROVIDER_REGISTRY[providerId];
        if (!ProviderClass) {
            throw new Error(`未知的提供商: ${providerId}。可用提供商: ${Object.keys(PROVIDER_REGISTRY).join(', ')}`);
        }

        const provider = new ProviderClass(settings);
        this.instances.set(cacheKey, provider);
        return provider;
    }

    static clear(): void {
        this.instances.clear();
    }
}

// ==================== 直接调用参数与结果约束 ====================

export interface AICallParams {
    providerId: string;
    model: string;
    capability: string;

    // --- 文本类参数 ---
    systemPrompt?: string;
    userPrompt?: string;
    jsonMode?: boolean;

    // --- 媒体类参数 ---
    prompt?: string;
    width?: number;
    height?: number;
    seed?: number;
    imageUrl?: string;
    voiceName?: string;
    text?: string;
    apiKey?: string;
    fps?: number;
    duration?: number;
    quality?: 'quality' | 'speed';
    withAudio?: boolean;
    watermarkEnabled?: boolean;
    size?: string;
    userId?: string;
}

/** 调用结果联合类型 */
export type AiCallResult = AIResponse | string | number[];

/** 能力键与内部方法名映射 */
const CAPABILITY_METHOD_MAP: Record<string, string> = {
    zone: 'generateZone',
    npcDialogue: 'generateNpcDialogue',
    npcReaction: 'generateNpcReaction',
    dyNarrative: 'generateDyNarrative',
    image: 'generateImage',
    video: 'generateVideo',
    speech: 'generateSpeech',
};

// ==================== 统一调用路由 ====================

/**
 * 统一 AI 调用入口
 * 真正的路由映射，由外部直接驱动引擎分发任务。
 *
 * @example
 * const result = await callAi(settings, {
 * providerId: 'groq',
 * model: 'llama3-70b-8192',
 * capability: 'zone',
 * systemPrompt: '...',
 * userPrompt: '...'
 * });
 */
export async function callAi(settings: Settings, params: AICallParams): Promise<AiCallResult> {
    if (!params.providerId || !params.model) {
        throw new Error('AI 调用必须明确指定 providerId 和 model');
    }

    // 1. 获取提供商单例（附带内存缓存）
    const provider = ProviderCache.get(params.providerId, settings);

    // 2. 能力拦截
    if (!provider.supports(params.capability)) {
        throw new Error(`提供商 [${params.providerId}] 不支持能力: ${params.capability}`);
    }

    // 3. 寻找真实的方法引用
    const methodName = CAPABILITY_METHOD_MAP[params.capability];
    if (!methodName) {
        throw new Error(`架构层未知的生成能力: ${params.capability}`);
    }

    const method = (provider as any)[methodName] as Function;
    if (typeof method !== 'function') {
        throw new Error(`提供商 [${params.providerId}] 声明支持 ${params.capability} 但未实现底层对应方法`);
    }

    // 4. 控制台实时打印完整提示词
    const timeStr = new Date().toLocaleTimeString();
    console.group(`[AI 提示词提交 ${timeStr}] [${params.capability}] -> ${params.providerId}:${params.model}`);
    if (params.systemPrompt) {
        console.log('%c[System Prompt]:', 'color: #10b981; font-weight: bold;', params.systemPrompt);
    }
    if (params.userPrompt) {
        console.log('%c[User Prompt]:', 'color: #3b82f6; font-weight: bold;', params.userPrompt);
    }
    if (params.prompt) {
        console.log('%c[Media Prompt]:', 'color: #ec4899; font-weight: bold;', params.prompt);
    }
    if (params.text && !params.userPrompt) {
        console.log('%c[Text Prompt]:', 'color: #8b5cf6; font-weight: bold;', params.text);
    }
    console.groupEnd();

    // 5. 发射请求并透传参数
    return method.call(provider, params);
}