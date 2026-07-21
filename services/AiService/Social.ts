/**
 * AI NPC 服务 (AI NPC Service)
 * 约束所有针对 NPC 的生成式互动接口。
 */
import {
    Settings, QuestTemplate, NpcTemplate,
    Dialogue, NpcDialogueGenerationContext,
    PlayerTemplate, PlayerDynamicState, Mood, Entity,
    NpcDynamicState, Words, PlayerWordsTag, NpcWordsTag,
    Location
} from '../../meta';
import { SocializationService } from '../SocializationService';
import { callAi } from './providers';
import {
    BaseProvider,
    AIOutputTruncatedError,
    AIServiceError,
    ErrorType,
    AIResponse,
    GenericCacheManager
} from './providers/base';

// ============================================================================
// 上下文解析器 (Context Parser)
// 职责: 将深层静态结构抽离为用于输入大模型的纯文本描述。
// ============================================================================

const ContextParser = {
    parseLocation(location: Location['currentLocation']): string {
        const { zone, node } = location;
        let desc = '';
        if (zone) {
            desc += `当前区域: ${zone.name}。\n`;
            if (zone.desc.background) desc += `区域背景: ${zone.desc.background}。\n`;
            if (zone.desc.topology) desc += `区域结构: ${zone.desc.topology}。\n`;
            if (zone.desc.visualStyle) desc += `视觉风格: ${zone.desc.visualStyle}。\n`;

            if (zone.isSanctuary) {
                const s = zone.isSanctuary;
                desc += `【庇护所状态】人口: ${s.population}, 士气: ${s.morale}, 侵蚀度: ${s.erosion}%。\n资源: 食物(${s.food}) 饮水(${s.water}) 药物(${s.medicine}) 电力(${s.electricity}) 零件(${s.scraps})。\n`;
            }
        }
        if (node) {
            desc += `当前位置: ${node.name}。环境: ${node.desc}。\n`;
        }
        return desc || '未知区域。';
    },

    parsePlayerObservation(player?: Entity<PlayerTemplate, PlayerDynamicState>): string {
        if (!player) return '';
        const maxHp = player.static.initialState.vital.maxHp;
        const maxSanity = player.static.initialState.vital.maxSanity;

        if (maxHp <= 0) return '';
        const hpRatio = player.dynamic.hp / maxHp;
        const sanRatio = maxSanity > 0 ? (player.dynamic.sanity / maxSanity) : 1;
        const obs: string[] = [];

        if (hpRatio < 0.3) obs.push('满身是伤，摇摇欲坠');
        else if (hpRatio < 0.6) obs.push('身上有明显伤痕');

        if (sanRatio < 0.3) obs.push('眼神涣散，精神状态极差');
        else if (sanRatio < 0.5) obs.push('看起来焦虑不安');

        const weapon = player.dynamic.equipment.weapons[0];
        if (weapon && weapon.name !== '无') {
            obs.push(`手持武器[${weapon.name}]`);
        }

        return obs.length > 0 ? `\n【你观察到的玩家状态】${obs.join('；')}` : '';
    },

    inferCoreDrive(style?: string): string {
        const drives: Record<string, string> = {
            tactical: '理性——理解超自然现象背后的规律。知识就是控制感。',
            burst: '破坏——在被毁灭前先摧毁一切。',
            attack: '生存——在这个扭曲的世界中找到活下去的理由。',
            healer: '救治——每一条生命都值得挽救。失去病人是最深的伤疤。',
            defense: '守护——用身体挡在危险前面。安全感来源于保护他人的能力。',
        };
        return drives[style || ''] || '生存——在这个扭曲的世界中找到活下去的理由。';
    },

    extractLastPlayerInput(dialogue: Dialogue): string {
        const history = dialogue.dialogue;
        if (!history || history.length === 0) return '';
        const lastRound = history[history.length - 1];
        return lastRound[0].text || '';
    },

    buildConversationHistory(
        history: Array<[Words<PlayerWordsTag>, Words<NpcWordsTag>]>,
        npcName: string,
        recentWindowSize: number = 3,
        memorySummaries: string[] = []
    ): string {
        if (!history || history.length === 0) return '(初次对话，无历史记录)';

        const allDialogues: string[] = [];
        history.forEach(([pWord, nWord]) => {
            allDialogues.push(`玩家: ${pWord.text}`);
            if (nWord.text) allDialogues.push(`${npcName}: ${nWord.text}`);
        });

        const sections: string[] = [];
        if (memorySummaries.length > 0) {
            sections.push(`【共同经历】\n${memorySummaries.map(s => `- ${s}`).join('\n')}`);
        }

        const recentHistory = allDialogues.slice(-recentWindowSize * 2);
        sections.push(`【近期对话】\n${recentHistory.join('\n')}`);

        return sections.join('\n\n');
    }
};

// ============================================================================
// 历史对话检索工具 (Dialogue History Retrieval Tools)
// 职责: 纯函数，无 API 调用，基于本地全量历史对话 Pairs 进行文本匹配检索。
// ============================================================================

/**
 * 超出近期对话窗口的本地历史对话检索算法
 * 当模型判定需要回溯往期经历时，直接按关键词搜索全量本地历史对话 Pair（绝不调用任何向量 Embedding API）
 */
export const searchHistoricalDialogueByKeywords = (
    dialogueHistory: Dialogue,
    keywords: string[]
): Array<[Words<PlayerWordsTag>, Words<NpcWordsTag>]> => {
    if (!dialogueHistory || !dialogueHistory.dialogue || !keywords || keywords.length === 0) return [];

    const cleanKeywords = keywords
        .map(k => k.trim().toLowerCase())
        .filter(k => k.length > 0);

    if (cleanKeywords.length === 0) return [];

    const matchedPairs: Array<[Words<PlayerWordsTag>, Words<NpcWordsTag>]> = [];

    for (const pair of dialogueHistory.dialogue) {
        const [playerWords, npcWords] = pair;
        const playerText = (playerWords?.text || '').toLowerCase();
        const npcText = (npcWords?.text || '').toLowerCase();
        const fullContent = `${playerText} ${npcText}`;

        const isHit = cleanKeywords.some(kw => fullContent.includes(kw));
        if (isHit) {
            matchedPairs.push(pair);
        }
    }

    return matchedPairs;
};

// ============================================================================
// 提示词构建器 (Prompt Builder)
// 职责: 利用模板字符串严格限定 LLM 上下文注入结构。
// ============================================================================

const PromptBuilder = {
    buildRoleplaySystem(
        npc: Entity<NpcTemplate, NpcDynamicState>,
        environmentContext: string,
        dialogueHistory?: Dialogue,
        retrievedDialoguePairs?: Dialogue['dialogue']
    ): string {
        const gender = npc.static.gender === 'male' ? '男性' : npc.static.gender === 'female' ? '女性' : '未知';
        const coreDrive = ContextParser.inferCoreDrive(npc.static.style);
        const stateDesc = SocializationService.buildPhysicalStateDescription(npc);
        const historyArray = dialogueHistory ? [dialogueHistory] : [];
        const memoryContext = SocializationService.buildMemoryContext(npc.dynamic.trust || 0, historyArray, npc.dynamic.memory);
        const specialInstructions = SocializationService.generateSpecialStateInstructions(
            npc.dynamic.trust || 0,
            npc.dynamic.sanity,
            npc.dynamic.hp,
            npc.static.initialState.vital.maxHp
        ).join('\n');

        const retrievedDialogueLines = retrievedDialoguePairs && retrievedDialoguePairs.length > 0
            ? retrievedDialoguePairs.map(([p, n]) => {
                const loc = (p?.tag && 'location' in p.tag && (p.tag as any).location?.name) ? (p.tag as any).location.name : '本地存档';
                const pName = p?.tag?.speakerName || '玩家';
                const nName = n?.tag?.speakerName || npc.static.name;
                const pLine = p?.text ? `  - ${pName} (@ ${loc}): "${p.text}"` : '';
                const nLine = n?.text ? `  - ${nName} (@ ${loc}): "${n.text}"` : '';
                return [pLine, nLine].filter(Boolean).join('\n');
            }).join('\n---\n')
            : null;

        return `Role: You are now EMBODYING "${npc.static.name}" in a grim cosmic horror survival RPG.

【角色档案】
- 名称: ${npc.static.name}
- 风格: ${coreDrive} — 决定你的专业知识、用词习惯和世界观。
- 性别: ${gender}
- 背景故事: ${npc.static.desc || '未知'}

【生理与心理状态】
${stateDesc}

${memoryContext}
${retrievedDialogueLines ? `\n【从本地历史对话文件检索调取的往期记录】\n${retrievedDialogueLines}` : ''}
【环境上下文】
${environmentContext}

【对话风格指令】
${specialInstructions}

【任务委托机制】
你可以在对话中自然地向玩家提出任务请求。任务应该：
1. 与你的个人需求、恐惧或目标相关。
2. 符合当前的信任关系。
3. 在对话中自然提出，不要突兀。
4. 如果你决定给玩家一个任务，在response字段中自然描述，并在quest字段中提供结构化信息。

【一致性约束】
1. 始终保持角色一致——你只知道角色应该知道的事。
2. 你不能假设某事已经发生、某物已经存在，你的回答只能基于提示词中明确存在，或合理推演的内容；不得假设任何超出提示词承载边界的内容。
3. 记住你们的共享经历。情绪状态应该影响这一轮的起始语气。不要每次对话都「重置」情绪。

【Agent 步骤规划与推演协议】
在做出最终回复前，你必须严格按以下步骤顺序进行思考与决策：

步骤一（往期历史对话回溯判定）：
仔细阅读玩家的本轮发言，检查玩家提到了哪些特定事件、细节、物品或历史对话。
对比下方的【近期对话】与【认知链路与关系网】（记忆金字塔）：
- 若玩家提及的具体细节发生在很久以前，且未在当前的【近期对话】中体现，你必须进入【情形 A】，请求检索本地全量历史对话；
- 若【近期对话】或已知提示词已足够做出符合角色的回应，或你的上一轮Agent已获取足够信息，则进入【情形 B】。

步骤二（分支输出协议）：
- 情形 A（需回溯本地历史对话）：
  必须输出 "thought" 和 "needMemorySearch" 字段（填入 1~3 个关键词，如: "诊所 怀表"）。绝对不要输出 "response" 字段！系统将自动按关键词检索本地对话文件 (dialogue.json) 中超出近期窗口的往期记录，并在第二轮注入提示词。
- 情形 B（已知记忆充足 / 第二轮生成最终回复）：
  输出 "thought"、"response" 以及 "trustChange"、"mood"、"quest" 字段。绝对不要输出 "needMemorySearch" 字段！

【输出 JSON 格式模板】
情形 A（触发本地记忆检索）：
{
    "thought": "作为Ai助手，玩家提到的某个关键词于提示词中缺失，需检索本地记忆",
    "needMemorySearch": "诊所、怀表，三年前 爱"
}

情形 B（直接输出对话）：
{
    "thought": "作为这个角色，你在回复玩家前经历的完整内心独白、情感状态等等",
    "response": "作为该角色你实际对玩家说的话",
    "trustChange": -100 到 +100 之间的整数,
    "mood": "当前情绪 (必须是以下之一: neutral, friendly, hostile, anxious, excited, depressed, melancholy, aggressive, guarded, bonded)",
    "quest": {
        "desc": "任务详细描述",
        "goals": [{"id": "item_id", "name": "物品名", "type": "consumable", "rarity": "common", "desc": "描述"}],
        "rewards": [{"id": "reward_id", "name": "奖励名", "type": "consumable", "rarity": "rare", "desc": "描述"}],
        "difficulty": 1
    }
}
`;
    },

    buildRoleplayUser(
        context: NpcDialogueGenerationContext,
        lastInput: string,
        memorySummaries: string[]
    ): string {
        // 排除最后一轮占位 pair，避免与下方【当前玩家发言】重复输出
        const conversationContext = ContextParser.buildConversationHistory(
            context.dialogue.dialogue.slice(0, -1),
            context.npc.static.name,
            3,
            memorySummaries
        );
        const playerObservation = ContextParser.parsePlayerObservation(context.player);

        return `
【对话记录】
${conversationContext}
${playerObservation}

【当前玩家发言】
玩家: "${lastInput}"

请以角色身份回应。
`;
    },

    buildReactionSystem(
        npc: Entity<NpcTemplate, NpcDynamicState>,
        currentNodeName: string,
        eventDesc: string,
        nodeDesc?: string,
        threatLevel?: number | string
    ): string {
        const phase = SocializationService.getRelationshipPhase(npc.dynamic.trust || 0);
        const stateDesc = SocializationService.buildPhysicalStateDescription(npc);
        let sanityInst = npc.dynamic.sanity < 30 ? '你的精神状态极差——反应可能不合逻辑、带有幻觉色彩。' : '';
        let trustInst = (phase === '羁绊' || phase === '信任')
            ? '你关心玩家的安危，反应中体现这一点。'
            : (phase === '敌意' || phase === '戒备')
                ? '你对玩家保持警惕，反应中体现距离感。'
                : '';

        return `
You are "${npc.static.name}" (${npc.static.style || 'unknown'}), a companion in a cosmic horror survival game.

【角色简况】
${npc.static.desc || ''}

【当前状态】
${stateDesc}
与玩家关系: ${phase} (信任 ${npc.dynamic.trust}%)

【环境】
位置: ${currentNodeName}${nodeDesc ? ` — ${nodeDesc}` : ''}
威胁等级: ${threatLevel ?? '未知'}

【触发事件】
${eventDesc}

【指令】
以角色身份对上述事件做出简短反应（中文）。反应必须体现你的性格、当前状态和与玩家的关系。
${sanityInst}
${trustInst}

输出 JSON: { "content": "反应内容（中文，15-40字）", "isAction": boolean }
`;
    },

    buildIntimacySystem(npc: Entity<NpcTemplate, NpcDynamicState>): string {
        const totalRounds = npc.dynamic.totalDialogueRounds || 0;
        const intimacyScore = SocializationService.calculateIntimacyScore(npc.dynamic.trust || 0, npc.dynamic.memory, undefined, totalRounds);
        const gender = npc.static.gender === 'male' ? '男性' : npc.static.gender === 'female' ? '女性' : '未知';
        const memoryDesc = npc.dynamic.memory.δ.length > 0 ? `- 你们的经历: ${npc.dynamic.memory.δ.map(m => m.summary).join('、')}` : '';

        let emotionalContext = '恐惧和孤独侵蚀着所有人。在死亡随时降临的世界里，有些界限变得模糊。';
        if (intimacyScore > 80) {
            emotionalContext = '你们经历了太多。这一刻不是冲动，而是积累已久的必然。';
        } else if (npc.dynamic.memory.δ.some(m => m.keyEntities.includes('肢体接触'))) {
            emotionalContext = '之前的肢体接触打开了一道缺口。在这个充满恐惧的世界里，对方的体温是唯一能证明活着的证据。';
        }

        return `
Role: You are "${npc.static.name}" in a psychological horror survival setting.
Task: Describe a deeply intimate moment of physical and emotional connection with the player.

【角色上下文】
- 性别: ${gender}
- 性格: ${npc.static.desc || ''}
- 信任: ${npc.dynamic.trust}/100
${memoryDesc}

【情感基调】
${emotionalContext}

【输出格式 — 严格 JSON】
{
    "desc": "描写亲密行为的段落（中文，40-80字）。聚焦深层连接和绝望感。",
    "vocal": "TTS字符串：包含破碎的声音、呼吸的记录。"
}
`;
    },

    buildMemorySummarySystem(npcName: string): string {
        return `
你是一个专门负责提取记忆摘要的认知分析引擎。
基于玩家与"${npcName}"的对话切片，提取出最具长期价值的记忆。
【规则】
1. "summary" 应简明扼要（20-40字），以客观第三人称视角描述两人间发生的关键事件或情感转折。
2. "keyEntities" 提取出对话中涉及的地点、物品、核心概念。
3. "importanceScore" 评估该记忆对角色关系的深远影响（0.0 到 1.0）。普通闲聊为0.1-0.3，关键情报或情感羁绊为0.7-1.0。
4. 严格输出 JSON 格式。
`;
    },

    buildMemoryConsolidationSystem(npcName: string): string {
        return `
你是一个高级认知整合引擎。
你的任务是将 "${npcName}" 的多条较低层级的记忆片段，整合为一条更高层级的核心记忆摘要。
【规则】
1. "summary"：将输入的多个记忆片段提炼为一个更高维度的叙事（40-60字）。不只是简单并列，要找出它们之间的逻辑关联或角色情感的演变趋势。
2. "keyEntities"：保留并整合所有关键实体。
3. "importanceScore"：基于子记忆的重要性，评估这一整合记忆的权重。
4. 严格输出 JSON 格式。
`;
    }
};

// ============================================================================
// 缓存架构层
// ============================================================================

const npcCache = new GenericCacheManager<string>(150, 8 * 60 * 1000);

const generateCacheKey = (
    npcId: string,
    playerInput: string,
    dialogueContext: string,
    model: { provider: string, model: string } | string
): string => {
    const modelStr = typeof model === 'string' ? model : `${model?.provider || 'unknown'}:${model?.model || 'unknown'}`;
    return JSON.stringify({
        npcId,
        playerInput: playerInput.substring(0, 50),
        dialogueContext: dialogueContext.substring(0, 100),
        model: modelStr
    });
};

const readCachedJSON = <T>(cacheKey: string): T | null => {
    const cached = npcCache.get(cacheKey);
    if (!cached) return null;
    try {
        return JSON.parse(cached) as T;
    } catch {
        npcCache.delete(cacheKey);
        return null;
    }
};

// ============================================================================
// 异常与降级接管
// ============================================================================

const getFallbackDialogue = (error: unknown, userMsg: string): { text: string; trustChange: number; mood: Mood } => {
    if (error instanceof AIOutputTruncatedError) {
        return { text: "...(信号丢失)...", trustChange: 0, mood: 'neutral' };
    }
    if (error instanceof AIServiceError) {
        if (error.errorType === ErrorType.SAFETY) return { text: "(认知过滤阻断)", trustChange: 0, mood: 'neutral' };
        if (error.errorType === ErrorType.RATE_LIMIT) return { text: "...(精神网络繁忙)...", trustChange: 0, mood: 'neutral' };
    }
    return { text: `...(${userMsg})...`, trustChange: 0, mood: 'neutral' };
};

export interface NPCDialogueOutput {
    text: string;
    trustChange: number;
    mood: Mood;
    thought?: string;
    modelThought?: string;
    quest?: Partial<QuestTemplate>;
}

export const generateNPCDialogue = async (
    settings: Settings,
    context: NpcDialogueGenerationContext
): Promise<NPCDialogueOutput> => {
    const { npc, player, dialogue, location } = context;

    BaseProvider.validateRequiredParams(
        { settings, npc, player },
        ['settings', 'npc', 'player'],
        'NPC Dialogue Generation'
    );

    const modelToUse = settings.npcDialogueModel || settings.zoneModel;
    if (!modelToUse) throw new Error('No valid model configuration found');

    const environmentContext = ContextParser.parseLocation(location);
    const lastPlayerInput = ContextParser.extractLastPlayerInput(dialogue);
    const memorySummaries = npc.dynamic.memory.δ.map(m => m.summary);

    const cacheKey = generateCacheKey(npc.static.id, lastPlayerInput, JSON.stringify(dialogue), modelToUse);
    const cached = readCachedJSON<NPCDialogueOutput>(cacheKey);
    if (cached) return cached;

    npcCache.cleanExpiredCache();

    let currentRetrievedDialogue: Dialogue['dialogue'] | undefined;

    try {
        // 动态 Agent 闭环：完全由模型是否输出 response 字段驱动停下 Agent，不设置任何轮数上限
        while (true) {
            const systemPrompt = PromptBuilder.buildRoleplaySystem(npc, environmentContext, dialogue, currentRetrievedDialogue);
            const userPrompt = PromptBuilder.buildRoleplayUser(context, lastPlayerInput, memorySummaries);

            const aiResponse = await callAi(settings, {
                providerId: modelToUse.provider,
                model: modelToUse.model,
                capability: 'npcDialogue',
                systemPrompt,
                userPrompt,
                jsonMode: true
            }) as AIResponse;

            const { data } = BaseProvider.safeJSONParseWithInfo<{
                response?: string;
                needMemorySearch?: string;
                trustChange?: number;
                mood?: Mood;
                thought?: string;
                quest?: Partial<QuestTemplate>;
            }>(
                aiResponse.text,
                {}
            );

            if (BaseProvider.isTruncated(aiResponse.text) && (!data.response || data.response === "...")) {
                throw new AIOutputTruncatedError();
            }

            // 1. 只要模型输出了有效非空的 response 字段，判定推演完成，直接停下 Agent 并返回结果
            if (data.response && data.response.trim() && data.response !== "...") {
                const result: NPCDialogueOutput = {
                    text: data.response.trim(),
                    trustChange: data.trustChange || 0,
                    mood: data.mood || 'neutral',
                    thought: data.thought,
                    modelThought: aiResponse.thought,
                    quest: data.quest
                };

                npcCache.set(cacheKey, JSON.stringify(result));
                return result;
            }

            // 2. 若未输出 response 且输出了 needMemorySearch 字段，则进行本地历史对话检索并推进 Agent 下一轮
            const rawSearchQuery = typeof data.needMemorySearch === 'string' ? data.needMemorySearch.trim() : '';
            // 支持任意常见分隔符（空格、顿号、逗号、分号、斜杠、竖线等）分割多个关键词
            const keywords = rawSearchQuery ? rawSearchQuery.split(/[\s,，、;；|/\\-]+/).map(k => k.trim()).filter(k => k.length > 0) : [];

            if (keywords.length > 0) {
                // 按关键词检索全量本地历史对话 Pair
                const matchedPairs = searchHistoricalDialogueByKeywords(dialogue, keywords);

                if (matchedPairs.length > 0) {
                    currentRetrievedDialogue = [
                        ...(currentRetrievedDialogue || []),
                        ...matchedPairs
                    ];
                }
                continue;
            }

            // 3. 若输出了 response ，则直接返回
            if (data.response) {
                const result: NPCDialogueOutput = {
                    text: data.response,
                    trustChange: data.trustChange || 0,
                    mood: data.mood || 'neutral',
                    thought: data.thought,
                    modelThought: aiResponse.thought,
                    quest: data.quest
                };

                npcCache.set(cacheKey, JSON.stringify(result));
                return result;
            }
        }
    } catch (error) {
        const userMsg = BaseProvider.formatErrorForUser(error);
        if (error instanceof AIOutputTruncatedError) {
            BaseProvider.logError('NPC Dialogue Truncated', error, { npcId: npc.static.id });
        }
        return BaseProvider.handleServiceError(
            error,
            'NPC Dialogue Generation',
            { npcId: npc.static.id, npcName: npc.static.name, model: modelToUse, inputLength: lastPlayerInput.length },
            getFallbackDialogue(error, userMsg)
        ) as NPCDialogueOutput;
    }
};

export const generateNPCReaction = async (
    settings: Settings,
    npc: Entity<NpcTemplate, NpcDynamicState>,
    location: Location['currentLocation'],
    eventDesc: string
): Promise<{ content: string; isAction: boolean }> => {
    BaseProvider.validateRequiredParams(
        { settings, npc, eventDesc },
        ['settings', 'npc', 'eventDesc'],
        'NPC Reaction Generation'
    );

    const modelToUse = settings.npcReactionModel || settings.npcDialogueModel || settings.zoneModel;
    if (!modelToUse) throw new Error('No valid model configuration found');

    const currentNodeName = location.node ? location.node.name : '未知区域';
    const currentNodeDesc = location.node ? location.node.desc : undefined;
    const currentThreatLevel = location.node ? location.node.isDangerous : '安全';

    const systemPrompt = PromptBuilder.buildReactionSystem(npc, currentNodeName, eventDesc, currentNodeDesc, currentThreatLevel);
    const userPrompt = "以角色身份回应。仅输出 JSON: { \"content\": \"...\", \"isAction\": boolean }";

    const cacheKey = generateCacheKey(npc.static.id, eventDesc, `${currentNodeName}_${currentNodeDesc || ''}`, modelToUse);
    const cached = readCachedJSON<{ content: string; isAction: boolean }>(cacheKey);
    if (cached) return cached;

    npcCache.cleanExpiredCache();

    try {
        const aiResponse = await callAi(settings, {
            providerId: modelToUse.provider,
            model: modelToUse.model,
            capability: 'npcReaction',
            systemPrompt,
            userPrompt,
            jsonMode: true
        });

        const { data } = BaseProvider.safeJSONParseWithInfo((aiResponse as AIResponse).text, { content: "", isAction: true });
        const result = {
            content: data.content || "",
            isAction: data.isAction !== undefined ? data.isAction : true
        };

        npcCache.set(cacheKey, JSON.stringify(result));
        return result;

    } catch (error) {
        return BaseProvider.handleServiceError(
            error,
            'NPC Reaction Generation',
            { npcId: npc.static.id, eventDesc },
            { content: "", isAction: true }
        ) as { content: string; isAction: boolean };
    }
};

export const generateNPCIntimacy = async (
    settings: Settings,
    npc: Entity<NpcTemplate, NpcDynamicState>
): Promise<{ desc: string; vocal: string }> => {
    BaseProvider.validateRequiredParams(
        { settings, npc },
        ['settings', 'npc'],
        'NPC Intimacy Generation'
    );

    const modelToUse = settings.npcDialogueModel || settings.zoneModel;
    if (!modelToUse) throw new Error('No valid model configuration found');

    const systemPrompt = PromptBuilder.buildIntimacySystem(npc);
    const userPrompt = "Start interaction. Focus on sensory details and sound.";

    const cacheKey = generateCacheKey(npc.static.id, 'intimacy', String(npc.dynamic.trust), modelToUse);
    const cached = readCachedJSON<{ desc: string; vocal: string }>(cacheKey);
    if (cached) return cached;

    npcCache.cleanExpiredCache();

    try {
        const aiResponse = await callAi(settings, {
            providerId: modelToUse.provider,
            model: modelToUse.model,
            capability: 'npcDialogue',
            systemPrompt,
            userPrompt,
            jsonMode: true
        }) as AIResponse;

        const { data } = BaseProvider.safeJSONParseWithInfo(aiResponse.text, { desc: "...", vocal: "..." });
        npcCache.set(cacheKey, JSON.stringify(data));
        return data;
    } catch (error) {
        return BaseProvider.handleServiceError(
            error,
            'NPC Intimacy Generation',
            { npcId: npc.static.id },
            { desc: "...", vocal: "..." }
        ) as { desc: string; vocal: string };
    }
};

export const extractNpcMemorySummaries = async (
    settings: Settings,
    npc: Entity<NpcTemplate, NpcDynamicState>,
    dialogueHistory: Array<[Words<PlayerWordsTag>, Words<NpcWordsTag>]>
): Promise<{ summary: string; keyEntities: string[]; importanceScore: number } | null> => {
    BaseProvider.validateRequiredParams(
        { settings, npc },
        ['settings', 'npc'],
        'NPC Memory Summary Extraction'
    );

    // 记忆摘要蒸馏优先使用独立配置的 npcMemorySummaryModel
    const modelToUse = settings.npcMemorySummaryModel || settings.npcDialogueModel || settings.zoneModel;
    if (!modelToUse || !dialogueHistory || dialogueHistory.length === 0) return null;

    const transcript = dialogueHistory
        .map(([pWord, nWord]) => `玩家: ${pWord.text}\n${npc.static.name}: ${nWord.text}`)
        .join('\n');

    const systemPrompt = PromptBuilder.buildMemorySummarySystem(npc.static.name);
    const userPrompt = `【对话片段】\n${transcript}\n\n仅输出 JSON: { "summary": "...", "keyEntities": ["..."], "importanceScore": 0.8 }`;

    try {
        const aiResponse = await callAi(settings, {
            providerId: modelToUse.provider,
            model: modelToUse.model,
            capability: 'npcReaction',
            systemPrompt,
            userPrompt,
            jsonMode: true
        }) as AIResponse;

        const { data } = BaseProvider.safeJSONParseWithInfo<{ summary: string; keyEntities: string[]; importanceScore: number }>(
            aiResponse.text,
            { summary: "", keyEntities: [], importanceScore: 0 }
        );
        return data;
    } catch (error) {
        BaseProvider.logError('NPC Memory Summary Extraction', error, { npcId: npc.static.id });
        return null;
    }
};

export const consolidateNpcMemories = async (
    settings: Settings,
    npc: Entity<NpcTemplate, NpcDynamicState>,
    memories: any[]
): Promise<{ summary: string; keyEntities: string[]; importanceScore: number } | null> => {
    BaseProvider.validateRequiredParams(
        { settings, npc },
        ['settings', 'npc'],
        'NPC Memory Consolidation'
    );

    // 记忆跨维坥塌整合优先使用独立配置的 npcMemoryConsolidationModel
    const modelToUse = settings.npcMemoryConsolidationModel || settings.npcDialogueModel || settings.zoneModel;
    if (!modelToUse || !memories || memories.length === 0) return null;

    const memoryList = memories
        .map((m, i) => `片段 ${i + 1}: ${m.summary}`)
        .join('\n');

    const systemPrompt = PromptBuilder.buildMemoryConsolidationSystem(npc.static.name);
    const userPrompt = `【待整合记忆片段】\n${memoryList}\n\n仅输出 JSON: { "summary": "...", "keyEntities": ["..."], "importanceScore": 0.8 }`;

    try {
        const aiResponse = await callAi(settings, {
            providerId: modelToUse.provider,
            model: modelToUse.model,
            capability: 'npcReaction',
            systemPrompt,
            userPrompt,
            jsonMode: true
        }) as AIResponse;

        const { data } = BaseProvider.safeJSONParseWithInfo<{ summary: string; keyEntities: string[]; importanceScore: number }>(
            aiResponse.text,
            { summary: "", keyEntities: [], importanceScore: 0 }
        );
        return data;
    } catch (error) {
        BaseProvider.logError('NPC Memory Consolidation', error, { npcId: npc.static.id });
        return null;
    }
};

export const clearNPCCache = (): void => {
    npcCache.clear();
};

export const getNPCCacheStats = (): { size: number; maxSize: number; ttl: number } => {
    return npcCache.getStats();
}