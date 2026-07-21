/**
 * @file Embedding.ts
 * @desc 嵌入向量生成模块 - 支持本地模型和统一 AI Provider 路由
 *
 * 嵌入模式配置：
 * - provider === 'local': 本地 Qwen3-Embedding-0.6B，1024 维
 * - 其他提供商 (如 'google'): 将自动通过 callAi 路由到对应的 Provider 适配器
 */

import type { Settings } from '../../meta';
import { BaseProvider } from './providers/base';
import { callAi } from './providers';

/** 嵌入向量 */
export type EmbeddingVector = number[];

// 动态导入 transformers.js v4
let transformersModule: typeof import('@huggingface/transformers') | null = null;
let transformersEnv: any = null;

// 本地模型（懒加载）
let localExtractor: any | null = null;
let localModelLoading = false;
const LOCAL_MODEL_NAME = 'Qwen3-Embedding-0.6B';

/**
 * 加载本地嵌入模型
 */
async function loadLocalModel(): Promise<void> {
    if (localExtractor) return;
    if (localModelLoading) {
        while (localModelLoading) {
            await new Promise(r => setTimeout(r, 100));
        }
        return;
    }

    localModelLoading = true;
    BaseProvider.logInfo('Embedding', 'Loading local embedding model...');

    try {
        if (!transformersModule) {
            transformersModule = await import('@huggingface/transformers');
            transformersEnv = transformersModule.env;
            // 切断远程访问，仅从本地模型目录加载
            transformersEnv.allowRemoteModels = false;
            transformersEnv.localModelPath = 'model';
        }
        localExtractor = await transformersModule.pipeline(
            'feature-extraction',
            LOCAL_MODEL_NAME,
            { dtype: 'q8' },
        );
        BaseProvider.logInfo('Embedding', 'Local model loaded successfully');
    } catch (error) {
        BaseProvider.logError('Embedding', error, { action: 'loadLocalModel' });
        throw error;
    } finally {
        localModelLoading = false;
    }
}

/**
 * 使用本地模型生成嵌入
 */
async function generateLocalEmbedding(text: string): Promise<EmbeddingVector> {
    await loadLocalModel();

    if (!localExtractor) {
        throw new Error('Local embedding model not loaded');
    }

    const truncatedText = text.slice(0, 1000);
    const output = await localExtractor(truncatedText, {
        pooling: 'mean',
        normalize: true
    });

    return Array.from(output.data as Float32Array);
}

/**
 * 生成单条文本的嵌入向量
 * @desc 已重构：移除直接的 fetch 逻辑，远程模型统一接入 callAi 路由层
 */
export async function generateEmbedding(
    settings: Settings,
    text: string
): Promise<EmbeddingVector> {
    const { provider, model } = settings.embeddingModel;

    // 本地模型直连：仅当 provider 显式指定为 'local' 时走本地 ONNX 推理
    if (provider === 'local') {
        return generateLocalEmbedding(text);
    }

    // 2. 远程大模型走统一提供商路由
    try {
        const result = await callAi(settings, {
            providerId: provider,
            model: model,
            capability: 'embedding',
            text: text
        });

        return result as number[];
    } catch (error) {
        return BaseProvider.handleServiceError(
            error,
            'Embedding Generation',
            { provider, model, textLength: text.length }
        ) as EmbeddingVector;
    }
}

/**
 * 批量生成文本嵌入向量
 */
export async function generateEmbeddings(
    settings: Settings,
    texts: string[]
): Promise<EmbeddingVector[]> {
    return Promise.all(texts.map(text => generateEmbedding(settings, text)));
}

/**
 * 计算两个向量的余弦相似度
 */
export function computeCosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 根据配置获取 API 密钥
 * @deprecated 架构重构后 API Key 的获取已在底层 BaseProvider 中自动完成，无需业务层手动获取
 */
export function getEmbeddingApiKey(settings: Settings): string | undefined {
    BaseProvider.logWarn('Embedding', 'getEmbeddingApiKey 已废弃，API Key 由底层 KeyService 自动管理');
    return settings.googleKeys?.[0];
}

/**
 * 获取当前嵌入模型的维度
 * @param modelKeyOrSettings 兼容旧版传入 modelKey 字符串，或直接传入 Settings
 */
export function getEmbeddingDimension(modelKeyOrSettings: string | Settings): number {
    let modelName = '';

    if (typeof modelKeyOrSettings === 'string') {
        modelName = BaseProvider.parseModelKey(modelKeyOrSettings).model;
    } else {
        modelName = modelKeyOrSettings.embeddingModel?.model || '';
    }

    // qwen3-embedding-0.6b: 1024 维
    // gemini-embedding-001: 3072 维
    if (modelName === 'qwen3-embedding-0.6b') return 1024;
    if (modelName.includes('gemini')) return 3072;
    return 768; // 默认 fallback
}