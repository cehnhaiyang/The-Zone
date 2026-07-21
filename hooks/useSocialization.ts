import React, { useCallback } from 'react';
import { PlayerState, Node, Zone, Settings, Quest, ItemInstance, NpcTemplate, NpcDynamicState, Entity, Words, PlayerWordsTag, NpcWordsTag, Loc, SanctuaryState, removeItemFromInventory, addItemToInventory, isConsumableInstance, LogType, ConsumableEffectType, Dialogue, Mood, ZoneDate, NpcDialogueGenerationContext } from '../meta';
import { AudioService, AiService, SocializationService, PersistenceService } from '../services';

interface UseSocializationParams {
    player: PlayerState;
    setPlayer: React.Dispatch<React.SetStateAction<PlayerState>>;
    addLog: (text: string, type: LogType) => void;
    settings: Settings;
    getCurrentNode: () => Node;
    currentNodeId: string;
    setCurrentZone: React.Dispatch<React.SetStateAction<Zone>>;
    currentZone: Zone;
    activeInteractionNPC: Entity<NpcTemplate, NpcDynamicState> | null;
    setActiveInteractionNPC: React.Dispatch<React.SetStateAction<Entity<NpcTemplate, NpcDynamicState> | null>>;
}

interface UseSocializationReturn {
    activeInteractionNPC: Entity<NpcTemplate, NpcDynamicState> | null;
    setActiveInteractionNPC: React.Dispatch<React.SetStateAction<Entity<NpcTemplate, NpcDynamicState> | null>>;
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

const createDialogueRecord = (
    speakerName: string,
    text: string,
    location: Loc,
    isNPC: boolean,
    time: ZoneDate,
    mood?: Mood,
    thought?: string
): Words<PlayerWordsTag> | Words<NpcWordsTag> =>
    isNPC
        ? { text, thought, tag: { type: 'npc', speakerName, mood: mood || 'neutral' } }
        : { text, thought, tag: { type: 'player', speakerName, location, currentTime: time } };

const getConsumableEffects = (item: ItemInstance): Array<{ effectType: ConsumableEffectType; effectValue: number; duration?: number }> =>
    isConsumableInstance(item) ? item.effects.map(effect => ({ effectType: effect[0], effectValue: effect[1], duration: effect[2] })) : [];

const createDialogue = (npcId: string, npcName: string, dialogueRecords: Array<[Words<PlayerWordsTag>, Words<NpcWordsTag>]>): Dialogue =>
    ({ owner: { id: npcId, name: npcName }, dialogue: dialogueRecords });

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
     * NPC 状态镜像同步机制
     * 由于同伴与场景节点的 NPC 指向不同的内存引用栈，必须通过拦截器同步属性，防止状态割裂。
     */
    const syncNPCState = useCallback((npc: Entity<NpcTemplate, NpcDynamicState>) => {
        const npcId = npc.static.id;

        setPlayer(p => {
            if (p.companions.some(c => c.static.id === npcId)) {
                return {
                    ...p,
                    companions: p.companions.map(c =>
                        c.static.id === npcId ? npc : c
                    )
                };
            }
            return p;
        });

        setCurrentZone((prev: Zone) => {
            const node = prev.nodes?.[currentNodeId];
            if (!node || !node.nodeNpc) return prev;

            if (node.nodeNpc.id === npc.static.id) {
                return {
                    ...prev,
                    nodes: {
                        ...prev.nodes,
                        [currentNodeId]: {
                            ...node,
                            nodeNpc: npc.static
                        }
                    }
                };
            }
            return prev;
        });
    }, [setPlayer, setCurrentZone, currentNodeId]);

    /**
     * 语义节点交互求值
     * 接管输入并桥接至 LLM 生成管线，维持对话上下文。
     */
    const handleNPCChat = useCallback(async (message: string) => {
        if (!activeInteractionNPC) return;

        const currentNode = getCurrentNode();

        // Sanctuary 顶层字段为运行时状态真相来源，initial 为只读模板，不可作为数据源
        let sanctuaryData: SanctuaryState | undefined = undefined;
        if (player.sanctuary && 'storage' in player.sanctuary) {
            const { food, water, medicine, electricity, scraps, population, morale, erosion } = player.sanctuary;
            sanctuaryData = { food, water, medicine, electricity, scraps, population, morale, erosion };
        }

        const location: Loc = {
            zone: {
                id: currentZone.id,
                name: currentZone.name,
                desc: {
                    background: currentZone.background,
                    topology: currentZone.topology,
                    nodesCount: currentZone.nodesCount,
                    visualStyle: currentZone.visualStyle
                },
                isSanctuary: sanctuaryData
            },
            node: {
                id: currentNodeId,
                name: currentNode.name,
                desc: currentNode.desc
            }
        };

        const playerWords = createDialogueRecord(
            player.static.name,
            message,
            location,
            false,
            player.currentZoneTime
        ) as Words<PlayerWordsTag>;

        // NPC 槽位空占位符——AI 返回前先预占位置，保证 playerWords 立即落盘
        const placeholderNpcWords: Words<NpcWordsTag> = {
            text: '',
            tag: { type: 'npc', speakerName: activeInteractionNPC.static.name, mood: 'neutral' }
        };

        setPlayer(prev => {
            const existingIndex = prev.dialogue.findIndex(d => d.owner?.id === activeInteractionNPC.static.id);
            const updatedDialogue = [...prev.dialogue];
            if (existingIndex > -1) {
                updatedDialogue[existingIndex] = {
                    ...updatedDialogue[existingIndex],
                    dialogue: [...updatedDialogue[existingIndex].dialogue, [playerWords, placeholderNpcWords]]
                };
            } else {
                updatedDialogue.push(createDialogue(
                    activeInteractionNPC.static.id,
                    activeInteractionNPC.static.name,
                    [[playerWords, placeholderNpcWords]]
                ));
            }
            return { ...prev, dialogue: updatedDialogue };
        });

        // mergedDialogueHistory 追加当前轮（含占位符），使 extractLastPlayerInput 能正确读到本次输入
        const allRelevantDialogues = player.dialogue.filter(d => d.owner?.id === activeInteractionNPC.static.id);
        const mergedDialogueHistory: Dialogue = {
            owner: { id: activeInteractionNPC.static.id, name: activeInteractionNPC.static.name },
            dialogue: [
                ...allRelevantDialogues.reduce((acc, curr) => [...acc, ...curr.dialogue], [] as Array<[Words<PlayerWordsTag>, Words<NpcWordsTag>]>),
                [playerWords, placeholderNpcWords]
            ]
        };

        const context: NpcDialogueGenerationContext = {
            dialogue: mergedDialogueHistory,
            npc: activeInteractionNPC,
            player: { static: player.static, dynamic: player.dynamic },
            location: location
        };

        try {
            const result = await AiService.generateNPCDialogue(
                settings,
                context
            );

            let npcWords: Words<NpcWordsTag> | null = null;
            if (result.text) {
                const combinedThought = [result.modelThought, result.thought].filter(Boolean).join('\n\n');

                npcWords = createDialogueRecord(
                    activeInteractionNPC.static.name,
                    result.text,
                    location,
                    true,
                    player.currentZoneTime,
                    result.mood,
                    combinedThought
                ) as Words<NpcWordsTag>;
            }

            const trustDelta = result.trustChange || 0;
            const currentTrust = activeInteractionNPC.dynamic.trust;
            const finalTrust = Math.min(
                settings.gameConfig.social.thresholds.trustMax,
                Math.max(settings.gameConfig.social.thresholds.trustMin, currentTrust + trustDelta)
            );

            if (trustDelta > 0) {
                addLog(`${activeInteractionNPC.static.name} 似乎被你的话语打动了。(好感 +${trustDelta})`, "success");
            } else if (trustDelta < 0) {
                addLog(`${activeInteractionNPC.static.name} 对你的话感到不悦。(好感 ${trustDelta})`, "warning");
            }

            const finalNPC = {
                ...activeInteractionNPC,
                dynamic: {
                    ...activeInteractionNPC.dynamic,
                    trust: finalTrust
                }
            };

            setActiveInteractionNPC(finalNPC);
            syncNPCState(finalNPC);

            if (npcWords) {
                // 1. 同步计算包含了本次 [playerWords, npcWords] 的完整 Dialogue 实体
                const existingIdx = player.dialogue.findIndex(d => d.owner?.id === activeInteractionNPC.static.id);
                let latestDialogueEntry: Dialogue;

                if (existingIdx > -1) {
                    const entry = player.dialogue[existingIdx];
                    // 过滤掉临时占位槽位 placeholderNpcWords，拼接本次推演完成的正式 pair
                    const cleanPairs = entry.dialogue.filter(([_, n]) => n !== placeholderNpcWords);
                    latestDialogueEntry = {
                        ...entry,
                        dialogue: [...cleanPairs, [playerWords, npcWords]]
                    };
                } else {
                    latestDialogueEntry = createDialogue(
                        activeInteractionNPC.static.id,
                        activeInteractionNPC.static.name,
                        [[playerWords, npcWords]]
                    );
                }

                // 2. 更新 React Player 状态
                setPlayer(prev => {
                    const idx = prev.dialogue.findIndex(d => d.owner?.id === activeInteractionNPC.static.id);
                    const updated = [...prev.dialogue];
                    if (idx > -1) {
                        updated[idx] = latestDialogueEntry;
                    } else {
                        updated.push(latestDialogueEntry);
                    }
                    return { ...prev, dialogue: updated };
                });

                // 3. 立即将最新拼合完成的对话历史与记忆金字塔写入落盘: memory/<npcName>/<profileId>/
                const currentProfileId = activeInteractionNPC.dynamic.mountedProfileId || 'default';
                PersistenceService.saveNpcMemoryProfile(activeInteractionNPC.static.name, currentProfileId, latestDialogueEntry, finalNPC.dynamic.memory);
            }

            if (result.quest) {
                const newQuest: Quest = {
                    desc: result.quest.desc || "AI 委托任务",
                    goals: result.quest.goals || [],
                    rewards: result.quest.rewards || [],
                    difficulty: result.quest.difficulty || 1,
                    status: 'on'
                };

                const isDuplicate = player.questAccepted.some(q => q.desc === newQuest.desc);
                if (!isDuplicate) {
                    setPlayer(p => ({
                        ...p,
                        questAccepted: [...p.questAccepted, newQuest]
                    }));
                    addLog(`新的委托已发布到任务列表`, "event");
                    AudioService.playSfx('success');
                }
            }

            const previousWords: Array<Words<PlayerWordsTag> | Words<NpcWordsTag>> = [];
            for (const d of player.dialogue) {
                if (d.owner?.id !== activeInteractionNPC.static.id) continue;
                d.dialogue.forEach(([p, n]) => {
                    if (p) previousWords.push(p);
                    if (n) previousWords.push(n);
                });
            }

            const npcDialogues = player.dialogue.filter(d => d.owner?.id === activeInteractionNPC.static.id);
            // 按实际对话轮次（pair 数）计数，而非 Dialogue 对象数
            const totalTurns = npcDialogues.reduce((acc, d) => acc + d.dialogue.length, 0) + (npcWords ? 1 : 0);

            const lastSummarizedIndex = finalNPC.dynamic.memory.δ.reduce(
                (max, s) => Math.max(max, s.dialogueIndex.end),
                -1
            );

            const sliceLength = settings.dialogueSliceLength || 25;
            const unsynthesizedCount = totalTurns - (lastSummarizedIndex + 1);

            if (unsynthesizedCount >= sliceLength) {
                const startIndex = lastSummarizedIndex + 1;
                const endIndex = startIndex + sliceLength - 1;

                // 展开所有 pair 后按索引切片，保证量纲与 dialogueIndex 一致
                const allPairs = npcDialogues.flatMap(d => d.dialogue);
                const dialoguePairs = allPairs.slice(startIndex, endIndex + 1);

                SocializationService.summarizeDialogueSlice(settings, finalNPC, dialoguePairs, startIndex, endIndex, player.currentZoneTime)
                    .then(async (newDelta) => {
                        if (!newDelta) return;

                        let updatedPyramid = {
                            ...finalNPC.dynamic.memory,
                            δ: [...finalNPC.dynamic.memory.δ, newDelta]
                        };

                        const evolvedPyramid = await SocializationService.evolve(settings, { ...finalNPC, dynamic: { ...finalNPC.dynamic, memory: updatedPyramid } }, player.currentZoneTime);
                        if (evolvedPyramid) {
                            updatedPyramid = evolvedPyramid;
                        }

                        setActiveInteractionNPC(prev => {
                            if (!prev || prev.static.id !== finalNPC.static.id) return prev;
                            const updated = {
                                ...prev,
                                dynamic: {
                                    ...prev.dynamic,
                                    memory: updatedPyramid
                                }
                            };
                            syncNPCState(updated);
                            return updated;
                        });

                        // 更新记忆金字塔后落盘保存到挂载人格组
                        const pId = finalNPC.dynamic.mountedProfileId || 'default';
                        PersistenceService.saveNpcMemoryProfile(finalNPC.static.name, pId, undefined, updatedPyramid);
                        addLog(`[记忆整合] ${finalNPC.static.name} 整理了与你的近期对话摘要。`, "info");
                    })
                    .catch(err => addLog(`[记忆整合] 序列化失败。`, "warning"));
            }

        } catch (error) {
            // 发生错误时全面回滚：将预留的空槽位彻底移除，保证错误对话不进入内存、不更新对话栏、不落盘本地
            setPlayer(prev => {
                const existingIndex = prev.dialogue.findIndex(d => d.owner?.id === activeInteractionNPC.static.id);
                if (existingIndex === -1) return prev;
                const updatedDialogue = [...prev.dialogue];
                const entry = updatedDialogue[existingIndex];
                const pairs = entry.dialogue.filter(([_, n]) => n !== placeholderNpcWords);
                if (pairs.length === 0) {
                    updatedDialogue.splice(existingIndex, 1);
                } else {
                    updatedDialogue[existingIndex] = { ...entry, dialogue: pairs };
                }
                return { ...prev, dialogue: updatedDialogue };
            });

            const errorMessage = error instanceof Error ? error.message : '未知通信异常';
            addLog(`[通讯链路] 交互中断: ${errorMessage}`, "warning");
            throw error;
        }

    }, [activeInteractionNPC, getCurrentNode, settings, player, addLog, syncNPCState, setActiveInteractionNPC, currentZone, currentNodeId, setPlayer]);

    /**
     * 物理动作执行管线
     * 决定状态在底层规则阈值内的流转，不依赖外部大模型请求。
     */
    const handleLocalNPCAction = useCallback((actionType: 'hug' | 'heal') => {
        if (!activeInteractionNPC) return;

        let responseText = "";
        let playerText = "";
        let npcUpdate = {};

        const maxHp = activeInteractionNPC.dynamic.maxHp;
        const maxSanity = activeInteractionNPC.dynamic.maxSanity;

        const findMeds = (type: 'hp' | 'sanity') => {
            return player.dynamic.inventory.find((i: ItemInstance) => {
                if (i.type !== 'consumable') return false;
                const effects = getConsumableEffects(i);
                if (effects.length === 0) return false;
                return effects.some(effect =>
                    (type === 'hp' && effect.effectType === 'heal_hp') ||
                    (type === 'sanity' && effect.effectType === 'heal_sanity')
                );
            });
        };

        switch (actionType) {
            case 'hug':
                playerText = "(试图给一个拥抱)";
                const currentTrust = activeInteractionNPC.dynamic.trust;
                if (currentTrust >= settings.gameConfig.social.thresholds.trustHigh) {
                    responseText = "(紧紧回抱住你，身体在微微颤抖) ...别放手，求你了。";
                    npcUpdate = {
                        sanity: Math.min(maxSanity, activeInteractionNPC.dynamic.sanity + settings.gameConfig.social.benefits.hugSanityGainHigh)
                    };
                } else if (currentTrust >= settings.gameConfig.social.thresholds.trustLow) {
                    responseText = "(身体僵硬了一下，但没有推开) ...谢谢。我没事。";
                    npcUpdate = {
                        sanity: Math.min(maxSanity, activeInteractionNPC.dynamic.sanity + settings.gameConfig.social.benefits.hugSanityGainLow)
                    };
                } else {
                    responseText = "(猛地退后一步，警惕地看着你) ...保持距离。我不习惯这样。";
                    npcUpdate = { trust: Math.max(settings.gameConfig.social.thresholds.trustMin, currentTrust - settings.gameConfig.social.benefits.hugTrustPenalty) };
                }
                break;
            case 'heal':
                playerText = "(尝试进行治疗)";
                if (activeInteractionNPC.dynamic.hp < maxHp) {
                    const hpMeds = findMeds('hp');
                    if (hpMeds) {
                        const effects = getConsumableEffects(hpMeds);
                        const healEffect = effects.find(e => e.effectType === 'heal_hp');
                        const healVal = healEffect?.effectValue || settings.gameConfig.social.benefits.healValueDefault;
                        npcUpdate = {
                            hp: Math.min(maxHp, activeInteractionNPC.dynamic.hp + healVal),
                            trust: Math.min(settings.gameConfig.social.thresholds.trustMax, activeInteractionNPC.dynamic.trust + settings.gameConfig.social.benefits.healTrustGain)
                        };
                        responseText = `(使用了 ${hpMeds.name}) 伤口得到了处理，看起来好多了。`;

                        setPlayer(p => ({ ...p, dynamic: { ...p.dynamic, inventory: removeItemFromInventory(p.dynamic.inventory, hpMeds.instanceId, 1) } }));
                        AudioService.playSfx('success');
                    } else {
                        responseText = "(翻遍了背包) ...该死，我没有治疗外伤的药物了。";
                        AudioService.playSfx('click');
                    }
                } else if (activeInteractionNPC.dynamic.sanity < maxSanity * (settings.gameConfig.social.vitals.sanityHigh / 100)) {
                    const sanMeds = findMeds('sanity');
                    if (sanMeds) {
                        const effects = getConsumableEffects(sanMeds);
                        const healEffect = effects.find(e => e.effectType === 'heal_sanity');
                        const healVal = healEffect?.effectValue || settings.gameConfig.social.benefits.healValueDefault;
                        npcUpdate = {
                            sanity: Math.min(maxSanity, activeInteractionNPC.dynamic.sanity + healVal),
                            trust: Math.min(settings.gameConfig.social.thresholds.trustMax, activeInteractionNPC.dynamic.trust + settings.gameConfig.social.benefits.healTrustGain)
                        };
                        responseText = `(使用了 ${sanMeds.name}) 精神状态似乎稳定了一些。`;

                        setPlayer(p => ({ ...p, dynamic: { ...p.dynamic, inventory: removeItemFromInventory(p.dynamic.inventory, sanMeds.instanceId, 1) } }));
                        AudioService.playSfx('success');
                    } else {
                        responseText = "(翻遍了背包) ...我没有能安抚精神的药物了。";
                        AudioService.playSfx('click');
                    }
                } else {
                    responseText = "看起来非常健康，不需要浪费药物。";
                }
                break;
        }

        if (playerText) {
            addLog(`[动作] ${playerText}`, "info");
        }
        if (responseText) {
            addLog(`${activeInteractionNPC.static.name}: ${responseText}`, "info");
        }

        setActiveInteractionNPC((prev) => {
            if (!prev) return null;
            const newNPC: Entity<NpcTemplate, NpcDynamicState> = {
                ...prev,
                dynamic: {
                    ...prev.dynamic,
                    ...npcUpdate
                }
            };
            syncNPCState(newNPC);
            return newNPC;
        });
    }, [activeInteractionNPC, player.dynamic.inventory, setPlayer, setActiveInteractionNPC, syncNPCState, settings, addLog]);

    /**
     * 深层交互生成器
     */
    const handleNPCIntimacy = useCallback(async () => {
        if (!activeInteractionNPC) return;

        addLog(`与 ${activeInteractionNPC.static.name} 的深度连接建立中...`, "event");

        try {
            const result = await AiService.generateNPCIntimacy(settings, activeInteractionNPC);

            const currentNode = getCurrentNode();
            const location: Loc = {
                zone: {
                    id: currentZone.id,
                    name: currentZone.name,
                    desc: {
                        background: currentZone.background,
                        topology: currentZone.topology,
                        nodesCount: currentZone.nodesCount,
                        visualStyle: currentZone.visualStyle
                    }
                },
                node: {
                    id: currentNodeId,
                    name: currentNode.name,
                    desc: currentNode.desc
                }
            };

            const npcWords = createDialogueRecord(
                activeInteractionNPC.static.name,
                result.desc,
                location,
                true,
                player.currentZoneTime,
                'happy'
            ) as Words<NpcWordsTag>;

            const placeholderPlayerWords = createDialogueRecord(
                player.static.name,
                "(进行亲密接触)",
                location,
                false,
                player.currentZoneTime
            ) as Words<PlayerWordsTag>;

            const newDialogue = createDialogue(
                activeInteractionNPC.static.id,
                activeInteractionNPC.static.name,
                [[placeholderPlayerWords, npcWords]]
            );

            setPlayer(prev => ({
                ...prev,
                dialogue: [...prev.dialogue, newDialogue]
            }));

            if (result.vocal) {
                const voiceName = activeInteractionNPC.static.gender === 'female' ? 'Kore' : 'Fenrir';
                addLog(`接收到生物音频信号(${voiceName})...`, "ai-gen");

                const audioContext = {
                    zoneId: currentZone.id,
                    nodeId: currentNodeId,
                    zoneName: currentZone.name,
                    nodeName: currentNodeId,
                    entityName: activeInteractionNPC.static.name,
                    strength: player.static.initialState.attribute.strength,
                    agility: player.static.initialState.attribute.agility,
                    knowledge: player.static.initialState.attribute.knowledge,
                    perception: player.static.initialState.attribute.perception,
                };
                const audioData = await AiService.generateSpeech(settings, result.vocal, audioContext, voiceName);
                if (audioData) {
                    AudioService.playPCM(audioData);
                }
            }

            setActiveInteractionNPC((prev) => {
                if (!prev) return null;
                const maxSanity = prev.dynamic.maxSanity;

                const newTrust = Math.min(settings.gameConfig.social.thresholds.trustMax, prev.dynamic.trust + settings.gameConfig.social.benefits.intimacyTrustGain);
                const newSanity = Math.min(maxSanity, prev.dynamic.sanity + settings.gameConfig.social.benefits.intimacySanityGain);

                const newNPC: Entity<NpcTemplate, NpcDynamicState> = {
                    ...prev,
                    dynamic: {
                        ...prev.dynamic,
                        trust: newTrust,
                        sanity: newSanity
                    }
                };
                syncNPCState(newNPC);

                setPlayer(p => {
                    const maxPlayerSanity = p.dynamic.maxSanity;
                    return {
                        ...p,
                        dynamic: {
                            ...p.dynamic,
                            sanity: Math.min(maxPlayerSanity, p.dynamic.sanity + settings.gameConfig.social.benefits.intimacyPlayerSanityGain)
                        }
                    };
                });

                return newNPC;
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            addLog(`连接意外中断: ${errorMessage}`, "warning");
        }
    }, [activeInteractionNPC, settings, currentZone, currentNodeId, addLog, setActiveInteractionNPC, syncNPCState, setPlayer, player]);

    /**
     * 强行所有权转移
     */
    const handleNPCTakeItem = useCallback((item: ItemInstance) => {
        if (!activeInteractionNPC) return;

        const updatedInventory = removeItemFromInventory(activeInteractionNPC.dynamic.inventory || [], item.instanceId, 1);
        const newNPC: Entity<NpcTemplate, NpcDynamicState> = {
            ...activeInteractionNPC,
            dynamic: {
                ...activeInteractionNPC.dynamic,
                inventory: updatedInventory
            }
        };

        setActiveInteractionNPC(newNPC);
        syncNPCState(newNPC);

        setPlayer(p => ({ ...p, dynamic: { ...p.dynamic, inventory: addItemToInventory(p.dynamic.inventory, item) } }));
        addLog(`从 ${activeInteractionNPC.static.name} 那里拿走了 ${item.name}`, "info");
        AudioService.playSfx('click');
    }, [activeInteractionNPC, setPlayer, addLog, syncNPCState, setActiveInteractionNPC]);

    /**
     * 契约建立判定
     * 处理关系阶段越级转换并移交数据所属权。
     */
    const handleNPCRecruit = useCallback(() => {
        if (!activeInteractionNPC) return;

        if (activeInteractionNPC.dynamic.trust >= settings.gameConfig.social.thresholds.trustMedium) {
            const newCompanion: Entity<NpcTemplate, NpcDynamicState> = {
                static: activeInteractionNPC.static,
                dynamic: { ...activeInteractionNPC.dynamic }
            };

            setPlayer(p => ({ ...p, companions: [...p.companions, newCompanion] }));
            addLog(`协议达成：${newCompanion.static.name} 加入了小队。`, "event");
            AudioService.playSfx('success');

            setActiveInteractionNPC((prev) => {
                if (!prev) return null;
                return { ...prev };
            });

            const node = getCurrentNode();
            setCurrentZone((prev: Zone) => ({
                ...prev,
                nodes: node ? {
                    ...prev.nodes,
                    [currentNodeId]: { ...node, nodeNpc: undefined }
                } : prev.nodes
            }));

        } else {
            AudioService.playSfx('click');
            addLog(`${activeInteractionNPC.static.name} 拒绝了你的邀请。(好感不足)`, "warning");

            setActiveInteractionNPC((prev) => {
                if (!prev) return null;
                return { ...prev };
            });
        }
    }, [activeInteractionNPC, setPlayer, addLog, setActiveInteractionNPC, getCurrentNode, setCurrentZone, currentNodeId, settings]);

    /**
     * 所有权交割与情绪系数计算
     */
    const handleNPCGift = useCallback((item: ItemInstance) => {
        if (!activeInteractionNPC) return;

        setPlayer(p => ({ ...p, dynamic: { ...p.dynamic, inventory: removeItemFromInventory(p.dynamic.inventory, item.instanceId, 1) } }));

        let trustGain: number = settings.gameConfig.social.benefits.giftTrustBase;
        if (item.rarity === 'rare') trustGain = settings.gameConfig.social.benefits.giftTrustRare;
        if (item.rarity === 'epic') trustGain = settings.gameConfig.social.benefits.giftTrustEpic;
        if (item.type === 'consumable') trustGain += settings.gameConfig.social.benefits.giftTrustConsumableBonus;

        const newTrust = Math.min(settings.gameConfig.social.thresholds.trustMax, activeInteractionNPC.dynamic.trust + trustGain);
        const newItem = { ...item };

        setActiveInteractionNPC((prev) => {
            if (!prev) return null;
            const newNPC: Entity<NpcTemplate, NpcDynamicState> = {
                ...prev,
                dynamic: {
                    ...prev.dynamic,
                    trust: newTrust,
                    inventory: addItemToInventory(prev.dynamic.inventory || [], newItem)
                }
            };
            syncNPCState(newNPC);
            addLog(`${activeInteractionNPC.static.name} 收到了 ${item.name}，好感度提升。`, "success");
            return newNPC;
        });

        AudioService.playSfx('success');
    }, [activeInteractionNPC, setPlayer, setActiveInteractionNPC, syncNPCState, settings, addLog]);

    /**
     * 任务注册写入
     */
    const handleAcceptQuest = useCallback((questId: string, questData: Partial<Quest>) => {
        if (!activeInteractionNPC) return;

        const newQuest: Quest = {
            id: questData.id || questId,
            desc: questData.desc || "...",
            goals: questData.goals || [],
            rewards: questData.rewards || [],
            difficulty: questData.difficulty || 1,
            status: 'on'
        };

        setPlayer(p => ({
            ...p,
            questAccepted: [...p.questAccepted, newQuest]
        }));

        addLog(`已接取委托: ${questId}`, "event");
        AudioService.playSfx('success');
    }, [activeInteractionNPC, setPlayer, addLog]);

    const closeNPCInteraction = useCallback(() => {
        setActiveInteractionNPC(null);
    }, [setActiveInteractionNPC]);

    /** 人格挂载：加载指定的已有对话/记忆组 */
    const handleMountProfile = useCallback(async (profileId: string) => {
        if (!activeInteractionNPC) return;
        const npcName = activeInteractionNPC.static.name;
        const res = await PersistenceService.loadNpcMemoryProfile(npcName, profileId);

        const loadedMemory = res.memory || { α: [], β: [], γ: [], δ: [] };
        const loadedDialogue = res.dialogue || { owner: { id: activeInteractionNPC.static.id, name: npcName }, dialogue: [] };

        // 1. 装载 memory 金字塔和 mountedProfileId
        setActiveInteractionNPC(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                dynamic: {
                    ...prev.dynamic,
                    memory: loadedMemory,
                    mountedProfileId: profileId
                }
            };
        });

        // 2. 绑定装载完整的对话历史
        setPlayer(prev => {
            const existingIdx = prev.dialogue.findIndex(d => d.owner?.id === activeInteractionNPC.static.id);
            const newDialogues = [...prev.dialogue];
            if (existingIdx > -1) {
                newDialogues[existingIdx] = loadedDialogue;
            } else {
                newDialogues.push(loadedDialogue);
            }
            return { ...prev, dialogue: newDialogues };
        });

        addLog(`[人格挂载] 成功绑定人格记忆组: ${res.meta?.name || profileId}`, 'event');
        AudioService.playSfx('success');
    }, [activeInteractionNPC, setActiveInteractionNPC, setPlayer, addLog]);

    /** 人格独立新建/取消挂载 */
    const handleUnmountCreateNewProfile = useCallback(async (customName?: string) => {
        if (!activeInteractionNPC) return;
        const npcName = activeInteractionNPC.static.name;
        const newProfileId = `profile_${Date.now()}`;
        const profileName = customName?.trim() || `人格组_${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`;

        const emptyMemory = { α: [], β: [], γ: [], δ: [] };
        const emptyDialogue: Dialogue = {
            owner: { id: activeInteractionNPC.static.id, name: npcName },
            dialogue: []
        };

        await PersistenceService.saveNpcMemoryProfile(npcName, newProfileId, emptyDialogue, emptyMemory, profileName);

        setActiveInteractionNPC(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                dynamic: {
                    ...prev.dynamic,
                    memory: emptyMemory,
                    mountedProfileId: newProfileId
                }
            };
        });

        setPlayer(prev => {
            const existingIdx = prev.dialogue.findIndex(d => d.owner?.id === activeInteractionNPC.static.id);
            const newDialogues = [...prev.dialogue];
            if (existingIdx > -1) {
                newDialogues[existingIdx] = emptyDialogue;
            } else {
                newDialogues.push(emptyDialogue);
            }
            return { ...prev, dialogue: newDialogues };
        });

        addLog(`[人格新建] 已为您建立全新独立记忆组: ${profileName}`, 'event');
        AudioService.playSfx('click');
    }, [activeInteractionNPC, setActiveInteractionNPC, setPlayer, addLog]);

    /** 人格组删除 */
    const handleDeleteProfile = useCallback(async (profileId: string) => {
        if (!activeInteractionNPC) return;
        const npcName = activeInteractionNPC.static.name;
        await PersistenceService.deleteNpcProfile(npcName, profileId);
        addLog(`[人格清理] 已删除人格记忆组`, 'info');
    }, [activeInteractionNPC, addLog]);

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
}