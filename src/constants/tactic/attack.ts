/**
 * 公共战术池：攻击战术
 *
 * 设计基准：
 * - 严格遵循 AttackTactic 四元组：[Target, AttackTacticEffectType, number, number]
 * - 第四位为持续回合：0 表示仅本次结算生效；敌方减益通常为 1
 * - 1 AP：轻攻、虚招、轻微干扰
 * - 2 AP：标准武器攻击、单体削弱、精准修正
 * - 3 AP：重击、范围压制、高精度狙击
 * - 4 AP：处决、广域魔法湮灭
 *
 * @version 2.1.1
 */

import type { Tactic } from '../../meta'

/**
 * 攻击战术构造器
 * 仅用于减少重复字段，最终导出仍为纯数据对象数组。
 */
const atk = (
    id: string,
    name: string,
    desc: string,
    apCost: number,
    tacticEffect: NonNullable<Tactic['tacticEffect']>,
    requireWeapon?: NonNullable<Tactic['requireWeapon']>,
): Tactic => ({
    type: 'A',
    id: `public_atk_${id}`,
    name,
    desc,
    apCost,
    tacticEffect,
    ...(requireWeapon ? { requireWeapon } : {}),
})

export const publicAttackTactics: Tactic[] = [
    // --------------------------------------------------------------------------
    // 通用攻击战术
    // --------------------------------------------------------------------------
    atk(
        'quick_strike',
        '快速打击',
        '以最小预兆发动一次迅速攻击，依赖敏捷抢占出手时机。',
        1,
        [['self', 'agility', 1, 0]],
    ),
    atk(
        'feint',
        '虚招牵制',
        '以虚假起手诱导敌方误判，依靠敏捷撕开短暂的命中窗口。',
        1,
        [
            ['self', 'agility', 1, 0],
            ['single_enemy', 'awareness', -1, 1],
        ],
    ),
    atk(
        'weak_point',
        '弱点标记',
        '快速识别敌方结构弱点，为后续攻击提供知识层面的修正依据。',
        1,
        [['self', 'wisdom', 2, 0]],
    ),
    atk(
        'heavy_blow',
        '重击',
        '牺牲部分速度与精度，集中力量发动一次高压迫性的正面攻击。',
        3,
        [['self', 'strength', 3, 0]],
    ),
    atk(
        'disarm_strike',
        '卸力击打',
        '攻击敌方持握、关节或发力结构，削弱其力量输出。',
        2,
        [['single_enemy', 'strength', -2, 1]],
    ),
    atk(
        'aimed_weakpoint',
        '瞄准弱点',
        '短暂瞄准敌方结构弱点，以感知修正攻击路径并压缩其规避空间。',
        2,
        [
            ['self', 'awareness', 2, 0],
            ['single_enemy', 'agility', -1, 1],
        ],
    ),
    atk(
        'flank_assault',
        '侧翼夹击',
        '与单个友方协同发动夹击，以力量牵制敌方并破坏其敏捷防御。',
        2,
        [
            ['single_ally', 'strength', 2, 1],
            ['single_enemy', 'agility', -2, 1],
        ],
    ),
    atk(
        'execution',
        '处决打击',
        '在敌方露出破绽时发动高风险终结攻击，同时依赖力量与感知完成致命一击。',
        4,
        [
            ['self', 'strength', 3, 0],
            ['self', 'awareness', 3, 0],
        ],
    ),

    // --------------------------------------------------------------------------
    // 近战：挥砍 / 双手挥砍
    // --------------------------------------------------------------------------
    atk(
        'wave_slash',
        '弧光斩',
        '以挥动类武器划出弧线斩击，利用力量扩大攻击覆盖范围。',
        2,
        [['self', 'strength', 2, 0]],
        'wave',
    ),
    atk(
        'wave_whirl',
        '旋风斩',
        '以挥动类武器旋斩周身，对所有敌人形成力量压制。',
        3,
        [['all_enemies', 'strength', -2, 1]],
        'wave',
    ),
    atk(
        'both_wave_cleave',
        '巨弧破阵',
        '以双手挥动类武器发动大范围重斩，用力量压制正面，但会拉低自身机动。',
        3,
        [
            ['self', 'strength', 3, 0],
            ['self', 'agility', -1, 0],
        ],
        'both_wave',
    ),

    // --------------------------------------------------------------------------
    // 近战：刺击 / 双手刺击
    // --------------------------------------------------------------------------
    atk(
        'prick_thrust',
        '精准突刺',
        '以刺击类武器攻击敌方缝隙或薄弱点，依赖感知锁定有效命中位置。',
        2,
        [['self', 'awareness', 2, 0]],
        'prick',
    ),
    atk(
        'prick_vital',
        '透甲刺',
        '以刺击类武器精准贯穿要害，依赖感知锁定致命缝隙。',
        3,
        [['self', 'awareness', 3, 0]],
        'prick',
    ),
    atk(
        'both_prick_lunge',
        '双手贯突',
        '以双手刺击类武器发动贯穿突刺，牺牲部分机动换取更高命中与弱点锁定。',
        3,
        [
            ['self', 'awareness', 3, 0],
            ['self', 'agility', -1, 0],
        ],
        'both_prick',
    ),

    // --------------------------------------------------------------------------
    // 远程：弓 / 弩 / 投掷
    // --------------------------------------------------------------------------
    atk(
        'bow_shot',
        '弓矢射击',
        '以弓进行远程射击，依靠感知修正弹道与命中判断。',
        2,
        [['self', 'awareness', 2, 0]],
        'bow',
    ),
    atk(
        'bow_volley',
        '箭雨覆盖',
        '以弓进行覆盖式射击，压制所有敌人的规避与反击判断。',
        3,
        [['all_enemies', 'awareness', -2, 1]],
        'bow',
    ),
    atk(
        'crossbow_pierce',
        '穿甲弩击',
        '以弩发射高穿透弹药，利用感知锁定缝隙并以器械张力破坏防护。',
        3,
        [
            ['self', 'awareness', 2, 0],
            ['self', 'strength', 1, 0],
        ],
        'crossbow',
    ),
    atk(
        'crossbow_snipe',
        '重弩狙击',
        '以弩进行高精度重击，优先破坏敌方防护与要害。',
        4,
        [
            ['self', 'awareness', 3, 0],
            ['single_enemy', 'agility', -1, 1],
        ],
        'crossbow',
    ),
    atk(
        'throw_disrupt',
        '投掷骚扰',
        '投掷小型武器或杂物，以敏捷制造干扰并迫使敌方失去节奏。',
        1,
        [['single_enemy', 'agility', -1, 1]],
        'throw',
    ),
    atk(
        'throw_concuss',
        '震爆投掷',
        '投掷震荡性或干扰性物体，以敏捷制造范围骚扰。',
        2,
        [['single_enemy', 'agility', -2, 1]],
        'throw',
    ),

    // --------------------------------------------------------------------------
    // 枪械：手枪 / 冲锋枪 / 突击步枪 / 霰弹枪 / 短管霰弹枪 / 狙击步枪
    // --------------------------------------------------------------------------
    atk(
        'gun_burst',
        '精确点射',
        '以手枪进行短促点射，依赖感知锁定目标要害。',
        2,
        [['self', 'awareness', 2, 0]],
        'pistol',
    ),
    atk(
        'smg_suppress',
        '冲锋扫射',
        '以冲锋枪近距离连续扫射，压制敌方观察与瞄准能力。',
        3,
        [['all_enemies', 'awareness', -1, 1]],
        'smg',
    ),
    atk(
        'gun_suppress',
        '火力压制',
        '以突击步枪持续射击压制所有敌人，降低其行动意愿与反击效率。',
        3,
        [['all_enemies', 'awareness', -2, 1]],
        'assault_rifle',
    ),
    atk(
        'shotgun_blast',
        '霰弹轰射',
        '在近距离释放霰弹弹幕，以火力覆盖扰乱敌方行动节奏。',
        2,
        [
            ['single_enemy', 'agility', -1, 1],
            ['self', 'awareness', 1, 0],
        ],
        'shotgun',
    ),
    atk(
        'sawed_off_breach',
        '短管破门',
        '以短管霰弹枪贴身轰击，强行撕开敌方架势并制造破绽。',
        2,
        [['single_enemy', 'agility', -2, 1]],
        'sawed_off',
    ),
    atk(
        'gun_deadeye',
        '致命瞄准',
        '以狙击步枪进行致命单发射击，高度依赖感知锁定目标弱点。',
        3,
        [['self', 'awareness', 3, 0]],
        'sniper_rifle',
    ),

    // --------------------------------------------------------------------------
    // 魔法 / 异能
    // --------------------------------------------------------------------------
    atk(
        'magic_bolt',
        '异术冲击',
        '以魔法武器或术式释放单体冲击，依赖灵力稳定能量投射。',
        3,
        [['self', 'will', 3, 0]],
        'magic',
    ),
    atk(
        'magic_siphon',
        '灵能虹吸',
        '以术式抽取敌方精神能量，同时稳定自身灵力投射。',
        2,
        [
            ['single_enemy', 'will', -2, 1],
            ['self', 'will', 1, 1],
        ],
        'magic',
    ),
    atk(
        'magic_cascade',
        '范围湮灭',
        '释放广域魔法波动，对所有敌人造成精神与能量层面的双重压迫。',
        4,
        [['all_enemies', 'will', -3, 1]],
        'magic',
    ),
]