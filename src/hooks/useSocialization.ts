import { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type {
    PlayerState,
    Node,
    Zone,
    Settings,
    Quest,
    ItemInstance,
    NpcTemplate,
    NpcDynamicState,
    Entity,
    Words,
    PlayerWordsTag,
    NpcWordsTag,
    CurrentLocation,
    SanctuaryState,
    Dialogue,
    Mood,
    ZoneDate,
    NpcDialogueGenerationContext,
    LogType,
    ConsumableEffectType,
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
    buildCurrentLocation,
    clamp,
    createEmptyMemoryPyramid,
    safeNumber,
    getPercent,
    getEffectValueByType,
    generateInstanceId,
    safeDeepClone
} from '../meta';
import {
    AudioService,
    AiService,
    SocializationService,
    PersistenceService
} from '../services';
import type { NpcProfileMeta } from '../services/PersistenceService';

// ——— 由 meta/utils.ts 迁移而来（本文件唯一使用方） ———
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
    activeInteractionNPC: Entity<NpcTemplate, NpcDynamicState> | null;
    setActiveInteractionNPC: Dispatch<
        SetStateAction<Entity<NpcTemplate, NpcDynamicState> | null>
    >;
}

interface UseSocializationReturn {
    activeInteractionNPC: Entity<NpcTemplate, NpcDynamicState> | null;
    setActiveInteractionNPC: Dispatch<
        SetStateAction<Entity<NpcTemplate, NpcDynamicState> | null>
    >;
    handleNPCChat: (message: string) => Promise<void>;
    handleLocalNPCAction: (actionType: 'hug' | 'heal') => void;
    handleNPCTakeItem: (item: ItemInstance) => void;
    handleNPCGift: (item: ItemInstance) => void;
    handleNPCRecruit: () => void;
    handleNPCIntimacy: () => Promise<void>;
    handleAcceptQuest: (questId: string, questData: Partial<Quest>) => void;
    closeNPCInteraction: () => void;
    handleMountProfile: (profileId: string) => Promise<void>;
    handleUnmountCreateNewProfile: (customName?: string) => Promise<void>;
    handleDeleteProfile: (profileId: string) => Promise<void>;
}

interface NpcDialogueAiResult {
    text?: string;
    modelThought?: string;
    thought?: string;
    mood?: Mood;
    trustChange?: number;
    quest?: Partial<QuestTemplate> & { desc?: string };
}

interface NpcIntimacyAiResult {
    desc?: string;
    vocal?: string;
    thought?: string;
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

const hasConsumableEffect = (
    item: ItemInstance,
    effectType: ConsumableEffectType
): boolean =>
    isConsumableInstance(item) &&
    (item.effects ?? []).some(effect => effect[0] === effectType);

const getConsumableEffectValue = (
    item: ItemInstance,
    effectType: ConsumableEffectType
): number => (isConsumableInstance(item) ? getEffectValueByType(item, effectType) : 0);

const hasRequiredItems = (inventory: ItemInstance[], ids?: string[]): boolean => {
    if (!ids || ids.length === 0) return true;
    return ids.every(id => inventory.some(item => item.id === id));
};

const hasArchivedQuests = (player: PlayerState, ids?: string[]): boolean => {
    if (!ids || ids.length === 0) return true;
    return ids.every(id => (player.questArchived ?? []).some(q => q.id === id));
};

const isSanctuarySafe = (
    player: PlayerState,
    requirements?: Partial<Record<keyof SanctuaryState, number>>
): boolean => {
    if (!requirements) return true;
    const sanctuary = player.sanctuary;
    if (!sanctuary) return false;

    return Object.entries(requirements).every(([key, minValue]) => {
        const current = safeNumber(sanctuary[key as keyof SanctuaryState]);
        const required = safeNumber(minValue);
        return current >= required;
    });
};

const matchesReplacementRequirement = (
    companion: Entity<NpcTemplate, NpcDynamicState>,
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
    companions: Array<Entity<NpcTemplate, NpcDynamicState>>,
    requirements: ReplacementRequirement[] | undefined,
    excludeId: string
): Array<Entity<NpcTemplate, NpcDynamicState>> | null => {
    if (!requirements || requirements.length === 0) return [];

    const candidates = companions
        .filter(c => c.static.id !== excludeId)
        .sort((a, b) => safeNumber(b.dynamic.trust) - safeNumber(a.dynamic.trust));

    const single = candidates.find(c =>
        requirements.every(req => matchesReplacementRequirement(c, req))
    );
    if (single) return [single];

    const assigned: Array<Entity<NpcTemplate, NpcDynamicState>> = [];
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
     * - 同伴列表承载完整 Entity。
     * - 节点 nodeNpc 只能合法承载静态模板，因此这里只同步 trust 到 initialState。
     */
    /**
     * 面板会话会写入、且不应被外部系统（战斗/休息/升级）覆盖的 dynamic 字段。
     * 其余字段（stamina/vigor/属性/等级/xp/战术/装备等）一律保留
     * companions 中现有实体的最新值，避免快照回滚外部修改。
     */
    const SESSION_DYNAMIC_FIELDS = [
        'hp',
        'sanity',
        'trust',
        'totalDialogueRounds',
        'memory',
        'mountedProfileId',
        'inventory',
        'imageUrl',
        'videoUrl',
        'audioUrl',
    ] as const;

    const syncNPCState = useCallback(
        (npc: Entity<NpcTemplate, NpcDynamicState>) => {
            const npcId = npc.static.id;

            setPlayer(p => {
                if (!p.companions.some(c => c.static.id === npcId)) return p;

                return {
                    ...p,
                    companions: p.companions.map(c => {
                        if (c.static.id !== npcId) return c;

                        // 字段级合并：以现有实体为基础，仅覆盖本会话写入的字段。
                        const merged = { ...c.dynamic } as NpcDynamicState;
                        for (const key of SESSION_DYNAMIC_FIELDS) {
                            const value = (npc.dynamic as unknown as Record<string, unknown>)[key];
                            if (value !== undefined) {
                                (merged as unknown as Record<string, unknown>)[key] = value;
                            }
                        }
                        merged.hp = clamp(safeNumber(merged.hp), 0, safeNumber(merged.maxHp));
                        merged.sanity = clamp(
                            safeNumber(merged.sanity),
                            0,
                            safeNumber(merged.maxSanity)
                        );
                        merged.trust = SocializationService.clampTrust(
                            safeNumber(merged.trust),
                            settings
                        );
                        return { ...c, static: c.static, dynamic: merged };
                    })
                };
            });

            setCurrentZone((prev: Zone) => {
                const node = prev.nodes?.[currentNodeId];
                if (!node?.nodeNpc) return prev;
                if (node.nodeNpc.id !== npc.static.id) return prev;

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
                                    trust: npc.dynamic.trust
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

            const context: NpcDialogueGenerationContext = {
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

                const trustDelta = Math.floor(safeNumber(result.trustChange));
                const finalTrust = SocializationService.clampTrust(
                    activeInteractionNPC.dynamic.trust + trustDelta,
                    settings
                );

                const updatedNPC: Entity<NpcTemplate, NpcDynamicState> = {
                    ...activeInteractionNPC,
                    dynamic: {
                        ...activeInteractionNPC.dynamic,
                        trust: finalTrust,
                        totalDialogueRounds:
                            (activeInteractionNPC.dynamic.totalDialogueRounds || 0) + 1
                    }
                };

                // 面板已关闭时不强制重新弹出，仅同步状态与对话。
                if (!interactionClosedRef.current) {
                    setActiveInteractionNPC(updatedNPC);
                }
                syncNPCState(updatedNPC);

                if (trustDelta > 0) {
                    addLog(
                        `${ownerName} 似乎被你的话语打动了。(好感 +${trustDelta})`,
                        'success'
                    );
                } else if (trustDelta < 0) {
                    addLog(
                        `${ownerName} 对你的话感到不悦。(好感 ${trustDelta})`,
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

                            const memoryUpdatedNPC: Entity<NpcTemplate, NpcDynamicState> = {
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

    const handleLocalNPCAction = useCallback(
        (actionType: 'hug' | 'heal') => {
            if (!activeInteractionNPC) return;

            let responseText = '';
            let playerText = '';
            let npcUpdate: {
                hp?: number;
                sanity?: number;
                trust?: number;
            } = {};

            const maxHp = activeInteractionNPC.dynamic.maxHp;
            const maxSanity = activeInteractionNPC.dynamic.maxSanity;

            const findMedicine = (effectType: ConsumableEffectType) =>
                player.dynamic.inventory.find(item => hasConsumableEffect(item, effectType));

            switch (actionType) {
                case 'hug': {
                    playerText = '(试图给一个拥抱)';
                    const currentTrust = activeInteractionNPC.dynamic.trust;

                    if (
                        currentTrust >=
                        safeNumber(settings.gameConfig.social.thresholds.trustHigh, 65)
                    ) {
                        responseText = '(紧紧回抱住你，身体在微微颤抖) ...别放手，求你了。';
                        npcUpdate = {
                            sanity: Math.min(
                                maxSanity,
                                activeInteractionNPC.dynamic.sanity +
                                safeNumber(
                                    settings.gameConfig.social.benefits.hugSanityGainHigh
                                )
                            )
                        };
                    } else if (
                        currentTrust >=
                        safeNumber(settings.gameConfig.social.thresholds.trustLow, 25)
                    ) {
                        responseText = '(身体僵硬了一下，但没有推开) ...谢谢。我没事。';
                        npcUpdate = {
                            sanity: Math.min(
                                maxSanity,
                                activeInteractionNPC.dynamic.sanity +
                                safeNumber(
                                    settings.gameConfig.social.benefits.hugSanityGainLow
                                )
                            )
                        };
                    } else {
                        responseText =
                            '(猛地退后一步，警惕地看着你) ...保持距离。我不习惯这样。';
                        npcUpdate = {
                            trust: SocializationService.clampTrust(
                                currentTrust -
                                safeNumber(
                                    settings.gameConfig.social.benefits.hugTrustPenalty
                                ),
                                settings
                            )
                        };
                    }
                    break;
                }

                case 'heal': {
                    playerText = '(尝试进行治疗)';

                    const hpPercent = getPercent(
                        activeInteractionNPC.dynamic.hp,
                        maxHp
                    );
                    const sanityPercent = getPercent(
                        activeInteractionNPC.dynamic.sanity,
                        maxSanity
                    );
                    const sanityHigh = safeNumber(
                        settings.gameConfig.social.vitals.sanityHigh,
                        70
                    );

                    const needsHp = activeInteractionNPC.dynamic.hp < maxHp;
                    const needsSanity =
                        activeInteractionNPC.dynamic.sanity < maxSanity &&
                        sanityPercent < sanityHigh;

                    const shouldHealHp =
                        needsHp && (!needsSanity || hpPercent <= sanityPercent);

                    if (shouldHealHp) {
                        const hpMeds = findMedicine('heal_hp');

                        if (hpMeds) {
                            const healVal =
                                getConsumableEffectValue(hpMeds, 'heal_hp') ||
                                safeNumber(
                                    settings.gameConfig.social.benefits.healValueDefault,
                                    20
                                );

                            npcUpdate = {
                                hp: Math.min(
                                    maxHp,
                                    activeInteractionNPC.dynamic.hp + healVal
                                ),
                                trust: SocializationService.clampTrust(
                                    activeInteractionNPC.dynamic.trust +
                                    safeNumber(
                                        settings.gameConfig.social.benefits.healTrustGain
                                    ),
                                    settings
                                )
                            };

                            responseText = `(使用了 ${hpMeds.name}) 伤口得到了处理，看起来好多了。`;

                            setPlayer(p => ({
                                ...p,
                                dynamic: {
                                    ...p.dynamic,
                                    inventory: removeItemFromInventory(
                                        p.dynamic.inventory,
                                        hpMeds.instanceId,
                                        1
                                    )
                                }
                            }));

                            AudioService.playSfx('success');
                        } else {
                            responseText = '(翻遍了背包) ...该死，我没有治疗外伤的药物了。';
                            AudioService.playSfx('ui_click');
                        }
                    } else if (needsSanity) {
                        const sanMeds = findMedicine('heal_sanity');

                        if (sanMeds) {
                            const healVal =
                                getConsumableEffectValue(sanMeds, 'heal_sanity') ||
                                safeNumber(
                                    settings.gameConfig.social.benefits.healValueDefault,
                                    20
                                );

                            npcUpdate = {
                                sanity: Math.min(
                                    maxSanity,
                                    activeInteractionNPC.dynamic.sanity + healVal
                                ),
                                trust: SocializationService.clampTrust(
                                    activeInteractionNPC.dynamic.trust +
                                    safeNumber(
                                        settings.gameConfig.social.benefits.healTrustGain
                                    ),
                                    settings
                                )
                            };

                            responseText = `(使用了 ${sanMeds.name}) 精神状态似乎稳定了一些。`;

                            setPlayer(p => ({
                                ...p,
                                dynamic: {
                                    ...p.dynamic,
                                    inventory: removeItemFromInventory(
                                        p.dynamic.inventory,
                                        sanMeds.instanceId,
                                        1
                                    )
                                }
                            }));

                            AudioService.playSfx('success');
                        } else {
                            responseText = '(翻遍了背包) ...我没有能安抚精神的药物了。';
                            AudioService.playSfx('ui_click');
                        }
                    } else {
                        responseText = '看起来非常健康，不需要浪费药物。';
                    }
                    break;
                }
            }

            if (playerText) {
                addLog(`[动作] ${playerText}`, 'info');
            }

            if (responseText) {
                addLog(`${activeInteractionNPC.static.name}: ${responseText}`, 'info');
            }

            if (Object.keys(npcUpdate).length > 0) {
                const newNPC: Entity<NpcTemplate, NpcDynamicState> = {
                    ...activeInteractionNPC,
                    dynamic: {
                        ...activeInteractionNPC.dynamic,
                        ...npcUpdate
                    }
                };

                newNPC.dynamic.hp = clamp(newNPC.dynamic.hp, 0, newNPC.dynamic.maxHp);
                newNPC.dynamic.sanity = clamp(
                    newNPC.dynamic.sanity,
                    0,
                    newNPC.dynamic.maxSanity
                );
                newNPC.dynamic.trust = SocializationService.clampTrust(
                    newNPC.dynamic.trust,
                    settings
                );

                setActiveInteractionNPC(newNPC);
                syncNPCState(newNPC);
            }
        },
        [
            activeInteractionNPC,
            player.dynamic.inventory,
            setPlayer,
            setActiveInteractionNPC,
            syncNPCState,
            settings,
            addLog
        ]
    );

    const handleNPCIntimacy = useCallback(async () => {
        if (!activeInteractionNPC) return;

        const requiredTrust = safeNumber(
            settings.gameConfig.social.thresholds.trustHigh,
            65
        );

        if (activeInteractionNPC.dynamic.trust < requiredTrust) {
            addLog(
                `${activeInteractionNPC.static.name} 还没有足够信任你，拒绝了亲密接触。`,
                'warning'
            );
            AudioService.playSfx('fail');
            return;
        }

        addLog(`与 ${activeInteractionNPC.static.name} 的深度连接建立中...`, 'event');

        try {
            const result =
                (await AiService.generateNPCIntimacy(
                    settings,
                    activeInteractionNPC
                )) as NpcIntimacyAiResult;

            const location = buildCurrentLocation(currentZone, currentNodeId);
            const desc =
                typeof result.desc === 'string' && result.desc.trim() !== ''
                    ? result.desc
                    : '……';

            const playerWords = createSocialDialogueRecord(
                player.static.name,
                '(进行亲密接触)',
                location,
                false,
                player.currentZoneTime
            ) as Words<PlayerWordsTag>;

            const npcWords = createSocialDialogueRecord(
                activeInteractionNPC.static.name,
                desc,
                location,
                true,
                player.currentZoneTime,
                'happy',
                result.thought
            ) as Words<NpcWordsTag>;

            setPlayer(prev => ({
                ...prev,
                dialogue: {
                    dialogue: [...(prev.dialogue?.dialogue ?? []), [playerWords, npcWords]]
                }
            }));

            if (result.vocal) {
                const voiceName =
                    activeInteractionNPC.static.gender === 'female' ? 'Kore' : 'Fenrir';
                const currentNode = getCurrentNode();

                addLog(`接收到生物音频信号(${voiceName})...`, 'ai-gen');

                const audioContext = {
                    zoneId: currentZone.id,
                    nodeId: currentNodeId,
                    zoneName: currentZone.name,
                    nodeName: currentNode.name,
                    entityName: activeInteractionNPC.static.name,
                    strength: player.dynamic.strength,
                    agility: player.dynamic.agility,
                    wisdom: player.dynamic.wisdom,
                    perception: player.dynamic.perception
                };

                const audioData = await AiService.generateSpeech(
                    settings,
                    result.vocal,
                    audioContext,
                    voiceName
                );

                if (audioData) {
                    AudioService.playPCM(audioData);
                }
            }

            const newTrust = SocializationService.clampTrust(
                activeInteractionNPC.dynamic.trust +
                safeNumber(settings.gameConfig.social.benefits.intimacyTrustGain),
                settings
            );

            const newSanity = clamp(
                activeInteractionNPC.dynamic.sanity +
                safeNumber(settings.gameConfig.social.benefits.intimacySanityGain),
                0,
                activeInteractionNPC.dynamic.maxSanity
            );

            const updatedNPC: Entity<NpcTemplate, NpcDynamicState> = {
                ...activeInteractionNPC,
                dynamic: {
                    ...activeInteractionNPC.dynamic,
                    trust: newTrust,
                    sanity: newSanity
                }
            };

            setActiveInteractionNPC(updatedNPC);
            syncNPCState(updatedNPC);

            setPlayer(p => ({
                ...p,
                dynamic: {
                    ...p.dynamic,
                    sanity: clamp(
                        p.dynamic.sanity +
                        safeNumber(
                            settings.gameConfig.social.benefits.intimacyPlayerSanityGain
                        ),
                        0,
                        p.dynamic.maxSanity
                    )
                }
            }));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            addLog(`连接意外中断: ${errorMessage}`, 'warning');
        }
    }, [
        activeInteractionNPC,
        settings,
        currentZone,
        currentNodeId,
        addLog,
        setActiveInteractionNPC,
        syncNPCState,
        setPlayer,
        player,
        getCurrentNode
    ]);

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

            const newNPC: Entity<NpcTemplate, NpcDynamicState> = {
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

            let trustGain = safeNumber(settings.gameConfig.social.benefits.giftTrustBase);

            if (item.rarity === 'organized') {
                trustGain = safeNumber(settings.gameConfig.social.benefits.giftTrustRare);
            }

            if (item.rarity === 'deep') {
                trustGain = safeNumber(settings.gameConfig.social.benefits.giftTrustEpic);
            }

            if (item.rarity === 'abyssal') {
                trustGain = -Math.abs(
                    safeNumber(settings.gameConfig.social.benefits.giftTrustBase)
                );
            } else if (item.type === 'consumable') {
                trustGain += safeNumber(
                    settings.gameConfig.social.benefits.giftTrustConsumableBonus
                );
            }

            const newTrust = SocializationService.clampTrust(
                activeInteractionNPC.dynamic.trust + trustGain,
                settings
            );

            const giftedItem = {
                ...item,
                quantity: 1
            } as ItemInstance;

            const newNPC: Entity<NpcTemplate, NpcDynamicState> = {
                ...activeInteractionNPC,
                dynamic: {
                    ...activeInteractionNPC.dynamic,
                    trust: newTrust,
                    inventory: addItemToInventory(
                        activeInteractionNPC.dynamic.inventory || [],
                        giftedItem
                    )
                }
            };

            setActiveInteractionNPC(newNPC);
            syncNPCState(newNPC);

            if (item.rarity === 'abyssal') {
                addLog(
                    `${activeInteractionNPC.static.name} 收到了 ${item.name}，气氛变得有些诡异。`,
                    'warning'
                );
                AudioService.playSfx('terrifying');
            } else {
                addLog(
                    `${activeInteractionNPC.static.name} 收到了 ${item.name}，好感度提升。`,
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
            addLog
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

            if (
                typeof canBeInvited.trust === 'number' &&
                activeInteractionNPC.dynamic.trust < safeNumber(canBeInvited.trust)
            ) {
                addLog(
                    `${activeInteractionNPC.static.name} 还不够信任你，拒绝加入。`,
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

            let replacements: Array<Entity<NpcTemplate, NpcDynamicState>> = [];

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

            const newCompanion: Entity<NpcTemplate, NpcDynamicState> = {
                static: safeDeepClone(activeInteractionNPC.static),
                dynamic: safeDeepClone(activeInteractionNPC.dynamic)
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

    const handleAcceptQuest = useCallback(
        (questId: string, questData: Partial<Quest>) => {
            if (!activeInteractionNPC) return;

            const npcQuests = activeInteractionNPC.static.initialState.quest ?? [];
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

                const updatedNPC: Entity<NpcTemplate, NpcDynamicState> = {
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

                const updatedNPC: Entity<NpcTemplate, NpcDynamicState> = {
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

    return {
        activeInteractionNPC,
        setActiveInteractionNPC,
        handleNPCChat,
        handleLocalNPCAction,
        handleNPCTakeItem,
        handleNPCGift,
        handleNPCRecruit,
        handleNPCIntimacy,
        handleAcceptQuest,
        closeNPCInteraction,
        handleMountProfile,
        handleUnmountCreateNewProfile,
        handleDeleteProfile
    };
};