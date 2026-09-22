/**
 * OverlayPanel - 统一全屏覆盖面板
 * 职责：
 * - 统一承载主菜单、过场、过渡、加载、结局等全屏场景（OverlayType 全覆盖）。
 * - 各类覆盖层共享同一套背景特效层（雾气 / 粒子 / 网格 / 扫描线），并按类型主题化配色。
 * - 音效调用严格限定为 type.ts 中的 SoundType；数据结构严格遵循 interface.ts。
 */
import React, { useEffect, useMemo, useState } from 'react';
import type { NodeTemplate, OriginTemplate, AttributeType, CombatStyle, OverlayType, VitalType } from '../meta';
import { getNodeThreatLevel, isNodeDangerous } from '../meta';
import { ORIGIN_TEMPLATES } from '../constants';
import { AudioService } from '../services';

interface OverlayPanelProps {
  /** 覆盖层显示类型 */
  type: OverlayType;
  // 主菜单数据
  onOpenSettings?: () => void;
  onInitGame?: (originId: string) => void;
  // 过场动画数据
  node?: NodeTemplate;
  nodeId?: string;
  onCutsceneComplete?: () => void;
  // 游戏结束数据
  deathReason?: string;
  onReset?: () => void;
  // 过渡 / 加载数据
  transitionText?: string;
  status?: string;
  modelName?: string;
  startTime?: number;
  error?: string;
  onCancel?: () => void;
}

//=============================================================================
// 常量与主题
//=============================================================================

/** 战斗风格语义映射，描述取自背景设定。 */
const COMBAT_STYLE_LABELS: Record<CombatStyle, { zh: string; desc: string }> = {
  burst: { zh: '爆发', desc: '高风险高回报——抓住转瞬即逝的窗口，倾泻毁灭性的输出。' },
  attack: { zh: '进攻', desc: '持续压制——以不间断的攻击瓦解敌方防线，不给喘息之机。' },
  balance: { zh: '均衡', desc: '攻防兼顾——在维持自身生存的同时为队友提供支援。' },
  defense: { zh: '防守', desc: '优先减伤与生存——将自身铸成不可逾越的壁垒。' },
  skirmish: { zh: '游击', desc: '机动、骚扰、消耗——在阴影中游走，避免正面交锋。' },
};

/** 各覆盖层类型的背景氛围主题。 */
const TYPE_THEME: Record<
  OverlayType,
  { fog: string; core: string; particle: string; particleCount: number }
> = {
  menu: { fog: 'rgba(13,42,48,0.22)', core: 'rgba(8,51,68,0.10)', particle: 'bg-cyan-500/15', particleCount: 18 },
  cutscene: { fog: 'rgba(8,47,63,0.20)', core: 'rgba(15,118,110,0.08)', particle: 'bg-cyan-400/20', particleCount: 14 },
  gameover: { fog: 'rgba(69,10,10,0.26)', core: 'rgba(127,29,29,0.12)', particle: 'bg-red-500/25', particleCount: 30 },
  transition: { fog: 'rgba(24,24,27,0.30)', core: 'rgba(63,63,70,0.08)', particle: 'bg-zinc-400/15', particleCount: 10 },
  zone_gen: { fog: 'rgba(24,24,27,0.30)', core: 'rgba(8,51,68,0.10)', particle: 'bg-zinc-400/15', particleCount: 12 },
};

/** 六维属性显示名，键名严格对齐 AttributeType。 */
const ATTRIBUTE_LABELS: Record<AttributeType, string> = {
  strength: '力量',
  agility: '敏捷',
  wisdom: '智慧',
  awareness: '感知',
  will: '意志',
  cthulhu: '不可知',
};

/** 最大体征显示名，键名严格对齐 VitalType。 */
const VITAL_LABELS: Record<VitalType, string> = {
  maxHp: '生命',
  maxSanity: '理智',
  maxStamina: '体力',
  maxVigor: '精力',
};

/** 读数条刻度上限（参照数值设计规范：属性 50 为佼佼者线，体征 300 为极其优秀线）。 */
const ATTRIBUTE_BAR_MAX = 50;
const VITAL_BAR_MAX = 300;

/** 深渊基金会档案碎片，用于主菜单底栏轮播。 */
const LORE_FRAGMENTS: Array<{ text: string; ref: string }> = [
  { text: '现实是一层薄膜。我们只是终于学会了撕开它。', ref: 'AF-0001' },
  { text: '降临需要一个"锚"。一百亿人的尖叫，就是邀请函。', ref: 'AF-0112' },
  { text: '神经链接仪能过滤视觉与听觉，但它无法过滤理解。', ref: 'AF-0307' },
  { text: '大多数清理人不是死于怪物。是死于看见。', ref: 'AF-0344' },
  { text: '他们管这叫"第二次看见"。', ref: 'AF-0345' },
  { text: '世界并未在一天之内毁灭。这是一场被精心策划的降临。', ref: 'AF-0002' },
];

//=============================================================================
// 内部工具
//=============================================================================

/** 四角框线装饰。父容器需 relative / 定位上下文。 */
const Corners: React.FC<{ className?: string }> = ({ className = 'border-zinc-600/70' }) => (
  <>
    <span aria-hidden className={`pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t ${className}`} />
    <span aria-hidden className={`pointer-events-none absolute right-0 top-0 h-3 w-3 border-r border-t ${className}`} />
    <span aria-hidden className={`pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b border-l ${className}`} />
    <span aria-hidden className={`pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b border-r ${className}`} />
  </>
);

/** 数值读数条：标签 + 刻度槽 + 数值。 */
const ReadoutBar: React.FC<{
  label: string;
  value: number;
  max: number;
  barClass?: string;
}> = ({ label, value, max, barClass = 'bg-cyan-500/70' }) => {
  const pct = Math.min(100, Math.max(0, (value / Math.max(1, max)) * 100));
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 shrink-0 font-mono text-[9px] tracking-[0.2em] text-zinc-500">{label}</span>
      <div className="h-1 flex-1 overflow-hidden bg-zinc-800/80">
        <div className={`h-full ${barClass} transition-all duration-700 ease-out`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right font-mono text-[10px] tabular-nums text-zinc-300">{value}</span>
    </div>
  );
};

/**
 * 分阶段揭示。
 * delays 为累计绝对毫秒：stage 将在每个时间点推进至对应序号 + 1。
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

/** 实时时钟，用于诊断栏等活体读数。 */
const useNow = (intervalMs: number = 1000): Date => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
};

/** 循环轮播索引。 */
const useRotatingIndex = (length: number, intervalMs: number): number => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % length), intervalMs);
    return () => clearInterval(id);
  }, [length, intervalMs]);
  return index;
};

//=============================================================================
// 分发器
//=============================================================================

const OverlayPanel: React.FC<OverlayPanelProps> = (props) => {
  const { type } = props;

  if (type === 'menu') {
    return <MainMenuContent {...props} />;
  }

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
        {type === 'transition' && <TransitionContent {...props} />}
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

//=============================================================================
// 共享背景特效层
//=============================================================================

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

//=============================================================================
// 主菜单：幸存者档案终端
//=============================================================================

const MainMenuContent: React.FC<OverlayPanelProps> = ({ onOpenSettings, onInitGame }) => {
  const origins = ORIGIN_TEMPLATES as OriginTemplate[];
  const [selectedOriginId, setSelectedOriginId] = useState<string>(() => origins[0]?.id ?? '');
  const now = useNow();
  const fragmentIndex = useRotatingIndex(LORE_FRAGMENTS.length, 6000);
  const fragment = LORE_FRAGMENTS[fragmentIndex];

  const selected = origins.find((origin) => origin.id === selectedOriginId) ?? origins[0];
  if (!selected) return null;

  const selectedStyle = COMBAT_STYLE_LABELS[selected.player.style];
  const attribute = selected.player.initialState.attribute;
  const vital = selected.player.initialState.vital;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-[#05060b] font-serif">
      <BackgroundEffects type="menu" />
      <div className="overlay-scanlines pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.7)_100%)]" />

      {/* 顶部诊断栏 */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-4 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-600 md:px-10">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse bg-red-600" />
          ABYSS_FOUNDATION // SURFACE_ACCESS_TERMINAL
        </div>
        <div className="hidden items-center gap-6 md:flex">
          <span>
            SURFACE_TIME {now.toISOString().slice(0, 10)}{' '}
            {now.toLocaleTimeString('zh-CN', { hour12: false })}
          </span>
          <span className="text-cyan-700">SIGNAL_DEGRADED</span>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex h-full w-full max-w-[1500px] flex-col justify-center gap-10 px-6 pb-14 pt-16 md:px-10 lg:flex-row lg:items-center lg:gap-14">
        {/* 左栏：标题与档案名册 */}
        <section className="flex w-full flex-col lg:w-[54%]">
          <h1 className="mt-3 text-7xl font-bold leading-[0.88] tracking-tighter text-zinc-100 md:text-8xl xl:text-[10rem]">
            THE
            <br />
            <span className="text-red-600 text-glow-red">ZONE</span>
          </h1>
          <p className="mt-5 max-w-md text-sm italic leading-relaxed text-zinc-500">
            无尽领域——"现实是一层薄膜。我们只是终于学会了撕开它。"
          </p>

          <div className="mt-10 flex items-center gap-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-zinc-500">
              幸存者档案 [{origins.length}]
            </span>
            <span className="h-px flex-1 bg-zinc-800" />
          </div>

          <div className="mt-4 flex flex-col">
            {origins.map((origin, index) => {
              const active = origin.id === selectedOriginId;
              const style = COMBAT_STYLE_LABELS[origin.player.style];
              return (
                <button
                  key={origin.id}
                  onMouseEnter={() => {
                    if (!active) AudioService.playSfx('ui_hover');
                  }}
                  onClick={() => {
                    if (!active) {
                      setSelectedOriginId(origin.id);
                      AudioService.playSfx('ui_click');
                    }
                  }}
                  className={`group flex items-center gap-4 border-l-2 px-4 py-3 text-left transition-all duration-300 ${active
                    ? 'border-red-600 bg-red-950/20'
                    : 'border-zinc-800/80 hover:translate-x-1 hover:border-zinc-600 hover:bg-white/[0.02]'
                    }`}
                >
                  <span className={`font-mono text-[10px] ${active ? 'text-red-500' : 'text-zinc-700'}`}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={`text-xl font-bold tracking-tight ${active ? 'text-zinc-100' : 'text-zinc-500 group-hover:text-zinc-300'
                      }`}
                  >
                    {origin.title}
                  </span>
                  <span
                    className={`ml-auto border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.3em] ${active ? 'border-red-800 text-red-400' : 'border-zinc-800 text-zinc-600'
                      }`}
                  >
                    {style.zh}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 右栏：选中档案详情 + 启动控制 */}
        <aside className="flex w-full flex-col gap-5 lg:w-[46%]">
          <div className="relative border border-zinc-800/90 bg-black/45 p-6 md:p-7">
            <Corners className="border-zinc-600/70" />
            <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.35em] text-zinc-600">
              <span>FILE // {selected.id.toUpperCase()}</span>
              <span className="flex items-center gap-1.5 text-cyan-700">
                <span className="h-1 w-1 animate-pulse rounded-full bg-cyan-500" />
                LINK_STANDBY
              </span>
            </div>

            <h2 className="mt-4 text-4xl font-bold tracking-tight text-zinc-100 md:text-5xl">
              {selected.title}
            </h2>
            <div className="mt-3">
              <span className="border border-red-900/70 bg-red-950/30 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.3em] text-red-400">
                战斗风格 · {selectedStyle.zh}
              </span>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-zinc-400">{selected.desc}</p>
            <p className="mt-3 text-xs italic text-zinc-600">{selectedStyle.desc}</p>

            {/* 六维修正基数 */}
            <div className="mt-5 flex flex-col gap-1.5 border-t border-zinc-800/70 pt-4">
              {(Object.keys(ATTRIBUTE_LABELS) as AttributeType[]).map((key) => (
                <ReadoutBar
                  key={key}
                  label={ATTRIBUTE_LABELS[key]}
                  value={attribute[key]}
                  max={ATTRIBUTE_BAR_MAX}
                  barClass="bg-red-500/60"
                />
              ))}
            </div>

            {/* 生存指标上限 */}
            <div className="mt-3 flex flex-col gap-1.5 border-t border-zinc-800/70 pt-4">
              {(Object.keys(VITAL_LABELS) as VitalType[]).map((key) => (
                <ReadoutBar
                  key={key}
                  label={VITAL_LABELS[key]}
                  value={vital[key]}
                  max={VITAL_BAR_MAX}
                  barClass="bg-cyan-500/60"
                />
              ))}
            </div>

            {selected.companion && selected.companion.length > 0 && (
              <div className="mt-5 flex items-center gap-3 border-t border-zinc-800/70 pt-4">
                <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-zinc-600">同行者</span>
                <span className="font-mono text-[11px] text-zinc-400">
                  {selected.companion.map((companion) => companion.name).join(' / ')}
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                AudioService.playSfx('ui_click');
                onOpenSettings?.();
              }}
              className="flex-1 border border-zinc-700/80 bg-zinc-950/40 py-4 font-mono text-[11px] uppercase tracking-[0.35em] text-zinc-400 transition-all duration-300 hover:border-cyan-600/70 hover:text-cyan-400"
            >
              系统配置
            </button>
            <button
              onClick={() => {
                AudioService.playSfx('zone_enter');
                onInitGame?.(selectedOriginId);
              }}
              className="group relative flex-[2] overflow-hidden border border-red-900/60 bg-red-950/25 py-4 text-lg font-bold uppercase tracking-[0.3em] text-red-500 transition-all duration-300 hover:border-red-500 hover:bg-red-900/35 hover:text-red-200 hover:shadow-[0_0_28px_rgba(220,38,38,0.25)]"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-red-500/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative z-10">启动序列</span>
            </button>
          </div>
        </aside>
      </main>

      {/* 底栏：档案碎片轮播 */}
      <footer className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-6 px-6 py-4 font-mono text-[9px] uppercase tracking-[0.3em] text-zinc-700/80 md:px-10">
        <span className="shrink-0">AI-DIRECTED SURVIVAL HORROR</span>
        <span
          key={fragmentIndex}
          className="hidden min-w-0 flex-1 truncate text-right normal-case tracking-[0.15em] text-zinc-600 animate-fade-in md:inline"
        >
          "{fragment.text}" —— 内部备忘录 {fragment.ref}
        </span>
      </footer>
    </div>
  );
};

//=============================================================================
// 过场：扇区进入
//=============================================================================

const CutsceneContent: React.FC<OverlayPanelProps> = ({ node, nodeId, onCutsceneComplete }) => {
  const [stage, setStage] = useState(0);
  const [glitchActive, setGlitchActive] = useState(false);

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

    const run = async () => {
      await wait(150);
      if (!alive) return;
      AudioService.playSfx('node_transition');
      setGlitchActive(true);
      await wait(220);
      if (!alive) return;
      setGlitchActive(false);
      await wait(120);
      if (!alive) return;
      setStage(1);
      AudioService.playSfx('zone_enter');
      await wait(1000);
      if (!alive) return;
      setStage(2);
      AudioService.playSfx('typing_1');
      await wait(800);
      if (!alive) return;
      setStage(3);
    };

    run();
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, [node, nodeId]);

  if (!node) return null;

  const threat = getNodeThreatLevel(node);
  const hasThreat = isNodeDangerous(node);
  /** 由威胁等级派生的现实薄膜完整度读数。 */
  const membrane = Math.max(4, Math.round(100 - threat * 4.7));

  return (
    <div
      className={`relative flex h-full w-full cursor-pointer select-none items-center justify-center p-8 ${glitchActive ? 'animate-glitch-shake' : ''
        }`}
      onClick={stage >= 3 ? onCutsceneComplete : undefined}
    >
      {/* 巨型水印 */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <span className="font-mono text-[22vw] font-bold uppercase text-white/[0.025]">
          {(nodeId ?? 'zone').slice(0, 6)}
        </span>
      </div>

      {/* 左侧竖向导轨 */}
      <div className="pointer-events-none absolute left-6 top-1/2 hidden -translate-y-1/2 md:block">
        <span className="font-mono text-[9px] uppercase tracking-[0.6em] text-cyan-700/70 [writing-mode:vertical-rl]">
          SECTOR_ENTRY // {nodeId ?? 'UNKNOWN'}
        </span>
      </div>

      {/* 右侧威胁导轨 */}
      <div className="pointer-events-none absolute right-6 top-1/2 hidden -translate-y-1/2 md:block">
        <span
          className={`font-mono text-[9px] uppercase tracking-[0.6em] [writing-mode:vertical-rl] ${!hasThreat
            ? 'text-emerald-700/70'
            : threat >= 10
              ? 'text-red-600/80'
              : 'text-amber-600/80'
            }`}
        >
          {hasThreat ? (threat > 0 ? `THREAT_LEVEL ${threat.toFixed(1)}` : 'THREAT_DETECTED') : 'SAFE_NODE'}
        </span>
      </div>

      <div className="flex w-full max-w-5xl flex-col items-center">
        <div
          className={`transition-all duration-1000 ${stage >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
            }`}
        >
          <div className="mb-4 flex items-center justify-center gap-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-cyan-500/50" />
            <span className="font-mono text-[10px] uppercase tracking-[0.5em] text-cyan-500/60">
              Sector Entry
            </span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-cyan-500/50" />
          </div>
          <h1
            className={`text-center font-serif text-5xl font-bold tracking-tight text-zinc-100 md:text-7xl ${stage >= 1 ? 'animate-text-glow' : ''
              }`}
          >
            {node.name}
          </h1>
          <div className="mt-3 flex items-center justify-center gap-3">
            <span className="font-mono text-[10px] tracking-[0.3em] text-zinc-600">
              {nodeId?.toUpperCase()}
            </span>
            {hasThreat ? (
              <span
                className={`border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.25em] ${threat >= 10 || threat <= 0
                  ? 'border-red-900/70 bg-red-950/30 text-red-500'
                  : threat >= 5
                    ? 'border-amber-900/70 bg-amber-950/30 text-amber-400'
                    : 'border-emerald-900/70 bg-emerald-950/30 text-emerald-400'
                  }`}
              >
                {threat > 0 ? `威胁 ${threat.toFixed(1)}` : '固定遭遇'}
              </span>
            ) : null}
            <span className="font-mono text-[9px] tracking-[0.25em] text-zinc-600">
              MEMBRANE_INTEGRITY {membrane}%
            </span>
          </div>
        </div>

        <div
          className={`mt-8 max-w-3xl transition-all duration-700 ${stage >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
        >
          <p className="text-center font-serif text-lg italic leading-relaxed text-zinc-300">{node.desc}</p>
        </div>

        <div
          className={`mt-12 transition-all duration-500 ${stage >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
        >
          <div className="group relative overflow-hidden border border-cyan-800/50 bg-cyan-950/25 px-8 py-3 transition-all duration-300 hover:border-cyan-600/60 hover:bg-cyan-900/35">
            <Corners className="border-cyan-700/60" />
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <span className="relative z-10 font-mono text-xs uppercase tracking-[0.3em] text-cyan-400 transition-colors group-hover:text-cyan-300">
              开始探索
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

//=============================================================================
// 游戏结束：链接终止
//=============================================================================

const GameOverContent: React.FC<OverlayPanelProps> = ({ deathReason, onReset }) => {
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

//=============================================================================
// 过渡
//=============================================================================

const TransitionContent: React.FC<OverlayPanelProps> = ({ transitionText }) => (
  <div className="flex flex-col items-center justify-center">
    <div className="font-mono text-sm uppercase tracking-[0.4em] text-cyan-500 animate-pulse">
      {transitionText || 'LOADING...'}
    </div>
    <div className="mt-5 h-1 w-40 overflow-hidden rounded bg-zinc-800">
      <div className="h-full w-1/2 bg-cyan-500 animate-loading-bar" />
    </div>
    <div className="mt-6 flex items-center gap-1.5 font-mono text-sm text-zinc-600">
      {[0, 1, 2].map((i) => (
        <span key={i} className="animate-pulse" style={{ animationDelay: `${i * 0.25}s` }}>
          &gt;
        </span>
      ))}
    </div>
    <div className="mt-4 font-mono text-[9px] uppercase tracking-[0.35em] text-zinc-600">
      SIGNAL_REROUTING // PLEASE_REMAIN_CALM
    </div>
  </div>
);

//=============================================================================
// 生成 / 加载
//=============================================================================

const GenerationContent: React.FC<OverlayPanelProps> = ({ status, modelName, startTime, error, onCancel }) => {
  const [elapsed, setElapsed] = useState(0);
  const [seed, setSeed] = useState(0);

  useEffect(() => {
    if (!startTime) return;
    const intervalId = setInterval(() => setElapsed(Date.now() - startTime), 50);
    return () => clearInterval(intervalId);
  }, [startTime]);

  /** 内存地址流：掩盖生成延迟的活体读数。 */
  useEffect(() => {
    const intervalId = setInterval(() => setSeed((s) => s + 1), 180);
    return () => clearInterval(intervalId);
  }, []);

  const hexDump = useMemo(
    () =>
      Array.from({ length: 6 }, () =>
        Math.floor(Math.random() * 0xffff)
          .toString(16)
          .padStart(4, '0')
      )
        .join(' ')
        .toUpperCase(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed]
  );

  const formatElapsed = (ms: number): string => `${(ms / 1000).toFixed(2)}s`;
  const formatStatus = (value: string): string =>
    (value.split('::')[0] ?? '').replace(/_/g, ' ').trim() || 'WORLD CONSTRUCTION';

  const headline = status ? formatStatus(status) : 'WORLD CONSTRUCTION';
  const detail = status && status !== headline ? status : 'PROCESSING NEURAL MATRIX...';

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-7 px-6">
      <div className="flex items-center gap-2 border border-zinc-700/50 bg-zinc-800/50 px-3 py-1.5">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-400">
          RUNNING_ON // {modelName || 'UNKNOWN_MODEL'}
        </span>
      </div>

      <div className="flex flex-col items-center gap-6 text-center">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-zinc-800" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-t-zinc-200 border-r-zinc-200 border-b-transparent border-l-transparent" />
        </div>
        <div className="space-y-2">
          <h2 className="font-serif text-2xl font-bold tracking-tight text-zinc-100">{headline}</h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">{detail}</p>
        </div>
      </div>

      <div className="w-full">
        <div className="h-px w-full overflow-hidden bg-zinc-800">
          <div className="h-full w-1/3 bg-cyan-500/60 animate-loading-bar" />
        </div>
        <div className="mt-2 flex items-center justify-between font-mono text-xs tabular-nums text-zinc-600">
          <span className="text-[9px] tracking-[0.2em] text-zinc-700">MEM 0x{hexDump}</span>
          <span>{formatElapsed(elapsed)}</span>
        </div>
      </div>

      {error && (
        <div className="relative w-full border border-red-900/50 bg-red-950/20 p-4 text-center font-mono text-sm text-red-400">
          <Corners className="border-red-800/60" />
          ERROR :: {error}
        </div>
      )}

      {onCancel && (
        <button
          onClick={() => {
            AudioService.playSfx('ui_click');
            onCancel();
          }}
          className="border border-transparent px-6 py-2 font-mono text-xs font-medium text-zinc-500 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-800/50 hover:text-zinc-300"
        >
          CANCEL_OPERATION
        </button>
      )}
    </div>
  );
};

export default OverlayPanel;