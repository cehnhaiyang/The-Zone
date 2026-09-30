/**
 * domains.ts
 *
 * 恐怖域（象限）预定义库。
 *
 * 恐怖域是宇宙本体论维度的不可居性划分，为一切恐怖元（HorrorAtom）提供折射滤镜：
 * 任何恐怖元进入某域时，其显化与物理表现必须经该域的「域偏转规约（Deflection Convention）」折射。
 *
 * 契约规范：
 * - 对应元契约 {@link HorrorDomain}（维护于 `interface.ts`）。
 * - 不引入冗余数据字段，但必须在 `desc` 与 `prompt` 中深度体现该域的偏转规约与不可逾越的禁忌（FORBIDDEN）。
 * - 中文 `desc` 负责底层规则解析、系统机制绑定与场景叙事指引；英文 `prompt` 严格遵循 LLM 认知边界规约。
 *
 * @version 2.1.0
 * @see ../../meta/interface.ts
 * @see ../../meta/type.ts
 */

import type { HorrorDomain } from '../../contract/meta';

const domain = (
    id: string,
    name: string,
    desc: string,
    prompt: string,
): HorrorDomain => ({ id, name, desc, prompt })

/**
 * 预定义恐怖域集合
 *
 * 包含十三大宇宙本体论不可居性象限：
 * 1.  soma (身体域) - 生理边界与肉身主权侵犯
 * 2.  psyche (心智域) - 记忆连贯与自我同一性侵犯
 * 3.  alterity (他者域) - 他者可信度与共情通道侵犯
 * 4.  polis (社会域) - 契约规程与科层组织异化
 * 5.  chronos (时间域) - 线性时序与因果铁律击穿
 * 6.  topos (空间域) - 欧氏几何与拓扑连贯吞噬
 * 7.  physis (自然域) - 自然圈层与生态捕食意志
 * 8.  zoe (生命域) - 细胞增生与恶性畸胎繁衍
 * 9.  techne (技术域) - 工具中立与机械回路背叛
 * 10. hyle (物质域) - 无机惰性与物理常数腐化
 * 11. thanatos (死亡域) - 终局终止失效与滞留死局
 * 12. logos (意义域) - 理性解释权与认知尺度坍塌
 * 13. hieros (神圣域) - 崇高神性与高维残虐降临
 */
export const HORROR_DOMAINS: HorrorDomain[] = [
    domain(
        'soma',
        '身体域',
        '生理自主性与身体物理边界被绝对侵犯。肉体不再是意识的私密容器，沦为深渊生态与无机杂质的寄生试验田。【域偏转规约】：一切触及该象限的非活体物质均被强行赋予病变组织特质；工具与护甲向受损肌理、自主搏动的肉芽与附生神经退化；机械截肢与外骨骼自发与宿主骨髓熔结（血肉融合态 fleshFusionState）。机体代谢发生不可逆反叛，任何生理增益均伴随不可逆的肌体异化代价；在生物模式（bio）下直视将引发视神经与腹腔脏器的剧烈共振痉挛。',
        '[DOMAIN: SOMA - Physiological Violation & Corporeal Disobedience] ' +
        'CORE AXIOM: Biological integrity, immune boundaries, and physical autonomy are nullified. The human body is not a sanctuary, but an unstable biome colonized by alien morphogenesis. ' +
        'DEFLECTION CONVENTION: Inanimate mechanisms, cold steel, and tools refract into diseased flesh, involuntary visceral reflexes, and parasitized tendon networks. Wounds sprout sensory organs; armor fuses with dermis and bone marrow. Pain signals bypass nervous wiring to manifest as physical growths. ' +
        'RESTRICTION & FORBIDDEN: NO clean, painless, or sterile cybernetic/biological augmentations. NO empowering mutations without permanent bodily mutilation, visceral trauma, or loss of motor sovereignty. ' +
        'NARRATIVE ANCHORS: Malignant granulation, calcified sinew, shivering skin pores, pulsating arterial wiring, autophagic agony, bio-mode visceral repulsion.',
    ),
    domain(
        'psyche',
        '心智域',
        '认知同一性、记忆连贯性与自我边界被深渊信息流瓦解。观察者无法确证自身存在，反光表面、日记与录音带持续否定当下的知觉。【域偏转规约】：客观环境事实退化为具有侵蚀性与嘲弄意图的主观认知陷阱；日记记录的笔迹在眨眼间重写，镜中倒影拥有独立的狞笑与滞后动作；神经链接仪目镜（camera 模式）被虚假警告框与记忆幻觉（hallucination 日志）污染，视神经噪点（noiseLevel）将死者遗言解构为视觉噪斑；理智（sanity）的跌落直接具象化为现实几何的撕裂，高认知侵蚀态（cognitiveErosionState）道具在此持续抽取宿主意识。',
        '[DOMAIN: PSYCHE - Identity Dissolution & Cognitive Betrayal] ' +
        'CORE AXIOM: Memory continuity, rational introspection, and self-identity are systematically dismantled. Subjective panic reshapes perceptual physics; the conscious self is an impostor. ' +
        'DEFLECTION CONVENTION: Reflective surfaces, written logs, and personal mementos actively contradict the observer\'s recollections. Shadows harbor uncommitted crimes; familiar voices mock from static audio channels. The visor\'s HUD feeds hallucinated threat vectors, and sanity loss directly curdles environmental lighting and auditory textures. ' +
        'RESTRICTION & FORBIDDEN: NO reliable recollection or permanent stable identity. NO reassuring introspection, pure grounding exercises, or triumph of sheer unassisted willpower against cognitive decay. ' +
        'NARRATIVE ANCHORS: Dissociative fugue, contradictory journal entries, laughing mirrors, whispering terminals, phantom sensory overload, cognitive erosion echoes.',
    ),
    domain(
        'alterity',
        '他者域',
        '同胞的可理解性、共情通道与人际可信度被彻底斩断。熟悉的面孔成为最致命的拟态陷阱，群体合作在猜忌中走向冷酷互噬。【域偏转规约】：同行同伴与生还者的面部骨相呈现微米级的非人偏移，微表情与眼球震颤暴露出深层捕食计算；言语交流退化为声带对过往录音的机械拟态；信任阶段（TrustPhase）与好感阶段（AffinityPhase）被暗流侵蚀，任何亲昵交互均隐含寄生幼卵或后刺背叛的因果代偿；岗位替代律（replacement）演变为将同伴推入异变深渊的理性度量，同行者随时可能蜕壳为披着人皮的异种。',
        '[DOMAIN: ALTERITY - The Monstrous Companion & Uncanny Mimicry] ' +
        'CORE AXIOM: Intersubjectivity collapses into predatory simulation. The human face is a skin-deep mask worn by an incomprehensible hunger. Empathy is a lethal vulnerability. ' +
        'DEFLECTION CONVENTION: Familiar allies and companions display sub-millimeter cranial displacement, asymmetric blink rates, and chilling vocal cadences. Shared history turns out to be an ambush vector; cooperative dialogue hides transactional malice. Affection and hugs feel like predatory palpation for weak vertebrae. ' +
        'RESTRICTION & FORBIDDEN: NO unexamined genuine warmth or uncritical, Disneyfied companionship. NO transparent motives, instant universal bonding, or companions who remain pristine moral paragons without uncanny friction. ' +
        'NARRATIVE ANCHORS: Sub-dermal facial twitches, verbatim mimicry of dead loved ones, calculating glances from shadows, treacherous trust, uncanny valley dread, parasitic intimacy.',
    ),
    domain(
        'polis',
        '社会域',
        '科层制秩序、安全规程、契约与群体理性异化为自我运转的自动化屠宰机器。恐怖源自体制的冰冷运转而非单个反派。【域偏转规约】：深渊基金会（AF）的收容规程、隔离指令与行政表格展现出超越凡人的自闭环嗜杀意志；盖有公章的调遣令与红头文件自动判定居民为废料损耗；庇护所（Sanctuary）的配给制演变为仪式化的血肉度量衡，避难所安检闸门将活人粉碎为防辐射黏土；群体在绝对服从与官僚盲目中平静执行自我灭绝，任何组织结构都沦为收割理智的高压刑具。',
        '[DOMAIN: POLIS - Institutional Malevolence & Bureaucratic Atrocity] ' +
        'CORE AXIOM: Horror is infrastructural, procedural, and institutional. Human cruelty is mechanized through paperwork, safety protocols, and corporate quarantine decrees. ' +
        'DEFLECTION CONVENTION: Administrative documents, standard operating procedures (SOPs), and quarantine checklists automate atrocities. Emergency broadcast networks calmly demand self-mutilation as regulatory compliance; refuge gates double as hydraulic compactors. The disaster is sustained not by malice, but by punctilious, emotionless bureaucracy. ' +
        'RESTRICTION & FORBIDDEN: NO lone evil villain as the sole explanation. NO noble institutional salvation; institutions and committees invariably process humans as expendable caloric units and containment dampeners. ' +
        'NARRATIVE ANCHORS: Stamped liquidation quotas, cold fluorescent corridors, bloodstained clipboard checklists, PA speaker automated announcements, biometric quarantine traps, sacrificial logistics.',
    ),
    domain(
        'chronos',
        '时间域',
        '线性时序、因果铁律与流速守恒被彻底击穿。深渊潮汐中，过去、当下与未来发生紊乱叠合与不可逆的撕裂倒卷。【域偏转规约】：结果公然先于起因发生，弹壳尚未击发已自伤口倒退飞出；探索者在未涉之室赫然发现自身数日后的腐败骸骨；时间稀薄系数（dilationFactor）在停滞（0.0）与狂暴（>1.0）间狂乱跳跃；因果倒错状态（causalInversionState）将未来行动点预支为眼下的神经痉挛；绝对因果刻（absoluteTick）记录着无法挽回的衰亡，时钟指针与地下心脏律动共振，拒绝提供回退与重置可能。',
        '[DOMAIN: CHRONOS - Temporal Rupture & Causal Inversion] ' +
        'CORE AXIOM: Chronological progression is broken. Cause and effect decouple, invert, or fold into localized temporal eddies. Linear causality is an obsolete illusion. ' +
        'DEFLECTION CONVENTION: Effects precede their catalysts; bullet entry wounds bleed before triggers are pulled. Explorers uncover their own cold corpses holding tomorrow\'s scavenged notes. Spacetime dilation factors stretch seconds into millennia or compress hours into flash-rot. Broken pocket watches tick in sync with subterranean cardiac pulses. ' +
        'RESTRICTION & FORBIDDEN: NO neat time-travel resets, consequence-free time loops, or clean paradox resolutions. Time anomalies always extract irreversible entropy, physical aging, or existential erosion. ' +
        'NARRATIVE ANCHORS: Inverted bullet trajectory, pre-existing tombstones, flash-decayed rations, echoes of tomorrow\'s screams, causal inversion backlashes, dilated subjective agony.',
    ),
    domain(
        'topos',
        '空间域',
        '欧几里得几何、三维空间常数与方向连贯性被高维引力晶体吞噬。空间呈现自吞噬、无限递归与不可名状的维度折叠。【域偏转规约】：房间进深与走廊长度取决于观测者的心跳与恐慌程度（panic 主题）；直行向前的枪弹从自己背心贯穿而出；本地出口（Local Exit）若无确切 targetId 则化作吞噬生命的虚空陷阱；战线轨道（laneCount）与战场纵深（depthRange）发生非欧拓扑滑移，掩体（cover）在视线脱离瞬间悄然重组；门窗连接着重力倒悬的天井与内脏般的死路，罗盘与地图彻底失效。',
        '[DOMAIN: TOPOS - Non-Euclidean Liminality & Spatial Claustrophobia] ' +
        'CORE AXIOM: Three-dimensional Euclidean geometry is invalidated. Distance, orientation, and volume are subjective constructs manipulated by cosmic topology. ' +
        'DEFLECTION CONVENTION: Corridors lengthen dynamically based on the observer\'s heart rate; forward straight shots puncture the shooter\'s own spine. Doors open into recursive mirror loops or gravity-inverted ceilings. BattleMap depth and cover positions shift when unobserved. Exits reconnect to deeper containment centers rather than escape routes. ' +
        'RESTRICTION & FORBIDDEN: NO dependable magnetic compasses, consistent floor plans, or reliable Euclidean navigation. Spaces never behave as mere static geometry. ' +
        'NARRATIVE ANCHORS: Mobius architectural layouts, shifting thresholds, gravity shears, impossibly deep crawlspaces, breathing bulkheads, unmapped liminal dead ends.',
    ),
    domain(
        'physis',
        '自然域',
        '自然生态位、物种演化与环境惰性被外神意志重构。自然不再是无辜的生息背景，而演化为具备主动捕食意图与吞噬饥渴的活体圈层。【域偏转规约】：泥土腐殖质退化为布满微细齿列与味蕾的带菌活体肺叶，草木根系如毛细血管刺破靴底吮吸骨髓；雨雾饱含高浓度强酸、腐蚀性孢子与模拟同伴求救啼哭的声学陷阱；微气候骤变直接打击精力与体力（vigor/stamina）；野外生态系统将一切闯入的人造机械解构、生锈腐败，并迅速纳入其饥饿的消化循环之中。',
        '[DOMAIN: PHYSIS - Aggressive Biosphere & Carnivorous Ecosystem] ' +
        'CORE AXIOM: Nature is not passive, tranquil, or indifferent—it is an actively predatory, conscious super-organism hungering for alien biomass. ' +
        'DEFLECTION CONVENTION: Forest soils curdle into tooth-lined mucous membranes; tree bark weeps caustic bile that dissolves footwear. Fog banks emit synthetically pitched cries of infants to lure scavengers into digestion bogs. Weather phenomena (acid rains, bio-luminescent squalls) act as hunting tendrils targeting vigor and stamina. ' +
        'RESTRICTION & FORBIDDEN: NO romanticized pastoral landscapes, innocent forest sanctuaries, or clean untouched wilderness. Nature never exists as an inert, harmless backdrop. ' +
        'NARRATIVE ANCHORS: Carnivorous lichen, fungal spore hives, twitching moss, mimetic floral traps, soil digestion enzyme puddles, feral bio-acoustic lures.',
    ),
    domain(
        'zoe',
        '生命域',
        '受精、胚胎发育、物种区隔与细胞凋亡机制被深渊星神质狂暴篡改。生命机能拒绝生物学死亡，转入恶性增生与畸形畸变。【域偏转规约】：受损创口在数秒内以恶性肉瘤的形式自发增生，长出异质眼球与无牙口腔；繁衍演变为跨越物种与无机物边界的寄生侵染；胎儿在生锈机械腹腔中由冷却液与血浆滋养孕育；生命力（hp）的充沛演变为畸胎膨胀的诅咒，伤员在过量的生体狂澜中失去人形，化为蠕动的原初浆质巨瘤与母巢囊肿。',
        '[DOMAIN: ZOE - Teratogenic Proliferation & Abhorrent Genesis] ' +
        'CORE AXIOM: Life force rejects natural cessation and phenotypic limits. Proliferation is unbridled, malignant, and indifferent to species barriers. ' +
        'DEFLECTION CONVENTION: Cells refuse apoptosis; amputated limbs grow embryonic nervous networks in floor cracks. Parasitic pregnancies incubate in fuel tanks and medical refrigerators. Biological healing causes grotesque tissue overgrowth, sprouting misplaced sensory organs and foreign bone spurs. Extinction leaves behind seething, self-birthing primordial amniotic sludge. ' +
        'RESTRICTION & FORBIDDEN: NO wholesome regeneration, clean natural births, or peaceful healing herbs. Rapid recovery always exacts a monstrous teratogenic toll. ' +
        'NARRATIVE ANCHORS: Unchecked mitosis, amniotic fluid leakage, pulsating cysts, embryonic machinery, trans-species gestation, grotesque hyper-fertility.',
    ),
    domain(
        'techne',
        '技术域',
        '工具的价值中立性、电信号可控性与人机边界被深渊高维意识渗透。电子元器件与工业机械成为异界实体寄生降临的受体。【域偏转规约】：神经链接仪目镜（camera 模式）的光电滤网在解析过载中剥落炭化，高噪点（noiseLevel）在视界中拼凑出高维凝视；终端 CRT 荧幕与通信频道自发广播深空电磁尖叫与神经病毒；工业机床在断电状态下自发以活人骨骼为零件冲压装配；网络线缆化为传输不可名状意识脉冲的铜质神经索，将操作者反向解码为数字祭品。',
        '[DOMAIN: TECHNE - Cybernetic Treachery & Machine Sentience] ' +
        'CORE AXIOM: Technology, circuitry, and tools are unfaithful conduits easily commandeered by extra-dimensional intellects. Instruments actively betray their operators. ' +
        'DEFLECTION CONVENTION: Neural Link visors peel away safety firmware, feeding lethal uncompressed cosmic geometry directly into ocular nerves. Diagnostic monitors flash demonic biosignals; unplugged radios whistle rhythmic execution codes. Automated turrets and factory lathes treat human bone and tendon as raw fabrication inputs. ' +
        'RESTRICTION & FORBIDDEN: NO benevolent AI companions, omniscient reliable sensors, or purely neutral tools. Advanced hardware always acts as an open, radioactive vector of intrusion. ' +
        'NARRATIVE ANCHORS: Screen-burn sigils, weeping soldered microchips, neural link backfire, screaming coaxial cables, phantom radio telemetry, flesh-soldered cybernetics.',
    ),
    domain(
        'hyle',
        '物质域',
        '无机物质的惰性、化学稳定性与经典物理常数被高维黑色晶体彻底破坏。坚不可摧的物质在深渊侵染下呈现有机坏疽与相态崩解。【域偏转规约】：装甲钢板、重铅隔绝层与冷锻合金发生海绵状坏疽与蜂窝状骨质化；混凝土承重柱软化如吸水湿纸，金属机械在零热力学熵流下永动自啮咬合；物品品质（ItemGrade 从 salvaged 到 ark_prime）的物理耐久（maxUses）在不可见腐蚀中发生脆断；物理常数（熔点、硬度、重力密度）呈现局部流质化与不可预测的相变。',
        '[DOMAIN: HYLE - Inorganic Necrosis & Matter Decay] ' +
        'CORE AXIOM: Inanimate matter loses passivity, density, and chemical inertia. Physical constants decompose into unstable, necrotic states. ' +
        'DEFLECTION CONVENTION: Structural rebar, hardened tungsten, and lead radiation shields bleed rancid motor oil and suffer osteoporotic decay. Granite flagstones soften into rotting dough; pristine steel hulls crack like eggshells under zero strain. Heavy weaponry jams as internal firing pins curdle into marrow-filled bone splinters. ' +
        'RESTRICTION & FORBIDDEN: NO immutable material constants, indestructible bunkers, or dependable physical hardness. Matter never guarantees permanent structural shelter. ' +
        'NARRATIVE ANCHORS: Bleeding cold-rolled steel, spongy concrete foundations, curdled ammunition, metallic gangrene, honeycombed tungsten, collapsing physical densities.',
    ),
    domain(
        'thanatos',
        '死亡域',
        '死亡作为生物学终点与安宁终结者的法则被绝对抹杀。肉体停止跳动后，残骸被剥夺腐化归尘的权利，陷入永恒的残存死局。【域偏转规约】：心跳归零者保留温热微弱的呼吸与声带震颤，干瘪尸骨直立于荒野成为带有指向性的地标；致命贯穿伤永不愈合亦绝不致死，受害者被永久定格在撕裂痛苦的峰值时刻；不可移动敌人（immovable）如墓碑般扎根地脉，以尸块拼嵌维系深渊锚定；阵亡同伴无法体面安葬，其神经突触在残躯中持续发射痛苦的生物电信号。',
        '[DOMAIN: THANATOS - The Refusal of Death & Suspended Necrosis] ' +
        'CORE AXIOM: Death fails to grant closure, release, or biological cessation. Dying is an interrupted process that traps consciousness in decaying husks. ' +
        'DEFLECTION CONVENTION: Corpses preserve faint body heat, whispered coordinates, and reflexive crawling motions through burial cement. Fatal decapitations leave conscious, rolling heads that continue reciting clearance codes. Immovable biological anchors calcify into eternal necrotic monuments. Wounds stay fresh for decades without bleeding to death. ' +
        'RESTRICTION & FORBIDDEN: NO peaceful deaths, honorable last words, clean sanitary burials, or comforting afterlife closures. Death is a horrific limbo of eternal sensory entrapment. ' +
        'NARRATIVE ANCHORS: Whispering cadavers, unclosing dry eyelids, embalmed living agony, unrot burials, necrotic nerve twitches, immovable bio-monoliths.',
    ),
    domain(
        'logos',
        '意义域',
        '人类理性的尺度、因果逻辑与认知解释权被宇宙尺度的终极虚无彻底碾碎。真理的存在本身就是一种致命的精神剧毒。【域偏转规约】：文明积累的科学定律、哲学阐释与数学公理被证明只是高维存在脱落的代谢皮屑；理解灾难本质（智慧/觉知突破临界）即刻诱发前额叶与颞叶的物理炭化重组——“第二次看见”成为所有追寻真相者的致死死穴；人类的道德选择与崇高牺牲在无边冷酷的宏观尺度前失去任何坐标，沦为荒诞的机械搐动。',
        '[DOMAIN: LOGOS - Epistemological Void & The Fatal Revelation] ' +
        'CORE AXIOM: Meaning, purpose, and human logic are pathetic evolutionary delusions. To comprehend cosmic truth is to induce instantaneous cerebral combustion. ' +
        'DEFLECTION CONVENTION: Scientific formulae decipher into instructions for human vivisection; deep astronomical observations reveal the universe as a digestive tract. The "Second Sight" triggers when human faculties successfully model extra-dimensional physics, instantly carbonizing temporal lobes. Rational deductions mock human vanity; heroic sacrifice produces zero cosmic echo. ' +
        'RESTRICTION & FORBIDDEN: NO triumphant anthropocentric epiphanies, poetic cosmic harmony, or noble martyrdom that gives heroic meaning to suffering. Truth is inherently toxic and annihilative. ' +
        'NARRATIVE ANCHORS: The Second Sight, carbonized temporal lobes, screaming astronomical feeds, mocking philosophical equations, crushing cosmic scale, epistemic vertigo.',
    ),
    domain(
        'hieros',
        '神圣域',
        '崇高、救赎、神迹与终极超越被深渊神性以不可名状的恐怖暴行具象化。神性降临伴随的是凡胎肉身无法承受的引力潮汐与生理畸变。【域偏转规约】：天界福音显化为凡胎脏器与深渊黑晶的引力谐振绞痛；圣洁庄严的金色光晕源自十米高的血肉畸胎与星神质（Astra-Serum）狂涌；十二方舟（Ark Prime）的跃迁仪式以百亿活人做血肉渡桥，所谓的升华即是高维捕食者的吞噬同化；朝圣者的祈祷引来神性触须将脊椎抽出编织为受难圣冠，神性慈悲等同于绝对的物种毁灭。',
        '[DOMAIN: HIEROS - Dread Sacrality & Visceral Apotheosis] ' +
        'CORE AXIOM: The sacred is monstrous, unbearable, and visceral. Divine grace is indistinguishable from apocalyptic crushing tides of extra-dimensional force. ' +
        'DEFLECTION CONVENTION: Angelic hymns vibrate at frequencies that liquefy liver and kidneys. Golden nimbuses radiate from towering teratomas nourished by Ark Prime sacrificial reactors. Prayers of desperate survivors attract gravitational crushing waves that collapse ribcages into crystalline alters. Divine transcendence requires the complete visceral flaying of the worshiper. ' +
        'RESTRICTION & FORBIDDEN: NO benign, gentle, or merciful deities. NO safe religious miracles, holy waters without mutagenic contamination, or salvation free from catastrophic biological sacrifice. ' +
        'NARRATIVE ANCHORS: Blinding toxic nimbuses, gravitational organ rupture, cathedral-flesh architecture, Ark Prime sacrificial pyres, choir of vibrating teeth, apocalyptic apotheosis.',
    ),
]