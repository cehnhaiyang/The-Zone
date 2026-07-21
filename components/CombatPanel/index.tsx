import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    PlayerState, CombatVisualEvent, CardInstance, Entity,
    Attribute, StatusEffect, StatusEffectType, EnemyTemplate, CombatDynamicState, BaseDynamicState, CardTarget, ItemRarity
} from '../../meta';
import './style.css';

const AudioService = {
    playSfx: (id: string) => console.log(`[AudioService] Play SFX: ${id}`)
};

const getCombatState = (dynamic: BaseDynamicState): CombatDynamicState => {
    return dynamic as CombatDynamicState;
};

/** 卡牌基础属性提取器 */
const getCardBaseFeatures = (card: CardInstance) => ({
    actualCost: card.cost,
    isUnplayable: card.feature?.includes('unplayable') ?? false,
    isExhaust: card.feature?.includes('exhaust') ?? false,
    isSingleUse: card.feature?.includes('singleUse') ?? false,
    isRetain: card.feature?.includes('retain') ?? false,
    isEthereal: card.feature?.includes('ethereal') ?? false,
});

/** 状态效果 → 图标映射（覆盖全部 StatusEffectType） */
const STATUS_ICON_MAP: Record<StatusEffectType, string> = {
    stun: '💫', freeze: '🧊',
    bleed: '🩸', poison: '☠️', burn: '🔥', regen: '💚',
    buff_str: '💪', buff_agi: '💨', buff_kno: '🧠', buff_per: '👁️',
    weaken: '📉', vulnerable: '💔',
};

const getStatusIcon = (type: StatusEffectType): string => STATUS_ICON_MAP[type] ?? '⚠️';

/** 稀有度排序权重 */
const RARITY_ORDER: Record<ItemRarity, number> = {
    cursed: 0, common: 1, rare: 2, epic: 3,
};

export interface CombatCardProps {
    card: CardInstance;
    onClick: () => void;
    disabled?: boolean;
    canAfford: boolean;
    attribute?: Attribute;
    playerStatus?: StatusEffect[];
    enemyStatus?: StatusEffect[];
    style?: React.CSSProperties;
}

export interface CombatHeaderProps {
    drawPileCount: number;
    roundCount: number;
    onOpenDrawPile: () => void;
}

export interface EnemyDisplayProps {
    enemy: Entity<EnemyTemplate, CombatDynamicState>;
    player: PlayerState;
    visualEvents: CombatVisualEvent[];
    onManualGen: () => void;
    isGenerating: boolean;
    onTargetClick?: () => void;
    isValidTarget?: boolean;
    maxHp?: number;
}

export interface HandAreaProps {
    hand: CardInstance[];
    energy: number;
    player: PlayerState;
    enemy: Entity<EnemyTemplate, CombatDynamicState>;
    onPlayCard: (card: CardInstance) => void;
    selectedCardId?: string;
}

export interface PileViewerProps {
    title: string;
    cards: CardInstance[];
    onClose: () => void;
}

export interface PlayerHudProps {
    energy: number;
    maxEnergy: number;
    discardPileCount: number;
    exhaustPileCount: number;
    drawPileCount: number;
    roundCount: number;
    onEndTurn: () => void;
    onOpenDiscard: () => void;
    onOpenExhaust: () => void;
    onOpenDrawPile: () => void;
}

export interface CharacterCardProps {
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    block: number;
    imageUrl?: string;
    isDead?: boolean;
    events: CombatVisualEvent[];
    isTargeted: boolean;
    isSelectable?: boolean;
    onSelect?: () => void;
    status?: StatusEffect[];
}

export interface SquadDisplayProps {
    player: PlayerState;
    visualEvents: CombatVisualEvent[];
    enemyIntent?: CombatDynamicState['nextIntent'];
    onTargetClick?: (id: string) => void;
    isValidTarget?: boolean;
    targetMode?: CardTarget;
}

export interface CombatPanelProps {
    enemy: Entity<EnemyTemplate, CombatDynamicState>;
    player: PlayerState;
    combatLog: string[];
    visualEvents: CombatVisualEvent[];
    onManualGen: () => void;
    isGenerating: boolean;
    hand?: CardInstance[];
    drawPile?: CardInstance[];
    discardPile?: CardInstance[];
    exhaustPile?: CardInstance[];
    energy?: number;
    maxEnergy?: number;
    onPlayCard?: (card: CardInstance, targetId?: string) => void;
    onEndTurn?: () => void;
    discardRequired?: number;
    onManualDiscard?: (card: CardInstance) => void;
}

const CombatCard: React.FC<CombatCardProps> = ({ card, onClick, disabled, canAfford, attribute, playerStatus, enemyStatus, style }) => {
    const { actualCost, isUnplayable, isExhaust, isSingleUse, isRetain, isEthereal } = getCardBaseFeatures(card);

    // VDOM 驱动的描述解析引擎 - 增加关键词高亮
    const parsedDescription = useMemo(() => {
        const rawDesc = card.desc;
        const replacements: Array<{ originalStr: string; finalVal: number; isBuffed: boolean }> = [];

        card.effects.forEach(effect => {
            if (!['melee_attack', 'block', 'heal', 'ranged_attack'].includes(effect.type) && !effect.scaling) return;

            let finalVal = effect.value;
            if (attribute) {
                if (effect.type === 'melee_attack') finalVal += attribute.strength || 0;
                if (effect.scaling && !['melee_attack', 'ranged_attack', 'instant_attack'].includes(effect.type)) {
                    finalVal += Math.floor((attribute[effect.scaling.attribute] || 0) * (effect.scaling.factor || 0.5));
                }
            }

            if (['melee_attack', 'ranged_attack', 'instant_attack'].includes(effect.type)) {
                if (playerStatus?.some(s => s.type === 'weaken') && effect.type !== 'instant_attack') finalVal = Math.floor(finalVal * 0.75);
                if (enemyStatus?.some(s => s.type === 'vulnerable')) finalVal = Math.floor(finalVal * 1.5);
            }

            if (finalVal !== effect.value) {
                replacements.push({ originalStr: effect.value.toString(), finalVal, isBuffed: finalVal > effect.value });
            }
        });

        // 提取特殊标签
        const tags = [];
        if (isExhaust) tags.push({ key: '消耗', style: 'text-zinc-400 border-zinc-700' });
        if (isSingleUse) tags.push({ key: '移除', style: 'text-rose-400 border-rose-800' });
        if (isRetain) tags.push({ key: '保留', style: 'text-sky-400 border-sky-800' });
        if (isEthereal) tags.push({ key: '自毁', style: 'text-purple-400 border-purple-800' });
        if (isUnplayable) tags.push({ key: '故障', style: 'text-red-500 border-red-800 animate-pulse bg-red-950/50' });

        // 解析关键词高亮 (如：攻击、护甲、治疗)
        const KEYWORD_MAP: Record<string, string> = {
            '攻击': 'text-red-400 font-bold',
            '护甲': 'text-blue-400 font-bold',
            '治疗': 'text-emerald-400 font-bold',
            '能量': 'text-cyan-400 font-bold',
        };

        const applyKeywords = (text: string) => {
            let nodes: React.ReactNode[] = [text];
            Object.entries(KEYWORD_MAP).forEach(([word, className]) => {
                const newNodes: React.ReactNode[] = [];
                nodes.forEach(node => {
                    if (typeof node !== 'string') {
                        newNodes.push(node);
                        return;
                    }
                    const parts = node.split(word);
                    parts.forEach((part, i) => {
                        newNodes.push(part);
                        if (i < parts.length - 1) {
                            newNodes.push(<span key={word + i} className={className}>{word}</span>);
                        }
                    });
                });
                nodes = newNodes;
            });
            return nodes;
        };

        const descNodes: React.ReactNode[] = [];
        let remaining = rawDesc;
        let keyIdx = 0;

        for (const rep of replacements) {
            const idx = remaining.indexOf(rep.originalStr);
            if (idx === -1) continue;

            if (idx > 0) {
                descNodes.push(<React.Fragment key={`t${keyIdx++}`}>{applyKeywords(remaining.substring(0, idx))}</React.Fragment>);
            }

            const colorClass = rep.isBuffed
                ? 'text-cyan-300 drop-shadow-[0_0_4px_rgba(34,211,238,0.8)]'
                : 'text-red-400 drop-shadow-[0_0_4px_rgba(239,68,68,0.8)]';
            descNodes.push(
                <span key={`v${keyIdx++}`} className={`${colorClass} font-black font-mono text-base`}>{rep.finalVal}</span>
            );

            remaining = remaining.substring(idx + rep.originalStr.length);
        }

        if (remaining.length > 0) {
            descNodes.push(<React.Fragment key={`t${keyIdx++}`}>{applyKeywords(remaining)}</React.Fragment>);
        }

        return (
            <div className="flex flex-col items-center w-full">
                <div className="w-full text-center leading-relaxed whitespace-pre-wrap">{descNodes.length > 0 ? descNodes : applyKeywords(rawDesc)}</div>
                {tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap justify-center gap-1.5 w-full">
                        {tags.map(t => (
                            <span key={t.key} className={`font-bold ${t.style} text-[10px] tracking-widest border bg-black/60 px-2 py-0.5 rounded-sm clip-tech-button`}>
                                {t.key}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        );
    }, [card.desc, card.effects, attribute, playerStatus, enemyStatus, isExhaust, isSingleUse, isRetain, isEthereal, isUnplayable]);

    const active = !disabled && canAfford && !isUnplayable;

    return (
        <div onClick={active ? onClick : undefined} style={style}
            className={`group relative w-48 h-[17.5rem] select-none perspective-1000 transform-gpu transition-all duration-500
            ${active ? 'cursor-pointer hover:-translate-y-4 hover:rotate-1' : 'cursor-not-allowed'}
            ${card.rarity === 'cursed' ? 'animate-glitch' : ''}
            ${disabled || isUnplayable ? 'grayscale opacity-40' : ''}`}
        >
            {/* 边框高亮流光 */}
            {active && (card.rarity === 'epic' || card.rarity === 'rare') && (
                <div className={`absolute -inset-[2px] rounded-lg bg-gradient-to-r ${card.rarity === 'epic' ? 'from-purple-600 via-cyan-400 to-purple-600' : 'from-cyan-600 via-white to-cyan-600'} opacity-30 group-hover:opacity-100 blur-[2px] transition-opacity duration-500 z-0 animate-pulse`}></div>
            )}

            <div className={`absolute inset-0 clip-tech-card shadow-[0_15px_35px_rgba(0,0,0,0.9)] flex flex-col z-10 border-2 
                ${canAfford && !isUnplayable ? card.theme.borderColor : 'border-zinc-800'}
                bg-gradient-to-b ${canAfford && !isUnplayable ? `${card.theme.bgGradient} to-black` : 'from-zinc-900 to-black'} backdrop-blur-xl`}
            >
                {/* 内部扫光动画 */}
                {active && (card.rarity === 'epic' || card.rarity === 'rare') && <div className="shimmer-overlay" />}
                <div className="absolute inset-0 w-full h-[1px] bg-white/5 animate-scan-vertical pointer-events-none z-0"></div>

                <div className="relative h-12 flex items-center justify-between px-3 z-20 border-b border-white/5 bg-black/50">
                    <div className={`flex items-center justify-center w-8 h-8 clip-hex font-black font-mono text-sm shadow-[inset_0_0_12px_rgba(0,0,0,0.6)]
                        ${canAfford && !isUnplayable ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,243,255,0.6)]' : 'bg-zinc-800 text-zinc-500'}`}>
                        {actualCost}
                    </div>
                    <div className="flex-1 text-right pl-2 overflow-hidden flex flex-col justify-center">
                        <span className={`text-[12px] font-black font-mono uppercase tracking-widest truncate ${card.theme.textColor} drop-shadow-[0_0_3px_currentColor]`}>{card.name}</span>
                        <span className="text-[7px] text-zinc-500 font-mono tracking-widest uppercase truncate opacity-70">{card.theme.label} // SUB_ROUTINE</span>
                    </div>
                    {/* 稀有度顶栏 */}
                    <div className={`absolute top-0 left-0 w-full h-[3px] opacity-90 ${card.rarity === 'rare' ? 'bg-cyan-400 shadow-[0_0_15px_#00f3ff]' : card.rarity === 'epic' ? 'bg-purple-500 shadow-[0_0_15px_#a855f7]' : card.rarity === 'cursed' ? 'bg-red-500 shadow-[0_0_15px_#ef4444]' : 'bg-zinc-700'}`} />
                </div>

                <div className="relative flex-1 mx-2.5 my-2.5 bg-black/70 border border-white/5 rounded-sm flex items-center justify-center overflow-hidden group-hover:bg-black/50 transition-colors z-10 shadow-inner">
                    <div className="absolute inset-0 opacity-10 mix-blend-overlay bg-[url('/noise.png')]"></div>
                    <div className={`text-6xl opacity-10 filter blur-[1px] group-hover:opacity-20 transition-all duration-700 font-black font-mono select-none ${card.theme.textColor}`}>{card.theme.label.substring(0, 2)}</div>

                    {/* 科技点缀 */}
                    <div className="absolute top-1 left-2 flex gap-0.5">
                        <div className="w-1 h-3 bg-white/5"></div>
                        <div className="w-1 h-3 bg-white/10"></div>
                    </div>
                    <div className="absolute bottom-1 right-2 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse"></span>
                        <span className="w-1 h-1 rounded-full bg-cyan-500/30"></span>
                    </div>
                </div>

                <div className="relative h-28 px-4 py-3 bg-slate-950/90 border-t border-white/5 flex flex-col items-center justify-start z-10">
                    <div className="text-[11px] text-zinc-200 font-medium leading-relaxed text-center drop-shadow-md w-full">{parsedDescription}</div>
                    {card.ownerName && (
                        <div className="absolute bottom-2.5 w-full text-center px-6 flex items-center justify-center gap-3 opacity-60">
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-cyan-900/40 to-transparent"></div>
                            <span className="text-[8px] text-cyan-500 font-black uppercase tracking-[0.3em] font-mono">ID:{card.ownerName}</span>
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-cyan-900/40 to-transparent"></div>
                        </div>
                    )}
                </div>
            </div>
            {active && <div className={`absolute -inset-2 rounded-xl opacity-0 group-hover:opacity-40 transition-opacity duration-700 bg-gradient-to-br ${card.theme.bgGradient} blur-2xl -z-10`} />}
        </div>
    );
};

const Tooltip: React.FC<{ title?: string; content: string; x: number; y: number }> = ({ title, content, x, y }) => (
    <div
        className="fixed z-[999] pointer-events-none p-3 bg-slate-950/95 border border-cyan-500/30 backdrop-blur-xl clip-tech-card shadow-2xl flex flex-col gap-2 min-w-[200px] max-w-[300px]"
        style={{ left: x + 20, top: y - 20 }}
    >
        {title && <div className="text-[10px] font-black font-mono text-cyan-400 tracking-[0.2em] uppercase border-b border-cyan-900/50 pb-1">{title}</div>}
        <div className="text-xs text-slate-200 leading-relaxed font-sans">{content}</div>
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
    </div>
);

const STATUS_DESC: Record<StatusEffectType, { name: string; desc: string }> = {
    stun: { name: '眩晕', desc: '由于强烈的冲击或干扰，无法在当前回合采取任何行动。' },
    freeze: { name: '冰冻', desc: '被极端低温锁定，无法移动或使用卡牌。' },
    bleed: { name: '流血', desc: '伤口正在持续失血，每回合受到固定伤害。' },
    poison: { name: '毒素', desc: '神经毒素正在蔓延，每回合受到伤害。' },
    burn: { name: '燃烧', desc: '被火焰包围，每回合受到伤害。' },
    regen: { name: '再生', desc: '先进的纳米修复协议正在运行，每回合回复生命值。' },
    buff_str: { name: '力量增强', desc: '由于药物或超载，临时提升攻击力。' },
    buff_agi: { name: '敏捷增强', desc: '反应速度提升，增加闪避几率。' },
    buff_kno: { name: '知识增强', desc: '认知效率提升，增加特殊效果触发概率。' },
    buff_per: { name: '感知增强', desc: '战场洞察力提升，增加命中率。' },
    weaken: { name: '虚弱', desc: '由于身体受损，输出的伤害降低 20%。' },
    vulnerable: { name: '易伤', desc: '防御结构受损，受到的伤害增加 50%。' },
};

const StatusBadge: React.FC<{ s: StatusEffect; onHover: (e: React.MouseEvent, title: string, content: string) => void; onLeave: () => void; size?: 'sm' | 'md' }> = ({ s, onHover, onLeave, size = 'md' }) => {
    const isTurnBased = ['weaken', 'vulnerable', 'stun', 'freeze'].includes(s.type);
    const isDOT = ['bleed', 'poison', 'burn', 'regen'].includes(s.type);
    const info = STATUS_DESC[s.type] || { name: s.type, desc: '未知的状态效果。' };
    const w = size === 'md' ? 'w-10 h-10' : 'w-7 h-7';
    const iconSize = size === 'md' ? 'text-base' : 'text-[11px]';
    const mainNumSize = size === 'md' ? 'text-[11px]' : 'text-[9px]';
    const subNumSize = size === 'md' ? 'text-[8px]' : 'text-[6px]';

    return (
        <div
            className={`relative ${w} flex items-center justify-center pointer-events-auto cursor-help`}
            onMouseEnter={(e) => onHover(e, `${info.name} [${isTurnBased ? s.value : s.duration}T]`, info.desc)}
            onMouseLeave={onLeave}
        >
            <div className={`absolute inset-0 clip-hex bg-slate-900/95 border ${isTurnBased ? 'border-amber-500/50' : 'border-cyan-500/30'} shadow-lg backdrop-blur-sm z-0`}></div>
            <span className={`${iconSize} z-10 drop-shadow-md`}>{getStatusIcon(s.type)}</span>

            <div className="absolute bottom-0 -right-1 flex flex-col items-end z-50">
                <div className="bg-amber-400 text-black px-1 rounded-sm shadow-md leading-tight font-black font-mono" style={{ fontSize: mainNumSize }}>
                    {isTurnBased ? `${s.value}T` : s.value}
                </div>
                {isDOT && s.duration > 0 && (
                    <div className="bg-slate-950 text-cyan-400 px-1 border border-cyan-500/40 rounded-sm -mt-1 shadow-lg font-bold font-mono" style={{ fontSize: subNumSize }}>
                        {s.duration}T
                    </div>
                )}
            </div>
        </div>
    );
};

const EnemyDisplay: React.FC<EnemyDisplayProps & { onStatusHover: (e: React.MouseEvent, t: string, c: string) => void; onStatusLeave: () => void }> = ({
    enemy, player, visualEvents, onManualGen, isGenerating, onTargetClick, isValidTarget, maxHp: maxHpProp,
    onStatusHover, onStatusLeave
}) => {
    const playerCombat = getCombatState(player.dynamic);
    const isPlayerVulnerable = playerCombat.status?.some(s => s.type === 'vulnerable');

    const intent = enemy.dynamic.nextIntent;
    const intentDmg = intent?.value || 0;

    const intentIcon = useMemo(() => {
        switch (intent?.type) {
            case 'attack': return '⚔️';
            case 'buff': return '🔺';
            case 'debuff': return '💀';
            case 'observe': return '👁️';
            default: return '❓';
        }
    }, [intent?.type]);

    const hp = enemy.dynamic.hp || 0;
    const maxHp = maxHpProp ?? Math.max(1, hp);
    const hpPercent = maxHp > 0 ? (hp / maxHp) * 100 : 0;
    const shield = enemy.dynamic.shield || 0;

    // 动态缓冲血条逻辑
    const [displayHp, setDisplayHp] = useState(hpPercent);
    const [bufferHp, setBufferHp] = useState(hpPercent);

    useEffect(() => {
        setDisplayHp(hpPercent);
        const timer = setTimeout(() => {
            setBufferHp(hpPercent);
        }, 600);
        return () => clearTimeout(timer);
    }, [hpPercent]);

    return (
        <div className="relative w-full max-w-[600px] h-[600px] flex flex-col items-center justify-center pointer-events-auto">
            {/* 背景科技圆环 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <div className="tech-circle w-[450px] h-[450px] animate-spin-slow border-dashed"></div>
                <div className="tech-circle w-[520px] h-[520px] animate-spin-slow [animation-direction:reverse] opacity-50"></div>
                <div className="tech-circle w-[380px] h-[380px] animate-pulse border-cyan-500/20"></div>
            </div>

            {visualEvents.filter(e => e.target === 'enemy').map(e => (
                <div key={e.id} className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[60] font-black font-mono tracking-tighter animate-damage-float whitespace-nowrap
                    ${e.type === 'damage' ? 'text-red-500 text-7xl drop-shadow-[0_0_20px_rgba(239,68,68,0.9)]' : e.type === 'heal' ? 'text-emerald-400 text-5xl drop-shadow-[0_0_15px_#10b981]' : e.type === 'crit' ? 'text-purple-400 text-8xl drop-shadow-[0_0_30px_#a855f7]' : 'text-amber-400 text-4xl'}`}>
                    {e.type === 'damage' ? `-${e.value}` : e.type === 'heal' ? `+${e.value}` : e.value}
                </div>
            ))}

            {shield > 0 && (
                <div
                    className="absolute top-28 -right-12 z-30 flex flex-col items-center justify-center w-16 h-18 clip-hex bg-blue-950/90 border-2 border-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.6)] backdrop-blur-xl cursor-help animate-bounce-slow"
                    onMouseEnter={(e) => onStatusHover(e, '能量屏障', `核心防御协议激活：吸收下一次受到的 ${shield.toFixed(1)} 点物理伤害。`)}
                    onMouseLeave={onStatusLeave}
                >
                    <span className="text-[10px] text-blue-300 font-black tracking-widest mt-1">SHIELD</span>
                    <span className="text-2xl font-black font-mono text-blue-100 drop-shadow-[0_0_8px_#60a5fa]">{shield.toFixed(0)}</span>
                </div>
            )}

            <div className="absolute top-1/2 -right-12 translate-x-full -translate-y-1/2 z-40 flex flex-col items-start">
                {intent && (
                    <div
                        className="bg-black/90 backdrop-blur-xl clip-tech-button border-2 border-red-500/60 px-8 py-3.5 flex items-center gap-5 shadow-[0_10px_40px_rgba(220,38,38,0.4)] relative group overflow-hidden cursor-help"
                        onMouseEnter={(e) => onStatusHover(e, `战术情报: ${intent.type.toUpperCase()}`, intent.desc)}
                        onMouseLeave={onStatusLeave}
                    >
                        <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                        <div className="text-4xl filter drop-shadow-[0_0_12px_rgba(239,68,68,0.9)] animate-pulse">
                            {intentIcon}
                        </div>
                        <div className="flex flex-col relative z-10 border-l border-red-900/50 pl-5">
                            <div className="flex items-baseline gap-3">
                                <span className="text-[10px] text-red-500 font-black font-mono tracking-widest uppercase">SCAN_ANALYSIS</span>
                                {intentDmg > 0 && <span className={`text-3xl font-black font-mono ${isPlayerVulnerable ? 'text-red-400 animate-glitch drop-shadow-[0_0_10px_red]' : 'text-gray-100'}`}>{intentDmg}</span>}
                            </div>
                            <span className="text-[10px] text-gray-500 font-mono tracking-[0.2em] uppercase mt-1 max-w-[200px] truncate italic">{intent.desc}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className={`relative group transition-all duration-500 ${isValidTarget ? 'cursor-crosshair scale-110' : ''}`}
                onClick={() => { if (isValidTarget && onTargetClick) { AudioService.playSfx('combat_hit'); onTargetClick(); } }}
            >
                {isValidTarget && (
                    <div className="absolute -inset-10 z-50 pointer-events-none animate-pulse-glow text-red-500">
                        <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-current"></div>
                        <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-current"></div>
                        <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-current"></div>
                        <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-current"></div>
                        <div className="absolute inset-0 m-auto w-[200%] h-[1px] bg-current opacity-20 rotate-45"></div>
                        <div className="absolute inset-0 m-auto w-[200%] h-[1px] bg-current opacity-20 -rotate-45"></div>
                    </div>
                )}

                <div className={`w-[18rem] h-[18rem] md:w-[24rem] md:h-[24rem] clip-tech-card relative overflow-hidden bg-black z-10 transition-all duration-700 
                    ${isValidTarget ? 'border-4 border-red-500 shadow-[0_0_60px_rgba(239,68,68,0.5)]' : 'border border-cyan-500/20 shadow-2xl group-hover:border-red-500/40'}`}>

                    {/* 扫描线遮罩 */}
                    <div className="hud-scanline opacity-20"></div>

                    {enemy.dynamic.imageUrl ? (
                        <>
                            <img src={enemy.dynamic.imageUrl} alt={enemy.static.name} className={`w-full h-full object-cover transition-all duration-1000 mix-blend-screen scale-110 
                                ${isValidTarget ? 'opacity-100 saturate-150' : 'opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-90'}`} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 pointer-events-none"></div>
                        </>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-red-600/40 relative overflow-hidden">
                            <span className="text-[120px] mb-4 font-black tracking-tighter filter drop-shadow-[0_0_30px_rgba(255,0,0,0.8)] animate-glitch">?</span>
                            <span className="text-[12px] font-black font-mono tracking-[0.5em] bg-red-950/60 px-8 py-2 border border-red-500/50 backdrop-blur-md shadow-[0_0_25px_rgba(255,0,0,0.4)]">UNKNOWN_ENTITY</span>
                        </div>
                    )}

                    {!isValidTarget && (
                        <button onClick={(e) => { e.stopPropagation(); onManualGen(); }} disabled={isGenerating}
                            className="absolute inset-0 m-auto w-fit h-fit opacity-0 group-hover:opacity-100 text-[11px] bg-black/90 text-cyan-400 px-8 py-3.5 border-2 border-cyan-500 hover:bg-cyan-500 hover:text-black transition-all z-20 font-black font-mono tracking-[0.3em] backdrop-blur-xl clip-tech-button shadow-[0_0_30px_rgba(0,243,255,0.4)]">
                            {isGenerating ? 'DECRYPTING...' : '[ RECONSTRUCT_VISUAL ]'}
                        </button>
                    )}
                </div>

                <div className="absolute top-12 -left-16 flex flex-col gap-5 z-30 pointer-events-none">
                    {enemy.dynamic.status?.map((s, i) => (
                        <StatusBadge key={i} s={s} onHover={onStatusHover} onLeave={onStatusLeave} />
                    ))}
                </div>
            </div>

            <div className="mt-12 flex flex-col items-center z-20 pointer-events-none w-full max-w-[400px]">
                <div className="w-full flex items-end justify-between mb-3 px-2">
                    <div className="flex items-baseline gap-2">
                        <span className="text-[12px] font-black font-mono text-red-500/80 tracking-widest">INT_HP</span>
                        <span className="text-3xl font-black font-mono text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{hp.toFixed(0)}</span>
                    </div>
                </div>
                {/* 升级版血条 */}
                <div className="relative w-full h-5 bg-black/80 border-2 border-zinc-800 skew-x-[-20deg] overflow-hidden p-[2px] shadow-2xl backdrop-blur-xl">
                    {/* 缓冲血条 (受击后缓慢减少) */}
                    <div className="absolute inset-[2px] h-[calc(100%-4px)] bg-white/20 transition-all duration-1000 ease-out z-0"
                        style={{ width: `${Math.max(0, bufferHp)}%` }} />
                    {/* 主血条 */}
                    <div className="relative h-full bg-gradient-to-r from-red-900 via-red-600 to-red-400 transition-all duration-300 ease-out shadow-[0_0_20px_rgba(239,68,68,0.8)] z-10"
                        style={{ width: `${Math.max(0, displayHp)}%` }}>
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] animate-scan-vertical [animation-duration:1s]"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const HandArea: React.FC<HandAreaProps> = ({ hand, energy, player, enemy, onPlayCard, selectedCardId }) => {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    // 提前计算，避免每张卡都重复调用
    const playerAttribute = player.static.initialState.attribute;
    const playerStatus = getCombatState(player.dynamic).status;
    const enemyStatus = enemy.dynamic.status;

    return (
        <div className="relative w-full h-full pointer-events-auto overflow-visible flex flex-col justify-end pb-2">
            <div className="flex flex-col gap-2.5 w-full items-start perspective-1000">
                {hand.map((card, index) => {
                    const { actualCost, isUnplayable } = getCardBaseFeatures(card);
                    const canAfford = energy >= actualCost;
                    const isHovered = hoveredId === card.instanceId;
                    const isSelected = selectedCardId === card.instanceId;
                    const borderColor = (isUnplayable || card.rarity === 'cursed') ? 'border-red-900' : card.theme.borderColor;

                    return (
                        <div key={card.instanceId}
                            className="relative group w-full h-12 transition-all duration-300"
                            onMouseEnter={() => setHoveredId(card.instanceId)} onMouseLeave={() => setHoveredId(null)}
                            style={{ zIndex: isSelected ? 60 : (isHovered ? 50 : index), transform: isSelected ? 'translateX(40px) scale(1.05)' : (isHovered ? 'translateX(20px) scale(1.02)' : 'translateX(0)') }}
                        >
                            <div onClick={() => onPlayCard(card)}
                                className={`absolute left-0 top-0 w-[95%] xl:w-[90%] h-full border-l-4 border-r border-y bg-black/70 backdrop-blur-md overflow-hidden flex items-center px-3 gap-3 cursor-pointer hover:bg-slate-900/90 transition-all duration-300 clip-tech-card-left
                                ${isSelected ? 'border-emerald-400 bg-emerald-950/40 shadow-[inset_0_0_20px_rgba(16,185,129,0.3)]' : (canAfford && !isUnplayable ? `${borderColor} hover:border-cyan-400 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.2)]` : 'border-gray-800 opacity-40 grayscale')}`}>

                                {isSelected && <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(16,185,129,0.05)_10px,rgba(16,185,129,0.05)_20px)] pointer-events-none"></div>}

                                <div className={`w-7 h-7 flex items-center justify-center font-bold font-mono text-sm clip-hex relative z-10 shadow-inner 
                                    ${canAfford && !isUnplayable ? 'bg-cyan-500 text-black shadow-[0_0_10px_#06b6d4]' : 'bg-gray-800 text-gray-500'}`}>{actualCost}</div>

                                <div className="flex-1 flex flex-col min-w-0 relative z-10 pl-1">
                                    <div className={`font-mono text-sm truncate font-black tracking-wider ${canAfford && !isUnplayable ? 'text-gray-100 drop-shadow-md' : 'text-gray-500'}`}>{card.name}</div>
                                    {card.ownerName && <div className={`text-[9px] font-mono truncate tracking-[0.2em] mt-0.5 ${canAfford && !isUnplayable ? 'text-cyan-500/80' : 'text-zinc-600'}`}>SYS.{card.ownerName}</div>}
                                </div>

                                {isSelected && <div className="absolute right-4 animate-pulse text-emerald-400 text-[9px] font-bold tracking-widest px-2 py-0.5 bg-emerald-950 border border-emerald-500/50 clip-tech-button z-10 shadow-[0_0_10px_rgba(16,185,129,0.4)]">TARGETING</div>}
                            </div>

                            {(isHovered || isSelected) && (
                                <div className="absolute left-[98%] xl:left-[92%] top-1/2 -translate-y-1/2 z-[100] pl-6 pointer-events-none">
                                    <div className="scale-[1.1] origin-left drop-shadow-2xl">
                                        <CombatCard
                                            card={card}
                                            onClick={() => { }}
                                            canAfford={canAfford && !isUnplayable}
                                            attribute={playerAttribute}
                                            playerStatus={playerStatus}
                                            enemyStatus={enemyStatus}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                {hand.length === 0 && (
                    <div className="w-[90%] flex flex-col items-center justify-center py-10 border border-dashed border-cyan-900/40 bg-black/30 backdrop-blur-sm clip-tech-card-left">
                        <span className="text-cyan-700/50 font-mono text-[10px] tracking-[0.4em] mb-1">HAND_EMPTY</span>
                        <div className="flex gap-2">
                            <span className="w-1.5 h-1.5 bg-cyan-900/50 rounded-full animate-pulse"></span>
                            <span className="w-1.5 h-1.5 bg-cyan-900/50 rounded-full animate-pulse delay-75"></span>
                            <span className="w-1.5 h-1.5 bg-cyan-900/50 rounded-full animate-pulse delay-150"></span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const PileViewer: React.FC<PileViewerProps> = ({ title, cards, onClose }) => {
    const sortedCards = useMemo(() =>
        [...cards].sort((a, b) => {
            const ra = RARITY_ORDER[a.rarity] ?? 1;
            const rb = RARITY_ORDER[b.rarity] ?? 1;
            return ra !== rb ? rb - ra : a.name.localeCompare(b.name);
        }),
        [cards]
    );

    return (
        <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute inset-0 bg-grid-tech opacity-30 pointer-events-none mix-blend-screen"></div>
            <div className="h-20 flex items-center justify-between px-10 border-b border-cyan-900/50 bg-black/60 relative z-10 shadow-lg">
                <div className="flex items-center gap-6">
                    <h2 className="text-2xl font-black text-cyan-400 tracking-[0.3em] uppercase drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">{title}</h2>
                    <div className="flex items-center gap-3 bg-slate-900/80 border border-cyan-900/50 px-4 py-1.5 clip-tech-card">
                        <span className="text-[10px] text-cyan-600 font-mono tracking-widest uppercase">CAPACITY</span>
                        <span className="text-xl font-black text-cyan-100 font-mono">{cards.length}</span>
                    </div>
                </div>
                <button onClick={onClose} className="group relative w-12 h-12 flex items-center justify-center clip-hex bg-slate-900 border border-cyan-800 hover:border-red-500 hover:bg-red-950/60 transition-all shadow-md">
                    <span className="text-cyan-600 group-hover:text-red-400 text-xl transition-colors font-mono font-bold">✕</span>
                </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-10 relative z-10">
                {cards.length === 0 ? (
                    <div className="h-full flex items-center justify-center flex-col gap-6">
                        <div className="text-7xl opacity-20 filter blur-[2px] text-cyan-500">∅</div>
                        <div className="text-cyan-600/60 font-mono tracking-[0.5em] text-xs bg-cyan-950/20 px-8 py-3 clip-tech-card border border-cyan-900/30">EMPTY_DATA_CONTAINER</div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8 place-items-center">
                        {sortedCards.map((card, idx) => (
                            <div key={`${card.instanceId}_${idx}`} className="transform hover:scale-105 transition-transform duration-300 hover:z-10 cursor-pointer">
                                <CombatCard card={card} onClick={() => { }} canAfford={true} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const PlayerHud: React.FC<PlayerHudProps> = ({ energy, maxEnergy, discardPileCount, exhaustPileCount, drawPileCount, roundCount, onEndTurn, onOpenDiscard, onOpenExhaust, onOpenDrawPile }) => (
    <div className="w-full bg-slate-950/90 border-2 border-cyan-500/30 p-5 clip-tech-card flex flex-col gap-5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl relative overflow-hidden group">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-cyan-500/20 transition-colors duration-1000"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,255,255,0.05))] pointer-events-none"></div>

        <div className="flex items-center justify-between relative z-10">
            <div className="flex flex-col flex-1">
                <div className="flex items-center justify-between mb-3 pr-2">
                    <span className="text-[10px] font-black font-mono text-cyan-400 tracking-[0.4em] uppercase flex items-center gap-2 drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]">
                        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_12px_#00f3ff]"></span>
                        CORE_REACTOR
                    </span>
                    <div className="flex items-baseline gap-1.5 bg-cyan-950/40 px-2 py-0.5 border border-cyan-500/30 clip-tech-button">
                        <span className="text-[8px] font-mono text-cyan-500/60 uppercase">ROUND</span>
                        <span className="text-sm font-black text-white font-mono leading-none">{roundCount}</span>
                    </div>
                </div>
                <div className="flex gap-1.5 h-8 items-end">
                    {[...Array(maxEnergy)].map((_, i) => (
                        <div key={i} className={`flex-1 h-full skew-x-[-20deg] transition-all duration-700 relative overflow-hidden border-2 ${i < energy ? 'bg-cyan-400 border-cyan-300 shadow-[0_0_15px_rgba(0,243,255,0.7)]' : 'bg-zinc-900/60 border-zinc-800 shadow-inner opacity-40'}`}>
                            {i < energy && (
                                <>
                                    <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(255,255,255,0.4),transparent)]"></div>
                                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)] animate-scan-vertical [animation-duration:1.5s]"></div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex flex-col items-end justify-center bg-black/80 px-4 py-1.5 border-2 border-cyan-500/40 clip-tech-card shadow-[inset_0_0_15px_rgba(0,243,255,0.2)] ml-3 min-w-[80px]">
                <span className="text-[9px] text-cyan-700 font-black font-mono tracking-widest uppercase">PWR_OUT</span>
                <span className="text-4xl font-mono font-black text-cyan-300 drop-shadow-[0_0_10px_rgba(0,243,255,0.7)] leading-none mt-1">{energy}</span>
            </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-[10px] font-black font-mono border-t-2 border-cyan-900/30 pt-4 relative z-10">
            <div onClick={() => { AudioService.playSfx('click'); onOpenDrawPile(); }}
                className="cursor-pointer transition-all duration-300 flex flex-col gap-1 p-1.5 border border-transparent hover:border-amber-500/30 hover:bg-amber-500/5 clip-tech-button text-amber-500/70">
                <span className="tracking-[0.1em] uppercase opacity-60 text-[8px]">STREAM</span>
                <div className="flex items-center gap-1.5">
                    <span className="text-base text-amber-400">{drawPileCount}</span>
                </div>
            </div>
            <div onClick={() => { if (discardPileCount) { AudioService.playSfx('click'); onOpenDiscard(); } }}
                className={`cursor-pointer transition-all duration-300 flex flex-col gap-1 p-1.5 border border-transparent hover:border-cyan-500/30 hover:bg-cyan-500/5 clip-tech-button ${discardPileCount > 0 ? 'text-zinc-300' : 'text-zinc-600'}`}>
                <span className="tracking-[0.1em] uppercase opacity-60 text-[8px]">RECYCLE</span>
                <div className="flex items-center gap-1.5">
                    <span className="text-base text-cyan-400">{discardPileCount}</span>
                </div>
            </div>
            <div onClick={() => { if (exhaustPileCount) { AudioService.playSfx('click'); onOpenExhaust(); } }}
                className={`cursor-pointer transition-all duration-300 flex flex-col gap-1 p-1.5 border border-transparent hover:border-purple-500/30 hover:bg-purple-500/5 clip-tech-button ${exhaustPileCount > 0 ? 'text-purple-300' : 'text-zinc-600'}`}>
                <span className="tracking-[0.1em] uppercase opacity-60 text-[8px]">VOID</span>
                <div className="flex items-center gap-1.5">
                    <span className="text-base text-purple-400">{exhaustPileCount}</span>
                </div>
            </div>
        </div>

        <button onClick={() => { AudioService.playSfx('click'); onEndTurn(); }}
            className="w-full py-4 mt-2 bg-red-950/40 border-2 border-red-900/50 hover:bg-red-600 hover:border-red-400 hover:shadow-[0_0_40px_rgba(239,68,68,0.6)] text-red-500 hover:text-white font-black font-mono tracking-[0.5em] text-[12px] transition-all duration-500 uppercase z-10 clip-tech-button relative group/btn overflow-hidden"
        >
            <div className="absolute inset-0 warning-stripes opacity-10 group-hover/btn:opacity-30 transition-opacity duration-300 pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_2s_infinite] pointer-events-none"></div>
            <span className="relative z-10 drop-shadow-lg">TERMINATE_CYCLE</span>
        </button>
    </div>
);

const CharacterCard: React.FC<CharacterCardProps & { onStatusHover: (e: React.MouseEvent, t: string, c: string) => void; onStatusLeave: () => void }> = ({
    id, name, hp, maxHp, block, imageUrl, isDead, events, isTargeted, isSelectable, onSelect, status,
    onStatusHover, onStatusLeave
}) => {
    const [shake, setShake] = useState(false);
    const lastDamageEventId = useMemo(() => events.filter(e => e.type === 'damage').pop()?.id, [events]);

    useEffect(() => {
        if (lastDamageEventId) {
            setShake(true);
            const timer = setTimeout(() => setShake(false), 500);
            return () => clearTimeout(timer);
        }
    }, [lastDamageEventId]);

    return (
        <div onClick={() => { if (isSelectable && !isDead && onSelect) { AudioService.playSfx('click'); onSelect(); } }}
            className={`relative w-32 h-44 transition-all duration-300 flex flex-col overflow-hidden clip-tech-card backdrop-blur-md group
            ${isDead ? 'bg-black/80 border border-gray-900 opacity-50 grayscale' : isTargeted ? 'bg-red-950/40 border-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] scale-105 z-10' : isSelectable ? 'bg-emerald-950/30 border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer hover:scale-105 hover:bg-emerald-900/50 z-20' : 'bg-black/60 border border-cyan-900/40 hover:border-cyan-500/50 hover:bg-black/80'}
            ${shake ? 'animate-shake' : ''}`}
        >
            {isTargeted && !isDead && <div className="absolute top-0 left-0 w-full bg-red-600 text-white text-[8px] py-0.5 text-center font-bold tracking-widest animate-pulse z-30 shadow-md">LOCKED</div>}
            {isSelectable && !isDead && <div className="absolute top-0 left-0 w-full bg-emerald-600 text-white text-[8px] py-0.5 text-center font-bold tracking-widest animate-pulse z-30 shadow-md">SELECTABLE</div>}

            {!isDead && imageUrl && (
                <div className="absolute inset-0 z-0 bg-black">
                    <img src={imageUrl} alt={name} className="w-full h-full object-cover opacity-50 mix-blend-luminosity group-hover:opacity-70 transition-opacity duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20"></div>
                </div>
            )}

            {block > 0 && (
                <div
                    className="absolute top-5 right-2 z-30 flex items-center justify-center w-8 h-9 clip-hex bg-blue-950/90 border border-blue-400 shadow-[0_0_10px_rgba(34,211,238,0.4)] cursor-help"
                    onMouseEnter={(e) => onStatusHover(e, '能量护甲', `吸收下一次收到的 ${block} 点伤害。`)}
                    onMouseLeave={onStatusLeave}
                >
                    <span className="text-[11px] font-black font-mono text-blue-100">{block}</span>
                </div>
            )}

            <div className="absolute top-8 -left-2 flex flex-col gap-2 z-30 pointer-events-none">
                {status?.map((s, i) => (
                    <StatusBadge key={i} s={s} onHover={onStatusHover} onLeave={onStatusLeave} size="sm" />
                ))}
            </div>

            <div className="mt-auto h-16 bg-gradient-to-t from-black via-black/80 to-transparent p-2.5 flex flex-col justify-end gap-1.5 z-20 pointer-events-none w-full">
                <div className="flex flex-col gap-0.5">
                    <span className={`text-[10px] font-black tracking-widest uppercase ${id === 'player' ? 'text-cyan-400 drop-shadow-[0_0_3px_#22d3ee]' : 'text-gray-300'} truncate w-full`}>{name}</span>
                    <span className={`text-[9px] font-mono ${hp < maxHp * 0.3 ? 'text-red-400 animate-pulse font-bold' : 'text-gray-400'}`}>{hp.toFixed(1)} / {maxHp}</span>
                </div>
                <div className="w-full h-1.5 bg-gray-900 relative overflow-hidden skew-x-[-15deg]">
                    <div className={`h-full transition-all duration-500 ease-out ${hp < maxHp * 0.3 ? 'bg-red-500 shadow-[0_0_8px_red]' : 'bg-cyan-500 shadow-[0_0_8px_#22d3ee]'}`} style={{ width: `${Math.max(0, (hp / maxHp) * 100)}%` }} />
                </div>
            </div>

            {events.map(e => (
                <div key={e.id} className={`absolute top-1/3 left-1/2 -translate-x-1/2 font-black font-mono text-2xl animate-damage-float whitespace-nowrap z-50 drop-shadow-lg
                    ${e.type === 'damage' ? 'text-red-500' : e.type === 'heal' ? 'text-emerald-400' : e.type === 'block' ? 'text-blue-400' : 'text-white'}`}>
                    {e.type === 'damage' ? `-${e.value}` : e.type === 'block' ? `🛡${e.value}` : `+${e.value}`}
                </div>
            ))}
        </div>
    );
};

const SquadDisplay: React.FC<SquadDisplayProps & { onStatusHover: (e: React.MouseEvent, t: string, c: string) => void; onStatusLeave: () => void }> = ({
    player, visualEvents, enemyIntent, onTargetClick, isValidTarget, targetMode,
    onStatusHover, onStatusLeave
}) => {
    const checkSelectable = useCallback((unitId: string) => {
        if (!isValidTarget) return false;
        if (targetMode === 'single_teammate') return unitId !== 'player';
        if (targetMode === 'single_ally') return true;
        return false;
    }, [isValidTarget, targetMode]);

    return (
        <div className="flex items-start justify-center gap-4 px-4 pt-4 pointer-events-auto w-full">
            <CharacterCard id="player" name={player.static.name} hp={player.dynamic.hp} maxHp={player.static.initialState.vital.maxHp}
                block={getCombatState(player.dynamic).shield || 0}
                imageUrl={player.dynamic.imageUrl} isDead={player.dynamic.hp <= 0} events={visualEvents.filter(e => e.target === 'player')}
                isTargeted={enemyIntent?.targetId === 'player'} isSelectable={checkSelectable('player')} onSelect={() => onTargetClick?.('player')}
                status={getCombatState(player.dynamic).status}
                onStatusHover={onStatusHover} onStatusLeave={onStatusLeave}
            />
            {player.companions.map(comp => {
                const compCombat = getCombatState(comp.dynamic);
                return (
                    <CharacterCard key={comp.static.id} id={comp.static.id} name={comp.static.name} hp={comp.dynamic.hp} maxHp={comp.static.initialState.vital.maxHp}
                        block={compCombat.shield || 0}
                        imageUrl={comp.dynamic.imageUrl} isDead={comp.dynamic.hp <= 0} events={visualEvents.filter(e => e.target === comp.static.id)}
                        isTargeted={enemyIntent?.targetId === comp.static.id} isSelectable={checkSelectable(comp.static.id)} onSelect={() => onTargetClick?.(comp.static.id)}
                        status={compCombat.status}
                        onStatusHover={onStatusHover} onStatusLeave={onStatusLeave}
                    />
                );
            })}
        </div>
    );
};

// ==========================================
// 3. 根组件 (Root Container)
// ==========================================

const CombatPanel: React.FC<CombatPanelProps> = ({
    enemy, player, visualEvents, onManualGen, isGenerating,
    hand = [], drawPile = [], discardPile = [], exhaustPile = [],
    energy = 0, maxEnergy = 3, onPlayCard, onEndTurn, discardRequired = 0, onManualDiscard
}) => {
    const [viewingPile, setViewingPile] = useState<'draw' | 'discard' | 'exhaust' | null>(null);
    const [selectedCard, setSelectedCard] = useState<CardInstance | null>(null);
    const selectedCardRef = useRef<CardInstance | null>(null);
    selectedCardRef.current = selectedCard;

    const [tooltip, setTooltip] = useState<{ title?: string; content: string; x: number; y: number } | null>(null);

    const handleStatusHover = useCallback((e: React.MouseEvent, title: string, content: string) => {
        setTooltip({ title, content, x: e.clientX, y: e.clientY });
    }, []);

    const handleStatusLeave = useCallback(() => {
        setTooltip(null);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && selectedCardRef.current) {
                setSelectedCard(null);
                AudioService.playSfx('ui_close');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const isTargetingEnemy = useMemo(() => selectedCard?.effects.some(e => ['enemy', 'all_enemies'].includes(e.target)), [selectedCard]);
    const isTargetingAlly = useMemo(() => selectedCard?.effects.some(e => ['single_ally', 'single_teammate'].includes(e.target)), [selectedCard]);
    const targetMode = useMemo(() => selectedCard?.effects.find(e => ['single_ally', 'single_teammate'].includes(e.target))?.target as CardTarget | undefined, [selectedCard]);

    const handleCardClick = useCallback((card: CardInstance) => {
        const { isUnplayable } = getCardBaseFeatures(card);

        if (discardRequired > 0) return onManualDiscard?.(card);
        if (isUnplayable) return AudioService.playSfx('error');

        const needsSelection = card.effects.some(e => ['enemy', 'single_teammate', 'single_ally'].includes(e.target));
        if (!needsSelection) {
            onPlayCard?.(card, 'none');
            setSelectedCard(null);
            return;
        }

        if (selectedCardRef.current?.instanceId === card.instanceId) {
            setSelectedCard(null);
            AudioService.playSfx('ui_close');
        } else {
            setSelectedCard(card);
            AudioService.playSfx('card_hover');
        }
    }, [discardRequired, onManualDiscard, onPlayCard]);

    const handleTargetClick = useCallback((targetId: string, targetType: 'enemy' | 'ally') => {
        const card = selectedCardRef.current;
        if (!card || !onPlayCard) return;

        const targets = card.effects.map(e => e.target);
        if (targets.includes('enemy') && targetType !== 'enemy') return AudioService.playSfx('error');
        if ((targets.includes('single_ally') || targets.includes('single_teammate')) && targetType !== 'ally') return AudioService.playSfx('error');
        if (targets.includes('single_teammate') && targetId === 'player') return AudioService.playSfx('error');

        onPlayCard(card, targetId);
        setSelectedCard(null);
    }, [onPlayCard]);

    const handleBackgroundClick = (e: React.MouseEvent) => {
        if (selectedCard && e.target === e.currentTarget) setSelectedCard(null);
    };

    return (
        <div className="absolute inset-0 z-50 flex overflow-hidden pointer-events-auto bg-black/40 backdrop-blur-sm font-sans" onClick={handleBackgroundClick}>
            {tooltip && <Tooltip {...tooltip} />}

            {/* 背景增强层 */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-grid-tech opacity-60"></div>
                {/* 动态环境光 */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.8)_100%)]"></div>
            </div>

            {/* 全局扫描线 */}
            <div className="hud-scanline opacity-10"></div>


            <div className="relative w-full h-full flex pt-8 pb-8 px-8 gap-8 pointer-events-none z-10">
                <div className="w-[32%] lg:w-[28%] h-full flex flex-col gap-8 pointer-events-none">
                    <div className="flex-1 relative pointer-events-auto">
                        <HandArea hand={hand} energy={energy} player={player} enemy={enemy} onPlayCard={handleCardClick} selectedCardId={selectedCard?.instanceId} />
                        {discardRequired > 0 && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                                <div className="bg-red-950/95 backdrop-blur-xl clip-tech-card border-2 border-red-500 text-red-100 px-8 py-6 shadow-[0_0_50px_rgba(239,68,68,0.6)] animate-glitch flex flex-col items-center gap-4">
                                    <span className="text-5xl filter drop-shadow-[0_0_10px_red]">⚠️</span>
                                    <div className="flex flex-col items-center">
                                        <span className="font-black font-mono text-[14px] tracking-[0.4em] uppercase text-center leading-tight">
                                            SYSTEM_OVERLOAD
                                        </span>
                                        <span className="text-red-400 font-mono text-[11px] mt-1 tracking-widest">ACTION_REQUIRED: DISCARD {discardRequired} UNIT(S)</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="h-auto pointer-events-auto mt-auto">
                        <PlayerHud energy={energy} maxEnergy={maxEnergy}
                            discardPileCount={discardPile.length} exhaustPileCount={exhaustPile.length}
                            drawPileCount={drawPile.length} roundCount={player.currentGameRound.combatTurn}
                            onEndTurn={() => { if (discardRequired === 0) { onEndTurn?.(); setSelectedCard(null); } }}
                            onOpenDiscard={() => setViewingPile('discard')} onOpenExhaust={() => setViewingPile('exhaust')}
                            onOpenDrawPile={() => setViewingPile('draw')}
                        />
                    </div>
                </div>

                <div className="w-[68%] lg:w-[72%] h-full flex flex-col relative pointer-events-none">
                    <div className="h-64 flex justify-center items-start pt-4 pointer-events-none z-20">
                        <SquadDisplay
                            player={player} visualEvents={visualEvents} enemyIntent={enemy.dynamic.nextIntent}
                            onTargetClick={(id) => handleTargetClick(id, 'ally')} isValidTarget={!!isTargetingAlly} targetMode={targetMode}
                            onStatusHover={handleStatusHover} onStatusLeave={handleStatusLeave}
                        />
                    </div>
                    <div className="flex-1 flex items-center justify-center relative pointer-events-none -mt-16">
                        <EnemyDisplay
                            enemy={enemy} player={player} visualEvents={visualEvents} onManualGen={onManualGen} isGenerating={isGenerating}
                            onTargetClick={() => handleTargetClick('enemy', 'enemy')} isValidTarget={!!isTargetingEnemy}
                            onStatusHover={handleStatusHover} onStatusLeave={handleStatusLeave}
                        />
                    </div>
                </div>
            </div>

            {selectedCard && (
                <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-2xl clip-tech-button border-2 border-cyan-500/60 text-cyan-200 px-10 py-4 pointer-events-none animate-pulse-glow z-40 font-black font-mono text-sm tracking-[0.4em] flex items-center gap-4 shadow-[0_10px_40px_rgba(0,243,255,0.3)]">
                    <span className="w-3 h-3 bg-cyan-400 clip-hex animate-ping"></span>
                    NEURAL_LINK_ACTIVE: <span className="text-white drop-shadow-[0_0_8px_white]">{isTargetingEnemy ? 'HOSTILE_TARGET' : 'ALLIED_UNIT'}</span>
                </div>
            )}

            {viewingPile && (
                <div className="absolute inset-0 z-[100] pointer-events-auto">
                    <PileViewer title={viewingPile === 'draw' ? 'DATA_STREAM_BUFFER' : viewingPile === 'discard' ? 'RECOVERY_BIN' : 'NULL_VOID_ARCHIVE'}
                        cards={viewingPile === 'draw' ? drawPile : viewingPile === 'discard' ? discardPile : exhaustPile} onClose={() => setViewingPile(null)} />
                </div>
            )}

            <div className="absolute inset-0 pointer-events-none bg-[url('/noise.png')] opacity-[0.05] mix-blend-overlay z-50"></div>
            <div className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.15)_2px,rgba(0,0,0,0.2)_4px)] z-50"></div>
        </div>
    );
};

export default CombatPanel;