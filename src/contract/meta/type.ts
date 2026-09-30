/**
 * 核心类型字典
 *
 * 约束系统中所有具有明确业务边界的枚举值与字面量联合类型。
 *
 * 设计原则：
 * - 枚举用于具有阶段、等级、生命周期或状态机语义的场景
 * - 字面量联合类型用于轻量标签、路由键、分类键
 * - 所有类型都应保持可序列化、可判别、可穷举
 *
 * 分组索引：
 *   0. 工具类型            泛型辅助
 *   1. 根状态机            顶层路由与主循环状态
 *   2. 实体：属性、体征与状态
 *   3. 物品与装备          品质、武器类型、武器伤害类型
 *   4. 战术与战斗          战术、目标、命中 / 防御结果、效果键、反击、位移
 *   5. 交互与社交
 *   6. 任务
 *   7. 叙事与世界观
 *   8. 表现层：视觉、UI 与音频
 *   9. 底层服务与基建      API 通道、模型通道、日志路由
 *
 * @version 2.1.0
 * @see interface.ts
 */

// ==========================
// 0. 工具类型
// ==========================
// 与业务无关的泛型辅助，位于字典最底层。

/**
 * 固定长度数组类型
 *
 * 利用递归与元组长度推断，自动生成包含 N 个 T 类型元素的元组。
 * 主要用于强约束某些固定数量的结构，例如记忆金字塔中的 childIds。
 *
 * @example
 * _Array<string, 5>
 * // 等价于 [string, string, string, string, string]
 */
export type _Array<T, N extends number, R extends unknown[] = []> = R['length'] extends N ? R : _Array<T, N, [T, ...R]>

// ==========================
// 1. 根状态机
// ==========================
// 全局唯一的主循环状态，决定顶层挂载与主循环的阻塞语义。

/**
 * 根状态机指令集
 *
 * 决定顶层组件的挂载 / 卸载，以及游戏主循环当前处于阻塞、激活还是挂起状态。
 * 该状态是全局最高优先级的状态路由之一，值会被持久化，用于恢复现场。
 */
export enum GameState {
    /**
     * 主菜单 / 引导与初始配置阶段
     * 等待实例化指令，尚未进入正式游戏流程
     */
    MAIN_MENU = 0,

    /**
     * 探索进行中
     * 节点遍历与交互求值激活，主循环运行中
     */
    PLAYING = 1,

    /**
     * 庇护所模式
     * 挂起探索压力，转入资源结算与长线规划
     */
    SANCTUARY = 2,

    /**
     * 游戏结束
     * 实例销毁，触发结局收尾逻辑与持久化记录
     */
    GAME_OVER = 3,

    /**
     * 加载态
     * 阻塞态，用于掩盖网络 IO 或大模型生成延迟
     */
    LOADING = 4,

    /**
     * 战斗态
     * 挂起探索循环，压入回合制战斗栈
     */
    COMBAT = 5,

    /**
     * 对话态
     * 锁定玩家移动，聚焦 LLM 会话上下文交互
     */
    DIALOGUE = 6,
}

// ==========================
// 2. 实体：属性、体征与状态
// ==========================
// 角色与敌人的数值维度链路：六维（基准）→ 体征上限 → 当前体征 → 变化趋势。

/**
 * 实体六维
 *
 * 六维值皆无上限，但以0~100为平衡标准
 * 100+为游戏不进行平衡的范围，供玩家与敌人无限成长
 *
 * 六维是实体唯一的基准数值：战斗派生量（行动点、命中、暴击、闪避等）
 * 与叙事推演均从此处出发；战术效果只提供临时修正，不直接改写六维。
 */
export type AttributeType =
    | 'strength'  // 力量：影响近战伤害、背包格子
    | 'agility'   // 敏捷：影响速度、闪避
    | 'wisdom'    // 智慧：智慧影响实体的所有方面
    | 'awareness' // 觉知：影响搜查、命中、暴击；更高的觉知会导致更快的理智消耗；达到 50 后，觉醒序列预测能力
    | 'will'      // 意志：影响各种事项的理智衰减速率及magic武器的伤害；儿童的意志在5左右，成年人10左右
    | 'cthulhu'   // 克苏鲁/不可知力：随着区域探索、遭遇的克苏鲁敌人数量的增加而自动提升；在使用 fleshFusionState、cognitiveErosionState、causalInversionState 高的物品时获得更多加成且受到更少负面影响

/**
 * 最大体征
 *
 * 上限与当前值分离：上限变动（含战术效果）不联动当前动态体征。
 */
export type VitalType =
    | 'maxHp'      // 生命上限
    | 'maxSanity'  // 理智上限
    | 'maxStamina' // 体力上限
    | 'maxVigor'   // 精力上限

/**
 * 动态体征
 *
 * 会随战斗与探索实时增减的当前值；归零判定各自由对应系统负责。
 */
export type DynamicVitalType =
    | 'hp'          // 当前生命
    | 'sanity'      // 当前理智
    | 'stamina'     // 当前体力
    | 'vigor'       // 当前精力

/**
 * 实体体征状态变化趋势
 *
 * 由当前值与上限的比值推定，供叙事模型描述生理演化方向，并驱动状态告警。
 */
export type StateTrend =
    | 'improving'  // 提高
    | 'declining'  // 衰减
    | 'stable'     // 稳定

// ==========================
// 3. 物品与装备
// ==========================
// 物品模板的品质主轴，以及武器专有的类型与伤害类型维度。

/** 
 * 主轴：品质
 *
 * 所有物品模板共用的品质阶梯，由低到高排列。
 */
export type ItemGrade =
    | 'salvaged'     // 1. 废土粗制 / 拼凑残损
    | 'standard'     // 2. 旧世民用 / 规整标准
    | 'reinforced'   // 3. 强治安保 / 加固特勤
    | 'military'     // 4. 正规军工 / 军械制式
    | 'corporate'    // 5. 寡头特材 / 尖端防务
    | 'foundation'   // 6. 基金会机要 / 深层收容
    | 'prototype'    // 7. 试作极境 / 奇点工程
    | 'ark_prime'    // 8. 方舟原铸 / 文明遗珍（纯物理工造巅峰）

/**
 * 饰品效果类型
 *
 * 饰品只作用于六维与体征上限，不直接改动当前体征。
 */
export type AccessoryEffectType = AttributeType | VitalType

/**
 * 消耗品效果类型
 *
 * 相对饰品放开到动态体征，并可补足 / 修复神经链接仪的电量与完整度。
 */
export type ConsumableEffectType = AccessoryEffectType | DynamicVitalType
    | 'battery'   // 补充神经链接仪电量
    | 'integrity' // 修复神经链接仪完整度

/**
 * 武器类型
 *
 * 按伤害通道分为三族——
 * - 近程：`wave` / `both_wave` / `prick` / `both_prick` / `shield` / `both_shield`
 * - 远程：`sniper_rifle` / `assault_rifle` / `smg` / `pistol` / `shotgun` / `sawed_off` / `crossbow` / `throw` / `bow`
 * - 即时：`magic`
 *
 * 按手持又分单手与双手：单手在另一手为空时获得加成，双手以更差的防御序列或
 * 更低的收益换取更高基础值。
 *
 * 相较于双手/刺击类，双手/挥动类武器总是有更高的命中，及更低的暴击率；
 * 没有引擎层面的硬编码，但需要在实际的物品设计中体现这一点。
 *
 * 各分支的「特性」即为引擎契约，其落地实现见 tools.ts 第 15.1 节
 * （`WeaponTrait` 与 `WEAPON_TRAITS`）与第 18 节的判定链路。
 */
export type WeaponType =
    /**
     * 挥动类
     * 近程伤害
     * 单手武器
     *
     * 特性：
     * 1. 另一手为空则获得伤害与命中加成（攻击序列质量提升）
     * 2. 攻击时会直接向目标冲刺，冲刺格子数最大为实体当前 AP，每多冲刺 1 格，伤害提升 1，
     *    因此挥动类武器的实际攻击距离为 `当前 AP` + `武器自身攻击距离` 格
     */
    | 'wave'
    /**
     * 双手挥动类
     * 近程伤害
     * 双手武器
     *
     * 特性：
     * 1. 攻击时会直接向目标冲刺，冲刺格子数最大为实体当前 AP，每多冲刺 1 格，伤害提升 2，
     *    因此双手挥动类武器的实际攻击距离为 `当前 AP` + `武器自身攻击距离` 格
     * 2. 防御序列质量下降
     */
    | 'both_wave'
    /**
     * 刺击类
     * 近程伤害
     * 单手武器
     *
     * 特性：
     * 1. 另一手为空则获得伤害与命中加成（攻击序列质量提升）
     * 2. 攻击时会直接向目标冲刺，冲刺格子数最大为实体当前 AP，每多冲刺 1 格，伤害提升 1，
     *    因此刺击类武器的实际攻击距离为 `当前 AP` + `武器自身攻击距离` 格
     */
    | 'prick'
    /**
     * 双手刺击类
     * 近程伤害
     * 双手武器
     *
     * 特性：
     * 1. 攻击时会直接向目标冲刺，冲刺格子数最大为实体当前 AP，每多冲刺 1 格，伤害提升 2，
     *    因此双手刺击类武器的实际攻击距离为 `当前 AP` + `武器自身攻击距离` 格
     * 2. 防御序列质量下降
     */
    | 'both_prick'
    /**
     * 盾牌类
     * 近程伤害
     * 单手武器
     *
     * 特性：
     * 1. 另一手为空则获得伤害与命中加成（攻击序列质量提升）
     * 2. 攻击时会直接向目标冲刺，冲刺格子数最大为实体当前 AP，每多冲刺 1 格，伤害提升 1，
     *    因此盾牌类武器的实际攻击距离为 `当前 AP` + `武器自身攻击距离` 格
     * 3. 装备盾牌类武器时，防御序列的 `partial` 的值可达到 1
     */
    | 'shield'
    /**
     * 双手盾牌类
     * 近程伤害
     * 双手武器
     *
     * 特性：
     * 1. 攻击时会直接向目标冲刺，冲刺格子数最大为实体当前 AP，每多冲刺 1 格，伤害提升 1，
     *    因此双手盾牌类武器的实际攻击距离为 `当前 AP` + `武器自身攻击距离` 格
     * 2. 装备双手盾牌类武器时，防御序列的 `partial` 的值可达到 1
     * 3. 防御序列不再出现 `dodge` 与 `fail`
     */
    | 'both_shield'

    /**
     * 狙击步枪类
     * 远程伤害
     * 双手武器
     *
     * 特性：
     * 1. 暴击时无视目标 0.3 `defense`
     * 2. 在对攻击序列的判定结果进行实际结算时，与目标之间的距离越近，结算结果有越高概率降级
     *    （有概率直接从 `crit` 降级为 `miss`），最佳攻击距离为 12 格
     *
     * 专属战术：U类型。消耗 1 AP 瞄准，使下一次攻击序列的判定结果提升 1 档
     * （`miss → graze → hit → crit`），若原结果为 `crit` 则伤害翻倍
     */
    | 'sniper_rifle'
    /**
     * 突击步枪类
     * 远程伤害
     * 双手武器
     *
     * 特性：无
     */
    | 'assault_rifle'
    /**
     * 冲锋枪类
     * 远程伤害
     * 双手武器
     *
     * 特性：攻击序列的结果判定后，若你有剩余 AP，则可消耗 1 点再进行 1 次攻击判定，
     * 此行为可重复至你的 AP 耗尽，且所有判定结果取最优者结算。
     */
    | 'smg'
    /**
     * 手枪类
     * 远程伤害
     * 单手武器
     *
     * 特性：
     * 1. 另一手为空则获得命中加成（攻击序列 `hit` 与 `crit` 提升，`miss` 与 `graze` 下降）
     * 2. 首次攻击前，若你本回合尚未移动，则本次攻击不消耗 AP
     */
    | 'pistol'
    /**
     * 霰弹枪类（装备了鸟弹、鹿弹；引擎暂未落地子弹、弹匣、装填系统，待后续扩展）
     * 远程伤害
     * 双手武器
     *
     * 特性：
     * 1. 攻击时，除对主目标造成伤害外，还同时对其周围一片锥形范围内的所有其他目标
     *    造成 `伤害判定值 ÷ 其他目标数` 的伤害
     * 2. 离目标越近，暴击率越高，反之越低，最佳暴击距离为1格，超过4格无法造成暴击
     */
    | 'shotgun'
    /**
     * 短管霰弹枪类
     * 远程伤害
     * 单手武器
     *
     * 特性：
     * 1. 另一手为空则获得命中加成（攻击序列 `hit` 与 `crit` 提升，`miss` 与 `graze` 下降）
     * 2. 攻击时，除对主目标造成伤害外，还同时对其周围一片锥形范围内的所有其他目标
     *    造成 `伤害判定值 ÷ 其他目标数` 的伤害
     * 3. 离目标越近，暴击率越高，反之越低，最佳暴击距离为1格，超过3格无法造成暴击
     */
    | 'sawed_off'
    /**
     * 弩类
     * 远程伤害
     * 单手武器
     *
     * 特性：另一手为空则获得命中加成（攻击序列 `hit` 与 `crit` 提升，`miss` 与 `graze` 下降）
     */
    | 'crossbow'
    /**
     * 投掷类
     * 远程伤害
     * 单手武器
     *
     * 特性：无
     */
    | 'throw'
    /**
     * 弓类
     * 远程伤害
     * 双手武器
     *
     * 特性：无
     */
    | 'bow'

    /**
     * 法术类
     * 即时伤害
     * 单手武器
     * 特性：无
     */
    | 'magic'

/**
 * 武器伤害类型
 *
 * 决定伤害结算时攻击力受什么属性加成：
 * - `melee` 近程：完整继承实体力量（命中基准 + 力量，暴击加成 + 力量）；
 * - `range` 远程：只吃武器自身伤害，实体力量不参与；
 * - `instant` 即时：法术通道，与远程同口径（伤害取武器 / 法术自身）。
 *
 * 口径与实现见 tools.ts `getAttackDamageScale`。
 */
export type WeaponDamageType =
    | 'melee'    // 近程伤害
    | 'range'    // 远程伤害
    | 'instant'  // 即时伤害

// ==========================
// 4. 战术与战斗
// ==========================
// 一次攻防的完整词表：战术分类 → 目标路由 → 行为倾向 / 意图 → 判定结果 → 效果键 → 反击 → 位移。

/**
 * 战术大类
 *
 * - A：攻击战术，读取攻击序列，走完整攻击链路；
 * - D：防御战术，读取防御序列，进入防御判定；
 * - U：辅助战术，增益、位移、武器专属操作等，不产生攻防判定。
 */
export type TacticType =
    | 'A' // 攻击战术
    | 'D' // 防御战术
    | 'U' // 辅助战术

/**
 * 目标选择类型
 *
 * 用于技能、战术、消耗品与状态效果的目标路由。
 */
export type Target =
    | 'self'             // 自身
    | 'single_teammate'  // 单个同伴
    | 'all_teammates'    // 所有同伴
    | 'single_ally'      // 单个友方
    | 'all_allies'       // 所有友方
    | 'single_enemy'     // 单个敌人
    | 'all_enemies'      // 所有敌人
    | 'none'             // 无目标

/**
 * 战斗风格
 *
 * 决定角色在战斗中的行为倾向与 AI 权重分布。
 */
export type CombatStyle =
    | 'burst'     // 爆发：优先高伤害窗口
    | 'attack'    // 进攻：持续压制
    | 'balance'   // 均衡：攻防兼顾
    | 'defense'   // 防守：减伤、生存、防守反击
    | 'skirmish'  // 游击：机动、骚扰、消耗

/**
 * 敌方意图类型
 *
 * 用于战斗 AI 的意图暴露与回合预告。
 */
export type IntentType =
    | 'attack'    // 攻击
    | 'defense'   // 防御
    | 'buff'      // 增益自身或友方
    | 'debuff'    // 减益玩家或友方
    | 'observe'   // 观察 / 蓄力 / 等待

/**
 * 攻击结果
 *
 * 元组第一项为命中档位，第二项为该档位的判定值：
 * - 命中阶梯顺序为 `miss < graze < hit < crit`，升降档按此顺序整档移动；
 * - `miss` 判定值为 0，`graze` 取命中值对半，`hit` 取攻击基准，`crit` 取暴击上限。
 */
export type AttackResult = [
    result: 'miss' | 'graze' | 'hit' | 'crit',
    value: number
]

/**
 * 防御结果
 *
 * 元组第一项为防御判定类型，第二项为减伤值：
 * - fail: 闪避失败，不减伤
 * - partial: 部分减伤，常规武器上限定于 1 以下，盾牌类可达到 1
 * - dodge: 完全闪避，减伤 1
 */
export type DefenseResult = [
    result: 'fail' | 'partial' | 'dodge',
    value: number
]

/**
 * 战术效果类型
 *
 * 战术效果产生的都是非永久的动态效果；
 * 因此不直接提供对属性的修改；
 * 战斗结束时，即使还有持续回合也会移除。
 *
 * 按落地方式分为四组——
 * - 写入型：动态体征 / 体征上限 / `ap` / `shield`，直接改动动态态
 *   （体征上限增加时不会同步增加当前动态体征，减少同理）；
 * - 结果修正类：`speed` / `damage` / `aim` / `crit_chance` / `crit_bonus` /
 *   `defense` / `evasion`，存于战斗状态，判定与结算时聚合读取；
 * - 序列修正类：`a_sequence` / `d_sequence`，同样存于战斗状态，按判定或回合消耗；
 * - 位移类：`left` / `right` / `up` / `down`，由引擎按战场坐标即时执行。
 *
 * 战术效果以元组 `[目标, 效果键, 数值, 持续]` 声明（见 interface.ts `_Tactic`），
 * 数值与持续的语义随效果键而变：
 * - 序列修正：数值为档位偏移（正升负降）；持续 > 0 表示生效 number 次判定、
 *   为 0 表示仅在当前回合的下一个结果判定时生效、为负表示持续 number 的绝对值个回合（包括当前回合）；
 * - 其余效果：数值为增减量；持续按回合结算，归零即到期，为 0 表示仅当前回合。
 */
export type TacticEffectType = DynamicVitalType
    | VitalType     // 体征上限增加时不会同步增加当前动态体征，减少同理
    | 'ap'          // 增加或减少行动点
    | 'shield'      // 与免伤无关，是一个独立的护盾字段
    | 'speed'       // 速度
    | 'damage'      // 攻击力
    | 'aim'         // 命中
    | 'crit_chance' // 暴击率
    | 'crit_bonus'  // 暴击伤害
    | 'defense'     // 防御力
    | 'evasion'     // 闪避力
    | 'left'        // 左位移（向后撤）
    | 'right'       // 右位移（向前突）
    | 'a_sequence'  // 攻击序列修改
    | 'd_sequence'  // 防御序列修改

/**
 * 反击类型
 *
 * 预支额度、立即行动窗口与配额口径见 interface.ts `CounterAdvanceRequest`。
 */
export type CounterType =
    | 'accumulate'  // 蓄反，单槽每积满 5 点即可发起一次询问
    | 'differential' // 差反，受击且速度不小于 10 时可被询问

/** 
 * 四向位移
 * forward = 纵深推进
 * backward = 纵深撤离
 * lane_left / lane_right = 换轨。 */
export type MoveDirection = 'forward' | 'backward' | 'lane_left' | 'lane_right'

// ==========================
// 5. 交互与社交
// ==========================
// 焦点交互的路由键与 NPC 关系维度（情绪边界、信任阶段、好感阶段）。

/**
 * 焦点交互类型
 *
 * 决定交互钩子（Hook）应读取哪个子系统的解析逻辑。
 */
export type InteractionType =
    | 'interact_npc'  // 与 NPC 交互
    | 'interact_obj' // 与物件交互

/**
 * 情绪基准锚点（基于 Ekman 六模）
 *
 * 用于限制大模型生成对话时的情感边界，防止角色行为偏离当前语境。
 */
export type Mood =
    | 'happy'
    | 'sad'
    | 'angry'
    | 'fearful'
    | 'surprised'
    | 'neutral'

/**
 * 信任阶段
 *
 * 由信任数值区间映射出的五阶段标签（低 → 高），
 * 用于选择 NPC 对话指令与 UI 阶段标识。
 */
export type TrustPhase = '猜忌' | '防备' | '审慎' | '浅合' | '长盟'

/**
 * 好感阶段
 *
 * 由好感数值区间映射出的五阶段标签（低 → 高），
 * 与信任阶段相互独立，共同描述关系状态。
 */
export type AffinityPhase = '离心' | '芥蒂' | '相敬' | '相得' | '同气'

// ==========================
// 6. 任务
// ==========================

/**
 * 任务生命周期标记
 *
 * 控制节点推进是否结算奖励，或阻止已过期事件被再次触发。
 */
export type QuestStatus =
    | 'on'     // 进行中
    | 'done'   // 已完成
    | 'failed' // 已失败

// ==========================
// 7. 叙事与世界观
// ==========================
// 叙事链的运行口径（模式、节奏、状态、阶段）与 LLM 输出的基调锚定。

/**
 * 叙事模式
 *
 * 决定全局状态是跨越多个维度的长线追踪，还是即插即用的短平快结算。
 */
export type NarrativeMode =
    | 'chain'     // 链式叙事：长线推进、伏笔网络、暗线归档
    | 'episodic' // 单元剧叙事：单区域/单事件闭环

/**
 * 叙事节奏
 *
 * 控制伏笔生成密度、张力积累速度以及节点展开的紧迫感。
 */
export type NarrativePacing =
    | 'slow'     // 慢热：铺垫多，张力积累缓慢
    | 'balanced' // 均衡：标准曲线
    | 'fast'     // 快节奏：冲突更早出现
    | 'psych'   // 心理向：更强调精神压力与认知扰动

/**
 * 叙事链状态
 *
 * 控制当前主线进度是挂载于内存持续演算、置入暂存区、还是转为只读归档。
 */
export type StoryArcStatus =
    | 'ongoing'    // 进行中
    | 'suspended'  // 挂起 / 暂存
    | 'concluded' // 已完结

/**
 * 叙事阶段
 *
 * 极为重要。
 * 约束 LLM 针对当前节点的行文风格，强行引导剧情走势。
 */
export type NarrativePhase =
    | 'setup'       // 铺垫期
    | 'rising'      // 上升期
    | 'climax'      // 高潮期
    | 'falling'     // 回落期
    | 'resolution' // 收束期

/**
 * 情感基调引擎指令
 *
 * 用于叙事生成时的语气锚定，约束 LLM 输出的遣词造句与氛围倾角，
 * 同时供语音合成选择语气效果（见 `AudioService/speech.ts`）。
 */
export type EmotionalTone =
    | 'hopeful'     // 希望
    | 'desperate'   // 绝望
    | 'anxious'     // 焦虑
    | 'numb'        // 麻木
    | 'determined'  // 坚定

// ==========================
// 8. 表现层：视觉、UI 与音频
// ==========================
// 呈现通道的标签：视觉模式 → UI 路由键 → 音频类型。

// --------------------------
// 8.1 视觉模式
// --------------------------

/**
 * 基础视觉渲染模式
 *
 * 决定顶层渲染组件以何种视觉滤镜与排版形式传达环境信息。
 * 值存放于玩家状态，渲染分支与神经链接仪底噪均读取它。
 */
export type VisualMode = 'bio' | 'camera'

/**
 * 视觉渲染管线通道
 *
 * 决定向玩家呈现的媒体是直出的拟真信号还是处理过的数据视图。
 *
 * 与 VisualMode 的区别：
 * - VisualMode 更偏基础模式标签
 * - VisualViewMode 更偏渲染管线通道
 *
 * 注：两者语义重叠，当前渲染层统一读 VisualMode，本类型暂无消费方，
 * 保留作管线维度的标签位。
 */
export type VisualViewMode = 'camera' | 'bio'

// --------------------------
// 8.2 UI 路由与面板
// --------------------------

/**
 * 媒体资产基类
 *
 * 确定底层渲染采用的 DOM 标签及其对应的预加载、播放策略。
 */
export type AssetType = 'image' | 'video'

/**
 * 顶层遮罩模态
 *
 * 屏蔽下层点击事件，强制接管视觉焦点以传达不可中断的系统级状态。
 */
export type OverlayType =
    | 'menu'        // 主菜单
    | 'cutscene'    // 过场动画
    | 'gameover'    // 游戏结束
    | 'zone_gen'    // 区域生成

/**
 * HUD 信息流路由
 *
 * 决定在受限屏幕区域内挂载哪一个功能面板组件。
 */
export type VisorPanelType =
    | 'visual'     // 视觉主视图
    | 'Vital'      // 体征面板
    | 'inventory'  // 物品栏
    | 'archives'  // 档案 / 记录

/**
 * NPC 交互面板索引
 *
 * 分离闲聊、交易与任务委派逻辑视图，避免状态混杂。
 */
export type NPCTabMode =
    | 'interaction'  // 对话 / 交互
    | 'inventory'    // 交易 / 物品
    | 'quest'       // 任务

/**
 * 视觉元数据注入键
 *
 * 约定哪些场景变量允许叠加在动态视觉画面的文字图层中。
 */
export type VisualComponentKey =
    | 'zoneName'     // 区域名
    | 'nodeName'     // 节点名
    | 'threatLevel'  // 威胁等级
    | 'desc'        // 描述文本

// --------------------------
// 8.3 音效
// --------------------------

/**
 * 环境音主题
 */
export type ThemeType =
    | 'sanctuary'      // 庇护所
    | 'combat'         // 战斗中
    | 'panic'          // 恐慌（低理智时）
    | 'death'          // 死亡界面
    | 'zone_gen'       // 于LLM生成新区域的等待界面使用的主题音乐
    | 'neural_static'  // 神经链接仪底噪（大小与噪声等级有关）（仅当当前视觉模式处于camera时生效）
    | 'puzzle_ambient' // 解谜时的思考氛围
    | 'dangerous'      // 节点威胁度极高（大于15）时触发主题

/**
 * 点（脉冲）音
 *
 * 短促、可叠加的即时反馈音。
 */
export type DotSoundType =

    // 打字机
    | 'typing_1'
    | 'typing_2'
    | 'typing_3'

    // 通用反馈
    | 'success'
    | 'fail'
    | 'error'
    | 'search'
    | 'unlock'
    | 'lock'

    // 物品操作
    | 'item_pickup'
    | 'item_use'
    | 'item_equip'
    | 'item_unequip'
    | 'item_break'

    // UI 交互
    | 'ui_click'
    | 'ui_hover'
    | 'ui_transition'
    | 'ui_notification'

    // 战术与战斗
    | 'tactic_execute'

    | 'combat_miss'
    | 'combat_graze'
    | 'combat_hit'
    | 'combat_crit'
    | 'combat_block'
    | 'combat_buff'
    | 'combat_debuff'

    // 事件
    | 'event_npc_join'
    | 'event_npc_leave'

/**
 * 短音
 *
 * 比点音更长，有一定的连续性，但不宜过长。
 */
export type ShortSoundType =
    | 'terrifying'      // 令人恐惧的
    | 'node_transition' // 过场动画
    | 'zone_enter'      // 进入新区域时

export type SoundType = DotSoundType | ShortSoundType

// ==========================
// 9. 底层服务与基建
// ==========================
// 对外请求与对内输出的通道路由键：API 供应商 → 模型通道 → 日志路由。

/**
 * API 供应商路由标识
 *
 * 决定大模型或第三方服务请求对应的基建代理通道。
 */
export type ApiPlatform =
    | 'groq'
    | 'zhipu'
    | 'pollinations'
    | 'deapi'
    | 'qwenstudio'
    | 'volcengine'
    | 'nvidia'

/**
 * 模型大类键名
 *
 * 严格映射至底层模型调度中心（Model Registry）的可用调用通道。
 * 通常与 Settings 中的模型配置项一一对应。
 */
export type ModelCategory =
    | 'world'        // 世界/区域生成
    | 'npcDialogue'  // NPC 对话生成
    | 'npcReaction'  // NPC 反应生成
    | 'dyNarrative'  // 动态叙事生成
    | 'sanctuaryEvent'  // 庇护所日常事件生成
    | 'facilityUpgrade' // 设施升级废料定价
    | 'image'        // 图像生成
    | 'video'        // 视频生成
    | 'speech'       // 语音生成

/**
 * 日志路由标签
 *
 * 决定消息在控制台的堆叠规则、优先级以及渲染过滤层级。
 * 也用于区分系统日志、叙事日志、战斗日志与异常诊断日志。
 */
export type LogType =
    // 系统运行时诊断与反馈
    | 'info'
    | 'command'
    | 'warning'
    | 'critical'

    // 叙事大屏与环境上下文推送
    | 'cinematic'
    | 'event'
    | 'environment'

    // 玩法收益与战斗检定结果
    | 'combat'
    | 'loot'
    | 'success'

    // 动态内容标记与认知扰动注入
    | 'ai-gen'
    | 'hallucination'
    | 'mental'
