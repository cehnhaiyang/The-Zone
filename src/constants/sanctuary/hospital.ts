/**
 * 圣伊丽莎白纪念医院
 */
import type { SanctuaryTemplate } from '../../meta';

export const ZONE_HOSPITAL: SanctuaryTemplate = {
    id: 'hospital',
    name: '圣伊丽莎白纪念医院',
    background: '曾是一所声名卓著的综合性医疗机构。在“不可名状”入侵的渐进期，某神秘组织以巨额资金为诱饵，在此启动了名为「阿斯克勒庇俄斯计划」的禁忌实验，将这座救死扶伤的圣殿亲手锻造成异变震中。异变前数月，一系列离奇医疗事故与病人失踪案频登新闻头条，但院方高层早已被天文数字的“封口费与留守报酬”买断了良知。恐慌的富豪病患在最后时刻抛洒重金，雇用施工队焊死每一扇窗户、安装军用级防爆门。异变彻底降临后，高管们或乘直升机仓皇逃离，或惨死于顶楼的奢靡办公室。如今，仅有自愿留守的护士长率领手下的留守员工们，支撑着这群被世界抛弃的人——滞留的病患、施工队、走投无路的幸存者——依靠富豪遗留的奢侈物资，在钢铁与血肉交织的牢笼中苟延残喘。',
    topology: '跨越 B1 至 F5 共 6 个物理楼层，以消防楼梯井系统垂直串联。内部空间随着层数上升，物理与认知畸变愈发严重。',
    nodesCount: 50,
    visualStyle: 'Cinematic Horror, Abandoned Hospital, Heavy Steel Barricades, Liminal Space, Fluorescent Flicker, Unreal Engine 5, Volumetric Fog',
    dilationFactor: 1.0,
    entrance: 'room_201',
    initialState: {
        necessaryResource: {
            food: 52,
            water: 58
        },
        uniqueResource: [
            {
                id: 'medicine',
                name: '药品',
                desc: '门诊药房存留的镇静剂与抗生素，用于救治伤员。',
                icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="9" width="18" height="7" rx="3.5"></rect><path d="M12 9v7"></path></svg>',
                value: 46
            },
            {
                id: 'electricity',
                name: '电力',
                desc: 'B1 柴油发电机维持的院内供电，冷链、照明与门禁全靠它。',
                icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2L4 14h7l-1 8 9-12h-7z"></path></svg>',
                value: 64,
                consumptionRate: 0.1
            },
            {
                id: 'scraps',
                name: '废料',
                desc: '拆卸报废军械与医疗设备得到的工程材料，可充作升级设施的代价。',
                icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 7h16v10H4z"></path><path d="M8 7v10M16 7v10"></path></svg>',
                value: 50
            },
        ],
        population: 32,
        erosion: 12,
        facility: [
            {
                id: 'facility_b1_generator',
                name: '备用柴油发电机',
                desc: 'B1 发电机房的垂死猛兽。老旧的柴油机组勉强维持医院电力，需要定期供油维护，否则电力输出会持续走低。',
                nodeMounted: 'generator_room',
                function: { electricity: 6 }
            },
            {
                id: 'facility_f1_canteen',
                name: '员工食堂配给灶',
                desc: 'F1 员工食堂的配给灶台。用富商遗留的物资与院内库存勉强开火，为庇护所居民提供每日口粮。',
                nodeMounted: 'cafeteria',
                function: { food: 4 }
            },
            {
                id: 'facility_f1_pharmacy',
                name: '门诊药房冷藏柜',
                desc: 'F1 门诊药房的医药冷藏柜。冷链依赖 B1 电力，柜内镇静剂与抗生素是医院最珍贵的硬通货。',
                nodeMounted: 'pharmacy_outpatient',
                function: { medicine: 2 }
            },
            {
                id: 'facility_f3_flesh_stitch',
                name: '血肉缝合阵列',
                desc: '挂载于重症监护区的禁忌医疗装置。利用深渊同化原理，将生还者断裂的肢体或衰竭的脏器与高活性生物材料直接融焊，足以把濒死的居民从鬼门关拉回。但每一次启动都会让庇护所的侵蚀度不可逆地上浮——在这里住得越久，人就越难分清自己究竟是血肉，还是医院的一部分。',
                nodeMounted: 'icu',
                function: { medicine: 3, erosion: 2 }
            }
        ]
    },
    nodes: {
        /**
         * 楼梯井系统 - 垂直探索的脊柱
         */
        stairwell_b1: {
            name: '地下室入口',
            desc: '通往地下设施的防火门被数道粗重钢条层层焊死，漆面剥落处露出黑黄相间的警示条纹。门板背后，备用发电机组发出垂死巨兽般的低沉轰鸣，灼人的热浪裹挟着机油与甜腻腐败物混合的恶臭，从门缝中阵阵涌出。你伸出的手指尚未触及，门把手的滚烫温度便已警告着——地狱正在另一侧熊熊燃烧。',
            visualPrompt: 'Heavy steel door reinforced with welded rebars, black-yellow hazard stripes. Heat haze distortion visible. Mechanical humming with ominous undertones. Industrial dread.',
            isDangerous: 5,
            exits: [
                { targetId: 'stairwell_f1', label: '上到一楼', type: 'local' },
                { targetId: 'corridor_b1_service', label: '进入设施层', type: 'local' }
            ]
        },
        stairwell_f1: {
            name: '一楼楼梯间',
            desc: '红色应急灯以不祥的节奏脉动着，将整片空间浸染成搏动的血色。施工队员用喷漆在墙面留下了层层叠加的绝望警告，字迹潦草癫狂。楼梯上堆满坍塌的脚手架与废弃建材，仅留出一条逼仄到令人窒息的狭窄小径。空气中，汗水、铁锈与劣质烟草的气味沉重地凝结在一起。偶尔，应急灯会毫无征兆地熄灭，在绝对黑暗中，你能听见一顶安全帽从上方楼梯拐角自行滚落的清脆撞击声，抑或是一道不属于你的沉重呼吸声在背后响起。',
            visualPrompt: 'Stairwell bathed in pulsating red emergency light. Layered graffiti warnings on walls. Scaffold pipes and debris creating a claustrophobic narrow path. Oppressive atmosphere.',
            isDangerous: 3,
            exits: [
                { targetId: 'stairwell_f2', label: '上到二楼', type: 'local' },
                { targetId: 'corridor_f1_lobby', label: '进入大厅', type: 'local' },
                { targetId: 'corridor_f1_hall', label: '进入后勤走廊', type: 'local' },
                { targetId: 'stairwell_b1', label: '下至地下室', type: 'local' }
            ]
        },
        stairwell_f2: {
            name: '二楼楼梯间',
            desc: '这片小小的过渡空间被打扫得反常洁净，与楼下形成刺眼对比。然而通往三楼的防火门却被数把沉重的工业铁链与挂锁死死缠绕封锁。门上贴着泛黄的医疗胶带，潦草而巨大地写着："重度感染区 · 绝对禁止入内"。你若屏息凝神，便能听见门后传来一阵阵尖锐的指甲刮挠金属的细碎声响。',
            visualPrompt: 'Clean stair landing contrasting with surroundings. Massive industrial chains and padlocks on door leading up. Warning sign written in peeling medical tape. Faint scratch marks visible on door surface.',
            isDangerous: 8,
            interactions: [
                {
                    desc: '破拆三楼防火门',
                    requirements: {
                        items: ['crowbar']
                    },
                    results: {
                        timeCost: 10,
                        soundEffect: 'unlock',
                        narrative: '你将撬棍楔入铁链缝隙，用尽全身力气猛然撬动。伴随一连串刺耳的金属悲鸣，粗重的链条哗啦崩断落地。防火门应声开了一道缝，刺骨的冷气与浓烈的腐肉甜味瞬间涌出，如同打开了某个禁忌之棺。黑暗中，什么粘稠的东西正从天花板规律地滴落。',
                        stateChange: {
                            unlock: [['stairwell_f3', '进入被封锁的三楼区域']]
                        }
                    }
                }
            ],
            exits: [
                { targetId: 'corridor_f2_east', label: '前往住院部', type: 'local' },
                { targetId: 'stairwell_f1', label: '下到一楼', type: 'local' }
            ]
        },
        stairwell_f3: {
            name: '三楼楼梯间',
            desc: '崩断的铁链残骸散落一地，气温骤降至让人如坠冰窟。地面的厚积灰尘上印着数道巨大的粘液拖拽痕迹，边缘泛着病态的淡紫色荧光。瓷砖墙面的裂缝中，浓稠的黑色液体正逆着重力缓慢渗出凝结。远处尽头规律的水滴声不时停顿，死寂过后再次响起的节奏变得完全陌生——仿佛某种笨拙的模仿。当手电光束扫过墙角，一团蜷缩的黑色粘液似乎感知到了光线，猛地收缩了一下。',
            visualPrompt: 'Broken chains on dusty floor. Thick dust bearing strange bioluminescent slime trails. Cold atmosphere visible as breath. Cracked tiles with viscous black substance seeping upward.',
            isDangerous: 14,
            exits: [
                { targetId: 'stairwell_f2', label: '下到二楼', type: 'local' },
                { targetId: 'corridor_f3_surgery', label: '进入手术层', type: 'local' },
                { targetId: 'stairwell_f4', label: '上到四楼', type: 'local' }
            ]
        },
        stairwell_f4: {
            name: '四楼楼梯间',
            desc: '混凝土墙壁上布满了深可见骨的巨大抓痕与蛛网状裂纹，仿佛整面墙体曾被某种无形的巨力攥住碾压。通往精神科的半掩门扉中透出诡异的紫色脉动光芒。侧耳倾听，门缝中传出无数交叠重唱的疯狂低语，甚至飘出一段由多重错位音调拼凑而成的摇篮曲。这里的物理法则已经开始摇摇欲坠，墙上的一道裂纹甚至会在你注视下缓慢延伸，伴随着玻璃碎裂般的细微脆响，直至停在你的脸侧。',
            visualPrompt: 'Deep unnatural claw marks scarring concrete walls. Door slightly ajar with pulsing purple light seeping through. Visible cracks slowly expanding. Reality feels thin, unstable.',
            isDangerous: 18,
            exits: [
                { targetId: 'stairwell_f3', label: '下到三楼', type: 'local' },
                { targetId: 'corridor_f4_psych', label: '进入精神科', type: 'local' },
                { targetId: 'stairwell_f5', label: '上到五楼', type: 'local' }
            ]
        },
        stairwell_f5: {
            name: '楼梯顶端',
            desc: '一尘不染的羊毛地毯顽固地维持着灾变前高层专属的奢华假象。空气中依然残留着淡淡的雪茄烟叶与名贵古龙水混合的气味——那是精英阶层仓皇逃离时留下的最后痕迹。一扇虚掩的镀金红木大门安静地等待在楼梯尽头，与楼下层层堆叠的血肉废墟构成了荒谬绝伦的对比。太安静了。',
            visualPrompt: 'Pristine carpeted landing untouched by surrounding decay. Fancy wooden door with gold handle slightly ajar. Lingering scent of cigars and cologne. Oppressive, unnatural silence.',
            isDangerous: 12,
            exits: [
                { targetId: 'stairwell_f4', label: '下到四楼', type: 'local' },
                { targetId: 'corridor_f5_admin', label: '进入行政层', type: 'local' }
            ]
        },
        /**
         * B1 设施层 - 医院的心脏与施工队的坟墓
         */
        corridor_b1_service: {
            name: '设施走廊',
            desc: '暴露的管道如变异的血管群般暴起盘踞在墙壁上，在暗红应急灯光中发出低沉的嗡鸣。脚踝深的积水反射着破碎的光影，偶尔无风的积水面却泛起了完美的同心圆涟漪。头顶管道表面时不时缓缓鼓起一个人头大小的包块，像是有什么东西在金属内壁蠕动前行。角落堆放着早已僵硬结块的水泥袋，引导着前往发电机房与深处太平间的道路。',
            visualPrompt: 'Industrial corridor. Pipes covering walls like pulsing veins. Puddles reflecting red emergency lights. Cement bags stacked in corners. Heavy, stagnant air.',
            isDangerous: 10,
            childrenIds: ['generator_room', 'morgue', 'incinerator_room', 'boiler_room', 'laundry_room'],
            exits: [{ targetId: 'stairwell_b1', label: '返回楼梯', type: 'local' }]
        },
        generator_room: {
            name: '发电机房',
            desc: '老旧的柴油发电机如一头被钉在地上的垂死巨兽，剧烈震颤着发出震耳欲聋的轰鸣。热浪逼人，浓烈的柴油与机油混合气味熏得人睁不开眼。墙上用红漆潦草刷着触目惊心的警告：断电即意味着气密门永久锁死。角落里散落着工头最后试图维修时留下的工具箱与一把沾血的撬棍。',
            visualPrompt: 'Massive diesel generator vibrating violently. Leaking oil pooling on floor. Intense heat distortion in air. Red paint warning on grime-covered wall. Bloody crowbar and toolbox scattered in the corner.',
            isDangerous: 6,
            items: [
                {
                    id: 'fuel_canister',
                    name: '燃料罐',
                    desc: '半满的柴油罐，沉重的能源补给。',
                    type: 'material',
                    size: [1, 1],
                    grade: 'standard',
                    discoveryThreshold: 10
                },
                {
                    id: 'spare_battery',
                    name: '备用电池',
                    desc: '标准外设能源块，仍有大半电量。',
                    type: 'consumable',
                    size: [1, 1],
                    grade: 'standard',
                    effects: [['battery', 50]],
                    discoveryThreshold: 15
                },
                {
                    id: 'basic_toolkit',
                    name: '维修工具',
                    desc: '一套耐用的通用五金维修套件。',
                    type: 'material',
                    size: [1, 1],
                    grade: 'standard',
                    discoveryThreshold: 5
                },
                {
                    id: 'scrap_parts',
                    name: '废旧零件',
                    desc: '杂乱但可再利用的金属与电子元件。',
                    type: 'material',
                    size: [1, 1],
                    grade: 'standard',
                    discoveryThreshold: 8
                },
                {
                    id: 'crowbar',
                    name: '撬棍',
                    desc: '沾着干涸血渍的重型撬棍。兼具破锁与碎颅双重功效。',
                    type: 'weapon',
                    size: [2, 1],
                    grade: 'standard',
                    weaponType: 'wave',
                    weaponDamageType: 'melee',
                    range: 1,
                    damage: 12,
                    crit: {
                        chance: 0.08,
                        bonus: 6
                    },
                    maxUses: 25,
                    discoveryThreshold: 5
                }
            ],
            interactions: [
                {
                    desc: '检查发电机状态',
                    results: {
                        timeCost: 5,
                        soundEffect: 'ui_click',
                        narrative: '操作面板上的油压表指针在红色区域疯狂颤动，冷却系统温度异常飙升。你捡起操作台下皱成一团的维护手册，每一页空白处都填满了工人们无助的涂鸦与祷告。'
                    }
                }
            ]
        },
        morgue: {
            name: '太平间',
            desc: '冷气渗入骨髓，大多数停尸柜门大敞却空无一物。最深处的一个柜子被粗壮的钢筋从外部死死焊封，不锈钢柜体表面布满从内部猛烈发力造成的恐怖凸起。柜底缝隙渗出一滩缓慢凝结的黑色稠液，内部正传出低沉、规律、如心脏搏动般的沉闷巨响。只要你在密闭空间待得足够久，甚至能看到敞开的空柜子猛地自行弹回闭合，惊动室温在几次呼吸间骤降。',
            visualPrompt: 'Freezing, frost-covered morgue. Empty steel drawers hanging open. One drawer violently welded shut with crude rebar, deeply dented from inside. Dark fluid seeping. Rhythmic pounding sound emanates.',
            isDangerous: 20,
            interactions: [
                {
                    desc: '靠近被焊死的柜子',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative: '你屏住呼吸靠近，那股沉闷的撞击声却骤然停止。死寂中，柜内传出令人牙酸的多重和声，语气亲昵地呢喃着"手术……很成功……"。紧接着，尖锐的指甲疯狂刮擦金属的刺耳声响让你本能地踉跄后退——焊封的柜门，正从内侧被缓缓顶开。',
                        stateChange: {
                            sanity: -15,
                            spawnEnemy: [
                                {
                                    type: 'cthulhu',
                                    id: 'sewn_stalker',
                                    name: '缝合爬行者',
                                    range: 1,
                                    gender: 'both',
                                    desc: '挣脱焊封停尸柜的畸形体。它以走廊里散落的尸块为零件，将自身与病床钢架、输液架缝合在一起，拖着整具金属骨架缓慢爬行，关节以干涸筋膜为铰链，发出令人牙酸的碾磨声。',
                                    visualPrompt: 'A horror crawling creature stitched together from corpse parts and hospital bed frames, dragging broken steel, frozen morgue atmosphere.',
                                    speed: 20,
                                    damage: 34,
                                    evasion: 8,
                                    defense: 16,
                                    intentDistribution: { attack: 70, defense: 0, buff: 0, debuff: 20, observe: 10 },
                                    lootTable: [
                                        {
                                            id: 'fused_rib_cage',
                                            name: '融合肋骨',
                                            desc: '与钢板完全共生的胸廓残片，可作为锻造稀有护甲的材料。',
                                            type: 'material',
                                            size: [1, 1],
                                            grade: 'military',
                                            dropProbability: 0.6
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                }
            ]
        },
        incinerator_room: {
            name: '焚化室',
            desc: '工业级焚化炉的铸铁门半开，内部未熄的幽蓝余烬在黑暗中明灭闪烁，灰烬似乎在缓慢地、刻意地重新聚拢成某种形状。烧焦的有机物与刺鼻的化学防腐剂气味混杂在一起。未清理的灰烬堆中混杂着几块散发着紫色微光的非人类晶体骨骸。墙角堆积的防化服上尽是飞溅后氧化发黑的血迹，墙上那只干涸的褐色血手印，甚至在你转身时向下滑落出新的痕迹。',
            visualPrompt: 'Industrial incinerator with door ajar, revealing glowing blue embers. Charred walls with bloody handprints smeared in desperation. Mound of ash containing purple glowing crystalline fragments. Abandoned hazmat suits.',
            isDangerous: 15,
            interactions: [
                {
                    desc: '翻找防化服堆',
                    results: {
                        timeCost: 5,
                        soundEffect: 'item_pickup',
                        narrative: '你在满是血污的防化服中翻出一张印着扭曲螺旋图案的纯黑磁卡。附在其旁的便签上用极其潦草的字迹绝望地写道："标本焚烧后仍具神经反射活性！必须用液氮彻底销毁！！"',
                        stateChange: {
                            sanity: -12,
                            gain: [
                                {
                                    id: 'key_staff_card_org',
                                    name: '组织通行证',
                                    desc: '印有螺旋标志的黑色磁卡，材质冰凉得不正常，散发出浓厚的不祥气息。',
                                    type: 'material',
                                    size: [1, 1],
                                    grade: 'military'
                                }
                            ]
                        }
                    }
                }
            ]
        },
        boiler_room: {
            name: '锅炉房',
            desc: '巨大的工业锅炉仍在低吼着运转，炉膛内的火焰呈现病态的蓝紫色。滚烫的金属管道如蛰伏的巨蟒盘踞在天花板，表面凝结着厚实的锈垢。墙角的煤堆被掘出一个洞穴般的深坑，坑沿散落着干涸的黑色粘液。一块焦黑的铁板上，有人用焊枪刻下歪扭的字迹："它吃热。别让它冷下来。"',
            visualPrompt: 'Massive industrial boiler roaring with eerie blue-violet flames. Hot metal pipes like coiled serpents. Coal pile dug into a cave-like hollow with dried black slime on edges. Welded graffiti warning on scorched steel plate.',
            isDangerous: 11,
            items: [
                {
                    id: 'heat_resistant_steel',
                    name: '耐热合金钢',
                    desc: '锅炉维护间遗留的高温合金钢材，可作高级锻造材料。',
                    type: 'material',
                    size: [1, 1],
                    grade: 'military',
                    discoveryThreshold: 12
                },
                {
                    id: 'condensed_water',
                    name: '冷凝净水',
                    desc: '锅炉冷凝器收集的蒸馏水，意外地干净。',
                    type: 'consumable',
                    size: [1, 1],
                    grade: 'standard',
                    effects: [
                        ['hp', 10],
                        ['sanity', 5]
                    ],
                    discoveryThreshold: 8
                }
            ],
            interactions: [
                {
                    desc: '检查炉膛',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative: '你透过观察窗望向炉膛深处。蓝紫色的火焰舔舐着一团形态模糊的焦黑物体，它正以某种缓慢而执着的节律向炉口攀爬。当你靠近，火焰忽然暴涨——仿佛炉膛里的东西察觉到你的目光，正在加速赶来。',
                        stateChange: { sanity: -8 }
                    }
                }
            ]
        },
        laundry_room: {
            name: '洗衣房',
            desc: '数十台工业滚筒洗衣机仍在不祥地自动运转，滚筒内有节奏地传出沉闷的撞击声。晾衣绳上挂满病号服与床单，其中一件病号服被撑出人形轮廓的鼓胀。角落里，三台烘干机的舱门全部大敞，内壁布满放射状的深长爪痕。',
            visualPrompt: 'Industrial laundry room with washing machines spinning on their own. Sheets and gowns hanging from lines, one gown bulging in human silhouette. Dryer doors wide open revealing radial claw marks inside.',
            isDangerous: 9,
            items: [
                {
                    id: 'clean_bandage',
                    name: '洁净绷带',
                    desc: '一包未拆封的医用绷带，难得一见的干净物资。',
                    type: 'consumable',
                    size: [1, 1],
                    grade: 'standard',
                    effects: [['hp', 25]],
                    discoveryThreshold: 5
                },
                {
                    id: 'laundry_rope',
                    name: '晾衣绳',
                    desc: '结实耐磨的尼龙晾衣绳，用途广泛。',
                    type: 'material',
                    size: [1, 1],
                    grade: 'standard',
                    discoveryThreshold: 8
                }
            ],
            interactions: [
                {
                    desc: '掀开鼓胀的病号服',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative: '你伸手掀开那件鼓胀的病号服——底下空无一物，只有保持人形的湿痕与几缕纠缠的黑色菌丝。与此同时，一台洗衣机骤然停机，滚筒门缓缓自行弹开，里面有节奏的撞击声戛然而止，转而传来一道黏腻的、拖长的吞咽声。',
                        stateChange: { sanity: -6 }
                    }
                }
            ]
        },
        /**
         * F1 大厅层 - 难民营与最后的防线
         */
        corridor_f1_lobby: {
            name: '中央接待大厅',
            desc: '曾经洒满阳光的明亮大厅，如今沦为了腥臊难忍的绝望难民营。肮脏的睡袋铺满每个角落，落地窗被厚重工字钢从内侧焊死，只有几盏昏暗的应急灯勉强驱散着浓稠的黑暗。墙上刻满了绝望的倒计时日历，蜷缩在阴影中的幸存者眼中尽是空洞与麻木。偶尔有人用一种扭曲变形的陌生音节低声祈祷，那声音不属于任何已知的人类语言。',
            visualPrompt: 'Grand hospital lobby converted into a squalid refugee camp. Dirty sleeping bags covering floor. Massive windows completely barricaded with welded steel beams. Dim, flickering lighting. Hollow-eyed survivors huddled in shadows.',
            isDangerous: 4,
            childrenIds: [
                'heavy_airlock',
                'chapel',
                'cafeteria',
                'gift_shop',
                'security_office',
                'emergency_room',
                'radiology_room',
                'pharmacy_outpatient'
            ],
            items: [
                {
                    id: 'ration_list',
                    name: '物资配给表',
                    desc: '一张打印纸，底部有护士长颤抖的签名。',
                    type: 'data',
                    size: [1, 1],
                    grade: 'standard',
                    discoveryThreshold: 5,
                    documentContent: '配给表 - 第7周\n\nVIP区库存已被征用。每人每日配给：压缩饼干200g，水500ml。\n严正警告：私藏物资者即刻驱逐出安全区。我们撑不过两个月了。\n——护士长 艾拉拉\n\n附注：已制止三场暴乱。人性正在加速崩解，但我们别无选择。'
                }
            ],
            interactions: [
                {
                    desc: '与难民交谈',
                    results: {
                        timeCost: 5,
                        soundEffect: 'ui_click',
                        narrative: '一名浑身油污的前施工队员冷笑了一声，抬手指向二楼方向："楼上那个富翁，就是掏钱让我们把他自己焊死在里面的那个——猜怎么着？异变第二天，他的脑袋就从内部炸开了，脑浆溅上水晶吊灯。在这鬼地方，钱就是个他妈的笑话。"'
                    }
                }
            ],
            exits: [
                { targetId: 'corridor_f1_hall', label: '前往后勤走廊', type: 'local' },
                { targetId: 'stairwell_f1', label: '返回楼梯间', type: 'local' }
            ]
        },
        heavy_airlock: {
            name: '加固气密室',
            desc: '一扇厚重的军用级防爆门矗立在面前，门体上布满触目惊心的外部巨型爪痕——那些抓痕从外侧发起，将厚逾两寸的铅质金属向内卷曲撕裂。强化玻璃观察窗外，翻涌着永无休止的混沌灰雾。仪表盘的所有读数都已崩溃，显示门外的气压、温度、乃至基础物理常数，都已不再属于地球。',
            visualPrompt: 'Heavy military-grade blast door. Deep, violent external claw marks curling thick metal inward. Small reinforced viewport revealing swirling grey void. All instrument gauges showing impossible readings.',
            isDangerous: 5,
            interactions: [
                {
                    desc: '查看窗外',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative: '你将脸贴近冰冷的强化玻璃。灰雾中，解体崩塌的城市废墟在失重状态下缓慢翻滚漂浮。一条长满发光复眼的巨型触须悠然滑过视野——那尺度无法用人类的距离感去衡量。你回过神时，发现玻璃外侧凝结的白霜上，印着一只远超人类尺寸的巨大手印。',
                        stateChange: { sanity: -5 }
                    }
                }
            ],
            exits: [{ label: '开启气密门', type: 'zone_transfer' }]
        },
        chapel: {
            name: '祈祷室',
            desc: '小小的礼拜堂中燃着数百支廉价许愿蜡烛，蜡油堆积如山，流淌凝固成乳白色的泪之瀑布。烛火常常会无风剧烈偏斜，齐齐指向房间的同一个角落。圣母像背后的墙壁上，有人用半凝的鲜血画出了一个巨大的异端螺旋符号。彻底崩溃的信徒们对着虚无疯狂磕头，撕碎的圣经书页上密密麻麻重复写着一句话："它在看着它在看着它在看着"。',
            visualPrompt: 'Dim chapel filled with hundreds of lit candles, rivers of solidified wax. Bloody alien spiral symbol painted behind veiled Virgin Mary statue. Torn Bibles. Desperate prostrating figures.',
            isDangerous: 3,
            items: [
                {
                    id: 'rosary_beads',
                    name: '染血念珠',
                    desc: '缠绕着信徒执念的念珠。',
                    type: 'accessory',
                    size: [1, 1],
                    grade: 'military',
                    effects: [['maxSanity', 10]],
                    discoveryThreshold: 15
                }
            ],
            interactions: [
                {
                    desc: '点燃祈祷蜡烛',
                    results: {
                        timeCost: 5,
                        soundEffect: 'success',
                        narrative: '火光摇曳着亮起，带来片刻虚假却温暖的心安。你强迫自己忽略墙壁上那血色的异端符号，将精神聚焦于眼前微弱的烛焰。身旁一位满脸沟壑的老妇人向你投来无声的感激目光，你的呼吸终于平复下来。',
                        stateChange: { sanity: 15 }
                    }
                }
            ]
        },
        cafeteria: {
            name: '员工食堂',
            desc: '桌椅被推翻堆叠成粗糙的防御壁垒，高档进口的罐头与桶装水堆成小山，但周围荷枪实弹的民兵用冷峻的眼神警告着每一个人。白板上密密麻麻记录着精确到克的库存数字与每日递减的配给消耗。在这个崩坏的世界里，这些仅存的物资是维持秩序的唯一枷锁——也是下一场内战的导火索。',
            visualPrompt: 'Cafeteria turned fortified storage depot. Tables piled as defensive barricades. Stacks of luxury canned goods under armed guard. Whiteboard covered in meticulous inventory math.',
            items: [
                {
                    id: 'emergency_ration',
                    name: '应急口粮',
                    desc: '密封完好的压缩饼干，虽已过期但仍是硬通货。',
                    type: 'consumable',
                    size: [1, 1],
                    grade: 'standard',
                    effects: [['hp', 10]],
                    discoveryThreshold: 5
                },
                {
                    id: 'pure_water',
                    name: '纯净水',
                    desc: '未受污染的瓶装水。',
                    type: 'consumable',
                    size: [1, 1],
                    grade: 'standard',
                    effects: [
                        ['hp', 5],
                        ['sanity', 10]
                    ],
                    discoveryThreshold: 8
                }
            ],
            childrenIds: ['kitchen'],
            interactions: [
                {
                    desc: '检查库存记录',
                    results: {
                        timeCost: 5,
                        soundEffect: 'ui_click',
                        narrative: '护士长的账目严丝合缝，每一滴水都有去处。但你敏锐地注意到——近三天来，每日夜间都有异常高的"无故损耗"。白板夹缝中塞着一张皱巴巴的便签，上面潦草写道："不是我们的东西在偷。是它。它在吃。"'
                    }
                }
            ]
        },
        kitchen: {
            name: '后厨',
            desc: '灶台积满凝固的油脂与霉菌，水槽内锈迹斑斑。角落里的工业冰柜违反常理地发出巨大轰鸣，冷冻门边缘结满厚厚的血红色冰霜。地面上，一串脚趾比例极长的不明湿脚印从冰柜方向一路延伸至黑暗的后门，像是某种东西刚刚在深夜完成了又一次觅食。',
            visualPrompt: 'Greasy, moldy kitchen. Deep sink filled with rust-stained water. Humming industrial freezer covered in thick red frost. Elongated wet footprints leading from freezer into shadows.',
            isDangerous: 8,
            items: [
                {
                    id: 'high_purity_oil',
                    name: '高级橄榄油',
                    desc: '富豪特供的奢侈食材，如今用作燃料都显浪费。',
                    type: 'material',
                    size: [1, 1],
                    grade: 'standard',
                    discoveryThreshold: 15
                }
            ],
            interactions: [
                {
                    desc: '打开嗡嗡作响的冰柜',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative: '沉重的冰柜门开启，冷雾散去后，你看见内部整齐码放着医用器官冷藏盒。最底层的几个盒子破开了大洞，内壁上是从内部猛力抓挠留下的道道血痕，残留着仍在蠕动的黑色粘液。你瞬间明白了那串怪异脚印的来历——有什么东西在这里完成了孵化，并且在夜里还会回来。',
                        stateChange: { sanity: -5 }
                    }
                }
            ]
        },
        gift_shop: {
            name: '礼品店',
            desc: '玻璃橱窗被砸得粉碎，货架上的商品被洗劫一空。满地散落着被踩踏的毛绒玩具——它们碎裂的纽扣眼似乎一直在追随着你的步伐移动。几只被撕裂的泰迪熊体内翻露出的不是棉花，而是脉动着的、温热湿润的灰白色纤维体。若长时间驻留，你甚至会产生收银台上的八音盒在自行奏出扭曲走调的摇篮曲的错觉。',
            visualPrompt: 'Looted gift shop. Broken glass glinting on floor. Scattered teddy bears whose button eyes seem to track movement. Alien fibrous material pulsating from torn toy seams.',
            isDangerous: 7,
            interactions: [
                {
                    desc: '捡起毛绒玩具',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative: '你的手指刚触碰到一只孤零零的泰迪熊，它的纽扣眼便猛然崩裂，温热的黑色粘液喷溅上手背。同一瞬间，一阵稚嫩又扭曲的哭喊声毫无来源地在你脑内炸响。玩具的头部——以一种没有骨骼能实现的角度——缓缓歪向一边，裂开的缝线里，肌肉正在蠕动成形。',
                        stateChange: {
                            sanity: -8,
                            spawnEnemy: [
                                {
                                    type: 'cthulhu',
                                    id: 'flesh_teddy',
                                    name: '血肉畸变熊',
                                    range: 1,
                                    gender: 'both',
                                    desc: '一具被高维寄生体重塑的毛绒玩具，内部填充的不再是棉花，而是嗜血的活性肌体与锐利的骨刺。',
                                    visualPrompt: 'A horrifying teddy bear bursting with visceral, pulsating flesh and bone spikes instead of stuffing.',
                                    speed: 14,
                                    damage: 10,
                                    evasion: 12,
                                    defense: 4,
                                    intentDistribution: { attack: 80, defense: 0, buff: 10, debuff: 10, observe: 0 },
                                    lootTable: [
                                        {
                                            id: 'infected_cotton',
                                            name: '异化棉絮',
                                            desc: '沾染粘液的填充物，或许可作引火材料。',
                                            type: 'material',
                                            size: [1, 1],
                                            grade: 'standard',
                                            dropProbability: 0.8
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                }
            ]
        },
        security_office: {
            name: '保安室',
            desc: '一整面墙的监控屏幕大多闪烁着无信号的雪花噪点。防爆枪柜被暴力撬开，只剩下空荡荡的挂架。排班表上的所有名字都被人用红色记号笔一道一道地涂死，像是在进行什么残忍的仪式。一台老旧录像机的卡槽里，仍插着一盘带有新鲜指纹的血迹斑斑的磁带。',
            visualPrompt: 'Security room with wall of CRT monitors showing static. Empty gun cabinet pried open. Duty roster with all names violently crossed out in red ink. Old VCR with bloodstained tape inserted.',
            isDangerous: 5,
            items: [
                {
                    id: 'battery_starter',
                    name: '监控备用电源',
                    desc: '沉重的工业级外设电池，电量尚足。',
                    type: 'consumable',
                    size: [1, 1],
                    grade: 'standard',
                    effects: [['battery', 40]],
                    discoveryThreshold: 10
                }
            ],
            interactions: [
                {
                    desc: '回放残存录像',
                    results: {
                        timeCost: 5,
                        soundEffect: 'error',
                        narrative: '满是雪花的画面勉强播放。镜头中，几名身着纯黑制服的人员推着沉重的密封活体箱，从容地走进三楼手术区。其中一人在通过镜头前时竟停顿下来，对着监控报以缓慢而明确的冷笑。紧接着，画面扭曲成漩涡状的血肉纹理，一声非人的尖啸彻底烧毁了设备的音频系统。',
                        stateChange: { sanity: -8 }
                    }
                }
            ]
        },
        emergency_room: {
            name: '急诊留观区',
            desc: '刺鼻的工业级防腐剂也掩盖不住扑面而来的腐败甜味。几名病患的身体已经与金属病床发生了不可逆转的深度融合——骨骼与钢管共生，肌肉与床板交织。他们无法出声，但那些仍在跳动的监护仪屏幕上，正勾勒出不可能存活的疯狂波形。',
            visualPrompt: 'Chaotic emergency room. Patients whose flesh has anomalously fused with steel beds into single organic-mechanical entities. Heart monitors beeping impossible geometric waveforms. Pervasive body horror.',
            isDangerous: 14,
            items: [
                {
                    id: 'bandage',
                    name: '绷带',
                    desc: '标准的军用止血绷带。',
                    type: 'consumable',
                    size: [1, 1],
                    grade: 'standard',
                    effects: [['hp', 20]],
                    quantity: 1,
                    discoveryThreshold: 5
                },
                {
                    id: 'rusty_scalpel',
                    name: '生锈的手术刀',
                    desc: '勉强还能用来防身。',
                    type: 'weapon',
                    size: [2, 1],
                    grade: 'standard',
                    weaponType: 'prick',
                    weaponDamageType: 'melee',
                    range: 1,
                    damage: 5,
                    crit: {
                        chance: 0.08,
                        bonus: 3
                    },
                    maxUses: 10,
                    discoveryThreshold: 10
                }
            ],
            childrenIds: ['ambulance_bay'],
            interactions: [
                {
                    desc: '检查融合病人',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative: '你走近其中一位半人半床的受害者，那双尚存的人类眼珠忽然开始疯狂乱转，口中涌出带血的气泡。你看见他的脊椎骨已毫无缝隙地融入了床架钢管，神经与金属间爬满了纤维状的肉芽组织。他已不再是人类，而是一具超出碳基逻辑的活体标本。',
                        stateChange: { sanity: -10 }
                    }
                }
            ]
        },
        ambulance_bay: {
            name: '救护车库',
            desc: '卷帘门被从内侧用厚重的钢梁彻底焊死。车库正中央的地面上，一大片爆炸冲击波形的放射状血迹仍清晰可辨——中心是烧灼出的深坑。血肉残骸的边缘，几块散发紫光的晶状碎片正发出细微的嘶嘶声缓慢溶解在血泊中。',
            visualPrompt: 'Dark, sealed garage. Welded steel beams across door. Bloodstain with visible explosion crater at center. Scattered purple crystalline fragments dissolving with faint hiss. Dismantled ambulance in corner.',
            isDangerous: 10,
            items: [
                {
                    id: 'scrap_parts',
                    name: '废旧零件',
                    desc: '拆卸救护车留下的五金构件。',
                    type: 'material',
                    size: [1, 1],
                    grade: 'standard',
                    quantity: 2,
                    discoveryThreshold: 10
                },
                {
                    id: 'heavy_pipe_wrench',
                    name: '重型管钳',
                    desc: '沉重粗钝的工业级打击工具。',
                    type: 'weapon',
                    size: [2, 1],
                    grade: 'standard',
                    weaponType: 'wave',
                    weaponDamageType: 'melee',
                    range: 1,
                    damage: 8,
                    crit: {
                        chance: 0.08,
                        bonus: 4
                    },
                    maxUses: 15,
                    discoveryThreshold: 15
                }
            ],
            interactions: [
                {
                    desc: '检查爆炸痕迹',
                    results: {
                        timeCost: 5,
                        soundEffect: 'success',
                        narrative: '简易爆炸装置的零件残骸散落一地，揭示了这里曾发生过一场惨烈的绝命反击。在烧焦的血肉中，一截长满锯齿吸盘的紫色触须残肢仍在神经反射般地蠕动——用炸药去阻止它，仅仅是激怒了它而已。'
                    }
                }
            ]
        },
        radiology_room: {
            name: '放射科',
            desc: 'X光胶片冲洗室的红色安全灯仍在幽幽闪烁，四周墙壁上挂满尚未冲洗的胶片盘。角落那台老式X光机的荧光屏兀自亮着，泛着病态的青绿色光芒。屏幕上显示着一副人类骨骼影像——却拥有七根锁骨、十八节颈椎，以及一套长满倒刺的折叠式胸腔。影像右下角，自动打出一行字："当前受检者：档案缺失。受检者已离席。"',
            visualPrompt: 'Dark radiology room bathed in red safelight. Developing tanks and hanging film strips. Ancient X-ray machine screen glowing sickly green, displaying impossible human skeleton with seven collarbones.',
            isDangerous: 12,
            items: [
                {
                    id: 'xray_film',
                    name: '异常X光胶片',
                    desc: '拍出不可能骨骼结构的胶片，边缘泛着病态的紫光。',
                    type: 'data',
                    size: [1, 1],
                    grade: 'military',
                    discoveryThreshold: 10,
                    documentContent: 'X光检查记录 - 未知编号\n\n受检者：无（扫描室当时无人）\n影像所见：胸腔内出现多组对称性眼球结构；颅腔内存在第二套完整颌骨；脊柱末端分叉为三支。\n附注：胶片显影后仍在持续生长，画面边缘已出现新增的骨骼轮廓。'
                }
            ],
            interactions: [
                {
                    desc: '查看荧光屏',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative: '你凑近荧光屏，那组不可能的骨骼影像忽然开始逐帧重组——第二套颌骨缓缓张开，咬合处盛满细密的牙齿。下一秒，屏幕上整组影像齐刷刷扭曲成一个人形：肩膀的位置，正站着扫描仪前的你。',
                        stateChange: { sanity: -10 }
                    }
                }
            ]
        },
        pharmacy_outpatient: {
            name: '门诊药房',
            desc: '玻璃柜台后方的药架被洗劫一空，只剩下零散的空瓶与碎玻璃。但台面下的应急药箱仍紧锁着，锁扣上贴着堪萨斯式的螺旋封条。满地散落着上百张处方笺，全部签给同一个人，病名一栏却反复写着同一个词："███████"。',
            visualPrompt: 'Looted outpatient pharmacy. Empty shelves and broken glass. Locked emergency medical kit with spiral seal intact. Hundreds of scattered prescriptions all for the same patient with a blacked-out diagnosis.',
            isDangerous: 8,
            items: [
                {
                    id: 'antibiotic_vial',
                    name: '抗生素',
                    desc: '急救药箱中仅存的一支静注抗生素，包装完好。',
                    type: 'consumable',
                    size: [1, 1],
                    grade: 'military',
                    effects: [['hp', 30]],
                    discoveryThreshold: 10
                },
                {
                    id: 'sterile_saline',
                    name: '无菌生理盐水',
                    desc: '未开封的静脉输液袋。',
                    type: 'consumable',
                    size: [1, 1],
                    grade: 'standard',
                    effects: [['hp', 15]],
                    discoveryThreshold: 5
                }
            ],
            interactions: [
                {
                    desc: '检查处方笺',
                    results: {
                        timeCost: 5,
                        soundEffect: 'ui_click',
                        narrative: '所有处方笺的字迹却出自同一人，日期横跨灾变前的整整半年。最初的诊断是"慢性失眠"，此后每翻一页，诊断就变得愈发疯狂——"梦见天花板"、"梦见骨骼"、"梦见自己正在被梦见"。最后一页的诊断栏被反复描黑，用力到划破了纸面。',
                        stateChange: { sanity: -7 }
                    }
                }
            ]
        },
        corridor_f1_hall: {
            name: '后勤走廊',
            desc: '幽长走廊的瓷砖大面积剥落，满地是湿滑霉变的碎屑。几条令人作呕的血污拖拽痕迹从远处延伸而来，消失在前方无光的绝对黑暗中。两侧墙壁上，层叠的疯狂涂鸦在激烈地辩论：是上楼搜寻食物，还是原地等待死亡。随着脚步深入，配电箱爆出的电火花偶尔会照亮走廊尽头——那里似乎总有一尊巨大扭曲的非人剪影正贴在墙上观察着你。',
            visualPrompt: 'Narrow service corridor. Fallen tiles exposing black mold. Wide drag marks on floor leading into pitch darkness. Flickering fluorescent lights. Layered, desperate graffiti covering walls.',
            isDangerous: 10,
            exits: [
                { targetId: 'stairwell_f1', label: '前往楼梯间', type: 'local' },
                { targetId: 'corridor_f1_lobby', label: '返回大厅', type: 'local' }
            ]
        },
        /**
         * F2 住院部 - 秩序的最后堡垒
         */
        corridor_f2_east: {
            name: '住院部东走廊',
            desc: '病床、仪器柜、办公桌被层层堆叠，筑成一座压抑的迷宫防线。幸存者们在其中如幽灵般无声穿行，每一双眼睛都写满戒备与恐惧。墙上贴满严苛到不近人情的隔离守则与异常行为举报制度。浓烈的消毒水气味试图压下空气中无处不在的血腥与腐朽——但失败了。走廊灯光骤然频闪时，映在墙上的倒影动作甚至会出现半秒的骇人滞后。',
            visualPrompt: 'Corridor converted into maze of bed barricades. Tense survivors moving cautiously under UV inspection lamps. Hand-written quarantine rules posted everywhere. Cloying smell of disinfectant.',
            isDangerous: 5,
            childrenIds: [
                'room_201',
                'room_202',
                'vip_ward',
                'room_203',
                'nurse_station',
                'doctors_lounge',
                'room_204',
                'sterilization_room'
            ],
            exits: [{ targetId: 'stairwell_f2', label: '返回楼梯口', type: 'local' }]
        },
        room_201: {
            name: '201号病房',
            desc: '你最初醒来的地方——冰冷，但暂时安全。木板封死的窗缝中渗入外界如凝血般的暗红天光，将室内的一切都染上了锈色。墙皮剥落处露出密密麻麻的记数抓痕，记录着某个前任住客漫长的绝望等待。床边墙上钉着一张早已过期的医院清退通知，在这末日中显得荒诞而讽刺。',
            visualPrompt: 'Decaying hospital room. Concrete walls covered in fingernail scratch marks used to count days. Army cot. Boarded window with eerie red light bleeding through. Broken mirror in corner reflecting fragmented self.',
            items: [
                {
                    id: 'sedative_starter',
                    name: '镇静剂',
                    desc: '能暂时稳住崩解理智的强效药物。',
                    type: 'consumable',
                    size: [1, 1],
                    grade: 'military',
                    effects: [['sanity', 30]],
                    discoveryThreshold: 5
                },
                {
                    id: 'eviction_notice',
                    name: '清退通知',
                    desc: '一张发黄皱褶的病历附页。',
                    type: 'data',
                    size: [1, 1],
                    grade: 'standard',
                    discoveryThreshold: 5,
                    documentContent: '清退通知\n\n本院将于10月31日无限期停运，以进行特殊科研项目改造。\n请所有非必要人员在限期前自行撤离。\n给您带来不便，深表歉意。\n\n（底下有人用铅笔草草批注：别问，快跑。就今晚。——某知情护士）'
                }
            ],
            interactions: [
                {
                    desc: '检查床头柜',
                    results: {
                        timeCost: 5,
                        soundEffect: 'item_pickup',
                        narrative: '你拉开锈迹斑斑的抽屉，里面躺着一张全家福照片。所有面孔都被用黑色记号笔仔细地涂抹掉了。背面写着一行小字："忘记他们，是最好的解脱。"'
                    }
                },
                {
                    desc: '拿起便签',
                    results: {
                        timeCost: 5,
                        soundEffect: 'item_pickup',
                        narrative: '床头柜上压着一张折叠整齐的便签，纸面干净——是不久前才放在这里的。字迹疲惫但稳定：\n\n"你醒了？能走动就来 F2 护士站找我。不要碰三楼的东西。——E."\n\n便签背面还潦草补充了一行："如果看到 203 的莉安娜……告诉她我明天去查房。"'
                    }
                }
            ]
        },
        room_202: {
            name: '202号病房',
            desc: '一扇被损坏的木门虚掩着，里面是勉强维持整洁的狭小病房。一名神情极度疲惫的中年男人坐在吱嘎作响的病床边沿，布满血丝的双眼死死盯着手中那张褶皱发黄的照片。',
            visualPrompt: 'A quiet, dimly lit hospital room. A man in soiled overalls sits still on a plain bed, clutching a crumpled photograph. Dust motes float in slivers of red light.',
            nodeNpc: {
                id: 'survivor_leon',
                name: '利昂',
                gender: 'male',
                desc: '曾是这座医院的机修工。异变爆发时侥幸躲在机房深处逃过第一波收割。如今他攥着失踪女儿唯一留下的照片，在极度的自责与绝望的缝隙间，苦等一个永远不会到来的奇迹。偶尔他会提起"楼上的护士长"——语气里有感激，也有不敢直视的愧疚：艾拉拉曾借给他镇静剂，而他没能修好 B1 的发电机回报她。',
                visualPrompt: 'A weary middle-aged man in dirty technician overalls, sitting motionless on a bed, staring at an old photo with profound, hollow sadness.',
                style: 'defense',
                initialState: {
                    attribute: { strength: 14, agility: 10, wisdom: 12, awareness: 12, will: 10, cthulhu: 2 },
                    vital: { maxHp: 150, maxSanity: 85, maxStamina: 130, maxVigor: 110 },
                    equipState: {
                        weapons: {
                            main: {
                                id: 'pipe_wrench',
                                instanceId: 'inst_leon_w_1',
                                name: '管钳',
                                desc: '沉重的防身工具，握柄已被汗水浸得光滑。',
                                type: 'weapon',
                                size: [2, 1],
                                grade: 'standard',
                                weaponType: 'wave',
                                weaponDamageType: 'melee',
                                range: 1,
                                damage: 8,
                                crit: {
                                    chance: 0.08,
                                    bonus: 4
                                },
                                maxUses: 15,
                                currentUses: 15
                            },
                            side: null
                        },
                    },
                    trust: 20,
                    quests: [
                        {
                            id: '寻找女儿的线索',
                            desc: '帮利昂寻找失踪女儿的线索。他听说有人在一楼的礼品店附近见过一个抱着玩具熊的小女孩身影。请带回任何能证明她下落的物品。',
                            goals: [
                                {
                                    id: 'infected_cotton',
                                    name: '异化棉絮',
                                    desc: '沾染粘液的填充物。',
                                    type: 'material',
                                    size: [1, 1],
                                    grade: 'standard'
                                }
                            ],
                            rewards: [
                                {
                                    id: 'lucky_coin',
                                    name: '幸运硬币',
                                    desc: '利昂贴身携带的旧硬币，承载着微弱的祝福。',
                                    type: 'accessory',
                                    size: [1, 1],
                                    grade: 'military',
                                    effects: [['maxSanity', 15]]
                                }
                            ],
                            difficulty: 2
                        }
                    ]
                }
            }
        },
        vip_ward: {
            name: 'VIP特护病房',
            desc: '真皮沙发与墙上歪斜的复刻名画，同满地喷溅的污血形成了刺眼的讽刺。一具极其肥胖的富豪尸体仰面倒在成堆的进口鱼子酱罐头中，脑袋像一颗熟透的果实般从内部爆开，脑组织飞溅至水晶吊灯半凝固的蜡泪之间。财富，在这里只为他买到了更狰狞的死法。',
            visualPrompt: 'Luxurious hospital suite brutally violated. Fat corpse with exploded head amidst expensive caviar cans. Brain matter dripping from crystal chandelier. Stark contrast of opulence and grotesque death.',
            isDangerous: 8,
            items: [
                {
                    id: 'luxury_caviar',
                    name: '高级鱼子酱',
                    desc: '密封完好的顶级鱼子酱，高热量且极其稀有。',
                    type: 'consumable',
                    size: [1, 1],
                    grade: 'corporate',
                    effects: [['hp', 30]],
                    quantity: 2,
                    discoveryThreshold: 10
                },
                {
                    id: 'donation_receipt',
                    name: '巨额捐赠收据',
                    desc: '印有螺旋深渊基金会抬头的高级证券纸。',
                    type: 'data',
                    size: [1, 1],
                    grade: 'standard',
                    discoveryThreshold: 15,
                    documentContent: '机密捐赠协议副本\n\n受款方：圣伊丽莎白项目组\n金额：$50,000,000（USD）\n事由：阿斯克勒庇俄斯计划 · 三期人体实验阶段\n\n捐赠方附加利益：已确认获得"方舟"号末日生存舱登船资格。\n批注（手写，酒渍）：钱打过来了。但这些人从一开始就没打算让我们活着离开手术室。——院长'
                }
            ],
            interactions: [
                {
                    desc: '搜查保险箱',
                    results: {
                        timeCost: 5,
                        soundEffect: 'ui_click',
                        narrative: '被暴力撬开的保险箱里空空如也，只剩一张仓促留下的纸条。上面的笔迹因恐惧而颤抖："亲爱的，你太重了，直升机载不下我们一家人。我带孩子们和钱先走了。"——末日下的爱，原来如此脆弱。'
                    }
                }
            ]
        },
        room_203: {
            name: '203号病房',
            desc: '这间病房的每一寸墙面与天花板都贴满了用蜡笔、马克笔、乃至指甲刻出的异星几何图形——令人发狂的无限递归与错误透视。一名年轻的女护士蜷缩在墙角，双臂死死抱住一只医疗急救箱，仿佛那是她在这崩溃世界里唯一确定的东西。桌上翻倒着十多个被清空的强效镇静药瓶。',
            visualPrompt: 'Hospital room covered obsessively in hand-drawn alien geometry on every surface. Young nurse curled in corner clutching medical kit, eyes unfocused. Empty sedative vials scattered around.',
            nodeNpc: {
                id: 'young_nurse',
                name: '莉安娜',
                gender: 'female',
                desc: '瞳孔涣散，精神已摇摆在彻底崩溃的悬崖边缘。她在三楼手术室无意间窥见了失控实验体的逃脱过程——更可怕的是，那个畸形之物转过无数复眼，用她死去祖母的声音，呼唤了她隐秘的童年乳名。她用掉了自己全部的镇静剂储备，却不敢去护士站告诉艾拉拉——她害怕护士长会发现她已经不适合再穿上那身制服。',
                visualPrompt: 'A young nurse with wide, unfocused eyes of pure terror, surrounded by obsessive drawings of alien, impossible patterns on every surface.',
                style: 'balance',
                initialState: {
                    attribute: { strength: 8, agility: 12, wisdom: 16, awareness: 14, will: 12, cthulhu: 3 },
                    vital: { maxHp: 80, maxSanity: 50, maxStamina: 90, maxVigor: 70 },
                    inventory: [
                        {
                            id: 'bandage',
                            name: '绷带',
                            desc: '医用绷带。',
                            type: 'consumable',
                            size: [1, 1],
                            grade: 'standard',
                            effects: [['hp', 20]]
                        }
                    ],
                    equipState: { weapons: { main: null, side: null }, armors: [], accessories: [] },
                    trust: 40,
                    quests: [
                        {
                            id: '绝望的镇静',
                            desc: '莉安娜的精神频临崩溃，急需强效镇静剂。可以在其他病房或医生休息室找找。',
                            goals: [
                                {
                                    id: 'sedative_starter',
                                    name: '镇静剂',
                                    desc: '能暂时稳住崩解理智的强效药物。',
                                    type: 'consumable',
                                    size: [1, 1],
                                    grade: 'military',
                                    effects: [['sanity', 30]]
                                }
                            ],
                            rewards: [
                                {
                                    id: 'medical_kit_storage',
                                    name: '医疗急救箱',
                                    desc: '顶级配置的综合急救箱，能挽救濒死生命。',
                                    type: 'consumable',
                                    size: [1, 1],
                                    grade: 'corporate',
                                    effects: [['hp', 100]]
                                }
                            ],
                            difficulty: 1
                        }
                    ]
                }
            },
            items: [
                {
                    id: 'sedative_starter',
                    name: '镇静剂',
                    desc: '标准精神稳定剂。',
                    type: 'consumable',
                    size: [1, 1],
                    grade: 'military',
                    effects: [['sanity', 30]],
                    quantity: 2,
                    discoveryThreshold: 5
                }
            ]
        },
        nurse_station: {
            name: '护士站',
            desc: '这里已被改为严密的临时指挥中心，负责协调整座医院三十二名幸存者的生存运转。白板上用血色马克笔画着触目惊心的物资告急趋势线。闪烁着锁定红灯的药品柜装上了重重大锁。摊开的工作日志里，记录着护士长从维持理智秩序一步步走向崩溃绝望的心路，以及那些不得不亲手处决融合变异病患的沉重抉择。',
            visualPrompt: 'Makeshift command post. Whiteboard tracking dwindling supplies and increasing anomalies with red downward curves. Locked medicine cabinet with blinking alarm. Open work journal revealing impossible decisions.',
            nodeNpc: {
                id: 'elara_head_nurse',
                name: '艾拉拉',
                gender: 'female',
                desc: '圣伊丽莎白医院的护士长，三十七岁。在「那个」降临前几个月，医院就已经开始了不明原因的关停程序。她是最后一批留守人员，负责将重症病人转院。但转院车再也没有来。看着窗外的世界从秩序坍塌为混沌，她做出了决定——用仅剩的药品和物资加固医院，保护这些被整个世界遗弃的人。在「那个」降临后的第三天，一个浑身是血的「调查员」敲开了气密室的门。她收留了他。现在，他们似乎是这座医院里仅存的清醒者。她的眼神疲惫而冷静，在昏暗的应急灯光下扫视着每一个接近护士站的身影。指尖悬在检伤腕表上方，随时准备为下一个伤员分配优先级——即便这座医院已不再接收任何病人。',
                visualPrompt: 'An exhausted female nurse in her late 30s with tired eyes and messy brown hair tied in a loose bun, wearing worn blood-stained medical scrubs layered with a makeshift tactical vest made from hospital supplies, intricate cybernetic neural ports visible on her neck, holding a glowing sci-fi medical scanner, emergency red lights casting dramatic shadows, hospital corridor backdrop with quarantine tape and flickering lights, gritty survival horror atmosphere, high detail.',
                style: 'balance',
                initialState: {
                    attribute: { strength: 8, agility: 16, wisdom: 24, awareness: 20, will: 0, cthulhu: 12 },
                    vital: { maxHp: 100, maxSanity: 220, maxStamina: 125, maxVigor: 165 },
                    inventory: [
                        {
                            id: 'medical_kit',
                            name: '医疗包',
                            desc: '专业的急救套件，包含绷带、消毒液和止痛药。',
                            type: 'consumable',
                            size: [1, 1],
                            grade: 'military',
                            effects: [['hp', 60]]
                        },
                        {
                            id: 'bandage',
                            name: '急救绷带',
                            desc: '简单的止血用品。恢复 HP。',
                            type: 'consumable',
                            size: [1, 1],
                            grade: 'standard',
                            effects: [['hp', 25]]
                        },
                        {
                            id: 'adrenaline_shot',
                            name: '肾上腺素注射器',
                            desc: '紧急情况下使用。暂时提升战斗能力，并恢复少量体力与精力。',
                            type: 'consumable',
                            size: [1, 1],
                            grade: 'military',
                            effects: [
                                ['strength', 5, 3],
                                ['agility', 5, 3],
                                ['stamina', 20],
                                ['vigor', 15]
                            ]
                        },
                        {
                            id: 'sedative_starter',
                            name: '强效镇静剂',
                            desc: '来自过去的处方药。大幅恢复理智。',
                            type: 'consumable',
                            size: [1, 1],
                            grade: 'military',
                            effects: [['sanity', 50]]
                        }
                    ],
                    uniqueTactic: [
                        {
                            type: 'D',
                            id: 'nurse_triage',
                            name: '检伤分类',
                            desc: '快速评估战场态势，提升所有友方单位的感知与判断。',
                            apCost: 1,
                            tacticEffect: [
                                ['all_allies', 'awareness', 2, 0],
                                ['all_allies', 'wisdom', 1, 0]
                            ]
                        },
                        {
                            type: 'D',
                            id: 'nurse_steady_hands',
                            name: '稳定手法',
                            desc: '调整呼吸与操作节奏，短暂提升自身医学判断与处置精度。',
                            apCost: 1,
                            tacticEffect: [
                                ['self', 'wisdom', 2, 0],
                                ['self', 'awareness', 1, 0]
                            ]
                        },
                        {
                            type: 'D',
                            id: 'nurse_field_suture',
                            name: '战场缝合',
                            desc: '为单个友方进行紧急止血与伤势稳定，恢复少量生命并缓解其体力消耗。',
                            apCost: 2,
                            tacticEffect: [
                                ['single_ally', 'hp', 25, 0],
                                ['single_ally', 'stamina', 10, 0]
                            ]
                        },
                        {
                            type: 'A',
                            id: 'nurse_surgical_strike',
                            name: '外科切口',
                            desc: '以手术刀精确攻击敌方薄弱处，削弱其力量与感知，持续 2 回合。',
                            apCost: 2,
                            requireWeapon: 'prick',
                            tacticEffect: [
                                ['single_enemy', 'strength', -2, 2],
                                ['single_enemy', 'awareness', -2, 2]
                            ]
                        }
                    ],
                    equipState: {
                        weapons: {
                            main: {
                                id: 'rusty_scalpel',
                                instanceId: 'inst_elara_w_1',
                                name: '生锈手术刀',
                                desc: '从废物桶里找到的。虽然生锈了，但依然锋利。',
                                type: 'weapon',
                                size: [2, 1],
                                grade: 'standard',
                                weaponType: 'prick',
                                weaponDamageType: 'melee',
                                range: 1,
                                damage: 5,
                                crit: {
                                    chance: 0.08,
                                    bonus: 3
                                },
                                maxUses: 8,
                                currentUses: 8
                            },
                            side: null
                        },
                        armors: [
                            {
                                id: 'makeshift_medical_vest',
                                instanceId: 'inst_elara_a_1',
                                name: '简易防护背心',
                                desc: '用医院物资拼凑的防护背心，能挡住一些抓挠与飞溅物。',
                                type: 'armor',
                                size: [2, 2],
                                grade: 'standard',
                                defense: 0.08,
                                maxUses: 25,
                                currentUses: 25
                            }
                        ],
                        accessories: [
                            {
                                id: 'triage_watch',
                                instanceId: 'inst_elara_acc_1',
                                name: '检伤腕表',
                                desc: '旧式生命体征监测腕表，能帮助你更快判断伤情。',
                                type: 'accessory',
                                size: [1, 1],
                                grade: 'standard',
                                effects: [
                                    ['awareness', 1],
                                    ['wisdom', 1]
                                ]
                            }
                        ]
                    },
                    trust: 50,
                    quests: [
                        {
                            id: '检伤分类',
                            desc: '玩家第一次抵达护士站时，艾拉拉正在处理 F2 的伤员。她缺的不是拯救世界的大计划，而是绷带、净水、镇静剂——让护士站重新运转的基础物资。',
                            goals: [
                                {
                                    id: 'bandage',
                                    name: '绷带',
                                    desc: '标准的止血用品。急诊留观区应该还有存货。',
                                    type: 'consumable',
                                    size: [1, 1],
                                    grade: 'standard',
                                    effects: [['hp', 20]]
                                },
                                {
                                    id: 'pure_water',
                                    name: '纯净水',
                                    desc: '未受污染的瓶装水。员工食堂的配给仓库里或许还有几瓶。',
                                    type: 'consumable',
                                    size: [1, 1],
                                    grade: 'standard',
                                    effects: [
                                        ['hp', 5],
                                        ['sanity', 10]
                                    ]
                                },
                                {
                                    id: 'sedative_starter',
                                    name: '镇静剂',
                                    desc: '标准精神稳定剂。201 病房、医生休息室或 203 病房都能找到。',
                                    type: 'consumable',
                                    size: [1, 1],
                                    grade: 'military',
                                    effects: [['sanity', 30]]
                                }
                            ],
                            rewards: [
                                {
                                    id: 'medical_kit',
                                    name: '医疗包',
                                    desc: '专业的急救套件，艾拉拉从私人储备中分出一份。',
                                    type: 'consumable',
                                    size: [1, 1],
                                    grade: 'military',
                                    effects: [['hp', 60]]
                                },
                                {
                                    id: 'basic_toolkit',
                                    name: '维修工具',
                                    desc: '一套耐用的通用五金维修套件。艾拉拉说这是为之后"药品柜的事"准备的。',
                                    type: 'material',
                                    size: [1, 1],
                                    grade: 'standard'
                                }
                            ],
                            difficulty: 1
                        },
                        {
                            id: '药品管制协议',
                            desc: '护士站的药品柜不止是上了锁——它被基金会的电子协议接管了。普通密码只能打开应急药层，真正的深层药品、冷链柜、储藏室权限被完全锁死。艾拉拉需要更高权限。她在焚烧室的防化服堆里见过一张黑色磁卡——没人敢回去拿。',
                            goals: [
                                {
                                    id: 'key_staff_card_org',
                                    name: '组织通行证',
                                    desc: '印有螺旋标志的黑色磁卡。藏在 B1 焚化室的防化服堆中。',
                                    type: 'material',
                                    size: [1, 1],
                                    grade: 'military'
                                },
                                {
                                    id: 'scrap_parts',
                                    name: '废旧零件',
                                    desc: '可再利用的金属与电子元件。发电机房、救护车库或电休克治疗室都能找到。',
                                    type: 'material',
                                    size: [1, 1],
                                    grade: 'standard'
                                }
                            ],
                            rewards: [
                                {
                                    id: 'medical_kit_storage',
                                    name: '医疗急救箱',
                                    desc: '药品储藏室深处找到的顶级急救配置，能挽救濒死生命。',
                                    type: 'consumable',
                                    size: [1, 1],
                                    grade: 'corporate',
                                    effects: [['hp', 100]]
                                },
                                {
                                    id: 'sedative_starter',
                                    name: '强效镇静剂',
                                    desc: '药品柜深层取出的高纯度镇静剂，比散落在病房的普通版本强得多。',
                                    type: 'consumable',
                                    size: [1, 1],
                                    grade: 'military',
                                    effects: [['sanity', 50]]
                                }
                            ],
                            difficulty: 4
                        },
                        {
                            id: '三楼封锁令',
                            desc: '艾拉拉一直知道三楼不正常。被送上去的病人没有再下来，逃出来的莉安娜精神崩溃，异常药品和黑色粘液从楼梯缝渗出。她需要证据来判断：三楼到底是感染区、实验区，还是某种"已经不能称为医院"的东西。如果能带回手术记录和实体样本，她就能决定——是永久封锁，还是彻底清除污染源头。',
                            goals: [
                                {
                                    id: 'surgeon_note',
                                    name: '手术记录残页',
                                    desc: '匆忙拼凑的机密文件。藏于三楼洗手间的镜子碎片间。',
                                    type: 'data',
                                    size: [1, 1],
                                    grade: 'standard',
                                    documentContent: '手术记录 - AK-0091号实验\n\n向受试者基底核注入「星神提取物」两分钟后，脊柱开始自主暴长，增生的脊椎骨刺穿背部皮肤形成外骨骼。五分钟后，受试者的影子脱离物理躯体，开始在房间内独立游走。\n警告：提取物并非无机物，而是具备侵略意识的寄生体。它正在利用我们的身体作为殖民基地！'
                                },
                                {
                                    id: 'abyss_crystal',
                                    name: '深渊结晶',
                                    desc: '高维能量的凝结物，散发不祥紫光。仅能从第一手术室的实验体-零号体内取得。',
                                    type: 'material',
                                    size: [1, 1],
                                    grade: 'corporate'
                                }
                            ],
                            rewards: [
                                {
                                    id: 'lucid_elixir',
                                    name: '清醒药剂',
                                    desc: '能将理智强力拉回现实界限的禁忌药物。艾拉拉用医院最后的珍惜原料为你配制。',
                                    type: 'consumable',
                                    size: [1, 1],
                                    grade: 'corporate',
                                    effects: [['sanity', 100]]
                                },
                                {
                                    id: 'triage_watch',
                                    name: '检伤腕表',
                                    desc: '旧式生命体征监测腕表。艾拉拉亲手校准后交给了你——这是她作为护士长最后的装备。',
                                    type: 'accessory',
                                    size: [1, 1],
                                    grade: 'military',
                                    effects: [
                                        ['awareness', 2],
                                        ['wisdom', 2],
                                        ['maxSanity', 15]
                                    ]
                                }
                            ],
                            difficulty: 7
                        },
                        {
                            id: '冷链协议',
                            desc: '医院里还有一些必须低温保存的药品、疫苗与镇静剂原料。如果 B1 发电机彻底停机，这些资源将全部失效。艾拉拉需要你维持供电系统——这不仅是为了药品，也是为了神经链接仪的持续运转。',
                            goals: [
                                {
                                    id: 'spare_battery',
                                    name: '备用电池',
                                    desc: '标准外设能源块，仍有大半电量。发电机房里应该能找到。',
                                    type: 'consumable',
                                    size: [1, 1],
                                    grade: 'standard',
                                    effects: [['battery', 50]]
                                },
                                {
                                    id: 'fuel_canister',
                                    name: '燃料罐',
                                    desc: '半满的柴油罐。发电机房的角落里散落着几罐。',
                                    type: 'material',
                                    size: [1, 1],
                                    grade: 'standard'
                                }
                            ],
                            rewards: [
                                {
                                    id: 'battery_starter',
                                    name: '监控备用电源',
                                    desc: '艾拉拉调配出的工业级电池组，可用于维护神经链接仪。',
                                    type: 'consumable',
                                    size: [1, 1],
                                    grade: 'standard',
                                    effects: [['battery', 40]]
                                }
                            ],
                            difficulty: 2
                        }
                    ]
                },
                canBeInvited: {
                    trust: 100,
                    questsArchived: ['检伤分类', '药品管制协议', '三楼封锁令'],
                    replacement: [
                        {
                            duty: '医疗代理',
                            desc: '接替护士站的药品分拣、伤员护理与异常体征初筛。需要足够的医学判断力与在高侵蚀环境中保持清醒的精神韧性。',
                            attributes: { wisdom: 18, awareness: 16 },
                            vitals: { maxSanity: 120 }
                        },
                        {
                            duty: '设施代理',
                            desc: '维持护士站的基本运转——电力监控、门禁巡检与物资守卫。虽然医疗判断能力有限，但能守住物理安全底线。',
                            attributes: { awareness: 14 },
                            vitals: { maxSanity: 100 }
                        }
                    ],
                    isSanctuarySafe: { medicine: 30 }
                },
                willRoam: {
                    speed: 30,
                    route: [
                        'room_201',
                        'room_202',
                        'room_203',
                        'doctors_lounge'
                    ]
                }
            },
            items: [
                {
                    id: 'key_staff_card',
                    name: '污损门禁卡',
                    desc: '照片部分被指甲刮烂的电子门卡。',
                    type: 'material',
                    size: [1, 1],
                    grade: 'military',
                    discoveryThreshold: 15
                }
            ],
            childrenIds: ['med_storage'],
            interactions: [
                {
                    desc: '解锁药品储藏室',
                    requirements: {
                        puzzleSolved: {
                            title: '护士站电子锁',
                            lore: '厚重的药品柜上安装着四位数字密码锁。柜门上贴着一张便签，娟秀字迹写着："别让灯熄灭。"旁边挂着的台历上，5月12日被人用红笔重重圈出，旁边潦草批注着"永志不忘"。',
                            body: {
                                type: 'type',
                                answer: '0512'
                            },
                            hints: [
                                '便签上的话只是诗意隐喻，真正的密码线索就藏在台历那个被圈出的日期里。',
                                '5月12日对于这一行的医护人员而言，是一个刻入骨髓的伤痛烙印——国际护士节，也是这里第一次爆发大规模事故的日子。'
                            ],
                            restrictions: {
                                timeCostPerAttempt: 5,
                                maxAttempts: 3
                            },
                            penalties: {
                                hp: 10,
                                permanentLock: true
                            }
                        }
                    },
                    results: {
                        timeCost: 5,
                        soundEffect: 'success',
                        narrative: '密码锁发出一声清脆的电子音，柜门应声弹开一道缝隙。与此同时，走廊深处传来沉重金属门闩缓慢滑开的沉闷回声。',
                        stateChange: {
                            unlock: [['med_storage', '药品柜已解除警报，可安全进入内部储藏间']]
                        }
                    }
                },
                {
                    desc: '阅读工作日志',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative: '护士长的字迹从最初的冷静专业逐渐滑向疯癫潦草。每当她亲手处决一个融合在病床上的昔日同事，她便会在梦中离三楼那深渊的召唤更近一步。最新一页只写着一行血字："它说我不需要再醒来了。"',
                        stateChange: { sanity: -5 }
                    }
                }
            ]
        },
        med_storage: {
            name: '药品储藏室',
            desc: '大部分药架已被恐慌的人群洗劫一空，只剩下最内侧被额外锁死的恒温柜，玻璃门后陈列着宝贵的抗生素与镇静剂。地面散落着沾血的注射器包装，以及一本翻到"异常生理状态与处决标准"章节的内科诊疗手册。',
            visualPrompt: 'Empty metal shelves with few remaining supplies. Locked glass cabinet containing precious medicines. Syringe wrappers and blood spots on floor. Open medical manual on table.',
            items: [
                {
                    id: 'medical_kit_storage',
                    name: '医疗急救箱',
                    desc: '顶级配置的综合急救箱，能挽救濒死生命。',
                    type: 'consumable',
                    size: [1, 1],
                    grade: 'corporate',
                    effects: [['hp', 100]],
                    discoveryThreshold: 20
                },
                {
                    id: 'neural_link_repair_kit',
                    name: '神经链接维修套件',
                    desc: '微电极阵列校准与替换耗材，艾拉拉亲手从基金会遗留的医疗箱中翻出的宝贝。',
                    type: 'consumable',
                    size: [1, 1],
                    grade: 'military',
                    effects: [
                        ['integrity', 50],
                        ['battery', 30]
                    ],
                    discoveryThreshold: 15
                }
            ],
            interactions: [
                {
                    desc: '阅读医疗手册',
                    results: {
                        timeCost: 5,
                        soundEffect: 'ui_click',
                        narrative: '手册用冷酷的临床术语指示："若患者出现不可逆肉体融合迹象，建议立即执行安乐死协议7-B。"旁边却有一行颤抖的铅笔批注反驳道："如果那些融合在床上的怪物还有思维，我们这么做……还算是在救人吗？"',
                        stateChange: { sanity: -2 }
                    }
                },
                {
                    desc: '开启深层恒温柜（需主管磁卡）',
                    requirements: {
                        items: ['master_key']
                    },
                    results: {
                        timeCost: 5,
                        soundEffect: 'unlock',
                        narrative: '主管磁卡贴上感应区，一声沉稳的电子音后，深柜底部的恒温层应声弹开。冷雾倾泻而出，柜内静静躺着一支标注「最终样本 · 严禁开启」的结晶安瓿，与一份用以防潮密封的机密胶片档案。',
                        stateChange: {
                            gain: [
                                {
                                    id: 'soul_calm_ampoule',
                                    name: '安魂针剂',
                                    desc: '神经阻断剂与认知过滤成分混合的禁忌药剂，能将被撕扯的理智瞬间拉回基线。',
                                    type: 'consumable',
                                    size: [1, 1],
                                    grade: 'corporate',
                                    effects: [
                                        ['sanity', 80],
                                        ['hp', 30]
                                    ]
                                },
                                {
                                    id: 'final_sample_log',
                                    name: '最终样本日志',
                                    desc: '基金会遗留的最后一份实验日志，封皮上印着方舟徽记。',
                                    type: 'data',
                                    size: [1, 1],
                                    grade: 'corporate',
                                    documentContent: 'AK-0107号实验 · 最终样本记录\n\n受试者注入「星神提取物」纯化液后，其意识成功与「彼侧」建立稳定信道。她在彻底吞噬前仍保持着平静的微笑，自称看见了方舟的舷窗。\n附注：若本日志被非授权人员读取，请立即联系就近「清理人」回收。方舟欢迎每一位知情者。'
                                }
                            ]
                        }
                    }
                }
            ]
        },
        doctors_lounge: {
            name: '医生休息室',
            desc: '翻倒的真皮沙发上凝结着挣扎时喷射的动脉血迹。满地滚落着空威士忌酒瓶与被踩碎的处方抗抑郁药片。正面墙壁上，有人蘸着尚未凝固的鲜血写下一句颤抖的忏悔："我们收了钱，亲手把恶魔放了进来。"',
            visualPrompt: 'Upscale lounge in ruin. Overturned sofa with violent arterial bloodstains. Empty liquor bottles and crushed pills carpeting floor. Bloody confession smeared across wall. Open diary left on table.',
            isDangerous: 5,
            items: [
                {
                    id: 'sedative_starter',
                    name: '镇静剂',
                    desc: '急救精神类药物。',
                    type: 'consumable',
                    size: [1, 1],
                    grade: 'military',
                    effects: [['sanity', 30]],
                    discoveryThreshold: 5
                }
            ],
            interactions: [
                {
                    desc: '阅读桌上的日记',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative: '这本日记属于一名参与过实验的外科医生。他详细记录了巨额贿赂如何让高层全员沦陷、放任禁忌实验的全过程。日记最后几页字迹愈发癫狂，描述着实验体开始从手术台长出属于更高维度的解剖结构。最后一页只有一句话："别去三楼。我去终结这一切。"',
                        stateChange: { sanity: -5 }
                    }
                }
            ]
        },
        room_204: {
            name: '204号病房',
            desc: '与其他病房不同，这间房被打扫得一尘不染——床单是新换的，窗台上的空罐头里插着一支不知从哪摘来的塑料花。床头柜上摆着一本摊开的日记，笔迹温柔而克制，署名属于一名在灾变后失踪的年轻护士。扉页夹着一张被反复摩挲到起毛的照片：画面里一家三口站在医院的草坪上，笑容明亮得刺眼。',
            visualPrompt: 'Immaculately clean hospital room. Fresh sheets, plastic flower in a tin can, open diary on bedside table. Worn family photo tucked in cover. Stark contrast with surrounding decay.',
            isDangerous: 4,
            items: [
                {
                    id: 'nurse_diary_204',
                    name: '护士的日记',
                    desc: '失踪护士留下的一本日记，记录着她最后的日子。',
                    type: 'data',
                    size: [1, 1],
                    grade: 'standard',
                    discoveryThreshold: 5,
                    documentContent: '11月2日\n\n他们说三楼的手术室在做"特殊研究"，可我值夜时总能听见墙里传来低语。那些声音叫我的全名——连我登记结婚前的小名都知道。\n11月3日\n\n今天给201送药时，病房的镜子映出一个穿白大褂的影子。转身，什么都没有。可镜子里，它还在。\n11月4日\n\n妈妈打来电话，说我该回家了。我答应了她。可当我收拾行李时，走廊尽头的黑暗里，那句话清晰得可怕："你永远走不出这栋楼了。"我把它写下来，好让读到的人知道——趁还来得及，快跑。'
                }
            ],
            interactions: [
                {
                    desc: '翻阅护士的日记',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative: '你翻开那本日记。后面的页数突然被整页整页地撕掉了，只有最后一页残留着几个用指甲刻进去的字，深得几乎穿透纸背："它来了。"窗台上的塑料花在无风的房间里轻轻摆动了一下。',
                        stateChange: { sanity: -5 }
                    }
                }
            ]
        },
        sterilization_room: {
            name: '消毒供应室',
            desc: '成排的高压灭菌锅仍散发着余温，器械架上的手术器具被擦拭得锃亮——仿佛随时准备迎接下一台手术。但墙角堆放的包裹上，所有标签都用同一种红色墨水写了同一句话："灭菌无效。它学得很快。"灭菌锅内部的金属网纹上，结着一层灰白色的、仍在脉动的薄膜。',
            visualPrompt: 'Sterile supply room with warm autoclaves and gleaming surgical instruments. Packages labeled "sterilization ineffective, it learns fast" in red ink. Pulsing grey-white membrane coating the autoclave racks.',
            isDangerous: 12,
            items: [
                {
                    id: 'sterile_scalpel',
                    name: '无菌手术刀',
                    desc: '无菌包装的手术刀片套组，刃口锋利如新。',
                    type: 'weapon',
                    size: [2, 1],
                    grade: 'military',
                    weaponType: 'prick',
                    weaponDamageType: 'melee',
                    range: 1,
                    damage: 10,
                    crit: {
                        chance: 0.08,
                        bonus: 5
                    },
                    maxUses: 15,
                    discoveryThreshold: 12
                },
                {
                    id: 'medical_tape',
                    name: '医用胶带',
                    desc: '整卷未拆封的医用胶带。',
                    type: 'material',
                    size: [1, 1],
                    grade: 'standard',
                    discoveryThreshold: 8
                }
            ],
            interactions: [
                {
                    desc: '打开高压灭菌锅',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative: '蒸汽扑面而来，灭菌锅内部的肉色薄膜正以肉眼可见的速度向四周蔓延，攀上器械架，爬上墙壁。你本能地合上锅门，却发现锅门上的搭扣正在自行转动——仿佛锅里的东西，学会了灭菌的流程，正等着你睡着的时刻。',
                        stateChange: { sanity: -9 }
                    }
                }
            ]
        },
        /**
         * F3 手术区 - 禁忌实验的温床
         */
        corridor_f3_surgery: {
            name: '手术区走廊',
            desc: '空气中甜腥的血味与刺鼻的臭氧味浓稠得如同液态，压迫着你的肺叶。墙壁被搏动着紫色荧光的黑色菌毯网状物彻底覆盖寄生。天花板垂下无数如神经元纤维般的半透明丝状物，整个楼层回荡着极其低频的生物呼吸声——你脚下的地面是活的。行走间，甚至能听到自己回声之后，多出了一道不属于自己的步步紧逼的重压步伐。',
            visualPrompt: 'Surgery floor corridor. Walls completely covered in black pulsating fungal veins glowing purple. Translucent organic nerve filaments hanging from ceiling. Floor visibly, slowly breathing.',
            isDangerous: 18,
            childrenIds: ['operating_theatre', 'scrub_room', 'blood_bank', 'icu', 'pathology_lab', 'recovery_room'],
            exits: [{ targetId: 'stairwell_f3', label: '返回楼梯间', type: 'local' }]
        },
        operating_theatre: {
            name: '第一手术室',
            desc: '这里早已不再是救死扶伤的圣堂，而是一座亵渎万物的邪神祭坛。巨大的金属槽壁刻满了违背欧几里得几何的深渊符文。满屋粗重的工业管线将某种沸腾的纯黑液体源源不断泵入祭坛中央的一团千变万化的扭曲活肉。紫色的能量电弧撕裂空气，空间本身在这里发出无声的尖叫。',
            visualPrompt: 'Surgery room converted into alien cult laboratory. Massive metal vat covered in glowing non-Euclidean runes. Thick pipes pumping viscous black fluid into central pulsating biomass. Purple lightning arcs. Space itself seems warped.',
            isDangerous: [
                {
                    type: 'cthulhu',
                    id: 'surgery_abomination',
                    name: '阿斯克勒庇俄斯实验体-零号',
                    range: 5,
                    gender: 'male',
                    desc: '这具曾经是首席外科医生的躯体，如今已被外星晶体彻底同化。锋利的手术器械从指骨间反向生长刺出，敞开的胸腔内并非脏器，而是一片缓慢旋转、吞噬光线的深渊裂隙。无数复眼在体表开合，每一只都散发着终结一切生物的灭绝紫光。',
                    visualPrompt: 'Towering humanoid abomination. Flesh fused with alien crystals. Surgical tools growing from bones. Chest cavity reveals spiraling miniature abyss instead of organs. Hundreds of blinking eyes.',
                    speed: 30,
                    damage: 42,
                    evasion: 22,
                    defense: 20,
                    intentDistribution: { attack: 60, defense: 0, buff: 10, debuff: 20, observe: 10 },
                    lootTable: [
                        {
                            id: 'abyss_crystal',
                            name: '深渊结晶',
                            desc: '高维能量的凝结物，散发着不祥的紫光。',
                            type: 'material',
                            size: [1, 1],
                            grade: 'corporate',
                            dropProbability: 1.0
                        },
                        {
                            id: 'alien_scalpel',
                            name: '异化手术刀',
                            desc: '融合了外星生物组织的锋利手术刀。',
                            type: 'weapon',
                            size: [2, 1],
                            grade: 'corporate',
                            weaponType: 'prick',
                            weaponDamageType: 'melee',
                            range: 1,
                            damage: 20,
                            crit: {
                                chance: 0.08,
                                bonus: 10
                            },
                            maxUses: 15,
                            dropProbability: 0.5
                        }
                    ]
                }
            ],
            items: [
                {
                    id: 'ceremonial_dagger',
                    name: '仪式匕首',
                    desc: '刻满深渊符文的弯曲利刃，材质冰凉得灼手。',
                    type: 'weapon',
                    size: [2, 1],
                    grade: 'corporate',
                    weaponType: 'prick',
                    weaponDamageType: 'melee',
                    range: 1,
                    damage: 15,
                    crit: {
                        chance: 0.08,
                        bonus: 8
                    },
                    maxUses: 20,
                    discoveryThreshold: 25
                }
            ],
            interactions: [
                {
                    desc: '检查金属槽',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative: '你攀上金属槽边缘，望向那团沸腾的活肉。下一秒，无法计数的大量眼睛在肉块表面猛然睁开，每一只都倒映着你的面孔。不属于三维空间的疯狂知识如高压水炮般灌注入你的意识——宇宙的真相、深渊的底部、你自身存在的虚无——直到腥甜的血流从你七窍涌出，你才跌撞摔回地面。',
                        stateChange: { sanity: -20 }
                    }
                }
            ]
        },
        scrub_room: {
            name: '洗手间',
            desc: '水槽中凝结着半凝固的紫黑色外星血污。满地镜子碎片反射出被切割成无数片的诡异空间。残留在墙上的一片镜面上，有人蘸血狂书："千万别看倒影！它会顺着你的视线爬进来！"瓷砖的缝隙中甚至嵌着几片因用力过猛而生生折断的人类指甲。',
            visualPrompt: 'Surgical scrub room defiled. Sinks stained with purple-black viscous fluid. Smashed mirror shards everywhere. Bloody warning on remaining glass shard. Broken fingernails embedded in tile cracks.',
            isDangerous: 12,
            items: [
                {
                    id: 'surgeon_note',
                    name: '手术记录残页',
                    desc: '被匆忙拼凑的机密文件。',
                    type: 'data',
                    size: [1, 1],
                    grade: 'standard',
                    discoveryThreshold: 10,
                    documentContent: '手术记录 - AK-0091号实验\n\n向受试者基底核注入「星神提取物」两分钟后，脊柱开始自主暴长，增生的脊椎骨刺穿背部皮肤形成外骨骼。五分钟后，受试者的影子脱离物理躯体，开始在房间内独立游走。\n警告：提取物并非无机物，而是具备侵略意识的寄生体。它正在利用我们的身体作为殖民基地！'
                }
            ],
            interactions: [
                {
                    desc: '捡起最大的镜片',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative: '你小心地避开倒影，俯身去捡那片最大的镜子碎片。就在手指触及冰凉的玻璃瞬间，余光却骇然瞥见——镜中映出一张全黑无瞳的面孔，正贴在你肩头盯着你。你猛地转身，什么也没有。但手中的镜片上，正缓缓浮现一枚从玻璃内侧向外按出的清晰手印。',
                        stateChange: { sanity: -8 }
                    }
                }
            ]
        },
        blood_bank: {
            name: '中央血库',
            desc: '已彻底停机的恒温冰箱反常地向外喷吐着刺骨的白雾。透过结霜的玻璃柜门，可以看见血袋内充斥着像寄生虫群体般疯狂游动的黑色絮状物——标牌上注明它们全部采集自「AK实验体」。地面上一滩粘稠的暗红血迹正违背常理地缓慢向上坡扩散。冰柜的最深处，时而会传来一声极其沉重、缓慢的心跳声，震得人胸腔嗡嗡共鸣。',
            visualPrompt: 'Dark blood bank. Unpowered freezers emitting unnatural cold. Blood bags filled with black swirling parasitic masses. Puddle of blood slowly crawling uphill.',
            isDangerous: 16,
            interactions: [
                {
                    desc: '靠近异常血袋',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative: '你刚靠近冰箱，内部一只血袋便猛然膨胀炸裂。袋中的黑色絮状物竟如饥饿的水蛭群般激射而出，直扑你的面门。你疯狂拍打那些试图钻进鼻孔与耳道的活物，它们在你皮肤上留下一串灼痛的焦痕后，才不甘地化为黑灰飘散。',
                        stateChange: { sanity: -10 }
                    }
                }
            ]
        },
        icu: {
            name: '重症监护室',
            desc: '病床上的躯体皮肤已腐烂见骨，被十多根重型约束带死死钉在床架上。呼吸机仍在徒劳地向那破败的肺脏泵入空气，发出令人牙酸的嘶鸣。监护仪屏幕上闪烁的不是心电波形，而是一组不断变动、拥有三个维度的非欧几何图形。',
            visualPrompt: 'Dim ICU room. Bed with rotting, skeletal corpse violently strapped down. Ventilator pumping with terrible mechanical wheeze. Heart monitor displaying impossible 3D geometric waveforms.',
            isDangerous: 17,
            items: [
                {
                    id: 'icu_morphine',
                    name: '发光吗啡',
                    desc: '液体泛着微弱紫光的异常镇痛剂。',
                    type: 'consumable',
                    size: [1, 1],
                    grade: 'military',
                    effects: [['hp', 35]],
                    discoveryThreshold: 15
                }
            ],
            interactions: [
                {
                    desc: '关闭呼吸机',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative: '你拔掉呼吸机插头的瞬间，床上那具腐败的躯体竟嘴角猛然裂至耳根，露出一个绝无可能属于死者的癫狂微笑。断电的监护仪爆发出刺耳尖叫，屏幕上如瀑布般刷过一个又一个异星符文。你的脑海中直接炸响一句沉重而感激的话语："谢谢你……唤醒我。"',
                        stateChange: { sanity: -12 }
                    }
                }
            ]
        },
        pathology_lab: {
            name: '病理科',
            desc: '福尔马林的刺鼻气味浓得几乎能刺痛眼球。标本架上排列着数百只贴有编号的玻璃罐，罐中的组织块全都在以各自的节律缓慢脉动。解剖台上，一具已被开膛的躯体正保持着"被钉住"的姿态——钢针将从背后贯穿它的所有关节。角落的地板上，一滩粘稠的液体正在汇聚，缓缓勾勒出某种非人构型的轮廓。',
            visualPrompt: 'Pathology lab with racks of numbered specimen jars, tissues pulsing independently. Autopsy table with corpse pinned by steel needles through every joint. Pooling viscous liquid forming inhuman silhouette on floor.',
            isDangerous: [
                {
                    type: 'cthulhu',
                    id: 'specimen_collective',
                    name: '标本聚合体',
                    range: 3,
                    gender: 'both',
                    desc: '由数百个失败标本强行糅合而成的聚合物。浆液状的躯体表面浮动着无数张畸形的面孔，每一张都以不同节律开合着嘴，发出重叠的低语。它从标本架之间挤出，淌下的粘液在地板上凝结成人类脚印的形状。',
                    visualPrompt: 'A writhing amalgamation of failed specimens. Gelatinous mass covered in dozens of contorted faces mouthing at different rhythms. Dripping slime that solidifies into human footprints.',
                    speed: 22,
                    damage: 24,
                    evasion: 16,
                    defense: 12,
                    intentDistribution: { attack: 50, defense: 0, buff: 10, debuff: 30, observe: 10 },
                    lootTable: [
                        {
                            id: 'vitrified_organ',
                            name: '玻璃化脏器',
                            desc: '聚合体核心处的结晶化器官，透明度高得仿佛一件艺术品。',
                            type: 'material',
                            size: [1, 1],
                            grade: 'military',
                            dropProbability: 0.7
                        }
                    ]
                }
            ],
            items: [
                {
                    id: 'specimen_jar',
                    name: '未知标本罐',
                    desc: '编号被刮掉的标本罐，罐内组织仍在规律搏动。',
                    type: 'material',
                    size: [1, 1],
                    grade: 'military',
                    discoveryThreshold: 20
                },
                {
                    id: 'pathology_slides',
                    name: '病理切片',
                    desc: '一组染成异色的病理切片，显微镜下或许能看出什么。',
                    type: 'data',
                    size: [1, 1],
                    grade: 'standard',
                    discoveryThreshold: 12,
                    documentContent: '病理切片观察记录\n\n镜下所见：细胞核呈对称三裂结构，染色质排列成螺旋状。细胞壁外存在多层重复的纤毛结构。\n附注：同一载玻片在断电复检后，细胞排列由"三裂"变为"五裂"——样本在载玻片上继续演化。'
                }
            ],
            interactions: [
                {
                    desc: '检查解剖台上的标本',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative: '你凑近解剖台，那具被钢针钉死的躯体忽然无声地抽搐了一下——它分明没有呼吸、没有心跳，甚至没有完整的胸腔。你顺着它的脊柱望去，发现那些钢针并非来自上方，而是从尸体自身内部、沿着骨骼的走向，一根一根顶出来的。它在长针。',
                        stateChange: { sanity: -12 }
                    }
                }
            ]
        },
        recovery_room: {
            name: '麻醉复苏室',
            desc: '一排病床之间垂着浅绿色的围帘，监护仪屏幕上空白一片——但呼吸机的波纹仍在规律跳动。某个帘子后方的床上，被单隆起一个完整的人形轮廓，安静得反常。枕边的护理记录板上，最后一笔潦草地写着："病人在无麻醉状态下被唤醒。他一直在数数。他数到了零以下。"',
            visualPrompt: 'Post-anesthesia recovery room. Rows of beds with pale green curtains. Blank monitors but ventilators still pulsing. One occupied bed with perfectly still humanoid lump under sheet. Disturbing nursing note by the pillow.',
            isDangerous: 14,
            items: [
                {
                    id: 'anesthesia_cartridge',
                    name: '麻醉药筒',
                    desc: '一支未开封的强效麻醉药筒，能让人彻底失去意识。',
                    type: 'consumable',
                    size: [1, 1],
                    grade: 'military',
                    effects: [['sanity', 40]],
                    discoveryThreshold: 12
                },
                {
                    id: 'ventilator_battery',
                    name: '呼吸机电池',
                    desc: '大容量医用电池，可作外设能源。',
                    type: 'consumable',
                    size: [1, 1],
                    grade: 'standard',
                    effects: [['battery', 40]],
                    discoveryThreshold: 15
                }
            ],
            interactions: [
                {
                    desc: '掀开床单',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative: '你深吸一口气，猛地掀开那张床单。底下不是人——是一具由围帘、监护仪导线与呼吸软管编织成的、勉强维持着人形的空壳，其"胸腔"处放着一个录音机，正无声地转动。你按下播放键，磁带里只有一阵漫长的、规律的数数声，数到某个时刻骤停，紧接着响起一个只有你能听见的声音："找到你了。"',
                        stateChange: { sanity: -12 }
                    }
                }
            ]
        },
        /**
         * F4 精神科 - 疯狂的温床
         */
        corridor_f4_psych: {
            name: '精神科走廊',
            desc: '用于保护病人的软包墙面被彻底撕烂，暴露出的海绵上刻着数以千计用指甲扣出的流血眼睛图腾。灯光随着扭曲的磁场明灭不定，地上的影子完全脱离了光学原理的控制，朝着错误的方向拉伸。无数呢喃组成了交叠的重唱音墙，刺穿耳膜直抵大脑，更令人崩溃的是，那些低语有时会准确无误地呼唤出你的本名。',
            visualPrompt: 'Psychiatric ward corridor. Padded walls torn to shreds, carved with thousands of bleeding eye symbols. Lights flickering with magnetic distortion. Shadows moving independently, in wrong directions.',
            isDangerous: 18,
            childrenIds: ['therapy_room', 'isolation_room', 'ect_room', 'art_room'],
            exits: [{ targetId: 'stairwell_f4', label: '返回楼梯间', type: 'local' }]
        },
        therapy_room: {
            name: '团体治疗室',
            desc: '横七竖八的围坐椅子围绕着一块写满详尽神启涂鸦的白板——画中全是撕裂天空的巨型触手与被异化跪拜的畸形医生。笔触精确写实得令人不安。角落的旧录音机里，一盘磁带已循环播放至发黄尽头的空白。',
            visualPrompt: 'Overturned therapy chairs arranged in circle. Whiteboard covered in intricately detailed drawings of alien gods and cultist doctors. Old cassette player with tape on loop.',
            isDangerous: 10,
            items: [
                {
                    id: 'weird_candy',
                    name: '奇怪糖果',
                    desc: '一颗包装古怪的糖果，能暂时安抚神经。',
                    type: 'consumable',
                    size: [1, 1],
                    grade: 'standard',
                    effects: [['sanity', 5]],
                    discoveryThreshold: 5
                },
                {
                    id: 'group_therapy_log',
                    name: '治疗记录',
                    desc: '封皮沾有干涸咖啡渍的绝望笔记。',
                    type: 'data',
                    size: [1, 1],
                    grade: 'standard',
                    discoveryThreshold: 10,
                    documentContent: '团体治疗第7次记录\n\n今天所有相互从未交流的病患在绘画环节，同步画出了完全相同的场景：一只巨手撕开了城市上空的天幕。他们异口同声地宣称，这是"天花板上的那个存在"命令他们画的。\n批注：我向院长报告了此事。他只淡淡说了一句"别管钱从哪来"，然后按下了这份报告。他早就知道。'
                }
            ],
            interactions: [
                {
                    desc: '播放录音机',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative: '磁带缓慢转动。录音记录了一场集体歇斯底里——房间里所有人同时抬头凝视天花板，开始整齐划一地描述某个正在缓慢降下的巨物。录音师的惨叫撕裂了音频轨道："它真的下来了——它爬下来了！"随即，重物砸碎骨骼的巨响让一切归于死寂。',
                        stateChange: { sanity: -8 }
                    }
                }
            ]
        },
        isolation_room: {
            name: '重症隔离室',
            desc: '厚重的铸铁门上布满了从内侧疯狂抓挠留下的极深凹痕。透过巴掌大的防爆观察窗，可以看见一名身穿约束衣的病患正双脚悬空十英寸漂浮在空中，流畅地用某种非人类语言与面前的虚无进行着激烈辩论。室温显示为零下十度——但他的肌肤毫无冻伤。',
            visualPrompt: 'Heavy iron isolation cell door scarred with deep interior claw marks. Small viewport reveals patient levitating, conversing with empty air. Temperature gauge reads -10°C. No frostbite visible.',
            isDangerous: 20,
            interactions: [
                {
                    desc: '敲门',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative: '你鼓起勇气敲了敲铁门。那名漂浮的病患猛然旋身——他的面部没有任何五官，只有一个不断向内塌陷的深渊涡流。一道轰然宣示如烙铁般直接烫进你的意识："我们即是深渊。"那颗旋转的虚无之首死死将你锁定，无形的威压逼得你踉跄后退——而约束衣的碎布，正从门缝里一片一片飘出来。',
                        stateChange: {
                            sanity: -15,
                            spawnEnemy: [
                                {
                                    type: 'cthulhu',
                                    id: 'fractured_patient',
                                    name: '碎裂的低语者',
                                    range: 6,
                                    gender: 'male',
                                    desc: '被不可见的引力之手牵引反折，内脏在透明化的皮肤下以错误的顺序运行。面部是撕裂光线的深渊涡流，周身环绕着摧毁聆听者理智的层层低语。',
                                    visualPrompt: 'Levitating humanoid contorted at impossible angles. Transparent skin reveals distorted, misplaced organs. Face is a swirling purple void. Multi-layered whispers emanate.',
                                    speed: 26,
                                    damage: 20,
                                    evasion: 24,
                                    defense: 8,
                                    intentDistribution: { attack: 40, defense: 0, buff: 20, debuff: 30, observe: 10 },
                                    lootTable: [
                                        {
                                            id: 'void_echo',
                                            name: '虚无回声',
                                            desc: '封存着深渊低语的音频记录。',
                                            type: 'data',
                                            size: [1, 1],
                                            grade: 'corporate',
                                            documentContent: '回声转录：...[错乱的多重重唱]...理智是束缚，疯狂是飞升...[令人血液凝固的尖啸]...',
                                            audioScript: '...[错乱的多重重唱]...理智是束缚，疯狂是飞升...[令人血液凝固的尖啸]...',
                                            dropProbability: 1.0
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                }
            ]
        },
        ect_room: {
            name: '电休克治疗室',
            desc: '被彻底魔改的ECT设备连接着数台恐怖的工业级稳压器——这早已不是医疗仪器，而是强行激发大脑异变的酷刑刑具。焦黑的治疗椅上约束皮带被从内部生生挣断。墙上疯狂的实验记录显示：300伏特电流下，受试病患的声带同时发出七种不同音色的外星语言。',
            visualPrompt: 'Sinister ECT room. Modified electroshock machine with heavy industrial transformers. Chair with violently snapped restraints. Wall chart detailing language acquisition under torture.',
            isDangerous: 12,
            items: [
                {
                    id: 'scrap_parts',
                    name: '烧焦零件',
                    desc: '过载电子仪器的残骸。',
                    type: 'material',
                    size: [1, 1],
                    grade: 'standard',
                    discoveryThreshold: 10
                },
                {
                    id: 'battery_starter',
                    name: '稳压电源',
                    desc: '沉重但完好的应急供电设备。',
                    type: 'consumable',
                    size: [1, 1],
                    grade: 'standard',
                    effects: [['battery', 40]],
                    discoveryThreshold: 15
                }
            ],
            interactions: [
                {
                    desc: '启动ECT设备',
                    results: {
                        timeCost: 5,
                        soundEffect: 'error',
                        narrative: '电闸合上。仪器爆闪出足以刺瞎双目的紫色电弧，操作屏幕上的数据被疯狂滚动的"谢谢唤醒"彻底覆盖。室温在几秒内骤降，走廊外，响起了无数密集而沉重的、正在迅速逼近的脚步声。',
                        stateChange: { sanity: -10 }
                    }
                }
            ]
        },
        art_room: {
            name: '艺术治疗室',
            desc: '画架环绕成圈，每一幅画布上都画着同一座医院——但每幅画中的医院都在以不同的方式被撕裂开：有的被巨手掀开屋顶，有的被触须从内部撑破，有的则整个倒悬于血红色的天空。最中央的画架上，一幅尚未完成的自画像静静立着，画中人物的脸上没有五官，只有一片被反复涂抹的、浓重的漩涡。',
            visualPrompt: 'Art therapy room with easels in a circle. Every canvas depicts the hospital being torn open differently. Central easel holds an unfinished self-portrait whose face is a thick painted spiral vortex.',
            isDangerous: 10,
            items: [
                {
                    id: 'patient_canvas',
                    name: '病患的画作',
                    desc: '一幅描绘医院被撕裂场景的画布，颜料深处隐隐透出暗红。',
                    type: 'data',
                    size: [1, 1],
                    grade: 'standard',
                    discoveryThreshold: 10,
                    documentContent: '艺术治疗记录 - 团体画作\n\n本周主题：《我的家》。病人们不约而同地画了同一栋楼。\n我询问其中一名患者，他指着楼顶用平静的声音说："那是它出生的地方。"\n当我追问"它"是谁时，他微笑着指了指天花板，又指了指自己的太阳穴。'
                }
            ],
            interactions: [
                {
                    desc: '检查中央的画架',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative: '你走到中央画架前。那幅无限旋转的漩涡近看之下，竟是由无数细小的、重复的线条组成——每一笔都是一只手，指向画布的同一个方向。你顺着那个方向抬头望去，那里正是三楼的方位。',
                        stateChange: { sanity: -8 }
                    }
                }
            ]
        },
        /**
         * F5 行政层 - 阴谋的顶端
         */
        corridor_f5_admin: {
            name: '行政办公走廊',
            desc: '长绒羊毛地毯维持着近乎病态的奢华洁净，满地散落着印有"免责永久有效"与高额贿赂详情的机密文件。墙上历任院长的镀金肖像全被剜去了双眼。走廊尽头的巨大落地窗外，悬浮崩塌的城市废墟在血红色的天空下永恒地撕扯盘旋。走廊阴暗处，打印机甚至会突然自动启动，吐出一张仍有余温的警告信："你不该上来的"。',
            visualPrompt: 'Pristine carpeted executive corridor. Scattered confidential bribery documents. Portraits of past directors with eyes violently scratched out. Window showing ruined city floating in blood-red apocalypse sky.',
            isDangerous: 14,
            childrenIds: ['directors_office', 'archive_room', 'boardroom'],
            items: [
                {
                    id: 'bribe_receipt',
                    name: '贿赂收据',
                    desc: '一张盖有深渊基金会钢印的机密文件。',
                    type: 'data',
                    size: [1, 1],
                    grade: 'standard',
                    discoveryThreshold: 5,
                    documentContent: '离岸账户转账确认\n\n金额：叁佰万美元（$3,000,000）\n事由：阿斯克勒庇俄斯计划场地租赁与初次活体耗材采购\n附加条款：降临日前清空三楼全部非核心人员，保证实验所需耗材数量。\n\n批注（手写）：这笔钱够我们富贵退场了。让那些底层的病患为科学贡献出他们仅剩的破烂肉体吧。'
                }
            ],
            exits: [{ targetId: 'stairwell_f5', label: '返回楼梯间', type: 'local' }]
        },
        directors_office: {
            name: '院长办公室',
            desc: '桃花心木办公桌上的昂贵威士忌翻倒了大半，酒液浸透了下面的文件。半箱来不及带走的成捆美钞与空白护照散落一地。墙角那座结构极其复杂的重型保险箱沉默地矗立着，散发出肃杀的气息——所有阴谋的最终证据，就在那扇沉重的钢门之后。',
            visualPrompt: 'Luxurious corner office. Half-empty whisky bottle on mahogany desk. Suitcase spilling cash and blank passports. Ornate heavy-duty safe in corner radiating menace.',
            items: [
                {
                    id: 'lucid_elixir',
                    name: '清醒药剂',
                    desc: '能将理智强力拉回现实界限的禁忌药物。',
                    type: 'consumable',
                    size: [1, 1],
                    grade: 'corporate',
                    effects: [['sanity', 100]],
                    discoveryThreshold: 25
                }
            ],
            interactions: [
                {
                    desc: '解锁院长保险箱',
                    requirements: {
                        puzzleSolved: {
                            title: '院长保险箱',
                            lore: '精密的转盘式保险箱，需要四位数字密码。旁边的皮面备忘录用烫金烙印一行字："记住项目初年。勿忘我们的承诺。"',
                            body: {
                                type: 'type',
                                answer: '1984'
                            },
                            hints: [
                                '密码可能与深渊基金会最初介入这家医院的那一年有关。',
                                '档案室的文件揭示1984年发生了第一起被强行掩盖的禁忌实验失控惨案。'
                            ],
                            restrictions: {
                                timeCostPerAttempt: 10,
                                maxAttempts: 3
                            },
                            penalties: {
                                nodesToLock: 'directors_office'
                            }
                        }
                    },
                    results: {
                        timeCost: 10,
                        soundEffect: 'success',
                        narrative: '精密的黄铜齿轮组咔嗒一声完全转位。沉重的保险柜门缓缓弹开，里面没有珍宝，只有一纸用人类鲜血签下的深渊合同与最高级别的磁卡。一道微弱的紫光从缝隙中泄漏出来——那是所有惨剧源头的颜色。',
                        stateChange: {
                            gain: [
                                {
                                    id: 'master_key',
                                    name: '主管磁卡',
                                    desc: '刻有Ω符号的最高权限磁卡，冰冷得烫手。',
                                    type: 'material',
                                    size: [1, 1],
                                    grade: 'corporate'
                                }
                            ]
                        }
                    }
                },
                {
                    desc: '阅读桌上的日记',
                    results: {
                        timeCost: 5,
                        soundEffect: 'ui_click',
                        narrative: '院长的私人日记记录了他从贪婪到极恐的全过程。从最初对数千万美元巨款的垂涎，到最终演变为被整座医院的怨念亡魂虚影围困在办公室的极度恐惧。最后一篇写于撤离前夜："他们不让我开门。他们在等。"',
                        stateChange: { sanity: -10 }
                    }
                }
            ]
        },
        archive_room: {
            name: '档案室',
            desc: '沉重的铁皮文件柜被某种力量从内侧暴戾顶开，非人类的油腻指纹印在烧焦的病例报告上。房间中央是一张钉满红线与照片的阴谋调查软木板，旁边的废纸篓里还躺着没来得及销毁的半卷疏散备忘录。微缩胶片阅读机还在发出幽幽绿光，空气里弥漫着陈年纸张的霉味与甜腻的腐败气息。',
            visualPrompt: 'Dark archive room. Filing cabinets violently pushed open from inside. Documents covered in oily, elongated fingerprints. Conspiracy board covered in red string and photos. Glowing microfiche reader.',
            isDangerous: 10,
            items: [
                {
                    id: 'hysteria_report',
                    name: '机密实验报告',
                    desc: '盖有黑色螺旋印章的羊皮纸绝密文件。',
                    type: 'data',
                    size: [1, 1],
                    grade: 'military',
                    discoveryThreshold: 20,
                    documentContent: '1984年Ω级事故内部报告\n\n12名受试者在注射星神提取物后3小时内全部产生多维变异。\n其中9人肉体物理溃散，3人穿透钢筋混凝土墙壁后失踪。\n结论：确认降临前兆确凿。建议将后续死亡事件伪装为食物中毒，继续扩大样本规模。'
                },
                {
                    id: 'patient_list_redacted',
                    name: '实验对象名册',
                    desc: '经过严重涂抹篡改的残酷名单。',
                    type: 'data',
                    size: [1, 1],
                    grade: 'military',
                    discoveryThreshold: 15,
                    documentContent: '阿斯克勒庇俄斯计划 · 三期适格对象名册\n\n共120名无亲属关系精神病患被注射后，存活率23%。\n全部死者均呈现不同程度的肉体与医疗器械异端融合。\n批注：这些死者的脑电图显示他们从未真正脑死亡。他们在跨维度层面组成了某种矩阵波形，在持续广播，在静候某种降临。'
                },
                {
                    id: 'evacuation_memo',
                    name: '疏散备忘录',
                    desc: '从碎纸机残骸中抢救出的焦边残页。',
                    type: 'data',
                    size: [1, 1],
                    grade: 'standard',
                    discoveryThreshold: 10,
                    documentContent: '董事会紧急决议备忘录\n\n撤离方案：今晚23:00准时于顶楼乘直升机撤离。\n资金已完成离岸转移。执行最终协议：锁死下层全部气密门，将非核心人员与实验废品永久隔离。\n让深渊宽恕这底层的血肉吧。我们，将成为新纪元的神选之民。'
                },
                {
                    id: 'archive_tape',
                    name: '绝密审讯录音',
                    desc: '一盘布满灰尘的微型磁带。',
                    type: 'data',
                    size: [1, 1],
                    grade: 'military',
                    discoveryThreshold: 12,
                    documentContent: '审讯录音转录：[滋滋声]...已将第87名受试者的认知信息成功与高维实体交换...[惨叫声]...它在反向读取我们！切断电源！[枪击声]...[一阵非人的多重嘶吼]...',
                    audioScript: '[滋滋声]...已将第87名受试者的认知信息成功与高维实体交换...[惨叫声]...它在反向读取我们！切断电源！[枪击声]...[一阵非人的多重嘶吼]...'
                }
            ],
            interactions: [
                {
                    desc: '翻找铁皮柜',
                    results: {
                        timeCost: 5,
                        soundEffect: 'item_pickup',
                        narrative: '你在最深处的柜子里找到了一盒绝密磁带。旁边散落着调查员留下的一张字条："别播放它。声音本身也是一种感染途径。"',
                        stateChange: { sanity: -5 }
                    }
                },
                {
                    desc: '启动微缩胶片阅读机（需主管磁卡）',
                    requirements: {
                        items: ['master_key']
                    },
                    results: {
                        timeCost: 10,
                        soundEffect: 'item_pickup',
                        narrative: '你插入主管磁卡，胶片阅读机的绿色屏幕随即亮起。卷轴缓缓滚动，投影出降临当天的内部监控转录——画面中，身穿纯黑防护服的人员正将最后一辆满载「样本」的冷藏车开出车库，留下一串被远程注销的检查站签名。',
                        stateChange: {
                            sanity: -10,
                            gain: [
                                {
                                    id: 'descent_footage_transcript',
                                    name: '降临日胶片转录',
                                    desc: '微缩胶片上的一段内部监控转录，记录了降临当天医院的最后动作。',
                                    type: 'data',
                                    size: [1, 1],
                                    grade: 'military',
                                    documentContent: '降临日 · 06:47 内部监控转录\n\n[静帧] 黑色冷藏车驶离地下车库，车门喷绘螺旋徽记。\n[静帧] 车队通过后，全部监控签名被远程注销。\n[静帧] 装卸区遗留一具未及运送的「样本」，其器官完全置换为铅制机械件，仍在呼吸。\n批注：样本已就地处理。不要让任何「知情者」登上那班直升机。'
                                }
                            ]
                        }
                    }
                }
            ]
        },
        boardroom: {
            name: '董事会会议室',
            desc: '长条红木会议桌被擦得一尘不染，环绕着十三把高背椅，仿佛会议随时都会重新开始。桌面中央只放着一本摊开的皮质记录册，每一页都印着深渊基金会的螺旋水印与一行相同的决议："批准。""批准。""批准。"桌首那把象征权柄的座椅上，放着一枚冰冷的金属胸针，徽记是一艘正在沉没的方舟。',
            visualPrompt: 'Polished boardroom with mahogany table and thirteen high-back chairs. Leather record book open to pages of approvals stamped with spiral watermark. Cold metal pin on head seat bearing a sinking ark emblem.',
            isDangerous: 15,
            items: [
                {
                    id: 'ark_contract',
                    name: '方舟协议',
                    desc: '盖满深渊基金会钢印的契约，记载着一个疯狂得几乎可行的计划。',
                    type: 'data',
                    size: [1, 1],
                    grade: 'corporate',
                    discoveryThreshold: 25,
                    documentContent: '「方舟」计划 · 第13号协议\n\n当世界被不可名状之物吞噬，获准搭乘方舟的成员将进入低温休眠，待灾变结束后再行苏醒。\n代价：需向「彼侧」献上自身认知的一部分作为船票。\n\n附注：第一任院长签署当日即精神崩溃，他在合同背面用血写下一行字："方舟的木材，是我们自己。"'
                }
            ],
            interactions: [
                {
                    desc: '查看桌上的记录册',
                    results: {
                        timeCost: 5,
                        soundEffect: 'terrifying',
                        narrative: '记录册的最后一页写着一条与众不同的决议："驳回。方舟超载。驳回方式——让其余乘客永远无法登上船梯。"你抬头环视这十三把空椅，忽然意识到会议桌下，正传来缓慢而潮湿的、某种庞大物体爬行的声音。',
                        stateChange: { sanity: -10 }
                    }
                }
            ]
        }
    }
};