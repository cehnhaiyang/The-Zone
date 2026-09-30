/**
 * aesthetics.ts
 *
 * 恐怖美学预定义库 (Horror Aesthetics Predefined Library)。
 *
 * 恐怖美学由恐怖元 (HorrorAtom) 与恐怖域 (HorrorDomain) 调配而成，
 * 是玩家在叙事面板 (Narrative Panel) 中进行长线叙事链 (StoryArc) 或单元剧 (Episodic) 时选择的核心客体：
 * - primaryDomain:      主控域，决定美学底层不可居性的本体论基调；
 * - interferingDomains: 渗透 / 干涉域，在主控域之上叠加异质物理与认知折射；
 * - structure.skeleton: 骨架：决定美学核心意象的原子，dominance 之和必须严格为 1.0；
 * - structure.flesh:    血肉：显化阶段的原子，revealPhase 驱动叙事阶段 (setup -> resolution) 渐进展开；
 * - structure.resonance:共鸣：原子与原子之间的本体论作用机制 (symbiosis / polarization / parasitism / herald)。
 *
 * 契约规范：
 * - 对应元契约 {@link HorrorAesthetic}（维护于 `interface.ts`）；
 * - 严格对齐 `atoms.ts` 中定义的 101 项原子标识符，杜绝任何未定义 atomId；
 * - 覆盖全部十三大恐怖域（包含 soma, psyche, alterity, polis, chronos, topos, physis, zoe, techne, hyle, thanatos, logos, hieros）；
 * - 深度锚定世界观编年史：阿斯克勒庇俄斯实验区、清理人灭口、第二次看见、双重视觉 (bio/camera)、
 *   记忆金字塔 ($\delta \to \alpha$)、定数序列、因果倒错与方舟飞升血肉渡桥。
 *
 * @version 2.3.0
 * @see ../../meta/interface.ts
 * @see ../../meta/type.ts
 * @see ./domains.ts
 * @see ./atoms.ts
 */

import type { HorrorAesthetic } from '../../contract/meta';

const aesthetic = (
    id: string,
    name: string,
    desc: string,
    prompt: string,
    primaryDomain: string,
    interferingDomains: string[],
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

/**
 * 预定义恐怖美学集合
 */
export const HORROR_AESTHETICS: HorrorAesthetic[] = [
    // =========================================================================
    // 1. 生物机械恐怖 (Biomechanica)
    // =========================================================================
    aesthetic(
        'biomechanica',
        '生物机械恐怖',
        '肉体向冰冷机械的不可逆异化。筋膜绞入传动齿轮，机体不再属于自己，外骨骼与金属晶格刺入骨髓且金属增生无法停止。【偏转规约】：一切机械改质均撕裂受试者神经自主性；卸下武装等同于活生生剥离掌骨皮肉。',
        '[AESTHETIC: BIOMECHANICA] ' +
        'SENSORY: iron-blood smell, heated hydraulic fluid, wet organic warmth seeping through frozen machinery, rhythmic metallic grinding. ' +
        'VISUAL: musculature wrapped around heavy industrial infrastructure, black hydraulic pipes as pulsatile veins, aerospace rivets driven through cartilage, oxidized gears chewing raw subdermal fat. ' +
        'RULE: equipment fuses with flesh; removal shears nerve bundles and inflicts permanent HP loss; biological mutations are irreversible; cybernetics demand caloric and psychic sacrifice. ' +
        'SANITY TRIGGER: witnessing self or an ally undergoing involuntary flesh-machine metamorphosis. ' +
        'RESTRICTION & FORBIDDEN: NO clean, sterile, or painless cybernetic augmentations. NO detachable mecha suits or reversible modular upgrades. ' +
        'NARRATIVE ANCHORS: flesh_gear, hydraulic_vein, bone_metal_fusion, involuntary_augmentation, flesh_fusion_relic, rust_grind.',
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
                { atomId: 'flesh_fusion_relic', revealPhase: 'climax' },
                { atomId: 'rust_grind', revealPhase: 'falling' },
            ],
            resonance: [
                { atomId: ['flesh_gear', 'bone_metal_fusion'], type: 'symbiosis' },
                { source: ['hydraulic_vein'], target: ['involuntary_augmentation'], type: 'parasitism' },
            ],
        },
    ),

    // =========================================================================
    // 2. 赛博神秘学 (Cyber Occult)
    // =========================================================================
    aesthetic(
        'cyberOccult',
        '赛博神秘学',
        '信息与电子数据流中栖居着超自然高维意识。汇编代码成为降灵祷词，冷光荧幕显化异界神谕，网络铜缆化作通往冥界的引力渡桥。【偏转规约】：高压电缆传输不可名状的思维脉冲；设备不再执行逻辑计算，而是成为高维实体的降临受体。',
        '[AESTHETIC: CYBER_OCCULT] ' +
        'SENSORY: ozone odor, burnt resin, stale holy water, low-frequency electromagnetic hum modulating into human vocal cords. ' +
        'VISUAL: glowing assembly glyphs carved into server casing, flickering green phosphor CRT monitors resolving into deceased faces, coaxial ribbons draped like funeral shrouds, copper wires weeping conductive black bile. ' +
        'RULE: signal telemetry directly reflects entity proximity; camera mode noiseLevel amplifies occult entity presence; neural link backfire burns temporal lobes. ' +
        'SANITY TRIGGER: receiving direct algorithmic distress calls from long-dead personnel or observing scripture self-compiling on terminal screens. ' +
        'RESTRICTION & FORBIDDEN: NO secular explanations for algorithmic anomalies. NO completely safe digital sanctuaries; networked terminals are open conduits. ' +
        'NARRATIVE ANCHORS: signal_possession, code_prayer, dead_channel, surveillance_static, blasphemous_sacred, divine_command, neural_static_drone.',
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

    // =========================================================================
    // 3. 宇宙恐怖 (Cosmic Horror)
    // =========================================================================
    aesthetic(
        'cosmicHorror',
        '宇宙恐怖',
        '不可名状的宏伟尺度碾压与人类微粒般认知的绝对无意义化。现实不过是一层被撕烂的薄保鲜膜，理解真理即刻诱发颞叶物理炭化。【偏转规约】：深渊巨构无法被攻击或摧毁；所有的拼死胜利不过是高维实体代谢脱落的一枚微细死皮。',
        '[AESTHETIC: COSMIC_HORROR] ' +
        'SENSORY: suffocating gravitational pressure, complete acoustic void, taste of metallic cold ash, persistent vertigo from impossible horizon angles. ' +
        'VISUAL: non-Euclidean megastructures scraping the stratosphere, negative-curvature cosmic illumination, celestial bodies resembling pulsating biological organs behind leaden cloud breaks. ' +
        'RULE: cosmic entities cannot be targeted, damaged, or reasoned with; survival requires averted gaze, rapid retreat, and active cognitive dampening; comprehension inflicts lethal sanity burns. ' +
        'SANITY TRIGGER: perceiving the cyclopean geometry of extra-dimensional entities or translating fundamental gravitational field equations. ' +
        'RESTRICTION & FORBIDDEN: NO heroic anthropocentric victories or meaningful sacrifices. NO benevolent cosmic guardians or poetic harmony. ' +
        'NARRATIVE ANCHORS: cosmic_insignificance, scale_vertigo, membrane_penetrated, non_euclid_angle, larger_inside, contaminated_knowledge, meaningless_victory.',
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

    // =========================================================================
    // 4. 时间异常 (Temporal Anomaly)
    // =========================================================================
    aesthetic(
        'temporal',
        '时间异常',
        '因果链条彻底断裂。未来侵蚀过去，结果公然先于起因发生，探索者在未涉之室赫然发现自身数日后的腐败骸骨。【偏转规约】：弹孔先流血后听闻枪声；时钟指针与心跳共振却拒绝提供任何时序锚定；行动点（AP）预支演变为神经痉挛的反噬。',
        '[AESTHETIC: TEMPORAL] ' +
        'SENSORY: persistent deja-vu nauseating the stomach, inverted reverberant acoustics where gunshots collapse inward, smell of ozone from temporal friction. ' +
        'VISUAL: frozen artillery explosions crystallized mid-air, black acidic rain accelerating upward into clouds, shadows moving independently of physical casters, overlapping ghost-images of decaying architecture. ' +
        'RULE: causalInversionState triggers severe AP backlashes; actions alter node history retroactively; discovering future corpses forces immediate sanity checks. ' +
        'SANITY TRIGGER: finding one\'s own authenticated tactical tags and desiccated remains in a pristine, sealed vault. ' +
        'RESTRICTION & FORBIDDEN: NO clean time-travel paradox resets or convenient time loops. Every temporal rupture exacts an irreversible entropy toll. ' +
        'NARRATIVE ANCHORS: causal_inversion, frozen_explosion, future_corpse, looping_event, reversed_rain, future_broadcast, memory_contradiction.',
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

    // =========================================================================
    // 5. 民俗恐怖 (Folk Horror)
    // =========================================================================
    aesthetic(
        'folkHorror',
        '民俗恐怖',
        '残存在废土聚落底层的远古血腥契约。泛黄的安全守则演化为自我运转的捕食怪物，抽签轮盘与活人献祭被视为维系聚落运转的理所当然。【偏转规约】：群体的欢愉与圣洁微笑伴随着分食同伴的暴行；规程与禁忌具有实质性的物理绞杀杀伤力。',
        '[AESTHETIC: FOLK_HORROR] ' +
        'SENSORY: pungent dried tallow, burning sweet wildwood, rhythmic dry bone chimes clattering in breeze, muffled communal chanting behind barred storm doors. ' +
        'VISUAL: crude totems crafted from human fibulae, eyeless burlap masks weeping greasy residue, candlelit underground shrines, severed infant fingers strung across crop fences. ' +
        'RULE: trust requires active participation in community rituals; violating camp safety taboos provokes instantaneous zone retribution; lottery losers are chained as fuel. ' +
        'SANITY TRIGGER: realizing the entire bunker population is smiling blissfully while dismembering a squadmate for agrarian yield. ' +
        'RESTRICTION & FORBIDDEN: NO dismissing cult rituals as superstitious theater; ritual actions possess genuine, catastrophic causal efficacy. ' +
        'NARRATIVE ANCHORS: forced_ritual, sacrifice_altar, collective_joy_horror, rule_as_monster, harvest_ritual, ecstatic_ritual, replacement_lottery.',
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

    // =========================================================================
    // 6. 极端生态 (Hostile Biosphere)
    // =========================================================================
    aesthetic(
        'hostileBiosphere',
        '极端生态',
        '生态圈演化出针对人类的主动捕食意志。地表泥土由带菌活体毛细管构成，草木根系吮吸骨髓，雨雾散发模拟同伴啼哭的捕食声响。【偏转规约】：自然不再是惰性背景，而是具备饥饿消化意图的超级巨构；搜查行动直接惊醒休眠的孢子巢穴。',
        '[AESTHETIC: HOSTILE_BIOSPHERE] ' +
        'SENSORY: humid cloying rot, sweet intoxicating fungal musk, hot damp breath whistling through porous rock seams, crunching sound of bone under loamy turf. ' +
        'VISUAL: carnivorous bioluminescent tendrils, masonry bulkheads deflating like diseased lung tissue, carpets of pulsing mycelial meat, swamps of burning petrochemical bile. ' +
        'RULE: environment threat escalates with searchCount; traversing unpaved nodes drains vigor; breathing without high-grade respirators seeds mycelial roots in lung alveoli. ' +
        'SANITY TRIGGER: realizing the soil beneath your boots is trembling in rhythmic, hungry digestion. ' +
        'RESTRICTION & FORBIDDEN: NO pastoral, tranquil, or benevolent nature scenes. Nature is predatory, conscious, and chemically aggressive. ' +
        'NARRATIVE ANCHORS: predator_flora, breathing_wall, spore_cloud, living_soil, toxic_marsh, swarm_breeding, flesh_mould_substrate.',
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

    // =========================================================================
    // 7. 认知危害 (Cognitive Hazard)
    // =========================================================================
    aesthetic(
        'cognitiveHazard',
        '认知危害',
        '记忆、自我同一性与主观认知全面溶解。随身日记记录着自己从未犯下的恐怖罪行，镜中倒影拥有独立的狞笑与延迟反应。【偏转规约】：客观物理事实随理智衰减而全面失真；目镜目测到的线框在视神经噪点中拼凑出高维凝视，NPC 对话持续否定当前事实。',
        '[AESTHETIC: COGNITIVE_HAZARD] ' +
        'SENSORY: sterile bleach masking putrid copper, unnatural dead silence, phantom whispering behind inner ear cartilage, tactile numbness when touching own skin. ' +
        'VISUAL: mirrors showing unfamiliar hostile eyes, personal journals morphing words in peripheral vision, companion micro-expressions flattening into plastic perfection, green phosphor HUD glitches. ' +
        'RULE: neural noise corrupts UI indicators; journal logs contradict previously saved inventory counts; high cognitiveErosionState drains sanity per exploration tick. ' +
        'SANITY TRIGGER: discovering conclusive physical evidence that your core memories belong to a deceased stranger. ' +
        'RESTRICTION & FORBIDDEN: NO objective confirmation of reality. NO reassuring grounding techniques that restore full identity certainty. ' +
        'NARRATIVE ANCHORS: memory_contradiction, stranger_mirror, identity_blur, rewriting_text, false_diary, fake_person, hallucination_overlay.',
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

    // =========================================================================
    // 8. 梦境逻辑 (Dream Logic)
    // =========================================================================
    aesthetic(
        'dreamLogic',
        '梦境逻辑',
        '空间拓扑非欧化，现实遵循荒诞噩梦的自吞噬因果。走廊拐角内角超过三百六十度，直行向前的子弹击碎自身后背，死路即是出发点。【偏转规约】：房间进深随心率与恐慌程度动态延展；缺少 targetId 的本地出口化作虚空死地；指南针与建筑蓝图彻底作废。',
        '[AESTHETIC: DREAM_LOGIC] ' +
        'SENSORY: profound synesthesia, sudden gravity tilt inducing vertigo, heavy acoustic echoes where footsteps register behind the listener. ' +
        'VISUAL: brutalist corridors repeating door 104 ad infinitum, small security booths opening into endless abyssal chasms, staircases looping into their own underside, doors sealing into solid lead. ' +
        'RULE: exits shuffle when revisited; spatial distance fails Euclidean math; turning around in a dead end creates an entirely new unexplored sector. ' +
        'SANITY TRIGGER: opening an emergency exit only to emerge from the ceiling of the room you just fled from. ' +
        'RESTRICTION & FORBIDDEN: NO reliable Euclidean mapping, consistent compass bearings, or static architectural blueprints. ' +
        'NARRATIVE ANCHORS: impossible_exit, larger_inside, infinite_corridor, liminal_space, non_euclid_angle, ontological_drift, morphing_corridor.',
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
                { atomId: 'morphing_corridor', revealPhase: 'resolution' },
            ],
            resonance: [
                { atomId: ['infinite_corridor', 'liminal_space'], type: 'symbiosis' },
                { source: ['non_euclid_angle'], target: ['impossible_exit'], type: 'herald' },
            ],
        },
    ),

    // =========================================================================
    // 9. 寄生共生 (Parasitic Symbiosis)
    // =========================================================================
    aesthetic(
        'parasiticSymbiosis',
        '寄生共生',
        '为了在废土存活不得不接纳异种寄生。索取不可知力量的同时，神经控制权被异种蚕食。脊椎寄生体泵注肾上腺素，却随时准备接管宿主四肢。【偏转规约】：任何生理增益伴随神经与骨骼畸变；高克苏鲁属性 (cthulhu) 压制排异反应，但加速人格非人化。',
        '[AESTHETIC: PARASITIC_SYMBIOSIS] ' +
        'SENSORY: slithering subcutaneous itching, hot foreign fluid coursing through spinal cord, rhythmic chittering vibrations echoing inside jawbone. ' +
        'VISUAL: barbed biological tendrils wrapped around vertebrae, translucent egg sacs pulsing beneath the ribs, eyes blinking behind healed surgical scars. ' +
        'RULE: parasite grants massive combat buffs but steadily drains sanity and vigor; surgical extraction risks catastrophic spinal severance and immediate death. ' +
        'SANITY TRIGGER: feeling the parasite override your vocal cords to speak in fluent, chittering alien dialects. ' +
        'RESTRICTION & FORBIDDEN: NO harmonious Disney-like symbiote bonding. NO painless separation or pure cosmetic symbiosis. ' +
        'NARRATIVE ANCHORS: parasite_spine, involuntary_augmentation, flesh_mould_substrate, living_soil, spore_cloud, dead_voice, flesh_gear.',
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

    // =========================================================================
    // 10. 工业熵寂 (Industrial Entropy)
    // =========================================================================
    aesthetic(
        'industrialEntropy',
        '工业熵寂',
        '庞大、冰冷、无休止且毫无目的的机械永动机。冲压机在废弃厂房中锻造无用铁块，无机材料发生海绵状坏疽与物理常数衰解。【偏转规约】：重工机械在断电状态下依靠深渊引力狂暴轰鸣；搜查不产生任何有机物资；金属摩擦声与心脏舒张节律恐怖同步。',
        '[AESTHETIC: INDUSTRIAL_ENTROPY] ' +
        'SENSORY: choking dry rust dust, scorched transformer oil, ear-splitting metallic screeching vibrating through teeth fillings, suffocating industrial heat. ' +
        'VISUAL: endless dark assembly conveyors stamping twisted useless iron slabs, massive rusted gear trains churning through lakes of pitch-black caustic coolant, weeping rivets, flaking lead bulkheads. ' +
        'RULE: nodes are strictly brutalist and mechanical; search yields zero food or clean water; machinery drops purely inorganic, heavily corroded scrap. ' +
        'SANITY TRIGGER: realizing the kilometers of roaring factory machinery have had no power supply, operator, or functional product for half a century. ' +
        'RESTRICTION & FORBIDDEN: NO purposeful manufacturing or meaningful salvage that restores old-world civilization infrastructure. ' +
        'NARRATIVE ANCHORS: entropy_machine, rust_grind, automation_without_purpose, black_water, pollution_sheen, lead_lining_decay, meaningless_victory.',
        'hyle',
        ['logos', 'topos'],
        {
            skeleton: [
                { atomId: 'entropy_machine', dominance: 0.4 },
                { atomId: 'rust_grind', dominance: 0.35 },
                { atomId: 'automation_without_purpose', dominance: 0.25 },
            ],
            flesh: [
                { atomId: 'black_water', revealPhase: 'setup' },
                { atomId: 'pollution_sheen', revealPhase: 'rising' },
                { atomId: 'lead_lining_decay', revealPhase: 'climax' },
                { atomId: 'meaningless_victory', revealPhase: 'resolution' },
            ],
            resonance: [
                { atomId: ['automation_without_purpose', 'entropy_machine'], type: 'symbiosis' },
                { atomId: ['lead_lining_decay', 'rust_grind'], type: 'polarization' },
            ],
        },
    ),

    // =========================================================================
    // 11. 临床深渊 (Clinical Abyss - 阿斯克勒庇俄斯实验区)
    // =========================================================================
    aesthetic(
        'clinicalAbyss',
        '临床深渊',
        '以医学救赎为伪装的深层活体转化流水线。阿斯克勒庇俄斯计划将地下病房改造为星神质培养基，防腐剂掩盖不住黑色晶体原液的腥臭。【偏转规约】：治疗必然伴随污染侵蚀；生命恢复扣除理智；重铅隔绝层阻断外部通信，外科牵引架与人体骨骼永久嵌合。',
        '[AESTHETIC: CLINICAL_ABYSS] ' +
        'SENSORY: stinging formalin bleach, metallic copper reek, hiss of pressurized oxygen lines, wet sucking sounds from drainage tubes, screaming surgical saws. ' +
        'VISUAL: stainless steel autopsy tables encrusted with oxidized black sludge, chrome IV poles overgrown with raw red tissue, lead-lined quarantine wards, flayed anatomical charts with alien diagrams. ' +
        'RULE: biological medical treatment requires contaminated Astra-Serum tools; healing HP inflicts sanity penalties; lead bulkheads scramble radio communications. ' +
        'SANITY TRIGGER: discovering your own medical records certifying you as an inorganic tissue culture batch scheduled for harvest. ' +
        'RESTRICTION & FORBIDDEN: NO wholesome, compassionate medical care. NO sterile, painless recovery; medicine in The Zone is predatory vivisection. ' +
        'NARRATIVE ANCHORS: astra_infusion, asclepius_protocol, iv_rack_fusion, leukotomy_scar, containment_failure, deathless_wound, lead_lining_decay.',
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

    // =========================================================================
    // 12. 滤网溃缩 (Second Sight Crisis - 第二次看见)
    // =========================================================================
    aesthetic(
        'secondSightCrisis',
        '滤网溃缩',
        '神经链接仪光电滤网在信息过载中剥落炭化。绿色线框消散，视网膜直面未被规整的高维绝对恐怖——引发三秒内颞叶炭化的致死顿悟。【偏转规约】：机械模式 (camera) 完整性剧烈损耗；高噪点 (noiseLevel) 虽锐化目标轮廓，但将不可名状意识直接烙入眼底。',
        '[AESTHETIC: SECOND_SIGHT_CRISIS] ' +
        'SENSORY: piercing high-frequency neural static drone, blinding green phosphor flare, electrical crackling in optic nerves, intense temporal migraine. ' +
        'VISUAL: fracturing HUD elements, pixelated red wireframes shedding into writhing multi-dimensional tendrils, burnt retinas bleeding dark fluid, terminal lucidity carbon residue. ' +
        'RULE: visor integrity drains rapidly under abyssal exposure; high noiseLevel improves targeting accuracy but triggers hallucination logs and sanity cascades; total failure triggers the terminal Second Sight. ' +
        'SANITY TRIGGER: complete failure of ocular filters, leaving bare retinas to perceive the unmediated topology of the Abyss. ' +
        'RESTRICTION & FORBIDDEN: NO dependable HUD telemetry or clean digital filters. The camera mode cannot indefinitely sanitize cosmic madness. ' +
        'NARRATIVE ANCHORS: visor_filter_collapse, second_sight_epiphany, neural_static_drone, visual_static_delusion, surveillance_static, membrane_penetrated, terminal_lucidity_carbon.',
        'techne',
        ['psyche', 'logos'],
        {
            skeleton: [
                { atomId: 'visor_filter_collapse', dominance: 0.45 },
                { atomId: 'second_sight_epiphany', dominance: 0.3 },
                { atomId: 'neural_static_drone', dominance: 0.25 },
            ],
            flesh: [
                { atomId: 'visual_static_delusion', revealPhase: 'setup' },
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

    // =========================================================================
    // 13. 方舟残骸 (Ark Derelict - 文明石棺)
    // =========================================================================
    aesthetic(
        'arkDerelict',
        '方舟残骸',
        '深埋地壳数千米的超级避难所沦为冷冻胚胎腐败、反应堆死寂的封闭金属石棺。百亿弃民的血泪证实了方舟跃迁从一开始就是骗局。【偏转规约】：科层制隔离指令自动闭锁逃生通道；死寂的广播喇叭按时播送安抚辞令；搜刮仅能起获冷冻黑汤与生锈的权限卡。',
        '[AESTHETIC: ARK_DERELICT] ' +
        'SENSORY: freezing stagnant freon gas, dead machine silence, low-frequency hum of dying fusion cores, stale chemical ozone smell. ' +
        'VISUAL: frost-crusted cryo-chambers containing liquefied black embryonic sludge, titanium blast doors sealed with hydraulic welds, emergency amber warning strobes, discarded corporate insignias. ' +
        'RULE: passage requires bypassing automated quarantine protocols; bulkheads require costly battery or mechanical force; logs expose pre-descent surface sacrifice. ' +
        'SANITY TRIGGER: accessing the Ark Prime mainframe to discover surface humanity was deliberately converted into a gravitational sacrificial anchor. ' +
        'RESTRICTION & FORBIDDEN: NO functional escape starships, utopian underground cities, or benevolent Ark leadership. ' +
        'NARRATIVE ANCHORS: ark_abandonment, embryonic_decay, extinction_silence, institutional_sacrifice, classification_expulsion, claustrophobic_seal, lead_lining_decay.',
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
                { atomId: 'lead_lining_decay', revealPhase: 'resolution' },
            ],
            resonance: [
                { atomId: ['ark_abandonment', 'embryonic_decay'], type: 'symbiosis' },
                { atomId: ['extinction_silence', 'lead_lining_decay'], type: 'polarization' },
            ],
        },
    ),

    // =========================================================================
    // 14. 语义融解 (Semantic Decay - 语言坍塌)
    // =========================================================================
    aesthetic(
        'semanticDecay',
        '语义融解',
        '现实概念与语言符号彻底脱钩。词汇在舌尖融化为湿黏杂音，日记在视线移开时重组；“救援”演化为割喉剧痛，“死亡”成为唯一的清凉饮品。【偏转规约】：对话记录自我颠覆；交互指令打乱重排；高维捕食者精准咬食大脑中的“家”、“退路”与“安全”概念。',
        '[AESTHETIC: SEMANTIC_DECAY] ' +
        'SENSORY: sound of wet whispering phonemes, taste of copper ink on tongue, persistent auditory aphasia, dizzying cognitive dissonance. ' +
        'VISUAL: text dissolving into writhing fibrous tendrils across paper, signage constantly shifting names, lip movements grotesquely decoupled from spoken audio. ' +
        'RULE: NPC dialogue and quest logs re-author themselves each round; dialogue choices swap positions randomly; words gradually lose descriptive permanence. ' +
        'SANITY TRIGGER: realizing you can no longer remember what the word "Mother", "Exit", or "Tomorrow" means. ' +
        'RESTRICTION & FORBIDDEN: NO reliable written documents, permanent maps, or unambiguous verbal contracts. Language cannot offer sanctuary. ' +
        'NARRATIVE ANCHORS: semantic_melting, concept_predation, ontological_drift, rewriting_text, false_diary, identity_blur, fake_person.',
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

    // =========================================================================
    // 15. 时空湍流 (Dilation Anomalies - 时空稀薄异化)
    // =========================================================================
    aesthetic(
        'dilationAnomalies',
        '时空湍流',
        '区域时间流速极度错乱。时空稀薄系数 (dilationFactor) 在绝对静止与数百倍狂暴加速间震荡，雨滴悬停与伤口秒级氧化腐烂共存。【偏转规约】：行动触发不可预测的时间刻消耗；因果倒错让受创先于开火；时钟指针与深层地脉跳动共鸣。',
        '[AESTHETIC: DILATION_ANOMALIES] ' +
        'SENSORY: severe pitch-shifting auditory echoes, hair standing on end from electrostatic shear, instant frostbite alternating with sudden flash heatwaves. ' +
        'VISUAL: suspended spherical raindrops frozen in space, localized fields of rapid oxidation where metal rots before one\'s eyes, time-smeared blurry silhouettes. ' +
        'RULE: node dilationFactor distorts all round progression; continuous status effects tick at wild multipliers; action point consumption is subject to sudden temporal spikes. ' +
        'SANITY TRIGGER: watching your companion age decades into a withered skeleton over the span of three physical steps. ' +
        'RESTRICTION & FORBIDDEN: NO consistent temporal passage, predictable turn timers, or synchronized chronometers. ' +
        'NARRATIVE ANCHORS: dilation_stagnation, runaway_temporal_decay, causal_inversion, frozen_explosion, descent_seventy_two, morphing_corridor, future_corpse.',
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

    // =========================================================================
    // 16. 远洋血雾 (Pelagic Descent - 降临海渊)
    // =========================================================================
    aesthetic(
        'pelagicDescent',
        '远洋血雾',
        '低纬度海面被浓烈猩红强酸浓雾笼罩。千米骨骼雷达回波与深海超低频引力潮汐共振，沉没会众系着重铅在干涸讲台前整齐伫立。【偏转规约】：水体具有重度腐蚀性与同化性；直面血雾诱发致命下潜幻觉；深海引力潮涌撕碎人体毛细血管。',
        '[AESTHETIC: PELAGIC_DESCENT] ' +
        'SENSORY: choking iodine fumes, brackish acidic brine, deep infrasonic vibrations rattling internal bone structure, sound of distant angelic choirs under waves. ' +
        'VISUAL: thick crimson aerosol obscuring all visibility, cyclopean skeletal silhouettes on maritime radar screens, motionless black standing water reflecting hundreds of pale drowned faces. ' +
        'RULE: ambient visibility reduced to point-blank range; water contact deals corrosive damage and accelerates mutations; infrasonic tide pulses inflict internal organ hemorrhaging. ' +
        'SANITY TRIGGER: hearing drowned squadmates softly calling you by childhood nicknames from several fathoms beneath the oily waves. ' +
        'RESTRICTION & FORBIDDEN: NO clean ocean shorelines, dry safe islands, or reliable sonar instruments. ' +
        'NARRATIVE ANCHORS: pelagic_crimson_fog, drowned_congregation, abyssal_tide_pulse, stagnant_water, submerged_street, crushed_depth, descent_resonance.',
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

    // =========================================================================
    // 17. 清理人绝杀 (Cleaner Persecution - 特工灭口)
    // =========================================================================
    aesthetic(
        'cleanerPersecution',
        '清理人绝杀',
        '脑白质切除特工组成的杀戮编队在废墟中系统性扫荡。没有搜救，唯有消音卡宾枪的机械处决与档案焚毁。【偏转规约】：体制暴力与社会契约异化为自动化灭口机器；同行者随时可能被制度判定为“废料耗材”；遭遇清理人必定爆发极端恶劣的战术围剿。',
        '[AESTHETIC: CLEANER_PERSECUTION] ' +
        'SENSORY: sharp crack of suppressed carbine fire, wet rhythmic footsteps of tactical combat boots on broken glass, aerosolized bleach and burning paper fumes. ' +
        'VISUAL: matte-black NBC hazard suits, glowing monocular night-vision reticles, mounds of zip-tied civilian corpses with sawed calvaria, smoldering filing incinerators. ' +
        'RULE: stealth and rapid bypass are mandatory; combat encounters with Cleaners feature brutal tactical AI and high lethality; captured operatives face immediate execution. ' +
        'SANITY TRIGGER: finding your squad commander\'s signed authorization ordering the immediate liquidation of your own field unit. ' +
        'RESTRICTION & FORBIDDEN: NO diplomatic appeals to shared humanity or moral remorse from Cleaners. They are lobotomized instruments of containment. ' +
        'NARRATIVE ANCHORS: cleaner_reclamation, cleaner_dogtag_pile, leukotomy_scar, untrustworthy_companion, institutional_sacrifice, classification_expulsion, surveillance_static.',
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

    // =========================================================================
    // 18. 拓扑折叠 (Topological Displacement - 黑晶异化)
    // =========================================================================
    aesthetic(
        'topologicalDisplacement',
        '拓扑折叠',
        '黑色拓扑晶体驱使物理常数疯狂自折叠。空间每秒重置几何走向，走廊如莫比乌斯环扭曲，无机金属与人体骨骼按分形结构疯长。【偏转规约】：三维几何彻底失效；向右射击的子弹反弹穿透自身左肾；接触黑晶带来强大的克苏鲁不可知力加成，但伴随不可逆的物质嵌合。',
        '[AESTHETIC: TOPOLOGICAL_DISPLACEMENT] ' +
        'SENSORY: crystalline harmonic ringing vibrating teeth, sickening gravitational shears that invert the stomach, auditory cues arriving from physically impossible vectors. ' +
        'VISUAL: zero-entropy black crystals folding infinitely along multi-dimensional axes, concrete corridors contorting into seamless Mobius loops, architectural fractals repeating in mirrors. ' +
        'RULE: node connections invert unexpectedly; physical distances do not correlate with transit time; crystal interaction increases cthulhu attribute while dealing permanent flesh fusion. ' +
        'SANITY TRIGGER: watching a doorway sprout teeth, bend 180 degrees through a wall, and swallow an ally into the floor beneath them. ' +
        'RESTRICTION & FORBIDDEN: NO static architectural blueprints, reliable inertial compasses, or predictable straight line retreat paths. ' +
        'NARRATIVE ANCHORS: morphing_corridor, topological_crystal, non_euclid_angle, larger_inside, impossible_exit, bone_metal_fusion, lead_lining_decay.',
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

    // =========================================================================
    // 19. 畸胎育巢 (Teratogenic Brood - 生命增生) [扩展: zoe 主控]
    // =========================================================================
    aesthetic(
        'teratogenicBrood',
        '畸胎育巢',
        '受精、细胞分裂与胚胎发育机制发生暴乱。细胞拒绝凋亡，创口在数秒内以恶性肉瘤自发增生，长出异质眼球与骨质副肢。【偏转规约】：任何生理治愈均演变为畸胎膨胀的诅咒；生命值充沛反而加速机体畸变；防空洞内壁与巨构共生肉瘤永久粘连，持续诞下畸变幼体。',
        '[AESTHETIC: TERATOGENIC_BROOD] ' +
        'SENSORY: sickly sweet amniotic fluid reek, wet squelching of rapid cellular mitosis, rhythmic wet contractions echoing through bulkheads. ' +
        'VISUAL: multi-ton biomechanical carcinomas fused with steel doors, rib cages branching outward into barbed ovipositors, clusters of misplaced unblinking pupils sprouting on healed wounds. ' +
        'RULE: HP recovery exceeding 80% increases teratogenic mutation strain; resting in the zone provokes parasitic embryonic churn; biological healing exacts severe sanity costs. ' +
        'SANITY TRIGGER: feeling foreign fetal skeletons squirming violently beneath your own abdominal wall. ' +
        'RESTRICTION & FORBIDDEN: NO sterile, clean, or wholesome regeneration. Every healed wound leaves grotesque anatomical excess. ' +
        'NARRATIVE ANCHORS: symbiotic_carcinoma, plague_fertility, incubation, flesh_mould_substrate, living_soil, swarm_breeding, embryonic_decay.',
        'zoe',
        ['soma', 'physis'],
        {
            skeleton: [
                { atomId: 'symbiotic_carcinoma', dominance: 0.4 },
                { atomId: 'plague_fertility', dominance: 0.35 },
                { atomId: 'incubation', dominance: 0.25 },
            ],
            flesh: [
                { atomId: 'flesh_mould_substrate', revealPhase: 'setup' },
                { atomId: 'living_soil', revealPhase: 'rising' },
                { atomId: 'swarm_breeding', revealPhase: 'climax' },
                { atomId: 'embryonic_decay', revealPhase: 'resolution' },
            ],
            resonance: [
                { atomId: ['symbiotic_carcinoma', 'plague_fertility'], type: 'symbiosis' },
                { source: ['incubation'], target: ['swarm_breeding'], type: 'herald' },
            ],
        },
    ),

    // =========================================================================
    // 20. 拒死死局 (Undying Limbo - 终局失序) [扩展: thanatos 主控]
    // =========================================================================
    aesthetic(
        'undyingLimbo',
        '拒死死局',
        '死亡作为生物学终点与安宁终结者的法则被绝对抹杀。心跳停止后肉体被剥夺腐化归尘的权利，贯穿伤口永不愈合亦绝不致死。【偏转规约】：心跳归零的同伴保留温热微弱的呼吸与声带悲鸣；不可动实体如墓碑般扎根地脉；生者无法体面安葬死者，泥土下的骸骨黎明时分自行破土归来。',
        '[AESTHETIC: UNDYING_LIMBO] ' +
        'SENSORY: smell of dry embalmed dust mixed with fresh arterial blood, faint ragged breath whistling from severed windpipes, cold hands weakly gripping sleeves. ' +
        'VISUAL: corpses dead for weeks standing upright at intersections, gaping chest cavities exposing calmly pulsating hearts, buried companions seated back at the camp table before sunrise. ' +
        'RULE: fallen squadmates enter necrotic suspension rather than standard death; lethal damage leaves characters immobilized in permanent sensory agony; funeral rites fail to close cadaver eyelids. ' +
        'SANITY TRIGGER: digging up a companion\'s grave only to find them staring back wide-eyed in the dark, softly murmuring clearance codes. ' +
        'RESTRICTION & FORBIDDEN: NO peaceful deaths, heroic sacrifices that grant spiritual release, clean sanitary burials, or comforting afterlife closures. ' +
        'NARRATIVE ANCHORS: lingering_dead, deathless_wound, farewell_denied, unburied_corpse, drowned_congregation, cleaner_dogtag_pile, future_corpse.',
        'thanatos',
        ['soma', 'chronos'],
        {
            skeleton: [
                { atomId: 'lingering_dead', dominance: 0.4 },
                { atomId: 'deathless_wound', dominance: 0.35 },
                { atomId: 'farewell_denied', dominance: 0.25 },
            ],
            flesh: [
                { atomId: 'unburied_corpse', revealPhase: 'setup' },
                { atomId: 'drowned_congregation', revealPhase: 'rising' },
                { atomId: 'cleaner_dogtag_pile', revealPhase: 'climax' },
                { atomId: 'future_corpse', revealPhase: 'resolution' },
            ],
            resonance: [
                { atomId: ['lingering_dead', 'deathless_wound'], type: 'symbiosis' },
                { source: ['farewell_denied'], target: ['unburied_corpse'], type: 'herald' },
            ],
        },
    ),

    // =========================================================================
    // 21. 虚空神殉 (Dread Apotheosis - 崇高残虐) [扩展: hieros 主控]
    // =========================================================================
    aesthetic(
        'dreadApotheosis',
        '虚空神殉',
        '崇高、救赎与神圣奇迹被深渊神性以不可名状的暴行具象化。金色光晕源自十米高的血肉畸胎，福音是撕碎内脏的引力海啸。【偏转规约】：朝圣者的祈祷引来神性意志接管运动神经，迫使其向深渊祭坛跪拜自戕；飞升的真相是沦为高维捕食者跨维跃迁的血肉引力渡桥。',
        '[AESTHETIC: DREAD_APOTHEOSIS] ' +
        'SENSORY: ozone and burning incense, deafening celestial choir of vibrating teeth, shattering infrasonic gravitational pressure that liquefies kidney tissue. ' +
        'VISUAL: blinding golden halos radiating from towering chimeric abominations, worshippers laughing in ecstasy as sharp steel slices their own jugular veins, lead sarcophagi hydra-forges. ' +
        'RULE: witnessing divine apparitions inflicts instantaneous massive sanity loss; divine intervention forcibly commandeers squad movement vectors; prayers accelerate zone erosion. ' +
        'SANITY TRIGGER: feeling an overwhelming celestial desire to tear open your own rib cage in worship before an alien colossus. ' +
        'RESTRICTION & FORBIDDEN: NO gentle, merciful, or benevolent deities. NO safe miracles or spiritual salvation free from catastrophic biological sacrifice. ' +
        'NARRATIVE ANCHORS: blasphemous_sacred, divine_command, ark_apotheosis, ecstatic_ritual, sacrifice_altar, chosen_curse, descent_resonance.',
        'hieros',
        ['logos', 'polis'],
        {
            skeleton: [
                { atomId: 'blasphemous_sacred', dominance: 0.4 },
                { atomId: 'divine_command', dominance: 0.35 },
                { atomId: 'ark_apotheosis', dominance: 0.25 },
            ],
            flesh: [
                { atomId: 'ecstatic_ritual', revealPhase: 'setup' },
                { atomId: 'sacrifice_altar', revealPhase: 'rising' },
                { atomId: 'chosen_curse', revealPhase: 'climax' },
                { atomId: 'descent_resonance', revealPhase: 'resolution' },
            ],
            resonance: [
                { atomId: ['blasphemous_sacred', 'ark_apotheosis'], type: 'symbiosis' },
                { source: ['divine_command'], target: ['ecstatic_ritual'], type: 'herald' },
            ],
        },
    ),

    // =========================================================================
    // 22. 拟态伪人 (Uncanny Mimicry - 猜忌深渊) [扩展: alterity 主控]
    // =========================================================================
    aesthetic(
        'uncannyMimicry',
        '拟态伪人',
        '共情通道被彻底切断，熟悉的面孔成为最致命的捕食拟态。朝夕相处的同伴骨相发生微米级非人偏移，微表情下潜藏着捕食计算。【偏转规约】：言语交流退化为声带对过往录音的机械拟态；信任阶段 (TrustPhase) 被猜忌暗流侵蚀；拥抱与关怀演变为试探脊椎弱点的狩猎前奏。',
        '[AESTHETIC: UNCANNY_MIMICRY] ' +
        'SENSORY: faint chemical undertone beneath familiar companion perfume, unnaturally steady breathing without biological micro-pauses, wet jawbone clicks. ' +
        'VISUAL: sub-millimeter facial asymmetries, companion pupils failing to contract under direct tactical flashlight beams, reflections that maintain eye contact after turning away. ' +
        'RULE: high companion affinity does not guarantee biological identity; squad members may be secretly replaced during resting or scout actions; verbal logs show subtle deviations. ' +
        'SANITY TRIGGER: noticing your closest ally\'s neck joint rotate 180 degrees while they calmly continue a routine tactical conversation. ' +
        'RESTRICTION & FORBIDDEN: NO completely transparent motives or unexamined moral paragons. Every companion is under the shadow of uncanny replacement. ' +
        'NARRATIVE ANCHORS: fake_person, untrustworthy_companion, independent_reflection, silent_watchers, dead_voice, replacement_lottery, collective_joy_horror.',
        'alterity',
        ['psyche', 'soma'],
        {
            skeleton: [
                { atomId: 'fake_person', dominance: 0.4 },
                { atomId: 'untrustworthy_companion', dominance: 0.35 },
                { atomId: 'independent_reflection', dominance: 0.25 },
            ],
            flesh: [
                { atomId: 'silent_watchers', revealPhase: 'setup' },
                { atomId: 'dead_voice', revealPhase: 'rising' },
                { atomId: 'replacement_lottery', revealPhase: 'climax' },
                { atomId: 'collective_joy_horror', revealPhase: 'falling' },
            ],
            resonance: [
                { atomId: ['fake_person', 'independent_reflection'], type: 'polarization' },
                { source: ['untrustworthy_companion'], target: ['fake_person'], type: 'herald' },
            ],
        },
    ),

    // =========================================================================
    // 23. 记忆坍陷 (Pyramid Amnesia - 认知蚀空) [扩展: psyche 主控]
    // =========================================================================
    aesthetic(
        'pyramidAmnesia',
        '记忆坍陷',
        '记忆金字塔底座全面风化。未被频繁调取的底层γ与β级记忆评分归零，在大脑深处塌陷成不可名状的认知空洞，寄生α基石重写灵魂。【偏转规约】：对话切片归档瞬间引发遗忘；听到关切之语自发感受到利刃割喉剧痛；死者面部凝固着狂喜顿悟，颅腔内颞叶已彻底烧蚀成碳粒。',
        '[AESTHETIC: PYRAMID_AMNESIA] ' +
        'SENSORY: dry scent of burnt carbon in the sinuses, echoing static void where thoughts should form, vertigo when trying to recall personal origin. ' +
        'VISUAL: journal pages actively dissolving into blank chalk, carbonized temporal lobes leaking black soot from eye sockets, fading silhouette photos. ' +
        'RULE: memory nodes with accessRatio of zero are permanently pruned; dialogueSliceLength triggers delta memory amnesia; cognitive erosion converts empathy into phantom agony. ' +
        'SANITY TRIGGER: discovering that your foundational childhood memory (alpha anchor) is a fabricated psychic parasite planted by an Astra-Serum test. ' +
        'RESTRICTION & FORBIDDEN: NO perfect recall, unassailable diaries, or recovery of lost memory nodes through sheer will. ' +
        'NARRATIVE ANCHORS: pyramid_void_decay, implanted_alpha_anchor, delta_slice_amnesia, false_diary, identity_blur, semantic_inversion, terminal_lucidity_carbon.',
        'psyche',
        ['logos', 'chronos'],
        {
            skeleton: [
                { atomId: 'pyramid_void_decay', dominance: 0.4 },
                { atomId: 'implanted_alpha_anchor', dominance: 0.35 },
                { atomId: 'delta_slice_amnesia', dominance: 0.25 },
            ],
            flesh: [
                { atomId: 'false_diary', revealPhase: 'setup' },
                { atomId: 'identity_blur', revealPhase: 'rising' },
                { atomId: 'semantic_inversion', revealPhase: 'climax' },
                { atomId: 'terminal_lucidity_carbon', revealPhase: 'resolution' },
            ],
            resonance: [
                { atomId: ['pyramid_void_decay', 'implanted_alpha_anchor'], type: 'polarization' },
                { source: ['implanted_alpha_anchor'], target: ['identity_blur'], type: 'parasitism' },
            ],
        },
    ),

    // =========================================================================
    // 24. 共生武装 (Grafted Ballistics - 活械嵌合) [扩展: soma 主控]
    // =========================================================================
    aesthetic(
        'graftedBallistics',
        '共生武装',
        '单兵枪械、骨髓与神经回路粗暴共生愈合。扳机连杆接驳掌心神经，背部胸椎开孔接驳柴油排气烟囱，每一次击发都在抽搐研磨使用者自身的脏器骨髓。【偏转规约】：卸下武器等同于活生生剥离整面手掌皮肉；武器耐久损耗转化为宿主生命损耗；柴油黑烟与血沫伴随剧烈喘息喷吐。',
        '[AESTHETIC: GRAFTED_BALLISTICS] ' +
        'SENSORY: sulfurous diesel exhaust, scorched gunpowder, hot iron reek, excruciating neural shock when firing heavy calibers. ' +
        'VISUAL: steel firearm receivers swallowed by fibrous scar tissue, spinal exhaust chimneys belching oily aerosol, finger bones welded to magazine catches. ' +
        'RULE: weapons cannot be unequipped without surgical trauma; high fleshFusionState grants bonus critical damage and attack power at the cost of maxHp reduction. ' +
        'SANITY TRIGGER: seeing your thumb knuckle split open to feed 7.62mm rounds directly into your forearm\'s organic breech. ' +
        'RESTRICTION & FORBIDDEN: NO modular weapon swaps, clean maintenance kits, or painless disarming. Weapons are living bodily organs. ' +
        'NARRATIVE ANCHORS: flesh_fusion_relic, vertebral_chimney, bone_metal_fusion, hydraulic_vein, flesh_gear, involuntary_augmentation, rust_grind.',
        'soma',
        ['techne', 'hyle'],
        {
            skeleton: [
                { atomId: 'flesh_fusion_relic', dominance: 0.4 },
                { atomId: 'vertebral_chimney', dominance: 0.35 },
                { atomId: 'bone_metal_fusion', dominance: 0.25 },
            ],
            flesh: [
                { atomId: 'hydraulic_vein', revealPhase: 'setup' },
                { atomId: 'flesh_gear', revealPhase: 'rising' },
                { atomId: 'involuntary_augmentation', revealPhase: 'climax' },
                { atomId: 'rust_grind', revealPhase: 'falling' },
            ],
            resonance: [
                { atomId: ['flesh_fusion_relic', 'bone_metal_fusion'], type: 'symbiosis' },
                { source: ['vertebral_chimney'], target: ['hydraulic_vein'], type: 'parasitism' },
            ],
        },
    ),

    // =========================================================================
    // 25. 滤网去人性化 (Panoptic Dehumanization - 机械冷视) [扩展: techne 主控]
    // =========================================================================
    aesthetic(
        'panopticDehumanization',
        '滤网去人性化',
        '神经链接仪将受创同伴的哭喊与断肢冷酷过滤为一组绿色线框骨架与百分比损耗指标。血腥屠杀被彻底数据化，视网膜在机械冷视与肉眼直视的剧烈撕扯中崩溃。【偏转规约】：切换到肉眼直视 (bio) 瞬间引发前额叶灼痛；处于机械过滤 (camera) 模式则逐渐丧失对生灵痛苦的感知；监控雪花在高频计算中解构观察者童年。',
        '[AESTHETIC: PANOPTIC_DEHUMANIZATION] ' +
        'SENSORY: low-voltage electrical tingling behind eye sockets, constant mechanical ticking of targeting processors, clinical detached calm. ' +
        'VISUAL: glowing green polygonal wireframes replacing human silhouettes, biometric damage percentages floating over disemboweled bodies, phosphor scanlines. ' +
        'RULE: camera mode completely suppresses emotional reactions and panic checks, but steadily desensitizes empathy; sudden visor filter failure inflicts double horror shock. ' +
        'SANITY TRIGGER: watching a companion wireframe drop to 0% and feeling only clinical irritation at lost logistics efficiency. ' +
        'RESTRICTION & FORBIDDEN: NO warm, empathetic digital interfaces. The HUD is a brutal instrument of desensitization and surveillance. ' +
        'NARRATIVE ANCHORS: camera_wireframe_dehumanization, visual_static_delusion, neural_static_drone, surveillance_static, bio_retinal_burn, visor_filter_collapse, terminal_lucidity_carbon.',
        'techne',
        ['psyche', 'alterity'],
        {
            skeleton: [
                { atomId: 'camera_wireframe_dehumanization', dominance: 0.4 },
                { atomId: 'visual_static_delusion', dominance: 0.35 },
                { atomId: 'neural_static_drone', dominance: 0.25 },
            ],
            flesh: [
                { atomId: 'surveillance_static', revealPhase: 'setup' },
                { atomId: 'bio_retinal_burn', revealPhase: 'rising' },
                { atomId: 'visor_filter_collapse', revealPhase: 'climax' },
                { atomId: 'terminal_lucidity_carbon', revealPhase: 'resolution' },
            ],
            resonance: [
                { atomId: ['camera_wireframe_dehumanization', 'bio_retinal_burn'], type: 'polarization' },
                { source: ['visual_static_delusion'], target: ['visor_filter_collapse'], type: 'herald' },
            ],
        },
    ),

    // =========================================================================
    // 26. 定数宿命 (Deterministic Dread - 因果定数) [扩展: chronos 主控]
    // =========================================================================
    aesthetic(
        'deterministicDread',
        '定数宿命',
        '觉知突破临界后，眼前提前显化出未来数秒内自身攻击尽数落空、胸膛被贯穿的绝对因果定数。知道死局却不得不亲手踏入，每一次挣扎都是对既定因果的精准履约。【偏转规约】：高觉知 (awareness >= 50) 开启的行动预测展现出不可逆的毁灭结局；结果序列 (ResultSequence) 的枯竭带来不可逆的体力虚脱；收音机冷酷播报着己方小队三小时后的死讯。',
        '[AESTHETIC: DETERMINISTIC_DREAD] ' +
        'SENSORY: suffocating certainty, taste of dry chalk, dull echo of a gunshot before the hammer strikes the cartridge primer. ' +
        'VISUAL: phantom red lines tracing upcoming fatal bullet trajectories through one\'s own skull, pre-existing tombstones bearing current dates, stuttering chronometers. ' +
        'RULE: high awareness reveals future combat failure results without granting means to evade them; causal inversion pre-renders wounds before triggers are pulled. ' +
        'SANITY TRIGGER: radio dispatch broadcasting your exact squad\'s coordinates and gruesome autopsy reports hours before entering the combat zone. ' +
        'RESTRICTION & FORBIDDEN: NO miraculous defying of calculated fate. Prophesied combat catastrophes require horrific sacrifice to even partially deflect. ' +
        'NARRATIVE ANCHORS: deterministic_sequence_dread, causal_inversion, future_broadcast, frozen_explosion, future_corpse, looping_event, meaningless_victory.',
        'chronos',
        ['logos', 'topos'],
        {
            skeleton: [
                { atomId: 'deterministic_sequence_dread', dominance: 0.45 },
                { atomId: 'causal_inversion', dominance: 0.3 },
                { atomId: 'future_broadcast', dominance: 0.25 },
            ],
            flesh: [
                { atomId: 'frozen_explosion', revealPhase: 'setup' },
                { atomId: 'future_corpse', revealPhase: 'rising' },
                { atomId: 'looping_event', revealPhase: 'climax' },
                { atomId: 'meaningless_victory', revealPhase: 'resolution' },
            ],
            resonance: [
                { source: ['future_broadcast'], target: ['deterministic_sequence_dread'], type: 'herald' },
                { atomId: ['deterministic_sequence_dread', 'causal_inversion'], type: 'symbiosis' },
            ],
        },
    ),
]