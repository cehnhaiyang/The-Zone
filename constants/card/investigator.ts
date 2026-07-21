import { CardTemplate, CardTheme } from '../../meta';

export const THEME_INVESTIGATOR: CardTheme = {
    borderColor: 'border-cyan-500/50',
    shadowColor: 'shadow-cyan-500/20',
    bgGradient: 'from-cyan-950/80 to-slate-950',
    textColor: 'text-cyan-400',
    label: 'INVESTIGATOR'
};

/**
 * 调查员职业卡 - 控制与情报
 */

/** 现场分析 - 零费快速抽牌 */
export const ANALYZE: CardTemplate = {
    id: 'analyze',
    name: '现场分析',
    cost: 0,
    theme: THEME_INVESTIGATOR,
    rarity: 'common',
    desc: '抽 2 张牌。[消耗]',
    effects: [{ type: 'draw', value: 2, target: 'none' }],
    feature: ['exhaust']
};

/** 精准射击 - 远程输出+控制（需装备枪械） */
export const CALCULATED_SHOT: CardTemplate = {
    id: 'calculated_shot',
    name: '精准射击',
    cost: 1,
    theme: THEME_INVESTIGATOR,
    rarity: 'rare',
    desc: '进行[远程攻击]造成 9 点伤害并施加 1 层[易伤]。（需装备枪械类武器）',
    effects: [
        { type: 'ranged_attack', value: 9, requiredWeaponType: 'gun', target: 'enemy' },
        { type: 'vulnerable', value: 1, target: 'enemy' }
    ],
    feature: []
};

/** 逻辑演绎 - 控场+抽牌 */
export const DEDUCTION: CardTemplate = {
    id: 'deduction',
    name: '逻辑演绎',
    cost: 1,
    theme: THEME_INVESTIGATOR,
    rarity: 'common',
    desc: '对敌人施加 2 回合[虚弱]（减少 20% 近战伤害）。抽 1 张牌。',
    effects: [
        { type: 'weaken', value: 2, target: 'enemy' },
        { type: 'draw', value: 1, target: 'none' }
    ],
    feature: []
};

/** 弱点识破 - 高级控场+防御 */
export const EXPOSE_WEAKNESS: CardTemplate = {
    id: 'expose_weakness',
    name: '弱点识破',
    cost: 1,
    theme: THEME_INVESTIGATOR,
    rarity: 'epic',
    desc: '施加 2 层[易伤]。获得 6 点格挡（享受敏捷加成）。[消耗]',
    effects: [
        { type: 'vulnerable', value: 2, target: 'enemy' },
        { type: 'block', value: 6, scaling: { attribute: 'agility', factor: 0.5 }, target: 'self' }
    ],
    feature: ['exhaust']
};

/** 取证 - 零费轻量控场+抽牌 */
export const EVIDENCE_COLLECT: CardTemplate = {
    id: 'evidence_collect',
    name: '取证',
    cost: 0,
    theme: THEME_INVESTIGATOR,
    rarity: 'common',
    desc: '施加 1 层[易伤]。抽 1 张牌。',
    effects: [
        { type: 'vulnerable', value: 1, target: 'enemy' },
        { type: 'draw', value: 1, target: 'none' }
    ],
    feature: []
};

/** 震撼弹 - 攻防一体的控场牌 */
export const STUN_GRENADE: CardTemplate = {
    id: 'stun_grenade',
    name: '震撼弹',
    cost: 1,
    theme: THEME_INVESTIGATOR,
    rarity: 'rare',
    desc: '施加 1 层[虚弱]。获得 8 点格挡。',
    effects: [
        { type: 'weaken', value: 1, target: 'enemy' },
        { type: 'block', value: 8, target: 'self' }
    ],
    feature: []
};