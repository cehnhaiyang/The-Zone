/**
 * weapon.ts
 * 武器专属战术 (Weapon Own Tactics)
 *
 * 契约规范：
 * - 依循 `WeaponOwnTactic` 接口，通过 `weaponOwn` 直接绑定至对应 `WeaponType`。
 * - 由装备该类型武器的实体在战斗态 (GameState.COMBAT) 中自动装载，不参与公共战术池抽取。
 * - 严格遵循《背景设定与世界观编年史》第六章十六种军械形态与因果律战斗体系规约。
 *
 * @version 2.3.0
 */

import type { Target, TacticEffectType, WeaponType, WeaponOwnTactic } from '../../meta'

/**
 * 战术效果四元组定义：
 * [目标, 效果属性, 增减数值, 持续回合数]
 * 持续回合数规范：
 * - 0: 仅在当前/下一次结果判定生效；
 * - 正整数: 持续指定判定次数或回合数；
 * - 负数: 持续指定回合数的绝对值周期。
 */
export type TacticEffect = Array<[Target, TacticEffectType, number, number]>

/**
 * 构造武器专属战术内部辅助函数
 */
const makeTactic = (
    type: WeaponOwnTactic['type'],
    weaponOwn: WeaponType,
    id: string,
    name: string,
    desc: string,
    apCost: number,
    tacticEffect?: TacticEffect,
): WeaponOwnTactic => ({
    type,
    weaponOwn,
    id: `weapon_${weaponOwn}_${id}`,
    name,
    desc,
    apCost,
    ...(tacticEffect && tacticEffect.length > 0 ? { tacticEffect } : {}),
})

/** 快速构造攻击类战术 ('A') */
const makeAtk = (
    weaponOwn: WeaponType,
    id: string,
    name: string,
    desc: string,
    apCost: number,
    tacticEffect?: TacticEffect,
): WeaponOwnTactic => makeTactic('A', weaponOwn, id, name, desc, apCost, tacticEffect)

/** 快速构造防御类战术 ('D') */
const makeDef = (
    weaponOwn: WeaponType,
    id: string,
    name: string,
    desc: string,
    apCost: number,
    tacticEffect?: TacticEffect,
): WeaponOwnTactic => makeTactic('D', weaponOwn, id, name, desc, apCost, tacticEffect)

/** 快速构造辅助类战术 ('U') */
const makeUtil = (
    weaponOwn: WeaponType,
    id: string,
    name: string,
    desc: string,
    apCost: number,
    tacticEffect?: TacticEffect,
): WeaponOwnTactic => makeTactic('U', weaponOwn, id, name, desc, apCost, tacticEffect)

/** 快速构造枪械类制式「开火」战术 ('A') */
const makeFire = (
    weaponOwn: WeaponType,
    apCost: number,
    desc: string,
    tacticEffect?: TacticEffect,
): WeaponOwnTactic => makeAtk(weaponOwn, 'fire', '开火', desc, apCost, tacticEffect)

// ==============================================================================
// 武器专属战术定义表
// ==============================================================================

export const weaponOwnTactics: readonly WeaponOwnTactic[] = Object.freeze([
    // --------------------------------------------------------------------------
    // 1. 单手挥动类 (wave) - 近程伤害，单手
    // 特性：副手为空获命中与伤害加成；冲刺最大距离为当前 AP，每冲刺 1 格伤害 +1。
    // 消耗：攻击 1 AP，辅助 1 AP。
    // --------------------------------------------------------------------------
    makeAtk(
        'wave',
        'slash',
        '挥击',
        '借身体重心摆动单手利刃，借由快速冲刺与弧面斩击撕裂敌方表层防线。',
        1,
    ),
    makeUtil(
        'wave',
        'feint_step',
        '佯攻滑步',
        '利用单手武器的轻盈重心执行变向虚晃，在战壕与障碍间拉开身位，提升下一次攻击判定质量并强化自卫机动。',
        1,
        [
            ['self', 'aim', 1, 1],
            ['self', 'evasion', 5, 1],
        ],
    ),

    // --------------------------------------------------------------------------
    // 2. 双手挥动类 (both_wave) - 近程伤害，双手
    // 特性：每冲刺 1 格伤害 +2；沉重斩击导致自身防御序列质量下降；命中高于刺击，暴击较低。
    // 消耗：双手近战攻击统一定为 2 AP。
    // --------------------------------------------------------------------------
    makeAtk(
        'both_wave',
        'cleave',
        '巨弧挥斩',
        '倾注全身动量挥出破坏性重斩，以绝对的动能阻断敌方前冲势头，但沉重架势将暴露自身防守破绽。',
        2,
        [
            ['single_enemy', 'speed', -2, 1],
            ['self', 'd_sequence', -1, 1],
        ],
    ),
    makeAtk(
        'both_wave',
        'sweeping_momentum',
        '战线横扫',
        '借武器回转离心力横向卷过正前方，强行打乱多名进攻者的突进节奏，迫使其回缩规避。',
        2,
        [
            ['all_enemies', 'speed', -1, 1],
            ['all_enemies', 'damage', -1, 1],
        ],
    ),

    // --------------------------------------------------------------------------
    // 3. 单手刺击类 (prick) - 近程伤害，单手
    // 特性：副手为空获加成；冲刺每格伤害 +1；高暴击倾向。
    // 消耗：攻击 1 AP，辅助 1 AP。
    // --------------------------------------------------------------------------
    makeAtk(
        'prick',
        'thrust',
        '突刺',
        '收束身形，将锐利刃尖高频刺向目标肢体关节与防护裂隙，争取弱点穿透与暴击判定。',
        1,
        [
            ['self', 'crit_chance', 10, 0],
        ],
    ),
    makeUtil(
        'prick',
        'probe_weakness',
        '寻隙',
        '以轻巧的刺击假动作探试敌方防线死角，校准刃口锋向，使接下来的攻击判定直接跃升一档。',
        1,
        [
            ['self', 'a_sequence', 1, 0],
        ],
    ),

    // --------------------------------------------------------------------------
    // 4. 双手刺击类 (both_prick) - 近程伤害，双手
    // 特性：每冲刺 1 格伤害 +2；双手长距离贯穿；防御序列质量下降。
    // 消耗：双手近战攻击统一定为 2 AP；防御战术消耗 2 AP。
    // --------------------------------------------------------------------------
    makeAtk(
        'both_prick',
        'lunge',
        '双手贯突',
        '双手紧握柄轴完成一次极长纵深的沉重突刺，以破坏性动量贯穿阻碍并撕裂脏器，但短时间内难以迅速回防。',
        2,
        [
            ['self', 'crit_bonus', 4, 0],
            ['single_enemy', 'speed', -1, 1],
            ['self', 'd_sequence', -1, 1],
        ],
    ),
    makeDef(
        'both_prick',
        'set_spear',
        '架矛迎击',
        '将长兵后柄抵于地面构成拒马夹角，以枪尖锁定迎面扑来的威胁，迟滞目标速度并建立防守阵位。',
        2,
        [
            ['single_enemy', 'speed', -2, 1],
            ['self', 'defense', 10, 1],
        ],
    ),

    // --------------------------------------------------------------------------
    // 5. 单手盾牌类 (shield) - 近程伤害，单手防具
    // 特性：冲刺每格伤害 +1；防御序列 partial 可达 1.0；降低 dodge 概率。
    // 消耗：单手近战攻击 1 AP，举盾防御 1 AP。
    // --------------------------------------------------------------------------
    makeAtk(
        'shield',
        'bash',
        '盾击',
        '借冲刺步法以坚实盾面猛烈撞击目标躯干，以钝性震荡破坏其攻击架势与前倾重心。',
        1,
        [
            ['single_enemy', 'speed', -1, 1],
        ],
    ),
    makeDef(
        'shield',
        'guard',
        '举盾',
        '将防暴盾牌置于要害正前方构建防线，优化防御判定序列，并预备吸收正面冲击。',
        1,
        [
            ['self', 'd_sequence', 1, 1],
            ['self', 'shield', 6, 1],
        ],
    ),

    // --------------------------------------------------------------------------
    // 6. 双手盾牌类 (both_shield) - 近程伤害，双手重防具
    // 特性：双手塔盾推进；partial 可达 1.0；防御序列不再出现 dodge 与 fail（绝对格挡）。
    // 消耗：双手近战冲撞 2 AP，铸壁防御 2 AP。
    // --------------------------------------------------------------------------
    makeAtk(
        'both_shield',
        'bulwark_ram',
        '盾墙冲撞',
        '双手紧扣重装塔盾骨架全力向前夯进，以钢铁壁垒强行碾碎敌方阻击阵线，压制其行动速度与输出动量。',
        2,
        [
            ['single_enemy', 'speed', -2, 1],
            ['single_enemy', 'damage', -2, 1],
        ],
    ),
    makeDef(
        'both_shield',
        'wall',
        '铸壁固守',
        '将双手防弹重盾嵌死于地表裂隙形成临时掩体，进入绝对防御状态，生成致密护盾并大幅提高常驻免伤。',
        2,
        [
            ['self', 'd_sequence', 2, 1],
            ['self', 'shield', 16, 1],
            ['self', 'defense', 20, 1],
        ],
    ),

    // --------------------------------------------------------------------------
    // 7. 手枪类 (pistol) - 远程伤害，单手枪械
    // 特性：开火 1 AP；副手为空获命中加成；首发抢攻（本回合未移动首次攻击不消耗 AP）。
    // --------------------------------------------------------------------------
    makeFire(
        'pistol',
        1,
        '单手持枪沉稳起伏击发，完成一次灵便、快速且极低后坐的近距点射。',
    ),
    makeUtil(
        'pistol',
        'suppressive_snap',
        '急促点射',
        '借助手枪极致的拔枪指向性对敌方要害进行快节奏骚扰射击，干扰其索敌瞄准精度。',
        1,
        [
            ['single_enemy', 'aim', -2, 1],
        ],
    ),

    // --------------------------------------------------------------------------
    // 8. 冲锋枪类 (smg) - 远程伤害，双手枪械
    // 特性：开火 1 AP；判定后若有剩余 AP 可追加消耗 1 点重复判定，取最优结算。
    // --------------------------------------------------------------------------
    makeFire(
        'smg',
        1,
        '以极高射速向目标区域倾泻密集短点射，以高密火网短暂压制敌方的前推势头。',
        [
            ['single_enemy', 'speed', -1, 0],
        ],
    ),
    makeAtk(
        'smg',
        'sweeping_spray',
        '扇形泼洒',
        '迅速摆动冲锋枪枪口进行压制性横扫，利用散布弹幕迫使多名敌对实体回缩规避。',
        1,
        [
            ['all_enemies', 'aim', -1, 1],
        ],
    ),

    // --------------------------------------------------------------------------
    // 9. 突击步枪类 (assault_rifle) - 远程伤害，双手枪械
    // 特性：开火 1 AP；军工标准制式步枪，火力均衡稳定，兼顾射程与侵彻力。
    // --------------------------------------------------------------------------
    makeFire(
        'assault_rifle',
        1,
        '以正规军制式步枪实施高初速精准单发/短点射，以稳定弹道穿透敌方防护层。',
    ),
    makeAtk(
        'assault_rifle',
        'controlled_burst',
        '三发点射',
        '遵循步兵作战规程打出节奏严密的极速三连发，兼顾落点散布与穿甲深度，优化命中并迟滞目标。',
        1,
        [
            ['self', 'aim', 1, 0],
            ['single_enemy', 'speed', -1, 1],
        ],
    ),

    // --------------------------------------------------------------------------
    // 10. 霰弹枪类 (shotgun) - 远程伤害，双手枪械
    // 特性：开火 1 AP；对锥形范围内所有目标均摊伤害；最佳暴击距离 1 格，超过 4 格无法暴击。
    // --------------------------------------------------------------------------
    makeFire(
        'shotgun',
        1,
        '在近距离释放扇形鹿弹风暴，以数十颗破片轰击目标正面，强力冲击敌方肉身并打断其行动节奏。',
        [
            ['single_enemy', 'speed', -1, 0],
        ],
    ),
    makeAtk(
        'shotgun',
        'point_blank_blast',
        '贴面破障轰击',
        '近距对准目标护甲或躯干要害释放整发弹药的高压爆震，强行撕裂掩体防线并削弱其免伤防御。',
        1,
        [
            ['single_enemy', 'defense', -10, 1],
        ],
    ),

    // --------------------------------------------------------------------------
    // 11. 短管霰弹枪类 (sawed_off) - 远程伤害，单手枪械
    // 特性：开火 1 AP；副手为空获命中加成；锥形均摊伤害；最佳暴击 1 格，超过 3 格无法暴击。
    // --------------------------------------------------------------------------
    makeFire(
        'sawed_off',
        1,
        '单手持截短枪管在咫尺距离骤然击发，破片如火云般爆开，造成难以防备的短距威慑。',
        [
            ['single_enemy', 'speed', -1, 0],
        ],
    ),
    makeUtil(
        'sawed_off',
        'concussive_flare',
        '爆震威慑',
        '在狭窄战壕或掩体内引爆短管火药，炽烈枪口焰与巨响震荡神经，削弱全体敌人的索敌瞄准。',
        1,
        [
            ['all_enemies', 'aim', -1, 1],
        ],
    ),

    // --------------------------------------------------------------------------
    // 12. 狙击步枪类 (sniper_rifle) - 远程伤害，双手枪械
    // 特性：开火 1 AP；暴击无视 0.3 defense；近距退化惩罚，最佳 12 格；
    // 专属 U 战术：消耗 1 AP 瞄准，使下一次判定提升 1 档（miss->graze->hit->crit），原为 crit 伤害翻倍。
    // --------------------------------------------------------------------------
    makeFire(
        'sniper_rifle',
        1,
        '通过加长高精度枪管射出全威力弹药，跨越深渊焦土进行一次精准致命的超视距单发狙杀。',
    ),
    makeUtil(
        'sniper_rifle',
        'steady_aim',
        '精确瞄准',
        '屏息凝神，启动高倍率目镜热辐射与因果重叠透镜，在射击前预演目标的运动轨迹，强行提升下一次攻击判定位阶。',
        1,
        [
            ['self', 'a_sequence', 1, 0],
        ],
    ),

    // --------------------------------------------------------------------------
    // 13. 战术弩类 (crossbow) - 远程伤害，单手机械
    // 特性：攻击 1 AP；副手为空获命中加成；平直高初速弹道；提供战术装填机制。
    // --------------------------------------------------------------------------
    makeAtk(
        'crossbow',
        'bolt',
        '弩击',
        '释放滑轮合金弩臂蓄积的机械高张力，使平直重矢破空击出，极佳的弹道稳定性提升本次命中质量。',
        1,
        [
            ['self', 'aim', 1, 0],
        ],
    ),
    makeUtil(
        'crossbow',
        'rearm',
        '战术上弦',
        '踩踏脚蹬拉动机簧上弦并压入合金弩矢，校正游标尺，为下一波精确击发储备暴击增益。',
        1,
        [
            ['self', 'crit_chance', 15, 1],
        ],
    ),

    // --------------------------------------------------------------------------
    // 14. 战术弓类 (bow) - 远程伤害，双手冷兵器
    // 特性：攻击 1 AP；静默射击，无枪口噪音，不额外推高深渊环境危险度。
    // --------------------------------------------------------------------------
    makeAtk(
        'bow',
        'loose',
        '射击',
        '张弓满月无声施放高分子箭矢，在深渊寂静中隐蔽抹杀目标，弹道不引起空间涟漪。',
        1,
    ),
    makeUtil(
        'bow',
        'draw_breath',
        '调息蓄势',
        '沉肩拉弓，在微光中感知气流与引力扰动，调整呼吸节奏，使下一击的命中与暴击杀伤更为集中。',
        1,
        [
            ['self', 'aim', 1, 0],
            ['self', 'crit_bonus', 3, 0],
        ],
    ),

    // --------------------------------------------------------------------------
    // 15. 投掷类 (throw) - 远程伤害，单手消耗/投射
    // 特性：攻击 1 AP；干扰战场节奏，施加位移与环境阻碍。
    // --------------------------------------------------------------------------
    makeAtk(
        'throw',
        'hurl',
        '投掷',
        '精准抛掷战术破片弹或高爆炸药，爆风与破片在目标脚下炸裂，剧烈冲击其行进节奏。',
        1,
        [
            ['single_enemy', 'speed', -1, 1],
        ],
    ),
    makeUtil(
        'throw',
        'smoke_screen',
        '阻滞投掷',
        '掷出燃烧物或催泪阻滞剂，释放刺激性浓烟笼罩前方网格，降低敌方全员的索敌瞄准精度。',
        1,
        [
            ['all_enemies', 'aim', -2, 1],
        ],
    ),

    // --------------------------------------------------------------------------
    // 16. 法术类 (magic) - 即时伤害，单手超常武器
    // 特性：攻击 1 AP；range = 0（无弹道衰减）；无视目标常规物理护甲，结算高维真实伤害。
    // --------------------------------------------------------------------------
    makeAtk(
        'magic',
        'cast',
        '施法',
        '以血肉或神经突触为媒介引动深渊以太，投射出一道跳脱物理三维常数的不可名状侵蚀射流。',
        1,
    ),
    makeUtil(
        'magic',
        'channel',
        '深渊引导',
        '将意识与深渊回响共振短暂停驻，接引微弱高维能量，激化下一次施法的破坏力并编织一层因果护盾。',
        1,
        [
            ['self', 'damage', 3, 0],
            ['self', 'shield', 5, 1],
        ],
    ),
])

// ==============================================================================
// 武器战术索引字典与工具链
// ==============================================================================

/**
 * 武器类型到战术列表的映射字典（预编译静态索引，实现 O(1) 访问）
 */
export const WEAPON_OWN_TACTICS_MAP: Readonly<Record<WeaponType, readonly WeaponOwnTactic[]>> = Object.freeze(
    weaponOwnTactics.reduce<Record<WeaponType, WeaponOwnTactic[]>>((acc, tactic) => {
        const key = tactic.weaponOwn
        if (!acc[key]) {
            acc[key] = []
        }
        acc[key].push(tactic)
        return acc
    }, {} as Record<WeaponType, WeaponOwnTactic[]>),
)

/**
 * 根据武器类型列表提取所有可用的专属战术集合
 * 常用于实体双持（主手+副手）装备时批量装配战术
 */
export const getWeaponOwnTactics = (
    weaponTypes: ReadonlyArray<WeaponType>,
): WeaponOwnTactic[] => {
    const types = new Set(weaponTypes)
    return weaponOwnTactics.filter(t => types.has(t.weaponOwn))
}

/**
 * 获取指定单武器类型持有的所有战术列表
 */
export const getTacticsByWeaponType = (
    weaponType: WeaponType,
): readonly WeaponOwnTactic[] => {
    return WEAPON_OWN_TACTICS_MAP[weaponType] ?? []
}

/**
 * 获取指定武器类型的主力攻击战术 ('A')
 */
export const getWeaponAttackTactic = (
    weaponType: WeaponType,
): WeaponOwnTactic | undefined => {
    return (WEAPON_OWN_TACTICS_MAP[weaponType] ?? []).find(t => t.type === 'A')
}

/**
 * 获取指定武器类型的防御战术 ('D')（如盾牌、双手重盾、双手长矛等）
 */
export const getWeaponDefenseTactic = (
    weaponType: WeaponType,
): WeaponOwnTactic | undefined => {
    return (WEAPON_OWN_TACTICS_MAP[weaponType] ?? []).find(t => t.type === 'D')
}

/**
 * 获取指定武器类型的辅助战术 ('U') 列表（如瞄准、上弦、佯攻等）
 */
export const getWeaponUtilityTactics = (
    weaponType: WeaponType,
): WeaponOwnTactic[] => {
    return (WEAPON_OWN_TACTICS_MAP[weaponType] ?? []).filter(t => t.type === 'U')
}

/**
 * 根据战术全局 ID 精确检索武器专属战术
 */
export const findWeaponOwnTacticById = (
    id: string,
): WeaponOwnTactic | undefined => {
    return weaponOwnTactics.find(t => t.id === id)
}