/**
 * MenuPanel —— 主菜单：深渊基金会地表终端 · 幸存者档案库
 * 重大重构稿：三栏机要档案库布局（名册 / 卷宗 / 遥测），
 * 数值可视化对齐世界观十阶属性阶梯与七档体征标尺。
 * 性能约定：只动 opacity 与 transform；禁用 blur / backdrop-filter；
 * 活体读数（时钟、轮播、解码标题）均隔离为独立组件，避免整屏重渲染。
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { AttributeType, CombatStyle, ItemInstance, OriginTemplate, VitalType } from '../contract';
import { ORIGIN_TEMPLATES } from '../constants';
import { AudioService } from '../services';

// ============================================================================
// 1. 契约入参
// ============================================================================
export interface MenuPanelProps {
    /** 确认起源后启动游戏。缺省时启动序列按钮禁用。 */
    onInitGame?: (originId: string) => void;
}

// ============================================================================
// 2. 静态标签与世界观标尺
// ============================================================================
/** 六维属性显示名，键名严格对齐 AttributeType。 */
const ATTRIBUTE_LABELS: Record<AttributeType, string> = {
    strength: '力量',
    agility: '敏捷',
    wisdom: '智慧',
    awareness: '觉知',
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

/** 战斗风格语义，描述取自背景设定。 */
const COMBAT_STYLE_LABELS: Record<CombatStyle, { zh: string; code: string; desc: string }> = {
    burst: { zh: '爆发', code: 'BURST', desc: '精于计算敌方致命破绽，在单个行动轮内耗尽 AP 与战术爆发，打出致死过量杀伤。' },
    attack: { zh: '进攻', code: 'ATTACK', desc: '崇尚持续性的物理压制与高频弹幕覆盖，步步紧逼，掌控战线主动权。' },
    balance: { zh: '均衡', code: 'BALANCE', desc: '攻防一体，根据战场掩体分布与敌方意图动态调整 AP 支出，环境容错率极佳。' },
    defense: { zh: '防守', code: 'DEFENSE', desc: '依托重装护盾与深层掩体，专注削减所受伤害，蓄积动量差静待防守反击。' },
    skirmish: { zh: '游击', code: 'SKIRMISH', desc: '依托极高的敏捷与穿梭战术，在多轨道间高速拉扯，以骚扰与流血消耗敌方锐气。' },
};

/** 战术类别显示名，键名对齐 TacticType。 */
const TACTIC_TYPE_LABELS: Record<string, string> = {
    A: '攻击',
    D: '防御',
    U: '辅助',
};

/** 装备位显示名，键名对齐 ItemTemplate['type']。 */
const GEAR_SLOT_LABELS: Record<string, string> = {
    weapon: '武器',
    armor: '护甲',
    accessory: '饰品',
    storage: '容器',
    consumable: '消耗',
    data: '数据',
    material: '材料',
};

/** 属性十档阶梯（0~100 平衡标准），用于阶位标注。 */
const ATTRIBUTE_TIERS: Array<{ max: number; label: string }> = [
    { max: 5, label: '残废' },
    { max: 10, label: '较弱' },
    { max: 20, label: '常人' },
    { max: 30, label: '较强' },
    { max: 40, label: '很强' },
    { max: 50, label: '佼佼者' },
    { max: 60, label: '超凡' },
    { max: 70, label: '灾厄' },
    { max: 80, label: '灭绝' },
    { max: Infinity, label: '神性' },
];

/** 体征七档标尺（50~500+），用于刻度与境界标注。 */
const VITAL_TIERS: Array<{ max: number; label: string }> = [
    { max: 50, label: '残废' },
    { max: 100, label: '普通人' },
    { max: 200, label: '优秀' },
    { max: 300, label: '极其优秀' },
    { max: 400, label: '令人震惊' },
    { max: 500, label: '绝无仅有' },
    { max: Infinity, label: '神的境界' },
];

/** 读数条刻度上限：属性以佼佼者线为满刻度，体征以绝无仅有线为满刻度。 */
const ATTRIBUTE_BAR_MAX = 50;
const VITAL_BAR_MAX = 500;
/** 体征尺上的境界刻度位置（百分比）。 */
const VITAL_TICKS = [10, 20, 40, 60, 80];

const tierOf = (tiers: Array<{ max: number; label: string }>, value: number): string =>
    (tiers.find((t) => value <= t.max) ?? tiers[tiers.length - 1]).label;

/** 深渊基金会档案碎片，用于底栏轮播。 */
const LORE_FRAGMENTS: Array<{ text: string; ref: string }> = [
    { text: '现实是一层薄膜。我们只是终于学会了撕开它。', ref: 'AF-0001' },
    { text: '降临需要一个锚。一百亿人的尖叫，就是邀请函。', ref: 'AF-0112' },
    { text: '神经链接仪能过滤视觉与听觉，但它无法过滤理解。', ref: 'AF-0307' },
    { text: '大多数清理人不是死于怪物。是死于看见。', ref: 'AF-0344' },
    { text: '他们管这叫第二次看见。', ref: 'AF-0345' },
    { text: '世界并未在一天之内毁灭。这是一场被精心策划的降临。', ref: 'AF-0002' },
];

// ============================================================================
// 3. 样式（面板自持，随卸载移除）
// ============================================================================
/**
 * 主菜单专用样式。
 * Tailwind 以 CDN 方式加载，未附带 tailwindcss-animate，
 * 故入场 / 雾 drift / 扫掠 / 解码等效果以原生 keyframes 提供。
 * 性能约定：只动 opacity 与 transform；雾层与扫掠线交由合成器。
 */
const MENU_STYLE = `
@keyframes menu-rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes menu-slide {
  from { opacity: 0; transform: translateX(-14px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes menu-scan-y {
  0% { transform: translateY(-100%); opacity: 0; }
  12% { opacity: 0.55; }
  88% { opacity: 0.55; }
  100% { transform: translateY(100%); opacity: 0; }
}
@keyframes menu-fog-a {
  0%, 100% { transform: translate3d(-3%, -2%, 0); }
  50% { transform: translate3d(3%, 3%, 0); }
}
@keyframes menu-fog-b {
  0%, 100% { transform: translate3d(3%, 2%, 0); }
  50% { transform: translate3d(-3%, -3%, 0); }
}
@keyframes menu-sweep {
  0% { transform: translateY(-2vh); opacity: 0; }
  6% { opacity: 1; }
  94% { opacity: 1; }
  100% { transform: translateY(102vh); opacity: 0; }
}
@keyframes menu-sigil-spin {
  to { transform: rotate(360deg); }
}
@keyframes menu-flicker {
  0%, 90%, 93%, 97%, 100% { opacity: 1; }
  91% { opacity: 0.55; }
  95% { opacity: 0.78; }
}
.menu-rise { animation: menu-rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
.menu-slide { animation: menu-slide 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
.menu-scan-y { animation: menu-scan-y 5.4s linear infinite; }
.menu-fog-a { animation: menu-fog-a 28s ease-in-out infinite; will-change: transform; }
.menu-fog-b { animation: menu-fog-b 36s ease-in-out infinite; will-change: transform; }
.menu-sweep { animation: menu-sweep 12s linear infinite; will-change: transform; }
.menu-sigil-spin { animation: menu-sigil-spin 26s linear infinite; transform-origin: 60px 60px; }
.menu-flicker { animation: menu-flicker 7.5s steps(1, end) infinite; }
.menu-vtext { writing-mode: vertical-rl; text-orientation: mixed; }
.menu-scanlines {
  background-image: repeating-linear-gradient(0deg, rgba(255,255,255,0.028) 0 1px, transparent 1px 3px);
}
.menu-noise {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E");
}
.menu-hazard {
  background-image: repeating-linear-gradient(-45deg, rgba(239,68,68,0.14) 0 10px, transparent 10px 20px);
}
@media (prefers-reduced-motion: reduce) {
  .menu-rise, .menu-slide, .menu-scan-y, .menu-fog-a, .menu-fog-b,
  .menu-sweep, .menu-sigil-spin, .menu-flicker { animation: none !important; }
}
`;

// ============================================================================
// 4. 局部 UI 原子与工具
// ============================================================================
/** 套准十字（印刷注册标记）。 */
const RegMark: React.FC<{ className: string }> = ({ className }) => (
    <span aria-hidden className={`pointer-events-none absolute h-3 w-3 ${className}`}>
        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-zinc-700/50" />
        <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-zinc-700/50" />
    </span>
);

/** 小节标题：标签 + 发丝线 + 右侧附注。 */
const SectionLabel: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({ children, right }) => (
    <div className="mb-3 flex items-baseline gap-3">
        <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.35em] text-zinc-500">{children}</span>
        <span className="h-px flex-1 bg-zinc-900" />
        {right ? <span className="shrink-0 font-mono text-[9px] tracking-[0.2em] text-zinc-700">{right}</span> : null}
    </div>
);

/** 速览指标格（发丝网格单元）。 */
const MetaCell: React.FC<{ label: string; value: string; tone?: 'default' | 'danger' }> = ({ label, value, tone = 'default' }) => (
    <div className="bg-[#07080c] px-4 py-3">
        <div className="font-mono text-[8px] uppercase tracking-[0.3em] text-zinc-600">{label}</div>
        <div className={`mt-1.5 truncate text-[13px] ${tone === 'danger' ? 'text-red-400' : 'text-zinc-200'}`} title={value}>
            {value}
        </div>
    </div>
);

/** 六维读数尺：十段阶梯 + 阶位标注。 */
const AttributeMeter: React.FC<{ label: string; value: number; peak: boolean }> = ({ label, value, peak }) => {
    const pct = Math.min(100, Math.max(0, (value / ATTRIBUTE_BAR_MAX) * 100));
    return (
        <div className="flex items-center gap-3">
            <span className={`w-9 shrink-0 font-mono text-[9px] tracking-[0.2em] ${peak ? 'text-amber-300' : 'text-zinc-600'}`}>
                {label}
            </span>
            <div className="relative h-[6px] flex-1 overflow-hidden bg-zinc-900/90">
                <div className="absolute inset-0 flex">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <span key={i} className="flex-1 border-r border-black/70 last:border-r-0" />
                    ))}
                </div>
                <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-900 to-red-500 transition-[width] duration-500 ease-out"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className={`w-6 shrink-0 text-right font-mono text-[10px] tabular-nums ${peak ? 'text-amber-200' : 'text-zinc-300'}`}>
                {value}
            </span>
            <span className="w-12 shrink-0 text-right font-mono text-[9px] tracking-[0.15em] text-zinc-600">
                {tierOf(ATTRIBUTE_TIERS, value)}
            </span>
        </div>
    );
};

/** 体征读数尺：七档标尺刻度 + 境界标注。 */
const VitalMeter: React.FC<{ label: string; value: number }> = ({ label, value }) => {
    const pct = Math.min(100, Math.max(0, (value / VITAL_BAR_MAX) * 100));
    return (
        <div className="flex items-center gap-3">
            <span className="w-9 shrink-0 font-mono text-[9px] tracking-[0.2em] text-zinc-600">{label}</span>
            <div className="relative h-[6px] flex-1 overflow-hidden bg-zinc-900/90">
                {VITAL_TICKS.map((tick) => (
                    <span key={tick} className="absolute inset-y-0 w-px bg-black/70" style={{ left: `${tick}%` }} />
                ))}
                <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-900/80 to-cyan-400/80 transition-[width] duration-500 ease-out"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="w-8 shrink-0 text-right font-mono text-[10px] tabular-nums text-zinc-300">{value}</span>
            <span className="w-16 shrink-0 text-right font-mono text-[9px] tracking-[0.15em] text-zinc-600">
                {tierOf(VITAL_TIERS, value)}
            </span>
        </div>
    );
};

/** 起源徽记：按庇护所谱系切换的几何纹章（纯 SVG 线稿）。 */
const OriginSigil: React.FC<{ variant: number; className?: string }> = ({ variant, className }) => (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
        <g fill="none" stroke="currentColor" strokeWidth="1">
            <circle cx="60" cy="60" r="54" strokeOpacity="0.22" />
            <circle cx="60" cy="60" r="46" strokeOpacity="0.35" strokeDasharray="1 5" />
            <circle cx="60" cy="60" r="38" strokeOpacity="0.5" strokeDasharray="2 7" className="menu-sigil-spin" />
            {variant === 0 && (
                <g strokeOpacity="0.9">
                    <path d="M60 32 V88 M32 60 H88" />
                    <circle cx="60" cy="60" r="12" strokeOpacity="0.7" />
                    <path d="M48 48 L72 72 M72 48 L48 72" strokeOpacity="0.35" />
                </g>
            )}
            {variant === 1 && (
                <g strokeOpacity="0.9">
                    <path d="M38 80 L60 40 L82 80" />
                    <path d="M47 80 L60 56 L73 80" strokeOpacity="0.7" />
                    <path d="M30 88 H90" />
                    <path d="M60 40 V28" strokeOpacity="0.5" />
                </g>
            )}
            {variant === 2 && (
                <g strokeOpacity="0.9">
                    <path d="M60 30 L67 44 L60 58 L53 44 Z" />
                    <path d="M60 58 V92" />
                    <path d="M36 68 Q60 84 84 68" strokeOpacity="0.7" />
                    <path d="M42 60 Q60 72 78 60" strokeOpacity="0.4" />
                </g>
            )}
        </g>
    </svg>
);

/** 机要核验印章。 */
const Stamp: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="pointer-events-none absolute right-0 top-0 rotate-[-7deg] border-[3px] border-double border-red-800/60 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.4em] text-red-700/80">
        {children}
    </span>
);

/** 归一化装备位（契约允许单值或数组）。 */
const toArray = <T,>(value: T | T[] | null | undefined): T[] =>
    value == null ? [] : Array.isArray(value) ? value : [value];

/** 提取该起源的初始装备实例。 */
const collectGear = (origin: OriginTemplate): ItemInstance[] => {
    const equip = origin.player.initialState.equipState;
    if (!equip) return [];
    const raw: Array<ItemInstance | null | undefined> = [
        equip.weapons?.main,
        equip.weapons?.side,
        ...toArray(equip.armors),
        ...toArray(equip.accessories),
        ...toArray(equip.storage),
    ];
    return raw.filter((item): item is ItemInstance => Boolean(item));
};

/** 装备规格速读（按模板类型窄化）。 */
const gearSpec = (item: ItemInstance): string => {
    switch (item.type) {
        case 'weapon':
            return `DMG ${item.damage} / RNG ${item.range}`;
        case 'armor':
            return `DEF ${item.defense}`;
        case 'accessory':
        case 'consumable':
            return `${item.effects.length} EFF`;
        default:
            return `${item.size[0]}x${item.size[1]}`;
    }
};

/** 起源徽记谱系推断。 */
const sigilVariant = (origin: OriginTemplate, index: number): number => {
    const key = `${origin.id}_${origin.sanctuary.id}`.toLowerCase();
    if (key.includes('hospital') || key.includes('clinic')) return 0;
    if (key.includes('bunker') || key.includes('outpost') || key.includes('rust')) return 1;
    if (key.includes('archive') || key.includes('study') || key.includes('library')) return 2;
    return index % 3;
};

// ============================================================================
// 5. 局部计时钩子与隔离组件
// ============================================================================
const useClock = (intervalMs: number = 1000): Date => {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);
    return now;
};

const useRotator = (length: number, intervalMs: number): number => {
    const [index, setIndex] = useState(0);
    useEffect(() => {
        if (length <= 1) return;
        const id = setInterval(() => setIndex((i) => (i + 1) % length), intervalMs);
        return () => clearInterval(id);
    }, [length, intervalMs]);
    return index;
};

/** 字符解码动画：切换档案时标题由乱码收敛为真名。 */
const useScramble = (text: string, speedMs: number = 26): string => {
    const [out, setOut] = useState(text);
    useEffect(() => {
        if (!text) {
            setOut('');
            return;
        }
        const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789/#*+';
        const totalFrames = text.length * 2 + 6;
        let frame = 0;
        const id = window.setInterval(() => {
            frame += 1;
            const revealed = Math.floor((frame / totalFrames) * text.length);
            if (revealed >= text.length) {
                setOut(text);
                window.clearInterval(id);
                return;
            }
            let next = '';
            for (let i = 0; i < text.length; i += 1) {
                next += i < revealed ? text[i] : charset[Math.floor(Math.random() * charset.length)];
            }
            setOut(next);
        }, speedMs);
        return () => window.clearInterval(id);
    }, [text, speedMs]);
    return out;
};

/** 隔离组件：实时时钟，避免整屏重渲染。 */
const SurfaceClock: React.FC = () => {
    const now = useClock();
    return (
        <span className="tabular-nums">
            SURFACE_TIME {now.toISOString().slice(0, 10)} {now.toLocaleTimeString('zh-CN', { hour12: false })}
        </span>
    );
};

/** 隔离组件：档案碎片轮播。 */
const LoreFragment: React.FC = () => {
    const index = useRotator(LORE_FRAGMENTS.length, 6500);
    const fragment = LORE_FRAGMENTS[index];
    return (
        <span key={index} className="menu-rise hidden min-w-0 flex-1 truncate text-right normal-case tracking-[0.15em] text-zinc-600 md:block">
            "{fragment.text}" —— 内部备忘录 {fragment.ref}
        </span>
    );
};

/** 隔离组件：解码标题，重渲染范围仅限本 span。 */
const ScrambleTitle: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
    const out = useScramble(text);
    return <span className={className}>{out}</span>;
};

// ============================================================================
// 6. 主面板
// ============================================================================
export const MenuPanel: React.FC<MenuPanelProps> = ({ onInitGame }) => {
    const origins = ORIGIN_TEMPLATES as OriginTemplate[];
    const [selectedOriginId, setSelectedOriginId] = useState<string>(() => origins[0]?.id ?? '');
    const listRef = useRef<HTMLDivElement>(null);

    const selectedIndex = origins.findIndex((origin) => origin.id === selectedOriginId);
    const selected = origins[selectedIndex === -1 ? 0 : selectedIndex] as OriginTemplate | undefined;

    const select = useCallback(
        (origin: OriginTemplate) => {
            if (origin.id === selectedOriginId) return;
            AudioService.playSfx('ui_click');
            setSelectedOriginId(origin.id);
        },
        [selectedOriginId],
    );

    const move = useCallback(
        (delta: number) => {
            if (origins.length === 0) return;
            const current = origins.findIndex((origin) => origin.id === selectedOriginId);
            const next = origins[((current < 0 ? 0 : current) + delta + origins.length) % origins.length];
            if (next) select(next);
        },
        [origins, selectedOriginId, select],
    );

    const launch = useCallback(() => {
        if (!selected || !onInitGame) return;
        AudioService.playSfx('zone_enter');
        onInitGame(selected.id);
    }, [onInitGame, selected]);

    /** 键盘操作：方向键换档，数字直选，Home/End 跳转，Enter 启动。 */
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey || event.altKey || event.metaKey) return;
            const target = event.target as HTMLElement | null;
            if (target) {
                const tag = target.tagName.toUpperCase();
                if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;
            }
            if (/^[1-9]$/.test(event.key)) {
                const direct = origins[Number(event.key) - 1];
                if (direct) {
                    event.preventDefault();
                    select(direct);
                }
                return;
            }
            switch (event.key) {
                case 'ArrowDown':
                case 'ArrowRight':
                    event.preventDefault();
                    move(1);
                    break;
                case 'ArrowUp':
                case 'ArrowLeft':
                    event.preventDefault();
                    move(-1);
                    break;
                case 'Home':
                    event.preventDefault();
                    if (origins[0]) select(origins[0]);
                    break;
                case 'End':
                    event.preventDefault();
                    if (origins[origins.length - 1]) select(origins[origins.length - 1]);
                    break;
                case 'Enter':
                    event.preventDefault();
                    launch();
                    break;
                default:
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [move, launch, select, origins]);

    /** 键盘切换时把选中项拉回视野。 */
    useEffect(() => {
        if (!selectedOriginId) return;
        const row = listRef.current?.querySelector<HTMLElement>(`[data-origin="${selectedOriginId}"]`);
        row?.scrollIntoView({ block: 'nearest' });
    }, [selectedOriginId]);

    if (!selected) return null;

    const style = COMBAT_STYLE_LABELS[selected.player.style];
    const attribute = selected.player.initialState.attribute;
    const vital = selected.player.initialState.vital;
    const tactics = selected.player.initialState.uniqueTactic ?? [];
    const companions = selected.companion ?? [];
    const gear = collectGear(selected);
    const sanctuary = selected.sanctuary;
    const resources = sanctuary.initialState.necessaryResource;
    const sigil = sigilVariant(selected, selectedIndex < 0 ? 0 : selectedIndex);

    /** 该档案六维最强项，用于读数尺高亮。 */
    const peakAttribute = (Object.keys(ATTRIBUTE_LABELS) as AttributeType[]).reduce<AttributeType>(
        (best, key) => (attribute[key] > attribute[best] ? key : best),
        'strength',
    );

    return (
        <div className="fixed inset-0 z-[100] select-none overflow-hidden bg-[#040507] font-serif text-zinc-300">
            <style>{MENU_STYLE}</style>

            {/* ================= 氛围背景层 =================
          性能约束：雾层仅 transform 动画；噪点 / 扫描线 / 网格静态栅格化一次。 */}
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="menu-fog-a absolute -left-[20%] -top-[30%] h-[90vh] w-[90vw] bg-[radial-gradient(circle_at_center,rgba(127,29,29,0.20)_0%,transparent_65%)]" />
                <div className="menu-fog-b absolute -bottom-[35%] -right-[15%] h-[95vh] w-[85vw] bg-[radial-gradient(circle_at_center,rgba(8,51,68,0.22)_0%,transparent_65%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:72px_72px]" />
                <div className="menu-noise absolute inset-0 opacity-[0.05]" />
                <div className="menu-scanlines absolute inset-0" />
                <div className="menu-sweep absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/25 to-transparent" />
                <div className="absolute inset-0 shadow-[inset_0_0_200px_rgba(0,0,0,0.9)]" />
            </div>
            <RegMark className="left-3 top-3" />
            <RegMark className="right-3 top-3" />
            <RegMark className="bottom-3 left-3" />
            <RegMark className="bottom-3 right-3" />

            <div className="relative z-10 flex h-full flex-col">
                {/* ================= 顶部诊断栏 ================= */}
                <header className="flex shrink-0 items-center justify-between gap-6 px-6 py-3 font-mono text-[9px] uppercase tracking-[0.3em] text-zinc-600 md:px-10">
                    <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 animate-pulse bg-red-600" />
                        ABYSS_FOUNDATION
                        <span className="text-zinc-800">//</span>
                        SURFACE_ACCESS_TERMINAL
                    </div>
                    <div className="hidden items-center gap-6 md:flex">
                        <SurfaceClock />
                        <span className="flex items-center gap-1.5 text-cyan-700">
                            <span className="h-1 w-1 animate-pulse rounded-full bg-cyan-500" />
                            SIGNAL_DEGRADED
                        </span>
                    </div>
                </header>
                <div aria-hidden className="h-2 shrink-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.10)_0_1px,transparent_1px_14px)] opacity-60" />

                {/* ================= 主体三栏 ================= */}
                <main className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[300px_minmax(0,1fr)_380px] lg:overflow-hidden">
                    {/* ---------- 左栏：档案名册 ---------- */}
                    <nav className="menu-slide flex flex-col border-b border-zinc-900 lg:min-h-0 lg:border-b-0 lg:border-r">
                        <div className="flex">
                            <div className="hidden w-8 shrink-0 items-center justify-center border-r border-zinc-900/80 lg:flex">
                                <span className="menu-vtext font-mono text-[9px] tracking-[0.5em] text-zinc-800">
                                    SURVIVOR DOSSIER LIBRARY // 幸存者档案库
                                </span>
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col">
                                <div className="flex items-center justify-between px-5 py-3 font-mono text-[9px] uppercase tracking-[0.35em] text-zinc-600">
                                    <span>幸存者档案</span>
                                    <span className="tabular-nums text-zinc-700">{String(origins.length).padStart(2, '0')} FILES</span>
                                </div>
                                <div
                                    ref={listRef}
                                    role="listbox"
                                    aria-label="幸存者档案名册"
                                    aria-activedescendant={`origin-option-${selected.id}`}
                                    className="flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
                                >
                                    {origins.map((origin, index) => {
                                        const active = origin.id === selected.id;
                                        const rowStyle = COMBAT_STYLE_LABELS[origin.player.style];
                                        return (
                                            <button
                                                key={origin.id}
                                                type="button"
                                                id={`origin-option-${origin.id}`}
                                                data-origin={origin.id}
                                                role="option"
                                                aria-selected={active}
                                                onMouseEnter={() => {
                                                    if (!active) AudioService.playSfx('ui_hover');
                                                }}
                                                onClick={() => select(origin)}
                                                className={`group relative flex items-stretch border-l-2 text-left transition-colors duration-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500/60 ${active ? 'border-red-600 bg-red-950/25' : 'border-transparent hover:bg-white/[0.03]'
                                                    }`}
                                            >
                                                <span
                                                    className={`flex w-12 shrink-0 flex-col items-center justify-center border-r border-zinc-900/80 py-4 font-mono text-[10px] tabular-nums ${active ? 'text-red-500' : 'text-zinc-700'
                                                        }`}
                                                >
                                                    {String(index + 1).padStart(2, '0')}
                                                </span>
                                                <span className="min-w-0 flex-1 px-4 py-4">
                                                    <span
                                                        className={`block truncate text-lg font-bold tracking-tight ${active ? 'text-zinc-50' : 'text-zinc-500 group-hover:text-zinc-300'
                                                            }`}
                                                    >
                                                        {origin.title}
                                                    </span>
                                                    <span className="mt-1 block truncate font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-700">
                                                        {origin.sanctuary.name}
                                                    </span>
                                                </span>
                                                <span className="flex shrink-0 items-center pr-4">
                                                    <span
                                                        className={`border px-1.5 py-0.5 font-mono text-[9px] tracking-[0.3em] ${active ? 'border-red-800 text-red-400' : 'border-zinc-800 text-zinc-600'
                                                            }`}
                                                    >
                                                        {rowStyle.zh}
                                                    </span>
                                                </span>
                                                {active && (
                                                    <span
                                                        aria-hidden
                                                        className="menu-scan-y pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-red-500/20 to-transparent"
                                                    />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="hidden border-t border-zinc-900 px-5 py-4 font-mono text-[9px] leading-relaxed tracking-[0.2em] text-zinc-700 lg:block">
                                    <p>UP/DN 切换档案</p>
                                    <p>1-{origins.length} 直选 / HOME END 首末</p>
                                    <p className="text-red-900">ENTER</p>
                                </div>
                            </div>
                        </div>
                    </nav>

                    {/* ---------- 中栏：卷宗主视区 ---------- */}
                    <section className="relative flex min-w-0 flex-col lg:min-h-0 lg:overflow-y-auto">
                        <div className="relative px-6 pt-8 md:px-10">
                            <Stamp>深渊基金会 // 机要核验</Stamp>

                            {/* 卷宗抬头 */}
                            <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.3em] text-zinc-600">
                                <span className="text-red-500">FILE</span>
                                <span className="text-zinc-800">//</span>
                                <span>{selected.id.toUpperCase()}</span>
                                <span className="h-px flex-1 bg-zinc-900" />
                                <span className="flex items-center gap-1.5 text-cyan-700">
                                    <span className="h-1 w-1 animate-pulse rounded-full bg-cyan-500" />
                                    LINK_STANDBY
                                </span>
                            </div>

                            {/* 徽记 + 真名 */}
                            <div className="mt-10 flex items-start gap-8">
                                <OriginSigil variant={sigil} className="h-28 w-28 shrink-0 text-red-700/80 md:h-36 md:w-36" />
                                <div className="min-w-0">
                                    <ScrambleTitle
                                        text={selected.title}
                                        className="menu-flicker block text-5xl font-bold leading-[0.95] tracking-tight text-zinc-50 md:text-7xl"
                                    />
                                    <div className="mt-5 flex flex-wrap items-center gap-2">
                                        <span className="border border-red-900/70 bg-red-950/30 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.3em] text-red-400">
                                            战斗风格 // {style.zh} {style.code}
                                        </span>
                                        <span className="border border-zinc-800 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.3em] text-zinc-500">
                                            {selected.player.name}
                                        </span>
                                        {companions.length > 0 && (
                                            <span className="border border-cyan-900/60 bg-cyan-950/25 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.3em] text-cyan-400">
                                                携同伴 {companions.length}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <p className="mt-9 max-w-2xl text-sm leading-relaxed text-zinc-400">{selected.desc}</p>
                            <p className="mt-3 max-w-2xl text-xs italic leading-relaxed text-zinc-600">{style.desc}</p>

                            {/* 起始态势 */}
                            <div className="mt-10">
                                <SectionLabel right={`${sanctuary.nodesCount} NODES`}>起始态势 | OUTSET</SectionLabel>
                                <div className="grid grid-cols-2 gap-px border border-zinc-900 bg-zinc-900 sm:grid-cols-3">
                                    <MetaCell label="庇护所" value={sanctuary.name} />
                                    <MetaCell label="初始人口" value={String(sanctuary.initialState.population)} />
                                    <MetaCell label="食物 / 净水" value={`${resources.food} / ${resources.water}`} />
                                    <MetaCell label="初始侵蚀" value={String(sanctuary.initialState.erosion)} tone="danger" />
                                    <MetaCell label="入口节点" value={sanctuary.entrance} />
                                    <MetaCell label="时间流速" value={`x${sanctuary.dilationFactor.toFixed(2)}`} />
                                </div>
                            </div>
                        </div>

                        {/* 启动控制 */}
                        <div className="mt-auto px-6 pb-8 pt-12 md:px-10">
                            <button
                                type="button"
                                disabled={!onInitGame}
                                onClick={launch}
                                className="group relative w-full overflow-hidden border border-red-900/70 bg-red-950/20 py-5 font-mono text-base uppercase tracking-[0.45em] text-red-500 transition-colors duration-300 hover:border-red-500/80 hover:bg-red-900/25 hover:text-red-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-red-400/60 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <span aria-hidden className="menu-hazard absolute inset-0" />
                                <span
                                    aria-hidden
                                    className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-red-500/15 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                                />
                                <span className="relative z-10">进入区域</span>
                                <span className="relative z-10 ml-4 text-[10px] tracking-[0.3em] text-red-900 transition-colors group-hover:text-red-500">
                                    [ENTER]
                                </span>
                            </button>
                            <p className="mt-3 text-center font-mono text-[9px] tracking-[0.3em] text-zinc-700">
                                按下 ENTER 以确认降下 // DESCENT CONFIRMATION REQUIRED
                            </p>
                        </div>
                    </section>

                    {/* ---------- 右栏：遥测区 ---------- */}
                    <aside className="menu-rise relative flex min-w-0 flex-col border-t border-zinc-900 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0">
                        <div className="flex flex-col gap-9 px-6 py-7">
                            {/* 六维 */}
                            <section>
                                <SectionLabel right={<span className="text-amber-600/80">峰值 {ATTRIBUTE_LABELS[peakAttribute]}</span>}>
                                    六维潜能 | ATTRIBUTE
                                </SectionLabel>
                                <div className="flex flex-col gap-2">
                                    {(Object.keys(ATTRIBUTE_LABELS) as AttributeType[]).map((key) => (
                                        <AttributeMeter key={key} label={ATTRIBUTE_LABELS[key]} value={attribute[key]} peak={key === peakAttribute} />
                                    ))}
                                </div>
                            </section>

                            {/* 体征上限 */}
                            <section>
                                <SectionLabel right="SCALE 50-500+">体征上限 | VITAL</SectionLabel>
                                <div className="flex flex-col gap-2">
                                    {(Object.keys(VITAL_LABELS) as VitalType[]).map((key) => (
                                        <VitalMeter key={key} label={VITAL_LABELS[key]} value={vital[key]} />
                                    ))}
                                </div>
                            </section>

                            {/* 初始装备 */}
                            {gear.length > 0 && (
                                <section>
                                    <SectionLabel right={`${gear.length} ITEMS`}>初始装备 | LOADOUT</SectionLabel>
                                    <div className="flex flex-col gap-1.5">
                                        {gear.map((item) => (
                                            <div
                                                key={item.instanceId}
                                                title={item.desc}
                                                className="flex min-w-0 items-center gap-2 border border-zinc-900 bg-black/40 px-3 py-2"
                                            >
                                                <span className="w-10 shrink-0 font-mono text-[8px] uppercase tracking-[0.2em] text-zinc-600">
                                                    {GEAR_SLOT_LABELS[item.type] ?? item.type}
                                                </span>
                                                <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-300">{item.name}</span>
                                                <span className="shrink-0 font-mono text-[8px] tabular-nums tracking-[0.15em] text-zinc-600">
                                                    {gearSpec(item)}
                                                </span>
                                                <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.15em] text-zinc-700">
                                                    {item.grade}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* 独有战术 */}
                            {tactics.length > 0 && (
                                <section>
                                    <SectionLabel right={`${tactics.length} DOCTRINES`}>独有战术 | TACTIC</SectionLabel>
                                    <div className="flex flex-col gap-1.5">
                                        {tactics.map((tactic) => (
                                            <div
                                                key={tactic.id}
                                                title={tactic.desc}
                                                className="flex min-w-0 items-center gap-2 border-l-2 border-zinc-800 bg-black/30 px-3 py-2"
                                            >
                                                <span className="shrink-0 border border-zinc-800 px-1.5 py-0.5 font-mono text-[8px] tracking-[0.2em] text-zinc-500">
                                                    {TACTIC_TYPE_LABELS[tactic.type] ?? tactic.type}
                                                </span>
                                                <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-300">{tactic.name}</span>
                                                <span className="shrink-0 font-mono text-[9px] tabular-nums text-zinc-600">{tactic.apCost} AP</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* 同行者 */}
                            {companions.length > 0 && (
                                <section>
                                    <SectionLabel right={`${companions.length} SOULS`}>同行者 | COMPANION</SectionLabel>
                                    <div className="flex flex-col gap-1.5">
                                        {companions.map((companion) => (
                                            <div key={companion.id} className="border border-zinc-900 bg-black/30 px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[12px] text-zinc-200">{companion.name}</span>
                                                    <span className="ml-auto font-mono text-[8px] uppercase tracking-[0.25em] text-zinc-600">
                                                        {COMBAT_STYLE_LABELS[companion.style].code}
                                                    </span>
                                                </div>
                                                <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-zinc-600">{companion.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    </aside>
                </main>

                {/* ================= 底栏 ================= */}
                <footer className="flex shrink-0 items-center justify-between gap-6 border-t border-zinc-900 px-6 py-3 font-mono text-[9px] uppercase tracking-[0.3em] text-zinc-700 md:px-10">
                    <span className="shrink-0">AI-DIRECTED SURVIVAL HORROR</span>
                    <LoreFragment />
                    <span className="hidden shrink-0 md:inline">BUILD 2.1.0 // CONTRACT LOCKED</span>
                </footer>
            </div>
        </div>
    );
};

export default MenuPanel;