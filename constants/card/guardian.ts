import { CardTemplate, CardTheme } from '../../meta';

export const THEME_GUARDIAN: CardTheme = {
    borderColor: 'border-slate-500/50',
    shadowColor: 'shadow-slate-500/20',
    bgGradient: 'from-slate-800/80 to-slate-950',
    textColor: 'text-slate-300',
    label: 'GUARDIAN'
};

/**
 * 守护者职业卡 - 格挡与团队保护
 */

/** 盾牌猛击 - 攻防一体的核心循环牌 */
export const SHIELD_BASH: CardTemplate = {
    id: 'shield_bash',
    name: '盾牌猛击',
    cost: 1,
    theme: THEME_GUARDIAN,
    rarity: 'common',
    desc: '进行[近程攻击]造成 6 点伤害。获得 6 点格挡（享受力量加成）。',
    effects: [
        { type: 'melee_attack', value: 6, target: 'enemy' },
        { type: 'block', value: 6, scaling: { attribute: 'strength', factor: 0.3 }, target: 'self' }
    ],
    feature: []
};

/** 钢铁意志 - 可保留的稳定格挡 */
export const IRON_WILL: CardTemplate = {
    id: 'iron_will',
    name: '钢铁意志',
    cost: 1,
    theme: THEME_GUARDIAN,
    rarity: 'rare',
    desc: '获得 10 点格挡。[保留]',
    effects: [{ type: 'block', value: 10, target: 'self' }],
    feature: ['retain']
};

/** 移动堡垒 - 超高格挡的紧急防御 */
export const FORTRESS: CardTemplate = {
    id: 'fortress',
    name: '移动堡垒',
    cost: 2,
    theme: THEME_GUARDIAN,
    rarity: 'epic',
    desc: '获得 24 点格挡。[消耗]',
    effects: [{ type: 'block', value: 24, target: 'self' }],
    feature: ['exhaust']
};

/** 挑衅 - 零费控场+少量格挡 */
export const TAUNT: CardTemplate = {
    id: 'taunt',
    name: '挑衅',
    cost: 0,
    theme: THEME_GUARDIAN,
    rarity: 'common',
    desc: '施加 2 层[易伤]。获得 5 点格挡。',
    effects: [
        { type: 'vulnerable', value: 2, target: 'enemy' },
        { type: 'block', value: 5, target: 'self' }
    ],
    feature: []
};

/** 重盾轰击 - 高费高伤害的终结技 */
export const HEAVY_SLAM: CardTemplate = {
    id: 'heavy_slam',
    name: '重盾轰击',
    cost: 2,
    theme: THEME_GUARDIAN,
    rarity: 'common',
    desc: '进行[近程攻击]造成 18 点伤害。',
    effects: [{ type: 'melee_attack', value: 18, target: 'enemy' }],
    feature: []
};

/** 掩护 - 全队格挡，团队核心技能 */
export const COVER_FIRE: CardTemplate = {
    id: 'cover_fire',
    name: '掩护',
    cost: 1,
    theme: THEME_GUARDIAN,
    rarity: 'rare',
    desc: '全体友方（包括自己）获得 8 点格挡。',
    effects: [{ type: 'block', value: 8, target: 'all_allies' }],
    feature: []
};