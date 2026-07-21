import { CardTemplate, CardTheme } from '../../meta';

export const THEME_VETERAN: CardTheme = {
    borderColor: 'border-red-600/50',
    shadowColor: 'shadow-red-600/20',
    bgGradient: 'from-red-950/80 to-slate-950',
    textColor: 'text-red-400',
    label: 'VETERAN'
};

/**
 * 老兵职业卡 - 持续输出与压制
 */

/** 火力压制 - 近距离压制攻击，无武器限制 */
export const SUPPRESSING_FIRE: CardTemplate = {
    id: 'suppressing_fire',
    name: '火力压制',
    cost: 1,
    theme: THEME_VETERAN,
    rarity: 'common',
    desc: '进行[近程攻击]造成 8 点伤害并施加 1 层[虚弱]。',
    effects: [
        { type: 'melee_attack', value: 8, target: 'enemy' },
        { type: 'weaken', value: 1, target: 'enemy' }
    ],
    feature: []
};

/** 肾上腺素 - 以血换资源的爆发牌 */
export const ADRENALINE: CardTemplate = {
    id: 'adrenaline',
    name: '肾上腺素',
    cost: 0,
    theme: THEME_VETERAN,
    rarity: 'rare',
    desc: '获得 2 点能量。受到 3 点[即时伤害]。[消耗]',
    effects: [
        { type: 'energy', value: 2, target: 'none' },
        { type: 'instant_attack', value: 3, target: 'self' }
    ],
    feature: ['exhaust']
};

/** 破片手雷 - 高伤害远程爆破（需装备爆炸类武器） */
export const FRAG_GRENADE: CardTemplate = {
    id: 'frag_grenade_CardTemplate',
    name: '破片手雷',
    cost: 2,
    theme: THEME_VETERAN,
    rarity: 'rare',
    desc: '进行[远程攻击]造成 20 点伤害，并施加 2 层[易伤]。（需装备爆炸类武器）[消耗]',
    effects: [
        { type: 'ranged_attack', value: 20, requiredWeaponType: 'explosive', target: 'enemy' },
        { type: 'vulnerable', value: 2, target: 'enemy' }
    ],
    feature: ['exhaust']
};

/** 死守 - 高额格挡（力量加成） */
export const TRENCH_STAND: CardTemplate = {
    id: 'trench_stand',
    name: '死守',
    cost: 2,
    theme: THEME_VETERAN,
    rarity: 'epic',
    desc: '获得 15 点格挡（享受力量加成）。',
    effects: [{ type: 'block', value: 15, scaling: { attribute: 'strength', factor: 0.8 }, target: 'self' }],
    feature: []
};

/** 刺刀冲锋 - 零费消耗攻击 */
export const BAYONET_CHARGE: CardTemplate = {
    id: 'bayonet_charge',
    name: '刺刀冲锋',
    cost: 0,
    theme: THEME_VETERAN,
    rarity: 'common',
    desc: '进行[近程攻击]造成 6 点伤害。[消耗]',
    effects: [{ type: 'melee_attack', value: 6, target: 'enemy' }],
    feature: ['exhaust']
};

/** 战术装填 - 零费消耗抽牌 + 能量 */
export const TACTICAL_RELOAD: CardTemplate = {
    id: 'tactical_reload',
    name: '战术装填',
    cost: 0,
    theme: THEME_VETERAN,
    rarity: 'common',
    desc: '获得 1 点能量。抽 2 张牌。[消耗]',
    effects: [
        { type: 'energy', value: 1, target: 'none' },
        { type: 'draw', value: 2, target: 'none' }
    ],
    feature: ['exhaust']
};