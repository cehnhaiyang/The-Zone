/**
 * AI 世界生成服务 (AI World Generation Service)
 * 负责根据叙事上下文动态生成游戏区域 (Zone) 的完整结构，
 * 包括节点拓扑、交互、物品、敌人以及伏笔系统。
 */

import type { Settings, ZoneGenerationContext, ChainGenerationContext, EpisodicGenerationContext } from '../../meta';
import { BaseProvider, AIResponse } from './providers/base';
import { callAi } from './providers';
import {
    META_SCHEMA,
    CHAIN_ZONE_SCHEMA,
    EPISODIC_ZONE_SCHEMA,
    CHAIN_NODE_SCHEMA,
    EPISODIC_NODE_SCHEMA,
    ITEM_SCHEMA,
    INTERACTION_SCHEMA,
    PUZZLE_SCHEMA,
    CARD_SCHEMA,
    NODE_NPC_SCHEMA,
    ENEMY_SCHEMA
} from '../../constants/schema';

/** 世界生成核心指令集 */
const WORLD_CONFIG = {
    spatial: {
        title: '空间设计原则',
        items: [
            '节点存在需有合理功能逻辑（如急诊室→分诊台→候诊室）。',
            '混合结构：主走廊(线性) + 侧翼(中心辐射) + 房间(网状)。',
            '空间叙事：布局即故事（封锁走廊=最后抵抗，枢纽房间=活动中心）。',
            '导航多样：至少1个枢纽节点(3+连接)和1个隐藏节点。',
            '垂直思维：适当使用高度变化（地下室、竖井、楼层）。',
            '环境异化：必须在 initial 中定义 dilationFactor（时间流速异常系数），正常为1.0。',
        ],
    },
    hierarchy: {
        title: '层次结构要求',
        items: [
            '禁止扁平列表，必须使用 childrenIds 创建垂直复杂性。',
            '嵌套逻辑示例：实验室通过 childrenIds 包含化学储藏室、测试舱。',
            '自动链接：引擎自动处理父↔子、兄弟↔兄弟连接。',
            '连通性：有子节点=枢纽，无子节点=叶子节点必须有 exit。父子与叶子比例约 3:2。',
        ],
    },
    quality: {
        title: '质量控制',
        items: [
            '一致性：所有元素契合区域主题和世界观。',
            '节奏控制：危险与安全区域交替，避免连续高压，合理分配 threatLevel。',
            '沉浸感：每节点至少3句感官描写，营造氛围。',
            '平衡性：物品分布合理，难度曲线平滑。',
        ],
    },
    interaction: {
        title: '交互机制',
        items: [
            '严谨交互：必须定义明确的 requirements（time、items、staff 或 puzzleSolved 依赖）。',
            '结果映射：results 必须结构化，包含 narrative，以及可选的 unlock 和 stateChange（内部可嵌套 hp、sanity、lose、gain 或 spawnEnemy）。',
            '解锁动作：unlock 必须是二维数组格式 [["节点ID", "解锁动作描述"]]，用于解锁特定的阻挡节点。',
            '听觉反馈：在 results 中合理配置 soundEffect 枚举（参考 type.ts 中的 SfxType）。',
        ],
    },
    entity: {
        title: '实体与环境',
        items: [
            '遇敌机制：严格使用 enemySpawnCondition（on_enter, on_search, on_interact, on_sanity_critical）。',
            '物资隐匿：关键或高阶物品必须配置 discoveryThreshold，强制玩家付出搜查成本。可配置 quantity 字段定义数量。',
        ],
    },
} as const;

/** 构建指令块结构 */
function buildInstructionBlocks(): Record<keyof typeof WORLD_CONFIG, string> {
    const blocks: Partial<Record<keyof typeof WORLD_CONFIG, string>> = {};
    for (const [key, section] of Object.entries(WORLD_CONFIG)) {
        blocks[key as keyof typeof WORLD_CONFIG] = `### ${section.title}\n${section.items.map(item => `- ${item}`).join('\n')}`;
    }
    return blocks as Record<keyof typeof WORLD_CONFIG, string>;
}
const INSTRUCTION_BLOCKS = buildInstructionBlocks();

/** 动态构建【链式叙事】的 Schema 指令 */
function buildChainSchemaInstruction(): string {
    return `
为了确保输出结构正确，请严格参考以下结构定义进行生成：

【基础类型与枚举】
${META_SCHEMA}

【链式叙事 - 区域(Zone)结构定义】
${CHAIN_ZONE_SCHEMA}

【链式叙事 - 节点(Node)结构定义】
${CHAIN_NODE_SCHEMA}

【各实体模板结构定义】
- 物品模板：
${ITEM_SCHEMA}
- 交互模板：
${INTERACTION_SCHEMA}
- 谜题模板：
${PUZZLE_SCHEMA}
- 卡牌模板：
${CARD_SCHEMA}
- 节点NPC模板：
${NODE_NPC_SCHEMA}
- 敌人模板：
${ENEMY_SCHEMA}
`;
}

/** 动态构建【单元剧】的 Schema 指令 */
function buildEpisodicSchemaInstruction(): string {
    return `
为了确保输出结构正确，请严格参考以下结构定义进行生成：

【基础类型与枚举】
${META_SCHEMA}

【单元剧 - 区域(Zone)结构定义】
${EPISODIC_ZONE_SCHEMA}

【单元剧 - 节点(Node)结构定义】
${EPISODIC_NODE_SCHEMA}

【各实体模板结构定义】
- 物品模板：
${ITEM_SCHEMA}
- 交互模板：
${INTERACTION_SCHEMA}
- 谜题模板：
${PUZZLE_SCHEMA}
- 卡牌模板：
${CARD_SCHEMA}
- 节点NPC模板：
${NODE_NPC_SCHEMA}
- 敌人模板：
${ENEMY_SCHEMA}
`;
}

/** JSON 输出强制约束 */
const JSON_OUTPUT_CONSTRAINTS = `
【输出格式 - 必须严格遵守】
1. 只输出一个合法的 JSON 对象，不要包含任何额外文本、注释或 Markdown 标记。
2. 响应必须以 { 开头，以 } 结尾。
3. 所有字符串使用双引号，禁止尾随逗号。
4. 字段名必须与提供的 schema 完全一致，禁止使用中文键名。
5. nodes 对象的键名必须为小写蛇形命名 (snake_case)，长度不超过30字符。
6. 所有枚举字段只能从 type.ts 中定义的枚举值选取，禁止生造。
7. 确保 exits 数组中的 targetId 必须存在于 nodes 的键名中。
`;

/** 核心约束列表 */
const CORE_CONSTRAINTS = [
    '连通性法则：禁止"孤岛"节点，所有叶子节点必须拥有合理的出口。',
    '空间层次感：鼓励使用 childrenIds 构建树状的地图结构。',
    '严格枚举限制：所有带可选项的字段必须从 type.ts 中定义的枚举值选取。',
    '叙事一致性：场景中生成的物品、NPC 和交互必须高度契合区域主题。',
    '数据一致：所有引用 ID 在上下文中存在。',
    'ID 规范：snake_case，英文，最大30字符。',
    '结构完整：确保 Interaction 和 Item 实例的字段结构服从 interface.ts 定义。',
].join('\n');

/** 提取共通的上下文参数 */
function buildCommonBaseContext(context: ZoneGenerationContext): string[] {
    const parts: string[] = ['## 游戏状态'];
    const { mode, theme } = context.base;

    parts.push(`- 叙事模式: ${mode.id}`);
    if (mode.prompt) parts.push(`  - 约束: ${mode.prompt.trim()}`);

    parts.push(`- 区域主题: ${theme.id}`);
    if (theme.prompt) parts.push(`  - 氛围: ${theme.prompt.trim()}`);

    const activeQuests = context.extra.questAccepted?.filter(q => q.status === 'on') || [];
    if (activeQuests.length > 0) {
        parts.push(`- 活跃任务:\n${activeQuests.map(q => `  - ${q.desc}`).join('\n')}`);
    }

    return parts;
}

/** 针对长线链式叙事组装上下文 */
function buildChainBaseContext(context: ChainGenerationContext): string {
    const parts = buildCommonBaseContext(context);
    const { pacing, motif, mainAxis } = context.base;

    parts.push(`- 叙事节奏: ${pacing.id}`);
    if (pacing.prompt) parts.push(`  - 节奏控制: ${pacing.prompt.trim()}`);

    parts.push(`- 叙事主旨: ${motif.id}`);
    if (motif.prompt) parts.push(`  - 主旨内涵: ${motif.prompt.trim()}`);

    parts.push(`- 叙事主轴: ${mainAxis.id}`);
    if (mainAxis.prompt) parts.push(`  - 主线导向: ${mainAxis.prompt.trim()}`);

    // 穿透提取前置区域定义，匹配 Location 嵌套结构
    const prevZone = context.extra.prevLocation?.zone;
    if (prevZone?.name && prevZone?.id) {
        parts.push(`- 前置区域: ${prevZone.name} (ID: ${prevZone.id})`);
    } else {
        parts.push(`- 前置区域: 无`);
    }

    return parts.join('\n');
}

/** 针对单局单元剧叙事组装上下文 */
function buildEpisodicBaseContext(context: EpisodicGenerationContext): string {
    const parts = buildCommonBaseContext(context);

    if (context.extra.player) {
        // 深度穿透动态层获取绝对数值参数
        const { dynamic } = context.extra.player;
        const { vital } = context.extra.player.static.initialState;
        parts.push(`- 玩家状态: HP ${dynamic.hp}/${vital.maxHp}, 理智 ${dynamic.sanity}/${vital.maxSanity}`);
    }

    if (context.extra.companions && context.extra.companions.length > 0) {
        const comps = context.extra.companions
            .map(c => `${c.static.name} (信任: ${c.dynamic.trust})`)
            .join(', ');
        parts.push(`- 同伴状态: ${comps}`);
    }

    return parts.join('\n');
}

/** 提取底层叙事分析引擎的输出要求 */
function buildNarrativeContext(context: ChainGenerationContext): string {
    const analysis = context.params;
    const { params, output } = analysis;
    const parts: string[] = [
        '## 伏笔系统',
        '- main（主线伏笔）：玩家可见的核心故事线索，推动叙事进度。',
        '- side（支线伏笔）：独立的背景故事或局部事件。',
        '- 暗线：由多个支线伏笔编织而成的深层叙事结构，不是独立伏笔类型。',
        '',
        '## 当前叙事状态',
    ];

    parts.push(`- 叙事阶段: ${params.progress.marco}`);
    parts.push(`- 微观进度: ${(params.progress.micro / 10).toFixed(0)}%`);
    parts.push(`- 当前张力: ${(params.tension / 10).toFixed(0)}%`);
    parts.push(`- 需生成新伏笔：主线 ${output.ppToGenerate.m} 个，支线 ${output.ppToGenerate.s} 个`);
    parts.push(`- 需生成节点数量: ${output.nodeToGenerate} 个`);

    // 解构并拍平 PlotPointNet 结构，执行过滤逻辑检索尚未解决的残留伏笔
    if (output.ppToSolve > 0 && params.activePlotPoints) {
        const [mainPlots = [], sidePlots = []] = params.activePlotPoints;
        const unresolved = [...mainPlots, ...sidePlots].filter(p => !p.isSolved);

        if (unresolved.length > 0) {
            parts.push(`- 应解决伏笔数量: ${output.ppToSolve} 个，当前未解决伏笔：`);
            unresolved.forEach(p => parts.push(`  - [${p.type === 'main' ? '主线' : '支线'}] ${p.id}: ${p.content} `));
        }
    }

    if (params.shouldTriggerEnding) {
        parts.push('- 应触发结局：当前叙事链接近尾声，请安排高潮或结局事件。');
    }

    parts.push(
        '',
        '## 伏笔生成规则',
        '- 在返回结构的 `generatedPlotPoints` 数组中输出所有新生成的伏笔。',
        '- 每个伏笔必须包含: id, type (main 或 side), content, hint。',
        '- hint 是一段文本，暗示未来如何揭露此伏笔（如：获得某物、见到某人）。',
        '',
        '## 伏笔解决规则',
        '- 若应解决伏笔数量 > 0，必须在本区域内安排揭露。',
        '- 揭露机制：在对应的 Node、Item、Npc 或 Puzzle 对象的根部添加字段 `toSolvePP: "伏笔ID"`。',
        '- 不要生造数组，严格通过挂载 `toSolvePP` 关联伏笔解决。'
    );

    return parts.join('\n');
}

/** 提供硬编码单元剧指导基准 */
function buildEpisodicSuggestions(): string {
    return `
## 叙事结构建议
- ** 开场 **：设置悬念或冲突。
- ** 发展 **：逐步揭示真相或推进冲突。
- ** 高潮 **：在区域深处或关键节点安排高潮事件。
- ** 结局 **：提供明确的结局出口，让故事完整。
`;
}

/** 执行模式分发，合成最终 Prompt */
function buildSystemPrompt(context: ZoneGenerationContext): string {
    if (context.base.mode.id === 'chain') {
        return buildChainPrompt(context as ChainGenerationContext);
    }
    return buildEpisodicPrompt(context as EpisodicGenerationContext);
}

/** 装填链式叙事渲染参数 */
function buildChainPrompt(context: ChainGenerationContext): string {
    const contextInfo = buildChainBaseContext(context);
    const narrativeContext = buildNarrativeContext(context);
    const schemaInstruction = buildChainSchemaInstruction();

    return `
# 角色
你是宇宙恐怖生存 RPG 的世界建筑师，根据给定的叙事上下文生成完整的区域结构。

# 输入信息
${contextInfo}

${narrativeContext}

# 设计指令
${INSTRUCTION_BLOCKS.spatial}

${INSTRUCTION_BLOCKS.hierarchy}

${INSTRUCTION_BLOCKS.quality}

${INSTRUCTION_BLOCKS.interaction}

${INSTRUCTION_BLOCKS.entity}

# 输出 Schema
${schemaInstruction}

# 核心约束
${CORE_CONSTRAINTS}

${JSON_OUTPUT_CONSTRAINTS}
`.trim();
}

/** 装填单元剧叙事渲染参数 */
function buildEpisodicPrompt(context: EpisodicGenerationContext): string {
    const tensionPercent = ((context.params.tension ?? 500) / 10).toFixed(0);
    const nodeCount = context.params.nodeToGenerate ?? 8;

    const contextInfo = buildEpisodicBaseContext(context);
    const episodicSuggestions = buildEpisodicSuggestions();
    const schemaInstruction = buildEpisodicSchemaInstruction();

    return `
# 角色
你是宇宙恐怖生存 RPG 的世界建筑师，本次生成的是独立的短篇故事区域。

# 全局参数
- 叙事张力：${tensionPercent}%
- 节点数量：${nodeCount}

# 输入信息
${contextInfo}

${episodicSuggestions}

# 设计指令
${INSTRUCTION_BLOCKS.spatial}

${INSTRUCTION_BLOCKS.hierarchy}

${INSTRUCTION_BLOCKS.quality}

${INSTRUCTION_BLOCKS.interaction}

${INSTRUCTION_BLOCKS.entity}

# 输出 Schema
${schemaInstruction}

# 核心约束
${CORE_CONSTRAINTS}

${JSON_OUTPUT_CONSTRAINTS}
`.trim();
}

/** 供外部消费获取已构建的完整指令 */
export function getZonePrompt(context: ZoneGenerationContext): string {
    return buildSystemPrompt(context);
}

/**
 * 执行区域生成的外部调用点
 * 负责参数效验、大模型联络与状态流转回调
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
    BaseProvider.logInfo('WorldGeneration', `系统提示词构建完成，最终字符长度: ${systemPrompt.length}`);

    const { provider: providerId, model: modelName } = settings.zoneModel;
    onStatusUpdate?.(`正在发起网络联络：${providerId}:${modelName}...`);

    const startTime = Date.now();
    try {
        const result = await callAi(settings, {
            providerId: providerId,
            model: modelName,
            capability: 'zone',
            systemPrompt,
            userPrompt: '',
            jsonMode: true,
        }) as AIResponse;

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