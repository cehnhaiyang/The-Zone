/**
 * 过场：扇区进入
 *
 * 设计概念：「滤网收敛」
 * 神经链接仪正在把这个扇区降维成人脑能读懂的东西。整屏只有一件事在发生——滤网从粗到细地收敛：
 *   1. 背景是未收敛的原始信号（马赛克色块 + 亮噪点），随标题解码从左到右逐块消散；
 *   2. 标题以马赛克字形出现，逐字"对焦"（模糊 → 清晰）译成文字，定稿的一瞬色差坍缩；
 *   3. 标题下的「现实薄膜」被撕开：裂口从中心向两端撕裂，形状由节点 id 决定，大小由威胁决定，
 *      裂口的颜色会向页面漏光；安全节点则是一条完好的薄膜，只有一粒微光掠过；
 *   4. 威胁越高，滤网越不稳：色差更重、噪点更密，定稿后标题偶尔仍会有一个字退回马赛克。
 *
 * 推进：故障闪烁 → 标题解码 → 描述/读数 → 入口 → 退场（穿过裂口）。
 * 交互：解码期间点击/Enter/空格可跳过动画；入口出现后点击任意处或 Enter/空格进入下一节点。
 * 性能：高频更新（字形轮转、读数滚动、背景画布）各自隔离在子组件/画布内，不触发整屏重渲染。
 * 无障碍：尊重 prefers-reduced-motion（直接展示最终状态，且不播放退场）。
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { getNodeThreatLevel, isNodeDangerous } from '../../consts';
import { AudioService } from '../../services';
import type { OverlayProps } from './types';

/** 四角框线装饰。父容器需 relative / 定位上下文。 */
const Corners: React.FC<{ className?: string }> = ({ className = 'border-zinc-600/70' }) => (
    <>
        <span aria-hidden className={`pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t ${className}`} />
        <span aria-hidden className={`pointer-events-none absolute right-0 top-0 h-3 w-3 border-r border-t ${className}`} />
        <span aria-hidden className={`pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b border-l ${className}`} />
        <span aria-hidden className={`pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b border-r ${className}`} />
    </>
);

/* ------------------------------------------------------------------ */
/* 常量与工具                                                          */
/* ------------------------------------------------------------------ */

/** 未解码字符使用的"滤网马赛克"字形。 */
const SCRAMBLE = ['▚', '▞', '▟', '▙', '▜', '▛', '░', '▒', '▓', '▄', '▀', '▌'];

/** 是否把描述中的引号内容（现场留下的文字/话语）用暖色墨迹区分。 */
const HIGHLIGHT_QUOTES = true;
const QUOTE_RE = /("[^"]*"|“[^”]*”|「[^」]*」)/;
const SENTENCE_RE = /[^。！？!?…]+[。！？!?…]*|[。！？!?…]+/g;
const PUNCT_ONLY_RE = /^[。！？!?…\s]*$/;

const SEGMENTS = 20;
const DANGER_AT = 15;
const TEAR_W = 1000;
const TEAR_H = 48;
const TEAR_CY = 24;
/** 退场时长：点击进入后先"穿过裂口"，再通知上层卸载。 */
const EXIT_MS = 340;

const RGB_FILTER = '34,211,238'; // 滤网（系统）= 青
const RGB_SAFE = '52,211,153';
const RGB_WARN = '251,191,36';
const RGB_DANGER = '248,113,113'; // 漏出来的真相 = 阈值色

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const prefersReducedMotion = () =>
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const hashSeed = (s: string) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
};

const mulberry32 = (seed: number) => {
    let a = seed;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

type Pt = [number, number];
const toPath = (pts: Pt[]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

/** 依据节点 id 生成确定性的薄膜裂口；open ∈ (0,1]，越大裂得越开。 */
const buildTear = (seed: string, open: number) => {
    const rand = mulberry32(hashSeed(seed));
    const width = 120 + open * 400;
    const center = TEAR_W * (0.25 + rand() * 0.35);
    const x0 = Math.min(Math.max(center - width / 2, 24), TEAR_W - 24 - width);
    const x1 = x0 + width;
    const halfMax = 2 + open * 17;
    const N = 16;
    const maxDy = TEAR_CY - 2;

    const upper: Pt[] = [[x0, TEAR_CY]];
    const lower: Pt[] = [[x0, TEAR_CY]];
    for (let i = 1; i < N; i++) {
        const t = i / N;
        const env = Math.pow(Math.sin(Math.PI * t), 0.75);
        const x = x0 + t * width + (rand() - 0.5) * (width / N) * 0.7;
        upper.push([x, TEAR_CY - Math.min(maxDy, Math.max(1, halfMax * env * (0.45 + rand() * 0.75)))]);
        lower.push([x, TEAR_CY + Math.min(maxDy, Math.max(1, halfMax * env * (0.45 + rand() * 0.75)))]);
    }
    upper.push([x1, TEAR_CY]);
    lower.push([x1, TEAR_CY]);

    /** 横跨裂口、尚未断开的组织丝。 */
    const strands: string[] = [];
    if (open > 0.25) {
        for (const i of [3, Math.floor(N / 2), N - 4]) {
            const [ux, uy] = upper[i];
            const [, ly] = lower[i];
            const bend = (rand() - 0.5) * 14;
            strands.push(`M${ux.toFixed(1)} ${uy.toFixed(1)} Q${(ux + bend).toFixed(1)} ${TEAR_CY} ${ux.toFixed(1)} ${ly.toFixed(1)}`);
        }
    }

    /** 裂口两端沿薄膜蔓延的应力裂纹（在主形状之后取随机数，保证既有节点的裂口形状不变）。 */
    const cracks = [-1, 1].map((dir) => {
        const base = dir < 0 ? x0 : x1;
        const len = 36 + open * 110;
        let d = `M${base.toFixed(1)} ${TEAR_CY}`;
        for (let k = 1; k <= 3; k++) {
            const x = clamp(base + dir * ((len * k) / 3) * (0.8 + rand() * 0.4), 0, TEAR_W);
            const y = TEAR_CY + (rand() - 0.5) * (6 + open * 10) * (k === 3 ? 0.4 : 1);
            d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
        }
        return d;
    });

    const fill = `${toPath(upper)} ${[...lower]
        .reverse()
        .map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`)
        .join(' ')} Z`;

    return {
        cx: (x0 + x1) / 2 / TEAR_W,
        left: `M0 ${TEAR_CY} L${x0.toFixed(1)} ${TEAR_CY}`,
        right: `M${x1.toFixed(1)} ${TEAR_CY} L${TEAR_W} ${TEAR_CY}`,
        upper: toPath(upper),
        lower: toPath(lower),
        fill,
        strands,
        cracks,
    };
};

/** 把描述拆成"句子 / 引文"片段，逐句错峰淡入；引文是现场留下的话，单独占一拍。 */
const buildPieces = (desc: string) => {
    const raw: Array<{ t: string; q: boolean }> = [];
    desc.split(QUOTE_RE).forEach((seg, i) => {
        if (!seg) return;
        if (HIGHLIGHT_QUOTES && i % 2 === 1) raw.push({ t: seg, q: true });
        else (seg.match(SENTENCE_RE) ?? [seg]).forEach((s) => raw.push({ t: s, q: false }));
    });
    const beats = raw.filter((p) => !PUNCT_ONLY_RE.test(p.t)).length;
    const step = Math.min(130, 800 / Math.max(1, beats));
    let k = -1;
    return raw.map((p) => {
        if (!PUNCT_ONLY_RE.test(p.t)) k++; // 纯标点并入上一句的节拍
        return { ...p, delay: Math.max(0, k) * step };
    });
};

/* ------------------------------------------------------------------ */
/* 局部样式（关键帧与少量 Tailwind 表达不了的规则）                    */
/* ------------------------------------------------------------------ */

const SHADOW_WIDE =
    'calc(var(--fr) * -3) 0 rgba(248,113,113,.55), calc(var(--fr) * 3) 0 rgba(34,211,238,.55), 0 0 40px rgba(34,211,238,.28)';
const SHADOW_REST =
    'calc(var(--fr) * -1) 0 rgba(248,113,113,.4), var(--fr) 0 rgba(34,211,238,.4), 0 0 32px rgba(34,211,238,.16)';

const CSS = `
@keyframes cs-lock { from { text-shadow: ${SHADOW_WIDE}; } to { text-shadow: ${SHADOW_REST}; } }
@keyframes cs-breathe { 0%,100% { opacity:.5 } 50% { opacity:1 } }
@keyframes cs-bleed-in { from { opacity: 0 } to { opacity: .5 } }
@keyframes cs-pulse   { 0%,100% { opacity:.3 } 50% { opacity:1 } }
@keyframes cs-rip { from { clip-path: inset(0 var(--cr) 0 var(--cl)); } to { clip-path: inset(0 0 0 0); } }
@keyframes cs-tear-open { from { transform: scaleY(0) } to { transform: scaleY(1) } }
@keyframes cs-glint {
  0%   { left: -12%; opacity: 0 }
  15%  { opacity: 1 }
  85%  { opacity: 1 }
  100% { left: 100%; opacity: 0 }
}
@keyframes cs-slice {
  0%   { transform: translateX(0); opacity: 0 }
  25%  { transform: translateX(var(--dx)); opacity: 1 }
  60%  { transform: translateX(calc(var(--dx) * -.6)); opacity: 1 }
  100% { transform: translateX(0); opacity: 0 }
}
@keyframes cs-exit  { to { transform: scale(1.07); opacity: 0 } }
@keyframes cs-flash { 0% { opacity: 0 } 40% { opacity: 1 } 100% { opacity: 0 } }

.cs-stage { transform-origin: var(--ax, 50%) var(--ay, 40%); }
.cs-stage[data-exit="1"] { animation: cs-exit ${EXIT_MS}ms cubic-bezier(.55,0,.85,.35) both; }
.cs-flash { animation: cs-flash ${EXIT_MS}ms ease-out both; }

.cs-title { text-shadow: ${SHADOW_WIDE}; transition: opacity 200ms; }
.cs-title-lock { text-shadow: ${SHADOW_REST}; animation: cs-lock 800ms cubic-bezier(.2,.8,.2,1) both; }

.cs-line { clip-path: inset(0 100% 0 0); }
.cs-line-live { clip-path: inset(0 0 0 0); transition: clip-path 800ms cubic-bezier(.65,0,.35,1); }

.cs-tear-svg { clip-path: inset(0 var(--cr) 0 var(--cl)); }
.cs-tear-svg-live { animation: cs-rip 620ms cubic-bezier(.2,.9,.2,1) 480ms both; }
.cs-tear { transform-box: fill-box; transform-origin: 50% 50%; transform: scaleY(0); }
.cs-tear-live { animation: cs-tear-open 520ms cubic-bezier(.2,.9,.2,1) 560ms both; }
.cs-tear-fill-live { animation: cs-breathe 3.8s ease-in-out 1.4s infinite; }

.cs-bleed-live { animation: cs-bleed-in 900ms ease-out both, cs-breathe 4.8s ease-in-out 900ms infinite; }
.cs-glint {
  position: absolute; top: 50%; width: 12%; height: 1px; margin-top: -.5px; pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(110,231,183,.95), transparent);
  animation: cs-glint 1500ms cubic-bezier(.4,0,.2,1) 900ms both;
}
.cs-dot { animation: cs-pulse 1.8s ease-in-out infinite; }
.cs-slice { position: absolute; left: 0; right: 0; mix-blend-mode: screen; animation: cs-slice 240ms steps(5) both; }
.cs-btn:focus-visible { outline: 1px solid rgba(103,232,249,.9); outline-offset: 5px; }
@media (prefers-reduced-motion: reduce) {
  .cs-root *, .cs-root *::before, .cs-root *::after {
    animation-duration: .001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .001ms !important;
    transition-delay: 0ms !important;
  }
}
`;

/* ------------------------------------------------------------------ */
/* 子组件：高频更新各自隔离，避免整屏重渲染                            */
/* ------------------------------------------------------------------ */

interface FieldCtl {
    /** 0 = 完全未收敛（满屏马赛克），1 = 完全收敛。由父组件写入，画布平滑追随。 */
    resolve: number;
}

/**
 * 滤网背景画布：未收敛的原始信号。
 * 马赛克色块按"随机 + 自左向右"的顺序消散，消散前沿的色块更亮；收敛后只剩稀疏的亮噪点。
 * 低分辨率、约 14fps、一次约千个矩形，开销很小；页面不可见时 rAF 自动暂停。
 */
const FilterField: React.FC<{
    seed: string;
    rgb: string;
    level: number;
    ctl: React.MutableRefObject<FieldCtl>;
    animate: boolean;
}> = ({ seed, rgb, level, ctl, animate }) => {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = ref.current;
        const g = canvas?.getContext('2d');
        if (!canvas || !g || !animate) return;

        const rand = mulberry32(hashSeed(`${seed}:field`));
        let w = 1;
        let h = 1;
        let cols = 1;
        let cell = 48;
        let order = new Float32Array(0);
        let hot = new Uint8Array(0);

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            w = canvas.width = Math.max(1, Math.round(rect.width));
            h = canvas.height = Math.max(1, Math.round(rect.height));
            cell = w < 640 ? 32 : 48;
            cols = Math.ceil(w / cell);
            const rows = Math.ceil(h / cell);
            order = new Float32Array(cols * rows);
            hot = new Uint8Array(cols * rows);
            for (let i = 0; i < order.length; i++) {
                order[i] = rand() * 0.6 + ((i % cols) / cols) * 0.4;
                hot[i] = rand() < 0.08 + level * 0.3 ? 1 : 0;
            }
        };
        resize();
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
        ro?.observe(canvas);

        const hotColor = `rgb(${rgb})`;
        const coolColor = `rgb(${RGB_FILTER})`;
        const specks = Math.round(8 + level * 70);
        let smooth = 0;
        let last = 0;
        let raf = 0;

        const frame = (t: number) => {
            raf = requestAnimationFrame(frame);
            if (t - last < 70) return;
            last = t;

            const target = ctl.current.resolve;
            smooth += (target - smooth) * 0.2;
            if (Math.abs(target - smooth) < 0.003) smooth = target;

            g.clearRect(0, 0, w, h);

            if (smooth < 0.999) {
                const flick = Math.floor(t / 110);
                for (let i = 0; i < order.length; i++) {
                    const v = order[i];
                    if (v < smooth * 1.02) continue;
                    const edge = 1 - Math.min(1, (v - smooth) / 0.16); // 靠近收敛前沿的色块更亮
                    const n = ((Math.imul(i + 1, 2654435761) ^ Math.imul(flick, 40503)) >>> 0) / 4294967296;
                    g.fillStyle = hot[i] ? hotColor : coolColor;
                    g.globalAlpha = (hot[i] ? 0.08 : 0.05) * (0.3 + n * 1.3) + edge * 0.08;
                    g.fillRect((i % cols) * cell + 1, Math.floor(i / cols) * cell + 1, cell - 2, cell - 2);
                }
            }

            // 视神经噪点：数量随威胁增加，高威胁混入红点
            for (let k = 0; k < specks; k++) {
                const red = level > 0.35 && Math.random() < level * 0.35;
                g.fillStyle = red ? 'rgb(248,113,113)' : 'rgb(207,250,254)';
                g.globalAlpha = 0.1 + Math.random() * 0.3;
                const s = Math.random() < 0.15 ? 3 : 2;
                g.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), s, s);
            }
            g.globalAlpha = 1;
        };
        raf = requestAnimationFrame(frame);

        return () => {
            cancelAnimationFrame(raf);
            ro?.disconnect();
        };
    }, [seed, rgb, level, ctl, animate]);

    return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
};

interface DecodeTitleProps {
    chars: string[];
    visible: boolean;
    revealed: number;
    decoding: boolean;
    locked: boolean;
    /** 0 = 稳定；越大定稿后越容易有字退回马赛克。 */
    instability: number;
    /** 色差静止值（px），随威胁增大。 */
    fringe: number;
}

/** 标题：马赛克 → 逐字对焦。字形轮转（70ms）只重渲染本组件。 */
const DecodeTitle = React.memo(({ chars, visible, revealed, decoding, locked, instability, fringe }: DecodeTitleProps) => {
    const [tick, setTick] = useState(0);
    const [flick, setFlick] = useState(-1);

    useEffect(() => {
        if (!decoding) return;
        const id = setInterval(() => setTick((t) => t + 1), 70);
        return () => clearInterval(id);
    }, [decoding]);

    // 滤网衰竭：高威胁节点定稿后，偶尔有一个字短暂退回马赛克
    useEffect(() => {
        if (!locked || instability <= 0 || prefersReducedMotion()) return;
        const candidates = chars.map((c, i) => (c.trim() ? i : -1)).filter((i) => i >= 0);
        if (!candidates.length) return;
        let alive = true;
        let t1: ReturnType<typeof setTimeout>;
        let t2: ReturnType<typeof setTimeout>;
        const loop = () => {
            t1 = setTimeout(() => {
                if (!alive) return;
                setFlick(candidates[Math.floor(Math.random() * candidates.length)]);
                setTick((t) => t + 1);
                t2 = setTimeout(() => {
                    setFlick(-1);
                    if (alive) loop();
                }, 110 + instability * 120);
            }, (2200 + Math.random() * 3200) / (0.6 + instability));
        };
        loop();
        return () => {
            alive = false;
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [locked, instability, chars]);

    const redBias = 1 + Math.round(instability * 2); // 马赛克字形里红色的占比（1~3 / 6）

    return (
        <h1
            className={`cs-title font-serif text-[clamp(2.75rem,9vw,7rem)] font-bold leading-[1.08] tracking-[0.02em] text-zinc-50 ${locked ? 'cs-title-lock' : ''
                }`}
            style={{ opacity: visible ? 1 : 0, textWrap: 'balance', ['--fr' as string]: `${fringe.toFixed(2)}px` } as React.CSSProperties}
        >
            {chars.map((ch, i) => {
                const done = i < revealed && i !== flick;
                const current = decoding && i === revealed;
                const glyph = SCRAMBLE[(tick * 7 + i * 13) % SCRAMBLE.length];
                const red = (tick + i * 3) % 6 < redBias;
                return (
                    <span
                        key={i}
                        className="relative inline-block whitespace-pre"
                        style={
                            current
                                ? { background: 'rgba(34,211,238,0.16)', boxShadow: '0 0 18px rgba(34,211,238,0.35)' }
                                : undefined
                        }
                    >
                        {/* 对焦：模糊 → 清晰；退回马赛克时瞬时切换 */}
                        <span
                            style={{
                                opacity: done ? 1 : 0,
                                filter: done ? 'blur(0)' : 'blur(7px)',
                                transition: done ? 'opacity 200ms ease-out, filter 280ms ease-out' : 'none',
                            }}
                        >
                            {ch}
                        </span>
                        {!done && ch.trim() !== '' ? (
                            <span
                                aria-hidden
                                className="absolute inset-0 flex items-center justify-center font-mono text-[0.7em] font-normal"
                                style={{ color: red ? `rgb(${RGB_DANGER})` : 'rgba(103,232,249,0.75)' }}
                            >
                                {glyph}
                            </span>
                        ) : null}
                    </span>
                );
            })}
        </h1>
    );
});
DecodeTitle.displayName = 'DecodeTitle';

/** 薄膜完整度读数：随裂口张开从 100 跌到实际值。逐帧更新只重渲染本组件。 */
const MembraneReadout: React.FC<{ target: number; active: boolean; instant: boolean; rgb: string }> = ({
    target,
    active,
    instant,
    rgb,
}) => {
    const [v, setV] = useState(100);
    useEffect(() => {
        if (!active) {
            setV(100);
            return;
        }
        if (instant) {
            setV(target);
            return;
        }
        let raf = 0;
        const start = performance.now() + 450;
        const frame = (now: number) => {
            const t = clamp((now - start) / 900, 0, 1);
            setV(Math.round(100 + (target - 100) * (1 - Math.pow(1 - t, 3))));
            if (t < 1) raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, [active, instant, target]);

    return (
        <span className="tabular-nums" style={{ color: `rgb(${rgb})` }}>
            {v}%
        </span>
    );
};

/* ------------------------------------------------------------------ */
/* 组件                                                                */
/* ------------------------------------------------------------------ */

export const CutsceneContent: React.FC<OverlayProps> = ({ node, nodeId, onCutsceneComplete }) => {
    const [stage, setStage] = useState(0);
    const [glitchActive, setGlitchActive] = useState(false);
    const [revealed, setRevealed] = useState(0);
    const [instant, setInstant] = useState(false);
    const [exiting, setExiting] = useState(false);
    const [reduced] = useState(prefersReducedMotion);

    const stageRef = useRef(0);
    stageRef.current = stage;
    const cancelRef = useRef<(() => void) | null>(null);
    const doneRef = useRef(false);
    const startedAtRef = useRef(0);
    const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fieldRef = useRef<FieldCtl>({ resolve: 0 });
    const rootRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const tearRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const chars = useMemo<string[]>(() => Array.from(String(node?.name ?? '')), [node?.name]);
    const total = chars.length;

    const threat = node ? getNodeThreatLevel(node) : 0;
    const hasThreat = node ? isNodeDangerous(node) : false;
    /** 由威胁等级派生的现实薄膜完整度读数。 */
    const membrane = Math.max(4, Math.round(100 - threat * 4.7));
    /** 裂口开合度：安全节点为 0（薄膜完好）；固定遭遇至少留一道小口。 */
    const open = hasThreat ? Math.max(0.18, 1 - membrane / 100) : 0;
    /** 威胁烈度 0~1：同时驱动色差、噪点密度、漏光强度与标题稳定性。 */
    const sev = !hasThreat ? 0 : threat <= 0 ? 0.6 : clamp(threat / 20, 0.15, 1);

    const tier = !hasThreat
        ? { label: '安全', rgb: RGB_SAFE }
        : threat <= 0
            ? { label: '固定遭遇', rgb: RGB_DANGER }
            : threat >= DANGER_AT
                ? { label: '危险', rgb: RGB_DANGER }
                : threat >= 10
                    ? { label: '高', rgb: RGB_DANGER }
                    : threat >= 5
                        ? { label: '中', rgb: RGB_WARN }
                        : { label: '低', rgb: RGB_SAFE };

    const seedKey = nodeId ?? node?.name ?? 'zone';
    const tear = useMemo(() => (open > 0 ? buildTear(seedKey, open) : null), [open, seedKey]);
    const cx = tear?.cx ?? 0.5;
    const pieces = useMemo(() => buildPieces(node?.desc ?? ''), [node?.desc]);

    /* ---------- 推进：故障 → 解码 → 描述 → 入口 ---------- */
    useEffect(() => {
        if (!node) return;
        let alive = true;
        const timers: Array<ReturnType<typeof setTimeout>> = [];
        const wait = (ms: number) =>
            new Promise<void>((resolve) => {
                timers.push(
                    setTimeout(() => {
                        if (alive) resolve();
                    }, ms)
                );
            });
        cancelRef.current = () => {
            alive = false;
            timers.forEach(clearTimeout);
        };

        if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        doneRef.current = false;
        startedAtRef.current = performance.now();
        setStage(0);
        setRevealed(0);
        setGlitchActive(false);
        setExiting(false);
        setInstant(false);

        const run = async () => {
            if (prefersReducedMotion()) {
                setInstant(true);
                setRevealed(total);
                setStage(3);
                return;
            }
            await wait(80);
            if (!alive) return;
            AudioService.playSfx('node_transition');
            setGlitchActive(true);
            await wait(200);
            if (!alive) return;
            setGlitchActive(false);
            await wait(60);
            if (!alive) return;

            setStage(1);
            AudioService.playSfx('zone_enter');
            const step = Math.max(55, Math.min(150, Math.round(1000 / Math.max(1, total))));
            for (let i = 0; i < total; i++) {
                await wait(step);
                if (!alive) return;
                setRevealed(i + 1);
            }
            await wait(200);
            if (!alive) return;

            setStage(2);
            AudioService.playSfx('typing_1');
            await wait(700);
            if (!alive) return;
            setStage(3);
        };

        run();
        return () => {
            alive = false;
            timers.forEach(clearTimeout);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [node, nodeId, total]);

    useEffect(
        () => () => {
            if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        },
        []
    );

    /* ---------- 背景滤网随解码进度收敛 ---------- */
    useEffect(() => {
        fieldRef.current.resolve = stage >= 2 ? 1 : stage === 1 ? 0.12 + 0.75 * (total ? revealed / total : 1) : 0;
    }, [stage, revealed, total]);

    /* ---------- 锚点：裂口在屏幕上的位置（漏光与退场的原点），写入 CSS 变量，不触发重渲染 ---------- */
    const measure = useCallback(() => {
        const root = rootRef.current;
        const el = tearRef.current;
        if (!root || !el) return;
        const r = root.getBoundingClientRect();
        const t = el.getBoundingClientRect();
        root.style.setProperty('--ax', `${(t.left - r.left + t.width * cx).toFixed(0)}px`);
        root.style.setProperty('--ay', `${(t.top - r.top + t.height / 2).toFixed(0)}px`);
    }, [cx]);

    useLayoutEffect(() => {
        measure();
        if (typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(measure);
        if (rootRef.current) ro.observe(rootRef.current);
        if (contentRef.current) ro.observe(contentRef.current);
        return () => ro.disconnect();
    }, [measure, node]);

    /* ---------- 交互 ---------- */
    const skip = useCallback(() => {
        // 防止触发过场的那一次双击/连点直接吞掉动画
        if (performance.now() - startedAtRef.current < 450) return;
        cancelRef.current?.();
        setInstant(true);
        setGlitchActive(false);
        setRevealed(total);
        setStage(3);
    }, [total]);

    const complete = useCallback(() => {
        if (doneRef.current) return;
        doneRef.current = true;
        if (prefersReducedMotion()) {
            onCutsceneComplete?.();
            return;
        }
        // 穿过裂口：先退场，再通知上层
        setExiting(true);
        exitTimerRef.current = setTimeout(() => onCutsceneComplete?.(), EXIT_MS);
    }, [onCutsceneComplete]);

    const advance = useCallback(() => {
        if (stageRef.current >= 3) complete();
        else skip();
    }, [complete, skip]);

    useEffect(() => {
        if (!node) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.repeat) return;
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                advance();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [node, advance]);

    useEffect(() => {
        if (stage >= 3) buttonRef.current?.focus({ preventScroll: true });
    }, [stage]);

    if (!node) return null;

    const filled = !hasThreat ? 0 : threat <= 0 ? SEGMENTS : Math.min(SEGMENTS, Math.max(1, Math.round(threat)));
    const decoding = stage === 1 && revealed < total;
    const locked = stage >= 1 && revealed >= total;
    const glowAlpha = hasThreat ? 0.06 + sev * 0.16 : 0.045;
    const fringe = 0.6 + sev * 2.2;
    const anchor = 'var(--ax, 50%) var(--ay, 40%)';

    return (
        <div
            ref={rootRef}
            className="cs-root relative h-full w-full cursor-pointer select-none overflow-hidden"
            style={{ touchAction: 'manipulation' }}
            data-stage={stage}
            onClick={advance}
        >
            <style>{CSS}</style>

            <div
                className={`cs-stage absolute inset-0 ${glitchActive ? 'animate-glitch-shake' : ''}`}
                data-exit={exiting ? 1 : 0}
            >
                {/* 环境层：未收敛的原始信号 / 扫描线 / 暗角 / 裂口漏光 */}
                <FilterField seed={seedKey} rgb={tier.rgb} level={sev} ctl={fieldRef} animate={!reduced} />
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                        backgroundImage:
                            'repeating-linear-gradient(to bottom, rgba(255,255,255,0.025) 0 1px, transparent 1px 3px)',
                    }}
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{ background: 'radial-gradient(ellipse at 40% 45%, transparent 50%, rgba(0,0,0,0.5) 100%)' }}
                />
                {/* 漏光：以裂口为中心向页面渗色，随威胁增强并缓慢"呼吸" */}
                <div
                    aria-hidden
                    className={`pointer-events-none absolute inset-0 ${stage >= 1 ? 'cs-bleed-live' : ''}`}
                    style={{
                        opacity: stage >= 1 ? undefined : 0,
                        background: `radial-gradient(ellipse 55% 40% at ${anchor}, rgba(${tier.rgb},${glowAlpha.toFixed(3)}), transparent 72%)`,
                    }}
                />

                {/* 开场故障切片 */}
                {glitchActive ? (
                    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                        <div className="cs-slice" style={{ top: '18%', height: '7%', background: 'rgba(34,211,238,0.10)', ['--dx' as string]: '-24px' } as React.CSSProperties} />
                        <div className="cs-slice" style={{ top: '46%', height: '3%', background: 'rgba(248,113,113,0.14)', ['--dx' as string]: '32px' } as React.CSSProperties} />
                        <div className="cs-slice" style={{ top: '71%', height: '9%', background: 'rgba(34,211,238,0.08)', ['--dx' as string]: '-40px' } as React.CSSProperties} />
                    </div>
                ) : null}

                {/* 内容层：独立滚动，背景层不随之错位 */}
                <div
                    className="absolute inset-0 flex overflow-y-auto overflow-x-hidden px-6 py-10 md:px-16"
                    onScroll={measure}
                >
                    <div ref={contentRef} className="relative m-auto w-full max-w-5xl">
                        <DecodeTitle
                            chars={chars}
                            visible={stage >= 1}
                            revealed={revealed}
                            decoding={decoding}
                            locked={locked}
                            instability={sev >= 0.25 ? sev : 0}
                            fringe={fringe}
                        />

                        {/* 现实薄膜：完好 / 被撕开 */}
                        <div ref={tearRef} className="relative mt-4 h-12 w-full">
                            <svg
                                aria-hidden
                                className={`cs-line absolute inset-0 block h-full w-full ${stage >= 1 ? 'cs-line-live' : ''}`}
                                viewBox={`0 0 ${TEAR_W} ${TEAR_H}`}
                                preserveAspectRatio="none"
                            >
                                {tear ? (
                                    <>
                                        <path d={tear.left} fill="none" stroke="rgba(34,211,238,0.5)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                                        <path d={tear.right} fill="none" stroke="rgba(34,211,238,0.5)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                                    </>
                                ) : (
                                    <path d={`M0 ${TEAR_CY} H${TEAR_W}`} fill="none" stroke="rgba(52,211,153,0.6)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                                )}
                            </svg>

                            {/* 撕裂：从裂口中心向两端撕开，再向上下张开 */}
                            {tear ? (
                                <svg
                                    aria-hidden
                                    className={`cs-tear-svg absolute inset-0 block h-full w-full ${stage >= 1 ? 'cs-tear-svg-live' : ''}`}
                                    style={
                                        {
                                            ['--cl' as string]: `${(tear.cx * 100).toFixed(2)}%`,
                                            ['--cr' as string]: `${((1 - tear.cx) * 100).toFixed(2)}%`,
                                        } as React.CSSProperties
                                    }
                                    viewBox={`0 0 ${TEAR_W} ${TEAR_H}`}
                                    preserveAspectRatio="none"
                                >
                                    <defs>
                                        <linearGradient id="cs-tear-grad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0" stopColor={`rgb(${tier.rgb})`} stopOpacity="0.08" />
                                            <stop offset="0.5" stopColor={`rgb(${tier.rgb})`} stopOpacity="0.4" />
                                            <stop offset="1" stopColor={`rgb(${tier.rgb})`} stopOpacity="0.08" />
                                        </linearGradient>
                                    </defs>
                                    <g className={`cs-tear ${stage >= 1 ? 'cs-tear-live' : ''}`}>
                                        <path d={tear.fill} fill="url(#cs-tear-grad)" className={stage >= 1 ? 'cs-tear-fill-live' : ''} />
                                        {/* 外发光：同一轮廓的宽描边 */}
                                        <path d={tear.upper} fill="none" stroke={`rgba(${tier.rgb},0.14)`} strokeWidth={5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                        <path d={tear.lower} fill="none" stroke={`rgba(${tier.rgb},0.14)`} strokeWidth={5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                        <path d={tear.upper} fill="none" stroke={`rgba(${tier.rgb},0.95)`} strokeWidth={1.25} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                        <path d={tear.lower} fill="none" stroke={`rgba(${tier.rgb},0.95)`} strokeWidth={1.25} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                        {tear.cracks.map((d, i) => (
                                            <path key={`c${i}`} d={d} fill="none" stroke={`rgba(${tier.rgb},0.5)`} strokeWidth={1} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                        ))}
                                        {tear.strands.map((d, i) => (
                                            <path key={i} d={d} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                                        ))}
                                    </g>
                                </svg>
                            ) : null}

                            {/* 安全节点：薄膜完好，只有一粒微光掠过 */}
                            {!hasThreat && stage >= 1 && !reduced ? <span aria-hidden className="cs-glint" /> : null}
                        </div>

                        <div
                            className="mt-2 flex items-baseline justify-between gap-4 font-mono text-[12px] tracking-[0.12em] transition-opacity duration-700"
                            style={{ opacity: stage >= 1 ? 1 : 0, transitionDelay: '300ms' }}
                        >
                            <span className="text-zinc-400">{nodeId ?? 'unknown'}</span>
                            <span className="text-zinc-400">
                                现实薄膜{' '}
                                <MembraneReadout
                                    target={membrane}
                                    active={stage >= 1}
                                    instant={instant}
                                    rgb={hasThreat ? tier.rgb : RGB_SAFE}
                                />
                            </span>
                        </div>

                        {/* 描述 + 读数 */}
                        <div className="mt-9 grid gap-9 md:grid-cols-[minmax(0,1fr)_15rem] md:gap-14">
                            <p
                                className="max-w-[34em] font-serif text-[1.0625rem] leading-[2] tracking-[0.04em] text-zinc-300 md:text-[1.1875rem]"
                                style={{
                                    filter: stage >= 2 ? 'blur(0)' : 'blur(10px)',
                                    transition: 'filter 900ms ease-out',
                                    textWrap: 'pretty',
                                    lineBreak: 'strict',
                                } as React.CSSProperties}
                            >
                                {pieces.map((p, i) => (
                                    <span
                                        key={i}
                                        style={{
                                            color: p.q ? '#f2a6a0' : undefined,
                                            opacity: stage >= 2 ? 1 : 0,
                                            transition: `opacity 520ms ease-out ${p.delay.toFixed(0)}ms`,
                                        }}
                                    >
                                        {p.t}
                                    </span>
                                ))}
                            </p>

                            <aside
                                className="border-t border-cyan-900/50 pt-5 transition-opacity duration-700 md:border-l md:border-t-0 md:pl-6 md:pt-0"
                                style={{ opacity: stage >= 2 ? 1 : 0, transitionDelay: '150ms' }}
                            >
                                <div className="flex items-center gap-2 text-sm text-zinc-400">
                                    <span className="cs-dot inline-block h-1.5 w-1.5 rounded-full bg-cyan-400" />
                                    扇区读数
                                </div>

                                <div className="mt-5 flex items-baseline justify-between">
                                    <span className="text-sm text-zinc-400">威胁</span>
                                    <span className="font-mono text-2xl tabular-nums" style={{ color: `rgb(${tier.rgb})` }}>
                                        {threat > 0 ? threat.toFixed(1) : '—'}
                                    </span>
                                </div>

                                <div className="relative mt-3 flex gap-[2px]">
                                    {Array.from({ length: SEGMENTS }, (_, i) => {
                                        const on = i < filled;
                                        // 阈值之后的格子即使未点亮也带一点红，让 15 这条线自己说话
                                        const beyond = i >= DANGER_AT;
                                        return (
                                            <span
                                                key={i}
                                                className="h-3 flex-1"
                                                style={{
                                                    background:
                                                        stage >= 2 && on
                                                            ? `rgba(${tier.rgb},${threat <= 0 ? 0.4 : 0.9})`
                                                            : beyond
                                                                ? `rgba(${RGB_DANGER},0.12)`
                                                                : 'rgba(255,255,255,0.07)',
                                                    transition: `background-color 260ms ease-out ${i * 28}ms`,
                                                }}
                                            />
                                        );
                                    })}
                                    {/* 危险阈值（威胁 15）刻度 */}
                                    <span
                                        title={`危险阈值 ${DANGER_AT}`}
                                        className="absolute -bottom-1 -top-1 w-px bg-zinc-500/70"
                                        style={{ left: `${(DANGER_AT / SEGMENTS) * 100}%` }}
                                    />
                                </div>

                                <div className="mt-3">
                                    <span
                                        className="inline-block border px-2 py-0.5 text-xs tracking-[0.2em]"
                                        style={{
                                            color: `rgb(${tier.rgb})`,
                                            borderColor: `rgba(${tier.rgb},0.4)`,
                                            background: `rgba(${tier.rgb},0.08)`,
                                        }}
                                    >
                                        {tier.label}
                                    </span>
                                </div>
                            </aside>
                        </div>
                    </div>
                </div>
            </div>

            {/* 退场：穿过裂口时的一闪 */}
            {exiting ? (
                <div
                    aria-hidden
                    className="cs-flash pointer-events-none absolute inset-0"
                    style={{
                        background: `radial-gradient(ellipse 45% 32% at ${anchor}, rgba(${tier.rgb},0.38), transparent 70%)`,
                    }}
                />
            ) : null}

            {/* 跳过提示 */}
            <div
                aria-hidden
                className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[11px] tracking-[0.2em] text-zinc-500 transition-opacity duration-500"
                style={{ opacity: stage >= 1 && stage < 3 ? 1 : 0 }}
            >
                点击跳过
            </div>
        </div>
    );
};