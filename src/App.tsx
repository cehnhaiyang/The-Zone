import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense, lazy } from 'react';
import { GameState, Settings, VisorPanelType, PlayerState, AttributeType, SanctuaryEvent, SanctuaryEventChange } from './meta';
import { useGame } from './hooks';
import { AudioService, AiService } from './services';
import { INITIAL_SETTINGS, MODEL_PROVIDER } from './constants';

// ==================== UI 组件导入 ====================
import { LogPanel } from './components/LogPanel';

/** 庇护所每日事件触发概率（跨天时随机主动请求，替代纯手动触发）。 */
const SANCTUARY_DAILY_EVENT_CHANCE = 0.35;

// 懒加载组件
const NeuralVisor = lazy(() => import('./components/NeuralinkDevice'));

const CombatPanel = lazy(() => import('./components/CombatPanel'));
const SettingsPanel = lazy(() => import('./components/SettingsPanel'));
const OverlayPanel = lazy(() => import('./components/OverlayPanel'));
const PuzzlePanel = lazy(() => import('./components/PuzzlePanel'));
const NarrativePanel = lazy(() => import('./components/NarrativePanel'));
const SocializationPanel = lazy(() => import('./components/SocializationPanel'));
const SanctuaryPanel = lazy(() => import('./components/SanctuaryPanel'));

// ==================== 常量定义 ====================
const PANEL_ORDER: VisorPanelType[] = ['visual', 'Vital', 'inventory', 'archives'];

// ==================== 主组件 ====================
const App: React.FC = () => {
    // -------------------- 游戏状态 Hook --------------------
    const {
        // 设置与状态
        settings,
        setSettings,
        gameState,
        setGameState,
        player,
        setPlayer,
        currentZone,
        getCurrentNode,
        currentNodeId,
        currentEnemy,
        combatLog,
        pendingDefense,
        logs,
        loadingStatus,
        sanctuary, // 提取庇护所区域数据

        // 生成状态
        isGenerating,
        isTaskGenerating,

        // NPC 交互
        activeInteractionNPC,
        handleNPCChat,
        handleNPCRecruit,
        handleNPCGift,
        closeNPCInteraction,
        handleLocalNPCAction,
        handleNPCTakeItem,
        handleNPCIntimacy,
        handleMountProfile,
        handleUnmountCreateNewProfile,
        handleDeleteProfile,
        handleAcceptQuest,

        // 游戏操作
        initGame,
        handleAction,
        handleUseItem,
        handleEquipItem,
        handleDiscardItem,
        generateNewAsset,
        handleRandomSwitch,
        hasMultipleVariants,
        handleInteractWithCompanion,

        // 过场与选择
        showCutscene,
        setShowCutscene,
        showNarrative,
        handleNarrative,
        handleLoadLibrary,
        tempSearchVisualOverride,

        // 叙事库管理
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

        // 庇护所
        transferItem,
        handleRest,
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

        // 视觉效果
        setNeuralNoise,

        // 存档
        handleSaveGame,
        handleLoadGame,
        handleListSaves,
        handleDeleteSave,

        // 谜题
        activePuzzleNodeId,
        setActivePuzzleNodeId,
        getActivePuzzle,
        puzzleController,
        closePuzzle,

        // 战术战斗
        isPlayerPhase,
        isBusy,
        executeTactic,
        endPlayerPhase,
        enemies,
        enemyIntents,
        allies,
        activeAllyId,
        setActiveAllyId,
        getTacticsFor,
        canUseTactic,
        getVisibleResultSequence,
        positions,
        battleLineMin,
        battleLineMax,
        getUnitRange,
        moveAlly,
        counterPrompt,
        resolveCounterPrompt,
        counterSkip,
        setCounterSkip,
        insertAction,
        endInsertAction,

        // 角色成长
        levelUp,
        pendingTacticOptions,
        selectTactic,
    } = useGame();

    // -------------------- 本地 UI 状态 --------------------
    const [showSettings, setShowSettings] = useState(false);
    const [showSanctuaryUI, setShowSanctuaryUI] = useState(true);
    const [activeVisorPanel, setActiveVisorPanel] = useState<VisorPanelType>('visual');
    const [isLogFullscreen, setIsLogFullscreen] = useState(false);
    const [isVisualFullscreen, setIsVisualFullscreen] = useState(false);
    const [sanctuaryEvent, setSanctuaryEvent] = useState<SanctuaryEvent | null>(null);
    const [isGeneratingSanctuaryEvent, setIsGeneratingSanctuaryEvent] = useState(false);

    // -------------------- Refs --------------------
    const loadingStartTimeRef = useRef<number | null>(null);

    // -------------------- 庇护所事件 --------------------
    /** 请求生成一次庇护所日常事件（LLM）。 */
    const handleRequestSanctuaryEvent = useCallback(async () => {
        if (isGeneratingSanctuaryEvent) return;
        if (gameState !== GameState.SANCTUARY || !player.sanctuary) return;
        setIsGeneratingSanctuaryEvent(true);
        try {
            const event = await AiService.generateSanctuaryEvent(settings, {
                sanctuary: player.sanctuary,
                player,
                time: player.currentZoneTime,
            });
            if (event && event.desc) {
                setSanctuaryEvent(event);
            }
        } catch (error) {
            console.error('[SanctuaryEvent] 生成失败', error);
        } finally {
            setIsGeneratingSanctuaryEvent(false);
        }
    }, [
        isGeneratingSanctuaryEvent,
        gameState,
        settings,
        player,
        setSanctuaryEvent,
    ]);

    /** 玩家选择一个事件抉择后应用结果。 */
    const handleResolveSanctuaryEvent = useCallback(
        (choiceIndex: number) => {
            if (!sanctuaryEvent) return;
            const choice = sanctuaryEvent.choices[choiceIndex];
            if (!choice) return;
            const spawnedEnemy = handleSanctuaryEvent(choice.stateChange as unknown as SanctuaryEventChange);
            setSanctuaryEvent(null);
            if (spawnedEnemy) {
                // 事件引发敌人突袭：增强侵蚀并提示（实体遭遇交由探索/战斗系统接管）。
                console.warn('[SanctuaryEvent] 事件触发了敌人突袭');
            }
        },
        [sanctuaryEvent, handleSanctuaryEvent]
    );

    /** 让 LLM 裁决一次设施升级的废料消耗（服务失败时内部降级为引擎公式）。 */
    const handleFacilityUpgradePriced = useCallback(
        async (facilityId: string): Promise<number> => {
            const sanctuary = player.sanctuary;
            if (!sanctuary) return 20;
            return AiService.priceFacilityUpgrade(settings, {
                sanctuary,
                player,
                facilityId,
            });
        },
        [settings, player]
    );

    // ---------- 时间驱动庇护所事件 ----------
    // 事件不再依赖手动请求：只有在庇护所内真正跨天（day 推进）时才按概率随机触发一次生成，
    // 同日只判定一次，已有未决事件时不重复请求。
    // 关键约束：进入庇护所（主菜单进入 / 探索返回 / 读档）只登记当天基线，绝不立即触发事件。
    const lastSanctuaryEventDayRef = useRef<number | null>(null);
    const isInSanctuaryRef = useRef(false);

    useEffect(() => {
        const day = player.currentZoneTime?.day ?? null;

        // 不在庇护所：清空基线，下次进入重新登记（避免离开期间流逝的天数被结算成事件）
        if (gameState !== GameState.SANCTUARY || day == null) {
            isInSanctuaryRef.current = false;
            lastSanctuaryEventDayRef.current = null;
            return;
        }

        // 刚进入庇护所：仅登记当天为基线，不触发事件
        if (!isInSanctuaryRef.current) {
            isInSanctuaryRef.current = true;
            lastSanctuaryEventDayRef.current = day;
            return;
        }

        const lastDay = lastSanctuaryEventDayRef.current;
        if (lastDay == null || day <= lastDay) return;

        // 天数已推进：登记新的一天，再按概率判定（当天只判定一次）
        lastSanctuaryEventDayRef.current = day;
        if (sanctuaryEvent || isGeneratingSanctuaryEvent) return;
        if (Math.random() < SANCTUARY_DAILY_EVENT_CHANCE) {
            void handleRequestSanctuaryEvent();
        }
    }, [
        gameState,
        player.currentZoneTime?.day,
        sanctuaryEvent,
        isGeneratingSanctuaryEvent,
        handleRequestSanctuaryEvent,
    ]);

    // -------------------- Effects --------------------
    // 确保当显示叙事面板时，流程状态被正确重置
    useEffect(() => {
        if (showNarrative && narrativeFlowStep === 'closed') {
            setNarrativeFlowStep('mode');
        }
    }, [showNarrative, narrativeFlowStep, setNarrativeFlowStep]);

    // -------------------- 派生状态 --------------------
    // 使用 useMemo 缓存 getCurrentNode 的返回值，避免每次渲染产生新对象引用
    const currentNode = useMemo(() => getCurrentNode(), [getCurrentNode]);
    const currentViewMode = tempSearchVisualOverride ? 'bio' : (player.visualMode ?? 'camera');
    const sanityClass = useMemo(() => {
        if (player.dynamic.sanity < 20) return 'sanity-critical';
        if (player.dynamic.sanity < 50) return 'sanity-low';
        return '';
    }, [player.dynamic.sanity]);

    // -------------------- 回调函数 --------------------
    /** 切换视觉模式 */
    const handleToggleVisualMode = useCallback(() => {
        setPlayer((prev: PlayerState) => ({
            ...prev,
            visualMode: (prev.visualMode ?? 'camera') === 'camera' ? 'bio' : 'camera',
        }));
    }, [setPlayer]);

    /** 关闭设置面板 */
    const handleCloseSettings = useCallback(() => setShowSettings(false), []);

    /** 打开设置面板 */
    const handleOpenSettings = useCallback(() => setShowSettings(true), []);

    /** 切换庇护所 UI */
    const handleToggleSanctuaryUI = useCallback(() => setShowSanctuaryUI((prev) => !prev), []);

    /** 关闭庇护所 UI */
    const handleCloseSanctuaryUI = useCallback(() => setShowSanctuaryUI(false), []);

    /** 离开庇护所 */
    const handleDepartSanctuary = useCallback(() => handleAction('move_zone', 'OUTSIDE'), [handleAction]);

    /** 角色升级 */
    const handleLevelUp = useCallback((targetId: string, attr: string) => {
        levelUp(targetId, attr as AttributeType);
    }, [levelUp]);

    /** 关闭过场 */
    const handleCutsceneComplete = useCallback(() => setShowCutscene(false), [setShowCutscene]);

    /** 返回主菜单 */
    const handleReturnToMenu = useCallback(() => setGameState(GameState.MAIN_MENU), [setGameState]);

    /** 生成 NPC 图像 */
    const handleGenerateNPCImage = useCallback(() => generateNewAsset('npc'), [generateNewAsset]);

    /**
     * 生成敌人肖像。
     * 入参 enemyAssetId 为「敌人模板 id」：资产按模板归档为 enemy/<templateId>/N.png，
     * 同型敌人的多次出现复用同一份立绘（传实例 id 会按实例散落成无法复用的目录）。
     * 强制 image：肖像位是 <img>，若沿用 settings.preferredMediaType 可能产出视频路径，
     * 会被写进 imageUrl 导致 `<img>` 无法渲染（表现为「点完没反应」）。
     */
    const handleGenerateEnemyImage = useCallback((enemyAssetId?: string) =>
        generateNewAsset('enemy', 'image', enemyAssetId),
        [generateNewAsset]);

    /** 在敌人已有肖像变体间随机切换（与玩家 / NPC 肖像页一致，读取同一模板目录）。 */
    const handleRandomSwitchEnemyImage = useCallback(
        (enemyAssetId: string, currentUrl?: string) =>
            handleRandomSwitch('image', 'enemy', enemyAssetId, currentUrl),
        [handleRandomSwitch]);

    /** 切换媒体偏好（图片/视频） */
    const handleToggleMediaType = useCallback(() => {
        setSettings(prev => ({
            ...prev,
            preferredMediaType: prev.preferredMediaType === 'video' ? 'image' : 'video'
        }));
        AudioService.playSfx('ui_click');
    }, [setSettings]);

    // -------------------- 副作用 --------------------

    // 将 settings 镜像到 window.globalSettings：ProxyService 的 fetch 拦截器在全局作用域运行，
    // 无法直接访问 React state，只能通过此全局引用读取反代开关与 ProxyBase（唯一数据源）。
    useEffect(() => {
        (window as any).globalSettings = settings;
    }, [settings]);

    // Apply brightness
    useEffect(() => {
        document.body.style.filter = `brightness(${settings.screenBrightness}%)`;
    }, [settings.screenBrightness]);

    /** 全局键盘事件处理 */
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 忽略输入框内的按键
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            // ESC 键处理（优先级：视觉全屏 > NPC对话 > 谜题 > 设置面板）
            if (e.key === 'Escape') {
                e.preventDefault();
                if (isVisualFullscreen) {
                    setIsVisualFullscreen(false);
                } else if (activeInteractionNPC) {
                    closeNPCInteraction();
                } else if (activePuzzleNodeId) {
                    setActivePuzzleNodeId(null);
                } else {
                    setShowSettings((prev) => !prev);
                }
                return;
            }

            // Tab 键切换面板（仅在游戏中且设置面板未打开时）
            if (e.key === 'Tab' && !showSettings && (gameState === GameState.PLAYING || gameState === GameState.SANCTUARY)) {
                e.preventDefault();
                const currentIndex = PANEL_ORDER.indexOf(activeVisorPanel);
                const nextIndex = (currentIndex + 1) % PANEL_ORDER.length;
                setActiveVisorPanel(PANEL_ORDER[nextIndex]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        showSettings,
        gameState,
        activeVisorPanel,
        activeInteractionNPC,
        activePuzzleNodeId,
        closeNPCInteraction,
        setActivePuzzleNodeId,
        isVisualFullscreen,
    ]);

    /** 进入庇护所时显示 UI */
    useEffect(() => {
        if (gameState === GameState.SANCTUARY) setShowSanctuaryUI(true);
    }, [gameState]);

    /** 进入战斗时切换到相机模式 */
    useEffect(() => {
        if (gameState === GameState.COMBAT) {
            setSettings((prev: Settings) => ({ ...prev, visualMode: 'camera' }));
        }
    }, [gameState, setSettings]);

    /** 追踪加载开始时间 */
    useEffect(() => {
        if (gameState === GameState.LOADING && !loadingStartTimeRef.current) {
            loadingStartTimeRef.current = Date.now();
        } else if (gameState !== GameState.LOADING) {
            loadingStartTimeRef.current = null;
        }
    }, [gameState]);

    // 加载初始设置 - 智能合并逻辑
    useEffect(() => {
        try {
            const savedConfigStr = localStorage.getItem("THE_ZONE_CONFIG");
            if (savedConfigStr) {
                const savedConfig = JSON.parse(savedConfigStr);

                // 智能合并：如果本地存储的 Key 为空，但初始配置（硬编码）有值，则保留初始配置。
                // 这允许开发者在 config.ts 中硬编码 Key 而不受旧缓存影响。
                // 遍历 MODEL_PROVIDER 泛化回填，新增服务商自动覆盖。
                const mergedSettings = { ...INITIAL_SETTINGS, ...savedConfig };
                for (const provider of MODEL_PROVIDER) {
                    const keyField = provider.keyField as keyof typeof INITIAL_SETTINGS;
                    if (keyField && !(savedConfig as any)[keyField]?.length && (INITIAL_SETTINGS as any)[keyField]?.length) {
                        (mergedSettings as any)[keyField] = (INITIAL_SETTINGS as any)[keyField];
                    }
                }
                setSettings(mergedSettings);
                console.log("Loaded config from LocalStorage (with hardcoded fallback).");
            }
        } catch (e) {
            console.error("Failed to load settings:", e);
        }
    }, [setSettings]);

    // -------------------- 渲染：特殊状态 --------------------
    // 主菜单
    if (gameState === GameState.MAIN_MENU) {
        return (
            <>
                {showSettings && (
                    <Suspense fallback={null}>
                        <SettingsPanel
                            settings={settings}
                            onUpdate={setSettings}
                            onClose={handleCloseSettings}
                            isFullscreen={true}
                            onSaveGame={handleSaveGame}
                            onLoadGame={handleLoadGame}
                            onListSaves={handleListSaves}
                            onDeleteSave={handleDeleteSave}
                        />
                    </Suspense>
                )}
                <Suspense fallback={null}>
                    <OverlayPanel
                        type="menu"
                        onOpenSettings={handleOpenSettings}
                        onInitGame={initGame}
                    />
                </Suspense>
            </>
        );
    }

    // 游戏结束
    if (gameState === GameState.GAME_OVER) {
        return (
            <Suspense fallback={null}>
                <OverlayPanel type="gameover" deathReason={(player as any).deathReason} onReset={handleReturnToMenu} />
            </Suspense>
        );
    }

    return (
        <div className={`flex flex-col h-full w-full max-w-[2400px] mx-auto bg-zinc-900 relative z-10 overflow-hidden ${sanityClass}`}>
            {/* 加载中状态 (作为最高层遮罩，遮挡正在后台渲染的主界面) */}
            {gameState === GameState.LOADING && (
                <Suspense fallback={null}>
                    <OverlayPanel
                        type="zone_gen"
                        status={loadingStatus}
                        modelName={settings.zoneModel.model}
                        startTime={loadingStartTimeRef.current || Date.now()}
                    />
                </Suspense>
            )}

            {/* 主界面（在加载中时保持半透明显示日志，不遮挡操作但允许看到生成进度） */}
            <div className={`absolute inset-0 flex flex-col transition-opacity duration-500 ease-in-out ${gameState === GameState.LOADING ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                <Suspense fallback={null}>
                    {/* 设置面板 */}
                    {showSettings && (
                        <SettingsPanel
                            settings={settings}
                            onUpdate={setSettings}
                            onClose={handleCloseSettings}
                            isFullscreen={true}
                            onSaveGame={handleSaveGame}
                            onLoadGame={handleLoadGame}
                            onListSaves={handleListSaves}
                            onDeleteSave={handleDeleteSave}
                        />
                    )}

                    {/* 叙事面板流程 */}
                    {showNarrative && (
                        <NarrativePanel
                            player={player}
                            narrativeLibrary={narrativeLibrary}
                            loadNarrativeLibrary={loadNarrativeLibrary}
                            deleteNarrativeArc={deleteNarrativeArc}
                            deleteEpisodicZone={deleteEpisodicZone}
                            narrativePreview={narrativePreview}
                            onComplete={handleNarrative}
                            onCancel={() => { }}
                            onLoadLibrary={handleLoadLibrary}
                            // 叙事流程状态
                            narrativeFlowStep={narrativeFlowStep}
                            narrativeFlowPendingConfig={narrativeFlowPendingConfig}
                            narrativeFlowEpisodicTension={narrativeFlowEpisodicTension}
                            narrativeFlowEpisodicNodeCount={narrativeFlowEpisodicNodeCount}
                            narrativeFlowHasSuspendedArc={narrativeFlowHasSuspendedArc}
                            // 叙事流程状态设置器
                            setNarrativeFlowStep={setNarrativeFlowStep}
                            setNarrativeFlowEpisodicTension={setNarrativeFlowEpisodicTension}
                            setNarrativeFlowEpisodicNodeCount={setNarrativeFlowEpisodicNodeCount}
                            setNarrativeFlowPendingConfig={setNarrativeFlowPendingConfig}
                            // 叙事流程处理函数
                            handleNarrativeFlowOpenLibrary={handleNarrativeFlowOpenLibrary}
                            handleNarrativeFlowLoadFromLibrary={handleNarrativeFlowLoadFromLibrary}
                            handleNarrativeFlowModeConfirm={handleNarrativeFlowModeConfirm}
                            handleNarrativeFlowPacingConfirm={handleNarrativeFlowPacingConfirm}
                            handleNarrativeFlowThemeConfirm={handleNarrativeFlowThemeConfirm}
                            handleNarrativeFlowConfigConfirm={handleNarrativeFlowConfigConfirm}
                            handleNarrativeFlowDetailsConfirm={handleNarrativeFlowDetailsConfirm}
                            handleNarrativeFlowPreviewConfirm={handleNarrativeFlowPreviewConfirm}
                            handleNarrativeFlowBack={handleNarrativeFlowBack}
                            handleNarrativeFlowCancel={handleNarrativeFlowCancel}
                        />
                    )}

                    {/* 过场动画 */}
                    {showCutscene && currentNode && <OverlayPanel type="cutscene" node={currentNode} nodeId={currentNodeId} onCutsceneComplete={handleCutsceneComplete} />}

                    {/* NPC 对话面板 */}
                    {activeInteractionNPC && (
                        <SocializationPanel
                            npc={activeInteractionNPC}
                            player={player}
                            onSendMessage={handleNPCChat}
                            onRecruit={handleNPCRecruit}
                            onGift={handleNPCGift}
                            onClose={closeNPCInteraction}
                            isGenerating={isTaskGenerating('image', 'npc', activeInteractionNPC.static.id)}
                            isRecruited={player.companions.some((c) => c.static.id === activeInteractionNPC.static.id)}
                            onLocalAction={handleLocalNPCAction}
                            onTakeItem={handleNPCTakeItem}
                            onIntimacy={handleNPCIntimacy}
                            onGenerateNpcImage={handleGenerateNPCImage}
                            onRandomSwitchNpcImage={async () => {
                                return await handleRandomSwitch('image', 'npc', activeInteractionNPC.static.id, activeInteractionNPC.dynamic.imageUrl);
                            }}
                            hasMultipleNpcVariants={async () => await hasMultipleVariants('image', 'npc', activeInteractionNPC.static.id)}
                            onMountProfile={handleMountProfile}
                            onUnmountCreateNewProfile={handleUnmountCreateNewProfile}
                            onDeleteProfile={handleDeleteProfile}
                            onAcceptQuest={handleAcceptQuest}
                        />
                    )}

                    {/* 谜题面板 */}
                    {activePuzzleNodeId && getActivePuzzle() && (
                        <div className="absolute inset-0 z-[100] flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 bg-[#030305]" />
                            <div className="absolute inset-0 pointer-events-none overlay-scanlines" />
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.6)_100%)] pointer-events-none" />
                            <div className="relative z-10">
                                <PuzzlePanel
                                    puzzle={getActivePuzzle()!}
                                    onClose={closePuzzle}
                                    controller={puzzleController}
                                />
                            </div>
                        </div>
                    )}

                    {/* 战斗面板。门槛放宽到 currentEnemy || enemies[0]：
                    进入战斗首帧 currentEnemy 由 effect 在渲染后写入，否则面板闪烁缺失。 */}
                    {gameState === GameState.COMBAT && (currentEnemy || enemies[0]) && (
                        <div className="absolute inset-0 z-50">
                            <CombatPanel
                                enemies={enemies}
                                enemyIntents={enemyIntents}
                                allies={allies}
                                activeAllyId={activeAllyId}
                                setActiveAllyId={setActiveAllyId}
                                isPlayerPhase={isPlayerPhase}
                                isBusy={isBusy}
                                getTacticsFor={getTacticsFor}
                                canUseTactic={canUseTactic}
                                executeTactic={executeTactic}
                                endPlayerPhase={endPlayerPhase}
                                getVisibleResultSequence={getVisibleResultSequence}
                                pendingDefense={pendingDefense}
                                positions={positions}
                                battleLineMin={battleLineMin}
                                battleLineMax={battleLineMax}
                                getUnitRange={getUnitRange}
                                onMoveAlly={moveAlly}
                                counterPrompt={counterPrompt}
                                onResolveCounterPrompt={resolveCounterPrompt}
                                counterSkip={counterSkip}
                                onToggleCounterSkip={setCounterSkip}
                                insertAction={insertAction}
                                onEndInsertAction={endInsertAction}
                                onGenerateEnemyVisual={handleGenerateEnemyImage}
                                onRandomSwitchEnemyVisual={handleRandomSwitchEnemyImage}
                                isEnemyVisualGenerating={(enemyAssetId) => isTaskGenerating('image', 'enemy', enemyAssetId)}
                            />
                        </div>
                    )}
                </Suspense>

                {/* 日志面板 */}
                <LogPanel
                    logs={logs}
                    isFullscreen={false}
                    isLogFullscreen={isLogFullscreen}
                    setIsLogFullscreen={setIsLogFullscreen}
                    sanity={player.dynamic.sanity}
                />

                {/* 主视觉区域 */}
                <div className="flex-1 overflow-hidden relative">
                    <NeuralVisor
                        activePanel={activeVisorPanel}
                        onPanelChange={setActiveVisorPanel}
                        player={player}
                        currentNodeId={currentNodeId}
                        viewMode={currentViewMode}
                        onToggleMode={handleToggleVisualMode}
                        currentZone={currentZone}
                        currentNode={currentNode}
                        isTaskGenerating={isTaskGenerating}
                        onManualGen={generateNewAsset}
                        onToggleMediaType={handleToggleMediaType}
                        logs={logs}
                        onAction={(action, payload) => handleAction(action as any, payload as string)}
                        onUseItem={(instanceId) => {
                            const eq = player.dynamic.equipment;
                            const item = player.dynamic.inventory.find(i => i.instanceId === instanceId) ||
                                eq.weapons?.find(i => i?.instanceId === instanceId) ||
                                eq.armors?.find(i => i?.instanceId === instanceId) ||
                                eq.accessories?.find(i => i?.instanceId === instanceId);
                            if (item) handleUseItem(item as any);
                        }}
                        // 卸下专线：绕过"物品作为交互钥匙"的优先判定，直达装备结算
                        onUnequipItem={(instanceId) => {
                            const eq = player.dynamic.equipment;
                            const item = eq.weapons?.find(i => i?.instanceId === instanceId) ||
                                eq.armors?.find(i => i?.instanceId === instanceId) ||
                                eq.accessories?.find(i => i?.instanceId === instanceId) ||
                                player.dynamic.inventory.find(i => i.instanceId === instanceId);
                            if (item) handleEquipItem(item as any);
                        }}
                        onDiscardItem={(instanceId) => {
                            const item = player.dynamic.inventory.find(i => i.instanceId === instanceId);
                            if (item) handleDiscardItem(item);
                        }}
                        onInteractWithCompanion={(id) => {
                            const npc = player.companions.find(c => c.static.id === id);
                            if (npc) handleInteractWithCompanion(npc);
                        }}
                        onOpenSettings={handleOpenSettings}
                        isSanctuary={gameState === GameState.SANCTUARY}
                        onToggleSanctuaryUI={handleToggleSanctuaryUI}
                        isCombat={gameState === GameState.COMBAT}
                        overrideImageUrl={gameState === GameState.COMBAT && currentEnemy ? currentEnemy.imageUrl : undefined}
                        setNeuralNoise={setNeuralNoise}
                        onRandomSwitch={handleRandomSwitch}
                        hasMultipleVariants={hasMultipleVariants}
                        isVisualFullscreen={isVisualFullscreen}
                        setIsVisualFullscreen={setIsVisualFullscreen}
                        onLevelUp={handleLevelUp}
                        pendingTacticOptions={pendingTacticOptions}
                        onSelectTactic={selectTactic}
                        settings={settings}
                    />

                    {/* 庇护所面板 */}
                    {gameState === GameState.SANCTUARY && showSanctuaryUI && (
                        <div className="absolute inset-0 z-50">
                            <Suspense fallback={null}>
                                <SanctuaryPanel
                                    player={player}
                                    sanctuary={(player.sanctuary && player.sanctuary.id !== "empty_zone") ? player.sanctuary : sanctuary}
                                    onRest={handleRest}
                                    onUseMedicine={handleUseMedicine}
                                    onTransferItem={(item, target) => transferItem(item, target === 'storage')}
                                    onDepart={handleDepartSanctuary}
                                    onClose={handleCloseSanctuaryUI}
                                    getStorageCapacity={getStorageCapacity}
                                    getCustomRestConfig={getCustomRestConfig}
                                    morale={morale}
                                    isLowMorale={isLowMorale}
                                    maxStorage={maxStorage}
                                    facilities={facilities}
                                    dailyProduction={dailyProduction}
                                    residents={residents}
                                    onFacilityUpgrade={handleFacilityUpgrade}
                                    onFacilityUpgradePriced={handleFacilityUpgradePriced}
                                    sanctuaryEvent={sanctuaryEvent}
                                    isGeneratingEvent={isGeneratingSanctuaryEvent}
                                    onRequestEvent={handleRequestSanctuaryEvent}
                                    onResolveEvent={handleResolveSanctuaryEvent}
                                />
                            </Suspense>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;