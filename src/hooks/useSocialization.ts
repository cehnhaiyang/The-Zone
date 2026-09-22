import { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type {
    PlayerState,
    Node,
    Zone,
    Settings,
    Quest,
    ItemInstance,
    InteractionNpcEntity,
    InteractionDialogueContext,
    NpcDynamicState,
    Entity,
    CompanionDynamicState,
    CompanionTemplate,
    Words,
    PlayerWordsTag,
    NpcWordsTag,
    CurrentLocation,
    Dialogue,
    Mood,
    ZoneDate,
    LogType,
    NodeNpcTemplate,
    AttributeType,
    VitalType,
    DynamicVitalType,
    QuestTemplate,
    QuestStatus
} from '../meta';
import {
    removeItemFromInventory,
    addItemToInventory,
    isConsumableInstance,
    isEquipmentInstance,
    isWeaponInstance,
    isArmorInstance,
    isAccessoryInstance,
    normalizeEquipState,
    equipItem,
    unequipItem,
    addUniqueItemToInventory,
    stripEquipEffectSnapshot,
    applyEffectDeltas,
    negateEffectDeltas,
    getAppliedAccessoryDeltas,
    collectAccessoryEffects,
    isAttributeType,
    isVitalType,
    buildCurrentLocation,
    clamp,
    createEmptyMemoryPyramid,
    safeNumber,
    generateInstanceId,
    getRelationAxis,
    getRelationScore,
    getSanctuaryResourceValue,
    safeDeepClone,
    withRelationScore
} from '../meta';
import {
    AudioService,
    AiService,
    SocializationService,
    PersistenceService
} from '../services';
import type { NpcProfileMeta } from '../services/PersistenceService';

const createQuest = (
    template: QuestTemplate,
    status: QuestStatus = 'on'
): Quest => ({
    ...safeDeepClone(template),
    status,
});

interface UseSocializationParams {
    player: PlayerState;
    setPlayer: Dispatch<SetStateAction<PlayerState>>;
    addLog: (text: string, type: LogType) => void;
    settings: Settings;
    getCurrentNode: () => Node;
    currentNodeId: string;
    setCurrentZone: Dispatch<SetStateAction<Zone>>;
    currentZone: Zone;
    activeInteractionNPC: InteractionNpcEntity | null;
    setActiveInteractionNPC: Dispatch<
        SetStateAction<InteractionNpcEntity | null>
    >;
}

interface UseSocializationReturn {
    activeInteractionNPC: InteractionNpcEntity | null;
    setActiveInteractionNPC: Dispatch<
        SetStateAction<InteractionNpcEntity | null>
    >;
    handleNPCChat: (message: string) => Promise<void>;
    handleCompanionHeartToHeart: () => void;
    handleRequestQuest: () => void;
    handleNPCTakeItem: (item: ItemInstance) => void;
    handleNPCGift: (item: ItemInstance) => void;
    handleNPCRecruit: () => void;
    handleCompanionEquipItem: (item: ItemInstance, slotIndex?: number) => void;
    handleCompanionUnequipItem: (itemType: 'weapon' | 'armor' | 'accessory', slotIndex: number) => void;
    handleCompanionUseConsumable: (item: ItemInstance) => void;
    handleAcceptQuest: (questId: string, questData: Partial<Quest>) => void;
    closeNPCInteraction: () => void;
    handleMountProfile: (profileId: string) => Promise<void>;
    handleUnmountCreateNewProfile: (customName?: string) => Promise<void>;
    handleDeleteProfile: (profileId: string) => Promise<void>;
    /** 好感离队裁定：由 tick 循环驱动，每个 absoluteTick 至多结算一次。 */
    evaluateCompanionDepartures: () => void;
}

interface NpcDialogueAiResult {
    text?: string;
    modelThought?: string;
    thought?: string;
    mood?: Mood;
    /** 关系增量：节点 NPC 落到信任轴，同伴落到好感轴。 */
    relationChange?: number;
    /** 本轮注入 Prompt 的记忆摘要 id，用于回写检索计数。 */
    memoryAccessIds?: string[];
    quest?: Partial<QuestTemplate> & { desc?: string };
}

const PENDING_TOKEN = 'pending_npc_response';
const MOODS: Mood[] = ['happy', 'sad', 'angry', 'fearful', 'surprised', 'neutral'];

type CanBeInvited = NonNullable<NodeNpcTemplate['canBeInvited']>;
type ReplacementRequirement = NonNullable<CanBeInvited['replacement']>[number];
type DynamicStatKey = AttributeType | VitalType | DynamicVitalType;

const createSocialDialogueRecord = (
    speaker: string,
    text: string,
    location: CurrentLocation,
    isNPC: boolean,
    time: ZoneDate,
    mood?: Mood,
    thought?: string
): Words<PlayerWordsTag> | Words<NpcWordsTag> =>
    isNPC
        ? {
            text,
            tag: {
                type: 'npc',
                speaker,
                mood: mood || 'neutral',
                thought: thought ?? ''
            }
        }
        : {
            text,
            tag: {
                type: 'player',
                speaker,
                location,
                currentTime: time
            }
        };

const createDialogue = (
    dialogueRecords: Array<[Words<PlayerWordsTag>, Words<NpcWordsTag>]>
): Dialogue => ({
    dialogue: dialogueRecords
});

const toMood = (value: unknown): Mood =>
    typeof value === 'string' && (MOODS as string[]).includes(value)
        ? (value as Mood)
        : 'neutral';

const getEntityNumber = (
    dynamic: NpcDynamicState,
    key: DynamicStatKey | string
): number => safeNumber((dynamic as unknown as Record<string, unknown>)[key]);

const hasRequiredItems = (inventory: ItemInstance[], ids?: string[]): boolean => {
    if (!ids || ids.length === 0) return true;
    return ids.every(id => inventory.some(item => item.id === id));
};

const hasArchivedQuests = (player: PlayerState, ids?: string[]): boolean => {
    if (!ids || ids.length === 0) return true;
    return ids.every(id => (player.questArchived ?? []).some(q => q.id === id));
};

/**
 * 庇护所资源安全线校验。
 *
 * requirements 为「资源 id + 最低储备」关系：只有清单内资源全部达标才返回 true。
 * 未在该庇护所声明的资源按 0 计（即不满足任何正数安全线）。
 */
const isSanctuarySafe = (
    player: PlayerState,
    requirements?: Record<string, number>
): boolean => {
    if (!requirements) return true;
    const sanctuary = player.sanctuary;
    if (!sanctuary) return false;

    return Object.entries(requirements).every(
        ([key, minValue]) =>
            getSanctuaryResourceValue(sanctuary, key) >= safeNumber(minValue)
    );
};

const matchesReplacementRequirement = (
    companion: InteractionNpcEntity,
    req: ReplacementRequirement
): boolean => {
    if (typeof req === 'string') {
        return companion.static.id === req;
    }

    const { attributes, vitals, dynamicVitals } = req;

    if (attributes) {
        for (const [key, value] of Object.entries(attributes)) {
            if (getEntityNumber(companion.dynamic, key) < safeNumber(value)) {
                return false;
            }
        }
    }

    if (vitals) {
        for (const [key, value] of Object.entries(vitals)) {
            if (getEntityNumber(companion.dynamic, key) < safeNumber(value)) {
                return false;
            }
        }
    }

    if (dynamicVitals) {
        for (const [key, value] of Object.entries(dynamicVitals)) {
            if (getEntityNumber(companion.dynamic, key) < safeNumber(value)) {
                return false;
            }
        }
    }

    return true;
};

const resolveReplacements = (
    companions: Array<InteractionNpcEntity>,
    requirements: ReplacementRequirement[] | undefined,
    excludeId: string
): Array<InteractionNpcEntity> | null => {
    if (!requirements || requirements.length === 0) return [];

    const candidates = companions
        .filter(c => c.static.id !== excludeId)
        .sort((a, b) => getRelationScore(b.dynamic) - getRelationScore(a.dynamic));

    const single = candidates.find(c =>
        requirements.every(req => matchesReplacementRequirement(c, req))
    );
    if (single) return [single];

    const assigned: Array<InteractionNpcEntity> = [];
    for (const req of requirements) {
        const candidate = candidates.find(
            c => !assigned.includes(c) && matchesReplacementRequirement(c, req)
        );
        if (!candidate) return null;
        assigned.push(candidate);
    }

    return assigned;
};

export const useSocialization = ({
    player,
    setPlayer,
    addLog,
    settings,
    getCurrentNode,
    currentNodeId,
    setCurrentZone,
    currentZone,
    activeInteractionNPC,
    setActiveInteractionNPC
}: UseSocializationParams): UseSocializationReturn => {
    /**
     * 面板会话关闭标记：in-flight LLM 响应落地时若面板已关闭，
     * 只同步状态/写对话，不强制重建 activeInteractionNPC（防止响应
     * 在几十秒后突然重新弹出全屏面板）。
     */
    const interactionClosedRef = useRef(false);
    const npcIdRef = useRef<string | null>(null);
    /** 最近一次做过离队裁定的 absoluteTick，保证每个 tick 只掷一次骰。 */
    const lastDepartureTickRef = useRef<number | null>(null);

    useEffect(() => {
        if (activeInteractionNPC) {
            interactionClosedRef.current = false;
            npcIdRef.current = activeInteractionNPC.static.id;
        }
    }, [activeInteractionNPC]);
    /**
     * 装载当前 NPC 的对话。
     *
     * dialogue 从数组改为单对象后，切换 NPC 时必须以该 NPC 当前档案
     * （mountedProfileId || 'default'）的本地对话作为承载，否则面板会
     * 串显示上一个 NPC 的对话。
     */
    useEffect(() => {
        const npc = activeInteractionNPC;
        if (!npc) return;

        const npcId = npc.static.id;
        const profileId = npc.dynamic.mountedProfileId || 'default';
        let cancelled = false;

        (async () => {
            try {
                const res =
                    (await PersistenceService.loadNpcMemoryProfile(
                        npcId,
                        profileId
                    )) ?? {};
                if (cancelled) return;

                const fallbackDialogue: Dialogue = { dialogue: [] };
                const loadedDialogue: Dialogue = Array.isArray(res.dialogue)
                    ? (res.dialogue[res.dialogue.length - 1] ?? fallbackDialogue)
                    : (res.dialogue ?? fallbackDialogue);

                setPlayer(prev => ({
                    ...prev,
                    dialogue: loadedDialogue
                }));
            } catch {
                if (cancelled) return;
                setPlayer(prev => ({
                    ...prev,
                    dialogue: { dialogue: [] }
                }));
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [activeInteractionNPC?.static.id, activeInteractionNPC?.dynamic.mountedProfileId, setPlayer]);
    /**
     * 同步 NPC 状态。
     *
     * 说明：
     * - 同伴列表承载完整 Entity，关系轴写回 `affinity`。
     * - 节点 nodeNpc 只能合法承载静态模板，因此这里只把「信任」同步进 initialState。
     */
    /**
     * 面板会话会写入、且不应被外部系统（战斗/休息/升级）覆盖的 dynamic 字段。
     * 其余字段（stamina/vigor/属性/等级/xp/战术/装备等）一律保留
     * companions 中现有实体的最新值，避免快照回滚外部修改。
     */
    const SESSION_DYNAMIC_FIELDS: Array<keyof CompanionDynamicState> = [
        'hp',
        'sanity',
        'stamina',
        'vigor',
        'equipment',
        'strength',
        'agility',
        'wisdom',
        'awareness',
        'will',
        'cthulhu',
        'totalDialogueRounds',
        'memory',
        'mountedProfileId',
        'inventory',
        'imageUrl',
        'videoUrl',
        'audioUrl',
    ];

    const syncNPCState = useCallback(
        (npc: InteractionNpcEntity) => {
            const npcId = npc.static.id;

            setPlayer(p => {
                if (!p.companions.some(c => c.static.id === npcId)) return p;

                return {
                    ...p,
                    companions: p.companions.map(c => {
                        if (c.static.id !== npcId) return c;

                        // 字段级合并：以现有实体为基础，仅覆盖本会话写入的字段。
                        // 关系度单独走 withRelationScore：同伴写 affinity、节点 NPC 写 trust。
                        const merged: CompanionDynamicState = { ...c.dynamic };
                        for (const key of SESSION_DYNAMIC_FIELDS) {
                            if (key in npc.dynamic) {
                                const value = (npc.dynamic as CompanionDynamicState)[key];
                                if (value !== undefined) {
                                    (merged as Record<keyof CompanionDynamicState, unknown>)[key] = value;
                                }
                            }
                        }
                        merged.hp = clamp(safeNumber(merged.hp), 0, safeNumber(merged.maxHp));
                        merged.sanity = clamp(
                            safeNumber(merged.sanity),
                            0,
                            safeNumber(merged.maxSanity)
                        );
                        const relation = SocializationService.clampRelation(
                            getRelationAxis(merged),
                            getRelationScore(merged),
                            settings
                        );
                        return {
                            ...c,
                            static: c.static,
                            dynamic: withRelationScore(merged, relation),
                        };
                    })
                };
            });

            setCurrentZone((prev: Zone) => {
                const node = prev.nodes?.[currentNodeId];
                if (!node?.nodeNpc) return prev;
                if (node.nodeNpc.id !== npc.static.id) return prev;
                // 只有信任轴才回写节点模板；同伴（好感轴）与节点 NPC 的信任互不相干。
                if (getRelationAxis(npc.dynamic) !== 'trust') return prev;

                return {
                    ...prev,
                    nodes: {
                        ...prev.nodes,
                        [currentNodeId]: {
                            ...node,
                            nodeNpc: {
                                ...node.nodeNpc,
                                initialState: {
                                    ...node.nodeNpc.initialState,
                                    trust: getRelationScore(npc.dynamic)
                                }
                            }
                        }
                    }
                };
            });
        },
        [setPlayer, setCurrentZone, currentNodeId, settings]
    );

    const handleNPCChat = useCallback(
        async (message: string) => {
            if (!activeInteractionNPC) return;

            const ownerId = activeInteractionNPC.static.id;
            const ownerName = activeInteractionNPC.static.name;
            const location = buildCurrentLocation(currentZone, currentNodeId);

            const playerWords = createSocialDialogueRecord(
                player.static.name,
                message,
                location,
                false,
                player.currentZoneTime
            ) as Words<PlayerWordsTag>;

            const placeholderNpcWords: Words<NpcWordsTag> = {
                text: '',
                tag: {
                    type: 'npc',
                    speaker: ownerName,
                    mood: 'neutral',
                    thought: PENDING_TOKEN
                }
            };

            setPlayer(prev => {
                const current: Dialogue = {
                    dialogue: [...(prev.dialogue?.dialogue ?? []), [playerWords, placeholderNpcWords]]
                };

                return {
                    ...prev,
                    dialogue: current
                };
            });

            const previousPairs = player.dialogue?.dialogue ?? [];

            const mergedDialogueHistory: Dialogue = {
                dialogue: [
                    ...previousPairs,
                    [playerWords, placeholderNpcWords]
                ]
            };

            const context: InteractionDialogueContext = {
                dialogue: mergedDialogueHistory,
                npc: activeInteractionNPC,
                player: {
                    static: player.static,
                    dynamic: player.dynamic
                },
                location
            };

            try {
                const result =
                    (await AiService.generateNPCDialogue(
                        settings,
                        context
                    )) as NpcDialogueAiResult;

                const npcWords: Words<NpcWordsTag> = {
                    text:
                        typeof result.text === 'string' && result.text.trim() !== ''
                            ? result.text
                            : '……',
                    tag: {
                        type: 'npc',
                        speaker: ownerName,
                        mood: toMood(result.mood),
                        thought:
                            [result.modelThought, result.thought]
                                .filter(Boolean)
                                .join('\n\n') || ''
                    }
                };

                // 关系增量按目标关系轴落位：节点 NPC 记信任，同伴记好感。
                const relationUpdate = SocializationService.applyRelationDelta(
                    activeInteractionNPC.dynamic,
                    Math.floor(safeNumber(result.relationChange)),
                    settings
                );

                // 记忆检索回写：本轮注入 Prompt 的 δ 摘要计一次检索（accessCount / accessRatio）。
                const accessedMemory = (result.memoryAccessIds ?? []).reduce(
                    (pyramid, memoryId) =>
                        SocializationService.recordMemoryAccess(
                            pyramid,
                            memoryId,
                            player.currentZoneTime
                        ),
                    relationUpdate.dynamic.memory
                );

                const updatedNPC: InteractionNpcEntity = {
                    ...activeInteractionNPC,
                    dynamic: {
                        ...relationUpdate.dynamic,
                        memory: accessedMemory,
                        totalDialogueRounds:
                            (activeInteractionNPC.dynamic.totalDialogueRounds || 0) + 1
                    }
                };

                // 面板已关闭时不强制重新弹出，仅同步状态与对话。
                if (!interactionClosedRef.current) {
                    setActiveInteractionNPC(updatedNPC);
                }
                syncNPCState(updatedNPC);

                if (relationUpdate.delta > 0) {
                    addLog(
                        `${ownerName} 似乎被你的话语打动了。(${relationUpdate.label} +${relationUpdate.delta})`,
                        'success'
                    );
                } else if (relationUpdate.delta < 0) {
                    addLog(
                        `${ownerName} 对你的话感到不悦。(${relationUpdate.label} ${relationUpdate.delta})`,
                        'warning'
                    );
                }

                const basePairs = previousPairs.filter(
                    ([, n]) => n?.tag.thought !== PENDING_TOKEN
                );

                const latestDialogueEntry = createDialogue([
                    ...basePairs,
                    [playerWords, npcWords]
                ]);

                setPlayer(prev => {
                    const cleanPairs = (prev.dialogue?.dialogue ?? []).filter(
                        ([, n]) => n?.tag.thought !== PENDING_TOKEN
                    );

                    return {
                        ...prev,
                        dialogue: {
                            dialogue: [...cleanPairs, [playerWords, npcWords]]
                        }
                    };
                });

                const currentProfileId = updatedNPC.dynamic.mountedProfileId || 'default';
                await PersistenceService.saveNpcMemoryProfile(
                    updatedNPC.static.id,
                    currentProfileId,
                    latestDialogueEntry,
                    updatedNPC.dynamic.memory
                );

                if (result.quest?.desc) {
                    const questTemplate: QuestTemplate = {
                        id: result.quest.id || generateInstanceId('quest'),
                        desc: result.quest.desc,
                        goals: result.quest.goals ?? [],
                        rewards: result.quest.rewards ?? [],
                        difficulty: Math.max(
                            1,
                            Math.floor(safeNumber(result.quest.difficulty, 1))
                        )
                    };
                    const newQuest = createQuest(questTemplate, 'on');

                    setPlayer(prev => {
                        const accepted = prev.questAccepted ?? [];
                        const archived = prev.questArchived ?? [];
                        const duplicated =
                            accepted.some(
                                q => q.id === newQuest.id || q.desc === newQuest.desc
                            ) ||
                            archived.some(
                                q => q.id === newQuest.id || q.desc === newQuest.desc
                            );

                        if (duplicated) return prev;

                        return {
                            ...prev,
                            questAccepted: [...accepted, newQuest]
                        };
                    });

                    addLog(`新的委托已发布到任务列表`, 'event');
                    AudioService.playSfx('success');
                }

                const totalTurns = latestDialogueEntry.dialogue.length;
                const lastSummarizedIndex = updatedNPC.dynamic.memory.δ.reduce(
                    (max, s) => Math.max(max, s.dialogueIndex.end),
                    -1
                );
                const sliceLength = Math.max(
                    1,
                    Math.floor(safeNumber(settings.dialogueSliceLength, 25))
                );
                const unsynthesizedCount = totalTurns - (lastSummarizedIndex + 1);

                if (unsynthesizedCount >= sliceLength) {
                    const startIndex = lastSummarizedIndex + 1;
                    const endIndex = startIndex + sliceLength - 1;
                    const dialoguePairs = latestDialogueEntry.dialogue.slice(
                        startIndex,
                        endIndex + 1
                    );

                    try {
                        const newDelta = await SocializationService.summarizeDialogueSlice({
                            settings,
                            npc: updatedNPC,
                            dialogueHistory: dialoguePairs,
                            startIndex,
                            endIndex,
                            currentTime: player.currentZoneTime,
                            extractor: (s, n, h) =>
                                AiService.extractNpcMemorySummaries(s, n, h)
                        });

                        if (newDelta) {
                            let updatedPyramid = SocializationService.appendDelta(
                                updatedNPC.dynamic.memory,
                                newDelta
                            );

                            const evolvedPyramid = await SocializationService.evolve({
                                settings,
                                npc: {
                                    ...updatedNPC,
                                    dynamic: {
                                        ...updatedNPC.dynamic,
                                        memory: updatedPyramid
                                    }
                                },
                                currentTime: player.currentZoneTime,
                                consolidator: (s, n, m) =>
                                    AiService.consolidateNpcMemories(s, n, m)
                            });

                            if (evolvedPyramid) {
                                updatedPyramid = evolvedPyramid;
                            }

                            const memoryUpdatedNPC: InteractionNpcEntity = {
                                ...updatedNPC,
                                dynamic: {
                                    ...updatedNPC.dynamic,
                                    memory: updatedPyramid
                                }
                            };

                            setActiveInteractionNPC(prev =>
                                prev && prev.static.id === ownerId ? memoryUpdatedNPC : prev
                            );
                            syncNPCState(memoryUpdatedNPC);

                            const profileId =
                                memoryUpdatedNPC.dynamic.mountedProfileId || 'default';
                            await PersistenceService.saveNpcMemoryProfile(
                                memoryUpdatedNPC.static.id,
                                profileId,
                                latestDialogueEntry,
                                updatedPyramid
                            );

                            addLog(
                                `[记忆整合] ${memoryUpdatedNPC.static.name} 整理了与你的近期对话摘要。`,
                                'info'
                            );
                        }
                    } catch {
                        addLog(`[记忆整合] 序列化失败。`, 'warning');
                    }
                }
            } catch (error) {
                setPlayer(prev => {
                    const cleanPairs = (prev.dialogue?.dialogue ?? []).filter(
                        ([, n]) => n?.tag.thought !== PENDING_TOKEN
                    );

                    if (cleanPairs.length === 0) return prev;

                    return {
                        ...prev,
                        dialogue: {
                            dialogue: cleanPairs
                        }
                    };
                });

                const errorMessage =
                    error instanceof Error ? error.message : '未知通信异常';
                addLog(`[通讯链路] 交互中断: ${errorMessage}`, 'warning');
            }
        },
        [
            activeInteractionNPC,
            settings,
            player,
            addLog,
            syncNPCState,
            setActiveInteractionNPC,
            currentZone,
            currentNodeId,
            setPlayer
        ]
    );

    /** 同伴谈心冷却时长（按 absoluteTick 周期计算）。 */
    const HEART_TO_HEART_COOLDOWN_TICKS = 40;
    const companionHeartCooldownRef = useRef<Map<string, number>>(new Map());

    /**
     * 同伴专属交互：谈心。
     *
     * 恢复少量理智（同伴 +15，玩家 +5），带有基于 absoluteTick 的冷却限制。
     */
    const handleCompanionHeartToHeart = useCallback(() => {
        if (!activeInteractionNPC) return;

        const isCompanion = player.companions.some(c => c.static.id === activeInteractionNPC.static.id);
        if (!isCompanion) {
            addLog(`${activeInteractionNPC.static.name} 并非你的同伴，无法进行深层心智交流。`, 'warning');
            AudioService.playSfx('fail');
            return;
        }

        const currentTick = Math.floor(safeNumber(player.currentGameRound?.absoluteTick, 0));
        const lastTick = companionHeartCooldownRef.current.get(activeInteractionNPC.static.id) ?? -Infinity;
        const elapsed = currentTick - lastTick;

        if (elapsed < HEART_TO_HEART_COOLDOWN_TICKS) {
            const remaining = HEART_TO_HEART_COOLDOWN_TICKS - elapsed;
            addLog(`${activeInteractionNPC.static.name} 刚刚才与你倾诉过心声，心智尚需沉淀。（剩余 ${remaining} 周期冷却）`, 'warning');
            AudioService.playSfx('ui_click');
            return;
        }

        companionHeartCooldownRef.current.set(activeInteractionNPC.static.id, currentTick);

        const location = buildCurrentLocation(currentZone, currentNodeId);
        const playerWords = createSocialDialogueRecord(
            player.static.name,
            '(在静谧处与对方促膝深谈，倾听彼此心中的阴霾与执念)',
            location,
            false,
            player.currentZoneTime
        ) as Words<PlayerWordsTag>;

        const npcWords = createSocialDialogueRecord(
            activeInteractionNPC.static.name,
            '(眼中的警惕与戒备渐次融化，长长地呼出一口气) ...说出来以后，脑海里的杂音平息了许多。谢谢你愿意倾听这些。',
            location,
            true,
            player.currentZoneTime,
            'happy'
        ) as Words<NpcWordsTag>;

        setPlayer(prev => ({
            ...prev,
            dialogue: {
                dialogue: [...(prev.dialogue?.dialogue ?? []), [playerWords, npcWords]]
            },
            dynamic: {
                ...prev.dynamic,
                sanity: clamp(safeNumber(prev.dynamic.sanity) + 5, 0, safeNumber(prev.dynamic.maxSanity))
            }
        }));

        const maxSanity = activeInteractionNPC.dynamic.maxSanity;
        const nextSanity = clamp(safeNumber(activeInteractionNPC.dynamic.sanity) + 15, 0, maxSanity);

        // 好感度微量上升
        const relationUpdate = SocializationService.applyRelationDelta(
            {
                ...activeInteractionNPC.dynamic,
                sanity: nextSanity
            },
            2,
            settings
        );

        const updatedCompanion: InteractionNpcEntity = {
            ...activeInteractionNPC,
            dynamic: relationUpdate.dynamic
        };

        setActiveInteractionNPC(updatedCompanion);
        syncNPCState(updatedCompanion);

        addLog(`[谈心] 你与 ${activeInteractionNPC.static.name} 进行了深切交谈，同伴理智恢复 (+15)，心绪逐渐平复。`, 'success');
        AudioService.playSfx('success');
    }, [
        activeInteractionNPC,
        player.companions,
        player.currentGameRound?.absoluteTick,
        player.currentZoneTime,
        player.static.name,
        currentZone,
        currentNodeId,
        settings,
        setPlayer,
        addLog,
        setActiveInteractionNPC,
        syncNPCState
    ]);

    /**
     * 节点 NPC 专属交互：请求委托。
     *
     * 仅在委托面板里无委托时可用；若已有待办委托则进行提示。
     */
    const handleRequestQuest = useCallback(() => {
        if (!activeInteractionNPC) return;

        const isCompanion = player.companions.some(c => c.static.id === activeInteractionNPC.static.id);
        if (isCompanion) {
            addLog(`${activeInteractionNPC.static.name} 已经是队伍成员，请查看其同伴需求。`, 'info');
            return;
        }

        const nodeNpcQuests = (activeInteractionNPC.static as NodeNpcTemplate).initialState?.quests ?? [];
        // 判断是否已有未完成的委托
        const hasPendingOrAcceptedQuest = nodeNpcQuests.some(q => {
            const isAccepted = (player.questAccepted ?? []).some(accepted => accepted.id === q.id);
            const isDone = (player.questArchived ?? []).some(archived => archived.id === q.id && archived.status === 'done');
            return isAccepted || !isDone;
        });

        if (nodeNpcQuests.length > 0 && hasPendingOrAcceptedQuest) {
            addLog(`${activeInteractionNPC.static.name} 已有委托，先完成已有委托吧。`, 'warning');
            AudioService.playSfx('ui_click');
            return;
        }

        // 若当前无委托或已全部做完，向 NPC 发送请求委托的指令
        addLog(`正在向 ${activeInteractionNPC.static.name} 请求委派新任务...`, 'info');
        void handleNPCChat('(向对方询问是否有需要协助处理的重要委托事项)');
    }, [
        activeInteractionNPC,
        player.companions,
        player.questAccepted,
        player.questArchived,
        addLog,
        handleNPCChat
    ]);

    /**
     * 为同伴装备物品。
     */
    const handleCompanionEquipItem = useCallback(
        (item: ItemInstance, slotIndex?: number) => {
            if (!activeInteractionNPC) return;
            if (!isEquipmentInstance(item)) {
                addLog('该物品不是可装备类型。', 'warning');
                return;
            }

            const isCompanion = player.companions.some(c => c.static.id === activeInteractionNPC.static.id);
            if (!isCompanion) {
                addLog('仅能为当前小队同伴调配装备。', 'warning');
                return;
            }

            const itemType: 'weapon' | 'armor' | 'accessory' = isWeaponInstance(item)
                ? 'weapon'
                : isArmorInstance(item)
                    ? 'armor'
                    : 'accessory';

            const companionEquipment = normalizeEquipState(activeInteractionNPC.dynamic.equipment);
            const targetSlot = slotIndex ?? 0;

            // 查找旧装备
            let oldItem: ItemInstance | null = null;
            if (itemType === 'weapon') {
                const weaponSlot = targetSlot === 1 ? 'side' : 'main';
                oldItem = companionEquipment.weapons[weaponSlot];
            } else if (itemType === 'armor') {
                oldItem = companionEquipment.armors[targetSlot] ?? null;
            } else {
                oldItem = companionEquipment.accessories[targetSlot] ?? null;
            }

            // 更新同伴装备
            const nextEquipment = equipItem(companionEquipment, item, itemType, targetSlot);

            // 从玩家背包移除该装备，若有旧装备则退还至玩家背包
            let nextPlayerInventory = removeItemFromInventory(player.dynamic.inventory, item.instanceId);
            if (oldItem) {
                nextPlayerInventory = addUniqueItemToInventory(nextPlayerInventory, stripEquipEffectSnapshot(oldItem));
            }

            // 计算属性/加成更新：回收旧饰品加成，应用新饰品加成
            const nextCompanionDynamic = { ...activeInteractionNPC.dynamic, equipment: nextEquipment };
            if (oldItem && isAccessoryInstance(oldItem)) {
                applyEffectDeltas(nextCompanionDynamic, negateEffectDeltas(getAppliedAccessoryDeltas(oldItem)));
            }
            if (isAccessoryInstance(item)) {
                const itemDeltas = collectAccessoryEffects(item);
                applyEffectDeltas(nextCompanionDynamic, itemDeltas);
            }

            const updatedCompanion: InteractionNpcEntity = {
                ...activeInteractionNPC,
                dynamic: nextCompanionDynamic
            };

            setActiveInteractionNPC(updatedCompanion);
            syncNPCState(updatedCompanion);

            setPlayer(prev => ({
                ...prev,
                dynamic: {
                    ...prev.dynamic,
                    inventory: nextPlayerInventory
                }
            }));

            addLog(
                oldItem
                    ? `同伴 ${activeInteractionNPC.static.name} 替换装备: ${oldItem.name} → ${item.name}`
                    : `为同伴 ${activeInteractionNPC.static.name} 装配模块: ${item.name}`,
                'info'
            );
            AudioService.playSfx('item_equip');
        },
        [activeInteractionNPC, player.companions, player.dynamic.inventory, setPlayer, addLog, setActiveInteractionNPC, syncNPCState]
    );

    /**
     * 为同伴卸下装备。
     */
    const handleCompanionUnequipItem = useCallback(
        (itemType: 'weapon' | 'armor' | 'accessory', slotIndex: number) => {
            if (!activeInteractionNPC) return;

            const isCompanion = player.companions.some(c => c.static.id === activeInteractionNPC.static.id);
            if (!isCompanion) {
                addLog('仅能为当前小队同伴调配装备。', 'warning');
                return;
            }

            const companionEquipment = normalizeEquipState(activeInteractionNPC.dynamic.equipment);

            // 查找要卸下的装备
            let equippedItem: ItemInstance | null = null;
            if (itemType === 'weapon') {
                const weaponSlot = slotIndex === 1 ? 'side' : 'main';
                equippedItem = companionEquipment.weapons[weaponSlot];
            } else if (itemType === 'armor') {
                equippedItem = companionEquipment.armors[slotIndex] ?? null;
            } else {
                equippedItem = companionEquipment.accessories[slotIndex] ?? null;
            }

            if (!equippedItem) {
                addLog('该槽位未装配任何物品。', 'warning');
                return;
            }

            const nextEquipment = unequipItem(companionEquipment, itemType, slotIndex);
            const nextCompanionDynamic = { ...activeInteractionNPC.dynamic, equipment: nextEquipment };

            // 若卸下饰品，回收饰品属性加成
            if (isAccessoryInstance(equippedItem)) {
                applyEffectDeltas(nextCompanionDynamic, negateEffectDeltas(getAppliedAccessoryDeltas(equippedItem)));
            }

            // 退回至玩家背包
            const nextPlayerInventory = addUniqueItemToInventory(
                player.dynamic.inventory,
                stripEquipEffectSnapshot(equippedItem)
            );

            const updatedCompanion: InteractionNpcEntity = {
                ...activeInteractionNPC,
                dynamic: nextCompanionDynamic
            };

            setActiveInteractionNPC(updatedCompanion);
            syncNPCState(updatedCompanion);

            setPlayer(prev => ({
                ...prev,
                dynamic: {
                    ...prev.dynamic,
                    inventory: nextPlayerInventory
                }
            }));

            addLog(`已卸下同伴 ${activeInteractionNPC.static.name} 的模块: ${equippedItem.name}`, 'info');
            AudioService.playSfx('item_unequip');
        },
        [activeInteractionNPC, player.companions, player.dynamic.inventory, setPlayer, addLog, setActiveInteractionNPC, syncNPCState]
    );

    /**
     * 对同伴使用任意消耗品。
     */
    const handleCompanionUseConsumable = useCallback(
        (item: ItemInstance) => {
            if (!activeInteractionNPC) return;
            if (!isConsumableInstance(item)) {
                addLog('该物品不是消耗品。', 'warning');
                return;
            }

            const isCompanion = player.companions.some(c => c.static.id === activeInteractionNPC.static.id);
            if (!isCompanion) {
                addLog('仅能对当前小队同伴使用补给消耗品。', 'warning');
                return;
            }

            const maxHp = safeNumber(activeInteractionNPC.dynamic.maxHp, 100);
            const maxSanity = safeNumber(activeInteractionNPC.dynamic.maxSanity, 100);
            const maxStamina = safeNumber(activeInteractionNPC.dynamic.maxStamina, 100);
            const maxVigor = safeNumber(activeInteractionNPC.dynamic.maxVigor, 100);

            let hpDelta = 0;
            let sanityDelta = 0;
            let staminaDelta = 0;
            let vigorDelta = 0;
            const attributeUpdates: Partial<Record<AttributeType, number>> = {};
            const vitalUpdates: Partial<Record<VitalType, number>> = {};

            const effects = item.effects ?? [];
            for (const effect of effects) {
                const [effectType, rawValue] = effect;
                const value = Math.floor(safeNumber(rawValue));

                switch (effectType) {
                    case 'hp':
                        hpDelta += value;
                        break;
                    case 'sanity':
                        sanityDelta += value;
                        break;
                    case 'stamina':
                        staminaDelta += value;
                        break;
                    case 'vigor':
                        vigorDelta += value;
                        break;
                    default: {
                        const effectKey = effectType as string;
                        if (isAttributeType(effectKey)) {
                            attributeUpdates[effectKey] = safeNumber(attributeUpdates[effectKey] ?? 0) + value;
                        } else if (isVitalType(effectKey)) {
                            vitalUpdates[effectKey] = safeNumber(vitalUpdates[effectKey] ?? 0) + value;
                        }
                    }
                }
            }

            // 计算新的体征与属性
            const nextDynamic = { ...activeInteractionNPC.dynamic };
            if (hpDelta !== 0) {
                nextDynamic.hp = clamp(safeNumber(nextDynamic.hp) + hpDelta, 0, maxHp);
            }
            if (sanityDelta !== 0) {
                nextDynamic.sanity = clamp(safeNumber(nextDynamic.sanity) + sanityDelta, 0, maxSanity);
            }
            if (staminaDelta !== 0) {
                nextDynamic.stamina = clamp(safeNumber(nextDynamic.stamina) + staminaDelta, 0, maxStamina);
            }
            if (vigorDelta !== 0) {
                nextDynamic.vigor = clamp(safeNumber(nextDynamic.vigor) + vigorDelta, 0, maxVigor);
            }

            for (const [attr, val] of Object.entries(attributeUpdates)) {
                if (val !== undefined && isAttributeType(attr)) {
                    nextDynamic[attr] = Math.max(0, safeNumber(nextDynamic[attr]) + val);
                }
            }
            for (const [vital, val] of Object.entries(vitalUpdates)) {
                if (val !== undefined && isVitalType(vital)) {
                    nextDynamic[vital] = Math.max(0, safeNumber(nextDynamic[vital]) + val);
                }
            }

            // 扣除玩家背包中的消耗品
            setPlayer(prev => ({
                ...prev,
                dynamic: {
                    ...prev.dynamic,
                    inventory: removeItemFromInventory(prev.dynamic.inventory, item.instanceId, 1)
                }
            }));

            const updatedCompanion: InteractionNpcEntity = {
                ...activeInteractionNPC,
                dynamic: nextDynamic
            };

            setActiveInteractionNPC(updatedCompanion);
            syncNPCState(updatedCompanion);

            addLog(`已为同伴 ${activeInteractionNPC.static.name} 注入物资: ${item.name}`, 'command');
            if (hpDelta !== 0) {
                addLog(`生命 ${hpDelta >= 0 ? '+' : ''}${hpDelta}`, hpDelta >= 0 ? 'success' : 'warning');
            }
            if (sanityDelta !== 0) {
                addLog(`理智 ${sanityDelta >= 0 ? '+' : ''}${sanityDelta}`, sanityDelta >= 0 ? 'success' : 'warning');
            }
            if (staminaDelta !== 0) {
                addLog(`耐力 ${staminaDelta >= 0 ? '+' : ''}${staminaDelta}`, staminaDelta >= 0 ? 'success' : 'warning');
            }
            if (vigorDelta !== 0) {
                addLog(`活力 ${vigorDelta >= 0 ? '+' : ''}${vigorDelta}`, vigorDelta >= 0 ? 'success' : 'warning');
            }
            AudioService.playSfx('item_use');
        },
        [activeInteractionNPC, player.companions, setPlayer, addLog, setActiveInteractionNPC, syncNPCState]
    );

    const handleNPCTakeItem = useCallback(
        (item: ItemInstance) => {
            if (!activeInteractionNPC) return;

            const updatedInventory = removeItemFromInventory(
                activeInteractionNPC.dynamic.inventory || [],
                item.instanceId,
                1
            );

            const takenItem = {
                ...item,
                quantity: 1
            } as ItemInstance;

            const newNPC: InteractionNpcEntity = {
                ...activeInteractionNPC,
                dynamic: {
                    ...activeInteractionNPC.dynamic,
                    inventory: updatedInventory
                }
            };

            setActiveInteractionNPC(newNPC);
            syncNPCState(newNPC);

            setPlayer(p => ({
                ...p,
                dynamic: {
                    ...p.dynamic,
                    inventory: addItemToInventory(p.dynamic.inventory, takenItem)
                }
            }));

            addLog(`从 ${activeInteractionNPC.static.name} 那里拿走了 ${item.name}`, 'info');
            AudioService.playSfx('ui_click');
        },
        [activeInteractionNPC, setPlayer, addLog, syncNPCState, setActiveInteractionNPC]
    );

    const handleNPCGift = useCallback(
        (item: ItemInstance) => {
            if (!activeInteractionNPC) return;

            setPlayer(p => ({
                ...p,
                dynamic: {
                    ...p.dynamic,
                    inventory: removeItemFromInventory(
                        p.dynamic.inventory,
                        item.instanceId,
                        1
                    )
                }
            }));

            const giftedItem = {
                ...item,
                quantity: 1
            } as ItemInstance;

            const isCompanion = player.companions.some(
                c => c.static.id === activeInteractionNPC.static.id
            );

            // 同伴状态下双方物资处于共享状态，转交给同伴仅作随身保管，不提高好感度。
            if (isCompanion) {
                const newNPC: InteractionNpcEntity = {
                    ...activeInteractionNPC,
                    dynamic: {
                        ...activeInteractionNPC.dynamic,
                        inventory: addItemToInventory(
                            activeInteractionNPC.dynamic.inventory || [],
                            giftedItem
                        )
                    }
                };

                setActiveInteractionNPC(newNPC);
                syncNPCState(newNPC);

                addLog(
                    `已将 ${item.name} 转交给同伴 ${activeInteractionNPC.static.name} 保管。`,
                    'info'
                );
                AudioService.playSfx('ui_click');
                return;
            }

            // 节点 NPC：赠礼权重按稀有度档位结算，深渊 / 禁忌 / 不可名状类物品会激怒对方。
            const relationDelta = SocializationService.getGiftRelationDelta(item, settings);
            const relationUpdate = SocializationService.applyRelationDelta(
                activeInteractionNPC.dynamic,
                relationDelta,
                settings
            );

            const newNPC: InteractionNpcEntity = {
                ...activeInteractionNPC,
                dynamic: {
                    ...relationUpdate.dynamic,
                    inventory: addItemToInventory(
                        relationUpdate.dynamic.inventory || [],
                        giftedItem
                    )
                }
            };

            setActiveInteractionNPC(newNPC);
            syncNPCState(newNPC);

            if (relationUpdate.delta < 0) {
                addLog(
                    `${activeInteractionNPC.static.name} 收到了 ${item.name}，气氛变得有些诡异。(${relationUpdate.label} ${relationUpdate.delta})`,
                    'warning'
                );
                AudioService.playSfx('terrifying');
            } else {
                addLog(
                    `${activeInteractionNPC.static.name} 收到了 ${item.name}。(${relationUpdate.label} +${relationUpdate.delta})`,
                    'success'
                );
                AudioService.playSfx('success');
            }
        },
        [
            activeInteractionNPC,
            setPlayer,
            setActiveInteractionNPC,
            syncNPCState,
            settings,
            addLog,
            player.companions
        ]
    );

    const handleNPCRecruit = useCallback(() => {
        if (!activeInteractionNPC) return;

        const currentNode = getCurrentNode();
        const nodeNpc = currentNode.nodeNpc;
        const isNodeNpc = Boolean(nodeNpc && nodeNpc.id === activeInteractionNPC.static.id);

        if (isNodeNpc && nodeNpc) {
            const canBeInvited = nodeNpc.canBeInvited;

            if (!canBeInvited) {
                addLog(`${activeInteractionNPC.static.name} 不能离开这里。`, 'warning');
                AudioService.playSfx('fail');
                return;
            }

            const recruitRelation = SocializationService.resolveRelation(
                activeInteractionNPC.dynamic
            );

            if (
                typeof canBeInvited.trust === 'number' &&
                recruitRelation.axis === 'trust' &&
                recruitRelation.score < safeNumber(canBeInvited.trust)
            ) {
                addLog(
                    `${activeInteractionNPC.static.name} 还不够信任你（当前阶段：${recruitRelation.phase}），拒绝加入。`,
                    'warning'
                );
                AudioService.playSfx('fail');
                return;
            }

            if (!hasRequiredItems(player.dynamic.inventory, canBeInvited.item)) {
                addLog(`${activeInteractionNPC.static.name} 需要某些物品才愿意加入。`, 'warning');
                AudioService.playSfx('fail');
                return;
            }

            if (!hasArchivedQuests(player, canBeInvited.questsArchived)) {
                addLog(`${activeInteractionNPC.static.name} 在等待某些委托完成。`, 'warning');
                AudioService.playSfx('fail');
                return;
            }

            if (!isSanctuarySafe(player, canBeInvited.isSanctuarySafe)) {
                addLog(
                    `庇护所资源未达到安全线，${activeInteractionNPC.static.name} 不能离开。`,
                    'warning'
                );
                AudioService.playSfx('fail');
                return;
            }

            let replacements: Array<InteractionNpcEntity> = [];

            if (canBeInvited.replacement && canBeInvited.replacement.length > 0) {
                const resolved = resolveReplacements(
                    player.companions,
                    canBeInvited.replacement as ReplacementRequirement[],
                    activeInteractionNPC.static.id
                );

                if (!resolved) {
                    addLog('邀请失败：无法安排合格的替代者。', 'warning');
                    AudioService.playSfx('fail');
                    return;
                }

                // 多岗位回退会返回多名替代者，但节点 nodeNpc 仅能安置一名，
                // 其余替代者会在被移出队伍后永久丢失（装备/信任/记忆全部消失）。
                // 因此只允许"单人胜任全部岗位"的替代方案，否则拒绝且不动任何状态。
                if (resolved.length > 1) {
                    addLog(
                        '邀请失败：需要一名能同时胜任全部岗位的替代者，当前队伍无人满足。',
                        'warning'
                    );
                    AudioService.playSfx('fail');
                    return;
                }

                replacements = resolved;
            }

            /**
             * 入队即转为同伴：模板与动态都切到同伴契约。
             *
             * 契约规定：入队后关系轴由「信任」切换为「好感」，好感从 0 开始重新积累；
             * 节点 NPC 的任务槽位随之让位给同伴需求（needs）。
             */
            const recruitedStatic = safeDeepClone(activeInteractionNPC.static) as NodeNpcTemplate;

            const recruitedInitialState = {
                ...recruitedStatic.initialState
            } as Record<string, unknown>;
            delete recruitedInitialState.quests;

            const recruitedDynamic = safeDeepClone(
                activeInteractionNPC.dynamic
            ) as unknown as Record<string, unknown>;
            delete recruitedDynamic.trust;
            delete recruitedDynamic.quests;

            const newCompanion: Entity<CompanionTemplate, CompanionDynamicState> = {
                static: {
                    ...recruitedStatic,
                    initialState: {
                        ...recruitedInitialState,
                        affinity: 0,
                        needs: []
                    }
                } as unknown as CompanionTemplate,
                dynamic: {
                    ...recruitedDynamic,
                    affinity: 0,
                    needs: []
                } as unknown as CompanionDynamicState
            };

            setPlayer(p => {
                const existingCompanions = p.companions.filter(
                    c => c.static.id !== newCompanion.static.id
                );
                let companions = [...existingCompanions, newCompanion];

                if (replacements.length > 0) {
                    const replacementIds = new Set(replacements.map(r => r.static.id));
                    companions = companions.filter(c => !replacementIds.has(c.static.id));
                }

                return {
                    ...p,
                    companions
                };
            });

            setCurrentZone((prev: Zone) => {
                const node = prev.nodes?.[currentNodeId];
                if (!node) return prev;

                let replacementNodeNpc: NodeNpcTemplate | undefined;
                if (replacements.length > 0) {
                    replacementNodeNpc = safeDeepClone(
                        replacements[0].static
                    ) as NodeNpcTemplate;
                }

                return {
                    ...prev,
                    nodes: {
                        ...prev.nodes,
                        [currentNodeId]: {
                            ...node,
                            nodeNpc: replacementNodeNpc
                        }
                    }
                };
            });

            addLog(`协议达成：${newCompanion.static.name} 加入了小队。`, 'event');
            AudioService.playSfx('success');
            setActiveInteractionNPC(newCompanion);
            syncNPCState(newCompanion);
            return;
        }

        if (player.companions.some(c => c.static.id === activeInteractionNPC.static.id)) {
            addLog(`${activeInteractionNPC.static.name} 已经在队伍中。`, 'info');
            AudioService.playSfx('ui_click');
            return;
        }

        AudioService.playSfx('fail');
        addLog(`${activeInteractionNPC.static.name} 当前不可被招募。`, 'warning');
        setActiveInteractionNPC(prev => (prev ? { ...prev } : null));
    }, [
        activeInteractionNPC,
        setPlayer,
        addLog,
        setActiveInteractionNPC,
        getCurrentNode,
        setCurrentZone,
        currentNodeId,
        syncNPCState,
        player
    ]);

    /**
     * 接取委托 / 同伴需求。
     *
     * 目标持有「委托槽位」的两种合法来源：
     * - 节点 NPC：`NodeNpcTemplate.initialState.quests`（信任轴）；
     * - 同伴：`CompanionDynamicState.needs`（好感轴），结构与 QuestTemplate 一致。
     * 两者都按数组顺序解锁：必须完成前一项才能接取后一项。
     */
    const handleAcceptQuest = useCallback(
        (questId: string, questData: Partial<Quest>) => {
            if (!activeInteractionNPC) return;

            const nodeNpcQuests =
                (activeInteractionNPC.static as NodeNpcTemplate).initialState.quests ?? [];
            const companionNeeds =
                'needs' in activeInteractionNPC.dynamic && Array.isArray(activeInteractionNPC.dynamic.needs)
                    ? activeInteractionNPC.dynamic.needs
                    : ('needs' in activeInteractionNPC.static.initialState &&
                        Array.isArray(activeInteractionNPC.static.initialState.needs)
                        ? activeInteractionNPC.static.initialState.needs
                        : []);
            const npcQuests =
                nodeNpcQuests.length > 0 ? nodeNpcQuests : companionNeeds;
            let template: QuestTemplate;

            if (npcQuests.length > 0) {
                const idx = npcQuests.findIndex(q => q.id === questId);

                if (idx === -1) {
                    addLog('该委托尚未开放。', 'warning');
                    AudioService.playSfx('fail');
                    return;
                }

                if (idx > 0) {
                    const prevQuest = npcQuests[idx - 1];
                    const completed = (player.questArchived ?? []).some(
                        q => q.id === prevQuest.id && q.status === 'done'
                    );

                    if (!completed) {
                        addLog(`需要先完成前置委托：${prevQuest.desc}`, 'warning');
                        AudioService.playSfx('fail');
                        return;
                    }
                }

                template = npcQuests[idx];
            } else {
                template = {
                    id: questData.id || questId || generateInstanceId('quest'),
                    desc: questData.desc || '未命名委托',
                    goals: questData.goals ?? [],
                    rewards: questData.rewards ?? [],
                    difficulty: Math.max(
                        1,
                        Math.floor(safeNumber(questData.difficulty, 1))
                    )
                };
            }

            const newQuest = createQuest(template, 'on');

            const accepted = player.questAccepted ?? [];
            const archived = player.questArchived ?? [];
            const duplicated =
                accepted.some(q => q.id === newQuest.id) ||
                archived.some(q => q.id === newQuest.id);

            if (duplicated) {
                addLog('委托已在任务列表中。', 'info');
                AudioService.playSfx('ui_click');
                return;
            }

            setPlayer(prev => {
                const prevAccepted = prev.questAccepted ?? [];
                const prevArchived = prev.questArchived ?? [];
                const prevDuplicated =
                    prevAccepted.some(q => q.id === newQuest.id) ||
                    prevArchived.some(q => q.id === newQuest.id);

                if (prevDuplicated) return prev;

                return {
                    ...prev,
                    questAccepted: [...prevAccepted, newQuest]
                };
            });

            addLog(`已接取委托: ${newQuest.desc}`, 'event');
            AudioService.playSfx('success');
        },
        [activeInteractionNPC, setPlayer, addLog, player.questAccepted, player.questArchived]
    );

    const closeNPCInteraction = useCallback(() => {
        interactionClosedRef.current = true;
        setActiveInteractionNPC(null);
    }, [setActiveInteractionNPC]);

    const handleMountProfile = useCallback(
        async (profileId: string) => {
            if (!activeInteractionNPC) return;

            const npcId = activeInteractionNPC.static.id;

            try {
                const res = (await PersistenceService.loadNpcMemoryProfile(
                    npcId,
                    profileId
                )) ?? {};

                const loadedMemory = res.memory || createEmptyMemoryPyramid();
                const fallbackDialogue: Dialogue = {
                    dialogue: []
                };
                const loadedDialogue: Dialogue = Array.isArray(res.dialogue)
                    ? (res.dialogue[res.dialogue.length - 1] ?? fallbackDialogue)
                    : (res.dialogue ?? fallbackDialogue);

                const updatedNPC: InteractionNpcEntity = {
                    ...activeInteractionNPC,
                    dynamic: {
                        ...activeInteractionNPC.dynamic,
                        memory: loadedMemory,
                        mountedProfileId: profileId
                    }
                };

                setActiveInteractionNPC(updatedNPC);
                syncNPCState(updatedNPC);

                setPlayer(prev => ({
                    ...prev,
                    dialogue: loadedDialogue
                }));

                addLog(
                    `[人格挂载] 成功绑定人格记忆组: ${res.meta?.name || profileId}`,
                    'event'
                );
                AudioService.playSfx('success');
            } catch {
                addLog(`[人格挂载] 读取人格记忆组失败: ${profileId}`, 'warning');
                AudioService.playSfx('fail');
            }
        },
        [activeInteractionNPC, setActiveInteractionNPC, setPlayer, addLog, syncNPCState]
    );

    const handleUnmountCreateNewProfile = useCallback(
        async (customName?: string) => {
            if (!activeInteractionNPC) return;

            const npcId = activeInteractionNPC.static.id;

            // 档案物理目录采用递增数字序号：memory/<npcId>/1、/2、/3 ...
            // 依据现有档案组计算出下一个可用序号（忽略 default 与随机 ID 目录）。
            const profiles = await PersistenceService.listNpcProfiles(
                npcId
            ).catch(() => [] as NpcProfileMeta[]);
            const numericMax = profiles.reduce((max, p) => {
                const n = Number(p.profileId);
                return Number.isInteger(n) && n > max ? n : max;
            }, 0);
            const newProfileId = String(numericMax + 1);
            const profileName =
                customName?.trim() ||
                `人格组_${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`;

            const emptyMemory = createEmptyMemoryPyramid();
            const emptyDialogue: Dialogue = {
                dialogue: []
            };

            try {
                await PersistenceService.saveNpcMemoryProfile(
                    npcId,
                    newProfileId,
                    emptyDialogue,
                    emptyMemory,
                    profileName
                );

                const updatedNPC: InteractionNpcEntity = {
                    ...activeInteractionNPC,
                    dynamic: {
                        ...activeInteractionNPC.dynamic,
                        memory: emptyMemory,
                        mountedProfileId: newProfileId
                    }
                };

                setActiveInteractionNPC(updatedNPC);
                syncNPCState(updatedNPC);

                setPlayer(prev => ({
                    ...prev,
                    dialogue: emptyDialogue
                }));

                addLog(`[人格新建] 已为您建立全新独立记忆组: ${profileName}`, 'event');
                AudioService.playSfx('ui_click');
            } catch {
                addLog(`[人格新建] 建立独立记忆组失败。`, 'warning');
                AudioService.playSfx('fail');
            }
        },
        [activeInteractionNPC, setActiveInteractionNPC, setPlayer, addLog, syncNPCState]
    );

    const handleDeleteProfile = useCallback(
        async (profileId: string) => {
            if (!activeInteractionNPC) return;

            if (profileId === 'default') {
                addLog(`[人格清理] 默认人格组不可删除。`, 'warning');
                AudioService.playSfx('fail');
                return;
            }

            if (activeInteractionNPC.dynamic.mountedProfileId === profileId) {
                addLog(`[人格清理] 无法删除当前正在挂载的人格组。`, 'warning');
                AudioService.playSfx('fail');
                return;
            }

            const npcId = activeInteractionNPC.static.id;

            try {
                await PersistenceService.deleteNpcProfile(npcId, profileId);
                addLog(`[人格清理] 已删除人格记忆组`, 'info');
                AudioService.playSfx('ui_click');
            } catch {
                addLog(`[人格清理] 删除人格记忆组失败。`, 'warning');
                AudioService.playSfx('fail');
            }
        },
        [activeInteractionNPC, addLog]
    );

    /**
     * 好感离队裁定（契约：好感为负时，每个 absoluteTick 同伴都有概率离开玩家）。
     *
     * 命中离队的同伴会在当前节点转为节点 NPC：
     * - 信任从 0 重新培养（好感不继承，玩家需重新建立信任后再次邀请）；
     * - 个人需求（needs）转为该节点 NPC 的委托槽位（quests），按顺序解锁；
     * - 属性 / 体征 / 装备 / 战术 / 随身物资按离队时的实测值冻结在原地，不静默丢失；
     * - 重新邀请的门槛按「长盟」边界结算：必须先把信任培养到阈值，才可能再次入队。
     *   （契约中「反复离队加大难度」需要持久化的离队计数，当前契约未提供该字段，
     *   故此处以「信任归零 + 高门槛重新邀请」表达其代价。）
     *
     * 当前节点已安置其他节点 NPC（nodeNpc 槽位被占用）时本次不离队，
     * 避免实体与随身物资被静默丢弃。
     */
    const evaluateCompanionDepartures = useCallback(() => {
        const tick = Math.floor(safeNumber(player.currentGameRound.absoluteTick));
        if (lastDepartureTickRef.current === tick) return;
        lastDepartureTickRef.current = tick;

        const leaver = player.companions.find(companion => {
            const affinity = getRelationScore(companion.dynamic);
            return affinity < 0 && SocializationService.shouldCompanionLeave(affinity);
        });
        if (!leaver) return;

        const node = currentZone.nodes?.[currentNodeId];
        if (!node || node.nodeNpc) return;

        const { dynamic } = leaver;
        const departedNeeds = safeDeepClone(
            dynamic.needs ?? leaver.static.initialState.needs ?? []
        );

        const nodeNpc = {
            ...safeDeepClone(leaver.static),
            initialState: {
                attribute: {
                    strength: safeNumber(dynamic.strength),
                    agility: safeNumber(dynamic.agility),
                    wisdom: safeNumber(dynamic.wisdom),
                    awareness: safeNumber(dynamic.awareness),
                    will: safeNumber(dynamic.will),
                    cthulhu: safeNumber(dynamic.cthulhu)
                },
                vital: {
                    maxHp: safeNumber(dynamic.maxHp),
                    maxSanity: safeNumber(dynamic.maxSanity),
                    maxStamina: safeNumber(dynamic.maxStamina),
                    maxVigor: safeNumber(dynamic.maxVigor)
                },
                equipState: safeDeepClone(dynamic.equipment),
                inventory: safeDeepClone(dynamic.inventory ?? []),
                uniqueTactic: safeDeepClone(dynamic.tactics ?? []),
                trust: 0,
                quests: departedNeeds
            },
            canBeInvited: {
                trust: safeNumber(
                    settings.gameConfig.social.thresholds.trustHigh,
                    60
                )
            }
        } as unknown as NodeNpcTemplate;

        const leaverName = leaver.static.name;
        const affinity = Math.floor(getRelationScore(leaver.dynamic));

        setPlayer(p => ({
            ...p,
            companions: p.companions.filter(c => c.static.id !== leaver.static.id)
        }));

        setCurrentZone((prev: Zone) => {
            const current = prev.nodes?.[currentNodeId];
            if (!current) return prev;

            return {
                ...prev,
                nodes: {
                    ...prev.nodes,
                    [currentNodeId]: { ...current, nodeNpc }
                }
            };
        });

        if (activeInteractionNPC?.static.id === leaver.static.id) {
            closeNPCInteraction();
        }

        addLog(
            `[关系断裂] ${leaverName} 的好感已跌至 ${affinity}，脱离了小队，并在当前区域重新落脚。重建信任后方可再次邀请。`,
            'critical'
        );
        AudioService.playSfx('event_npc_leave');
    }, [
        player.companions,
        player.currentGameRound.absoluteTick,
        currentZone.nodes,
        currentNodeId,
        activeInteractionNPC,
        closeNPCInteraction,
        settings,
        setPlayer,
        setCurrentZone,
        addLog
    ]);

    return {
        activeInteractionNPC,
        setActiveInteractionNPC,
        handleNPCChat,
        handleCompanionHeartToHeart,
        handleRequestQuest,
        handleNPCTakeItem,
        handleNPCGift,
        handleNPCRecruit,
        handleCompanionEquipItem,
        handleCompanionUnequipItem,
        handleCompanionUseConsumable,
        handleAcceptQuest,
        closeNPCInteraction,
        handleMountProfile,
        handleUnmountCreateNewProfile,
        handleDeleteProfile,
        evaluateCompanionDepartures
    };
};