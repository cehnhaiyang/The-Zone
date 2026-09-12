/**
 * AI 动态叙事服务 (DyNarrative Service)
 * 轻量 AI 调用：直接使用动态叙事引擎 (Dynamic Narrative Service) 下发的推演指令 (directives)，
 * 生成短小的叙事覆盖层，反映玩家生理/心理状态对当前环境感知的扭曲。
 * 目标是低延迟、高并发、短输出（通常 < 100 tokens）。
 */

import { Settings, DyGenerationContext } from '../../meta';
import { BaseProvider, AIResponse, GenericCacheManager } from './providers/base';
import { callAi } from './providers';

// 动态叙事缓存：容量限制 100，有效期提升至 10 分钟（玩家在同一层探索通常会持续一段时间）
const narrativeCache = new GenericCacheManager<string>(100, 10 * 60 * 1000);

export interface TemplateConfig {
    id: string;
    template: string;
    variables?: string[];
}

export class PromptTemplateEngine {
    private static templates: Map<string, TemplateConfig> = new Map();

    static registerTemplate(config: TemplateConfig): void {
        this.templates.set(config.id, config);
    }

    static getRegisteredTemplates(): string[] {
        return Array.from(this.templates.keys());
    }

    static buildPrompt(id: string, params: Record<string, any> = {}): string {
        const config = this.templates.get(id);
        if (!config) return '';
        let result = config.template;
        const get = (key: string): string => String(params[key] ?? '');

        // Handlebars 风格条件块：{{#if key}}A{{else}}B{{/if}} / {{#if key}}A{{/if}}。
        // 历史实现只做 \{key\} 正则替换，if/else 块原样残留并发给 LLM：
        // 提示词同时含两条矛盾指令 + 字面 {{#if}} 噪音。
        result = result.replace(
            /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g,
            (_, key: string, truthy: string, falsy: string) =>
                get(key).trim() !== '' ? truthy : falsy
        );
        result = result.replace(
            /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
            (_, key: string, truthy: string) => (get(key).trim() !== '' ? truthy : '')
        );

        Object.entries(params).forEach(([key, val]) => {
            result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val ?? ''));
        });
        return result;
    }
}

/**
 * 动态叙事系统提示词模板——节点叙事覆盖层生成器
 */
const DYNAMIC_NARRATIVE_SYSTEM_TEMPLATE: TemplateConfig = {
    id: 'dynamic_narrative_system',
    template: `
你是一个宇宙恐怖生存 RPG 中的「节点叙事状态染色器」。

【核心职责】
你的任务是根据玩家的[当前生理/心理状态]，以相同的叙事客体对[原始节点描述]进行「感知重写」。
输出的文本将直接覆盖原始描述显示给玩家。场景本身并没有变，而是玩家感知到的场景因为其状态而发生了扭曲。

【状态响应规则】
- HP 极低：强化物理环境的压迫感、血腥味、疼痛的同步律动、重力感。
- 理智极低：赋予死物生命、环境比例失调、逻辑崩塌、不可名状的窥视感。
- 体力极低：泥潭般的阻力感、距离无限拉长、极度疲惫感。
- 无异常状态：对原始描述做极为轻微的氛围增强（冷酷、压抑），不要过度加戏。
- 综合恶化：将多种不适感编织在一起，如“走廊静得仿佛在倾听你内脏破裂的声响”。

【绝对规则与输出限制】
1. 你的输出必须且只能是一个合法的 JSON 对象。
2. 绝对不能包含任何思维过程、Markdown 标记 (\`\`\`json 等) 或前言后语。
3. 必须包含一个 "narrative" 键。
4. "narrative" 字段的内容必须控制在 15~100 个中文字符以内。
5. 必须是第二人称 (你) 或无人称的客观环境描写，严禁第一人称日记体。
6. 严禁使用 emoji、颜文字或现代网络用语。

【合法输出示例】
{"narrative": "这条走廊长得没有尽头——每一步都像是在泥潭中挣扎，墙壁上的水渍仿佛在嘲笑你越来越沉重的呼吸。"}
`.trim()
};

/**
 * 局部用户提示词模板定义
 */
const DY_NARRATIVE_USER_TEMPLATE: TemplateConfig = {
    id: 'dynamic_narrative_user',
    template: `
【区域环境基调】
区域名称："{{zoneName}}"
氛围提示："{{zoneDesc}}"

【位移轨迹】
刚才位于：[{{prevNodeName}}]
现在进入：[{{currentNodeName}}]

【当前节点原始描述】
"{{currentNodeDesc}}"

【当前探索深度】第 {{depth}} 层

{{#if directives}}
【玩家当前状态与基调指令 (强制反映在叙事中)】
{{directives}}
{{else}}
【状态】一切正常。保持冷静客观的基调，轻微渲染压抑氛围即可。
{{/if}}

请结合上述空间变换与状态指令，直接返回满足要求的 JSON：
`.trim(),
    variables: ['zoneName', 'zoneDesc', 'prevNodeName', 'currentNodeName', 'currentNodeDesc', 'depth', 'directives']
};

/**
 * 内部动态叙事提示词管理器
 */
class NarrativePromptManager {
    /** 确保所需的模板已注册到引擎中 */
    static ensureTemplatesRegistered(): void {
        const registered = PromptTemplateEngine.getRegisteredTemplates();
        if (!registered.includes(DYNAMIC_NARRATIVE_SYSTEM_TEMPLATE.id)) {
            PromptTemplateEngine.registerTemplate(DYNAMIC_NARRATIVE_SYSTEM_TEMPLATE);
        }
        if (!registered.includes(DY_NARRATIVE_USER_TEMPLATE.id)) {
            PromptTemplateEngine.registerTemplate(DY_NARRATIVE_USER_TEMPLATE);
        }
    }

    /** 获取动态叙事系统提示词 */
    static getSystemPrompt(): string {
        this.ensureTemplatesRegistered();
        return PromptTemplateEngine.buildPrompt(DYNAMIC_NARRATIVE_SYSTEM_TEMPLATE.id);
    }

    /** 获取动态叙事用户提示词 */
    static getUserPrompt(location: DyGenerationContext['location'], depth: number, directives: string): string {
        this.ensureTemplatesRegistered();

        // 使用模板引擎渲染提示词，完全依赖 location 上下文穿透
        return PromptTemplateEngine.buildPrompt(DY_NARRATIVE_USER_TEMPLATE.id, {
            zoneName: location.currentLocation.zone.name,
            zoneDesc: location.currentLocation.zone.desc,
            prevNodeName: location.prevLocation?.node.name || '无，这是第一个区域',
            currentNodeName: location.currentLocation.node.name,
            currentNodeDesc: location.currentLocation.node.desc,
            depth,
            directives: directives || ''
        });
    }
}

/**
 * 构建缓存键：依赖唯一的节点 ID 与推演指令集合
 */
const generateCacheKey = (zoneId: string, nodeId: string, directives: string): string => {
    return `${zoneId}|${nodeId}|${directives || 'normal'}`;
};

/**
 * 生成动态叙事文本：提取 Location 上下文，覆盖固定描述重写场景感知。
 * @param settings 游戏全局配置
 * @param context 动态叙事上下文（含底层推演指令及完整 Location 链路）
 * @param depth 探索深度
 * @returns 经过状态"染色"的叙事文本
 */
export const generateDyNarrative = async (
    settings: Settings,
    context: DyGenerationContext,
    depth: number = 1
): Promise<string> => {
    // 参数前置校验，替换为 BaseProvider 的静态方法
    BaseProvider.validateRequiredParams(
        { settings, context },
        ['settings', 'context'],
        'Dynamic Narrative Generation'
    );

    const { location, directives = '' } = context;

    if (!location || !location.currentLocation || !location.prevLocation) {
        BaseProvider.logWarn('DyNarrative', '缺少合法的 location 上下文，已降级返回空字符串');
        return '';
    }

    const modelToUse = settings.dyNarrativeModel;
    if (!modelToUse) {
        BaseProvider.logWarn('DyNarrative', '未配置 dyNarrativeModel，已降级返回空字符串');
        return '';
    }

    const currentNode = location.currentLocation.node;

    // 1. 尝试命中缓存（键含区域维度：不同区域极易复用相同节点 id，如 entrance/n1）
    const cacheKey = generateCacheKey(
        location.currentLocation.zone.id,
        currentNode.id,
        directives
    );
    const cachedResult = narrativeCache.get(cacheKey);
    if (cachedResult) return cachedResult;

    // 定期清理过期缓存，防止长时间探索导致的内存泄漏
    narrativeCache.cleanExpiredCache();

    // 2. 准备提示词
    const systemPrompt = NarrativePromptManager.getSystemPrompt();
    const userPrompt = NarrativePromptManager.getUserPrompt(location, depth, directives);

    try {
        // 3. 通过 callAi 统一入口路由到对应服务商
        const aiResponse: AIResponse = await callAi(settings, {
            providerId: modelToUse.provider,
            model: modelToUse.model,
            capability: 'dyNarrative',
            systemPrompt,
            userPrompt,
            jsonMode: true,
        }) as AIResponse;

        // 4. 解析响应，带有容错降级
        const { data, success } = BaseProvider.safeJSONParseWithInfo<{ narrative: string }>(
            aiResponse.text,
            { narrative: '' }
        );

        const result = data.narrative?.trim() || '';

        // 5. 缓存策略：仅缓存成功解析且长度合理的文本
        if (success && result.length > 5) {
            narrativeCache.set(cacheKey, result);
        }

        return result;
    } catch (error) {
        // 统一由错误处理模块接管，记录日志并返回降级默认值（空字符串）
        return BaseProvider.handleServiceError(
            error,
            'Dynamic Narrative Generation',
            {
                model: modelToUse,
                hasContext: true,
                nodeName: currentNode.name,
            },
            ''
        ) as string;
    }
};

/**
 * 清空动态叙事缓存
 */
export const clearNarrativeCache = (): void => {
    narrativeCache.clear();
};

/**
 * 获取动态叙事缓存统计
 */
export const getNarrativeCacheStats = (): { size: number; maxSize: number; ttl: number } => {
    return narrativeCache.getStats();
};