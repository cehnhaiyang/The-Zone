/**
 * 公共战术池：防御战术
 *
 * 设计基准：
 * - 严格遵循 DefenseTactic 三元组：[Target, DefenseTacticEffectType, number]
 * - 不引入持续回合字段，避免越界使用 AttackTactic 四元组结构
 * - 1 AP：轻度自身稳定、基础属性/体征微调
 * - 2 AP：中度自身强化、代价交换、单体掩护、单体敌方干扰
 * - 3 AP：群体防御、群体稳定、阵地控制、广域干扰
 *
 * @version 2.1.1
 */

import type { Tactic, TacticEffectType, Target } from '../../meta'

/**
 * 防御战术构造器
 * 仅用于减少重复字段，最终导出仍为纯数据对象数组。
 *
 * 契约的 tacticEffect 恒为四元组，而防御战术不引入持续回合语义，
 * 故第四位统一补 0（仅本次结算中生效）。
 */
const def = (
    id: string,
    name: string,
    desc: string,
    apCost: number,
    tacticEffect: Array<[Target, TacticEffectType, number]>,
): Tactic => ({
    type: 'D',
    id: `public_def_${id}`,
    name,
    desc,
    apCost,
    tacticEffect: tacticEffect.map(
        ([target, effect, value]): [Target, TacticEffectType, number, number] => [
            target,
            effect,
            value,
            0,
        ],
    ),
})

export const publicDefenseTactics: Tactic[] = [
    // --------------------------------------------------------------------------
    // 1 AP：基础自身防御、动态体征微调与轻度代价
    // --------------------------------------------------------------------------
    def(
        'flesh_anchor',
        '肉体锚定',
        '锁死关节与肌肉群，以纯粹肉体力量硬抗冲击，维持架势稳定。',
        1,
        [['self', 'strength', 2]],
    ),
    def(
        'axis_evasion',
        '轴线偏离',
        '主动错开受击轴线，以敏捷调整身位，降低被直接命中的概率。',
        1,
        [['self', 'agility', 2]],
    ),
    def(
        'threat_anticipation',
        '威胁预判',
        '观察敌方起手动作与攻击轨迹，以感知提前判断危险来源。',
        1,
        [['self', 'awareness', 2]],
    ),
    def(
        'structural_deconstruct',
        '结构解构',
        '快速识别攻击结构与能量规律，以智慧寻找更安全的防御路径。',
        1,
        [['self', 'wisdom', 2]],
    ),
    def(
        'spiritual_tuning',
        '灵力调谐',
        '短暂收敛灵力输出，扩大对自身行动结果的预判范围，并提升 magic 武器协同稳定性。',
        1,
        [['self', 'will', 2]],
    ),
    def(
        'sensory_downgrade',
        '感官降级',
        '主动降低神经链接仪的视觉保真度以过滤认知危害，稳定理智，但会削弱环境感知。',
        1,
        [
            ['self', 'sanity', 3],
            ['self', 'awareness', -1],
        ],
    ),
    def(
        'adrenaline_pacing',
        '肾上腺素控制',
        '微调内分泌与呼吸节奏，延缓疲劳积累，维持持续行动能力。',
        1,
        [['self', 'stamina', 2]],
    ),
    def(
        'neural_cooldown',
        '神经冷却',
        '降低神经链接仪的翻译负荷与感官噪声，恢复精力。',
        1,
        [['self', 'vigor', 2]],
    ),
    def(
        'coagulant_injection',
        '凝血剂注射',
        '注射便携式凝血剂与镇痛泵，在战斗间隙强行维持生命体征。',
        1,
        [['self', 'hp', 3]],
    ),
    def(
        'deflector_overload',
        '偏导场过载',
        '超载便携式偏导护盾，在下一轮冲击前形成短暂缓冲层，但会加剧神经负荷。',
        1,
        [
            ['self', 'shield', 5],
            ['self', 'vigor', -1],
        ],
    ),

    // --------------------------------------------------------------------------
    // 2 AP：自身深度强化、代价交换、单体协防与敌方干扰
    // --------------------------------------------------------------------------
    def(
        'skeletal_lock',
        '骨骼锁死',
        '通过外骨骼或肌肉痉挛锁死关节，短时间大幅提升正面承受能力，但丧失机动性。',
        2,
        [
            ['self', 'strength', 4],
            ['self', 'agility', -2],
        ],
    ),
    def(
        'reality_anchor',
        '现实锚点注入',
        '注射高浓度镇静剂并强制回放安全记忆，强行稳定理智，但会导致肉体迟钝。',
        2,
        [
            ['self', 'sanity', 5],
            ['self', 'stamina', -2],
        ],
    ),
    def(
        'lactate_override',
        '乳酸阈值突破',
        '通过神经刺激无视肌肉撕裂警告，延缓体力耗尽，代价是轻微组织损伤。',
        2,
        [
            ['self', 'stamina', 4],
            ['self', 'hp', -1],
        ],
    ),
    def(
        'brainwave_sync',
        '脑波强制同步',
        '将大脑频率与神经链接仪底层协议强制同步，降低精力衰竭，但会引入轻微认知噪点。',
        2,
        [
            ['self', 'vigor', 4],
            ['self', 'sanity', -1],
        ],
    ),
    def(
        'tactical_reset',
        '战术重置',
        '短暂脱离敌方压力，重新调整身位与观察角度，恢复防御节奏。',
        2,
        [
            ['self', 'agility', 2],
            ['self', 'awareness', 2],
        ],
    ),
    def(
        'kinetic_deflection',
        '动能偏转',
        '以武器或护甲边缘偏转攻击轴线，用敏捷与力量共同维持反击空间。',
        2,
        [
            ['self', 'agility', 3],
            ['self', 'strength', 2],
        ],
    ),
    def(
        'environmental_mimicry',
        '环境拟态',
        '根据攻击模式快速调整掩蔽角度与身体姿态，融入环境死角。',
        2,
        [
            ['self', 'wisdom', 3],
            ['self', 'agility', 2],
        ],
    ),
    def(
        'counter_stance',
        '反击架势',
        '维持防御的同时预留反击线路，以力量稳固架势并以感知捕捉破绽。',
        2,
        [
            ['self', 'strength', 3],
            ['self', 'awareness', 2],
        ],
    ),
    def(
        'field_triage',
        '战地分诊',
        '优先处理最危险的伤势，并调整身体负荷以维持行动能力。',
        2,
        [
            ['self', 'hp', 4],
            ['self', 'stamina', -2],
        ],
    ),
    def(
        'abyssal_resonance',
        '深渊共鸣',
        '主动接纳微量深渊辐射以扩大灵力预判范围，极具风险，会侵蚀理智。',
        2,
        [
            ['self', 'will', 4],
            ['self', 'sanity', -2],
        ],
    ),
    def(
        'cognitive_barrier',
        '认知屏障',
        '提高神经链接仪过滤强度，在认知危害冲击前形成心理缓冲层，极度消耗精力。',
        2,
        [
            ['self', 'shield', 8],
            ['self', 'vigor', -2],
        ],
    ),
    def(
        'reflective_carapace',
        '反射甲壳',
        '将护甲、力场与身体姿态调整为冲击反射构型，获得较厚的临时护盾，但变得笨重。',
        2,
        [
            ['self', 'shield', 10],
            ['self', 'agility', -2],
        ],
    ),
    def(
        'cover_displacement',
        '掩护位移',
        '为单个同伴提供掩护，使其借助你的位置进行安全位移或规避。',
        2,
        [
            ['single_teammate', 'agility', 3],
            ['self', 'awareness', 1],
        ],
    ),
    def(
        'flesh_bulwark',
        '血肉壁垒',
        '主动挡在单个同伴前方，用肉体与护甲吸收冲击，为其形成临时屏障。',
        2,
        [
            ['single_teammate', 'shield', 6],
            ['self', 'hp', -2],
        ],
    ),
    def(
        'mental_anchoring',
        '心智锚定',
        '用稳定的语言与神经链接信号锚定同伴的现实感，恢复其理智，但会分担认知负荷。',
        2,
        [
            ['single_teammate', 'sanity', 4],
            ['self', 'vigor', -2],
        ],
    ),
    def(
        'fallback_line',
        '后撤防线',
        '以自身为支点掩护同伴后撤，重新拉开安全距离并整理阵型。',
        2,
        [
            ['self', 'agility', 2],
            ['single_teammate', 'agility', 2],
        ],
    ),
    def(
        'covered_medevac',
        '掩护急救',
        '为单个同伴提供掩护急救，专注治疗导致自身对外界警戒大幅下降。',
        2,
        [
            ['single_teammate', 'hp', 5],
            ['self', 'awareness', -2],
        ],
    ),
    def(
        'shield_transfer',
        '护盾转移',
        '将自身护盾发生器或偏导场短暂聚焦到一名友方身上，为其承担下一轮冲击。',
        2,
        [
            ['single_ally', 'shield', 10],
            ['self', 'vigor', -2],
        ],
    ),
    def(
        'overwatch',
        '警戒守望',
        '保持防御姿态并监视敌方动作，一旦敌方试图突进，立即进行火力或视线干扰。',
        2,
        [
            ['self', 'awareness', 3],
            ['single_enemy', 'agility', -2],
        ],
    ),
    def(
        'neural_jamming',
        '神经干扰',
        '向敌方感知通道注入噪声协议，扰乱其对灵力波动与攻击轨迹的判读。',
        2,
        [
            ['single_enemy', 'will', -3],
            ['self', 'wisdom', 1],
        ],
    ),

    // --------------------------------------------------------------------------
    // 3 AP：群体防御、群体稳定、阵地控制与高阶干扰
    // --------------------------------------------------------------------------
    def(
        'shield_line_synergy',
        '盾线协同',
        '组织所有同伴形成连续防线，以力量共同承受正面冲击。',
        3,
        [['all_teammates', 'strength', 3]],
    ),
    def(
        'collective_cover',
        '集体掩护',
        '以智慧规划掩体、射击死角与轮换顺序，提升所有同伴的整体防御效率。',
        3,
        [['all_teammates', 'wisdom', 3]],
    ),
    def(
        'endurance_formation',
        '耐力队形',
        '调整队形与负重分配，降低所有同伴的体力消耗压力。',
        3,
        [['all_teammates', 'stamina', 3]],
    ),
    def(
        'field_medic_protocol',
        '战地救护协议',
        '启动分队级急救分流，优先稳定所有同伴的生命体征，极大消耗自身精力。',
        3,
        [
            ['all_teammates', 'hp', 4],
            ['self', 'vigor', -3],
        ],
    ),
    def(
        'sentinel_network',
        '警戒网络',
        '将观察任务分配给所有友方，形成互相补位的预警网络。',
        3,
        [['all_allies', 'awareness', 3]],
    ),
    def(
        'sanctuary_protocol',
        '庇护所协议',
        '广播庇护所级安定协议，借助神经链接仪同步所有友方的认知节律，自身承受反噬。',
        3,
        [
            ['all_allies', 'sanity', 4],
            ['self', 'sanity', -2],
        ],
    ),
    def(
        'aegis_field',
        '庇护力场',
        '展开广域偏导场，为所有友方覆盖一层短暂的冲击缓冲护盾，导致自身神经过载。',
        3,
        [
            ['all_allies', 'shield', 6],
            ['self', 'vigor', -3],
        ],
    ),
    def(
        'arcane_network',
        '灵能网络',
        '共享灵力校准参数，扩大所有友方对 magic 武器的协同与行动结果预判范围。',
        3,
        [
            ['all_allies', 'will', 2],
            ['all_allies', 'awareness', 2],
        ],
    ),
    def(
        'rallying_presence',
        '鼓舞存在',
        '以稳定指令与战场存在感维持队伍士气，同时缓解体力与理智压力。',
        3,
        [
            ['all_allies', 'stamina', 2],
            ['all_allies', 'sanity', 2],
        ],
    ),
    def(
        'suppressive_field',
        '压制领域',
        '以交叉火力与观测网覆盖敌方阵地，压低其命中判断，同时提升友方预警。',
        3,
        [
            ['all_enemies', 'awareness', -2],
            ['all_allies', 'awareness', 2],
        ],
    ),
    def(
        'counter_pressure',
        '反压防线',
        '将防御姿态转化为持续反压，削弱敌方力量输出并强化友方正面承受力。',
        3,
        [
            ['all_enemies', 'strength', -2],
            ['all_allies', 'strength', 2],
        ],
    ),
    def(
        'temporal_disruption',
        '时序扰乱',
        '利用区域时间异常或神经干扰弹打乱敌方动作节奏，使友方获得相对机动优势。',
        3,
        [
            ['all_enemies', 'agility', -2],
            ['all_allies', 'agility', 2],
        ],
    ),
]