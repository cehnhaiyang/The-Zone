/**
 * VisualPanel/index.tsx - 视觉面板核心引擎
 * 
 * 本组件是系统的视觉输出中枢，负责处理以下核心任务：
 * 1. 滤镜流水线：通过 SVG Filer 实现实时的神经边缘扫描效果。
 * 2. 层级编排：协调媒体层、大气干扰层、HUD 叠加层与交互内容层的堆叠。
 * 3. 状态响应：根据电量、理智值（Sanity）及神经噪声等级动态调整视觉反馈。
 * 4. 布局持久化：允许用户自定义 HUD 元素位置并存储至 localStorage。
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Interaction, NodeTemplate, Log, ZoneTemplate, VisualTextConfig, VisualLayoutConfig, VisualComponentKey, VisualMode } from '../../meta';
import { DEFAULT_LAYOUT_CONFIG } from '../../constants/config';
import { AudioService, RenderService } from '../../services';
import { Icons } from './Icons';
import { Control } from './control';
import Action from './action';
import { ZoneName, NodeName, ThreatLevel, Nodedesc, ConfigPanel } from './narrative';

interface VisualPanelProps {
    imageUrl?: string;
    videoUrl?: string;
    hasVideo: boolean;
    viewMode: 'camera' | 'bio';
    isGenerating: boolean;
    preferredMediaType?: 'image' | 'video';
    sanity: number;
    nodeId: string;
    zoneId: string;
    zoneName: string;
    nodeName: string;
    nodedesc: string;
    threatLevel: number;
    interactions?: Interaction[];
    onManualGen: (type: 'scene' | 'enemy' | 'npc' | 'player', mediaType?: 'image' | 'video') => void;
    onToggleMode: () => void;
    onToggleMediaType?: () => void;
    onAction: (actionType: 'move_local' | 'move_zone' | 'search' | 'interact_obj' | 'interact_npc' | 'generate_video' | 'unlock' | 'sanctuary_return', target?: string, label?: string) => void;
    logs: Log[];
    currentNode?: NodeTemplate | null;
    isSanctuary?: boolean;
    onToggleSanctuaryUI?: () => void;
    isCombat?: boolean;
    overrideImageUrl?: string | null;
    neuralNoiseLevel?: number;
    batteryLevel?: number;
    onSetNoiseLevel?: (level: number) => void;
    integrity?: number;
    noiseColor?: string;
    onSetNoiseColor?: (color: string) => void;
    isFullscreenControlled?: boolean;
    onFullscreenChange?: (value: boolean) => void;
    onRandomSwitch?: (mediaType: 'image' | 'video', type: 'scene' | 'enemy' | 'npc', nodeId?: string, currentUrl?: string) => Promise<string | null>;
    hasMultipleVariants?: (mediaType: 'image' | 'video') => Promise<boolean>;
    onOpenSettings?: () => void;
    currentZone?: ZoneTemplate;
}

// ============================================================================
// 1. 抽象视觉组件 (Abstract Visual Components)
// ============================================================================

/**
 * 眼睑效果 (Eyelids)
 * 
 * 设计意图：
 * 1. 生理恐惧模拟：通过模拟眨眼行为，建立角色与玩家之间的生理连接。
 * 2. 动态反馈环：理智（Sanity）越低，眨眼频率越高、闭合时间越长，从视觉上剥夺玩家的视野，传达角色内心的动荡与恐惧。
 */
const Eyelids: React.FC<{ sanity: number }> = React.memo(({ sanity }) => {
    const [closure, setClosure] = useState(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /* 眨眼逻辑：根据理智值计算闭眼步长与间隔，确保低理智时的视觉压迫感 */
    const performBlink = useCallback(() => {
        const isLowSanity = sanity < 40;
        const isCritical = sanity < 20;
        const closeTime = isCritical ? 500 : 120;
        const stayTime = isCritical ? 800 : (isLowSanity ? 200 : 50);

        setClosure(1);
        setTimeout(() => setClosure(0), closeTime + stayTime);

        const baseInterval = isLowSanity ? 1800 : 5000;
        const nextTime = baseInterval + (Math.random() * 4000); // 增加随机性以模拟自然疲劳
        timerRef.current = setTimeout(performBlink, nextTime);
    }, [sanity]);

    useEffect(() => {
        timerRef.current = setTimeout(performBlink, 2000);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [performBlink]);

    return (
        <div className="absolute inset-0 pointer-events-none z-[60] overflow-hidden flex flex-col justify-between h-full mix-blend-multiply">
            {/* 上眼睑：阴影权重向下，模拟重力与压抑感 */}
            <div
                className="w-full bg-[#030000] shadow-[0_20px_100px_rgba(0,0,0,1)] rounded-b-[50%]"
                style={{
                    height: '60%',
                    position: 'absolute',
                    top: '-10%',
                    left: 0,
                    transform: `translateY(${closure === 1 ? '10%' : '-100%'})`,
                    transition: `transform ${closure === 1 ? '0.15s' : '0.4s'} cubic-bezier(0.4, 0, 0.2, 1)`
                }}
            />
            {/* 下眼睑：向上推挤，强化生理性的紧迫闭合感 */}
            <div
                className="w-full bg-[#030000] shadow-[0_-20px_100px_rgba(0,0,0,1)] rounded-t-[50%]"
                style={{
                    height: '60%',
                    position: 'absolute',
                    bottom: '-10%',
                    left: 0,
                    transform: `translateY(${closure === 1 ? '-10%' : '100%'})`,
                    transition: `transform ${closure === 1 ? '0.15s' : '0.4s'} cubic-bezier(0.4, 0, 0.2, 1)`
                }}
            />
            <div
                className="absolute inset-0 bg-black -z-10 transition-opacity duration-300"
                style={{ opacity: closure === 1 ? 0.9 : 0 }}
            />
        </div>
    );
});

// ============================================================================
// 2. 层级组件实现
// ============================================================================

interface AtmosphereLayerProps {
    isNeuralMode: boolean;
    sanity: number;
}

/**
 * 大气层 (AtmosphereLayer)
 * 
 * 视觉意图：
 * 负责渲染画面的后处理细节，包括暗角（电影感）、理智值红色呼吸灯（生存压力）和眼睑。
 * 神经模式下会自动切换到 CRT 扫描线风格，产生不同维度的沉浸感。
 */
const AtmosphereLayer: React.FC<AtmosphereLayerProps> = React.memo(({ isNeuralMode, sanity }) => {
    const vignetteStyle = useMemo(() => ({ boxShadow: 'inset 0 0 150px rgba(0,0,0,0.75)' }), []);

    const atmosphereContent = useMemo(() => {
        if (!isNeuralMode) {
            return (
                <>
                    {/* 噪点纹理层：利用胶片颗粒感消除数字画面的纯净度，增加写实感 */}
                    <div className="absolute inset-[-100%] w-[300%] h-[300%] bg-[url('/noise.png')] opacity-[0.18] mix-blend-overlay animate-noise" />

                    {/* 危险氛围层：仅在理智值较低时启动，通过红光波动提示危机 */}
                    <div className={`absolute inset-0 bg-red-900/15 mix-blend-color-dodge transition-opacity duration-2000 ${sanity < 40 ? 'animate-[breathe_1s_infinite] opacity-100' : sanity < 60 ? 'animate-[breathe_4s_infinite] opacity-50' : 'opacity-0'}`} />

                    {/* 色差边缘效果 (Chromatic Aberration)：模拟镜头缺陷，增加迷幻感 */}
                    <div
                        className="absolute inset-0 pointer-events-none opacity-60"
                        style={{
                            background: 'radial-gradient(ellipse at center, transparent 60%, rgba(255,0,80,0.03) 80%, rgba(255,0,80,0.06) 100%)',
                            mixBlendMode: 'screen'
                        }}
                    />
                    <div
                        className="absolute inset-0 pointer-events-none opacity-60"
                        style={{
                            background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,200,255,0.03) 80%, rgba(0,200,255,0.06) 100%)',
                            mixBlendMode: 'screen',
                            transform: 'translateX(-2px)'
                        }}
                    />

                    <Eyelids sanity={sanity} />
                </>
            );
        }

        return (
            <>
                {/* 扫描网格层：模拟老式监视器或神经接口的数据流特征 */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none opacity-30" />

                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)',
                    }}
                />
            </>
        );
    }, [isNeuralMode, sanity]);

    return (
        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden select-none">
            {/* 动态暗角：通过内阴影呼吸动画制造视线的收缩感 */}
            <div className="absolute inset-0 pointer-events-none animate-vignette-breathe" style={vignetteStyle} />
            {atmosphereContent}
        </div>
    );
});

interface HUDLayerProps {
    isNeuralMode: boolean;
    isFullscreen: boolean;
    sanity: number;
    isGenerating: boolean;
    noiseColor?: string;
}

const COLOR_HEX_MAP: Record<string, string> = {
    cyan: '#06b6d4',
    green: '#10b981',
    red: '#ef4444',
    purple: '#a855f7',
    amber: '#f59e0b',
};

/**
 * 抬头显示层 (HUDLayer)
 * 
 * 交互意图：
 * 1. 系统反馈：通过高亮扫描条展示神经接口的“激活状态”。
 * 2. 状态阻断：当正在生成（Generating）时，展示全屏加载覆盖层，提示用户系统正在“同步/提取”视觉信号，具有较强的叙事引导性。
 */
const HUDLayer: React.FC<HUDLayerProps> = React.memo(({ isNeuralMode, isFullscreen, sanity, isGenerating, noiseColor = 'cyan' }) => {
    const accentColor = useMemo(() => COLOR_HEX_MAP[noiseColor] || COLOR_HEX_MAP.cyan, [noiseColor]);
    const barStyle = useMemo(() => ({ background: accentColor, boxShadow: `0 0 20px ${accentColor}, 0 0 60px ${accentColor}40` }), [accentColor]);
    const containerClass = useMemo(() => `absolute inset-0 z-30 pointer-events-none overflow-hidden transition-all duration-700 ${isFullscreen ? 'opacity-40 scale-[1.02]' : 'opacity-100 scale-100'}`, [isFullscreen]);

    return (
        <div className={containerClass}>
            {isNeuralMode && (
                <>
                    {/* 扫描基准线：提供动态的纵向引导 */}
                    <div className="scan-bar" style={barStyle} />
                </>
            )}

            {/* 生成状态覆盖：根据模式切换 Emerald（技术感）或 Red（生物/噩梦感）加载风格 */}
            {isGenerating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-50 backdrop-blur-[2px] bg-black/5">
                    {isNeuralMode ? (
                        <div className="flex flex-col items-center gap-4">
                            {/* 双环旋转加载器 */}
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 border-2 border-dashed border-emerald-500/30 rounded-full animate-[spin_8s_linear_infinite]" />
                                <div className="absolute inset-2 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                <div className="absolute inset-4 border border-emerald-500/20 border-b-transparent rounded-full animate-[spin_3s_linear_infinite_reverse]" />
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] font-mono text-emerald-500 tracking-[0.4em] animate-pulse">SYNTHESIZING_PATTERN</span>
                                <div className="h-[2px] w-24 bg-emerald-500/20 mt-2 overflow-hidden rounded-full">
                                    <div className="h-full bg-emerald-500 animate-[scan-line_2s_infinite]" style={{ boxShadow: '0 0 10px rgba(16,185,129,0.8)' }} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative">
                                <div className="w-4 h-4 bg-red-800 rounded-full animate-ping shadow-[0_0_15px_rgba(153,27,27,0.8)]" />
                                <div className="absolute inset-0 w-4 h-4 bg-red-600 rounded-full animate-pulse" />
                            </div>
                            <span className="text-xs font-serif text-red-900/80 animate-pulse tracking-[0.3em] italic">manifesting...</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

interface MediaLayerProps {
    imageUrl?: string;
    videoUrl?: string;
    hasVideo: boolean;
    isNeuralMode: boolean;
    sanity: number;
    isGenerating: boolean;
    isEnemyView?: boolean;
    neuralNoiseLevel?: number;
    noiseColor?: string;
}

const NOISE_COLOR_MAP: Record<string, { primary: string; secondary: string; hue: string }> = {
    cyan: { primary: 'rgba(6,182,212,', secondary: 'rgba(16,185,129,', hue: '180deg' },
    green: { primary: 'rgba(16,185,129,', secondary: 'rgba(34,197,94,', hue: '140deg' },
    red: { primary: 'rgba(239,68,68,', secondary: 'rgba(220,38,38,', hue: '0deg' },
    purple: { primary: 'rgba(168,85,247,', secondary: 'rgba(139,92,246,', hue: '280deg' },
    amber: { primary: 'rgba(245,158,11,', secondary: 'rgba(251,191,36,', hue: '45deg' },
};

/**
 * 媒体层 (MediaLayer)
 * 视觉面板的最底层，承载实际的图片或视频内容。
 */
const MediaLayer: React.FC<MediaLayerProps> = React.memo(({
    imageUrl, videoUrl, hasVideo, isNeuralMode, sanity, isGenerating, isEnemyView, neuralNoiseLevel = 0, noiseColor = 'cyan'
}) => {
    const colorConfig = useMemo(() => NOISE_COLOR_MAP[noiseColor] || NOISE_COLOR_MAP.cyan, [noiseColor]);
    const { isPanic, isUnstable, isLow } = useMemo(() => ({
        isPanic: sanity < 30,
        isUnstable: sanity < 60,
        isLow: sanity < 90
    }), [sanity]);

    const visualFilterClass = useMemo(() => {
        let cls = isNeuralMode ? 'filter-neural-outline brightness-125' : 'filter-naked-eye';
        if (!isNeuralMode) {
            if (isLow) cls += " sepia-[0.3]";
            if (isUnstable) cls += " contrast-150 saturate-[0.4]";
            if (isPanic) cls += " filter-nightmare animate-tear blur-[0.5px]";
        }
        return cls;
    }, [isNeuralMode, isLow, isUnstable, isPanic]);

    const motionClass = useMemo(() => {
        if (isNeuralMode) return "";
        if (isPanic) return "animate-panic";
        if (isUnstable) return isEnemyView ? "animate-tension-shake" : "animate-pan-zoom-deep";
        return isEnemyView ? "animate-enemy-breathe" : "animate-handheld";
    }, [isNeuralMode, isPanic, isUnstable, isEnemyView]);

    const containerStyle = useMemo(() => ({
        opacity: isGenerating ? 0.3 : 1,
        filter: isGenerating ? 'blur(20px) grayscale(1)' : 'none',
        transform: isGenerating ? 'scale(1.1)' : 'scale(1)'
    }), [isGenerating]);

    const emptyStateContent = useMemo(() => {
        if (isNeuralMode) {
            return (
                <div className="w-full h-full relative flex flex-col items-center justify-center">
                    {/* 背景网格 */}
                    <div
                        className="absolute inset-0 bg-[size:40px_40px]"
                        style={{ backgroundImage: `linear-gradient(${colorConfig.primary}0.06) 1px, transparent 1px), linear-gradient(90deg, ${colorConfig.primary}0.06) 1px, transparent 1px)` }}
                    />

                    {/* 噪点层：透明度随噪声等级动态变化 */}
                    <div
                        className="absolute inset-0 pointer-events-none bg-[url('/noise.png')] animate-noise mix-blend-screen"
                        style={{ opacity: Math.min(0.9, neuralNoiseLevel * 0.3), filter: `hue-rotate(${colorConfig.hue})` }}
                    />

                    {/* 脉冲波纹：从中心向外扩散的圆环 */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div
                            className="w-32 h-32 rounded-full border opacity-10 animate-ping"
                            style={{ borderColor: colorConfig.primary + '0.3)' }}
                        />
                        <div
                            className="absolute w-48 h-48 rounded-full border opacity-5 animate-ping"
                            style={{ borderColor: colorConfig.primary + '0.2)', animationDelay: '0.5s' }}
                        />
                    </div>

                    {/* 信号文字 */}
                    <div className="z-10 flex flex-col items-center gap-2">
                        <span
                            className={`text-4xl font-black tracking-[0.3em] font-mono italic ${neuralNoiseLevel > 1.5 ? 'animate-tear text-red-600' : 'animate-chromatic-pulse'}`}
                            style={{ color: neuralNoiseLevel > 1.5 ? undefined : colorConfig.primary + '1)' }}
                        >
                            {isEnemyView ? "HOSTILE_SIG" : "LOST_SIGNAL"}
                        </span>
                        <span className="text-[9px] font-mono tracking-[0.6em] uppercase opacity-60" style={{ color: colorConfig.primary + '0.8)' }}>
                            {isEnemyView ? "Neural tracing targeted entity..." : "Scanning for synaptic handshake..."}
                        </span>
                        {/* 加载进度条装饰 */}
                        <div className="w-40 h-[1px] mt-2 overflow-hidden rounded-full" style={{ backgroundColor: colorConfig.primary + '0.1)' }}>
                            <div
                                className="h-full w-1/3 animate-[scan-line_3s_infinite]"
                                style={{ backgroundColor: colorConfig.primary + '0.6)', boxShadow: `0 0 8px ${colorConfig.primary}0.4)` }}
                            />
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="w-full h-full relative flex flex-col items-center justify-center bg-[#080101]">
                <div className={`absolute inset-0 bg-red-950/20 ${isPanic ? 'animate-pulse bg-red-900/60' : 'animate-[breathe_6s_infinite]'}`} />
                {/* 血丝纹理：低理智时出现的放射状细线 */}
                {isPanic && (
                    <div
                        className="absolute inset-0 opacity-10 pointer-events-none"
                        style={{
                            background: 'repeating-conic-gradient(from 0deg, transparent 0deg, rgba(127,0,0,0.15) 2deg, transparent 4deg)',
                            mixBlendMode: 'screen'
                        }}
                    />
                )}
                <div className="z-10 flex flex-col items-center text-center px-12 opacity-50">
                    <span className={`text-4xl text-red-950 font-serif font-bold tracking-[0.5em] blur-[2px] transition-all duration-1000 ${isPanic ? 'animate-bounce blur-[1px] text-red-800' : ''}`}>
                        {isEnemyView ? "PRESENCE_DET" : (isPanic ? "THEY_ARE_HERE" : "DARKNESS")}
                    </span>
                </div>
            </div>
        );
    }, [isNeuralMode, colorConfig, neuralNoiseLevel, isEnemyView, isPanic]);

    return (
        <div className="absolute inset-0 w-full h-full z-10 overflow-hidden bg-black transition-all duration-1000 ease-out" style={containerStyle}>
            <div className={`w-full h-full ${motionClass} origin-center transition-transform duration-700`}>
                {hasVideo ? (
                    <video
                        src={videoUrl} crossOrigin="anonymous" autoPlay loop muted playsInline
                        className={`w-full h-full object-cover transition-all duration-1000 ${visualFilterClass}`}
                    />
                ) : imageUrl ? (
                    <img
                        src={imageUrl} crossOrigin="anonymous" alt="Visual Feed"
                        className={`w-full h-full object-cover object-center transition-all duration-1000 ${visualFilterClass}`}
                    />
                ) : (
                    <div className="flex items-center justify-center overflow-hidden w-full h-full select-none bg-neutral-950">
                        {emptyStateContent}
                    </div>
                )}
            </div>
        </div>
    );
});

const VisualPanel: React.FC<VisualPanelProps> = (props) => {
    const {
        imageUrl, videoUrl, viewMode, onToggleMode, onToggleMediaType: onToggleMediaTypeProp,
        isCombat, overrideImageUrl, neuralNoiseLevel = 0.1, batteryLevel = 100,
        noiseColor = 'cyan', isFullscreenControlled, onFullscreenChange,
        onManualGen, isGenerating, zoneName, nodeName, nodedesc, threatLevel, sanity, onAction,
        currentNode, nodeId, isSanctuary, onToggleSanctuaryUI,
        onSetNoiseLevel, integrity = 100, onSetNoiseColor,
        onRandomSwitch, hasMultipleVariants, onOpenSettings, currentZone,
        preferredMediaType: preferredMediaTypeProp
    } = props;

    // --- 全屏与布局状态 ---
    const [isFullscreenLocal, setIsFullscreenLocal] = useState(false);
    const isFullscreen = isFullscreenControlled !== undefined ? isFullscreenControlled : isFullscreenLocal;
    const setIsFullscreen = onFullscreenChange || setIsFullscreenLocal;

    const [layoutConfig, setLayoutConfig] = useState<VisualLayoutConfig>(DEFAULT_LAYOUT_CONFIG);
    const [editingComponent, setEditingComponent] = useState<VisualComponentKey | null>(null);

    const [preferredMediaTypeLocal, setPreferredMediaTypeLocal] = useState<'image' | 'video'>(
        preferredMediaTypeProp || 'video'
    );

    useEffect(() => {
        if (preferredMediaTypeProp) {
            setPreferredMediaTypeLocal(preferredMediaTypeProp);
        }
    }, [preferredMediaTypeProp]);

    const preferredMediaType = preferredMediaTypeProp || preferredMediaTypeLocal;

    useEffect(() => {
        try {
            const savedConfig = RenderService.loadLayoutConfig();
            setLayoutConfig(savedConfig);
        } catch (error) {
            console.error("加载布局配置失败:", error);
            setLayoutConfig(DEFAULT_LAYOUT_CONFIG);
        }
    }, []);

    const updateConfig = useCallback((key: VisualComponentKey, newConfig: Partial<VisualTextConfig>) => {
        try {
            setLayoutConfig(prev => {
                const updatedLayout = { ...prev, [key]: { ...prev[key], ...newConfig } };
                RenderService.saveLayoutConfig(updatedLayout);
                return updatedLayout;
            });
        } catch (error) {
            console.error('更新布局配置失败:', error);
        }
    }, []);

    // --- 状态与效果计算 ---
    const isBatteryDead = useMemo(() => batteryLevel <= 0, [batteryLevel]);
    const isNeuralMode = useMemo(() => viewMode === 'camera' && !isBatteryDead, [viewMode, isBatteryDead]);
    const showDeadBatteryStatic = useMemo(() => viewMode === 'camera' && isBatteryDead, [viewMode, isBatteryDead]);

    const displayMedia = useMemo(() => {
        try {
            return RenderService.getDisplayMedia({
                isCombat, preferredMediaType, imageUrl, videoUrl, overrideImageUrl
            });
        } catch (error) {
            console.error('计算显示媒体失败:', error);
            return {
                displayImageUrl: imageUrl || '',
                displayVideoUrl: undefined,
                displayHasVideo: false,
                hasOverride: false
            };
        }
    }, [isCombat, preferredMediaType, imageUrl, videoUrl, overrideImageUrl]);

    const { displayImageUrl, displayVideoUrl, displayHasVideo, hasOverride } = displayMedia;

    const matrixParams = useMemo(() => {
        try {
            const { slope, intercept } = RenderService.calculateMatrixParams(neuralNoiseLevel);
            const c = RenderService.getColorRgb(noiseColor);
            return { slope, intercept, c };
        } catch (error) {
            console.error('计算神经矩阵参数失败:', error);
            return {
                slope: 3,
                intercept: -0.8,
                c: { r: 0, g: 1, b: 1 }
            };
        }
    }, [neuralNoiseLevel, noiseColor]);

    const { slope, intercept, c } = matrixParams;

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (editingComponent) setEditingComponent(null);
                else setIsFullscreen(false);
            }
            if (e.key === 'Tab' && isFullscreen) {
                e.preventDefault();
                try {
                    AudioService.playSfx('click');
                } catch (error) {
                    console.warn('音效播放失败:', error);
                }
                onToggleMode?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen, onToggleMode, editingComponent, setIsFullscreen]);

    const toggleFullscreen = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            AudioService.playSfx(isFullscreen ? 'click' : 'scan');
        } catch (error) {
            console.warn('音效播放失败:', error);
        }
        setIsFullscreen(!isFullscreen);
    }, [isFullscreen, setIsFullscreen]);

    const handleToggleMediaType = useCallback(() => {
        if (onToggleMediaTypeProp) {
            onToggleMediaTypeProp();
        } else {
            setPreferredMediaTypeLocal(prev => prev === 'video' ? 'image' : 'video');
            try {
                AudioService.playSfx('click');
            } catch (error) {
                console.warn('音效播放失败:', error);
            }
        }
    }, [onToggleMediaTypeProp]);

    const containerClasses = useMemo(() => {
        const baseClasses = "w-full h-full relative bg-black overflow-hidden group transition-all duration-500";
        const fullscreenClasses = "fixed inset-0 z-[9999] bg-black flex items-center justify-center animate-in fade-in duration-300";

        return isFullscreen ? fullscreenClasses : baseClasses;
    }, [isFullscreen]);

    // --- 提取防抖&缓存的回调函数以免破坏子组件的 React.memo ---
    const handleSetEditingZoneName = useCallback(() => setEditingComponent('zoneName'), [setEditingComponent]);
    const handleUpdateZoneName = useCallback((conf: Partial<VisualTextConfig>) => updateConfig('zoneName', conf), [updateConfig]);

    const handleSetEditingNodeName = useCallback(() => setEditingComponent('nodeName'), [setEditingComponent]);
    const handleUpdateNodeName = useCallback((conf: Partial<VisualTextConfig>) => updateConfig('nodeName', conf), [updateConfig]);

    const handleSetEditingThreatLevel = useCallback(() => setEditingComponent('threatLevel'), [setEditingComponent]);
    const handleUpdateThreatLevel = useCallback((conf: Partial<VisualTextConfig>) => updateConfig('threatLevel', conf), [updateConfig]);

    const handleSetEditingdesc = useCallback(() => setEditingComponent('desc'), [setEditingComponent]);
    const handleUpdatedesc = useCallback((conf: Partial<VisualTextConfig>) => updateConfig('desc', conf), [updateConfig]);

    const handleCloseEditingComponent = useCallback(() => setEditingComponent(null), [setEditingComponent]);

    const handleUpdateEditingComponent = useCallback((newConfig: Partial<VisualTextConfig>) => {
        if (editingComponent) {
            updateConfig(editingComponent, newConfig);
        }
    }, [editingComponent, updateConfig]);

    const memoizedOnRandomSwitch = useCallback(async (mediaType: 'image' | 'video') => {
        if (onRandomSwitch) {
            const currentUrl = mediaType === 'image' ? imageUrl : videoUrl;
            return await onRandomSwitch(mediaType, 'scene', nodeId, currentUrl);
        }
        return null;
    }, [onRandomSwitch, imageUrl, videoUrl, nodeId]);

    const memoizedHasMultipleVariants = useCallback(async (mediaType: 'image' | 'video') => {
        if (hasMultipleVariants) {
            return hasMultipleVariants(mediaType);
        }
        return false;
    }, [hasMultipleVariants]);
    // -----------------------------------------------------------------

    // --- 动态滤镜定义 ---
    const filterDefinition = useMemo(() => (
        <svg className="absolute w-0 h-0 pointer-events-none">
            <defs>
                <filter id="neural-scanner-final" colorInterpolationFilters="sRGB">
                    <feColorMatrix in="SourceGraphic" type="saturate" values="0" result="GRAY" />
                    <feConvolveMatrix in="GRAY" order="3" kernelMatrix="0 -1 0  -1 4 -1  0 -1 0" preserveAlpha="true" result="RAW_EDGES" />
                    <feColorMatrix in="RAW_EDGES" type="matrix" values={`${slope} 0 0 0 ${intercept} 0 ${slope} 0 0 ${intercept} 0 0 ${slope} 0 ${intercept} 0 0 0 1 0`} result="AMPLIFIED_EDGES" />
                    <feColorMatrix in="AMPLIFIED_EDGES" type="matrix" values={`${c.r} 0 0 0 0 ${c.g} 0 0 0 0 ${c.b} 0 0 0 0 0 0 0 1 0`} result="FINAL" />
                </filter>
            </defs>
        </svg>
    ), [slope, intercept, c]);

    // --- 主渲染逻辑 ---
    const mainContent = (
        <div className={containerClasses}>
            {filterDefinition}

            {/* 视觉分层渲染 */}
            {showDeadBatteryStatic ? (
                <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 animate-noise" />
                    <div className="absolute inset-0 animate-glitch-slice opacity-30 bg-red-900/10" />
                    <div className="text-center z-10 pointer-events-none">
                        <div className="text-red-500 font-mono text-2xl animate-pulse tracking-widest mb-2 animate-chromatic-pulse">
                            SIGNAL LOST
                        </div>
                        <div className="text-gray-500 font-mono text-xs tracking-wider">
                            BATTERY DEPLETED // SWITCH TO BIO-VISION
                        </div>
                        <div className="text-gray-700 font-mono text-[8px] mt-3 tracking-[0.3em]">
                            ERR::0xDEAD // PWR_UNIT_FAILURE
                        </div>
                    </div>
                </div>
            ) : (
                <div className="absolute inset-0 bg-black transition-all duration-300" style={{ filter: isNeuralMode ? 'url(#neural-scanner-final)' : 'none' }}>
                    <MediaLayer
                        imageUrl={displayImageUrl}
                        videoUrl={displayVideoUrl}
                        hasVideo={displayHasVideo}
                        isNeuralMode={false}
                        sanity={sanity}
                        isGenerating={isGenerating}
                        isEnemyView={hasOverride}
                        noiseColor={noiseColor}
                    />
                </div>
            )}

            <AtmosphereLayer isNeuralMode={isNeuralMode} sanity={sanity} />
            <HUDLayer
                isNeuralMode={isNeuralMode}
                isFullscreen={isFullscreen}
                sanity={sanity}
                isGenerating={isGenerating}
                noiseColor={noiseColor}
            />

            {editingComponent && (
                <ConfigPanel
                    title={editingComponent.toUpperCase()}
                    config={layoutConfig[editingComponent]}
                    defaultConfig={DEFAULT_LAYOUT_CONFIG[editingComponent]}
                    onUpdate={handleUpdateEditingComponent}
                    onClose={handleCloseEditingComponent}
                />
            )}

            {!isCombat && (
                <>
                    <ZoneName text={zoneName} config={layoutConfig.zoneName} isFullscreen={isFullscreen} onClick={handleSetEditingZoneName} onUpdate={handleUpdateZoneName} />
                    <NodeName text={nodeName} config={layoutConfig.nodeName} isFullscreen={isFullscreen} onClick={handleSetEditingNodeName} onUpdate={handleUpdateNodeName} />
                    <ThreatLevel value={threatLevel} config={layoutConfig.threatLevel} isFullscreen={isFullscreen} onClick={handleSetEditingThreatLevel} onUpdate={handleUpdateThreatLevel} />
                    <Nodedesc text={nodedesc} config={layoutConfig.desc} isFullscreen={isFullscreen} onClick={handleSetEditingdesc} onUpdate={handleUpdatedesc} />

                    {/* 还原：行动组件改回原本的底栏结构 */}
                    {!isFullscreen && currentNode && (
                        <div className="absolute bottom-0 left-0 right-0 z-40 h-16 pointer-events-none">
                            <div className="pointer-events-auto h-full">
                                <Action
                                    currentNodeId={nodeId}
                                    currentNode={currentNode}
                                    onAction={onAction}
                                    isSanctuary={isSanctuary}
                                    onToggleSanctuaryUI={onToggleSanctuaryUI}
                                    nodes={currentZone ? currentZone.nodes : undefined}
                                />
                            </div>
                        </div>
                    )}

                    <Control
                        isGenerating={isGenerating}
                        videoUrl={videoUrl}
                        imageUrl={imageUrl}
                        isNeuralMode={isNeuralMode}
                        isFullscreen={isFullscreen}
                        onManualGen={onManualGen}
                        onToggleMode={onToggleMode}
                        toggleFullscreen={toggleFullscreen}
                        noiseLevel={neuralNoiseLevel}
                        onSetNoiseLevel={onSetNoiseLevel}
                        integrity={integrity}
                        battery={batteryLevel}
                        noiseColor={noiseColor}
                        onSetNoiseColor={onSetNoiseColor}
                        onRandomSwitch={onRandomSwitch ? memoizedOnRandomSwitch : undefined}
                        hasMultipleVariants={hasMultipleVariants ? memoizedHasMultipleVariants : async () => false}
                        onOpenSettings={onOpenSettings}
                        preferredMediaType={preferredMediaType}
                        onToggleMediaType={handleToggleMediaType}
                        nodeId={nodeId}
                    />
                </>
            )}

            {isFullscreen && (
                <div className="absolute top-4 right-4 text-[10px] font-mono text-white/30 pointer-events-none flex flex-col items-end gap-1 select-none">
                    <div className="animate-pulse flex items-center gap-2 px-2 py-1 rounded bg-black/20 backdrop-blur-sm animate-chromatic-pulse">
                        <span className="tracking-wider">[ESC] TO EXIT</span>
                        <Icons.Maximize />
                    </div>
                    <span className="text-[7px] text-white/15 tracking-widest">[TAB] SWITCH MODE</span>
                </div>
            )}
        </div>
    );

    return isFullscreen ? createPortal(mainContent, document.body) : mainContent;
};

export default React.memo(VisualPanel);
