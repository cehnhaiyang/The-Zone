import type { PlayerTemplate, NpcTemplate, QuestTemplate, Tactic } from '../../meta';

/**
 * 老兵 - 进攻型
 *
 * 核心定位：持续输出、前线压制、以战养战
 * 玩法特色：高力量与高生命支撑正面交火，战术偏向削弱敌人和稳定自身
 * 风险收益：精神创伤限制了理智上限，但战场经验让他在高压下仍能保持输出
 */

const VETERAN_QUESTS: QuestTemplate[] = [
    {
        id: 'veteran_black_rite_aftermath',
        desc: 'Barnes 需要一份迟到的撤退报告。找到「黑仪式」行动记录仪，确认当年那条命令究竟来自谁。',
        difficulty: 6,
        goals: [
            {
                id: 'veteran_black_rite_recorder',
                name: '黑仪式记录仪',
                desc: '一台外壳被高温熔蚀的战术记录仪，仍残留着断断续续的加密音频。',
                type: 'data',
                rarity: 'organized',
                documentContent:
                    '……撤退指令被覆盖……目标不是回收，是喂养……重复，不要看它的……',
                audioScript:
                    '静电噪声中传来 Barnes 自己的声音，正在下达一条他完全不记得的命令。'
            }
        ],
        rewards: [
            {
                id: 'veteran_memory_patch',
                name: '黑仪式臂章',
                desc: '被烧焦的部队臂章。它不能原谅你，但能提醒你记住还剩下什么。',
                type: 'accessory',
                rarity: 'deep',
                effects: [
                    ['maxSanity', 20],
                    ['strength', 1]
                ]
            },
            {
                id: 'veteran_field_sedative',
                name: '军用镇静剂',
                desc: '标签已经模糊。针剂里剩下的液体还能把尖叫声压下去一会儿。',
                type: 'consumable',
                rarity: 'organized',
                effects: [['heal_sanity', 25]]
            }
        ]
    }
];

const VETERAN_PLAYER_TACTICS: Tactic[] = [
    {
        type: 'attack',
        id: 'veteran_suppressing_fire',
        name: '压制火力',
        desc: '以密集攻击压制单个敌人，破坏其节奏与机动能力。',
        apCost: 2,
        tacticEffect: [['enemy', 'agility', -4, 2]]
    },
    {
        type: 'defense',
        id: 'veteran_combat_hardened',
        name: '战斗硬化',
        desc: '依靠战场经验激发肌肉记忆，短暂提升自身力量。',
        apCost: 1,
        tacticEffect: [['self', 'strength', 3]]
    },
    {
        type: 'defense',
        id: 'veteran_black_rite_echo',
        name: '黑仪式回响',
        desc: '把那段被挖空的记忆压回身体深处，用麻木换取短暂的稳定。',
        apCost: 1,
        tacticEffect: [['self', 'sanity', 8]]
    }
];

const VETERAN_COMPANION_TACTICS: Tactic[] = [...VETERAN_PLAYER_TACTICS];

export const PLAYER_VETERAN: PlayerTemplate = {
    id: 'veteran',
    name: 'Barnes',
    gender: 'male',
    desc: '前特种作战部队中士。那次代号「黑仪式」的任务让你成了小队唯一的幸存者。真相被永远封存在机密档案室里，但死去同袍的面容每夜都准时出现在你的梦里。你知道事实——是你下达了错误的撤退指令，把他们送进了那个「东西」的嘴里。酒精、镇静剂和更多的战斗是唯一能让你暂时逃避的方式。',
    visualPrompt:
        'A battle-scarred male soldier in his 40s with a crew cut and a cigarette, wearing patched-up military fatigues reinforced with scrap metal plates, a bandolier of grenades across his chest, deep burn scars on his left arm, thousand-yard stare, holding a heavy combat knife, ruined military outpost backdrop with barbed wire and dim spotlights, survival horror military aesthetic, high detail.',
    initialState: {
        attribute: {
            strength: 25,    // 较强：近战主力，能够稳定造成压制性伤害
            agility: 14,     // 普通：不够灵巧，但足以完成战术动作
            wisdom: 10,      // 普通偏弱：不擅长复杂分析与长期规划
            perception: 22,  // 较强：战场直觉，能在交火中捕捉威胁
            spiritual: 0     // 无灵力的普通人
        },
        vital: {
            maxHp: 230,      // 优秀：长期作战留下的强悍体魄
            maxSanity: 90,   // 低于普通人：PTSD 与负罪感持续侵蚀精神
            maxStamina: 210, // 优秀：久经沙场，耐力极强
            maxVigor: 190    // 优秀：高强度军事训练留下的底子
        },
        inventory: [
            {
                id: 'veteran_trench_knife',
                name: '战壕刀',
                desc: '锋利、实用、沾过血。适合近距离放血与压制。',
                type: 'weapon',
                rarity: 'standard',
                weaponType: 'prick',
                weaponDamageType: 'cold',
                range: 1,
                damage: 9,
                maxUses: 120
            },
            {
                id: 'veteran_tactical_vest',
                name: '战术背心',
                desc: '旧防弹背心，内衬被手工加固过，仍能挡住部分冲击。',
                type: 'armor',
                rarity: 'organized',
                partialReduction: 0.12,
                maxUses: 90
            },
            {
                id: 'veteran_painkillers',
                name: '止痛药',
                desc: '只能麻痹肉体。恢复少量 HP。',
                type: 'consumable',
                rarity: 'standard',
                effects: [['heal_hp', 30]]
            },
            {
                id: 'veteran_field_whiskey',
                name: '军用威士忌',
                desc: '味道像燃料，但能把颤抖压下去一会儿。',
                type: 'consumable',
                rarity: 'standard',
                effects: [
                    ['heal_vigor', 25],
                    ['heal_sanity', 5]
                ]
            },
            {
                id: 'veteran_dog_tags',
                name: '染血军牌',
                desc: '属于某个士兵的身份牌。名字已经被血迹覆盖。',
                type: 'material',
                rarity: 'standard'
            }
        ],
        uniqueTactic: VETERAN_PLAYER_TACTICS
    },
    style: 'attack'
};

export const COMPANION_VETERAN: NpcTemplate = {
    ...PLAYER_VETERAN,
    id: 'veteran_companion',
    desc: '前特种作战部队中士，「黑仪式」行动的唯一幸存者。他用酒精、暴力和沉默把自己封起来，但只要战线还没有崩，他就会站在最前面。',
    initialState: {
        ...PLAYER_VETERAN.initialState,
        uniqueTactic: VETERAN_COMPANION_TACTICS,
        trust: 45,
        quest: VETERAN_QUESTS
    }
};