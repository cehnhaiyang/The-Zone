import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
    GameState,
    AttributeType,
    DotSoundType,
    LogType,
    NarrativeMode,
    NarrativePacing,
    NarrativePhase,
    SanctuaryState,
    ThemeType,
    BaseDynamicState,
    ChainNarrative,
    CurrentTime,
    EnemyTemplate,
    GameStateData,
    GameStateUpdaters,
    PlayerDynamicState,
    PlayerState,
    PlotPoint,
    PlotPointNet,
    Sanctuary,
    StoryConfig,
    Tactic,
    Vital,
    Zone,
    ZoneDate,
    buildCurrentLocation,
    clamp,
    clampDynamicVitals,
    getEntranceNodeId,
    getNodeByKey,
    isItemTemplate,
    isSanctuary,
    markNodeVisited,
    safeAudioOperation,
    safeDeepClone,
    safeNumber,
} from '../meta';
import { pickRandomTactics, PUBLIC_TACTIC_POOL } from '../constants';
import {
    AudioService,
    ChainNarrativeService,
    PersistenceService,
} from '../services';

// ——— 由 meta/utils.ts 迁移而来（本文件唯一使用方） ———
const asSanctuaryResourceRecordLocal = (
    target: Sanctuary
): Record<keyof SanctuaryState, number> =>
    target as unknown as Record<keyof SanctuaryState, number>;

const updateSanctuaryResource = (
    sanctuary: Sanctuary,
    resource: keyof SanctuaryState,
    amount: number
): Sanctuary => {
    const next = safeDeepClone(sanctuary);
    const record = asSanctuaryResourceRecordLocal(next);
    record[resource] = Math.max(0, safeNumber(record[resource]) + safeNumber(amount));
    return next;
};

const HALLUCINATION_TEXTS = [
    '墙壁里传来了呼吸声',
    '监控屏幕似乎眨了一下眼',
    '别回头',
    '文字在流血',
    '它在看着你',
    '脑海里的尖叫',
] as const;

type NarrativeFlowStep =
    | 'mode'
    | 'pacing'
    | 'theme'
    | 'config'
    | 'details'
    | 'preview'
    | 'library'
    | 'closed';

interface NarrativeState {
    config?: StoryConfig;
    analysis: ChainNarrative['analysis'];
}

interface NarrativeLibrary {
    arcs: Array<{
        id: string;
        title: string;
        mainAxis: string;
        zoneCount: number;
    }>;
    episodic: Array<{
        id: string;
        name: string;
        timestamp: number;
    }>;
    isLoading: boolean;
}

const FLOW_BACK_MAP: Record<string, NarrativeFlowStep> = {
    pacing: 'mode',
    theme_chain: 'pacing',
    theme_episodic: 'mode',
    config: 'theme',
    details: 'theme',
    preview_chain: 'config',
    preview_episodic: 'details',
    library: 'mode',
    closed: 'closed',
};

const EMPTY_LIBRARY: NarrativeLibrary = {
    arcs: [],
    episodic: [],
    isLoading: false,
};

const DEFAULT_NODE_COUNT = 15;
const DEFAULT_TENSION = 500;
const DEFAULT_EPISODIC_TENSION_INPUT = 50;

/** ZoneDate 刻度：tick 取值 0-29（30 进制），cycle 取值 0-11（12 进制）。
 *  一天 = 30×12 = 360 tick。与 useSanctuary.TIME_CONFIG（TICKS_PER_HOUR=15）
 *  保持一致：24 小时休息 = 360 tick = 恰好 1 天，确保设施每日产出可跨天结算。 */
const TICKS_PER_CYCLE = 30;
const CYCLES_PER_DAY = 12;

/** 升级成长曲线：每次升级各体征上限增量。 */
const LEVEL_UP_GROWTH = {
    maxHp: 5,
    maxSanity: 3,
    maxStamina: 2,
    maxVigor: 2,
} as const;

// =====================
// 本地纯函数（utils.ts 未导出或不存在，按接口契约实现）
// =====================

/**
 * 推进区域主观时间。
 * dilationFactor = 0 时时间停止；> 1 时主观时间被放大。
 */
const advanceZoneTime = (
    time: ZoneDate,
    delta: number,
    dilationFactor: number
): ZoneDate => {
    const subjective = Math.max(
        0,
        Math.floor(safeNumber(delta) * safeNumber(dilationFactor, 1))
    );
    const rawTick = safeNumber(time.tick) + subjective;
    const tick = rawTick % TICKS_PER_CYCLE;
    const rawCycle = safeNumber(time.cycle) + Math.floor(rawTick / TICKS_PER_CYCLE);
    const cycle = rawCycle % CYCLES_PER_DAY;
    const day = safeNumber(time.day) + Math.floor(rawCycle / CYCLES_PER_DAY);
    return { day, cycle, tick };
};

const snapshotVital = (dynamic: BaseDynamicState): Vital => ({
    maxHp: safeNumber(dynamic.maxHp),
    maxSanity: safeNumber(dynamic.maxSanity),
    maxStamina: safeNumber(dynamic.maxStamina),
    maxVigor: safeNumber(dynamic.maxVigor),
});

const mutateSanctuaryResource = (
    sanctuary: Sanctuary,
    resource: keyof SanctuaryState,
    amount: number
): void => {
    const record = sanctuary as unknown as Record<keyof SanctuaryState, number>;
    record[resource] = Math.max(0, safeNumber(record[resource]) + safeNumber(amount));
};

/**
 * 通用升级结算：属性 +1、体征上限成长并回满。
 * 同时适用于玩家与同伴的动态状态。
 */
const applyLevelUp = <D extends PlayerDynamicState>(
    dynamic: D,
    attr: AttributeType
): D => {
    const maxHp = safeNumber(dynamic.maxHp, 100) + LEVEL_UP_GROWTH.maxHp;
    const maxSanity = safeNumber(dynamic.maxSanity, 100) + LEVEL_UP_GROWTH.maxSanity;
    const maxStamina = safeNumber(dynamic.maxStamina, 100) + LEVEL_UP_GROWTH.maxStamina;
    const maxVigor = safeNumber(dynamic.maxVigor, 100) + LEVEL_UP_GROWTH.maxVigor;
    return {
        ...dynamic,
        level: safeNumber(dynamic.level, 1) + 1,
        [attr]: safeNumber(dynamic[attr], 0) + 1,
        maxHp,
        maxSanity,
        maxStamina,
        maxVigor,
        hp: maxHp,
        sanity: maxSanity,
        stamina: maxStamina,
        vigor: maxVigor,
    } as D;
};

// =====================
// 叙事流程配置工具
// =====================

const threatToRatio = (threat?: number): number =>
    clamp(safeNumber(threat, 0) / 20, 0, 1);

const normalizeTension = (value: number): number => {
    // 输入语义统一为 0-1000 张力值（DetailsPanel 滑块 min=0 max=1000）。
    // 历史实现把 ≤100 的值 ×10，导致 100→1000、150→150 的非单调跳变，已移除。
    const base = Number.isFinite(value) ? value : DEFAULT_TENSION;
    return Math.max(0, Math.min(1000, Math.round(base)));
};

const buildStoryConfigFromPending = (
    pending: Partial<StoryConfig>,
    episodicNodeCount: number,
    episodicTension: number
): StoryConfig | undefined => {
    const mode = pending.mode;
    const theme = pending.theme;
    if (!mode?.id || !theme?.id) return undefined;

    const isEpisodic = mode.id === 'episodic';
    const rawNodeCount = isEpisodic
        ? episodicNodeCount
        : (pending.nodeCount ?? DEFAULT_NODE_COUNT);
    const nodeCount = Math.max(
        1,
        Math.round(Number.isFinite(rawNodeCount) ? rawNodeCount : DEFAULT_NODE_COUNT)
    );

    const config: StoryConfig = {
        mode,
        pacing: pending.pacing ?? { id: 'balanced', prompt: 'balanced' },
        theme,
        nodeCount,
        tension: isEpisodic
            ? normalizeTension(episodicTension)
            : normalizeTension(pending.tension ?? DEFAULT_TENSION),
    };
    if (pending.motif?.id) config.motif = pending.motif;
    if (pending.mainAxis?.id) config.mainAxis = pending.mainAxis;
    return config;
};

// =====================
// 钩子契约
// =====================

interface UseGameStateParams {
    gameData: GameStateData;
    updaters: GameStateUpdaters;
    currentNodeId: string;
    addLog: (text: string, type: LogType) => void;
    spawnEnemy: (enemyTemplate?: EnemyTemplate, zoneId?: string) => void;
    narrativeFlowCallbacks?: {
        onComplete?: (
            config: StoryConfig,
            autoGenOptions?: { images?: boolean; videos?: boolean; audios?: boolean }
        ) => void;
        onCancel?: () => void;
        onLoadLibrary?: (type: 'chain' | 'episodic', identifier: string) => void;
    };
}

interface UseGameStateReturn {
    handleGameTick: (timePassed?: number) => void;
    currentNarrative: NarrativeState | null;
    narrativeAnalysis: ChainNarrative['analysis'] | null;
    updateNarrativeState: (playerState: PlayerState) => void;
    getNarrativeHealth: (playerState: PlayerState) => number;
    getCurrentNarrativePhase: () => NarrativePhase;
    resetNarrative: () => void;
    updatePlayerStateAndPlot: (newZone: Zone) => void;
    advanceExplorationStep: () => void;
    advanceCombatTurn: () => void;
    resetCombatTurn: () => void;
    getCurrentTime: () => CurrentTime;
    getTimeTuple: () => [ZoneDate, number];
    narrativeConfig?: StoryConfig;
    narrativeLibrary: NarrativeLibrary;
    loadNarrativeLibrary: () => Promise<void>;
    deleteNarrativeArc: (arcId: string) => Promise<boolean>;
    deleteEpisodicZone: (zoneId: string) => Promise<boolean>;
    narrativePreview: {
        params?: StoryConfig;
        activePlots: PlotPoint[];
        mainPlots: PlotPoint[];
        sidePlots: PlotPoint[];
        expectedPlotsText: string;
        analysis?: ChainNarrative['analysis'];
    };
    narrativeFlowStep: NarrativeFlowStep;
    narrativeFlowPendingConfig: Partial<StoryConfig>;
    narrativeFlowEpisodicTension: number;
    narrativeFlowEpisodicNodeCount: number;
    narrativeFlowHasSuspendedArc: boolean;
    setNarrativeFlowStep: Dispatch<SetStateAction<NarrativeFlowStep>>;
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
    }) => Promise<void>;
    handleNarrativeFlowBack: () => void;
    handleNarrativeFlowCancel: () => void;
    /** 角色升级（属性提升 + 体征成长 + 战术选择触发）。 */
    levelUp: (targetId: string, attr: AttributeType) => void;
    /** 获取经验值。 */
    gainExperience: (amount: number) => void;
    /** 升级后待选战术列表。非 null 时表示玩家需要从三个战术中选择一个。 */
    pendingTacticOptions: Tactic[] | null;
    /** 从待选战术中选择一个加入角色战术列表。 */
    selectTactic: (tacticId: string) => void;
}

// =====================
// 导出纯工具
// =====================

export const hasSolvePlotPointMarker = (
    entity: unknown
): entity is { toSolvePP: string } => {
    if (entity === null || typeof entity !== 'object') return false;
    return (
        'toSolvePP' in entity &&
        typeof (entity as { toSolvePP?: unknown }).toSolvePP === 'string'
    );
};

export const extractPlotPointsFromZone = (
    zone: Zone
): {
    resolvedIds: string[];
    resolutionContexts: Record<string, string>;
} => {
    const resolvedIds: string[] = [];
    const resolutionContexts: Record<string, string> = {};

    const extract = (entity: unknown, contextText: string) => {
        if (hasSolvePlotPointMarker(entity)) {
            resolvedIds.push(entity.toSolvePP);
            resolutionContexts[entity.toSolvePP] = contextText;
        }
    };

    Object.values(zone.nodes).forEach((node) => {
        extract(node, `在 [${node.name}] 中探索时揭示`);
        node.items?.forEach((item) => extract(item, `发现线索 [${item.name}] 时解开`));
        if (node.nodeNpc) {
            extract(node.nodeNpc, `遭遇 [${node.nodeNpc.name}] 时获悉`);
        }
        // toSolvePP 挂载于 data 内的 EnemyTemplate，而非 specificEnemy 包装对象。
        node.specificEnemy?.data.forEach((enemy) => {
            extract(enemy, `面对 [${enemy.name}] 时显现`);
        });
        node.interactions?.forEach((interaction) => {
            extract(interaction, `在 [${node.name}] 执行交互时触发`);
            if (interaction.requirements?.puzzleSolved) {
                extract(
                    interaction.requirements.puzzleSolved,
                    `解开谜团 [${interaction.requirements.puzzleSolved.title}] 后揭晓`
                );
            }
            interaction.results.stateChange?.gain?.forEach((reward) => {
                if (isItemTemplate(reward)) {
                    extract(reward, `获得物品 [${reward.name}] 时揭示`);
                } else {
                    extract(reward, `遭遇同伴 [${reward.name}] 时获悉`);
                }
            });
            interaction.results.stateChange?.spawnEnemy?.forEach((enemy) => {
                extract(enemy, `遭遇敌对实体 [${enemy.name}] 时显现`);
            });
        });
    });

    return { resolvedIds, resolutionContexts };
};

export const resolvePlotPointNet = (
    net: PlotPointNet,
    resolvedIds: string[]
): {
    net: PlotPointNet;
    resolvedCount: number;
} => {
    const ids = new Set(resolvedIds);
    let resolvedCount = 0;

    const resolve = <T extends PlotPoint>(points: T[]): T[] =>
        points.map((point) => {
            if (ids.has(point.id) && !point.isSolved) {
                resolvedCount += 1;
                return { ...point, isSolved: true } as T;
            }
            return point;
        });

    return {
        net: [resolve(net[0]), resolve(net[1])],
        resolvedCount,
    };
};

/**
 * 单 tick 结算核心（纯函数）：
 * 回合推进、区域主观时间、理智/电量消耗、庇护所资源结算、体征快照。
 */
export const calculateNextTickState = (
    prevPlayer: PlayerState,
    timePassed: number,
    gameState: GameState,
    currentZone?: Zone | Sanctuary,
    cameraModeOverride?: boolean
): {
    nextPlayer: PlayerState;
    isBatteryDepleted: boolean;
} => {
    const nextPlayer = safeDeepClone(prevPlayer);
    const timeDelta = Math.max(0, Math.floor(safeNumber(timePassed)));
    const activeZone = currentZone ?? nextPlayer.sanctuary;
    const dilationFactor = Math.max(0, safeNumber(activeZone.dilationFactor, 1));
    const isSanctuaryMode = gameState === GameState.SANCTUARY || isSanctuary(activeZone);
    const isCameraMode = cameraModeOverride ?? prevPlayer.visualMode === 'camera';
    let isBatteryDepleted = false;

    nextPlayer.currentGameRound.absoluteTick += timeDelta;
    nextPlayer.currentGameRound.combatTurn =
        gameState === GameState.COMBAT ? nextPlayer.currentGameRound.combatTurn + timeDelta : 0;
    nextPlayer.currentZoneTime = advanceZoneTime(
        nextPlayer.currentZoneTime,
        timeDelta,
        dilationFactor
    );

    // 探索压力：庇护所外按主观时间持续流失理智；神经链接仪离线时惩罚 ×11。
    if (!isSanctuaryMode) {
        const subjectiveDelta = Math.max(0, Math.floor(timeDelta * dilationFactor));
        const neuralOffline =
            nextPlayer.neuralLink.battery <= 0 || nextPlayer.neuralLink.integrity <= 0;
        const sanityDrain = (0.1 + (neuralOffline ? 1.0 : 0)) * subjectiveDelta;
        nextPlayer.dynamic.sanity = clamp(
            nextPlayer.dynamic.sanity - sanityDrain,
            0,
            nextPlayer.dynamic.maxSanity
        );
    }

    // 摄像模式耗电；完整度 < 50 时耗电翻倍。
    if (isCameraMode && !isSanctuaryMode && nextPlayer.neuralLink.integrity > 0) {
        const totalDrain = 0.05 * (nextPlayer.neuralLink.integrity < 50 ? 2 : 1) * timeDelta;
        const previousBattery = nextPlayer.neuralLink.battery;
        nextPlayer.neuralLink.battery = Math.max(0, previousBattery - totalDrain);
        isBatteryDepleted = previousBattery > 0 && nextPlayer.neuralLink.battery <= 0;
    }

    // 庇护所资源结算：驻留时按人口消耗；外出时维持基础损耗。
    const sanctuary = nextPlayer.sanctuary;
    const population = Math.max(0, safeNumber(sanctuary.population));
    if (population > 0) {
        if (isSanctuaryMode) {
            mutateSanctuaryResource(sanctuary, 'food', -timeDelta * population * 0.1);
            mutateSanctuaryResource(sanctuary, 'water', -timeDelta * population * 0.15);
            mutateSanctuaryResource(sanctuary, 'electricity', -timeDelta * population * 0.5);
            if (sanctuary.food <= 0 || sanctuary.water <= 0) {
                mutateSanctuaryResource(sanctuary, 'morale', -timeDelta * 2.0);
            }
        } else {
            mutateSanctuaryResource(sanctuary, 'food', -timeDelta * 0.05);
            mutateSanctuaryResource(sanctuary, 'water', -timeDelta * 0.08);
        }
    }

    clampDynamicVitals(nextPlayer.dynamic);

    const previousCurrent = nextPlayer.vitalRecord.currentVital;
    nextPlayer.vitalRecord = {
        prevVital: {
            prevTick: previousCurrent.currentTick,
            prevVital: previousCurrent.currentVital,
        },
        currentVital: {
            currentTick: nextPlayer.currentGameRound.absoluteTick,
            currentVital: snapshotVital(nextPlayer.dynamic),
        },
    };

    return { nextPlayer, isBatteryDepleted };
};

// =====================
// 主钩子
// =====================

export const useGameState = ({
    gameData,
    updaters,
    currentNodeId,
    addLog,
    spawnEnemy,
    narrativeFlowCallbacks,
}: UseGameStateParams): UseGameStateReturn => {
    const currentZone = gameData.currentZone;
    const gameState = gameData.gameState;
    const player = gameData.player;
    const { setPlayer, setCurrentZone, setCurrentNodeId, setSanctuary, setGameState } = updaters;

    const initializedAudio = useRef(false);
    const narrativeCallbacksRef = useRef(narrativeFlowCallbacks);
    const playerRef = useRef(player);

    useEffect(() => {
        narrativeCallbacksRef.current = narrativeFlowCallbacks;
    }, [narrativeFlowCallbacks]);

    useEffect(() => {
        playerRef.current = player;
    }, [player]);

    const [narrativeFlowStep, setNarrativeFlowStep] = useState<NarrativeFlowStep>('mode');
    const [narrativeFlowPendingConfig, setNarrativeFlowPendingConfig] = useState<
        Partial<StoryConfig>
    >({});
    const [narrativeFlowEpisodicTension, setNarrativeFlowEpisodicTension] = useState(
        DEFAULT_EPISODIC_TENSION_INPUT
    );
    const [narrativeFlowEpisodicNodeCount, setNarrativeFlowEpisodicNodeCount] =
        useState(DEFAULT_NODE_COUNT);
    const [currentNarrative, setCurrentNarrative] = useState<NarrativeState | null>(null);
    const [narrativeLibrary, setNarrativeLibrary] = useState<NarrativeLibrary>(EMPTY_LIBRARY);
    const [pendingTacticOptions, setPendingTacticOptions] = useState<Tactic[] | null>(null);

    const narrativeFlowHasSuspendedArc = player.activeArc?.status === 'suspended';

    const updateNarrativeState = useCallback((playerState: PlayerState) => {
        setCurrentNarrative({
            config: playerState.activeArc?.config,
            analysis: ChainNarrativeService.analyzeChainNarrative(playerState),
        });
    }, []);

    const getNarrativeHealth = useCallback((playerState: PlayerState) => {
        return ChainNarrativeService.getChainNarrativeHealth(playerState);
    }, []);

    const getCurrentNarrativePhase = useCallback((): NarrativePhase => {
        return ChainNarrativeService.analyzeChainNarrative(playerRef.current).params.progress
            .macro;
    }, []);

    const resetNarrative = useCallback(() => {
        setCurrentNarrative(null);
    }, []);

    /**
     * 核心区域过载与伏笔求值逻辑。
     *
     * 职责：
     * 1. 切换当前区域 / 节点 / 位置快照。
     * 2. 处理新区域挂载的伏笔注入。
     * 3. 解析区域内 toSolvePP 标记并回收伏笔。
     * 4. 通过 ChainNarrativeService.syncChainAnalysis 同步叙事分析结果。
     * 5. 延迟释放日志与音效副作用。
     */
    const updatePlayerStateAndPlot = useCallback(
        (newZone: Zone) => {
            const prevPlayer = playerRef.current;
            if (!newZone) return;

            const logsToQueue: Array<{ text: string; type: LogType }> = [];
            const sfxToQueue: DotSoundType[] = [];

            // —— 返回庇护所 ——
            const prevSanctuary = prevPlayer.sanctuary;
            const incomingSanctuary = isSanctuary(newZone) ? newZone : undefined;
            if (incomingSanctuary || newZone.id === prevSanctuary.id) {
                const sanctuary = incomingSanctuary ?? prevSanctuary;
                const entranceId = getEntranceNodeId(sanctuary);
                const visitedSanctuary = markNodeVisited(sanctuary, entranceId);

                let nextPlayer: PlayerState = {
                    ...prevPlayer,
                    sanctuary: visitedSanctuary,
                    currentGameRound: {
                        ...prevPlayer.currentGameRound,
                        combatTurn: 0,
                    },
                    location: {
                        prevLocation: prevPlayer.location.currentLocation,
                        currentLocation: buildCurrentLocation(visitedSanctuary, entranceId),
                    },
                };
                nextPlayer = ChainNarrativeService.syncChainAnalysis(nextPlayer);

                setSanctuary(visitedSanctuary);
                setCurrentZone(visitedSanctuary as unknown as Zone);
                setCurrentNodeId(entranceId);
                setPlayer(nextPlayer);
                setGameState(GameState.SANCTUARY);
                addLog(`已返回庇护所：${visitedSanctuary.name}`, 'event');
                updateNarrativeState(nextPlayer);
                return;
            }

            // —— 常规区域装载 ——
            const prevLocation = prevPlayer.location.currentLocation;
            const isFirstEnter = newZone.id !== prevLocation.zone.id;
            const staysAtPreviousNode =
                !isFirstEnter && Boolean(getNodeByKey(newZone, prevLocation.node.id));
            const targetNodeId = staysAtPreviousNode ? prevLocation.node.id : getEntranceNodeId(newZone);

            const targetNodeBefore = getNodeByKey(newZone, targetNodeId);
            const exploredNodeDelta = targetNodeBefore && !targetNodeBefore.isVisited ? 1 : 0;
            const visitedZone = markNodeVisited(newZone, targetNodeId);

            let nextPlayer: PlayerState = {
                ...prevPlayer,
                exploredZones: prevPlayer.exploredZones + (isFirstEnter ? 1 : 0),
                exploredNodes: prevPlayer.exploredNodes + exploredNodeDelta,
                currentGameRound: {
                    ...prevPlayer.currentGameRound,
                    combatTurn: 0,
                },
                location: {
                    prevLocation,
                    currentLocation: buildCurrentLocation(visitedZone, targetNodeId),
                },
            };

            // 首次进入新区域时注入区域生成伏笔。
            if (isFirstEnter && visitedZone.generatedPlotPoints?.length) {
                visitedZone.generatedPlotPoints.forEach((plot) => {
                    nextPlayer = ChainNarrativeService.addChainPlotPoint(nextPlayer, plot);
                });
                if (nextPlayer.activeArc?.config.mode.id === 'chain') {
                    logsToQueue.push({
                        text: `认知系统检测到 ${visitedZone.generatedPlotPoints.length} 条新的异常逻辑...`,
                        type: 'mental',
                    });
                }
            }

            // 解析区域内可回收伏笔。
            const { resolvedIds, resolutionContexts } = extractPlotPointsFromZone(visitedZone);
            if (resolvedIds.length > 0) {
                let resolvedCount = 0;
                resolvedIds.forEach((id) => {
                    const hasUnresolved = nextPlayer.activeArc
                        ? nextPlayer.activeArc.plotPoints
                            .flat()
                            .some((p) => p.id === id && !p.isSolved)
                        : false;
                    if (hasUnresolved) {
                        resolvedCount += 1;
                        nextPlayer = ChainNarrativeService.resolveChainPlotPoint(nextPlayer, id);
                        const context = resolutionContexts[id];
                        if (context) {
                            logsToQueue.push({ text: `伏笔回收：${context}`, type: 'success' });
                        }
                    }
                });
                if (resolvedCount > 0) {
                    logsToQueue.push({
                        text: `时间线收束：${resolvedCount} 条伏笔得到了解答。`,
                        type: 'success',
                    });
                    sfxToQueue.push('success');
                }
            }

            // 统一同步链式叙事分析结果。
            nextPlayer = ChainNarrativeService.syncChainAnalysis(nextPlayer);

            setCurrentZone(visitedZone);
            setCurrentNodeId(targetNodeId);
            setPlayer(nextPlayer);

            // 状态装载完成后释放副作用池。
            logsToQueue.forEach((log) => addLog(log.text, log.type));
            sfxToQueue.forEach((sfx) =>
                safeAudioOperation(() => AudioService.playSfx(sfx), '音效播放失败')
            );
            setGameState(GameState.PLAYING);
            if (isFirstEnter) {
                addLog(`已进入新区域：${newZone.name}`, 'event');
            }
            updateNarrativeState(nextPlayer);
        },
        [
            setPlayer,
            setCurrentZone,
            setCurrentNodeId,
            setSanctuary,
            setGameState,
            addLog,
            updateNarrativeState,
        ]
    );

    const advanceExplorationStep = useCallback(() => {
        const prev = playerRef.current;
        const updatedPlayer: PlayerState = {
            ...prev,
            currentGameRound: {
                ...prev.currentGameRound,
                explorationStep: prev.currentGameRound.explorationStep + 1,
            },
        };
        setPlayer(updatedPlayer);
        updateNarrativeState(updatedPlayer);
    }, [setPlayer, updateNarrativeState]);

    const advanceCombatTurn = useCallback(() => {
        setPlayer((prev) => ({
            ...prev,
            currentGameRound: {
                ...prev.currentGameRound,
                combatTurn: prev.currentGameRound.combatTurn + 1,
            },
        }));
    }, [setPlayer]);

    const resetCombatTurn = useCallback(() => {
        setPlayer((prev) => ({
            ...prev,
            currentGameRound: {
                ...prev.currentGameRound,
                combatTurn: 0,
            },
        }));
    }, [setPlayer]);

    const getCurrentTime = useCallback(
        (): CurrentTime => ({
            currentZoneTime: playerRef.current.currentZoneTime,
            currentGameRound: playerRef.current.currentGameRound,
        }),
        []
    );

    const getTimeTuple = useCallback((): [ZoneDate, number] => {
        const { currentZoneTime, currentGameRound } = playerRef.current;
        return [currentZoneTime, currentGameRound.absoluteTick];
    }, []);

    const handleGameTick = useCallback(
        (timePassed: number = 1) => {
            const prev = playerRef.current;
            const { nextPlayer, isBatteryDepleted } = calculateNextTickState(
                prev,
                timePassed,
                gameState,
                currentZone
            );
            let finalPlayer = nextPlayer;

            // 神经链接仪电量耗尽：强制切换生物视觉。
            if (isBatteryDepleted && finalPlayer.visualMode !== 'bio') {
                finalPlayer = { ...finalPlayer, visualMode: 'bio' };
                addLog('警告：神经连接仪电量耗尽。强制切换至生物视觉。', 'warning');
                safeAudioOperation(() => AudioService.playSfx('fail'), '音效播放失败');
            }

            // 庇护所低概率亚空间侵蚀。
            let sanctuaryBreach = false;
            if (gameState === GameState.SANCTUARY && Math.random() < 0.05) {
                const erosion = safeNumber(finalPlayer.sanctuary.erosion, 0);
                const morale = safeNumber(finalPlayer.sanctuary.morale, 100);
                const stability = clamp(100 - erosion + (morale - 50) * 0.2, 0, 100);
                if (stability < 50 && Math.random() > stability / 100) {
                    sanctuaryBreach = true;
                    finalPlayer = {
                        ...finalPlayer,
                        sanctuary: updateSanctuaryResource(finalPlayer.sanctuary, 'erosion', 5),
                    };
                }
            }

            setPlayer(finalPlayer);
            // 保持全局 sanctuary 与 player.sanctuary 同步。
            setSanctuary(finalPlayer.sanctuary);

            if (sanctuaryBreach) {
                addLog('警告：现实锚点波动。庇护所遭到微弱的亚空间侵蚀...', 'critical');
                safeAudioOperation(() => AudioService.playSfx('error'), '音效播放失败');
                spawnEnemy(undefined, finalPlayer.sanctuary.id);
            }
        },
        [gameState, currentZone, addLog, setPlayer, setSanctuary, spawnEnemy]
    );

    /**
     * 音频状态同步：根据 gameState 与玩家精神状态动态调整音频管线。
     * 探索主题严格取自 ThemeType：威胁 > 15 → 'dangerous'，
     * 否则回落当前叙事链主题（NarrativeTheme ∈ ThemeType）。
     */
    useEffect(() => {
        if (!initializedAudio.current && AudioService.isReady()) {
            initializedAudio.current = true;
        }
        if (!initializedAudio.current) return;

        safeAudioOperation(() => {
            AudioService.setMixParams({
                ambienceVolume: gameState === GameState.DIALOGUE ? 0.3 : 0.6,
            });

            const clearPanic = () => {
                AudioService.removePanicEffect();
                AudioService.stopHeartbeat();
            };

            if (gameState === GameState.COMBAT) {
                AudioService.setTheme('combat');
                clearPanic();
            } else if (gameState === GameState.SANCTUARY) {
                AudioService.setTheme('sanctuary');
                clearPanic();
            } else if (gameState === GameState.GAME_OVER) {
                AudioService.stopAmbience();
                AudioService.setTheme('death');
                AudioService.playSfx('fail');
                clearPanic();
            } else if (gameState === GameState.PLAYING) {
                const node = currentZone?.nodes?.[currentNodeId];
                const dynamicState = playerRef.current.dynamic;
                if (!node || !dynamicState) {
                    clearPanic();
                    return;
                }
                const sanity = safeNumber(dynamicState.sanity, 100);
                const threat = safeNumber(node.threatLevel, 0);
                const threatRatio = threatToRatio(threat);

                if (sanity < 20) {
                    AudioService.setTheme('panic');
                    AudioService.applyPanicEffect(0.8);
                    AudioService.startHeartbeat(120);
                } else if (sanity < 40) {
                    AudioService.setTheme('panic');
                    AudioService.applyPanicEffect(0.4);
                    AudioService.startHeartbeat(90);
                } else {
                    clearPanic();
                    AudioService.removeMuffleEffect();
                    const arcTheme = (playerRef.current.activeArc?.config.theme.id ??
                        'cosmic_horror') as ThemeType;
                    AudioService.setTheme(threat > 15 ? 'dangerous' : arcTheme, threatRatio);
                }
            }
        }, '音频管线装载失败');
    }, [
        gameState,
        currentNodeId,
        currentZone?.id,
        currentZone?.nodes?.[currentNodeId]?.threatLevel,
        player.dynamic.sanity,
    ]);

    /**
     * 玩家 HP 归零 → 游戏结束状态封锁。
     */
    useEffect(() => {
        if (
            gameState === GameState.GAME_OVER ||
            gameState === GameState.MAIN_MENU ||
            gameState === GameState.LOADING
        ) {
            return;
        }
        if (safeNumber(player.dynamic.hp, 0) <= 0) {
            setGameState(GameState.GAME_OVER);
            addLog('VITAL SIGNS: FLATLINE', 'critical');
            safeAudioOperation(() => AudioService.playSfx('fail'), '音效播放失败');
        }
    }, [gameState, player, setGameState, addLog]);

    /**
     * 精神值低时的幻觉 / 破碎效果渲染循环。
     */
    useEffect(() => {
        if (gameState !== GameState.PLAYING) return;
        const timer = setInterval(() => {
            const dynamicState = playerRef.current.dynamic;
            const sanity = safeNumber(dynamicState.sanity, 100);
            if (safeNumber(dynamicState.hp, 0) <= 0) return;

            if (sanity <= 0) {
                if (Math.random() < 0.1) {
                    addLog('你的意识正在破碎...', 'mental');
                    safeAudioOperation(() => AudioService.playSfx('error'), '音效播放失败');
                }
            } else if (sanity <= 60) {
                if (Math.random() < (60 - sanity) / 3000) {
                    addLog(
                        HALLUCINATION_TEXTS[Math.floor(Math.random() * HALLUCINATION_TEXTS.length)],
                        'hallucination'
                    );
                    safeAudioOperation(() => AudioService.playSfx('error'), '音效播放失败');
                }
            }
        }, 3000);
        return () => clearInterval(timer);
    }, [gameState, addLog]);

    // ==========================================================================
    // 叙事库
    // ==========================================================================

    const loadNarrativeLibrary = useCallback(async () => {
        setNarrativeLibrary((prev) => ({ ...prev, isLoading: true }));
        try {
            const [arcs, episodic] = await Promise.all([
                PersistenceService.listNarrativeArcs(),
                PersistenceService.listEpisodicZones(),
            ]);

            const rawArcs = arcs as unknown as Array<Record<string, unknown>>;
            const mappedArcs = rawArcs.map((arc, index) => ({
                id:
                    typeof arc.id === 'string'
                        ? arc.id
                        : `${typeof arc.title === 'string' ? arc.title : 'arc'}_${index}`,
                title: typeof arc.title === 'string' ? arc.title : '未命名叙事链',
                mainAxis: typeof arc.mainAxis === 'string' ? arc.mainAxis : '未知主轴',
                zoneCount: typeof arc.zoneCount === 'number' ? arc.zoneCount : 0,
            }));

            const rawEpisodic = episodic as unknown as Array<Record<string, unknown>>;
            const mappedEpisodic = rawEpisodic.map((zone, index) => ({
                id:
                    typeof zone.id === 'string'
                        ? zone.id
                        : `${typeof zone.name === 'string' ? zone.name : 'zone'}_${index}`,
                name: typeof zone.name === 'string' ? zone.name : '未命名单元剧区域',
                timestamp: typeof zone.timestamp === 'number' ? zone.timestamp : Date.now(),
            }));

            setNarrativeLibrary({ arcs: mappedArcs, episodic: mappedEpisodic, isLoading: false });
        } catch (error) {
            console.error('[叙事总线] 加载叙事库失败:', error);
            setNarrativeLibrary((prev) => ({ ...prev, isLoading: false }));
        }
    }, []);

    /** 通用叙事库删除器。 */
    const deleteFromLibrary = useCallback(
        async (
            deleter: (id: string) => Promise<boolean>,
            id: string
        ): Promise<boolean> => {
            try {
                const result = await deleter(id);
                safeAudioOperation(
                    () => AudioService.playSfx(result ? 'success' : 'error'),
                    '音效播放失败'
                );
                if (result) {
                    await loadNarrativeLibrary();
                }
                return result;
            } catch (error) {
                console.error('[叙事总线] 删除叙事库条目失败:', error);
                safeAudioOperation(() => AudioService.playSfx('error'), '音效播放失败');
                return false;
            }
        },
        [loadNarrativeLibrary]
    );

    const deleteNarrativeArc = useCallback(
        (arcId: string) => deleteFromLibrary((id) => PersistenceService.deleteNarrativeArc(id), arcId),
        [deleteFromLibrary]
    );

    const deleteEpisodicZone = useCallback(
        (zoneId: string) => deleteFromLibrary((id) => PersistenceService.deleteEpisodicZone(id), zoneId),
        [deleteFromLibrary]
    );

    const narrativePreview = useMemo(() => {
        const analysis = player ? ChainNarrativeService.analyzeChainNarrative(player) : undefined;
        const activePlots: PlotPoint[] = (player.activeArc?.plotPoints ?? [[], []])
            .flat()
            .filter((p) => !p.isSolved);
        const mainPlots = activePlots.filter((p) => p.type === 'main');
        const sidePlots = activePlots.filter((p) => p.type === 'side');

        const gen = analysis?.output?.ppToGenerate;
        const pendingConfig = buildStoryConfigFromPending(
            narrativeFlowPendingConfig,
            narrativeFlowEpisodicNodeCount,
            narrativeFlowEpisodicTension
        );
        const params =
            narrativeFlowStep !== 'closed'
                ? (pendingConfig ?? player.activeArc?.config)
                : player.activeArc?.config;

        return {
            params,
            activePlots,
            mainPlots,
            sidePlots,
            expectedPlotsText:
                gen && (gen.m > 0 || gen.s > 0) ? `主线x${gen.m}, 支线x${gen.s}` : '无',
            analysis,
        };
    }, [
        player,
        narrativeFlowStep,
        narrativeFlowPendingConfig,
        narrativeFlowEpisodicNodeCount,
        narrativeFlowEpisodicTension,
    ]);

    // ==========================================================================
    // 叙事流程状态机
    // ==========================================================================

    /** 通用步骤推进。 */
    const flowAdvance = useCallback(
        <K extends keyof StoryConfig>(
            key: K,
            value: StoryConfig[K],
            nextStep: NarrativeFlowStep
        ) => {
            setNarrativeFlowPendingConfig(
                (prev) => ({ ...prev, [key]: value }) as Partial<StoryConfig>
            );
            setNarrativeFlowStep(nextStep);
        },
        []
    );

    const handleNarrativeFlowOpenLibrary = useCallback(() => {
        setNarrativeFlowStep('library');
        void loadNarrativeLibrary();
    }, [loadNarrativeLibrary]);

    const handleNarrativeFlowLoadFromLibrary = useCallback(
        (type: 'chain' | 'episodic', identifier: string) => {
            narrativeCallbacksRef.current?.onLoadLibrary?.(type, identifier);
        },
        []
    );

    const handleNarrativeFlowModeConfirm = useCallback(
        (mode: NarrativeMode) => {
            flowAdvance(
                'mode',
                { id: mode, prompt: mode },
                mode === 'episodic' ? 'theme' : 'pacing'
            );
        },
        [flowAdvance]
    );

    const handleNarrativeFlowPacingConfirm = useCallback(
        (pacing: NarrativePacing) => {
            flowAdvance('pacing', { id: pacing, prompt: pacing }, 'theme');
        },
        [flowAdvance]
    );

    const handleNarrativeFlowThemeConfirm = useCallback(
        (themeId: string) => {
            flowAdvance(
                'theme',
                { id: themeId, prompt: themeId },
                narrativeFlowPendingConfig.mode?.id === 'episodic' ? 'details' : 'config'
            );
        },
        [flowAdvance, narrativeFlowPendingConfig.mode?.id]
    );

    const handleNarrativeFlowConfigConfirm = useCallback(
        (configPart: { motif: string; mainAxis: string }) => {
            setNarrativeFlowPendingConfig((prev) => ({
                ...prev,
                motif: configPart.motif
                    ? { id: configPart.motif, prompt: configPart.motif }
                    : undefined,
                mainAxis: configPart.mainAxis
                    ? { id: configPart.mainAxis, prompt: configPart.mainAxis }
                    : undefined,
            }));
            setNarrativeFlowStep('preview');
        },
        []
    );

    const handleNarrativeFlowDetailsConfirm = useCallback(() => {
        setNarrativeFlowStep('preview');
    }, []);

    const handleNarrativeFlowPreviewConfirm = useCallback(
        async (autoGenOptions?: { images?: boolean; videos?: boolean; audios?: boolean }) => {
            const payload = buildStoryConfigFromPending(
                narrativeFlowPendingConfig,
                narrativeFlowEpisodicNodeCount,
                narrativeFlowEpisodicTension
            );
            const prev = playerRef.current;
            if (!payload) {
                console.warn('[叙事总线] 叙事配置不完整，无法确认叙事流程。');
                return;
            }

            let confirmedConfig: StoryConfig = payload;
            let next: PlayerState;

            if (payload.mode.id === 'chain') {
                if (prev.activeArc?.status === 'suspended' && prev.activeArc.config.mode.id === 'chain') {
                    // 存在挂起链：恢复并以新配置覆写。
                    const resumed = ChainNarrativeService.resumeChainArc(prev);
                    const arc = resumed.activeArc;
                    if (arc) {
                        const length = Math.max(
                            1,
                            safeNumber(arc.length, payload.nodeCount || DEFAULT_NODE_COUNT)
                        );
                        confirmedConfig = { ...payload, nodeCount: length };
                        next = {
                            ...resumed,
                            activeArc: {
                                ...arc,
                                id: `${payload.theme.id || 'none'}_${payload.motif?.id ?? 'nomotif'}_${payload.mainAxis?.id ?? 'noaxis'
                                    }_${length}`,
                                config: confirmedConfig,
                                length,
                                status: 'ongoing',
                            },
                        };
                    } else {
                        next = resumed;
                    }
                } else {
                    next = ChainNarrativeService.startChainArc(prev, payload);
                }
            } else {
                // 单元剧模式：挂起当前链式叙事，避免宏观链式引擎继续接管。
                const arcName = prev.activeArc?.config.theme.id ?? 'UNKNOWN';
                if (prev.activeArc?.status === 'ongoing') {
                    addLog(
                        `[叙事总线] 链式叙事 [${arcName}] 已挂起，可随时通过叙事面板恢复。`,
                        'warning'
                    );
                }
                next = ChainNarrativeService.suspendChainArc(prev);
            }

            next = ChainNarrativeService.syncChainAnalysis(next);
            setPlayer(next);
            updateNarrativeState(next);
            setNarrativeFlowStep('closed');
            setNarrativeFlowPendingConfig({});
            // 延后到下一次渲染再触发：proceedToNextZone 闭包持有旧 player，
            // 同步调用会把"刚挂起/新建的弧"误判为仍活跃的旧弧。
            setTimeout(() => {
                narrativeCallbacksRef.current?.onComplete?.(confirmedConfig, autoGenOptions);
            }, 0);
        },
        [
            narrativeFlowPendingConfig,
            narrativeFlowEpisodicNodeCount,
            narrativeFlowEpisodicTension,
            setPlayer,
            updateNarrativeState,
        ]
    );

    const handleNarrativeFlowBack = useCallback(() => {
        setNarrativeFlowStep((prev) => {
            const modeSuffix =
                narrativeFlowPendingConfig.mode?.id === 'episodic' ? 'episodic' : 'chain';
            return FLOW_BACK_MAP[`${prev}_${modeSuffix}`] ?? FLOW_BACK_MAP[prev] ?? prev;
        });
    }, [narrativeFlowPendingConfig.mode?.id]);

    const handleNarrativeFlowCancel = useCallback(() => {
        setNarrativeFlowStep('closed');
        setNarrativeFlowPendingConfig({});
        setNarrativeFlowEpisodicTension(DEFAULT_EPISODIC_TENSION_INPUT);
        setNarrativeFlowEpisodicNodeCount(DEFAULT_NODE_COUNT);
        narrativeCallbacksRef.current?.onCancel?.();
    }, []);

    // ==========================================================================
    // 角色升级与战术选择
    // ==========================================================================

    const levelUp = useCallback(
        (targetId: string, attr: AttributeType) => {
            const prev = playerRef.current;
            const isPlayer = targetId === 'player' || targetId === prev.static.id;
            const companion = isPlayer
                ? undefined
                : prev.companions.find((c) => c.static.id === targetId);

            if (!isPlayer && !companion) {
                addLog('未找到可升级的角色。', 'warning');
                safeAudioOperation(() => AudioService.playSfx('error'), '音效播放失败');
                return;
            }

            const targetLevel = safeNumber((companion ?? prev).dynamic.level, 1);
            const cost = targetLevel * 100;
            // 经验池始终由玩家统一持有，同伴升级同样消耗玩家 XP。
            if (safeNumber(prev.dynamic.xp, 0) < cost) {
                addLog(`经验不足，需要 ${cost} XP。`, 'warning');
                safeAudioOperation(() => AudioService.playSfx('fail'), '音效播放失败');
                return;
            }

            const nextLevel = targetLevel + 1;

            if (isPlayer) {
                const options = pickRandomTactics(3, prev.dynamic.tactics.map((t) => t.id));
                const leveled = applyLevelUp(prev.dynamic, attr);
                setPlayer({
                    ...prev,
                    dynamic: { ...leveled, xp: safeNumber(prev.dynamic.xp, 0) - cost },
                });
                setPendingTacticOptions(options.length > 0 ? options : null);
                addLog(
                    options.length > 0
                        ? `升级成功！Lv.${nextLevel} 请从战术池中选择一个战术学习。`
                        : `升级成功！Lv.${nextLevel} 已无新战术可学。`,
                    'info'
                );
            } else if (companion) {
                setPlayer({
                    ...prev,
                    dynamic: { ...prev.dynamic, xp: safeNumber(prev.dynamic.xp, 0) - cost },
                    companions: prev.companions.map((c) =>
                        c.static.id === targetId ? { ...c, dynamic: applyLevelUp(c.dynamic, attr) } : c
                    ),
                });
                addLog(`${companion.static.name} 升级至 Lv.${nextLevel}。`, 'info');
            }

            safeAudioOperation(() => AudioService.playSfx('success'), '音效播放失败');
        },
        [addLog, setPlayer]
    );

    const gainExperience = useCallback(
        (amount: number) => {
            const delta = safeNumber(amount, 0);
            if (delta <= 0) return;
            setPlayer((prev) => ({
                ...prev,
                dynamic: {
                    ...prev.dynamic,
                    xp: safeNumber(prev.dynamic.xp, 0) + delta,
                },
            }));
        },
        [setPlayer]
    );

    const selectTactic = useCallback(
        (tacticId: string) => {
            const prev = playerRef.current;
            const option = PUBLIC_TACTIC_POOL.find((t) => t.id === tacticId);
            const isAllowed = pendingTacticOptions?.some((t) => t.id === tacticId) ?? false;
            setPendingTacticOptions(null);

            if (!option || !isAllowed) {
                addLog('无效战术选择。', 'warning');
                safeAudioOperation(() => AudioService.playSfx('error'), '音效播放失败');
                return;
            }

            if (prev.dynamic.tactics.some((t) => t.id === tacticId)) {
                addLog('已经掌握该战术。', 'info');
            } else {
                setPlayer({
                    ...prev,
                    dynamic: {
                        ...prev.dynamic,
                        tactics: [...prev.dynamic.tactics, option as Tactic],
                    },
                });
                addLog(`已习得新战术：${option.name}。`, 'info');
            }
            safeAudioOperation(() => AudioService.playSfx('success'), '音效播放失败');
        },
        [addLog, setPlayer, pendingTacticOptions]
    );

    return {
        handleGameTick,
        currentNarrative,
        narrativeAnalysis: currentNarrative?.analysis ?? null,
        updateNarrativeState,
        getNarrativeHealth,
        getCurrentNarrativePhase,
        resetNarrative,
        updatePlayerStateAndPlot,
        advanceExplorationStep,
        advanceCombatTurn,
        resetCombatTurn,
        getCurrentTime,
        getTimeTuple,
        narrativeConfig: currentNarrative?.config,
        narrativeLibrary,
        loadNarrativeLibrary,
        deleteNarrativeArc,
        deleteEpisodicZone,
        narrativePreview,
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
    };
};