import { CardTemplate, CardTheme } from '../../meta';

export const THEME_GLITCH: CardTheme = {
    borderColor: 'border-red-500/40',
    shadowColor: 'shadow-red-900/40',
    bgGradient: 'from-red-950/40 to-black',
    textColor: 'text-red-500',
    label: 'CORRUPTION'
};

/**
 * 故障牌 - 负面干扰卡
 * * 设计哲学：作为惩罚/诅咒机制加入玩家卡组
 * 来源：理智过低、特定事件、敌人debuff
 * 目的：占据手牌空间，施加负面效果，迫使玩家寻找净化手段
 */

/** 思维噪音 - 占位+自伤，回合结束自毁 */
export const GLITCH_STATIC: CardTemplate = {
    id: 'glitch_static',
    name: '思维噪音',
    cost: 1,
    theme: THEME_GLITCH,
    rarity: 'cursed',
    desc: '无法打出。回合结束时受到 5 点[即时伤害]后消失。[虚无]',
    effects: [{ type: 'instant_attack', value: 5, target: 'self' }],
    feature: ['ethereal', 'unplayable']
};

/** 恐慌发作 - 永久占位+锁定抽牌 */
export const PANIC_ATTACK: CardTemplate = {
    id: 'panic_attack',
    name: '恐慌发作',
    cost: 3,
    theme: THEME_GLITCH,
    rarity: 'cursed',
    desc: '无法打出。在手中时无法抽牌。[保留]',
    effects: [],
    feature: ['retain', 'unplayable']
};