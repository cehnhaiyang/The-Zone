/**
 * Zone.ts
 * AI 世界生成服务 (AI World Generation Service)
 *
 * 职责边界：
 * - 组装区域生成上下文
 * - 直接引用 schema.ts 中已定义好的领域 Schema
 * - 让 LLM 返回区域模板：
 *   - 链式叙事：ZoneTemplate
 *   - 单元剧：ZoneTemplate
 * - 不输出运行时字段
 * - 不在本文件中二次加工 schema
 *
 * 运行时字段，例如：
 * - generatedPlotPoints
 * - searchCount
 * - isVisited
 * - lock
 *
 * 均不由 LLM 区域模板直接生成，而应由引擎在模板加工阶段处理。
 */

import type {
    Settings,
    ZoneGenerationContext,
    ChainGenerationContext,
    EpisodicGenerationContext,
} from '../../meta';
import { BaseProvider, type AIResponse } from './providers/base';
import { callAi } from './providers';
import {
    CHAIN_ZONE_GENERATION_SCHEMA,
    EPISODIC_ZONE_GENERATION_SCHEMA,
} from '../../constants/schema';

//=============================================================================
// 内部工具
//=============================================================================

const toFiniteNumber = (value: unknown, fallback: number = 0): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

//=============================================================================
// 最小设计指令
//=============================================================================

/**
 * 这里只保留设计层目标，不重复 schema 已定义的结构约束。
 */
const DESIGN_DIRECTIVES = `
【设计目标】
- 生成的内容必须是区域模板，不是运行时区域。
- 区域、节点、实体、交互、谜题必须服务当前叙事模式、主题与世界观。
- 使用 childrenIds 表达空间层级；父子、兄弟节点之间的连接由引擎自动处理。
- 非 childrenIds 关系且空间上可往返的节点，必须显式定义双向出口。
- 叶子节点应具有合理出口，除非设计意图就是陷阱、死路或叙事收束。
- 除伏笔解决标记 toSolvePP 外，不要添加 Schema 未定义的字段。
`.trim();

/**
 * 最小输出指令。
 *
 * 注意：
 * 不重复 schema.ts 中 RULE_OUTPUT_JSON 已说明的字段规则。
 * 这里只强调传输层输出格式与模板边界。
 */
const OUTPUT_DIRECTIVES = `
【输出】
只输出一个合法 JSON 对象。
输出必须是区域模板。
`.trim();

//=============================================================================
// 上下文构建
//=============================================================================

function buildCommonBaseContext(context: ZoneGenerationContext): string[] {
    const parts: string[] = ['## 基础上下文'];

    const { mode, theme } = context.base;

    parts.push(`- 叙事模式: ${mode.id}`);
    if (mode.prompt) {
        parts.push(`  - 模式约束: ${mode.prompt.trim()}`);
    }

    parts.push(`- 区域主题: ${theme.id}`);
    if (theme.prompt) {
        parts.push(`  - 主题氛围: ${theme.prompt.trim()}`);
    }

    const activeQuests = context.extra.questAccepted?.filter((quest) => quest.status === 'on') ?? [];

    if (activeQuests.length > 0) {
        parts.push(`- 活跃任务:`);
        activeQuests.forEach((quest) => {
            parts.push(`  - ${quest.desc}`);
        });
    }

    return parts;
}

function buildChainBaseContext(context: ChainGenerationContext): string {
    const parts = buildCommonBaseContext(context);

    const { pacing, motif, mainAxis } = context.base;

    parts.push(`- 叙事节奏: ${pacing.id}`);
    if (pacing.prompt) {
        parts.push(`  - 节奏控制: ${pacing.prompt.trim()}`);
    }

    parts.push(`- 叙事主旨: ${motif.id}`);
    if (motif.prompt) {
        parts.push(`  - 主旨内涵: ${motif.prompt.trim()}`);
    }

    parts.push(`- 叙事主轴: ${mainAxis.id}`);
    if (mainAxis.prompt) {
        parts.push(`  - 主轴导向: ${mainAxis.prompt.trim()}`);
    }

    const prevZone = context.extra.prevLocation?.zone;
    if (prevZone?.id && prevZone?.name) {
        parts.push(`- 前置区域: ${prevZone.name} (ID: ${prevZone.id})`);
    } else {
        parts.push(`- 前置区域: 无`);
    }

    const currentZone = context.extra.currentLocation?.zone;
    if (currentZone?.id && currentZone?.name) {
        parts.push(`- 当前区域: ${currentZone.name} (ID: ${currentZone.id})`);
    }

    return parts.join('\n');
}

function buildEpisodicBaseContext(context: EpisodicGenerationContext): string {
    const parts = buildCommonBaseContext(context);

    if (context.extra.player) {
        const { dynamic } = context.extra.player;
        const { vital } = context.extra.player.static.initialState;

        parts.push(
            `- 玩家状态: HP ${toFiniteNumber(dynamic.hp)}/${toFiniteNumber(
                vital.maxHp
            )}, 理智 ${toFiniteNumber(dynamic.sanity)}/${toFiniteNumber(vital.maxSanity)}`
        );
    }

    if (context.extra.companions && context.extra.companions.length > 0) {
        const companions = context.extra.companions
            .map((companion) => {
                const name = companion.static.name;
                const affinity = toFiniteNumber(companion.dynamic.affinity);
                return `${name} (好感: ${affinity})`;
            })
            .join(', ');

        parts.push(`- 同伴状态: ${companions}`);
    }

    return parts.join('\n');
}

/**
 * 链式叙事上下文。
 *
 * 注意：
 * - 不要求 LLM 输出 generatedPlotPoints。
 * - generatedPlotPoints 是运行时 Zone 字段，不由区域模板直接返回。
 * - 若需要解决已有伏笔，只提示 LLM 在模板实体根部挂载 toSolvePP。
 */
function buildChainNarrativeContext(context: ChainGenerationContext): string {
    const { params, output } = context.params;

    const parts: string[] = ['## 叙事分析'];

    parts.push(`- 叙事阶段: ${params.progress.macro}`);
    parts.push(`- 微观进度: ${(toFiniteNumber(params.progress.micro, 0) / 10).toFixed(0)}%`);
    parts.push(`- 当前张力: ${(toFiniteNumber(params.tension, 0) / 10).toFixed(0)}%`);

    if (params.shouldTriggerEnding) {
        parts.push(`- 当前叙事链接近尾声，可安排高潮、结局或挂起事件。`);
    }

    const mainPlotPressure = Math.max(0, toFiniteNumber(output.ppToGenerate.m, 0));
    const sidePlotPressure = Math.max(0, toFiniteNumber(output.ppToGenerate.s, 0));

    if (mainPlotPressure + sidePlotPressure > 0) {
        parts.push(
            `- 伏笔压力：主线 ${mainPlotPressure}，支线 ${sidePlotPressure}。该压力只用于控制区域叙事密度，不要输出 generatedPlotPoints。`
        );
    }

    if (output.ppToSolve > 0 && params.activePlotPoints) {
        const unresolvedPlotPoints = params.activePlotPoints.filter(
            (plotPoint) => !plotPoint.isSolved
        );

        const expectedSolveCount = Math.min(
            Math.max(0, toFiniteNumber(output.ppToSolve, 0)),
            unresolvedPlotPoints.length
        );

        if (expectedSolveCount > 0) {
            parts.push(`- 本区域可解决伏笔数量: ${expectedSolveCount}`);
            parts.push(
                `- 解决方式：在相关 NodeTemplate、Item、NodeNpcTemplate、isDangerous、Interaction 或 Puzzle 模板根部添加 toSolvePP: "伏笔ID"。`
            );
            parts.push(`- 当前未解决伏笔:`);

            unresolvedPlotPoints.forEach((plotPoint) => {
                const typeLabel = plotPoint.type === 'M' ? '主线' : '支线';
                parts.push(`  - [${typeLabel}] ${plotPoint.id}: ${plotPoint.content}`);
                parts.push(`    - hint: ${plotPoint.hint}`);
            });
        }
    }

    return parts.join('\n');
}

function buildEpisodicGlobalContext(context: EpisodicGenerationContext): string {
    const tension = toFiniteNumber(context.params.tension ?? 500, 500);
    const nodeCount = Math.max(1, Math.floor(toFiniteNumber(context.params.nodeToGenerate ?? 8, 8)));

    return [
        '## 单元剧参数',
        `- 叙事张力: ${(tension / 10).toFixed(0)}%`,
        `- 节点数量: ${nodeCount}`,
        `- 单元剧区域应形成独立闭环，不承载长线叙事压力。`,
    ].join('\n');
}

//=============================================================================
// Prompt 构建
//=============================================================================

function buildSystemPrompt(context: ZoneGenerationContext): string {
    if (context.base.mode.id === 'chain') {
        return buildChainPrompt(context as ChainGenerationContext);
    }

    return buildEpisodicPrompt(context as EpisodicGenerationContext);
}

function buildChainPrompt(context: ChainGenerationContext): string {
    const baseContext = buildChainBaseContext(context);
    const narrativeContext = buildChainNarrativeContext(context);

    return `
# 角色
你是宇宙恐怖生存 RPG 的世界建筑师。
请根据上下文生成一个链式叙事区域模板。

${baseContext}

${narrativeContext}

${DESIGN_DIRECTIVES}

# Schema
请严格按以下 Schema 输出 ZoneTemplate：

${CHAIN_ZONE_GENERATION_SCHEMA}

${OUTPUT_DIRECTIVES}
`.trim();
}

function buildEpisodicPrompt(context: EpisodicGenerationContext): string {
    const baseContext = buildEpisodicBaseContext(context);
    const globalContext = buildEpisodicGlobalContext(context);

    return `
# 角色
你是宇宙恐怖生存 RPG 的世界建筑师。
请根据上下文生成一个单元剧区域模板。

${baseContext}

${globalContext}

${DESIGN_DIRECTIVES}

# Schema
请严格按以下 Schema 输出 ZoneTemplate：

${EPISODIC_ZONE_GENERATION_SCHEMA}

${OUTPUT_DIRECTIVES}
`.trim();
}

//=============================================================================
// 对外导出
//=============================================================================

/**
 * 获取最终区域生成 Prompt。
 */
export function getZonePrompt(context: ZoneGenerationContext): string {
    return buildSystemPrompt(context);
}

/**
 * 执行区域生成。
 *
 * 注意：
 * - capability 使用 type.ts 中合法的 ModelCategory: 'world'
 * - LLM 返回区域模板，不返回运行时 Zone
 */
export async function generateZone(
    settings: Settings,
    context: ZoneGenerationContext,
    onStatusUpdate?: (status: string) => void
): Promise<AIResponse> {
    BaseProvider.logInfo('WorldGeneration', '开始执行区域生成');

    onStatusUpdate?.('正在准备世界生成上下文...');

    BaseProvider.validateRequiredParams(
        { settings, context },
        ['settings', 'context'],
        'Zone Generation'
    );

    if (!settings.zoneModel) {
        throw new Error('zoneModel 核心参数在 Settings 中未映射或为空');
    }

    const systemPrompt = buildSystemPrompt(context);

    BaseProvider.logInfo(
        'WorldGeneration',
        `系统提示词构建完成，最终字符长度: ${systemPrompt.length}`
    );

    const { provider: providerId, model: modelName } = settings.zoneModel;

    onStatusUpdate?.(`正在发起网络联络：${providerId}:${modelName}...`);

    const startTime = Date.now();

    try {
        const result = (await callAi(settings, {
            providerId,
            model: modelName,
            capability: 'zone',
            systemPrompt,
            userPrompt: '生成区域模板 JSON。',
            jsonMode: true,
        })) as AIResponse;

        const elapsed = Date.now() - startTime;

        BaseProvider.logInfo('WorldGeneration', `大模型响应成功，IO 耗时: ${elapsed}ms`);

        onStatusUpdate?.(`世界结构生成就绪 (${(elapsed / 1000).toFixed(1)}s)`);

        return result;
    } catch (error: unknown) {
        const elapsed = Date.now() - startTime;

        BaseProvider.logError('WorldGeneration', error, {
            elapsedMs: elapsed,
            model: settings.zoneModel,
            contextMode: context.base.mode.id,
        });

        onStatusUpdate?.('世界生成受阻：网络 IO 故障或大模型响应拒收');

        throw error;
    }
}