import { CardTemplate, CardTheme } from '../../meta';

export const THEME_GENERAL: CardTheme = {
    borderColor: '#ff0000',
    shadowColor: '#aa0000',
    bgGradient: 'linear-gradient(to bottom, #1a1a1a, #0d0d0d)',
    textColor: '#575656',
    label: 'STANDARD'
};

/**
 * 通用基础牌 - 所有职业共享
 */

/** 基础攻击牌 */
export const STRIKE: CardTemplate = {
    id: 'strike',
    name: '近程攻击',
    cost: 1,
    theme: THEME_GENERAL,
    rarity: 'common',
    desc: '造成相当于你装备的所有武器的近程攻击力之和的伤害。',
    effects: [{ type: 'melee_attack', value: 6, target: 'enemy' }],
    feature: []
};

/** 基础防御牌 - 费效比基准 (1费 = 5格挡) */
export const DEFEND: CardTemplate = {
    id: 'defend',
    name: '防御',
    cost: 1,
    theme: THEME_GENERAL,
    rarity: 'common',
    desc: '获得 5 点格挡。',
    effects: [{ type: 'block', value: 5, target: 'self' }],
    feature: []
};

/** 闪避牌 - 低费机动牌，提供少量格挡和敏捷增益 */
export const DODGE: CardTemplate = {
    id: 'dodge',
    name: '闪避',
    cost: 0,
    theme: THEME_GENERAL,
    rarity: 'common',
    desc: '获得 3 点格挡。获得 2 层[敏捷]（持续1回合）。[消耗]',
    effects: [
        { type: 'block', value: 3, target: 'self' },
        { type: 'buff_agi', value: 2, duration: 1, target: 'self' }
    ],
    feature: ['exhaust']
};

/** 急救牌 - 基础治疗 */
export const HEAL: CardTemplate = {
    id: 'heal',
    name: '急救',
    cost: 0,
    theme: THEME_GENERAL,
    rarity: 'rare',
    desc: '恢复 6 点生命。[消耗]',
    effects: [{ type: 'heal', value: 6, target: 'single_ally' }],
    feature: ['exhaust']
};