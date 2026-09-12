import type { Dispatch, SetStateAction } from 'react'

import {
    QuestStatus,
    Mood,
    LogType,
    AttributeType,
    VitalType,
    DynamicVitalType,
    ItemRarity,
    AccessoryEffectType,
    ConsumableEffectType,
    WeaponType,
    WeaponDamageType,
    RelationshipPhase,
    AttackResult,
    DefenseResult,
    ActionEffectType,
    Target,
    CombatStyle,
    IntentType,
    AttackTacticEffectType,
    DefenseTacticEffectType,
    NarrativePacing,
    NarrativeMode,
    StoryArcStatus,
    NarrativePhase,
    GameState,
    SanctuaryState,
    NarrativeTheme,
    StateTrend,
    EmotionalTone,
    _Array,
    VisualMode,
    SoundType
} from './type'

/**
 * 核心接口契约 (interface.ts)
 *
 * 本文件定义游戏运行时所有核心数据结构，包括：
 * - 全局配置与日志
 * - 时间、位置、回合
 * - 玩家、NPC、敌人实体
 * - 物品、装备、战术、任务、谜题
 * - 地图、区域、节点
 * - 叙事链、伏笔、动态叙事
 * - LLM 生成上下文
 * - React 状态桥接
 *
 * 所有枚举、字面量联合类型与状态机指令均来自 {@link ./type.ts}。
 *
 * @version 2.1.0
 * @see ./type.ts
 */

// ==========================
// 1. 核心配置
// ==========================

/**
 * 全局配置
 *
 * 所有默认值应集中维护在 `src/constants/config.ts`，
 * 由 App 初始化时注入到全局状态，不由工具函数隐式修改。
 */
export interface Settings {
    // API Keys
    groqKeys?: string[]
    zhipuKeys?: string[]
    pollinationsKeys?: string[]
    deapiKeys?: string[]
    qwenstudioKeys?: string[]
    volcengineKeys?: string[]
    nvidiaKeys?: string[]
    // 代理配置
    ProxyBase?: string
    useProxyGroq?: boolean
    useProxyZhipu?: boolean
    useProxyPollinations?: boolean
    useProxyDeapi?: boolean
    useProxyQwenstudio?: boolean
    useProxyVolcengine?: boolean
    useProxyNvidia?: boolean
    // 模型路由
    /** 区域生成模型 */
    zoneModel: {
        provider: string
        model: string
    }
    /** NPC 对话生成模型 */
    npcDialogueModel: {
        provider: string
        model: string
    }
    /** NPC 反应生成模型 */
    npcReactionModel: {
        provider: string
        model: string
    }
    /** NPC 短期记忆摘要模型 */
    npcMemorySummaryModel: {
        provider: string
        model: string
    }
    /** NPC 长期记忆整合模型 */
    npcMemoryConsolidationModel: {
        provider: string
        model: string
    }
    /** 动态叙事生成模型 */
    dyNarrativeModel: {
        provider: string
        model: string
    }
    /** 庇护所日常事件生成模型 */
    sanctuaryEventModel: {
        provider: string
        model: string
    }
    /** 设施升级废料定价模型（LLM 裁决升级消耗） */
    facilityUpgradeModel: {
        provider: string
        model: string
    }
    /** 图像生成模型 */
    imageModel: {
        provider: string
        model: string
    }
    /** 视频生成模型 */
    videoModel: {
        provider: string
        model: string
    }
    /** 语音生成模型 */
    speechModel?: {
        provider: string
        model: string
    }
    /**
     * 对话索引切片长度
     *
     * 每当 NPC 对话达到该长度后，应立即生成一条 δ 层记忆摘要。
     *
     * @default 25
     */
    dialogueSliceLength: number
    /** 玩家偏好的媒体类型 */
    preferredMediaType: 'image' | 'video'
    /** 屏幕亮度，用于视觉滤镜或遮罩强度。 */
    screenBrightness: number
    /** 游戏平衡性动态配置。 */
    gameConfig: {
        /** 遇敌与搜查风险配置。 */
        enemyEncounter: {
            /** 基础遇敌概率。 */
            baseChance: number

            /** 威胁等级除数，用于将 threatLevel 转化为概率修正。 */
            threatDivisor: number

            /** 搜查基础风险。 */
            searchBaseRisk: number

            /** 每次搜查叠加的风险。 */
            searchRiskPerCount: number

            /** 疲劳对遇敌风险的惩罚系数。 */
            fatiguePenaltyFactor: number
        }
        /** 搜查消耗配置。 */
        searchCosts: {
            baseSanity: number
            baseStamina: number
            baseVigor: number
            fatigueBase: number
            staminaFatigueFactor: number
            vigorFatigueFactor: number
            wisdomFactor: number
            perceptionFactor: number
            wisdomRecoveryFactor: number
            scoutBonus: number
        }
        /** 提示消耗配置。 */
        hintCosts: {
            sanityCost: number
        }
        /** 媒体加载与敌人出现延迟配置。 */
        mediaLoading: {
            enemySpawnDelay: number
            searchEnemySpawnDelay: number
            puzzleFailEnemySpawnDelay: number
        }
        /** 发现物品质阈值。 */
        discoveryThresholds: {
            high: number
            medium: number
            low: number
        }
        /** 疲劳阈值。 */
        fatigueThresholds: {
            highWarning: number
            medium: number
            low: number
        }
        /** 搜查次数阈值。 */
        searchThresholds: {
            repetitiveWarning: number
            maxEffective: number
        }
        /** 移动消耗。 */
        movementCosts: {
            baseStamina: number
            baseSanity: number
        }
        /** 感知权重。 */
        perceptionWeights: {
            basePerception: number
            searchCount: number
            agility: number
        }
        /** 社交与信任收益配置。 */
        social: {
            thresholds: {
                trustHigh: number
                trustMedium: number
                trustLow: number
                trustVeryLow: number
                trustMinimal: number
                trustDefault: number
                trustMax: number
                trustMin: number
            }
            benefits: {
                hugSanityGainHigh: number
                hugSanityGainLow: number
                hugTrustPenalty: number
                comfortTrustGain: number
                healTrustGain: number
                healValueDefault: number
                intimacyTrustGain: number
                intimacySanityGain: number
                intimacyPlayerSanityGain: number
                giftTrustBase: number
                giftTrustRare: number
                giftTrustEpic: number
                giftTrustConsumableBonus: number
            },
            /** 体征阈值。 */
            vitals: {
                sanityCritical: number
                sanityLow: number
                sanityHigh: number
                hpHigh: number
                hpMedium: number
            }
        }
        /** 装备槽位配置。 */
        equipmentSlots: {
            armor: number
            accessory: number
        }
    }
    /**
     * 是否启用敌方蓄反询问。
     *
     * 蓄反对敌人有利有弊，默认建议关闭；
     * 接入 LLM 战术决策后可按需开启。
     *
     * @default false
     */
    accumulateCounterEnabled: boolean
    /**
     * 是否启用敌方差反询问。
     *
     * 差反对敌人有利有弊，默认建议关闭；
     * 接入 LLM 战术决策后可按需开启。
     *
     * @default false
     */
    differentialCounterEnabled: boolean
}

/**
 * 日志条目。
 *
 * 日志类型 {@link LogType} 决定消息在控制台中的堆叠规则、
 * 渲染层级、优先级与过滤方式。
 */
export interface Log {
    id: string
    text: string
    type: LogType
    timestamp: string

    /** 缩进层级，用于表现日志之间的从属或因果关系。 */
    indentLevel?: number
}

/**
 * 区域日期。
 *
 * 记录玩家在「The Zone」内部经历的主观异化时间。
 * 深渊中的认知逻辑被破坏，时间不再以标准时分秒流逝，
 * 而是通过 day / cycle / tick 三层主观刻度推进。
 *
 * 区域的时间流速异常由 {@link ZoneTemplate.dilationFactor} 控制，
 * 并会参与理智、体力、精力等持续消耗的乘区计算。
 */
export interface ZoneDate {
    /** 探险经过的绝对主观天数。 */
    day: number
    /** 当前时间周期，取值范围通常为 0-12。 */
    cycle: number
    /** 当前认知刻度，取值范围通常为 0-30。 */
    tick: number
}

/**
 * 游戏回合。
 *
 * 状态机运行期间的最小逻辑计量单元。
 * 将时间度量抽象为离散动作刻度，以支撑回合制核心系统。
 *
 * 需要区分探索与战斗两个结算域：
 * - 探索移动、搜查等行为累加 explorationStep；
 * - 战斗内行为累加 combatTurn；
 * - absoluteTick 作为底层绝对时钟，永不归零，用于长期剧情伏笔触发。
 */
export interface GameRound {
    /** 从游戏初始化以来的总回合数。 */
    absoluteTick: number
    /** 在区域节点间移动或执行搜索的总次数。 */
    explorationStep: number
    /**
     * 战斗回合计数。
     *
     * 仅当 GameState 处于 COMBAT 时累加。
     * 一旦脱战或战斗结束，引擎必须强制重置为 0。
     *
     * 专用于计算战斗内卡牌、战术、状态效果的持续时间。
     */
    combatTurn: number
}

/**
 * 当前时间快照
 *
 * 同时包含现实时间、区域主观时间与游戏回合。
 */
export interface CurrentTime {
    currentZoneTime: ZoneDate
    currentGameRound: GameRound
}

// ==========================
// 2. 位置、资产、统计与体征
// ==========================

/**
 * 位置模板
 */
export interface Loc {
    zone: {
        id: Zone['id']
        name: Zone['name']
        desc: {
            background: Zone['background']
            topology: Zone['topology']
            nodesCount: Zone['nodesCount']
            visualStyle: Zone['visualStyle']
        }
        /**
         * 处于庇护所则携带
         */
        isSanctuary?: SanctuaryState
    }
    node: {
        /** 
         * 节点键值 
         */
        id: string
        name: Node['name']
        desc: Node['desc']
        /**
         * 节点有威胁度则携带
         */
        isDangerous?: Node['threatLevel']
    }
}

/**
 * 先前位置
 */
export interface PrevLocation extends Loc { }

/**
 * 当前位置
 */
export interface CurrentLocation extends Loc { }

/**
 * 位置信息
 *
 * 保存玩家从何处来、现在何处。
 */
export interface Location {
    prevLocation: PrevLocation | null
    currentLocation: CurrentLocation
}

/**
 * 媒体资产
 *
 * 用于挂载图片、视频、音频等运行时资源地址。
 */
export interface Asset {
    imageUrl?: string
    videoUrl?: string
    audioUrl?: string
}

/**
 * 玩家探索统计
 */
export interface Stats {
    killCount: number
    searchCount: number
    exploredZones: number
    exploredNodes: number
}

/**
 * 基础属性集合
 */
export type Attribute = Record<AttributeType, number>

/**
 * 最大体征集合
 */
export type Vital = Record<VitalType, number>

/**
 * 体征记录
 *
 * 保存上一 tick 与当前 tick 的体征快照，
 * 用于动态叙事判断状态趋势、近死体验、恢复或恶化倾向。
 */
export interface VitalRecord {
    prevVital: {
        prevTick: GameRound['absoluteTick']
        prevVital: Vital
    }
    currentVital: {
        currentTick: GameRound['absoluteTick']
        currentVital: Vital
    }
}

/**
 * 死亡状态
 */
export interface Death {
    reason: string
    timestamp: number
    location: Location
}

/**
 * 神经链接仪状态
 *
 * noiseLevel 是一个仅用于UI层的视觉字段，用于对image进行后处理，值越大，图片上的亮噪点就越多，画面内物体的轮廓越清晰
 */
export interface NeuralLinkState {
    battery: number
    maxBattery: number

    integrity: number
    maxIntegrity: number

    visorLevel: number
    noiseLevel: number
}

/**
 * 起源模板
 */
export interface OriginTemplate {
    id: string
    title: string
    desc: string
    player: PlayerTemplate
    sanctuary: SanctuaryTemplate
    companion?: NpcTemplate[]
}

/**
 * 装备状态
 */
export interface EquipState {
    weapons?: [WeaponInstance | null, WeaponInstance | null]
    armors?: (ArmorInstance | null)[]
    accessories?: (AccessoryInstance | null)[]
}

/**
 * 战斗意图
 *
 * 用于描述敌人或战术 AI 下一轮准备执行的行为。
 */
export interface CombatIntent {
    type: IntentType
    desc: string
    value?: number
    targetId?: string
    /**
     * 是否为自动插入的「接近意图」。
     *
     * 敌人执行攻击意图时若射程内没有可选目标，
     * 会在该攻击意图前插入本意图（向选定目标移动一步）；
     * 接近消耗后回到攻击意图再次检查，直到有目标可打。
     */
    approach?: boolean
}

/**
 * 战斗状态
 */
export interface CombatStatus {
    sourceId: string;
    sourceName: string;
    type: ActionEffectType;
    value: number;
    duration: number;
}

/**
 * 实例 ID
 */
export interface InstanceId {
    instanceId: string
}

// ==========================
// 3. 话语、记忆、关系与状态
// ==========================

/**
 * 话语标签基类
 */
export interface WordsTag {
    speaker: string
}

/**
 * 玩家话语标签
 */
export interface PlayerWordsTag extends WordsTag {
    type: 'player'
    location: Location['currentLocation']
    currentTime: CurrentTime['currentZoneTime']
}

/**
 * NPC 话语标签
 */
export interface NpcWordsTag extends WordsTag {
    type: 'npc'
    /**
     * 情绪
     */
    mood: Mood
    /**
     * 思考
     */
    thought: string
}

/**
 * 话语
 */
export interface Words<T extends WordsTag = WordsTag> {
    text: string
    tag: T
}

/**
 * 对话记录
 *
 * 每一轮对话由玩家话语与 NPC 话语成对组成。
 * 当对话轮数达到 {@link Settings.dialogueSliceLength} 时，
 * 应立即触发 δ 层记忆摘要。
 */
export interface Dialogue {
    /**
     * 对话数组
     *
     * 每 {@link Settings.dialogueSliceLength} 轮对话结束后，应立即进行 δ 摘要。
     */
    dialogue: Array<[Words<PlayerWordsTag>, Words<NpcWordsTag>]>
}

/**
 * 记忆摘要基类
 *
 * 一条摘要的生命周期分为五个阶段：
 *
 * 1. 语义摘要：
 *    调用语义 LLM 生成 summary、importanceScore、keyEntities。
 *
 * 2. 引擎构建：
 *    引擎补充 id、owner、startTime、endTime、hierarchy、dialogueIndex 等字段。
 *
 * 3. 上层摘要 ID 注入：
 *    当 δ 层摘要达到 5 条时，触发 γ 层摘要；
 *    引擎将 parentId 注入对应子摘要。
 *
 * 4. 长期维护：
 *    importanceScore 会随 lastAccessedAt、accessCount、accessRatio 动态演变；
 *    长期为 0 的摘要可被删除，但其子摘要不受影响。
 */
export interface MemorySummaries {
    // 语义摘要环节

    /** 摘要文本。 */
    summary: string

    /** 关键实体，如事件、地点、人物、物品等，用于过滤与检索。 */
    keyEntities: string[]

    /** 重要性评分，范围 0-1，用于检索优先级。 */
    importanceScore: number

    // 引擎构建环节

    id: string
    startTime: ZoneDate
    endTime: ZoneDate

    // 上层摘要 ID 注入环节

    /** 父级摘要 ID。 */
    parentId?: string

    // 长期维护环节

    /** 被检索的总次数，是重要性增长的基础。 */
    accessCount: number

    /** 被检索次数占所有摘要检索总次数的比例，对评分影响深远。 */
    accessRatio: number

    /** 最后一次被检索的日期，离当前日期越近分数越高。 */
    lastAccessedAt?: ZoneDate
}

/**
 * 记忆摘要 δ 层
 *
 * 每 {@link Settings.dialogueSliceLength} 轮对话摘要为一条 δ 摘要。
 */
export interface MemorySummaries_δ extends MemorySummaries {
    hierarchy: 'δ'

    /**
     * 对话索引范围。
     *
     * 若 {@link Settings.dialogueSliceLength} 为 25：
     * - start 为 0、25、50...
     * - end 为 24、49、74...
     */
    dialogueIndex: {
        start: number
        end: number
    }
}

/**
 * 记忆摘要 γ 层
 *
 * 每 5 条 δ 层摘要压缩为一条 γ 层摘要。
 */
export interface MemorySummaries_γ extends MemorySummaries {
    hierarchy: 'γ'
    childIds: _Array<MemorySummaries_δ['id'], 5>
}

/**
 * 记忆摘要 β 层
 *
 * 每 5 条 γ 层摘要压缩为一条 β 层摘要。
 */
export interface MemorySummaries_β extends MemorySummaries {
    hierarchy: 'β'
    childIds: _Array<MemorySummaries_γ['id'], 5>
}

/**
 * 记忆摘要 α 层
 *
 * 每 5 条 β 层摘要压缩为一条 α 层摘要。
 */
export interface MemorySummaries_α extends MemorySummaries {
    hierarchy: 'α'
    childIds: _Array<MemorySummaries_β['id'], 5>
}

/**
 * 记忆金字塔
 *
 * 从 α 到 δ 形成多层长期记忆结构。
 */
export interface MemoryPyramid {
    α: Array<MemorySummaries_α>
    β: Array<MemorySummaries_β>
    γ: Array<MemorySummaries_γ>
    δ: Array<MemorySummaries_δ>
}

/**
 * 关系阶段。
 *
 * 信任度阶段标记，作为对话树分支判断的前提条件，
 * 决定 NPC 的行为模型、资源倾斜度与交互权限。
 */
export interface Relationship {
    phase: RelationshipPhase
    behavior: string

    trustRange: {
        min: number
        max: number
    }
}

/**
 * 状态配置。
 *
 * 用于根据当前数值百分比生成描述性文本与叙事文本。
 */
export interface StateConfig {
    /** 基于 0-100 的百分比阈值。 */
    threshold: number
    /** 基于当前值与上限生成状态描述。 */
    description: (val: number, max: number) => string
    /** 基于百分比生成叙事描述。 */
    narrative: (percent: number) => string
}

// ==========================
// 4. 物品系统
// ==========================

/**
 * 物品模板基类
 */
export interface BaseItemTemplate {
    id: string
    name: string
    desc: string
    rarity: ItemRarity
}

/**
 * 武器模板
 */
export interface WeaponTemplate extends BaseItemTemplate {
    type: 'weapon'
    weaponType: WeaponType
    weaponDamageType: WeaponDamageType
    /**
     * 攻击距离（单位：战线格数）
     *
     * 与目标的空间距离不超过该值时，才能对其使用攻击战术。
     */
    range: number
    maxUses: number
    damage: number
}

/**
 * 护甲模板
 */
export interface ArmorTemplate extends BaseItemTemplate {
    type: 'armor'
    /** 
     * 减伤比
     * 
     * 作为全局常驻减伤存在。
     */
    partialReduction: number
    maxUses: number
}

/**
 * 饰品模板
 */
export interface AccessoryTemplate extends BaseItemTemplate {
    type: 'accessory'
    /**
     * 饰品效果列表
     *
     * 每项为：
     * - 效果类型
     * - 效果值，装备后持续生效
     */
    effects: Array<[AccessoryEffectType, number]>
}

/**
 * 消耗品模板
 */
export interface ConsumableTemplate extends BaseItemTemplate {
    type: 'consumable'
    /**
     * 消耗品效果列表
     *
     * 每项为：
     * - 效果类型
     * - 效果值
     * - 可选持续回合数
     *
     * 若存在持续回合数，通常表示 buff 类效果。
     * 战斗外使用后，只要回合数仍有残余，就可继承到战斗中。
     */
    effects: Array<[ConsumableEffectType, number, number?]>
}

/**
 * 数据模板
 */
export interface DataTemplate extends BaseItemTemplate {
    type: 'data'
    documentContent?: string
    audioScript?: string
}

/**
 * 材料模板
 */
export interface MaterialTemplate extends BaseItemTemplate {
    type: 'material'
}

/**
 * 物品模板联合类型
 */
export type ItemTemplate = WeaponTemplate | ArmorTemplate | AccessoryTemplate | ConsumableTemplate | DataTemplate | MaterialTemplate

/**
 * 物品基类
 *
 * 物品基类介于物品模板与物品实例之间，
 * 主要用于地图文件中的物品定义。
 *
 * 直接在地图中定义完整实例 ID 既繁琐也不合逻辑，
 * 因此该中间状态用于承载发现深度、数量等地图层信息。
 */
export interface BaseItem extends BaseItemTemplate {
    /**
     * 发现阈值
     *
     * 若未设置，视为搜查时立刻获得。
     */
    discoveryThreshold?: number
    /**
     * 数量
     *
     * 不设置则为1。
     */
    quantity?: number
}

/**
 * 武器
 */
export interface Weapon extends BaseItem, WeaponTemplate { }

/**
 * 护甲
 */
export interface Armor extends BaseItem, ArmorTemplate { }

/**
 * 饰品
 */
export interface Accessory extends BaseItem, AccessoryTemplate { }

/**
 * 消耗品
 */
export interface Consumable extends BaseItem, ConsumableTemplate { }

/**
 * 数据
 */
export interface Data extends BaseItem, DataTemplate { }

/**
 * 材料
 */
export interface Material extends BaseItem, MaterialTemplate { }

/**
 * 地图层物品联合类型
 */
export type Item = Weapon | Armor | Accessory | Consumable | Data | Material

/**
 * 物品实例基类
 */
export interface BaseItemInstance extends Asset, InstanceId {
    /**
     * 实际生效的装备增量快照
     *
     * 仅饰品使用：记录本次装备真正写入动态态的增量。受 0 下限夹取影响，
     * 实际生效值可能与模板 effects 不等（如 maxSanity 只剩 5 时扣除 12 只能扣 5）；
     * 卸下 / 丢弃时按此快照回收，避免"扣不满 / 退不回"的属性漂移。
     */
    appliedEffectDeltas?: Partial<Record<AccessoryEffectType, number>>
}

/**
 * 武器实例
 */
export interface WeaponInstance extends Weapon, BaseItemInstance {
    currentUses: number
}

/**
 * 护甲实例
 */
export interface ArmorInstance extends Armor, BaseItemInstance {
    currentUses: number
}

/**
 * 饰品实例
 */
export interface AccessoryInstance extends Accessory, BaseItemInstance { }

/**
 * 消耗品实例
 */
export interface ConsumableInstance extends Consumable, BaseItemInstance { }

/**
 * 数据实例
 */
export interface DataInstance extends Data, BaseItemInstance { }

/**
 * 材料实例
 */
export interface MaterialInstance extends Material, BaseItemInstance { }

/**
 * 运行时物品实例联合类型
 */
export type ItemInstance = WeaponInstance | ArmorInstance | AccessoryInstance | ConsumableInstance | DataInstance | MaterialInstance

// ==========================
// 5. 战术系统
// ==========================

/**
 * 防御战术
 */
export interface DefenseTactic {
    type: 'defense'
    id: string
    name: string
    desc: string
    apCost: number
    /**
     * 每项为：
     * - 效果目标
     * - 效果类型
     * - 效果值，负为减益，正为增益
     */
    tacticEffect?: Array<[Target, DefenseTacticEffectType, number]>
}

/**
 * 攻击战术
 */
export interface AttackTactic extends Omit<DefenseTactic, 'type' | 'tacticEffect'> {
    type: 'attack'
    /**
     * 每项为：
     * - 效果目标
     * - 效果属性类型
     * - 效果值，负为减益，正为增益
     * - 效果持续回合数，0 表示仅在本次结算中生效
     */
    tacticEffect?: Array<[Target, AttackTacticEffectType, number, number]>
    requireWeapon?: WeaponType
}

/**
 * 战术
 */
export type Tactic = DefenseTactic | AttackTactic

// ==========================
// 6. 任务系统
// ==========================

/**
 * 任务模板
 */
export interface QuestTemplate {
    id: string
    desc: string
    /**
     * 目标
     *
     * 可要求收集特定物品，或找到 / 护送特定同伴。
     */
    goals: Array<ItemTemplate | NpcTemplate>
    /**
     * 奖励
     *
     * 可给予特定物品，或让同伴永久加入队伍。
     */
    rewards: Array<ItemTemplate | NpcTemplate>
    /**
     * 难度
     *
     * 无上限，数字越大，引擎结算的经验越多。
     */
    difficulty: number
}

/**
 * 运行时任务
 */
export interface Quest extends QuestTemplate {
    status: QuestStatus
}

// ==========================
// 7. 谜题系统
// ==========================

/**
 * 填空谜题
 *
 * body 中的空字符串 `''` 表示缺失元素，
 * answer 内部元素排列必须与 body 中的 `''` 一一对应。
 */
export interface ClozePuzzle {
    type: 'cloze'
    /**
     * 谜体
     *
     * 可表示图案、数字、文字、符号、逻辑、代码等一切有内在联系的事物。
     */
    body: Array<Array<string | ''>>
    /** 
     * 谜底
     */
    answer: string[]
}

/**
 * 选项谜题
 */
export interface ChoicePuzzle {
    type: 'choice'
    /**
     * 选项列表
     */
    body: string[]
    /**
     * 正确选项
     */
    answer: string
}

/**
 * 键入谜题
 */
export interface TypePuzzle {
    type: 'type'
    /** 
     * 正确答案
     */
    answer: string
}

/**
 * 谜题
 *
 * 可挂载奖励与惩罚，并支持尝试次数、时间限制等约束。
 */
export interface Puzzle {
    /** 
     * 标题
     */
    title: string
    /**
     * 描述、背景、设定
     *
     * 对键入谜题而言，该字段可直接作为谜面。
     */
    lore: string
    /** 
     * 谜体 
     */
    body: ClozePuzzle | ChoicePuzzle | TypePuzzle
    /** 
     * 提示
     */
    hints: string[]
    /** 
     * 限制
     */
    restrictions: {
        /** 
         * 每次尝试消耗的时间
         */
        timeCostPerAttempt: GameRound['absoluteTick']
        /**
         * 总时间限制
         */
        timeLimit?: GameRound['absoluteTick']
        /**
         * 最大尝试次数
         */
        maxAttempts?: number
    }
    /**
     * 奖励
     */
    rewards?: {
        items?: ItemTemplate[]
        sanity?: number
    }
    /**
     * 惩罚
     */
    penalties?: {
        hp?: number
        sanity?: number
        spawnEnemy?: EnemyTemplate
        permanentLock?: boolean
        nodesToLock?: string | string[]
    }
}

// ==========================
// 8. 实体系统
// ==========================

/**
 * 实体模板基类
 */
export interface EntityTemplate {
    id: string
    name: string
    gender?: 'male' | 'female' | 'both'
    desc: string
    visualPrompt: string
}

/**
 * 角色模板
 *
 * 玩家与 NPC 的共同模板基础。
 */
export interface CharacterTemplate extends EntityTemplate {
    initialState: {
        attribute: Attribute
        vital: Vital
        inventory?: ItemTemplate[]
        equipState?: EquipState
    }
}

/**
 * 玩家模板
 */
export interface PlayerTemplate extends CharacterTemplate {
    initialState: CharacterTemplate['initialState'] & {
        uniqueTactic?: Tactic[]
    }
    /**
     * 战斗风格
     */
    style: CombatStyle
}

/**
 * NPC 模板
 *
 * 在 `PlayerTemplate` 基础上扩展 NPC 专属字段：
 * - 信任、任务系统
 */
export interface NpcTemplate extends PlayerTemplate {
    initialState: PlayerTemplate['initialState'] & {
        trust?: number
        /**
         * NPC初始可提供的任务在列表里的排列顺序决定了接取的先后顺序；
         * 必须完成前一个任务，后一个任务才会显示并且可接取。 
         */
        quest?: QuestTemplate[]
    }
}

/**
 * 节点 NPC 模板
 *
 * 在 `NpcTemplate` 基础上扩展 `canBeInvited`、`willRoam` 字段。
 */
export interface NodeNpcTemplate extends NpcTemplate {
    /**
     * 节点NPC邀请条件
     *
     * 无该字段即表示该 NPC 不可被邀请。
     */
    canBeInvited?: {
        trust?: number
        item?: string[]
        questsArchived?: string[]
        /**
         * 替代者配置
         * 
         * 若 NPC 离岗后其原节点需要有人接替，则配置此项；
         * 可以直接配置 NPC ID，也可详细配置。
         * 
         * 如果一个人就可以满足所有职责要求，那么一个替代者也可以；
         * 否则必须多个替代者分别满足要求。 
         */
        replacement?: Array<string | {
            /** 
             * 替代者职责
             */
            duty: string
            /**
             * 职责说明
             */
            desc: string
            /**
             * 属性要求
             */
            attributes?: Partial<Record<AttributeType, number>>
            /**
             * 最大体征要求
             */
            vitals?: Partial<Record<VitalType, number>>
            /**
             * 当前体征要求
             */
            dynamicVitals?: Partial<Record<VitalType, number>>
        }>
        /**
         * 庇护所资源安全线
         *
         * 只有当前庇护所各项资源均不低于此阈值时，NPC 才同意离开。
         * 
         * 只用于庇护所NPC。
         * 
         * key 为 SanctuaryState 的字段名，value 为最低允许值。
         */
        isSanctuarySafe?: Partial<Record<keyof SanctuaryState, number>>
    }
    /**
     * 节点NPC游荡行为配置
     *
     * - 节点NPC会以 `初始节点` 为锚点随机游荡，绝不进入 `passNodes`
     * - 或直接沿 `route` 按顺序移动
     *
     * 无 `willRoam` 字段的 NPC 始终停留在原位节点。
     */
    willRoam?: {
        /** 
         * 游荡速度
         * 
         * 多个tick移动一次。
         */
        speed: GameRound['absoluteTick']
        /**
         * 随机游荡时不会进入的节点
         */
        passNodes?: {
            maxThreat?: number
            nodesId?: string[]
        }
        /**
         * 游荡路线
         *
         * 按顺序排列的节点 ID 列表。
         * NPC 从 `homeNode` 出发，依次访问，到达末尾后返回 `homeNode`。
         * 
         * 没有定义时，NPC将在节点间完全随机移动。
         * 
         * 定义了 `passNodes` 就不再定义 `route` ，两者在引擎层面是互斥的。
         */
        route?: string[]
    }
}

/**
 * 敌人模板
 */
export interface BaseEnemyTemplate extends EntityTemplate {
    /**
     * 限定敌人可出现的区域或庇护所
     *
     * 仅本地预定义敌人需要该字段。
     * 若未设置，则不限区域。
     * 
     * 不要在预定义的庇护所常量里为specificEnemy添加zoneId字段！不需要而且会导致游戏崩溃！
     */
    zoneId?: string[]
    /**
     * 掉落表
     */
    lootTable?: Array<
        ItemTemplate & {
            dropProbability: number
        }
    >
    /**
     * 意图分布
     */
    intentDistribution: Record<IntentType, number>
    /**
     * 有效攻击范围
     */
    range: number
}

/**
 * 克苏鲁敌人模板
 */
export interface CthulhuEnemyTemplate extends BaseEnemyTemplate {
    type: 'cthulhu'
    /**
     * 速度
     * 
     * 即CombatDynamicState.speed
     */
    speed: number
    /**
     * 攻击伤害
     * 
     * 即CombatDynamicState.baseAttack
     */
    damage: number
    /**
     * 闪避力
     * 
     * 影响最大免伤
     * 
     * 可以为任意负数，可以为0，可以为任意正数，引擎会自动百分化
     */
    evasion: number
    /**
     * 防御力
     * 
     * 影响最小免伤，即CombatDynamicState.basePartialReduction
     * 
     * 可以为任意负数，可以为0，可以为任意正数，引擎会自动百分化
     */
    defense: number
    /**
     * 最大生命值
     */
    // maxHp: number
}
/**
 * 不可移动的敌人
 * 
 * 由于这种敌人无法移动，当攻击范围内不存在有效目标时，意图总是为“observe”，反之则立刻切换为“attack”。
 */
export interface ImmovableEnemyTemplate extends Omit<CthulhuEnemyTemplate, 'intentDistribution' | 'type' | 'evasion'> {
    type: 'immovable'
}
/**
 * 敌人模板类型
 */
export type EnemyTemplate = CthulhuEnemyTemplate | ImmovableEnemyTemplate

/**
 * 动态状态基类
 */
export interface BaseDynamicState extends Asset, Record<VitalType | DynamicVitalType, number> {
    isDead: boolean
}

/**
 * 玩家动态状态
 */
export interface PlayerDynamicState extends BaseDynamicState, Record<AttributeType, number> {
    equipment: EquipState
    xp: number
    level: number
    tactics: Tactic[]
    inventory: ItemInstance[]
}

/**
 * NPC 动态状态
 */
export interface NpcDynamicState extends PlayerDynamicState {
    trust: number
    /**
     * 与该 NPC 的总对话轮数
     */
    totalDialogueRounds: number
    /**
     * NPC 长期记忆金字塔
     */
    memory: MemoryPyramid
    /**
     * 当前挂载的人格 / 档案 ID
     */
    mountedProfileId?: string
}

/**
 * 实体容器
 *
 * 将静态模板与运行时动态状态分离。
 */
export interface Entity<TStatic extends EntityTemplate, TDynamic extends BaseDynamicState,> {
    static: TStatic
    dynamic: TDynamic
}

/**
 * 战斗动态
 */
export interface CombatDynamicState extends BaseDynamicState {
    /**
     * 速度
     * - 敌人 = speed
     * - 非敌人 = 敏捷值
     */
    speed: number
    /**
     * 行动点
     */
    actionPoint: {
        /** 
         * 基础 = speed / 5
         */
        base: number
        /** 
         * 当前可用 
         */
        current: number
        /** 
         * 下回合已被蓄反 / 差反预支 
         */
        advanced: number
    }
    /**
     * 蓄反槽
     * 
     * 规则：
     *
     * 1. 当前行动角色速度低于某个敌方角色时，
     *    每次攻击会在该行动角色与该敌方角色之间积累基于双方速度差绝对值的蓄反值。
     *    当积累了 5n 点蓄反值后，引擎将询问该敌方角色是否预支下回合 n 点行动点行动 n 次，称为「蓄反」。
     *
     * 2. 当前角色进行攻击时，速度不小于 10 的敌方角色可选择是否预支下回合 2 行动点行动 1 次，
     *    称为「差反」。
     * 
     * 3. 己方回合开始时，上回合未进行过蓄反 / 差反的己方角色，
     *    除基础每回合回复行动点外，还将额外获得 1 行动点。
     *
     * 4. 同时满足蓄反与差反条件时，引擎优先询问蓄反，后询问差反。
     *
     * 5. 蓄反或差反时会优先消耗当前行动点；若进行本次蓄反或差反将导致下回合行动为负，则引擎不发起询问。
     *
     * 6. 回合结束时，所有未消耗蓄反值的十分之一转化为额外行动点，向上取整。
     * 
     * 蓄/差反有利有弊，对敌人默认关闭，后续接入 LLM 时可选择开启。
     * 本注释中的敌方、己方皆为相对视角，以“当前行动角色”为准，非绝对定位。
     */
    accumulateCounter: Array<{
        ownerId: string   // 拥有该蓄反槽的实体id“owner”
        triggerId: string // 触发该蓄反槽持续累积的实体id“trigger”
        value: number     // 在“owner”与“trigger”间维护的该“蓄反槽”已积累了多少“蓄反值”
    }>
    /**
     * 反击预支请求
     * 
     * 当特定蓄反槽累积的蓄反值达标后，引擎将向蓄反槽拥有者发起蓄反预支询问；
     * 或当速度要求满足时，引擎将持续询问差反预支。
     * 
     * counterAdvanceRequest: {}
     * 
     * 本机制接口定义由实际钩子文件自行维护。
     */
    /**
     * 护盾
     *
     * 伤害结算顺序中，护盾位于防御结果之后、生命值之前。
     */
    shield: number
    /**
     * 基础攻击力
     *
     * - 敌人 = damage
     * - 非敌人 近程（melee） = combatBonus × (力量值 + 武器近程伤害)
     * - 非敌人 远程（range） = combatBonus × 武器远程伤害
     */
    baseAttack: number
    /**
     * 基础免伤比 = 角色装备的护甲提供的免伤值的加总
     * 裁定免伤比 = 防御序列的裁定值（0~0.999）
     * 最终免伤比 = 基础值 + 判定值（0~0.999）
     */
    basePartialReduction: number
    /**
     * 结果序列
     *
     * 进入战斗时，根据实体阵营，引擎进行以下处理：
     *  - 玩家方：根据实体五维，预生成长度为 stamina <= 0 ? 0 : floor(stamina / 10) 的序列
     *  - 敌人方：根据实体意图分布表，在战斗中动态生成意图序列。对于不同的敌人类型，有不同的序列生成方式
     *    - cthulhu：根据 speed、damage、defense、evasion 生成
     *    - immovable：根据 speed、damage、defense 生成，这种敌人没有闪避能力，只有基础免伤，意图只有observe与attack
     *
     * 玩家方结果序列分为攻击结果序列、防御结果序列。
     *  - 使用攻击/防御战术将触发结果序列判定，随后同时推进攻击结果序列与防御结果序列。
     *
     * 实体数值在战斗中因增益 / 减益发生**临时**变化时，不重新生成序列，而是叠加最终结算增益/减益。
     *  - 玩家方实体各自维护独立的结果序列，除非自身必要数值发生变化，否则序列样貌永远不变
     *  - 玩家方序列耗尽时，扣除一定量 stamina ，随后重新生成
     *  - 序列长度为 0 时，实体无法行动
     *
     * 玩家方实体可预测自身 n 次行动的结果，在ui上表现为自身序列结果可见
     *  - n 的大小由自身灵力（spiritual）大小决定
     *  - 每 5 点灵力可预测 1 次行动
     *  - 灵力为 0 时不可预测
     *
     * 攻击结果生效后即刻执行，防御结果生效后储存进pendingDefense字段待消费。
     * 
     * instant伤害不参与任何正常结算，直接对目标造成 floor(
     *    MagicWeapon.damage
     *    × (1 + floor(spiritual / 10) × 0.5)
     *    × combatBonus
     *    × 0.75
     *  )
     * 的真实伤害。
     */
    resultSequence: {
        /**
         * - miss = 0
         * - graze 的值在 0 与 baseAttack 间浮动
         * - hit = baseAttack
         * - crit 的值在 baseAttack 与 critMultiplier × baseAttack 间浮动
         *
         * - critMultiplier = clamp(1.5 + PER / (PER + K) × 2.0, 1.5, 3.5)，其中 K = 10。
         */
        attackResult: AttackResult[]
        /**
         * - fail = 0
         * - partial 的值在 basePartialReduction 与 finalPartialReduction 间浮动，最大不超过 0.999。
         * - dodge = 1
         */
        defenseResult: DefenseResult[]
    }
    /**
     * 状态
     */
    status: CombatStatus[]
    /**
     * 待消费防御
     * 
     * 示例：
     * ['免伤',1]，即闪避
     * ['免伤',0.988]，即部分闪避
     * ['免伤',0]，即闪避失败
     */
    pendingDefense: ['免伤', number][]
}

/**
 * 战斗敌人
 */
export type CombatEnemy = CombatDynamicState & EnemyTemplate & InstanceId

/**
 * 战斗友方
 */
export interface CombatAlly extends EntityTemplate, CombatDynamicState, Omit<PlayerDynamicState, 'xp' | 'level'> {
    /**
     * 战斗增益 = clamp(1.0 + (KNO - 3) × 0.05, 0.5, 2.0)
     */
    combatBonus: number
}

// ==========================
// 9. 地图系统
// ==========================

/**
 * 出口基类
 *
 * 对 Local 来说，若没有 targetId 则视为一种陷阱出口，进入即死亡。
 * ZoneTransfer、SanctuaryReturn 不需要 targetId，引擎会自动处理区域转移、庇护所返回。
 */
export interface Ex {
    targetId?: string
    label: string
}
/**
 * 本地出口
 *
 * 用于同一区域内部节点之间跳转。
 */
export interface Local extends Ex {
    type: 'local'
}
/**
 * 区域传送出口
 *
 * 用于触发LLM生成新区域。不需要目标ID。
 * 仅庇护所、链式叙事需要，单元剧不需要。
 */
export interface ZoneTransfer extends Ex {
    type: 'zone_transfer'
}
/**
 * 庇护所回归出口
 */
export interface SanctuaryReturn extends Ex {
    type: 'sanctuary_return'
    /**
     * 是否为结局
     *
     * 注意：单元剧不需要该字段。
     *
     * 对链式叙事而言：
     * - 为 true 表示结局；
     * - 否则表示叙事链挂起。
     */
    isEnding?: boolean
}
/**
 * 出口联合类型
 */
export type Exit = Local | ZoneTransfer | SanctuaryReturn

/**
 * 节点交互
 */
export interface Interaction {
    desc: string
    results: {
        timeCost: GameRound['absoluteTick']
        soundEffect: SoundType
        /** 
         * 交互叙事文本
         */
        narrative: string
        stateChange?: {
            /** 
             * 正数为恢复，负数为扣除。
             */
            hp?: number
            sanity?: number
            /** 
             * 失去的物品或人员 ID
             */
            lose?: Array<string>
            /**
             * 获得的物品或人员
             *
             * 失去只需 ID，而获得需要完整模板。
             */
            gain?: Array<ItemTemplate | NpcTemplate>
            /** 
             * 生成的敌人
             */
            spawnEnemy?: EnemyTemplate[]
            /**
             * 解锁的节点
             *
             * 每项为：
             * - 上锁节点在 Zone.nodes 中的键名
             * - 上锁节点的行动按钮描述
             */
            unlock?: Array<[string, string]>
        }
    }
    /**
     * 完成交互必须的前置条件
     */
    requirements?: {
        /**
         * 物品 ID 列表
         */
        items?: string[]
        /**
         * 人员 ID 列表
         */
        staff?: string[]
        /**
         * 谜题
         */
        puzzleSolved?: Puzzle
    }
}

/**
 * 节点模板
 */
export interface NodeTemplate {
    name: string
    desc: string
    visualPrompt: string
    /**
     * 危险等级
     *
     * 影响搜查遇敌速度及敌人生成数量；
     * 必须是 1-50 的整数；
     * 若不设置，则视为安全节点，搜查不会遇敌；
     * 威胁度为1遇敌1~2；
     * 为2遇敌1~3、为3遇敌2~4、为4遇敌3~5。以此类推。
     */
    threatLevel?: number
    /**
     * 子节点列表
     *
     * 注意：位于该列表中的父子、兄弟节点之间不需要显式定义任何出口，
     * 否则游戏会崩溃。引擎会自动处理它们之间的连接。
     */
    childrenIds?: string[]
    interactions?: Interaction[]
    nodeNpc?: NodeNpcTemplate
    items?: Item[]
    /**
     * 节点特定敌人
     * 
     * 节点数据结构中若有该字段，则遇敌时（不论是何种方式），必然只遇到data中定义的敌人；
     * 战斗结束后，引擎会将该字段从当前节点的数据结构中清除；
     * 此后才会正常根据节点的“威胁等级”字段遇敌。
     */
    specificEnemy?: {
        data: EnemyTemplate[]
        spawnCondition: 'on_enter' | 'on_search' | 'on_interact'
    }
    /**
     * 出口列表
     *
     * 易错点：
     *
     * 如果 node1 有一个通往 node2 的出口，但 node2 没有返回 node1 的出口，
     * 且 node1 与 node2 间没有父子或兄弟关系，则引擎不会自动处理连接，
     * 玩家将无法从 node2 返回 node1。
     *
     * 因此，除非设计如此，例如陷阱、特殊拓扑或叙事要求，
     * 否则任何在逻辑 / 空间上本应双向连接的非父子、兄弟节点，
     * 彼此之间都必须显式定义出口。
     */
    exits?: Exit[]
}

/**
 * 运行时节点
 */
export interface Node extends NodeTemplate, Asset {
    /**
     * 节点被搜索的次数
     */
    searchCount: number
    /**
     * 节点是否已被访问
     */
    isVisited: boolean
    /**
     * 锁定状态
     */
    lock?: string
}

/** 
 * 设施模板
 */
export interface FacilityTemplate {
    id: string
    name: string
    desc: string
    nodeMounted: string    // 挂载节点
    production: Partial<SanctuaryState>   // 每日产出，允许设施每日产出侵蚀度
}

/** 
 * 运行时设施
 * 
 * 设施可升级，升级时调用llm，由llm决定消耗多少废料，升级后设施等级加1，可无限升级，但升级难度会逐渐提高，有概率升级失败。
 */
export interface Facility extends FacilityTemplate {
    level: number
}

/**
 * 区域模板
 */
export interface ZoneTemplate {
    id: string
    name: string
    background: string
    topology: string
    nodesCount: number
    visualStyle: string
    entrance: string
    /**
     * 时间流速异常系数
     *
     * - = 0：时间停止
     * - < 1.0：时间流速减慢，持续性状态伤害生效减缓
     * - = 1.0：正常流速
     * - > 1.0：时间流速加快，理智消耗速度被放大
     */
    dilationFactor: number
    nodes: Record<string, NodeTemplate>
}

/**
 * 运行时区域
 */
export interface Zone extends ZoneTemplate {
    /**
     * 由引擎注入的字段！与LLM生成无关！
     */
    generatedPlotPoints?: PlotPoint[]
    nodes: Record<string, Node>
}

/**
 * 庇护所模板
 */
export interface SanctuaryTemplate extends ZoneTemplate {
    initialState: SanctuaryState & {
        facility: FacilityTemplate[]
    }
}

/**
 * 运行时庇护所
 */
export interface Sanctuary extends Omit<SanctuaryTemplate, 'initialState'>, SanctuaryState {
    facility: Facility[]
    storage: ItemInstance[]
    /**
     * 在册居民池
     *
     * 与 SanctuaryState.population（宏观幸存者数字）解耦：population 描述庇护所
     * 整体人口规模（影响口粮消耗与仓储容量），residents 描述可被事件系统
     * 点名操作的具体个体（恢复/消耗 hp、san，获得/失去）。
     *
     * 由引擎注入，非模板字段；初始为空数组，
     * 通过 SanctuaryEvent 的 residents 变更逐步填充。
     */
    residents: Resident[]
}

// ==========================
// 10. 庇护所系统
// ==========================

/**
 * 居民模板
 */
export interface ResidentTemplate {
    id: string
    name: string
}

/**
 * 居民
 */
export interface Resident extends ResidentTemplate {
    hp: number
    san: number
}

/**
 * 庇护所事件
 */
export interface SanctuaryEvent {
    desc: string
    choices: Array<{
        desc: string
        stateChange: {
            food?: number
            water?: number
            medicine?: number
            electricity?: number
            scraps?: number
            morale?: number
            erosion?: number
            residents?: number // 负为随机失去、正为从居民库随机生成
            | Array<
                | Resident // 获得新居民
                | Resident['id'] // 失去已有居民
                |
                [Resident['id'],
                    (
                        | 1 // hp恢复
                        | 2 // hp消耗
                        | 3 // san恢复
                        | 4 // san消耗
                    ), number // 值
                ]>
            spawnEnemy?: boolean
        }
    }>
}

/**
 * 庇护所事件抉择的 stateChange 类型（choices 内每一项）。
 */
export type SanctuaryEventChange = NonNullable<SanctuaryEvent['choices'][number]['stateChange']>

// ==========================
// 11. 叙事系统
// ==========================

/**
 * 伏笔基类
 */
export interface PP {
    id: string
    content: string
    /**
     * 暗示
     *
     * 一段文本，暗示本伏笔的解决方案。
     * 解决方式可以是获得某个物品、见到某个人、解决某个谜题、到达某个节点。
     *
     * 当需要解决的伏笔数大于 0 时，LLM 可从已有伏笔中挑选某个伏笔，
     * 根据其 hint 字段，在某个 item、NPC、Puzzle、Node 的根数据结构中
     * 添加 `toSolvePP: PP['id']` 字段。
     *
     * 伏笔的解决地不能是本张地图，其解决位置必须在之后的某张地图里。
     */
    hint: string
    /**
     * 是否已解决
     *
     * 默认为 false。
     * 当拥有 `toSolvePP: PP['id']` 字段的对象与玩家产生有效交互后，
     * 引擎自动将该字段改为 true 并抛出日志。
     * 
     * LLM生成不需要该字段！
     */
    isSolved?: boolean
}

/**
 * 主线伏笔
 */
export interface MainPlotPoint extends PP {
    type: 'main'
}

/**
 * 支线伏笔
 */
export interface SidePlotPoint extends PP {
    type: 'side'
}

/**
 * 伏笔联合类型
 */
export type PlotPoint = MainPlotPoint | SidePlotPoint

/**
 * 伏笔网络
 *
 * 第一项为主线伏笔，第二项为支线伏笔。
 */
export type PlotPointNet = [MainPlotPoint[], SidePlotPoint[]]

/**
 * 叙事主旨
 */
export interface NarrativeMotif {
    id: string
    /** 子主题 / 子主旨。 */
    sub: string
    /** 主色。 */
    mainColor: string
    /** 辅色。 */
    subColor: string
    /** 生成提示词。 */
    prompt: string
}

/**
 * 叙事模式。
 */
export interface NarMode extends NarrativeMotif {
    id: NarrativeMode
}

/**
 * 叙事节奏。
 */
export interface NarPac extends NarrativeMotif {
    id: NarrativePacing
}

/**
 * 子叙事主题。
 */
export interface NarrativeThemeSub extends NarrativeMotif {
    belong: NarrativeTheme
}

/**
 * 叙事主轴。
 */
export interface NarrativeMainAxis extends NarrativeMotif { }

/**
 * 叙事配置
 */
export interface StoryConfig {
    mode: {
        id: NarMode['id']
        prompt: NarMode['prompt']
    }

    pacing: {
        id: NarPac['id']
        prompt: NarPac['prompt']
    }

    theme: {
        id: NarrativeThemeSub['id']
        prompt: NarrativeThemeSub['prompt']
    }

    motif?: {
        id: NarrativeMotif['id']
        prompt: NarrativeMotif['prompt']
    }

    mainAxis?: {
        id: NarrativeMainAxis['id']
        prompt: NarrativeMainAxis['prompt']
    }

    nodeCount: number

    /** 张力，范围 0-1000。 */
    tension: number
}

/**
 * 叙事链
 */
export interface StoryArc {
    /**
     * 叙事链唯一 ID。
     *
     * 建议格式：
     * `${theme}_${motif}_${mainAxis}_${length}`
     */
    id: string

    config: StoryConfig

    /**
     * 叙事进度，范围 0-1000。
     *
     * 达到 90% 以上且张力 >= 85% 时，可触发结局。
     */
    progress: number

    /** 严格限定该条叙事链将贯穿多少个区域。 */
    length: number

    status: StoryArcStatus

    /** 叙事链下的所有伏笔。 */
    plotPoints: PlotPointNet

    /** 叙事链当前索引。 */
    currentIndex: number

    /** 暗线。 */
    hiddenAxis: {
        /** 前一次暗线描述，由 LLM 结合所有伏笔生成。 */
        prevDesc: string

        /** 结合新伏笔与上一次暗线描述生成的新版描述。 */
        newDesc: string

        /**
         * 暗线是否已被玩家推理出来。
         *
         * 一条叙事链完结后，将进入暗线推理环节。
         * LLM 会比对实际暗线与玩家推理出的暗线的匹配程度，
         * 并基于此给予经验值奖励。该环节可直接跳过。
         *
         * 无论推理成功与否，暗线都将归档，
         * 作为下一条叙事链的可选主题、主旨、主线推送到叙事面板流程中，
         * 并始终保留直到玩家选择为止。
         */
        isRevealed: boolean
    }

    startTime: {
        zone: ZoneDate
        tick: GameRound['absoluteTick']
    }
}

/**
 * 归档叙事链
 */
export interface ArchivedStoryArc extends StoryArc {
    endTime: {
        zone: ZoneDate
        tick: GameRound['absoluteTick']
    }

    /** 由 LLM 生成的叙事链总结。 */
    summary: string
}

/**
 * 暗线
 *
 * 编织完毕后推送到叙事面板，供玩家在链式模式下选择。
 */
export interface HiddenAxis {
    theme: string
    motif: string
    mainAxis: string
    desc: string
}

/**
 * 链式叙事
 */
export interface ChainNarrative {
    /**
     * 规则。
     *
     * 用于链式叙事调整张力、伏笔生成等底层公式的系数。
     */
    rule: {
        /** 各种玩家状态在计算张力时的权重系数。 */
        pacingWeights: {
            health: number
            sanity: number

            /** 伏笔积压带来的压力权重。 */
            plots: number

            /** 深度带来的环境压力权重。 */
            depth: number

            /** 队友伤病带来的焦虑权重。 */
            companions: number
        }

        /** 伏笔生成的概率基数。 */
        foreshadowingRules: {
            earlyGameChance: number
            midGameChance: number
            lateGameChance: number

            /** 允许同时存在未解决的最大伏笔数。 */
            maxConcurrent: number
        }

        /** 触发与计算高潮阶段的临界参数。 */
        climaxParameters: {
            depthMultiplier: number
            sanityThreshold: number
            companionImpact: number
            plotPressureMax: number
        }

        /** 区域生成时的节点数量合理区间。 */
        nodeCountRange: {
            min: number
            max: number
            base: number
        }
    }

    /**
     * 分析。
     *
     * 引擎进行深度分析后得出的结果，用于链式叙事生成。
     */
    analysis: {
        /** 传入参数。 */
        params: {
            /** 叙事阶段。 */
            progress: {
                /**
                 * 宏观进度。
                 */
                macro: NarrativePhase

                /**
                 * 微观进度。
                 *
                 * 引擎层取值为 0-1000，
                 * UI 层与提交给 AI 时应显示为百分比。
                 */
                micro: number
            }

            /**
             * 张力。
             *
             * 引擎层取值为 0-1000，
             * UI 层与提交给 AI 时应显示为百分比。
             */
            tension: number

            /** 是否应触发结局。 */
            shouldTriggerEnding: boolean

            /** 活跃伏笔。 */
            activePlotPoints: PlotPointNet
        }

        /** 返回结果。 */
        output: {
            /** 需要生成的伏笔数量。 */
            ppToGenerate: {
                /** 主线伏笔数量。 */
                m: number

                /** 支线伏笔数量。 */
                s: number
            }

            /** 需要生成的节点数量。 */
            nodeToGenerate: number

            /** 需要解决的伏笔数量。 */
            ppToSolve: number
        }
    }
}

/**
 * 单元剧叙事
 *
 * 当前暂无额外字段，后续可扩展。
 */
export interface EpisodicNarrative { }

/**
 * 动态叙事状态
 *
 * 独立于单元剧、链式叙事之外的第三种叙事。
 *
 * 在战斗后等关键事件发生后必然生成一次；
 * 其他时间按照一定频次周期生成。
 *
 * 生成文本与玩家当前状态强相关，
 * 生成后将覆盖当前节点的叙事文本层，
 * 玩家离开该节点后刷新回原状态。
 */
export interface DyNarrative {
    emotionalTone: EmotionalTone
    vitalRecord: PlayerState['vitalRecord']
    stateTrend: Array<[DynamicVitalType, StateTrend]>
    triggers: {
        isNearDeath: boolean
        isExhausted: boolean
        isWeaponless: boolean
        isArmorless: boolean
        isNeuralCollapsing: boolean
        hasCompanionNearDeath: boolean
    }
}

// ==========================
// 12. 上帝状态与 llm 生成上下文
// ==========================

/**
 * 玩家上帝状态
 *
 * 游戏中最顶层的玩家运行时状态容器。
 */
export interface PlayerState extends Entity<PlayerTemplate, PlayerDynamicState>, CurrentTime, Stats {
    visualMode: VisualMode
    location: Location
    vitalRecord: VitalRecord
    sanctuary: Sanctuary
    neuralLink: NeuralLinkState
    companions: Array<Entity<NpcTemplate, NpcDynamicState>>
    /** 
     * 对话记录
     */
    dialogue?: Dialogue
    /** 
     * 已接受任务
     */
    questAccepted?: Quest[]
    /**
     * 已归档/完成任务
     */
    questArchived?: Quest[]
    /**
     * 当前叙事分析结果
     */
    narrative?: ChainNarrative['analysis']
    /**
     * 当前正在进行的叙事链
     */
    activeArc?: StoryArc
    /**
     * 已完结并封存的叙事链
     */
    archivedArcs?: ArchivedStoryArc[]
    /**
     * 编织好的所有暗线
     */
    archivedHiddenAxis?: HiddenAxis[]
}

/**
 * NPC 对话生成上下文
 */
export interface NpcDialogueGenerationContext {
    npc: Entity<NpcTemplate, NpcDynamicState>
    player: Entity<PlayerTemplate, PlayerDynamicState>
    location: Location['currentLocation']
    dialogue: Dialogue
}

/**
 * 区域生成上下文基类
 */
export interface GenerationContext {
    base: {
        mode: {
            id: StoryConfig['mode']['id']
            prompt: StoryConfig['mode']['prompt']
        }
        theme: {
            id: StoryConfig['theme']['id']
            prompt: StoryConfig['theme']['prompt']
        }
    }
    extra: {
        questAccepted: PlayerState['questAccepted']
    }
}

/**
 * 单元剧生成上下文
 */
export interface EpisodicGenerationContext extends GenerationContext {
    base: GenerationContext['base'] & {
        mode: {
            id: 'episodic'
        }
    }
    params: {
        nodeToGenerate: number
        tension: number
    }
    extra: GenerationContext['extra'] & {
        player: Entity<PlayerTemplate, PlayerDynamicState>
        companions: Array<Entity<NpcTemplate, NpcDynamicState>>
    }
}

/**
 * 链式生成上下文
 */
export interface ChainGenerationContext extends GenerationContext {
    base: GenerationContext['base'] & {
        mode: {
            id: 'chain'
        }
        pacing: {
            id: StoryConfig['pacing']['id']
            prompt: StoryConfig['pacing']['prompt']
        }
        motif: {
            id: NonNullable<StoryConfig['motif']>['id']
            prompt: NonNullable<StoryConfig['motif']>['prompt']
        }
        mainAxis: {
            id: NonNullable<StoryConfig['mainAxis']>['id']
            prompt: NonNullable<StoryConfig['mainAxis']>['prompt']
        }
    }
    params: ChainNarrative['analysis']
    extra: GenerationContext['extra'] & PlayerState['location']
}

/**
 * 区域生成上下文联合类型
 */
export type ZoneGenerationContext = ChainGenerationContext | EpisodicGenerationContext

/**
 * 动态叙事生成上下文
 *
 * 独立于单元剧、链式叙事外的第三种叙事生成上下文。
 */
export interface DyGenerationContext {
    location: PlayerState['location']
    /** 
     * 生成指令
     */
    directives: string
}

/**
 * 庇护所事件生成输入上下文
 *
 * 提供给 LLM 构思庇护所日常事件的原料：
 * 当前庇护所状态、居民池、玩家状态与时间信息。
 */
export interface SanctuaryEventGenerationContext {
    /**
     * 当前庇护所状态
     */
    sanctuary: Sanctuary
    /**
     * 当前玩家状态
     */
    player: PlayerState
    /**
     * 当前时间
     */
    time: ZoneDate
    /**
     * 最近一次事件的后续氛围（仅用于事件连续性）
     */
    lastEventDesc?: string
}

// ==========================
// 12. React 状态桥接
// ==========================

/**
 * 全局游戏状态数据
 */
export interface GameStateData {
    player: PlayerState
    settings: Settings
    gameState: GameState
    currentZone: Zone
}

/**
 * 全局游戏状态更新器
 */
export interface GameStateUpdaters {
    setPlayer: Dispatch<SetStateAction<PlayerState>>
    setCurrentZone: Dispatch<SetStateAction<Zone>>
    setCurrentNodeId: Dispatch<SetStateAction<string>>
    setSanctuary: Dispatch<SetStateAction<Sanctuary>>
    setSettings: Dispatch<SetStateAction<Settings>>
    setGameState: Dispatch<SetStateAction<GameState>>
}