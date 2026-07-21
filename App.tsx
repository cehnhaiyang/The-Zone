import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense, lazy } from 'react';
import { GameState, Settings, VisorPanelType, PlayerState } from './meta';
import { useGame } from './hooks';
import { AudioService } from './services';
import { INITIAL_SETTINGS, MODEL_PROVIDER, MODEL_REGISTRY } from './constants';

// ==================== UI 组件导入 ====================
import NeuralVisor from './components/NeuralVisor';
import { LogPanel } from './components/LogPanel';

// 懒加载组件
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

        // 游戏操作
        initGame,
        handleAction,
        handleUseItem,
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
        handleOrganizeStorage,
        getStorageCapacity,
        getCustomRestConfig,
        handleUseMedicine,
        morale,
        isLowMorale,
        maxStorage,

        // 视觉效果
        visualEvents,
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

        // 卡牌战斗
        hand,
        drawPile,
        discardPile,
        energy,
        maxEnergy,
        handlePlayCard,
        handleEndTurn,
        // 弃牌逻辑
        discardRequired,
        handleManualDiscard
    } = useGame();

    // -------------------- 本地 UI 状态 --------------------
    const [showSettings, setShowSettings] = useState(false);
    const [showSanctuaryUI, setShowSanctuaryUI] = useState(true);
    const [activeVisorPanel, setActiveVisorPanel] = useState<VisorPanelType>('visual');
    const [isLogFullscreen, setIsLogFullscreen] = useState(false);
    const [isVisualFullscreen, setIsVisualFullscreen] = useState(false);

    // -------------------- Refs --------------------
    const loadingStartTimeRef = useRef<number | null>(null);

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

    /** 关闭过场 */
    const handleCutsceneComplete = useCallback(() => setShowCutscene(false), [setShowCutscene]);

    /** 返回主菜单 */
    const handleReturnToMenu = useCallback(() => setGameState(GameState.MAIN_MENU), [setGameState]);

    /** 生成 NPC 图像 */
    const handleGenerateNPCImage = useCallback(() => generateNewAsset('npc'), [generateNewAsset]);

    /** 生成敌人图像 */
    const handleGenerateEnemyImage = useCallback(() => generateNewAsset('enemy'), [generateNewAsset]);

    /** 切换媒体偏好（图片/视频） */
    const handleToggleMediaType = useCallback(() => {
        setSettings(prev => ({
            ...prev,
            preferredMediaType: prev.preferredMediaType === 'video' ? 'image' : 'video'
        }));
        AudioService.playSfx('click');
    }, [setSettings]);

    // -------------------- 副作用 --------------------

    // 将 settings 镜像到 window.globalSettings：ProxyService 的 fetch 拦截器在全局作用域运行，
    // 无法直接访问 React state，只能通过此全局引用读取反代开关与 ProxyBase。
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
                        type="loading"
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

                    {/* 战斗面板 */}
                    {gameState === GameState.COMBAT && currentEnemy && (
                        <div className="absolute inset-0 z-50">
                            <CombatPanel
                                enemy={currentEnemy as any}
                                player={player}
                                combatLog={combatLog}
                                onManualGen={handleGenerateEnemyImage}
                                isGenerating={isTaskGenerating('image', 'enemy', currentEnemy.static.id)}
                                visualEvents={visualEvents}
                                hand={hand}
                                drawPile={drawPile}
                                discardPile={discardPile}
                                energy={energy}
                                maxEnergy={maxEnergy}
                                onPlayCard={handlePlayCard}
                                onEndTurn={handleEndTurn}
                                discardRequired={discardRequired}
                                onManualDiscard={handleManualDiscard}
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
                        isGenerating={isGenerating}
                        isTaskGenerating={isTaskGenerating}
                        preferredMediaType={settings.preferredMediaType}
                        onManualGen={generateNewAsset}
                        onToggleMediaType={handleToggleMediaType}
                        logs={logs}
                        onAction={handleAction}
                        onUseItem={handleUseItem}
                        onDiscardItem={handleDiscardItem}
                        onInteractWithCompanion={handleInteractWithCompanion}
                        onOpenSettings={handleOpenSettings}
                        isSanctuary={gameState === GameState.SANCTUARY}
                        onToggleSanctuaryUI={handleToggleSanctuaryUI}
                        isCombat={gameState === GameState.COMBAT}
                        overrideImageUrl={gameState === GameState.COMBAT && currentEnemy ? currentEnemy.dynamic.imageUrl : null}
                        setNeuralNoise={setNeuralNoise}
                        onRandomSwitch={handleRandomSwitch}
                        hasMultipleVariants={async (mediaType) => await hasMultipleVariants(mediaType, 'scene')}
                        isVisualFullscreen={isVisualFullscreen}
                        setIsVisualFullscreen={setIsVisualFullscreen}
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
                                    onOrganizeStorage={handleOrganizeStorage}
                                    onDepart={handleDepartSanctuary}
                                    onClose={handleCloseSanctuaryUI}
                                    getStorageCapacity={getStorageCapacity}
                                    getCustomRestConfig={getCustomRestConfig}
                                    morale={morale}
                                    isLowMorale={isLowMorale}
                                    maxStorage={maxStorage}
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