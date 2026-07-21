import { PlayerTemplate, NpcTemplate } from '../../meta';
import * as Card from '../card';

/**
 * 守护者 - 防守型
 * * 核心定位：超高血量、超高格挡、团队保护
 * 玩法特色：吸收伤害、保护队友、持久战
 * 风险收益：输出能力有限，但几乎不会死
 * * 属性总计：14 (6+2+4+2) — 力量与知识双核心，敏捷感知极低
 */
export const PLAYER_GUARDIAN: PlayerTemplate = {
    // 基础信息
    id: 'guardian',
    name: 'Unit-734',
    gender: 'male',
    desc: "系统日志——身份：不明。身体机械化程度：43%。记忆核心：严重损坏(数据完整性<7%)。当前运行协议：[首要]生存/[次要]保护无辜者/[隐藏]???。你不记得自己是谁，也不知道为什么会在这里。残存的日志碎片显示你曾隶属于某个「护盾计划」，但所有相关数据都被强制清除了。唯一确定的是：每当附近有人受伤，你的核心处理器会发出不可忽略的优先级警报。也许，你曾经被设计为一个好人。",
    visualPrompt: "A towering half-human half-machine guardian, 43 percent cybernetic body with exposed metal endoskeleton on the left arm and torso, one organic eye and one glowing red cybernetic eye, heavy armored plates with scratches and battle damage, thick cables connecting to a spine-mounted power core, holding a massive riot shield with dents and claw marks, industrial warehouse backdrop with sparks and steam, dark sci-fi survival horror aesthetic, intricate mechanical detail.",

    // 战斗属性 - 防守型：最高HP、高体力、低理智低精力
    initialState: {
        attribute: {
            strength: 6,    // 机械力量：碾压级近战
            agility: 2,     // 笨重缓慢
            knowledge: 4,   // 战术AI：基础战术分析
            perception: 2   // 传感器受损：感知严重受限
        },
        vital: {
            maxHp: 150,
            maxSanity: 75,
            maxStamina: 110,
            maxVigor: 70,
        },
        inventory: [
            // 武器：战斗匕首
            {
                id: 'combat_knife',
                name: '战斗匕首',
                desc: '标准军用匕首，刀刃依然锋利。',
                type: 'weapon',
                rarity: 'common',
                weaponType: 'dagger',
                meleeDamage: 6,
                rangeDamage: 0, // 补充必填字段
                maxUses: 10
            },
            // 防具：战术背心
            {
                id: 'tactical_vest',
                name: '战术背心',
                desc: '防弹背心，提供额外的防护。',
                type: 'armor',
                rarity: 'rare',
                defense: 10,
                maxUses: 20
            },
            // 饰品：守护者核心
            {
                id: 'guardian_core',
                name: '守护者核心',
                desc: '植入体内的防卫核心，极大提升使用者的生命力。',
                type: 'accessory',
                rarity: 'rare',
                effects: [
                    ['maxHp', 30] // 守护者定位：增加最大血量
                ]
            },
            // 消耗品：备用电池组
            {
                id: 'spare_battery',
                name: '备用电池组',
                desc: '工业级电池，可以为神经链路充电。',
                type: 'consumable',
                rarity: 'common',
                effects: [
                    ['restore_battery', 60]
                ]
            },
            // 消耗品：备用电池组 (第二个)
            {
                id: 'spare_battery',
                name: '备用电池组',
                desc: '工业级电池，可以为神经链路充电。',
                type: 'consumable',
                rarity: 'common',
                effects: [
                    ['restore_battery', 60]
                ]
            },
            // 工具：基础工具包
            {
                id: 'basic_toolkit',
                name: '基础工具包',
                desc: '包含常用工具的便携包。可以进行简单维修。',
                type: 'consumable',
                rarity: 'common',
                effects: [
                    ['repair_integrity', 20]
                ]
            }
        ],
        equipState: {
            weapons: [null, null],
            armors: [null, null, null],
            accessories: [null, null, null, null, null]
        },
        deck: [
            Card.STRIKE,                           // 基础攻击 (仅1张，输出极低)
            Card.DEFEND, Card.DEFEND, Card.DEFEND, // 核心：大量防御牌
            Card.SHIELD_BASH,                      // 职业特色：盾牌猛击 (攻防一体)
            Card.IRON_WILL                         // 职业特色：钢铁意志 (保留格挡)
        ],
    },
    style: 'defense',
};

export const COMPANION_GUARDIAN: NpcTemplate = {
    ...PLAYER_GUARDIAN,
    initialState: {
        ...PLAYER_GUARDIAN.initialState,
        trust: 40,
        quest: {},
    }
};