/**
 * 储物网格 · 因果序列推演
 *
 * 定位：《背景设定》第四章所述的神经链接仪「机械过滤通道（camera）」视图。
 * 认知滤网把颅骨之外的物资信息降维重写为可读图景，因此整个界面以底噪、
 * 扫描线、锐化角标与刻度计量构成，读数直接取自链接仪契约字段
 * （battery / integrity / visorLevel / noiseLevel）与区域主观时空。
 */
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
    clamp,
    getEntityDefenseOdds,
    getEquippedInstances,
    getPercent,
    getWeaponAttackOdds,
    hasDurability,
    instantiateAttackSequence,
    instantiateDefenseSequence,
    isAccessoryInstance,
    isArmorInstance,
    isConsumableInstance,
    isDataInstance,
    isEquipmentInstance,
    isWeaponInstance,
} from '../meta';
import type {
    AttackLadderOdds,
    AttackOddsData,
    AttackResult,
    ConsumableEffectType,
    DefenseLadderOdds,
    DefenseOddsData,
    DefenseResult,
    ItemInstance,
    ItemGrade,
    MaterialInstance,
    PlayerState,
    WeaponDamageType,
    WeaponTemplate,
    WeaponType,
} from '../meta';
import { RARITY_MAP, RARITY_META } from '../constants';
import type { InventoryGridApi } from '../hooks';

// ============================================================================
// 1. 视觉基调与档位表
// ============================================================================

/**
 * 滤网信息基调。
 *
 * 与设备四态严格对应，禁止在视图层另造配色：
 * - link   ：链路在线，滤网磷光青（常规读数）
 * - danger ：深渊侵蚀 / 硬件失效（绯红）
 * - warn   ：认知危害 / 数值异常（琥珀）
 * - safe   ：已解密 / 结构稳定（共生翠绿）
 */
const TONE = {
    link: {
        text: 'text-cyan-300',
        soft: 'text-cyan-600/80',
        border: 'border-cyan-500/30',
        fill: 'bg-cyan-400',
        glow: 'shadow-[0_0_10px_rgba(34,211,238,0.35)]',
    },
    danger: {
        text: 'text-red-400',
        soft: 'text-red-900/90',
        border: 'border-red-500/40',
        fill: 'bg-red-500',
        glow: 'shadow-[0_0_10px_rgba(239,68,68,0.4)]',
    },
    warn: {
        text: 'text-amber-400',
        soft: 'text-amber-900/90',
        border: 'border-amber-500/40',
        fill: 'bg-amber-400',
        glow: 'shadow-[0_0_10px_rgba(251,191,36,0.4)]',
    },
    safe: {
        text: 'text-emerald-400',
        soft: 'text-emerald-900/90',
        border: 'border-emerald-500/40',
        fill: 'bg-emerald-400',
        glow: 'shadow-[0_0_10px_rgba(52,211,153,0.4)]',
    },
} as const;

type Tone = keyof typeof TONE;

/**
 * 判定档位 → 基调。
 *
 * 攻击序列与防御序列共用同一张表，视图层不得再各自维护一套档位配色。
 * 键集由契约的 `AttackResult[0] | DefenseResult[0]` 强制约束，新增档位即编译报错。
 */
const LADDER_TONE = {
    crit: 'warn',
    hit: 'danger',
    graze: 'link',
    miss: 'link',
    dodge: 'safe',
    partial: 'link',
    fail: 'danger',
} as const satisfies Record<AttackResult[0] | DefenseResult[0], Tone>;

/**
 * 判定档位 → 滤网标记符。
 *
 * 认知滤网在降维重写时会把高维判定结果替换为这些大写警示符，因此保留英文原样。
 */
const LADDER_TAG = {
    crit: 'CRITICAL',
    hit: 'HIT',
    graze: 'GRAZE',
    miss: 'MISS',
    dodge: 'DODGE',
    partial: 'BLOCK',
    fail: 'FAIL',
} as const satisfies Record<keyof typeof LADDER_TONE, string>;

/** 判定档位：攻击与防御两轴的合法取值并集。 */
type Ladder = keyof typeof LADDER_TONE;

/**
 * 判定档位的数值读法。
 *
 * 攻击档位读伤害点数，防御档位读减免比；检视器与推演终端共用同一读法，
 * 两处不得再各写一套区间拼接。
 */
const formatLadderReading = (odds: AttackLadderOdds | DefenseLadderOdds): string => {
    if ('maxDamage' in odds) {
        if (odds.ladder === 'miss') return '0 点';
        if (odds.ladder === 'graze') return `1~${odds.maxDamage} 点`;
        return odds.minDamage === odds.maxDamage
            ? `${odds.minDamage} 点`
            : `${odds.minDamage}~${odds.maxDamage} 点`;
    }

    if (odds.ladder === 'dodge') return '减免 100%';
    if (odds.ladder === 'partial') {
        return `${Math.round(odds.minReduction * 100)}% ~ ${Math.round(odds.maxReduction * 100)}%`;
    }
    return '减免 0%';
};

// ============================================================================
// 2. 共享视觉原子
// ============================================================================

interface FilterNoiseProps {
    /** 底噪强度 0 ~ 1：由视神经噪点 noiseLevel 驱动，越高画面越脏。 */
    intensity?: number;
}

/**
 * 滤网底噪层：扫描线 + 静态底噪 + 暗角。
 *
 * 必须置于容器绝对底层且不接收指针事件，`intensity` 只影响底噪与暗角浓度，
 * 扫描线保持恒定以维系「机械通道」的统一观感。
 */
const FilterNoise: React.FC<FilterNoiseProps> = ({ intensity = 0.4 }) => (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
                backgroundImage:
                    'repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,0.75) 2px 3px)',
            }}
        />
        <div
            className="absolute inset-0 mix-blend-overlay"
            style={{
                opacity: 0.03 + intensity * 0.07,
                backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
        />
        <div
            className="absolute inset-0"
            style={{
                background:
                    'radial-gradient(ellipse at 50% 45%, transparent 42%, rgba(0,0,0,0.72) 100%)',
            }}
        />
    </div>
);

interface CornerTicksProps {
    /** 角标颜色类，默认取滤网青。 */
    className?: string;
}

/**
 * 锐化角标：滤网对物体轮廓施加边缘提锐后在画面四角留下的 L 形残影。
 */
const CornerTicks: React.FC<CornerTicksProps> = ({
    className = 'border-cyan-500/45',
}) => (
    <>
        {(
            [
                'left-0 top-0 border-l border-t',
                'right-0 top-0 border-r border-t',
                'left-0 bottom-0 border-l border-b',
                'right-0 bottom-0 border-r border-b',
            ] as const
        ).map((position) => (
            <span
                key={position}
                aria-hidden
                className={`pointer-events-none absolute h-3 w-3 ${position} ${className}`}
            />
        ))}
    </>
);

interface PanelBlockProps {
    /** 区块中文名。 */
    title: string;
    /** 区块英文代号，按设定惯例以大写加下划线呈现。 */
    code?: string;
    /** 标题行右侧的附加读数。 */
    aside?: React.ReactNode;
    /** 基调，决定边框与标题色。 */
    tone?: Tone;
    className?: string;
    bodyClassName?: string;
    children: React.ReactNode;
}

/**
 * 降维观测区块：带锐化角标的边框容器。
 *
 * 所有界面分区统一走该容器，避免各处在边框与角落装饰上各自为政。
 */
const PanelBlock: React.FC<PanelBlockProps> = ({
    title,
    code,
    aside,
    tone = 'link',
    className = '',
    bodyClassName = '',
    children,
}) => (
    <section
        className={`relative flex flex-col border bg-black/45 p-3 ${TONE[tone].border} ${className}`}
    >
        <CornerTicks className={TONE[tone].border} />

        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            <header className="mb-2.5 flex items-center gap-2 border-b border-white/5 pb-1.5">
                <span className={`h-2.5 w-[3px] ${TONE[tone].fill} ${TONE[tone].glow}`} />
                <h3
                    className={`text-[10px] font-bold leading-none tracking-[0.3em] ${TONE[tone].text}`}
                >
                    {title}
                </h3>
                {code && (
                    <span className="text-[9px] leading-none tracking-[0.18em] text-cyan-800">
                        {code}
                    </span>
                )}
                <span className="mx-1 h-px flex-1 bg-gradient-to-r from-cyan-900/60 to-transparent" />
                {aside}
            </header>

            <div className={bodyClassName}>{children}</div>
        </div>
    </section>
);

interface ReadoutProps {
    /** 读数名称。 */
    label: string;
    /** 读数主体，已格式化的字符串或节点。 */
    value: React.ReactNode;
    /** 主值基调。 */
    tone?: Tone;
    /** 右侧次级说明。 */
    note?: string;
    className?: string;
}

/**
 * 铭牌读数：小号标签在上、主值在下的纵向单元。
 *
 * 用于设备铭牌这类密集读数区；行式读数请直接用普通 flex 布局，不要套用本组件。
 */
const Readout: React.FC<ReadoutProps> = ({
    label,
    value,
    tone = 'link',
    note,
    className = '',
}) => (
    <div className={`flex flex-col gap-1 ${className}`}>
        <span className="text-[8px] tracking-[0.3em] text-cyan-800">{label}</span>
        <span
            className={`text-[11px] font-bold leading-none tracking-[0.12em] ${TONE[tone].text}`}
        >
            {value}
        </span>
        {note && (
            <span className="text-[8px] tracking-[0.2em] text-cyan-900">{note}</span>
        )}
    </div>
);

interface GaugeProps {
    /** 当前占比 0 ~ 100。 */
    value: number;
    tone?: Tone;
    /** 是否渲染为分段电芯（用于电量、负荷这类离散计量）。 */
    segments?: number;
    /** 条体高度 / 宽度类，默认 h-[3px]。 */
    className?: string;
}

/**
 * 计量条。
 *
 * `segments` 给定时渲染为分格电芯，空格只留边框；未给定则渲染为连续填充条。
 */
const Gauge: React.FC<GaugeProps> = ({
    value,
    tone = 'link',
    segments,
    className = 'h-[3px]',
}) => {
    const safe = Math.max(0, Math.min(100, value));

    if (segments) {
        const lit = Math.ceil((safe / 100) * segments);
        return (
            <div className={`flex items-stretch gap-px ${className}`}>
                {Array.from({ length: segments }, (_, index) => (
                    <span
                        key={`gauge-cell-${index}`}
                        className={`flex-1 ${index < lit
                            ? `${TONE[tone].fill} ${TONE[tone].glow}`
                            : 'bg-cyan-950/70'
                            }`}
                    />
                ))}
            </div>
        );
    }

    return (
        <div className={`w-full overflow-hidden bg-cyan-950/60 ${className}`}>
            <div
                className={`h-full transition-all duration-500 ${TONE[tone].fill} ${TONE[tone].glow}`}
                style={{ width: `${safe}%` }}
            />
        </div>
    );
};

interface OddsRowProps {
    /** 判定档位名称（暴击 / 命中 / 格挡…）。 */
    label: string;
    /** 该档位发生率 0 ~ 1。 */
    rate: number;
    /** 已格式化的数值描述，如「18 点」「1~18 点」。 */
    reading: string;
    tone: Tone;
    /** 是否为当前关注的主档位，主档位放大读数。 */
    emphasis?: boolean;
    /** 本轮实例化实测占比（整数百分比）；缺省表示尚未实例化。 */
    actualRate?: number;
}

/**
 * 命中 / 防御梯度的一行：档位 + 发生率 + 数值 + 频谱条。
 *
 * 攻击序列与防御序列共用，两处的档位配色由 `tone` 决定，
 * 视图层不得再行维护第二套档位配色表。
 * 传入 `actualRate` 时在同一行并列显示本轮实测占比，偏差超过 5 个百分点以琥珀色提示。
 */
const OddsRow: React.FC<OddsRowProps> = ({
    label,
    rate,
    reading,
    tone,
    emphasis = false,
    actualRate,
}) => {
    const expected = Math.round(rate * 100);
    const deviation = actualRate === undefined ? null : actualRate - expected;

    return (
        <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-[10px] tracking-[0.14em]">
                <span className={`font-semibold ${TONE[tone].text}`}>
                    {label}
                    <span className="ml-1 text-[9px] font-normal text-cyan-800">
                        {expected}%
                    </span>
                    {deviation !== null && (
                        <span
                            className={`ml-1.5 text-[9px] font-normal ${Math.abs(deviation) <= 5 ? 'text-cyan-700' : 'text-amber-400'
                                }`}
                        >
                            实测 {actualRate}%
                        </span>
                    )}
                </span>
                <span
                    className={`font-bold tabular-nums ${emphasis ? 'text-sm' : 'text-[10px]'
                        } ${TONE[tone].text}`}
                >
                    {reading}
                </span>
            </div>
            <Gauge value={rate * 100} tone={tone} className="h-1.5" />
        </div>
    );
};

interface SegmentBarItem {
    /** 段名，同时用作悬停提示。 */
    label: string;
    tone: Tone;
    /** 占比 0 ~ 1。 */
    ratio: number;
}

/**
 * 比例条：把一组占比压成一条通栏色带。
 *
 * 检视器用于概览期望分布，推演终端用于对照本轮实测，两处同源以免口径不一。
 */
const SegmentBar: React.FC<{ items: SegmentBarItem[]; className?: string }> = ({
    items,
    className = 'h-1.5',
}) => (
    <div className={`flex w-full gap-px overflow-hidden ${className}`}>
        {items
            .filter((entry) => entry.ratio > 0)
            .map((entry) => (
                <span
                    key={entry.label}
                    title={`${entry.label} ${Math.round(entry.ratio * 100)}%`}
                    className={`${TONE[entry.tone].fill} opacity-80`}
                    style={{ flexGrow: entry.ratio, minWidth: 2 }}
                />
            ))}
    </div>
);

/**
 * 快捷键提示片：把按键呈现为可辨识的小键帽。
 *
 * 图例、按钮与终端提示共用，避免各处自行拼写按键样式。
 */
const KeyHint: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className = '',
}) => (
    <kbd
        className={`border border-cyan-800/70 bg-cyan-950/40 px-1 py-px font-mono text-[8px] leading-none tracking-[0.12em] text-cyan-500 ${className}`}
    >
        {children}
    </kbd>
);

interface EmptyHintProps {
    title: string;
    desc?: string;
    tone?: Tone;
}

/**
 * 空态提示：滤网未捕获到有效观测对象时的占位。
 */
const EmptyHint: React.FC<EmptyHintProps> = ({
    title,
    desc,
    tone = 'link',
}) => (
    <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-3 text-center">
        <div className="relative h-10 w-10">
            <span
                className={`absolute inset-0 rotate-45 border ${TONE[tone].border}`}
            />
            <span className="absolute inset-2 animate-pulse bg-cyan-500/20" />
        </div>
        <span
            className={`text-[11px] tracking-[0.3em] ${TONE[tone].text} opacity-70`}
        >
            {title}
        </span>
        {desc && (
            <span className="text-[10px] leading-relaxed tracking-[0.2em] text-cyan-800/80">
                {desc}
            </span>
        )}
    </div>
);

// ============================================================================
// 3. 物资侧标签与格式化
// ============================================================================

const ITEM_TYPE_LABEL: Record<ItemInstance['type'], string> = {
    weapon: '武器',
    armor: '护甲',
    accessory: '饰品',
    storage: '容器',
    consumable: '消耗品',
    data: '数据',
    material: '材料',
};

/**
 * 物资类型单字标记。
 *
 * 网格单元尺寸有限，单字标记用于在缩略卡片上一眼分辨物品种类。
 */
const TYPE_GLYPH: Record<ItemInstance['type'], string> = {
    weapon: '武',
    armor: '甲',
    accessory: '饰',
    storage: '容',
    consumable: '耗',
    data: '数',
    material: '材',
};

const TYPE_BADGE: Record<ItemInstance['type'], string> = {
    weapon: 'border-red-500/30 bg-red-950/40 text-red-300/90',
    armor: 'border-blue-500/30 bg-blue-950/40 text-blue-300/90',
    accessory: 'border-purple-500/30 bg-purple-950/40 text-purple-300/90',
    storage: 'border-orange-500/30 bg-orange-950/40 text-orange-300/90',
    consumable: 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300/90',
    data: 'border-amber-500/30 bg-amber-950/40 text-amber-300/90',
    material: 'border-cyan-500/30 bg-cyan-950/40 text-cyan-300/90',
};

const WEAPON_TYPE_LABEL: Record<WeaponType, string> = {
    magic: '法术',
    sniper_rifle: '狙击步枪',
    assault_rifle: '突击步枪',
    smg: '冲锋枪',
    pistol: '手枪',
    shotgun: '霰弹枪',
    sawed_off: '短管霰弹枪',
    crossbow: '弩',
    throw: '投掷',
    bow: '弓',
    wave: '挥动',
    both_wave: '双手挥动',
    prick: '刺击',
    both_prick: '双手刺击',
    shield: '盾牌',
    both_shield: '双手盾牌',
};

const DAMAGE_TYPE_LABEL: Record<WeaponDamageType, string> = {
    range: '远程伤害',
    melee: '近程伤害',
    instant: '即时伤害',
};

const EFFECT_LABEL: Record<ConsumableEffectType, string> = {
    strength: '力量',
    agility: '敏捷',
    wisdom: '智慧',
    awareness: '感知',
    will: '意志',
    cthulhu: '不可知',
    maxHp: '生命上限',
    maxSanity: '理智上限',
    maxStamina: '体力上限',
    maxVigor: '精力上限',
    hp: '生命恢复',
    sanity: '理智恢复',
    stamina: '体力恢复',
    vigor: '精力恢复',
    battery: '电池恢复',
    integrity: '完整度修复',
};

const isMaterial = (item: ItemInstance): item is MaterialInstance =>
    item.type === 'material';

const getQuantity = (item: ItemInstance): number => Math.max(1, item.quantity ?? 1);

const getDurabilityPercent = (item: ItemInstance): number => {
    if (!hasDurability(item)) return 100;
    if (item.maxUses <= 0) return 0;
    return getPercent(item.currentUses, item.maxUses);
};

const formatEffect = ([type, value, duration]: [
    ConsumableEffectType,
    number,
    number?,
]): string => {
    const sign = value >= 0 ? '+' : '';
    const suffix = duration && duration > 0 ? ` / ${duration} 回合` : '';
    return `${EFFECT_LABEL[type]} ${sign}${value}${suffix}`;
};

/** 主操作按钮文案：按物资类型给出「这一下会发生什么」。 */
const getActionLabel = (item: ItemInstance, isProcessing: boolean): string => {
    if (isProcessing) return '处理中';
    if (isEquipmentInstance(item)) return '装备';
    if (isDataInstance(item)) {
        if (item.audioUrl) return '播放音频';
        if (item.audioScript) return '解密音频';
        if (item.documentContent) return '读取文档';
        return '打开数据';
    }
    if (isConsumableInstance(item)) return '使用';
    if (isMaterial(item)) return '处理';
    return '初始化';
};

/** 检索匹配文本：名称 / 描述 / 类型 / 稀有度 / 效果，统一小写便于包含匹配。 */
const getSearchText = (item: ItemInstance): string => {
    const parts: string[] = [
        item.name,
        item.desc,
        ITEM_TYPE_LABEL[item.type],
        RARITY_MAP[item.grade].name,
    ];

    if (isWeaponInstance(item)) {
        parts.push(WEAPON_TYPE_LABEL[item.weaponType], DAMAGE_TYPE_LABEL[item.weaponDamageType]);
    }

    if (isAccessoryInstance(item) || isConsumableInstance(item)) {
        // 旧存档 / LLM 生成物可能缺失 effects，避免直取抛错
        (item.effects ?? []).forEach(([effectType]) => {
            parts.push(effectType, EFFECT_LABEL[effectType]);
        });
    }

    return parts.filter(Boolean).join(' ').toLowerCase();
};

interface StatRowProps {
    label: string;
    value: React.ReactNode;
    valueColor?: string;
}

/** 档案参数表的一行：左标签右取值。 */
const StatRow: React.FC<StatRowProps> = ({
    label,
    value,
    valueColor = 'text-cyan-200',
}) => (
    <div className="flex items-center justify-between gap-3 text-[10px] leading-none tracking-[0.14em]">
        <span className="shrink-0 text-cyan-700">{label}</span>
        <span className={`${valueColor} break-words text-right font-bold`}>{value}</span>
    </div>
);

interface RarityFilterButtonProps {
    label: string;
    isActive: boolean;
    onClick: () => void;
    rarity?: ItemGrade;
}

/** 稀有度谱系筛选键：非稀有度按钮（全部）走滤网青，其余读稀有度自身的 --r-* 变量。 */
const RarityFilterButton: React.FC<RarityFilterButtonProps> = ({
    label,
    isActive,
    onClick,
    rarity,
}) => {
    const active = rarity
        ? '[border-color:var(--r-accent)] [color:var(--r-text)] [box-shadow:0_0_10px_var(--r-glow)]'
        : 'border-cyan-500/60 text-cyan-200 bg-cyan-950/40 shadow-[0_0_10px_rgba(34,211,238,0.3)]';
    const inactive = rarity
        ? 'border-cyan-900/30 text-cyan-900 hover:[border-color:var(--r-border)] hover:[color:var(--r-text)]'
        : 'border-cyan-900/40 text-cyan-800 hover:border-cyan-700 hover:text-cyan-500';

    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={isActive}
            title={rarity ? RARITY_MAP[rarity].desc : undefined}
            style={rarity ? ({ ...RARITY_MAP[rarity].vars } as React.CSSProperties) : undefined}
            className={`border px-2 py-0.5 text-[9px] tracking-[0.16em] transition-all duration-300 outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/60 ${isActive ? active : inactive
                }`}
        >
            {label}
        </button>
    );
};

// ============================================================================
// 4. 战术序列推演终端
// ============================================================================

interface StatCellProps {
    label: string;
    value: React.ReactNode;
    note: string;
    tone: Tone;
    /** 首格作为统领读数放大呈现。 */
    leader?: boolean;
}

/** 核定读数格：标签在上、大号数值居中、次级说明在下。 */
const StatCell: React.FC<StatCellProps> = ({
    label,
    value,
    note,
    tone,
    leader = false,
}) => (
    <div className={`flex flex-col gap-1 border-l-2 pl-2.5 ${TONE[tone].border}`}>
        <span className="text-[9px] tracking-[0.22em] text-cyan-700">{label}</span>
        <span
            className={`font-black leading-none tabular-nums ${leader ? 'text-xl' : 'text-base'
                } ${TONE[tone].text}`}
        >
            {value}
        </span>
        <span className="text-[8px] tracking-[0.18em] text-cyan-900">{note}</span>
    </div>
);

interface SequenceCardProps {
    index: number;
    ladder: Ladder;
    /** 该档位的中文名，取自概率分布的 label，避免视图层另造译名。 */
    label: string;
    /** 主数值文本（伤害或减伤比）。 */
    reading: string;
    /** 相对量度 0 ~ 100，用于底部频谱条。 */
    magnitude: number;
    /** 卡面右上角的动作标记：ATTACK / GUARD。 */
    actionTag: string;
}

/** 降维判定卡：一次因果切片的最终形态，未命中档位降透明度以示已被滤网丢弃。 */
const SequenceCard: React.FC<SequenceCardProps> = ({
    index,
    ladder,
    label,
    reading,
    magnitude,
    actionTag,
}) => {
    const tone = LADDER_TONE[ladder];
    const muted = ladder === 'miss' || ladder === 'fail';

    return (
        <div
            style={{ animationDelay: `${Math.min(index, 24) * 22}ms` }}
            className={`visor-panel-in relative flex flex-col justify-between border bg-black/45 p-2.5 transition-transform duration-200 hover:-translate-y-1 ${TONE[tone].border
                } ${muted ? 'opacity-50' : ''}`}
        >
            <CornerTicks className={TONE[tone].border} />

            <header className="relative z-10 flex items-center justify-between border-b border-white/5 pb-1 text-[9px] tracking-[0.2em]">
                <span className={`font-bold ${TONE[tone].text}`}>
                    #{String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-cyan-800">{actionTag}</span>
            </header>

            <div className="relative z-10 my-2.5 text-center">
                <div className={`text-[9px] font-bold tracking-[0.16em] ${TONE[tone].text}`}>
                    {LADDER_TAG[ladder]} // {label}
                </div>
                <p className={`mt-1 text-2xl font-black leading-none tabular-nums ${TONE[tone].text}`}>
                    {reading}
                </p>
            </div>

            <Gauge value={magnitude} tone={tone} className="relative z-10 h-1" />
        </div>
    );
};

interface SequenceTerminalProps {
    weapon: WeaponTemplate;
    player?: PlayerState | null;
    /** 当前观测的因果轴：attack = 攻击序列，defense = 防御序列。 */
    activeMainTab: 'attack' | 'defense';
    setActiveMainTab: (tab: 'attack' | 'defense') => void;
    attackMode: 'base' | 'contextual';
    setAttackMode: (mode: 'base' | 'contextual') => void;
    defenseMode: 'equipped' | 'unarmed';
    setDefenseMode: (mode: 'equipped' | 'unarmed') => void;
    attackOdds: AttackOddsData;
    defenseOdds: DefenseOddsData;
    sequenceLength: number;
    instantiatedAttack: AttackResult[] | null;
    instantiatedDefense: DefenseResult[] | null;
    /** 本次实例化流水号：变化即重播卡片入场动效，给「重新掷骰」以可见反馈。 */
    rollToken: number;
    onReinstantiateAttack: () => void;
    onReinstantiateDefense: () => void;
    onClose: () => void;
}

const SequenceTerminal: React.FC<SequenceTerminalProps> = ({
    weapon,
    player,
    activeMainTab,
    setActiveMainTab,
    attackMode,
    setAttackMode,
    defenseMode,
    setDefenseMode,
    attackOdds,
    defenseOdds,
    sequenceLength,
    instantiatedAttack,
    instantiatedDefense,
    rollToken,
    onReinstantiateAttack,
    onReinstantiateDefense,
    onClose,
}) => {
    const isAttackAxis = activeMainTab === 'attack';

    // 终端独占键盘：ESC 退出，左右方向键切换因果轴
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
                return;
            }
            if (event.key === 'ArrowLeft') setActiveMainTab('attack');
            if (event.key === 'ArrowRight') setActiveMainTab('defense');
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, setActiveMainTab]);

    /** 攻击序列核定读数。 */
    const attackStats = useMemo(() => {
        if (!instantiatedAttack || instantiatedAttack.length === 0) return null;

        const rollup = { totalDmg: 0, crit: 0, hit: 0, graze: 0, miss: 0 };

        instantiatedAttack.forEach(([ladder, value]) => {
            if (ladder === 'crit') {
                rollup.crit += 1;
                rollup.totalDmg += value;
            } else if (ladder === 'hit') {
                rollup.hit += 1;
                rollup.totalDmg += value;
            } else if (ladder === 'graze') {
                rollup.graze += 1;
                rollup.totalDmg += value;
            } else {
                rollup.miss += 1;
            }
        });

        const total = instantiatedAttack.length;
        return {
            ...rollup,
            total,
            avgDmg: (rollup.totalDmg / total).toFixed(1),
            critRate: Math.round((rollup.crit / total) * 100),
            hitRate: Math.round((rollup.hit / total) * 100),
            grazeRate: Math.round((rollup.graze / total) * 100),
            missRate: Math.round((rollup.miss / total) * 100),
        };
    }, [instantiatedAttack]);

    /** 防御序列核定读数。 */
    const defenseStats = useMemo(() => {
        if (!instantiatedDefense || instantiatedDefense.length === 0) return null;

        const rollup = { reduction: 0, dodge: 0, partial: 0, fail: 0 };

        instantiatedDefense.forEach(([ladder, value]) => {
            if (ladder === 'dodge') {
                rollup.dodge += 1;
                rollup.reduction += value;
            } else if (ladder === 'partial') {
                rollup.partial += 1;
                rollup.reduction += value;
            } else {
                rollup.fail += 1;
            }
        });

        const total = instantiatedDefense.length;
        return {
            ...rollup,
            total,
            avgReduction: Math.round((rollup.reduction / total) * 100),
            dodgeRate: Math.round((rollup.dodge / total) * 100),
            partialRate: Math.round((rollup.partial / total) * 100),
            failRate: Math.round((rollup.fail / total) * 100),
        };
    }, [instantiatedDefense]);

    /** 本轮实测占比：并回左侧梯度行，用于「期望 vs 实测」对照。 */
    const actualRates = useMemo<Partial<Record<Ladder, number>>>(() => {
        if (isAttackAxis) {
            if (!attackStats) return {};
            return {
                crit: attackStats.critRate,
                hit: attackStats.hitRate,
                graze: attackStats.grazeRate,
                miss: attackStats.missRate,
            };
        }
        if (!defenseStats) return {};
        return {
            dodge: defenseStats.dodgeRate,
            partial: defenseStats.partialRate,
            fail: defenseStats.failRate,
        };
    }, [isAttackAxis, attackStats, defenseStats]);

    /** 单卡满量度基准：暴击上限作为攻击卡的 100% 刻度。 */
    const attackCeiling = Math.max(
        1,
        attackOdds.effectiveDamage + attackOdds.effectiveCritBonus
    );

    // 终端是模态层：标记 body 让主面板快捷键让位，避免 ESC 被两处同时消费
    useEffect(() => {
        document.body.dataset.modal = 'sequence-terminal';
        return () => {
            delete document.body.dataset.modal;
        };
    }, []);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex h-screen w-screen flex-col overflow-hidden bg-[#04060a] text-cyan-100">
            <FilterNoise intensity={0.5} />

            {/* ── 终端铭牌 ───────────────────────────────────────────── */}
            <header className="relative z-10 flex h-16 shrink-0 items-center justify-between gap-6 border-b border-cyan-500/20 bg-black/70 px-6">
                <div className="flex min-w-0 items-center gap-5">
                    <div className="flex shrink-0 items-center gap-2.5">
                        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                        <h1 className="text-[13px] font-bold uppercase leading-none tracking-[0.28em] text-cyan-200">
                            战术序列推演终端
                            <span className="ml-2 text-[10px] tracking-[0.18em] text-cyan-700">
                // SEQUENCE_ANALYZER_V3
                            </span>
                        </h1>
                    </div>

                    <span className="h-9 w-px shrink-0 bg-cyan-900/60" />

                    <div className="flex min-w-0 items-center gap-5">
                        <Readout label="观测目标" value={weapon.name} />
                        <Readout label="基础伤害" value={`${weapon.damage} 点`} tone="danger" />
                        <Readout
                            label="射程"
                            value={weapon.range <= 0 ? '无限' : `${weapon.range} 格`}
                        />
                        <Readout label="暴击加成" value={`+${weapon.crit?.bonus ?? 0}`} tone="warn" />
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-5">
                    <div className="hidden items-center gap-1.5 lg:flex">
                        <KeyHint>←/→</KeyHint>
                        <span className="text-[9px] tracking-[0.18em] text-cyan-800">切换因果轴</span>
                    </div>
                    <Readout
                        label="序列容量"
                        value={`${sequenceLength} 节`}
                        note="CAPACITY"
                    />
                    <button
                        type="button"
                        onClick={onClose}
                        className="border border-cyan-500/30 bg-cyan-950/30 px-3.5 py-1.5 text-[11px] font-bold tracking-[0.2em] text-cyan-300 transition-all outline-none hover:border-cyan-400 hover:bg-cyan-900/40 hover:text-cyan-100 focus-visible:ring-1 focus-visible:ring-cyan-400/60"
                    >
                        [ESC] 退出终端
                    </button>
                </div>
            </header>

            {/* ── 主体工作区 ─────────────────────────────────────────── */}
            <div className="relative z-10 flex min-h-0 flex-1 overflow-hidden">
                {/* 左侧参数舱 */}
                <aside className="custom-scrollbar flex w-[380px] shrink-0 flex-col gap-3 overflow-y-auto border-r border-cyan-500/15 bg-black/40 p-4">
                    {/* 序列轴：一次性切换观测的是攻击还是防御因果链 */}
                    <div className="grid grid-cols-2 gap-1.5 border border-cyan-500/20 bg-black/50 p-1">
                        {(
                            [
                                { id: 'attack', name: '攻击序列推演', code: 'ATTACK', tone: 'danger' },
                                { id: 'defense', name: '防御序列推演', code: 'DEFENSE', tone: 'link' },
                            ] as const
                        ).map((axis) => {
                            const active = activeMainTab === axis.id;
                            return (
                                <button
                                    key={axis.id}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => setActiveMainTab(axis.id)}
                                    className={`flex flex-col items-center gap-0.5 py-2 transition-all outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/60 ${active
                                        ? `border ${TONE[axis.tone].border} ${TONE[axis.tone].text} bg-black/60`
                                        : 'border border-transparent text-cyan-800 hover:text-cyan-500'
                                        }`}
                                >
                                    <span className="text-[11px] font-bold tracking-[0.18em]">
                                        {axis.name}
                                    </span>
                                    <span className="text-[8px] tracking-[0.24em] opacity-70">
                                        {axis.code}_AXIS
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {isAttackAxis ? (
                        <>
                            <PanelBlock title="计算口径" code="CALIBRATION">
                                <div className="mb-2.5 grid grid-cols-2 gap-1.5">
                                    {(
                                        [
                                            { id: 'base', name: '基础理论', code: 'INTRINSIC' },
                                            { id: 'contextual', name: '属性加成', code: 'ATTRIBUTE' },
                                        ] as const
                                    ).map((model) => {
                                        const active = attackMode === model.id;
                                        return (
                                            <button
                                                key={model.id}
                                                type="button"
                                                aria-pressed={active}
                                                onClick={() => setAttackMode(model.id)}
                                                className={`border py-1.5 transition-all outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/60 ${active
                                                    ? 'border-red-500/50 bg-red-950/40 text-red-300'
                                                    : 'border-cyan-900/40 text-cyan-800 hover:border-cyan-700 hover:text-cyan-500'
                                                    }`}
                                            >
                                                <span className="block text-[10px] font-bold tracking-[0.16em]">
                                                    {model.name}
                                                </span>
                                                <span className="block text-[8px] tracking-[0.2em] opacity-70">
                                                    {model.code}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <p className="whitespace-pre-line border-l-2 border-red-500/40 pl-2 text-[10px] italic leading-relaxed text-cyan-200/70">
                                    {attackOdds.description}
                                </p>
                            </PanelBlock>

                            {attackMode === 'contextual' && player && (
                                <PanelBlock title="实体参数" code="ENTITY_PARAMS">
                                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                                        <Readout
                                            label="力量"
                                            value={player.dynamic.strength}
                                            className="!gap-0.5"
                                        />
                                        <Readout
                                            label="感知"
                                            value={player.dynamic.awareness}
                                            className="!gap-0.5"
                                        />
                                        <Readout
                                            label="有效基准威力"
                                            value={`${attackOdds.effectiveDamage} 点`}
                                            tone="danger"
                                            className="!gap-0.5"
                                        />
                                        <Readout
                                            label="暴击伤害上限"
                                            value={`${attackOdds.effectiveDamage + attackOdds.effectiveCritBonus} 点`}
                                            tone="warn"
                                            className="!gap-0.5"
                                        />
                                    </div>
                                </PanelBlock>
                            )}

                            <PanelBlock title="期望分布" code="ODDS_LADDER">
                                <div className="mb-2.5">
                                    <SegmentBar
                                        items={[
                                            { label: attackOdds.crit.label, tone: 'warn', ratio: attackOdds.crit.rate },
                                            { label: attackOdds.hit.label, tone: 'danger', ratio: attackOdds.hit.rate },
                                            { label: attackOdds.graze.label, tone: 'link', ratio: attackOdds.graze.rate },
                                            { label: attackOdds.miss.label, tone: 'link', ratio: attackOdds.miss.rate },
                                        ]}
                                    />
                                </div>
                                <div className="space-y-3">
                                    {(
                                        [attackOdds.crit, attackOdds.hit, attackOdds.graze, attackOdds.miss] as const
                                    ).map((ladderOdds) => (
                                        <OddsRow
                                            key={ladderOdds.ladder}
                                            label={ladderOdds.label}
                                            rate={ladderOdds.rate}
                                            tone={LADDER_TONE[ladderOdds.ladder]}
                                            emphasis={ladderOdds.ladder === 'crit' || ladderOdds.ladder === 'hit'}
                                            reading={formatLadderReading(ladderOdds)}
                                            actualRate={actualRates[ladderOdds.ladder]}
                                        />
                                    ))}
                                </div>
                            </PanelBlock>
                        </>
                    ) : (
                        <>
                            <PanelBlock title="防御姿态" code="POSTURE">
                                <div className="mb-2.5 grid grid-cols-2 gap-1.5">
                                    {(
                                        [
                                            { id: 'equipped', name: '持武姿态', code: 'ARMED' },
                                            { id: 'unarmed', name: '空手裸装', code: 'BARE' },
                                        ] as const
                                    ).map((posture) => {
                                        const active = defenseMode === posture.id;
                                        return (
                                            <button
                                                key={posture.id}
                                                type="button"
                                                aria-pressed={active}
                                                onClick={() => setDefenseMode(posture.id)}
                                                className={`border py-1.5 transition-all outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/60 ${active
                                                    ? 'border-cyan-500/50 bg-cyan-950/40 text-cyan-200'
                                                    : 'border-cyan-900/40 text-cyan-800 hover:border-cyan-700 hover:text-cyan-500'
                                                    }`}
                                            >
                                                <span className="block text-[10px] font-bold tracking-[0.16em]">
                                                    {posture.name}
                                                </span>
                                                <span className="block text-[8px] tracking-[0.2em] opacity-70">
                                                    {posture.code}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <p className="whitespace-pre-line border-l-2 border-cyan-500/40 pl-2 text-[10px] italic leading-relaxed text-cyan-200/70">
                                    {defenseOdds.description}
                                </p>
                            </PanelBlock>

                            {defenseOdds.notes.length > 0 && (
                                <PanelBlock title="滤网注释" code="SIEVE_NOTES" tone="warn">
                                    <div className="space-y-1.5">
                                        {defenseOdds.notes.map((note, index) => (
                                            <p
                                                key={`note-${index}`}
                                                className="flex items-start gap-1.5 text-[10px] leading-relaxed text-amber-200/80"
                                            >
                                                <span className="text-amber-500">▶</span>
                                                <span>{note}</span>
                                            </p>
                                        ))}
                                    </div>
                                </PanelBlock>
                            )}

                            {player && (
                                <PanelBlock title="实体参数" code="ENTITY_PARAMS">
                                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                                        <Readout
                                            label="敏捷"
                                            value={player.dynamic.agility}
                                            className="!gap-0.5"
                                        />
                                        <Readout
                                            label="护甲常驻免伤"
                                            value={`${Math.round(defenseOdds.partial.minReduction * 100)}%`}
                                            className="!gap-0.5"
                                        />
                                        <Readout
                                            label="最大免伤"
                                            value={`${Math.round(defenseOdds.partial.maxReduction * 100)}%`}
                                            tone="link"
                                            className="!gap-0.5"
                                        />
                                    </div>
                                </PanelBlock>
                            )}

                            <PanelBlock title="期望分布" code="ODDS_LADDER">
                                <div className="mb-2.5">
                                    <SegmentBar
                                        items={[
                                            { label: defenseOdds.dodge.label, tone: 'safe', ratio: defenseOdds.dodge.rate },
                                            { label: defenseOdds.partial.label, tone: 'link', ratio: defenseOdds.partial.rate },
                                            { label: defenseOdds.fail.label, tone: 'danger', ratio: defenseOdds.fail.rate },
                                        ]}
                                    />
                                </div>
                                <div className="space-y-3">
                                    {(
                                        [defenseOdds.dodge, defenseOdds.partial, defenseOdds.fail] as const
                                    ).map((ladderOdds) => (
                                        <OddsRow
                                            key={ladderOdds.ladder}
                                            label={ladderOdds.label}
                                            rate={ladderOdds.rate}
                                            tone={LADDER_TONE[ladderOdds.ladder]}
                                            emphasis={ladderOdds.ladder === 'dodge'}
                                            reading={formatLadderReading(ladderOdds)}
                                            actualRate={actualRates[ladderOdds.ladder]}
                                        />
                                    ))}
                                </div>
                            </PanelBlock>
                        </>
                    )}

                    {/* 重新掷骰：常驻参数舱底部，滚动时始终可触达 */}
                    <button
                        type="button"
                        onClick={isAttackAxis ? onReinstantiateAttack : onReinstantiateDefense}
                        className={`sticky bottom-0 mt-auto shrink-0 border py-3 text-[11px] font-bold tracking-[0.22em] transition-all outline-none active:scale-[0.99] ${isAttackAxis
                            ? 'border-red-500/60 bg-red-950/60 text-red-200 hover:border-red-400 hover:bg-red-900/60 focus-visible:ring-1 focus-visible:ring-red-400/60'
                            : 'border-cyan-500/60 bg-cyan-950/60 text-cyan-200 hover:border-cyan-400 hover:bg-cyan-900/60 focus-visible:ring-1 focus-visible:ring-cyan-400/60'
                            }`}
                    >
                        <CornerTicks className={isAttackAxis ? 'border-red-500/50' : 'border-cyan-500/50'} />
                        {isAttackAxis ? '重新掷骰实例化攻击序列' : '重新掷骰实例化防御序列'} ·{' '}
                        {sequenceLength} 节
                    </button>
                </aside>

                {/* 右侧结果舱 */}
                <main className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-hidden p-5">
                    {/* 本轮核定读数 */}
                    {isAttackAxis
                        ? attackStats && (
                            <PanelBlock
                                title="本轮核定"
                                code="ROLLUP"
                                tone="danger"
                                aside={
                                    <span className="text-[9px] tracking-[0.2em] text-cyan-800">
                                        {attackStats.total} 节
                                    </span>
                                }
                            >
                                <div className="grid grid-cols-5 gap-3">
                                    <StatCell
                                        label="总预期杀伤"
                                        value={
                                            <>
                                                {attackStats.totalDmg}
                                                <span className="ml-1 text-[10px] font-normal text-cyan-700">
                                                    点
                                                </span>
                                            </>
                                        }
                                        note={`均伤 ${attackStats.avgDmg} 点/节`}
                                        tone="danger"
                                        leader
                                    />
                                    <StatCell
                                        label="暴击"
                                        value={`${attackStats.crit} 次`}
                                        note={`占比 ${attackStats.critRate}%`}
                                        tone="warn"
                                    />
                                    <StatCell
                                        label="全额命中"
                                        value={`${attackStats.hit} 次`}
                                        note={`占比 ${attackStats.hitRate}%`}
                                        tone="danger"
                                    />
                                    <StatCell
                                        label="擦伤"
                                        value={`${attackStats.graze} 次`}
                                        note={`占比 ${attackStats.grazeRate}%`}
                                        tone="link"
                                    />
                                    <StatCell
                                        label="脱靶"
                                        value={`${attackStats.miss} 次`}
                                        note={`占比 ${attackStats.missRate}%`}
                                        tone="link"
                                    />
                                </div>

                                <div className="mt-3">
                                    <SegmentBar
                                        items={[
                                            { label: '暴击', tone: 'warn', ratio: attackStats.crit / attackStats.total },
                                            { label: '全额命中', tone: 'danger', ratio: attackStats.hit / attackStats.total },
                                            { label: '擦伤', tone: 'link', ratio: attackStats.graze / attackStats.total },
                                            { label: '脱靶', tone: 'link', ratio: attackStats.miss / attackStats.total },
                                        ]}
                                    />
                                </div>
                            </PanelBlock>
                        )
                        : defenseStats && (
                            <PanelBlock
                                title="本轮核定"
                                code="ROLLUP"
                                aside={
                                    <span className="text-[9px] tracking-[0.2em] text-cyan-800">
                                        {defenseStats.total} 节
                                    </span>
                                }
                            >
                                <div className="grid grid-cols-4 gap-3">
                                    <StatCell
                                        label="平均减伤综合比"
                                        value={`${defenseStats.avgReduction}%`}
                                        note="实例化序列实测均值"
                                        tone="link"
                                        leader
                                    />
                                    <StatCell
                                        label="完全闪避"
                                        value={`${defenseStats.dodge} 次`}
                                        note={`占比 ${defenseStats.dodgeRate}%`}
                                        tone="safe"
                                    />
                                    <StatCell
                                        label="格挡减免"
                                        value={`${defenseStats.partial} 次`}
                                        note={`占比 ${defenseStats.partialRate}%`}
                                        tone="link"
                                    />
                                    <StatCell
                                        label="防御失误"
                                        value={`${defenseStats.fail} 次`}
                                        note={`占比 ${defenseStats.failRate}%`}
                                        tone="danger"
                                    />
                                </div>

                                <div className="mt-3">
                                    <SegmentBar
                                        items={[
                                            { label: '完全闪避', tone: 'safe', ratio: defenseStats.dodge / defenseStats.total },
                                            { label: '格挡减免', tone: 'link', ratio: defenseStats.partial / defenseStats.total },
                                            { label: '防御失误', tone: 'danger', ratio: defenseStats.fail / defenseStats.total },
                                        ]}
                                    />
                                </div>
                            </PanelBlock>
                        )}

                    {/* 降维判定卡阵 */}
                    <PanelBlock
                        title="降维判定序列"
                        code={isAttackAxis ? 'SEQUENCE_ATTACK' : 'SEQUENCE_DEFENSE'}
                        className="min-h-0 flex-1"
                        bodyClassName="custom-scrollbar min-h-0 flex-1 overflow-y-auto pr-1"
                        aside={
                            <span className="text-[9px] tracking-[0.2em] text-cyan-800">
                                逐节推进
                            </span>
                        }
                    >
                        {isAttackAxis ? (
                            instantiatedAttack && instantiatedAttack.length > 0 ? (
                                <div
                                    key={`attack-roll-${rollToken}`}
                                    className="grid grid-cols-[repeat(auto-fill,minmax(126px,1fr))] gap-2.5"
                                >
                                    {instantiatedAttack.map(([ladder, value], index) => (
                                        <SequenceCard
                                            key={`atk-${index}`}
                                            index={index}
                                            ladder={ladder}
                                            label={attackOdds[ladder].label}
                                            reading={`${value}`}
                                            magnitude={(value / attackCeiling) * 100}
                                            actionTag="ATTACK"
                                        />
                                    ))}
                                </div>
                            ) : (
                                <EmptyHint
                                    title="尚未实例化攻击序列"
                                    desc="点击左侧「重新掷骰实例化」以展开因果账本"
                                    tone="danger"
                                />
                            )
                        ) : instantiatedDefense && instantiatedDefense.length > 0 ? (
                            <div
                                key={`defense-roll-${rollToken}`}
                                className="grid grid-cols-[repeat(auto-fill,minmax(126px,1fr))] gap-2.5"
                            >
                                {instantiatedDefense.map(([ladder, value], index) => (
                                    <SequenceCard
                                        key={`def-${index}`}
                                        index={index}
                                        ladder={ladder}
                                        label={defenseOdds[ladder].label}
                                        reading={ladder === 'dodge' ? '100%' : `${Math.round(value * 100)}%`}
                                        magnitude={ladder === 'dodge' ? 100 : value * 100}
                                        actionTag="GUARD"
                                    />
                                ))}
                            </div>
                        ) : (
                            <EmptyHint
                                title="尚未实例化防御序列"
                                desc="点击左侧「重新掷骰实例化」以展开因果账本"
                                tone="link"
                            />
                        )}
                    </PanelBlock>
                </main>
            </div>
        </div>,
        document.body
    );
};

// ============================================================================
// 5. 因果序列检视器
// ============================================================================

interface SequenceInspectorProps {
    weapon: WeaponTemplate;
    player?: PlayerState | null;
}

/**
 * 因果序列检视器：挂在物资档案内的紧凑推演入口。
 *
 * 《背景设定》5.3 中，灵性决定生还者能提前读到多少步因果；此处即那份账本
 * 在档案卡上的缩略视图。布局：序列轴 → 口径 → 期望分布 → 进入全屏推演终端。
 * 全屏终端的实例化状态由本组件持有，关闭终端后再次进入不会丢失本轮结果。
 */
const SequenceInspector: React.FC<SequenceInspectorProps> = ({ weapon, player }) => {
    const [activeMainTab, setActiveMainTab] = useState<'attack' | 'defense'>('attack');
    const [attackMode, setAttackMode] = useState<'base' | 'contextual'>('contextual');
    const [defenseMode, setDefenseMode] = useState<'equipped' | 'unarmed'>('equipped');
    const [instantiatedAttack, setInstantiatedAttack] = useState<AttackResult[] | null>(null);
    const [instantiatedDefense, setInstantiatedDefense] = useState<DefenseResult[] | null>(null);
    const [rollToken, setRollToken] = useState(0);
    const [isTerminalOpen, setIsTerminalOpen] = useState(false);

    /**
     * 序列容量 = 体力上限 / 10。
     *
     * 与设定一致：序列耗尽后须透支体力凝练新序列，因此序列长度直接由体力上限决定。
     */
    const sequenceLength = useMemo(() => {
        const stamina =
            player?.dynamic.maxStamina ?? player?.static?.initialState?.vital?.maxStamina;
        if (stamina !== undefined && stamina > 0) {
            return Math.max(1, Math.floor(stamina / 10));
        }
        return 10;
    }, [player]);

    const attackOdds = useMemo(
        () => getWeaponAttackOdds(weapon, player, attackMode),
        [weapon, player, attackMode]
    );

    const defenseOdds = useMemo(
        () => getEntityDefenseOdds(player, weapon, defenseMode),
        [player, weapon, defenseMode]
    );

    /** 切换口径 / 姿态后，已实例化的序列即作废。 */
    const clearInstantiated = useCallback(() => {
        setInstantiatedAttack(null);
        setInstantiatedDefense(null);
    }, []);

    const handleInstantiateAttack = useCallback(() => {
        setInstantiatedAttack(instantiateAttackSequence(attackOdds, sequenceLength));
        setRollToken((token) => token + 1);
    }, [attackOdds, sequenceLength]);

    const handleInstantiateDefense = useCallback(() => {
        setInstantiatedDefense(instantiateDefenseSequence(defenseOdds, sequenceLength));
        setRollToken((token) => token + 1);
    }, [defenseOdds, sequenceLength]);

    const isAttackAxis = activeMainTab === 'attack';

    /** 打开终端：首次进入时先补一次实例化，避免落到空态。 */
    const handleOpenTerminal = useCallback(() => {
        if (isAttackAxis ? !instantiatedAttack : !instantiatedDefense) {
            if (isAttackAxis) handleInstantiateAttack();
            else handleInstantiateDefense();
        }
        setIsTerminalOpen(true);
    }, [
        handleInstantiateAttack,
        handleInstantiateDefense,
        instantiatedAttack,
        instantiatedDefense,
        isAttackAxis,
    ]);

    return (
        <PanelBlock
            title="因果序列"
            code="SEQUENCE"
            tone={isAttackAxis ? 'danger' : 'link'}
            aside={
                <span className="text-[9px] tracking-[0.2em] text-cyan-800">
                    容量 {sequenceLength} 节
                </span>
            }
        >
            {/* 序列轴 */}
            <div className="mb-2.5 grid grid-cols-2 gap-1.5">
                {(
                    [
                        { id: 'attack', name: '攻击序列', code: 'ATTACK', tone: 'danger' },
                        { id: 'defense', name: '防御序列', code: 'DEFENSE', tone: 'link' },
                    ] as const
                ).map((axis) => {
                    const active = activeMainTab === axis.id;
                    return (
                        <button
                            key={axis.id}
                            type="button"
                            aria-pressed={active}
                            onClick={() => {
                                setActiveMainTab(axis.id);
                                clearInstantiated();
                            }}
                            className={`border py-1.5 transition-all outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/60 ${active
                                ? `${TONE[axis.tone].border} ${TONE[axis.tone].text} bg-black/60`
                                : 'border-cyan-900/40 text-cyan-800 hover:border-cyan-700 hover:text-cyan-500'
                                }`}
                        >
                            <span className="block text-[10px] font-bold tracking-[0.16em]">
                                {axis.name}
                            </span>
                            <span className="block text-[8px] tracking-[0.2em] opacity-70">
                                {axis.code}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* 口径 / 姿态 */}
            <div className="mb-2.5 flex items-center gap-1.5">
                {isAttackAxis
                    ? (
                        [
                            { id: 'base', name: '基础理论' },
                            { id: 'contextual', name: '属性加成' },
                        ] as const
                    ).map((model) => (
                        <button
                            key={model.id}
                            type="button"
                            aria-pressed={attackMode === model.id}
                            onClick={() => {
                                setAttackMode(model.id);
                                clearInstantiated();
                            }}
                            className={`flex-1 border py-1 text-[9px] tracking-[0.14em] transition-all outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/60 ${attackMode === model.id
                                ? 'border-red-500/50 bg-red-950/40 text-red-300'
                                : 'border-cyan-900/40 text-cyan-800 hover:border-cyan-700 hover:text-cyan-500'
                                }`}
                        >
                            {model.name}
                        </button>
                    ))
                    : (
                        [
                            { id: 'equipped', name: '持武姿态' },
                            { id: 'unarmed', name: '空手裸装' },
                        ] as const
                    ).map((posture) => (
                        <button
                            key={posture.id}
                            type="button"
                            aria-pressed={defenseMode === posture.id}
                            onClick={() => {
                                setDefenseMode(posture.id);
                                clearInstantiated();
                            }}
                            className={`flex-1 border py-1 text-[9px] tracking-[0.14em] transition-all outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/60 ${defenseMode === posture.id
                                ? 'border-cyan-500/50 bg-cyan-950/40 text-cyan-200'
                                : 'border-cyan-900/40 text-cyan-800 hover:border-cyan-700 hover:text-cyan-500'
                                }`}
                        >
                            {posture.name}
                        </button>
                    ))}
            </div>

            <p className="mb-2.5 whitespace-pre-line border-l-2 border-cyan-900/60 pl-2 text-[9px] italic leading-relaxed text-cyan-300/60">
                {isAttackAxis ? attackOdds.description : defenseOdds.description}
            </p>

            {!isAttackAxis && defenseOdds.notes.length > 0 && (
                <div className="mb-2.5 space-y-1">
                    {defenseOdds.notes.map((note, index) => (
                        <p
                            key={`inspector-note-${index}`}
                            className="border-l-2 border-amber-500/40 pl-1.5 text-[9px] leading-relaxed text-amber-200/80"
                        >
                            {note}
                        </p>
                    ))}
                </div>
            )}

            {/* 期望分布概览 + 逐档明细 */}
            <div className="mb-2.5">
                <SegmentBar
                    items={
                        isAttackAxis
                            ? [
                                { label: attackOdds.crit.label, tone: 'warn', ratio: attackOdds.crit.rate },
                                { label: attackOdds.hit.label, tone: 'danger', ratio: attackOdds.hit.rate },
                                { label: attackOdds.graze.label, tone: 'link', ratio: attackOdds.graze.rate },
                                { label: attackOdds.miss.label, tone: 'link', ratio: attackOdds.miss.rate },
                            ]
                            : [
                                { label: defenseOdds.dodge.label, tone: 'safe', ratio: defenseOdds.dodge.rate },
                                { label: defenseOdds.partial.label, tone: 'link', ratio: defenseOdds.partial.rate },
                                { label: defenseOdds.fail.label, tone: 'danger', ratio: defenseOdds.fail.rate },
                            ]
                    }
                />
            </div>

            <div className="mb-2.5 space-y-2.5">
                {(isAttackAxis
                    ? [attackOdds.crit, attackOdds.hit, attackOdds.graze, attackOdds.miss]
                    : [defenseOdds.dodge, defenseOdds.partial, defenseOdds.fail]
                ).map((ladderOdds) => (
                    <OddsRow
                        key={ladderOdds.ladder}
                        label={ladderOdds.label}
                        rate={ladderOdds.rate}
                        tone={LADDER_TONE[ladderOdds.ladder]}
                        reading={formatLadderReading(ladderOdds)}
                    />
                ))}
            </div>

            <button
                type="button"
                onClick={handleOpenTerminal}
                className={`relative w-full border py-2 text-[10px] font-bold tracking-[0.18em] transition-all outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/60 ${isAttackAxis
                    ? 'border-red-500/50 bg-red-950/40 text-red-200 hover:border-red-400 hover:bg-red-900/50'
                    : 'border-cyan-500/50 bg-cyan-950/40 text-cyan-200 hover:border-cyan-400 hover:bg-cyan-900/50'
                    }`}
            >
                <CornerTicks className={isAttackAxis ? 'border-red-500/40' : 'border-cyan-500/40'} />
                打开推演终端 · 实例化序列（{sequenceLength} 节）
            </button>

            {isTerminalOpen && (
                <SequenceTerminal
                    weapon={weapon}
                    player={player}
                    activeMainTab={activeMainTab}
                    setActiveMainTab={setActiveMainTab}
                    attackMode={attackMode}
                    setAttackMode={setAttackMode}
                    defenseMode={defenseMode}
                    setDefenseMode={setDefenseMode}
                    attackOdds={attackOdds}
                    defenseOdds={defenseOdds}
                    sequenceLength={sequenceLength}
                    instantiatedAttack={instantiatedAttack}
                    instantiatedDefense={instantiatedDefense}
                    rollToken={rollToken}
                    onReinstantiateAttack={handleInstantiateAttack}
                    onReinstantiateDefense={handleInstantiateDefense}
                    onClose={() => setIsTerminalOpen(false)}
                />
            )}
        </PanelBlock>
    );
};

// ============================================================================
// 6. 主面板
// ============================================================================

interface InventoryPanelProps {
    player: PlayerState;
    grid: InventoryGridApi;
    onUseItem: (item: ItemInstance) => void | Promise<void>;
    onDiscardItem: (item: ItemInstance) => void;
    gameActive?: boolean;
}

type GridTile = InventoryGridApi['tiles'][number];

interface DragState {
    instanceId: string;
    cellX: number;
    cellY: number;
    width: number;
    height: number;
    valid: boolean;
}

const InventoryPanel: React.FC<InventoryPanelProps> = ({
    player,
    grid,
    onUseItem,
    onDiscardItem,
    gameActive = true,
}) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [drag, setDrag] = useState<DragState | null>(null);
    const [query, setQuery] = useState('');
    const [rarityFilter, setRarityFilter] = useState<ItemGrade | 'all'>('all');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [confirmingDiscard, setConfirmingDiscard] = useState(false);
    const [cell, setCell] = useState(44);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLDivElement | null>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const dragSessionRef = useRef<{
        instanceId: string;
        pointerId: number;
        grabX: number;
        grabY: number;
    } | null>(null);
    const dragRef = useRef<DragState | null>(null);
    const discardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = useRef(true);

    const [cols, rows] = grid.size;
    const inventory = player.dynamic.inventory;

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (discardTimerRef.current) clearTimeout(discardTimerRef.current);
        };
    }, []);

    // 格子边长跟随可用宽度自适应，保证整张网格始终完整可见
    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        const observer = new ResizeObserver((entries) => {
            const available = entries[0]?.contentRect.width ?? 0;
            if (available <= 0) return;
            setCell(clamp(Math.floor((available - 16) / cols), 26, 60));
        });

        observer.observe(element);
        return () => observer.disconnect();
    }, [cols]);

    const equippedItemIds = useMemo(() => {
        const ids = new Set<string>();
        getEquippedInstances(player.dynamic.equipment).forEach((item) => {
            ids.add(item.instanceId);
        });
        return ids;
    }, [player.dynamic.equipment]);

    const tileByInstanceId = useMemo(() => {
        const map = new Map<string, GridTile>();
        grid.tiles.forEach((tile) => map.set(tile.item.instanceId, tile));
        return map;
    }, [grid.tiles]);

    const matchesFilter = useCallback(
        (item: ItemInstance): boolean => {
            if (rarityFilter !== 'all' && item.grade !== rarityFilter) return false;
            const normalized = query.trim().toLowerCase();
            if (!normalized) return true;
            return getSearchText(item).includes(normalized);
        },
        [query, rarityFilter]
    );

    const rarityCount = useMemo<Record<ItemGrade, number>>(() => {
        const counts = Object.fromEntries(
            RARITY_META.map((meta) => [meta.level, 0])
        ) as Record<ItemGrade, number>;
        inventory.forEach((item) => {
            counts[item.grade] += 1;
        });
        return counts;
    }, [inventory]);

    const selectedItem = useMemo(
        () =>
            inventory.find((item) => item.instanceId === selectedId)
            ?? grid.overflow.find((item) => item.instanceId === selectedId)
            ?? null,
        [grid.overflow, inventory, selectedId]
    );

    /** 选中物的网格规格；溢出区物资不在网格内，故可能为空。 */
    const selectedTile = selectedItem
        ? tileByInstanceId.get(selectedItem.instanceId)
        : undefined;

    // 选中物被消耗 / 卸下后自动清空详情区
    useEffect(() => {
        if (selectedId && !selectedItem) {
            setSelectedId(null);
            setConfirmingDiscard(false);
        }
    }, [selectedId, selectedItem]);

    const updateDrag = useCallback((next: DragState | null) => {
        dragRef.current = next;
        setDrag(next);
    }, []);

    const handlePointerDown = useCallback(
        (event: React.PointerEvent<HTMLButtonElement>, tile: GridTile) => {
            if (!gameActive) return;

            const canvas = canvasRef.current;
            if (!canvas) return;

            event.preventDefault();
            const rect = canvas.getBoundingClientRect();
            dragSessionRef.current = {
                instanceId: tile.item.instanceId,
                pointerId: event.pointerId,
                grabX: event.clientX - rect.left - tile.x * cell,
                grabY: event.clientY - rect.top - tile.y * cell,
            };

            event.currentTarget.setPointerCapture(event.pointerId);
            setSelectedId(tile.item.instanceId);
            updateDrag({
                instanceId: tile.item.instanceId,
                cellX: tile.x,
                cellY: tile.y,
                width: tile.width,
                height: tile.height,
                valid: true,
            });
        },
        [cell, gameActive, updateDrag]
    );

    const handlePointerMove = useCallback(
        (event: React.PointerEvent<HTMLButtonElement>) => {
            const session = dragSessionRef.current;
            const current = dragRef.current;
            const canvas = canvasRef.current;
            if (!session || !current || !canvas) return;
            if (event.pointerId !== session.pointerId) return;

            const rect = canvas.getBoundingClientRect();
            const localX = event.clientX - rect.left - session.grabX;
            const localY = event.clientY - rect.top - session.grabY;
            const cellX = clamp(Math.round(localX / cell), 0, cols - current.width);
            const cellY = clamp(Math.round(localY / cell), 0, rows - current.height);
            if (current.cellX === cellX && current.cellY === cellY) return;

            updateDrag({
                ...current,
                cellX,
                cellY,
                valid: grid.canPlace(session.instanceId, cellX, cellY),
            });
        },
        [cell, cols, grid, rows, updateDrag]
    );

    const finishDrag = useCallback(
        (commit: boolean) => {
            const session = dragSessionRef.current;
            const current = dragRef.current;
            dragSessionRef.current = null;
            updateDrag(null);

            if (!commit || !session || !current || !current.valid) return;
            grid.moveItem(session.instanceId, current.cellX, current.cellY);
        },
        [grid, updateDrag]
    );

    const handleRotate = useCallback(
        (instanceId: string) => {
            if (!gameActive) return;
            grid.rotateItem(instanceId);
        },
        [gameActive, grid]
    );

    const handlePrimaryAction = useCallback(
        async (item: ItemInstance) => {
            if (!gameActive || processingId) return;

            setProcessingId(item.instanceId);
            try {
                await onUseItem(item);
            } catch (error) {
                console.error('[InventoryPanel] 使用物品失败:', error);
            } finally {
                if (mountedRef.current) setProcessingId(null);
            }
        },
        [gameActive, onUseItem, processingId]
    );

    const handleDiscard = useCallback(
        (item: ItemInstance) => {
            if (!gameActive) return;

            // 二次确认：首次点击起计时，超时自动解除
            if (!confirmingDiscard) {
                setConfirmingDiscard(true);
                if (discardTimerRef.current) clearTimeout(discardTimerRef.current);
                discardTimerRef.current = setTimeout(() => setConfirmingDiscard(false), 2600);
                return;
            }

            if (discardTimerRef.current) clearTimeout(discardTimerRef.current);
            setConfirmingDiscard(false);
            try {
                onDiscardItem(item);
            } catch (error) {
                console.error('[InventoryPanel] 销毁物品失败:', error);
            }
        },
        [confirmingDiscard, gameActive, onDiscardItem]
    );

    /**
     * 面板快捷键。
     *
     * 仅在无模态层（推演终端）时生效：终端已把 ESC / ←→ 收归己用，
     * 若两处同时消费会导致 ESC 既关终端又清空选中。
     */
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!gameActive || document.body.dataset.modal) return;

            const target = event.target as HTMLElement | null;
            const typing =
                target instanceof HTMLInputElement
                || target instanceof HTMLTextAreaElement
                || Boolean(target?.isContentEditable);

            if (typing) {
                if (event.key === 'Escape') {
                    setQuery('');
                    target?.blur();
                }
                return;
            }

            if (event.key === '/') {
                event.preventDefault();
                searchInputRef.current?.focus();
                return;
            }
            if (event.key === 'Escape') {
                setSelectedId(null);
                setConfirmingDiscard(false);
                return;
            }
            if (!selectedItem) return;

            if (event.key === 'r' || event.key === 'R') {
                event.preventDefault();
                handleRotate(selectedItem.instanceId);
                return;
            }
            if (event.key === 'Enter') {
                event.preventDefault();
                void handlePrimaryAction(selectedItem);
                return;
            }
            if (event.key === 'Delete' || event.key === 'Backspace') {
                event.preventDefault();
                handleDiscard(selectedItem);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameActive, selectedItem, handleDiscard, handlePrimaryAction, handleRotate]);

    // ---- 链接仪读数 ----
    const { neuralLink, currentZoneTime: zoneTime } = player;
    const batteryPct = Math.round(getPercent(neuralLink.battery, neuralLink.maxBattery));
    const integrityPct = Math.round(getPercent(neuralLink.integrity, neuralLink.maxIntegrity));
    /** 底噪浓度：视神经噪点直接驱动滤网画面的脏污程度。 */
    const noiseRatio = clamp(neuralLink.noiseLevel / 100, 0, 1);

    /** 档案参数表是否存在可读字段；容器类物品无任何参数，需整块隐去而非留空框。 */
    const hasStatRows = Boolean(
        selectedItem
        && (isWeaponInstance(selectedItem)
            || isArmorInstance(selectedItem)
            || isDataInstance(selectedItem)
            || isMaterial(selectedItem)
            || hasDurability(selectedItem)
            || ((isAccessoryInstance(selectedItem) || isConsumableInstance(selectedItem))
                && (selectedItem.effects?.length ?? 0) > 0))
    );

    const visibleCount = inventory.filter(matchesFilter).length;
    const usagePercent = grid.totalCells > 0
        ? Math.round((grid.usedCells / grid.totalCells) * 100)
        : 0;

    // ---- 危险态：硬件行将熔毁或负荷逼近溢出 ----
    const isOverloaded = usagePercent >= 90 || grid.overflow.length > 0;
    const isDeviceFailing = batteryPct <= 20 || integrityPct <= 30;

    return (
        <div className="relative flex h-full w-full select-none flex-col overflow-hidden bg-[#05070b] font-mono text-cyan-100">
            <FilterNoise intensity={0.25 + noiseRatio * 0.5} />

            {/* ══ 设备铭牌 ══════════════════════════════════════════════ */}
            <header className="relative z-10 shrink-0 border-b border-cyan-500/20 bg-black/60 backdrop-blur-md">
                <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-5 pb-3 pt-3.5">
                    <div className="flex min-w-0 items-start gap-3.5">
                        <div className="relative mt-0.5 h-3.5 w-3.5 shrink-0">
                            <span
                                className={`block h-3.5 w-3.5 ${gameActive ? 'animate-pulse bg-cyan-400' : 'bg-red-500'
                                    } shadow-[0_0_12px_rgba(34,211,238,0.8)]`}
                            />
                            <span className="absolute -inset-1 animate-[spin_4s_linear_infinite] border border-cyan-400/30" />
                        </div>

                        <div className="min-w-0">
                            <h2 className="flex flex-wrap items-baseline gap-x-2 text-[17px] font-bold uppercase leading-none tracking-[0.3em] text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                                储物网格
                                <span className="text-[9px] tracking-[0.2em] text-cyan-800">
                  // CARGO_GRID
                                </span>
                                <span className="inline-block h-3.5 w-1.5 animate-pulse bg-cyan-400/90 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                            </h2>

                            <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] tracking-[0.18em] text-cyan-700">
                                <span>
                                    负荷 {grid.usedCells} / {grid.totalCells} 格
                                </span>
                                <span className="text-cyan-900">//</span>
                                <span>
                                    网格 {cols}×{rows}
                                </span>
                                <span className="text-cyan-900">//</span>
                                <span>挂载 {equippedItemIds.size} 件</span>
                                <span className="text-cyan-900">//</span>
                                <span>命中 {visibleCount} 件</span>
                                {grid.overflow.length > 0 && (
                                    <>
                                        <span className="text-cyan-900">//</span>
                                        <span className="animate-pulse text-red-400">
                                            溢出 {grid.overflow.length} 件
                                        </span>
                                    </>
                                )}
                                <span className="text-cyan-900">//</span>
                                <span className={gameActive ? 'text-emerald-400/90' : 'animate-pulse text-red-400'}>
                                    {gameActive ? '链路在线' : '系统锁定'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 链接仪读数矩阵：统一收入边框组内，避免读数散落并与负荷条抢视线 */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border border-cyan-500/15 bg-black/40 px-3.5 py-2">
                        <Readout
                            label="主观时空"
                            value={`D${zoneTime.day}·C${zoneTime.cycle}·T${zoneTime.tick}`}
                            note="ZONE_DATE"
                        />

                        <Readout
                            label="完整度"
                            value={`${integrityPct}%`}
                            tone={integrityPct <= 30 ? 'danger' : 'link'}
                            note="INTEGRITY"
                        />

                        <div className="flex flex-col gap-1">
                            <span className="text-[8px] tracking-[0.3em] text-cyan-800">链接电力</span>
                            <Gauge
                                value={batteryPct}
                                tone={batteryPct <= 20 ? 'danger' : 'link'}
                                segments={10}
                                className="h-2.5 w-[96px]"
                            />
                            <span
                                className={`text-[8px] tracking-[0.2em] ${batteryPct <= 20 ? 'animate-pulse text-red-400' : 'text-cyan-900'
                                    }`}
                            >
                                BATTERY {batteryPct}%
                            </span>
                        </div>

                        <Readout
                            label="护目等级"
                            value={`LV ${neuralLink.visorLevel}`}
                            note="VISOR"
                        />

                        <Readout
                            label="视神经噪点"
                            value={neuralLink.noiseLevel}
                            tone={noiseRatio > 0.6 ? 'warn' : 'link'}
                            note="STATIC"
                        />
                    </div>
                </div>

                {/* 负荷计量 */}
                <div className="flex items-center gap-3 border-t border-cyan-500/10 px-5 py-2">
                    <span className="shrink-0 text-[9px] tracking-[0.24em] text-cyan-800">
                        负荷占用
                    </span>
                    <div className="min-w-0 flex-1">
                        <Gauge
                            segments={24}
                            value={usagePercent}
                            tone={isOverloaded ? 'danger' : 'link'}
                            className="h-2"
                        />
                    </div>
                    <span
                        className={`w-10 shrink-0 text-right text-[10px] font-bold tabular-nums ${isOverloaded ? 'text-red-400' : 'text-cyan-400'
                            }`}
                    >
                        {usagePercent}%
                    </span>
                    <span className="hidden shrink-0 text-[8px] tracking-[0.2em] text-cyan-900 sm:inline">
                        LIMIT {grid.totalCells}
                    </span>
                </div>
            </header>

            {/* ══ 检索带 ════════════════════════════════════════════════ */}
            <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-2 border-b border-cyan-500/15 bg-black/35 px-4 py-2.5">
                <button
                    type="button"
                    onClick={() => grid.autoArrange()}
                    disabled={!gameActive || inventory.length === 0}
                    className="border border-cyan-500/40 bg-cyan-950/30 px-3 py-1 text-[10px] tracking-[0.16em] text-cyan-300 transition-all outline-none hover:border-cyan-400 hover:bg-cyan-900/40 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-1 focus-visible:ring-cyan-400/60"
                >
                    重排阵列
                </button>

                <button
                    type="button"
                    onClick={() => selectedId && handleRotate(selectedId)}
                    disabled={!gameActive || !selectedTile}
                    title="旋转选中物资（快捷键 R）"
                    className="flex items-center gap-1.5 border border-cyan-900/40 px-3 py-1 text-[10px] tracking-[0.16em] text-cyan-700 transition-all outline-none hover:border-cyan-700 hover:text-cyan-400 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-1 focus-visible:ring-cyan-400/60"
                >
                    旋转
                    <KeyHint>R</KeyHint>
                </button>

                <div className="relative min-w-[160px] flex-1">
                    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 animate-pulse text-[10px] text-cyan-500">
                        {'>'}
                    </span>
                    <input
                        ref={searchInputRef}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="频谱检索：名称 / 类型 / 效果"
                        aria-label="检索物品"
                        autoComplete="off"
                        className="h-7 w-full border border-cyan-900/50 bg-black/60 pl-6 pr-12 text-[10px] tracking-[0.16em] text-cyan-200 outline-none placeholder:text-cyan-900 focus:border-cyan-500/70 focus:shadow-[0_0_10px_rgba(34,211,238,0.15)]"
                    />
                    {query ? (
                        <button
                            type="button"
                            onClick={() => setQuery('')}
                            aria-label="清除检索"
                            className="absolute right-1 top-1/2 -translate-y-1/2 px-1 text-[9px] tracking-[0.16em] text-cyan-700 transition-colors hover:text-cyan-300"
                        >
                            清除
                        </button>
                    ) : (
                        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2">
                            <KeyHint>/</KeyHint>
                        </span>
                    )}
                </div>

                <span className="shrink-0 border border-cyan-900/40 bg-cyan-950/20 px-2 py-0.5 text-[9px] tracking-[0.16em] text-cyan-600">
                    命中 {visibleCount} / {inventory.length}
                </span>

                <span className="h-5 w-px shrink-0 bg-cyan-900/50" />
                <span className="shrink-0 text-[9px] tracking-[0.24em] text-cyan-800">
                    物质谱系
                </span>

                <div className="flex flex-wrap items-center gap-1">
                    <RarityFilterButton
                        label={`全部 [${inventory.length}]`}
                        isActive={rarityFilter === 'all'}
                        onClick={() => setRarityFilter('all')}
                    />
                    {RARITY_META.filter(
                        (meta) => rarityCount[meta.level] > 0 || rarityFilter === meta.level
                    ).map((meta) => (
                        <RarityFilterButton
                            key={meta.level}
                            rarity={meta.level}
                            label={`${meta.name} [${rarityCount[meta.level]}]`}
                            isActive={rarityFilter === meta.level}
                            onClick={() => setRarityFilter(meta.level)}
                        />
                    ))}
                </div>
            </div>

            {/* ══ 主体：量测网格 + 物资档案 ══════════════════════════════ */}
            <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
                <div ref={containerRef} className="custom-scrollbar min-h-0 flex-1 overflow-auto p-5">
                    <div className="mx-auto" style={{ width: cols * cell }}>
                        <div className="relative" style={{ width: cols * cell, height: rows * cell }}>
                            {/* 列标：A / B / C…，为密集格网提供可指认的坐标 */}
                            <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-4 flex">
                                {Array.from({ length: cols }, (_, col) => (
                                    <span
                                        key={`ruler-x-${col}`}
                                        className="text-center text-[8px] leading-none tracking-[0.2em] text-cyan-800/70"
                                        style={{ width: cell }}
                                    >
                                        {String.fromCharCode(65 + col)}
                                    </span>
                                ))}
                            </div>

                            {/* 行标：1 / 2 / 3… */}
                            <div aria-hidden className="pointer-events-none absolute inset-y-0 -left-4 flex flex-col">
                                {Array.from({ length: rows }, (_, row) => (
                                    <span
                                        key={`ruler-y-${row}`}
                                        className="flex items-center justify-end pr-1 text-[8px] leading-none text-cyan-800/70"
                                        style={{ height: cell }}
                                    >
                                        {row + 1}
                                    </span>
                                ))}
                            </div>

                            <div
                                ref={canvasRef}
                                role="grid"
                                aria-label="背包格网"
                                className="relative border border-cyan-500/25 bg-black/55 shadow-[inset_0_0_60px_rgba(0,0,0,0.8)]"
                                style={{
                                    width: cols * cell,
                                    height: rows * cell,
                                    backgroundImage:
                                        'linear-gradient(to right, rgba(34,211,238,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(34,211,238,0.08) 1px, transparent 1px)',
                                    backgroundSize: `${cell}px ${cell}px`,
                                }}
                            >
                                <CornerTicks />

                                {/* 量测刻度：纵向列标 + 横向行标，构成滤网的观测量尺 */}
                                <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
                                    {Array.from({ length: cols }, (_, col) => (
                                        <span
                                            key={`tick-x-${col}`}
                                            className="absolute top-0 w-px bg-cyan-400/15"
                                            style={{ left: col * cell, height: col % 2 === 0 ? 10 : 5 }}
                                        />
                                    ))}
                                    {Array.from({ length: rows }, (_, row) => (
                                        <span
                                            key={`tick-y-${row}`}
                                            className="absolute left-0 h-px bg-cyan-400/15"
                                            style={{ top: row * cell, width: row % 2 === 0 ? 10 : 5 }}
                                        />
                                    ))}
                                </div>

                                {/* 网格单元底纹：已占用格由卡片覆盖，空格保持暗格 */}
                                {Array.from({ length: cols * rows }, (_, index) => {
                                    const col = index % cols;
                                    const row = Math.floor(index / cols);
                                    return (
                                        <div
                                            key={`cell-${row}-${col}`}
                                            aria-hidden
                                            className="pointer-events-none absolute border border-white/[0.03]"
                                            style={{
                                                left: col * cell,
                                                top: row * cell,
                                                width: cell,
                                                height: cell,
                                            }}
                                        />
                                    );
                                })}

                                {/* 拖拽落点提示 */}
                                {drag && (
                                    <div
                                        aria-hidden
                                        className={`pointer-events-none absolute z-20 border-2 transition-colors duration-150 ${drag.valid
                                            ? 'border-cyan-400 bg-cyan-400/15 shadow-[0_0_18px_rgba(34,211,238,0.45)]'
                                            : 'border-red-500 bg-red-500/15 shadow-[0_0_18px_rgba(239,68,68,0.45)]'
                                            }`}
                                        style={{
                                            left: drag.cellX * cell,
                                            top: drag.cellY * cell,
                                            width: drag.width * cell,
                                            height: drag.height * cell,
                                        }}
                                    />
                                )}

                                {grid.tiles.map((tile) => {
                                    const item = tile.item;
                                    const activeDrag = drag && drag.instanceId === item.instanceId ? drag : null;
                                    const isDragged = activeDrag !== null;
                                    const x = activeDrag ? activeDrag.cellX : tile.x;
                                    const y = activeDrag ? activeDrag.cellY : tile.y;
                                    const matched = matchesFilter(item);
                                    const equipped = equippedItemIds.has(item.instanceId);
                                    const quantity = getQuantity(item);
                                    const durability = getDurabilityPercent(item);
                                    const selected = selectedId === item.instanceId;

                                    return (
                                        <button
                                            key={item.instanceId}
                                            type="button"
                                            data-rarity={item.grade}
                                            aria-label={item.name}
                                            aria-selected={selected}
                                            title={`${item.name}${quantity > 1 ? ` ×${quantity}` : ''}`}
                                            style={{
                                                ...(RARITY_MAP[item.grade].vars as React.CSSProperties),
                                                left: x * cell + 1,
                                                top: y * cell + 1,
                                                width: tile.width * cell - 2,
                                                height: tile.height * cell - 2,
                                                opacity: isDragged ? 0.55 : matched ? 1 : 0.22,
                                            }}
                                            onPointerDown={(event) => handlePointerDown(event, tile)}
                                            onPointerMove={handlePointerMove}
                                            onPointerUp={() => finishDrag(true)}
                                            onPointerCancel={() => finishDrag(false)}
                                            onDoubleClick={() => void handlePrimaryAction(item)}
                                            onContextMenu={(event) => {
                                                event.preventDefault();
                                                handleRotate(item.instanceId);
                                            }}
                                            className={`rarity-cell absolute z-10 touch-none border text-left transition-[opacity,box-shadow] duration-200 outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/60 ${isDragged ? 'z-30 cursor-grabbing' : 'cursor-grab hover:z-20'
                                                } ${selected ? 'z-20 ring-1 ring-cyan-300/70 shadow-[0_0_16px_rgba(34,211,238,0.45)]' : ''
                                                }`}
                                        >
                                            <div className="relative flex h-full w-full flex-col justify-between overflow-hidden p-1">
                                                <div className="flex items-start justify-between gap-1">
                                                    <span className="flex min-w-0 items-start gap-1">
                                                        <span className="mt-px shrink-0 border border-cyan-900/50 bg-black/60 px-0.5 text-[8px] leading-[1.35] text-cyan-500/90">
                                                            {TYPE_GLYPH[item.type]}
                                                        </span>
                                                        <span className="rarity-name line-clamp-2 text-[10px] leading-tight">
                                                            {item.name}
                                                        </span>
                                                    </span>
                                                    {quantity > 1 && (
                                                        <span className="shrink-0 border border-cyan-800/60 bg-black/60 px-0.5 text-[8px] leading-[1.35] text-cyan-300/90">
                                                            ×{quantity}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-end justify-between gap-1">
                                                    {hasDurability(item) ? (
                                                        <Gauge
                                                            value={durability}
                                                            tone={durability < 30 ? 'danger' : 'link'}
                                                            className="h-1 flex-1"
                                                        />
                                                    ) : (
                                                        <span className="flex-1" />
                                                    )}
                                                    {equipped && (
                                                        <span className="shrink-0 border border-emerald-600/50 bg-emerald-950/60 px-0.5 text-[8px] leading-[1.35] text-emerald-300">
                                                            EQ
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}

                                {inventory.length === 0 && (
                                    <EmptyHint
                                        title="网格为空"
                                        desc="未检测到挂载物资"
                                    />
                                )}
                            </div>
                        </div>

                        {/* 网格读数 */}
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[8px] tracking-[0.2em] text-cyan-800">
                            <span>
                                量测网格 {cols}×{rows}
                            </span>
                            <span className="text-cyan-900">//</span>
                            <span>单格 {cell}px</span>
                            <span className="text-cyan-900">//</span>
                            <span>占用 {grid.usedCells} 格</span>
                            <span className="h-px flex-1 bg-gradient-to-r from-cyan-900/50 to-transparent" />
                        </div>

                        {/* 溢出区 */}
                        {grid.overflow.length > 0 && (
                            <PanelBlock
                                title="溢出缓冲区"
                                code="OVERFLOW"
                                tone="danger"
                                className="mt-3"
                                aside={
                                    <span className="text-[9px] tracking-[0.2em] text-red-400">
                                        {grid.overflow.length} 件待整理
                                    </span>
                                }
                            >
                                <div className="flex flex-wrap gap-1.5">
                                    {grid.overflow.map((item) => (
                                        <button
                                            key={item.instanceId}
                                            type="button"
                                            data-rarity={item.grade}
                                            style={RARITY_MAP[item.grade].vars as React.CSSProperties}
                                            onClick={() => setSelectedId(item.instanceId)}
                                            onDoubleClick={() => void handlePrimaryAction(item)}
                                            title={item.name}
                                            className={`rarity-cell flex items-center gap-1.5 border px-2 py-1 text-[10px] tracking-[0.14em] transition-all outline-none focus-visible:ring-1 focus-visible:ring-red-400/60 ${selectedId === item.instanceId
                                                ? 'ring-1 ring-red-400/60 shadow-[0_0_10px_rgba(239,68,68,0.35)]'
                                                : 'opacity-80 hover:opacity-100'
                                                }`}
                                        >
                                            <span className="border border-cyan-900/50 bg-black/60 px-0.5 text-[8px] leading-[1.35] text-cyan-500/90">
                                                {TYPE_GLYPH[item.type]}
                                            </span>
                                            {item.name}
                                        </button>
                                    ))}
                                </div>
                            </PanelBlock>
                        )}

                        {/* 操作图例 */}
                        <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[9px] tracking-[0.18em] text-cyan-800">
                            <span className="flex items-center gap-1.5">
                                <KeyHint>拖拽</KeyHint>移动
                            </span>
                            <span className="flex items-center gap-1.5">
                                <KeyHint>双击</KeyHint>使用 / 装备
                            </span>
                            <span className="flex items-center gap-1.5">
                                <KeyHint>R</KeyHint>旋转
                            </span>
                            <span className="flex items-center gap-1.5">
                                <KeyHint>Enter</KeyHint>使用
                            </span>
                            <span className="flex items-center gap-1.5">
                                <KeyHint>Del</KeyHint>销毁
                            </span>
                            <span className="flex items-center gap-1.5">
                                <KeyHint>/</KeyHint>检索
                            </span>
                            <span className="flex items-center gap-1.5">
                                <KeyHint>Esc</KeyHint>取消选中
                            </span>
                        </div>
                    </div>
                </div>

                {/* ══ 物资档案 ═══════════════════════════════════════════ */}
                <aside className="custom-scrollbar relative z-10 w-full shrink-0 overflow-y-auto border-t border-cyan-500/15 p-4 lg:w-[360px] lg:border-l lg:border-t-0 xl:w-[400px]">
                    {!selectedItem ? (
                        <EmptyHint
                            title="未选中物资"
                            desc="在网格中左键点击任意物资以展开降维档案"
                        />
                    ) : (
                        <div
                            className="rarity-card relative bg-black/45 p-3"
                            data-rarity={selectedItem.grade}
                            data-intensity={RARITY_MAP[selectedItem.grade].intensity}
                            data-equipped={equippedItemIds.has(selectedItem.instanceId)}
                            style={RARITY_MAP[selectedItem.grade].vars as React.CSSProperties}
                        >
                            <div className="rarity-inner" aria-hidden>
                                <div className="rarity-skin" />
                            </div>

                            <div className="relative z-10 space-y-3">
                                {/* 身份牌 */}
                                <div>
                                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                                        <span
                                            className={`border px-1.5 py-0.5 text-[9px] tracking-[0.18em] ${TYPE_BADGE[selectedItem.type]}`}
                                        >
                                            {ITEM_TYPE_LABEL[selectedItem.type]}
                                        </span>
                                        <span className="rarity-badge border px-1.5 py-0.5 text-[9px] tracking-[0.18em]">
                                            {RARITY_MAP[selectedItem.grade].name}
                                        </span>
                                        {selectedTile && (
                                            <span className="border border-cyan-900/50 bg-cyan-950/30 px-1.5 py-0.5 text-[9px] text-cyan-400/80">
                                                {selectedTile.width}×{selectedTile.height} 格
                                            </span>
                                        )}
                                        {equippedItemIds.has(selectedItem.instanceId) && (
                                            <span className="border border-emerald-500/50 bg-emerald-950/70 px-1.5 py-0.5 text-[9px] tracking-[0.18em] text-emerald-400">
                                                已装备
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="rarity-name text-sm font-bold">{selectedItem.name}</h3>
                                </div>

                                {/* 参数表 */}
                                {hasStatRows && (
                                    <PanelBlock title="参数" code="SPEC" bodyClassName="space-y-1.5">
                                        {isWeaponInstance(selectedItem) && (
                                            <>
                                                <StatRow
                                                    label="类型"
                                                    value={WEAPON_TYPE_LABEL[selectedItem.weaponType]}
                                                />
                                                <StatRow
                                                    label="威力"
                                                    value={selectedItem.damage}
                                                    valueColor="text-red-400 drop-shadow-[0_0_2px_rgba(248,113,113,0.8)]"
                                                />
                                                <StatRow
                                                    label="模式"
                                                    value={DAMAGE_TYPE_LABEL[selectedItem.weaponDamageType]}
                                                />
                                                <StatRow
                                                    label="射程"
                                                    value={selectedItem.range <= 0 ? '无限' : `${selectedItem.range} 格`}
                                                />
                                            </>
                                        )}

                                        {isArmorInstance(selectedItem) && (
                                            <StatRow
                                                label="减伤"
                                                value={`${Math.round(clamp(selectedItem.defense ?? 0, -1, 1) * 100)}%`}
                                                valueColor="text-blue-400 drop-shadow-[0_0_2px_rgba(96,165,250,0.8)]"
                                            />
                                        )}

                                        {(isAccessoryInstance(selectedItem) || isConsumableInstance(selectedItem)) &&
                                            (selectedItem.effects?.length ?? 0) > 0 &&
                                            selectedItem.effects.map((effect, index) => (
                                                <StatRow
                                                    key={`effect-${selectedItem.instanceId}-${index}`}
                                                    label={isAccessoryInstance(selectedItem) ? '模块' : '效果'}
                                                    value={formatEffect(effect)}
                                                />
                                            ))}

                                        {isDataInstance(selectedItem) && (
                                            <>
                                                <StatRow
                                                    label="格式"
                                                    value={
                                                        selectedItem.audioScript || selectedItem.audioUrl
                                                            ? '音频'
                                                            : selectedItem.documentContent
                                                                ? '文档'
                                                                : '未知'
                                                    }
                                                />
                                                {(selectedItem.audioScript || selectedItem.audioUrl) && (
                                                    <StatRow
                                                        label="加密"
                                                        value={selectedItem.audioUrl ? '已解密' : '未解密'}
                                                        valueColor={selectedItem.audioUrl ? 'text-emerald-400' : 'text-amber-400'}
                                                    />
                                                )}
                                            </>
                                        )}

                                        {isMaterial(selectedItem) && (
                                            <StatRow label="分类" value="原始资源" />
                                        )}

                                        {hasDurability(selectedItem) && (
                                            <StatRow
                                                label="耐久"
                                                value={`${selectedItem.currentUses} / ${selectedItem.maxUses}`}
                                                valueColor={
                                                    getDurabilityPercent(selectedItem) < 30
                                                        ? 'animate-pulse text-red-400'
                                                        : 'text-cyan-400'
                                                }
                                            />
                                        )}
                                    </PanelBlock>
                                )}

                                {/* 滤网捕获的原始描述 */}
                                <p className="border-l-2 border-cyan-900/60 pl-2 text-[10px] italic leading-relaxed text-cyan-200/60">
                                    “{selectedItem.desc}”
                                </p>

                                {isWeaponInstance(selectedItem) && (
                                    <SequenceInspector weapon={selectedItem} player={player} />
                                )}

                                {/* 操作 */}
                                <div className="space-y-2 border-t border-white/5 pt-2.5">
                                    <button
                                        type="button"
                                        onClick={() => void handlePrimaryAction(selectedItem)}
                                        disabled={!gameActive || processingId !== null}
                                        title="使用 / 装备选中物资（快捷键 Enter）"
                                        className={`rarity-btn relative flex w-full items-center justify-center gap-2 border py-2 text-[11px] font-bold tracking-[0.2em] transition-all outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/60 disabled:cursor-not-allowed disabled:opacity-40 ${isDeviceFailing ? 'animate-pulse' : ''
                                            }`}
                                    >
                                        {getActionLabel(selectedItem, processingId === selectedItem.instanceId)}
                                        <KeyHint className="opacity-70">Enter</KeyHint>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleRotate(selectedItem.instanceId)}
                                        disabled={!gameActive || !selectedTile}
                                        title="旋转 90°（快捷键 R）"
                                        className="flex w-full items-center justify-center gap-2 border border-cyan-900/40 py-1.5 text-[10px] tracking-[0.18em] text-cyan-700 transition-all outline-none hover:border-cyan-700 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-1 focus-visible:ring-cyan-400/60"
                                    >
                                        旋转 90°
                                        <KeyHint className="opacity-70">R</KeyHint>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleDiscard(selectedItem)}
                                        disabled={!gameActive || processingId !== null}
                                        title="销毁选中物资（快捷键 Del，需二次确认）"
                                        className={`flex w-full items-center justify-center gap-2 border py-1.5 text-[10px] tracking-[0.18em] transition-all outline-none focus-visible:ring-1 focus-visible:ring-red-400/60 disabled:cursor-not-allowed disabled:opacity-40 ${confirmingDiscard
                                            ? 'border-red-500/80 bg-red-900/50 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.35)]'
                                            : 'border-red-900/40 bg-red-950/20 text-red-500/70 hover:border-red-500/60 hover:bg-red-900/40 hover:text-red-400'
                                            }`}
                                    >
                                        {confirmingDiscard ? '确认销毁 ▸ 再点一次' : '销毁'}
                                        <KeyHint className="opacity-70">Del</KeyHint>
                                    </button>
                                </div>

                                {/* 档案签名 */}
                                <div className="flex items-center justify-between text-[8px] tracking-[0.3em] text-cyan-900">
                                    <span>
                                        SIG:{(selectedItem.instanceId ?? '????').slice(-8).toUpperCase()}
                                    </span>
                                    <span className={TONE.link.soft}>
                                        {selectedItem.type.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
};

export default InventoryPanel;
