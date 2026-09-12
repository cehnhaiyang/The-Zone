/**
LogPanel.tsx - 游戏日志面板组件

形态状态机：
- orb        初始形态。一颗发着微光的全透明小球，可拖拽，点击展开全屏。
- preview    有新日志时，小球发光增强，并向屏幕内侧（左/右自适应）展开单条日志行，
             流式打字；打字完成后持续 5 秒自动收起回 orb。
- fullscreen 点击小球后展开的全屏日志视图，保留分类过滤、扫描线、低理智暗角。

其他能力：
- 13 种 LogType 样式映射，逐字触发对应音效
- 理智值驱动的视觉扭曲：文字故障、容器震动、暗角
- 小球颜色随理智切换（冷静蓝 / 崩溃红）
- 拖拽采用 ref 直写 DOM，零重渲染
*/
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Icons } from './VisualPanel';
import { AudioService } from '../services';
import { Log, LogType, DotSoundType } from '../meta';

interface LogPanelProps {
    logs: Log[];
    isFullscreen: boolean;
    isLogFullscreen: boolean;
    setIsLogFullscreen: (v: boolean) => void;
    sanity: number;
}

interface LogStyleConfig {
    font: string;
    color: string;
    iconColor: string;
    IconComponent: React.ComponentType;
    baseSpeed: number;
    sfxType: DotSoundType;
}

type LogFilterGroup = 'system' | 'narrative' | 'gameplay' | 'cognitive';

const LOG_TYPE_GROUPS: Record<LogType, LogFilterGroup> = {
    info: 'system',
    command: 'system',
    warning: 'system',
    critical: 'system',
    cinematic: 'narrative',
    event: 'narrative',
    environment: 'narrative',
    combat: 'gameplay',
    loot: 'gameplay',
    success: 'gameplay',
    'ai-gen': 'cognitive',
    hallucination: 'cognitive',
    mental: 'cognitive',
};

const FILTER_GROUPS: Array<{ id: LogFilterGroup; label: string; activeClass: string }> = [
    { id: 'system', label: 'SYSTEM', activeClass: 'border-emerald-500/60 text-emerald-300' },
    { id: 'narrative', label: 'NARRATIVE', activeClass: 'border-blue-500/60 text-blue-300' },
    { id: 'gameplay', label: 'GAMEPLAY', activeClass: 'border-amber-500/60 text-amber-300' },
    { id: 'cognitive', label: 'COGNITIVE', activeClass: 'border-purple-500/60 text-purple-300' },
];

const ALL_GROUP_IDS = FILTER_GROUPS.map((g) => g.id);

const LOG_STYLE_MAP: Record<LogType, LogStyleConfig> = {
    info: { font: 'font-mono', color: 'text-gray-400', iconColor: 'text-gray-600', IconComponent: Icons.TerminalDot, baseSpeed: 16, sfxType: 'typing_2' },
    command: { font: 'font-mono', color: 'text-emerald-400/80', iconColor: 'text-emerald-600', IconComponent: Icons.ChevronRight, baseSpeed: 3, sfxType: 'typing_1' },
    warning: { font: 'font-mono font-bold', color: 'text-amber-400', iconColor: 'text-amber-600', IconComponent: Icons.Bolt, baseSpeed: 10, sfxType: 'ui_notification' },
    critical: { font: 'font-mono font-bold', color: 'text-red-500', iconColor: 'text-red-600', IconComponent: Icons.Bolt, baseSpeed: 12, sfxType: 'combat_crit' },
    cinematic: { font: 'font-serif text-shadow', color: 'text-gray-300', iconColor: 'text-blue-400', IconComponent: Icons.Play, baseSpeed: 28, sfxType: 'typing_2' },
    event: { font: 'font-mono', color: 'text-cyan-300', iconColor: 'text-cyan-500', IconComponent: Icons.Play, baseSpeed: 18, sfxType: 'typing_3' },
    environment: { font: 'font-serif italic text-glow', color: 'text-purple-300 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]', iconColor: 'text-purple-500', IconComponent: Icons.SearchSmall, baseSpeed: 20, sfxType: 'search' },
    combat: { font: 'font-mono', color: 'text-rose-400', iconColor: 'text-rose-600', IconComponent: Icons.Bolt, baseSpeed: 8, sfxType: 'combat_hit' },
    loot: { font: 'font-mono', color: 'text-amber-300', iconColor: 'text-amber-500', IconComponent: Icons.Check, baseSpeed: 15, sfxType: 'item_pickup' },
    success: { font: 'font-mono', color: 'text-blue-300', iconColor: 'text-blue-500', IconComponent: Icons.Check, baseSpeed: 15, sfxType: 'success' },
    'ai-gen': { font: 'font-light italic tracking-wide', color: 'text-gray-400/70', iconColor: 'text-gray-500', IconComponent: Icons.Cpu, baseSpeed: 22, sfxType: 'typing_3' },
    hallucination: { font: 'font-serif italic', color: 'text-purple-400', iconColor: 'text-purple-600', IconComponent: Icons.DoubleChevron, baseSpeed: 45, sfxType: 'error' },
    mental: { font: 'font-serif italic', color: 'text-fuchsia-400', iconColor: 'text-fuchsia-600', IconComponent: Icons.DoubleChevron, baseSpeed: 45, sfxType: 'fail' },
};

const DEFAULT_LOG_STYLE: LogStyleConfig = LOG_STYLE_MAP.info;

const MAX_RENDER_LINES = 150;
/** 小球尺寸（px） */
const ORB_SIZE = 30;
/** 打字完成后到自动收起的等待时长（ms） */
const PREVIEW_COLLAPSE_MS = 5000;
/** 小球初始位置（左 16px / 底 96px） */
const DEFAULT_POSITION = { x: 16, bottom: 96 };

/** 生成故障文字（低理智） */
const glitchText = (text: string, severity: number): string => {
    if (severity <= 0) return text;
    return text.split('').map(char => {
        if (Math.random() < severity * 0.15) {
            const roll = Math.random();
            if (roll < 0.3) return String.fromCharCode(Math.floor(Math.random() * 60) + 800);
            if (roll < 0.6) return char + char;
            return ' ';
        }
        return char;
    }).join('');
};

const getPunctuationPause = (char: string): number => {
    if ('.!?。！？'.includes(char)) return 4;
    if (',;:，；：'.includes(char)) return 2;
    return 1;
};

const formatTimestamp = (iso: string): string => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : date.toTimeString().slice(0, 8);
};

/** 理智驱动的文本渲染 */
const SanityText: React.FC<{ text: string; sanity: number }> = React.memo(({ text, sanity }) => {
    const [renderText, setRenderText] = useState(text);
    useEffect(() => {
        if (sanity > 70) { setRenderText(text); return; }
        const scramble = () => {
            const chaosFactor = (100 - sanity) / 100;
            if (Math.random() < chaosFactor * 0.5) {
                const severity = Math.max(0, (50 - sanity) / 30);
                setRenderText(glitchText(text, severity));
            } else {
                setRenderText(text);
            }
        };
        const intervalTime = Math.max(200, 500 - (100 - sanity) * 4);
        let interval: ReturnType<typeof setInterval> | undefined;
        const startTimeout = setTimeout(() => {
            scramble();
            interval = setInterval(scramble, intervalTime);
        }, Math.random() * intervalTime);
        return () => {
            clearTimeout(startTimeout);
            if (interval !== undefined) clearInterval(interval);
        };
    }, [text, sanity]);

    const styleClass = useMemo(() => {
        if (sanity < 30) return 'text-insanity blur-[0.5px] font-bold';
        if (sanity < 50) return 'animate-pulse text-red-300/90';
        if (sanity < 70) return 'opacity-80';
        return '';
    }, [sanity]);

    if (!text) return null;
    return <span className={styleClass}>{renderText}</span>;
});
SanityText.displayName = 'SanityText';

/** 全屏模式下的日志行 */
const LogLine: React.FC<{
    icon: React.ComponentType;
    iconColor: string;
    text: React.ReactNode;
    textColor: string;
    font: string;
    isLast: boolean;
    indentLevel?: number;
    timestamp?: string;
}> = React.memo(({ icon: Icon, iconColor, text, textColor, font, isLast, indentLevel, timestamp }) => {
    const paddingClass = indentLevel === 2 ? 'pl-6' : indentLevel === 1 ? 'pl-4' : 'pl-2';
    return (
        <div className={`flex gap-1.5 items-center transition-opacity drop-shadow-sm group/line ${isLast ? 'opacity-100 animate-log-enter' : 'opacity-70 hover:opacity-100'} ${paddingClass}`}>
            <div className={`shrink-0 transition-transform group-hover/line:scale-110 ${iconColor} scale-[1.8]`}>
                <Icon />
            </div>
            <div className={`flex-1 leading-snug break-words ${textColor} ${font} text-base`}>
                {text}
            </div>
            {timestamp && (
                <span className="ml-auto shrink-0 pl-2 text-[9px] text-gray-600 opacity-0 group-hover/line:opacity-100 transition-opacity">
                    {formatTimestamp(timestamp)}
                </span>
            )}
        </div>
    );
});
LogLine.displayName = 'LogLine';

/** 打字机：逐字显示 + 音效，理智影响节奏；完成时触发 onComplete */
const Typewriter: React.FC<{
    text: string;
    config: LogStyleConfig;
    sanity: number;
    onUpdate?: () => void;
    onComplete?: () => void;
    isAiGen?: boolean;
}> = ({ text, config, sanity, onUpdate, onComplete, isAiGen }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);
    const sanityRef = useRef(sanity);
    sanityRef.current = sanity;
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;

    useEffect(() => {
        let cancelled = false;
        let timeoutId: ReturnType<typeof setTimeout>;
        let currentIndex = 0;
        setDisplayedText('');
        setIsComplete(false);
        const typeNextChar = () => {
            if (cancelled) return;
            if (currentIndex >= text.length) {
                setIsComplete(true);
                onUpdate?.();
                onCompleteRef.current?.();
                return;
            }
            const char = text.charAt(currentIndex);
            currentIndex += 1;
            setDisplayedText(text.substring(0, currentIndex));
            if (char.trim()) AudioService.playSfx(config.sfxType);
            onUpdate?.();
            const currentSanity = sanityRef.current;
            const baseDelay = config.baseSpeed * getPunctuationPause(char);
            const jitter = (Math.random() - 0.5) * config.baseSpeed * 0.3;
            const sanityPenalty = currentSanity < 50 ? Math.random() * (50 - currentSanity) * 0.2 : 0;
            timeoutId = setTimeout(typeNextChar, Math.max(5, baseDelay + jitter + sanityPenalty));
        };
        timeoutId = setTimeout(typeNextChar, isAiGen ? 800 : 50);
        return () => { cancelled = true; clearTimeout(timeoutId); };
    }, [text, config, onUpdate, isAiGen]);

    return (
        <>
            <SanityText text={displayedText} sanity={sanity} />
            {!isComplete && <span className="animate-blink opacity-70">▌</span>}
        </>
    );
};

export const LogPanel: React.FC<LogPanelProps> = React.memo(({
    logs, isFullscreen, isLogFullscreen, setIsLogFullscreen, sanity
}) => {
    // preview 形态下展示的单条日志；为 null 即回到 orb 形态
    const [previewLog, setPreviewLog] = useState<Log | null>(null);
    const [activeGroups, setActiveGroups] = useState<Set<LogFilterGroup>>(() => new Set(ALL_GROUP_IDS));

    const scrollRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const posRef = useRef({ ...DEFAULT_POSITION });
    const hasDraggedRef = useRef(false);
    const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosBottom: number } | null>(null);
    const dragCleanupRef = useRef<(() => void) | null>(null);
    const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // 记录已见过的最新日志 id，避免挂载时回放历史日志
    const lastSeenLogIdRef = useRef<string | null>(logs.length ? logs[logs.length - 1].id : null);

    // 卸载清理
    useEffect(() => () => {
        dragCleanupRef.current?.();
        if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    }, []);

    /** 将小球钳制在视口内 */
    const clampPosition = useCallback((x: number, bottom: number) => ({
        x: Math.min(Math.max(8, x), Math.max(8, window.innerWidth - ORB_SIZE - 8)),
        bottom: Math.min(Math.max(8, bottom), Math.max(8, window.innerHeight - ORB_SIZE - 8)),
    }), []);

    const applyPosition = useCallback(() => {
        const el = panelRef.current;
        if (!el) return;
        el.style.left = `${posRef.current.x}px`;
        el.style.bottom = `${posRef.current.bottom}px`;
    }, []);

    /** 拖拽小球 */
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (isLogFullscreen) return;
        e.preventDefault();
        hasDraggedRef.current = false;
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startPosX: posRef.current.x,
            startPosBottom: posRef.current.bottom,
        };
        if (panelRef.current) panelRef.current.style.cursor = 'grabbing';
        const handleMouseMove = (ev: MouseEvent) => {
            if (!dragRef.current) return;
            const dx = ev.clientX - dragRef.current.startX;
            const dy = ev.clientY - dragRef.current.startY;
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasDraggedRef.current = true;
            posRef.current = clampPosition(dragRef.current.startPosX + dx, dragRef.current.startPosBottom - dy);
            applyPosition();
        };
        const cleanup = () => {
            dragRef.current = null;
            dragCleanupRef.current = null;
            if (panelRef.current) panelRef.current.style.cursor = '';
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', cleanup);
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', cleanup);
        dragCleanupRef.current = cleanup;
    }, [isLogFullscreen, clampPosition, applyPosition]);

    /** 检测到新日志 -> 进入 preview 形态 */
    useEffect(() => {
        if (!logs.length) return;
        const latest = logs[logs.length - 1];
        if (latest.id === lastSeenLogIdRef.current) return;
        lastSeenLogIdRef.current = latest.id;
        if (isLogFullscreen) return;
        if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
        setPreviewLog(latest);
    }, [logs, isLogFullscreen]);

    /** 打字完成 -> 5 秒后自动收起回 orb */
    const handlePreviewComplete = useCallback(() => {
        if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = setTimeout(() => setPreviewLog(null), PREVIEW_COLLAPSE_MS);
    }, []);

    /** 全屏时贴底滚动 */
    const scrollToBottom = useCallback(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, []);
    useEffect(() => {
        if (isLogFullscreen) scrollToBottom();
    }, [isLogFullscreen, logs.length, scrollToBottom]);

    /** 点击切换全屏；展开时取消 preview */
    const handleClick = useCallback(() => {
        if (hasDraggedRef.current) { hasDraggedRef.current = false; return; }
        AudioService.playSfx('ui_transition');
        const next = !isLogFullscreen;
        if (next) {
            if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
            setPreviewLog(null);
        }
        setIsLogFullscreen(next);
    }, [isLogFullscreen, setIsLogFullscreen]);

    const toggleGroup = useCallback((id: LogFilterGroup) => {
        AudioService.playSfx('ui_click');
        setActiveGroups(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next.size === 0 ? new Set(ALL_GROUP_IDS) : next;
        });
    }, []);

    const visibleLogs = useMemo(
        () => isLogFullscreen
            ? logs.filter(log => activeGroups.has(LOG_TYPE_GROUPS[log.type] ?? 'system'))
            : logs,
        [logs, activeGroups, isLogFullscreen]
    );
    const renderLogs = useMemo(
        () => visibleLogs.length > MAX_RENDER_LINES ? visibleLogs.slice(-MAX_RENDER_LINES) : visibleLogs,
        [visibleLogs]
    );

    // 依据小球横坐标决定 preview 展开方向，避免越出屏幕
    const expandSide: 'left' | 'right' = posRef.current.x < window.innerWidth / 2 ? 'right' : 'left';
    const isLowSanity = sanity < 40;
    const glowRgb = isLowSanity ? '255,96,96' : '140,190,255';
    const haloRgb = isLowSanity ? '220,60,60' : '110,160,240';
    const previewStyle = previewLog ? (LOG_STYLE_MAP[previewLog.type] ?? DEFAULT_LOG_STYLE) : null;
    const PreviewIcon = previewStyle?.IconComponent;
    const shakeClass = sanity < 30 ? 'animate-panic' : '';

    const orbGlow = previewLog
        ? `0 0 24px 8px rgba(${haloRgb},0.45), 0 0 10px 3px rgba(${glowRgb},0.65), inset 0 0 8px rgba(${glowRgb},0.5)`
        : `0 0 14px 3px rgba(${haloRgb},0.22), 0 0 5px 1px rgba(${glowRgb},0.35), inset 0 0 6px rgba(${glowRgb},0.25)`;

    // ===================== 全屏形态 =====================
    if (isLogFullscreen) {
        return (
            <div
                role="log"
                aria-live="polite"
                className={`fixed z-[9999] inset-0 w-full h-full bg-black/95 flex flex-col font-mono ${shakeClass}`}
                onClick={handleClick}
            >
                <div className="shrink-0 flex items-center gap-3 flex-wrap border-b border-white/10 bg-black/60 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold tracking-[0.25em] text-red-500/80">NEURAL LINK</span>
                        <span className="text-[10px] text-gray-700">//</span>
                        <span className="text-[10px] tracking-[0.25em] text-gray-400">SYSTEM LOG</span>
                        <span className="animate-blink text-[10px] text-red-500/60">▌</span>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5">
                        {FILTER_GROUPS.map(g => {
                            const active = activeGroups.has(g.id);
                            return (
                                <button
                                    key={g.id}
                                    type="button"
                                    onClick={e => { e.stopPropagation(); toggleGroup(g.id); }}
                                    onMouseEnter={() => AudioService.playSfx('ui_hover')}
                                    className={`border px-2 py-0.5 text-[9px] tracking-[0.2em] transition-colors ${active ? g.activeClass : 'border-gray-800 text-gray-600 hover:text-gray-400'}`}
                                >
                                    {g.label}
                                </button>
                            );
                        })}
                    </div>
                    <span className="text-[9px] text-gray-600">{visibleLogs.length}/{logs.length}</span>
                </div>

                <div className="flex-1 relative overflow-hidden bg-black/95">
                    <div ref={scrollRef} className="absolute inset-0 overflow-y-auto pl-1 pr-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <div className="space-y-2 min-h-full flex flex-col justify-end pb-2">
                            {renderLogs.length < visibleLogs.length && (
                                <div className="py-1 text-center text-[9px] tracking-[0.3em] text-gray-700">
                                    ── EARLIER RECORDS OMITTED ──
                                </div>
                            )}
                            {renderLogs.map((log) => {
                                const style = LOG_STYLE_MAP[log.type] ?? DEFAULT_LOG_STYLE;
                                if (log.type === 'cinematic') {
                                    return (
                                        <div key={log.id} className="py-2 text-center my-1 border-y border-gray-800/30 bg-gray-900/20">
                                            <span className={`text-xs ${style.font} ${style.color}`}>{log.text}</span>
                                        </div>
                                    );
                                }
                                return (
                                    <LogLine
                                        key={log.id}
                                        icon={style.IconComponent}
                                        iconColor={style.iconColor}
                                        text={<SanityText text={log.text} sanity={sanity} />}
                                        textColor={style.color}
                                        font={style.font}
                                        isLast={false}
                                        indentLevel={log.indentLevel}
                                        timestamp={log.timestamp}
                                    />
                                );
                            })}
                        </div>
                    </div>
                    <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, #ffffff 3px)' }} />
                    {sanity < 40 && (
                        <div className="pointer-events-none absolute inset-0 animate-pulse" style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(127, 29, 29, 0.4) 100%)', opacity: (40 - sanity) / 40 }} />
                    )}
                </div>
            </div>
        );
    }

    // 游戏沉浸模式下隐藏
    if (isFullscreen) return null;

    // ===================== orb / preview 形态 =====================
    return (
        <div
            ref={panelRef}
            role="log"
            aria-live="polite"
            className={`fixed z-[9998] select-none cursor-grab ${shakeClass}`}
            style={{ left: posRef.current.x, bottom: posRef.current.bottom, width: ORB_SIZE, height: ORB_SIZE }}
            onMouseDown={handleMouseDown}
            onClick={handleClick}
        >
            {/* 新日志到达时的扩散涟漪 */}
            {previewLog && (
                <span
                    key={previewLog.id}
                    className="absolute inset-0 rounded-full pointer-events-none animate-orb-ping"
                    style={{ border: `1px solid rgba(${glowRgb},0.5)` }}
                />
            )}

            {/* 全透明发光小球 */}
            <div
                className={`w-full h-full rounded-full ${previewLog ? '' : 'animate-orb-pulse'}`}
                style={{
                    background: `radial-gradient(circle at 35% 30%, rgba(${glowRgb},0.45), rgba(${haloRgb},0.12) 55%, rgba(10,14,24,0.15))`,
                    border: `1px solid rgba(${glowRgb},0.25)`,
                    boxShadow: orbGlow,
                    backdropFilter: 'blur(2px)',
                }}
            />

            {/* preview：单条日志行 */}
            {previewLog && previewStyle && PreviewIcon && (
                <div className={`absolute top-1/2 -translate-y-1/2 w-max ${expandSide === 'right' ? 'left-full ml-3' : 'right-full mr-3'}`}>
                    <div
                        key={previewLog.id}
                        className="flex items-center gap-2 max-w-[280px] bg-black/70 border border-white/10 backdrop-blur-md px-3 py-2 rounded-md shadow-lg animate-log-enter"
                    >
                        <div className={`shrink-0 ${previewStyle.iconColor}`}><PreviewIcon /></div>
                        <div className={`text-[11px] leading-snug break-words ${previewStyle.color} ${previewStyle.font}`}>
                            <Typewriter
                                text={previewLog.text}
                                config={previewStyle}
                                sanity={sanity}
                                onComplete={handlePreviewComplete}
                                isAiGen={previewLog.type === 'ai-gen'}
                            />
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes orb-pulse {
                    0%, 100% { opacity: 0.75; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.06); }
                }
                .animate-orb-pulse { animation: orb-pulse 3s ease-in-out infinite; }
                @keyframes orb-ping {
                    0% { transform: scale(1); opacity: 0.8; }
                    100% { transform: scale(2.4); opacity: 0; }
                }
                .animate-orb-ping { animation: orb-ping 0.9s ease-out forwards; }
                @keyframes log-enter {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: none; }
                }
                .animate-log-enter { animation: log-enter 0.25s ease-out both; }
                @keyframes panel-blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
                .animate-blink { animation: panel-blink 1s steps(1) infinite; }
            `}</style>
        </div>
    );
});
LogPanel.displayName = 'LogPanel';