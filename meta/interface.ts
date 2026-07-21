import {
    QuestStatus, Mood, LogType, AttributeType, VitalType, DynamicVitalType,
    StatusEffectType, ItemRarity, AccessoryEffectType, ConsumableEffectType, WeaponType, RelationshipPhase,
    CardEffectType, CardTarget, CharacterStyle, IntentType,
    NarrativePacing, SfxType, NarrativeMode, StoryArcStatus, NarrativePhase,
    VisorPanelType, VisualComponentKey, GameState, SanctuaryState,
    NarrativeTheme, StateTrend, EmotionalTone, CardFeature, _Array,
    VisualMode
} from './type';

//=======================================
// 核心基础接口 (Core Foundations)
//=======================================

/**
 * @设置
 */
export interface Settings {
    groqKeys?: string[]
    googleKeys?: string[]
    zhipuKeys?: string[]
    pollinationsKeys?: string[]
    chat2apiKeys?: string[]
    deapiKeys?: string[]
    qwenstudioKeys?: string[]
    ProxyBase?: string
    useProxyGroq?: boolean
    useProxyGoogle?: boolean
    useProxyZhipu?: boolean
    useProxyPollinations?: boolean
    useProxyChat2api?: boolean
    useProxyDeapi?: boolean
    useProxyQwenstudio?: boolean
    zoneModel: {
        provider: string
        model: string
    }
    npcDialogueModel: {
        provider: string
        model: string
    }
    npcReactionModel: {
        provider: string
        model: string
    }
    npcMemorySummaryModel: {
        provider: string
        model: string
    }
    npcMemoryConsolidationModel: {
        provider: string
        model: string
    }
    dyNarrativeModel: {
        provider: string
        model: string
    }
    imageModel: {
        provider: string
        model: string
    }
    videoModel: {
        provider: string
        model: string
    }
    speechModel: {
        provider: string
        model: string
    }
    embeddingModel: {
        provider: string
        model: string
    }
    dialogueSliceLength: number  // 对话索引切片长度，默认25
    preferredMediaType: 'image' | 'video'
    screenBrightness: number

    // 游戏平衡性动态配置
    gameConfig: {
        enemyEncounter: {
            baseChance: number
            threatDivisor: number
            searchBaseRisk: number
            searchRiskPerCount: number
            fatiguePenaltyFactor: number
        }
        searchCosts: {
            baseSanity: number
            baseStamina: number
            baseVigor: number
            fatigueBase: number
            staminaFatigueFactor: number
            vigorFatigueFactor: number
            knowledgeFactor: number
            perceptionFactor: number
            knowledgeRecoveryFactor: number
            scoutBonus: number
            perceptionWeight: number
            searchCountWeight: number
        }
        hintCosts: {
            sanityCost: number
        }
        mediaLoading: {
            enemySpawnDelay: number
            searchEnemySpawnDelay: number
            puzzleFailEnemySpawnDelay: number
        }
        discoveryThresholds: {
            high: number
            medium: number
            low: number
        }
        fatigueThresholds: {
            highWarning: number
            medium: number
            low: number
        }
        searchThresholds: {
            repetitiveWarning: number
            maxEffective: number
        }
        movementCosts: {
            baseStamina: number
            baseSanity: number
        }
        perceptionWeights: {
            basePerception: number
            searchCount: number
            agility: number
        }
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
            }
            vitals: {
                sanityCritical: number
                sanityLow: number
                sanityHigh: number
                hpHigh: number
                hpMedium: number
            }
        }
        equipmentSlots: {
            armor: number
            accessory: number
        }
    }
}

/**
 * @日志
 */
export interface Log {
    id: string;
    text: string;
    type: LogType;
    timestamp: string;
    indentLevel?: number;
}

/**
 * @现实日期
 */
export interface RealDate extends Date {
}
/**
 * @区域日期
 * 记录玩家在「The Zone」内部经历的主观异化时间。
 * 切断与现实时间的线性绑定。深渊中的认知逻辑被破坏，时间通过"周期"而非标准时分秒流逝。
 * 引入 `dilationFactor`{@link ZoneTemplate.initial}，用于实现不同区域的特殊环境机制，
 * 直接参与理智、体力、精力的消耗乘区计算。
 */
export interface ZoneDate {
    /** 
     * @探险经过的绝对主观天数
     */
    day: number;
    /** 
     * @当前时间周期 （0-12）
     */
    cycle: number;
    /** 
     * @当前认知刻度 （0-30）
     */
    tick: number;
}
/**
 * @游戏回合
 * 状态机运行期间的最小逻辑计量单元。
 * 将时间度量抽象为离散的动作刻度，支撑回合制核心系统。
 * 区分探索与战斗的结算域。确保玩家在探索时的移动，与战斗中出牌的消耗独立结算，
 * 同时维持一个底层不归零的绝对时钟（absoluteTick）用于处理长期剧情伏笔（PlotPoint）的触发。
 */
export interface GameRound {
    /** 
     * @绝对逻辑帧
     * 从游戏初始化以来的总回合数
     */
    absoluteTick: number;
    /**
     * @探索步数
     * 在区域节点间移动或执行搜索的总次数。
     */
    explorationStep: number;
    /**
     * @战斗回合计数
     * 仅当 GameState 处于 COMBAT 时累加。一旦脱战或结束战斗，必须由引擎强行收敛重置为 0。
     * 专用于计算战斗内卡牌（CardInstance）的持续效能（如护盾维持回合、流血回合）。
     */
    combatTurn: number;
}
/**
 * @当前时间
 */
export interface CurrentTime {
    currentRealTime: RealDate;
    currentZoneTime: ZoneDate;
    currentGameRound: GameRound
}

/**
 * @位置模板
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
        isSanctuary?: SanctuaryState
    }
    node: {
        id: string  // 节点键值
        name: Node['name']
        desc: Node['desc']
        isDangerous?: Node['threatLevel']
    }
}
/**
 * @之前的位置
 */
export interface PrevLocation extends Loc {
}
/**
 * @当前的位置
 */
export interface CurrentLocation extends Loc {
}
/**
 * @位置信息
 */
export interface Location {
    prevLocation: PrevLocation | null
    currentLocation: CurrentLocation
}

/**
 * @资产
 */
export interface Asset {
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
}

/**
 * @统计数据
 */
export interface Stats {
    killCount: number;
    searchCount: number;
    exploredZones: number;
    exploredNodes: number;
}

/**
 * @数据
 */
export type Attribute = Record<AttributeType, number>;
export type Vital = Record<VitalType, number>;


/**
 * @体征记录
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
 * @死亡状态
 */
export interface Death {
    reason: string
    timestamp: number
    location: Location
}

/**
 * @神经链接状态
 */
export interface NeuralLinkState {
    battery: number
    maxBattery: number
    integrity: number
    maxIntegrity: number
    noiseLevel: number
}

/**
 * @起源模板
 */
export interface OriginTemplate {
    id: string
    title: string
    desc: string
    player: PlayerTemplate
    companion?: NpcTemplate[]
    sanctuary: SanctuaryTemplate
}

/**
 * @装备状态
 */
export interface EquipState {
    weapons: [WeaponInstance | null, WeaponInstance | null]
    armors: (ArmorInstance | null)[]
    accessories: (AccessoryInstance | null)[]
}

/**
 * @战斗意图
 */
export interface CombatIntent {
    type: IntentType
    desc: string
    value?: number
    targetId?: string
}

/**
 * @实例id
 */
export interface InstanceId {
    instanceId: string
}

//=============================================================================
// 2.话语、记忆、关系、状态
//=============================================================================

export interface WordsTag {
    speakerName: string
}

export interface PlayerWordsTag extends WordsTag {
    type: 'player'
    location: Location['currentLocation']
    currentTime: CurrentTime['currentZoneTime']
}

export interface NpcWordsTag extends WordsTag {
    type: 'npc'
    mood: Mood
}

export interface Words<T extends WordsTag = WordsTag> {
    text: string
    thought?: string
    tag: T
}

export interface Dialogue {
    owner: {
        id: string
        name: string
    }
    /**
     * @对话数组
     * 第{@link Settings.dialogueSliceLength}轮对话结束立刻进行δ摘要
     */
    dialogue: Array<[
        Words<PlayerWordsTag>,
        Words<NpcWordsTag>
    ]>
}

/**
 * @记忆摘要
 * 一条摘要的生命周期分五个部分
 * 以δ层摘要为例：
 * 1.语义摘要：调用语义LLM生成summary,importanceScore,keyEntities
 * * 将从{@link PlayerState.dialogue}中读取到的符合{@link Settings.dialogueSliceLength}限定长度的npc对话提交给LLM
 * 2.向量嵌入：调用专门的embeddingLLM来生成summaryEmbedding,entitiesEmbedding
 * * 将前一步生成的summary,keyEntities提交给embeddingLLM即可
 * 3.引擎构建：引擎构建包括id,owner,startTime,endTime,hierarchy,dialogueIndex，以及前两步LLM返回在内的所有字段
 * 4.上层摘要id注入：当尚未摘要的δ层摘要条数达到5时，触发γ层摘要，引擎对照LLM返回的childIds列表，将parentId:MemorySummaries_γ['id']字段注入这5条δ层摘要中
 * 5.长期维护：摘要的importanceScore的值会随着lastAccessedAt、accessCount、accessRatio这三个字段的变化动态演变，分数长期为0时删除摘要，但其下辖的子摘要不受影响
 */
export interface MemorySummaries {
    /**
     * @语义摘要环节
     */
    summary: string
    keyEntities: string[]   // 关键实体（事件、地点等），用于过滤
    importanceScore: number // 0-1，重要性评分，用于检索优先级
    /**
     * @向量嵌入环节
     */
    summaryEmbedding?: number[]   // 记忆摘要生成的向量
    entitiesEmbedding?: number[]  // 关键实体的向量
    /**
     * @引擎构建环节
     */
    id: string
    owner: Dialogue['owner']
    startTime: ZoneDate
    endTime: ZoneDate
    /**
     * @上层摘要id注入环节
     */
    parentId?: string
    /**
     * @长期维护环节
     */
    accessCount: number        // 被检索的总次数，是涨分的基础
    accessRatio: number        // 被检索次数占所有摘要检索总次数的比例，对摘要的评分影响深远
    lastAccessedAt?: ZoneDate  // 最后一次被检索的日期，离当前日期越近分数越高
}
/**
 * @记忆摘要δ层
 * 每{@link Settings.dialogueSliceLength}轮对话摘要为一条δ摘要
 */
export interface MemorySummaries_δ extends MemorySummaries {
    hierarchy: 'δ'
    /**
     * @对话索引范围
     * {@link Dialogue.dialogue}
     * {@link Settings.dialogueSliceLength}
     */
    dialogueIndex: {
        start: number // Settings['dialogueSliceLength']为25的情况下，为0、25、50、...
        end: number   // Settings['dialogueSliceLength']为25的情况下，为24、49、74、...
    }
}
/**
 * @记忆摘要γ层
 * 每五条δ层摘要摘要为一条γ层摘要
 */
export interface MemorySummaries_γ extends MemorySummaries {
    hierarchy: 'γ'
    childIds: _Array<MemorySummaries_δ['id'], 5>
}
/**
 * @记忆摘要β层
 * 每五条γ层摘要摘要为一条β层摘要
 */
export interface MemorySummaries_β extends MemorySummaries {
    hierarchy: 'β'
    childIds: _Array<MemorySummaries_γ['id'], 5>
}
/**
 * @记忆摘要α层
 * 每五条β层摘要摘要为一条α层摘要
 */
export interface MemorySummaries_α extends MemorySummaries {
    hierarchy: 'α'
    childIds: _Array<MemorySummaries_β['id'], 5>
}
/**
 * @记忆金字塔
 */
export interface MemoryPyramid {
    α: Array<MemorySummaries_α>
    β: Array<MemorySummaries_β>
    γ: Array<MemorySummaries_γ>
    δ: Array<MemorySummaries_δ>
}

/**
 * @关系阶段
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
 * @状态配置
 */
export interface StateConfig {
    threshold: number  // 基于 0-100 的百分比
    description: (val: number, max: number) => string
    narrative: (percent: number) => string
}

//=============================================================================
// 3. 状态效果系统 (Status Effect System)
//=============================================================================

export interface StatusEffectSource {
    entityId: string
    entityName: string
    cardId?: string
    cardName?: string
    itemId?: string
    itemName?: string
}

export interface StatusEffect {
    id: string
    type: StatusEffectType
    duration: number
    value: number
    source: StatusEffectSource
    stackCount?: number
    maxStacks?: number
    ticksRemaining?: number;
    appliedAt: number;
}

//=============================================================================
// 4. 物品系统 (Item System)
//=============================================================================

/**
 * @物品模板基类
 */
export interface BaseItemTemplate {
    id: string
    name: string
    desc: string
    rarity: ItemRarity
}

/**
 * @武器模板
 */
export interface WeaponTemplate extends BaseItemTemplate {
    type: 'weapon'
    weaponType: WeaponType  // 武器的具体类型，如是火枪还是弹道
    meleeDamage?: number    // 武器的近战伤害
    rangeDamage?: number    // 武器的远程伤害
    maxUses: number
}
/**
 * @护甲模板
 */
export interface ArmorTemplate extends BaseItemTemplate {
    type: 'armor'
    defense: number
    maxUses: number
}
/**
 * @饰品模板
 */
export interface AccessoryTemplate extends BaseItemTemplate {
    type: 'accessory'
    effects: [
        AccessoryEffectType,
        number,      // 装备后持续生效
    ][]
}
/**
 * @消耗品模板
 */
export interface ConsumableTemplate extends BaseItemTemplate {
    type: 'consumable'
    effects: [
        ConsumableEffectType,
        number,
        number?  // 效果持续的回合数，有持续时间的消耗品一般都是buff类效果，在战斗外使用这种物品后，只要还有回合数残余，就可以在战斗中继承该效果
    ][]
}
/**
 * @文档模板
 */
export interface DocumentTemplate extends BaseItemTemplate {
    type: 'document'
    documentContent: string
}
/**
 * @音频模板
 */
export interface AudioTemplate extends BaseItemTemplate {
    type: 'audio'
    audioScript: string
}
/**
 * @材料模板
 */
export interface MaterialTemplate extends BaseItemTemplate {
    type: 'material'
}
/**
 * @物品模板联合类型
 */
export type ItemTemplate = WeaponTemplate | ArmorTemplate | AccessoryTemplate | ConsumableTemplate | DocumentTemplate | AudioTemplate | MaterialTemplate

/**
 * @物品基类
 * 物品与物品实例不同，其介于物品模板与物品实例之间
 * 主用于地图文件中的物品定义
 * 如果直接在地图文件中定义实例的InstanceId，不仅繁琐而且不合逻辑
 * 因此设置该中间状态，将发现深度、数量赋予该状态
 */
export interface BaseItem extends BaseItemTemplate {
    discoveryThreshold?: number     // 没有则视为搜查立刻获得
    quantity?: number    // 没有则默认为1
}
/**
 * @武器
 */
export interface Weapon extends BaseItem, WeaponTemplate {
}
/**
 * @护甲
 */
export interface Armor extends BaseItem, ArmorTemplate {
}
/**
 * @饰品
 */
export interface Accessory extends BaseItem, AccessoryTemplate {
}
/**
 * @消耗品
 */
export interface Consumable extends BaseItem, ConsumableTemplate {
}
/**
 * @文档
 */
export interface Document extends BaseItem, DocumentTemplate {
}
/**
 * @音频
 */
export interface Audio extends BaseItem, AudioTemplate {
}
/**
 * @材料
 */
export interface Material extends BaseItem, MaterialTemplate {
}

export type Item = Weapon | Armor | Accessory | Consumable | Document | Audio | Material;

/**
 * @物品实例基类
 */
export interface BaseItemInstance extends Asset, InstanceId {
}
/**
 * @装备实例
 */
export interface WeaponInstance extends Weapon, BaseItemInstance {
    currentUses: number
}
/**
 * @护甲实例
 */
export interface ArmorInstance extends Armor, BaseItemInstance {
    currentUses: number
}
/**
 * @饰品实例
 */
export interface AccessoryInstance extends Accessory, BaseItemInstance {
}
/**
 * @消耗品实例
 */
export interface ConsumableInstance extends Consumable, BaseItemInstance {
}
/**
 * @文档实例
 */
export interface DocumentInstance extends Document, BaseItemInstance {
}
/**
 * @音频实例
 */
export interface AudioInstance extends Audio, BaseItemInstance {
}
/**
 * @材料实例
 */
export interface MaterialInstance extends Material, BaseItemInstance {
}
/**
 * @物品实例联合类型
 */
export type ItemInstance = WeaponInstance | ArmorInstance | AccessoryInstance | ConsumableInstance | DocumentInstance | AudioInstance | MaterialInstance;

//=============================================================================
// 5. 卡牌系统 (Card System)
//=============================================================================

/**
 * @卡牌主题
 */
export interface CardTheme {
    borderColor: string
    shadowColor: string
    bgGradient: string
    textColor: string
    label: string
}

/**
 * @卡牌效果
 */
export interface CardEffect {
    type: CardEffectType
    value: number
    scaling?: {   // 拥有该字段的卡牌，其效果值会受到对应属性加成
        attribute: AttributeType
        factor: number;
    },
    target: CardTarget
    requiredWeaponType?: WeaponType
    duration?: number  // 效果持续回合数
}

/**
 * @卡牌模板
 */
export interface CardTemplate {
    id: string
    name: string
    cost: number
    rarity: ItemRarity
    desc: string
    theme: CardTheme
    effects: CardEffect[]
    feature: CardFeature[]
}

/**
 * @卡牌实例
 */
export interface CardInstance extends CardTemplate, InstanceId {
    ownerId: string
    ownerName: string
}

//=============================================================================
// 6. 任务系统 (Quest System)
//=============================================================================

/**
 * @任务模板
 */
export interface QuestTemplate extends Record<string, any> {
    desc: string
    goals: Array<ItemTemplate | NpcTemplate>    // 目标：要求收集特定的物品，或者找到/护送特定的同伴
    rewards: Array<ItemTemplate | NpcTemplate>  // 奖励：给予特定的物品，或者有同伴永久加入队伍
    difficulty: number // 无难度上限，数字越大引擎结算的经验越多
}

/**
 * @运行时任务
 */
export interface Quest extends QuestTemplate {
    status: QuestStatus
}

//=============================================================================
// 7. 谜题系统 (Puzzle System)
//=============================================================================

/**
 * @填空谜题
 */
export interface ClozePuzzle {
    type: 'cloze'
    body: Array<(
        string  // 图案、数字、文字、符号、逻辑、代码等一切有内在联系的事物
        |
        ''     // 缺失的，需要Cloze的元素，
    )[]>
    answer: string[]  // 谜底，内部元素的排列必须与body数组中的''元素一一对应
}
/**
 * @选项谜题
 */
export interface ChoicePuzzle {
    type: 'choice'
    body: string[]
    answer: string
}
/**
 * @键入谜题
 */
export interface TypePuzzle {
    type: 'type'
    answer: string
}

/**
 * @谜题
 */
export interface Puzzle {
    title: string  // 谜题的标题，比如“解锁药品柜”
    lore: string   // 谜题的描述、背景等；直接作为键入谜题的谜面
    body: ClozePuzzle | ChoicePuzzle | TypePuzzle
    hints: string[]  // 提示
    restrictions: {
        timeCostPerAttempt: GameRound['absoluteTick']
        timeLimit?: GameRound['absoluteTick']
        maxAttempts?: number
    }
    rewards?: {
        items?: ItemTemplate[]
        sanity?: number
    }
    penalties?: {
        hp?: number
        sanity?: number
        spawnEnemy?: EnemyTemplate
        permanentLock?: boolean
        nodesToLock?: string | string[]
    }
}

//=============================================================================
// 8. 实体系统 (Entity System)
//=============================================================================

/**
 * @实体模板基类
 */
export interface EntityTemplate {
    id: string
    name: string
    gender?: 'male' | 'female' | 'both'
    desc: string
    visualPrompt: string
    initialState: {
        attribute: Attribute
        equipState: EquipState
    }
}

/**
 * @角色模板
 */
export interface CharacterTemplate extends EntityTemplate {
    initialState: EntityTemplate['initialState'] & {
        vital: Vital
        inventory: ItemTemplate[]
    }
}

/**
 * @玩家模板
 */
export interface PlayerTemplate extends CharacterTemplate {
    initialState: CharacterTemplate['initialState'] & {
        deck: CardTemplate[]
    }
    style: CharacterStyle
}

/**
 * @非玩家npc模板
 */
export interface NpcTemplate extends PlayerTemplate {
    initialState: PlayerTemplate['initialState'] & {
        trust: number
        quest: Record<string, QuestTemplate>
    }
}

/**
 * @敌人模板
 */
export interface EnemyTemplate extends EntityTemplate {
    zoneId?: string[]       // 限定敌人能在哪些区域、庇护所出现，只有本地预定义的敌人需要该字段
    lootTable?: Array<
        ItemTemplate & {
            dropProbability: number  // 物品掉落的概率
        }
    >
    intentDistribution: Record<IntentType, number>
    /**
     * @下一个意图
     */
    nextIntent: CombatIntent
}

/**
 * @动态基类
 */
export interface BaseDynamicState extends Asset, Record<AttributeType | VitalType | DynamicVitalType, number> {
    equipment: EquipState
}

/**
 * @玩家动态
 */
export interface PlayerDynamicState extends BaseDynamicState {
    xp: number
    level: number
    deck: CardInstance[]
    inventory: ItemInstance[]
    deathReason?: string     // 拥有该字段的角色视为死亡，没有则存活，string描述具体的死亡原因
}

/**
 * @Npc动态
 */
export interface NpcDynamicState extends PlayerDynamicState {
    trust: number
    totalDialogueRounds: number
    memory: MemoryPyramid
    mountedProfileId?: string
}

/**
 * @战斗动态
 */
export interface CombatDynamicState extends BaseDynamicState {
    /** 
     * @护盾
     */
    shield: number
    /** 
     * @状态效果
     */
    status: StatusEffect[]
    /** 
     * @基础攻击力 =
     * 敌人：力量值 × 威胁倍率
     * 玩家与npc：力量值
     */
    attackPower: number
    /** 
     * @基础闪避力 = 敏捷值
     * 闪避率 = 受击方.dodgePower / 攻击方.hitPower，≥1 完全闪避
     */
    dodgePower: number
    /** 
     * @基础命中力 = 感知值
     */
    hitPower: number
    /** 
     * @战斗增益 = 知识值
     */
    combatBonus: number
    /**
     * @下一个意图
     * 仅敌人需要该字段
     */
    nextIntent?: CombatIntent
}

/**
 * @实体容器
 */
export interface Entity<TStatic extends EntityTemplate, TDynamic extends BaseDynamicState> {
    static: TStatic
    dynamic: TDynamic
}

//=============================================================================
// 9. 地图系统 (Map System)
//=============================================================================

/**
 * @出口
 */
export interface Ex {
    // 对于Local和ZoneTransfer来说，没有则视为一种陷阱出口，进入则死亡
    // SanctuaryReturn不需要targetId，引擎会自动导向玩家的庇护所
    targetId?: string
    label: string
}
/**
 * @本地出口
 */
export interface Local extends Ex {
    type: 'local'
}
/**
 * @区域传送出口
 */
export interface ZoneTransfer extends Ex {
    type: 'zone_transfer'  // 前往下一个区域，只用于链式叙事，单元剧不需要
}
/**
 * @庇护所回归出口
 */
export interface SanctuaryReturn extends Ex {
    type: 'sanctuary_return'
    /**
     * @是否为结局
     * 注意！！！单元剧不需要该字段！！！
     * 对于链式叙事，为真即为结局，否则为“挂起”
     */
    isEnding?: boolean
}
/**
 * @出口联合类型
 */
export type Exit = Local | ZoneTransfer | SanctuaryReturn;

/**
 * @交互
*/
export interface Interaction {
    desc: string
    results: {
        timeCost: GameRound['absoluteTick']
        soundEffect: SfxType
        narrative: string
        stateChange?: {
            hp?: number                               // 正数为恢复，负数为扣除
            sanity?: number                           // 正数为恢复，负数为扣除
            lose?: Array<string>                      // 可以是物品或人员的id
            gain?: Array<ItemTemplate | NpcTemplate>  // 失去只需id即可，而获得则需要一个完整的模板
            spawnEnemy?: EnemyTemplate[]
            unlock?: Array<[
                string,  // 上锁节点在Zone的nodes列表中的键名
                string   // 上锁节点的行动按钮描述
            ]>
        }
    }
    requirements?: {
        items?: string[]  // 物品id列表
        staff?: string[]  // 人员id列表
        puzzleSolved?: Puzzle
    }
}

/**
 * @节点模板
 */
export interface NodeTemplate {
    name: string
    desc: string
    visualPrompt: string
    /**
     * @危险等级
     * 影响搜查遇敌速度，以及敌人生命、理智、体力、精力
     * 取值范围1-20，范围外引擎会报错，不设此字段即视为安全节点，搜查不会遇敌，可以是浮点数如1.678
     */
    threatLevel?: number
    /**
     * @子节点列表
     * 注意！！！位于该列表中的父子、兄弟节点之间不需要显式定义任何出口！！！否则游戏会崩溃！！！引擎将自动处理它们之间的连接！！！
     */
    childrenIds?: string[]
    interactions?: Interaction[]
    nodeNpc?: NpcTemplate
    items?: Item[]
    specificEnemy?: EnemyTemplate
    enemySpawnCondition?: 'on_enter' | 'on_search' | 'on_interact' | 'on_sanity_critical'
    /**
     * @出口列表
     * ！！！易错点！！！
     * node1有一个通往node2的出口，但node2没有返回node1的出口，且node1与node2间没有父子或兄弟关系；
     * 由于引擎不会自动处理非兄弟、父子节点间的连接，所以玩家将无法从node2返回node1；
     * 因此，除非就是这样设计的（比如陷阱或特殊的拓扑结构、叙事要求），否则任何在逻辑、空间上本应是双向连接的非父子、兄弟节点，彼此间都要显式定义出口!
     */
    exits?: Exit[]
}

/**
 * @运行时节点
 */
export interface Node extends NodeTemplate, Asset {
    searchCount: number
    isVisited: boolean
    /**
     * @锁定
     * 由引擎根据{@link Interaction.results.stateChange.unlock}的情况自动注入
     */
    lock?: string
}

/**
 * @区域模板
 */
export interface ZoneTemplate {
    id: string
    name: string
    background: string  // 区域的背景故事
    topology: string    // 区域的拓扑结构
    nodesCount: number  // 区域的节点总数
    visualStyle: string // 英文绘图提示词
    initial: {
        /**
         * @时间流速异常系数
         * - = 0：时间停止。
         * - < 1.0：时间流速减慢，持续性状态伤害（毒/流血）生效减缓。
         * - = 1.0：正常流速
         * - > 1.0：时间流速加快，理智消耗速度被放大。
         */
        dilationFactor: number
        entrance: string
    }
    nodes: Record<string, NodeTemplate>
}

/**
 * @运行时区域
 */
export interface Zone extends ZoneTemplate {
    generatedPlotPoints?: PlotPoint[]
    nodes: Record<string, Node>
}

/**
 * @庇护所模板
 */
export interface SanctuaryTemplate extends ZoneTemplate {
    initial: ZoneTemplate['initial'] & SanctuaryState
}

/**
 * @运行时庇护所
 */
export interface Sanctuary extends SanctuaryTemplate, SanctuaryState {
    storage: ItemInstance[]
}

//=============================================================================
// 12. 叙事系统
//=============================================================================

/**
 * @伏笔
 */
export interface PP {
    id: string
    content: string
    /** 
     * @暗示
     * 一段文本。暗示本伏笔的解决方案。可以是获得某个物品，见到某个人，解决某个谜题，到达某个节点
     * 在需要解决的伏笔数>0时，由LLM从已有伏笔中挑选某个伏笔，根据其该字段的值，在某个item、Npc、Puzzle、Node的根数据结构中添加toSolvePP:PP['id'] 字段
     * 伏笔的解决地不能是本张地图，其解决位置必须在之后的某张地图里
     */
    hint: string
    /**
     * @是否解决
     * 默认为false，当拥有toSolvePP:PP['id']字段的对象与玩家产生有效交互后，引擎自动将isSolved字段的值改为true并抛出日志
     */
    isSolved?: boolean
}
/**
 * @主线伏笔
 */
export interface MainPlotPoint extends PP {
    type: 'main'
}
/**
 * @支线伏笔
 */
export interface SidePlotPoint extends PP {
    type: 'side'
}
/**
 * @伏笔联合类型
 */
export type PlotPoint = MainPlotPoint | SidePlotPoint
/**
 * @伏笔网络
 */
export type PlotPointNet = [MainPlotPoint[], SidePlotPoint[]]

/**
 * @叙事主旨
 */
export interface NarrativeMotif {
    id: string
    sub: string
    mainColor: string
    subColor: string
    prompt: string
}
/**
 * @叙事节奏
 */
export interface NarMode extends NarrativeMotif {
    id: NarrativeMode
}
/**
 * @叙事节奏
 */
export interface NarPac extends NarrativeMotif {
    id: NarrativePacing
}
/**
 * @子叙事主题
 */
export interface NarrativeThemeSub extends NarrativeMotif {
    belong: NarrativeTheme
}
/**
 * @叙事主轴
 */
export interface NarrativeMainAxis extends NarrativeMotif {
}

/**
 * @叙事配置
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
    tension: number // 0-1000
}

/**
 * @叙事链
 */
export interface StoryArc {
    id: `${StoryConfig['theme']['id']}_${NonNullable<StoryConfig['motif']>['id']}_${NonNullable<StoryConfig['mainAxis']>['id']}_${StoryArc['length']}`
    config: StoryConfig
    progress: number         // 叙事进度(0-1000)。达到90%以上且张力>=85%（高潮）触发结局
    length: number           // 严格限定该条叙事链将贯穿多少个区域
    status: StoryArcStatus
    plotPoints: PlotPointNet // 叙事链下的所有伏笔
    currentIndex: number     // 叙事链当前索引
    hiddenAxis: {
        prevDesc: string     // 一段描述性文本，由LLM结合所有伏笔生成
        newDesc: string      // 结合新伏笔，以及前一次暗线描述，生成的新版描述
        isRevealed: boolean  // 暗线是否已被玩家推理出来，在一条叙事链完结后，将进入暗线推理环节，LLM将比对实际暗线与玩家推理出的暗线的匹配程度，并基于此给予一定的经验值奖励。可直接跳过。无论推理成功与否，暗线都将归档，作为下一条叙事链的可选主题、主旨、主线推送到NarritvePanel流程中，并始终保留直到玩家选择为止
    }
    startTime: {
        real: RealDate
        zone: ZoneDate
        tick: GameRound['absoluteTick']
    }
}

/**
 * @归档叙事链
 */
export interface ArchivedStoryArc extends StoryArc {
    endTime: {
        real: RealDate
        zone: ZoneDate
        tick: GameRound['absoluteTick']
    }
    summary: string // 由LLM生成
}

/**
 * @暗线
 * 编织完毕后推送到叙事面板供玩家在链式模式下选择
 */
export interface HiddenAxis {
    theme: string
    motif: string
    mainAxis: string
    desc: string
}

/**
 * @链式叙事
 */
export interface ChainNarrative {
    /** 
     * @规则
     * 用于链式叙事调整张力、伏笔生成等底层公式的系数。
     */
    rule: {
        /** 各种玩家状态在计算张力时的权重系数 */
        pacingWeights: {
            health: number
            sanity: number
            plots: number     // 伏笔积压带来的压力权重
            depth: number     // 深度带来的环境压力权重
            companions: number// 队友伤病带来的焦虑权重
        };
        /** 伏笔生成的概率基数 */
        foreshadowingRules: {
            earlyGameChance: number
            midGameChance: number
            lateGameChance: number
            maxConcurrent: number // 允许同时存在未解决的最大伏笔数
        };
        /** 触发与计算高潮阶段的临界参数 */
        climaxParameters: {
            depthMultiplier: number
            sanityThreshold: number
            companionImpact: number
            plotPressureMax: number
        };
        /** 区域生成时的节点数量合理区间 */
        nodeCountRange: {
            min: number
            max: number
            base: number
        }
    }
    /** 
     * @分析
     * 引擎进行深度分析后得出的结果
     * 用于链式叙事生成
     */
    analysis: {
        /** 
         * @传入参数
         */
        params: {
            /** 
             * @叙事阶段
             */
            progress: {
                /** 
                 * @宏观进度 
                 */
                marco: NarrativePhase
                /** 
                 * @微观进度 
                 * 引擎层取值为0-1000，但在ui层与提交给ai时应当显示为百分比
                 */
                micro: number
            }
            /** 
             * @张力 
             * 引擎层取值为0-1000，但在ui层与提交给ai时应当显示为百分比
             */
            tension: number
            /** 
             * @是否应触发结局 
             */
            shouldTriggerEnding: boolean
            /** 
             * @活跃的伏笔 
             */
            activePlotPoints: PlotPointNet
        }
        /** 
         * @返回结果
         */
        output: {
            ppToGenerate: {
                m: number
                s: number
            }
            nodeToGenerate: number
            ppToSolve: number
        }
    }
}
/**
 * @单元剧叙事
 */
export interface EpisodicNarrative {
    // 暂无，后续可能扩展
}

/**
 * @动态叙事
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
        hasCompanionNearDeath: boolean
        hasCompanionDistrust: boolean
        isNeuralCollapsing: boolean
        hasQuest: boolean
    }
}

//=============================================================================
// 13.上帝状态、Ai生成上下文
//=============================================================================

/**
 * @上帝状态
 */
export interface PlayerState extends Entity<PlayerTemplate, PlayerDynamicState>, CurrentTime, Stats {
    visualMode: VisualMode
    location: Location
    vitalRecord: VitalRecord
    sanctuary: Sanctuary
    neuralLink: NeuralLinkState
    questAccepted: Quest[]
    dialogue: Dialogue[]  // 存储玩家与所有npc的对话历史，需要通过id来检索与对应npc的对话历史
    companions: Entity<NpcTemplate, NpcDynamicState>[]
    narrative: ChainNarrative['analysis']  // 叙事配置
    activeArc?: StoryArc;                  // 当前正在进行的叙事链
    archivedArcs: ArchivedStoryArc[]       // 已完结并封存的叙事链记录
    archivedHiddenAxis: HiddenAxis[]       // 编织好的所有暗线
}

/**
 * @NPC对话生成上下文
 */
export interface NpcDialogueGenerationContext {
    npc: Entity<NpcTemplate, NpcDynamicState>
    player: Entity<PlayerTemplate, PlayerDynamicState>
    location: Location['currentLocation']
    dialogue: Dialogue
}
/**
 * @生成上下文
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
 * @单元剧生成上下文
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
        companions: Entity<NpcTemplate, NpcDynamicState>[]
    }
}
/**
 * @链式生成上下文
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
 * @区域生成上下文联合类型
 */
export type ZoneGenerationContext = ChainGenerationContext | EpisodicGenerationContext;

/** 
 * @动态叙事生成上下文
 * 独立于单元剧、链式叙事外的第三种叙事
 * 在战斗后等关键事件发生后必然生成一次
 * 其他时间按照一定频次周期生成，生成文本与玩家当前状态强相关
 * 生成后将覆盖当前节点的叙事文本层，在玩家离开该节点后刷新回原状态
 */
export interface DyGenerationContext {
    location: PlayerState['location']
    directives: string
}

export interface GameStateData {
    player: PlayerState;
    settings: Settings;
    gameState: GameState;
    currentZone: Zone;
}

export interface GameStateUpdaters {
    setPlayer: React.Dispatch<React.SetStateAction<PlayerState>>;
    setCurrentZone: React.Dispatch<React.SetStateAction<Zone>>;
    setCurrentNodeId: React.Dispatch<React.SetStateAction<string>>;
    setSanctuary: React.Dispatch<React.SetStateAction<Sanctuary>>;
    setSettings: React.Dispatch<React.SetStateAction<Settings>>;
    setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

//=============================================================================
// UI、electron、杂项接口定义
//=============================================================================

/**
 * @战斗视觉事件
 * 用于战斗界面中的视觉反馈，如伤害数字、治疗特效等。
 */
export interface CombatVisualEvent {
    id: string;
    type: 'damage' | 'heal' | 'block' | 'status' | 'miss' | 'crit' | 'card_play';
    value: number | string;
    target: string;
    timestamp: number;
}

export interface AudioLayer {
    base: GainNode | null;
    texture: GainNode | null;
    rhythm: GainNode | null;
    melody: GainNode | null;
    accent: GainNode | null;
}

export interface SpatialParams {
    x: number;
    y: number;
    z: number;
    roomSize: number;
}

export interface MixParams {
    masterVolume: number;
    ambienceVolume: number;
    sfxVolume: number;
    musicVolume: number;
    speechVolume: number;
    reverbMix: number;
    lowPassFreq: number;
    highPassFreq: number;
}

export interface AmbientEvent {
    type: SfxType;
    minInterval: number;
    maxInterval: number;
    probability: number;
    volumeRange: [number, number];
}

export interface ThemeConfig {
    baseFrequencies: number[];
    baseWaveform: OscillatorType;
    baseVolume: number;
    filterFreq: number;
    filterQ: number;
    lfoRate: number;
    lfoDepth: number;
    noiseVolume: number;
    noiseType: 'white' | 'pink' | 'brown';
    rhythmBPM: number;
    rhythmEnabled: boolean;
    melodyEnabled: boolean;
    melodyScale: number[];
    melodyRoot: number;
    reverbTime: number;
    reverbDecay: number;
    ambientEvents: AmbientEvent[];
}

export interface RoleUiConfig {
    icon: string;
    color: string;
    label: string;
}

export interface NoiseColorConfig {
    id: string;
    label: string;
    primary: string;
    hue: string;
    hex: string;
}

export interface VisualTextConfig {
    fontSize: number;
    fontFamily: string;
    color: string;
    glowIntensity: number;
    opacity: number;
    letterSpacing?: number;
    x?: number;
    y?: number;
}

export type VisualLayoutConfig = Record<VisualComponentKey, VisualTextConfig>;

export interface NeuralVisorProps {
    activePanel: VisorPanelType;
    onPanelChange: (panel: VisorPanelType) => void;
    currentNodeId: string;
    player: PlayerState;
    viewMode: 'camera' | 'bio';
    onToggleMode: () => void;
    onToggleMediaType?: () => void;
    currentZone: Zone | null;
    currentNode: Node | null;
    isGenerating: boolean;
    isTaskGenerating?: (mediaType: 'image' | 'video', type: 'scene' | 'enemy' | 'npc' | 'player', objId?: string) => boolean;
    preferredMediaType?: 'image' | 'video';
    onManualGen: (type: 'scene' | 'enemy' | 'npc' | 'player', mediaType?: 'image' | 'video') => void;
    onRandomSwitch?: (mediaType: 'image' | 'video', type: 'scene' | 'enemy' | 'npc' | 'player', nodeId?: string, currentUrl?: string) => Promise<string | null>;
    hasMultipleVariants?: (mediaType: 'image' | 'video', type: 'scene' | 'enemy' | 'npc' | 'player', nodeId?: string) => Promise<boolean>;
    logs: Log[];
    onAction: (actionType: 'move_local' | 'move_zone' | 'search' | 'interact_obj' | 'interact_npc' | 'generate_video' | 'unlock' | 'sanctuary_return', target?: string, label?: string) => void;
    onUseItem: (item: ItemInstance) => void;
    onDiscardItem: (item: ItemInstance) => void;
    onInteractWithCompanion: (npc: Entity<NpcTemplate, NpcDynamicState>) => void;
    onOpenSettings?: () => void;
    isSanctuary?: boolean;
    onToggleSanctuaryUI?: () => void;
    isCombat?: boolean;
    overrideImageUrl?: string | null;
    setNeuralNoise: (level: number) => void;
    isVisualFullscreen?: boolean;
    setIsVisualFullscreen?: (value: boolean) => void;
    onLevelUp?: (targetId: string, attr: any) => void;
}

export interface PanelTabConfig {
    id: VisorPanelType;
    label: string;
    icon: string;
    hotkey?: string;
    available: boolean;
}

//=======================================
// 11. 持久化系统 (Persistence System)
//=======================================

export interface NpcProfileMeta {
    profileId: string;
    name: string;
    lastModified: number;
    turnsCount?: number;
}

export interface ElectronFS {
    init: () => Promise<{ success: boolean; path?: string }>;
    saveZone: (zone: ZoneTemplate, NM?: 'chain' | 'episodic', arcId?: string) => Promise<{ success: boolean }>;
    listZones: () => Promise<{ success: boolean; files: string[] }>;
    loadRandomZone: () => Promise<{ success: boolean; data?: ZoneTemplate }>;

    // 叙事管理
    listNarrativeArcs: () => Promise<{ success: boolean; arcs: Array<{ title: string; mainAxis: string; zoneCount: number }> }>;
    listEpisodicZones: () => Promise<{ success: boolean; zones: Array<{ id: string; name: string; timestamp: number }> }>;
    loadArcZone: (arcId: string, zoneIndex?: number) => Promise<{ success: boolean; data?: ZoneTemplate; currentIndex?: number; maxIndex?: number }>;
    loadEpisodicZone: (zoneId?: string) => Promise<{ success: boolean; data?: ZoneTemplate }>;
    deleteNarrativeArc: (arcId: string) => Promise<{ success: boolean }>;
    deleteEpisodicZone: (zoneId: string) => Promise<{ success: boolean }>;

    saveImage: (zoneId: string, nodeId: string, filename: string, base64Data: string) => Promise<{ success: boolean }>;
    hasImage: (zoneId: string, nodeId: string, filename: string) => Promise<{ success: boolean; exists: boolean }>;
    loadImage: (zoneId: string, nodeId: string, filename: string) => Promise<{ success: boolean; data?: string }>;
    listImages: (zoneId: string, nodeId: string) => Promise<{ success: boolean; files: string[] }>;
    getNextImageIndex: (zoneId: string, nodeId: string) => Promise<{ success: boolean; index: number }>;
    saveVideo: (zoneId: string, nodeId: string, filename: string, videoUrl: string) => Promise<{ success: boolean }>;
    hasVideo: (zoneId: string, nodeId: string, filename: string) => Promise<{ success: boolean; exists: boolean }>;
    getVideoPath: (zoneId: string, nodeId: string, filename: string) => Promise<{ success: boolean; path?: string }>;
    listVideos: (zoneId: string, nodeId: string) => Promise<{ success: boolean; files: string[] }>;
    getNextVideoIndex: (zoneId: string, nodeId: string) => Promise<{ success: boolean; index: number }>;
    saveAudio: (zoneId: string, nodeId: string, filename: string, base64Data: string) => Promise<{ success: boolean }>;
    loadAudio: (zoneId: string, nodeId: string, filename: string) => Promise<{ success: boolean; data?: string }>;
    saveItems: (items: ItemTemplate[]) => Promise<{ success: boolean }>;
    loadItems: () => Promise<{ success: boolean; data?: ItemTemplate[] }>;
    saveGame: (saveName: string | null, saveData: GameStateData) => Promise<{ success: boolean; fileName?: string }>;
    listSaves: () => Promise<{ success: boolean; files: Array<{ name: string; size: number; modified: Date }> }>;
    loadGame: (fileName: string) => Promise<{ success: boolean; data?: GameStateData }>;
    deleteSave: (fileName: string) => Promise<{ success: boolean }>;
    saveConfig: (config: Settings) => Promise<{ success: boolean }>;
    loadConfig: () => Promise<{ success: boolean; data?: Settings }>;
    saveRawLog: (filename: string, content: string) => Promise<{ success: boolean }>;
    saveNpcMemory: (npcName: string, dialogue: any, memory: any) => Promise<{ success: boolean }>;
    loadNpcMemory: (npcName: string) => Promise<{ success: boolean; dialogue?: any; memory?: any }>;

    // 多人格组/记忆档案管理
    listNpcProfiles: (npcName: string) => Promise<{ success: boolean; profiles: NpcProfileMeta[] }>;
    saveNpcMemoryProfile: (npcName: string, profileId: string, dialogue: any, memory: any, metaName?: string) => Promise<{ success: boolean }>;
    loadNpcMemoryProfile: (npcName: string, profileId: string) => Promise<{ success: boolean; dialogue?: any; memory?: any; meta?: NpcProfileMeta }>;
    deleteNpcProfile: (npcName: string, profileId: string) => Promise<{ success: boolean }>;
}

export interface ElectronBridge {
    platform: string;
    version: string;
    fs: ElectronFS;
}

/**
 * 全局类型扩展：将 ElectronBridge 注入 window 对象
 */
declare global {
    interface Window {
        electron?: ElectronBridge;
    }
}
