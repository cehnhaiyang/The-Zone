import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
    GameState, PlayerState, Log, Zone, Settings, NpcTemplate, Attribute,
    Sanctuary, Entity, NpcDynamicState, StoryConfig, EnemyTemplate,
    CombatDynamicState, CombatVisualEvent, CardInstance, ItemInstance, Node,
    ZoneGenerationContext, Quest, Puzzle, NarrativePhase, PlayerDynamicState, LogType,
    Dialogue, PlotPoint, CurrentTime, ZoneDate, RealDate, NarrativeMode, NarrativePacing,
    ChainNarrative, initializeZoneRuntime, SanctuaryState, buildZoneGenerationContext,
    safeAudioOperation, initializeGameFromOrigin
} from '../meta';
import { INITIAL_SETTINGS, ORIGIN_TEMPLATES } from '../constants';
import { AudioService, KeyService, ProxyService, PersistenceService, ChainNarrativeService } from '../services';
import { useCombat } from './useCombat';
import { useSocialization } from './useSocialization';
import { useSanctuary, CustomRestConfig } from './useSanctuary';
import { useGameState } from './useGameState';
import { usePersistence } from './usePersistence';
import { useAssetLoad } from './useAssetLoad';
import { useAiGeneration } from './useAiGeneration';
import { useInteraction, PuzzleInteractionController } from './useInteraction';
import { useZoneTransition } from './useZoneTransition';
import { useCharacterProgression } from './useCharacterProgression';

interface UseGameParams { }

interface UseGameReturn {
    settings: Settings;
    setSettings: Dispatch<SetStateAction<Settings>>;
    gameState: GameState;
    setGameState: Dispatch<SetStateAction<GameState>>;
    player: PlayerState;
    setPlayer: Dispatch<SetStateAction<PlayerState>>;
    currentZone: Zone;
    currentNodeId: string;
    getCurrentNode: () => Node;
    currentEnemy: Entity<EnemyTemplate, CombatDynamicState> | null;
    combatLog: string[];
    logs: Log[];
    loadingStatus: string;
    sanctuary: Sanctuary;
    isGenerating: boolean;
    generatingTasks: Record<string, boolean>;
    isTaskGenerating: (mediaType: 'image' | 'video', type: 'scene' | 'enemy' | 'npc' | 'player', objId?: string) => boolean;
    activeInteractionNPC: Entity<NpcTemplate, NpcDynamicState> | null;
    showCutscene: boolean;
    setShowCutscene: Dispatch<SetStateAction<boolean>>;
    showNarrative: boolean;
    tempSearchVisualOverride: boolean;
    visualEvents: CombatVisualEvent[];
    activePuzzleNodeId: string | null;
    puzzleStats: { solved: number; failed: number; hints: number };
    puzzleController: PuzzleInteractionController;
    loadingAudioId: string | null;

    // 战斗系统状态与操作
    hand: CardInstance[];
    drawPile: CardInstance[];
    discardPile: CardInstance[];
    exhaustPile: CardInstance[];
    energy: number;
    maxEnergy: number;
    isPlayerTurn: boolean;
    discardRequired: number;
    handleManualDiscard: (card: CardInstance) => void;
    handlePlayCard: (card: CardInstance, manualTargetId?: string) => Promise<void>;
    handleEndTurn: () => Promise<void>;

    // 核心动作与环境交互
    initGame: (originId?: string | 'random') => Promise<void>;
    handleAction: (actionType: 'move_local' | 'move_zone' | 'search' | 'interact_obj' | 'interact_npc' | 'generate_video' | 'unlock' | 'sanctuary_return', targetId?: string, label?: string) => Promise<void>;
    handleUseItem: (item: ItemInstance, npc?: Entity<NpcTemplate, PlayerDynamicState>) => Promise<void>;
    handleEquipItem: (item: ItemInstance) => void;
    handleDiscardItem: (item: ItemInstance) => void;
    generateNewAsset: (type: 'scene' | 'enemy' | 'npc' | 'player', mediaType?: 'image' | 'video') => Promise<void>;
    proceedToNextZone: (useLocal: boolean, params?: ZoneGenerationContext, targetZoneId?: string, autoGenOptions?: { images?: boolean; videos?: boolean; audios?: boolean }) => Promise<void>;
    handleNarrative: (config: StoryConfig & { details?: { nodeCount: number; tension: number } }, autoGenOptions?: { images?: boolean; videos?: boolean; audios?: boolean }) => Promise<void>;
    handleLoadLibrary: (type: 'chain' | 'episodic', identifier: string) => Promise<void>;

    // 叙事库管理
    narrativeLibrary: {
        arcs: Array<{ title: string; mainAxis: string; zoneCount: number }>;
        episodic: Array<{ id: string; name: string; timestamp: number }>;
        isLoading: boolean;
    };
    loadNarrativeLibrary: () => Promise<void>;
    deleteNarrativeArc: (arcId: string) => Promise<boolean>;
    deleteEpisodicZone: (zoneId: string) => Promise<boolean>;

    // 叙事推演预览数据
    narrativePreview: {
        params?: StoryConfig;
        activePlots: PlotPoint[];
        mainPlots: PlotPoint[];
        sidePlots: PlotPoint[];
        expectedPlotsText: string;
        analysis?: ChainNarrative['analysis'];
    };

    // 叙事流程状态
    narrativeFlowStep: 'mode' | 'pacing' | 'theme' | 'config' | 'details' | 'preview' | 'library' | 'closed';
    narrativeFlowPendingConfig: Partial<StoryConfig>;
    narrativeFlowEpisodicTension: number;
    narrativeFlowEpisodicNodeCount: number;
    narrativeFlowHasSuspendedArc: boolean;
    setNarrativeFlowStep: React.Dispatch<React.SetStateAction<'mode' | 'pacing' | 'theme' | 'config' | 'details' | 'preview' | 'library' | 'closed'>>;
    setNarrativeFlowEpisodicTension: React.Dispatch<React.SetStateAction<number>>;
    setNarrativeFlowEpisodicNodeCount: React.Dispatch<React.SetStateAction<number>>;
    setNarrativeFlowPendingConfig: React.Dispatch<React.SetStateAction<Partial<StoryConfig>>>;
    handleNarrativeFlowOpenLibrary: () => void;
    handleNarrativeFlowLoadFromLibrary: (type: 'chain' | 'episodic', identifier: string) => void;
    handleNarrativeFlowModeConfirm: (mode: NarrativeMode) => void;
    handleNarrativeFlowPacingConfirm: (pacing: NarrativePacing) => void;
    handleNarrativeFlowThemeConfirm: (theme: string) => void;
    handleNarrativeFlowConfigConfirm: (themeConfig: { motif: string; mainAxis: string }) => void;
    handleNarrativeFlowDetailsConfirm: () => void;
    handleNarrativeFlowPreviewConfirm: (autoGenOptions?: { images?: boolean; videos?: boolean; audios?: boolean }) => void;
    handleNarrativeFlowBack: () => void;
    handleNarrativeFlowCancel: () => void;

    handleInteractWithCompanion: (npc: Entity<NpcTemplate, NpcDynamicState> | null) => void;
    levelUp: (targetId: string, attr: keyof Attribute) => void;
    gainExperience: (amount: number) => void;

    // NPC 交互系统
    setActiveInteractionNPC: Dispatch<SetStateAction<Entity<NpcTemplate, NpcDynamicState> | null>>;
    handleNPCChat: (message: string) => Promise<void>;
    handleNPCRecruit: () => void;
    handleNPCGift: (item: ItemInstance) => void;
    closeNPCInteraction: () => void;
    handleLocalNPCAction: (actionType: 'hug' | 'heal') => void;
    handleNPCTakeItem: (item: ItemInstance) => void;
    handleNPCIntimacy: () => Promise<void>;
    handleAcceptQuest: (questId: string, questData: Partial<Quest>) => void;
    handleMountProfile: (profileId: string) => Promise<void>;
    handleUnmountCreateNewProfile: (customName?: string) => Promise<void>;
    handleDeleteProfile: (profileId: string) => Promise<void>;

    // 庇护所管理系统
    transferItem: (item: ItemInstance, toStorage: boolean) => void;
    handleRest: (hours: number) => void;
    handleResourceTrade: (target: keyof SanctuaryState, amount: number) => void;
    upgradeSanctuary: () => void;
    getStorageCapacity: () => number;
    handleRepair: () => void;
    handleOrganizeStorage: () => void;
    getCustomRestConfig: (hours: number) => CustomRestConfig | null;
    handleUseMedicine: (amount?: number) => void;
    morale: number;
    isLowMorale: boolean;
    maxStorage: number;

    // 系统、资源配置与持久化
    setNeuralNoise: (level: number) => void;
    handleRandomSwitch: (mediaType: 'image' | 'video', type: 'scene' | 'enemy' | 'npc' | 'player', objId?: string, currentUrl?: string) => Promise<string | null>;
    hasMultipleVariants: (mediaType: 'image' | 'video', type: 'scene' | 'enemy' | 'npc' | 'player', objId?: string) => Promise<boolean>;
    handleSaveGame: (saveName?: string) => Promise<string | null>;
    handleLoadGame: (fileName: string) => Promise<boolean>;
    handleListSaves: () => Promise<Array<{ name: string; size: number; modified: Date }>>;
    handleDeleteSave: (fileName: string) => Promise<boolean>;

    // 向量记忆库扩展 (ChromaDB)
    handleInitChroma: (persistDir?: string) => Promise<boolean>;
    handleAddDialogue: (npcId: string, dialogue: Dialogue, startIndex: number) => Promise<void>;
    handleSemanticSearch: (npcId: string, query: string, topK?: number) => Promise<Array<{ text: string; speaker: string; timestamp: number; distance: number }>>;
    handleAddSummary: (npcId: string, summary: string, startIndex: number, endIndex: number) => Promise<void>;
    handleSearchSummaries: (npcId: string, query: string, topK?: number) => Promise<Array<{ summary: string; startIndex: number; endIndex: number }>>;
    handleClearNpcHistory: (npcId: string) => Promise<void>;

    // 解谜系统
    setActivePuzzleNodeId: Dispatch<SetStateAction<string | null>>;
    getActivePuzzle: () => Puzzle | null;
    handlePuzzleSolve: () => void;
    handlePuzzleFail: () => void;
    recordHintUsed: () => void;
    closePuzzle: () => void;

    // 叙事引擎控制
    dyNarrative: string;
    isGeneratingDyNarrative: boolean;
    triggerDyNarrative: () => Promise<void>;
    clearDyNarrative: () => void;
    updateNarrativeState: (playerState: PlayerState, currentNode: Node | null) => void;
    currentNarrative: unknown;
    narrativeAnalysis: ChainNarrative['analysis'] | null;
    getNarrativeHealth: (playerState: PlayerState) => number;
    getCurrentNarrativePhase: () => NarrativePhase;
    resetNarrative: () => void;

    // 时间与回合管理
    advanceExplorationStep: () => void;
    advanceCombatTurn: () => void;
    resetCombatTurn: () => void;
    getCurrentTime: () => CurrentTime;
    getTimeTuple: () => [RealDate, ZoneDate, number];
}

export const useGame = ({ }: UseGameParams = {}): UseGameReturn => {
    // === 顶级全局状态容器 ===
    const [settings, setSettings] = useState<Settings>(INITIAL_SETTINGS);
    const [gameState, setGameState] = useState<GameState>(GameState.MAIN_MENU);

    // 使用统一初始化函数构建初始游戏状态
    const defaultOrigin = ORIGIN_TEMPLATES[0];
    const { player: defaultPlayer, sanctuary: defaultSanctuary, zone: defaultZone } = initializeGameFromOrigin(defaultOrigin);
    const [player, setPlayer] = useState<PlayerState>(defaultPlayer);
    const [currentZone, setCurrentZone] = useState<Zone>(defaultZone);
    const [sanctuary, setSanctuary] = useState<Sanctuary>(defaultSanctuary);

    const [currentNodeId, setCurrentNodeId] = useState<string>("");
    const [logs, setLogs] = useState<Log[]>([]);
    const [showCutscene, setShowCutscene] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState<string>("");
    const [activeInteractionNPC, setActiveInteractionNPC] = useState<Entity<NpcTemplate, NpcDynamicState> | null>(null);
    const [showNarrative, setShowNarrative] = useState(false);
    const [tempSearchVisualOverride, setTempSearchVisualOverride] = useState(false);
    const [generatingTasks, setGeneratingTasks] = useState<Record<string, boolean>>({});
    const isGenerating = useMemo(() => Object.keys(generatingTasks).length > 0, [generatingTasks]);
    const [isGeneratingDyNarrative, setIsGeneratingDyNarrative] = useState(false);

    const isTaskGenerating = useCallback((mediaType: 'image' | 'video', type: 'scene' | 'enemy' | 'npc' | 'player', objId?: string): boolean => {
        if (!objId) return isGenerating;
        const key = `${mediaType}_${type}_${objId}`;
        return !!generatingTasks[key];
    }, [generatingTasks, isGenerating]);
    const initializedAudio = useRef(false);

    // === 基础辅助函数 ===

    /**
     * 日志分发器
     * 集中化管理系统侧与叙事侧的事件入列。
     */
    const addLog = useCallback((text: string, type: LogType = 'info') => {
        setLogs(prev => [...prev, {
            id: Math.random().toString(36).slice(2, 11),
            text,
            type,
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
        }]);
    }, []);

    /**
     * 系统异常统筹处
     */
    const handleAsyncError = useCallback((error: unknown, context: string) => {
        const err = error as Error;
        console.error(`[Async Error] ${context}:`, err);
        addLog(`系统异常 (${context}): ${err.message || err}`, 'critical');
    }, [addLog]);

    /**
     * 安全节点读取
     * 确保即使在跨越/载入瞬间发生 ID 孤立，也不会导致下层取值崩溃。
     */
    const getCurrentNode = useCallback((): Node => {
        return currentZone?.nodes?.[currentNodeId] || ({
            name: "未知领域",
            desc: "现实结构在此处发生了轻微的断层。",
            visualPrompt: "未知",
            isVisited: false,
            searchCount: 0
        } as Node);
    }, [currentZone, currentNodeId]);

    /**
     * 玩家核心生命体征边界更新器
     */
    const updatePlayer = useCallback((sanityDelta: number, hpDelta: number) => {
        setPlayer((p: PlayerState) => {
            const maxHp = p.dynamic.maxHp;
            const maxSanity = p.dynamic.maxSanity;
            return {
                ...p,
                dynamic: {
                    ...p.dynamic,
                    sanity: Math.max(0, Math.min(maxSanity, p.dynamic.sanity + sanityDelta)),
                    hp: Math.max(0, Math.min(maxHp, p.dynamic.hp + hpDelta))
                }
            };
        });
    }, []);

    /**
     * 独立同伴生命体征监控器
     */
    const updateCompanion = useCallback((npcId: string, sanityDelta: number, hpDelta: number) => {
        setPlayer((p: PlayerState) => {
            const newCompanions = p.companions.map((c: Entity<NpcTemplate, NpcDynamicState>) => {
                if (c.static.id !== npcId) return c;

                const maxHp = c.static.initialState.vital.maxHp;
                const maxSanity = c.static.initialState.vital.maxSanity;

                const newHp = Math.max(0, Math.min(maxHp, c.dynamic.hp + hpDelta));
                const newSanity = Math.max(0, Math.min(maxSanity, c.dynamic.sanity + sanityDelta));

                if (newHp <= 0 && c.dynamic.hp > 0) addLog(`${c.static.name} 倒下了。`, "critical");
                if (newSanity <= 0 && c.dynamic.sanity > 0) addLog(`${c.static.name} 的精神彻底崩溃了。`, "critical");

                return { ...c, dynamic: { ...c.dynamic, hp: newHp, sanity: newSanity } };
            });
            return { ...p, companions: newCompanions };
        });
    }, [addLog]);

    const setNeuralNoise = useCallback((level: number) => {
        setPlayer((p: PlayerState) => ({
            ...p,
            neuralLink: { ...p.neuralLink, noiseLevel: Math.max(0, Math.min(3, level)) }
        }));
    }, []);

    /**
     * 核心初始化入口
     * 执行服务预热 -> 音频激活 -> 庇护所实例化 -> 状态同步
     */
    const initGame = useCallback(async (originId: string | 'random' = 'origin_hospital') => {
        try {
            ProxyService.init();
            KeyService.registerFromSettings(settings);
            await PersistenceService.loadConfig();

            // 惰性激活音频上下文，规避浏览器自动播放限制
            if (!initializedAudio.current) {
                try {
                    await AudioService.init();
                    initializedAudio.current = true;
                } catch (audioError) {
                    console.warn('音频系统初始化失败:', audioError);
                    addLog('音频系统初始化失败，游戏将以静音模式运行', 'warning');
                }
            }

            safeAudioOperation(() => initializedAudio.current && AudioService.playSfx('click'), '音效失败');

            // 1. 获取起源模板
            const originTemplate = ORIGIN_TEMPLATES.find(o => o.id === originId) || ORIGIN_TEMPLATES[0];

            // 2. 使用统一初始化函数构建游戏状态
            const { player: initialPlayer, sanctuary, zone, entranceNodeId } = initializeGameFromOrigin(originTemplate);

            // 3. 原子级状态提交
            setPlayer(initialPlayer);
            setSanctuary(sanctuary);
            setCurrentZone(zone);
            setCurrentNodeId(entranceNodeId);
            setLogs([]);
            setGameState(GameState.SANCTUARY);

            addLog(`身份确认: ${initialPlayer.static.name} [${initialPlayer.static.style.toUpperCase()}]`, "info");
            addLog("系统重启。认知模块上线。", "info");

            safeAudioOperation(() => initializedAudio.current && AudioService.setTheme('sanctuary'), '主题设置失败');

        } catch (initError) {
            console.error('初始化错误:', initError);
            addLog('初始化失败，请检查配置重试', 'critical');
            setLoadingStatus('初始化失败');
        }
    }, [setGameState, setLoadingStatus, addLog, setPlayer, setSanctuary, setCurrentZone, setCurrentNodeId, setLogs, settings]);

    // === 核心业务子 Hook 注册区 ===

    const setCompanions = useCallback((updater: React.SetStateAction<Entity<NpcTemplate, NpcDynamicState>[]>) => {
        setPlayer((prev: PlayerState) => {
            const newCompanions = typeof updater === 'function' ? updater(prev.companions) : updater;
            return { ...prev, companions: newCompanions };
        });
    }, []);

    const { levelUp, gainExperience } = useCharacterProgression({
        player,
        setPlayer,
        addLog
    });

    const {
        currentEnemy, setCurrentEnemy, combatLog, spawnEnemy,
        visualEvents, hand, drawPile, discardPile, exhaustPile, energy, maxEnergy,
        handlePlayCard, handleEndTurn, isPlayerTurn, discardRequired, handleManualDiscard
    } = useCombat({
        playerState: player,
        companions: player.companions,
        setPlayerState: setPlayer,
        setCompanions,
        setGameState,
        addLog,
        updatePlayer,
        updateCompanion
    });

    // 定义叙事流程回调（需要在 useGameState 之前定义）
    const narrativeFlowCallbacksRef = useRef({
        onComplete: async (config: StoryConfig, autoGenOptions?: { images?: boolean; videos?: boolean; audios?: boolean }) => {
            // 这个会在后面通过 useEffect 更新
        },
        onLoadLibrary: async (type: 'chain' | 'episodic', identifier: string) => {
            // 这个会在后面通过 useEffect 更新
        },
        onCancel: () => {
            setShowNarrative(false);
        }
    });

    const {
        handleGameTick, dyNarrative, setDyNarrative, clearDyNarrative,
        currentNarrative, narrativeAnalysis, updateNarrativeState, getNarrativeHealth, getCurrentNarrativePhase, resetNarrative,
        narrativeLibrary, loadNarrativeLibrary, deleteNarrativeArc, deleteEpisodicZone, narrativePreview,
        advanceExplorationStep, advanceCombatTurn, resetCombatTurn, getCurrentTime, getTimeTuple,
        triggerCompanionReactions,
        // 叙事流程状态
        narrativeFlowStep,
        narrativeFlowPendingConfig,
        narrativeFlowEpisodicTension,
        narrativeFlowEpisodicNodeCount,
        narrativeFlowHasSuspendedArc,
        // 叙事流程状态设置器
        setNarrativeFlowStep,
        setNarrativeFlowEpisodicTension,
        setNarrativeFlowEpisodicNodeCount,
        setNarrativeFlowPendingConfig,
        // 叙事流程处理函数
        handleNarrativeFlowOpenLibrary,
        handleNarrativeFlowLoadFromLibrary,
        handleNarrativeFlowModeConfirm,
        handleNarrativeFlowPacingConfirm,
        handleNarrativeFlowThemeConfirm,
        handleNarrativeFlowConfigConfirm,
        handleNarrativeFlowDetailsConfirm,
        handleNarrativeFlowPreviewConfirm,
        handleNarrativeFlowBack,
        handleNarrativeFlowCancel
    } = useGameState({
        gameData: { player, settings, gameState, currentZone },
        updaters: { setPlayer, setCurrentZone, setCurrentNodeId, setSanctuary, setSettings, setGameState },
        currentNodeId,
        addLog,
        spawnEnemy,
        narrativeFlowCallbacks: narrativeFlowCallbacksRef.current
    });

    const {
        transferItem, handleRest, handleResourceTrade, getStorageCapacity, getCustomRestConfig, handleUseMedicine,
        morale, isLowMorale, maxStorage
    } = useSanctuary({
        player,
        setPlayer,
        addLog,
        gameState
    });

    const {
        autoLoadAssets, handleRandomSwitch, hasMultipleVariants
    } = useAssetLoad({
        currentZone,
        addLog,
        onUpdateAsset: (mediaType, type, objId, url) => {
            // 根据类型更新相应状态
            if (type === 'scene' && objId) {
                setCurrentZone(prev => ({
                    ...prev,
                    nodes: {
                        ...prev.nodes,
                        [objId]: {
                            ...prev.nodes[objId],
                            ...(mediaType === 'video' ? { videoUrl: url } : { imageUrl: url })
                        }
                    }
                }));
            } else if (type === 'player') {
                setPlayer(p => ({ ...p, dynamic: { ...p.dynamic, imageUrl: url } }));
            } else if (type === 'enemy' && objId) {
                setCurrentEnemy(prev => (prev && prev.static.id === objId) ? ({ ...prev, dynamic: { ...prev.dynamic, imageUrl: url } }) : prev);
            } else if (type === 'npc' && objId) {
                // 更新当前交互的 NPC
                setActiveInteractionNPC(prev => (prev && prev.static.id === objId) ? ({
                    ...prev,
                    dynamic: { ...prev.dynamic, imageUrl: url }
                }) : prev);
                // 同时更新 player.companions 中的对应 NPC（如果已招募）
                setPlayer(p => ({
                    ...p,
                    companions: p.companions.map(c =>
                        c.static.id === objId
                            ? { ...c, dynamic: { ...c.dynamic, imageUrl: url } }
                            : c
                    )
                }));
            }
        }
    });

    const {
        generateNewDy, generateNewZone, handleAutoGeneration, generateNewAsset: generateAssetCore
    } = useAiGeneration({
        player,
        currentZone,
        settings,
        addLog,
        setLoadingStatus,
        handleAsyncError
    });

    const { proceedToNextZone } = useZoneTransition({
        player,
        setCurrentZone,
        setCurrentNodeId,
        setPlayer,
        gameState,
        setGameState,
        addLog,
        updatePlayer,
        triggerCompanionReactions,
        setLoadingStatus,
        sanctuary,
        currentZone,
        autoLoadAssets,
        handleAsyncError,
        generateNewZone,
        handleAutoGeneration
    });

    // 占位函数
    const handleRepair = useCallback(() => {
        addLog('修复功能尚未实现', 'info');
    }, [addLog]);

    const handleOrganizeStorage = useCallback(() => {
        addLog('整理仓库功能尚未实现', 'info');
    }, [addLog]);

    const upgradeSanctuary = useCallback(() => {
        addLog('庇护所升级功能尚未实现', 'warning');
    }, [addLog]);

    const {
        handleLocalMove, handleSearch, handleInteraction, activePuzzleNodeId, setActivePuzzleNodeId,
        getActivePuzzle, handlePuzzleSolve, handlePuzzleFail, recordHintUsed, closePuzzle, puzzleStats, puzzleController,
        handleUseItem, handleEquipItem, handleDiscardItem, loadingAudioId
    } = useInteraction({
        currentZone,
        setCurrentZone,
        currentNodeId,
        setCurrentNodeId,
        player,
        setPlayer,
        addLog,
        handleGameTick,
        updatePlayer,
        setShowCutscene,
        triggerCompanionReactions,
        spawnEnemy,
        setActiveInteractionNPC: (npc: Entity<NpcTemplate, NpcDynamicState>) => setActiveInteractionNPC(npc),
        sanctuaryId: sanctuary.id,
        settings,
        updateCompanion
    });

    const triggerDyNarrative = useCallback(async () => {
        setIsGeneratingDyNarrative(true);
        try {
            const narrative = await generateNewDy(player, getCurrentNode(), currentNodeId);
            if (narrative) {
                setDyNarrative(narrative);
            }
        } catch (error) {
            handleAsyncError(error, "推演动态叙事");
        } finally {
            setIsGeneratingDyNarrative(false);
        }
    }, [generateNewDy, player, getCurrentNode, currentNodeId, setDyNarrative, handleAsyncError]);

    const {
        handleNPCChat, handleLocalNPCAction, handleNPCTakeItem, handleNPCRecruit, handleNPCGift,
        handleNPCIntimacy, closeNPCInteraction, handleAcceptQuest, handleMountProfile, handleUnmountCreateNewProfile, handleDeleteProfile
    } = useSocialization({
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
    });

    const {
        handleSaveGame, handleLoadGame, handleListSaves, handleDeleteSave,
        handleInitChroma, handleAddDialogue, handleSemanticSearch, handleAddSummary, handleSearchSummaries, handleClearNpcHistory
    } = usePersistence({
        gameStateData: {
            player,
            currentZone,
            settings,
            gameState
        },
        updaters: {
            setPlayer,
            setCurrentZone,
            setCurrentNodeId,
            setSanctuary,
            setSettings,
            setGameState
        },
        addLog
    });

    /**
     * 生成请求包装器。
     * 根据执行环境动态构建媒体上下文，并将 LLM 反馈的图频对象安全挂载至对应实体树。
     */
    const generateNewAssetWrapper = useCallback(async (targetType: 'scene' | 'enemy' | 'npc' | 'player', mediaType?: 'image' | 'video') => {
        const effectiveMediaType = mediaType || (settings.preferredMediaType || 'image');
        let objId: string | undefined;

        if (targetType === 'scene') objId = currentNodeId;
        else if (targetType === 'enemy') objId = currentEnemy?.static.id;
        else if (targetType === 'player') objId = player.static.id;
        else if (targetType === 'npc') objId = activeInteractionNPC?.static.id;

        const taskKey = objId ? `${effectiveMediaType}_${targetType}_${objId}` : '';
        if (taskKey) {
            setGeneratingTasks(prev => ({ ...prev, [taskKey]: true }));
        }

        try {
            if (targetType === 'scene') {
                const url = await generateAssetCore(effectiveMediaType as 'image' | 'video', 'scene', {
                    id: currentNodeId,
                    name: getCurrentNode().name,
                    visualPrompt: getCurrentNode().visualPrompt || getCurrentNode().desc
                });
                if (url) {
                    setCurrentZone(prev => ({
                        ...prev,
                        nodes: {
                            ...prev.nodes,
                            [currentNodeId]: {
                                ...prev.nodes[currentNodeId],
                                ...(effectiveMediaType === 'video' ? { videoUrl: url } : { imageUrl: url })
                            }
                        }
                    }));
                }
            } else if (targetType === 'enemy' && currentEnemy) {
                const url = await generateAssetCore('image', 'enemy', {
                    id: currentEnemy.static.id,
                    name: currentEnemy.static.name,
                    visualPrompt: currentEnemy.static.visualPrompt || currentEnemy.static.desc
                });
                if (url) {
                    setCurrentEnemy(prev => prev ? ({ ...prev, dynamic: { ...prev.dynamic, imageUrl: url } }) : null);
                    AudioService.playSfx('scare');
                }
            } else if (targetType === 'player') {
                const url = await generateAssetCore('image', 'player', {
                    id: player.static.id,
                    name: player.static.name,
                    visualPrompt: player.static.visualPrompt || "一个在末日废土中挣扎的幸存者"
                });
                if (url) {
                    setPlayer(p => ({ ...p, dynamic: { ...p.dynamic, imageUrl: url } }));
                }
            } else if (targetType === 'npc' && activeInteractionNPC) {
                const url = await generateAssetCore('image', 'npc', {
                    id: activeInteractionNPC.static.id,
                    name: activeInteractionNPC.static.name,
                    visualPrompt: activeInteractionNPC.static.visualPrompt || activeInteractionNPC.static.desc
                });
                if (url) {
                    setActiveInteractionNPC(prev => prev ? ({
                        ...prev,
                        static: { ...prev.static, imageUrl: url },
                        dynamic: { ...prev.dynamic, imageUrl: url }
                    }) : null);
                    setPlayer(p => ({
                        ...p,
                        companions: p.companions.map(c => c.static.id === activeInteractionNPC.static.id ? {
                            ...c,
                            static: { ...c.static, imageUrl: url },
                            dynamic: { ...c.dynamic, imageUrl: url }
                        } : c)
                    }));
                    AudioService.playSfx('success');
                }
            }
        } catch (error) {
            handleAsyncError(error, `生成目标流媒体资产 [${targetType}]`);
        } finally {
            if (taskKey) {
                setGeneratingTasks(prev => {
                    const next = { ...prev };
                    delete next[taskKey];
                    return next;
                });
            }
        }
    }, [generateAssetCore, currentNodeId, getCurrentNode, setCurrentZone, currentEnemy, setCurrentEnemy, player.static, setPlayer, activeInteractionNPC, setActiveInteractionNPC, settings.preferredMediaType, handleAsyncError]);

    /**
     * 玩家核心动作调度器。
     * 所有环境交互在转交子系统前必须进行 Tick 核对，引入异步安全边界防宕机。
     */
    const handleAction = useCallback(async (
        actionType: 'move_local' | 'move_zone' | 'search' | 'interact_obj' | 'interact_npc' | 'generate_video' | 'unlock' | 'sanctuary_return',
        targetId?: string,
        label?: string
    ) => {
        try {
            AudioService.playSfx('click');
            if (['move_local', 'search', 'interact_obj', 'unlock'].includes(actionType)) {
                handleGameTick(1);
            }
            if (actionType === 'search') {
                setTempSearchVisualOverride(true);
                AudioService.playSfx('heartbeat');
                setTimeout(() => setTempSearchVisualOverride(false), 2500);
            }

            switch (actionType) {
                case 'generate_video':
                    await generateNewAssetWrapper('scene', 'video');
                    break;
                case 'move_local':
                    if (targetId) handleLocalMove(targetId, label);
                    break;
                case 'move_zone':
                    if (targetId && targetId.includes('sanctuary')) {
                        await proceedToNextZone(false, undefined, targetId);
                    } else {
                        // 重置叙事流程状态并显示面板
                        setNarrativeFlowStep('mode');
                        setShowNarrative(true);
                    }
                    break;
                case 'interact_npc':
                    handleInteraction('interact_npc');
                    break;
                case 'interact_obj':
                case 'unlock':
                    handleInteraction('interact_obj', targetId);
                    break;
                case 'search':
                    handleSearch();
                    break;
            }
        } catch (error) {
            handleAsyncError(error, `调度玩家动作 [${actionType}]`);
        }
    }, [handleGameTick, generateNewAssetWrapper, handleLocalMove, proceedToNextZone, handleInteraction, handleSearch, handleAsyncError]);

    const handleNarrativeWrapper = useCallback(async (config: StoryConfig & { details?: { nodeCount: number; tension: number } }, autoGenOptions?: { images?: boolean; videos?: boolean; audios?: boolean }) => {
        setShowNarrative(false);

        if (!config) return;

        try {
            // 构建叙事配置上下文
            const analysis = ChainNarrativeService.analyzeChainNarrative(player);
            const genContext = buildZoneGenerationContext(config, player, analysis);
            // 进入下一个区域，传递叙事配置上下文和自动生成选项
            await proceedToNextZone(false, genContext, undefined, autoGenOptions);
        } catch (error) {
            handleAsyncError(error, "初始化叙事层生成");
        }
    }, [proceedToNextZone, handleAsyncError, player]);

    const handleLoadLibrary = useCallback(async (type: 'chain' | 'episodic', identifier: string) => {
        setShowNarrative(false);
        setLoadingStatus('正在加载叙事...');
        setGameState(GameState.LOADING);

        try {
            if (type === 'chain') {
                const result = await PersistenceService.loadArcZone(identifier, 1);

                if (result.success && result.data) {
                    const processedZone = initializeZoneRuntime(result.data as Zone) as Zone;
                    setCurrentZone(processedZone);
                    setCurrentNodeId(processedZone.initial.entrance);
                    setGameState(GameState.PLAYING);
                    addLog(`已加载叙事链区域 [${result.currentIndex}/${result.maxIndex}]`, 'info');
                } else {
                    throw new Error('链路加载失败');
                }
            } else {
                const result = await PersistenceService.loadEpisodicZone(identifier);

                if (result.success && result.data) {
                    const processedZone = initializeZoneRuntime(result.data as Zone) as Zone;
                    setCurrentZone(processedZone);
                    setCurrentNodeId(processedZone.initial.entrance);
                    setGameState(GameState.PLAYING);
                    addLog('已加载单元剧区域', 'info');
                } else {
                    throw new Error('单元剧加载失败');
                }
            }
        } catch (error) {
            handleAsyncError(error, "持久化存根解析");
            setGameState(GameState.PLAYING);
        }
    }, [setGameState, setLoadingStatus, addLog, setPlayer, setCurrentZone, setCurrentNodeId, handleAsyncError]);

    // 更新叙事流程回调
    useEffect(() => {
        narrativeFlowCallbacksRef.current = {
            onComplete: handleNarrativeWrapper,
            onLoadLibrary: handleLoadLibrary,
            onCancel: () => {
                setShowNarrative(false);
            }
        };
    }, [handleNarrativeWrapper, handleLoadLibrary]);

    return {
        // === 状态源对外抛出 ===
        settings, setSettings,
        gameState, setGameState,
        player,
        setPlayer,
        currentZone,
        currentNodeId, getCurrentNode,
        currentEnemy,
        combatLog,
        logs,
        loadingStatus,
        sanctuary,
        isGenerating,
        generatingTasks,
        isTaskGenerating,
        activeInteractionNPC,
        showCutscene, setShowCutscene,
        showNarrative,
        tempSearchVisualOverride,
        visualEvents,
        activePuzzleNodeId,
        puzzleStats,
        puzzleController,
        loadingAudioId,
        hand, drawPile, discardPile, exhaustPile, energy, maxEnergy, isPlayerTurn,
        discardRequired,
        handleManualDiscard,

        // === 核心管道暴露 ===
        initGame,
        handleAction,
        handleUseItem,
        handleEquipItem,
        handleDiscardItem,
        generateNewAsset: generateNewAssetWrapper,
        proceedToNextZone,
        handleNarrative: handleNarrativeWrapper,
        handleLoadLibrary,

        // 叙事库管理
        narrativeLibrary,
        loadNarrativeLibrary,
        deleteNarrativeArc,
        deleteEpisodicZone,

        // 叙事推演预览数据
        narrativePreview,

        // 叙事流程状态
        narrativeFlowStep,
        narrativeFlowPendingConfig,
        narrativeFlowEpisodicTension,
        narrativeFlowEpisodicNodeCount,
        narrativeFlowHasSuspendedArc,
        // 叙事流程状态设置器
        setNarrativeFlowStep,
        setNarrativeFlowEpisodicTension,
        setNarrativeFlowEpisodicNodeCount,
        setNarrativeFlowPendingConfig,
        // 叙事流程处理函数
        handleNarrativeFlowOpenLibrary,
        handleNarrativeFlowLoadFromLibrary,
        handleNarrativeFlowModeConfirm,
        handleNarrativeFlowPacingConfirm,
        handleNarrativeFlowThemeConfirm,
        handleNarrativeFlowConfigConfirm,
        handleNarrativeFlowDetailsConfirm,
        handleNarrativeFlowPreviewConfirm,
        handleNarrativeFlowBack,
        handleNarrativeFlowCancel,

        handleInteractWithCompanion: setActiveInteractionNPC,
        levelUp,
        gainExperience,

        // === NPC 与社会学系统 ===
        setActiveInteractionNPC,
        handleNPCChat,
        handleNPCRecruit,
        handleNPCGift,
        closeNPCInteraction,
        handleLocalNPCAction,
        handleNPCTakeItem,
        handleNPCIntimacy,
        handleAcceptQuest,
        handleMountProfile,
        handleUnmountCreateNewProfile,
        handleDeleteProfile,

        // === 庇护所与生态结算 ===
        transferItem, handleRest, handleResourceTrade, upgradeSanctuary, getStorageCapacity, handleRepair, handleOrganizeStorage, getCustomRestConfig, handleUseMedicine,
        morale, isLowMorale, maxStorage,

        // === 硬件外设与持久化引擎 ===
        setNeuralNoise,
        handleRandomSwitch,
        hasMultipleVariants,
        handleSaveGame, handleLoadGame, handleListSaves, handleDeleteSave,
        handleInitChroma, handleAddDialogue, handleSemanticSearch, handleAddSummary, handleSearchSummaries, handleClearNpcHistory,
        setActivePuzzleNodeId, getActivePuzzle, handlePuzzleSolve, handlePuzzleFail, recordHintUsed, closePuzzle,
        handlePlayCard, handleEndTurn,

        // === LLM 叙事内核操控 ===
        dyNarrative, isGeneratingDyNarrative, triggerDyNarrative, clearDyNarrative,
        updateNarrativeState, currentNarrative, narrativeAnalysis, getNarrativeHealth,
        getCurrentNarrativePhase, resetNarrative,
        advanceExplorationStep, advanceCombatTurn, resetCombatTurn, getCurrentTime, getTimeTuple
    };
};