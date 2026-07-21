import { PlayerTemplate, NpcTemplate } from '../../meta';
import * as Card from '../card';

/**
 * 老兵 - 进攻型
 * * 核心定位：持续输出、生存能力、以战养战
 * 玩法特色：稳定的高伤害输出，在低血量时更具威胁
 * 风险收益：强大的战斗力以精神创伤为代价
 * * 属性总计：16 (7+3+2+4) — 力量碾压型，精神脆弱
 */
export const PLAYER_VETERAN: PlayerTemplate = {
    // 基础信息
    id: 'veteran',
    name: 'Barnes',
    gender: 'male',
    desc: "前特种作战部队中士。那次代号「黑仪式」的任务让你成了小队唯一的幸存者。真相被永远封存在机密档案室里，但死去同袍的面容每夜都准时出现在你的梦里。你知道事实——是你下达了错误的撤退指令，把他们送进了那个「东西」的嘴里。酒精、镇静剂和更多的战斗是唯一能让你暂时逃避的方式。",
    visualPrompt: "A battle-scarred male soldier in his 40s with a crew cut and a cigarette, wearing patched-up military fatigues reinforced with scrap metal plates, a bandolier of grenades across his chest, deep burn scars on his left arm, thousand-yard stare, holding a heavy combat knife, ruined military outpost backdrop with barbed wire and dim spotlights, survival horror military aesthetic, high detail.",

    // 战斗属性 - 进攻型：最高HP和体力、最低理智
    initialState: {
        attribute: {
            strength: 7,    // 核心属性：近战主力
            agility: 3,     // 不够灵活但能硬抗
            knowledge: 2,   // 不擅长思考分析
            perception: 4   // 战场直觉：在交火中存活的本能
        },
        vital: {
            maxHp: 130,
            maxSanity: 70,
            maxStamina: 120,
            maxVigor: 80,
        },
        inventory: [
            // 武器：战壕刀
            {
                id: 'trench_knife',
                name: '战壕刀',
                desc: '锋利，实用，沾过血。',
                type: 'weapon',
                rarity: 'common',
                weaponType: 'dagger',
                meleeDamage: 6,
                maxUses: 100
            },
            // 防具：战术背心
            {
                id: 'tactical_vest',
                name: '战术背心',
                desc: '防弹背心，提供额外的防护。',
                type: 'armor',
                rarity: 'rare',
                defense: 3, // 补充 armor 类型所需的 defense 属性
                maxUses: 50
            },
            // 消耗品：止痛药 (共3个)
            {
                id: 'painkillers',
                name: '止痛药',
                desc: '只能麻痹肉体。恢复少量HP。',
                type: 'consumable',
                rarity: 'common',
                effects: [['heal_hp', 20]]
            },
            {
                id: 'painkillers',
                name: '止痛药',
                desc: '只能麻痹肉体。恢复少量HP。',
                type: 'consumable',
                rarity: 'common',
                effects: [['heal_hp', 20]]
            },
            {
                id: 'painkillers',
                name: '止痛药',
                desc: '只能麻痹肉体。恢复少量HP。',
                type: 'consumable',
                rarity: 'common',
                effects: [['heal_hp', 20]]
            },
            // 杂项材料：军牌
            {
                id: 'dog_tags',
                name: '军牌',
                desc: '属于某个士兵的身份牌。名字已经被血迹覆盖。',
                type: 'material',
                rarity: 'common'
            }
        ],
        equipState: {
            weapons: [null, null],
            armors: [null, null, null],
            accessories: [null, null, null, null, null]
        },
        deck: [
            Card.STRIKE, Card.STRIKE, Card.STRIKE,  // 更多攻击牌 (暴力美学)
            Card.DEFEND, Card.DEFEND,               // 基础防御
            Card.SUPPRESSING_FIRE                   // 职业特色：伤害+虚弱
        ],
    },
    style: 'attack',
};

export const COMPANION_VETERAN: NpcTemplate = {
    ...PLAYER_VETERAN,
    initialState: {
        ...PLAYER_VETERAN.initialState,
        trust: 45,
        quest: {},
    }
};