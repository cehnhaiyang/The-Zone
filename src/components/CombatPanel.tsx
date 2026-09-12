/**
 * CombatPanel.tsx
 * 战斗主面板 —— 无缝拼接 HUD 布局。
 *
 * 美术方向：EROSION PROTOCOL（侵蚀协议）
 * 临床军用仪表 × 有机侵蚀的对抗感。三色语义：
 *   冰蓝 #8fd6f7 → 操作方 / 友方 / 可用状态
 *   余烬 #ff7d5e → 敌对单元 / 危险 / 终结动作
 *   腐紫 #c28df5 → 理智 / 侵蚀 / 蓄反
 * 表面语言：分舱装甲（分层舱壁渐变 + 钢质发丝描边 + 八向角刻度 + 斜向微纹理）。
 * 计量语言：分段刻度轨（segment）。
 * 几何语言：切角 clip-notch / 菱形 ap-diamond / 六边 clip-hex（仅独立浮层与徽章）。
 * 字体：Oxanium（显示与数字） / JetBrains Mono（数据） / Noto Sans SC（中文）。
 *
 * 布局哲学（迭代）：
 * 不再让组件以带边界的卡片"框定"自身、围绕中心留出呼吸空间；
 * 而是让所有组件像装甲板一样紧密拼接，铺满整个视口，组件边缘即屏幕边缘。
 * - 主网格 gap-px + 间隙着色，形成 1px 青色 HUD 网格线，无内边距留边。
 * - 中心格 = 敌人肖像 absolute 铺满 + 铭牌渐变覆盖层压底 + 意图模块紧贴下缘，
 *   中心不存在任何黑色呼吸留白。
 * - 拼接组件一律直角矩形，去除斜切 / 切角裁切 / skew，避免切角产生三角缺口。
 * - 左右面板与一切可能为空的容器，统一铺设网格纹理 + 顶光晕 + 角标，
 *   使剩余空间成为有质感的 HUD 表面，而非死黑留白。
 * - 敌对卡片 flex-1 均分铺满整行；队友卡片 flex-1 拉伸铺满左列；
 *   右列战术列表 flex-1 + 战斗遥测条，主动吃掉所有留白。
 *
 * 响应式：
 * < lg：flex-col 单列纵向滚动，块间 gap-px 贴合，舞台肖像区 min-h 撑起。
 * lg+：无缝网格，列宽按 fr 比例铺满，行 = auto(轨道) + minmax(0,1fr)(主体)。
 *
 * 滚动链路：flex / grid 子项 min-h-0 显式声明，弹性行 minmax(0,1fr) 可收缩。
 * 战斗日志由全局可拖动 / 缩放透明日志面板统一承载，本组件不重复实现。
 * 序列首项以高亮环标记；敌方仅暴露 GUARD 层数；所有图标均为内联 SVG，无 emoji。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { CounterAdvanceRequest } from '../hooks/useCombat';
import {
    ActionEffectType,
    AttackResult,
    AttributeType,
    CombatAlly,
    CombatDynamicState,
    CombatEnemy,
    CombatIntent,
    DefenseResult,
    DynamicVitalType,
    IntentType,
    Tactic,
    Target,
    VitalType,
    WeaponType,
    getPercent,
    isAttributeType,
    isDynamicVitalType,
    isVitalType,
    safeNumber,
} from './../meta';

const combatPanelCss = `
@import url('https://fonts.googleapis.com/css2?family=Oxanium:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Noto+Sans+SC:wght@400;500;700&display=swap');

/* ============================================================
   EROSION PROTOCOL —— 战斗 HUD 视觉系统
   冷基调（操作方/冰蓝） × 敌对（余烬红） × 侵蚀（腐紫）
   ============================================================ */
.combat-panel-root {
  --void: #04070d;
  --hull-a: #0d1725;
  --hull-b: #050a12;
  --steel: rgba(126, 156, 182, 0.22);
  --steel-hi: rgba(168, 202, 226, 0.42);
  --ice: #8fd6f7;
  --ice-mid: #3fa9d6;
  --ice-deep: #1d6f9c;
  --ember: #ff7d5e;
  --ember-mid: #d9483a;
  --ember-deep: #7d1f18;
  --rot: #c28df5;
  --bone: #e9f2f8;
  --mute: #77879a;
  font-family: 'Noto Sans SC', system-ui, -apple-system, sans-serif;
  background: var(--void);
  color: var(--bone);
}
.combat-panel-root .font-display { font-family: 'Oxanium', 'Noto Sans SC', sans-serif; }
.combat-panel-root .font-mono { font-family: 'JetBrains Mono', ui-monospace, 'Courier New', monospace; }
.tabular { font-variant-numeric: tabular-nums; }

/* ---------- 分舱装甲表面 ---------- */
/* 纵深：顶缘高光 + 顶弧受光 + 底缘内投影，读作「抬起的分舱装甲板」而非平面色块 */
.surf-panel {
  background:
    radial-gradient(ellipse 120% 60% at 50% 0%, rgba(168, 202, 226, 0.07), transparent 62%),
    linear-gradient(180deg, var(--hull-a), var(--hull-b));
  box-shadow:
    inset 0 1px 0 rgba(233, 242, 248, 0.07),
    inset 0 -26px 36px -24px rgba(0, 0, 0, 0.92),
    inset 0 0 64px rgba(0, 0, 0, 0.45);
}
.surf-card { background: linear-gradient(180deg, rgba(14, 22, 34, 0.94), rgba(5, 9, 15, 0.95)); }
.surf-card--focus { background: linear-gradient(180deg, rgba(11, 33, 47, 0.95), rgba(4, 12, 20, 0.96)); }
.surf-card--lock { background: linear-gradient(180deg, rgba(48, 13, 10, 0.94), rgba(17, 5, 6, 0.96)); }
.surf-card--select { background: linear-gradient(180deg, rgba(8, 40, 30, 0.94), rgba(4, 14, 12, 0.96)); }
.surf-card--dead { background: rgba(6, 9, 13, 0.92); }

/* 斜向微纹理：让留白成为有质感的舱壁 */
.hud-hatch {
  background-image: repeating-linear-gradient(45deg, rgba(168, 202, 226, 0.05) 0 1px, transparent 1px 7px);
}
/* 1px 拼接缝 */
.hud-seam { background-color: rgba(126, 156, 182, 0.16); }
/* 顶部发丝高光 */
.hud-hairline { background: linear-gradient(90deg, transparent, var(--steel-hi) 22%, var(--steel-hi) 78%, transparent); }
/* 八向角刻度（贴在 .hud-ticks 的 ::after 上，不裁剪内容） */
.hud-ticks { position: relative; }
.hud-ticks::after {
  content: ''; position: absolute; inset: -1px; pointer-events: none; --tk: rgba(143, 214, 247, 0.6);
  background-image: linear-gradient(var(--tk), var(--tk)), linear-gradient(var(--tk), var(--tk)),
    linear-gradient(var(--tk), var(--tk)), linear-gradient(var(--tk), var(--tk)),
    linear-gradient(var(--tk), var(--tk)), linear-gradient(var(--tk), var(--tk)),
    linear-gradient(var(--tk), var(--tk)), linear-gradient(var(--tk), var(--tk));
  background-size: 13px 2px, 2px 13px, 13px 2px, 2px 13px, 13px 2px, 2px 13px, 13px 2px, 2px 13px;
  background-position: 0 0, 0 0, 100% 0, 100% 0, 0 100%, 0 100%, 100% 100%, 100% 100%;
  background-repeat: no-repeat;
}
.hud-ticks--ember::after { --tk: rgba(255, 125, 94, 0.55); }
/* 菱形状态灯 */
.hud-led { width: 6px; height: 6px; flex: 0 0 auto; transform: rotate(45deg); background: currentColor; box-shadow: 0 0 10px currentColor; }
.hud-led--ice { color: var(--ice); }
.hud-led--ember { color: var(--ember); }

/* ---------- 分段刻度计量轨 ---------- */
.hud-meter { background: #04070c; box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.9); }
.hud-meter-seg {
  background-image: repeating-linear-gradient(90deg, transparent 0 5px, rgba(2, 4, 8, 0.72) 5px 6px);
}
/* 25/50/75% 档位刻线：帮助一眼判断血量档 */
.hud-meter-ticks {
  background-image: linear-gradient(90deg, rgba(233, 242, 248, 0.42) 0 1px, transparent 1px);
  background-size: 25% 100%;
  background-repeat: repeat-x;
}
/* ---------- 焦点靶 ---------- */
@keyframes reticle-breathe { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.85; transform: scale(1.03); } }
.animate-reticle { animation: reticle-breathe 3.6s ease-in-out infinite; }

/* ---------- 敌人扫描舱（SPECIMEN SCAN BAY） ---------- */
/* 侧壁测量刻度尺：每 12px 一细刻度，每 48px 一主刻度 */
.ruler-y {
  background-image:
    repeating-linear-gradient(to bottom, rgba(255, 125, 94, 0.55) 0 1px, transparent 1px 48px),
    repeating-linear-gradient(to bottom, rgba(255, 125, 94, 0.2) 0 1px, transparent 1px 12px);
  background-size: 10px 100%, 5px 100%;
  background-repeat: no-repeat;
  background-position: left top, left top;
  mask-image: linear-gradient(to bottom, transparent, black 16%, black 84%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 16%, black 84%, transparent);
}
.ruler-y-r { background-position: right top, right top; }
/* 收容场：左右边缘的束缚光带 */
.bay-field {
  background: linear-gradient(90deg, rgba(255, 125, 94, 0.13), transparent 7%, transparent 93%, rgba(255, 125, 94, 0.13));
}
/* 扫描舱纵向扫掠线 */
@keyframes bay-scan { 0% { transform: translateY(-12%); opacity: 0; } 12% { opacity: 0.9; } 88% { opacity: 0.9; } 100% { transform: translateY(112%); opacity: 0; } }
.bay-scan { animation: bay-scan 7.5s linear infinite; }
/* 雷达扫掠扇区 */
.radar-sweep { background: conic-gradient(from 0deg, rgba(255, 125, 94, 0.3), rgba(255, 125, 94, 0.06) 18%, transparent 30%, transparent 100%); }
/* 舱壁格栅底纹 */
.bay-grille {
  background-image:
    repeating-linear-gradient(0deg, rgba(255, 125, 94, 0.075) 0 1px, transparent 1px 24px),
    repeating-linear-gradient(90deg, rgba(255, 125, 94, 0.075) 0 1px, transparent 1px 24px);
}
/* 扫描舱顶端收边光 */
.bay-edge-top { background: linear-gradient(to bottom, rgba(255, 125, 94, 0.16), transparent); }

/* ---------- 纵深 / 动效 / 视效增强 ---------- */

/* 聚焦切换：舞台重挂载时的一次性纵深入场（模糊收敛 + 由近及远） */
@keyframes stage-enter {
  0% { opacity: 0; transform: scale(1.035); filter: blur(7px) brightness(1.6); }
  100% { opacity: 1; transform: scale(1); filter: blur(0) brightness(1); }
}
.stage-enter { animation: stage-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }

/* 卡片抬升：悬停时浮起并投下环境遮蔽阴影 */
.card-lift {
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s ease, border-color 0.28s ease;
}
.card-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 28px -18px rgba(0, 0, 0, 0.95), inset 0 1px 0 rgba(233, 242, 248, 0.06);
}

/* 相位切换：横贯 HUD 的一次性光刃 */
@keyframes phase-sweep {
  0% { transform: translateX(-100%); opacity: 0; }
  10% { opacity: 0.9; }
  100% { transform: translateX(100%); opacity: 0; }
}
.phase-sweep { animation: phase-sweep 0.95s cubic-bezier(0.4, 0, 0.2, 1) both; }

/* 濒死敌人肖像：色差收紧 + 搏动内描边 */
@keyframes critical-rim {
  0%, 100% { box-shadow: inset 0 0 0 1px rgba(255, 125, 94, 0.35), inset 0 0 60px rgba(255, 60, 40, 0.12); }
  50% { box-shadow: inset 0 0 0 1px rgba(255, 125, 94, 0.8), inset 0 0 120px rgba(255, 60, 40, 0.3); }
}
.portrait-critical { animation: critical-rim 1.5s ease-in-out infinite; }

/* 全屏欣赏层 */
@keyframes fs-enter { 0% { opacity: 0; } 100% { opacity: 1; } }
.fs-enter { animation: fs-enter 0.26s ease-out both; }
@keyframes fs-image-in { 0% { opacity: 0; transform: scale(1.06); filter: blur(10px); } 100% { opacity: 1; transform: scale(1); filter: blur(0); } }
.fs-image-enter { animation: fs-image-in 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; }

/* 肖像「镜头晃动」：常驻的手持式微幅位移 + 极轻旋转，
   让静态立绘读作被一台手持设备持续拍摄的活体（幅度刻意压低，久看不晕）。 */
@keyframes portrait-drift {
  0% { transform: scale(1.05) translate(0, 0) rotate(0deg); }
  20% { transform: scale(1.058) translate(0.5%, -0.35%) rotate(0.12deg); }
  40% { transform: scale(1.052) translate(-0.4%, 0.3%) rotate(-0.1deg); }
  60% { transform: scale(1.062) translate(-0.45%, -0.3%) rotate(0.09deg); }
  80% { transform: scale(1.054) translate(0.35%, 0.4%) rotate(-0.08deg); }
  100% { transform: scale(1.05) translate(0, 0) rotate(0deg); }
}
.portrait-drift { animation: portrait-drift 9s ease-in-out infinite; will-change: transform; }
/* 溢出渐隐：提示可滚动方向 */
.fade-b {
  mask-image: linear-gradient(to bottom, black 78%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 78%, transparent 100%);
}
.fade-x {
  mask-image: linear-gradient(to right, black 96%, transparent 100%);
  -webkit-mask-image: linear-gradient(to right, black 96%, transparent 100%);
}

/* ---------- 降载：用户偏好减弱动效时关闭一切循环动画 ---------- */
@media (prefers-reduced-motion: reduce) {
  .combat-panel-root *,
  .combat-panel-root *::before,
  .combat-panel-root *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
/* ---------- 切角 / 菱形几何 ---------- */
.clip-notch { clip-path: polygon(7px 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%, 0 7px); }
.clip-hex { clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); }
.ap-diamond {
  position: relative; width: 32px; height: 32px; flex: 0 0 auto; display: grid; place-items: center;
  transform: rotate(45deg); border: 1px solid; transition: all 0.3s ease;
}
.ap-diamond--atk { background: linear-gradient(135deg, rgba(255, 125, 94, 0.22), rgba(125, 31, 24, 0.55)); border-color: rgba(255, 125, 94, 0.6); color: #ffd0c2; }
.ap-diamond--def { background: linear-gradient(135deg, rgba(143, 214, 247, 0.2), rgba(29, 111, 156, 0.55)); border-color: rgba(143, 214, 247, 0.6); color: #d6f1ff; }
.ap-diamond--off { background: rgba(10, 16, 24, 0.85); border-color: rgba(126, 156, 182, 0.22); color: #4d5b6a; }

/* ---------- 全屏氛围层 ---------- */
.combat-ambience {
  background:
    radial-gradient(ellipse 78% 55% at 50% -8%, rgba(63, 169, 214, 0.15), transparent 62%),
    radial-gradient(ellipse 58% 48% at 100% 102%, rgba(217, 72, 58, 0.13), transparent 62%),
    radial-gradient(ellipse 48% 42% at -2% 96%, rgba(194, 141, 245, 0.10), transparent 62%),
    radial-gradient(ellipse 125% 125% at 50% 50%, transparent 48%, rgba(2, 4, 8, 0.94) 100%);
}
.bg-grid-tech {
  background-size: 40px 40px;
  background-image:
    linear-gradient(to right, rgba(143, 214, 247, 0.045) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(143, 214, 247, 0.045) 1px, transparent 1px);
}
.bg-grid-fade {
  background-size: 40px 40px;
  background-image:
    linear-gradient(to right, rgba(143, 214, 247, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(143, 214, 247, 0.05) 1px, transparent 1px);
  mask-image: radial-gradient(circle at center, black, transparent 86%);
}
/* 侵蚀脉络：贴屏幕底缘的有机渗色 */
.erosion-bloom {
  background:
    radial-gradient(ellipse 70% 26% at 50% 104%, rgba(194, 141, 245, 0.16), transparent 70%),
    radial-gradient(ellipse 34% 18% at 14% 100%, rgba(217, 72, 58, 0.12), transparent 72%);
}
.noise-overlay {
  background-image:
    repeating-radial-gradient(circle at 17% 32%, rgba(255,255,255,0.045) 0 1px, transparent 1px 3px),
    repeating-radial-gradient(circle at 63% 71%, rgba(255,255,255,0.035) 0 1px, transparent 1px 2px);
  animation: noise-shift 1.6s steps(4) infinite;
}
@keyframes noise-shift {
  0% { transform: translate(0, 0); } 25% { transform: translate(-1px, 1px); }
  50% { transform: translate(1px, -1px); } 75% { transform: translate(-1px, -1px); }
  100% { transform: translate(0, 0); }
}
.hud-scanline {
  position: absolute; left: 0; width: 100%; height: 110px;
  background: linear-gradient(to bottom, transparent, rgba(143, 214, 247, 0.055) 50%, transparent);
  pointer-events: none; animation: scan-vertical 5.2s linear infinite;
}
@keyframes scan-vertical { 0% { transform: translateY(-120px); } 100% { transform: translateY(100vh); } }
.danger-vignette { box-shadow: inset 0 0 130px 42px rgba(217, 72, 58, 0.36); animation: danger-pulse 1.6s ease-in-out infinite; }
.danger-vignette-critical { box-shadow: inset 0 0 170px 64px rgba(255, 90, 70, 0.52); animation: danger-pulse 0.85s ease-in-out infinite; }
@keyframes danger-pulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }
/* 危险斜纹：终结回合按钮底纹 */
.hazard-stripes {
  background-image: repeating-linear-gradient(-45deg, rgba(255, 125, 94, 0.55) 0 8px, transparent 8px 16px);
}

/* ---------- 舞台放射环 ---------- */
.stage-ring { border: 1px solid rgba(255, 125, 94, 0.26); border-radius: 9999px; }

/* ---------- 动效 ---------- */
@keyframes damage-float {
  0% { opacity: 0; transform: translate(-50%, 0) scale(0.5); }
  18% { opacity: 1; transform: translate(-50%, -38px) scale(1.28); filter: drop-shadow(0 0 12px currentColor); }
  100% { opacity: 0; transform: translate(-50%, -118px) scale(1); }
}
.animate-damage-float { animation: damage-float 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
@keyframes glitch {
  0% { clip-path: inset(40% 0 61% 0); transform: translate(-2px, 2px); }
  20% { clip-path: inset(92% 0 1% 0); transform: translate(2px, -3px); }
  40% { clip-path: inset(43% 0 1% 0); transform: translate(-1px, 2px); }
  60% { clip-path: inset(25% 0 58% 0); transform: translate(3px, -1px); }
  80% { clip-path: inset(54% 0 7% 0); transform: translate(-2px, 3px); }
  100% { clip-path: inset(58% 0 43% 0); transform: translate(1px, -2px); }
}
.animate-glitch { animation: glitch 0.4s infinite linear alternate-reverse; }
@keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.animate-spin-slow { animation: spin-slow 26s linear infinite; }
@keyframes bounce-slow { 0%, 100% { transform: translateY(-4px); } 50% { transform: translateY(4px); } }
.animate-bounce-slow { animation: bounce-slow 3.4s infinite ease-in-out; }
@keyframes pulse-glow { 0%, 100% { opacity: 0.6; filter: drop-shadow(0 0 5px currentColor); } 50% { opacity: 1; filter: drop-shadow(0 0 18px currentColor); } }
.animate-pulse-glow { animation: pulse-glow 2.2s infinite ease-in-out; }
@keyframes phase-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
.animate-phase-blink { animation: phase-blink 1.1s steps(2) infinite; }
@keyframes soft-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
.animate-soft-blink { animation: soft-blink 1.6s ease-in-out infinite; }
@keyframes shimmer { 0% { transform: translateX(-150%) skewX(-25deg); } 100% { transform: translateX(150%) skewX(-25deg); } }
.shimmer-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05) 40%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.05) 60%, transparent);
  pointer-events: none; animation: shimmer 3s infinite;
}
@keyframes sweep-x { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
.animate-sweep-x { animation: sweep-x 3.6s linear infinite; }
/* 受击闪光：一次性内发光，以 key 重挂载重放 */
@keyframes damage-hit {
  0% { opacity: 1; box-shadow: inset 0 0 0 1px rgba(255, 125, 94, 0.95), inset 0 0 46px rgba(255, 125, 94, 0.5); }
  100% { opacity: 0; box-shadow: inset 0 0 0 1px rgba(255, 125, 94, 0), inset 0 0 46px rgba(255, 125, 94, 0); }
}
.animate-damage-hit { animation: damage-hit 0.62s ease-out forwards; }

/* ---------- 滚动条 ---------- */
.custom-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(63, 169, 214, 0.75) rgba(126, 156, 182, 0.08); }
.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: rgba(126, 156, 182, 0.08); }
.custom-scrollbar::-webkit-scrollbar-thumb { background: linear-gradient(to bottom, #8fd6f7, #1d6f9c); }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: linear-gradient(to bottom, #bfe9ff, #3fa9d6); }
`;

interface CombatPanelProps {
    enemies: CombatEnemy[];
    enemyIntents: Array<CombatIntent | null>;
    allies: CombatAlly[];
    activeAllyId: string;
    setActiveAllyId: Dispatch<SetStateAction<string>>;
    isPlayerPhase: boolean;
    isBusy: boolean;
    getTacticsFor: (ownerId: string) => Tactic[];
    canUseTactic: (tactic: Tactic, casterId: string) => boolean;
    executeTactic: (tacticId: string, casterId?: string, manualTargetId?: string) => Promise<void>;
    endPlayerPhase: () => Promise<void>;
    getVisibleResultSequence?: (targetId: string) => {
        attackResult: AttackResult[];
        defenseResult: DefenseResult[];
    };
    pendingDefense?: Record<string, DefenseResult[]>;
    /**
     * 敌人肖像生成。
     * 入参为「资产键」= 敌人模板 id（enemy.id），而非实例 id：
     * 同型敌人的多次出现共享同一份立绘档案，才能跨战斗复用与随机切换。
     */
    onGenerateEnemyVisual?: (enemyAssetId?: string) => void;
    /** 在敌人已有肖像变体间随机切换（与玩家 / NPC 肖像页一致）。入参同为资产键。 */
    onRandomSwitchEnemyVisual?: (enemyAssetId: string, currentUrl?: string) => Promise<string | null> | string | null;
    /** 按资产键查询该敌人的肖像是否正在生成。 */
    isEnemyVisualGenerating?: (enemyAssetId: string) => boolean;
    /** 战场位置表：key 为我方 targetId（player / 同伴 id）或敌方 instanceId。 */
    positions?: Record<string, number>;
    /** 战线坐标下限（小地图渲染用）。 */
    battleLineMin?: number;
    /** 战线坐标上限（小地图渲染用）。 */
    battleLineMax?: number;
    /** 单位攻击距离查询：我方取主手武器 range，敌方取模板 range；0 = 无限距离。 */
    getUnitRange?: (unitId: string) => number;
    /** 我方单位前进 / 后退一步。dir：1 前进（靠近敌方），-1 后退（远离敌方）。 */
    onMoveAlly?: (allyId: string, dir: 1 | -1) => Promise<void>;
    /** 蓄反 / 差反预支询问；非空时在底部通栏弹出询问条（不遮挡主界面）。 */
    counterPrompt?: CounterAdvanceRequest | null;
    /** 回应预支询问：true = 预支，false = 保留 / 放弃。 */
    onResolveCounterPrompt?: (approve: boolean) => void;
    /** 每单位预支询问跳过开关（player / 同伴 id → 蓄反 / 差反）。 */
    counterSkip?: Record<string, Partial<Record<CounterAdvanceRequest['kind'], boolean>>>;
    /** 切换某单位的跳过开关。 */
    onToggleCounterSkip?: (unitId: string, kind: CounterAdvanceRequest['kind'], skip: boolean) => void;
    /** 「立即行动」窗口：非空时锁定该单位并允许立即操作（预支的后续行为）。 */
    insertAction?: { unitId: string; chancesLeft: number } | null;
    /** 手动结束「立即行动」窗口。 */
    onEndInsertAction?: () => void;
}

type ManualTargetMode = 'single_ally' | 'single_teammate' | 'enemy' | null;
type AnyTacticEffect =
    | [Target, AttributeType | DynamicVitalType, number]
    | [Target, AttributeType, number, number];

// =====================
// 图标（内联 SVG，无 emoji）
// =====================
const ICON_PATHS = {
    sword: 'M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    buff: 'M22 7l-8.5 8.5-5-5L2 17M16 7h6v6',
    debuff: 'M22 17l-8.5-8.5-5 5L2 7M16 17h6v-6',
    eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
    heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z',
    brain: 'M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2zM14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z',
    bolt: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z',
    drop: 'M12 2.7s6 6.3 6 11a6 6 0 0 1-12 0c0-4.7 6-11 6-11z',
    wind: 'M9.6 4.6A2 2 0 1 1 11 8H2M12.6 19.4A2 2 0 1 0 14 16H2M17.7 7.7A2.5 2.5 0 1 1 19.5 12H2',
    target: 'M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 12m-5 0a5 5 0 1 0 10 0 5 5 0 1 0-10 0M12 12m-1 0a1 1 0 1 0 2 0 1 1 0 1 0-2 0',
    spark: 'M12 3l1.9 5.8 6.1 1.2-6.1 1.2L12 17l-1.9-5.8L4 12l6.1-1.2L12 3zM19 15l.9 2.6 2.6.9-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9L19 15z',
    alert: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
    gauge: 'M12 14l3.5-3.5M20.2 15.5a8 8 0 1 0-16.4 0',
    skull: 'M12 2a8 8 0 0 0-8 8c0 2.9 1.6 5.4 4 6.8V20a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3.2c2.4-1.4 4-3.9 4-6.8a8 8 0 0 0-8-8zM9 11h.01M15 11h.01',
    repair: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
    power: 'M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10',
    radio: 'M4.9 19.1A10 10 0 0 1 4.9 4.9M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4M19.1 4.9a10 10 0 0 1 0 14.2M12 12h.01',
    swap: 'M3 8h15l-4-4M21 16H6l4 4',
    refresh: 'M21 12a9 9 0 1 1-2.6-6.4M21 3.5V9h-5.5',
    expand: 'M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3',
    chevronLeft: 'M15 18l-6-6 6-6',
    chevronRight: 'M9 6l6 6-6 6',
} as const;
type IconName = keyof typeof ICON_PATHS;
const Icon: React.FC<{ name: IconName; className?: string; strokeWidth?: number }> = ({
    name,
    className = 'w-4 h-4',
    strokeWidth = 2,
}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
        strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
        <path d={ICON_PATHS[name]} />
    </svg>
);

// =====================
// 标签与格式化
// =====================
const ATTR_LABEL: Record<AttributeType, string> = {
    strength: '力量', agility: '敏捷', wisdom: '智慧', perception: '感知', spiritual: '灵性',
};
const DYNAMIC_VITAL_LABEL: Record<DynamicVitalType, string> = {
    hp: '生命', sanity: '理智', stamina: '体力', vigor: '精力',
};
const VITAL_LABEL: Record<VitalType, string> = {
    maxHp: '生命上限', maxSanity: '理智上限', maxStamina: '体力上限', maxVigor: '精力上限',
};
const TARGET_LABEL: Record<Target, string> = {
    self: '自身', single_teammate: '单个队友', all_teammates: '所有队友', single_ally: '单个友方',
    all_allies: '所有友方', enemy: '敌方目标', all_enemies: '所有敌方', none: '无目标',
};
const RESULT_LABEL: Record<string, string> = {
    miss: '未中', graze: '擦伤', hit: '命中', crit: '暴击', dodge: '闪避', fail: '失效', partial: '部分',
};
const RESULT_COLOR: Record<string, string> = {
    miss: 'text-[#6d7b8a] bg-[#080d15] border-[#2a3542]',
    graze: 'text-[#ffd0c2] bg-[#3a1a12]/70 border-[#ff9b7d]/50',
    hit: 'text-[#ffb9a6] bg-[#43100b]/70 border-[#ff7d5e]/60',
    crit: 'text-[#ffe6b0] bg-[#3d2a06]/75 border-[#f0c05a]/70',
    dodge: 'text-[#cdeeff] bg-[#0a2735]/75 border-[#8fd6f7]/60',
    fail: 'text-[#6d7b8a] bg-[#080d15] border-[#2a3542]',
    partial: 'text-[#e6cffb] bg-[#2a1240]/75 border-[#c28df5]/60',
};
const WEAPON_LABEL: Record<WeaponType, string> = {
    magic: '法术', sniper_rifle: '狙击步枪', assault_rifle: '突击步枪', smg: '冲锋枪',
    pistol: '手枪', shotgun: '霰弹枪', sawed_off: '短管霰弹枪', crossbow: '弩',
    throw: '投掷', bow: '弓', wave: '挥动', both_wave: '双手挥动', prick: '刺击', both_prick: '双手刺击',
};
const INTENT_META: Record<IntentType, { icon: IconName; label: string; en: string; className: string }> = {
    attack: { icon: 'sword', label: '攻击', en: '强攻', className: 'border-[#ff7d5e]/70 text-[#ffc4b0] bg-[#43100b]/60' },
    defense: { icon: 'shield', label: '防御', en: '守御', className: 'border-[#8fd6f7]/60 text-[#cdeeff] bg-[#0a2735]/60' },
    buff: { icon: 'buff', label: '增益', en: '增幅', className: 'border-[#4bd6a5]/60 text-[#b6f5dd] bg-[#04241b]/60' },
    debuff: { icon: 'debuff', label: '减益', en: '侵蚀', className: 'border-[#c28df5]/60 text-[#e6cffb] bg-[#2a1240]/60' },
    observe: { icon: 'eye', label: '观察', en: '观测', className: 'border-[#8ea3b8]/50 text-[#d2dee8] bg-[#131c26]/70' },
};
/** 接近意图：攻击意图的自动前置——射程内无目标时先向选定目标逼近。 */
const APPROACH_META: { icon: IconName; label: string; en: string; className: string } = {
    icon: 'wind', label: '接近', en: '逼近', className: 'border-[#f0c05a]/60 text-[#ffe6b0] bg-[#3d2a06]/60',
};
/** 解析意图展示元数据：接近意图优先显示「接近」。 */
const resolveIntentMeta = (intent: CombatIntent) =>
    intent.approach ? APPROACH_META : INTENT_META[intent.type];
const SPECIAL_EFFECT_LABEL: Record<string, string> = {
    sheild: '偏转矩阵', heal_hp: '生命恢复', heal_sanity: '理智恢复', heal_stamina: '体力恢复',
    heal_vigor: '精力恢复', restore_battery: '电池修复', repair_integrity: '完整性修复', ap_reduce: '行动点削减',
};
const STATUS_META: Partial<Record<ActionEffectType, { icon: IconName; label: string; tone: 'buff' | 'debuff' | 'neutral' }>> = {
    shield: { icon: 'shield', label: '偏转矩阵', tone: 'buff' },
    heal_hp: { icon: 'heart', label: '生命再生', tone: 'buff' },
    heal_sanity: { icon: 'brain', label: '理智再生', tone: 'buff' },
    heal_stamina: { icon: 'drop', label: '体力再生', tone: 'buff' },
    heal_vigor: { icon: 'bolt', label: '精力再生', tone: 'buff' },
    restore_battery: { icon: 'power', label: '电池修复', tone: 'buff' },
    repair_integrity: { icon: 'repair', label: '完整性修复', tone: 'buff' },
    ap_reduce: { icon: 'gauge', label: '行动点削减', tone: 'debuff' },
    strength: { icon: 'power', label: '力量', tone: 'neutral' },
    agility: { icon: 'wind', label: '敏捷', tone: 'neutral' },
    wisdom: { icon: 'brain', label: '智慧', tone: 'neutral' },
    perception: { icon: 'target', label: '感知', tone: 'neutral' },
    spiritual: { icon: 'spark', label: '灵性', tone: 'neutral' },
    maxHp: { icon: 'heart', label: '生命上限', tone: 'neutral' },
    maxSanity: { icon: 'brain', label: '理智上限', tone: 'neutral' },
    maxStamina: { icon: 'drop', label: '体力上限', tone: 'neutral' },
    maxVigor: { icon: 'bolt', label: '精力上限', tone: 'neutral' },
};
const DEFENSE_RESULT_META: Record<DefenseResult[0], { label: string; className: string }> = {
    dodge: { label: '闪避', className: 'border-[#8fd6f7]/70 text-[#cdeeff] bg-[#0a2735]/75' },
    partial: { label: '减伤', className: 'border-[#c28df5]/70 text-[#e6cffb] bg-[#2a1240]/75' },
    fail: { label: '失效', className: 'border-[#3a4655] text-[#7e8f9f] bg-[#080d15]/80' },
};

const formatNumber = (value: number): string => {
    const n = safeNumber(value);
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
};
const effectTypeLabel = (type: string): string => {
    if (isAttributeType(type)) return ATTR_LABEL[type];
    if (isDynamicVitalType(type)) return DYNAMIC_VITAL_LABEL[type];
    if (isVitalType(type)) return VITAL_LABEL[type];
    return SPECIAL_EFFECT_LABEL[type] ?? type;
};
const getTacticEffects = (tactic: Tactic): AnyTacticEffect[] => (tactic.tacticEffect ?? []) as AnyTacticEffect[];
const formatTacticEffect = (effect: AnyTacticEffect): string => {
    const target = effect[0];
    const type = effect[1];
    const value = safeNumber(effect[2]);
    const duration = effect.length === 4 ? (effect as [Target, AttributeType, number, number])[3] : undefined;
    const sign = value >= 0 ? '+' : '';
    const durationText = duration && duration > 0 ? `/${duration}T` : '';
    return `${TARGET_LABEL[target]} · ${effectTypeLabel(type)} ${sign}${formatNumber(value)}${durationText}`;
};
const getManualTargetMode = (tactic: Tactic): ManualTargetMode => {
    if (tactic.type === 'attack') return 'enemy';
    for (const effect of getTacticEffects(tactic)) {
        const target = effect[0];
        if (target === 'enemy' || target === 'all_enemies') return 'enemy';
        if (target === 'single_ally') return 'single_ally';
        if (target === 'single_teammate') return 'single_teammate';
    }
    return null;
};
const getAllyTargetId = (ally: { id: string }, idx: number): string => (idx === 0 ? 'player' : ally.id);
const getEnemyTargetId = (enemy: CombatEnemy): string => enemy.instanceId || enemy.id;
const toneClass = (tone: 'buff' | 'debuff' | 'neutral'): string => {
    if (tone === 'buff') return 'border-[#4bd6a5]/65 text-[#b6f5dd] bg-[#04241b]/85';
    if (tone === 'debuff') return 'border-[#ff7d5e]/65 text-[#ffc4b0] bg-[#3a0f0b]/85';
    return 'border-[#8fd6f7]/40 text-[#cdeeff] bg-[#0a1a26]/85';
};

// =====================
// 复用：四角 HUD 括弧（贴父容器四角，无切角缺口）
// =====================
const HudCorners: React.FC<{ dead?: boolean; className?: string }> = ({ dead, className = '' }) => {
    const c = dead ? 'border-[#3a4655]' : 'border-[#ff7d5e]/75 drop-shadow-[0_0_6px_rgba(255,125,94,0.5)]';
    return (
        <>
            <span className={`absolute top-2 left-2 w-7 h-7 border-t border-l z-30 pointer-events-none ${c} ${className}`} />
            <span className={`absolute top-2 right-2 w-7 h-7 border-t border-r z-30 pointer-events-none ${c} ${className}`} />
            <span className={`absolute bottom-2 left-2 w-7 h-7 border-b border-l z-30 pointer-events-none ${c} ${className}`} />
            <span className={`absolute bottom-2 right-2 w-7 h-7 border-b border-r z-30 pointer-events-none ${c} ${className}`} />
        </>
    );
};

// =====================
// 复用：面板外壳（标题栏 + 氛围表面 + 角标，使剩余空间成为有质感的 HUD 表面）
// =====================
const PanelShell: React.FC<{
    /** 标题；缺省时不渲染标题栏（用于压缩垂直空间的面板）。 */
    title?: string;
    accent?: 'cyan' | 'red';
    right?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}> = ({ title, accent = 'cyan', right, children, className = '' }) => {
    const isRed = accent === 'red';
    const accentText = isRed ? 'text-[#ffab93]' : 'text-[#9fdcf7]';
    const accentLine = isRed ? 'via-[#ff7d5e]/40' : 'via-[#8fd6f7]/40';
    return (
        <div className={`relative flex flex-col min-h-0 lg:h-full surf-panel hud-ticks overflow-hidden ${isRed ? 'hud-ticks--ember' : ''} ${className}`}>
            <div className="absolute inset-0 bg-grid-tech opacity-30 pointer-events-none" />
            <div className="absolute inset-0 hud-hatch opacity-60 pointer-events-none" />
            <div className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(ellipse 90% 46% at 50% 0%, ${isRed ? 'rgba(255,125,94,0.08)' : 'rgba(63,169,214,0.09)'}, transparent 70%)` }} />
            <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${accentLine} to-transparent pointer-events-none`} />
            {(title || right) && (
                <div className="relative shrink-0 flex items-center gap-2.5 px-3 h-9 border-b border-[rgba(126,156,182,0.2)] bg-black/35">
                    <span className={`hud-led ${isRed ? 'hud-led--ember' : 'hud-led--ice'}`} />
                    {title && <span className={`${accentText} font-display text-[10.5px] font-bold tracking-[0.32em] whitespace-nowrap`}>{title}</span>}
                    <span className="flex-1 h-px hud-hairline opacity-40" />
                    {right}
                </div>
            )}
            <div className="relative flex-1 min-h-0 flex flex-col">{children}</div>
        </div>
    );
};

// =====================
// 基础 UI 子组件（直角化，适配无缝拼接）
// =====================
const VitalBar: React.FC<{
    current: number; max: number; shield?: number; fillClass: string; heightClass?: string; buffered?: boolean;
    /** 叠加 25/50/75% 档位刻线（血量条用，便于一眼判断档位）。 */
    ticks?: boolean;
}> = ({ current, max, shield = 0, fillClass, heightClass = 'h-2.5', buffered = true, ticks = false }) => {
    const pct = getPercent(current, max);
    const shieldPct = Math.min(100, (safeNumber(shield) / Math.max(1, safeNumber(max))) * 100);
    const [display, setDisplay] = useState(pct);
    const [buffer, setBuffer] = useState(pct);
    useEffect(() => {
        setDisplay(pct);
        const timer = setTimeout(() => setBuffer(pct), 520);
        return () => clearTimeout(timer);
    }, [pct]);
    return (
        <div className={`relative w-full ${heightClass} hud-meter border border-[rgba(126,156,182,0.28)] overflow-hidden`}>
            {buffered && (
                <div className="absolute inset-y-0 left-0 bg-[#e9f2f8]/25 transition-all duration-700 ease-out" style={{ width: `${buffer}%` }} />
            )}
            <div className={`absolute inset-y-0 left-0 ${fillClass} transition-all duration-300 ease-out`} style={{ width: `${display}%` }} />
            {shieldPct > 0 && (
                <div className="absolute inset-y-0 left-0 bg-[#7fd2f5]/45 border-r border-[#cfeeff] transition-all duration-300"
                    style={{ width: `${shieldPct}%` }} title={`护盾 ${formatNumber(shield)}`} />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-white/12 via-transparent to-black/35 pointer-events-none" />
            <div className="absolute inset-0 hud-meter-seg pointer-events-none opacity-80" />
            {ticks && <div className="absolute inset-0 hud-meter-ticks pointer-events-none opacity-70" />}
        </div>
    );
};

const MiniBar: React.FC<{ label: string; current: number; max: number; fillClass: string }> = ({ label, current, max, fillClass }) => {
    const safeMax = safeNumber(max);
    if (safeMax <= 0) return null;
    return (
        <div className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-[8.5px] font-mono font-bold text-[#77879a] uppercase tracking-[0.14em]">{label}</span>
            <div className="flex-1 min-w-0">
                <VitalBar current={current} max={safeMax} fillClass={fillClass} heightClass="h-[5px]" buffered={false} />
            </div>
            <span className="w-[62px] shrink-0 text-right text-[10px] font-mono text-[#c3d3e0] tabular">
                {formatNumber(current)}<span className="text-[#5f6e7e]">/</span>{formatNumber(safeMax)}
            </span>
        </div>
    );
};

const ResultSequenceBar: React.FC<{ label: string; results: AttackResult[] | DefenseResult[] }> = ({ label, results }) => {
    if (!results.length) return null;
    return (
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar max-w-full">
            <span className="w-8 shrink-0 text-[9px] font-mono font-bold text-[#8ea3b8] tracking-[0.18em]">{label}</span>
            <div className="flex gap-1 shrink-0">
                {results.map(([type, value], i) => (
                    <span key={i}
                        className={`inline-flex items-center gap-0.5 px-1.5 py-[3px] text-[9px] font-mono font-bold border transition-transform duration-150 hover:scale-110 ${i === 0 ? 'ring-1 ring-[#e9f2f8]/70 brightness-125 shadow-[0_0_10px_rgba(233,242,248,0.25)]' : 'opacity-80'} ${RESULT_COLOR[type] ?? 'text-[#6d7b8a] bg-[#080d15] border-[#2a3542]'}`}
                        title={`#${i + 1} ${type} ${formatNumber(value)}${i === 0 ? '（下一次消费）' : ''}`}>
                        {RESULT_LABEL[type] ?? type}{value > 0 ? formatNumber(value) : ''}
                    </span>
                ))}
            </div>
        </div>
    );
};

const PendingDefenseBar: React.FC<{ list: DefenseResult[] }> = ({ list }) => {
    if (!list.length) return null;
    return (
        <div className="relative flex flex-col gap-1 border border-[#8fd6f7]/25 bg-[#0a1a26]/50 p-1.5 overflow-hidden">
            <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#8fd6f7]/60" />
            <div className="flex items-center justify-between pl-1.5">
                <span className="text-[8.5px] font-mono font-bold text-[#9fdcf7] tracking-[0.24em]">已布防</span>
                <span className="text-[10px] font-mono text-[#c3d3e0] tabular">{list.length}<span className="text-[#5f6e7e]">/3</span></span>
            </div>
            <div className="flex flex-wrap gap-1 pl-1.5">
                {list.map(([type, value], i) => {
                    const meta = DEFENSE_RESULT_META[type];
                    return (
                        <span key={i} className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono font-bold border ${meta.className}`}
                            title={`第 ${i + 1} 层 · 受击时按序消费`}>
                            <span className="text-[#7e8f9f] tabular">{i + 1}</span>{meta.label}{type === 'partial' ? formatNumber(value) : ''}
                        </span>
                    );
                })}
            </div>
        </div>
    );
};

const ApPips: React.FC<{ current: number; base: number; advanced: number; sizeClass?: string }> = ({
    current, base, advanced, sizeClass = 'w-3 h-3',
}) => {
    const pipCount = Math.max(1, Math.ceil(Math.max(base, current)));
    return (
        <div className="flex items-center gap-1.5">
            <span className="text-[8.5px] font-mono font-bold text-[#77879a] tracking-[0.18em]">行动</span>
            <div className="flex gap-1">
                {Array.from({ length: pipCount }, (_, i) => (
                    <span key={i}
                        className={`${sizeClass} rotate-45 border transition-all duration-300 ${i < current
                            ? 'bg-[#8fd6f7] border-[#d6f1ff] shadow-[0_0_9px_rgba(143,214,247,0.95)]'
                            : 'bg-[#0a1119] border-[#39485a]'}`} />
                ))}
            </div>
            {advanced > 0 && <span className="text-[9px] font-mono font-bold text-[#ff9b7d] tabular">-{formatNumber(advanced)}</span>}
        </div>
    );
};

/** 单个蓄反槽（「owner × trigger」对）的展示数据：槽与槽独立结算，不跨槽合并。 */
interface CounterSlot { triggerId: string; value: number; triggerName?: string }

/** 汇总某单位持有的全部蓄反槽（按 owner 过滤，槽值互不合并）。 */
const getCounterSlots = (
    entries: CombatDynamicState['accumulateCounter'] | undefined,
    ownerId: string,
    nameOf: (triggerId: string) => string | undefined
): CounterSlot[] =>
    (entries ?? [])
        .filter((entry) => entry.ownerId === ownerId)
        .map((entry) => ({
            triggerId: entry.triggerId,
            value: Math.max(0, safeNumber(entry.value)),
            triggerName: nameOf(entry.triggerId),
        }));

/** 单槽计量：每 5 点一个实心格，余数按比例半填。 */
const CounterSlotGauge: React.FC<{ slot: CounterSlot }> = ({ slot }) => {
    const value = Math.max(0, slot.value);
    const charges = Math.floor(value / 5);
    const remainder = (value % 5) / 5;
    const label = slot.triggerName ?? slot.triggerId;
    return (
        <div className="flex items-center gap-1.5" title={`对「${label}」的蓄反值 ${formatNumber(value)}｜槽独立：每 5 点可预支 1 行动点`}>
            <span className="text-[8.5px] font-mono font-bold text-[#d3b0fa] tracking-[0.18em]">蓄反</span>
            <div className="flex gap-0.5">
                {Array.from({ length: Math.max(1, charges + (remainder > 0 ? 1 : 0)) }, (_, i) => (
                    <span key={i} className="relative w-2.5 h-2.5 border border-[#c28df5]/75 bg-[#0a0713] overflow-hidden">
                        {i < charges ? (
                            <span className="absolute inset-0 bg-[#c28df5] shadow-[0_0_9px_rgba(194,141,245,0.95)]" />
                        ) : (
                            <span className="absolute inset-y-0 left-0 bg-[#c28df5]/60" style={{ width: `${remainder * 100}%` }} />
                        )}
                    </span>
                ))}
            </div>
            <span className="text-[10px] font-mono font-bold text-[#e6cffb] tabular">{formatNumber(value)}</span>
        </div>
    );
};

/** 蓄反槽列表：每个槽独立展示（无有效槽时显示空态）。 */
const CounterGauge: React.FC<{ slots: CounterSlot[] }> = ({ slots }) => {
    const visible = slots.filter((slot) => slot.value > 0);
    if (visible.length === 0) return <span className="text-[9px] font-mono text-[#5f6e7e]">蓄反 0</span>;
    return (
        <div className="flex items-center gap-2 flex-wrap">
            {visible.map((slot) => (
                <CounterSlotGauge key={slot.triggerId} slot={slot} />
            ))}
        </div>
    );
};

interface FloatingItem { id: number; type: 'damage' | 'heal' | 'block'; value: string; }
/**
 * 追踪生命 / 护盾变化，产出浮动数值与「受击脉冲」计数。
 * damageTick 每次递增即触发一次受击闪光（以 key 重挂载一次性动画元素实现）。
 */
const useValueFloat = (hp: number, shield: number): { items: FloatingItem[]; damageTick: number } => {
    const [items, setItems] = useState<FloatingItem[]>([]);
    const [damageTick, setDamageTick] = useState(0);
    const prevHp = useRef<number | null>(null);
    const prevShield = useRef<number | null>(null);
    useEffect(() => {
        if (prevHp.current !== null && prevShield.current !== null) {
            const dHp = hp - prevHp.current;
            const dShield = shield - prevShield.current;
            const added: FloatingItem[] = [];
            if (dHp < 0) {
                added.push({ id: Date.now() + Math.random(), type: 'damage', value: `-${formatNumber(Math.abs(dHp))}` });
                setDamageTick((t) => t + 1);
            } else if (dHp > 0) {
                added.push({ id: Date.now() + Math.random(), type: 'heal', value: `+${formatNumber(dHp)}` });
            }
            if (dShield > 0) added.push({ id: Date.now() + Math.random(), type: 'block', value: `护盾 +${formatNumber(dShield)}` });
            if (added.length) {
                setItems((prev) => [...prev.slice(-2), ...added]);
                const ids = new Set(added.map((a) => a.id));
                setTimeout(() => setItems((prev) => prev.filter((i) => !ids.has(i.id))), 1200);
            }
        }
        prevHp.current = hp;
        prevShield.current = shield;
    }, [hp, shield]);
    return { items, damageTick };
};

/**
 * 检测滚动容器在两个轴向上的溢出，用于给出「还有内容」的渐隐提示。
 * signal 变化时重新测量并重新挂载子元素观察（内容增删后仍准确）。
 */
const useOverflow = <T extends HTMLElement>(signal: unknown): [React.RefObject<T | null>, { x: boolean; y: boolean }] => {
    const ref = useRef<T | null>(null);
    const [state, setState] = useState({ x: false, y: false });
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const check = () => {
            const x = el.scrollWidth - el.clientWidth > 4;
            const y = el.scrollHeight - el.clientHeight > 4;
            setState((prev) => (prev.x === x && prev.y === y ? prev : { x, y }));
        };
        check();
        const ro = new ResizeObserver(check);
        ro.observe(el);
        for (const child of Array.from(el.children)) ro.observe(child);
        return () => ro.disconnect();
    }, [signal]);
    return [ref, state];
};

const FloatingEvents: React.FC<{ items: FloatingItem[] }> = ({ items }) => {
    if (!items.length) return null;
    return (
        <div className="absolute inset-0 pointer-events-none overflow-visible z-40">
            {items.map((item, index) => {
                const color = item.type === 'damage' ? 'text-red-400 text-5xl' : item.type === 'heal' ? 'text-emerald-300 text-4xl' : 'text-sky-200 text-3xl';
                return (
                    <div key={item.id}
                        className={`absolute left-1/2 font-black font-display tracking-tight whitespace-nowrap animate-damage-float ${color}`}
                        style={{ top: `${26 + index * 9}%` }}>
                        {item.value}
                    </div>
                );
            })}
        </div>
    );
};

const StatusBadges: React.FC<{ status?: CombatDynamicState['status']; size?: 'sm' | 'md' }> = ({ status = [], size = 'md' }) => {
    if (!status.length) return null;
    const box = size === 'md' ? 'w-9 h-9' : 'w-7 h-7';
    const icon = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
    return (
        <div className="flex flex-wrap gap-1.5">
            {status.map((item, index) => {
                const meta = STATUS_META[item.type];
                const val = safeNumber(item.value);
                let tone: 'buff' | 'debuff' | 'neutral' = meta?.tone ?? 'neutral';
                if (item.type === 'shield' || String(item.type).startsWith('heal_')) tone = 'buff';
                else if (val < 0) tone = 'debuff';
                const tooltip = `${meta?.label ?? effectTypeLabel(item.type)}｜数值 ${formatNumber(val)}｜剩余 ${item.duration ?? 0}T${item.sourceName ? `｜来源 ${item.sourceName}` : ''}`;
                return (
                    <div key={`${item.type}_${index}`} title={tooltip}
                        className={`${box} clip-notch flex items-center justify-center border backdrop-blur-sm cursor-help transition-transform duration-200 hover:scale-110 ${toneClass(tone)}`}>
                        <Icon name={meta?.icon ?? 'alert'} className={icon} />
                    </div>
                );
            })}
        </div>
    );
};

// =====================
// 战场小地图：横向网格战线，单位以标记落在格子里（纯展示，交互仍走卡片）
// =====================
interface BattleGridUnit {
    id: string;
    label: string;
    pos: number;
    alive: boolean;
    /** 我方：是否当前行动单位；敌方：是否落在当前行动者射程内。 */
    highlighted: boolean;
}
const BattleGrid: React.FC<{
    lineMin: number;
    lineMax: number;
    allies: BattleGridUnit[];
    enemies: BattleGridUnit[];
    /** 当前行动者射程覆盖的格子区间（含端点），用于铺一条“适宜距离”光带。 */
    rangeBand?: { from: number; to: number };
}> = ({ lineMin, lineMax, allies, enemies, rangeBand }) => (
    <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 px-0.5">
            <span className="text-[8.5px] font-mono font-bold text-[#9fdcf7] tracking-[0.24em] whitespace-nowrap">战线</span>
            <span className="text-[8px] font-mono text-[#5f6e7e] tracking-[0.14em] whitespace-nowrap">我方 ← | → 敌对</span>
            <span className="flex-1 h-px hud-hairline opacity-25" />
            {rangeBand && rangeBand.from === lineMin && rangeBand.to === lineMax && (
                <span className="text-[8px] font-mono text-[#4bd6a5] tracking-[0.14em] whitespace-nowrap">射程 · 无限</span>
            )}
        </div>
        <div className="flex gap-px">
            {Array.from({ length: lineMax - lineMin + 1 }, (_, k) => {
                const i = lineMin + k;
                const here = [
                    ...allies.filter((u) => u.pos === i).map((u) => ({ ...u, side: 'ally' as const })),
                    ...enemies.filter((u) => u.pos === i).map((u) => ({ ...u, side: 'enemy' as const })),
                ];
                const inBand = rangeBand ? i >= rangeBand.from && i <= rangeBand.to : false;
                return (
                    <div key={i}
                        className={`relative flex-1 min-w-0 h-8 border ${inBand
                            ? 'border-[#4bd6a5]/40 bg-[#071b17]'
                            : i <= 0
                                ? 'border-[#3fa9d6]/25 bg-[#071019]'
                                : 'border-[#ff7d5e]/20 bg-[#140708]'}`}>
                        {i % 6 === 0 && (
                            <span className="absolute top-px left-px text-[6px] leading-none font-mono text-[#4d5b6a] tabular">{i}</span>
                        )}
                        <div className="absolute inset-x-0 bottom-0.5 flex flex-wrap items-center justify-center gap-px px-px">
                            {here.map((u) => (
                                <span key={u.id} title={u.label}
                                    className={`w-[5px] h-[5px] shrink-0 ${u.side === 'ally'
                                        ? u.highlighted ? 'bg-[#a5e6ff] ring-1 ring-[#8fd6f7]' : 'bg-[#3fa9d6]/85'
                                        : u.highlighted ? 'bg-[#ff9b7d] ring-1 ring-[#ff7d5e]' : 'bg-[#d9483a]/75'
                                        } ${u.alive ? '' : 'opacity-25'}`} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
);

// =====================
// 敌方：迷你卡片（轨道，flex-1 均分铺满整行，直角紧贴）
// =====================
const EnemyMiniCard: React.FC<{
    enemy: CombatEnemy; index: number; intent: CombatIntent | null; isFocused: boolean; isSelectable: boolean; guardCount: number; onClick: () => void;
    /** 蓄反槽（owner × trigger，槽与槽独立结算）。 */
    counterSlots: CounterSlot[];
    /** 与当前行动单位的战线距离。 */
    distance?: number;
    /** 当前行动单位的武器射程（用于判断距离是否可及）。 */
    range?: number;
    /** 选中攻击战术且目标超距时置亮「超距」标记。 */
    outOfRange?: boolean;
}> = ({ enemy, index, intent, isFocused, isSelectable, guardCount, counterSlots, onClick, distance, range, outOfRange }) => {
    const hp = safeNumber(enemy.hp);
    const maxHp = Math.max(1, safeNumber(enemy.maxHp));
    const shield = safeNumber(enemy.shield);
    const isDead = enemy.isDead || hp <= 0;
    const activeCounterSlots = counterSlots.filter((slot) => slot.value > 0);
    const intentMeta = intent ? resolveIntentMeta(intent) : undefined;
    const cardClass = isDead
        ? 'surf-card--dead border-[#1e2836] opacity-40 grayscale cursor-not-allowed'
        : isSelectable
            ? 'surf-card--lock border-[#ff7d5e] shadow-[inset_0_0_26px_rgba(255,125,94,0.25)] cursor-crosshair animate-pulse-glow'
            : isFocused
                ? 'surf-card--focus border-[#8fd6f7]/80 shadow-[inset_0_0_22px_rgba(63,169,214,0.22)] cursor-pointer'
                : 'surf-card border-[rgba(126,156,182,0.2)] hover:border-[#8fd6f7]/60 cursor-pointer';
    return (
        <div onClick={onClick} className={`group card-lift relative flex-1 min-w-[178px] overflow-hidden border ${cardClass}`}>
            <div className="absolute inset-0 hud-hatch opacity-50 pointer-events-none" />
            {/* 聚焦指示：底缘常驻扫描线，让「当前锁定目标」在静帧下也一眼可辨 */}
            {isFocused && !isDead && (
                <span className="pointer-events-none absolute bottom-0 left-0 right-0 h-px overflow-hidden z-20">
                    <span className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[#8fd6f7] to-transparent animate-sweep-x" />
                </span>
            )}
            {/* 同 AllyCard：横幅入流，避免绝对定位盖住卡片首行内容 */}
            {isSelectable && !isDead && (
                <div className="relative z-30 bg-[#ff7d5e] text-[#1a0603] text-[8px] py-[3px] text-center font-display font-bold tracking-[0.28em]">目标锁定</div>
            )}
            <div className="relative p-2.5">
                <div className="flex items-start gap-2.5">
                    <div className="relative w-11 h-11 shrink-0 overflow-hidden border border-[rgba(255,125,94,0.35)] bg-[#05080d]">
                        {enemy.imageUrl ? (
                            <img src={enemy.imageUrl} alt={enemy.name} className="w-full h-full object-cover opacity-85 contrast-[1.08] saturate-[0.9]" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#ff7d5e]/60 font-black font-display text-base bg-grid-tech">{(enemy.name ?? '?').slice(0, 1)}</div>
                        )}
                        <span className="absolute inset-0 bg-gradient-to-t from-[#05080d] to-transparent opacity-70 pointer-events-none" />
                        <span className="absolute bottom-0 left-0 right-0 h-px bg-[#ff7d5e]/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className={`text-[13px] font-display font-bold truncate tracking-[0.05em] ${isDead ? 'text-[#5f6e7e]' : 'text-[#ffd9cd]'}`}>{enemy.name}</span>
                            {isFocused && !isDead && <span className="shrink-0 text-[7.5px] font-mono px-1 py-px border border-[#8fd6f7]/70 text-[#cdeeff] bg-[#0a2735]/80">焦点</span>}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap font-mono text-[9.5px] text-[#96a7b8] tabular">
                            <span><span className="text-[#5f6e7e]">速度</span> {formatNumber(enemy.speed)}</span>
                            <span className="w-px h-2.5 bg-[rgba(126,156,182,0.3)]" />
                            <span><span className="text-[#5f6e7e]">攻击</span> {formatNumber(enemy.baseAttack)}</span>
                            <span className="w-px h-2.5 bg-[rgba(126,156,182,0.3)]" />
                            <span title="行动点：当前 / 基础"><span className="text-[#5f6e7e]">行动</span> {formatNumber(Math.max(0, enemy.actionPoint.current))}<span className="text-[#5f6e7e]">/{formatNumber(enemy.actionPoint.base)}</span></span>
                            {typeof distance === 'number' && (<>
                                <span className="w-px h-2.5 bg-[rgba(126,156,182,0.3)]" />
                                <span className={typeof range === 'number' && (range === 0 || distance <= range) ? 'text-[#4bd6a5]' : 'text-[#ff9b7d]'}>
                                    距 {formatNumber(distance)}
                                </span>
                            </>)}
                        </div>
                    </div>
                    <span className="shrink-0 font-mono text-[8px] tracking-[0.14em] text-[#4d5b6a]">敌-{String(index + 1).padStart(2, '0')}</span>
                </div>

                <div className="mt-2.5 flex items-center gap-2">
                    <span className="shrink-0 text-[8.5px] font-mono font-bold text-[#77879a] tracking-[0.18em]">生命</span>
                    <div className="flex-1 min-w-0">
                        <VitalBar current={hp} max={maxHp} shield={shield} ticks
                            fillClass="bg-gradient-to-r from-[#7d1f18] via-[#d9483a] to-[#ff9b7d] shadow-[0_0_10px_rgba(217,72,58,0.6)]"
                            heightClass="h-[7px]" />
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-[#dbe8f2] tabular">
                        {formatNumber(hp)}<span className="text-[#5f6e7e]">/{formatNumber(maxHp)}</span>
                    </span>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2 border-t border-[rgba(126,156,182,0.16)] pt-2">
                    {intent && intentMeta && !isDead ? (
                        <span className={`inline-flex items-center gap-1.5 px-1.5 py-[3px] border text-[9px] font-mono font-bold tracking-wider min-w-0 ${intentMeta.className}`}>
                            <Icon name={intentMeta.icon} className="w-3 h-3 shrink-0" />
                            <span className="truncate">{intentMeta.label}</span>
                            {intent.type !== 'defense' && typeof intent.value !== 'undefined' && (
                                <span className="shrink-0 tabular text-[10px] brightness-125">{formatNumber(intent.value)}</span>
                            )}
                        </span>
                    ) : (
                        <span className="text-[9px] font-mono text-[#5f6e7e] tracking-wider">{isDead ? '信号丢失' : '— 无意图'}</span>
                    )}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {outOfRange && !isDead && (
                            <span className="px-1 py-px border border-[#ff9b7d]/60 bg-[#2a0d06]/70 text-[#ff9b7d] font-mono text-[8.5px] font-bold tracking-wider">超距</span>
                        )}
                        {guardCount > 0 && !isDead && (
                            <span className="px-1 py-px border border-[#8fd6f7]/70 bg-[#0a2735]/75 text-[#cdeeff] font-mono text-[8.5px] font-bold tabular animate-soft-blink">格挡×{guardCount}</span>
                        )}
                        {shield > 0 && <span className="flex items-center gap-0.5 text-[#cdeeff] font-mono text-[9px] font-bold tabular"><Icon name="shield" className="w-3 h-3" />{formatNumber(shield)}</span>}
                        {!isDead && (activeCounterSlots.length === 0 ? (
                            <span className="px-1 py-px border font-mono text-[8.5px] font-bold tabular border-[rgba(126,156,182,0.2)] bg-[#0a1119]/40 text-[#4d5b6a]"
                                title="未积累蓄反值">蓄反×0</span>
                        ) : (
                            activeCounterSlots.map((slot) => (
                                <span key={slot.triggerId}
                                    className="px-1 py-px border font-mono text-[8.5px] font-bold tabular border-[#c28df5]/60 bg-[#2a1240]/70 text-[#e6cffb]"
                                    title={`对「${slot.triggerName ?? slot.triggerId}」的蓄反值 ${formatNumber(slot.value)}｜槽独立：每 5 点可预支 1 行动点`}>
                                    蓄反×{formatNumber(slot.value)}
                                </span>
                            ))
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// =====================
// 敌方：焦点舞台（肖像 absolute 铺满中心格，铭牌渐变压底，无留白）
// =====================
const EnemyStageView: React.FC<{
    enemy: CombatEnemy; guardCount: number;
    /** 蓄反槽（owner × trigger，槽与槽独立结算）。 */
    counterSlots: CounterSlot[];
    onGenerateVisual?: (enemyAssetId?: string) => void;
    onRandomSwitchVisual?: (enemyAssetId: string, currentUrl?: string) => Promise<string | null> | string | null;
    isEnemyVisualGenerating?: (enemyAssetId: string) => boolean;
    /** 打开全屏欣赏层（由父组件承载，因为舞台本身被网格裁切无法覆盖全屏）。 */
    onOpenFullscreen?: () => void;
    /** 为 true 时屏蔽「点击展开」（例如战术正在等待选取目标，避免误触全屏）。 */
    blockExpand?: boolean;
    /** 与当前行动单位的战线距离。 */
    distance?: number;
    /** 当前行动单位的武器射程（用于判断距离是否可及）。 */
    range?: number;
}> = ({ enemy, guardCount, counterSlots, onGenerateVisual, onRandomSwitchVisual, isEnemyVisualGenerating, onOpenFullscreen, blockExpand = false, distance, range }) => {
    /**
     * 双标识：
     * - enemyId：战斗索引（实例 id），同型敌人必须区分；
     * - enemyAssetId：资产键（模板 id），同型敌人共享同一份立绘档案。
     */
    const enemyId = getEnemyTargetId(enemy);
    const enemyAssetId = enemy.id || enemy.instanceId;
    const isGeneratingVisual = Boolean(isEnemyVisualGenerating?.(enemyAssetId));
    const hp = safeNumber(enemy.hp);
    const maxHp = Math.max(1, safeNumber(enemy.maxHp));
    const shield = safeNumber(enemy.shield);
    const isDead = enemy.isDead || hp <= 0;
    const { items: floatingItems, damageTick } = useValueFloat(hp, shield);
    const ap = enemy.actionPoint;
    const hpPct = getPercent(hp, maxHp);
    // 资源存在但加载失败（路径损坏 / 视频误写入 imageUrl）时回落到扫描舱空态，
    // 而不是留一块空白让人以为「点了没反应」。
    const [imageBroken, setImageBroken] = useState(false);
    useEffect(() => { setImageBroken(false); }, [enemy.imageUrl]);
    const hasVisual = Boolean(enemy.imageUrl) && !imageBroken;
    // 与玩家肖像页一致：即使当前没有肖像，也允许「随机切换」去挂载档案中已存在的变体。
    const canRandomSwitch = Boolean(onRandomSwitchVisual);
    /** 有立绘时，点击舞台任意处即进入全屏欣赏（无需额外按钮）。 */
    const canExpand = Boolean(onOpenFullscreen) && hasVisual && !isDead && !blockExpand;
    return (
        <div
            onClick={canExpand ? onOpenFullscreen : undefined}
            className={`stage-enter group/stage relative w-full h-full min-h-[56vh] lg:min-h-0 flex flex-col overflow-hidden surf-panel hud-ticks hud-ticks--ember ${canExpand ? 'cursor-zoom-in' : ''}`}>
            {/* 肖像区：铺满，所有信息作为覆盖层 */}
            <div className="relative flex-1 min-h-0 overflow-hidden bg-[#03060b]">
                {/* 舱体结构层：壁面格栅 + 收容场侧光 + 侧壁刻度尺，无论有无肖像都常驻 */}
                <div className="absolute inset-0 bay-grille opacity-60 pointer-events-none" />
                <div className="absolute inset-0 bay-field pointer-events-none z-10" />
                <div className="absolute left-0 top-0 bottom-0 w-3 ruler-y pointer-events-none z-10" />
                <div className="absolute right-0 top-0 bottom-0 w-3 ruler-y ruler-y-r pointer-events-none z-10" />
                <div className="absolute inset-x-0 top-0 h-24 bay-edge-top pointer-events-none z-10" />

                {hasVisual ? (
                    <>
                        {/* 悬浮伸展：父层负责 hover 缩放，子层负责常驻镜头晃动，两层 transform 叠加 */}
                        <div className="absolute inset-0 transition-transform duration-[900ms] ease-out group-hover/stage:scale-[1.06]">
                            <img src={enemy.imageUrl} alt={enemy.name} onError={() => setImageBroken(true)}
                                className={`absolute inset-0 w-full h-full object-cover ${isDead
                                    ? 'grayscale opacity-30 animate-glitch'
                                    : 'opacity-90 contrast-[1.06] saturate-[0.95] portrait-drift'}`} />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#04070d] via-[#04070d]/15 to-[#04070d]/50 pointer-events-none" />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#04070d]/70 via-transparent to-[#04070d]/70 pointer-events-none" />
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_62%_52%_at_50%_44%,transparent,rgba(4,7,13,0.55))] pointer-events-none" />
                        {/* 收容场染色：把肖像压进舱体色温，避免「贴图感」 */}
                        <div className="absolute inset-0 bg-[#ff7d5e] opacity-[0.05] mix-blend-overlay pointer-events-none" />
                    </>
                ) : (
                    <>
                        {/* 未解析实体的扫描靶：三环 + 雷达扫掠扇区 + 方位刻度 */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="relative w-60 h-60 sm:w-72 sm:h-72 xl:w-96 xl:h-96">
                                <div className="stage-ring absolute inset-0 animate-spin-slow border-dashed opacity-70" />
                                <div className="stage-ring absolute inset-8 animate-spin-slow [animation-direction:reverse] opacity-45" />
                                <div className="stage-ring absolute inset-20 opacity-30" />
                                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,125,94,0.16),transparent_68%)]" />
                                <div className="radar-sweep absolute inset-0 rounded-full animate-spin-slow opacity-80" />
                                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                                    <span key={deg} className="absolute inset-0" style={{ transform: `rotate(${deg}deg)` }}>
                                        <span className={`absolute left-1/2 top-0 -translate-x-1/2 ${deg % 90 === 0 ? 'h-4 w-px bg-[#ff7d5e]/70' : 'h-2.5 w-px bg-[#ff7d5e]/35'}`} />
                                    </span>
                                ))}
                                <div className="absolute inset-0 flex items-center justify-center animate-reticle">
                                    <Icon name="radio" className="w-14 h-14 xl:w-16 xl:h-16 text-[#ff7d5e]/55" strokeWidth={1} />
                                </div>
                                <div className="absolute top-1/2 -left-6 -right-6 h-px bg-gradient-to-r from-transparent via-[#ff7d5e]/45 to-transparent" />
                                <div className="absolute left-1/2 -top-6 -bottom-6 w-px bg-gradient-to-b from-transparent via-[#ff7d5e]/45 to-transparent" />
                            </div>
                        </div>

                        {/* 舱壁遥测读数 */}
                        <div className="absolute top-14 left-6 z-10 space-y-1 pointer-events-none hidden sm:block">
                            <div className="font-mono text-[9px] text-[#5f6e7e] tracking-[0.18em]">扫描 <span className="text-[#ffab93]">进行中</span></div>
                            <div className="font-mono text-[9px] text-[#5f6e7e] tracking-[0.18em]">距离 <span className="text-[#96a7b8]">0.00</span></div>
                        </div>
                        <div className="absolute top-14 right-6 z-10 text-right space-y-1 pointer-events-none hidden sm:block">
                            <div className="font-mono text-[9px] text-[#5f6e7e] tracking-[0.18em]">生物信号 <span className="text-[#5f6e7e]">无</span></div>
                            <div className="font-mono text-[9px] text-[#5f6e7e] tracking-[0.18em]">质量 <span className="text-[#5f6e7e]">未知</span></div>
                        </div>

                        {/* 未解析标识（生成 / 切换按钮已移至顶部工具条） */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 pointer-events-none">
                            <span className="text-[10px] font-mono font-bold tracking-[0.42em] border border-[#ff7d5e]/60 px-5 py-1.5 bg-[#12040a]/85 text-[#ffab93] shadow-[0_0_24px_rgba(255,125,94,0.2)]">
                                {isDead ? '信号丢失' : '未知实体'}
                            </span>
                            {!isDead && onGenerateVisual && (
                                <span className="font-mono text-[9px] tracking-[0.2em] text-[#5f6e7e]">使用右上角工具条解析生物特征</span>
                            )}
                        </div>
                    </>
                )}

                {/* 舱体扫掠线：横跨整舱，强化「正在被扫描」的活性 */}
                <div className="absolute inset-x-0 h-16 bay-scan pointer-events-none z-10"
                    style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,125,94,0.06) 45%, rgba(255,125,94,0.18) 50%, rgba(255,125,94,0.06) 55%, transparent)' }} />
                <div className="noise-overlay absolute inset-0 opacity-[0.14] pointer-events-none" />
                {/* 濒死视效：色差收紧 + 搏动内描边，把「血量档位」直接写进画面 */}
                {!isDead && hpPct <= 30 && (
                    <div className="absolute inset-0 z-20 pointer-events-none portrait-critical" />
                )}
                {/* 可点击提示：悬浮时浮起一圈冷色内描边，替代已移除的全屏按钮 */}
                {canExpand && (
                    <div className="pointer-events-none absolute inset-0 z-20 opacity-0 group-hover/stage:opacity-100 transition-opacity duration-300"
                        style={{ boxShadow: 'inset 0 0 0 1px rgba(143,214,247,0.4), inset 0 0 70px rgba(63,169,214,0.12)' }} />
                )}
                <HudCorners dead={isDead} />

                {/* 顶部标识条 + 肖像工具条（小按钮常驻版面顶部，与玩家 / NPC 肖像页一致） */}
                <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between gap-3 px-3 py-2 bg-gradient-to-b from-[#04070d]/95 via-[#04070d]/45 to-transparent">
                    <div className="flex items-center gap-2 min-w-0 pointer-events-none">
                        <span className="hud-led hud-led--ember" style={isDead ? { color: '#4d5b6a' } : undefined} />
                        <span className="font-display text-[10px] font-bold tracking-[0.32em] text-[#ffab93] truncate">
                            焦点目标 <span className="text-[#ff7d5e]">//</span> <span className={isDead ? 'text-[#5f6e7e]' : 'text-[#ffd9cd]'}>{isDead ? '已失锁' : '已锁定'}</span>
                        </span>
                        <span className="hidden xl:inline font-mono text-[9px] text-[#5f6e7e] tabular tracking-[0.16em]">
                            信号 {isDead ? '无' : '在线'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {canRandomSwitch && !isDead && (
                            <button
                                onClick={(e) => { e.stopPropagation(); void onRandomSwitchVisual?.(enemyAssetId, enemy.imageUrl); }}
                                disabled={isGeneratingVisual}
                                title="随机切换已有肖像变体"
                                className="w-7 h-7 grid place-items-center border border-[#f0c05a]/45 text-[#f0c05a] bg-black/60 hover:border-[#f0c05a] hover:text-[#ffe6b0] hover:bg-[#2a1e04]/80 active:scale-90 transition-all disabled:opacity-40 disabled:pointer-events-none">
                                <Icon name="swap" className="w-3.5 h-3.5" />
                            </button>
                        )}
                        {onGenerateVisual && !isDead && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onGenerateVisual(enemyAssetId); }}
                                disabled={isGeneratingVisual}
                                title={hasVisual ? '重新生成肖像' : '解析生物特征并生成肖像'}
                                className={`w-7 h-7 grid place-items-center border bg-black/60 active:scale-90 transition-all disabled:pointer-events-none ${hasVisual
                                    ? 'border-[#8fd6f7]/45 text-[#8fd6f7] hover:border-[#8fd6f7] hover:text-[#d6f1ff] hover:bg-[#0a2735]/80'
                                    : 'border-[#8fd6f7]/80 text-[#cdeeff] shadow-[0_0_16px_rgba(143,214,247,0.35)] animate-soft-blink'}`}>
                                <Icon name="refresh" className={`w-3.5 h-3.5 ${isGeneratingVisual ? 'animate-spin-slow' : ''}`} />
                            </button>
                        )}
                    </div>
                </div>

                {/* 状态徽章 左上 */}
                <div className="absolute top-11 left-3.5 z-30 max-w-[40%]">
                    <StatusBadges status={enemy.status ?? []} />
                </div>
                {/* 护盾徽章 右上 */}
                {shield > 0 && !isDead && (
                    <div className="absolute top-11 right-3.5 z-30 clip-hex w-12 h-12 xl:w-14 xl:h-14 bg-[#0a2735]/95 border border-[#8fd6f7] shadow-[0_0_22px_rgba(143,214,247,0.5)] flex flex-col items-center justify-center animate-bounce-slow">
                        <Icon name="shield" className="w-3.5 h-3.5 text-[#cdeeff]" />
                        <span className="text-sm font-bold font-mono text-[#e9f2f8] tabular">{formatNumber(shield)}</span>
                    </div>
                )}

                <FloatingEvents items={floatingItems} />
                {damageTick > 0 && (
                    <span key={damageTick} className="pointer-events-none absolute inset-0 z-40 animate-damage-hit" />
                )}

                {/* 铭牌：渐变覆盖层压底，铺满宽度 */}
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 pt-14 bg-gradient-to-t from-[#04070d] via-[#04070d]/92 to-transparent z-20">
                    <div className="flex items-end justify-between gap-4">
                        <div className="min-w-0">
                            {/* leading-none 会让中文 Glyph 向下溢出压住下一行；改用 1.15 行高并加大行距 */}
                            <div className={`text-[26px] xl:text-[32px] leading-[1.15] font-display font-bold tracking-[0.1em] truncate ${isDead ? 'text-[#3a4655] line-through' : 'text-[#ffd9cd]'}`}>
                                {enemy.name}
                            </div>
                            <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 font-mono text-[11px] tabular">
                                <span className="text-[#5f6e7e]">速度</span><span className="text-[#dbe8f2]">{formatNumber(enemy.speed)}</span>
                                <span className="w-px h-3 bg-[rgba(126,156,182,0.3)]" />
                                <span className="text-[#5f6e7e]">攻击</span><span className="text-[#dbe8f2]">{formatNumber(enemy.baseAttack)}</span>
                                {typeof distance === 'number' && (<>
                                    <span className="w-px h-3 bg-[rgba(126,156,182,0.3)]" />
                                    <span className="text-[#5f6e7e]">距离</span>
                                    <span className={typeof range === 'number' && (range === 0 || distance <= range) ? 'text-[#4bd6a5]' : 'text-[#ff9b7d]'}>
                                        {formatNumber(distance)}{typeof range === 'number' ? <span className="text-[#5f6e7e]">/{range === 0 ? '∞' : formatNumber(range)}</span> : null}
                                    </span>
                                </>)}
                                {ap && (<>
                                    <span className="w-px h-3 bg-[rgba(126,156,182,0.3)]" />
                                    <span className="text-[#5f6e7e]">行动</span><span className="text-[#dbe8f2]">{formatNumber(Math.max(0, ap.current))}<span className="text-[#5f6e7e]">/{formatNumber(ap.base)}</span></span>
                                </>)}
                                {!isDead && (<>
                                    <span className="w-px h-3 bg-[rgba(126,156,182,0.3)]" />
                                    <CounterGauge slots={counterSlots} />
                                </>)}
                                {guardCount > 0 && !isDead && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-[#8fd6f7]/70 bg-[#0a2735]/75 text-[#cdeeff] font-mono text-[10px] font-bold tabular animate-soft-blink">
                                        <Icon name="shield" className="w-3 h-3" />格挡×{guardCount}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="text-right shrink-0 leading-none">
                            <span className={`font-display text-[42px] xl:text-[54px] font-bold tabular ${isDead ? 'text-[#39485a]' : 'text-white'}`}>{formatNumber(hp)}</span>
                            <span className="font-mono text-sm xl:text-base text-[#5f6e7e] tabular"> / {formatNumber(maxHp)}</span>
                        </div>
                    </div>
                    {/* 血条与大号生命数字之间保留 12px：数字用 leading-none，字形会向下溢出约 4px */}
                    <div className="mt-3">
                        <VitalBar current={hp} max={maxHp} shield={shield} ticks
                            fillClass="bg-gradient-to-r from-[#7d1f18] via-[#d9483a] to-[#ff9b7d] shadow-[0_0_16px_rgba(217,72,58,0.7)]" heightClass="h-3 xl:h-3.5" />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-4">
                        <CounterGauge slots={counterSlots} />
                        {/* 全屏入口已改为「点击舞台」，此处仅作悬浮时的可发现性提示（非按钮） */}
                        {canExpand && (
                            <span className="pointer-events-none flex items-center gap-1.5 font-mono text-[9px] tracking-[0.18em] text-[#96a7b8] opacity-0 group-hover/stage:opacity-100 transition-opacity duration-300">
                                <Icon name="expand" className="w-3 h-3" />点击全屏
                            </span>
                        )}
                        <span className="font-mono text-[10px] text-[#5f6e7e] tabular tracking-[0.18em]">完整度 {hpPct}%</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

/** 意图模块：紧贴焦点肖像下缘，铺满中心列宽，直角。defense 不显示预测值。 */
const IntentModule: React.FC<{ enemy: CombatEnemy; intent: CombatIntent | null; targetName?: string }> = ({ enemy, intent, targetName }) => {
    const meta = intent ? resolveIntentMeta(intent) : undefined;
    return (
        <div className="relative w-full surf-panel border-t border-[rgba(255,125,94,0.3)] p-3 sm:p-3.5 overflow-hidden">
            <div className="absolute inset-0 bg-grid-tech opacity-25 pointer-events-none" />
            <div className="absolute inset-0 hud-hatch opacity-50 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-px hud-hairline opacity-40 pointer-events-none" />
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#ff7d5e]/70" />
            <div className="relative flex items-center gap-2.5 text-[#ffab93] font-display text-[10px] font-bold tracking-[0.32em] mb-2.5">
                <span>敌方意图</span>
                <span className="flex-1 h-px hud-hairline opacity-25" />
                <span className="text-[#77879a] font-mono font-normal normal-case tracking-[0.12em] truncate">{enemy.name}</span>
            </div>
            {intent && meta ? (
                <div className="relative flex items-center gap-3">
                    <div className={`w-11 h-11 xl:w-12 xl:h-12 shrink-0 clip-hex flex items-center justify-center border ${meta.className}`}>
                        <Icon name={meta.icon} className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                            <span className="text-sm font-display font-bold tracking-[0.18em] text-[#e9f2f8]">{meta.label}</span>
                            <span className="text-[9px] font-mono text-[#5f6e7e] tracking-[0.2em]">{meta.en}</span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-[#96a7b8] font-mono truncate">{intent.desc}</div>
                    </div>
                    <div className="flex gap-2 shrink-0 font-mono">
                        {typeof intent.value !== 'undefined' && (
                            <div className="border border-[rgba(255,125,94,0.3)] bg-[#0b0405]/80 px-2.5 py-1.5 text-center min-w-[58px]">
                                <div className="text-[#5f6e7e] text-[8px] tracking-[0.16em]">预测值</div>
                                <div className="font-display text-base font-bold text-[#ffd9cd] tabular">{formatNumber(intent.value)}</div>
                            </div>
                        )}
                        <div className="border border-[rgba(126,156,182,0.28)] bg-[#05090f]/80 px-2.5 py-1.5 text-center min-w-[64px]">
                            <div className="text-[#5f6e7e] text-[8px] tracking-[0.16em]">锁定目标</div>
                            <div className="text-xs font-bold text-[#cdeeff] truncate max-w-[96px]">{targetName ?? '未知'}</div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="relative text-[#5f6e7e] text-xs font-mono tracking-wider">意图数据缺失</div>
            )}
        </div>
    );
};

// =====================
// 友方卡片（直角，拉伸铺满左列，头像随高度铺满左侧）
// =====================
const AllyCard: React.FC<{
    ally: CombatAlly; targetId: string; isActive: boolean; isSelectable: boolean; isTargeted: boolean; onClick: () => void;
    /** 该单位在战线上的坐标。 */
    position?: number;
    /** 距离最近的存活敌人有多远。 */
    nearestEnemyDistance?: number;
    /** 移动按钮可用性；onMove 未提供时（未接入空间系统）不渲染移动行。 */
    canMoveForward?: boolean;
    canMoveBackward?: boolean;
    onMove?: (dir: 1 | -1) => void;
    /** 跳过蓄反询问开关状态。 */
    skipAccumulateCounter?: boolean;
    /** 跳过差反询问开关状态。 */
    skipDifferentialCounter?: boolean;
    /** 切换跳过开关；未提供时不渲染开关行。 */
    onToggleCounterSkip?: (kind: 'accumulate' | 'differential') => void;
    /** 蓄反槽（owner × trigger，槽与槽独立结算）。 */
    counterSlots: CounterSlot[];
}> = ({ ally, targetId, isActive, isSelectable, isTargeted, counterSlots, onClick, position, nearestEnemyDistance, canMoveForward = false, canMoveBackward = false, onMove, skipAccumulateCounter = false, skipDifferentialCounter = false, onToggleCounterSkip }) => {
    const hp = safeNumber(ally.hp);
    const maxHp = Math.max(1, safeNumber(ally.maxHp));
    const shield = safeNumber(ally.shield);
    const isDead = hp <= 0;
    const isPlayer = targetId === 'player';
    const { items: floatingItems, damageTick } = useValueFloat(hp, shield);
    const stateClass = isDead
        ? 'opacity-40 grayscale border-[#1e2836] surf-card--dead cursor-not-allowed'
        : isSelectable
            ? 'surf-card--select border-[#4bd6a5] shadow-[inset_0_0_22px_rgba(75,214,165,0.2)] cursor-crosshair'
            : isTargeted
                ? 'surf-card--lock border-[#ff7d5e] shadow-[inset_0_0_22px_rgba(255,125,94,0.2)] cursor-pointer'
                : isActive
                    ? 'surf-card--focus border-[#8fd6f7]/80 shadow-[inset_0_0_20px_rgba(63,169,214,0.18)] cursor-pointer'
                    : 'surf-card border-[rgba(126,156,182,0.2)] hover:border-[#8fd6f7]/50 cursor-pointer';
    return (
        <div onClick={onClick} className={`card-lift relative flex flex-col flex-1 min-h-[178px] overflow-hidden border ${stateClass}`}>
            <div className="absolute inset-0 hud-hatch opacity-50 pointer-events-none" />
            {isActive && !isDead && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#8fd6f7] shadow-[0_0_12px_rgba(143,214,247,0.9)] z-20" />}
            <FloatingEvents items={floatingItems} />
            {damageTick > 0 && (
                <span key={damageTick} className="pointer-events-none absolute inset-0 z-30 animate-damage-hit" />
            )}
            {/* 状态横幅改为文档流内元素：
                原 absolute top-0 高约 16px，而内容区仅 p-3（12px）上内边距，
                会盖住卡片首行（角色名）顶部。入流后内容整体下移，不再被遮挡。 */}
            {isTargeted && !isDead && (
                <div className="relative z-30 shrink-0 bg-[#ff7d5e] text-[#1a0603] text-[8px] py-[3px] text-center font-display font-bold tracking-[0.28em]">被锁定</div>
            )}
            {isSelectable && !isDead && (
                <div className="relative z-30 shrink-0 bg-[#4bd6a5] text-[#04241b] text-[8px] py-[3px] text-center font-display font-bold tracking-[0.28em]">可选择</div>
            )}
            <div className="relative flex flex-1 min-h-0 gap-3 items-stretch p-3">
                <div className="relative w-14 shrink-0 overflow-hidden border border-[rgba(126,156,182,0.3)] bg-[#05080d]">
                    {ally.imageUrl ? (
                        <img src={ally.imageUrl} alt={ally.name} className="w-full h-full object-cover opacity-80 contrast-[1.05] saturate-[0.85]" />
                    ) : (
                        <div className="relative w-full h-full flex flex-col items-center justify-center gap-1 bg-grid-tech">
                            <div className="absolute inset-0 hud-hatch opacity-70" />
                            <span className="relative font-display font-bold text-xl text-[#8fd6f7]/45">{(ally.name ?? '?').slice(0, 1)}</span>
                            <span className="relative font-mono text-[7px] tracking-[0.14em] text-[#4d5b6a]">无立绘</span>
                        </div>
                    )}
                    <span className={`absolute inset-0 pointer-events-none ${isPlayer ? 'bg-gradient-to-t from-[#0a2735]/70 to-transparent' : 'bg-gradient-to-t from-[#04070d]/70 to-transparent'}`} />
                    <span className="absolute inset-x-0 top-0 h-px bg-[#8fd6f7]/40" />
                    <span className="absolute bottom-0 left-0 right-0 h-px bg-[#8fd6f7]/50" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`text-[13px] font-display font-bold tracking-[0.12em] truncate ${isPlayer ? 'text-[#cdeeff]' : 'text-[#e9f2f8]'}`}>{ally.name}</span>
                            {isPlayer && <span className="text-[7px] font-mono px-1 py-px border border-[#8fd6f7]/70 text-[#cdeeff] bg-[#0a2735]/80 shrink-0">操作员</span>}
                        </div>
                        <span className="text-[9.5px] font-mono text-[#77879a] tabular shrink-0">
                            速度 {formatNumber(ally.speed)}
                            {typeof position === 'number' && <span className="text-[#5f6e7e]"> · 位 {position}</span>}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="shrink-0 text-[8.5px] font-mono font-bold text-[#77879a] tracking-[0.18em]">生命</span>
                        <div className="flex-1 min-w-0">
                            <VitalBar current={hp} max={maxHp} shield={shield} ticks
                                fillClass={hp / maxHp <= 0.3
                                    ? 'bg-gradient-to-r from-[#7d1f18] via-[#d9483a] to-[#ff9b7d] shadow-[0_0_12px_rgba(217,72,58,0.85)]'
                                    : 'bg-gradient-to-r from-[#1d6f9c] via-[#3fa9d6] to-[#a5e6ff] shadow-[0_0_12px_rgba(63,169,214,0.65)]'}
                                heightClass="h-[9px]" />
                        </div>
                        <span className="text-[10px] font-mono text-[#dbe8f2] tabular shrink-0">{formatNumber(hp)}<span className="text-[#5f6e7e]">/{formatNumber(maxHp)}</span></span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <MiniBar label="理智" current={ally.sanity} max={ally.maxSanity} fillClass="bg-[#c28df5] shadow-[0_0_8px_rgba(194,141,245,0.6)]" />
                        <MiniBar label="体力" current={ally.stamina} max={ally.maxStamina} fillClass="bg-[#4bd6a5] shadow-[0_0_8px_rgba(75,214,165,0.55)]" />
                        <MiniBar label="精力" current={ally.vigor} max={ally.maxVigor} fillClass="bg-[#f0c05a] shadow-[0_0_8px_rgba(240,192,90,0.55)]" />
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap border-t border-[rgba(126,156,182,0.16)] pt-2">
                        <ApPips current={Math.max(0, safeNumber(ally.actionPoint.current))} base={Math.max(1, safeNumber(ally.actionPoint.base))} advanced={safeNumber(ally.actionPoint.advanced)} />
                        <div className="flex items-center gap-2">
                            {shield > 0 && <span className="flex items-center gap-0.5 text-[10px] font-mono font-bold text-[#cdeeff] tabular"><Icon name="shield" className="w-3 h-3" />{formatNumber(shield)}</span>}
                            <CounterGauge slots={counterSlots} />
                        </div>
                    </div>
                </div>
                <div className="absolute right-2 top-9 z-30">
                    <StatusBadges status={ally.status ?? []} size="sm" />
                </div>
            </div>
            {/* 机动控制条：固定在卡片底部（不参与内容区压缩），保证移动按钮永远可见 */}
            {onMove && !isDead && (
                <div className="relative shrink-0 flex items-center gap-1.5 px-3 pb-3 pt-2 border-t border-[rgba(126,156,182,0.16)]">
                    <button type="button" disabled={!canMoveBackward}
                        onClick={(e) => { e.stopPropagation(); onMove(-1); }}
                        title="向后撤离一步（消耗 1 行动点）"
                        className={`flex-1 h-[22px] border font-mono text-[9px] font-bold tracking-[0.14em] flex items-center justify-center gap-0.5 transition-all ${canMoveBackward
                            ? 'border-[#8fd6f7]/45 text-[#cdeeff] bg-[#0a2735]/55 hover:border-[#8fd6f7] hover:text-white active:scale-95'
                            : 'border-[rgba(126,156,182,0.2)] text-[#4d5b6a] cursor-not-allowed'}`}>
                        <Icon name="chevronLeft" className="w-3 h-3" />后退
                    </button>
                    <button type="button" disabled={!canMoveForward}
                        onClick={(e) => { e.stopPropagation(); onMove(1); }}
                        title="向前推进一步（消耗 1 行动点）"
                        className={`flex-1 h-[22px] border font-mono text-[9px] font-bold tracking-[0.14em] flex items-center justify-center gap-0.5 transition-all ${canMoveForward
                            ? 'border-[#ff7d5e]/45 text-[#ffd9cd] bg-[#2a0d06]/55 hover:border-[#ff7d5e] hover:text-white active:scale-95'
                            : 'border-[rgba(126,156,182,0.2)] text-[#4d5b6a] cursor-not-allowed'}`}>
                        前进<Icon name="chevronRight" className="w-3 h-3" />
                    </button>
                    {typeof nearestEnemyDistance === 'number' && (
                        <span className="shrink-0 font-mono text-[9px] text-[#77879a] tabular">距敌 <span className="text-[#96a7b8]">{formatNumber(nearestEnemyDistance)}</span></span>
                    )}
                </div>
            )}
            {onToggleCounterSkip && !isDead && (
                <div className="flex items-center gap-1.5">
                    <button type="button"
                        onClick={(e) => { e.stopPropagation(); onToggleCounterSkip('accumulate'); }}
                        title="跳过蓄反询问：自动拒绝预支反击机会"
                        className={`flex-1 h-[20px] border font-mono text-[8.5px] font-bold tracking-[0.12em] whitespace-nowrap transition-all ${skipAccumulateCounter
                            ? 'border-[#c28df5]/70 bg-[#2a1240]/70 text-[#e6cffb]'
                            : 'border-[rgba(126,156,182,0.2)] text-[#4d5b6a] hover:border-[#8ea3b8] hover:text-[#96a7b8]'}`}>
                        跳过蓄反{skipAccumulateCounter ? '·开' : ''}
                    </button>
                    <button type="button"
                        onClick={(e) => { e.stopPropagation(); onToggleCounterSkip('differential'); }}
                        title="跳过差反询问：自动拒绝预支反击机会"
                        className={`flex-1 h-[20px] border font-mono text-[8.5px] font-bold tracking-[0.12em] whitespace-nowrap transition-all ${skipDifferentialCounter
                            ? 'border-[#c28df5]/70 bg-[#2a1240]/70 text-[#e6cffb]'
                            : 'border-[rgba(126,156,182,0.2)] text-[#4d5b6a] hover:border-[#8ea3b8] hover:text-[#96a7b8]'}`}>
                        跳过差反{skipDifferentialCounter ? '·开' : ''}
                    </button>
                </div>
            )}
        </div>
    );
};

// =====================
// 战术按钮（直角）
// =====================
const TacticButton: React.FC<{
    tactic: Tactic; usable: boolean; selected: boolean; onClick: () => void;
    /** 不可用原因；仅当 usable 为 false 时展示，避免玩家面对无解释的灰按钮。 */
    reason?: string;
    /** 攻击战术的射程提示（当前施法者武器）。 */
    rangeText?: string;
}> = ({ tactic, usable, selected, onClick, reason, rangeText }) => {
    const effects = getTacticEffects(tactic);
    const isAttack = tactic.type === 'attack';
    return (
        <button onClick={onClick} disabled={!usable}
            className={`group w-full text-left border transition-all duration-300 relative overflow-hidden shrink-0 ${selected ? 'border-[#4bd6a5]/70 bg-[#081c16]/80 shadow-[inset_0_0_24px_rgba(75,214,165,0.16)]' : usable ? 'border-[rgba(126,156,182,0.22)] bg-[#070d15]/80 hover:border-[#8fd6f7]/60 hover:bg-[#0a1725]' : 'border-[rgba(126,156,182,0.12)] bg-[#060a12]/70 opacity-45 grayscale cursor-not-allowed'}`}>
            <span className={`absolute left-0 top-0 bottom-0 w-[3px] transition-colors ${selected ? 'bg-[#4bd6a5] shadow-[0_0_12px_rgba(75,214,165,0.8)]' : usable ? (isAttack ? 'bg-[#ff7d5e]/70' : 'bg-[#2c8fc0]/80') : 'bg-[#2a3542]'}`} />
            {usable && <div className="shimmer-overlay opacity-20" />}
            <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            <div className="flex items-start gap-3.5 relative z-10 p-3 pl-4">
                <div className={`ap-diamond ${usable ? (isAttack ? 'ap-diamond--atk' : 'ap-diamond--def') : 'ap-diamond--off'}`}>
                    <span className="-rotate-45 font-display font-bold text-[12px] tabular">{formatNumber(safeNumber(tactic.apCost))}</span>
                </div>
                <div className="flex-1 min-w-0 pl-1">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-display font-bold tracking-[0.12em] text-[#e9f2f8] truncate">{tactic.name}</span>
                        <span className={`text-[8px] font-mono font-bold px-1.5 py-px border tracking-[0.16em] shrink-0 ${isAttack ? 'border-[#ff7d5e]/60 text-[#ffc4b0] bg-[#3a0f0b]/50' : 'border-[#8fd6f7]/60 text-[#cdeeff] bg-[#0a2735]/50'}`}>
                            {isAttack ? '攻击' : '防御'}
                        </span>
                    </div>
                    <div className="text-[11px] text-[#96a7b8] mt-1 leading-relaxed">{tactic.desc}</div>
                    {tactic.type === 'attack' && tactic.requireWeapon && (
                        <div className="mt-1 text-[10px] font-mono text-[#f0c05a]/90">需要武器：{WEAPON_LABEL[tactic.requireWeapon]}</div>
                    )}
                    {tactic.type === 'attack' && rangeText && (
                        <div className="mt-1 text-[10px] font-mono text-[#4bd6a5]/90">射程 {rangeText}</div>
                    )}
                    <div className="mt-2 flex flex-col gap-1">
                        {effects.length === 0 ? (
                            <span className="text-[10px] font-mono text-[#5f6e7e]">{isAttack ? '执行武器攻击' : '布设防御判定'}</span>
                        ) : (
                            effects.map((effect, index) => (
                                <span key={index} className="text-[10px] font-mono text-[#a5e6ff]/85">{formatTacticEffect(effect)}</span>
                            ))
                        )}
                    </div>
                    {selected && <div className="mt-2 text-[10px] font-mono text-[#4bd6a5] animate-phase-blink">选择目标 / ESC 取消</div>}
                    {!usable && reason && (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-[#ff9b7d]/90">
                            <Icon name="alert" className="w-3 h-3 shrink-0" />{reason}
                        </div>
                    )}
                </div>
            </div>
        </button>
    );
};

// =====================
// 战斗遥测条（吃掉右列剩余空间，使无死黑留白且信息更密）
// =====================
const CombatTelemetry: React.FC<{
    isPlayerPhase: boolean; activeName: string; aliveEnemies: number; totalEnemies: number;
    focusName: string; focusHpPct: number; focusAtk: number; focusSpd: number;
    /** 战线地图节点，与遥测合并展示（插在标题行与数据格之间）。 */
    grid?: React.ReactNode;
}> = ({ isPlayerPhase, activeName, aliveEnemies, totalEnemies, focusName, focusHpPct, focusAtk, focusSpd, grid }) => {
    const Cell: React.FC<{ k: string; v: string; tone?: string }> = ({ k, v, tone = 'text-[#dbe8f2]' }) => (
        <div className="relative flex flex-col gap-0.5 border border-[rgba(126,156,182,0.16)] bg-[#05090f]/70 px-2 py-1.5 overflow-hidden">
            <span className="absolute left-0 top-0 bottom-0 w-px bg-[rgba(126,156,182,0.3)]" />
            <span className="text-[8px] font-mono text-[#5f6e7e] tracking-[0.18em] uppercase">{k}</span>
            <span className={`text-[11px] font-mono font-bold tabular truncate ${tone}`}>{v}</span>
        </div>
    );
    return (
        <div className="relative shrink-0 border-t border-[rgba(126,156,182,0.2)] p-2.5 overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(6,11,19,0.6), rgba(4,7,13,0.85))' }}>
            <div className="absolute inset-0 bg-grid-tech opacity-20 pointer-events-none" />
            <div className="absolute inset-0 hud-hatch opacity-50 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-px overflow-hidden pointer-events-none">
                <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[#8fd6f7]/60 to-transparent animate-sweep-x" />
            </div>
            <div className="relative flex items-center gap-2 mb-2">
                <span className="text-[9px] font-display font-bold text-[#9fdcf7] tracking-[0.28em]">战斗遥测</span>
                <span className="flex-1 h-px hud-hairline opacity-25" />
                <span className={`text-[9px] font-mono font-bold tracking-[0.14em] ${isPlayerPhase ? 'text-[#4bd6a5] animate-soft-blink' : 'text-[#f0c05a]'}`}>
                    {isPlayerPhase ? '阶段 · 我方' : '阶段 · 敌方'}
                </span>
            </div>
            {grid && <div className="relative mb-2.5">{grid}</div>}
            <div className="relative grid grid-cols-2 gap-1.5">
                <Cell k="当前行动" v={activeName} tone="text-[#cdeeff]" />
                <Cell k="敌存" v={`${aliveEnemies} / ${totalEnemies}`} tone={aliveEnemies > 0 ? 'text-[#ffc4b0]' : 'text-[#5f6e7e]'} />
                <Cell k="焦点" v={focusName} tone="text-[#ffc4b0]" />
                <Cell k="焦点生命" v={`${focusHpPct}%`} tone={focusHpPct <= 30 ? 'text-[#f0c05a]' : 'text-[#dbe8f2]'} />
                <Cell k="焦点攻击" v={formatNumber(focusAtk)} />
                <Cell k="焦点速度" v={formatNumber(focusSpd)} />
            </div>
        </div>
    );
};

// =====================
// 蓄反 / 差反预支询问（底部通栏，不遮挡主界面）
// =====================
const CounterPromptBar: React.FC<{
    request: CounterAdvanceRequest;
    actorName: string;
    onResolve: (approve: boolean) => void;
}> = ({ request, actorName, onResolve }) => {
    const isAccumulate = request.kind === 'accumulate';
    return (
        <div className="relative shrink-0 pointer-events-auto border-t border-[#c28df5]/45"
            style={{ background: 'linear-gradient(180deg, rgba(18,8,30,0.92), rgba(6,3,12,0.97))' }}
            onClick={(e) => e.stopPropagation()}>
            <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c28df5] shadow-[0_0_14px_rgba(194,141,245,0.85)] animate-soft-blink" />
            <div className="absolute inset-0 hud-hatch opacity-40 pointer-events-none" />
            <div className="relative flex items-center gap-3 px-4 py-2.5">
                <Icon name="refresh" className="w-4 h-4 shrink-0 text-[#c28df5]" />
                <span className="shrink-0 font-display font-bold text-[11px] tracking-[0.24em] text-[#e6cffb] whitespace-nowrap">
                    {isAccumulate ? '蓄反 · 预支询问' : '差反 · 预支询问'}
                </span>
                <span className="hidden xl:block shrink-0 font-mono text-[9px] text-[#5f6e7e] tracking-[0.18em] animate-soft-blink">AWAITING</span>
                <span className="flex-1 min-w-0 truncate text-[11.5px] text-[#dbe8f2]">
                    <span className="text-[#e6cffb] font-bold">{actorName}</span>
                    {isAccumulate ? (
                        <> 当前蓄反槽 <span className="font-mono text-[#c28df5] tabular font-bold">{formatNumber(request.availableCounter)}</span>，消耗 {formatNumber((request.threshold || 5) * request.advancePoints)} 点蓄反值预支 {formatNumber(request.advancePoints)} 点行动力、立即反击 {formatNumber(request.advancePoints)} 次（优先消耗当前行动点，不足部分下回合扣除）；保留则回合末按 10% 转化行动点</>
                    ) : (
                        <> 速度满足差反，预支 2 点行动力立即反击 1 次（优先消耗当前行动点，不足部分下回合扣除）</>
                    )}
                </span>
                <div className="shrink-0 flex items-center gap-2">
                    <button type="button" onClick={() => onResolve(true)}
                        className="h-8 px-5 border border-[#c28df5]/70 bg-[#2a1240]/80 text-[#e6cffb] font-display font-bold text-[11px] tracking-[0.24em] hover:border-[#c28df5] hover:text-white active:scale-[0.98] transition-all whitespace-nowrap">
                        预支反击
                    </button>
                    <button type="button" onClick={() => onResolve(false)}
                        className="h-8 px-5 border border-[rgba(126,156,182,0.3)] bg-[#0a1119]/70 text-[#96a7b8] font-display font-bold text-[11px] tracking-[0.24em] hover:border-[#8ea3b8] hover:text-[#dbe8f2] active:scale-[0.98] transition-all whitespace-nowrap">
                        {isAccumulate ? '保留' : '放弃'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// =====================
// 战斗主面板
// =====================
const CombatActivePanel: React.FC<CombatPanelProps> = ({
    enemies, enemyIntents, allies, activeAllyId, setActiveAllyId, isPlayerPhase, isBusy,
    getTacticsFor, canUseTactic, executeTactic, endPlayerPhase, getVisibleResultSequence, pendingDefense,
    onGenerateEnemyVisual, onRandomSwitchEnemyVisual, isEnemyVisualGenerating,
    positions, battleLineMin, battleLineMax, getUnitRange, onMoveAlly,
    counterPrompt, onResolveCounterPrompt, counterSkip, onToggleCounterSkip,
    insertAction, onEndInsertAction,
}) => {
    const [selectedTactic, setSelectedTactic] = useState<Tactic | null>(null);
    const [focusedEnemyId, setFocusedEnemyId] = useState<string>('');
    /** 敌人肖像全屏欣赏层。 */
    const [isPortraitFullscreen, setIsPortraitFullscreen] = useState(false);
    const aliveEnemies = useMemo(() => enemies.filter((e) => !e.isDead && safeNumber(e.hp) > 0), [enemies]);
    useEffect(() => {
        if (aliveEnemies.length > 0) {
            const exists = aliveEnemies.some((e) => getEnemyTargetId(e) === focusedEnemyId);
            if (!exists) setFocusedEnemyId(getEnemyTargetId(aliveEnemies[0]));
        } else if (enemies.length > 0) {
            setFocusedEnemyId(getEnemyTargetId(enemies[0]));
        }
    }, [aliveEnemies, enemies, focusedEnemyId]);
    const focusedEnemy = useMemo(
        () => enemies.find((e) => getEnemyTargetId(e) === focusedEnemyId) ?? aliveEnemies[0] ?? enemies[0],
        [enemies, aliveEnemies, focusedEnemyId]
    );
    const intentFor = useCallback(
        (enemy: CombatEnemy): CombatIntent | null => {
            const idx = enemies.findIndex((e) => e.instanceId === enemy.instanceId);
            return idx >= 0 ? enemyIntents[idx] ?? null : null;
        },
        [enemies, enemyIntents]
    );
    const focusedEnemyIntent = focusedEnemy ? intentFor(focusedEnemy) : null;
    const focusedEnemyGuardCount = focusedEnemy ? (pendingDefense?.[getEnemyTargetId(focusedEnemy)] ?? []).length : 0;
    const allyEntries = useMemo(() => allies.map((ally, index) => ({ ally, id: getAllyTargetId(ally, index) })), [allies]);
    /**
     * 蓄反槽展示数据：按 owner 取出全部「owner × trigger」槽，
     * trigger 名称在我方 / 敌方单位表中解析（互为对方的 id）。
     */
    const counterSlotsOf = useCallback(
        (
            ownerId: string,
            entries: CombatDynamicState['accumulateCounter'] | undefined
        ): CounterSlot[] =>
            getCounterSlots(
                entries,
                ownerId,
                (triggerId) =>
                    allyEntries.find((entry) => entry.id === triggerId)?.ally.name ??
                    enemies.find((enemy) => enemy.instanceId === triggerId)?.name ??
                    triggerId
            ),
        [allyEntries, enemies]
    );
    /** 顶部敌对轨道（横向）与左列小队列表（纵向）的溢出提示 */
    const [enemyRailRef, enemyRailOverflow] = useOverflow<HTMLDivElement>(enemies.length);
    const [allyListRef, allyListOverflow] = useOverflow<HTMLDivElement>(allyEntries.length);
    const aliveAllyIds = useMemo(() => allyEntries.filter((e) => safeNumber(e.ally.hp) > 0).map((e) => e.id), [allyEntries]);
    useEffect(() => {
        if (aliveAllyIds.length > 0 && !aliveAllyIds.includes(activeAllyId)) setActiveAllyId(aliveAllyIds[0]);
    }, [aliveAllyIds, activeAllyId, setActiveAllyId]);
    /** 「立即行动」窗口：锁定预支单位，窗口期间由它接管操作。 */
    const insertUnitId = insertAction && aliveAllyIds.includes(insertAction.unitId) ? insertAction.unitId : undefined;
    const effectiveActiveId = insertUnitId ?? (aliveAllyIds.includes(activeAllyId) ? activeAllyId : (aliveAllyIds[0] ?? 'player'));
    /** 当前是否允许操作（玩家回合，或「立即行动」窗口内的预支单位）。 */
    const isInsertingUnit = Boolean(insertUnitId) && insertUnitId === effectiveActiveId;
    const canActNow = (isPlayerPhase || isInsertingUnit) && !isBusy;
    const activeAllyEntry = useMemo(() => allyEntries.find((e) => e.id === effectiveActiveId) ?? allyEntries[0], [allyEntries, effectiveActiveId]);
    const tactics = useMemo(() => (activeAllyEntry ? getTacticsFor(effectiveActiveId) : []), [activeAllyEntry, effectiveActiveId, getTacticsFor]);
    const [tacticListRef, tacticListOverflow] = useOverflow<HTMLDivElement>(tactics.length);
    const targetMode = useMemo(() => (selectedTactic ? getManualTargetMode(selectedTactic) : null), [selectedTactic]);
    /** —— 战场空间派生（未接入空间数据时全部自动降级隐藏） —— */
    const posMap = positions ?? {};
    const lineMin = battleLineMin ?? 0;
    const lineMax = battleLineMax ?? 0;
    const activePos = posMap[effectiveActiveId];
    /** 当前行动单位的武器射程；未接入时为 undefined（不限制目标选取）。 */
    const activeRange = useMemo(
        () => (getUnitRange ? getUnitRange(effectiveActiveId) : undefined),
        [getUnitRange, effectiveActiveId]
    );
    /** 敌人与当前行动单位之间的战线距离。 */
    const enemyDistanceOf = useCallback((enemy: CombatEnemy): number | undefined => {
        const mine = posMap[effectiveActiveId];
        const theirs = posMap[getEnemyTargetId(enemy)];
        if (typeof mine !== 'number' || typeof theirs !== 'number') return undefined;
        return Math.abs(mine - theirs);
    }, [posMap, effectiveActiveId]);
    /** 目标是否超出当前射程（无空间数据或无限射程时恒为 false）。 */
    const isOutOfRange = useCallback((enemy: CombatEnemy): boolean => {
        if (typeof activeRange !== 'number' || activeRange === 0) return false;
        const d = enemyDistanceOf(enemy);
        return typeof d === 'number' && d > activeRange;
    }, [activeRange, enemyDistanceOf]);
    /** 小地图上铺出的「适宜距离」光带；无限射程时覆盖整条战线。 */
    const rangeBand = useMemo(() => {
        if (typeof activeRange !== 'number' || typeof activePos !== 'number' || lineMax <= lineMin) return undefined;
        if (activeRange === 0) return { from: lineMin, to: lineMax };
        return {
            from: Math.max(lineMin, activePos - activeRange),
            to: Math.min(lineMax, activePos + activeRange),
        };
    }, [activeRange, activePos, lineMin, lineMax]);
    useEffect(() => { setSelectedTactic(null); }, [effectiveActiveId, isPlayerPhase, focusedEnemyId]);
    /** ESC 取消已选战术（战斗面板内唯一的键盘行为，其余交互一律使用鼠标）。 */
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelectedTactic(null); };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
    /**
     * 全屏欣赏层的 ESC 关闭。
     * 必须在捕获阶段截断：App 的全局 ESC 在冒泡阶段监听，若不拦截会同时弹出设置面板。
     */
    useEffect(() => {
        if (!isPortraitFullscreen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            setIsPortraitFullscreen(false);
        };
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [isPortraitFullscreen]);

    const playerAlly = allies[0];
    const playerHpPct = playerAlly ? getPercent(playerAlly.hp, playerAlly.maxHp) : 100;
    const dangerLevel = playerHpPct <= 15 ? 2 : playerHpPct <= 30 ? 1 : 0;

    const handleTacticClick = useCallback((tactic: Tactic) => {
        if (!activeAllyEntry || !canActNow) return;
        if (!canUseTactic(tactic, effectiveActiveId)) return;
        const mode = getManualTargetMode(tactic);
        if (mode) setSelectedTactic((prev) => (prev?.id === tactic.id ? null : tactic));
        else { setSelectedTactic(null); void executeTactic(tactic.id, effectiveActiveId); }
    }, [activeAllyEntry, canActNow, canUseTactic, effectiveActiveId, executeTactic]);

    const handleAllyClick = useCallback((targetId: string) => {
        const entry = allyEntries.find((item) => item.id === targetId);
        if (!entry || safeNumber(entry.ally.hp) <= 0) return;
        if (selectedTactic && targetMode) {
            if (targetMode === 'single_teammate' && targetId === effectiveActiveId) return;
            const tacticId = selectedTactic.id;
            setSelectedTactic(null);
            void executeTactic(tacticId, effectiveActiveId, targetId);
        } else if (!insertUnitId) setActiveAllyId(targetId);
    }, [allyEntries, selectedTactic, targetMode, effectiveActiveId, executeTactic, setActiveAllyId, insertUnitId]);

    const handleEnemyClick = useCallback((enemy: CombatEnemy) => {
        const enemyId = getEnemyTargetId(enemy);
        if (enemy.isDead || safeNumber(enemy.hp) <= 0) return;
        setFocusedEnemyId(enemyId);
        if (selectedTactic && targetMode === 'enemy') {
            // 超距目标不执行：保持战术选中，让玩家先移动调整距离。
            if (isOutOfRange(enemy)) return;
            const tacticId = selectedTactic.id;
            setSelectedTactic(null);
            void executeTactic(tacticId, effectiveActiveId, enemyId);
        }
    }, [selectedTactic, targetMode, effectiveActiveId, executeTactic, isOutOfRange]);

    const isAllySelectable = useCallback((targetId: string, alive: boolean) => {
        if (!alive || !selectedTactic || !targetMode) return false;
        if (targetMode === 'single_teammate') return targetId !== effectiveActiveId;
        return targetMode === 'single_ally';
    }, [selectedTactic, targetMode, effectiveActiveId]);

    const isEnemySelectable = useCallback((enemy: CombatEnemy) => {
        if (enemy.isDead || safeNumber(enemy.hp) <= 0) return false;
        if (!selectedTactic || !targetMode) return false;
        if (targetMode !== 'enemy') return false;
        // 攻击战术：射程之外的目标不可选取。
        return !isOutOfRange(enemy);
    }, [selectedTactic, targetMode, isOutOfRange]);

    const handleEndTurn = useCallback(() => {
        if (!isPlayerPhase || isBusy) return;
        setSelectedTactic(null);
        void endPlayerPhase();
    }, [isPlayerPhase, isBusy, endPlayerPhase]);

    /** 我方单位移动：前进 / 后退一步。移动会改变射程可用性，因此先清空待选战术。 */
    const handleMoveAlly = useCallback((targetId: string, dir: 1 | -1) => {
        if (!onMoveAlly) return;
        setSelectedTactic(null);
        void onMoveAlly(targetId, dir);
    }, [onMoveAlly]);

    const canMoveUnit = useCallback((targetId: string, dir: 1 | -1): boolean => {
        if (!onMoveAlly || isBusy) return false;
        // 「立即行动」窗口期间只允许预支单位移动，且移动不消耗行动点。
        if (insertUnitId) {
            if (targetId !== insertUnitId) return false;
        } else if (!isPlayerPhase) {
            return false;
        }
        const entry = allyEntries.find((e) => e.id === targetId);
        if (!entry || safeNumber(entry.ally.hp) <= 0) return false;
        if (!insertUnitId && safeNumber(entry.ally.actionPoint.current) < 1) return false;
        const pos = posMap[targetId];
        if (typeof pos !== 'number') return false;
        const next = pos + dir;
        return next >= lineMin && next <= lineMax;
    }, [onMoveAlly, isPlayerPhase, isBusy, insertUnitId, allyEntries, posMap, lineMin, lineMax]);

    /** 我方单位到最近存活敌人的距离。 */
    const nearestEnemyDistance = useCallback((targetId: string): number | undefined => {
        const mine = posMap[targetId];
        if (typeof mine !== 'number') return undefined;
        let best: number | undefined;
        aliveEnemies.forEach((enemy) => {
            const ep = posMap[getEnemyTargetId(enemy)];
            if (typeof ep !== 'number') return;
            const d = Math.abs(ep - mine);
            if (best === undefined || d < best) best = d;
        });
        return best;
    }, [posMap, aliveEnemies]);

    const handleBackgroundClick = (event: React.MouseEvent) => {
        if (event.target === event.currentTarget) setSelectedTactic(null);
    };

    /**
     * 战术不可用的具体原因。
     * 仅在 canUseTactic 已判定为 false 时调用，因此可安全地给出确定性解释。
     */
    const tacticDisabledReason = useCallback((tactic: Tactic): string | undefined => {
        if (isBusy) return '结算中…';
        if (!isPlayerPhase && !isInsertingUnit) return '敌方回合';
        const ally = activeAllyEntry?.ally;
        if (!ally) return undefined;
        if (safeNumber(ally.hp) <= 0) return '已阵亡';
        const ap = Math.max(0, safeNumber(ally.actionPoint.current));
        const cost = safeNumber(tactic.apCost);
        // 立即行动窗口内的行动不消耗行动点。
        if (!isInsertingUnit && ap < cost) return `AP 不足 · 缺 ${formatNumber(cost - ap)}`;
        if (safeNumber(ally.resultSequence?.attackResult?.length) <= 0) return '攻击序列耗尽';
        // 攻击战术：射程内没有可攻击目标。
        if (tactic.type === 'attack' && typeof activeRange === 'number') {
            const hasTarget = aliveEnemies.some((enemy) => !isOutOfRange(enemy));
            if (!hasTarget) return `射程外 · 需接近至 ${formatNumber(activeRange)} 格`;
        }
        return undefined;
    }, [isBusy, isPlayerPhase, isInsertingUnit, activeAllyEntry, activeRange, aliveEnemies, isOutOfRange]);

    /** 蓄反 / 差反询问发起者名称（player / 同伴 id）。 */
    const counterActorName = useMemo(() => {
        if (!counterPrompt) return '';
        if (counterPrompt.actorId === 'player') return allies[0]?.name ?? '操作者';
        return allies.find((a) => a.id === counterPrompt.actorId)?.name ?? counterPrompt.actorId;
    }, [counterPrompt, allies]);

    /** 「立即行动」窗口的行动者名称。 */
    const insertActorName = useMemo(() => {
        if (!insertAction) return '';
        if (insertAction.unitId === 'player') return allies[0]?.name ?? '操作者';
        return allies.find((a) => a.id === insertAction.unitId)?.name ?? insertAction.unitId;
    }, [insertAction, allies]);

    const intentTargetName = focusedEnemyIntent?.targetId
        ? allyEntries.find((e) => e.id === focusedEnemyIntent.targetId)?.ally.name ?? focusedEnemyIntent.targetId
        : undefined;

    const focusHpPct = focusedEnemy ? getPercent(safeNumber(focusedEnemy.hp), Math.max(1, safeNumber(focusedEnemy.maxHp))) : 0;

    return (
        <div className="combat-panel-root absolute inset-0 z-50 overflow-hidden pointer-events-auto flex flex-col" onClick={handleBackgroundClick}>
            {/* 全屏氛围层 */}
            <div className="absolute inset-0 bg-grid-fade opacity-60 pointer-events-none" />
            <div className="combat-ambience absolute inset-0 pointer-events-none" />
            <div className="erosion-bloom absolute inset-0 pointer-events-none" />
            <div className="noise-overlay absolute inset-0 opacity-20 pointer-events-none" />
            <div className="hud-scanline opacity-[0.08] pointer-events-none" />
            {dangerLevel > 0 && (
                <div className={`absolute inset-0 pointer-events-none z-40 ${dangerLevel === 2 ? 'danger-vignette-critical' : 'danger-vignette'}`} />
            )}
            {/* 相位切换光刃：以 key 重挂载重放一次性扫掠，让「轮谁行动」有实体感 */}
            <span key={isPlayerPhase ? 'phase-op' : 'phase-ho'}
                className="phase-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3 z-30"
                style={{
                    background: isPlayerPhase
                        ? 'linear-gradient(90deg, transparent, rgba(143,214,247,0.14) 45%, rgba(233,242,248,0.28) 50%, rgba(143,214,247,0.14) 55%, transparent)'
                        : 'linear-gradient(90deg, transparent, rgba(255,125,94,0.14) 45%, rgba(255,214,200,0.28) 50%, rgba(255,125,94,0.14) 55%, transparent)',
                }} />

            {/*
                无缝拼接主网格。
                gap-px + .hud-seam 间隙着色 = 1px 钢质 HUD 分舱缝；无内边距，组件贴屏幕边缘。
                < lg：flex-col 单列纵向滚动。
                lg+：grid，行 = auto(轨道) + minmax(0,1fr)(主体)，列按 fr 比例铺满。
            */}
            <main className="relative z-10 flex-1 min-h-0 w-full flex flex-col gap-px hud-seam border border-[rgba(126,156,182,0.22)] overflow-y-auto lg:overflow-hidden lg:grid lg:grid-cols-[minmax(240px,0.82fr)_minmax(0,1.7fr)_minmax(300px,1fr)] lg:grid-rows-[auto_minmax(0,1fr)] pointer-events-none">

                {/* —— 敌对单元轨道（DOM 1 / grid 顶行跨三列，卡片 flex-1 铺满） —— */}
                <section className="pointer-events-auto flex flex-col min-h-0 surf-panel lg:col-span-3 lg:row-start-1">
                    <div ref={enemyRailRef} className={`flex gap-px hud-seam overflow-x-auto custom-scrollbar ${enemyRailOverflow.x ? 'fade-x' : ''}`}>
                        {enemies.map((enemy, idx) => (
                            <EnemyMiniCard key={getEnemyTargetId(enemy)} enemy={enemy} index={idx} intent={enemyIntents[idx] ?? null}
                                isFocused={focusedEnemy ? getEnemyTargetId(enemy) === getEnemyTargetId(focusedEnemy) : false}
                                isSelectable={isEnemySelectable(enemy)}
                                guardCount={(pendingDefense?.[getEnemyTargetId(enemy)] ?? []).length}
                                counterSlots={counterSlotsOf(getEnemyTargetId(enemy), enemy.accumulateCounter)}
                                distance={enemyDistanceOf(enemy)}
                                range={activeRange}
                                outOfRange={Boolean(selectedTactic) && targetMode === 'enemy' && isOutOfRange(enemy)}
                                onClick={() => handleEnemyClick(enemy)} />
                        ))}
                    </div>
                </section>

                {/* —— 焦点舞台 + 意图（DOM 2 / grid 中列，肖像铺满 + 意图贴底） —— */}
                <section className="pointer-events-auto flex flex-col min-h-0 lg:col-start-2 lg:row-start-2">
                    <div className="relative flex-1 min-h-0 flex flex-col">
                        {focusedEnemy && (
                            <EnemyStageView key={getEnemyTargetId(focusedEnemy)} enemy={focusedEnemy} guardCount={focusedEnemyGuardCount}
                                counterSlots={counterSlotsOf(getEnemyTargetId(focusedEnemy), focusedEnemy.accumulateCounter)}
                                onGenerateVisual={onGenerateEnemyVisual} onRandomSwitchVisual={onRandomSwitchEnemyVisual}
                                isEnemyVisualGenerating={isEnemyVisualGenerating}
                                blockExpand={Boolean(selectedTactic)}
                                distance={enemyDistanceOf(focusedEnemy)}
                                range={activeRange}
                                onOpenFullscreen={() => setIsPortraitFullscreen(true)} />
                        )}
                    </div>
                    {focusedEnemy && (
                        <div className="shrink-0">
                            <IntentModule enemy={focusedEnemy} intent={focusedEnemyIntent} targetName={intentTargetName} />
                        </div>
                    )}
                </section>

                {/* —— 小队链路 + 终止回合（DOM 3 / grid 左列，卡片拉伸铺满） —— */}
                <section className="pointer-events-auto flex flex-col min-h-0 lg:col-start-1 lg:row-start-2">
                    <PanelShell title="小队链路"
                        right={<span className="text-[10px] font-mono text-[#cdeeff] tabular">{aliveAllyIds.length}<span className="text-[#5f6e7e]">/{allyEntries.length} 在线</span></span>}>
                        <div ref={allyListRef} className={`flex flex-col gap-px hud-seam flex-1 min-h-0 overflow-y-auto custom-scrollbar ${allyListOverflow.y ? 'fade-b' : ''}`}>
                            {allyEntries.map(({ ally, id }) => (
                                <AllyCard key={id} ally={ally} targetId={id} isActive={id === effectiveActiveId}
                                    isSelectable={isAllySelectable(id, safeNumber(ally.hp) > 0)}
                                    isTargeted={focusedEnemyIntent?.targetId === id}
                                    counterSlots={counterSlotsOf(id, ally.accumulateCounter)}
                                    position={posMap[id]}
                                    nearestEnemyDistance={nearestEnemyDistance(id)}
                                    canMoveForward={canMoveUnit(id, 1)}
                                    canMoveBackward={canMoveUnit(id, -1)}
                                    onMove={onMoveAlly ? (dir) => handleMoveAlly(id, dir) : undefined}
                                    skipAccumulateCounter={counterSkip?.[id]?.accumulate === true}
                                    skipDifferentialCounter={counterSkip?.[id]?.differential === true}
                                    onToggleCounterSkip={onToggleCounterSkip ? (kind) => onToggleCounterSkip(id, kind, !(counterSkip?.[id]?.[kind] === true)) : undefined}
                                    onClick={() => handleAllyClick(id)} />
                            ))}
                        </div>
                        <button onClick={handleEndTurn} disabled={!isPlayerPhase || isBusy}
                            className={`group relative shrink-0 w-full h-14 border-t-2 font-display font-bold tracking-[0.36em] text-[13px] overflow-hidden transition-all duration-500 ${isPlayerPhase && !isBusy ? 'border-[#ff7d5e]/80 text-[#ffd0c2] hover:text-white' : 'border-[#7d1f18]/50 text-[#6b3a34] opacity-50 cursor-not-allowed'}`}>
                            <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(58,15,11,0.75), rgba(12,4,6,0.9))' }} />
                            <span className="absolute inset-0 hazard-stripes opacity-[0.08] pointer-events-none" />
                            {isPlayerPhase && !isBusy && (
                                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(ellipse_at_center,rgba(255,125,94,0.3),transparent_72%)] pointer-events-none" />
                            )}
                            <span className="relative z-10">终止回合</span>
                        </button>
                    </PanelShell>
                </section>

                {/* —— 战术矩阵 + 遥测（DOM 4 / grid 右列，列表 flex-1 + 遥测吃满） —— */}
                <section className="pointer-events-auto flex flex-col min-h-0 lg:col-start-3 lg:row-start-2">
                    <PanelShell>
                        {/* 结果序列 */}
                        {activeAllyEntry && getVisibleResultSequence && (() => {
                            const seq = getVisibleResultSequence(effectiveActiveId);
                            const len = seq ? seq.attackResult.length : 0;
                            const ownPending = pendingDefense?.[effectiveActiveId] ?? [];
                            return (
                                <div className="flex flex-col gap-1.5 p-2.5 border-b border-[rgba(126,156,182,0.18)] bg-black/25 shrink-0">
                                    <div className="flex items-center gap-2 px-0.5">
                                        <span className="text-[9px] font-display font-bold text-[#9fdcf7] tracking-[0.24em] whitespace-nowrap">结果序列</span>
                                        <span className="flex-1 h-px hud-hairline opacity-25" />
                                        {len > 0 ? (
                                            <span className="text-[10px] font-mono text-[#96a7b8] tabular whitespace-nowrap">深度 {len}/24</span>
                                        ) : (
                                            <span className="text-[10px] font-mono text-[#5f6e7e] whitespace-nowrap">灵性不足</span>
                                        )}
                                    </div>
                                    {len > 0 && seq && (
                                        <div className="flex flex-col gap-1 border border-[rgba(126,156,182,0.16)] bg-[#05090f]/80 p-1.5">
                                            <ResultSequenceBar label="攻" results={seq.attackResult} />
                                            <ResultSequenceBar label="防" results={seq.defenseResult} />
                                        </div>
                                    )}
                                    <PendingDefenseBar list={ownPending} />
                                </div>
                            );
                        })()}
                        {/* 战术列表 */}
                        <div ref={tacticListRef} className={`relative flex flex-col gap-px hud-seam flex-1 min-h-0 overflow-y-auto custom-scrollbar ${tacticListOverflow.y ? 'fade-b' : ''}`}>
                            {tactics.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center p-4">
                                    <div className="text-[#5f6e7e] text-xs font-mono border border-dashed border-[rgba(126,156,182,0.3)] p-4 text-center bg-[#05090f]/60 tracking-wider">无可用战术</div>
                                </div>
                            ) : (
                                tactics.map((tactic) => (
                                    <TacticButton key={tactic.id} tactic={tactic}
                                        usable={!!activeAllyEntry && canActNow && canUseTactic(tactic, effectiveActiveId)}
                                        selected={selectedTactic?.id === tactic.id}
                                        reason={tacticDisabledReason(tactic)}
                                        rangeText={tactic.type === 'attack' && typeof activeRange === 'number'
                                            ? (activeRange === 0 ? '无限' : `${formatNumber(activeRange)} 格`)
                                            : undefined}
                                        onClick={() => handleTacticClick(tactic)} />
                                ))
                            )}
                        </div>
                        {/* 遥测吃满剩余空间：战线地图与遥测数据合并为同一模块 */}
                        <CombatTelemetry isPlayerPhase={isPlayerPhase}
                            activeName={activeAllyEntry?.ally.name ?? '—'}
                            aliveEnemies={aliveEnemies.length} totalEnemies={enemies.length}
                            focusName={focusedEnemy?.name ?? '—'} focusHpPct={focusHpPct}
                            focusAtk={focusedEnemy ? safeNumber(focusedEnemy.baseAttack) : 0}
                            focusSpd={focusedEnemy ? safeNumber(focusedEnemy.speed) : 0}
                            grid={onMoveAlly && lineMax > lineMin ? (
                                <BattleGrid lineMin={lineMin} lineMax={lineMax} rangeBand={rangeBand}
                                    allies={allyEntries.map(({ ally, id }) => ({
                                        id, label: ally.name ?? id, pos: posMap[id] ?? 0,
                                        alive: safeNumber(ally.hp) > 0, highlighted: id === effectiveActiveId,
                                    }))}
                                    enemies={enemies.map((enemy) => {
                                        const id = getEnemyTargetId(enemy);
                                        return {
                                            id, label: enemy.name ?? id, pos: posMap[id] ?? 0,
                                            alive: !enemy.isDead && safeNumber(enemy.hp) > 0,
                                            highlighted: !isOutOfRange(enemy),
                                        };
                                    })} />
                            ) : undefined} />
                    </PanelShell>
                </section>
            </main>

            {/* 蓄反 / 差反预支询问（底部通栏，不遮挡主界面） */}
            {counterPrompt && onResolveCounterPrompt && (
                <CounterPromptBar
                    request={counterPrompt}
                    actorName={counterActorName}
                    onResolve={onResolveCounterPrompt} />
            )}

            {/* 「立即行动」窗口状态条（预支的后续行为：自由行动剩余次数） */}
            {insertAction && onEndInsertAction && (
                <div className="relative shrink-0 pointer-events-auto border-t border-[#4bd6a5]/50"
                    style={{ background: 'linear-gradient(180deg, rgba(6,32,24,0.92), rgba(3,12,10,0.97))' }}
                    onClick={(e) => e.stopPropagation()}>
                    <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#4bd6a5] shadow-[0_0_14px_rgba(75,214,165,0.85)] animate-soft-blink" />
                    <div className="absolute inset-0 hud-hatch opacity-40 pointer-events-none" />
                    <div className="relative flex items-center gap-3 px-4 py-2.5">
                        <Icon name="refresh" className="w-4 h-4 shrink-0 text-[#4bd6a5]" />
                        <span className="shrink-0 font-display font-bold text-[11px] tracking-[0.24em] text-[#b6f5dd] whitespace-nowrap">
                            预支行动
                        </span>
                        <span className="hidden xl:block shrink-0 font-mono text-[9px] text-[#5f6e7e] tracking-[0.18em] animate-soft-blink">INSERT ACTION</span>
                        <span className="flex-1 min-w-0 truncate text-[11.5px] text-[#dbe8f2]">
                            <span className="text-[#b6f5dd] font-bold">{insertActorName}</span>
                            {' '}立即行动 · 剩余 <span className="font-mono text-[#4bd6a5] tabular font-bold">{insertAction.chancesLeft}</span> 次（本次行动不消耗行动点）
                        </span>
                        <button type="button" onClick={onEndInsertAction}
                            className="h-8 px-5 border border-[#4bd6a5]/60 bg-[#04241b]/80 text-[#b6f5dd] font-display font-bold text-[11px] tracking-[0.24em] hover:border-[#4bd6a5] hover:text-white active:scale-[0.98] transition-all whitespace-nowrap">
                            结束行动
                        </button>
                    </div>
                </div>
            )}

            {/* 目标选择提示 */}
            {selectedTactic && targetMode && (
                <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
                    <div className="relative clip-notch border border-[#4bd6a5]/80 bg-[#04070d]/95 px-8 py-3 text-[#b6f5dd] font-mono text-xs tracking-[0.35em] animate-pulse-glow">
                        <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#4bd6a5]" />
                        选择目标：{TARGET_LABEL[targetMode]} / ESC 取消
                    </div>
                </div>
            )}
            {/* 忙碌提示 */}
            {isBusy && (
                <div className="absolute inset-0 z-[56] flex items-center justify-center pointer-events-none">
                    <div className="relative clip-notch border border-[#8fd6f7]/60 bg-[#04070d]/92 px-10 py-6 text-[#cdeeff] font-display text-sm font-bold tracking-[0.4em] animate-pulse-glow">
                        结算中…
                    </div>
                </div>
            )}

            {/* ===================== 敌人肖像 · 全屏欣赏层 ===================== */}
            {/* 由面板根承载：舞台本身位于被裁剪的网格单元内，无法自身覆盖全屏。 */}
            {isPortraitFullscreen && focusedEnemy?.imageUrl && (
                <div className="fs-enter absolute inset-0 z-[80] flex flex-col bg-[#020408]/97 cursor-zoom-out"
                    onClick={() => setIsPortraitFullscreen(false)}>

                    {/* 顶栏：资产信息 + 操作。
                        容器不再拦截点击 —— 除下面两个操作按钮外，任意位置点击都退出全屏。 */}
                    <div className="relative shrink-0 flex items-center gap-3 px-5 h-12 border-b border-[rgba(255,125,94,0.3)]"
                        style={{ background: 'linear-gradient(180deg, rgba(26,10,8,0.92), rgba(4,7,13,0.7))' }}>
                        <span className="hud-led hud-led--ember" />
                        <span className="font-display text-[11px] font-bold tracking-[0.34em] text-[#ffab93] whitespace-nowrap">标本视图</span>
                        <span className="flex-1 h-px hud-hairline opacity-30" />
                        <span className="font-mono text-[10px] text-[#96a7b8] truncate max-w-[34%]">{focusedEnemy.name}</span>
                        <span className="flex items-center gap-1.5 shrink-0">
                            {onRandomSwitchEnemyVisual && (
                                <button title="随机切换肖像变体"
                                    onClick={(e) => { e.stopPropagation(); void onRandomSwitchEnemyVisual(focusedEnemy.id || focusedEnemy.instanceId, focusedEnemy.imageUrl); }}
                                    className="w-7 h-7 grid place-items-center border border-[#f0c05a]/45 text-[#f0c05a] bg-black/60 hover:border-[#f0c05a] hover:text-[#ffe6b0] active:scale-90 transition-all">
                                    <Icon name="swap" className="w-3.5 h-3.5" />
                                </button>
                            )}
                            {onGenerateEnemyVisual && (
                                <button title="重新生成肖像"
                                    onClick={(e) => { e.stopPropagation(); onGenerateEnemyVisual(focusedEnemy.id || focusedEnemy.instanceId); }}
                                    className="w-7 h-7 grid place-items-center border border-[#8fd6f7]/45 text-[#8fd6f7] bg-black/60 hover:border-[#8fd6f7] hover:text-[#d6f1ff] active:scale-90 transition-all">
                                    <Icon name="refresh"
                                        className={`w-3.5 h-3.5 ${isEnemyVisualGenerating?.(focusedEnemy.id || focusedEnemy.instanceId) ? 'animate-spin-slow' : ''}`} />
                                </button>
                            )}
                        </span>
                    </div>

                    {/* 肖像区：object-contain 完整呈现，不做任何裁切 */}
                    <div className="relative flex-1 min-h-0 overflow-hidden">
                        <img src={focusedEnemy.imageUrl} alt={focusedEnemy.name}
                            className="fs-image-enter absolute inset-0 w-full h-full object-contain" />
                        <div className="absolute inset-0 bay-grille opacity-25 pointer-events-none" />
                        <div className="absolute inset-0 noise-overlay opacity-[0.1] pointer-events-none" />
                        <div className="absolute inset-0 hud-scanline opacity-[0.12] pointer-events-none" />
                        <div className="absolute inset-0 pointer-events-none"
                            style={{ background: 'radial-gradient(ellipse 72% 72% at 50% 50%, transparent 52%, rgba(2,4,8,0.72))' }} />
                        <HudCorners />
                        <span className="absolute bottom-4 left-5 font-mono text-[9px] tracking-[0.24em] text-[#5f6e7e] pointer-events-none">
                            资产预览 · 点击任意处返回
                        </span>
                    </div>

                    {/* 底栏读数（同样不拦截点击，点击即退出） */}
                    <div className="relative shrink-0 px-5 py-3 border-t border-[rgba(255,125,94,0.22)] bg-black/45">
                        <div className="flex items-end justify-between gap-4">
                            <div className="min-w-0">
                                <div className="font-display text-[22px] leading-[1.15] font-bold tracking-[0.08em] text-[#ffd9cd] truncate">{focusedEnemy.name}</div>
                                <div className="mt-2 flex flex-wrap items-center gap-x-2.5 font-mono text-[10px] tabular">
                                    <span className="text-[#5f6e7e]">速度</span><span className="text-[#dbe8f2]">{formatNumber(focusedEnemy.speed)}</span>
                                    <span className="w-px h-3 bg-[rgba(126,156,182,0.3)]" />
                                    <span className="text-[#5f6e7e]">攻击</span><span className="text-[#dbe8f2]">{formatNumber(focusedEnemy.baseAttack)}</span>
                                </div>
                            </div>
                            <div className="text-right shrink-0 leading-none">
                                <span className="font-display text-[32px] font-bold tabular text-white">{formatNumber(safeNumber(focusedEnemy.hp))}</span>
                                <span className="font-mono text-xs text-[#5f6e7e] tabular"> / {formatNumber(Math.max(1, safeNumber(focusedEnemy.maxHp)))}</span>
                            </div>
                        </div>
                        <div className="mt-2.5">
                            <VitalBar current={safeNumber(focusedEnemy.hp)} max={Math.max(1, safeNumber(focusedEnemy.maxHp))}
                                shield={safeNumber(focusedEnemy.shield)} ticks
                                fillClass="bg-gradient-to-r from-[#7d1f18] via-[#d9483a] to-[#ff9b7d] shadow-[0_0_16px_rgba(217,72,58,0.7)]"
                                heightClass="h-2.5" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// =====================
// 根组件
// =====================
const CombatPanel: React.FC<CombatPanelProps> = (props) => {
    if (!props.enemies.length) return null;
    return (
        <>
            <style>{combatPanelCss}</style>
            <CombatActivePanel {...props} />
        </>
    );
};

export default CombatPanel;