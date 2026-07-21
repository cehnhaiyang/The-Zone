import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
    Settings, PlayerState, Zone, GameState, Node, EnemyTemplate,
    NarrativePhase, LogType, PlotPoint, CurrentTime, ZoneDate, RealDate,
    GameStateData, GameStateUpdaters, safeAudioOperation, extractPlotPointsFromZone,
    calculateNextTickState, ChainNarrative, DyNarrative, StoryConfig, NarrativeMode,
    NarrativePacing, StoryArc, SfxType
} from '../meta';
import { AudioService, ChainNarrativeService, DynamicNarrativeService, PersistenceService, AiService } from '../services';

const HALLUCINATION_TEXTS = [
    "墙壁里传来了呼吸声", "监控屏幕似乎眨了一下眼", "别回头",
    "文字在流血", "它在看着你", "脑海里的尖叫"
] as const;

type NarrativeFlowStep = 'mode' | 'pacing' | 'theme' | 'config' | 'details' | 'preview' | 'library' | 'closed';

interface NarrativeState {
    config?: StoryConfig;
    analysis: ChainNarrative['analysis'];
    directives: string[];
    dynamicFunction: DyNarrative;
}

interface NarrativeLibrary {
    arcs: Array<{ title: string; mainAxis: string; zoneCount: number }>;
    episodic: Array<{ id: string; name: string; timestamp: number }>;
    isLoading: boolean;
}

const FLOW_BACK_MAP: Record<string, NarrativeFlowStep> = {
    pacing: 'mode',
    config: 'theme',
    details: 'theme',
    preview_chain: 'config',
    preview_episodic: 'details',
    theme_chain: 'pacing',
    theme_episodic: 'mode',
};

const EMPTY_LIBRARY: NarrativeLibrary = { arcs: [], episodic: [], isLoading: false };

// 入参契约
export interface UseGameStateParams {
    gameData: GameStateData;
    updaters: GameStateUpdaters;
    currentNodeId: string;
    addLog: (text: string, type: LogType) => void;
    spawnEnemy: (enemyTemplate?: EnemyTemplate, zoneId?: string) => void;
    narrativeFlowCallbacks?: {
        onComplete?: (config: StoryConfig, autoGenOptions?: { images?: boolean; videos?: boolean; audios?: boolean }) => void;
        onCancel?: () => void;
        onLoadLibrary?: (type: 'chain' | 'episodic', identifier: string) => void;
    };
}

// 出参契约
export interface UseGameStateReturn {
    handleGameTick: (timePassed?: number) => void;
    dyNarrative: string;
    setDyNarrative: (value: string | ((prev: string) => string)) => void;
    clearDyNarrative: () => void;
    currentNarrative: NarrativeState | null;
    narrativeAnalysis: ChainNarrative['analysis'] | null;
    currentDirectives: string[];
    updateNarrativeState: (playerState: PlayerState, currentNode: Node | null) => void;
    getNarrativeHealth: (playerState: PlayerState) => number;
    getCurrentNarrativePhase: () => NarrativePhase;
    resetNarrative: () => void;
    updatePlayerStateAndPlot: (newZone: Zone) => void;
    advanceExplorationStep: () => void;
    advanceCombatTurn: () => void;
    resetCombatTurn: () => void;
    getCurrentTime: () => CurrentTime;
    getTimeTuple: () => [RealDate, ZoneDate, number];
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
    triggerCompanionReactions: (eventName: string, context?: string) => Promise<void>;
    narrativeFlowStep: NarrativeFlowStep;
    narrativeFlowPendingConfig: Partial<StoryConfig>;
    narrativeFlowEpisodicTension: number;
    narrativeFlowEpisodicNodeCount: number;
    narrativeFlowHasSuspendedArc: boolean;
    setNarrativeFlowStep: React.Dispatch<React.SetStateAction<NarrativeFlowStep>>;
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
}

export const useGameState = ({
    gameData, updaters, currentNodeId, addLog,
    spawnEnemy, narrativeFlowCallbacks
}: UseGameStateParams): UseGameStateReturn => {

    // 核心状态单一事实来源收敛
    const currentZone = gameData.currentZone;
    const settings = gameData.settings;

    const { gameState, player } = gameData;
    const { setPlayer, setSettings, setGameState } = updaters;

    const initializedAudio = useRef(false);
    const settingsRef = useRef(settings);
    const narrativeCallbacksRef = useRef(narrativeFlowCallbacks);
    const playerRef = useRef(player);

    useEffect(() => { settingsRef.current = settings; }, [settings]);
    useEffect(() => { narrativeCallbacksRef.current = narrativeFlowCallbacks; }, [narrativeFlowCallbacks]);
    useEffect(() => { playerRef.current = player; }, [player]);

    const [dyNarrative, setDyNarrative] = useState('');
    const [narrativeFlowStep, setNarrativeFlowStep] = useState<NarrativeFlowStep>('mode');
    const [narrativeFlowPendingConfig, setNarrativeFlowPendingConfig] = useState<Partial<StoryConfig>>({});
    const [narrativeFlowEpisodicTension, setNarrativeFlowEpisodicTension] = useState(50);
    const [narrativeFlowEpisodicNodeCount, setNarrativeFlowEpisodicNodeCount] = useState(15);
    const [currentNarrative, setCurrentNarrative] = useState<NarrativeState | null>(null);
    const [narrativeLibrary, setNarrativeLibrary] = useState<NarrativeLibrary>(EMPTY_LIBRARY);

    const narrativeFlowHasSuspendedArc = player?.activeArc?.status === 'suspended';

    const clearDyNarrative = useCallback(() => setDyNarrative(''), []);

    const updateNarrativeState = useCallback((playerState: PlayerState, currentNode: Node | null) => {
        if (!currentNode || !playerState) return;
        setCurrentNarrative({
            config: playerState.activeArc?.config,
            analysis: ChainNarrativeService.analyzeChainNarrative(playerState),
            directives: [DynamicNarrativeService.generateDyDirectives(playerState)],
            dynamicFunction: DynamicNarrativeService.analyzeDynamicState(playerState)
        });
    }, []);

    const getNarrativeHealth = useCallback((ps: PlayerState) => ChainNarrativeService.getChainNarrativeHealth(ps), []);
    const getCurrentNarrativePhase = useCallback((): NarrativePhase => currentNarrative?.analysis?.params?.progress?.marco || 'setup', [currentNarrative]);
    const resetNarrative = useCallback(() => setCurrentNarrative(null), []);

    /**
     * 核心区域过载与伏笔求值逻辑
     * 解耦副作用与状态更新：在函数栈内构建并收敛 nextPlayer，在最终节点抛出副作用。
     */
    const updatePlayerStateAndPlot = useCallback((newZone: Zone) => {
        if (!newZone || !playerRef.current) return;

        if (newZone.id === playerRef.current.sanctuary?.id) {
            setGameState(GameState.SANCTUARY);
            return;
        }

        const { resolvedIds } = extractPlotPointsFromZone(newZone);

        const logsToQueue: { text: string, type: LogType }[] = [];
        const sfxToPlay: SfxType[] = [];

        let nextPlayer: PlayerState = { ...playerRef.current, exploredZones: playerRef.current.exploredZones + 1 };

        if (newZone.generatedPlotPoints?.length) {
            newZone.generatedPlotPoints.forEach(plot => {
                nextPlayer = ChainNarrativeService.addChainPlotPoint(nextPlayer, plot as PlotPoint);
            });
            logsToQueue.push({ text: `认知系统检测到 ${newZone.generatedPlotPoints.length} 条新的异常逻辑...`, type: "mental" });
            sfxToPlay.push('heartbeat');
        }

        if (resolvedIds?.length > 0) {
            let resolvedCount = 0;
            resolvedIds.forEach(id => {
                const hasUnresolved = nextPlayer.activeArc
                    ? nextPlayer.activeArc.plotPoints.flat().some(p => p.id === id && !p.isSolved)
                    : false;

                if (hasUnresolved) {
                    resolvedCount++;
                    nextPlayer = ChainNarrativeService.resolveChainPlotPoint(nextPlayer, id);
                }
            });

            if (resolvedCount > 0) {
                logsToQueue.push({ text: `时间线收束：${resolvedCount} 条伏笔得到了解答。`, type: "success" });
                sfxToPlay.push('success');
            }
        }

        const analysis = ChainNarrativeService.analyzeChainNarrative(nextPlayer);
        nextPlayer.narrative = analysis;
        if (nextPlayer.activeArc) {
            nextPlayer.activeArc.progress = Math.max(nextPlayer.activeArc.progress, analysis?.params?.progress?.micro || 0);
        }

        setPlayer(nextPlayer);

        // 状态装载完成后释放副作用池
        logsToQueue.forEach(log => addLog(log.text, log.type));
        sfxToPlay.forEach(sfx => safeAudioOperation(() => AudioService.playSfx(sfx), '音效播放失败'));

        setGameState(GameState.PLAYING);
        addLog(`已进入新区域: ${newZone.name}`, "event");
    }, [setPlayer, setGameState, addLog]);

    const advanceExplorationStep = useCallback(() => {
        if (!playerRef.current) return;
        const updatedPlayer = {
            ...playerRef.current,
            currentGameRound: {
                ...playerRef.current.currentGameRound,
                explorationStep: playerRef.current.currentGameRound.explorationStep + 1
            }
        };
        setPlayer(updatedPlayer);

        const currentNode = currentZone?.nodes?.[currentNodeId];
        if (currentNode) updateNarrativeState(updatedPlayer, currentNode);
    }, [setPlayer, currentZone, currentNodeId, updateNarrativeState]);

    /** 统一的回合更新器：advance 传 +1，reset 传 0 */
    const updateCombatTurn = useCallback((value: number) => {
        setPlayer(prev => ({
            ...prev,
            currentGameRound: { ...prev.currentGameRound, combatTurn: value }
        }));
    }, [setPlayer]);

    const advanceCombatTurn = useCallback(() => {
        if (playerRef.current) updateCombatTurn(playerRef.current.currentGameRound.combatTurn + 1);
    }, [updateCombatTurn]);

    const resetCombatTurn = useCallback(() => updateCombatTurn(0), [updateCombatTurn]);

    const getCurrentTime = useCallback((): CurrentTime => {
        if (!playerRef.current) return { currentRealTime: new Date(), currentZoneTime: { day: 0, cycle: 0, tick: 0 }, currentGameRound: { absoluteTick: 0, explorationStep: 0, combatTurn: 0 } };
        return {
            currentRealTime: playerRef.current.currentRealTime,
            currentZoneTime: playerRef.current.currentZoneTime,
            currentGameRound: playerRef.current.currentGameRound
        };
    }, []);

    const getTimeTuple = useCallback((): [RealDate, ZoneDate, number] => {
        if (!playerRef.current) return [new Date(), { day: 0, cycle: 0, tick: 0 }, 0];
        const { currentRealTime, currentZoneTime, currentGameRound } = playerRef.current;
        return [currentRealTime, currentZoneTime, currentGameRound.absoluteTick];
    }, []);

    const handleGameTick = useCallback((timePassed: number = 1) => {
        if (!playerRef.current) return;

        const { nextPlayer, isBatteryDepleted } = calculateNextTickState(
            playerRef.current, timePassed, gameState, true, currentZone
        );

        // 非战斗态自动重置 combatTurn
        const finalPlayer = gameState !== GameState.COMBAT && nextPlayer.currentGameRound.combatTurn !== 0
            ? { ...nextPlayer, currentGameRound: { ...nextPlayer.currentGameRound, combatTurn: 0 } }
            : nextPlayer;

        setPlayer(finalPlayer);

        if (isBatteryDepleted && finalPlayer.visualMode !== 'bio') {
            addLog("警告：神经连接仪电量耗尽。强制切换至生物视觉。", "warning");
            safeAudioOperation(() => AudioService.playSfx('die'), '音效播放失败');
            setPlayer((prev: PlayerState) => ({ ...prev, visualMode: 'bio' }));
        }

        if (gameState === GameState.SANCTUARY && Math.random() < 0.05) {
            const stability = Math.max(0, 100 - finalPlayer.currentGameRound.absoluteTick * 1.5);
            if (stability < 50 && Math.random() > stability / 100) {
                addLog("警告：现实锚点波动。庇护所遭到微弱的亚空间侵蚀...", "critical");
                safeAudioOperation(() => AudioService.playSfx('scare'), '音效播放失败');
                spawnEnemy();
            }
        }
    }, [gameState, addLog, setPlayer, setSettings, spawnEnemy, currentZone]);

    /** 音频状态同步：根据 gameState 和玩家精神值动态调整音频管线 */
    useEffect(() => {
        if (!initializedAudio.current && AudioService.isReady()) initializedAudio.current = true;
        if (!initializedAudio.current) return;

        safeAudioOperation(() => {
            AudioService.setMixParams({ ambienceVolume: gameState === GameState.DIALOGUE ? 0.3 : 0.6 });

            // 公共清理：非 PLAYING 状态统一清除恐慌效果
            const clearPanic = () => { AudioService.removePanicEffect(); AudioService.stopHeartbeat(); };

            if (gameState === GameState.COMBAT) {
                AudioService.setTheme('combat');
                clearPanic();
            } else if (gameState === GameState.SANCTUARY) {
                AudioService.setTheme('sanctuary');
                clearPanic();
            } else if (gameState === GameState.GAME_OVER) {
                AudioService.stopAmbience();
                AudioService.setTheme('death');
                AudioService.playSfx('die');
                clearPanic();
            } else if (gameState === GameState.PLAYING) {
                const node = currentZone?.nodes?.[currentNodeId];
                const dynamicState = playerRef.current?.dynamic;
                if (!node || !dynamicState) return;

                const sanity = dynamicState.sanity;
                const threat = node.threatLevel || 0;

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
                    AudioService.setTheme(threat > 70 ? 'horror' : 'exploration', threat / 100);
                }
            }
        }, '音频管线装载失败');
    }, [gameState, currentNodeId, currentZone?.id]);

    /** 玩家 HP 归零 → 游戏结束状态封锁 */
    useEffect(() => {
        const dynamicState = playerRef.current?.dynamic;
        if (!dynamicState) return;

        const { hp, deathReason } = dynamicState;
        if (gameState !== GameState.GAME_OVER && hp <= 0 && !deathReason) {
            setPlayer(p => ({ ...p, dynamic: { ...p.dynamic, deathReason: "肉体机能完全停止。" } }));
            setGameState(GameState.GAME_OVER);
            addLog("VITAL SIGNS: FLATLINE", "critical");
        }
    }, [gameState, setPlayer, setGameState, addLog]);

    /** 精神值低时的幻觉/破碎效果渲染循环 */
    useEffect(() => {
        if (gameState !== GameState.PLAYING) return;
        const timer = setInterval(() => {
            const dynamicState = playerRef.current?.dynamic;
            if (!dynamicState) return;

            const { sanity, hp, deathReason } = dynamicState;
            if (hp <= 0) return;

            if (sanity <= 0 && !deathReason) {
                if (Math.random() < 0.1) {
                    addLog("你的意识正在破碎...", "mental");
                    safeAudioOperation(() => AudioService.playSfx('glitch'), '音效播放失败');
                }
            } else if (sanity <= 60) {
                if (Math.random() < (60 - sanity) / 3000) {
                    addLog(HALLUCINATION_TEXTS[Math.floor(Math.random() * HALLUCINATION_TEXTS.length)], "hallucination");
                    safeAudioOperation(() => AudioService.playSfx('glitch'), '音效播放失败');
                }
            }
        }, 3000);
        return () => clearInterval(timer);
    }, [gameState, addLog]);

    const loadNarrativeLibrary = useCallback(async () => {
        setNarrativeLibrary(prev => ({ ...prev, isLoading: true }));
        try {
            const [arcsResult, episodicResult] = await Promise.all([
                PersistenceService.listNarrativeArcs(),
                PersistenceService.listEpisodicZones()
            ]);
            setNarrativeLibrary({
                arcs: arcsResult.success ? arcsResult.arcs : [],
                episodic: episodicResult.success ? episodicResult.zones : [],
                isLoading: false
            });
        } catch (error) {
            console.error('[叙事总线] 加载叙事库失败:', error);
            setNarrativeLibrary(prev => ({ ...prev, isLoading: false }));
        }
    }, []);

    /** 通用叙事库删除器 */
    const deleteFromLibrary = useCallback(async (
        deleter: (id: string) => Promise<{ success: boolean }>,
        id: string
    ): Promise<boolean> => {
        const result = await deleter(id);
        safeAudioOperation(() => AudioService.playSfx(result.success ? 'success' : 'error'), '音效播放失败');
        if (result.success) await loadNarrativeLibrary();
        return result.success;
    }, [loadNarrativeLibrary]);

    const deleteNarrativeArc = useCallback((arcId: string) => deleteFromLibrary(PersistenceService.deleteNarrativeArc, arcId), [deleteFromLibrary]);
    const deleteEpisodicZone = useCallback((zoneId: string) => deleteFromLibrary(PersistenceService.deleteEpisodicZone, zoneId), [deleteFromLibrary]);

    const narrativePreview = useMemo(() => {
        if (!player) return { activePlots: [], mainPlots: [], sidePlots: [], expectedPlotsText: '无' };

        const analysis = ChainNarrativeService.analyzeChainNarrative(player);
        const activePlots = player.activeArc?.plotPoints
            ? player.activeArc.plotPoints.flat().filter(p => !p.isSolved)
            : [];

        // 一次遍历分组
        const mainPlots: PlotPoint[] = [];
        const sidePlots: PlotPoint[] = [];
        for (const p of activePlots) (p.type === 'main' ? mainPlots : sidePlots).push(p);

        const gen = analysis?.output?.ppToGenerate;
        return {
            params: player.activeArc?.config,
            activePlots,
            mainPlots,
            sidePlots,
            expectedPlotsText: gen && (gen.m > 0 || gen.s > 0) ? `主线x${gen.m}, 支线x${gen.s}` : '无',
            analysis
        };
    }, [player]);

    const triggerCompanionReactions = useCallback(async (eventName: string, context?: string) => {
        const node = currentZone?.nodes?.[currentNodeId];
        const activeCompanions = playerRef.current?.companions?.filter(c => !c.dynamic?.deathReason);
        if (!node || !activeCompanions?.length || !playerRef.current) return;

        for (const comp of activeCompanions) {
            try {
                const reaction = await AiService.generateNPCReaction(
                    settingsRef.current,
                    comp,
                    playerRef.current.location.currentLocation,
                    eventName + (context ? ` (${context})` : '')
                );
                if (reaction.content) {
                    addLog(
                        reaction.isAction ? `${comp.static.name} ${reaction.content}` : `${comp.static.name}: "${reaction.content}"`,
                        reaction.isAction ? 'event' : 'info'
                    );
                }
            } catch (error) {
                console.warn(`[系统异常] 同伴 ${comp.static.name} 反应生成失败:`, error);
            }
        }
    }, [currentZone, currentNodeId, addLog]);

    const handleNarrativeFlowOpenLibrary = useCallback(() => setNarrativeFlowStep('library'), []);
    const handleNarrativeFlowLoadFromLibrary = useCallback((type: 'chain' | 'episodic', identifier: string) => {
        narrativeCallbacksRef.current?.onLoadLibrary?.(type, identifier);
    }, []);

    /** 通用步骤推进：更新 pendingConfig 的一个字段，然后跳转到下一步 */
    const flowAdvance = useCallback(<K extends keyof StoryConfig>(key: K, value: StoryConfig[K], nextStep: NarrativeFlowStep) => {
        setNarrativeFlowPendingConfig(prev => ({ ...prev, [key]: value }));
        setNarrativeFlowStep(nextStep);
    }, []);

    const handleNarrativeFlowModeConfirm = useCallback((mode: NarrativeMode) => {
        if (mode === 'chain' && !playerRef.current?.activeArc) {
            const newArc: StoryArc = {
                id: 'pending_pending_pending_0',
                config: {
                    mode: { id: 'chain', prompt: mode },
                    pacing: { id: 'balanced', prompt: 'balanced' },
                    theme: { id: 'none', prompt: '待选择' },
                    nodeCount: 8, tension: 0
                },
                plotPoints: [[], []],
                currentIndex: 0, progress: 0, status: 'ongoing',
                length: 0,
                hiddenAxis: { prevDesc: "", newDesc: "", isRevealed: false },
                startTime: {
                    real: new Date(),
                    zone: { ...(playerRef.current?.currentZoneTime || { day: 0, cycle: 0, tick: 0 }) },
                    tick: playerRef.current?.currentGameRound?.absoluteTick || 0
                }
            };
            setPlayer(p => ({ ...p, activeArc: newArc }));
        }
        flowAdvance('mode', { id: mode, prompt: mode }, mode === 'episodic' ? 'theme' : 'pacing');
    }, [setPlayer, flowAdvance]);

    const handleNarrativeFlowPacingConfirm = useCallback((pacing: NarrativePacing) => {
        flowAdvance('pacing', { id: pacing, prompt: pacing }, 'theme');
    }, [flowAdvance]);

    const handleNarrativeFlowThemeConfirm = useCallback((themeId: string) => {
        flowAdvance('theme', { id: themeId, prompt: themeId },
            narrativeFlowPendingConfig.mode?.id === 'episodic' ? 'details' : 'config');
    }, [flowAdvance, narrativeFlowPendingConfig.mode?.id]);

    const handleNarrativeFlowConfigConfirm = useCallback((configPart: { motif: string; mainAxis: string }) => {
        setNarrativeFlowPendingConfig(prev => ({
            ...prev,
            motif: configPart.motif ? { id: configPart.motif, prompt: configPart.motif } : undefined,
            mainAxis: configPart.mainAxis ? { id: configPart.mainAxis, prompt: configPart.mainAxis } : undefined
        }));
        setNarrativeFlowStep('preview');
    }, []);

    const handleNarrativeFlowDetailsConfirm = useCallback(() => setNarrativeFlowStep('preview'), []);

    const handleNarrativeFlowPreviewConfirm = useCallback(async (autoGenOptions?: { images?: boolean; videos?: boolean; audios?: boolean }) => {
        const isEpisodic = narrativeFlowPendingConfig.mode?.id === 'episodic';
        const payload: StoryConfig = {
            mode: narrativeFlowPendingConfig.mode || { id: 'chain', prompt: 'chain' },
            pacing: narrativeFlowPendingConfig.pacing || { id: 'balanced', prompt: 'balanced' },
            theme: narrativeFlowPendingConfig.theme || { id: 'none', prompt: '待选择' },
            nodeCount: isEpisodic ? narrativeFlowEpisodicNodeCount : 8,
            tension: isEpisodic ? narrativeFlowEpisodicTension : 0,
        };
        if (narrativeFlowPendingConfig.motif?.id) payload.motif = narrativeFlowPendingConfig.motif;
        if (narrativeFlowPendingConfig.mainAxis?.id) payload.mainAxis = narrativeFlowPendingConfig.mainAxis;

        setPlayer(p => {
            if (!p.activeArc) return p;
            const theme = payload.theme.id || 'none';
            const motif = payload.motif?.id || 'none';
            const mainAxis = payload.mainAxis?.id || 'none';
            const length = p.activeArc.length;
            return { ...p, activeArc: { ...p.activeArc, id: `${theme}_${motif}_${mainAxis}_${length}`, config: payload, status: 'ongoing' } };
        });

        setNarrativeFlowStep('closed');
        narrativeCallbacksRef.current?.onComplete?.(payload, autoGenOptions);
    }, [narrativeFlowPendingConfig, narrativeFlowEpisodicTension, narrativeFlowEpisodicNodeCount, setPlayer]);

    const handleNarrativeFlowBack = useCallback(() => {
        setNarrativeFlowStep(prev => {
            const modeSuffix = narrativeFlowPendingConfig.mode?.id === 'episodic' ? 'episodic' : 'chain';
            return FLOW_BACK_MAP[`${prev}_${modeSuffix}`] ?? FLOW_BACK_MAP[prev] ?? prev;
        });
    }, [narrativeFlowPendingConfig.mode?.id]);

    const handleNarrativeFlowCancel = useCallback(() => {
        setNarrativeFlowStep('closed');
        setNarrativeFlowPendingConfig({});
        setNarrativeFlowEpisodicTension(50);
        setNarrativeFlowEpisodicNodeCount(15);
        setPlayer(p => p.activeArc?.id === 'pending_pending_pending_0' ? { ...p, activeArc: undefined } : p);
        narrativeCallbacksRef.current?.onCancel?.();
    }, [setPlayer]);

    return {
        handleGameTick,
        dyNarrative,
        setDyNarrative,
        clearDyNarrative,
        currentNarrative,
        narrativeAnalysis: currentNarrative?.analysis || null,
        currentDirectives: currentNarrative?.directives || [],
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
        triggerCompanionReactions,
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
        handleNarrativeFlowCancel
    }
}