import type { SanctuaryTemplate } from '../../contract/meta';
import {
    I,
    P,
    E,
    act,
    node,
    danger,
    uRes,
    enemy,
    loot,
    quest,
    npc,
    createReplacement,
    roam,
    sanctuary,
    svg
} from './sanctuaryFactory'

/**
 * 铁锈前哨 (Rust Outpost)
 *
 * 核心拓扑与规约：
 * 1. 结构拓扑：安保检查站中枢(1)、指挥区(9)、生活区(10)、工程舱(8)、深层掩体(10，高危物理锁定)、野战医务室(1)、主防爆门(1)，共计整 40 个节点。
 * 2. 威胁曲线：地表边缘 1~6 级 → 重工程走廊 5~7 级 → 深层辐射掩体 7~11 级 + 关底高维实体。
 * 3. 物质与异态：八阶工造层级与深渊正交异态（血肉融合、认知侵蚀、因果倒错）全面落地。
 * 4. 实体规约：克苏鲁系敌人意图分布精准归一化至 100；不可动安保炮塔严格遵循 ImmovableEnemyTemplate。
 */
export const ZONE_BUNKER: SanctuaryTemplate = sanctuary(
    'bunker',
    '铁锈前哨',
    '一座冷战时期开凿的地下加固防空洞，曾是大灾变前夕军方驻扎的钢铁壁垒。在深渊基金会技术顾问的深度介入下，这里秘密启动了代号「铁壁」的生化武装工程——试图利用深渊星神质提取液、清理人遗留的试作型神经链接仪核心与高维信号残片锻造不朽单兵。降临波峰到来时，收容单元发生维度坍塌，军方高层紧急下达全封锁与就地处决令。如今地表部分沦为拾荒者与生还者的避风港，而深层走廊深处，某些未曾死透的造物仍在紫外灯管下缓慢增殖。',
    '以安保检查站为地面防线中枢，向内辐射指挥中枢走廊（8个情报作战分区）、生活区干道（9个生存维稳分区）、重装备工程走廊（7个动力维护分区）；工程走廊末端由重型气动锁闭隔绝深层掩体走廊（9个绝密生物与零号收容分区）；中枢外侧另设野战医务室与通往外界荒原的主防爆门。',
    'Military Bunker, Industrial Rust, Cold War Aesthetics, Dim Emergency Lighting, UV Deep Labs, Volumetric Fog, Cinematic Horror',
    {
        entrance: 'security_checkpoint',
        nodesCount: 40,
        factor: 1.0,
        res: [24, 48],
        pop: 6,
        erosion: 20,
        uniqueResources: [
            uRes(
                'medicine',
                '药品',
                '药剂调配站回收再加工的过期药剂与残余药材，可用于抑制感染并缓解神经刺痛。',
                svg('<rect x="3" y="9" width="18" height="7" rx="3.5"/><path d="M12 9v7"/>'),
                14
            ),
            uRes(
                'electricity',
                '电力',
                '以微型聚变核心作为稳压中枢的混合发电机输出的高压电流，维系防爆门与通风系统运转。',
                svg('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
                72,
                0.1
            ),
            uRes(
                'scraps',
                '废料',
                '报废军械、装甲残片与不明金属压成的可用坯料，是前哨加固工事与升级设施的核心货币。',
                svg('<path d="M4 7h16v10H4z"/><path d="M8 7v10M16 7v10"/>'),
                80
            )
        ]
    },

    // =========================================================================
    // 1. 核心中枢区 (1 节点)
    // =========================================================================
    node(
        'security_checkpoint',
        '安保检查站',
        '坚固的混凝土掩体入口，厚重的防弹玻璃布满蛛网状裂纹，沾染着干涸发黑的血印。生锈的旋转闸机闪着微弱的黄光。作为庇护所中枢，这里勉强保留了最低限度的照明与通风循环，两侧的机枪射击孔正无声地监视着空荡荡的走廊。',
        'Concrete checkpoint, bulletproof glass with spider-web cracks and dark stains, dull yellow lights, rusted turnstiles, faded color-coded floor lines, makeshift sanctuary hub, dim but stable lighting',
        {
            children: ['command_sector', 'living_quarters', 'engineering_bay'],
            items: [
                I.data(
                    'checkpoint_log',
                    '检查站值班日志',
                    '一本被咖啡渍和黑色指纹覆盖的值班记录，纸质发脆。',
                    '第 1 天：防爆门关闭。外部电磁通讯断续。第 3 天：清理人频道彻底消失。第 5 天：有人声称在监视器里看见门外站着自己的家人。第 7 天：严禁记录门外传来的任何呼唤。补充：如果安检机自行亮起绿灯，闭上眼，不要看摄像头。',
                    { threshold: 5 }
                )
            ],
            interacts: [
                act(
                    '整理临时营地',
                    '你把散落的物资归拢到防爆墙后，检查通风阀读数。短暂的秩序感让你紧绷的神经稍微松弛，手心的冷汗慢慢风干。',
                    { cost: 20, san: 5 }
                ),
                act(
                    '核对物资封条',
                    '你逐一检查箱体封条。多数仍然完好，只有一箱医疗物资的封签被揭开过。胶水下压着一小撮细密的黑色菌丝，正随着气流微微起伏。',
                    { cost: 10, sound: 'search', san: 2 }
                )
            ],
            npc: npc(
                'npc_quartermaster_harper',
                '军需官哈珀',
                '前哨站的军需官，负责物资登记与配给分配。他的左臂从肘部以下被替换成粗糙的军工机械义肢，活动时伴随着沉闷的齿轮咬合声。他固执地坚持按战时条令办事，但在条令无法覆盖的灰色地带，他会用沉默代替拒绝。',
                'Middle-aged military quartermaster with a crude mechanical forearm, oil-stained uniform, tired but disciplined eyes, checkpoint dim lighting',
                {
                    gender: 'male',
                    trust: 35,
                    attrs: { strength: 14, agility: 12, wisdom: 18, awareness: 22, will: 16, cthulhu: 4 },
                    vitals: { maxHp: 120, maxSanity: 110, maxStamina: 105, maxVigor: 110 },
                    quests: [
                        quest(
                            'supply_manifest',
                            '哈珀需要重建前哨的物资台账。他要求你从中央指挥室回收封存的军用弹药箱，并从后勤办公室取回最后的配给凭证，以便审计现存物资并加固检查站外围。',
                            4,
                            [
                                I.material('ammo_box', '军用弹药箱', '完好的制式弹药封箱，内含未拆封的标准步枪弹药。', {
                                    grade: 'military',
                                    size: [2, 1]
                                }),
                                I.data('supply_requisition', '最后配给凭证', '一张盖着深红印戳的物资调配单，末尾写着「仅用于活人」。')
                            ],
                            [
                                I.consumable(
                                    'military_medkit',
                                    '军用急救包',
                                    '配备止血带、聚维酮碘与急救缝合针的野战医疗包。',
                                    [['hp', 40]],
                                    { grade: 'military', size: [2, 1] }
                                ),
                                I.consumable('power_cell', '军用电池', '高容量同位素电容电池，可为设备提供长效电力。', [['battery', 80]], {
                                    grade: 'military'
                                })
                            ]
                        ),
                        quest(
                            'black_inventory',
                            '哈珀必须确认深层掩体内的「铁壁」实验究竟失控到了何种地步。他需要你深入隔离层带回一份完整的异变组织样本。他无法承诺这能换来方舟的救援，但至少能让死者不再背负叛逃的污名。',
                            8,
                            [
                                I.material('mutated_tissue', '异变组织样本', '从铁壁实验体残骸上剥离的活性组织，封存在防爆管内。', {
                                    grade: 'prototype'
                                })
                            ],
                            [
                                I.accessory(
                                    'neural_filter_mk2',
                                    '改良神经过滤插件',
                                    '哈珀用清理人遗留晶片改装的过滤模块，能更有效地阻断高维认知污染。',
                                    [['maxSanity', 35], ['will', 5]],
                                    { grade: 'corporate' }
                                )
                            ]
                        )
                    ],
                    canBeInvited: {
                        trust: 60,
                        questsArchived: ['black_inventory'],
                        replacement: [
                            createReplacement(
                                '军需官',
                                '负责前哨台账与配给统筹的人员，需拥有高度敏锐的审计与仓储管理能力。',
                                { attributes: { wisdom: 14, awareness: 16 }, vitals: { maxStamina: 90 } }
                            )
                        ],
                        isSanctuarySafe: { food: 30, water: 30 }
                    }
                }
            ),
            exits: [E.to('blast_door', '检查主防爆门'), E.to('field_medical', '前往野战医务室')]
        }
    ),

    // =========================================================================
    // 2. 指挥中枢区 (9 节点)
    // =========================================================================
    node(
        'command_sector',
        '指挥中枢走廊',
        '铺着防滑钢板的加固走廊，两旁墙壁上贴满泛黄的战术避险挂图。上方一整排状态指示灯已近熄灭，只有尽头的一盏应急红灯在以规律的三短一长频率闪烁，像是一串永远无法完成的莫尔斯求救信号。',
        'Steel-plated floor corridor, faded tactical posters, lists of names crossed out in red marker, status lights mostly dead, one blinking red',
        {
            danger: danger.level(2),
            children: [
                'command_center',
                'surveillance_room',
                'comms_room',
                'war_room',
                'intel_room',
                'interrogation_room',
                'records_archive',
                'logistics_office'
            ],
            interacts: [
                act(
                    '检查状态指示灯',
                    '你靠近红灯观察，发现灯罩内部落满死去的飞蛾尸体。就在你试图抄录其闪烁规律时，电流突然爆鸣，灯光瞬间熄灭，走廊陷入数秒绝对死寂的黑暗。',
                    { cost: 5, sound: 'error', san: -2 }
                )
            ]
        }
    ),

    node(
        'command_center',
        '中央指挥室',
        '前哨站的中枢神经脑区。几台重型终端的绿色荧光屏依然亮着，满地散落着军用步枪弹壳。墙上的巨幅电子态势图被定格在灾变爆发前夜，代表阵地沦陷的红色叉号密集覆盖了整个区域，而最后一个红叉精准烙印在掩体自身的坐标之上。',
        'Underground bunker command center, rusty terminals glowing green, tactical maps with red markers, bullet casings on the floor, final red X on the bunker position',
        {
            danger: danger.level(3),
            map: 'bunker_command',
            items: [
                I.weapon(
                    'officer_pistol',
                    '军官配枪',
                    '一把保养完好、配重精确的 M1911 手枪，枪柄胡桃木贴片上刻着一行模糊的祷词。',
                    'pistol',
                    5,
                    24,
                    [0.2, 16],
                    28,
                    { damageType: 'range', grade: 'military', threshold: 20 }
                ),
                I.material('ammo_box', '军用弹药箱', '里面整齐装填着军用制式枪弹，铅封完好。', {
                    grade: 'military',
                    size: [2, 1],
                    threshold: 5,
                    qty: 3
                }),
                I.data(
                    'hidden_plan',
                    '防御部署图',
                    '一张染有暗红血斑的蓝图，详细标注了掩体内部的暗格与安防盲区。',
                    '机密·阅后即焚。7号防区失守，全员后撤至掩体深层并降下铅防爆门。严禁向任何未持认证卡者开门。补充：外部通讯已完全中断72小时。昨夜防爆门外传来整齐的踢正步声，但雷达上什么都没有。',
                    { grade: 'military', threshold: 15 }
                )
            ],
            interacts: [
                act(
                    '重启主战术面板',
                    '你强行合上电闸。屏幕在一阵尖啸后跳出混乱的几何雪花，紧接着浮现出一张由神经节错乱拼接出的非人面孔。屏幕熄灭前的最后日志显示：铁壁协议已进入终末清除阶段。',
                    { cost: 5, sound: 'error', san: -5 }
                )
            ]
        }
    ),

    node(
        'surveillance_room',
        '安保监控室',
        '成排的阴极射线管监视器大部分已烧蚀黑屏，剩下的屏幕在不断刷新着雪花条纹。控制台前倒着半杯干涸发霉的速溶咖啡。其中一块监视屏诡异地映射出监控室内部的俯视景象——画面里，在你身侧的阴影中，正伫立着一个轮廓扭曲的瘦长黑影。',
        'Wall of CRT security monitors, mostly static, control console with a moldy coffee cup, one monitor showing the room itself with an extra shadow figure, dim cold lighting',
        {
            danger: danger.level(4),
            items: [
                I.data(
                    'security_log',
                    '安保监控日志',
                    '记录了撤离前夕几个关键摄像头的异常报告。',
                    '03:14 监控04画面撕裂。03:22 监控05捕捉到走廊墙面像肺泡一样舒张。03:40 监控07（深层掩体隔离门）显示内侧铰链被融化，但门禁传感器依然锁死在闭合状态。',
                    { threshold: 10 }
                )
            ],
            interacts: [
                act(
                    '切换深层监视信号',
                    '屏幕强行切入底层冷藏区。红外夜视画面中，一团巨大的肉质聚合体吸附在天花板上，数十枚惨白的眼球无声地转向镜头。屏幕在下一秒被剧烈的电磁杂音撕得粉碎。',
                    { cost: 5, sound: 'terrifying', san: -8 }
                )
            ]
        }
    ),

    node(
        'comms_room',
        '机密通讯室',
        '大功率军用短波电台整齐排列在防震架上，几副耳机垂挂在调谐旋钮旁。终端扬声器不时喷出一阵带有规律底噪的静电声，似乎在循环播报一条加密短波。',
        'Communication room with radio equipment and screens showing static, one active encrypted terminal glowing, wall map with red X marks',
        {
            danger: danger.level(3),
            items: [
                I.data('last_transmission', '最后的绝密广播', '一段录制在防磁金属带上的通讯原盘。', {
                    grade: 'military',
                    threshold: 15,
                    audio: '这里是铁锈前哨……重复，防御协议已彻底失效。如果外界还有活人听到这条讯号，不要尝试搜救，立即引爆竖井炸药，将深层的东西和我们一起深埋。'
                }),
                I.material('signal_decoder', '便携信号解码器', '轻便的军用算法转译机，能够破解基础凯撒与置换密码。', {
                    grade: 'military',
                    size: [2, 1],
                    threshold: 20
                })
            ],
            interacts: [
                act(
                    '尝试接收全频段信号',
                    '你在嘈杂的白噪音中捕捉到一段清晰的人声：「退后……不要直视它的轨迹……你不是哨所编制人员……你为什么能活着走到这里……」声音在剧烈的电流刺鸣中戛然而止。',
                    { cost: 10, sound: 'ui_notification', san: -8 }
                ),
                act(
                    '破解通讯加密',
                    '密文成功解密为「FALLBACK」（全线撤退），终端随之吐出一张带有后勤高阶认证签名的通行凭证。理性与逻辑的胜利驱散了心中的一丝阴霾。',
                    {
                        cost: 15,
                        san: 10,
                        puzzle: P.type(
                            '军方密文拦截',
                            '拦截到一段由前线指挥部发出的紧急字符倒推加密电文：IDOOEDFN。需要解密还原原文指令。',
                            'FALLBACK',
                            {
                                hints: [
                                    '电文长度较短，采用典型的凯撒单表位移加密。',
                                    '旧世军用简易加密常将字母统一向前倒推 3 位。',
                                    '例如字母 I 还原为 F，D 还原为 A。'
                                ],
                                timeCost: 15,
                                maxAttempts: 3,
                                penalties: { sanity: -10 }
                            }
                        )
                    }
                )
            ]
        }
    ),

    node(
        'war_room',
        '作战室',
        '厚重的沙盘台占据了房间正中，代表旧世守军部队的塑料微缩旗帜倒伏大半。沙盘一角的地形被刻意挖空，露出由铅块雕凿出的前哨立体截面，底座旁刻着一行铅笔字：孤立无援。',
        'Large sand table tactical map with miniature flags and unit markers, most toppled, detailed bunker model with pencil inscription, drawer slightly open beneath',
        {
            danger: danger.level(2),
            interacts: [
                act(
                    '搜查沙盘暗屉',
                    '你拉出卡死的木质抽屉，在陈旧的作战地图下摸出一张红色边框的硬质磁卡，上面贴着发黄的绝密封条。',
                    {
                        cost: 10,
                        sound: 'search',
                        gain: [
                            I.material('deep_access_card', '深层安保磁卡', '带有深红警告涂装的高权限磁卡，芯片背面刻着「铁壁协议」四个小字。', {
                                grade: 'corporate'
                            })
                        ]
                    }
                )
            ]
        }
    ),

    node(
        'intel_room',
        '情报拦截室',
        '四壁贴满深灰色的多孔吸音泡棉。正中架设着一台仍在自行咬合的重型无线电侦听仪，不断吐出长长的热敏打印纸，纸上大半为杂乱的黑点，间歇夹杂着令人毛骨悚然的明文字句。',
        'Soundproofed room, massive signal interception apparatus, continuous thermal paper printout with mostly garbled text, some clear haunting phrases visible',
        {
            danger: danger.level(5),
            items: [
                I.data(
                    'encrypted_disk',
                    '加密情报光盘',
                    '带有铅硼防辐射外壳的数据介质，指示灯仍在规律闪烁。',
                    '最终分析备忘录：深渊侵蚀非自然灾害，而是一场有规划的星际播种。我们监听到的高维谐振即为唤醒信号。建议立即对所有降落点实施地毯式核清理。附注：提案已被防务巨头否决，理由是「种子已在第三收容区生根」。',
                    { grade: 'military', threshold: 20 }
                ),
                I.material('interception_core', '拦截装置核心', '信号拦截仪的核心振荡组件，拆除后能让这台永不停歇的机器彻底闭嘴。', {
                    grade: 'military',
                    size: [2, 1],
                    threshold: 18
                })
            ],
            interacts: [
                act(
                    '阅读最新打印内容',
                    '热敏纸边缘依然带着滚烫的油墨温度：「……方舟已进入封闭航程……地表祭坛活性达到 98%……收割程序就绪……下一个清除坐标：[本前哨精确网格]」。你的冷汗瞬间浸透了衣背。',
                    { cost: 5, sound: 'typing_1', san: -10 }
                ),
                act(
                    '利用解码器精细破译',
                    '解码器将乱码重构成作战时间轴。你确认了清理人先遣队的覆灭时间点与深层掩体的沦陷完全同步。底行赫然写着：清理人频道无应答，认知面甲全部烧蚀。',
                    { cost: 10, sound: 'typing_2', reqItems: ['signal_decoder'], san: -6 }
                )
            ]
        }
    ),

    node(
        'interrogation_room',
        '审讯室',
        '加装隔音铅板的狭窄死室。正中固定着一张焊接在地面的沉重铁椅，皮质束缚带已经硬化干裂。单向透视玻璃被从审讯室内侧以难以置信的蛮力击得粉碎，天花板上残留着大片星芒状的喷射血痕。',
        'Soundproofed interrogation room, metal chair bolted to the floor with hardened straps, shattered two-way mirror, arterial blood spatter on walls and ceiling, tape recorder slowly spinning',
        {
            danger: danger.level(6),
            items: [
                I.data(
                    'interrogation_transcript',
                    '审讯笔录残卷',
                    '沾染暗黑污血的审讯记录，字迹因剧烈手颤而扭曲。',
                    '审讯对象：114号外勤哨兵。提问：为什么拒绝向撤离卡车放行？回答：那不是卡车……里面坐着的不是人！他们的下颌骨在胸口呼吸！他们说话的声音是从胃部翻滚出来的！记录：对象已丧失逻辑，出现严重深渊共鸣，批准就地处决。',
                    { grade: 'military', threshold: 10 }
                )
            ],
            interacts: [
                act(
                    '倒放桌面录音机',
                    '磁带卷动发出生涩的摩擦声。耳机里传出的并非人类对话，而是一段层层叠叠、不断变调的多重嘶鸣，像是几十个人的声带在同时撕裂。你的前额叶剧烈刺痛，手忙脚乱地拔掉了插头。',
                    { cost: 10, sound: 'terrifying', san: -8 }
                )
            ]
        }
    ),

    node(
        'records_archive',
        '档案室',
        '数排高大的铁皮档案柜因地下潮气而严重胀死，泛黄的分类标签大多已霉变为灰绿色的斑块。这里的每一个档案盒都曾记录着一名前哨驻军的生平与履历，如今大多数名字被粗暴地用红笔划死。',
        'Military archive room, rusted filing cabinets, damp paper, faded labels, flickering bulb, scattered personnel files with redacted names',
        {
            danger: danger.level(3),
            items: [
                I.data(
                    'personnel_roster',
                    '残存人员名册',
                    '经过多次修正的人员编制单，许多行用钉书钉死死封牢。',
                    '驻军编制核减记录：不要撕开第7页之后的订书针。如果档案里的某个名字开始在耳边呼应你，立刻焚烧当前页码。后勤主管最后配给单存放在后勤办公室铁柜。',
                    { threshold: 10 }
                )
            ],
            interacts: [
                act(
                    '翻找封存档案箱',
                    '你撬开最底层卡住的铁抽屉，里面没有纸张，只是一长串用钢丝穿透的金属军牌。令人不寒而栗的是，每一枚军牌背部刻印的阵亡日期都赫然指向今天。',
                    { cost: 10, sound: 'search', san: -4 }
                )
            ]
        }
    ),

    node(
        'logistics_office',
        '后勤办公室',
        '这里曾是维系整座前哨生存运转的物资调度中枢。墙上的库存折线图记录着粮食、弹药与纯水的断崖式枯竭过程。一张沉重的铁质办公桌上散落着账册与卡死的机械计算器。',
        'Military logistics office, supply charts on wall, old calculator, stacked requisition forms, dusty desk lamp, cold bunker lighting',
        {
            danger: danger.level(2),
            items: [
                I.data(
                    'supply_requisition',
                    '最后配给凭证',
                    '盖有军需官与医官双重印鉴的调拨单，纸角已被磨圆。',
                    '项目明细：野战净水药片、加固滤芯、军用镇静针剂。最后批注：冷藏储藏室内尚有少量冻结军粮封存。若发现包装箱封条变为手写暗红字样，绝对禁止开箱食用。',
                    { threshold: 8 }
                )
            ],
            interacts: [
                act(
                    '核算最终库存表',
                    '你逐页清点残存数字。在最后一页所有物资列归零的下方，有人用红色水笔狠狠划破纸页留下八个大字：「活着就是亏空，别算」。',
                    { cost: 10, sound: 'search', san: -3 }
                )
            ]
        }
    ),

    // =========================================================================
    // 3. 生活区干道 (10 节点)
    // =========================================================================
    node(
        'living_quarters',
        '生活区干道',
        '昏暗压抑的长廊，空气中混杂着汗渍、霉变食物与刺鼻的次氯酸钠消毒水味。斑驳的墙壁上有人用白色粉笔画着一道漫长的时间线，末尾几天的划痕深深刻入了水泥墙体，最终化为一个巨大的惊叹号。',
        'Dimly lit passage, grimy floor tiles, flickering overhead neon bars, chalk timeline on wall ending in a giant exclamation mark',
        {
            danger: danger.level(1),
            children: [
                'barracks',
                'mess_hall',
                'quarantine_cell',
                'chapel_bunker',
                'officers_quarters',
                'water_purification',
                'decon_shower',
                'laundry_room',
                'cold_storage'
            ],
            interacts: [
                act(
                    '辨认粉笔时间刻痕',
                    '你顺着刻痕向前摸索，发现最后几天的计数是由重叠的人名笔划构成的。在最深处的一道划痕旁，刻着几个极小的字：「它们就在门后看着我们数」。',
                    { cost: 5, sound: 'search', san: -2 }
                )
            ],
            npc: npc(
                'npc_survivor_sasha',
                '通讯兵萨莎',
                '前哨站的前沿通讯兵。灾变爆发当夜，她正蜷缩在通风管道中抢修断裂的同轴电缆，耳机里完整收录了所有战友在不同防区的最后尖叫。自那以后，她再也不肯佩戴开启状态的对讲机，但她的听觉已进化到能够捕捉数面墙之外的肌肉蠕动。',
                'Young female survivor and former communications soldier, oversized military jacket, wary alert eyes, headphones resting around neck, dim living quarters lighting',
                {
                    gender: 'female',
                    style: 'skirmish',
                    trust: 25,
                    attrs: { strength: 8, agility: 20, wisdom: 16, awareness: 28, will: 10, cthulhu: 6 },
                    vitals: { maxHp: 90, maxSanity: 95, maxStamina: 100, maxVigor: 95 },
                    quests: [
                        quest(
                            'silent_frequency',
                            '情报拦截室里那台机器自发运转的噪波正日夜钻入萨莎的大脑。她恳求你潜入情报室拆下拦截装置的核心，还她哪怕一个小时的绝对清静。',
                            5,
                            [
                                I.material('interception_core', '拦截装置核心', '仍在自动发热振荡的情报设备核心部件。', {
                                    grade: 'military',
                                    size: [2, 1]
                                })
                            ],
                            [
                                I.accessory(
                                    'comm_earpiece',
                                    '战术通讯耳机',
                                    '萨莎亲手改装并校准阻抗的防噪耳机，能大幅滤除环境恶念。',
                                    [['awareness', 3], ['maxSanity', 5]],
                                    { grade: 'military' }
                                )
                            ]
                        )
                    ],
                    canBeInvited: { trust: 55, isSanctuarySafe: { food: 20 } },
                    willRoam: roam.route(40, ['barracks', 'mess_hall', 'officers_quarters'])
                }
            )
        }
    ),

    node(
        'barracks',
        '士兵营房',
        '双层角铁床铺沿墙排开，很多铺位上的被褥依然保持着紧急起床时的掀开状态。储物铁柜大多被强行撬开，角落里有一面挂满士兵合影的告示板——多数面孔已被黑记号笔抹去，唯独最右下角的一张新兵脸颊依然清晰。',
        'Rows of bunk beds with messy sheets, walls plastered with photos and open empty lockers, group photos with increasingly more faces blacked out, small first aid station',
        {
            danger: danger.level(2),
            items: [
                I.weapon(
                    'combat_knife',
                    '制式战斗匕首',
                    '锋刃经过哑光发黑处理的军用格斗刺刀，握把缠有粗糙的防滑帆布绳。',
                    'prick',
                    1,
                    12,
                    [0.25, 6],
                    20,
                    { grade: 'military', size: [1, 1], threshold: 10 }
                ),
                I.data(
                    'soldier_letter',
                    '未寄出的家书',
                    '折叠整齐但沾有泥土的信纸，笔迹在末尾几行近乎穿透纸背。',
                    '亲爱的阿梅：这里的情况远比演习报告危险。昨夜巡逻时，老张听到外围树林里有人用我妈妈的声音喊我。我端着枪没出去，但老张翻过了铁丝网。如果这封信最后落到你手里，答应我，离任何防空设施远一点。',
                    { threshold: 5 }
                ),
                I.accessory('soldier_helmet', '旧制式芳纶头盔', '悬挂系统经过多次加固的防片头盔，内部衬垫写满阵亡老兵的呼号。', [['maxHp', 10]], {
                    size: [2, 2],
                    threshold: 10
                })
            ],
            interacts: [
                act(
                    '搜寻床铺与柜底',
                    '你在松动的床板夹层里翻出了半包用油纸严密包裹的压缩干粮，塑料膜上用圆珠笔写着「撑到换防」。',
                    {
                        cost: 15,
                        sound: 'item_pickup',
                        gain: [
                            I.consumable('hidden_ration', '私藏军用口粮', '被细心防潮封存的高热量压缩饼干与肉脯。', [
                                ['hp', 15],
                                ['stamina', 20]
                            ])
                        ]
                    }
                )
            ]
        }
    ),

    node(
        'mess_hall',
        '战术食堂',
        '翻倒的长条铁桌被堆叠成抵御内部冲击的掩体。打饭铁窗口已被生锈的钢板焊死。地板上凝固着大片深褐色的干涸污迹——仰头望去，正上方的混凝土吊顶上赫然有一处规则的强酸蚀穿孔洞，露出断裂的钢筋。',
        'Overturned metal tables forming barricades, welded-shut serving window, huge dried blood stains on floor, circular corrosion mark on ceiling directly above',
        {
            danger: danger.level(3),
            facility: {
                id: 'facility_bunker_mess',
                name: '战术食堂配给口',
                desc: '战术食堂的军用热食分发窗，利用地热与电热板烹饪脱水军粮与烂炖罐头，是地下掩体内仅存的凡俗烟火气。',
                function: { food: 6, water: -2 }
            },
            items: [
                I.consumable('emergency_ration', '应急军用罐头', '密封良好的马口铁军用红烧肉罐头，保质期虽然过期但内部依然真空完好。', [
                    ['hp', 15],
                    ['stamina', 15]
                ], { threshold: 5 })
            ],
            interacts: [
                act(
                    '翻检配膳台密封桶',
                    '你在翻倒的配给保温桶中找到了残存的未开封口粮。桶身内壁用刺刀刻着一行遗言：「如果我明天开始像隔壁床那样用喉咙哼歌，别犹豫，对着我的额头扣扳机」。',
                    {
                        cost: 10,
                        sound: 'search',
                        gain: [
                            I.consumable('emergency_ration', '应急军用罐头', '保温桶底被小心保存的罐头。', [
                                ['hp', 15],
                                ['stamina', 15]
                            ])
                        ]
                    }
                )
            ]
        }
    ),

    node(
        'quarantine_cell',
        '重症隔离区',
        '位于营房最深处的加厚有机玻璃隔离间。玻璃内壁布满了令人心悸的疯狂抓痕与断裂的指甲碎片。对讲扬声器仍通着微弱电流，断断续续喷出混浊的喘息音，仔细辨认，那呼唤声竟然在模仿着某位熟识同伴的语调。',
        'Transparent isolation cell with reinforced glass, glass cracked, scratches and bloody handprints on interior walls, intercom light occasionally blinking',
        {
            danger: danger.level(6),
            items: [
                I.consumable('painkillers', '强效止痛药', '军用麻醉性镇痛胶囊，能麻痹剧烈伤痛并稳定体征。', [['hp', 15]], { threshold: 15 })
            ],
            interacts: [
                act(
                    '查阅床头病历挂牌',
                    '体温记录显示患者在脑电波平直后，体内脏器温度仍在持续升高至摄氏45度。末行批注用发颤的字体写着：「他在里面隔着玻璃叫我的小名，但我三天前亲手核验了他的死亡报告」。',
                    { cost: 5, sound: 'typing_1', san: -5 }
                ),
                act(
                    '强行搜查受损药柜',
                    '你刚用撬棍别开变形的铁柜，隔离舱的泄压阀突然失控爆开，浓烈的腐氨恶臭喷涌而出，一具被结缔组织完全包裹的非人躯体向你扑来！',
                    {
                        cost: 15,
                        sound: 'search',
                        spawnEnemy: [
                            enemy.cthulhu(
                                'quarantine_subject',
                                '隔离对象-114',
                                '曾经的前线哨兵，如今病号服与外翻的皮下结缔组织融为一体。胸腔内寄生着脉动的星神质囊泡，虽双眼被分泌物封闭，却能对活人的呼吸产生狂暴的扑杀冲动。',
                                'Humanoid patient in torn isolation gown, translucent fused skin membrane, chest cavity pulsing irregularly, sealed eyelids, dim isolation cell lighting',
                                [22, 22, 14, 16, 2],
                                {
                                    intents: { attack: 56, defense: 12, buff: 6, debuff: 18, observe: 8 },
                                    loot: [
                                        loot(
                                            I.material('contaminated_sample', '轻度污染样本', '装在破裂离心管内的深渊活性生物组织。', {
                                                grade: 'prototype'
                                            }),
                                            0.8
                                        ),
                                        loot(I.consumable('painkillers', '强效止痛药', '军用麻醉性镇痛胶囊。', [['hp', 15]]), 0.35)
                                    ]
                                }
                            )
                        ]
                    }
                )
            ]
        }
    ),

    node(
        'chapel_bunker',
        '军用礼拜室',
        '由备用储藏室改建的简陋战地祷告所。粗糙的松木十字架下堆满了死者留下的军牌、泛黄的婴儿照片与手编毛线符。墙壁上用白漆刷着醒目的字标：「上帝不在这里，但我们仍在此处」。然而白漆底层，某种古老暗红的几何图形正在缓缓渗出。',
        'Makeshift chapel in a storage room, folding chairs, wooden cross, offerings of dog tags and photos, faded white paint slogan over older red stains, dim solemn lighting',
        {
            items: [
                I.accessory('pilgrim_token', '朝圣者护符', '用击发过的重机枪弹壳与军礼服金线缠绕制成的简易吊坠，握在掌心有一股微弱的温热感。', [['maxSanity', 10]], {
                    threshold: 10
                })
            ],
            interacts: [
                act(
                    '在木十字架前默祷',
                    '你坐在冰冷的铁折叠椅上，在幽暗的菌毯微光中闭目凝神。周围狂乱的深渊低语退潮般化为白噪音，你听到了自己平稳的心跳，颤抖的双手重新恢复了稳定。',
                    { cost: 30, san: 15 }
                )
            ],
            npc: npc(
                'npc_father_thomas',
                '托马斯神父',
                '原基地的随军天主教神甫。大灾变降临后，他的下半身已与墙体上滋生的淡金色发光菌毯不可逆地融为一体。尽管神经系统承受着高维常数的重构，他的双眸却异乎寻常地沉静清澈，用微弱的嗓音为所有迷茫的生还者诵念悼词。',
                'An elderly priest half fused with glowing wall fungus, wearing a tattered priest collar, remarkably clear calm eyes, dim chapel lighting, religious atmosphere',
                {
                    gender: 'male',
                    style: 'defense',
                    trust: 40,
                    attrs: { strength: 4, agility: 4, wisdom: 32, awareness: 22, will: 45, cthulhu: 35 },
                    vitals: { maxHp: 80, maxSanity: 240, maxStamina: 60, maxVigor: 70 },
                    quests: [
                        quest(
                            'echo_of_faith',
                            '托马斯神父希望你能从零号收容区带回军方最初接触异变源头的「最初接触记录」。他渴望证实，这场降临究竟源自人类傲慢的自毁，还是深空彼岸神性对凡尘苦难的真正回应。',
                            9,
                            [
                                I.data('first_contact_record', '最初接触记录', '封存在钛合金防爆盒内的黑色记录仪核心，表面有被等离子射线灼烧融化的痕迹。', {
                                    grade: 'corporate'
                                })
                            ],
                            [
                                I.consumable('blessed_water', '祝圣纯水', '经过神甫祈祷与菌丝微滤的纯净水，能抚慰遭受剧烈震荡的神经。', [
                                    ['sanity', 25],
                                    ['hp', 10]
                                ], { grade: 'military' }),
                                I.accessory('martyr_stole', '殉道者圣带', '带有微弱生物荧光的祭披织物，持有时能显著构筑精神锚点。', [
                                    ['will', 4],
                                    ['maxSanity', 20]
                                ], { grade: 'corporate', size: [2, 1] })
                            ]
                        )
                    ]
                }
            )
        }
    ),

    node(
        'officers_quarters',
        '军官寝室',
        '比起士兵营房，这里的单人铁床与橡木办公桌显得齐整得多。空气中有一股强烈的双氧水气味，显示出有人曾试图消灭某种看不见的污染。便携式黑胶唱机上的唱针早已在空槽中划磨出尖锐刺耳的白噪音。',
        'Officer room, single bed, desk with journal, portable record player still spinning silently, chemical clean smell, sterile compared to the rest of the bunker',
        {
            danger: danger.level(3),
            items: [
                I.data(
                    'officer_diary',
                    '少校指挥日记',
                    '一本磨损严重的牛皮封面日记本，记录了封锁命令背后的阴谋。',
                    '深层掩体的隔离锁死根本不是为了防范生化泄漏——基金会的特派员早就知道会发生什么。他们要的不是防务武器，他们试图借由实验体的肉身让高维存在在三维现实中发出第一个音节。作战室沙盘下有备用钥匙，如果读到这行字的人还没疯，不要相信任何穿着基金会制服的人。',
                    { grade: 'military', threshold: 10 }
                ),
                I.consumable('record_player_battery', '小型储能电池', '军官私藏的便携电池模块，状态良好。', [['battery', 40]], {
                    threshold: 15
                })
            ],
            interacts: [
                act(
                    '重置唱机音轨',
                    '唱针落入唱片内圈，扬声器里传出的却是一个疲惫男人的军务口令录音：「……如果有人打开了门，切断氧气……他们已经不是在微笑了，他们的面部神经是由菌丝在牵引……」。录音在一声枪响中归于寂静。',
                    { cost: 5, sound: 'error', san: -5 }
                )
            ]
        }
    ),

    node(
        'water_purification',
        '公共净水室',
        '两座三层楼高的圆柱形加压净水塔巍然耸立，工业滤泵正发出沉重低沉的轰鸣。其中一座主水箱的钢化玻璃观察视窗已被内部滋生的黑色黏网彻底糊死，隐约能看到某个庞大的暗色轮廓在水下缓慢翻滚舒展。',
        'Large industrial water purification room, massive metal tanks, pumping machinery, one tank window obscured by dark web-like biofilm from the inside, a vague giant silhouette swimming within',
        {
            danger: danger.level(4),
            facility: {
                id: 'facility_bunker_purifier',
                name: '公共净水循环塔',
                desc: '工程舱净水装置残骸被重新焊接疏通，勉强维持前哨饮用水循环。水质浑浊但已脱毒，每一滴都带着浓烈的铁锈与漂白剂气味。',
                function: { water: 8, electricity: -2 }
            },
            items: [
                I.consumable('clean_water_flask', '军用密封水壶', '装满多重超滤后纯净水的不锈钢军用水壶，能有效驱散焦渴与疲惫。', [
                    ['sanity', 10],
                    ['hp', 5]
                ], { threshold: 12 })
            ],
            interacts: [
                act(
                    '擦拭水箱观察窗',
                    '你用布条擦拭外壁的水汽。刹那间，水箱深处翻腾起剧烈的气泡，一张由数百条苍白人类断臂虬结而成的巨大肉质水母猛地拍打在玻璃内壁上！厚达五公分的钢化玻璃发出令人牙酸的龟裂声。',
                    { cost: 10, sound: 'terrifying', san: -12 }
                )
            ]
        }
    ),

    node(
        'decon_shower',
        '洗消淋浴间',
        '苍白的瓷砖墙面凝结着泛黄的水垢，数排工业洗消喷头像失明眼球般悬挂在头顶。地面残留着白色洗消粉末，地漏滤网周围丛生着一圈带电弧般微光的黑色绒毛，散发着刺鼻的次氯酸与臭氧气味。',
        'Military decontamination shower room, stained tiles, rusted shower heads, white decon powder on floor, dark organic fibers near drain, cold bunker lighting',
        {
            danger: danger.level(3),
            items: [
                I.consumable('decon_solution', '高效洗消液', '配发给重装防化防务部队的广谱去污浓缩剂。', [
                    ['sanity', 8],
                    ['hp', 5]
                ], { threshold: 8 })
            ],
            interacts: [
                act(
                    '扳动应急喷淋阀',
                    '锈蚀的水阀在一阵沉闷咳嗽后喷出一股混杂着铁锈的冰冷强压水流。强烈的冲洗刺激让你痛彻骨髓，但也彻底洗净了皮肤表层粘连的致幻孢子。',
                    { cost: 10, sound: 'item_use', hp: 3, san: 6 }
                )
            ]
        }
    ),

    node(
        'laundry_room',
        '洗衣房',
        '几台庞大的工业滚筒洗衣机被沉重的螺栓死死焊在地板上。半开的洗涤舱门内塞满发黑的作训服，晾衣铁丝上悬挂的布质姓名条已被黑色菌丝侵蚀重织成了难以名状的诡异图腾。',
        'Underground bunker laundry room, industrial washing machines, moldy uniforms, hanging name tags, fungal threads weaving through fabric, dim utility lighting',
        {
            danger: danger.level(2),
            items: [
                I.material('cloth_bandage', '整洁的备用绷带布', '从干燥密封袋中拆出的医用脱脂棉布条，可用于简易止血包扎。', {
                    grade: 'salvaged',
                    threshold: 6,
                    qty: 3
                })
            ],
            interacts: [
                act(
                    '翻找未污染衣物',
                    '你从密封滚筒中扯出几套干燥的作训服。当你的手指划过衣料时，织物似乎在你的掌温下产生了一阵极其微弱的舒展反冲。',
                    {
                        cost: 10,
                        sound: 'search',
                        gain: [
                            I.material('cloth_bandage', '整洁的备用绷带布', '从干燥密封袋中拆出的医用脱脂棉布条。', {
                                grade: 'salvaged'
                            })
                        ]
                    }
                )
            ]
        }
    ),

    node(
        'cold_storage',
        '冷藏储藏室',
        '厚重的冷库门锁已结满白霜。这里的冷气沉降如浓雾，悬挂在半空的重型不锈钢肉钩在毫无气流的环境下无声地轻轻摆动。尽管温度计读数直逼零下二十度，金属货架表层却凝结着诡异的温热蒸汽。',
        'Cold storage room in military bunker, frosted metal shelves, hanging supply bags, meat hooks swaying slightly, warm mist on cold surfaces, eerie industrial lighting',
        {
            danger: danger.level(4),
            items: [
                I.consumable('frozen_ration', '速冻军粮块', '在极低温下妥善封存的高能量冷冻战备军粮，解冻后可安全食用。', [['hp', 12]], {
                    threshold: 8
                })
            ],
            interacts: [
                act(
                    '检查速冻食品包装箱',
                    '你拽下一个结霜的铝箔储藏袋。撕开胶带的瞬间，冷冻袋内部突然顶出数枚清晰微小的婴儿掌印，随后在你的注视下如冰雪消融般平息。你迅速将几块军粮塞入口袋。',
                    {
                        cost: 10,
                        sound: 'search',
                        san: -4,
                        gain: [I.consumable('frozen_ration', '速冻军粮块', '妥善封存的高能量冷冻战备军粮。', [['hp', 12]])]
                    }
                )
            ]
        }
    ),

    // =========================================================================
    // 4. 重装备工程走廊 (8 节点)
    // =========================================================================
    node(
        'engineering_bay',
        '重装备工程走廊',
        '贯穿前哨基底的重工业主轴，两侧裸露的蒸汽管线不时发出凄厉的泄压啸叫。地面积满油污与冷却液。走廊尽头矗立着一扇涂有辐射警示菱形徽记的加厚合金重型安保门——通往深层掩体。门禁面板上的读卡器正闪烁着冷酷的蓝光。',
        'Rough industrial tunnel, thick pipes lining the walls spewing occasional bursts of steam, oily puddles on the ground, heavy security door at end with card reader',
        {
            danger: danger.level(5),
            children: [
                'power_station',
                'armory_room',
                'ventilation_control',
                'waste_disposal',
                'maintenance_bay',
                'coolant_control',
                'pump_room'
            ],
            items: [
                I.consumable(
                    'field_repair_kit',
                    '神经链接维修套件',
                    '配发给技术工兵的高阻微焊套件，内含导电生物硅胶与微电极晶片，可修复受损的神经链接仪。',
                    [['integrity', 25]],
                    { grade: 'military', size: [2, 1], threshold: 18 }
                )
            ],
            interacts: [
                act(
                    '解锁深层掩体安保门',
                    '红色磁卡刷过读卡器。机械锁芯在一连串沉重的爆裂声中逐级退开，气密密封圈喷出一股带着刺鼻福尔马林与臭氧气味的极冷寒流。通往深渊隔离层的幽暗阶梯在你面前徐徐展开。',
                    {
                        cost: 5,
                        sound: 'unlock',
                        reqItems: ['deep_access_card'],
                        unlock: [['deep_bunker', '进入深层掩体']]
                    }
                )
            ]
        }
    ),

    node(
        'power_station',
        '聚变动力源',
        '前哨的心脏枢纽。微型聚变稳压堆被粗暴地焊在六冲程巨型柴油燃烧机组上方，仪表盘的转速指针深陷红线警戒区。热浪裹挟着机油与生物体焦糊味扑面而来，沉重的震动让整个房间的铁架台都在嗡嗡作响。',
        'Massive industrial generator dominating the room, analog gauges vibrating in red zones, stacked fuel drums, organic feed intake, heat haze effect, prematurely aged machinery',
        {
            danger: danger.level(6),
            facility: {
                id: 'facility_bunker_bio_generator',
                name: '柴油-生物混合发电机',
                desc: '以微型聚变核心作为稳压中枢，外接巨型船用燃烧室的改装动力源。它吞噬柴油、有机废弃物乃至深渊残渣，换取前哨宝贵的电能。',
                function: { electricity: 14, erosion: 2 }
            },
            items: [
                I.consumable('power_cell', '军用电池', '高容量密封电容组，能迅速恢复外设电力。', [['battery', 80]], {
                    grade: 'military',
                    threshold: 20
                }),
                I.material('fuel_reserve', '重柴油储备桶', '密封完好的军用重油桶，是驱动前哨重型发电机的基石材料。', {
                    size: [2, 2],
                    threshold: 10,
                    qty: 2
                })
            ],
            interacts: [
                act(
                    '巡检发电机状态',
                    '仪表指示发电机处在过载与临界的脆弱平衡点。维修手记的末尾写着红字警告：如果聚变稳压器停转，深层掩体的电磁收容场将在三秒内坍塌，届时深处的东西将畅通无阻。',
                    { cost: 5, sound: 'search' }
                ),
                act(
                    '接驳应急冷却线路',
                    '随着接线扣紧，冷却液泵发出深沉有力的轰鸣，温度指针迅速从暴躁的红线回落至安全区间。白色的高压照明重新洒满车间，你的手腕虽然被电火花灼出红印，但成功挽救了动力网。',
                    {
                        cost: 20,
                        hp: 10,
                        san: 5,
                        puzzle: P.choice(
                            '冷却重置',
                            '动力机组的高压冷却线路短路熔断，必须重新将三相插座与主控回路正确并联。线缆：红线、绿线、蓝线；接口：HV（高压火线）、GND（安全接地）、COOL（温控逻辑）。请按顺序选出正确的接驳标准：',
                            ['1-红 2-蓝 3-绿', '1-红 2-绿 3-蓝', '1-绿 2-蓝 3-红', '1-蓝 2-绿 3-红'],
                            '1-红 2-绿 3-蓝',
                            {
                                hints: [
                                    '工业电气通用标准：红线始终承担主要高压荷载 (HV)。',
                                    '安全接地线 (GND) 在旧世国家电气标准中恒定使用绿色标识。',
                                    '剩下的蓝色线缆即为温控回路信号线。'
                                ],
                                timeCost: 20,
                                maxAttempts: 2,
                                penalties: { hp: -15 }
                            }
                        )
                    }
                )
            ]
        }
    ),

    node(
        'armory_room',
        '核心军械库',
        '厚重的防爆钢门被气割炸开。虽然大批单兵武器已被撤离部队搬空，但深处的特种武器柜中依然陈列着加固军械。角落里堆放着一批漆有黄色「铁壁专用」封条的子弹箱，弹头透出半透明凝胶状的微光。',
        'Military armory with metal weapon racks and stacked ammo boxes, blasted open safe, dried blood on the floor, suspicious gel-tipped ammunition marked Project Iron Wall',
        {
            danger: danger.level(6),
            map: 'bunker_armory',
            items: [
                I.armor(
                    'tactical_vest',
                    '四级战术防弹背心',
                    '内置碳化硼陶瓷插板的重型战术防弹衣，能抵御大口径穿甲弹的动能冲击。',
                    0.25,
                    25,
                    { grade: 'military', size: [3, 3], threshold: 15 }
                ),
                I.weapon(
                    'frag_grenade',
                    'M67 破片手雷',
                    '军用高爆手雷，拉开保险销投掷后引发范围破片打击。单次投掷消耗品。',
                    'throw',
                    3,
                    38,
                    [0.1, 12],
                    1,
                    { damageType: 'range', grade: 'military', size: [1, 1], threshold: 20 }
                ),
                I.accessory('bio_mask', '防化过滤面罩', '配发给防化部队的全封闭防毒面具，内置多层活性炭与树脂滤芯。', [['maxSanity', 20]], {
                    grade: 'military',
                    size: [2, 1],
                    threshold: 15
                }),
                I.accessory(
                    'ballistic_helmet',
                    '弹道防护头盔',
                    '配有夜视仪基座与抗破片悬挂的重型防暴头盔。',
                    [['maxHp', 15], ['awareness', 2]],
                    { grade: 'military', size: [2, 2], threshold: 18 }
                )
            ],
            interacts: [
                act(
                    '检查铁壁凝胶弹药',
                    '你拿起一枚凝胶弹头。弹体在接触你皮肤温度的瞬间微微变软，你甚至隔着铜壳感受到了类似心房搏动的微弱脉跳。说明书残页注明：凝胶将在射入生物体内 72 小时内完成神经同化，严禁徒手接触。',
                    { cost: 5, sound: 'terrifying', san: -8 }
                )
            ]
        }
    ),

    node(
        'ventilation_control',
        '通风管控枢纽',
        '前哨庞大的呼吸器官。几具四层楼高的巨大轴流风扇在此交汇，扇叶切裂空气的钝响震耳欲聋。中央控制台被厚厚的黑色粉尘覆盖，空气中弥漫着高浓度铁锈与酸腐臭气。',
        'Massive ventilation hub with giant rusty fan blades, dust-covered control panel, gloomy lighting, airborne particulate matter visible in the light beams',
        {
            danger: danger.level(5),
            interacts: [
                act(
                    '校准主循环风机序列',
                    '指令键入完毕，沉重的电磁继电器接连扣合，巨大的轴流风扇发出一声凄厉的金属啸叫后平稳加速。新鲜干燥的冷空气贯穿管道，将积蓄的毒雾一扫而空。',
                    {
                        cost: 15,
                        hp: 10,
                        puzzle: P.cloze(
                            '主循环风机重启',
                            '风机电控板遭遇高压脉冲损坏，部分启停控制时钟数据丢失。必须根据残余的差值递增规律补全数组空缺以激活气流重载程序：[1], [2], [?], [7], [11]',
                            [['1', '2', '', '7', '11']],
                            ['4'],
                            {
                                hints: [
                                    '分析相邻项之间的增量差值。',
                                    '1 到 2 差值为 1；从未知项到 7，以及 7 到 11 的差值按自然数阶梯扩大。',
                                    '若差值序列为公差为 1 的递增数列（+1, +2, +3, +4），则第二项加上 2 即为缺失值。'
                                ],
                                timeCost: 15,
                                maxAttempts: 3,
                                penalties: { sanity: -5, hp: -5 }
                            }
                        )
                    }
                )
            ]
        }
    ),

    node(
        'waste_disposal',
        '废料处理池',
        '一个深不见底的垂直圆柱形防腐深坑。池底蓄满了咕嘟翻滚的荧光绿色化学洗消废液，刺鼻的硝酸蒸汽熏得人眼眶生疼。几具身披重装防化服的遗体半沉在液体中，防毒面罩内部早已被发黑的黏液浸满。',
        'Cylindrical hazard waste pit, glowing neon green chemical sludge at the bottom, tattered yellow and black hazard tape, hazmat suit corpses floating in the toxic stew',
        {
            danger: danger.level(7),
            facility: {
                id: 'facility_bunker_reclaimer',
                name: '重型废料回收棚',
                desc: '搭建在工程走廊与废料池之间的水压冲切机，把重型装甲残片与武器废料冲压成标准化加固板。',
                function: { scraps: 8, electricity: -2, erosion: 1 }
            },
            interacts: [
                act(
                    '打捞废液中的遗体装备',
                    '你忍住腐烂恶臭，用铁钩将漂浮的尸首拖近。防化服在接触空气的瞬间因腔压膨胀爆裂，带有强烈腐蚀性的毒液溅射开来，但你成功剥离了死者胸前的特种装甲板。紧接着，整池废液如沸腾般剧烈涌动！',
                    {
                        cost: 15,
                        sound: 'item_pickup',
                        hp: -10,
                        gain: [
                            I.material('high_tier_scrap', '特种合金装甲废料', '深渊基金会防务装甲采用的特种耐酸合金，锻造高阶装备的无上材料。', {
                                grade: 'corporate',
                                size: [2, 1]
                            })
                        ],
                        spawnEnemy: [
                            enemy.cthulhu(
                                'sludge_amalgam',
                                '废液聚合体',
                                '在强酸与星神质共同浸泡下催生的高抗性有机肉块。防化服的橡胶碎片与多具残肢绞成一体，挥舞着被骨化的附肢发出下水道回涌般的低吼。',
                                'Amalgam of hazmat suit fragments and human limbs bound by glowing green sludge, rising from waste pit, acidic steam',
                                [12, 18, 26, 6, 2],
                                {
                                    intents: { attack: 50, defense: 24, buff: 6, debuff: 12, observe: 8 },
                                    loot: [
                                        loot(
                                            I.material('corrosive_gland', '腐蚀性强酸腺体', '深渊聚合体体内生成的耐酸腺泡，可提炼极度致命的炼金试剂。', {
                                                grade: 'military'
                                            }),
                                            0.9
                                        ),
                                        loot(
                                            I.material('fuel_reserve', '重柴油储备桶', '密封完好的军用重油桶。', {
                                                size: [2, 2]
                                            }),
                                            0.4
                                        )
                                    ]
                                }
                            )
                        ]
                    }
                )
            ]
        }
    ),

    node(
        'maintenance_bay',
        '维修湾',
        '散落着车床、气焊炬与重型液压臂的工兵车间。地面油污中混杂着细碎的金属铜屑。一张铁工作台上用重型台虎钳夹着一只剥离了外壳的机械义手，手指伺服电机仍在以极缓慢且精准的节奏敲击着桌面。',
        'Military maintenance bay, disassembled machinery, hydraulic arms, burnt circuit boards, mechanical hand fixed to workbench, sparks and dim industrial lighting',
        {
            danger: danger.level(5),
            items: [
                I.material('repair_parts', '工兵标准备件包', '一组经过防锈浸油处理的军用高强度螺栓、密封垫圈与精密轴承。', {
                    grade: 'reinforced',
                    size: [2, 1],
                    threshold: 12,
                    qty: 2
                }),
                I.consumable('maintenance_capacitor', '工程维修电容', '为工程外骨骼备用的高抗阻电容器，可稳压修补神经链接仪。', [['integrity', 15]], {
                    grade: 'military',
                    threshold: 16
                })
            ],
            interacts: [
                act(
                    '修复液压维修架',
                    '你清理了轴承卡死的铜屑，更换密封圈并合上气动阀门。液压架发出一声平顺的吐息重归原位。旁边夹持的机械义手随之停止敲击，五指齐平向你致以军礼。',
                    {
                        cost: 15,
                        hp: -5,
                        gain: [
                            I.material('repair_parts', '工兵标准备件包', '一组经过防锈处理的军用高强度螺栓与精密轴承。', {
                                grade: 'reinforced',
                                size: [2, 1]
                            })
                        ]
                    }
                )
            ]
        }
    ),

    node(
        'coolant_control',
        '冷却剂控制室',
        '密布着抗震压力表与铜质手动截止阀的窄室，荧光绿色的冷却液在粗壮的高压玻璃管道中缓缓搏动。某些阀门手轮上缠绕着手写白布条，字迹凌乱地写着「切勿反转」，但布条下方的铁管上却有人用指甲划下了反向箭头。',
        'Coolant control room, pressure gauges, manual valves, green coolant flowing through glass pipes, warning cloth strips, scratched contradictory orders under valves',
        {
            danger: danger.level(6),
            items: [
                I.material('coolant_canister', '重型冷却剂密封罐', '盛装低温氟化物冷却剂的高压合金罐，触手冰冷刺骨。', {
                    grade: 'military',
                    threshold: 15,
                    qty: 2
                })
            ],
            interacts: [
                act(
                    '平衡三级回流压力',
                    '阀门伴随蒸汽鸣响依次锁定，玻璃管内的激流渐渐平缓下来，压力表指针稳稳落回绿色中段。地下掩体那令人窒息的过载感稍稍减退。',
                    {
                        cost: 15,
                        san: 6,
                        puzzle: P.choice(
                            '冷却剂压力平衡',
                            '管道回路背压失衡，若直接硬开主阀将导致管壁在高压差下瞬间碎裂。必须根据热力安全规程执行启闭程序。',
                            ['先开主阀，再开回流阀，最后开支路阀', '先开回流阀，再开主阀，最后开支路阀', '先开支路阀，再开主阀，最后开回流阀'],
                            '先开回流阀，再开主阀，最后开支路阀',
                            {
                                hints: [
                                    '主阀承受着聚变源头的全部动压，盲目硬开会导致水锤效应。',
                                    '回流阀能够先行泄放管道中积存的高温残余气泡。',
                                    '支路阀门通常在整体流场平衡后作为末端流量分配。'
                                ],
                                timeCost: 15,
                                maxAttempts: 3,
                                penalties: { hp: -10 }
                            }
                        )
                    }
                )
            ]
        }
    ),

    node(
        'pump_room',
        '辅助泵房',
        '比起地表的净水塔，这里宛如掩体深埋地下的黑色内脏。四台重型铸铁污水分离泵半浸在冰凉的积水中，每一次冲程都在脚下的金属网格格栅上引发令人发慌的共振。积水表面浮动着一层层类似生物肺泡的细密泡沫。',
        'Auxiliary pump room, flooded floor, industrial pumps, vibrating metal grating, bubble clusters resembling alveoli on water surface, dark industrial horror',
        {
            danger: danger.level(6),
            items: [
                I.material('pressure_gauge', '工业耐震压力表', '从老式泵体上卸下的高灵敏度压力表，内部指针偶尔会自行微颤。', {
                    threshold: 10
                })
            ],
            interacts: [
                act(
                    '手动复位主抽水泵',
                    '你涉入刺骨的水洼，用撬棍别开锈死的排污棘轮。随着沉重的咯噔声，地面积水迅速旋转退去。你在泵体缝隙深处捞出一只被防水油纸层层包裹的急救水袋。',
                    {
                        cost: 15,
                        sound: 'unlock',
                        hp: -5,
                        gain: [
                            I.consumable('purified_water_pouch', '军用密封净水袋', '在恶劣环境下保持绝对纯净的饮用储备水。', [
                                ['sanity', 8],
                                ['hp', 4]
                            ])
                        ]
                    }
                )
            ]
        }
    ),

    // =========================================================================
    // 5. 深层掩体走廊 (10 节点，高危物理锁定区)
    // =========================================================================
    node(
        'deep_bunker',
        '深层掩体走廊',
        '长长的下行混凝土梯道尽头，温度骤降至冰点，口鼻呼出的水汽在空中凝成白雾。整条走廊全部采用紫外线灯管照明，所有物体表面都泛出幽冷的荧光紫。走廊中段，一具身着全封闭认知过滤装甲的尸骸倚靠在断壁前——那是基金会的清理人先遣特工。他的神经链接仪早已发生过载熔毁，面甲内侧的视网膜滤网上析出了一层细密的黑色高维晶体。',
        'Deep underground corridor, UV lighting casting everything in eerie fluorescent glow, biohazard markings visible under UV, cold breath visible, descending staircase, dead cleaner soldier in sealed cognitive-filter visor leaning against wall',
        {
            danger: danger.level(9),
            children: [
                'bio_lab',
                'cryo_chamber',
                'server_room',
                'escape_tunnel',
                'training_room',
                'incinerator',
                'patient_zero_containment',
                'observation_gallery',
                'disposal_chute'
            ],
            items: [
                I.material(
                    'cleaner_neural_link',
                    '清理人神经链接仪残件',
                    '从阵亡清理人颅骨上撬下的试作型神经链接仪核心。电极虽然大半烧焦，但认知过滤芯片仍保留了部分解构算法——这是经历「第二次看见」后留存的冷酷物证。',
                    { grade: 'foundation', threshold: 15, cognitiveErosion: 35 }
                )
            ],
            interacts: [
                act(
                    '查阅紫外灯下的隐形标记',
                    '在紫光照射下，那些看似普通的水渍显露出狰狞的真相：整面墙壁密密麻麻写满了同一句话——「容器是空的，它正在我们的大脑皮层里舒张」。头顶天花板的管道缝隙内瞬间传来密集的骨节摩擦爬行声！',
                    {
                        cost: 5,
                        sound: 'terrifying',
                        san: -6,
                        spawnEnemy: [
                            enemy.cthulhu(
                                'uv_crawler',
                                '紫外爬行者',
                                '攀附于深层走廊顶部的高速异化体。其角质皮肤在紫外线照射下泛出荧光蓝斑，外翻的脊椎如蜈蚣步足般紧扣管线，能敏锐捕捉空气微弱的气流扰动。',
                                'Pale humanoid crawler clinging to ceiling under UV light, fluorescent blue veins, external spine feelers, twitching limbs, deep bunker corridor',
                                [32, 24, 10, 26, 1],
                                {
                                    intents: { attack: 62, defense: 8, buff: 6, debuff: 14, observe: 10 },
                                    loot: [
                                        loot(
                                            I.material('contaminated_sample', '轻度污染样本', '深渊活性生物组织。', {
                                                grade: 'prototype'
                                            }),
                                            0.5
                                        )
                                    ]
                                }
                            )
                        ]
                    }
                ),
                act(
                    '检索清理人装备包',
                    '你忍住寒意扳开清理人的胸甲。面甲内侧刻有一行微小的绝笔：「不要试图看清滤网后的几何真相」。你在其战术腰包中找到了一支完好无损的广谱抗侵蚀注射剂。',
                    {
                        cost: 10,
                        sound: 'search',
                        san: -4,
                        gain: [
                            I.consumable('anti_erosion_injector', '广谱抗侵蚀注射剂', '深渊基金会配发给清理人特遣队的试作型阻断剂，能在短时间内极强地重塑理性防线。', [
                                ['sanity', 35],
                                ['hp', 15]
                            ], { grade: 'foundation' })
                        ]
                    }
                )
            ],
            exits: [E.to('engineering_bay', '返回重装备工程走廊')]
        }
    ),

    node(
        'bio_lab',
        '生化实验室',
        '被高压气密舱分隔的双层科研温室。成排的离心机与培养槽早已砸毁，唯独中央恒温箱依然亮着黄光——里面的一团深蓝色珊瑚状有机质正在伴随注视缓慢改变褶皱与色差。解剖台上的不锈钢托盘内盛满发蓝发绿的凝固血浆。',
        'Biohazard lab with sealed glass chambers, destroyed equipment, one active incubator with color-shifting coral-like organism, blue-green blood stains on surgical tools',
        {
            danger: danger.ambush(10, 0.4),
            items: [
                I.data(
                    'military_experiment_log',
                    '铁壁绝密实验日志',
                    '带有基金会与军方联合印鉴的活页夹，大段段落被强酸墨水涂销。',
                    '项目代号：铁壁。目标：借助深渊星神质实现肉体物理常数改写。第 17 天：样本通过敲击玻璃模仿人类莫尔斯码。第 23 天：主玻璃舱破裂，两名高级研究员在 40 秒内完成组织同化。第 24 天：军令到达，即刻执行绝对封锁，所有感染人员就地处决。第 25 天：[整页被深蓝血迹浸透]。',
                    { grade: 'corporate', threshold: 20 }
                ),
                I.consumable('bio_stimulant', '实验型强化药剂', '贴有「仅供铁壁特勤组」标签的高浓度肾上腺素合成物，能狂暴压榨肉体生机。', [['hp', 45]], {
                    grade: 'military',
                    threshold: 25
                }),
                I.accessory(
                    'neural_filter_prototype',
                    '神经过滤原型插件',
                    '从清理人高级指挥官面甲上拆下的芯片，外壳蚀刻着基金会第一序列资产编号。',
                    [['maxSanity', 40], ['will', 6]],
                    { grade: 'prototype', threshold: 25 }
                )
            ],
            interacts: [
                act(
                    '贴近观察运行中的恒温箱',
                    '你走近恒温箱。那团珊瑚状肉块突然止住变色，整体转化为与你手指皮肤完全一致的质感。它迅速重塑成一只五指张开的微缩人类手掌，掌心睁开一只湿漉漉的眼球与你对视！伴随沉闷的撞击，身后实验服堆中猛地跃出一个扭曲的身影！',
                    {
                        cost: 5,
                        sound: 'terrifying',
                        san: -15,
                        spawnEnemy: [
                            enemy.cthulhu(
                                'iron_wall_specimen',
                                '铁壁实验体-Γ',
                                '曾经的生化首席科学家。如今上半身完全被深青色的深渊珊瑚晶簇刺穿同化，晶簇尖端生长着无数未成熟的感光眼胞。其四肢反曲贴地飞奔，骨节与水泥摩擦迸发出刺耳的刮擦声。',
                                'A horrifying humanoid mutation, upper half covered in blue-green coral-like alien growths, underdeveloped eyeballs sprouting at coral branch ends, exposed bone and torn hazmat suit, dim UV lighting',
                                [30, 34, 18, 20, 2],
                                {
                                    intents: { attack: 56, defense: 10, buff: 12, debuff: 14, observe: 8 },
                                    loot: [
                                        loot(
                                            I.material('mutated_tissue', '异变组织样本', '具有极高科研价值与未知深渊活性的组织，封存在防爆管内。', {
                                                grade: 'prototype',
                                                fleshFusion: 50
                                            }),
                                            1.0
                                        ),
                                        loot(
                                            I.consumable('unstable_stimulant', '不稳定兴奋注射剂', '从实验体残骸体内抽取的变异体液，药力极其狂暴。', [['hp', 30]], {
                                                grade: 'military'
                                            }),
                                            0.35
                                        ),
                                        loot(
                                            I.accessory('bio_mask', '防化过滤面罩', '军用级防护面罩。', [['maxSanity', 20]], {
                                                grade: 'military',
                                                size: [2, 1]
                                            }),
                                            0.2
                                        )
                                    ]
                                }
                            )
                        ]
                    }
                )
            ]
        }
    ),

    node(
        'cryo_chamber',
        '低温冻存室',
        '十余座加压液氮冷冻立柜在极寒死寂中喷吐着刺骨白雾。大部分冻存舱的重型铅盖被从内部生生顶开变形，只剩下08、09、10三座舱门保持着闭锁状态。透过冰晶封冻的石英观察口，内部的浸泡物不具备任何已知的脊椎结构，更像是一团悬浮在零下二百度虚空中的黑色几何噩梦。',
        'Rows of liquid nitrogen cryogenic pods in darkness, most pods opened from inside, three sealed pods with frost-covered viewports showing amorphous dark shapes, white vapor',
        {
            danger: danger.level(11),
            items: [
                I.material('cryo_specimen', '液氮冻存标本', '密封在极低温双层真空瓶内的半透明深渊组织，即便在严寒中仍在发生微观蠕动。', {
                    grade: 'prototype',
                    size: [2, 1],
                    threshold: 25,
                    fleshFusion: 55
                }),
                I.data(
                    'cryo_manifest',
                    '冻存样本交接单',
                    '被严寒冻脆的塑料文档夹，字迹斑驳。',
                    '单元 01~07：已脱离收容，确认处于游荡活跃态。单元 08~10：绝对休眠。终极协议：任何情况下严禁开启 08 号舱。手写补注：08 号样本昨晚在液氮循环泵停机的一分钟里，隔着金属舱壁微笑了。',
                    { threshold: 15 }
                ),
                I.consumable('cryo_sealant', '低温密封凝胶', '配发给低温舱密封工程的特种耐寒凝胶，涂抹于神经穴位能瞬间驱散昏沉。', [
                    ['sanity', 20],
                    ['vigor', 20]
                ], { grade: 'military', threshold: 20 })
            ],
            interacts: [
                act(
                    '凝视 08 号密封冷冻舱',
                    '你抹去石英视窗上的白霜。舱内悬浮的一团非欧结晶正缓慢舒张。就在你指尖贴在玻璃上的瞬间，冷冻液内部也浮起了一只苍白的人形轮廓，严丝合缝地隔着玻璃将手掌贴在了你的掌心对面！舱顶的电子温度计数字骤降十度。',
                    { cost: 5, sound: 'terrifying', san: -12 }
                )
            ]
        }
    ),

    node(
        'server_room',
        '中央数据中心',
        '巨型机柜阵列发出深沉而稳定的共鸣，光缆交错如热带丛林中的绞杀藤蔓。中央主终端仍在不间断滚动着铁壁计划的原始数据流。而在主通道正中央，一座焊死在立柱上的重装自律安保机炮正缓慢摆动着红外传感器，冰冷地检索着任何非授权生物质。',
        'Server racks humming, green LED lights blinking in rows, tangled cables covering the floor, active main terminal with scrolling logs, automated security turret sweeping red sensor',
        {
            danger: danger.narrative(
                enemy.immovable(
                    'security_turret',
                    '自律安保炮塔',
                    '基座焊死在承重钢柱上的重型自律双联机炮。厚重的合金装甲与红外目标解算模块仍在一丝不苟地执行着最后的保密净化条例。它不具备任何机动能力，但射程与穿甲力极度致命。',
                    'Automated security turret bolted between server racks, red optical sensor sweeping, heavy armored housing, dim green server lights',
                    [16, 28, 42, 10],
                    {
                        loot: [
                            loot(
                                I.material('high_tier_scrap', '特种合金装甲废料', '特种耐酸合金，锻造高阶装备的无上材料。', {
                                    grade: 'corporate',
                                    size: [2, 1]
                                }),
                                0.7
                            ),
                            loot(
                                I.consumable('power_cell', '军用电池', '高容量密封电容组。', [['battery', 80]], {
                                    grade: 'military'
                                }),
                                0.4
                            )
                        ]
                    }
                )
            ),
            map: 'bunker_server',
            items: [
                I.data(
                    'encrypted_disk_core',
                    '铁壁核心数据盘',
                    '密封在铅封外壳内的核心数据库镜像盘，记录了实验失控的最终推导。',
                    '项目终局推导：深渊高维存在并非外星生物侵略，它更像是一种物理学底层常数的重塑。我们捕获的信号不是命令，而是它睁开眼睛时引力场泛起的涟漪。我们以为在研究它，而实际上，我们的神经系统不过是它在此方宇宙投影出的一排琴键。',
                    { grade: 'military', threshold: 20 }
                )
            ],
            interacts: [
                act(
                    '破解主服务器加密',
                    '红色警戒锁死界面在一声清脆的蜂鸣后变为绿色。你完整导出了铁壁项目的核心日志，得知了军方曾主动向信号源发射邀请脉冲的骇人真相。看清一切后，你心中的恐惧逐渐被冰冷的清醒取代。',
                    {
                        cost: 15,
                        sound: 'typing_1',
                        san: 5,
                        reqItems: ['signal_decoder'],
                        puzzle: P.type(
                            '铁壁加密终端',
                            '屏幕光标规律跳动：请输入「铁壁协议」执行封锁与处决命令的基准日期。根据已搜集的情报，该项目立项于 2023 年 10 月初，并在全面失控的第 24 天正式下达全域封锁指令。请按系统约定的 DDMMYY 格式键入 6 位数字代码：',
                            '241023',
                            {
                                hints: [
                                    '密码对应着深层掩体由军方全面下达就地处决与锁死指令的决定性日子。',
                                    '事件发生在立项第 24 天，月份为 10 月，年份为 2023 年。',
                                    '组合遵循标准的 DDMMYY 顺序：即日(24)、月(10)、年(23)。'
                                ],
                                timeCost: 10,
                                maxAttempts: 3,
                                penalties: { hp: -5 }
                            }
                        )
                    }
                )
            ]
        }
    ),

    node(
        'escape_tunnel',
        '紧急逃生通道',
        '一条窄小的加固逃生坑道，墙壁上每隔数米挂着一支荧光微弱的红色化学发光棒。行进约二十米处发生了严重坍方，巨石与扭曲的工字钢封死了大部分通道，只留下一道勉强能让成年人侧身挤过的黑暗缝隙，从缝隙另一端徐徐吹来带着体温的暖风。',
        'Narrow concrete escape tunnel, emergency lighting, partial collapse creating tight squeeze point, red chemlight writing on wall, wind from beyond the rubble',
        {
            danger: danger.level(8),
            items: [
                I.data(
                    'escape_map',
                    '竖井逃生草图',
                    '手绘在防水布上的通道截面图，某些分支被红笔打叉并标注「已活化」。',
                    '紧急撤离路线指引：深层防爆区 → 3号排气竖井 → 废弃采矿场出口。注意：第3天坍方后，排风管内壁开始分泌粘稠组织。最后一名逃生工兵报告在管口看见了墙壁在主动咀嚼。',
                    { grade: 'military', threshold: 10 }
                ),
                I.material('tactical_flashlight', '军用强光战术手电', '带有铝合金攻击头的高流明手电筒，光束如重剑般刺破阴霾。', {
                    threshold: 10
                })
            ],
            interacts: [
                act(
                    '侧身探查坍方狭缝',
                    '你屏住呼吸侧身挤过冰冷刺骨的岩石狭缝。在强光手电的照耀下，狭缝尽头的景象让你浑身血液冻结：坑道尽头根本不是通往地表的出口，而是一堵正在随呼吸剧烈起伏、由粉色肌纤维与无数血管紧密织就的活体肉膜！你踉跄着退了回来。',
                    { cost: 10, sound: 'terrifying', san: -15 }
                )
            ],
            exits: [E.transfer('穿越逃生通道离开前哨')]
        }
    ),

    node(
        'training_room',
        '训练场',
        '开阔的地下近战与格斗训诫所。地面铺装的防震橡胶垫多处破损，沙袋被整齐的利刃切开——漏出的不是砂石，而是一坨坨风干发黑的组织凝块。角落里的木质人形标靶上留存着深达数寸、绝非人类指骨或常规军刺所能造成的撕裂创痕。',
        'Underground training hall with rubber floor mats, punching bags, weapon racks, some bags split open revealing dried black organic matter, damaged wooden dummies with alien claw marks',
        {
            danger: danger.level(7),
            map: 'bunker_training',
            items: [
                I.weapon(
                    'training_knife',
                    '合金格斗训练刀',
                    '全钢打造的未开刃训练刺刀，虽无锐利刀锋，但坚固厚重。',
                    'prick',
                    1,
                    8,
                    [0.15, 4],
                    15,
                    { size: [1, 1], threshold: 5 }
                ),
                I.data(
                    'training_manual',
                    '反侵蚀肉搏条令',
                    '封面打上深层特勤密级的格斗教材，内容残酷至极。',
                    '第 3 课：当敌方附肢触及面甲，立刻放弃枪械并以刺刀剜除接触面皮肉。第 7 课：若肉体被深渊组织寄生超过 3 秒，拔出防身手雷引爆对应肢体。第 9 课：严禁倾听击倒目标的任何祷告。实战生还率：12%。',
                    { threshold: 8 }
                )
            ],
            interacts: [
                act(
                    '翻阅训练日志手抄本',
                    '训练手记详细记录了一套如何在队友发生肉体异化的瞬间以最快速度精准切断其颈椎的手法。每一页边缘都用血手印按压确认，最后几页所有参与签名的士兵都用同一个词替代了姓名：「祭品」。',
                    { cost: 5, sound: 'search', san: -5 }
                )
            ]
        }
    ),

    node(
        'incinerator',
        '高炉焚化室',
        '为彻底销毁同化尸骸而紧急改建的重工业焚化高炉。尽管鼓风机已熄火数日，靠近厚重的铸铁炉门时仍能感受到骇人的热浪与刺鼻的骨灰焦臭。一条宽阔且已彻底碳化的黑色血垢拖痕，从炉门深处一直延伸至排污排水井口。',
        'Massive industrial blast furnace repurposed as an incinerator, still radiating heat, iron doors slightly ajar, charred drag marks leading from the furnace to a dark drainage grate',
        {
            danger: danger.level(9),
            items: [
                I.weapon(
                    'charred_iron_pipe',
                    '碳化重型拨火棍',
                    '高炉配用的粗壮耐热铸铁拨棍，前端在千度高温下碳化硬化，挥舞时势大力沉。',
                    'wave',
                    1,
                    16,
                    [0.1, 8],
                    20,
                    { size: [3, 1], threshold: 8 }
                ),
                I.material('refractory_plate', '特种耐火合金衬板', '从焚化炉内胆剥落的耐高温合金模块，质地极度坚韧。', {
                    grade: 'military',
                    size: [2, 2],
                    threshold: 15,
                    qty: 2
                })
            ],
            interacts: [
                act(
                    '推开焚化炉铸铁重门',
                    '你用铁棍撬开门缝。在尚有暗红余烬的灰堆中，突然传出一阵干涩的咳嗽声。一截完全焦黑、只剩骨节与发光结缔组织的干瘪手臂猛然从炉栅探出抓向你的裤脚！你在惊恐中猛地将炉门合上锁死。',
                    { cost: 10, sound: 'terrifying', san: -10 }
                )
            ]
        }
    ),

    node(
        'patient_zero_containment',
        '零号收容单元',
        '铁壁计划的终极禁忌核心。这里没有任何医疗设施，只有一个悬吊于半空的巨大钛合金装甲球体。然而，厚达三十公分的实心外壳竟被某种来自高维的暴力由内而外生生撕开，卷曲的金属边缘如花瓣般绽裂。周围墙壁上留存着多道呈同心圆放射状的焦灼烧痕。',
        'Ultimate containment core, a massive titanium sphere suspended in mid-air, violently torn open from the inside out, 30cm thick armor peeled like foil, concentric radioactive scorch marks on surrounding walls, intense oppressive atmosphere',
        {
            danger: danger.narrative(
                enemy.cthulhu(
                    'patient_zero_echo',
                    '零号回声',
                    '从破碎球体内降临的高维存在物质化投影。它没有恒定的外形，而是由上千具死者的怨念骨肉、破碎的引力场透镜与虚空黑晶揉捏而成的重力畸变体。其周身的光线狂暴弯曲，每一次空间闪烁都伴随着直接震颤脑髓的低频尖啸。',
                    'A horrific floating amalgamation of human flesh and dark swirling gravity distortion, no fixed shape, tormented faces emerging and dissolving within the mass, air warping violently around it, intense cosmic horror aesthetic',
                    [48, 62, 38, 40, 8],
                    {
                        intents: { attack: 46, defense: 8, buff: 18, debuff: 20, observe: 8 },
                        loot: [
                            loot(
                                I.material('zero_core', '零号奇点核心', '散发着深邃黑紫光晕的非欧晶体，其内部不断进行着自我拓扑重构。', {
                                    grade: 'corporate',
                                    causalInversion: 70
                                }),
                                1.0
                            ),
                            loot(
                                I.material('echo_membrane', '回声时空膜片', '从实体边缘剥落的高维薄膜，折射出三维光谱不存在的异色。', {
                                    grade: 'prototype',
                                    causalInversion: 40
                                }),
                                0.45
                            ),
                            loot(
                                I.accessory(
                                    'echo_lens',
                                    '零号回声透镜',
                                    '由零号回声残骸凝铸出的目镜片，佩戴后能够抵御高强度的精神崩塌。',
                                    [['will', 8], ['maxSanity', 25]],
                                    {
                                        grade: 'corporate',
                                        cognitiveErosion: 45,
                                        causalInversion: 30
                                    }
                                ),
                                0.25
                            )
                        ]
                    }
                )
            ),
            map: 'bunker_core_containment',
            items: [
                I.data(
                    'first_contact_record',
                    '最初接触记录',
                    '被保存在钛合金防爆盒内的黑色记录仪核心，表面有等离子灼蚀痕迹。',
                    '项目代号：深渊凝视。我们从地下七千米深处掘出了它。它本在沉睡，而军方与基金会的联合钻探将其唤醒。当它睁开眼的那一秒，我们这片时空的引力常数就被改写了。它不需要释放毒气，它的存在本身就在否定经典物理学。原谅我们，我们亲手按下了终末的门铃。',
                    { grade: 'corporate', threshold: 20, cognitiveErosion: 60 }
                )
            ]
        }
    ),

    node(
        'observation_gallery',
        '观测回廊',
        '呈半弧形环绕在零号收容球体四周的加高走廊。厚重的防辐射石英视窗上布满蛛网般的细密微裂隙。控制台的脑电波监视仪依然在绘制平稳的曲线，而曲线的起伏规律在几秒后竟缓缓拼凑出一张张清晰的活人五官轮廓。',
        'Observation gallery around containment unit, cracked blast glass, old monitoring instruments, waveforms forming faint human faces, oppressive deep bunker lighting',
        {
            danger: danger.level(9),
            items: [
                I.data(
                    'observation_log',
                    '特派观察员日志',
                    '被铆钉固定在观测台上的牛皮记录本，部分纸页边缘被高温炙烤卷曲。',
                    '观察记录第 41 次：零号不再撞击容器。它开始将自身分子的振动频率调整得与球体钛合金完全一致。第 44 次：石英视窗内侧浮现出五指手印，我们确认无人进入过内部。第 45 次：手印的指纹与我本人的右手完全相同。结论：停止直视，拔枪自决。',
                    { grade: 'corporate', threshold: 18 }
                )
            ],
            interacts: [
                act(
                    '贴近石英视窗俯瞰',
                    '你站在破碎的玻璃窗前。对面的虚无黑暗中，慢慢倒映出你的身影。令你背脊发凉的是，镜中的你比真实的你晚了整整半秒才眨眼，却更早露出了一个意味深长的诡异微笑。',
                    { cost: 5, sound: 'terrifying', san: -12 }
                )
            ]
        }
    ),

    node(
        'disposal_chute',
        '处置滑道',
        '用于紧急抛弃重度感染污染物的垂直滑井。井壁涂满了厚厚的黑色油脂状残留物，井底堆积着被重力压扁的防爆桶与无法辨认的人形有机块。每隔数分钟，井道深处便会传出一阵类似胃肠蠕动般的吞咽回声。',
        'Vertical disposal chute in deep bunker, black greasy residue on walls, twisted metal and unidentifiable organic masses at bottom, faint swallowing sounds from below',
        {
            danger: danger.level(8),
            items: [
                I.material('biohazard_scrap', '污染合金重块', '从滑井底层捞回的重金属残块，表层覆盖着轻微搏动的生物黑膜。', {
                    grade: 'salvaged',
                    size: [2, 1],
                    threshold: 12,
                    qty: 2
                })
            ],
            interacts: [
                act(
                    '翻检滑道底部分离网',
                    '你用铁杆翻动底部的沉淀物。一块看似无机金属的碎块突然裂开一条缝隙，暴露出内部整齐排列的惨白人类臼齿！井壁周围的黑色油渍如同活物般迅速向你的脚踝聚拢！',
                    {
                        cost: 15,
                        sound: 'search',
                        hp: -5,
                        spawnEnemy: [
                            enemy.cthulhu(
                                'disposal_amalgam',
                                '滑道聚合体',
                                '由废弃防化装备、金属碎块与半消化生化组织在高压重力下挤压形成的怪物。其行动如同咬合运转的工业垃圾粉碎机，所过之处留下酸腐的黑色涎水。',
                                'Amalgam of scrap metal, torn hazmat suits and digested organic matter, moving like a chewing industrial compactor, black grease dripping',
                                [14, 20, 24, 8, 2],
                                {
                                    intents: { attack: 48, defense: 18, buff: 6, debuff: 16, observe: 12 },
                                    loot: [
                                        loot(
                                            I.material('contaminated_scrap', '污染合金重块', '残骸中剥离的金属块。', {
                                                grade: 'salvaged',
                                                size: [2, 1]
                                            }),
                                            0.8
                                        ),
                                        loot(I.consumable('painkillers', '强效止痛药', '军用麻醉性镇痛胶囊。', [['hp', 15]]), 0.3)
                                    ]
                                }
                            )
                        ]
                    }
                )
            ]
        }
    ),

    // =========================================================================
    // 6. 外部周边与安全过渡区 (2 节点)
    // =========================================================================
    node(
        'field_medical',
        '野战医务室',
        '由厚帆布与脚手架钢管临时搭设的急救站，紧贴安保检查站后侧。便携式折叠手术台上凝固着大片黄褐色的碘伏与止血药斑痕。药品架基本已被清空，角落里的一只加固铁箱用挂锁牢牢锁住。墙上张贴着简化的外伤处理流程，末尾一步写的不是包扎，而是大大的「祈祷」二字。',
        'Canvas and steel pipe field medical station, folding surgery table with iodine stains, mostly empty medicine cabinet, locked iron case, crude medical procedure chart ending with pray',
        {
            facility: {
                id: 'facility_bunker_pharmacy',
                name: '药剂调配站',
                desc: '在野战医务室搭建的提纯台，把回收的过期药剂与残余药材精制为抗感染试剂。',
                function: { medicine: 3, electricity: -1 }
            },
            items: [
                I.consumable('bandage', '医用急救绷带', '经过环氧乙烷灭菌的弹力压迫止血带，能有效恢复物理生命。', [['hp', 25]], {
                    threshold: 5
                }),
                I.consumable('painkillers', '强效止痛药', '军用麻醉性镇痛胶囊。恢复少量 HP。', [['hp', 15]], { threshold: 10 }),
                I.consumable('sedative', '军用中枢镇静剂', '标签被撕毁大半的神经安定注射针，能强行压制精神狂乱并补充精力。', [
                    ['sanity', 18],
                    ['vigor', 12]
                ], { grade: 'military', threshold: 12 })
            ],
            interacts: [
                act(
                    '处理外伤创口',
                    '你用棉球蘸着碘伏清理伤口边缘的坏死组织并扎紧绷带。钻心的剧痛让你头脑清醒，渗血总算被彻底止住了。',
                    { cost: 20, sound: 'item_use', hp: 10 }
                ),
                act(
                    '撬开角落加固药箱',
                    '挂锁锁梁锈蚀严重，在撬棍的猛力扳动下应声断裂。箱内整齐码放着一套高规格野战急救套件。此外还有三支无标签的淡绿色荧光针剂，出于对深渊异化的本能戒备，你只取走了急救包。',
                    {
                        cost: 15,
                        gain: [
                            I.consumable('military_medkit', '军用急救包', '完好的野战外伤急救套件。', [['hp', 40]], {
                                grade: 'military',
                                size: [2, 1]
                            })
                        ]
                    }
                )
            ],
            exits: [E.to('security_checkpoint', '返回安保检查站')]
        }
    ),

    node(
        'blast_door',
        '主防爆门',
        '半米厚的铅硼重合金气动大门将整座地下前哨与外界死寂荒原彻底隔开。巨大的机械转轮锁盘上方闪烁着猩红的危险警报灯。固定在门框旁的盖格计数器正在以狂暴的频率发出噼啪电离爆鸣。大门内壁有人用电焊枪烙下了两行滚烫的字标：上面是 ABANDON ALL HOPE，下方歪歪扭扭地焊着一行汉字：「但希望从来不是活下去的必需品」。',
        'Thick lead blast door, massive wheel lock with flashing red warning light, geiger counter nearby clicking frantically, welded English and Chinese text on inner surface',
        {
            danger: danger.level(6),
            map: 'bunker_blast_gate',
            items: [
                I.material('dog_tags', '阵亡军牌串', '沾染暗黑血垢的合金身份铭牌，串连着数名年轻步兵的名字。', {
                    threshold: 5
                })
            ],
            interacts: [
                act(
                    '贴耳倾听门外动静',
                    '你将耳朵贴近冰冷的铅门。门外沉重的低吼与无数指甲抓挠合金的杂音突然瞬间归于绝对寂静。三秒后，门外传来了极其礼貌、带有完美人类节奏的敲门声——扣门三下。接着，一个你曾在旧世界极其熟悉的声音在门缝外轻轻呼唤着你的名字。',
                    { cost: 5, sound: 'terrifying', san: -10 }
                )
            ],
            exits: [E.to('security_checkpoint', '返回安保检查站'), E.transfer('强行开启大门踏入荒原')]
        }
    )
)