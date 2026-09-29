/**
 * sanctuaryFactory.ts
 * 庇护所常量装配工厂
 *
 * 职责：以最小的填值成本与零冗余样板代码，装配出严格遵循元契约的庇护所模板及完整节点网格。
 *
 * 核心增强与优化：
 * 1. 庇护所头部直接填值：支持 sanctuary(id, name, background, topology, visualStyle, opts?, ...nodes)
 *    以及极简模式 sanctuary(id, name, opts?, ...nodes)，彻底告别 { id: '...', name: '...' } 键值包装；
 * 2. 军械防具直接填值：武器与护甲支持纯位置参数传入（如 I.weapon(id, name, desc, type, range, damage, crit, maxUses)），
 *    自动完成结构化封装与数值校准；
 * 3. 交互叙事直接填值：act(desc, narrative, opts?) 抽离最高频的描述与叙事为直接传值；
 * 4. 敌人四维直接填值：克苏鲁及巨构敌人属性支持元组传值 [speed, damage, defense, evasion, range?]；
 * 5. 节点出口与拓扑直接推断：createNode 第 4 参数可直接接纳出口数组 Exit[] 或子节点数组 string[]；
 * 6. 契约严格遵循：底层产物 100% 严丝合缝契合 meta/interface.ts 与 meta/type.ts。
 */

import {
    SanctuaryTemplate,
    NodeTemplate,
    Item,
    Weapon,
    Armor,
    Accessory,
    Storage,
    Consumable,
    Data,
    Material,
    ItemTemplate,
    Interaction,
    FacilityTemplate,
    UniqueResource,
    Exit,
    Local,
    ZoneTransfer,
    SanctuaryReturn,
    Puzzle,
    EnemyTemplate,
    CthulhuEnemyTemplate,
    ImmovableEnemyTemplate,
    CompanionTemplate,
    NodeNpcTemplate,
    EquipState,
    WeaponInstance,
    ArmorInstance,
    AccessoryInstance,
    StorageInstance,
    Tactic,
    QuestTemplate,
    ItemGrade,
    WeaponType,
    WeaponDamageType,
    AccessoryEffectType,
    ConsumableEffectType,
    SoundType,
    GameRound,
    CombatStyle,
    AttributeType,
    VitalType,
    DynamicVitalType,
    Target,
    TacticEffectType,
    IntentType,
    NecessaryResource,
    TacticType
} from '../../meta'

// ==========================
// 1. 通用工具与底层清洗
// ==========================

type Clean<T> = { [K in keyof T]?: Exclude<T[K], undefined> }

/** 剔除对象中所有 undefined 脏值 */
export const clean = <T extends object>(o: T): Clean<T> =>
    Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Clean<T>

/** SVG 矢量图标外壳包装 */
export const svg = (inner: string): string =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">${inner}</svg>`

// ==========================
// 2. 紧凑型配置接口定义
// ==========================

/** 物品基础配置选项 */
export interface CompactItemBaseOptions {
    size?: [number, number]
    grade?: ItemGrade
    threshold?: number
    discoveryThreshold?: number
    qty?: number
    quantity?: number
    fleshFusion?: number
    fleshFusionState?: number
    cognitiveErosion?: number
    cognitiveErosionState?: number
    causalInversion?: number
    causalInversionState?: number
}

/** 军械配置参数 */
export interface CompactWeaponOptions extends CompactItemBaseOptions {
    weaponType: WeaponType
    damageType?: WeaponDamageType
    weaponDamageType?: WeaponDamageType
    range: number
    damage: number
    crit: [chance: number, bonus: number] | { chance: number; bonus: number }
    maxUses: number
    hitRevise?: number
}

/** 护甲配置参数 */
export interface CompactArmorOptions extends CompactItemBaseOptions {
    defense: number
    maxUses: number
}

/** 数据道具配置选项 */
export interface CompactDataOptions extends CompactItemBaseOptions {
    doc?: string
    documentContent?: string
    audio?: string
    audioScript?: string
}

/** 交互事件额外选项 */
export interface CompactInteractionOptions {
    repeat?: number
    canRepeat?: number
    cost?: GameRound['absoluteTick']
    timeCost?: GameRound['absoluteTick']
    sound?: SoundType
    soundEffect?: SoundType
    hp?: number
    san?: number
    sanity?: number
    lose?: string[]
    gain?: Array<ItemTemplate | CompanionTemplate>
    spawnEnemy?: EnemyTemplate[]
    unlock?: Array<[string, string]>
    reqItems?: string[]
    reqStaff?: string[]
    puzzle?: Puzzle
    puzzleSolved?: Puzzle
    requirements?: Interaction['requirements']
    stateChange?: NonNullable<Interaction['results']['stateChange']>
}

/** 传统全配置对象兼容 */
export interface CompactInteractionConfig extends CompactInteractionOptions {
    desc: string
    narrative: string
}

/** 解谜配置选项 */
export interface CompactPuzzleOptions {
    hints?: string[]
    timeCost?: GameRound['absoluteTick']
    timeCostPerAttempt?: GameRound['absoluteTick']
    timeLimit?: GameRound['absoluteTick']
    maxAttempts?: number
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

/** 战术配置选项 */
export interface CompactTacticOptions {
    requireWeapon?: WeaponType
    effects?: Array<[Target, TacticEffectType, number, number]>
}

/** 敌人掉落项 */
export type EnemyLoot = ItemTemplate & { dropProbability: number }

/** 敌人配置选项 */
export interface CompactEnemyOptions {
    gender?: 'male' | 'female' | 'both'
    range?: number
    intents?: Partial<Record<IntentType, number>>
    loot?: EnemyLoot[]
}

/** 克苏鲁敌人直接填值四维元组 [speed, damage, defense, evasion, range?] */
export type CthulhuStatsTuple = [
    speed: number,
    damage: number,
    defense: number,
    evasion: number,
    range?: number
]

/** 不可移动敌人直接填值三维元组 [speed, damage, defense, range?] */
export type ImmovableStatsTuple = [
    speed: number,
    damage: number,
    defense: number,
    range?: number
]

/** 装备槽位配置 */
export interface CompactEquipOptions {
    weapons?: {
        main?: Weapon | WeaponInstance | null
        side?: Weapon | WeaponInstance | null
    }
    armors?: Array<Armor | ArmorInstance | null> | (Armor | ArmorInstance)
    accessories?: Array<Accessory | AccessoryInstance | null> | (Accessory | AccessoryInstance)
    storage?: Array<Storage | StorageInstance | null> | (Storage | StorageInstance)
}

/** 节点 NPC 配置选项 */
export interface CompactNpcOptions extends CompactEquipOptions {
    gender?: 'male' | 'female' | 'both'
    style?: CombatStyle
    attrs?: Partial<Record<AttributeType, number>>
    vitals?: Partial<Record<VitalType, number>>
    inventory?: ItemTemplate[]
    tactics?: Tactic[]
    trust?: number
    quests?: QuestTemplate[]
    canBeInvited?: NodeNpcTemplate['canBeInvited']
    willRoam?: NodeNpcTemplate['willRoam']
}

/** 同伴配置选项 */
export interface CompactCompanionOptions extends CompactEquipOptions {
    gender?: 'male' | 'female' | 'both'
    style?: CombatStyle
    attrs?: Partial<Record<AttributeType, number>>
    vitals?: Partial<Record<VitalType, number>>
    inventory?: ItemTemplate[]
    tactics?: Tactic[]
    affinity?: number
    needs?: QuestTemplate[]
}

/** 内联设施简写定义（由所属节点自动注入挂载键） */
export type InlineFacility = Omit<FacilityTemplate, 'nodeMounted'> & { nodeMounted?: string }

/** 节点扩展配置 */
export interface CompactNodeConfig {
    children?: string[]
    childrenIds?: string[]
    exits?: Exit[]
    items?: Item[]
    interacts?: Interaction[]
    interactions?: Interaction[]
    danger?: NodeTemplate['isDangerous']
    isDangerous?: NodeTemplate['isDangerous']
    npc?: NodeNpcTemplate
    nodeNpc?: NodeNpcTemplate
    map?: string
    facility?: FacilityTemplate | InlineFacility
    facilities?: Array<FacilityTemplate | InlineFacility>
}

/** 携带注册标识与待提取内联设施的节点结构 */
export type KeyedNode = NodeTemplate & {
    key: string
    _facilities?: FacilityTemplate[]
}

/** 庇护所选填项（包含初态资源与环境特质） */
export interface SanctuaryOptions {
    /** 基础食物储备 */
    food?: number
    /** 基础净水储备 */
    water?: number
    /** 基础必要资源合并元组 [food, water] */
    res?: [food: number, water: number]
    necessaryResource?: NecessaryResource
    /** 初始人口，缺省为 0 */
    pop?: number
    population?: number
    /** 初始深渊侵蚀度，缺省为 0 */
    erosion?: number
    /** 时空稀薄系数，缺省为 1.0 */
    factor?: number
    dilationFactor?: number
    /** 入口节点 Key，缺省自动使用首个挂载节点的 Key */
    entrance?: string
    /** 节点总数，缺省自动依照 nodes 数量推算 */
    nodesCount?: number
    /** 独特战略资源 */
    uniqueResource?: UniqueResource[]
    uniqueResources?: UniqueResource[]
    /** 顶层设施列表 */
    facility?: FacilityTemplate[]
    facilities?: FacilityTemplate[]
}

/** 传统庇护所元数据对象 */
export interface CompactSanctuaryMeta extends SanctuaryOptions {
    id: string
    name: string
    background: string
    topology: string
    visualStyle: string
}

/** 兼容传统配置单对象 */
export interface CompactSanctuaryConfig extends CompactSanctuaryMeta {
    nodes?: Record<string, NodeTemplate> | Array<KeyedNode | Record<string, NodeTemplate>>
}

// ==========================
// 3. 物品与实例装配工厂
// ==========================

const itemExtras = (o: CompactItemBaseOptions) => {
    const qty = o.qty ?? o.quantity
    return clean({
        discoveryThreshold: o.threshold ?? o.discoveryThreshold,
        quantity: qty !== undefined && qty > 1 ? qty : undefined,
        fleshFusionState: o.fleshFusion ?? o.fleshFusionState,
        cognitiveErosionState: o.cognitiveErosion ?? o.cognitiveErosionState,
        causalInversionState: o.causalInversion ?? o.causalInversionState
    })
}

export const createItem = {
    /** 消耗品 */
    consumable: (
        id: string,
        name: string,
        desc: string,
        effects: Array<[ConsumableEffectType, number, number?]>,
        opts: CompactItemBaseOptions = {}
    ): Consumable => ({
        id,
        name,
        desc,
        type: 'consumable',
        grade: opts.grade ?? 'standard',
        size: opts.size ?? [1, 1],
        effects,
        ...itemExtras(opts)
    }),

    /** 合成/修造材料 */
    material: (id: string, name: string, desc: string, opts: CompactItemBaseOptions = {}): Material => ({
        id,
        name,
        desc,
        type: 'material',
        grade: opts.grade ?? 'standard',
        size: opts.size ?? [1, 1],
        ...itemExtras(opts)
    }),

    /** 文本/音频情报资料（支持直接传入内容字符串） */
    data: (
        id: string,
        name: string,
        desc: string,
        docOrOpts?: string | CompactDataOptions,
        extraOpts: CompactDataOptions = {}
    ): Data => {
        const isDirectDoc = typeof docOrOpts === 'string'
        const docContent = isDirectDoc ? docOrOpts : docOrOpts?.doc ?? docOrOpts?.documentContent
        const opts = (isDirectDoc ? extraOpts : docOrOpts) ?? {}

        return {
            id,
            name,
            desc,
            type: 'data',
            grade: opts.grade ?? 'standard',
            size: opts.size ?? [1, 1],
            ...clean({
                documentContent: docContent,
                audioScript: opts.audio ?? opts.audioScript
            }),
            ...itemExtras(opts)
        }
    },

    /** 穿戴饰品 */
    accessory: (
        id: string,
        name: string,
        desc: string,
        effects: Array<[AccessoryEffectType, number]>,
        opts: CompactItemBaseOptions = {}
    ): Accessory => ({
        id,
        name,
        desc,
        type: 'accessory',
        grade: opts.grade ?? 'standard',
        size: opts.size ?? [1, 1],
        effects,
        ...itemExtras(opts)
    }),

    /**
     * 军械武器
     *
     * 支持直接填值：weapon(id, name, desc, weaponType, range, damage, crit, maxUses, opts?)
     * 兼容传统对象：weapon(id, name, desc, configObject)
     */
    weapon: (
        id: string,
        name: string,
        desc: string,
        arg4: WeaponType | CompactWeaponOptions,
        arg5?: number,
        arg6?: number,
        arg7?: [chance: number, bonus: number] | { chance: number; bonus: number },
        arg8?: number,
        arg9: CompactItemBaseOptions & { damageType?: WeaponDamageType; hitRevise?: number } = {}
    ): Weapon => {
        let opts: CompactWeaponOptions

        if (typeof arg4 === 'object') {
            opts = arg4
        } else {
            opts = {
                weaponType: arg4,
                range: arg5!,
                damage: arg6!,
                crit: arg7!,
                maxUses: arg8!,
                ...arg9
            }
        }

        const critObj = Array.isArray(opts.crit)
            ? { chance: opts.crit[0], bonus: opts.crit[1] }
            : opts.crit

        return {
            id,
            name,
            desc,
            type: 'weapon',
            weaponType: opts.weaponType,
            weaponDamageType: opts.damageType ?? opts.weaponDamageType ?? 'melee',
            range: opts.range,
            damage: opts.damage,
            crit: critObj,
            maxUses: opts.maxUses,
            grade: opts.grade ?? 'standard',
            size: opts.size ?? [2, 1],
            ...clean({ hitRevise: opts.hitRevise }),
            ...itemExtras(opts)
        }
    },

    /**
     * 防护装甲
     *
     * 支持直接填值：armor(id, name, desc, defense, maxUses, opts?)
     * 兼容传统对象：armor(id, name, desc, configObject)
     */
    armor: (
        id: string,
        name: string,
        desc: string,
        arg4: number | CompactArmorOptions,
        arg5?: number,
        arg6: CompactItemBaseOptions = {}
    ): Armor => {
        const isPositional = typeof arg4 === 'number'
        const defense = isPositional ? arg4 : arg4.defense
        const maxUses = isPositional ? arg5! : arg4.maxUses
        const opts = isPositional ? arg6 : arg4

        return {
            id,
            name,
            desc,
            type: 'armor',
            defense,
            maxUses,
            grade: opts.grade ?? 'standard',
            size: opts.size ?? [2, 2],
            ...itemExtras(opts)
        }
    },

    /** 容器储物箱 */
    storage: (id: string, name: string, desc: string, opts: CompactItemBaseOptions = {}): Storage => ({
        id,
        name,
        desc,
        type: 'storage',
        grade: opts.grade ?? 'standard',
        size: opts.size ?? [1, 1],
        ...itemExtras(opts)
    })
}

// ==========================
// 4. 实例生成与装备挂载
// ==========================

export const createInstance = {
    weapon: (w: Weapon, instanceId?: string, currentUses?: number): WeaponInstance => ({
        ...w,
        instanceId: instanceId ?? `inst_${w.id}`,
        currentUses: currentUses ?? w.maxUses
    }),
    armor: (a: Armor, instanceId?: string, currentUses?: number): ArmorInstance => ({
        ...a,
        instanceId: instanceId ?? `inst_${a.id}`,
        currentUses: currentUses ?? a.maxUses
    }),
    accessory: (acc: Accessory, instanceId?: string): AccessoryInstance => ({
        ...acc,
        instanceId: instanceId ?? `inst_${acc.id}`
    }),
    storage: (s: Storage, instanceId?: string): StorageInstance => ({
        ...s,
        instanceId: instanceId ?? `inst_${s.id}`
    })
}

const toWeaponInst = (w: Weapon | WeaponInstance | null | undefined, slot: string): WeaponInstance | null => {
    if (!w) return null
    if ('instanceId' in w) return w
    return createInstance.weapon(w, `inst_${w.id}_${slot}`)
}

const toArmorInst = (a: Armor | ArmorInstance | null | undefined, idx: number): ArmorInstance | null => {
    if (!a) return null
    if ('instanceId' in a) return a
    return createInstance.armor(a, `inst_${a.id}_${idx}`)
}

const toAccessoryInst = (acc: Accessory | AccessoryInstance | null | undefined, idx: number): AccessoryInstance | null => {
    if (!acc) return null
    if ('instanceId' in acc) return acc
    return createInstance.accessory(acc, `inst_${acc.id}_${idx}`)
}

const toStorageInst = (s: Storage | StorageInstance | null | undefined, idx: number): StorageInstance | null => {
    if (!s) return null
    if ('instanceId' in s) return s
    return createInstance.storage(s, `inst_${s.id}_${idx}`)
}

/** 组装规范化的 EquipState 结构 */
export const buildEquipState = (opts: CompactEquipOptions): EquipState => {
    const toArr = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v])

    const weapons = opts.weapons
        ? {
            main: toWeaponInst(opts.weapons.main, 'main'),
            side: toWeaponInst(opts.weapons.side, 'side')
        }
        : undefined

    const armors = opts.armors ? toArr(opts.armors).map((a, i) => toArmorInst(a, i)) : undefined
    const accessories = opts.accessories ? toArr(opts.accessories).map((acc, i) => toAccessoryInst(acc, i)) : undefined
    const storage = opts.storage ? toArr(opts.storage).map((s, i) => toStorageInst(s, i)) : undefined

    return clean({
        weapons,
        armors: armors?.length ? armors : undefined,
        accessories: accessories?.length ? accessories : undefined,
        storage: storage?.length ? storage : undefined
    }) as EquipState
}

// ==========================
// 5. 战术与任务工厂
// ==========================

/** 构建行动战术 */
export const createTactic = (
    type: TacticType,
    id: string,
    name: string,
    desc: string,
    apCost: number,
    opts: CompactTacticOptions = {}
): Tactic => ({
    type,
    id,
    name,
    desc,
    apCost,
    ...clean({
        requireWeapon: opts.requireWeapon,
        tacticEffect: opts.effects?.length ? opts.effects : undefined
    })
})

/** 构建任务委托 */
export const createQuest = (
    id: string,
    desc: string,
    difficulty: number,
    goals: Array<ItemTemplate | string>,
    rewards: Array<ItemTemplate | CompanionTemplate>
): QuestTemplate => ({
    id,
    desc,
    difficulty,
    goals,
    rewards
})

// ==========================
// 6. 敌人模型工厂
// ==========================

/** 构建战利品掉落项 */
export const createLoot = (item: ItemTemplate, dropProbability: number): EnemyLoot => ({
    ...item,
    dropProbability
})

const DEFAULT_INTENTS: Record<IntentType, number> = {
    attack: 60,
    defense: 0,
    buff: 10,
    debuff: 20,
    observe: 10
}

export const createEnemy = {
    /**
     * 克苏鲁活性生物
     * stats 支持直接填入元组 [speed, damage, defense, evasion, range?]
     */
    cthulhu: (
        id: string,
        name: string,
        desc: string,
        visualPrompt: string,
        stats: CthulhuStatsTuple | { speed: number; damage: number; defense: number; evasion: number; range?: number },
        opts: CompactEnemyOptions = {}
    ): CthulhuEnemyTemplate => {
        const isTuple = Array.isArray(stats)
        const speed = isTuple ? stats[0] : stats.speed
        const damage = isTuple ? stats[1] : stats.damage
        const defense = isTuple ? stats[2] : stats.defense
        const evasion = isTuple ? stats[3] : stats.evasion
        const range = (isTuple ? stats[4] : stats.range) ?? opts.range ?? 1

        return {
            type: 'cthulhu',
            id,
            name,
            desc,
            visualPrompt,
            speed,
            damage,
            defense,
            evasion,
            range,
            gender: opts.gender ?? 'both',
            intentDistribution: {
                ...DEFAULT_INTENTS,
                ...opts.intents
            },
            ...clean({
                lootTable: opts.loot?.length ? opts.loot : undefined
            })
        }
    },

    /**
     * 锚定不可动巨构
     * stats 支持直接填入元组 [speed, damage, defense, range?]
     */
    immovable: (
        id: string,
        name: string,
        desc: string,
        visualPrompt: string,
        stats: ImmovableStatsTuple | { speed: number; damage: number; defense: number; range?: number },
        opts: CompactEnemyOptions = {}
    ): ImmovableEnemyTemplate => {
        const isTuple = Array.isArray(stats)
        const speed = isTuple ? stats[0] : stats.speed
        const damage = isTuple ? stats[1] : stats.damage
        const defense = isTuple ? stats[2] : stats.defense
        const range = (isTuple ? stats[3] : stats.range) ?? opts.range ?? 1

        return {
            type: 'immovable',
            id,
            name,
            desc,
            visualPrompt,
            speed,
            damage,
            defense,
            range,
            gender: opts.gender ?? 'both',
            ...clean({
                lootTable: opts.loot?.length ? opts.loot : undefined
            })
        }
    }
}

// ==========================
// 7. NPC 与同伴工厂
// ==========================

const DEFAULT_ATTRIBUTES: Record<AttributeType, number> = {
    strength: 10,
    agility: 10,
    wisdom: 10,
    awareness: 10,
    will: 10,
    cthulhu: 0
}

const DEFAULT_VITALS = {
    maxHp: 100,
    maxSanity: 100,
    maxStamina: 100,
    maxVigor: 100
}

/** 构建节点驻守 NPC（visualPrompt 可省略，缺省自动使用 name） */
export function createNpc(
    id: string,
    name: string,
    desc: string,
    visualPrompt: string,
    opts?: CompactNpcOptions
): NodeNpcTemplate
export function createNpc(
    id: string,
    name: string,
    desc: string,
    opts?: CompactNpcOptions
): NodeNpcTemplate
export function createNpc(
    id: string,
    name: string,
    desc: string,
    arg4?: string | CompactNpcOptions,
    arg5?: CompactNpcOptions
): NodeNpcTemplate {
    const isVisual = typeof arg4 === 'string'
    const visualPrompt = isVisual ? arg4 : name
    const opts = (isVisual ? arg5 : arg4) ?? {}

    const equip = buildEquipState(opts)
    const hasEquip = Object.keys(equip).length > 0

    return {
        id,
        name,
        desc,
        visualPrompt,
        gender: opts.gender ?? 'both',
        style: opts.style ?? 'balance',
        initialState: {
            attribute: { ...DEFAULT_ATTRIBUTES, ...opts.attrs },
            vital: { ...DEFAULT_VITALS, ...opts.vitals },
            trust: opts.trust ?? 0,
            ...clean({
                equipState: hasEquip ? equip : undefined,
                inventory: opts.inventory?.length ? opts.inventory : undefined,
                uniqueTactic: opts.tactics?.length ? opts.tactics : undefined,
                quests: opts.quests?.length ? opts.quests : undefined
            })
        },
        ...clean({
            canBeInvited: opts.canBeInvited,
            willRoam: opts.willRoam
        })
    }
}

/** 构建随行同伴模板（visualPrompt 可省略，缺省自动使用 name） */
export function createCompanion(
    id: string,
    name: string,
    desc: string,
    visualPrompt: string,
    opts?: CompactCompanionOptions
): CompanionTemplate
export function createCompanion(
    id: string,
    name: string,
    desc: string,
    opts?: CompactCompanionOptions
): CompanionTemplate
export function createCompanion(
    id: string,
    name: string,
    desc: string,
    arg4?: string | CompactCompanionOptions,
    arg5?: CompactCompanionOptions
): CompanionTemplate {
    const isVisual = typeof arg4 === 'string'
    const visualPrompt = isVisual ? arg4 : name
    const opts = (isVisual ? arg5 : arg4) ?? {}

    const equip = buildEquipState(opts)
    const hasEquip = Object.keys(equip).length > 0

    return {
        id,
        name,
        desc,
        visualPrompt,
        gender: opts.gender ?? 'both',
        style: opts.style ?? 'balance',
        initialState: {
            attribute: { ...DEFAULT_ATTRIBUTES, ...opts.attrs },
            vital: { ...DEFAULT_VITALS, ...opts.vitals },
            affinity: opts.affinity ?? 0,
            needs: opts.needs ?? [],
            ...clean({
                equipState: hasEquip ? equip : undefined,
                inventory: opts.inventory?.length ? opts.inventory : undefined,
                uniqueTactic: opts.tactics?.length ? opts.tactics : undefined
            })
        }
    }
}

/** 职责替代规约构造器 */
export const createReplacement = (
    duty: string,
    desc: string,
    opts: {
        attributes?: Partial<Record<AttributeType, number>>
        vitals?: Partial<Record<VitalType, number>>
        dynamicVitals?: Partial<Record<DynamicVitalType, number>>
    } = {}
) => ({
    duty,
    desc,
    ...clean({
        attributes: opts.attributes,
        vitals: opts.vitals,
        dynamicVitals: opts.dynamicVitals
    })
})

/** NPC 游荡行为 */
export const roam = {
    route: (speed: number, route: string[]): NodeNpcTemplate['willRoam'] => ({ speed, route }),
    random: (speed: number, passNodes?: { maxThreat?: number; nodesId?: string[] }): NodeNpcTemplate['willRoam'] => ({
        speed,
        ...clean({ passNodes })
    })
}

// ==========================
// 8. 危险度与拓扑辅助
// ==========================

export const danger = {
    level: (lvl: number): number => lvl,
    ambush: (level: number, isAmbushed = 0.5): { isAmbushed: number; level: number } => ({ isAmbushed, level }),
    narrative: (...enemies: EnemyTemplate[]): EnemyTemplate[] => enemies
}

// ==========================
// 9. 解谜与出口工厂
// ==========================

const puzzleShell = (title: string, lore: string, o: CompactPuzzleOptions) => ({
    title,
    lore,
    hints: o.hints ?? [],
    restrictions: clean({
        timeCostPerAttempt: o.timeCost ?? o.timeCostPerAttempt ?? 5,
        timeLimit: o.timeLimit,
        maxAttempts: o.maxAttempts
    }) as Puzzle['restrictions'],
    ...clean({ rewards: o.rewards, penalties: o.penalties })
})

export const createPuzzle = {
    cloze: (
        title: string,
        lore: string,
        body: Array<Array<string | ''>>,
        answer: string[],
        opts: CompactPuzzleOptions = {}
    ): Puzzle => ({ ...puzzleShell(title, lore, opts), body: { type: 'cloze', body, answer } }),

    choice: (
        title: string,
        lore: string,
        choices: string[],
        answer: string,
        opts: CompactPuzzleOptions = {}
    ): Puzzle => ({ ...puzzleShell(title, lore, opts), body: { type: 'choice', body: choices, answer } }),

    type: (title: string, lore: string, answer: string, opts: CompactPuzzleOptions = {}): Puzzle => ({
        ...puzzleShell(title, lore, opts),
        body: { type: 'type', answer }
    })
}

export const createExit = {
    local: (targetId: string, label: string): Local => ({ type: 'local', targetId, label }),
    to: (targetId: string, label: string): Local => ({ type: 'local', targetId, label }),
    transfer: (label: string): ZoneTransfer => ({ type: 'zone_transfer', label }),
    sanctuaryReturn: (label: string, isEnding = false): SanctuaryReturn => ({
        type: 'sanctuary_return',
        label,
        isEnding
    }),
    trap: (label: string): Local => ({ type: 'local', label })
}

// ==========================
// 10. 交互、设施与独特资源
// ==========================

/**
 * 构建节点交互动作
 *
 * 支持直接填值：act(desc, narrative, opts?)
 * 兼容传统对象：act(configObject)
 */
export function createInteraction(
    desc: string,
    narrative: string,
    opts?: CompactInteractionOptions
): Interaction
export function createInteraction(cfg: CompactInteractionConfig): Interaction
export function createInteraction(
    arg1: string | CompactInteractionConfig,
    arg2?: string,
    arg3: CompactInteractionOptions = {}
): Interaction {
    const isDirect = typeof arg1 === 'string'
    const desc = isDirect ? arg1 : arg1.desc
    const narrative = isDirect ? arg2! : arg1.narrative
    const cfg = isDirect ? arg3 : arg1

    const hpVal = cfg.hp ?? cfg.stateChange?.hp
    const sanVal = cfg.san ?? cfg.sanity ?? cfg.stateChange?.sanity
    const loseVal = cfg.lose ?? cfg.stateChange?.lose
    const gainVal = cfg.gain ?? cfg.stateChange?.gain
    const spawnVal = cfg.spawnEnemy ?? cfg.stateChange?.spawnEnemy
    const unlockVal = cfg.unlock ?? cfg.stateChange?.unlock

    const stateChange = clean({
        hp: hpVal,
        sanity: sanVal,
        lose: loseVal,
        gain: gainVal,
        spawnEnemy: spawnVal,
        unlock: unlockVal,
        ...cfg.stateChange
    })

    const reqItems = cfg.reqItems ?? cfg.requirements?.items
    const reqStaff = cfg.reqStaff ?? cfg.requirements?.staff
    const reqPuzzle = cfg.puzzle ?? cfg.puzzleSolved ?? cfg.requirements?.puzzleSolved

    const requirements = clean({
        items: reqItems?.length ? reqItems : undefined,
        staff: reqStaff?.length ? reqStaff : undefined,
        puzzleSolved: reqPuzzle,
        ...cfg.requirements
    })

    const repeat = cfg.repeat ?? cfg.canRepeat

    return {
        desc,
        ...(repeat !== undefined && { canRepeat: repeat }),
        results: {
            timeCost: cfg.cost ?? cfg.timeCost ?? 10,
            soundEffect: cfg.sound ?? cfg.soundEffect ?? 'success',
            narrative,
            ...(Object.keys(stateChange).length > 0 && { stateChange })
        },
        ...(Object.keys(requirements).length > 0 && { requirements })
    }
}

/** 构建庇护所独特战略资源 */
export const createUniqueResource = (
    id: string,
    name: string,
    desc: string,
    icon: string,
    value: number,
    consumptionRate?: number
): UniqueResource => ({
    id,
    name,
    desc,
    icon,
    value,
    ...clean({ consumptionRate })
})

/** 构建挂载设施模板 */
export function createFacility(
    id: string,
    name: string,
    desc: string,
    func: Record<string, number>,
    nodeMounted?: string
): FacilityTemplate
export function createFacility(
    id: string,
    name: string,
    desc: string,
    nodeMounted: string,
    func: Record<string, number>
): FacilityTemplate
export function createFacility(
    id: string,
    name: string,
    desc: string,
    arg4: string | Record<string, number>,
    arg5?: string | Record<string, number>
): FacilityTemplate {
    if (typeof arg4 === 'object' && arg4 !== null) {
        return {
            id,
            name,
            desc,
            nodeMounted: (arg5 as string) ?? '',
            function: arg4
        }
    }
    return {
        id,
        name,
        desc,
        nodeMounted: arg4,
        function: (arg5 as Record<string, number>) ?? {}
    }
}

// ==========================
// 11. 节点工厂与出口/子节点快填
// ==========================

/**
 * 组装节点模板
 *
 * 支持多重极简填值形态：
 * 1. node(key, name, desc, visualPrompt, config) -> 完整形态
 * 2. node(key, name, desc, config)              -> 省略 visualPrompt，自动继承庇护所风格
 * 3. node(key, name, desc, exits)               -> 第 4 位直接传入 Exit[] 出口数组
 * 4. node(key, name, desc, children)            -> 第 4 位直接传入 string[] 子节点数组
 * 5. node(key, name, desc)                      -> 极简空白安全节点
 */
export function createNode(
    key: string,
    name: string,
    desc: string,
    visualPrompt: string,
    config?: CompactNodeConfig
): KeyedNode
export function createNode(
    key: string,
    name: string,
    desc: string,
    config?: CompactNodeConfig | Exit[] | string[]
): KeyedNode
export function createNode(
    key: string,
    name: string,
    desc: string,
    arg4?: string | CompactNodeConfig | Exit[] | string[],
    arg5?: CompactNodeConfig
): KeyedNode {
    let visualPrompt = ''
    let config: CompactNodeConfig = {}

    if (typeof arg4 === 'string') {
        visualPrompt = arg4
        config = arg5 ?? {}
    } else if (Array.isArray(arg4)) {
        if (arg4.length > 0 && typeof arg4[0] === 'string') {
            config = { children: arg4 as string[] }
        } else {
            config = { exits: arg4 as Exit[] }
        }
    } else if (arg4) {
        config = arg4
    }

    const children = config.children ?? config.childrenIds
    const interactions = config.interacts ?? config.interactions
    const dangerVal = config.danger ?? config.isDangerous
    const npcVal = config.npc ?? config.nodeNpc

    // 解析内嵌设施，自动绑定挂载宿主
    const rawFacilities: Array<FacilityTemplate | InlineFacility> = []
    if (config.facility) rawFacilities.push(config.facility)
    if (config.facilities) rawFacilities.push(...config.facilities)

    const boundFacilities: FacilityTemplate[] = rawFacilities.map(f => ({
        ...f,
        nodeMounted: f.nodeMounted && f.nodeMounted.length > 0 ? f.nodeMounted : key
    }))

    return {
        key,
        name,
        desc,
        visualPrompt,
        ...clean({
            isDangerous: dangerVal,
            childrenIds: children?.length ? children : undefined,
            exits: config.exits?.length ? config.exits : undefined,
            items: config.items?.length ? config.items : undefined,
            interactions: interactions?.length ? interactions : undefined,
            nodeNpc: npcVal,
            map: config.map
        }),
        ...(boundFacilities.length > 0 && { _facilities: boundFacilities })
    }
}

/** 节点识别守卫 */
const isNodeEntity = (x: unknown): x is KeyedNode | Record<string, NodeTemplate> => {
    if (!x || typeof x !== 'object') return false
    if ('key' in x && typeof (x as { key: unknown }).key === 'string') return true
    const values = Object.values(x as object)
    if (values.length > 0 && typeof values[0] === 'object' && values[0] !== null) {
        return 'name' in values[0] && 'desc' in values[0]
    }
    return false
}

/** 汇总节点字典并萃取内联设施 */
export const collectNodes = (
    entries: Array<KeyedNode | Record<string, NodeTemplate>>,
    fallbackVisualStyle = ''
): { nodes: Record<string, NodeTemplate>; facilities: FacilityTemplate[]; firstKey?: string } => {
    const nodes: Record<string, NodeTemplate> = {}
    const facilities: FacilityTemplate[] = []
    let firstKey: string | undefined

    for (const item of entries) {
        if ('key' in item && typeof item.key === 'string') {
            const { key, _facilities, ...nodeData } = item as KeyedNode
            if (!firstKey) firstKey = key

            if (!nodeData.visualPrompt || nodeData.visualPrompt.trim() === '') {
                nodeData.visualPrompt = fallbackVisualStyle
                    ? `${fallbackVisualStyle}, ${nodeData.name}`
                    : nodeData.name
            }

            nodes[key] = nodeData
            if (_facilities && _facilities.length > 0) {
                facilities.push(..._facilities)
            }
        } else {
            for (const [k, v] of Object.entries(item as Record<string, NodeTemplate>)) {
                if (!firstKey) firstKey = k
                nodes[k] = v
            }
        }
    }

    return { nodes, facilities, firstKey }
}

export const collect = (...entries: Array<KeyedNode | Record<string, NodeTemplate>>): Record<string, NodeTemplate> =>
    collectNodes(entries).nodes

// ==========================
// 12. 庇护所工厂（全面支持直接填值）
// ==========================

/**
 * 构建严格遵循元契约的庇护所模板
 *
 * 【形态一：直接全填值（最推荐）】
 * sanctuary(id, name, background, topology, visualStyle, opts?, ...nodes)
 *
 * 【形态二：直接填值无选项】
 * sanctuary(id, name, background, topology, visualStyle, ...nodes)
 *
 * 【形态三：极简直接填值（省略宏观文本，自动根据 name 生成）】
 * sanctuary(id, name, opts?, ...nodes)
 * sanctuary(id, name, ...nodes)
 *
 * 【形态四：元组头部填值】
 * sanctuary([id, name, background?, topology?, visualStyle?], opts?, ...nodes)
 *
 * 【形态五：传统对象填值】
 * sanctuary(configObject, ...nodes)
 */
export function createSanctuary(
    id: string,
    name: string,
    background: string,
    topology: string,
    visualStyle: string,
    opts?: SanctuaryOptions,
    ...nodes: Array<KeyedNode | Record<string, NodeTemplate>>
): SanctuaryTemplate

export function createSanctuary(
    id: string,
    name: string,
    background: string,
    topology: string,
    visualStyle: string,
    ...nodes: Array<KeyedNode | Record<string, NodeTemplate>>
): SanctuaryTemplate

export function createSanctuary(
    id: string,
    name: string,
    opts?: SanctuaryOptions,
    ...nodes: Array<KeyedNode | Record<string, NodeTemplate>>
): SanctuaryTemplate

export function createSanctuary(
    id: string,
    name: string,
    ...nodes: Array<KeyedNode | Record<string, NodeTemplate>>
): SanctuaryTemplate

export function createSanctuary(
    header: [id: string, name: string, background?: string, topology?: string, visualStyle?: string],
    opts?: SanctuaryOptions,
    ...nodes: Array<KeyedNode | Record<string, NodeTemplate>>
): SanctuaryTemplate

export function createSanctuary(
    header: [id: string, name: string, background?: string, topology?: string, visualStyle?: string],
    ...nodes: Array<KeyedNode | Record<string, NodeTemplate>>
): SanctuaryTemplate

export function createSanctuary(
    cfg: CompactSanctuaryConfig,
    ...nodes: Array<KeyedNode | Record<string, NodeTemplate>>
): SanctuaryTemplate

export function createSanctuary(...args: any[]): SanctuaryTemplate {
    let id = ''
    let name = ''
    let background = ''
    let topology = ''
    let visualStyle = ''
    let opts: SanctuaryOptions = {}
    const rawNodesInput: Array<KeyedNode | Record<string, NodeTemplate>> = []

    const first = args[0]

    if (Array.isArray(first)) {
        // 元组头部形态 [id, name, background?, topology?, visualStyle?]
        id = first[0]
        name = first[1]
        background = first[2] ?? name
        topology = first[3] ?? 'network'
        visualStyle = first[4] ?? name

        const second = args[1]
        if (second && !isNodeEntity(second)) {
            opts = second
            rawNodesInput.push(...args.slice(2))
        } else {
            rawNodesInput.push(...args.slice(1))
        }
    } else if (typeof first === 'object' && first !== null) {
        // 传统单对象形态
        const cfg = first as CompactSanctuaryConfig
        id = cfg.id
        name = cfg.name
        background = cfg.background
        topology = cfg.topology
        visualStyle = cfg.visualStyle
        opts = cfg

        if (cfg.nodes) {
            if (Array.isArray(cfg.nodes)) {
                rawNodesInput.push(...cfg.nodes)
            } else {
                rawNodesInput.push(cfg.nodes)
            }
        }
        rawNodesInput.push(...args.slice(1))
    } else if (typeof first === 'string') {
        // 纯位置参数直接填值形态
        id = first
        name = typeof args[1] === 'string' ? args[1] : ''

        if (typeof args[2] === 'string') {
            // sanctuary(id, name, background, topology, visualStyle, ...)
            background = args[2]
            topology = typeof args[3] === 'string' ? args[3] : 'network'
            visualStyle = typeof args[4] === 'string' ? args[4] : name

            const fifth = args[5]
            if (fifth && !isNodeEntity(fifth)) {
                opts = fifth
                rawNodesInput.push(...args.slice(6))
            } else {
                rawNodesInput.push(...args.slice(5))
            }
        } else {
            // sanctuary(id, name, opts?, ...nodes)
            background = name
            topology = 'network'
            visualStyle = name

            const third = args[2]
            if (third && !isNodeEntity(third)) {
                opts = third
                rawNodesInput.push(...args.slice(3))
            } else {
                rawNodesInput.push(...args.slice(2))
            }
        }
    }

    // 编译收集节点字典并萃取内联挂载设施
    const { nodes: compiledNodes, facilities: extractedFacilities, firstKey } = collectNodes(
        rawNodesInput,
        visualStyle
    )

    // 入口判定与推导
    const resolvedEntrance = opts.entrance && opts.entrance.length > 0 ? opts.entrance : (firstKey ?? '')

    // 节点总数推导
    const resolvedNodesCount = opts.nodesCount ?? Object.keys(compiledNodes).length

    // 设施合并
    const topFacilities = opts.facilities ?? opts.facility ?? []
    const allFacilities: FacilityTemplate[] = [...topFacilities, ...extractedFacilities]

    // 独特战略资源合并
    const allUniqueResources = opts.uniqueResources ?? opts.uniqueResource ?? []

    // 基础生存储备解析
    const foodVal = opts.res ? opts.res[0] : (opts.food ?? opts.necessaryResource?.food ?? 0)
    const waterVal = opts.res ? opts.res[1] : (opts.water ?? opts.necessaryResource?.water ?? 0)

    const necessaryResource: NecessaryResource = {
        food: foodVal,
        water: waterVal
    }

    return {
        id,
        name,
        background,
        topology,
        nodesCount: resolvedNodesCount,
        visualStyle,
        dilationFactor: opts.factor ?? opts.dilationFactor ?? 1.0,
        entrance: resolvedEntrance,
        initialState: {
            necessaryResource,
            uniqueResource: allUniqueResources,
            population: opts.pop ?? opts.population ?? 0,
            erosion: opts.erosion ?? 0,
            facility: allFacilities
        },
        nodes: compiledNodes
    }
}

// ==========================
// 13. 极简别名与语义导出
// ==========================

export const I = createItem
export const inst = createInstance
export const P = createPuzzle
export const E = createExit
export const act = createInteraction
export const node = createNode
export const fac = createFacility
export const uRes = createUniqueResource
export const enemy = createEnemy
export const loot = createLoot
export const tactic = createTactic
export const quest = createQuest
export const npc = createNpc
export const companion = createCompanion
export const sanctuary = createSanctuary