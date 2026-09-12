import type { PlayerTemplate } from '../../meta';

/**
神秘学者 - 爆发型
核心定位：极高爆发、极度脆弱、以生命换力量
玩法特色：高风险高回报，用理智和生命换取毁灭性伤害
风险收益：最强的瞬间输出能力，但随时可能暴毙
*/
export const PLAYER_OCCULTIST: PlayerTemplate = {
    id: 'occultist',
    name: 'Aria',
    gender: 'female',
    desc: "前联邦大学民俗学教授。你发表的《旧日支配者的真实性考证》不仅被学界除名，还引来了「某些东西」的注视。那之后，你的右手在一周内坏死发黑，却在第八天被一种未知的寄生真菌「复活」了——它蠕动着，替你翻页，替你握笔，但你知道那不再是你的手。你不在乎。你用它记录下了更多禁忌知识，用失去的理智换取了窥视深渊的资格。真理就在那里，只差最后一步。",
    visualPrompt: "A gaunt female scholar in her 30s with long unkempt silver hair covering one eye, wearing a tattered dark academic robe with occult symbols, her right hand visibly blackened and covered in pulsating fungal growths with faint bioluminescent veins, holding an ancient tome with glowing runes, surrounded by floating arcane sigils, eerie purple-green ambient lighting, Lovecraftian horror atmosphere, intricate high detail.",
    initialState: {
        attribute: {
            strength: 1,     // 残废：身体极度虚弱
            agility: 8,      // 较弱：普通偏下的反应速度
            wisdom: 28,      // 很强：禁忌知识、仪式学与深渊理论
            perception: 26,  // 很强：灵视，能看到常人看不到的事物
            spiritual: 28    // 很强：长期接触禁忌知识形成的异常精神亲和
        },
        vital: {
            maxHp: 55,       // 残废：肉体已经被知识与寄生侵蚀
            maxSanity: 80,   // 低于普通人：精神长期暴露在深渊低语中
            maxStamina: 60,  // 残废偏上：几乎无法承受高强度体力行动
            maxVigor: 70     // 残废偏上：依靠意志与异常力量维持行动
        },
        inventory: [
            // 武器：仪式匕首
            {
                id: 'ceremonial_dagger',
                name: '仪式匕首',
                desc: '刀刃上有流动的符文。',
                type: 'weapon',
                rarity: 'organized',
                weaponType: 'magic',
                weaponDamageType: 'instant',
                range: 0,
                damage: 5,
                maxUses: 30
            },
            // 饰品：旧印护符
            {
                id: 'old_talisman',
                name: '旧印护符',
                desc: '令人不安的石刻。轻微提升理智上限。',
                type: 'accessory',
                rarity: 'organized',
                effects: [
                    ['maxSanity', 15]
                ]
            },
            // 材料：虚空碎片
            {
                id: 'void_fragment',
                name: '虚空碎片',
                desc: '从裂隙边缘凝结的能量结晶。触摸时会感到刺骨的寒冷。',
                type: 'material',
                rarity: 'abyssal'
            },
            // 消耗品：安神香
            {
                id: 'incense_bundle',
                name: '安神香',
                desc: '燃烧时能平复心神。恢复理智。',
                type: 'consumable',
                rarity: 'standard',
                effects: [
                    ['heal_sanity', 30]
                ]
            }
        ],
        equipState: {
            weapons: [null, null],
            armors: [null, null, null],
            accessories: [null, null, null, null, null]
        },
        uniqueTactic: [
            {
                type: 'attack',
                id: 'occultist_void_bolt',
                name: '虚空箭',
                desc: '引导虚空能量打击单个敌人，侵蚀其精神稳定性。',
                apCost: 2,
                requireWeapon: 'magic',
                tacticEffect: [
                    ['enemy', 'spiritual', -4, 2]
                ]
            },
            {
                type: 'defense',
                id: 'occultist_blood_pact',
                name: '鲜血契约',
                desc: '以自身精神稳定为代价，短暂提升知识强度。',
                apCost: 1,
                tacticEffect: [
                    ['self', 'wisdom', 4],
                    ['self', 'spiritual', -2]
                ]
            },
            {
                type: 'defense',
                id: 'occultist_ritual_barrier',
                name: '仪式护盾',
                desc: '构筑禁忌仪式形成的精神屏障。',
                apCost: 1,
                tacticEffect: [
                    ['self', 'spiritual', 3]
                ]
            }
        ]
    },
    style: 'burst'
}