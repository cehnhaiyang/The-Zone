import { SanctuaryTemplate } from '../../meta';

export const ZONE_ARCHIVE: SanctuaryTemplate = {
    id: "archive",
    name: "烛火书斋",
    background: "一个位于现实夹缝中的古老图书馆，时间在这里失去了意义。这里记录着过去、现在以及未曾发生的历史。但书斋并非被建造——而是被「记起」的。最后的馆长在意识到真相后选择留下，封印了最危险的知识，但图书馆本身拥有意志，不断将禁忌典籍从封印中释放。",
    topology: "以穹顶大厅为中枢，向四个方向放射出深邃的侧翼：知识长廊、禁书侧翼、星辰阶梯与深渊回廊。部分空间折叠，包含违背欧几里得几何的室外区域（遗忘花园）与意识空间（梦境书房）。",
    nodesCount: 28,
    initial: {
        dilationFactor: 0.5, // 时间流速减慢，适配异常空间
        entrance: "grand_atrium",
        morale: 100,
        population: 1,
        water: 50,
        food: 20,
        medicine: 10,
        electricity: 100,
        scraps: 100,
        erosion: 0
    },
    visualStyle: "Gothic Library, Mystical, Candlelight, Dark Academia",
    nodes: {
        "grand_atrium": {
            name: "穹顶大厅",
            desc: "一个位于现实夹缝中的古老图书馆核心。数千根蜡烛漂浮在空中，照亮了堆积如山的书籍。空气中弥漫着陈旧纸张、蜡烛燃烧和熏香的气味。书架似乎延伸到无限高处。偶尔，一本厚重的典籍会从高处飘落，在你面前翻开，展示一幅你从未见过的世界地图，然后化作你的面孔。远处书架间不时传来翻书的沙沙声，而漂浮的蜡烛集体闪烁时，书架的排列方式会悄然改变。穹顶上绘着褪色的星图，某些星座的位置每天都在变化。",
            visualPrompt: "Thousands of floating candles illuminating a grand gothic atrium. Mountains of books forming towers. Endless bookshelves extending upwards into darkness. Books slowly floating down from above. Faded star map on domed ceiling.",
            childrenIds: ["reading_corridor", "forbidden_wing", "astral_stairway"],
            exits: [
                { targetId: "void_portal", label: "走向虚空", type: 'local' },
                { targetId: "abyss_corridor", label: "深入黑暗回廊", type: 'local' },
                { targetId: "forgotten_garden", label: "推开侧门", type: 'local' }
            ],
            interactions: [
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
                                    id: "ash_memory",
                                    name: "灰烬记忆",
                                    desc: "一段不属于你的短暂回忆，记录着某次不可名状的恐惧。",
                                    type: "document",
                                    rarity: "common",
                                    documentContent: "“它不是在阅读，它是在咀嚼我们的思想。”"
                                }
                            ]
                        }
                    }
                }
            ]
        },
        "reading_corridor": {
            name: "知识长廊",
            desc: "一条两侧摆满高大书架的深邃走廊，漂浮的烛光和飘荡的尘埃营造出一种静谧的氛围。你可以听到翻书声和不知从何处传来的低语。地面的石砖上刻着各种语言的铭文，有些语言你确信已经失传了上千年。偶尔有一支无人持握的羽毛笔从你身边飘过，笔尖还在滴着金色的墨水。",
            visualPrompt: "Long corridor flanked by towering bookshelves. Dust motes dancing in candlelight. Floating quills. Stone floor with ancient inscriptions.",
            childrenIds: ["reading_room", "scriptorium", "meditation_chamber"],
        },
        "reading_room": {
            name: "公共阅览室",
            desc: "巨大的长木桌上铺满了古老的羊皮纸卷轴。有些书脊上的文字你无法辨认。这里的时间流速似乎比外界慢得多——你放下的茶杯中的涟漪需要数分钟才能平息。墙角的老式座钟指针以肉眼可见的缓慢速度转动。",
            visualPrompt: "Massive wooden tables covered in scrolls and tomes. Antique grandfather clock with impossibly slow pendulum. Quiet and dusty. Warm amber candlelight.",
            nodeNpc: {
                id: "ghost_librarian",
                name: "幽魂图书管理员",
                desc: "一个半透明的身影，仍在不知疲倦地整理着永不完结的书籍。他无法言语，但似乎愿意为你指引知识的方向。",
                gender: "both",
                visualPrompt: "A semi-transparent ghostly figure of an old librarian sorting books in a dimly lit gothic library.",
                initialState: {
                    attribute: { strength: 4, agility: 10, knowledge: 20, perception: 15 },
                    vital: { maxHp: 50, maxSanity: 100, maxStamina: 100, maxVigor: 100 },
                    inventory: [],
                    deck: [],
                    equipState: {
                        weapons: [null, null],
                        armors: [null, null, null],
                        accessories: [null, null, null, null, null]
                    },
                    trust: 50,
                    quest: {}
                },
                style: "tactical",
            },
            items: [
                {
                    id: 'ancient_scroll',
                    name: '古代卷轴',
                    desc: '用未知语言写就，纸张却不会腐烂。',
                    type: 'document',
                    rarity: 'rare',
                    discoveryThreshold: 15,
                    documentContent: "当星辰归位，帷幕将降。\n\n七个印记，七个门扉。\n\n最后的守望者将见证一切。\n\n[无法解读的符号]"
                },
                {
                    id: "scholar_note",
                    name: "学者手记",
                    desc: "夹在书中的便签",
                    type: "document",
                    rarity: "common",
                    discoveryThreshold: 5,
                    documentContent: "不要去读第三排第四本那本红皮书。里面的符号在看着我们。"
                }
            ],
            interactions: [
                {
                    desc: '研读古籍',
                    results: {
                        timeCost: 30,
                        soundEffect: 'success',
                        narrative: '你翻开一本记录历史的书籍，发现其中记载的事情正逐渐与你的记忆重合...你感觉思维变得敏捷。一阵温暖的风从书页间吹过，带着古老墨水的香气。',
                        stateChange: {
                            sanity: 5
                        }
                    }
                }
            ]
        },
        "scriptorium": {
            name: "静默抄写室",
            desc: "一排排倾斜的书桌上摆放着干涸的墨水瓶。空气中飘浮着金色的尘埃。在这里，即使没有人在，羽毛笔偶尔也会自动在羊皮纸上沙沙作响，记录着未发生的历史。你看到一支笔正在书写——内容是你明天将要做的事。",
            visualPrompt: "Rows of slanted wooden desks, dried ink wells. Golden dust in the air. Quill pens moving on their own on parchment. Prophetic text being written.",
            items: [
                {
                    id: 'ink_stained_page',
                    name: '墨染书页',
                    desc: '被墨水浸透的书页，隐约可见文字轮廓。',
                    type: 'document',
                    rarity: 'common',
                    discoveryThreshold: 5,
                    documentContent: "[墨迹下的文字]\n\n...它不是怪物，它是钥匙。\n\n不要相信你所看到的。\n\n真相在镜子的另一边...\n\n[其余部分无法辨认]"
                }
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
                                    ['当', '', '转动，第四个封印将破碎。不是由外向内，而是由内向', '']
                                ],
                                answer: ['银钥', '外']
                            },
                            hints: ['回忆一下你在图书馆中找到的其他碎片化信息，或者思考“门”与“锁”的意象。'],
                            restrictions: {
                                timeCostPerAttempt: 5,
                                maxAttempts: 3
                            },
                            penalties: {
                                sanity: 10
                            }
                        }
                    },
                    results: {
                        timeCost: 15,
                        soundEffect: 'glitch',
                        narrative: '羽毛笔按照你的意愿落下，但写出的文字流出鲜血。羊皮纸瞬间燃烧殆尽，只留下一片奇异的残骸。',
                        stateChange: {
                            sanity: -5,
                            gain: [
                                {
                                    id: "prophecy_fragment",
                                    name: "预言残片",
                                    desc: "曾经写有预言的羊皮纸灰烬。",
                                    type: "material",
                                    rarity: "epic"
                                }
                            ]
                        }
                    }
                }
            ],
            threatLevel: 5,
        },
        "meditation_chamber": {
            name: "冥想室",
            desc: "一个圆形的小房间，地板上画着复杂的几何图案。墙上挂着各种宗教和神秘学的符号，空气中残留着檀香的气息。这里异常安静，甚至连你自己的心跳声都清晰可闻。蒲团上还留着上一位冥想者的体温——但据说最后一位馆长已经消失了很久。",
            visualPrompt: "Small circular room, intricate geometric patterns on the floor. Walls adorned with religious and occult symbols. Warm cushion. Incense smoke trails.",
            items: [
                {
                    id: 'meditation_beads',
                    name: '静念珠',
                    desc: '木质念珠，握住时内心会平静。',
                    type: 'accessory',
                    rarity: 'common',
                    discoveryThreshold: 15,
                    effects: [['maxSanity', 5]]
                },
                {
                    id: 'incense_bundle',
                    name: '安神香',
                    desc: '燃烧时能平复心神。恢复25点理智。',
                    type: 'consumable',
                    rarity: 'common',
                    discoveryThreshold: 5,
                    effects: [['heal_sanity', 25]]
                }
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
                            hp: 10
                        }
                    }
                }
            ]
        },
        "forbidden_wing": {
            name: "禁书侧翼",
            desc: "这里的书架被生锈的铁链锁住，有些书本被浸泡在福尔马林瓶中，有的甚至还在跳动。此区域弥漫着不安的能量，灯光在此处变成了冰冷的蓝色。地面上有拖拽的痕迹——不是人的脚印，而是书脊留下的刮痕，仿佛这些书自行移动过。有时铁链会嘎吱作响，当你猛然回头时，所有书脊的文字似乎都在直视你。",
            visualPrompt: "Locked iron bookshelves with chains. Books preserved in fluid jars, some pulsating. Cold blue magical aura. Drag marks on floor from moving books.",
            threatLevel: 10,
            childrenIds: ["archive_vault", "alchemy_lab", "ritual_circle", "binding_chamber", "ink_well", "curator_study"],
        },
        "archive_vault": {
            name: "禁忌书库",
            desc: "沉重的铁门保护着最核心的秘密。这里的每一本书都在窃窃私语，声波甚至让空气产生了轻微的扭曲。你能感觉到知识——原始的、未经人类理解过滤的知识——如同物理压力般压在你的颅骨上。",
            visualPrompt: "Heavy iron vault. Books whispering and causing air distortion. Visible sound waves. Oppressive atmosphere.",
            items: [
                {
                    id: 'forbidden_tome',
                    name: '禁忌之书',
                    desc: '封面没有任何文字，但触摸时会听到低语。',
                    type: 'document',
                    rarity: 'epic',
                    discoveryThreshold: 20,
                    documentContent: "[这本书的内容似乎会根据读者而变化]\n\n你看到的是：\n\n'门扉不是通往外界，而是通往内心。\n\n当你凝视深渊时，\n深渊也在凝视着你。\n\n但如果你拥抱深渊，\n深渊将为你让路。'"
                },
                {
                    id: 'librarian_cloak',
                    name: '守望者斗篷',
                    desc: '散发着陈旧纸张气味的黑色斗篷，能偏转认知的攻击。',
                    type: 'armor',
                    rarity: 'epic',
                    defense: 5,
                    maxUses: 20,
                    discoveryThreshold: 25
                }
            ],
            interactions: [
                {
                    desc: '阅读禁书',
                    results: {
                        timeCost: 120,
                        soundEffect: 'glitch',
                        narrative: '文字在眼前扭曲变形，你的大脑被强行塞入了一些禁忌的启示。回过神来时，你发现自己已经用指甲在木桌上刻下了一个你不认识的符号。',
                        stateChange: {
                            sanity: -15,
                            gain: [
                                {
                                    id: 'lucid_elixir',
                                    name: '清醒药剂',
                                    desc: '淡蓝色液体，能暂时恢复40点理智。',
                                    type: 'consumable',
                                    rarity: 'rare',
                                    effects: [['heal_sanity', 40]]
                                }
                            ]
                        }
                    }
                }
            ],
            threatLevel: 15,
        },
        "alchemy_lab": {
            name: "炼金实验室",
            desc: "玻璃器皿和蒸馏装置占据了大部分空间。架子上摆满了各种颜色的液体和粉末。最奇异的是中央的烧瓶——里面的液体在没有加热的情况下持续沸腾，冒出的蒸汽凝结成微小的、转瞬即逝的人脸。",
            visualPrompt: "Cluttered laboratory with glassware, distillation apparatus. Central flask with self-boiling liquid producing face-shaped steam. Alchemical charts on walls.",
            items: [
                {
                    id: 'healing_potion',
                    name: '治疗药水',
                    desc: '冒着气泡的绿色液体。恢复30点HP。',
                    type: 'consumable',
                    rarity: 'common',
                    discoveryThreshold: 10,
                    effects: [['heal_hp', 30]]
                }
            ],
            interactions: [
                {
                    desc: '研究炼金笔记并尝试合成',
                    requirements: {
                        puzzleSolved: {
                            title: '蒸馏序列',
                            lore: '羊皮纸上记录着斐波那契数列般的炼金反应温度变化规律，其中有一处被墨水遮盖：2, 3, 5, 8, [?], 21。你需要选择正确的温度试管。',
                            body: {
                                type: 'choice',
                                body: ['8', '11', '13', '15'],
                                answer: '13'
                            },
                            hints: ['观察相邻两个数字的关系，前两个数字之和等于下一个。'],
                            restrictions: {
                                timeCostPerAttempt: 5,
                                maxAttempts: 3
                            },
                            penalties: {
                                hp: 5,
                                sanity: 5
                            }
                        }
                    },
                    results: {
                        timeCost: 45,
                        soundEffect: 'success',
                        narrative: '笔记最后一页写着："终于成功了。但代价是什么？我的手..." 随着你正确推导了序列，烧瓶内的液体骤然凝固，化为一颗散发着红光的晶体。',
                        stateChange: {
                            gain: [
                                {
                                    id: 'philosophers_stone_fragment',
                                    name: '贤者之石碎片',
                                    desc: '散发着微光的红色晶体，蕴含着神秘的力量。',
                                    type: 'material',
                                    rarity: 'epic'
                                }
                            ]
                        }
                    }
                }
            ]
        },
        "ritual_circle": {
            name: "仪式密室",
            desc: "地板上用银粉画着一个巨大的魔法阵，中心有一个石制祭坛。墙上的壁画描绘着某种仪式，参与者的面孔被故意抹去了。银粉线条在你靠近时微微发光，像是在识别来者的身份。",
            visualPrompt: "Large magic circle drawn in silver powder on the floor, glowing at edges. Stone altar with dark stains. Murals of faceless figures performing a ritual.",
            items: [
                {
                    id: 'ritual_dagger',
                    name: '仪式匕首',
                    desc: '刀刃上刻着古老的符文。',
                    type: 'weapon',
                    rarity: 'rare',
                    discoveryThreshold: 15,
                    weaponType: 'dagger',
                    meleeDamage: 5,
                    rangeDamage: 0,
                    maxUses: 8
                },
                {
                    id: 'blessed_water',
                    name: '祝圣之水',
                    desc: '装在水晶瓶中的清水，散发着柔和的光芒。恢复25点理智。',
                    type: 'consumable',
                    rarity: 'rare',
                    discoveryThreshold: 10,
                    effects: [['heal_sanity', 25]]
                }
            ],
            interactions: [
                {
                    desc: '检查祭坛',
                    results: {
                        timeCost: 20,
                        soundEffect: 'glitch',
                        narrative: '祭坛上的痕迹是血——但已经干涸了不知多少年。奇怪的是，你感受不到任何邪恶的气息。祭坛底部刻着一行小字：「以血封印，以血解封。此为馆长之誓。」',
                        stateChange: {
                            sanity: -5
                        }
                    }
                }
            ],
            threatLevel: 5,
        },
        "binding_chamber": {
            name: "封印室",
            desc: "一个六边形的房间，每面墙壁都被厚重的铁链覆盖。铁链的交汇中心悬挂着一本巨大的书——它的封面是活体皮肤，正在缓慢地呼吸。书页偶尔翻动，每翻一页，房间里的温度就下降一度。地面上的封印阵正在缓慢褪色。",
            visualPrompt: "Hexagonal room covered in iron chains. Massive book suspended in center with living skin cover. Breathing motion. Fading seal circle on the floor. Frost forming on chains.",
            interactions: [
                {
                    desc: '触碰活体典籍',
                    results: {
                        timeCost: 10,
                        soundEffect: 'scare',
                        narrative: '你的手指刚触及封面，书猛地翻开——扉页上写着你的名字和出生日期，以及一个你还没有经历的死亡日期。铁链发出尖锐的金属碰撞声，你本能地缩回了手。',
                        stateChange: {
                            sanity: -12
                        }
                    }
                }
            ],
            threatLevel: 20,
            specificEnemy: {
                id: "living_codex",
                name: "苏醒的典籍",
                desc: "铁链断裂，那本巨大的书展开了。书页如同无数只翅膀般张开，封面裂开化为颚骨，从书脊中伸出由墨水凝结的触手。它用所有已知和未知语言同时尖叫。",
                visualPrompt: "A giant monstrous book standing upright, pages flapping like wings, its leather cover splitting into a jawed maw, with tentacles made of black ink writhing from its spine.",
                initialState: {
                    attribute: { strength: 10, agility: 5, knowledge: 15, perception: 10 },
                    equipState: {
                        weapons: [null, null],
                        armors: [null, null, null],
                        accessories: [null, null, null, null, null]
                    }
                },
                intentDistribution: {
                    attack: 40,
                    debuff: 40,
                    buff: 10,
                    observe: 10
                },
                nextIntent: {
                    type: 'attack',
                    desc: '疯狂翻动书页释放知识的锐利边缘'
                },
                lootTable: [
                    {
                        id: 'living_ink',
                        name: '活体墨水',
                        desc: '在瓶中不断蠕动，似乎有自己的意识。',
                        type: 'material',
                        rarity: 'epic',
                        dropProbability: 1.0
                    }
                ]
            },
            enemySpawnCondition: 'on_interact',
        },
        "ink_well": {
            name: "墨池深渊",
            desc: "一个圆形的下沉式空间，中央是一个巨大的石质水池，里面盛满了深不见底的黑色墨水。墨水表面平静如镜，但倒映出的不是天花板——而是一片缀满陌生星辰的夜空。偶尔有气泡从深处升起，破裂时会发出微弱的低语。",
            visualPrompt: "Sunken circular chamber. Large stone pool filled with impossibly deep black ink. Ink surface reflects alien starry sky instead of ceiling. Occasional bubbles rising.",
            items: [
                {
                    id: 'ink_stained_page_2',
                    name: '残破的墨染书页',
                    desc: '被墨水浸透的残页，隐约可见不可名状的轮廓。',
                    type: 'document',
                    rarity: 'common',
                    discoveryThreshold: 10,
                    documentContent: "[墨迹下的文字]\n\n...它不是怪物，它是钥匙。\n\n不要相信你所看到的。\n\n真相在镜子的另一边...\n\n[其余部分无法辨认]"
                }
            ],
            interactions: [
                {
                    desc: '凝视墨水表面',
                    results: {
                        timeCost: 15,
                        soundEffect: 'whisper',
                        narrative: '你的倒影在墨水中缓缓抬起手——但你没有动。它指向你身后，嘴唇无声地翕动着，仿佛在警告什么。你猛地回头，什么也没有。再看墨水时，倒影已经恢复了正常。你从池边拾起了一块凝固的墨核。',
                        stateChange: {
                            sanity: -8,
                            gain: [
                                {
                                    id: 'abyssal_ink_core',
                                    name: '深渊墨核',
                                    desc: '触感冰凉的纯黑色结晶体，内部似乎封存着星空。',
                                    type: 'material',
                                    rarity: 'rare'
                                }
                            ]
                        }
                    }
                }
            ],
            threatLevel: 15,
        },
        "curator_study": {
            name: "馆长书房",
            desc: "一间被时间遗忘的私人书房。桌上的茶还是温的，但灰尘的厚度表明已经无人踏足数十年。书架上的书不是按字母排列，而是按某种你无法理解的逻辑——也许是按照危险程度。壁炉中的火焰是蓝色的，不散发任何热量。",
            visualPrompt: "Private study frozen in time. Warm tea on dusty desk contradiction. Blue cold fire in fireplace. Books arranged by danger level. Ancient leather chair.",
            items: [
                {
                    id: 'curator_confession',
                    name: '馆长忏悔书',
                    desc: '最后一任馆长的日记，记录着不为人知的真相。',
                    type: 'document',
                    rarity: 'epic',
                    discoveryThreshold: 15,
                    documentContent: "我犯了一个错误。\n\n我以为我在保护知识，但我实际上在保护一个谎言。\n\n这个图书馆不是知识的宝库，而是一个监狱。\n\n每一本书都是一个牢笼，每一个读者都是狱卒。\n\n现在，最后的守望者来了。\n\n他会做出选择，而我只能祈祷..."
                }
            ],
            interactions: [
                {
                    desc: '翻阅馆长的桌面笔记',
                    results: {
                        timeCost: 20,
                        soundEffect: 'text',
                        narrative: '笔记最后的日期是「无」。内容写道：「我已与图书馆达成协议。它保护访客的安全，我保护它的秘密。镜像图书馆不可进入——那里的知识会让你忘记自己是谁。但如果你必须进去...你需要悖论之匙。抽屉的密码与倒退的时间有关。」'
                    }
                },
                {
                    desc: '尝试解开书桌暗格的密码锁',
                    requirements: {
                        puzzleSolved: {
                            title: '馆长的密锁',
                            lore: '桌面上雕刻着一行铭文提示：“倒退着凝视深渊”。暗格的金属圆环上排列着杂乱无章的英文字母，刻着"diov"。',
                            body: {
                                type: 'type',
                                answer: 'void'
                            },
                            hints: ['深渊的英文拼写是什么？再结合“倒退”的提示。'],
                            restrictions: {
                                timeCostPerAttempt: 5
                            },
                            penalties: {
                                sanity: 5
                            }
                        }
                    },
                    results: {
                        timeCost: 15,
                        soundEffect: 'success',
                        narrative: '齿轮发出清脆的咬合声，暗格弹开了。里面没有别的东西，只有一把边缘似乎在不断扭曲重组的奇特钥匙。伴随着暗格的开启，书架后方传来沉重的摩擦声，一条原本不存在的暗道似乎被打通了。',
                        stateChange: {
                            gain: [
                                {
                                    id: 'paradox_key',
                                    name: '悖论之钥',
                                    desc: '一把违反物理定律的钥匙，可以打开任何锁。',
                                    type: 'material',
                                    rarity: 'epic'
                                }
                            ],
                            unlock: [
                                ['abyss_corridor', '进入书架后的暗道'] // 动态解锁通往深渊回廊的捷径
                            ]
                        }
                    }
                }
            ],
        },
        "astral_stairway": {
            name: "星辰阶梯",
            desc: "螺旋向上延伸的石头阶梯，周围漂浮着微缩的星系幻象。每上一级台阶，重力就似乎减轻了一分。阶梯的扶手上长满了发光的苔藓，它们的光芒与漂浮的星系保持着相同的脉动节奏。",
            visualPrompt: "Spiral stone staircase, floating illusions of miniature galaxies. Anti-gravity effects. Luminescent moss on railings pulsing in rhythm with galaxies.",
            childrenIds: ["observatory", "clock_tower", "celestial_map_room", "time_fracture"],
        },
        "observatory": {
            name: "观星台",
            desc: "一个圆顶房间，天花板是透明的，可以看到外面的星空。但星座的位置是错的，有些星星的颜色不应该存在。房间中央有一台古老的望远镜，镜筒上刻满了微小的符文。",
            visualPrompt: "Domed room with transparent ceiling revealing alien constellations with impossible colors. Ancient rune-inscribed telescope in center. Star charts on walls.",
            items: [
                {
                    id: 'star_chart',
                    name: '星图',
                    desc: '描绘着未知星座的古老星图。',
                    type: 'document',
                    rarity: 'rare',
                    discoveryThreshold: 10,
                    documentContent: "[星图上的注释]\n\n第七星归位之日，\n门扉将开启。\n\n守望者将面临选择：\n\n终结、开始、还是超越...\n\n[下方用血写着：'选择已定']"
                },
                {
                    id: 'astral_lens',
                    name: '星光透镜',
                    desc: '可以看见常人无法察觉的事物。',
                    type: 'accessory',
                    rarity: 'rare',
                    discoveryThreshold: 20,
                    effects: [['perception', 3]]
                }
            ],
            interactions: [
                {
                    desc: '使用望远镜',
                    results: {
                        timeCost: 30,
                        soundEffect: 'scare',
                        narrative: '你透过望远镜观察星空。起初一切正常，然后你看到了...那不是星星。那是眼睛。无数只眼睛，在黑暗中注视着你。其中一只眨了一下。',
                        stateChange: {
                            sanity: -12
                        }
                    }
                }
            ],
            threatLevel: 10,
        },
        "clock_tower": {
            name: "永恒钟楼",
            desc: "巨大的齿轮在虚空中缓慢咬合，发出震动灵魂的轰鸣。透过齿轮的缝隙，你可以看到过去和未来的残影——某一瞬间，你看到了自己站在这里，但穿着不同的衣服，脸上带着你从未有过的表情。",
            visualPrompt: "Massive gears grinding against cosmic void. No clock face, just heavy celestial machinery. Ghostly afterimages of alternate timelines visible between gears.",
            interactions: [
                {
                    desc: '聆听齿轮声与解开时间悖论',
                    requirements: {
                        puzzleSolved: {
                            title: '时间之谜',
                            lore: '控制台的黄铜面板上刻着一行字：“我没有过去，但我有未来。我没有嘴巴，但我能吞没一切。我是谁？”',
                            body: {
                                type: 'type',
                                answer: '明天'
                            },
                            hints: ['思考时间的流向，什么东西永远在你前方，却从未真正到来？'],
                            restrictions: {
                                timeCostPerAttempt: 5
                            },
                            penalties: {
                                sanity: 5
                            }
                        }
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
                                    rarity: 'rare'
                                }
                            ]
                        }
                    }
                }
            ],
            threatLevel: 5,
        },
        "celestial_map_room": {
            name: "星穹制图室",
            desc: "房间中央悬浮着一台精密的天球仪，由数百个嵌套的金属环组成，每一环代表一个天体的运行轨道。天球仪在无人触碰的情况下缓慢自转，金属环上的宝石在黑暗中闪烁，精确地重现着头顶异常星空的布局。地面散落着制图工具和未完成的星图。",
            visualPrompt: "Floating armillary sphere made of hundreds of nested metal rings with gemstones. Self-rotating. Scattered cartography tools and star maps on the floor. Deep blue ambient light.",
            items: [
                {
                    id: 'celestial_fragment',
                    name: '天体碎片',
                    desc: '散发着星光的陨石碎片。',
                    type: 'material',
                    rarity: 'epic',
                    discoveryThreshold: 25
                },
                {
                    id: "star_calculation",
                    name: "星辰计算手稿",
                    desc: "密密麻麻的数学公式和天文符号。",
                    type: "document",
                    rarity: "rare",
                    discoveryThreshold: 15,
                    documentContent: "所有的计算都指向同一个结论：我们观测到的星空不是真实的天空——这是一面'天幕'，一个巨大的壳层结构。而壳层之外的东西——我不敢计算它的质量。因为计算结果表明，它是活的，而且正在靠近。"
                }
            ],
            interactions: [
                {
                    desc: '触碰天球仪',
                    results: {
                        timeCost: 10,
                        soundEffect: 'glitch',
                        narrative: '你轻轻碰了一下最外层的金属环，整台天球仪突然加速旋转。宝石的光芒汇聚成一束激光般的光柱，在天花板上投射出一张三维星图。光柱照亮之处，你看到了你的位置——一个即将被某颗正在坠落的恒星吞没的微小光点。',
                        stateChange: {
                            sanity: -5
                        }
                    }
                }
            ],
        },
        "time_fracture": {
            name: "时间裂隙",
            desc: "台阶的尽头不是房间——而是一道巨大的裂缝，像是现实本身被撕开了一道口子。裂缝的边缘不断地结晶和溶解。透过裂缝，你可以同时看到黎明和黄昏，看到同一片森林在春天和冬天之间不断切换。站在这里，你会感到一种奇异的平静——时间在这里失去了意义，也就失去了催逼你的力量。",
            visualPrompt: "Reality crack at the top of the stairs. Crystal-like edges forming and dissolving. Through the crack: simultaneous dawn/dusk, cycling seasons. Peaceful but surreal atmosphere.",
            items: [
                {
                    id: 'time_hourglass',
                    name: '时间沙漏',
                    desc: '沙子向上流动的沙漏。',
                    type: 'material',
                    rarity: 'epic',
                    discoveryThreshold: 30
                },
                {
                    id: 'memory_crystal_fracture',
                    name: '裂隙记忆水晶',
                    desc: '蕴含着某个时间点记忆的水晶，触摸时会看到片段。',
                    type: 'material',
                    rarity: 'rare',
                    discoveryThreshold: 20
                }
            ],
            interactions: [
                {
                    desc: '将手伸进裂缝',
                    results: {
                        timeCost: 5,
                        soundEffect: 'distortion',
                        narrative: '你的手指穿过裂缝边缘，感到一阵刺骨的寒冷，然后是灼热，然后——什么也没有。你抽回手时，指甲似乎比刚才长了一些。或者短了。你分不清。但你的心跳平稳了下来，恐惧被一种深层的宁静取代。',
                        stateChange: {
                            sanity: 8,
                            hp: 5
                        }
                    }
                }
            ],
            threatLevel: 10,
            exits: [
                { targetId: "void_portal", label: "坠入下方的虚空", type: 'local' }
            ]
        },
        "abyss_corridor": {
            name: "深渊回廊",
            desc: "穹顶大厅背面有一道不引人注目的拱门，通向一条没有蜡烛的漆黑走廊。这里的黑暗像是有实体的——你能感觉到它贴着你的皮肤流动。墙壁上的书架里塞满了没有书名的书。你走过的地方会在身后留下一串微弱的脚印光痕，几秒后消失。有时你能听到比自己实际步伐快了半拍的幽灵足音，甚至感觉黑暗中有东西触碰你的肩膀，回头却只能看到无名书坠落。",
            visualPrompt: "Pitch-black corridor with tangible darkness. Nameless books on shelves. Faint glowing footprints fading behind the viewer. Archway entrance from atrium.",
            threatLevel: 15,
            childrenIds: ["mirror_library", "memory_theater", "paradox_room", "echo_gallery"],
            exits: [
                { targetId: "grand_atrium", label: "返回穹顶大厅", type: 'local' }
            ],
        },
        "mirror_library": {
            name: "镜像图书馆",
            desc: "这间图书馆的一面墙是一面巨大的镜子。镜中的房间和现实完全一致——除了一个细节：镜中的书架上有一些现实中不存在的书。那些书的书脊闪着微弱的银光，书名是镜像反写的。镜面偶尔会泛起涟漪，像是液体。镜像图书馆的入口似乎被一层晶莹的力场封锁，表面流动着悖论般的符文。",
            visualPrompt: "Library room with one wall being a massive mirror. Reflection shows extra books with silver spines. Mirror surface occasionally ripples like liquid. Reversed text visible.",
            items: [
                {
                    id: "mirror_warning",
                    name: "镜前遗言",
                    desc: "镜框边缘刻着的文字。",
                    type: "document",
                    rarity: "common",
                    discoveryThreshold: 5,
                    documentContent: "第七条规则：不要在镜中阅读超过三页。不要回应镜中的自己。不要接受镜中递出的任何东西。——馆长"
                }
            ],
            interactions: [
                {
                    desc: '使用悖论之匙触碰镜面',
                    requirements: {
                        items: ["paradox_key"]
                    },
                    results: {
                        timeCost: 5,
                        soundEffect: 'whisper',
                        narrative: '有了悖论之匙，你的指尖轻易穿入了液态的镜面。镜中的你后退了一步，缓缓点头，它伸出了手，将一本带着银色光芒的手稿递给了你，然后化作虚无。',
                        stateChange: {
                            gain: [
                                {
                                    id: 'mirror_manuscript',
                                    name: '镜面手稿',
                                    desc: '只有在镜子里才能看清内容的书稿。',
                                    type: 'document',
                                    rarity: 'epic',
                                    documentContent: "[镜中文字]\n\n当你阅读这些文字时，\n镜中的你也在阅读。\n\n但你们读到的内容不同。\n\n镜中的你知道真相。\n\n而你，还不知道..."
                                }
                            ]
                        }
                    }
                },
                {
                    desc: '强行触摸力场并打碎镜面',
                    results: {
                        timeCost: 5,
                        soundEffect: 'distortion',
                        narrative: '你的指尖刚触碰到力场，一股强烈的撕裂感传来。镜子瞬间炸裂，但碎片并没有落地，而是汇聚成了一个与你一模一样的暗影！镜中的你冷笑着，用唇语说了一个词：“留下”。',
                        stateChange: {
                            sanity: -10
                        }
                    }
                }
            ],
            threatLevel: 20,
            specificEnemy: {
                id: 'mirror_stalker',
                name: '镜中倒影',
                desc: '它有着和你一样的面容，但眼神中充满了恶意的空洞。它的动作是你几秒前的镜像延迟。',
                visualPrompt: 'A terrifying dark mirror reflection of the player stepping out of shattered glass, composed of shadow and silver shards.',
                initialState: {
                    attribute: { strength: 8, agility: 12, knowledge: 10, perception: 15 },
                    equipState: {
                        weapons: [null, null],
                        armors: [null, null, null],
                        accessories: [null, null, null, null, null]
                    }
                },
                intentDistribution: {
                    attack: 50,
                    debuff: 30,
                    buff: 10,
                    observe: 10
                },
                nextIntent: {
                    type: 'debuff',
                    desc: '模仿你的动作产生认知迟缓，剥夺专注'
                },
                lootTable: [
                    {
                        id: 'shattered_mirror_shard',
                        name: '破碎镜片',
                        desc: '极其锋利的碎片，映射出的画面永远是黑白的。',
                        type: 'material',
                        rarity: 'rare',
                        dropProbability: 1.0
                    }
                ]
            },
            enemySpawnCondition: 'on_interact',
        },
        "memory_theater": {
            name: "记忆剧场",
            desc: "一个圆形的小剧场，中央有一把孤零零的天鹅绒座椅。座椅面向一面空白的白色幕布。当你坐下时——你将不再是你自己。你将成为图书馆中某个曾经到访者的一段记忆的观众，或者参与者。剧场的穹顶上画着张开的眼睛。",
            visualPrompt: "Small circular amphitheater. Single velvet chair facing a blank white screen. Painted eyes on domed ceiling. Intimate yet unsettling atmosphere.",
            items: [
                {
                    id: 'memory_crystal_theater',
                    name: '剧场记忆水晶',
                    desc: '蕴含着他人深刻记忆的水晶，触摸时会看到完整的片段。',
                    type: 'material',
                    rarity: 'rare',
                    discoveryThreshold: 15
                }
            ],
            interactions: [
                {
                    desc: '坐在椅子上',
                    results: {
                        timeCost: 45,
                        soundEffect: 'whisper',
                        narrative: '幕布亮起。你看到一个穿着长袍的人正在书架间行走——这是馆长的记忆。他在封印那本活体典籍时流着泪说："我很抱歉。但你已经不是一本书了，你是一个存在。我无权决定你的命运，但我必须保护那些不知情的人。" 画面在一声心碎的叹息中消散。',
                        stateChange: {
                            sanity: 5
                        }
                    }
                }
            ],
        },
        "paradox_room": {
            name: "悖论之间",
            desc: "这个房间违反了欧几里得几何的所有规则。四面墙壁围成的空间比从外面看到的大得多。天花板同时是另一个方向的地板——你能看到自己倒立在上方，像镜像但延迟了两秒。房间中央漂浮着一个不断折叠又展开的多面体，它有的面朝向你时是三角形，转过去后变成了正方形。",
            visualPrompt: "Non-Euclidean room larger inside than outside. Ceiling is simultaneous floor with delayed reflection. Floating polytope constantly folding and unfolding. Mind-bending geometry.",
            threatLevel: 20,
            items: [
                {
                    id: 'void_fragment_paradox',
                    name: '不稳定虚空碎片',
                    desc: '从空间扭曲处凝结的结晶。触摸时会感到刺骨的寒冷。',
                    type: 'material',
                    rarity: 'cursed',
                    discoveryThreshold: 25
                },
                {
                    id: 'paradox_pendant',
                    name: '悖论吊坠',
                    desc: '装备时感知大幅提升，但会持续削弱你的理智本源。',
                    type: 'accessory',
                    rarity: 'cursed',
                    discoveryThreshold: 20,
                    effects: [
                        ['perception', 8],
                        ['maxSanity', -15]
                    ]
                }
            ],
            interactions: [
                {
                    desc: '触碰多面体',
                    results: {
                        timeCost: 5,
                        soundEffect: 'scare',
                        narrative: '你的手穿过了多面体的一个面——手腕以下消失了。你感到手指触碰到了某个柔软的、温暖的、正在呼吸的东西。当你抽回手时，指尖沾着一种你从未见过颜色的液体。你的脑海中闪过一个不属于这个宇宙的真理，然后它消失了，只留下空洞的恐惧。',
                        stateChange: {
                            sanity: -20
                        }
                    }
                }
            ],
        },
        "echo_gallery": {
            name: "回声长廊",
            desc: "一条弧形的长走廊，墙壁是某种声学材料。你发出的任何声音都会被反射回来——但内容会被微妙地修改。一声咳嗽会变成一声叹息，一句问候会变成一句回答——不是echo，而是某种存在在与你对话。墙上挂着空白的画框。",
            visualPrompt: "Curved gallery with acoustic walls. Empty picture frames on walls. Sound distortion visible as color ripples. Ethereal and eerie atmosphere.",
            childrenIds: ["dream_study"],
            interactions: [
                {
                    desc: '对着走廊大喊',
                    results: {
                        timeCost: 5,
                        soundEffect: 'glitch',
                        narrative: '你喊出："有人在吗？" 回声传来——"一直都在。你只是不愿意听。" 那个声音温柔但疲倦，带着无尽的耐心。空白画框中短暂地闪过了一张模糊的面孔。',
                        stateChange: {
                            sanity: -3
                        }
                    }
                }
            ],
        },
        "forgotten_garden": {
            name: "遗忘花园",
            desc: "穹顶大厅侧边的一扇石门后，竟然是一片露天空间——但这不可能，因为整座书斋都在地下（或者另一个维度）。天空是紫色的，飘着缓慢移动的云。荒废的石径两旁长满了你从未见过的植物——它们的叶片是半透明的，内部有微小的光点在流动，像是植物体内的星辰。当你经过时，有些花朵会像害羞的动物一样缓缓转头然后闭合。",
            visualPrompt: "Impossible outdoor garden inside underground library. Purple sky. Translucent plants with flowing light points inside. Overgrown stone paths. Surreal serene atmosphere.",
            childrenIds: ["garden_terrace", "wilted_greenhouse"],
            exits: [
                { targetId: "grand_atrium", label: "返回穹顶大厅", type: 'local' }
            ]
        },
        "garden_terrace": {
            name: "露台",
            desc: "石质栏杆环绕的平台，面朝一片无边的紫色天空。远处有类似极光的光带在缓慢舞动。石凳旁有一棵巨大的发光树——树干是水晶质地的，树冠散发着温暖的琥珀色光芒。坐在树下时，你能听到极其微弱的音乐声，像是某种远古的摇篮曲。",
            visualPrompt: "Stone terrace with balustrade overlooking purple void sky with aurora. Massive crystal tree with amber glow. Stone bench. Peaceful atmosphere.",
            interactions: [
                {
                    desc: '在发光树下休息',
                    results: {
                        timeCost: 60,
                        soundEffect: 'heartbeat',
                        narrative: '树冠的光芒在你坐下时变得更亮。温暖如同阳光般包裹着你。你的眼皮变得沉重，在半梦半醒间听到了母亲的声音——或者是你希望听到的声音。醒来时，伤痛和恐惧都减轻了许多。',
                        stateChange: {
                            sanity: 20,
                            hp: 15
                        }
                    }
                }
            ],
        },
        "wilted_greenhouse": {
            name: "枯萎温室",
            desc: "玻璃穹顶的温室，但玻璃上布满了蛛网般的裂纹。里面的大部分植物已经枯萎化石化了，唯独中央的一株植物依然存活——它没有根，悬浮在半空中，花瓣是由凝固的光线构成的。它的颜色每隔几秒就变换一次，每种颜色都伴随着不同的情绪波动：红色是愤怒，蓝色是悲伤，金色是...希望？",
            visualPrompt: "Cracked glass greenhouse. Fossilized dead plants. One floating plant alive in center with petals made of solidified light, cycling through colors. Emotional atmosphere.",
            items: [
                {
                    id: "light_dew",
                    name: "光花露水",
                    desc: "从光之花瓣上收集的露水。闪烁着微弱的金色光芒。恢复30点HP。",
                    type: "consumable",
                    rarity: "common",
                    discoveryThreshold: 10,
                    effects: [['heal_hp', 30]]
                }
            ],
            interactions: [
                {
                    desc: '靠近光之花',
                    results: {
                        timeCost: 10,
                        soundEffect: 'success',
                        narrative: '花瓣切换到蓝色——一股深沉的悲伤如同浪潮般冲击着你。你想起了所有失去的人和事。然后花瓣转为金色，悲伤被一种温柔的力量承接住了。你的眼角有些湿润，但心中的重压减轻了一些。',
                        stateChange: {
                            sanity: 10
                        }
                    }
                }
            ],
        },
        "dream_study": {
            name: "梦境书房",
            desc: "回声长廊的尽头通往一个半透明的空间——墙壁、地板、天花板都像是由凝固的雾气构成。这里的书不是用墨水写的，而是用梦境。翻开一本书，你不会看到文字——你会短暂地进入一段梦。有些梦是美好的。有些不是。",
            visualPrompt: "Translucent room made of solidified mist. Books made of dreams instead of ink. Ethereal, dreamlike lighting. Floating, semi-transparent furniture.",
            childrenIds: ["hypnosis_chamber"],
            items: [
                {
                    id: "dream_catalog",
                    name: "梦境目录",
                    desc: "半透明的页面，文字随触碰浮现。",
                    type: "document",
                    rarity: "rare",
                    discoveryThreshold: 5,
                    documentContent: "第1架：关于飞行的梦（安全）\n第2架：关于坠落的梦（轻度危险）\n第3架：关于门后之物的梦（禁止翻阅）\n第4架：[整页被撕掉]\n第5架：关于醒来的梦——致那些忘记自己在做梦的人"
                },
                {
                    id: 'dream_weaver_tea',
                    name: '织梦花茶',
                    desc: '散发着安宁气息的茶包，能够抚平灵魂的褶皱。恢复20点理智。',
                    type: 'consumable',
                    rarity: 'common',
                    discoveryThreshold: 10,
                    effects: [['heal_sanity', 20]]
                }
            ],
        },
        "hypnosis_chamber": {
            name: "催眠室",
            desc: "一个完全隔音的椭圆形房间。正中央有一张精致的躺椅，上方悬挂着一个缓慢旋转水晶球。水晶球内部有某种流体在运动，形成催眠般的漩涡图案。墙上贴着一张告示：「入梦前请确认你知道自己的名字。醒来后请立刻说出来。」",
            visualPrompt: "Sound-proof elliptical room. Ornate reclining chair. Rotating crystal ball with hypnotic vortex patterns. Warning sign on wall. Enclosed, intimate space.",
            interactions: [
                {
                    desc: '躺下并注视水晶球',
                    results: {
                        timeCost: 45,
                        soundEffect: 'distortion',
                        narrative: '漩涡将你的意识吸入。你梦见了一座没有尽头的阶梯——每一级台阶都是一个你做过的选择。在阶梯的某处，你看到了一扇没有选择过的门。门后透出温暖的光。你伸出手——然后醒来了。水晶球中的漩涡停止了转动，像是在等你做出某个决定。',
                        stateChange: {
                            sanity: 12,
                            hp: 8
                        }
                    }
                }
            ],
        },
        "void_portal": {
            name: "虚空裂隙",
            desc: "在书斋的地底深处，有一个没有墙壁的房间，只有一片旋转的星空。星光扭曲，形成色彩斑斓的漩涡，每一个漩涡都通向不同的世界。站在边缘，你能感觉到无数个版本的自己在无数个漩涡中注视着你，等待你做出选择。",
            visualPrompt: "Room with no walls, only swirling distorted starry sky. Colorful vortexes opening into different realities. Multiple reflections of the viewer in each vortex.",
            items: [
                {
                    id: 'void_fragment_portal',
                    name: '纯粹虚空碎片',
                    desc: '从裂隙边缘凝结的原始能量结晶。触摸时会感到刺骨的寒冷。',
                    type: 'material',
                    rarity: 'cursed',
                    discoveryThreshold: 20
                }
            ],
            interactions: [
                {
                    desc: '凝视虚空',
                    results: {
                        timeCost: 10,
                        soundEffect: 'scare',
                        narrative: '无数个你，在无数个现实中，做出无数个选择。有一个版本的你没有来到这里。有一个版本的你再也没有离开。你眨眼，一切消失了。只有虚空本身还在低声呢喃。',
                        stateChange: {
                            sanity: -20
                        }
                    }
                }
            ],
            threatLevel: 15,
            exits: [
                { targetId: "grand_atrium", label: "退回现实夹缝", type: 'local' },
                { label: "跳入裂隙，前往未知", type: 'zone_transfer' }
            ]
        }
    }
}