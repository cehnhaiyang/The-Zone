import { CardTemplate, CardTheme } from '../../meta';

export const THEME_OCCULTIST: CardTheme = {
    borderColor: 'border-purple-600/50',
    shadowColor: 'shadow-purple-600/20',
    bgGradient: 'from-purple-950/80 to-slate-950',
    textColor: 'text-purple-400',
    label: 'OCCULTIST'
};

/**
 * 神秘学者职业卡 - 极端爆发与献祭
 */

/** 虚空箭 - 即时高伤害，回合结束自毁 */
export const VOID_BOLT: CardTemplate = {
    id: 'void_bolt',
    name: '虚空箭',
    cost: 1,
    theme: THEME_OCCULTIST,
    rarity: 'common',
    desc: '[即时攻击]造成 14 点伤害。[虚无]',
    effects: [{ type: 'instant_attack', value: 14, target: 'enemy' }],
    feature: ['ethereal']
};

/** 仪式护盾 - 可保留的高额格挡（知识加成） */
export const RITUAL_BARRIER: CardTemplate = {
    id: 'ritual_barrier',
    name: '仪式护盾',
    cost: 2,
    theme: THEME_OCCULTIST,
    rarity: 'rare',
    desc: '获得 12 点格挡（享受知识加成）。[保留]',
    effects: [
        { type: 'block', value: 12, scaling: { attribute: 'knowledge', factor: 0.6 }, target: 'self' }
    ],
    feature: ['retain']
};

/** 鲜血契约 - 献祭HP换取大量抽牌和能量 */
export const BLOOD_PACT: CardTemplate = {
    id: 'blood_pact',
    name: '鲜血契约',
    cost: 0,
    theme: THEME_OCCULTIST,
    rarity: 'rare',
    desc: '受到 4 点[即时伤害]。抽 3 张牌，获得 1 点能量。[消耗]',
    effects: [
        { type: 'instant_attack', value: 4, target: 'self' },
        { type: 'draw', value: 3, target: 'none' },
        { type: 'energy', value: 1, target: 'none' }
    ],
    feature: ['exhaust']
};

/** 古神爆破 - 终极毁灭牌 */
export const ELDRITCH_BLAST: CardTemplate = {
    id: 'eldritch_blast',
    name: '古神爆破',
    cost: 3,
    theme: THEME_OCCULTIST,
    rarity: 'epic',
    desc: '[即时攻击]造成 40 点毁灭性伤害。[虚无]',
    effects: [
        { type: 'instant_attack', value: 40, target: 'enemy' }
    ],
    feature: ['ethereal']
};

/** 灵魂汲取 - 伤害+自愈的续航牌 */
export const SOUL_DRAIN: CardTemplate = {
    id: 'soul_drain',
    name: '灵魂汲取',
    cost: 1,
    theme: THEME_OCCULTIST,
    rarity: 'epic',
    desc: '[即时攻击]造成 8 点伤害。恢复 4 点HP（享受知识加成）。[消耗]',
    effects: [
        { type: 'instant_attack', value: 8, target: 'enemy' },
        { type: 'heal', value: 4, scaling: { attribute: 'knowledge', factor: 0.2 }, target: 'self' }
    ],
    feature: ['exhaust']
};

/** 深渊凝视 - 双重debuff控场 */
export const ABYSSAL_GAZE: CardTemplate = {
    id: 'abyssal_gaze',
    name: '深渊凝视',
    cost: 1,
    theme: THEME_OCCULTIST,
    rarity: 'rare',
    desc: '施加 2 层[易伤]和 2 层[虚弱]。',
    effects: [
        { type: 'vulnerable', value: 2, target: 'enemy' },
        { type: 'weaken', value: 2, target: 'enemy' }
    ],
    feature: []
};