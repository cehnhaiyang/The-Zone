/**
 * atoms.ts
 *
 * 恐怖元预定义库 (Horror Atoms Predefined Library)
 *
 * 恐怖元是系统内不可再分的最小恐惧素材原子，与恐怖域 (HorrorDomain) 解耦：
 * 原子本身不承担固定域归属，只有在被恐怖美学 (HorrorAesthetic) 引用、
 * 经由主控域与干涉域的偏转规约 (Deflection Convention) 折射后，
 * 才会结合具体情境涌现为空间叙事与视觉实体。
 *
 * 契约规范：
 * - 严格对齐元契约 {@link HorrorAtom} 与叙事基底 {@link _Nar}；
 * - 紧密锚定《背景设定与世界观编年史》：深渊基金会 (AF)、阿斯克勒庇俄斯计划 (Project Asclepius)、
 *   十二方舟血肉锚点 (Ark Prime)、清理人计划 (The Cleaners)、第二次看见、双重视觉 (bio / camera)、
 *   时空稀薄系数 (dilationFactor)、记忆金字塔 (α-δ)、岗位替代律 (replacement) 与三重深渊异态；
 * - 英文 Prompt 针对 LLM 环境理解与 Diffusion/Transformer 视觉模型双重优化。
 *
 * @version 2.3.0
 * @see ../../meta/interface.ts
 * @see ../../meta/type.ts
 */

import type { HorrorAtom } from '../../contract/meta';

/**
 * 恐怖元构造辅助函数
 * 字段与 _Nar 一一对应，保持数据表紧凑可读。
 */
const atom = (
    id: string,
    name: string,
    desc: string,
    prompt: string,
): HorrorAtom => ({ id, name, desc, prompt })

export const HORROR_ATOMS: HorrorAtom[] = [
    // =========================================================================
    // 1. 机体异化、生物机械共生与生化改质 (Biomechanical Mutation & Flesh Synthesis)
    // =========================================================================
    atom(
        'flesh_gear',
        '血肉齿轮',
        '皮下机械齿轮与肌腱筋膜粗暴咬合，骨骼成为传动连杆，每一次微小抽搐都伴随碎肉研磨与齿轮空转。',
        'Exposed oxidized steel gears grinding violently under living subdermal fascia, skeletal bones serving as mechanical connecting rods, driven by involuntary muscle twitches, dark bodily fluid acting as lubricant.',
    ),
    atom(
        'hydraulic_vein',
        '液压血管',
        '循环血管被耐腐蚀黑橡胶软管替代，暗色黏稠高压合成液伴随心搏轰鸣喷涌，管壁在皮下剧烈鼓胀抽动。',
        'Circulatory veins surgically replaced by pulsating industrial hydraulic lines, leaking viscous black synthetic serum under violent systolic pressure, skin stretching transparently around rubberized tubing.',
    ),
    atom(
        'bone_metal_fusion',
        '骨金属融合',
        '外骨骼钛合金与人骨发生分子级不可逆嵌合，金属晶格刺入骨髓腔，强行剥离即刻骨肉俱碎。',
        'Skeletal frame and femurs fused irreversibly with aerospace titanium trusses at a molecular level, traction brackets boring into marrow canals, any forced removal causing catastrophic bone splintering.',
    ),
    atom(
        'involuntary_augmentation',
        '非自愿改造',
        '手术在失去知觉或无麻醉下发生，机体被持续粗暴改造且永远无法逆转，体内零件刻着未知的实验批号。',
        'Crude irreversible surgical augmentations performed without anesthesia, bolted steel plates and pneumatic implants spreading through living tissue, stamped with cold corporate serial numbers.',
    ),
    atom(
        'parasite_spine',
        '脊椎寄生',
        '异种神经纤维死死缠绕中枢脊髓，既强行泵注不可知力量，又彻底剥夺对四肢行动的主导权。',
        'A predatory biological parasite coiling tendrils tight around spinal vertebrae, hijacking neuromuscular locomotive functions while pumping high-adrenaline synthetic toxins into the brainstem.',
    ),
    atom(
        'leukotomy_scar',
        '脑白质切除瘢痕',
        '眼眶上方眶骨粗暴凿穿的陈旧穿刺瘢痕，情绪与恐惧中枢已被物理刮除，瞳孔仅剩冰冷的条件反射。',
        'Rough transorbital puncture scars above the eye sockets from crude lobotomy, complex human emotions and terror excised, leaving only dead stare and mechanical motor reflexes.',
    ),
    atom(
        'astra_infusion',
        '星神质浸润',
        '极高浓度的黑色晶体原液在静脉中分枝结晶，将造血干细胞转化为导电胶质，血管泛出不祥的漆黑微光。',
        'Branching black crystalline Astra-Serum spreading through capillary beds, transmuting biological bone marrow into semi-conductive dark resin, obsidian veins visible beneath pale translucent dermis.',
    ),
    atom(
        'iv_rack_fusion',
        '输液钢架畸交',
        '病患骨节与医用牵引滑轮、不锈钢输液钢架深度增生粘连，潮红的肉芽死死包裹着镀铬金属管件。',
        'Human spinal column and joints overgrown around stainless steel orthopedic traction pulleys and hospital IV poles, inflamed pink granulation tissue swallowing rusted chromium tubes.',
    ),
    atom(
        'living_soil',
        '活体泥土',
        '地表泥土由层层坏死脂肪、微细毛细管与神经末梢构成，踩踏重压时引发泥土深处微弱的痉挛与抽搐。',
        'Ground loam behaving as living subdermal stratum, rich in active pulsating capillaries and twitching sensory nerves, weeping oily lymphatic fluid beneath heavy combat boots.',
    ),
    atom(
        'flesh_mould_substrate',
        '菌丝肉质基底',
        '地面与排污管道覆盖着不断律动的暗粉色肉膜，肉膜上生满微型吸盘，贪婪吸收每一滴滴落的体液。',
        'Pulsating mycelial meat carpeting damp walls and steel floor grids, lined with microscopic biological suckers that eagerly absorb droplets of sweat and spilled blood.',
    ),
    atom(
        'flesh_fusion_relic',
        '共生武装黏连',
        '枪械握把与掌骨深层愈合，皮下神经束直接接驳扳机击发机构，卸下武器等同于活生生剥去整面手掌皮肉。',
        'A firearm receiver permanently bonded to metacarpal bones by fibrous tendrils, neural endings hardwired to the trigger mechanism, impossible to drop without shearing living flesh and nerves.',
    ),
    atom(
        'vertebral_chimney',
        '脊椎排烟管',
        '背部胸椎被强行开孔接驳微型柴油排气烟囱，每次剧烈呼吸都伴随灼热黑烟与带血机油的喷吐。',
        'Exhaust chimney grafted onto thoracic vertebrae, venting hot sulfurous diesel smoke and aerosolized blood with every agonizing expansion of the lungs.',
    ),
    atom(
        'subdermal_clockwork',
        '皮下发条齿轮',
        '皮肤下方紧绷的发条机构自行啮合运转，外露的发条旋钮穿透皮肉，每隔数秒便发出微弱的发条卡嗒声与机油腥味。',
        'Intricate brass clockwork gears rotating incessantly beneath paper-thin subdermal tissue, winding keys protruding through necrotic dermis, releasing rhythmic metallic clicks and rancid grease.',
    ),
    atom(
        'tendon_cable_splicing',
        '肌腱线缆绞接',
        '断裂的跟腱与多股铜芯导线直接粗糙绞合打结，生物神经电脉冲与高压工业电流产生谐振，诱发无法平息的高频抽搐。',
        'Severed calcaneal tendons crudely spliced with multistrand copper wires and electrical tape, raw biological pulses arcing violently with synthetic industrial current.',
    ),
    atom(
        'petrified_marrow',
        '骨髓石化晶簇',
        '造血干细胞完全被深渊黑晶晶格占据，骨骼沉重如铸铁，发生剧烈钝击骨折时崩裂出深黑锋利的玻璃质结晶截面。',
        'Bone marrow cavities mineralized into dense, razor-sharp black crystal lattices, bones heavy as cast iron, shattering under trauma into glassy obsidian splinters.',
    ),
    atom(
        'grafted_respirator',
        '面部呼吸机嵌合',
        '防毒面具橡胶裙边与面颊肌肉深度坏疽粘连，呼气活瓣直接穿透气管切开孔，每次急促喘息都伴随脓液气泡的碎裂声。',
        'A vulcanized combat respirator fused permanently with facial musculature, exhalation valves embedded into a raw tracheotomy hole, hissing with aerosolized purulent fluids.',
    ),
    atom(
        'thoracic_rib_cage_prison',
        '胸腔外翻骨栅',
        '两侧肋骨反向破开胸膛向外狂乱增生，化作笼罩胸腹腔的白浊骨栅，内部悬挂着在阴冷潮湿空气中持续搏动的黑色心肌。',
        'Thoracic rib cage bursting outward and curving around the torso like a cage of bleached bone, exposing a soot-blackened living heart pulsating in the damp, freezing fog.',
    ),
    atom(
        'ocular_socket_wiring',
        '眼眶电极贯穿',
        '眼球被活体挖空的凹陷眶穴内塞满微型同轴电缆与发光元件，电流直接烧灼视神经突触，眼眶终日渗出黑色凝胶。',
        'Excised ocular cavities packed with coarse micro-coaxial cables and flickering diodes, direct electrical stimulation frying the optic chiasm and leaking black resinous fluid.',
    ),
    atom(
        'flesh_welded_armor',
        '血肉焊死装甲',
        '重型铅硼合金防弹板通过粗螺栓直接打入锁骨与胸骨，金属与肌肉交界处增生出翻卷的暗红肉芽与焦黑焊渣。',
        'Heavy lead-boron composite ballistic plates bolted directly into clavicles and sternum, jagged welding slag encrusted with weeping, hypertrophic pink granulation tissue.',
    ),
    atom(
        'bionic_trachea_drone',
        '生化气管啸鸣',
        '受损气管被置换为多孔钛合金谐振套管，只要有气体进出胸腔，便不受控制地向四周广播超低频引力低语。',
        'Damaged biological trachea replaced by a perforated titanium resonator sleeve, emitting uncontrollable infrasonic abyssal drones with every strained breath.',
    ),
    atom(
        'chitin_joint_spurs',
        '节肢化骨突',
        '肘部与膝关节滑膜腔内爆发出节肢动物般的角质硬刺，每一次屈伸都在关节囊内强行研磨出尖锐刺耳的骨质碎响。',
        'Hardened chitinous arthropod spurs erupting from synovial joint capsules, grinding violently against patellas and olecranons with every agonized stride.',
    ),
    atom(
        'pulmonary_spore_fruiting',
        '肺泡子实体',
        '深渊孢子在肺叶内部彻底萌发，肉质菌柄穿破胸膜与肋间隙伸出体外，随着剧烈咳嗽向四周喷吐带血的暗绿微光孢子烟雾。',
        'Fleshy fungal fruiting bodies germinating inside pulmonary lobes, caps bursting through intercostal spaces to expel luminescent crimson-green spore dust upon coughing.',
    ),

    // =========================================================================
    // 2. 认知解构、双重视觉与真视顿悟 (Cognitive Rupture, Dual Perception & Second Sight)
    // =========================================================================
    atom(
        'memory_contradiction',
        '矛盾记忆',
        '生还者对同一核心历史事件持有细节详实却完全互斥的记忆，且各自怀揣着真实存在的物理物证。',
        'Multiple survivors possess vivid, intricate, yet completely irreconcilable memories of the same event, each presenting weathered physical artifacts that validate their impossible accounts.',
    ),
    atom(
        'rewriting_text',
        '自重写文字',
        '纸张或战术终端上的日志在视线移开的刹那自行改写，无声否定上一个节拍被记录的全部事实。',
        'System logs and penciled field notes subtly morphing and re-authoring themselves whenever unobserved, actively negating previously documented empirical observations.',
    ),
    atom(
        'stranger_mirror',
        '镜中陌生人',
        '反光表面映照出的面容呈现微弱但致命的陌生意图，倒影的呼吸节奏与目光转动比肉身慢半秒。',
        'Reflections on glass surfaces lagging half a second behind physical reality, staring back with cold, calculated hostility and subtle anatomical deviations.',
    ),
    atom(
        'false_diary',
        '伪日记',
        '在随身贴身笔记本中翻出笔迹完全属于自己、却巨细靡遗记载着自己骇人暴行的未知日记页。',
        'A personal journal written unmistakably in one\'s own distinct handwriting, detailing horrific, calculated atrocities that the reader has absolutely zero recollection of committing.',
    ),
    atom(
        'identity_blur',
        '身份模糊',
        '自己的姓名、军籍编号与至亲面容在大脑记忆库中退化为不可解析的杂音字符与空白噪点。',
        'Personal names, military identification tags, and the faces of loved ones decaying into scrambled digital static and unparseable phonetic noise in the mind.',
    ),
    atom(
        'hallucination_overlay',
        '幻觉叠加',
        '视野中叠加出现与三维现实同等物理质感的重影——根本不存在的锈门、婴儿啼哭与滑动的黑色阴影。',
        'Sensory overlays projecting hyper-realistic phantom environments into physical space, auditory tracks of screaming children harmonizing with nonexistent rusted doors.',
    ),
    atom(
        'second_sight_epiphany',
        '第二次看见',
        '目镜过滤降维失败瞬间，前额叶直接解码高维多维拓扑结构带来的致死顿悟，颞叶三秒内炭化重组。',
        'Terminal cognitive rupture as protective visor filters shatter, exposing naked human retinas to hyper-dimensional geometries, incinerating the temporal lobes in flash lucidity.',
    ),
    atom(
        'semantic_melting',
        '语义融解',
        '从喉咙发出的词汇与词义永久剥离，吐出舌尖时融化为湿黏、断续、无法被解析为语法的异种音节。',
        'Spoken vocabulary peeling away from underlying conceptual meanings, words dissolving on the tongue into wet, alien phonemes that shatter linguistic comprehension.',
    ),
    atom(
        'concept_predation',
        '概念捕食',
        '某种不可见的高维存在有选择性地从大脑中精准咬食概念，受害者彻底忘记“家”、“退路”或“睡眠”的含义。',
        'An unseen dimensional predator methodically devouring foundational psychological anchors like "safety", "retreat", or "mother" directly from cognitive synapses.',
    ),
    atom(
        'visual_static_delusion',
        '高斯噪点妄想',
        '视野边缘跳动的绿色光电噪点不断自组织排列，在黑暗角落拼凑出嘲弄的微笑与无处不在的眼球。',
        'Phosphor noise along visor margins organizing autonomously into grinning faces and clusters of blinking ocular shapes waiting in peripheral vision.',
    ),
    atom(
        'ontological_drift',
        '本体论漂移',
        '客观物质的坚固性随理智下降而虚化，抚摸沉重的水泥防爆墙如同抚摸一张薄脆易烂的湿纸。',
        'Physical permanence decaying alongside psychological stability; reinforced concrete bunkers feel soft, hollow, and fragile like damp papier-mâché under trembling fingers.',
    ),
    atom(
        'bio_retinal_burn',
        '肉眼视网膜灼痕',
        '脱离目镜直视深渊，未经净化的深渊微光在角膜上烙下永不消退的高维几何灼痕，眼底渗出黑血。',
        'Unfiltered raw abyssal exposure burning intricate geometric glyphs directly onto living corneas, causing dark ocular hemorrhaging and irreversible visual madness.',
    ),
    atom(
        'camera_wireframe_dehumanization',
        '目镜线框去人性化',
        '神经链接仪将受创同伴的哭喊与断肢冷酷过滤为一组绿色线框骨架与百分比损耗指标，剥离了全部人性悲悯。',
        'Combat HUD reducing a screaming, bleeding squadmate into sterile green wireframes and damage percentages, sanitizing visceral butchery into clinical geometry.',
    ),
    atom(
        'neural_static_drone',
        '神经底噪长鸣',
        '只要开启机械过滤通道，潮湿刺耳的高频蜂鸣便如湿蛆钻动耳膜，随噪点等级上升而演变为颅骨共振。',
        'A damp, piercing, high-frequency electromagnetic drone shrieking endlessly against the eardrums during camera mode, escalating into violent skull-rattling resonance.',
    ),
    atom(
        'deterministic_sequence_dread',
        '定数序列惊怖',
        '觉知突破临界后，眼前提前显化出未来数秒内自身攻击尽数落空、胸膛被贯穿的绝对因果定数。',
        'High awareness projecting unavoidable combat sequences onto the visual cortex, forcing the warrior to witness their own future misses and fatal decapitation seconds beforehand.',
    ),
    atom(
        'red_box_sanitization',
        '色块脱敏遮罩',
        '神经过滤算法将开膛破肚的血腥惨状粗暴遮盖为一块跳动的扁平红框，然而红框之下依然传来抓挠地面的绝望指甲声。',
        'Visor algorithms censoring eviscerated squadmates beneath blinking flat crimson bounding boxes, while acoustic feeds still capture bloody fingernails scratching the steel grating.',
    ),
    atom(
        'phantom_limb_tactics',
        '虚肢战术代偿',
        '在目镜线框指引下清晰感知到空荡荡的断臂仍在沉稳举枪瞄准，HUD视界里忠实刷新着幽灵断肢的虚拟射击参数。',
        'Phantom limb syndrome weaponized by neural link telemetry; the warrior clearly feels an amputated arm raising a rifle, complete with phantom ammo counters on the HUD.',
    ),
    atom(
        'auditory_delay_echo',
        '听觉滞后残响',
        '十分钟前发射的枪声与咽喉濒死绝鸣，在房间彻底陷入死寂后，突然以震耳欲聋的声压从空无一物的后颈爆响。',
        'Acoustic events lagging ten minutes behind reality; gunshot echoes and dying gasps detonating at deafening volume from an empty corner long after the violence ended.',
    ),
    atom(
        'shadow_asymmetry',
        '影子异动',
        '投射在防爆墙上的自身阴影比躯体动作快整整两秒，正悄无声息地从阴影腰间拔出虚幻的战术利刃。',
        'Cast shadow on reinforced concrete blast walls moving two seconds ahead of the body, silently drawing a spectral combat knife from an impossible angle.',
    ),
    atom(
        'phantom_threat_telemetry',
        '虚假威胁遥测',
        '目镜不断跳出半径五米内存在50级致命高维集群的鲜红警报，但切换至肉眼模式，空旷走廊中除冷凝水滴外空无一物。',
        'Visor HUD flashing maximum-threat level-50 entity proximity warnings, while naked eyes reveal only a desolate, dripping concrete corridor devoid of life.',
    ),
    atom(
        'language_erosion_stutter',
        '语序逆流谵妄',
        '试图向同伴呼救时，声带吐出的音节强制遵循倒装语法与异种辅音，将“快跑”发音为带粘液拉丝的逆向颤音。',
        'Spoken distress calls hijacked by alien inverted syntax, human vocal cords forcibly articulating "run" into wet, retrograde glottal clicks.',
    ),
    atom(
        'awareness_threshold_chills',
        '觉知破阶寒噤',
        '觉知属性突破50大关时引发生理性骨髓寒战，眼角余光开始时刻捕获自身数种死亡死状的半透明全息重影。',
        'Perceptual breakthrough at awareness 50 inducing deep marrow chills; peripheral vision permanently clouded by translucent specters of one\'s own impending deaths.',
    ),

    // =========================================================================
    // 3. 时空湍流、因果折叠与非欧拓扑 (Spacetime Turbulence, Causal Inversion & Topology)
    // =========================================================================
    atom(
        'frozen_explosion',
        '冻结爆炸',
        '爆轰火球与冲击波碎片凝固在半空中化为静止玻璃态，核心热量仍在不可见的高维维度疯狂累积。',
        'A violent artillery detonation frozen motionless in mid-air; flame petals crystalized into fragile glass while invisible thermodynamic energy continues compounding within.',
    ),
    atom(
        'reversed_rain',
        '倒流黑雨',
        '带有化学腐蚀性的黏稠黑雨从地面积水倒流升入铅色穹顶，撕扯地面的残骸并逆流汇聚。',
        'Corrosive black droplets defying gravity, accelerating upward from radioactive puddles into leaden overcast clouds, carrying bone fragments in inverted ballistic arcs.',
    ),
    atom(
        'looping_event',
        '循环事件',
        '一具特勤干员尸体每隔三十秒重演一次跌落、折断颈椎并发出清脆脆响的死亡因果闭环。',
        'A dead operative endlessly re-enacting the exact moment of a fatal stairway fall every thirty seconds, neck vertebrae snapping with identical acoustic pitch forever.',
    ),
    atom(
        'future_corpse',
        '未来尸骨',
        '在未曾涉足的封闭密室深处，赫然发现身着自己现穿装备、死状凄惨且持有自己军牌的干瘪遗骸。',
        'Unsealing a pristine vault only to discover one\'s own dehydrated corpse wearing today\'s exact tactical loadout, matching serial tags, and fatal puncture wounds.',
    ),
    atom(
        'causal_inversion',
        '因果倒置',
        '胸膛先撕裂喷血并承受撕心裂肺的剧痛，数秒之后远处才传来敌人的枪栓拉响与狙击轰鸣。',
        'Wounds tearing open and blood spraying across walls seconds before the sniper rifle on the distant ridge is even raised or fired; effect preceding cause.',
    ),
    atom(
        'future_broadcast',
        '未来广播',
        '短波收音机扬声器沙沙作响，冷酷播报着三小时后己方小队在当前坐标被异化怪物全歼的详细讣告。',
        'Military transceivers playing clear emergency dispatches reporting the complete demise of the listener\'s squad, three hours before the ambush actually takes place.',
    ),
    atom(
        'dilation_stagnation',
        '时空绝对固化',
        '时空稀薄系数降至零点，空气凝固如沉重石膏，受创者无法眨眼，甚至无法感知自身已被齐颈斩断。',
        'A zero-dilation pocket (dilationFactor=0) where air freezes solid like gypsum; light halts, heartbeats pause, and severed arteries fail to spill suspended blood droplets.',
    ),
    atom(
        'runaway_temporal_decay',
        '狂暴时空冲刷',
        '时间流速呈数百倍疯狂暴涨，战术手电在半分钟内电池耗尽，裸露的伤口以肉眼可见的速度发黑溃烂。',
        'Runaway temporal acceleration (dilationFactor>1) causing lithium batteries to drain and fresh flesh wounds to turn necrotic and putrefy in mere seconds.',
    ),
    atom(
        'descent_seventy_two',
        '降临七十二小时残响',
        '电台磁带无休止循环播放着降临之初播音员从惊恐哭泣逐渐演变为喉管异化撕裂的七十二小时实况。',
        'Degraded magnetic tapes broadcasting the initial 72 hours of The Descent, capturing radio anchors descending from desperate news reports into wet, chittering glossolalia.',
    ),
    atom(
        'non_euclid_angle',
        '非欧角度',
        '走廊拐角内角之和超过三百六十度，沿右方笔直射击的弹丸却诡异地从左侧墙壁反弹击中自身后背。',
        'Corridors intersecting at impossible non-Euclidean angles exceeding 360 degrees; firing a high-velocity slug dead ahead causes it to ricochet into one\'s own kidney.',
    ),
    atom(
        'larger_inside',
        '内部更大',
        '一间外部仅两米见方的生锈警卫岗亭，拉开铁门后却是一座深不见底、回荡着机械轰鸣的万米巨构深渊。',
        'A rusted two-meter security booth whose doorway opens into an echoing subterranean chasm stretching kilometers into the planetary crust.',
    ),
    atom(
        'infinite_corridor',
        '无限走廊',
        '走廊两侧的防爆门以完全相同的斑驳锈痕与门牌号循环排列，前行十公里依然停留在绝对原点。',
        'A brutalist hallway endlessly repeating the exact same chipped paint, flickering fluorescent tube, and door number 104 with zero actual spatial displacement.',
    ),
    atom(
        'liminal_space',
        '阈限空间',
        '空无一物的昏黄地下停车场或贴满泛黄瓷砖的淋浴室，被彻底剥离了一切人类使用痕迹与出口导向。',
        'Vast sprawling subterranean chambers clad in yellowed ceramic tiles and stagnant ankle-deep water, utterly devoid of purpose, natural sunlight, shadows, or exits.',
    ),
    atom(
        'claustrophobic_seal',
        '幽闭封闭',
        '两侧生满暗色霉斑的水泥墙壁正以微不可察的速度向中心靠拢，缓慢而坚定地压榨最后的生存立足点。',
        'Concrete blast walls creeping inward millimeter by millimeter, displacing oxygen and inexorably crushing the trespasser into a narrow vertical crevice.',
    ),
    atom(
        'impossible_exit',
        '无出口',
        '每一扇标有绿色安全出口荧光标记的逃生门，拉开后都是一堵冷冰冰浇筑着活人毛发与骨渣的实心铅墙。',
        'Luminescent emergency fire exits swinging open to reveal solid, impenetrable lead bulkheads embedded with severed human hair and shattered jaw fragments.',
    ),
    atom(
        'morphing_corridor',
        '自折叠回廊',
        '受黑色晶体拓扑影响，通道几何构造随观察者心跳剧烈翻折，转过街角赫然直视自己冰冷的后颈。',
        'Corridor geometry folding along a continuous Mobius strip triggered by cardiac rhythm; rounding the next corner leaves the traveler facing their own retreating silhouette.',
    ),
    atom(
        'submerged_street',
        '沉没街道',
        '旧都会柏油马路垂直下垂沉入无底深黑沥青海，路灯在数千米冰冷死水深处泛出惨白无助的光晕。',
        'Flooded metropolitan avenues plunging vertically into an abyss of motionless black crude; functional streetlights casting ghostly cones of light beneath abyssal waters.',
    ),
    atom(
        'crushed_depth',
        '压溃深度',
        '极端重力与高维因果应力凝聚于胸腔，骨骼发出细密爆裂声，每一次喘息都如直接吸入滚烫的水银。',
        'Extreme localized gravity and dimensional torsion crushing the rib cage, internal capillaries bursting as atmospheric pressure mimics the abyssal ocean floor.',
    ),
    atom(
        'temporal_shearing_wound',
        '时空剪切撕裂',
        '躯体跨越在两道流速悬殊的时空裂隙边缘，左侧手臂在数秒内自然老化结痂风化，右侧伤口仍停留在最初喷血的冻结时刻。',
        'A body caught across a steep temporal shear boundary; left arm aging decades into brittle bone while right side remains locked in the instant of arterial rupture.',
    ),
    atom(
        'suspended_blood_orbs',
        '滞空悬浮血珠',
        '零时空稀薄度领域中，割裂颈动脉喷涌的鲜血化作数百颗绝对静止的血红珍珠悬浮于空气，形成无法穿越的血雾帘幕。',
        'In a zero-dilation stasis field, sprays of arterial blood hang frozen in mid-air as hundreds of perfect, motionless crimson pearls forming a macabre beaded curtain.',
    ),
    atom(
        'ballistic_trajectory_fold',
        '弹道拓扑回折',
        '击发的高速步枪弹丸沿弯曲的非欧空间曲率回旋，在绕过三道防爆承重墙后，从死角精准撞击射击者自己的陶瓷防弹插板。',
        'A fired high-velocity rifle slug traveling along curved non-Euclidean manifold space, looping behind structural pillars to strike the shooter\'s own ceramic trauma plate.',
    ),
    atom(
        'recursive_doorway',
        '递归门扉',
        '推开生锈的防火隔断门踏入前厅，回身却赫然发现门洞内部正是自己刚刚跨出的房间，视野内呈现无限缩小的自身背影镜像。',
        'Pushing open a rusted fire door to enter a chamber, only to turn around and see the exact same room repeating infinitely through the doorway like nested Russian dolls.',
    ),
    atom(
        'gravity_inversion_well',
        '局部重力反转井',
        '跨过警戒黄线的瞬间天顶与地面瞬间颠倒，整个人以自由落体速度重重砸向悬挂着高压管线与锈蚀日光灯管的水泥天花板。',
        'Gravitational vectors flipping 180 degrees upon crossing an amber safety line, plunging the survivor violently upward against the industrial pipe-clad ceiling.',
    ),
    atom(
        'shattered_clock_cycle',
        '破碎周期残律',
        '区域内的主观认知刻（tick）陷入癫狂抖动，环境照明以每秒数十次的暴烈频率在白昼与漆黑间闪切，撕裂神经传导。',
        'Subjective cognitive ticks vibrating erratically; ambient illumination oscillating violently between blinding daylight and absolute abyss dozens of times per second.',
    ),

    // =========================================================================
    // 4. 虚妄伪物、社会结构暴力与岗位替代 (Mimicry, Structural Cruelty & Replacement)
    // =========================================================================
    atom(
        'fake_person',
        '伪人',
        '朝夕相处的同伴骨相发生了半毫米的微调，呼吸频率与语气看似无懈可击，眼底深处却毫无人类情感。',
        'A lifelong companion replaced by a biological mimic; micro-expressions, gait, and vocal cadences are 99% identical, but beneath the pupils lies a cold predatory void.',
    ),
    atom(
        'independent_reflection',
        '独立倒影',
        '积水或碎裂屏幕里的倒影拥有独立的行动轴心，在本体转身离开时依然伫立原处，嘴角缓缓咧开。',
        'A reflection in shattered glass that refuses to mimic movement, remaining stationary to watch the protagonist retreat before flashing a wide, unnatural grin.',
    ),
    atom(
        'dead_voice',
        '死者声音',
        '早已确认阵亡的特工的声音通过对讲机盲端不断播发撤离坐标，背景音中混杂着湿润的咀嚼吞咽声。',
        'Deceased squad members whispering urgent coordinates over encrypted radio channels, accompanied by the wet acoustic crunching of raw bone and marrow.',
    ),
    atom(
        'silent_watchers',
        '无声注视者',
        '废弃建筑通风井、下水道格栅与墙壁孔洞深处，密集挤压着永不眨动的白浊眼球，无声注视着过客。',
        'Dense clusters of milky, unblinking human eyes packed tightly within ventilation grates and masonry fissures, tracking movement in complete, breathless silence.',
    ),
    atom(
        'untrustworthy_companion',
        '不可信同伴',
        '随行同伴的体征读数与口头承诺产生剧烈割裂，手指始终隐蔽搭在手枪保险栓上，瞳孔在阴影中震颤。',
        'A squad member whose verbal reassurance directly contradicts spiked telemetry monitors; hand subtly hovering over the weapon holster with predatory intent.',
    ),
    atom(
        'institutional_sacrifice',
        '制度献祭',
        '避难所管委会依据冰冷严密的官僚表格与抽签轮盘，按既定配额将重伤员与老人送入深坑作为缓冲祭品。',
        'A totalitarian shelter bureaucracy utilizing pristine spreadsheets and lottery wheels to methodically feed surplus citizens into the abyss to appease environmental stress.',
    ),
    atom(
        'rule_as_monster',
        '规则怪物',
        '避难区张贴的泛黄安全守则本身具备捕食活性，违抗第三条守则者的面部器官会在数秒内抹平成白板。',
        'Civilian shelter safety rules possessing sentient predatory agency; violating protocol number three causes facial features to erase into blank skin within heartbeats.',
    ),
    atom(
        'forced_ritual',
        '强制仪式',
        '据点所有居民每日破晓举行剥离指甲的集体祷祝，拒绝参与者被即刻打上异教烙印并推下护城壕。',
        'Mandatory communal prayers where citizens ritualistically strip their own fingernails at dawn, treating non-compliance as a capital crime punishable by defenestration.',
    ),
    atom(
        'classification_expulsion',
        '分类驱逐',
        '依据神经链接仪读数将劳动价值垫底的生还者贴上耗材标签，粗暴缴械推入无任何防护的浓硫酸雾区。',
        'Logistical algorithms cataloging low-utility refugees into "scrap" tiers, stripping their respirators before herding them past the blast doors into acidic fogs.',
    ),
    atom(
        'collective_joy_horror',
        '集体欢庆恐怖',
        '整座避难所的人群伴随狂欢留声机音乐将同胞肢解分食，所有人脸上洋溢着发自肺腑的圣洁宁静微笑。',
        'An entire bunker community joyfully laughing and sharing a butchered comrade beneath celebratory banners, their serene, blissful smiles utterly devoid of malice.',
    ),
    atom(
        'asclepius_protocol',
        '阿斯克勒庇俄斯规程',
        '以医学救赎之名将地下七层全面转为活体切片流水线，将伤患与异化标本作为提纯星神质的培养基。',
        'The Asclepius Protocol operating in deep B7 labs: automated vivisection tables distilling fresh human cerebrospinal fluid and nerve bundles into Astra-Serum vials.',
    ),
    atom(
        'replacement_lottery',
        '岗位替代抽签',
        '柴油-生物混合发电机需活人体温阻隔辐射，每日通过生锈轮盘抽选生者，用铁链将其中选者锁死在操作台。',
        'A rusted lottery system forcing survivors to draw lots, chaining the loser directly to the radioactive core of the hybrid generator to maintain output with biological warmth.',
    ),
    atom(
        'cleaner_reclamation',
        '清理人灭口',
        '脑白质切除的特勤作战单位手持消音卡宾枪，机械化清理一切带菌目击者、撕毁档案并焚毁尸坑。',
        'Lobotomized Cleaner task forces sweeping residential wards with suppressed carbines, methodically terminating all biological witnesses and incinerating paper archives.',
    ),
    atom(
        'ark_abandonment',
        '方舟弃民遗恨',
        '在终端废墟中拼凑出方舟总图，绝望地证实地表百亿生灵从一开始就是为方舟引力跃迁准备的耗材诱饵。',
        'Recovered Ark Prime telemetry revealing that 10 billion surface citizens were deliberately orchestrated to suffer and die as a mass neural gravity anchor.',
    ),
    atom(
        'post_replacement_chain',
        '岗位锁链枷锁',
        '由于严苛的岗位替代律限制，焊死在水循环加压阀门上的老技工皮肉早已与铸铁手轮长死，唯有找到具备同等体能属性的替死者才能换下铁枷。',
        'Severe replacement laws binding an aged mechanic to the water valve wheel; flesh permanently fused to cast iron until a living substitute of equal stamina is chained.',
    ),
    atom(
        'bureaucratic_euthanasia',
        '官僚安乐死通告',
        '避难所管理处下达盖有鲜红公章的黄色复写通知单，冷静礼貌地通知受领人因热量赤字超标，须在破晓前携带通知书自投焚尸炉。',
        'Yellow carbon-copy eviction notices stamped by shelter officials, politely requesting citizens with caloric deficits to report calmly to the incinerator chute before dawn.',
    ),
    atom(
        'false_rescue_transceiver',
        '虚假撤离信标',
        '废弃广播发射塔按军用制式频率循环广播虚构的“最后撤离点”，引诱幸存小队踏入早已布设完毕的神经切片陷阱。',
        'Automated military distress repeaters broadcasting coordinates to a nonexistent sanctuary, luring wandering refugee squads directly into industrial abattoir traps.',
    ),
    atom(
        'companion_defend_alienation',
        '同伴离心背弃',
        '好感度跌入负区间的随行同伴在夜间轮值时，冰冷的目光死死凝视着玩家后颈，握着手枪击锤的拇指在黑暗中反复轻微扳动。',
        'A disaffected companion with negative affinity watching the player sleep; their thumb rhythmically cocking and uncocking the pistol hammer in absolute silence.',
    ),
    atom(
        'shelter_resource_cannibalism',
        '配额剥夺处决',
        '当庇护所食物读数归零时，全体居民在静默中自发依据战斗等级投票，将理智值垫底的伤患逐个推出外层绝缘闸门。',
        'Silent voting rituals as shelter food reserves hit zero, disenfranchising low-sanity refugees and systematically expelling them beyond thermal blast gates.',
    ),
    atom(
        'mask_of_composure',
        '强笑镇定缝线',
        '难民们用粗尼龙黑线将自己的嘴角两侧永久向上提拉缝合在颧骨上，以此在清晨管委会的理智抽检中证明自己“绝无抑郁反常”。',
        'Citizens stitching the corners of their mouths to their cheekbones with coarse nylon thread to project mandatory cheerfulness during morning sanity inspections.',
    ),
    atom(
        'mimic_companion_gait',
        '拟态微动停滞',
        '身旁的同伴虽然举止语气与生前一模一样，但其颈动脉完全没有脉搏起伏，在说话间隙其瞳孔如同老旧相机的光圈叶片般无声收缩。',
        'A companion whose speech and mannerisms are flawless, yet their carotid artery is completely devoid of pulse, pupils clicking mechanically like camera apertures.',
    ),

    // =========================================================================
    // 5. 记忆崩解、金字塔空洞与人格坍塌 (Memory Dissolution, Pyramid Voids & False Identity)
    // =========================================================================
    atom(
        'delta_slice_amnesia',
        'δ层记忆空白',
        '对话切片归档瞬间，关于前二十五轮言谈的细节如被酸液洗涤，仅剩下一段冷冰冰、毫无温度的情报摘要。',
        'The transition between dialogue slices wiping emotional nuance from consciousness, leaving behind only a sterile, detached δ-level tactical summary in memory registers.',
    ),
    atom(
        'pyramid_void_decay',
        '金字塔底座塌陷',
        '由于长期未被检索，一整组支撑人格基石的γ层核心记忆评分归零，在脑海中塌陷成一片冰冷的认知深渊。',
        'Unaccessed γ-level memory nodes decaying to zero importance score, collapsing the structural foundation of the mind into an empty, echoing psychic void.',
    ),
    atom(
        'implanted_alpha_anchor',
        '寄生α基石',
        '在灵魂最深处赫然发现一段不属于自己的α级记忆基石——自己曾亲手将至亲推入高维焚化炉的逼真体验。',
        'A parasitic α-tier memory core rooted deep within personal identity, detailing the visceral tactile sensation of incinerating one\'s own family during the initial Descent.',
    ),
    atom(
        'terminal_lucidity_carbon',
        '颞叶炭化死者',
        '死者面部凝固着狂喜的顿悟神情，双目空洞焦黑，颅腔内的颞叶与前额叶神经组织已彻底烧蚀成碳粒。',
        'Corpses frozen in ecstatic worship whose eye sockets leak soot, temporal lobes inside the cranium incinerated into powdery black carbon by unfiltered hyper-dimensional visions.',
    ),
    atom(
        'cleaner_dogtag_pile',
        '清理人残骸堆',
        '被撬开颅骨取走神经芯片的特勤特工尸堆，生锈的黄铜军牌字迹已被酸性体液完全腐蚀成无法辨识的凹坑。',
        'A damp mound of Cleaner corpses whose calvaria were sawed off to salvage neural visors, their tarnished brass dog tags dissolved into illegible leaden craters.',
    ),
    atom(
        'semantic_inversion',
        '语义黑洞',
        '听到“救援”一词时神经回路自发感受到利刃割喉的剧痛，“死亡”反而成为脑髓深处唯一渴求的清凉甜饮。',
        'Semantic inversion rewiring cognitive pathways; the word "rescue" triggers phantom lacerations, while the concept of "annihilation" tastes like ice water to a parched throat.',
    ),
    atom(
        'gamma_event_fusion_decay',
        'γ层事件聚变错乱',
        '五段完全发生在不同避难所与战斗中的惨烈记忆，在记忆金字塔压缩中熔铸成一段彼此咬合、逻辑断裂的怪诞体验。',
        'Five unrelated firefight memories collapsing into a single corrupted γ-level node, cross-contaminating trauma details into an impossible historical amalgam.',
    ),
    atom(
        'beta_milestone_erasure',
        'β级里程碑蒸发',
        '支撑自我认同的唯一信念——“亲手为妹妹在旧都会立起十字架”，在一次沉睡醒来后彻底消散，仅剩空洞的战术动作记忆。',
        'The loss of a pivotal β-level milestone defining one\'s moral purpose, leaving behind only sterile mechanical memories of weapon handling and rationing.',
    ),
    atom(
        'stolen_identity_dossier',
        '被窃档案镜像',
        '在废弃终端中检索到一份特勤人员绝密生平档案，照片与指纹与自己分毫不差，但档案死亡时间赫然写着“降临前三年”。',
        'Classified personnel archives displaying the operative\'s exact biometric data, fingerprints, and portrait, stamped with a fatal casualty date three years prior to The Descent.',
    ),
    atom(
        'parasitic_childhood_nostalgia',
        '寄生童年乡愁',
        '在直视深渊祭坛时，脑海中强烈泛起母亲在壁炉旁哼唱儿歌的温馨记忆，而那段旋律正是撕裂大气的4.3秒引力脉冲。',
        'Warm, nostalgic memories of a mother humming by the fireplace welling up during ritual exposure, the melody harmonizing with the abyssal 4.3-second gravity burst.',
    ),
    atom(
        'dialogue_slice_calcification',
        '对话切片钙化',
        '只要同伴间的交谈跨过第25轮阈值，前额叶便瞬间将刚才所有激昂的情感波澜与哽咽抽搐，结晶化为两条冰冷的数据结论。',
        'Emotional exchanges between comrades calcifying at the 25th dialogue turn, excising tears and heartfelt vows to leave behind two lines of clinical logistical facts.',
    ),
    atom(
        'unanchored_name_loss',
        '无锚真名遗失',
        '无论如何集中精力也无法念出自己最初的真实姓名，喉头肌肉一旦试图用力发音，便不由自主地吐出清理人的六位进制代号。',
        'Complete cognitive inability to articulate one\'s true birth name; attempting to speak it forces the vocal cords to recite a Cleaner hex serial number.',
    ),
    atom(
        'cognitive_scar_hypermnesia',
        '超忆侵蚀反刍',
        '前额叶丧失了遗忘创伤的机能，每一次直视高维实体所承受的微观角膜灼痛与肌肉撕扯，都在每个认知刻以绝对全息画质反复重放。',
        'Pathological hypermnesia denying cognitive relief; every retinal micro-tear and psychic rupture replaying with 100% sensory fidelity on every conscious tick.',
    ),
    atom(
        'false_salvation_conviction',
        '伪救赎偏执妄想',
        '大脑边缘系统被深渊波长完全诱导，坚信唯有切除四肢与声带才能从时空稀薄的折磨中解脱，并满怀慈悲地将屠刀伸向睡梦中的队友。',
        'A pathological certainty that severing limbs and vocal cords grants dimensional immunity, moving the infected medic to mercifully amputate sleeping squadmates.',
    ),

    // =========================================================================
    // 6. 极端生态、深渊侵蚀与失控增殖 (Abyssal Ecology, Blight & Proliferation)
    // =========================================================================
    atom(
        'predator_flora',
        '捕食植物',
        '暗色植物藤蔓精确模拟出求救亲友的柔和声线，其艳丽的花苞内部生满层层交错的骨质倒钩与消化锯齿。',
        'Carnivorous predatory flora mimicking familiar voices of loved ones, unfolding glistening floral petals lined with staggered concentric rows of bone-crushing denticles.',
    ),
    atom(
        'breathing_wall',
        '呼吸墙壁',
        '建筑物的石膏与混凝土板如巨型肺叶般沉重起伏，缝隙中随着收缩喷出带有铁锈腥味的粉红血沫。',
        'Reinforced masonry walls expanding and deflating rhythmically like a diseased lung, spraying warm aerosolized arterial foam through cracking mortar seams.',
    ),
    atom(
        'spore_cloud',
        '孢子云',
        '悬浮于阴暗走廊中的微光真菌孢子，能在三分钟内穿透防毒滤芯，在肺泡支气管内生根结出肉质菌伞。',
        'Suspended bioluminescent fungal spores penetrating charcoal respirators within minutes, germinating invasive mycelial roots across pulmonary alveoli.',
    ),
    atom(
        'toxic_marsh',
        '毒沼',
        '工业重金属污水与星神质废料交融而成的死水沼泽，黑色水面燃烧着幽绿的冷焰与强酸性气泡。',
        'Swamps of synthetic petrochemical sludge and Astra-Serum runoff burning with green cold fire, belching caustic bubbles that melt vulcanized rubber boots.',
    ),
    atom(
        'irradiated_land',
        '辐射地',
        '无形无质的高能深渊辐射无声穿透重铅防护服，以亚原子速率切断DNA双螺旋并点燃骨髓。',
        'Invisible abyssal radiation piercing multi-layer lead suits, shattering genetic sequences at subatomic velocity and igniting internal bone marrow into fevered necrosis.',
    ),
    atom(
        'stagnant_water',
        '死水',
        '深不见底的绝对静止死水潭，水面平静如黑镜，水下整齐沉淀着数百具面孔朝上、瞳孔不眨的溺毙者。',
        'A glassy pool of pitch-black standing water preserving hundreds of upturned, unblinking human faces staring through the surface tension in absolute stillness.',
    ),
    atom(
        'pelagic_crimson_fog',
        '远洋血雾',
        '海面蒸腾而起的猩红强酸性浓雾，能无声溶解舰船装甲板，浓雾中回荡着令人神智迷离的空灵圣歌。',
        'Crimson aerosol drifting across coastal ruins, dissolving naval armor plating while carrying hauntingly beautiful trans-dimensional hymns that seduce listeners to drown.',
    ),
    atom(
        'abyssal_tide_pulse',
        '深渊引力潮涌',
        '高维天体掠过现实边界产生的超低频引力海啸，内脏与毛细管随之剧烈谐振，引发大面积内出血。',
        'Infrasonic gravitational tidal waves oscillating through the planetary crust, vibrating internal human organs into sympathetic resonance and catastrophic hemorrhaging.',
    ),
    atom(
        'incubation',
        '孵化',
        '生还者的腹部皮下，数十枚长满硬质节肢的异种胚胎正在剧烈蠕动，破裂皮肤的倒计时已然敲响。',
        'Distended abdominal wall stretching translucent as dozens of segmented parasitic larvae churn violently underneath, preparing to breach the dermal membrane.',
    ),
    atom(
        'swarm_breeding',
        '孳生',
        '甲壳异种在废弃通风管道中呈指数级几何暴增，数以万计节肢刮擦铁皮的密集噪音震碎耳膜。',
        'Chitinous abominations multiplying exponentially inside ductwork, millions of razor-sharp claws scraping galvanized tin in a deafening, suffocating crescendo.',
    ),
    atom(
        'harvest_ritual',
        '丰收仪式',
        '据点周围挂满用同伴股骨与颅骨制作的风铃，居民坚信唯有将初生儿埋入黑土，地下才能长出可食用肉菌。',
        'Grim agrarian outposts festooned with human bone chimes, convinced that burying newborn infants into the contaminated loam is the only way to harvest edible meat tubers.',
    ),
    atom(
        'plague_fertility',
        '疫病繁殖',
        '高热病菌并不致死，而是令宿主骨骼呈枝状狂乱分叉，在肋下撑出带刺的骨质副肢与湿润产卵腔。',
        'A feverish biological contagion that denies the release of death, causing skeletal ribs to branch outward into barbed secondary limbs and glistening ovipositors.',
    ),
    atom(
        'extinction_silence',
        '灭绝寂静',
        '方圆数十公里没有任何风声、虫鸣或尘埃落定声，绝对死寂带来的声学真空比任何咆哮更能撕裂神经。',
        'A total acoustic vacuum across miles of dead ruins; the crushing absence of sound driving auditory nerves to invent deafening hallucinations of internal blood rushing.',
    ),
    atom(
        'symbiotic_carcinoma',
        '巨构共生肉瘤',
        '与防空掩体钢筋混凝土永久共生的十米肉瘤，在维持庇护所空气过滤循环的同时，不断诞下畸变幼体。',
        'A multi-ton biomechanical carcinoma fused with bunker bulkheads, scrubbing carbon dioxide from the air while steadily lactating parasitic broods into ventilation shafts.',
    ),
    atom(
        'embryonic_decay',
        '方舟胚胎坏疽',
        '方舟第七冷冻库断电后，数百万枚用于重建文明的人类受精胚胎融化成一滩泛着恶臭气泡的黑色原汤。',
        'Ark Prime cryogenic failure turning millions of repopulation zygotes into a stagnant, bubbling vat of black primordial sludge covered in oily rainbow sheen.',
    ),
    atom(
        'chitin_encrusted_flora',
        '甲壳指甲灌丛',
        '由数万枚脱落的人类指甲与几丁质昆虫背甲层叠胶结而成的灌木丛，微风吹拂时发出密集的指骨敲击声。',
        'Desolate thickets formed of shed human fingernails and chitinous carapace plates glued by dried lymph, clattering like bone dice in the radioactive wind.',
    ),
    atom(
        'lymphatic_dew_condensation',
        '淋巴冷凝液滴',
        '天花板垂挂着密密麻麻的半透明乳白肉囊，持续向下滴落带有微甜体温的淋巴黏液，在地表形成不干涸的油膜。',
        'Translucent lymphatic pustules dangling from ductwork, condensing and dripping warm, sweet-scented bodily fluids that create persistent slick puddles on rusted iron floors.',
    ),
    atom(
        'mycelial_bone_lattice',
        '菌丝骨架脚手架',
        '原本支撑大厅的钢筋水泥立柱被高韧性的白色菌丝替代，菌丝层层包裹并溶解着数百具站立姿势的旧世劳工遗骨。',
        'Pillars of structural concrete replaced by fibrous mycelial cables that entomb and slowly digest upright skeletons of deceased civilian laborers.',
    ),
    atom(
        'airborne_dermal_flakes',
        '皮屑悬浮尘暴',
        '漫天飘扬的白雾并非水汽或火山灰，而是无数暴毙生灵脱落的纳米级坏死表皮角质粉末，吸入即引发剧烈肺纤维化。',
        'Swirling atmospheric blizzards composed entirely of micronized necrotic human skin flakes, clogging respirator filters with greasy biological flour.',
    ),
    atom(
        'carnivorous_puddle_maw',
        '沥青积水拟口',
        '路面上看似普通的黑色重油积水，下层三寸深处却密布着高速开合的角质倒齿与消化胃囊，重靴踩入即刻遭铰碎咬噬。',
        'Innocuous asphalt puddles concealing subsurface biological maws lined with serrated keratin plates that clamp down on trespassing combat boots.',
    ),
    atom(
        'vascular_root_choke',
        '血管绞盘藤蔓',
        '粗壮如古树根瘤的紫黑血管绞盘在排水坚井内壁，脉搏跳动强劲有力，其表皮毛孔不断向外喷发灼热刺鼻的胃酸气雾。',
        'Thick purple vascular burls choking sewer conduits, pulsating with violent systolic contractions while sweating aerosolized gastric acid from dermal pores.',
    ),
    atom(
        'crying_nematode_cluster',
        '声囊线虫群',
        '滋生于潮湿通风竖井内的湿润白线虫团块，气流掠过其分泌的空心气囊时，引发如数十婴儿同声悲啼的刺耳尖叫。',
        'Dense clusters of albino nematodes infesting ventilation louvers, their hollow air bladders whistling in draft currents to produce the acoustic chorus of screaming infants.',
    ),

    // =========================================================================
    // 7. 异化科技、废弃巨构与死寂自动化 (Anomalous Technology, Megastructures & Iron Entropy)
    // =========================================================================
    atom(
        'signal_possession',
        '信号附身',
        '高压电缆与通讯天线中传输的不再是电流，而是高维实体的思维脉冲，触碰裸线瞬间神经系统即遭夺舍。',
        'High-voltage cables carrying psychic signal currents instead of electrons, instantly hijacking the nervous system of anyone handling exposed insulation.',
    ),
    atom(
        'automation_without_purpose',
        '无目的自动化',
        '巨大的工业冲压机在空无一人的厂房里日夜轰鸣，精准锻造着毫无结构用途与装配逻辑的扭曲金属块。',
        'Industrial assembly lines operating continuously in pitch darkness, stamping, welding, and stacking twisted geometric iron chunks that serve zero human or mechanical utility.',
    ),
    atom(
        'surveillance_static',
        '监控雪花',
        '闭路监控屏幕上跳动的噪点纹理，正在高频计算中拼凑出目击者童年卧室的窗外即时全景。',
        'CRT security monitor static grain slowly resolving through automated processing into a real-time feed of the observer\'s childhood bedroom window.',
    ),
    atom(
        'containment_failure',
        '收容失效',
        '高强度铅玻璃防护罩从内部融化破裂，刺耳的黄色警报在浸满化学脓血的走廊深处永无止境地回荡。',
        'Heavy lead-glass isolation chambers bursting outward under immense internal pressure, hazard beacons spinning endlessly over flooded, chemical-soaked linoleum floors.',
    ),
    atom(
        'code_prayer',
        '代码祷词',
        '终端机屏幕上无休止滚动的十六进制汇编指令，被生还者修道会一字不差地用滚烫铁钉刻在胸膛上当做圣经。',
        'Corrupted assembly machine code carved character by character into survivor flesh with heated iron nails, revered as holy apotropaic scripture against the void.',
    ),
    atom(
        'dead_channel',
        '死者频道',
        '废弃半个世纪的公共无线电调频中，清晰播放着昨天阵亡的战术小队向早已毁灭的指挥中心求救的呼号。',
        'Decommissioned radio channels replaying pristine tactical distress calls broadcast yesterday by a fireteam that died decades ago, calling to an incinerated bunker.',
    ),
    atom(
        'visor_filter_collapse',
        '目镜过滤层熔毁',
        '目镜防晕眩光电滤网在剧烈电流爆鸣中剥落，原本被标记为绿色安全方块的区域暴露出蠕动的高维恶魔。',
        'Visor safety HUD frying in a cascade of electrical sparks, stripping the geometric green filters to reveal crawling, glistening biomechanical abominations.',
    ),
    atom(
        'animated_object',
        '物活',
        '遗弃在金属手术台上的医用剪刀与不锈钢骨锯如节肢甲虫般长出细小肉足，在血泊中无声爬行。',
        'Surgical forceps and bone saws sprouting twitching biological centipede legs, scuttling across stainless steel autopsy trays toward pools of fresh blood.',
    ),
    atom(
        'entropy_machine',
        '熵寂机械',
        '所有齿轮均已彻底锈死断裂，但整台重型柴油机依然凭借不可解释的深渊因果应力以最高转速疯狂轰鸣。',
        'An industrial engine running at redline RPM despite fractured crankshafts and dry crankcases; operating via pure non-Euclidean gravitational stress in total defiance of thermodynamics.',
    ),
    atom(
        'pollution_sheen',
        '污染虹彩',
        '带有微弱荧光的黑色重油覆盖了一切地表积水，折射出的太阳光斑在视网膜上烧灼出诡异的深紫光晕。',
        'Iridescent black chemical slicks floating across flooded trenches, refracting sunlight into toxic violet halos that cause corneal inflammation upon observation.',
    ),
    atom(
        'rust_grind',
        '锈蚀摩擦',
        '数百米高的大厦承重钢梁之间传出刺耳的金属研磨声，其震动节律与人类的心脏舒张完美同步。',
        'Screeching friction of structural steel girders flexing kilometers overhead, grinding in synchronized cadence with the visceral pulse of human coronary rhythm.',
    ),
    atom(
        'black_water',
        '黑水',
        '比重远超水银的重质黑色液体，能缓慢溶解无机工具的金属分子，并无情抹去纸张与芯片上的全部人类字迹。',
        'Dense, viscous black anomalous liquid dissolving steel tools while chemically erasing ink from journals and magnetic tracks from hard drives.',
    ),
    atom(
        'topological_crystal',
        '黑色拓扑晶体',
        '以每秒数百次高速自我折叠的零熵黑晶，不释放任何热量，却强行驱使周围数米内的一切物质畸变重组。',
        'A zero-entropy black crystal self-folding infinitely along multi-dimensional axes, emitting absolute cold and catalyzing involuntary cellular mutation in adjacent matter.',
    ),
    atom(
        'lead_lining_decay',
        '重铅护壁穿孔',
        '用于隔绝深渊辐射的三米厚重铅隔离墙，在亚原子层面被深渊应力侵蚀成布满蜂窝空洞的腐烂海绵。',
        'Three-meter-thick radiation shielding lead bulkheads decomposing at the atomic level, softening into porous, putrid honeycombs leaking radioactive vapor.',
    ),
    atom(
        'hybrid_diesel_generator',
        '柴油生物发电机',
        '铁锈前哨工程舱内的庞大机组，以柴油与活体生还者体温共同作为减速剂，排气活瓣向室内狂吐灼热血沫与柴油烟尘。',
        'Rust Outpost hybrid generator requiring living biological body heat to damp nuclear fuel decay, venting atomized red blood cells and scorched diesel soot into the ceiling.',
    ),
    atom(
        'unmanned_autopsy_rig',
        '自动化解剖机床',
        '圣伊丽莎白地下实验室的电动液压解剖台程序锁死在闭环中，机械臂与骨锯不知疲倦地切削着早已成粉的钛合金台面。',
        'An automated surgical autopsy gantry stuck in an infinite loop, robotic diamond saws screeching across scarred stainless steel trays stripped of all human tissue.',
    ),
    atom(
        'cathode_tube_necromancy',
        '阴极射线唤魂管',
        '绿色荧光示波器上跳动的波形与阵亡特工的脑电图完全一致，当输入特定问题时，波形震荡拼凑出死亡前夕的摩斯电码。',
        'Cathode-ray oscilloscope tubes flickering with the exact EEG signature of a deceased sniper, modulating waveforms to spell tactical warnings in Morse code.',
    ),
    atom(
        'radioactive_lead_coffin',
        '穿孔铅棺辐射漏',
        '基金会用于转运星神质原液的高密度铅棺，外层被高能粒子束烧蚀出细密蓝光针孔，接近两米即引发全身造血机能停摆。',
        'A high-density lead transport sarcophagus leaking Cherenkov blue light through microscopic fissures, delivering lethal bone marrow ablation within arm\'s reach.',
    ),
    atom(
        'perpetual_pneumatic_tube',
        '气动管道狂乱弹射',
        '穿梭于废墟各层之间的黄铜气压管道以惊人速度自动吐出密封胶囊，撬开后尽是捣碎的湿润脏器与未签字的绝密处决书。',
        'Pressurized pneumatic brass logistics tubes shooting sealed brass canisters into empty lobbies, packed with liquified human tissue samples and unsigned execution warrants.',
    ),
    atom(
        'automated_sentry_hysteria',
        '哨戒机枪火控狂乱',
        '重型双联装哨戒炮火控雷达被高维假目标彻底烧毁，机枪塔转动空膛射击轴，不知疲倦地向空无一人的天花板倾泻无壳弹。',
        'Automated twin-linked sentry turrets blinded by dimensional ghost signals, screaming their barrels red-hot into empty air while tracking phantom thermal targets.',
    ),
    atom(
        'ferrofluid_pulsation',
        '磁流体共生脉动',
        '沉淀在战术胸甲防弹陶瓷裂缝中的黑色磁流体，在没有外部磁场的情况下自发立起尖锐微针，随佩戴者心跳同步震颤。',
        'Anomalous black ferrofluid seeping into ballistic plate cracks, standing up in needle clusters without electromagnetic fields, pulsing in sync with coronary rhythm.',
    ),

    // =========================================================================
    // 8. 神性崇高、血肉锚点与深渊虚无 (Cosmic Transcendence, Living Anchors & Abyssal Void)
    // =========================================================================
    atom(
        'lingering_dead',
        '亡者滞留',
        '已停止心跳数日的遗体依然维持平缓的胸腔起伏，无法被土葬，亦无法被任何常规手段彻底闭合双眼。',
        'Corpses dead for weeks maintaining rhythmic thoracic respiration, refusing decay or burial, eyes snapping open whenever holy prayers are spoken.',
    ),
    atom(
        'unburied_corpse',
        '未葬尸骨',
        '数以百计身穿平民服装的白骨露天堆砌在十字路口，空洞的指骨被幸存者用铁丝固定，作为指路的道标。',
        'Hundreds of bleached civilian skeletons piled high at urban intersections, wired together to serve as grim, outstretched directional signposts.',
    ),
    atom(
        'deathless_wound',
        '不死伤口',
        '胸腹部贯穿性的巨大撕裂伤口既不流血结痂也不致人死亡，裸露的脏器在冰冷空气中持续温热搏动。',
        'A catastrophic thoracic laceration exposing pulsing internal organs; the wound refuses to heal, bleed out, or allow the agonized host to expire.',
    ),
    atom(
        'farewell_denied',
        '无法告别',
        '埋入深土的同伴遗骸会在次日黎明自行破土而出，默默坐回生前据点破旧的餐桌椅上等待开饭。',
        'Buried corpses clawing out of frozen graves under cover of darkness, returning silently to sit in their designated chairs at the breakfast table before sunrise.',
    ),
    atom(
        'drowned_congregation',
        '沉没会众',
        '潜入淹没的防空洞大厅，数百具系着铅块沉底的尸体依然笔直站立于水下，整齐划一面朝干涸的主席台。',
        'Hundreds of drowned refugees weighted down with lead ballast standing at attention on the flooded auditorium floor, all facing the barren pulpit in underwater formation.',
    ),
    atom(
        'cosmic_insignificance',
        '宇宙渺小',
        '仰望铅云裂隙中若隐若现的高维巨型星体阴影，人类所有的文明挣扎如显微镜下的灰尘般毫无分量。',
        'Glimpsing the cyclopean curve of a celestial entity drifting through fractured clouds, instantly rendering all human history, suffering, and technology utterly infinitesimal.',
    ),
    atom(
        'scale_vertigo',
        '尺度眩晕',
        '直面横跨地平线的深渊几何断层，大脑原有的三维空间定位机制全面崩溃，引发生理性剧烈眩晕与昏厥。',
        'Gazing up at an impossible architectural megastructure that pierces the stratosphere at non-Euclidean angles, triggering acute vestibular disorientation and violent emesis.',
    ),
    atom(
        'meaningless_victory',
        '无意义胜利',
        '殊死血战拼尽弹药斩杀的灾厄母体，经解析仅仅是高维不可名状存在无意间掉落在此处的一枚死皮碎屑。',
        'Surviving a grueling, bloody firefight against a biomechanical colossus only to discover it was merely stray cellular debris shed by an outer entity traversing orbit.',
    ),
    atom(
        'contaminated_knowledge',
        '污染知识',
        '一旦在逻辑上完全理解了黑板上记录的深渊引力场方程，脑脊液就会自发变性并从鼻腔渗出黑色黏液。',
        'Mathematical equations describing abyssal gravity bridges that curdle human cerebrospinal fluid into black tar upon the precise moment of intellectual comprehension.',
    ),
    atom(
        'membrane_penetrated',
        '薄膜穿透',
        '确信脚下的三维物理现实不过是一层被深渊神明随手撕烂的薄保鲜膜，背后是无边无际的饥饿深渊。',
        'The unshakable cognitive realization that 3D physical reality is merely a shredded layer of cling-wrap offering zero insulation against the predatory ocean beyond.',
    ),
    atom(
        'divine_command',
        '神性命令',
        '未通过任何声波传导的高维意志，强行接管所有肌肉纤维违抗大脑指令，向不可名状祭坛齐齐下跪。',
        'A wordless acoustic dictate bypassing cerebral control, forcibly commanding skeletal muscle groups to tear their own ligaments and bow prostrate before the monolith.',
    ),
    atom(
        'ecstatic_ritual',
        '狂喜仪式',
        '自戕者在利刃切开喉管的刹那体验到超越生理极限的崇高极乐，瞳孔放大至极限并发出赞美咏叹。',
        'Cultists experiencing profound transcendent bliss as sharp steel slices their own jugular veins, pupils dilated into absolute darkness amidst gasping songs of praise.',
    ),
    atom(
        'sacrifice_altar',
        '献祭祭坛',
        '由工业重型液压机与铅棺粗暴拼凑的高维祭坛，每日必须灌入新鲜的人类脑脊液方能抑制地壳坍塌。',
        'A hydraulic forge retrofitted with lead sarcophagi, demanding precise daily quotas of warm human spinal fluid to lubricate seals preventing seismic catastrophe.',
    ),
    atom(
        'chosen_curse',
        '选召诅咒',
        '被深渊意志选定为跨维降临的肉身容器，全身骨骼自发开裂并持续向空域发射超低频的引力波悲鸣。',
        'Chosen by outer entities as a living terrestrial anchor; internal skeletal fractures vibrating continuously to broadcast infrasonic radio shrieks into the stratosphere.',
    ),
    atom(
        'blasphemous_sacred',
        '亵渎神圣',
        '生满肉瘤与节肢的畸形生物，在虚空光晕中散发出令人不由自主流泪下跪膜拜的绝对庄严与圣洁感。',
        'A revolting chimeric aberration dripping pus and ichor, yet radiating an undeniable, blinding aura of heavenly perfection that forces weeping soldiers to their knees.',
    ),
    atom(
        'descent_resonance',
        '降临共振引力',
        '外神撕裂现实薄膜时引发的宇宙级引力渡桥震颤，崇高而宏大，足以在瞬间撕碎凡人的每一根毛细血管。',
        'Cosmic-scale gravitational tides surging across the dimensional transit bridge, an overwhelming celestial presence that ruptures human blood vessels with sheer majesty.',
    ),
    atom(
        'ark_apotheosis',
        '方舟飞升信条',
        '深埋地下的寡头在方舟密封舱内广播的冷酷信条：牺牲地表百亿生灵是新人类完成跨维跃迁的必要燃料。',
        'Ark Prime technocratic sermons echoing from sealed bulkheads, rationalizing the agonized slaughter of 10 billion surface citizens as justifiable rocket fuel for trans-humanity.',
    ),
    atom(
        'living_gravity_cable',
        '血肉引力锚缆',
        '由方舟龙骨垂直垂降至地表地幔深处、以百万平民中枢神经束编绞而成的巨型抗拉引力缆绳，在雷暴中发出金色哀号。',
        'Megastructure gravity cables braided from millions of living spinal nerves descending from Ark Prime keels into the mantle, glowing incandescent amidst ion storms.',
    ),
    atom(
        'infrasonic_four_second_pulse',
        '四秒原初脉冲',
        '降临日凌晨三点十七分全球射电阵列捕获的4.3秒不可名状脉冲残响，至今仍在地底岩层与骨髓深处回荡，诱发无法克制的下跪失禁。',
        'The eternal acoustic resonance of the original 4.3-second Descent pulse vibrating in bedrock and marrow, inducing spontaneous vestibular collapse and involuntary prostration.',
    ),
    atom(
        'stratospheric_cyclopean_silhouette',
        '对流层巨构剪影',
        '透过撕裂的猩红铅云缝隙，隐约显化出比大陆架更为庞大、由非欧几何咬合而成的神明节肢结构轮廓，悬停于轨道之上静默凝视。',
        'Cyclopean hyper-dimensional limbs spanning thousands of kilometers revealed through fractured crimson storm clouds, motionless in low planetary orbit.',
    ),
    atom(
        'sublime_annihilation_hymn',
        '崇高泯灭圣咏',
        '当重装防空火力网被虚空撕碎时，通讯频道内响起的并非爆炸轰鸣，而是空灵庄严的四部合唱，令阵地特工自发摘下面罩含笑迎向光矛。',
        'Choral polyphony of transcendent harmonic beauty replacing explosion thunder over tactical comms, moving frontline operators to strip off body armor in radiant tears.',
    ),
    atom(
        'ark_ballast_mass_grave',
        '方舟配重百亿万人坑',
        '在深渊断崖下发现的宏伟万人坑地基，证实地表百亿人类的死亡从非意外，而仅仅是方舟空间跃迁物理方程中必须平衡的“下沉质量”。',
        'Kilometer-wide planetary burial trenches validating Ark Prime flight telemetry: 10 billion human corpses utilized merely as physical counterweights to balance jump inertia.',
    ),
    atom(
        'terminal_prostration',
        '终末匍匐姿态',
        '一整排全副武装的基金会顶级收容专家尸体，整齐划一朝向虚空裂隙跪伏，双手将自己剖开胸膛挖出的心脏端庄捧向苍穹。',
        'An entire platoon of Foundation containment engineers dead in perfect unison, kneeling toward an abyssal rift while holding their own excised hearts toward the stars.',
    ),
]