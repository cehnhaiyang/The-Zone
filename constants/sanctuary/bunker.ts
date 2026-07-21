import { SanctuaryTemplate } from '../../meta';

export const ZONE_BUNKER: SanctuaryTemplate = {
    id: "bunker",
    name: "铁锈前哨",
    background: "一座废弃的地下军事防空洞，曾经是人类抵抗未知威胁的坚固阵地。如今，只剩下残骸、血迹和生锈的机器，以及昔日绝望防守的残酷烙印。更深的秘密隐藏在深层掩体中——军方曾在那里进行代号为「铁壁」的生化实验，试图利用异变组织样本开发武器。实验失败后，深层掩体被紧急封锁，所有参与人员被命令就地处决。但某些东西活了下来。",
    topology: "安保检查站中枢（1）；指挥区（7）：指挥中枢走廊 + 中央指挥室、安保监控室、机密通讯室、作战室、情报拦截室、审讯室；生活区（7）：生活区干道 + 士兵营房、战术食堂、重症隔离区、军用礼拜室、军官寝室、公共净水室；工程舱（5）：重装备走廊 + 聚变动力源、核心军械库、通风管控枢纽、废料处理池；深层掩体（8，锁定）：深层走廊 + 生化实验室、低温冻存室、中央数据中心、紧急逃生通道、训练场、高炉焚化室、零号收容单元；野战医务室（1）；主防爆门出口（1）",
    nodesCount: 30,
    visualStyle: "Military Bunker, Industrial, Rust, Cold War Aesthetics, Dim Lighting",
    initial: {
        dilationFactor: 1.0,
        entrance: "security_checkpoint",
        morale: 100,
        population: 1,
        water: 50,
        food: 20,
        medicine: 10,
        electricity: 100,
        scraps: 50,
        erosion: 0
    },
    nodes: {
        "security_checkpoint": {
            name: "安保检查站",
            desc: "坚固的混凝土掩体入口，厚重的防弹玻璃已经布满龟裂，甚至沾染着干涸的黑色痕迹。这里连接着前哨站的各个重要区块。生锈的安检机仍然亮着微弱的黄灯，警报器早已哑火。远处的黑暗中偶尔传来沉重的回声，像是有什么重物在地板上拖行。安检机有时会毫无预兆地亮起绿灯并发出一声短哔，仿佛批准了某个不可见的通行者。",
            visualPrompt: "Concrete checkpoint, bulletproof glass with spider-web cracks and dark stains. Dull yellow lights, rusted turnstiles. Faded color-coded floor lines.",
            childrenIds: ["command_sector", "living_quarters", "engineering_bay"],
            exits: [
                { targetId: "blast_door", label: "检查防爆门", type: 'local' },
                { targetId: "field_medical", label: "前往医务室", type: 'local' }
            ]
        },
        "command_sector": {
            name: "指挥中枢走廊",
            desc: "铺着防滑钢板的走廊，通往前哨站的大脑。两侧的墙上贴满褪色的战术海报，以及被红色记号笔划掉的名字列表。顶部有一排已经不亮了的状态指示灯——只有最后一盏还在闪烁暗红色的光，像是在执行某个永远不会结束的报警程序。走廊深处似乎偶尔会传来有节奏的皮靴声，但仔细聆听时又会消失。",
            visualPrompt: "Steel-plated floor corridor. Faded tactical posters, lists of names crossed out in red marker. Status lights mostly dead, one blinking red.",
            threatLevel: 5,
            childrenIds: ["command_center", "surveillance_room", "comms_room", "war_room", "intel_room", "interrogation_room"]
        },
        "command_center": {
            name: "中央指挥室",
            desc: "废弃的地下防空洞的核心。生锈的终端机发出幽幽绿光。满地的弹壳和闪烁的雷达屏幕暗示着曾经的惨烈保卫战。墙上的战术地图已经过时，但红色标记依然触目惊心——每一个红叉都代表一个失守的阵地。最后一个红叉标在了这座掩体本身的位置。",
            visualPrompt: "Underground bunker command center. Rusty terminals glowing green, tactical maps with red markers, bullet casings on the floor. Final red X on the bunker's own position.",
            items: [
                {
                    id: 'officer_pistol',
                    name: '军官配枪',
                    desc: '一把保养良好的M1911手枪，枪托上刻着一段经文。',
                    type: 'weapon',
                    rarity: 'epic',
                    discoveryThreshold: 20,
                    weaponType: 'firearm',
                    meleeDamage: 2,
                    rangeDamage: 25,
                    maxUses: 7
                },
                {
                    id: 'ammo_box',
                    name: '军用弹药箱',
                    desc: '里面还有一些通用的补给。',
                    type: 'material',
                    rarity: 'common',
                    discoveryThreshold: 5
                },
                {
                    id: 'hidden_plan',
                    name: '防御部署图',
                    desc: '一张沾血的蓝图，标记着隐藏的武器库。',
                    type: 'document',
                    rarity: 'rare',
                    discoveryThreshold: 15,
                    documentContent: "CLASSIFIED - EYES ONLY\n\nSector 7 is compromised. Fall back to the bunker. Seal the blast doors. Do not open for ANYONE.\n\n警告：外部通讯已中断。最后收到的命令是'就地坚守'。那是72小时前的事了。\n\n补充：有人在敲门。但我们没有派人出去。"
                }
            ],
            interactions: [{
                desc: '启动主战术面板',
                results: {
                    timeCost: 5,
                    soundEffect: 'glitch',
                    narrative: '你尝试重启面板，屏幕闪烁了几下，显示出一片不可名状的混乱数据流和一张长满獠牙的脸。你赶紧关闭了电源。在屏幕关闭前的最后一帧，你看到了一行文字："深层掩体收容失败。铁壁协议已启动。"',
                    stateChange: { sanity: -5 }
                }
            }]
        },
        "surveillance_room": {
            name: "安保监控室",
            desc: "一面墙的监视器大多是雪花屏，但有几个还在运作。你可以看到防爆门外的荒原，以及掩体深处某些你不认识的走廊。控制台上有一杯还没喝完的咖啡，已经长满了黑色的霉菌。其中一台监视器显示的画面你无法理解——它似乎在播放这间监控室本身，但画面中多了一个站在你身后的黑影。",
            visualPrompt: "Wall of CRT security monitors, mostly static. Control console with a moldy coffee cup. One monitor showing the room itself with an extra shadow figure. Dim, cold lighting.",
            items: [
                {
                    id: "security_log",
                    name: "安保日志",
                    desc: "记录了最后几天的监控摘要。",
                    type: 'document',
                    rarity: 'common',
                    discoveryThreshold: 10,
                    documentContent: "摄像头 4：目标消失。摄像头 5：墙壁在移动。摄像头 1：它们在里面。重复，它们已经在里面了。\n\n补充：摄像头 7（深层掩体）出现异常——画面中的收容单元门已经打开了，但安保系统显示门仍处于锁定状态。"
                }
            ],
            interactions: [{
                desc: '切换到深层掩体的摄像头',
                results: {
                    timeCost: 5,
                    soundEffect: 'scare',
                    narrative: '画面切换到一条昏暗的走廊。起初什么都没有。然后你注意到天花板上有什么东西——一团肉色的、缓慢蠕动的物质，像是巨大的海星贴在混凝土上。它突然快速移动到摄像头正前方，你看到了数十只完全没有虹膜的眼球。然后画面中断了。',
                    stateChange: { sanity: -8 }
                }
            }]
        },
        "comms_room": {
            name: "机密通讯室",
            desc: "各种无线电设备和监控屏幕排列在墙边。大多数屏幕只显示雪花，但耳机里传来断断续续的声音，像是求救信号，又像是警告。一台加密通讯终端还在运行，但需要安保权限才能解锁。",
            visualPrompt: "Communication room with radio equipment and screens showing static. One active encrypted terminal glowing. Wall map with red X marks.",
            threatLevel: 5,
            items: [
                {
                    id: 'last_transmission',
                    name: '最后的广播',
                    desc: '一段录制在防水磁带上的绝密通讯。',
                    type: 'audio',
                    rarity: 'epic',
                    discoveryThreshold: 15,
                    audioScript: "这里是铁锈前哨...我们已经守不住了。重复，防线已全面崩溃。如果有人听到这个录音，不要来找我们。炸毁入口。把我们和这里的东西一起埋葬。"
                },
                {
                    id: 'signal_decoder',
                    name: '信号解码器',
                    desc: '便携式解码设备，可以破译加密通讯。',
                    type: 'material',
                    rarity: 'rare',
                    discoveryThreshold: 20
                }
            ],
            interactions: [
                {
                    desc: '尝试接收信号',
                    results: {
                        timeCost: 10,
                        soundEffect: 'radio',
                        narrative: '你调整频率。静电声中，一个声音回应道："...收到...不要...移动...他们在...听..." 声音突然变得清晰无比："你不应该在这里。你应该和其他人一起，在深层掩体里——等一下，你不是我们的人。你是谁？你是怎么——" 然后信号中断了。',
                        stateChange: { sanity: -8 }
                    }
                },
                {
                    desc: '破解通讯加密',
                    requirements: {
                        puzzleSolved: {
                            title: '军方密文拦截',
                            lore: '拦截到一段经过凯撒密码加密的短波通讯：IDOOEDFN。这是一套典型的军用字符倒推加密系统。需要解密并输入最终原文。',
                            body: {
                                type: 'type',
                                answer: 'FALLBACK'
                            },
                            hints: [
                                "密文长度很短，这是一种简单的字符位移加密系统。",
                                "军用密码表可能尝试了倒推3个字符来防破译。",
                                "将密文中的每个字母向前推3位。'I'变成'F'，'D'变成'A'..."
                            ],
                            restrictions: {
                                timeCostPerAttempt: 15,
                                maxAttempts: 3
                            },
                            penalties: { sanity: -10 }
                        }
                    },
                    results: {
                        timeCost: 15,
                        soundEffect: 'success',
                        narrative: '你解开了密文，内容只有一个单词："FALLBACK"（撤退）。伴随密文的还有一份掩体后勤权限代码。由于成功破译，你感到一丝自信。',
                        stateChange: { sanity: 10 }
                    }
                }
            ]
        },
        "war_room": {
            name: "作战室",
            desc: "巨大的沙盘地图占据了房间中央，上面用微缩模型标记着异变前的最后战线。小旗子代表着各个军事单位的位置——大部分被推倒了。沙盘的某个角落被人特意堆高，形成了一个微型的掩体模型，旁边用铅笔写着'我们在这里。没有援军。'沙盘下方的抽屉微微突出。",
            visualPrompt: "Large sand table tactical map with miniature flags and unit markers, most toppled. Detailed bunker model with pencil inscription. Drawer slightly open beneath.",
            interactions: [{
                desc: '搜索沙盘下方',
                results: {
                    timeCost: 10,
                    soundEffect: 'search',
                    narrative: '你拉开抽屉，在一堆旧地图下面找到了一张红色边框的磁卡和一张字条："如果你读到这个，说明我已经回不来了。深层掩体的磁卡藏在这里。别去。但如果你必须去——不要相信任何看起来正常的东西。"',
                    stateChange: {
                        gain: [
                            {
                                id: 'deep_access_card',
                                name: '深层安保磁卡',
                                desc: '红色边框标识最高权限。背面刻着"铁壁协议"四个字。',
                                type: 'material',
                                rarity: 'epic'
                            }
                        ]
                    }
                }
            }]
        },
        "intel_room": {
            name: "情报拦截室",
            desc: "这间房间的墙壁上覆满了吸音材料，中央架设着一台庞大的信号拦截设备。它仍在自动运行，不断截取外部的无线电波并将其转化为文本打印在一卷似乎永远用不完的热敏纸上。大部分内容是乱码，但偶尔会出现几句令人不安的清晰语句。",
            visualPrompt: "Soundproofed room. Massive signal interception apparatus. Continuous thermal paper printout with mostly garbled text. Some clear, haunting phrases visible.",
            threatLevel: 5,
            items: [
                {
                    id: 'encrypted_disk',
                    name: '加密数据盘',
                    desc: '军方级加密存储设备。指示灯仍在微弱闪烁。',
                    type: 'document',
                    rarity: 'rare',
                    discoveryThreshold: 20,
                    documentContent: "[解密后]\n最终报告：异变并非自然现象。我们截获的信号分析表明，这是一次有计划的'播种'。信号源坐标位于[数据损坏]。建议立即对所有已知的'种子'着陆点实施核打击。\n\n附注：建议已被上级否决。原因：'种子'已发芽。"
                }
            ],
            interactions: [{
                desc: '阅读最新的打印内容',
                results: {
                    timeCost: 5,
                    soundEffect: 'text',
                    narrative: '热敏纸上的最新打印内容：\n"...ALL SECTORS DARK..."\n"...播种完成。收割期开始。..."\n"...坐标已确认。下一个目标：[本掩体的GPS坐标]..."\n你的手指不由自主地颤抖了起来。日期标注的是今天。',
                    stateChange: { sanity: -10 }
                }
            }]
        },
        "interrogation_room": {
            name: "审讯室",
            desc: "一间加装了隔音海绵的封闭房间，中央有一张固定在地板上的厚重铁椅，绑带已经硬化。单向玻璃被从内部暴力击碎。墙上与天花板上有呈喷射状的暗红色血迹。桌上散落着几支空的注射器和一个仍在空转的录音机。",
            visualPrompt: "Soundproofed interrogation room. Metal chair bolted to the floor with hardened straps. Shattered two-way mirror. Arterial blood spatter on walls and ceiling. Tape recorder slowly spinning.",
            threatLevel: 8,
            items: [
                {
                    id: 'interrogation_transcript',
                    name: '审讯笔录（残卷）',
                    desc: '沾满血迹的军方记录，字迹潦草。',
                    type: 'document',
                    rarity: 'rare',
                    discoveryThreshold: 10,
                    documentContent: "对象编号：114（前哨站外勤兵）。\n症状：极度恐慌，坚称树林里的人不是平民。\n审讯官提问：你为什么向车队开火？\n对象回答：他们的骨头…他们的骨头是在皮肤外面生长的！他们是在笑，但声音是从肚子里发出来的！\n备注：建议对114号执行处决。精神污染有扩散迹象。"
                }
            ],
            interactions: [{
                desc: '倒放录音带',
                results: {
                    timeCost: 10,
                    soundEffect: 'whisper',
                    narrative: '你按下倒放键，刺耳的磁带摩擦声后，传出的不是预想中的审讯对话，而是一个低沉、多重重叠的嗓音在念诵某种无法理解的音节。每听一个音节，你的后脑勺都像被针扎一样刺痛。',
                    stateChange: { sanity: -8 }
                }
            }]
        },
        "living_quarters": {
            name: "生活区干道",
            desc: "灯光黯淡的通道，散发着沉闷的汗液、发霉的食物以及消毒水的混合气味。墙壁上有人用粉笔画了一条时间线——从'D-Day'开始，每一天都划上一道。最后几天的划痕越来越深，越来越乱，最后变成了一个巨大的问号。远处的灯管偶尔闪烁，你似乎总能隐约听到有人在哼着一首走调的摇篮曲。",
            visualPrompt: "Dimly lit passage. Grimy floor tiles, flickering overhead neon bars. Chalk timeline on wall ending in a giant question mark.",
            childrenIds: ["barracks", "mess_hall", "quarantine_cell", "chapel_bunker", "officers_quarters", "water_purification"]
        },
        "barracks": {
            name: "士兵营房",
            desc: "双层床铺整齐排列，有些床上还有未收拾的个人物品。储物柜大多被撬开。墙上贴着家人的照片和剪报。角落里有一个简易的急救站。最触目的是一面墙上钉满了士兵们的集体合照——每张照片上都有人的脸被用黑色记号笔涂掉了。被涂掉的人越来越多，最后一张照片上只剩下一个人没有被涂掉。",
            visualPrompt: "Rows of bunk beds with messy sheets. Walls plastered with photos and open, empty lockers. Group photos with increasingly more faces blacked out. Small first aid station.",
            items: [
                {
                    id: 'combat_knife',
                    name: '战斗匕首',
                    desc: '标准军用匕首，刀刃依然锋利。',
                    type: 'weapon',
                    rarity: 'common',
                    discoveryThreshold: 10,
                    weaponType: 'dagger',
                    meleeDamage: 6,
                    rangeDamage: 0,
                    maxUses: 10
                },
                {
                    id: 'soldier_letter',
                    name: '未寄出的信',
                    desc: '一封写给家人的信，字迹越来越潦草。',
                    type: 'document',
                    rarity: 'common',
                    discoveryThreshold: 5,
                    documentContent: "亲爱的妈妈：\n\n我很好，不用担心。这里的情况...比预想的复杂。他们说很快就能回家，但我不确定。\n\n昨晚有人失踪了。长官说是逃兵，但我看到了血迹。\n\n如果我回不去了，请告诉小明，哥哥爱他。\n\n（信的最后几行被撕掉了）"
                }
            ],
            interactions: [{
                desc: '搜索储物柜',
                results: {
                    timeCost: 15,
                    soundEffect: 'item_pickup',
                    narrative: '你在一个上锁的柜子后面找到了一些被藏起来的补给。还有一张照片——照片上的年轻士兵笑得很灿烂，背面写着"等我回来"。但这个柜子的名牌和墙上最后那张合照中唯一没被涂掉的脸对应。',
                    stateChange: {
                        gain: [
                            {
                                id: 'hidden_ration',
                                name: '私藏口粮',
                                desc: '被士兵藏起来的额外食物。',
                                type: 'consumable',
                                rarity: 'common',
                                effects: [['heal_hp', 15]]
                            }
                        ]
                    }
                }
            }]
        },
        "mess_hall": {
            name: "战术食堂",
            desc: "翻倒的金属桌椅成了临时掩体。打饭窗口已经被钢板焊死。地板上有着大片风干的血迹——但更诡异的是，血迹的形状不像是人倒下後流淌形成的，而是像什么东西从天花板上滴落的。抬头一看，天花板上有一个完美的圆形腐蚀痕迹。",
            visualPrompt: "Overturned metal tables forming barricades. Welded-shut serving window. Huge dried blood stains on floor. Circular corrosion mark on ceiling directly above.",
            threatLevel: 5,
            items: [
                {
                    id: 'emergency_ration',
                    name: '应急口粮',
                    desc: '真空包装的压缩饼干，保质期已过但似乎还能吃。',
                    type: 'consumable',
                    rarity: 'common',
                    discoveryThreshold: 5,
                    effects: [['heal_hp', 10]]
                }
            ],
            interactions: [{
                desc: '翻找食物残渣',
                results: {
                    timeCost: 10,
                    soundEffect: 'search',
                    narrative: '你在一个破裂的塑料桶中找到了一点剩余的净水和口粮包。桶底有一面被塞进去的手写标语："战友们，我已经无法确定食物里是否被掺了东西。但饿死和未知之间，我选择吃。如果我明天变成了它们中的一个——别犹豫，开枪。"',
                    stateChange: {
                        gain: [
                            {
                                id: 'emergency_ration_found',
                                name: '隐藏口粮',
                                desc: '桶底被小心保存的罐头。',
                                type: 'consumable',
                                rarity: 'common',
                                effects: [['heal_hp', 15]]
                            }
                        ]
                    }
                }
            }]
        },
        "quarantine_cell": {
            name: "重症隔离区",
            desc: "位于营房深处的透明隔离室。强化玻璃上有裂纹，内部墙壁上满是抓痕和血手印。这里曾关押着第一批出现症状的士兵。隔离室的对讲机还在通电——偶尔会自行发出几秒的白噪音，像是有人按下了对讲按钮但没有说话。仔细听，对讲机中偶尔会传出微弱的求救声，令人毛骨悚然的是，那声音与你之前失踪的某位队友极为相似。",
            visualPrompt: "Transparent isolation cell with reinforced glass. Glass is cracked. Scratches and bloody handprints on interior walls. Intercom light occasionally blinking.",
            threatLevel: 20,
            items: [
                {
                    id: 'painkillers',
                    name: '止痛药',
                    desc: '只能麻痹肉体。恢复少量HP。',
                    type: 'consumable',
                    rarity: 'common',
                    discoveryThreshold: 15,
                    effects: [['heal_hp', 15]]
                }
            ],
            interactions: [{
                desc: '查看医疗记录板',
                results: {
                    timeCost: 5,
                    soundEffect: 'text',
                    narrative: '记录显示病人的体温在死亡后持续升高，脑电波异常活跃。最后一行备注："不要打开门，不管听到什么声音。"在记录下方有人用颤抖的笔迹补了一行："他在门里面说我的名字。但他已经死了三天了。"'
                }
            }]
        },
        "chapel_bunker": {
            name: "军用礼拜室",
            desc: "一间用储藏室改造的简陋礼拜堂。几排折叠椅面向一个木头十字架。十字架下堆满了士兵们留下的物品——军牌、家书、照片、玩具。有人在墙上用白漆写着'GOD IS NOT HERE. BUT WE ARE.'时间久了，白漆下面渗透出了更早的红色字迹，但你无法辨认那些字写的是什么语言。",
            visualPrompt: "Spare room converted to chapel. Folding chairs facing wooden cross. Pile of personal mementos. White paint message over older red writing in unknown language.",
            nodeNpc: {
                id: "npc_father_thomas",
                name: "托马斯神父",
                gender: "male",
                desc: "原本是掩体的随军牧师，灾变后依靠某种未知的信仰和变异的真菌维持着生命。他的半个身体已经与墙壁上的菌毯融合，但眼神依然清澈。",
                visualPrompt: "An elderly priest half-fused with glowing wall fungus, wearing a tattered priest's collar. His eyes remain remarkably clear and calm despite the biological horror surrounding him. Dim chapel lighting, religious atmosphere.",
                style: "healer",
                initialState: {
                    attribute: { strength: 5, agility: 3, knowledge: 15, perception: 12 },
                    vital: { maxHp: 50, maxSanity: 100, maxStamina: 50, maxVigor: 50 },
                    inventory: [],
                    deck: [],
                    equipState: {
                        weapons: [null, null],
                        armors: [null, null, null],
                        accessories: [null, null, null, null, null]
                    },
                    trust: 20,
                    quest: {}
                }
            },
            interactions: [{
                desc: '在十字架前静坐',
                results: {
                    timeCost: 30,
                    soundEffect: 'sanity_restore',
                    narrative: '你坐下来，闭上眼睛。沉默中，你听到了自己的心跳，稳定而有力。在杀戮和恐惧之后，这种简单的、证明你还活着的声音带来了意想不到的安慰。你的双手不再颤抖。',
                    stateChange: { sanity: 15 }
                }
            }]
        },
        "officers_quarters": {
            name: "军官寝室",
            desc: "与士兵营房相比，这里的条件好得多——独立的床铺、小书桌、甚至还有一台便携式唱片机。但空气中弥漫着一股刺鼻的化学气味——有人用双氧水彻底清洗过这里。桌上的笔记本被翻到最后一页。唱片机的唱针还在转动，但唱片早已播放完毕，只有无尽的沙沙声。",
            visualPrompt: "Officer's room. Single bed, desk with journal, portable record player still spinning silently. Chemical clean smell. Sterile compared to the rest of the bunker.",
            items: [
                {
                    id: 'officer_diary',
                    name: '军官日记',
                    desc: '一本皮面笔记本，最后几页的字迹越来越潦草。',
                    type: 'document',
                    rarity: 'rare',
                    discoveryThreshold: 10,
                    documentContent: "我知道高层在隐瞒什么。深层掩体的门为什么突然需要新的安保协议？\n\n隔壁寝室的上校昨晚没有回来。今天早上他出现在食堂，微笑着，但——他的笑法不对。像是在模仿人类的微笑，但肌肉运动的顺序是错的。\n\n我把备用钥匙藏在了作战室的沙盘下。如果你在读这些，你需要它。"
                },
                {
                    id: 'battery_starter_record',
                    name: "唱片机电池",
                    desc: '以备不时之需的电池。',
                    type: 'consumable',
                    rarity: 'common',
                    discoveryThreshold: 15,
                    effects: [['restore_battery', 40]]
                }
            ],
            interactions: [{
                desc: '播放唱片',
                results: {
                    timeCost: 5,
                    soundEffect: 'glitch',
                    narrative: '你将唱针放回唱片起始位置。传出的不是音乐——而是一段录音。一个疲惫的男声："最终报告。日期...已不重要。深层掩体的收容全面失败。铁壁计划从一开始就不是为了制造武器。上面的人想要和异变“对话”。他们成功了。但对话的代价——"录音在一声尖锐的电子噪音中变成了沉默。',
                    stateChange: { sanity: -5 }
                }
            }]
        },
        "water_purification": {
            name: "公共净水室",
            desc: "庞大的金属水箱排列在房间两侧，维持着前哨站的生命循环。过滤主泵仍在发出沉闷的低吼。其中一个水箱的观察玻璃窗被内部某种黑色的絮状生物膜糊满了，依稀能看到里面有什么庞然大物在缓慢游动。",
            visualPrompt: "Large industrial water purification room. Massive metal tanks, pumping machinery. One tank's window is obscured by dark, web-like biofilm from the inside, a vague giant silhouette swimming within.",
            threatLevel: 6,
            items: [
                {
                    id: "clean_water_flask",
                    name: "应急纯水储备",
                    desc: "未被污染的纯净水，饮用后能极大缓解心理与生理干渴。",
                    type: "consumable",
                    rarity: "common",
                    discoveryThreshold: 12,
                    effects: [['heal_sanity', 10], ['heal_hp', 5]]
                }
            ],
            interactions: [{
                desc: '尝试清洗观察窗',
                results: {
                    timeCost: 10,
                    soundEffect: 'scare',
                    narrative: '你找了块破布，试着擦去玻璃外侧的污垢。就在你看清内部全貌的瞬间，水箱里的庞然大物猛地撞击在玻璃上——那是一团纠缠在一起的无数人类四肢形成的肉球，每一只手都在徒劳地抓挠着水流！玻璃发出了危险的龟裂声。',
                    stateChange: { sanity: -12 }
                }
            }]
        },
        "engineering_bay": {
            name: "重装备工程走廊",
            desc: "通往动力源和武器库的粗犷通道。墙壁两侧排列着粗大管道，偶尔喷出白色的蒸汽。可以闻到刺鼻机油味。走廊尽头有一扇标着红色警示标志的重型安保门——通往深层掩体。门上的电子读卡器闪着待机的蓝光。",
            visualPrompt: "Rough industrial tunnel. Thick pipes lining the walls spewing occasional bursts of steam. Oily puddles on the ground. Heavy security door at end with card reader.",
            threatLevel: 10,
            childrenIds: ["power_station", "armory_room", "ventilation_control", "waste_disposal"],
            interactions: [{
                desc: "开启深层掩体安保门",
                requirements: {
                    items: ["deep_access_card"]
                },
                results: {
                    timeCost: 5,
                    soundEffect: 'door_open',
                    narrative: "你将红色磁卡刷过读卡器。绿灯亮起，伴随着沉重的气动锁开启声。一股冰冷的、带着福尔马林味的空气从门缝中涌出。门后是一条通往地下深处的阶梯。",
                    stateChange: {
                        unlock: [["deep_bunker", "进入深层掩体"]]
                    }
                }
            }],
            exits: [
                { targetId: "deep_bunker", label: "进入深层掩体", type: 'local' }
            ]
        },
        "power_station": {
            name: "聚变动力源",
            desc: "巨大的发电机组轰鸣着。仪表盘上的指针在危险区域边缘徘徊。备用燃料桶堆在角落。热浪扑面而来，这里的温度高得异常。发电机的铭牌上写着'预计使用寿命：50年'。安装日期标注的是3年前，但机器已经像运转了半个世纪一样老旧了。",
            visualPrompt: "Massive industrial generator dominating the room. Analog gauges vibrating in red zones. Stacked fuel drums. Heat haze effect. Prematurely aged machinery.",
            items: [
                {
                    id: 'power_cell',
                    name: '军用电池',
                    desc: '高容量电池组，可以为设备充电。',
                    type: 'consumable',
                    rarity: 'rare',
                    discoveryThreshold: 20,
                    effects: [['restore_battery', 80]]
                },
                {
                    id: 'fuel_reserve',
                    name: '燃料储备',
                    desc: '一桶柴油，可以转化为补给。',
                    type: 'material',
                    rarity: 'common',
                    discoveryThreshold: 10
                }
            ],
            interactions: [
                {
                    desc: '检查发电机状态',
                    results: {
                        timeCost: 5,
                        soundEffect: 'scan',
                        narrative: '发电机运行在临界状态，但暂时还能坚持。维护日志的最后一条写着："如果它停了，深层掩体的电磁收容场就会失效。如果收容场失效——上帝保佑我们所有人。"'
                    }
                },
                {
                    desc: "修复核心线路",
                    requirements: {
                        puzzleSolved: {
                            title: "冷却重置",
                            lore: "聚变核心的冷却线缆被扯断了，需重新接驳接口。\n接口类型：接口1(HV 高压火线)，接口2(GND 接地)，接口3(COOL 温度控制)。\n线缆颜色：红线、绿线、蓝线。\n请根据工业通用标准选择正确的配对方案：",
                            body: {
                                type: "choice",
                                body: [
                                    "1-红 2-蓝 3-绿",
                                    "1-红 2-绿 3-蓝",
                                    "1-绿 2-蓝 3-红",
                                    "1-蓝 2-绿 3-红"
                                ],
                                answer: "1-红 2-绿 3-蓝"
                            },
                            hints: [
                                "工业通用标准：红线通常承担高压荷载(HV)。",
                                "保护性的接地线路(GND)常被标为绿色。",
                                "排查出前两项后，剩下的蓝色显然属于温度控制系统。"
                            ],
                            restrictions: {
                                timeCostPerAttempt: 20,
                                maxAttempts: 2
                            },
                            penalties: { hp: -15 }
                        }
                    },
                    results: {
                        timeCost: 20,
                        soundEffect: "power_up",
                        narrative: "随着线缆正确连接，聚变核心发出深沉平稳的嗡鸣，备用照明被稳定的白光取代。你成功阻止了过热，并为掩体恢复了部分主能源。",
                        stateChange: { hp: 10, sanity: 5 }
                    }
                }
            ]
        },
        "armory_room": {
            name: "核心军械库",
            desc: "重型武器架和弹药箱整齐排列。虽然大部分武器已经被取走，但还有一些装备留了下来。保险柜的门被强行炸开，地上有干涸的血迹。最诡异的是角落里那批没人碰过的弹药——它们的弹头被替换成了某种半透明的、像凝胶一样的材料。箱子上印着'铁壁专用'。",
            visualPrompt: "Military armory with metal weapon racks and stacked ammo boxes. Blasted open safe. Dried blood on the floor. Suspicious gel-tipped ammunition marked 'Project Iron Wall'.",
            threatLevel: 5,
            items: [
                {
                    id: 'tactical_vest',
                    name: '战术背心',
                    desc: '防弹背心，提供额外的防护。',
                    type: 'armor',
                    rarity: 'rare',
                    discoveryThreshold: 15,
                    defense: 20,
                    maxUses: 20
                },
                {
                    id: 'frag_grenade',
                    name: '破片手雷',
                    desc: '标准军用手雷。使用后消耗。',
                    type: 'weapon',
                    rarity: 'rare',
                    discoveryThreshold: 20,
                    weaponType: 'explosive',
                    meleeDamage: 5,
                    rangeDamage: 30,
                    maxUses: 1
                },
                {
                    id: 'bio_mask',
                    name: '生化防护面罩',
                    desc: '军用级防护面罩，滤芯已经发黄但仍可使用。',
                    type: 'accessory',
                    rarity: 'rare',
                    discoveryThreshold: 15,
                    effects: [['maxSanity', 15]]
                }
            ],
            interactions: [{
                desc: '检查铁壁弹药',
                results: {
                    timeCost: 5,
                    soundEffect: 'scare',
                    narrative: '你拿起一枚凝胶弹头。它在你手指的温度下微微变软，你能感觉到它在...脉动。像是某种极其微小的心跳。你立刻把它放了回去。箱子背面贴着使用说明："射入目标体内后，凝胶将在72小时内完成同化。请勿在未穿戴全套防护装备时接触。"',
                    stateChange: { sanity: -8 }
                }
            }]
        },
        "ventilation_control": {
            name: "通风管控枢纽",
            desc: "巨大的排风扇在这里交汇，组成了前哨站庞大的呼吸器官。控制台布满了厚厚的灰尘。管道深处传来的风声极其浑浊，听起来像是某种沉睡怪物的巨大喘息。这里的空气质量极差，弥漫着浓烈的铁锈与腐败气味。",
            visualPrompt: "Massive ventilation hub with giant rusty fan blades. Dust-covered control panel. Gloomy lighting. Airborne particulate matter visible in the light beams.",
            threatLevel: 6,
            interactions: [{
                desc: "尝试重启主循环风机",
                requirements: {
                    puzzleSolved: {
                        title: "主循环风机重启",
                        lore: "风机控制台的启动序列因为数据损坏出现了缺失，你需要根据残余的递增规律填补阵列空白才能完成重启指令。\n当前阵列数据: [1], [2], [?], [7], [11]",
                        body: {
                            type: "cloze",
                            body: [
                                ["1, 2, ", "", ", 7, 11"]
                            ],
                            answer: ["4"]
                        },
                        hints: [
                            "观察数字之间的差值。",
                            "1到2差了1，从空白到7，以及7到11之间的差值逐渐扩大。",
                            "如果差值分别是1、2、3、4的等差数列，那么第二个数加2就是..."
                        ],
                        restrictions: {
                            timeCostPerAttempt: 15,
                            maxAttempts: 3
                        },
                        penalties: { sanity: -5, hp: -5 }
                    }
                },
                results: {
                    timeCost: 15,
                    soundEffect: "power_up",
                    narrative: "随着序列输入正确，巨大的扇叶发出了刺耳的摩擦声并缓缓转动起来。沉闷的浊气被抽走，新鲜的空气终于灌入了这个封闭的棺材，你感觉呼吸顺畅了许多。",
                    stateChange: { hp: 10 }
                }
            }]
        },
        "waste_disposal": {
            name: "废料处理池",
            desc: "一个深不见底的圆柱形处理池，边缘挂着残破的黄黑相间警告条带。池底翻滚着荧光绿色的化学废液，散发着刺鼻的酸性蒸汽。几具穿着厚重防化服的尸体漂浮在上面，防毒面具的内侧完全被干涸发黑的血迹糊满。",
            visualPrompt: "Cylindrical hazard waste pit. Glowing neon green chemical sludge at the bottom. Tattered yellow and black hazard tape. Hazmat suit corpses floating in the toxic stew.",
            threatLevel: 12,
            items: [],
            interactions: [{
                desc: '打捞漂浮的防化服',
                results: {
                    timeCost: 15,
                    soundEffect: 'item_pickup',
                    narrative: '你忍着剧烈的腐蚀性恶臭，用一根长棍将其中一具尸体勾了过来。当你试图剥开防化服寻找物资时，尸体由于鼓胀突然爆裂，喷射出带有腐蚀性的毒液。但你确实在夹层里找到了一块特种合金。',
                    stateChange: {
                        hp: -10,
                        gain: [
                            {
                                id: 'high_tier_scrap',
                                name: '特种合金废料',
                                desc: '极其稀有的高强度军用合金，可以用来锻造高级装备。',
                                type: 'material',
                                rarity: 'epic'
                            }
                        ]
                    }
                }
            }]
        },
        "deep_bunker": {
            name: "深层掩体走廊",
            desc: "阶梯通向地下更深处。温度骤降，你能看到自己呼出的白气。走廊的照明是紫外线灯管——所有的表面都呈现出诡异的荧光色调。某些墙面上有用肉眼看不到、但在紫外线下清晰可见的生物污染标记。空气中有一种甜腻的、类似烂水果的气味。每当天花板上的紫外线灯管由于电压不稳而短暂熄灭时，你总会确信走廊的尽头比刚才缩短了几分。远处偶尔传来的金属碰撞声，节奏规律得令人心悸。",
            visualPrompt: "Deep underground corridor. UV lighting casting everything in eerie fluorescent glow. Biohazard markings visible under UV. Cold breath visible. Descending stairway.",
            threatLevel: 20,
            childrenIds: ["bio_lab", "cryo_chamber", "server_room", "escape_tunnel", "training_room", "incinerator", "patient_zero_containment"]
        },
        "bio_lab": {
            name: "生化实验室",
            desc: "密封的玻璃隔间中排列着培养皿和离心机。大部分设备已经损毁，但有一台培养箱还在运行——里面的培养基上生长着某种珊瑚状的有机物，它的颜色在你注视的过程中缓慢变化。实验台上散落着注射器和手术工具，一些工具上沾着的'血迹'是蓝绿色的。",
            visualPrompt: "Biohazard lab with sealed glass chambers. Destroyed equipment. One active incubator with color-shifting coral-like organism. Blue-green blood stains on surgical tools.",
            threatLevel: 20,
            items: [
                {
                    id: 'military_experiment_log',
                    name: '军方实验日志',
                    desc: '盖着最高机密印戳的活页夹。大量内容被墨水涂抹。',
                    type: 'document',
                    rarity: 'epic',
                    discoveryThreshold: 20,
                    documentContent: "项目代号：铁壁\n\n目标：利用异变组织样本开发生化武器。\n\n第17天：样本表现出高度智能。它在用莫尔斯电码敲击培养皿。\n第23天：样本突破了第一层收容。两名研究员被同化。\n第24天：军令——封锁深层掩体，所有被感染人员就地处决。\n第25天：[最后一行被鲜血覆盖]"
                },
                {
                    id: "bio_stimulant",
                    name: "实验型增强剂",
                    desc: "标签上写着'仅供铁壁项目人员使用'。效果强烈但来源可疑。",
                    type: 'consumable',
                    rarity: 'rare',
                    discoveryThreshold: 25,
                    effects: [['heal_hp', 40]]
                }
            ],
            interactions: [{
                desc: '检查运行中的培养箱',
                results: {
                    timeCost: 5,
                    soundEffect: 'scare',
                    narrative: '你靠近培养箱。珊瑚状有机物突然停止了颜色变化，整体变成了与你皮肤完全相同的色调。它迅速重组——在你眼前形成了一只微型的、完美复刻的人类手掌。五根手指朝着你张开，仿佛在打招呼。',
                    stateChange: { sanity: -15 }
                }
            }],
            specificEnemy: {
                id: "iron_wall_specimen",
                name: "铁壁实验体-Γ",
                gender: "both",
                desc: "它曾是一名研究员——至少实验服上的门禁卡这样显示。但现在，它的上半身已被蓝绿色的珊瑚状组织覆盖，每一个'枝桠'的末端都长着一只未发育完全的眼球。它用四肢以不自然的速度爬行，发出金属与骨骼摩擦的声响。",
                visualPrompt: "A horrifying humanoid mutation. The upper half is heavily covered in blue-green, coral-like alien growths. Underdeveloped eyeballs sprout at the ends of these coral branches. Exposed bone and torn hazmat suit visible. Dim UV lighting.",
                initialState: {
                    attribute: { strength: 14, agility: 12, knowledge: 2, perception: 15 },
                    equipState: {
                        weapons: [null, null],
                        armors: [null, null, null],
                        accessories: [null, null, null, null, null]
                    }
                },
                intentDistribution: {
                    attack: 60,
                    buff: 20,
                    debuff: 10,
                    observe: 10
                },
                nextIntent: {
                    type: "attack",
                    desc: "准备扑咬",
                    value: 14
                },
                lootTable: [
                    {
                        id: 'mutated_tissue',
                        name: '异变组织样本',
                        desc: '具有极高科研价值，但非常危险。',
                        type: 'material',
                        rarity: 'cursed',
                        dropProbability: 1.0
                    }
                ]
            },
            enemySpawnCondition: 'on_search'
        },
        "cryo_chamber": {
            name: "低温冻存室",
            desc: "一排排液氮冷冻舱在黑暗中散发着白色的冷气。大部分冷冻舱是空的——盖子被从里面撞开了。只有最后一排还有三个处于密封状态。透过结了霜的观察窗，你看到里面的'标本'不像任何你认识的生物——它没有明确的形状，更像是一团凝固的噩梦。",
            visualPrompt: "Rows of liquid nitrogen cryogenic pods in darkness. Most pods opened from inside. Three sealed pods with frost-covered viewports showing amorphous dark shapes. White vapor.",
            threatLevel: 20,
            items: [
                {
                    id: 'cryo_specimen',
                    name: '冻存标本',
                    desc: '密封在液氮容器中的半透明组织。即使在极低温下，它仍在缓慢蠕动。',
                    type: 'material',
                    rarity: 'cursed',
                    discoveryThreshold: 25
                },
                {
                    id: "cryo_manifest",
                    name: "冻存清单",
                    desc: "严重霜冻损坏的文件。",
                    type: "document",
                    rarity: "common",
                    discoveryThreshold: 15,
                    documentContent: "冻存单元 01-07：已脱离收容。状态：活跃。\n冻存单元 08-10：密封完好。状态：休眠。\n\n紧急协议：在任何情况下不得解冻 08-10 号单元。\n\n手写补充：08号在沉睡中微笑了。"
                }
            ],
            interactions: [{
                desc: '靠近密封的冷冻舱',
                results: {
                    timeCost: 5,
                    soundEffect: 'scare',
                    narrative: '你贴近 08 号冻存舱的观察窗，用手擦去凝结的霜。里面的东西——你拒绝称它为"生物"——静静地悬浮在零下 196 度的寂静中。然后，就在你的手掌还贴在玻璃上时，它缓缓地把一个类似手掌的附肢贴在了你手掌的正对面。舱内温度计跳了一下。',
                    stateChange: { sanity: -12 }
                }
            }]
        },
        "server_room": {
            name: "中央数据中心",
            desc: "服务器机柜发出低沉的嗡鸣。满地的网线和光纤像是电子丛林。主终端还在运行，屏幕上滚动着无尽的日志。这里是铁壁计划所有数据的存储中心——如果你能解锁加密终端，就能了解军方到底做了什么。",
            visualPrompt: "Server racks humming. Green LED lights blinking in rows. Tangled cables covering the floor. Active main terminal with scrolling logs. Climate-controlled cold air.",
            items: [
                {
                    id: 'encrypted_disk_core',
                    name: '核心数据盘',
                    desc: '军方级加密存储设备。指示灯仍在微弱闪烁。',
                    type: 'document',
                    rarity: 'rare',
                    discoveryThreshold: 20,
                    documentContent: "[解密后]\n最终报告：异变并非自然现象。我们截获的信号分析表明，这是一次有计划的'播种'。信号源坐标位于[数据损坏]。建议立即对所有已知的'种子'着陆点实施核打击。\n\n附注：建议已被上级否决。原因：'种子'已发芽。"
                }
            ],
            interactions: [{
                desc: "破解加密终端",
                requirements: {
                    puzzleSolved: {
                        title: '铁壁加密终端',
                        lore: '终端屏幕上闪烁着绿色的提示符："请输入铁壁协议启动日期以获取深层解密权限。" \n根据你之前在其他区块得到的情报，该生化实验立项始于2023年10月，随后在第24天全面失控并下达了封锁军令。\n请按系统默认的DDMMYY格式组合6位数字密码：',
                        body: {
                            type: 'type',
                            answer: '241023'
                        },
                        hints: [
                            "协议启动日期和异变全面爆发并封锁掩体的日子相关。",
                            "第24天发生了一项决定性事件——军令下达封锁深层掩体。并且实验始于10月初。",
                            "密码系统通常遵循 DDMMYY 格式：对应的正是第24天，10月，2023年。"
                        ],
                        restrictions: {
                            timeCostPerAttempt: 10,
                            maxAttempts: 3
                        },
                        penalties: { hp: -5 }
                    }
                },
                results: {
                    timeCost: 15,
                    soundEffect: 'typing',
                    narrative: "终端的红色锁定界面切换为绿色。所有数据文件已解密。你看到了铁壁计划的全部真相：军方从异变区域回收了一个活体信号源。他们没有销毁它——他们试图与它通讯。而它回答了。回答的内容被标记为“人类语言无法准确翻译”，但最接近的翻译是：“我们接受了你们的邀请。”"
                }
            }]
        },
        "escape_tunnel": {
            name: "紧急逃生通道",
            desc: "一条狭窄的混凝土隧道，由应急灯照明。大约二十米处发生了部分塌方，碎石和断裂的钢筋堵住了大半通道，但还有一个人勉强能够挤过的缝隙。从缝隙的另一侧传来冷风——以及某种类似呼吸的有节奏的气流。隧道墙壁上有用红色化学发光棒写的字：'不要回头'。",
            visualPrompt: "Narrow concrete escape tunnel. Emergency lighting. Partial collapse creating tight squeeze point. Red chemlight writing on wall. Wind from beyond the rubble.",
            threatLevel: 20,
            items: [
                {
                    id: 'escape_map',
                    name: '逃生通道地图',
                    desc: '手绘的通道示意图，某些路径被红笔标注了"已塌方"。',
                    type: 'document',
                    rarity: 'rare',
                    discoveryThreshold: 10,
                    documentContent: "紧急逃生通道 — 仅限A级以上军官\n\n路线：深层掩体 → 通风竖井 → 地表出口（距掩体约800米）\n\n注意：通道于灾变第三天部分塌方。最后一批撤离人员报告看到了'墙壁在移动'。此后无人尝试使用此路线。"
                },
                {
                    id: 'tactical_flashlight',
                    name: '战术手电',
                    desc: '高亮度军用手电。光束坚定如刀，切开黑暗。',
                    type: 'material',
                    rarity: 'common',
                    discoveryThreshold: 10
                }
            ],
            interactions: [{
                desc: '尝试挤过塌方处',
                results: {
                    timeCost: 10,
                    soundEffect: 'scare',
                    narrative: '你侧身挤过碎石间的缝隙。另一侧的隧道完好无损，但有什么不对——墙壁是湿的，带着体温。你的手电照亮了前方：隧道的尽头不是出口，而是一面由肉色组织构成的脉动的膜。它随着那有节奏的"呼吸"起伏着。你选择退回来。',
                    stateChange: { sanity: -15 }
                }
            }],
            exits: [
                { targetId: "OUTSIDE", label: "穿越逃生通道", type: 'zone_transfer' }
            ]
        },
        "training_room": {
            name: "训练场",
            desc: "一个开阔的地下空间，曾用于近战训练和体能测试。地面铺着防震橡胶垫，角落里摆放着沙袋和武器训练架。有些沙袋被劈开了——里面不是沙子，而是某种黑色的、已经干燥结块的有机物。训练用的木质人形靶上有不属于任何武器造成的创伤痕迹。",
            visualPrompt: "Underground training hall with rubber floor mats, punching bags, weapon racks. Some bags split open revealing dried black organic matter. Damaged wooden dummies with alien claw marks.",
            threatLevel: 10,
            items: [
                {
                    id: "training_knife",
                    name: "训练刀",
                    desc: "训练用的真刀，刀刃上有细微的缺口——以及一些你无法辨认的蓝绿色残留物。",
                    type: 'weapon',
                    rarity: 'common',
                    discoveryThreshold: 5,
                    weaponType: 'dagger',
                    meleeDamage: 6,
                    rangeDamage: 0,
                    maxUses: 10
                }
            ],
            interactions: [{
                desc: '检查训练日志',
                results: {
                    timeCost: 5,
                    soundEffect: 'search',
                    narrative: '训练日志的最后几页记录了一种新的格斗训练课程——不是教士兵如何攻击，而是教他们如何在被“同化部位”缠住时自行截肢。附带的图示令人作呕。最后一条注释："训练有效率：12%。其他人来不及截肢就被完全同化了。"',
                    stateChange: { sanity: -5 }
                }
            }]
        },
        "incinerator": {
            name: "高炉焚化室",
            desc: "为了快速处理被感染的尸体和生物组织，军方临时征用了这座巨型工业高炉。尽管已经停机，靠近时依然能感受到从内部传出的骇人余温。厚重的铸铁大门半掩着，一条长长且呈现碳化的血污拖痕从炉内一直延伸到下水管道口。",
            visualPrompt: "Massive industrial blast furnace repurposed as an incinerator. Still radiating heat. Iron doors slightly ajar. Charred drag marks leading from the furnace to a dark drainage grate.",
            threatLevel: 18,
            items: [
                {
                    id: 'charred_iron_pipe',
                    name: '烧焦的铁棍',
                    desc: '原本用来拨弄炉火的粗重铁棍，一端已经碳化。',
                    type: 'weapon',
                    rarity: 'common',
                    discoveryThreshold: 8,
                    weaponType: 'blunt',
                    meleeDamage: 12,
                    rangeDamage: 0,
                    maxUses: 15
                }
            ],
            interactions: [{
                desc: '探查高炉内部',
                results: {
                    timeCost: 10,
                    soundEffect: 'scare',
                    narrative: '你小心翼翼地推开沉重的铁门，探头看向还在冒烟的炉栅。突然，一阵低沉的咳嗽声从灰烬深处传来。紧接着，一只完全焦黑、只剩下骨骼和几缕发光肉质的手臂猛地探出，抓向你的脚踝。你立刻重重地关上了铁门。',
                    stateChange: { sanity: -10 }
                }
            }]
        },
        "patient_zero_containment": {
            name: "零号收容单元",
            desc: "深层掩体的绝对禁忌核心。这里没有任何常规病房的设施，只有一个悬挂在半空中的庞大钛合金球体。令人绝望的是，球体被某种难以想象的力量从内部暴力撕裂了。断裂的边缘向外翻卷，厚达三十厘米的装甲仿佛纸片一般被剥开。周围的墙壁上布满了由高温射线烧灼出的同心圆放射状烙印。",
            visualPrompt: "Ultimate containment core. A massive titanium sphere suspended in mid-air, violently torn open from the inside out. 30cm thick armor peeled like foil. Concentric radioactive scorch marks on the surrounding walls. Intense, oppressive atmosphere.",
            threatLevel: 20,
            items: [
                {
                    id: 'first_contact_record',
                    name: '最初接触记录',
                    desc: '被保存在防爆箱内的黑色数据盘，表面有被融化的痕迹。',
                    type: 'document',
                    rarity: 'epic',
                    discoveryThreshold: 20,
                    documentContent: "协议：深渊凝视。\n我们挖出了它。它在休眠。我们试图唤醒它以获取科技，但这完全是个错误。\n当它睁开眼睛时，我们的时空被重写了。它不需要传播病毒，它传播的是物理法则本身的变异。\n原谅我们。"
                }
            ],
            specificEnemy: {
                id: "patient_zero_echo",
                name: "零号回声",
                gender: "both",
                desc: "它没有固定的生物学形态，像是由成千上万个惨死者的怨念、血肉与扭曲的重力场揉捏而成的混沌结块。周遭的空气由于它的存在而产生剧烈的畸变，每一次闪烁都伴随着刺耳的低频噪音，直刺大脑皮层。",
                visualPrompt: "A horrific, floating amalgamation of human flesh and dark, swirling gravity distortion. No fixed shape, tormented faces emerging and dissolving within the mass. Air warping violently around it. Intense cosmic horror aesthetic.",
                initialState: {
                    attribute: { strength: 18, agility: 15, knowledge: 20, perception: 18 },
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
                    type: "attack",
                    desc: "扭曲力场冲击",
                    value: 20
                },
                lootTable: [
                    {
                        id: 'zero_core',
                        name: '零号核心',
                        desc: '散发着奇异光芒的结晶体，似乎蕴含着某种高维度的能量。',
                        type: 'material',
                        rarity: 'epic',
                        dropProbability: 1.0
                    }
                ]
            },
            enemySpawnCondition: 'on_enter'
        },
        "field_medical": {
            name: "野战医务室",
            desc: "一间用帆布和钢管搭建的简易医务室，紧邻安保检查站。折叠手术台上还残留着碘伏的黄褐色痕迹。药品柜基本被搬空了，但在角落的一个上锁铁箱里可能还有遗留物资。有人在手术台旁的墙上用红十字和箭头画了一套简化的伤口处理流程——最后一步写的不是'包扎'，而是'祈祷'。",
            visualPrompt: "Canvas and steel pipe field medical station. Folding surgery table with iodine stains. Mostly empty medicine cabinet. Locked iron case. Crude medical procedure chart ending with 'pray'.",
            items: [
                {
                    id: 'bandage',
                    name: '急救绷带',
                    desc: '简单的止血用品。恢复HP。',
                    type: 'consumable',
                    rarity: 'common',
                    discoveryThreshold: 5,
                    effects: [['heal_hp', 25]]
                },
                {
                    id: 'painkillers_station',
                    name: '止痛药',
                    desc: '只能麻痹肉体。恢复少量HP。',
                    type: 'consumable',
                    rarity: 'common',
                    discoveryThreshold: 10,
                    effects: [['heal_hp', 15]]
                }
            ],
            interactions: [{
                desc: '撬开铁箱',
                results: {
                    timeCost: 15,
                    soundEffect: 'success',
                    narrative: '铁箱锁扣已经锈蚀，用力一拉就断了。里面有一套军用急救包——酒精、手术缝合线、止血带。还有三支没有标签的注射器，里面的液体呈现不自然的荧光绿色。你决定只拿急救包。',
                    stateChange: {
                        gain: [
                            {
                                id: "military_medkit",
                                name: "军用急救包",
                                desc: "完整的野战急救套件。",
                                type: 'consumable',
                                rarity: 'rare',
                                effects: [['heal_hp', 35]]
                            }
                        ]
                    }
                }
            }]
        },
        "blast_door": {
            name: "主防爆门",
            desc: "一扇半米厚的铅制大门将这里与外界隔绝。巨大的转轮门锁上警示红灯闪烁。门外的盖格计数器正在疯狂鸣叫，读数远超安全范围。门的内侧有人用焊接枪写了两行字：上面一行是'ABANDON ALL HOPE'，下面一行歪歪扭扭地写着中文——'但希望从来不是活下去的必需品。'",
            visualPrompt: "Thick lead blast door, massive wheel lock with flashing red warning light. Geiger counter nearby clicking frantically. Welded English and Chinese text on inner surface.",
            threatLevel: 15,
            items: [
                {
                    id: 'dog_tags',
                    name: '军牌',
                    desc: '沾染血迹的身份铭牌。',
                    type: 'material',
                    rarity: 'common',
                    discoveryThreshold: 5
                }
            ],
            interactions: [{
                desc: '贴耳倾听',
                results: {
                    timeCost: 5,
                    soundEffect: 'scare',
                    narrative: '你把耳朵贴在冰冷的铅门上，听到门外有沉重的呼吸声和无数利爪抓挠金属的刺耳声。然后——声音停了。取而代之的是一种更令人恐惧的声音：完美的、带有人类语调的敲门声。三下。你屏住呼吸，没有回应。又是三下。然后是一个你认识的人的声音，在门外说："是我，让我进去。"',
                    stateChange: { sanity: -10 }
                }
            }],
            exits: [
                { label: "强行开启大门离开", type: 'zone_transfer' }
            ]
        }
    }
}