import type { PlayerTemplate } from '../../contract/meta';

/**
 * 老兵 - 进攻型 (Attack)
 *
 * 核心定位：前线冲刺压制、近身刺杀攻坚、以战养战
 * 玩法特色：
 *   - 凭借强悍力量（装备军牌后达 30 点老兵阶位）与战壕刺刀正面突破
 *   - 严格契合单手刺击（prick）武器引擎契约：副手留空获得伤害与攻击序列命中质量加成；
 *     发起攻击时自动向目标冲刺（最大冲刺格数为当前 AP，每冲刺 1 格伤害 +1，实际攻击距离 = 当前 AP + 1）
 *   - 通过「战壕硬化」后撤蓄势与「肾上腺素过载」提速回能，最大化每次突刺的冲刺距离加成
 * 风险收益：
 *   - 严重 PTSD 压低理智上限（戴军牌后仅 80 点），面对精神污染极为脆弱
 *   - 拥有精锐特工级的生命（220）与耐力（180，序列长度 18），在物理肉搏战中近乎不可阻挡
 */
export const PLAYER_VETERAN: PlayerTemplate = {
    id: 'veteran',
    name: 'Barnes',
    gender: 'male',
    desc: '前特种作战部队突击中士。那次代号「黑仪式」的机密清剿任务中，整个小队被深渊基金会的顾问当成了引诱高维生物的活饵，你是唯一的幸存者。真相被永久埋葬在焦黑的工事里，但战友们被撕碎时的惨叫每夜都在耳边回响。你知道真相——是你下达了撤退至死胡同的指令。浓烈的军用威士忌、粗制止痛药以及永不停歇的刺刀冲锋，是唯一能让你暂时压制神经震颤与梦魇的手段。',
    visualPrompt: 'A battle-hardened male special forces sergeant in his late 40s with a buzz cut and cold haunted eyes, deep burn and claw scars across his face and left arm, wearing patched-up dirty military fatigues reinforced with scrap metal chest plates, bandolier of tactical gear, holding a lethal trench fighting knife with brass knuckles in his right hand, left hand free, ruined barbed-wire military outpost backdrop, dim flare lighting, grim survival horror aesthetic.',
    initialState: {
        attribute: {
            // [20 ~ 30] 强悍体魄：裸装 28 点，佩戴染血军牌 (+2) 后精准踏入 30 点「资深老兵」阶位，赋予高额近战基数与充裕背包网格
            strength: 28,
            // [10 ~ 20] 稳健步伐：扎实的格斗步法，提供基础 AP = floor(16/5) = 3，支撑中短距突刺冲锋
            agility: 16,
            // [10 ~ 20] 战地经验：虽不擅长深奥学术，但通晓野战工程与诡雷排查，维持标准搜查效率
            wisdom: 12,
            // [20 ~ 30] 战场雷达：千锤百炼的危机嗅觉与死角捕捉力，显著提升近身刺击的命中与暴击率
            awareness: 22,
            // [10 ~ 20] 铁血神经：饱受 PTSD 梦魇折磨，但仍保持高于普通成年人 (10) 的硬汉意志底线
            will: 12,
            // 纯粹凡人：拒绝任何深渊血肉共生，完全仰赖千锤百炼的肉身与旧世军械作战
            cthulhu: 0
        },
        vital: {
            // 优秀 [200 档位]：严苛军事训练造就的强韧体格，配合军牌 (+20) 达 220 点
            maxHp: 200,
            // 偏低 [创伤折损]：深陷严重 PTSD 与幸存者负罪感，佩戴军牌 (-5) 后仅 80 点，需时刻警惕精神崩溃
            maxSanity: 85,
            // 优秀耐力：支撑长达 L = floor(180 / 10) = 18 的因果判定序列，适应持久肉搏消耗
            maxStamina: 180,
            // 良好精力：老兵的野外生存底子扎实，但长期失眠使其精力略逊于巅峰状态
            maxVigor: 130
        },
        inventory: [
            {
                id: 'veteran_painkillers',
                name: '军规强效止痛剂',
                desc: '特种部队配发的吗啡复合注射器。虽无法真正愈合撕裂的肌肉，但能瞬间切断痛觉神经信号，恢复战斗生命力。',
                type: 'consumable',
                grade: 'military',
                size: [1, 1],
                effects: [
                    ['hp', 40]
                ]
            },
            {
                id: 'veteran_field_whiskey',
                name: '高浓度战地威士忌',
                desc: '装在凹陷不锈钢酒壶里的烈酒，辣得像航空煤油。几大口灌下去能强行压下双手的战栗并稳固理智，但会略微迟滞神经反应。',
                type: 'consumable',
                grade: 'standard',
                size: [2, 1],
                effects: [
                    ['vigor', 30],
                    ['sanity', 15],
                    ['agility', -2, 2]
                ]
            },
            {
                id: 'veteran_smoke_grenade',
                name: 'M18 战术发烟罐',
                desc: '特种作战标配高浓度烟雾发生器，拉开保险后迅速制造大范围视线遮蔽，短时间内大幅强化战术机动、闪避与冲刺能力。',
                type: 'consumable',
                grade: 'military',
                size: [1, 1],
                effects: [
                    ['agility', 6, 2]
                ]
            },
            {
                id: 'field_tourniquet',
                name: '单手战术止血带',
                desc: '可在激烈交火中用单手与牙齿旋紧的棘轮压迫止血装置，有效遏制动脉失血并恢复部分体力。',
                type: 'consumable',
                grade: 'standard',
                size: [1, 1],
                effects: [
                    ['hp', 20],
                    ['stamina', 25]
                ]
            },
            {
                id: 'military_field_battery',
                name: '军用三防电池匣',
                desc: '防水防震的军规高能电池组，附带简易触点清洁片，可在恶劣战地环境下补充神经链接仪电力并维护电路。',
                type: 'consumable',
                grade: 'military',
                size: [1, 1],
                effects: [
                    ['battery', 40],
                    ['integrity', 10]
                ]
            }
        ],
        equipState: {
            weapons: {
                main: {
                    instanceId: 'veteran_trench_knife_1',
                    id: 'veteran_trench_knife',
                    name: '特战刺杀战壕刀',
                    desc: '一体成型的重型高碳钢战壕刺刀，整合了黄铜指虎护手。副手留空时显著提升伤害与攻击序列命中质量；攻击时可借势向目标高速冲刺，冲刺距离越长，贯入动能越致命。',
                    type: 'weapon',
                    grade: 'military',
                    size: [2, 1],
                    weaponType: 'prick',
                    weaponDamageType: 'melee',
                    range: 1, // 贴身档位（第 1 档）：配合 prick 冲刺特性，实际攻击距离为 (当前 AP + 1) 格
                    damage: 11,
                    crit: {
                        chance: 0.12,
                        bonus: 6
                    },
                    maxUses: 140,
                    currentUses: 140
                },
                side: null // 留空：完美激活单手刺击（prick）特性（另一手为空获得伤害与攻击序列质量提升）
            },
            armors: [
                {
                    instanceId: 'veteran_tactical_vest_1',
                    id: 'veteran_tactical_vest',
                    name: '特种突击防弹背心',
                    desc: '经过战场手工铆接加固的重型凯夫拉防弹背心，虽然布满硝烟与利爪划痕，仍能稳健抵御致命冲击。',
                    type: 'armor',
                    grade: 'military',
                    size: [2, 2],
                    defense: 0.18,
                    maxUses: 115,
                    currentUses: 115
                }
            ],
            accessories: [
                {
                    instanceId: 'veteran_squad_dog_tags_1',
                    id: 'veteran_squad_dog_tags',
                    name: '刻名染血军牌链',
                    desc: '属于「黑仪式」行动阵亡全组同袍的身份牌，贴在胸口冰冷刺骨。它时刻提醒你撤退指令的惨痛代价，以负罪之火将你的近战力量推向老兵巅峰，但持续啮噬着你的理智。',
                    type: 'accessory',
                    grade: 'military',
                    size: [1, 1],
                    effects: [
                        ['maxHp', 20],
                        ['maxSanity', -5],
                        ['strength', 2] // 核心机制件：将 strength 补正至 30 点老兵阶位
                    ]
                }
            ]
        },
        uniqueTactic: [
            {
                type: 'A',
                id: 'veteran_suppressive_strike',
                name: '压制突刺',
                desc: '借助冲刺惯性将战壕刀狠狠贯入目标关节装甲缝隙，撕裂其防护结构并重创机动轴心，大幅削弱其速度、护甲免伤与闪避能力。',
                apCost: 2,
                requireWeapon: 'prick',
                tacticEffect: [
                    ['single_enemy', 'speed', -4, 2],
                    ['single_enemy', 'defense', -0.12, 2],
                    ['single_enemy', 'evasion', -0.15, 2]
                ]
            },
            {
                type: 'D',
                id: 'veteran_combat_hardened',
                name: '战壕硬化',
                desc: '收紧核心肌群架刀格挡，同时向后撤步拉开一个身位，在硬化自身护甲防线的同时为下一轮刺刀冲刺蓄积助跑空间与杀伤力。',
                apCost: 1,
                tacticEffect: [
                    ['self', 'left', 1, 0],        // 向后撤步 1 格，为下一次 prick 冲刺攻击创造额外冲刺格数加成
                    ['self', 'defense', 0.12, 2],  // 提升常驻免伤 12%
                    ['self', 'damage', 4, 2]       // 提升近战伤害 4 点
                ]
            },
            {
                type: 'U',
                id: 'veteran_black_rite_echo',
                name: '黑仪式回响',
                desc: '将记忆深处同袍的哀嚎强行锁进心底，以精力透支换取冰冷刺骨的杀戮专注，迅速平复理智并提升暴击倾向。',
                apCost: 1,
                tacticEffect: [
                    ['self', 'sanity', 18, 0],
                    ['self', 'crit_chance', 0.15, 2],
                    ['self', 'vigor', -10, 0]
                ]
            },
            {
                type: 'U',
                id: 'veteran_adrenaline_surge',
                name: '肾上腺素过载',
                desc: '强行压榨交感神经与肌肉潜能，以体力损耗为代价立即返还本次行动点，并在接下来两回合内大幅提升速度与近战爆发力。',
                apCost: 1,
                tacticEffect: [
                    ['self', 'ap', 1, 0],          // 立即返还 1 点 AP，确保当前回合冲刺距离与攻击节奏不中断
                    ['self', 'speed', 4, 2],       // 速度提升至 20 (突破 4 AP 档位)，增强先手与蓄反压制
                    ['self', 'damage', 5, 2],      // 攻击力提升 5 点
                    ['self', 'stamina', -15, 0]    // 透支 15 点体力
                ]
            }
        ]
    },
    style: 'attack'
};