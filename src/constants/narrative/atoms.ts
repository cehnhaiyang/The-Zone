/**
 * atoms.ts
 *
 * 恐怖元预定义库。
 *
 * 恐怖元是最小恐惧素材原子，与恐怖域解耦：原子本身不承担域归属，
 * 只有在被美学引用、经主控域与渗透域折射后才获得具体表现形式。
 *
 * 对应元契约 {@link HorrorAtom}，契约声明本库维护于本文件。
 *
 * @see ../../meta/interface.ts
 */

import type { HorrorAtom } from '../../meta'

/** 恐怖元构造辅助：四字段与 _Nar 一一对应，仅用于压缩数据表书写。 */
const atom = (
    id: string,
    name: string,
    desc: string,
    prompt: string,
): HorrorAtom => ({ id, name, desc, prompt })

export const HORROR_ATOMS: HorrorAtom[] = [
    // --- 机体异变与生化改质 ---
    atom('flesh_gear', '血肉齿轮', '皮下机械齿轮与肌腱筋膜粗暴咬合，骨骼成为传动连杆。', 'Exposed gears grinding under living fascia; machinery driven by involuntary muscle twitches.'),
    atom('hydraulic_vein', '液压血管', '循环血管被耐腐蚀黑管替代，暗色黏稠高压液伴随脉搏轰鸣喷涌。', 'Veins replaced by pulsating hydraulic lines leaking dark, synthetic pressurized serum.'),
    atom('bone_metal_fusion', '骨金属融合', '外骨骼钛合金与人骨发生分子级不可逆嵌合，强行剥离即刻骨肉俱碎。', 'Skeletal frame fused with metal trusses and traction brackets; separation causes fatal splintering.'),
    atom('involuntary_augmentation', '非自愿改造', '手术在失去知觉或无麻醉下发生，机体被持续改造且永远无法逆转。', 'Irreversible surgical modifications performed without consent that continue spreading through tissue.'),
    atom('parasite_spine', '脊椎寄生', '异种神经纤维死死缠绕中枢脊髓，既强行泵注力量，又剥夺肢体控制权。', 'A predatory parasite coiling around spinal vertebrae, hijacking locomotive motor functions.'),
    atom('leukotomy_scar', '脑白质切除瘢痕', '眼眶上方眶骨粗暴凿穿的陈旧穿刺瘢痕，情绪与恐惧中枢已被物理刮除。', 'Rough transorbital puncture scars from lobotomy; complex human affect excised into mechanical reflex.'),
    atom('astra_infusion', '星神质浸润', '极高浓度的黑色晶体原液在静脉中分枝结晶，将造血干细胞转化为导电胶质。', 'Branching black crystalline liquid spreading through capillary beds, replacing bone marrow with conductive jelly.'),
    atom('iv_rack_fusion', '输液钢架畸交', '病患骨节与医用牵引滑轮、不锈钢输液钢架深度增生粘连，肉芽包裹着金属管件。', 'Spinal column and joints overgrown around stainless steel IV poles and orthopedic traction screws.'),
    atom('living_soil', '活体泥土', '地表泥土由层层坏死脂肪、微细毛细管与神经末梢构成，踩踏时引发微弱痉挛。', 'Soil behaving as living subdermal layer; loam rich in active capillaries and twitching sensory nerves.'),
    atom('flesh_mould_substrate', '菌丝肉质基底', '地面与管道覆盖着不断律动的暗粉色肉膜，贪婪吸收每一滴滴落的体液。', 'Pulsating mycelial meat carpeting walls and floor grids, eagerly soaking up organic fluids.'),

    // --- 认知危害、记忆失常与语言坍塌 ---
    atom('memory_contradiction', '矛盾记忆', '多人对同一核心事件持有细节详实却完全互斥的记忆，且各自拥有物证。', 'Multiple survivors share distinct, detailed, and utterly irreconcilable memories of the same historical event.'),
    atom('rewriting_text', '自重写文字', '纸张或终端上的日志在视线离开的一瞬自行改写，否定先前的记录。', 'Text and system logs continuously morph and revise their contents when unobserved.'),
    atom('stranger_mirror', '镜中陌生人', '反光表面映照出的面容呈现微弱但致命的陌生意图，动作比肉身慢半秒。', 'Reflections lag behind reality, staring back with an unfamiliar, calculated hostility.'),
    atom('false_diary', '伪日记', '在随身笔记本中翻出笔迹完全属于自己、却记载着骇人恶行的未知日记。', 'A personal journal written unmistakably in one\'s own handwriting describing unremembered atrocities.'),
    atom('identity_blur', '身份模糊', '自己的名字、服役部队、家庭住址在脑海中退化为不可解析的杂音字符。', 'Personal name, military serial number, and family face fade into blurry unretrievable noise.'),
    atom('hallucination_overlay', '幻觉叠加', '视野中出现与现实同等物理质感的重影——根本不存在的锈门、哭声与阴影。', 'Perceptual overlays injecting physically tangible phantoms and screaming audio tracks into real space.'),
    atom('second_sight_epiphany', '第二次看见', '目镜过滤降维失败瞬间，前额叶直接解码高维多维拓扑结构带来的致死顿悟。', 'Terminal cognitive explosion as digital safety visors fail, burning cosmic geometry straight into human brain.'),
    atom('semantic_melting', '语义融解', '从喉咙发出的单词与词义永久剥离，吐出舌尖时融化为湿黏、无意义的音节。', 'Words detach from signified concepts, dissolving on the tongue into wet, unparsable phonemes.'),
    atom('concept_predation', '概念捕食', '某种不可见的深渊存在有选择性地从大脑中精准咬食概念，如“家”或“退路”。', 'An invisible entity systematically devouring foundational concepts like "safety" or "home" from human memory.'),
    atom('visual_static_delusion', '高斯噪点妄想', '视野边缘的绿色光电噪点不断自组织排列，重组成嘲弄的微笑与眼球。', 'Phosphor static noise along visor margins organizing itself into grinning faces and watchful pupils.'),
    atom('ontological_drift', '本体论漂移', '客观物质的坚固性随理智下降而虚化，抚摸铁壁如同抚摸一张薄脆的湿纸。', 'Physical solidity decays as sanity wavers; load-bearing concrete feels like damp, hollow papier-mâché.'),

    // --- 虚妄他者、社会制度与结构性暴力 ---
    atom('fake_person', '伪人', '朝夕相处之人的骨相微调了半毫米，呼吸节奏与说话习惯相似却本质非人。', 'A familiar companion replaced by a biological mimic whose mannerisms are precise yet profoundly wrong.'),
    atom('independent_reflection', '独立倒影', '水中或屏幕里的倒影拥有独立行动轴心，在本体转身时保持原位微笑。', 'A reflection that remains still, observing the protagonist after they turn away.'),
    atom('dead_voice', '死者声音', '早已确认牺牲的队友的声音通过对讲机盲端不断播报坐标，伴随咀嚼声。', 'Deceased squad members communicating over closed-loop radios, giving contradictory evacuation orders.'),
    atom('silent_watchers', '无声注视者', '建筑孔洞、通风井与管道深处，密集分布着永不眨动、没有瞳孔的白浊眼球。', 'Countless unblinking, milky eyes peering silently from ventilation shafts and wall cracks.'),
    atom('untrustworthy_companion', '不可信同伴', '同伴的言行、眼神与生理指标产生致命割裂，手始终按在武器保险栓上。', 'Companions whose physiological vitals and verbal claims contradict; subtle positioning for backstabbing.'),
    atom('institutional_sacrifice', '制度献祭', '避难所高层以冰冷严密的官僚表格与轮盘投票，按期将底层平民送往深坑。', 'Bureaucratic systems operating with ruthless legitimacy to systematically sacrifice quotas of citizens.'),
    atom('rule_as_monster', '规则怪物', '避难区张贴的安全条例本身具有捕食活性，违抗条目者肉身当场溃散。', 'Safety regulations possessing autonomous predatory agency; breaking protocols manifests physical doom.'),
    atom('forced_ritual', '强制仪式', '据点所有居民按部就班举行割裂皮肉的祷祝，拒绝参与即刻被定义为异类。', 'Compulsory communal mutilation ceremonies where refusal marks an individual for public butchery.'),
    atom('classification_expulsion', '分类驱逐', '依据神经链接仪读数将生还者贴上耗材标签，粗暴推入无防毒面具的浓雾区。', 'Systematic tagging and expulsion of low-utility survivors into toxic mists by logistics algorithms.'),
    atom('collective_joy_horror', '集体欢庆恐怖', '整座避难所的人群伴随狂欢音乐将同胞肢解分食，脸上洋溢着宁静的微笑。', 'An entire community celebrating with festive music while committing visceral atrocities without malice.'),
    atom('asclepius_protocol', '阿斯克勒庇俄斯规程', '以医学救赎之名将地下七层全面转为活体切片流水线，将伤患作为转化培养基。', 'Industrial vivisection triage protocol converting hospital wards into multi-level human refining vats.'),
    atom('gravity_anchor_broadcast', '引力锚点全域广播', '灾变初期的全频段谐振广播持续回响，强迫方圆数十里的人类大脑发生共振痉挛。', 'Emergency sirens permanently broadcasting infrasonic harmonics that induce synchronized grand mal seizures.'),
    atom('replacement_lottery', '岗位替代抽签', '发电机与净水机舱需活人体温阻隔辐射，每日通过生锈轮盘抽选生者锁入操作台。', 'Survivor lotteries selecting laborers to be permanently chained to radioactive life-support machinery.'),
    atom('cleaner_reclamation', '清理人灭口', '脑白质切除的特勤作战单位手持消音步枪，机械化清理一切带菌者与档案。', 'Lobotomized security commandos executing methodical sweeps to exterminate witnesses and sanitize paper trails.'),
    atom('ark_abandonment', '方舟弃民遗恨', '生还者在废墟中拼凑出方舟遗迹蓝图，绝望地明白百亿同胞从一开始就是下饵用的祭品。', 'Realization that the entire surface civilization was engineered to die as gravity bait for Ark Prime.'),

    // --- 时空湍流、因果异化与拓扑折叠 ---
    atom('frozen_explosion', '冻结爆炸', '爆轰火球与冲击波凝固在半空中化为静止玻璃态，核心热量仍在疯狂累积。', 'A detonation frozen in mid-air; fire petals crystalized while internal core temperatures soar unseen.'),
    atom('reversed_rain', '倒流黑雨', '带有化学酸性的黏性黑雨从瓦砾升入铅云，带走地面的血迹并重组为雨滴。', 'Acidic black droplets rising smoothly from ground to stormclouds, carrying debris in reverse trajectory.'),
    atom('looping_event', '循环事件', '一具特工尸体每隔三十秒重演一次跌落、颈椎折断并发出清脆断裂声的轮回。', 'A corpse continually repeating the exact moment of its fatal fall every thirty seconds in an infinite loop.'),
    atom('future_corpse', '未来尸骨', '在未曾涉足的房间转角，赫然发现身着自己现穿装备、死状凄惨的干瘪遗骸。', 'Discovering one\'s own decomposed remains wearing today\'s gear inside an unopened, sealed chamber.'),
    atom('causal_inversion', '因果倒置', '胸膛先撕裂喷血并承受剧痛，数秒之后远处才传来敌人的枪栓拉响与枪声。', 'Wounds tearing open and bleeding profusely seconds before the enemy sniper even raises the rifle.'),
    atom('future_broadcast', '未来广播', '收音机扬声器沙沙作响，播报着三小时后己方小队被异化怪物全歼的详细讣告。', 'Radio transcripts describing the horrific details of the squad\'s annihilation three hours before it occurs.'),
    atom('dilation_stagnation', '时空绝对固化', '时空稀薄系数降至零点，空气凝固如石膏，受创者甚至无法感知自身已被斩首。', 'Zero dilation zone (dilationFactor=0) where air molecules seize up; light halts and wounds cannot bleed.'),
    atom('runaway_temporal_decay', '狂暴时空冲刷', '时间流速呈数百倍疯狂暴涨，战术手电在半分钟内电池耗尽，肉体加速枯干。', 'Runaway temporal acceleration (dilationFactor>1) causing batteries to drain and wounds to rot in seconds.'),
    atom('descent_seventy_two', '降临七十二小时残响', '电台录音带无休止倒放着降临之初播音员从惊恐尖叫逐渐演变为喉管异化的嘶吼。', 'Damaged magnetic tapes endlessly looping the initial 72 hours as broadcast anchors mutate on air.'),
    atom('non_euclid_angle', '非欧角度', '拐角内角之和超过三百六十度，视线沿右方笔直射击却从左侧墙壁反弹击中自身。', 'Corridors joining at physically impossible angles; firing a straight bullet ricochets into one\'s own back.'),
    atom('larger_inside', '内部更大', '一间外部仅两米见方的警卫岗亭，内部推开门后却是一座深不见底的巨构深渊。', 'A small roadside guard booth whose interior opens into a subterranean chasm stretching kilometers down.'),
    atom('infinite_corridor', '无限走廊', '走廊两侧的防爆门以完全相同的斑驳锈痕规律重复，前行百里依然位于原点。', 'Endless hallway repeating the exact same rust patterns and door numbers with zero spatial displacement.'),
    atom('liminal_space', '阈限空间', '空无一物的昏黄地下停车场或贴满瓷砖的浴室，失去一切使用目的与进出导向。', 'A vast expanse of tiled, flooded basement chambers stripped of human utility, exits, and shadows.'),
    atom('claustrophobic_seal', '幽闭封闭', '两侧生满霉菌的墙壁正以微不可察的速度向中心靠拢，缓慢压榨生存立足点。', 'Corridor concrete walls creeping inward millimeter by millimeter, inexorably sealing off breathing space.'),
    atom('impossible_exit', '无出口', '每一扇写着安全通道标记的逃生门，拉开后都是一堵冷冰冰浇筑着活人毛发的实心铅墙。', 'Every green emergency fire exit opening into solid, lead-poured bulkheads embedded with human hair.'),
    atom('morphing_corridor', '自折叠回廊', '受黑色晶体拓扑影响，通道几何构造随心跳翻折，转过街角赫然直视自己的脊梁。', 'Hallways twisting along Mobius strips; turning a corner brings the traveler face-to-back with themselves.'),
    atom('submerged_street', '沉没街道', '旧都会柏油马路垂直下垂沉入无底深黑沥青海，路灯在深水下泛出惨白冷光。', 'Flooded urban avenues tilting vertically into an abyss of black sludge; streetlights glowing underwater.'),
    atom('crushed_depth', '压溃深度', '极端重力与高维因果应力凝聚于胸腔，每一次呼吸都如吸入滚烫的水银。', 'Gravity and abyssal tension compressing the ribcage; every breath feels like inhaling molten lead.'),

    // --- 极端生态、失控生命与物质异化 ---
    atom('predator_flora', '捕食植物', '植物藤蔓模拟出求救女子的柔和声线，内部生满倒钩消化锯齿。', 'Carnivorous vines projecting realistic acoustic mimicry of human cries to reel in empathetic victims.'),
    atom('breathing_wall', '呼吸墙壁', '建筑物的石膏与混凝土板如巨型肺泡般沉重起伏，缝隙中渗出粉红血沫。', 'Concrete masonry heaving rhythmically like lung tissue, exhaling warm, copper-flavored vapor.'),
    atom('spore_cloud', '孢子云', '悬浮于空气中的微光真菌孢子，能在三分钟内钻入气管并在肺泡内结网生根。', 'Airborne bioluminescent spores that germinate in bronchial tubes, filling lungs with root threads.'),
    atom('toxic_marsh', '毒沼', '工业污水与星神质废料交融而成的沼泽，水面燃烧着幽绿的冷焰与酸性气泡。', 'Marshes of chemical effluent and Astra-waste bubbling with green cold flames and caustic steam.'),
    atom('irradiated_land', '辐射地', '无形无质的高能深渊辐射无声穿透铅衣，以亚原子速率粉碎造血细胞。', 'Invisible abyssal radiation puncturing lead protection, shattering DNA structures at subatomic scale.'),
    atom('stagnant_water', '死水', '深不见底的静止死水潭，水下沉淀着数千具面部朝上、眼球不眨的溺毙者。', 'A glassy, motionless pool preserving thousands of upturned drowned faces beneath clear surface film.'),
    atom('pelagic_crimson_fog', '远洋血雾', '海面蒸腾而起的猩红强酸性浓雾，能无声溶解舰船装甲并传来空灵吟唱。', 'Organo-acidic crimson aerosol creeping over dark waters, eroding steel hulls while carrying siren hymns.'),
    atom('abyssal_tide_pulse', '深渊引力潮涌', '高维天体掠过现实边界产生的超低频引力海啸，内脏随之剧烈谐振绞痛。', 'Infrasonic gravitational tidal waves oscillating internal organs into hemorrhaging resonance.'),
    atom('incubation', '孵化', '生还者的腹部皮肤下，密集的小型胚胎正在剧烈蠕动，破皮而出指日可待。', 'Abdominal tissues distending as multiple parasitic egg sacs squirm beneath the skin membrane.'),
    atom('swarm_breeding', '孳生', '甲壳异种在通风管道中以指数级几何暴增，节肢刮擦铁皮声响彻夜空。', 'Chitinous abominations multiplying exponentially in wall cavities; clicking claws deafening the ears.'),
    atom('harvest_ritual', '丰收仪式', '生还者据点挂满用同伴大腿骨制作的风铃，坚信只有将初生儿献给大地才能长出土豆。', 'Grim settlements hanging bone wind chimes, convinced sacrificing infants guarantees fungal harvest.'),
    atom('plague_fertility', '疫病繁殖', '高热病菌并不致死，而是令宿主骨骼发芽分叉，长出带刺的副肢与产卵腔。', 'Feverish contagion that denies death, causing bones to branch into barbed limbs and ovipositors.'),
    atom('extinction_silence', '灭绝寂静', '方圆百里没有任何虫鸣、风声或水流声，绝对死寂比任何嚎叫更能撕裂鼓膜。', 'Total environmental silence following localized biological extinction; absence of sound driving paranoia.'),
    atom('symbiotic_carcinoma', '巨构共生肉瘤', '与防空掩体钢筋混凝土永久共生的十米肉瘤，在为通风机供能的同时诞下异种。', 'A multi-ton structural carcinoma bonded to bunkers, powering air scrubbers while birthing horrors.'),
    atom('embryonic_decay', '方舟胚胎坏疽', '方舟第七冷冻库断电后，数百万用于重构文明的基因胚胎融为一滩黑色原汤。', 'Cryo-vault power failure rotting millions of repopulation embryos into stagnant black primordial slurry.'),

    // --- 异化科技、物质失常与神圣信仰 ---
    atom('signal_possession', '信号附身', '高压电缆中传输的不是交流电，而是高维灵体的思维脉冲，电击即可夺舍。', 'Anomalous radio frequencies possessing the human nervous system through audio headphones or sockets.'),
    atom('automation_without_purpose', '无目的自动化', '巨大的冲压机在空无一人的厂房里日夜轰鸣，精准锻造着毫无用处的扭曲铁块。', 'Industrial robotics stamping, welding, and assembling deformed iron junk with zero human purpose.'),
    atom('surveillance_static', '监控雪花', '闭路监控屏幕上跳动的噪点纹理，正在拼凑出玩家童年房间的即时窗外全景。', 'CCTV static grain slowly coalescing into a real-time feed of the viewer\'s childhood bedroom window.'),
    atom('neural_link_noise', '神经链接噪点', '神经芯片持续升温超载，视网膜上覆盖着暴风雨般杂乱刺目的高亮雪花颗粒。', 'Neural visor processing overload showering the retinal field with stinging phosphor static dots.'),
    atom('containment_failure', '收容失效', '高强度铅玻璃防护罩从内部融化破裂，刺耳的黄色警报在浸血的走廊回荡。', 'Hermetic containment pods bursting outward under biological pressure as warning klaxons scream.'),
    atom('code_prayer', '代码祷词', '终端机屏幕上无休止滚动的十六进制汇编指令，被修道会信徒刻在胸膛上当经文膜拜。', 'Corrupted binary code transcribed onto survivor flesh as holy liturgical verses against the dark.'),
    atom('dead_channel', '死者频道', '废弃数十年的公用广播调频中，清晰播放着昨天战死队员向指挥部绝望的呼救。', 'Dead radio channels broadcasting distress calls sent yesterday by operatives killed three years ago.'),
    atom('visor_filter_collapse', '目镜过滤层熔毁', '目镜防晕眩光电滤网在电流爆鸣中剥落，红线框解构为张牙舞爪的真实高维恶魔。', 'Safety filters peeling away from HUD displays, unmasking sanitized geometric lines into flesh horrors.'),
    atom('neural_static_drone', '神经底噪长鸣', '只要开启机械过滤通道，潮湿刺耳的蜂鸣便如湿蛆钻动耳膜，令神经无法停歇。', 'A moist high-pitched electromagnetic hum echoing endlessly behind the eardrum during camera view.'),
    atom('animated_object', '物活', '遗弃在桌上的医用手术剪与骨锯像寄居蟹般长出节肢，在血泊中悄然爬行。', 'Inanimate metallic utensils and bone saws sprouting chitinous legs, scuttling across surgical trays.'),
    atom('entropy_machine', '熵寂机械', '所有齿轮均已彻底锈死脱落，但柴油机依然凭借不可解释的引力应力全速运转。', 'Engines running at maximum RPM despite pistons rusted solid and dry fuel tanks; entropy violated.'),
    atom('pollution_sheen', '污染虹彩', '带有微弱荧光的黑色重油覆盖了一切地表积水，倒映出的天空呈现诡异紫芒。', 'Iridescent synthetic oil slicks floating on black mud, refracting sunlight into poisonous spectrums.'),
    atom('rust_grind', '锈蚀摩擦', '重型承重钢梁之间传出的刺耳金属研磨声，如钝刀在神经线上来回刮擦。', 'Structural steel girders screeching against each other in rhythm with human cardiac pulses.'),
    atom('black_water', '黑水', '比重远超常规清水的重质黑色液体，能缓慢腐蚀无机金属与一切人类文明意义。', 'Dense, pitch-black anomalous sludge dissolving inorganic tools and erasing written ink from paper.'),
    atom('consumer_relic', '消费遗骸', '豪华购物中心坍塌的玻璃中庭下，陈列着穿戴名贵珠宝却早已风干成腊的贵妇尸骸。', 'Collapsed luxury department stores where mannequins and desiccated corpses wearing jewels entwine.'),
    atom('topological_crystal', '黑色拓扑晶体', '以每秒数百次高速自我折叠的零熵黑晶，不释放热量却驱使周围物质疯长。', 'Black zero-entropy crystals self-folding infinitely, bending Euclidean space and mutating nearby atoms.'),
    atom('lead_lining_decay', '重铅护壁穿孔', '用于隔绝深渊辐射的三米厚重铅隔离墙，在亚原子层面被侵蚀成布满蜂窝的烂肉。', 'Multi-ton radiation lead bulkheads rotting away into porous, honeycomb sponge at atomic scale.'),

    // --- 死亡滞留、理性虚无与神性崇高 ---
    atom('lingering_dead', '亡者滞留', '已停止心跳三天的尸体依然维持平缓的胸腔起伏，无法安葬亦无法彻底闭眼。', 'Corpses whose vital signs have ceased completely, yet whose limbs occasionally twitch to greet you.'),
    atom('unburied_corpse', '未葬尸骨', '数以百计身穿平民服装的白骨露天堆砌在十字路口，成为指引撤离方向的路标。', 'Piles of skeletal remains bleaching in acid fog, used by wanderers as grim directional road signs.'),
    atom('deathless_wound', '不死伤口', '腹部贯穿性巨大撕裂伤口既不流血结痂也不致死，内部器官静止却保持温热。', 'A catastrophic abdominal laceration that refuses to heal or kill, exposing motionless warm organs.'),
    atom('memorial_decay', '纪念物腐朽', '烈士纪念碑上的名字与雕像面庞在化学黑雨中融化，化作一尊面目狰狞的无名污泥。', 'War memorials and memorial photos dissolving into distorted mockery under incessant acid rain.'),
    atom('farewell_denied', '无法告别', '没有任何宗教仪式能够超度牺牲的亡灵，埋入泥土的骨骸次日会自行爬回地表。', 'Interred dead clawing their way out of graves, returning to sitting room chairs before daybreak.'),
    atom('drowned_congregation', '沉没会众', '潜入水底的防空洞大厅中，数百具系着重石的尸体依然笔直站立，面朝主席台。', 'Drowned refugees weighted down by cinder blocks still standing erect in flooded halls facing the pulpit.'),
    atom('cleaner_dogtag_pile', '清理人残骸堆', '被撬开颅骨取走神经芯片的特勤特工尸堆，黄铜军牌字迹已被酸性体液完全蚀烂。', 'Mounds of Cleaner corpses with skull caps sawn open for visor salvage; illegible tarnished dog tags.'),
    atom('terminal_lucidity_carbon', '颞叶炭化死者', '死者面部凝固着狂喜的顿悟神情，双目空洞焦黑，颅腔内的颞叶组织已彻底炭化。', 'Corpses frozen in ecstatic worship whose temporal lobes were incinerated into carbon by Second Sight.'),
    atom('cosmic_insignificance', '宇宙渺小', '仰望夜空裂隙中显化的庞大星体阴影，人类所有的文明挣扎如尘埃般毫无分量。', 'Observing colossal abyssal entities traversing deep orbit, reducing human survival to trivial dust.'),
    atom('purposeless_machine', '无目的机械', '规模绵延数十公里的地下巨型机械，运转了数千年却没有任何产出与控制中枢。', 'Vast kilometers of reciprocating subterranean pistons functioning without purpose, product, or stop switch.'),
    atom('absurd_repeat', '荒谬重复', '生还者日复一日用牙刷清理满是辐射尘的火炮膛线，明知外界早已没有敌人。', 'Survivors obsessively cleaning irradiated artillery barrels with toothbrushes in a dead world.'),
    atom('scale_vertigo', '尺度眩晕', '面对横跨地平线的巨型高维几何断层，大脑三维空间定位机制全面失衡倒地。', 'Megastructures piercing the stratosphere triggering severe spatial disorientation and nausea.'),
    atom('meaningless_victory', '无意义胜利', '历经殊死血战摧毁了母巢，却发现它仅仅是高维实体不小心垂落在泥潭里的指甲屑。', 'Defeating a horrific biomechanical behemoth only to realize it was merely stray cellular debris.'),
    atom('contaminated_knowledge', '污染知识', '一旦理解了黑板上记载的深渊重力方程，脑髓就会自发渗出微量黑色黏液。', 'Equations and lore that physically curdle cerebrospinal fluid upon the moment of comprehension.'),
    atom('membrane_penetrated', '薄膜穿透', '确信脚下的物理现实不过是一层被深渊神明随手撕烂的薄保鲜膜，毫无庇护可言。', 'Unshakeable certainty that 3D physical reality is merely torn cling-wrap offering zero sanctuary.'),
    atom('divine_command', '神性命令', '未通过任何声音下达的高维意志，强制所有肌肉纤维违抗大脑指令向神坛下跪。', 'Wordless psychic dictates seizing motor nerve channels, forcing the body to prostrate toward the abyss.'),
    atom('ecstatic_ritual', '狂喜仪式', '自戕者在利刃切开喉管时体验到了超越生理极限的极乐狂喜，瞳孔放大至极限。', 'Self-immolation executed with expressions of orgasmic bliss as flesh sizzles upon altars.'),
    atom('sacrifice_altar', '献祭祭坛', '由数十台工业液压机与铅棺拼凑的高维祭坛，每日必须灌入新鲜人类脑脊液。', 'Hydraulic altars that accept only warm human cerebrospinal fluid to suppress seismic tremors.'),
    atom('chosen_curse', '选召诅咒', '被神性意志选为降临容器，全身骨骼开裂并持续发出超低频的引力波悲鸣。', 'Election by outer entities marking the subject as a living anchor; bone fractures singing radio noise.'),
    atom('blasphemous_sacred', '亵渎神圣', '生满肉瘤与触须的畸形生物，在光晕中散发出令人不由自主下跪膜拜的圣洁庄严。', 'Repulsive chimeric aberrations radiating an aura of blinding, undeniable angelic transcendence.'),
    atom('descent_resonance', '降临共振引力', '外神穿透现实薄膜时引发的宇宙级引力渡桥震颤，崇高而足以撕碎凡人每一根毛细血管。', 'Cosmic-scale gravitational tides vibrating across the trans-dimensional transit bridge.'),
    atom('ark_apotheosis', '方舟飞升信条', '寡头集团在封闭舱内宣传的冷酷教条：牺牲地表百亿生灵是新人类跨维跃迁的合理代价。', 'Technocratic dogma rationalizing surface genocide as necessary fuel for trans-human ascension.'),
]
