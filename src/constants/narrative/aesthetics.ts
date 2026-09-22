/**
 * aesthetics.ts
 *
 * 恐怖美学预定义库。
 *
 * 恐怖美学由恐怖元与恐怖域调配而成，是玩家在叙事面板中真正选择的对象：
 * - primaryDomain     主控域，决定美学的本体论基调；
 * - interferingDomains 渗透 / 干涉域，在主控域之上叠加异质折射；
 * - structure.skeleton 骨架：决定美学核心意象的元，dominance 之和须为 1.0；
 * - structure.flesh    血肉：显化阶段的元，revealPhase 仅对链式叙事有效；
 * - structure.resonance 共鸣：元与元之间的本体论作用机制。
 *
 * 对应元契约 {@link HorrorAesthetic}，契约声明本库维护于本文件。
 *
 * @see ../../meta/interface.ts
 */

import type { HorrorAesthetic, HorrorDomain } from '../../meta'

/** 恐怖美学构造辅助：展开 structure 三元组，仅用于压缩数据表书写。 */
const aesthetic = (
    id: string,
    name: string,
    desc: string,
    prompt: string,
    primaryDomain: HorrorDomain['id'],
    interferingDomains: HorrorDomain['id'][],
    structure: HorrorAesthetic['structure'],
): HorrorAesthetic => ({
    id,
    name,
    desc,
    prompt,
    primaryDomain,
    interferingDomains,
    structure,
})

export const HORROR_AESTHETICS: HorrorAesthetic[] = [
    // 1. 生物机械恐怖 (Biomechanica)
    aesthetic(
        'biomechanica',
        '生物机械恐怖',
        '肉体向冰冷机械的不可逆异化。筋膜绞入齿轮，机体不再属于自己，且金属增生无法停止。',
        '[AESTHETIC: BIOMECHANICA] SENSORY: iron-blood smell, hydraulic fluid, wet warmth over cold machinery. VISUAL: musculature wrapped around infrastructure, pipes as veins, rivets through cartilage. RULE: equipment fuses with flesh; removal tears tissue; mutation is irreversible. SANITY TRIGGER: witnessing self or another flesh-machine mutation. FORBIDDEN: clean cybernetics, painless augmentation, reversible integration.',
        'soma',
        ['techne', 'hyle'],
        {
            skeleton: [
                { atomId: 'flesh_gear', dominance: 0.4 },
                { atomId: 'hydraulic_vein', dominance: 0.3 },
                { atomId: 'bone_metal_fusion', dominance: 0.3 },
            ],
            flesh: [
                { atomId: 'involuntary_augmentation', revealPhase: 'setup' },
                { atomId: 'iv_rack_fusion', revealPhase: 'rising' },
                { atomId: 'neural_link_noise', revealPhase: 'climax' },
                { atomId: 'rust_grind', revealPhase: 'falling' },
            ],
            resonance: [
                { atomId: ['flesh_gear', 'bone_metal_fusion'], type: 'symbiosis' },
                { source: ['hydraulic_vein'], target: ['involuntary_augmentation'], type: 'parasitism' },
            ],
        },
    ),

    // 2. 赛博神秘学 (Cyber Occult)
    aesthetic(
        'cyberOccult',
        '赛博神秘学',
        '信息与电子数据流中栖居着超自然灵体。代码成为祷词，网络成为冥界，荧光屏显化神谕。',
        '[AESTHETIC: CYBER_OCCULT] SENSORY: ozone, incense, static resolving into voices. VISUAL: sigils in server rooms, CRT faces in snow, data cables as funeral banners. RULE: signal strength equals entity presence; neural noise deepens revelation. SANITY TRIGGER: receiving unparseable signals or hallucinatory overlays. FORBIDDEN: secular irony about rituals; devices as mere tools.',
        'techne',
        ['hieros', 'psyche'],
        {
            skeleton: [
                { atomId: 'signal_possession', dominance: 0.4 },
                { atomId: 'code_prayer', dominance: 0.35 },
                { atomId: 'dead_channel', dominance: 0.25 },
            ],
            flesh: [
                { atomId: 'surveillance_static', revealPhase: 'setup' },
                { atomId: 'blasphemous_sacred', revealPhase: 'rising' },
                { atomId: 'divine_command', revealPhase: 'climax' },
                { atomId: 'neural_static_drone', revealPhase: 'falling' },
            ],
            resonance: [
                { atomId: ['code_prayer', 'blasphemous_sacred'], type: 'symbiosis' },
                { source: ['signal_possession'], target: ['dead_channel'], type: 'herald' },
            ],
        },
    ),

    // 3. 宇宙恐怖 (Cosmic Horror)
    aesthetic(
        'cosmicHorror',
        '宇宙恐怖',
        '不可知的宏伟尺度碾压与人类微粒般认知的无意义化。理解即是毁灭，挣扎皆属虚妄。',
        '[AESTHETIC: COSMIC_HORROR] SENSORY: pressure silence, scale vertigo, cold absence. VISUAL: non-Euclidean megastructures, blind celestial masses, negative-curvature light. RULE: cosmic entities cannot be targeted or killed; survival is avoidance and lowered gaze. SANITY TRIGGER: perceiving outline or fragment of structure. FORBIDDEN: heroic victory, meaningful triumph, understandable motive.',
        'logos',
        ['topos', 'thanatos'],
        {
            skeleton: [
                { atomId: 'cosmic_insignificance', dominance: 0.4 },
                { atomId: 'scale_vertigo', dominance: 0.35 },
                { atomId: 'membrane_penetrated', dominance: 0.25 },
            ],
            flesh: [
                { atomId: 'non_euclid_angle', revealPhase: 'setup' },
                { atomId: 'larger_inside', revealPhase: 'rising' },
                { atomId: 'contaminated_knowledge', revealPhase: 'climax' },
                { atomId: 'meaningless_victory', revealPhase: 'resolution' },
            ],
            resonance: [
                { atomId: ['scale_vertigo', 'cosmic_insignificance'], type: 'polarization' },
                { source: ['membrane_penetrated'], target: ['contaminated_knowledge'], type: 'herald' },
            ],
        },
    ),

    // 4. 时间异常 (Temporal Anomaly)
    aesthetic(
        'temporal',
        '时间异常',
        '因果链条彻底断裂。未来侵蚀过去，结果先于原因发生，遗骸在转角向生者致意。',
        '[AESTHETIC: TEMPORAL] SENSORY: deja vu pressure, reversed acoustics, ozone from temporal discharge. VISUAL: frozen explosions, reversed rain, clocks with impossible hands, overlapping ruins. RULE: cycles jump; node states contradict ticks; causes and effects invert. SANITY TRIGGER: meeting own past or future remains. FORBIDDEN: stable chronology, undo as safety, paradox neatly solved.',
        'chronos',
        ['psyche', 'topos'],
        {
            skeleton: [
                { atomId: 'causal_inversion', dominance: 0.4 },
                { atomId: 'frozen_explosion', dominance: 0.3 },
                { atomId: 'future_corpse', dominance: 0.3 },
            ],
            flesh: [
                { atomId: 'looping_event', revealPhase: 'setup' },
                { atomId: 'reversed_rain', revealPhase: 'rising' },
                { atomId: 'future_broadcast', revealPhase: 'climax' },
                { atomId: 'memory_contradiction', revealPhase: 'falling' },
            ],
            resonance: [
                { atomId: ['causal_inversion', 'future_corpse'], type: 'symbiosis' },
                { source: ['future_broadcast'], target: ['looping_event'], type: 'herald' },
            ],
        },
    ),

    // 5. 民俗恐怖 (Folk Horror)
    aesthetic(
        'folkHorror',
        '民俗恐怖',
        '残存在废土聚落底层的远古血腥契约。禁忌、轮盘抽签与活人献祭不可违逆。',
        '[AESTHETIC: FOLK_HORROR] SENSORY: incense, damp earth, distant procession music. VISUAL: bone totems, eyeless masks, candlelit rites, offerings hanging from trees. RULE: trust is driven by ritual progress; taboo violation escalates zone threat. SANITY TRIGGER: forced participation, sacrifice, or betrayal by community. FORBIDDEN: dismissing belief as fake; rituals must be causally real.',
        'polis',
        ['hieros', 'zoe'],
        {
            skeleton: [
                { atomId: 'forced_ritual', dominance: 0.4 },
                { atomId: 'sacrifice_altar', dominance: 0.3 },
                { atomId: 'collective_joy_horror', dominance: 0.3 },
            ],
            flesh: [
                { atomId: 'rule_as_monster', revealPhase: 'setup' },
                { atomId: 'harvest_ritual', revealPhase: 'rising' },
                { atomId: 'ecstatic_ritual', revealPhase: 'climax' },
                { atomId: 'replacement_lottery', revealPhase: 'falling' },
            ],
            resonance: [
                { atomId: ['collective_joy_horror', 'ecstatic_ritual'], type: 'polarization' },
                { source: ['rule_as_monster'], target: ['forced_ritual'], type: 'parasitism' },
            ],
        },
    ),

    // 6. 极端生态 (Hostile Biosphere)
    aesthetic(
        'hostileBiosphere',
        '极端生态',
        '生态圈演化出针对人类的主动捕食恶意。环境本身不再是背景，而是饥肠辘辘的猎手。',
        '[AESTHETIC: HOSTILE_BIOSPHERE] SENSORY: humid rot, sweet spores, ground yielding like flesh. VISUAL: bioluminescent predator flora, breathing walls, corridors lined with spores. RULE: threat rises with exploration steps; searching provokes ecological counterattack. SANITY TRIGGER: realizing environment tastes, watches, and hunts. FORBIDDEN: passive wilderness; nature must be intentional.',
        'physis',
        ['zoe', 'soma'],
        {
            skeleton: [
                { atomId: 'predator_flora', dominance: 0.4 },
                { atomId: 'breathing_wall', dominance: 0.3 },
                { atomId: 'spore_cloud', dominance: 0.3 },
            ],
            flesh: [
                { atomId: 'living_soil', revealPhase: 'setup' },
                { atomId: 'toxic_marsh', revealPhase: 'rising' },
                { atomId: 'swarm_breeding', revealPhase: 'climax' },
                { atomId: 'flesh_mould_substrate', revealPhase: 'resolution' },
            ],
            resonance: [
                { atomId: ['breathing_wall', 'living_soil'], type: 'symbiosis' },
                { source: ['spore_cloud'], target: ['incubation'], type: 'herald' },
            ],
        },
    ),

    // 7. 认知危害 (Cognitive Hazard)
    aesthetic(
        'cognitiveHazard',
        '认知危害',
        '记忆、自我同一性与主观认知全面溶解。你无法确认镜子里的面孔究竟属于谁。',
        '[AESTHETIC: COGNITIVE_HAZARD] SENSORY: antiseptic rot, absent sound, wrong familiarity. VISUAL: mirrors with strangers, rewriting signs, familiar faces flattening. RULE: neural noise corrupts UI; NPC memories contradict; logs deny player identity. SANITY TRIGGER: discovering self-evidence is false. FORBIDDEN: reliable memory, objective confirmation, clean identity recovery.',
        'psyche',
        ['alterity', 'techne'],
        {
            skeleton: [
                { atomId: 'memory_contradiction', dominance: 0.4 },
                { atomId: 'stranger_mirror', dominance: 0.3 },
                { atomId: 'identity_blur', dominance: 0.3 },
            ],
            flesh: [
                { atomId: 'rewriting_text', revealPhase: 'setup' },
                { atomId: 'false_diary', revealPhase: 'rising' },
                { atomId: 'fake_person', revealPhase: 'climax' },
                { atomId: 'hallucination_overlay', revealPhase: 'falling' },
            ],
            resonance: [
                { atomId: ['identity_blur', 'stranger_mirror'], type: 'polarization' },
                { source: ['false_diary'], target: ['memory_contradiction'], type: 'parasitism' },
            ],
        },
    ),

    // 8. 梦境逻辑 (Dream Logic)
    aesthetic(
        'dreamLogic',
        '梦境逻辑',
        '空间拓扑非欧化，现实遵循荒诞噩梦的跳跃因果。开门见底，死路即是出发点。',
        '[AESTHETIC: DREAM_LOGIC] SENSORY: synesthesia, gravity shifts, sounds with color. VISUAL: Escher stairs, rooms larger inside, doors opening into themselves. RULE: exits reshuffle each turn; adjacent threat levels jump without transition. SANITY TRIGGER: spatial paradox and repeated return. FORBIDDEN: consistent physics, stable map, logical route.',
        'topos',
        ['psyche', 'logos'],
        {
            skeleton: [
                { atomId: 'impossible_exit', dominance: 0.4 },
                { atomId: 'larger_inside', dominance: 0.3 },
                { atomId: 'infinite_corridor', dominance: 0.3 },
            ],
            flesh: [
                { atomId: 'liminal_space', revealPhase: 'setup' },
                { atomId: 'non_euclid_angle', revealPhase: 'rising' },
                { atomId: 'ontological_drift', revealPhase: 'climax' },
                { atomId: 'absurd_repeat', revealPhase: 'resolution' },
            ],
            resonance: [
                { atomId: ['infinite_corridor', 'liminal_space'], type: 'symbiosis' },
                { source: ['non_euclid_angle'], target: ['impossible_exit'], type: 'herald' },
            ],
        },
    ),

    // 9. 寄生共生 (Parasitic Symbiosis)
    aesthetic(
        'parasiticSymbiosis',
        '寄生共生',
        '为了在废土存活不得不接纳异种寄生。索取不可知力量的同时，灵魂被一口口啃食。',
        '[AESTHETIC: PARASITIC_SYMBIOSIS] SENSORY: subdermal chittering, warmth from wound, phantom itching. VISUAL: spinal parasites, translucent tendrils, half-assimilated faces. RULE: symbiosis grants power but drains sanity and vigor; removal risks death. SANITY TRIGGER: parasite speaks or acts without consent. FORBIDDEN: sudden transformation; loss of autonomy must be gradual.',
        'physis',
        ['soma', 'psyche'],
        {
            skeleton: [
                { atomId: 'parasite_spine', dominance: 0.45 },
                { atomId: 'involuntary_augmentation', dominance: 0.3 },
                { atomId: 'flesh_mould_substrate', dominance: 0.25 },
            ],
            flesh: [
                { atomId: 'living_soil', revealPhase: 'setup' },
                { atomId: 'spore_cloud', revealPhase: 'rising' },
                { atomId: 'dead_voice', revealPhase: 'climax' },
                { atomId: 'flesh_gear', revealPhase: 'falling' },
            ],
            resonance: [
                { source: ['parasite_spine'], target: ['involuntary_augmentation'], type: 'parasitism' },
                { atomId: ['dead_voice', 'parasite_spine'], type: 'symbiosis' },
            ],
        },
    ),

    // 10. 工业熵寂 (Industrial Entropy)
    aesthetic(
        'industrialEntropy',
        '工业熵寂',
        '庞大、冰冷、无休止且毫无目的的机械永动机。锈蚀与摩擦碾碎一切意义。',
        '[AESTHETIC: INDUSTRIAL_ENTROPY] SENSORY: dry heat, rust dust, endless mechanical grinding. VISUAL: conveyor belts without workers, rusted gears, black water lakes. RULE: nodes are linear; search yields decay; machines drop no organic loot. SANITY TRIGGER: realizing machines have no controller, product, or stop switch. FORBIDDEN: purposeful industry, salvage that restores meaning.',
        'hyle',
        ['logos', 'topos'],
        {
            skeleton: [
                { atomId: 'entropy_machine', dominance: 0.4 },
                { atomId: 'rust_grind', dominance: 0.35 },
                { atomId: 'purposeless_machine', dominance: 0.25 },
            ],
            flesh: [
                { atomId: 'black_water', revealPhase: 'setup' },
                { atomId: 'pollution_sheen', revealPhase: 'rising' },
                { atomId: 'consumer_relic', revealPhase: 'climax' },
                { atomId: 'meaningless_victory', revealPhase: 'resolution' },
            ],
            resonance: [
                { atomId: ['purposeless_machine', 'entropy_machine'], type: 'symbiosis' },
                { atomId: ['consumer_relic', 'rust_grind'], type: 'polarization' },
            ],
        },
    ),

    // 11. 临床深渊 (Clinical Abyss - 阿斯克勒庇俄斯实验区)
    aesthetic(
        'clinicalAbyss',
        '临床深渊',
        '以医学救赎为伪装的深层活体转化设施。防腐剂掩盖不住黑色晶体原液的腥臭。',
        '[AESTHETIC: CLINICAL_ABYSS] SENSORY: stinging chemical bleach, burning copper, pressurized oxygen hiss, wet suction. VISUAL: rusted surgical retractors, lead-lined quarantine beds, black serum drips, flayed charts. RULE: healing requires contaminated surgical intervention; health recovery drains sanity; lead walls block communication. SANITY TRIGGER: witnessing vivisection logs or waking strapped to a conversion table. FORBIDDEN: wholesome medical care, aseptic safety, painless procedures.',
        'soma',
        ['techne', 'polis'],
        {
            skeleton: [
                { atomId: 'astra_infusion', dominance: 0.4 },
                { atomId: 'asclepius_protocol', dominance: 0.35 },
                { atomId: 'iv_rack_fusion', dominance: 0.25 },
            ],
            flesh: [
                { atomId: 'leukotomy_scar', revealPhase: 'setup' },
                { atomId: 'containment_failure', revealPhase: 'rising' },
                { atomId: 'deathless_wound', revealPhase: 'climax' },
                { atomId: 'lead_lining_decay', revealPhase: 'falling' },
            ],
            resonance: [
                { source: ['astra_infusion'], target: ['iv_rack_fusion'], type: 'parasitism' },
                { source: ['asclepius_protocol'], target: ['containment_failure'], type: 'herald' },
            ],
        },
    ),

    // 12. 滤网溃缩 (Second Sight Crisis - 第二次看见)
    aesthetic(
        'secondSightCrisis',
        '滤网溃缩',
        '光电目镜在信息过载中烧蚀剥落。红线框与马赛克消散，视网膜直面未被规整的高维绝对恐怖。',
        '[AESTHETIC: SECOND_SIGHT_CRISIS] SENSORY: deafening neural static drone, blinding green phosphor flare, sharp temporal migraine. VISUAL: cracking digital HUD, pixelated red wireframes shedding into writhing cosmic geometry, glowing static flakes. RULE: camera mode loses integrity rapidly; high noise level sharply sharpens silhouettes but accelerates sanity collapse. SANITY TRIGGER: complete visor breakdown causing the terminal Second Sight. FORBIDDEN: reliable HUD readings, clean filters, stable visual anchors.',
        'techne',
        ['psyche', 'logos'],
        {
            skeleton: [
                { atomId: 'visor_filter_collapse', dominance: 0.45 },
                { atomId: 'second_sight_epiphany', dominance: 0.3 },
                { atomId: 'neural_static_drone', dominance: 0.25 },
            ],
            flesh: [
                { atomId: 'neural_link_noise', revealPhase: 'setup' },
                { atomId: 'surveillance_static', revealPhase: 'rising' },
                { atomId: 'membrane_penetrated', revealPhase: 'climax' },
                { atomId: 'terminal_lucidity_carbon', revealPhase: 'resolution' },
            ],
            resonance: [
                { source: ['visor_filter_collapse'], target: ['second_sight_epiphany'], type: 'herald' },
                { atomId: ['second_sight_epiphany', 'terminal_lucidity_carbon'], type: 'symbiosis' },
            ],
        },
    ),

    // 13. 方舟残骸 (Ark Derelict - 文明石棺)
    aesthetic(
        'arkDerelict',
        '方舟残骸',
        '深埋地壳数千米的超级避难所并未迎来飞升，而是沦为冷冻胚胎腐败、反应堆死寂的封闭金属石棺。',
        '[AESTHETIC: ARK_DERELICT] SENSORY: dead refrigerated chill, leaking Freon gas, heavy low-frequency reactor hum, rotting ozone. VISUAL: frost-crusted cryo-pods, weld-sealed blast valves, dormant corporate banners, emergency strobe beacons. RULE: navigation is strictly linear; sealed bulkheads require heavy power costs; scavenging reveals dead elites and contaminated caches. SANITY TRIGGER: uncovering logs revealing surface abandonment was premeditated. FORBIDDEN: thriving underground societies, functional escape craft, benevolent leadership.',
        'polis',
        ['thanatos', 'hyle'],
        {
            skeleton: [
                { atomId: 'ark_abandonment', dominance: 0.4 },
                { atomId: 'embryonic_decay', dominance: 0.35 },
                { atomId: 'extinction_silence', dominance: 0.25 },
            ],
            flesh: [
                { atomId: 'institutional_sacrifice', revealPhase: 'setup' },
                { atomId: 'classification_expulsion', revealPhase: 'rising' },
                { atomId: 'claustrophobic_seal', revealPhase: 'climax' },
                { atomId: 'consumer_relic', revealPhase: 'resolution' },
            ],
            resonance: [
                { atomId: ['ark_abandonment', 'embryonic_decay'], type: 'symbiosis' },
                { atomId: ['extinction_silence', 'consumer_relic'], type: 'polarization' },
            ],
        },
    ),

    // 14. 语义融解 (Semantic Decay - 语言坍塌)
    aesthetic(
        'semanticDecay',
        '语义融解',
        '现实概念与语言符号彻底脱钩。日记在视线离开时消化重组，求救呼喊沦为不可理解的湿黏杂音。',
        '[AESTHETIC: SEMANTIC_DECAY] SENSORY: wet phoneme whispers, linguistic feedback loops, ink tasting like copper. VISUAL: typography dissolving into fibrous threads, signs swapping names, mouth movements mismatched with sound. RULE: dialogue logs contradict themselves; interaction choices shuffle labels; NPC thoughts render as fragmented glyphs. SANITY TRIGGER: realizing one can no longer recall the name of a loved one or common object. FORBIDDEN: clear expository journals, unambiguous lore tablets, grammatical solace.',
        'psyche',
        ['logos', 'alterity'],
        {
            skeleton: [
                { atomId: 'semantic_melting', dominance: 0.4 },
                { atomId: 'concept_predation', dominance: 0.35 },
                { atomId: 'ontological_drift', dominance: 0.25 },
            ],
            flesh: [
                { atomId: 'rewriting_text', revealPhase: 'setup' },
                { atomId: 'false_diary', revealPhase: 'rising' },
                { atomId: 'identity_blur', revealPhase: 'climax' },
                { atomId: 'fake_person', revealPhase: 'falling' },
            ],
            resonance: [
                { source: ['concept_predation'], target: ['semantic_melting'], type: 'parasitism' },
                { atomId: ['semantic_melting', 'ontological_drift'], type: 'symbiosis' },
            ],
        },
    ),

    // 15. 时空湍流 (Dilation Anomalies - 时空稀薄异化)
    aesthetic(
        'dilationAnomalies',
        '时空湍流',
        '区域时间流速极度错乱。雨滴悬停与数分钟极速氧化共存，因果倒错让死亡发生在受击之前。',
        '[AESTHETIC: DILATION_ANOMALIES] SENSORY: pitch-shifting echoes, static electricity in hair, freezing breath in sudden scorching heat. VISUAL: suspended falling raindrops, localized rotting zones, time-blurred silhouettes, clock hand blur. RULE: actions trigger erratic tick costs; ongoing status effects accelerate or freeze based on dilationFactor; round progression jumps unpredictably. SANITY TRIGGER: finding your own decaying corpse in a room you have not entered yet. FORBIDDEN: uniform round clocks, predictable turn orders, synchronized clocks.',
        'chronos',
        ['topos', 'hyle'],
        {
            skeleton: [
                { atomId: 'dilation_stagnation', dominance: 0.4 },
                { atomId: 'runaway_temporal_decay', dominance: 0.35 },
                { atomId: 'causal_inversion', dominance: 0.25 },
            ],
            flesh: [
                { atomId: 'frozen_explosion', revealPhase: 'setup' },
                { atomId: 'descent_seventy_two', revealPhase: 'rising' },
                { atomId: 'morphing_corridor', revealPhase: 'climax' },
                { atomId: 'future_corpse', revealPhase: 'resolution' },
            ],
            resonance: [
                { atomId: ['dilation_stagnation', 'runaway_temporal_decay'], type: 'polarization' },
                { source: ['causal_inversion'], target: ['future_corpse'], type: 'herald' },
            ],
        },
    ),

    // 16. 远洋血雾 (Pelagic Descent - 降临海渊)
    aesthetic(
        'pelagicDescent',
        '远洋血雾',
        '低纬度海面被浓烈猩红雾障笼罩。雷达回波勾勒千米骨骼，深海引力潮汐撕扯着凡人内脏。',
        '[AESTHETIC: PELAGIC_DESCENT] SENSORY: brackish brine, iodine rot, deep infrasonic humming vibrating through chest cavity. VISUAL: crimson vapor over black oily waves, skeletal radar blips, bioluminescent deep shapes. RULE: visibility restricted to point-blank; sonar and compasses spin wildly; high water exposure inflicts corrosive radiation. SANITY TRIGGER: hearing rhythmic singing from drowned congregations beneath the deck. FORBIDDEN: clear shorelines, sunny weather, dependable naval navigation.',
        'physis',
        ['thanatos', 'hieros'],
        {
            skeleton: [
                { atomId: 'pelagic_crimson_fog', dominance: 0.4 },
                { atomId: 'drowned_congregation', dominance: 0.35 },
                { atomId: 'abyssal_tide_pulse', dominance: 0.25 },
            ],
            flesh: [
                { atomId: 'stagnant_water', revealPhase: 'setup' },
                { atomId: 'submerged_street', revealPhase: 'rising' },
                { atomId: 'crushed_depth', revealPhase: 'climax' },
                { atomId: 'descent_resonance', revealPhase: 'resolution' },
            ],
            resonance: [
                { atomId: ['drowned_congregation', 'descent_resonance'], type: 'symbiosis' },
                { source: ['abyssal_tide_pulse'], target: ['crushed_depth'], type: 'herald' },
            ],
        },
    ),

    // 17. 清理人绝杀 (Cleaner Persecution - 特工灭口)
    aesthetic(
        'cleanerPersecution',
        '清理人绝杀',
        '脑白质切除特工组成的杀戮编队在废墟中扫荡。没有搜救，唯有系统性灭口与实验痕迹抹除。',
        '[AESTHETIC: CLEANER_PERSECUTION] SENSORY: suppressed assault rifle cracks, rhythmic combat boots on glass, sterile chemical sprays. VISUAL: matte-black hazard suits, glowing green unblinking monoculars, zip-tied civilian corpses, burning filing cabinets. RULE: stealth and evasion are mandatory; confronting Cleaners triggers high-damage tactical combat; defeat guarantees execution. SANITY TRIGGER: realizing the soldiers hunting you bear the insignia of your pre-descent government. FORBIDDEN: heroic negotiations, appeals to shared humanity, mercy from Cleaners.',
        'alterity',
        ['polis', 'techne'],
        {
            skeleton: [
                { atomId: 'cleaner_reclamation', dominance: 0.45 },
                { atomId: 'cleaner_dogtag_pile', dominance: 0.3 },
                { atomId: 'leukotomy_scar', dominance: 0.25 },
            ],
            flesh: [
                { atomId: 'untrustworthy_companion', revealPhase: 'setup' },
                { atomId: 'institutional_sacrifice', revealPhase: 'rising' },
                { atomId: 'classification_expulsion', revealPhase: 'climax' },
                { atomId: 'surveillance_static', revealPhase: 'falling' },
            ],
            resonance: [
                { source: ['institutional_sacrifice'], target: ['cleaner_reclamation'], type: 'herald' },
                { atomId: ['leukotomy_scar', 'cleaner_reclamation'], type: 'symbiosis' },
            ],
        },
    ),

    // 18. 拓扑折叠 (Topological Displacement - 黑晶异化)
    aesthetic(
        'topologicalDisplacement',
        '拓扑折叠',
        '黑色拓扑晶体驱使物理常数疯狂自折叠。空间每秒重置几何走向，无机金属与血肉按分形结构疯长。',
        '[AESTHETIC: TOPOLOGICAL_DISPLACEMENT] SENSORY: high-frequency crystal resonance, angular gravitational nausea, sounds arriving from wrong physical coordinates. VISUAL: self-folding black crystal clusters, hallways twisting like Mobius strips, architectural fractals. RULE: node connections randomly invert upon exit; spatial distances fail Euclidean metrics; crystal interaction boosts cthulhu stat but inflicts physical fusion. SANITY TRIGGER: observing an inanimate doorway sprout teeth and swallow a companion. FORBIDDEN: stable Euclidean mapping, compass consistency, predictable travel times.',
        'topos',
        ['hyle', 'soma'],
        {
            skeleton: [
                { atomId: 'morphing_corridor', dominance: 0.4 },
                { atomId: 'topological_crystal', dominance: 0.35 },
                { atomId: 'non_euclid_angle', dominance: 0.25 },
            ],
            flesh: [
                { atomId: 'larger_inside', revealPhase: 'setup' },
                { atomId: 'impossible_exit', revealPhase: 'rising' },
                { atomId: 'bone_metal_fusion', revealPhase: 'climax' },
                { atomId: 'lead_lining_decay', revealPhase: 'falling' },
            ],
            resonance: [
                { source: ['topological_crystal'], target: ['morphing_corridor'], type: 'parasitism' },
                { atomId: ['bone_metal_fusion', 'topological_crystal'], type: 'symbiosis' },
            ],
        },
    ),
]
