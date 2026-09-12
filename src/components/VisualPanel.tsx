/**
 * VisualPanel.tsx - 统一视觉面板引擎
 *
 * 按职责划分为六个区段：
 * 1. 内部常量与工具（布局存储、神经矩阵参数、媒体仲裁、色系配置）
 * 2. 图标库 Icons（内联 SVG，无 emoji）
 * 3. 行动面板 Action（节点关系主题 + 统一动作按钮）
 * 4. 叙事文本 Narrative（拖拽定位 + 运行时样式配置器）
 * 5. 视觉控制器 Control（硬件仪表 + 扫描参数 + 模式切换）
 * 6. 视觉层级（Eyelids / Atmosphere / HUD / Media）与 VisualPanel 主组件
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type {
    Exit,
    Interaction,
    Log,
    NodeTemplate,
    VisualComponentKey,
    VisualMode,
    ZoneTemplate,
} from '../meta';
import { DEFAULT_LAYOUT_CONFIG, DEFAULT_TEXT_CONFIG } from '../constants/config';
import { AudioService } from '../services';

interface VisualTextConfig {
    fontSize: number
    fontFamily: string
    color: string
    glowIntensity: number
    opacity: number
    letterSpacing?: number
    x?: number
    y?: number
}

type VisualLayoutConfig = Record<VisualComponentKey, VisualTextConfig>

// =====================
// 0. 内部常量与工具 (Constants & Internal Utilities)
// =====================
const STORAGE_KEY = 'THE_ZONE_LAYOUT_CONFIG';
/** 楷体字体族：用于增强神秘 / 传统叙事感 */
const KAI_TI_FONT_STACK = '"KaiTi", "STKaiti", "楷体", serif';
/** 叙事文本预置视觉色系 */
const TEXT_COLORS = [
    { name: '灰', value: '#d1d5db' },
    { name: '赤', value: '#f87171' },
    { name: '琥', value: '#fbbf24' },
    { name: '青', value: '#22d3ee' },
    { name: '紫', value: '#a855f7' },
    { name: '翠', value: '#34d399' },
];
/** 神经噪声色系：扫描线、HUD 强调色、噪点染色的唯一事实来源 */
const NOISE_COLORS = [
    { id: 'cyan', label: 'CYAN', hue: '180deg', hex: '#06b6d4', primary: 'rgba(6,182,212,', secondary: 'rgba(16,185,129,' },
    { id: 'green', label: 'GREEN', hue: '140deg', hex: '#10b981', primary: 'rgba(16,185,129,', secondary: 'rgba(34,197,94,' },
    { id: 'red', label: 'RED', hue: '0deg', hex: '#ef4444', primary: 'rgba(239,68,68,', secondary: 'rgba(220,38,38,' },
    { id: 'purple', label: 'PURPLE', hue: '280deg', hex: '#a855f7', primary: 'rgba(168,85,247,', secondary: 'rgba(139,92,246,' },
    { id: 'amber', label: 'AMBER', hue: '45deg', hex: '#f59e0b', primary: 'rgba(245,158,11,', secondary: 'rgba(251,191,36,' },
] as const;
/** HUD 强调色映射（由 NOISE_COLORS 派生，避免重复维护） */
const COLOR_HEX_MAP: Record<string, string> = Object.fromEntries(
    NOISE_COLORS.map(({ id, hex }) => [id, hex])
);
const getNoiseColor = (id?: string) =>
    NOISE_COLORS.find((c) => c.id === id) ?? NOISE_COLORS[0];
/** 动态暗角：通过内阴影呼吸动画制造视线的收缩感 */
const VIGNETTE_STYLE: React.CSSProperties = { boxShadow: 'inset 0 0 150px rgba(0,0,0,0.75)' };
/** 威胁等级条形图的固定槽位索引，避免每次渲染重建数组 */
const THREAT_BAR_SLOTS = Array.from({ length: 24 }, (_, i) => i);

function loadLayoutConfig(): VisualLayoutConfig {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_LAYOUT_CONFIG;
    try {
        return { ...DEFAULT_LAYOUT_CONFIG, ...JSON.parse(saved) };
    } catch (e) {
        console.error('加载布局配置失败:', e);
        return DEFAULT_LAYOUT_CONFIG;
    }
}
function saveLayoutConfig(config: VisualLayoutConfig): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
        console.error('保存布局配置失败:', e);
    }
}
/** 根据神经噪声等级计算色彩矩阵的斜率与截距 */
function calculateMatrixParams(neuralNoiseLevel: number) {
    const safeLevel = Math.max(0, neuralNoiseLevel);
    const slope = 3 + safeLevel * 10;
    const intercept = -0.8 + Math.min(1, safeLevel / 3) * 0.6;
    return { slope, intercept };
}
/** 噪声色 → RGB 通道权重（用于 SVG feColorMatrix 染色） */
function getColorRgb(color: string) {
    const colors: Record<string, { r: number; g: number; b: number }> = {
        green: { r: 0, g: 1, b: 0.2 },
        red: { r: 1, g: 0.1, b: 0.1 },
        purple: { r: 0.7, g: 0.2, b: 1 },
        amber: { r: 1, g: 0.6, b: 0 },
        cyan: { r: 0, g: 1, b: 1 },
    };
    return colors[color] || colors.cyan;
}
/** 媒体仲裁：战斗视图优先覆盖图；图像优先模式下屏蔽视频流 */
function getDisplayMedia(params: {
    isCombat?: boolean;
    preferredMediaType: 'image' | 'video';
    imageUrl?: string;
    videoUrl?: string;
    overrideImageUrl?: string | null;
}) {
    const { isCombat = false, preferredMediaType, imageUrl = '', videoUrl, overrideImageUrl } = params;
    const hasOverride = isCombat && !!overrideImageUrl;
    const displayImageUrl = hasOverride ? overrideImageUrl! : imageUrl;
    const displayVideoUrl = isCombat || preferredMediaType === 'image' ? undefined : videoUrl;
    return {
        displayImageUrl,
        displayVideoUrl,
        displayHasVideo: !!displayVideoUrl,
        hasOverride,
    };
}

// =====================
// 1. 图标库 (Icons)
// =====================
type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

/** SVG 基底：统一 viewBox 与尺寸，消除重复样板 */
const Svg: React.FC<IconProps> = ({ size = 16, children, ...props }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...props}>{children}</svg>
);

export const Icons = {
    /** 播放 / 启动感应 */
    Play: () => (
        <Svg fill="currentColor"><path d="M8 5v14l11-7z" /></Svg>
    ),
    /** 视觉模式切换（生物 / 神经） */
    Eye: () => (
        <Svg size={20} fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </Svg>
    ),
    /** 神经网络重塑 / 刷新 */
    Refresh: () => (
        <Svg size={20} fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="12" cy="12" r="2" fill="currentColor" />
            <circle cx="6" cy="6" r="1.5" fill="currentColor" />
            <circle cx="18" cy="6" r="1.5" fill="currentColor" />
            <circle cx="6" cy="18" r="1.5" fill="currentColor" />
            <circle cx="18" cy="18" r="1.5" fill="currentColor" />
            <line x1="12" y1="12" x2="6" y2="6" strokeWidth={1} />
            <line x1="12" y1="12" x2="18" y2="6" strokeWidth={1} />
            <line x1="12" y1="12" x2="6" y2="18" strokeWidth={1} />
            <line x1="12" y1="12" x2="18" y2="18" strokeWidth={1} />
        </Svg>
    ),
    /** 进入全屏浸入状态 */
    Fullscreen: () => (
        <Svg fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M15 3h6v6" />
            <path d="M9 21H3v-6" />
            <path d="M21 3l-7 7" />
            <path d="M3 21l7-7" />
        </Svg>
    ),
    /** 窗口最大化 */
    Maximize: () => (
        <Svg size={12} fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
        </Svg>
    ),
    /** 系统设置齿轮 */
    Settings: () => (
        <Svg fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </Svg>
    ),
    /** 终端光标 */
    TerminalDot: () => (
        <Svg size={10} fill="currentColor"><rect x="8" y="8" width="8" height="8" /></Svg>
    ),
    /** 搜索指示 */
    SearchSmall: () => (
        <Svg size={10} fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </Svg>
    ),
    /** 向右箭头 */
    ChevronRight: () => (
        <Svg size={10} fill="none" stroke="currentColor" strokeWidth={3}>
            <polyline points="9 18 15 12 9 6" />
        </Svg>
    ),
    /** 确认状态 */
    Check: () => (
        <Svg size={10} fill="none" stroke="currentColor" strokeWidth={3}>
            <polyline points="20 6 9 17 4 12" />
        </Svg>
    ),
    /** 处理器 / 核心状态 */
    Cpu: () => (
        <Svg size={10} fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <rect x="9" y="9" width="6" height="6" />
            <line x1="9" y1="1" x2="9" y2="4" />
            <line x1="15" y1="1" x2="15" y2="4" />
            <line x1="9" y1="20" x2="9" y2="23" />
            <line x1="15" y1="20" x2="15" y2="23" />
            <line x1="20" y1="9" x2="23" y2="9" />
            <line x1="20" y1="14" x2="23" y2="14" />
            <line x1="1" y1="9" x2="4" y2="9" />
            <line x1="1" y1="14" x2="4" y2="14" />
        </Svg>
    ),
    /** 强调提示符 */
    DoubleChevron: () => (
        <span className="font-mono text-[8px] leading-none inline-block w-[10px] h-[10px] flex items-center justify-center">&gt;&gt;</span>
    ),
    /** 生物识别图标 */
    User: () => (
        <Svg size={20} fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </Svg>
    ),
    /** 能量 / 电量图标 */
    Bolt: () => (
        <Svg fill="none" stroke="currentColor" strokeWidth={2}>
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </Svg>
    ),
    /** 紧急关闭 */
    Cross: () => (
        <Svg size={10} fill="none" stroke="currentColor" strokeWidth={3}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </Svg>
    ),
    /** 信号波形图标：用于视觉模式指示 */
    Signal: () => (
        <Svg size={14} fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M2 12h2l3-9 4 18 4-12 3 6h4" />
        </Svg>
    ),
    /** 六边形节点：用于装饰性元素 */
    Hexagon: () => (
        <Svg size={12} fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M12 2l9 5v10l-9 5-9-5V7z" />
        </Svg>
    ),
    /** 视频流 */
    Film: () => (
        <Svg size={14} fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
            <line x1="7" y1="2" x2="7" y2="22" />
            <line x1="17" y1="2" x2="17" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="2" y1="7" x2="7" y2="7" />
            <line x1="2" y1="17" x2="7" y2="17" />
            <line x1="17" y1="7" x2="22" y2="7" />
            <line x1="17" y1="17" x2="22" y2="17" />
        </Svg>
    ),
    /** 随机 */
    Dice: () => (
        <Svg size={14} fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" stroke="none" />
        </Svg>
    ),
};

// =====================
// 2. 行动面板 (Action)
// =====================
interface ActionProps {
    currentNodeId: string;
    currentNode: NodeTemplate | null;
    onAction: (
        actionType: 'move_local' | 'move_zone' | 'search' | 'interact_obj' | 'interact_npc' | 'generate_video' | 'unlock' | 'sanctuary_return',
        target?: string,
        label?: string
    ) => void;
    isSanctuary?: boolean;
    onToggleSanctuaryUI?: () => void;
    nodes?: Record<string, NodeTemplate>;
}

/**
 * 节点关系类型 → 主题色映射
 * 设计原则：
 * - 庇护所出口：琥珀色（安全 / 温暖）
 * - 跨区出口：红色（危险预警）
 * - 子节点（深入）：紫色（未知 / 探索）
 * - 父节点（返回）：翡翠色（安全 / 回退）
 * - 兄弟节点（同层横向）：天蓝色（平行 / 选择）
 * - 孤立节点（无层级关系）：灰色（中性 / 默认）
 */
interface NodeTheme {
    border: string;
    hoverBorder: string;
    bg: string;
    hoverBg: string;
    text: string;
    hoverText: string;
    glowColor: string;
    icon: string;
}
const NODE_THEMES: Record<string, NodeTheme> = {
    sanctuary: {
        border: 'border-amber-700/50',
        hoverBorder: 'hover:border-amber-400',
        bg: 'bg-transparent',
        hoverBg: 'hover:bg-amber-950/30',
        text: 'text-amber-500',
        hoverText: 'hover:text-amber-100',
        glowColor: 'via-amber-400/50',
        icon: '⌂ ',
    },
    zoneExit: {
        border: 'border-red-800/50',
        hoverBorder: 'hover:border-red-400',
        bg: 'bg-transparent',
        hoverBg: 'hover:bg-red-950/30',
        text: 'text-red-500',
        hoverText: 'hover:text-red-100',
        glowColor: 'via-red-400/50',
        icon: '⇥ ',
    },
    child: {
        border: 'border-violet-800/50',
        hoverBorder: 'hover:border-violet-400',
        bg: 'bg-transparent',
        hoverBg: 'hover:bg-violet-950/30',
        text: 'text-violet-400',
        hoverText: 'hover:text-violet-100',
        glowColor: 'via-violet-400/50',
        icon: '↳ ',
    },
    parent: {
        border: 'border-emerald-700/50',
        hoverBorder: 'hover:border-emerald-400',
        bg: 'bg-transparent',
        hoverBg: 'hover:bg-emerald-950/30',
        text: 'text-emerald-400',
        hoverText: 'hover:text-emerald-100',
        glowColor: 'via-emerald-400/50',
        icon: '↰ ',
    },
    sibling: {
        border: 'border-sky-800/50',
        hoverBorder: 'hover:border-sky-400',
        bg: 'bg-transparent',
        hoverBg: 'hover:bg-sky-950/30',
        text: 'text-sky-400',
        hoverText: 'hover:text-sky-100',
        glowColor: 'via-sky-400/50',
        icon: '↔ ',
    },
    isolated: {
        border: 'border-zinc-700/50',
        hoverBorder: 'hover:border-zinc-400',
        bg: 'bg-transparent',
        hoverBg: 'hover:bg-zinc-900/30',
        text: 'text-zinc-400',
        hoverText: 'hover:text-zinc-200',
        glowColor: 'via-zinc-400/30',
        icon: '',
    },
};

/** 安全的按钮色彩样式字典，防止 Tailwind 生产环境树摇导致样式丢失。 */
const COLOR_SCHEMES = {
    amber: {
        border: 'border-amber-800/60',
        hoverBorder: 'hover:border-amber-400',
        hoverBg: 'hover:bg-amber-950/30',
        text: 'text-amber-500',
        hoverText: 'group-hover:text-amber-100',
        glow: 'via-amber-400/50',
    },
    cyan: {
        border: 'border-cyan-800/60',
        hoverBorder: 'hover:border-cyan-400',
        hoverBg: 'hover:bg-cyan-950/30',
        text: 'text-cyan-500',
        hoverText: 'group-hover:text-cyan-100',
        glow: 'via-cyan-400/50',
    },
    blue: {
        border: 'border-blue-800/60',
        hoverBorder: 'hover:border-blue-400',
        hoverBg: 'hover:bg-blue-950/30',
        text: 'text-blue-500',
        hoverText: 'group-hover:text-blue-100',
        glow: 'via-blue-400/50',
    },
} as const;
type ColorSchemeKey = keyof typeof COLOR_SCHEMES;

/** 统一动作按钮：悬浮抬升 + 上下辉光描边 + 文字辉光，提供明确的触觉反馈 */
const ActionButton: React.FC<{
    onClick: () => void;
    colorScheme: ColorSchemeKey;
    children: React.ReactNode;
    className?: string;
}> = React.memo(({ onClick, colorScheme, children, className = '' }) => {
    const scheme = COLOR_SCHEMES[colorScheme];
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => AudioService.playSfx('ui_hover')}
            className={`group relative overflow-hidden bg-transparent border px-5 py-2.5 text-center rounded-sm shrink-0 select-none btn-scan-sweep transform-gpu transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${scheme.border} ${scheme.hoverBg} ${scheme.hoverBorder} ${className}`}
        >
            <div className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent ${scheme.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            <div className={`absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent ${scheme.glow} to-transparent opacity-0 group-hover:opacity-60 transition-opacity duration-300`} />
            <div className={`${scheme.text} font-bold text-xs tracking-wide ${scheme.hoverText} relative z-10 transition-colors duration-200 whitespace-nowrap group-hover:[text-shadow:0_0_10px_currentColor]`}>
                {children}
            </div>
        </button>
    );
});

/** 移动按钮（使用预定义主题） */
const MoveButton: React.FC<{
    theme: NodeTheme;
    label: string;
    onClick: () => void;
}> = React.memo(({ theme, label, onClick }) => (
    <button
        onClick={onClick}
        onMouseEnter={() => AudioService.playSfx('ui_hover')}
        className={`group relative px-5 py-2.5 text-center border rounded-sm shrink-0 overflow-hidden select-none btn-scan-sweep transform-gpu transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${theme.border} ${theme.hoverBorder} ${theme.bg} ${theme.hoverBg} ${theme.text} ${theme.hoverText}`}
    >
        <div className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent ${theme.glowColor} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
        <div className={`absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent ${theme.glowColor} to-transparent opacity-0 group-hover:opacity-50 transition-opacity duration-300`} />
        <div className="font-bold text-xs tracking-wide relative z-10 whitespace-nowrap group-hover:[text-shadow:0_0_10px_currentColor] transition-all duration-200">
            {theme.icon}{label}
        </div>
    </button>
));

/**
 * 判断目标节点与当前节点的关系类型
 * 兄弟节点定义：与当前节点共享同一个父节点
 *（即某个节点的 childrenIds 同时包含当前节点和目标节点）
 */
const getNodeRelation = (
    currentNodeId: string,
    currentNode: NodeTemplate,
    targetId?: string,
    nodes?: Record<string, NodeTemplate>
): keyof typeof NODE_THEMES => {
    if (!targetId || !nodes) return 'isolated';
    const targetNode = nodes[targetId];
    if (!targetNode) return 'isolated';
    // 子节点：当前节点的 childrenIds 包含目标
    if (currentNode.childrenIds?.includes(targetId)) return 'child';
    // 父节点：目标节点的 childrenIds 包含当前节点
    if (targetNode.childrenIds?.includes(currentNodeId)) return 'parent';
    // 兄弟节点：存在某个节点的 childrenIds 同时包含当前节点和目标节点
    for (const nodeId in nodes) {
        const node = nodes[nodeId];
        if (
            node.childrenIds &&
            node.childrenIds.includes(currentNodeId) &&
            node.childrenIds.includes(targetId)
        ) {
            return 'sibling';
        }
    }
    return 'isolated';
};

/**
 * 动作面板 - 底部操作区
 * 布局：按钮从中心向两侧自然铺开，超出屏幕宽度时提供横向滚动
 */
const Action: React.FC<ActionProps> = ({ currentNodeId, currentNode, onAction, isSanctuary, onToggleSanctuaryUI, nodes }) => {
    // 预计算所有出口的节点关系类型（hooks 必须先于任何提前返回，避免违反 Rules of Hooks）
    const exitRelations = useMemo(() => {
        if (!currentNode) return [] as Array<keyof typeof NODE_THEMES>;
        return (currentNode.exits ?? []).map((exit: Exit) => {
            if (exit.type === 'sanctuary_return') return 'sanctuary' as const;
            if (exit.type === 'zone_transfer') return 'zoneExit' as const;
            return getNodeRelation(currentNodeId, currentNode, exit.targetId, nodes);
        });
    }, [currentNode, nodes, currentNodeId]);

    if (!currentNode) return null;
    const interactions = currentNode.interactions;

    return (
        <div className="w-full h-full flex flex-col overflow-hidden bg-gradient-to-t from-black/80 via-black/40 to-transparent">
            {/* 横向滚动容器：按钮从中心铺开，溢出时可滚动 */}
            <div className="w-full h-full flex items-center justify-center">
                <div
                    className="flex gap-2 items-center px-4 py-1 overflow-x-auto justify-start md:justify-center"
                    style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'rgba(255,255,255,0.15) transparent',
                        maskImage: 'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)',
                        WebkitMaskImage: 'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)',
                    }}
                >
                    {/* 庇护所管理 */}
                    {isSanctuary && (
                        <ActionButton
                            onClick={() => { AudioService.playSfx('ui_click'); onToggleSanctuaryUI?.(); }}
                            colorScheme="amber"
                        >
                            庇护所
                        </ActionButton>
                    )}
                    {/* 搜查 */}
                    <ActionButton onClick={() => onAction('search')} colorScheme="cyan">
                        搜查
                    </ActionButton>
                    {/* NPC 交互 */}
                    {currentNode.nodeNpc && (
                        <ActionButton onClick={() => onAction('interact_npc')} colorScheme="blue">
                            接触: {currentNode.nodeNpc.name || '陌生人'}
                        </ActionButton>
                    )}
                    {/* 节点交互：逐一渲染所有可用的交互按钮 */}
                    {interactions?.map((interaction, index) => (
                        <ActionButton
                            key={`interact-${interaction.desc || 'action'}-${index}`}
                            onClick={() => onAction('interact_obj', index.toString())}
                            colorScheme="amber"
                        >
                            {interaction.desc || '交互'}
                        </ActionButton>
                    ))}
                    {/* 移动出口：根据节点关系类型应用主题色与逻辑路由 */}
                    {(currentNode.exits ?? []).map((exit: Exit, idx: number) => {
                        const theme = NODE_THEMES[exitRelations[idx] ?? 'isolated'];
                        const handleMoveClick = () => {
                            if (exit.type === 'sanctuary_return') {
                                onAction('sanctuary_return', undefined, exit.label);
                            } else if (exit.type === 'zone_transfer') {
                                onAction('move_zone', exit.targetId, exit.label);
                            } else {
                                onAction('move_local', exit.targetId, exit.label);
                            }
                        };
                        return (
                            <MoveButton
                                key={exit.targetId || `${exit.type}-${idx}`}
                                theme={theme}
                                label={exit.label}
                                onClick={handleMoveClick}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// =====================
// 3. 叙事文本 (Narrative)
// =====================
interface ConfigPanelProps {
    title: string;
    config: VisualTextConfig;
    defaultConfig?: VisualTextConfig;
    onUpdate: (newConfig: Partial<VisualTextConfig>) => void;
    onClose: () => void;
}
interface NarrativeTextProps {
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

/**
 * createDragHandler - 拖拽行为的统一钩子逻辑
 * @param xDirection X 轴移动方向：1 正向，-1 反向（用于右对齐元素）
 * @param yDirection Y 轴移动方向：1 正向，-1 反向（用于底对齐元素）
 */
const createDragHandler = (
    isFullscreen: boolean,
    config: VisualTextConfig,
    onUpdate: (conf: Partial<VisualTextConfig>) => void,
    onClick: () => void,
    isDraggingRef: React.MutableRefObject<boolean>,
    xDirection: number = 1,
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
            y: startConfigY + yDirection * (moveEvent.clientY - startY),
        });
    };
    const handleMouseUp = (upEvent: MouseEvent) => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        isDraggingRef.current = false;
        const dist = Math.sqrt(Math.pow(upEvent.clientX - startX, 2) + Math.pow(upEvent.clientY - startY, 2));
        if (dist < 5) { AudioService.playSfx('ui_click'); onClick(); }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
};

/** 样式配置面板：利用 glass-panel-glow 提供高级的可视化配置界面。 */
const ConfigPanel: React.FC<ConfigPanelProps> = React.memo(({ title, config, defaultConfig, onUpdate, onClose }) => {
    const panelRef = useRef<HTMLDivElement>(null);
    /* 点击面板外部自动关闭 */
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);
    /* 根据属性名自动推断锚点语义 */
    const anchorInfo = useMemo(() => {
        const t = title.toUpperCase();
        if (t.includes('ZONENAME')) return { label: '锚点: 左上角', xLabel: '横向边距', yLabel: '纵向边距' };
        if (t.includes('NODENAME')) return { label: '锚点: 顶端居中', xLabel: '横向偏移', yLabel: '顶端边距' };
        if (t.includes('THREAT')) return { label: '锚点: 右上角', xLabel: '右侧边距', yLabel: '纵向边距' };
        if (t.includes('DESC')) return { label: '锚点: 底端居中', xLabel: '横向偏移', yLabel: '底端边距' };
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
                        onClick={() => { AudioService.playSfx('ui_click'); onUpdate(defaultConfig || DEFAULT_TEXT_CONFIG); }}
                        className="text-[9px] text-white/40 hover:text-red-400 font-mono transition-colors"
                    >
                        RESET
                    </button>
                    <button onClick={onClose} className="text-[10px] text-white/40 hover:text-white hover:rotate-90 transition-all">✕</button>
                </div>
            </div>
            <div className="space-y-5">
                {/* 坐标控制区 */}
                <div className="grid grid-cols-2 gap-3 pb-4 border-b border-white/5">
                    <div className="flex flex-col gap-1">
                        <span className="text-[8px] text-white/30 font-mono uppercase">{anchorInfo.xLabel}</span>
                        <input type="number" value={config.x ?? 0} onChange={(e) => onUpdate({ x: Number(e.target.value) })} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded px-2 py-1.5 text-xs font-mono text-emerald-400 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[8px] text-white/30 font-mono uppercase">{anchorInfo.yLabel}</span>
                        <input type="number" value={config.y ?? 0} onChange={(e) => onUpdate({ y: Number(e.target.value) })} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded px-2 py-1.5 text-xs font-mono text-emerald-400 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all" />
                    </div>
                </div>
                {/* 滑动调节区 */}
                <div className="space-y-4">
                    {[
                        { label: 'FONT_SIZE', value: config.fontSize, unit: 'PX', min: 8, max: 72, step: 1, key: 'fontSize' },
                        { label: 'LETTER_SPACING', value: config.letterSpacing || 0, unit: 'PX', min: 0, max: 30, step: 0.5, key: 'letterSpacing' },
                        { label: 'GLOW_STRENGTH', value: config.glowIntensity, unit: '%', min: 0, max: 3, step: 0.1, key: 'glowIntensity', displayValue: `${(config.glowIntensity * 100).toFixed(0)}%` },
                        { label: 'OPACITY_ALPHA', value: config.opacity, unit: '%', min: 0.1, max: 1, step: 0.1, key: 'opacity', displayValue: `${(config.opacity * 100).toFixed(0)}%` },
                    ].map((item) => (
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
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 transition-all"
                            />
                        </div>
                    ))}
                </div>
                {/* 调色盘 */}
                <div className="flex justify-between pt-3 border-t border-white/10">
                    {TEXT_COLORS.map((col) => (
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
 * 视觉意图：采用楷体结合极简修饰线的排版，创造"传统档案"与"数字流"交汇的错位感。
 * 布局位于左上角，作为场景识别的第一优先级信息。
 */
const ZoneName: React.FC<NarrativeTextProps> = React.memo(({ text, config, isFullscreen, onUpdate, onClick }) => {
    const isDragging = useRef(false);
    /* 通过 X/Y 方向参数适配锚点位置（左上为 1,1） */
    const handleMouseDown = useMemo(() => createDragHandler(isFullscreen, config, onUpdate, onClick, isDragging, 1, 1, 40, 40), [isFullscreen, config, onUpdate, onClick]);
    const lineStyle = useMemo(() => ({
        backgroundColor: config.color,
        boxShadow: `0 0 10px ${config.color}, 0 0 20px ${config.color}40`,
    }), [config.color]);
    const textStyle = useMemo(() => ({
        fontFamily: KAI_TI_FONT_STACK,
        color: config.color,
        fontSize: `${config.fontSize}px`,
        textShadow: `0 0 ${config.glowIntensity * 12}px ${config.color}, 0 0 ${config.glowIntensity * 25}px ${config.color}40`,
        opacity: config.opacity,
        letterSpacing: `${config.letterSpacing}px`,
    }), [config]);
    const decorationStyle = useMemo(() => ({
        width: '60%',
        background: `linear-gradient(90deg, ${config.color}, transparent)`,
    }), [config.color]);
    return (
        <div
            className={`absolute z-40 transform-gpu transition-opacity duration-1000 animate-in fade-in slide-in-from-left-4 ${isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
            style={{ left: `${config.x}px`, top: `${config.y}px` }}
        >
            <div onMouseDown={handleMouseDown} className="transition-all select-none flex items-center relative cursor-grab active:cursor-grabbing group">
                <div className="h-full absolute left-0 top-0 bottom-0 w-[3px] opacity-70 rounded-full group-hover:opacity-100 transition-opacity" style={lineStyle} />
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
 * 视觉意图：作为屏幕的中轴重点，使用更强的辉光、菱形符号和仪式感的水平线，
 * 定义空间的探索深度。居中对齐设计引导玩家的视觉核心，建立宏大的场景基调。
 */
const NodeName: React.FC<NarrativeTextProps> = React.memo(({ text, config, isFullscreen, onUpdate, onClick }) => {
    const isDragging = useRef(false);
    const handleMouseDown = useMemo(() => createDragHandler(isFullscreen, config, onUpdate, onClick, isDragging, 1, 1, 0, 100), [isFullscreen, config, onUpdate, onClick]);
    const topLineStyle = useMemo(() => ({
        background: `linear-gradient(90deg, transparent, ${config.color}, transparent)`,
        boxShadow: `0 0 10px ${config.color}40`,
    }), [config.color]);
    const titleStyle = useMemo(() => ({
        fontFamily: KAI_TI_FONT_STACK,
        color: config.color,
        fontSize: `${config.fontSize}px`,
        textShadow: `0 0 ${config.glowIntensity * 20}px ${config.color}, 0 0 ${config.glowIntensity * 40}px ${config.color}30`,
        opacity: config.opacity,
        letterSpacing: `${config.letterSpacing}px`,
    }), [config]);
    const decorationLineStyle = useMemo(() => ({
        width: '60px',
        height: '1px',
        background: `linear-gradient(90deg, transparent, ${config.color}, transparent)`,
        opacity: 0.6,
    }), [config.color]);
    return (
        <div
            className={`absolute z-40 transition-opacity duration-700 animate-in fade-in ${isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
            style={{
                left: '50%',
                top: `${config.y}px`,
                transform: `translateX(calc(-50% + ${config.x}px))`,
                whiteSpace: 'nowrap',
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
                {/* 装饰细节：通过简单的几何图形增加"秘仪"感 */}
                <div className="flex justify-center items-center gap-3 mt-2 opacity-50 group-hover:opacity-80 transition-opacity">
                    <span className="text-[6px] rotate-45 animate-pulse" style={{ color: config.color, textShadow: `0 0 5px ${config.color}` }}>■</span>
                    <div style={decorationLineStyle} />
                    <span className="text-[6px] rotate-45 animate-pulse" style={{ color: config.color, textShadow: `0 0 5px ${config.color}`, animationDelay: '0.8s' }}>■</span>
                </div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50%] h-[1px] opacity-10 group-hover:opacity-25 transition-opacity" style={{ background: `linear-gradient(90deg, transparent, ${config.color}, transparent)` }} />
            </div>
        </div>
    );
});

/**
 * 威胁等级 (ThreatLevel)
 * 视觉意图：动态条形图模拟心率监测或盖格计数器的脉冲，通过填充比例直观传达环境的恶意程度。
 * 位于右上角，符合 HUD 习惯性的状态监控区域。
 */
const ThreatLevel: React.FC<ThreatLevelProps> = React.memo(({ value, config, isFullscreen, onClick, onUpdate }) => {
    const isDragging = useRef(false);
    /* 反转 X 方向（-1），使拖拽位移与右对齐锚点保持物理感一致 */
    const handleMouseDown = useMemo(() => createDragHandler(isFullscreen, config, onUpdate, onClick, isDragging, -1, 1, 40, 40), [isFullscreen, config, onUpdate, onClick]);
    if (value <= 0) return null;
    const isHighThreat = value >= 70;
    const isCriticalThreat = value >= 90;
    return (
        <div
            className={`absolute z-40 transform-gpu transition-opacity duration-700 animate-in fade-in slide-in-from-right-4 ${isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
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
                            letterSpacing: `${config.letterSpacing}px`,
                        }}
                    >
                        {value}%
                    </span>
                </div>
                <div className="flex gap-[3px] items-end justify-end w-32 h-3">
                    {THREAT_BAR_SLOTS.map((i) => {
                        const isFilled = value >= (i / 24) * 100;
                        return (
                            <div
                                key={i}
                                className="w-full transition-all duration-700 rounded-t-[1px]"
                                style={{
                                    height: isFilled ? `${60 + (i / 24) * 40}%` : '30%',
                                    backgroundColor: isFilled ? config.color : 'rgba(255,255,255,0.05)',
                                    opacity: isFilled ? 0.7 + (i / 24) * 0.3 : 0.15,
                                    boxShadow: isFilled ? `0 0 5px ${config.color}80, 0 -2px 8px ${config.color}20` : 'none',
                                    transitionDelay: `${i * 12}ms`,
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

/** 节点描述：底端居中的详细叙事文本。 */
const NodeDesc: React.FC<NarrativeTextProps> = React.memo(({ text, config, isFullscreen, onUpdate, onClick }) => {
    const isDragging = useRef(false);
    const handleMouseDown = useMemo(() => createDragHandler(isFullscreen, config, onUpdate, onClick, isDragging, 1, -1, 0, 180), [isFullscreen, config, onUpdate, onClick]);
    const descStyle = useMemo(() => ({
        fontFamily: KAI_TI_FONT_STACK,
        color: config.color,
        fontSize: `${config.fontSize}px`,
        textShadow: `0 0 ${config.glowIntensity * 15}px ${config.color}, 0 0 ${config.glowIntensity * 30}px ${config.color}20`,
        opacity: config.opacity,
        letterSpacing: `${config.letterSpacing}px`,
    }), [config]);
    return (
        <div
            className={`absolute z-40 transition-opacity duration-700 animate-in fade-in ${isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
            style={{
                left: '50%',
                bottom: `${config.y}px`,
                transform: `translateX(calc(-50% + ${config.x}px))`,
                width: 'auto',
                maxWidth: '85%',
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

// =====================
// 4. 视觉控制器 (Control)
// =====================
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
    onOpenSettings?: () => void;
    preferredMediaType?: 'image' | 'video';
    onToggleMediaType?: () => void;
    nodeId?: string;
}

/**
 * StatusBar - 垂直状态检测条组件
 * 设计意图：
 * - 拟物化反馈：通过垂直进度条模拟工业设备的物理仪表，强化"硬体状态监测"的叙事感。
 * - 紧急视觉分级：根据阈值动态切换颜色并引入呼吸动画，将"正常、预警、临界"明确区分。
 */
const StatusBar: React.FC<{
    /** 当前值 0-100 */
    value: number;
    /** 状态标签 */
    label: string;
    normalColor: string;
    midColor: string;
    dangerColor: string;
    /** 低阈值（低于此值进入中间态） */
    midThreshold: number;
    /** 危险阈值（低于此值进入危险态） */
    dangerThreshold: number;
}> = React.memo(({ value, label, normalColor, midColor, dangerColor, midThreshold, dangerThreshold }) => {
    /* 优先判断危险等级，确保资源极度匮乏时触发红色警报动画 */
    const isDanger = value < dangerThreshold;
    const isMid = value < midThreshold;
    const barColor = isDanger ? dangerColor : isMid ? midColor : normalColor;
    const textColorClass = isDanger ? 'text-red-500 animate-pulse' : 'text-gray-500';
    const barStyle = useMemo(() => ({
        height: `${value}%`,
        backgroundColor: barColor,
        /* 辉光效果：模拟发光二极管在暗处散射的光晕 */
        boxShadow: `0 0 8px ${barColor}80, 0 0 16px ${barColor}30`,
    }), [value, barColor]);
    return (
        <div className="flex flex-col items-center gap-1.5 group pointer-events-auto transition-transform duration-300 hover:scale-110" title={`${label}: ${value}%`}>
            <div className="w-[3px] h-14 bg-gray-800/60 rounded-full overflow-hidden relative ring-1 ring-white/5">
                <div className="absolute bottom-0 w-full transition-all duration-1000 rounded-full" style={barStyle} />
            </div>
            <span className={`text-[7px] font-mono font-bold tracking-wider transition-colors duration-500 ${textColorClass}`}>
                {label}
            </span>
            {/* 隐藏数据面板：仅在 hover 时提供具体百分比，平时保持 HUD 简洁 */}
            <span className="text-[6px] font-mono opacity-0 group-hover:opacity-60 transition-opacity text-white/60 tabular-nums">
                {value}%
            </span>
        </div>
    );
});

/**
 * Control - 视觉面板全局控制器
 * 功能定位：
 * - 硬体端（左侧）：实时监控电池与完整度，提供生存压力的视觉反馈。
 * - 逻辑 / 生成端（右侧）：调节神经扫描等级、切换媒体模式、全屏等核心操作。
 */
const Control: React.FC<ControlProps> = React.memo(({
    isGenerating, videoUrl, imageUrl, isNeuralMode, isFullscreen,
    onManualGen, onToggleMode, toggleFullscreen,
    noiseLevel = 0.1, onSetNoiseLevel,
    integrity = 100, battery = 100,
    noiseColor = 'cyan', onSetNoiseColor,
    onRandomSwitch, onOpenSettings,
    preferredMediaType = 'video', onToggleMediaType,
    nodeId,
}) => {
    const [showColorPicker, setShowColorPicker] = useState(false);
    /* 缓存当前色系配置，避免因 noiseColor 变化导致的大规模重算 */
    const currentColorConfig = useMemo(() => getNoiseColor(noiseColor), [noiseColor]);
    return (
        <>
            {/* 左侧：硬体状态监测 */}
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 z-40 pointer-events-none flex flex-col gap-6 pl-3 transition-all duration-700 ${isFullscreen ? 'opacity-20' : 'opacity-90'}`}>
                <StatusBar value={battery} label="BAT" normalColor="#10b981" midColor="#eab308" dangerColor="#ef4444" midThreshold={50} dangerThreshold={20} />
                <StatusBar value={integrity} label="INT" normalColor="#06b6d4" midColor="#f59e0b" dangerColor="#ef4444" midThreshold={60} dangerThreshold={30} />
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
                                        boxShadow: `0 0 10px ${currentColorConfig.hex}, 0 0 20px ${currentColorConfig.hex}40`,
                                    }}
                                />
                            </div>
                            {/* 刻度标记 */}
                            <div className="absolute h-full w-6 right-0 flex flex-col justify-between pointer-events-none py-1">
                                {[0, 1, 2, 3].map((v) => (
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
                                        boxShadow: `0 0 8px ${currentColorConfig.hex}40, 0 0 16px ${currentColorConfig.hex}20`,
                                    }}
                                />
                                {showColorPicker && (
                                    <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 glass-panel-glow rounded-full p-1.5 flex flex-col gap-2">
                                        {NOISE_COLORS.map((color) => (
                                            <button
                                                key={color.id}
                                                onClick={() => { onSetNoiseColor(color.id); setShowColorPicker(false); AudioService.playSfx('ui_click'); }}
                                                className={`w-4 h-4 rounded-full border transition-all hover:scale-125 ${noiseColor === color.id ? 'border-white scale-110' : 'border-transparent opacity-60'}`}
                                                style={{
                                                    backgroundColor: color.hex,
                                                    boxShadow: noiseColor === color.id ? `0 0 10px ${color.hex}60` : 'none',
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
                            className={`w-8 h-8 flex items-center justify-center rounded-full border transition-all btn-hover-active hover:scale-105 active:scale-90 ${preferredMediaType === 'video' ? 'border-purple-500/30 text-purple-400 bg-purple-900/10 hover:shadow-[0_0_12px_rgba(168,85,247,0.25)]' : 'border-blue-500/30 text-blue-400 bg-blue-900/10 hover:shadow-[0_0_12px_rgba(59,130,246,0.25)]'}`}
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
                        className={`group relative w-8 h-8 flex items-center justify-center rounded-full border transition-all btn-hover-active hover:scale-105 active:scale-90 ${isGenerating ? 'opacity-30 cursor-not-allowed' : 'opacity-80 hover:opacity-100'} ${preferredMediaType === 'video' ? 'border-purple-600/40 text-purple-500 hover:shadow-[0_0_14px_rgba(168,85,247,0.3)]' : 'border-red-600/40 text-red-500 hover:shadow-[0_0_14px_rgba(239,68,68,0.3)]'}`}
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
                            className={`w-8 h-8 flex items-center justify-center rounded-full border transition-all btn-hover-active hover:scale-105 active:scale-90 ${isGenerating ? 'opacity-30 cursor-not-allowed' : 'opacity-80 hover:opacity-100'} border-white/10 text-white/60 hover:shadow-[0_0_12px_rgba(255,255,255,0.15)]`}
                        >
                            <span className="scale-75 flex items-center justify-center">
                                {preferredMediaType === 'video' ? <Icons.Film /> : <Icons.Dice />}
                            </span>
                        </button>
                    )}
                    {/* 功能分隔线 */}
                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-0.5" />
                    {/* 模式切换 */}
                    <button
                        onClick={(e) => { e.stopPropagation(); AudioService.playSfx('ui_click'); onToggleMode(); }}
                        className={`w-8 h-8 flex items-center justify-center rounded-full border transition-all btn-hover-active hover:scale-105 active:scale-90 ${isNeuralMode ? 'border-cyan-500/40 text-cyan-400 bg-cyan-900/10' : 'border-white/10 text-white/40'}`}
                        title="切换神经模式"
                        style={isNeuralMode ? { boxShadow: '0 0 12px rgba(6,182,212,0.15)' } : {}}
                    >
                        <span className="text-[10px] font-mono font-bold tracking-tighter">{isNeuralMode ? 'NEU' : 'BIO'}</span>
                    </button>
                    {/* 全屏 */}
                    <button
                        onClick={toggleFullscreen}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-white/10 text-white/40 hover:text-white/80 transition-all btn-hover-active hover:scale-105 active:scale-90 hover:shadow-[0_0_12px_rgba(255,255,255,0.12)]"
                        title="影院模式"
                    >
                        <span className="scale-75"><Icons.Fullscreen /></span>
                    </button>
                    {/* 设置 */}
                    <button
                        onClick={(e) => { e.stopPropagation(); AudioService.playSfx('ui_click'); onOpenSettings?.(); }}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-white/10 text-white/40 hover:text-white/80 transition-all btn-hover-active hover:scale-105 active:scale-90 hover:shadow-[0_0_12px_rgba(255,255,255,0.12)]"
                    >
                        <span className="scale-75"><Icons.Settings /></span>
                    </button>
                </div>
            </div>
        </>
    );
});

// =====================
// 5. 视觉层级 (Visual Layers)
// =====================
/**
 * 眼睑效果 (Eyelids)
 * 设计意图：
 * - 生理恐惧模拟：通过模拟眨眼行为，建立角色与玩家之间的生理连接。
 * - 动态反馈环：理智越低，眨眼频率越高、闭合时间越长，从视觉上剥夺玩家视野，
 *   传达角色内心的动荡与恐惧。
 */
const Eyelids: React.FC<{ sanity: number }> = React.memo(({ sanity }) => {
    const [closure, setClosure] = useState(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    /* 眨眼逻辑：根据理智值计算闭眼步长与间隔，确保低理智时的视觉压迫感 */
    const performBlink = useCallback(() => {
        const isLowSanity = sanity < 40;
        const isCritical = sanity < 20;
        const closeTime = isCritical ? 500 : 120;
        const stayTime = isCritical ? 800 : isLowSanity ? 200 : 50;
        setClosure(1);
        openTimerRef.current = setTimeout(() => setClosure(0), closeTime + stayTime);
        const baseInterval = isLowSanity ? 1800 : 5000;
        const nextTime = baseInterval + Math.random() * 4000; // 随机性模拟自然疲劳
        timerRef.current = setTimeout(performBlink, nextTime);
    }, [sanity]);
    useEffect(() => {
        timerRef.current = setTimeout(performBlink, 2000);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (openTimerRef.current) clearTimeout(openTimerRef.current);
        };
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
                    transition: `transform ${closure === 1 ? '0.15s' : '0.4s'} cubic-bezier(0.4, 0, 0.2, 1)`,
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
                    transition: `transform ${closure === 1 ? '0.15s' : '0.4s'} cubic-bezier(0.4, 0, 0.2, 1)`,
                }}
            />
            <div
                className="absolute inset-0 bg-black -z-10 transition-opacity duration-300"
                style={{ opacity: closure === 1 ? 0.9 : 0 }}
            />
        </div>
    );
});

/**
 * 大气层 (AtmosphereLayer)
 * 视觉意图：负责渲染画面的后处理细节，包括暗角（电影感）、理智值红色呼吸灯（生存压力）和眼睑。
 * 神经模式下自动切换到 CRT 扫描线风格，产生不同维度的沉浸感。
 */
const AtmosphereLayer: React.FC<{ isNeuralMode: boolean; sanity: number }> = React.memo(({ isNeuralMode, sanity }) => {
    const atmosphereContent = useMemo(() => {
        if (!isNeuralMode) {
            return (
                <>
                    {/* 噪点纹理层：胶片颗粒感消除数字画面的纯净度，增加写实感 */}
                    <div className="absolute inset-[-100%] w-[300%] h-[300%] bg-[url('/noise.png')] opacity-[0.18] mix-blend-overlay animate-noise" />
                    {/* 危险氛围层：仅在理智值较低时启动，通过红光波动提示危机 */}
                    <div className={`absolute inset-0 bg-red-900/15 mix-blend-color-dodge transition-opacity duration-2000 ${sanity < 40 ? 'animate-[breathe_1s_infinite] opacity-100' : sanity < 60 ? 'animate-[breathe_4s_infinite] opacity-50' : 'opacity-0'}`} />
                    {/* 色差边缘效果 (Chromatic Aberration)：模拟镜头缺陷，增加迷幻感 */}
                    <div
                        className="absolute inset-0 pointer-events-none opacity-60"
                        style={{
                            background: 'radial-gradient(ellipse at center, transparent 60%, rgba(255,0,80,0.03) 80%, rgba(255,0,80,0.06) 100%)',
                            mixBlendMode: 'screen',
                        }}
                    />
                    <div
                        className="absolute inset-0 pointer-events-none opacity-60"
                        style={{
                            background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,200,255,0.03) 80%, rgba(0,200,255,0.06) 100%)',
                            mixBlendMode: 'screen',
                            transform: 'translateX(-2px)',
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
                    style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)' }}
                />
            </>
        );
    }, [isNeuralMode, sanity]);
    return (
        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden select-none">
            {/* 动态暗角：通过内阴影呼吸动画制造视线的收缩感 */}
            <div className="absolute inset-0 pointer-events-none animate-vignette-breathe" style={VIGNETTE_STYLE} />
            {atmosphereContent}
        </div>
    );
});

/**
 * 抬头显示层 (HUDLayer)
 * 交互意图：
 * - 系统反馈：通过高亮扫描条展示神经接口的"激活状态"。
 * - 状态阻断：生成中展示全屏加载覆盖层，提示系统正在"同步 / 提取"视觉信号。
 */
const HUDLayer: React.FC<{
    isNeuralMode: boolean;
    isFullscreen: boolean;
    isGenerating: boolean;
    noiseColor?: string;
}> = React.memo(({ isNeuralMode, isFullscreen, isGenerating, noiseColor = 'cyan' }) => {
    const accentColor = useMemo(() => COLOR_HEX_MAP[noiseColor] || COLOR_HEX_MAP.cyan, [noiseColor]);
    const barStyle = useMemo(() => ({ background: accentColor, boxShadow: `0 0 20px ${accentColor}, 0 0 60px ${accentColor}40` }), [accentColor]);
    const containerClass = useMemo(() => `absolute inset-0 z-30 pointer-events-none overflow-hidden transition-all duration-700 ${isFullscreen ? 'opacity-40 scale-[1.02]' : 'opacity-100 scale-100'}`, [isFullscreen]);
    return (
        <div className={containerClass}>
            {/* 扫描基准线：提供动态的纵向引导 */}
            {isNeuralMode && <div className="scan-bar" style={barStyle} />}
            {/* 生成状态覆盖：根据模式切换 Emerald（技术感）或 Red（生物 / 噩梦感）加载风格 */}
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

/** 媒体层 (MediaLayer)：视觉面板的最底层，承载实际的图片或视频内容。 */
const MediaLayer: React.FC<{
    imageUrl?: string;
    videoUrl?: string;
    hasVideo: boolean;
    isNeuralMode: boolean;
    sanity: number;
    isGenerating: boolean;
    isEnemyView?: boolean;
    neuralNoiseLevel?: number;
    noiseColor?: string;
}> = React.memo(({
    imageUrl, videoUrl, hasVideo, isNeuralMode, sanity, isGenerating, isEnemyView, neuralNoiseLevel = 0, noiseColor = 'cyan',
}) => {
    const colorConfig = useMemo(() => getNoiseColor(noiseColor), [noiseColor]);
    const { isPanic, isUnstable, isLow } = useMemo(() => ({
        isPanic: sanity < 30,
        isUnstable: sanity < 60,
        isLow: sanity < 90,
    }), [sanity]);
    const visualFilterClass = useMemo(() => {
        let cls = isNeuralMode ? 'filter-neural-outline brightness-125' : 'filter-naked-eye';
        if (!isNeuralMode) {
            if (isLow) cls += ' sepia-[0.3]';
            if (isUnstable) cls += ' contrast-150 saturate-[0.4]';
            if (isPanic) cls += ' filter-nightmare animate-tear blur-[0.5px]';
        }
        return cls;
    }, [isNeuralMode, isLow, isUnstable, isPanic]);
    const motionClass = useMemo(() => {
        if (isNeuralMode) return '';
        if (isPanic) return 'animate-panic';
        if (isUnstable) return isEnemyView ? 'animate-tension-shake' : 'animate-pan-zoom-deep';
        return isEnemyView ? 'animate-enemy-breathe' : 'animate-handheld';
    }, [isNeuralMode, isPanic, isUnstable, isEnemyView]);
    const containerStyle = useMemo(() => ({
        opacity: isGenerating ? 0.3 : 1,
        filter: isGenerating ? 'blur(20px) grayscale(1)' : 'none',
        transform: isGenerating ? 'scale(1.1)' : 'scale(1)',
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
                        <div className="w-32 h-32 rounded-full border opacity-10 animate-ping" style={{ borderColor: colorConfig.primary + '0.3)' }} />
                        <div className="absolute w-48 h-48 rounded-full border opacity-5 animate-ping" style={{ borderColor: colorConfig.primary + '0.2)', animationDelay: '0.5s' }} />
                    </div>
                    {/* 信号文字 */}
                    <div className="z-10 flex flex-col items-center gap-2">
                        <span
                            className={`text-4xl font-black tracking-[0.3em] font-mono italic ${neuralNoiseLevel > 1.5 ? 'animate-tear text-red-600' : 'animate-chromatic-pulse'}`}
                            style={{ color: neuralNoiseLevel > 1.5 ? undefined : colorConfig.primary + '1)' }}
                        >
                            {isEnemyView ? 'HOSTILE_SIG' : 'LOST_SIGNAL'}
                        </span>
                        <span className="text-[9px] font-mono tracking-[0.6em] uppercase opacity-60" style={{ color: colorConfig.primary + '0.8)' }}>
                            {isEnemyView ? 'Neural tracing targeted entity...' : 'Scanning for synaptic handshake...'}
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
                            mixBlendMode: 'screen',
                        }}
                    />
                )}
                <div className="z-10 flex flex-col items-center text-center px-12 opacity-50">
                    <span className={`text-4xl text-red-950 font-serif font-bold tracking-[0.5em] blur-[2px] transition-all duration-1000 ${isPanic ? 'animate-bounce blur-[1px] text-red-800' : ''}`}>
                        {isEnemyView ? 'PRESENCE_DET' : isPanic ? 'THEY_ARE_HERE' : 'DARKNESS'}
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
                        key={videoUrl}
                        src={videoUrl} crossOrigin="anonymous" autoPlay loop muted playsInline
                        className={`w-full h-full object-cover transition-all duration-1000 animate-in fade-in duration-700 ${visualFilterClass}`}
                    />
                ) : imageUrl ? (
                    <img
                        key={imageUrl}
                        src={imageUrl} crossOrigin="anonymous" alt="Visual Feed"
                        className={`w-full h-full object-cover object-center transition-all duration-1000 animate-in fade-in duration-700 ${visualFilterClass}`}
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

// =====================
// 6. 视觉面板主组件 (VisualPanel)
// =====================
interface VisualPanelProps {
    imageUrl?: string;
    videoUrl?: string;
    hasVideo: boolean;
    viewMode: VisualMode;
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
    onAction: (
        actionType: 'move_local' | 'move_zone' | 'search' | 'interact_obj' | 'interact_npc' | 'generate_video' | 'unlock' | 'sanctuary_return',
        target?: string,
        label?: string
    ) => void;
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

const VISUAL_COMPONENT_KEYS: VisualComponentKey[] = ['zoneName', 'nodeName', 'threatLevel', 'desc'];

const VisualPanel: React.FC<VisualPanelProps> = (props) => {
    const {
        imageUrl, videoUrl, viewMode, onToggleMode, onToggleMediaType: onToggleMediaTypeProp,
        isCombat, overrideImageUrl, neuralNoiseLevel = 0.1, batteryLevel = 100,
        noiseColor = 'cyan', isFullscreenControlled, onFullscreenChange,
        onManualGen, isGenerating, zoneName, nodeName, nodedesc, threatLevel, sanity, onAction,
        currentNode, nodeId, isSanctuary, onToggleSanctuaryUI,
        onSetNoiseLevel, integrity = 100, onSetNoiseColor,
        onRandomSwitch, onOpenSettings, currentZone,
        preferredMediaType: preferredMediaTypeProp,
    } = props;

    // --- 全屏与布局状态 ---
    const [isFullscreenLocal, setIsFullscreenLocal] = useState(false);
    const isFullscreen = isFullscreenControlled !== undefined ? isFullscreenControlled : isFullscreenLocal;
    const setIsFullscreen = onFullscreenChange || setIsFullscreenLocal;
    const [layoutConfig, setLayoutConfig] = useState<VisualLayoutConfig>(loadLayoutConfig);
    const [editingComponent, setEditingComponent] = useState<VisualComponentKey | null>(null);
    const [preferredMediaTypeLocal, setPreferredMediaTypeLocal] = useState<'image' | 'video'>(
        preferredMediaTypeProp || 'video'
    );
    useEffect(() => {
        if (preferredMediaTypeProp) setPreferredMediaTypeLocal(preferredMediaTypeProp);
    }, [preferredMediaTypeProp]);
    const preferredMediaType = preferredMediaTypeProp || preferredMediaTypeLocal;

    /* 布局配置收敛为纯状态更新，持久化统一交由下方 useEffect，StrictMode 安全 */
    const updateConfig = useCallback((key: VisualComponentKey, newConfig: Partial<VisualTextConfig>) => {
        setLayoutConfig((prev) => ({ ...prev, [key]: { ...prev[key], ...newConfig } }));
    }, []);
    useEffect(() => {
        saveLayoutConfig(layoutConfig);
    }, [layoutConfig]);

    // --- 叙事组件编辑回调：收敛为稳定引用映射，避免破坏子组件 memo ---
    const editorHandlers = useMemo(() => {
        const map = {} as Record<VisualComponentKey, { open: () => void; update: (conf: Partial<VisualTextConfig>) => void }>;
        VISUAL_COMPONENT_KEYS.forEach((key) => {
            map[key] = {
                open: () => setEditingComponent(key),
                update: (conf: Partial<VisualTextConfig>) => updateConfig(key, conf),
            };
        });
        return map;
    }, [updateConfig]);
    const handleCloseEditingComponent = useCallback(() => setEditingComponent(null), []);
    const handleUpdateEditingComponent = useCallback((newConfig: Partial<VisualTextConfig>) => {
        if (editingComponent) updateConfig(editingComponent, newConfig);
    }, [editingComponent, updateConfig]);

    // --- 状态与效果计算 ---
    const isBatteryDead = useMemo(() => batteryLevel <= 0, [batteryLevel]);
    const isNeuralMode = useMemo(() => viewMode === 'camera' && !isBatteryDead, [viewMode, isBatteryDead]);
    const showDeadBatteryStatic = useMemo(() => viewMode === 'camera' && isBatteryDead, [viewMode, isBatteryDead]);
    const { displayImageUrl, displayVideoUrl, displayHasVideo, hasOverride } = useMemo(
        () => getDisplayMedia({ isCombat, preferredMediaType, imageUrl, videoUrl, overrideImageUrl }),
        [isCombat, preferredMediaType, imageUrl, videoUrl, overrideImageUrl]
    );
    const { slope, intercept, c } = useMemo(() => ({
        ...calculateMatrixParams(neuralNoiseLevel),
        c: getColorRgb(noiseColor),
    }), [neuralNoiseLevel, noiseColor]);

    // --- 键盘快捷键 ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (editingComponent) setEditingComponent(null);
                else setIsFullscreen(false);
            }
            if (e.key === 'Tab' && isFullscreen) {
                e.preventDefault();
                AudioService.playSfx('ui_click');
                onToggleMode?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen, onToggleMode, editingComponent, setIsFullscreen]);

    const toggleFullscreen = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        AudioService.playSfx(isFullscreen ? 'ui_click' : 'combat_block');
        setIsFullscreen(!isFullscreen);
    }, [isFullscreen, setIsFullscreen]);

    const handleToggleMediaType = useCallback(() => {
        if (onToggleMediaTypeProp) {
            onToggleMediaTypeProp();
        } else {
            setPreferredMediaTypeLocal((prev) => (prev === 'video' ? 'image' : 'video'));
            AudioService.playSfx('ui_click');
        }
    }, [onToggleMediaTypeProp]);

    const containerClasses = useMemo(() => {
        const baseClasses = 'w-full h-full relative bg-black overflow-hidden group transition-all duration-500';
        const fullscreenClasses = 'fixed inset-0 z-[9999] bg-black flex items-center justify-center animate-in fade-in duration-300';
        return isFullscreen ? fullscreenClasses : baseClasses;
    }, [isFullscreen]);

    // --- 动态滤镜定义（神经边缘扫描管线） ---
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
                        /* 神经模式由外层 SVG 滤镜管线接管，媒体层自身恒走基础渲染 */
                        isNeuralMode={false}
                        sanity={sanity}
                        isGenerating={isGenerating}
                        isEnemyView={hasOverride}
                        neuralNoiseLevel={neuralNoiseLevel}
                        noiseColor={noiseColor}
                    />
                </div>
            )}
            <AtmosphereLayer isNeuralMode={isNeuralMode} sanity={sanity} />
            <HUDLayer
                isNeuralMode={isNeuralMode}
                isFullscreen={isFullscreen}
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
                    {/* 叙事组件：以 nodeId 为键触发节点切换时的入场动效 */}
                    <ZoneName key={`zn-${nodeId}`} text={zoneName} config={layoutConfig.zoneName} isFullscreen={isFullscreen} onClick={editorHandlers.zoneName.open} onUpdate={editorHandlers.zoneName.update} />
                    <NodeName key={`nn-${nodeId}`} text={nodeName} config={layoutConfig.nodeName} isFullscreen={isFullscreen} onClick={editorHandlers.nodeName.open} onUpdate={editorHandlers.nodeName.update} />
                    <ThreatLevel key={`tl-${nodeId}`} value={threatLevel} config={layoutConfig.threatLevel} isFullscreen={isFullscreen} onClick={editorHandlers.threatLevel.open} onUpdate={editorHandlers.threatLevel.update} />
                    <NodeDesc key={`nd-${nodeId}`} text={nodedesc} config={layoutConfig.desc} isFullscreen={isFullscreen} onClick={editorHandlers.desc.open} onUpdate={editorHandlers.desc.update} />
                    {/* 行动组件：底栏结构 */}
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
                        onRandomSwitch={onRandomSwitch}
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