import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type {
    AffinityPhase,
    CompanionTemplate,
    InteractionNpcEntity,
    NodeNpcTemplate,
    PlayerState,
    NPCTabMode,
    ItemInstance,
    TrustPhase,
    Words,
    PlayerWordsTag,
    NpcWordsTag,
    CombatStyle,
    Quest,
    QuestTemplate,
    ItemTemplate,
    Mood,
    DynamicVitalType,
    ZoneDate,
    NeuralLinkState
} from '../meta';
import {
    isItemTemplate,
    isEquipmentInstance,
    isWeaponInstance,
    isConsumableInstance,
    normalizeEquipState,
    safeNumber
} from '../meta';
import { RARITY_MAP } from '../constants';
import { AudioService, PersistenceService, SocializationService } from '../services';

const GLYPHS = {
    link: 'M9.5 14.5l5-5M7.5 12L5 14.5a3.54 3.54 0 005 5L12.5 17M16.5 12L19 9.5a3.54 3.54 0 00-5-5L11.5 7',
    bolt: 'M13 2.5L4.5 13.5H11L9.5 21.5 19 10h-6.5L13 2.5z',
    backpack: 'M9 7V5a3 3 0 016 0v2M6 7h12a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2zM9 13h6v4H9z',
    clipboard: 'M9 4h6v3H9zM9 4.5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-12a2 2 0 00-2-2h-2M9 11.5h6M9 15h4',
    user: 'M12 11a4 4 0 100-8 4 4 0 000 8zM4.5 20.5c1.4-3.4 4.3-5 7.5-5s6.1 1.6 7.5 5',
    heart: 'M12 20.5S4.8 16 3 11.6A4.8 4.8 0 0112 8a4.8 4.8 0 019 3.6C19.2 16 12 20.5 12 20.5z',
    keyboard: 'M3 7h18v10H3zM6.5 10.5h.01M9.5 10.5h.01M12.5 10.5h.01M15.5 10.5h.01M18 10.5h.01M6.5 13.5h.01M18 13.5h.01M9.5 14h5',
    send: 'M3.5 11.5L20.5 4l-7.5 17-2.5-7.5-7-2zM20.5 4L10.5 13.5',
    close: 'M6 6l12 12M18 6L6 18',
    refresh: 'M20 12a8 8 0 11-2.3-5.6M20 4v4.4h-4.4',
    dice: 'M5 5h14v14H5zM9 9h.01M15 9h.01M12 12h.01M9 15h.01M15 15h.01',
    trash: 'M5 7h14M10 7V4h4v3M7.5 7l1 13h7l1-13M10.5 11v5.5M13.5 11v5.5',
    chip: 'M7 7h10v10H7zM10 10h4v4h-4zM9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4',
    warning: 'M12 4L2.8 19.5h18.4L12 4zM12 10.2v4M12 17h.01',
    satellite: 'M12 12.5h.01M8.5 16a5 5 0 010-7M15.5 9a5 5 0 010 7M5.6 18.9a9.5 9.5 0 010-13.8M18.4 5.1a9.5 9.5 0 010 13.8',
    box: 'M12 3l8.5 4.5v9L12 21l-8.5-4.5v-9L12 3zM3.5 7.5L12 12l8.5-4.5M12 12v9',
    ring: 'M12 20a6.5 6.5 0 110-13 6.5 6.5 0 010 13zM9.5 6.5L12 3l2.5 3.5L12 9z',
    vial: 'M9 3h6M10 3v5.2L4.8 17a3 3 0 002.6 4.5h9.2a3 3 0 002.6-4.5L14 8.2V3M7 14.5h10',
    document: 'M7 3h7l4 4v14H7zM14 3v4h4M10.5 12h4M10.5 15.5h4',
    swords: 'M4 4l12 12M13.5 18.5l5-5M16 16l4 4',
    shield: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z',
    scale: 'M12 3v18M7 21h10M3 7h18M6 7l-3 7c.9.66 1.95 1 3 1s2.1-.34 3-1l-3-7zM18 7l-3 7c.9.66 1.95 1 3 1s2.1-.34 3-1l-3-7z',
    wind: 'M3 8h9.5a2.5 2.5 0 10-2.5-2.5M3 12h13.5a2.5 2.5 0 11-2.5 2.5M3 16h7',
    burst: 'M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2z',
    chevrons: 'M6 5l7 7-7 7M13 5l7 7-7 7',
    battery: 'M3 8.5h15v7H3zM18 10.5h2.5v3H18zM6 10.5v3M9 10.5v3M12 10.5v3',
    activity: 'M3 12h4l2.5-6.5 4.5 13L16.5 12H21',
    lock: 'M7.5 11V8a4.5 4.5 0 019 0v3M6 11h12.5v9.5H6zM12 15v2.5',
    check: 'M4.5 12.5l4.5 4.5L19.5 6.5',
    arrowRight: 'M4 12h15M13.5 6l6 6-6 6'
} as const;

type GlyphName = keyof typeof GLYPHS;

const Glyph: React.FC<{ name: GlyphName; className?: string; strokeWidth?: number }> = ({
    name,
    className = 'w-4 h-4',
    strokeWidth = 1.7
}) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
    >
        <path d={GLYPHS[name]} />
    </svg>
);

/** 职业 UI 配置，严格对齐 CombatStyle，术语对齐背景设定。 */
interface RoleUiConfig {
    glyph: GlyphName;
    color: string;
    label: string;
}

const CLASS_CONFIG: Record<CombatStyle, RoleUiConfig> = {
    burst: { glyph: 'burst', color: 'text-purple-400', label: '爆发型' },
    attack: { glyph: 'chevrons', color: 'text-red-500', label: '进攻型' },
    balance: { glyph: 'scale', color: 'text-emerald-400', label: '均衡型' },
    defense: { glyph: 'shield', color: 'text-amber-400', label: '防守型' },
    skirmish: { glyph: 'wind', color: 'text-cyan-400', label: '游走型' }
};

const ITEM_GLYPHS: Record<ItemTemplate['type'], GlyphName> = {
    weapon: 'swords',
    armor: 'shield',
    accessory: 'ring',
    consumable: 'vial',
    data: 'document',
    material: 'box',
    storage: 'backpack'
};

const ITEM_TYPE_LABELS: Record<ItemTemplate['type'], string> = {
    weapon: '武器',
    armor: '护甲',
    accessory: '饰品',
    consumable: '消耗品',
    data: '数据',
    material: '材料',
    storage: '仓储'
};

/** Ekman 六模情绪标签与气泡色带。 */
const MOOD_LABELS: Record<Mood, string> = {
    happy: '愉悦',
    sad: '悲伤',
    angry: '愤怒',
    fearful: '恐惧',
    surprised: '惊异',
    neutral: '平静'
};

const MOOD_BORDER: Record<Mood, string> = {
    happy: 'border-l-emerald-400',
    sad: 'border-l-blue-400',
    angry: 'border-l-red-500',
    fearful: 'border-l-purple-400',
    surprised: 'border-l-amber-400',
    neutral: 'border-l-zinc-400'
};

/**
 * 关系阶段 UI 映射。
 *
 * 信任轴（猜忌 → 长盟）与好感轴（离心 → 同气）的阶段名互不重名，
 * 因此共用同一张色带表；阶段判定一律走 SocializationService，本表只负责配色。
 */
const RELATION_PHASE_META: Record<TrustPhase | AffinityPhase, { chip: string; dot: string }> = {
    // —— 信任轴 ——
    猜忌: {
        chip: 'text-red-400 border-red-500/50 bg-red-950/40',
        dot: 'bg-red-500'
    },
    防备: {
        chip: 'text-orange-400 border-orange-500/50 bg-orange-950/40',
        dot: 'bg-orange-400'
    },
    审慎: {
        chip: 'text-zinc-300 border-zinc-600 bg-zinc-900/60',
        dot: 'bg-zinc-400'
    },
    浅合: {
        chip: 'text-blue-300 border-blue-500/50 bg-blue-950/40',
        dot: 'bg-blue-400'
    },
    长盟: {
        chip: 'text-emerald-300 border-emerald-500/50 bg-emerald-950/40',
        dot: 'bg-emerald-400'
    },
    // —— 好感轴 ——
    离心: {
        chip: 'text-red-400 border-red-500/60 bg-red-950/50',
        dot: 'bg-red-500'
    },
    芥蒂: {
        chip: 'text-orange-300 border-orange-500/50 bg-orange-950/40',
        dot: 'bg-orange-400'
    },
    相敬: {
        chip: 'text-zinc-300 border-zinc-600 bg-zinc-900/60',
        dot: 'bg-zinc-400'
    },
    相得: {
        chip: 'text-sky-300 border-sky-500/50 bg-sky-950/40',
        dot: 'bg-sky-400'
    },
    同气: {
        chip: 'text-fuchsia-300 border-fuchsia-500/50 bg-fuchsia-950/40',
        dot: 'bg-fuchsia-400'
    }
};

/** 任务难度标签，对齐《数值设计规范》。 */
const DIFFICULTY_LABELS = ['休闲', '轻松', '简单', '标准', '普通', '困难', '极难', '难到爆', '噩梦', '地狱'];
const getDifficultyLabel = (difficulty: number): string => {
    if (!Number.isFinite(difficulty) || difficulty <= 0) return `${difficulty}`;
    if (difficulty > 10) return '不可能完成';
    return DIFFICULTY_LABELS[Math.min(10, Math.ceil(difficulty)) - 1];
};

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

const pctTone = (pct: number): string =>
    pct >= 50
        ? 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30'
        : pct >= 20
            ? 'text-amber-400 border-amber-500/40 bg-amber-950/30'
            : 'text-red-400 border-red-500/40 bg-red-950/30';

const stagger = (index: number): React.CSSProperties => ({
    animationDelay: `${index * 45}ms`,
    animationFillMode: 'backwards'
});

/** 组件内关键帧与字阶（展示型窄体 + 衬线叙事 + 等宽数据）。 */
const PANEL_STYLES = `
@keyframes sp-scan { 0%, 100% { transform: translateY(-140%); } 50% { transform: translateY(460%); } }
@keyframes sp-ekg { to { stroke-dashoffset: -120; } }
@keyframes sp-drift { to { background-position: 44px 44px; } }
@keyframes sp-flicker { 0%, 100% { opacity: 1; } 42% { opacity: .5; } 46% { opacity: .9; } 60% { opacity: .45; } 64% { opacity: 1; } }
@keyframes sp-fog { 0% { transform: translateX(-5%); } 50% { transform: translateX(5%); } 100% { transform: translateX(-5%); } }
.sp-display { font-family: 'Bahnschrift', 'DIN Alternate', 'Franklin Gothic Medium', 'Arial Narrow', 'Noto Sans SC', sans-serif; letter-spacing: .08em; }
`;

// =====================
// 体征波形（EKG）：搏动速度 / 颜色随生命占比实时变化
// =====================

const EKG_PATH =
    'M0 16 H12 L15 16 L18 7 L22 24 L25 12 L28 16 H52 L55 16 L58 7 L62 24 L65 12 L68 16 H92 L95 16 L98 7 L102 24 L105 12 L108 16 H120';

const VitalWave: React.FC<{ ratio: number; critical?: boolean; className?: string }> = ({
    ratio,
    critical = false,
    className = 'w-full h-7'
}) => {
    const duration = (0.55 + clamp01(ratio) * 1.05).toFixed(2);
    return (
        <svg
            viewBox="0 0 120 28"
            preserveAspectRatio="none"
            className={className}
            style={{ color: critical ? '#f87171' : '#34d399' }}
        >
            <path d={EKG_PATH} fill="none" stroke="currentColor" strokeWidth="1" opacity="0.16" />
            <path
                d={EKG_PATH}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={120}
                strokeDasharray="36 84"
                style={{
                    animation: `sp-ekg ${duration}s linear infinite`,
                    filter: 'drop-shadow(0 0 3px currentColor)'
                }}
            />
        </svg>
    );
};

// =====================
// 分段式诊断仪表
// =====================

type GaugeType = DynamicVitalType | 'relation';

const DiagnosticGauge: React.FC<{
    label: string;
    value: number;
    max: number;
    color: string;
    critical?: boolean;
    type: GaugeType;
    /** 可选：在量程上标注阈值刻度（百分比）。 */
    marker?: number;
}> = ({ label, value, max, color, critical, type, marker }) => {
    const segments = 20;
    const safeMax = Math.max(1, max);
    const filledCount = Math.ceil((Math.min(safeMax, Math.max(0, value)) / safeMax) * segments);
    const getSegmentColor = (): string => {
        if (critical && (type === 'hp' || type === 'sanity')) {
            return 'bg-red-500 shadow-[0_0_10px_#ef4444]';
        }
        switch (type) {
            case 'hp':
                return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]';
            case 'sanity':
                return 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]';
            case 'relation':
                return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]';
            case 'stamina':
                return 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]';
            case 'vigor':
                return 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)]';
            default:
                return 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]';
        }
    };
    return (
        <div className="mb-4 group">
            <div className="flex justify-between items-end mb-1.5 px-1">
                <span
                    className={`text-[10px] font-mono tracking-widest font-bold uppercase transition-colors duration-300 ${critical ? 'animate-pulse text-red-400' : 'text-zinc-400 group-hover:text-zinc-100'
                        }`}
                >
                    {label}
                </span>
                <div className="flex items-baseline gap-1.5">
                    <span className={`text-sm font-mono font-bold ${color}`}>{Math.round(value)}</span>
                    <span className="text-[10px] text-zinc-600 font-mono">/ {Math.round(safeMax)}</span>
                </div>
            </div>
            <div className="relative flex h-[6px] gap-[2px] w-full bg-black/60 p-0.5 border border-zinc-800/80 rounded-sm">
                {Array.from({ length: segments }).map((_, i) => (
                    <div
                        key={i}
                        className={`flex-1 rounded-sm transition-all duration-300 ${i < filledCount ? getSegmentColor() : 'bg-zinc-800/20'
                            } ${i < filledCount && critical && (type === 'hp' || type === 'sanity') ? 'animate-pulse' : ''}`}
                    />
                ))}
                {marker !== undefined && (
                    <div
                        className="absolute -top-1 -bottom-1 w-[2px] bg-amber-200/80 shadow-[0_0_6px_rgba(251,191,36,0.8)]"
                        style={{ left: `${clamp01(marker / 100) * 100}%` }}
                        title={`阈值 ${marker}`}
                    />
                )}
            </div>
        </div>
    );
};

// =====================
// 人格与记忆管理模态框
// =====================

interface NpcProfileMeta {
    profileId: string;
    name: string;
    lastModified: number | string;
}

const PersonalityMountModal: React.FC<{
    npcId: string;
    npcName: string;
    currentMountedProfileId?: string;
    onClose: () => void;
    onMountProfile?: (profileId: string) => Promise<void>;
    onUnmountCreateNewProfile?: (customName?: string) => Promise<void>;
    onDeleteProfile?: (profileId: string) => Promise<void>;
}> = ({ npcId, npcName, currentMountedProfileId, onClose, onMountProfile, onUnmountCreateNewProfile, onDeleteProfile }) => {
    const [profiles, setProfiles] = useState<NpcProfileMeta[]>([]);
    const [loading, setLoading] = useState(true);
    const [newProfileName, setNewProfileName] = useState('');

    const fetchProfiles = useCallback(async () => {
        setLoading(true);
        try {
            const list = await PersistenceService.listNpcProfiles(npcId);
            setProfiles(Array.isArray(list) ? (list as NpcProfileMeta[]) : []);
        } catch {
            setProfiles([]);
        } finally {
            setLoading(false);
        }
    }, [npcName]);

    useEffect(() => {
        void fetchProfiles();
    }, [fetchProfiles]);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-zinc-950 border border-cyan-500/40 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
                    <div className="flex items-center gap-2.5">
                        <span className="text-cyan-400">
                            <Glyph name="chip" className="w-5 h-5" />
                        </span>
                        <h3 className="text-base font-bold text-zinc-100 sp-display tracking-wide">
                            人格管理中枢 <span className="text-cyan-400">[{npcName}]</span>
                        </h3>
                    </div>
                    <button
                        onClick={() => {
                            AudioService.playSfx('ui_click');
                            onClose();
                        }}
                        aria-label="关闭"
                        className="text-zinc-500 hover:text-zinc-200 p-1 transition-colors"
                    >
                        <Glyph name="close" />
                    </button>
                </div>
                <div className="px-6 py-3 bg-cyan-950/20 border-b border-cyan-900/30 text-[11px] text-cyan-300 font-mono leading-relaxed">
                    挂载后与 [{npcName}] 的对话及记忆金字塔将独立绑定至该人格组中。不挂载或建立新组将使用独立全新人格组。
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-thin scrollbar-thumb-zinc-700">
                    {loading ? (
                        <div className="text-center py-8 text-zinc-500 font-mono text-xs animate-pulse">
                            正在扫描本地数据目录 the-zone-data/memory/{npcId}/...
                        </div>
                    ) : profiles.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500 font-mono text-xs border border-dashed border-zinc-800 rounded-md">
                            暂无其他已保存的人格记忆组。对话后将自动生成首个人格数据。
                        </div>
                    ) : (
                        profiles.map((p, i) => {
                            const isCurrent =
                                currentMountedProfileId === p.profileId ||
                                (!currentMountedProfileId && p.profileId === 'default');
                            return (
                                <div
                                    key={p.profileId}
                                    style={stagger(i)}
                                    className={`p-4 border rounded-md transition-all flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${isCurrent
                                        ? 'bg-cyan-950/40 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                                        : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/70'
                                        }`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-sm text-zinc-100 truncate">{p.name}</span>
                                            {isCurrent && (
                                                <span className="px-2 py-0.5 text-[9px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-full shrink-0">
                                                    当前已挂载
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] font-mono text-zinc-500">
                                            ID: {p.profileId} | 修改时间: {new Date(p.lastModified).toLocaleString('zh-CN')}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {!isCurrent && onMountProfile && (
                                            <button
                                                onClick={async () => {
                                                    AudioService.playSfx('ui_click');
                                                    await onMountProfile(p.profileId);
                                                    onClose();
                                                }}
                                                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold font-mono rounded transition-all shadow-md active:scale-95"
                                            >
                                                挂载此人格
                                            </button>
                                        )}
                                        {onDeleteProfile && p.profileId !== 'default' && (
                                            <button
                                                onClick={async () => {
                                                    AudioService.playSfx('ui_click');
                                                    if (window.confirm(`确定要删除人格组 [${p.name}] 吗？数据不可恢复。`)) {
                                                        await onDeleteProfile(p.profileId);
                                                        await fetchProfiles();
                                                    }
                                                }}
                                                aria-label="删除人格组"
                                                title="删除"
                                                className="p-1.5 bg-red-950/40 border border-red-800/50 hover:bg-red-900/60 text-red-400 rounded transition-all active:scale-95"
                                            >
                                                <Glyph name="trash" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
                <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/60 space-y-3">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="输入新人格组名称 (可选)..."
                            value={newProfileName}
                            onChange={e => setNewProfileName(e.target.value)}
                            className="flex-1 bg-black/60 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-100 font-mono rounded focus:border-cyan-500 focus:outline-none transition-colors"
                        />
                        <button
                            onClick={async () => {
                                if (!onUnmountCreateNewProfile) return;
                                AudioService.playSfx('ui_click');
                                await onUnmountCreateNewProfile(newProfileName);
                                onClose();
                            }}
                            className="px-4 py-1.5 bg-zinc-800 hover:bg-cyan-900/60 hover:border-cyan-500 border border-zinc-700 text-zinc-200 hover:text-cyan-300 text-xs font-mono font-bold rounded transition-all active:scale-95"
                        >
                            + 新建独立人格
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// =====================
// 同伴战备管理中枢模态框
// =====================

interface CompanionManagementModalProps {
    npc: InteractionNpcEntity;
    player: PlayerState;
    onClose: () => void;
    onCompanionEquipItem?: (item: ItemInstance, slotIndex?: number) => void;
    onCompanionUnequipItem?: (itemType: 'weapon' | 'armor' | 'accessory', slotIndex: number) => void;
    onCompanionUseConsumable?: (item: ItemInstance) => void;
}

const LoadoutItemRow: React.FC<{
    item: ItemInstance;
    onUnequip?: () => void;
}> = ({ item, onUnequip }) => (
    <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
            <div className="text-xs font-bold text-zinc-100 truncate">{item.name}</div>
            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                {ITEM_TYPE_LABELS[item.type]} // 稀有度: {item.grade}
            </div>
        </div>
        {onUnequip && (
            <button
                onClick={() => {
                    AudioService.playSfx('ui_click');
                    onUnequip();
                }}
                className="px-3 py-1 bg-red-950/40 border border-red-800/60 hover:bg-red-900/60 text-red-400 text-[10px] font-mono font-bold rounded transition-all shrink-0 active:scale-95"
            >
                卸下
            </button>
        )}
    </div>
);

const LoadoutSlotCard: React.FC<{
    title: string;
    isMounted: boolean;
    emptyText: string;
    children?: React.ReactNode;
}> = ({ title, isMounted, emptyText, children }) => (
    <div className="p-3.5 rounded border border-zinc-800 bg-black/40 relative overflow-hidden">
        <div className="text-[9px] font-mono text-zinc-500 tracking-wider mb-1.5 uppercase flex items-center justify-between">
            <span>{title}</span>
            {isMounted && <span className="text-cyan-400">已装配</span>}
        </div>
        {isMounted ? (
            children
        ) : (
            <div className="text-[10px] font-mono text-zinc-600 italic py-1 border border-dashed border-zinc-800/80 rounded text-center">
                {emptyText}
            </div>
        )}
    </div>
);

const CompanionManagementModal: React.FC<CompanionManagementModalProps> = ({
    npc,
    player,
    onClose,
    onCompanionEquipItem,
    onCompanionUnequipItem,
    onCompanionUseConsumable
}) => {
    const [activeSubTab, setActiveSubTab] = useState<'equip' | 'consumable'>('equip');
    const companionEquipment = normalizeEquipState(npc.dynamic.equipment);

    const playerEquipments = useMemo(
        () => player.dynamic.inventory.filter(isEquipmentInstance),
        [player.dynamic.inventory]
    );

    const playerConsumables = useMemo(
        () => player.dynamic.inventory.filter(isConsumableInstance),
        [player.dynamic.inventory]
    );

    const maxHp = Math.max(1, safeNumber(npc.dynamic.maxHp, 100));
    const maxSanity = Math.max(1, safeNumber(npc.dynamic.maxSanity, 100));
    const maxStamina = Math.max(1, safeNumber(npc.dynamic.maxStamina, 100));
    const maxVigor = Math.max(1, safeNumber(npc.dynamic.maxVigor, 100));

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-5xl bg-zinc-950 border border-cyan-500/50 rounded-lg shadow-[0_0_40px_rgba(6,182,212,0.2)] flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                {/* 顶部标题栏 */}
                <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80 shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-cyan-400">
                            <Glyph name="backpack" className="w-5 h-5" />
                        </span>
                        <div>
                            <h3 className="text-base font-bold text-zinc-100 sp-display tracking-wide flex items-center gap-2">
                                同伴战备整备中枢 <span className="text-cyan-400 font-mono">[{npc.static.name}]</span>
                            </h3>
                            <div className="text-[10px] text-zinc-500 font-mono">
                                COMPANION_LOADOUT_SYSTEM // 实时调配武器模块、防护外骨骼与补给物资
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            AudioService.playSfx('ui_click');
                            onClose();
                        }}
                        aria-label="关闭"
                        className="text-zinc-500 hover:text-zinc-200 p-1.5 transition-colors rounded hover:bg-zinc-800/60"
                    >
                        <Glyph name="close" />
                    </button>
                </div>

                {/* 快捷体征状态带 */}
                <div className="px-6 py-3 bg-black/50 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-4 text-xs font-mono shrink-0">
                    <div className="flex items-center gap-6 flex-wrap">
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-500 text-[10px] uppercase">生命 (HP):</span>
                            <span className="text-emerald-400 font-bold">{Math.round(npc.dynamic.hp)} / {maxHp}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-500 text-[10px] uppercase">理智 (SAN):</span>
                            <span className="text-purple-400 font-bold">{Math.round(npc.dynamic.sanity)} / {maxSanity}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-500 text-[10px] uppercase">耐力 (STA):</span>
                            <span className="text-blue-400 font-bold">{Math.round(npc.dynamic.stamina)} / {maxStamina}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-500 text-[10px] uppercase">活力 (VIG):</span>
                            <span className="text-orange-400 font-bold">{Math.round(npc.dynamic.vigor)} / {maxVigor}</span>
                        </div>
                    </div>
                    <div className="text-[10px] text-cyan-400 border border-cyan-800/60 bg-cyan-950/30 px-2.5 py-0.5 rounded-sm">
                        战备链路稳定
                    </div>
                </div>

                {/* 主操作区：左右分栏 */}
                <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0">
                    {/* 左侧：同伴当前装配槽位 (占5列) */}
                    <div className="md:col-span-5 border-r border-zinc-800/80 flex flex-col bg-zinc-950/60 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-zinc-700">
                        <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_6px_#06b6d4]"></span>
                            当前装配模块 (ACTIVE LOADOUT)
                        </div>

                        <div className="space-y-3.5">
                            {/* 主手武器 */}
                            <LoadoutSlotCard
                                title="主手武器 (MAIN WEAPON)"
                                isMounted={Boolean(companionEquipment.weapons.main)}
                                emptyText="[ 空置主手武器槽 ]"
                            >
                                {companionEquipment.weapons.main && (
                                    <LoadoutItemRow
                                        item={companionEquipment.weapons.main}
                                        onUnequip={onCompanionUnequipItem ? () => onCompanionUnequipItem('weapon', 0) : undefined}
                                    />
                                )}
                            </LoadoutSlotCard>

                            {/* 副手武器 */}
                            <LoadoutSlotCard
                                title="副手武器 (SIDE WEAPON)"
                                isMounted={Boolean(companionEquipment.weapons.side)}
                                emptyText="[ 空置副手武器槽 ]"
                            >
                                {companionEquipment.weapons.side && (
                                    <LoadoutItemRow
                                        item={companionEquipment.weapons.side}
                                        onUnequip={onCompanionUnequipItem ? () => onCompanionUnequipItem('weapon', 1) : undefined}
                                    />
                                )}
                            </LoadoutSlotCard>

                            {/* 防具/外骨骼 */}
                            <LoadoutSlotCard
                                title="外骨骼护甲 (ARMOR LOADOUT)"
                                isMounted={companionEquipment.armors.some(Boolean)}
                                emptyText="[ 空置防具槽 ]"
                            >
                                <div className="space-y-2">
                                    {companionEquipment.armors.map((armor, idx) =>
                                        armor ? (
                                            <LoadoutItemRow
                                                key={armor.instanceId || idx}
                                                item={armor}
                                                onUnequip={onCompanionUnequipItem ? () => onCompanionUnequipItem('armor', idx) : undefined}
                                            />
                                        ) : null
                                    )}
                                </div>
                            </LoadoutSlotCard>

                            {/* 辅助饰品模块 */}
                            <LoadoutSlotCard
                                title="神经/辅助饰品 (ACCESSORIES)"
                                isMounted={companionEquipment.accessories.some(Boolean)}
                                emptyText="[ 空置饰品槽 ]"
                            >
                                <div className="space-y-2">
                                    {companionEquipment.accessories.map((acc, idx) =>
                                        acc ? (
                                            <LoadoutItemRow
                                                key={acc.instanceId || idx}
                                                item={acc}
                                                onUnequip={onCompanionUnequipItem ? () => onCompanionUnequipItem('accessory', idx) : undefined}
                                            />
                                        ) : null
                                    )}
                                </div>
                            </LoadoutSlotCard>
                        </div>
                    </div>

                    {/* 右侧：玩家背囊可调配战备与消耗品 (占7列) */}
                    <div className="md:col-span-7 flex flex-col bg-zinc-900/40 overflow-hidden">
                        {/* 顶部二级页签切换 */}
                        <div className="h-11 border-b border-zinc-800 flex bg-black/60 shrink-0">
                            <button
                                onClick={() => {
                                    AudioService.playSfx('ui_click');
                                    setActiveSubTab('equip');
                                }}
                                className={`flex-1 text-[11px] font-mono uppercase tracking-widest flex items-center justify-center gap-2 border-b-2 transition-all ${activeSubTab === 'equip'
                                    ? 'border-cyan-500 text-cyan-400 bg-zinc-900/80'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                <Glyph name="swords" className="w-3.5 h-3.5" /> 战备装备调配 ({playerEquipments.length})
                            </button>
                            <div className="w-[1px] bg-zinc-800 my-2"></div>
                            <button
                                onClick={() => {
                                    AudioService.playSfx('ui_click');
                                    setActiveSubTab('consumable');
                                }}
                                className={`flex-1 text-[11px] font-mono uppercase tracking-widest flex items-center justify-center gap-2 border-b-2 transition-all ${activeSubTab === 'consumable'
                                    ? 'border-emerald-500 text-emerald-400 bg-zinc-900/80'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                <Glyph name="vial" className="w-3.5 h-3.5" /> 消耗补给供给 ({playerConsumables.length})
                            </button>
                        </div>

                        {/* 列表区 */}
                        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-zinc-700">
                            {activeSubTab === 'equip' ? (
                                playerEquipments.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center py-16 text-zinc-600 font-mono text-xs">
                                        <Glyph name="box" className="w-10 h-10 mb-3 opacity-30" />
                                        玩家背囊中当前没有可调配的战备装备
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {playerEquipments.map((item) => (
                                            <div
                                                key={item.instanceId}
                                                className="p-3 border border-zinc-800 bg-black/50 hover:border-zinc-700 hover:bg-zinc-900/60 rounded flex items-center justify-between gap-3 transition-all"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 rounded border border-zinc-700 bg-black/60 flex items-center justify-center text-zinc-400 shrink-0">
                                                        <Glyph name={ITEM_GLYPHS[item.type] || 'box'} className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-bold text-zinc-200 truncate">{item.name}</div>
                                                        <div className="text-[10px] text-zinc-500 font-mono">
                                                            {ITEM_TYPE_LABELS[item.type]} // {item.grade}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {isWeaponInstance(item) ? (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    AudioService.playSfx('ui_click');
                                                                    onCompanionEquipItem?.(item, 0);
                                                                }}
                                                                className="px-2.5 py-1 bg-cyan-950/60 border border-cyan-600/60 hover:bg-cyan-900/80 text-cyan-300 text-[10px] font-mono rounded transition-all active:scale-95"
                                                            >
                                                                装主手
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    AudioService.playSfx('ui_click');
                                                                    onCompanionEquipItem?.(item, 1);
                                                                }}
                                                                className="px-2.5 py-1 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-[10px] font-mono rounded transition-all active:scale-95"
                                                            >
                                                                装副手
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                AudioService.playSfx('ui_click');
                                                                onCompanionEquipItem?.(item);
                                                            }}
                                                            className="px-3 py-1 bg-cyan-950/60 border border-cyan-600/60 hover:bg-cyan-900/80 text-cyan-300 text-[10px] font-mono font-bold rounded transition-all active:scale-95"
                                                        >
                                                            装配给同伴
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : (
                                playerConsumables.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center py-16 text-zinc-600 font-mono text-xs">
                                        <Glyph name="vial" className="w-10 h-10 mb-3 opacity-30" />
                                        玩家背囊中当前没有可供给的消耗品
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {playerConsumables.map((item) => (
                                            <div
                                                key={item.instanceId}
                                                className="p-3 border border-zinc-800 bg-black/50 hover:border-zinc-700 hover:bg-zinc-900/60 rounded flex items-center justify-between gap-3 transition-all"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 rounded border border-emerald-900/50 bg-emerald-950/30 flex items-center justify-center text-emerald-400 shrink-0">
                                                        <Glyph name="vial" className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-bold text-zinc-200 truncate flex items-center gap-2">
                                                            <span>{item.name}</span>
                                                            {item.quantity !== undefined && item.quantity > 1 && (
                                                                <span className="text-[10px] font-mono text-zinc-500">x{item.quantity}</span>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-zinc-500 font-mono truncate">
                                                            {(item.effects ?? []).map(eff => `${eff[0]}: ${eff[1] > 0 ? '+' : ''}${eff[1]}`).join(' | ') || '常规消耗品'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        AudioService.playSfx('ui_click');
                                                        onCompanionUseConsumable?.(item);
                                                    }}
                                                    className="px-3 py-1 bg-emerald-950/60 border border-emerald-600/60 hover:bg-emerald-900/80 text-emerald-300 text-[10px] font-mono font-bold rounded transition-all shrink-0 active:scale-95"
                                                >
                                                    注入使用
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// =====================
// 左侧：生物监测与视觉数据中枢
// =====================

const BioMonitorSection: React.FC<{
    npc: InteractionNpcEntity;
    isRecruited: boolean;
    isGenerating: boolean;
    onRecruit: () => void;
    onMountProfile?: (profileId: string) => Promise<void>;
    onUnmountCreateNewProfile?: (customName?: string) => Promise<void>;
    onDeleteProfile?: (profileId: string) => Promise<void>;
    onGenerateNpcImage?: () => void;
    onRandomSwitchNpcImage?: () => Promise<string | null>;
    hasMultipleNpcVariants?: () => Promise<boolean>;
    onOpenCompanionManagement?: () => void;
}> = ({
    npc,
    isRecruited,
    isGenerating,
    onRecruit,
    onMountProfile,
    onUnmountCreateNewProfile,
    onDeleteProfile,
    onGenerateNpcImage,
    onRandomSwitchNpcImage,
    hasMultipleNpcVariants,
    onOpenCompanionManagement
}) => {
        const [showMountModal, setShowMountModal] = useState(false);
        const [canSwitchVariant, setCanSwitchVariant] = useState(false);

        const roleData = CLASS_CONFIG[npc.static.style];
        const pyramid = npc.dynamic.memory;
        const maxHp = Math.max(1, npc.dynamic.maxHp);
        const maxSanity = Math.max(1, npc.dynamic.maxSanity);
        const maxStamina = Math.max(1, npc.dynamic.maxStamina);
        const maxVigor = Math.max(1, npc.dynamic.maxVigor);
        const hpRatio = npc.dynamic.hp / maxHp;
        const isDead = npc.dynamic.hp <= 0;

        // 关系轴快照：节点 NPC 走信任轴，同伴走好感轴。
        const relation = SocializationService.resolveRelation(npc.dynamic);
        const phaseMeta = RELATION_PHASE_META[relation.phase];
        // 好感为负时，同伴每个 absoluteTick 都有离队概率（契约的离队判定）。
        const leaveChance =
            relation.axis === 'affinity'
                ? SocializationService.getCompanionLeaveChance(relation.score)
                : 0;

        useEffect(() => {
            let active = true;
            if (!hasMultipleNpcVariants) {
                setCanSwitchVariant(false);
                return () => {
                    active = false;
                };
            }
            hasMultipleNpcVariants()
                .then(result => {
                    if (active) setCanSwitchVariant(Boolean(result));
                })
                .catch(() => {
                    if (active) setCanSwitchVariant(false);
                });
            return () => {
                active = false;
            };
        }, [hasMultipleNpcVariants, npc.static.id]);

        return (
            <div className="w-full md:w-[30%] lg:w-[28%] xl:w-[25%] h-full flex flex-col border-r border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl relative z-20 shrink-0">
                {showMountModal && (
                    <PersonalityMountModal
                        npcId={npc.static.id}
                        npcName={npc.static.name}
                        currentMountedProfileId={npc.dynamic.mountedProfileId}
                        onClose={() => setShowMountModal(false)}
                        onMountProfile={onMountProfile}
                        onUnmountCreateNewProfile={onUnmountCreateNewProfile}
                        onDeleteProfile={onDeleteProfile}
                    />
                )}

                <div className="h-14 shrink-0 border-b border-zinc-800/80 flex items-center px-5 justify-between bg-zinc-900/40 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent opacity-50 group-hover:via-emerald-400/80 transition-all duration-700"></div>
                    <div className="flex items-center gap-3">
                        <span
                            className={`w-2 h-2 rounded-sm ${isDead
                                ? 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                                : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                                } animate-pulse`}
                        ></span>
                        <span className="text-[10px] text-zinc-300 font-mono tracking-[0.2em] font-bold uppercase">
                            Bio-Monitor V5.2
                        </span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono font-bold">
                        NODE_{npc.static.id.slice(-4).toUpperCase()}
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                    {/* 视觉馈送 */}
                    <div className="relative aspect-[4/5] mb-6 border border-zinc-800/80 group/vis bg-black/80 overflow-hidden shadow-2xl rounded-md">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:100%_4px] pointer-events-none z-10 opacity-40"></div>
                        <div
                            className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent h-[20%] z-10 pointer-events-none"
                            style={{ animation: 'sp-scan 3.4s ease-in-out infinite' }}
                        ></div>
                        {npc.dynamic.imageUrl ? (
                            <div className="w-full h-full relative">
                                <img
                                    src={npc.dynamic.imageUrl}
                                    alt={npc.static.name}
                                    className="w-full h-full object-cover grayscale-[0.2] contrast-125 brightness-90 group-hover/vis:grayscale-0 group-hover/vis:scale-105 transition-all duration-1000 ease-out"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent z-10"></div>
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-800 font-mono z-20 gap-3">
                                <span className="text-emerald-500/60" style={{ animation: 'sp-flicker 3s linear infinite' }}>
                                    <Glyph name="warning" className="w-10 h-10" strokeWidth={1.2} />
                                </span>
                                <span
                                    className="text-[11px] text-zinc-500 tracking-widest"
                                    style={{ animation: 'sp-flicker 2.2s linear infinite' }}
                                >
                                    NO_VISUAL_FEED
                                </span>
                            </div>
                        )}
                        <div className="absolute top-2 right-2 z-30 flex gap-2">
                            {onRandomSwitchNpcImage && canSwitchVariant && (
                                <button
                                    onClick={async () => {
                                        AudioService.playSfx('ui_click');
                                        await onRandomSwitchNpcImage();
                                    }}
                                    disabled={isGenerating}
                                    aria-label="随机切换肖像"
                                    title="随机切换肖像"
                                    className="p-1.5 bg-black/60 border border-amber-900/50 text-amber-500 hover:text-amber-200 hover:border-amber-400 hover:bg-amber-950/50 transition-all rounded-sm backdrop-blur-md disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <Glyph name="dice" className="w-3.5 h-3.5" />
                                </button>
                            )}
                            {onGenerateNpcImage && (
                                <button
                                    onClick={() => {
                                        AudioService.playSfx('search');
                                        onGenerateNpcImage();
                                    }}
                                    disabled={isGenerating}
                                    aria-label="生成新肖像"
                                    title="生成新肖像"
                                    className="p-1.5 bg-black/60 border border-emerald-900/50 text-emerald-500 hover:text-emerald-200 hover:border-emerald-400 hover:bg-emerald-950/50 transition-all rounded-sm backdrop-blur-md disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <Glyph name="refresh" className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                                </button>
                            )}
                        </div>
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-500/60 z-20 opacity-70 group-hover/vis:opacity-100 transition-opacity"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-500/60 z-20 opacity-70 group-hover/vis:opacity-100 transition-opacity"></div>
                        <div className="absolute bottom-0 left-0 right-0 p-5 z-20 bg-gradient-to-t from-black/80 to-transparent">
                            <h2 className="text-3xl text-white font-bold tracking-tight mb-3 uppercase sp-display drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                {npc.static.name}
                            </h2>
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 border border-zinc-700/60 bg-black/60 backdrop-blur-md rounded-sm shadow-lg">
                                    <span className={roleData.color}>
                                        <Glyph name={roleData.glyph} className="w-3.5 h-3.5" />
                                    </span>
                                    <span className={`text-[10px] font-mono font-bold tracking-widest ${roleData.color}`}>
                                        {roleData.label}
                                    </span>
                                </div>
                                <button
                                    onClick={() => {
                                        AudioService.playSfx('ui_click');
                                        setShowMountModal(true);
                                    }}
                                    className="px-2.5 py-1.5 bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 hover:text-cyan-100 hover:border-cyan-400 hover:bg-cyan-900 transition-all rounded-sm font-mono text-[10px] font-bold tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.3)] active:scale-95"
                                    title="管理 / 挂载人格记忆组"
                                >
                                    <Glyph name="chip" className="w-3.5 h-3.5" /> 人格挂载
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 体征诊断 */}
                    <div className="space-y-3 mb-8 bg-black/40 p-5 border border-zinc-800/60 rounded-md relative overflow-hidden group shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/20 group-hover:bg-emerald-500/50 transition-colors shadow-[0_0_10px_rgba(16,185,129,0.3)]"></div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.2em]">
                                体征波形
                            </span>
                            <span
                                className={`text-[9px] font-mono font-bold tracking-widest ${hpRatio < 0.3 ? 'text-red-400 animate-pulse' : 'text-emerald-400'
                                    }`}
                            >
                                {Math.round(hpRatio * 100)}%
                            </span>
                        </div>
                        <VitalWave ratio={hpRatio} critical={hpRatio < 0.3} />
                        <div className="pt-2">
                            <DiagnosticGauge
                                type="hp"
                                label="生命体征 (HP)"
                                value={npc.dynamic.hp}
                                max={maxHp}
                                color="text-emerald-400"
                                critical={npc.dynamic.hp < maxHp * 0.3}
                            />
                            <DiagnosticGauge
                                type="sanity"
                                label="意识频率 (SAN)"
                                value={npc.dynamic.sanity}
                                max={maxSanity}
                                color="text-purple-400"
                                critical={npc.dynamic.sanity < maxSanity * 0.3}
                            />
                            <DiagnosticGauge
                                type="stamina"
                                label="耐力水平 (STA)"
                                value={npc.dynamic.stamina}
                                max={maxStamina}
                                color="text-blue-400"
                            />
                            <DiagnosticGauge
                                type="vigor"
                                label="行动活力 (VIG)"
                                value={npc.dynamic.vigor}
                                max={maxVigor}
                                color="text-orange-400"
                            />
                            <DiagnosticGauge
                                type="relation"
                                label={`${relation.label}读数 (${relation.axis === 'trust' ? 'TRUST' : 'AFFINITY'})`}
                                value={relation.score}
                                max={relation.range.max}
                                color="text-amber-400"
                            />
                        </div>
                        <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.2em]">
                                关系阶段 (Phase)
                            </span>
                            <span
                                className={`px-2.5 py-1 text-[10px] font-mono font-bold border rounded-sm flex items-center gap-1.5 transition-all ${phaseMeta.chip}`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${phaseMeta.dot}`}></span>
                                {relation.label} · {relation.phase}
                            </span>
                        </div>
                        {leaveChance > 0 && (
                            <div className="flex items-center justify-between pt-1">
                                <span className="text-[10px] text-red-400 font-mono uppercase tracking-[0.2em] animate-pulse">
                                    离心离队风险 (DESERTION)
                                </span>
                                <span className="px-2.5 py-1 text-[10px] font-mono font-bold text-red-300 border border-red-900/60 bg-red-950/40 rounded-sm">
                                    {Math.round(leaveChance * 100)}% / TICK
                                </span>
                            </div>
                        )}
                        <p className="pt-2 mt-1 text-[10px] text-zinc-500 font-serif italic leading-relaxed border-t border-zinc-800/60 text-justify">
                            {relation.behavior}
                        </p>
                    </div>

                    {/* 深度档案 */}
                    <div className="border-t border-zinc-800/80 pt-6 space-y-6">
                        <div>
                            <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-[1px] bg-zinc-600"></span> 档案
                            </div>
                            <p className="text-[13px] text-zinc-300 font-serif leading-relaxed italic text-justify px-1 opacity-90">
                                {npc.static.desc}
                            </p>
                        </div>
                        <div className="space-y-6">
                            {pyramid.α.length > 0 && (
                                <div>
                                    <div className="text-[10px] text-red-500/80 font-mono uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                        <span className="w-1.5 h-[1px] bg-red-600/60"></span> 核心人格锚点
                                    </div>
                                    <div className="space-y-2 px-1">
                                        {pyramid.α.map(m => (
                                            <div
                                                key={m.id}
                                                className="p-3 border border-red-900/30 bg-red-950/20 rounded-sm text-[11px] text-zinc-300 font-serif italic text-justify leading-relaxed relative overflow-hidden hover:border-red-700/50 transition-colors"
                                            >
                                                <div className="absolute left-0 top-0 w-[2px] h-full bg-red-500/40"></div>
                                                {m.summary}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {(pyramid.β.length > 0 || pyramid.γ.length > 0) && (
                                <div>
                                    <div className="text-[10px] text-purple-500/80 font-mono uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                        <span className="w-1.5 h-[1px] bg-purple-600/60"></span> 深层记忆沉淀 (Beta/Gamma)
                                    </div>
                                    <div className="space-y-2 px-1">
                                        {[...pyramid.β, ...pyramid.γ].slice(0, 5).map(m => (
                                            <div
                                                key={m.id}
                                                className="p-2.5 border border-purple-900/20 bg-purple-950/10 rounded-sm text-[10px] text-zinc-400 font-serif italic leading-relaxed hover:border-purple-700/40 transition-colors"
                                            >
                                                {m.summary}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {pyramid.δ.length > 0 && (
                                <div>
                                    <div className="text-[10px] text-emerald-500/80 font-mono uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                        <span className="w-1.5 h-[1px] bg-emerald-600/60"></span> 近期对话摘要 (Recent Delta)
                                    </div>
                                    <div className="flex flex-wrap gap-2 px-1">
                                        {pyramid.δ.slice(-5).map(m => (
                                            <div
                                                key={m.id}
                                                className="px-2.5 py-1.5 border border-emerald-900/40 bg-emerald-950/20 hover:bg-emerald-900/40 hover:border-emerald-500/50 transition-colors rounded-sm text-[10px] text-zinc-300 font-mono italic shadow-sm group/item"
                                            >
                                                <span className="text-emerald-500 mr-1 opacity-50 group-hover/item:opacity-100">#</span>
                                                {m.summary.length > 40 ? `${m.summary.slice(0, 40)}...` : m.summary}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="shrink-0 p-5 border-t border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl flex flex-col gap-2.5 relative z-30">
                    {!isRecruited ? (
                        <button
                            onClick={() => {
                                AudioService.playSfx('ui_click');
                                onRecruit();
                            }}
                            className="w-full p-3.5 border border-emerald-500/40 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-500 hover:text-zinc-950 hover:border-emerald-400 text-[10px] font-mono font-bold tracking-[0.2em] uppercase transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] rounded-sm active:scale-[0.98]"
                        >
                            [ 建立连接协议 ]
                        </button>
                    ) : (
                        <>
                            <div className="p-2.5 flex items-center justify-center gap-3 text-[10px] text-emerald-400 border border-emerald-900/50 bg-emerald-950/30 font-mono tracking-[0.2em] uppercase rounded-sm shadow-[inset_0_0_15px_rgba(16,185,129,0.1)]">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></span>
                                协议连通中 (ACTIVE)
                            </div>
                            {onOpenCompanionManagement && (
                                <button
                                    onClick={() => {
                                        AudioService.playSfx('ui_click');
                                        onOpenCompanionManagement();
                                    }}
                                    className="w-full p-3 bg-cyan-950/60 border border-cyan-500/60 hover:bg-cyan-900/80 hover:border-cyan-400 text-cyan-300 hover:text-white text-[11px] font-mono font-bold tracking-[0.2em] uppercase transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-sm flex items-center justify-center gap-2 active:scale-[0.98]"
                                >
                                    <Glyph name="backpack" className="w-4 h-4" /> [ 同伴战备整备 ]
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    };

// =====================
// 通讯气泡
// =====================

const ChatBubble: React.FC<{
    words: Words<PlayerWordsTag | NpcWordsTag>;
    npcName: string;
}> = ({ words, npcName }) => {
    const isPlayer = words.tag.type === 'player';
    const isAction = /^[(（[【*]/.test(words.text.trim());
    const npcThought = words.tag.type === 'npc' ? words.tag.thought : undefined;
    const isPendingThought = npcThought === 'pending_npc_response';
    const npcMood: Mood | null = words.tag.type === 'npc' ? words.tag.mood : null;
    return (
        <div
            className={`flex w-full mb-6 ${isPlayer ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-3 duration-500`}
        >
            <div className={`max-w-[85%] flex flex-col ${isPlayer ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1.5 opacity-70">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">
                        {isPlayer ? '>> CMD_IN' : `<< ${npcName.toUpperCase()}_OUT`}
                    </span>
                    {npcMood && (
                        <span className="text-[8px] font-mono text-zinc-500 border border-zinc-800 bg-black/50 px-1.5 py-0.5 rounded-sm uppercase tracking-widest">
                            情绪锚点 :: {MOOD_LABELS[npcMood]}
                        </span>
                    )}
                </div>
                {npcThought && !isPendingThought && (
                    <div className="mb-3 p-4 bg-black/40 border border-zinc-800/40 rounded-sm text-[11px] text-zinc-500 font-mono italic leading-relaxed max-w-full relative overflow-hidden group/thought transition-all hover:border-zinc-700/60 shadow-inner">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-700/30 to-transparent"></div>
                        <div className="flex items-center gap-2 mb-2 opacity-40 uppercase tracking-[0.2em] text-[8px] font-bold">
                            <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-pulse"></span>
                            Neural_Processing_Stream
                        </div>
                        <div className="opacity-70 group-hover/thought:opacity-100 transition-opacity whitespace-pre-wrap">
                            {npcThought}
                        </div>
                    </div>
                )}
                <div
                    className={`relative px-5 py-3.5 text-[15px] leading-relaxed backdrop-blur-md shadow-xl transition-all ${isPlayer
                        ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-50/90 rounded-l-md rounded-br-md border-r-4 border-r-emerald-500'
                        : isAction
                            ? 'bg-zinc-800/30 border border-zinc-700/60 text-zinc-300 italic font-serif border-dashed rounded-md'
                            : `bg-zinc-900/80 border border-zinc-700/80 text-zinc-100 rounded-r-md rounded-bl-md border-l-4 ${MOOD_BORDER[npcMood ?? 'neutral']}`
                        }`}
                >
                    {isPlayer ? (
                        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-emerald-400/50 -mt-1 -mr-1"></div>
                    ) : (
                        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-zinc-400/50 -mb-1 -ml-1"></div>
                    )}
                    {words.text}
                </div>
            </div>
        </div>
    );
};

// =====================
// 动作操作按钮
// =====================

const ActionButton: React.FC<{
    glyph: GlyphName;
    label: string;
    subLabel?: string;
    onClick: () => void;
    color?: 'blue' | 'red' | 'emerald' | 'amber' | 'purple' | 'pink';
    disabled?: boolean;
}> = ({ glyph, label, subLabel, onClick, color = 'blue', disabled }) => {
    const colorStyles = {
        blue: 'border-blue-500/30 text-blue-400 hover:border-blue-400/80 hover:bg-blue-950/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]',
        red: 'border-red-500/30 text-red-400 hover:border-red-400/80 hover:bg-red-950/40 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]',
        emerald:
            'border-emerald-500/30 text-emerald-400 hover:border-emerald-400/80 hover:bg-emerald-950/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]',
        amber:
            'border-amber-500/30 text-amber-400 hover:border-amber-400/80 hover:bg-amber-950/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]',
        purple:
            'border-purple-500/30 text-purple-400 hover:border-purple-400/80 hover:bg-purple-950/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]',
        pink: 'border-pink-500/30 text-pink-400 hover:border-pink-400/80 hover:bg-pink-950/40 hover:shadow-[0_0_20px_rgba(236,72,153,0.2)]'
    };
    return (
        <button
            onClick={() => {
                if (disabled) return;
                AudioService.playSfx('ui_click');
                onClick();
            }}
            disabled={disabled}
            className={`group relative flex flex-col items-center justify-center py-4 px-2 border bg-black/60 transition-all duration-300 rounded-sm ${disabled ? 'opacity-40 cursor-not-allowed grayscale border-zinc-800' : colorStyles[color]
                } active:scale-[0.96] overflow-hidden`}
        >
            <span className="mb-2 transition-transform duration-300 group-hover:scale-110 drop-shadow-md">
                <Glyph name={glyph} className="w-6 h-6" strokeWidth={1.5} />
            </span>
            <span className="text-[10px] font-mono font-bold tracking-widest z-10">{label}</span>
            {subLabel && (
                <span className="text-[8px] font-mono text-zinc-500 mt-1 uppercase tracking-tighter z-10 group-hover:text-zinc-300 transition-colors">
                    {subLabel}
                </span>
            )}
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-current opacity-30 transition-opacity group-hover:opacity-100"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-current opacity-30 transition-opacity group-hover:opacity-100"></div>
        </button>
    );
};

// =====================
// 顶部指令台
// =====================

const CommandHeader: React.FC<{
    npcName: string;
    isRecruited: boolean;
    time: ZoneDate;
    zoneName: string;
    neuralLink: NeuralLinkState;
    onClose: () => void;
}> = ({ npcName, isRecruited, time, zoneName, neuralLink, onClose }) => {
    const batteryPct = Math.round((neuralLink.battery / Math.max(1, neuralLink.maxBattery)) * 100);
    const integrityPct = Math.round((neuralLink.integrity / Math.max(1, neuralLink.maxIntegrity)) * 100);
    const pad = (n: number): string => String(Math.max(0, Math.floor(n))).padStart(2, '0');
    return (
        <header className="h-14 shrink-0 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl flex items-center px-5 gap-4 relative z-40">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent"></div>
            <div className="flex items-center gap-3">
                <span className="w-8 h-8 flex items-center justify-center border border-emerald-500/50 bg-emerald-950/40 text-emerald-400 rounded-sm shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                    <Glyph name="link" className="w-4 h-4" />
                </span>
                <div className="leading-tight">
                    <div className="text-[13px] font-bold text-zinc-100 sp-display uppercase">
                        Socialization_Link
                    </div>
                    <div className="text-[9px] text-zinc-500 font-mono tracking-[0.25em] uppercase">
                        社交链路 // 神经同步会话
                    </div>
                </div>
            </div>
            <div className="h-7 w-[1px] bg-zinc-800"></div>
            <div className="flex items-center gap-2.5 min-w-0">
                <span
                    className={`w-2 h-2 rounded-full shrink-0 animate-pulse ${isRecruited ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'
                        }`}
                ></span>
                <span className="text-sm text-zinc-200 font-bold truncate sp-display">{npcName}</span>
                <span
                    className={`text-[8px] font-mono tracking-[0.2em] px-2 py-0.5 border rounded-sm shrink-0 ${isRecruited
                        ? 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30'
                        : 'text-amber-400 border-amber-500/40 bg-amber-950/30'
                        }`}
                >
                    {isRecruited ? '链路连通' : '链路待机'}
                </span>
            </div>
            <div className="flex-1"></div>
            <div className="hidden md:block text-right leading-tight">
                <div className="text-[9px] text-zinc-500 font-mono tracking-[0.2em] uppercase truncate max-w-[180px]">
                    {zoneName}
                </div>
                <div className="text-[11px] text-zinc-300 font-mono font-bold tracking-widest">
                    DAY {pad(time.day)} <span className="text-zinc-600">/</span> CYCLE {pad(time.cycle)}{' '}
                    <span className="text-zinc-600">/</span> TICK {pad(time.tick)}
                </div>
            </div>
            <div className="h-7 w-[1px] bg-zinc-800 hidden md:block"></div>
            <div className="hidden sm:flex items-center gap-2">
                <span
                    className={`flex items-center gap-1.5 px-2 py-1 border rounded-sm text-[10px] font-mono font-bold ${pctTone(batteryPct)}`}
                    title="神经链接仪电量"
                >
                    <Glyph name="battery" className="w-3.5 h-3.5" /> {batteryPct}%
                </span>
                <span
                    className={`flex items-center gap-1.5 px-2 py-1 border rounded-sm text-[10px] font-mono font-bold ${pctTone(integrityPct)}`}
                    title="神经链接仪完整性"
                >
                    <Glyph name="activity" className="w-3.5 h-3.5" /> {integrityPct}%
                </span>
            </div>
            <button
                onClick={() => {
                    AudioService.playSfx('ui_click');
                    onClose();
                }}
                aria-label="切断链路"
                title="切断链路"
                className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-950/50 hover:border-red-800/60 border border-transparent transition-all rounded-sm group"
            >
                <Glyph name="close" className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
        </header>
    );
};

// =====================
// 主交互面板容器
// =====================

interface SocializationPanelProps {
    /** NPC 实体数据 */
    npc: InteractionNpcEntity;
    /** 玩家状态数据 */
    player: PlayerState;
    /** 发送消息回调 */
    onSendMessage: (text: string) => Promise<void>;
    /** 招募回调 */
    onRecruit: () => void;
    /** 赠送物品回调 */
    onGift: (item: ItemInstance) => void;
    /** 关闭面板回调 */
    onClose: () => void;
    /** AI 正在生成响应状态 */
    isGenerating: boolean;
    /** 是否已完成招募 / 建立深入连接 */
    isRecruited: boolean;
    /** 取走物品回调 */
    onTakeItem: (item: ItemInstance) => void;
    /** 同伴专属谈心互动回调 */
    onHeartToHeart?: () => void;
    /** 节点 NPC 专属委托请求回调 */
    onRequestQuest?: () => void;
    /** 为同伴装备物品回调 */
    onCompanionEquipItem?: (item: ItemInstance, slotIndex?: number) => void;
    /** 为同伴卸下装备回调 */
    onCompanionUnequipItem?: (itemType: 'weapon' | 'armor' | 'accessory', slotIndex: number) => void;
    /** 对同伴使用消耗品回调 */
    onCompanionUseConsumable?: (item: ItemInstance) => void;
    /** 触发生成 NPC 视觉图像回调 */
    onGenerateNpcImage?: () => void;
    /** 随机切换 NPC 肖像回调 */
    onRandomSwitchNpcImage?: () => Promise<string | null>;
    /** 检查是否有多个肖像变体 */
    hasMultipleNpcVariants?: () => Promise<boolean>;
    /** 挂载指定人格 / 记忆组 */
    onMountProfile?: (profileId: string) => Promise<void>;
    /** 新建独立人格组 / 脱离当前挂载 */
    onUnmountCreateNewProfile?: (customName?: string) => Promise<void>;
    /** 删除人格组 */
    onDeleteProfile?: (profileId: string) => Promise<void>;
    /** 接取委托 */
    onAcceptQuest?: (questId: string, questData: Partial<Quest>) => void;
}

const SocializationPanel: React.FC<SocializationPanelProps> = ({
    npc,
    player,
    onSendMessage,
    onRecruit,
    onGift,
    onClose,
    isGenerating,
    isRecruited,
    onTakeItem,
    onHeartToHeart,
    onRequestQuest,
    onCompanionEquipItem,
    onCompanionUnequipItem,
    onCompanionUseConsumable,
    onGenerateNpcImage,
    onRandomSwitchNpcImage,
    hasMultipleNpcVariants,
    onMountProfile,
    onUnmountCreateNewProfile,
    onDeleteProfile,
    onAcceptQuest
}) => {
    const [activeTab, setActiveTab] = useState<NPCTabMode>('interaction');
    const [inputValue, setInputValue] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showFreeChat, setShowFreeChat] = useState(false);
    const [showCompanionModal, setShowCompanionModal] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const dialogueWords: Array<Words<PlayerWordsTag | NpcWordsTag>> = useMemo(() => {
        const words: Array<Words<PlayerWordsTag | NpcWordsTag>> = [];
        (player.dialogue?.dialogue ?? []).forEach(([p, n]) => {
            if (p) words.push(p);
            if (n && n.text.trim().length > 0) words.push(n);
        });
        return words;
    }, [player.dialogue]);

    // 关系轴快照：节点 NPC 走信任轴，同伴走好感轴
    const relation = SocializationService.resolveRelation(npc.dynamic);

    /**
     * 委托 / 需求列表。
     *
     * 节点 NPC 走 `initialState.quests`（信任轴），同伴走 `needs`（好感轴）；
     * 两者结构一致，共用同一套渲染与顺序解锁规则。
     */
    const npcQuests = useMemo<QuestTemplate[]>(() => {
        const nodeNpcQuests = (npc.static as NodeNpcTemplate).initialState.quests ?? [];
        if (nodeNpcQuests.length > 0) return nodeNpcQuests;

        const companionNeeds =
            'needs' in npc.dynamic && Array.isArray(npc.dynamic.needs)
                ? npc.dynamic.needs
                : ('needs' in npc.static.initialState && Array.isArray(npc.static.initialState.needs)
                    ? npc.static.initialState.needs
                    : []);

        return companionNeeds;
    }, [npc.static, npc.dynamic]);

    const isQuestAccepted = useCallback(
        (questId: string) => (player.questAccepted ?? []).some(q => q.id === questId),
        [player.questAccepted]
    );
    const isQuestArchived = useCallback(
        (questId: string) => (player.questArchived ?? []).some(q => q.id === questId),
        [player.questArchived]
    );
    const isQuestDone = useCallback(
        (questId: string) => (player.questArchived ?? []).some(q => q.id === questId && q.status === 'done'),
        [player.questArchived]
    );

    const hasActiveOrPendingQuests = useMemo(() => {
        return npcQuests.some(q => !isQuestDone(q.id));
    }, [npcQuests, isQuestDone]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [dialogueWords, isSending, showFreeChat, activeTab]);

    useEffect(() => {
        if (showFreeChat && inputRef.current) {
            inputRef.current.focus();
        }
    }, [showFreeChat]);

    const handleSend = async () => {
        if (!inputValue.trim() || isSending || isGenerating) return;
        const text = inputValue;
        setInputValue('');
        setIsSending(true);
        AudioService.playSfx('ui_click');
        try {
            await onSendMessage(text);
            AudioService.playSfx('typing_1');
        } catch {
            setInputValue(text);
            AudioService.playSfx('error');
        } finally {
            setIsSending(false);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            void handleSend();
        } else if (e.key === 'Escape') {
            setShowFreeChat(false);
        }
    };

    /**
     * 委托条目渲染。
     *
     * 契约允许目标项为「节点 NPC id 字符串」（不得内联 NPC 模板），
     * 奖励项为物品模板或完整同伴模板，这里统一收敛为同一种卡片。
     */
    const renderQuestEntity = (
        entity: ItemTemplate | NodeNpcTemplate | CompanionTemplate | string,
        index: number
    ) => {
        if (typeof entity === 'string') {
            return (
                <div
                    key={`${entity}-${index}`}
                    className="flex items-center gap-2 px-2.5 py-1.5 border border-zinc-800 bg-black/40 rounded-sm text-[10px] text-zinc-300 font-mono hover:border-zinc-600 transition-colors"
                >
                    <span className="text-amber-400">
                        <Glyph name="user" className="w-3.5 h-3.5" />
                    </span>
                    <span className="truncate">关键人员 · {entity}</span>
                </div>
            );
        }

        const isItem = isItemTemplate(entity);
        return (
            <div
                key={`${entity.id}-${index}`}
                className="flex items-center gap-2 px-2.5 py-1.5 border border-zinc-800 bg-black/40 rounded-sm text-[10px] text-zinc-300 font-mono hover:border-zinc-600 transition-colors"
            >
                <span className={isItem ? 'text-zinc-400' : 'text-amber-400'}>
                    <Glyph name={isItem ? ITEM_GLYPHS[entity.type] : 'user'} className="w-3.5 h-3.5" />
                </span>
                <span className="truncate">{entity.name}</span>
            </div>
        );
    };

    const tabBase =
        'flex-1 text-[10px] font-mono uppercase tracking-[0.2em] transition-all duration-300 relative flex items-center justify-center gap-2.5';

    return (
        <div className="fixed inset-0 z-[100] bg-[#06080a] font-serif backdrop-blur-md animate-in fade-in duration-300">
            <style>{PANEL_STYLES}</style>

            {/* 分层氛围背景 */}
            <div
                className="absolute inset-0 pointer-events-none z-0 opacity-10 bg-[linear-gradient(rgba(16,185,129,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.05)_1px,transparent_1px)] bg-[length:44px_44px]"
                style={{ animation: 'sp-drift 9s linear infinite' }}
            ></div>
            <div className="absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.9)_100%)]"></div>
            <div
                className="absolute -left-1/4 bottom-[-20%] w-[70%] h-[60%] pointer-events-none z-0 bg-[radial-gradient(closest-side,rgba(16,185,129,0.07),transparent)] blur-3xl"
                style={{ animation: 'sp-fog 26s ease-in-out infinite' }}
            ></div>
            <div
                className="absolute -right-1/4 top-[-15%] w-[60%] h-[55%] pointer-events-none z-0 bg-[radial-gradient(closest-side,rgba(34,211,238,0.05),transparent)] blur-3xl"
                style={{ animation: 'sp-fog 34s ease-in-out infinite reverse' }}
            ></div>

            <div className="relative z-10 w-full h-full flex flex-col overflow-hidden">
                <CommandHeader
                    npcName={npc.static.name}
                    isRecruited={isRecruited}
                    time={player.currentZoneTime}
                    zoneName={player.location.currentLocation.zone.name}
                    neuralLink={player.neuralLink}
                    onClose={onClose}
                />

                {showCompanionModal && isRecruited && (
                    <CompanionManagementModal
                        npc={npc}
                        player={player}
                        onClose={() => setShowCompanionModal(false)}
                        onCompanionEquipItem={onCompanionEquipItem}
                        onCompanionUnequipItem={onCompanionUnequipItem}
                        onCompanionUseConsumable={onCompanionUseConsumable}
                    />
                )}

                <div className="flex-1 flex overflow-hidden">
                    <BioMonitorSection
                        npc={npc}
                        isRecruited={isRecruited}
                        isGenerating={isGenerating}
                        onRecruit={onRecruit}
                        onMountProfile={onMountProfile}
                        onUnmountCreateNewProfile={onUnmountCreateNewProfile}
                        onDeleteProfile={onDeleteProfile}
                        onGenerateNpcImage={onGenerateNpcImage}
                        onRandomSwitchNpcImage={onRandomSwitchNpcImage}
                        hasMultipleNpcVariants={hasMultipleNpcVariants}
                        onOpenCompanionManagement={() => setShowCompanionModal(true)}
                    />

                    <div className="flex-1 flex flex-col bg-[#0b0b0d]/90 relative overflow-hidden">
                        {/* 页签路由 */}
                        <div className="h-14 shrink-0 border-b border-zinc-800/80 flex bg-zinc-900/60 relative z-40">
                            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-zinc-800 via-zinc-600 to-zinc-800"></div>
                            <button
                                onClick={() => {
                                    AudioService.playSfx('ui_click');
                                    setActiveTab('interaction');
                                }}
                                className={`${tabBase} ${activeTab === 'interaction'
                                    ? 'text-emerald-400 bg-black/80'
                                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
                                    }`}
                            >
                                <Glyph name="bolt" className="w-4 h-4" /> 通讯链路
                                {activeTab === 'interaction' && (
                                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-emerald-500 shadow-[0_0_15px_#10b981]"></div>
                                )}
                            </button>
                            <div className="w-[1px] bg-zinc-800/80 my-2"></div>
                            <button
                                onClick={() => {
                                    AudioService.playSfx('ui_click');
                                    setActiveTab('inventory');
                                }}
                                className={`${tabBase} ${activeTab === 'inventory'
                                    ? 'text-blue-400 bg-black/80'
                                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
                                    }`}
                            >
                                <Glyph name="backpack" className="w-4 h-4" /> 货舱管理
                                <span className="text-[9px] px-1.5 py-0.5 border border-zinc-700 bg-black/50 rounded-sm text-zinc-400">
                                    {npc.dynamic.inventory.length}
                                </span>
                                {activeTab === 'inventory' && (
                                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-blue-500 shadow-[0_0_15px_#3b82f6]"></div>
                                )}
                            </button>
                            <div className="w-[1px] bg-zinc-800/80 my-2"></div>
                            <button
                                onClick={() => {
                                    AudioService.playSfx('ui_click');
                                    setActiveTab('quest');
                                }}
                                className={`${tabBase} ${activeTab === 'quest'
                                    ? 'text-amber-400 bg-black/80'
                                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
                                    }`}
                            >
                                <Glyph name="clipboard" className="w-4 h-4" />{' '}
                                {relation.axis === 'trust' ? '委托协议' : '同伴需求'}
                                {activeTab === 'quest' && (
                                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-amber-500 shadow-[0_0_15px_#f59e0b]"></div>
                                )}
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden relative">
                            {/* ===================== 通讯链路 ===================== */}
                            {activeTab === 'interaction' && (
                                <div className="flex flex-col h-full relative bg-zinc-950/40">
                                    <div
                                        ref={scrollRef}
                                        className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent space-y-4"
                                    >
                                        <div className="flex justify-center mb-10">
                                            <div className="px-5 py-2 border border-zinc-700/60 bg-black/80 backdrop-blur-md text-[10px] text-zinc-400 font-mono rounded-full flex items-center gap-3 shadow-lg">
                                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></span>
                                                信号链路已建立 :: 频率锁定完成
                                            </div>
                                        </div>
                                        {dialogueWords.length === 0 && (
                                            <div className="py-24 flex flex-col items-center opacity-40">
                                                <span className="text-emerald-500/60 mb-6" style={{ animation: 'sp-flicker 3.5s linear infinite' }}>
                                                    <Glyph name="satellite" className="w-14 h-14" strokeWidth={1.2} />
                                                </span>
                                                <div className="text-[11px] font-mono tracking-widest uppercase text-emerald-500/80">
                                                    等待信号输入...
                                                </div>
                                            </div>
                                        )}
                                        {dialogueWords.map((words, idx) => (
                                            <ChatBubble key={`${words.tag.type}-${idx}`} words={words} npcName={npc.static.name} />
                                        ))}
                                        {(isSending || isGenerating) && (
                                            <div className="flex justify-start animate-in fade-in duration-300 mb-6">
                                                <div className="bg-zinc-900/80 border border-zinc-700/60 px-5 py-3 rounded-md text-[10px] text-zinc-400 font-mono tracking-[0.2em] flex items-center gap-3 shadow-lg">
                                                    <span className="text-emerald-500 animate-spin">
                                                        <Glyph name="refresh" className="w-3.5 h-3.5" />
                                                    </span>
                                                    PROCESSING
                                                    <span className="flex gap-1 ml-1">
                                                        <span className="animate-bounce w-1.5 h-1.5 bg-zinc-500 rounded-full"></span>
                                                        <span className="animate-bounce delay-150 w-1.5 h-1.5 bg-zinc-500 rounded-full"></span>
                                                        <span className="animate-bounce delay-300 w-1.5 h-1.5 bg-zinc-500 rounded-full"></span>
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/80 p-6 shadow-[0_-20px_40px_rgba(0,0,0,0.6)] z-20">
                                        {!showFreeChat ? (
                                            <div className="grid grid-cols-4 md:grid-cols-6 xl:grid-cols-7 gap-3">
                                                {!isRecruited ? (
                                                    <ActionButton
                                                        glyph="clipboard"
                                                        label="委托"
                                                        subLabel={hasActiveOrPendingQuests && npcQuests.length > 0 ? "已有委托" : "请求任务"}
                                                        onClick={() => {
                                                            if (hasActiveOrPendingQuests && npcQuests.length > 0) {
                                                                AudioService.playSfx('ui_click');
                                                                setActiveTab('quest');
                                                            }
                                                            onRequestQuest?.();
                                                        }}
                                                        color="amber"
                                                        disabled={isGenerating || isSending}
                                                    />
                                                ) : (
                                                    <ActionButton
                                                        glyph="heart"
                                                        label="谈心"
                                                        subLabel="心智交流"
                                                        onClick={() => onHeartToHeart?.()}
                                                        color="purple"
                                                        disabled={isGenerating || isSending}
                                                    />
                                                )}
                                                <ActionButton
                                                    glyph="keyboard"
                                                    label="对话"
                                                    subLabel="Manual Sync"
                                                    onClick={() => {
                                                        AudioService.playSfx('ui_click');
                                                        setShowFreeChat(true);
                                                    }}
                                                    color="blue"
                                                    disabled={isGenerating || isSending}
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex gap-3 items-stretch h-14 animate-in slide-in-from-bottom-2 duration-300">
                                                <button
                                                    onClick={() => {
                                                        AudioService.playSfx('ui_click');
                                                        setShowFreeChat(false);
                                                    }}
                                                    aria-label="收起手动输入"
                                                    className="w-14 shrink-0 flex items-center justify-center border border-zinc-700/60 bg-black/60 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors rounded-sm shadow-md"
                                                >
                                                    <Glyph name="close" />
                                                </button>
                                                <div className="flex-1 bg-black/80 border border-zinc-700/80 focus-within:border-emerald-500/70 focus-within:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all flex items-center px-6 rounded-sm">
                                                    <span className="text-emerald-500/60 mr-3 font-mono text-base font-bold animate-pulse">{'>'}</span>
                                                    <input
                                                        ref={inputRef}
                                                        type="text"
                                                        value={inputValue}
                                                        onChange={e => setInputValue(e.target.value)}
                                                        onKeyDown={handleKeyDown}
                                                        disabled={isSending || isGenerating}
                                                        placeholder="输入自定义指令或对话信号... (Esc 收起)"
                                                        className="w-full bg-transparent text-emerald-50 placeholder-zinc-600 outline-none font-mono text-[13px] tracking-wider"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => void handleSend()}
                                                    disabled={isSending || isGenerating || !inputValue.trim()}
                                                    className="px-8 bg-emerald-600/15 border border-emerald-500/50 text-emerald-400 font-bold hover:bg-emerald-500 hover:text-zinc-950 hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 font-mono text-[11px] tracking-[0.2em] uppercase rounded-sm flex items-center gap-2 active:scale-95"
                                                >
                                                    <Glyph name="send" className="w-3.5 h-3.5" /> Transmit
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ===================== 货舱管理 ===================== */}
                            {activeTab === 'inventory' && (
                                <div className="flex flex-col h-full bg-black/40">
                                    <div className="flex-1 p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                            {npc.dynamic.inventory.length > 0 ? (
                                                npc.dynamic.inventory.map((item: ItemInstance, idx: number) => {
                                                    const rarity = RARITY_MAP[item.grade];
                                                    return (
                                                        <div
                                                            key={item.instanceId}
                                                            data-rarity={item.grade}
                                                            data-intensity={rarity.intensity}
                                                            style={{ ...stagger(idx), ...rarity.vars } as React.CSSProperties}
                                                            className="rarity-cell flex items-center justify-between border border-zinc-800/80 bg-zinc-900/50 p-4 hover:bg-zinc-800/60 hover:-translate-y-0.5 transition-all duration-300 group/item rounded-md relative overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300"
                                                        >
                                                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/30 group-hover/item:bg-blue-500/60 transition-colors"></div>
                                                            <div className="flex items-center gap-4 pl-3 min-w-0">
                                                                <div
                                                                    className="w-12 h-12 shrink-0 flex items-center justify-center bg-black/80 border rounded-sm [border-color:var(--r-border)]"
                                                                >
                                                                    <Glyph name={ITEM_GLYPHS[item.type]} className="w-5 h-5" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="text-sm font-bold tracking-wide truncate [color:var(--r-text)]">
                                                                        {item.name}
                                                                        {item.quantity !== undefined && item.quantity > 1 && (
                                                                            <span className="ml-1.5 text-[10px] font-mono text-zinc-400">
                                                                                x{item.quantity}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[9px] text-zinc-500 font-mono uppercase mt-1 tracking-widest">
                                                                        {ITEM_TYPE_LABELS[item.type]} // {rarity.name}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {isRecruited ? (
                                                                <button
                                                                    onClick={() => {
                                                                        AudioService.playSfx('ui_click');
                                                                        onTakeItem(item);
                                                                    }}
                                                                    className="px-5 py-2.5 border border-zinc-700 bg-zinc-950/60 text-[10px] font-mono tracking-widest text-zinc-300 hover:text-blue-400 hover:border-blue-500 hover:bg-blue-950/40 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all rounded-sm z-10 uppercase flex items-center gap-2 active:scale-95"
                                                                >
                                                                    提取 <Glyph name="arrowRight" className="w-3 h-3" />
                                                                </button>
                                                            ) : (
                                                                <span className="text-[9px] text-red-400 font-mono border border-red-900/50 bg-red-950/30 px-3 py-1.5 uppercase rounded-sm tracking-widest flex items-center gap-1.5">
                                                                    <Glyph name="lock" className="w-3 h-3" /> LOCKED
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="col-span-full py-24 flex flex-col items-center border border-dashed border-zinc-800/80 bg-zinc-900/20 rounded-md">
                                                    <span className="text-blue-500/30 mb-6">
                                                        <Glyph name="box" className="w-14 h-14" strokeWidth={1.2} />
                                                    </span>
                                                    <span className="text-[11px] font-mono tracking-widest text-zinc-500 uppercase bg-black/40 px-4 py-2 rounded-sm border border-zinc-800">
                                                        当前存储模块为空
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-6 border-t border-zinc-800/80 bg-zinc-950/95 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                                        {isRecruited && (
                                            <div className="mb-4 flex items-center justify-between p-3 border border-cyan-800/50 bg-cyan-950/20 rounded-md">
                                                <div className="text-[11px] font-mono text-cyan-300 flex items-center gap-2">
                                                    <Glyph name="backpack" className="w-4 h-4 text-cyan-400 shrink-0" />
                                                    已建立同伴战备链路，可直接调配同伴装备槽位与消耗物资
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        AudioService.playSfx('ui_click');
                                                        setShowCompanionModal(true);
                                                    }}
                                                    className="px-3.5 py-1.5 bg-cyan-950/80 border border-cyan-500/60 hover:bg-cyan-900/80 hover:border-cyan-400 text-cyan-300 hover:text-white text-[10px] font-mono font-bold rounded transition-all flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
                                                >
                                                    打开同伴战备整备
                                                </button>
                                            </div>
                                        )}
                                        <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 bg-emerald-500/60 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></span>
                                                {isRecruited ? '随身物资转交 (TRANSFER_TO_COMPANION)' : '物资馈赠 (GIFT_TO_ESTABLISH_TRUST)'}
                                            </div>
                                            <span className="text-[9px] text-zinc-500 font-mono hidden sm:inline">
                                                {isRecruited ? '转交至同伴随身货舱' : '增进目标信任与好感'}
                                            </span>
                                        </div>
                                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                                            {player.dynamic.inventory.map((item: ItemInstance) => (
                                                <button
                                                    key={item.instanceId}
                                                    data-rarity={item.grade}
                                                    style={{ ...RARITY_MAP[item.grade].vars } as React.CSSProperties}
                                                    onClick={() => {
                                                        AudioService.playSfx('ui_click');
                                                        onGift(item);
                                                    }}
                                                    disabled={isGenerating || isSending}
                                                    className="flex items-center gap-3 px-5 py-3 border border-zinc-700/60 bg-black/60 text-[11px] text-zinc-300 hover:text-emerald-400 hover:border-emerald-500/70 hover:bg-emerald-950/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all font-mono shrink-0 group/gift rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full shrink-0 [background-color:var(--r-base)]"></span>
                                                    <span>{item.name}</span>
                                                    {item.quantity !== undefined && item.quantity > 1 && (
                                                        <span className="text-zinc-500">x{item.quantity}</span>
                                                    )}
                                                    <span className="opacity-0 group-hover/gift:opacity-100 -translate-x-1 group-hover/gift:translate-x-0 transition-all text-emerald-500">
                                                        <Glyph name="arrowRight" className="w-3.5 h-3.5" />
                                                    </span>
                                                </button>
                                            ))}
                                            {player.dynamic.inventory.length === 0 && (
                                                <span className="text-[10px] text-zinc-600 font-mono italic px-5 py-3 border border-dashed border-zinc-800 rounded-sm bg-black/40">
                                                    背囊无可用物资
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ===================== 委托协议 ===================== */}
                            {activeTab === 'quest' && (
                                <div className="flex flex-col h-full bg-black/40">
                                    <div className="flex-1 p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                                        {npcQuests.length === 0 ? (
                                            <div className="py-24 flex flex-col items-center border border-dashed border-zinc-800/80 bg-zinc-900/20 rounded-md">
                                                <span className="text-amber-500/30 mb-6">
                                                    <Glyph name="clipboard" className="w-14 h-14" strokeWidth={1.2} />
                                                </span>
                                                <span className="text-[11px] font-mono tracking-widest text-zinc-500 uppercase bg-black/40 px-4 py-2 rounded-sm border border-zinc-800">
                                                    当前无可用委托
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {npcQuests.map((quest, index) => {
                                                    const prevQuest = index > 0 ? npcQuests[index - 1] : undefined;
                                                    const prevDone = !prevQuest || isQuestDone(prevQuest.id);
                                                    const accepted = isQuestAccepted(quest.id);
                                                    const archived = isQuestArchived(quest.id);
                                                    const locked = !prevDone;
                                                    return (
                                                        <div
                                                            key={quest.id}
                                                            style={stagger(index)}
                                                            className={`border rounded-md p-5 transition-all relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300 ${locked
                                                                ? 'border-zinc-800 bg-zinc-950/40 opacity-70'
                                                                : accepted
                                                                    ? 'border-emerald-700/60 bg-emerald-950/20'
                                                                    : archived
                                                                        ? 'border-zinc-700 bg-zinc-900/40'
                                                                        : 'border-amber-800/50 bg-zinc-900/50 hover:border-amber-500/60 hover:-translate-y-0.5'
                                                                }`}
                                                        >
                                                            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/30"></div>
                                                            <div className="flex items-start justify-between gap-4 mb-3">
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2.5 mb-1">
                                                                        <span className="text-[9px] font-mono text-zinc-500 tracking-[0.2em]">
                                                                            PROTOCOL_{String(index + 1).padStart(2, '0')}
                                                                        </span>
                                                                        <div className="text-sm font-bold text-zinc-100 font-mono tracking-wide truncate">
                                                                            {quest.id}
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-[12px] text-zinc-300 font-serif italic leading-relaxed">
                                                                        {quest.desc}
                                                                    </div>
                                                                </div>
                                                                <div className="shrink-0 text-[10px] font-mono px-2.5 py-1 rounded-sm border border-zinc-700 bg-black/50 text-zinc-300 text-right">
                                                                    <div>难度 {quest.difficulty}</div>
                                                                    <div className="text-amber-400/80">{getDifficultyLabel(quest.difficulty)}</div>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                                                                <div>
                                                                    <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.2em] mb-2">目标</div>
                                                                    <div className="space-y-2">
                                                                        {quest.goals.length > 0 ? (
                                                                            quest.goals.map(renderQuestEntity)
                                                                        ) : (
                                                                            <div className="text-[10px] text-zinc-600 font-mono">无明确目标</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.2em] mb-2">奖励</div>
                                                                    <div className="space-y-2">
                                                                        {quest.rewards.length > 0 ? (
                                                                            quest.rewards.map(renderQuestEntity)
                                                                        ) : (
                                                                            <div className="text-[10px] text-zinc-600 font-mono">无明确奖励</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="text-[10px] font-mono">
                                                                    {locked && (
                                                                        <span className="text-red-400 border border-red-900/50 bg-red-950/30 px-3 py-1.5 rounded-sm uppercase tracking-widest inline-flex items-center gap-1.5">
                                                                            <Glyph name="lock" className="w-3 h-3" /> 需完成前置委托
                                                                        </span>
                                                                    )}
                                                                    {!locked && accepted && (
                                                                        <span className="text-emerald-400 border border-emerald-900/50 bg-emerald-950/30 px-3 py-1.5 rounded-sm uppercase tracking-widest inline-flex items-center gap-1.5">
                                                                            <Glyph name="check" className="w-3 h-3" /> 进行中
                                                                        </span>
                                                                    )}
                                                                    {!locked && !accepted && archived && (
                                                                        <span className="text-zinc-400 border border-zinc-800 bg-black/40 px-3 py-1.5 rounded-sm uppercase tracking-widest inline-flex items-center gap-1.5">
                                                                            <Glyph name="box" className="w-3 h-3" /> 已归档
                                                                        </span>
                                                                    )}
                                                                    {!locked && !accepted && !archived && (
                                                                        <span className="text-amber-400 border border-amber-900/50 bg-amber-950/30 px-3 py-1.5 rounded-sm uppercase tracking-widest">
                                                                            可接取
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {!locked && !accepted && !archived && onAcceptQuest && (
                                                                    <button
                                                                        onClick={() => {
                                                                            AudioService.playSfx('success');
                                                                            onAcceptQuest(quest.id, quest);
                                                                        }}
                                                                        disabled={isGenerating || isSending}
                                                                        className="px-5 py-2.5 border border-amber-600/60 bg-amber-950/30 text-[10px] font-mono tracking-widest text-amber-300 hover:bg-amber-500 hover:text-zinc-950 hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all rounded-sm uppercase disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                                                                    >
                                                                        接取委托 [ACCEPT]
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SocializationPanel;