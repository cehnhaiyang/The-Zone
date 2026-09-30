/**
 * 世界构建：调用 LLM 生成新区域 / 资产时的实时状态读数。
 *
 * 视觉设定（来自《The Zone》背景设定 · 神经链接仪）：
 * - 中央画面是「认知滤网」：黑晶（四维超立方体）持续折叠，滤网把它降维成红色线框，
 *   并不断尝试框选，却始终无法归类。淡紫色的幽影是被滤网压掉的「彼侧真形」。
 * - 滤网的状态就是等待的状态：正常时识别框红色收拢；久无更新转硫黄色；
 *   长时间无响应则不再收拢、画面减速；出错则整体停摆并划上叉。
 * - 状态日志是真实的：每次 status 变化都会写入，并显示「距上次更新」。
 *   不用随机十六进制伪装忙碌，也没有任何进度百分比。
 * - 底部刻度取自认知刻（0~30）与周期（0~12），每秒一格，只是时钟，不代表生成进度。
 *
 * 色板：黑晶 #0a0810 / 硫紫 #2b2145 / 骨白 #d9d3c5 / 警红 #e0384f / 硫黄 #bfae4a
 */
import React, { useEffect, useRef, useState } from 'react';
import { AudioService } from '../../services';
import type { OverlayProps } from './types';

const INK = '#d9d3c5';
const RED = '#e0384f';
const SULFUR = '#bfae4a';

const DEFAULT_TITLE = '正在构建世界';
const TICKS = 30;
const CYCLES = 13; // 周期 0~12
const LOG_MAX = 4;
const SLOW_MS = 20_000; // 距上次状态更新超过此值：提示较慢
const STALLED_MS = 60_000; // 超过此值：提示可能无响应
const CANCEL_CONFIRM_MS = 3_000; // 取消需二次确认，避免误触丢掉一次耗时的生成
const LORE_INTERVAL_MS = 7_000;

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

const LORE = [
    '滤网正在把彼侧的几何降维成你能看懂的样子。',
    '别去解析色块背后的形状。',
    '黑晶每秒折叠数百次，这片区域只是其中一次。',
    '在这里，两地的距离取决于它们共鸣的绝望有多深。',
    '新的区域并不存在，直到有人走进去。',
    '清理人死于看懂，而不是死于怪物。',
    '词语正在离开它们指代的东西。',
    '每一次降维，都会烧掉滤网的一点寿命。',
];

type Mood = 'normal' | 'slow' | 'stalled' | 'failed';
type LogEntry = { id: number; text: string; at: number };

const MOOD_SPEED: Record<Mood, number> = { normal: 1, slow: 0.6, stalled: 0.3, failed: 0 };
const MOOD_COLOR: Record<Mood, string> = { normal: SULFUR, slow: SULFUR, stalled: RED, failed: RED };

/** 状态串约定：`标题::详情`。无分隔符时整串视为详情。 */
const parseStatus = (raw?: string): { title: string; detail: string } => {
    if (!raw) return { title: DEFAULT_TITLE, detail: '' };
    const [head = '', ...rest] = raw.split('::');
    if (rest.length === 0) return { title: DEFAULT_TITLE, detail: raw.trim() };
    return { title: head.replace(/_/g, ' ').trim() || DEFAULT_TITLE, detail: rest.join('::').trim() };
};

const pad2 = (n: number) => String(n).padStart(2, '0');

/** 用时读数：一分钟内保留一位小数，超过一分钟改为「分 秒」。 */
const formatClock = (ms: number): string => {
    const s = ms / 1000;
    if (s < 60) return `${s.toFixed(1)} 秒`;
    return `${Math.floor(s / 60)} 分 ${pad2(Math.floor(s % 60))} 秒`;
};

/** 四角框线装饰。父容器需 relative / 定位上下文。 */
const Corners: React.FC<{ className?: string }> = ({ className = 'border-[#4d3f7a]' }) => (
    <>
        <span aria-hidden className={`pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t ${className}`} />
        <span aria-hidden className={`pointer-events-none absolute right-0 top-0 h-3 w-3 border-r border-t ${className}`} />
        <span aria-hidden className={`pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b border-l ${className}`} />
        <span aria-hidden className={`pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b border-r ${className}`} />
    </>
);

/* ------------------------------------------------------------------ */
/*  认知滤网（canvas）                                                  */
/* ------------------------------------------------------------------ */

const VERTS: number[][] = Array.from({ length: 16 }, (_, i) => [i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1, i & 8 ? 1 : -1]);
const EDGES: [number, number][] = [];
for (let i = 0; i < 16; i++)
    for (let b = 0; b < 4; b++) {
        const j = i ^ (1 << b);
        if (j > i) EDGES.push([i, j]);
    }

const rot = (v: number[], i: number, j: number, a: number) => {
    const cs = Math.cos(a);
    const sn = Math.sin(a);
    const p = v[i] as number;
    const q = v[j] as number;
    v[i] = p * cs - q * sn;
    v[j] = p * sn + q * cs;
};

const hash = (x: number, y: number, t: number) => {
    const s = Math.sin(x * 127.1 + y * 311.7 + t * 74.7) * 43758.5453;
    return s - Math.floor(s);
};

type Pt = { x: number; y: number; d: number };

/**
 * 四维 → 三维 → 二维透视。
 * 投影距离取 3.4 / 3.0：全程最大偏移约为画布的 36%，
 * 给识别框与标签留足边距（旧参数会让顶点冲出画布，右侧识别框被裁掉）。
 */
const project = (tt: number, size: number): Pt[] => {
    const c = size / 2;
    const scale = size * 1.44;
    return VERTS.map((src) => {
        const v = src.slice();
        rot(v, 0, 3, tt * 0.5);
        rot(v, 1, 2, tt * 0.37);
        rot(v, 0, 1, tt * 0.21);
        const k4 = 1 / (3.4 - (v[3] as number));
        const x3 = (v[0] as number) * k4;
        const y3 = (v[1] as number) * k4;
        const z3 = (v[2] as number) * k4;
        const k3 = 1 / (3 - z3);
        return { x: c + x3 * k3 * scale, y: c + y3 * k3 * scale, d: Math.min(1, Math.max(0, (z3 + 0.9) / 1.8)) };
    });
};

const CrystalField: React.FC<{ mood: Mood }> = ({ mood }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const tRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const speed = MOOD_SPEED[mood];
        const halted = mood === 'failed';
        const boxRgb = mood === 'slow' ? '191,174,74' : '224,56,79';
        if (reduce && tRef.current === 0) tRef.current = 2.4; // 静态帧取一个有立体感的姿态

        let size = 0;
        const setSize = () => {
            const s = canvas.clientWidth || 224;
            if (s === size) return false;
            size = s;
            canvas.width = canvas.height = Math.round(s * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            return true;
        };
        setSize();

        const setSpacing = (px: number) => {
            if ('letterSpacing' in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${px}px`;
        };

        let raf = 0;
        let last = performance.now();
        let glitchUntil = 0;
        let nextGlitch = last + 1800;

        const draw = (now: number) => {
            const dt = Math.min(now - last, 50);
            last = now;
            if (!reduce) tRef.current += (dt / 1000) * speed;
            const t = tRef.current;
            ctx.clearRect(0, 0, size, size);

            // 马赛克底纹：滤网降维时留下的色块，靠近中心更密，淡入淡出而非突变
            const cells = 18;
            const cell = size / cells;
            const stepF = t * 1.2;
            const step = Math.floor(stepF);
            const fade = reduce ? 0.6 : Math.sin(Math.PI * (stepF - step));
            for (let gx = 0; gx < cells; gx++)
                for (let gy = 0; gy < cells; gy++) {
                    const dist = Math.hypot(gx + 0.5 - cells / 2, gy + 0.5 - cells / 2) / (cells / 2);
                    if (hash(gx, gy, step) > 0.03 + 0.13 * Math.max(0, 1 - dist)) continue;
                    const warm = hash(gx + 9, gy + 3, step) > 0.86;
                    ctx.fillStyle = warm ? `rgba(224,56,79,${(0.2 * fade).toFixed(3)})` : `rgba(77,63,122,${(0.34 * fade).toFixed(3)})`;
                    ctx.fillRect(gx * cell + 1, gy * cell + 1, cell - 2, cell - 2);
                }

            // 彼侧真形：被滤网压掉的另一个姿态，极淡，偏紫。看得越清楚越不该看。
            const ghost = project(t * 0.83 + 2.1, size);
            const gx = Math.sin(t * 3.1) * 1.2;
            ctx.lineWidth = 1;
            ctx.strokeStyle = `rgba(124,107,214,${halted ? 0.07 : 0.15})`;
            ctx.beginPath();
            for (const [i, j] of EDGES) {
                const p = ghost[i]!;
                const q = ghost[j]!;
                ctx.moveTo(p.x + gx, p.y);
                ctx.lineTo(q.x + gx, q.y);
            }
            ctx.stroke();

            // 滤网降维后的红色线框
            const pts = project(t, size);
            let minX = Infinity;
            let maxX = -Infinity;
            let minY = Infinity;
            let maxY = -Infinity;
            for (const p of pts) {
                minX = Math.min(minX, p.x);
                maxX = Math.max(maxX, p.x);
                minY = Math.min(minY, p.y);
                maxY = Math.max(maxY, p.y);
            }
            ctx.shadowColor = 'rgba(224,56,79,0.55)';
            ctx.shadowBlur = 5 * dpr;
            for (const [i, j] of EDGES) {
                const p = pts[i]!;
                const q = pts[j]!;
                const d = (p.d + q.d) / 2;
                ctx.lineWidth = 0.8 + 0.9 * d;
                ctx.strokeStyle = `rgba(224,56,79,${((0.28 + 0.64 * d) * (halted ? 0.55 : 1)).toFixed(3)})`;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(q.x, q.y);
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(217,211,197,0.85)';
            for (const p of pts) {
                const r = 1.2 + 0.9 * p.d;
                ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
            }

            // 识别框：正常时每 2.6 秒由松到紧收拢，逼近时被重置，永不锁定；
            // 久无更新转硫黄色并放慢；无响应时停止收拢、悬在原地晃动；失败时收在原地并划叉。
            const phase = mood === 'normal' || mood === 'slow' ? (t % 2.6) / 2.6 : 0.5;
            const ease = 1 - Math.pow(1 - phase, 3);
            const boxPad = mood === 'stalled' ? 24 + Math.sin(t * 1.4) * 5 : mood === 'failed' ? 10 : 8 + 26 * (1 - ease);
            const amp = mood === 'normal' ? 1.4 : mood === 'slow' ? 2.4 : mood === 'stalled' ? 3.2 : 0;
            const jx = Math.sin(t * 9.1) * amp;
            const jy = Math.cos(t * 11.3) * amp;
            const x0 = Math.max(6, minX - boxPad + jx);
            const x1 = Math.min(size - 6, maxX + boxPad + jx);
            const y0 = Math.max(18, minY - boxPad + jy);
            const y1 = Math.min(size - 6, maxY + boxPad + jy);
            const blink = mood === 'stalled' ? 0.6 + 0.4 * Math.sin(t * 6) : 1;
            const boxAlpha = (mood === 'normal' && phase < 0.04 ? 0.35 : 1) * blink;
            const L = 10;
            ctx.strokeStyle = `rgba(${boxRgb},${boxAlpha.toFixed(3)})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x0, y0 + L); ctx.lineTo(x0, y0); ctx.lineTo(x0 + L, y0);
            ctx.moveTo(x1 - L, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + L);
            ctx.moveTo(x0, y1 - L); ctx.lineTo(x0, y1); ctx.lineTo(x0 + L, y1);
            ctx.moveTo(x1 - L, y1); ctx.lineTo(x1, y1); ctx.lineTo(x1, y1 - L);
            ctx.stroke();
            if (halted) {
                ctx.strokeStyle = 'rgba(224,56,79,0.6)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
                ctx.moveTo(x1, y0); ctx.lineTo(x0, y1);
                ctx.stroke();
            }

            // 识别框标签：滤网自己的读数，只描述它在做什么，不代表生成进度
            const flash = mood === 'normal' && phase < 0.14;
            const label =
                mood === 'failed' ? '生成失败' : mood === 'stalled' ? '无响应' : mood === 'slow' ? '仍在等待' : flash ? '无法归类' : phase > 0.86 ? '尝试锁定' : '扫描中';
            ctx.font = `11px ${MONO}`;
            ctx.textBaseline = 'alphabetic';
            setSpacing(1.5);
            ctx.fillStyle = flash ? 'rgba(217,211,197,0.95)' : `rgba(${boxRgb},0.9)`;
            ctx.fillText(label, x0, y0 - 6);
            setSpacing(0);

            // 滤网撕裂：偶发的横向错位切片
            if (!reduce && !halted && mood !== 'stalled') {
                if (now > nextGlitch) {
                    glitchUntil = now + 140;
                    nextGlitch = now + 2600 + Math.random() * 2600;
                }
                if (now < glitchUntil) {
                    const y = Math.random() * size * 0.7;
                    const h = 6 + Math.random() * 18;
                    const dx = (Math.random() - 0.5) * 24;
                    ctx.drawImage(canvas, 0, y * dpr, canvas.width, h * dpr, dx, y, size, h);
                }
            }

            if (!reduce) raf = requestAnimationFrame(draw);
        };

        draw(performance.now());

        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { if (setSize() && reduce) draw(performance.now()); }) : null;
        ro?.observe(canvas);
        return () => {
            cancelAnimationFrame(raf);
            ro?.disconnect();
        };
    }, [mood]);

    return <canvas ref={canvasRef} aria-hidden className="relative block aspect-square w-[min(13rem,32vh)]" />;
};

/* ------------------------------------------------------------------ */
/*  主体                                                                */
/* ------------------------------------------------------------------ */

export const GenerationContent: React.FC<OverlayProps> = ({ status, modelName, startTime, error, onCancel }) => {
    const [elapsed, setElapsed] = useState(0);
    const [stale, setStale] = useState(0); // 距上次状态更新
    const [log, setLog] = useState<LogEntry[]>([]);
    const [loreIndex, setLoreIndex] = useState(() => Math.floor(Math.random() * LORE.length));
    const [confirming, setConfirming] = useState(false);
    const [copied, setCopied] = useState(false);
    const lastChangeRef = useRef(0);
    const lastDetailRef = useRef('');
    const failed = Boolean(error);
    const { title, detail } = parseStatus(status);

    // 新一轮生成开始：清空日志与更新时间
    useEffect(() => {
        setLog([]);
        setConfirming(false);
        lastDetailRef.current = '';
        lastChangeRef.current = startTime ?? Date.now();
    }, [startTime]);

    // 计时：出错后冻结，保留失败时的用时
    useEffect(() => {
        if (!startTime || failed) return;
        const tick = () => {
            const n = Date.now();
            setElapsed(Math.max(0, n - startTime));
            setStale(Math.max(0, n - lastChangeRef.current));
        };
        tick();
        const intervalId = setInterval(tick, 100);
        return () => clearInterval(intervalId);
    }, [startTime, failed]);

    // 每次状态变化写入一行日志，并刷新「距上次更新」
    useEffect(() => {
        if (!detail || lastDetailRef.current === detail) return;
        lastDetailRef.current = detail;
        const now = Date.now();
        const at = startTime ? now - startTime : 0;
        lastChangeRef.current = now;
        setStale(0);
        setLog((prev) => {
            const tail = prev[prev.length - 1];
            return [...prev, { id: tail ? tail.id + 1 : 0, text: detail, at }].slice(-LOG_MAX);
        });
    }, [detail, startTime]);

    // 设定短句轮播，缓解长时间等待
    useEffect(() => {
        if (failed) return;
        const intervalId = setInterval(() => setLoreIndex((i) => (i + 1) % LORE.length), LORE_INTERVAL_MS);
        return () => clearInterval(intervalId);
    }, [failed]);

    // 取消确认：3 秒内不再点击则恢复
    useEffect(() => {
        if (!confirming) return;
        const id = setTimeout(() => setConfirming(false), CANCEL_CONFIRM_MS);
        return () => clearTimeout(id);
    }, [confirming]);

    useEffect(() => {
        if (!copied) return;
        const id = setTimeout(() => setCopied(false), 1600);
        return () => clearTimeout(id);
    }, [copied]);

    const mood: Mood = failed ? 'failed' : stale >= STALLED_MS ? 'stalled' : stale >= SLOW_MS ? 'slow' : 'normal';
    const accent = MOOD_COLOR[mood];
    const seconds = elapsed / 1000;
    const tickTotal = Math.floor(seconds);
    const currentTick = tickTotal % TICKS;
    const cycle = Math.floor(tickTotal / TICKS) % CYCLES;
    const staleColor = mood === 'stalled' || mood === 'failed' ? RED : mood === 'slow' ? SULFUR : '#a79fbd';

    const waitHint =
        mood === 'stalled'
            ? '已超过一分钟没有收到新状态，模型可能没有响应。可以取消后重试。'
            : mood === 'slow'
                ? '生成耗时较长，模型仍在处理，可以继续等待。'
                : null;

    const handleCancel = () => {
        AudioService.playSfx('ui_click');
        if (!failed && !confirming) {
            setConfirming(true);
            return;
        }
        onCancel?.();
    };

    const handleCopy = async () => {
        AudioService.playSfx('ui_click');
        try {
            await navigator.clipboard.writeText(String(error));
            setCopied(true);
        } catch {
            /* 剪贴板不可用时静默：错误文本本身仍可手动选中 */
        }
    };

    return (
        <div className="flex w-full max-w-xl flex-col items-center gap-5 px-6">
            <style>{`
                @keyframes zg-caret { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0 } }
                @keyframes zg-fade { from { opacity: 0; filter: blur(3px) } to { opacity: 1; filter: blur(0) } }
                .zg-caret { display: inline-block; width: .5em; height: 1em; margin-left: 2px; vertical-align: -.15em; background: ${SULFUR}; animation: zg-caret 1s steps(1) infinite }
                .zg-fade { animation: zg-fade .9s ease-out }
                @media (prefers-reduced-motion: reduce) { .zg-caret, .zg-fade { animation: none } }
            `}</style>

            <div className="flex items-center gap-2 border border-[#2b2145] bg-[#14101f]/70 px-3 py-1.5">
                <span
                    className={`h-1.5 w-1.5 rounded-full ${failed ? 'bg-[#e0384f]' : `motion-safe:animate-pulse ${mood === 'stalled' ? 'bg-[#e0384f]' : 'bg-[#bfae4a]'}`}`}
                />
                <span className="font-mono text-[11px] text-[#a79fbd]">
                    模型 <span className="text-[#d9d3c5]">{modelName || '未知'}</span>
                </span>
            </div>

            <div className="relative">
                <div
                    aria-hidden
                    className="pointer-events-none absolute -inset-10"
                    style={{
                        background: `radial-gradient(closest-side, rgba(224,56,79,${failed ? 0.16 : 0.09}), rgba(43,33,69,0.12) 58%, transparent)`,
                    }}
                />
                <CrystalField mood={mood} />
            </div>

            <div className="text-center">
                <h2
                    className={`font-serif text-[1.65rem] font-semibold tracking-[0.14em] ${failed ? 'text-[#e0384f]' : 'text-[#d9d3c5]'}`}
                    style={{ textShadow: failed ? '0 0 26px rgba(224,56,79,0.35)' : '0 0 28px rgba(224,56,79,0.22)' }}
                >
                    {failed ? '生成失败' : title}
                </h2>
                {!failed && (
                    <p key={loreIndex} className="zg-fade mx-auto mt-2 min-h-[2.5rem] max-w-sm text-sm leading-relaxed text-[#8f88a8]">
                        {LORE[loreIndex]}
                    </p>
                )}
            </div>

            <div className="w-full">
                <div className="relative border border-[#2b2145] bg-[#0a0810]/60 px-4 pb-3 pt-2">
                    <Corners />
                    <div className="mb-2 flex items-center justify-between border-b border-[#1c1630] pb-1.5 text-[11px]">
                        <span className="text-[#8a82a6]">滤网日志</span>
                        <span className="tabular-nums" style={{ color: staleColor }}>
                            {failed ? '已停止接收' : `距上次更新 ${formatClock(stale)}`}
                        </span>
                    </div>
                    <ul
                        aria-live="polite"
                        aria-label="生成状态"
                        className="flex min-h-[5.25rem] flex-col justify-end font-mono text-xs leading-relaxed"
                    >
                        {Array.from({ length: LOG_MAX }, (_, slot) => {
                            const entry = log[slot - (LOG_MAX - log.length)];
                            if (!entry)
                                return (
                                    <li key={`slot-${slot}`} aria-hidden className="flex min-h-[1.3125rem] items-center gap-3">
                                        <span className="w-12 shrink-0 text-right text-[#3a3158]">--</span>
                                        <span className="flex-1 border-t border-dashed border-[#221a36]" />
                                    </li>
                                );
                            const age = log.length - 1 - log.indexOf(entry);
                            const isNewest = age === 0;
                            return (
                                <li key={entry.id} className="flex min-h-[1.3125rem] gap-3" style={{ opacity: [1, 0.72, 0.52, 0.4][age] ?? 0.32 }}>
                                    <span className={`w-12 shrink-0 text-right tabular-nums ${isNewest ? 'text-[#bfae4a]' : 'text-[#8a82a6]'}`}>
                                        +{(entry.at / 1000).toFixed(1)}s
                                    </span>
                                    <span className={`min-w-0 break-all ${isNewest ? 'text-[#d9d3c5]' : 'text-[#8f88a8]'}`}>
                                        {entry.text}
                                        {isNewest && !failed && <span aria-hidden className="zg-caret" />}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                {/* 认知刻：每秒一格，每 5 格一根长刻线，仅作时钟 */}
                <div className="mt-4 flex h-6 items-end gap-[3px]" aria-hidden>
                    {Array.from({ length: TICKS }, (_, i) => {
                        const isNow = i === currentTick;
                        const passed = i < currentTick;
                        return (
                            <span
                                key={i}
                                className="flex-1"
                                style={{
                                    height: isNow ? '100%' : i % 5 === 0 ? '64%' : '42%',
                                    background: isNow ? accent : passed ? '#4d3f7a' : '#221a36',
                                    boxShadow: isNow ? `0 0 8px ${accent}88` : undefined,
                                }}
                            />
                        );
                    })}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-[#8a82a6]">
                    <span className="tabular-nums">
                        周期 {pad2(cycle)}
                        <span className="ml-3">刻 {pad2(currentTick)}</span>
                    </span>
                    <span className="tabular-nums">
                        {failed ? '失败时用时' : '已用时'} <span className="text-[#a79fbd]">{formatClock(elapsed)}</span>
                    </span>
                </div>
            </div>

            {waitHint && (
                <p
                    role="status"
                    className="w-full max-w-md border-l-2 py-0.5 pl-3 text-left text-sm leading-relaxed"
                    style={{ borderColor: accent, color: mood === 'stalled' ? '#f0a0ab' : SULFUR }}
                >
                    {waitHint}
                </p>
            )}

            {failed && (
                <div role="alert" className="relative w-full border border-[#e0384f]/40 bg-[#e0384f]/5 px-4 py-3">
                    <Corners className="border-[#e0384f]/60" />
                    <p className="break-words font-mono text-xs leading-relaxed text-[#f0a0ab]">{error}</p>
                    <div className="mt-3 flex items-center justify-between gap-4">
                        <p className="text-sm text-[#a79fbd]">关闭后可以重新发起生成。</p>
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="shrink-0 text-xs text-[#a79fbd] underline decoration-[#4d3f7a] underline-offset-4 transition-colors hover:text-[#d9d3c5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfae4a]"
                        >
                            {copied ? '已复制' : '复制错误信息'}
                        </button>
                    </div>
                </div>
            )}

            {onCancel && (
                <button
                    type="button"
                    onClick={handleCancel}
                    className={`h-10 border px-6 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfae4a] ${confirming
                        ? 'border-[#e0384f]/70 bg-[#e0384f]/10 text-[#f0a0ab]'
                        : 'border-[#3a2f5a] text-[#a79fbd] hover:border-[#bfae4a]/60 hover:text-[#d9d3c5]'
                        }`}
                >
                    {failed ? '关闭' : confirming ? '再点一次，确认取消' : '取消生成'}
                </button>
            )}
        </div>
    );
};