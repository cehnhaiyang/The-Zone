import type { SanctuaryTemplate } from '../../meta';

/**
 * 烛火书斋
 *
 * 定位：
 * - 庇护所型区域
 * - 神秘学、知识禁忌、认知危害、时间异常、宇宙恐怖
 * - 低时间流速：dilationFactor = 0.5
 * - 作为玩家进入 The Zone 前的缓冲、整理、解谜与知识获取节点
 *
 * 结构：
 * - 穹顶大厅为中枢
 * - 知识长廊：低威胁、知识、NPC、基础恢复
 * - 禁书侧翼：中高威胁、禁忌知识、诅咒资源、精英敌人
 * - 星辰阶梯：时间、星象、宇宙恐怖，中等威胁
 * - 深渊回廊：高威胁、镜像、悖论、记忆、虚空
 * - 遗忘花园：异常室外恢复区
 * - 虚空裂隙：离开庇护所、进入新区域的出口
 */
export const ZONE_ARCHIVE: SanctuaryTemplate = {
    id: 'archive',
    name: '烛火书斋',
    background: '一个位于现实夹缝中的古老图书馆，时间在这里失去了意义。这里记录着过去、现在以及未曾发生的历史。书斋并非被建造，而是被「记起」的。最后的馆长在意识到真相后选择留下，封印了最危险的知识。作为庇护所，它提供有限的资源与短暂的安宁，但图书馆本身拥有意志，不断将禁忌典籍从封印中释放。蜡烛不会熄灭，书页仍在生长，某些目录正在自行补全，而读者留下的名字会出现在尚未写成的书里。',
    topology: '以穹顶大厅为中枢，向四个方向放射出深邃侧翼：知识长廊、禁书侧翼、星辰阶梯与深渊回廊。遗忘花园通过一扇侧门连接现实夹缝，虚空裂隙则隐藏在时间裂隙与深渊尽头之间。部分空间发生折叠，包含违背欧几里得几何的室外区域与意识空间。',
    nodesCount: 28,
    visualStyle: 'Gothic Library, Mystical, Candlelight, Dark Academia, Safe Haven, Cosmic Horror Undertone',
    dilationFactor: 0.5,
    entrance: 'grand_atrium',
    initialState: {
        food: 36,
        water: 60,
        medicine: 20,
        electricity: 72,
        scraps: 66,
        population: 1,
        morale: 72,
        erosion: 14,
        facility: [
            {
                id: 'facility_archive_candles',
                name: '永燃蜡烛工坊',
                desc: '一支由记忆凝成的永燃蜡烛。每隔几日便自行脱落一段蜡油，凝结成可食用的蜡质口粮——味道像被遗忘的晚餐。',
                nodeMounted: 'grand_atrium',
                production: { food: 3 },
            },
            {
                id: 'facility_archive_inkwell',
                name: '墨水池井',
                desc: '位于禁书侧翼深处的黑墨之井。井口总是湿润，每隔几日会满溢一次，溢出浓稠如血的墨汁——可作药品的原料。',
                nodeMounted: 'ink_well',
                production: { medicine: 2 },
            },
            {
                id: 'facility_archive_scriptorium',
                name: '抄写室烛光排架',
                desc: '抄写室的古老排架能捕捉星光与烛火，将其静默地转化为微弱电流，供书斋的禁制与隔音结界维持运转。',
                nodeMounted: 'scriptorium',
                production: { electricity: 4 },
            },
        ],
    },
    nodes: {
        grand_atrium: {
            name: '穹顶大厅',
            desc: '古老图书馆的核心。数千根蜡烛漂浮在空中，照亮堆积如山的书籍。空气中弥漫着陈旧纸张、烛蜡与熏香的气味。书架似乎延伸到无限高处，四条深邃侧翼从大厅向外延展：知识长廊、禁书侧翼、星辰阶梯与深渊回廊。偶尔，一本厚重典籍会从高处飘落，在你面前翻开，展示一幅你从未见过的世界地图，然后化作你的面孔。穹顶上绘着褪色星图，某些星座的位置每天都在变化。',
            visualPrompt: 'Thousands of floating candles illuminating a grand gothic atrium. Mountains of books forming towers. Four deep archways leading to corridors. Endless bookshelves extending upwards into darkness. Faded star map on domed ceiling.',
            childrenIds: [
                'reading_corridor',
                'forbidden_wing',
                'astral_stairway',
                'abyss_corridor',
            ],
            exits: [
                {
                    targetId: 'forgotten_garden',
                    label: '推开爬满藤纹的侧门',
                    type: 'local',
                },
            ],
            items: [
                {
                    id: 'atrium_candle',
                    name: '漂浮烛芯',
                    desc: '从空中蜡烛上取下的一小段烛芯，点燃时能短暂稳定心神。恢复 15 点理智。',
                    type: 'consumable',
                    rarity: 'standard',
                    discoveryThreshold: 5,
                    quantity: 2,
                    effects: [['heal_sanity', 15]],
                },
            ],
            interactions: [
                {
                    desc: '整理漂浮的蜡烛',
                    results: {
                        timeCost: 15,
                        soundEffect: 'success',
                        narrative: '你将几盏快要熄灭的蜡烛重新聚拢。温暖的光在书架间形成一条短暂的安全路径，连远处书架的沙沙声都变得柔和了一些。',
                        stateChange: {
                            sanity: 3,
                        },
                    },
                },
                {
                    desc: '尝试接住飘落的书籍',
                    results: {
                        timeCost: 10,
                        soundEffect: 'item_pickup',
                        narrative: '书页在接触你指尖的瞬间化为飞灰，但一行文字却如烙印般留在了你的脑海中。',
                        stateChange: {
                            sanity: -2,
                            gain: [
                                {
                                    id: 'ash_memory',
                                    name: '灰烬记忆',
                                    desc: '一段不属于你的短暂回忆，记录着某次不可名状的恐惧。',
                                    type: 'data',
                                    rarity: 'standard',
                                    documentContent: '“它不是在阅读，它是在咀嚼我们的思想。”',
                                },
                            ],
                        },
                    },
                },
            ],
        },

        reading_corridor: {
            name: '知识长廊',
            desc: '一条两侧摆满高大书架的深邃走廊，漂浮的烛光和飘荡的尘埃营造出静谧氛围。你可以听到翻书声和不知从何处传来的低语。地面的石砖上刻着各种语言的铭文，有些语言你确信已经失传了上千年。偶尔有一支无人持握的羽毛笔从你身边飘过，笔尖还在滴着金色的墨水。',
            visualPrompt: 'Long corridor flanked by towering bookshelves. Dust motes dancing in candlelight. Floating quills. Stone floor with ancient inscriptions.',
            childrenIds: ['reading_room', 'scriptorium', 'meditation_chamber'],
            items: [
                {
                    id: 'gilded_feather',
                    name: '金墨羽毛',
                    desc: '无人持握的羽毛笔脱落的一根羽毛，笔尖仍沾着不会干涸的金色墨水。',
                    type: 'material',
                    rarity: 'standard',
                    discoveryThreshold: 8,
                },
            ],
            interactions: [
                {
                    desc: '沿铭文走廊静行',
                    results: {
                        timeCost: 10,
                        soundEffect: 'search',
                        narrative: '你沿着石砖上的古老铭文缓步前行，漂浮的烛光在脚边聚成短暂的箭头。某些词语在你余光中重组，又在直视时恢复沉默。',
                        stateChange: {
                            sanity: 2,
                        },
                    },
                },
                {
                    desc: '追随滴墨的羽毛笔',
                    results: {
                        timeCost: 15,
                        soundEffect: 'item_pickup',
                        narrative: '那支羽毛笔似乎察觉到了你的注视，在空中停顿了一瞬，随后加速掠过书架顶端。它滴落的金色墨珠在石砖上凝成一行小字：“别让它写完。”你拾起一枚尚未凝固的墨珠。',
                        stateChange: {
                            sanity: -1,
                            gain: [
                                {
                                    id: 'gilded_feather',
                                    name: '金墨羽毛',
                                    desc: '无人持握的羽毛笔脱落的一根羽毛，笔尖仍沾着不会干涸的金色墨水。',
                                    type: 'material',
                                    rarity: 'standard',
                                },
                            ],
                        },
                    },
                },
            ],
        },

        reading_room: {
            name: '公共阅览室',
            desc: '巨大的长木桌上铺满了古老的羊皮纸卷轴。有些书脊上的文字你无法辨认。这里的时间流速似乎比外界慢得多——你放下的茶杯中的涟漪需要数分钟才能平息。墙角的老式座钟指针以肉眼可见的缓慢速度转动。',
            visualPrompt: 'Massive wooden tables covered in scrolls and tomes. Antique grandfather clock with impossibly slow pendulum. Quiet and dusty. Warm amber candlelight.',
            nodeNpc: {
                id: 'ghost_librarian',
                name: '幽魂图书管理员',
                gender: 'both',
                desc: '一个半透明的身影，仍在不知疲倦地整理着永不完结的书籍。他无法言语，但似乎愿意为你指引知识的方向。有人说，他就是最后一任馆长留下的守望残影。',
                visualPrompt: 'A semi-transparent ghostly librarian sorting books in a dimly lit gothic library. Floating dust. Candlelight passing through the figure.',
                initialState: {
                    attribute: {
                        strength: 4,
                        agility: 12,
                        wisdom: 38,
                        perception: 28,
                        spiritual: 34,
                    },
                    vital: {
                        maxHp: 90,
                        maxSanity: 260,
                        maxStamina: 90,
                        maxVigor: 140,
                    },
                    uniqueTactic: [
                        {
                            type: 'defense',
                            id: 'silent_order',
                            name: '静默秩序',
                            desc: '以图书馆的古老秩序安抚来者，提升自身灵活与稳定。',
                            apCost: 1,
                            tacticEffect: [['self', 'agility', 6]],
                        },
                        {
                            type: 'defense',
                            id: 'page_barrier',
                            name: '页墙屏障',
                            desc: '以飞旋的书页构成临时屏障，为所有友方凝聚护盾。',
                            apCost: 2,
                            tacticEffect: [['all_allies', 'shield', 18]],
                        },
                    ],
                    trust: 50,
                    quest: [
                        {
                            id: 'archive_quiet_index',
                            desc:
                                '幽魂图书管理员将一枚空白索引卡递给你。他希望从公共阅览室带回一卷尚未被污染的古代卷轴，以便完成未竟的编目。',
                            goals: [
                                {
                                    id: 'ancient_scroll',
                                    name: '古代卷轴',
                                    desc: '用未知语言写就，纸张却不会腐烂。',
                                    type: 'data',
                                    rarity: 'organized',
                                    documentContent: '当星辰归位，帷幕将降。七个印记，七个门扉。最后的守望者将见证一切。[无法解读的符号]',
                                },
                            ],
                            rewards: [
                                {
                                    id: 'librarian_seal',
                                    name: '图书管理员的静默印章',
                                    desc: '盖印时不会发出声音，却能让混乱的书页暂时归位。',
                                    type: 'accessory',
                                    rarity: 'organized',
                                    effects: [
                                        ['wisdom', 2],
                                        ['maxSanity', 10],
                                    ],
                                },
                            ],
                            difficulty: 4,
                        },
                        {
                            id: 'archive_paradox_catalog',
                            desc:
                                '在获得馆长密锁中的悖论之钥后，图书管理员希望你能从镜像图书馆带回一份只有镜中才能阅读的手稿。',
                            goals: [
                                {
                                    id: 'mirror_manuscript',
                                    name: '镜面手稿',
                                    desc: '只有在镜子里才能看清内容的书稿。',
                                    type: 'data',
                                    rarity: 'deep',
                                    documentContent: '[镜中文字] 当你阅读这些文字时，镜中的你也在阅读。但你们读到的内容不同。镜中的你知道真相。而你，还不知道……',
                                },
                            ],
                            rewards: [
                                {
                                    id: 'silent_bookmark',
                                    name: '静默书签',
                                    desc: '夹入任何书中，都能让低语暂时退去。',
                                    type: 'accessory',
                                    rarity: 'organized',
                                    effects: [
                                        ['perception', 2],
                                        ['maxSanity', 8],
                                    ],
                                },
                            ],
                            difficulty: 6,
                        },
                    ],
                },
                style: 'defense',
                willRoam: {
                    speed: 45,
                    passNodes: {
                        maxThreat: 10,
                        nodesId: [
                            'archive_vault',
                            'binding_chamber',
                            'mirror_library',
                            'paradox_room',
                            'void_portal',
                        ],
                    },
                },
            },
            items: [
                {
                    id: 'ancient_scroll',
                    name: '古代卷轴',
                    desc: '用未知语言写就，纸张却不会腐烂。',
                    type: 'data',
                    rarity: 'organized',
                    discoveryThreshold: 15,
                    documentContent:
                        '当星辰归位，帷幕将降。七个印记，七个门扉。最后的守望者将见证一切。[无法解读的符号]',
                },
                {
                    id: 'scholar_note',
                    name: '学者手记',
                    desc: '夹在书中的便签。',
                    type: 'data',
                    rarity: 'standard',
                    discoveryThreshold: 5,
                    documentContent: '不要去读第三排第四本红皮书。里面的符号在看着我们。',
                },
            ],
            interactions: [
                {
                    desc: '研读古籍',
                    results: {
                        timeCost: 30,
                        soundEffect: 'success',
                        narrative: '你翻开一本记录历史的书籍，发现其中记载的事情正逐渐与你的记忆重合……你感觉思维变得敏捷。一阵温暖的风从书页间吹过，带着古老墨水的香气。',
                        stateChange: {
                            sanity: 5,
                        },
                    },
                },
            ],
        },

        scriptorium: {
            name: '静默抄写室',
            desc: '一排排倾斜的书桌上摆放着干涸的墨水瓶。空气中飘浮着金色的尘埃。在这里，即使没有人在，羽毛笔偶尔也会自动在羊皮纸上沙沙作响，记录着未发生的历史。你看到一支笔正在书写——内容是你明天将要做的事。',
            visualPrompt: 'Rows of slanted wooden desks, dried ink wells. Golden dust in the air. Quill pens moving on their own on parchment. Prophetic text being written.',
            threatLevel: 4,
            items: [
                {
                    id: 'ink_stained_page',
                    name: '墨染书页',
                    desc: '被墨水浸透的书页，隐约可见文字轮廓。',
                    type: 'data',
                    rarity: 'standard',
                    discoveryThreshold: 5,
                    documentContent:
                        '[墨迹下的文字] ……它不是怪物，它是钥匙。不要相信你所看到的。真相在镜子的另一边…… [其余部分无法辨认]',
                },
            ],
            interactions: [
                {
                    desc: '尝试补全预言',
                    requirements: {
                        puzzleSolved: {
                            title: '未写完的预言',
                            lore: '羊皮纸上的文字自动浮现，但在关键处停顿，一支羽毛笔悬浮在空中，等待你的补全。',
                            body: {
                                type: 'cloze',
                                body: [
                                    ['当', '', '转动，第四个封印将破碎。不是由外向内，而是由内向', ''],
                                ],
                                answer: ['银钥', '外'],
                            },
                            hints: [
                                '回忆一下你在图书馆中找到的其他碎片化信息。',
                                '思考“门”与“锁”的意象，以及方向的反转。',
                            ],
                            restrictions: {
                                timeCostPerAttempt: 5,
                                maxAttempts: 3,
                            },
                            penalties: {
                                sanity: 8,
                            },
                        },
                    },
                    results: {
                        timeCost: 15,
                        soundEffect: 'error',
                        narrative: '羽毛笔按照你的意愿落下，但写出的文字流出鲜血。羊皮纸瞬间燃烧殆尽，只留下一片奇异的残骸。',
                        stateChange: {
                            sanity: -5,
                            gain: [
                                {
                                    id: 'prophecy_fragment',
                                    name: '预言残片',
                                    desc: '曾经写有预言的羊皮纸灰烬。',
                                    type: 'material',
                                    rarity: 'deep',
                                },
                            ],
                        },
                    },
                },
            ],
        },

        meditation_chamber: {
            name: '冥想室',
            desc: '一个圆形的小房间，地板上画着复杂的几何图案。墙上挂着各种宗教和神秘学的符号，空气中残留着檀香的气息。这里异常安静，甚至连你自己的心跳声都清晰可闻。蒲团上还留着上一位冥想者的体温——但据说最后一位馆长已经消失了很久。',
            visualPrompt: 'Small circular room, intricate geometric patterns on the floor. Walls adorned with religious and occult symbols. Warm cushion. Incense smoke trails.',
            items: [
                {
                    id: 'meditation_beads',
                    name: '静念珠',
                    desc: '木质念珠，握住时内心会平静。',
                    type: 'accessory',
                    rarity: 'standard',
                    discoveryThreshold: 15,
                    effects: [['maxSanity', 5]],
                },
                {
                    id: 'incense_bundle',
                    name: '安神香',
                    desc: '燃烧时能平复心神。恢复 25 点理智。',
                    type: 'consumable',
                    rarity: 'standard',
                    discoveryThreshold: 5,
                    quantity: 2,
                    effects: [['heal_sanity', 25]],
                },
            ],
            interactions: [
                {
                    desc: '尝试冥想',
                    results: {
                        timeCost: 60,
                        soundEffect: 'success',
                        narrative: '你坐在蒲团上，尝试清空思绪。内心的恐惧逐渐消退，一种温暖的光笼罩了你。在意识边缘，你听到了一个温柔的、无法辨别性别的声音说：「你是被允许进入的。」',
                        stateChange: {
                            sanity: 15,
                            hp: 10,
                        },
                    },
                },
            ],
        },

        forbidden_wing: {
            name: '禁书侧翼',
            desc: '这里的书架被生锈的铁链锁住，有些书本被浸泡在福尔马林瓶中，有的甚至还在跳动。此区域弥漫着不安的能量，灯光在此处变成了冰冷的蓝色。地面上有拖拽的痕迹——不是人的脚印，而是书脊留下的刮痕，仿佛这些书自行移动过。有时铁链会嘎吱作响，当你猛然回头时，所有书脊的文字似乎都在直视你。',
            visualPrompt: 'Locked iron bookshelves with chains. Books preserved in fluid jars, some pulsating. Cold blue magical aura. Drag marks on floor from moving books.',
            threatLevel: 12,
            childrenIds: [
                'archive_vault',
                'alchemy_lab',
                'ritual_circle',
                'binding_chamber',
                'ink_well',
                'curator_study',
            ],
            interactions: [
                {
                    desc: '贴着铁链书架缓步巡视',
                    results: {
                        timeCost: 15,
                        soundEffect: 'search',
                        narrative: '铁链在你经过时轻轻晃动，仿佛在丈量你的意图。某些书脊上的烫金字母短暂地排列成一句警告，随即又散开。',
                        stateChange: {
                            sanity: -2,
                        },
                    },
                },
            ],
        },

        archive_vault: {
            name: '禁忌书库',
            desc: '沉重的铁门保护着最核心的秘密。这里的每一本书都在窃窃私语，声波甚至让空气产生了轻微的扭曲。你能感觉到知识——原始的、未经人类理解过滤的知识——如同物理压力般压在你的颅骨上。',
            visualPrompt: 'Heavy iron vault. Books whispering and causing air distortion. Visible sound waves. Oppressive atmosphere.',
            threatLevel: 16,
            items: [
                {
                    id: 'forbidden_tome',
                    name: '禁忌之书',
                    desc: '封面没有任何文字，但触摸时会听到低语。',
                    type: 'data',
                    rarity: 'deep',
                    discoveryThreshold: 20,
                    documentContent:
                        '[这本书的内容似乎会根据读者而变化] 你看到的是：门扉不是通往外界，而是通往内心。当你凝视深渊时，深渊也在凝视着你。但如果你拥抱深渊，深渊将为你让路。',
                },
                {
                    id: 'librarian_cloak',
                    name: '守望者斗篷',
                    desc: '散发着陈旧纸张气味的黑色斗篷，能偏转认知的攻击。',
                    type: 'armor',
                    rarity: 'deep',
                    partialReduction: 0.12,
                    maxUses: 20,
                    discoveryThreshold: 25,
                },
            ],
            interactions: [
                {
                    desc: '阅读禁书',
                    results: {
                        timeCost: 120,
                        soundEffect: 'terrifying',
                        narrative: '文字在眼前扭曲变形，你的大脑被强行塞入了一些禁忌的启示。回过神来时，你发现自己已经用指甲在木桌上刻下了一个你不认识的符号。',
                        stateChange: {
                            sanity: -15,
                            gain: [
                                {
                                    id: 'lucid_elixir',
                                    name: '清醒药剂',
                                    desc: '淡蓝色液体，能暂时恢复 40 点理智。',
                                    type: 'consumable',
                                    rarity: 'organized',
                                    effects: [['heal_sanity', 40]],
                                },
                            ],
                        },
                    },
                },
            ],
        },

        alchemy_lab: {
            name: '炼金实验室',
            desc: '玻璃器皿和蒸馏装置占据了大部分空间。架子上摆满了各种颜色的液体和粉末。最奇异的是中央的烧瓶——里面的液体在没有加热的情况下持续沸腾，冒出的蒸汽凝结成微小的、转瞬即逝的人脸。',
            visualPrompt: 'Cluttered laboratory with glassware, distillation apparatus. Central flask with self-boiling liquid producing face-shaped steam. Alchemical charts on walls.',
            threatLevel: 4,
            items: [
                {
                    id: 'healing_potion',
                    name: '治疗药水',
                    desc: '冒着气泡的绿色液体。恢复 30 点 HP。',
                    type: 'consumable',
                    rarity: 'standard',
                    discoveryThreshold: 10,
                    quantity: 2,
                    effects: [['heal_hp', 30]],
                },
                {
                    id: 'clarified_candle_cell',
                    name: '澄明烛芯电池',
                    desc: '将稳定烛光封入铜壳中制成的应急电池，可为神经链接仪短暂供能。恢复 35 点电量。',
                    type: 'consumable',
                    rarity: 'organized',
                    discoveryThreshold: 18,
                    effects: [['restore_battery', 35]],
                },
                {
                    id: 'silver_filament_repair_gel',
                    name: '银丝修复凝胶',
                    desc: '炼金笔记中记载的电极修复剂，能暂时弥合神经链接仪微电极的裂纹。恢复 25 点完整性。',
                    type: 'consumable',
                    rarity: 'organized',
                    discoveryThreshold: 20,
                    effects: [['repair_integrity', 25]],
                },
            ],
            interactions: [
                {
                    desc: '研究炼金笔记并尝试合成',
                    requirements: {
                        puzzleSolved: {
                            title: '蒸馏序列',
                            lore:
                                '羊皮纸上记录着斐波那契数列般的炼金反应温度变化规律，其中有一处被墨水遮盖：2, 3, 5, 8, [?], 21。你需要选择正确的温度试管。',
                            body: {
                                type: 'choice',
                                body: ['8', '11', '13', '15'],
                                answer: '13',
                            },
                            hints: ['观察相邻两个数字的关系，前两个数字之和等于下一个。'],
                            restrictions: {
                                timeCostPerAttempt: 5,
                                maxAttempts: 3,
                            },
                            penalties: {
                                hp: 5,
                                sanity: 5,
                            },
                        },
                    },
                    results: {
                        timeCost: 45,
                        soundEffect: 'success',
                        narrative: '笔记最后一页写着：“终于成功了。但代价是什么？我的手……”随着你正确推导了序列，烧瓶内的液体骤然凝固，化为一颗散发着红光的晶体。',
                        stateChange: {
                            gain: [
                                {
                                    id: 'philosophers_stone_fragment',
                                    name: '贤者之石碎片',
                                    desc: '散发着微光的红色晶体，蕴含着神秘的力量。',
                                    type: 'material',
                                    rarity: 'deep',
                                },
                            ],
                        },
                    },
                },
            ],
        },

        ritual_circle: {
            name: '仪式密室',
            desc: '地板上用银粉画着一个巨大的魔法阵，中心有一个石制祭坛。墙上的壁画描绘着某种仪式，参与者的面孔被故意抹去了。银粉线条在你靠近时微微发光，像是在识别来者的身份。',
            visualPrompt: 'Large magic circle drawn in silver powder on the floor, glowing at edges. Stone altar with dark stains. Murals of faceless figures performing a ritual.',
            threatLevel: 6,
            items: [
                {
                    id: 'ritual_dagger',
                    name: '仪式匕首',
                    desc: '刀刃上刻着古老的符文。造成 12 点近程伤害。',
                    type: 'weapon',
                    rarity: 'organized',
                    discoveryThreshold: 15,
                    weaponType: 'prick',
                    weaponDamageType: 'cold',
                    range: 1,
                    damage: 12,
                    maxUses: 8,
                },
                {
                    id: 'blessed_water',
                    name: '祝圣之水',
                    desc: '装在水晶瓶中的清水，散发着柔和的光芒。恢复 25 点理智。',
                    type: 'consumable',
                    rarity: 'organized',
                    discoveryThreshold: 10,
                    quantity: 2,
                    effects: [['heal_sanity', 25]],
                },
            ],
            interactions: [
                {
                    desc: '检查祭坛',
                    results: {
                        timeCost: 20,
                        soundEffect: 'terrifying',
                        narrative: '祭坛上的痕迹是血——但已经干涸了不知多少年。奇怪的是，你感受不到任何邪恶的气息。祭坛底部刻着一行小字：「以血封印，以血解封。此为馆长之誓。」',
                        stateChange: {
                            sanity: -5,
                        },
                    },
                },
            ],
        },

        binding_chamber: {
            name: '封印室',
            desc: '一个六边形的房间，每面墙壁都被厚重的铁链覆盖。铁链的交汇中心悬挂着一本巨大的书——它的封面是活体皮肤，正在缓慢地呼吸。书页偶尔翻动，每翻一页，房间里的温度就下降一度。地面上的封印阵正在缓慢褪色。',
            visualPrompt: 'Hexagonal room covered in iron chains. Massive book suspended in center with living skin cover. Breathing motion. Fading seal circle on the floor. Frost forming on chains.',
            threatLevel: 20,
            interactions: [
                {
                    desc: '触碰活体典籍',
                    results: {
                        timeCost: 10,
                        soundEffect: 'terrifying',
                        narrative: '你的手指刚触及封面，书猛地翻开——扉页上写着你的名字和出生日期，以及一个你还没有经历的死亡日期。铁链发出尖锐的金属碰撞声，你本能地缩回了手。',
                        stateChange: {
                            sanity: -12,
                        },
                    },
                },
            ],
            specificEnemy: {
                spawnCondition: 'on_interact',
                data: [
                    {
                        id: 'living_codex',
                        name: '苏醒的典籍',
                        gender: 'both',
                        desc: '铁链断裂，那本巨大的书展开了。书页如同无数只翅膀般张开，封面裂开化为颚骨，从书脊中伸出由墨水凝结的触手。它用所有已知和未知语言同时尖叫。',
                        visualPrompt: 'A giant monstrous book standing upright, pages flapping like wings, its leather cover splitting into a jawed maw, with tentacles made of black ink writhing from its spine.',
                        type: 'cthulhu',
                        range: 4,
                        speed: 12,
                        damage: 24,
                        evasion: 14,
                        defense: 20,
                        intentDistribution: {
                            attack: 30,
                            defense: 12,
                            buff: 14,
                            debuff: 34,
                            observe: 10,
                        },
                        lootTable: [
                            {
                                id: 'living_ink',
                                name: '活体墨水',
                                desc: '在瓶中不断蠕动，似乎有自己的意识。',
                                type: 'material',
                                rarity: 'deep',
                                dropProbability: 1,
                            },
                        ],
                    },
                ],
            },
        },

        ink_well: {
            name: '墨池深渊',
            desc: '一个圆形的下沉式空间，中央是一个巨大的石质水池，里面盛满了深不见底的黑色墨水。墨水表面平静如镜，但倒映出的不是天花板——而是一片缀满陌生星辰的夜空。偶尔有气泡从深处升起，破裂时会发出微弱的低语。',
            visualPrompt: 'Sunken circular chamber. Large stone pool filled with impossibly deep black ink. Ink surface reflects alien starry sky instead of ceiling. Occasional bubbles rising.',
            threatLevel: 14,
            items: [
                {
                    id: 'ink_stained_page_deep',
                    name: '残破的墨染书页',
                    desc: '被墨水浸透的残页，隐约可见不可名状的轮廓。',
                    type: 'data',
                    rarity: 'standard',
                    discoveryThreshold: 10,
                    documentContent:
                        '[墨迹下的文字] ……它不是怪物，它是钥匙。不要相信倒影。真相在镜子的另一边…… [其余部分被墨水吞没]',
                },
            ],
            interactions: [
                {
                    desc: '凝视墨水表面',
                    results: {
                        timeCost: 15,
                        soundEffect: 'terrifying',
                        narrative: '你的倒影在墨水中缓缓抬起手——但你没有动。它指向你身后，嘴唇无声地翕动着，仿佛在警告什么。你猛地回头，什么也没有。再看墨水时，倒影已经恢复了正常。你从池边拾起了一块凝固的墨核。',
                        stateChange: {
                            sanity: -8,
                            gain: [
                                {
                                    id: 'abyssal_ink_core',
                                    name: '深渊墨核',
                                    desc: '触感冰凉的纯黑色结晶体，内部似乎封存着星空。',
                                    type: 'material',
                                    rarity: 'organized',
                                },
                            ],
                        },
                    },
                },
            ],
        },

        curator_study: {
            name: '馆长书房',
            desc: '一间被时间遗忘的私人书房。桌上的茶还是温的，但灰尘的厚度表明已经无人踏足数十年。书架上的书不是按字母排列，而是按某种你无法理解的逻辑——也许是按照危险程度。壁炉中的火焰是蓝色的，不散发任何热量。',
            visualPrompt: 'Private study frozen in time. Warm tea on dusty desk. Blue cold fire in fireplace. Books arranged by danger level. Ancient leather chair.',
            items: [
                {
                    id: 'curator_confession',
                    name: '馆长忏悔书',
                    desc: '最后一任馆长的日记，记录着不为人知的真相。',
                    type: 'data',
                    rarity: 'deep',
                    discoveryThreshold: 15,
                    documentContent:
                        '我犯了一个错误。我以为我在保护知识，但我实际上在保护一个谎言。这个图书馆不是知识的宝库，而是一个监狱。每一本书都是一个牢笼，每一个读者都是狱卒。现在，最后的守望者来了。他会做出选择，而我只能祈祷……',
                },
            ],
            interactions: [
                {
                    desc: '翻阅馆长的桌面笔记',
                    results: {
                        timeCost: 20,
                        soundEffect: 'search',
                        narrative: '笔记最后的日期是「无」。内容写道：「我已与图书馆达成协议。它保护访客的安全，我保护它的秘密。镜像图书馆不可进入——那里的知识会让你忘记自己是谁。但如果必须进去……你需要悖论之钥。抽屉的密码与倒退的时间有关。」',
                    },
                },
                {
                    desc: '尝试解开书桌暗格的密码锁',
                    requirements: {
                        puzzleSolved: {
                            title: '馆长的密锁',
                            lore: '桌面上雕刻着一行铭文提示：“倒退着凝视深渊”。暗格的金属圆环上排列着杂乱无章的英文字母，刻着 diov。',
                            body: {
                                type: 'type',
                                answer: 'void',
                            },
                            hints: ['深渊的英文拼写是什么？', '再结合“倒退”的提示。'],
                            restrictions: {
                                timeCostPerAttempt: 5,
                                maxAttempts: 5,
                            },
                            penalties: {
                                sanity: 5,
                            },
                        },
                    },
                    results: {
                        timeCost: 15,
                        soundEffect: 'unlock',
                        narrative: '齿轮发出清脆的咬合声，暗格弹开了。里面没有别的东西，只有一把边缘似乎在不断扭曲重组的奇特钥匙。伴随着暗格的开启，书架后方传来沉重的摩擦声，一条原本不存在的暗道似乎被打通了。',
                        stateChange: {
                            gain: [
                                {
                                    id: 'paradox_key',
                                    name: '悖论之钥',
                                    desc: '一把违反物理定律的钥匙，可以打开任何锁。',
                                    type: 'material',
                                    rarity: 'deep',
                                },
                            ],
                        },
                    },
                },
            ],
        },

        astral_stairway: {
            name: '星辰阶梯',
            desc: '螺旋向上延伸的石头阶梯，周围漂浮着微缩的星系幻象。每上一级台阶，重力就似乎减轻了一分。阶梯的扶手上长满了发光的苔藓，它们的光芒与漂浮的星系保持了相同的脉动节奏。',
            visualPrompt: 'Spiral stone staircase, floating illusions of miniature galaxies. Anti-gravity effects. Luminescent moss on railings pulsing in rhythm with galaxies.',
            childrenIds: [
                'observatory',
                'clock_tower',
                'celestial_map_room',
                'time_fracture',
            ],
            interactions: [
                {
                    desc: '触摸发光苔藓',
                    results: {
                        timeCost: 5,
                        soundEffect: 'success',
                        narrative: '苔藓的光芒随着你的触碰加快了一瞬，随后恢复与漂浮星系相同的脉动。你感到脚下的重力变得稍微温柔。',
                        stateChange: {
                            sanity: 2,
                        },
                    },
                },
            ],
        },

        observatory: {
            name: '观星台',
            desc: '一个圆顶房间，天花板是透明的，可以看到外面的星空。但星座的位置是错的，有些星星的颜色不应该存在。房间中央有一台古老的望远镜，镜筒上刻满了微小的符文。',
            visualPrompt: 'Domed room with transparent ceiling revealing alien constellations with impossible colors. Ancient rune-inscribed telescope in center. Star charts on walls.',
            threatLevel: 8,
            items: [
                {
                    id: 'star_chart',
                    name: '星图',
                    desc: '描绘着未知星座的古老星图。',
                    type: 'data',
                    rarity: 'organized',
                    discoveryThreshold: 10,
                    documentContent:
                        '[星图上的注释] 第七星归位之日，门扉将开启。守望者将面临选择：终结、开始、还是超越…… [下方用血写着：选择已定]',
                },
                {
                    id: 'astral_lens',
                    name: '星光透镜',
                    desc: '可以看见常人无法察觉的事物。',
                    type: 'accessory',
                    rarity: 'organized',
                    discoveryThreshold: 20,
                    effects: [['perception', 3]],
                },
            ],
            interactions: [
                {
                    desc: '使用望远镜',
                    results: {
                        timeCost: 30,
                        soundEffect: 'terrifying',
                        narrative: '你透过望远镜观察星空。起初一切正常，然后你看到了……那不是星星。那是眼睛。无数只眼睛，在黑暗中注视着你。其中一只眨了一下。',
                        stateChange: {
                            sanity: -12,
                        },
                    },
                },
            ],
        },

        clock_tower: {
            name: '永恒钟楼',
            desc: '巨大的齿轮在虚空中缓慢咬合，发出震动灵魂的轰鸣。透过齿轮的缝隙，你可以看到过去和未来的残影——某一瞬间，你看到了自己站在这里，但穿着不同的衣服，脸上带着你从未有过的表情。',
            visualPrompt: 'Massive gears grinding against cosmic void. No clock face, just heavy celestial machinery. Ghostly afterimages of alternate timelines visible between gears.',
            threatLevel: 4,
            interactions: [
                {
                    desc: '聆听齿轮声与解开时间悖论',
                    requirements: {
                        puzzleSolved: {
                            title: '时间之谜',
                            lore: '控制台的黄铜面板上刻着一行字：“我没有过去，但我有未来。我没有嘴巴，但我能吞没一切。我是谁？”',
                            body: {
                                type: 'type',
                                answer: '明天',
                            },
                            hints: ['思考时间的流向。', '什么东西永远在你前方，却从未真正到来？'],
                            restrictions: {
                                timeCostPerAttempt: 5,
                                maxAttempts: 3,
                            },
                            penalties: {
                                sanity: 5,
                            },
                        },
                    },
                    results: {
                        timeCost: 15,
                        soundEffect: 'success',
                        narrative: '规律的机械声仿佛在倒数。你输入了正确的答案，齿轮停止了转动一瞬。你似乎看到自己老去又重生的幻象。在某一个版本中，你活到白发苍苍，周围是你不认识的人的笑脸。那个版本的你看起来很幸福，为你留下了一个齿轮。',
                        stateChange: {
                            sanity: 10,
                            gain: [
                                {
                                    id: 'temporal_gear',
                                    name: '时间齿轮',
                                    desc: '仍在微微震动的黄铜齿轮，握在手中能感受到时光流逝。',
                                    type: 'material',
                                    rarity: 'organized',
                                },
                            ],
                        },
                    },
                },
            ],
        },

        celestial_map_room: {
            name: '星穹制图室',
            desc: '房间中央悬浮着一台精密的天球仪，由数百个嵌套的金属环组成，每一环代表一个天体的运行轨道。天球仪在无人触碰的情况下缓慢自转，金属环上的宝石在黑暗中闪烁，精确地重现着头顶异常星空的布局。地面散落着制图工具和未完成的星图。',
            visualPrompt: 'Floating armillary sphere made of hundreds of nested metal rings with gemstones. Self-rotating. Scattered cartography tools and star maps on the floor. Deep blue ambient light.',
            items: [
                {
                    id: 'celestial_fragment',
                    name: '天体碎片',
                    desc: '散发着星光的陨石碎片。',
                    type: 'material',
                    rarity: 'deep',
                    discoveryThreshold: 25,
                },
                {
                    id: 'star_calculation',
                    name: '星辰计算手稿',
                    desc: '密密麻麻的数学公式和天文符号。',
                    type: 'data',
                    rarity: 'organized',
                    discoveryThreshold: 15,
                    documentContent:
                        '所有的计算都指向同一个结论：我们观测到的星空不是真实的天空——这是一面“天幕”，一个巨大的壳层结构。而壳层之外的东西——我不敢计算它的质量。因为计算结果表明，它是活的，而且正在靠近。',
                },
            ],
            interactions: [
                {
                    desc: '触碰天球仪',
                    results: {
                        timeCost: 10,
                        soundEffect: 'error',
                        narrative: '你轻轻碰了一下最外层的金属环，整台天球仪突然加速旋转。宝石的光芒汇聚成一束激光般的光柱，在天花板上投射出一张三维星图。光柱照亮之处，你看到了你的位置——一个即将被某颗正在坠落的恒星吞没的微小光点。',
                        stateChange: {
                            sanity: -5,
                        },
                    },
                },
                {
                    desc: '整理散落的制图工具',
                    results: {
                        timeCost: 20,
                        soundEffect: 'search',
                        narrative: '你将散落的圆规与星规逐一归位。当最后一件工具落回天鹅绒凹槽时，天球仪的自转放缓了半拍，仿佛在向你致意。一枚冷却的陨石碎片从最高处的金属环上剥落，滚到你的脚边。',
                        stateChange: {
                            sanity: 3,
                            gain: [
                                {
                                    id: 'celestial_fragment',
                                    name: '天体碎片',
                                    desc: '散发着星光的陨石碎片。',
                                    type: 'material',
                                    rarity: 'deep',
                                },
                            ],
                        },
                    },
                },
            ],
        },

        time_fracture: {
            name: '时间裂隙',
            desc: '台阶的尽头不是房间——而是一道巨大的裂缝，像是现实本身被撕开了一道口子。裂缝的边缘不断地结晶和溶解。透过裂缝，你可以同时看到黎明和黄昏，看到同一片森林在春天和冬天之间不断切换。站在这里，你会感到一种奇异的平静——时间在这里失去了意义，也就失去了催逼你的力量。',
            visualPrompt: 'Reality crack at the top of the stairs. Crystal-like edges forming and dissolving. Through the crack: simultaneous dawn and dusk, cycling seasons. Peaceful but surreal atmosphere.',
            threatLevel: 12,
            items: [
                {
                    id: 'time_hourglass',
                    name: '时间沙漏',
                    desc: '沙子向上流动的沙漏。',
                    type: 'material',
                    rarity: 'deep',
                    discoveryThreshold: 25,
                },
                {
                    id: 'memory_crystal_fracture',
                    name: '裂隙记忆水晶',
                    desc: '蕴含着某个时间点记忆的水晶，触摸时会看到片段。',
                    type: 'material',
                    rarity: 'organized',
                    discoveryThreshold: 20,
                },
            ],
            interactions: [
                {
                    desc: '将手伸进裂缝',
                    results: {
                        timeCost: 5,
                        soundEffect: 'ui_transition',
                        narrative: '你的手指穿过裂缝边缘，感到一阵刺骨的寒冷，然后是灼热，然后——什么也没有。你抽回手时，指甲似乎比刚才长了一些。或者短了。你分不清。但你的心跳平稳了下来，恐惧被一种深层的宁静取代。',
                        stateChange: {
                            sanity: 8,
                            hp: 5,
                        },
                    },
                },
            ],
            exits: [
                {
                    targetId: 'void_portal',
                    label: '坠入下方的虚空',
                    type: 'local',
                },
            ],
        },

        abyss_corridor: {
            name: '深渊回廊',
            desc: '穹顶大厅背面有一道不引人注目的拱门，通向一条没有蜡烛的漆黑走廊。这里的黑暗像是有实体的——你能感觉到它贴着你的皮肤流动。墙壁上的书架里塞满了没有书名的书。你走过的地方会在身后留下一串微弱的脚印光痕，几秒后消失。有时你能听到比自己实际步伐快了半拍的幽灵足音，甚至感觉黑暗中有东西触碰你的肩膀，回头却只能看到无名书坠落。走廊尽头向下塌陷，仿佛通往某种更深的虚空。',
            visualPrompt: 'Pitch-black corridor with tangible darkness. Nameless books on shelves. Faint glowing footprints fading behind the viewer. A downward collapse of darkness at the far end.',
            threatLevel: 16,
            childrenIds: [
                'mirror_library',
                'memory_theater',
                'paradox_room',
                'echo_gallery',
            ],
            exits: [
                {
                    targetId: 'void_portal',
                    label: '坠入黑暗尽头的虚空',
                    type: 'local',
                },
            ],
            items: [
                {
                    id: 'nameless_book',
                    name: '无名书',
                    desc: '没有书名的黑皮书，内页空白，却在靠近耳边时发出极轻的呼吸声。',
                    type: 'data',
                    rarity: 'standard',
                    discoveryThreshold: 12,
                    documentContent:
                        '……（空白）…… 你继续翻阅。某一页突然浮现出一行字：“不要把我带回穹顶。”',
                },
            ],
            interactions: [
                {
                    desc: '检查黑暗中的无名书',
                    results: {
                        timeCost: 15,
                        soundEffect: 'terrifying',
                        narrative: '你从架上抽出一本没有书名的书。封面像冷掉的皮肤，内页全是空白。你合上书时，听见它在你掌心里轻轻叹了口气。',
                        stateChange: {
                            sanity: -3,
                        },
                    },
                },
            ],
        },

        mirror_library: {
            name: '镜像图书馆',
            desc: '这间图书馆的一面墙是一面巨大的镜子。镜中的房间和现实完全一致——除了一个细节：镜中的书架上有一些现实中不存在的书。那些书的书脊闪着微弱的银光，书名是镜像反写的。镜面偶尔会泛起涟漪，像是液体。镜像图书馆的入口似乎被一层晶莹的力场封锁，表面流动着悖论般的符文。',
            visualPrompt: 'Library room with one wall being a massive mirror. Reflection shows extra books with silver spines. Mirror surface occasionally ripples like liquid. Reversed text visible.',
            threatLevel: 18,
            items: [
                {
                    id: 'mirror_warning',
                    name: '镜前遗言',
                    desc: '镜框边缘刻着的文字。',
                    type: 'data',
                    rarity: 'standard',
                    discoveryThreshold: 5,
                    documentContent:
                        '第七条规则：不要在镜中阅读超过三页。不要回应镜中的自己。不要接受镜中递出的任何东西。—— 馆长',
                },
            ],
            interactions: [
                {
                    desc: '使用悖论之钥触碰镜面',
                    requirements: {
                        items: ['paradox_key'],
                    },
                    results: {
                        timeCost: 5,
                        soundEffect: 'unlock',
                        narrative: '有了悖论之钥，你的指尖轻易穿入了液态的镜面。镜中的你后退了一步，缓缓点头，它伸出了手，将一本带着银色光芒的手稿递给了你，然后化作虚无。',
                        stateChange: {
                            gain: [
                                {
                                    id: 'mirror_manuscript',
                                    name: '镜面手稿',
                                    desc: '只有在镜子里才能看清内容的书稿。',
                                    type: 'data',
                                    rarity: 'deep',
                                    documentContent: '[镜中文字] 当你阅读这些文字时，镜中的你也在阅读。但你们读到的内容不同。镜中的你知道真相。而你，还不知道……',
                                },
                            ],
                        },
                    },
                },
                {
                    desc: '强行触摸力场并打碎镜面',
                    results: {
                        timeCost: 5,
                        soundEffect: 'item_break',
                        narrative: '你的指尖刚触碰到力场，一股强烈的撕裂感传来。镜子瞬间炸裂，但碎片并没有落地，而是汇聚成了一个与你一模一样的暗影！镜中的你冷笑着，用唇语说了一个词：“留下”。',
                        stateChange: {
                            sanity: -10,
                            spawnEnemy: [
                                {
                                    id: 'mirror_stalker',
                                    name: '镜中倒影',
                                    gender: 'both',
                                    desc: '它有着和你一样的面容，但眼神中充满了恶意的空洞。它的动作是你几秒前的镜像延迟。',
                                    visualPrompt: 'A terrifying dark mirror reflection of the player stepping out of shattered glass, composed of shadow and silver shards.',
                                    type: 'cthulhu',
                                    range: 2,
                                    speed: 20,
                                    damage: 22,
                                    evasion: 32,
                                    defense: 8,
                                    intentDistribution: {
                                        attack: 48,
                                        defense: 6,
                                        buff: 8,
                                        debuff: 28,
                                        observe: 10,
                                    },
                                    lootTable: [
                                        {
                                            id: 'shattered_mirror_shard',
                                            name: '破碎镜片',
                                            desc: '极其锋利的碎片，映射出的画面永远是黑白的。',
                                            type: 'material',
                                            rarity: 'organized',
                                            dropProbability: 1,
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                },
            ],
        },

        memory_theater: {
            name: '记忆剧场',
            desc: '一个圆形的小剧场，中央有一把孤零零的天鹅绒座椅。座椅面向一面空白的白色幕布。当你坐下时——你将不再是你自己。你将成为图书馆中某个曾经到访者的一段记忆的观众，或者参与者。剧场的穹顶上画着张开的眼睛。',
            visualPrompt: 'Small circular amphitheater. Single velvet chair facing a blank white screen. Painted eyes on domed ceiling. Intimate yet unsettling atmosphere.',
            items: [
                {
                    id: 'memory_crystal_theater',
                    name: '剧场记忆水晶',
                    desc: '蕴含着他人深刻记忆的水晶，触摸时会看到完整的片段。',
                    type: 'material',
                    rarity: 'organized',
                    discoveryThreshold: 15,
                },
            ],
            interactions: [
                {
                    desc: '坐在椅子上',
                    results: {
                        timeCost: 45,
                        soundEffect: 'terrifying',
                        narrative: '幕布亮起。你看到一个穿着长袍的人正在书架间行走——这是馆长的记忆。他在封印那本活体典籍时流着泪说：“我很抱歉。但你已经不是一本书了，你是一个存在。我无权决定你的命运，但我必须保护那些不知情的人。”画面在一声心碎的叹息中消散。',
                        stateChange: {
                            sanity: 5,
                        },
                    },
                },
            ],
        },

        paradox_room: {
            name: '悖论之间',
            desc: '这个房间违反了欧几里得几何的所有规则。四面墙壁围成的空间比从外面看到的大得多。天花板同时是另一个方向的地板——你能看到自己倒立在上方，像镜像但延迟了两秒。房间中央漂浮着一个不断折叠又展开的多面体，它有的面朝向你时是三角形，转过去后变成了正方形。',
            visualPrompt: 'Non-Euclidean room larger inside than outside. Ceiling is simultaneous floor with delayed reflection. Floating polytope constantly folding and unfolding. Mind-bending geometry.',
            threatLevel: 20,
            items: [
                {
                    id: 'void_fragment_paradox',
                    name: '不稳定虚空碎片',
                    desc: '从空间扭曲处凝结的结晶。触摸时会感到刺骨的寒冷。',
                    type: 'material',
                    rarity: 'abyssal',
                    discoveryThreshold: 25,
                },
                {
                    id: 'paradox_pendant',
                    name: '悖论吊坠',
                    desc: '装备时感知大幅提升，但会持续削弱你的理智本源。',
                    type: 'accessory',
                    rarity: 'abyssal',
                    discoveryThreshold: 20,
                    effects: [
                        ['perception', 8],
                        ['maxSanity', -15],
                    ],
                },
            ],
            interactions: [
                {
                    desc: '触碰多面体',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative: '你的手穿过了多面体的一个面——手腕以下消失了。你感到手指触碰到了某个柔软的、温暖的、正在呼吸的东西。当你抽回手时，指尖沾着一种你从未见过颜色的液体。你的脑海中闪过一个不属于这个宇宙的真理，然后它消失了，只留下空洞的恐惧。',
                        stateChange: {
                            sanity: -20,
                        },
                    },
                },
            ],
        },

        echo_gallery: {
            name: '回声长廊',
            desc: '一条弧形的长走廊，墙壁是某种声学材料。你发出的任何声音都会被反射回来——但内容会被微妙地修改。一声咳嗽会变成一声叹息，一句问候会变成一句回答——不是 echo，而是某种存在在与你对话。墙上挂着空白的画框。',
            visualPrompt: 'Curved gallery with acoustic walls. Empty picture frames on walls. Sound distortion visible as color ripples. Ethereal and eerie atmosphere.',
            childrenIds: ['dream_study'],
            interactions: [
                {
                    desc: '对着走廊大喊',
                    results: {
                        timeCost: 5,
                        soundEffect: 'error',
                        narrative: '你喊出：“有人在吗？”回声传来——“一直都在。你只是不愿意听。”那个声音温柔但疲倦，带着无尽的耐心。空白画框中短暂地闪过了一张模糊的面孔。',
                        stateChange: {
                            sanity: -3,
                        },
                    },
                },
                {
                    desc: '在空白画框前驻足',
                    results: {
                        timeCost: 15,
                        soundEffect: 'search',
                        narrative: '你凑近其中一个画框。画布上没有颜料，却有一层极浅的凹痕——像是有人曾用指甲在上面反复刻画同一句话。你闭上眼，用指尖描摹那些凹痕。回声在你耳边轻声补全了那句话：“记住你来时的路。”',
                        stateChange: {
                            sanity: 4,
                        },
                    },
                },
            ],
        },

        forgotten_garden: {
            name: '遗忘花园',
            desc: '穹顶大厅侧边的一扇石门后，竟然是一片露天空间——但这不可能，因为整座书斋都在地下，或者另一个维度。天空是紫色的，飘着缓慢移动的云。荒废的石径两旁长满了你从未见过的植物——它们的叶片是半透明的，内部有微小的光点在流动，像是植物体内的星辰。当你经过时，有些花朵会像害羞的动物一样缓缓转头然后闭合。',
            visualPrompt: 'Impossible outdoor garden inside underground library. Purple sky. Translucent plants with flowing light points inside. Overgrown stone paths. Surreal serene atmosphere.',
            childrenIds: ['garden_terrace', 'wilted_greenhouse'],
            exits: [
                {
                    targetId: 'grand_atrium',
                    label: '返回穹顶大厅',
                    type: 'local',
                },
            ],
            items: [
                {
                    id: 'translucent_leaf',
                    name: '透光叶片',
                    desc: '半透明的叶片，内部光点仍在缓慢流动。握在手中能感到微弱的暖意。',
                    type: 'material',
                    rarity: 'standard',
                    discoveryThreshold: 8,
                },
            ],
            interactions: [
                {
                    desc: '抚摸半透明叶片',
                    results: {
                        timeCost: 10,
                        soundEffect: 'success',
                        narrative: '叶片内的光点随着你的触碰缓慢旋转，像一群被惊动却不逃走的萤火。一股不属于地下世界的清新气息短暂压过了纸张与蜡烛的味道。',
                        stateChange: {
                            sanity: 4,
                        },
                    },
                },
            ],
        },

        garden_terrace: {
            name: '露台',
            desc: '石质栏杆环绕的平台，面朝一片无边的紫色天空。远处有类似极光的光带在缓慢舞动。石凳旁有一棵巨大的发光树——树干是水晶质地的，树冠散发着温暖的琥珀色光芒。坐在树下时，你能听到极其微弱的音乐声，像是某种远古的摇篮曲。',
            visualPrompt: 'Stone terrace with balustrade overlooking purple void sky with aurora. Massive crystal tree with amber glow. Stone bench. Peaceful atmosphere.',
            interactions: [
                {
                    desc: '在发光树下休息',
                    results: {
                        timeCost: 60,
                        soundEffect: 'success',
                        narrative: '树冠的光芒在你坐下时变得更亮。温暖如同阳光般包裹着你。你的眼皮变得沉重，在半梦半醒间听到了母亲的声音——或者是你希望听到的声音。醒来时，伤痛和恐惧都减轻了许多。',
                        stateChange: {
                            sanity: 20,
                            hp: 15,
                        },
                    },
                },
            ],
        },

        wilted_greenhouse: {
            name: '枯萎温室',
            desc: '玻璃穹顶的温室，但玻璃上布满了蛛网般的裂纹。里面的大部分植物已经枯萎化石化了，唯独中央的一株植物依然存活——它没有根，悬浮在半空中，花瓣是由凝固的光线构成的。它的颜色每隔几秒就变换一次，每种颜色都伴随着不同的情绪波动：红色是愤怒，蓝色是悲伤，金色是……希望？',
            visualPrompt: 'Cracked glass greenhouse. Fossilized dead plants. One floating plant alive in center with petals made of solidified light, cycling through colors. Emotional atmosphere.',
            items: [
                {
                    id: 'light_dew',
                    name: '光花露水',
                    desc: '从光之花瓣上收集的露水。闪烁着微弱的金色光芒。恢复 30 点 HP。',
                    type: 'consumable',
                    rarity: 'standard',
                    discoveryThreshold: 10,
                    quantity: 2,
                    effects: [['heal_hp', 30]],
                },
            ],
            interactions: [
                {
                    desc: '靠近光之花',
                    results: {
                        timeCost: 10,
                        soundEffect: 'success',
                        narrative: '花瓣切换到蓝色——一股深沉的悲伤如同浪潮般冲击着你。你想起了所有失去的人和事。然后花瓣转为金色，悲伤被一种温柔的力量承接住了。你的眼角有些湿润，但心中的重压减轻了一些。',
                        stateChange: {
                            sanity: 10,
                        },
                    },
                },
                {
                    desc: '用容器承接花瓣滴落的露水',
                    results: {
                        timeCost: 20,
                        soundEffect: 'item_pickup',
                        narrative: '你举起一只空置的水晶瓶。光之花似乎理解了你的意图，花瓣微微倾斜，几滴凝固的光顺着叶脉滑落瓶中，化作一汪温暖的金色液体。花瓣随之转为一种你无法命名的颜色——你感到被信任了。',
                        stateChange: {
                            sanity: 2,
                            gain: [
                                {
                                    id: 'light_dew',
                                    name: '光花露水',
                                    desc: '从光之花瓣上收集的露水。闪烁着微弱的金色光芒。恢复 30 点 HP。',
                                    type: 'consumable',
                                    rarity: 'standard',
                                    effects: [['heal_hp', 30]],
                                },
                            ],
                        },
                    },
                },
            ],
        },

        dream_study: {
            name: '梦境书房',
            desc: '回声长廊的尽头通往一个半透明的空间——墙壁、地板、天花板都像是由凝固的雾气构成。这里的书不是用墨水写的，而是用梦境。翻开一本书，你不会看到文字——你会短暂地进入一段梦。有些梦是美好的。有些不是。',
            visualPrompt: 'Translucent room made of solidified mist. Books made of dreams instead of ink. Ethereal, dreamlike lighting. Floating, semi-transparent furniture.',
            childrenIds: ['hypnosis_chamber'],
            items: [
                {
                    id: 'dream_catalog',
                    name: '梦境目录',
                    desc: '半透明的页面，文字随触碰浮现。',
                    type: 'data',
                    rarity: 'organized',
                    discoveryThreshold: 5,
                    documentContent:
                        '第 1 架：关于飞行的梦（安全） 第 2 架：关于坠落的梦（轻度危险） 第 3 架：关于门后之物的梦（禁止翻阅） 第 4 架：[整页被撕掉] 第 5 架：关于醒来的梦——致那些忘记自己在做梦的人',
                },
                {
                    id: 'dream_weaver_tea',
                    name: '织梦花茶',
                    desc: '散发着安宁气息的茶包，能够抚平灵魂的褶皱。恢复 20 点理智。',
                    type: 'consumable',
                    rarity: 'standard',
                    discoveryThreshold: 10,
                    quantity: 2,
                    effects: [['heal_sanity', 20]],
                },
            ],
            interactions: [
                {
                    desc: '按目录抽取一枚安全的梦',
                    results: {
                        timeCost: 25,
                        soundEffect: 'success',
                        narrative: '你从第 1 架取下一本轻薄的小册。翻开瞬间，你短暂地梦见自己越过一片没有边际的书海。醒来时，指尖残留着微弱的暖意。',
                        stateChange: {
                            sanity: 8,
                            hp: 4,
                        },
                    },
                },
            ],
        },

        hypnosis_chamber: {
            name: '催眠室',
            desc: '一个完全隔音的椭圆形房间。正中央有一张精致的躺椅，上方悬挂着一个缓慢旋转水晶球。水晶球内部有某种流体在运动，形成催眠般的漩涡图案。墙上贴着一张告示：「入梦前请确认你知道自己的名字。醒来后请立刻说出来。」',
            visualPrompt: 'Sound-proof elliptical room. Ornate reclining chair. Rotating crystal ball with hypnotic vortex patterns. Warning sign on wall. Enclosed, intimate space.',
            interactions: [
                {
                    desc: '躺下并注视水晶球',
                    results: {
                        timeCost: 45,
                        soundEffect: 'ui_transition',
                        narrative: '漩涡将你的意识吸入。你梦见了一座没有尽头的阶梯——每一级台阶都是一个你做过的选择。在阶梯的某处，你看到了一扇没有选择过的门。门后透出温暖的光。你伸出手——然后醒来了。水晶球中的漩涡停止了转动，像是在等你做出某个决定。',
                        stateChange: {
                            sanity: 12,
                            hp: 8,
                        },
                    },
                },
                {
                    desc: '核对告示，低声重复自己的名字',
                    results: {
                        timeCost: 10,
                        soundEffect: 'success',
                        narrative: '你照着墙上的告示，一字一顿地说出自己的名字。水晶球内的漩涡在你念出最后一个音节时逆行了半圈——某种东西确认了你的存在，随后退回了深处。你的头脑前所未有地清醒。',
                        stateChange: {
                            sanity: 6,
                        },
                    },
                },
            ],
        },

        void_portal: {
            name: '虚空裂隙',
            desc: '在书斋的地底深处，有一个没有墙壁的房间，只有一片旋转的星空。星光扭曲，形成色彩斑斓的漩涡，每一个漩涡都通向不同的世界。站在边缘，你能感觉到无数个版本的自己在无数个漩涡中注视着你，等待你做出选择。',
            visualPrompt: 'Room with no walls, only swirling distorted starry sky. Colorful vortexes opening into different realities. Multiple reflections of the viewer in each vortex.',
            threatLevel: 18,
            items: [
                {
                    id: 'void_fragment_portal',
                    name: '纯粹虚空碎片',
                    desc: '从裂隙边缘凝结的原始能量结晶。触摸时会感到刺骨的寒冷。',
                    type: 'material',
                    rarity: 'abyssal',
                    discoveryThreshold: 20,
                },
            ],
            interactions: [
                {
                    desc: '凝视虚空',
                    results: {
                        timeCost: 10,
                        soundEffect: 'terrifying',
                        narrative: '无数个你，在无数个现实中，做出无数个选择。有一个版本的你没有来到这里。有一个版本的你再也没有离开。你眨眼，一切消失了。只有虚空本身还在低声呢喃。',
                        stateChange: {
                            sanity: -20,
                        },
                    },
                },
            ],
            exits: [
                {
                    targetId: 'grand_atrium',
                    label: '退回现实夹缝',
                    type: 'local',
                },
                {
                    targetId: 'time_fracture',
                    label: '攀回时间裂隙',
                    type: 'local',
                },
                {
                    targetId: 'abyss_corridor',
                    label: '回到深渊回廊',
                    type: 'local',
                },
                {
                    label: '步入旋转的星涡',
                    type: 'zone_transfer',
                },
            ],
        },
    },
};