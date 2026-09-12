import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
    GameState,
    applyEffectDeltas,
    clampDynamicVitals,
    getAppliedAccessoryDeltas,
    negateEffectDeltas,
    normalizeEquipmentWithOverflow,
    reclaimOverflowEquipments,
    initializeZoneRuntime,
    buildZoneGenerationContext,
    safeAudioOperation,
    initializeGameFromOrigin,
} from '../meta';
import type {
    PlayerState,
    Log,
    Zone,
    Settings,
    NpcTemplate,
    AttributeType,
    Sanctuary,
    Entity,
    NpcDynamicState,
    StoryConfig,
    CombatEnemy,
    EnemyTemplate,
    ItemInstance,
    Node,
    ZoneGenerationContext,
    Quest,
    Puzzle,
    NarrativePhase,
    LogType,
    PlotPoint,
    CurrentTime,
    DyNarrative,
    ZoneDate,
    NarrativeMode,
    NarrativePacing,
    ChainNarrative,
    SanctuaryState,
    CombatIntent,
    Tactic,
    CombatAlly,
    AttackResult,
    DefenseResult,
    Facility,
    Resident,
    SanctuaryEventChange,
} from '../meta';
import { INITIAL_SETTINGS, ORIGIN_TEMPLATES } from '../constants';
import {
    AudioService,
    KeyService,
    ProxyService,
    PersistenceService,
    ChainNarrativeService,
    DynamicNarrativeService,
} from '../services';
import { useCombat } from './useCombat';
import type { CounterAdvanceRequest } from './useCombat';
import { useSocialization } from './useSocialization';
import { useSanctuary } from './useSanctuary';
import type { CustomRestConfig } from './useSanctuary';
import { useGameState } from './useGameState';
import { usePersistence } from './usePersistence';
import { useAssetLoad } from './useAssetLoad';
import { useAiGeneration } from './useAiGeneration';
import { useInteraction } from './useInteraction';
import type { PuzzleInteractionController } from './useInteraction';
import { useZoneTransition } from './useZoneTransition';

// =====================
// 接口定义
// =====================
interface UseGameParams { }

interface UseGameReturn {
    // === 全局状态 ===
    settings: Settings;
    setSettings: Dispatch<SetStateAction<Settings>>;
    gameState: GameState;
    setGameState: Dispatch<SetStateAction<GameState>>;
    player: PlayerState;
    setPlayer: Dispatch<SetStateAction<PlayerState>>;
    currentZone: Zone;
    currentNodeId: string;
    getCurrentNode: () => Node;
    currentEnemy: CombatEnemy | null;
    combatLog: string[];
    logs: Log[];
    loadingStatus: string;
    sanctuary: Sanctuary;
    isGenerating: boolean;
    generatingTasks: Record<string, boolean>;
    isTaskGenerating: (
        mediaType: 'image' | 'video',
        type: 'scene' | 'enemy' | 'npc' | 'player',
        objId?: string
    ) => boolean;
    activeInteractionNPC: Entity<NpcTemplate, NpcDynamicState> | null;
    showCutscene: boolean;
    setShowCutscene: Dispatch<SetStateAction<boolean>>;
    showNarrative: boolean;
    tempSearchVisualOverride: boolean;
    activePuzzleNodeId: string | null;
    puzzleStats: { solved: number; failed: number; hints: number };
    puzzleController: PuzzleInteractionController;
    loadingAudioId: string | null;

    // === 战斗系统 ===
    isCombatActive: boolean;
    isPlayerPhase: boolean;
    isBusy: boolean;
    executeTactic: (tacticId: string, casterId?: string, manualTargetId?: string) => Promise<void>;
    endPlayerPhase: () => Promise<void>;
    enemyIntent: CombatIntent | null;
    enemies: CombatEnemy[];
    enemyIntents: Array<CombatIntent | null>;
    allies: CombatAlly[];
    activeAllyId: string;
    setActiveAllyId: Dispatch<SetStateAction<string>>;
    getTacticsFor: (ownerId: string) => Tactic[];
    canUseTactic: (tactic: Tactic, casterId: string) => boolean;
    getVisibleResultSequence?: (targetId: string) => {
        attackResult: AttackResult[];
        defenseResult: DefenseResult[];
    };
    pendingDefense: Record<string, DefenseResult[]>;
    /** 战场位置表：key 为我方 targetId（player / 同伴 id）或敌方 instanceId。 */
    positions: Record<string, number>;
    /** 战线坐标下限（小地图渲染用）。 */
    battleLineMin: number;
    /** 战线坐标上限（小地图渲染用）。 */
    battleLineMax: number;
    /** 单位攻击距离查询：我方取主手武器 range，敌方取模板 range；0 = 无限距离。 */
    getUnitRange: (unitId: string) => number;
    /** 两个单位之间的战线距离。 */
    getDistance: (aId: string, bId: string) => number;
    /** 我方单位前进 / 后退一步，消耗行动点。 */
    moveAlly: (allyId: string, dir: 1 | -1) => Promise<void>;
    /** 蓄反 / 差反预支询问；非空时战斗界面底部弹出通栏询问条等待玩家决策。 */
    counterPrompt: CounterAdvanceRequest | null;
    /** 回应预支询问：true = 预支，false = 保留 / 放弃。 */
    resolveCounterPrompt: (approve: boolean) => void;
    /** 每单位预支询问跳过开关（player / 同伴 id → 蓄反 / 差反）。 */
    counterSkip: Record<string, Partial<Record<CounterAdvanceRequest['kind'], boolean>>>;
    /** 设置 / 取消跳过开关。 */
    setCounterSkip: (unitId: string, kind: CounterAdvanceRequest['kind'], skip: boolean) => void;
    /** 「立即行动」窗口：预支结算后我方单位的立即行动机会。 */
    insertAction: { unitId: string; chancesLeft: number } | null;
    /** 手动结束「立即行动」窗口。 */
    endInsertAction: () => void;

    // === 核心动作与环境交互 ===
    initGame: (originId?: string | 'random') => Promise<void>;
    handleAction: (
        actionType:
            | 'move_local'
            | 'move_zone'
            | 'search'
            | 'interact_obj'
            | 'interact_npc'
            | 'generate_video'
            | 'unlock'
            | 'sanctuary_return',
        targetId?: string,
        label?: string
    ) => Promise<void>;
    handleUseItem: (item: ItemInstance, npc?: Entity<NpcTemplate, NpcDynamicState>) => Promise<void>;
    handleEquipItem: (item: ItemInstance) => void;
    handleDiscardItem: (item: ItemInstance) => void;
    generateNewAsset: (
        type: 'scene' | 'enemy' | 'npc' | 'player',
        mediaType?: 'image' | 'video',
        objIdOverride?: string
    ) => Promise<void>;
    proceedToNextZone: (
        useLocal: boolean,
        params?: ZoneGenerationContext,
        targetZoneId?: string,
        autoGenOptions?: { images?: boolean; videos?: boolean; audios?: boolean }
    ) => Promise<void>;
    handleNarrative: (
        config: StoryConfig & { details?: { nodeCount: number; tension: number } },
        autoGenOptions?: { images?: boolean; videos?: boolean; audios?: boolean }
    ) => Promise<void>;
    handleLoadLibrary: (type: 'chain' | 'episodic', identifier: string) => Promise<void>;

    // === 叙事库管理 ===
    narrativeLibrary: {
        arcs: Array<{ title: string; mainAxis: string; zoneCount: number }>;
        episodic: Array<{ id: string; name: string; timestamp: number }>;
        isLoading: boolean;
    };
    loadNarrativeLibrary: () => Promise<void>;
    deleteNarrativeArc: (arcId: string) => Promise<boolean>;
    deleteEpisodicZone: (zoneId: string) => Promise<boolean>;

    // === 叙事推演预览 ===
    narrativePreview: {
        params?: StoryConfig;
        activePlots: PlotPoint[];
        mainPlots: PlotPoint[];
        sidePlots: PlotPoint[];
        expectedPlotsText: string;
        analysis?: ChainNarrative['analysis'];
    };

    // === 叙事流程状态 ===
    narrativeFlowStep:
    | 'mode'
    | 'pacing'
    | 'theme'
    | 'config'
    | 'details'
    | 'preview'
    | 'library'
    | 'closed';
    narrativeFlowPendingConfig: Partial<StoryConfig>;
    narrativeFlowEpisodicTension: number;
    narrativeFlowEpisodicNodeCount: number;
    narrativeFlowHasSuspendedArc: boolean;
    setNarrativeFlowStep: Dispatch<
        SetStateAction<
            | 'mode'
            | 'pacing'
            | 'theme'
            | 'config'
            | 'details'
            | 'preview'
            | 'library'
            | 'closed'
        >
    >;
    setNarrativeFlowEpisodicTension: Dispatch<SetStateAction<number>>;
    setNarrativeFlowEpisodicNodeCount: Dispatch<SetStateAction<number>>;
    setNarrativeFlowPendingConfig: Dispatch<SetStateAction<Partial<StoryConfig>>>;
    handleNarrativeFlowOpenLibrary: () => void;
    handleNarrativeFlowLoadFromLibrary: (type: 'chain' | 'episodic', identifier: string) => void;
    handleNarrativeFlowModeConfirm: (mode: NarrativeMode) => void;
    handleNarrativeFlowPacingConfirm: (pacing: NarrativePacing) => void;
    handleNarrativeFlowThemeConfirm: (theme: string) => void;
    handleNarrativeFlowConfigConfirm: (themeConfig: { motif: string; mainAxis: string }) => void;
    handleNarrativeFlowDetailsConfirm: () => void;
    handleNarrativeFlowPreviewConfirm: (autoGenOptions?: {
        images?: boolean;
        videos?: boolean;
        audios?: boolean;
    }) => void;
    handleNarrativeFlowBack: () => void;
    handleNarrativeFlowCancel: () => void;

    // === 角色与同伴 ===
    handleInteractWithCompanion: (npc: Entity<NpcTemplate, NpcDynamicState> | null) => void;
    levelUp: (targetId: string, attr: AttributeType) => void;
    gainExperience: (amount: number) => void;
    pendingTacticOptions: Tactic[] | null;
    selectTactic: (tacticId: string) => void;

    // === NPC 交互系统 ===
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

    // === 庇护所管理 ===
    transferItem: (item: ItemInstance, toStorage: boolean) => void;
    handleRest: (hours: number) => void;
    handleResourceTrade: (target: keyof SanctuaryState, amount: number) => void;
    upgradeSanctuary: () => void;
    getStorageCapacity: () => number;
    handleRepair: () => void;
    getCustomRestConfig: (hours: number) => CustomRestConfig | null;
    handleUseMedicine: (amount?: number) => void;
    handleFacilityUpgrade: (facilityId: string, scrapCost: number, success?: boolean) => void;
    handleSanctuaryEvent: (stateChange: SanctuaryEventChange) => boolean;
    morale: number;
    isLowMorale: boolean;
    maxStorage: number;
    facilities: Facility[];
    dailyProduction: Partial<SanctuaryState>;
    residents: Resident[];

    // === 系统与持久化 ===
    setNeuralNoise: (level: number) => void;
    handleRandomSwitch: (
        mediaType: 'image' | 'video',
        type: 'scene' | 'enemy' | 'npc' | 'player',
        objId?: string,
        currentUrl?: string
    ) => Promise<string | null>;
    hasMultipleVariants: (
        mediaType: 'image' | 'video',
        type: 'scene' | 'enemy' | 'npc' | 'player',
        objId?: string
    ) => Promise<boolean>;
    handleSaveGame: (saveName?: string) => Promise<string | null>;
    handleLoadGame: (fileName: string) => Promise<boolean>;
    handleListSaves: () => Promise<Array<{ name: string; size: number; modified: string }>>;
    handleDeleteSave: (fileName: string) => Promise<boolean>;

    // === 解谜系统 ===
    setActivePuzzleNodeId: Dispatch<SetStateAction<string | null>>;
    getActivePuzzle: () => Puzzle | null;
    handlePuzzleSolve: () => void;
    handlePuzzleFail: () => void;
    recordHintUsed: () => void;
    closePuzzle: () => void;

    // === 叙事引擎 ===
    dyNarrative: string;
    isGeneratingDyNarrative: boolean;
    dyAnalysis: DyNarrative | null;
    triggerDyNarrative: () => Promise<void>;
    clearDyNarrative: () => void;
    updateDyAnalysis: (playerState: PlayerState) => void;
    updateNarrativeState: (playerState: PlayerState, currentNode: Node | null) => void;
    currentNarrative: unknown;
    narrativeAnalysis: ChainNarrative['analysis'] | null;
    getNarrativeHealth: (playerState: PlayerState) => number;
    getCurrentNarrativePhase: () => NarrativePhase;
    resetNarrative: () => void;

    // === 时间与回合 ===
    advanceExplorationStep: () => void;
    advanceCombatTurn: () => void;
    resetCombatTurn: () => void;
    getCurrentTime: () => CurrentTime;
    getTimeTuple: () => [ZoneDate, number];
}

// =====================
// 主 Hook
// =====================
export const useGame = ({ }: UseGameParams = {}): UseGameReturn => {
    // ==========================================================================
    // 顶级全局状态容器
    // ==========================================================================
    const [settings, setSettings] = useState<Settings>(INITIAL_SETTINGS);
    const [gameState, setGameState] = useState<GameState>(GameState.MAIN_MENU);

    const defaultOrigin = ORIGIN_TEMPLATES[0];
    const {
        player: defaultPlayer,
        sanctuary: defaultSanctuary,
        zone: defaultZone,
    } = initializeGameFromOrigin(defaultOrigin);

    const [player, setPlayer] = useState<PlayerState>(defaultPlayer);
    const [currentZone, setCurrentZone] = useState<Zone>(defaultZone);
    const [sanctuary, setSanctuary] = useState<Sanctuary>(defaultSanctuary);
    const [currentNodeId, setCurrentNodeId] = useState<string>('');

    const [logs, setLogs] = useState<Log[]>([]);
    const [showCutscene, setShowCutscene] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState<string>('');
    const [activeInteractionNPC, setActiveInteractionNPC] = useState<
        Entity<NpcTemplate, NpcDynamicState> | null
    >(null);
    const [showNarrative, setShowNarrative] = useState(false);
    const [tempSearchVisualOverride, setTempSearchVisualOverride] = useState(false);
    const [generatingTasks, setGeneratingTasks] = useState<Record<string, boolean>>({});
    const [isGeneratingDyNarrative, setIsGeneratingDyNarrative] = useState(false);
    const [dyNarrative, setDyNarrative] = useState('');
    const [dyAnalysis, setDyAnalysis] = useState<DyNarrative | null>(null);
    const [currentEnemy, setCurrentEnemy] = useState<CombatEnemy | null>(null);

    const isGenerating = useMemo(
        () => Object.keys(generatingTasks).length > 0,
        [generatingTasks]
    );

    const initializedAudio = useRef(false);
    const lastDyNarrativeCycleRef = useRef<number>(-1);
    const playerRef = useRef(player);
    useEffect(() => {
        playerRef.current = player;
    }, [player]);

    // ==========================================================================
    // 基础辅助函数
    // ==========================================================================
    const addLog = useCallback((text: string, type: LogType = 'info') => {
        setLogs((prev) => [
            ...prev,
            {
                id: Math.random().toString(36).slice(2, 11),
                text,
                type,
                timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            },
        ]);
    }, []);

    const handleAsyncError = useCallback(
        (error: unknown, context: string) => {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error(`[Async Error] ${context}:`, err);
            addLog(`系统异常 (${context}): ${err.message}`, 'critical');
        },
        [addLog]
    );

    const getCurrentNode = useCallback((): Node => {
        return (
            currentZone?.nodes?.[currentNodeId] ||
            ({
                name: '未知领域',
                desc: '现实结构在此处发生了轻微的断层。',
                visualPrompt: '未知',
                isVisited: false,
                searchCount: 0,
            } as Node)
        );
    }, [currentZone, currentNodeId]);

    const updatePlayer = useCallback((sanityDelta: number, hpDelta: number) => {
        setPlayer((p) => {
            const maxHp = p.dynamic.maxHp;
            const maxSanity = p.dynamic.maxSanity;
            return {
                ...p,
                dynamic: {
                    ...p.dynamic,
                    sanity: Math.max(0, Math.min(maxSanity, p.dynamic.sanity + sanityDelta)),
                    hp: Math.max(0, Math.min(maxHp, p.dynamic.hp + hpDelta)),
                },
            };
        });
    }, []);

    const updateCompanion = useCallback(
        (npcId: string, sanityDelta: number, hpDelta: number) => {
            setPlayer((p) => {
                const newCompanions = p.companions.map((c) => {
                    if (c.static.id !== npcId) return c;
                    const maxHp = c.dynamic.maxHp;
                    const maxSanity = c.dynamic.maxSanity;
                    const newHp = Math.max(0, Math.min(maxHp, c.dynamic.hp + hpDelta));
                    const newSanity = Math.max(0, Math.min(maxSanity, c.dynamic.sanity + sanityDelta));

                    if (newHp <= 0 && c.dynamic.hp > 0) {
                        addLog(`${c.static.name} 倒下了。`, 'critical');
                    }
                    if (newSanity <= 0 && c.dynamic.sanity > 0) {
                        addLog(`${c.static.name} 的精神彻底崩溃了。`, 'critical');
                    }

                    return { ...c, dynamic: { ...c.dynamic, hp: newHp, sanity: newSanity } };
                });
                return { ...p, companions: newCompanions };
            });
        },
        [addLog]
    );

    const setCompanions = useCallback(
        (updater: SetStateAction<Array<Entity<NpcTemplate, NpcDynamicState>>>) => {
            setPlayer((prev) => {
                const newCompanions =
                    typeof updater === 'function' ? updater(prev.companions) : updater;
                return { ...prev, companions: newCompanions };
            });
        },
        []
    );

    const setNeuralNoise = useCallback((level: number) => {
        setPlayer((p) => ({
            ...p,
            neuralLink: { ...p.neuralLink, noiseLevel: Math.max(0, Math.min(3, level)) },
        }));
    }, []);

    const clearDyNarrative = useCallback(() => {
        setDyNarrative('');
    }, []);

    const updateDyAnalysis = useCallback((playerState: PlayerState) => {
        if (!playerState) {
            setDyAnalysis(null);
            return;
        }
        setDyAnalysis(DynamicNarrativeService.analyzeDynamicState(playerState));
    }, []);

    const isTaskGenerating = useCallback(
        (
            mediaType: 'image' | 'video',
            type: 'scene' | 'enemy' | 'npc' | 'player',
            objId?: string
        ): boolean => {
            if (!objId) return isGenerating;
            const key = `${mediaType}_${type}_${objId}`;
            return Boolean(generatingTasks[key]);
        },
        [generatingTasks, isGenerating]
    );

    // ==========================================================================
    // 核心初始化入口
    // ==========================================================================
    const initGame = useCallback(
        async (originId: string | 'random' = 'origin_hospital') => {
            try {
                ProxyService.init();
                KeyService.registerFromSettings(settings);
                await PersistenceService.loadConfig();

                if (!initializedAudio.current) {
                    try {
                        await AudioService.init();
                        initializedAudio.current = true;
                    } catch (audioError) {
                        console.warn('音频系统初始化失败:', audioError);
                        addLog('音频系统初始化失败，游戏将以静音模式运行', 'warning');
                    }
                }

                safeAudioOperation(
                    () => initializedAudio.current && AudioService.playSfx('ui_click'),
                    '音效失败'
                );

                const originTemplate =
                    originId === 'random'
                        ? ORIGIN_TEMPLATES[Math.floor(Math.random() * ORIGIN_TEMPLATES.length)]
                        : ORIGIN_TEMPLATES.find((o) => o.id === originId) || ORIGIN_TEMPLATES[0];

                const {
                    player: initialPlayer,
                    sanctuary: initSanctuary,
                    zone,
                    entranceNodeId,
                } = initializeGameFromOrigin(originTemplate);

                setPlayer(initialPlayer);
                setSanctuary(initSanctuary);
                setCurrentZone(zone);
                setCurrentNodeId(entranceNodeId);
                setLogs([]);
                setGameState(GameState.SANCTUARY);

                addLog(
                    `身份确认: ${initialPlayer.static.name} [${initialPlayer.static.style.toUpperCase()}]`,
                    'info'
                );
                addLog('系统重启。认知模块上线。', 'info');

                safeAudioOperation(
                    () => initializedAudio.current && AudioService.setTheme('sanctuary'),
                    '主题设置失败'
                );
            } catch (initError) {
                console.error('初始化错误:', initError);
                addLog('初始化失败，请检查配置重试', 'critical');
                setLoadingStatus('初始化失败');
            }
        },
        [settings, addLog]
    );

    // ==========================================================================
    // 核心业务子 Hook 注册区
    // ==========================================================================

    // --- 叙事流程回调（需要在 useGameState 之前定义） ---
    const narrativeFlowCallbacksRef = useRef<{
        onComplete: (
            config: StoryConfig,
            autoGenOptions?: { images?: boolean; videos?: boolean; audios?: boolean }
        ) => void;
        onLoadLibrary: (type: 'chain' | 'episodic', identifier: string) => void;
        onCancel: () => void;
    }>({
        onComplete: () => { },
        onLoadLibrary: () => { },
        onCancel: () => {
            setShowNarrative(false);
        },
    });

    // --- 蓄反 / 差反询问 ---
    const [counterPrompt, setCounterPrompt] = useState<CounterAdvanceRequest | null>(null);
    const counterPromptResolverRef = useRef<((ok: boolean) => void) | null>(null);

    /**
     * 蓄反 / 差反预支决策。
     * - 玩家方（player / 同伴）：在战斗界面底部弹出通栏询问条，等待玩家点击后再继续结算；
     * - 敌人：暂由引擎默认拒绝，预留 LLM 决策接入点
     *   （Settings.accumulateCounterEnabled / differentialCounterEnabled 仅控制是否向敌方发起询问）。
     */
    const counterDecision = useCallback((request: CounterAdvanceRequest): Promise<boolean> => {
        const isAllyActor =
            request.actorId === 'player' ||
            playerRef.current.companions.some((c) => c.static.id === request.actorId);
        if (!isAllyActor) return Promise.resolve(false);

        return new Promise<boolean>((resolve) => {
            // 防御性处理：极端情况下若已有悬挂询问，先按放弃结算，避免旧 Promise 永久挂起。
            counterPromptResolverRef.current?.(false);
            counterPromptResolverRef.current = resolve;
            setCounterPrompt(request);
        });
    }, []);

    /** 回应蓄反 / 差反询问。 */
    const resolveCounterPrompt = useCallback((approve: boolean) => {
        const resolver = counterPromptResolverRef.current;
        counterPromptResolverRef.current = null;
        setCounterPrompt(null);
        if (resolver) resolver(approve);
    }, []);

    // --- 战斗系统 ---
    const {
        enemies,
        combatLog,
        spawnEnemy,
        updateEnemyVisual,
        pendingDefense,
        isCombatActive,
        isPlayerPhase,
        executeTactic,
        endPlayerPhase,
        enemyIntents,
        allies,
        activeAllyId,
        setActiveAllyId,
        isBusy,
        getTacticsFor,
        canUseTactic,
        getVisibleResultSequence,
        positions,
        battleLineMin,
        battleLineMax,
        getUnitRange,
        getDistance,
        moveAlly,
        counterSkip,
        setCounterSkip,
        insertAction,
        endInsertAction,
    } = useCombat({
        playerState: player,
        companions: player.companions,
        setPlayerState: setPlayer,
        setCompanions,
        gameState,
        setGameState,
        addLog,
        updatePlayer,
        updateCompanion,
        counterDecision,
        accumulateCounterEnabled: settings.accumulateCounterEnabled,
        differentialCounterEnabled: settings.differentialCounterEnabled,
    });

    // 当敌人生成或战斗结束时同步 currentEnemy。
    // 始终重建为第一个存活敌人的最新副本（历史实现"仍在则保留旧副本"，
    // 导致战斗中 hp/属性变化不刷新 currentEnemy，App 读到陈旧值）。
    useEffect(() => {
        if (!isCombatActive) {
            setCurrentEnemy(null);
            return;
        }
        const alive = enemies.filter(e => !e.isDead && e.hp > 0);
        if (alive.length > 0) {
            setCurrentEnemy(alive[0]);
        }
    }, [enemies, isCombatActive]);

    // 从 enemyIntents 推导当前敌人的意图
    const enemyIntent: CombatIntent | null = useMemo(() => {
        if (!currentEnemy) return null;
        const idx = enemies.findIndex((e) => e.instanceId === currentEnemy.id);
        return idx >= 0 ? (enemyIntents[idx] ?? null) : null;
    }, [currentEnemy, enemies, enemyIntents]);

    // --- 游戏状态与叙事引擎 ---
    const {
        handleGameTick,
        currentNarrative,
        narrativeAnalysis,
        updateNarrativeState,
        getNarrativeHealth,
        getCurrentNarrativePhase,
        resetNarrative,
        updatePlayerStateAndPlot,
        narrativeLibrary,
        loadNarrativeLibrary,
        deleteNarrativeArc,
        deleteEpisodicZone,
        narrativePreview,
        advanceExplorationStep,
        advanceCombatTurn,
        resetCombatTurn,
        getCurrentTime,
        getTimeTuple,
        narrativeFlowStep,
        narrativeFlowPendingConfig,
        narrativeFlowEpisodicTension,
        narrativeFlowEpisodicNodeCount,
        narrativeFlowHasSuspendedArc,
        setNarrativeFlowStep,
        setNarrativeFlowEpisodicTension,
        setNarrativeFlowEpisodicNodeCount,
        setNarrativeFlowPendingConfig,
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
        levelUp,
        gainExperience,
        pendingTacticOptions,
        selectTactic,
    } = useGameState({
        gameData: { player, settings, gameState, currentZone },
        updaters: {
            setPlayer,
            setCurrentZone,
            setCurrentNodeId,
            setSanctuary,
            setSettings,
            setGameState,
        },
        currentNodeId,
        addLog,
        spawnEnemy: (enemyTemplate?: EnemyTemplate, zoneId?: string) =>
            spawnEnemy(enemyTemplate, zoneId),
        narrativeFlowCallbacks: narrativeFlowCallbacksRef.current,
    });

    // --- 庇护所管理 ---
    const {
        transferItem,
        handleRest,
        handleResourceTrade,
        getStorageCapacity,
        getCustomRestConfig,
        handleUseMedicine,
        handleFacilityUpgrade,
        handleSanctuaryEvent,
        morale,
        isLowMorale,
        maxStorage,
        facilities,
        dailyProduction,
        residents,
    } = useSanctuary({
        player,
        setPlayer,
        addLog,
        gameState,
    });

    // 事件抉择若触发敌袭（stateChange.spawnEnemy === true），立即实体化敌人并进入战斗。
    const handleSanctuaryEventWithSpawn = useCallback(
        (stateChange: SanctuaryEventChange): boolean => {
            const shouldSpawn = handleSanctuaryEvent(stateChange);
            if (shouldSpawn) {
                addLog('警报：庇护所边界被突破，不明实体正在侵入！', 'critical');
                safeAudioOperation(
                    () => AudioService.playSfx('terrifying'),
                    '音效播放失败'
                );
                spawnEnemy(undefined, playerRef.current?.sanctuary?.id ?? undefined);
            }
            return shouldSpawn;
        },
        [handleSanctuaryEvent, spawnEnemy, addLog]
    );

    // --- 资产加载 ---
    const { autoLoadAssets, handleRandomSwitch, hasMultipleVariants } = useAssetLoad({
        currentZone,
        addLog,
        onUpdateAsset: (mediaType, type, objId, url) => {
            if (type === 'scene' && objId) {
                setCurrentZone((prev) => ({
                    ...prev,
                    nodes: {
                        ...prev.nodes,
                        [objId]: {
                            ...prev.nodes[objId],
                            ...(mediaType === 'video' ? { videoUrl: url } : { imageUrl: url }),
                        },
                    },
                }));
            } else if (type === 'player') {
                setPlayer((p) => ({ ...p, dynamic: { ...p.dynamic, imageUrl: url } }));
            } else if (type === 'enemy' && objId) {
                // 敌人资产键为模板 id（enemy.id）：同一模板的全部实例共享立绘，
                // 故回写需同时匹配模板 id 与实例 id，否则变体切换后界面不更新。
                updateEnemyVisual(objId, url);
                setCurrentEnemy((prev) =>
                    prev && (prev.id === objId || prev.instanceId === objId)
                        ? { ...prev, imageUrl: url }
                        : prev
                );
            } else if (type === 'npc' && objId) {
                setActiveInteractionNPC((prev) =>
                    prev && prev.static.id === objId
                        ? { ...prev, dynamic: { ...prev.dynamic, imageUrl: url } }
                        : prev
                );
                setPlayer((p) => ({
                    ...p,
                    companions: p.companions.map((c) =>
                        c.static.id === objId
                            ? { ...c, dynamic: { ...c.dynamic, imageUrl: url } }
                            : c
                    ),
                }));
            }
        },
    });

    // --- 敌人立绘自动挂载 ---
    // 敌人肖像按模板 id 归档（enemy/<templateId>/N.png），因此新一场战斗中同型敌人
    // 应当直接复用档案中已有的立绘，而不是每次都要玩家手动点一次「随机切换」。
    // 已尝试过的资产键会被记忆，避免战斗中每次数值变化都重复读盘。
    const attemptedEnemyVisualsRef = useRef<Set<string>>(new Set());
    useEffect(() => {
        if (!isCombatActive || !enemies.length) {
            attemptedEnemyVisualsRef.current.clear();
            return;
        }
        if (!PersistenceService.isReady) return;

        // 本帧内一次性取全待挂载的资产键（模板 id，去重）。
        const pendingIds: string[] = [];
        for (const enemy of enemies) {
            if (enemy.imageUrl || enemy.isDead) continue;
            const assetId = enemy.id || enemy.instanceId;
            if (!assetId) continue;
            if (attemptedEnemyVisualsRef.current.has(assetId)) continue;
            if (pendingIds.includes(assetId)) continue;
            pendingIds.push(assetId);
        }
        if (!pendingIds.length) return;

        // 立即登记，避免回写立绘后 enemies 变化导致本 effect 重跑时重复排队。
        pendingIds.forEach((id) => attemptedEnemyVisualsRef.current.add(id));

        // 关键：循环必须跑完，不能挂 cleanup 取消。
        // 首张立绘回写会改变 enemies → effect 重跑 → 若在此处取消，
        // 后面的敌人会被中断且已被登记为「已尝试」，导致只有队首敌人能被自动加载。
        void (async () => {
            for (const assetId of pendingIds) {
                try {
                    const assets = await autoLoadAssets('enemy', assetId);
                    if (assets.imageUrl) updateEnemyVisual(assetId, assets.imageUrl);
                } catch {
                    // 单次读盘失败不影响战斗流程，静默跳过（后续仍可手动生成）。
                }
            }
        })();
    }, [isCombatActive, enemies, autoLoadAssets, updateEnemyVisual]);

    // --- AI 生成 ---
    const {
        generateNewDy,
        generateNewZone,
        handleAutoGeneration,
        generateNewAsset: generateAssetCore,
        generateNewNPCReaction,
    } = useAiGeneration({
        player,
        currentZone,
        settings,
        addLog,
        setLoadingStatus,
        handleAsyncError,
    });

    // --- 同伴反应触发器 ---
    const triggerCompanionReactions = useCallback(
        async (eventName: string, context?: string) => {
            const activeCompanions = playerRef.current.companions?.filter((c) => {
                const hp = c.dynamic.hp;
                return typeof hp === 'number' && Number.isFinite(hp) && hp > 0;
            });

            if (!activeCompanions?.length || !playerRef.current) return;

            const eventDesc = eventName + (context ? ` (${context})` : '');

            await Promise.allSettled(
                activeCompanions.map(async (comp) => {
                    const reaction = await generateNewNPCReaction(
                        comp,
                        playerRef.current.location.currentLocation,
                        eventDesc
                    );
                    if (reaction && reaction.content) {
                        addLog(
                            reaction.isAction
                                ? `${comp.static.name} ${reaction.content}`
                                : `${comp.static.name}: "${reaction.content}"`,
                            reaction.isAction ? 'event' : 'info'
                        );
                    }
                })
            );
        },
        [generateNewNPCReaction, addLog]
    );

    // --- 区域切换 ---
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
        handleAutoGeneration,
        updatePlayerStateAndPlot,
    });

    // --- 占位功能 ---
    const handleRepair = useCallback(() => {
        addLog('修复功能尚未实现', 'info');
    }, [addLog]);

    const upgradeSanctuary = useCallback(() => {
        addLog('庇护所升级功能尚未实现', 'warning');
    }, [addLog]);

    // --- 交互系统 ---
    const {
        handleLocalMove,
        handleSearch,
        handleInteraction,
        activePuzzleNodeId,
        setActivePuzzleNodeId,
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
        loadingAudioId,
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
        setActiveInteractionNPC: (npc) => setActiveInteractionNPC(npc),
        settings,
        updateCompanion,
    });

    // --- 装备槽位收缩迁移 ---
    // 槽位配置可在对局中热改（设置面板 armor 1-4 / accessory 1-8）。
    // 调小时超出的装备不能静默丢失：必须退回背包并回收其饰品加成，
    // 否则会出现"物品消失 + 加成成为无法卸下的幽灵值"。
    const equipmentOverflow = useMemo(
        () =>
            normalizeEquipmentWithOverflow(player.dynamic.equipment, settings.gameConfig).overflow,
        [
            player.dynamic.equipment,
            settings.gameConfig.equipmentSlots.armor,
            settings.gameConfig.equipmentSlots.accessory,
        ]
    );

    useEffect(() => {
        if (equipmentOverflow.length === 0) return;

        const { equipment, overflow } = normalizeEquipmentWithOverflow(
            playerRef.current.dynamic.equipment,
            settings.gameConfig
        );
        if (overflow.length === 0) return;

        setPlayer((prev) => {
            const { inventory, refunds } = reclaimOverflowEquipments(
                overflow,
                prev.dynamic.inventory
            );
            const nextDynamic = { ...prev.dynamic, equipment, inventory };

            refunds.forEach((item) => {
                applyEffectDeltas(
                    nextDynamic,
                    negateEffectDeltas(getAppliedAccessoryDeltas(item))
                );
            });
            clampDynamicVitals(nextDynamic);

            return { ...prev, dynamic: nextDynamic };
        });

        overflow.forEach((item) =>
            addLog(`槽位配置变更：${item.name} 已退回背包。`, 'warning')
        );
    }, [equipmentOverflow, settings.gameConfig, setPlayer, addLog]);

    // --- 动态叙事 ---
    const triggerDyNarrative = useCallback(async () => {
        clearDyNarrative();
        setIsGeneratingDyNarrative(true);
        try {
            const narrative = await generateNewDy(
                playerRef.current,
                getCurrentNode(),
                currentNodeId
            );
            if (narrative) {
                setDyNarrative(narrative);
                // 同步动态状态分析
                if (playerRef.current) {
                    updateDyAnalysis(playerRef.current);
                }
            }
        } catch (error) {
            handleAsyncError(error, '推演动态叙事');
        } finally {
            setIsGeneratingDyNarrative(false);
        }
    }, [generateNewDy, getCurrentNode, currentNodeId, clearDyNarrative, handleAsyncError, updateDyAnalysis]);

    useEffect(() => {
        if (gameState !== GameState.PLAYING || !currentNodeId || !playerRef.current) return;

        const currentCycle = playerRef.current.currentZoneTime.cycle;

        // 每过一个区域循环，按概率触发一次动态叙事
        if (currentCycle !== lastDyNarrativeCycleRef.current && Math.random() < 0.3) {
            lastDyNarrativeCycleRef.current = currentCycle;
            triggerDyNarrative();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentNodeId, gameState]);

    // 当玩家关键生存指标变化时，自动同步动态叙事分析
    useEffect(() => {
        if (!player || gameState !== GameState.PLAYING) return;
        updateDyAnalysis(player);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        player.dynamic.hp,
        player.dynamic.sanity,
        player.dynamic.stamina,
        player.dynamic.vigor,
        player.companions.length,
        gameState,
    ]);

    // --- 社交系统 ---
    const {
        handleNPCChat,
        handleLocalNPCAction,
        handleNPCTakeItem,
        handleNPCRecruit,
        handleNPCGift,
        handleNPCIntimacy,
        closeNPCInteraction,
        handleAcceptQuest,
        handleMountProfile,
        handleUnmountCreateNewProfile,
        handleDeleteProfile,
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
        setActiveInteractionNPC,
    });

    // --- 持久化 ---
    const { handleSaveGame, handleLoadGame, handleListSaves, handleDeleteSave } = usePersistence({
        gameStateData: {
            player,
            currentZone,
            settings,
            gameState,
        },
        updaters: {
            setPlayer,
            setCurrentZone,
            setCurrentNodeId,
            setSanctuary,
            setSettings,
            setGameState,
        },
        addLog,
    });

    // ==========================================================================
    // 资产生成包装器
    // ==========================================================================
    const generateNewAssetWrapper = useCallback(
        async (
            targetType: 'scene' | 'enemy' | 'npc' | 'player',
            mediaType?: 'image' | 'video',
            objIdOverride?: string
        ) => {
            const effectiveMediaType = mediaType || settings.preferredMediaType || 'image';
            let objId: string | undefined;
            /**
             * 被请求的敌人本体。
             * 旧实现无论点谁都拿 currentEnemy（恒为 enemies[0]）取提示词，
             * 导致「生成图与目标敌人完全不符」；此处必须按传入的实例 id 精确解析。
             */
            let enemyTarget: CombatEnemy | undefined;

            if (targetType === 'scene') objId = currentNodeId;
            else if (targetType === 'enemy') {
                const key = objIdOverride ?? currentEnemy?.instanceId ?? currentEnemy?.id;
                enemyTarget = (key
                    ? enemies.find((e) => (e.instanceId || e.id) === key || e.id === key)
                    : undefined) ?? currentEnemy ?? undefined;
                // 归档键使用模板 id（enemy.id）而非实例 id：
                // 同一模板的多次出现共享一份肖像档案，才能跨战斗复用并支持随机切换。
                objId = enemyTarget?.id || enemyTarget?.instanceId;
            }
            else if (targetType === 'player') objId = player.static.id;
            else if (targetType === 'npc') objId = activeInteractionNPC?.static.id;

            const taskKey = objId ? `${effectiveMediaType}_${targetType}_${objId}` : '';
            if (taskKey) {
                setGeneratingTasks((prev) => ({ ...prev, [taskKey]: true }));
            }

            try {
                let name = '';
                let visualPrompt = '';

                if (targetType === 'scene') {
                    const node = getCurrentNode();
                    name = node.name;
                    visualPrompt = node.visualPrompt || node.desc;
                } else if (targetType === 'enemy' && enemyTarget) {
                    name = enemyTarget.name;
                    // 本地预定义敌人可能既无 visualPrompt 也无 desc；缺失时退化为名称，
                    // 否则 generateNewAsset 会因 prompt 为空静默 no-op（表现为点击后毫无反应）。
                    visualPrompt = enemyTarget.visualPrompt || enemyTarget.desc || enemyTarget.name;
                } else if (targetType === 'player') {
                    name = player.static.name;
                    visualPrompt = player.static.visualPrompt || '一个在末日废土中挣扎的幸存者';
                } else if (targetType === 'npc' && activeInteractionNPC) {
                    name = activeInteractionNPC.static.name;
                    visualPrompt =
                        activeInteractionNPC.static.visualPrompt || activeInteractionNPC.static.desc;
                } else {
                    return;
                }

                const url = await generateAssetCore(effectiveMediaType as 'image' | 'video', targetType, {
                    id: objId!,
                    name,
                    visualPrompt,
                });

                if (url) {
                    if (targetType === 'scene') {
                        setCurrentZone((prev) => {
                            // 存在性守卫：异步生成期间玩家可能已切换节点/区域，
                            // 无守卫时 prev.nodes[currentNodeId] 为 undefined，
                            // 会把仅含 URL 的幽灵节点注入新区（enemy/npc 分支原有守卫，scene 缺失）。
                            const node = prev.nodes[currentNodeId];
                            if (!node) return prev;
                            return {
                                ...prev,
                                nodes: {
                                    ...prev.nodes,
                                    [currentNodeId]: {
                                        ...node,
                                        ...(effectiveMediaType === 'video' ? { videoUrl: url } : { imageUrl: url }),
                                    },
                                },
                            };
                        });
                    } else if (targetType === 'enemy') {
                        if (objId) {
                            // 按资产键（模板 id）回写：同型敌人共享同一立绘，战斗 HUD 立即刷新。
                            updateEnemyVisual(objId, url);
                        }
                        setCurrentEnemy((prev) =>
                            prev && objId && (prev.id === objId || prev.instanceId === objId)
                                ? { ...prev, imageUrl: url }
                                : prev
                        );
                        AudioService.playSfx('terrifying');
                    } else if (targetType === 'player') {
                        setPlayer((p) => ({ ...p, dynamic: { ...p.dynamic, imageUrl: url } }));
                    } else if (targetType === 'npc') {
                        setActiveInteractionNPC((prev) =>
                            prev
                                ? {
                                    ...prev,
                                    static: { ...prev.static, imageUrl: url },
                                    dynamic: { ...prev.dynamic, imageUrl: url },
                                }
                                : null
                        );
                        setPlayer((p) => ({
                            ...p,
                            companions: p.companions.map((c) =>
                                c.static.id === activeInteractionNPC?.static.id
                                    ? {
                                        ...c,
                                        static: { ...c.static, imageUrl: url },
                                        dynamic: { ...c.dynamic, imageUrl: url },
                                    }
                                    : c
                            ),
                        }));
                        AudioService.playSfx('success');
                    }
                }
            } catch (error) {
                handleAsyncError(error, `生成目标流媒体资产 [${targetType}]`);
            } finally {
                if (taskKey) {
                    setGeneratingTasks((prev) => {
                        const next = { ...prev };
                        delete next[taskKey];
                        return next;
                    });
                }
            }
        },
        [
            generateAssetCore,
            currentNodeId,
            getCurrentNode,
            currentEnemy,
            enemies,
            updateEnemyVisual,
            player.static,
            activeInteractionNPC,
            settings.preferredMediaType,
            handleAsyncError,
            setCurrentZone,
            setCurrentEnemy,
            setPlayer,
            setActiveInteractionNPC,
        ]
    );

    // ==========================================================================
    // 玩家核心动作调度器
    // ==========================================================================
    const handleAction = useCallback(
        async (
            actionType:
                | 'move_local'
                | 'move_zone'
                | 'search'
                | 'interact_obj'
                | 'interact_npc'
                | 'generate_video'
                | 'unlock'
                | 'sanctuary_return',
            targetId?: string,
            label?: string
        ) => {
            try {
                AudioService.playSfx('ui_click');

                // 注意：move_local / search / interact_obj / unlock 的时间成本由
                // useInteraction 内部结算（handleLocalMove / handleSearch / executeInteraction），
                // 此处不再预 tick —— 历史实现预 tick(1) + 内部 tick 导致这些动作时间双倍加速。

                if (actionType === 'search') {
                    setTempSearchVisualOverride(true);
                    AudioService.playSfx('search');
                    setTimeout(() => setTempSearchVisualOverride(false), 2500);
                }

                switch (actionType) {
                    case 'generate_video':
                        await generateNewAssetWrapper('scene', 'video');
                        break;
                    case 'move_local':
                        if (targetId) handleLocalMove(targetId, label);
                        break;
                    case 'sanctuary_return':
                        await proceedToNextZone(false, undefined, sanctuary.id);
                        break;
                    case 'move_zone':
                        if (targetId && targetId.includes('sanctuary')) {
                            await proceedToNextZone(false, undefined, targetId);
                        } else {
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
        },
        [
            generateNewAssetWrapper,
            handleLocalMove,
            proceedToNextZone,
            handleInteraction,
            handleSearch,
            handleAsyncError,
            sanctuary.id,
            setNarrativeFlowStep,
        ]
    );

    // ==========================================================================
    // 叙事流程包装器
    // ==========================================================================
    const handleNarrativeWrapper = useCallback(
        async (
            config: StoryConfig & { details?: { nodeCount: number; tension: number } },
            autoGenOptions?: { images?: boolean; videos?: boolean; audios?: boolean }
        ) => {
            setShowNarrative(false);
            if (!config) return;

            try {
                const analysis = ChainNarrativeService.analyzeChainNarrative(playerRef.current);
                const genContext = buildZoneGenerationContext(config, playerRef.current, analysis);
                await proceedToNextZone(false, genContext, undefined, autoGenOptions);
            } catch (error) {
                handleAsyncError(error, '初始化叙事层生成');
            }
        },
        [proceedToNextZone, handleAsyncError]
    );

    const handleLoadLibrary = useCallback(
        async (type: 'chain' | 'episodic', identifier: string) => {
            setShowNarrative(false);
            setLoadingStatus('正在加载叙事...');
            setGameState(GameState.LOADING);

            try {
                if (type === 'chain') {
                    const result = await PersistenceService.loadArcZone(identifier, 1);
                    if (result.success && result.data) {
                        const processedZone = initializeZoneRuntime(result.data as Zone) as Zone;
                        setCurrentZone(processedZone);
                        setCurrentNodeId(processedZone.entrance);
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
                        setCurrentNodeId(processedZone.entrance);
                        setGameState(GameState.PLAYING);
                        addLog('已加载单元剧区域', 'info');
                    } else {
                        throw new Error('单元剧加载失败');
                    }
                }
            } catch (error) {
                handleAsyncError(error, '持久化存根解析');
                setGameState(GameState.PLAYING);
            }
        },
        [addLog, handleAsyncError, setCurrentZone, setCurrentNodeId, setGameState]
    );

    // --- 更新叙事流程回调 ---
    useEffect(() => {
        narrativeFlowCallbacksRef.current = {
            onComplete: handleNarrativeWrapper,
            onLoadLibrary: handleLoadLibrary,
            onCancel: () => {
                setShowNarrative(false);
            },
        };
    }, [handleNarrativeWrapper, handleLoadLibrary]);

    // ==========================================================================
    // 返回
    // ==========================================================================
    return {
        // === 全局状态 ===
        settings,
        setSettings,
        gameState,
        setGameState,
        player,
        setPlayer,
        currentZone,
        currentNodeId,
        getCurrentNode,
        currentEnemy,
        combatLog,
        logs,
        loadingStatus,
        sanctuary,
        isGenerating,
        generatingTasks,
        isTaskGenerating,
        activeInteractionNPC,
        showCutscene,
        setShowCutscene,
        showNarrative,
        tempSearchVisualOverride,
        activePuzzleNodeId,
        puzzleStats,
        puzzleController,
        loadingAudioId,

        // === 战斗系统 ===
        isCombatActive,
        isPlayerPhase,
        executeTactic,
        endPlayerPhase,
        enemyIntent,
        enemies,
        enemyIntents,
        allies,
        activeAllyId,
        setActiveAllyId,
        isBusy,
        getTacticsFor,
        canUseTactic,
        getVisibleResultSequence,
        pendingDefense,
        positions,
        battleLineMin,
        battleLineMax,
        getUnitRange,
        getDistance,
        moveAlly,
        counterPrompt,
        resolveCounterPrompt,
        counterSkip,
        setCounterSkip,
        insertAction,
        endInsertAction,

        // === 核心动作 ===
        initGame,
        handleAction,
        handleUseItem,
        handleEquipItem,
        handleDiscardItem,
        generateNewAsset: generateNewAssetWrapper,
        proceedToNextZone,
        handleNarrative: handleNarrativeWrapper,
        handleLoadLibrary,

        // === 叙事库管理 ===
        narrativeLibrary,
        loadNarrativeLibrary,
        deleteNarrativeArc,
        deleteEpisodicZone,

        // === 叙事推演预览 ===
        narrativePreview,

        // === 叙事流程状态 ===
        narrativeFlowStep,
        narrativeFlowPendingConfig,
        narrativeFlowEpisodicTension,
        narrativeFlowEpisodicNodeCount,
        narrativeFlowHasSuspendedArc,
        setNarrativeFlowStep,
        setNarrativeFlowEpisodicTension,
        setNarrativeFlowEpisodicNodeCount,
        setNarrativeFlowPendingConfig,
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

        // === 角色与同伴 ===
        handleInteractWithCompanion: setActiveInteractionNPC,
        levelUp,
        gainExperience,
        pendingTacticOptions,
        selectTactic,

        // === NPC 交互系统 ===
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

        // === 庇护所管理 ===
        transferItem,
        handleRest,
        handleResourceTrade,
        upgradeSanctuary,
        getStorageCapacity,
        handleRepair,
        getCustomRestConfig,
        handleUseMedicine,
        handleFacilityUpgrade,
        handleSanctuaryEvent: handleSanctuaryEventWithSpawn,
        morale,
        isLowMorale,
        maxStorage,
        facilities,
        dailyProduction,
        residents,

        // === 系统与持久化 ===
        setNeuralNoise,
        handleRandomSwitch,
        hasMultipleVariants,
        handleSaveGame,
        handleLoadGame,
        handleListSaves,
        handleDeleteSave,

        // === 解谜系统 ===
        setActivePuzzleNodeId,
        getActivePuzzle,
        handlePuzzleSolve,
        handlePuzzleFail,
        recordHintUsed,
        closePuzzle,

        // === 叙事引擎 ===
        dyNarrative,
        isGeneratingDyNarrative,
        dyAnalysis,
        triggerDyNarrative,
        clearDyNarrative,
        updateDyAnalysis,
        updateNarrativeState,
        currentNarrative,
        narrativeAnalysis,
        getNarrativeHealth,
        getCurrentNarrativePhase,
        resetNarrative,

        // === 时间与回合 ===
        advanceExplorationStep,
        advanceCombatTurn,
        resetCombatTurn,
        getCurrentTime,
        getTimeTuple,
    };
};