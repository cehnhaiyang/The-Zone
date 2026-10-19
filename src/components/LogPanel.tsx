/**
LogPanel.tsx - 游戏日志面板组件（神经链接仪 · 认知日志）

视觉隐喻：日志是神经链接仪「认知滤网」翻译后的数据流。
  理智 = 滤网完整度。理智高时，画面是冷静、克制的目镜读数；
  理智下降时，真实信号开始从滤网缝隙里渗出：扫描线 → 颗粒 → 色散 → 撕裂 → 红色警告框
  （对应设定中清理人眼里「一团闪烁的红色警告框」，以及「第二次看见」的临界状态）。

形态状态机（与原版一致）：
- orb        观测瞳。全透明发光小球，可拖拽，点击展开全屏。
- preview    有新日志时，小球发光并向屏幕内侧展开单条日志，流式打字；
             打字完成后停留 5 秒（带倒计时线）并折叠回 orb。
- fullscreen 全屏认知日志：时间线脊柱 + 13 种类型各自的版式 + 四个频道过滤。

对外接口不变：props、AudioService 调用、LogType / Log / DotSoundType 契约均沿用。
不再依赖 ./Icons 与全局 Tailwind 自定义类（animate-panic / text-insanity 等），
所有样式收敛在本文件的 LOG_PANEL_CSS（统一 lp- 前缀）。
*/
import React, { useRef, useEffect, useLayoutEffect, useState, useCallback, useMemo } from 'react';
import { AudioService } from '../services';
import { DotSoundType, Log, LogType } from '../contract';

interface LogPanelProps {
    logs: Log[];
    isFullscreen: boolean;
    isLogFullscreen: boolean;
    setIsLogFullscreen: (v: boolean) => void;
    sanity: number;
}

/* ============================================================================
 * 一、类型与配置
 * ========================================================================== */

type LogFont = 'mono' | 'serif' | 'sans';
type LogFilterGroup = 'system' | 'narrative' | 'gameplay' | 'cognitive';
type SanityTier = 'calm' | 'uneasy' | 'strained' | 'breaking';

interface LogStyleConfig {
    /** 强调色（空格分隔 rgb，用于字形、光晕、边线） */
    accent: string;
    /** 正文色（空格分隔 rgb） */
    ink: string;
    font: LogFont;
    /** preview 抬头里的短标签 */
    code: string;
    /** 全屏版式里的标签文案；不填则该类型不显示标签 */
    label?: string;
    /** chip：与正文同行的徽标；meta：正文上方独立一行 */
    labelMode?: 'chip' | 'meta';
    /** 高亮数字与【】「」[]《》中的关键词 */
    emphasis?: boolean;
    baseSpeed: number;
    sfxType: DotSoundType;
}

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

const FILTER_GROUPS: Array<{ id: LogFilterGroup; label: string; hint: string; accent: string }> = [
    { id: 'system', label: '系统', hint: '运行时诊断', accent: '52 211 153' },
    { id: 'narrative', label: '叙事', hint: '场景与因果事件', accent: '96 165 250' },
    { id: 'gameplay', label: '行动', hint: '战斗、拾取与检定', accent: '251 191 36' },
    { id: 'cognitive', label: '认知', hint: '精神污染与高维信号', accent: '192 132 252' },
];

const ALL_GROUP_IDS = FILTER_GROUPS.map((g) => g.id);

const LOG_STYLE_MAP: Record<LogType, LogStyleConfig> = {
    info: { accent: '148 163 184', ink: '150 162 180', font: 'mono', code: '系统', baseSpeed: 16, sfxType: 'typing_2' },
    command: { accent: '52 211 153', ink: '110 231 183', font: 'mono', code: '指令', baseSpeed: 3, sfxType: 'typing_1' },
    warning: { accent: '251 191 36', ink: '252 211 77', font: 'mono', code: '警告', label: '警告', labelMode: 'chip', emphasis: true, baseSpeed: 10, sfxType: 'ui_notification' },
    critical: { accent: '255 82 82', ink: '255 122 122', font: 'mono', code: '致命', label: '致命', labelMode: 'chip', emphasis: true, baseSpeed: 12, sfxType: 'combat_crit' },
    cinematic: { accent: '214 211 209', ink: '228 224 218', font: 'serif', code: '场景', baseSpeed: 28, sfxType: 'typing_2' },
    event: { accent: '103 232 249', ink: '165 243 252', font: 'mono', code: '事件', label: '因果事件', labelMode: 'meta', emphasis: true, baseSpeed: 18, sfxType: 'typing_3' },
    environment: { accent: '192 132 252', ink: '216 180 254', font: 'serif', code: '环境', baseSpeed: 20, sfxType: 'search' },
    combat: { accent: '251 113 133', ink: '253 164 175', font: 'mono', code: '战斗', emphasis: true, baseSpeed: 8, sfxType: 'combat_hit' },
    loot: { accent: '252 211 77', ink: '253 224 138', font: 'mono', code: '拾取', label: '拾取', labelMode: 'chip', emphasis: true, baseSpeed: 15, sfxType: 'item_pickup' },
    success: { accent: '125 177 255', ink: '165 200 255', font: 'mono', code: '成功', emphasis: true, baseSpeed: 15, sfxType: 'success' },
    'ai-gen': { accent: '156 163 175', ink: '176 186 200', font: 'sans', code: '来源不明', label: '来源不明', labelMode: 'meta', baseSpeed: 22, sfxType: 'typing_3' },
    hallucination: { accent: '167 139 250', ink: '196 181 253', font: 'serif', code: '假信号', label: '视觉假信号', labelMode: 'meta', baseSpeed: 45, sfxType: 'error' },
    mental: { accent: '232 121 249', ink: '244 176 252', font: 'serif', code: '认知断裂', label: '认知断裂', labelMode: 'meta', baseSpeed: 45, sfxType: 'fail' },
};

const DEFAULT_LOG_STYLE: LogStyleConfig = LOG_STYLE_MAP.info;

const MAX_RENDER_LINES = 150;
/** 小球可点击区域（px）；可见球体 30px 居中，外圈留作触控余量 */
const ORB_HIT = 44;
/** 打字完成后到自动收起的等待时长（ms） */
const PREVIEW_COLLAPSE_MS = 5000;
/** 折叠动画时长（ms） */
const PREVIEW_LEAVE_MS = 260;
/** 小球初始位置（可见球体 左 16px / 底 96px） */
const DEFAULT_POSITION = { x: 9, bottom: 89 };
/** 贴底判定阈值（px） */
const STICK_THRESHOLD = 80;
/** 同一时刻最多被「故障」污染的历史行数上限 */
const GLITCH_POOL = 30;

const COOL_RGB = '140 190 255';
const ALARM_RGB = '255 96 96';

/* ============================================================================
 * 二、字形：13 种类型的自绘线性图标（16×16，统一线宽）
 * ========================================================================== */

const GLYPHS: Record<LogType, React.ReactNode> = {
    info: (<><rect x="3.5" y="3.5" width="9" height="9" rx="1.5" /><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" /></>),
    command: (<><path d="M5 4.5 L9.5 8 L5 11.5" /><path d="M10.5 11.5 H12.8" /></>),
    warning: (<><path d="M8 2.6 L14.2 13.2 H1.8 Z" /><path d="M8 6.6 V9.6" /><circle cx="8" cy="11.5" r=".55" fill="currentColor" stroke="none" /></>),
    critical: (<><path d="M8 1.6 L14.4 8 L8 14.4 L1.6 8 Z" fill="currentColor" fillOpacity=".16" /><path d="M8 4.8 V8.8" /><circle cx="8" cy="11" r=".6" fill="currentColor" stroke="none" /></>),
    cinematic: (<><rect x="1.8" y="3.4" width="12.4" height="9.2" rx="1" /><path d="M1.8 6 H14.2 M1.8 10 H14.2" /></>),
    event: (<><path d="M8 1.8 L14.2 8 L8 14.2 L1.8 8 Z" /><circle cx="8" cy="8" r="1.7" fill="currentColor" stroke="none" /></>),
    environment: (<><path d="M1.8 5.2 q2.05 -2.2 4.1 0 t4.1 0 t4.1 0" /><path d="M1.8 8.4 q2.05 -2.2 4.1 0 t4.1 0 t4.1 0" /><path d="M1.8 11.6 q2.05 -2.2 4.1 0 t4.1 0 t4.1 0" /></>),
    combat: (<path d="M8 1.4 L9.7 6.3 L14.6 8 L9.7 9.7 L8 14.6 L6.3 9.7 L1.4 8 L6.3 6.3 Z" />),
    loot: (<><path d="M8 1.8 L13.6 4.9 V11.1 L8 14.2 L2.4 11.1 V4.9 Z" /><path d="M2.4 4.9 L8 8 L13.6 4.9 M8 8 V14.2" /></>),
    success: (<><circle cx="8" cy="8" r="6" /><path d="M5.1 8.3 L7.1 10.3 L11 6.1" /></>),
    'ai-gen': (<><circle cx="3.8" cy="11.4" r="1.5" /><circle cx="8.2" cy="4.4" r="1.5" /><circle cx="12.6" cy="10" r="1.5" /><path d="M4.6 10.2 L7.5 5.6 M9.3 5.5 L11.9 8.7 M5.3 11.3 L11.1 10.3" /></>),
    hallucination: (<><path d="M2.6 9.2 Q9 3.2 15 9.2 Q9 15.2 2.6 9.2 Z" opacity=".3" /><path d="M1.5 7.6 Q8 1.6 14.5 7.6 Q8 13.6 1.5 7.6 Z" /><circle cx="8" cy="7.6" r="2" /></>),
    mental: (<><circle cx="8" cy="8" r="5.8" strokeDasharray="15 6" /><circle cx="8" cy="8" r="3" strokeDasharray="7 3.5" /><circle cx="8" cy="8" r=".6" fill="currentColor" stroke="none" /></>),
};

const Glyph: React.FC<{ type: LogType }> = React.memo(({ type }) => (
    <svg className="lp-glyph" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        {GLYPHS[type] ?? GLYPHS.info}
    </svg>
));
Glyph.displayName = 'Glyph';

/* ============================================================================
 * 三、工具函数
 * ========================================================================== */

const getTier = (sanity: number): SanityTier =>
    sanity > 70 ? 'calm' : sanity >= 50 ? 'uneasy' : sanity >= 30 ? 'strained' : 'breaking';

const TIER_LABEL: Record<SanityTier, string> = {
    calm: '滤网正常',
    uneasy: '滤网衰减',
    strained: '滤网失效中',
    breaking: '第二次看见 · 临近',
};

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

const formatTimestamp = (iso?: string): string => {
    if (!iso) return '';
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : date.toTimeString().slice(0, 8);
};

/** 数字、百分比、【】「」[]《》内的关键词 → 高亮节点 */
const EMPHASIS_RE = /(\d+(?:[.,]\d+)?%?|[【\[「《][^】\]」》]{1,24}[】\]」》])/g;
const renderEmphasis = (text: string): React.ReactNode => {
    const parts = text.split(EMPHASIS_RE);
    if (parts.length === 1) return text;
    return parts.map((part, i) => i % 2 === 0
        ? part
        : <b key={i} className={/^\d/.test(part) ? 'lp-num' : 'lp-key'}>{part}</b>);
};

const cssVars = (vars: Record<string, string | number>): React.CSSProperties => vars as unknown as React.CSSProperties;

/* ============================================================================
 * 四、文本组件
 * ========================================================================== */

/** 屏幕阅读器读原文，视觉层显示可能被污染的文本 */
const GlitchAware: React.FC<{ raw: string; shown: string; emphasis?: boolean }> = ({ raw, shown, emphasis }) => (
    <>
        {raw !== shown && <span className="lp-sr">{raw}</span>}
        <span className="lp-echo" data-text={shown} aria-hidden={raw !== shown || undefined}>
            {emphasis ? renderEmphasis(shown) : shown}
        </span>
    </>
);

/** 单实例：带定时器的理智驱动文本（仅用于 preview 与全屏「正在打字」的那一行） */
const SanityText: React.FC<{ text: string; sanity: number; emphasis?: boolean }> = React.memo(({ text, sanity, emphasis }) => {
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

    if (!text) return null;
    return <GlitchAware raw={text} shown={renderText} emphasis={emphasis} />;
});
SanityText.displayName = 'SanityText';

/** 历史行文本：无定时器，是否故障由面板级 ticker 通过 seed 决定 */
const StaticText: React.FC<{ text: string; seed: number; severity: number; emphasis?: boolean }> = React.memo(({ text, seed, severity, emphasis }) => {
    const shown = useMemo(
        () => (seed > 0 && severity > 0 ? glitchText(text, severity) : text),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [text, seed, severity]
    );
    return <GlitchAware raw={text} shown={shown} emphasis={emphasis} />;
});
StaticText.displayName = 'StaticText';

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
            <SanityText text={displayedText} sanity={sanity} emphasis={config.emphasis} />
            {!isComplete && <span className="lp-cursor" aria-hidden="true" />}
        </>
    );
};

/* ============================================================================
 * 五、全屏日志行
 * ========================================================================== */

const LogRow: React.FC<{
    log: Log;
    style: LogStyleConfig;
    sanity: number;
    glitchSeed: number;
    glitchSeverity: number;
    fresh: boolean;
    live: boolean;
    onLiveUpdate: () => void;
    onLiveComplete: () => void;
}> = React.memo(({ log, style, sanity, glitchSeed, glitchSeverity, fresh, live, onLiveUpdate, onLiveComplete }) => {
    const indent = Math.min(2, Math.max(0, log.indentLevel ?? 0));
    const vars = cssVars({ '--a': style.accent, '--tc': style.ink, '--ind': indent });

    const body = live
        ? (
            <>
                <span className="lp-sr">{log.text}</span>
                <span aria-hidden="true">
                    <Typewriter
                        text={log.text}
                        config={style}
                        sanity={sanity}
                        onUpdate={onLiveUpdate}
                        onComplete={onLiveComplete}
                        isAiGen={log.type === 'ai-gen'}
                    />
                </span>
            </>
        )
        : <StaticText text={log.text} seed={glitchSeed} severity={glitchSeverity} emphasis={style.emphasis} />;

    // 过场大幕：全宽章节卡，不进入时间线脊柱
    if (log.type === 'cinematic') {
        return (
            <li className="lp-chapter" data-type="cinematic" data-fresh={fresh || undefined} style={vars}>
                <i className="lp-chapter-mark" aria-hidden="true" />
                <div className="lp-txt" data-font={style.font}>{body}</div>
            </li>
        );
    }

    const timeText = formatTimestamp(log.timestamp);
    return (
        <li className="lp-row" data-type={log.type} data-fresh={fresh || undefined} data-ind={indent || undefined} style={vars}>
            <time className="lp-t" dateTime={log.timestamp}>{timeText}</time>
            <span className="lp-node"><Glyph type={log.type} /></span>
            <div className="lp-c">
                {style.label && style.labelMode === 'meta' && <div className="lp-meta">{style.label}</div>}
                <div className="lp-txt" data-font={style.font}>
                    {style.label && style.labelMode === 'chip' && <span className="lp-tag">{style.label}</span>}
                    {body}
                </div>
            </div>
        </li>
    );
});
LogRow.displayName = 'LogRow';

/* ============================================================================
 * 六、面板级 hook：低理智时，每隔一段时间随机挑几行「被污染」
 *    （原版每行一个定时器，150 行即 150 个 interval；这里整个面板只有 1 个）
 * ========================================================================== */

const EMPTY_SEEDS: Record<string, number> = {};

const useGlitchSeeds = (ids: string[], sanity: number, enabled: boolean): Record<string, number> => {
    const [seeds, setSeeds] = useState<Record<string, number>>(EMPTY_SEEDS);
    const idsRef = useRef(ids);
    idsRef.current = ids;
    const roundedSanity = Math.round(sanity);

    useEffect(() => {
        if (!enabled || roundedSanity >= 50) { setSeeds(EMPTY_SEEDS); return; }
        const chaos = (100 - roundedSanity) / 100;
        const interval = Math.max(220, 520 - (100 - roundedSanity) * 4);
        const count = Math.min(5, Math.max(1, Math.round(chaos * 6)));
        let n = 0;
        const timer = setInterval(() => {
            const pool = idsRef.current.slice(-GLITCH_POOL);
            if (!pool.length) return;
            const next: Record<string, number> = {};
            for (let i = 0; i < count; i++) next[pool[Math.floor(Math.random() * pool.length)]] = ++n;
            setSeeds(next);
        }, interval);
        return () => clearInterval(timer);
    }, [enabled, roundedSanity]);

    return seeds;
};

/* ============================================================================
 * 七、主组件
 * ========================================================================== */

export const LogPanel: React.FC<LogPanelProps> = React.memo(({
    logs, isFullscreen, isLogFullscreen, setIsLogFullscreen, sanity
}) => {
    // preview 形态下展示的单条日志；为 null 即回到 orb 形态
    const [previewLog, setPreviewLog] = useState<Log | null>(null);
    const [previewPhase, setPreviewPhase] = useState<'typing' | 'dwell' | 'leaving'>('typing');
    const [activeGroups, setActiveGroups] = useState<Set<LogFilterGroup>>(() => new Set(ALL_GROUP_IDS));
    const [liveId, setLiveId] = useState<string | null>(null);
    const [unseen, setUnseen] = useState(0);
    const [, bump] = useState(0);

    const scrollRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const closeBtnRef = useRef<HTMLButtonElement>(null);
    const posRef = useRef({ ...DEFAULT_POSITION });
    const hasDraggedRef = useRef(false);
    const dragRef = useRef<{ id: number; startX: number; startY: number; startPosX: number; startPosBottom: number } | null>(null);
    const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const stickRef = useRef(true);
    // 记录已见过的最新日志 id，避免挂载时回放历史日志
    const lastSeenLogIdRef = useRef<string | null>(logs.length ? logs[logs.length - 1].id : null);

    const tier = getTier(sanity);
    const san01 = Math.min(1, Math.max(0, sanity / 100));

    const clearPreviewTimers = useCallback(() => {
        if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
        if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
        collapseTimerRef.current = null;
        leaveTimerRef.current = null;
    }, []);

    // 卸载清理
    useEffect(() => clearPreviewTimers, [clearPreviewTimers]);

    /** 将小球钳制在视口内 */
    const clampPosition = useCallback((x: number, bottom: number) => ({
        x: Math.min(Math.max(4, x), Math.max(4, window.innerWidth - ORB_HIT - 4)),
        bottom: Math.min(Math.max(4, bottom), Math.max(4, window.innerHeight - ORB_HIT - 4)),
    }), []);

    const applyPosition = useCallback(() => {
        const el = panelRef.current;
        if (!el) return;
        el.style.left = `${posRef.current.x}px`;
        el.style.bottom = `${posRef.current.bottom}px`;
    }, []);

    // 窗口尺寸变化时重新钳制
    useEffect(() => {
        const onResize = () => {
            posRef.current = clampPosition(posRef.current.x, posRef.current.bottom);
            applyPosition();
            bump(n => n + 1);
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [clampPosition, applyPosition]);

    /** 打开 / 关闭全屏 */
    const handleOpen = useCallback(() => {
        AudioService.playSfx('ui_transition');
        clearPreviewTimers();
        setPreviewLog(null);
        setPreviewPhase('typing');
        setIsLogFullscreen(true);
    }, [clearPreviewTimers, setIsLogFullscreen]);

    const handleClose = useCallback(() => {
        AudioService.playSfx('ui_transition');
        setIsLogFullscreen(false);
    }, [setIsLogFullscreen]);

    /** 拖拽小球（Pointer Events：鼠标 / 触控 / 手写笔通用） */
    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        hasDraggedRef.current = false;
        dragRef.current = {
            id: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            startPosX: posRef.current.x,
            startPosBottom: posRef.current.bottom,
        };
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 忽略 */ }
    }, []);

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.id !== e.pointerId) return;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (!hasDraggedRef.current && Math.abs(dx) <= 5 && Math.abs(dy) <= 5) return;
        if (!hasDraggedRef.current) {
            hasDraggedRef.current = true;
            if (panelRef.current) panelRef.current.dataset.dragging = 'true';
        }
        posRef.current = clampPosition(drag.startPosX + dx, drag.startPosBottom - dy);
        applyPosition();
    }, [clampPosition, applyPosition]);

    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.id !== e.pointerId) return;
        dragRef.current = null;
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* 忽略 */ }
        if (panelRef.current) delete panelRef.current.dataset.dragging;
        if (hasDraggedRef.current) {
            hasDraggedRef.current = false;
            bump(n => n + 1); // 重新计算 preview 展开方向
        } else {
            handleOpen();
        }
    }, [handleOpen]);

    const handlePointerCancel = useCallback(() => {
        dragRef.current = null;
        hasDraggedRef.current = false;
        if (panelRef.current) delete panelRef.current.dataset.dragging;
    }, []);

    const handleOrbKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpen(); }
    }, [handleOpen]);

    /** 检测到新日志 -> orb 进入 preview；全屏中则让该行「现场打字」 */
    useEffect(() => {
        if (!logs.length) return;
        const latest = logs[logs.length - 1];
        if (latest.id === lastSeenLogIdRef.current) return;
        lastSeenLogIdRef.current = latest.id;
        if (isLogFullscreen) { setLiveId(latest.id); return; }
        clearPreviewTimers();
        setPreviewLog(latest);
        setPreviewPhase('typing');
    }, [logs, isLogFullscreen, clearPreviewTimers]);

    useEffect(() => { if (!isLogFullscreen) setLiveId(null); }, [isLogFullscreen]);

    /** 打字完成 -> 停留 5 秒（倒计时线）-> 折叠动画 -> 回到 orb */
    const handlePreviewComplete = useCallback(() => {
        clearPreviewTimers();
        setPreviewPhase('dwell');
        collapseTimerRef.current = setTimeout(() => {
            setPreviewPhase('leaving');
            leaveTimerRef.current = setTimeout(() => {
                setPreviewLog(null);
                setPreviewPhase('typing');
            }, PREVIEW_LEAVE_MS);
        }, PREVIEW_COLLAPSE_MS);
    }, [clearPreviewTimers]);

    /* ---------- 全屏：数据 ---------- */

    // 打开瞬间的日志快照：此后新增的行才播放入场动画 / 现场打字
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const openIds = useMemo(() => (isLogFullscreen ? new Set(logs.map(l => l.id)) : null), [isLogFullscreen]);

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
    const groupCounts = useMemo(() => {
        const counts: Record<LogFilterGroup, number> = { system: 0, narrative: 0, gameplay: 0, cognitive: 0 };
        if (isLogFullscreen) for (const log of logs) counts[LOG_TYPE_GROUPS[log.type] ?? 'system'] += 1;
        return counts;
    }, [logs, isLogFullscreen]);

    const renderIds = useMemo(() => renderLogs.map(l => l.id), [renderLogs]);
    const glitchSeeds = useGlitchSeeds(renderIds, sanity, isLogFullscreen);
    const glitchSeverity = Math.min(1.4, Math.max(0, (50 - sanity) / 30));

    /* ---------- 全屏：滚动 ---------- */

    const scrollToBottom = useCallback(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, []);

    const handleScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const near = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD;
        stickRef.current = near;
        if (near) setUnseen(prev => (prev === 0 ? prev : 0));
    }, []);

    const handleLiveUpdate = useCallback(() => {
        if (stickRef.current) scrollToBottom();
    }, [scrollToBottom]);

    const handleLiveComplete = useCallback(() => setLiveId(null), []);

    const jumpToLatest = useCallback(() => {
        AudioService.playSfx('ui_click');
        stickRef.current = true;
        setUnseen(0);
        scrollToBottom();
    }, [scrollToBottom]);

    // 打开 / 切换过滤：回到底部
    useLayoutEffect(() => {
        if (!isLogFullscreen) return;
        stickRef.current = true;
        setUnseen(0);
        scrollToBottom();
    }, [isLogFullscreen, activeGroups, scrollToBottom]);

    // 新增可见日志：贴底则跟随，否则累计「新消息」
    const lastVisibleId = renderLogs.length ? renderLogs[renderLogs.length - 1].id : null;
    const prevVisibleIdRef = useRef<string | null>(lastVisibleId);
    useLayoutEffect(() => {
        if (!isLogFullscreen) { prevVisibleIdRef.current = lastVisibleId; return; }
        if (lastVisibleId === prevVisibleIdRef.current) return;
        prevVisibleIdRef.current = lastVisibleId;
        if (stickRef.current) scrollToBottom();
        else setUnseen(n => n + 1);
    }, [lastVisibleId, isLogFullscreen, scrollToBottom]);

    // 全屏：Esc 关闭 + 初始聚焦关闭按钮
    useEffect(() => {
        if (!isLogFullscreen) return;
        closeBtnRef.current?.focus({ preventScroll: true });
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isLogFullscreen, handleClose]);

    /* ======================================================================
     * 全屏形态
     * ==================================================================== */
    if (isLogFullscreen) {
        const omitted = visibleLogs.length - renderLogs.length;
        const noSignal = renderLogs.length === 0;
        return (
            <div
                className="lp lp-fs"
                role="dialog"
                aria-modal="true"
                aria-label="神经链接仪 · 认知日志"
                data-tier={tier}
                style={cssVars({ '--san': san01 })}
            >
                <style>{LOG_PANEL_CSS}</style>
                <div className="lp-atmo" aria-hidden="true" />

                <div className="lp-frame">
                    <header className="lp-hd">
                        <svg className="lp-emblem" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 2.4 L20.6 7.2 V16.8 L12 21.6 L3.4 16.8 V7.2 Z" />
                            <path d="M6.6 12 Q12 7 17.4 12 Q12 17 6.6 12 Z" />
                            <circle cx="12" cy="12" r="1.9" fill="currentColor" stroke="none" />
                        </svg>
                        <div className="lp-title">
                            <b>神经链接仪<i className="lp-caret" aria-hidden="true" /></b>
                            <span>COGNITIVE LOG</span>
                        </div>

                        <div className="lp-gauge" title={`理智 ${Math.round(sanity)}`}>
                            <span className="lp-gauge-k">理智</span>
                            <span className="lp-gauge-wrap"><span className="lp-gauge-bar"><span className="lp-gauge-fill" /></span></span>
                            <span className="lp-gauge-num">{Math.round(sanity)}</span>
                        </div>

                        <button
                            ref={closeBtnRef}
                            type="button"
                            className="lp-x"
                            aria-label="关闭日志（Esc）"
                            onClick={handleClose}
                            onMouseEnter={() => AudioService.playSfx('ui_hover')}
                        >
                            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
                                <path d="M3.5 3.5 L12.5 12.5 M12.5 3.5 L3.5 12.5" />
                            </svg>
                        </button>
                    </header>

                    <nav className="lp-flt" aria-label="日志频道">
                        {FILTER_GROUPS.map(g => {
                            const active = activeGroups.has(g.id);
                            return (
                                <button
                                    key={g.id}
                                    type="button"
                                    className="lp-chip"
                                    aria-pressed={active}
                                    title={g.hint}
                                    style={cssVars({ '--a': g.accent })}
                                    onClick={() => toggleGroup(g.id)}
                                    onMouseEnter={() => AudioService.playSfx('ui_hover')}
                                >
                                    <i aria-hidden="true" />
                                    {g.label}
                                    <em>{groupCounts[g.id]}</em>
                                </button>
                            );
                        })}
                    </nav>

                    <div className="lp-body">
                        <div ref={scrollRef} className="lp-scroll" role="log" aria-live="polite" aria-relevant="additions" onScroll={handleScroll}>
                            <ol className="lp-list">
                                {omitted > 0 && (
                                    <li className="lp-omit">更早的 {omitted} 条记录已折叠</li>
                                )}
                                {renderLogs.map((log) => {
                                    const style = LOG_STYLE_MAP[log.type] ?? DEFAULT_LOG_STYLE;
                                    const seed = glitchSeeds[log.id] ?? 0;
                                    return (
                                        <LogRow
                                            key={log.id}
                                            log={log}
                                            style={style}
                                            sanity={sanity}
                                            glitchSeed={seed}
                                            glitchSeverity={seed ? glitchSeverity : 0}
                                            fresh={!!openIds && !openIds.has(log.id)}
                                            live={log.id === liveId}
                                            onLiveUpdate={handleLiveUpdate}
                                            onLiveComplete={handleLiveComplete}
                                        />
                                    );
                                })}
                            </ol>
                        </div>

                        {noSignal && (
                            <div className="lp-empty">
                                <b>无信号</b>
                                <span>{logs.length ? '所有频道均已静音，点按上方频道恢复' : '链路已建立，等待第一条记录'}</span>
                            </div>
                        )}
                        {unseen > 0 && (
                            <button type="button" className="lp-jump" onClick={jumpToLatest}>
                                ↓ {unseen} 条新记录
                            </button>
                        )}
                    </div>

                    <footer className="lp-ft">
                        <span className="lp-ft-link"><i aria-hidden="true" />{TIER_LABEL[tier]}</span>
                        <span className="lp-ft-n">{visibleLogs.length} / {logs.length}</span>
                    </footer>
                </div>

                <div className="lp-fx lp-fx-scan" aria-hidden="true" />
                <div className="lp-fx lp-fx-beam" aria-hidden="true" />
                <div className="lp-fx lp-fx-grain" aria-hidden="true" />
                <div className="lp-fx lp-fx-vig" aria-hidden="true" />
                <div className="lp-fx lp-fx-chroma" aria-hidden="true" />
                {tier === 'breaking' && (
                    <div className="lp-fx lp-boxes" aria-hidden="true">
                        <span className="lp-box">无法解析</span>
                        <span className="lp-box">⚠</span>
                        <span className="lp-box">几何异常</span>
                    </div>
                )}
            </div>
        );
    }

    // 游戏沉浸模式下隐藏
    if (isFullscreen) return null;

    /* ======================================================================
     * orb / preview 形态
     * ==================================================================== */
    const isLowSanity = sanity < 40;
    const previewStyle = previewLog ? (LOG_STYLE_MAP[previewLog.type] ?? DEFAULT_LOG_STYLE) : null;
    // 球色只表达理智（冷静蓝 / 崩溃红），类型色留给日志卡片
    const orbRgb = isLowSanity ? ALARM_RGB : COOL_RGB;

    // 依据可用空间决定 preview 展开方向与最大宽度，避免越出屏幕
    let side: 'left' | 'right' = 'right';
    let previewMax = 300;
    if (previewLog) {
        const vw = window.innerWidth;
        const spaceRight = vw - (posRef.current.x + ORB_HIT) - 12;
        const spaceLeft = posRef.current.x - 12;
        side = spaceRight >= 220 || spaceRight >= spaceLeft ? 'right' : 'left';
        previewMax = Math.max(150, Math.min(320, (side === 'right' ? spaceRight : spaceLeft) - 18));
    }

    return (
        <div
            ref={panelRef}
            className="lp lp-orb"
            data-tier={tier}
            data-active={previewLog ? 'true' : 'false'}
            style={{ left: posRef.current.x, bottom: posRef.current.bottom, ...cssVars({ '--o': orbRgb }) }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
        >
            <style>{LOG_PANEL_CSS}</style>

            {/* 新日志到达时的两圈扩散涟漪 */}
            {previewLog && <span key={`${previewLog.id}-a`} className="lp-ping" aria-hidden="true" />}
            {previewLog && <span key={`${previewLog.id}-b`} className="lp-ping lp-ping-b" aria-hidden="true" />}

            {/* 观测瞳 */}
            <div className="lp-orb-hit" role="button" tabIndex={0} aria-label="打开日志面板" onKeyDown={handleOrbKeyDown}>
                <div className="lp-orb-body">
                    <svg className="lp-orb-ring" viewBox="0 0 28 28" aria-hidden="true">
                        <circle cx="14" cy="14" r="11.6" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeDasharray="13 4 2 4" />
                    </svg>
                    <svg className="lp-orb-ring lp-orb-ring-2" viewBox="0 0 28 28" aria-hidden="true">
                        <circle cx="14" cy="14" r="7.4" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeDasharray="3 5" />
                    </svg>
                    <span className="lp-orb-core" />
                </div>
            </div>

            {/* preview：从球体「射出」的单条日志 */}
            {previewLog && previewStyle && (
                <div className="lp-pv" data-side={side} data-phase={previewPhase} style={cssVars({ '--pv-max': `${previewMax}px` })} aria-hidden="true">
                    <span className="lp-pv-link" />
                    <div
                        key={previewLog.id}
                        className="lp-pv-card"
                        data-type={previewLog.type}
                        style={cssVars({ '--a': previewStyle.accent, '--tc': previewStyle.ink, '--fs': '12.5px' })}
                    >
                        <div className="lp-pv-meta">
                            <span className="lp-pv-ico"><Glyph type={previewLog.type} /></span>
                            <span>{previewStyle.code}</span>
                            <time>{formatTimestamp(previewLog.timestamp)}</time>
                        </div>
                        <div className="lp-txt" data-font={previewStyle.font}>
                            <Typewriter
                                text={previewLog.text}
                                config={previewStyle}
                                sanity={sanity}
                                onComplete={handlePreviewComplete}
                                isAiGen={previewLog.type === 'ai-gen'}
                            />
                        </div>
                        {previewPhase === 'dwell' && (
                            <span className="lp-pv-timer" style={{ animationDuration: `${PREVIEW_COLLAPSE_MS}ms` }} />
                        )}
                    </div>
                </div>
            )}

            {/* 屏幕阅读器：整条播报一次，而不是逐字 */}
            <div className="lp-sr" role="log" aria-live="polite">{previewLog?.text}</div>
        </div>
    );
});
LogPanel.displayName = 'LogPanel';

/* ============================================================================
 * 八、样式（统一 lp- 前缀，自包含）
 * ========================================================================== */

const NOISE_URI = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

const LOG_PANEL_CSS = `
/* ---------- tokens ---------- */
.lp{
  --font-mono:ui-monospace,"JetBrains Mono","SF Mono","Cascadia Mono",Menlo,Consolas,"Noto Sans Mono CJK SC","PingFang SC","Microsoft YaHei",monospace;
  --font-serif:"Noto Serif SC","Source Han Serif SC","Songti SC","STSong","SimSun",ui-serif,Georgia,serif;
  --font-sans:system-ui,-apple-system,"Segoe UI","PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif;
  --base:5 7 12; --line:150 175 215; --chrome:140 190 255; --alarm:255 92 92;
  --a:150 160 175; --tc:190 200 215; --fs:15px; --san:1;
  font-family:var(--font-mono); -webkit-font-smoothing:antialiased;
}
.lp *,.lp *::before,.lp *::after{box-sizing:border-box}
.lp[data-tier=calm]{--gc:122 200 255}
.lp[data-tier=uneasy]{--gc:251 191 36}
.lp[data-tier=strained]{--gc:255 128 76;--chrome:255 104 96}
.lp[data-tier=breaking]{--gc:255 72 72;--chrome:255 104 96}
.lp-sr{position:absolute!important;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}

/* ---------- shared text ---------- */
.lp-txt{color:rgb(var(--tc));font-size:var(--fs);line-height:1.6;overflow-wrap:anywhere}
.lp-txt[data-font=mono]{font-family:var(--font-mono)}
.lp-txt[data-font=serif]{font-family:var(--font-serif);line-height:1.75}
.lp-txt[data-font=sans]{font-family:var(--font-sans)}
.lp-num{color:rgb(var(--a));font-weight:700;font-variant-numeric:tabular-nums;text-shadow:0 0 8px rgb(var(--a)/.5)}
.lp-key{color:rgb(255 255 255/.93);border-bottom:1px dotted rgb(var(--a)/.75)}
.lp-cursor{display:inline-block;width:.5em;height:1em;margin-left:2px;vertical-align:-.14em;background:rgb(var(--a)/.85);box-shadow:0 0 6px rgb(var(--a)/.7);animation:lp-blink 1s steps(1) infinite}
.lp-echo{position:relative}
.lp-glyph{display:block;width:100%;height:100%;overflow:visible}

/* per-type text */
.lp [data-type=info] .lp-txt{font-size:calc(var(--fs)*.93)}
.lp [data-type=command] .lp-txt::before{content:'›';margin-right:.6em;color:rgb(var(--a)/.75)}
.lp [data-type=warning] .lp-txt,.lp [data-type=critical] .lp-txt{font-weight:700}
.lp [data-type=critical] .lp-txt{text-shadow:0 0 10px rgb(var(--a)/.55)}
.lp [data-type=combat] .lp-txt{font-weight:600}
.lp [data-type=environment] .lp-txt{font-style:italic;text-shadow:0 0 14px rgb(var(--a)/.45)}
.lp [data-type=ai-gen] .lp-txt{font-weight:300;font-style:italic;letter-spacing:.06em;opacity:.78}
.lp [data-type=hallucination] .lp-txt{font-style:italic}
.lp [data-type=mental] .lp-txt{font-style:italic;font-size:calc(var(--fs)*1.1);letter-spacing:.04em;text-shadow:0 0 14px rgb(var(--a)/.4)}
.lp [data-type=hallucination] .lp-echo,.lp [data-type=mental] .lp-echo,.lp [data-type=ai-gen] .lp-echo{display:inline-block;max-width:100%}
.lp [data-type=hallucination] .lp-echo::before,.lp [data-type=hallucination] .lp-echo::after,
.lp [data-type=mental] .lp-echo::after,.lp [data-type=ai-gen] .lp-echo::after{content:attr(data-text);position:absolute;left:0;top:0;width:100%;pointer-events:none}
.lp [data-type=hallucination] .lp-echo::before{color:rgb(0 240 255/.38);mix-blend-mode:screen;transform:translate(-1.6px,0);animation:lp-chroma-a 3.4s steps(1) infinite}
.lp [data-type=hallucination] .lp-echo::after{color:rgb(255 40 90/.38);mix-blend-mode:screen;transform:translate(1.6px,0);animation:lp-chroma-b 2.7s steps(1) infinite}
.lp [data-type=mental] .lp-echo::after{color:rgb(var(--a)/.4);transform:translate(2px,1px);filter:blur(1.3px)}
.lp [data-type=ai-gen] .lp-echo::after{color:rgb(var(--a)/.22);transform:translate(1.5px,1px)}

/* =========================================================
   FULLSCREEN
   ========================================================= */
.lp-fs{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;background:rgb(var(--base));color:rgb(var(--tc));overflow:hidden;animation:lp-boot .42s cubic-bezier(.2,.85,.2,1) backwards}
.lp-atmo{position:absolute;inset:0;pointer-events:none;
  background:
    radial-gradient(80% 60% at 100% 0%,rgb(120 60 200/.11),transparent 62%),
    radial-gradient(70% 60% at 0% 100%,rgb(40 90 190/.10),transparent 62%),
    radial-gradient(60% 40% at 50% 118%,rgb(190 30 40/calc(.03 + (1 - var(--san))*.14)),transparent 72%)}
.lp-frame{position:relative;z-index:2;flex:1;min-height:0;display:flex;flex-direction:column}
.lp-fs[data-tier=strained] .lp-frame{animation:lp-tear 9s steps(1) infinite}
.lp-fs[data-tier=breaking] .lp-frame{animation:lp-tear 5s steps(1) infinite}

/* header */
.lp-hd{position:relative;display:flex;align-items:center;gap:12px;padding:calc(10px + env(safe-area-inset-top,0px)) 14px 10px 16px;border-bottom:1px solid rgb(var(--line)/.10);background:linear-gradient(180deg,rgb(255 255 255/.03),transparent)}
.lp-hd::after{content:'';position:absolute;left:0;bottom:-1px;width:140px;height:1px;background:linear-gradient(90deg,rgb(var(--chrome)),transparent)}
.lp-emblem{flex:none;width:26px;height:26px;color:rgb(var(--chrome));filter:drop-shadow(0 0 6px rgb(var(--chrome)/.6))}
.lp-title{display:flex;flex-direction:column;gap:4px;min-width:0}
.lp-title b{font:700 14px/1 var(--font-serif);letter-spacing:.32em;color:rgb(var(--chrome));text-shadow:0 0 12px rgb(var(--chrome)/.5);white-space:nowrap}
.lp-title span{font:400 9px/1 var(--font-mono);letter-spacing:.34em;color:rgb(var(--line)/.4)}
.lp-caret{display:inline-block;width:5px;height:11px;margin-left:8px;vertical-align:-1px;background:rgb(var(--chrome)/.85);animation:lp-blink 1s steps(1) infinite}
.lp-gauge{margin-left:auto;display:flex;align-items:center;gap:9px;font:600 11px/1 var(--font-mono);color:rgb(var(--line)/.55)}
.lp-gauge-k{letter-spacing:.2em}
.lp-gauge-wrap{display:block;filter:drop-shadow(0 0 4px rgb(var(--gc)/.65))}
.lp-gauge-bar{position:relative;display:block;width:104px;height:9px;background:rgb(var(--line)/.16);
  -webkit-mask-image:repeating-linear-gradient(90deg,#000 0 4px,transparent 4px 6px);mask-image:repeating-linear-gradient(90deg,#000 0 4px,transparent 4px 6px)}
.lp-gauge-fill{position:absolute;left:0;top:0;bottom:0;width:calc(var(--san)*100%);background:rgb(var(--gc));transition:width .6s ease,background .6s}
.lp-fs[data-tier=breaking] .lp-gauge-fill{animation:lp-gauge-flick .8s steps(1) infinite}
.lp-gauge-num{min-width:2.2ch;text-align:right;color:rgb(var(--gc));font-variant-numeric:tabular-nums;font-size:13px}
.lp-x{flex:none;width:32px;height:32px;display:grid;place-items:center;color:rgb(var(--line)/.6);background:rgb(255 255 255/.02);border:1px solid rgb(var(--line)/.2);border-radius:2px;cursor:pointer;transition:color .15s,border-color .15s,box-shadow .15s}
.lp-x:hover,.lp-x:focus-visible{outline:none;color:rgb(var(--chrome));border-color:rgb(var(--chrome)/.65);box-shadow:0 0 14px rgb(var(--chrome)/.28)}

/* channels */
.lp-flt{display:flex;gap:2px;padding:0 10px;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid rgb(var(--line)/.08);background:rgb(0 0 0/.28)}
.lp-flt::-webkit-scrollbar{display:none}
.lp-chip{--a:150 160 175;display:inline-flex;align-items:center;gap:8px;padding:11px 14px 10px;font:600 13px/1 var(--font-serif);letter-spacing:.18em;color:rgb(var(--line)/.38);background:none;border:0;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap;transition:color .15s,border-color .15s,background .15s}
.lp-chip i{width:6px;height:6px;transform:rotate(45deg);border:1px solid rgb(var(--a)/.5);transition:background .15s,box-shadow .15s}
.lp-chip em{font:400 10px/1 var(--font-mono);font-style:normal;letter-spacing:.04em;opacity:.6;font-variant-numeric:tabular-nums}
.lp-chip:hover{color:rgb(var(--a)/.8)}
.lp-chip:focus-visible{outline:1px solid rgb(var(--a)/.8);outline-offset:-3px}
.lp-chip[aria-pressed=true]{color:rgb(var(--a));border-bottom-color:rgb(var(--a));background:linear-gradient(180deg,transparent,rgb(var(--a)/.09))}
.lp-chip[aria-pressed=true] i{background:rgb(var(--a));border-color:transparent;box-shadow:0 0 8px rgb(var(--a))}

/* body + scroll */
.lp-body{position:relative;flex:1;min-height:0}
.lp-scroll{position:absolute;inset:0;overflow-y:auto;overscroll-behavior:contain;padding:56px 0 10px;scrollbar-width:thin;scrollbar-color:rgb(var(--chrome)/.35) transparent;
  -webkit-mask-image:linear-gradient(180deg,transparent 0,#000 64px);mask-image:linear-gradient(180deg,transparent 0,#000 64px)}
.lp-scroll::-webkit-scrollbar{width:4px}
.lp-scroll::-webkit-scrollbar-thumb{background:rgb(var(--chrome)/.35);border-radius:2px}
.lp-fs[data-tier=breaking] .lp-scroll{animation:lp-tremor .16s steps(2) infinite}

/* timeline spine */
.lp-list{--tcol:64px;--lh:24px;--rail:calc(10px + var(--tcol) + 14px);position:relative;display:flex;flex-direction:column;justify-content:flex-end;gap:2px;min-height:100%;margin:0;padding:0;list-style:none}
.lp-list::before{content:'';position:absolute;top:0;bottom:0;left:var(--rail);width:1px;background:linear-gradient(180deg,transparent,rgb(var(--line)/.17) 140px)}
.lp-list::after{content:'';position:absolute;bottom:-5px;left:calc(var(--rail) - 2px);width:5px;height:5px;border-radius:50%;background:rgb(var(--chrome));box-shadow:0 0 10px 2px rgb(var(--chrome)/.8);animation:lp-blink 1.4s steps(1) infinite}
.lp-omit{align-self:stretch;padding:4px 0 10px;text-align:center;font:400 11px/1 var(--font-serif);letter-spacing:.3em;color:rgb(var(--line)/.28)}

/* row */
.lp-row{position:relative;display:grid;grid-template-columns:var(--tcol) 28px minmax(0,1fr);align-items:start;padding:3px 16px 3px 10px;opacity:.82;transition:opacity .2s,background .2s}
.lp-row:hover{opacity:1;background:linear-gradient(90deg,rgb(var(--a)/.05),transparent 72%)}
.lp-t{padding-right:10px;text-align:right;font:400 10px/var(--lh) var(--font-mono);font-variant-numeric:tabular-nums;color:rgb(var(--line)/.32);transition:color .2s}
.lp-row:hover .lp-t{color:rgb(var(--line)/.7)}
.lp-node{position:relative;display:grid;place-items:center;height:var(--lh);color:rgb(var(--a))}
.lp-node::before{content:'';position:absolute;width:20px;height:20px;border-radius:50%;background:rgb(var(--base));border:1px solid rgb(var(--a)/.3)}
.lp-node .lp-glyph{position:relative;width:12px;height:12px}
.lp-c{position:relative;min-width:0;margin-left:calc(var(--ind,0)*16px);min-height:var(--lh)}
.lp-row[data-ind] .lp-c::before{content:'';position:absolute;left:-14px;top:0;width:10px;height:calc(var(--lh)/2);border-left:1px solid rgb(var(--line)/.22);border-bottom:1px solid rgb(var(--line)/.22);border-bottom-left-radius:4px}
.lp-meta{margin:3px 0 1px;font:600 10px/1.4 var(--font-mono);letter-spacing:.24em;color:rgb(var(--a)/.8)}
.lp-tag{display:inline-block;margin-right:.75em;padding:2px 6px 2px;vertical-align:.14em;font:700 10px/1.2 var(--font-serif);letter-spacing:.2em;color:rgb(var(--a));background:rgb(var(--a)/.09);border:1px solid rgb(var(--a)/.5);border-radius:2px;text-shadow:none}

/* variants */
.lp-row[data-type=info] .lp-node::before{border-color:transparent}
.lp-row[data-type=command] .lp-node::before{border-style:dashed}

.lp-row[data-type=warning],.lp-row[data-type=critical]{opacity:1;background:linear-gradient(90deg,rgb(var(--a)/.10),transparent 62%)}
.lp-row[data-type=warning]::before,.lp-row[data-type=critical]::before{content:'';position:absolute;left:0;top:2px;bottom:2px;width:4px;background:repeating-linear-gradient(135deg,rgb(var(--a)) 0 3px,transparent 3px 6px)}
.lp-row[data-type=critical]{background:linear-gradient(90deg,rgb(var(--a)/.18),transparent 70%);animation:lp-crit-pulse 1.8s ease-in-out infinite}
.lp-row[data-type=critical] .lp-tag{color:#120405;background:rgb(var(--a));border-color:rgb(var(--a))}
.lp-row[data-type=critical] .lp-node::before{background:rgb(var(--a)/.16);border-color:rgb(var(--a)/.7);box-shadow:0 0 12px rgb(var(--a)/.55)}

.lp-chapter{position:relative;display:block;margin:12px 0;padding:24px 28px;text-align:center;background:linear-gradient(90deg,transparent,rgb(var(--base)/.94) 14%,rgb(var(--base)/.94) 86%,transparent)}
.lp-chapter::before,.lp-chapter::after{content:'';position:absolute;left:10%;right:10%;height:1px;background:linear-gradient(90deg,transparent,rgb(var(--a)/.38),transparent)}
.lp-chapter::before{top:0}.lp-chapter::after{bottom:0}
.lp-chapter-mark{display:block;width:6px;height:6px;margin:0 auto 12px;transform:rotate(45deg);border:1px solid rgb(var(--a)/.7);box-shadow:0 0 8px rgb(var(--a)/.4)}
.lp-chapter .lp-txt{font-size:calc(var(--fs)*1.08);line-height:1.95;letter-spacing:.14em;text-shadow:0 0 20px rgb(var(--a)/.28)}

.lp-row[data-type=event]{opacity:1}
.lp-row[data-type=event] .lp-c{margin-top:4px;margin-bottom:4px;padding:6px 14px 8px 14px;border:1px solid rgb(var(--a)/.22);border-radius:2px;background:linear-gradient(100deg,rgb(var(--a)/.09),rgb(var(--a)/.02))}
.lp-row[data-type=event] .lp-c::after{content:'';position:absolute;inset:-1px;pointer-events:none;
  background:
    linear-gradient(rgb(var(--a)),rgb(var(--a))) left top/9px 1px no-repeat,linear-gradient(rgb(var(--a)),rgb(var(--a))) left top/1px 9px no-repeat,
    linear-gradient(rgb(var(--a)),rgb(var(--a))) right top/9px 1px no-repeat,linear-gradient(rgb(var(--a)),rgb(var(--a))) right top/1px 9px no-repeat,
    linear-gradient(rgb(var(--a)),rgb(var(--a))) left bottom/9px 1px no-repeat,linear-gradient(rgb(var(--a)),rgb(var(--a))) left bottom/1px 9px no-repeat,
    linear-gradient(rgb(var(--a)),rgb(var(--a))) right bottom/9px 1px no-repeat,linear-gradient(rgb(var(--a)),rgb(var(--a))) right bottom/1px 9px no-repeat}
.lp-row[data-type=event] .lp-node{align-self:start;margin-top:8px}
.lp-row[data-type=event] .lp-node::before{border-radius:2px;transform:rotate(45deg) scale(.82);box-shadow:0 0 10px rgb(var(--a)/.4)}

.lp-row[data-type=environment]{opacity:1}
.lp-row[data-type=environment] .lp-c{background:linear-gradient(90deg,rgb(var(--a)/.12),transparent 78%);border-left:1px solid rgb(var(--a)/.4);padding-left:14px;animation:lp-breathe 7s ease-in-out infinite}

.lp-row[data-type=combat]{opacity:.95}
.lp-row[data-type=combat]::before{content:'';position:absolute;left:5px;top:5px;bottom:5px;width:3px;transform:skewX(-18deg);background:rgb(var(--a));box-shadow:0 0 10px rgb(var(--a)/.65)}
.lp-row[data-type=loot]{background:linear-gradient(90deg,rgb(var(--a)/.07),transparent 42%)}
.lp-row[data-type=success] .lp-node::before{border-color:rgb(var(--a)/.5)}

.lp-row[data-type=ai-gen]{opacity:.7}
.lp-row[data-type=ai-gen] .lp-c{padding-left:8px}
.lp-row[data-type=ai-gen] .lp-node::before{border-style:dotted}
.lp-row[data-type=hallucination]{opacity:.95;animation:lp-flick 6s steps(1) infinite}
.lp-row[data-type=hallucination] .lp-c{border-left:1px dashed rgb(var(--a)/.55);padding-left:12px}
.lp-row[data-type=hallucination] .lp-node::before{border-style:dashed;transform:translate(1.5px,0)}
.lp-row[data-type=mental]{opacity:1;margin:6px 0;background:radial-gradient(ellipse at 18% 50%,rgb(var(--a)/.16),transparent 66%);animation:lp-heart 2.6s ease-in-out infinite}
.lp-row[data-type=mental] .lp-c{padding-left:12px}
.lp-row[data-type=mental] .lp-node::before{border-color:rgb(var(--a)/.6);box-shadow:0 0 12px rgb(var(--a)/.5)}

/* entrances (only rows that arrive while the panel is open) */
.lp-row[data-fresh=true]{animation:lp-row-in .35s ease-out both}
.lp-row[data-fresh=true][data-type=combat]{animation:lp-hit-in .34s ease-out both}
.lp-row[data-fresh=true][data-type=critical]{animation:lp-crit-in .7s ease-out both,lp-crit-pulse 1.8s ease-in-out .7s infinite}
.lp-row[data-fresh=true][data-type=ai-gen],.lp-row[data-fresh=true][data-type=hallucination]{animation:lp-ghost-in 1.1s ease-out both}
.lp-chapter[data-fresh=true]{animation:lp-cine-in 1.4s ease-out both}

/* tier-driven text treatment */
.lp-fs[data-tier=uneasy] .lp-txt{opacity:.92}
.lp-fs[data-tier=strained] .lp-txt{text-shadow:-.6px 0 rgb(255 60 70/.45),.6px 0 rgb(60 200 255/.32)}
.lp-fs[data-tier=breaking] .lp-txt{text-shadow:-1.3px 0 rgb(255 50 60/.55),1.3px 0 rgb(50 210 255/.4),0 0 7px currentColor}

/* empty + jump */
.lp-empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;pointer-events:none}
.lp-empty b{font:600 18px/1 var(--font-serif);letter-spacing:.5em;padding-left:.5em;color:rgb(var(--line)/.4)}
.lp-empty span{font:400 11px/1.6 var(--font-sans);letter-spacing:.08em;color:rgb(var(--line)/.3);text-align:center;padding:0 24px}
.lp-jump{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);padding:7px 14px;font:600 12px/1 var(--font-serif);letter-spacing:.12em;color:rgb(var(--chrome));background:rgb(var(--base)/.88);border:1px solid rgb(var(--chrome)/.55);border-radius:999px;box-shadow:0 0 16px rgb(var(--chrome)/.3);cursor:pointer;backdrop-filter:blur(6px);animation:lp-row-in .25s ease-out both}
.lp-jump:focus-visible{outline:2px solid rgb(var(--chrome));outline-offset:2px}

/* footer */
.lp-ft{display:flex;align-items:center;gap:14px;padding:8px 16px calc(8px + env(safe-area-inset-bottom,0px));border-top:1px solid rgb(var(--line)/.08);background:rgb(0 0 0/.3);font:400 11px/1 var(--font-serif);letter-spacing:.2em;color:rgb(var(--line)/.45)}
.lp-ft-link{display:inline-flex;align-items:center;gap:8px;color:rgb(var(--gc))}
.lp-ft-link i{width:6px;height:6px;border-radius:50%;background:rgb(var(--gc));box-shadow:0 0 8px rgb(var(--gc));animation:lp-blink 1.6s steps(1) infinite}
.lp-fs[data-tier=breaking] .lp-ft-link{animation:lp-flick 1.2s steps(1) infinite}
.lp-ft-n{margin-left:auto;font:400 10px/1 var(--font-mono);letter-spacing:.14em;font-variant-numeric:tabular-nums}

/* fx layers */
.lp-fx{position:absolute;inset:0;z-index:3;pointer-events:none}
.lp-fx-scan{background:repeating-linear-gradient(0deg,rgb(255 255 255/.032) 0 1px,transparent 1px 3px);opacity:calc(.5 + (1 - var(--san))*.9)}
.lp-fx-beam{top:-24%;height:24%;background:linear-gradient(180deg,transparent,rgb(var(--chrome)/.07) 55%,transparent);animation:lp-beam 9s linear infinite}
.lp-fs[data-tier=strained] .lp-fx-beam{animation-duration:5s}
.lp-fs[data-tier=breaking] .lp-fx-beam{animation-duration:2.8s}
.lp-fx-grain{background-image:${NOISE_URI};background-size:160px 160px;mix-blend-mode:screen;opacity:calc(max(0,.78 - var(--san))*.34);animation:lp-grain .7s steps(4) infinite}
.lp-fx-vig{background:
  radial-gradient(ellipse at center,transparent 62%,rgb(0 0 0/.42) 100%),
  radial-gradient(ellipse at center,transparent calc(80% - (1 - var(--san))*34%),rgb(120 10 18/calc(max(0,.62 - var(--san))*1.1)) 100%)}
.lp-fx-chroma{box-shadow:inset 7px 0 20px -7px rgb(255 40 70/.55),inset -7px 0 20px -7px rgb(40 200 255/.45);opacity:calc(max(0,.55 - var(--san))*2)}
.lp-boxes{overflow:hidden}
.lp-box{position:absolute;display:block;padding:3px 6px;opacity:0;font:700 10px/1 var(--font-serif);letter-spacing:.3em;color:rgb(255 96 96);background:rgb(255 40 40/.07);border:1px solid rgb(255 72 72/.9);box-shadow:0 0 14px rgb(255 50 50/.4);animation:lp-box 7s steps(1) infinite}
.lp-box:nth-child(1){top:24%;left:56%;width:132px;height:70px;animation-delay:-1.5s}
.lp-box:nth-child(2){top:58%;left:12%;width:84px;height:84px;animation-duration:11s;animation-delay:-6s}
.lp-box:nth-child(3){top:40%;left:34%;width:170px;height:44px;animation-duration:13s;animation-delay:-3s}

/* =========================================================
   ORB + PREVIEW
   ========================================================= */
.lp-orb{--o:140 190 255;position:fixed;z-index:9998;width:${ORB_HIT}px;height:${ORB_HIT}px;cursor:grab;user-select:none;-webkit-user-select:none;touch-action:none;-webkit-tap-highlight-color:transparent}
.lp-orb[data-dragging=true]{cursor:grabbing}
.lp-orb-hit{position:absolute;inset:0;border-radius:50%;outline:none}
.lp-orb-hit:focus-visible .lp-orb-body{outline:1px solid rgb(var(--o)/.95);outline-offset:4px}
.lp-orb-body{position:absolute;inset:7px;border-radius:50%;
  background:radial-gradient(circle at 34% 28%,rgb(var(--o)/.5),rgb(var(--o)/.10) 42%,transparent 66%),radial-gradient(circle at 50% 50%,rgb(var(--o)/.08),rgb(8 12 22/.2) 72%);
  border:1px solid rgb(var(--o)/.26);
  box-shadow:0 0 14px 3px rgb(var(--o)/.20),0 0 4px 1px rgb(var(--o)/.35),inset 0 0 8px rgb(var(--o)/.22),inset 0 -5px 8px rgb(0 0 0/.28);
  backdrop-filter:blur(2px);animation:lp-orb-pulse 3.6s ease-in-out infinite;transition:border-color .35s,box-shadow .35s}
.lp-orb-body::after{content:'';position:absolute;left:18%;top:12%;width:34%;height:22%;border-radius:50%;background:linear-gradient(180deg,rgb(255 255 255/.55),transparent);filter:blur(.6px);transform:rotate(-24deg);opacity:.65}
.lp-orb[data-active=true] .lp-orb-body{animation:none;border-color:rgb(var(--o)/.5);box-shadow:0 0 26px 8px rgb(var(--o)/.38),0 0 9px 3px rgb(var(--o)/.65),inset 0 0 9px rgb(var(--o)/.5),inset 0 -5px 8px rgb(0 0 0/.2)}
.lp-orb-ring{position:absolute;inset:0;width:100%;height:100%;color:rgb(var(--o)/.62);animation:lp-spin 26s linear infinite}
.lp-orb-ring-2{color:rgb(var(--o)/.38);animation:lp-spin-rev 17s linear infinite}
.lp-orb[data-active=true] .lp-orb-ring{animation-duration:6s}
.lp-orb[data-active=true] .lp-orb-ring-2{animation-duration:4s}
.lp-orb-core{position:absolute;left:50%;top:50%;width:5px;height:5px;margin:-2.5px 0 0 -2.5px;border-radius:50%;background:rgb(var(--o)/.95);box-shadow:0 0 8px 2px rgb(var(--o)/.75);animation:lp-core 3.6s ease-in-out infinite}
.lp-orb[data-active=true] .lp-orb-core{animation:none;transform:scale(1.5);box-shadow:0 0 12px 4px rgb(var(--o)/.9)}
.lp-orb[data-tier=breaking] .lp-orb-core{width:2px;height:11px;margin:-5.5px 0 0 -1px;border-radius:2px;animation:lp-pupil .9s steps(1) infinite}
.lp-ping{position:absolute;inset:7px;border-radius:50%;border:1px solid rgb(var(--o)/.6);pointer-events:none;animation:lp-ping .95s ease-out both}
.lp-ping-b{animation-delay:.18s}

.lp-pv{position:absolute;top:50%;display:flex;align-items:center;transform:translateY(-50%)}
.lp-pv[data-side=right]{left:calc(100% - 8px)}
.lp-pv[data-side=left]{right:calc(100% - 8px);flex-direction:row-reverse}
.lp-pv-link{position:relative;flex:none;width:16px;height:1px;transform-origin:left center;animation:lp-link .26s ease-out both}
.lp-pv[data-side=left] .lp-pv-link{transform-origin:right center;background:linear-gradient(270deg,rgb(var(--o)/.8),rgb(var(--o)/.2))}
.lp-pv[data-side=right] .lp-pv-link{background:linear-gradient(90deg,rgb(var(--o)/.8),rgb(var(--o)/.2))}
.lp-pv-card{position:relative;width:max-content;max-width:var(--pv-max,300px);padding:8px 13px 10px 14px;background:linear-gradient(100deg,rgb(8 12 20/.84),rgb(8 12 20/.62));backdrop-filter:blur(10px) saturate(1.2);border:1px solid rgb(var(--line)/.14);border-radius:3px;box-shadow:0 8px 26px rgb(0 0 0/.5),inset 0 1px 0 rgb(255 255 255/.04)}
.lp-pv[data-side=right] .lp-pv-card{animation:lp-unfold-r .38s cubic-bezier(.2,.8,.2,1) both}
.lp-pv[data-side=left] .lp-pv-card{animation:lp-unfold-l .38s cubic-bezier(.2,.8,.2,1) both}
.lp-pv[data-phase=leaving][data-side=right] .lp-pv-card{animation:lp-fold-r ${PREVIEW_LEAVE_MS}ms ease-in both}
.lp-pv[data-phase=leaving][data-side=left] .lp-pv-card{animation:lp-fold-l ${PREVIEW_LEAVE_MS}ms ease-in both}
.lp-pv[data-phase=leaving] .lp-pv-link{opacity:0;transition:opacity .2s}
.lp-pv-card::before{content:'';position:absolute;left:0;top:7px;bottom:7px;width:2px;border-radius:2px;background:rgb(var(--a));box-shadow:0 0 8px rgb(var(--a)/.85)}
.lp-pv-card::after{content:'';position:absolute;inset:-1px;pointer-events:none;
  background:
    linear-gradient(rgb(var(--a)/.7),rgb(var(--a)/.7)) right top/8px 1px no-repeat,linear-gradient(rgb(var(--a)/.7),rgb(var(--a)/.7)) right top/1px 8px no-repeat,
    linear-gradient(rgb(var(--a)/.7),rgb(var(--a)/.7)) right bottom/8px 1px no-repeat,linear-gradient(rgb(var(--a)/.7),rgb(var(--a)/.7)) right bottom/1px 8px no-repeat}
.lp-pv-meta{display:flex;align-items:center;gap:6px;margin-bottom:3px;font:600 10px/1 var(--font-serif);letter-spacing:.2em;color:rgb(var(--a)/.88)}
.lp-pv-ico{display:block;width:11px;height:11px}
.lp-pv-meta time{margin-left:auto;padding-left:14px;font:400 9px/1 var(--font-mono);letter-spacing:.06em;color:rgb(var(--line)/.4);font-variant-numeric:tabular-nums}
.lp-pv-card .lp-txt{line-height:1.55}
.lp-pv-timer{position:absolute;left:8px;right:8px;bottom:0;height:1px;background:rgb(var(--a)/.6);transform-origin:left center;animation:lp-drain linear forwards}
.lp-pv[data-side=left] .lp-pv-timer{transform-origin:right center}

/* =========================================================
   KEYFRAMES
   ========================================================= */
@keyframes lp-blink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes lp-spin{to{transform:rotate(360deg)}}
@keyframes lp-spin-rev{to{transform:rotate(-360deg)}}
@keyframes lp-orb-pulse{0%,100%{opacity:.78;transform:scale(1)}50%{opacity:1;transform:scale(1.06)}}
@keyframes lp-core{0%,100%{opacity:.75;transform:scale(.9)}50%{opacity:1;transform:scale(1.15)}}
@keyframes lp-pupil{0%{transform:translate(0,0)}30%{transform:translate(1.5px,-1px)}60%{transform:translate(-1.5px,1px)}85%{transform:translate(0,0) scaleY(.6)}}
@keyframes lp-ping{0%{transform:scale(1);opacity:.75}100%{transform:scale(2.5);opacity:0}}
@keyframes lp-link{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes lp-unfold-r{from{clip-path:inset(-24px 100% -24px -24px)}to{clip-path:inset(-24px -24px -24px -24px)}}
@keyframes lp-unfold-l{from{clip-path:inset(-24px -24px -24px 100%)}to{clip-path:inset(-24px -24px -24px -24px)}}
@keyframes lp-fold-r{from{clip-path:inset(-24px -24px -24px -24px);opacity:1}to{clip-path:inset(-24px 100% -24px -24px);opacity:.2}}
@keyframes lp-fold-l{from{clip-path:inset(-24px -24px -24px -24px);opacity:1}to{clip-path:inset(-24px -24px -24px 100%);opacity:.2}}
@keyframes lp-drain{from{transform:scaleX(1)}to{transform:scaleX(0)}}
@keyframes lp-boot{from{clip-path:inset(49.5% 0 49.5% 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes lp-row-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes lp-hit-in{0%{opacity:0;transform:translateX(-10px);filter:brightness(2.2)}60%{opacity:1;filter:brightness(1.5)}100%{opacity:1;transform:none;filter:none}}
@keyframes lp-crit-in{0%{opacity:0;filter:brightness(2.6)}25%{opacity:1;transform:translateX(3px)}50%{transform:translateX(-3px);filter:brightness(1.6)}100%{transform:none;filter:none}}
@keyframes lp-crit-pulse{0%,100%{box-shadow:inset 0 0 0 0 rgb(var(--a)/0)}50%{box-shadow:inset 0 0 24px 0 rgb(var(--a)/.16)}}
@keyframes lp-ghost-in{0%{opacity:0;filter:blur(4px);transform:translateX(8px)}100%{opacity:1;filter:none;transform:none}}
@keyframes lp-cine-in{0%{opacity:0;filter:blur(6px);letter-spacing:.3em}100%{opacity:1;filter:none;letter-spacing:normal}}
@keyframes lp-breathe{0%,100%{opacity:.84}50%{opacity:1}}
@keyframes lp-heart{0%,100%{background-size:100% 100%}12%{background-size:112% 130%}24%{background-size:100% 100%}36%{background-size:106% 116%}}
@keyframes lp-flick{0%,88%,100%{opacity:1}89%{opacity:.35}90%{opacity:1}93%{opacity:.5}94%{opacity:1}}
@keyframes lp-chroma-a{0%,100%{transform:translate(-1.6px,0)}30%{transform:translate(-3px,1px)}34%{transform:translate(-1px,0)}70%{transform:translate(-2.4px,-1px)}}
@keyframes lp-chroma-b{0%,100%{transform:translate(1.6px,0)}25%{transform:translate(3px,-1px)}29%{transform:translate(1px,0)}65%{transform:translate(2.4px,1px)}}
@keyframes lp-beam{from{transform:translateY(0)}to{transform:translateY(520%)}}
@keyframes lp-grain{0%{background-position:0 0}25%{background-position:-40px 22px}50%{background-position:30px -50px}75%{background-position:-20px -10px}100%{background-position:0 0}}
@keyframes lp-tear{0%,92%,100%{transform:none}93%{transform:translateX(-5px) skewX(-1.2deg)}94%{transform:translateX(6px)}95%{transform:translateX(-2px) skewX(.8deg)}96%{transform:none}}
@keyframes lp-tremor{0%{transform:translate(0,0)}50%{transform:translate(.6px,-.4px)}100%{transform:translate(-.5px,.4px)}}
@keyframes lp-gauge-flick{0%,100%{opacity:1}45%{opacity:.35}55%{opacity:1}}
@keyframes lp-box{0%,84%,100%{opacity:0}85%{opacity:1}87%{opacity:.15}88%{opacity:1;transform:translate(7px,-3px)}92%{opacity:0}}

/* =========================================================
   RESPONSIVE + MOTION
   ========================================================= */
@media (max-width:560px){
  .lp-list{--tcol:0px}
  .lp-t{display:none}
  .lp-row{grid-template-columns:28px minmax(0,1fr)}
  .lp-gauge-bar{width:64px}
  .lp-title b{letter-spacing:.2em}
}
@media (prefers-reduced-motion:reduce){
  .lp-fs,.lp-fs .lp-frame,.lp-fs .lp-scroll,.lp-fx-beam,.lp-fx-grain,.lp-boxes .lp-box,.lp-row,.lp-row .lp-c,.lp-row .lp-echo::before,.lp-row .lp-echo::after,
  .lp-orb-body,.lp-orb-core,.lp-orb-ring,.lp-ping{animation:none!important}
  .lp-boxes{display:none}
}
`;