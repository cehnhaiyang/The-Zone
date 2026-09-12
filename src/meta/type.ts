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
 * @see interface.copy.ts
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
export type _Array<T, N extends number, R extends unknown[] = []> =
    R['length'] extends N ? R : _Array<T, N, [T, ...R]>

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
 * 基础属性类型
 *
 * 决定实体的五维修正基数，直接参与检定、派生属性计算与战斗结算。
 */
export type AttributeType =
    | 'strength'    // 力量：影响近战伤害、负重、物理检定
    | 'agility'     // 敏捷：影响速度、闪避、行动顺序
    | 'wisdom'      // 智慧：影响学习、推理、精神抗性
    | 'perception'  // 感知：影响搜查、预警、命中与暴击
    | 'spiritual'   // 灵性

/**
 * 最大体征阈值键
 *
 * 决定实体在绝对满载状态下的生存指标上限。
 */
export type VitalType =
    | 'maxHp'       // 生命上限
    | 'maxSanity'   // 理智上限
    | 'maxStamina'  // 体力上限
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
 * 实体状态变化趋势
 *
 * 提供给动态叙事模型，用以研判角色生理与心理的衰减或恢复倾向。
 */
export type StateTrend =
    | 'improving'   // 正在恢复 / 好转
    | 'declining'   // 正在恶化 / 衰减
    | 'stable'     // 基本稳定

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

/**
 * 状态恶化分级
 *
 * 提供给 LLM 的离散化状态标签，用于改变文本生成的基调与紧迫感。
 */
export enum SeverityLevel {
    /**
     * 危急
     * 触发生存倒计时或理智崩溃边缘判定
     */
    CRITICAL = 'critical',

    /**
     * 严重
     * 触发高优先级告警 UI 与文本渲染
     */
    SEVERE = 'severe',

    /**
     * 中度
     * 常规减益，不强制中断当前操作
     */
    MODERATE = 'moderate',

    /**
     * 正常
     * 无影响，维持基准运行
     */
    NORMAL = 'normal'
}

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
 * 信任度阶段标记
 *
 * 作为对话树分支判断的前提条件，决定 NPC 的行为模型及资源倾斜度。
 */
export enum RelationshipPhase {
    /**
     * 敌意
     * 拒绝常规交互，可能主动触发敌对事件
     */
    HOSTILE = '敌意',

    /**
     * 戒备
     * 信息获取受限，交易价格惩罚
     */
    GUARDED = '戒备',

    /**
     * 中立
     * 标准交互基准线
     */
    NEUTRAL = '中立',

    /**
     * 熟识
     * 解锁次级私人话题，解锁部分区域提示
     */
    FAMILIAR = '熟识',

    /**
     * 信任
     * 解锁核心剧情伏笔，提供主动增益
     */
    TRUSTING = '信任',

    /**
     * 羁绊
     * 无视理智值惩罚协助，容忍度达到最大
     */
    BONDED = '羁绊'
}

// =====================
// 4. 物品、装备与经济系统
// =====================

/**
 * 物品稀有度
 */
export type ItemRarity =
    | 'salvaged'      // 回收：废墟、尸体、二手设备中扒出的失稳物资
    | 'standard'      // 标准：安全但弱小
    | 'reliable'      // 可靠：稳定可靠
    | 'organized'     // 组织：组织级资源
    | 'foundation'    // 基金会：深渊基金会受控列装
    | 'deep'          // 深层：深层科技
    | 'prototype'     // 原型：受控顶级科技
    | 'ark'           // 方舟：方舟核心储备 / 降临前顶层资源
    | 'abyssal'       // 深渊：失控深渊产物
    | 'forbidden'     // 禁忌：认知危害与真相
    | 'ineffable'     // 不可名状：彼侧信息实体化，理解即代价

/**
 * 饰品效果类型
 */
export type AccessoryEffectType = AttributeType | VitalType

/**
 * 消耗品效果类型
 */
export type ConsumableEffectType =
    | AccessoryEffectType

    // 实体生存指标干预
    | 'heal_hp'
    | 'heal_sanity'
    | 'heal_stamina'
    | 'heal_vigor'

    // 神经链接外设指标干预
    | 'restore_battery'
    | 'repair_integrity'

/**
 * 武器类型
 */
export type WeaponType =
    /**
     * 法术类
     * 即时伤害
     * 攻击距离无限
     * 攻击时消耗理智而非体力
     */
    | 'magic'
    /**
     * 狙击步枪类
     * 远程伤害
     */
    | 'sniper_rifle'
    /**
     * 突击步枪类
     * 远程伤害
     */
    | 'assault_rifle'
    /**
     * 冲锋枪类
     * 远程伤害
     */
    | 'smg'
    /**
     * 手枪类
     * 远程伤害
     */
    | 'pistol'
    /**
     * 霰弹枪类
     * 远程伤害
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
     * 副手为空则获得命中加成
     * 每次攻击后必须进行一次重装
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
     * 占据主副手
     */
    | 'bow'
    /**
     * 挥动类
     * 近程伤害
     * 副手为空则获得伤害加成
     */
    | 'wave'
    /**
     * 双手挥动类
     * 近程伤害
     * 占据主副手
     * 无视目标0.2免伤
     */
    | 'both_wave'
    /**
     * 刺击类
     * 近程伤害
     * 副手为空则获得伤害加成
     */
    | 'prick'
    /**
     * 双手刺击类
     * 近程伤害
     * 占据主副手
     */
    | 'both_prick'

/**
 * 武器伤害类型
 *
 * 仅决定伤害结算时攻击力受什么属性加成：
 * - cold：冷兵器，攻击力叠加力量。
 * - hot：热武器，攻击力不叠加属性。
 * - instant：即时，跳过常规结算。
 *
 * 攻击距离由武器自身的 range 字段维护，与本类型无关。
 */
export type WeaponDamageType =
    | 'cold'     // 冷兵器
    | 'hot'      // 热武器
    | 'instant'  // 即时

/**
 * 庇护所状态字典键契约
 *
 * 统管庇护所内部生存资源库存与微型社会稳定性读数。
 */
export type SanctuaryState = Record<
    | 'food'        // 食物储备
    | 'water'       // 水源储备
    | 'medicine'    // 医疗物资
    | 'electricity' // 电力
    | 'scraps'      // 废料 / 工程材料
    | 'population'  // 人口
    | 'morale'      // 士气
    | 'erosion',    // 侵蚀程度
    number
>

// =====================
// 5. 战术、行动与战斗系统 (Tactics, Actions & Combat)
// =====================

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
    | 'enemy'            // 单个敌人
    | 'all_enemies'      // 所有敌人
    | 'none'            // 无目标

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
 * 元组第一项为命中等级，第二项为伤害值
 * - miss: 未命中，值通常为 0
 * - graze: 擦伤，值低于标准伤害
 * - hit: 标准命中
 * - crit: 暴击，值高于标准伤害
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
 * 攻击战术效果
 */
export type AttackTacticEffectType = AttributeType
    | 'ap_reduce' // 减少行动点

/**
 * 防御战术效果
 */
export type DefenseTacticEffectType = AttributeType | DynamicVitalType
    | 'shield' // 与免伤无关，是一个独立的护盾字段

/**
 * 行动效果类型
 */
export type ActionEffectType = ConsumableEffectType | AttackTacticEffectType | DefenseTacticEffectType

// =====================
// 6. 系统玩法：任务与解谜
// =====================

/**
 * 任务生命周期标记
 *
 * 控制节点推进是否结算奖励，或阻止已过期事件被再次触发。
 */
export type QuestStatus =
    | 'on'      // 进行中
    | 'done'    // 已完成
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
 * 叙事主题
 *
 * 定义世界观的美学基调与核心冲突类型。
 *
 * 设计原则：
 * - 每个主题占据唯一的「恐惧象限」，彼此在核心恐惧源上互斥
 * - 主题描述的是「世界本身的美学与规则」，而非「人际动态」或「叙事手法」
 * - 人际动态（信任瓦解、背叛、献祭）应下沉至 NarrativeMotif / NarrativeMainAxis 层
 * - 叙事手法（倒叙、多视角）由 NarrativePacing / NarrativePhase 控制
 * - 每个主题必须能独立驱动：视觉风格、敌人设计、谜题逻辑、理智机制、环境音轨
 */
export type NarrativeTheme =
    /**
     * 生物机械恐怖
     *
     * 核心恐惧：
     * 肉体向机械的不可逆异化——身体不再属于自己，且变化无法停止。
     *
     * 典型视觉：
     * exposed gears beneath skin, pulsing cables as veins, bone-metal fusion
     *
     * 典型机制：
     * 装备与肉体融合，卸下装备 = 撕裂肉体；变异不可逆
     *
     * 音轨映射：
     * ThemeType → 'organic' | 'industrial'
     *
     * 理智触发：
     * 目睹自身或他人的肉体异变
     */
    | 'biomechanica'

    /**
     * 赛博神秘学
     *
     * 核心恐惧：
     * 信息 / 信号中栖居着超自然实体——数据即咒文，网络即灵界，代码即仪式。
     *
     * 典型视觉：
     * glowing sigils in server rooms, static forming faces, data streams as ectoplasm
     *
     * 典型机制：
     * NeuralLink 的 noiseLevel 与叙事深度绑定；信号强度 = 灵体活跃度
     *
     * 音轨映射：
     * ThemeType → 'horror' | 'void'
     *
     * 理智触发：
     * 接收到无法解析的信号、NeuralLink 出现幻觉叠加
     */
    | 'cyber_occult'

    /**
     * 宇宙恐怖
     *
     * 核心恐惧：
     * 不可知的尺度碾压——人类认知在宇宙级存在面前绝对渺小，理解即疯狂。
     *
     * 典型视觉：
     * non-Euclidean megastructures, indifferent celestial entities, scale vertigo
     *
     * 典型机制：
     * 区域 dilationFactor 极端偏移；敌人无法被击杀只能被规避
     *
     * 音轨映射：
     * ThemeType → 'void' | 'horror'
     *
     * 理智触发：
     * 目击不可名状之物的轮廓、理解碎片化真相
     */
    | 'cosmic_horror'

    /**
     * 时间异常
     *
     * 核心恐惧：
     * 因果律崩坏——未来侵蚀过去，结果先于原因，时间拓扑畸变。
     *
     * 典型视觉：
     * frozen explosions, reversed rain, clocks with impossible hands, déjà vu overlays
     *
     * 典型机制：
     * ZoneDate.cycle 出现非线性跳跃；节点状态在不同 tick 间不一致
     *
     * 音轨映射：
     * ThemeType → 'memory' | 'void'
     *
     * 理智触发：
     * 遭遇自身的未来 / 过去残影、因果倒置事件
     */
    | 'temporal'

    /**
     * 民俗恐怖
     *
     * 核心恐惧：
     * 集体无意识中的古老契约——仪式、禁忌、献祭，规则不可质疑只能服从。
     *
     * 典型视觉：
     * hand-carved totems, candlelit processions, masks with no eye-holes, woven effigies
     *
     * 典型机制：
     * NPC 的 RelationshipPhase 受仪式进度驱动；违反禁忌触发区域级惩罚
     *
     * 音轨映射：
     * ThemeType → 'ritual' | 'horror'
     *
     * 理智触发：
     * 被迫参与仪式、目睹献祭、违反禁忌
     */
    | 'folk_horror'

    /**
     * 极端生态
     *
     * 核心恐惧：
     * 生态系统作为主动敌意存在——环境不是背景，而是猎手。
     *
     * 典型视觉：
     * bioluminescent predator flora, breathing cave walls, spore-filled corridors
     *
     * 典型机制：
     * threatLevel 随 explorationStep 递增；搜查必然触发环境反击
     *
     * 音轨映射：
     * ThemeType → 'organic' | 'underwater'
     *
     * 理智触发：
     * 环境主动「注视」玩家、生态系统的拟人化恶意
     */
    | 'hostile_biosphere'

    /**
     * 认知危害
     *
     * 核心恐惧：
     * 记忆 / 人格 / 自我同一性的侵蚀——你无法确定自己是否还是「自己」。
     *
     * 典型视觉：
     * mirrors showing wrong reflections, text that rewrites itself, familiar faces becoming strangers
     *
     * 典型机制：
     * NeuralLink.noiseLevel 影响 UI 信息可信度；NPC 对话出现矛盾记忆
     *
     * 音轨映射：
     * ThemeType → 'memory' | 'horror'
     *
     * 理智触发：
     * 发现自身记忆矛盾、无法辨认同伴、自我描述被系统否定
     */
    | 'cognitive_hazard'

    /**
     * 梦境逻辑
     *
     * 核心恐惧：
     * 空间非欧、规则每回合突变——世界的基本物理法则不可信赖。
     *
     * 典型视觉：
     * Escher staircases, rooms larger inside than outside, gravity shifting per node
     *
     * 典型机制：
     * 节点 exits 在每回合重新洗牌；threatLevel 在相邻节点间无逻辑跳跃
     *
     * 音轨映射：
     * ThemeType → 'void' | 'exploration'
     *
     * 理智触发：
     * 空间悖论（回到已探索节点但布局完全不同）、规则突变导致的安全感丧失
     */
    | 'dream_logic'

    /**
     * 寄生共生
     *
     * 核心恐惧：
     * 与异物绑定，增益即代价，分离即死亡——你依赖的东西正在吞噬你。
     *
     * 典型视觉：
     * symbiotic organism wrapped around spine, glowing veins of alien origin, half-merged silhouettes
     *
     * 典型机制：
     * 共生体提供战斗增益但持续消耗 sanity / vigor；移除共生体 = 即死判定
     *
     * 音轨映射：
     * ThemeType → 'organic' | 'horror'
     *
     * 理智触发：
     * 共生体「说话」、共生体在玩家不知情时行动、分离焦虑
     */
    | 'parasitic_symbiosis'

    /**
     * 工业熵寂
     *
     * 核心恐惧：
     * 机械的无意义永恒运转——没有设计者，没有目的，只有锈蚀、重复与不可停止的惯性。
     *
     * 典型视觉：
     * endless conveyor belts, rusted gears grinding without purpose,
     * fluorescent-lit corridors stretching to infinity, oil-black water
     *
     * 典型机制：
     * 节点布局呈强制线性（无分支）；searchCount 不影响产出（资源恒定衰减）；
     * 敌人无 lootTable（机械不掉落有机物）
     *
     * 音轨映射：
     * ThemeType → 'industrial' | 'void'
     *
     * 理智触发：
     * 意识到机械运转无目的、无法关闭任何设备、重复性压迫
     */
    | 'industrial_entropy'

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
    | NarrativeTheme   // 在不同主题大类的区域中探索时

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