/**
 * 核心类型字典 (type.ts)
 * * 约束系统中所有具有明确业务边界的枚举值与字面量联合类型。
 * 驱动各个状态机流转与底层逻辑判断。
 * * @version 2.0.0
 * @see interface.ts
 */

/**
 * 工具类型：固定长度数组
 * 利用递归和元组长度推断，自动生成包含 N 个 T 类型的元组。
 * * @example _Array<string, 5> 等价于 [string, string, string, string, string]
 */
export type _Array<T, N extends number, R extends unknown[] = []> =
    R['length'] extends N ? R : _Array<T, N, [T, ...R]>;

// ============================================================================
// 1. 核心状态与架构 (Core & Architecture)
// ============================================================================

/**
 * 根状态机指令集。
 * 决定顶层组件的挂载卸载，以及游戏主循环的当前阻塞/激活状态。
 */
export enum GameState {
    /** 引导与初始配置阶段，等待实例化指令 */
    MAIN_MENU = 0,
    /** 节点遍历与交互求值激活，主循环运行中 */
    PLAYING = 1,
    /** 挂起探索压力，转入资源结算与长线规划 */
    SANCTUARY = 2,
    /** 实例销毁，触发结局收尾逻辑与持久化记录 */
    GAME_OVER = 3,
    /** 阻塞态，用于掩盖网络 IO 或大模型生成延迟 */
    LOADING = 4,
    /** 挂起探索循环，压入回合制战斗栈 */
    COMBAT = 5,
    /** 锁定玩家移动，聚焦 LLM 会话上下文交互 */
    DIALOGUE = 6,
    /** 限制常规 UI，将输入焦点重定向至解谜沙盒 */
    PUZZLE = 7,
    /** 短暂过渡指令，用于触发展示动画并在结束后退栈 */
    PUZZLE_RESOLVED = 8
}

/** * 模型大类键名。
 * 严格映射至底层模型调度中心 (Model Registry) 的可用调用通道。
 */
export type ModelCategory =
    | 'world'
    | 'npcDialogue'
    | 'npcReaction'
    | 'dyNarrative'
    | 'image'
    | 'video'
    | 'speech'
    | 'embedding';

/**
 * 日志路由标签。
 * 决定消息在控制台的堆叠规则、优先级以及渲染过滤层级。
 */
export type LogType =
    // 系统运行时诊断与反馈
    | 'info' | 'command' | 'warning' | 'critical'
    // 叙事大屏与环境上下文推送
    | 'cinematic' | 'event' | 'environment'
    // 玩法收益与战斗检定结果
    | 'combat' | 'loot' | 'success'
    // 动态内容标记与认知扰动注入
    | 'ai-gen' | 'hallucination' | 'mental';

/**
 * 基础视觉渲染模式。
 * 决定顶层渲染组件以何种视觉滤镜与排版形式传达环境信息。
 */
export type VisualMode = 'bio' | 'camera';

// ============================================================================
// 2. 实体、属性与状态 (Entities, Attributes & States)
// ============================================================================

/**
 * 基础属性类型。
 * 决定实体的四维修正基数，直接参与检定及派生属性计算。
 */
export type AttributeType = 'strength' | 'agility' | 'knowledge' | 'perception';

/**
 * 最大体征阈值键。
 * 决定实体在绝对满载状态下的生存指标上限。
 */
export type VitalType = 'maxHp' | 'maxSanity' | 'maxStamina' | 'maxVigor';

/**
 * 动态体征状态键。
 * 标记实体在运行时的即时生存压力读数，与 VitalType 配套映射。
 */
export type DynamicVitalType = 'hp' | 'sanity' | 'stamina' | 'vigor';

/**
 * 实体状态变化趋势。
 * 提供给动态叙事模型，用以研判角色生理与心理的衰减或恢复倾向。
 */
export type StateTrend = 'improving' | 'declining' | 'stable';

/**
 * 情感基调引擎指令。
 * 用于叙事生成时的语气锚定，约束 LLM 输出的遣词造句与氛围倾角。
 */
export type EmotionalTone = 'hopeful' | 'desperate' | 'anxious' | 'numb' | 'determined';

/**
 * 异常状态键。
 * 驱动战斗内外基于轮次或时间的持久化负面/正面效果求值逻辑。
 */
export type StatusEffectType =
    // 控制类：强制跳过下达指令的动作
    | 'stun' | 'freeze'
    // DOT/HOT类：回合末自动产生数值增减
    | 'bleed' | 'poison' | 'burn' | 'regen'
    // 属性强化：临时拔高检定基数
    | 'buff_str' | 'buff_agi' | 'buff_kno' | 'buff_per'
    // 防御劣化：改变最终伤害计算的百分比乘数
    | 'weaken' | 'vulnerable';

/**
 * 状态恶化分级。
 * 提供给 LLM 的离散化状态标签，用于改变文本生成的基调与紧迫感。
 */
export enum SeverityLevel {
    /** 触发生存倒计时或理智崩溃边缘判定 */
    CRITICAL = 'critical',
    /** 触发高优先级告警 UI 与文本渲染 */
    SEVERE = 'severe',
    /** 常规减益，不强制中断当前操作 */
    MODERATE = 'moderate',
    /** 无影响，维持基准运行 */
    NORMAL = 'normal'
}

// ============================================================================
// 3. 交互与社交系统 (Interaction & Social)
// ============================================================================

/**
 * 焦点交互类型。
 * 决定交互钩子 (Hook) 应读取哪个子系统的解析逻辑。
 */
export type InteractionType = 'interact_npc' | 'interact_obj';

/**
 * 情绪基准锚点 (基于 Ekman 六模)。
 * 用于限制大模型生成对话时的情感边界，防止角色行为偏离当前语境。
 */
export type Mood = 'happy' | 'sad' | 'angry' | 'fearful' | 'surprised' | 'neutral';

/**
 * 信任度阶段标记。
 * 作为对话树分支判断的前提条件，决定 NPC 的行为模型及资源倾斜度。
 */
export enum RelationshipPhase {
    /** 拒绝常规交互，可能主动触发敌对事件 */
    HOSTILE = '敌意',
    /** 信息获取受限，交易价格惩罚 */
    GUARDED = '戒备',
    /** 标准交互基准线 */
    NEUTRAL = '中立',
    /** 解锁次级私人话题，解锁部分区域提示 */
    FAMILIAR = '熟识',
    /** 解锁核心剧情伏笔，提供主动增益 */
    TRUSTING = '信任',
    /** 无视理智值惩罚协助，容忍度达到最大 */
    BONDED = '羁绊'
}

// ============================================================================
// 4. 物品与经济系统 (Items & Economy)
// ============================================================================

/**
 * 资源权重评级。
 * 决定在地图生成时的分布概率、掉落池权重及 UI 渲染色值。
 */
export type ItemRarity = 'common' | 'rare' | 'epic' | 'cursed';

/**
 * 装备生效逻辑映射。
 * 限定饰品挂载时可绑定的数值修正键。
 */
export type AccessoryEffectType = AttributeType | VitalType;

/**
 * 消耗品结算路由。
 * 决定物品使用后，数值控制器应调用的对应恢复或修正方法。
 */
export type ConsumableEffectType =
    | AccessoryEffectType
    // 实体生存指标干预
    | 'heal_hp' | 'heal_sanity'
    // 神经链接外设指标干预
    | 'restore_battery' | 'repair_integrity';

/**
 * 武器模组分类。
 * 用于判断卡牌加成机制是否可用。
 */
export type WeaponType = 'wave' | 'prick' | 'bow' | 'crossbow' | 'throw' | 'gun' | 'magic';

/**
 * 庇护所状态字典键契约。
 * 统管庇护所内部生存资源库存与微型社会稳定性读数。
 */
export type SanctuaryState = Record<'food' | 'water' | 'medicine' | 'electricity' | 'scraps' | 'population' | 'morale' | 'erosion', number>;

// ============================================================================
// 5. 战斗与技能系统 (Combat & Skills)
// ============================================================================

/**
 * 行动索敌指针。
 * 决定卡牌引擎施放效果时的实体过滤策略。
 */
export type CardTarget =
    | 'self' | 'single_teammate' | 'all_teammates'
    | 'single_ally' | 'all_allies'
    | 'enemy' | 'all_enemies'
    | 'none';

/**
 * 指令集原子动作。
 * 定义卡牌解析器执行的具体逻辑分支。
 */
export type CardEffectType =
    // 伤害计算分流
    | 'melee_attack' | 'ranged_attack' | 'instant_attack'
    // 状态维护与资源循环
    | 'block' | 'heal' | 'regen' | 'energy'
    // 卡组流转控制
    | 'draw' | 'discard_hand'
    // 短期强化
    | 'buff_str' | 'buff_agi' | 'buff_kno' | 'buff_per'
    // 目标限制与劣化
    | 'stun' | 'freeze' | 'vulnerable' | 'weaken'
    // 延时损伤挂载
    | 'bleed' | 'poison' | 'burn';

/**
 * 独立卡牌特性标签。
 * 改变单卡在抽牌、丢弃及结算过程中的标准生命周期行为。
 */
export type CardFeature = 'exhaust' | 'singleUse' | 'retain' | 'ethereal' | 'unplayable';

/**
 * 角色行为学架构。
 * 决定初始抽牌逻辑、牌库构成偏好以及升级时的属性成长侧重。
 */
export type CharacterStyle = 'attack' | 'burst' | 'tactical' | 'healer' | 'defense';

/**
 * 敌对方决策暴露。
 * 提供给玩家的有限预知，用于驱动玩家在当前回合的战术反制。
 */
export type IntentType = 'attack' | 'buff' | 'debuff' | 'observe';

// ============================================================================
// 6. 系统玩法：任务与解谜 (Quests & Puzzles)
// ============================================================================

/**
 * 任务生命周期标记。
 * 控制节点推进是否结算奖励，或阻止已过期事件被再次触发。
 */
export type QuestStatus = 'on' | 'done' | 'failed';

// ============================================================================
// 7. 叙事驱动与世界观 (Narrative & World)
// ============================================================================

/**
 * 叙事模式。
 * 决定全局状态是跨越多个维度的长线追踪，还是即插即用的短平快结算。
 */
export type NarrativeMode = 'chain' | 'episodic';

/**
 * 叙事节奏。
 * 控制伏笔生成密度、张力积累速度以及节点展开的紧迫感。
 */
export type NarrativePacing = 'slow' | 'balanced' | 'fast' | 'psych';

/**
 * 叙事主题。
 * 定义世界观的美学基调与核心冲突类型。
 */
export type NarrativeTheme =
    | 'biomechanica'   // 生物机械恐怖
    | 'urban_decay'    // 城市衰败
    | 'cyber_occult'   // 赛博神秘学
    | 'cosmic_horror'  // 宇宙恐怖
    | 'temporal'       // 时间异常
    | 'folk_horror'    // 民俗恐怖
    | 'extreme_env';   // 极端环境生存

/**
 * 叙事链状态。
 * 控制当前主线进度是挂载于内存持续演算、置入暂存区、还是转为只读归档。
 */
export type StoryArcStatus = 'ongoing' | 'suspended' | 'concluded';

/**
 * 经典戏剧结构指针。
 * 极为重要。约束 LLM 针对当前节点的行文风格，强行引导剧情走势。
 */
export type NarrativePhase = 'setup' | 'rising' | 'climax' | 'falling' | 'resolution';

// ============================================================================
// 8. 表现层：视觉与 UI (Presentation: Visual & UI)
// ============================================================================

/**
 * 视觉渲染管线通道。
 * 决定向玩家呈现的媒体是直出的拟真信号还是处理过的数据视图。
 */
export type VisualViewMode = 'camera' | 'bio';

/**
 * 媒体资产基类。
 * 确定底层渲染采用的 DOM 标签及其对应的预加载、播放策略。
 */
export type AssetType = 'image' | 'video';

/**
 * 顶层遮罩模态。
 * 屏蔽下层点击事件，强制接管视觉焦点以传达不可中断的系统级状态。
 */
export type OverlayType =
    | 'menu'       // 主菜单
    | 'cutscene'   // 过场动画
    | 'levelup'    // 升级界面
    | 'gameover'   // 游戏结束
    | 'transition' // 场景过渡
    | 'loading';   // 加载中

/**
 * HUD 信息流路由。
 * 决定在受限屏幕区域内挂载哪一个功能面板组件。
 */
export type VisorPanelType = 'visual' | 'Vital' | 'inventory' | 'archives';

/**
 * NPC 交互面板索引。
 * 分离闲聊、交易与任务委派逻辑视图，避免状态混杂。
 */
export type NPCTabMode = 'interaction' | 'inventory' | 'quest';

/**
 * 视觉元数据注入键。
 * 约定哪些场景变量允许叠加在动态视觉画面的文字图层中。
 */
export type VisualComponentKey = 'zoneName' | 'nodeName' | 'threatLevel' | 'desc';

// ============================================================================
// 9. 表现层：听觉系统 (Presentation: Audio)
// ============================================================================

/**
 * 空间声学卷积引擎。
 * 切换底层 AudioContext 的脉冲响应样本，模拟不同环境的混响特征。
 */
export type ReverbType = 'default' | 'hall' | 'cave' | 'metallic';

/**
 * 环境音轨标签。
 * 触发对应的音频流淡入淡出，维系底层气氛情绪的连贯性。
 */
export type ThemeType =
    | 'sanctuary' | 'exploration' | 'combat' | 'panic'
    | 'horror' | 'void' | 'industrial' | 'organic'
    | 'underwater' | 'ritual' | 'memory' | 'death';

/**
 * 点声源触发器。
 * 一次性播放的脉冲音频，反馈物理交互、系统事件或界面操作结果。
 */
export type SfxType =
    // UI 交互
    | 'click' | 'hover' | 'text' | 'success' | 'error' | 'notification' | 'ui_open' | 'ui_close' | 'typing'
    // 卡牌操作
    | 'card_draw' | 'card_discard' | 'card_shuffle' | 'card_hover'
    // 战斗反馈
    | 'combat_hit' | 'combat_dmg' | 'combat_miss' | 'combat_crit' | 'combat_block' | 'combat_heal' | 'combat_buff' | 'combat_debuff'
    // 探索与环境
    | 'footstep' | 'door_open' | 'door_close' | 'door_locked' | 'item_pickup' | 'item_drop' | 'item_use' | 'search'
    // 心理恐怖
    | 'heartbeat' | 'scare' | 'glitch' | 'whisper' | 'scream' | 'breathing' | 'static' | 'distortion'
    // 科技/设备
    | 'scan' | 'power_up' | 'power_down' | 'malfunction' | 'radio'
    // 游戏事件
    | 'die' | 'level_up' | 'sanity_low' | 'sanity_restore' | 'puzzle_solve' | 'puzzle_fail'
    | 'npc_join' | 'npc_leave' | 'quest_complete' | 'zone_enter' | 'ambient_event';

/**
 * 动态音乐茎 (Stems) 权重调节因子。
 * 驱动动态混音系统根据游戏强度拉起或降低对应乐器的增益。
 */
export type MusicMood = 'calm' | 'tense' | 'action' | 'dread' | 'mystery' | 'triumph' | 'sorrow';

/**
 * 语音后处理滤镜。
 * 改变发声体的频域特征，反映发声源的物理状态衰退或异化。
 */
export type VoiceEffect = 'normal' | 'radio' | 'distorted' | 'whisper' | 'robotic' | 'echo';

// ============================================================================
// 10. 底层服务与基建 (Infrastructure & Telemetry)
// ============================================================================

/** * API 供应商路由标识。
 * 决定大模型或第三方服务请求对应的基建代理通道。
 */
export type ApiPlatform = 'groq' | 'google' | 'zhipu' | 'pollinations' | 'chat2api' | 'deapi'  | 'qwenstudio';