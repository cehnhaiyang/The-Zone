import type { SanctuaryTemplate } from '../../meta';

/**
 * 铁锈前哨庇护所与深层掩体区域（优化版）
 *
 * 设计原则：
 * - 安保检查站、野战医务室、军用礼拜室构成相对安全的外层庇护核心。
 * - 指挥区、生活区、工程舱承担资源、线索与设施修复。
 * - 深层掩体为高危锁定区域，承载「铁壁」真相、高价值物资与 Boss 级威胁。
 * - 整体节奏：安全区恢复理智 / 整理资源，中层推进解谜，深层承担恐怖与高收益风险。
 */
export const ZONE_BUNKER: SanctuaryTemplate = {
    id: 'bunker',
    name: '铁锈前哨',
    background:
        '一座废弃的地下军事防空洞，曾经是人类抵抗未知威胁的坚固阵地。如今，只剩下残骸、血迹和生锈的机器，以及昔日绝望防守的残酷烙印。军方曾在基金会技术顾问的协助下，于深层掩体进行代号「铁壁」的生化实验，试图利用异变组织样本、清理人回收的神经链接仪原型与深渊信号残片开发武器。实验失败后，深层掩体被紧急封锁，所有参与人员被命令就地处决。但某些东西活了下来。它不再只是实验体，而像是被前哨站的恐惧、纪律与死亡共同喂养出的回声。',
    topology:
        '安保检查站中枢（1）；指挥区（7）：指挥中枢走廊 + 中央指挥室、安保监控室、机密通讯室、作战室、情报拦截室、审讯室；生活区（7）：生活区干道 + 士兵营房、战术食堂、重症隔离区、军用礼拜室、军官寝室、公共净水室；工程舱（5）：重装备走廊 + 聚变动力源、核心军械库、通风管控枢纽、废料处理池；深层掩体（8，锁定）：深层走廊 + 生化实验室、低温冻存室、中央数据中心、紧急逃生通道、训练场、高炉焚化室、零号收容单元；野战医务室（1）；主防爆门出口（1）',
    nodesCount: 30,
    visualStyle:
        'Military Bunker, Industrial Rust, Cold War Aesthetics, Dim Emergency Lighting, UV Deep Labs, Volumetric Fog, Cinematic Horror',
    dilationFactor: 1.0,
    entrance: 'security_checkpoint',
    initialState: {
        food: 24,
        water: 48,
        medicine: 14,
        electricity: 72,
        scraps: 64,
        population: 6,
        morale: 52,
        erosion: 16,
        facility: [
            {
                id: 'facility_bunker_purifier',
                name: '公共净水循环塔',
                desc: '工程舱的净水装置残骸被重新接通，勉强维持着前哨的饮用水循环。水质混浊但能入口，每一滴都带着铁锈与消毒液的味道。',
                nodeMounted: 'water_purification',
                production: { water: 6 }
            },
            {
                id: 'facility_bunker_reactor',
                name: '聚变动力核心',
                desc: '深埋于工程舱的微型聚变堆，是整座前哨最可靠的能源来源。嗡鸣声中偶尔夹杂着不属于机械的杂音，仿佛有人在管道深处低声絮语。其运转持续释放低频噪声与残余辐射，缓慢侵蚀着掩体内的理智。',
                nodeMounted: 'power_station',
                production: { electricity: 8, erosion: 1 }
            },
            {
                id: 'facility_bunker_mess',
                name: '战术食堂配给口',
                desc: '战术食堂的军用配给口，靠库存罐头与压缩口粮维持。热气腾腾的烂炖菜是前哨为数不多的人间烟火。',
                nodeMounted: 'mess_hall',
                production: { food: 5 }
            },
            {
                id: 'facility_bunker_pharmacy',
                name: '药剂调配站',
                desc: '在野战医务室搭建的调配台，把过期药剂与残余药材重新加工成可用的医疗物资。效率不高，但聊胜于无。',
                nodeMounted: 'field_medical',
                production: { medicine: 2 }
            }
        ]
    },
    nodes: {
        security_checkpoint: {
            name: '安保检查站',
            desc: '坚固的混凝土掩体入口，厚重的防弹玻璃已经布满龟裂，甚至沾染着干涸的黑色痕迹。这里连接着前哨站的各个重要区块。生锈的安检机仍然亮着微弱的黄灯，警报器早已哑火。远处的黑暗中偶尔传来沉重的回声，像是有什么重物在地板上拖行。安检机有时会毫无预兆地亮起绿灯并发出一声短哔，仿佛批准了某个不可见的通行者。作为庇护所中枢，这里勉强保留了最低限度的照明与空气循环。',
            visualPrompt:
                'Concrete checkpoint, bulletproof glass with spider-web cracks and dark stains, dull yellow lights, rusted turnstiles, faded color-coded floor lines, makeshift sanctuary hub, dim but stable lighting',
            childrenIds: ['command_sector', 'living_quarters', 'engineering_bay'],
            items: [
                {
                    id: 'checkpoint_log',
                    name: '检查站值班日志',
                    desc: '一本被咖啡渍和黑色指纹覆盖的值班记录。',
                    type: 'data',
                    rarity: 'standard',
                    discoveryThreshold: 5,
                    documentContent:
                        '第 1 天：防爆门关闭。外部通讯断续。第 3 天：清理人频道消失。第 5 天：有人声称看见门外站着自己的家人。第 7 天：不再记录门外声音。补充：如果安检机自行亮绿灯，不要看摄像头。'
                }
            ],
            interactions: [
                {
                    desc: '整理临时营地',
                    results: {
                        timeCost: 20,
                        soundEffect: 'success',
                        narrative:
                            '你把散落的物资归拢到防爆墙后，确认通风与照明仍在最低限度运转。短暂的秩序感让你紧绷的神经稍微松弛。',
                        stateChange: { sanity: 5 }
                    }
                },
                {
                    desc: '核对物资封条',
                    results: {
                        timeCost: 10,
                        soundEffect: 'search',
                        narrative:
                            '你逐一检查封条。大多数仍然完好，只有一箱医疗物资的封条被重新粘过。胶水下面压着一小撮黑色菌丝，像是从箱体内部长出来的。',
                        stateChange: { sanity: 2 }
                    }
                }
            ],
            nodeNpc: {
                id: 'npc_quartermaster_harper',
                name: '军需官哈珀',
                gender: 'male',
                desc: '前哨站的军需官，负责物资登记与分配。他的左臂从肘部以下被替换成粗糙的机械义肢，关节处渗出黑色油渍。他坚持按条令办事，但在条令无法覆盖的灰色地带，他会用沉默代替拒绝。',
                visualPrompt:
                    'Middle-aged military quartermaster with a crude mechanical forearm, oil-stained uniform, tired but disciplined eyes, checkpoint dim lighting',
                style: 'balance',
                initialState: {
                    trust: 35,
                    attribute: {
                        strength: 12,
                        agility: 14,
                        wisdom: 16,
                        perception: 18,
                        spiritual: 10
                    },
                    vital: {
                        maxHp: 110,
                        maxSanity: 120,
                        maxStamina: 105,
                        maxVigor: 105
                    },
                    quest: [
                        {
                            id: 'supply_manifest',
                            desc: '哈珀需要恢复前哨的物资链。他要求你从机密通讯室取回信号解码器，并从中央指挥室回收剩余弹药箱，以便重新建立可审计的补给清单。',
                            goals: [
                                {
                                    id: 'signal_decoder',
                                    name: '信号解码器',
                                    desc: '便携式解码设备，可以破译加密通讯。',
                                    type: 'material',
                                    rarity: 'organized'
                                },
                                {
                                    id: 'ammo_box',
                                    name: '军用弹药箱',
                                    desc: '里面还有一些通用补给。',
                                    type: 'material',
                                    rarity: 'standard'
                                }
                            ],
                            rewards: [
                                {
                                    id: 'military_medkit',
                                    name: '军用急救包',
                                    desc: '完整的野战急救套件。',
                                    type: 'consumable',
                                    rarity: 'organized',
                                    effects: [['heal_hp', 40]]
                                },
                                {
                                    id: 'power_cell',
                                    name: '军用电池',
                                    desc: '高容量电池组，可以为设备充电。',
                                    type: 'consumable',
                                    rarity: 'organized',
                                    effects: [['restore_battery', 80]]
                                }
                            ],
                            difficulty: 4
                        },
                        {
                            id: 'black_inventory',
                            desc: '哈珀想知道深层掩体里究竟发生了什么。他需要你带回一份异变组织样本，以便向仍在运转的上级频道证明铁壁计划的失败。他不保证这能换来救援，但至少能换来真相。',
                            goals: [
                                {
                                    id: 'mutated_tissue',
                                    name: '异变组织样本',
                                    desc: '具有极高科研价值，但非常危险。',
                                    type: 'material',
                                    rarity: 'abyssal'
                                }
                            ],
                            rewards: [
                                {
                                    id: 'neural_filter_mk2',
                                    name: '改良神经过滤插件',
                                    desc: '哈珀用深层样本与链接仪残件改装的过滤插件，能略微拓宽认知安全边界。',
                                    type: 'accessory',
                                    rarity: 'deep',
                                    effects: [
                                        ['maxSanity', 35],
                                        ['spiritual', 5]
                                    ]
                                }
                            ],
                            difficulty: 8
                        }
                    ]
                },
                canBeInvited: {
                    trust: 60,
                    questsArchived: ['black_inventory'],
                    replacement: [
                        {
                            duty: '军需官',
                            desc: '负责前哨物资台账与配给的人员，需足够细心以维持可审计的补给链。',
                            attributes: { wisdom: 12, perception: 14 },
                            vitals: { maxStamina: 80 }
                        }
                    ],
                    isSanctuarySafe: { food: 30, water: 30, morale: 45 }
                }
            },
            exits: [
                { targetId: 'blast_door', label: '检查防爆门', type: 'local' },
                { targetId: 'field_medical', label: '前往医务室', type: 'local' }
            ]
        },

        command_sector: {
            name: '指挥中枢走廊',
            desc: '铺着防滑钢板的走廊，通往前哨站的大脑。两侧的墙上贴满褪色的战术海报，以及被红色记号笔划掉的名字列表。顶部有一排已经不亮了的状态指示灯——只有最后一盏还在闪烁暗红色的光，像是在执行某个永远不会结束的报警程序。走廊深处似乎偶尔会传来有节奏的皮靴声，但仔细聆听时又会消失。',
            visualPrompt:
                'Steel-plated floor corridor, faded tactical posters, lists of names crossed out in red marker, status lights mostly dead, one blinking red',
            threatLevel: 3,
            childrenIds: [
                'command_center',
                'surveillance_room',
                'comms_room',
                'war_room',
                'intel_room',
                'interrogation_room'
            ],
            interactions: [
                {
                    desc: '检查状态指示灯',
                    results: {
                        timeCost: 5,
                        soundEffect: 'error',
                        narrative:
                            '你靠近那盏唯一亮着的红灯。灯罩下积着黑色灰尘，闪烁频率并不随机，像是在重复某种三短一长的信号。你试图记录时，灯突然熄灭，走廊陷入短暂的绝对黑暗。',
                        stateChange: { sanity: -2 }
                    }
                }
            ]
        },

        command_center: {
            name: '中央指挥室',
            desc: '废弃的地下防空洞的核心。生锈的终端机发出幽幽绿光。满地的弹壳和闪烁的雷达屏幕暗示着曾经的惨烈保卫战。墙上的战术地图已经过时，但红色标记依然触目惊心——每一个红叉都代表一个失守的阵地。最后一个红叉标在了这座掩体本身的位置。',
            visualPrompt:
                'Underground bunker command center, rusty terminals glowing green, tactical maps with red markers, bullet casings on the floor, final red X on the bunker position',
            threatLevel: 4,
            items: [
                {
                    id: 'officer_pistol',
                    name: '军官配枪',
                    desc: '一把保养良好的 M1911 手枪，枪托上刻着一段经文。',
                    type: 'weapon',
                    rarity: 'deep',
                    discoveryThreshold: 20,
                    weaponType: 'pistol',
                    weaponDamageType: 'hot',
                    range: 5,
                    damage: 24,
                    maxUses: 8
                },
                {
                    id: 'ammo_box',
                    name: '军用弹药箱',
                    desc: '里面还有一些通用补给。',
                    type: 'material',
                    rarity: 'standard',
                    discoveryThreshold: 5,
                    quantity: 3
                },
                {
                    id: 'hidden_plan',
                    name: '防御部署图',
                    desc: '一张沾血的蓝图，标记着隐藏的武器库。',
                    type: 'data',
                    rarity: 'organized',
                    discoveryThreshold: 15,
                    documentContent:
                        'CLASSIFIED - EYES ONLY。Sector 7 is compromised. Fall back to the bunker. Seal the blast doors. Do not open for ANYONE. 警告：外部通讯已中断。最后收到的命令是「就地坚守」。那是 72 小时前的事了。补充：有人在敲门。但我们没有派人出去。'
                }
            ],
            interactions: [
                {
                    desc: '启动主战术面板',
                    results: {
                        timeCost: 5,
                        soundEffect: 'error',
                        narrative:
                            '你尝试重启面板，屏幕闪烁了几下，显示出一片不可名状的混乱数据流和一张长满獠牙的脸。你赶紧关闭了电源。在屏幕关闭前的最后一帧，你看到了一行文字：深层掩体收容失败。铁壁协议已启动。',
                        stateChange: { sanity: -5 }
                    }
                }
            ]
        },

        surveillance_room: {
            name: '安保监控室',
            desc: '一面墙的监视器大多是雪花屏，但有几个还在运作。你可以看到防爆门外的荒原，以及掩体深处某些你不认识的走廊。控制台上有一杯还没喝完的咖啡，已经长满了黑色的霉菌。其中一台监视器显示的画面你无法理解——它似乎在播放这间监控室本身，但画面中多了一个站在你身后的黑影。',
            visualPrompt:
                'Wall of CRT security monitors, mostly static, control console with a moldy coffee cup, one monitor showing the room itself with an extra shadow figure, dim cold lighting',
            threatLevel: 4,
            items: [
                {
                    id: 'security_log',
                    name: '安保日志',
                    desc: '记录了最后几天的监控摘要。',
                    type: 'data',
                    rarity: 'standard',
                    discoveryThreshold: 10,
                    documentContent:
                        '摄像头 4：目标消失。摄像头 5：墙壁在移动。摄像头 1：它们在里面。重复，它们已经在里面了。补充：摄像头 7（深层掩体）出现异常——画面中的收容单元门已经打开了，但安保系统显示门仍处于锁定状态。'
                }
            ],
            interactions: [
                {
                    desc: '切换到深层掩体的摄像头',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative:
                            '画面切换到一条昏暗的走廊。起初什么都没有。然后你注意到天花板上有什么东西——一团肉色的、缓慢蠕动的物质，像是巨大的海星贴在混凝土上。它突然快速移动到摄像头正前方，你看到了数十只完全没有虹膜的眼球。然后画面中断了。',
                        stateChange: { sanity: -8 }
                    }
                }
            ]
        },

        comms_room: {
            name: '机密通讯室',
            desc: '各种无线电设备和监控屏幕排列在墙边。大多数屏幕只显示雪花，但耳机里传来断断续续的声音，像是求救信号，又像是警告。一台加密通讯终端还在运行，但需要安保权限才能解锁。',
            visualPrompt:
                'Communication room with radio equipment and screens showing static, one active encrypted terminal glowing, wall map with red X marks',
            threatLevel: 3,
            items: [
                {
                    id: 'last_transmission',
                    name: '最后的广播',
                    desc: '一段录制在防水磁带上的绝密通讯。',
                    type: 'data',
                    rarity: 'deep',
                    discoveryThreshold: 15,
                    audioScript:
                        '这里是铁锈前哨……我们已经守不住了。重复，防线已全面崩溃。如果有人听到这个录音，不要来找我们。炸毁入口。把我们和这里的东西一起埋葬。'
                },
                {
                    id: 'signal_decoder',
                    name: '信号解码器',
                    desc: '便携式解码设备，可以破译加密通讯。',
                    type: 'material',
                    rarity: 'organized',
                    discoveryThreshold: 20
                }
            ],
            interactions: [
                {
                    desc: '尝试接收信号',
                    results: {
                        timeCost: 10,
                        soundEffect: 'ui_notification',
                        narrative:
                            '你调整频率。静电声中，一个声音回应道：收到……不要……移动……他们在……听……声音突然变得清晰无比：你不应该在这里。你应该和其他人一起，在深层掩体里——等一下，你不是我们的人。你是谁？你是怎么——然后信号中断了。',
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
                                '密文长度很短，这是一种简单的字符位移加密系统。',
                                '军用密码表可能尝试了倒推 3 个字符来防破译。',
                                '将密文中的每个字母向前推 3 位：I 变成 F，D 变成 A……'
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
                        narrative:
                            '你解开了密文，内容只有一个单词：FALLBACK（撤退）。伴随密文的还有一份掩体后勤权限代码。由于成功破译，你感到一丝自信。',
                        stateChange: { sanity: 10 }
                    }
                }
            ]
        },

        war_room: {
            name: '作战室',
            desc: '巨大的沙盘地图占据了房间中央，上面用微缩模型标记着异变前的最后战线。小旗子代表着各个军事单位的位置——大部分被推倒了。沙盘的某个角落被人特意堆高，形成了一个微型的掩体模型，旁边用铅笔写着：我们在这里。没有援军。沙盘下方的抽屉微微突出。',
            visualPrompt:
                'Large sand table tactical map with miniature flags and unit markers, most toppled, detailed bunker model with pencil inscription, drawer slightly open beneath',
            threatLevel: 3,
            interactions: [
                {
                    desc: '搜索沙盘下方',
                    results: {
                        timeCost: 10,
                        soundEffect: 'search',
                        narrative:
                            '你拉开抽屉，在一堆旧地图下面找到了一张红色边框的磁卡和一张字条：如果你读到这个，说明我已经回不来了。深层掩体的磁卡藏在这里。别去。但如果你必须去——不要相信任何看起来正常的东西。',
                        stateChange: {
                            gain: [
                                {
                                    id: 'deep_access_card',
                                    name: '深层安保磁卡',
                                    desc: '红色边框标识最高权限。背面刻着「铁壁协议」四个字。',
                                    type: 'material',
                                    rarity: 'deep'
                                }
                            ]
                        }
                    }
                }
            ]
        },

        intel_room: {
            name: '情报拦截室',
            desc: '这间房间的墙壁上覆满了吸音材料，中央架设着一台庞大的信号拦截设备。它仍在自动运行，不断截取外部的无线电波并将其转化为一卷似乎永远用不完的热敏纸文本。大部分内容是乱码，但偶尔会出现几句令人不安的清晰语句。',
            visualPrompt:
                'Soundproofed room, massive signal interception apparatus, continuous thermal paper printout with mostly garbled text, some clear haunting phrases visible',
            threatLevel: 5,
            items: [
                {
                    id: 'encrypted_disk',
                    name: '加密数据盘',
                    desc: '军方级加密存储设备。指示灯仍在微弱闪烁。',
                    type: 'data',
                    rarity: 'organized',
                    discoveryThreshold: 20,
                    documentContent:
                        '[解密后] 最终报告：异变并非自然现象。我们截获的信号分析表明，这是一次有计划的「播种」。信号源坐标位于[数据损坏]。建议立即对所有已知的「种子」着陆点实施核打击。附注：建议已被上级否决。原因：「种子」已发芽。'
                },
                {
                    id: 'interception_core',
                    name: '拦截装置核心',
                    desc: '信号拦截装置仍在运转的核心部件。拆下它，就能让这台机器永远闭嘴。',
                    type: 'material',
                    rarity: 'organized',
                    discoveryThreshold: 18
                }
            ],
            interactions: [
                {
                    desc: '阅读最新的打印内容',
                    results: {
                        timeCost: 5,
                        soundEffect: 'typing_1',
                        narrative:
                            '热敏纸上的最新打印内容：...ALL SECTORS DARK... ...播种完成。收割期开始。... ...坐标已确认。下一个目标：[本掩体的 GPS 坐标]... 你的手指不由自主地颤抖了起来。日期标注的是今天。',
                        stateChange: { sanity: -10 }
                    }
                },
                {
                    desc: '用解码器分析热敏纸',
                    requirements: {
                        items: ['signal_decoder']
                    },
                    results: {
                        timeCost: 10,
                        soundEffect: 'typing_2',
                        narrative:
                            '解码器将乱码转译为坐标与时间表。多个着陆点被圈出，本掩体的坐标被标注为已收割。最后一行写着：清理人频道：无响应。方舟：已封闭。',
                        stateChange: { sanity: -6 }
                    }
                }
            ]
        },

        interrogation_room: {
            name: '审讯室',
            desc: '一间加装了隔音海绵的封闭房间，中央有一张固定在地板上的厚重铁椅，绑带已经硬化。单向玻璃被从内部暴力击碎。墙上与天花板上有呈喷射状的暗红色血迹。桌上散落着几支空的注射器和一个仍在空转的录音机。',
            visualPrompt:
                'Soundproofed interrogation room, metal chair bolted to the floor with hardened straps, shattered two-way mirror, arterial blood spatter on walls and ceiling, tape recorder slowly spinning',
            threatLevel: 8,
            items: [
                {
                    id: 'interrogation_transcript',
                    name: '审讯笔录（残卷）',
                    desc: '沾满血迹的军方记录，字迹潦草。',
                    type: 'data',
                    rarity: 'organized',
                    discoveryThreshold: 10,
                    documentContent:
                        '对象编号：114（前哨站外勤兵）。症状：极度恐慌，坚称树林里的人不是平民。审讯官提问：你为什么向车队开火？对象回答：他们的骨头……他们的骨头是在皮肤外面生长的！他们是在笑，但声音是从肚子里发出来的！备注：建议对 114 号执行处决。精神污染有扩散迹象。'
                }
            ],
            interactions: [
                {
                    desc: '倒放录音带',
                    results: {
                        timeCost: 10,
                        soundEffect: 'terrifying',
                        narrative:
                            '你按下倒放键，刺耳的磁带摩擦声后，传出的不是预想中的审讯对话，而是一个低沉、多重重叠的嗓音在念诵某种无法理解的音节。每听一个音节，你的后脑勺都像被针扎一样刺痛。',
                        stateChange: { sanity: -8 }
                    }
                }
            ]
        },

        living_quarters: {
            name: '生活区干道',
            desc: '灯光黯淡的通道，散发着沉闷的汗液、发霉的食物以及消毒水的混合气味。墙壁上有人用粉笔画了一条时间线——从 D-Day 开始，每一天都划上一道。最后几天的划痕越来越深，越来越乱，最后变成了一个巨大的问号。远处的灯管偶尔闪烁，你似乎总能隐约听到有人在哼着一首走调的摇篮曲。',
            visualPrompt:
                'Dimly lit passage, grimy floor tiles, flickering overhead neon bars, chalk timeline on wall ending in a giant question mark',
            threatLevel: 2,
            childrenIds: [
                'barracks',
                'mess_hall',
                'quarantine_cell',
                'chapel_bunker',
                'officers_quarters',
                'water_purification'
            ],
            interactions: [
                {
                    desc: '辨认粉笔时间线',
                    results: {
                        timeCost: 5,
                        soundEffect: 'search',
                        narrative:
                            '你靠近那条粉笔时间线。最后几道划痕并不是数字，而是反复描画的正字。正字中央写着一个小小的词：还在。你不知道它指的是人，还是别的什么。',
                        stateChange: { sanity: -2 }
                    }
                }
            ],
            nodeNpc: {
                id: 'npc_survivor_sasha',
                name: '通讯兵萨莎',
                gender: 'female',
                desc: '前哨站的通讯兵。灾变降临时她正躲在生活区的通风管道里检修线路，透过对讲系统亲耳听见战友们一个接一个的最后时刻。此后她不愿再碰任何会发声的设备，但她的耳朵依旧敏锐得可怕。她对陌生人抱有本能的警惕，可一旦确认你值得信任，她会成为战场上最好的眼睛和耳朵。',
                visualPrompt:
                    'Young female survivor and former communications soldier, oversized military jacket, wary alert eyes, headphones resting around neck, dim living quarters lighting',
                style: 'skirmish',
                initialState: {
                    trust: 25,
                    attribute: {
                        strength: 8,
                        agility: 17,
                        wisdom: 14,
                        perception: 16,
                        spiritual: 9
                    },
                    vital: {
                        maxHp: 85,
                        maxSanity: 100,
                        maxStamina: 95,
                        maxVigor: 95
                    },
                    quest: [
                        {
                            id: 'silent_frequency',
                            desc: '萨莎希望你潜入情报拦截室，拆下那台仍在运转的信号拦截装置的核心。那个声音日夜折磨着她，而她再也不愿靠近那台机器。让它闭嘴，她会把重新校准好的战术耳机给你。',
                            goals: [
                                {
                                    id: 'interception_core',
                                    name: '拦截装置核心',
                                    desc: '信号拦截装置仍在运转的核心部件。',
                                    type: 'material',
                                    rarity: 'organized'
                                }
                            ],
                            rewards: [
                                {
                                    id: 'comm_earpiece',
                                    name: '战术通讯耳机',
                                    desc: '萨莎重新校准过的通讯耳机，能让你在战场噪声中捕捉到最细微的动静。',
                                    type: 'accessory',
                                    rarity: 'organized',
                                    effects: [
                                        ['perception', 3],
                                        ['maxSanity', 5]
                                    ]
                                }
                            ],
                            difficulty: 5
                        }
                    ]
                },
                canBeInvited: {
                    trust: 55,
                    isSanctuarySafe: { food: 20, morale: 40 }
                },
                willRoam: {
                    speed: 40,
                    route: ['barracks', 'mess_hall', 'officers_quarters']
                }
            }
        },

        barracks: {
            name: '士兵营房',
            desc: '双层床铺整齐排列，有些床上还有未收拾的个人物品。储物柜大多被撬开。墙上贴着家人的照片和剪报。角落里有一个简易的急救站。最触目的是一面墙上钉满了士兵们的集体合照——每张照片上都有人的脸被用黑色记号笔涂掉了。被涂掉的人越来越多，最后一张照片上只剩下一个人没有被涂掉。',
            visualPrompt:
                'Rows of bunk beds with messy sheets, walls plastered with photos and open empty lockers, group photos with increasingly more faces blacked out, small first aid station',
            threatLevel: 3,
            items: [
                {
                    id: 'combat_knife',
                    name: '战斗匕首',
                    desc: '标准军用匕首，刀刃依然锋利。',
                    type: 'weapon',
                    rarity: 'standard',
                    discoveryThreshold: 10,
                    weaponType: 'prick',
                    weaponDamageType: 'cold',
                    range: 1,
                    damage: 10,
                    maxUses: 12
                },
                {
                    id: 'soldier_letter',
                    name: '未寄出的信',
                    desc: '一封写给家人的信，字迹越来越潦草。',
                    type: 'data',
                    rarity: 'standard',
                    discoveryThreshold: 5,
                    documentContent:
                        '亲爱的妈妈：我很好，不用担心。这里的情况……比预想的复杂。他们说很快就能回家，但我不确定。昨晚有人失踪了。长官说是逃兵，但我看到了血迹。如果我回不去了，请告诉小明，哥哥爱他。（信的最后几行被撕掉了）'
                },
                {
                    id: 'soldier_helmet',
                    name: '旧制式头盔',
                    desc: '内衬写着多个不同名字的旧头盔，似乎曾被不同士兵轮流使用。',
                    type: 'accessory',
                    rarity: 'standard',
                    discoveryThreshold: 10,
                    effects: [['maxHp', 10]]
                }
            ],
            interactions: [
                {
                    desc: '搜索储物柜',
                    results: {
                        timeCost: 15,
                        soundEffect: 'item_pickup',
                        narrative:
                            '你在一个上锁的柜子后面找到了一些被藏起来的补给。还有一张照片——照片上的年轻士兵笑得很灿烂，背面写着等我回来。但这个柜子的名牌和墙上最后那张合照中唯一没被涂掉的脸对应。',
                        stateChange: {
                            gain: [
                                {
                                    id: 'hidden_ration',
                                    name: '私藏口粮',
                                    desc: '被士兵藏起来的额外食物。',
                                    type: 'consumable',
                                    rarity: 'standard',
                                    effects: [['heal_hp', 15]]
                                }
                            ]
                        }
                    }
                }
            ]
        },

        mess_hall: {
            name: '战术食堂',
            desc: '翻倒的金属桌椅成了临时掩体。打饭窗口已经被钢板焊死。地板上有着大片风干的血迹——但更诡异的是，血迹的形状不像是人倒下后流淌形成的，而是像什么东西从天花板上滴落的。抬头一看，天花板上有一个完美的圆形腐蚀痕迹。',
            visualPrompt:
                'Overturned metal tables forming barricades, welded-shut serving window, huge dried blood stains on floor, circular corrosion mark on ceiling directly above',
            threatLevel: 4,
            items: [
                {
                    id: 'emergency_ration',
                    name: '应急口粮',
                    desc: '真空包装的压缩饼干，保质期已过但似乎还能吃。',
                    type: 'consumable',
                    rarity: 'standard',
                    discoveryThreshold: 5,
                    effects: [['heal_hp', 15]]
                }
            ],
            interactions: [
                {
                    desc: '翻找食物残渣',
                    results: {
                        timeCost: 10,
                        soundEffect: 'search',
                        narrative:
                            '你在一个破裂的塑料桶中找到了一点剩余的净水和口粮包。桶底有一面被塞进去的手写标语：战友们，我已经无法确定食物里是否被掺了东西。但饿死和未知之间，我选择吃。如果我明天变成了它们中的一个——别犹豫，开枪。',
                        stateChange: {
                            gain: [
                                {
                                    id: 'emergency_ration',
                                    name: '应急口粮',
                                    desc: '桶底被小心保存的罐头。',
                                    type: 'consumable',
                                    rarity: 'standard',
                                    effects: [['heal_hp', 15]]
                                }
                            ]
                        }
                    }
                }
            ]
        },

        quarantine_cell: {
            name: '重症隔离区',
            desc: '位于营房深处的透明隔离室。强化玻璃上有裂纹，内部墙壁上满是抓痕和血手印。这里曾关押着第一批出现症状的士兵。隔离室的对讲机还在通电——偶尔会自行发出几秒的白噪音，像是有人按下了对讲按钮但没有说话。仔细听，对讲机中偶尔会传出微弱的求救声，令人毛骨悚然的是，那声音与你之前失踪的某位队友极为相似。',
            visualPrompt:
                'Transparent isolation cell with reinforced glass, glass cracked, scratches and bloody handprints on interior walls, intercom light occasionally blinking',
            threatLevel: 12,
            items: [
                {
                    id: 'painkillers',
                    name: '止痛药',
                    desc: '只能麻痹肉体。恢复少量 HP。',
                    type: 'consumable',
                    rarity: 'standard',
                    discoveryThreshold: 15,
                    effects: [['heal_hp', 15]]
                }
            ],
            interactions: [
                {
                    desc: '查看医疗记录板',
                    results: {
                        timeCost: 5,
                        soundEffect: 'typing_1',
                        narrative:
                            '记录显示病人的体温在死亡后持续升高，脑电波异常活跃。最后一行备注：不要打开门，不管听到什么声音。在记录下方有人用颤抖的笔迹补了一行：他在门里面说我的名字。但他已经死了三天了。',
                        stateChange: { sanity: -5 }
                    }
                }
            ],
            specificEnemy: {
                data: [
                    {
                        type: 'cthulhu',
                        id: 'quarantine_subject',
                        name: '隔离对象-114',
                        gender: 'both',
                        desc: '曾经的第一批感染者。隔离服与皮肤融合成一层半透明的膜，胸腔以不自然的频率起伏。它的眼睑被自身分泌物封死，却能准确朝向你的呼吸声。',
                        visualPrompt:
                            'Humanoid patient in torn isolation gown, translucent fused skin membrane, chest cavity pulsing irregularly, sealed eyelids, dim isolation cell lighting',
                        range: 2,
                        speed: 26,
                        damage: 24,
                        defense: 14,
                        evasion: 20,
                        intentDistribution: {
                            attack: 58,
                            defense: 12,
                            buff: 6,
                            debuff: 16,
                            observe: 8
                        },
                        lootTable: [
                            {
                                id: 'contaminated_sample',
                                name: '污染样本',
                                desc: '密封在破裂培养管中的活性组织，仍在轻微收缩。',
                                type: 'material',
                                rarity: 'abyssal',
                                dropProbability: 0.8
                            },
                            {
                                id: 'painkillers',
                                name: '止痛药',
                                desc: '只能麻痹肉体。恢复少量 HP。',
                                type: 'consumable',
                                rarity: 'standard',
                                effects: [['heal_hp', 15]],
                                dropProbability: 0.35
                            }
                        ]
                    }
                ],
                spawnCondition: 'on_search'
            }
        },

        chapel_bunker: {
            name: '军用礼拜室',
            desc: '一间用储藏室改造的简陋礼拜堂。几排折叠椅面向一个木头十字架。十字架下堆满了士兵们留下的物品——军牌、家书、照片、玩具。有人在墙上用白漆写着：GOD IS NOT HERE. BUT WE ARE. 时间久了，白漆下面渗透出了更早的红色字迹，但你无法辨认那些字写的是什么语言。',
            visualPrompt:
                'Makeshift chapel in a storage room, folding chairs, wooden cross, offerings of dog tags and photos, faded white paint slogan over older red stains, dim solemn lighting',
            items: [
                {
                    id: 'pilgrim_token',
                    name: '朝圣者护符',
                    desc: '用弹壳和布条缠成的简陋护符，摸起来异常温热。',
                    type: 'accessory',
                    rarity: 'standard',
                    discoveryThreshold: 10,
                    effects: [['maxSanity', 10]]
                }
            ],
            nodeNpc: {
                id: 'npc_father_thomas',
                name: '托马斯神父',
                gender: 'male',
                desc: '原本是掩体的随军牧师，灾变后依靠某种未知的信仰和变异的真菌维持着生命。他的半个身体已经与墙壁上的菌毯融合，但眼神依然清澈。',
                visualPrompt:
                    'An elderly priest half fused with glowing wall fungus, wearing a tattered priest collar, remarkably clear calm eyes, dim chapel lighting, religious atmosphere',
                style: 'defense',
                initialState: {
                    trust: 40,
                    attribute: {
                        strength: 4,
                        agility: 5,
                        wisdom: 24,
                        perception: 16,
                        spiritual: 28
                    },
                    vital: {
                        maxHp: 55,
                        maxSanity: 200,
                        maxStamina: 55,
                        maxVigor: 60
                    },
                    quest: [
                        {
                            id: 'echo_of_faith',
                            desc: '托马斯神父希望你在深层掩体中找到「最初接触记录」。他想确认，那场实验的终点究竟是人类的傲慢，还是某种更高层级的回应。',
                            goals: [
                                {
                                    id: 'first_contact_record',
                                    name: '最初接触记录',
                                    desc: '被保存在防爆箱内的黑色数据盘，表面有被融化的痕迹。',
                                    type: 'data',
                                    rarity: 'deep',
                                    documentContent:
                                        '协议：深渊凝视。我们挖出了它。它在休眠。我们试图唤醒它以获取科技，但这完全是个错误。当它睁开眼睛时，我们的时空被重写了。它不需要传播病毒，它传播的是物理法则本身的变异。原谅我们。'
                                }
                            ],
                            rewards: [
                                {
                                    id: 'blessed_water',
                                    name: '祝圣纯水',
                                    desc: '托马斯神父祝福过的少量纯水，能短暂安抚被深渊噪声侵蚀的精神。',
                                    type: 'consumable',
                                    rarity: 'organized',
                                    effects: [
                                        ['heal_sanity', 25],
                                        ['heal_hp', 10]
                                    ]
                                }
                            ],
                            difficulty: 9
                        }
                    ]
                }
            },
            interactions: [
                {
                    desc: '在十字架前静坐',
                    results: {
                        timeCost: 30,
                        soundEffect: 'success',
                        narrative:
                            '你坐下来，闭上眼睛。沉默中，你听到了自己的心跳，稳定而有力。在杀戮和恐惧之后，这种简单的、证明你还活着的声音带来了意想不到的安慰。你的双手不再颤抖。',
                        stateChange: { sanity: 15 }
                    }
                }
            ]
        },

        officers_quarters: {
            name: '军官寝室',
            desc: '与士兵营房相比，这里的条件好得多——独立的床铺、小书桌、甚至还有一台便携式唱片机。但空气中弥漫着一股刺鼻的化学气味——有人用双氧水彻底清洗过这里。桌上的笔记本被翻到最后一页。唱片机的唱针还在转动，但唱片早已播放完毕，只有无尽的沙沙声。',
            visualPrompt:
                'Officer room, single bed, desk with journal, portable record player still spinning silently, chemical clean smell, sterile compared to the rest of the bunker',
            threatLevel: 4,
            items: [
                {
                    id: 'officer_diary',
                    name: '军官日记',
                    desc: '一本皮面笔记本，最后几页的字迹越来越潦草。',
                    type: 'data',
                    rarity: 'organized',
                    discoveryThreshold: 10,
                    documentContent:
                        '我知道高层在隐瞒什么。深层掩体的门为什么突然需要新的安保协议？隔壁寝室的上校昨晚没有回来。今天早上他出现在食堂，微笑着，但——他的笑法不对。像是在模仿人类的微笑，但肌肉运动的顺序是错的。我把备用钥匙藏在了作战室的沙盘下。如果你在读这些，你需要它。'
                },
                {
                    id: 'record_player_battery',
                    name: '唱片机电池',
                    desc: '以备不时之需的电池。',
                    type: 'consumable',
                    rarity: 'standard',
                    discoveryThreshold: 15,
                    effects: [['restore_battery', 40]]
                }
            ],
            interactions: [
                {
                    desc: '播放唱片',
                    results: {
                        timeCost: 5,
                        soundEffect: 'error',
                        narrative:
                            '你将唱针放回唱片起始位置。传出的不是音乐——而是一段录音。一个疲惫的男声：最终报告。日期……已不重要。深层掩体的收容全面失败。铁壁计划从一开始就不是为了制造武器。上面的人想要和异变对话。他们成功了。但对话的代价——录音在一声尖锐的电子噪音中变成了沉默。',
                        stateChange: { sanity: -5 }
                    }
                }
            ]
        },

        water_purification: {
            name: '公共净水室',
            desc: '庞大的金属水箱排列在房间两侧，维持着前哨站的生命循环。过滤主泵仍在发出沉闷的低吼。其中一个水箱的观察玻璃窗被内部某种黑色的絮状生物膜糊满了，依稀能看到里面有什么庞然大物在缓慢游动。',
            visualPrompt:
                'Large industrial water purification room, massive metal tanks, pumping machinery, one tank window obscured by dark web-like biofilm from the inside, a vague giant silhouette swimming within',
            threatLevel: 5,
            items: [
                {
                    id: 'clean_water_flask',
                    name: '应急纯水储备',
                    desc: '未被污染的纯净水，饮用后能极大缓解心理与生理干渴。',
                    type: 'consumable',
                    rarity: 'standard',
                    discoveryThreshold: 12,
                    effects: [
                        ['heal_sanity', 10],
                        ['heal_hp', 5]
                    ]
                }
            ],
            interactions: [
                {
                    desc: '尝试清洗观察窗',
                    results: {
                        timeCost: 10,
                        soundEffect: 'terrifying',
                        narrative:
                            '你找了块破布，试着擦去玻璃外侧的污垢。就在你看清内部全貌的瞬间，水箱里的庞然大物猛地撞击在玻璃上——那是一团纠缠在一起的无数人类四肢形成的肉球，每一只手都在徒劳地抓挠着水流！玻璃发出了危险的龟裂声。',
                        stateChange: { sanity: -12 }
                    }
                }
            ]
        },

        engineering_bay: {
            name: '重装备工程走廊',
            desc: '通往动力源和武器库的粗犷通道。墙壁两侧排列着粗大管道，偶尔喷出白色的蒸汽。可以闻到刺鼻机油味。走廊尽头有一扇标着红色警示标志的重型安保门——通往深层掩体。门上的电子读卡器闪着待机的蓝光。',
            visualPrompt:
                'Rough industrial tunnel, thick pipes lining the walls spewing occasional bursts of steam, oily puddles on the ground, heavy security door at end with card reader',
            threatLevel: 6,
            childrenIds: ['power_station', 'armory_room', 'ventilation_control', 'waste_disposal'],
            items: [
                {
                    id: 'field_repair_kit',
                    name: '神经链接维修套件',
                    desc: '军用电子维护套件，内含微型焊笔、导电凝胶与备用微电极片，可用于临时修复神经链接仪。',
                    type: 'consumable',
                    rarity: 'organized',
                    discoveryThreshold: 18,
                    effects: [['repair_integrity', 25]]
                }
            ],
            interactions: [
                {
                    desc: '开启深层掩体安保门',
                    requirements: {
                        items: ['deep_access_card']
                    },
                    results: {
                        timeCost: 5,
                        soundEffect: 'unlock',
                        narrative:
                            '你将红色磁卡刷过读卡器。绿灯亮起，伴随着沉重的气动锁开启声。一股冰冷的、带着福尔马林味的空气从门缝中涌出。门后是一条通往地下深处的阶梯。',
                        stateChange: {
                            unlock: [['deep_bunker', '进入深层掩体']]
                        }
                    }
                }
            ]
        },

        power_station: {
            name: '聚变动力源',
            desc: '巨大的发电机组轰鸣着。仪表盘上的指针在危险区域边缘徘徊。备用燃料桶堆在角落。热浪扑面而来，这里的温度高得异常。发电机的铭牌上写着预计使用寿命：50 年。安装日期标注的是 3 年前，但机器已经像运转了半个世纪一样老旧了。',
            visualPrompt:
                'Massive industrial generator dominating the room, analog gauges vibrating in red zones, stacked fuel drums, heat haze effect, prematurely aged machinery',
            threatLevel: 7,
            items: [
                {
                    id: 'power_cell',
                    name: '军用电池',
                    desc: '高容量电池组，可以为设备充电。',
                    type: 'consumable',
                    rarity: 'organized',
                    discoveryThreshold: 20,
                    effects: [['restore_battery', 80]]
                },
                {
                    id: 'fuel_reserve',
                    name: '燃料储备',
                    desc: '一桶柴油，可以转化为补给。',
                    type: 'material',
                    rarity: 'standard',
                    discoveryThreshold: 10,
                    quantity: 2
                }
            ],
            interactions: [
                {
                    desc: '检查发电机状态',
                    results: {
                        timeCost: 5,
                        soundEffect: 'search',
                        narrative:
                            '发电机运行在临界状态，但暂时还能坚持。维护日志的最后一条写着：如果它停了，深层掩体的电磁收容场就会失效。如果收容场失效——上帝保佑我们所有人。'
                    }
                },
                {
                    desc: '修复核心线路',
                    requirements: {
                        puzzleSolved: {
                            title: '冷却重置',
                            lore: '聚变核心的冷却线缆被扯断了，需重新接驳接口。接口类型：接口 1（HV 高压火线），接口 2（GND 接地），接口 3（COOL 温度控制）。线缆颜色：红线、绿线、蓝线。请根据工业通用标准选择正确的配对方案：',
                            body: {
                                type: 'choice',
                                body: [
                                    '1-红 2-蓝 3-绿',
                                    '1-红 2-绿 3-蓝',
                                    '1-绿 2-蓝 3-红',
                                    '1-蓝 2-绿 3-红'
                                ],
                                answer: '1-红 2-绿 3-蓝'
                            },
                            hints: [
                                '工业通用标准：红线通常承担高压荷载(HV)。',
                                '保护性的接地线路(GND)常被标为绿色。',
                                '排查出前两项后，剩下的蓝色显然属于温度控制系统。'
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
                        soundEffect: 'success',
                        narrative:
                            '随着线缆正确连接，聚变核心发出深沉平稳的嗡鸣，备用照明被稳定的白光取代。你成功阻止了过热，并为掩体恢复了部分主能源。',
                        stateChange: { hp: 10, sanity: 5 }
                    }
                }
            ]
        },

        armory_room: {
            name: '核心军械库',
            desc: '重型武器架和弹药箱整齐排列。虽然大部分武器已经被取走，但还有一些装备留了下来。保险柜的门被强行炸开，地上有干涸的血迹。最诡异的是角落里那批没人碰过的弹药——它们的弹头被替换成了某种半透明的、像凝胶一样的材料。箱子上印着「铁壁专用」。',
            visualPrompt:
                'Military armory with metal weapon racks and stacked ammo boxes, blasted open safe, dried blood on the floor, suspicious gel-tipped ammunition marked Project Iron Wall',
            threatLevel: 7,
            items: [
                {
                    id: 'tactical_vest',
                    name: '战术背心',
                    desc: '防弹背心，提供额外的防护。',
                    type: 'armor',
                    rarity: 'organized',
                    discoveryThreshold: 15,
                    partialReduction: 0.2,
                    maxUses: 20
                },
                {
                    id: 'frag_grenade',
                    name: '破片手雷',
                    desc: '标准军用手雷。使用后消耗。',
                    type: 'weapon',
                    rarity: 'organized',
                    discoveryThreshold: 20,
                    weaponType: 'throw',
                    weaponDamageType: 'instant',
                    range: 3,
                    damage: 38,
                    maxUses: 1
                },
                {
                    id: 'bio_mask',
                    name: '生化防护面罩',
                    desc: '军用级防护面罩，滤芯已经发黄但仍可使用。',
                    type: 'accessory',
                    rarity: 'organized',
                    discoveryThreshold: 15,
                    effects: [['maxSanity', 20]]
                },
                {
                    id: 'ballistic_helmet',
                    name: '弹道防护头盔',
                    desc: '加装了辅助观瞄接口的重型头盔，视野边缘会浮现淡绿色准线。',
                    type: 'accessory',
                    rarity: 'organized',
                    discoveryThreshold: 18,
                    effects: [
                        ['maxHp', 15],
                        ['perception', 2]
                    ]
                }
            ],
            interactions: [
                {
                    desc: '检查铁壁弹药',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative:
                            '你拿起一枚凝胶弹头。它在你手指的温度下微微变软，你能感觉到它在……脉动。像是某种极其微小的心跳。你立刻把它放了回去。箱子背面贴着使用说明：射入目标体内后，凝胶将在 72 小时内完成同化。请勿在未穿戴全套防护装备时接触。',
                        stateChange: { sanity: -8 }
                    }
                }
            ]
        },

        ventilation_control: {
            name: '通风管控枢纽',
            desc: '巨大的排风扇在这里交汇，组成了前哨站庞大的呼吸器官。控制台布满了厚厚的灰尘。管道深处传来的风声极其浑浊，听起来像是某种沉睡怪物的巨大喘息。这里的空气质量极差，弥漫着浓烈的铁锈与腐败气味。',
            visualPrompt:
                'Massive ventilation hub with giant rusty fan blades, dust-covered control panel, gloomy lighting, airborne particulate matter visible in the light beams',
            threatLevel: 6,
            interactions: [
                {
                    desc: '尝试重启主循环风机',
                    requirements: {
                        puzzleSolved: {
                            title: '主循环风机重启',
                            lore: '风机控制台的启动序列因为数据损坏出现了缺失，你需要根据残余的递增规律填补阵列空白才能完成重启指令。当前阵列数据：[1], [2], [?], [7], [11]',
                            body: {
                                type: 'cloze',
                                body: [['1', '2', '', '7', '11']],
                                answer: ['4']
                            },
                            hints: [
                                '观察数字之间的差值。',
                                '1 到 2 差了 1，从空白到 7，以及 7 到 11 之间的差值逐渐扩大。',
                                '如果差值分别是 1、2、3、4 的等差数列，那么第二个数加 2 就是……'
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
                        soundEffect: 'success',
                        narrative:
                            '随着序列输入正确，巨大的扇叶发出了刺耳的摩擦声并缓缓转动起来。沉闷的浊气被抽走，新鲜的空气终于灌入了这个封闭的棺材，你感觉呼吸顺畅了许多。',
                        stateChange: { hp: 10 }
                    }
                }
            ]
        },

        waste_disposal: {
            name: '废料处理池',
            desc: '一个深不见底的圆柱形处理池，边缘挂着残破的黄黑相间警告条带。池底翻滚着荧光绿色的化学废液，散发着刺鼻的酸性蒸汽。几具穿着厚重防化服的尸体漂浮在上面，防毒面具的内侧完全被干涸发黑的血迹糊满。',
            visualPrompt:
                'Cylindrical hazard waste pit, glowing neon green chemical sludge at the bottom, tattered yellow and black hazard tape, hazmat suit corpses floating in the toxic stew',
            threatLevel: 10,
            interactions: [
                {
                    desc: '打捞漂浮的防化服',
                    results: {
                        timeCost: 15,
                        soundEffect: 'item_pickup',
                        narrative:
                            '你忍着剧烈的腐蚀性恶臭，用一根长棍将其中一具尸体勾了过来。当你试图剥开防化服寻找物资时，尸体由于鼓胀突然爆裂，喷射出带有腐蚀性的毒液。但你确实在夹层里找到了一块特种合金。',
                        stateChange: {
                            hp: -10,
                            gain: [
                                {
                                    id: 'high_tier_scrap',
                                    name: '特种合金废料',
                                    desc: '极其稀有的高强度军用合金，可以用来锻造高级装备。',
                                    type: 'material',
                                    rarity: 'deep'
                                }
                            ]
                        }
                    }
                }
            ],
            specificEnemy: {
                data: [
                    {
                        type: 'cthulhu',
                        id: 'sludge_amalgam',
                        name: '废液聚合体',
                        gender: 'both',
                        desc: '从处理池底部浮起的酸性肉块，防化服碎片与人类四肢被绿色絮状物缠成一体。它移动时发出类似排水口堵塞的咕噜声。',
                        visualPrompt:
                            'Amalgam of hazmat suit fragments and human limbs bound by glowing green sludge, rising from waste pit, acidic steam',
                        range: 2,
                        speed: 14,
                        damage: 20,
                        defense: 24,
                        evasion: 6,
                        intentDistribution: {
                            attack: 50,
                            defense: 24,
                            buff: 6,
                            debuff: 12,
                            observe: 8
                        },
                        lootTable: [
                            {
                                id: 'corrosive_gland',
                                name: '腐蚀性腺体',
                                desc: '充满酸性分泌物的异化腺体，可用于制作危险弹药。',
                                type: 'material',
                                rarity: 'organized',
                                dropProbability: 0.9
                            },
                            {
                                id: 'fuel_reserve',
                                name: '燃料储备',
                                desc: '一桶柴油，可以转化为补给。',
                                type: 'material',
                                rarity: 'standard',
                                dropProbability: 0.4
                            }
                        ]
                    }
                ],
                spawnCondition: 'on_search'
            }
        },

        deep_bunker: {
            name: '深层掩体走廊',
            desc: '阶梯通向地下更深处。温度骤降，你能看到自己呼出的白气。走廊的照明是紫外线灯管——所有的表面都呈现出诡异的荧光色调。某些墙面上有用肉眼看不到、但在紫外线下清晰可见的生物污染标记。空气中有一种甜腻的、类似烂水果的气味。每当天花板上的紫外线灯管由于电压不稳而短暂熄灭时，你总会确信走廊的尽头比刚才缩短了几分。远处偶尔传来的金属碰撞声，节奏规律得令人心悸。',
            visualPrompt:
                'Deep underground corridor, UV lighting casting everything in eerie fluorescent glow, biohazard markings visible under UV, cold breath visible, descending staircase',
            threatLevel: 12,
            childrenIds: [
                'bio_lab',
                'cryo_chamber',
                'server_room',
                'escape_tunnel',
                'training_room',
                'incinerator',
                'patient_zero_containment'
            ],
            interactions: [
                {
                    desc: '检查紫外线灯下的生物污染标记',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative:
                            '你靠近墙面。紫外线灯下，那些看似普通污渍的痕迹显现出清晰的轮廓——那不是喷溅的血迹，而是一行行被反复书写、又被反复擦去的同一句话：它不在容器里。它在我们之间。',
                        stateChange: { sanity: -6 }
                    }
                }
            ],
            specificEnemy: {
                data: [
                    {
                        type: 'cthulhu',
                        id: 'uv_crawler',
                        name: '紫外爬行者',
                        gender: 'both',
                        desc: '贴着深层走廊天花板移动的畸形实体。它的皮肤在紫外灯下呈现荧光蓝，脊椎外翻成一排细长的感应触须，能够捕捉呼吸与心跳造成的气流变化。',
                        visualPrompt:
                            'Pale humanoid crawler clinging to ceiling under UV light, fluorescent blue veins, external spine feelers, twitching limbs, deep bunker corridor',
                        range: 1,
                        speed: 32,
                        damage: 22,
                        defense: 8,
                        evasion: 28,
                        intentDistribution: {
                            attack: 64,
                            defense: 8,
                            buff: 6,
                            debuff: 12,
                            observe: 10
                        },
                        lootTable: [
                            {
                                id: 'contaminated_sample',
                                name: '污染样本',
                                desc: '密封在破裂培养管中的活性组织，仍在轻微收缩。',
                                type: 'material',
                                rarity: 'abyssal',
                                dropProbability: 0.5
                            }
                        ]
                    }
                ],
                spawnCondition: 'on_search'
            },
            exits: [{ targetId: 'engineering_bay', label: '返回重装备工程走廊', type: 'local' }]
        },

        bio_lab: {
            name: '生化实验室',
            desc: '密封的玻璃隔间中排列着培养皿和离心机。大部分设备已经损毁，但有一台培养箱还在运行——里面的培养基上生长着某种珊瑚状的有机物，它的颜色在你注视的过程中缓慢变化。实验台上散落着注射器和手术工具，一些工具上沾着的血迹是蓝绿色的。',
            visualPrompt:
                'Biohazard lab with sealed glass chambers, destroyed equipment, one active incubator with color-shifting coral-like organism, blue-green blood stains on surgical tools',
            threatLevel: 15,
            items: [
                {
                    id: 'military_experiment_log',
                    name: '军方实验日志',
                    desc: '盖着最高机密印戳的活页夹。大量内容被墨水涂抹。',
                    type: 'data',
                    rarity: 'deep',
                    discoveryThreshold: 20,
                    documentContent:
                        '项目代号：铁壁。目标：利用异变组织样本开发生化武器。第 17 天：样本表现出高度智能。它在用莫尔斯电码敲击培养皿。第 23 天：样本突破了第一层收容。两名研究员被同化。第 24 天：军令——封锁深层掩体，所有被感染人员就地处决。第 25 天：[最后一行被鲜血覆盖]'
                },
                {
                    id: 'bio_stimulant',
                    name: '实验型增强剂',
                    desc: '标签上写着「仅供铁壁项目人员使用」。效果强烈但来源可疑。',
                    type: 'consumable',
                    rarity: 'organized',
                    discoveryThreshold: 25,
                    effects: [['heal_hp', 45]]
                },
                {
                    id: 'neural_filter_prototype',
                    name: '神经过滤原型插件',
                    desc: '从清理人装备上拆下的实验插件，外壳上刻着基金会资产编号。',
                    type: 'accessory',
                    rarity: 'deep',
                    discoveryThreshold: 25,
                    effects: [
                        ['maxSanity', 30],
                        ['spiritual', 4]
                    ]
                }
            ],
            interactions: [
                {
                    desc: '检查运行中的培养箱',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative:
                            '你靠近培养箱。珊瑚状有机物突然停止了颜色变化，整体变成了与你皮肤完全相同的色调。它迅速重组——在你眼前形成了一只微型的、完美复刻的人类手掌。五根手指朝着你张开，仿佛在打招呼。',
                        stateChange: { sanity: -15 }
                    }
                }
            ],
            specificEnemy: {
                data: [
                    {
                        type: 'cthulhu',
                        id: 'iron_wall_specimen',
                        name: '铁壁实验体-Γ',
                        gender: 'both',
                        desc: '它曾是一名研究员——至少实验服上的门禁卡这样显示。但现在，它的上半身已被蓝绿色的珊瑚状组织覆盖，每一个枝桠的末端都长着一只未发育完全的眼球。它用四肢以不自然的速度爬行，发出金属与骨骼摩擦的声响。',
                        visualPrompt:
                            'A horrifying humanoid mutation, upper half covered in blue-green coral-like alien growths, underdeveloped eyeballs sprouting at coral branch ends, exposed bone and torn hazmat suit, dim UV lighting',
                        range: 2,
                        speed: 30,
                        damage: 34,
                        defense: 16,
                        evasion: 20,
                        intentDistribution: {
                            attack: 54,
                            defense: 10,
                            buff: 14,
                            debuff: 14,
                            observe: 8
                        },
                        lootTable: [
                            {
                                id: 'mutated_tissue',
                                name: '异变组织样本',
                                desc: '具有极高科研价值，但非常危险。',
                                type: 'material',
                                rarity: 'abyssal',
                                dropProbability: 1.0
                            },
                            {
                                id: 'unstable_stimulant',
                                name: '不稳定增强剂',
                                desc: '从实验体残骸中回收的注射器，液体颜色不断变化。',
                                type: 'consumable',
                                rarity: 'organized',
                                effects: [['heal_hp', 30]],
                                dropProbability: 0.35
                            },
                            {
                                id: 'bio_mask',
                                name: '生化防护面罩',
                                desc: '军用级防护面罩，滤芯已经发黄但仍可使用。',
                                type: 'accessory',
                                rarity: 'organized',
                                effects: [['maxSanity', 20]],
                                dropProbability: 0.2
                            }
                        ]
                    }
                ],
                spawnCondition: 'on_search'
            }
        },

        cryo_chamber: {
            name: '低温冻存室',
            desc: '一排排液氮冷冻舱在黑暗中散发着白色的冷气。大部分冷冻舱是空的——盖子被从里面撞开了。只有最后一排还有三个处于密封状态。透过结了霜的观察窗，你看到里面的标本不像任何你认识的生物——它没有明确的形状，更像是一团凝固的噩梦。',
            visualPrompt:
                'Rows of liquid nitrogen cryogenic pods in darkness, most pods opened from inside, three sealed pods with frost-covered viewports showing amorphous dark shapes, white vapor',
            threatLevel: 15,
            items: [
                {
                    id: 'cryo_specimen',
                    name: '冻存标本',
                    desc: '密封在液氮容器中的半透明组织。即使在极低温下，它仍在缓慢蠕动。',
                    type: 'material',
                    rarity: 'abyssal',
                    discoveryThreshold: 25
                },
                {
                    id: 'cryo_manifest',
                    name: '冻存清单',
                    desc: '严重霜冻损坏的文件。',
                    type: 'data',
                    rarity: 'standard',
                    discoveryThreshold: 15,
                    documentContent:
                        '冻存单元 01-07：已脱离收容。状态：活跃。冻存单元 08-10：密封完好。状态：休眠。紧急协议：在任何情况下不得解冻 08-10 号单元。手写补充：08 号在沉睡中微笑了。'
                },
                {
                    id: 'cryo_sealant',
                    name: '低温密封凝胶',
                    desc: '原本用于冷冻舱应急密封的凝胶，涂抹在太阳穴附近时会带来刺痛但清醒的感觉。',
                    type: 'consumable',
                    rarity: 'organized',
                    discoveryThreshold: 20,
                    effects: [
                        ['heal_sanity', 20],
                        ['heal_vigor', 20]
                    ]
                }
            ],
            interactions: [
                {
                    desc: '靠近密封的冷冻舱',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative:
                            '你贴近 08 号冻存舱的观察窗，用手擦去凝结的霜。里面的东西——你拒绝称它为生物——静静地悬浮在零下 196 度的寂静中。然后，就在你的手掌还贴在玻璃上时，它缓缓地把一个类似手掌的附肢贴在了你手掌的正对面。舱内温度计跳了一下。',
                        stateChange: { sanity: -12 }
                    }
                }
            ]
        },

        server_room: {
            name: '中央数据中心',
            desc: '服务器机柜发出低沉的嗡鸣。满地的网线和光纤像是电子丛林。主终端还在运行，屏幕上滚动着无尽的日志。这里是铁壁计划所有数据的存储中心——如果你能解锁加密终端，就能了解军方到底做了什么。一台自动安保炮塔在机柜间缓慢转动枪口，红色传感器扫过每一寸地面。',
            visualPrompt:
                'Server racks humming, green LED lights blinking in rows, tangled cables covering the floor, active main terminal with scrolling logs, automated security turret sweeping red sensor',
            threatLevel: 10,
            items: [
                {
                    id: 'encrypted_disk_core',
                    name: '核心数据盘',
                    desc: '军方级加密存储设备。指示灯仍在微弱闪烁。',
                    type: 'data',
                    rarity: 'organized',
                    discoveryThreshold: 20,
                    documentContent:
                        '[解密后] 铁壁计划核心摘要：军方从异变区域回收了一个活体信号源。他们没有销毁它，而是试图与它通讯。它回答了。回答内容被标记为人类语言无法准确翻译，但最接近的翻译是：我们接受了你们的邀请。'
                }
            ],
            interactions: [
                {
                    desc: '破解加密终端',
                    requirements: {
                        items: ['signal_decoder'],
                        puzzleSolved: {
                            title: '铁壁加密终端',
                            lore: '终端屏幕上闪烁着绿色的提示符：请输入铁壁协议启动日期以获取深层解密权限。根据你之前在其他区块得到的情报，该生化实验立项始于 2023 年 10 月，随后在第 24 天全面失控并下达了封锁军令。请按系统默认的 DDMMYY 格式组合 6 位数字密码：',
                            body: {
                                type: 'type',
                                answer: '241023'
                            },
                            hints: [
                                '协议启动日期和异变全面爆发并封锁掩体的日子相关。',
                                '第 24 天发生了一项决定性事件——军令下达封锁深层掩体。并且实验始于 10 月初。',
                                '密码系统通常遵循 DDMMYY 格式：对应的正是第 24 天，10 月，2023 年。'
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
                        soundEffect: 'typing_1',
                        narrative:
                            '终端的红色锁定界面切换为绿色。所有数据文件已解密。你看到了铁壁计划的全部真相：军方从异变区域回收了一个活体信号源。他们没有销毁它——他们试图与它通讯。而它回答了。回答的内容被标记为人类语言无法准确翻译，但最接近的翻译是：我们接受了你们的邀请。',
                        stateChange: { sanity: 5 }
                    }
                }
            ],
            specificEnemy: {
                data: [
                    {
                        type: 'immovable',
                        id: 'security_turret',
                        name: '自律安保炮塔',
                        desc: '一座焊死在服务器机柜间的自动炮塔。它的光学传感器仍在执行最后的守卫指令，把任何移动的物体都判定为入侵者。装甲厚重，无法移动，也无需闪避。',
                        visualPrompt:
                            'Automated security turret bolted between server racks, red optical sensor sweeping, heavy armored housing, dim green server lights',
                        range: 10,
                        speed: 18,
                        damage: 28,
                        defense: 0.38,
                        lootTable: [
                            {
                                id: 'high_tier_scrap',
                                name: '特种合金废料',
                                desc: '极其稀有的高强度军用合金，可以用来锻造高级装备。',
                                type: 'material',
                                rarity: 'deep',
                                dropProbability: 0.7
                            },
                            {
                                id: 'power_cell',
                                name: '军用电池',
                                desc: '高容量电池组，可以为设备充电。',
                                type: 'consumable',
                                rarity: 'organized',
                                effects: [['restore_battery', 80]],
                                dropProbability: 0.4
                            }
                        ]
                    }
                ],
                spawnCondition: 'on_search'
            }
        },

        escape_tunnel: {
            name: '紧急逃生通道',
            desc: '一条狭窄的混凝土隧道，由应急灯照明。大约二十米处发生了部分塌方，碎石和断裂的钢筋堵住了大半通道，但还有一个人勉强能够挤过的缝隙。从缝隙的另一侧传来冷风——以及某种类似呼吸的有节奏的气流。隧道墙壁上有用红色化学发光棒写的字：不要回头。',
            visualPrompt:
                'Narrow concrete escape tunnel, emergency lighting, partial collapse creating tight squeeze point, red chemlight writing on wall, wind from beyond the rubble',
            threatLevel: 12,
            items: [
                {
                    id: 'escape_map',
                    name: '逃生通道地图',
                    desc: '手绘的通道示意图，某些路径被红笔标注了「已塌方」。',
                    type: 'data',
                    rarity: 'organized',
                    discoveryThreshold: 10,
                    documentContent:
                        '紧急逃生通道——仅限 A 级以上军官。路线：深层掩体 → 通风竖井 → 地表出口（距掩体约 800 米）。注意：通道于灾变第三天部分塌方。最后一批撤离人员报告看到了墙壁在移动。此后无人尝试使用此路线。'
                },
                {
                    id: 'tactical_flashlight',
                    name: '战术手电',
                    desc: '高亮度军用手电。光束坚定如刀，切开黑暗。',
                    type: 'material',
                    rarity: 'standard',
                    discoveryThreshold: 10
                }
            ],
            interactions: [
                {
                    desc: '尝试挤过塌方处',
                    results: {
                        timeCost: 10,
                        soundEffect: 'terrifying',
                        narrative:
                            '你侧身挤过碎石间的缝隙。另一侧的隧道完好无损，但有什么不对——墙壁是湿的，带着体温。你的手电照亮了前方：隧道的尽头不是出口，而是一面由肉色组织构成的脉动的膜。它随着那有节奏的呼吸起伏着。你选择退回来。',
                        stateChange: { sanity: -15 }
                    }
                }
            ],
            exits: [{ label: '穿越逃生通道', type: 'zone_transfer' }]
        },

        training_room: {
            name: '训练场',
            desc: '一个开阔的地下空间，曾用于近战训练和体能测试。地面铺着防震橡胶垫，角落里摆放着沙袋和武器训练架。有些沙袋被劈开了——里面不是沙子，而是某种黑色的、已经干燥结块的有机物。训练用的木质人形靶上有不属于任何武器造成的创伤痕迹。',
            visualPrompt:
                'Underground training hall with rubber floor mats, punching bags, weapon racks, some bags split open revealing dried black organic matter, damaged wooden dummies with alien claw marks',
            threatLevel: 8,
            items: [
                {
                    id: 'training_knife',
                    name: '训练刀',
                    desc: '训练用的真刀，刀刃上有细微的缺口——以及一些你无法辨认的蓝绿色残留物。',
                    type: 'weapon',
                    rarity: 'standard',
                    discoveryThreshold: 5,
                    weaponType: 'prick',
                    weaponDamageType: 'cold',
                    range: 1,
                    damage: 7,
                    maxUses: 8
                },
                {
                    id: 'training_manual',
                    name: '反同化训练手册',
                    desc: '封面印有「仅限深层掩体人员」的军用手册。',
                    type: 'data',
                    rarity: 'standard',
                    discoveryThreshold: 8,
                    documentContent:
                        '第 7 课：当肢体被异变组织附着超过 3 秒，立即执行自我截肢。第 8 课：若听见已死亡队友呼叫你的姓名，不要回应。第 9 课：不要试图理解它们的语言。理解即污染。附录：训练有效率 12%。'
                }
            ],
            interactions: [
                {
                    desc: '检查训练日志',
                    results: {
                        timeCost: 5,
                        soundEffect: 'search',
                        narrative:
                            '训练日志的最后几页记录了一种新的格斗训练课程——不是教士兵如何攻击，而是教他们如何在被同化部位缠住时自行截肢。附带的图示令人作呕。最后一条注释：训练有效率：12%。其他人来不及截肢就被完全同化了。',
                        stateChange: { sanity: -5 }
                    }
                }
            ]
        },

        incinerator: {
            name: '高炉焚化室',
            desc: '为了快速处理被感染的尸体和生物组织，军方临时征用了这座巨型工业高炉。尽管已经停机，靠近时依然能感受到从内部传出的骇人余温。厚重的铸铁大门半掩着，一条长长且呈现碳化的血污拖痕从炉内一直延伸到下水管道口。',
            visualPrompt:
                'Massive industrial blast furnace repurposed as an incinerator, still radiating heat, iron doors slightly ajar, charred drag marks leading from the furnace to a dark drainage grate',
            threatLevel: 13,
            items: [
                {
                    id: 'charred_iron_pipe',
                    name: '烧焦的铁棍',
                    desc: '原本用来拨弄炉火的粗重铁棍，一端已经碳化。',
                    type: 'weapon',
                    rarity: 'standard',
                    discoveryThreshold: 8,
                    weaponType: 'wave',
                    weaponDamageType: 'cold',
                    range: 1,
                    damage: 16,
                    maxUses: 15
                },
                {
                    id: 'refractory_plate',
                    name: '耐热合金板',
                    desc: '从高炉内壁上剥落的合金板，仍然带着异常余温。',
                    type: 'material',
                    rarity: 'organized',
                    discoveryThreshold: 15,
                    quantity: 2
                }
            ],
            interactions: [
                {
                    desc: '探查高炉内部',
                    results: {
                        timeCost: 10,
                        soundEffect: 'terrifying',
                        narrative:
                            '你小心翼翼地推开沉重的铁门，探头看向还在冒烟的炉栅。突然，一阵低沉的咳嗽声从灰烬深处传来。紧接着，一只完全焦黑、只剩骨骼和几缕发光肉质的手臂猛地探出，抓向你的脚踝。你立刻重重地关上了铁门。',
                        stateChange: { sanity: -10 }
                    }
                }
            ]
        },

        patient_zero_containment: {
            name: '零号收容单元',
            desc: '深层掩体的绝对禁忌核心。这里没有任何常规病房的设施，只有一个悬挂在半空中的庞大钛合金球体。令人绝望的是，球体被某种难以想象的力量从内部暴力撕裂了。断裂的边缘向外翻卷，厚达三十厘米的装甲仿佛纸片一般被剥开。周围的墙壁上布满了由高温射线烧灼出的同心圆放射状烙印。',
            visualPrompt:
                'Ultimate containment core, a massive titanium sphere suspended in mid-air, violently torn open from the inside out, 30cm thick armor peeled like foil, concentric radioactive scorch marks on surrounding walls, intense oppressive atmosphere',
            threatLevel: 18,
            items: [
                {
                    id: 'first_contact_record',
                    name: '最初接触记录',
                    desc: '被保存在防爆箱内的黑色数据盘，表面有被融化的痕迹。',
                    type: 'data',
                    rarity: 'deep',
                    discoveryThreshold: 20,
                    documentContent:
                        '协议：深渊凝视。我们挖出了它。它在休眠。我们试图唤醒它以获取科技，但这完全是个错误。当它睁开眼睛时，我们的时空被重写了。它不需要传播病毒，它传播的是物理法则本身的变异。原谅我们。'
                }
            ],
            specificEnemy: {
                data: [
                    {
                        type: 'cthulhu',
                        id: 'patient_zero_echo',
                        name: '零号回声',
                        gender: 'both',
                        desc: '它没有固定的生物学形态，像是由成千上万个惨死者的怨念、血肉与扭曲的重力场揉捏而成的混沌结块。周遭的空气由于它的存在而产生剧烈的畸变，每一次闪烁都伴随着刺耳的低频噪音，直刺大脑皮层。',
                        visualPrompt:
                            'A horrific floating amalgamation of human flesh and dark swirling gravity distortion, no fixed shape, tormented faces emerging and dissolving within the mass, air warping violently around it, intense cosmic horror aesthetic',
                        range: 8,
                        speed: 56,
                        damage: 64,
                        defense: 32,
                        evasion: 42,
                        intentDistribution: {
                            attack: 44,
                            defense: 8,
                            buff: 20,
                            debuff: 20,
                            observe: 8
                        },
                        lootTable: [
                            {
                                id: 'zero_core',
                                name: '零号核心',
                                desc: '散发着奇异光芒的结晶体，似乎蕴含着某种高维度的能量。',
                                type: 'material',
                                rarity: 'deep',
                                dropProbability: 1.0
                            },
                            {
                                id: 'echo_membrane',
                                name: '回声膜片',
                                desc: '从零号回声边缘剥落的半透明组织，仍在折射不存在的光。',
                                type: 'material',
                                rarity: 'abyssal',
                                dropProbability: 0.45
                            },
                            {
                                id: 'echo_lens',
                                name: '回声透镜',
                                desc: '由零号回声残骸凝结出的透镜，佩戴后会听见极远处的低语。',
                                type: 'accessory',
                                rarity: 'deep',
                                effects: [
                                    ['spiritual', 8],
                                    ['maxSanity', 25]
                                ],
                                dropProbability: 0.25
                            }
                        ]
                    }
                ],
                spawnCondition: 'on_enter'
            }
        },

        field_medical: {
            name: '野战医务室',
            desc: '一间用帆布和钢管搭建的简易医务室，紧邻安保检查站。折叠手术台上还残留着碘伏的黄褐色痕迹。药品柜基本被搬空了，但在角落的一个上锁铁箱里可能还有遗留物资。有人在手术台旁的墙上用红十字和箭头画了一套简化的伤口处理流程——最后一步写的不是包扎，而是祈祷。',
            visualPrompt:
                'Canvas and steel pipe field medical station, folding surgery table with iodine stains, mostly empty medicine cabinet, locked iron case, crude medical procedure chart ending with pray',
            items: [
                {
                    id: 'bandage',
                    name: '急救绷带',
                    desc: '简单的止血用品。恢复 HP。',
                    type: 'consumable',
                    rarity: 'standard',
                    discoveryThreshold: 5,
                    effects: [['heal_hp', 25]]
                },
                {
                    id: 'painkillers',
                    name: '止痛药',
                    desc: '只能麻痹肉体。恢复少量 HP。',
                    type: 'consumable',
                    rarity: 'standard',
                    discoveryThreshold: 10,
                    effects: [['heal_hp', 15]]
                },
                {
                    id: 'sedative',
                    name: '军用镇静剂',
                    desc: '标签已被撕掉一半，剩余文字警告不得连续使用。',
                    type: 'consumable',
                    rarity: 'organized',
                    discoveryThreshold: 12,
                    effects: [
                        ['heal_sanity', 18],
                        ['heal_vigor', 12]
                    ]
                }
            ],
            interactions: [
                {
                    desc: '处理外伤',
                    results: {
                        timeCost: 20,
                        soundEffect: 'item_use',
                        narrative: '你用残余碘伏和绷带处理伤口。疼痛让你清醒，但至少血止住了。',
                        stateChange: { hp: 10 }
                    }
                },
                {
                    desc: '撬开铁箱',
                    results: {
                        timeCost: 15,
                        soundEffect: 'success',
                        narrative:
                            '铁箱锁扣已经锈蚀，用力一拉就断了。里面有一套军用急救包——酒精、手术缝合线、止血带。还有三支没有标签的注射器，里面的液体呈现不自然的荧光绿色。你决定只拿急救包。',
                        stateChange: {
                            gain: [
                                {
                                    id: 'military_medkit',
                                    name: '军用急救包',
                                    desc: '完整的野战急救套件。',
                                    type: 'consumable',
                                    rarity: 'organized',
                                    effects: [['heal_hp', 40]]
                                }
                            ]
                        }
                    }
                }
            ],
            exits: [{ targetId: 'security_checkpoint', label: '返回安保检查站', type: 'local' }]
        },

        blast_door: {
            name: '主防爆门',
            desc: '一扇半米厚的铅制大门将这里与外界隔绝。巨大的转轮门锁上警示红灯闪烁。门外的盖格计数器正在疯狂鸣叫，读数远超安全范围。门的内侧有人用焊接枪写了两行字：上面一行是 ABANDON ALL HOPE，下面一行歪歪扭扭地写着中文——但希望从来不是活下去的必需品。',
            visualPrompt:
                'Thick lead blast door, massive wheel lock with flashing red warning light, geiger counter nearby clicking frantically, welded English and Chinese text on inner surface',
            threatLevel: 10,
            items: [
                {
                    id: 'dog_tags',
                    name: '军牌',
                    desc: '沾染血迹的身份铭牌。',
                    type: 'material',
                    rarity: 'standard',
                    discoveryThreshold: 5
                }
            ],
            interactions: [
                {
                    desc: '贴耳倾听',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative:
                            '你把耳朵贴在冰冷的铅门上，听到门外有沉重的呼吸声和无数利爪抓挠金属的刺耳声。然后——声音停了。取而代之的是一种更令人恐惧的声音：完美的、带有人类语调的敲门声。三下。你屏住呼吸，没有回应。又是三下。然后是一个你认识的人的声音，在门外说：是我，让我进去。',
                        stateChange: { sanity: -10 }
                    }
                }
            ],
            exits: [
                { targetId: 'security_checkpoint', label: '返回安保检查站', type: 'local' },
                { label: '强行开启大门离开', type: 'zone_transfer' }
            ]
        }
    }
};