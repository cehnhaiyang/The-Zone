import { useCallback } from 'react';
import {
    Sanctuary, initializeZoneRuntime, GameState, PlayerState, Zone,
    ZoneGenerationContext, LogType, Exit
} from '../meta';
import { PersistenceService, AudioService } from '../services';

interface UseZoneTransitionParams {
    player: PlayerState;
    setCurrentZone: (value: Zone | ((prevState: Zone) => Zone)) => void;
    setCurrentNodeId: (value: string | ((prevState: string) => string)) => void;
    setPlayer: (value: PlayerState | ((prevState: PlayerState) => PlayerState)) => void;
    gameState: GameState;
    setGameState: (value: GameState | ((prevState: GameState) => GameState)) => void;
    addLog: (text: string, type: LogType) => void;
    updatePlayer: (sanityDelta: number, hpDelta: number) => void;
    triggerCompanionReactions: (eventName: string, context?: string) => void;
    setLoadingStatus: (status: string) => void;
    sanctuary: Sanctuary;
    currentZone: Zone;
    autoLoadAssets: (type: 'scene' | 'enemy' | 'npc', id: string) => Promise<any>;
    handleAsyncError: (error: any, context: string) => void;
    generateNewZone?: (params?: ZoneGenerationContext) => Promise<Zone | null>;
    handleAutoGeneration?: (zone: Zone, options?: { images?: boolean; videos?: boolean; audios?: boolean }) => Promise<Zone>;
    /**
     * 区域装载最终落地器（来自 useGameState.updatePlayerStateAndPlot）。
     * 负责 location 重定位、节点访问标记、伏笔注入/回收、叙事分析同步，
     * 以及"返回庇护所 → SANCTUARY 状态"这一关键分支。
     * 缺失时区域装载只更新 zone/nodeId，location 恒指旧区域且庇护所 UI 无法恢复。
     */
    updatePlayerStateAndPlot?: (zone: Zone, explicitChainIndex?: number) => void;
}

interface UseZoneTransitionReturn {
    proceedToNextZone: (useLocal: boolean, params?: ZoneGenerationContext, targetZoneId?: string, autoGenOptions?: { images?: boolean; videos?: boolean; audios?: boolean }) => Promise<void>;
}

export const useZoneTransition = ({
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
    updatePlayerStateAndPlot
}: UseZoneTransitionParams): UseZoneTransitionReturn => {

    /**
     * 处理向庇护所的传送逻辑
     */
    const handleSanctuaryTransition = useCallback(async (targetZoneId?: string) => {
        const isInitialTransition = !targetZoneId && player.currentGameRound.absoluteTick === 0 && gameState === GameState.LOADING;

        if (targetZoneId === sanctuary.id || isInitialTransition) {
            setLoadingStatus("LOADING_SANCTUARY...");
            // 克隆源使用 player.sanctuary（持久真相源）：运行时设施升级/库存/
            // 产区结算都写入 player.sanctuary，独立 sanctuary state 仅在
            // 进入庇护所瞬间同步，重进时用它克隆会丢运行时修改。
            const newZone = initializeZoneRuntime(JSON.parse(JSON.stringify(player.sanctuary)));

            addLog(`意识正在重新定位至 ${newZone?.name || 'Safe Zone'}...`, "info");
            updatePlayer(10, 10);
            triggerCompanionReactions("回到了庇护所 (安全区域)");
            return newZone;
        }
        return null;
    }, [player.currentGameRound.absoluteTick, player.sanctuary, gameState, sanctuary.id, setLoadingStatus, addLog, updatePlayer, triggerCompanionReactions]);

    /**
     * 处理从本地神经档案读取区域
     */
    const handleLocalZoneLoad = useCallback(async () => {
        if (!PersistenceService.isReady) {
            addLog("本地系统未就绪，无法访问神经档案。", "warning");
            return null;
        }

        setLoadingStatus("SCANNING_LOCAL_ARCHIVES...");
        addLog("正在读取本地神经档案...", "command");

        try {
            const loadedZone = await PersistenceService.loadRandomZone() as Zone;
            if (loadedZone) {
                const newZone = initializeZoneRuntime(loadedZone);
                addLog("本地档案加载成功。", "success");
                return newZone;
            }

            addLog("本地档案已损坏或不存在。启动应急生成协议..", "warning");
        } catch (error) {
            handleAsyncError(error, "本地档案加载");
        }
        return null;
    }, [setLoadingStatus, handleAsyncError, addLog]);

    /**
     * 主线流程：穿越帷幕，进入下一个区域
     */
    const proceedToNextZone = useCallback(async (useLocal: boolean, params?: ZoneGenerationContext, targetZoneId?: string, autoGenOptions?: { images?: boolean; videos?: boolean; audios?: boolean }) => {
        const previousGameState = gameState;

        // 检查是否处于链式叙事中
        const isInNarrative = player.activeArc?.config.mode.id === 'chain' && player.activeArc?.status === 'ongoing';

        if (isInNarrative && !targetZoneId) {
            // 检查当前区域的出口是否标记为结局
            const currentNode = currentZone?.nodes?.[player.location.currentLocation.node.id];
            const hasEndingExit = currentNode?.exits?.some((exit: Exit) =>
                exit.type === 'sanctuary_return' && exit.isEnding === true
            );

            if (!hasEndingExit && player.activeArc) {
                // 获取下一个章节索引
                const currentIndex = player.activeArc.currentIndex ?? 1;
                const maxIndex = (player.activeArc as any).maxZoneIndex as number | undefined;
                const nextIndex = currentIndex + 1;

                if (maxIndex && nextIndex <= maxIndex) {
                    addLog(`继续叙事链进程 [${nextIndex}/${maxIndex}]...`, "cinematic");
                    AudioService.playSfx('error');
                    setGameState(GameState.LOADING);
                    setLoadingStatus("LOADING_NEXT_CHAPTER...");

                    try {
                        const result = await PersistenceService.loadArcZone(player.activeArc.id, nextIndex);

                        if (result.success && result.data) {
                            let newZone = initializeZoneRuntime(result.data as Zone);

                            if (PersistenceService.isReady) {
                                setLoadingStatus("MOUNTING_LOCAL_ASSETS...");
                                const entranceId = newZone.entrance;
                                const assets = await autoLoadAssets('scene', entranceId);

                                if (assets.imageUrl || assets.videoUrl) {
                                    newZone = {
                                        ...newZone,
                                        nodes: {
                                            ...newZone.nodes,
                                            [entranceId]: {
                                                ...newZone.nodes[entranceId],
                                                ...(assets.imageUrl && { imageUrl: assets.imageUrl }),
                                                ...(assets.videoUrl && { videoUrl: assets.videoUrl })
                                            }
                                        }
                                    };
                                }
                            }

                            setLoadingStatus("INITIALIZING_LOCK_SYSTEM...");
                            newZone = initializeZoneRuntime(newZone) as Zone;

                            // 根据传入的自动生成选项决定是否生成资产
                            if (handleAutoGeneration && autoGenOptions && (autoGenOptions.images || autoGenOptions.videos || autoGenOptions.audios)) {
                                newZone = await handleAutoGeneration(newZone, autoGenOptions);
                            }

                            setLoadingStatus("FINALIZING_REALITY_MATRIX...");
                            if (updatePlayerStateAndPlot) {
                                updatePlayerStateAndPlot(newZone, result.currentIndex ?? nextIndex);
                            } else {
                                setCurrentZone(newZone);
                                setCurrentNodeId(newZone.entrance);
                                setGameState(GameState.PLAYING);
                            }
                            addLog(`已进入新区域: ${newZone.name}`, "event");

                            return;
                        } else {
                            throw new Error('加载下一章节失败');
                        }
                    } catch (error) {
                        handleAsyncError(error, "链式叙事章节切换");
                        setGameState(previousGameState);
                        return;
                    }
                } else {
                    addLog("叙事链已到达终点，但未找到结局标记。", "warning");
                }
            }
        }

        // 原有逻辑：非链式叙事或已标记为结局的出口
        addLog("正在穿过现实的帷幕..", "cinematic");
        AudioService.playSfx('error');
        setGameState(GameState.LOADING);
        setLoadingStatus("INITIALIZING_SEQUENCE...");

        try {
            let newZone = await handleSanctuaryTransition(targetZoneId);

            if (!newZone && useLocal) {
                newZone = await handleLocalZoneLoad();
                if (!newZone && generateNewZone) {
                    newZone = await generateNewZone(params);
                }
            } else if (!newZone && generateNewZone) {
                newZone = await generateNewZone(params);
            }

            if (newZone) {
                if (PersistenceService.isReady) {
                    setLoadingStatus("MOUNTING_LOCAL_ASSETS...");
                    const entranceId = newZone.entrance;
                    const assets = await autoLoadAssets('scene', entranceId);

                    if (assets.imageUrl || assets.videoUrl) {
                        newZone = {
                            ...newZone,
                            nodes: {
                                ...newZone.nodes,
                                [entranceId]: {
                                    ...newZone.nodes[entranceId],
                                    ...(assets.imageUrl && { imageUrl: assets.imageUrl }),
                                    ...(assets.videoUrl && { videoUrl: assets.videoUrl })
                                }
                            }
                        };
                    }
                }

                setLoadingStatus("INITIALIZING_LOCK_SYSTEM...");
                newZone = initializeZoneRuntime(newZone) as Zone;

                // 根据传入的自动生成选项决定是否生成资产
                if (handleAutoGeneration && autoGenOptions && (autoGenOptions.images || autoGenOptions.videos || autoGenOptions.audios)) {
                    newZone = await handleAutoGeneration(newZone, autoGenOptions);
                }

                setLoadingStatus("FINALIZING_REALITY_MATRIX...");
                if (updatePlayerStateAndPlot) {
                    updatePlayerStateAndPlot(newZone);
                } else {
                    setCurrentZone(newZone);
                    setCurrentNodeId(newZone.entrance);
                    setGameState(GameState.PLAYING);
                }
                addLog(`已进入新区域: ${newZone.name}`, "event");

            } else {
                addLog("核心系统未能建立稳定的空间相位。正在尝试紧急回滚...", "critical");
                const isPreviousLoadingOrMenu = previousGameState === GameState.LOADING || previousGameState === GameState.MAIN_MENU;
                setGameState(isPreviousLoadingOrMenu ? (player.currentGameRound.absoluteTick === 0 ? GameState.MAIN_MENU : GameState.PLAYING) : previousGameState);
            }
        } catch (error) {
            handleAsyncError(error, "区域切换序列");
            const isPreviousLoadingOrMenu = previousGameState === GameState.LOADING || previousGameState === GameState.MAIN_MENU;
            setGameState(isPreviousLoadingOrMenu ? (player.currentGameRound.absoluteTick === 0 ? GameState.MAIN_MENU : GameState.PLAYING) : previousGameState);
        }
    }, [
        gameState, player, currentZone, sanctuary,
        setGameState, setLoadingStatus, setCurrentZone, setCurrentNodeId, setPlayer,
        addLog, updatePlayer, triggerCompanionReactions,
        handleSanctuaryTransition, handleLocalZoneLoad, autoLoadAssets,
        generateNewZone, handleAutoGeneration, handleAsyncError
    ]);

    return { proceedToNextZone };
};