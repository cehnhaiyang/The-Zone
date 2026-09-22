import type { PlayerTemplate } from '../../meta';

/**
 * 神秘学者 - 爆发型 (Burst)
 * 核心定位：超高真实法术爆发、极度脆弱、生命理智换取超验力量
 * 玩法特色：跳过物理护甲的无上限即时法术输出 (Instant Magic)，深度共鸣不可知深渊禁物
 * 风险收益：容错率极低、濒死风险恒定常驻，但对高护甲及超自然实体具备绝对毁灭力
 */
export const PLAYER_OCCULTIST: PlayerTemplate = {
    id: 'occultist',
    name: 'Aria',
    gender: 'female',
    desc: '前联邦大学民俗学系副教授。你在破译古苏美尔泥板时发表的《旧日支配者的真实性考证》，不仅使你在学界声名狼藉，更引来了帷幕彼侧不可名状的无上注视。灾变前夕，你的整条右臂在一周内坏死黑化，却在第八天被某种具备独立知觉的高维真菌菌丝所活化同化——它如蠕虫般自发替你翻页、替你握笔。你已不再恐惧肉体的异变。你以残存理智与自身血肉为蜡油，点亮了直视虚空的烛火。真理并非遥不可及，它正顺着你的骨髓静静流淌。',
    visualPrompt: 'A gaunt, pale female occult scholar in her early 30s with unkempt silver-streaked hair falling over one eye, wearing dark tattered academic robes embroidered with arcane silver sigils, her right hand and forearm completely blackened and covered in pulsing bioluminescent violet fungal growths, holding a sinister obsidian ritual dagger with glowing runes in one hand, dark academic occult atmosphere, eerie ambient purple lighting, volumetric fog, Lovecraftian cosmic horror.',
    initialState: {
        attribute: {
            strength: 1,      // 残废：肉体被病态学术熬夜与真菌抽取严重亏空，背包负重与格位极度受限
            agility: 8,       // 偏弱：缺乏规避训练，运动机能迟滞，战斗速度慢
            wisdom: 28,       // 极强：通晓禁忌古代文献与非欧几何哲学体系，搜查消耗大幅降低
            awareness: 26,    // 极强：超感灵敏，极易捕捉高维涟漪与弱点（亦加剧理智磨损）
            will: 28,         // 极强：精神核坚如寒冰，即时真伤法术的终极放大器（will/10 带来巨额伤害加成）
            cthulhu: 14       // 深渊亲和：右臂菌丝共生体带来极高的不可知抗性与禁忌遗物负面抵消
        },
        vital: {
            maxHp: 55,        // 残废极限：生理处于崩溃边缘，无法承受任何常规钝击或撕扯
            maxSanity: 80,    // 偏低：常年处于认知侵蚀边缘，与疯癫仅一线之隔
            maxStamina: 60,   // 残废边缘：肺活量与肌肉糖原储备极低，序列重铸压力极大
            maxVigor: 70      // 较弱：神经系统常年承受耳语轰击，精力恢复缓慢
        },
        inventory: [
            {
                id: 'void_fragment',
                name: '虚空原石碎片',
                desc: '从时空裂隙边缘剥落的致密非结晶固态能量，触手冰冷刺骨，隐隐倒映出未来景象。',
                type: 'material',
                grade: 'prototype',
                size: [1, 1],
                cognitiveErosionState: 2
            },
            {
                id: 'incense_bundle',
                name: '安神沉木药香',
                desc: '以深渊黑苔与干枯鼠尾草手工研磨的香束，点燃时青烟低伏，能平复受惊的神经。',
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
                desc: '自右臂析出的浓稠荧光液体。服下会引发全身灼痛与精力透支，却能暂时引爆超验意志。',
                type: 'consumable',
                grade: 'prototype',
                size: [1, 1],
                fleshFusionState: 1,
                effects: [
                    ['will', 6, 3],
                    ['sanity', -15],
                    ['hp', -10]
                ]
            }
        ],
        equipState: {
            weapons: {
                main: {
                    instanceId: 'ceremonial_dagger_1',
                    id: 'ceremonial_dagger',
                    name: '侵蚀仪式短刃',
                    desc: '以黑曜石打磨的仪式法器，锋刃生有微小菌丝脉络。完全跳过物理免伤与防御序列，引导意志直接撕碎生命因果本质。',
                    type: 'weapon',
                    grade: 'prototype',
                    size: [1, 1],
                    weaponType: 'magic',
                    weaponDamageType: 'instant',
                    range: 0, // 魔法/无衰减武器统一规则：range = 0（跨越空间，无限射程）
                    damage: 7,
                    crit: {
                        chance: 0.12,
                        bonus: 6
                    },
                    maxUses: 60,
                    currentUses: 60,
                    fleshFusionState: 2,       // 深度绑定右臂异化真菌
                    cognitiveErosionState: 3   // 强认知侵蚀，大幅增幅法术但持续叩问理智
                },
                side: null
            },
            armors: [
                {
                    instanceId: 'player_academic_robe_1',
                    id: 'tattered_academic_robe',
                    name: '残破学者法袍',
                    desc: '联邦大学教授导师礼服，下摆已被泥水与真菌孢子污染。内衬以银线缝入了避祸符箓。',
                    type: 'armor',
                    grade: 'salvaged',
                    size: [2, 2],
                    defense: 0.04,
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
                    desc: '由不可知海洋古生物遗骨雕刻而成的五角符文，表面冰冷，能强行拓宽理智承受极值。',
                    type: 'accessory',
                    grade: 'military',
                    size: [1, 1],
                    effects: [
                        ['maxSanity', 15],
                        ['will', 2]
                    ]
                }
            ]
        },
        uniqueTactic: [
            {
                type: 'A',
                id: 'occultist_void_bolt',
                name: '虚空贯穿',
                desc: '以右臂菌丝引导高维裂隙反冲能量打击目标，震颤其精神结构并熔毁其防护。',
                apCost: 2,
                requireWeapon: 'magic',
                tacticEffect: [
                    ['single_enemy', 'will', -5, 2],
                    ['single_enemy', 'defense', -0.12, 2]
                ]
            },
            {
                type: 'U',
                id: 'occultist_blood_pact',
                name: '鲜血契约',
                desc: '撕开手腕以活体鲜血献祭右臂寄生体，将肉体痛苦转化为暴虐的毁灭增益。',
                apCost: 1,
                tacticEffect: [
                    ['self', 'wisdom', 5, 2],
                    ['self', 'damage', 6, 2],
                    ['self', 'hp', -8, 0]
                ]
            },
            {
                type: 'D',
                id: 'occultist_ritual_barrier',
                name: '旧印结界',
                desc: '以指尖鲜血在虚空中勾勒排斥符文，构筑阻断物理与精神冲击的无形屏障。',
                apCost: 1,
                tacticEffect: [
                    ['self', 'shield', 22, 2],
                    ['self', 'sanity', 8, 0]
                ]
            },
            {
                type: 'A',
                id: 'occultist_abyssal_resonance',
                name: '深渊共鸣',
                desc: '释放菌丝内部的高频不可知杂音，无差别冲击所有敌方单位的突触，降低其速度与闪避。',
                apCost: 2,
                requireWeapon: 'magic',
                tacticEffect: [
                    ['all_enemies', 'speed', -3, 2],
                    ['all_enemies', 'evasion', -0.15, 2]
                ]
            }
        ]
    },
    style: 'burst'
};