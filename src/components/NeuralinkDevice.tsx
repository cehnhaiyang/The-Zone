/**
 * NeuralinkDevice —— 神经链接仪
 *
 * 玩家感知、UI 信息层与 AI 噪声注入的核心媒介。
 * 职责：
 * - 承载底层视觉画面（VisualPanel）与四个 HUD 功能面板的路由遮罩
 * - 以 CSS 变量驱动故障（glitch）特效，规避高频 setState 重渲染
 * - 暴露左边缘可滑入的页签导航（V / S / I / D 热键）
 *
 * 契约说明：
 * - 媒体类型统一使用 type.ts 的 AssetType，不再维护本地同义类型
 * - 媒体偏好读取 Settings.preferredMediaType（单一事实源）
 * - 理智临界阈值读取 gameConfig.social.vitals.sanityCritical
 * - 生成状态查询 isTaskGenerating 为必填，按 (媒体, 目标, ID) 精确路由
 *
 * @version 3.0.0
 */
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import {
  VisorPanelType,
  VisualMode,
  AssetType,
  Log,
  PlayerState,
  Settings,
  Zone,
  Node as GameNode,
  clamp,
  getPercent,
  Tactic,
  ItemInstance,
  Entity,
  NpcTemplate,
  NpcDynamicState,
} from '../meta';
import { AudioService } from '../services';
import VisualPanel from './VisualPanel';
import StatusPanel from './StatusPanel';
import InventoryPanel from './InventoryPanel';
import ArchivesPanel from './ArchivesPanel';

// =====================
// 1. 类型定义
// =====================

/** 媒体生成目标。决定生成任务挂载到哪一类资产上。 */
export type NeuralinkGenTarget =
  | 'scene'
  | 'enemy'
  | 'npc'
  | 'player';

/** 页签配置。label 首字母即渲染字符，与 hotkey 保持一致。 */
interface PanelTabConfig {
  id: VisorPanelType;
  label: string;
  hotkey: string;
  available: boolean;
}

export interface NeuralinkDeviceProps {
  // ---- 面板路由 ----
  activePanel: VisorPanelType;
  onPanelChange: (panel: VisorPanelType) => void;

  // ---- 核心状态 ----
  currentNodeId: string;
  player: PlayerState;
  settings: Settings;
  currentZone?: Zone | null;
  currentNode?: GameNode | null;

  // ---- 视觉模式 ----
  viewMode?: VisualMode;
  onToggleMode?: () => void;
  onToggleMediaType?: () => void;

  // ---- 媒体生成任务 ----
  /** 精确查询某目标是否正在生成。必填。 */
  isTaskGenerating: (
    mediaType: AssetType,
    targetType: NeuralinkGenTarget,
    targetId: string,
  ) => boolean;
  onManualGen: (
    targetType: NeuralinkGenTarget,
    mediaType?: AssetType,
  ) => void;
  onRandomSwitch?: (
    mediaType: AssetType,
    targetType: NeuralinkGenTarget,
    targetId: string,
    currentUrl?: string,
  ) => Promise<string | null> | string | null;
  hasMultipleVariants?: (
    mediaType: AssetType,
    targetType: NeuralinkGenTarget,
    targetId: string,
  ) => Promise<boolean> | boolean;

  // ---- 日志与行动 ----
  logs?: Log[];
  onAction?: (action: string, payload?: unknown) => void;

  // ---- 物品 / 同伴交互 ----
  onUseItem?: (instanceId: string) => void;
  onDiscardItem?: (instanceId: string) => void;
  /**
   * 卸下已装备物品。
   *
   * 与 onUseItem 分开：使用物品会先被"当前节点交互的钥匙判定"截获
   * （物品 ID 命中 requirements.items 时不会执行装备动作），
   * 卸下必须走独立的装备结算通道。
   */
  onUnequipItem?: (instanceId: string) => void;
  onInteractWithCompanion?: (companionId: string, payload?: unknown) => void;

  // ---- 场景模式 ----
  isSanctuary?: boolean;
  onToggleSanctuaryUI?: () => void;
  isCombat?: boolean;
  overrideImageUrl?: string;
  onOpenSettings?: () => void;

  // ---- 神经噪声 / 全屏 ----
  setNeuralNoise?: (level: number) => void;
  isVisualFullscreen?: boolean;
  setIsVisualFullscreen?: (fullscreen: boolean) => void;

  // ---- 成长与战术 ----
  onLevelUp?: (targetId: string, attr: string) => void;
  /** 升级后待选战术。非 null 时展示战术选择界面。 */
  pendingTacticOptions?: Tactic[] | null;
  /** 确认选择战术，传入战术 ID。 */
  onSelectTactic?: (tacticId: string) => void;
}

// =====================
// 2. 内部子组件：VisorFrame
// =====================

interface VisorFrameProps {
  /** 设备是否处于危急状态（低完整 / 低电量 / 低理智）。 */
  critical: boolean;
  children: React.ReactNode;
}

const VisorFrame = React.memo<VisorFrameProps>(({ critical, children }) => (
  <div className="relative w-full h-full flex flex-col bg-transparent">
    {/* 主内容区域 */}
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {children}
    </div>

    {/* 扫描线效果 */}
    <div className="absolute inset-0 pointer-events-none z-20 visor-scanlines opacity-15" />

    {/*
      故障效果：
      通过容器注入的 CSS 变量 --glitch-intensity 控制透明度，
      避免 200ms 高频随机值触发 React 重渲染。
    */}
    <div
      className="absolute inset-0 pointer-events-none z-[25] visor-glitch"
      style={{ opacity: 'calc(var(--glitch-intensity, 0) * 0.4)' }}
    />

    {/* 边缘渐变 */}
    <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.25)_100%)]" />

    {/* 危急状态边框 */}
    {critical && (
      <div className="absolute inset-0 pointer-events-none z-30 border border-red-500/20 animate-pulse" />
    )}
  </div>
));
VisorFrame.displayName = 'VisorFrame';

// =====================
// 3. 内部子组件：VisorTabs
// =====================

interface VisorTabsProps {
  tabs: PanelTabConfig[];
  activeTab: VisorPanelType;
  onTabChange: (tab: VisorPanelType) => void;
  vertical?: boolean;
}

const VisorTabs = React.memo<VisorTabsProps>(({
  tabs,
  activeTab,
  onTabChange,
  vertical = false,
}) => (
  <div
    className={`
      flex bg-transparent pointer-events-auto
      ${vertical ? 'flex-col gap-2' : 'items-center justify-center gap-8'}
    `}
  >
    {tabs.map((tab) => {
      const isActive = activeTab === tab.id;
      const isAvailable = tab.available;

      return (
        <button
          key={tab.id}
          type="button"
          title={`${tab.label} [${tab.hotkey}]`}
          aria-label={tab.label}
          aria-pressed={isActive}
          disabled={!isAvailable}
          onClick={() => {
            if (!isAvailable) return;
            onTabChange(tab.id);
          }}
          className={`
            relative w-10 h-10 flex items-center justify-center rounded-full
            text-lg font-mono font-bold transition-all duration-300
            focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/60
            group
            ${isActive
              ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] scale-110'
              : isAvailable
                ? 'text-gray-600 hover:text-cyan-200 hover:scale-105'
                : 'text-gray-800 cursor-not-allowed opacity-50'
            }
          `}
        >
          {/* 极简文字：首字母即热键 */}
          <span className="relative z-10">
            {tab.label.charAt(0)}
          </span>

          {/* 激活时的光点 */}
          {isActive && (
            <div
              className={`
                absolute w-1 h-1 bg-cyan-400 rounded-full
                shadow-[0_0_6px_rgba(34,211,238,1)] animate-pulse
                ${vertical
                  ? '-right-0.5 top-1/2 -translate-y-1/2'
                  : '-bottom-1 left-1/2 -translate-x-1/2'
                }
              `}
            />
          )}

          {/* 悬停时的微弱背景 */}
          {isAvailable && !isActive && (
            <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/5 rounded-full transition-colors duration-300" />
          )}
        </button>
      );
    })}
  </div>
));
VisorTabs.displayName = 'VisorTabs';

// =====================
// 4. 主组件：NeuralinkDevice
// =====================

const NeuralinkDeviceBase: React.FC<NeuralinkDeviceProps> = ({
  activePanel,
  onPanelChange,
  currentNodeId,
  player,
  settings,
  viewMode,
  onToggleMode,
  onToggleMediaType,
  currentZone = null,
  currentNode = null,
  isTaskGenerating,
  onManualGen,
  onRandomSwitch,
  hasMultipleVariants,
  logs,
  onAction,
  onUseItem,
  onDiscardItem,
  onUnequipItem,
  onInteractWithCompanion,
  isSanctuary = false,
  onToggleSanctuaryUI,
  isCombat = false,
  overrideImageUrl,
  setNeuralNoise,
  isVisualFullscreen = false,
  setIsVisualFullscreen,
  onOpenSettings,
  onLevelUp,
  pendingTacticOptions,
  onSelectTactic,
}) => {
  // ==========================================================================
  // 4.1 本地 UI 状态
  // ==========================================================================
  const [noiseColor, setNoiseColor] = useState('cyan');
  const [showTabs, setShowTabs] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const tabsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ==========================================================================
  // 4.2 左边缘 Tabs 滑入控制
  // ==========================================================================
  const handleTabsTriggerEnter = useCallback(() => {
    if (tabsTimeoutRef.current) {
      clearTimeout(tabsTimeoutRef.current);
      tabsTimeoutRef.current = null;
    }
    setShowTabs(true);
  }, []);

  const handleTabsLeave = useCallback(() => {
    tabsTimeoutRef.current = setTimeout(() => {
      setShowTabs(false);
    }, 300);
  }, []);

  useEffect(() => () => {
    if (tabsTimeoutRef.current) {
      clearTimeout(tabsTimeoutRef.current);
    }
  }, []);

  /** 进入战斗即强制收起侧栏，避免战斗结束后残留展开态。 */
  useEffect(() => {
    if (isCombat) setShowTabs(false);
  }, [isCombat]);

  // ==========================================================================
  // 4.3 派生数值
  // ==========================================================================
  const integrityPercent = getPercent(
    player.neuralLink.integrity,
    player.neuralLink.maxIntegrity,
  );
  const batteryPercent = getPercent(
    player.neuralLink.battery,
    player.neuralLink.maxBattery,
  );
  const sanityPercent = getPercent(
    player.dynamic.sanity,
    player.dynamic.maxSanity,
  );

  /** 理智临界阈值，与 utils.ts 动态叙事触发器同源。 */
  const sanityCriticalPct = settings.gameConfig.social.vitals.sanityCritical;

  /** 设备框架危急：低完整 / 低电量 / 低理智。 */
  const frameCritical =
    integrityPercent < 30 || batteryPercent < 10 || sanityPercent < 20;

  /** 是否存在故障源，用于按需启停 glitch 采样。 */
  const glitchActive = integrityPercent < 40 || sanityPercent < 30;

  /** 媒体偏好：单一事实源为 Settings。 */
  const mediaPreference: AssetType = settings.preferredMediaType;

  const effectiveViewMode: VisualMode = viewMode ?? player.visualMode;

  const safeLogs = useMemo(() => logs ?? [], [logs]);

  // ==========================================================================
  // 4.4 Glitch / 故障强度
  // ==========================================================================
  /**
   * 通过 CSS 变量注入故障强度：
   * - 不触发 React 渲染
   * - VisorFrame 内部通过 var(--glitch-intensity) 消费
   * - 无故障源时直接归零并停止轮询
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!glitchActive) {
      container.style.setProperty('--glitch-intensity', '0');
      return;
    }

    const updateGlitch = () => {
      const integrityFactor = integrityPercent < 40
        ? clamp((40 - integrityPercent) / 40, 0, 1)
        : 0;
      const sanityFactor = sanityPercent < 30
        ? clamp((30 - sanityPercent) / 30, 0, 1)
        : 0;
      const totalGlitch = clamp(Math.max(integrityFactor, sanityFactor), 0, 1);
      const nextGlitch = totalGlitch > 0
        ? clamp(Math.random() * totalGlitch, 0, 1)
        : 0;
      container.style.setProperty('--glitch-intensity', nextGlitch.toFixed(3));
    };

    updateGlitch();
    const interval = setInterval(updateGlitch, 200);
    return () => clearInterval(interval);
  }, [glitchActive, integrityPercent, sanityPercent]);

  // ==========================================================================
  // 4.5 面板 Tabs 与路由
  // ==========================================================================
  const hasCurrentNode = Boolean(currentNode);

  const panelTabs = useMemo<PanelTabConfig[]>(() => [
    { id: 'visual', label: 'VISUAL', hotkey: 'V', available: hasCurrentNode },
    { id: 'Vital', label: 'STATUS', hotkey: 'S', available: true },
    { id: 'inventory', label: 'ITEMS', hotkey: 'I', available: true },
    { id: 'archives', label: 'DATA', hotkey: 'D', available: true },
  ], [hasCurrentNode]);

  const handlePanelChange = useCallback((panel: VisorPanelType) => {
    if (panel === activePanel) return;
    AudioService.playSfx('ui_click');
    onPanelChange(panel);
  }, [activePanel, onPanelChange]);

  // ==========================================================================
  // 4.6 键盘快捷键
  // ==========================================================================
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;

      const target = event.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName.toUpperCase();
        if (
          tagName === 'INPUT' ||
          tagName === 'TEXTAREA' ||
          tagName === 'SELECT' ||
          target.isContentEditable
        ) {
          return;
        }
      }

      const key = event.key.toUpperCase();
      const tab = panelTabs.find((entry) => entry.hotkey === key && entry.available);
      if (!tab) return;

      event.preventDefault();
      handlePanelChange(tab.id);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [panelTabs, handlePanelChange]);

  // ==========================================================================
  // 4.7 稳定化回调：基础交互
  // ==========================================================================
  const handleToggleMode = useCallback(() => {
    onToggleMode?.();
  }, [onToggleMode]);

  const handleToggleMediaType = useCallback(() => {
    onToggleMediaType?.();
  }, [onToggleMediaType]);

  const handleAction = useCallback((action: string, payload?: unknown) => {
    onAction?.(action, payload);
  }, [onAction]);

  const handleUseItem = useCallback((item: ItemInstance) => {
    onUseItem?.(item.instanceId);
  }, [onUseItem]);

  const handleDiscardItem = useCallback((item: ItemInstance) => {
    onDiscardItem?.(item.instanceId);
  }, [onDiscardItem]);

  // 卸下走独立通道：不经 onUseItem，避免被节点交互的"钥匙判定"截获
  const handleUnequipItem = useCallback((item: ItemInstance) => {
    onUnequipItem?.(item.instanceId);
  }, [onUnequipItem]);

  const handleInteractWithCompanion = useCallback(
    (npc: Entity<NpcTemplate, NpcDynamicState>) => {
      onInteractWithCompanion?.(npc.static.id);
    },
    [onInteractWithCompanion],
  );

  const handleOpenSettings = useCallback(() => {
    onOpenSettings?.();
  }, [onOpenSettings]);

  const handleToggleSanctuaryUI = useCallback(() => {
    onToggleSanctuaryUI?.();
  }, [onToggleSanctuaryUI]);

  const handleSetNoiseLevel = useCallback((level: number) => {
    setNeuralNoise?.(level);
  }, [setNeuralNoise]);

  const handleFullscreenChange = useCallback((fullscreen: boolean) => {
    setIsVisualFullscreen?.(fullscreen);
  }, [setIsVisualFullscreen]);

  const handleLevelUp = useCallback((targetId: string, attr: string) => {
    onLevelUp?.(targetId, attr);
  }, [onLevelUp]);

  const handleSelectTactic = useCallback((tacticId: string) => {
    onSelectTactic?.(tacticId);
  }, [onSelectTactic]);

  // ==========================================================================
  // 4.8 稳定化回调：资源生成
  // ==========================================================================
  const generateNewAssetScene = useCallback((
    targetType: NeuralinkGenTarget,
    mediaType?: AssetType,
  ) => {
    onManualGen(targetType, mediaType);
  }, [onManualGen]);

  const generateNewAssetPortrait = useCallback(() => {
    onManualGen('player', 'image');
  }, [onManualGen]);

  const handleSceneRandomSwitch = useCallback(async (
    mediaType: AssetType,
    targetType: NeuralinkGenTarget = 'scene',
    targetId: string = currentNodeId,
    currentUrl?: string,
  ) => {
    if (!onRandomSwitch) return null;
    const fallbackUrl = mediaType === 'video'
      ? currentNode?.videoUrl
      : currentNode?.imageUrl;
    return onRandomSwitch(
      mediaType,
      targetType,
      targetId,
      currentUrl ?? fallbackUrl,
    );
  }, [
    onRandomSwitch,
    currentNodeId,
    currentNode?.imageUrl,
    currentNode?.videoUrl,
  ]);

  const stableHasMultipleVariants = useCallback(async (
    mediaType: AssetType,
  ) => {
    if (!hasMultipleVariants) return false;
    return hasMultipleVariants(mediaType, 'scene', currentNodeId);
  }, [hasMultipleVariants, currentNodeId]);

  const handlePlayerRandomSwitch = useCallback(async () => {
    if (!onRandomSwitch) return null;
    return onRandomSwitch(
      'image',
      'player',
      player.static.id,
      player.dynamic.imageUrl,
    );
  }, [
    onRandomSwitch,
    player.static.id,
    player.dynamic.imageUrl,
  ]);

  // ==========================================================================
  // 4.9 生成状态
  // ==========================================================================
  const isSceneGenerating = useMemo(
    () => isTaskGenerating(mediaPreference, 'scene', currentNodeId),
    [isTaskGenerating, mediaPreference, currentNodeId],
  );

  const isPortraitGenerating = useMemo(
    () => isTaskGenerating('image', 'player', player.static.id),
    [isTaskGenerating, player.static.id],
  );

  // ==========================================================================
  // 4.10 Overlay 面板内容
  // ==========================================================================
  const overlayContent = useMemo(() => {
    switch (activePanel) {
      case 'Vital':
        return (
          <StatusPanel
            player={player}
            settings={settings}
            onInteractWithCompanion={handleInteractWithCompanion}
            onManualGen={generateNewAssetPortrait}
            isGenerating={isPortraitGenerating}
            onLevelUp={handleLevelUp}
            onRandomSwitch={handlePlayerRandomSwitch}
            pendingTacticOptions={pendingTacticOptions}
            onSelectTactic={handleSelectTactic}
            onUnequipItem={handleUnequipItem}
          />
        );

      case 'inventory':
        return (
          <InventoryPanel
            player={player}
            onUseItem={handleUseItem}
            onDiscardItem={handleDiscardItem}
            gameActive
          />
        );

      case 'archives':
        return (
          <ArchivesPanel
            player={player}
          />
        );

      case 'visual':
      default:
        return null;
    }
  }, [
    activePanel,
    player,
    settings,
    handleInteractWithCompanion,
    generateNewAssetPortrait,
    isPortraitGenerating,
    handleLevelUp,
    handlePlayerRandomSwitch,
    pendingTacticOptions,
    handleSelectTactic,
    handleUseItem,
    handleDiscardItem,
    handleUnequipItem,
  ]);

  // ==========================================================================
  // 4.11 渲染
  // ==========================================================================
  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-black"
      style={{ '--glitch-intensity': '0' } as React.CSSProperties}
    >
      {/* 设备框架 */}
      <VisorFrame critical={frameCritical}>
        <div className="relative w-full h-full">
          {/* LAYER 1：底层视觉画面，始终渲染 */}
          <div className="absolute inset-0 z-0">
            {currentZone && currentNode ? (
              <VisualPanel
                imageUrl={currentNode.imageUrl}
                videoUrl={currentNode.videoUrl}
                viewMode={effectiveViewMode}
                onManualGen={generateNewAssetScene}
                isGenerating={isSceneGenerating}
                preferredMediaType={mediaPreference}
                hasVideo={Boolean(currentNode.videoUrl)}
                nodeId={currentNodeId}
                zoneId={currentZone.id}
                zoneName={currentZone.name}
                nodeName={currentNode.name}
                nodedesc={currentNode.desc ?? ''}
                threatLevel={currentNode.threatLevel ?? 0}
                interactions={currentNode.interactions}
                sanity={player.dynamic.sanity}
                onToggleMode={handleToggleMode}
                onToggleMediaType={handleToggleMediaType}
                onAction={handleAction}
                logs={safeLogs}
                currentNode={currentNode}
                isSanctuary={isSanctuary}
                onToggleSanctuaryUI={handleToggleSanctuaryUI}
                isCombat={isCombat}
                overrideImageUrl={overrideImageUrl}
                neuralNoiseLevel={player.neuralLink.noiseLevel}
                batteryLevel={player.neuralLink.battery}
                onSetNoiseLevel={handleSetNoiseLevel}
                integrity={player.neuralLink.integrity}
                noiseColor={noiseColor}
                onSetNoiseColor={setNoiseColor}
                onRandomSwitch={handleSceneRandomSwitch}
                hasMultipleVariants={stableHasMultipleVariants}
                isFullscreenControlled={isVisualFullscreen}
                onFullscreenChange={handleFullscreenChange}
                onOpenSettings={handleOpenSettings}
                currentZone={currentZone}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-mono text-[10px] tracking-[0.3em] text-cyan-900/60 select-none">
                NEURAL_LINK::NO_SIGNAL
              </div>
            )}
          </div>

          {/* LAYER 2：半透明功能面板遮罩 */}
          {activePanel !== 'visual' && (
            <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200 flex flex-col">
              <div className="flex-1 relative overflow-hidden p-4">
                <div className="w-full h-full border border-cyan-900/30 bg-black/20 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-900/50 to-transparent" />
                  {overlayContent}
                </div>
              </div>
            </div>
          )}
        </div>
      </VisorFrame>

      {/* LAYER 3：左边缘 Tabs —— 默认隐藏，鼠标推向左边缘时滑出。
          战斗中整条链路禁用：战斗 HUD 铺满视口，玩家操作/瞄准时鼠标频繁掠过左边缘，
          会误触滑出面板切换栏并遮住战斗信息。 */}
      {!isCombat && (
        <>
          {/* 触发条：左边缘 6px 宽不可见区域 */}
          <div
            className="absolute left-0 top-0 bottom-0 z-50"
            style={{ width: '6px' }}
            onMouseEnter={handleTabsTriggerEnter}
          />

          {/* 可察觉的指示线 —— 收起时隐约可见 */}
          <div
            className={`
              absolute left-0 top-0 bottom-0 z-40 w-[2px] pointer-events-none
              transition-opacity duration-300
              ${showTabs ? 'opacity-0' : 'opacity-30'}
            `}
            style={{
              background: 'linear-gradient(to bottom, transparent 25%, rgba(6,182,212,0.6) 50%, transparent 75%)',
            }}
          />

          {/* Tabs 面板 */}
          <div
            onMouseEnter={handleTabsTriggerEnter}
            onMouseLeave={handleTabsLeave}
            onFocus={handleTabsTriggerEnter}
            onBlur={handleTabsLeave}
            className="absolute left-0 z-50 transition-transform duration-300 ease-out"
            style={{
              top: '50%',
              transform: `translate(${showTabs ? '0' : 'calc(-100% + 4px)'}, -50%)`,
            }}
          >
            <div className="bg-black/80 border border-cyan-900/40 border-l-0 rounded-r-md px-2 py-4 backdrop-blur-md shadow-[4px_0_20px_rgba(0,0,0,0.5)]">
              <VisorTabs
                tabs={panelTabs}
                activeTab={activePanel}
                onTabChange={handlePanelChange}
                vertical
              />
            </div>
          </div>
        </>
      )}

      {/* 理智临界警告：阈值与动态叙事触发器同源 */}
      {sanityPercent < sanityCriticalPct && (
        <div className="absolute inset-0 pointer-events-none z-[60] border-[6px] border-red-600/30 animate-pulse" />
      )}
    </div>
  );
};

NeuralinkDeviceBase.displayName = 'NeuralinkDevice';

export const NeuralinkDevice = React.memo(NeuralinkDeviceBase);

export default NeuralinkDevice;
