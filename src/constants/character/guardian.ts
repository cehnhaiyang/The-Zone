import type { CompanionTemplate } from '../../contract/meta';

/**
 * 守护者 - 防御型 (Defense)
 *
 * 核心定位：超高生命、重盾格挡、全队护盾掩护与精神锚定
 * 玩法特色：
 *   - 主手战术匕首配合副手重型防暴盾（shield），大幅提升防御序列中最高 1.0 满额部分减伤（partial）的出现率；
 *     触发满额格挡时仅消耗防暴盾耐久，完全保护穿戴护甲不受磨损
 *   - 具备定向掩护（「掩护协议」）与群体偏折力场（「壁垒屏障」），同时分担队友的物理伤害与理智压力
 * 风险收益：
 *   - 机动性（agility 10）与战场觉知（awareness 12）偏低，位移缓慢
 *   - 重负荷液压与力场发生器持续消耗精力（vigor），需依赖散热组件与冷却剂维持高强度运转
 */
export const COMPANION_GUARDIAN: CompanionTemplate = {
    id: 'guardian',
    name: 'Unit-734',
    gender: 'male',
    desc: '系统日志——身份：不明。身体机械化程度：43%。记忆核心：严重损坏（数据完整性 <7%）。当前运行协议：[首要] 保护无辜者 / [次要] 生存 / [隐藏] ???。残存日志显示你曾隶属于「铁锈前哨」深层掩体的「铁壁计划」子项目，但所有实验档案皆在紧急处置滑道中被熔毁。受试者恐惧反应回路已被物理切除，每当感知到队友受创，核心处理器便会拉响不可屏蔽的最高优先级警报。装甲厚重，电池沉重，理智协议在过载中摇摇欲坠。也许在被改造成战争机器前，你曾被设计为一个好人。',
    visualPrompt: 'A towering half-human half-machine guardian, 43 percent cybernetic body with exposed steel endoskeleton on the left arm and torso, one tired organic eye and one glowing crimson cybernetic optical sensor, heavy military armored plates with deep scratches and claw marks, thick hydraulic cables connected to a spine-mounted power core, holding a massive reinforced riot shield, industrial underground bunker backdrop with sparks and steam, dark sci-fi survival horror aesthetic, intricate mechanical detail.',
    initialState: {
        attribute: {
            // [20 ~ 30] 液压重装骨骼：提供浑厚的近战力量基数与超大网格负重空间
            strength: 28,
            // [10 ~ 20] 迟缓稳固：军工伺服底盘维持最低战术机动，确保基础 AP = floor(10/5) = 2 并激活差反机制 (speed >= 10)
            agility: 10,
            // [10 ~ 20] 战术协处理器：内置军工逻辑分析单元，足以支撑常规环境研判与掩体计算
            wisdom: 14,
            // [10 ~ 20] 传感器受损：左眼光学镜头布满裂痕，细微线索搜寻与先手洞察能力有限
            awareness: 12,
            // [10 ~ 20] 恐惧回路切除：高达 99.4% 的硬件恐惧抑制率，使其面对不可名状之物时拥有远超凡人的精神定力
            will: 18,
            // 机械纯度：未受深渊血肉异化浸染，纯粹由特种合金与合成肌束构成的半机械躯体
            cthulhu: 0
        },
        vital: {
            // 极其优秀 [300+ 档位]：重装义体与强化脏器赋予坚不可摧的血牛底子（配合核心组件高达 350 点）
            maxHp: 320,
            // 稳定锚定：依赖守护者核心硬件算法过滤认知扰动（配合核心组件达 120 点）
            maxSanity: 110,
            // 优秀耐力：军用级人工肌束具备超长持续抗压耐力，生成长达 L = floor(210 / 10) = 21 的攻防序列
            maxStamina: 210,
            // 散热瓶颈：重负荷液压与偏折力场持续挤占精力储备（配合散热导管补正至 110 点），需注意过热疲劳
            maxVigor: 90
        },
        equipState: {
            weapons: {
                main: {
                    instanceId: 'player_combat_knife',
                    id: 'combat_knife',
                    name: '军用战术匕首',
                    desc: '铁锈前哨步兵制式高碳钢战术刀，刀背带锯齿，固定于机械右臂卡槽，适合在盾牌格挡间隙发动近身应急穿刺。',
                    type: 'weapon',
                    grade: 'military',
                    size: [2, 1],
                    weaponType: 'prick',
                    weaponDamageType: 'melee',
                    range: 1, // 贴身档位（第 1 档）：匕首标准交战距离
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
                    desc: '重型钛合金复合防暴盾，表面留有异变生物的深邃爪痕与撞击凹坑。锁死于左臂液压轴承，可显著提升防御序列出现高额部分减伤（partial）的概率并将上限提至 1.0；触发满额格挡时仅消耗盾牌耐久。',
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
                    desc: '「铁壁计划」专配的重型防弹外骨骼胸甲，外层手工铆接了均质防弹钢板，对利爪撕裂与动能弹片提供极高常驻免伤。',
                    type: 'armor',
                    grade: 'military',
                    size: [2, 2],
                    defense: 0.22,
                    maxUses: 140,
                    currentUses: 140
                }
            ],
            accessories: [
                {
                    instanceId: 'player_guardian_core',
                    id: 'guardian_core',
                    name: '守护者核心组件',
                    desc: '嵌于胸骨中央的生化维持核心，稳定输出生命体征监控电波并过滤高维认知杂音。',
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
                    desc: '外置于脊椎中枢的液冷循环管道，有效缓解重负荷液压与护盾过载带来的精力衰竭。',
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
                desc: '高容量稳压锂聚合物电池，可接入神经链接仪或机载动力接口进行紧急供能。',
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
                desc: '装有微型液压扳手、冷焊笔与高绝缘胶布的便携包，用于现场修复微电极阵列或装甲裂损。',
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
                desc: '包含高浓度生物止血凝胶与皮下自动缝合器的军用医疗套装，可迅速封堵严重撕裂创口。',
                type: 'consumable',
                grade: 'military',
                size: [2, 1],
                effects: [
                    ['hp', 60]
                ]
            },
            {
                id: 'coolant_pack',
                name: '氟碳冷却剂罐',
                desc: '向背部脊椎散热排喷射超低温氟碳冷却液，快速带走核心积热，大幅恢复机载精力。',
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
                desc: '抑制中枢逻辑处理器与残存生物脑干之间的排异谐振，迅速平复濒临过载的理智。',
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
                desc: '驱动左臂液压全开，以重型防暴盾猛烈撞击单个目标，震散其重心并显著压低其行动速度、命中精度与攻击出力。',
                apCost: 1,
                requireWeapon: 'shield',
                tacticEffect: [
                    ['single_enemy', 'speed', -3, 2],
                    ['single_enemy', 'aim', -15, 2],
                    ['single_enemy', 'damage', -4, 2]
                ]
            },
            {
                type: 'D',
                id: 'guardian_cover_protocol',
                name: '掩护协议',
                desc: '将重盾斜插在友方身前构筑防弹斜角，以半机械身躯代受冲击，为指定友方提供厚实护盾、常驻免伤并平复其心神。',
                apCost: 1,
                tacticEffect: [
                    ['single_ally', 'shield', 28, 2],
                    ['single_ally', 'defense', 0.10, 2],
                    ['single_ally', 'sanity', 8, 0]
                ]
            },
            {
                type: 'D',
                id: 'guardian_iron_will',
                name: '装甲锁定',
                desc: '激活下肢液压驻退器与胸骨固定栓，大幅提升本体常驻免伤与护盾值，并强制将本次防御序列判定结果提升 1 档以触发重盾完美格挡。',
                apCost: 1,
                tacticEffect: [
                    ['self', 'defense', 0.15, 2],
                    ['self', 'shield', 30, 2],
                    ['self', 'd_sequence', 1, 1]
                ]
            },
            {
                type: 'D',
                id: 'guardian_bulwark_field',
                name: '壁垒屏障',
                desc: '过载脊椎动力核心并消耗部分机载精力，向周遭展开短程静电偏折力场，为全队所有友方单位构筑护盾并稳定精神防线。',
                apCost: 2,
                tacticEffect: [
                    ['all_allies', 'shield', 22, 2],
                    ['all_allies', 'sanity', 12, 0],
                    ['self', 'vigor', -8, 0]
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
                        desc: '军械工程师针对其机体重新标定的备用反应堆，显著拓展精力上限，并进一步巩固理智防线。',
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