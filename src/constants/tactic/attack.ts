/**
 * 公共战术池：攻击战术 (attack.ts)
 *
 * 核心职责：
 * 1. 物理/概念伤害投射 (damage)
 * 2. 攻击判定质量提升 (aim, crit_chance, crit_bonus, a_sequence)
 * 3. 创伤与物理阻滞附带 (敌方 defense 破甲, speed 伤残减速, stamina 体力剥夺, sanity 概念撕裂)
 *
 * 严格边界：
 * - 绝不提供生存护盾 (shield) 或常驻防御 (defense)
 * - 绝不提供生命或体征的自我恢复 (严格禁止自我回血/回体/回理智)
 *
 * @version 2.4.0
 */

import type { Tactic } from '../../contract/meta';

/**
 * 攻击战术工厂构造器
 */
const atk = (
    id: string,
    name: string,
    desc: string,
    apCost: number,
    tacticEffect?: NonNullable<Tactic['tacticEffect']>,
    requireWeapon?: NonNullable<Tactic['requireWeapon']>,
): Tactic => ({
    type: 'A',
    id: `public_atk_${id}`,
    name,
    desc,
    apCost,
    ...(tacticEffect && tacticEffect.length > 0 ? { tacticEffect } : {}),
    ...(requireWeapon ? { requireWeapon } : {}),
})

export const publicAttackTactics: Tactic[] = [
    // ==========================================================================
    // 1. 通用战术 (Universal: 无武器要求，徒手/即兴武器/任何武装均可施展)
    // ==========================================================================
    atk(
        'quick_jab',
        '迅捷刺拳',
        '以极短的肌肉收缩发动试探性直拳，抢占出手节奏并校正攻击线。',
        1,
        [
            ['self', 'aim', 14, 0],
            ['self', 'damage', 2, 0],
        ],
    ),
    atk(
        'feint_distract',
        '虚招惑敌',
        '以小幅假动作诱导目标误判格挡重心，制造转瞬即逝的防御死角。',
        1,
        [
            ['single_enemy', 'evasion', -16, 1],
            ['self', 'aim', 12, 0],
            ['self', 'damage', 1, 0],
        ],
    ),
    atk(
        'kinetic_strike',
        '强力推击',
        '将全身重心灌注于攻击之上，强行击退目标并破坏其稳定站姿。',
        2,
        [
            ['self', 'damage', 5, 0],
            ['single_enemy', 'speed', -2, 1],
        ],
    ),
    atk(
        'disorienting_blow',
        '截击碎颌',
        '攻击敌方面门或感官中枢，通过物理震荡降低其接下来的瞄准与反击精度。',
        2,
        [
            ['self', 'damage', 4, 0],
            ['single_enemy', 'aim', -20, 1],
        ],
    ),
    atk(
        'posture_break',
        '破势重踏',
        '强行踩踏或撞击敌方支撑点，削弱其身体防御结构与平衡力。',
        2,
        [
            ['self', 'damage', 4, 0],
            ['single_enemy', 'defense', -16, 1],
        ],
    ),
    atk(
        'cross_flank',
        '侧翼交叉切入',
        '与侧面友方单位形成交火夹角，分散敌方防守注意力并扩大创伤面。',
        2,
        [
            ['self', 'damage', 4, 0],
            ['single_enemy', 'defense', -12, 1],
            ['single_ally', 'damage', 2, 1],
        ],
    ),
    atk(
        'haymaker',
        '蓄能猛击',
        '大幅度后引发力，牺牲命中精度换取极具压迫感的高额重创。',
        3,
        [
            ['self', 'damage', 10, 0],
            ['self', 'aim', -14, 0],
            ['self', 'crit_bonus', 7, 0],
        ],
    ),
    atk(
        'stamina_drain',
        '窒息缠斗',
        '以高强度的近身压迫死死咬住目标，残酷损耗其战术体力储备。',
        3,
        [
            ['self', 'damage', 6, 0],
            ['single_enemy', 'stamina', -22, 0],
            ['single_enemy', 'speed', -3, 1],
        ],
    ),
    atk(
        'fatal_execution',
        '决意处决',
        '针对已陷入失衡或重创的敌方要害发动终结式打击，强制拉升攻击判定阶次。',
        4,
        [
            ['self', 'damage', 16, 0],
            ['self', 'a_sequence', 1, 1],
            ['self', 'crit_chance', 0.25, 0],
        ],
    ),

    // ==========================================================================
    // 2. 近战：单手挥动类 (Wave: 单手/近程/冲刺每格+1伤/单手空置命中伤害加成)
    // ==========================================================================
    atk(
        'wave_quick_cut',
        '掠影侧斩',
        '利用单手挥动武器的轻便弧线迅速划过目标外围，逼迫其退守。',
        1,
        [
            ['self', 'aim', 16, 0],
            ['self', 'damage', 2, 0],
        ],
        'wave',
    ),
    atk(
        'wave_arc_slash',
        '弧光劈切',
        '标准斩击步法，借由利刃圆弧切削肢体，破坏目标常驻防御。',
        2,
        [
            ['self', 'damage', 5, 0],
            ['single_enemy', 'defense', -14, 1],
        ],
        'wave',
    ),
    atk(
        'wave_sever_tendon',
        '削足断筋',
        '精准斩切敌方膝弯或跟腱部位，大幅度瓦解其移动速度与规避余量。',
        2,
        [
            ['self', 'damage', 4, 0],
            ['single_enemy', 'speed', -4, 1],
            ['single_enemy', 'evasion', -22, 1],
        ],
        'wave',
    ),
    atk(
        'wave_cleaving_surge',
        '怒潮奔涌',
        '完全释放单手刃器的锋芒，借冲刺余势打出深层贯穿撕裂伤。',
        3,
        [
            ['self', 'damage', 9, 0],
            ['self', 'crit_chance', 0.20, 0],
            ['self', 'crit_bonus', 6, 0],
        ],
        'wave',
    ),

    // ==========================================================================
    // 3. 近战：双手挥动类 (Both Wave: 双手/近程/冲刺每格+2伤/高命中/低暴击/防御质量下降)
    // ==========================================================================
    atk(
        'both_wave_momentum_strike',
        '重刃顺劈',
        '借助沉重双手战刃的下坠惯性挥击，稳健砸开正面防线。',
        2,
        [
            ['self', 'damage', 6, 0],
            ['self', 'aim', 22, 0],
        ],
        'both_wave',
    ),
    atk(
        'both_wave_sweeping_cyclone',
        '旋刃破阵',
        '双手抡圆重型武器划出狂暴回旋，用恐怖风压震慑全体敌方单位。',
        3,
        [
            ['self', 'damage', 7, 0],
            ['all_enemies', 'speed', -2, 1],
            ['all_enemies', 'aim', -14, 1],
        ],
        'both_wave',
    ),
    atk(
        'both_wave_bone_crusher',
        '断骨裂铠',
        '以压倒性的金属质量实施暴烈重斩，彻底碾碎敌方外覆防护与骨骼。',
        3,
        [
            ['self', 'damage', 10, 0],
            ['single_enemy', 'defense', -28, 1],
        ],
        'both_wave',
    ),
    atk(
        'both_wave_world_splitter',
        '开山断罪',
        '凝聚全身筋骨爆发毁灭一击，由于动量过载短时抑制自身回避机能。',
        4,
        [
            ['self', 'damage', 18, 0],
            ['self', 'aim', 25, 0],
            ['single_enemy', 'stamina', -32, 0],
            ['self', 'evasion', -15, 0],
        ],
        'both_wave',
    ),

    // ==========================================================================
    // 4. 近战：单手刺击类 (Prick: 单手/近程/冲刺每格+1伤/单手空置增益/高弱点暴击)
    // ==========================================================================
    atk(
        'prick_probe',
        '隙间试探',
        '以极快笔直的短突刺寻找目标护甲缝隙，为后续致命打击校准准星。',
        1,
        [
            ['self', 'aim', 20, 0],
            ['self', 'crit_chance', 0.12, 0],
            ['self', 'damage', 1, 0],
        ],
        'prick',
    ),
    atk(
        'prick_penetrate',
        '透甲点刺',
        '将力量集中于极小受力面，无视表层抗性直接穿刺血肉组织。',
        2,
        [
            ['self', 'damage', 5, 0],
            ['self', 'crit_chance', 0.20, 0],
            ['single_enemy', 'defense', -18, 1],
        ],
        'prick',
    ),
    atk(
        'prick_artery_stab',
        '放血深刺',
        '刺穿动脉或关节软组织，剧烈疼痛导致敌方闪避与机动能力崩溃。',
        2,
        [
            ['self', 'damage', 5, 0],
            ['single_enemy', 'evasion', -26, 1],
            ['single_enemy', 'speed', -3, 1],
        ],
        'prick',
    ),
    atk(
        'prick_heart_seeker',
        '贯心绝杀',
        '深渊清理人格杀术：孤注一掷瞄准心脏与中枢神经网，直击死穴。',
        3,
        [
            ['self', 'damage', 8, 0],
            ['self', 'crit_chance', 0.35, 0],
            ['self', 'crit_bonus', 10, 0],
            ['self', 'a_sequence', 1, 1],
        ],
        'prick',
    ),

    // ==========================================================================
    // 5. 近战：双手刺击类 (Both Prick: 双手/近程/射程优秀/冲刺每格+2伤/防御质量下降)
    // ==========================================================================
    atk(
        'both_prick_keep_away',
        '寸劲拒敌',
        '依托长兵刃的绝对距离优势向前穿刺，卡死敌方逼近路线。',
        2,
        [
            ['self', 'damage', 5, 0],
            ['self', 'aim', 16, 0],
            ['single_enemy', 'speed', -3, 1],
        ],
        'both_prick',
    ),
    atk(
        'both_prick_lunging_skewer',
        '疾步贯突',
        '沉肩突进，将全身力道与长柄重心拧为一股直线破甲冲击。',
        3,
        [
            ['self', 'damage', 8, 0],
            ['self', 'crit_chance', 0.25, 0],
            ['single_enemy', 'defense', -24, 1],
        ],
        'both_prick',
    ),
    atk(
        'both_prick_spiral_thrust',
        '螺旋破虚',
        '双手长兵高速旋拧突刺，在贯穿创口处撕裂非欧应力回旋。',
        3,
        [
            ['self', 'damage', 10, 0],
            ['self', 'crit_bonus', 8, 0],
            ['single_enemy', 'evasion', -24, 1],
        ],
        'both_prick',
    ),
    atk(
        'both_prick_line_pierce',
        '星芒九连刺',
        '爆发式连续多段突刺封锁敌方所有躲闪轴，造成毁灭性空腔贯穿。',
        4,
        [
            ['self', 'damage', 16, 0],
            ['self', 'crit_chance', 0.30, 0],
            ['self', 'a_sequence', 1, 1],
            ['single_enemy', 'stamina', -28, 0],
        ],
        'both_prick',
    ),

    // ==========================================================================
    // 6. 近战：单手盾牌类 (Shield: 单手/近程/冲刺每格+1伤/单手空置加成/partial免伤可达1.0)
    // ==========================================================================
    atk(
        'shield_bash_jab',
        '盾缘顿击',
        '以坚固的金属盾缘猝然撞击敌方下颚，用极快动作打断防守节奏。',
        1,
        [
            ['self', 'damage', 2, 0],
            ['single_enemy', 'aim', -16, 1],
        ],
        'shield',
    ),
    atk(
        'shield_offensive_charge',
        '持盾破阵冲撞',
        '屈身顶盾前冲撞退目标，利用强横钝击冲击力破坏其平衡构型。',
        2,
        [
            ['self', 'damage', 5, 0],
            ['single_enemy', 'speed', -3, 1],
            ['single_enemy', 'defense', -12, 1],
        ],
        'shield',
    ),
    atk(
        'shield_concussive_slam',
        '震荡盾击',
        '全力拍击敌方头颅，引发剧烈耳鸣与颅内震荡，瘫痪其闪避神经。',
        2,
        [
            ['self', 'damage', 4, 0],
            ['single_enemy', 'evasion', -30, 1],
            ['single_enemy', 'defense', -14, 1],
        ],
        'shield',
    ),
    atk(
        'shield_shield_lock_punish',
        '锁盾重轰',
        '强行卡死敌方武器运动轨迹，随后利用盾面重压打断其战术动作。',
        3,
        [
            ['self', 'damage', 7, 0],
            ['single_enemy', 'ap', -1, 1],
            ['single_enemy', 'stamina', -18, 0],
        ],
        'shield',
    ),

    // ==========================================================================
    // 7. 近战：双手盾牌类 (Both Shield: 双手/近程/冲刺每格+1伤/partial达1.0/无dodge与fail)
    // ==========================================================================
    atk(
        'both_shield_line_advance',
        '铁壁推挤',
        '双手紧扣重装护盾平推战线，以不可阻挡的钢铁重量压缩敌阵活动空间。',
        2,
        [
            ['self', 'damage', 5, 0],
            ['all_enemies', 'speed', -3, 1],
        ],
        'both_shield',
    ),
    atk(
        'both_shield_crushing_ram',
        '巨盾碾碎',
        '将双手塔盾高高扬起后狂暴砸落，地面震颤直接震碎目标肢体平衡。',
        3,
        [
            ['self', 'damage', 8, 0],
            ['single_enemy', 'defense', -24, 1],
            ['single_enemy', 'stamina', -24, 0],
        ],
        'both_shield',
    ),
    atk(
        'both_shield_fortress_siege',
        '堡垒碾轧冲锋',
        '如移动城墙般无情碾压前方轨道，将阻挡的一切肉身化作血泥与肉糜。',
        4,
        [
            ['self', 'damage', 13, 0],
            ['single_enemy', 'ap', -2, 1],
            ['single_enemy', 'speed', -4, 1],
            ['single_enemy', 'defense', -28, 1],
        ],
        'both_shield',
    ),

    // ==========================================================================
    // 8. 远程：手枪类 (Pistol: 单手/远程/单手空置命中加成/未移动首次攻击免AP)
    // ==========================================================================
    atk(
        'pistol_snap_shot',
        '瞬发拔枪',
        '凭借肌肉记忆瞬间出枪击发，抢在敌方反应前打乱其行动阵脚。',
        1,
        [
            ['self', 'aim', 18, 0],
            ['self', 'damage', 3, 0],
        ],
        'pistol',
    ),
    atk(
        'pistol_double_tap',
        '莫桑比克速射',
        '军用速射操典：躯干短促连打两枪，破坏目标战术节奏并施加压制。',
        2,
        [
            ['self', 'damage', 5, 0],
            ['self', 'aim', 14, 0],
            ['single_enemy', 'aim', -16, 1],
        ],
        'pistol',
    ),
    atk(
        'pistol_point_blank_execution',
        '零距离穿颅',
        '在极近距离将枪口直接顶入受害者防御死角轰击，必定带来高危穿透。',
        2,
        [
            ['self', 'damage', 6, 0],
            ['self', 'crit_chance', 0.25, 0],
            ['self', 'crit_bonus', 6, 0],
        ],
        'pistol',
    ),
    atk(
        'pistol_deadly_cadence',
        '枪斗律动点杀',
        '结合灵动机动与精准击发，在闪转腾挪中将穿甲弹药倾泻至要害。',
        3,
        [
            ['self', 'damage', 8, 0],
            ['self', 'aim', 26, 0],
            ['self', 'crit_chance', 0.20, 0],
            ['single_enemy', 'defense', -20, 1],
        ],
        'pistol',
    ),

    // ==========================================================================
    // 9. 远程：冲锋枪类 (SMG: 双手/远程/追加点射机制：余AP可消耗1点重复判定取最优)
    // ==========================================================================
    atk(
        'smg_short_burst',
        '短促点射',
        '扣下扳机打出小基数点射，利用微后坐力快速修正弹着点。',
        1,
        [
            ['self', 'aim', 14, 0],
            ['self', 'damage', 3, 0],
        ],
        'smg',
    ),
    atk(
        'smg_suppressive_sweep',
        '战术扇面扫射',
        '横向移动枪口喷吐弹雨，强行压制该方向敌人的规避与反击意图。',
        2,
        [
            ['self', 'damage', 5, 0],
            ['single_enemy', 'aim', -22, 1],
            ['single_enemy', 'evasion', -18, 1],
        ],
        'smg',
    ),
    atk(
        'smg_bullet_hail',
        '狂乱弹幕泼洒',
        '将整条弹匣内的弹药倾泻在近距离走廊中，狂暴撕裂目标外覆护具。',
        3,
        [
            ['self', 'damage', 8, 0],
            ['single_enemy', 'defense', -24, 1],
            ['all_enemies', 'evasion', -14, 1],
        ],
        'smg',
    ),
    atk(
        'smg_room_clearing_storm',
        '近距风暴清膛',
        '清理人破门室内肃清战术，凭借高射速在单个行动轮内彻底瓦解敌群行动力。',
        4,
        [
            ['self', 'damage', 14, 0],
            ['all_enemies', 'aim', -22, 1],
            ['all_enemies', 'speed', -3, 1],
            ['self', 'a_sequence', 1, 1],
        ],
        'smg',
    ),

    // ==========================================================================
    // 10. 远程：突击步枪类 (Assault Rifle: 双手/远程/火力均衡可靠/中远距离统治力)
    // ==========================================================================
    atk(
        'rifle_controlled_pair',
        '三点控枪射击',
        '正规军械标准动作，依托枪托与导气系统打出高存速的收束弹束。',
        2,
        [
            ['self', 'damage', 6, 0],
            ['self', 'aim', 18, 0],
        ],
        'assault_rifle',
    ),
    atk(
        'rifle_corridor_suppression',
        '走廊火力封锁',
        '在战场关键轨道布设连续阻滞火网，迫使所有敌方单位丧失机动性。',
        3,
        [
            ['self', 'damage', 6, 0],
            ['all_enemies', 'speed', -3, 1],
            ['all_enemies', 'aim', -20, 1],
        ],
        'assault_rifle',
    ),
    atk(
        'rifle_armor_piercing_burst',
        '穿甲弹幕撕裂',
        '击发特种钨心穿甲弹，直接贯穿混凝土掩体与重型生体角质层。',
        3,
        [
            ['self', 'damage', 9, 0],
            ['single_enemy', 'defense', -26, 1],
            ['self', 'crit_chance', 0.15, 0],
        ],
        'assault_rifle',
    ),
    atk(
        'rifle_killzone_saturation',
        '杀伤空域饱和射击',
        '将突击步枪威力推至极限，在战壕纵深制造致死火力陷阱，粉碎一切生机。',
        4,
        [
            ['self', 'damage', 16, 0],
            ['self', 'aim', 22, 0],
            ['all_enemies', 'defense', -18, 1],
            ['single_enemy', 'stamina', -22, 0],
        ],
        'assault_rifle',
    ),

    // ==========================================================================
    // 11. 远程：霰弹枪类 (Shotgun: 双手/远程/锥形均摊溅射/距离越近暴击越高/4格以上无暴击)
    // ==========================================================================
    atk(
        'shotgun_slug_breach',
        '破障铅弹轰击',
        '近距离射出重型铅弹，用恐怖动能击穿防御并撕裂敌方掩体防护。',
        2,
        [
            ['self', 'damage', 6, 0],
            ['single_enemy', 'defense', -22, 1],
        ],
        'shotgun',
    ),
    atk(
        'shotgun_buckshot_spread',
        '鹿弹广角泼洒',
        '释放密集的九颗铅丸扇面，除主目标外大范围削弱周边敌人的闪避空隙。',
        2,
        [
            ['self', 'damage', 4, 0],
            ['all_enemies', 'evasion', -20, 1],
        ],
        'shotgun',
    ),
    atk(
        'shotgun_kinetic_blast',
        '近距动能轰顶',
        '在 1 格最佳交火距离击发，强大的炮口冲击波强行震退敌人并截断行动点。',
        3,
        [
            ['self', 'damage', 9, 0],
            ['self', 'crit_bonus', 8, 0],
            ['single_enemy', 'speed', -4, 1],
            ['single_enemy', 'ap', -1, 1],
        ],
        'shotgun',
    ),
    atk(
        'shotgun_point_blank_obliteration',
        '贴面粉碎风暴',
        '抵住目标胸腔扣动扳机，高压火药燃气与钢珠瞬间将碳基组织轰为齑粉。',
        4,
        [
            ['self', 'damage', 17, 0],
            ['self', 'crit_chance', 0.40, 0],
            ['self', 'crit_bonus', 12, 0],
            ['single_enemy', 'defense', -32, 1],
        ],
        'shotgun',
    ),

    // ==========================================================================
    // 12. 远程：短管霰弹枪类 (Sawed Off: 单手/远程/单持命中加成/均摊溅射/3格以上无暴击)
    // ==========================================================================
    atk(
        'sawed_off_snap_blast',
        '截管猝射',
        '利用单手轻巧的截短管身快速出枪，散开的弹雨打乱近身威胁。',
        1,
        [
            ['self', 'damage', 3, 0],
            ['single_enemy', 'aim', -16, 1],
        ],
        'sawed_off',
    ),
    atk(
        'sawed_off_breaching_charge',
        '贴身轰门',
        '以单手短管近身暴射，强横的反冲力撕裂目标战备架势。',
        2,
        [
            ['self', 'damage', 6, 0],
            ['single_enemy', 'defense', -18, 1],
            ['single_enemy', 'speed', -2, 1],
        ],
        'sawed_off',
    ),
    atk(
        'sawed_off_double_hammer',
        '双管齐发轰杀',
        '同时击发两根枪膛内的所有弹药，在 1 格距离内制造不可逆的爆裂空腔。',
        3,
        [
            ['self', 'damage', 11, 0],
            ['self', 'crit_chance', 0.35, 0],
            ['self', 'crit_bonus', 10, 0],
        ],
        'sawed_off',
    ),

    // ==========================================================================
    // 13. 远程：狙击步枪类 (Sniper Rifle: 双手/远程/暴击无视0.3防御/近距退化/最佳12格)
    // ==========================================================================
    atk(
        'sniper_steady_shot',
        '屏息狙击',
        '调整呼吸与击发时机，在超长距离射出高精度弹头，稳定击碎要害。',
        2,
        [
            ['self', 'damage', 7, 0],
            ['self', 'aim', 26, 0],
        ],
        'sniper_rifle',
    ),
    atk(
        'sniper_armor_crack',
        '重型穿甲轰鸣',
        '击发 .50 BMG 级全威力反器材弹药，跨越战场直接击碎坚固工事与甲壳。',
        3,
        [
            ['self', 'damage', 10, 0],
            ['self', 'crit_chance', 0.25, 0],
            ['single_enemy', 'defense', -32, 1],
        ],
        'sniper_rifle',
    ),
    atk(
        'sniper_dead_horizon',
        '死线超视距狙杀',
        '在极限交战距离计算非欧引力偏转，射出无情终结一弹，直接提升判定层级。',
        4,
        [
            ['self', 'damage', 19, 0],
            ['self', 'aim', 35, 0],
            ['self', 'crit_chance', 0.35, 0],
            ['self', 'crit_bonus', 15, 0],
            ['self', 'a_sequence', 1, 1],
        ],
        'sniper_rifle',
    ),

    // ==========================================================================
    // 14. 远程：弩类 (Crossbow: 单手/远程/单持命中加成/静默无声/强力机械张力)
    // ==========================================================================
    atk(
        'crossbow_silent_puncture',
        '无声冷矢',
        '扣动弩机射出静默合金箭，在目标未察觉前洞穿防具接缝。',
        2,
        [
            ['self', 'damage', 5, 0],
            ['self', 'aim', 22, 0],
            ['single_enemy', 'defense', -14, 1],
        ],
        'crossbow',
    ),
    atk(
        'crossbow_barbed_bolt',
        '倒钩阻滞栓',
        '特种倒刺钢箭射入肌体，撕裂伤阻碍敌方神经运动与位移步伐。',
        2,
        [
            ['self', 'damage', 4, 0],
            ['single_enemy', 'speed', -4, 1],
            ['single_enemy', 'stamina', -16, 0],
        ],
        'crossbow',
    ),
    atk(
        'crossbow_heavy_winch_snipe',
        '绞盘重弩裂甲',
        '利用滑轮绞盘拉至极限蓄能射击，巨大的金属动能直接贯穿敌方核心结构。',
        3,
        [
            ['self', 'damage', 9, 0],
            ['self', 'crit_chance', 0.30, 0],
            ['single_enemy', 'defense', -28, 1],
        ],
        'crossbow',
    ),

    // ==========================================================================
    // 15. 远程：弓类 (Bow: 双手/远程/静音抛射武器/抛物线覆盖)
    // ==========================================================================
    atk(
        'bow_rapid_draw',
        '速射抽矢',
        '手指滑过箭袋瞬间满弓射出，以高频箭雨骚扰敌方规避走位。',
        1,
        [
            ['self', 'aim', 16, 0],
            ['self', 'damage', 2, 0],
        ],
        'bow',
    ),
    atk(
        'bow_lobbed_arc',
        '曲射越障',
        '利用高角度抛物线箭道跨越前排掩体，直接打击掩体后方隐匿的目标。',
        2,
        [
            ['self', 'damage', 5, 0],
            ['single_enemy', 'evasion', -22, 1],
        ],
        'bow',
    ),
    atk(
        'bow_arrow_storm',
        '战术箭雨覆盖',
        '向敌方阵线连续打出密集箭束，大范围压制所有敌方单位的观察视野。',
        3,
        [
            ['self', 'damage', 6, 0],
            ['all_enemies', 'aim', -22, 1],
            ['all_enemies', 'speed', -2, 1],
        ],
        'bow',
    ),
    atk(
        'bow_penetrating_draw',
        '贯雷极弦重击',
        '将复合弓弦拉至极限满月，汇聚全身意志射出贯穿一切掩体的撕裂巨矢。',
        3,
        [
            ['self', 'damage', 9, 0],
            ['self', 'crit_chance', 0.25, 0],
            ['self', 'crit_bonus', 8, 0],
            ['single_enemy', 'defense', -22, 1],
        ],
        'bow',
    ),

    // ==========================================================================
    // 16. 远程：投掷类 (Throw: 单手/远程/消耗与范围干扰)
    // ==========================================================================
    atk(
        'throw_distraction',
        '瓦砾掷击',
        '就地投掷金属碎片或石块砸击敌方面罩，制造短暂的致盲失准。',
        1,
        [
            ['self', 'damage', 1, 0],
            ['single_enemy', 'aim', -22, 1],
            ['single_enemy', 'evasion', -16, 1],
        ],
        'throw',
    ),
    atk(
        'throw_shrapnel',
        '破片飞掷',
        '精准掷出带刃飞刀或破片杀伤物，深嵌敌方肢体造成行动受限。',
        2,
        [
            ['self', 'damage', 5, 0],
            ['single_enemy', 'speed', -3, 1],
        ],
        'throw',
    ),
    atk(
        'throw_concussive_grenade',
        '震荡弹投掷',
        '引爆震荡冲击物，暴烈的声学音爆席卷全场，重创敌方的神经反应与理智防线。',
        3,
        [
            ['self', 'damage', 6, 0],
            ['all_enemies', 'aim', -26, 1],
            ['all_enemies', 'speed', -3, 1],
            ['all_enemies', 'sanity', -6, 0],
        ],
        'throw',
    ),

    // ==========================================================================
    // 17. 即时：法术类 (Magic: 单手/即时伤害/无视防御与物理格挡/造成真实伤害)
    // ==========================================================================
    atk(
        'magic_causal_spark',
        '因果火花',
        '引导微量深渊星神质扰动，直接在目标神经回路中点燃无形的概念灼痛。',
        2,
        [
            ['self', 'damage', 4, 0],
            ['single_enemy', 'sanity', -5, 0],
        ],
        'magic',
    ),
    atk(
        'magic_mind_rend',
        '精神撕裂咒',
        '绕过物质三维防护直接撕裂敌方的思维意识，摧毁其反击意图与行动点。',
        3,
        [
            ['self', 'damage', 7, 0],
            ['single_enemy', 'sanity', -10, 0],
            ['single_enemy', 'ap', -1, 1],
        ],
        'magic',
    ),
    atk(
        'magic_void_siphon',
        '虚空生体虹吸',
        '在敌我之间建立非欧能量渡桥，以概念攻击剥离目标的行动体力与神经清醒度。',
        3,
        [
            ['self', 'damage', 7, 0],
            ['single_enemy', 'stamina', -25, 0],
            ['single_enemy', 'vigor', -6, 0],
            ['single_enemy', 'speed', -3, 1],
        ],
        'magic',
    ),
    atk(
        'magic_singularity_collapse',
        '奇点坍缩湮灭',
        '撕碎现实薄膜召唤深渊引力奇点，造成不可名状的广域概念毁灭与真理坍塌。',
        4,
        [
            ['self', 'damage', 15, 0],
            ['all_enemies', 'defense', -28, 1],
            ['all_enemies', 'sanity', -18, 0],
            ['self', 'a_sequence', 1, 1],
        ],
        'magic',
    ),
]