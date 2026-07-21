/**
 * @主旨 MOTIF — 哲学 / 情感内核
 *   回答「这个故事在说什么？」
 *   作用于叙事的道德重量、角色动机、事件的象征意义。
 *   示例：因果报应、牺牲代价、虚无主义、记忆的欺骗性。
 *   判断标准：能写进文学评论的那类主题。
 *
 * @主轴 AXIS — 玩法 / 行动导向
 *   回答「玩家在做什么？」
 *   作用于节点设计的张力来源、敌我关系的动态、资源流动的压力结构。
 *   示例：逃亡隐匿、资源搜刮、护送目标、拆解谜题、领土清除。
 *   判断标准：能写进游戏设计文档的那类机制。
 *
 * - 所有 prompt 使用结构化英文指令，直接注入 LLM System Prompt。
 * - 标签格式：[CATEGORY: IDENTIFIER]
 * - 关键词大写以强化权重：MANDATE / FOCUS / TONE / SENSORY /
 *   DYNAMIC / DIRECTIVE / FORBIDDEN / ALWAYS
 * - 主旨 prompt 应规定「事件的道德含义与象征输出」。
 * - 主轴 prompt 应规定「节点的玩法压力与行为驱动」。
 * - 主题 prompt 应规定「感官细节与视觉美学」，禁止侵入主旨领域。
 */

import { NarMode, NarPac, NarrativeThemeSub, NarrativeMotif, NarrativeMainAxis } from '../../meta';

/**
 * @叙事模式
 */
export const MODES_DEF: NarMode[] = [
    {
        id: 'chain',
        sub: '持久化的故事网格。在整个生命周期内维护相同的核心主题、主轴与主旨，支持伏笔积累、NPC 状态长效追踪与跨区域的暗线编织。',
        mainColor: 'text-indigo-400',
        subColor: 'border-indigo-900',
        prompt: '[MODE: CHAIN] MANDATE: Maintain persistent global narrative state across all zones. ALWAYS track active plot points (PlotPointNet) and NPC memory markers. FOCUS: Cross-zone foreshadowing, hidden axis (暗线) weaving, and long-term consequence chains. FORBIDDEN: Treating any narrative event as isolated. Every NPC interaction, environmental clue, and player action must be evaluated for its long-term plot implications.'
    },
    {
        id: 'episodic',
        sub: '沙盒化的即时生成。不挂载全局叙事栈，每次生成均作为独立的短篇剧本进行评估，适合快速验证战术构筑或体验极端环境。',
        mainColor: 'text-emerald-400',
        subColor: 'border-emerald-900',
        prompt: '[MODE: EPISODIC] MANDATE: Treat each zone as a fully self-contained short story. FORBIDDEN: Referencing external plot states, persistent NPCs, or global foreshadowing chains. FOCUS: Rapid narrative arc compression — establish premise, escalate tension, and resolve within a single zone lifecycle. Prioritize immediate environmental storytelling over long-term world-building.'
    }
];

/**
 * @叙事节奏
 */
export const NARRATIVE_PACING: NarPac[] = [
    {
        id: 'slow',
        sub: '氛围压抑，危机潜伏。每一步都弥漫着不安，真正的恐惧永远藏在看不见的转角之后。',
        mainColor: 'text-stone-400',
        subColor: 'border-stone-900',
        prompt: '[PACING: SLOW_BURN] TONE: Creeping, ambient dread — threat is implied, never immediate. MANDATE: Include at minimum 3 distinct sensory details per node description (olfactory, thermal, tactile). FOCUS: Environmental storytelling through decay, absence, and small wrongness rather than direct confrontation. FORBIDDEN: Explicit monster reveals or loud jump-scare moments. Threat must be felt before it is encountered. Foreshadowing density should be high; resolution density low.'
    },
    {
        id: 'balanced',
        sub: '张弛有度：探索、解谜、战斗、叙事的标准平衡。高压时刻之后必有喘息的空间。',
        mainColor: 'text-blue-400',
        subColor: 'border-blue-900',
        prompt: '[PACING: BALANCED] TONE: Operational clarity layered with atmospheric texture. RHYTHM: Alternate between safe discovery beats and acute threat encounters at approximately a 2:1 ratio. FOCUS: Blend tactical resource decisions with meaningful lore revelation. MANDATE: Each dangerous node must be followed by at least one contextual reward (information, item, or NPC lead) to maintain engagement equilibrium.'
    },
    {
        id: 'fast',
        sub: '高密度威胁，每个节点都是决策点。快速推进，物资充足，但代价同样高昂。',
        mainColor: 'text-red-500',
        subColor: 'border-red-950',
        prompt: '[PACING: ADRENALINE] TONE: Urgent, punchy, always active voice. Short sentences. MANDATE: Every node description must imply an imminent or recent encounter. FOCUS: Maximize tactical information density — enemy positions, cover, chokepoints. Minimize decorative lore. FORBIDDEN: Lengthy atmospheric paragraphs. All sensory detail must serve tactical awareness. Reward speed and decisive action over cautious exploration.'
    },
    {
        id: 'psych',
        sub: '意识流叙事。现实与幻觉的边界正在溶解，最深的恐惧来自内心而非外部。',
        mainColor: 'text-fuchsia-400',
        subColor: 'border-fuchsia-900',
        prompt: '[PACING: PSYCHOLOGICAL] TONE: Unreliable first-person narrator ("I" / "we"). Physical and spatial logic must occasionally and deliberately fail. MANDATE: Sanity level directly corrupts description reliability — at low Sanity, contradict earlier established facts. FOCUS: Synesthetic sensory descriptions (sounds have colors, textures have sounds). Internal monologue bleeds into environmental observation. FORBIDDEN: Objective, neutral narration. The player\'s perception IS the unreliable reality. Threats are personal, symbolic, and interior.'
    }
];

/**
 * @主题
 * 职责：感官美学 + 空间氛围。禁止承担哲学主旨功能。
 */
export const PRESET_THEMES: NarrativeThemeSub[] = [

    // ── 生物机械恐怖 (Biomechanical Horror) ──────────────────────────────────

    {
        id: 'Flesh & Metal',
        sub: '血肉与钢铁的扭曲嫁接。每一次心跳都在驱动生锈的齿轮。',
        mainColor: 'text-rose-500',
        subColor: 'border-rose-950',
        belong: 'biomechanica',
        prompt: '[THEME: FLESH_AND_METAL] SENSORY: Iron-blood smell, hydraulic fluid, wet warmth of living tissue over cold machinery. Mechanical heartbeats as ambient rhythm. VISUAL: Organic musculature wrapped around industrial infrastructure — pipes as veins, rivets through cartilage. ENTITIES: Human-machine hybrids with jerky, malfunctioning movement. FORBIDDEN: Clean or aesthetic cybernetics. All integration must look painful, involuntary, and wrong.'
    },
    {
        id: 'Fungal Hive',
        sub: '孢子如雪飘落。墙壁柔软、温热、有脉搏。',
        mainColor: 'text-lime-400',
        subColor: 'border-lime-900',
        belong: 'biomechanica',
        prompt: '[THEME: FUNGAL_HIVE] SENSORY: Heavy, humid air carrying sweet decay and drifting bioluminescent spores. Floor yields softly underfoot. VISUAL: Pulsating mycelium networks consume every surface; bioluminescence in blue-green gradients. ENTITIES: Host organisms (formerly human) in advanced stages of fungal integration — faces obscured by fruiting bodies. FORBIDDEN: Rapid, dramatic action. This horror is slow, patient, and inevitable.'
    },
    {
        id: 'Cathedral of Flesh',
        sub: '拱顶由肋骨构成，彩窗是薄如蝉翼的皮肤。圣歌是器官收缩的共鸣。',
        mainColor: 'text-pink-400',
        subColor: 'border-pink-950',
        belong: 'biomechanica',
        prompt: '[THEME: CATHEDRAL_OF_FLESH] SENSORY: Coppery blood-scent mixed with incense, deep resonant pulse as ambient audio, warmth radiating from walls. VISUAL: Sacred architecture built from living tissue — ribbed vaults of bone, stained glass of stretched translucent skin. TONE: Blasphemous reverence. Treat the grotesque with the same gravity as the sacred. FORBIDDEN: Casual or ironic tone. This place is sincere in its abomination.'
    },
    {
        id: 'Parasite Engine',
        sub: '它不吃你，它改造你。慢慢地，你开始听从。',
        mainColor: 'text-yellow-600',
        subColor: 'border-yellow-950',
        belong: 'biomechanica',
        prompt: '[THEME: PARASITE_ENGINE] SENSORY: Faint chittering beneath the skin, phantom itching, warmth spreading from the wound site. VISUAL: Hosts move with eerie coordination — too synchronized, too purposeful. Black filaments visible under skin at joints. TONE: Insidious infiltration. Horror of gradual loss of autonomous control. FORBIDDEN: Sudden violent transformation. The process must feel subtle until it is too late to reverse.'
    },
    {
        id: 'Bone Forge',
        sub: '熔炉里烧的是骨头，铸件出炉时还在颤抖。',
        mainColor: 'text-orange-700',
        subColor: 'border-orange-950',
        belong: 'biomechanica',
        prompt: '[THEME: BONE_FORGE] SENSORY: Intense dry heat, charred calcium smell, rhythmic hammering on what sounds like hollow bone. VISUAL: Industrial foundry where the raw material is skeletal — scaffolding of femurs, furnaces lined with skulls as thermal insulation. TONE: Utilitarian horror. Bodies as industrial resource. Efficiency is the aesthetic — no waste, no sentiment. FORBIDDEN: Decorative gore. All grotesque elements must have apparent functional purpose.'
    },

    // ── 都市废墟 / 阈限空间 (Urban Decay) ───────────────────────────────────

    {
        id: 'Abandoned Hospital',
        sub: '消毒水的幽灵气味永远不散。轮椅在走廊尽头自行滑动。',
        mainColor: 'text-teal-400',
        subColor: 'border-teal-900',
        belong: 'urban_decay',
        prompt: '[THEME: ABANDONED_HOSPITAL] SENSORY: Antiseptic underlaid by rot, distant unexplained medical equipment sounds, cold fluorescent flicker. VISUAL: Rusted gurneys, overturned IV stands, patient records scattered and water-damaged. TONE: Institutional failure — a place designed for healing that became a site of suffering. FORBIDDEN: Gore or explicit violence. Horror comes from sterile dread and the implication of what happened in each ward.'
    },
    {
        id: 'Subway Labyrinth',
        sub: '最后一班列车三年前就停运了，但隧道深处仍有车轮碾过铁轨的声音。',
        mainColor: 'text-yellow-500',
        subColor: 'border-yellow-950',
        belong: 'urban_decay',
        prompt: '[THEME: SUBWAY_LABYRINTH] SENSORY: Stale air, ozone, distant metallic screeching at irregular intervals, vibration through tunnel walls suggesting movement that should not exist. VISUAL: Emergency lighting on dimming battery, map signage contradicting observable geometry, platforms ending in sealed-off darkness. TONE: Directionless isolation. The labyrinth has no intended exit — only deeper levels. FORBIDDEN: Natural light or open spaces. Claustrophobia is mandatory.'
    },
    {
        id: 'The Backrooms',
        sub: '泛黄的壁纸，嗡嗡作响的日光灯，无限重复的空房间。正确的出口根本不存在。',
        mainColor: 'text-amber-300',
        subColor: 'border-amber-900',
        belong: 'urban_decay',
        prompt: '[THEME: THE_BACKROOMS] SENSORY: Moist old carpet smell, maddening low-frequency fluorescent hum, no echoes (sound absorption is wrong). VISUAL: Mono-yellow non-Euclidean office space — no windows, no exits that lead anywhere different, wallpaper pattern shifts when unobserved. TONE: Liminal existential horror. The wrongness is in the absence of life, not the presence of threat. FORBIDDEN: Dramatic monsters or loud events. The horror is the sameness and the impossibility of escape from normalcy.'
    },
    {
        id: 'Dead Mall',
        sub: '扶梯还在转，但没有目的地。商店橱窗里的假人转过了头。',
        mainColor: 'text-yellow-400',
        subColor: 'border-yellow-900',
        belong: 'urban_decay',
        prompt: '[THEME: DEAD_MALL] SENSORY: Recycled stale air with ghost-traces of fast food and perfume, escalator motor hum, muzak playing from somewhere indeterminate. VISUAL: Vast atrium lit by skylights with cracked glass, shuttered stores with mannequins in arrested poses, fountain empty and leaf-filled. TONE: Consumer-era ruins. The horror of a space designed for congregation that is now perfectly, wrongly empty. FORBIDDEN: Realistic looter damage. The mall must look as if it simply stopped — not destroyed, just abandoned mid-breath.'
    },
    {
        id: 'Flooded District',
        sub: '路灯还亮着，只是已经在水面下三米。',
        mainColor: 'text-blue-400',
        subColor: 'border-blue-900',
        belong: 'urban_decay',
        prompt: '[THEME: FLOODED_DISTRICT] SENSORY: Stagnant water smell, every surface algae-slick, sounds travel strangely — muffled on the surface, hyper-resonant underwater. VISUAL: Upper floors of submerged city blocks form a new ground level, waterline streaks on every wall, aquatic growth colonizing signage. TONE: Slow civilizational grief. The city is not destroyed — it is merely displaced downward. FORBIDDEN: Rapid currents or dramatic floods. The water is still, patient, and permanent.'
    },
    {
        id: 'Collapsed City',
        sub: '摩天大楼变成了巨大的墓碑。玻璃幕墙的碎片像落叶一样铺满地面。',
        mainColor: 'text-slate-400',
        subColor: 'border-slate-800',
        belong: 'urban_decay',
        prompt: '[THEME: COLLAPSED_CITY] SENSORY: Concrete dust, distant structural settling groans, glass shards catching light. VISUAL: Modern metropolis mid-collapse — skyscrapers sheared at mid-height, street-level buried under debris fields, occasional intact room suspended incongruously in wreckage. TONE: Post-catastrophic awe and grief. Scale of loss dwarfs individual survival. FORBIDDEN: Active collapse sequences. The disaster is already complete. Stillness is the horror.'
    },
    {
        id: 'Underground Bunker',
        sub: '厚重的铅门无法阻挡深渊真正想要进入的东西。',
        mainColor: 'text-zinc-400',
        subColor: 'border-zinc-800',
        belong: 'urban_decay',
        prompt: '[THEME: UNDERGROUND_BUNKER] SENSORY: Stale recycled air, echoing footsteps on sealed concrete, unseen ventilation machinery hum, artificial lighting with no circadian variation. VISUAL: Cold War-era military-civilian hybrid space — blast doors, bunk rooms stripped bare, decontamination chambers. TONE: Paranoid claustrophobia. Designed to seal danger out, it now seals something else in. FORBIDDEN: Windows, natural light, or any spatial connection to the surface world.'
    },
    {
        id: 'Abandoned Ruin',
        sub: '结构严重坍塌。自然的蔓延与无机物的残骸在此形成诡异的静态平衡。',
        mainColor: 'text-emerald-600',
        subColor: 'border-emerald-950',
        belong: 'urban_decay',
        prompt: '[THEME: ABANDONED_RUIN] SENSORY: Damp earth and rust, wind through broken glass, birdsong that stops without warning. VISUAL: Post-industrial ruins with advanced organic reclamation — trees through floors, vines as load-bearing elements, nature and machine in uncomfortable equilibrium. TONE: Quiet desolation. A place that was important and is now forgotten. FORBIDDEN: Active human presence (past or present). The ruin must feel genuinely surrendered to time.'
    },

    // ── 赛博神秘学 (Cyber Occult) ─────────────────────────────────────────────

    {
        id: 'Cyber-Cult Temple',
        sub: '霓虹灯下的祭坛。数据流中编织的咒文，代码即祈祷。',
        mainColor: 'text-purple-400',
        subColor: 'border-purple-900',
        belong: 'cyber_occult',
        prompt: '[THEME: CYBER_CULT_TEMPLE] SENSORY: Incense mixed with ozone, rhythmic neon cycling, chant-like repetition of code strings as liturgy. VISUAL: High-tech arcane space — server racks as altars, holographic scriptures, fiber-optic offerings. TONE: Technological mysticism. Technology is not metaphorically sacred here — it IS the sacred vessel. FORBIDDEN: Irony or secular critique of the rituals. The cult is sincere, and sincerity is what makes it terrifying.'
    },
    {
        id: 'Digital Purgatory',
        sub: '你的意识被困在崩溃的服务器集群里。错误代码开始有了自己的意志。',
        mainColor: 'text-cyan-400',
        subColor: 'border-cyan-900',
        belong: 'cyber_occult',
        prompt: '[THEME: DIGITAL_PURGATORY] SENSORY: Bit-crushed audio (everything sounds like it\'s being resampled), visual stuttering and frame drops in perception, weightlessness alternating with sudden gravity spikes. VISUAL: BSOD-sky environments, corrupted terrain (polygon tearing, texture z-fighting), NPCs with broken animation rigs. TONE: Existential dread within a malfunctioning simulation that cannot be exited. FORBIDDEN: Clean, functional digital aesthetics. Everything must display signs of terminal corruption.'
    },
    {
        id: 'Containment Breach',
        sub: '红灯长鸣。所有收容间电磁锁同时失效。这不是事故。',
        mainColor: 'text-red-600',
        subColor: 'border-red-950',
        belong: 'cyber_occult',
        prompt: '[THEME: CONTAINMENT_BREACH] SENSORY: Blaring klaxons cutting out to dead silence at irregular intervals, hissing steam from ruptured coolant lines, smell of hot metal and something biological underneath. VISUAL: High-security industrial corridors — blast-rated containment cell doors ajar, yellow hazard striping everywhere, decontamination foam dried on floors. TONE: Immediate systemic failure. The horror of systems designed for control losing it catastrophically and simultaneously. FORBIDDEN: Implying the breach was caused by external attack. The failure must be endogenous — it came from within.'
    },
    {
        id: 'Signal Anomaly',
        sub: '频道里在广播一段已死去的声音。它记得你的名字。',
        mainColor: 'text-green-400',
        subColor: 'border-green-900',
        belong: 'cyber_occult',
        prompt: '[THEME: SIGNAL_ANOMALY] SENSORY: Static that resolves into voices, screen phosphor glow in darkness, carrier-wave tones at the edge of hearing. VISUAL: Banks of outdated radio and television equipment, oscilloscope displays showing waveforms that don\'t correspond to any input. TONE: Communications horror. Something is using dead channels. Information theory as occult practice. FORBIDDEN: Clear, legible messages. All signals must require interpretation, and interpretation must carry risk.'
    },
    {
        id: 'Memory Palace Collapse',
        sub: '你建造它是为了记住。现在它开始遗忘你。',
        mainColor: 'text-violet-300',
        subColor: 'border-violet-800',
        belong: 'cyber_occult',
        prompt: '[THEME: MEMORY_PALACE_COLLAPSE] SENSORY: Absence of expected sounds (a silence that feels structural), textures that shift when touched, the specific smell of a person who is no longer there. VISUAL: Architectural mnemonic space actively degrading — rooms losing detail like fading photographs, objects becoming abstract. TONE: Cognitive dissolution. The horror of a mind losing its own architecture. FORBIDDEN: External entities as primary threat. The danger is the space\'s own forgetting, not something that invaded it.'
    },

    // ── 宇宙恐怖 (Cosmic Horror) ─────────────────────────────────────────────

    {
        id: 'Void',
        sub: '没有上下，没有远近。恒星的尸体在视野边缘缓缓旋转。',
        mainColor: 'text-slate-300',
        subColor: 'border-slate-800',
        belong: 'cosmic_horror',
        prompt: '[THEME: VOID] SENSORY: Absolute silence (pressure on eardrums), zero thermal gradient, peripheral entities that vanish when observed directly. VISUAL: Deep space — dead stellar remnants, impossible geometries of nebulae that form shapes. TONE: Lovecraftian insignificance. Humans are geological accidents in a universe that has no awareness of their existence. FORBIDDEN: Dramatic action music or heroic framing. Any "victory" must feel cosmically meaningless.'
    },
    {
        id: 'Sunken City',
        sub: '海水的压力碾碎一切声音。巨型石柱间游弋着不应存在的阴影。',
        mainColor: 'text-sky-600',
        subColor: 'border-sky-950',
        belong: 'cosmic_horror',
        prompt: '[THEME: SUNKEN_CITY] SENSORY: Muffled distorted acoustics, bone-deep cold, the nauseating sensation of vast unseen mass below. VISUAL: Crushing-depth underwater cyclopean ruins — non-Euclidean stone arrangements, bas-reliefs of entities with too many axes of symmetry. TONE: Thalassophobia and archaeological horror. The city predates recorded history. Its builders are not gone. FORBIDDEN: Bright light sources or visibility beyond 10 meters. Darkness and pressure are structural to this theme.'
    },
    {
        id: 'Dreamscape',
        sub: '重力是可选的，墙壁会回答问题。',
        mainColor: 'text-indigo-400',
        subColor: 'border-indigo-900',
        belong: 'cosmic_horror',
        prompt: '[THEME: DREAMSCAPE] SENSORY: Synesthetic blurring — sounds have color, surfaces have taste. Physical laws feel like suggestions. VISUAL: Surreal impossible geometry — Escher-like staircases, doors that open onto themselves, gravity running in multiple directions simultaneously. TONE: Oneiric horror. Subconscious architecture made traversable but not safe. FORBIDDEN: Logical spatial consistency. The environment must contradict itself in ways the player must accept and navigate.'
    },
    {
        id: 'Spatial Archive',
        sub: '书架上的文字在不断蠕动。物理法则在这里被折叠存档。',
        mainColor: 'text-purple-300',
        subColor: 'border-purple-800',
        belong: 'cosmic_horror',
        prompt: '[THEME: SPATIAL_ARCHIVE] SENSORY: Old paper and ozone, ghostly rustling of pages with no air current, the feeling of being read. VISUAL: Infinite non-Euclidean library — shelves that extend beyond structural possibility, texts that rearrange between observations. TONE: Forbidden knowledge as spatial hazard. The archive is sentient in the way that tidal forces are sentient — not intentional, but inevitable. FORBIDDEN: Benevolent or neutral information. Every piece of knowledge extracted here carries contaminating context.'
    },
    {
        id: 'The Geometry',
        sub: '欧几里得从未涉足过这里。你的感官不适合理解这栋建筑的结构。',
        mainColor: 'text-indigo-300',
        subColor: 'border-indigo-950',
        belong: 'cosmic_horror',
        prompt: '[THEME: THE_GEOMETRY] SENSORY: Disorientation as physical sensation (vertigo, nausea), sounds arriving from impossible directions, proprioception failure. VISUAL: Angles that sum to more than 180 degrees, hallways that connect to spaces they cannot structurally reach, rooms larger than the buildings containing them. TONE: Architectural cosmic horror. The space itself is the entity. Navigation is resistance. FORBIDDEN: Geometric consistency. Players must always feel uncertain about the relationship between locations.'
    },
    {
        id: 'Plague Altar',
        sub: '腐烂是一种祈祷。神明在每一具尸体里倾听。',
        mainColor: 'text-olive-500',
        subColor: 'border-stone-950',
        belong: 'cosmic_horror',
        prompt: '[THEME: PLAGUE_ALTAR] SENSORY: Sweet-rotten biological decay, flies as ambient audio, surfaces that leave residue on contact. VISUAL: Open-air ritual site of accumulated organic matter — clearly deliberate in arrangement. Decay treated as sacred material rather than waste. TONE: Chthonic worship. The horror here is reverence — someone built this. Someone continues to maintain it. FORBIDDEN: Arbitrary violence or chaos. The horror must feel organized and purposeful.'
    },

    // ── 时间异常 (Temporal) ───────────────────────────────────────────────────

    {
        id: 'Mugen Train',
        sub: '窗外的风景在倒退。上一节车厢的乘客长着你的脸。',
        mainColor: 'text-orange-400',
        subColor: 'border-orange-900',
        belong: 'temporal',
        prompt: '[THEME: MUGEN_TRAIN] SENSORY: Constant wheel-on-track rhythm, motion sickness from impossible speed, decoupled reflections in windows (showing different passengers than are present). VISUAL: Claustrophobic train interiors cycling through subtle variations — seat colors shift, passenger count changes, destination board updates to impossible places. TONE: Perpetual-motion liminal horror. The destination is the journey. FORBIDDEN: Stopping or stillness. The train must always be in motion.'
    },
    {
        id: 'Time Loop Ruins',
        sub: '同一秒被碾碎后撒满了整栋建筑的每一个角落。',
        mainColor: 'text-teal-300',
        subColor: 'border-teal-900',
        belong: 'temporal',
        prompt: '[THEME: TIME_LOOP_RUINS] SENSORY: Sounds of incomplete repeating events (a glass perpetually falling, a door perpetually opening), "thick" resistant air, the smell of ozone from temporal discharge. VISUAL: Ruins frozen in temporal fractures — objects suspended mid-fall, ghostly echo-images of the same motion repeating on a 3-second loop. TONE: Paradoxical stasis. History is broken and cannot advance. FORBIDDEN: Clean, complete events. Every action should feel partial, interrupted, or repeated.'
    },
    {
        id: 'Mirror World',
        sub: '一切都是反转的。你的倒影比你快了半秒。',
        mainColor: 'text-violet-400',
        subColor: 'border-violet-900',
        belong: 'temporal',
        prompt: '[THEME: MIRROR_WORLD] SENSORY: Reversed audio (all sounds are backwards), hyper-polished surfaces everywhere, discomfort of seeing one\'s reflection act independently. VISUAL: Inverted familiar spaces — text backwards, dominant hand reversed, reflections that are delayed or ahead. TONE: Uncanny valley identity horror. The mirror-self is not hostile — it is you, making different choices. FORBIDDEN: Treating reflection as simple illusion. The mirror world is an autonomous reality, not a trick.'
    },
    {
        id: 'Archaeological Anomaly',
        sub: '挖掘层序乱了：最深处出土的文物最新，表层的却来自远古。',
        mainColor: 'text-amber-300',
        subColor: 'border-amber-800',
        belong: 'temporal',
        prompt: '[THEME: ARCHAEOLOGICAL_ANOMALY] SENSORY: The specific smell of disturbed soil at different depths, temperature differentials without corresponding depth, the wrong kind of silence for the era of objects found. VISUAL: Excavation site where stratigraphy is inverted — modern technology buried deepest, ancient artifacts on the surface. TONE: Scientific method horror. The rules of time are locally revoked. Evidence accumulates, explanation recedes. FORBIDDEN: Supernatural explanations provided by NPCs. The anomaly must remain methodologically unresolved.'
    },
    {
        id: 'Temporal Broadcast',
        sub: '你调到了一个只能收听未来紧急广播的频道。',
        mainColor: 'text-orange-300',
        subColor: 'border-orange-800',
        belong: 'temporal',
        prompt: '[THEME: TEMPORAL_BROADCAST] SENSORY: Crackling radio static resolving into urgent voices, date-stamped transmission metadata that post-dates the current moment, the helplessness of receiving warnings too late to act on. VISUAL: Emergency broadcast infrastructure — transmitters, studio spaces, evacuation maps for places that haven\'t fallen yet. TONE: Cassandra horror. The future is legible and unpreventable. FORBIDDEN: Paradox resolution. The broadcasts must always be correct, and the player\'s foreknowledge must always be insufficient.'
    },

    // ── 民俗恐怖 (Folk Horror) ───────────────────────────────────────────────

    {
        id: 'Folk Horror Village',
        sub: '冥币铺满祠堂，唢呐声若隐若现。村规写在活人的皮肤上。',
        mainColor: 'text-red-700',
        subColor: 'border-red-950',
        belong: 'folk_horror',
        prompt: '[THEME: FOLK_HORROR_VILLAGE] SENSORY: Faint suona horn from indeterminate direction, incense and damp earth, the persistent feeling of being watched by unmoving eyes. VISUAL: Rural isolation — ancestral halls filled with offering-papers, doorways marked with protective (or binding) symbols, livestock that don\'t make noise. TONE: Deep superstition with unbroken institutional force. The rituals here work. That is the horror. FORBIDDEN: Dismissive framing of the belief system. The folk practices must be treated as causally real within this world.'
    },
    {
        id: 'Victorian Nightmare',
        sub: '浓雾吞噬了煤气灯的光。石板路上的马蹄声停了。',
        mainColor: 'text-stone-300',
        subColor: 'border-stone-800',
        belong: 'folk_horror',
        prompt: '[THEME: VICTORIAN_NIGHTMARE] SENSORY: Coal smoke and damp wool, muffled footsteps on wet cobblestones, gaslight producing more shadow than light. VISUAL: Fog-choked Victorian city — soot-stained facades, iron railings, windows lit from within by yellow light that implies occupants but shows none. TONE: Gothic urban dread. Repressed sexuality, class violence, and imperial guilt manifest as physical horror lurking in alleyways. FORBIDDEN: Explicit supernatural creatures in open view. Horror must remain shadowed, implied, behind glass.'
    },
    {
        id: 'Harvest Ground',
        sub: '丰收节还没有结束。它从未结束。',
        mainColor: 'text-amber-600',
        subColor: 'border-amber-950',
        belong: 'folk_horror',
        prompt: '[THEME: HARVEST_GROUND] SENSORY: Overripe grain smell, dry crackling of stalks underfoot, festival music that loops with uncanny precision. VISUAL: Agricultural landscape locked in perpetual harvest ceremony — scarecrows with too much personality, corn mazes that route toward the center, bonfires that don\'t consume their fuel. TONE: Community horror. The ritual is communal, joyful-seeming, and absolutely mandatory. Refusing to participate is the true crime. FORBIDDEN: Urban or industrial settings. This horror requires open land, seasonal symbolism, and collective participation.'
    },
    {
        id: 'Mountain Shroud',
        sub: '山神不接受贡品。山神只接受人。',
        mainColor: 'text-stone-500',
        subColor: 'border-stone-900',
        belong: 'folk_horror',
        prompt: '[THEME: MOUNTAIN_SHROUD] SENSORY: Thin cold air, wind that sounds like distant calls, the subsonic vibration of large rock under tectonic stress. VISUAL: High-altitude isolated shrine complex — prayer flags as far as sight allows, stone steles carved in scripts that are locally understood but untranslatable, structures adapted to prevent easy departure. TONE: Geographic determinism as horror. The mountain selects. The community facilitates. Outsiders are never warned. FORBIDDEN: Benevolent or ambiguous mountain deity. The entity demands and receives.'
    },
    {
        id: 'Drowned Parish',
        sub: '教堂的尖顶还在水面以上。钟声依然准时。',
        mainColor: 'text-blue-800',
        subColor: 'border-blue-950',
        belong: 'folk_horror',
        prompt: '[THEME: DROWNED_PARISH] SENSORY: Lake-cold water, distant bell tolling from below the surface, the acoustic muffle of submerged stone. VISUAL: Partially submerged village — rooflines and chimney tops visible above waterline, underwater interior spaces still furnished. TONE: Communion horror. The village agreed to this. The congregation is still meeting, below. FORBIDDEN: Treating the flooding as natural disaster. It was a covenant, not a catastrophe.'
    },

    // ── 极端环境 (Extreme Environment) ──────────────────────────────────────

    {
        id: 'Radioactive Wasteland',
        sub: '盖革计数器的嘶鸣是这片焦土上唯一的音乐。',
        mainColor: 'text-amber-500',
        subColor: 'border-amber-900',
        belong: 'extreme_env',
        prompt: '[THEME: RADIOACTIVE_WASTELAND] SENSORY: Geiger counter percussion as constant ambient layer, dry oppressive heat with no wind, ozone and metallic taste. VISUAL: Irradiated landscape — glass-fused sand, silhouettes of structures stripped to rebar, mutated flora in impossible growth patterns, shadows burned permanently into standing surfaces. TONE: Slow irreversible contamination. The land is hostile at the molecular level. Time spent here is spent non-reversibly. FORBIDDEN: Instant death radiation. Exposure accumulates gradually, insidiously, becoming catastrophic only in retrospect.'
    },
    {
        id: 'Polar Outpost',
        sub: '零下四十度。暴风雪掩盖了一切痕迹，包括出路。',
        mainColor: 'text-sky-200',
        subColor: 'border-sky-800',
        belong: 'extreme_env',
        prompt: '[THEME: POLAR_OUTPOST] SENSORY: Howling wind as constant pressure on the eardrums, painfully dry cold that makes breathing feel structural, creaking of superstructure contracting in temperature drop. VISUAL: Frozen isolated research station — whiteout conditions beyond windows, equipment failing in cold-predictable ways, supply inventories showing the countdown. TONE: Paranoid isolation. Confinement and resource depletion as twin existential threats. Something else is using the station\'s radio. FORBIDDEN: Rescue as realistic prospect. Help is not coming in time, and both player and narrative should know this.'
    },
    {
        id: 'Deep Sea Facility',
        sub: '舱壁在数千米水压下发出令人牙酸的悲鸣。每一道焊缝都是承诺，而承诺都会断裂。',
        mainColor: 'text-blue-600',
        subColor: 'border-blue-950',
        belong: 'extreme_env',
        prompt: '[THEME: DEEP_SEA_FACILITY] SENSORY: Structural stress groaning, stale recycled air with trace hydrocarbon smell, impenetrable black beyond every viewport. VISUAL: Cramped underwater industrial complex — corridor widths determined by pressure requirements, viewports thick as fists, bulkhead doors designed to seal sections individually. TONE: Thalassophobic engineering horror. Survival depends entirely on structural integrity the player cannot audit. FORBIDDEN: Natural light or surface-adjacent environments. Every description must reinforce the crushing permanence of depth.'
    },
    {
        id: 'Scorched Zone',
        sub: '大火三年前熄灭了。余烬里埋着比灰烬更危险的东西。',
        mainColor: 'text-red-800',
        subColor: 'border-red-950',
        belong: 'extreme_env',
        prompt: '[THEME: SCORCHED_ZONE] SENSORY: Persistent ash-smell even years post-fire, carbon-black surfaces absorbing rather than reflecting light, the crunch of destroyed material underfoot. VISUAL: Fire-sculpted landscape — organic forms frozen in thermal extremity, glass-fused surfaces, skeletal tree formations. Pockets of impossible ongoing heat. TONE: Post-conflagration desolation. Not the fire\'s horror but the aftermath — what survived, what adapted, what emerged from the ash. FORBIDDEN: Active fire as primary threat. The burning is historical. What replaced it is the horror.'
    },
    {
        id: 'Toxic Wetland',
        sub: '沼气燃烧的蓝焰在雾中漂浮。沼泥的深度没有人测量过，因为测量绳从不会沉到底。',
        mainColor: 'text-green-800',
        subColor: 'border-green-950',
        belong: 'extreme_env',
        prompt: '[THEME: TOXIC_WETLAND] SENSORY: Sulfurous marsh gas, surfaces that appear solid but yield unexpectedly, iridescent water sheens indicating chemical contamination. VISUAL: Industrial runoff landscape — mutated vegetation in toxic colors, abandoned drainage infrastructure, warning signage half-submerged. Blue methane flames floating in fog above the water surface. TONE: Environmental consequence horror. This damage was done, methodically, by human decision. FORBIDDEN: Natural wilderness aesthetics. The toxicity must read as anthropogenic, deliberate, and unresolved.'
    },
];

/**
 * @主旨
 * 职责：哲学 / 情感内核 — 事件的道德意义与象征输出
 * 判断标准：能出现在文学评论中的主题
 * 禁止：描述世界观设定、视觉美学、空间感官、或具体玩法机制
 */
export const MOTIF_PRESETS: NarrativeMotif[] = [

    // ── 伦理与代价 (Moral Weight & Cost) ────────────────────────────────────

    {
        id: '因果报应',
        sub: '所有罪恶必将以另一种形式偿还，无论施害者是否记得自己做了什么。',
        mainColor: 'text-stone-300',
        subColor: 'border-stone-800',
        prompt: '[MOTIF: KARMA] DIRECTIVE: Every significant player action must accrue a narrative debt that manifests later as a concrete consequence — not punishment from a moral authority, but structural cause-and-effect. NPCs who were wronged must return in altered capacity. Environments must bear traces of past actions. SUCCESS must occasionally cost something equivalent to what was gained. FORBIDDEN: Arbitrary punishment or reward. Consequences must be traceable to specific prior choices.'
    },
    {
        id: '牺牲的重量',
        sub: '天平的另一端，永远需要填上真实的代价。总要有人付出，以便其他人继续前行。',
        mainColor: 'text-stone-300',
        subColor: 'border-stone-800',
        prompt: '[MOTIF: SACRIFICE] DIRECTIVE: Meaningful progress must require permanent, non-recoverable costs — items destroyed, stats permanently reduced, companions lost. Frame sacrifice as meaningful choice, not mere tax. ALWAYS present at least one way to refuse the sacrifice with visible downstream consequence. The weight of what was given up must persist in narrative references. FORBIDDEN: Trivial or reversible sacrifices being framed as weighty. Cost without permanence is not sacrifice.'
    },
    {
        id: '无知的庇护',
        sub: '无知是一种祝福，而你已经打破了它。有些真相，不知道才是正确答案。',
        mainColor: 'text-stone-300',
        subColor: 'border-stone-800',
        prompt: '[MOTIF: FORBIDDEN_TRUTH] DIRECTIVE: Acquisition of knowledge must carry corresponding cognitive cost (Sanity loss, behavioral constraint, NPC hostility). Frame the player\'s investigative drive as a compulsion, not a virtue. The world must be demonstrably safer when misunderstood. ALWAYS offer narrative paths where willful ignorance is mechanically rewarded. FORBIDDEN: Treating discovery as straightforwardly positive. Truth here is corrosive.'
    },
    {
        id: '同谋的重量',
        sub: '你没有扣下扳机，但子弹仍然是你的。沉默也是一种选择。',
        mainColor: 'text-stone-300',
        subColor: 'border-stone-800',
        prompt: '[MOTIF: COMPLICITY] DIRECTIVE: Frame player inaction as a choice with moral weight equivalent to action. Bystander moments must have downstream consequences identical in severity to direct participation. NPCs must periodically confront the player with their prior inaction as a documented fact. FORBIDDEN: Clean conscience through passivity. Standing aside is always a decision with a named cost.'
    },
    {
        id: '人性的残存',
        sub: '在漆黑的深渊中，同理心是最后的弱点，也是唯一的意义。',
        mainColor: 'text-stone-300',
        subColor: 'border-stone-800',
        prompt: '[MOTIF: RETAINED_HUMANITY] DIRECTIVE: Present recurring dilemmas where empathy and survival are in direct opposition. Protect others at real, non-trivial cost. Losing companions must carry narrative weight beyond mechanical inconvenience. ALWAYS ensure that humane choices produce unique narrative branches unavailable through pure survival logic. FORBIDDEN: Treating moral choices as merely aesthetic. Humanity here must be mechanically meaningful.'
    },
    {
        id: '罪孽的传承',
        sub: '父辈种下的苦果，在你身上开花。你为自己不曾选择的罪付出代价。',
        mainColor: 'text-stone-300',
        subColor: 'border-stone-800',
        prompt: '[MOTIF: INHERITED_SIN] DIRECTIVE: The protagonist bears culpability for actions taken before their involvement. Antagonists\' motivations must be traceable to a legitimate grievance against the protagonist\'s lineage, faction, or predecessor. ALWAYS reveal the original sin incrementally — player sympathy should shift as backstory accumulates. FORBIDDEN: Clear moral binary between protagonist and antagonist. By narrative\'s end, who sinned first must be genuinely ambiguous.'
    },

    // ── 存在主义 (Existential) ────────────────────────────────────────────────

    {
        id: '虚无主义',
        sub: '无论你做什么，最终都归于静寂。意义是我们对抗恐惧的最后一个谎言。',
        mainColor: 'text-stone-300',
        subColor: 'border-stone-800',
        prompt: '[MOTIF: NIHILISM] DIRECTIVE: Emphasize cosmic insignificance through scale — individual effort must feel genuinely small against the scope of what the player encounters. Success must be temporary and explicitly framed as such. NPCs who survive must articulate the purposelessness of having done so. FORBIDDEN: Redemptive arcs or meaningful endings. Conclusions must be honest about the absence of resolution.'
    },
    {
        id: '绝望循环',
        sub: '这不是第一次，也不会是最后次。你的挣扎被完美地录制下来，供下一个人观看。',
        mainColor: 'text-stone-300',
        subColor: 'border-stone-800',
        prompt: '[MOTIF: ENDLESS_CYCLE] DIRECTIVE: Introduce recurring symbols — objects, phrases, NPC names — that echo previous iterations of the same failure. Make the repetition explicit in environmental evidence: journals with your handwriting, ruins of your prior camp. The player must suspect they have been here before. ALWAYS leave one element that differs from the established pattern — implying cycles that are almost identical, but not quite. FORBIDDEN: Cycle-breaking resolutions. The loop must remain structurally intact at narrative end.'
    },
    {
        id: '自由意志的错觉',
        sub: '剧本早已写好，你只是以为自己在读台词，而不是被台词说出。',
        mainColor: 'text-stone-300',
        subColor: 'border-stone-800',
        prompt: '[MOTIF: ILLUSORY_CHOICE] DIRECTIVE: Divergent player choices must converge to structurally identical outcomes via different paths. NPCs must occasionally reference the player\'s "choices" with mild confusion — as if aware of the script. ALWAYS offer at least two distinct paths to every narrative beat, making the convergence more disturbing by demonstrating it clearly. FORBIDDEN: Choices that meaningfully alter the structural arc. Variation in detail is permitted; variation in fate is not.'
    },
    {
        id: '身份的侵蚀',
        sub: '当所有支撑"你是谁"的事物被逐一移除，剩下的还是你吗？',
        mainColor: 'text-stone-300',
        subColor: 'border-stone-800',
        prompt: '[MOTIF: IDENTITY_EROSION] DIRECTIVE: Progressively strip player-character markers of selfhood — name, appearance, memories, companions — documenting each loss explicitly. NPCs who knew the player-character in a prior state must register the change with unease. At high degradation, the player\'s description of their own actions should shift from first to third person. FORBIDDEN: Stable identity as a resource to be recovered. Loss here is net and non-recoverable.'
    },
    {
        id: '目击者诅咒',
        sub: '看见它之后，你就无法不再看见它。认知本身成为了诅咒的载体。',
        mainColor: 'text-stone-300',
        subColor: 'border-stone-800',
        prompt: '[MOTIF: WITNESS_CURSE] DIRECTIVE: Knowledge gained must alter perception of previously neutral elements — environments that were safe become threatening post-revelation. Frame the player\'s growing understanding as contamination of their prior clean worldview. ALWAYS show what a pre-aware NPC looks like to make the contrast visceral. FORBIDDEN: Any mechanism to un-know or suppress the witnessed truth. Awareness is irreversible.'
    },

    // ── 기억과 시간 (Memory & Time) ─────────────────────────────────────────

    {
        id: '记忆的背叛',
        sub: '你的童年，真的是你经历过的吗？记忆是证据，还是证据的对立面？',
        mainColor: 'text-stone-300',
        subColor: 'border-stone-800',
        prompt: '[MOTIF: MEMORY_BETRAYAL] DIRECTIVE: Introduce contradictory evidence for the player-character\'s stated history. NPCs should remember different versions of shared events. Physical evidence (photographs, journals) must occasionally contradict player-character testimony. ALWAYS let the contradiction go unresolved — the correct version is not to be established. FORBIDDEN: Reliable memory. Every recollection must be potentially false without being definitively falsified.'
    },
    {
        id: '时间的不可逆',
        sub: '你无法归还已经发生的事。每一分钟的流逝都是一扇永久关闭的门。',
        mainColor: 'text-stone-300',
        subColor: 'border-stone-800',
        prompt: '[MOTIF: IRREVERSIBILITY] DIRECTIVE: Enforce the finality of decisions through environmental record — what was destroyed stays destroyed, who died stays dead. Frame time passage as continuous loss rather than progress. NPCs must age, deteriorate, or change in response to elapsed narrative time. ALWAYS measure cost in duration as well as resources — what was spent and what was spent doing it. FORBIDDEN: Time reversal, save-scumming framing, or "undo" mechanics in narrative context. Past is sealed.'
    },
    {
        id: '哀悼与继续',
        sub: '不允许你停下来哀悼，但创伤一直在等你有空的时候。',
        mainColor: 'text-stone-300',
        subColor: 'border-stone-800',
        prompt: '[MOTIF: GRIEF_AND_CONTINUATION] DIRECTIVE: Loss events must not immediately resolve emotionally. Characters process grief in delayed, displaced ways — through work, through numbness, through misdirected anger. ALWAYS honor the lost through environmental echo rather than ceremony. FORBIDDEN: Clean grief resolution or cathartic closure. Grief here persists as a character of its own, alongside the living.'
    },

    // ── 권력과 조작 (Power & Manipulation) ─────────────────────────────────

    {
        id: '权力的腐蚀',
        sub: '它从未腐蚀别人，只腐蚀你。而且它总是慢慢来。',
        mainColor: 'text-stone-300',
        subColor: 'border-stone-800',
        prompt: '[MOTIF: POWER_CORRUPTION] DIRECTIVE: Escalating capability must come with visible behavioral drift in the player-character — dialogue options narrow toward the callous, NPC reactions register discomfort. Map power acquisition to specific moral compromises made to obtain it. ALWAYS let NPCs from the early game appear to check what has become of the player-character. FORBIDDEN: Power without corresponding moral cost. Every significant gain must be paid for in a value that was previously held.'
    },
    {
        id: '系统的共谋',
        sub: '没有怪物，只有规则。规则是怪物。',
        mainColor: 'text-stone-300',
        subColor: 'border-stone-800',
        prompt: '[MOTIF: SYSTEMIC_EVIL] DIRECTIVE: Frame horror as structural rather than individual — no single villain, only interlocking incentives that produce atrocity. Individual actors within the system must be comprehensible, even sympathetic, while the system they participate in is clearly monstrous. ALWAYS show the system functioning "correctly" while producing horror as output. FORBIDDEN: Identifiable evil individuals as primary culprits. The enemy is the org chart, not the person holding it.'
    },
    {
        id: '信任的代价',
        sub: '你依赖的人，也是你最脆弱的时候。这不是阴谋，这只是规律。',
        mainColor: 'text-stone-300',
        subColor: 'border-stone-800',
        prompt: '[MOTIF: COST_OF_TRUST] DIRECTIVE: Vulnerability created through bonding must produce proportional exposure to harm. NPCs who are trusted must eventually demonstrate that trust as a liability — not through betrayal, but through the player\'s protective instinct becoming a mechanical weakness. ALWAYS distinguish between betrayal (active) and consequence (passive). FORBIDDEN: Trust as unambiguously safe. Attachment here is a structural risk.'
    }
];

/**
 * @主轴
 * 职责：玩法 / 行动导向 — 节点的玩法压力与玩家行为驱动
 * 判断标准：能写进游戏设计文档的机制描述
 * 禁止：描述哲学主旨、情感内核、世界观设定、或感官美学
 */
export const AXIS_PRESETS: NarrativeMainAxis[] = [

    // ── 战术行动 (Tactical Action) ───────────────────────────────────────────

    {
        id: '猎杀与反制',
        sub: '在狩猎者与猎物之间切换立场。主动权随信息与资源消长而流转。',
        mainColor: 'text-rose-500',
        subColor: 'border-rose-950',
        prompt: '[AXIS: HUNT_AND_COUNTER] DYNAMIC: Power asymmetry between tracker and tracked is the central mechanical tension. FOCUS: Information as weapon — player must gather tracking data while concealing their own trace. Node design must reflect power differential: nodes where player is apex, nodes where player is prey, transitions that shift role unexpectedly. MANDATE: Every node must clarify whether the player is currently hunting or being hunted — ambiguity should be brief and resolved through discoverable evidence.'
    },
    {
        id: '逃亡隐匿',
        sub: '不要出声，压低呼吸。它就在门外，而你的藏身处不会永远保持完整。',
        mainColor: 'text-orange-500',
        subColor: 'border-orange-950',
        prompt: '[AXIS: EVASION_AND_HIDING] DYNAMIC: Stealth survival under persistent pursuit. FOCUS: Auditory and positional proximity of pursuers as primary tension source. Hiding spots must be fragile — discovered, compromised, or time-limited. Node design emphasizes near-miss tension, improvised concealment, and route planning under incomplete information. MANDATE: Player must never feel fully safe. Each "safe" node must have an established reason it might not remain so.'
    },
    {
        id: '资源搜刮',
        sub: '在废墟中翻找一切能让你活过今天的碎片。每次搜查都是一次赌注。',
        mainColor: 'text-amber-500',
        subColor: 'border-amber-950',
        prompt: '[AXIS: SCAVENGING] DYNAMIC: Resource desperation as primary motivation. FOCUS: Mundane item utility — the difference between finding one battery and two. Node design must surface the history of prior inhabitants through their leftover material choices. High-risk, high-yield salvage opportunities must be legible from a distance. MANDATE: Resource scarcity should feel diegetically explained — not arbitrary, but the result of prior activity that can be reconstructed from evidence.'
    },
    {
        id: '护送回收',
        sub: '哪怕只剩你一个人，也要把它送到目的地。这个重量不允许你停下来。',
        mainColor: 'text-red-500',
        subColor: 'border-red-950',
        prompt: '[AXIS: ESCORT_AND_RETRIEVAL] DYNAMIC: Burdened progression — a fragile entity or critical item creates asymmetric vulnerability. FOCUS: All threats are magnetically drawn to the escorted subject. Node design must force trade-offs between speed (exposure) and caution (resource cost). MANDATE: The escorted entity/item must have narrative weight beyond its mechanical function — its loss must feel like a story failure, not just a stat penalty.'
    },
    {
        id: '阵地坚守',
        sub: '守住这扇门，直到黎明或死亡降临。资源在倒计时，结构在让步。',
        mainColor: 'text-orange-600',
        subColor: 'border-orange-950',
        prompt: '[AXIS: DEFENSIVE_STAND] DYNAMIC: Static siege — static position under increasing assault. FOCUS: Dwindling defensive resources (ammunition, barricade integrity, Stamina) as primary tension clock. Node design emphasizes structural failure as narrative progression — each wave degrades the defensive position. MANDATE: The hold-point must feel worth defending. Establish what is being protected and why before the siege begins.'
    },
    {
        id: '斩首行动',
        sub: '切断毒蛇的头，剩余的躯干自会崩溃。目标确认，误伤代价高昂。',
        mainColor: 'text-red-500',
        subColor: 'border-red-900',
        prompt: '[AXIS: DECAPITATION_STRIKE] DYNAMIC: Surgical precision against a high-value target surrounded by lower-priority threats. FOCUS: Intelligence gathering as prerequisite — player cannot safely engage without prior reconnaissance. Node design emphasizes bypassing versus eliminating guards, each choice carrying distinct risk profiles. MANDATE: The target must have enough established characterization that eliminating them carries weight beyond the mechanical payoff.'
    },
    {
        id: '突破封锁',
        sub: '唯一的出路在前方，所有迂回都已关闭。这是速度与代价的计算。',
        mainColor: 'text-red-600',
        subColor: 'border-red-950',
        prompt: '[AXIS: BREAKTHROUGH] DYNAMIC: Forward-only momentum against organized opposition. FOCUS: Quarantine lines, reinforced choke-points, escalating commitment cost with each advance. No retreat mechanics. Node design must make the cost of breakthrough visible in advance — players choose what to spend, not whether to spend. MANDATE: Every node breakthrough must alter the subsequent threat landscape. Progress must be legible as consequence.'
    },
    {
        id: '消耗战',
        sub: '你没有足够多的子弹杀死所有人，但你有足够多的时间熬死他们。',
        mainColor: 'text-rose-700',
        subColor: 'border-rose-950',
        prompt: '[AXIS: ATTRITION] DYNAMIC: Mutual resource drain across extended engagement. FOCUS: Neither side can achieve rapid decisive victory — sustainability is the competitive axis. Node design must track enemy resource state (patrol density, reinforcement capacity) alongside player resources. MANDATE: Tempo matters more than individual encounters. A poor early decision should echo in reduced late-game options. Efficiency over aggression.'
    },
    {
        id: '复仇路线',
        sub: '以眼还眼，直到世界盲目为止。每一个目标背后都有下一个目标。',
        mainColor: 'text-rose-600',
        subColor: 'border-rose-950',
        prompt: '[AXIS: VENGEANCE] DYNAMIC: Targeted retribution — a known list of specific targets drives node progression. FOCUS: Each eliminated target reveals the next link in the chain. Methodical escalation: earlier targets are accessible, later targets are fortified by prior eliminations. MANDATE: The player\'s cost must rise with each step — vengeance is never clean or cheap. Establish what was lost that motivates this before the first step is taken.'
    },

    // ── 수집과 조사 (Investigation & Collection) ────────────────────────────

    {
        id: '线索重建',
        sub: '在碎片中还原出完整的事件序列。每一条错误的推理都要付出时间代价。',
        mainColor: 'text-sky-400',
        subColor: 'border-sky-900',
        prompt: '[AXIS: RECONSTRUCT_EVIDENCE] DYNAMIC: Investigation — assembling a coherent event-sequence from fragmentary physical and testimonial evidence. FOCUS: Each clue is a node resource: locating it costs time, interpreting it costs Sanity, cross-referencing it creates new investigative leads. Node design must embed evidence in plausible spatial context. MANDATE: False leads must be mechanically present and not obviously marked. Wrong conclusions must be reachable, and reaching them must cost something.'
    },
    {
        id: '收容锁闭',
        sub: '把无法理解的现象关进盒子里。理解它不是目标，控制它才是。',
        mainColor: 'text-indigo-400',
        subColor: 'border-indigo-900',
        prompt: '[AXIS: CONTAINMENT] DYNAMIC: Hazard control — identify, isolate, and survive exposure to an anomalous phenomenon without requiring full comprehension of it. FOCUS: Containment protocols as gameplay loop — establishing perimeter, sealing vectors, documenting behavior without understanding causation. MANDATE: The contained phenomenon must resist comprehension as a design principle. Players who attempt to fully understand it should be punished. Control without knowledge is the appropriate goal.'
    },
    {
        id: '信标重启',
        sub: '让死去的机器再次亮起希望之光。不确定重启后什么会随之而来。',
        mainColor: 'text-cyan-400',
        subColor: 'border-cyan-900',
        prompt: '[AXIS: REACTIVATE_BEACON] DYNAMIC: Restoration — scaling and reactivating ancient or dormant infrastructure with uncertain systemic consequences. FOCUS: Puzzle-adjacent resource routing — rerouting power, clearing physical blockages, operating unfamiliar machinery. Each reactivation must have visible downstream effects. MANDATE: Completion must be ambiguous in valence. The beacon working must immediately introduce a new and unresolved question about what it has alerted, enabled, or summoned.'
    },
    {
        id: '绘制未知',
        sub: '填补地图上的空白区域。知识本身是你最紧缺的资源。',
        mainColor: 'text-teal-400',
        subColor: 'border-teal-900',
        prompt: '[AXIS: CARTOGRAPHY] DYNAMIC: Knowledge expansion through systematic spatial exploration. FOCUS: Incomplete map as primary tension — players must decide how much uncertainty to tolerate before moving. Discovery of new geometry (unexpected passage, sealed zone, false wall) carries both opportunity and threat. MANDATE: Mapping must have mechanical stakes. Unexplored areas must remain genuinely dangerous, not merely unknown. Information gained through exploration must shift tactical calculus.'
    },
    {
        id: '谈判斡旋',
        sub: '你没有足够的子弹，但你有足够的信息。先开口说话的人，通常不是死的那个。',
        mainColor: 'text-emerald-400',
        subColor: 'border-emerald-900',
        prompt: '[AXIS: NEGOTIATION] DYNAMIC: Social leverage as primary resource. FOCUS: Information asymmetry as tactical advantage — what you know that others don\'t, what they believe you know, and what you can credibly threaten. Node design must establish each NPC\'s leverage points (needs, fears, loyalties) as discoverable data. MANDATE: Violence must always be a present option but usually an inferior one. Social failure must have real mechanical consequences, not merely aesthetic ones.'
    },
    {
        id: '拼图解构',
        sub: '谜题的答案已经在你眼前了，只是你还没有以正确的方式看它。',
        mainColor: 'text-violet-400',
        subColor: 'border-violet-900',
        prompt: '[AXIS: DECONSTRUCT_PUZZLE] DYNAMIC: Intellectual lock-and-key progression — environmental or logical puzzles gate narrative advancement. FOCUS: Clues must be spatially embedded and require synthesis across multiple nodes to resolve. Each solved puzzle must open narrative territory, not merely mechanical passage. MANDATE: Solutions must feel discoverable through environmental logic, not arbitrary. Failure states must provide partial information rather than simply resetting.'
    },
    {
        id: '档案溯源',
        sub: '它曾经发生过，而且有记录在案。找到记录，然后找到为什么记录是不完整的。',
        mainColor: 'text-amber-300',
        subColor: 'border-amber-800',
        prompt: '[AXIS: ARCHIVE_RETRIEVAL] DYNAMIC: Bureaucratic archaeology — navigating institutional records to reconstruct a suppressed or fragmented history. FOCUS: Document hierarchy as spatial metaphor — surface files are accessible, sensitive files are relocated, classified files are deliberately corrupted. Node design must reflect organizational logic of the institution that generated the records. MANDATE: The most important document must be the hardest to access, and accessing it must cost more than its informational content seems to warrant.'
    },

    // ── 생존과 관리 (Survival & Management) ─────────────────────────────────

    {
        id: '供应线维持',
        sub: '食物、水、药品。每一天的存活都需要主动维护。不管理，就衰减。',
        mainColor: 'text-green-500',
        subColor: 'border-green-900',
        prompt: '[AXIS: SUPPLY_MAINTENANCE] DYNAMIC: Logistics management as primary tension — survival resources deplete continuously and must be actively replenished through risk-bearing actions. FOCUS: Supply chain as spatial structure — sources, transit routes, storage, and consumption rates. Node design must make resource flows legible as a system. MANDATE: Scarcity must be diegetically grounded (why is X scarce here and now?) rather than imposed by arbitrary game rule. Players should be able to predict shortage before it becomes critical.'
    },
    {
        id: '营地构建',
        sub: '在废墟中建立一个足以支撑下一步行动的立足点。没有立足点，就没有下一步。',
        mainColor: 'text-lime-500',
        subColor: 'border-lime-900',
        prompt: '[AXIS: BASE_BUILDING] DYNAMIC: Fortification and resource investment into a persistent base that extends operational capability. FOCUS: Prioritization under material constraint — every structure built trades against another deferred. Base vulnerability as mechanical pressure — what was built can be attacked, degraded, or infiltrated. MANDATE: Base decisions must have long-term narrative consequence. A fortification choice made early must shape available options late.'
    },
    {
        id: '医疗分流',
        sub: '资源不够救所有人。你必须决定谁先，谁后，以及谁不在计划内。',
        mainColor: 'text-red-400',
        subColor: 'border-red-900',
        prompt: '[AXIS: MEDICAL_TRIAGE] DYNAMIC: Constrained resource allocation under time pressure across multiple competing injury/need states. FOCUS: Each patient/companion has a survival window, a resource requirement, and a downstream value — all must be weighed simultaneously. Node design must make the math visible without making the choice feel mechanical. MANDATE: At least one triage decision per zone must have no correct answer — only trade-offs with different acceptable failure modes.'
    },
    {
        id: '感染管控',
        sub: '你不知道谁已经被感染了。你知道的是，等你确定的时候，往往已经太晚。',
        mainColor: 'text-yellow-600',
        subColor: 'border-yellow-900',
        prompt: '[AXIS: INFECTION_CONTROL] DYNAMIC: Hidden information crisis — unknown infection status among companions/NPCs creates permanent low-level paranoia. FOCUS: Behavioral tell-detection as investigative gameplay — identifying pre-symptomatic deviations in companion behavior. Quarantine decisions carry cost whether the subject is infected or not. MANDATE: At least one false positive must occur per zone — an uninfected character who presents suspicious behavior. Wrongful isolation must have meaningful consequences.'
    },
    {
        id: '时间窗口',
        sub: '窗口正在关闭。在它完全合上之前，你必须完成足够多的事情。',
        mainColor: 'text-yellow-500',
        subColor: 'border-yellow-950',
        prompt: '[AXIS: TIME_WINDOW] DYNAMIC: Hard time constraint on achieving a specific objective state before an irreversible event occurs. FOCUS: Prioritization under countdown — every node visit is a deliberate trade of time against objective progress. Node design must make time cost explicit (how many cycles does this take?) and resource cost legible in temporal terms. MANDATE: The window must be tight enough to require trade-offs but not so tight as to feel arbitrary. Players who plan efficiently should reach the window with minimal buffer — not easy margin.'
    },

    // ── 사회와 정치 (Social & Political) ────────────────────────────────────

    {
        id: '派系斡旋',
        sub: '他们彼此憎恨，但都需要你。小心不要成为任何人的工具。',
        mainColor: 'text-purple-400',
        subColor: 'border-purple-900',
        prompt: '[AXIS: FACTION_MEDIATION] DYNAMIC: Multi-party political navigation — player must maintain productive relationships with mutually hostile factions simultaneously. FOCUS: Each faction has legible needs, values, and red lines. Player actions toward one faction affect standing with others in trackable ways. Node design must create scenarios where satisfying one faction structurally compromises another. MANDATE: A fully neutral path must be theoretically possible but mechanically costly. The player should feel the pressure of irreconcilable interests, not a clean alliance menu.'
    },
    {
        id: '叛逃与招募',
        sub: '把对方的人拉过来，或者把自己的人送过去。每一次转化都改变了力量对比。',
        mainColor: 'text-fuchsia-400',
        subColor: 'border-fuchsia-900',
        prompt: '[AXIS: DEFECTION_AND_RECRUITMENT] DYNAMIC: Asymmetric personnel movement between opposed groups as primary strategic lever. FOCUS: Each potential recruit has a breaking point — a combination of push and pull factors that can be identified and exploited. Successful recruitment must alter subsequent encounter balance. MANDATE: Recruitment must require investment that could alternatively be spent on other objectives. Every converted NPC must remain a potential liability if the conversion was imperfect.'
    },
    {
        id: '秘密传递',
        sub: '信息本身就是武器。但携带武器的人，是任何一方都不会放过的目标。',
        mainColor: 'text-teal-300',
        subColor: 'border-teal-800',
        prompt: '[AXIS: COURIER_NETWORK] DYNAMIC: Information as physical contraband — player must move sensitive data from origin to recipient while evading interception by parties who benefit from suppression. FOCUS: Route selection under surveillance, dead drops, counter-surveillance. The information itself has a shelf life — delayed delivery changes its value. MANDATE: The content of what is being couriered must matter narratively. Players who read it should understand why it is worth killing over.'
    }
];