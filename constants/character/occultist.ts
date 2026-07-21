import { PlayerTemplate, NpcTemplate } from '../../meta';
import * as Card from '../card';

/**
 * 神秘学者 - 爆发型
 * * 核心定位：极高爆发、极度脆弱、以生命换力量
 * 玩法特色：高风险高回报，用理智和生命换取毁灭性伤害
 * 风险收益：最强的瞬间输出能力，但随时可能暴毙
 * * 属性总计：18 (1+3+8+6) — 极端偏科型，知识感知极高，力量极低
 */
export const PLAYER_OCCULTIST: PlayerTemplate = {
    // 基础信息
    id: 'occultist',
    name: 'Aria',
    gender: 'female',
    desc: "前联邦大学民俗学教授。你发表的《旧日支配者的真实性考证》不仅被学界除名，还引来了「某些东西」的注视。那之后，你的右手在一周内坏死发黑，却在第八天被一种未知的寄生真菌「复活」了——它蠕动着，替你翻页，替你握笔，但你知道那不再是你的手。你不在乎。你用它记录下了更多禁忌知识，用失去的理智换取了窥视深渊的资格。真理就在那里，只差最后一步。",
    visualPrompt: "A gaunt female scholar in her 30s with long unkempt silver hair covering one eye, wearing a tattered dark academic robe with occult symbols, her right hand visibly blackened and covered in pulsating fungal growths with faint bioluminescent veins, holding an ancient tome with glowing runes, surrounded by floating arcane sigils, eerie purple-green ambient lighting, Lovecraftian horror atmosphere, intricate high detail.",

    // 战斗属性 - 爆发型：最低HP和体力、极端知识与感知
    initialState: {
        attribute: {
            strength: 1,    // 身体极度虚弱
            agility: 3,     // 普通反应速度
            knowledge: 8,   // 核心属性：禁忌知识，全角色最高
            perception: 6   // 灵视：能看到常人看不到的事物
        },
        vital: {
            maxHp: 65,
            maxSanity: 95,
            maxStamina: 60,
            maxVigor: 70,
        },
        inventory: [
            // 武器：仪式匕首 (知识加成)
            {
                id: 'ceremonial_dagger',
                name: '仪式匕首',
                desc: '刀刃上有流动的符文。',
                type: 'weapon',
                rarity: 'rare',
                weaponType: 'magical',
                meleeDamage: 4,
                maxUses: 10
            },
            // 饰品：旧印护符 (理智抗性)
            {
                id: 'old_talisman',
                name: '旧印护符',
                desc: '令人不安的石刻。轻微提升理智上限。',
                type: 'accessory',
                rarity: 'rare',
                effects: [
                    ['maxSanity', 10]
                ]
            },
            // 遗物：虚空碎片
            {
                id: 'void_fragment',
                name: '虚空碎片',
                desc: '从裂隙边缘凝结的能量结晶。触摸时会感到刺骨的寒冷。',
                type: 'material',
                rarity: 'cursed'
            },
            // 消耗品：安神香 (恢复理智)
            {
                id: 'incense_bundle',
                name: '安神香',
                desc: '燃烧时能平复心神。恢复理智。',
                type: 'consumable',
                rarity: 'common',
                effects: [
                    ['heal_sanity', 25]
                ]
            }
        ],
        equipState: {
            weapons: [null, null],
            armors: [null, null, null],
            accessories: [null, null, null, null, null]
        },
        deck: [
            Card.STRIKE, Card.STRIKE,        // 基础攻击
            Card.DEFEND,                     // 只有1张防御 (极端脆皮)
            Card.VOID_BOLT,                  // 职业特色：虚空箭 (即时高伤害)
            Card.BLOOD_PACT,                 // 职业特色：献祭HP换抽牌+能量
            Card.RITUAL_BARRIER              // 职业特色：仪式护盾 (保留)
        ],
    },
    style: 'burst',
};

export const COMPANION_OCCULTIST: NpcTemplate = {
    ...PLAYER_OCCULTIST,
    initialState: {
        ...PLAYER_OCCULTIST.initialState,
        trust: 15,
        quest: {},
    }
};