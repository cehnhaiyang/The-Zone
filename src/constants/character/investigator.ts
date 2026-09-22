import type { PlayerTemplate } from '../../meta';

/**
 * 调查员 - 游走型 (Skirmish)
 * 核心定位：超高感知与敏捷、情报推演、弱点破除与手枪牵制
 * 玩法特色：利用副手留空的手枪精准加成进行先手突袭，凭借敏锐直觉以极低代价搜集线索并削弱敌人
 * 风险收益：体质脆弱、正面抗线能力极弱，但具有顶尖的探索效率与暴击命中收益
 */
export const PLAYER_INVESTIGATOR: PlayerTemplate = {
    id: 'investigator',
    name: '凯兰',
    gender: 'male',
    desc: '你曾是深渊基金会表面伪装产业「阿斯克勒庇俄斯医疗慈善基金」的王牌审计经纪人。大灾变前夕，你从三十七个离岸空壳公司的异常资金流向中，嗅出了那些运往圣伊丽莎白纪念医院深层隔离区的活体物资并非用于救死扶伤，而是作为迎接神性降临的血肉祭品。你头上这台满是划痕的神经链接仪原型机，是从一名死在洗消通道里的「清理人」颅骨上撬下来的。它让你在直视那些高维憎恶时未曾当场脑死，现在更是你深入 The Zone 追溯「震中」真相的唯一凭据。',
    visualPrompt: 'A weary but razor-sharp former corporate financial auditor in a worn, reinforced trench coat over a ruined bespoke shirt, wearing a bulky retrofitted Neural Link visor scavenged from an Abyss Foundation Cleaner, holding a compact concealed semi-automatic pistol with one hand, empty off-hand for balance, gloomy cyberpunk neo-noir aesthetic, flickering neon reflections on wet broken asphalt, dense atmospheric fog.',
    initialState: {
        attribute: {
            strength: 6,      // 较弱：长期从事文职与暗中调查，肌肉力量有限，储物空间中等
            agility: 23,      // 较强：反应迅疾，基础 AP 充沛 (23/5=4)，擅长在掩体间滑步穿梭
            wisdom: 24,       // 较强：严密的财务审计与逻辑推演本能，大幅降低节点搜查机能损耗
            awareness: 30,    // 极强：触碰精英门槛 (30) 的直觉嗅觉，大幅提升搜查精度与因果判定暴击率
            will: 12,         // 冷静理性：高度严密的逻辑自洽思维与认知滤网阻隔，意志稳定在成年人之上
            cthulhu: 0        // 纯粹人类：未接纳血肉同化，完全依靠光电目镜与理性逻辑对抗污染
        },
        vital: {
            maxHp: 90,        // 较弱：未受生化强化的凡人肉身，经不起强力正面撕扯
            maxSanity: 150,   // 优秀：强大的理性思维与清理人面甲降维过滤协同抵抗精神污染
            maxStamina: 100,  // 普通人：标准体能，依赖节奏规划规避过度疲劳
            maxVigor: 120     // 良好：神经紧绷带来的高专注度，支撑高强度细致搜寻
        },
        inventory: [
            {
                id: 'shell_company_ledger',
                name: '暗账资金节点密卷',
                desc: '从三十七家空壳公司交叉流水中还原出的绝密档案，直指代号「震中」的真实坐标。',
                type: 'data',
                grade: 'military',
                size: [1, 1],
                documentContent:
                    '【资金流审计摘要】来源：阿斯克勒庇俄斯医疗慈善基金会 -> 37家离岸壳公司 -> 12个加密不记名账户 -> 圣伊丽莎白纪念医院地下收容区。内部代号：EPICENTER。特别附录：降临发生时，所有清理人回收优先级判定：原始观测芯片 > 实验体样本 > 幸存员工。'
            },
            {
                id: 'battery_starter',
                name: '军规高容备用电池',
                desc: '从阵亡清理人身上搜获的高密度电容电池，维系神经链接仪认知滤网的命脉。',
                type: 'consumable',
                grade: 'standard',
                size: [1, 1],
                effects: [
                    ['battery', 45]
                ]
            },
            {
                id: 'neural_patch',
                name: '电极阵列应急修补贴',
                desc: '清理人常备的微纳导电贴片，能够迅速焊接微电极过载裂痕，恢复目镜完整性。',
                type: 'consumable',
                grade: 'standard',
                size: [1, 1],
                effects: [
                    ['integrity', 15]
                ]
            },
            {
                id: 'emergency_ration',
                name: '高热量压缩口粮',
                desc: '军规锡箔真空包装的能量棒，味道干燥如沙，但能在极短时间内补充体能。',
                type: 'consumable',
                grade: 'standard',
                size: [1, 1],
                effects: [
                    ['hp', 15],
                    ['stamina', 20]
                ]
            },
            {
                id: 'sedative_inhaler',
                name: '微型鼻吸镇静吸入剂',
                desc: '医疗基金会内部高管特供的气雾剂，迅速麻痹过度活跃的边缘系统，稳定心神。',
                type: 'consumable',
                grade: 'military',
                size: [1, 1],
                effects: [
                    ['sanity', 25]
                ]
            }
        ],
        equipState: {
            weapons: {
                main: {
                    instanceId: 'concealed_pistol_1',
                    id: 'concealed_pistol',
                    name: '隐蔽防身手枪',
                    desc: '大灾变前随身携带的 9mm 紧凑型半自动手枪。副手留空时可获得命中加成，且未移动时的首次射击不消耗行动点。',
                    type: 'weapon',
                    grade: 'standard',
                    size: [2, 1],
                    weaponType: 'pistol',
                    weaponDamageType: 'range',
                    range: 5, // 5档：标准半自动手枪核心交战距离（舒适射程）
                    damage: 9,
                    crit: {
                        chance: 0.10,
                        bonus: 5
                    },
                    maxUses: 120,
                    currentUses: 120
                },
                side: null // 刻意留空：完美激活手枪单手持握命中增益与首次攻击免 AP
            },
            armors: [
                {
                    instanceId: 'reinforced_trench_coat_1',
                    id: 'reinforced_trench_coat',
                    name: '特勤加固长款风衣',
                    desc: '高级定制羊毛风衣，内衬缝合了轻质芳纶防刺纤维与铅丝网，兼顾隐蔽与流弹防护。',
                    type: 'armor',
                    grade: 'reinforced',
                    size: [2, 3],
                    defense: 0.10,
                    maxUses: 120,
                    currentUses: 120
                }
            ],
            accessories: [
                {
                    instanceId: 'cleaner_log_1',
                    id: 'cleaner_log',
                    name: '清理人加密战术日志',
                    desc: '随神经链接仪缴获的数据芯片，内含部分过滤参数与基金会行动代码，辅助环境研判。',
                    type: 'accessory',
                    grade: 'military',
                    size: [1, 2],
                    effects: [
                        ['wisdom', 2],
                        ['awareness', 2]
                    ]
                }
            ]
        },
        uniqueTactic: [
            {
                type: 'U',
                id: 'investigator_analyze',
                name: '情报推演',
                desc: '通过目镜标定目标运动轨迹与受损节点，提升感知并利用掩体预判走位。',
                apCost: 1,
                tacticEffect: [
                    ['self', 'awareness', 4, 2],
                    ['self', 'evasion', 0.10, 2]
                ]
            },
            {
                type: 'A',
                id: 'investigator_suppressive_shot',
                name: '速射牵制',
                desc: '利用手枪短促开火压迫敌人身位，迫使其寻找遮蔽，压低其机动性与速度。',
                apCost: 1,
                requireWeapon: 'pistol',
                tacticEffect: [
                    ['single_enemy', 'speed', -3, 2],
                    ['single_enemy', 'agility', -3, 2]
                ]
            },
            {
                type: 'A',
                id: 'investigator_expose_weakness',
                name: '破绽标记',
                desc: '精确射击撕裂防护死角，剥落护甲并破坏敌方的感知平衡。',
                apCost: 2,
                requireWeapon: 'pistol',
                tacticEffect: [
                    ['single_enemy', 'defense', -0.15, 2],
                    ['single_enemy', 'awareness', -4, 2]
                ]
            },
            {
                type: 'D',
                id: 'investigator_tactical_retreat',
                name: '战术滑步',
                desc: '借助射击反冲与盲区迅速拉开交火间距，调匀呼吸并重置身位。',
                apCost: 1,
                tacticEffect: [
                    ['self', 'evasion', 0.20, 1],
                    ['self', 'stamina', 15, 0]
                ]
            }
        ]
    },
    style: 'skirmish'
};