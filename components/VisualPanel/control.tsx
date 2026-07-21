/**
 * control.tsx - 视觉交互控制器
 * 
 * 承载左侧硬体状态监测（电量/完整度）与右侧操作面板（扫描参数、模式切换、全屏等）。
 * 所有按钮均使用 glass-panel + btn-hover-active 的统一视觉语言。
 */
import React, { useState } from 'react';
import { Icons } from './Icons';
import { AudioService } from '../../services';
import { NoiseColorConfig } from '../../meta';

const NOISE_COLORS: NoiseColorConfig[] = [
    { id: 'cyan', label: 'CYAN', primary: 'cyan', hue: '180deg', hex: '#06b6d4' },
    { id: 'green', label: 'GREEN', primary: 'emerald', hue: '140deg', hex: '#10b981' },
    { id: 'red', label: 'RED', primary: 'red', hue: '0deg', hex: '#ef4444' },
    { id: 'purple', label: 'PURPLE', primary: 'purple', hue: '280deg', hex: '#a855f7' },
    { id: 'amber', label: 'AMBER', primary: 'amber', hue: '45deg', hex: '#f59e0b' },
];

interface ControlProps {
    isGenerating: boolean;
    videoUrl?: string;
    imageUrl?: string;
    isNeuralMode: boolean;
    isFullscreen: boolean;
    onManualGen: (type: 'scene' | 'enemy' | 'npc' | 'player', mediaType?: 'image' | 'video') => void;
    onToggleMode: () => void;
    toggleFullscreen: (e: React.MouseEvent) => void;
    noiseLevel?: number;
    onSetNoiseLevel?: (level: number) => void;
    integrity?: number;
    battery?: number;
    noiseColor?: string;
    onSetNoiseColor?: (color: string) => void;
    onRandomSwitch?: (mediaType: 'image' | 'video', type: 'scene' | 'enemy' | 'npc', nodeId?: string, currentUrl?: string) => Promise<string | null>;
    hasMultipleVariants?: (mediaType: 'image' | 'video') => Promise<boolean>;
    onOpenSettings?: () => void;
    preferredMediaType?: 'image' | 'video';
    onToggleMediaType?: () => void;
    nodeId?: string;
}

/**
 * StatusBar - 垂直状态检测条组件
 * 
 * 设计意图：
 * 1. 拟物化反馈：通过垂直进度条模拟工业设备的物理仪表，强化“硬体状态监测”的叙事感。
 * 2. 紧急视觉分级：根据阈值（Threshold）动态切换颜色并引入呼吸动画，在视觉上将“正常、预警、临界”三个阶段明确区分，引导用户关注生存资源。
 */
const StatusBar: React.FC<{
    /** 当前值 0-100 */
    value: number;
    /** 状态标签 */
    label: string;
    /** 正常状态色 */
    normalColor: string;
    /** 中间状态色 */
    midColor: string;
    /** 危险状态色 */
    dangerColor: string;
    /** 低阈值（低于此值进入中间） */
    midThreshold: number;
    /** 危险阈值（低于此值进入危险） */
    dangerThreshold: number;
}> = React.memo(({ value, label, normalColor, midColor, dangerColor, midThreshold, dangerThreshold }) => {
    /* 逻辑：优先判断危险等级，确保在资源极度匮乏时触发红色警报动画 */
    const isDanger = value < dangerThreshold;
    const isMid = value < midThreshold;
    const barColor = isDanger ? dangerColor : isMid ? midColor : normalColor;
    const textColorClass = isDanger ? 'text-red-500 animate-pulse' : 'text-gray-500';

    const barStyle = React.useMemo(() => ({
        height: `${value}%`,
        backgroundColor: barColor,
        /* 增加辉光效果：模拟发光二极管在暗处散射的光晕 */
        boxShadow: `0 0 8px ${barColor}80, 0 0 16px ${barColor}30`
    }), [value, barColor]);

    return (
        <div className="flex flex-col items-center gap-1.5 group pointer-events-auto" title={`${label}: ${value}%`}>
            <div className="w-[3px] h-14 bg-gray-800/60 rounded-full overflow-hidden relative">
                <div
                    className="absolute bottom-0 w-full transition-all duration-1000 rounded-full"
                    style={barStyle}
                />
            </div>
            <span className={`text-[7px] font-mono font-bold tracking-wider ${textColorClass}`}>
                {label}
            </span>
            {/* 隐藏数据面板：仅在 hover 时通过渐显提供具体百分比，平时保持 HUD 界面的简洁 */}
            <span className="text-[6px] font-mono opacity-0 group-hover:opacity-60 transition-opacity text-white/60 tabular-nums">
                {value}%
            </span>
        </div>
    );
});

/**
 * Control - 视觉面板全局控制器
 * 
 * 功能定位：
 * 1. 硬体端（左侧）：实时监控电池与完整度，提供生存压力的视觉反馈。
 * 2. 逻辑/生成端（右侧）：调节神经扫描等级、切换媒体模式、全屏等核心操作。
 */
export const Control: React.FC<ControlProps> = React.memo(({
    isGenerating, videoUrl, imageUrl, isNeuralMode, isFullscreen,
    onManualGen, onToggleMode, toggleFullscreen,
    noiseLevel = 0.1, onSetNoiseLevel,
    integrity = 100, battery = 100,
    noiseColor = 'cyan', onSetNoiseColor,
    onRandomSwitch,
    onOpenSettings,
    preferredMediaType = 'video', onToggleMediaType,
    nodeId
}) => {
    const [showColorPicker, setShowColorPicker] = useState(false);
    /* 缓存当前色系配置，避免因 noiseColor 变化导致的大规模重算 */
    const currentColorConfig = React.useMemo(() => NOISE_COLORS.find(c => c.id === noiseColor) || NOISE_COLORS[0], [noiseColor]);

    return (
        <>
            {/* 左侧：硬体状态监测 */}
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 z-40 pointer-events-none flex flex-col gap-6 pl-3 transition-all duration-700 ${isFullscreen ? 'opacity-20' : 'opacity-90'}`}>
                <StatusBar
                    value={battery}
                    label="BAT"
                    normalColor="#10b981"
                    midColor="#eab308"
                    dangerColor="#ef4444"
                    midThreshold={50}
                    dangerThreshold={20}
                />
                <StatusBar
                    value={integrity}
                    label="INT"
                    normalColor="#06b6d4"
                    midColor="#f59e0b"
                    dangerColor="#ef4444"
                    midThreshold={60}
                    dangerThreshold={30}
                />
            </div>

            {/* 右侧：操作面板 */}
            <div className={`absolute right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-4 pr-3 transition-all duration-700 ${isFullscreen ? 'opacity-0 translate-x-12' : 'opacity-100 translate-x-0'}`}>

                {/* 神经扫描参数调节器 */}
                {isNeuralMode && onSetNoiseLevel && (
                    <div className="glass-panel-glow p-2 rounded-full flex flex-col items-center gap-3">
                        <span className="text-[7px] font-mono text-cyan-600/70 uppercase tracking-tighter writing-mode-vertical rotate-180">GAIN_SCAN</span>

                        {/* 垂直 Range Input + 视觉轨道 */}
                        <div className="h-20 w-4 relative flex justify-center items-center">
                            <input
                                type="range"
                                min="0" max="3" step="0.1"
                                value={noiseLevel}
                                onChange={(e) => onSetNoiseLevel(parseFloat(e.target.value))}
                                className="absolute z-20 opacity-0 cursor-pointer"
                                style={{ width: '80px', height: '16px', transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                            />
                            <div className="absolute h-full w-[3px] bg-white/5 rounded-full overflow-hidden z-10 pointer-events-none">
                                <div
                                    className="absolute bottom-0 w-full transition-all duration-100 ease-out rounded-full"
                                    style={{
                                        height: `${(noiseLevel / 3) * 100}%`,
                                        backgroundColor: currentColorConfig.hex,
                                        boxShadow: `0 0 10px ${currentColorConfig.hex}, 0 0 20px ${currentColorConfig.hex}40`
                                    }}
                                />
                            </div>
                            {/* 刻度标记 */}
                            <div className="absolute h-full w-6 right-0 flex flex-col justify-between pointer-events-none py-1">
                                {[0, 1, 2, 3].map(v => (
                                    <div key={v} className="flex items-center gap-1">
                                        <div className="w-1 h-[1px] bg-white/10" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 噪声颜色选择器 */}
                        {onSetNoiseColor && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowColorPicker(!showColorPicker)}
                                    className="w-5 h-5 rounded-full border border-white/20 transition-all hover:scale-110 btn-hover-active"
                                    style={{
                                        backgroundColor: currentColorConfig.hex,
                                        boxShadow: `0 0 8px ${currentColorConfig.hex}40, 0 0 16px ${currentColorConfig.hex}20`
                                    }}
                                />
                                {showColorPicker && (
                                    <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 glass-panel-glow rounded-full p-1.5 flex flex-col gap-2">
                                        {NOISE_COLORS.map(color => (
                                            <button
                                                key={color.id}
                                                onClick={() => { onSetNoiseColor(color.id); setShowColorPicker(false); AudioService.playSfx('click'); }}
                                                className={`w-4 h-4 rounded-full border transition-all hover:scale-125 ${noiseColor === color.id ? 'border-white scale-110' : 'border-transparent opacity-60'}`}
                                                style={{
                                                    backgroundColor: color.hex,
                                                    boxShadow: noiseColor === color.id ? `0 0 10px ${color.hex}60` : 'none'
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* 主功能触发群组 */}
                <div className="glass-panel-glow p-2 rounded-full flex flex-col gap-3 pointer-events-auto">
                    {/* 媒体类型切换 */}
                    {onToggleMediaType && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleMediaType(); }}
                            className={`w-8 h-8 flex items-center justify-center rounded-full border transition-all btn-hover-active ${preferredMediaType === 'video' ? 'border-purple-500/30 text-purple-400 bg-purple-900/10' : 'border-blue-500/30 text-blue-400 bg-blue-900/10'}`}
                        >
                            <span className="text-[7px] font-black tracking-tighter">{preferredMediaType === 'video' ? 'STREAM' : 'STILL'}</span>
                        </button>
                    )}

                    {/* 生成按钮 */}
                    <button
                        disabled={isGenerating}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isGenerating) return;
                            onManualGen('scene', preferredMediaType);
                        }}
                        className={`group relative w-8 h-8 flex items-center justify-center rounded-full border transition-all btn-hover-active ${isGenerating ? 'opacity-30 cursor-not-allowed' : 'opacity-80 hover:opacity-100'} ${preferredMediaType === 'video' ? 'border-purple-600/40 text-purple-500' : 'border-red-600/40 text-red-500'}`}
                    >
                        <span className={`transition-transform duration-700 scale-90 ${isGenerating ? 'animate-spin' : 'group-hover:rotate-180'}`}>
                            {preferredMediaType === 'video' ? <Icons.Play /> : <Icons.Eye />}
                        </span>
                    </button>

                    {/* 随机切换 */}
                    {onRandomSwitch && (
                        <button
                            disabled={isGenerating}
                            onClick={async (e) => {
                                e.stopPropagation();
                                if (isGenerating) return;
                                const currentUrl = preferredMediaType === 'image' ? imageUrl : videoUrl;
                                await onRandomSwitch(preferredMediaType, 'scene', nodeId, currentUrl);
                            }}
                            className={`w-8 h-8 flex items-center justify-center rounded-full border transition-all btn-hover-active ${isGenerating ? 'opacity-30 cursor-not-allowed' : 'opacity-80 hover:opacity-100'} border-white/10 text-white/60`}
                        >
                            <span className="scale-75 text-xs">{preferredMediaType === 'video' ? '🎬' : '🎲'}</span>
                        </button>
                    )}

                    {/* 功能分隔线 */}
                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-0.5" />

                    {/* 模式切换 */}
                    <button
                        onClick={(e) => { e.stopPropagation(); AudioService.playSfx('click'); onToggleMode(); }}
                        className={`w-8 h-8 flex items-center justify-center rounded-full border transition-all btn-hover-active ${isNeuralMode ? 'border-cyan-500/40 text-cyan-400 bg-cyan-900/10' : 'border-white/10 text-white/40'}`}
                        title="切换神经模式"
                        style={isNeuralMode ? { boxShadow: '0 0 12px rgba(6,182,212,0.15)' } : {}}
                    >
                        <span className="text-[10px] font-mono font-bold tracking-tighter">{isNeuralMode ? 'NEU' : 'BIO'}</span>
                    </button>

                    {/* 全屏 */}
                    <button
                        onClick={toggleFullscreen}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-white/10 text-white/40 hover:text-white/80 transition-all btn-hover-active"
                        title="影院模式"
                    >
                        <span className="scale-75"><Icons.Fullscreen /></span>
                    </button>

                    {/* 设置 */}
                    <button
                        onClick={(e) => { e.stopPropagation(); AudioService.playSfx('click'); onOpenSettings?.(); }}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-white/10 text-white/40 hover:text-white/80 transition-all btn-hover-active"
                    >
                        <span className="scale-75"><Icons.Settings /></span>
                    </button>
                </div>
            </div>
        </>
    );
});
