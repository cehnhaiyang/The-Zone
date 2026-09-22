/**
 * type.ts
 * 核心类型字典
 *
 * 约束系统中所有具有明确业务边界的枚举值与字面量联合类型。
 * 本文件驱动各个状态机流转、底层逻辑判断、UI 路由、叙事生成与战斗结算。
 *
 * 设计原则：
 * - 枚举用于具有阶段、等级、生命周期或状态机语义的场景
 * - 字面量联合类型用于轻量标签、路由键、分类键
 * - 所有类型都应保持可序列化、可判别、可穷举
 *
 * @version 2.1.0
 * @see interface.ts
 */

// =====================
// 0. 工具类型 (Utility Types)
// =====================

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

// =====================
// 1. 核心状态与架构 (Core & Architecture)
// =====================

/**
 * 根状态机指令集
 *
 * 决定顶层组件的挂载/卸载，以及游戏主循环当前处于阻塞、激活还是挂起状态。
 * 该状态是全局最高优先级的状态路由之一。
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

/**
 * 基础视觉渲染模式
 *
 * 决定顶层渲染组件以何种视觉滤镜与排版形式传达环境信息。
 *
 * 注意：
 * - 与 VisualViewMode 存在语义重叠（VisualMode 为更偏基础的标签维度）
 */
export type VisualMode = 'bio' | 'camera'

// =====================
// 2. 实体、属性与状态 (Entities, Attributes & States)
// =====================

/**
 * 实体六维
 */
export type AttributeType =
    | 'strength'  // 力量：影响近战伤害、背包格子
    | 'agility'   // 敏捷：影响速度、闪避、行动顺序
    | 'wisdom'    // 智慧：全面影响方方面面
    | 'awareness' // 觉知：影响搜查、命中、暴击；更高的觉知会导致理智消耗更快；达到 50 后，觉醒序列预测能力
    | 'will'      // 意志：影响各种事项的理智衰减速率及magic武器的伤害；儿童的意志在5左右，成年人10左右
    | 'cthulhu'   // 克苏鲁/不可知力：随着区域探索、遭遇的克苏鲁敌人数量的增加而自动提升；在使用 fleshFusionState、cognitiveErosionState、causalInversionState 高的物品时获得更多加成且受到更少负面影响

/**
 * 最大体征阈值键
 *
 * 决定实体在绝对满载状态下的生存指标上限。
 */
export type VitalType =
    | 'maxHp'      // 生命上限
    | 'maxSanity'  // 理智上限
    | 'maxStamina' // 体力上限
    | 'maxVigor'   // 精力上限

/**
 * 动态体征状态键
 *
 * 标记实体在运行时的即时生存压力读数。
 * 与 VitalType 配套映射，用于状态计算、叙事反馈与 UI 展示。
 */
export type DynamicVitalType =
    | 'hp'          // 当前生命
    | 'sanity'      // 当前理智
    | 'stamina'     // 当前体力
    | 'vigor'       // 当前精力

/**
 * 实体体征状态变化趋势
 */
export type StateTrend =
    | 'improving'  // 提高
    | 'declining'  // 衰减
    | 'stable'     // 稳定

/**
 * 情感基调引擎指令
 *
 * 用于叙事生成时的语气锚定，约束 LLM 输出的遣词造句与氛围倾角。
 */
export type EmotionalTone =
    | 'hopeful'     // 希望
    | 'desperate'   // 绝望
    | 'anxious'     // 焦虑
    | 'numb'        // 麻木
    | 'determined'  // 坚定

// =====================
// 3. 交互与社交系统 (Interaction & Social)
// =====================

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
 */
export type TrustPhase = '猜忌' | '防备' | '审慎' | '浅合' | '长盟'

/**
 * 好感阶段
 */
export type AffinityPhase = '离心' | '芥蒂' | '相敬' | '相得' | '同气'

// =====================
// 4. 物品、装备与经济系统
// =====================

/** 
 * 主轴：品质
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
 */
export type AccessoryEffectType = AttributeType | VitalType

/**
 * 消耗品效果类型
 */
export type ConsumableEffectType = AccessoryEffectType | DynamicVitalType
    | 'battery'   // 补充神经链接仪电量
    | 'integrity' // 修复神经链接仪完整度

/**
 * 武器类型
 */
export type WeaponType =
    /**
     * 挥动类
     * 近程伤害
     * 单手武器
     * 特性：
     * 1、另一手为空则获得伤害与命中加成（攻击序列质量提升）
     * 2、攻击时，除对主要目标造成伤害外，还同时对目标所处格子内的其他目标造成等同于`本次攻击判定值 ÷ 其他目标数`的伤害（向上取整）
     */
    | 'wave'
    /**
     * 双手挥动类
     * 近程伤害
     * 双手武器
     * 特性：
     * 1、攻击时，除对主要目标造成伤害外，还同时对目标所处格子内的其他目标造成等同于`本次攻击判定值 ÷ 其他目标数`的伤害（向上取整）
     * 2、防御序列质量下降
     */
    | 'both_wave'
    /**
     * 刺击类
     * 近程伤害
     * 单手武器
     * 特性：
     * 1、另一手为空则获得伤害与命中加成（攻击序列质量提升）
     * 2、攻击序列的判定结果为 `crit` 时，无视目标全部 `defense` 
     * 3、攻击序列的 `crit` 权重提升、`hit` 权重降低、`miss` 权重不变
     */
    | 'prick'
    /**
     * 双手刺击类
     * 近程伤害
     * 双手武器
     * 特性：
     * 1、攻击序列的判定结果为 `crit` 时，无视目标全部 `defense` 
     * 2、攻击序列的 `crit` 权重提升、`hit` 权重降低、`miss` 权重不变
     * 3、防御序列质量下降
     * 
     * 任意敌方单位进入攻击范围时，立刻进行 1 次不消耗AP的攻击序列判定，并执行其结果
     */
    | 'both_prick'
    /**
     * 盾牌类
     * 近程伤害
     * 单手武器
     * 特性：
     * 1、另一手为空则获得伤害与命中加成（攻击序列质量提升）
     * 2、装备盾牌类武器时，防御序列的 `partial` 的值可达到 1
     */
    | 'shield'
    /**
     * 双手盾牌类
     * 近程伤害
     * 双手武器
     * 特性：
     * 1、装备双手盾牌类武器时，防御序列的 `partial` 的值可达到 1
     * 2、防御序列不再出现 `dodge` 与 `fail` 
     */
    | 'both_shield'

    /**
     * 狙击步枪类
     * 远程伤害
     * 双手武器
     * 特性：
     * 1、攻击前可消耗 1 AP 瞄准，使下一次攻击序列的判定结果提升 1 档（`miss → graze → hit → crit`），若原结果为 `crit` 则伤害翻倍
     * 2、暴击时无视目标 0.3 `defense`
     * 3、在对攻击序列的判定结果进行实际结算时，与目标之间的距离越近，结算结果有越高概率降级（有概率直接从 `crit` 降级为 `miss`），最佳攻击距离为 12 格
     */
    | 'sniper_rifle'
    /**
     * 突击步枪类
     * 远程伤害
     * 双手武器
     * 特性：无
     */
    | 'assault_rifle'
    /**
     * 冲锋枪类
     * 远程伤害
     * 双手武器
     * 特性：攻击序列的结果判定后，若你有剩余 AP，则可消耗 1 点再进行 1 次攻击判定，此行为可重复至你的 AP 耗尽，且所有判定结果取最优者结算。
     */
    | 'smg'
    /**
     * 手枪类
     * 远程伤害
     * 单手武器
     * 特性：
     * 1、另一手为空则获得命中加成（攻击序列 `hit` 与 `crit` 提升，`miss` 与 `graze` 下降）
     * 2、首次攻击前，若你本回合尚未移动，则本次攻击不消耗 AP
     */
    | 'pistol'
    /**
     * 霰弹枪类
     * 远程伤害
     * 双手武器
     * 特性：
     * 1、攻击时，对攻击范围内的所有目标同时造成伤害
     * 2、距离目标越近，攻击伤害越高
     * 3、
     */
    | 'shotgun'
    /**
     * 短管霰弹枪类
     * 远程伤害
     */
    | 'sawed_off'
    /**
     * 弩类
     * 远程伤害
     * 特性：
     * 1、另一手为空则获得命中加成（攻击序列 `hit` 与 `crit` 提升，`miss` 与 `graze` 下降）
     * 2、每次攻击后必须消耗 1 AP 进行一次装填（`rearm`）动作，否则无法再次攻击
     */
    | 'crossbow'
    /**
     * 投掷类
     * 远程伤害
     */
    | 'throw'
    /**
     * 双手弓类
     * 远程伤害
     * 占据双手
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
 * 决定伤害结算时攻击力受什么属性加成
 */
export type WeaponDamageType =
    | 'melee'    // 近程伤害
    | 'range'    // 远程伤害
    | 'instant'  // 即时伤害

// =====================
// 5. 战术、行动与战斗系统 (Tactics, Actions & Combat)
// =====================

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
 */
export type AttackResult = [
    result: 'miss' | 'graze' | 'hit' | 'crit',
    value: number
]

/**
 * 防御结果
 *
 * 元组第一项为防御判定类型，第二项为减伤值
 * - fail: 闪避失败
 * - partial: 部分闪避
 * - dodge: 完全闪避
 */
export type DefenseResult = [
    result: 'fail' | 'partial' | 'dodge',
    value: number
]

/**
 * 战术效果类型
 */
export type TacticEffectType = ConsumableEffectType
    | 'ap'      // 增加或减少行动点
    | 'shield'  // 与免伤无关，是一个独立的护盾字段
    | 'speed'   // 速度
    | 'damage'  // 攻击力
    | 'defense' // 防御力
    | 'evasion' // 闪避力

/**
 * 反击类型
 */
export type CounterType =
    | 'accumulate'  // 蓄反，单槽每积满 5 点即可发起一次询问
    | 'differential' // 差反，受击且速度不小于 10 时可被询问

// =====================
// 6. 系统玩法：任务与解谜
// =====================

/**
 * 任务生命周期标记
 *
 * 控制节点推进是否结算奖励，或阻止已过期事件被再次触发。
 */
export type QuestStatus =
    | 'on'     // 进行中
    | 'done'   // 已完成
    | 'failed' // 已失败

// =====================
// 7. 叙事驱动与世界观 (Narrative & World)
// =====================

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

// =====================
// 8. 表现层：视觉与 UI (Presentation: Visual & UI)
// =====================

/**
 * 视觉渲染管线通道
 *
 * 决定向玩家呈现的媒体是直出的拟真信号还是处理过的数据视图。
 *
 * 与 VisualMode 的区别：
 * - VisualMode 更偏基础模式标签
 * - VisualViewMode 更偏渲染管线通道
 */
export type VisualViewMode = 'camera' | 'bio'

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
    | 'transition'  // 节点过渡
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

// =====================
// 9. 音效类型定义
// =====================

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
 */
export type DotSoundType =

    | 'typing_1'
    | 'typing_2'
    | 'typing_3'

    | 'success'
    | 'fail'
    | 'error'
    | 'search'
    | 'unlock'
    | 'lock'

    | 'item_pickup'
    | 'item_use'
    | 'item_equip'
    | 'item_unequip'
    | 'item_break'

    | 'ui_click'
    | 'ui_hover'
    | 'ui_transition'
    | 'ui_notification'

    | 'tactic_execute'

    | 'combat_miss'
    | 'combat_graze'
    | 'combat_hit'
    | 'combat_crit'
    | 'combat_block'
    | 'combat_buff'
    | 'combat_debuff'

    | 'event_npc_join'
    | 'event_npc_leave'

/**
 * 短音
 * 
 * 比点音更长，有一定的连续性，但不宜过长
 */
export type ShortSoundType =
    | 'terrifying'      // 令人恐惧的
    | 'node_transition' // 过场动画
    | 'zone_enter'      // 进入新区域时

export type SoundType = DotSoundType | ShortSoundType

// =====================
// 10. 底层服务与基建 (Infrastructure & Telemetry)
// =====================

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