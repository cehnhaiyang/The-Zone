import type { PlayerTemplate } from '../../contract/meta';

/**
 * 神秘学者 - 爆发型 (Burst)
 *
 * 核心定位：超高真实法术爆发、极度脆弱、以生命与理智献祭超验因果力量
 * 玩法特色：
 *   - 跳过物理常驻护甲与防御序列的即时真实法术输出 (Instant Magic)
 *   - 意志（will）驱动的巨额法术伤害放大系数：
 *     $$\text{True Damage} = \lfloor \text{WeaponDamage} \times (1 + \lfloor will / 10 \rfloor \times 0.5) \times combatBonus \times 0.75 \rfloor$$
 *   - 深度共鸣高维异变遗物（利用 cthulhu 亲和性代偿血肉融合与认知侵蚀的反噬）
 * 风险收益：
 *   - 生理极限处于残废边缘（maxHp 55），容错率极低，抗击打能力微弱
 *   - 启动爆发后能在数回合内对高护甲及深渊实体造成不可逆的毁灭性抹杀
 */
export const PLAYER_OCCULTIST: PlayerTemplate = {
    id: 'occultist',
    name: 'Aria',
    gender: 'female',
    desc: '前联邦大学民俗学与古文字系副教授。你在破译古苏美尔泥板时发表的《旧日支配者的真实性考证》，不仅使你在学术界声名狼藉，更引来了帷幕彼侧高维意志的冰冷注视。大灾变降临前夕，你的整条右臂在一周内坏死黑化，却在第八天被某种具备独立知觉的高维真菌菌丝同化活化——它如活体蠕虫般自发替你翻阅典籍、握持短刃。你已不再恐惧肉体的异化，而是将残存理智与自身鲜血作为燃烧的蜡油，点亮了直视深渊本质的因果烛火。真理并非遥不可及，它正顺着你的骨髓静静流淌。',
    visualPrompt: 'Cinematic horror, a gaunt pale female occult scholar in her early 30s with disheveled silver-streaked raven hair falling over one eye, dark tattered academic Victorian robes embroidered with glowing eldritch silver sigils, her entire right arm completely blackened and covered in pulsing bioluminescent violet fungal tendrils, holding an obsidian ritual ceremonial dagger with engraved cosmic runes, liminal non-Euclidean gothic chamber, eerie ambient purple lighting, volumetric fog, Unreal Engine 5 render, cosmic horror atmosphere, hyper-detailed.',
    initialState: {
        attribute: {
            // [0 ~ 5] 残废区间：严重缺乏物理训练，长期沉浸于禁断典籍与真菌侵蚀，负重能力极低
            strength: 2,
            // [10 ~ 20] 标准底线：神经传导勉强及格，满足基础行动点 AP = floor(speed/5) = 2，并达到差反机制启动门槛 (speed >= 10)
            agility: 10,
            // [20 ~ 30] 顶尖学者：通晓古苏美尔秘文与非欧拓扑几何，大幅降低废墟搜查与推理的精力消耗
            wisdom: 28,
            // [20 ~ 30] 超感灵敏：极度敏锐的高维因果捕获力，大幅提高搜查发现与暴击精度，但加速日常理智磨损
            awareness: 26,
            // [20 ~ 30] 冰冷精神核：常态下裸装 28 点；佩戴旧印护符 (+2) 后精准突破 30 点质变大关，激活 2.5 倍法术基础乘区
            will: 28,
            // [10 ~ 20] 深渊同调：右臂真菌共生体带来优异的深渊抗性，能大幅代偿高阶禁忌遗物的负面侵蚀
            cthulhu: 15
        },
        vital: {
            // 残废极限 [50 档位]：肉体脏器严重衰竭，无法承受重型物理钝击与撕扯
            maxHp: 55,
            // 脆弱阈值：常年遭受深渊耳语轰击，距狂乱与神经崩溃仅一步之遥
            maxSanity: 80,
            // 序列长度 $L = \lfloor 60 / 10 \rfloor = 6$：行动序列短，战术爆发容错极紧凑
            maxStamina: 60,
            // 精神疲惫：中枢神经系统承受高维震颤，精力亏空与疲劳积累速度偏快
            maxVigor: 70
        },
        inventory: [
            {
                id: 'void_fragment',
                name: '虚空原石碎片',
                desc: '从时空裂隙边缘剥落的致密非晶态能量晶体，触手冰冷刺骨，其内部折叠结构正以肉眼不可见的速度自我重组。',
                type: 'material',
                grade: 'prototype',
                size: [1, 1],
                cognitiveErosionState: 2
            },
            {
                id: 'incense_bundle',
                name: '安神沉木药香',
                desc: '以深渊黑苔提取液与干枯鼠尾草手工研磨压制的香束，点燃后青烟凝而不散，能有效舒缓受惊震荡的中枢神经。',
                type: 'consumable',
                grade: 'standard',
                size: [1, 1],
                effects: [
                    ['sanity', 35]
                ]
            },
            {
                id: 'fungal_spore_vial',
                name: '活体寄生孢子浸液',
                desc: '自右臂异化菌丝中析出的高浓度荧光浸出液。饮用会诱发强烈的全身烧灼感与机能损伤，却能短时间内强行引爆超验意志。',
                type: 'consumable',
                grade: 'prototype',
                size: [1, 1],
                fleshFusionState: 1,
                effects: [
                    ['will', 6, 3],
                    ['sanity', -15],
                    ['hp', -10]
                ]
            },
            {
                id: 'sumerian_tablet_rubbing',
                name: '苏美尔星图拓片',
                desc: '记录着《旧日支配者的真实性考证》核心论据的古代泥板拓印纸页，边缘布满不可名状的几何纹路，记载着帷幕裂隙的开启律动。',
                type: 'data',
                grade: 'foundation',
                size: [1, 1],
                cognitiveErosionState: 2,
                documentContent: '……当角宿一与水银之海重叠，铅封之门将自内侧融化。勿视其形，因其形即是深渊的瞳孔；勿闻其声，因其声即是因果的丧钟……'
            }
        ],
        equipState: {
            weapons: {
                main: {
                    instanceId: 'ceremonial_dagger_1',
                    id: 'ceremonial_dagger',
                    name: '侵蚀仪式短刃',
                    desc: '以深渊黑曜石精细打磨的仪式法器，锋刃内部天然寄生着活体菌丝脉络。攻击时完全跳脱物理防御序列与常驻护甲，直接以超验意志撕碎目标的生命因果本质。',
                    type: 'weapon',
                    grade: 'prototype',
                    size: [1, 1],
                    weaponType: 'magic',
                    weaponDamageType: 'instant',
                    range: 0, // 魔法类武器统一规范：range = 0（无弹道衰减，跨越空间全图定点打击）
                    damage: 8, // 面板真实伤害基数
                    crit: {
                        chance: 0.15,
                        bonus: 7
                    },
                    maxUses: 60,
                    currentUses: 60,
                    fleshFusionState: 2,       // 深度绑定右臂异化真菌，提供额外暴击倾向
                    cognitiveErosionState: 3   // 强认知侵蚀，大幅增幅法术威力，但持续抽取使用者心智
                },
                side: null
            },
            armors: [
                {
                    instanceId: 'player_academic_robe_1',
                    id: 'tattered_academic_robe',
                    name: '残破学者法袍',
                    desc: '昔日联邦大学教授的礼仪长袍，下摆已被泥水与深渊孢子浸透。内衬用暗银丝线缝入了古苏美尔防灾避祸符印。',
                    type: 'armor',
                    grade: 'salvaged',
                    size: [2, 2],
                    defense: 0.05, // 仅提供 5% 象征性物理减免，表现肉体防护的极端脆弱
                    maxUses: 60,
                    currentUses: 60,
                    cognitiveErosionState: 1
                }
            ],
            accessories: [
                {
                    instanceId: 'player_old_talisman_1',
                    id: 'old_talisman',
                    name: '旧印雕骨护符',
                    desc: '由深海不可知古生物骨骼雕刻而成的五角符文，表面触感冰冷。',
                    type: 'accessory',
                    grade: 'military',
                    size: [1, 1],
                    effects: [
                        ['maxSanity', 15],
                        ['will', 2] // 核心机制件：将 will 补正至 30 (floor(30/10) = 3)，法术倍率自 2.0x 质变为 2.5x
                    ]
                }
            ]
        },
        uniqueTactic: [
            {
                type: 'A',
                id: 'occultist_void_bolt',
                name: '虚空贯穿',
                desc: '以右臂菌丝引导高维裂隙的反冲应力，直接击穿目标的因果轴心。因法术本就跳过物理护甲，此击转而引发神经震荡，重创目标的攻击出力与移动速度。',
                apCost: 2,
                requireWeapon: 'magic',
                tacticEffect: [
                    ['single_enemy', 'speed', -3, 2],
                    ['single_enemy', 'damage', -5, 2]
                ]
            },
            {
                type: 'U',
                id: 'occultist_blood_pact',
                name: '鲜血契约',
                desc: '以黑曜石短刃划破手腕，将活体温热鲜血献祭给右臂的寄生真菌，将肉体的剧烈痛苦直接转化为下一轮法术爆发的狂暴杀伤力与暴击倾向。',
                apCost: 1,
                tacticEffect: [
                    ['self', 'hp', -8, 0],       // 立即献祭 8 点宝贵生命
                    ['self', 'damage', 8, 2],   // 攻击力大幅暴涨，全面放大爆发伤害池
                    ['self', 'crit_chance', 0.15, 2] // 提升暴击概率
                ]
            },
            {
                type: 'D',
                id: 'occultist_ritual_barrier',
                name: '旧印结界',
                desc: '以指尖精血在虚空中勾勒五角旧印，构筑抵挡物理轰击与精神冲击的排斥护盾，并在符文闭合时平复动荡的心智。',
                apCost: 1,
                tacticEffect: [
                    ['self', 'shield', 24, 2], // 独立护盾层，先于生命值吸收一切伤害
                    ['self', 'sanity', 10, 0]  // 平复 10 点理智，缓解施法反噬与耳语侵蚀
                ]
            },
            {
                type: 'A',
                id: 'occultist_abyssal_resonance',
                name: '深渊共鸣',
                desc: '释放菌丝内部的高频不可知杂音，对全战场敌方单位的中枢神经发动无差别认知震颤，大幅降低其机动性与闪避预判。',
                apCost: 2,
                requireWeapon: 'magic',
                tacticEffect: [
                    ['all_enemies', 'speed', -3, 2],    // 全体减速 3 点，逆转战局节奏
                    ['all_enemies', 'evasion', -0.20, 2] // 全体额外免伤（闪避率）降低 20%，为全队集火创造必中窗口
                ]
            }
        ]
    },
    style: 'burst'
};