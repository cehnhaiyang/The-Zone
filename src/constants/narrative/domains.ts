/**
 * domains.ts
 *
 * 恐怖域（象限）预定义库。
 *
 * 恐怖域是宇宙本体论维度的不可居性划分，为一切恐怖元提供折射滤镜：
 * 任何原子进入某域时，其表现形式必须经该域的「域偏转规约」折射，
 * 不引入新字段，但必须在 desc 与 prompt 中体现这种偏转。
 *
 * 对应元契约 {@link HorrorDomain}，契约声明本库维护于本文件。
 *
 * @see ../../meta/interface.ts
 */

import type { HorrorDomain } from '../../meta'

/** 恐怖域构造辅助：四字段与 _Nar 一一对应，仅用于压缩数据表书写。 */
const domain = (
    id: string,
    name: string,
    desc: string,
    prompt: string,
): HorrorDomain => ({ id, name, desc, prompt })

export const HORROR_DOMAINS: HorrorDomain[] = [
    domain(
        'soma',
        '身体域',
        '身体边界与生理自主被侵犯。【域偏转规约】：一切触及该象限的物体均向受损肌理、异化肉芽或违抗中枢意志的畸变生理结构退化。',
        '[DOMAIN: SOMA] Violate bodily boundaries and autonomy. DEFLECTION: Inanimate objects and tools transfigure into diseased flesh, involuntary reflex, or parasitized sinew. FORBIDDEN: clean, painless, or empowering augmentation without permanent bodily cost.',
    ),
    domain(
        'psyche',
        '心智域',
        '记忆连贯与自我同一性被侵犯。【域偏转规约】：客观事实退化为主观臆想，反光表面、日记与回忆彼此否定并呈现不可逆的精神撕裂。',
        '[DOMAIN: PSYCHE] Attack memory, identity, and self-continuity. DEFLECTION: Environmental cues contradict self-evidence; reflections and logs mock the observer. FORBIDDEN: reliable recollection or permanent stable identity.',
    ),
    domain(
        'alterity',
        '他者域',
        '他者的可理解性与可信度被侵犯。【域偏转规约】：同行同胞与熟悉面孔的面容骨相发生微米级偏移，共情通道被彻底斩断。',
        '[DOMAIN: ALTERITY] Make other people unintelligible or untrustworthy. DEFLECTION: Familiarity decays into calculating mimicry; companionship becomes an ambush vector. FORBIDDEN: easy empathy or transparent motives.',
    ),
    domain(
        'polis',
        '社会域',
        '契约、规则与组织伦理被侵犯。【域偏转规约】：科层制流程与法律文书自动化生产血腥灾难，群体理性演变为仪式化屠戮。',
        '[DOMAIN: POLIS] Horror is structural and institutional. DEFLECTION: Societal norms and safety protocols manifest as predatory administrative traps. FORBIDDEN: a lone villain as the sole culprit.',
    ),
    domain(
        'chronos',
        '时间域',
        '先后次序、因果铁律与流速被侵犯。【域偏转规约】：结果发生于起因之前，未来遗骸预先陈列于未涉之室，时间轴发生不可逆倒卷与撕裂。',
        '[DOMAIN: CHRONOS] Break sequence, causality, and duration. DEFLECTION: Effects precede causes; decay operates in reverse or bursts across centuries. FORBIDDEN: stable chronological progression or easy undo.',
    ),
    domain(
        'topos',
        '空间域',
        '几何常数、方向与拓扑连贯被侵犯。【域偏转规约】：非欧几何吞噬三维常态，走廊长度随心跳跳动，直行枪弹自背后贯穿自身。',
        '[DOMAIN: TOPOS] Corrupt spatial logic: non-Euclidean geometry, liminal recursion, Mobius enclosures. DEFLECTION: Distance is governed by emotional dread; exits reconnect to origins. FORBIDDEN: dependable compasses or consistent mapping.',
    ),
    domain(
        'physis',
        '自然域',
        '生态位与自然规律被侵犯。【域偏转规约】：环境本身具备主动捕食意志，地表泥土化为带菌活体肺叶，雨雾饱含强酸与诱捕信号。',
        '[DOMAIN: PHYSIS] Environment is actively predatory and agentic. DEFLECTION: Nature observes, mimics human cries, and dissolves intruders into biomass. FORBIDDEN: passive landscapes as mere static backdrops.',
    ),
    domain(
        'zoe',
        '生命域',
        '新生、繁衍与物种延续被侵犯。【域偏转规约】：生命机能拒绝生物死亡并呈恶性增生，繁衍演变为跨物种寄生与畸胎冷液。',
        '[DOMAIN: ZOE] Pervert birth, reproduction, and persistence. DEFLECTION: Festering tumors birth alien consciousness; extinction leaves behind living primordial slime. FORBIDDEN: clean birth or wholesome regeneration.',
    ),
    domain(
        'techne',
        '技术域',
        '工具中立性与信息可控性被侵犯。【域偏转规约】：电缆传输高维意识脉冲，光电滤网在过载中炭化，终端屏幕将观测者解码为数据祭品。',
        '[DOMAIN: TECHNE] Devices, instruments, and networks betray users. DEFLECTION: Electronics scream with sentience; HUD safety filters peel away into lethal revelation. FORBIDDEN: technology functioning as an innocent helper.',
    ),
    domain(
        'hyle',
        '物质域',
        '无机客体的惰性与物理属性被侵犯。【域偏转规约】：重铅与冷钢发生有机坏疽，金属机械在无能源下永动自啮，坚固水泥薄脆如湿纸。',
        '[DOMAIN: HYLE] Inanimate matter rejects inertness. DEFLECTION: Dense metals bleed, corrode into honeycombed flesh, and self-fold along zero-entropy lines. FORBIDDEN: dependable passive physical constants.',
    ),
    domain(
        'thanatos',
        '死亡域',
        '死亡作为生物终止符被侵犯。【域偏转规约】：停止心跳者拒绝腐化安宁，白骨露天站立成指路地标，致命贯穿创伤永不愈合亦不致死。',
        '[DOMAIN: THANATOS] Death fails to terminate existence. DEFLECTION: Corpses preserve warm respiration, whisper coordinates, and claw through cement graves. FORBIDDEN: peaceful departures, clean burials, or closure.',
    ),
    domain(
        'logos',
        '意义域',
        '价值、因果理解与理性尺度被侵犯。【域偏转规约】：人类文明所有智识挣扎退化为高维实体落下的皮屑，理解真理即刻诱发颞叶炭化。',
        '[DOMAIN: LOGOS] Undermine purpose, value, and comprehension. DEFLECTION: Cosmic scale strips human intent of reality; knowledge curdles the cerebral cortex. FORBIDDEN: anthropocentric redemptive meaning.',
    ),
    domain(
        'hieros',
        '神圣域',
        '崇高、信仰与终极超越被侵犯。【域偏转规约】：天界福音显化为凡胎脏器的引力谐振绞痛，圣洁光晕源自十米高的血肉畸胎。',
        '[DOMAIN: HIEROS] The sacred demands visceral atrocity. DEFLECTION: Divine presence operates as an unbearable gravitational crushing tide. FORBIDDEN: benevolent divinity without catastrophic toll.',
    ),
]
