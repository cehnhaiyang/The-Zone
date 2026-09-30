/**
 * 过场：扇区进入
 *
 * 设计概念：「滤网翻译」
 * 神经链接仪正在把这个扇区降维成人脑能读懂的东西——
 *   1. 标题先以马赛克色块出现，再逐字"翻译"成文字（本屏唯一的重头戏）；
 *   2. 标题下的「现实薄膜」是一条会被撕开的线，裂口大小/形状由威胁等级与节点 id 决定，
 *      安全节点则是一条完好的薄膜；
 *   3. 其余信息（描述、威胁读数、入口）保持安静，只做淡入。
 *
 * 推进：故障闪烁 → 标题解码 → 描述/读数 → 入口。
 * 交互：解码期间点击/Enter/空格可跳过动画；入口出现后点击任意处或 Enter/空格进入下一节点。
 * 无障碍：尊重 prefers-reduced-motion（直接展示最终状态）。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const SEGMENTS = 20;
const TEAR_W = 1000;
const TEAR_H = 48;
const TEAR_CY = 24;

const RGB_SAFE = '52,211,153';
const RGB_WARN = '251,191,36';
const RGB_DANGER = '248,113,113';

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

    const fill = `${toPath(upper)} ${[...lower]
        .reverse()
        .map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`)
        .join(' ')} Z`;

    return {
        left: `M0 ${TEAR_CY} L${x0.toFixed(1)} ${TEAR_CY}`,
        right: `M${x1.toFixed(1)} ${TEAR_CY} L${TEAR_W} ${TEAR_CY}`,
        upper: toPath(upper),
        lower: toPath(lower),
        fill,
        strands,
    };
};

/* ------------------------------------------------------------------ */
/* 局部样式（关键帧与少量 Tailwind 表达不了的规则）                    */
/* ------------------------------------------------------------------ */

const CSS = `
@keyframes cs-fringe {
  0%   { text-shadow: -7px 0 rgba(248,113,113,.7), 7px 0 rgba(34,211,238,.7), 0 0 40px rgba(34,211,238,.35); }
  100% { text-shadow: -1px 0 rgba(248,113,113,.38), 1px 0 rgba(34,211,238,.38), 0 0 32px rgba(34,211,238,.16); }
}
@keyframes cs-breathe { 0%,100% { opacity:.5 } 50% { opacity:1 } }
@keyframes cs-pulse   { 0%,100% { opacity:.3 } 50% { opacity:1 } }
@keyframes cs-tear-open { from { transform: scaleY(0) } to { transform: scaleY(1) } }
@keyframes cs-slice {
  0%   { transform: translateX(0); opacity: 0 }
  25%  { transform: translateX(var(--dx)); opacity: 1 }
  60%  { transform: translateX(calc(var(--dx) * -.6)); opacity: 1 }
  100% { transform: translateX(0); opacity: 0 }
}
.cs-title { text-shadow: -1px 0 rgba(248,113,113,.38), 1px 0 rgba(34,211,238,.38), 0 0 32px rgba(34,211,238,.16); }
.cs-title-live { animation: cs-fringe 900ms cubic-bezier(.2,.8,.2,1) both; }
.cs-line { clip-path: inset(0 100% 0 0); }
.cs-line-live { clip-path: inset(0 0 0 0); transition: clip-path 800ms cubic-bezier(.65,0,.35,1); }
.cs-tear { transform-box: fill-box; transform-origin: 50% 50%; transform: scaleY(0); }
.cs-tear-live { animation: cs-tear-open 520ms cubic-bezier(.2,.9,.2,1) 520ms both; }
.cs-tear-fill-live { animation: cs-breathe 3.8s ease-in-out 1.2s infinite; }
.cs-bleed-live { animation: cs-breathe 4.8s ease-in-out infinite; }
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
/* 组件                                                                */
/* ------------------------------------------------------------------ */

export const CutsceneContent: React.FC<OverlayProps> = ({ node, nodeId, onCutsceneComplete }) => {
    const [stage, setStage] = useState(0);
    const [glitchActive, setGlitchActive] = useState(false);
    const [revealed, setRevealed] = useState(0);
    const [tick, setTick] = useState(0);
    const [membraneShown, setMembraneShown] = useState(100);

    const stageRef = useRef(0);
    stageRef.current = stage;
    const cancelRef = useRef<(() => void) | null>(null);
    const doneRef = useRef(false);
    const instantRef = useRef(false);
    const startedAtRef = useRef(0);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const chars = useMemo(() => Array.from(node?.name ?? ''), [node?.name]);
    const total = chars.length;

    const threat = node ? getNodeThreatLevel(node) : 0;
    const hasThreat = node ? isNodeDangerous(node) : false;
    /** 由威胁等级派生的现实薄膜完整度读数。 */
    const membrane = Math.max(4, Math.round(100 - threat * 4.7));
    /** 裂口开合度：安全节点为 0（薄膜完好）；固定遭遇至少留一道小口。 */
    const open = hasThreat ? Math.max(0.18, 1 - membrane / 100) : 0;

    const tier = !hasThreat
        ? { label: '安全', rgb: RGB_SAFE }
        : threat <= 0
            ? { label: '固定遭遇', rgb: RGB_DANGER }
            : threat >= 15
                ? { label: '危险', rgb: RGB_DANGER }
                : threat >= 10
                    ? { label: '高', rgb: RGB_DANGER }
                    : threat >= 5
                        ? { label: '中', rgb: RGB_WARN }
                        : { label: '低', rgb: RGB_SAFE };

    const tear = useMemo(
        () => (open > 0 ? buildTear(nodeId ?? node?.name ?? 'zone', open) : null),
        [open, nodeId, node?.name]
    );

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

        doneRef.current = false;
        instantRef.current = false;
        startedAtRef.current = performance.now();
        setStage(0);
        setRevealed(0);
        setGlitchActive(false);
        setMembraneShown(100);

        const run = async () => {
            if (prefersReducedMotion()) {
                instantRef.current = true;
                setRevealed(total);
                setMembraneShown(membrane);
                setStage(3);
                return;
            }
            await wait(150);
            if (!alive) return;
            AudioService.playSfx('node_transition');
            setGlitchActive(true);
            await wait(240);
            if (!alive) return;
            setGlitchActive(false);
            await wait(100);
            if (!alive) return;

            setStage(1);
            AudioService.playSfx('zone_enter');
            const step = Math.max(55, Math.min(150, Math.round(1000 / Math.max(1, total))));
            for (let i = 0; i < total; i++) {
                await wait(step);
                if (!alive) return;
                setRevealed(i + 1);
            }
            await wait(260);
            if (!alive) return;

            setStage(2);
            AudioService.playSfx('typing_1');
            await wait(900);
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

    /* ---------- 马赛克字形轮转（仅解码期间） ---------- */
    const decoding = stage === 1 && revealed < total;
    useEffect(() => {
        if (!decoding) return;
        const id = setInterval(() => setTick((t) => t + 1), 70);
        return () => clearInterval(id);
    }, [decoding]);

    /* ---------- 薄膜读数：随裂口张开从 100 跌到实际值 ---------- */
    const entered = stage >= 1;
    useEffect(() => {
        if (!entered) return;
        if (instantRef.current) {
            setMembraneShown(membrane);
            return;
        }
        let raf = 0;
        const start = performance.now() + 450;
        const frame = (now: number) => {
            const t = Math.min(1, Math.max(0, (now - start) / 900));
            const eased = 1 - Math.pow(1 - t, 3);
            setMembraneShown(Math.round(100 + (membrane - 100) * eased));
            if (t < 1) raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, [entered, membrane]);

    /* ---------- 交互 ---------- */
    const skip = useCallback(() => {
        // 防止触发过场的那一次双击/连点直接吞掉动画
        if (performance.now() - startedAtRef.current < 450) return;
        cancelRef.current?.();
        instantRef.current = true;
        setGlitchActive(false);
        setRevealed(total);
        setMembraneShown(membrane);
        setStage(3);
    }, [total, membrane]);

    const complete = useCallback(() => {
        if (doneRef.current) return;
        doneRef.current = true;
        onCutsceneComplete?.();
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
    const bleedAlpha = hasThreat ? 0.05 + (Math.min(threat, 20) / 20) * 0.12 : 0.035;

    return (
        <div
            className={`cs-root relative flex h-full w-full cursor-pointer select-none overflow-y-auto overflow-x-hidden px-6 py-10 md:px-16 ${glitchActive ? 'animate-glitch-shake' : ''
                }`}
            data-stage={stage}
            onClick={advance}
        >
            <style>{CSS}</style>

            {/* 环境层：扫描线 / 暗角 / 威胁渗色（随威胁增强并缓慢"呼吸"） */}
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
            <div
                aria-hidden
                className={`pointer-events-none absolute inset-0 ${stage >= 1 && hasThreat ? 'cs-bleed-live' : ''}`}
                style={{
                    background: `radial-gradient(60% 55% at 92% 108%, rgba(${tier.rgb},${bleedAlpha.toFixed(3)}), transparent 70%)`,
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

            <div className="relative m-auto w-full max-w-5xl">
                {/* 标题：马赛克 → 文字 */}
                <h1
                    className={`cs-title font-serif text-[clamp(2.75rem,9vw,7rem)] font-bold leading-[1.08] tracking-[0.02em] text-zinc-50 ${stage >= 1 ? 'cs-title-live' : ''
                        }`}
                    style={{ opacity: stage >= 1 ? 1 : 0 }}
                >
                    {chars.map((ch, i) => {
                        const done = i < revealed;
                        const current = decoding && i === revealed;
                        const glyph = SCRAMBLE[(tick * 7 + i * 13) % SCRAMBLE.length];
                        const red = (tick + i * 3) % 5 === 0;
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
                                <span style={{ opacity: done ? 1 : 0 }}>{ch}</span>
                                {!done && ch.trim() !== '' ? (
                                    <span
                                        aria-hidden
                                        className="absolute inset-0 flex items-center justify-center font-mono text-[0.7em] font-normal"
                                        style={{ color: red ? 'rgb(248,113,113)' : 'rgba(103,232,249,0.75)' }}
                                    >
                                        {glyph}
                                    </span>
                                ) : null}
                            </span>
                        );
                    })}
                </h1>

                {/* 现实薄膜：完好 / 被撕开 */}
                <svg
                    aria-hidden
                    className={`cs-line mt-4 block h-12 w-full ${stage >= 1 ? 'cs-line-live' : ''}`}
                    viewBox={`0 0 ${TEAR_W} ${TEAR_H}`}
                    preserveAspectRatio="none"
                >
                    {tear ? (
                        <>
                            <path d={tear.left} fill="none" stroke="rgba(34,211,238,0.5)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                            <path d={tear.right} fill="none" stroke="rgba(34,211,238,0.5)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                            <g className={`cs-tear ${stage >= 1 ? 'cs-tear-live' : ''}`}>
                                <path d={tear.fill} fill={`rgba(${tier.rgb},0.22)`} className={stage >= 1 ? 'cs-tear-fill-live' : ''} />
                                <path d={tear.upper} fill="none" stroke={`rgba(${tier.rgb},0.95)`} strokeWidth={1.25} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                <path d={tear.lower} fill="none" stroke={`rgba(${tier.rgb},0.95)`} strokeWidth={1.25} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                {tear.strands.map((d, i) => (
                                    <path key={i} d={d} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                                ))}
                            </g>
                        </>
                    ) : (
                        <path d={`M0 ${TEAR_CY} H${TEAR_W}`} fill="none" stroke="rgba(52,211,153,0.6)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                    )}
                </svg>

                <div
                    className="mt-2 flex items-baseline justify-between gap-4 font-mono text-[12px] tracking-[0.12em] transition-opacity duration-700"
                    style={{ opacity: stage >= 1 ? 1 : 0, transitionDelay: '300ms' }}
                >
                    <span className="text-zinc-500">{nodeId ?? 'unknown'}</span>
                    <span className="text-zinc-400">
                        现实薄膜{' '}
                        <span className="tabular-nums" style={{ color: hasThreat ? `rgb(${tier.rgb})` : `rgb(${RGB_SAFE})` }}>
                            {membraneShown}%
                        </span>
                    </span>
                </div>

                {/* 描述 + 读数 */}
                <div className="mt-9 grid gap-9 md:grid-cols-[minmax(0,1fr)_15rem] md:gap-14">
                    <p
                        className="max-w-[34em] font-serif text-[1.0625rem] leading-[2] tracking-[0.04em] text-zinc-300 md:text-[1.1875rem]"
                        style={{
                            opacity: stage >= 2 ? 1 : 0,
                            filter: stage >= 2 ? 'blur(0)' : 'blur(10px)',
                            transition: 'opacity 800ms ease-out, filter 900ms ease-out',
                            textWrap: 'pretty',
                            lineBreak: 'strict',
                        } as React.CSSProperties}
                    >
                        {HIGHLIGHT_QUOTES
                            ? node.desc.split(QUOTE_RE).map((seg, i) =>
                                i % 2 === 1 ? (
                                    <span key={i} style={{ color: '#f2a6a0' }}>
                                        {seg}
                                    </span>
                                ) : (
                                    <React.Fragment key={i}>{seg}</React.Fragment>
                                )
                            )
                            : node.desc}
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
                                return (
                                    <span
                                        key={i}
                                        className="h-3 flex-1"
                                        style={{
                                            background:
                                                stage >= 2 && on
                                                    ? `rgba(${tier.rgb},${threat <= 0 ? 0.4 : 0.9})`
                                                    : 'rgba(255,255,255,0.07)',
                                            transition: `background-color 260ms ease-out ${i * 28}ms`,
                                        }}
                                    />
                                );
                            })}
                            {/* 危险阈值（威胁 15）刻度 */}
                            <span
                                title="危险阈值 15"
                                className="absolute -bottom-1 -top-1 w-px bg-zinc-500/70"
                                style={{ left: `${(15 / SEGMENTS) * 100}%` }}
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

                {/* 入口 */}
                <div
                    className="mt-11 flex items-center gap-5 transition-opacity duration-500"
                    style={{ opacity: stage >= 3 ? 1 : 0, pointerEvents: stage >= 3 ? 'auto' : 'none' }}
                >
                    <button
                        ref={buttonRef}
                        type="button"
                        tabIndex={stage >= 3 ? 0 : -1}
                        className="cs-btn group relative overflow-hidden border border-cyan-700/60 bg-cyan-950/30 px-12 py-4 transition-all duration-300 hover:border-cyan-500/70 hover:bg-cyan-900/40"
                    >
                        <Corners className="border-cyan-600/70" />
                        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                        <span
                            className="relative z-10 font-serif text-lg tracking-[0.5em] text-cyan-300 transition-colors group-hover:text-cyan-200"
                            style={{ marginRight: '-0.5em' }}
                        >
                            开始探索
                        </span>
                    </button>
                    <kbd className="hidden border border-zinc-700 px-2 py-0.5 font-mono text-[11px] text-zinc-500 md:inline">
                        Enter
                    </kbd>
                </div>
            </div>

            {/* 跳过提示 */}
            <div
                aria-hidden
                className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[11px] tracking-[0.2em] text-zinc-600 transition-opacity duration-500"
                style={{ opacity: stage >= 1 && stage < 3 ? 1 : 0 }}
            >
                点击跳过
            </div>
        </div>
    );
};