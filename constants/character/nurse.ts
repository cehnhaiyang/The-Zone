import { PlayerTemplate, NpcTemplate } from '../../meta';
import * as Card from '../card';

/**
 * 护士 - 治疗型
 * * 核心定位：治疗、持续辅助、资源效率
 * 玩法特色：通过治疗和抽牌维持团队的长期战斗能力
 * 风险收益：单体输出较低，但团队生存能力最强
 * * 属性总计：16 (2+5+6+3) — 知识型辅助，敏捷较高
 */
export const PLAYER_NURSE: PlayerTemplate = {
    // 基础信息
    id: 'nurse',
    name: 'Elara',
    gender: 'female',
    desc: "圣伊丽莎白医院的护士长。在「那个」降临前几个月，医院就已经开始了不明原因的关停程序。你是最后一批留守人员，负责将重症病人转院。但转院车再也没有来。你看着窗外的世界从秩序坍塌为混沌，做出了决定——用仅剩的药品和物资加固医院，保护这些被整个世界遗弃的人。在「那个」降临后的第三天，一个浑身是血的「侦探」敲开了气密室的门。你收留了他。现在，你们似乎是这座医院里仅存的清醒者。",
    visualPrompt: "A exhausted female nurse in her late 20s with tired eyes and messy brown hair tied in a loose bun, wearing a worn blood-stained medical scrub layered with a makeshift tactical vest made from hospital supplies, intricate cybernetic neural ports visible on her neck, holding a glowing sci-fi medical scanner, emergency red lights casting dramatic shadows, hospital corridor backdrop with quarantine tape and flickering lights, gritty survival horror atmosphere, high detail.",

    // 战斗属性 - 治疗型：平衡的HP、最高知识、支援为主
    initialState: {
        attribute: {
            strength: 2,    // 不擅长战斗
            agility: 5,     // 护理工作锻炼出的手脚利落
            knowledge: 6,   // 核心属性：医学知识与管理经验
            perception: 3   // 一般的观察力
        },
        vital: {
            maxHp: 95,
            maxSanity: 100,
            maxStamina: 90,
            maxVigor: 90,
        },
        inventory: [
            // 武器：生锈手术刀 (敏捷类)
            {
                id: 'rusty_scalpel',
                name: '生锈手术刀',
                desc: '从废物桶里找到的。虽然生锈了，但依然锋利。',
                type: 'weapon',
                rarity: 'common',
                weaponType: 'dagger',
                meleeDamage: 3,
                rangeDamage: 0,
                maxUses: 3
            },
            // 消耗品：医疗包 (大量治疗)
            {
                id: 'medical_kit_storage',
                name: '医疗包',
                desc: '专业的急救套件，包含绷带、消毒液和止痛药。',
                type: 'consumable',
                rarity: 'rare',
                effects: [
                    ['heal_hp', 50]
                ]
            },
            // 消耗品：急救绷带
            {
                id: 'bandage',
                name: '急救绷带',
                desc: '简单的止血用品。恢复HP。',
                type: 'consumable',
                rarity: 'common',
                effects: [
                    ['heal_hp', 25]
                ]
            },
            // 消耗品：肾上腺素注射器
            {
                id: 'adrenaline_shot',
                name: '肾上腺素注射器',
                desc: '紧急情况下使用。暂时提升战斗能力。',
                type: 'consumable',
                rarity: 'rare',
                effects: [
                    ['strength', 5, 3],
                    ['agility', 5, 3]
                ]
            },
            // 消耗品：强效镇静剂 (恢复理智)
            {
                id: 'sedative_starter',
                name: '强效镇静剂',
                desc: '来自过去的处方药。大幅恢复理智。',
                type: 'consumable',
                rarity: 'common',
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
        deck: [
            Card.STRIKE, Card.STRIKE,        // 基础攻击
            Card.DEFEND, Card.DEFEND,        // 基础防御
            Card.FIELD_DRESSING,             // 职业特色：战地包扎 (治疗)
            Card.TRIAGE                      // 职业特色：检伤分类 (抽牌+弃牌)
        ],
    },
    style: 'healer',
};

export const COMPANION_NURSE: NpcTemplate = {
    ...PLAYER_NURSE,
    initialState: {
        ...PLAYER_NURSE.initialState,
        trust: 40,
        quest: {},
    }
};