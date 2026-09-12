import React, { useState, useEffect, useMemo, memo } from 'react';
import { PlayerState, Item, ItemInstance, Sanctuary, Node, Entity, NpcTemplate, NpcDynamicState, Facility, Resident, SanctuaryState, SanctuaryEvent, SanctuaryEventChange } from '../meta';
import { RARITY_MAP } from '../constants';
import { AudioService } from '../services';

interface SanctuaryPanelProps {
    player: PlayerState;
    sanctuary: Sanctuary;
    onRest: (hours: number) => void;
    onUseMedicine?: (amount?: number) => void;
    onOrganizeStorage?: () => void;
    onTransferItem?: (item: ItemInstance, target: 'inventory' | 'storage') => void;
    onDepart: () => void;
    onClose?: () => void;
    getStorageCapacity?: () => number;
    getCustomRestConfig?: (hours: number) => any;
    morale?: number;
    isLowMorale?: boolean;
    maxStorage: number;
    // 设施系统
    facilities?: Facility[];
    dailyProduction?: Partial<SanctuaryState>;
    onFacilityUpgrade?: (facilityId: string, scrapCost: number, success?: boolean) => void;
    /** LLM 裁决升级消耗：返回应扣除的废料数（回调内自带降级公式）。 */
    onFacilityUpgradePriced?: (facilityId: string) => Promise<number>;
    // 居民池
    residents?: Resident[];
    // 事件系统
    sanctuaryEvent?: SanctuaryEvent | null;
    isGeneratingEvent?: boolean;
    onRequestEvent?: () => void;
    onResolveEvent?: (choiceIndex: number) => void;
}

interface LayoutNode {
    id: string;
    data: Node;
    depth: number;
    isVisited: boolean;
}

const ICONS = {
    food: <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>,
    water: <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>,
    med: <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>,
    consumable: <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>,
    power: <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>,
    scrap: <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
    pop: <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
    weapon: <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"></path><path d="M13 19l6-6"></path><path d="M16 16l4 4"></path><path d="M19 21l2-2"></path></svg>,
    armor: <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>,
    accessory: <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="3"></circle></svg>,
    document: <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
    audio: <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>,
    material: <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"></polygon><line x1="12" y1="22" x2="12" y2="15.5"></line><polyline points="22 8.5 12 15.5 2 8.5"></polyline><polyline points="2 15.5 12 8.5 22 15.5"></polyline><line x1="12" y1="2" x2="12" y2="8.5"></line></svg>,
    default: <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
};

const QUICK_TIME_BUTTONS = [1, 3, 6, 12, 18, 24];

const CyberStyles = () => (
    <style>{`
        .cyber-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .cyber-scrollbar::-webkit-scrollbar-track { background: rgba(5, 5, 5, 0.9); border-left: 1px solid rgba(245, 158, 11, 0.1); }
        .cyber-scrollbar::-webkit-scrollbar-thumb { background: rgba(245, 158, 11, 0.3); }
        .cyber-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(245, 158, 11, 0.8); }
        
        .crt-scanline {
            position: absolute; top: 0; left: 0; width: 100%; height: 12px;
            background: linear-gradient(to bottom, transparent, rgba(245, 158, 11, 0.15), transparent);
            animation: scanline 6s linear infinite; pointer-events: none; z-index: 50;
        }
        @keyframes scanline { 0% { transform: translateY(-100vh); } 100% { transform: translateY(100vh); } }
        
        .tech-clip { clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px); }
        .tech-clip-rev { clip-path: polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px)); }
        
        .cyber-borders::before, .cyber-borders::after {
            content: ''; position: absolute; width: 8px; height: 8px; border-color: rgba(245, 158, 11, 0.6); transition: all 0.3s ease;
        }
        .cyber-borders::before { top: 0; left: 0; border-top: 2px solid; border-left: 2px solid; }
        .cyber-borders::after { bottom: 0; right: 0; border-bottom: 2px solid; border-right: 2px solid; }
        .group:hover .cyber-borders::before, .group:hover .cyber-borders::after { width: 16px; height: 16px; border-color: rgba(245, 158, 11, 1); }
        
        .grid-bg {
            background-image: linear-gradient(rgba(245, 158, 11, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(245, 158, 11, 0.05) 1px, transparent 1px);
            background-size: 20px 20px;
        }

        .glitch-text { position: relative; }
        .glitch-text::before, .glitch-text::after {
            content: attr(data-text); position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.8; pointer-events: none;
        }
        .glitch-text::before {
            left: 2px; text-shadow: -1px 0 rgba(239, 68, 68, 0.7);
            clip: rect(24px, 550px, 90px, 0); animation: glitch-anim-2 3s infinite linear alternate-reverse;
        }
        .glitch-text::after {
            left: -2px; text-shadow: -1px 0 rgba(59, 130, 246, 0.7);
            clip: rect(85px, 550px, 140px, 0); animation: glitch-anim 2.5s infinite linear alternate-reverse;
        }
        @keyframes glitch-anim {
            0% { clip: rect(10px, 9999px, 44px, 0); }
            20% { clip: rect(70px, 9999px, 90px, 0); }
            40% { clip: rect(30px, 9999px, 50px, 0); }
            60% { clip: rect(90px, 9999px, 100px, 0); }
            80% { clip: rect(20px, 9999px, 80px, 0); }
            100% { clip: rect(50px, 9999px, 60px, 0); }
        }
        @keyframes glitch-anim-2 {
            0% { clip: rect(65px, 9999px, 100px, 0); }
            20% { clip: rect(10px, 9999px, 30px, 0); }
            40% { clip: rect(80px, 9999px, 95px, 0); }
            60% { clip: rect(25px, 9999px, 55px, 0); }
            80% { clip: rect(5px, 9999px, 20px, 0); }
            100% { clip: rect(40px, 9999px, 70px, 0); }
        }
    `}</style>
);

const CyberStatBar = memo(({ label, value, max, color, subLabel }: { label: string; value: number; max: number; color: string; subLabel?: string }) => {
    const percent = Math.max(0, Math.min(100, (value / max) * 100));
    const segments = 24;
    const filledSegments = Math.round((percent / 100) * segments);
    const bgColor = color.replace('text-', 'bg-');

    return (
        <div className="w-full group">
            <div className="flex justify-between items-end mb-1 relative">
                <span className="text-[9px] font-mono text-amber-600/80 uppercase tracking-[0.2em]">{label}</span>
                <span className={`text-[11px] font-mono font-bold ${color} drop-shadow-[0_0_3px_currentColor]`}>
                    {value.toFixed(0)} <span className="opacity-40 text-[9px] font-normal">/ {max}</span>
                </span>
            </div>
            <div className="flex gap-[2px] h-2 w-full mt-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                {Array.from({ length: segments }).map((_, i) => {
                    const isFilled = i < filledSegments;
                    const isEdge = i === filledSegments - 1;
                    return (
                        <div key={i} className={`flex-1 transition-all duration-300 transform -skew-x-[20deg]
                            ${isFilled ? bgColor : 'bg-gray-800/40'}
                            ${isEdge ? 'shadow-[0_0_10px_currentColor] brightness-150 animate-[pulse_1s_infinite]' : ''}
                            ${!isFilled ? 'opacity-30' : 'opacity-100'}`}
                        />
                    );
                })}
            </div>
            {subLabel && <div className="text-[7px] text-gray-500/60 mt-1 font-mono text-right tracking-widest">{subLabel}</div>}
        </div>
    );
});

const ResourceCard = ({ label, value, iconType, unit }: { label: string; value: number; iconType: keyof typeof ICONS; unit: string }) => (
    <div className="bg-[#08080a]/90 border border-amber-900/30 p-3.5 relative group hover:bg-[#0c0c0f] hover:border-amber-600/60 transition-all tech-clip overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(245,158,11,0.03)_50%,transparent_75%)] bg-[length:250%_250%,100%_100%] animate-[bg-pan_3s_linear_infinite] opacity-0 group-hover:opacity-100"></div>
        <div className="cyber-borders"></div>

        <div className="flex justify-between items-start mb-2 relative z-10">
            <div className="w-5 h-5 text-amber-700/60 group-hover:text-amber-400 transition-colors drop-shadow-[0_0_5px_rgba(245,158,11,0)] group-hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]">
                {ICONS[iconType] || ICONS.default}
            </div>
            <span className="text-[7px] font-mono text-amber-800 uppercase tracking-tighter group-hover:text-amber-500 transition-colors bg-black/40 px-1 border border-amber-900/30">SYS_{label.slice(0, 3)}</span>
        </div>

        <div className="text-2xl font-mono text-amber-400 font-bold tracking-tight relative z-10 drop-shadow-[0_0_3px_rgba(245,158,11,0.3)]">{Math.floor(value)}</div>

        <div className="flex items-center justify-between mt-1.5 relative z-10 border-t border-amber-900/20 pt-1.5">
            <span className="text-[8px] font-mono text-amber-600 uppercase tracking-widest">{label}</span>
            <span className="text-[7px] font-mono text-gray-600">{unit}</span>
        </div>
    </div>
);

const ItemRow = memo(({ item, actionLabel, onClick, isStorage }: { item: ItemInstance; actionLabel: string; onClick: () => void; isStorage?: boolean }) => {
    const icon = ICONS[item.type as keyof typeof ICONS] || ICONS.default;

    return (
        <div
            data-rarity={item.rarity}
            data-intensity={RARITY_MAP[item.rarity].intensity}
            style={{ ...RARITY_MAP[item.rarity].vars } as React.CSSProperties}
            className="rarity-cell flex items-center justify-between p-2.5 mb-2 transition-all tech-clip group border-l-2 hover:pl-4 cursor-pointer relative overflow-hidden bg-black/40 hover:bg-[#0a0a0c] border border-transparent"
            onClick={() => { AudioService.playSfx('ui_click'); onClick(); }}
        >
            <div className="absolute top-0 left-0 w-[2px] h-full [background-color:var(--r-base)] group-hover:w-full group-hover:opacity-10 transition-all duration-300"></div>

            <div className="flex items-center gap-3 min-w-0 flex-1 relative z-10">
                <div className="w-7 h-7 flex items-center justify-center bg-black/80 border border-current/30 p-1.5 [color:var(--r-text)] shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] tech-clip">
                    {icon}
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-bold font-mono truncate group-hover:text-white transition-colors [color:var(--r-text)]">{item.name}</span>
                    <span className="text-[8px] text-gray-500 uppercase tracking-wider mt-0.5">{item.type}</span>
                </div>
            </div>

            <button className="relative z-10 ml-3 px-2.5 py-1.5 text-[8px] font-mono border border-current/40 [color:var(--r-text)] hover:bg-current hover:text-black transition-all uppercase tracking-widest font-bold">
                {actionLabel}
            </button>
        </div>
    );
});

const CompanionCard = ({ npc }: { npc: Entity<NpcTemplate, NpcDynamicState> }) => {
    const { vital } = npc.static.initialState;
    return (
        <div className="bg-[#050508]/90 border border-amber-900/40 p-5 hover:border-amber-500/60 transition-all group relative overflow-hidden tech-clip-rev shadow-lg hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]">
            <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/10 to-transparent pointer-events-none transform rotate-45 translate-x-16 -translate-y-16 group-hover:from-amber-500/20 transition-all"></div>

            <div className="absolute top-3 right-3 border border-emerald-900/50 text-emerald-500 text-[7px] px-1.5 py-0.5 bg-emerald-950/30 flex items-center gap-1.5">
                <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse"></span> ACTIVE
            </div>

            <div className="flex-1 min-w-0 relative z-10">
                <div className="flex items-center gap-4 mb-5 border-b border-amber-900/30 pb-4">
                    <div className="w-12 h-12 bg-black border-2 border-amber-800 flex items-center justify-center text-amber-600/40 text-2xl font-serif tech-clip relative">
                        <div className="absolute inset-0 bg-[linear-gradient(0deg,transparent_0%,rgba(245,158,11,0.1)_50%,transparent_100%)] animate-[scanline_2s_linear_infinite]"></div>
                        {npc.static.name.charAt(0)}
                    </div>
                    <div>
                        <div className="text-[8px] font-mono text-amber-700 uppercase tracking-widest bg-amber-950/30 inline-block px-1 mb-1 border border-amber-900/50">{npc.static.style || 'UNKNOWN'} OP</div>
                        <div className="text-sm font-bold text-amber-300 tracking-wider truncate uppercase drop-shadow-[0_0_5px_rgba(245,158,11,0.4)]">{npc.static.name}</div>
                    </div>
                </div>
                <div className="space-y-3">
                    <CyberStatBar label="Integrity" value={npc.dynamic.hp} max={vital.maxHp} color="text-emerald-400" />
                    <CyberStatBar label="Sanity" value={npc.dynamic.sanity} max={vital.maxSanity} color="text-blue-400" />
                    <CyberStatBar label="Trust Link" value={npc.dynamic.trust || 0} max={100} color="text-amber-400" />
                </div>
            </div>
        </div>
    );
};

const RestModeSelector: React.FC<Pick<SanctuaryPanelProps, 'player' | 'onRest' | 'getCustomRestConfig'>> = ({ player, onRest, getCustomRestConfig }) => {
    const [selectedHours, setSelectedHours] = useState(8);
    const [previewConfig, setPreviewConfig] = useState<any | null>(null);

    useEffect(() => {
        if (getCustomRestConfig) setPreviewConfig(getCustomRestConfig(selectedHours));
    }, [selectedHours, getCustomRestConfig]);

    const handleStartRest = () => {
        if (previewConfig) {
            AudioService.playSfx('ui_click');
            onRest(selectedHours);
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-[#08080a] border border-amber-900/40 p-5 tech-clip relative group">
                <div className="cyber-borders"></div>
                <div className="flex items-center justify-between mb-5 border-b border-amber-900/30 pb-2.5">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-amber-500 animate-[ping_2s_infinite]"></div>
                        <h3 className="text-[10px] font-mono text-amber-400 tracking-[0.2em] uppercase font-bold">Set Cycle</h3>
                    </div>
                    <span className="text-[8px] text-amber-800 font-mono border border-amber-900/50 px-1 bg-black/50">INPUT_REQ</span>
                </div>

                <div className="space-y-5">
                    <div className="flex items-center gap-4">
                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest w-8">Time</span>
                        <div className="flex-1 relative h-2 bg-gray-900 overflow-hidden border border-gray-800">
                            <div className="absolute top-0 left-0 h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)] transition-all duration-300" style={{ width: `${(selectedHours / 24) * 100}%` }}></div>
                            <input
                                type="range" min="1" max="24" value={selectedHours}
                                onChange={(e) => setSelectedHours(Number(e.target.value))}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
                            />
                        </div>
                        <div className="w-14 h-7 bg-black border border-amber-500/50 flex items-center justify-center text-amber-400 font-mono text-sm shadow-[0_0_10px_rgba(245,158,11,0.15)] font-bold">
                            {selectedHours}H
                        </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        {QUICK_TIME_BUTTONS.map(hours => (
                            <button
                                key={hours} onClick={() => { AudioService.playSfx('ui_click'); setSelectedHours(hours); }}
                                className={`flex-1 py-1.5 text-[10px] font-mono border transition-all tech-clip-rev ${selectedHours === hours
                                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                                    : 'bg-black/50 border-gray-800 text-gray-500 hover:border-amber-900/80 hover:text-amber-200'
                                    }`}
                            >
                                {hours.toString().padStart(2, '0')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {previewConfig && (
                <div className="bg-[#050508] border border-blue-900/40 p-4.5 relative tech-clip-rev">
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none"></div>
                    <div className="flex items-center gap-2 mb-4 border-b border-blue-900/40 pb-2.5">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-sm"></div>
                        <h3 className="text-[10px] font-mono text-blue-400 tracking-[0.2em] uppercase font-bold">Projection</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-x-5 gap-y-2.5 text-[9px] font-mono relative z-10">
                        <div className="flex justify-between border-b border-gray-900/60 pb-1"><span className="text-gray-500">FOOD_DRAIN:</span><span className="text-amber-500/90 font-bold">-{previewConfig.foodConsumption?.toFixed(1) || 0}</span></div>
                        <div className="flex justify-between border-b border-gray-900/60 pb-1"><span className="text-gray-500">H2O_DRAIN:</span><span className="text-blue-400/90 font-bold">-{previewConfig.waterConsumption?.toFixed(1) || 0}</span></div>
                        <div className="flex justify-between border-b border-gray-900/60 pb-1"><span className="text-gray-500">PWR_DRAIN:</span><span className="text-yellow-500/90 font-bold">-{previewConfig.electricityConsumption?.toFixed(1) || 0}</span></div>
                        <div className="flex justify-between border-b border-gray-900/60 pb-1"><span className="text-gray-500">NRV_DMG:</span><span className="text-red-500/90 font-bold">-{previewConfig.neuralDamage || 0}</span></div>
                    </div>

                    <div className="mt-3.5 pt-3.5 border-t border-emerald-900/40 relative z-10">
                        <div className="grid grid-cols-2 gap-x-5 gap-y-2.5 text-[9px] font-mono">
                            {/* 与 useSanctuary.recoverDynamic 的结算口径一致：恢复量基于动态上限（含装备加成） */}
                            <div className="flex justify-between"><span className="text-gray-500">HP_REGEN:</span><span className="text-emerald-400 font-bold">+{Math.floor(player.dynamic.maxHp * (previewConfig.hpRecovery || 0))}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">SAN_REGEN:</span><span className="text-blue-300 font-bold">+{Math.floor(player.dynamic.maxSanity * (previewConfig.sanityRecovery || 0))}</span></div>
                            <div className="flex justify-between col-span-2 mt-1.5 bg-black/40 p-1.5 border border-gray-800">
                                <span className="text-gray-500">SYSTEM_EFFICIENCY:</span>
                                <span className={`font-bold ${(previewConfig.efficiency || 0) >= 0.9 ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]' : (previewConfig.efficiency || 0) >= 0.7 ? 'text-amber-400' : 'text-red-400'}`}>
                                    {Math.floor((previewConfig.efficiency || 0) * 100)}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <button
                onClick={handleStartRest} disabled={!previewConfig}
                className={`w-full py-3.5 border text-[11px] font-mono uppercase tracking-[0.3em] transition-all relative overflow-hidden group tech-clip ${previewConfig
                    ? 'border-amber-500 bg-amber-950/50 text-amber-300 hover:bg-amber-500 hover:text-black shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                    : 'border-gray-800 bg-black/60 text-gray-700 cursor-not-allowed'
                    }`}
            >
                <span className="relative z-10 font-bold">{previewConfig ? `INITIATE_SLEEP [${selectedHours}H]` : 'AWAITING_INPUT'}</span>
                {previewConfig && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>}
            </button>
        </div>
    );
};

const OverviewSection: React.FC<Pick<SanctuaryPanelProps, 'player' | 'sanctuary' | 'morale' | 'isLowMorale' | 'onRest' | 'onUseMedicine' | 'onDepart' | 'getCustomRestConfig'>> = ({
    player, sanctuary, morale = 0, isLowMorale = false, onRest, onUseMedicine, onDepart, getCustomRestConfig
}) => (
    <div className="flex flex-col h-full overflow-y-auto cyber-scrollbar p-6 lg:p-10 relative">
        <div className="text-center mb-10 relative">
            <h2 className="text-4xl md:text-5xl font-black text-amber-500 font-sans tracking-[0.2em] mb-3 drop-shadow-[0_0_15px_rgba(245,158,11,0.7)] glitch-text uppercase" data-text={sanctuary?.name || "SECTOR ZERO"}>
                {sanctuary?.name || "SECTOR ZERO"}
            </h2>
            <div className="flex items-center justify-center gap-4 text-amber-700 font-mono text-[10px] tracking-[0.5em]">
                <span className="w-16 h-[1px] bg-amber-800/80"></span>
                <span>SECURE_ZONE // CMD_NODE</span>
                <span className="w-16 h-[1px] bg-amber-800/80"></span>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto w-full relative z-10">
            {/* 左侧面板 */}
            <div className="flex flex-col gap-6 lg:col-span-7">
                <div className="bg-[#08080a]/95 border border-amber-900/50 p-6 relative group tech-clip shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
                    <div className="cyber-borders"></div>
                    <div className="absolute top-0 right-0 p-4 opacity-5 font-mono text-7xl text-amber-500 font-black pointer-events-none select-none">BIO</div>
                    <div className="flex items-center justify-between mb-6 border-b border-amber-900/40 pb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-amber-500 animate-pulse"></div>
                            <h3 className="text-[11px] font-mono text-amber-400 tracking-[0.25em] uppercase font-bold">Operator Vitals</h3>
                        </div>
                        <span className="text-[9px] font-mono text-amber-600 bg-amber-950/30 border border-amber-900/60 px-2 py-0.5">ID: {player.static.id.slice(-6)}</span>
                    </div>
                    <div className="space-y-4">
                        <CyberStatBar label="Integrity" value={player.dynamic.hp} max={player.dynamic.maxHp} color="text-emerald-400" subLabel="PHYSICAL_H" />
                        <CyberStatBar label="Sanity" value={player.dynamic.sanity} max={player.dynamic.maxSanity} color="text-blue-400" subLabel="NEURAL_STB" />
                        <CyberStatBar label="Stamina" value={player.dynamic.stamina} max={player.dynamic.maxStamina} color="text-amber-500" subLabel="ENDURANCE" />
                        <CyberStatBar label="Vigor" value={player.dynamic.vigor} max={player.dynamic.maxVigor} color="text-purple-400" subLabel="FOCUS_LVL" />
                        <CyberStatBar label="Battery" value={player.neuralLink.battery} max={player.neuralLink.maxBattery} color="text-yellow-500" subLabel="PWR_RESERVE" />
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <ResourceCard label="Food" value={sanctuary?.food || 0} iconType="food" unit="Unt" />
                    <ResourceCard label="Water" value={sanctuary?.water || 0} iconType="water" unit="Ltr" />
                    <ResourceCard label="Med" value={sanctuary?.medicine || 0} iconType="med" unit="Dos" />
                    <ResourceCard label="Power" value={sanctuary?.electricity || 0} iconType="power" unit="KW/h" />
                    <ResourceCard label="Scrap" value={sanctuary?.scraps || 0} iconType="scrap" unit="Pcs" />
                    <ResourceCard label="Pop" value={sanctuary?.population || 0} iconType="pop" unit="Lvng" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="bg-[#050508]/90 border border-amber-900/50 p-5 flex flex-col items-center justify-center relative overflow-hidden group tech-clip shadow-lg">
                        <div className="absolute inset-0 bg-gradient-to-t from-amber-900/15 to-transparent"></div>
                        <div className="text-[9px] font-mono text-amber-600/80 uppercase tracking-[0.25em] mb-3 font-bold">Sanctuary Morale</div>
                        <div className={`text-5xl font-mono font-black tracking-tighter ${isLowMorale ? 'text-red-500 animate-pulse drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]'}`}>{morale.toFixed(1)}</div>
                        <div className={`text-[8px] font-mono mt-3 px-2.5 py-1 border ${isLowMorale ? 'text-red-400 bg-red-950/50 border-red-900/50' : 'text-emerald-500 bg-emerald-950/30 border-emerald-900/40'}`}>{isLowMorale ? 'WARN: MORALE_COLLAPSE' : 'SYS_STABLE'}</div>
                    </div>
                    <div className="bg-[#050508]/90 border border-amber-900/50 p-5 flex flex-col items-center justify-center relative overflow-hidden group tech-clip-rev shadow-lg">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.08)_0%,transparent_70%)]"></div>
                        <div className="text-[9px] font-mono text-amber-600/80 uppercase tracking-[0.25em] mb-3 font-bold">Erosion Index</div>
                        <div className={`text-5xl font-mono font-black tracking-tighter ${(sanctuary?.erosion || 0) > 50 ? 'text-purple-400 drop-shadow-[0_0_15px_rgba(147,51,234,0.6)]' : 'text-blue-500/80 drop-shadow-[0_0_10px_rgba(59,130,246,0.2)]'}`}>{(sanctuary?.erosion || 0).toFixed(1)}%</div>
                        <div className={`text-[8px] font-mono mt-3 px-2.5 py-1 border ${(sanctuary?.erosion || 0) > 50 ? 'text-purple-400 bg-purple-950/50 border-purple-900/50' : 'text-blue-500 bg-blue-950/30 border-blue-900/40'}`}>{(sanctuary?.erosion || 0) > 50 ? 'CRIT: CONTAMINATION' : 'MIN_INTERFERENCE'}</div>
                    </div>
                </div>
            </div>

            {/* 右侧面板 */}
            <div className="flex flex-col h-full lg:col-span-5">
                <div className="bg-[#08080a]/95 border border-amber-900/50 p-6 flex-1 flex flex-col relative tech-clip-rev shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
                    <div className="cyber-borders"></div>
                    <div className="absolute top-0 right-0 p-4 opacity-5 font-mono text-7xl text-amber-500 font-black pointer-events-none select-none">REST</div>
                    <div className="flex items-center gap-3 mb-6 border-b border-amber-900/40 pb-3">
                        <div className="w-2 h-2 bg-amber-500"></div>
                        <h3 className="text-[11px] font-mono text-amber-400 tracking-[0.25em] uppercase font-bold">Maintenance</h3>
                    </div>

                    <RestModeSelector player={player} onRest={onRest} getCustomRestConfig={getCustomRestConfig} />

                    <div className="mt-6 pt-6 border-t border-amber-900/30 relative z-10">
                        <div className="flex items-center justify-between mb-3.5">
                            <span className="text-[9px] font-mono text-amber-600 uppercase tracking-widest font-bold">Medical Override</span>
                            <span className="text-[8px] font-mono text-gray-500 bg-gray-900/80 px-1.5 py-0.5 border border-gray-700">COST: 1 MED</span>
                        </div>
                        <button
                            onClick={() => { AudioService.playSfx('ui_click'); onUseMedicine?.(1); }}
                            disabled={(sanctuary?.medicine || 0) <= 0}
                            className={`w-full py-3 flex items-center justify-center gap-2 border font-mono text-[10px] tracking-[0.2em] uppercase transition-all tech-clip font-bold ${(sanctuary?.medicine || 0) > 0 ? 'bg-emerald-950/30 border-emerald-700 text-emerald-400 hover:bg-emerald-900/60 hover:text-emerald-200 shadow-[inset_0_0_15px_rgba(16,185,129,0.15)]' : 'bg-black/60 border-gray-800 text-gray-600 cursor-not-allowed'}`}
                        >
                            <span className="w-3 h-3 block">{ICONS.med}</span><span>Emergency Heal</span>
                        </button>
                    </div>

                    <div className="mt-auto pt-10">
                        <button onClick={() => { AudioService.playSfx('ui_click'); onDepart(); }} className="w-full py-4 bg-amber-600/10 border border-amber-500/70 hover:bg-amber-500 hover:text-black hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] text-amber-400 font-black font-mono tracking-[0.5em] uppercase transition-all group relative overflow-hidden tech-clip">
                            <span className="relative z-10 block transform group-hover:scale-105 transition-transform duration-200">DEPART</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-[shimmer_1s_infinite]"></div>
                        </button>
                        <div className="text-center mt-4 flex items-center justify-center gap-2.5">
                            <span className="w-2 h-2 bg-red-500 rounded-sm animate-[ping_1.5s_infinite]"></span>
                            <span className="text-[8px] font-mono text-red-500/90 uppercase tracking-[0.2em] font-bold">WARN: HOSTILE_ENV</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const StorageSection: React.FC<Pick<SanctuaryPanelProps, 'player' | 'onTransferItem' | 'onOrganizeStorage' | 'maxStorage'>> = ({
    player, onTransferItem, onOrganizeStorage, maxStorage
}) => {
    const [filter, setFilter] = useState('all');

    const filteredInventory = useMemo(() =>
        (player.dynamic.inventory || []).filter(item => filter === 'all' || item.type === filter),
        [filter, player.dynamic.inventory]);

    const filteredStorage = useMemo(() =>
        (player.sanctuary.storage || []).filter(item => filter === 'all' || item.type === filter),
        [filter, player.sanctuary.storage]);

    const filters = ['all', 'weapon', 'armor', 'accessory', 'consumable', 'data', 'audio', 'material'];

    return (
        <div className="flex flex-col h-full p-6 lg:p-10 relative">
            <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none"></div>

            <div className="flex items-end justify-between mb-8 border-b border-amber-900/50 pb-5 relative z-10">
                <div>
                    <h3 className="text-3xl font-black text-amber-500 tracking-[0.15em] uppercase drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]">LOGISTICS</h3>
                    <div className="flex gap-2 mt-4 flex-wrap">
                        {filters.map(f => (
                            <button
                                key={f} onClick={() => { AudioService.playSfx('ui_click'); setFilter(f); }}
                                className={`text-[9px] font-mono px-3.5 py-1.5 uppercase border transition-all tech-clip font-bold ${filter === f ? 'border-amber-500 text-amber-300 bg-amber-900/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]' : 'border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300 bg-black/60'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex flex-col items-end gap-3.5">
                    <div className="text-[11px] font-mono text-amber-400 bg-amber-950/40 px-4 py-2 border border-amber-900/60 tech-clip-rev flex items-center gap-2 shadow-[inset_0_0_10px_rgba(245,158,11,0.1)]">
                        <span className="opacity-70">CAPACITY:</span>
                        <span className="font-bold text-amber-300">{(player.sanctuary.storage || []).length}/{maxStorage}</span>
                    </div>
                    {onOrganizeStorage && (
                        <button onClick={() => { AudioService.playSfx('ui_click'); onOrganizeStorage(); }} className="text-[9px] font-mono text-amber-600 hover:text-amber-300 border-b border-dashed border-amber-900/60 hover:border-amber-400 transition-colors uppercase tracking-widest font-bold">
                            EXEC_AUTO_SORT
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-10 min-h-0 relative z-10">
                {/* 个人背包 */}
                <div className="flex flex-col bg-[#050508]/85 border border-gray-800 relative tech-clip shadow-2xl group">
                    <div className="cyber-borders"></div>
                    <div className="px-5 py-3.5 bg-gray-900/80 border-b border-gray-800 flex justify-between items-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-gray-500"></div>
                        <span className="text-[11px] font-mono text-gray-300 uppercase tracking-[0.25em] font-bold ml-1">Local_Inv</span>
                        <span className="text-[10px] font-mono text-gray-400 bg-black/80 px-2 py-0.5 border border-gray-700">{(player.dynamic.inventory || []).length}/10</span>
                    </div>
                    <div className="flex-1 overflow-y-auto cyber-scrollbar p-4">
                        {filteredInventory.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-[11px] text-gray-600 font-mono italic opacity-60">
                                <span className="text-3xl mb-3">∅</span>
                                <span className="tracking-widest">{filter === 'all' ? 'EMPTY_SET' : `NO_${filter.toUpperCase()}`}</span>
                            </div>
                        ) : (
                            filteredInventory.map(item => <ItemRow key={item.instanceId} item={item} actionLabel="STORE >>" onClick={() => onTransferItem?.(item, 'storage')} />)
                        )}
                    </div>
                </div>

                {/* 仓库中心连线指示 */}
                <div className="flex flex-col flex-1 items-center justify-center -mx-5 z-20 pointer-events-none hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="w-10 h-10 rounded-full border-2 border-amber-900/60 bg-[#0a0a0c] flex items-center justify-center text-amber-600 text-sm shadow-[0_0_20px_rgba(0,0,0,0.9),inset_0_0_10px_rgba(245,158,11,0.2)]">⇄</div>
                </div>

                {/* 庇护所仓库 */}
                <div className="flex flex-col bg-[#08080a]/85 border border-amber-900/50 relative tech-clip-rev shadow-2xl group">
                    <div className="cyber-borders"></div>
                    <div className="px-5 py-3.5 bg-amber-950/30 border-b border-amber-900/50 flex justify-between items-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"></div>
                        <span className="text-[11px] font-mono text-amber-400 uppercase tracking-[0.25em] font-bold">Secure_Vault</span>
                        <span className="text-[9px] font-mono text-amber-600 border border-amber-900/60 px-2 py-0.5 bg-black/70 tracking-widest">ENCRYPTED</span>
                    </div>
                    <div className="flex-1 overflow-y-auto cyber-scrollbar p-4">
                        {filteredStorage.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-[11px] text-amber-900/50 font-mono italic">
                                <span className="text-3xl mb-3">∅</span>
                                <span className="tracking-widest">VAULT_EMPTY</span>
                            </div>
                        ) : (
                            filteredStorage.map(item => <ItemRow key={item.instanceId} item={item} actionLabel="<< TAKE" onClick={() => onTransferItem?.(item, 'inventory')} isStorage />)
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const CompanionsSection: React.FC<Pick<SanctuaryPanelProps, 'player'>> = ({ player }) => (
    <div className="flex flex-col h-full p-6 lg:p-10 overflow-y-auto cyber-scrollbar relative">
        <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none"></div>

        <div className="mb-8 border-b border-amber-900/50 pb-5 relative z-10">
            <h3 className="text-3xl font-black text-amber-500 tracking-[0.15em] uppercase drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]">PERSONNEL_FILES</h3>
            <p className="text-[10px] font-mono text-amber-700/90 mt-2.5 tracking-widest">ACTIVE_SQUAD_MEMBERS: <span className="text-amber-400 font-bold">{player.companions.length}</span></p>
        </div>

        {player.companions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-700 border border-dashed border-gray-800 bg-[#050508]/60 p-10 tech-clip">
                <div className="w-12 h-12 mb-5 opacity-20 text-gray-600">{ICONS.pop}</div>
                <p className="text-[11px] font-mono tracking-[0.2em] uppercase font-bold text-gray-600">NO_COMPANION_DATA_FOUND</p>
                <p className="text-[9px] font-mono mt-2.5 opacity-50 uppercase tracking-widest">Explore sector to recruit survivors.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                {player.companions.map(c => <CompanionCard key={c.static.id} npc={c} />)}
            </div>
        )}
    </div>
);

const FacilitiesSection: React.FC<Pick<SanctuaryPanelProps, 'facilities' | 'dailyProduction' | 'onFacilityUpgrade' | 'onFacilityUpgradePriced' | 'sanctuary'>> = ({ facilities, dailyProduction, onFacilityUpgrade, onFacilityUpgradePriced, sanctuary }) => {
    const list = facilities ?? sanctuary?.facility ?? [];
    const production = dailyProduction ?? {};
    const scraps = sanctuary?.scraps ?? 0;

    const [pricingId, setPricingId] = useState<string | null>(null);
    const [pendingCost, setPendingCost] = useState<{ facilityId: string; cost: number } | null>(null);

    /** 触发升级：有 LLM 定价能力时先裁决消耗，玩家确认后再扣费。 */
    const handleUpgradeClick = async (facilityId: string, formulaCost: number) => {
        AudioService.playSfx('ui_click');
        if (!onFacilityUpgradePriced) {
            // 无定价能力（未接线）：直接按引擎公式升级。
            onFacilityUpgrade?.(facilityId, formulaCost);
            return;
        }
        setPricingId(facilityId);
        setPendingCost(null);
        try {
            const cost = await onFacilityUpgradePriced(facilityId);
            setPendingCost({ facilityId, cost });
        } catch {
            setPendingCost({ facilityId, cost: formulaCost });
        } finally {
            setPricingId(null);
        }
    };

    return (
        <div className="flex flex-col h-full p-6 lg:p-10 overflow-y-auto cyber-scrollbar relative">
            <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none"></div>

            <div className="mb-8 border-b border-amber-900/50 pb-5 relative z-10">
                <h3 className="text-3xl font-black text-amber-500 tracking-[0.15em] uppercase drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]">FACILITY_GRID</h3>
                <p className="text-[10px] font-mono text-amber-700/90 mt-2.5 tracking-widest">DAILY_PRODUCTION_SUMMARY:</p>
                <div className="flex flex-wrap gap-2 mt-3">
                    {Object.entries(production).length === 0 ? (
                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">No active production.</span>
                    ) : Object.entries(production).map(([key, value]) => (
                        <span key={key} className={`text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 border tech-clip ${Number(value) >= 0 ? 'text-emerald-400 border-emerald-900/50 bg-emerald-950/30' : 'text-red-400 border-red-900/50 bg-red-950/30'}`}>
                            {key} {Number(value) >= 0 ? '+' : ''}{value}/day
                        </span>
                    ))}
                </div>
            </div>

            {list.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-700 border border-dashed border-gray-800 bg-[#050508]/60 p-10 tech-clip">
                    <div className="w-12 h-12 mb-5 opacity-20 text-gray-600">{ICONS.scrap}</div>
                    <p className="text-[11px] font-mono tracking-[0.2em] uppercase font-bold text-gray-600">NO_FACILITY_RECORD_FOUND</p>
                    <p className="text-[9px] font-mono mt-2.5 opacity-50 uppercase tracking-widest">Reclaim infrastructure to enable production.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                    {list.map(f => {
                        const prodEntries = Object.entries(f.production ?? {});
                        return (
                            <div key={f.id} className="border border-amber-900/40 bg-[#07080a]/90 p-5 tech-clip relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent"></div>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h4 className="text-sm font-black text-amber-400 tracking-wider uppercase">{f.name}</h4>
                                        <p className="text-[8px] font-mono text-gray-500 mt-1.5 uppercase tracking-widest">Lv.{f.level} · {f.nodeMounted}</p>
                                    </div>
                                    <span className="text-[10px] font-mono text-amber-500 border border-amber-800/60 px-2 py-0.5 tech-clip shrink-0">LV.{f.level}</span>
                                </div>
                                <p className="text-[10px] font-mono text-gray-400 leading-relaxed mt-3 min-h-[36px]">{f.desc}</p>
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                    {prodEntries.length === 0 ? (
                                        <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">No production</span>
                                    ) : prodEntries.map(([key, value]) => (
                                        <span key={key} className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 border ${Number(value) >= 0 ? 'text-emerald-400 border-emerald-900/50' : 'text-red-400 border-red-900/50'}`}>
                                            {key} {Number(value) >= 0 ? '+' : ''}{value}
                                        </span>
                                    ))}
                                </div>
                                {onFacilityUpgrade && (
                                    pricingId === f.id ? (
                                        <button
                                            disabled
                                            className="mt-4 w-full py-2.5 flex items-center justify-center gap-2 border border-amber-800 bg-black/60 text-amber-600 font-mono text-[9px] tracking-[0.2em] uppercase transition-all tech-clip font-bold cursor-wait"
                                        >
                                            <span className="animate-pulse">ARCHITECT_PRICING...</span>
                                        </button>
                                    ) : pendingCost?.facilityId === f.id ? (
                                        <div className="mt-4 w-full space-y-2">
                                            <p className="text-[9px] font-mono tracking-widest text-amber-400 uppercase text-center border border-amber-800/60 bg-amber-950/30 px-2 py-1.5 tech-clip">
                                                LLM 裁决：升级消耗 <span className="text-amber-200 font-bold">{pendingCost.cost} SCRAPS</span>
                                            </p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => { AudioService.playSfx('ui_click'); onFacilityUpgrade(f.id, pendingCost.cost); setPendingCost(null); }}
                                                    disabled={scraps < pendingCost.cost}
                                                    className={`flex-1 py-2 text-[9px] font-mono tracking-[0.2em] uppercase font-bold border tech-clip transition-all ${scraps >= pendingCost.cost ? 'bg-amber-950/30 border-amber-700 text-amber-400 hover:bg-amber-900/60 hover:text-amber-200' : 'bg-black/60 border-gray-800 text-gray-600 cursor-not-allowed'}`}
                                                >
                                                    确认升级
                                                </button>
                                                <button
                                                    onClick={() => { AudioService.playSfx('ui_click'); setPendingCost(null); }}
                                                    className="flex-1 py-2 text-[9px] font-mono tracking-[0.2em] uppercase font-bold border border-gray-800 bg-black/60 text-gray-500 hover:text-gray-300 hover:border-gray-600 tech-clip transition-all"
                                                >
                                                    取消
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleUpgradeClick(f.id, 20 + f.level * 15)}
                                            className="mt-4 w-full py-2.5 flex items-center justify-center gap-2 border font-mono text-[9px] tracking-[0.2em] uppercase transition-all tech-clip font-bold bg-amber-950/30 border-amber-700 text-amber-400 hover:bg-amber-900/60 hover:text-amber-200 shadow-[inset_0_0_15px_rgba(245,158,11,0.15)]"
                                        >
                                            <span>REQUEST_UPGRADE · LLM_PRICE</span>
                                        </button>
                                    )
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const ResidentsSection: React.FC<Pick<SanctuaryPanelProps, 'residents' | 'sanctuary'>> = ({ residents, sanctuary }) => {
    const pool = residents ?? sanctuary?.residents ?? [];

    return (
        <div className="flex flex-col h-full p-6 lg:p-10 overflow-y-auto cyber-scrollbar relative">
            <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none"></div>

            <div className="mb-8 border-b border-amber-900/50 pb-5 relative z-10">
                <h3 className="text-3xl font-black text-amber-500 tracking-[0.15em] uppercase drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]">RESIDENT_REGISTRY</h3>
                <p className="text-[10px] font-mono text-amber-700/90 mt-2.5 tracking-widest">REGISTERED_CIVILIANS: <span className="text-amber-400 font-bold">{pool.length}</span> / POP: <span className="text-amber-400 font-bold">{sanctuary?.population ?? 0}</span></p>
            </div>

            {pool.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-700 border border-dashed border-gray-800 bg-[#050508]/60 p-10 tech-clip">
                    <div className="w-12 h-12 mb-5 opacity-20 text-gray-600">{ICONS.pop}</div>
                    <p className="text-[11px] font-mono tracking-[0.2em] uppercase font-bold text-gray-600">NO_RESIDENT_DATA_FOUND</p>
                    <p className="text-[9px] font-mono mt-2.5 opacity-50 uppercase tracking-widest">Events may attract or claim survivors.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                    {pool.map(r => {
                        const hpPct = Math.max(0, Math.min(100, (r.hp / 500) * 100));
                        const sanPct = Math.max(0, Math.min(100, (r.san / 500) * 100));
                        return (
                            <div key={r.id} className="border border-amber-900/40 bg-[#07080a]/90 p-5 tech-clip relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent"></div>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-amber-500/10 border border-amber-800/60 flex items-center justify-center text-amber-500 tech-clip shrink-0">
                                        <span className="text-base">{r.name.slice(0, 1)}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-black text-amber-400 tracking-wider truncate">{r.name}</h4>
                                        <p className="text-[8px] font-mono text-gray-500 mt-0.5 uppercase tracking-widest">CID_{r.id.slice(-6)}</p>
                                    </div>
                                </div>
                                <div className="mt-4 space-y-2.5">
                                    <div>
                                        <div className="flex justify-between text-[8px] font-mono uppercase tracking-widest text-gray-500 mb-1"><span>HP</span><span>{Math.round(r.hp)}</span></div>
                                        <div className="h-1.5 bg-gray-900 overflow-hidden"><div className={`h-full ${hpPct > 40 ? 'bg-emerald-500/70' : 'bg-red-500/70'}`} style={{ width: `${hpPct}%` }}></div></div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[8px] font-mono uppercase tracking-widest text-gray-500 mb-1"><span>SAN</span><span>{Math.round(r.san)}</span></div>
                                        <div className="h-1.5 bg-gray-900 overflow-hidden"><div className={`h-full ${sanPct > 40 ? 'bg-blue-500/70' : 'bg-purple-500/70'}`} style={{ width: `${sanPct}%` }}></div></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const EventsSection: React.FC<Pick<SanctuaryPanelProps, 'sanctuaryEvent' | 'isGeneratingEvent' | 'onRequestEvent' | 'onResolveEvent'>> = ({ sanctuaryEvent, isGeneratingEvent, onRequestEvent, onResolveEvent }) => (
    <div className="flex flex-col h-full p-6 lg:p-10 overflow-y-auto cyber-scrollbar relative">
        <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none"></div>

        <div className="mb-8 border-b border-amber-900/50 pb-5 relative z-10">
            <h3 className="text-3xl font-black text-amber-500 tracking-[0.15em] uppercase drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]">INCIDENT_LOG</h3>
            <p className="text-[10px] font-mono text-amber-700/90 mt-2.5 tracking-widest">DAILY_ANOMALY_REPORT</p>
        </div>

        {sanctuaryEvent ? (
            <div className="relative z-10">
                <div className="border border-amber-900/40 bg-[#07080a]/90 p-6 tech-clip mb-6">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent"></div>
                    <p className="text-[11px] font-mono text-gray-300 leading-relaxed">{sanctuaryEvent.desc}</p>
                </div>
                <div className="space-y-3">
                    {sanctuaryEvent.choices.map((choice, index) => (
                        <button
                            key={index}
                            onClick={() => { AudioService.playSfx('ui_click'); onResolveEvent?.(index); }}
                            className="w-full text-left border border-amber-900/40 bg-[#0a0b0d]/90 p-5 tech-clip hover:bg-amber-950/30 hover:border-amber-700/60 transition-all group"
                        >
                            <div className="flex items-start gap-3">
                                <span className="text-[10px] font-mono text-amber-500 border border-amber-800/60 px-2 py-0.5 tech-clip shrink-0 mt-0.5">OPT_{index + 1}</span>
                                <p className="text-[11px] font-mono text-gray-300 leading-relaxed group-hover:text-amber-200 transition-colors">{choice.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-700 border border-dashed border-gray-800 bg-[#050508]/60 p-10 tech-clip relative z-10">
                <div className="w-12 h-12 mb-5 opacity-20 text-gray-600">✦</div>
                <p className="text-[11px] font-mono tracking-[0.2em] uppercase font-bold text-gray-600">NO_ANOMALY_REPORTED</p>
                <p className="text-[9px] font-mono mt-2.5 opacity-50 uppercase tracking-widest">Events surface with the passage of time — sweep to expedite.</p>
                {onRequestEvent && (
                    <button
                        onClick={() => { AudioService.playSfx('ui_click'); onRequestEvent(); }}
                        disabled={isGeneratingEvent}
                        className={`mt-6 px-8 py-3 border font-mono text-[10px] tracking-[0.25em] uppercase transition-all tech-clip font-bold ${!isGeneratingEvent ? 'bg-amber-950/30 border-amber-700 text-amber-400 hover:bg-amber-900/60 hover:text-amber-200 shadow-[inset_0_0_15px_rgba(245,158,11,0.15)]' : 'bg-black/60 border-gray-800 text-gray-600 cursor-wait'}`}
                    >
                        {isGeneratingEvent ? 'SWEEPING...' : 'REQUEST_STATUS_SWEEP'}
                    </button>
                )}
            </div>
        )}
    </div>
);

const MapSection: React.FC<Pick<SanctuaryPanelProps, 'sanctuary'>> = ({ sanctuary }) => {
    const [selectedNodeId, setSelectedNodeId] = useState<string>(sanctuary?.entrance || '');

    const layout = useMemo(() => {
        if (!sanctuary?.nodes) return [];
        const nodes: LayoutNode[] = [];
        const visited = new Set<string>();
        const queue: { id: string, depth: number }[] = [{ id: sanctuary.entrance || '', depth: 0 }];

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (visited.has(current.id)) continue;
            const nodeTemplate = sanctuary.nodes[current.id];
            if (!nodeTemplate) continue;

            visited.add(current.id);
            nodes.push({ id: current.id, data: nodeTemplate as Node, depth: current.depth, isVisited: !!(nodeTemplate as Node).isVisited });

            nodeTemplate.childrenIds?.forEach(childId => {
                if (!visited.has(childId)) queue.push({ id: childId, depth: current.depth + 1 });
            });
            nodeTemplate.exits?.forEach(exit => {
                if (!exit.targetId) return;
                if (!nodeTemplate.childrenIds?.includes(exit.targetId) && !queue.find(q => q.id === exit.targetId)) {
                    queue.push({ id: exit.targetId, depth: current.depth + 1 });
                }
            });
        }
        return nodes;
    }, [sanctuary]);

    const levels = useMemo(() => {
        const grouped: Record<number, LayoutNode[]> = {};
        layout.forEach(node => {
            if (!grouped[node.depth]) grouped[node.depth] = [];
            grouped[node.depth].push(node);
        });
        return grouped;
    }, [layout]);

    const selectedNode = sanctuary?.nodes ? sanctuary.nodes[selectedNodeId] : null;
    const isSelectedVisible = !!(selectedNode as Node | null)?.isVisited;

    return (
        <div className="flex h-full relative overflow-hidden bg-[#020203]">
            <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" style={{ backgroundSize: '50px 50px' }}></div>

            <div className="flex-1 overflow-auto cyber-scrollbar p-10 relative z-10 flex justify-center">
                <div className="flex flex-col gap-20 items-center min-w-max pb-24 mt-12">

                    <div className="text-center mb-10 border border-amber-500/40 p-5 bg-[#0a0a0c]/90 backdrop-blur-md relative tech-clip shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                        <div className="absolute -top-px left-4 right-4 h-px bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,1)]"></div>
                        <h3 className="text-amber-500 text-base tracking-[0.5em] uppercase font-black">TOPOLOGY_MAP</h3>
                        <p className="text-[10px] font-mono text-amber-700/90 mt-2.5 tracking-[0.3em] font-bold">SECTOR: {sanctuary?.name?.toUpperCase() || 'UNKNOWN'}</p>
                    </div>

                    {Object.keys(levels).map(depthStr => {
                        const depth = parseInt(depthStr);
                        return (
                            <div key={depth} className="flex gap-16 relative">
                                {/* 层级背景装饰 */}
                                <div className="absolute -inset-y-6 -inset-x-10 bg-white/[0.01] border-y border-white/[0.05] pointer-events-none z-0"></div>
                                <div className="absolute -left-16 top-1/2 -translate-y-1/2 text-[8px] font-mono text-gray-700 rotate-[-90deg] tracking-widest z-0">LVL_{depthStr.padStart(2, '0')}</div>

                                {levels[depth].map(node => (
                                    <div key={node.id} className="flex flex-col items-center group relative z-10">
                                        {/* 连线 */}
                                        {node.depth > 0 && (
                                            <div className="absolute -top-20 left-1/2 w-[2px] h-20 bg-gray-800/80 pointer-events-none overflow-hidden">
                                                {node.isVisited && <div className="w-full h-1/2 bg-amber-500/60 shadow-[0_0_5px_rgba(245,158,11,0.8)] animate-[scanline_2s_linear_infinite]"></div>}
                                            </div>
                                        )}

                                        {/* 节点本体 */}
                                        <button
                                            onClick={() => {
                                                if (node.isVisited) { setSelectedNodeId(node.id); AudioService.playSfx('ui_click'); }
                                                else { AudioService.playSfx('error'); }
                                            }}
                                            className={`relative w-44 h-32 border transition-all duration-300 flex flex-col items-center justify-center p-3.5 tech-clip
                                                ${node.id === selectedNodeId
                                                    ? 'bg-[#0a0805] border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.4)] z-20 scale-110'
                                                    : (node.isVisited
                                                        ? 'bg-[#08080a]/90 border-gray-600 hover:border-amber-600/70 hover:bg-[#0a0a0c]'
                                                        : 'bg-[#030303]/80 border-gray-900/80 cursor-not-allowed opacity-50')}`}
                                        >
                                            {node.isVisited ? (
                                                <>
                                                    <div className={`text-[11px] mb-2 uppercase tracking-widest font-bold truncate w-full text-center ${node.id === selectedNodeId ? 'text-amber-400 drop-shadow-[0_0_5px_currentColor]' : 'text-gray-300'}`}>{node.data.name}</div>

                                                    <div className={`w-8 h-8 my-1.5 flex items-center justify-center ${node.id === selectedNodeId ? 'text-amber-500' : 'text-gray-500'}`}>
                                                        {node.id.includes('generator') ? ICONS.power : node.id.includes('med') ? ICONS.med : node.id.includes('armory') ? ICONS.armor : node.id.includes('dorm') || node.id.includes('barracks') ? ICONS.pop : node.id.includes('command') ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 22 12 18 22 22 12 2"></polygon></svg> : ICONS.default}
                                                    </div>

                                                    <div className="text-[8px] font-mono text-gray-500 uppercase mt-auto bg-black/60 px-2 py-0.5 border border-gray-800 tracking-widest">STS: ONLINE</div>

                                                    {/* 选中态特效边框 */}
                                                    {node.id === selectedNodeId && (
                                                        <div className="absolute inset-0 border-2 border-amber-500/30 animate-ping pointer-events-none tech-clip"></div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center text-gray-800"><span className="text-4xl mb-1.5 opacity-20 font-serif">?</span><span className="text-[9px] font-mono tracking-[0.2em] font-bold">UNKNOWN</span></div>
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 右侧详情面板 */}
            <div className="w-[340px] border-l border-amber-900/50 bg-[#050507]/95 backdrop-blur-xl p-7 flex flex-col shrink-0 relative z-20 shadow-[-15px_0_40px_rgba(0,0,0,0.8)]">
                {selectedNode && isSelectedVisible ? (
                    <>
                        <div className="mb-7 border-b border-amber-900/50 pb-6 relative">
                            <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-amber-900/60"></div>
                            <div className="text-[9px] font-mono text-amber-600/80 uppercase tracking-[0.3em] mb-2.5 flex items-center gap-2 font-bold">
                                <span className="w-1.5 h-1.5 bg-amber-500 animate-[ping_2s_infinite]"></span> NODE_INSPECTION
                            </div>
                            <h2 className="text-2xl font-black text-amber-500 mb-4 tracking-wider drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">{selectedNode.name}</h2>
                            <div className="flex flex-wrap gap-2.5">
                                <span className="text-[9px] font-mono text-gray-400 bg-gray-900/90 px-2.5 py-1 border border-gray-700">UID: {selectedNodeId.slice(-8).toUpperCase()}</span>
                                {(selectedNode.threatLevel || 0) > 0 ? (
                                    <span className="text-[9px] font-mono text-red-400 bg-red-950/50 px-2.5 py-1 border border-red-900/60 shadow-[0_0_10px_rgba(220,38,38,0.2)] font-bold">THREAT_DETECTED</span>
                                ) : (
                                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/40 px-2.5 py-1 border border-emerald-900/60 shadow-[0_0_10px_rgba(16,185,129,0.15)] font-bold">ZONE_SECURE</span>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto cyber-scrollbar space-y-7 pr-3">
                            <div>
                                <div className="text-[10px] font-mono text-amber-600/70 uppercase mb-2.5 font-bold tracking-[0.2em]">Scan_Result</div>
                                <p className="text-[11px] font-mono text-gray-400 leading-relaxed border-l-2 border-amber-900/60 pl-3.5 bg-black/30 p-2.5">{selectedNode.desc}</p>
                            </div>
                            {selectedNode.items && selectedNode.items.length > 0 && (
                                <div>
                                    <div className="text-[10px] font-mono text-amber-600/70 uppercase mb-2.5 font-bold tracking-[0.2em]">Assets_Detected</div>
                                    <div className="space-y-2">
                                        {selectedNode.items.map((item: Item, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-2.5 bg-[#0a0a0c] border border-gray-800 hover:border-amber-900/70 transition-colors group tech-clip-rev">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="w-4 h-4 opacity-50 group-hover:text-amber-500 transition-colors">{ICONS[item.type as keyof typeof ICONS] || ICONS.default}</span>
                                                    <span className="text-[10px] text-gray-300 font-mono group-hover:text-white font-bold tracking-wider">{item.name}</span>
                                                </div>
                                                {item.quantity && item.quantity > 1 && <span className="text-[9px] text-amber-500 font-mono bg-amber-950/40 px-1.5 py-0.5 border border-amber-900/40">x{item.quantity}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-700 opacity-50">
                        <div className="w-16 h-16 mb-6 relative text-amber-900/30">
                            <svg className="absolute inset-0 animate-ping opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"></polygon></svg>
                            <svg className="relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"></polygon></svg>
                        </div>
                        <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-center leading-loose font-bold">Awaiting Selection<br />For Detailed Schematics</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ==================== 主容器 ====================

const SanctuaryPanel: React.FC<SanctuaryPanelProps> = ({
    player, sanctuary, onRest, onUseMedicine, onOrganizeStorage, onTransferItem, onDepart, onClose, getStorageCapacity, getCustomRestConfig, morale = 0, isLowMorale = false, maxStorage,
    facilities, dailyProduction, onFacilityUpgrade, onFacilityUpgradePriced, residents, sanctuaryEvent, isGeneratingEvent, onRequestEvent, onResolveEvent
}) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'storage' | 'companion' | 'facility' | 'resident' | 'event'>('overview');

    return (
        <div className="absolute inset-0 z-50 bg-[#020202]/95 backdrop-blur-3xl flex items-center justify-center p-0 font-sans animate-in fade-in duration-500 overflow-hidden">
            <CyberStyles />

            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.05] pointer-events-none mix-blend-overlay"></div>
            <div className="crt-scanline"></div>
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]"></div>

            <div className="w-full h-full flex flex-col relative z-10">
                {/* 顶栏 Header */}
                <div className="h-16 border-b border-amber-600/40 bg-[#050505] flex justify-between items-center px-6 shrink-0 relative shadow-[0_5px_25px_rgba(0,0,0,0.9)] z-30">
                    <div className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-amber-500 via-amber-500/50 to-transparent w-1/3 shadow-[0_0_15px_rgba(245,158,11,0.8)]"></div>

                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3.5">
                            <div className="w-9 h-9 bg-amber-500/10 border border-amber-500/60 flex items-center justify-center tech-clip">
                                <span className="text-2xl text-amber-500 animate-pulse drop-shadow-[0_0_8px_currentColor]">✦</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-mono font-black tracking-[0.3em] text-[15px] text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)] leading-tight">SANCTUARY_OS</span>
                                <span className="text-[8px] font-mono text-amber-700/80 tracking-[0.2em] uppercase font-bold">v2.0.4.build_982</span>
                            </div>
                        </div>
                        <div className="h-7 w-[1px] bg-amber-900/60"></div>
                    </div>

                    {/* 导航栏 */}
                    <div className="flex items-center h-full absolute left-1/2 -translate-x-1/2">
                        {[
                            { id: 'overview', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>, label: 'CMD_NEXUS' },
                            { id: 'map', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"></polygon></svg>, label: 'TOPOLOGY' },
                            { id: 'storage', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3v18"></path><path d="M3 17l4 4 4-4"></path><path d="M7 3v18"></path><path d="M21 7l-4-4-4 4"></path></svg>, label: 'LOGISTICS' },
                            { id: 'companion', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>, label: 'PERSONNEL' },
                            { id: 'facility', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18"></path><path d="M5 21V7l7-4 7 4v14"></path><path d="M9 21v-4h6v4"></path></svg>, label: 'FACILITY' },
                            { id: 'resident', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 3.13a4 4 0 0 1 0 7.75"></path><path d="M12 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path></svg>, label: 'RESIDENT' },
                            { id: 'event', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>, label: 'INCIDENT' },
                        ].map(tab => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => { AudioService.playSfx('ui_click'); setActiveTab(tab.id as any); }}
                                    className={`h-full px-7 flex flex-col justify-center items-center gap-1.5 border-b-[3px] transition-all relative group ${isActive ? 'border-amber-500 bg-amber-900/20' : 'border-transparent hover:bg-white/[0.03] hover:border-amber-900/60'}`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className={`${isActive ? 'text-amber-400 drop-shadow-[0_0_8px_currentColor]' : 'text-gray-500 group-hover:text-amber-600'}`}>{tab.icon}</span>
                                        <span className={`text-[10px] font-mono font-bold tracking-[0.2em] ${isActive ? 'text-amber-500' : 'text-gray-500 group-hover:text-amber-500'}`}>{tab.label}</span>
                                    </div>
                                    {isActive && <div className="absolute bottom-0 left-0 w-full h-6 bg-gradient-to-t from-amber-500/20 to-transparent pointer-events-none"></div>}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-7">
                        <div className="text-right hidden md:flex flex-col items-end">
                            <div className="text-[8px] font-mono text-gray-500 uppercase tracking-[0.2em] mb-1 font-bold">UPLINK_STATUS</div>
                            <div className="text-[10px] font-mono text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)] flex items-center gap-1.5 bg-emerald-950/30 px-2.5 py-0.5 border border-emerald-900/40 tech-clip font-bold">
                                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-sm animate-pulse"></span> SECURE
                            </div>
                        </div>
                        {onClose && (
                            <button
                                onClick={() => { AudioService.playSfx('ui_click'); onClose(); }}
                                className="w-10 h-10 flex items-center justify-center border border-amber-900/50 text-amber-600 hover:text-black hover:bg-amber-500 hover:shadow-[0_0_20px_rgba(245,158,11,0.6)] transition-all tech-clip group"
                                title="Close Interface"
                            >
                                <svg className="w-4 h-4 transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* 主内容区 */}
                <div className="flex-1 overflow-hidden relative bg-[#030304]">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-600/40 to-transparent z-20"></div>

                    {activeTab === 'overview' && <OverviewSection player={player} sanctuary={sanctuary} morale={morale} isLowMorale={isLowMorale} onRest={onRest} onUseMedicine={onUseMedicine} onDepart={onDepart} getCustomRestConfig={getCustomRestConfig} />}
                    {activeTab === 'map' && sanctuary && <MapSection sanctuary={sanctuary} />}
                    {activeTab === 'storage' && <StorageSection player={player} onTransferItem={onTransferItem} onOrganizeStorage={onOrganizeStorage} maxStorage={maxStorage} />}
                    {activeTab === 'companion' && <CompanionsSection player={player} />}
                    {activeTab === 'facility' && <FacilitiesSection facilities={facilities} dailyProduction={dailyProduction} onFacilityUpgrade={onFacilityUpgrade} onFacilityUpgradePriced={onFacilityUpgradePriced} sanctuary={sanctuary} />}
                    {activeTab === 'resident' && <ResidentsSection residents={residents} sanctuary={sanctuary} />}
                    {activeTab === 'event' && <EventsSection sanctuaryEvent={sanctuaryEvent} isGeneratingEvent={isGeneratingEvent} onRequestEvent={onRequestEvent} onResolveEvent={onResolveEvent} />}
                </div>

                {/* 底部状态栏 */}
                <div className="h-8 bg-[#020202] border-t border-amber-900/50 flex items-center justify-between px-6 text-[9px] font-mono text-gray-500 uppercase tracking-[0.25em] shrink-0 relative z-30 font-bold">
                    <div className="flex items-center gap-5">
                        <span>TERMINAL_ID: <span className="text-amber-600">{player.static.id.split('_')[1] || 'UNK-99'}</span></span>
                        <span className="w-[1px] h-3 bg-gray-800"></span>
                        <span>SESSION: <span className="text-gray-400">TICK_{player.currentGameRound.absoluteTick}</span></span>
                    </div>
                    <div className="flex items-center gap-3.5">
                        <span>DATA_STREAM: <span className="text-emerald-600">OPTIMAL</span></span>
                        <div className="flex gap-0.5">
                            <span className="w-1.5 h-2.5 bg-amber-600/50 animate-[pulse_1s_ease-in-out_infinite]"></span>
                            <span className="w-1.5 h-2.5 bg-amber-600/70 animate-[pulse_1.2s_ease-in-out_infinite_0.2s]"></span>
                            <span className="w-1.5 h-2.5 bg-amber-600/90 animate-[pulse_1.5s_ease-in-out_infinite_0.4s]"></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SanctuaryPanel;