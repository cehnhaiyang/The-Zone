import type { PlayerTemplate } from '../../meta';

/**
 * 老兵 - 进攻型 (Attack)
 * 核心定位：前线压制、近身处决、以战养战
 * 玩法特色：凭借强悍体魄与战壕刀法正面攻坚，单手持刺刀触发空手增益，暴击无视常驻护甲防御力
 * 风险收益：PTSD 严重侵蚀理智上限，但高血量、耐力与肌肉记忆使其在高压交火中屹立不倒
 */
export const PLAYER_VETERAN: PlayerTemplate = {
    id: 'veteran',
    name: 'Barnes',
    gender: 'male',
    desc: '前特种作战部队突击中士。那次代号「黑仪式」的机密清剿任务中，整个小队被深渊基金会的顾问当成了引诱高维生物的活饵，你是唯一的幸存者。真相被永久埋葬在焦黑的工事里，但战友们被撕碎时的惨叫每夜都在耳边回响。你知道真相——是你下达了撤退至死胡同的指令。浓烈的军用威士忌、粗制止痛药以及永不停歇的刺刀冲锋，是唯一能让你暂时压制神经震颤与梦魇的手段。',
    visualPrompt: 'A battle-hardened male special forces sergeant in his late 40s with a buzz cut and cold haunted eyes, deep burn and claw scars across his face and left arm, wearing patched-up dirty military fatigues reinforced with scrap metal chest plates, bandolier of tactical gear, holding a lethal trench fighting knife with brass knuckles in his right hand, left hand free, ruined barbed-wire military outpost backdrop, dim flare lighting, grim survival horror aesthetic.',
    initialState: {
        attribute: {
            strength: 26,     // 较强：千锤百炼的近战技巧与强壮筋骨，稳定造成致残重击，背包空间充裕
            agility: 16,      // 稳健：扎实的战术步伐与格斗本能，基础 AP 达标 (16/5=3)，支撑冲锋与规避
            wisdom: 10,       // 普通：不擅长复杂理论或高深谋略，信赖最直观的杀敌经验
            awareness: 22,    // 较强：战场雷达般的危机嗅觉，能在电光火石间捕捉死角
            will: 10,         // 成年人坚韧：饱受 PTSD 折磨但拥有铁血军人的凡人神经内核
            cthulhu: 0        // 纯粹凡人：未受异化共生侵染，坚守旧式人类工造防具与纯粹物理杀伤
        },
        vital: {
            maxHp: 230,       // 优秀：长期高强度特战淬炼出的强韧体魄
            maxSanity: 90,    // 偏低：深陷严重 PTSD 与幸存者负罪感，精神临界点极脆弱
            maxStamina: 210,  // 优秀：令人惊叹的耐力基数，支撑长因果序列与多次战术重铸
            maxVigor: 190     // 优秀：铁血老兵的军人底子，在恶劣环境中依然精力充沛
        },
        inventory: [
            {
                id: 'veteran_painkillers',
                name: '军规强效止痛剂',
                desc: '只能麻痹受创的痛觉神经。注射后迅速封锁创口痛感，恢复部分生命。',
                type: 'consumable',
                grade: 'military',
                size: [1, 1],
                effects: [
                    ['hp', 35]
                ]
            },
            {
                id: 'veteran_field_whiskey',
                name: '高浓度战地威士忌',
                desc: '烈得像航空煤油。几大口灌下去，能压下双手的战栗并略微稳固理智，但会迟滞反应。',
                type: 'consumable',
                grade: 'standard',
                size: [1, 2],
                effects: [
                    ['vigor', 30],
                    ['sanity', 10],
                    ['agility', -2, 2]
                ]
            },
            {
                id: 'veteran_smoke_grenade',
                name: 'M18 战术发烟罐',
                desc: '特种作战标配高浓度烟雾发生器，制造大范围视线遮蔽，短时间内大幅强化战术机动与闪避身法。',
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
                desc: '可在战斗中单手旋紧的机械压迫止血装置，防止穿刺与撕裂导致的失血虚脱。',
                type: 'consumable',
                grade: 'standard',
                size: [1, 1],
                effects: [
                    ['hp', 20]
                ]
            }
        ],
        equipState: {
            weapons: {
                main: {
                    instanceId: 'veteran_trench_knife_1',
                    id: 'veteran_trench_knife',
                    name: '特战刺杀战壕刀',
                    desc: '一体成型的重型高碳钢战壕刀，附带指虎护手。单手握持时获得命中与暴击质量提升，暴击时彻底无视目标所有基础护甲免伤。',
                    type: 'weapon',
                    grade: 'military',
                    size: [1, 2],
                    weaponType: 'prick',
                    weaponDamageType: 'melee',
                    range: 1, // 贴身档位：战壕肉搏核心距离（第 1 档）
                    damage: 10,
                    crit: {
                        chance: 0.10,
                        bonus: 6
                    },
                    maxUses: 140,
                    currentUses: 140
                },
                side: null // 留空：完美契合单手刺击特性（另一手为空则获得伤害与命中加成）
            },
            armors: [
                {
                    instanceId: 'veteran_tactical_vest_1',
                    id: 'veteran_tactical_vest',
                    name: '特种突击防弹背心',
                    desc: '经过战场手工铆接加固的重型凯夫拉背心，虽然布满硝烟与划痕，仍能稳健抵御致命冲击。',
                    type: 'armor',
                    grade: 'military',
                    size: [2, 2],
                    defense: 0.18,
                    maxUses: 110,
                    currentUses: 110
                }
            ],
            accessories: [
                {
                    instanceId: 'veteran_squad_dog_tags_1',
                    id: 'veteran_squad_dog_tags',
                    name: '刻名染血军牌链',
                    desc: '属于「黑仪式」行动阵亡全组同袍的身份牌，贴在胸口，冰冷刺骨。它时刻提醒你撤退指令的惨痛代价，以负罪之火锻造近战力量，但持续压迫神经。',
                    type: 'accessory',
                    grade: 'military',
                    size: [1, 1],
                    effects: [
                        ['maxHp', 20],
                        ['maxSanity', -5],
                        ['strength', 2]
                    ]
                }
            ]
        },
        uniqueTactic: [
            {
                type: 'A',
                id: 'veteran_suppressive_strike',
                name: '压制突刺',
                desc: '利用全身冲力将刺刀狠狠贯入目标关节枢纽，破坏其机动轴心，大幅削弱其速度与敏捷。',
                apCost: 2,
                requireWeapon: 'prick',
                tacticEffect: [
                    ['single_enemy', 'speed', -4, 2],
                    ['single_enemy', 'agility', -4, 2]
                ]
            },
            {
                type: 'D',
                id: 'veteran_combat_hardened',
                name: '战壕硬化',
                desc: '收紧核心肌群，调动多年在尸山血海中锤炼出的近战肌肉记忆，拔高力量并硬化受击面。',
                apCost: 1,
                tacticEffect: [
                    ['self', 'strength', 4, 2],
                    ['self', 'defense', 0.08, 2]
                ]
            },
            {
                type: 'U',
                id: 'veteran_black_rite_echo',
                name: '黑仪式回响',
                desc: '将记忆深处同袍的哀嚎强行锁进心底，以药剂般的麻木与精力透支，换取短时间内的神经冷酷与理智回升。',
                apCost: 1,
                tacticEffect: [
                    ['self', 'sanity', 15, 0],
                    ['self', 'vigor', -8, 0]
                ]
            },
            {
                type: 'U',
                id: 'veteran_adrenaline_surge',
                name: '肾上腺素过载',
                desc: '短时间透支交感神经，以体力损耗为代价换取短时间的爆发性速度与杀伤力。',
                apCost: 1,
                tacticEffect: [
                    ['self', 'speed', 3, 1],
                    ['self', 'damage', 5, 1],
                    ['self', 'stamina', -12, 0]
                ]
            }
        ]
    },
    style: 'attack'
};