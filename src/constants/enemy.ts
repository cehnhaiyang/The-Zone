import type { EnemyTemplate } from '../meta';

/**
 * 基础敌人模板库
 *
 * 包含游戏中的所有常规敌人、特定区域的遭遇怪物，以及区域专属的通用首领。
 * 敌人会出现在玩家庇护所、后续由 LLM 生成的区域中。
 *
 * 该文件仅定义符合各个庇护所风格的通用敌人，以及默认的通用敌人，
 * 不定义承载特定叙事功能的敌人，它们会在自己的区域 / 庇护所定义文件中定义。
 *
 * 敌人战斗数值设计标准（speed / damage / evasion / defense）：
 * 0~5：残废、差劲 / 杂鱼怪
 * 5~10：较弱 / 小怪
 * 10~20：一般人 / 普通怪
 * 20~30：较强 / 稀有怪
 * 30~40：很强 / 精英怪
 * 40~50：佼佼者 / 小 boss
 *
 * Range 规范：
 * - 近战挥砍 / 极短刺击：1
 * - 中等刺击近战：2
 * - 长柄近战 / 投掷 / 短管霰弹：3
 * - 标准霰弹 / 袖珍手枪：4
 * - 普通手枪 / 传统弓：5
 * - 大威力手枪 / 卡宾 / 复合弓：6
 * - 独头弹霰弹 / 军用弩 / 短管冲锋枪：7
 * - 标准冲锋枪 / 现代弓：8
 * - 短管突击步枪 / 精密冲锋枪：9
 * - 标准突击步枪：10
 * - DMR / 通用机枪 / 中程狙击：11
 * - 长管狙击 / 反器材步枪：12
 * - 魔法 / 能量 / 无弹道衰减：0
 *
 * @version 3.1.0
 */
export const ENEMY_TEMPLATES: Record<string, EnemyTemplate> = {
    // =====================================================================
    // 通用敌人
    // =====================================================================

    /**
     * 哀嚎影卫
     * 低威胁精神类敌人，常用于前期认知扰动与低声压环境。
     */
    shadow_whisperer: {
        type: 'cthulhu',
        id: 'shadow_whisperer',
        name: '哀嚎影卫',
        range: 3,
        desc: '这是一团由纯粹黑暗交织而成的轮廓，没有实体，却能发出让人神经衰弱的低声抽泣，仿佛在寻找它失落的名字。',
        visualPrompt: 'A blurry, semi-transparent humanoid silhouette made of pulsing dark mist, elongated limbs, featureless hollow face, standing in a flickering dark hallway, volumetric lighting, analog horror aesthetic, low noise, photorealistic, cinematic grain.',
        speed: 8,
        damage: 5,
        evasion: 12,
        defense: 2,
        intentDistribution: {
            attack: 30,
            defense: 5,
            buff: 10,
            debuff: 35,
            observe: 20,
        },
        lootTable: [
            {
                id: 'shadow_residue',
                name: '暗影残渣',
                desc: '一团冰冷的黑色粉末，触摸时会吸收你手上的热量。',
                type: 'material',
                rarity: 'standard',
                dropProbability: 0.6,
            },
            {
                id: 'broken_memory_chip',
                name: '破损的记忆芯片',
                desc: '里面可能还残留着某些生前的数据。',
                type: 'material',
                rarity: 'organized',
                dropProbability: 0.1,
            },
        ],
    },

    /**
     * 虚空凝视者
     * 中高威胁精神 / 观察型敌人，偏向 debuff 与理智压力。
     */
    void_gazer: {
        type: 'cthulhu',
        id: 'void_gazer',
        name: '虚空凝视者',
        range: 6,
        desc: '一团漂浮的半透明物质，其核心是一颗巨大的、混浊的眼球，它不仅在观察你的肉体，更在审视你的灵魂。',
        visualPrompt: 'A floating mass of ethereal translucent tentacles surrounding a single massive, cataracts-covered bloodshot eye, cosmic horror, dark purple and blue color palette, glowing iris, unsettling atmosphere, hyper-detailed textures, cinematic render.',
        speed: 12,
        damage: 10,
        evasion: 18,
        defense: 6,
        intentDistribution: {
            attack: 25,
            defense: 5,
            buff: 20,
            debuff: 40,
            observe: 10,
        },
        lootTable: [
            {
                id: 'void_salt',
                name: '虚空盐',
                desc: '从凝视者残骸中析出的灰蓝色晶体，靠近耳边时能听见极微弱的嗡鸣。',
                type: 'material',
                rarity: 'organized',
                dropProbability: 0.35,
            },
            {
                id: 'cataract_lens',
                name: '浊眼透镜',
                desc: '一枚浑浊的晶体透镜，装上后世界会变得更清晰，也更令人不安。',
                type: 'accessory',
                rarity: 'organized',
                effects: [
                    ['perception', 2],
                    ['wisdom', 1],
                    ['maxSanity', -3],
                ],
                dropProbability: 0.1,
            },
        ],
    },

    /**
     * 畸变猎犬
     * 高敏捷近战单位，威胁直接但智能较低。
     */
    flesh_hound: {
        type: 'cthulhu',
        id: 'flesh_hound',
        name: '畸变猎犬',
        range: 1,
        desc: '剥落了皮肤的变异生物，新鲜的肌肉组织暴露在空气中，随着沉重的呼吸交替收缩，不断滴落带有腐蚀性的黄色粘液。',
        visualPrompt: 'A nightmarish, skinless mutated hound, exposed raw muscle fibers oozing glistening yellow biological fluid, multi-jointed legs, rows of needle-sharp teeth, dark damp environment, body horror, high contrast lighting, photorealistic macro photography.',
        speed: 24,
        damage: 20,
        evasion: 14,
        defense: 8,
        intentDistribution: {
            attack: 75,
            defense: 0,
            buff: 10,
            debuff: 10,
            observe: 5,
        },
        lootTable: [
            {
                id: 'acid_gland',
                name: '酸液腺体',
                desc: '不断滴落腐蚀性液体的器官，可以作为危险的材料使用。',
                type: 'material',
                rarity: 'organized',
                dropProbability: 0.5,
            },
            {
                id: 'mutated_meat',
                name: '变异生肉',
                desc: '散发着怪味的肉块。在极度饥饿时才能咽下。',
                type: 'consumable',
                rarity: 'standard',
                effects: [['heal_hp', 10]],
                dropProbability: 0.75,
            },
        ],
    },

    /**
     * 缝合巨怪
     * 高力量重击单位，行动缓慢但压制力强。
     */
    stitched_horror: {
        type: 'cthulhu',
        id: 'stitched_horror',
        name: '缝合巨怪',
        range: 2,
        desc: '由多具尸体的残肢强行拼接而成的肉山，粗糙的缝合线处还在渗血，它挥动着变形成镰刀状的巨臂，发出震天的怒吼。',
        visualPrompt: 'A massive hulking mound of human flesh stitched together with rusty wire, multiple mismatched limbs, internal organs visible through transparent skin patches, wielding a bone scythe, grotesque lighting, extreme detail, bio-mechanical grotesque style, cinematic horror.',
        speed: 8,
        damage: 32,
        evasion: 4,
        defense: 18,
        intentDistribution: {
            attack: 55,
            defense: 15,
            buff: 30,
            debuff: 0,
            observe: 0,
        },
        lootTable: [
            {
                id: 'bone_fragment',
                name: '碎骨片',
                desc: '从缝合巨怪身上脱落的硬化骨片，边缘锋利得像劣质刀片。',
                type: 'material',
                rarity: 'standard',
                dropProbability: 0.7,
            },
            {
                id: 'reinforced_suture',
                name: '加固缝合线',
                desc: '混合了金属丝与筋膜的缝合材料，异常坚韧。',
                type: 'material',
                rarity: 'organized',
                dropProbability: 0.35,
            },
        ],
    },

    /**
     * 繁星眷族
     * 高维宇宙恐怖单位，精神属性极高，适合中后期遭遇。
     */
    star_kin: {
        type: 'cthulhu',
        id: 'star_kin',
        name: '繁星眷族',
        range: 0,
        desc: '它们的身体像是由流动的星云构成，轮廓在多维度之间不断转换，凡人仅是注视它们，大脑就会因超出理解能力的几何结构而剧烈疼痛。',
        visualPrompt: 'A fractal-based entity made of nebular gas and clusters of stars, non-euclidean geometry, shimmering iridescent surface, void background, cosmic horror, Lovecraftian influence, psychedelic light effects, ethereal and terrifying.',
        speed: 20,
        damage: 16,
        evasion: 26,
        defense: 10,
        intentDistribution: {
            attack: 35,
            defense: 10,
            buff: 25,
            debuff: 20,
            observe: 10,
        },
        lootTable: [
            {
                id: 'astral_geode',
                name: '星辉晶簇',
                desc: '内部封存着一小片仍在缓慢旋转的星光，注视过久会产生坠落感。',
                type: 'material',
                rarity: 'deep',
                dropProbability: 0.16,
            },
        ],
    },

    /**
     * 裂缝捕食者
     * 空间裂隙型敌人，兼具力量与牵引控制倾向。
     */
    dimensional_rift: {
        type: 'cthulhu',
        id: 'dimensional_rift',
        name: '裂缝捕食者',
        range: 4,
        desc: '它不是一个完整的生物，而是现实被撕开的一道口子中伸出的无数黑色触须，正贪婪地将周围的物质向虚无拉扯。',
        visualPrompt: 'A dark dimensional tear in the air, multiple obsidian-black wet tentacles emerging from the rift, distorting the surrounding space, gravity-defying objects, eerie void lighting, extreme cinematic quality, chilling atmosphere.',
        speed: 18,
        damage: 24,
        evasion: 14,
        defense: 10,
        intentDistribution: {
            attack: 55,
            defense: 5,
            buff: 10,
            debuff: 30,
            observe: 0,
        },
        lootTable: [
            {
                id: 'null_membrane',
                name: '虚无薄膜',
                desc: '从裂缝边缘剥落的一层薄膜，光线会在其表面短暂迷失。',
                type: 'material',
                rarity: 'organized',
                dropProbability: 0.35,
            },
        ],
    },

    /**
     * 卫士 MK-1
     * 工业 / 机械哨兵，偏均衡型，常见于废弃设施。
     */
    rusted_sentry: {
        type: 'cthulhu',
        id: 'rusted_sentry',
        name: '卫士 MK-1',
        range: 7,
        desc: '早已失控的自动防御单元，满身锈迹，破碎的镜头里闪烁着疯狂的红光，机械关节在运动时发出令人牙酸的摩擦声。',
        visualPrompt: 'A rusted, bipedal combat robot, scavenged armor plates, exposed sparking wires, broken red optical lens, steam venting from joints, industrial ruin background, gritty cyberpunk texture, high resolution, photorealistic metallic wear.',
        speed: 12,
        damage: 18,
        evasion: 10,
        defense: 16,
        intentDistribution: {
            attack: 45,
            defense: 25,
            buff: 10,
            debuff: 10,
            observe: 10,
        },
        lootTable: [
            {
                id: 'scrap_metal',
                name: '废弃金属',
                desc: '可用于简单制造或维修的金属碎片。',
                type: 'material',
                rarity: 'standard',
                dropProbability: 1.0,
            },
            {
                id: 'battery_cell',
                name: '小型电池',
                desc: '还能提供微弱的电量。',
                type: 'consumable',
                rarity: 'standard',
                effects: [['restore_battery', 15]],
                dropProbability: 0.35,
            },
            {
                id: 'rusted_plating',
                name: '锈蚀护板',
                desc: '从哨兵身上拆下的护板，沉重但还能挡住一些冲击。',
                type: 'armor',
                rarity: 'standard',
                partialReduction: 0.08,
                maxUses: 12,
                dropProbability: 0.18,
            },
        ],
    },

    /**
     * 错误终端
     * 高敏捷电子污染单位，偏 debuff 与系统干扰。
     */
    glitch_drone: {
        type: 'cthulhu',
        id: 'glitch_drone',
        name: '错误终端',
        range: 5,
        desc: '在半空中剧烈抽搐的无人机，它的显示屏不断播放着扭曲的雪花信号，某种电子瘟疫正在侵蚀它的底层协议。',
        visualPrompt: 'A hovering security drone undergoing extreme digital glitching, fragmented components floating in gravity, holographic flickering screen showing human screams, neon sparks, volumetric fog, tech-horror aesthetic, sharp focus.',
        speed: 24,
        damage: 12,
        evasion: 20,
        defense: 5,
        intentDistribution: {
            attack: 25,
            defense: 10,
            buff: 20,
            debuff: 35,
            observe: 10,
        },
        lootTable: [
            {
                id: 'corrupted_firmware_chip',
                name: '损坏固件芯片',
                desc: '芯片表面不断闪过错误代码，偶尔会投射出无人听见的语音片段。',
                type: 'material',
                rarity: 'organized',
                dropProbability: 0.35,
            },
            {
                id: 'neural_sync_patch',
                name: '神经同步贴片',
                desc: '从错误终端维护舱中弹出的校准贴片，可修复神经链接仪的轻微损伤。',
                type: 'consumable',
                rarity: 'organized',
                effects: [['repair_integrity', 10]],
                dropProbability: 0.18,
            },
        ],
    },

    /**
     * 静电畸体
     * 通用认知危害单位，适合在信号异常区域出现。
     */
    static_wretch: {
        type: 'cthulhu',
        id: 'static_wretch',
        name: '静电畸体',
        range: 4,
        desc: '它像是由坏掉的监控画面拼成的人形，每一次移动都伴随着撕裂的白噪声，轮廓在现实与信号之间不断错位。',
        visualPrompt: 'A humanoid figure made of television static and broken surveillance footage, body flickering between frames, distorted limbs leaving afterimages, dark corridor with failing monitors, analog horror, VHS artifacts, cinematic lighting.',
        speed: 16,
        damage: 10,
        evasion: 16,
        defense: 6,
        intentDistribution: {
            attack: 35,
            defense: 10,
            buff: 10,
            debuff: 35,
            observe: 10,
        },
        lootTable: [
            {
                id: 'static_fiber',
                name: '静电纤维',
                desc: '摸起来像金属丝，又像某种仍在轻微震动的神经。',
                type: 'material',
                rarity: 'standard',
                dropProbability: 0.55,
            },
            {
                id: 'damaged_antenna',
                name: '损坏天线',
                desc: '仍能接收到一些不属于这个世界的频段。',
                type: 'material',
                rarity: 'standard',
                dropProbability: 0.25,
            },
        ],
    },

    /**
     * 记忆水蛭
     * 精神寄生型敌人，主要制造理智与认知压力。
     */
    memory_leech: {
        type: 'cthulhu',
        id: 'memory_leech',
        name: '记忆水蛭',
        range: 1,
        desc: '一条半透明的苍白软体生物，会贴着人的太阳穴或 NeuralLink 接口蠕动，以吞食短期记忆为生。',
        visualPrompt: 'A translucent pale leech-like creature with faint human faces shifting beneath its skin, clinging to a cracked neural interface cable, wet reflective surface, dark medical horror, macro detail, unsettling soft lighting.',
        speed: 14,
        damage: 6,
        evasion: 12,
        defense: 4,
        intentDistribution: {
            attack: 20,
            defense: 10,
            buff: 15,
            debuff: 45,
            observe: 10,
        },
        lootTable: [
            {
                id: 'mnemonic_droplet',
                name: '记忆液滴',
                desc: '一滴凝固的淡蓝色液体，里面似乎封存着某个人临终前的半句话。',
                type: 'material',
                rarity: 'organized',
                dropProbability: 0.45,
            },
        ],
    },

    /**
     * 阈限潜行者
     * 高速近战猎手，常出现在走廊、楼梯间等过渡空间。
     */
    liminal_stalker: {
        type: 'cthulhu',
        id: 'liminal_stalker',
        name: '阈限潜行者',
        range: 1,
        desc: '它只在空间的死角里移动，当你意识到走廊尽头多出一扇门时，它通常已经站在你身后。',
        visualPrompt: 'A tall, faceless humanoid predator with elongated limbs, standing at the end of an empty liminal hallway, flickering fluorescent lights, wet footprints appearing by themselves, subtle motion blur, psychological horror, photorealistic.',
        speed: 28,
        damage: 18,
        evasion: 22,
        defense: 6,
        intentDistribution: {
            attack: 65,
            defense: 5,
            buff: 10,
            debuff: 10,
            observe: 10,
        },
        lootTable: [
            {
                id: 'threshold_dust',
                name: '阈限尘埃',
                desc: '从不存在于任何房间角落的灰尘，装在瓶中时仍会自行排列成门缝形状。',
                type: 'material',
                rarity: 'organized',
                dropProbability: 0.4,
            },
        ],
    },

    /**
     * 猩红教徒
     * 阿斯克勒庇俄斯计划残党，可能出现在医院与掩体相关区域。
     */
    crimson_cultist: {
        type: 'cthulhu',
        id: 'crimson_cultist',
        name: '猩红教徒',
        range: 1,
        zoneId: ['hospital', 'bunker'],
        desc: '「阿斯克勒庇俄斯计划」早期的狂热追随者。他们戴着防毒面具，穿着沾满暗红色干涸血迹的破旧实验服，手中紧紧握着粗糙的献祭短刀。',
        visualPrompt: 'A deranged human cultist wearing a cracked gas mask and a torn, blood-stained white lab coat. Holding a crude rusty dagger. Standing in a dark, abandoned laboratory with ritualistic symbols painted in blood on the walls. Gritty, survival horror, high contrast lighting.',
        speed: 18,
        damage: 14,
        evasion: 14,
        defense: 8,
        intentDistribution: {
            attack: 45,
            defense: 10,
            buff: 25,
            debuff: 10,
            observe: 10,
        },
        lootTable: [
            {
                id: 'rusty_dagger',
                name: '生锈的短刀',
                desc: '教徒用来献祭的武器。',
                type: 'weapon',
                rarity: 'standard',
                weaponType: 'prick',
                weaponDamageType: 'cold',
                range: 1,
                damage: 3,
                maxUses: 15,
                dropProbability: 0.3,
            },
            {
                id: 'cult_manifesto_page',
                name: '教派宣言残页',
                desc: '写满了疯狂呓语的纸张。',
                type: 'data',
                rarity: 'standard',
                documentContent: '真理隐藏在血与肉的交融中...',
                dropProbability: 0.5,
            },
            {
                id: 'crimson_amulet',
                name: '猩红护符',
                desc: '用骨粉与干血压成的护符。佩戴者会更接近"计划"，也更难保持清醒。',
                type: 'accessory',
                rarity: 'forbidden',
                effects: [
                    ['spiritual', 3],
                    ['maxSanity', -8],
                ],
                dropProbability: 0.05,
            },
        ],
    },

    /**
     * 清理人特工
     * 基金会投放到地表的神经改造特工，提供神经链接仪维护资源与早期枪械威胁。
     */
    cleaner_operative: {
        type: 'cthulhu',
        id: 'cleaner_operative',
        name: '清理人特工',
        range: 8,
        desc: '深渊基金会投放到地表的神经改造特工。他们的动作精确得不像人类，护目镜后的眼睛始终蒙着一层数据噪点。他们不是来救援的。',
        visualPrompt: 'A lean special operative in a torn black tactical suit, neural cables emerging from the skull into a cracked visor, red HUD fragments flickering over the face, holding a compact suppressed SMG, foggy ruined street, cyber-horror, cinematic lighting, photorealistic.',
        speed: 26,
        damage: 20,
        evasion: 20,
        defense: 12,
        intentDistribution: {
            attack: 55,
            defense: 20,
            buff: 10,
            debuff: 10,
            observe: 5,
        },
        lootTable: [
            {
                id: 'cleaner_smg',
                name: '清理人冲锋枪',
                desc: '基金会制式冲锋枪，枪身印有被刮除的编号。',
                type: 'weapon',
                rarity: 'foundation',
                weaponType: 'smg',
                weaponDamageType: 'hot',
                range: 8,
                damage: 11,
                maxUses: 12,
                dropProbability: 0.15,
            },
            {
                id: 'neural_battery_pack',
                name: '神经电池组',
                desc: '从清理人脊椎接口拆下的备用电池，仍带着体温。',
                type: 'consumable',
                rarity: 'foundation',
                effects: [['restore_battery', 30]],
                dropProbability: 0.35,
            },
            {
                id: 'micro_electrode_patch',
                name: '微电极贴片',
                desc: '一次性神经校准贴片，能修复链接仪的微小损伤。',
                type: 'consumable',
                rarity: 'foundation',
                effects: [['repair_integrity', 12]],
                dropProbability: 0.25,
            },
            {
                id: 'cleaner_visor',
                name: '清理人护目镜',
                desc: '它能让你看见更安全的世界，代价是你再也无法确定什么是真的。',
                type: 'accessory',
                rarity: 'prototype',
                effects: [
                    ['perception', 3],
                    ['maxSanity', -10],
                ],
                dropProbability: 0.05,
            },
        ],
    },

    /**
     * 融合聚合体
     * 融合现象的通用具象化敌人，体现有机与无机边界崩塌。
     */
    confluence_amalgam: {
        type: 'cthulhu',
        id: 'confluence_amalgam',
        name: '融合聚合体',
        range: 2,
        desc: '有机与无机界限崩塌后的活体证据。金属、骨骼、电缆和皮肤共享同一套循环系统，它每一次蠕动都发出类似咀嚼与焊接同时进行的声音。',
        visualPrompt: 'A massive amalgamation of human limbs, rusted metal plates, medical tubing and exposed gears, all fused into a crawling torso, shared circulatory system glowing under translucent skin, body horror, industrial organic fusion, dark corridor, cinematic volumetric light.',
        speed: 8,
        damage: 30,
        evasion: 5,
        defense: 20,
        intentDistribution: {
            attack: 55,
            defense: 20,
            buff: 15,
            debuff: 10,
            observe: 0,
        },
        lootTable: [
            {
                id: 'amalgam_tissue',
                name: '融合组织',
                desc: '一块仍在轻微搏动的金属肌肉，切面会渗出机油与血清。',
                type: 'material',
                rarity: 'organized',
                dropProbability: 0.65,
            },
            {
                id: 'confluent_flesh_plate',
                name: '融合血肉护板',
                desc: '从聚合体身上剥离的护甲，内侧还长着类似牙龈的软组织。',
                type: 'armor',
                rarity: 'abyssal',
                partialReduction: 0.18,
                maxUses: 24,
                dropProbability: 0.1,
            },
            {
                id: 'fused_spine_brace',
                name: '融合脊椎支架',
                desc: '佩戴时会与脊柱轻微接驳，增强力量，但会持续侵蚀理智。',
                type: 'accessory',
                rarity: 'abyssal',
                effects: [
                    ['strength', 3],
                    ['maxSanity', -12],
                ],
                dropProbability: 0.05,
            },
        ],
    },

    // =====================================================================
    // 圣伊丽莎白纪念医院
    // =====================================================================

    /**
     * 感染病患
     * 医院基础近战敌人，低速但具有持续压迫感。
     */
    infected_patient: {
        type: 'cthulhu',
        id: 'infected_patient',
        name: '感染病患',
        range: 2,
        zoneId: ['hospital'],
        desc: '它的病号服已经被黑色的粘液浸透，双眼翻白，颈部肿胀。它拖着一根生锈的输液架作为武器，迈着不协调的步伐向你逼近。',
        visualPrompt: 'A horrifying hospital patient in a dirty, blood-stained gown, walking with an unnatural twitch, holding a rusted IV pole as a weapon, pale skin with black veins, dark hospital corridor, cinematic lighting.',
        speed: 10,
        damage: 12,
        evasion: 6,
        defense: 5,
        intentDistribution: {
            attack: 60,
            defense: 5,
            buff: 5,
            debuff: 20,
            observe: 10,
        },
        lootTable: [
            {
                id: 'dirty_bandage',
                name: '脏污的绷带',
                desc: '勉强能用来包扎，但有感染的风险。',
                type: 'consumable',
                rarity: 'standard',
                effects: [['heal_hp', 15]],
                dropProbability: 0.4,
            },
        ],
    },

    /**
     * 扭曲的外科医生
     * 医院精英型近战敌人，高属性与高攻击意图。
     */
    twisted_surgeon: {
        type: 'cthulhu',
        id: 'twisted_surgeon',
        name: '扭曲的外科医生',
        range: 1,
        zoneId: ['hospital'],
        desc: '曾经是救死扶伤的医生，现在它的双手已经被一堆生锈的手术刀和骨锯取代，与血肉完全融合。它看待你的眼神，就像看待一具新鲜的解剖素材。',
        visualPrompt: 'A mutated tall surgeon wearing a blood-drenched apron, hands fused with rusty scalpels and bone saws, wearing a cracked medical mask, eyes gleaming with madness, surgical theater background, body horror, high detail.',
        speed: 24,
        damage: 28,
        evasion: 18,
        defense: 10,
        intentDistribution: {
            attack: 55,
            defense: 10,
            buff: 10,
            debuff: 25,
            observe: 0,
        },
        lootTable: [
            {
                id: 'rusty_scalpel',
                name: '生锈的手术刀',
                desc: '残留着黑色血迹的手术刀。',
                type: 'weapon',
                rarity: 'standard',
                weaponType: 'prick',
                weaponDamageType: 'cold',
                range: 1,
                damage: 5,
                maxUses: 15,
                dropProbability: 0.45,
            },
            {
                id: 'surgical_thrower',
                name: '手术飞刀',
                desc: '一组被医生用来远程切断血管与绳索的手术刀，刀柄缠着发黑的胶带。',
                type: 'weapon',
                rarity: 'standard',
                weaponType: 'throw',
                weaponDamageType: 'cold',
                range: 3,
                damage: 6,
                maxUses: 8,
                dropProbability: 0.18,
            },
            {
                id: 'surgical_mask_fragment',
                name: '外科口罩残片',
                desc: '口罩内侧写着一个被划掉的名字，血迹已经发黑。',
                type: 'material',
                rarity: 'standard',
                dropProbability: 0.4,
            },
        ],
    },

    /**
     * 拟态病床
     * 埋伏型高力量敌人，伪装成病房设施。
     */
    living_bed: {
        type: 'cthulhu',
        id: 'living_bed',
        name: '拟态病床',
        range: 1,
        zoneId: ['hospital'],
        desc: '看似一张普通的铁架病床，但被血污覆盖的床单下隐藏着由肌肉和层层尖牙构成的深渊。它静静地潜伏在病房里，等待疲惫的猎物主动躺下。',
        visualPrompt: 'A rusted hospital bed, the mattress tearing open to reveal a giant maw of jagged teeth and fleshy tongue, rusty metal frame with organic fleshy growths, dark abandoned hospital room, mimic monster, horror.',
        speed: 6,
        damage: 28,
        evasion: 4,
        defense: 16,
        intentDistribution: {
            attack: 60,
            defense: 15,
            buff: 5,
            debuff: 10,
            observe: 10,
        },
        lootTable: [
            {
                id: 'bedframe_scrap',
                name: '病床架残片',
                desc: '扭曲的金属床架碎片，边缘还粘着类似牙龈的软组织。',
                type: 'material',
                rarity: 'standard',
                dropProbability: 0.55,
            },
        ],
    },

    /**
     * 病房护工
     * 医院防御型敌人，装备简易钝器与护甲。
     */
    ward_orderly: {
        type: 'cthulhu',
        id: 'ward_orderly',
        name: '病房护工',
        range: 1,
        zoneId: ['hospital'],
        desc: '它曾经负责搬运病人、约束狂躁患者与封锁病房。现在它仍然执行这些职责，只是不再区分活人与尸体。',
        visualPrompt: 'A hulking hospital orderly in a torn white uniform, face hidden behind a cracked plastic face shield, wielding a metal restraint baton, bloodstained rubber gloves, dark abandoned ward, harsh fluorescent lighting, survival horror.',
        speed: 14,
        damage: 20,
        evasion: 8,
        defense: 14,
        intentDistribution: {
            attack: 50,
            defense: 25,
            buff: 10,
            debuff: 10,
            observe: 5,
        },
        lootTable: [
            {
                id: 'orderly_baton',
                name: '护工约束棍',
                desc: '原本用于制服病人的电击棍，现在只能靠残余电流和重量伤人。',
                type: 'weapon',
                rarity: 'standard',
                weaponType: 'wave',
                weaponDamageType: 'cold',
                range: 1,
                damage: 7,
                maxUses: 18,
                dropProbability: 0.3,
            },
            {
                id: 'sterile_gauze',
                name: '无菌纱布',
                desc: '包装仍然完整，是医院里少数还能让人安心的东西。',
                type: 'consumable',
                rarity: 'standard',
                effects: [['heal_hp', 12]],
                dropProbability: 0.5,
            },
            {
                id: 'makeshift_riot_vest',
                name: '简易防暴背心',
                desc: '用病房门板和胶带拼成的护甲，难看但确实能挡下一些攻击。',
                type: 'armor',
                rarity: 'standard',
                partialReduction: 0.1,
                maxUses: 20,
                dropProbability: 0.12,
            },
        ],
    },

    /**
     * 输液架幽魂
     * 医院精神干扰型敌人，围绕输液装置与药物残留形成。
     */
    iv_drip_wraith: {
        type: 'cthulhu',
        id: 'iv_drip_wraith',
        name: '输液架幽魂',
        range: 2,
        zoneId: ['hospital'],
        desc: '它拖着输液架在走廊里滑行，透明药袋中装着不属于任何药典的黑色液体。每当滴管落下，周围人的神经都会跟着抽搐。',
        visualPrompt: 'A spectral hospital entity fused with an IV drip stand, translucent black fluid dripping from plastic bags, ghostly limbs emerging from medical tubing, dark hospital corridor, green fluorescent glow, analog horror, volumetric fog.',
        speed: 18,
        damage: 12,
        evasion: 16,
        defense: 5,
        intentDistribution: {
            attack: 30,
            defense: 10,
            buff: 15,
            debuff: 35,
            observe: 10,
        },
        lootTable: [
            {
                id: 'contaminated_saline',
                name: '受污染生理盐水',
                desc: '液体略微发光，喝下去可能有用，也可能让你听见点滴声整晚不停。',
                type: 'consumable',
                rarity: 'standard',
                effects: [
                    ['heal_hp', 18],
                    ['heal_sanity', 2],
                ],
                dropProbability: 0.45,
            },
            {
                id: 'iv_catheter',
                name: '输液导管',
                desc: '柔软、冰冷，似乎仍然在轻微抽动。',
                type: 'material',
                rarity: 'standard',
                dropProbability: 0.45,
            },
        ],
    },

    /**
     * 药车拟态体
     * 医院资源型拟态敌人，击败后可获得较稳定医疗物资。
     */
    medicine_cart_mimic: {
        type: 'cthulhu',
        id: 'medicine_cart_mimic',
        name: '药车拟态体',
        range: 1,
        zoneId: ['hospital'],
        desc: '一辆停在病房门口的不锈钢药车，抽屉会像牙齿一样开合。它故意把最干净的药品摆在最显眼的位置。',
        visualPrompt: 'A stainless steel hospital medicine cart with drawers opening like jaws, fleshy membranes between metal shelves, pill bottles arranged like teeth, dark hospital room, mimic creature, body horror, cinematic lighting.',
        speed: 8,
        damage: 22,
        evasion: 6,
        defense: 14,
        intentDistribution: {
            attack: 60,
            defense: 20,
            buff: 0,
            debuff: 10,
            observe: 10,
        },
        lootTable: [
            {
                id: 'sealed_antibiotics',
                name: '密封抗生素',
                desc: '标签仍然清晰，是废土中难得的可靠药物。',
                type: 'consumable',
                rarity: 'organized',
                effects: [
                    ['heal_hp', 25],
                    ['heal_sanity', 5],
                ],
                dropProbability: 0.4,
            },
            {
                id: 'adrenaline_shot',
                name: '肾上腺素注射器',
                desc: '针头还带着保护帽。使用后会短暂提升力量、体力与精力。',
                type: 'consumable',
                rarity: 'organized',
                effects: [
                    ['heal_stamina', 25],
                    ['heal_vigor', 10],
                    ['strength', 2, 3],
                ],
                dropProbability: 0.18,
            },
            {
                id: 'pharmacy_scrap',
                name: '药车残片',
                desc: '带有咬痕的不锈钢碎片，缝隙里卡着碎玻璃与未知药粉。',
                type: 'material',
                rarity: 'standard',
                dropProbability: 0.6,
            },
        ],
    },

    /**
     * 手术聚合体
     * 医院区域通用首领，体现阿斯克勒庇俄斯计划造成的外科融合灾难。
     */
    surgical_amalgam: {
        type: 'cthulhu',
        id: 'surgical_amalgam',
        name: '手术聚合体',
        range: 3,
        zoneId: ['hospital'],
        desc: '阿斯克勒庇俄斯计划失败手术的集合体。多具躯干被手术灯、骨科支架和输液管缝合成一个直立行走的"治疗单位"，它仍试图给所有活物进行不必要的改造。',
        visualPrompt: 'A towering hospital abomination made of multiple torsos fused with surgical lamps, orthopedic frames and IV tubes, bone saws protruding from fused arms, bloody operating theater, harsh surgical lights, body horror, cinematic.',
        speed: 12,
        damage: 40,
        evasion: 8,
        defense: 24,
        intentDistribution: {
            attack: 50,
            defense: 20,
            buff: 15,
            debuff: 15,
            observe: 0,
        },
        lootTable: [
            {
                id: 'bone_saw_cleaver',
                name: '骨锯斩刀',
                desc: '由多把骨科锯拼接而成的重型武器，启动时会发出令人牙酸的嗡鸣。',
                type: 'weapon',
                rarity: 'organized',
                weaponType: 'both_wave',
                weaponDamageType: 'cold',
                range: 1,
                damage: 12,
                maxUses: 14,
                dropProbability: 0.14,
            },
            {
                id: 'surgical_fusion_vest',
                name: '外科融合甲',
                desc: '用手术托盘和肋骨支架焊成的护甲，内侧还残留着约束带。',
                type: 'armor',
                rarity: 'organized',
                partialReduction: 0.17,
                maxUses: 26,
                dropProbability: 0.12,
            },
            {
                id: 'asclepius_sample',
                name: '阿斯克勒庇俄斯样本',
                desc: '一支被黑色血丝缠绕的注射样本，标签上写着"进化阶段：未完成"。',
                type: 'material',
                rarity: 'foundation',
                dropProbability: 0.16,
            },
        ],
    },

    // =====================================================================
    // 铁锈前哨
    // =====================================================================

    /**
     * 变异士兵
     * 掩体基础精英敌人，兼具力量与装备残留。
     */
    mutated_soldier: {
        type: 'cthulhu',
        id: 'mutated_soldier',
        name: '变异士兵',
        range: 2,
        zoneId: ['bunker'],
        desc: '身上还穿着残破的战术背心，但肉体已经与防弹插板诡异地融合。它的防毒面具下不断传出沉重的、非人类的喘息声，握着军刺的手臂肌肉异常膨胀。',
        visualPrompt: 'A grotesque mutated military soldier, flesh fused with tactical gear and Kevlar plates, glowing green eyes behind a cracked gas mask, wielding a heavy rusted combat knife, dark bunker environment, gritty, survival horror.',
        speed: 20,
        damage: 26,
        evasion: 14,
        defense: 14,
        intentDistribution: {
            attack: 60,
            defense: 15,
            buff: 15,
            debuff: 0,
            observe: 10,
        },
        lootTable: [
            {
                id: 'dog_tags',
                name: '军牌',
                desc: '沾染血迹的身份铭牌。',
                type: 'material',
                rarity: 'standard',
                dropProbability: 0.3,
            },
            {
                id: 'combat_knife',
                name: '战斗匕首',
                desc: '标准军用匕首，刀刃依然锋利。',
                type: 'weapon',
                rarity: 'standard',
                weaponType: 'prick',
                weaponDamageType: 'cold',
                range: 1,
                damage: 6,
                maxUses: 10,
                dropProbability: 0.18,
            },
            {
                id: 'military_stimulant',
                name: '军用兴奋剂',
                desc: '铁锈前哨配发的战斗药剂，标签上写着"仅在撤离失败时使用"。',
                type: 'consumable',
                rarity: 'organized',
                effects: [
                    ['heal_vigor', 20],
                    ['heal_stamina', 10],
                ],
                dropProbability: 0.22,
            },
            {
                id: 'kevlar_insert',
                name: '凯夫拉插板',
                desc: '从变异士兵胸口硬拆下来的防弹插板，边缘还连着组织。',
                type: 'armor',
                rarity: 'organized',
                partialReduction: 0.15,
                maxUses: 25,
                dropProbability: 0.1,
            },
        ],
    },

    /**
     * 防化服畸变体
     * 生化污染型敌人，以毒雾与减益为主。
     */
    hazmat_horror: {
        type: 'cthulhu',
        id: 'hazmat_horror',
        name: '防化服畸变体',
        range: 3,
        zoneId: ['bunker'],
        desc: '臃肿的黄色防化服内部充满了某种剧毒气体，头盔的玻璃已经破碎，里面没有人类的面孔，只有一团翻滚的、发出凄厉惨叫的绿色发光雾气。',
        visualPrompt: 'A bloated yellow hazmat suit, helmet glass shattered revealing glowing green toxic mist instead of a face, suit leaking bioluminescent fluid, industrial bunker setting, volumetric fog.',
        speed: 12,
        damage: 16,
        evasion: 8,
        defense: 10,
        intentDistribution: {
            attack: 25,
            defense: 10,
            buff: 10,
            debuff: 45,
            observe: 10,
        },
        lootTable: [
            {
                id: 'chem_residue',
                name: '化学残渣',
                desc: '装在破裂样本瓶里的绿色残渣，仍在缓慢冒泡。',
                type: 'material',
                rarity: 'organized',
                dropProbability: 0.45,
            },
            {
                id: 'cracked_visor',
                name: '破裂面罩',
                desc: '防化服头盔的碎片，内侧有抓痕，像是从里面被撕开的。',
                type: 'material',
                rarity: 'standard',
                dropProbability: 0.35,
            },
        ],
    },

    /**
     * 自动炮塔
     * 掩体固定火力单位，不可移动，高攻击与高防御。
     * 意图逻辑由引擎硬编码：范围内无目标 → observe，有目标 → attack。
     */
    automated_turret: {
        type: 'immovable',
        id: 'automated_turret',
        name: '自动炮塔',
        range: 10,
        zoneId: ['bunker'],
        desc: '从天花板垂落的老旧防御炮塔，识别模块早已损坏，却仍然忠实地向一切移动物体倾泻火力。',
        visualPrompt: 'A ceiling-mounted automated defense turret in a rusted military bunker, rotating red sensor eye, exposed ammunition belt, sparking servos, concrete dust, industrial military horror, cinematic lighting.',
        speed: 6,
        damage: 22,
        defense: 18,
        lootTable: [
            {
                id: 'turret_servo',
                name: '炮塔伺服电机',
                desc: '仍然可以运转的精密电机，拆解得当的话能用于修复设备。',
                type: 'material',
                rarity: 'organized',
                dropProbability: 0.5,
            },
            {
                id: 'turret_capacitor',
                name: '炮塔电容',
                desc: '从自动炮塔供弹系统中拆下的电容，可为神经链接仪应急充电。',
                type: 'consumable',
                rarity: 'organized',
                effects: [['restore_battery', 25]],
                dropProbability: 0.2,
            },
            {
                id: 'makeshift_pistol',
                name: '拼装手枪',
                desc: '用炮塔供弹机构改装的粗糙手枪，威力尚可，但随时可能卡壳。',
                type: 'weapon',
                rarity: 'organized',
                weaponType: 'pistol',
                weaponDamageType: 'hot',
                range: 4,
                damage: 8,
                maxUses: 6,
                dropProbability: 0.12,
            },
            {
                id: 'turret_scrap',
                name: '炮塔残骸',
                desc: '烧焦的金属外壳与断裂枪管，仍有一定回收价值。',
                type: 'material',
                rarity: 'standard',
                dropProbability: 0.7,
            },
        ],
    },

    /**
     * 化学喷吐者
     * 掩体生化远程 / 减益单位。
     */
    chem_spitter: {
        type: 'cthulhu',
        id: 'chem_spitter',
        name: '化学喷吐者',
        range: 4,
        zoneId: ['bunker'],
        desc: '它的胸腔被改造成一个鼓胀的生化囊，喉咙里不断翻滚着酸性泡沫。每次攻击前，空气中都会响起类似排水管堵塞的咕噜声。',
        visualPrompt: 'A mutated humanoid with a bloated translucent chemical sac fused into its chest, acid foam dripping from its mouth, standing in a flooded bunker laboratory, green toxic glow, industrial body horror, volumetric fog.',
        speed: 14,
        damage: 16,
        evasion: 10,
        defense: 8,
        intentDistribution: {
            attack: 45,
            defense: 10,
            buff: 5,
            debuff: 35,
            observe: 5,
        },
        lootTable: [
            {
                id: 'corrosive_canister',
                name: '腐蚀罐',
                desc: '从喷吐者体内取出的密封囊罐，摇晃时会发出金属被溶解的声音。',
                type: 'material',
                rarity: 'organized',
                dropProbability: 0.5,
            },
            {
                id: 'residue_vial',
                name: '残留样本瓶',
                desc: '军方实验遗留的小型样本瓶，标签已经被腐蚀得无法辨认。',
                type: 'material',
                rarity: 'standard',
                dropProbability: 0.4,
            },
        ],
    },

    /**
     * 深冻亡骸
     * 深层掩体低温单位，兼具物理威胁与环境压力。
     */
    deep_freeze_revenant: {
        type: 'cthulhu',
        id: 'deep_freeze_revenant',
        name: '深冻亡骸',
        range: 2,
        zoneId: ['bunker'],
        desc: '它从低温冻存舱中爬出，皮肤覆盖着黑蓝色冰晶，关节在移动时发出玻璃碎裂般的脆响。它周围的空气会迅速凝结成霜。',
        visualPrompt: 'A frozen reanimated corpse emerging from a cracked cryogenic pod, black-blue frost covering its skin, torn military uniform, glowing pale eyes, cold vapor pouring from its mouth, dark bunker freezer, survival horror.',
        speed: 10,
        damage: 22,
        evasion: 6,
        defense: 12,
        intentDistribution: {
            attack: 50,
            defense: 20,
            buff: 10,
            debuff: 15,
            observe: 5,
        },
        lootTable: [
            {
                id: 'cryo_cell',
                name: '低温电池',
                desc: '从冻存系统中拆下的能量核心，表面覆盖着无法融化的白霜。',
                type: 'material',
                rarity: 'organized',
                dropProbability: 0.45,
            },
            {
                id: 'frostbitten_ration',
                name: '冻伤口粮',
                desc: '硬得像砖头的军用口粮，加热后也许还能吃。',
                type: 'consumable',
                rarity: 'standard',
                effects: [
                    ['heal_hp', 12],
                    ['heal_stamina', 8],
                ],
                dropProbability: 0.4,
            },
        ],
    },

    /**
     * 铁壁守望者
     * 铁锈前哨区域通用首领，重型镇暴单位。
     */
    iron_warden: {
        type: 'cthulhu',
        id: 'iron_warden',
        name: '铁壁守望者',
        range: 11,
        zoneId: ['bunker'],
        desc: '铁壁计划留下的重型镇暴单位。它的装甲板下嵌着被强制保留的人类神经束，因此它既会执行命令，也会在开火前发出类似祈祷的低鸣。',
        visualPrompt: 'A heavy military enforcement unit in layered rusted power armor, shoulder-mounted rotary cannon, exposed neural cables sealed in resin, red optical slit, bunker corridor with sparks and steam, industrial military horror, cinematic lighting.',
        speed: 12,
        damage: 42,
        evasion: 6,
        defense: 28,
        intentDistribution: {
            attack: 50,
            defense: 30,
            buff: 10,
            debuff: 5,
            observe: 5,
        },
        lootTable: [
            {
                id: 'rotary_rifle',
                name: '转管步枪',
                desc: '从守望者武器臂拆下的转管步枪，沉重但火力凶猛。',
                type: 'weapon',
                rarity: 'foundation',
                weaponType: 'assault_rifle',
                weaponDamageType: 'hot',
                range: 10,
                damage: 13,
                maxUses: 10,
                dropProbability: 0.14,
            },
            {
                id: 'heavy_bunker_plate',
                name: '重型掩体护板',
                desc: '厚重得几乎像一扇门，能挡住大多数直射火力。',
                type: 'armor',
                rarity: 'foundation',
                partialReduction: 0.22,
                maxUses: 30,
                dropProbability: 0.12,
            },
            {
                id: 'warden_core',
                name: '守望者核心',
                desc: '一颗被树脂封存的神经机械核心，偶尔会发出微弱的心跳声。',
                type: 'material',
                rarity: 'prototype',
                dropProbability: 0.16,
            },
        ],
    },

    // =====================================================================
    // 烛火书斋
    // =====================================================================

    /**
     * 墨水元素
     * 书斋基础认知危害单位，偏记忆侵蚀与减益。
     */
    ink_elemental: {
        type: 'cthulhu',
        id: 'ink_elemental',
        name: '墨水元素',
        range: 3,
        zoneId: ['archive'],
        desc: '由古老的黑色墨水汇聚而成的流体生物，表面不断浮现出各种扭曲的文字和禁忌的符号。它的每一次攻击都会试图改写、抹除你的记忆。',
        visualPrompt: 'A fluid, shifting elemental creature made entirely of black ink, ancient arcane symbols floating on its surface, reaching out with tendrils of dark liquid, grand library background, floating candles.',
        speed: 22,
        damage: 12,
        evasion: 20,
        defense: 5,
        intentDistribution: {
            attack: 30,
            defense: 10,
            buff: 20,
            debuff: 30,
            observe: 10,
        },
        lootTable: [
            {
                id: 'living_ink',
                name: '活体墨水',
                desc: '在瓶中不断蠕动，似乎有自己的意识。',
                type: 'material',
                rarity: 'deep',
                dropProbability: 0.3,
            },
        ],
    },

    /**
     * 盲眼学者
     * 书斋高智慧施法型敌人，擅长增益与精神压制。
     */
    blind_scholar: {
        type: 'cthulhu',
        id: 'blind_scholar',
        name: '盲眼学者',
        range: 4,
        zoneId: ['archive'],
        desc: '它为了获取禁忌的知识而挖去了自己的双眼。现在，它通过悬浮在周围的书页来感知世界，那些浸染过诅咒的书页如同锋利的刀刃般围绕着它旋转。',
        visualPrompt: 'An emaciated scholar in tattered robes, empty bleeding eye sockets, surrounded by a swirling vortex of razor-sharp glowing book pages, holding a staff made of twisted spines, dark academia horror.',
        speed: 20,
        damage: 12,
        evasion: 18,
        defense: 6,
        intentDistribution: {
            attack: 35,
            defense: 10,
            buff: 35,
            debuff: 10,
            observe: 10,
        },
        lootTable: [
            {
                id: 'scholar_note',
                name: '学者手记',
                desc: '夹在书中的便签。',
                type: 'data',
                rarity: 'standard',
                documentContent: '不要去读第三排第四本那本红皮书。里面的符号在看着我们。',
                dropProbability: 0.4,
            },
            {
                id: 'librarian_robe',
                name: '馆员长袍',
                desc: '厚重、陈旧，却能在一定程度上隔绝低语与纸页割伤。',
                type: 'armor',
                rarity: 'organized',
                partialReduction: 0.06,
                maxUses: 18,
                dropProbability: 0.1,
            },
        ],
    },

    /**
     * 拟态肉瘤
     * 书斋 / 储藏区拟态敌人，伪装成补给容器。
     */
    biomass_mimic: {
        type: 'cthulhu',
        id: 'biomass_mimic',
        name: '拟态肉瘤',
        range: 1,
        zoneId: ['archive'],
        desc: '伪装成普通补给箱的活性生物组织。当你靠近试图搜刮时，它的金属伪装会瞬间溶解，露出密密麻麻的尖牙和带有倒刺的触须。',
        visualPrompt: 'A rusted metal supply crate splitting open horizontally to reveal a terrifying maw of jagged teeth and fleshy, wet pink tentacles. Body horror, mimic monster, dark metallic environment, slimy textures, cinematic lighting.',
        speed: 22,
        damage: 24,
        evasion: 12,
        defense: 10,
        intentDistribution: {
            attack: 65,
            defense: 10,
            buff: 0,
            debuff: 15,
            observe: 10,
        },
        lootTable: [
            {
                id: 'biomass_sample',
                name: '活性生物样本',
                desc: '还在不断蠕动的恶心肉块。',
                type: 'material',
                rarity: 'organized',
                dropProbability: 0.7,
            },
            {
                id: 'hidden_supplies',
                name: '未被消化的口粮',
                desc: '从拟态肉瘤胃里找到的密封口粮。',
                type: 'consumable',
                rarity: 'standard',
                effects: [['heal_hp', 20]],
                dropProbability: 0.45,
            },
        ],
    },

    /**
     * 纸群
     * 书斋高速群体型敌人，以切割与干扰为主。
     */
    paper_swarm: {
        type: 'cthulhu',
        id: 'paper_swarm',
        name: '纸群',
        range: 3,
        zoneId: ['archive'],
        desc: '成百上千张书页像鸟群一样在走廊中盘旋，每一页边缘都锋利如刀。它们会抄写你的恐惧，再把副本塞进你的脑子里。',
        visualPrompt: 'A swirling swarm of ancient book pages flying like predatory birds through a candlelit library corridor, paper edges glowing faintly, ink forming screaming faces, dark academia horror, cinematic motion blur.',
        speed: 26,
        damage: 8,
        evasion: 22,
        defense: 3,
        intentDistribution: {
            attack: 35,
            defense: 5,
            buff: 20,
            debuff: 30,
            observe: 10,
        },
        lootTable: [
            {
                id: 'torn_lexicon_page',
                name: '撕裂辞典页',
                desc: '页面上的词条仍在缓慢改写，仿佛试图定义一个不存在的你。',
                type: 'data',
                rarity: 'standard',
                documentContent: '条目：幸存者。释义：尚未被书斋写完的人。',
                dropProbability: 0.6,
            },
            {
                id: 'razor_page',
                name: '锋页',
                desc: '从纸群中落下的一页，边缘锋利得能割开皮肤与浅层记忆。',
                type: 'weapon',
                rarity: 'standard',
                weaponType: 'throw',
                weaponDamageType: 'cold',
                range: 3,
                damage: 5,
                maxUses: 6,
                dropProbability: 0.22,
            },
            {
                id: 'binding_thread',
                name: '装帧线',
                desc: '从书脊中抽出的坚韧细线，偶尔会像肌腱一样绷紧。',
                type: 'material',
                rarity: 'standard',
                dropProbability: 0.5,
            },
        ],
    },

    /**
     * 烛火亡魂
     * 书斋仪式 / 精神型敌人，围绕禁忌阅读与守夜仪式形成。
     */
    candle_wraith: {
        type: 'cthulhu',
        id: 'candle_wraith',
        name: '烛火亡魂',
        range: 3,
        zoneId: ['archive'],
        desc: '它曾是彻夜抄写禁书的馆员，如今只剩下一具由烛泪与灰烬构成的人形。它经过的地方，蜡烛会自行点燃，文字会开始流血。',
        visualPrompt: 'A ghostly librarian figure made of melted candle wax and ash, holding a black candle with pale flame, floating between library shelves, wax dripping like skin, dark academia occult horror, warm but sinister candlelight.',
        speed: 18,
        damage: 12,
        evasion: 16,
        defense: 5,
        intentDistribution: {
            attack: 25,
            defense: 10,
            buff: 25,
            debuff: 30,
            observe: 10,
        },
        lootTable: [
            {
                id: 'grave_tallow',
                name: '墓脂蜡烛',
                desc: '用不明脂肪制成的蜡烛，燃烧时会发出类似翻书的声音。',
                type: 'material',
                rarity: 'standard',
                dropProbability: 0.5,
            },
            {
                id: 'black_candle_staff',
                name: '黑烛法杖',
                desc: '以墓脂蜡烛封成的法杖，苍白火焰会沿着书写轨迹燃烧。',
                type: 'weapon',
                rarity: 'organized',
                weaponType: 'magic',
                weaponDamageType: 'instant',
                range: 0,
                damage: 8,
                maxUses: 9,
                dropProbability: 0.1,
            },
            {
                id: 'blessed_candle',
                name: '祝圣残烛',
                desc: '少数尚未被污染的烛火，点燃时能让周围的低语短暂退去。',
                type: 'consumable',
                rarity: 'organized',
                effects: [
                    ['heal_sanity', 12],
                    ['spiritual', 1, 2],
                ],
                dropProbability: 0.35,
            },
        ],
    },

    /**
     * 索引吞噬者
     * 书斋高智慧精英单位，负责"整理"并吞食危险知识。
     */
    index_devourer: {
        type: 'cthulhu',
        id: 'index_devourer',
        name: '索引吞噬者',
        range: 2,
        zoneId: ['archive'],
        desc: '它没有固定形态，只有一张由目录卡、书签和牙齿组成的巨大开口。它吞下书名，也吞下读过那些书的人。',
        visualPrompt: 'A monstrous entity formed from library index cards, bookmarks, torn catalog drawers and countless teeth, emerging from a dark archive corridor, paper fragments orbiting its maw, eldritch dark academia horror, cinematic lighting.',
        speed: 16,
        damage: 18,
        evasion: 14,
        defense: 12,
        intentDistribution: {
            attack: 40,
            defense: 15,
            buff: 20,
            debuff: 20,
            observe: 5,
        },
        lootTable: [
            {
                id: 'catalog_core',
                name: '目录核心',
                desc: '一颗由压缩索引卡构成的核心，靠近时会听见无数抽屉同时拉开的声音。',
                type: 'material',
                rarity: 'deep',
                dropProbability: 0.2,
            },
            {
                id: 'devoured_index_fragment',
                name: '被吞噬索引残片',
                desc: '残片上列着一些从未存在过的书名，以及你的借阅记录。',
                type: 'data',
                rarity: 'organized',
                documentContent: '《未出生者的葬礼》——借阅者：你。归还期限：已过。',
                dropProbability: 0.4,
            },
        ],
    },

    /**
     * 未写之馆长
     * 烛火书斋区域通用首领，负责删除不应被记住的人与历史。
     */
    unwritten_curator: {
        type: 'cthulhu',
        id: 'unwritten_curator',
        name: '未写之馆长',
        range: 4,
        zoneId: ['archive'],
        desc: '它曾是书斋的管理者，如今是一组不断翻页的空白人形。它负责删除那些不该被记住的人，以及尚未发生但已被禁止的历史。',
        visualPrompt: 'A tall humanoid made of blank manuscript pages and candle smoke, face erased except for an ink-black seam, floating in a grand library rotunda, pages orbiting like a halo, dark academia horror, mystical candlelight.',
        speed: 24,
        damage: 40,
        evasion: 26,
        defense: 12,
        intentDistribution: {
            attack: 35,
            defense: 15,
            buff: 25,
            debuff: 20,
            observe: 5,
        },
        lootTable: [
            {
                id: 'forbidden_quill',
                name: '禁忌羽毛笔',
                desc: '用它书写时，墨水会从使用者的记忆中抽取代价。',
                type: 'weapon',
                rarity: 'forbidden',
                weaponType: 'magic',
                weaponDamageType: 'instant',
                range: 0,
                damage: 10,
                maxUses: 10,
                dropProbability: 0.12,
            },
            {
                id: 'curators_blank_mask',
                name: '馆长空白面具',
                desc: '戴上后低语会远去，但你自己的脸也会在镜中变得模糊。',
                type: 'accessory',
                rarity: 'forbidden',
                effects: [
                    ['wisdom', 3],
                    ['maxSanity', -10],
                ],
                dropProbability: 0.08,
            },
            {
                id: 'unwritten_page',
                name: '未写之页',
                desc: '一张永远无法被墨水染黑的纸，靠近它时你会忘记自己的名字片刻。',
                type: 'material',
                rarity: 'forbidden',
                dropProbability: 0.18,
            },
        ],
    },
};