/**
 * 结局：链接终止
 *
 * 乱码流随体征线归于平直而同步寂灭，随后逐段揭示终止原因与重启入口。
 *
 * 演出节奏所需的计时逻辑随组件自持（不再单列 `useOverlayTiming.ts`）：
 * 该分阶段揭示钩子仅本组件一处使用。
 */
import React, { useEffect, useState } from 'react';
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

/**
 * 分阶段揭示。
 *
 * delays 为累计绝对毫秒：stage 将在每个时间点推进至对应序号 + 1。
 * 仅本文件使用，故不导出。
 */
const useStagedReveal = (delays: number[], resetKey: string): number => {
    const [stage, setStage] = useState(0);
    useEffect(() => {
        setStage(0);
        let alive = true;
        const timers = delays.map((ms, index) =>
            setTimeout(() => {
                if (alive) setStage(index + 1);
            }, ms)
        );
        return () => {
            alive = false;
            timers.forEach(clearTimeout);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resetKey]);
    return stage;
};

export const GameOverContent: React.FC<OverlayProps> = ({ deathReason, onReset }) => {
    const stage = useStagedReveal([350, 1150, 1800], 'gameover');
    const [glitchText, setGlitchText] = useState('');

    useEffect(() => {
        AudioService.playSfx('terrifying');
    }, []);

    /** 乱码流与体征线联动：体征归于平直后，信号同步寂灭。 */
    useEffect(() => {
        if (stage >= 2) {
            setGlitchText('');
            return;
        }
        const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>/?~█▓▛▅';
        const intervalId = setInterval(() => {
            setGlitchText(
                Array.from({ length: 26 }, () => glitchChars[Math.floor(Math.random() * glitchChars.length)]).join('')
            );
        }, 120);
        return () => clearInterval(intervalId);
    }, [stage]);

    return (
        <div className="relative flex h-full w-full flex-col items-center justify-center p-8 text-center">
            {/* 乱码背景 */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                <div className="whitespace-nowrap font-mono text-[180px] font-bold text-red-900/10 animate-glitch-text">
                    {glitchText}
                </div>
            </div>

            {/* 体征线：从紊乱波动归于平直 */}
            <svg viewBox="0 0 300 40" className="mb-6 h-10 w-72" aria-hidden>
                {stage < 2 ? (
                    <polyline
                        points="0,20 42,20 56,20 66,4 76,36 86,10 96,26 106,20 300,20"
                        fill="none"
                        stroke="rgba(239,68,68,0.75)"
                        strokeWidth="1.5"
                        className="animate-pulse"
                    />
                ) : (
                    <line x1="0" y1="20" x2="300" y2="20" stroke="rgba(239,68,68,0.55)" strokeWidth="1.5" />
                )}
            </svg>

            <div className={`transition-all duration-1000 ${stage >= 1 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
                <h1 className="font-mono text-6xl font-bold tracking-[0.2em] text-red-600 animate-text-glow-red md:text-8xl">
                    终结
                </h1>
                <div className="mt-2 font-mono text-xs uppercase tracking-[0.5em] text-red-500/50">
                    NEURAL_LINK::TERMINATED
                </div>
            </div>

            <div
                className={`mt-8 w-full max-w-2xl transition-all duration-700 ${stage >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                    }`}
            >
                <div className="relative border border-red-900/40 bg-red-950/20 p-6">
                    <Corners className="border-red-800/60" />
                    <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.4em] text-red-500/60">终止原因</div>
                    <p className="font-serif text-xl italic leading-relaxed text-zinc-300">"{deathReason}"</p>
                </div>
            </div>

            <div
                className={`mt-12 transition-all duration-500 ${stage >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                    }`}
            >
                <button
                    onClick={() => {
                        AudioService.playSfx('ui_click');
                        onReset?.();
                    }}
                    className="group relative overflow-hidden border border-red-800/50 bg-red-950/30 px-10 py-4 transition-all duration-300 hover:border-red-600/70 hover:bg-red-900/40"
                >
                    <Corners className="border-red-700/60" />
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-red-500/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                    <span className="relative z-10 font-mono text-sm uppercase tracking-[0.3em] text-red-400 transition-colors group-hover:text-red-300">
                        重启系统
                    </span>
                </button>
            </div>

            <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                <div className="font-mono text-[8px] tracking-[0.4em] text-red-900/40">
                    CONNECTION_LOST // SIGNAL_TERMINATED // REALITY_COLLAPSED
                </div>
            </div>
        </div>
    );
};
