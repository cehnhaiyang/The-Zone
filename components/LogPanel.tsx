/**
 * LogPanel.tsx - 游戏日志面板组件
 * 
 * 功能：
 * - 显示游戏事件日志，支持多种日志类型样式
 * - 打字机效果逐字显示最新日志
 * - 理智值驱动的视觉扭曲效果
 * - 支持全屏/迷你模式切换
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Icons } from './VisualPanel/Icons';
import { AudioService } from '../services';
import { Log } from '../meta';

interface LogPanelProps {
    logs: Log[];
    isFullscreen: boolean;
    isLogFullscreen: boolean;
    setIsLogFullscreen: (v: boolean) => void;
    sanity: number;
}

interface LogStyleConfig {
    font: string;           // 字体样式类
    color: string;          // 文字颜色类
    iconColor: string;      // 图标颜色类
    IconComponent: React.FC<any>;
    baseSpeed: number;      // 打字速度 (ms/字符)
    sfxType: 'typing' | 'click' | 'glitch' | 'scan' | 'success' | 'combat_hit';
}

/** 日志类型样式映射表 - 每个字符都触发对应音效 */
const LOG_STYLE_MAP: Record<string, LogStyleConfig> = {
    // 战斗类 - 快速紧张的点击声
    combat: {
        font: 'font-mono',
        color: 'text-rose-400',
        iconColor: 'text-rose-600',
        IconComponent: Icons.Bolt,
        baseSpeed: 8,
        sfxType: 'click'
    },
    // 暴击/危险 - 重击感
    critical: {
        font: 'font-mono font-bold',
        color: 'text-red-500',
        iconColor: 'text-red-600',
        IconComponent: Icons.Bolt,
        baseSpeed: 12,
        sfxType: 'combat_hit'
    },
    // 拾取 - 成功提示音
    loot: {
        font: 'font-mono',
        color: 'text-amber-300',
        iconColor: 'text-amber-500',
        IconComponent: Icons.Check,
        baseSpeed: 15,
        sfxType: 'success'
    },
    // 命令输入 - 快速键盘声
    command: {
        font: 'font-mono',
        color: 'text-emerald-400/80',
        iconColor: 'text-emerald-600',
        IconComponent: Icons.ChevronRight,
        baseSpeed: 3,
        sfxType: 'typing'
    },
    // 幻觉 - 故障/扭曲音
    hallucination: {
        font: 'font-serif italic',
        color: 'text-purple-400',
        iconColor: 'text-purple-600',
        IconComponent: Icons.DoubleChevron,
        baseSpeed: 45,
        sfxType: 'glitch'
    },
    // 精神状态 - 故障音
    mental: {
        font: 'font-serif italic',
        color: 'text-purple-400',
        iconColor: 'text-purple-600',
        IconComponent: Icons.DoubleChevron,
        baseSpeed: 45,
        sfxType: 'glitch'
    },
    // AI生成/解密 - 连贯打字机音效
    'ai-gen': {
        font: 'font-light italic tracking-wide',
        color: 'text-gray-400/70',
        iconColor: 'text-gray-500',
        IconComponent: Icons.Cpu,
        baseSpeed: 22,
        sfxType: 'typing'
    },
    // 过场叙事 - 柔和打字声
    cinematic: {
        font: 'font-serif text-shadow',
        color: 'text-gray-300',
        iconColor: 'text-blue-400',
        IconComponent: Icons.Play,
        baseSpeed: 28,
        sfxType: 'typing'
    },
    // 成功 - 确认音
    success: {
        font: 'font-mono',
        color: 'text-blue-300',
        iconColor: 'text-blue-500',
        IconComponent: Icons.Check,
        baseSpeed: 15,
        sfxType: 'success'
    },
    // 环境描述 - 扫描探测感
    environment: {
        font: 'font-serif italic text-glow',
        color: 'text-purple-300 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]',
        iconColor: 'text-purple-500',
        IconComponent: Icons.SearchSmall,
        baseSpeed: 20,
        sfxType: 'scan'
    },
    // 默认 - 标准打字声
    default: {
        font: 'font-mono',
        color: 'text-gray-400',
        iconColor: 'text-gray-700',
        IconComponent: Icons.TerminalDot,
        baseSpeed: 16,
        sfxType: 'typing'
    }
};

/**
 * 生成故障文字效果 (用于低理智状态)
 * @param text 原始文本
 * @param severity 严重程度 (0-1)
 */
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

/**
 * 获取标点符号的停顿时间倍数
 */
const getPunctuationPause = (char: string): number => {
    if ('.!?。！？'.includes(char)) return 4;
    if (',;:，；：'.includes(char)) return 2;
    return 1;
};

/**
 * 理智驱动的文本渲染组件
 * 根据理智值应用不同程度的视觉扭曲效果
 */
const SanityText: React.FC<{ text: string; sanity: number }> = React.memo(({ text, sanity }) => {
    const [renderText, setRenderText] = useState(text);

    useEffect(() => {
        // 理智 > 70 时无扭曲效果，跳过 interval 以节省性能
        if (sanity > 70) {
            setRenderText(text);
            return;
        }

        const scramble = () => {
            const chaosFactor = (100 - sanity) / 100;

            if (Math.random() < chaosFactor * 0.5) {
                const severity = Math.max(0, (50 - sanity) / 30);
                setRenderText(glitchText(text, severity));
            } else {
                setRenderText(text);
            }
        };

        // 理智越低，更新越频繁（但设定最低 150ms 以避免过度性能消耗）
        const intervalTime = Math.max(150, 500 - (100 - sanity) * 4);
        const interval = setInterval(scramble, intervalTime);
        return () => clearInterval(interval);
    }, [text, sanity]);

    // 根据理智值应用视觉样式
    const styleClass = useMemo(() => {
        if (sanity < 30) return "text-insanity blur-[0.5px] font-bold";
        if (sanity < 50) return "animate-pulse text-red-300/90";
        if (sanity < 70) return "opacity-80";
        return "";
    }, [sanity]);

    return <span className={styleClass}>{renderText}</span>;
});

/**
 * 日志行组件 - 组合图标与文字
 */
const LogLine: React.FC<{
    icon: React.FC<any>;
    iconColor: string;
    text: React.ReactNode;
    textColor: string;
    font: string;
    isLast: boolean;
    isFullscreen: boolean;
    indentLevel?: number;
}> = React.memo(({ icon: Icon, iconColor, text, textColor, font, isLast, isFullscreen, indentLevel }) => {
    // 根据缩进级别计算左边距：0=pl-2, 1=pl-4, 2=pl-6
    const paddingClass = indentLevel === 2 ? 'pl-6' : indentLevel === 1 ? 'pl-4' : 'pl-2';

    return (
        <div className={`
            flex gap-1.5 items-center transition-opacity drop-shadow-sm group
            ${isLast ? 'opacity-100' : 'opacity-70 hover:opacity-100'}
            ${paddingClass}
        `}>
            <div className={`
                shrink-0 transition-transform group-hover:scale-110 
                ${iconColor} ${isFullscreen ? 'scale-[1.8]' : 'scale-110'}
            `}>
                <Icon />
            </div>
            <div className={`
                flex-1 leading-snug break-words 
                ${textColor} ${font} ${isFullscreen ? 'text-base' : 'text-[11px]'}
            `}>
                {text}
            </div>
        </div>
    );
});

/**
 * 打字机效果组件
 * 逐字显示文本，支持自定义速度和音效
 */
const Typewriter: React.FC<{
    text: string;
    config: LogStyleConfig;
    sanity: number;
    onUpdate?: () => void;
    isAiGen?: boolean;
}> = ({ text, config, sanity, onUpdate, isAiGen }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        setDisplayedText('');
        setIsComplete(false);

        let currentIndex = 0;
        let timeoutId: ReturnType<typeof setTimeout>;

        const typeNextChar = () => {
            if (!mountedRef.current || currentIndex >= text.length) {
                if (mountedRef.current) {
                    setIsComplete(true);
                    onUpdate?.();
                }
                return;
            }

            const char = text.charAt(currentIndex);
            currentIndex++;

            setDisplayedText(text.substring(0, currentIndex));

            // 每个非空白字符都触发音效
            if (char.trim()) {
                AudioService.playSfx(config.sfxType as any);
            }

            onUpdate?.();

            // 计算下一字符延迟
            const pauseMultiplier = getPunctuationPause(char);
            const baseDelay = config.baseSpeed * pauseMultiplier;
            const jitter = (Math.random() - 0.5) * config.baseSpeed * 0.3;
            const sanityPenalty = sanity < 50 ? Math.random() * (50 - sanity) * 0.2 : 0;

            const delay = Math.max(5, baseDelay + jitter + sanityPenalty);
            timeoutId = setTimeout(typeNextChar, delay);
        };

        // AI生成类型添加初始停顿，模拟解密/生成过程
        const initialDelay = isAiGen ? 800 : 50;
        timeoutId = setTimeout(typeNextChar, initialDelay);

        return () => {
            mountedRef.current = false;
            clearTimeout(timeoutId);
        };
    }, [text, config, sanity, onUpdate, isAiGen]);

    return (
        <>
            <SanityText text={displayedText} sanity={sanity} />
            {!isComplete && <span className="animate-pulse opacity-70">▌</span>}
        </>
    );
};

export const LogPanel: React.FC<LogPanelProps> = React.memo(({
    logs, isFullscreen, isLogFullscreen, setIsLogFullscreen, sanity
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const isHoveredRef = useRef(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // 拖动状态
    const [position, setPosition] = useState({ x: 16, y: -96 }); // 默认左下角
    const [isDragging, setIsDragging] = useState(false);
    const hasDraggedRef = useRef(false); // 标记是否真正拖动过
    const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);

    // 同步 hover 状态到 ref
    useEffect(() => {
        isHoveredRef.current = isHovered;
    }, [isHovered]);

    // 拖动处理
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (isLogFullscreen) return;
        e.preventDefault();
        setIsDragging(true);
        hasDraggedRef.current = false; // 重置拖动标记
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startPosX: position.x,
            startPosY: position.y
        };
    }, [position, isLogFullscreen]);

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!dragRef.current) return;
            const dx = e.clientX - dragRef.current.startX;
            const dy = e.clientY - dragRef.current.startY;
            // 移动超过 5px 才算拖动
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                hasDraggedRef.current = true;
            }
            setPosition({
                x: dragRef.current.startPosX + dx,
                y: dragRef.current.startPosY + dy
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            dragRef.current = null;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    /** 滚动到底部 */
    const scrollToBottom = useCallback(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }, []);

    // 日志更新时自动滚动
    useEffect(() => {
        if (!isHoveredRef.current || isLogFullscreen) {
            scrollToBottom();
        }
    }, [logs.length, isLogFullscreen, scrollToBottom]);

    /** 打字机更新回调 */
    const handleTypewriterUpdate = useCallback(() => {
        if (!isHoveredRef.current) scrollToBottom();
    }, [scrollToBottom]);

    /** 点击切换全屏 - 只有在没有拖动时才触发 */
    const handleClick = useCallback(() => {
        if (hasDraggedRef.current) {
            hasDraggedRef.current = false;
            return;
        }
        AudioService.playSfx('ui_open'); // 使用新的 UI 音效
        setIsLogFullscreen(!isLogFullscreen);
    }, [isLogFullscreen, setIsLogFullscreen]);

    /** 获取日志样式配置 */
    const getLogStyle = useCallback((type: string): LogStyleConfig => {
        return LOG_STYLE_MAP[type] || LOG_STYLE_MAP.default;
    }, []);

    // 低理智时容器震动
    const shakeClass = sanity < 30 ? "animate-panic" : "";

    return (
        <div
            className={`
                fixed flex flex-col font-mono
                ${isLogFullscreen ? 'z-[9999] inset-0' : 'z-[9998]'}
                ${shakeClass}
                ${isLogFullscreen
                    ? 'w-full h-full bg-black/95'
                    : isFullscreen
                        ? 'opacity-0 pointer-events-none'
                        : 'w-80 h-36 bg-transparent cursor-grab'
                }
                ${isDragging ? 'cursor-grabbing select-none' : ''}
            `}
            style={isLogFullscreen ? {} : { left: position.x, bottom: -position.y }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseDown={!isLogFullscreen ? handleMouseDown : undefined}
            onClick={handleClick}
        >

            {/* 日志内容区域 */}
            <div className={`
                flex-1 relative overflow-hidden
                ${isLogFullscreen ? 'bg-black/95' : ''}
            `}>
                <div
                    ref={scrollRef}
                    className="absolute inset-0 overflow-y-auto pl-1 pr-2"
                    style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        maskImage: isLogFullscreen ? 'none' : 'linear-gradient(to bottom, transparent 0%, black 10%, black 100%)',
                        WebkitMaskImage: isLogFullscreen ? 'none' : 'linear-gradient(to bottom, transparent 0%, black 10%, black 100%)'
                    }}
                >
                    <div className="space-y-2 min-h-full flex flex-col justify-end pb-0">
                        {logs.map((log, index) => {
                            const isLast = index === logs.length - 1;
                            const style = getLogStyle(log.type);

                            // 电影模式特殊渲染
                            if (log.type === 'cinematic') {
                                return (
                                    <div key={log.id} className="py-2 text-center my-1 border-y border-gray-800/30 bg-gray-900/20">
                                        <span className={`text-xs ${style.font} ${style.color}`}>
                                            {isLast
                                                ? <Typewriter text={log.text} config={style} sanity={sanity} onUpdate={handleTypewriterUpdate} />
                                                : log.text
                                            }
                                        </span>
                                    </div>
                                );
                            }

                            // 标准日志渲染
                            const isAiGenType = log.type === 'ai-gen';
                            const textContent = isLast
                                ? <Typewriter text={log.text} config={style} sanity={sanity} onUpdate={handleTypewriterUpdate} isAiGen={isAiGenType} />
                                : <SanityText text={log.text} sanity={sanity} />;

                            return (
                                <LogLine
                                    key={log.id}
                                    icon={style.IconComponent}
                                    iconColor={style.iconColor}
                                    text={textContent}
                                    textColor={style.color}
                                    font={style.font}
                                    isLast={isLast}
                                    isFullscreen={isLogFullscreen}
                                    indentLevel={log.indentLevel}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 全屏模式关闭提示 */}
            {isLogFullscreen && (
                <div className="absolute top-4 right-4 text-gray-500 text-xs animate-pulse pointer-events-none">
                    [CLICK TO MINIMIZE]
                </div>
            )}

            <style>{`
                .custom-scrollbar-hidden::-webkit-scrollbar { display: none; }
                .text-shadow-purple { text-shadow: 0 0 5px rgba(168, 85, 247, 0.5); }
            `}</style>
        </div>
    );
});
