/**
 * 思考模式适配工具 (think.ts)
 *
 * 移植自参考实现 runtime.ts 的 THINK_MODELS / thinkParams 逻辑：
 * - 火山引擎 / DeepSeek 官方均要求 thinking:{ type:'enabled' } 与
 *   reasoning_effort 作为顶层字段分开传；
 * - 命中的模型强制开启思考（模型默认即思考），未列出的模型不注入，避免接口拒绝。
 */

/** 支持 OpenAI 兼容 thinking 参数的模型清单 */
export const THINK_MODELS: readonly string[] = [
    'z-ai/glm-5.2',
    'deepseek-v4-flash',
    'deepseek-v4-flash-ga-260731',
    'gpt-5.6-luna',
];

/** 各模型可选的思考等级（等级名即 reasoning_effort 取值） */
const THINK_LEVELS: Record<string, readonly string[]> = {
    'deepseek-v4-flash': ['low', 'high', 'max'],
    'deepseek-v4-flash-ga-260731': ['low', 'high', 'max'],
    'gpt-5.6-luna': ['low', 'medium', 'high', 'xhigh', 'max'],
};

const DEFAULT_THINK_LEVELS: readonly string[] = [
    'low',
    'medium',
    'high',
    'max',
];

/** 模型是否适配思考参数 */
export const supportsThinking = (model: string): boolean =>
    THINK_MODELS.includes(model);

/** 默认思考等级：含 high 则取 high，否则取最高档 */
export const defaultThinkLevel = (model: string): string => {
    const levels = THINK_LEVELS[model] ?? DEFAULT_THINK_LEVELS;
    return levels.includes('high') ? 'high' : levels[levels.length - 1];
};

/**
 * 为命中思考模型的请求体注入 thinking / reasoning_effort。
 * 未命中返回原样对象（不注入）。
 */
export const injectThinkParams = (
    body: Record<string, unknown>,
    model: string,
): Record<string, unknown> => {
    if (!supportsThinking(model)) return body;

    body.thinking = { type: 'enabled' };
    body.reasoning_effort = defaultThinkLevel(model);
    return body;
};