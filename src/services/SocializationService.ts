/**
 * @file SocializationService.ts
 * @desc 社交领域服务：关系轴阶段（信任 / 好感）、阶段化指令、记忆金字塔生命周期。
 *
 * 契约（见 meta/interface.ts / meta/type.ts）：
 * - 节点 NPC 的关系轴是 {@link NodeNpcDynamicState.trust}（信任，0-100 整数，社会性 / 契约性标值）；
 * - 同伴的关系轴是 {@link CompanionDynamicState.affinity}（好感，≤100 整数，情绪性 / 偏好性标值）；
 * - 两条轴各自维护阶段表 {@link Trust} / {@link Affinity}（phase / behavior / range）；
 * - 好感可为负值，负值越大，同伴在 absoluteTick 上离队的概率越高。
 *
 * 设计原则：
 * - 不直接依赖 AiService，避免循环依赖；所有需要 LLM 的能力通过依赖注入端口传入。
 * - 阶段判定只由本文件的两张阶段表驱动，UI、Hook 与 Prompt 一律消费同一份结果。
 * - 尽量返回不可变结果，便于 React 状态更新。
 */
import type {
    Affinity,
    AffinityPhase,
    Dialogue,
    InteractionNpcDynamic,
    InteractionNpcEntity,
    ItemGrade,
    MemoryPyramid,
    MemorySummaries,
    MemorySummaries_α,
    MemorySummaries_β,
    MemorySummaries_γ,
    MemorySummaries_δ,
    NodeNpcDynamicState,
    NpcDynamicState,
    RelationAxis,
    _Relationship,
    Settings,
    Trust,
    TrustPhase,
    Words,
    PlayerWordsTag,
    NpcWordsTag,
    ZoneDate,
    _Array
} from '../meta';
import {
    getRelationAxis,
    getRelationScore,
    safeNumber,
    withRelationScore
} from '../meta';

interface MemorySummaryDraft {
    summary: string;
    keyEntities: string[];
    importanceScore: number;
}

type MemorySummaryExtractor = (
    settings: Settings,
    npc: InteractionNpcEntity,
    dialogueHistory: Array<[Words<PlayerWordsTag>, Words<NpcWordsTag>]>
) => Promise<MemorySummaryDraft | null>;

export type MemoryConsolidator = (
    settings: Settings,
    npc: InteractionNpcEntity,
    memories: MemorySummaries[]
) => Promise<MemorySummaryDraft | null>;

export interface SummarizeDialogueSliceParams {
    settings: Settings;
    npc: InteractionNpcEntity;
    dialogueHistory: Array<[Words<PlayerWordsTag>, Words<NpcWordsTag>]>;
    startIndex: number;
    endIndex: number;
    currentTime: ZoneDate;
    extractor: MemorySummaryExtractor;
}

export interface EvolveMemoryParams {
    settings: Settings;
    npc: InteractionNpcEntity;
    currentTime: ZoneDate;
    consolidator: MemoryConsolidator;
}

export interface SpecialStateInstructionParams {
    settings?: Settings;
    /** 对话目标动态状态（节点 NPC 走信任轴，同伴走好感轴）。 */
    dynamic: InteractionNpcDynamic;
    sanity: number;
    hp: number;
    maxHp: number;
}

export interface IntimacyScoreParams {
    /** 当前关系读数（信任 / 好感）。 */
    score: number;
    memory: MemoryPyramid;
    sharedExperiences?: number;
    dialogueTurns?: number;
}

/**
 * 关系快照。
 *
 * 社交层唯一的关系读数出口：轴、读数、阶段、行为基准线一次取齐，
 * UI 展示与 Prompt 组装不再各自判定阶段。
 */
export interface RelationProfile {
    axis: RelationAxis;
    /** 关系轴展示名：信任 / 好感。 */
    label: string;
    score: number;
    phase: TrustPhase | AffinityPhase;
    /** 该阶段的行为基准线，可直接写入 Prompt。 */
    behavior: string;
    range: _Relationship['range'];
}

/**
 * 关系写回结果。
 *
 * `delta` 为实际生效的增量：越过轴边界时会被夹取，
 * 调用方据此写日志，避免出现「提示 +5，实际只涨了 2」的错位。
 */
export interface RelationUpdate {
    dynamic: InteractionNpcDynamic;
    axis: RelationAxis;
    label: string;
    previous: number;
    score: number;
    delta: number;
    phase: TrustPhase | AffinityPhase;
}

// ==========================================================================
// 阶段表
// ==========================================================================

const MEMORY_COLLAPSE_THRESHOLD = 5;
const IMPORTANCE_ELASTICITY = 0.015;

/** 关系读数默认边界：信任 [0, 100]，好感 [-100, 100]（由 Settings 覆盖上限）。 */
const DEFAULT_RELATION_MAX = 100;

/**
 * 同伴离队概率：好感为负时每 absoluteTick 的基础概率，以及随负值放大的幅度。
 *
 * 缩放口径：好感 -10 ≈ 2% / tick，-50 ≈ 6% / tick，-100 ≈ 11% / tick。
 */
const AFFINITY_LEAVE_BASE_CHANCE = 0.01;
const AFFINITY_LEAVE_CHANCE_RANGE = 0.1;

/** 零重要性摘要的清理宽限期（区域主观天数）。 */
const MEMORY_PRUNE_GRACE_DAYS = 7;

/** ZoneDate 刻度换算：tick 0-29 / cycle 0-11。 */
const TICKS_PER_CYCLE = 30;
const CYCLES_PER_DAY = 12;

/**
 * 信任阶段表（节点 NPC）。
 *
 * range 边界与 `Settings.gameConfig.social.thresholds` 对齐：
 * trustVeryLow(20) / trustLow(30) / trustMedium(40) / trustHigh(60)。
 */
export const TRUST_PHASES: Trust[] = [
    {
        phase: '猜忌',
        behavior:
            '极度排斥。仅用单音词或冷笑回应，拒绝分享任何生存情报，言语中随时准备寻找背叛的时机。',
        range: { min: 0, max: 19 }
    },
    {
        phase: '防备',
        behavior:
            '充满猜忌。用防御性的反问评估玩家的动机，不会主动提供物资，措辞里混入对玩家的恶意揣测。',
        range: { min: 20, max: 29 }
    },
    {
        phase: '审慎',
        behavior:
            '例行公事。礼貌但极其疏离，回答问题如读说明书；在致命威胁面前，会毫不犹豫地抛下对方。',
        range: { min: 30, max: 39 }
    },
    {
        phase: '浅合',
        behavior:
            '点头之交。偶尔分享一个苦涩的玩笑，开始透露过去的碎片，在安全的前提下愿意提供微小的协助。',
        range: { min: 40, max: 59 }
    },
    {
        phase: '长盟',
        behavior:
            '并肩作战。坦诚地描述自己的恐惧，主动关注玩家的状态，愿意交付重要的战术情报，并在关键时刻替玩家承担风险。',
        range: { min: 60, max: 100 }
    }
];

/**
 * 好感阶段表（同伴）。
 *
 * 好感可为负值：进入「离心」后，同伴每个 absoluteTick 都有概率离队。
 */
export const AFFINITY_PHASES: Affinity[] = [
    {
        phase: '离心',
        behavior:
            '背离与厌弃。拒绝与玩家同行，回应冷硬而简短，随时准备脱离小队；任何示好都会被当作算计。',
        range: { min: -100, max: -1 }
    },
    {
        phase: '芥蒂',
        behavior:
            '保留与疏离。按约定维持协作，但不主动示好，语气克制并带着未消的保留，回避私人话题。',
        range: { min: 0, max: 19 }
    },
    {
        phase: '相敬',
        behavior:
            '相敬如宾。维持清晰的边界感，尊重玩家的判断并愿意配合，但不涉私情，对亲昵举动保持礼节性的距离。',
        range: { min: 20, max: 39 }
    },
    {
        phase: '相得',
        behavior:
            '相处融洽。开始流露真实的情绪与偏好，愿意分享私人话题，主动关心玩家的状态与选择。',
        range: { min: 40, max: 59 }
    },
    {
        phase: '同气',
        behavior:
            '同气连枝。视玩家为唯一的情感锚点，语气带着末日下的温情与偏执的信赖，愿意为玩家承担风险。',
        range: { min: 60, max: 100 }
    }
];

/** 信任轴的阶段指令。 */
const TRUST_PHASE_INSTRUCTIONS: Record<TrustPhase, string> = {
    猜忌: '⚠ 猜忌指令: 充满不可调和的攻击性，寻找言语上的破绽并施以恶毒的嘲讽或威胁。',
    防备: '⚠ 防备指令: 拒绝正面回答任何关于动机的问题，习惯用尖锐的反问掌握对话主动权。',
    审慎: '⚠ 审慎指令: 实用主义与利己主义，语气冷漠、机械，不做任何多余的承诺。',
    浅合: '⚠ 浅合指令: 带有克制的友好，愿意交流非致命的隐私，但底线不容试探。',
    长盟: '⚠ 长盟指令: 毫不掩饰地暴露脆弱面，分享战略信息，将玩家视为平等的战友。'
};

/** 好感轴的阶段指令。 */
const AFFINITY_PHASE_INSTRUCTIONS: Record<AffinityPhase, string> = {
    离心: '⚠ 离心指令: 明确表达脱离小队的意愿，回应中带着冷硬的疏远与不可修复的裂痕。',
    芥蒂: '⚠ 芥蒂指令: 维持基本协作，但语气中保留不满与试探，对示好反应冷淡甚至点破动机。',
    相敬: '⚠ 相敬指令: 保持职业化的边界感，愿意配合作战，但不主动涉入玩家的私人情绪。',
    相得: '⚠ 相得指令: 语气放松，流露真实的偏好与幽默感，主动关心玩家的处境。',
    同气: '⚠ 同气指令: 语气体现出偏执的信赖与依恋，甚至认为保护玩家的优先级高于自身存活。'
};

/**
 * 赠送物品的关系权重档位。
 *
 * `base` / `rare` / `epic` 分别对应 Settings 中的
 * giftTrustBase / giftTrustRare / giftTrustEpic；
 * `hostile` 表示该物品会激怒对方（按 base 取负）。
 */
const GIFT_GAIN_TIERS: Record<ItemGrade, 'base' | 'rare' | 'epic' | 'hostile'> = {
    salvaged: 'base',
    standard: 'base',
    reinforced: 'base',
    military: 'rare',
    corporate: 'rare',
    foundation: 'epic',
    prototype: 'epic',
    ark_prime: 'hostile'
};

// ==========================================================================
// 内部工具
// ==========================================================================

const toFiniteNumber = (value: unknown, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const clampNumber = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

/** ZoneDate → 绝对刻度，用于比较两个主观时间点的先后。 */
const toAbsoluteZoneTick = (date?: ZoneDate): number => {
    if (!date) return 0;
    return (
        safeNumber(date.day) * TICKS_PER_CYCLE * CYCLES_PER_DAY +
        safeNumber(date.cycle) * TICKS_PER_CYCLE +
        safeNumber(date.tick)
    );
};

/** 按 range 命中阶段；数值越界时落到最近的一端。 */
const resolvePhaseMeta = <T extends Trust | Affinity>(phases: T[], value: number): T => {
    const score = toFiniteNumber(value, 0);
    const hit = phases.find(
        (meta) => score >= meta.range.min && score <= meta.range.max
    );
    if (hit) return hit;
    return score < phases[0].range.min ? phases[0] : phases[phases.length - 1];
};

export class SocializationService {
    // ========================================================================
    // 关系轴与阶段
    // ========================================================================

    static getTrustMeta(trust: number): Trust {
        return resolvePhaseMeta(TRUST_PHASES, trust);
    }

    static getAffinityMeta(affinity: number): Affinity {
        return resolvePhaseMeta(AFFINITY_PHASES, affinity);
    }

    static getTrustPhase(trust: number): TrustPhase {
        return this.getTrustMeta(trust).phase;
    }

    static getAffinityPhase(affinity: number): AffinityPhase {
        return this.getAffinityMeta(affinity).phase;
    }

    /**
     * 关系快照：轴 + 读数 + 阶段 + 行为基准线。
     *
     * 节点 NPC 与同伴共用本方法，调用方不再自行判定字段归属。
     */
    static resolveRelation(dynamic: NpcDynamicState): RelationProfile {
        const axis = getRelationAxis(dynamic);
        const score = getRelationScore(dynamic);

        if (axis === 'trust') {
            const meta = this.getTrustMeta(score);
            return {
                axis,
                label: '信任',
                score,
                phase: meta.phase,
                behavior: meta.behavior,
                range: meta.range
            };
        }

        const meta = this.getAffinityMeta(score);
        return {
            axis,
            label: '好感',
            score,
            phase: meta.phase,
            behavior: meta.behavior,
            range: meta.range
        };
    }

    /**
     * 关系轴边界。
     *
     * - 信任：`[trustMin, trustMax]`，默认 `[0, 100]`；
     * - 好感：`[-trustMax, trustMax]`，默认 `[-100, 100]`（负值触发离队判定）。
     */
    static getRelationBounds(
        axis: RelationAxis,
        settings?: Settings
    ): _Relationship['range'] {
        const max = toFiniteNumber(
            settings?.gameConfig.social.thresholds.trustMax,
            DEFAULT_RELATION_MAX
        );
        const safeMax = Math.max(0, max);

        if (axis === 'trust') {
            const min = toFiniteNumber(settings?.gameConfig.social.thresholds.trustMin, 0);
            return { min: Math.min(min, safeMax), max: safeMax };
        }

        return { min: -safeMax, max: safeMax };
    }

    /** 按轴夹取关系读数。 */
    static clampRelation(axis: RelationAxis, value: number, settings?: Settings): number {
        const { min, max } = this.getRelationBounds(axis, settings);
        return clampNumber(toFiniteNumber(value, min), min, max);
    }

    static clampTrust(trust: number, settings?: Settings): number {
        return this.clampRelation('trust', trust, settings);
    }

    static clampAffinity(affinity: number, settings?: Settings): number {
        return this.clampRelation('affinity', affinity, settings);
    }

    /**
     * 写入关系增量并回读阶段。
     *
     * 返回实际生效的增量：越过轴边界时被夹取，调用方按 `delta` 写日志。
     */
    static applyRelationDelta(
        dynamic: InteractionNpcDynamic,
        delta: number,
        settings?: Settings
    ): RelationUpdate {
        const axis = getRelationAxis(dynamic);
        const previous = getRelationScore(dynamic);
        const score = this.clampRelation(axis, previous + toFiniteNumber(delta, 0), settings);
        const meta = axis === 'trust' ? this.getTrustMeta(score) : this.getAffinityMeta(score);

        return {
            dynamic: withRelationScore(dynamic as NpcDynamicState, score) as InteractionNpcDynamic,
            axis,
            label: axis === 'trust' ? '信任' : '好感',
            previous,
            score,
            delta: score - previous,
            phase: meta.phase
        };
    }

    /**
     * 同伴离队概率（契约：好感为负时每个 absoluteTick 都有概率离开，负值越大概率越高）。
     *
     * 返回 0 表示当前不会因好感离队。
     */
    static getCompanionLeaveChance(affinity: number): number {
        const value = toFiniteNumber(affinity, 0);
        if (value >= 0) return 0;

        const severity = clampNumber(Math.abs(value) / DEFAULT_RELATION_MAX, 0, 1);
        return clampNumber(
            AFFINITY_LEAVE_BASE_CHANCE + severity * AFFINITY_LEAVE_CHANCE_RANGE,
            0,
            1
        );
    }

    /** 按一次掷骰裁定同伴是否离队。 */
    static shouldCompanionLeave(affinity: number, roll: number = Math.random()): boolean {
        return toFiniteNumber(affinity, 0) < 0 && roll < this.getCompanionLeaveChance(affinity);
    }

    /**
     * 赠礼的关系增量。
     *
     * 物品品质越高收益越大；方舟原铸（ark_prime）作为文明遗珍会激怒对方（负增量）。
     */
    static getGiftRelationDelta(
        item: { grade?: ItemGrade; type?: string },
        settings?: Settings
    ): number {
        const benefits = settings?.gameConfig.social.benefits;
        const base = toFiniteNumber(benefits?.giftTrustBase, 10);
        const grade = item?.grade;
        const tier = (grade ? GIFT_GAIN_TIERS[grade] : undefined) ?? 'base';

        if (tier === 'hostile') return -Math.abs(base);

        let gain =
            tier === 'epic'
                ? toFiniteNumber(benefits?.giftTrustEpic, base * 4)
                : tier === 'rare'
                    ? toFiniteNumber(benefits?.giftTrustRare, base * 2)
                    : base;

        if (item?.type === 'consumable') {
            gain += toFiniteNumber(benefits?.giftTrustConsumableBonus, 0);
        }

        return gain;
    }

    // ========================================================================
    // 阶段化 Prompt 指令
    // ========================================================================

    /**
     * 特殊状态指令。
     *
     * 交叉判定「关系轴阶段 × 伤员 / 崩溃状态」，产出可直接追加到 Prompt 的指令行。
     */
    static generateSpecialStateInstructions(params: SpecialStateInstructionParams): string[] {
        const { settings, dynamic, sanity, hp, maxHp } = params;

        const instructions: string[] = [];
        const relation = this.resolveRelation(dynamic);
        const safeMaxHp = Math.max(0, toFiniteNumber(maxHp, 0));
        const hpRatio = safeMaxHp > 0 ? toFiniteNumber(hp, 0) / safeMaxHp : 0;
        const sanityCritical = toFiniteNumber(
            settings?.gameConfig.social.vitals.sanityCritical,
            30
        );
        const isSanityCritical = toFiniteNumber(sanity, 0) < sanityCritical;
        const isWounded = hpRatio < 0.3;
        const lowRelation = relation.score < toFiniteNumber(
            settings?.gameConfig.social.thresholds.trustVeryLow,
            20
        );
        const highRelation = relation.score >= toFiniteNumber(
            settings?.gameConfig.social.thresholds.trustHigh,
            60
        );

        if (lowRelation && isSanityCritical) {
            instructions.push(
                `⚠ 低${relation.label}+低理智: 回应必须混入严重的被害妄想、逻辑断层与无差别的敌意。`
            );
        }

        if (isWounded && highRelation) {
            instructions.push(
                `⚠ 重创濒死+高${relation.label}: 表现出对虚无的恐惧，并将玩家视为溺水前唯一能抓住的浮木。`
            );
        }

        if (isWounded && lowRelation) {
            instructions.push(
                `⚠ 重创濒死+低${relation.label}: 困兽犹斗。如同一头受伤的野兽，防卫机制全开，随时可能拉玩家同归于尽。`
            );
        }

        if (isSanityCritical && isWounded) {
            instructions.push(
                '⚠ 肉体与认知双重崩溃: 无法组织连贯的语言。台词中应包含幻觉妄语与生理痛苦的残喘。'
            );
        }

        instructions.push(
            relation.axis === 'trust'
                ? TRUST_PHASE_INSTRUCTIONS[relation.phase as TrustPhase]
                : AFFINITY_PHASE_INSTRUCTIONS[relation.phase as AffinityPhase]
        );

        return instructions;
    }

    // ========================================================================
    // 记忆上下文
    // ========================================================================

    /**
     * 组装记忆上下文块。
     *
     * 关系网部分按关系轴渲染（信任 / 好感），记忆部分按 α → δ 分层收敛。
     */
    static buildMemoryContext(
        dynamic: NpcDynamicState,
        history: Dialogue[],
        memory: MemoryPyramid
    ): string {
        const relation = this.resolveRelation(dynamic);

        const total = history.reduce((acc, d) => acc + (d.dialogue?.length || 0), 0);
        const duration =
            total > 500
                ? '深陷循环的同伴'
                : total > 100
                    ? '多次生死的交集'
                    : total > 25
                        ? '初步试探'
                        : '初次相遇的陌生人';

        const range = `${relation.range.min}~${relation.range.max}`;

        let block =
            `【认知链路与关系网】\n` +
            `- 关系轴: ${relation.label}${relation.axis === 'trust' ? '（社会性 / 契约性）' : '（情绪性 / 偏好性）'}\n` +
            `- 关系阶段: ${relation.phase} (${relation.label}标量 ${Math.floor(relation.score)}，阶段区间 ${range})\n` +
            `- 纠缠深度: ${duration}\n`;

        if (memory.α?.length > 0) {
            block += `【核心执念 / 绝对长期记忆 (α层)】\n`;
            memory.α.forEach((m: MemorySummaries_α) => {
                block += `- ${m.summary}\n`;
            });
        }

        if (memory.β?.length > 0) {
            block += `【重要事件 / 中长期结构化记忆 (β层)】\n`;
            memory.β.forEach((m: MemorySummaries_β) => {
                block += `- ${m.summary}\n`;
            });
        }

        if (memory.γ?.length > 0) {
            block += `【阶段总结 / 整合记忆 (γ层)】\n`;
            memory.γ.forEach((m: MemorySummaries_γ) => {
                block += `- ${m.summary}\n`;
            });
        }

        if (memory.δ?.length > 0) {
            block += `【短期记忆切片 / 近期经历 (δ层)】\n`;
            memory.δ.slice(-5).forEach((m: MemorySummaries_δ) => {
                block += `- ${m.summary}\n`;
                if (m.keyEntities?.length > 0) {
                    block += `  (触发锚点: ${m.keyEntities.join(', ')})\n`;
                }
            });
        }

        block += `- 行为基准线协议: ${relation.behavior}`;
        return block;
    }

    /**
     * 亲密深度评分。
     *
     * 由关系读数与记忆金字塔的长期价值共同决定，用于亲密互动的基调选择。
     */
    static calculateIntimacyScore(params: IntimacyScoreParams): number {
        const {
            score: relationScore,
            memory,
            sharedExperiences = 0,
            dialogueTurns = 0
        } = params;

        let score = toFiniteNumber(relationScore, 0);

        const all: MemorySummaries[] = [
            ...(memory.α || []),
            ...(memory.β || []),
            ...(memory.γ || []),
            ...(memory.δ || [])
        ];

        if (all.length > 0) {
            const avg =
                all.reduce((sum, m) => sum + toFiniteNumber(m.importanceScore, 0), 0) / all.length;
            score += avg * 15;
        }

        score += Math.min(toFiniteNumber(dialogueTurns, 0) * 0.5, 20);
        score += toFiniteNumber(sharedExperiences, 0) * 2;

        return clampNumber(score, 0, DEFAULT_RELATION_MAX);
    }

    // ========================================================================
    // 记忆金字塔
    // ========================================================================

    /**
     * δ 层摘要。
     *
     * 每 {@link Settings.dialogueSliceLength} 轮对话调用一次：
     * 语义 LLM 产出 summary / keyEntities / importanceScore，引擎补齐时间与索引。
     */
    static async summarizeDialogueSlice(
        params: SummarizeDialogueSliceParams
    ): Promise<MemorySummaries_δ | null> {
        const {
            settings,
            npc,
            dialogueHistory,
            startIndex,
            endIndex,
            currentTime,
            extractor
        } = params;

        if (!dialogueHistory || dialogueHistory.length === 0) return null;

        const draft = await extractor(settings, npc, dialogueHistory);
        if (!draft || !draft.summary) return null;

        return {
            ...this.createBaseSummary(draft, currentTime),
            hierarchy: 'δ',
            dialogueIndex: {
                start: startIndex,
                end: endIndex
            }
        };
    }

    static appendDelta(pyramid: MemoryPyramid, delta: MemorySummaries_δ): MemoryPyramid {
        return {
            ...pyramid,
            δ: [...(pyramid.δ || []), delta]
        };
    }

    /**
     * 记忆整合：δ → γ → β → α。
     *
     * 每满 {@link MEMORY_COLLAPSE_THRESHOLD} 条未归并的下级摘要，
     * 折叠出一条上级摘要并回写子摘要的 parentId。
     * 同时清理长期零重要性的摘要（其子摘要不受影响）。
     */
    static async evolve(params: EvolveMemoryParams): Promise<MemoryPyramid | null> {
        const { settings, npc, currentTime, consolidator } = params;

        let pyramid: MemoryPyramid = {
            α: [...(npc.dynamic.memory.α || [])],
            β: [...(npc.dynamic.memory.β || [])],
            γ: [...(npc.dynamic.memory.γ || [])],
            δ: [...(npc.dynamic.memory.δ || [])]
        };

        let changed = false;

        const runConsolidation = async (memories: MemorySummaries[]) => {
            return consolidator(
                settings,
                {
                    ...npc,
                    dynamic: {
                        ...npc.dynamic,
                        memory: pyramid
                    }
                },
                memories
            );
        };

        // δ -> γ
        const unparentedDelta = pyramid.δ.filter(m => !m.parentId);
        if (unparentedDelta.length >= MEMORY_COLLAPSE_THRESHOLD) {
            const slice = unparentedDelta.slice(0, MEMORY_COLLAPSE_THRESHOLD);
            const data = await runConsolidation(slice);

            if (data && data.summary) {
                const parent: MemorySummaries_γ = {
                    ...this.createBaseSummary(data, currentTime),
                    hierarchy: 'γ',
                    childIds: slice.map(m => m.id) as _Array<MemorySummaries_δ['id'], 5>
                };

                const sliceIds = new Set(slice.map(m => m.id));
                pyramid.δ = pyramid.δ.map(m =>
                    sliceIds.has(m.id) ? { ...m, parentId: parent.id } : m
                );
                pyramid.γ = [...pyramid.γ, parent];
                changed = true;
            }
        }

        // γ -> β
        const unparentedGamma = pyramid.γ.filter(m => !m.parentId);
        if (unparentedGamma.length >= MEMORY_COLLAPSE_THRESHOLD) {
            const slice = unparentedGamma.slice(0, MEMORY_COLLAPSE_THRESHOLD);
            const data = await runConsolidation(slice);

            if (data && data.summary) {
                const parent: MemorySummaries_β = {
                    ...this.createBaseSummary(data, currentTime),
                    hierarchy: 'β',
                    childIds: slice.map(m => m.id) as _Array<MemorySummaries_γ['id'], 5>
                };

                const sliceIds = new Set(slice.map(m => m.id));
                pyramid.γ = pyramid.γ.map(m =>
                    sliceIds.has(m.id) ? { ...m, parentId: parent.id } : m
                );
                pyramid.β = [...pyramid.β, parent];
                changed = true;
            }
        }

        // β -> α
        const unparentedBeta = pyramid.β.filter(m => !m.parentId);
        if (unparentedBeta.length >= MEMORY_COLLAPSE_THRESHOLD) {
            const slice = unparentedBeta.slice(0, MEMORY_COLLAPSE_THRESHOLD);
            const data = await runConsolidation(slice);

            if (data && data.summary) {
                const parent: MemorySummaries_α = {
                    ...this.createBaseSummary(data, currentTime),
                    hierarchy: 'α',
                    childIds: slice.map(m => m.id) as _Array<MemorySummaries_β['id'], 5>
                };

                const sliceIds = new Set(slice.map(m => m.id));
                pyramid.β = pyramid.β.map(m =>
                    sliceIds.has(m.id) ? { ...m, parentId: parent.id } : m
                );
                pyramid.α = [...pyramid.α, parent];
                changed = true;
            }
        }

        const pruned = this.pruneMemories(pyramid, currentTime);
        if (pruned) {
            pyramid = pruned;
            changed = true;
        }

        return changed ? pyramid : null;
    }

    /**
     * 记录一次记忆检索。
     *
     * accessCount 累加、importanceScore 弹性上扬、lastAccessedAt 刷新，
     * 并重算全体摘要的 accessRatio。
     */
    static recordMemoryAccess(
        pyramid: MemoryPyramid,
        memoryId: string,
        currentTime: ZoneDate
    ): MemoryPyramid {
        const updateLayer = <T extends MemorySummaries>(layer: T[]): T[] =>
            layer.map(memory => {
                if (memory.id !== memoryId) return memory;

                const accessCount = (memory.accessCount || 0) + 1;
                const importanceScore = Math.min(
                    1,
                    toFiniteNumber(memory.importanceScore, 0.1) + IMPORTANCE_ELASTICITY
                );

                return {
                    ...memory,
                    accessCount,
                    importanceScore,
                    lastAccessedAt: currentTime
                };
            });

        return this.recalculateAccessRatio({
            α: updateLayer(pyramid.α || []),
            β: updateLayer(pyramid.β || []),
            γ: updateLayer(pyramid.γ || []),
            δ: updateLayer(pyramid.δ || [])
        });
    }

    /** 按检索占比重算 accessRatio（0-1）。 */
    static recalculateAccessRatio(pyramid: MemoryPyramid): MemoryPyramid {
        const layers: MemorySummaries[] = [
            ...(pyramid.α || []),
            ...(pyramid.β || []),
            ...(pyramid.γ || []),
            ...(pyramid.δ || [])
        ];

        const total = layers.reduce((sum, memory) => sum + toFiniteNumber(memory.accessCount, 0), 0);
        if (total <= 0) return pyramid;

        const rewrite = <T extends MemorySummaries>(layer: T[]): T[] =>
            layer.map(memory => ({
                ...memory,
                accessRatio: Number(
                    (toFiniteNumber(memory.accessCount, 0) / total).toFixed(4)
                )
            }));

        return {
            α: rewrite(pyramid.α || []),
            β: rewrite(pyramid.β || []),
            γ: rewrite(pyramid.γ || []),
            δ: rewrite(pyramid.δ || [])
        };
    }

    /**
     * 清理长期零重要性的摘要。
     *
     * 判定条件：importanceScore <= 0，且自最后一次检索（无则按生成时间）
     * 起已超过 {@link MEMORY_PRUNE_GRACE_DAYS} 天；其子摘要不受影响。
     *
     * @returns 发生删除时返回新的金字塔，否则返回 null。
     */
    static pruneMemories(pyramid: MemoryPyramid, currentTime: ZoneDate): MemoryPyramid | null {
        const now = toAbsoluteZoneTick(currentTime);
        const grace = MEMORY_PRUNE_GRACE_DAYS * TICKS_PER_CYCLE * CYCLES_PER_DAY;
        let removed = 0;

        const pruneLayer = <T extends MemorySummaries>(layer: T[]): T[] =>
            layer.filter(memory => {
                if (toFiniteNumber(memory.importanceScore, 0) > 0) return true;

                const anchor = memory.lastAccessedAt ?? memory.endTime ?? memory.startTime;
                if (now - toAbsoluteZoneTick(anchor) < grace) return true;

                removed += 1;
                return false;
            });

        const next: MemoryPyramid = {
            α: pruneLayer(pyramid.α || []),
            β: pruneLayer(pyramid.β || []),
            γ: pruneLayer(pyramid.γ || []),
            δ: pruneLayer(pyramid.δ || [])
        };

        return removed > 0 ? next : null;
    }

    // ========================================================================
    // 内部构造
    // ========================================================================

    /**
     * 引擎侧记忆骨架。
     *
     * 语义层只负责 summary / keyEntities / importanceScore，
     * id、时间窗与长期维护计数一律由引擎补齐。
     */
    private static createBaseSummary(
        data: MemorySummaryDraft,
        time: ZoneDate
    ): MemorySummaries {
        return {
            id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            summary: data.summary,
            keyEntities: Array.isArray(data.keyEntities) ? data.keyEntities : [],
            importanceScore: clampNumber(toFiniteNumber(data.importanceScore, 0.5), 0, 1),
            accessCount: 0,
            accessRatio: 0,
            startTime: time,
            endTime: time
        };
    }
}
