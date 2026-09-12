import type { PlayerTemplate, NpcTemplate } from '../../meta';

/**
 * 守护者 - 防御型
 * 核心定位：超高生命、护甲与团队掩护
 * 玩法特色：吸收伤害、削弱敌方输出、稳定队友理智
 * 风险收益：机动与感知偏低，精力 / 电力维护压力大
 */
export const PLAYER_GUARDIAN: PlayerTemplate = {
    id: 'guardian',
    name: 'Unit-734',
    gender: 'male',
    desc: '系统日志——身份：不明。身体机械化程度：43%。记忆核心：严重损坏（数据完整性 <7%）。当前运行协议：[首要] 保护无辜者 / [次要] 生存 / [隐藏] ???。残存日志显示你曾隶属于「铁壁计划」的「铁人」子项目，但所有相关数据都被强制清除。每当附近有人受伤，你的核心处理器会发出不可忽略的优先级警报。你的装甲很厚，电池很重，理智协议并不稳定。也许，你曾经被设计为一个好人。',
    visualPrompt: 'A towering half-human half-machine guardian, 43 percent cybernetic body with exposed metal endoskeleton on the left arm and torso, one organic eye and one glowing red cybernetic eye, heavy armored plates with scratches and battle damage, thick cables connected to a spine-mounted power core, holding a massive riot shield with dents and claw marks, industrial warehouse backdrop with sparks and steam, dark sci-fi survival horror aesthetic, intricate mechanical detail.',
    initialState: {
        attribute: {
            strength: 26,    // 机械力量提供稳定近战与负重能力
            agility: 7,      // 机体笨重，闪避与行动顺序较弱
            wisdom: 14,      // 战术协处理器提供较好的判断与战斗修正
            perception: 11,  // 传感器受损，感知有限
            spiritual: 0     // 机器无灵力
        },
        vital: {
            maxHp: 320,      // 半机械躯体、装甲与盾牌带来的生存优势
            maxSanity: 110,  // 协议与稳定剂维持下的普通偏上理智
            maxStamina: 210, // 动力核心支撑长时间防守
            maxVigor: 90     // 能源系统受限，高功率输出难以持续
        },
        inventory: [
            // 武器：战斗匕首
            {
                id: 'combat_knife',
                name: '战斗匕首',
                desc: '标准军用匕首，刀刃依然锋利。适合近身应急，而非正面攻坚。',
                type: 'weapon',
                rarity: 'standard',
                weaponType: 'prick',
                weaponDamageType: 'cold',
                range: 1,
                damage: 9,
                maxUses: 120
            },
            // 防具：防暴盾牌
            {
                id: 'riot_shield',
                name: '防暴盾牌',
                desc: '重型防暴盾，表面布满抓痕与凹陷。可固定在臂甲上，提供正面防护。',
                type: 'armor',
                rarity: 'organized',
                partialReduction: 0.20,
                maxUses: 150
            },
            // 防具：战术背心
            {
                id: 'tactical_vest_guardian',
                name: '战术背心',
                desc: '防弹背心，外层焊接了额外护板，提供可靠防护。',
                type: 'armor',
                rarity: 'organized',
                partialReduction: 0.12,
                maxUses: 100
            },
            // 饰品：守护者核心
            {
                id: 'guardian_core',
                name: '守护者核心',
                desc: '植入体内的防卫核心，强化生命维持并稳定精神协议。',
                type: 'accessory',
                rarity: 'organized',
                effects: [
                    ['maxHp', 30],
                    ['maxSanity', 10]
                ]
            },
            // 饰品：散热核心
            {
                id: 'cooling_core',
                name: '散热核心',
                desc: '辅助动力核心散热，提升可持续输出的精力上限。',
                type: 'accessory',
                rarity: 'organized',
                effects: [
                    ['maxVigor', 20]
                ]
            },
            // 消耗品：备用电池组
            {
                id: 'spare_battery',
                name: '备用电池组',
                desc: '工业级电池，可以为神经链接仪充电。',
                type: 'consumable',
                rarity: 'standard',
                effects: [
                    ['restore_battery', 60]
                ]
            },
            // 消耗品：基础工具包
            {
                id: 'basic_toolkit',
                name: '基础工具包',
                desc: '包含常用工具的便携包，可以进行简单维修。',
                type: 'consumable',
                rarity: 'standard',
                effects: [
                    ['repair_integrity', 25]
                ]
            },
            // 消耗品：野战医疗包
            {
                id: 'field_medkit',
                name: '野战医疗包',
                desc: '紧急外科与止血材料，可处理严重外伤。',
                type: 'consumable',
                rarity: 'organized',
                effects: [
                    ['heal_hp', 55]
                ]
            },
            // 消耗品：冷却剂包
            {
                id: 'coolant_pack',
                name: '冷却剂包',
                desc: '为动力核心快速降温，恢复短时高功率输出能力。',
                type: 'consumable',
                rarity: 'standard',
                effects: [
                    ['heal_vigor', 45]
                ]
            },
            // 消耗品：认知稳定剂
            {
                id: 'cognitive_stabilizer',
                name: '认知稳定剂',
                desc: '抑制神经链接仪翻译误差带来的认知压力，恢复理智。',
                type: 'consumable',
                rarity: 'organized',
                effects: [
                    ['heal_sanity', 30]
                ]
            }
        ],
        uniqueTactic: [
            {
                type: 'attack',
                id: 'guardian_shield_bash',
                name: '盾牌猛击',
                desc: '用盾牌猛击单个敌人，打乱其发力结构，削弱其力量与机动性。',
                apCost: 1,
                tacticEffect: [
                    ['enemy', 'strength', -4, 2],
                    ['enemy', 'agility', -3, 2]
                ]
            },
            {
                type: 'defense',
                id: 'guardian_cover_protocol',
                name: '掩护协议',
                desc: '为单个同伴提供战术掩护与心理锚点，增强其精神稳定性。',
                apCost: 1,
                tacticEffect: [
                    ['single_teammate', 'spiritual', 4]
                ]
            },
            {
                type: 'defense',
                id: 'guardian_iron_will',
                name: '钢铁意志',
                desc: '激活核心稳定协议，提升自身精神抗性。',
                apCost: 1,
                tacticEffect: [
                    ['self', 'spiritual', 5]
                ]
            },
            {
                type: 'defense',
                id: 'guardian_bulwark_field',
                name: '壁垒力场',
                desc: '展开短时掩护力场，稳定所有同伴的精神状态。',
                apCost: 2,
                tacticEffect: [
                    ['all_teammates', 'spiritual', 3]
                ]
            }
        ]
    },
    style: 'defense'
};

export const COMPANION_GUARDIAN: NpcTemplate = {
    ...PLAYER_GUARDIAN,
    initialState: {
        ...PLAYER_GUARDIAN.initialState,
        trust: 45,
        quest: [
            {
                id: 'guardian_memory_fragment',
                desc: '帮助 Unit-734 回收一枚被遗弃在铁锈前哨深层的记忆核心碎片。',
                goals: [
                    {
                        id: 'memory_core_fragment',
                        name: '记忆核心碎片',
                        desc: '一块烧蚀的存储单元，内部残留着「铁人」项目的加密日志。',
                        type: 'data',
                        rarity: 'organized',
                        documentContent:
                            '……受试者 Unit-734 已切除恐惧反应回路。保护协议仍不稳定。重复：不要让他想起名字。'
                    }
                ],
                rewards: [
                    {
                        id: 'stabilized_power_core',
                        name: '稳定化动力核心',
                        desc: '经过校准的备用核心，可提升精力上限，并轻微稳定精神协议。',
                        type: 'accessory',
                        rarity: 'deep',
                        effects: [
                            ['maxVigor', 25],
                            ['maxSanity', 10]
                        ]
                    }
                ],
                difficulty: 5
            }
        ]
    }
};