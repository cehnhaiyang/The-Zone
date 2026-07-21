import { EnemyTemplate } from '../meta';

/**
 * 基础敌人模板库
 * 包含游戏中的所有常规敌人、特定区域的遭遇怪物，以及区域专属的特殊首领。
 */
export const ENEMY_TEMPLATES: Record<string, EnemyTemplate> = {
  // =====================================================================
  // 通用与虚空异变生物
  // =====================================================================
  shadow_whisperer: {
    id: 'shadow_whisperer',
    name: "哀嚎影卫",
    desc: "这是一团由纯粹黑暗交织而成的轮廓，没有实体，却能发出让人神经衰弱的低声抽泣，仿佛在寻找它失落的名字。",
    visualPrompt: "A blurry, semi-transparent humanoid silhouette made of pulsing dark mist, elongated limbs, featureless hollow face, standing in a flickering dark hallway, volumetric lighting, analog horror aesthetic, low noise, photorealistic, cinematic grain.",
    initialState: {
      attribute: {
        strength: 1,
        agility: 3,
        knowledge: 2,
        perception: 4,
      },
      equipState: {
        weapons: [null, null],
        armors: [null, null, null],
        accessories: [null, null, null, null, null]
      }
    },
    intentDistribution: {
      attack: 40,
      buff: 10,
      debuff: 30,
      observe: 20
    },
    nextIntent: {
      type: 'observe',
      desc: '发出低声抽泣，似乎在观察你。'
    },
    lootTable: [
      {
        id: 'shadow_residue',
        name: '暗影残渣',
        desc: '一团冰冷的黑色粉末，触摸时会吸收你手上的热量。',
        type: 'material',
        rarity: 'common',
        dropProbability: 0.6
      },
      {
        id: 'broken_memory_chip',
        name: '破损的记忆芯片',
        desc: '里面可能还残留着一些生前的数据。',
        type: 'material',
        rarity: 'rare',
        dropProbability: 0.1
      }
    ]
  },

  void_gazer: {
    id: 'void_gazer',
    name: "虚空凝视者",
    desc: "一团漂浮的半透明物质，其核心是一颗巨大的、混浊的眼球，它不仅在观察你的肉体，更在审视你的灵魂。",
    visualPrompt: "A floating mass of ethereal translucent tentacles surrounding a single massive, cataracts-covered bloodshot eye, cosmic horror, dark purple and blue color palette, glowing iris, unsettling atmosphere, hyper-detailed textures, unreal engine 5 render.",
    initialState: {
      attribute: {
        strength: 1,
        agility: 2,
        knowledge: 4,
        perception: 5,
      },
      equipState: {
        weapons: [null, null],
        armors: [null, null, null],
        accessories: [null, null, null, null, null]
      }
    },
    intentDistribution: {
      attack: 30,
      buff: 20,
      debuff: 40,
      observe: 10
    },
    nextIntent: {
      type: 'debuff',
      desc: '混浊的眼球锁定了你的灵魂...',
    }
  },

  flesh_hound: {
    id: 'flesh_hound',
    name: "畸变猎犬",
    desc: "剥落了皮肤的变异生物，新鲜的肌肉组织暴露在空气中，随着沉重的呼吸交替收缩，不断滴落带有腐蚀性的黄色粘液。",
    visualPrompt: "A nightmarish, skinless mutated hound, exposed raw muscle fibers oozing glistening yellow biological fluid, multi-jointed legs, rows of needle-sharp teeth, dark damp environment, body horror, high contrast lighting, photorealistic macro photography.",
    initialState: {
      attribute: {
        strength: 4,
        agility: 4,
        knowledge: 1,
        perception: 2,
      },
      equipState: {
        weapons: [null, null],
        armors: [null, null, null],
        accessories: [null, null, null, null, null]
      }
    },
    intentDistribution: {
      attack: 80,
      buff: 10,
      debuff: 10,
      observe: 0
    },
    nextIntent: {
      type: 'attack',
      desc: '滴落着酸性粘液猛扑而来！',
      value: 4
    },
    lootTable: [
      {
        id: 'acid_gland',
        name: '酸液腺体',
        desc: '不断滴落腐蚀性液体的器官，可以作为危险的材料使用。',
        type: 'material',
        rarity: 'rare',
        dropProbability: 0.5
      },
      {
        id: 'mutated_meat',
        name: '变异生肉',
        desc: '散发着怪味的肉块。在极度饥饿时才能咽下。',
        type: 'consumable',
        rarity: 'common',
        effects: [['heal_hp', 10]],
        dropProbability: 0.8
      }
    ]
  },

  stitched_horror: {
    id: 'stitched_horror',
    name: "缝合巨怪",
    desc: "由多具尸体的残肢强行拼接而成的肉山，粗糙的缝合线处还在渗血，它挥动着变形成镰刀状的巨臂，发出震天的怒吼。",
    visualPrompt: "A massive hulking mound of human flesh stitched together with rusty wire, multiple mismatched limbs, internal organs visible through transparent skin patches, wielding a bone scythe, grotesque lighting, extreme detail, Giger-esque style, cinematic horror.",
    initialState: {
      attribute: {
        strength: 5,
        agility: 1,
        knowledge: 1,
        perception: 2,
      },
      equipState: {
        weapons: [null, null],
        armors: [null, null, null],
        accessories: [null, null, null, null, null]
      }
    },
    intentDistribution: {
      attack: 70,
      buff: 30,
      debuff: 0,
      observe: 0
    },
    nextIntent: {
      type: 'attack',
      desc: '高高举起镰刀状的骨质巨臂！',
      value: 6
    }
  },

  star_kin: {
    id: 'star_kin',
    name: "繁星眷族",
    desc: "它们的身体像是由流动的星云构成，轮廓在多维度之间不断转换，凡人仅是注视它们，大脑就会因超出理解能力的几何结构而剧烈疼痛。",
    visualPrompt: "A fractal-based entity made of nebular gas and clusters of stars, non-euclidean geometry, shimmering iridescent surface, void background, cosmic horror, Lovecraftian influence, psychedelic light effects, ethereal and terrifying.",
    initialState: {
      attribute: {
        strength: 2,
        agility: 3,
        knowledge: 5,
        perception: 4,
      },
      equipState: {
        weapons: [null, null],
        armors: [null, null, null],
        accessories: [null, null, null, null, null]
      }
    },
    intentDistribution: {
      attack: 40,
      buff: 30,
      debuff: 20,
      observe: 10
    },
    nextIntent: {
      type: 'buff',
      desc: '周身的流态星云正在急剧收缩聚集...',
    }
  },

  dimensional_rift: {
    id: 'dimensional_rift',
    name: "裂缝捕食者",
    desc: "它不是一个完整的生物，而是现实被撕开的一道口子中伸出的无数黑色触须，正贪婪地将周围的物质向虚无拉扯。",
    visualPrompt: "A dark dimensional tear in the air, multiple obsidian-black wet tentacles emerging from the rift, distorting the surrounding space, gravity-defying objects, eerie void lighting, extreme cinematic quality, chilling atmosphere.",
    initialState: {
      attribute: {
        strength: 4,
        agility: 2,
        knowledge: 3,
        perception: 3,
      },
      equipState: {
        weapons: [null, null],
        armors: [null, null, null],
        accessories: [null, null, null, null, null]
      }
    },
    intentDistribution: {
      attack: 60,
      buff: 10,
      debuff: 30,
      observe: 0
    },
    nextIntent: {
      type: 'debuff',
      desc: '虚空裂缝产生出极强的扭曲引力。',
    }
  },

  // =====================================================================
  // 机械与科技异变生物
  // =====================================================================
  rusted_sentry: {
    id: 'rusted_sentry',
    name: "卫士 MK-1",
    desc: "早已失控的自动防御单元，满身锈迹，破碎的镜头里闪烁着疯狂的红光，机械关节在运动时发出令人牙酸的摩擦声。",
    visualPrompt: "A rusted, bipedal combat robot, scavenged armor plates, exposed sparking wires, broken red optical lens, steam venting from joints, industrial ruin background, gritty cyberpunk texture, 8k resolution, photorealistic metallic wear.",
    initialState: {
      attribute: {
        strength: 3,
        agility: 2,
        knowledge: 2,
        perception: 3,
      },
      equipState: {
        weapons: [null, null],
        armors: [null, null, null],
        accessories: [null, null, null, null, null]
      }
    },
    intentDistribution: {
      attack: 50,
      buff: 20,
      debuff: 10,
      observe: 20
    },
    nextIntent: {
      type: 'observe',
      desc: '破碎的光学镜头正闪烁着红光锁定你。'
    },
    lootTable: [
      {
        id: 'scrap_metal',
        name: '废弃金属',
        desc: '可用于简单制造或维修的金属碎片。',
        type: 'material',
        rarity: 'common',
        dropProbability: 1.0
      },
      {
        id: 'battery_cell',
        name: '小型电池',
        desc: '还能提供微弱的电量。',
        type: 'consumable',
        rarity: 'common',
        effects: [['restore_battery', 15]],
        dropProbability: 0.3
      }
    ]
  },

  glitch_drone: {
    id: 'glitch_drone',
    name: "错误终端",
    desc: "在半空中剧烈抽搐的无人机，它的显示屏不断播放着扭曲的雪花信号，某种电子瘟疫正在侵蚀它的底层协议。",
    visualPrompt: "A hovering security drone undergoing extreme digital glitching, fragmented components floating in gravity, holographic flickering screen showing human screams, neon sparks, volumetric fog, tech-horror aesthetic, sharp focus.",
    initialState: {
      attribute: {
        strength: 2,
        agility: 5,
        knowledge: 3,
        perception: 2,
      },
      equipState: {
        weapons: [null, null],
        armors: [null, null, null],
        accessories: [null, null, null, null, null]
      }
    },
    intentDistribution: {
      attack: 25,
      buff: 25,
      debuff: 40,
      observe: 10
    },
    nextIntent: {
      type: 'debuff',
      desc: '播发刺耳的高频电子脉冲。',
    }
  },

  // =====================================================================
  // 圣伊丽莎白纪念医院 专属敌人
  // =====================================================================
  infected_patient: {
    id: 'infected_patient',
    name: "感染病患",
    desc: "它的病号服已经被黑色的粘液浸透，双眼翻白，颈部肿胀。它拖着一根生锈的输液架作为武器，迈着不协调的步伐向你逼近。",
    visualPrompt: "A horrifying hospital patient in a dirty, blood-stained gown, walking with an unnatural twitch, holding a rusted IV pole as a weapon, pale skin with black veins, dark hospital corridor, cinematic lighting.",
    gender: 'both',
    zoneId: ['hospital'],
    initialState: {
      attribute: {
        strength: 2,
        agility: 2,
        knowledge: 1,
        perception: 1,
      },
      equipState: {
        weapons: [null, null],
        armors: [null, null, null],
        accessories: [null, null, null, null, null]
      }
    },
    intentDistribution: {
      attack: 60,
      buff: 10,
      debuff: 20,
      observe: 10
    },
    nextIntent: {
      type: 'attack',
      desc: '挥舞生锈的输液架砸向你。',
      value: 3
    },
    lootTable: [
      {
        id: 'dirty_bandage',
        name: '脏污的绷带',
        desc: '勉强能用来包扎，但有感染的风险。',
        type: 'consumable',
        rarity: 'common',
        effects: [['heal_hp', 15]],
        dropProbability: 0.4
      }
    ]
  },

  twisted_surgeon: {
    id: 'twisted_surgeon',
    name: "扭曲的外科医生",
    desc: "曾经是救死扶伤的医生，现在它的双手已经被一堆生锈的手术刀和骨锯取代，与血肉完全融合。它看待你的眼神，就像看待一具新鲜的解剖素材。",
    visualPrompt: "A mutated tall surgeon wearing a blood-drenched apron, hands fused with rusty scalpels and bone saws, wearing a cracked medical mask, eyes gleaming with madness, surgical theater background, body horror, high detail.",
    gender: 'male',
    zoneId: ['hospital'],
    initialState: {
      attribute: {
        strength: 4,
        agility: 4,
        knowledge: 5,
        perception: 3,
      },
      equipState: {
        weapons: [null, null],
        armors: [null, null, null],
        accessories: [null, null, null, null, null]
      }
    },
    intentDistribution: {
      attack: 60,
      buff: 10,
      debuff: 30,
      observe: 0
    },
    nextIntent: {
      type: 'attack',
      desc: '举起与骨肉融合的生锈手术刀发起刺击！',
      value: 5
    },
    lootTable: [
      {
        id: 'rusty_scalpel',
        name: '生锈的手术刀',
        desc: '残留着黑色血迹的手术刀。',
        type: 'weapon',
        rarity: 'common',
        weaponType: 'dagger',
        meleeDamage: 5,
        maxUses: 15,
        dropProbability: 0.5
      }
    ]
  },

  living_bed: {
    id: 'living_bed',
    name: "拟态病床",
    desc: "看似一张普通的铁架病床，但被血污覆盖的床单下隐藏着由肌肉和层层尖牙构成的深渊。它静静地潜伏在病房里，等待疲惫的猎物主动躺下。",
    visualPrompt: "A rusted hospital bed, the mattress tearing open to reveal a giant maw of jagged teeth and fleshy tongue, rusty metal frame with organic fleshy growths, dark abandoned hospital room, mimic monster, horror.",
    zoneId: ['hospital'],
    initialState: {
      attribute: {
        strength: 5,
        agility: 1,
        knowledge: 1,
        perception: 2,
      },
      equipState: {
        weapons: [null, null],
        armors: [null, null, null],
        accessories: [null, null, null, null, null]
      }
    },
    intentDistribution: {
      attack: 70,
      buff: 10,
      debuff: 10,
      observe: 10
    },
    nextIntent: {
      type: 'observe',
      desc: '彻底伪装成冰冷的铁架结构，静静等待着。'
    }
  },

  // =====================================================================
  // 铁锈前哨 专属敌人
  // =====================================================================
  mutated_soldier: {
    id: 'mutated_soldier',
    name: "变异士兵",
    desc: "身上还穿着残破的战术背心，但肉体已经与防弹插板诡异地融合。它的防毒面具下不断传出沉重的、非人类的喘息声，握着军刺的手臂肌肉异常膨胀。",
    visualPrompt: "A grotesque mutated military soldier, flesh fused with tactical gear and Kevlar plates, glowing green eyes behind a cracked gas mask, wielding a heavy rusted combat knife, dark bunker environment, gritty, survival horror.",
    gender: 'male',
    zoneId: ['bunker'],
    initialState: {
      attribute: {
        strength: 5,
        agility: 3,
        knowledge: 2,
        perception: 4,
      },
      equipState: {
        weapons: [null, null],
        armors: [null, null, null],
        accessories: [null, null, null, null, null]
      }
    },
    intentDistribution: {
      attack: 70,
      buff: 20,
      debuff: 0,
      observe: 10
    },
    nextIntent: {
      type: 'buff',
      desc: '向静脉注射了未知的不稳定化合物...',
    },
    lootTable: [
      {
        id: 'dog_tags',
        name: '军牌',
        desc: '沾染血迹的身份铭牌。',
        type: 'material',
        rarity: 'common',
        dropProbability: 0.3
      },
      {
        id: 'combat_knife',
        name: '战斗匕首',
        desc: '标准军用匕首，刀刃依然锋利。',
        type: 'weapon',
        rarity: 'common',
        weaponType: 'dagger',
        meleeDamage: 6,
        maxUses: 10,
        dropProbability: 0.2
      }
    ]
  },

  hazmat_horror: {
    id: 'hazmat_horror',
    name: "防化服畸变体",
    desc: "臃肿的黄色防化服内部充满了某种剧毒气体，头盔的玻璃已经破碎，里面没有人类的面孔，只有一团翻滚的、发出凄厉惨叫的绿色发光雾气。",
    visualPrompt: "A bloated yellow hazmat suit, helmet glass shattered revealing glowing green toxic mist instead of a face, suit leaking bioluminescent fluid, industrial bunker setting, volumetric fog.",
    zoneId: ['bunker'],
    initialState: {
      attribute: {
        strength: 3,
        agility: 2,
        knowledge: 1,
        perception: 2,
      },
      equipState: {
        weapons: [null, null],
        armors: [null, null, null],
        accessories: [null, null, null, null, null]
      }
    },
    intentDistribution: {
      attack: 30,
      buff: 10,
      debuff: 50,
      observe: 10
    },
    nextIntent: {
      type: 'debuff',
      desc: '破裂的面罩正在喷吐绿色毒气。',
    }
  },

  crimson_cultist: {
    id: 'crimson_cultist',
    name: "猩红教徒",
    desc: "「阿斯克勒庇俄斯计划」早期的狂热追随者。他们戴着防毒面具，穿着沾满暗红色干涸血迹的破旧实验服，手中紧紧握着粗糙的献祭短刀。",
    visualPrompt: "A deranged human cultist wearing a cracked gas mask and a torn, blood-stained white lab coat. Holding a crude rusty dagger. Standing in a dark, abandoned laboratory with ritualistic symbols painted in blood on the walls. Gritty, survival horror, high contrast lighting.",
    gender: 'both',
    zoneId: ['bunker'],
    initialState: {
      attribute: {
        strength: 2,
        agility: 3,
        knowledge: 3,
        perception: 3,
      },
      equipState: {
        weapons: [null, null],
        armors: [null, null, null],
        accessories: [null, null, null, null, null]
      }
    },
    intentDistribution: {
      attack: 50,
      buff: 30,
      debuff: 10,
      observe: 10
    },
    nextIntent: {
      type: 'attack',
      desc: '狂热地挥舞着暗红色的短刀。',
      value: 3
    },
    lootTable: [
      {
        id: 'rusty_dagger',
        name: '生锈的短刀',
        desc: '教徒用来献祭的武器。',
        type: 'weapon',
        rarity: 'common',
        weaponType: 'dagger',
        meleeDamage: 3,
        maxUses: 15,
        dropProbability: 0.3
      },
      {
        id: 'cult_manifesto_page',
        name: '教派宣言残页',
        desc: '写满了疯狂呓语的纸张。',
        type: 'document',
        rarity: 'common',
        documentContent: '真理隐藏在血与肉的交融中...',
        dropProbability: 0.5
      }
    ]
  },

  // =====================================================================
  // 烛火书斋 专属敌人
  // =====================================================================
  ink_elemental: {
    id: 'ink_elemental',
    name: "墨水元素",
    desc: "由古老的黑色墨水汇聚而成的流体生物，表面不断浮现出各种扭曲的文字和禁忌的符号。它的每一次攻击都会试图改写、抹除你的记忆。",
    visualPrompt: "A fluid, shifting elemental creature made entirely of black ink, ancient arcane symbols floating on its surface, reaching out with tendrils of dark liquid, grand library background, floating candles.",
    zoneId: ['archive'],
    initialState: {
      attribute: {
        strength: 2,
        agility: 5,
        knowledge: 6,
        perception: 4,
      },
      equipState: {
        weapons: [null, null],
        armors: [null, null, null],
        accessories: [null, null, null, null, null]
      }
    },
    intentDistribution: {
      attack: 30,
      buff: 20,
      debuff: 40,
      observe: 10
    },
    nextIntent: {
      type: 'debuff',
      desc: '流体表面浮现出侵蚀理智的古老符文...',
    },
    lootTable: [
      {
        id: 'living_ink',
        name: '活体墨水',
        desc: '在瓶中不断蠕动，似乎有自己的意识。',
        type: 'material',
        rarity: 'epic',
        dropProbability: 0.8
      }
    ]
  },

  blind_scholar: {
    id: 'blind_scholar',
    name: "盲眼学者",
    desc: "它为了获取禁忌的知识而挖去了自己的双眼。现在，它通过悬浮在周围的书页来感知世界，那些浸染过诅咒的书页如同锋利的刀刃般围绕着它旋转。",
    visualPrompt: "An emaciated scholar in tattered robes, empty bleeding eye sockets, surrounded by a swirling vortex of razor-sharp glowing book pages, holding a staff made of twisted spines, dark academia horror.",
    gender: 'male',
    zoneId: ['archive'],
    initialState: {
      attribute: {
        strength: 1,
        agility: 4,
        knowledge: 7,
        perception: 6,
      },
      equipState: {
        weapons: [null, null],
        armors: [null, null, null],
        accessories: [null, null, null, null, null]
      }
    },
    intentDistribution: {
      attack: 40,
      buff: 40,
      debuff: 10,
      observe: 10
    },
    nextIntent: {
      type: 'buff',
      desc: '开始快速翻阅漂浮在空中的禁忌典籍...',
    },
    lootTable: [
      {
        id: 'scholar_note',
        name: '学者手记',
        desc: '夹在书中的便签。',
        type: 'document',
        rarity: 'common',
        documentContent: '不要去读第三排第四本那本红皮书。里面的符号在看着我们。',
        dropProbability: 0.4
      }
    ]
  },

  biomass_mimic: {
    id: 'biomass_mimic',
    name: "拟态肉瘤",
    desc: "伪装成普通补给箱的活性生物组织。当你靠近试图搜刮时，它的金属伪装会瞬间溶解，露出密密麻麻的尖牙和带有倒刺的触须。",
    visualPrompt: "A rusted metal supply crate splitting open horizontally to reveal a terrifying maw of jagged teeth and fleshy, wet pink tentacles. Body horror, mimic monster, dark metallic environment, slimy textures, cinematic lighting.",
    zoneId: ['archive'],
    initialState: {
      attribute: {
        strength: 3,
        agility: 4,
        knowledge: 1,
        perception: 2,
      },
      equipState: {
        weapons: [null, null],
        armors: [null, null, null],
        accessories: [null, null, null, null, null]
      }
    },
    intentDistribution: {
      attack: 70,
      buff: 0,
      debuff: 20,
      observe: 10
    },
    nextIntent: {
      type: 'attack',
      desc: '金属外壳猛然溶解，触须疯狂抽打而出！',
      value: 4
    },
    lootTable: [
      {
        id: 'biomass_sample',
        name: '活性生物样本',
        desc: '还在不断蠕动的恶心肉块。',
        type: 'material',
        rarity: 'rare',
        dropProbability: 1.0
      },
      {
        id: 'hidden_supplies',
        name: '未被消化的口粮',
        desc: '从拟态肉瘤胃里找到的密封口粮。',
        type: 'consumable',
        rarity: 'common',
        effects: [['heal_hp', 20]],
        dropProbability: 0.4
      }
    ]
  }
}