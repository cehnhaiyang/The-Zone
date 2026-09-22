/**
 * presets.ts
 *
 * 叙事模式、节奏、主旨、主轴的预定义库。
 *
 * 四者共用 {@link _Nar} 基底（id / name / desc / prompt），区别只在 id 的取值域：
 * - {@link NarMode}      id 取自 NarrativeMode，决定叙事生命周期；
 * - {@link NarPacing}    id 取自 NarrativePacing，控制张力释放曲线；
 * - {@link NarMotif}     id 为自由字符串，规定事件在精神维度的重量；
 * - {@link NarMainAxis}  id 为自由字符串，规定节点压力结构与玩家行为逻辑。
 *
 * @see ../../meta/interface.ts
 */

import type { NarMainAxis, NarMode, NarMotif, NarPacing } from '../../meta'

export const MODES_DEF: NarMode[] = [
    {
        id: 'chain',
        name: '链式叙事',
        desc: '持久化的故事网格。在整个生命周期内维护相同的核心主题、主轴与主旨，支持伏笔积累、NPC 状态长效追踪与跨区域的暗线编织。',
        prompt: '[MODE: CHAIN] Maintain persistent global narrative state across zones. Track plot points and NPC memory. Focus cross-zone foreshadowing and consequence. FORBIDDEN: isolated events.',
    },
    {
        id: 'episodic',
        name: '单元剧叙事',
        desc: '沙盒化的即时生成。不挂载全局叙事栈，每次生成均作为独立的短篇剧本进行评估，适合快速验证战术构筑或体验极端环境。',
        prompt: '[MODE: EPISODIC] Treat each zone as self-contained short story. Rapid arc compression. FORBIDDEN: referencing persistent plot states or global foreshadowing.',
    },
]

export const NARRATIVE_PACING: NarPacing[] = [
    {
        id: 'slow',
        name: '慢热',
        desc: '氛围压抑，危机潜伏。每一步都弥漫着不安，真正的恐惧永远藏在看不见的转角之后。',
        prompt: '[PACING: SLOW_BURN] Creeping ambient dread. At least 3 sensory details per node. Threat implied before encountered. FORBIDDEN: explicit monster reveals or jump scares.',
    },
    {
        id: 'balanced',
        name: '均衡',
        desc: '张弛有度：探索、解谜、战斗、叙事的标准平衡。高压时刻之后必有喘息的空间。',
        prompt: '[PACING: BALANCED] Alternate safe discovery and acute threat at about 2:1. Each dangerous node followed by contextual reward. FORBIDDEN: unbroken pressure without relief.',
    },
    {
        id: 'fast',
        name: '肾上腺素',
        desc: '高密度威胁，每个节点都是决策点。快速推进，物资充足，但代价同样高昂。',
        prompt: '[PACING: ADRENALINE] Urgent active voice. Every node implies imminent or recent encounter. Sensory detail serves tactics. FORBIDDEN: lengthy atmospheric paragraphs.',
    },
    {
        id: 'psych',
        name: '心理向',
        desc: '意识流叙事。现实与幻觉的边界正在溶解，最深的恐惧来自内心而非外部。',
        prompt: '[PACING: PSYCHOLOGICAL] Unreliable narration. Low sanity contradicts established facts. Synesthetic descriptions. FORBIDDEN: objective neutral narration.',
    },
]

export const MOTIF_PRESETS: NarMotif[] = [
    {
        id: 'karma',
        name: '因果报应',
        desc: '所有罪恶必将以另一种形式偿还，无论施害者是否记得自己做了什么。',
        prompt: '[MOTIF: KARMA] Every significant action accrues narrative debt that later manifests as traceable consequence. FORBIDDEN: arbitrary punishment or reward.',
    },
    {
        id: 'sacrifice',
        name: '牺牲的重量',
        desc: '天平的另一端，永远需要填上真实的代价。总要有人付出，以便其他人继续前行。',
        prompt: '[MOTIF: SACRIFICE] Meaningful progress requires permanent non-recoverable cost. Always allow refusal with visible consequence. FORBIDDEN: trivial or reversible sacrifice framed as weighty.',
    },
    {
        id: 'forbiddenTruth',
        name: '无知的庇护',
        desc: '无知是一种祝福，而你已经打破了它。有些真相，不知道才是正确答案。',
        prompt: '[MOTIF: FORBIDDEN_TRUTH] Knowledge carries cognitive cost. Willful ignorance can be rewarded. FORBIDDEN: discovery as straightforwardly positive.',
    },
    {
        id: 'complicity',
        name: '同谋的重量',
        desc: '你没有扣下扳机，但子弹仍然是你的。沉默也是一种选择。',
        prompt: '[MOTIF: COMPLICITY] Inaction has moral weight equal to action. Bystander moments have consequences. FORBIDDEN: clean conscience through passivity.',
    },
    {
        id: 'retainedHumanity',
        name: '人性的残存',
        desc: '在漆黑的深渊中，同理心是最后的弱点，也是唯一的意义。',
        prompt: '[MOTIF: RETAINED_HUMANITY] Empathy and survival oppose. Humane choices open unique branches. FORBIDDEN: moral choices as merely aesthetic.',
    },
    {
        id: 'inheritedSin',
        name: '罪孽的传承',
        desc: '父辈种下的苦果，在你身上开花。你为自己不曾选择的罪付出代价。',
        prompt: '[MOTIF: INHERITED_SIN] Protagonist bears culpability for prior sins. Antagonist grievance is legitimate. FORBIDDEN: clear moral binary.',
    },
    {
        id: 'nihilism',
        name: '虚无主义',
        desc: '无论你做什么，最终都归于静寂。意义是我们对抗恐惧的最后一个谎言。',
        prompt: '[MOTIF: NIHILISM] Effort is small against cosmic scope. Success is temporary and framed as such. FORBIDDEN: redemptive arcs or meaningful endings.',
    },
    {
        id: 'endlessCycle',
        name: '绝望循环',
        desc: '这不是第一次，也不会是最后一次。你的挣扎被完美地录制下来，供下一个人观看。',
        prompt: '[MOTIF: ENDLESS_CYCLE] Recurring symbols echo prior failures. Leave one differing element. FORBIDDEN: cycle-breaking resolution.',
    },
    {
        id: 'illusoryChoice',
        name: '自由意志的错觉',
        desc: '剧本早已写好，你只是以为自己在读台词，而不是被台词说出。',
        prompt: '[MOTIF: ILLUSORY_CHOICE] Divergent choices converge to structurally identical outcomes. Offer distinct paths. FORBIDDEN: choices altering structural fate.',
    },
    {
        id: 'identityErosion',
        name: '身份的侵蚀',
        desc: '当所有支撑“你是谁”的事物被逐一移除，剩下的还是你吗？',
        prompt: '[MOTIF: IDENTITY_EROSION] Progressively strip markers of selfhood. Register each loss. FORBIDDEN: stable identity recoverable.',
    },
    {
        id: 'witnessCurse',
        name: '目击者诅咒',
        desc: '看见它之后，你就无法不再看见它。认知本身成为了诅咒的载体。',
        prompt: '[MOTIF: WITNESS_CURSE] Knowledge irreversibly alters perception. Prior neutral elements become threatening. FORBIDDEN: un-knowing truth.',
    },
    {
        id: 'memoryBetrayal',
        name: '记忆的背叛',
        desc: '你的童年，真的是你经历过的吗？记忆是证据，还是证据的对立面？',
        prompt: '[MOTIF: MEMORY_BETRAYAL] Contradictory evidence for personal history remains unresolved. FORBIDDEN: reliable memory.',
    },
    {
        id: 'irreversibility',
        name: '时间的不可逆',
        desc: '你无法归还已经发生的事。每一分钟的流逝都是一扇永久关闭的门。',
        prompt: '[MOTIF: IRREVERSIBILITY] Decisions are final. Time passage is continuous loss. FORBIDDEN: reversal or undo framing.',
    },
    {
        id: 'griefAndContinuation',
        name: '哀悼与继续',
        desc: '不允许你停下来哀悼，但创伤一直在等你有空的时候。',
        prompt: '[MOTIF: GRIEF_AND_CONTINUATION] Loss resolves emotionally only in delayed displaced ways. FORBIDDEN: clean closure.',
    },
    {
        id: 'powerCorruption',
        name: '权力的腐蚀',
        desc: '它从未腐蚀别人，只腐蚀你。而且它总是慢慢来。',
        prompt: '[MOTIF: POWER_CORRUPTION] Escalating capability causes visible behavioral drift and moral compromise. FORBIDDEN: power without cost.',
    },
    {
        id: 'systemicEvil',
        name: '系统的共谋',
        desc: '没有怪物，只有规则。规则是怪物。',
        prompt: '[MOTIF: SYSTEMIC_EVIL] Horror is structural, not individual. System functions correctly while producing atrocity. FORBIDDEN: identifiable individual as primary culprit.',
    },
    {
        id: 'costOfTrust',
        name: '信任的代价',
        desc: '你依赖的人，也是你最脆弱的弱点。这不是阴谋，这只是规律。',
        prompt: '[MOTIF: COST_OF_TRUST] Bonding creates proportional vulnerability. Distinguish betrayal from consequence. FORBIDDEN: trust as unambiguously safe.',
    },
    {
        id: 'secondSeeingPrice',
        name: '顿悟的终局',
        desc: '看透现实薄膜的代价，是脑叶的炭化。真理与凡胎生存从不可兼得。',
        prompt: '[MOTIF: SECOND_SEEING_PRICE] Ultimate comprehension incurs physical and mental extinction. Surviving requires deliberate blindness. FORBIDDEN: surviving full enlightenment unscathed.',
    },
    {
        id: 'humanityAsFuel',
        name: '人类燃料论',
        desc: '凡人的痛苦与文明的覆灭，不过是高维飞升仪式所需的引力助推剂。',
        prompt: '[MOTIF: HUMANITY_AS_FUEL] Human civilization is demoted from subject to merely energetic byproduct. Suffering has no dignity. FORBIDDEN: anthropocentric triumph or cosmic moral sympathy.',
    },
    {
        id: 'arkBetrayal',
        name: '方舟的虚妄',
        desc: '被许诺的方舟并不是救赎之所，而是一座最先从内部腐烂的加固铁棺。',
        prompt: '[MOTIF: ARK_BETRAYAL] Institutional promised sanctuaries are dead ends. Trusting institutional refuge seals doomed fate. FORBIDDEN: pristine safety found in official installations.',
    },
    {
        id: 'semanticLoss',
        name: '失语的孤独',
        desc: '当痛苦无法再被词汇精准表达，人性的孤绝便随着语言一同彻底溶解。',
        prompt: '[MOTIF: SEMANTIC_LOSS] Inability to diegetically articulate trauma isolates survivors completely. Empathy fails as words melt. FORBIDDEN: shared cathartic emotional speeches.',
    },
    {
        id: 'incurableSalvation',
        name: '不可逆的救赎',
        desc: '免于当场死亡的每一步妥协，都在以永远放弃作为人类的资格为抵押。',
        prompt: '[MOTIF: INCURABLE_SALVATION] Survival solutions permanently alienate the survivor from humanity. Cure is another strain of decay. FORBIDDEN: pristine biological restoration.',
    },
]

export const AXIS_PRESETS: NarMainAxis[] = [
    {
        id: 'huntAndCounter',
        name: '猎杀与反制',
        desc: '在狩猎者与猎物之间切换立场。主动权随信息与资源消长而流转。',
        prompt: '[AXIS: HUNT_AND_COUNTER] Power asymmetry between tracker and tracked. Information is weapon. Every node clarifies hunter and prey. FORBIDDEN: prolonged ambiguity without discoverable evidence.',
    },
    {
        id: 'evasionAndHiding',
        name: '逃亡隐匿',
        desc: '不要出声，压低呼吸。它就在门外，而你的藏身处不会永远保持完整。',
        prompt: '[AXIS: EVASION_AND_HIDING] Stealth survival under persistent pursuit. Hiding spots are fragile. FORBIDDEN: lasting safety.',
    },
    {
        id: 'scavenging',
        name: '资源搜刮',
        desc: '在废墟中翻找一切能让你活过今天的碎片。每次搜查都是一次赌注。',
        prompt: '[AXIS: SCAVENGING] Resource desperation drives search. Mundane utility matters. Scarcity must be diegetically explained. FORBIDDEN: arbitrary loot.',
    },
    {
        id: 'escortAndRetrieval',
        name: '护送回收',
        desc: '哪怕只剩你一个人，也要把它送到目的地。这个重量不允许你停下来。',
        prompt: '[AXIS: ESCORT_AND_RETRIEVAL] Burdened progression around fragile subject or item. Threats magnetically target it. FORBIDDEN: loss as mere stat penalty.',
    },
    {
        id: 'defensiveStand',
        name: '阵地坚守',
        desc: '守住这扇门，直到黎明或死亡降临。资源在倒计时，结构在让步。',
        prompt: '[AXIS: DEFENSIVE_STAND] Static siege with dwindling defensive resources. Establish what is protected. FORBIDDEN: hold-point without value.',
    },
    {
        id: 'decapitationStrike',
        name: '斩首行动',
        desc: '切断毒蛇的头，剩余的躯干自会崩溃。目标确认，误伤代价高昂。',
        prompt: '[AXIS: DECAPITATION_STRIKE] Surgical strike against high-value target. Reconnaissance prerequisite. FORBIDDEN: target without characterization.',
    },
    {
        id: 'breakthrough',
        name: '突破封锁',
        desc: '唯一的出路在前方，所有迂回都已关闭。这是速度与代价的计算。',
        prompt: '[AXIS: BREAKTHROUGH] Forward-only momentum through organized opposition. No retreat. Progress alters threat landscape. FORBIDDEN: cost-free advance.',
    },
    {
        id: 'attrition',
        name: '消耗战',
        desc: '你没有足够多的子弹杀死所有人，但你有足够多的时间熬死他们。',
        prompt: '[AXIS: ATTRITION] Mutual resource drain over extended engagement. Tempo over aggression. FORBIDDEN: rapid decisive victory.',
    },
    {
        id: 'vengeance',
        name: '复仇路线',
        desc: '以眼还眼，直到世界盲目为止。每一个目标背后都有下一个目标。',
        prompt: '[AXIS: VENGEANCE] Targeted retribution chain. Each step raises cost. Establish loss before first step. FORBIDDEN: clean cheap revenge.',
    },
    {
        id: 'reconstructEvidence',
        name: '线索重建',
        desc: '在碎片中还原出完整的事件序列。每一条错误的推理都要付出时间代价。',
        prompt: '[AXIS: RECONSTRUCT_EVIDENCE] Assemble event sequence from fragments. False leads exist and cost. FORBIDDEN: obviously marked false clues.',
    },
    {
        id: 'containment',
        name: '收容锁闭',
        desc: '把无法理解的现象关进盒子里。理解它不是目标，控制它才是。',
        prompt: '[AXIS: CONTAINMENT] Identify, isolate, survive anomaly without full comprehension. FORBIDDEN: full understanding rewarded.',
    },
    {
        id: 'reactivateBeacon',
        name: '信标重启',
        desc: '让死去的机器再次亮起希望之光。不确定重启后什么会随之而来。',
        prompt: '[AXIS: REACTIVATE_BEACON] Restore dormant infrastructure with uncertain consequences. Completion raises new unresolved question. FORBIDDEN: unambiguous positive restoration.',
    },
    {
        id: 'cartography',
        name: '绘制未知',
        desc: '填补地图上的空白区域。知识本身是你最紧缺的资源。',
        prompt: '[AXIS: CARTOGRAPHY] Knowledge expansion through spatial exploration. Mapping has mechanical stakes. FORBIDDEN: unexplored areas merely unknown.',
    },
    {
        id: 'negotiation',
        name: '谈判斡旋',
        desc: '你没有足够的子弹，但你有足够的信息。先开口说话的人，通常不是死的那个。',
        prompt: '[AXIS: NEGOTIATION] Social leverage as primary resource. Violence present but usually inferior. FORBIDDEN: social failure as aesthetic only.',
    },
    {
        id: 'deconstructPuzzle',
        name: '拼图解构',
        desc: '谜题的答案已经在你眼前了，只是你还没有以正确的方式看它。',
        prompt: '[AXIS: DECONSTRUCT_PUZZLE] Environmental or logical puzzles gate advancement. Solutions discoverable through logic. FORBIDDEN: arbitrary solutions or full reset failure.',
    },
    {
        id: 'archiveRetrieval',
        name: '档案溯源',
        desc: '它曾经发生过，而且有记录在案。找到记录，然后找到为什么记录是不完整的。',
        prompt: '[AXIS: ARCHIVE_RETRIEVAL] Navigate institutional records to reconstruct suppressed history. Most important document costs most. FORBIDDEN: easy access to core truth.',
    },
    {
        id: 'supplyMaintenance',
        name: '供应线维持',
        desc: '食物、水、药品。每一天的存活都需要主动维护。不管理，就衰减。',
        prompt: '[AXIS: SUPPLY_MAINTENANCE] Logistics management under continuous depletion. Scarcity predictable and diegetic. FORBIDDEN: arbitrary shortage.',
    },
    {
        id: 'baseBuilding',
        name: '营地构建',
        desc: '在废墟中建立一个足以支撑下一步行动的立足点。没有立足点，就没有下一步。',
        prompt: '[AXIS: BASE_BUILDING] Fortification investment under material constraint. Base vulnerability matters. FORBIDDEN: base decisions without long-term consequence.',
    },
    {
        id: 'medicalTriage',
        name: '医疗分流',
        desc: '资源不够救所有人。你必须决定谁先，谁后，以及谁不在计划内。',
        prompt: '[AXIS: MEDICAL_TRIAGE] Constrained allocation under time pressure. At least one no-correct-answer decision. FORBIDDEN: purely mechanical choice framing.',
    },
    {
        id: 'infectionControl',
        name: '感染管控',
        desc: '你不知道谁已经被感染了。你知道的是，等到你确定的时候，往往已经太晚。',
        prompt: '[AXIS: INFECTION_CONTROL] Hidden infection status creates paranoia. Quarantine decisions cost either way. Include false positives. FORBIDDEN: perfect early detection.',
    },
    {
        id: 'timeWindow',
        name: '时间窗口',
        desc: '窗口正在关闭。在它完全合上之前，你必须完成足够多的事情。',
        prompt: '[AXIS: TIME_WINDOW] Hard countdown forces prioritization. Time cost explicit. FORBIDDEN: arbitrary generous margin.',
    },
    {
        id: 'factionMediation',
        name: '派系斡旋',
        desc: '他们彼此憎恨，但都需要你。小心不要成为任何人的工具。',
        prompt: '[AXIS: FACTION_MEDIATION] Maintain relations with mutually hostile factions. Satisfying one compromises another. FORBIDDEN: clean alliance menu.',
    },
    {
        id: 'defectionAndRecruitment',
        name: '叛逃与招募',
        desc: '把对方的人拉过来，或者把自己的人送过去。每一次转化都改变了力量对比。',
        prompt: '[AXIS: DEFECTION_AND_RECRUITMENT] Personnel movement as strategic lever. Each recruit has breaking point and liability. FORBIDDEN: free conversion.',
    },
    {
        id: 'courierNetwork',
        name: '秘密传递',
        desc: '信息本身就是武器。但携带武器的人，是任何一方都不会放过的目标。',
        prompt: '[AXIS: COURIER_NETWORK] Information as physical contraband. Delivery delay changes value. FORBIDDEN: content not mattering.',
    },
    // --- 深渊核心机制驱动主轴 ---
    {
        id: 'filterMaintenance',
        name: '滤网抢修',
        desc: '光电目镜完整度急剧衰竭。必须在第二次看见将大脑炭化前找到抗阻芯片与稳压清洗液。',
        prompt: '[AXIS: FILTER_MAINTENANCE] Race against depleting optical integrity and rising neural noise. Hardware failure triggers lethal perceptual crisis. FORBIDDEN: permanent passive filters.',
    },
    {
        id: 'blackBoxRecovery',
        name: '黑匣提取',
        desc: '深入基金会外围收容区残骸提取原始实验硬盘，躲避清理人部队的无差别清除。',
        prompt: '[AXIS: BLACK_BOX_RECOVERY] Infiltrate high-threat containment cores to extract encrypted drives while pursued by Cleaners. FORBIDDEN: painless data retrieval.',
    },
    {
        id: 'dilationBreakthrough',
        name: '湍流穿透',
        desc: '穿越时间流速断裂带。在代谢枯竭与因果错乱彻底封闭出口前冲出死区。',
        prompt: '[AXIS: DILATION_BREAKTHROUGH] Navigating fluctuating dilationFactor zones under heavy stamina and sanity burn. Turn order and causal sequence invert. FORBIDDEN: stable safe passages.',
    },
    {
        id: 'replacementSelection',
        name: '岗位替代抉择',
        desc: '生命维持设施濒临停机。必须依据体征与职责，决定将谁永久锁死在致命的操作台上。',
        prompt: '[AXIS: REPLACEMENT_SELECTION] Enforce workstation replacement rules under structural collapse. Leaving a post unmanned triggers environmental catastrophe. FORBIDDEN: costless personnel transfers.',
    },
    {
        id: 'anchorDisruption',
        name: '引力锚点拆除',
        desc: '摧毁向深空广播高频谐振的广播发射机阵列，平息汇聚于此的高维引力潮汐。',
        prompt: '[AXIS: ANCHOR_DISRUPTION] Sabotage resonance arrays while resisting psychic tidal pulls. Disabling hardware draws acute localized entity retaliation. FORBIDDEN: quiet painless sabotage.',
    },
]
