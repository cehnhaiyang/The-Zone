import type { SanctuaryTemplate } from '../../contract/meta';
import {
    sanctuary,
    node,
    fac,
    uRes,
    svg,
    enemy,
    loot,
    I,
    P,
    E,
    act
} from './sanctuaryFactory'

/**
 * 烛火书斋 (Candlelight Study)
 *
 * 【核心设计原则】
 * 1. 幽静：隔绝外界喧嚣，强调氛围的深邃、永恒与绝对静谧。
 * 2. 松弛：消除生存与探索的高压，提供绝对的认知缓冲与避风港体验。
 * 3. 平缓：时间流逝速度极度缓慢（dilationFactor: 0.15，大幅延缓生理代谢与状态恶化）。
 * 4. 无人：初始人口（population）强制为 0，强调天地孤寂的纯粹避难体验。
 * 5. 安全：绝大部分节点绝对安全；极少数深渊边缘节点仅保留微弱警戒，杜绝高压遭遇战。
 *
 * 定位：
 * - 认知安全型终极避难所（SanctuaryTemplate）
 * - 极低时空稀薄系数（dilationFactor: 0.15）静息中枢
 * - 深渊知识与禁忌典籍永恒封印设施
 *
 * 核心资源自持循环：
 * - 烛火灵光（candlelight）：产出 13 / 消耗 13（设施消耗 12 + 每日环境自然耗损 1），形成绝对永恒收支闭环
 * - 羊皮残页（scraps）：自动抄录台产出 4 / 装订修复工坊消耗 4，自给自足
 * - 静默药剂（medicine）：冷凝药房产出 1 / 每日耗损 0.2，持续盈余
 * - 食物 / 净水（food / water）：由永燃烛海与荧光苔藓滤水层维系稳定正向积累
 */

// ==========================
// 1. 庇护所战略独特资源
// ==========================

const candleSeaRes = uRes(
    'candlelight',
    '烛火灵光',
    '永燃烛海从历史记忆与静默虚空中析出的纯净以太光辉，维系认知滤网、抄录台与封印阵列的日常运转。书斋中没有工业电网，灵光即是唯一的能源。',
    svg('<path d="M12 2c3 4 4.5 6.4 4.5 8.5a4.5 4.5 0 0 1-9 0C7.5 8.4 9 6 12 2z"/><path d="M12 14.5V22"/><path d="M9 20h6"/>'),
    140,
    1
)

const scrapsRes = uRes(
    'scraps',
    '羊皮残页',
    '自发补全的编目与脱落的书页纤维，经受过时间沉淀，可用作修缮书脊、重铸封印与绘制稳定仪轨的消耗物料。',
    svg('<path d="M5 4h11l3 3v13H5z"/><path d="M16 4v3h3"/><path d="M8 12h8M8 16h6"/>'),
    36
)

const medicineRes = uRes(
    'medicine',
    '静默药剂',
    '由冷萃蒸馏器结合纯水与烛脂精炼的安神溶剂，能迅速平复视神经噪点与认知灼伤，亦是巩固自我边界的保命药物。',
    svg('<rect x="4" y="8" width="16" height="8" rx="4"/><path d="M12 8v8"/><path d="M8 4h8"/>'),
    8,
    0.2
)

// ==========================
// 2. 节点矩阵与内联设施
// ==========================

// ------------------ 中枢 ------------------

const grandAtriumNode = node(
    'grand_atrium',
    '穹顶大厅',
    '古老书斋的绝对核心。无数根粗细不一的蜡烛悬停在数千英尺高的拱顶下，散发着如夕阳般沉静温和的琥珀色光芒。空气中流淌着干燥羊皮纸、熏香与融化蜂蜡的安宁气息。四座饰有神圣星纹的巨型拱门通往各个侧翼。高耸的书架直插无光的穹顶，偶尔会有一本皮质典籍悄无声息地自高处滑落，翻开停留在你脚边，展示着一副古老平整的星空图，随后在你的目光中安详合拢。',
    'Gothic cathedral library atrium, thousands of floating beeswax candles, warm golden and amber lighting, endless towering wooden bookshelves, dust motes drifting, pristine marble floor reflecting candlelight, tranquil sanctuary, ultra-detailed 8k.',
    {
        children: ['reading_corridor', 'forbidden_wing', 'astral_stairway', 'abyss_corridor'],
        exits: [E.local('forgotten_garden', '推开爬满藤纹的雕花石门')],
        facilities: [
            fac(
                'facility_archive_candle_sea',
                '永燃烛海',
                '数以万计的白蜡烛在穹顶高处沉浮、燃烧与自我重塑。火焰不耗氧气，反而从虚空中沉淀出富含糖原的可食用蜡脂，并源源不断向大理石地面辐射温暖的烛火灵光。',
                { food: 5, candlelight: 13 }
            ),
            fac(
                'facility_archive_cognitive_sieve',
                '静默认知滤网',
                '悬挂于穹顶下的水银凹镜、黄铜星轨与冷焰符文阵列。持续消耗烛火灵光，在中枢上空张开一层柔和的认知断层，隔绝一切来自外界深渊的恶意窥探，将侵蚀度牢牢压制。',
                { candlelight: -7, erosion: -2 }
            )
        ],
        items: [
            I.consumable('atrium_candle', '漂浮烛芯', '从穹顶漂浮蜡烛上取下的微缩烛芯，即便在真空与风暴中亦能安稳燃烧，火光能有效抚平视网膜的颤栗。使用恢复 20 点理智。', [['sanity', 20]], { threshold: 4, qty: 2 }),
            I.consumable('hard_wax_ration', '凝光蜡脂块', '烛海中自然析出并冷却成型的半透明蜡脂，质地如凝脂，入口温润清甜，能迅速补充肌体糖原。使用恢复 30 点体力。', [['stamina', 30]], { threshold: 5, qty: 2 })
        ],
        interacts: [
            act(
                '静立于烛雨之下深呼吸',
                '你闭上双眼，感受温热的以太暖流从穹顶缓缓淌下。外界深渊的嘶吼被厚重大理石隔绝在亿万光年之外，你的脉搏逐渐与书斋那漫长的呼吸合拍。',
                { repeat: 0, cost: 15, san: 5, hp: 2 }
            ),
            act(
                '拾起并翻阅飘落的古卷',
                '厚重的牛皮纸触感细腻。书页上绘制着一张早已沉入地底的古代海岸线地图，微风吹拂间，几行温润的金字在你心底浮现：「留步于此，安宁即是答案。」你轻轻将其放回书架，一段安宁的哲思在脑海中沉淀。',
                {
                    cost: 10,
                    sound: 'item_pickup',
                    san: 3,
                    gain: [
                        I.data('atrium_reading_note', '安歇箴言', '穹顶大厅散落的一页手书，记录着避难所最初的宁静之约。', '「在知识的暴风雨停歇之前，这座大厅将为你抵挡一切高维的惊涛骇浪。」')
                    ]
                }
            )
        ]
    }
)

// ------------------ 知识长廊侧翼 ------------------

const readingCorridorNode = node(
    'reading_corridor',
    '知识长廊',
    '一条望不到尽头的拱券走廊，两旁陈列着以深色胡桃木雕琢的典籍墙。微风从书架深处自发吹拂，带来如轻柔细雨般的翻书声。地面以黑白相间的大理石方砖铺就，每一块石砖上都刻着一种业已失落的古代楔形文字。一支无人握持的水晶羽毛笔在走廊上方徐徐巡游，笔尖微垂，在空气中凝出一颗颗转瞬即逝的金色光粒。',
    'Long grand library corridor, dark walnut bookshelves lining the walls, floating crystal quill dropping glowing golden ink droplets, floating books, dust motes dancing in warm sunbeams and candlelight.',
    {
        children: ['reading_room', 'scriptorium', 'meditation_chamber', 'translation_gallery'],
        items: [I.material('gilded_feather', '金墨羽毛', '从巡行羽毛笔上自然脱落的纯白翎羽，羽干中流动着永不凝固的金辉。优质的刻画与仪式媒介材料。', { size: [1, 2], threshold: 6 })],
        interacts: [
            act(
                '沿楔形地砖缓步独行',
                '你的皮靴踩在冰凉光滑的石砖上，发出清脆而节奏分明的回响。四周的书架随着你的步伐轻柔震颤，宛如成千上万位沉睡的学者向你致以沉默的脱帽礼。心中的焦躁被悄然抚平。',
                { repeat: 0, cost: 10, sound: 'search', san: 3 }
            ),
            act(
                '伸手接住羽毛笔滴落的灵光',
                '金色光粒落在你掌心，迅速凝结成一颗微凉圆润的珠子。握住它，耳畔能听见极其轻柔舒缓的书写声，让紧绷的神经放松下来。',
                {
                    cost: 10,
                    sound: 'item_pickup',
                    san: 2,
                    gain: [I.material('gilded_ink_pearl', '金墨珠', '由灵性墨滴凝聚成的温润珠体，散发着安神的松节油香气。')]
                }
            )
        ]
    }
)

const readingRoomNode = node(
    'reading_room',
    '公共阅览室',
    '宽敞明亮的环形阅览室，数十张沉重的实木长桌整齐排列。桌上铺放着尚未卷起的地图与厚重的烫金大部头。墙角的红木落地座钟钟摆以不可思议的极其缓慢的节奏摆动，指针每隔数十分钟才轻叩一声。置身其中，连杯中热水的波纹都需要数十秒才渐渐归于平镜，外界的一切喧嚣在此彻底失效。',
    'Peaceful library reading room, massive polished oak desks with open illuminated manuscripts, antique grandfather clock with slow brass pendulum, brass reading lamps, warm atmospheric sanctuary.',
    {
        items: [
            I.data('ancient_scroll', '静水卷轴', '以柔韧羊皮纸抄录的古代哲学手稿，文字间蕴藏着稳定因果波动的力量。', '「时间的本质并非箭矢，而是平静的海渊。学会停歇之人，风暴自会从其头顶掠过。」', {
                grade: 'reinforced',
                size: [1, 2],
                threshold: 12
            }),
            I.data('scholar_note', '留座便签', '夹在红皮典籍中的泛黄便签，笔迹从容端正。', '「座钟每慢一秒，现实的伤口便愈合一分。在此安心休息，无人会催促进度。」', {
                threshold: 4
            })
        ],
        interacts: [
            act(
                '在阅览桌前就座研读古籍',
                '你拉开高背皮椅坐下，随手翻开一本记载着遥远星空与丰饶大地的画册。温润的烛光洒在纸页上，伴随着座钟缓慢的滴答声，你感到大脑中被深渊搅乱的思维链条被重新梳理得井然有序。',
                { repeat: 0, cost: 30, san: 6, hp: 2 }
            ),
            act(
                '将错位书页整理归位',
                '你拾起桌角散落的几张散页，依照书脊上的罗马数字将其插回原处。整座阅览室的光线似乎随之微微柔和了一分，书斋对你的善意做出了无声的嘉许。',
                { cost: 15, sound: 'search', san: 3 }
            )
        ]
    }
)

const scriptoriumNode = node(
    'scriptorium',
    '静默抄写室',
    '一排排倾斜的榉木抄写台错落布置在温暖的光晕中，台面上摆放着整齐的墨水瓶与未干的稿纸。几支透明的羽毛笔正自顾自地在纸面上舞动，沙沙的书写声汇聚成催眠般的白噪音。它们抄录的不是毁灭的诅咒，而是诸界文明尚未实现的瑰丽梦想。',
    'Medieval scriptorium, rows of tilted wooden desks, autonomous quill pens writing calligraphy in glowing golden and black ink on parchment, warm dust particles floating in light shafts.',
    {
        facility: fac(
            'facility_archive_scriptorium_index',
            '自动目录誊抄台',
            '无人持握的水晶羽毛笔在羊皮纸上以恒定韵律滑动，把书斋内自发溢散的多余真理信息压制成干燥坚韧的羊皮残页，便于储存与维修使用。',
            { candlelight: -3, scraps: 4 }
        ),
        items: [
            I.weapon('binder_blade', '装订裁刀', '用于精细裁切书页的窄刃短刀，刃口极薄且平整，握柄缠着经过药剂浸泡的深色防滑线。', 'prick', 1, 8, [0.15, 4], 16, { threshold: 8 }),
            I.data('ink_stained_page', '澄澈抄页', '抄写台最新落笔的一页手稿，墨香沁人心脾。', '「钥匙从不由刀剑铸造。唯有放下戒备与执念者，门扉方自向两侧退去。」', {
                threshold: 4
            })
        ],
        interacts: [
            act(
                '尝试为未竟手稿填补字句',
                '你轻轻握住羽毛笔，在空白处写下字迹。金色的墨线如流水般顺畅渗入纸面，整张羊皮纸泛起柔和的温光。羽毛笔在纸尾轻巧地画出一枚橄榄枝纹章，将一张纯净的预言残卷馈赠于你。',
                {
                    cost: 20,
                    sound: 'unlock',
                    san: 5,
                    gain: [
                        I.data('peace_prophecy_sheet', '庇护残篇', '记录着书斋避风誓约的完整手稿，握住它能感受到安宁的屏障。', '「所有疲惫的旅人，皆可在此卸下甲胄。烛火不灭，风暴莫侵。」', {
                            grade: 'reinforced'
                        })
                    ],
                    puzzle: P.cloze(
                        '未竟之誓',
                        '一张摊开的羊皮手卷上，金色的诗行在末尾停顿，羽毛笔悬在半空，等待与契合之人的心智共鸣。',
                        [['当', '', '转动，幽深之门无声开启。不是为了流放，而是为了安宁与', '']],
                        ['银钥', '归宿'],
                        { hints: ['思索门扉与守护的意象。', '回忆进入此地时感受到的安全与宁静。'], maxAttempts: 3, penalties: { sanity: 2 } }
                    )
                }
            )
        ]
    }
)

const meditationChamberNode = node(
    'meditation_chamber',
    '冥想室',
    '一个圆形石砌静室，地面雕刻着由同心圆与星芒构成的收敛几何阵列。四壁无窗，但上方投射下如水银般清澈的冷光。正中摆放着几个柔软厚实的蒲团，空气中弥散着极淡的白檀与冷杉熏香。在这里，心跳与呼吸的声音被放大，外界的一切杂念与高维视听干扰均被彻底屏蔽。',
    'Circular stone sanctuary, elegant concentric geometric mandala carved in floor, plush velvet meditation cushions, soft ethereal silvery skylight, faint wisps of white sandalwood incense smoke, absolute zen peace.',
    {
        items: [
            I.accessory('meditation_beads', '静念佛珠', '由沉香木打磨串连而成的持珠，指尖摩挲间能有效平抑神经放电过载，巩固神智上限。', [['maxSanity', 6]], { threshold: 10 }),
            I.consumable('incense_bundle', '白檀安神香', '书斋特制的纯天然香条，点燃后能快速驱散脑海中的幻听与呓语。使用恢复 25 点理智。', [['sanity', 25]], { threshold: 4, qty: 2 })
        ],
        interacts: [
            act(
                '在蒲团上闭目静坐冥想',
                '你盘腿坐于蒲团之上，随着胸膛起伏平复紊乱的呼吸。四周的光芒如温水般漫过四肢百骸，脑神经链接仪的电流底噪彻底平息下去。在半梦半醒的极静之中，你感到受损的心智重新被坚韧的意志填满。',
                { repeat: 0, cost: 45, san: 15, hp: 6 }
            )
        ]
    }
)

const translationGalleryNode = node(
    'translation_gallery',
    '翻译回廊',
    '两侧摆设着长条斜面查阅台的弧形回廊，厚重的词典与多语言释义册依序排开。墙壁上镶嵌着由黄铜铸造的古代字母对照表。这里的文字在不同视线角度下会展现出奇妙的渐变折光，宛如活物般自发调整语序以迎合读者的认知习惯，毫无理解上的压迫感。',
    'Curved library gallery with polished mahogany consultation desks, brass comparative language plaques mounted on stone walls, open dictionaries, warm ambient lantern light, scholarly wonder.',
    {
        items: [
            I.data('shifting_translation', '自适译稿', '由特殊植物纤维造就的手抄稿，文字能够根据阅读者的母语自发解析成最易理解的温和表述。', '「语言是现实的投影，但沉默是宇宙的本体。当你不再急于命名，事物自会向你展现温和的面目。」', {
                grade: 'reinforced',
                size: [1, 2],
                threshold: 10
            }),
            I.material('dead_language_ink', '安宁绝语墨', '从失落文明遗迹中提炼出的温润墨汁，书写时散发清凉的草木香气。', { grade: 'reinforced', threshold: 12 })
        ],
        interacts: [
            act(
                '驻足对照黄铜字母表',
                '你顺着字母表那优美的弧线逐一辨识。原本晦涩古奥的符号在你眼中渐渐解构成某种通俗的旋律，逻辑与智慧在无声无息中得到了淬炼。',
                { repeat: 0, cost: 15, san: 3 }
            )
        ]
    }
)

// ------------------ 禁书侧翼 ------------------

const forbiddenWingNode = node(
    'forbidden_wing',
    '禁书侧翼',
    '此处的书架均由加厚生铁与黄铜扣索牢固缚紧，书脊上贴着褪色的蜡封封签。冷蓝色的幽光自地砖缝隙中幽幽渗出，但这并非杀意的冰冷，而是一种旨在抑制活性知识暴走的低温保鲜力场。空气虽比中枢稍凉，但秩序森严。偶尔能听见铁链微小的金属撞击声，犹如被驯服的猛兽在锁链下发出沉闷安详的咕噜。',
    'Gothic forbidden library wing, locked wrought iron bookshelves secured with heavy chains and wax seals, cool azure ambient light contrasting with amber torches, serene containment atmosphere.',
    {
        danger: 1,
        children: ['archive_vault', 'alchemy_lab', 'ritual_circle', 'binding_chamber', 'ink_well', 'curator_study'],
        facility: fac(
            'facility_archive_binding_workshop',
            '装订修复工坊',
            '配备精铜裁刀与骨质折纸器的坚固工坊。消耗残页与灵光对那些边缘碎裂的禁书进行重锁装订，稳固建筑的形而上骨架，微量抑制侵蚀。',
            { scraps: -4, candlelight: -2, erosion: -1 }
        ),
        items: [I.material('forbidden_chain_scrap', '封印铜链残环', '从旧书架扣锁上替换下来的刻纹铜环，表面铭刻着稳固符文，是极佳的物理加固耗材。', { threshold: 6, qty: 2 })],
        interacts: [
            act(
                '巡视铁链加固情况',
                '你沿书架缓步走过，指尖抚过冰凉紧绷的锁链。封印阵列运转平稳，内里跳跃的活体知识感知到你的平静心绪，渐渐安静地沉睡下去。',
                { repeat: 0, cost: 10, sound: 'search', san: 1 }
            )
        ]
    }
)

const archiveVaultNode = node(
    'archive_vault',
    '禁忌书库',
    '一道沉重的实心铜门隔开的深层保险库。这里的每一本藏书都被安置在雕刻着几何抑制符的厚玻璃柜中。即便偶尔有极其低沉的耳语穿透玻璃溢出，也会立刻被房间四角的黄铜风铃声敲散成无害的共鸣音。在这里，危险的真理被文明温柔地裹上了坚固的剑鞘。',
    'Deep archive vault, massive bronze vaults, thick glass display cases holding glowing ancient manuscripts, brass wind chimes gently swaying, calm and controlled occult storage.',
    {
        danger: 1,
        items: [
            I.data('forbidden_tome', '沉睡法典', '虽被封印重锁，但封面皮革依旧温润。它不再是危险的毒药，而是经过馆长剔除狂乱毒性后的世界真实侧影。带有极微弱的高维认知蚀刻，但已被法阵完全中和。', '「不必畏惧深渊的凝视。深渊只是一面镜子，映照出你尚未理解的宇宙全貌。学会呼吸，而后闭上眼睛。」', {
                grade: 'prototype',
                size: [2, 2],
                cognitiveErosion: 0,
                threshold: 18
            }),
            I.armor('librarian_cloak', '守望者斗篷', '带有陈年古籍清香的厚重深蓝呢绒斗篷，织入铅丝与冷银线，能显著偏转外界深渊的感知与钝击伤害。', 0.16, 25, { grade: 'foundation', size: [2, 3], threshold: 20 }),
            I.weapon('silent_candle_ring', '静默烛焰戒', '以永燃灵光凝铸的精金戒圈。激发时无声无息，直接以纯正理性能量抚平暴躁异质。造成即时真实伤害。', 'magic', 0, 13, [0.15, 5], 20, { damageType: 'instant', grade: 'foundation', size: [1, 1], threshold: 22 })
        ],
        interacts: [
            act(
                '聆听风铃与典籍的无害和鸣',
                '你坐在铜门旁的石墩上，风铃清脆的叮咚声与玻璃柜内隐约的低语声交织成一首古老的催眠曲。你明白，只要封印仍在，这里的真理便无法伤你分毫。',
                { repeat: 0, cost: 20, san: 4 }
            )
        ]
    }
)

const alchemyLabNode = node(
    'alchemy_lab',
    '炼金实验室',
    '兼具古代草药坊与严谨物理实验室风格的宽敞石室。铜制冷凝管在头顶盘错缠绕，烧瓶内澄清的淡蓝色液体在无火状态下恒温微沸，释放出混合着薄荷与龙脑的清新白汽。四周木架上井然有序地码放着纯水瓶与研磨钵，是调配神经修复剂与维保仪器的理想工坊。',
    'Ancient alchemical laboratory, copper distillation apparatus, bubbling turquoise and amber glass flasks emitting cool aromatic steam, neatly organized herb jars, clean and precise sanctuary workspace.',
    {
        facility: fac(
            'facility_archive_silent_apothecary',
            '静默药房',
            '依附于炼金台的低温冷凝管组，将纯净伏流水与精炼烛脂缓慢化合，滴落出澄清透明的静默药剂。',
            { water: -4, medicine: 1 }
        ),
        items: [
            I.consumable('healing_potion', '纯萃生肌液', '利用荧光苔藓冷凝液与草药精提的绿色药剂，能迅速促进细胞再生。使用恢复 35 点生命值。', [['hp', 35]], { threshold: 6, qty: 2 }),
            I.consumable('clear_flame_oil', '清焰精油', '点燃后散发醒脑清香，能迅速驱除中枢神经疲乏。使用恢复 30 点精力。', [['vigor', 30]], { grade: 'reinforced', threshold: 12 }),
            I.consumable('candle_battery', '烛光储能柱', '利用黄铜管约束纯化烛火灵光的特制电池，完美适配神经链接仪接口。使用恢复 30 点电量。', [['battery', 30]], { grade: 'reinforced', threshold: 10, qty: 2 }),
            I.consumable('wax_resin_patch', '蜡脂修补膏', '温热后能快速封闭目镜与神经计算芯片表面的物理微隙。使用恢复 25 点设备完整度。', [['integrity', 25]], { grade: 'reinforced', threshold: 12, qty: 2 })
        ],
        interacts: [
            act(
                '按照斐波那契温控序列调配试剂',
                '冷凝管中液体温度平稳过渡，在烧瓶底部凝固出一小簇散发温润红芒的纯净结晶。整个过程毫无爆炸风险，操作台泛着令人安心的微温。',
                {
                    cost: 30,
                    san: 3,
                    gain: [I.material('philosophers_stone_fragment', '安宁结晶碎片', '在平衡炼金中自然析出的稳定红色晶体，可作为高阶修复媒介。', { grade: 'foundation' })],
                    puzzle: P.choice('蒸馏平衡', '铜板上刻有反应温度序列：2, 3, 5, 8, [?], 21。你需要选择注入第几号冷凝试管以完成温和结晶。', ['10', '11', '13', '16'], '13', {
                        hints: ['观察相邻两项数字之和与下一项的关系。'],
                        maxAttempts: 3,
                        penalties: { sanity: 2 }
                    })
                }
            )
        ]
    }
)

const ritualCircleNode = node(
    'ritual_circle',
    '誓约密室',
    '以规整青石垒砌的八角形内室，地面以银粉画就巨大的收敛法阵。中心置有一座素净的无血白石祭台。墙面浮雕描绘着历代学者在此立誓封缄知识、庇护求生者的庄严图景。阵列线条散发着柔和内敛的银白荧光，没有任何嗜血邪异，唯有庄重肃穆的誓言残留。',
    'Octagonal sacred stone chamber, clean white marble altar, glowing silver powder mandala on floor, noble stone wall carvings of scholar guardians, serene mystical protection.',
    {
        items: [
            I.consumable('blessed_water', '祝圣银泉', '盛放在水晶方瓶中的圣洁澄水，透射出柔和的银芒，饮用可迅速抚平精神创伤。使用恢复 25 点理智。', [['sanity', 25]], { grade: 'reinforced', threshold: 6, qty: 2 }),
            I.weapon('ritual_dagger', '封印仪轨匕首', '刀身两面刻有对称的稳定铭文，常用于切分仪式耗材或雕琢封签。', 'prick', 1, 10, [0.15, 5], 14, { grade: 'reinforced', threshold: 12 })
        ],
        interacts: [
            act(
                '在白石祭台前触抚誓言铭文',
                '石台基座刻着清晰的誓约：「以此地为限，以此烛为界。凡入此门者，皆受守护。」银粉阵列随你的触碰微微泛起涟漪，赋予你坚定的心智支持。',
                { repeat: 0, cost: 15, san: 4 }
            )
        ]
    }
)

const bindingChamberNode = node(
    'binding_chamber',
    '封印室',
    '一间厚实平稳的六棱石室，六道刻有静音符文的加固粗铜索自穹顶垂落，交汇处悬浮着一本巨大的羊皮典籍。书页表面虽有如呼吸般的微弱起伏，但十二枚纯银巨钉早已将其牢牢固定在闭合状态。寒霜在铜索表面凝成晶莹的花纹，整个房间温度虽低，却犹如冬日雪夜般宁谧安详。',
    'Hexagonal stone chamber, heavy brass cables suspending a massive sealed grimoire, glowing silver binding spikes, delicate frost patterns, tranquil and secure containment cell.',
    {
        danger: 1,
        interacts: [
            act(
                '检查银钉锁闭牢固度并拂去寒霜',
                '你仔细端详十二枚银钉。封印固若金汤，典籍的书脊在你的注视下渐渐平息了微弱的抽动，像一本再普通不过的沉睡巨书。你从石台凹槽中拾起了一滴溢出的活性墨滴。',
                {
                    repeat: 0,
                    cost: 15,
                    sound: 'search',
                    san: 2,
                    gain: [I.material('dormant_ink_vial', '沉眠墨露', '已被银钉彻底净化掉恶意的温和高维墨水，触手微凉。', { grade: 'foundation' })]
                }
            ),
            act(
                '触抚典籍外沿共鸣（受控的收容意志试炼）',
                '你将掌心轻轻靠近封印阵列的核心。铜索与银钉爆发出耀眼的镇压辉光，典籍内部残存的混沌意志具象化为一具无法移动的虚影，与你展开了一场纯粹理性的收容共鸣较量！',
                {
                    repeat: 1,
                    cost: 20,
                    sound: 'terrifying',
                    san: -4,
                    spawnEnemy: [
                        enemy.immovable(
                            'living_codex_bound',
                            '受缚之活体典籍',
                            '被历代馆长以银钉与铜链死死镇压的庞大书本。它已被彻底驯服并失去移动能力，偶尔扇动残破的书页边缘，发出催眠般的沙沙声。',
                            'A giant bound tome suspended by heavy glowing cables, sealed tightly by silver spikes, harmlessly humming with occult energy in a tranquil chamber.',
                            [4, 6, 25, 2],
                            {
                                loot: [
                                    loot(
                                        I.material('living_ink', '凝态活体墨滴', '在密封玻璃瓶中缓慢如液态水银般自发流转的墨水，极具研究与加固价值。', { grade: 'foundation' }),
                                        1
                                    )
                                ]
                            }
                        )
                    ]
                }
            )
        ]
    }
)

const inkWellNode = node(
    'ink_well',
    '墨池深渊',
    '一个下沉式圆形回音厅，中央是一方由整块黑曜石凿出的大水池。池内盛满了宛如深海般沉静的黑色浓墨。墨池表面如光滑的黑晶镜面，没有丝毫恶臭，反而散发出清冽甘甜的松烟香气。水面倒映出的并非天花板，而是一幅静止不动的陌生璀璨星空图，给人一种凝望永恒的宏大平静。',
    'Sunken circular chamber, large smooth obsidian pool filled with pitch-black liquid, ink surface mirroring a breathtaking tranquil alien galaxy, pine incense, calm philosophical wonder.',
    {
        items: [I.material('abyssal_ink_core', '澄澈墨核', '自墨池底部析出的纯黑晶核，表面平整如镜，内部宛若封冻了一整片星野。握在手中冰凉惬意。', { grade: 'reinforced', threshold: 10 })],
        interacts: [
            act(
                '静坐池边凝望墨中星汉',
                '你坐在黑曜石池沿，低头凝望墨面中的无垠星穹。倒影中的星辰不起波澜，如同万古不变的灯塔。你的心跳平缓下来，一切烦杂的情绪被这池深邃的墨水静静吸纳吸收。',
                { repeat: 0, cost: 20, san: 5 }
            )
        ]
    }
)

const curatorStudyNode = node(
    'curator_study',
    '馆长书房',
    '最后一任馆长的私人居所，时光在此处温和驻足。宽大的红木书桌上一尘不染，壁炉里跳动着柔和的蔚蓝色冷火，照亮了舒适的高背真皮扶手椅。桌角放着一杯尚带微温的花茶，仿佛主人只是刚刚起身前往书架取书。这里洋溢着旧时代智者那优雅、从容且包容一切的生活情调。',
    'Warm vintage study room, antique mahogany desk, comfortable leather armchair, cozy fireplace with crackling blue cold flame, warm teacup, walls covered in rare framed maps, safe haven.',
    {
        items: [
            I.data('curator_confession', '馆长赠言手记', '最后一任馆长亲笔撰写的扉页信笺，字里行间充满了对后来避难者的深切关怀。', '「来访的旅人，坐下来喝口茶吧。你所经历的一切苦难，书斋都在为你分担。钥匙就在抽屉的暗格里，若你日后必须穿过镜像，请带着它。愿烛火常伴你身。」', {
                grade: 'foundation',
                size: [1, 2],
                threshold: 8
            }),
            I.accessory('curators_monocle', '馆长单片镜', '以透明水晶与细金链制成的考究单片眼镜。佩戴后能看透文字背后的逻辑脉络，大幅增益智慧。', [['wisdom', 4], ['maxSanity', 4]], { grade: 'foundation', threshold: 14 })
        ],
        interacts: [
            act(
                '在扶手椅上小憩片刻',
                '你陷在柔软舒适的皮椅中，壁炉的蓝火散发着清凉而让人安心的微波。你端起茶杯抿了一小口，疲惫的筋骨彻底舒展，精神得到了前所未有的修复。',
                { repeat: 0, cost: 30, san: 8, hp: 6 }
            ),
            act(
                '尝试解开书桌暗格的古朴金属圆环',
                '齿轮发出清脆悦耳的轻响，暗格弹开。里面静静躺着一枚边缘流动着柔和空间涟漪的奇特钥匙，正是用来安全出入镜像图书馆的信物。',
                {
                    cost: 10,
                    sound: 'unlock',
                    san: 4,
                    gain: [I.material('paradox_key', '悖论之钥', '能够折叠空间因果的奇特信物，可安全开启镜像图书馆的通道，避免力场反冲。', { grade: 'foundation' })],
                    puzzle: P.type(
                        '馆长的密锁',
                        '铜环上刻有提示：「倒退着凝视深渊」。环形金属轮盘上散乱排列着英文字母 diov，旋转以拼写深渊之名。',
                        'void',
                        { hints: ['深渊的英文是 void。', '倒过来拼写或者将其正向归位。'], maxAttempts: 5, penalties: { sanity: 1 } }
                    )
                }
            )
        ]
    }
)

// ------------------ 星辰阶梯侧翼 ------------------

const astralStairwayNode = node(
    'astral_stairway',
    '星辰阶梯',
    '盘旋而上的白石螺旋阶梯，周围并非石壁，而是透明的虚空穹顶，其间悬浮着缓缓旋转的微缩星系模型。每拾级而上一阶，身上的沉重负荷便宛如被无形之手轻轻托起，重力变得柔和而轻盈。白石扶手上爬满了散发温润粉蓝微光的发光苔藓，如同夜空中的荧光指路灯。',
    'Floating spiral white marble staircase rising through starry cosmos, miniature glowing galaxies drifting peacefully, bioluminescent moss along balustrades, soft anti-gravity aura, ethereal wonder.',
    {
        children: ['observatory', 'clock_tower', 'celestial_map_room', 'time_fracture'],
        items: [I.material('astral_dust_mote', '星阶凝光', '从悬浮微型星系边缘捕获的一点星屑，握在掌心散发着微弱的失重感。', { grade: 'reinforced', threshold: 8 })],
        interacts: [
            act(
                '扶着发光苔藓缓步拾级',
                '阶梯上的重力仅有外界的三分之一，每一步跨越都轻灵如飞。发光苔藓随着你的经过微微闪烁，脚下的微缩星云如同一场私密的星光晚宴，让你忘记了身处险境。',
                { repeat: 0, cost: 10, san: 4, hp: 2 }
            )
        ]
    }
)

const observatoryNode = node(
    'observatory',
    '观星台',
    '一个开阔的穹顶露台，天花板完全由纯净的水晶浇铸。正中架设着一台庞大古雅的黄铜天文望远镜。镜筒上密密麻麻蚀刻着古代星宿运行轨道。透过无暇的透镜向外望去，深渊那令人恐惧的混沌在折射透镜中被优雅地分解为斑斓的光谱与和谐的星云，宛如一曲静音交响乐。',
    'Victorian celestial observatory, colossal brass refracting telescope, crystalline dome ceiling showing vibrant nebulae and serene starry heavens, scattered charts, majestic scholarly peacefulness.',
    {
        items: [
            I.data('star_chart', '天枢恒定图', '描绘着书斋所锚定坐标的稳定星图，能够帮助迷失者找回心理原点。', '「七星虽有偏转，但北辰永居中宫。心若有所执守，深渊无非过客。」', {
                grade: 'reinforced',
                size: [2, 2],
                threshold: 8
            }),
            I.accessory('astral_lens', '星辉透镜', '由纯净陨冰打磨成的光学镜片，装备后能穿透虚妄的迷雾，显著提升觉知洞察力。', [['awareness', 4], ['maxSanity', 2]], { grade: 'reinforced', threshold: 14 })
        ],
        interacts: [
            act(
                '使用黄铜望远镜观测星云',
                '你凑近目镜，璀璨温润的光晕立刻包裹了视野。没有疯狂的呢喃，只有亿万年前恒星诞生的壮美图景在透镜深处徐徐舒展。宏大而安详的宇宙尺度让当下的所有苦难显得渺小而释然。',
                { repeat: 0, cost: 20, san: 6 }
            )
        ]
    }
)

const clockTowerNode = node(
    'clock_tower',
    '永恒钟楼',
    '数以百计的高精度巨型黄铜齿轮在半空中以极其优雅舒缓的节律无声咬合。这里没有急促催逼的钟摆，只有钟表机芯润滑油散发出的清冽坚果香气。透过齿轮间的缝隙，你能看到过去与未来交织出的半透明光带，每一道光带都在向你展示一种和平而充实的人生可能。',
    'Inside a grand celestial clock tower, massive slow-turning brass and gold gears, intricate astronomical movements, translucent golden time ribbons floating peacefully, quiet and orderly.',
    {
        items: [I.material('temporal_gear', '定序齿轮', '仍在微弱规律共振的纯铜齿轮，握在手中有种让时间流逝变得温和的抚慰感。', { grade: 'reinforced', threshold: 8 })],
        interacts: [
            act(
                '与时间控制台的谜面共鸣',
                '齿轮群发出一声轻柔而满足的鸣响，运行速度随之又放慢了半分。光带中浮现出你安详老去的幻影，那个未来的你微笑着向你点头致意，留下了一枚纯金时间齿轮。',
                {
                    cost: 15,
                    san: 8,
                    gain: [I.material('golden_time_gear', '纯金时序轮', '散发着恒定温光的金质齿轮，蕴含着对未来无限可能的期许。', { grade: 'foundation' })],
                    puzzle: P.type(
                        '时间之谜',
                        '黄铜机盘上铭刻着一行隽永字迹：「我没有过去，但我有未来。我从不催促，但我终将如约而至。我是谁？」',
                        '明天',
                        { hints: ['思考时间的向前流向。', '代表着希望与下一刻的到来。'], maxAttempts: 3, penalties: { sanity: 1 } }
                    )
                }
            )
        ]
    }
)

const celestialMapRoomNode = node(
    'celestial_map_room',
    '星穹制图室',
    '中央悬浮着一台直径十数英尺的精密浑天仪，数百道由白银与精金打造成的环圈自发缓缓自转。宝石轴承在轨道上滑移，投射出整片虚空的安全航路。四周长桌上整齐码放着象限仪、双脚规与手绘天体星图，空气中弥漫着清漆与石墨的安宁气味。',
    'Grand celestial cartography chamber, colossal floating gold and silver armillary sphere rotating with gems, celestial maps and brass dividers spread on oak drafting tables, deep indigo ambient light.',
    {
        items: [
            I.material('fallen_star_fragment', '冷却陨金碎片', '从虚空中捕获并已彻底冷却的流星碎片，触手坚润，不带任何深渊污染。', { grade: 'reinforced', threshold: 12 }),
            I.data('star_calculation', '星轨测算抄本', '记录着书斋避风力场几何参数的手稿。', '「只要浑天仪的内外环保持同轴自转，书斋便永远停泊在所有现实风暴的静风眼中心。」', {
                grade: 'reinforced',
                size: [1, 2],
                threshold: 10
            })
        ],
        interacts: [
            act(
                '整理绘图桌上的星规并校准天球仪',
                '你将几把黄铜圆规轻轻归入天鹅绒托盘，伸手扶正了最外圈的一道金属环。整台浑天仪发出一声舒畅的和弦，柔和的星光在你头顶交织成一副安宁的星穹华盖。',
                { repeat: 0, cost: 20, sound: 'search', san: 4 }
            )
        ]
    }
)

const timeFractureNode = node(
    'time_fracture',
    '时间裂隙',
    '石阶尽头并非封闭的石室，而是一道悬浮在虚空中的晶莹裂隙。裂隙边缘并非狂暴撕裂，而是如冰晶融化般缓慢地凝结、平息。透过半透明的晶层，你能同时看到四季更迭的林海与晨曦初升的平静海面。站在这道裂缝前，时间的催逼彻底瓦解，死亡与衰老不再具有威胁。',
    'Translucent crystalline crack in reality, soft shimmering aurora edges, peaceful visions of simultaneous sunrise and snowy forests seen through the glass-like fissure, safe liminal boundary.',
    {
        danger: 1,
        items: [
            I.material('time_hourglass', '逆流沙漏', '内部白沙缓慢向上飘落的奇特沙漏。注视其流动能有效缓解心智的紧迫焦虑感。带有轻微的因果倒错波动。', { grade: 'prototype', size: [1, 2], causalInversion: 1, threshold: 15 }),
            I.material('memory_crystal_fracture', '时间定格水晶', '将某一瞬间的美好光景固化而成的晶体，散发着夏日暖阳的温度。', { grade: 'reinforced', threshold: 12 })
        ],
        interacts: [
            act(
                '在裂隙边缘感受永恒的静止',
                '你将掌心贴在半透明的裂隙边缘，温和的凉意顺着指尖蔓延。体内急速跳动的心脏逐渐回归沉静，外界的紧迫感在此刻化作一缕虚无的烟尘。',
                { repeat: 0, cost: 15, sound: 'ui_transition', san: 6, hp: 4 }
            )
        ],
        exits: [E.local('void_portal', '俯身步入下方的虚空奇点')]
    }
)

// ------------------ 深渊回廊侧翼 ------------------

const abyssCorridorNode = node(
    'abyss_corridor',
    '深渊回廊',
    '通向书斋背阳面的静谧长廊。这里虽然没有明亮的悬浮蜡烛，但黑暗却如丝绸般温和地贴合着地面与墙体。每向前迈出一步，脚下的黑玉石板便会泛起一圈淡紫色的发光涟漪，照亮前路数步之遥。两旁陈列的黑皮典籍静静伫立，如同一尊尊尽职守护秘密的沉默卫士。',
    'Silky dark gothic corridor, deep indigo and black hues, soft luminescent purple footprints ripple on black jade floor, peaceful nameless books in recessed alcoves, respectful quietude.',
    {
        danger: 1,
        children: ['mirror_library', 'memory_theater', 'paradox_room', 'echo_gallery'],
        exits: [E.local('void_portal', '走向回廊尽头的虚空奇点')],
        items: [
            I.data('nameless_book', '无字黑皮书', '尚未写下任何字句的黑皮封底书册，静静合拢时宛如一块温热的黑玉。非常适合用作笔记与绘图。', '「空白并非一无所有。空白是一切故事开始前那场温柔的休憩。」', {
                size: [1, 2],
                threshold: 8
            })
        ],
        interacts: [
            act(
                '随光痕涟漪在黑暗中漫步',
                '你放慢脚步，看着脚底升起的紫色涟漪向走廊两侧扩散。黑暗在这里不是吞噬生命的怪物，而是一层厚重的帷幔，为你隔绝了所有强光的刺痛与窥伺。',
                { repeat: 0, cost: 15, sound: 'search', san: 3 }
            )
        ]
    }
)

const mirrorLibraryNode = node(
    'mirror_library',
    '镜像图书馆',
    '回廊侧面的一处雅致房间，整面西墙由一整面纯银水银巨镜镶嵌而成。镜中的房间明亮清澈，书架上的烫金典籍闪烁着温润的银光。镜面偶尔如静水般漾起细微的波纹。在佩戴悖论之钥的情况下，镜中倒影会向你温和致意，毫无外界传说中镜中恶灵的暴虐。',
    'Ethereal mirror library, massive silver mirror wall reflecting glowing books with reverse titles, mercury-like liquid ripple on glass, peaceful candlelight doubling in reflection, safe dreamlike space.',
    {
        items: [
            I.data('mirror_warning', '镜缘铭文', '刻在银质镜框下端的一行行书，字迹谦和。', '「镜中之你亦是求道之影。携带信物穿行，倒影即是同伴。」', {
                threshold: 4
            })
        ],
        interacts: [
            act(
                '手持悖论之钥触碰镜面',
                '悖论之钥接触镜面的瞬间，银色水波悄然向两侧荡开。镜中的你微笑着伸出手，将一本散发着纯净银辉的手稿轻轻交托在你掌心，随后镜面重归平静。',
                {
                    reqItems: ['paradox_key'],
                    cost: 10,
                    sound: 'unlock',
                    san: 4,
                    gain: [
                        I.data('mirror_manuscript', '镜像澄明手稿', '在水银镜中才能阅览全部内容的哲学真本，蕴藏着对二元对立的终极和解。', '「外界将自我与深渊对立，而书斋明了两者本为一体。接纳阴影者，方得完全之光。」', {
                            grade: 'foundation',
                            size: [1, 2]
                        })
                    ]
                }
            ),
            act(
                '注视镜中的自己并整理仪容',
                '你擦拭去镜框边角的一丝水雾，端详着镜中那张略显疲惫却依旧坚毅的面容。镜中人向你微微颔首，仿佛在告诉你：无论外面的世界崩塌成何种模样，你依旧是你自己。',
                { repeat: 0, cost: 10, san: 5 }
            )
        ]
    }
)

const memoryTheaterNode = node(
    'memory_theater',
    '记忆剧场',
    '一个小型半圆形沉思剧场，中央安放着一张天鹅绒单人扶手椅，正前方悬挂着一张洁白的亚麻幕布。当你安坐其上，穹顶投下一束柔和的暖黄光斑，幕布上便会自发展现出古老学派在书斋中探讨哲学、抄写典籍的温馨日常光景，如同观赏一场沉浸式的旧日皮影戏。',
    'Small classical amphitheater, velvet armchair facing a soft linen projection screen, warm sepia and amber light beam, glowing nostalgic memories projecting tranquil past scenes, deeply comforting.',
    {
        items: [I.material('memory_crystal_theater', '温馨留影水晶', '封存着初代学者们围炉夜读欢声笑语的留影水晶，握住它能感受到久违的家庭般温情。', { grade: 'reinforced', threshold: 10 })],
        interacts: [
            act(
                '入座观看幕布上的旧日回响',
                '幕布上映出一群身着羊毛长袍的学者正聚在壁炉旁争论一道几何命题，身旁煮着的红茶散发出腾腾热气。他们的笑声穿透岁月，如同一剂良药渗透进你的心扉。',
                { repeat: 0, cost: 30, san: 8, hp: 2 }
            )
        ]
    }
)

const paradoxRoomNode = node(
    'paradox_room',
    '悖论之间',
    '一处巧妙利用非欧几里得几何构筑的折叠空间。虽然内部实际体积远大于外部视觉，但四维墙壁的过渡极为平滑自然，毫无眩晕压迫之感。正中悬浮着一个由半透明水晶打造、缓缓内翻重组的多面体。在这里，矛盾的概念得以共存，让人对空间的奇妙感到叹为观止。',
    'Ethereal non-Euclidean study chamber, gentle impossible architectural folds, floating translucent crystal hypercube folding smoothly, soft periwinkle ambient light, philosophical serenity.',
    {
        items: [I.accessory('paradox_pendant', '调和吊坠', '由内翻多面体晶料打磨成的饰物，能平衡佩戴者的感知网络，小幅提升觉知力与意志。', [['awareness', 3], ['will', 3]], { grade: 'prototype', threshold: 15 })],
        interacts: [
            act(
                '细细观察悬浮多面体的翻折',
                '晶体从正方体优雅地内卷为正十二面体，过程如丝般顺滑。你的空间想象力在此刻被无声拓宽，对周遭维度的警惕被纯粹的几何美感所取代。',
                { repeat: 0, cost: 15, san: 4 }
            )
        ]
    }
)

const echoGalleryNode = node(
    'echo_gallery',
    '回声长廊',
    '一段优美的弧形声学画廊，墙体以多孔吸音浮石砌成。在此处发出的任何话语，都会在回廊中被过滤成柔和空灵的泛音。墙壁上悬挂着数副带有雕花木框的空白宣纸，随着回声的震颤，纸面上会如水墨般自发晕染出山川与书海的恬淡意象。',
    'Acoustic stone gallery, warm lighting along vaulted ceiling, gilded frames holding watercolor rice paper that shifts patterns with echoes, ethereal tranquility.',
    {
        children: ['dream_study'],
        interacts: [
            act(
                '轻声念诵一首安魂诗句',
                '你的声音在长廊中化作清脆的风铃之音回荡。空白画框中渐渐勾勒出一座宁静的山庄轮廓，仿佛在回应你的心声。',
                { repeat: 0, cost: 10, san: 4 }
            )
        ]
    }
)

const dreamStudyNode = node(
    'dream_study',
    '梦境书房',
    '回声长廊尽头的一间半透明居室，墙壁与地板如同由乳白色的凝固晨雾筑成。这里的书籍没有沉重的装订，而是封存在一个个拳头大小的发光气泡中。只需轻轻伸手触碰，便有一段温润甜美的安眠美梦如春雨般渗入心神，彻底洗去长途跋涉的疲劳。',
    'Translucent dream study formed from solidified white mist, glowing iridescent memory orbs floating peacefully, ethereal cloud-like furniture, surreal relaxing haven.',
    {
        children: ['hypnosis_chamber'],
        items: [
            I.data('dream_catalog', '梦境选粹目录', '记录着各个安全美梦索引的半透明小册，指尖翻动如触轻纱。', '「第一号：云海之上的翱翔；第二号：童年午后的林荫道；第三号：无雨之海的泊船。」', {
                grade: 'reinforced',
                size: [1, 2],
                threshold: 6
            }),
            I.consumable('dream_weaver_tea', '织梦花茶包', '采集自梦境植物的花草茶包，用温水冲泡能带来长达数小时的深层无梦优质睡眠。使用恢复 25 点理智。', [['sanity', 25]], { threshold: 8, qty: 2 })
        ],
        interacts: [
            act(
                '触碰发光气泡撷取一段轻快之梦',
                '气泡在你掌心柔和破裂，温润的光芒漫过全身。你短暂地梦见自己躺在夏日麦浪之中，微风拂面，阳光温暖而不刺眼。醒来时，四肢的酸痛彻底消散。',
                { repeat: 0, cost: 20, san: 8, hp: 6 }
            )
        ]
    }
)

const hypnosisChamberNode = node(
    'hypnosis_chamber',
    '催眠室',
    '一间椭圆形的隔音软包内室，中央放置着一张可调节的人体工学真皮躺椅。上方悬挂着一颗以极其匀速缓慢旋转的无暇水晶球，球体内部流转着舒缓的淡紫与海蓝涡流。这里是书斋最深沉的心理疗愈站，任何深层认知灼伤与幻听都能在此被彻底瓦解。',
    'Soundproof therapeutic sanctuary, ergonomic luxury recliner, slowly rotating crystal sphere with hypnotic deep sea blue and violet fluid waves, absolute quiet and restorative comfort.',
    {
        interacts: [
            act(
                '在躺椅上仰望水晶球进行深度心理修复',
                '你躺在椅上，双眼随着水晶球内柔和的波纹缓缓转动。思绪渐渐沉入一片温暖的深海，神经链接仪的视网膜噪点如晨雾散去般彻底归零。当你悠悠醒转时，头脑前所未有地清明。',
                { repeat: 0, cost: 45, sound: 'ui_transition', san: 18, hp: 8 }
            )
        ]
    }
)

// ------------------ 遗忘花园 ------------------

const forgottenGardenNode = node(
    'forgotten_garden',
    '遗忘花园',
    '推开穹顶大厅侧门的雕花石门，眼前豁然开朗。尽管身处维度夹缝，这里却拥有着一片宛如梦境的露天庭院。上方是泛着淡紫霞光的温和天空，云层如白絮般缓缓流动。青石小径穿过茂密的奇花异草，这些植物的叶片半透明如薄玉，内里有细小如萤火的光点在叶脉中静静游走，带来沁人心脾的雨后青草芳香。',
    'Impossible outdoor courtyard garden inside an underground sanctuary, soft lavender twilight sky with slow clouds, overgrown stone path flanked by translucent glowing bioluminescent flora, fresh clean air, serene paradise.',
    {
        children: ['garden_terrace', 'wilted_greenhouse', 'moss_cellar'],
        exits: [E.local('grand_atrium', '推门返回穹顶大厅')],
        items: [I.material('translucent_leaf', '流光玉叶', '花园植物脱落的半透明叶片，内部叶脉流淌着微弱的生命灵能，咀嚼能快速提神生津。', { threshold: 6 })],
        interacts: [
            act(
                '沿青石小径在林木间散步',
                '泥土与花草的清新芬芳充盈肺腑，将连日来肺腔中的铁锈味与尘土气息涤荡一空。几只散发微光的光蝶在你发梢轻巧盘旋，而后隐入花丛。',
                { repeat: 0, cost: 15, san: 5, hp: 3 }
            )
        ]
    }
)

const gardenTerraceNode = node(
    'garden_terrace',
    '云海露台',
    '由纯白汉白玉砌成的观景露台，外围环绕着爬满忍冬藤的石雕栏杆。露台正前方是无边无际的淡紫云海，天际线上缓缓流淌着如丝绢般的彩色极光。平台中央生长着一株巨大的水晶古树，伞盖般的树冠散发出温暖的琥珀色光芒，树叶互相摩挲间发出若有若无的天籁旋律。',
    'White marble balustrade terrace overlooking infinite pastel twilight cloud sea with gentle auroras, massive ancient crystal tree radiating amber warmth, stone benches, pure peace.',
    {
        interacts: [
            act(
                '在水晶树下的石凳上眺望云海极光',
                '你坐在石凳上，背靠着散发微温的树干。极光在天边变幻出宏大的波浪，树冠洒落一粒粒金色的光尘，落在肩头化为融融暖意。你闭上眼睛，享受着这偷得的一刻浮生安宁。',
                { repeat: 0, cost: 45, san: 16, hp: 8 }
            )
        ]
    }
)

const wiltedGreenhouseNode = node(
    'wilted_greenhouse',
    '光之温室',
    '一座穹顶高耸的维多利亚风格玻璃温室。虽然大部分普通花草早已化为温润的石雕，但温室正中央却凌空悬浮着一朵完全由凝固光束交织而成的奇异巨花。花瓣每隔数十秒便舒缓地变换一次柔和的色彩，随着颜色的变幻，空气中回荡起或温暖、或怀念、或宁静的微妙共鸣。',
    'Victorian wrought iron glass greenhouse, fossilized stone flowers, a singular radiant blossom made of pure condensed colored light floating in the center, soft pastel glow, magical atmosphere.',
    {
        items: [I.material('fossilized_petal', '玉石花瓣', '自然石化的高洁花瓣，质地如羊脂白玉，常用于磨制高级安神粉末。', { threshold: 8 })],
        interacts: [
            act(
                '用空瓶收集光之花滴落的凝光露水',
                '光之巨花微微倾斜花冠，几滴宛若流金的纯净液滴轻柔滑入你手中的玻璃瓶。握住瓶身，手心满溢着春天般的生机。',
                {
                    cost: 15,
                    sound: 'item_pickup',
                    san: 3,
                    gain: [I.consumable('light_dew', '光花甘露', '由纯净凝光凝华而成的神圣露水，饮用可大幅修复身躯创伤。使用恢复 35 点生命值。', [['hp', 35]])]
                }
            )
        ]
    }
)

const mossCellarNode = node(
    'moss_cellar',
    '苔藓培养窖',
    '遗忘花园下方的拱顶石窖，书斋净水循环的心脏。四壁与引水渠旁覆盖着厚厚一层散发蓝绿色冷光的荧光苔藓。清澈甘冽的地下潜流经过苔藓层层天然吸附与生物过滤，凝结为纯净的水滴，叮咚落入下方的蓄水池中。这里空气湿润凉爽，洋溢着森林深处的纯净气息。',
    'Underground vaulted stone cellar completely covered in lush bioluminescent turquoise moss, natural fresh water streams flowing through carved channels into pristine stone pool, serene living filtration.',
    {
        facility: fac(
            'facility_archive_moss_filter',
            '荧光苔藓滤水层',
            '沿地窖石壁蔓延的深生冷光苔藓，根系与地下伏流共生，吸附并代谢水体中细微的高维尘埃，自发滴落甘甜纯净的饮用水。',
            { water: 9 }
        ),
        items: [I.material('moss_sample', '荧光苔藓簇', '一小丛生机盎然的发光苔藓，具有强大的水质吸附净化能力，亦可充当永不熄灭的冷光源。', { threshold: 6, qty: 3 })],
        interacts: [
            act(
                '在水渠边捧饮甘冽的过滤泉水',
                '你俯下身，用双手捧起一汪清澈见底的泉水痛饮。水质清甜冰凉，甘冽的水流顺着食道滑下，顿时驱散了脏腑间的燥热与疲惫。',
                {
                    repeat: 0,
                    cost: 10,
                    sound: 'item_pickup',
                    san: 6,
                    hp: 4,
                    gain: [
                        I.consumable('purified_dew', '苔原净水瓶', '以水壶打满的苔藓过滤纯水，甘甜清冽。使用恢复 15 点理智与 10 点生命。', [
                            ['sanity', 15],
                            ['hp', 10]
                        ])
                    ]
                }
            )
        ]
    }
)

// ------------------ 虚空枢纽 ------------------

const voidPortalNode = node(
    'void_portal',
    '虚空裂隙',
    '书斋几何结构最底层的多维信道枢纽。这里没有实体墙壁，取而代之的是一片色彩斑斓、缓缓自转的星空涡流。多维光带如彩虹般向不同方向延展，每一个旋涡都对应着未知的广袤新领域。裂隙正中锚定着书斋投射出的金色引力光环，确保在此处的漫游者既能自由踏入未知的探索征程，亦可随时安全退回温暖明亮的穹顶大厅。',
    'Cosmic nexus gateway, swirling serene multicolored star vortexes framing an ethereal threshold, golden anchor ring of sanctuary light holding the gateway stable, epic celestial divergence.',
    {
        items: [I.material('void_fragment_portal', '纯净虚空棱晶', '在裂隙边缘凝结的方舟原铸级能量晶体，内部倒映着无数世界的微观掠影，是穿梭维度的终极奇珍。', { grade: 'ark_prime', threshold: 16 })],
        interacts: [
            act(
                '沐浴在枢纽的星河光芒中沉思',
                '无数种可能性的旋涡在你面前平缓翻卷。在这里，你不再是深渊风暴中颠沛流离的孤舟，而是手握指南针的探寻者。前路漫漫，但书斋的烛火将永远为你保留归来的座标。',
                { repeat: 0, cost: 15, san: 6 }
            )
        ],
        exits: [
            E.local('grand_atrium', '踏着烛光退回现实中枢大厅'),
            E.local('time_fracture', '攀回星辰阶梯的时间裂隙'),
            E.local('abyss_corridor', '步回静谧的深渊回廊'),
            E.transfer('步入旋转的星涡')
        ]
    }
)

// ==========================
// 3. 顶层庇护所模板流式装配
// ==========================

export const ZONE_ARCHIVE: SanctuaryTemplate = sanctuary(
    'archive',
    '烛火书斋',
    '一个位于现实夹缝中的古老图书馆，时间在这里失去流淌的意义。这里记录着过去、现在，以及未曾发生的历史。书斋并非被凡人建造，而是因人类对终极真理的渴望而被宇宙「记起」的。最后的馆长在洞察世界虚妄的真相后自愿留下，以灵魂与烛火为锁，将最危险的知识永世镇压。此间只有无人持握却沙沙作响的羽毛笔、永不燃尽的悬浮蜡烛、自发补全的编目石板，以及整座建筑沉重而慈悲的宏大呼吸。它为神智濒临崩解的漫游者提供无条件的安宁与庇护。',
    '以穹顶大厅为绝对中枢，呈放射状延伸出四道深邃侧翼：知识长廊、禁书侧翼、星辰阶梯与深渊回廊。爬满发光藤纹的侧门通向折叠在夹缝中的室外遗忘花园，而空间最深层的虚空裂隙则悬浮在时间断层与深渊尽头之间。部分几何结构遵循非欧逻辑交错折叠，兼具室外梦境与多维意识空间。',
    'Gothic Library, Dark Academia, Candlelight Haven, Floating Candles, Towering Bookshelves, Non-Euclidean Geometry, Ethereal Dust Motes, Mystical Tranquility, Cinematic Unreal Engine 5, Volumetric God Rays',
    {
        factor: 0.15,
        res: [80, 120],
        uniqueResources: [candleSeaRes, scrapsRes, medicineRes]
    },
    // 30 节点拓扑矩阵（自动推断 entrance: 'grand_atrium'、自动核算 nodesCount: 30、自动萃取各节点内联设施）
    grandAtriumNode,
    readingCorridorNode,
    readingRoomNode,
    scriptoriumNode,
    meditationChamberNode,
    translationGalleryNode,
    forbiddenWingNode,
    archiveVaultNode,
    alchemyLabNode,
    ritualCircleNode,
    bindingChamberNode,
    inkWellNode,
    curatorStudyNode,
    astralStairwayNode,
    observatoryNode,
    clockTowerNode,
    celestialMapRoomNode,
    timeFractureNode,
    abyssCorridorNode,
    mirrorLibraryNode,
    memoryTheaterNode,
    paradoxRoomNode,
    echoGalleryNode,
    dreamStudyNode,
    hypnosisChamberNode,
    forgottenGardenNode,
    gardenTerraceNode,
    wiltedGreenhouseNode,
    mossCellarNode,
    voidPortalNode
)