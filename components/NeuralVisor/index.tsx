/**
 * NeuralVisor - 神经成像仪主组件
 * 头戴式神经接口设备，用于过滤克苏鲁的理智污染
 * 
 * 布局：
 * - 底层：VisualPanel (视觉画面)
 * - 中层：半透明遮罩面板 (Status, Inventory, etc.)
 * - 顶层：底部导航栏 (Tabs)
 * 
 * 性能策略：
 * - glitchIntensity 使用 useRef + CSS 变量，避免 200ms 高频渲染
 * - 所有传递给子组件的回调均通过 useCallback 稳定化，确保 React.memo 有效
 * - overlay 面板内容通过 useMemo 缓存
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { NeuralVisorProps, VisorPanelType, PanelTabConfig } from '../../meta';
import { VisorFrame } from './VisorFrame';

// 面板组件导入
import Content from '../VisualPanel';
import StatusPanel from '../StatusPanel';
import InventoryPanel from '../InventoryPanel';
import ArchivesPanel from '../ArchivesPanel';

const NeuralVisor: React.FC<NeuralVisorProps> = ({
  activePanel,
  onPanelChange,
  currentNodeId,
  player,
  viewMode,
  onToggleMode,
  onToggleMediaType,
  currentZone,
  currentNode,
  isGenerating,
  isTaskGenerating,
  preferredMediaType,
  onManualGen,
  onRandomSwitch,
  hasMultipleVariants,
  logs,
  onAction,
  onUseItem,
  onDiscardItem,
  onInteractWithCompanion,
  onOpenSettings,
  isSanctuary,
  onToggleSanctuaryUI,
  isCombat,
  overrideImageUrl,
  setNeuralNoise,
  isVisualFullscreen,
  setIsVisualFullscreen,
  onLevelUp
}) => {
  // 设备状态
  const [isBooting] = useState(false);
  const [noiseColor, setNoiseColor] = useState('cyan');

  /**
   * 性能关键：glitchIntensity 使用 useRef 而非 useState
   * 原因：200ms 的 setInterval 如果通过 useState 更新，会每秒触发 5 次整棵组件树的重渲染。
   * 改为 useRef + CSS 变量注入，完全绕过 React 渲染管线。
   */
  const glitchRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 理智相关计算（缓存以避免重复计算）
  const sanityPercent = useMemo(() => (player.dynamic.sanity / player.static.initialState.vital.maxSanity) * 100, [player.dynamic.sanity, player.static.initialState.vital.maxSanity]);
  const isSanityLow = sanityPercent < 30;

  // 故障强度：通过 DOM 直接操作 CSS 变量，不触发 React 渲染
  useEffect(() => {
    const interval = setInterval(() => {
      const integrityFactor = player.neuralLink.integrity < 40 ? (40 - player.neuralLink.integrity) / 40 : 0;
      const sanityFactor = isSanityLow ? (30 - sanityPercent) / 30 : 0;
      const totalGlitch = Math.max(integrityFactor, sanityFactor);

      const newValue = totalGlitch > 0 ? Math.random() * totalGlitch : 0;
      glitchRef.current = newValue;

      // 直接操作 DOM，不经过 React 状态
      if (containerRef.current) {
        containerRef.current.style.setProperty('--glitch-intensity', String(newValue));
      }
    }, 200);
    return () => clearInterval(interval);
  }, [isSanityLow, sanityPercent, player.neuralLink.integrity]);

  // 面板切换
  const handlePanelChange = useCallback((panel: VisorPanelType) => {
    if (panel === activePanel) return;
    onPanelChange(panel);
  }, [activePanel, onPanelChange]);

  // 可用面板配置（仅在 currentNode 有无变化时更新）
  const hasCurrentNode = !!currentNode;
  const panelTabs: PanelTabConfig[] = useMemo(() => [
    { id: 'visual', label: 'VISUAL', icon: '◉', hotkey: 'V', available: hasCurrentNode },
    { id: 'Vital', label: 'STATUS', icon: '◈', hotkey: 'S', available: true },
    { id: 'inventory', label: 'ITEMS', icon: '▣', hotkey: 'I', available: true },
    { id: 'archives', label: 'DATA', icon: '◫', hotkey: 'D', available: true }
  ], [hasCurrentNode]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const key = e.key.toUpperCase();
      const tab = panelTabs.find(t => t.hotkey === key && t.available);
      if (tab) {
        e.preventDefault();
        handlePanelChange(tab.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [panelTabs, handlePanelChange]);

  // === 稳定化回调：提取所有传递给子组件的内联箭头函数 ===

  /** 生成场景资源的稳定回调 */
  const generateNewAssetScene = useCallback((targetType: 'scene' | 'enemy' | 'npc' | 'player', mediaType?: 'image' | 'video') => onManualGen(targetType, mediaType), [onManualGen]);

  /** 生成玩家肖像的稳定回调 */
  const generateNewAssetPortrait = useCallback(() => onManualGen('player', 'image'), [onManualGen]);

  /** 玩家肖像随机切换的稳定回调 */
  const handlePlayerRandomSwitch = useCallback(async () => {
    if (onRandomSwitch) {
      return await onRandomSwitch('image', 'player', player.static.id, player.dynamic.imageUrl);
    }
    return null;
  }, [onRandomSwitch, player.static.id, player.dynamic.imageUrl]);

  /** 玩家肖像多变体检查的稳定回调 */
  const handlePlayerHasVariants = useCallback(async () => {
    if (hasMultipleVariants) {
      return await hasMultipleVariants('image', 'player', player.static.id);
    }
    return false;
  }, [hasMultipleVariants, player.static.id]);

  /** 多变体检查的稳定回调（替代 async (mediaType) => hasMultipleVariants ? ...） */
  const stableHasMultipleVariants = useCallback(async (mediaType: 'image' | 'video') => {
    if (hasMultipleVariants) {
      return await hasMultipleVariants(mediaType, 'scene', currentNodeId);
    }
    return false;
  }, [hasMultipleVariants, currentNodeId]);

  // 提取传给 Content 的稳定 props，避免因 player 对象变化导致不必要的重渲染
  const playerSanity = player.dynamic.sanity;
  const neuralNoiseLevel = player.neuralLink.noiseLevel;
  const batteryLevel = player.neuralLink.battery;
  const integrity = player.neuralLink.integrity;
  
  // 覆盖层面板内容缓存（替代每次渲染都重新执行的 renderOverlayContent 函数）
  const overlayContent = useMemo(() => {
    switch (activePanel) {
      case 'Vital':
        return (
          <StatusPanel
            player={player}
            onInteractWithCompanion={onInteractWithCompanion}
            onManualGen={generateNewAssetPortrait}
            isGenerating={isTaskGenerating ? isTaskGenerating('image', 'player', player.static.id) : isGenerating}
            onLevelUp={onLevelUp}
            onRandomSwitch={handlePlayerRandomSwitch}
            hasMultipleVariants={handlePlayerHasVariants}
          />
        );
      case 'inventory':
        return (
          <InventoryPanel
            player={player}
            onUseItem={onUseItem}
            onDiscardItem={onDiscardItem}
            gameActive={true}
          />
        );
      case 'archives':
        return <ArchivesPanel player={player} />;
      default:
        return null;
    }
  }, [activePanel, player, onInteractWithCompanion, generateNewAssetPortrait, isGenerating, isTaskGenerating, onLevelUp, handlePlayerRandomSwitch, handlePlayerHasVariants, onUseItem, onDiscardItem]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-black">

      {/* 设备框架 */}
      <VisorFrame
        integrity={integrity}
        battery={batteryLevel}
        noiseLevel={neuralNoiseLevel}
        sanity={sanityPercent}
        isBooting={isBooting}
        glitchIntensity={glitchRef.current}
      >
        <div className="relative w-full h-full">

          {/* LAYER 1: 底层视觉画面 (Always Rendered) */}
          <div className="absolute inset-0 z-0">
            {currentZone && currentNode && (
              <Content
                imageUrl={(currentNode as any).imageUrl}
                videoUrl={(currentNode as any).videoUrl}
                viewMode={viewMode}
                onManualGen={generateNewAssetScene}
                isGenerating={isTaskGenerating ? isTaskGenerating(preferredMediaType || 'image', 'scene', currentNodeId) : isGenerating}
                preferredMediaType={preferredMediaType}
                hasVideo={!!(currentNode as any).videoUrl}
                nodeId={currentNodeId}
                zoneId={currentZone.id}
                zoneName={currentZone.name}
                nodeName={currentNode.name}
                nodedesc={currentNode.desc}
                threatLevel={currentNode.threatLevel || 0}
                interactions={currentNode.interactions}
                sanity={playerSanity}
                onToggleMode={onToggleMode}
                onToggleMediaType={onToggleMediaType}
                onAction={onAction}
                logs={logs}
                currentNode={currentNode}
                isSanctuary={isSanctuary}
                onToggleSanctuaryUI={onToggleSanctuaryUI}
                isCombat={isCombat}
                overrideImageUrl={overrideImageUrl}
                neuralNoiseLevel={neuralNoiseLevel}
                batteryLevel={batteryLevel}
                onSetNoiseLevel={setNeuralNoise}
                integrity={integrity}
                noiseColor={noiseColor}
                onSetNoiseColor={setNoiseColor}
                onRandomSwitch={onRandomSwitch}
                hasMultipleVariants={stableHasMultipleVariants}
                isFullscreenControlled={isVisualFullscreen}
                onFullscreenChange={setIsVisualFullscreen}
                onOpenSettings={onOpenSettings}
                currentZone={currentZone}
              />
            )}
          </div>

          {/* LAYER 2: 半透明功能面板遮罩 */}
          {activePanel !== 'visual' && (
            <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200 flex flex-col pb-16">
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

      {/* 启动/切换动画 */}
      {isBooting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black">
          <div className="text-cyan-500 text-xs font-mono animate-pulse">
            NEURAL_LINK::BOOT_SEQUENCE...
          </div>
        </div>
      )}

      {/* 危急状态警告 (全屏) */}
      {sanityPercent < 15 && (
        <div className="absolute inset-0 pointer-events-none z-[60] border-[6px] border-red-600/30 animate-pulse" />
      )}
    </div>
  );
};

export default React.memo(NeuralVisor);
