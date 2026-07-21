import { PlayerTemplate, NpcTemplate } from '../../meta';
import * as Card from '../card';

/**
 * 调查员 - 战术型
 * 核心定位：高理智、高感知、情报分析与弱点利用
 * 玩法特色：通过敏锐的洞察力和战术规划在夹缝中求生
 * 风险收益：身板脆弱，但拥有极强的探索与情报获取能力
 * 属性总计：18 (2+5+5+6) — 偏科型，感知知识双核心
 */
export const PLAYER_INVESTIGATOR: PlayerTemplate = {
    // 基础信息
    id: 'investigator',
    name: 'Kael',
    gender: 'male',
    desc: "你曾是组织某个表面产业的经纪人。几年前，你敏锐地察觉到了高层资金流向的异常，以及那些所谓“医疗慈善”背后的深渊阴谋，并一直在暗中追查。你头上这台陈旧的神经链接仪，是从一名为组织处理后事的“清理人”手里弄来的。它曾保护前任主人免受直视「它们」的理智污染，现在则是你深入这片无尽领域揭开真相的唯一倚仗。",
    visualPrompt: "A weary but sharp-eyed former corporate broker in a ruined tailored suit, wearing a bulky, retro-fitted Neural Link visor scavenged from a corpse. He holds a compact concealed pistol. Gritty cyberpunk noir atmosphere, dim lighting with neon reflections highlighting the scratched visor, high detail.",

    // 战斗属性 - 战术型：低HP、最高理智与精力、强控场能力
    initialState: {
        attribute: {
            strength: 2,    // 不擅长正面对抗和肉搏
            agility: 5,     // 混迹灰色地带练就的敏捷反应
            knowledge: 5,   // 追查阴谋积累的地下知识与黑客手段
            perception: 6   // 经纪人出身的极高敏锐直觉与观察力
        },
        vital: {
            maxHp: 85,      // 普通人的血量
            maxSanity: 120, // 坚定的追查信念，提供了极高的理智上限
            maxStamina: 80,
            maxVigor: 100,
        },
        inventory: [
            // 武器：隐蔽手枪
            {
                id: 'concealed_pistol',
                name: '隐蔽的防身手枪',
                desc: '经纪人时期用来防身的紧凑型手枪，火力一般但方便携带。',
                type: 'weapon',
                rarity: 'common',
                weaponType: 'firearm',
                meleeDamage: 2,
                rangeDamage: 5,
                maxUses: 100
            },
            // 饰品：清理人的加密日志 (Knowledge+1)
            {
                id: 'cleaner_log',
                name: '清理人的加密日志',
                desc: '与神经链接仪一起获得的残缺日志，里面记录了组织的某些行动代号。提供基础知识加成。',
                type: 'accessory',
                rarity: 'common',
                effects: [
                    ['knowledge', 1]
                ]
            },
            // 消耗品：神经链接仪备用电池
            {
                id: 'battery_starter',
                name: '军用备用电池',
                desc: '从清理人那里顺来的高容量电池，是你维持神经链接仪运作的生命线。',
                type: 'consumable',
                rarity: 'common',
                effects: [
                    ['restore_battery', 40]
                ]
            },
            // 消耗品：应急口粮
            {
                id: 'emergency_ration',
                name: '应急口粮',
                desc: '真空包装的压缩饼干，保质期已过但似乎还能吃。',
                type: 'consumable',
                rarity: 'common',
                effects: [
                    ['heal_hp', 12]
                ]
            }
        ],
        equipState: {
            weapons: [null, null],
            armors: [null, null, null],
            accessories: [null, null, null, null, null]
        },
        deck: [
            Card.STRIKE, Card.STRIKE,           // 基础攻击
            Card.DEFEND, Card.DEFEND,           // 基础防御
            Card.ANALYZE,                       // 契合经纪人的情报分析能力
            Card.DEDUCTION                      // 契合追查真相的逻辑推理能力
        ],
    },
    style: 'tactical',
};

export const COMPANION_INVESTIGATOR: NpcTemplate = {
    ...PLAYER_INVESTIGATOR,
    initialState: {
        ...PLAYER_INVESTIGATOR.initialState,
        trust: 35,
        quest: {},
    }
};