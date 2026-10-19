import type { PlayerTemplate } from '../../contract/meta';

/**
 * 调查员 - 游走型 (Skirmish)
 *
 * 核心定位：超高感知与敏捷、情报推演、弱点破除与手枪机动牵制
 * 玩法特色：
 *   - 佩戴「清理人加密战术日志」后觉知（awareness）精准达到 30 点精英阈值，智慧达 27 点，大幅降低节点搜查损耗并提升发现率与暴击率
 *   - 完美契合单手手枪（pistol, $range = 5$）双重特性：副手留空提升攻击序列 `hit` 与 `crit` 占比；
 *     每回合移动前首次射击不消耗 AP，配合常态 4 点基础 AP（$\lfloor 22 / 5 \rfloor = 4$）形成极佳的行动点经济
 *   - 通过「战术滑步」向后位移拉开射程并提速 3 点（突破 $speed = 25$ 即 5 AP 阈值），完美风筝近战威胁
 * 风险收益：
 *   - 体质单薄（maxHp 90）、力量孱弱（strength 6，背包空间紧凑），一旦被高伤害敌群贴身合围极易重创
 */
export const PLAYER_INVESTIGATOR: PlayerTemplate = {
    id: 'investigator',
    name: '凯兰',
    gender: 'male',
    desc: '你曾是深渊基金会表面伪装产业「阿斯克勒庇俄斯医疗慈善基金」的王牌审计经纪人。大灾变前夕，你从三十七个离岸空壳公司的异常资金流向中，嗅出了那些运往圣伊丽莎白纪念医院深层隔离区的活体物资并非用于救死扶伤，而是作为迎接神性降临的血肉祭品。你头上这台满是划痕的神经链接仪原型机，是从一名死在洗消通道里的「清理人」颅骨上撬下来的。它让你在直视那些高维憎恶时未曾当场脑死，现在更是你深入 The Zone 追溯「震中」真相的唯一凭据。',
    visualPrompt: 'A weary but razor-sharp former corporate financial auditor in a worn, reinforced trench coat over a ruined bespoke shirt, wearing a bulky retrofitted Neural Link visor scavenged from an Abyss Foundation Cleaner, holding a compact concealed semi-automatic pistol with one hand, empty off-hand for balance, gloomy cyberpunk neo-noir aesthetic, flickering neon reflections on wet broken asphalt, dense atmospheric fog.',
    initialState: {
        attribute: {
            // [5 ~ 10] 较弱区间：长期从事文职审计与暗中调查，缺乏重体力训练，背包储物网格较为紧凑
            strength: 6,
            // [20 ~ 30] 迅捷身手：常态敏捷 22，提供充沛的基础 AP = floor(22/5) = 4；触发「战术滑步」(+3 speed) 后可突破 25 点 5 AP 极速阈值
            agility: 22,
            // [20 ~ 30] 严密推演：顶尖财务审计与逻辑交叉验证本能（配合芯片达 27 点），大幅降低搜查体能与精力损耗
            wisdom: 25,
            // [20 ~ 30] 鹰眼洞察：裸装 28 点，配合清理人战术日志 (+2) 精准踏入 30 点精英感知门槛，赋予极高的搜查精度与暴击率
            awareness: 28,
            // [10 ~ 20] 冷静克制：高度自洽的怀疑论思维与光电滤网协同，精神韧性稳居普通成年人之上
            will: 14,
            // 纯粹人类：排斥血肉同化，完全依靠清理人神经链接仪与严密逻辑对抗深渊认知污染
            cthulhu: 0
        },
        vital: {
            // 较弱 [90 点]：未经生化改造的凡人躯体，正面承受重击的容错率较低
            maxHp: 90,
            // 优秀 [150 点]：强大的理性逻辑防线与清理人滤网协同，可承受长时间高强度线索挖掘与精神冲击
            maxSanity: 150,
            // 良好体能：生成判定序列长度 L = floor(110 / 10) = 11，支撑中距离游走拉扯
            maxStamina: 110,
            // 充沛精力：常年熬夜审计与追踪培养出的高强度专注力，非常适合深度搜查与解谜
            maxVigor: 130
        },
        inventory: [
            {
                id: 'shell_company_ledger',
                name: '暗账资金节点密卷',
                desc: '从三十七家空壳公司交叉流水中还原出的绝密审计档案，直指代号「震中」的真实坐标。',
                type: 'data',
                grade: 'foundation',
                size: [1, 1],
                documentContent:
                    '【资金流审计摘要】来源：阿斯克勒庇俄斯医疗慈善基金会 -> 37家离岸壳公司 -> 12个加密不记名账户 -> 圣伊丽莎白纪念医院地下收容区。内部代号：EPICENTER。特别附录：降临发生时，所有清理人回收优先级判定：原始观测芯片 > 实验体样本 > 幸存员工。'
            },
            {
                id: 'battery_starter',
                name: '军规高容备用电池',
                desc: '从阵亡清理人战术腰封上搜获的高密度电容电池，是维系神经链接仪认知滤网运转的命脉。',
                type: 'consumable',
                grade: 'military',
                size: [1, 1],
                effects: [
                    ['battery', 50]
                ]
            },
            {
                id: 'neural_patch',
                name: '电极阵列应急修补贴',
                desc: '清理人常备的微纳导电贴片，能够迅速修补高维信号过载造成的微电极裂痕，恢复目镜硬件完整度。',
                type: 'consumable',
                grade: 'military',
                size: [1, 1],
                effects: [
                    ['integrity', 20]
                ]
            },
            {
                id: 'emergency_ration',
                name: '高热量压缩口粮',
                desc: '军规锡箔真空包装的能量棒，口感干燥如沙，但能在极短时间内补充生命与肌肉体能。',
                type: 'consumable',
                grade: 'standard',
                size: [1, 1],
                effects: [
                    ['hp', 20],
                    ['stamina', 25]
                ]
            },
            {
                id: 'sedative_inhaler',
                name: '微型鼻吸镇静吸入剂',
                desc: '基金会高管特供的神经阻断气雾剂，能迅速平息过度活跃的大脑边缘系统，恢复理智与清醒度。',
                type: 'consumable',
                grade: 'corporate',
                size: [1, 1],
                effects: [
                    ['sanity', 30],
                    ['vigor', 15]
                ]
            }
        ],
        equipState: {
            weapons: {
                main: {
                    instanceId: 'concealed_pistol_1',
                    id: 'concealed_pistol',
                    name: '隐蔽防身手枪',
                    desc: '大灾变前随身携带的 9mm 紧凑型半自动手枪，经过精密扳机调校。副手留空时可获得攻击序列命中与暴击加成，且本回合未移动前的首次射击不消耗行动点。',
                    type: 'weapon',
                    grade: 'reinforced',
                    size: [2, 1],
                    weaponType: 'pistol',
                    weaponDamageType: 'range',
                    range: 5, // 第 5 档（中距）：标准 9mm 半自动手枪核心舒适交战距离
                    damage: 9,
                    crit: {
                        chance: 0.12,
                        bonus: 5
                    },
                    maxUses: 120,
                    currentUses: 120
                },
                side: null // 留空：激活手枪（pistol）单手持握命中增益与未移动首次射击免 AP 特性
            },
            armors: [
                {
                    instanceId: 'reinforced_trench_coat_1',
                    id: 'reinforced_trench_coat',
                    name: '特勤加固长款风衣',
                    desc: '高级定制的防泼水长款风衣，内衬隐蔽缝合了轻质芳纶防刺纤维与防辐射铅丝网，兼顾机动性与流弹防护。',
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
                    desc: '随神经链接仪一同撬下的数据协处理芯片，内含基金会外勤过滤参数与弱点标定算法，显著强化环境洞察与逻辑推演。',
                    type: 'accessory',
                    grade: 'foundation',
                    size: [2, 1],
                    effects: [
                        ['wisdom', 2],
                        ['awareness', 2] // 核心机制件：将 awareness 补正至 30 点精英阈值
                    ]
                }
            ]
        },
        uniqueTactic: [
            {
                type: 'U',
                id: 'investigator_analyze',
                name: '情报推演',
                desc: '通过清理人目镜高速标定目标运动轨迹与结构死角，使下一次攻击序列判定结果直接提升 1 档，并在两回合内提高命中、暴击率与闪避。',
                apCost: 1,
                tacticEffect: [
                    ['self', 'a_sequence', 1, 1],  // 下一次攻击序列判定结果提升 1 档 (miss -> graze -> hit -> crit)
                    ['self', 'aim', 15, 2],
                    ['self', 'crit_chance', 0.12, 2],
                    ['self', 'evasion', 0.10, 2]
                ]
            },
            {
                type: 'A',
                id: 'investigator_suppressive_shot',
                name: '速射牵制',
                desc: '利用手枪精准的双连发点射压迫敌人身位（回合初未移动时首次释放可享手枪 0 AP 特性），迫使其寻找掩护并降低其速度与命中。',
                apCost: 1,
                requireWeapon: 'pistol',
                tacticEffect: [
                    ['single_enemy', 'speed', -3, 2],
                    ['single_enemy', 'aim', -15, 2]
                ]
            },
            {
                type: 'A',
                id: 'investigator_expose_weakness',
                name: '破绽标记',
                desc: '精准射击贯穿敌方护甲接缝或外露神经节，剥落其常驻防御免伤与闪避能力，并放大自身后续射击的暴击杀伤。',
                apCost: 2,
                requireWeapon: 'pistol',
                tacticEffect: [
                    ['single_enemy', 'defense', -0.15, 2],
                    ['single_enemy', 'evasion', -0.15, 2],
                    ['self', 'crit_bonus', 4, 2]
                ]
            },
            {
                type: 'D',
                id: 'investigator_tactical_retreat',
                name: '战术滑步',
                desc: '借助射击反冲向后滑步撤离 1 格以维持手枪最佳射距，同时调匀呼吸恢复体力，并在两回合内大幅提升闪避与速度（突破 25 速 5 AP 阈值）。',
                apCost: 1,
                tacticEffect: [
                    ['self', 'left', 1, 0],        // 立即向后撤离 1 格，拉开与近战敌人的距离
                    ['self', 'evasion', 0.20, 2],  // 闪避率提升 20%，持续覆盖敌方进攻回合
                    ['self', 'speed', 3, 2],       // 速度由 22 提至 25，下回合基础 AP 跃升至 5 点
                    ['self', 'stamina', 15, 0]     // 恢复 15 点体力，延缓序列枯竭
                ]
            }
        ]
    },
    style: 'skirmish'
};