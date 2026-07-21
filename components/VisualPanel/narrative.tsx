/**
 * narrative.tsx - 叙事文本展示系统
 * 
 * 本组件库负责沉浸式文本的渲染与空间管理，包含：
 * 1. 区域与节点名 (Zone/Node Name)：采用楷体字重，融合古典与赛博朋克的冲突美学。
 * 2. 威胁等级 (Threat Level)：实时的动态条形图反馈，增强临场紧迫感。
 * 3. 节点描述 (Node desc)：底端居中的叙事文本，配合淡入动画。
 * 4. 样式配置器 (ConfigPanel)：允许在运行时可视化调节文本属性。
 * 
 * 所有文本组件均支持拖拽定位，位置信息持久化至 localStorage。
 */
import React from 'react';
import { AudioService } from '../../services';
import { VisualTextConfig } from '../../meta';
import { DEFAULT_TEXT_CONFIG } from '../../constants/config';

// --- 类型定义 ---

interface ConfigPanelProps {
    title: string;
    config: VisualTextConfig;
    defaultConfig?: VisualTextConfig;
    onUpdate: (newConfig: Partial<VisualTextConfig>) => void;
    onClose: () => void;
}

interface CommonProps {
    text: string;
    config: VisualTextConfig;
    isFullscreen: boolean;
    onUpdate: (newConfig: Partial<VisualTextConfig>) => void;
    onClick: () => void;
}

interface ThreatLevelProps {
    value: number;
    config: VisualTextConfig;
    isFullscreen: boolean;
    onClick: () => void;
    onUpdate: (newConfig: Partial<VisualTextConfig>) => void;
}

// --- 常量配置 ---

/** 预置视觉色系 */
const COLORS = [
    { name: '灰', value: '#d1d5db' },
    { name: '赤', value: '#f87171' },
    { name: '琥', value: '#fbbf24' },
    { name: '青', value: '#22d3ee' },
    { name: '紫', value: '#a855f7' },
    { name: '翠', value: '#34d399' },
];

/** 楷体字体族：用于增强神秘/传统叙事感 */
const KAI_TI_FONT_STACK = '"KaiTi", "STKaiti", "楷体", serif';

// --- 共享工具 ---

/**
 * useDragHandler - 拖拽行为的统一钩子逻辑
 */
const createDragHandler = (
    isFullscreen: boolean,
    config: VisualTextConfig,
    onUpdate: (conf: Partial<VisualTextConfig>) => void,
    onClick: () => void,
    isDraggingRef: React.MutableRefObject<boolean>,
    /** X轴移动方向：1 表示正向，-1 表示反向（用于右对齐元素） */
    xDirection: number = 1,
    /** Y轴移动方向：1 表示正向，-1 表示反向（用于底对齐元素） */
    yDirection: number = 1,
    defaultX: number = 0,
    defaultY: number = 0
) => (e: React.MouseEvent) => {
    if (isFullscreen) return;
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX; const startY = e.clientY;
    const startConfigX = config.x ?? defaultX; const startConfigY = config.y ?? defaultY;
    isDraggingRef.current = true;

    const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isDraggingRef.current) return;
        onUpdate({
            x: startConfigX + xDirection * (moveEvent.clientX - startX),
            y: startConfigY + yDirection * (moveEvent.clientY - startY)
        });
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        isDraggingRef.current = false;
        const dist = Math.sqrt(Math.pow(upEvent.clientX - startX, 2) + Math.pow(upEvent.clientY - startY, 2));
        if (dist < 5) { AudioService.playSfx('click'); onClick(); }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
};

// --- 核心组件实现 ---

/**
 * 样式配置面板：利用 glass-panel-glow 提供高级的可视化配置界面。
 */
export const ConfigPanel: React.FC<ConfigPanelProps> = React.memo(({
    title, config, defaultConfig, onUpdate, onClose
}) => {
    const panelRef = React.useRef<HTMLDivElement>(null);

    /* 点击面板外部自动关闭 */
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    /* 根据属性名自动推断锚点语义 */
    const anchorInfo = React.useMemo(() => {
        const t = title.toUpperCase();
        if (t.includes('ZONENAME')) return { label: '锚点: 左上角', xLabel: '横向边距', yLabel: '纵向边距' };
        if (t.includes('NODENAME')) return { label: '锚点: 顶端居中', xLabel: '横向偏移', yLabel: '顶端边距' };
        if (t.includes('THREAT')) return { label: '锚点: 右上角', xLabel: '右侧边距', yLabel: '纵向边距' };
        if (t.includes('desc')) return { label: '锚点: 底端居中', xLabel: '横向偏移', yLabel: '底端边距' };
        return { label: '坐标: 绝对定位', xLabel: '坐标 X', yLabel: '坐标 Y' };
    }, [title]);

    return (
        <div
            ref={panelRef}
            className="absolute z-[100] w-72 p-5 animate-in fade-in zoom-in-95 duration-300 glass-panel-glow rounded-lg shadow-2xl"
            style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* 顶部标题栏 */}
            <div className="flex justify-between items-start mb-4 pb-2 border-b border-white/10">
                <div className="flex flex-col">
                    <span className="text-[11px] font-mono text-cyan-400 tracking-[0.2em] font-black animate-chromatic-pulse">
                        MANIFEST_CONFIG :: {title}
                    </span>
                    <span className="text-[9px] font-mono text-white/30 mt-1 uppercase">{anchorInfo.label}</span>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => { AudioService.playSfx('click'); onUpdate(defaultConfig || DEFAULT_TEXT_CONFIG); }}
                        className="text-[9px] text-white/40 hover:text-red-400 font-mono transition-colors"
                    >
                        RESET
                    </button>
                    <button onClick={onClose} className="text-[10px] text-white/40 hover:text-white transition-colors">✕</button>
                </div>
            </div>

            <div className="space-y-5">
                {/* 坐标控制区 */}
                <div className="grid grid-cols-2 gap-3 pb-4 border-b border-white/5">
                    <div className="flex flex-col gap-1">
                        <span className="text-[8px] text-white/30 font-mono uppercase">{anchorInfo.xLabel}</span>
                        <input type="number" value={config.x ?? 0} onChange={(e) => onUpdate({ x: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs font-mono text-emerald-400 outline-none focus:border-cyan-500/50 transition-colors" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[8px] text-white/30 font-mono uppercase">{anchorInfo.yLabel}</span>
                        <input type="number" value={config.y ?? 0} onChange={(e) => onUpdate({ y: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs font-mono text-emerald-400 outline-none focus:border-cyan-500/50 transition-colors" />
                    </div>
                </div>

                {/* 滑动调节区 */}
                <div className="space-y-4">
                    {[
                        { label: 'FONT_SIZE', value: config.fontSize, unit: 'PX', min: 8, max: 72, step: 1, key: 'fontSize' },
                        { label: 'LETTER_SPACING', value: config.letterSpacing || 0, unit: 'PX', min: 0, max: 30, step: 0.5, key: 'letterSpacing' },
                        { label: 'GLOW_STRENGTH', value: config.glowIntensity, unit: '%', min: 0, max: 3, step: 0.1, key: 'glowIntensity', displayValue: `${(config.glowIntensity * 100).toFixed(0)}%` },
                        { label: 'OPACITY_ALPHA', value: config.opacity, unit: '%', min: 0.1, max: 1, step: 0.1, key: 'opacity', displayValue: `${(config.opacity * 100).toFixed(0)}%` },
                    ].map(item => (
                        <div key={item.label} className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-[8px] font-mono text-white/40">
                                <span>{item.label}</span>
                                <span className="text-data">{item.displayValue ?? `${item.value}${item.unit}`}</span>
                            </div>
                            <input
                                type="range"
                                min={item.min} max={item.max} step={item.step}
                                value={item.value}
                                onChange={(e) => onUpdate({ [item.key]: Number(e.target.value) })}
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                            />
                        </div>
                    ))}
                </div>

                {/* 调色盘 */}
                <div className="flex justify-between pt-3 border-t border-white/10">
                    {COLORS.map((col) => (
                        <button
                            key={col.name}
                            onClick={() => onUpdate({ color: col.value })}
                            className={`w-7 h-7 rounded-sm border-2 transition-all hover:scale-110 ${config.color === col.value ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'border-transparent opacity-40 hover:opacity-100'}`}
                            style={{ backgroundColor: col.value }}
                            title={col.name}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
});

/**
 * 区域名称 (ZoneName)
 * 
 * 视觉意图：
 * 采用楷体结合极简修饰线的排版，旨在创造一种“传统档案”与“数字流”交汇的错位感。
 * 布局位于左上角，作为场景识别的第一优先级信息。
 */
export const ZoneName: React.FC<CommonProps> = React.memo(({ text, config, isFullscreen, onUpdate, onClick }) => {
    const isDragging = React.useRef(false);
    /* 逻辑：通过 X/Y 方向参数适配锚点位置（左上为 1,1） */
    const handleMouseDown = React.useMemo(() => createDragHandler(isFullscreen, config, onUpdate, onClick, isDragging, 1, 1, 40, 40), [isFullscreen, config, onUpdate, onClick]);

    const lineStyle = React.useMemo(() => ({
        backgroundColor: config.color,
        boxShadow: `0 0 10px ${config.color}, 0 0 20px ${config.color}40`
    }), [config.color]);

    const textStyle = React.useMemo(() => ({
        fontFamily: KAI_TI_FONT_STACK,
        color: config.color,
        fontSize: `${config.fontSize}px`,
        textShadow: `0 0 ${config.glowIntensity * 12}px ${config.color}, 0 0 ${config.glowIntensity * 25}px ${config.color}40`,
        opacity: config.opacity,
        letterSpacing: `${config.letterSpacing}px`
    }), [config]);

    const decorationStyle = React.useMemo(() => ({
        width: '60%',
        background: `linear-gradient(90deg, ${config.color}, transparent)`
    }), [config.color]);

    return (
        <div className={`absolute z-40 transition-opacity duration-1000 ${isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`} style={{ left: `${config.x}px`, top: `${config.y}px` }}>
            <div onMouseDown={handleMouseDown} className="transition-all select-none flex items-center relative cursor-grab active:cursor-grabbing group">
                <div className="h-full absolute left-0 top-0 bottom-0 w-[3px] opacity-70 rounded-full" style={lineStyle} />
                <div className="pl-5 py-2 flex flex-col items-start bg-black/10 backdrop-blur-[2px] rounded-r group-hover:bg-black/40 transition-all">
                    <div className="uppercase tracking-[0.3em] font-medium" style={textStyle}>
                        {text}
                    </div>
                    <div className="h-[1px] mt-1 opacity-20 group-hover:opacity-40 transition-opacity" style={decorationStyle} />
                </div>
            </div>
        </div>
    );
});

/**
 * 节点名称 (NodeName)
 * 
 * 视觉意图：
 * 作为屏幕的中轴重点，使用更强的辉光、菱形符号和仪式感的水平线，定义空间的探索深度。
 * 居中对齐设计旨在引导玩家的视觉核心，建立宏大的场景基调。
 */
export const NodeName: React.FC<CommonProps> = React.memo(({ text, config, isFullscreen, onUpdate, onClick }) => {
    const isDragging = React.useRef(false);
    const handleMouseDown = React.useMemo(() => createDragHandler(isFullscreen, config, onUpdate, onClick, isDragging, 1, 1, 0, 100), [isFullscreen, config, onUpdate, onClick]);

    const topLineStyle = React.useMemo(() => ({
        background: `linear-gradient(90deg, transparent, ${config.color}, transparent)`,
        boxShadow: `0 0 10px ${config.color}40`
    }), [config.color]);

    const titleStyle = React.useMemo(() => ({
        fontFamily: KAI_TI_FONT_STACK,
        color: config.color,
        fontSize: `${config.fontSize}px`,
        textShadow: `0 0 ${config.glowIntensity * 20}px ${config.color}, 0 0 ${config.glowIntensity * 40}px ${config.color}30`,
        opacity: config.opacity,
        letterSpacing: `${config.letterSpacing}px`
    }), [config]);

    const decorationLineStyle = React.useMemo(() => ({
        width: '60px',
        height: '1px',
        background: `linear-gradient(90deg, transparent, ${config.color}, transparent)`,
        opacity: 0.6
    }), [config.color]);

    return (
        <div
            className={`absolute z-40 transition-opacity duration-700 ${isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
            style={{
                left: '50%',
                top: `${config.y}px`,
                transform: `translateX(calc(-50% + ${config.x}px))`,
                whiteSpace: 'nowrap'
            }}
        >
            <div
                onMouseDown={handleMouseDown}
                className={`px-14 py-4 select-none relative cursor-grab active:cursor-grabbing group transition-transform duration-500 ${isFullscreen ? '-translate-y-4' : 'translate-y-0'}`}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/50 to-transparent backdrop-blur-[1px] -z-10 group-hover:via-black/70 transition-all" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[1px] opacity-40" style={topLineStyle} />
                <h1 className="leading-tight tracking-[0.2em] font-bold text-center drop-shadow-lg" style={titleStyle}>
                    {text}
                </h1>
                {/* 装饰细节：通过简单的几何图形增加“秘仪”感 */}
                <div className="flex justify-center items-center gap-3 mt-2 opacity-50">
                    <span className="text-[6px] rotate-45" style={{ color: config.color, textShadow: `0 0 5px ${config.color}` }}>■</span>
                    <div style={decorationLineStyle} />
                    <span className="text-[6px] rotate-45" style={{ color: config.color, textShadow: `0 0 5px ${config.color}` }}>■</span>
                </div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50%] h-[1px] opacity-10 group-hover:opacity-25 transition-opacity" style={{ background: `linear-gradient(90deg, transparent, ${config.color}, transparent)` }} />
            </div>
        </div>
    );
});

/**
 * 威胁等级 (ThreatLevel)
 * 
 * 视觉意图：
 * 动态条形图模拟心率监测或盖格计数器的脉冲，通过填充比例直观传达环境的恶意程度。
 * 位于右上角，符合 HUD 习惯性的状态监控区域。
 */
export const ThreatLevel: React.FC<ThreatLevelProps> = React.memo(({ value, config, isFullscreen, onClick, onUpdate }) => {
    const isDragging = React.useRef(false);
    /* 逻辑：反转 X 方向（-1），使拖拽位移与右对齐锚点保持物理感一致 */
    const handleMouseDown = React.useMemo(() => createDragHandler(isFullscreen, config, onUpdate, onClick, isDragging, -1, 1, 40, 40), [isFullscreen, config, onUpdate, onClick]);

    if (value <= 0) return null;

    const isHighThreat = value >= 70;
    const isCriticalThreat = value >= 90;

    return (
        <div
            className={`absolute z-40 transition-opacity duration-700 ${isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
            style={{ right: `${config.x}px`, top: `${config.y}px` }}
        >
            <div
                onMouseDown={handleMouseDown}
                className={`cursor-grab active:cursor-grabbing group flex flex-col items-end gap-2 px-4 py-3 bg-black/40 backdrop-blur-md border-r-4 rounded-l-sm select-none transition-all duration-500 ${isFullscreen ? 'translate-x-4 opacity-0' : 'translate-x-0 opacity-100'} ${isCriticalThreat ? 'animate-glitch-text' : ''}`}
                style={{ borderColor: config.color }}
            >
                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end leading-none">
                        <span className="text-[7px] font-mono opacity-40 tracking-[0.3em] font-black" style={{ color: config.color }}>THREAT_LEVEL</span>
                        <span className="text-[6px] font-mono opacity-20 uppercase tracking-tighter" style={{ color: config.color }}>
                            {isHighThreat ? 'WARNING: HIGH DANGER ZONE' : 'Real-time sensor data active'}
                        </span>
                    </div>
                    <span
                        className={`font-mono font-black italic tabular-nums ${isHighThreat ? 'animate-pulse' : ''}`}
                        style={{
                            color: config.color,
                            fontSize: `${config.fontSize * 1.5}px`,
                            textShadow: `0 0 ${config.glowIntensity * 15}px ${config.color}, 0 0 ${config.glowIntensity * 30}px ${config.color}40`,
                            opacity: config.opacity,
                            letterSpacing: `${config.letterSpacing}px`
                        }}
                    >
                        {value}%
                    </span>
                </div>
                <div className="flex gap-[3px] items-end justify-end w-32 h-3">
                    {[...Array(24)].map((_, i) => {
                        const isFilled = value >= (i / 24) * 100;
                        return (
                            <div
                                key={i}
                                className="w-full transition-all duration-700 rounded-t-[1px]"
                                style={{
                                    height: isFilled ? `${60 + (i / 24) * 40}%` : '30%',
                                    backgroundColor: isFilled ? config.color : 'rgba(255,255,255,0.05)',
                                    opacity: isFilled ? 0.7 + (i / 24) * 0.3 : 0.15,
                                    boxShadow: isFilled ? `0 0 5px ${config.color}80, 0 -2px 8px ${config.color}20` : 'none'
                                }}
                            />
                        );
                    })}
                </div>
                <div className="flex items-center gap-2 opacity-20 group-hover:opacity-40 transition-opacity">
                    <div className="text-[6px] font-mono tracking-wider" style={{ color: config.color }}>
                        DELTA: {value > 50 ? '+' : ''}{(value - 50).toFixed(1)}
                    </div>
                    <div className="w-[1px] h-2" style={{ backgroundColor: config.color }} />
                    <div className="text-[6px] font-mono tracking-wider" style={{ color: config.color }}>
                        CLASS: {value >= 90 ? 'S' : value >= 70 ? 'A' : value >= 50 ? 'B' : value >= 30 ? 'C' : 'D'}
                    </div>
                </div>
            </div>
        </div>
    );
});

/**
 * 节点描述：底端居中的详细叙事文本。
 */
export const Nodedesc: React.FC<CommonProps> = React.memo(({ text, config, isFullscreen, onUpdate, onClick }) => {
    const isDragging = React.useRef(false);
    const handleMouseDown = React.useMemo(() => createDragHandler(isFullscreen, config, onUpdate, onClick, isDragging, 1, -1, 0, 180), [isFullscreen, config, onUpdate, onClick]);

    const descStyle = React.useMemo(() => ({
        fontFamily: KAI_TI_FONT_STACK,
        color: config.color,
        fontSize: `${config.fontSize}px`,
        textShadow: `0 0 ${config.glowIntensity * 15}px ${config.color}, 0 0 ${config.glowIntensity * 30}px ${config.color}20`,
        opacity: config.opacity,
        letterSpacing: `${config.letterSpacing}px`
    }), [config]);

    return (
        <div
            className={`absolute z-40 transition-opacity duration-700 ${isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
            style={{
                left: '50%',
                bottom: `${config.y}px`,
                transform: `translateX(calc(-50% + ${config.x}px))`,
                width: 'auto',
                maxWidth: '85%'
            }}
        >
            <div
                onMouseDown={handleMouseDown}
                className={`px-10 py-6 select-none relative rounded-sm cursor-grab active:cursor-grabbing group transition-transform duration-500 ${isFullscreen ? 'translate-y-8' : 'translate-y-0'}`}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent blur-xl -z-10 rounded-[50%] opacity-80" />
                <p className="leading-[1.8] text-center italic drop-shadow-[0_2px_10px_rgba(0,0,0,1)]" style={descStyle}>
                    {text}
                </p>
                <div className="w-1/3 h-[1px] mx-auto mt-4 group-hover:w-1/2 transition-all duration-500" style={{ background: `linear-gradient(90deg, transparent, ${config.color}30, transparent)` }} />
            </div>
        </div>
    );
});
