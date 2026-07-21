import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    NpcTemplate, PlayerState, RoleUiConfig, NPCTabMode, Dialogue, ItemInstance, Entity, NpcDynamicState, Words, PlayerWordsTag, NpcWordsTag, NpcProfileMeta
} from '../meta';
import { AudioService, PersistenceService } from '../services';

interface SocializationPanelProps {
    /** NPC 实体数据 */
    npc: Entity<NpcTemplate, NpcDynamicState>;
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
    /** 是否已完成招募/建立深入连接 */
    isRecruited: boolean;
    /** 本地基础动作回调 */
    onLocalAction: (actionType: 'hug' | 'heal') => void;
    /** 取走物品回调 */
    onTakeItem: (item: ItemInstance) => void;
    /** 亲密/核心共振互动回调 */
    onIntimacy?: () => void;
    /** 触发生成 NPC 视觉图像回调 */
    onGenerateNpcImage?: () => void;
    /** 随机切换NPC肖像回调 */
    onRandomSwitchNpcImage?: () => Promise<string | null>;
    /** 检查是否有多个肖像变体 */
    hasMultipleNpcVariants?: () => Promise<boolean>;
    /** 挂载指定人格/记忆组 */
    onMountProfile?: (profileId: string) => Promise<void>;
    /** 新建独立人格组/脱离当前挂载 */
    onUnmountCreateNewProfile?: (customName?: string) => Promise<void>;
    /** 删除人格组 */
    onDeleteProfile?: (profileId: string) => Promise<void>;
}

/**
 * 角色职业 UI 配置映射
 * 基于 CharacterStyle 定义不同的标识色彩和图标
 */
const CLASS_CONFIG: Record<string, RoleUiConfig> = {
    healer: { icon: '✚', color: 'text-rose-400', label: '战地医疗' },
    defense: { icon: '🛡️', color: 'text-amber-400', label: '重型铁卫' },
    attack: { icon: '⚔️', color: 'text-red-500', label: '强袭尖兵' },
    tactical: { icon: '⌖', color: 'text-emerald-400', label: '战术侦察' },
    burst: { icon: '🔮', color: 'text-purple-400', label: '爆能专家' },
    civilian: { icon: '👤', color: 'text-gray-400', label: '幸存者' }
};

/**
 * 科幻分段式诊断仪表组件
 */
const DiagnosticGauge: React.FC<{
    label: string;
    value: number;
    max: number;
    color: string;
    critical?: boolean;
    type: 'hp' | 'san' | 'sta' | 'vig' | 'trust';
}> = ({ label, value, max, color, critical, type }) => {
    const segments = 20;
    // 防止除数为0或溢出
    const safeMax = Math.max(1, max);
    const filledCount = Math.ceil((Math.min(safeMax, Math.max(0, value)) / safeMax) * segments);

    const getSegmentColor = () => {
        if (critical && (type === 'hp' || type === 'san')) return 'bg-red-500 shadow-[0_0_10px_#ef4444]';
        switch (type) {
            case 'hp': return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]';
            case 'san': return 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]';
            case 'trust': return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]';
            case 'sta': return 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]';
            case 'vig': return 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)]';
            default: return 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]';
        }
    };

    return (
        <div className="mb-4 group">
            <div className="flex justify-between items-end mb-1.5 px-1">
                <span className={`text-[10px] font-mono tracking-widest font-bold uppercase transition-colors duration-300 ${critical ? 'animate-pulse text-red-400' : 'text-zinc-400 group-hover:text-zinc-100'}`}>
                    {label}
                </span>
                <div className="flex items-baseline gap-1.5">
                    <span className={`text-sm font-mono font-bold ${color}`}>{Math.round(value)}</span>
                    <span className="text-[10px] text-zinc-600 font-mono">/ {max}</span>
                </div>
            </div>
            <div className="flex h-[6px] gap-[2px] w-full bg-black/60 p-0.5 border border-zinc-800/80 rounded-sm">
                {Array.from({ length: segments }).map((_, i) => (
                    <div
                        key={i}
                        className={`flex-1 rounded-sm transition-all duration-300
                            ${i < filledCount ? getSegmentColor() : 'bg-zinc-800/20'}
                            ${i < filledCount && critical && (type === 'hp' || type === 'san') ? 'animate-pulse' : ''}
                        `}
                    />
                ))}
            </div>
        </div>
    );
};

/**
 * 人格与记忆管理模态框
 */
const PersonalityMountModal: React.FC<{
    npcName: string;
    currentMountedProfileId?: string;
    onClose: () => void;
    onMountProfile?: (profileId: string) => Promise<void>;
    onUnmountCreateNewProfile?: (customName?: string) => Promise<void>;
    onDeleteProfile?: (profileId: string) => Promise<void>;
}> = ({ npcName, currentMountedProfileId, onClose, onMountProfile, onUnmountCreateNewProfile, onDeleteProfile }) => {
    const [profiles, setProfiles] = useState<NpcProfileMeta[]>([]);
    const [loading, setLoading] = useState(true);
    const [newProfileName, setNewProfileName] = useState('');

    const fetchProfiles = async () => {
        setLoading(true);
        try {
            const list = await PersistenceService.listNpcProfiles(npcName);
            setProfiles(list);
        } catch {
            setProfiles([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfiles();
    }, [npcName]);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
            <div className="w-full max-w-lg bg-zinc-950 border border-cyan-500/40 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col max-h-[85vh] overflow-hidden">
                {/* 标题 */}
                <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
                    <div className="flex items-center gap-2">
                        <span className="text-cyan-400 text-lg">🧠</span>
                        <h3 className="text-base font-bold text-zinc-100 font-mono tracking-wide">
                            人格管理中枢 <span className="text-cyan-400">[{npcName}]</span>
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-zinc-200 text-sm font-mono p-1"
                    >
                        ✕
                    </button>
                </div>

                {/* 核心说明 */}
                <div className="px-6 py-3 bg-cyan-950/20 border-b border-cyan-900/30 text-[11px] text-cyan-300 font-mono leading-relaxed">
                    挂载后与 [{npcName}] 的对话及记忆金字塔将独立绑定至该人格组中。不挂载或建立新组将使用独立全新人格组。
                </div>

                {/* 记忆组列表 */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-thin scrollbar-thumb-zinc-700">
                    {loading ? (
                        <div className="text-center py-8 text-zinc-500 font-mono text-xs animate-pulse">
                            正在扫描本地数据目录 the-zone-data/memory/{npcName}/...
                        </div>
                    ) : profiles.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500 font-mono text-xs border border-dashed border-zinc-800 rounded-md">
                            暂无其他已保存的人格记忆组。对话后将自动生成首个人格数据。
                        </div>
                    ) : (
                        profiles.map((p) => {
                            const isCurrent = currentMountedProfileId === p.profileId || (!currentMountedProfileId && p.profileId === 'default');
                            return (
                                <div
                                    key={p.profileId}
                                    className={`p-4 border rounded-md transition-all flex items-center justify-between gap-3 ${isCurrent
                                        ? 'bg-cyan-950/40 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                                        : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
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
                                                    await onMountProfile(p.profileId);
                                                    onClose();
                                                }}
                                                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold font-mono rounded transition-all shadow-md"
                                            >
                                                挂载此人格
                                            </button>
                                        )}
                                        {onDeleteProfile && p.profileId !== 'default' && (
                                            <button
                                                onClick={async () => {
                                                    if (confirm(`确定要删除人格组 [${p.name}] 吗？数据不可恢复。`)) {
                                                        await onDeleteProfile(p.profileId);
                                                        fetchProfiles();
                                                    }
                                                }}
                                                className="px-2 py-1.5 bg-red-950/40 border border-red-800/50 hover:bg-red-900/60 text-red-400 text-xs font-mono rounded transition-all"
                                                title="删除"
                                            >
                                                🗑
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* 底部：新建人格 */}
                <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/60 space-y-3">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="输入新人格组名称 (可选)..."
                            value={newProfileName}
                            onChange={(e) => setNewProfileName(e.target.value)}
                            className="flex-1 bg-black/60 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-100 font-mono rounded focus:border-cyan-500 focus:outline-none"
                        />
                        <button
                            onClick={async () => {
                                if (onUnmountCreateNewProfile) {
                                    await onUnmountCreateNewProfile(newProfileName);
                                    onClose();
                                }
                            }}
                            className="px-4 py-1.5 bg-zinc-800 hover:bg-cyan-900/60 hover:border-cyan-500 border border-zinc-700 text-zinc-200 hover:text-cyan-300 text-xs font-mono font-bold rounded transition-all"
                        >
                            + 新建独立人格
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * 左侧：生物监测与视觉数据中枢 (Bio-Monitor Section)
 */
const BioMonitorSection: React.FC<{
    npc: Entity<NpcTemplate, NpcDynamicState>;
    isRecruited: boolean;
    isGenerating: boolean;
    onRecruit: () => void;
    onClose: () => void;
    onGenerateNpcImage?: () => void;
    onRandomSwitchNpcImage?: () => Promise<string | null>;
    hasMultipleNpcVariants?: () => Promise<boolean>;
    onMountProfile?: (profileId: string) => Promise<void>;
    onUnmountCreateNewProfile?: (customName?: string) => Promise<void>;
    onDeleteProfile?: (profileId: string) => Promise<void>;
}> = ({ npc, isRecruited, isGenerating, onRecruit, onClose, onGenerateNpcImage, onRandomSwitchNpcImage, onMountProfile, onUnmountCreateNewProfile, onDeleteProfile }) => {

    const [showMountModal, setShowMountModal] = useState(false);
    const style = npc.static.style || 'civilian';
    const roleData = CLASS_CONFIG[style] || CLASS_CONFIG['civilian'];
    const trustValue = npc.dynamic.trust;

    // 安全提取记忆金字塔 (Memory Pyramid)
    const pyramid = useMemo(() => {
        return npc.dynamic.memory || { α: [], β: [], γ: [], δ: [] };
    }, [npc.dynamic.memory]);

    return (
        <div className="w-full md:w-[30%] lg:w-[28%] xl:w-[25%] h-full flex flex-col border-r border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl relative z-20 shrink-0">
            {showMountModal && (
                <PersonalityMountModal
                    npcName={npc.static.name}
                    currentMountedProfileId={npc.dynamic.mountedProfileId}
                    onClose={() => setShowMountModal(false)}
                    onMountProfile={onMountProfile}
                    onUnmountCreateNewProfile={onUnmountCreateNewProfile}
                    onDeleteProfile={onDeleteProfile}
                />
            )}

            {/* 顶栏 Header */}
            <div className="h-16 shrink-0 border-b border-zinc-800/80 flex items-center px-6 justify-between bg-zinc-900/40 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent opacity-50 group-hover:via-emerald-400/80 transition-all duration-700"></div>
                <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-sm ${npc.dynamic.deathReason ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'} animate-pulse`}></span>
                    <span className="text-[10px] text-zinc-300 font-mono tracking-[0.2em] font-bold uppercase drop-shadow-[0_0_2px_rgba(255,255,255,0.3)]">Bio-Monitor V5.1</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono font-bold">NODE_{npc.static.id.slice(-4).toUpperCase()}</span>
            </div>

            {/* 主体内容区 */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">

                {/* 视觉数据模块 */}
                <div className="relative aspect-[4/5] mb-8 border border-zinc-800/80 group bg-black/80 overflow-hidden shadow-2xl rounded-md">
                    {/* 扫描线叠层 */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:100%_4px] pointer-events-none z-10 opacity-40"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent h-[20%] animate-[scan_3s_ease-in-out_infinite] z-10 pointer-events-none"></div>

                    {npc.dynamic.imageUrl ? (
                        <div className="w-full h-full relative">
                            <img src={npc.dynamic.imageUrl} alt={npc.static.name} className="w-full h-full object-cover grayscale-[0.2] contrast-125 brightness-90 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000 ease-out" />
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent z-10"></div>
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-800 font-mono z-20">
                            <span className="text-4xl mb-4 opacity-30 text-emerald-500 animate-pulse drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">⚠</span>
                            <span className="text-[11px] animate-pulse text-zinc-500 tracking-widest drop-shadow-[0_0_2px_rgba(255,255,255,0.2)]">NO_VISUAL_FEED</span>
                        </div>
                    )}

                    {/* 控制按钮叠层 */}
                    <div className="absolute top-2 right-2 z-30 flex gap-2">
                        {onRandomSwitchNpcImage && (
                            <button
                                onClick={async () => {
                                    AudioService.playSfx('click');
                                    await onRandomSwitchNpcImage();
                                }}
                                disabled={isGenerating}
                                className="p-1.5 bg-black/60 border border-amber-900/50 text-amber-500 hover:text-amber-200 hover:border-amber-400 hover:bg-amber-950/50 transition-all rounded-sm backdrop-blur-md group/btn disabled:opacity-30 disabled:cursor-not-allowed"
                                title="随机切换肖像"
                            >
                                <span className="block w-3 h-3 text-xs leading-none flex items-center justify-center">🎲</span>
                            </button>
                        )}
                        {onGenerateNpcImage && (
                            <button
                                onClick={() => {
                                    AudioService.playSfx('scan');
                                    onGenerateNpcImage();
                                }}
                                disabled={isGenerating}
                                className="p-1.5 bg-black/60 border border-emerald-900/50 text-emerald-500 hover:text-emerald-200 hover:border-emerald-400 hover:bg-emerald-950/50 transition-all rounded-sm backdrop-blur-md group/btn disabled:opacity-30 disabled:cursor-not-allowed"
                                title="生成新肖像"
                            >
                                <span className={`block w-3 h-3 text-xs leading-none flex items-center justify-center ${isGenerating ? 'animate-spin' : ''}`}>
                                    {isGenerating ? '◌' : '↻'}
                                </span>
                            </button>
                        )}
                    </div>

                    {/* 角落装饰 */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-500/60 z-20 opacity-70 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-500/60 z-20 opacity-70 group-hover:opacity-100 transition-opacity"></div>

                    {/* Meta 信息浮层 */}
                    <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5">
                        <div className="px-2 py-1 bg-black/80 backdrop-blur-md border border-emerald-500/30 text-[8px] text-emerald-400 font-mono uppercase tracking-widest flex items-center gap-1.5 rounded-sm shadow-md">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span>
                            FREQ: 2.4GHz
                        </div>
                        <div className="px-2 py-1 bg-black/80 backdrop-blur-md border border-zinc-500/30 text-[8px] text-zinc-400 font-mono uppercase tracking-widest rounded-sm shadow-md">LINK: SECURE</div>
                    </div>

                    {/* 身份与状态标识 */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 z-20 bg-gradient-to-t from-black/80 to-transparent">
                        <h2 className="text-3xl text-white font-bold tracking-tight mb-3 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{npc.static.name}</h2>
                        <div className="flex items-center justify-between gap-2">
                            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 border border-zinc-700/60 bg-black/60 backdrop-blur-md rounded-sm shadow-lg`}>
                                <span className="text-xs drop-shadow-md">{roleData.icon}</span>
                                <span className={`text-[10px] font-mono font-bold tracking-widest ${roleData.color}`}>{roleData.label}</span>
                            </div>

                            <button
                                onClick={() => {
                                    AudioService.playSfx('click');
                                    setShowMountModal(true);
                                }}
                                className="px-2.5 py-1.5 bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 hover:text-cyan-100 hover:border-cyan-400 hover:bg-cyan-900 transition-all rounded-sm font-mono text-[10px] font-bold tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                                title="管理/挂载人格记忆组"
                            >
                                <span>🧠 人格挂载</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* 诊断图表区 */}
                <div className="space-y-3 mb-8 bg-black/40 p-5 border border-zinc-800/60 rounded-md relative overflow-hidden group shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/20 group-hover:bg-emerald-500/50 transition-colors shadow-[0_0_10px_rgba(16,185,129,0.3)]"></div>
                    <DiagnosticGauge type="hp" label="生命体征 (HP)" value={npc.dynamic.hp} max={npc.static.initialState.vital.maxHp || 100} color="text-emerald-400" critical={npc.dynamic.hp < (npc.static.initialState.vital.maxHp || 100) * 0.3} />
                    <DiagnosticGauge type="san" label="意识频率 (SAN)" value={npc.dynamic.sanity} max={npc.static.initialState.vital.maxSanity || 100} color="text-purple-400" critical={npc.dynamic.sanity < 30} />
                    <DiagnosticGauge type="sta" label="耐力水平 (STA)" value={npc.dynamic.stamina || 0} max={npc.static.initialState.vital.maxStamina || 100} color="text-blue-400" />
                    <DiagnosticGauge type="vig" label="行动活力 (VIG)" value={npc.dynamic.vigor || 0} max={npc.static.initialState.vital.maxVigor || 100} color="text-orange-400" />
                    <DiagnosticGauge type="trust" label="同步比率 (TRUST)" value={trustValue} max={100} color="text-amber-400" />
                </div>

                {/* 档案与记忆区 */}
                <div className="border-t border-zinc-800/80 pt-6 space-y-6">
                    <div>
                        <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.2em] mb-3 flex items-center gap-2 drop-shadow-md">
                            <span className="w-1.5 h-[1px] bg-zinc-600"></span> 深度档案 (Archive)
                        </div>
                        <p className="text-[13px] text-zinc-300 font-serif leading-relaxed italic text-justify px-1 opacity-90">
                            {npc.static.desc}
                        </p>
                    </div>

                    {/* 记忆金字塔层级 (Hierarchical Memories) */}
                    <div className="space-y-6">
                        {/* Alpha - 核心人格锚点 */}
                        {pyramid.α.length > 0 && (
                            <div>
                                <div className="text-[10px] text-red-500/80 font-mono uppercase tracking-[0.2em] mb-3 flex items-center gap-2 drop-shadow-md">
                                    <span className="w-1.5 h-[1px] bg-red-600/60"></span> 核心人格锚点 (Core Alpha)
                                </div>
                                <div className="space-y-2 px-1">
                                    {pyramid.α.map((m, i) => (
                                        <div key={m.id || i} className="p-3 border border-red-900/30 bg-red-950/20 rounded-sm text-[11px] text-zinc-300 font-serif italic text-justify leading-relaxed relative overflow-hidden">
                                            <div className="absolute left-0 top-0 w-[2px] h-full bg-red-500/40"></div>
                                            {m.summary}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Beta & Gamma - 深层意识与认知节点 */}
                        {(pyramid.β.length > 0 || pyramid.γ.length > 0) && (
                            <div>
                                <div className="text-[10px] text-purple-500/80 font-mono uppercase tracking-[0.2em] mb-3 flex items-center gap-2 drop-shadow-md">
                                    <span className="w-1.5 h-[1px] bg-purple-600/60"></span> 深层记忆沉淀 (Beta/Gamma)
                                </div>
                                <div className="space-y-2 px-1">
                                    {[...pyramid.β, ...pyramid.γ].slice(0, 5).map((m, i) => (
                                        <div key={m.id || i} className="p-2.5 border border-purple-900/20 bg-purple-950/10 rounded-sm text-[10px] text-zinc-400 font-serif italic leading-relaxed">
                                            • {m.summary}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Delta - 近期对话摘要 */}
                        {pyramid.δ.length > 0 && (
                            <div>
                                <div className="text-[10px] text-emerald-500/80 font-mono uppercase tracking-[0.2em] mb-3 flex items-center gap-2 drop-shadow-md">
                                    <span className="w-1.5 h-[1px] bg-emerald-600/60"></span> 近期对话摘要 (Recent Delta)
                                </div>
                                <div className="flex flex-wrap gap-2 px-1">
                                    {pyramid.δ.slice(-5).map((m, i) => (
                                        <div key={m.id || i} className="px-2.5 py-1.5 border border-emerald-900/40 bg-emerald-950/20 hover:bg-emerald-900/40 hover:border-emerald-500/50 transition-colors rounded-sm text-[10px] text-zinc-300 font-mono italic shadow-sm group/item">
                                            <span className="text-emerald-500 mr-1 opacity-50 group-hover/item:opacity-100">#</span>
                                            {m.summary.length > 40 ? m.summary.slice(0, 40) + '...' : m.summary}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 底部操作区 */}
            <div className="shrink-0 p-5 border-t border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl grid grid-cols-2 gap-3 relative z-30">
                {!isRecruited ? (
                    <button
                        onClick={onRecruit}
                        className="p-3.5 border border-emerald-500/40 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-500 hover:text-zinc-950 hover:border-emerald-400 text-[10px] font-mono font-bold tracking-[0.2em] uppercase transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] rounded-sm active:scale-[0.98]"
                    >
                        [ 建立连接协议 ]
                    </button>
                ) : (
                    <div className="col-span-2 p-3.5 flex items-center justify-center gap-3 text-[10px] text-emerald-400 border border-emerald-900/50 bg-emerald-950/30 font-mono tracking-[0.2em] uppercase rounded-sm shadow-[inset_0_0_15px_rgba(16,185,129,0.1)]">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></span>
                        协议连通中 (ACTIVE)
                    </div>
                )}
                {!isRecruited && (
                    <button
                        onClick={onClose}
                        className="p-3.5 border border-zinc-700/60 bg-zinc-900/50 text-zinc-400 hover:bg-red-950/40 hover:border-red-500/50 hover:text-red-400 text-[10px] font-mono tracking-[0.2em] uppercase transition-all duration-300 rounded-sm active:scale-[0.98] shadow-sm"
                    >
                        切断链路
                    </button>
                )}
            </div>
        </div>
    );
};

/**
 * 通讯气泡组件 (Chat Bubble)
 */
const ChatBubble: React.FC<{ words: Words<PlayerWordsTag | NpcWordsTag>, npcName: string }> = ({ words, npcName }) => {
    const isPlayer = words.tag.type === 'player';
    const isAction = words.text.startsWith('(') || words.text.startsWith('*') || words.text.startsWith('[');

    return (
        <div className={`flex w-full mb-6 ${isPlayer ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-3 duration-500`}>
            <div className={`max-w-[85%] flex flex-col ${isPlayer ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1.5 opacity-70">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest drop-shadow-md">
                        {isPlayer ? '>> CMD_IN' : `<< ${npcName.toUpperCase()}_OUT`}
                    </span>
                </div>

                {/* LLM 思考过程展示 (AI Thought Visualization) */}
                {words.thought && (
                    <div className="mb-3 p-4 bg-black/40 border border-zinc-800/40 rounded-sm text-[11px] text-zinc-500 font-mono italic leading-relaxed max-w-full relative overflow-hidden group/thought transition-all hover:border-zinc-700/60 shadow-inner">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-700/30 to-transparent"></div>
                        <div className="flex items-center gap-2 mb-2 opacity-40 uppercase tracking-[0.2em] text-[8px] font-bold">
                            <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-pulse"></span>
                            Neural_Processing_Stream
                        </div>
                        <div className="opacity-70 group-hover/thought:opacity-100 transition-opacity whitespace-pre-wrap">
                            {words.thought}
                        </div>
                    </div>
                )}

                <div className={`relative px-5 py-3.5 text-[15px] leading-relaxed backdrop-blur-md shadow-xl transition-all 
                    ${isPlayer
                        ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-50/90 rounded-l-md rounded-br-md border-r-4 border-r-emerald-500'
                        : isAction
                            ? 'bg-zinc-800/30 border border-zinc-700/60 text-zinc-300 italic font-serif border-dashed rounded-md'
                            : 'bg-zinc-900/80 border border-zinc-700/80 text-zinc-100 rounded-r-md rounded-bl-md border-l-4 border-l-zinc-400'
                    }`}>
                    {/* 科幻感边角修饰 */}
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

/**
 * 动作操作按钮组件 (Action Button)
 */
const ActionButton: React.FC<{
    icon: string;
    label: string;
    subLabel?: string;
    onClick: () => void;
    color?: 'blue' | 'red' | 'emerald' | 'amber' | 'purple' | 'pink';
    disabled?: boolean;
}> = ({ icon, label, subLabel, onClick, color = 'blue', disabled }) => {

    const colorStyles = {
        blue: 'border-blue-500/30 text-blue-400 hover:border-blue-400/80 hover:bg-blue-950/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]',
        red: 'border-red-500/30 text-red-400 hover:border-red-400/80 hover:bg-red-950/40 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]',
        emerald: 'border-emerald-500/30 text-emerald-400 hover:border-emerald-400/80 hover:bg-emerald-950/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]',
        amber: 'border-amber-500/30 text-amber-400 hover:border-amber-400/80 hover:bg-amber-950/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]',
        purple: 'border-purple-500/30 text-purple-400 hover:border-purple-400/80 hover:bg-purple-950/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]',
        pink: 'border-pink-500/30 text-pink-400 hover:border-pink-400/80 hover:bg-pink-950/40 hover:shadow-[0_0_20px_rgba(236,72,153,0.2)]'
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                group relative flex flex-col items-center justify-center py-4 px-2 border bg-black/60 transition-all duration-300 rounded-sm
                ${disabled ? 'opacity-40 cursor-not-allowed grayscale border-zinc-800' : colorStyles[color]}
                active:scale-[0.96] overflow-hidden
            `}
        >
            <span className="text-2xl mb-2 transition-transform duration-300 group-hover:scale-110 drop-shadow-md">{icon}</span>
            <span className="text-[10px] font-mono font-bold tracking-widest z-10">{label}</span>
            {subLabel && <span className="text-[8px] font-mono text-zinc-500 mt-1 uppercase tracking-tighter z-10 group-hover:text-zinc-300 transition-colors">{subLabel}</span>}

            {/* 角落科技装饰 */}
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-current opacity-30 transition-opacity group-hover:opacity-100"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-current opacity-30 transition-opacity group-hover:opacity-100"></div>
        </button>
    );
};

/**
 * 主交互面板容器
 */
const SocializationPanel: React.FC<SocializationPanelProps> = ({
    npc, player, onSendMessage, onRecruit, onGift, onClose, isGenerating,
    isRecruited, onLocalAction, onTakeItem, onIntimacy, onGenerateNpcImage, onRandomSwitchNpcImage, hasMultipleNpcVariants,
    onMountProfile, onUnmountCreateNewProfile, onDeleteProfile
}) => {
    const [activeTab, setActiveTab] = useState<NPCTabMode>('interaction');
    const [inputValue, setInputValue] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showFreeChat, setShowFreeChat] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    /**
     * 提取当前相关的对话记录
     */
    const dialogueWords: Array<Words<PlayerWordsTag | NpcWordsTag>> = useMemo(() => {
        const playerDialogue = player.dialogue || [];
        const words: Array<Words<PlayerWordsTag | NpcWordsTag>> = [];
        playerDialogue.forEach((dialogue: Dialogue) => {
            if (dialogue.owner && dialogue.owner.id === npc.static.id) {
                dialogue.dialogue.forEach(([p, n]) => {
                    if (p) words.push(p);
                    if (n) words.push(n);
                });
            }
        });
        return words;
    }, [player.dialogue, npc.static.id]);

    /**
     * 平滑滚动到底部
     */
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [dialogueWords, isSending, showFreeChat, activeTab]);

    /**
     * 自动聚焦输入框
     */
    useEffect(() => {
        if (showFreeChat && inputRef.current) inputRef.current.focus();
    }, [showFreeChat]);

    /**
     * 消息发送处理
     */
    const handleSend = async () => {
        if (!inputValue.trim() || isSending) return;
        const text = inputValue;
        setInputValue('');
        setIsSending(true);
        AudioService.playSfx('click');

        try {
            await onSendMessage(text);
            AudioService.playSfx('text');
        } catch {
            // 优雅弹回：推演报错时恢复玩家原有的输入内容到输入栏，避免信息混入对话历史
            setInputValue(text);
            AudioService.playSfx('error');
        } finally {
            setIsSending(false);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSend();
    };

    // 辅助函数：判断物品是否为装备类别
    const isEquipmentItem = (type: string) => ['weapon', 'armor', 'accessory'].includes(type);

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 flex font-serif backdrop-blur-md animate-in fade-in duration-300">
            {/* 背景氛围层 */}
            <div className="absolute inset-0 pointer-events-none z-0 opacity-10 bg-[linear-gradient(rgba(16,185,129,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.05)_1px,transparent_1px)] bg-[length:40px_40px]"></div>
            <div className="absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.9)_100%)]" />

            {/* 核心窗口面板 */}
            <div className="relative z-10 w-full h-full flex bg-zinc-950/90 overflow-hidden">

                {/* 左侧生物监测站 */}
                <BioMonitorSection
                    npc={npc}
                    isRecruited={isRecruited}
                    isGenerating={isGenerating}
                    onRecruit={onRecruit}
                    onClose={onClose}
                    onGenerateNpcImage={onGenerateNpcImage}
                    onRandomSwitchNpcImage={onRandomSwitchNpcImage}
                    hasMultipleNpcVariants={hasMultipleNpcVariants}
                    onMountProfile={onMountProfile}
                    onUnmountCreateNewProfile={onUnmountCreateNewProfile}
                    onDeleteProfile={onDeleteProfile}
                />

                {/* 右侧交互中枢 */}
                <div className="flex-1 flex flex-col bg-[#0b0b0d]/90 relative overflow-hidden">

                    {/* 未授权遮罩层 (对于非对话标签且未招募时) */}
                    {activeTab !== 'interaction' && !isRecruited && (
                        <div className="absolute inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
                            <div className="relative flex flex-col items-center animate-in zoom-in-95 duration-500">
                                <span className="text-6xl text-red-500/80 mb-6 animate-pulse drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">🔒</span>
                                <div className="px-6 py-2 border-y border-red-500/40 bg-red-950/20">
                                    <span className="text-red-400 font-mono tracking-[0.3em] font-bold text-sm uppercase">访问拒绝 :: 需先建立连接协议</span>
                                </div>
                                <span className="text-zinc-500 font-mono tracking-widest text-[10px] mt-4 opacity-80">UNAUTHORIZED_ACCESS_ATTEMPT</span>
                            </div>
                        </div>
                    )}

                    {/* 顶部标签导航栏 */}
                    <div className="h-16 shrink-0 border-b border-zinc-800/80 flex bg-zinc-900/60 relative z-40">
                        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-zinc-800 via-zinc-600 to-zinc-800"></div>

                        <button
                            onClick={() => setActiveTab('interaction')}
                            className={`flex-1 text-[10px] font-mono uppercase tracking-[0.2em] transition-all duration-300 relative flex items-center justify-center gap-3 ${activeTab === 'interaction' ? 'text-emerald-400 bg-black/80' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
                                }`}
                        >
                            <span className="text-lg">⚡</span> 通讯链路 (COMM_LINK)
                            {activeTab === 'interaction' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-emerald-500 shadow-[0_0_15px_#10b981]"></div>}
                        </button>

                        <div className="w-[1px] bg-zinc-800/80 my-2"></div>

                        <button
                            onClick={() => setActiveTab('inventory')}
                            className={`flex-1 text-[10px] font-mono uppercase tracking-[0.2em] transition-all duration-300 relative flex items-center justify-center gap-3 ${activeTab === 'inventory' ? 'text-blue-400 bg-black/80' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
                                }`}
                        >
                            <span className="text-lg">🎒</span> 货舱管理 (STORAGE)
                            {activeTab === 'inventory' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-blue-500 shadow-[0_0_15px_#3b82f6]"></div>}
                        </button>

                        <div className="w-[1px] bg-zinc-800/80 my-2"></div>

                        <button onClick={onClose} className="w-16 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-950/50 transition-all border-l border-zinc-800/80 group">
                            <span className="group-hover:scale-125 transition-transform duration-300 font-sans text-xl drop-shadow-md">✕</span>
                        </button>
                    </div>

                    {/* 主体内容视图区 */}
                    <div className="flex-1 overflow-hidden relative">
                        {activeTab === 'interaction' && (
                            <div className="flex flex-col h-full relative bg-zinc-950/40">
                                {/* 对话流区域 */}
                                <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent space-y-4">
                                    <div className="flex justify-center mb-10">
                                        <div className="px-5 py-2 border border-zinc-700/60 bg-black/80 backdrop-blur-md text-[10px] text-zinc-400 font-mono rounded-full flex items-center gap-3 shadow-lg">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></span>
                                            信号链路已建立 :: 频率锁定完成
                                        </div>
                                    </div>

                                    {dialogueWords.length === 0 && (
                                        <div className="py-24 flex flex-col items-center opacity-30">
                                            <div className="text-6xl mb-6 text-emerald-500/50 animate-pulse drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">📡</div>
                                            <div className="text-[11px] font-mono tracking-widest uppercase text-emerald-500/80">等待信号输入...</div>
                                        </div>
                                    )}

                                    {dialogueWords.map((words: Words<PlayerWordsTag | NpcWordsTag>, idx: number) => (
                                        <ChatBubble key={idx} words={words} npcName={npc.static.name} />
                                    ))}

                                    {isSending && (
                                        <div className="flex justify-start animate-in fade-in duration-300 mb-6">
                                            <div className="bg-zinc-900/80 border border-zinc-700/60 px-5 py-3 rounded-md text-[10px] text-zinc-400 font-mono tracking-[0.2em] flex items-center gap-3 shadow-lg">
                                                <span className="text-emerald-500 animate-spin">◒</span>
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

                                {/* 操作控制台面板 */}
                                <div className="bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/80 p-6 shadow-[0_-20px_40px_rgba(0,0,0,0.6)] z-20">
                                    {!showFreeChat ? (
                                        <div className="grid grid-cols-4 md:grid-cols-6 xl:grid-cols-7 gap-3">
                                            {(npc.dynamic.trust >= 75 && onIntimacy) ? (
                                                <ActionButton icon="❤" label="深联" subLabel="核心共振" onClick={() => onIntimacy()} color="pink" disabled={isGenerating} />
                                            ) : (
                                                <ActionButton icon="🫂" label="安抚" subLabel="体感交互" onClick={() => onLocalAction('hug')} color="amber" disabled={isGenerating} />
                                            )}
                                            <ActionButton icon="💉" label="分配" subLabel="药物供给" onClick={() => onLocalAction('heal')} color="emerald" disabled={isGenerating} />

                                            {/* 自由输入切换按钮 */}
                                            <button
                                                onClick={() => setShowFreeChat(true)}
                                                className="py-4 px-2 border border-zinc-700/60 bg-zinc-900/60 hover:bg-emerald-950/30 hover:border-emerald-500/60 text-zinc-500 hover:text-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all duration-300 flex flex-col items-center justify-center group rounded-sm"
                                            >
                                                <span className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-300 text-zinc-400 group-hover:text-emerald-400 drop-shadow-md">⌨</span>
                                                <span className="text-[10px] font-mono font-bold uppercase tracking-widest">Manual</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-3 items-stretch h-14 animate-in slide-in-from-bottom-2 duration-300">
                                            <button
                                                onClick={() => setShowFreeChat(false)}
                                                className="w-14 shrink-0 flex items-center justify-center border border-zinc-700/60 bg-black/60 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors rounded-sm shadow-md"
                                            >
                                                ✕
                                            </button>
                                            <div className="flex-1 bg-black/80 border border-zinc-700/80 focus-within:border-emerald-500/70 focus-within:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all flex items-center px-6 rounded-sm">
                                                <span className="text-emerald-500/60 mr-3 font-mono text-base font-bold animate-pulse">{'>'}</span>
                                                <input
                                                    ref={inputRef}
                                                    type="text"
                                                    value={inputValue}
                                                    onChange={(e) => setInputValue(e.target.value)}
                                                    onKeyDown={handleKeyDown}
                                                    disabled={isSending}
                                                    placeholder="输入自定义指令或对话信号..."
                                                    className="w-full bg-transparent text-emerald-50 placeholder-zinc-600 outline-none font-mono text-[13px] tracking-wider"
                                                />
                                            </div>
                                            <button
                                                onClick={handleSend}
                                                disabled={isSending || !inputValue.trim()}
                                                className="px-8 bg-emerald-600/15 border border-emerald-500/50 text-emerald-400 font-bold hover:bg-emerald-500 hover:text-zinc-950 hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 font-mono text-[11px] tracking-[0.2em] uppercase rounded-sm"
                                            >
                                                Transmit
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'inventory' && (
                            <div className="flex flex-col h-full bg-black/40">
                                {/* 货舱头部信息 */}
                                <div className="p-8 border-b border-zinc-800/80 bg-zinc-900/60 flex justify-between items-end shrink-0 relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-blue-500/0 via-blue-500/30 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 flex items-center justify-center bg-blue-950/40 border border-blue-500/40 rounded-md shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                                            <span className="text-3xl text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]">🎒</span>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-mono uppercase tracking-widest text-zinc-100 font-bold mb-1.5 drop-shadow-md">货舱存储协议 (STORAGE_DECK)</h3>
                                            <div className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase bg-black/50 px-3 py-1 rounded-sm border border-zinc-800/50 inline-block">
                                                已用空间: <span className="text-blue-400 font-bold">{(npc.dynamic.inventory || []).length}</span> / 10 UNITS
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* NPC 货舱列表 */}
                                <div className="flex-1 p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                        {(npc.dynamic.inventory || []).length > 0 ? (
                                            npc.dynamic.inventory.map((item: ItemInstance, idx: number) => (
                                                <div key={item.instanceId || idx} className="flex items-center justify-between border border-zinc-800/80 bg-zinc-900/50 p-4 hover:border-zinc-500 hover:bg-zinc-800/60 transition-all duration-300 group rounded-md relative overflow-hidden shadow-sm">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/30 group-hover:bg-blue-500/60 transition-colors"></div>
                                                    <div className="flex items-center gap-4 pl-3">
                                                        <div className={`w-12 h-12 flex items-center justify-center bg-black/80 border ${'rarity' in item && item.rarity === 'rare' ? 'border-blue-500/60 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.3)]' : 'border-zinc-700 text-zinc-400'} rounded-sm text-xl`}>
                                                            {isEquipmentItem(item.type) ? '⚔️' : item.type === 'consumable' ? '💊' : item.type === 'document' ? '📄' : '📦'}
                                                        </div>
                                                        <div>
                                                            <div className={`text-sm font-bold tracking-wide ${'rarity' in item && item.rarity === 'rare' ? 'text-blue-300 drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]' : 'text-zinc-100'}`}>{item.name}</div>
                                                            <div className="text-[9px] text-zinc-500 font-mono uppercase mt-1 tracking-widest">{item.type}</div>
                                                        </div>
                                                    </div>
                                                    {isRecruited ? (
                                                        <button
                                                            onClick={() => onTakeItem(item)}
                                                            className="px-5 py-2.5 border border-zinc-700 bg-zinc-950/60 text-[10px] font-mono tracking-widest text-zinc-300 hover:text-blue-400 hover:border-blue-500 hover:bg-blue-950/40 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all rounded-sm z-10 uppercase"
                                                        >
                                                            提取
                                                        </button>
                                                    ) : (
                                                        <span className="text-[9px] text-red-400 font-mono border border-red-900/50 bg-red-950/30 px-3 py-1.5 uppercase rounded-sm tracking-widest">LOCKED</span>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-span-full py-24 flex flex-col items-center border border-dashed border-zinc-800/80 bg-zinc-900/20 rounded-md">
                                                <span className="text-6xl mb-6 opacity-20 text-blue-500">📦</span>
                                                <span className="text-[11px] font-mono tracking-widest text-zinc-500 uppercase bg-black/40 px-4 py-2 rounded-sm border border-zinc-800">当前存储模块为空</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 转移物品底栏 */}
                                <div className="p-6 border-t border-zinc-800/80 bg-zinc-950/95 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                                    <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-emerald-500/60 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></span>
                                        背囊转移 (TRANSFER_FROM_PLAYER)
                                    </div>
                                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                                        {(player.dynamic.inventory || []).map((item: ItemInstance) => (
                                            <button
                                                key={item.instanceId}
                                                onClick={() => onGift(item)}
                                                className="flex items-center gap-3 px-5 py-3 border border-zinc-700/60 bg-black/60 text-[11px] text-zinc-300 hover:text-emerald-400 hover:border-emerald-500/70 hover:bg-emerald-950/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all font-mono shrink-0 group rounded-md"
                                            >
                                                <span>{item.name}</span>
                                                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">➜</span>
                                            </button>
                                        ))}
                                        {(player.dynamic.inventory || []).length === 0 && (
                                            <span className="text-[10px] text-zinc-600 font-mono italic px-5 py-3 border border-dashed border-zinc-800 rounded-sm bg-black/40">背囊无可用物资</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SocializationPanel;