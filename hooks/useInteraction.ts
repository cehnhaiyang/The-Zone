import { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
    Zone, Node, Exit, PlayerState, Entity, NpcTemplate, PlayerDynamicState, NpcDynamicState,
    ItemInstance, Puzzle, LogType, EnemyTemplate, ConsumableInstance, DocumentInstance,
    AudioInstance, Settings, InteractionType, createItemInstance, createNpcEntity, isEquipmentInstance, isWeaponInstance, isArmorInstance, isAudioInstance, isAccessoryInstance, addItemToInventory, removeItemFromInventory, findItemInInventory, hasItemInInventory, applyConsumableEffects, getEffectValueByType, validateNodeInteraction, processStateChange, removeInteractionFromNode, checkExitLock, calculateEncounterChance, calculateSearchCosts, calculatePerceptionScore, processItemDiscovery, equipItem, unequipItem
} from '../meta';
import { AudioService, PersistenceService, AiService } from '../services';

interface UseInteractionParams {
    currentZone: Zone;
    setCurrentZone: Dispatch<SetStateAction<Zone>>;
    currentNodeId: string;
    setCurrentNodeId: Dispatch<SetStateAction<string>>;
    player: PlayerState;
    setPlayer: Dispatch<SetStateAction<PlayerState>>;
    addLog: (text: string, type: LogType) => void;
    handleGameTick: (timePassed?: number) => void;
    updatePlayer: (sanityDelta: number, hpDelta: number) => void;
    setShowCutscene: (show: boolean) => void;
    triggerCompanionReactions: (eventName: string, context?: string) => void;
    spawnEnemy: (enemyTemplate?: EnemyTemplate, zoneId?: string, threatLevel?: number) => void;
    setActiveInteractionNPC: (npc: Entity<NpcTemplate, NpcDynamicState>) => void;
    sanctuaryId: string;
    settings: Settings;
    updateCompanion: (npcId: string, sanityDelta: number, hpDelta: number) => void;
}

interface UseInteractionReturn {
    getCurrentNode: () => Node;
    handleLocalMove: (targetId: string, label?: string) => void;
    handleSearch: () => void;
    handleInteraction: (type: InteractionType, targetId?: string) => void;
    activePuzzleNodeId: string | null;
    setActivePuzzleNodeId: Dispatch<SetStateAction<string | null>>;
    activePuzzleInteractionIndex: number | null;
    setActivePuzzleInteractionIndex: Dispatch<SetStateAction<number | null>>;
    getActivePuzzle: () => Puzzle | null;
    handlePuzzleSolve: () => void;
    handlePuzzleFail: () => void;
    recordHintUsed: () => void;
    closePuzzle: () => void;
    puzzleStats: { solved: number; failed: number; hints: number };
    puzzleController: PuzzleInteractionController;
    handleUseItem: (item: ItemInstance, npc?: Entity<NpcTemplate, PlayerDynamicState>) => Promise<void>;
    handleEquipItem: (item: ItemInstance) => void;
    handleDiscardItem: (item: ItemInstance) => void;
    addItemToInventory: typeof addItemToInventory;
    findItemInInventory: typeof findItemInInventory;
    removeItemFromInventory: typeof removeItemFromInventory;
    loadingAudioId: string | null;
}

export interface PuzzleInteractionController {
    input: string;
    status: 'idle' | 'success' | 'error';
    statusMsg: string;
    attempts: number;
    maxAttempts: number;
    isShaking: boolean;
    hintsUsed: number;
    timeLeft: number;
    showLore: boolean;
    selectedOptions: number[];
    patternInput: string[];
    type: 'choice' | 'cloze' | 'type' | null;
    currentHints: string[];
    handleInputChange: (val: string) => void;
    handleOptionSelect: (index: number) => void;
    handlePatternClick: (index: number) => void;
    handleSubmit: () => void;
    handleKeyDown: (e: React.KeyboardEvent) => void;
    handleUseHint: () => void;
}

const SANITY_CRITICAL_THRESHOLD = 0.3;

async function loadNodeMediaResources(zoneId: string, nodeId: string): Promise<{ videoUrl?: string; imageUrl?: string }> {
    if (!PersistenceService.isReady) return {};
    const result: { videoUrl?: string; imageUrl?: string } = {};

    try {
        const videos = await PersistenceService.listVideos(zoneId, nodeId);
        const videoFiles = videos.filter(f => /^\d+\.mp4$/i.test(f));
        if (videoFiles.length > 0) {
            const maxIdx = Math.max(...videoFiles.map(f => parseInt(f.match(/^(\d+)\.mp4$/i)![1], 10)));
            const path = await PersistenceService.getVideoPath(String(maxIdx), zoneId, nodeId);
            if (path) result.videoUrl = path;
        }

        const images = await PersistenceService.listImages(zoneId, nodeId);
        if (images.length > 0) {
            const latestImage = images.sort().pop();
            if (latestImage) {
                const baseName = latestImage.replace(/\.[^/.]+$/, "");
                const data = await PersistenceService.loadImage(baseName, zoneId, nodeId);
                if (data) result.imageUrl = data;
            }
        }
    } catch (error) {
        console.warn(`节点媒体加载故障 [${zoneId}/${nodeId}]:`, error);
    }
    return result;
}

async function handleAudioItem(
    item: AudioInstance,
    zone: Zone,
    settings: Settings,
    addLog: (text: string, type: LogType) => void,
    nodeId: string
): Promise<AudioInstance> {
    if (!item.audioScript) {
        addLog(`数据损坏: ${item.name} 无法解析。`, 'warning');
        return item;
    }

    addLog(`解析音频轨道: ${item.name}...`, 'command');
    if (item.audioUrl) {
        AudioService.playPCM(item.audioUrl);
        return item;
    }

    addLog('启动神经解码流...', 'ai-gen');
    try {
        const url = await AiService.generateSpeech(settings, item.audioScript, { zoneId: zone.id, nodeId });
        if (url) {
            AudioService.playPCM(url);
            return { ...item, audioUrl: url };
        }
    } catch (e) {
        console.error('音频重建协议失败:', e);
    }

    addLog('音频重建异常终止。', 'warning');
    return item;
}

export const useInteraction = ({
    currentZone, setCurrentZone,
    currentNodeId, setCurrentNodeId,
    player, setPlayer,
    addLog, handleGameTick,
    updatePlayer, setShowCutscene,
    triggerCompanionReactions, spawnEnemy,
    setActiveInteractionNPC,
    settings, updateCompanion
}: UseInteractionParams): UseInteractionReturn => {

    const [activePuzzleNodeId, setActivePuzzleNodeId] = useState<string | null>(null);
    const [activePuzzleInteractionIndex, setActivePuzzleInteractionIndex] = useState<number | null>(null);
    const [puzzleStats, setPuzzleStats] = useState({ solved: 0, failed: 0, hints: 0 });
    const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
    const [puzzleInput, setPuzzleInput] = useState('');
    const [puzzleStatus, setPuzzleStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [puzzleStatusMsg, setPuzzleStatusMsg] = useState('AWAITING_INPUT');
    const [puzzleAttempts, setPuzzleAttempts] = useState(0);
    const [puzzleIsShaking, setPuzzleIsShaking] = useState(false);
    const [puzzleHintsUsed, setPuzzleHintsUsed] = useState(0);
    const [puzzleTimeLeft, setPuzzleTimeLeft] = useState(0);
    const [puzzleShowLore, setPuzzleShowLore] = useState(false);
    const [puzzleSelectedOptions, setPuzzleSelectedOptions] = useState<number[]>([]);
    const [puzzlePatternInput, setPuzzlePatternInput] = useState<string[]>([]);
    const [puzzleMemoryPhase, setPuzzleMemoryPhase] = useState<'show' | 'input' | 'done'>('show');
    const [puzzleWireConnections, setPuzzleWireConnections] = useState<Record<string, string>>({});
    const [puzzleSelectedWireId, setPuzzleSelectedWireId] = useState<string | null>(null);
    const mediaAbortControllerRef = useRef<AbortController | null>(null);
    const puzzleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const puzzleCallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            mediaAbortControllerRef.current?.abort();
            if (puzzleTimerRef.current) clearInterval(puzzleTimerRef.current);
            if (puzzleCallbackTimerRef.current) clearTimeout(puzzleCallbackTimerRef.current);
        };
    }, []);

    // 缓存玩家即时生理体征屏障度，供探索算法动态读取
    const playerStateMemo = useMemo(() => ({
        staminaPct: player.dynamic.stamina / player.static.initialState.vital.maxStamina,
        vigorPct: player.dynamic.vigor / player.static.initialState.vital.maxVigor,
        sanityPct: player.dynamic.sanity / player.static.initialState.vital.maxSanity,
        attributes: player.static.initialState.attribute
    }), [player.static.initialState, player.dynamic.stamina, player.dynamic.vigor, player.dynamic.sanity]);

    const getCurrentNode = useCallback((): Node => {
        if (!currentZone?.nodes) return { name: '加载中...', desc: '数据加载中', visualPrompt: '数据加载中', searchCount: 0, isVisited: false } as Node;
        if (!currentNodeId?.trim()) return { name: '未定位', desc: '未知坐标', visualPrompt: '未知坐标', searchCount: 0, isVisited: false } as Node;
        if (currentZone.id === 'empty_zone' && Object.keys(currentZone.nodes).length === 0) {
            return { name: '虚空', desc: '初始原点', visualPrompt: '虚空', searchCount: 0, isVisited: false } as Node;
        }
        const node = currentZone.nodes[currentNodeId];
        if (!node) throw new Error(`节点指针越界`);
        return node;
    }, [currentZone, currentNodeId]);

    const scheduleEnemySpawn = useCallback((delay: number, enemyTemplate?: EnemyTemplate, customMessage?: string, threatLevel?: number) => {
        setTimeout(() => {
            addLog(customMessage || `侦测到高危实体: ${enemyTemplate?.name ?? '未知'}`, 'critical');
            AudioService.playSfx('scare');
            spawnEnemy(enemyTemplate, currentZone.id, threatLevel);
        }, delay);
    }, [addLog, spawnEnemy, currentZone.id]);

    const validateMove = useCallback((targetId: string) => {
        const exitDef = (currentZone.nodes[currentNodeId]?.exits || []).find((e: Exit) => e.targetId === targetId);
        if (exitDef) {
            const lockStatus = checkExitLock(exitDef, currentZone.nodes);
            if (lockStatus.locked) return { valid: false, lockReason: lockStatus.reason };
        }
        return { valid: !!(currentZone.nodes[targetId] && currentZone.nodes[currentNodeId]) };
    }, [currentZone, currentNodeId]);

    const loadAndAttachNodeMedia = useCallback(async (zoneId: string, nodeId: string) => {
        mediaAbortControllerRef.current?.abort();
        const controller = new AbortController();
        mediaAbortControllerRef.current = controller;

        try {
            const media = await loadNodeMediaResources(zoneId, nodeId);
            if (controller.signal.aborted || (!media.videoUrl && !media.imageUrl)) return;

            setCurrentZone(prev => {
                const node = prev.nodes[nodeId];
                if (!node) return prev;
                return {
                    ...prev,
                    nodes: {
                        ...prev.nodes,
                        [nodeId]: { ...node, ...media }
                    }
                };
            });
        } catch (error) {
            if (!controller.signal.aborted) console.warn('媒体流中断:', error);
        }
    }, [setCurrentZone]);

    // 执行跨节点网格移动，推进时间周期并进行环境碰撞判定
    const handleLocalMove = useCallback((targetId: string, label?: string) => {
        const targetNode = currentZone.nodes[targetId];
        if (!targetNode) return;

        const validation = validateMove(targetId);
        if (!validation.valid) {
            if (validation.lockReason) {
                addLog(validation.lockReason, 'warning');
                AudioService.playSfx('door_locked');
            }
            return;
        }

        addLog(`跨越至坐标: ${label || targetNode.name}`, 'command');
        setCurrentNodeId(targetId);
        handleGameTick(1);

        setPlayer(p => ({
            ...p,
            dynamic: { ...p.dynamic, stamina: Math.max(0, p.dynamic.stamina - settings.gameConfig.movementCosts.baseStamina) }
        }));
        AudioService.playSfx('footstep');

        const isVisited = Boolean(targetNode.isVisited);
        if (!isVisited) {
            setCurrentZone(prev => ({
                ...prev,
                nodes: {
                    ...prev.nodes,
                    [targetId]: { ...prev.nodes[targetId], isVisited: true }
                }
            }));

            updatePlayer(-settings.gameConfig.movementCosts.baseSanity, 0);
            setShowCutscene(true);
            triggerCompanionReactions(`接入新坐标: ${targetNode.name}`, targetNode.desc);

            if (targetNode.specificEnemy && targetNode.enemySpawnCondition === 'on_enter') {
                scheduleEnemySpawn(settings.gameConfig.mediaLoading.enemySpawnDelay, targetNode.specificEnemy, undefined, targetNode.threatLevel);
            } else if ((targetNode.threatLevel || 0) > 0) {
                const chance = calculateEncounterChance(targetNode.threatLevel || 0, 0, playerStateMemo.staminaPct, playerStateMemo.vigorPct, 'on_enter', settings.gameConfig);
                if (Math.random() < chance) scheduleEnemySpawn(settings.gameConfig.mediaLoading.enemySpawnDelay, undefined, '被动安全协议被破坏，实体接近。', targetNode.threatLevel);
            }
        } else {
            triggerCompanionReactions(`重返坐标 ${targetNode.name}`);
        }

        if (targetNode.enemySpawnCondition === 'on_sanity_critical' && playerStateMemo.sanityPct < SANITY_CRITICAL_THRESHOLD) {
            scheduleEnemySpawn(settings.gameConfig.mediaLoading.enemySpawnDelay, targetNode.specificEnemy, `精神阈值告警，映射实体: ${targetNode.specificEnemy?.name ?? '低语者'}`, targetNode.threatLevel);
        }

        loadAndAttachNodeMedia(currentZone.id, targetId);
    }, [
        currentZone, validateMove, addLog, setCurrentNodeId, handleGameTick, setPlayer, settings,
        setCurrentZone, updatePlayer, setShowCutscene, triggerCompanionReactions,
        playerStateMemo, scheduleEnemySpawn, loadAndAttachNodeMedia
    ]);

    // 局部空间特征提取引擎，扫描隐匿物品并累积异常环境压力
    const handleSearch = useCallback(() => {
        const node = getCurrentNode();
        if (!node) return;

        AudioService.playSfx('search');
        addLog('执行深度拓扑扫描...', 'command');
        handleGameTick(1);

        const costs = calculateSearchCosts(playerStateMemo.attributes, playerStateMemo.staminaPct, playerStateMemo.vigorPct, settings.gameConfig);

        setPlayer(p => ({
            ...p,
            searchCount: (p.searchCount || 0) + 1,
            dynamic: {
                ...p.dynamic,
                stamina: Math.max(0, parseFloat((p.dynamic.stamina - costs.staminaCost).toFixed(1))),
                vigor: Math.max(0, parseFloat((p.dynamic.vigor - costs.vigorCost).toFixed(1))),
                sanity: Math.max(0, parseFloat((p.dynamic.sanity - costs.sanityCost).toFixed(1)))
            }
        }));

        if (costs.fatiguePenalty > settings.gameConfig.fatigueThresholds.highWarning) {
            addLog('机体效能下降，扫描精度受损。', 'warning');
        }

        const count = (node.searchCount || 0) + 1;
        triggerCompanionReactions('执行拓扑扫描');

        const roll = Math.random() * 20 + calculatePerceptionScore(playerStateMemo.attributes, count, settings.gameConfig);
        const { foundItem, remainingItems } = processItemDiscovery(node, roll, settings.gameConfig);

        if (foundItem) {
            const isRare = (foundItem.discoveryThreshold || settings.gameConfig.discoveryThresholds.low) > settings.gameConfig.discoveryThresholds.high;
            addLog(isRare ? `深层解析成功: 提取实体 [${foundItem.name}]` : `物资确认: ${foundItem.name}`, 'loot');
            addLog(foundItem.desc, 'info');
            AudioService.playSfx(foundItem.rarity !== 'common' ? 'success' : 'item_pickup');

            const newItem = createItemInstance(foundItem);
            setPlayer(p => ({ ...p, dynamic: { ...p.dynamic, inventory: addItemToInventory(p.dynamic.inventory, newItem) } }));
            triggerCompanionReactions(`取得资产: ${foundItem.name}`);

            if (foundItem.type === 'document' && 'documentContent' in newItem) {
                addLog(`>>> ${foundItem.name} <<<`, 'loot');
                addLog((newItem as DocumentInstance).documentContent, 'ai-gen');
            }

            setCurrentZone(prev => ({
                ...prev,
                nodes: { ...prev.nodes, [currentNodeId]: { ...node, items: remainingItems, searchCount: count } }
            }));
            return;
        }

        setCurrentZone(prev => ({
            ...prev,
            nodes: { ...prev.nodes, [currentNodeId]: { ...node, searchCount: count } }
        }));

        if (node.specificEnemy && node.enemySpawnCondition === 'on_search') {
            scheduleEnemySpawn(settings.gameConfig.mediaLoading.searchEnemySpawnDelay, node.specificEnemy, undefined, node.threatLevel);
        } else if ((node.threatLevel || 0) > 0) {
            const chance = calculateEncounterChance(node.threatLevel || 0, count, playerStateMemo.staminaPct, playerStateMemo.vigorPct, 'on_search', settings.gameConfig);
            if (Math.random() < chance) {
                scheduleEnemySpawn(settings.gameConfig.mediaLoading.searchEnemySpawnDelay, undefined, '主动扫描引发异常环境波动。', node.threatLevel);
                return;
            }
        }

        addLog(`扫描结束。区域反馈为空。${count > settings.gameConfig.searchThresholds.repetitiveWarning ? '建议终止在此坐标的检索行为。' : ''}`, 'environment');
        AudioService.playSfx('text');
    }, [
        getCurrentNode, playerStateMemo, setPlayer, addLog, handleGameTick, settings,
        triggerCompanionReactions, setCurrentZone, currentNodeId, scheduleEnemySpawn
    ]);

    // 锚点对象行为响应求值，触发条件检查及状态覆写
    const handleObjectInteraction = useCallback((targetIndexStr?: string, isPuzzleBypass = false) => {
        const node = getCurrentNode();
        if (!node || !node.interactions) return;

        const index = targetIndexStr !== undefined
            ? parseInt(targetIndexStr, 10)
            : node.interactions.findIndex(i => !i.requirements?.items || i.requirements.items.every(id => hasItemInInventory(player.dynamic.inventory, id)));

        const interaction = node.interactions[index];
        if (!interaction) return;

        if (interaction.requirements?.items) {
            const missing = interaction.requirements.items.filter(id => !hasItemInInventory(player.dynamic.inventory, id));
            if (missing.length > 0) {
                addLog(`校验失败：依赖倒置错配 [${missing.join(', ')}]`, 'warning');
                AudioService.playSfx('click');
                return;
            }
        }

        if (!isPuzzleBypass && interaction.requirements?.puzzleSolved) {
            setActivePuzzleInteractionIndex(index);
            setActivePuzzleNodeId(currentNodeId);
            return;
        }

        const { results } = interaction;
        addLog(results.narrative || '例程执行完毕。', 'success');
        if (results.soundEffect) AudioService.playSfx(results.soundEffect);

        if (results.stateChange?.unlock?.length) {
            const targets = results.stateChange.unlock.map(t => t[0]);
            setCurrentZone(prev => {
                const updatedNodes = { ...prev.nodes };
                let hasChanged = false;

                targets.forEach(id => {
                    if (updatedNodes[id] && updatedNodes[id].lock) {
                        // 防劣化层拦截：避免 any 断言污染域模型
                        const { lock, ...unlockedNode } = updatedNodes[id];
                        updatedNodes[id] = unlockedNode as Node;
                        hasChanged = true;
                    }
                });

                return hasChanged ? { ...prev, nodes: updatedNodes } : prev;
            });
            addLog('区块锁闭解除。', 'event');
            AudioService.playSfx('success');
        }

        const changes = processStateChange(results.stateChange, player);
        changes.logs.forEach(log => addLog(log.text, log.type));

        setPlayer(prev => {
            let inv = changes.inventory || prev.dynamic.inventory;
            interaction.requirements?.items?.forEach(id => {
                const item = inv.find(i => i.id === id);
                if (item) inv = removeItemFromInventory(inv, item.instanceId);
            });
            return {
                ...prev,
                dynamic: { ...prev.dynamic, inventory: inv },
                companions: changes.companions || prev.companions
            };
        });

        if (changes.hpDelta) updatePlayer(0, changes.hpDelta);
        if (changes.sanityDelta) updatePlayer(changes.sanityDelta, 0);

        if ((node.threatLevel || 0) > 0) {
            const chance = calculateEncounterChance(node.threatLevel || 0, 0, playerStateMemo.staminaPct, playerStateMemo.vigorPct, 'on_interact', settings.gameConfig);
            if (Math.random() < chance) {
                scheduleEnemySpawn(settings.gameConfig.mediaLoading.enemySpawnDelay, undefined, '异常互动引发实体收敛。', node.threatLevel);
            }
        }

        setCurrentZone(prev => ({
            ...prev,
            nodes: {
                ...prev.nodes,
                [currentNodeId]: { ...prev.nodes[currentNodeId], interactions: prev.nodes[currentNodeId].interactions?.filter((_, i) => i !== index) }
            }
        }));
    }, [
        getCurrentNode, currentNodeId, player, setPlayer, addLog, settings,
        setCurrentZone, scheduleEnemySpawn, updatePlayer, playerStateMemo
    ]);

    const handleInteraction = useCallback((type: InteractionType, targetId?: string) => {
        if (type === 'interact_npc') {
            const node = getCurrentNode();
            if (node?.nodeNpc && (node.nodeNpc.initialState?.vital?.maxHp || 0) > 0) {
                addLog(`建立局部物理链接: ${node.nodeNpc.name}`, 'event');
                setActiveInteractionNPC(createNpcEntity(node.nodeNpc));
            }
        } else {
            handleObjectInteraction(targetId);
        }
    }, [getCurrentNode, addLog, setActiveInteractionNPC, handleObjectInteraction]);

    const getActivePuzzle = useCallback((): Puzzle | null => {
        if (!activePuzzleNodeId) return null;
        const node = currentZone.nodes[activePuzzleNodeId];
        return node?.interactions?.find(i => i.requirements?.puzzleSolved)?.requirements?.puzzleSolved || null;
    }, [activePuzzleNodeId, currentZone]);

    const activePuzzle = useMemo(() => getActivePuzzle(), [getActivePuzzle]);
    const activePuzzleMaxAttempts = activePuzzle?.restrictions?.maxAttempts ?? 3;

    useEffect(() => {
        if (!activePuzzle) {
            setPuzzleInput('');
            setPuzzleStatus('idle');
            setPuzzleStatusMsg('AWAITING_INPUT');
            setPuzzleAttempts(0);
            setPuzzleIsShaking(false);
            setPuzzleHintsUsed(0);
            setPuzzleTimeLeft(0);
            setPuzzleShowLore(false);
            setPuzzleSelectedOptions([]);
            setPuzzlePatternInput([]);
            if (puzzleTimerRef.current) clearInterval(puzzleTimerRef.current);
            if (puzzleCallbackTimerRef.current) clearTimeout(puzzleCallbackTimerRef.current);
            return;
        }

        setPuzzleInput('');
        setPuzzleStatus('idle');
        setPuzzleStatusMsg('AWAITING_INPUT');
        setPuzzleAttempts(0);
        setPuzzleIsShaking(false);
        setPuzzleHintsUsed(0);
        setPuzzleTimeLeft(activePuzzle.restrictions?.timeLimit ?? 0);
        setPuzzleShowLore(false);
        setPuzzleSelectedOptions([]);
        setPuzzleMemoryPhase('show');
        setPuzzleWireConnections({});
        setPuzzleSelectedWireId(null);

        if (activePuzzle.body.type === 'cloze') {
            const initialPattern = activePuzzle.body.body.flat().map(item => item === 'X' || item === null ? '' : item);
            setPuzzlePatternInput(initialPattern);
        } else {
            setPuzzlePatternInput([]);
        }

        if (puzzleTimerRef.current) clearInterval(puzzleTimerRef.current);
        if (puzzleCallbackTimerRef.current) clearTimeout(puzzleCallbackTimerRef.current);
    }, [activePuzzle]);

    useEffect(() => {
        const timeLimit = activePuzzle?.restrictions?.timeLimit ?? 0;
        if (!activePuzzle || !timeLimit || timeLimit <= 0 || puzzleStatus !== 'idle') return;

        if (puzzleTimerRef.current) clearInterval(puzzleTimerRef.current);
        puzzleTimerRef.current = setInterval(() => {
            setPuzzleTimeLeft(prev => {
                if (prev <= 1) {
                    AudioService.playSfx('glitch');
                    setPuzzleStatus('error');
                    setPuzzleStatusMsg('TIME_EXPIRED');
                    puzzleCallbackTimerRef.current = setTimeout(() => handlePuzzleFail(), 1500);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (puzzleTimerRef.current) clearInterval(puzzleTimerRef.current);
        };
    }, [activePuzzle, puzzleStatus]);

    const handlePuzzleInputChange = useCallback((val: string) => {
        if (puzzleStatus !== 'idle') return;
        setPuzzleInput(val);
        AudioService.playSfx('click');
    }, [puzzleStatus]);

    const handlePuzzleOptionSelect = useCallback((index: number) => {
        if (puzzleStatus !== 'idle') return;
        setPuzzleSelectedOptions([index]);
        AudioService.playSfx('click');
    }, [puzzleStatus]);

    const handlePuzzlePatternClick = useCallback((index: number) => {
        if (puzzleStatus !== 'idle' || !activePuzzle || activePuzzle.body.type !== 'cloze') return;
        const rawAnswer = activePuzzle.body.answer;
        const solutions = Array.isArray(rawAnswer) ? rawAnswer : [rawAnswer];
        const symbols = Array.from(new Set(['', ...solutions.filter(Boolean)])) as string[];
        setPuzzlePatternInput(prev => {
            const next = [...prev];
            const currentIndex = symbols.indexOf(prev[index]);
            next[index] = symbols[(currentIndex + 1) % symbols.length] || symbols[0] || '';
            return next;
        });
        AudioService.playSfx('click');
    }, [activePuzzle, puzzleStatus]);

    const handlePuzzleWireSelect = useCallback((wireId: string) => {
        if (puzzleStatus !== 'idle') return;
        setPuzzleSelectedWireId(prev => prev === wireId ? null : wireId);
        AudioService.playSfx('click');
    }, [puzzleStatus]);

    const handlePuzzleWireConnect = useCallback((portId: string) => {
        if (puzzleStatus !== 'idle' || !puzzleSelectedWireId) return;
        setPuzzleWireConnections(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(currentPortId => {
                if (next[currentPortId] === puzzleSelectedWireId) delete next[currentPortId];
            });
            next[portId] = puzzleSelectedWireId;
            return next;
        });
        setPuzzleSelectedWireId(null);
        AudioService.playSfx('click');
    }, [puzzleSelectedWireId, puzzleStatus]);

    const isPuzzlePortConnected = useCallback((portId: string) => Boolean(puzzleWireConnections[portId]), [puzzleWireConnections]);
    const isPuzzleWireConnected = useCallback((wireId: string) => Object.values(puzzleWireConnections).includes(wireId), [puzzleWireConnections]);

    const handlePuzzleSolve = useCallback(() => {
        if (!activePuzzleNodeId) return;
        const index = activePuzzleInteractionIndex;
        if (puzzleTimerRef.current) clearInterval(puzzleTimerRef.current);
        if (puzzleCallbackTimerRef.current) clearTimeout(puzzleCallbackTimerRef.current);
        setActivePuzzleInteractionIndex(null);
        setActivePuzzleNodeId(null);
        if (index !== null) handleObjectInteraction(index.toString(), true);
        setPuzzleStats(prev => ({ ...prev, solved: prev.solved + 1 }));
    }, [activePuzzleNodeId, activePuzzleInteractionIndex, handleObjectInteraction]);

    const handlePuzzleFail = useCallback(() => {
        if (!activePuzzleNodeId) return;
        if (puzzleTimerRef.current) clearInterval(puzzleTimerRef.current);
        if (puzzleCallbackTimerRef.current) clearTimeout(puzzleCallbackTimerRef.current);
        const node = currentZone.nodes[activePuzzleNodeId];
        const interaction = node?.interactions?.find(i => i.requirements?.puzzleSolved);
        if (!interaction?.requirements?.puzzleSolved) {
            setActivePuzzleNodeId(null);
            return;
        }

        addLog('█▓▒░ 逻辑锁校验失败 ░▒▓█', 'critical');
        addLog('触发底层防卫协议。', 'critical');
        AudioService.playSfx('glitch');

        const penalties = interaction.requirements.puzzleSolved.penalties;
        if (penalties?.spawnEnemy) {
            addLog('防卫例程激活：实体具象化。', 'critical');
            setActivePuzzleNodeId(null);
            scheduleEnemySpawn(settings.gameConfig.mediaLoading.puzzleFailEnemySpawnDelay, penalties.spawnEnemy);
        } else {
            if (penalties?.hp) {
                updatePlayer(0, -Math.abs(penalties.hp));
                addLog(`遭遇物理反馈冲击 (-${Math.abs(penalties.hp)} HP)`, 'warning');
            }
            if (penalties?.sanity) {
                updatePlayer(-Math.abs(penalties.sanity), 0);
                addLog(`神经接口过载 (-${Math.abs(penalties.sanity)} SAN)`, 'warning');
            }
            if (penalties?.permanentLock || penalties?.nodesToLock) {
                setCurrentZone(prev => ({
                    ...prev,
                    nodes: { ...prev.nodes, [activePuzzleNodeId]: { ...node, interactions: removeInteractionFromNode(node, interaction) } }
                }));
            }
        }

        setPuzzleStats(prev => ({ ...prev, failed: prev.failed + 1 }));
        setActivePuzzleInteractionIndex(null);
        setActivePuzzleNodeId(null);
    }, [activePuzzleNodeId, currentZone, addLog, updatePlayer, scheduleEnemySpawn, setCurrentZone, settings]);

    const submitActivePuzzle = useCallback(() => {
        if (!activePuzzle || puzzleStatus !== 'idle') return;

        let isCorrect = false;

        const normalizedInput = puzzleInput.trim().toLowerCase();
        const rawAnswer = activePuzzle.body.answer;
        const solutions = Array.isArray(rawAnswer)
            ? rawAnswer.map((s: string) => s.toLowerCase())
            : [rawAnswer?.toLowerCase() ?? ''];

        if (activePuzzle.body.type === 'type') {
            isCorrect = solutions.some(sol => normalizedInput === sol || normalizedInput.includes(sol));
        } else if (activePuzzle.body.type === 'choice') {
            if (puzzleSelectedOptions.length > 0) {
                const selectedIndex = puzzleSelectedOptions[0];
                const selectedOption = activePuzzle.body.body[selectedIndex]?.toLowerCase();
                isCorrect = solutions.some(sol => selectedOption === sol || selectedIndex.toString() === sol);
            }
        } else if (activePuzzle.body.type === 'cloze') {
            const currentPatternStr = puzzlePatternInput.join(',').toLowerCase();
            isCorrect = solutions.some(sol => currentPatternStr === sol || currentPatternStr.replace(/,/g, '') === sol);
        }

        if (isCorrect) {
            AudioService.playSfx('success');
            setPuzzleStatus('success');
            setPuzzleStatusMsg('ACCESS_GRANTED');

            if (activePuzzle.lore) {
                setPuzzleShowLore(true);
                puzzleCallbackTimerRef.current = setTimeout(() => handlePuzzleSolve(), 4000);
            } else {
                puzzleCallbackTimerRef.current = setTimeout(() => handlePuzzleSolve(), 1200);
            }
            return;
        }

        AudioService.playSfx('glitch');
        const nextAttempts = puzzleAttempts + 1;
        setPuzzleAttempts(nextAttempts);
        setPuzzleStatus('error');
        setPuzzleStatusMsg('ACCESS_DENIED');
        setPuzzleIsShaking(true);

        puzzleCallbackTimerRef.current = setTimeout(() => {
            setPuzzleIsShaking(false);
            setPuzzleStatus('idle');
            setPuzzleStatusMsg('AWAITING_INPUT');
            setPuzzleInput('');
            setPuzzleSelectedOptions([]);
            setPuzzleSelectedWireId(null);
        }, 800);

        if (nextAttempts >= activePuzzleMaxAttempts) {
            puzzleCallbackTimerRef.current = setTimeout(() => handlePuzzleFail(), 1000);
        }
    }, [
        activePuzzle,
        activePuzzleMaxAttempts,
        handlePuzzleFail,
        handlePuzzleSolve,
        puzzleAttempts,
        puzzleInput,
        puzzlePatternInput,
        puzzleSelectedOptions,
        puzzleStatus
    ]);

    const recordHintUsed = useCallback(() => {
        setPuzzleStats(p => ({ ...p, hints: p.hints + 1 }));
        updatePlayer(-settings.gameConfig.hintCosts.sanityCost, 0);
        addLog('强制提取缓存，理智阈值下降。', 'info');
    }, [updatePlayer, addLog, settings.gameConfig]);

    const handlePuzzleUseHint = useCallback(() => {
        const hints = activePuzzle?.hints || [];
        if (puzzleHintsUsed >= hints.length) return;
        setPuzzleHintsUsed(prev => prev + 1);
        recordHintUsed();
        AudioService.playSfx('text');
    }, [activePuzzle, puzzleHintsUsed, recordHintUsed]);

    const closePuzzle = useCallback(() => {
        if (puzzleTimerRef.current) clearInterval(puzzleTimerRef.current);
        if (puzzleCallbackTimerRef.current) clearTimeout(puzzleCallbackTimerRef.current);
        setActivePuzzleNodeId(null);
        setActivePuzzleInteractionIndex(null);
        addLog('中断当前例程。', 'info');
    }, [addLog]);

    const handlePuzzleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (puzzleStatus !== 'idle') return;
        if (e.key === 'Enter') submitActivePuzzle();
        if (e.key === 'Escape') closePuzzle();
    }, [closePuzzle, puzzleStatus, submitActivePuzzle]);

    const puzzleController = useMemo<PuzzleInteractionController>(() => ({
        input: puzzleInput,
        status: puzzleStatus,
        statusMsg: puzzleStatusMsg,
        attempts: puzzleAttempts,
        maxAttempts: activePuzzleMaxAttempts,
        isShaking: puzzleIsShaking,
        hintsUsed: puzzleHintsUsed,
        timeLeft: puzzleTimeLeft,
        showLore: puzzleShowLore,
        selectedOptions: puzzleSelectedOptions,
        patternInput: puzzlePatternInput,
        type: activePuzzle?.body.type ?? null,
        currentHints: activePuzzle?.hints?.slice(0, puzzleHintsUsed) || [],
        handleInputChange: handlePuzzleInputChange,
        handleOptionSelect: handlePuzzleOptionSelect,
        handlePatternClick: handlePuzzlePatternClick,
        handleSubmit: submitActivePuzzle,
        handleKeyDown: handlePuzzleKeyDown,
        handleUseHint: handlePuzzleUseHint
    }), [
        activePuzzle,
        activePuzzleMaxAttempts,
        handlePuzzleInputChange,
        handlePuzzleKeyDown,
        handlePuzzleOptionSelect,
        handlePuzzlePatternClick,
        handlePuzzleUseHint,
        puzzleAttempts,
        puzzleHintsUsed,
        puzzleInput,
        puzzleIsShaking,
        puzzleSelectedOptions,
        puzzleShowLore,
        puzzleStatus,
        puzzleStatusMsg,
        puzzleTimeLeft,
        submitActivePuzzle
    ]);

    // 执行装备挂载逻辑：接入元结构导出的纯函数并严格类型约束
    const handleEquipItem = useCallback((item: ItemInstance) => {
        if (!isEquipmentInstance(item)) return;
        AudioService.playSfx('click');

        setPlayer(prev => {
            const equipment = prev.dynamic.equipment;
            const itemType = isWeaponInstance(item) ? 'weapon' : isArmorInstance(item) ? 'armor' : 'accessory';

            const isEquipped =
                equipment.weapons.some(i => i && 'instanceId' in i && i.instanceId === item.instanceId) ||
                equipment.armors.some(i => i && 'instanceId' in i && i.instanceId === item.instanceId) ||
                equipment.accessories.some(i => i && 'instanceId' in i && i.instanceId === item.instanceId);

            let nextEquipment = equipment;
            let msg = '';

            if (isEquipped) {
                const slotIdx = itemType === 'weapon' ? equipment.weapons.findIndex(i => i && 'instanceId' in i && i.instanceId === item.instanceId) :
                    itemType === 'armor' ? equipment.armors.findIndex(i => i && 'instanceId' in i && i.instanceId === item.instanceId) :
                        equipment.accessories.findIndex(i => i && 'instanceId' in i && i.instanceId === item.instanceId);

                nextEquipment = unequipItem(equipment, itemType, slotIdx);
                msg = `卸载模块: ${item.name}`;
            } else {
                let targetSlot = 0;
                if (itemType === 'weapon') {
                    targetSlot = equipment.weapons.findIndex(i => i === null);
                    if (targetSlot === -1) targetSlot = equipment.weapons.length - 1;
                } else if (itemType === 'armor') {
                    targetSlot = equipment.armors.findIndex(i => i === null);
                    if (targetSlot === -1) targetSlot = equipment.armors.length - 1;
                } else if (itemType === 'accessory') {
                    targetSlot = equipment.accessories.findIndex(i => i === null);
                    if (targetSlot === -1) targetSlot = equipment.accessories.length - 1;
                }

                const oldItem = itemType === 'weapon' ? equipment.weapons[targetSlot] :
                    itemType === 'armor' ? equipment.armors[targetSlot] :
                        equipment.accessories[targetSlot];

                nextEquipment = equipItem(equipment, item, itemType, targetSlot);
                msg = oldItem ? `覆盖挂载 ${oldItem.name} → ${item.name}` : `挂载模块: ${item.name}`;
            }

            addLog(msg, 'info');
            return { ...prev, dynamic: { ...prev.dynamic, equipment: nextEquipment } };
        });
    }, [addLog, setPlayer]);

    const handleDiscardItem = useCallback((item: ItemInstance) => {
        AudioService.playSfx('click');
        setPlayer(prev => {
            const equipment = prev.dynamic.equipment;
            const itemType = isWeaponInstance(item) ? 'weapon' : isArmorInstance(item) ? 'armor' : isAccessoryInstance(item) ? 'accessory' : null;

            let nextEquipment = equipment;
            if (itemType) {
                const slotIdx = itemType === 'weapon' ? equipment.weapons.findIndex(i => i && 'instanceId' in i && i.instanceId === item.instanceId) :
                    itemType === 'armor' ? equipment.armors.findIndex(i => i && 'instanceId' in i && i.instanceId === item.instanceId) :
                        equipment.accessories.findIndex(i => i && 'instanceId' in i && i.instanceId === item.instanceId);
                if (slotIdx !== -1) {
                    nextEquipment = unequipItem(equipment, itemType, slotIdx);
                }
            }

            return {
                ...prev,
                dynamic: {
                    ...prev.dynamic,
                    equipment: nextEquipment,
                    inventory: removeItemFromInventory(prev.dynamic.inventory, item.instanceId)
                }
            };
        });
        addLog(`剔除资产: ${item.name}`, 'info');
    }, [setPlayer, addLog]);

    const handleUseItem = useCallback(async (item: ItemInstance, npc?: Entity<NpcTemplate, PlayerDynamicState>) => {
        AudioService.playSfx('click');
        const node = getCurrentNode();
        const interaction = validateNodeInteraction(node, item);

        if (interaction) {
            if (interaction.results?.narrative) addLog(interaction.results.narrative, 'success');
            if (interaction.results?.soundEffect) AudioService.playSfx(interaction.results.soundEffect);

            const changes = processStateChange(interaction.results.stateChange, player);
            changes.logs.forEach(log => addLog(log.text, log.type));

            setPlayer(p => ({
                ...p,
                dynamic: {
                    ...p.dynamic,
                    inventory: removeItemFromInventory(changes.inventory || p.dynamic.inventory, item.instanceId)
                },
                companions: changes.companions || p.companions
            }));

            if (changes.hpDelta) updatePlayer(0, changes.hpDelta);
            if (changes.sanityDelta) updatePlayer(changes.sanityDelta, 0);

            setCurrentZone(p => ({
                ...p,
                nodes: { ...p.nodes, [currentNodeId]: { ...node, interactions: removeInteractionFromNode(node, interaction) } }
            }));
            return;
        }

        if (isEquipmentInstance(item)) return handleEquipItem(item);

        if (item.type === 'consumable') {
            const cItem = item as ConsumableInstance;

            if (npc) {
                addLog(`注入目标 ${npc.static.name}: ${item.name}`, 'command');
                const sanityDelta = getEffectValueByType(cItem, 'heal_sanity');
                const hpDelta = getEffectValueByType(cItem, 'heal_hp');
                if (sanityDelta) addLog(`节点同步: 理智恢复 +${sanityDelta}`, 'success');
                if (hpDelta) addLog(`节点同步: 生命恢复 +${hpDelta}`, 'success');
                updateCompanion(npc.static.id, sanityDelta, hpDelta);
                AudioService.playSfx('success');
                setPlayer(prev => ({
                    ...prev,
                    dynamic: { ...prev.dynamic, inventory: removeItemFromInventory(prev.dynamic.inventory, item.instanceId) }
                }));
                return;
            }

            addLog(`初始化指令: ${item.name}`, 'command');
            const { attributeUpdates, neuralLinkUpdates, effectsApplied, hpDelta, sanityDelta } = applyConsumableEffects(cItem, player);

            effectsApplied.forEach(({ type, value }) => {
                const sign = value >= 0 ? '+' : '';
                addLog(`参数覆写 [${type}]: ${sign}${value}`, 'success');
            });

            setPlayer(p => ({
                ...p,
                dynamic: {
                    ...p.dynamic,
                    ...attributeUpdates,
                    inventory: removeItemFromInventory(p.dynamic.inventory, item.instanceId)
                },
                neuralLink: { ...p.neuralLink, ...neuralLinkUpdates }
            }));

            if (hpDelta !== 0 || sanityDelta !== 0) updatePlayer(sanityDelta, hpDelta);
            AudioService.playSfx('success');
            return;
        }

        // 应用标准类型守卫替代强制类型转换
        if (isAudioInstance(item)) {
            setLoadingAudioId(item.instanceId);
            try {
                const updated = await handleAudioItem(item, currentZone, settings, addLog, currentNodeId);
                if (updated.audioUrl !== item.audioUrl) {
                    setPlayer(p => ({
                        ...p,
                        dynamic: { ...p.dynamic, inventory: p.dynamic.inventory.map(i => i.instanceId === item.instanceId ? updated : i) }
                    }));
                }
            } finally {
                setLoadingAudioId(null);
            }
            return;
        }

        if (item.type === 'document') {
            addLog(`提取明文: ${item.name}`, 'command');
            addLog(item.desc, 'info');
            if ((item as DocumentInstance).documentContent) {
                addLog(`>>> ${item.name} <<<`, 'loot');
                addLog((item as DocumentInstance).documentContent, 'info');
            }
            return;
        }

        addLog(`静态审查: ${item.name}`, 'info');
        addLog(item.desc, 'info');
    }, [
        getCurrentNode, player, currentZone, settings, handleEquipItem,
        updatePlayer, setPlayer, setCurrentZone, currentNodeId, addLog, updateCompanion
    ]);

    return {
        getCurrentNode,
        handleLocalMove,
        handleSearch,
        handleInteraction,
        activePuzzleNodeId,
        setActivePuzzleNodeId,
        activePuzzleInteractionIndex,
        setActivePuzzleInteractionIndex,
        getActivePuzzle,
        handlePuzzleSolve,
        handlePuzzleFail,
        recordHintUsed,
        closePuzzle,
        puzzleStats,
        puzzleController,
        handleUseItem,
        handleEquipItem,
        handleDiscardItem,
        addItemToInventory,
        findItemInInventory,
        removeItemFromInventory,
        loadingAudioId
    }
}