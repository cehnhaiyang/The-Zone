/**
 * Overlay —— 统一全屏覆盖层
 *
 * 职责：
 * - 按 OverlayType 路由到各覆盖场景（过场 / 结局 / 生成加载）。
 * - 统一铺设背景特效、扫描线、四角框线与底部状态栏。
 *
 * 边界（重要）：
 * - 覆盖层只在局内叠加于主界面之上，由 `OverlayType` 这一个 UI 维度驱动。
 *
 * 目录结构（每个文件自持其所需的装饰构件，不设共享原子模块）：
 * - `types.ts`                 外部入参契约
 * - `index.tsx`                分发器 + 背景特效 / 场景主题表 / 四角框线
 * - `CutsceneContent.tsx`      过场：扇区进入
 * - `GameOverContent.tsx`      结局：链接终止（含自持的分阶段揭示钩子）
 * - `ZoneLoadingContent.tsx`   生成 / 加载：世界构建
 */
import React, { useMemo } from 'react';
import type { OverlayType } from '../../contract';
import type { OverlayProps } from './types';
import { CutsceneContent } from './Cutscene';
import { GameOverContent } from './GameOver';
import { GenerationContent } from './ZoneGeneration';

/* ------------------------------------------------------------------ */
/* 本层自持的装饰构件                                                  */
/* ------------------------------------------------------------------ */

/** 四角框线装饰。父容器需 relative / 定位上下文。 */
const Corners: React.FC<{ className?: string }> = ({ className = 'border-zinc-600/70' }) => (
    <>
        <span aria-hidden className={`pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t ${className}`} />
        <span aria-hidden className={`pointer-events-none absolute right-0 top-0 h-3 w-3 border-r border-t ${className}`} />
        <span aria-hidden className={`pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b border-l ${className}`} />
        <span aria-hidden className={`pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b border-r ${className}`} />
    </>
);

/** 各覆盖场景的背景氛围主题（雾霭 / 呼吸核心 / 粒子配色与数量）。 */
const TYPE_THEME: Record<OverlayType, { fog: string; core: string; particle: string; particleCount: number }> = {
    // `menu` 因契约 OverlayType 仍含该成员而保留；主菜单已不再经覆盖层渲染。
    menu: { fog: 'rgba(13,42,48,0.22)', core: 'rgba(8,51,68,0.10)', particle: 'bg-cyan-500/15', particleCount: 18 },
    cutscene: { fog: 'rgba(8,47,63,0.20)', core: 'rgba(15,118,110,0.08)', particle: 'bg-cyan-400/20', particleCount: 14 },
    gameover: { fog: 'rgba(69,10,10,0.26)', core: 'rgba(127,29,29,0.12)', particle: 'bg-red-500/25', particleCount: 30 },
    zone_gen: { fog: 'rgba(24,24,27,0.30)', core: 'rgba(8,51,68,0.10)', particle: 'bg-zinc-400/15', particleCount: 12 },
};

/** 按当前覆盖场景铺设层背景：雾气、呼吸核心、悬浮粒子与漂移网格。 */
const BackgroundEffects: React.FC<{ type: OverlayType }> = ({ type }) => {
    const theme = TYPE_THEME[type];
    const particles = useMemo(
        () =>
            Array.from({ length: theme.particleCount }, (_, index) => ({
                id: index,
                x: Math.random() * 100,
                y: Math.random() * 100,
                size: Math.random() * 2.5 + 1,
                speed: Math.random() * 18 + 12,
            })),
        [theme]
    );

    return (
        <>
            {/* 深渊雾气层 */}
            <div
                className="absolute inset-0"
                style={{ background: `radial-gradient(ellipse 80% 60% at 50% 18%, ${theme.fog} 0%, transparent 65%)` }}
            />
            <div
                className="absolute inset-0"
                style={{ background: `radial-gradient(ellipse 70% 55% at 50% 92%, ${theme.fog} 0%, transparent 60%)` }}
            />
            {/* 呼吸核心 */}
            <div
                className="absolute inset-0 animate-pulse"
                style={{
                    background: `radial-gradient(circle at 50% 50%, ${theme.core} 0%, transparent 46%)`,
                    animationDuration: '7s',
                }}
            />
            {/* 悬浮粒子 */}
            {particles.map((particle) => (
                <div
                    key={particle.id}
                    className={`absolute rounded-full ${theme.particle} animate-float-particle`}
                    style={{
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                        width: particle.size,
                        height: particle.size,
                        animationDuration: `${particle.speed}s`,
                        animationDelay: `${-particle.id * 0.5}s`,
                    }}
                />
            ))}
            {/* 漂移网格 */}
            <div className="absolute inset-0 animate-grid-drift bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:56px_56px]" />
        </>
    );
};

export const Overlay: React.FC<OverlayProps> = (props) => {
    const { type } = props;

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden bg-[#04060c]">
            <BackgroundEffects type={type} />
            <div className="overlay-scanlines pointer-events-none absolute inset-0" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.72)_100%)]" />
            <div className="pointer-events-none absolute inset-3 z-20">
                <Corners className="border-zinc-700/50" />
            </div>
            <div className="relative z-10 flex h-full w-full items-center justify-center">
                {type === 'cutscene' && <CutsceneContent {...props} />}
                {type === 'gameover' && <GameOverContent {...props} />}
                {type === 'zone_gen' && <GenerationContent {...props} />}
            </div>
            {type !== 'gameover' && (
                <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between px-6 py-3 font-mono text-[8px] uppercase tracking-[0.35em] text-zinc-700/80">
                    <span>NEURAL_LINK // TRANSLATION_ACTIVE</span>
                    <span className="animate-pulse">STATE::{type.toUpperCase()}</span>
                </div>
            )}
        </div>
    );
};

export default Overlay;
