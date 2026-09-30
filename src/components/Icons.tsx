/**
 * Icons —— 内联 SVG 图标库
 *
 * 从 VisualPanel 抽出为独立模块。原因：LogPanel（被 App 静态引用）也需要这套图标，
 * 若继续由 VisualPanel 导出，LogPanel 就会把整个 VisualPanel 拉进初始包，
 * 使 NeuralinkDevice 对该面板的按需分包彻底失效。
 *
 * 因此本模块刻意只承载图标与 SVG 基底，不依赖任何面板实现。
 */
import React from 'react';

// =====================
// 图标库 (Icons)
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
