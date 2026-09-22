import type { CompanionTemplate } from '../../meta';

/**
 * 守护者 - 防御型 (Defense)
 * 核心定位：超高生命、护甲免伤与全队掩护
 * 玩法特色：副手持重防暴盾吸收冲击，提供偏折力场并分担队友精神压力
 * 风险收益：极低敏捷与觉知，回转与追击受限，机载散热与精力维护压力巨大
 */
export const COMPANION_GUARDIAN: CompanionTemplate = {
    id: 'guardian',
    name: 'Unit-734',
    gender: 'male',
    desc: '系统日志——身份：不明。身体机械化程度：43%。记忆核心：严重损坏（数据完整性 <7%）。当前运行协议：[首要] 保护无辜者 / [次要] 生存 / [隐藏] ???。残存日志显示你曾隶属于「铁锈前哨」深层掩体的「铁壁计划」子项目，但所有实验档案皆在紧急处置滑道中被熔毁。受试者恐惧反应回路已被物理切除，每当感知到队友受创，核心处理器便会拉响不可屏蔽的最高优先级警报。装甲厚重，电池沉重，理智协议在过载中摇摇欲坠。也许在被改造成战争机器前，你曾被设计为一个好人。',
    visualPrompt: 'A towering half-human half-machine guardian, 43 percent cybernetic body with exposed steel endoskeleton on the left arm and torso, one tired organic eye and one glowing crimson cybernetic optical sensor, heavy military armored plates with deep scratches and claw marks, thick hydraulic cables connected to a spine-mounted power core, holding a massive reinforced riot shield, industrial underground bunker backdrop with sparks and steam, dark sci-fi survival horror aesthetic, intricate mechanical detail.',
    initialState: {
        attribute: {
            strength: 26,     // 较强：液压动力骨骼，提供稳健的近战与高负重容量
            agility: 7,       // 迟缓：重装躯体导致机动性极差，行动速度慢，规避动作迟滞
            wisdom: 14,       // 普通：军工战术逻辑单元尚存，足以处理基础战场分析
            awareness: 11,    // 偏低：光学传感器受损，搜查与先验感知能力薄弱
            will: 12,         // 军工程序稳定：恐惧回路被物理切除，逻辑单元强行锚定神经中枢
            cthulhu: 0        // 机械纯度：未受深渊血肉异化浸染，纯粹机械与合成纤维架构
        },
        vital: {
            maxHp: 320,       // 极其优秀：重装义体与强化脏器提供坚不可摧的生存底子
            maxSanity: 110,   // 普通偏上：依赖守护者核心硬件算法锚定精神稳定性
            maxStamina: 210,  // 优秀：军用级人工肌束具备超长持续抗压耐力
            maxVigor: 90      // 较弱：重负荷液压与散热系统持续挤占精力储备，容易过热疲劳
        },
        equipState: {
            weapons: {
                main: {
                    instanceId: 'player_combat_knife',
                    id: 'combat_knife',
                    name: '军用战术匕首',
                    desc: '铁锈前哨步兵制式战术刀，高碳钢刀刃依然锋利。适合近身应急穿刺。',
                    type: 'weapon',
                    grade: 'military',
                    size: [2, 1],
                    weaponType: 'prick',
                    weaponDamageType: 'melee',
                    range: 1, // 贴身档位：匕首标准交战距离（第 1 档）
                    damage: 10,
                    crit: {
                        chance: 0.08,
                        bonus: 5
                    },
                    maxUses: 120,
                    currentUses: 120
                },
                side: {
                    instanceId: 'player_riot_shield',
                    id: 'riot_shield',
                    name: '重型突入防暴盾',
                    desc: '重型合金复合防暴盾，表面留有异变生物的爪痕与撞击凹痕。固定于液压左臂，可大幅提升防御序列中部分免伤的出现率并使减伤上限达到 1.0。',
                    type: 'weapon',
                    grade: 'military',
                    size: [2, 2],
                    weaponType: 'shield',
                    weaponDamageType: 'melee',
                    range: 1,
                    damage: 6,
                    crit: {
                        chance: 0.04,
                        bonus: 3
                    },
                    maxUses: 160,
                    currentUses: 160
                }
            },
            armors: [
                {
                    instanceId: 'player_tactical_vest',
                    id: 'tactical_vest_guardian',
                    name: '军工加固战术胸甲',
                    desc: '军用重型防弹胸甲，外层手工铆接了均质防弹钢板，对穿透与撕裂提供可靠防护。',
                    type: 'armor',
                    grade: 'military',
                    size: [2, 2],
                    defense: 0.22,
                    maxUses: 130,
                    currentUses: 130
                }
            ],
            accessories: [
                {
                    instanceId: 'player_guardian_core',
                    id: 'guardian_core',
                    name: '守护者核心组件',
                    desc: '嵌于胸骨中央的生化维持核心，稳定输出生命体征监控电波并过滤认知扰动。',
                    type: 'accessory',
                    grade: 'military',
                    size: [1, 1],
                    effects: [
                        ['maxHp', 30],
                        ['maxSanity', 10]
                    ]
                },
                {
                    instanceId: 'player_cooling_core',
                    id: 'cooling_core',
                    name: '辅助散热导管',
                    desc: '外置于脊椎中枢的液冷循环管道，缓解重负荷运作带来的精力过载衰竭。',
                    type: 'accessory',
                    grade: 'military',
                    size: [1, 1],
                    effects: [
                        ['maxVigor', 20]
                    ]
                }
            ]
        },
        inventory: [
            {
                id: 'spare_battery',
                name: '工业级备用电池组',
                desc: '高容量稳压电池，可接入神经链接仪或机载动力接口紧急供能。',
                type: 'consumable',
                grade: 'standard',
                size: [1, 1],
                effects: [
                    ['battery', 60]
                ]
            },
            {
                id: 'basic_toolkit',
                name: '军械维护工具包',
                desc: '装有微型扳手、焊笔与绝缘胶布的便携包，用于现场修复微电极或装甲裂损。',
                type: 'consumable',
                grade: 'standard',
                size: [2, 1],
                effects: [
                    ['integrity', 25]
                ]
            },
            {
                id: 'field_medkit',
                name: '野战急救加压包',
                desc: '包含高浓度止血凝胶与皮下缝合器的紧急医疗套装，可封堵严重撕裂伤。',
                type: 'consumable',
                grade: 'military',
                size: [2, 1],
                effects: [
                    ['hp', 55]
                ]
            },
            {
                id: 'coolant_pack',
                name: '氟碳冷却剂罐',
                desc: '向背部散热排喷射超低温冷却液，快速缓解过载，恢复机载精力。',
                type: 'consumable',
                grade: 'standard',
                size: [1, 1],
                effects: [
                    ['vigor', 45]
                ]
            },
            {
                id: 'cognitive_stabilizer',
                name: '阻断神经稳定剂',
                desc: '抑制中枢处理器与残存生物脑之间的谐振震颤，迅速平复濒临崩溃的理智。',
                type: 'consumable',
                grade: 'military',
                size: [1, 1],
                effects: [
                    ['sanity', 30]
                ]
            }
        ],
        uniqueTactic: [
            {
                type: 'A',
                id: 'guardian_shield_bash',
                name: '盾牌冲撞',
                desc: '驱动臂甲液压全开，以盾牌重击单个目标，打乱其身形重心并瓦解其攻击节奏。',
                apCost: 1,
                requireWeapon: 'shield',
                tacticEffect: [
                    ['single_enemy', 'speed', -3, 2],
                    ['single_enemy', 'agility', -3, 2]
                ]
            },
            {
                type: 'D',
                id: 'guardian_cover_protocol',
                name: '掩护协议',
                desc: '将重盾斜插在友方身前构筑防御斜角，以自身机械身躯分担冲击，提供战术护盾。',
                apCost: 1,
                tacticEffect: [
                    ['single_teammate', 'shield', 25, 2],
                    ['single_teammate', 'sanity', 8, 0]
                ]
            },
            {
                type: 'D',
                id: 'guardian_iron_will',
                name: '装甲锁定',
                desc: '激活下肢液压驻退器与胸骨固定栓，提升本体硬质免伤，构筑稳固防线。',
                apCost: 1,
                tacticEffect: [
                    ['self', 'defense', 0.12, 2],
                    ['self', 'shield', 30, 2]
                ]
            },
            {
                type: 'D',
                id: 'guardian_bulwark_field',
                name: '壁垒屏障',
                desc: '过载核心动力源，向周遭展开短程静电偏折屏障，稳定全体随行人员的防御阵型。',
                apCost: 2,
                tacticEffect: [
                    ['all_teammates', 'shield', 20, 2],
                    ['all_teammates', 'sanity', 12, 0]
                ]
            }
        ],
        // 同伴特定字段：严格归入 initialState 内部以满足 CompanionTemplate 接口契约
        affinity: 45,
        needs: [
            {
                id: 'guardian_memory_fragment',
                desc: '协助 Unit-734 在铁锈前哨的深层生化实验室废墟中，回收一枚被物理密封的备用记忆核心。',
                goals: [
                    {
                        id: 'memory_core_fragment',
                        name: '烧蚀的记忆核心',
                        desc: '一块表面布满电弧烧痕的固态存储单元，标签上烙印着「铁壁-734」绝密字样。',
                        type: 'data',
                        grade: 'foundation',
                        size: [1, 1],
                        documentContent:
                            '【铁壁计划机要备忘录】受试者 Unit-734 已完成第 3 阶段机械切除。恐惧抑制率 99.4%。注意：其脑干深处仍残留对幼童与平民的非理性保护本能。若遭遇基金会清理部队，立即启动销毁滑道。重复：切勿唤醒其旧世界真名。'
                    }
                ],
                rewards: [
                    {
                        id: 'stabilized_power_core',
                        name: '过载稳定动力核心',
                        desc: '军械工程师针对其机体重新标定的备用反应堆，显著拓展精力上限，并降低理智衰减速度。',
                        type: 'accessory',
                        grade: 'corporate',
                        size: [1, 1],
                        effects: [
                            ['maxVigor', 25],
                            ['maxSanity', 15]
                        ]
                    }
                ],
                difficulty: 5
            }
        ]
    },
    style: 'defense'
};