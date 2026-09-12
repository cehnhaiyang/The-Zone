import type { PlayerTemplate } from '../../meta';

/**
 * 调查员 - 游走型
 *
 * 核心定位：高感知、高敏捷、情报分析与枪械牵制
 * 玩法特色：通过敏锐的洞察力、战术规划与轻型火力在夹缝中求生。
 * 风险收益：身板脆弱，正面战斗能力差，但拥有极强的探索、情报获取与先手削弱能力。
 */
export const PLAYER_INVESTIGATOR: PlayerTemplate = {
    id: 'investigator',
    name: '凯兰',
    gender: 'male',
    desc: '你曾是深渊基金会表面产业的王牌经纪人。几年前，你敏锐地察觉到高层资金流向的异常，以及那些所谓“医疗慈善”背后的深渊阴谋，并一直在暗中追查。你头上这台陈旧的神经链接仪，是从一名为组织处理后事的“清理人”手里弄来的。它曾保护前任主人免受直视「它们」的理智污染，现在则是你深入这片无尽领域揭开真相的唯一倚仗。',
    visualPrompt: 'A weary but sharp-eyed former corporate broker in a ruined tailored suit, wearing a bulky, retro-fitted Neural Link visor scavenged from a corpse. He holds a compact concealed pistol. Gritty cyberpunk noir atmosphere, dim lighting with neon reflections highlighting the scratched visor, high detail.',
    initialState: {
        attribute: {
            strength: 6,      // 较弱：不擅长正面对抗和肉搏
            agility: 23,      // 较强：混迹灰色地带练就的敏捷反应
            wisdom: 23,       // 较强：追查阴谋积累的地下知识与黑客手段
            perception: 28,   // 很强：经纪人出身的极高敏锐直觉与观察力
            spiritual: 0,     // 无灵力的普通人
        },
        vital: {
            maxHp: 90,        // 略低于普通人：长期潜伏与压力导致身体亚健康
            maxSanity: 150,   // 高于普通人：神经链接仪与真相追查形成的精神抗性
            maxStamina: 100,  // 普通人水平
            maxVigor: 120,    // 略高于普通人：长期熬夜调查仍能维持行动
        },
        inventory: [
            // 武器：隐蔽手枪
            {
                id: 'concealed_pistol',
                name: '隐蔽的防身手枪',
                desc: '经纪人时期用来防身的紧凑型手枪，火力一般但方便携带。',
                type: 'weapon',
                rarity: 'standard',
                weaponType: 'pistol',
                weaponDamageType: 'hot',
                range: 5,
                damage: 8,
                maxUses: 120,
            },

            // 饰品：清理人的加密日志
            {
                id: 'cleaner_log',
                name: '清理人的加密日志',
                desc: '与神经链接仪一起获得的残缺日志，里面记录了组织的某些行动代号与过滤参数。',
                type: 'accessory',
                rarity: 'standard',
                effects: [
                    ['wisdom', 2],
                    ['perception', 1],
                ],
            },

            // 护甲：加固风衣
            {
                id: 'reinforced_trench_coat',
                name: '加固风衣',
                desc: '经纪人时期的长款风衣，内衬缝入了轻质防刺层。它不能挡住真正的深渊之物，但至少能让普通袭击慢上半拍。',
                type: 'armor',
                rarity: 'standard',
                partialReduction: 0.08,
                maxUses: 120,
            },

            // 数据：空壳公司账目摘要
            {
                id: 'shell_company_ledger',
                name: '空壳公司账目摘要',
                desc: '你从三十七个空壳公司的资金流中整理出的关键节点。它指向一个不存在的地址，以及“震中”这个代号。',
                type: 'data',
                rarity: 'organized',
                documentContent:
                    '资金流向：Aesclepius Medical Charities -> 37 shell companies -> 12 offshore accounts -> [ADDRESS NOT FOUND]。内部标注：EPICENTER。备注：清理人回收优先级高于幸存者救援。',
            },

            // 消耗品：神经链接仪备用电池
            {
                id: 'battery_starter',
                name: '军用备用电池',
                desc: '从清理人那里顺来的高容量电池，是你维持神经链接仪运作的生命线。',
                type: 'consumable',
                rarity: 'standard',
                effects: [['restore_battery', 40]],
            },

            // 消耗品：神经链接仪应急贴片
            {
                id: 'neural_patch',
                name: '神经链接仪应急贴片',
                desc: '清理人常用的临时维护贴片，可在短时间内修复微电极阵列的轻微损耗。',
                type: 'consumable',
                rarity: 'standard',
                effects: [['repair_integrity', 10]],
            },

            // 消耗品：应急口粮
            {
                id: 'emergency_ration',
                name: '应急口粮',
                desc: '真空包装的压缩饼干，保质期已过但似乎还能吃。',
                type: 'consumable',
                rarity: 'standard',
                effects: [['heal_hp', 15]],
            },
        ],
        uniqueTactic: [
            {
                type: 'defense',
                id: 'investigator_analyze',
                name: '情报分析',
                desc: '快速分析战场环境，提升自身感知能力。',
                apCost: 1,
                tacticEffect: [['self', 'perception', 3]],
            },
            {
                type: 'attack',
                id: 'investigator_suppressive_shot',
                name: '压制射击',
                desc: '以快速射击干扰目标，短暂削弱其机动性。',
                apCost: 1,
                requireWeapon: 'pistol',
                tacticEffect: [['enemy', 'agility', -2, 1]],
            },
            {
                type: 'attack',
                id: 'investigator_expose_weakness',
                name: '弱点暴露',
                desc: '用手枪牵制并标记目标，削弱其战场感知与反应判断。',
                apCost: 2,
                requireWeapon: 'pistol',
                tacticEffect: [
                    ['enemy', 'perception', -3, 2],
                    ['enemy', 'agility', -2, 2],
                ],
            },
        ],
    },
    style: 'skirmish',
}