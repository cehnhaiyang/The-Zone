/**
 * @file SocializationService.ts
 * @desc 社交领域服务：关系、信任、亲密度、记忆金字塔生命周期。
 *
 * 设计原则：
 * - 不直接依赖 AiService，避免循环依赖。
 * - 所有需要 LLM 的能力通过依赖注入端口传入。
 * - 尽量返回不可变结果，便于 React 状态更新。
 */
import {
    RelationshipPhase,
    Entity,
    NpcTemplate,
    NpcDynamicState,
    MemoryPyramid,
    MemorySummaries,
    MemorySummaries_δ,
    MemorySummaries_γ,
    MemorySummaries_β,
    MemorySummaries_α,
    ZoneDate,
    Dialogue,
    Relationship,
    Settings,
    Words,
    PlayerWordsTag,
    NpcWordsTag,
    _Array
} from '../meta';

interface MemorySummaryDraft {
    summary: string;
    keyEntities: string[];
    importanceScore: number;
}

type MemorySummaryExtractor = (
    settings: Settings,
    npc: Entity<NpcTemplate, NpcDynamicState>,
    dialogueHistory: Array<[Words<PlayerWordsTag>, Words<NpcWordsTag>]>
) => Promise<MemorySummaryDraft | null>;

export type MemoryConsolidator = (
    settings: Settings,
    npc: Entity<NpcTemplate, NpcDynamicState>,
    memories: MemorySummaries[]
) => Promise<MemorySummaryDraft | null>;

export interface SummarizeDialogueSliceParams {
    settings: Settings;
    npc: Entity<NpcTemplate, NpcDynamicState>;
    dialogueHistory: Array<[Words<PlayerWordsTag>, Words<NpcWordsTag>]>;
    startIndex: number;
    endIndex: number;
    currentTime: ZoneDate;
    extractor: MemorySummaryExtractor;
}

export interface EvolveMemoryParams {
    settings: Settings;
    npc: Entity<NpcTemplate, NpcDynamicState>;
    currentTime: ZoneDate;
    consolidator: MemoryConsolidator;
}

export interface SpecialStateInstructionParams {
    settings?: Settings;
    trust: number;
    sanity: number;
    hp: number;
    maxHp: number;
    phase?: RelationshipPhase;
}

export interface IntimacyScoreParams {
    trust: number;
    memory: MemoryPyramid;
    sharedExperiences?: number;
    dialogueTurns?: number;
}

const MEMORY_COLLAPSE_THRESHOLD = 5;
const IMPORTANCE_ELASTICITY = 0.015;

export const RELATIONSHIP_CONFIGS: Relationship[] = [
    {
        phase: RelationshipPhase.HOSTILE,
        behavior: '极度排斥。仅用单音词或冷笑回应。拒绝分享任何生存情报。肢体语言呈现绝对的防备或攻击性。随时准备在背后捅玩家一刀。',
        trustRange: { min: 0, max: 9 }
    },
    {
        phase: RelationshipPhase.GUARDED,
        behavior: '充满猜忌。用防御性的反问评估对方。不会主动提供物资。对话中混入对玩家动机的恶意揣测。',
        trustRange: { min: 10, max: 24 }
    },
    {
        phase: RelationshipPhase.NEUTRAL,
        behavior: '例行公事。礼貌但极其疏离。回答问题如读说明书。在死亡威胁面前，会毫不犹豫地抛下对方。',
        trustRange: { min: 25, max: 44 }
    },
    {
        phase: RelationshipPhase.FAMILIAR,
        behavior: '点头之交。偶尔会分享一个苦涩的玩笑。开始透露一点过去的碎片。在安全的前提下愿意提供微小的协助。',
        trustRange: { min: 45, max: 64 }
    },
    {
        phase: RelationshipPhase.TRUSTING,
        behavior: '并肩作战。坦诚地描述自己的恐惧。语气带有末日下的温情。主动关注玩家的生理状态，愿意分享重要的战术信息。',
        trustRange: { min: 65, max: 84 }
    },
    {
        phase: RelationshipPhase.BONDED,
        behavior: '绝望的依赖。你们是彼此在噩梦中唯一的锚点。病态地关切对方的存亡。愿意分享最深层的禁忌秘密，甚至为保护对方而献祭自己的部分人性。',
        trustRange: { min: 85, max: 100 }
    }
];

export const getRelationship = (trust: number): Relationship => {
    const clampedTrust = Math.max(0, Math.min(100, trust));
    const config = RELATIONSHIP_CONFIGS.find(
        cfg => clampedTrust >= cfg.trustRange.min && clampedTrust <= cfg.trustRange.max
    );
    return config || RELATIONSHIP_CONFIGS[2];
};

const toFiniteNumber = (value: unknown, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export class SocializationService {
    // ========================================================================
    // 关系与信任
    // ========================================================================

    static getRelationshipPhase(trust: number): RelationshipPhase {
        return getRelationship(trust).phase;
    }

    static getRelationshipBehavior(trust: number): string {
        return getRelationship(trust).behavior;
    }

    static clampTrust(trust: number, settings?: Settings): number {
        const min = toFiniteNumber(settings?.gameConfig.social.thresholds.trustMin, 0);
        const max = toFiniteNumber(settings?.gameConfig.social.thresholds.trustMax, 100);
        const lower = Math.min(min, max);
        const upper = Math.max(min, max);
        const value = toFiniteNumber(trust, lower);
        return Math.max(lower, Math.min(upper, value));
    }

    static generateSpecialStateInstructions(params: SpecialStateInstructionParams): string[] {
        const {
            settings,
            trust,
            sanity,
            hp,
            maxHp,
            phase
        } = params;

        const instructions: string[] = [];
        const currentPhase = phase ?? this.getRelationshipPhase(trust);
        const safeMaxHp = Math.max(0, toFiniteNumber(maxHp, 0));
        const hpRatio = safeMaxHp > 0 ? toFiniteNumber(hp, 0) / safeMaxHp : 0;
        const sanityCritical = toFiniteNumber(settings?.gameConfig.social.vitals.sanityCritical, 30);
        const isSanityCritical = toFiniteNumber(sanity, 0) < sanityCritical;

        if (trust < 20 && isSanityCritical) {
            instructions.push('⚠ 低信任+低理智: 回应必须混入严重的被害妄想、逻辑断层与无差别的敌意。');
        }

        if (hpRatio < 0.3 && trust > 60) {
            instructions.push('⚠ 重创濒死+高信任: 表现出对虚无的恐惧，并将玩家视为溺水前唯一能抓住的浮木。');
        }

        if (hpRatio < 0.3 && trust < 20) {
            instructions.push('⚠ 重创濒死+低信任: 困兽犹斗。如同一头受伤的野兽，防卫机制全开，随时可能拉玩家同归于尽。');
        }

        if (isSanityCritical && hpRatio < 0.3) {
            instructions.push('⚠ 肉体与认知双重崩溃: 无法组织连贯的语言。台词中应包含幻觉妄语与生理痛苦的残喘。');
        }

        switch (currentPhase) {
            case RelationshipPhase.BONDED:
                instructions.push('⚠ 羁绊指令: 语气体现出病态的依赖与偏执，甚至认为保护玩家的优先级高于自身存活。');
                break;
            case RelationshipPhase.TRUSTING:
                instructions.push('⚠ 信任指令: 毫不掩饰地暴露脆弱面，分享战略信息，将玩家视为平等的战友。');
                break;
            case RelationshipPhase.FAMILIAR:
                instructions.push('⚠ 熟识指令: 带有克制的友好，愿意交流非致命的隐私，但底线不容试探。');
                break;
            case RelationshipPhase.NEUTRAL:
                instructions.push('⚠ 中立指令: 实用主义与利己主义。语气较冷漠、机械。');
                break;
            case RelationshipPhase.GUARDED:
                instructions.push('⚠ 戒备指令: 拒绝正面回答任何关于动机的问题，习惯用尖锐的反问掌握对话主动权。');
                break;
            case RelationshipPhase.HOSTILE:
                instructions.push('⚠ 敌意指令: 充满不可调和的攻击性，寻找言语上的破绽并施以恶毒的嘲讽或威胁。');
                break;
        }

        return instructions;
    }

    // ========================================================================
    // 记忆上下文
    // ========================================================================

    static buildMemoryContext(trust: number, history: Dialogue[], memory: MemoryPyramid): string {
        const relationship = getRelationship(trust);

        const total = history.reduce((acc, d) => acc + (d.dialogue?.length || 0), 0);
        const duration =
            total > 500
                ? '深陷循环的同伴'
                : total > 100
                    ? '多次生死的交集'
                    : total > 25
                        ? '初步试探'
                        : '初次相遇的陌生人';

        let block = `【认知链路与关系网】\n- 关系阶段: ${relationship.phase} (信任标量 ${Math.floor(trust)}/100)\n- 纠缠深度: ${duration}\n`;

        if (memory.α && memory.α.length > 0) {
            block += `【核心执念 / 绝对长期记忆 (α层)】\n`;
            memory.α.forEach((m: MemorySummaries_α) => {
                block += `- ${m.summary}\n`;
            });
        }

        if (memory.β && memory.β.length > 0) {
            block += `【重要事件 / 中长期结构化记忆 (β层)】\n`;
            memory.β.forEach((m: MemorySummaries_β) => {
                block += `- ${m.summary}\n`;
            });
        }

        if (memory.γ && memory.γ.length > 0) {
            block += `【阶段总结 / 整合记忆 (γ层)】\n`;
            memory.γ.forEach((m: MemorySummaries_γ) => {
                block += `- ${m.summary}\n`;
            });
        }

        if (memory.δ && memory.δ.length > 0) {
            block += `【短期记忆切片 / 近期经历 (δ层)】\n`;
            memory.δ.slice(-5).forEach((m: MemorySummaries_δ) => {
                block += `- ${m.summary}\n`;
                if (m.keyEntities && m.keyEntities.length > 0) {
                    block += `  (触发锚点: ${m.keyEntities.join(', ')})\n`;
                }
            });
        }

        block += `- 行为基准线协议: ${relationship.behavior}`;
        return block;
    }

    static calculateIntimacyScore(params: IntimacyScoreParams): number {
        const {
            trust,
            memory,
            sharedExperiences = 0,
            dialogueTurns = 0
        } = params;

        let score = toFiniteNumber(trust, 0);

        const all: MemorySummaries[] = [
            ...(memory.α || []),
            ...(memory.β || []),
            ...(memory.γ || []),
            ...(memory.δ || [])
        ];

        if (all.length > 0) {
            const avg = all.reduce((sum, m) => sum + toFiniteNumber(m.importanceScore, 0), 0) / all.length;
            score += avg * 15;
        }

        score += Math.min(toFiniteNumber(dialogueTurns, 0) * 0.5, 20);
        score += toFiniteNumber(sharedExperiences, 0) * 2;

        return Math.max(0, Math.min(100, score));
    }

    // ========================================================================
    // 记忆金字塔
    // ========================================================================

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
            ...this.createBaseSummary(npc.static.id, npc.static.name, draft, currentTime),
            hierarchy: 'δ',
            dialogueIndex: {
                start: startIndex,
                end: endIndex
            }
        };
    }

    static appendDelta(pyramid: MemoryPyramid, delta: MemorySummaries_δ): MemoryPyramid {
        return {
            α: [...(pyramid.α || [])],
            β: [...(pyramid.β || [])],
            γ: [...(pyramid.γ || [])],
            δ: [...(pyramid.δ || []), delta]
        };
    }

    static async evolve(params: EvolveMemoryParams): Promise<MemoryPyramid | null> {
        const { settings, npc, currentTime, consolidator } = params;

        const pyramid: MemoryPyramid = {
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
                    ...this.createBaseSummary(npc.static.id, npc.static.name, data, currentTime),
                    hierarchy: 'γ',
                    childIds: slice.map(m => m.id) as _Array<MemorySummaries_δ['id'], 5>
                };

                const sliceIds = new Set(slice.map(m => m.id));
                pyramid.δ = pyramid.δ.map(m =>
                    sliceIds.has(m.id)
                        ? { ...m, parentId: parent.id }
                        : m
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
                    ...this.createBaseSummary(npc.static.id, npc.static.name, data, currentTime),
                    hierarchy: 'β',
                    childIds: slice.map(m => m.id) as _Array<MemorySummaries_γ['id'], 5>
                };

                const sliceIds = new Set(slice.map(m => m.id));
                pyramid.γ = pyramid.γ.map(m =>
                    sliceIds.has(m.id)
                        ? { ...m, parentId: parent.id }
                        : m
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
                    ...this.createBaseSummary(npc.static.id, npc.static.name, data, currentTime),
                    hierarchy: 'α',
                    childIds: slice.map(m => m.id) as _Array<MemorySummaries_β['id'], 5>
                };

                const sliceIds = new Set(slice.map(m => m.id));
                pyramid.β = pyramid.β.map(m =>
                    sliceIds.has(m.id)
                        ? { ...m, parentId: parent.id }
                        : m
                );
                pyramid.α = [...pyramid.α, parent];
                changed = true;
            }
        }

        return changed ? pyramid : null;
    }

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

        return {
            α: updateLayer(pyramid.α || []),
            β: updateLayer(pyramid.β || []),
            γ: updateLayer(pyramid.γ || []),
            δ: updateLayer(pyramid.δ || [])
        };
    }

    private static createBaseSummary(
        npcId: string,
        npcName: string,
        data: MemorySummaryDraft,
        time: ZoneDate
    ): MemorySummaries {
        return {
            id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            summary: data.summary,
            keyEntities: Array.isArray(data.keyEntities) ? data.keyEntities : [],
            importanceScore: Math.max(0, Math.min(1, toFiniteNumber(data.importanceScore, 0.5))),
            accessCount: 0,
            accessRatio: 0,
            startTime: time,
            endTime: time
        };
    }
}