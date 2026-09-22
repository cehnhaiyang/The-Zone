import React, { useState, useEffect, useMemo } from 'react';
import type {
    ChainNarrative,
    HorrorAesthetic,
    HorrorAtom,
    HorrorDomain,
    NarrativeMode,
    NarrativePacing,
    PlayerState,
    PlotPoint,
    StoryConfig,
} from '../../meta';
import {
    AXIS_PRESETS,
    HORROR_AESTHETICS,
    MODES_DEF,
    MOTIF_PRESETS,
    NARRATIVE_PACING,
} from '../../constants';
import type { NarrativeMutationResult } from '../../hooks';
import { AudioService } from '../../services';
import AestheticStudio from './AestheticStudio';

// ==========================================
// 1. 系统级色彩方案与主题字典
// ==========================================
export type ColorScheme = 'blue' | 'amber' | 'emerald' | 'purple' | 'red' | 'slate' | 'cyan' | 'rose';

const COLOR_SCHEME_MAP: Record<ColorScheme, { gradient: string; bg: string; border: string; text: string; borderHover: string }> = {
    blue: { gradient: '#1e3a8a40', bg: 'bg-blue-950/20', border: 'border-blue-900/50', text: 'text-blue-400', borderHover: 'border-blue-500/80' },
    amber: { gradient: '#78350f40', bg: 'bg-amber-950/20', border: 'border-amber-900/50', text: 'text-amber-500', borderHover: 'border-amber-500/80' },
    emerald: { gradient: '#064e3b40', bg: 'bg-emerald-950/20', border: 'border-emerald-900/50', text: 'text-emerald-500', borderHover: 'border-emerald-500/80' },
    purple: { gradient: '#4c1d9540', bg: 'bg-purple-950/20', border: 'border-purple-900/50', text: 'text-purple-400', borderHover: 'border-purple-500/80' },
    red: { gradient: '#7f1d1d40', bg: 'bg-red-950/20', border: 'border-red-900/50', text: 'text-red-500', borderHover: 'border-red-500/80' },
    slate: { gradient: '#0f172a40', bg: 'bg-slate-950/20', border: 'border-slate-800/50', text: 'text-slate-400', borderHover: 'border-slate-500/80' },
    cyan: { gradient: '#164e6340', bg: 'bg-cyan-950/20', border: 'border-cyan-900/50', text: 'text-cyan-400', borderHover: 'border-cyan-500/80' },
    rose: { gradient: '#88133740', bg: 'bg-rose-950/20', border: 'border-rose-900/50', text: 'text-rose-400', borderHover: 'border-rose-500/80' },
};

/**
 * 美学卡片配色。
 *
 * 元契约的 _Nar 只声明 id / name / desc / prompt，不含任何视觉字段，
 * 因此配色必须由表现层自行决定。此处按 id 哈希取色，保证同一美学
 * 在任何一次渲染中颜色恒定，且预设与自建美学共用同一套色板。
 */
const AESTHETIC_PALETTE: ColorScheme[] = ['emerald', 'cyan', 'purple', 'rose', 'amber', 'blue', 'slate'];

const pickAestheticScheme = (id: string): ColorScheme => {
    let hash = 0;
    for (let i = 0; i < id.length; i += 1) {
        hash = (hash * 31 + id.charCodeAt(i)) % 9973;
    }
    return AESTHETIC_PALETTE[hash % AESTHETIC_PALETTE.length];
};

interface BaseModalProps {
    title: string;
    subtitle?: string;
    colorScheme?: ColorScheme;
    children: React.ReactNode;
    footerContent?: React.ReactNode;
}

// ==========================================
// 2. 基础模态框容器
// ==========================================
const BaseModal: React.FC<BaseModalProps> = ({ title, subtitle, colorScheme = 'slate', children, footerContent }) => {
    const theme = COLOR_SCHEME_MAP[colorScheme];

    return (
        <div className="fixed inset-0 z-[100] bg-[#030305]/90 flex flex-col items-center justify-center backdrop-blur-xl animate-in fade-in duration-500 overflow-hidden select-none">
            <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at center, ${theme.gradient} 0%, transparent 70%)` }} />
            <div className={`relative w-full h-full flex flex-col border-0 ${theme.bg} shadow-2xl`}>
                <div className={`px-8 py-5 border-b ${theme.border} bg-black/60 backdrop-blur-md text-left flex-shrink-0 relative`}>
                    <div className="absolute bottom-0 left-0 h-[1px] w-1/3 bg-gradient-to-r from-white/20 to-transparent" />
                    <div className="max-w-7xl xl:max-w-[90rem] mx-auto w-full flex items-baseline gap-4">
                        <h1 className={`text-2xl md:text-3xl font-bold ${theme.text} tracking-[0.15em] drop-shadow-[0_0_10px_currentColor]`}>{title}</h1>
                        {subtitle && <span className={`text-xs ${theme.text} opacity-70 font-mono uppercase tracking-[0.2em]`}>{subtitle}</span>}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    <div className="max-w-7xl xl:max-w-[90rem] mx-auto w-full h-full">
                        {children}
                    </div>
                </div>

                {footerContent && (
                    <div className={`px-8 py-4 border-t ${theme.border} bg-black/80 backdrop-blur-md flex justify-end flex-shrink-0 relative`}>
                        <div className="absolute top-0 right-0 h-[1px] w-1/3 bg-gradient-to-l from-white/20 to-transparent" />
                        <div className="max-w-7xl xl:max-w-[90rem] mx-auto w-full flex justify-end gap-4 items-center">
                            {footerContent}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ==========================================
// 3. 独立面板拆分 (业务模块)
// ==========================================
interface ModePanelProps {
    onConfirm: (mode: NarrativeMode) => void;
    onCancel?: () => void;
    onOpenLibrary?: () => void;
}

const ModePanel: React.FC<ModePanelProps> = ({ onConfirm, onCancel, onOpenLibrary }) => {
    const [selectedMode, setSelectedMode] = useState<NarrativeMode>('chain');

    const handleConfirm = () => {
        AudioService.playSfx('success');
        onConfirm(selectedMode);
    };

    return (
        <BaseModal
            colorScheme="blue"
            title="结构拓扑选择"
            subtitle="定义全局叙事生命周期与演化路径"
            footerContent={
                <>
                    {onCancel && <button onClick={onCancel} className="px-6 py-2.5 border border-blue-900/50 text-blue-600 hover:text-blue-400 font-mono text-xs tracking-widest uppercase transition-all duration-300 hover:bg-blue-900/20">中断</button>}
                    {onOpenLibrary && <button onClick={() => { AudioService.playSfx('ui_click'); onOpenLibrary(); }} className="px-6 py-2.5 border border-purple-900/50 text-purple-500 hover:text-purple-300 font-mono text-xs tracking-widest uppercase transition-all duration-300 hover:bg-purple-900/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]">归档</button>}
                    <button onClick={handleConfirm} className="min-w-[160px] px-8 py-2.5 border bg-blue-900/30 border-blue-500/60 hover:border-blue-400 text-blue-300 font-mono text-sm tracking-widest uppercase transition-all duration-300 relative group overflow-hidden shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                        <span className="relative z-10 font-bold">核准结构</span>
                        <div className="absolute inset-0 bg-gradient-to-t from-blue-500/20 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                    </button>
                </>
            }
        >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                {MODES_DEF.map(mode => {
                    const isSelected = selectedMode === mode.id;
                    return (
                        <button
                            key={mode.id}
                            onClick={() => { setSelectedMode(mode.id); AudioService.playSfx('ui_click'); }}
                            className={`relative p-10 border text-left transition-all duration-500 ease-out group overflow-hidden flex flex-col min-h-[240px] ${isSelected ? 'bg-blue-900/20 border-blue-400/80 shadow-[inset_0_0_40px_rgba(59,130,246,0.15),0_0_30px_rgba(59,130,246,0.2)] -translate-y-1' : 'bg-black/40 border-blue-900/40 hover:border-blue-500/60 hover:bg-blue-900/10 hover:-translate-y-0.5'}`}
                        >
                            <div className={`absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 transition-colors duration-300 ${isSelected ? 'border-blue-400' : 'border-blue-900/50 group-hover:border-blue-500/80'}`} />
                            <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 transition-colors duration-300 ${isSelected ? 'border-blue-400' : 'border-blue-900/50 group-hover:border-blue-500/80'}`} />

                            <div className="flex items-center gap-4 mb-6">
                                <div className={`font-mono text-sm tracking-widest px-3 py-1.5 border transition-colors ${isSelected ? 'border-blue-400/50 bg-blue-500/20 text-blue-300' : 'border-blue-900/50 text-blue-600 group-hover:border-blue-500/50 group-hover:text-blue-400'}`}>
                                    [{mode.id.toUpperCase()}]
                                </div>
                                {isSelected && <div className="h-px flex-1 bg-gradient-to-r from-blue-500/50 to-transparent" />}
                            </div>

                            <span className={`text-3xl font-bold tracking-tight transition-colors mb-4 ${isSelected ? 'text-blue-200 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 'text-blue-500/80 group-hover:text-blue-300'}`}>{mode.name}</span>

                            <div className={`text-sm leading-relaxed font-mono mt-auto border-l-2 pl-4 transition-colors ${isSelected ? 'border-blue-500 text-blue-300/90' : 'border-blue-900/50 text-blue-700/60 group-hover:border-blue-600/80 group-hover:text-blue-400/80'}`}>
                                {mode.desc}
                            </div>

                            <div className={`absolute bottom-0 left-0 right-0 h-[2px] transition-all duration-500 ${isSelected ? 'bg-blue-400 shadow-[0_0_15px_rgba(59,130,246,1)]' : 'bg-transparent'}`} />
                        </button>
                    );
                })}
            </div>
        </BaseModal>
    );
};

interface PacingPanelProps {
    player: PlayerState;
    onConfirm: (pacing: NarrativePacing) => void;
    onCancel?: () => void;
}

const PacingPanel: React.FC<PacingPanelProps> = ({ player, onConfirm, onCancel }) => {
    const [selectedPacing, setSelectedPacing] = useState<NarrativePacing>('balanced');
    const activeArc = player?.activeArc;
    const hasSuspendedArc = activeArc?.status === 'suspended';

    const handleConfirm = () => {
        AudioService.playSfx('ui_transition');
        onConfirm(selectedPacing);
    };

    return (
        <BaseModal
            colorScheme="amber"
            title={hasSuspendedArc ? 'ARC_RESUMPTION' : 'PACING_OVERRIDE'}
            subtitle={hasSuspendedArc ? '侦测到挂起的叙事锚点' : '校准演化速率与拓扑基调'}
            footerContent={
                <>
                    {onCancel && <button onClick={onCancel} className="px-6 py-2.5 text-amber-700 hover:text-amber-400 font-mono text-xs tracking-widest uppercase border border-transparent hover:border-amber-900/50 transition-colors bg-black/30 hover:bg-black/60">终止</button>}
                    <button onClick={handleConfirm} className="min-w-[160px] px-8 py-2.5 border font-bold text-sm tracking-widest uppercase transition-all duration-300 relative overflow-hidden bg-amber-600/20 border-amber-500 text-amber-300 hover:bg-amber-500 hover:text-black shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]">
                        {hasSuspendedArc ? '覆写' : '注入'}
                    </button>
                </>
            }
        >
            <div className="flex flex-col xl:flex-row gap-8 h-full">
                <div className="w-full xl:w-2/5 flex flex-col gap-4 shrink-0">
                    {hasSuspendedArc ? (
                        <div className="p-8 border border-amber-600/40 bg-amber-950/20 relative group overflow-hidden h-full shadow-[inset_0_0_30px_rgba(245,158,11,0.05)]">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
                            <h3 className="text-xl font-bold text-amber-400 tracking-wide">{activeArc?.config.aesthetic.id || 'UNKNOWN_ARC'}</h3>
                            <button onClick={() => activeArc?.config.pacing && onConfirm(activeArc.config.pacing.id)} className="mt-6 w-full py-4 bg-amber-600/10 border border-amber-500/40 text-amber-300 hover:bg-amber-600/30 hover:border-amber-400 transition-all uppercase font-bold text-sm tracking-widest hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                                恢复神经链接 [RESUME]
                            </button>
                            <div className="mt-6 p-5 bg-red-950/30 border-l-4 border-red-800/60 text-xs text-red-400/90 leading-relaxed font-mono shadow-[inset_0_0_10px_rgba(239,68,68,0.05)]">
                                <span className="font-bold text-red-500 block mb-2">[覆写警告 / OVERRIDE_WARNING]</span>
                                绕过此步强制注入新参数，将导致该节点所有伏笔网络断裂并从记忆簇永久抹除。
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 border border-amber-900/40 bg-black/60 flex flex-col justify-center h-full relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity duration-700">
                                <svg className="w-24 h-24 text-amber-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2zm0 3.83L18.17 20H5.83L12 5.83z" /></svg>
                            </div>
                            <span className="text-3xl font-bold text-amber-500 uppercase tracking-[0.2em] mb-4 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">AWAITING INPUT</span>
                            <div className="h-px w-16 bg-amber-600/50 mb-8" />
                            <p className="text-sm text-amber-400/80 leading-relaxed border-l-2 border-amber-600/50 pl-5 font-mono">
                                请操作员指定深渊侵蚀的烈度。<br /><span className="text-amber-500 font-bold mt-2 inline-block">该参数与物资消耗及生还率呈现反比关联。</span>
                            </p>
                        </div>
                    )}
                </div>
                <div className="flex-1 grid grid-cols-2 xl:grid-cols-4 gap-6 auto-rows-max">
                    {NARRATIVE_PACING.map(mode => {
                        const isSelected = selectedPacing === mode.id;
                        return (
                            <button
                                key={mode.id}
                                onClick={() => { setSelectedPacing(mode.id); AudioService.playSfx('ui_hover'); }}
                                className={`relative flex flex-col p-8 text-left transition-all duration-500 ease-out overflow-hidden border min-h-[180px] ${isSelected ? 'bg-amber-900/20 border-amber-400/80 shadow-[inset_0_0_25px_rgba(245,158,11,0.2),0_0_30px_rgba(245,158,11,0.2)] z-10 -translate-y-1' : 'bg-black/50 border-amber-900/40 hover:border-amber-500/60 hover:bg-amber-900/10 hover:-translate-y-0.5'}`}
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <span className={`text-2xl font-bold tracking-widest ${isSelected ? 'text-amber-200 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]' : 'text-amber-600 group-hover:text-amber-400'}`}>{mode.id.toUpperCase()}</span>
                                    {isSelected && <div className="w-2.5 h-2.5 bg-amber-400 rounded-full shadow-[0_0_10px_rgba(245,158,11,1)] animate-pulse" />}
                                </div>
                                <div className={`h-px w-full mb-4 transition-colors ${isSelected ? 'bg-gradient-to-r from-amber-500/80 to-transparent' : 'bg-amber-900/30'}`} />
                                <p className={`text-sm mt-auto leading-relaxed font-mono ${isSelected ? 'text-amber-300' : 'text-amber-700/60 group-hover:text-amber-500/80'}`}>{mode.name}</p>
                            </button>
                        );
                    })}
                </div>
            </div>
        </BaseModal>
    );
};

interface AestheticPanelProps {
    aesthetics: HorrorAesthetic[];
    isLoading: boolean;
    onConfirm: (aesthetic: StoryConfig['aesthetic']) => void;
    onOpenStudio: () => void;
    onCancel?: () => void;
}

const AestheticPanel: React.FC<AestheticPanelProps> = ({ aesthetics, isLoading, onConfirm, onOpenStudio, onCancel }) => {
    const [aestheticMode, setAestheticMode] = useState<'preset' | 'custom' | 'auto'>('preset');
    const [selectedAestheticId, setSelectedAestheticId] = useState<string>(aesthetics[0]?.id ?? '');
    const [customAesthetic, setCustomAesthetic] = useState('');

    // 库异步载入，首帧可能为空；载入完成后补一次默认选中，避免空选提交。
    useEffect(() => {
        if (!selectedAestheticId && aesthetics.length > 0) {
            setSelectedAestheticId(aesthetics[0].id);
        }
    }, [aesthetics, selectedAestheticId]);

    const handleConfirm = () => {
        AudioService.playSfx('success');

        if (aestheticMode === 'custom') {
            // 自建美学：prompt 用玩家原文，id 由文本派生为 slug
            // （叙事链 id 会拼接该值，故不能直接塞入含空格与中文的原文）。
            const text = customAesthetic.trim();
            const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32);
            onConfirm({ id: slug || 'custom', prompt: text });
            return;
        }

        // auto 模式：历史实现提交空字符串，导致 buildStoryConfigFromPending
        // 因 aesthetic.id 为空返回 undefined、叙事流程静默卡死。
        // 现从库中随机取一（保证 id 非空，流程可继续）。
        const picked = aestheticMode === 'preset'
            ? (aesthetics.find(item => item.id === selectedAestheticId) ?? aesthetics[0])
            : aesthetics[Math.floor(Math.random() * aesthetics.length)];

        if (!picked) return;
        onConfirm({ id: picked.id, prompt: picked.prompt });
    };

    const selected = aesthetics.find(item => item.id === selectedAestheticId) ?? null;

    return (
        <BaseModal
            colorScheme="emerald"
            title="表象主题定标"
            subtitle="构建潜意识倒影的物理规则"
            footerContent={
                <>
                    {onCancel && <button onClick={onCancel} className="px-6 py-2.5 border border-emerald-900/50 text-emerald-600 hover:text-emerald-400 font-mono text-xs tracking-widest uppercase transition-colors bg-black/30 hover:bg-emerald-900/20">返回</button>}
                    <button onClick={onOpenStudio} className="px-6 py-2.5 border border-purple-900/50 text-purple-500 hover:text-purple-300 font-mono text-xs tracking-widest uppercase transition-all duration-300 hover:bg-purple-900/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]">美学工作台</button>
                    <button onClick={handleConfirm} className="min-w-[160px] px-8 py-2.5 border bg-emerald-950/30 border-emerald-500/60 hover:border-emerald-400 text-emerald-300 font-mono text-sm tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)]">核准</button>
                </>
            }
        >
            <div className="space-y-8 flex flex-col h-full">
                <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-4 border-b border-emerald-900/30">
                    <h3 className="text-sm font-bold text-emerald-500 font-mono tracking-widest uppercase drop-shadow-[0_0_5px_rgba(16,185,129,0.4)]">空间主题 / Spatial Theme</h3>
                    <div className="flex bg-black/50 border border-emerald-900/40 rounded-sm p-1">
                        {(['preset', 'custom', 'auto'] as const).map(mode => (
                            <button key={mode} onClick={() => { setAestheticMode(mode); AudioService.playSfx('ui_click'); }} className={`text-xs px-5 py-2 font-mono tracking-widest transition-all rounded-sm ${aestheticMode === mode ? 'bg-emerald-900/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'text-emerald-700/60 hover:text-emerald-500 hover:bg-emerald-900/20'}`}>{mode.toUpperCase()}</button>
                        ))}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-900/50 scrollbar-track-transparent pb-4">
                    {aestheticMode === 'preset' && (
                        <div className="space-y-5">
                            {selected && (
                                <div className="p-6 border border-emerald-900/40 bg-black/50 space-y-3">
                                    <div className="flex flex-wrap items-center gap-4">
                                        <span className="text-lg font-bold text-emerald-300">{selected.name}</span>
                                        <span className="text-[11px] font-mono text-emerald-700">[{selected.id}]</span>
                                        <span className="ml-auto text-[11px] font-mono text-slate-500">
                                            主控域 {selected.primaryDomain}
                                            {(selected.interferingDomains ?? []).length > 0 && ` · 渗透 ${(selected.interferingDomains ?? []).join(' / ')}`}
                                        </span>
                                    </div>
                                    <p className="text-xs text-emerald-400/80 leading-relaxed font-mono border-l-2 border-emerald-700/50 pl-4">{selected.desc}</p>
                                </div>
                            )}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                                {aesthetics.map(item => {
                                    const isSelected = selectedAestheticId === item.id;
                                    const colors = COLOR_SCHEME_MAP[pickAestheticScheme(item.id)];
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => { setSelectedAestheticId(item.id); AudioService.playSfx('ui_click'); }}
                                            className={`p-5 border text-left transition-all duration-300 relative overflow-hidden group flex flex-col min-h-[120px] ${isSelected ? 'bg-gray-800/90 border-gray-500 shadow-[0_0_25px_rgba(255,255,255,0.1)] -translate-y-1' : 'border-gray-800/50 bg-black/40 hover:border-gray-600/80 hover:bg-gray-900/40 hover:-translate-y-0.5'}`}
                                        >
                                            {isSelected && <div className={`absolute top-0 left-0 w-full h-[2px] shadow-[0_0_10px_currentColor] bg-current ${colors.text}`} />}
                                            <div className={`font-bold text-sm tracking-widest uppercase transition-colors mb-3 ${isSelected ? colors.text : 'text-gray-400 group-hover:text-gray-200'}`}>{item.id}</div>
                                            <div className={`text-xs font-mono mt-auto leading-relaxed transition-colors ${isSelected ? 'text-gray-300' : 'text-gray-600 group-hover:text-gray-400'}`}>{item.name}</div>
                                        </button>
                                    );
                                })}
                            </div>
                            {aesthetics.length === 0 && !isLoading && (
                                <div className="p-12 bg-emerald-950/20 border border-emerald-900/40 text-sm text-emerald-500/80 font-mono text-center">
                                    美学库空载 · 请通过「美学工作台」自建
                                </div>
                            )}
                        </div>
                    )}
                    {aestheticMode === 'custom' && <textarea value={customAesthetic} onChange={e => setCustomAesthetic(e.target.value)} placeholder="[输入序列] 声明场景视觉与物理规则的强制限定符..." className="w-full h-full min-h-[250px] bg-black/60 border border-emerald-900/50 text-emerald-200 p-6 font-mono text-sm focus:outline-none focus:border-emerald-400/80 focus:shadow-[inset_0_0_20px_rgba(16,185,129,0.1)] resize-none transition-all placeholder:text-emerald-900/60" />}
                    {aestheticMode === 'auto' && <div className="p-12 bg-emerald-950/20 border border-emerald-900/40 text-sm text-emerald-500/80 font-mono text-center flex flex-col items-center justify-center h-full gap-4">
                        <svg className="w-12 h-12 opacity-50 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                        <span>[系统接管] 神经引擎将根据上下文执行自适应场景推演</span>
                    </div>}
                </div>
            </div>
        </BaseModal>
    );
};

interface ConfigPanelProps {
    onConfirm: (config: { motif: string; mainAxis: string }) => void;
    onCancel?: () => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ onConfirm, onCancel }) => {
    const [motifMode, setMotifMode] = useState<'preset' | 'custom' | 'auto'>('auto');
    const [selectedMotif, setSelectedMotif] = useState('');
    const [customMotif, setCustomMotif] = useState('');

    const [axisMode, setAxisMode] = useState<'preset' | 'custom' | 'auto'>('auto');
    const [selectedAxis, setSelectedAxis] = useState('');
    const [customAxis, setCustomAxis] = useState('');

    const handleConfirm = () => {
        AudioService.playSfx('success');
        onConfirm({
            motif: motifMode === 'custom' ? customMotif : motifMode === 'preset' ? selectedMotif : '',
            mainAxis: axisMode === 'custom' ? customAxis : axisMode === 'preset' ? selectedAxis : ''
        });
    };

    return (
        <BaseModal
            colorScheme="purple"
            title="语义内核定标"
            subtitle="锚定剧情发展的底层基座"
            footerContent={
                <>
                    {onCancel && <button onClick={onCancel} className="px-6 py-2.5 border border-purple-900/50 text-purple-600 hover:text-purple-400 font-mono text-xs tracking-widest uppercase transition-colors bg-black/30 hover:bg-purple-900/20">返回</button>}
                    <button onClick={handleConfirm} className="min-w-[160px] px-8 py-2.5 border bg-purple-950/30 border-purple-500/60 hover:border-purple-400 text-purple-300 font-mono text-sm tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(168,85,247,0.15)] hover:shadow-[0_0_25px_rgba(168,85,247,0.3)]">核准</button>
                </>
            }
        >
            <div className="space-y-10 h-full flex flex-col">
                <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-purple-900/30">
                        <h3 className="text-sm font-bold text-purple-400 font-mono tracking-widest uppercase drop-shadow-[0_0_5px_rgba(168,85,247,0.4)]">内核主旨 / Motif</h3>
                        <div className="flex bg-black/50 border border-purple-900/40 rounded-sm p-1">
                            {(['preset', 'custom', 'auto'] as const).map(mode => (
                                <button key={mode} onClick={() => { setMotifMode(mode); AudioService.playSfx('ui_click'); }} className={`text-xs px-4 py-1.5 font-mono tracking-widest transition-all rounded-sm ${motifMode === mode ? 'bg-purple-900/60 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]' : 'text-purple-700/60 hover:text-purple-500 hover:bg-purple-900/20'}`}>{mode.toUpperCase()}</button>
                            ))}
                        </div>
                    </div>
                    {motifMode === 'preset' && (
                        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-4">
                            {MOTIF_PRESETS.map(motif => (
                                <button key={motif.id} onClick={() => { setSelectedMotif(motif.id); AudioService.playSfx('ui_click'); }} className={`p-4 border text-center text-sm font-mono tracking-wider transition-all duration-300 hover:-translate-y-0.5 ${selectedMotif === motif.id ? 'border-purple-400/80 text-purple-200 bg-purple-900/40 shadow-[inset_0_0_15px_rgba(168,85,247,0.2),0_0_20px_rgba(168,85,247,0.2)]' : 'border-purple-900/40 text-purple-600/80 bg-black/40 hover:bg-purple-900/20 hover:border-purple-600/60 hover:text-purple-400'}`}>{motif.name}</button>
                            ))}
                        </div>
                    )}
                    {motifMode === 'custom' && <input value={customMotif} onChange={e => setCustomMotif(e.target.value)} placeholder="[输入序列] 确立形而上学或情感基准..." className="w-full bg-black/60 border border-purple-900/50 text-purple-200 p-4 font-mono text-sm focus:outline-none focus:border-purple-400/80 focus:shadow-[inset_0_0_15px_rgba(168,85,247,0.1)] transition-all placeholder:text-purple-900/60" />}
                    {motifMode === 'auto' && <div className="p-5 bg-purple-950/20 border border-purple-900/40 text-xs text-purple-500/80 font-mono flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" /> AI 将分析当前队伍状态与前置伏笔执行自适应补全</div>}
                </div>

                <div className="space-y-6 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-amber-900/30">
                        <h3 className="text-sm font-bold text-amber-500 font-mono tracking-widest uppercase drop-shadow-[0_0_5px_rgba(245,158,11,0.4)]">动作主轴 / Main Axis</h3>
                        <div className="flex bg-black/50 border border-amber-900/40 rounded-sm p-1">
                            {(['preset', 'custom', 'auto'] as const).map(mode => (
                                <button key={mode} onClick={() => { setAxisMode(mode); AudioService.playSfx('ui_click'); }} className={`text-xs px-4 py-1.5 font-mono tracking-widest transition-all rounded-sm ${axisMode === mode ? 'bg-amber-900/60 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'text-amber-700/60 hover:text-amber-500 hover:bg-amber-900/20'}`}>{mode.toUpperCase()}</button>
                            ))}
                        </div>
                    </div>
                    {axisMode === 'preset' && (
                        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-4">
                            {AXIS_PRESETS.map(axis => (
                                <button key={axis.id} onClick={() => { setSelectedAxis(axis.id); AudioService.playSfx('ui_click'); }} className={`p-4 border text-center text-sm font-mono tracking-wider transition-all duration-300 hover:-translate-y-0.5 ${selectedAxis === axis.id ? 'border-amber-400/80 text-amber-200 bg-amber-900/40 shadow-[inset_0_0_15px_rgba(245,158,11,0.2),0_0_20px_rgba(245,158,11,0.2)]' : 'border-amber-900/40 text-amber-600/80 bg-black/40 hover:bg-amber-900/20 hover:border-amber-600/60 hover:text-amber-400'}`}>{axis.name}</button>
                            ))}
                        </div>
                    )}
                    {axisMode === 'custom' && <input value={customAxis} onChange={e => setCustomAxis(e.target.value)} placeholder="[输入序列] 规范系统逻辑导向与核心互动形式..." className="w-full bg-black/60 border border-amber-900/50 text-amber-200 p-4 font-mono text-sm focus:outline-none focus:border-amber-400/80 focus:shadow-[inset_0_0_15px_rgba(245,158,11,0.1)] transition-all placeholder:text-amber-900/60" />}
                    {axisMode === 'auto' && <div className="p-5 bg-amber-950/20 border border-amber-900/40 text-xs text-amber-500/80 font-mono flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> 依赖所处环境及资源深度动态约束生成</div>}
                </div>
            </div>
        </BaseModal>
    );
};

interface DetailsPanelProps {
    tension: number;
    nodeCount: number;
    onTensionChange: React.Dispatch<React.SetStateAction<number>>;
    onNodeCountChange: React.Dispatch<React.SetStateAction<number>>;
    onConfirm: () => void;
    onCancel?: () => void;
}

const DetailsPanel: React.FC<DetailsPanelProps> = ({ tension, nodeCount, onTensionChange, onNodeCountChange, onConfirm, onCancel }) => {
    const handleConfirm = () => {
        AudioService.playSfx('success');
        onConfirm();
    };

    return (
        <BaseModal
            colorScheme="red"
            title="孤立环境参数设定"
            subtitle="设置单元剧沙盒的底层张力与节点规模"
            footerContent={
                <>
                    {onCancel && <button onClick={onCancel} className="px-6 py-2.5 border border-red-900/50 text-red-600 hover:text-red-400 font-mono text-xs tracking-widest uppercase transition-colors bg-black/30 hover:bg-red-900/20">返回</button>}
                    <button onClick={handleConfirm} className="min-w-[160px] px-8 py-2.5 border bg-red-950/30 border-red-500/60 hover:border-red-400 text-red-300 font-mono text-sm tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(239,68,68,0.15)] hover:shadow-[0_0_25px_rgba(239,68,68,0.3)]">注入</button>
                </>
            }
        >
            <div className="space-y-8 max-w-5xl mx-auto">
                <div className="p-5 bg-red-950/20 border-l-4 border-red-800/60 flex items-center gap-6 shadow-[inset_0_0_15px_rgba(239,68,68,0.05)]">
                    <div className="text-sm font-bold text-red-500 tracking-widest border border-red-900/50 px-3 py-1 bg-red-950/40">[SANDBOX_MODE]</div>
                    <div className="text-xs text-red-400/90 font-mono leading-relaxed">
                        该组态仅对隔离出的单元剧区域有效。节点规模决定生存通关的几何深度，初始张力影响高阶敌对实体的衍生概率。
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-8 border border-red-900/40 bg-black/60 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(239,68,68,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(239,68,68,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
                        <div className="relative z-10">
                            <div className="flex justify-between items-end mb-8 border-b border-red-900/50 pb-4">
                                <h3 className="text-sm font-bold text-red-500 font-mono tracking-widest uppercase">环境张力 / TENSION</h3>
                                <span className="text-6xl text-red-400 font-bold drop-shadow-[0_0_12px_rgba(239,68,68,0.6)] leading-none">{tension}</span>
                            </div>
                            <div className="relative py-4 mb-4">
                                <input type="range" min="0" max="1000" step="50" value={tension} onChange={e => onTensionChange(Number(e.target.value))} className="w-full h-2 bg-red-950/80 rounded-full appearance-none outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(239,68,68,0.8)] hover:[&::-webkit-slider-thumb]:bg-red-400 transition-all border border-red-900/30" />
                            </div>
                            <div className="flex gap-4 mt-2">
                                <button onClick={() => onTensionChange(v => Math.max(0, v - 50))} className="flex-1 py-3 bg-red-950/40 border border-red-900/60 text-red-500 hover:bg-red-900/50 hover:text-red-300 hover:border-red-500/60 transition-all font-mono text-xl font-bold backdrop-blur-sm">-50</button>
                                <button onClick={() => onTensionChange(v => Math.min(1000, v + 50))} className="flex-1 py-3 bg-red-950/40 border border-red-900/60 text-red-500 hover:bg-red-900/50 hover:text-red-300 hover:border-red-500/60 transition-all font-mono text-xl font-bold backdrop-blur-sm">+50</button>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 border border-amber-900/40 bg-black/60 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(245,158,11,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
                        <div className="relative z-10">
                            <div className="flex justify-between items-end mb-8 border-b border-amber-900/50 pb-4">
                                <h3 className="text-sm font-bold text-amber-500 font-mono tracking-widest uppercase">衍生节点 / NODES</h3>
                                <span className="text-6xl text-amber-400 font-bold drop-shadow-[0_0_12px_rgba(245,158,11,0.6)] leading-none">{nodeCount}</span>
                            </div>
                            <div className="relative py-4 mb-4">
                                <input type="range" min="5" max="50" step="1" value={nodeCount} onChange={e => onNodeCountChange(Number(e.target.value))} className="w-full h-2 bg-amber-950/80 rounded-full appearance-none outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(245,158,11,0.8)] hover:[&::-webkit-slider-thumb]:bg-amber-400 transition-all border border-amber-900/30" />
                            </div>
                            <div className="flex gap-4 mt-2">
                                <button onClick={() => onNodeCountChange(v => Math.max(5, v - 5))} className="flex-1 py-3 bg-amber-950/40 border border-amber-900/60 text-amber-500 hover:bg-amber-900/50 hover:text-amber-300 hover:border-amber-500/60 transition-all font-mono text-xl font-bold backdrop-blur-sm">-5</button>
                                <button onClick={() => onNodeCountChange(v => Math.min(50, v + 5))} className="flex-1 py-3 bg-amber-950/40 border border-amber-900/60 text-amber-500 hover:bg-amber-900/50 hover:text-amber-300 hover:border-amber-500/60 transition-all font-mono text-xl font-bold backdrop-blur-sm">+5</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </BaseModal>
    );
};

// ==========================================
// 4. 预览与数据呈现
// ==========================================
interface PreviewPanelProps {
    player: PlayerState;
    pendingConfig: Partial<StoryConfig>;
    episodicTension: number;
    episodicNodeCount: number;
    aesthetics: HorrorAesthetic[];
    narrativePreview: { params?: StoryConfig; activePlots: PlotPoint[]; mainPlots: PlotPoint[]; sidePlots: PlotPoint[]; expectedPlotsText: string; analysis?: ChainNarrative['analysis']; };
    onConfirm: (autoGenOptions?: { images?: boolean; videos?: boolean; audios?: boolean }) => void;
    onCancel?: () => void;
}

const PreviewSection: React.FC<{ title: string; colorScheme: ColorScheme; children: React.ReactNode }> = ({ title, colorScheme, children }) => {
    const colors = COLOR_SCHEME_MAP[colorScheme];
    return (
        <div className={`relative p-8 transition-all duration-300 hover:bg-black/60 bg-black/40 backdrop-blur-sm group border border-white/5`}>
            <div className={`absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 transition-colors group-hover:${colors.borderHover}`} />
            <div className={`absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 transition-colors group-hover:${colors.borderHover}`} />

            <div className={`flex items-center gap-4 mb-8 border-b pb-4 ${colors.border}`}>
                <div className={`w-2 h-2 ${colors.text} animate-pulse shadow-[0_0_8px_currentColor]`} />
                <h3 className={`text-sm font-bold tracking-[0.25em] uppercase ${colors.text}`}>{title}</h3>
            </div>
            {children}
        </div>
    );
};

const DataItem: React.FC<{ label: string; value: React.ReactNode; colorClass: string; valueClass: string; warning?: boolean }> = ({ label, value, colorClass, valueClass, warning }) => (
    <div className={`flex flex-col gap-2.5 p-5 bg-black/50 border-l-2 transition-all duration-300 hover:bg-black/80 hover:-translate-y-0.5 ${warning ? 'border-red-500/60 shadow-[inset_4px_0_15px_rgba(239,68,68,0.1)]' : 'border-white/10 hover:border-white/30 hover:shadow-[inset_4px_0_15px_rgba(255,255,255,0.03)]'}`}>
        <span className={`text-[10px] uppercase tracking-widest font-mono ${colorClass} opacity-80`}>{label}</span>
        <span className={`text-xl font-bold font-mono tracking-tight ${valueClass}`}>{value}</span>
    </div>
);

const PreviewPanel: React.FC<PreviewPanelProps> = ({ player, pendingConfig, episodicTension, episodicNodeCount, aesthetics, narrativePreview, onConfirm, onCancel }) => {
    const { params, activePlots, mainPlots, sidePlots, expectedPlotsText, analysis } = narrativePreview;
    const [assetsGen, setAssetsGen] = useState({ images: false, videos: false, audios: false });
    const [showPrompt, setShowPrompt] = useState(false);
    const [promptText, setPromptText] = useState('');

    const toggleAsset = (key: keyof typeof assetsGen) => {
        setAssetsGen(prev => ({ ...prev, [key]: !prev[key] }));
        AudioService.playSfx('ui_click');
    };

    const isChain = pendingConfig.mode?.id === 'chain';
    // 使用分析结果中的 tension，如果没有则使用配置中的或默认值
    const displayTension = isChain ? (analysis?.params?.tension || params?.tension || 0) : episodicTension;
    const displayNodeCount = isChain ? (analysis?.output?.nodeToGenerate || 8) : episodicNodeCount;
    const displayProgress = analysis?.params?.progress?.micro || 0;
    const displayPhase = analysis?.params?.progress?.macro || 'SETUP';

    const modeDef = MODES_DEF.find(m => m.id === pendingConfig.mode?.id) || MODES_DEF[0];
    const pacingDef = NARRATIVE_PACING.find(p => p.id === pendingConfig.pacing?.id) || NARRATIVE_PACING[1];
    const aestheticDef = aesthetics.find(a => a.id === pendingConfig.aesthetic?.id) || null;
    const motifDef = pendingConfig.motif?.id ? MOTIF_PRESETS.find(m => m.id === pendingConfig.motif?.id) : null;
    const axisDef = pendingConfig.mainAxis?.id ? AXIS_PRESETS.find(a => a.id === pendingConfig.mainAxis?.id) : null;

    // _Nar 不含视觉字段，配色由表现层按 id 取，替代历史上的 mainColor。
    const modeColor = 'text-emerald-400';
    const pacingColor = 'text-amber-500';
    const aestheticColor = aestheticDef ? COLOR_SCHEME_MAP[pickAestheticScheme(aestheticDef.id)].text : 'text-cyan-400';
    const axisColor = 'text-amber-400';
    const motifColor = 'text-purple-400';

    const handleExportPrompt = () => {
        // 构建完整的提示词导出
        const isChain = pendingConfig.mode?.id === 'chain';
        const modeDef = MODES_DEF.find(m => m.id === pendingConfig.mode?.id);
        const pacingDef = NARRATIVE_PACING.find(p => p.id === pendingConfig.pacing?.id);
        const aestheticExport = aesthetics.find(a => a.id === pendingConfig.aesthetic?.id);
        const motifDef = pendingConfig.motif?.id ? MOTIF_PRESETS.find(m => m.id === pendingConfig.motif?.id) : null;
        const axisDef = pendingConfig.mainAxis?.id ? AXIS_PRESETS.find(a => a.id === pendingConfig.mainAxis?.id) : null;

        let exportText = '=== NARRATIVE CONFIGURATION EXPORT ===\n\n';

        exportText += '[NARRATIVE MODE]\n';
        exportText += `ID: ${pendingConfig.mode?.id || 'unknown'}\n`;
        if (modeDef) {
            exportText += `Description: ${modeDef.name}\n`;
            exportText += `Prompt: ${modeDef.prompt}\n`;
        }
        exportText += '\n';

        if (isChain && pendingConfig.pacing) {
            exportText += '[PACING]\n';
            exportText += `ID: ${pendingConfig.pacing.id}\n`;
            if (pacingDef) {
                exportText += `Description: ${pacingDef.name}\n`;
                exportText += `Prompt: ${pacingDef.prompt}\n`;
            }
            exportText += '\n';
        }

        exportText += '[AESTHETIC]\n';
        exportText += `ID: ${pendingConfig.aesthetic?.id || 'auto'}\n`;
        if (aestheticExport) {
            exportText += `Description: ${aestheticExport.desc}\n`;
            exportText += `Primary Domain: ${aestheticExport.primaryDomain}\n`;
            exportText += `Interfering Domains: ${(aestheticExport.interferingDomains ?? []).join(', ') || 'none'}\n`;
            exportText += `Skeleton: ${aestheticExport.structure.skeleton.map(s => `${s.atomId}(${s.dominance})`).join(', ')}\n`;
            exportText += `Flesh: ${(aestheticExport.structure.flesh ?? []).map(f => `${f.atomId}${f.revealPhase ? `@${f.revealPhase}` : ''}`).join(', ') || 'none'}\n`;
            exportText += `Prompt: ${aestheticExport.prompt}\n`;
        }
        exportText += '\n';

        if (isChain) {
            if (pendingConfig.motif) {
                exportText += '[MOTIF]\n';
                exportText += `ID: ${pendingConfig.motif.id}\n`;
                if (motifDef) {
                    exportText += `Description: ${motifDef.name}\n`;
                    exportText += `Prompt: ${motifDef.prompt}\n`;
                }
                exportText += '\n';
            }

            if (pendingConfig.mainAxis) {
                exportText += '[MAIN AXIS]\n';
                exportText += `ID: ${pendingConfig.mainAxis.id}\n`;
                if (axisDef) {
                    exportText += `Description: ${axisDef.name}\n`;
                    exportText += `Prompt: ${axisDef.prompt}\n`;
                }
                exportText += '\n';
            }
        }

        exportText += '[RUNTIME PARAMETERS]\n';
        exportText += `Mode: ${isChain ? 'Chain' : 'Episodic'}\n`;
        exportText += `Tension: ${displayTension}\n`;
        exportText += `Node Count: ${displayNodeCount}\n`;
        if (isChain && analysis) {
            exportText += `Progress (Micro): ${displayProgress}\n`;
            exportText += `Progress (Marco): ${displayPhase}\n`;
            exportText += `Should Trigger Ending: ${analysis.params?.shouldTriggerEnding || false}\n`;
        }
        exportText += '\n';

        exportText += '[PLAYER STATUS]\n';
        exportText += `HP: ${player.dynamic.hp}\n`;
        exportText += `Sanity: ${player.dynamic.sanity.toFixed(1)}\n`;
        exportText += `Level: ${player.dynamic.level}\n`;
        exportText += '\n';

        if (activePlots.length > 0) {
            exportText += `[ACTIVE PLOTS: ${mainPlots.length} Main / ${sidePlots.length} Side]\n`;
            activePlots.forEach((plot, idx) => {
                exportText += `${idx + 1}. [${plot.type.toUpperCase()}] ${plot.content}\n`;
                exportText += `   ID: ${plot.id}\n`;
            });
            exportText += '\n';
        }

        exportText += '=== END OF EXPORT ===';

        setPromptText(exportText);
        setShowPrompt(true);
        AudioService.playSfx('success');
    };

    return (
        <BaseModal
            colorScheme="slate"
            title="NARRATIVE CONTEXT REVIEW"
            subtitle="System context verification before synchronization"
            footerContent={
                <>
                    {onCancel && <button onClick={() => { AudioService.playSfx('ui_click'); onCancel(); }} className="px-4 py-2 border border-slate-700/60 text-slate-400 font-bold text-xs tracking-wider uppercase hover:bg-slate-800/30 transition-colors">重置</button>}
                    <button onClick={handleExportPrompt} className="px-4 py-2 border border-purple-900/60 text-purple-500 font-bold text-xs tracking-wider uppercase hover:bg-purple-600/10 transition-colors">导出</button>
                    <button onClick={() => { AudioService.playSfx('success'); onConfirm(assetsGen); }} className="min-w-[120px] px-6 py-2 border border-slate-500 bg-slate-600/10 text-slate-300 font-bold text-sm tracking-wider uppercase hover:bg-slate-600/20 transition-all">执行封装</button>
                </>
            }
        >
            <div className="space-y-10">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <PreviewSection title="静态组态 | CONFIG" colorScheme="emerald">
                        <div className="grid grid-cols-2 gap-5">
                            <DataItem label="运算拓扑" value={isChain ? '长线递归' : '孤立沙盒'} colorClass={modeColor} valueClass={modeColor} />
                            {isChain && <DataItem label="步长节律" value={pendingConfig.pacing?.id?.toUpperCase() || 'AUTO'} colorClass={pacingColor} valueClass={pacingColor} />}
                            <DataItem label="基准主题" value={pendingConfig.aesthetic?.id || '自发生成'} colorClass={aestheticColor} valueClass={aestheticColor} />
                            {isChain && <DataItem label="逻辑主轴" value={pendingConfig.mainAxis?.id || '自发生成'} colorClass={axisColor} valueClass={axisColor} />}
                            {isChain && <DataItem label="内核主旨" value={pendingConfig.motif?.id || '自发生成'} colorClass={motifColor} valueClass={motifColor} />}
                        </div>
                    </PreviewSection>
                    <PreviewSection title="运行时评估 | ENGINE" colorScheme="purple">
                        <div className="grid grid-cols-2 gap-5">
                            {isChain && <DataItem label="干预阶段" value={displayPhase} colorClass="text-purple-400" valueClass="text-purple-300" />}
                            <DataItem label="环境张力" value={isChain ? `${displayTension} 级` : `${displayTension}%`} colorClass="text-purple-400" valueClass="text-purple-300" />
                            <DataItem label="预设节点" value={`${displayNodeCount} 节点`} colorClass="text-purple-400" valueClass="text-purple-300" />
                            {isChain && <DataItem label="推进深度" value={`${Math.floor(displayProgress / 10)}%`} colorClass="text-purple-400" valueClass="text-purple-300" />}
                            {isChain && <DataItem label="伏笔注销预估" value={expectedPlotsText} colorClass="text-purple-400" valueClass="text-purple-300" />}
                        </div>
                    </PreviewSection>
                </div>

                <PreviewSection title="资产生成协议 | ASSET GENERATION" colorScheme="cyan">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {(['images', 'videos', 'audios'] as const).map(key => (
                            <button key={key} onClick={() => toggleAsset(key)} className={`p-8 border text-left transition-all ${assetsGen[key] ? 'border-cyan-500/60 bg-cyan-950/30' : 'border-cyan-900/30 bg-black/20 hover:border-cyan-700/50'}`}>
                                <div className="flex items-center gap-8">
                                    <div className={`w-8 h-8 border-2 rounded flex items-center justify-center transition-colors shrink-0 ${assetsGen[key] ? 'border-cyan-500 bg-cyan-500/20' : 'border-cyan-900/50'}`}>
                                        {assetsGen[key] && <div className="w-4 h-4 bg-cyan-400 rounded-sm shadow-[0_0_10px_rgba(34,211,238,0.8)]" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xl font-bold text-cyan-300">{key === 'images' ? '图像拓扑' : key === 'videos' ? '视觉推演' : '声纹捕获'}</div>
                                        <div className="text-sm text-cyan-700/60 font-mono mt-2">{key.toUpperCase()} GENERATION</div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </PreviewSection>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                    <div className="xl:col-span-3">
                        <PreviewSection title="对象遥测快照 | STATUS" colorScheme="amber">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                                <DataItem label="物理完整度(HP)" value={`${player.dynamic.hp}`} colorClass="text-amber-400" valueClass="text-amber-300" />
                                <DataItem label="认知屏障(SAN)" value={`${player.dynamic.sanity.toFixed(1)}`} colorClass="text-amber-400" valueClass="text-amber-300" />
                                <DataItem label="算力评级(LV)" value={player.dynamic.level} colorClass="text-amber-400" valueClass="text-amber-300" />
                            </div>
                        </PreviewSection>
                    </div>
                </div>

                {activePlots.length > 0 && (
                    <PreviewSection title={`逻辑纠缠 | PLOTS (${mainPlots.length} MAIN / ${sidePlots.length} SIDE)`} colorScheme="rose">
                        <div className="space-y-4 max-h-96 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-rose-900/50 scrollbar-track-transparent">
                            {activePlots.map(plot => (
                                <div key={plot.id} className="text-base p-6 bg-black/40 border border-rose-900/30 flex items-start gap-6 transition-colors hover:bg-rose-950/20 hover:border-rose-900/60">
                                    <span className="shrink-0 text-sm px-4 py-2 border border-rose-500/50 text-rose-400 font-mono">{plot.type === 'M' ? '主干' : '支流'}</span>
                                    <div className="flex-1 space-y-3">
                                        <div className="text-rose-200 leading-relaxed">{plot.content}</div>
                                        <div className="text-xs text-rose-800/80 font-mono">UID: {plot.id.slice(0, 8)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </PreviewSection>
                )}
            </div>

            {showPrompt && (
                <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-8 lg:p-16 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="relative w-full max-w-7xl h-[85vh] flex flex-col border border-purple-500/40 bg-[#0a0a15] shadow-2xl">
                        <div className="p-6 border-b border-purple-900/40 bg-[#0d0d1a] flex justify-between items-center shrink-0">
                            <h2 className="text-purple-400 font-bold tracking-widest text-lg">PROMPT_SEQUENCE_EXPORT</h2>
                            <button onClick={() => setShowPrompt(false)} className="text-purple-700 hover:text-purple-400 transition-colors p-2">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-8 scrollbar-thin scrollbar-thumb-purple-900/50 scrollbar-track-transparent">
                            <pre className="text-sm text-purple-300/80 font-mono leading-relaxed whitespace-pre-wrap select-all">{promptText}</pre>
                        </div>
                        <div className="p-6 border-t border-purple-900/40 bg-[#0d0d1a] flex justify-end gap-4 shrink-0">
                            <button onClick={() => { navigator.clipboard.writeText(promptText); AudioService.playSfx('success'); }} className="px-8 py-3 bg-purple-600/20 border border-purple-500/50 text-purple-300 text-sm font-bold uppercase hover:bg-purple-600/40 transition-colors">复制到剪贴板</button>
                            <button onClick={() => setShowPrompt(false)} className="px-8 py-3 border border-purple-900/50 text-purple-700 text-sm font-bold uppercase hover:text-purple-500 transition-colors">关闭</button>
                        </div>
                    </div>
                </div>
            )}
        </BaseModal>
    );
};

// ==========================================
// 5. 归档与历史管理面板
// ==========================================
interface LibraryPanelProps {
    narrativeLibrary: { arcs: Array<{ title: string; mainAxis: string; zoneCount: number }>; episodic: Array<{ id: string; name: string; timestamp: number }>; isLoading: boolean; };
    loadNarrativeLibrary: () => Promise<void>;
    deleteNarrativeArc: (arcId: string) => Promise<boolean>;
    deleteEpisodicZone: (zoneId: string) => Promise<boolean>;
    onLoadArc: (arcId: string, zoneId?: string) => void;
    onLoadEpisodic: (zoneId?: string) => void;
    onBack: () => void;
}

const LibraryPanel: React.FC<LibraryPanelProps> = ({ narrativeLibrary, loadNarrativeLibrary, deleteNarrativeArc, deleteEpisodicZone, onLoadArc, onLoadEpisodic, onBack }) => {
    const [activeTab, setActiveTab] = useState<'chain' | 'episodic'>('chain');

    useEffect(() => {
        loadNarrativeLibrary().catch(err => {
            console.error('[LibraryPanel] 加载叙事库失败:', err);
        });
    }, []); // 只在组件挂载时加载一次

    const groupedArcs = useMemo(() => narrativeLibrary.arcs.reduce((acc, arc) => {
        const axis = arc.mainAxis || '未定轨';
        if (!acc[axis]) acc[axis] = [];
        acc[axis].push(arc);
        return acc;
    }, {} as Record<string, Array<{ title: string; mainAxis: string; zoneCount: number }>>), [narrativeLibrary.arcs]);

    return (
        <BaseModal
            colorScheme="blue"
            title="记录阵列"
            subtitle="ARCHIVES"
            footerContent={<button onClick={onBack} className="px-10 py-3.5 border border-blue-900/50 text-blue-500 hover:text-blue-300 font-mono text-sm uppercase transition-all tracking-[0.2em] bg-black/40 hover:bg-blue-900/20 hover:border-blue-500/50">断开链接</button>}
        >
            <div className="flex gap-4 mb-10 border-b border-blue-900/30 pb-6">
                <button onClick={() => setActiveTab('chain')} className={`relative px-12 py-4 font-mono text-sm tracking-widest uppercase transition-all duration-300 overflow-hidden border-b-2 ${activeTab === 'chain' ? 'text-blue-300 font-bold border-blue-400 bg-blue-900/20' : 'text-blue-700/60 border-transparent hover:text-blue-400 hover:bg-blue-950/10'}`}>
                    <span className="relative z-10">长线链路 [CHAIN]</span>
                </button>
                <button onClick={() => setActiveTab('episodic')} className={`relative px-12 py-4 font-mono text-sm tracking-widest uppercase transition-all duration-300 overflow-hidden border-b-2 ${activeTab === 'episodic' ? 'text-blue-300 font-bold border-blue-400 bg-blue-900/20' : 'text-blue-700/60 border-transparent hover:text-blue-400 hover:bg-blue-950/10'}`}>
                    <span className="relative z-10">隔离单元 [EPISODIC]</span>
                </button>
            </div>

            {narrativeLibrary.isLoading ? (
                <div className="text-blue-600/60 font-mono text-xl text-center py-32 animate-pulse tracking-[0.5em]">读取中 (FETCHING)...</div>
            ) : activeTab === 'chain' ? (
                <div className="space-y-16">
                    {Object.entries(groupedArcs).map(([axis, arcs]) => (
                        <div key={axis} className="space-y-8">
                            <div className="flex items-center gap-4 border-b border-blue-900/30 pb-4">
                                <div className="w-2 h-2 bg-blue-600 rotate-45" />
                                <div className="text-xl font-bold text-blue-400 tracking-widest font-mono uppercase">{axis}</div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                                {arcs.map(arc => (
                                    <div key={arc.title} className="group relative p-8 border border-blue-900/40 bg-black/50 hover:bg-blue-950/30 hover:border-blue-500/60 transition-all duration-300 overflow-hidden flex flex-col h-full shadow-[inset_0_0_20px_rgba(59,130,246,0)] hover:shadow-[inset_0_0_20px_rgba(59,130,246,0.05),0_0_20px_rgba(59,130,246,0.1)] hover:-translate-y-1">
                                        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(59,130,246,0.02)_50%)] bg-[length:100%_4px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        <div className="relative z-10 flex-1 flex flex-col">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="text-xl text-blue-200 font-bold tracking-wider drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]">{arc.title}</div>
                                                <div className="text-[10px] px-2 py-1 bg-blue-950/60 border border-blue-800/60 text-blue-400 font-mono tracking-widest uppercase">ARC_DATA</div>
                                            </div>
                                            <div className="text-sm text-blue-600/80 font-mono mb-8 tracking-wide">拓扑深度: <span className="text-blue-300 font-bold ml-2">{arc.zoneCount}</span> <span className="text-blue-800/80">NODES</span></div>

                                            <div className="mt-auto flex gap-4 pt-6 border-t border-blue-900/30">
                                                <button onClick={() => onLoadArc(arc.title)} className="flex-1 py-3 bg-blue-900/20 border border-blue-500/40 text-blue-400 text-xs font-bold tracking-[0.2em] hover:bg-blue-600/30 hover:border-blue-400 hover:text-blue-200 transition-all uppercase">抽取载入</button>
                                                <button onClick={() => confirm('确认销毁该记录？不可逆。') && deleteNarrativeArc(arc.title)} className="px-5 py-3 bg-red-950/30 border border-red-900/40 text-red-500 text-xs font-bold tracking-[0.2em] hover:bg-red-900/50 hover:border-red-500 hover:text-red-300 transition-all uppercase">覆写</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {Object.keys(groupedArcs).length === 0 && <div className="text-center text-blue-800/40 font-mono py-32 text-xl tracking-[0.3em] uppercase">数据库空载 / DB_EMPTY</div>}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {narrativeLibrary.episodic.map(zone => (
                        <div key={zone.id} className="group relative p-8 border border-blue-900/40 bg-black/50 hover:bg-blue-950/30 hover:border-blue-500/60 transition-all duration-300 overflow-hidden flex flex-col h-full shadow-[inset_0_0_20px_rgba(59,130,246,0)] hover:shadow-[inset_0_0_20px_rgba(59,130,246,0.05),0_0_20px_rgba(59,130,246,0.1)] hover:-translate-y-1">
                            <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(59,130,246,0.02)_50%)] bg-[length:100%_4px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative z-10 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="text-xl text-blue-200 font-bold tracking-wider drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]">{zone.name}</div>
                                    <div className="text-[10px] px-2 py-1 bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 font-mono tracking-widest uppercase">EPO_DATA</div>
                                </div>
                                <div className="text-[11px] text-blue-600/80 font-mono mb-8 tracking-widest">STAMP: {zone.timestamp}</div>

                                <div className="mt-auto flex gap-4 pt-6 border-t border-blue-900/30">
                                    <button onClick={() => onLoadEpisodic(zone.id)} className="flex-1 py-3 bg-blue-900/20 border border-blue-500/40 text-blue-400 text-xs font-bold tracking-[0.2em] hover:bg-blue-600/30 hover:border-blue-400 hover:text-blue-200 transition-all uppercase">载入单元</button>
                                    <button onClick={() => confirm('确认销毁该隔离区？') && deleteEpisodicZone(zone.id)} className="px-5 py-3 bg-red-950/30 border border-red-900/40 text-red-500 text-xs font-bold tracking-[0.2em] hover:bg-red-900/50 hover:border-red-500 hover:text-red-300 transition-all uppercase">清除</button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {narrativeLibrary.episodic.length === 0 && <div className="col-span-full text-center text-blue-800/40 font-mono py-32 text-xl tracking-[0.3em] uppercase">无隔离区快照 / NO_SNAPSHOTS</div>}
                </div>
            )}
        </BaseModal>
    );
};

// ==========================================
// 6. 顶层入口暴露
// ==========================================
interface NarrativePanelProps {
    player: PlayerState;
    narrativeLibrary: { arcs: Array<{ title: string; mainAxis: string; zoneCount: number }>; episodic: Array<{ id: string; name: string; timestamp: number }>; isLoading: boolean; };
    loadNarrativeLibrary: () => Promise<void>;
    deleteNarrativeArc: (arcId: string) => Promise<boolean>;
    deleteEpisodicZone: (zoneId: string) => Promise<boolean>;
    narrativePreview: {
        params?: StoryConfig;
        activePlots: PlotPoint[];
        mainPlots: PlotPoint[];
        sidePlots: PlotPoint[];
        expectedPlotsText: string;
        analysis?: ChainNarrative['analysis'];
    };
    onComplete: (config: StoryConfig) => void;
    onCancel?: () => void;
    onLoadLibrary?: (type: 'chain' | 'episodic', identifier: string) => void;

    // 自建叙事库（恐怖域 / 元 / 美学）
    narrativeDomains: HorrorDomain[];
    narrativeAtoms: HorrorAtom[];
    narrativeAesthetics: HorrorAesthetic[];
    customNarrativeDomains: HorrorDomain[];
    customNarrativeAtoms: HorrorAtom[];
    customNarrativeAesthetics: HorrorAesthetic[];
    isNarrativeLibraryLoading: boolean;
    isNarrativeLibrarySaving: boolean;
    upsertNarrativeDomain: (draft: HorrorDomain, isNew: boolean) => Promise<NarrativeMutationResult>;
    upsertNarrativeAtom: (draft: HorrorAtom, isNew: boolean) => Promise<NarrativeMutationResult>;
    upsertNarrativeAesthetic: (draft: HorrorAesthetic, isNew: boolean) => Promise<NarrativeMutationResult>;
    removeNarrativeDomain: (id: string) => Promise<NarrativeMutationResult>;
    removeNarrativeAtom: (id: string) => Promise<NarrativeMutationResult>;
    removeNarrativeAesthetic: (id: string) => Promise<NarrativeMutationResult>;

    narrativeFlowStep: 'mode' | 'pacing' | 'aesthetic' | 'config' | 'details' | 'preview' | 'library' | 'closed';
    narrativeFlowPendingConfig: Partial<StoryConfig>;
    narrativeFlowEpisodicTension: number;
    narrativeFlowEpisodicNodeCount: number;
    narrativeFlowHasSuspendedArc: boolean;
    setNarrativeFlowStep: React.Dispatch<React.SetStateAction<'mode' | 'pacing' | 'aesthetic' | 'config' | 'details' | 'preview' | 'library' | 'closed'>>;
    setNarrativeFlowEpisodicTension: React.Dispatch<React.SetStateAction<number>>;
    setNarrativeFlowEpisodicNodeCount: React.Dispatch<React.SetStateAction<number>>;
    handleNarrativeFlowOpenLibrary: () => void;
    handleNarrativeFlowLoadFromLibrary: (type: 'chain' | 'episodic', identifier: string) => void;
    handleNarrativeFlowModeConfirm: (mode: NarrativeMode) => void;
    handleNarrativeFlowPacingConfirm: (pacing: NarrativePacing) => void;
    handleNarrativeFlowAestheticConfirm: (aesthetic: StoryConfig['aesthetic']) => void;
    handleNarrativeFlowConfigConfirm: (themeConfig: { motif: string; mainAxis: string }) => void;
    handleNarrativeFlowDetailsConfirm: () => void;
    handleNarrativeFlowPreviewConfirm: () => void;
    handleNarrativeFlowBack: () => void;
    handleNarrativeFlowCancel: () => void;
}

const NarrativePanel: React.FC<NarrativePanelProps> = ({
    player,
    narrativeLibrary,
    loadNarrativeLibrary,
    deleteNarrativeArc,
    deleteEpisodicZone,
    narrativePreview,
    narrativeDomains,
    narrativeAtoms,
    narrativeAesthetics,
    customNarrativeDomains,
    customNarrativeAtoms,
    customNarrativeAesthetics,
    isNarrativeLibraryLoading,
    isNarrativeLibrarySaving,
    upsertNarrativeDomain,
    upsertNarrativeAtom,
    upsertNarrativeAesthetic,
    removeNarrativeDomain,
    removeNarrativeAtom,
    removeNarrativeAesthetic,
    narrativeFlowStep,
    narrativeFlowPendingConfig,
    narrativeFlowEpisodicTension,
    narrativeFlowEpisodicNodeCount,
    setNarrativeFlowStep,
    setNarrativeFlowEpisodicTension,
    setNarrativeFlowEpisodicNodeCount,
    handleNarrativeFlowOpenLibrary,
    handleNarrativeFlowLoadFromLibrary,
    handleNarrativeFlowModeConfirm,
    handleNarrativeFlowPacingConfirm,
    handleNarrativeFlowAestheticConfirm,
    handleNarrativeFlowConfigConfirm,
    handleNarrativeFlowDetailsConfirm,
    handleNarrativeFlowPreviewConfirm,
    handleNarrativeFlowBack,
    handleNarrativeFlowCancel,
}) => {
    // 工作台是覆盖在流程之上的独立层：打开时保留当前步骤，关闭后回到原处。
    const [showStudio, setShowStudio] = useState(false);

    // 挂起弧线的玩家仍应能看到叙事面板（ModePanel 提供流程入口，
    // PacingPanel 会显示"恢复神经链接"路径）。历史实现此处 return null
    // 导致挂起后叙事面板整体不可见、恢复按钮成为死代码。

    const openStudio = () => {
        AudioService.playSfx('ui_click');
        setShowStudio(true);
    };

    const renderStep = () => {
        switch (narrativeFlowStep) {
            case 'mode': return <ModePanel onConfirm={handleNarrativeFlowModeConfirm} onCancel={handleNarrativeFlowCancel} onOpenLibrary={handleNarrativeFlowOpenLibrary} />;
            case 'pacing': return <PacingPanel player={player} onConfirm={handleNarrativeFlowPacingConfirm} onCancel={handleNarrativeFlowBack} />;
            case 'aesthetic': return (
                <AestheticPanel
                    aesthetics={narrativeAesthetics}
                    isLoading={isNarrativeLibraryLoading}
                    onConfirm={handleNarrativeFlowAestheticConfirm}
                    onOpenStudio={openStudio}
                    onCancel={handleNarrativeFlowBack}
                />
            );
            case 'config': return <ConfigPanel onConfirm={handleNarrativeFlowConfigConfirm} onCancel={handleNarrativeFlowBack} />;
            case 'details': return <DetailsPanel tension={narrativeFlowEpisodicTension} nodeCount={narrativeFlowEpisodicNodeCount} onTensionChange={setNarrativeFlowEpisodicTension} onNodeCountChange={setNarrativeFlowEpisodicNodeCount} onConfirm={handleNarrativeFlowDetailsConfirm} onCancel={handleNarrativeFlowBack} />;
            case 'preview': return (
                <PreviewPanel
                    player={player}
                    pendingConfig={narrativeFlowPendingConfig}
                    episodicTension={narrativeFlowEpisodicTension}
                    episodicNodeCount={narrativeFlowEpisodicNodeCount}
                    aesthetics={narrativeAesthetics}
                    narrativePreview={narrativePreview}
                    onConfirm={handleNarrativeFlowPreviewConfirm}
                    onCancel={handleNarrativeFlowBack}
                />
            );
            case 'library': return <LibraryPanel narrativeLibrary={narrativeLibrary} loadNarrativeLibrary={loadNarrativeLibrary} deleteNarrativeArc={deleteNarrativeArc} deleteEpisodicZone={deleteEpisodicZone} onLoadArc={(arcId) => handleNarrativeFlowLoadFromLibrary('chain', arcId)} onLoadEpisodic={(zoneId) => handleNarrativeFlowLoadFromLibrary('episodic', zoneId || '')} onBack={() => setNarrativeFlowStep('mode')} />;
            default: return null;
        }
    };

    return (
        <>
            {renderStep()}
            {showStudio && (
                <AestheticStudio
                    domains={narrativeDomains}
                    atoms={narrativeAtoms}
                    aesthetics={narrativeAesthetics}
                    customDomains={customNarrativeDomains}
                    customAtoms={customNarrativeAtoms}
                    customAesthetics={customNarrativeAesthetics}
                    isSaving={isNarrativeLibrarySaving}
                    onUpsertDomain={upsertNarrativeDomain}
                    onUpsertAtom={upsertNarrativeAtom}
                    onUpsertAesthetic={upsertNarrativeAesthetic}
                    onRemoveDomain={removeNarrativeDomain}
                    onRemoveAtom={removeNarrativeAtom}
                    onRemoveAesthetic={removeNarrativeAesthetic}
                    onClose={() => setShowStudio(false)}
                />
            )}
        </>
    );
};

export default NarrativePanel;
