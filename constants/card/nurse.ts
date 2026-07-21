import { CardTemplate, CardTheme } from '../../meta';

export const THEME_NURSE: CardTheme = {
    borderColor: 'border-rose-500/50',
    shadowColor: 'shadow-rose-500/20',
    bgGradient: 'from-rose-950/80 to-slate-950',
    textColor: 'text-rose-400',
    label: 'MEDIC'
};

/**
 * 护士职业卡 - 治疗与团队辅助
 */

/** 战地包扎 - 核心治疗牌（知识加成） */
export const FIELD_DRESSING: CardTemplate = {
    id: 'field_dressing',
    name: '战地包扎',
    cost: 1,
    theme: THEME_NURSE,
    rarity: 'common',
    desc: '恢复 10 点HP（享受知识加成）。[消耗]',
    effects: [{ type: 'heal', value: 10, scaling: { attribute: 'knowledge', factor: 0.5 }, target: 'single_ally' }],
    feature: ['exhaust']
};

/** 检伤分类 - 零费过滤手牌 */
export const TRIAGE: CardTemplate = {
    id: 'triage',
    name: '检伤分类',
    cost: 0,
    theme: THEME_NURSE,
    rarity: 'common',
    desc: '抽 2 张牌，然后从手牌中选择 1 张牌丢弃。',
    effects: [
        { type: 'draw', value: 2, target: 'none' },
        { type: 'discard_hand', value: 1, target: 'none' }
    ],
    feature: []
};

/** 强化针剂 - 给予队友能量和力量增益 */
export const STIM_SHOT: CardTemplate = {
    id: 'stim_shot',
    name: '强化针剂',
    cost: 0,
    theme: THEME_NURSE,
    rarity: 'rare',
    desc: '获得 1 点能量。使目标获得 2 层[力量]。[消耗]',
    effects: [
        { type: 'energy', value: 1, target: 'self' },
        { type: 'buff_str', value: 2, target: 'single_ally' }
    ],
    feature: ['exhaust']
};

/** 强效麻醉 - 重度削弱敌人 */
export const ANESTHESIA: CardTemplate = {
    id: 'anesthesia',
    name: '强效麻醉',
    cost: 1,
    theme: THEME_NURSE,
    rarity: 'common',
    desc: '对敌人施加 3 层[虚弱]。',
    effects: [{ type: 'weaken', value: 3, target: 'enemy' }],
    feature: []
};

/** 预防医疗 - 给予队友格挡+抽牌 */
export const PREVENTIVE_CARE: CardTemplate = {
    id: 'preventive_care',
    name: '预防医疗',
    cost: 1,
    theme: THEME_NURSE,
    rarity: 'rare',
    desc: '使目标获得 8 点格挡（享受知识加成）。抽 1 张牌。',
    effects: [
        { type: 'block', value: 8, scaling: { attribute: 'knowledge', factor: 0.4 }, target: 'single_ally' },
        { type: 'draw', value: 1, target: 'none' }
    ],
    feature: []
};

/** 消毒杀菌 - 近战输出+抽牌 */
export const STERILIZE: CardTemplate = {
    id: 'sterilize',
    name: '消毒杀菌',
    cost: 1,
    theme: THEME_NURSE,
    rarity: 'common',
    desc: '进行[近程攻击]造成 8 点伤害。抽 1 张牌。',
    effects: [
        { type: 'melee_attack', value: 8, target: 'enemy' },
        { type: 'draw', value: 1, target: 'none' }
    ],
    feature: []
};