import React, { useCallback, useEffect, useState } from 'react';
import {
    DotSoundType,
    ModelCategory,
    Settings,
    ShortSoundType, safeDeepClone
} from '../meta';
import { MODEL_PROVIDER, MODEL_REGISTRY } from '../constants/config';
import { AudioService, KeyService, PersistenceService } from '../services';
import type { PlatformHealthSnapshot } from '../services/KeyService';

//=============================================================================
// 音效自检清单（严格对应 type.ts 的 DotSoundType / ShortSoundType）
//=============================================================================
const DOT_SOUNDS: DotSoundType[] = [
    'typing_1', 'typing_2', 'typing_3', 'success', 'fail', 'error', 'search', 'unlock', 'lock',
    'item_pickup', 'item_use', 'item_equip', 'item_unequip', 'item_break',
    'ui_click', 'ui_hover', 'ui_transition', 'ui_notification', 'tactic_execute',
    'combat_miss', 'combat_graze', 'combat_hit', 'combat_crit', 'combat_block', 'combat_buff', 'combat_debuff',
    'event_npc_join', 'event_npc_leave',
];
const SHORT_SOUNDS: ShortSoundType[] = ['terrifying', 'node_transition', 'zone_enter'];

//=============================================================================
// 颜色样式表（全部为字面量类名，保证 Tailwind JIT 可收集）
//=============================================================================
interface ColorStyle {
    text: string;
    border: string;
    borderActive: string;
    bg: string;
    accent: string;
    glow: string;
    hoverText: string;
    focus: string;
}

const COLOR_STYLES: Record<string, ColorStyle> = {
    emerald: { text: 'text-emerald-400', border: 'border-emerald-500/50', borderActive: 'border-emerald-500', bg: 'bg-emerald-950/40', accent: 'accent-emerald-500', glow: 'shadow-[0_0_10px_rgba(16,185,129,0.3)]', hoverText: 'group-hover:text-emerald-400', focus: 'focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30' },
    teal: { text: 'text-teal-400', border: 'border-teal-500/50', borderActive: 'border-teal-500', bg: 'bg-teal-950/40', accent: 'accent-teal-500', glow: 'shadow-[0_0_10px_rgba(45,212,191,0.3)]', hoverText: 'group-hover:text-teal-400', focus: 'focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30' },
    sky: { text: 'text-sky-400', border: 'border-sky-500/50', borderActive: 'border-sky-500', bg: 'bg-sky-950/40', accent: 'accent-sky-500', glow: 'shadow-[0_0_10px_rgba(56,189,248,0.3)]', hoverText: 'group-hover:text-sky-400', focus: 'focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30' },
    blue: { text: 'text-blue-400', border: 'border-blue-500/50', borderActive: 'border-blue-500', bg: 'bg-blue-950/40', accent: 'accent-blue-500', glow: 'shadow-[0_0_10px_rgba(59,130,246,0.3)]', hoverText: 'group-hover:text-blue-400', focus: 'focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30' },
    purple: { text: 'text-purple-400', border: 'border-purple-500/50', borderActive: 'border-purple-500', bg: 'bg-purple-950/40', accent: 'accent-purple-500', glow: 'shadow-[0_0_10px_rgba(168,85,247,0.3)]', hoverText: 'group-hover:text-purple-400', focus: 'focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30' },
    amber: { text: 'text-amber-400', border: 'border-amber-500/50', borderActive: 'border-amber-500', bg: 'bg-amber-950/40', accent: 'accent-amber-500', glow: 'shadow-[0_0_10px_rgba(245,158,11,0.3)]', hoverText: 'group-hover:text-amber-400', focus: 'focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30' },
    orange: { text: 'text-orange-400', border: 'border-orange-500/50', borderActive: 'border-orange-500', bg: 'bg-orange-950/40', accent: 'accent-orange-500', glow: 'shadow-[0_0_10px_rgba(249,115,22,0.3)]', hoverText: 'group-hover:text-orange-400', focus: 'focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30' },
    red: { text: 'text-red-400', border: 'border-red-500/50', borderActive: 'border-red-500', bg: 'bg-red-950/40', accent: 'accent-red-500', glow: 'shadow-[0_0_10px_rgba(239,68,68,0.3)]', hoverText: 'group-hover:text-red-400', focus: 'focus:border-red-500 focus:ring-1 focus:ring-red-500/30' },
    cyan: { text: 'text-cyan-400', border: 'border-cyan-500/50', borderActive: 'border-cyan-500', bg: 'bg-cyan-950/40', accent: 'accent-cyan-500', glow: 'shadow-[0_0_10px_rgba(6,182,212,0.3)]', hoverText: 'group-hover:text-cyan-400', focus: 'focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30' },
};

const styleOf = (colorClass?: string): ColorStyle => COLOR_STYLES[colorClass ?? 'emerald'] ?? COLOR_STYLES.emerald;

const PROVIDER_COLORS: Record<string, string> = {
    groq: 'orange', zhipu: 'purple', pollinations: 'emerald',
    deapi: 'red', qwenstudio: 'amber',
    volcengine: 'red', nvidia: 'teal',
};

//=============================================================================
// 基础 UI 构件
//=============================================================================
const CornerAccents = () => (
    <>
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-zinc-500/50 z-20 pointer-events-none" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-zinc-500/50 z-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-zinc-500/50 z-20 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-zinc-500/50 z-20 pointer-events-none" />
    </>
);

const TabButton = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
    <button
        onClick={() => { AudioService.playSfx('ui_click'); onClick(); }}
        className={`relative flex-1 py-4 text-[11px] uppercase tracking-[0.2em] font-bold transition-all duration-300 overflow-hidden ${active ? 'text-emerald-400 bg-emerald-950/20' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'}`}
    >
        {label}
        {active && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
        <div className={`absolute left-0 bottom-0 h-full w-[1px] bg-gradient-to-t from-emerald-500/0 via-emerald-500/50 to-emerald-500/0 transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0'}`} />
    </button>
);

interface ModelSelectorProps {
    label: string;
    /** 选项池来源的模型大类（记忆模型复用 npcDialogue 池） */
    optionsCategory: ModelCategory;
    current?: { provider: string; model: string };
    colorClass?: string;
    onChange: (value: { provider: string; model: string }) => void;
}

const ModelSelector = ({ label, optionsCategory, current, colorClass, onChange }: ModelSelectorProps) => {
    const style = styleOf(colorClass);
    const modelOptions = MODEL_REGISTRY[optionsCategory] as Array<{ provider: string; model: string }>;
    const grouped = modelOptions.reduce<Record<string, typeof modelOptions>>((acc, opt) => {
        (acc[opt.provider] ??= []).push(opt);
        return acc;
    }, {});

    return (
        <div className="mb-6 group">
            <label className="flex items-center text-[10px] text-zinc-400 font-bold uppercase tracking-[0.15em] mb-2 pl-2 border-l-2 border-zinc-700 group-hover:border-zinc-500 transition-all">
                {label}
            </label>
            <div className="space-y-1">
                {Object.entries(grouped).map(([providerId, options]) => (
                    <div key={providerId}>
                        <div className="text-[9px] text-zinc-600 uppercase tracking-[0.2em] font-bold px-2 py-1 border-b border-zinc-800/40">
                            ▸ {providerId}
                        </div>
                        <div className="bg-black/40 border border-zinc-800/60 p-0.5 rounded-sm">
                            {options.map((opt) => {
                                const isActive = current?.provider === opt.provider && current?.model === opt.model;
                                return (
                                    <button
                                        key={`${opt.provider}:${opt.model}`}
                                        onClick={() => onChange({ provider: opt.provider, model: opt.model })}
                                        className={`relative w-full px-3 py-1.5 text-left text-[11px] font-mono transition-all duration-200 flex justify-between items-center group/btn
                                            ${isActive ? `${style.text} ${style.bg} border-l-2 ${style.borderActive} ${style.glow}`
                                                : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 border-l-2 border-transparent'}`}
                                    >
                                        <span className="tracking-wider z-10">{opt.model}</span>
                                        {isActive
                                            ? <span className="text-[9px] opacity-90 animate-pulse font-bold tracking-widest z-10">● ACTV</span>
                                            : <span className="text-[9px] opacity-0 group-hover/btn:opacity-50 transition-opacity z-10 tracking-widest">SELECT</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface RangeSliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    colorClass?: string;
    displayValue?: string;
    onChange: (value: number) => void;
}

const RangeSlider = ({ label, value, min, max, step, colorClass, displayValue, onChange }: RangeSliderProps) => {
    const style = styleOf(colorClass);
    return (
        <div className="group mb-4 last:mb-0 bg-black/20 p-3 border border-zinc-800/40 rounded-sm hover:border-zinc-700/60 transition-colors">
            <div className="flex justify-between items-center mb-2">
                <label className={`text-[10px] text-zinc-400 font-bold uppercase tracking-wider transition-colors ${style.hoverText}`}>
                    {label}
                </label>
                <div className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm bg-black/50 border border-zinc-800 ${style.text}`}>
                    {displayValue ?? value}
                </div>
            </div>
            <input
                type="range" min={min} max={max} step={step} value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className={`w-full h-1.5 bg-zinc-900 appearance-none cursor-pointer rounded-full ${style.accent} outline-none focus:ring-1 ring-offset-1 ring-offset-zinc-950 focus:ring-zinc-700`}
            />
        </div>
    );
};

const ToggleRow = ({ checked, label, desc, onChange }: { checked: boolean; label: string; desc?: string; onChange: (v: boolean) => void }) => (
    <button
        type="button"
        onClick={() => { AudioService.playSfx('ui_click'); onChange(!checked); }}
        className="w-full flex items-center justify-between gap-4 text-left group/toggle py-1"
    >
        <div>
            <div className="text-[11px] text-zinc-300 font-bold tracking-wider group-hover/toggle:text-white transition-colors">{label}</div>
            {desc && <div className="text-[9px] text-zinc-600 font-mono mt-1 leading-relaxed">{desc}</div>}
        </div>
        <div className={`shrink-0 w-10 h-5 border flex items-center px-0.5 transition-all duration-300 ${checked ? 'bg-emerald-950/60 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.35)]' : 'bg-black/60 border-zinc-700'}`}>
            <div className={`w-3.5 h-3.5 transition-all duration-300 ${checked ? 'translate-x-5 bg-emerald-400' : 'translate-x-0 bg-zinc-600'}`} />
        </div>
    </button>
);

/** 底部遥测读数：独立状态 + 定时驱动，与主状态解耦 */
const TelemetryReadout = () => {
    const [mem, setMem] = useState(34);
    const [cpu, setCpu] = useState(17);
    useEffect(() => {
        const timer = window.setInterval(() => {
            setMem(Math.round(20 + Math.random() * 40));
            setCpu(Math.round(10 + Math.random() * 30));
        }, 2200);
        return () => window.clearInterval(timer);
    }, []);
    return (
        <div className="flex gap-8">
            <div className="flex flex-col gap-1">
                <span className="text-zinc-600 tracking-widest">MEM_ALLOC</span>
                <span className="text-zinc-300 font-bold transition-all">{mem}%</span>
            </div>
            <div className="flex flex-col gap-1">
                <span className="text-zinc-600 tracking-widest">CPU_LOAD</span>
                <span className="text-zinc-300 font-bold transition-all">{cpu}%</span>
            </div>
            <div className="flex flex-col gap-1">
                <span className="text-zinc-600 tracking-widest">NET_STATUS</span>
                <span className="text-emerald-500 font-bold animate-pulse">SECURE_LINK</span>
            </div>
        </div>
    );
};

//=============================================================================
// 主面板
//=============================================================================
interface SettingsPanelProps {
    settings: Settings;
    onUpdate: (newSettings: Settings) => void;
    onClose: () => void;
    isFullscreen?: boolean;
    onSaveGame?: (saveName?: string) => Promise<string | null>;
    onLoadGame?: (fileName: string) => Promise<boolean>;
    onListSaves?: () => Promise<Array<{ name: string; size: number; modified: string }>>;
    onDeleteSave?: (fileName: string) => Promise<boolean>;
}

type TabId = 'uplink' | 'cortex' | 'balance' | 'visual' | 'audio' | 'saves';
type MsgType = 'success' | 'error' | 'warning';
type MixParams = ReturnType<typeof AudioService.getMixParams>;

interface SliderDef { label: string; k: string; min: number; max: number; step: number; }

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    settings, onUpdate, onClose, isFullscreen = false,
    onSaveGame, onLoadGame, onListSaves, onDeleteSave,
}) => {
    const fileSystemReady = PersistenceService.isReady;
    const [msg, setMsg] = useState<{ text: string; type: MsgType } | null>(null);
    const [activeTab, setActiveTab] = useState<TabId>('uplink');
    const [audioParams, setAudioParams] = useState<MixParams>(AudioService.getMixParams());
    const [savesList, setSavesList] = useState<Array<{ name: string; size: number; modified: string }>>([]);
    const [saveName, setSaveName] = useState('');
    const [health, setHealth] = useState<PlatformHealthSnapshot[]>([]);
    const [keyStrings, setKeyStrings] = useState<Record<string, string>>(() => {
        const init: Record<string, string> = {};
        for (const p of MODEL_PROVIDER) {
            if (p.keyField) {
                init[p.keyField] = (((settings as unknown as Record<string, unknown>)[p.keyField] as string[] | undefined) ?? []).join('\n');
            }
        }
        return init;
    });

    useEffect(() => {
        if (activeTab === 'saves' && onListSaves && fileSystemReady) {
            onListSaves().then(setSavesList);
        }
    }, [activeTab, onListSaves, fileSystemReady]);

    useEffect(() => {
        if (activeTab !== 'uplink') return;
        const update = () => setHealth(KeyService.getAllHealth());
        update();
        const timer = window.setInterval(update, 3000);
        return () => window.clearInterval(timer);
    }, [activeTab]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { e.preventDefault(); onClose(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // --- 核心更新逻辑 ---
    const showMsg = (text: string, type: MsgType) => {
        setMsg({ text, type });
        window.setTimeout(() => setMsg(null), 3000);
    };

    const dispatchUpdate = useCallback((newSettings: Settings) => {
        onUpdate(newSettings);
        localStorage.setItem('THE_ZONE_CONFIG', JSON.stringify(newSettings));
    }, [onUpdate]);

    const handleChange = useCallback((key: keyof Settings, value: Settings[keyof Settings]) => {
        dispatchUpdate({ ...settings, [key]: value });
    }, [settings, dispatchUpdate]);

    const handleKeyStrChange = (field: string, value: string) => {
        setKeyStrings(prev => ({ ...prev, [field]: value }));
        const keys = value.split('\n').map(s => s.trim()).filter(Boolean);
        dispatchUpdate({ ...settings, [field]: keys } as Settings);
    };

    const handleNestedChange = (categoryPath: string, key: string, value: number) => {
        const next = safeDeepClone(settings);
        let target: Record<string, unknown> = next.gameConfig as unknown as Record<string, unknown>;
        for (const part of categoryPath.split('.')) {
            if (typeof target[part] !== 'object' || target[part] === null) target[part] = {};
            target = target[part] as Record<string, unknown>;
        }
        target[key] = value;
        dispatchUpdate(next);
    };

    const resolveConfig = (path: string): Record<string, number> | undefined => {
        let node: unknown = settings.gameConfig;
        for (const part of path.split('.')) {
            if (typeof node !== 'object' || node === null) return undefined;
            node = (node as Record<string, unknown>)[part];
        }
        return node as Record<string, number> | undefined;
    };

    // --- 存档操作 ---
    const refreshSaves = async () => {
        if (!onListSaves) return;
        AudioService.playSfx('ui_click');
        setSavesList(await onListSaves());
    };

    const handleSave = async () => {
        if (!onSaveGame) return;
        AudioService.playSfx('ui_click');
        const name = await onSaveGame(saveName.trim() || undefined);
        if (name) {
            showMsg(`记忆已刻录 → ${name}`, 'success');
            setSaveName('');
            if (onListSaves) setSavesList(await onListSaves());
        } else {
            showMsg('刻录失败 / 操作已取消', 'error');
        }
    };

    const handleLoad = async (fileName: string) => {
        if (!onLoadGame) return;
        AudioService.playSfx('ui_click');
        const ok = await onLoadGame(fileName);
        if (ok) { showMsg('记忆唤醒成功', 'success'); onClose(); }
        else showMsg('唤醒失败：档案已损坏', 'error');
    };

    const handleDelete = async (fileName: string) => {
        if (!onDeleteSave) return;
        if (!window.confirm(`即将擦除档案 "${fileName}"，无法恢复。确认执行？`)) return;
        const ok = await onDeleteSave(fileName);
        if (ok) {
            showMsg('档案已擦除', 'warning');
            if (onListSaves) setSavesList(await onListSaves());
        }
    };

    const rehandshake = () => {
        KeyService.registerFromSettings(settings);
        KeyService.resetAllRounds();
        setHealth(KeyService.getAllHealth());
        showMsg('神经干线握手完成 / 校验已启动', 'success');
    };

    // --- 各 Tab 渲染区 ---
    const renderUplinkTab = () => {
        const configured = health.filter(s => s.totalKeys > 0);
        const unconfigured = health.filter(s => s.totalKeys === 0);
        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Keys 区域 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {MODEL_PROVIDER.filter(p => p.keyField).map(({ id, keyField }) => {
                        const style = styleOf(PROVIDER_COLORS[id]);
                        return (
                            <div key={id} className="relative group">
                                <label className={`block text-[10px] text-zinc-500 mb-2 font-bold tracking-widest transition-colors flex items-center gap-2 ${style.hoverText}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${style.bg} group-hover:animate-pulse`} />
                                    {id} KEYS
                                </label>
                                <textarea
                                    rows={3}
                                    value={keyStrings[keyField] ?? ''}
                                    onChange={(e) => handleKeyStrChange(keyField, e.target.value)}
                                    className={`w-full bg-black/40 border border-zinc-800/80 rounded-sm py-3 px-4 text-[11px] font-mono tracking-widest focus:outline-none focus:bg-zinc-900/60 ${style.text} ${style.focus} placeholder-zinc-800 resize-y min-h-[4rem] transition-all`}
                                    placeholder=":: 隐秘注入通道 / 每行一个秘钥 ::"
                                />
                            </div>
                        );
                    })}
                </div>

                {/* 代理与基址 */}
                <div className="bg-zinc-900/30 border border-zinc-800/50 p-5 rounded-sm">
                    <div className="relative group mb-6">
                        <label className="block text-[10px] text-zinc-500 mb-2 font-bold group-hover:text-blue-400 tracking-widest uppercase flex items-center gap-2">
                            <span className="text-blue-500">⇄</span> 反代基址 (Proxy Base)
                        </label>
                        <input
                            type="text" value={settings.ProxyBase ?? ''}
                            onChange={(e) => handleChange('ProxyBase', e.target.value)}
                            className="w-full bg-black/50 border border-zinc-800/80 py-2.5 px-4 text-[11px] font-mono tracking-widest focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 text-blue-300 rounded-sm"
                            placeholder=":: https://api.example.com ::"
                        />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {MODEL_PROVIDER.filter(p => p.proxyField).map(({ id, proxyField }) => {
                            const isChecked = proxyField && (settings as unknown as Record<string, unknown>)[proxyField] !== false;
                            return (
                                <div key={id} className="flex items-center gap-3 group cursor-pointer" onClick={() => proxyField && handleChange(proxyField as keyof Settings, !isChecked)}>
                                    <div className={`w-4 h-4 border flex items-center justify-center transition-all ${isChecked ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]' : 'bg-black/50 border-zinc-700'}`}>
                                        {isChecked && <div className="w-2 h-2 bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.8)]" />}
                                    </div>
                                    <span className={`text-[10px] uppercase font-bold tracking-wider transition-colors ${isChecked ? 'text-blue-300' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                                        代理 {id}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 健康监控 */}
                <div className="pt-4">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4 flex justify-between items-end border-b border-zinc-800/60 pb-2">
                        <span className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                            神经节点健康监控 (LIVE)
                        </span>
                        <button onClick={rehandshake} className="text-emerald-500 hover:text-emerald-300 transition-colors tracking-[0.2em]">
                            [ 重新握手并校验 ]
                        </button>
                    </div>
                    {configured.length === 0 ? (
                        <div className="text-center py-10 text-zinc-600 text-[11px] font-mono tracking-widest opacity-60">
                            ⊘ 尚未注入任何神经干线秘钥
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {configured.map((snapshot) => (
                                <div key={snapshot.platform} className="bg-black/30 border border-zinc-800/60 p-4 rounded-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-zinc-800/20 to-transparent pointer-events-none" />
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-widest group-hover:text-white transition-colors">{snapshot.platform}</span>
                                        <span className={`text-[9px] px-2 py-1 border font-bold tracking-widest ${snapshot.availableKeys > 0 ? 'border-emerald-900 bg-emerald-950/50 text-emerald-400' : 'border-red-900 bg-red-950/50 text-red-400 animate-pulse'}`}>
                                            {snapshot.availableKeys} / {snapshot.totalKeys} ONLINE
                                        </span>
                                    </div>
                                    <div className="space-y-2.5">
                                        {snapshot.keys.map((key, idx) => (
                                            <div key={idx} className="flex items-center gap-3 text-[10px] font-mono bg-zinc-950/50 p-1.5 rounded-sm border border-zinc-900/50">
                                                <div className={`w-1.5 h-1.5 rounded-full shadow-sm shrink-0 ${key.status === 'active' ? 'bg-emerald-500 shadow-emerald-500/50' : key.status === 'cooldown' ? 'bg-amber-500 shadow-amber-500/50 animate-pulse' : 'bg-red-600 shadow-red-600/50'}`} />
                                                <span className="text-zinc-500 shrink-0 tracking-wider">{key.maskedKey}</span>
                                                <div className="flex-1 border-t border-dashed border-zinc-800" />
                                                <span className="text-zinc-400 min-w-[60px] text-right">
                                                    <span className="text-emerald-500/80">{key.totalSuccesses}</span> / <span className="text-red-500/80">{key.totalFailures}</span>
                                                </span>
                                                {key.status === 'cooldown' && <span className="text-amber-500 text-[9px] min-w-[40px] text-right tracking-widest animate-pulse">CD</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {unconfigured.length > 0 && (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <span className="text-[9px] text-zinc-600 tracking-widest uppercase">未配置通道 //</span>
                            {unconfigured.map(s => (
                                <span key={s.platform} className="text-[9px] font-mono text-zinc-700 border border-zinc-800/60 px-2 py-0.5 rounded-sm tracking-widest">
                                    {s.platform}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderCortexTab = () => (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                <div className="space-y-2">
                    <div className="text-[10px] text-emerald-500/50 uppercase tracking-[0.3em] font-bold mb-4 flex items-center gap-2">
                        <div className="h-[1px] flex-1 bg-emerald-900/50" />
                        核心逻辑中枢
                        <div className="h-[1px] flex-1 bg-emerald-900/50" />
                    </div>
                    <ModelSelector label="世界构建" optionsCategory="world" current={settings.zoneModel} colorClass="emerald" onChange={(v) => handleChange('zoneModel', v)} />
                    <ModelSelector label="实体心智" optionsCategory="npcDialogue" current={settings.npcDialogueModel} colorClass="teal" onChange={(v) => handleChange('npcDialogueModel', v)} />
                    <ModelSelector label="即时反射" optionsCategory="npcReaction" current={settings.npcReactionModel} colorClass="teal" onChange={(v) => handleChange('npcReactionModel', v)} />
                    <ModelSelector label="动态叙事" optionsCategory="dyNarrative" current={settings.dyNarrativeModel} colorClass="teal" onChange={(v) => handleChange('dyNarrativeModel', v)} />
                    <ModelSelector label="庇护所事件" optionsCategory="sanctuaryEvent" current={settings.sanctuaryEventModel} colorClass="teal" onChange={(v) => handleChange('sanctuaryEventModel', v)} />
                    <ModelSelector label="设施升级定价" optionsCategory="facilityUpgrade" current={settings.facilityUpgradeModel} colorClass="teal" onChange={(v) => handleChange('facilityUpgradeModel', v)} />
                </div>
                <div className="space-y-2">
                    <div className="text-[10px] text-purple-500/50 uppercase tracking-[0.3em] font-bold mb-4 flex items-center gap-2">
                        <div className="h-[1px] flex-1 bg-purple-900/50" />
                        多模态皮层
                        <div className="h-[1px] flex-1 bg-purple-900/50" />
                    </div>
                    <ModelSelector label="视觉皮层" optionsCategory="image" current={settings.imageModel} colorClass="blue" onChange={(v) => handleChange('imageModel', v)} />
                    <ModelSelector label="幻觉重影" optionsCategory="video" current={settings.videoModel} colorClass="purple" onChange={(v) => handleChange('videoModel', v)} />
                    <ModelSelector label="听觉回响" optionsCategory="speech" current={settings.speechModel} colorClass="amber" onChange={(v) => handleChange('speechModel', v)} />

                    <div className="text-[10px] text-teal-500/50 uppercase tracking-[0.3em] font-bold mb-4 mt-8 flex items-center gap-2">
                        <div className="h-[1px] flex-1 bg-teal-900/50" />
                        记忆整合引擎
                        <div className="h-[1px] flex-1 bg-teal-900/50" />
                    </div>
                    <ModelSelector label="短期记忆摘要 (δ)" optionsCategory="npcDialogue" current={settings.npcMemorySummaryModel} colorClass="teal" onChange={(v) => handleChange('npcMemorySummaryModel', v)} />
                    <ModelSelector label="长期记忆整合 (γ/β/α)" optionsCategory="npcDialogue" current={settings.npcMemoryConsolidationModel} colorClass="teal" onChange={(v) => handleChange('npcMemoryConsolidationModel', v)} />
                    <RangeSlider
                        label="对话切片长度 (δ 摘要触发)" min={5} max={100} step={5} colorClass="purple"
                        value={settings.dialogueSliceLength} displayValue={`${settings.dialogueSliceLength} 轮`}
                        onChange={(v) => handleChange('dialogueSliceLength', v)}
                    />
                </div>
            </div>
        </div>
    );

    const renderBalanceTab = () => {
        const createGroup = (title: string, color: string, categoryPath: string, configs: SliderDef[]) => {
            const style = styleOf(color);
            const configData = resolveConfig(categoryPath);
            return (
                <div className="p-5 bg-black/40 border border-zinc-800/60 rounded-sm relative group overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1 h-full ${style.bg} opacity-20 group-hover:opacity-50 transition-opacity`} />
                    <h4 className={`text-[11px] ${style.text} font-bold uppercase tracking-widest mb-5 flex items-center gap-2`}>
                        <span className="text-[14px]">⟡</span> {title}
                    </h4>
                    <div className="space-y-1">
                        {configs.map(c => (
                            <RangeSlider key={c.k} label={c.label} min={c.min} max={c.max} step={c.step} colorClass={color}
                                value={configData?.[c.k] ?? c.min}
                                onChange={(val) => handleNestedChange(categoryPath, c.k, val)}
                            />
                        ))}
                    </div>
                </div>
            );
        };

        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* 第一列：生存压力与交互 */}
                <div className="space-y-6">
                    {createGroup('遭遇机率校准', 'orange', 'enemyEncounter', [
                        { label: '基础遭遇概率', k: 'baseChance', min: 0, max: 0.5, step: 0.01 },
                        { label: '威胁度除数 (分母)', k: 'threatDivisor', min: 1, max: 200, step: 1 },
                        { label: '搜查基础风险', k: 'searchBaseRisk', min: 0, max: 0.2, step: 0.01 },
                        { label: '每搜查增加风险', k: 'searchRiskPerCount', min: 0, max: 0.1, step: 0.01 },
                        { label: '疲劳惩罚系数', k: 'fatiguePenaltyFactor', min: 0, max: 1, step: 0.05 },
                    ])}
                    {createGroup('体征预警与危机阈值', 'red', 'social.vitals', [
                        { label: '理智危机阈值', k: 'sanityCritical', min: 0, max: 100, step: 1 },
                        { label: '低理智预警', k: 'sanityLow', min: 0, max: 100, step: 1 },
                        { label: '高理智状态', k: 'sanityHigh', min: 0, max: 100, step: 1 },
                        { label: '高生命值判定', k: 'hpHigh', min: 0, max: 1, step: 0.05 },
                        { label: '中等生命值判定', k: 'hpMedium', min: 0, max: 1, step: 0.05 },
                    ])}
                    {createGroup('疲劳阈值警戒线', 'amber', 'fatigueThresholds', [
                        { label: '高危疲劳系数', k: 'highWarning', min: 1, max: 3, step: 0.1 },
                        { label: '中等疲劳系数', k: 'medium', min: 0.5, max: 2, step: 0.1 },
                        { label: '低疲劳基准线', k: 'low', min: 0.1, max: 1, step: 0.1 },
                    ])}
                    {createGroup('神经感知权重', 'sky', 'perceptionWeights', [
                        { label: '感知属性影响权重', k: 'basePerception', min: 0, max: 10, step: 1 },
                        { label: '搜查次数累计权重', k: 'searchCount', min: 0, max: 10, step: 1 },
                        { label: '敏捷闪避权重', k: 'agility', min: 0, max: 10, step: 1 },
                    ])}
                </div>

                {/* 第二列：资源消耗与阈值 */}
                <div className="space-y-6">
                    {createGroup('行动能量损耗', 'emerald', 'searchCosts', [
                        { label: '基础理智消耗', k: 'baseSanity', min: 0, max: 5, step: 0.1 },
                        { label: '基础体力消耗', k: 'baseStamina', min: 0, max: 5, step: 0.1 },
                        { label: '基础精力消耗', k: 'baseVigor', min: 0, max: 5, step: 0.1 },
                        { label: '疲劳补偿基数', k: 'fatigueBase', min: 0.5, max: 2.0, step: 0.1 },
                        { label: '体力疲劳因子', k: 'staminaFatigueFactor', min: 0, max: 1, step: 0.05 },
                        { label: '精力疲劳因子', k: 'vigorFatigueFactor', min: 0, max: 1, step: 0.05 },
                    ])}
                    {createGroup('搜查修正系数', 'sky', 'searchCosts', [
                        { label: '智慧抗性因子', k: 'wisdomFactor', min: 0, max: 0.2, step: 0.005 },
                        { label: '感知修正因子', k: 'perceptionFactor', min: 0, max: 0.2, step: 0.005 },
                        { label: '智慧恢复因子', k: 'wisdomRecoveryFactor', min: 0, max: 0.2, step: 0.005 },
                        { label: '侦查补正 (Scout)', k: 'scoutBonus', min: 0, max: 20, step: 1 },
                    ])}
                    <div className="p-5 bg-black/40 border border-zinc-800/60 rounded-sm relative group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-red-950/40 opacity-20 group-hover:opacity-50 transition-opacity" />
                        <h4 className="text-[11px] text-red-400 font-bold uppercase tracking-widest mb-5 flex items-center gap-2">
                            <span className="text-[14px]">△</span> 综合负担参数
                        </h4>
                        <div className="space-y-1">
                            <RangeSlider label="移动体力消耗" min={0} max={10} step={1} colorClass="red" value={settings.gameConfig.movementCosts.baseStamina} onChange={(v) => handleNestedChange('movementCosts', 'baseStamina', v)} />
                            <RangeSlider label="移动理智消耗" min={0} max={10} step={1} colorClass="red" value={settings.gameConfig.movementCosts.baseSanity} onChange={(v) => handleNestedChange('movementCosts', 'baseSanity', v)} />
                            <RangeSlider label="提示消耗理智" min={0} max={10} step={1} colorClass="red" value={settings.gameConfig.hintCosts.sanityCost} onChange={(v) => handleNestedChange('hintCosts', 'sanityCost', v)} />
                        </div>
                    </div>
                    {createGroup('探索发现阈值', 'cyan', 'discoveryThresholds', [
                        { label: '高发现概率阈值', k: 'high', min: 0, max: 20, step: 1 },
                        { label: '中发现概率阈值', k: 'medium', min: 0, max: 20, step: 1 },
                        { label: '低发现概率阈值', k: 'low', min: 0, max: 20, step: 1 },
                    ])}
                    {createGroup('重复搜查阈值', 'cyan', 'searchThresholds', [
                        { label: '重复枯燥警告', k: 'repetitiveWarning', min: 1, max: 10, step: 1 },
                        { label: '最大有效搜查', k: 'maxEffective', min: 1, max: 20, step: 1 },
                    ])}
                </div>

                {/* 第三列：社交、战斗与机制限制 */}
                <div className="space-y-6">
                    {createGroup('社交关系平衡 (信任 / 好感)', 'purple', 'social.thresholds', [
                        { label: '长盟边界 (trustHigh)', k: 'trustHigh', min: 0, max: 100, step: 1 },
                        { label: '浅合边界 (trustMedium)', k: 'trustMedium', min: 0, max: 100, step: 1 },
                        { label: '审慎边界 (trustLow)', k: 'trustLow', min: 0, max: 100, step: 1 },
                        { label: '防备边界 (trustVeryLow)', k: 'trustVeryLow', min: 0, max: 100, step: 1 },
                        { label: '最小信任阈值 (trustMinimal)', k: 'trustMinimal', min: 0, max: 100, step: 1 },
                        { label: '初始默认信任 (trustDefault)', k: 'trustDefault', min: 0, max: 100, step: 1 },
                        { label: '信任 / 好感上限 (trustMax)', k: 'trustMax', min: 0, max: 100, step: 1 },
                        { label: '信任下限 (trustMin)', k: 'trustMin', min: 0, max: 100, step: 1 },
                    ])}
                    {createGroup('行为交互收益 (增益/损耗)', 'amber', 'social.benefits', [
                        { label: '高级拥抱理智增益', k: 'hugSanityGainHigh', min: 0, max: 50, step: 1 },
                        { label: '低级拥抱理智增益', k: 'hugSanityGainLow', min: 0, max: 50, step: 1 },
                        { label: '拥抱信任惩罚', k: 'hugTrustPenalty', min: 0, max: 20, step: 1 },
                        { label: '安慰信任增益', k: 'comfortTrustGain', min: 0, max: 20, step: 1 },
                        { label: '治疗信任增益', k: 'healTrustGain', min: 0, max: 30, step: 1 },
                        { label: '默认治疗值', k: 'healValueDefault', min: 0, max: 100, step: 1 },
                        { label: '亲密信任增益', k: 'intimacyTrustGain', min: 0, max: 50, step: 1 },
                        { label: '亲密理智增益 (NPC)', k: 'intimacySanityGain', min: 0, max: 100, step: 1 },
                        { label: '亲密理智增益 (玩家)', k: 'intimacyPlayerSanityGain', min: 0, max: 100, step: 1 },
                        { label: '基础赠礼信任', k: 'giftTrustBase', min: 0, max: 50, step: 1 },
                        { label: '稀有赠礼信任', k: 'giftTrustRare', min: 0, max: 100, step: 1 },
                        { label: '史诗赠礼信任', k: 'giftTrustEpic', min: 0, max: 200, step: 1 },
                        { label: '消耗品赠礼加成', k: 'giftTrustConsumableBonus', min: 0, max: 50, step: 1 },
                    ])}
                    <div className="p-5 bg-black/40 border border-zinc-800/60 rounded-sm relative group overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-red-950/40 opacity-20 group-hover:opacity-50 transition-opacity" />
                        <h4 className="text-[11px] text-red-400 font-bold uppercase tracking-widest mb-5 flex items-center gap-2">
                            <span className="text-[14px]">■</span> 战斗规则
                        </h4>
                        <ToggleRow
                            checked={settings.accumulateCounterEnabled}
                            onChange={(v) => handleChange('accumulateCounterEnabled', v)}
                            label="敌方蓄反询问"
                            desc="允许引擎在敌方与任意角色的蓄反值达 5n 时向敌方发起询问：消耗 5n 点蓄反值、预支 n 点行动力（与差反共享单回合预支额度，加值合计不超过其行动点基础值与当前行动点之和），换得可用 n 点行动点的立即行动窗口（行动按自身消耗扣减）。有利有弊，默认建议关闭；当前敌方决策恒为拒绝，待接入 LLM 后真正生效。"
                        />
                        <ToggleRow
                            checked={settings.differentialCounterEnabled}
                            onChange={(v) => handleChange('differentialCounterEnabled', v)}
                            label="敌方差反询问"
                            desc="允许引擎在遭攻击时向速度不小于 10 的敌方发起差反询问：由其自选预支 2n 点行动力（与蓄反共享单回合预支额度，加值合计不超过其行动点基础值与当前行动点之和），换得可用 n 点行动点的立即行动窗口（行动按自身消耗扣减）。有利有弊，默认建议关闭；当前敌方决策恒为拒绝，待接入 LLM 后真正生效。"
                        />
                    </div>
                    {createGroup('媒体信号加载延迟 (ms)', 'blue', 'mediaLoading', [
                        { label: '遭遇实体生成延迟', k: 'enemySpawnDelay', min: 0, max: 5000, step: 100 },
                        { label: '搜查实体生成延迟', k: 'searchEnemySpawnDelay', min: 0, max: 5000, step: 100 },
                        { label: '解谜失败惩罚延迟', k: 'puzzleFailEnemySpawnDelay', min: 0, max: 5000, step: 100 },
                    ])}
                    {createGroup('装备与负载限制', 'teal', 'equipmentSlots', [
                        { label: '外骨骼护甲槽位', k: 'armor', min: 1, max: 4, step: 1 },
                        { label: '战术饰品槽位', k: 'accessory', min: 1, max: 8, step: 1 },
                    ])}
                </div>
            </div>
        );
    };

    const renderVisualTab = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-6">
                <div className="bg-black/40 p-6 border border-zinc-800/60 rounded-sm">
                    <h4 className="text-[11px] text-cyan-400 font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                        <span className="text-[14px]">◉</span> 神经投射参数
                    </h4>
                    <RangeSlider label="HUD 投影亮度" value={settings.screenBrightness} min={50} max={150} step={1} colorClass="cyan" displayValue={`${settings.screenBrightness}%`} onChange={(v) => handleChange('screenBrightness', v)} />
                </div>
            </div>
            <div className="space-y-6">
                <div className="bg-black/40 p-6 border border-zinc-800/60 rounded-sm relative overflow-hidden">
                    <h4 className="text-[11px] text-purple-400 font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                        <span className="text-[14px]">▷</span> 偏好神经媒体介质
                    </h4>
                    <div className="flex bg-zinc-900/50 p-1 rounded-sm border border-zinc-800/80">
                        <button
                            onClick={() => handleChange('preferredMediaType', 'video')}
                            className={`flex-1 py-2 text-[10px] uppercase font-bold tracking-widest transition-all rounded-sm ${settings.preferredMediaType === 'video' ? 'bg-purple-900/40 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            动态影像序列 (VIDEO)
                        </button>
                        <button
                            onClick={() => handleChange('preferredMediaType', 'image')}
                            className={`flex-1 py-2 text-[10px] uppercase font-bold tracking-widest transition-all rounded-sm ${settings.preferredMediaType === 'image' ? 'bg-purple-900/40 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            静态空间定格 (IMAGE)
                        </button>
                    </div>
                    <div className="text-[9px] text-zinc-600 font-mono tracking-widest mt-4">
                        {settings.preferredMediaType === 'video' ? '// 启用幻觉引擎生成连续动态影像流，消耗较大算力' : '// 回退至视觉皮层瞬时画面抓取，稳定性更强'}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderAudioTab = () => {
        const updateMix = (key: keyof MixParams, val: number) => {
            const next = { ...audioParams, [key]: val } as MixParams;
            setAudioParams(next);
            AudioService.setMixParams(next);
        };
        const MIX_BUS: Array<{ label: string; key: keyof MixParams; color: string }> = [
            { label: '主输出层 (MASTER)', key: 'masterVolume', color: 'emerald' },
            { label: '环境声场 (AMBIENCE)', key: 'ambienceVolume', color: 'teal' },
            { label: '反馈音效 (SFX)', key: 'sfxVolume', color: 'sky' },
            { label: '神经配乐 (MUSIC)', key: 'musicVolume', color: 'purple' },
            { label: '发声器实体 (SPEECH)', key: 'speechVolume', color: 'amber' },
        ];
        const muted = AudioService.getMuted();
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-black/30 p-6 border border-zinc-800/50 rounded-sm">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <span className="text-[12px]">≣</span> 混音器总线
                    </div>
                    <div className="space-y-1">
                        {MIX_BUS.map(({ label, key, color }) => (
                            <RangeSlider key={key} label={label} min={0} max={100} step={1} colorClass={color}
                                value={Math.round((audioParams[key] as number) * 100)}
                                displayValue={`${Math.round((audioParams[key] as number) * 100)}%`}
                                onChange={(val) => updateMix(key, val / 100)}
                            />
                        ))}
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="bg-black/30 p-6 border border-zinc-800/50 rounded-sm">
                        <RangeSlider label="空间混响深度 (REVERB)" min={0} max={100} step={1} colorClass="cyan"
                            value={Math.round(audioParams.reverbMix * 100)} displayValue={`${Math.round(audioParams.reverbMix * 100)}%`}
                            onChange={(v) => updateMix('reverbMix', v / 100)} />
                    </div>
                    <div className="bg-black/30 p-6 border border-zinc-800/50 rounded-sm">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="text-[12px]">∿</span> 音频节点自检
                        </p>
                        <div className="grid grid-cols-3 gap-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                            {[...DOT_SOUNDS, ...SHORT_SOUNDS].map((sfx) => (
                                <button key={sfx} onClick={() => AudioService.playSfx(sfx)} className="py-2.5 px-2 text-[9px] font-mono uppercase tracking-widest border border-zinc-800 bg-black text-zinc-400 hover:text-emerald-400 hover:border-emerald-700/50 hover:bg-emerald-950/30 hover:shadow-[0_0_10px_rgba(16,185,129,0.1)] transition-all rounded-sm truncate">
                                    {sfx}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={() => { AudioService.toggleMute(); setAudioParams({ ...AudioService.getMixParams() }); }}
                        className={`w-full py-4 border transition-all duration-300 text-[11px] font-bold tracking-[0.2em] uppercase rounded-sm flex items-center justify-center gap-3
                            ${muted ? 'border-red-700/80 bg-red-950/40 text-red-400 hover:bg-red-900/60 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                                : 'border-emerald-700/50 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-900/40 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]'}`}
                    >
                        <span className={`w-2 h-2 ${muted ? 'bg-red-500' : 'bg-emerald-400 animate-pulse'}`} />
                        {muted ? '听觉系统已阻断 - 点击重启' : '听觉系统运行中 - 点击阻断'}
                    </button>
                </div>
            </div>
        );
    };

    const renderSavesTab = () => (
        <div className="h-full flex flex-col max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6 p-5 bg-black/40 border border-zinc-800/80 rounded-sm shadow-inner relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-950/10 to-transparent pointer-events-none" />
                <div className="flex gap-3 relative z-10">
                    <input
                        type="text" value={saveName} onChange={(e) => setSaveName(e.target.value)}
                        placeholder=":: 记录档案标识符 (可选) ::"
                        className="flex-1 bg-zinc-950/80 border border-zinc-700/50 py-3 px-4 text-[12px] font-mono tracking-wider text-zinc-300 focus:outline-none focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/20 rounded-sm transition-all"
                    />
                    <button
                        onClick={handleSave}
                        disabled={!fileSystemReady || !onSaveGame}
                        className="px-8 py-3 bg-purple-950/40 border border-purple-700/50 text-purple-300 text-[11px] font-bold tracking-[0.2em] hover:bg-purple-900/60 hover:border-purple-500 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] disabled:opacity-30 disabled:cursor-not-allowed transition-all rounded-sm uppercase"
                    >
                        刻录当前记忆
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar border border-zinc-800/50 bg-black/20 p-2 rounded-sm">
                <div className="flex justify-between items-center px-2 py-3 mb-2 border-b border-zinc-800/60 sticky top-0 bg-zinc-950/90 backdrop-blur-sm z-10">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold">可用神经档案库</span>
                    <button onClick={refreshSaves} className="text-[10px] text-cyan-500/80 hover:text-cyan-300 tracking-wider flex items-center gap-1 transition-colors">
                        <span>⟳</span> 重新扫描
                    </button>
                </div>
                {savesList.length === 0 ? (
                    <div className="text-center py-16 text-zinc-600 text-[11px] font-mono tracking-widest flex flex-col items-center gap-3 opacity-50">
                        <span className="text-2xl">⊘</span>
                        {fileSystemReady ? '存储阵列为空' : '文件系统握手失败'}
                    </div>
                ) : (
                    <div className="space-y-1.5 p-1">
                        {savesList.map((save) => (
                            <div key={save.name} className="flex items-center justify-between p-3.5 bg-zinc-900/30 border border-zinc-800/40 hover:border-zinc-600 hover:bg-zinc-800/50 group transition-all rounded-sm">
                                <div>
                                    <div className="text-[13px] text-zinc-300 font-mono tracking-wider mb-1 flex items-center gap-2 group-hover:text-emerald-400 transition-colors">
                                        <span className="text-zinc-600 group-hover:text-emerald-500/50">▸</span> {save.name}
                                    </div>
                                    <div className="text-[10px] text-zinc-500 font-mono tracking-widest">
                                        {new Date(save.modified).toLocaleString()} <span className="text-zinc-700 mx-1">|</span> <span className="text-zinc-600">{(save.size / 1024).toFixed(1)}KB</span>
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleLoad(save.name)} className="px-4 py-1.5 text-[10px] font-bold tracking-widest border border-emerald-900/50 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-900/60 hover:border-emerald-500 transition-colors rounded-sm uppercase">唤醒</button>
                                    <button onClick={() => handleDelete(save.name)} className="px-4 py-1.5 text-[10px] font-bold tracking-widest border border-red-900/50 bg-red-950/30 text-red-400 hover:bg-red-900/60 hover:border-red-500 transition-colors rounded-sm uppercase">擦除</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-xl">
            {/* 环境光晕特效 */}
            <div className="absolute inset-0 pointer-events-none z-0 opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
            <div className="absolute inset-0 pointer-events-none z-0 radial-gradient-vignette opacity-80" />

            {/* 面板主体 */}
            <div className={`relative flex flex-col bg-zinc-950/90 border border-zinc-800 shadow-[0_0_80px_rgba(16,185,129,0.05)] overflow-hidden ${isFullscreen ? 'w-full h-full' : 'w-full max-w-6xl h-[88vh] m-4 rounded-sm'}`}>
                <CornerAccents />

                {/* 顶部消息提示 (Toast) */}
                {msg && (
                    <div className={`absolute top-0 inset-x-0 py-2.5 text-center text-[10px] font-mono font-bold tracking-[0.3em] z-50 border-b animate-in slide-in-from-top-2 shadow-lg backdrop-blur-md uppercase ${msg.type === 'success' ? 'bg-emerald-950/90 text-emerald-400 border-emerald-800 shadow-emerald-900/20' : msg.type === 'warning' ? 'bg-amber-950/90 text-amber-400 border-amber-800 shadow-amber-900/20' : 'bg-red-950/90 text-red-400 border-red-800 shadow-red-900/20'}`}>
                        {msg.text}
                    </div>
                )}

                {/* 标题栏 */}
                <div className="shrink-0 h-16 flex items-center justify-between px-8 border-b border-zinc-800/80 bg-zinc-900/50 z-10 relative">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    <div className="flex items-center gap-4">
                        <div className="text-2xl opacity-90 animate-pulse text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]">❖</div>
                        <div className="flex flex-col">
                            <h2 className="text-[16px] font-mono text-zinc-100 tracking-[0.4em] uppercase font-bold">系统控制枢纽</h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center border border-zinc-700 bg-zinc-900/80 text-zinc-400 hover:text-red-400 hover:bg-red-950/50 hover:border-red-800 transition-all rounded-sm group">
                        <span className="text-lg group-hover:scale-110 transition-transform">✕</span>
                    </button>
                </div>

                {/* 导航栏 */}
                <div className="flex border-b border-zinc-800/60 bg-black/40 relative z-10">
                    <TabButton active={activeTab === 'uplink'} label="神经链接" onClick={() => setActiveTab('uplink')} />
                    <TabButton active={activeTab === 'cortex'} label="认知核心" onClick={() => setActiveTab('cortex')} />
                    <TabButton active={activeTab === 'balance'} label="系统平衡" onClick={() => setActiveTab('balance')} />
                    <TabButton active={activeTab === 'visual'} label="视觉投影" onClick={() => setActiveTab('visual')} />
                    <TabButton active={activeTab === 'audio'} label="听觉信号" onClick={() => setActiveTab('audio')} />
                    <TabButton active={activeTab === 'saves'} label="记忆档案" onClick={() => setActiveTab('saves')} />
                </div>

                {/* 内容展示区 */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 font-mono relative z-10">
                    <div className="absolute inset-0 opacity-[0.03] bg-[url('/noise.png')] mix-blend-overlay pointer-events-none" />
                    <div className="relative z-10 h-full">
                        {activeTab === 'uplink' && renderUplinkTab()}
                        {activeTab === 'cortex' && renderCortexTab()}
                        {activeTab === 'balance' && renderBalanceTab()}
                        {activeTab === 'visual' && renderVisualTab()}
                        {activeTab === 'audio' && renderAudioTab()}
                        {activeTab === 'saves' && renderSavesTab()}
                    </div>
                </div>

                {/* 底部状态栏 */}
                <div className="shrink-0 px-6 py-4 border-t border-zinc-800/80 bg-black flex justify-between items-center z-10 text-[10px] font-mono">
                    <TelemetryReadout />
                    <button onClick={onClose} className="px-10 py-3 bg-zinc-200 text-black border-2 border-transparent hover:border-emerald-500 hover:text-emerald-400 hover:bg-transparent hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] font-bold tracking-[0.2em] transition-all uppercase text-[11px] rounded-sm relative overflow-hidden group">
                        <span className="relative z-10">提交配置并重启视图</span>
                        <div className="absolute top-0 left-[-100%] w-[50%] h-full bg-white/20 skew-x-[-20deg] group-hover:left-[200%] transition-all duration-700 ease-out" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;