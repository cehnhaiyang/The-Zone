import type {
    AccessoryInstance,
    ArmorInstance,
    ArmorTemplate,
    BaseDynamicState,
    ChainGenerationContext,
    ChainNarrative,
    CompanionDynamicState,
    CompanionTemplate,
    ConsumableInstance,
    Cover,
    CurrentLocation,
    DataInstance,
    DyGenerationContext,
    EnemyTemplate,
    Entity,
    EpisodicGenerationContext,
    EquipState,
    Exit,
    Facility,
    FacilityTemplate,
    Interaction,
    Item,
    ItemInstance,
    ItemTemplate,
    Log,
    MaterialInstance,
    MemoryPyramid,
    NeuralLinkState,
    Node,
    NodeNpcDynamicState,
    NodeNpcTemplate,
    NodeTemplate,
    NpcDialogueGenerationContext,
    NpcDynamicState,
    OriginTemplate,
    PlayerDynamicState,
    PlayerState,
    PlayerTemplate,
    NecessaryResource,
    Resident,
    Sanctuary,
    Settings,
    StorageInstance,
    StoryConfig,
    UniqueResource,
    Vital,
    VitalRecord,
    WeaponInstance,
    WeaponTemplate,
    Zone,
    ZoneGenerationContext,
} from './interface';
import { GameState } from './type';
import type {
    AccessoryEffectType,
    AttackResult,
    AttributeType,
    ConsumableEffectType,
    DefenseResult,
    DynamicVitalType,
    VitalType,
    VisualMode,
    WeaponType,
} from './type';
import { generateResidentName } from '../constants/residents';

//=============================================================================
// 0. 全局常量与内部工具
//=============================================================================

const DEFAULT_ARMOR_SLOTS = 2;
const DEFAULT_ACCESSORY_SLOTS = 2;

const ATTRIBUTE_TYPES: ReadonlyArray<AttributeType> = [
    'strength',
    'agility',
    'wisdom',
    'awareness',
    'will',
    'cthulhu',
];

const VITAL_TYPES: ReadonlyArray<VitalType> = [
    'maxHp',
    'maxSanity',
    'maxStamina',
    'maxVigor',
];

const DYNAMIC_VITAL_TYPES: ReadonlyArray<DynamicVitalType> = [
    'hp',
    'sanity',
    'stamina',
    'vigor',
];

/** 饰品可用效果键（契约 AccessoryEffectType：属性 + 体征上限） */
const ACCESSORY_EFFECT_TYPES: ReadonlySet<AccessoryEffectType> = new Set<AccessoryEffectType>([
    ...ATTRIBUTE_TYPES,
    ...VITAL_TYPES,
]);

/** 消耗品在饰品效果之外可用的干预指令（契约 ConsumableEffectType 的其余成员） */
const CONSUMABLE_EXTRA_EFFECT_TYPES: ReadonlySet<ConsumableEffectType> =
    new Set<ConsumableEffectType>([...DYNAMIC_VITAL_TYPES, 'battery', 'integrity']);

/** 消耗品可用效果键（契约 ConsumableEffectType 全集） */
const CONSUMABLE_EFFECT_TYPES: ReadonlySet<ConsumableEffectType> =
    new Set<ConsumableEffectType>([...ACCESSORY_EFFECT_TYPES, ...CONSUMABLE_EXTRA_EFFECT_TYPES]);

/**
 * 全部物品大类
 *
 * 判别式取自契约 ItemTemplate，用 Record 声明以保证 meta 新增物品大类时
 * 此处立即编译报错，而不是在运行时静默漏掉该类物品。
 */
const ITEM_TYPE_FLAGS: Record<ItemTemplate['type'], true> = {
    weapon: true,
    armor: true,
    accessory: true,
    storage: true,
    consumable: true,
    data: true,
    material: true,
};

const ITEM_TYPES: ReadonlyArray<ItemTemplate['type']> = Object.keys(
    ITEM_TYPE_FLAGS
) as ItemTemplate['type'][];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date);

const hasExitTo = (exits: Exit[] | undefined, targetId?: string): boolean =>
    Boolean(targetId) && (exits?.some((exit) => exit.targetId === targetId) ?? false);

/**
 * 将设施模板实例化为运行时设施（初始等级 1）。
 *
 * 供 initializeGameFromOrigin 使用；庇护所钩子中的运行时逻辑见 useSanctuary.ts。
 */
export const createRuntimeFacilities = (templates: FacilityTemplate[]): Facility[] =>
    (templates ?? []).map((template) => ({
        ...safeDeepClone(template),
        level: 1,
    }));

//=============================================================================
// 1. 类型判定守卫
//=============================================================================

export const isWeaponInstance = (item: ItemInstance): item is WeaponInstance =>
    item.type === 'weapon';

export const isArmorInstance = (item: ItemInstance): item is ArmorInstance =>
    item.type === 'armor';

export const isAccessoryInstance = (item: ItemInstance): item is AccessoryInstance =>
    item.type === 'accessory';

export const isConsumableInstance = (item: ItemInstance): item is ConsumableInstance =>
    item.type === 'consumable';

export const isDataInstance = (item: ItemInstance): item is DataInstance =>
    item.type === 'data';

export const isItemTemplate = (
    tpl: ItemTemplate | CompanionTemplate | NodeNpcTemplate
): tpl is ItemTemplate => {
    const type = (tpl as { type?: unknown }).type;
    return typeof type === 'string' && (ITEM_TYPES as readonly string[]).includes(type);
};

export const hasDurability = (
    item: ItemInstance
): item is WeaponInstance | ArmorInstance =>
    (isWeaponInstance(item) || isArmorInstance(item)) &&
    'maxUses' in item &&
    'currentUses' in item;

export const isEquipmentInstance = (
    item: ItemInstance
): item is WeaponInstance | ArmorInstance | AccessoryInstance =>
    isWeaponInstance(item) || isArmorInstance(item) || isAccessoryInstance(item);

export const isSanctuary = (zone: Zone | Sanctuary): zone is Sanctuary =>
    'storage' in zone || 'uniqueResource' in zone;

export const isAttributeType = (key: string): key is AttributeType =>
    (ATTRIBUTE_TYPES as readonly string[]).includes(key);

export const isVitalType = (key: string): key is VitalType =>
    (VITAL_TYPES as readonly string[]).includes(key);

export const isDynamicVitalType = (key: string): key is DynamicVitalType =>
    (DYNAMIC_VITAL_TYPES as readonly string[]).includes(key);

//=============================================================================
// 2. 基础数学与通用工具
//=============================================================================

export const safeNumber = (value: unknown, fallback: number = 0): number => {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : fallback;
    }

    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    return fallback;
};

export const safeDeepClone = <T>(obj: T): T => {
    if (obj === null || obj === undefined) return obj;

    if (typeof structuredClone !== 'undefined') {
        try {
            return structuredClone(obj);
        } catch {
            // fallback to JSON clone
        }
    }

    try {
        return JSON.parse(JSON.stringify(obj)) as T;
    } catch {
        return obj;
    }
};

export const clamp = (val: number, min: number, max: number): number => {
    const value = safeNumber(val);
    const lower = safeNumber(min);
    const upper = safeNumber(max);

    if (upper < lower) return lower;
    return Math.max(lower, Math.min(upper, value));
};

const toRatio = (value: number): number => {
    const v = safeNumber(value);
    if (v <= 0) return 0;
    if (v > 1) return clamp(v / 100, 0, 1);
    return clamp(v, 0, 1);
};

export const getPercent = (current: number, max: number): number => {
    const safeMax = safeNumber(max);
    if (safeMax <= 0) return 0;
    return clamp((safeNumber(current) / safeMax) * 100, 0, 100);
};

export const randomInt = (min: number, max: number): number => {
    const lower = Math.ceil(safeNumber(min));
    const upper = Math.floor(safeNumber(max));

    if (upper < lower) return lower;
    return Math.floor(Math.random() * (upper - lower + 1)) + lower;
};

export const chance = (probability: number): boolean =>
    Math.random() < toRatio(probability);

export const generateInstanceId = (prefix: string): string => {
    const random =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    return `${prefix}_${random}`;
};

type DeepPartial<T> = T extends (...args: unknown[]) => unknown
    ? T
    : T extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export const mergeDeep = <T>(target: T, source: DeepPartial<T>): T => {
    if (!isPlainObject(target) || !isPlainObject(source)) {
        return (source === undefined ? target : source) as T;
    }

    const output: Record<string, unknown> = { ...target };

    for (const key of Object.keys(source)) {
        const sourceValue = (source as Record<string, unknown>)[key];
        const targetValue = (target as Record<string, unknown>)[key];

        if (sourceValue === undefined) continue;

        if (Array.isArray(sourceValue)) {
            output[key] = safeDeepClone(sourceValue);
        } else if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
            output[key] = mergeDeep(targetValue, sourceValue as DeepPartial<unknown>);
        } else {
            output[key] = sourceValue;
        }
    }

    return output as T;
};

export const safeAudioOperation = (operation: () => void, errorContext: string): void => {
    try {
        operation();
    } catch (error) {
        console.debug(`${errorContext}:`, error);
    }
};

//=============================================================================
// 3. 配置与基础工厂
//=============================================================================

type NormalizedEquipState = {
    weapons: { main: WeaponInstance | null; side: WeaponInstance | null };
    armors: (ArmorInstance | null)[];
    accessories: (AccessoryInstance | null)[];
    /**
     * 储物容器
     *
     * 契约 `EquipState.storage` 无槽位数量配置，因此规范化只统一形态，
     * 不截断、不丢弃，避免装备表写回时容器凭空消失。
     */
    storage: StorageInstance[];
};

/**
 * 护甲 / 饰品槽允许「单件直写」或「数组」两种写法，统一成数组。
 */
const toEquipSlotArray = <T>(value: T | (T | null)[] | undefined): (T | null)[] =>
    Array.isArray(value) ? value : value ? [value] : [];

const resolveSlotCount = (
    configured: number | undefined,
    equipped: number | undefined,
    fallback: number
): number => {
    if (configured !== undefined) {
        return Math.max(0, Math.floor(safeNumber(configured)));
    }

    if (equipped !== undefined && equipped > 0) {
        return Math.max(0, Math.floor(safeNumber(equipped)));
    }

    return Math.max(0, fallback);
};

export const normalizeEquipState = (
    equipment?: Partial<EquipState> | null,
    settings?: Pick<Settings['gameConfig'], 'equipmentSlots'>
): NormalizedEquipState => {
    const armors = toEquipSlotArray<ArmorInstance>(equipment?.armors);
    const accessories = toEquipSlotArray<AccessoryInstance>(equipment?.accessories);

    const armorSlots = resolveSlotCount(
        settings?.equipmentSlots?.armor,
        armors.length,
        DEFAULT_ARMOR_SLOTS
    );

    const accessorySlots = resolveSlotCount(
        settings?.equipmentSlots?.accessory,
        accessories.length,
        DEFAULT_ACCESSORY_SLOTS
    );

    return {
        weapons: {
            main: equipment?.weapons?.main ?? null,
            side: equipment?.weapons?.side ?? null,
        },
        armors: Array.from({ length: armorSlots }, (_, index) => armors[index] ?? null),
        accessories: Array.from(
            { length: accessorySlots },
            (_, index) => accessories[index] ?? null
        ),
        storage: toEquipSlotArray<StorageInstance>(equipment?.storage).filter(
            (item): item is StorageInstance => item !== null
        ),
    };
};

/**
 * 按当前槽位配置规范化装备，并回收被挤出槽位的装备。
 *
 * `normalizeEquipState` 会按配置长度截断数组；若直接写回玩家状态，
 * 配置调小会让多出来的装备凭空消失且加成残留（幽灵加成）。
 * 本函数把被截断的装备原样返回，调用方需退回背包并回收其加成。
 */
export const normalizeEquipmentWithOverflow = (
    equipment: EquipState | undefined,
    settings?: Pick<Settings['gameConfig'], 'equipmentSlots'>
): { equipment: NormalizedEquipState; overflow: ItemInstance[] } => {
    const normalized = normalizeEquipState(equipment, settings);
    const overflow: ItemInstance[] = [];

    const collectOverflow = (
        source: EquipState['armors'] | EquipState['accessories'],
        keptLength: number
    ): void => {
        toEquipSlotArray<ArmorInstance | AccessoryInstance>(source)
            .slice(keptLength)
            .forEach((item) => {
                if (item) overflow.push(item);
            });
    };

    collectOverflow(equipment?.armors, normalized.armors.length);
    collectOverflow(equipment?.accessories, normalized.accessories.length);

    return { equipment: normalized, overflow };
};

export const createEmptyMemoryPyramid = (): MemoryPyramid => ({
    α: [],
    β: [],
    γ: [],
    δ: [],
});

const createInitialVitalRecord = (dynamic?: BaseDynamicState): VitalRecord => {
    const vital: Vital = {
        maxHp: safeNumber(dynamic?.maxHp ?? 0),
        maxSanity: safeNumber(dynamic?.maxSanity ?? 0),
        maxStamina: safeNumber(dynamic?.maxStamina ?? 0),
        maxVigor: safeNumber(dynamic?.maxVigor ?? 0),
    };

    return {
        prevVital: {
            prevTick: 0,
            prevVital: safeDeepClone(vital),
        },
        currentVital: {
            currentTick: 0,
            currentVital: safeDeepClone(vital),
        },
    };
};

//=============================================================================
// 4. 实例创建模块
//=============================================================================

const getSourceNumber = (
    source: ItemTemplate | Item,
    key: 'quantity' | 'discoveryThreshold',
    fallback: number
): number => safeNumber((source as unknown as Record<string, unknown>)[key], fallback);

/**
 * 归一化饰品 / 消耗品的 effects 列表。
 *
 * LLM 生成的物品可能整段缺失 effects，或写入非法效果类型；下游 UI 与装备结算
 * 都存在 `effects.length / effects.forEach` 直取，缺字段会直接抛错并打断装备流程。
 * 因此实例化时统一兜底为合法元组数组（非法项静默丢弃）。
 */
const normalizeItemEffects = (
    source: ItemTemplate | Item
): Array<[string, number, number?]> => {
    if (source.type !== 'accessory' && source.type !== 'consumable') return [];

    const raw = (source as { effects?: unknown }).effects;
    if (!Array.isArray(raw)) return [];

    // LLM 输出未经类型收敛，此处按 string 视图做白名单判定
    const allowed: ReadonlySet<string> =
        source.type === 'accessory' ? ACCESSORY_EFFECT_TYPES : CONSUMABLE_EFFECT_TYPES;

    return raw.reduce<Array<[string, number, number?]>>((acc, entry) => {
        if (!Array.isArray(entry) || entry.length < 2) return acc;

        const [rawType, rawValue, rawDuration] = entry as [unknown, unknown, unknown];
        if (typeof rawType !== 'string' || !allowed.has(rawType)) return acc;

        const value = Math.floor(safeNumber(rawValue));
        const hasDuration = rawDuration !== undefined && Number.isFinite(Number(rawDuration));

        acc.push(
            hasDuration
                ? [rawType, value, Math.max(0, Math.floor(safeNumber(rawDuration)))]
                : [rawType, value]
        );
        return acc;
    }, []);
};

const createDurability = (source: ItemTemplate | Item, maxUses: number): number => {
    const max = Math.max(0, safeNumber(maxUses));
    const raw =
        'currentUses' in source
            ? safeNumber((source as { currentUses?: unknown }).currentUses, max)
            : max;

    return clamp(raw, 0, max);
};

export const createItemInstance = (source: ItemTemplate | Item): ItemInstance => {
    const instanceId = generateInstanceId('item');
    const quantity = Math.max(1, getSourceNumber(source, 'quantity', 1));
    const discoveryThreshold = Math.max(0, getSourceNumber(source, 'discoveryThreshold', 0));

    const baseData = {
        ...source,
        instanceId,
        quantity,
        discoveryThreshold,
        // 饰品 / 消耗品强制持有合法 effects 数组（见 normalizeItemEffects）
        ...(source.type === 'accessory' || source.type === 'consumable'
            ? { effects: normalizeItemEffects(source), appliedEffectDeltas: undefined }
            : {}),
    };

    switch (source.type) {
        case 'weapon': {
            const maxUses = safeNumber((source as WeaponTemplate).maxUses);
            return {
                ...baseData,
                currentUses: createDurability(source, maxUses),
            } as unknown as WeaponInstance;
        }

        case 'armor': {
            const maxUses = safeNumber((source as ArmorTemplate).maxUses);
            return {
                ...baseData,
                currentUses: createDurability(source, maxUses),
            } as unknown as ArmorInstance;
        }

        case 'accessory':
            return { ...baseData } as unknown as AccessoryInstance;

        case 'storage':
            return { ...baseData } as unknown as StorageInstance;

        case 'consumable':
            return { ...baseData } as unknown as ConsumableInstance;

        case 'data':
            return { ...baseData } as unknown as DataInstance;

        case 'material':
            return { ...baseData } as unknown as MaterialInstance;

        default:
            throw new Error(
                `[物品实例异常] 未知物品类型: ${(baseData as { type?: string }).type ?? 'undefined'}`
            );
    }
};

const createPlayerDynamicState = (player: PlayerTemplate): PlayerDynamicState => {
    const { attribute, vital, inventory, equipState, uniqueTactic } = player.initialState;

    const dynamic: PlayerDynamicState = {
        strength: safeNumber(attribute.strength),
        agility: safeNumber(attribute.agility),
        wisdom: safeNumber(attribute.wisdom),
        awareness: safeNumber(attribute.awareness),
        will: safeNumber(attribute.will),
        // 第六维：契约 AttributeType 的成员，模板未声明时从 0 起
        cthulhu: safeNumber(attribute.cthulhu),

        maxHp: safeNumber(vital.maxHp),
        maxSanity: safeNumber(vital.maxSanity),
        maxStamina: safeNumber(vital.maxStamina),
        maxVigor: safeNumber(vital.maxVigor),

        hp: safeNumber(vital.maxHp),
        sanity: safeNumber(vital.maxSanity),
        stamina: safeNumber(vital.maxStamina),
        vigor: safeNumber(vital.maxVigor),

        equipment: normalizeEquipState(equipState),
        isDead: false,

        inventory: (inventory ?? []).map(createItemInstance),
        // 背包网格容量：力量正相关，推导规则见本文件「14. 背包网格」
        storageSize: getBackpackGridSize({ strength: attribute.strength }),
        xp: 0,
        level: 1,
        tactics: safeDeepClone(uniqueTactic ?? []),
    };

    // 模板自带的预设装备必须在实例化时结算一次饰品效果：
    // 属性 / 体征加成的唯一结算入口是玩家的"装备 / 卸下"动作，预设装备
    // 不经过该动作，不在此补偿就会永久失效（护甲减伤与武器伤害在战斗时
    // 从 equipment 现读，不受影响，故此前表现为"护甲生效、饰品不生效"）。
    const applied = applyEquipmentEffects(dynamic, dynamic.equipment);

    // 初始状态视为满状态：上限被装备抬高 / 压低后，当前值随之对齐。
    if (Object.keys(applied).length > 0) {
        dynamic.hp = dynamic.maxHp;
        dynamic.sanity = dynamic.maxSanity;
        dynamic.stamina = dynamic.maxStamina;
        dynamic.vigor = dynamic.maxVigor;
    }

    clampDynamicVitals(dynamic);
    return dynamic;
};

const createPlayerEntity = (
    player: PlayerTemplate
): Entity<PlayerTemplate, PlayerDynamicState> => ({
    static: safeDeepClone(player),
    dynamic: createPlayerDynamicState(player),
});

/**
 * 节点 NPC 实例化。
 *
 * 动态状态在通用玩家动态之上补 `trust` 与 `quests`（节点 NPC 专属）。
 */
export const createNodeNpcEntity = (
    npc: NodeNpcTemplate
): Entity<NodeNpcTemplate, NodeNpcDynamicState> => {
    const base = createPlayerDynamicState(npc);

    return {
        static: safeDeepClone(npc),
        dynamic: {
            ...base,
            trust: safeNumber(npc.initialState.trust),
            quests: safeDeepClone(npc.initialState.quests ?? []),
            totalDialogueRounds: 0,
            memory: createEmptyMemoryPyramid(),
        },
    };
};

/**
 * 同伴实例化。
 *
 * 动态状态在通用玩家动态之上补 `affinity` 与 `needs`（同伴专属）。
 *
 * 注意：入队后的关系轴是「好感」（{@link CompanionDynamicState.affinity}），
 * 不再沿用节点 NPC 的「信任」；好感从模板初值开始增长，可为负值。
 */
export const createCompanionEntity = (
    companion: CompanionTemplate
): Entity<CompanionTemplate, CompanionDynamicState> => {
    const base = createPlayerDynamicState(companion);

    return {
        static: safeDeepClone(companion),
        dynamic: {
            ...base,
            affinity: safeNumber(companion.initialState.affinity),
            needs: safeDeepClone(companion.initialState.needs ?? []),
            totalDialogueRounds: 0,
            memory: createEmptyMemoryPyramid(),
        },
    };
};

//=============================================================================
// 5. 状态修饰与计算
//=============================================================================

export const clampDynamicVitals = (dynamic: BaseDynamicState): void => {
    dynamic.maxHp = Math.max(0, safeNumber(dynamic.maxHp));
    dynamic.maxSanity = Math.max(0, safeNumber(dynamic.maxSanity));
    dynamic.maxStamina = Math.max(0, safeNumber(dynamic.maxStamina));
    dynamic.maxVigor = Math.max(0, safeNumber(dynamic.maxVigor));

    dynamic.hp = clamp(dynamic.hp, 0, dynamic.maxHp);
    dynamic.sanity = clamp(dynamic.sanity, 0, dynamic.maxSanity);
    dynamic.stamina = clamp(dynamic.stamina, 0, dynamic.maxStamina);
    dynamic.vigor = clamp(dynamic.vigor, 0, dynamic.maxVigor);
};

//-------------------------------------------------------------------------
// 装备 / 饰品效果结算
//-------------------------------------------------------------------------

/** 属性 / 体征效果增量集合 */
export type EffectDeltas = Partial<Record<AttributeType | VitalType, number>>;

const forEachEffectDelta = (
    deltas: EffectDeltas,
    visit: (key: AttributeType | VitalType, value: number) => void
): void => {
    (Object.entries(deltas) as Array<[AttributeType | VitalType, number | undefined]>).forEach(
        ([key, rawValue]) => {
            const value = safeNumber(rawValue);
            if (value === 0) return;
            visit(key, value);
        }
    );
};

/** 合并增量：sign = 1 生效 / -1 回收 */
export const mergeEffectDeltas = (
    base: EffectDeltas,
    source: EffectDeltas,
    sign: 1 | -1 = 1
): EffectDeltas => {
    forEachEffectDelta(source, (key, value) => {
        base[key] = safeNumber(base[key]) + sign * value;
    });
    return base;
};

/** 取反增量（用于回收已生效的加成） */
export const negateEffectDeltas = (source: EffectDeltas): EffectDeltas => {
    const next: EffectDeltas = {};
    forEachEffectDelta(source, (key, value) => {
        next[key] = -value;
    });
    return next;
};

/** 单键写入动态态（属性 / 体征上限），下限 0 */
const applySingleEffectDelta = (
    dynamic: BaseDynamicState & Record<AttributeType, number>,
    key: AttributeType | VitalType,
    value: number
): void => {
    if (isAttributeType(key) || isVitalType(key)) {
        dynamic[key] = Math.max(0, safeNumber(dynamic[key]) + value);
    }
};

export const applyAttributeUpdates = (
    dynamic: BaseDynamicState & Record<AttributeType, number>,
    updates: Partial<Record<AttributeType, number>>
): void => {
    (Object.entries(updates) as Array<[AttributeType, number | undefined]>).forEach(
        ([attr, value]) => {
            applySingleEffectDelta(dynamic, attr, safeNumber(value ?? 0));
        }
    );
};

export const applyVitalUpdates = (
    dynamic: BaseDynamicState,
    updates: Partial<Record<VitalType, number>>
): void => {
    (Object.entries(updates) as Array<[VitalType, number | undefined]>).forEach(
        ([vital, value]) => {
            applySingleEffectDelta(
                dynamic as BaseDynamicState & Record<AttributeType, number>,
                vital,
                safeNumber(value ?? 0)
            );
        }
    );
};

/** 将混合增量路由到属性 / 体征上限 */
export const applyEffectDeltas = (
    dynamic: BaseDynamicState & Record<AttributeType, number>,
    deltas: EffectDeltas
): void => {
    forEachEffectDelta(deltas, (key, value) => applySingleEffectDelta(dynamic, key, value));
};

/**
 * 应用增量并返回「实际生效」的部分。
 *
 * 受 0 下限夹取影响，实际生效值可能与声明值不等
 * （例如 maxSanity 只剩 5 时扣除 12，实际只能扣 5）。
 * 装备时用它落快照，卸下时即可精确回收，避免属性漂移。
 */
export const applyEffectDeltasWithSnapshot = (
    dynamic: BaseDynamicState & Record<AttributeType, number>,
    deltas: EffectDeltas
): EffectDeltas => {
    const applied: EffectDeltas = {};
    forEachEffectDelta(deltas, (key, value) => {
        const before = safeNumber(dynamic[key]);
        applySingleEffectDelta(dynamic, key, value);
        const diff = safeNumber(dynamic[key]) - before;
        if (diff !== 0) applied[key] = diff;
    });
    return applied;
};

/** 饰品效果 → 属性 / 体征增量 */
export const collectAccessoryEffects = (item: ItemInstance | null): EffectDeltas => {
    if (!item || !isAccessoryInstance(item)) return {};

    const effects = Array.isArray(item.effects) ? item.effects : [];
    const updates: EffectDeltas = {};

    effects.forEach(([effectType, value]) => {
        if (!ACCESSORY_EFFECT_TYPES.has(effectType)) return;
        const key = effectType as AttributeType | VitalType;
        updates[key] = safeNumber(updates[key]) + safeNumber(value);
    });

    return updates;
};

/**
 * 已装备饰品实际生效的增量。
 *
 * 优先读取装备时落下的快照；旧存档 / 未记录快照时回退模板值。
 */
export const getAppliedAccessoryDeltas = (item: ItemInstance | null): EffectDeltas => {
    if (!item || !isAccessoryInstance(item)) return {};

    const snapshot = item.appliedEffectDeltas;
    if (!snapshot) return collectAccessoryEffects(item);

    const deltas: EffectDeltas = {};
    (Object.entries(snapshot) as Array<[AttributeType | VitalType, number | undefined]>).forEach(
        ([key, value]) => {
            const delta = safeNumber(value);
            if (delta !== 0) deltas[key] = delta;
        }
    );
    return deltas;
};

/** 回收已装备饰品的加成 */
export const revokeAccessoryEffects = (
    dynamic: BaseDynamicState & Record<AttributeType, number>,
    item: ItemInstance | null
): void => {
    applyEffectDeltas(dynamic, negateEffectDeltas(getAppliedAccessoryDeltas(item)));
};

/**
 * 结算整套装备中所有饰品的持续效果。
 *
 * 用于实例化预设装备（角色模板 equipState）等没有"装备动作"的场景；
 * 返回本次实际生效的增量总和。
 */
export const applyEquipmentEffects = (
    dynamic: BaseDynamicState & Record<AttributeType, number>,
    equipment?: Partial<EquipState> | null
): EffectDeltas => {
    const applied: EffectDeltas = {};

    toEquipSlotArray<AccessoryInstance>(equipment?.accessories).forEach((item) => {
        if (!item) return;
        const itemApplied = applyEffectDeltasWithSnapshot(
            dynamic,
            collectAccessoryEffects(item)
        );
        mergeEffectDeltas(applied, itemApplied, 1);
    });

    return applied;
};

/**
 * 将「实际生效增量」快照写入指定槽位的饰品实例。
 *
 * 卸下 / 丢弃时据此精确回收；重新装备会覆盖为新快照。
 */
export const writeEquipEffectSnapshot = (
    equipment: EquipState,
    itemType: 'weapon' | 'armor' | 'accessory',
    slotIndex: number,
    applied: EffectDeltas
): EquipState => {
    const next = normalizeEquipState(equipment);
    if (itemType !== 'accessory') return next;

    const current = next.accessories[slotIndex];
    if (!current) return next;

    next.accessories[slotIndex] = {
        ...current,
        appliedEffectDeltas: { ...applied },
    } as AccessoryInstance;

    return next;
};

/** 清除装备快照（装备离开槽位退回背包 / 仓库时调用） */
export const stripEquipEffectSnapshot = (item: ItemInstance): ItemInstance => {
    if (!isAccessoryInstance(item) || item.appliedEffectDeltas === undefined) return item;

    const next = { ...item } as AccessoryInstance & { appliedEffectDeltas?: unknown };
    delete next.appliedEffectDeltas;
    return next as ItemInstance;
};

/**
 * 溢出装备回收入包。
 *
 * 槽位配置调小时，超出槽位的装备不能静默丢弃：退回背包，
 * 并由调用方按顺序回收其饰品加成。
 */
export const reclaimOverflowEquipments = (
    overflow: ItemInstance[],
    inventory: ItemInstance[]
): { inventory: ItemInstance[]; refunds: ItemInstance[] } => {
    let nextInventory = inventory;
    const refunds: ItemInstance[] = [];

    overflow.forEach((item) => {
        nextInventory = addUniqueItemToInventory(
            nextInventory,
            stripEquipEffectSnapshot(item)
        );
        refunds.push(item);
    });

    return { inventory: nextInventory, refunds };
};

export const getEffectValueByType = (
    item: ConsumableInstance,
    effectType: ConsumableEffectType
): number => {
    if (!item.effects?.length) return 0;

    return item.effects.reduce((sum, effect) => {
        if (effect[0] !== effectType) return sum;
        return sum + Math.floor(safeNumber(effect[1]));
    }, 0);
};

//=============================================================================
// 6. 庇护所与神经系统
//=============================================================================

/**
 * 按 id 查找庇护所独特资源。
 */
export const findUniqueResource = (
    uniqueResource: UniqueResource[],
    id: string
): UniqueResource | undefined => uniqueResource.find((entry) => entry?.id === id);

/**
 * 读取庇护所某项资源的当前数量。
 *
 * 键为 `food` / `water`（必要资源）或独特资源的 id；庇护所未声明该项时返回 0。
 */
export const getSanctuaryResourceValue = (
    sanctuary: Pick<Sanctuary, 'necessaryResource' | 'uniqueResource'>,
    key: keyof NecessaryResource | string
): number =>
    key === 'food' || key === 'water'
        ? safeNumber(sanctuary.necessaryResource[key])
        : safeNumber(findUniqueResource(sanctuary.uniqueResource, key)?.value);

/**
 * 按资源键增量修改庇护所资源（原地修改）。
 *
 * - `food` / `water` 落到 necessaryResource，下界为 0；
 * - 其余键按 id 落到 uniqueResource，未声明的 id 整条忽略——庇护所没有这项资源，就不受其影响。
 *
 * @returns 实际被改动的资源键
 */
export const applySanctuaryResourceDeltas = (
    sanctuary: Sanctuary,
    deltas: Record<string, number> | undefined
): string[] => {
    const applied: string[] = [];
    if (!deltas) return applied;

    for (const [key, rawDelta] of Object.entries(deltas)) {
        const delta = safeNumber(rawDelta);
        if (delta === 0) continue;

        if (key === 'food' || key === 'water') {
            const current = safeNumber(sanctuary.necessaryResource[key]);
            sanctuary.necessaryResource[key] = Math.max(0, current + delta);
            applied.push(key);
            continue;
        }

        const entry = findUniqueResource(sanctuary.uniqueResource, key);
        if (!entry) continue;

        entry.value = Math.max(0, safeNumber(entry.value) + delta);
        applied.push(key);
    }

    return applied;
};

/**
 * 生成庇护所状态的对外简报（供 CurrentLocation 使用）。
 *
 * lackingResource 为当前已耗竭（数量为 0）的资源项数。
 */
const pickSanctuaryStatus = (source: Sanctuary): { lackingResource: number } => {
    const values = [
        safeNumber(source.necessaryResource.food),
        safeNumber(source.necessaryResource.water),
        ...source.uniqueResource.map((entry) => safeNumber(entry.value)),
    ];

    return { lackingResource: values.filter((value) => value <= 0).length };
};

//=============================================================================
// 7. 地图与层级解析
//=============================================================================

export const normalizeUnlockIds = (ids: string | string[]): string[] =>
    Array.isArray(ids) ? ids : ids.split(',').map((id) => id.trim());

/**
 * 解析节点威胁等级。
 *
 * {@link NodeTemplate.isDangerous} 有三种约定形态：
 * - `number`：直接作为威胁等级；
 * - `{ isAmbushed, level }`：取其中的 level；
 * - `EnemyTemplate[]`：固定叙事遭遇，不参与通用遭遇骰，返回 0。
 *
 * 未定义视为安全节点。
 */
export const getNodeThreatLevel = (node: Node | NodeTemplate | undefined): number => {
    const danger = node?.isDangerous;
    if (typeof danger === 'number') return Math.max(0, safeNumber(danger, 0));
    if (Array.isArray(danger)) return 0;
    if (danger) return Math.max(0, safeNumber(danger.level, 0));
    return 0;
};

/**
 * 提取节点绑定的固定敌人（`isDangerous` 为 `EnemyTemplate[]` 形态）。
 *
 * 存在该数组时，该节点遇敌只可能来自其中；战斗结束后引擎会将其清除。
 */
export const getNodeSpecificEnemies = (
    node: Node | NodeTemplate | undefined
): EnemyTemplate[] | undefined => {
    const danger = node?.isDangerous;
    return Array.isArray(danger) ? danger : undefined;
};

/**
 * 节点的伏击不利系数。
 *
 * 仅 `isDangerous` 为 `{ isAmbushed, level }` 形态时有效，取值 0~1；
 * 其余形态（威胁等级 / 固定遭遇 / 安全）返回 0，即正常遭遇战。
 */
export const getNodeAmbushRate = (node: Node | NodeTemplate | undefined): number => {
    const danger = node?.isDangerous;
    if (!danger || typeof danger !== 'object' || Array.isArray(danger)) return 0;
    return Math.min(1, Math.max(0, safeNumber(danger.isAmbushed, 0)));
};

/**
 * 节点是否存在威胁。
 *
 * 作为位置快照 {@link Loc.node.isDangerous} 布尔字段的唯一取值来源。
 */
export const isNodeDangerous = (node: Node | NodeTemplate | undefined): boolean => {
    const danger = node?.isDangerous;
    if (Array.isArray(danger)) return danger.length > 0;
    if (typeof danger === 'number') return danger > 0;
    if (danger) {
        return safeNumber(danger.level, 0) > 0 || safeNumber(danger.isAmbushed, 0) > 0;
    }
    return false;
};

//-------------------------------------------------------------------------
// 掩体耐久
//-------------------------------------------------------------------------

/**
 * 掩体是否可被摧毁。
 *
 * 契约 `CoverTemplate.canBeDestoryed`：**有该字段**则掩体可被攻击摧毁，
 * 其数值即掩体的最大耐久；省略该字段表示不可摧毁（只吸收伤害、不掉耐久）。
 */
export const isCoverDestructible = (cover: Cover): boolean =>
    cover.canBeDestoryed !== undefined;

/** 掩体的最大耐久；不可摧毁的掩体返回 undefined。 */
export const getCoverMaxDurability = (cover: Cover): number | undefined =>
    cover.canBeDestoryed === undefined
        ? undefined
        : Math.max(0, safeNumber(cover.canBeDestoryed));

/** 掩体是否已被摧毁：`hp` 归零即视为被摧毁（契约 `Cover.hp`）。 */
export const isCoverDestroyed = (cover: Cover): boolean => safeNumber(cover.hp, 1) <= 0;

/**
 * 掩体实例化：把常量定义转换为战斗运行时的 `Cover`。
 *
 * 地图常量以 `hp` 直接书写最大耐久（未声明 `canBeDestoryed`），
 * 而契约要求「`canBeDestoryed` 承载最大耐久、`hp` 承载当前耐久」。
 * 此处完成一次归一：把定义中的初始 `hp` 提升为最大耐久写入 `canBeDestoryed`，
 * 并让 `hp` 从满耐久起步。既不必改动数十处地图常量，也保证运行时字段语义与契约一致。
 *
 * 定义中本就没有 `hp` 的掩体是不可摧毁的，原样保留（两个字段都不写）。
 */
export const createRuntimeCover = (definition: Cover): Cover => {
    if (definition.hp === undefined) return { ...definition };
    const maxDurability = Math.max(0, safeNumber(definition.hp));
    return {
        ...definition,
        canBeDestoryed: definition.canBeDestoryed ?? maxDurability,
        hp: maxDurability,
    };
};

export const initializeZoneRuntime = <T extends Zone | Sanctuary>(zone: T): T => {
    const updatedZone = safeDeepClone(zone) as T;
    const nodes = updatedZone.nodes as Record<string, Node>;

    for (const node of Object.values(nodes)) {
        // LLM 可能输出字符串形态 exits（["node_b"]）而非 {type,targetId,label} 对象：
        // hasExitTo/validateMove 对字符串恒失败 → 重复追加出口 + 目标"无法抵达"。
        const rawExits = (node as unknown as { exits?: unknown }).exits;
        if (Array.isArray(rawExits)) {
            node.exits = rawExits.map((exit) => {
                if (typeof exit === 'string') {
                    return {
                        type: 'local' as const,
                        targetId: exit,
                        label: nodes[exit]?.name || exit,
                    };
                }
                return exit as Exit;
            });
        } else {
            node.exits = [];
        }

        if (Array.isArray(node.childrenIds)) {
            node.childrenIds = node.childrenIds.filter((id) => Boolean(nodes[id]));
        }
    }

    for (const [nodeId, node] of Object.entries(nodes)) {
        node.exits = node.exits ?? [];
        const childrenIds = node.childrenIds ?? [];

        for (const childId of childrenIds) {
            const childNode = nodes[childId];
            if (!childNode) continue;

            childNode.exits = childNode.exits ?? [];

            if (!hasExitTo(node.exits, childId)) {
                node.exits.push({
                    type: 'local',
                    targetId: childId,
                    label: childNode.name || childId,
                });
            }

            if (!hasExitTo(childNode.exits, nodeId)) {
                childNode.exits.push({
                    type: 'local',
                    targetId: nodeId,
                    label: node.name || nodeId,
                });
            }

            for (const siblingId of childrenIds) {
                if (siblingId === childId) continue;

                const siblingNode = nodes[siblingId];
                if (!siblingNode) continue;

                siblingNode.exits = siblingNode.exits ?? [];

                if (!hasExitTo(childNode.exits, siblingId)) {
                    childNode.exits.push({
                        type: 'local',
                        targetId: siblingId,
                        label: siblingNode.name || siblingId,
                    });
                }

                if (!hasExitTo(siblingNode.exits, childId)) {
                    siblingNode.exits.push({
                        type: 'local',
                        targetId: childId,
                        label: childNode.name || childId,
                    });
                }
            }
        }
    }

    for (const node of Object.values(nodes)) {
        node.exits?.forEach((exit) => {
            if (exit.type === 'local' && !exit.label) {
                exit.label =
                    exit.targetId && nodes[exit.targetId]
                        ? nodes[exit.targetId].name
                        : exit.targetId || '未知';
            }
        });
    }

    for (const [id, node] of Object.entries(nodes)) {
        nodes[id] = {
            ...node,
            exits: node.exits ?? [],
            // 只在字段缺失时初始化，不清零既有值：
            // 区域往返/持久化克隆装载时保留 isVisited/searchCount，
            // 否则重进已探索节点会误触发首次访问 cutscene 与敌袭。
            searchCount: safeNumber(node.searchCount),
            isVisited: node.isVisited === true,
        } as Node;
    }

    for (const node of Object.values(nodes)) {
        node.interactions?.forEach((interaction) => {
            interaction.results.stateChange?.unlock?.forEach(([targetNodeId, description]) => {
                if (nodes[targetNodeId]) {
                    nodes[targetNodeId] = {
                        ...nodes[targetNodeId],
                        lock: description,
                    };
                }
            });
        });
    }

    // entrance 运行时校验：缺失/错拼时回退第一个节点 id，
    // 否则 setCurrentNodeId(undefined) 落"未知领域"降级节点，
    // autoLoadAssets 还会写入键为字符串 "undefined" 的伪节点。
    if (typeof updatedZone.entrance !== 'string' || !nodes[updatedZone.entrance]) {
        updatedZone.entrance = Object.keys(nodes)[0] ?? '';
    }

    return updatedZone;
};



export const getNodeByKey = (zone: Zone | Sanctuary, nodeId: string): Node | undefined =>
    (zone.nodes as Record<string, Node>)[nodeId];

export const getEntranceNodeId = (zone: Zone | Sanctuary): string =>
    zone.entrance;

export const checkExitLock = (
    exit: Exit,
    nodes: Record<string, Node>
): { locked: boolean; reason?: string } => {
    if (!exit.targetId) return { locked: false };

    const targetNode = nodes[exit.targetId];
    return targetNode?.lock
        ? { locked: true, reason: targetNode.lock }
        : { locked: false };
};

export const buildCurrentLocation = (
    zone: Zone | Sanctuary,
    nodeId: string
): CurrentLocation => {
    const node = getNodeByKey(zone, nodeId);

    return {
        zone: {
            id: zone.id,
            name: zone.name,
            desc: {
                background: zone.background,
                topology: zone.topology,
                nodesCount: zone.nodesCount,
                visualStyle: zone.visualStyle,
            },
            ...(isSanctuary(zone) ? { isSanctuary: pickSanctuaryStatus(zone) } : {}),
        },
        node: {
            id: nodeId,
            name: node?.name ?? nodeId,
            desc: node?.desc ?? '',
            isDangerous: isNodeDangerous(node),
        },
    };
};

//=============================================================================
// 8. 背包与装备操作
//=============================================================================

/** 主手武器；主手为空时退到副手（单手武器可能只挂在副手）。 */
export const getPrimaryWeapon = (equipment: EquipState): WeaponInstance | null =>
    equipment?.weapons?.main ?? equipment?.weapons?.side ?? null;

/**
 * 对话目标动态状态。
 *
 * 契约把社交对象拆成两条关系轴：
 * - 节点 NPC → `trust`（信任，0-100 整数）；
 * - 同伴 → `affinity`（好感，≤100 整数，可为负）。
 */
export type InteractionNpcDynamic = NodeNpcDynamicState | CompanionDynamicState;

/**
 * 关系轴键名。
 */
export type RelationAxis = 'trust' | 'affinity';

/**
 * 对话目标实体。
 *
 * 静态可能是节点 NPC 模板，也可能是已入队的同伴模板；动态状态各自扩展
 * （`trust` / `quests` 与 `affinity` / `needs`），社交层按本联合类型使用。
 */
export type InteractionNpcEntity = Entity<
    NodeNpcTemplate | CompanionTemplate,
    InteractionNpcDynamic
>;

/**
 * 对话生成上下文（模板 / 动态取对话目标实体，免去每处手写两个泛型参数）。
 */
export type InteractionDialogueContext = NpcDialogueGenerationContext<
    InteractionNpcEntity['static'],
    InteractionNpcEntity['dynamic']
>;

const probeRelationFields = (
    dynamic: NpcDynamicState
): Partial<NodeNpcDynamicState & CompanionDynamicState> =>
    dynamic as Partial<NodeNpcDynamicState & CompanionDynamicState>;

/**
 * 目标当前挂在哪条关系轴上。
 *
 * 判定依据是动态状态实际持有的字段：节点 NPC 持 `trust`，同伴持 `affinity`。
 */
export const getRelationAxis = (dynamic: NpcDynamicState): RelationAxis =>
    typeof probeRelationFields(dynamic).trust === 'number' ? 'trust' : 'affinity';

/**
 * 关系度读数（社交层统一口径）。
 *
 * 社交层只关心「关系有多深」这一个标量，因此按动态实际持有的字段取值。
 */
export const getRelationScore = (dynamic: NpcDynamicState): number => {
    const source = probeRelationFields(dynamic);
    return safeNumber(source.trust ?? source.affinity, 0);
};

/**
 * 写回关系度（动态层）：目标持有什么字段就写什么字段（节点 NPC 写 trust，同伴写 affinity）。
 */
export const withRelationScore = <T extends NpcDynamicState>(dynamic: T, value: number): T => {
    const key: RelationAxis = getRelationAxis(dynamic);
    return { ...dynamic, [key]: value } as T;
};

/**
 * 关系度字段的展示名：节点 NPC 为「信任」，同伴为「好感」。
 */
export const getRelationLabel = (dynamic: NpcDynamicState): string =>
    getRelationAxis(dynamic) === 'trust' ? '信任' : '好感';

/**
 * 装备槽位上的全部实例（已归一化并剔除空槽，不含储物容器）。
 *
 * 契约允许 weapons 为对象、armors / accessories 为单件或数组，
 * 需要遍历装备的调用方一律走这里，避免各自判形态。
 */
export const getEquippedInstances = (equipment: EquipState): ItemInstance[] => {
    const { weapons, armors, accessories } = normalizeEquipState(equipment);
    return [weapons.main, weapons.side, ...armors, ...accessories].filter(
        (item): item is WeaponInstance | ArmorInstance | AccessoryInstance => item !== null
    );
};

/** 副手武器。 */
export const getSideWeapon = (equipment: EquipState): WeaponInstance | null =>
    equipment?.weapons?.side ?? null;

/** 追加物品；装备 / 饰品等唯一实例若已存在于背包则原样返回（避免复制出同名实例） */
export const addUniqueItemToInventory = (
    inventory: ItemInstance[],
    item: ItemInstance
): ItemInstance[] => {
    if (
        item.type !== 'consumable' &&
        item.type !== 'material' &&
        inventory.some((entry) => entry.instanceId === item.instanceId)
    ) {
        return inventory;
    }

    return addItemToInventory(inventory, item);
};

export const addItemToInventory = (
    inventory: ItemInstance[],
    item: ItemInstance
): ItemInstance[] => {
    if (item.type === 'consumable' || item.type === 'material') {
        const incomingQuantity = Math.max(
            1,
            safeNumber((item as { quantity?: unknown }).quantity ?? 1, 1)
        );

        const idx = inventory.findIndex(
            (entry) => entry.id === item.id && entry.type === item.type
        );

        if (idx !== -1) {
            const existing = inventory[idx];
            const existingQuantity = Math.max(
                1,
                safeNumber((existing as { quantity?: unknown }).quantity ?? 1, 1)
            );

            const updatedItem = {
                ...existing,
                quantity: existingQuantity + incomingQuantity,
            } as ItemInstance;

            return [...inventory.slice(0, idx), updatedItem, ...inventory.slice(idx + 1)];
        }

        return [
            ...inventory,
            {
                ...item,
                quantity: incomingQuantity,
            },
        ];
    }

    return [...inventory, item];
};

export const removeItemFromInventory = (
    inventory: ItemInstance[],
    instanceId: string,
    quantity: number = 1
): ItemInstance[] => {
    const amount = Math.max(0, Math.floor(safeNumber(quantity, 1)));
    if (amount <= 0) return inventory;

    const idx = inventory.findIndex((item) => item.instanceId === instanceId);
    if (idx === -1) return inventory;

    const item = inventory[idx];

    if (item.type === 'consumable' || item.type === 'material') {
        const currentQuantity = Math.max(
            1,
            safeNumber((item as { quantity?: unknown }).quantity ?? 1, 1)
        );

        if (currentQuantity > amount) {
            const updatedItem = {
                ...item,
                quantity: currentQuantity - amount,
            } as ItemInstance;

            return [...inventory.slice(0, idx), updatedItem, ...inventory.slice(idx + 1)];
        }
    }

    return inventory.filter((entry) => entry.instanceId !== instanceId);
};

export const findItemInInventory = (
    inventory: ItemInstance[],
    instanceId: string
): ItemInstance | undefined => inventory.find((item) => item.instanceId === instanceId);

export const hasItemInInventory = (inventory: ItemInstance[], itemId: string): boolean =>
    inventory.some((item) => item.id === itemId);

/** 武器槽位序号 → 主副手键名（0 = 主手，1 = 副手，其余非法）。 */
const toWeaponSlotKey = (slotIndex: number): 'main' | 'side' | null =>
    slotIndex === 0 ? 'main' : slotIndex === 1 ? 'side' : null;

export const equipItem = (
    equipment: EquipState,
    item: ItemInstance,
    itemType: 'weapon' | 'armor' | 'accessory',
    slotIndex: number
): EquipState => {
    const next = normalizeEquipState(equipment);
    const weaponSlot = toWeaponSlotKey(slotIndex);

    if (itemType === 'weapon' && isWeaponInstance(item) && weaponSlot) {
        next.weapons[weaponSlot] = item;
    } else if (
        itemType === 'armor' &&
        isArmorInstance(item) &&
        slotIndex >= 0 &&
        slotIndex < next.armors.length
    ) {
        next.armors[slotIndex] = item;
    } else if (
        itemType === 'accessory' &&
        isAccessoryInstance(item) &&
        slotIndex >= 0 &&
        slotIndex < next.accessories.length
    ) {
        next.accessories[slotIndex] = item;
    }

    return next;
};

export const unequipItem = (
    equipment: EquipState,
    itemType: 'weapon' | 'armor' | 'accessory',
    slotIndex: number
): EquipState => {
    const next = normalizeEquipState(equipment);
    const weaponSlot = toWeaponSlotKey(slotIndex);

    if (itemType === 'weapon' && weaponSlot) {
        next.weapons[weaponSlot] = null;
    } else if (itemType === 'armor' && slotIndex >= 0 && slotIndex < next.armors.length) {
        next.armors[slotIndex] = null;
    } else if (
        itemType === 'accessory' &&
        slotIndex >= 0 &&
        slotIndex < next.accessories.length
    ) {
        next.accessories[slotIndex] = null;
    }

    return next;
};

//=============================================================================
// 9. 交互计算与结算系统
//=============================================================================

interface StateChangeApplication {
    inventory?: ItemInstance[];
    companions?: Array<Entity<CompanionTemplate, CompanionDynamicState>>;
    hpDelta?: number;
    sanityDelta?: number;
    unlocks?: Array<{ nodeId: string; description: string }>;
    spawnEnemies?: EnemyTemplate[];
    logs: Array<Pick<Log, 'text' | 'type'>>;
}

export const processStateChange = (
    stateChange: Interaction['results']['stateChange'],
    player: PlayerState
): StateChangeApplication => {
    const changes: StateChangeApplication = {
        logs: [],
    };

    if (!stateChange) return changes;

    if (stateChange.hp) {
        changes.hpDelta = stateChange.hp;
        changes.logs.push({
            text:
                stateChange.hp > 0
                    ? `生命恢复 +${stateChange.hp}`
                    : `受到 ${Math.abs(stateChange.hp)} 点伤害`,
            type: stateChange.hp > 0 ? 'success' : 'critical',
        });
    }

    if (stateChange.sanity) {
        changes.sanityDelta = stateChange.sanity;
        changes.logs.push({
            text:
                stateChange.sanity > 0
                    ? `理智恢复 +${stateChange.sanity}`
                    : `失去 ${Math.abs(stateChange.sanity)} 点理智`,
            type: stateChange.sanity > 0 ? 'success' : 'critical',
        });
    }

    if (stateChange.lose?.length) {
        let inv = [...player.dynamic.inventory];
        let comps = [...player.companions];

        for (const id of stateChange.lose) {
            const byInstance = inv.find((item) => item.instanceId === id);

            if (byInstance) {
                inv = removeItemFromInventory(inv, byInstance.instanceId);
                changes.logs.push({
                    text: `失去物品: ${byInstance.name}`,
                    type: 'warning',
                });
                continue;
            }

            const candidates = inv.filter((item) => item.id === id);

            if (candidates.length > 0) {
                const item = candidates[randomInt(0, candidates.length - 1)];
                inv = removeItemFromInventory(inv, item.instanceId);
                changes.logs.push({
                    text: `失去物品: ${item.name}`,
                    type: 'warning',
                });
                continue;
            }

            const compIdx = comps.findIndex((companion) => companion.static.id === id);

            if (compIdx !== -1) {
                changes.logs.push({
                    text: `${comps[compIdx].static.name} 离开了队伍`,
                    type: 'event',
                });
                comps.splice(compIdx, 1);
            }
        }

        changes.inventory = inv;
        changes.companions = comps;
    }

    if (stateChange.gain?.length) {
        let inv = changes.inventory || [...player.dynamic.inventory];
        let comps = changes.companions || [...player.companions];

        for (const tpl of stateChange.gain) {
            if (isItemTemplate(tpl)) {
                const item = createItemInstance(tpl);
                changes.logs.push({
                    text: `获得: ${item.name}`,
                    type: 'loot',
                });
                inv = addItemToInventory(inv, item);
            } else {
                const companion = createCompanionEntity(tpl);
                changes.logs.push({
                    text: `同伴加入: ${companion.static.name}`,
                    type: 'event',
                });
                comps.push(companion);
            }
        }

        changes.inventory = inv;
        changes.companions = comps;
    }

    if (stateChange.unlock?.length) {
        changes.unlocks = stateChange.unlock.map(([nodeId, description]) => ({
            nodeId,
            description,
        }));

        stateChange.unlock.forEach(([nodeId, description]) => {
            changes.logs.push({
                text: `解锁新路径：${description || nodeId}`,
                type: 'success',
            });
        });
    }

    if (stateChange.spawnEnemy?.length) {
        changes.spawnEnemies = stateChange.spawnEnemy;

        stateChange.spawnEnemy.forEach((enemy) => {
            changes.logs.push({
                text: `警报：${enemy.name} 出现了！`,
                type: 'critical',
            });
        });
    }

    return changes;
};

export const removeInteractionFromNode = (node: Node, interaction: unknown): Interaction[] | undefined => node.interactions?.filter((entry) => entry !== interaction);

//=============================================================================
// 10. 规则与检定引擎
//=============================================================================

/**
 * 搜查遇敌曲线指数。
 *
 * 威胁项 = threatMaxChance × (threatLevel / threatDivisor) ^ 指数：
 * - = 1 时线性，1-50 全程只有 50 档、低威胁段几乎无差别；
 * - 1.5 时同区间单调递增且各档位可区分（低威胁明显更安全、高威胁快速增长）。
 */
const THREAT_CURVE_EXPONENT = 1.5;

/**
 * 搜查遇敌概率。
 *
 * 新版遇敌机制下，随机遇敌只发生在搜查：
 * - 威胁项：1-50 归一化后按曲线映射到 [0, threatMaxChance]，全程单调、低威胁段平缓；
 * - 搜查项：搜查基础风险 + 每次搜查的累积风险 + 体力 / 精力疲劳惩罚；
 * - 最终 clamp 到 [0, 1]，保证满级威胁叠加多次搜查后仍可逼近但不超过 100%。
 *
 * 伏击节点（进入即战）不经过本函数，固定按 100% 处理。
 */
export const calculateEncounterChance = (
    threatLevel: number,
    searchCount: number,
    staminaPct: number,
    vigorPct: number,
    condition: 'on_search' | 'on_sanity_critical',
    config: Settings['gameConfig']
): number => {
    const encounterConfig = config.enemyEncounter;
    const staminaRatio = toRatio(staminaPct);
    const vigorRatio = toRatio(vigorPct);

    // 威胁归一化：threatDivisor 为满级威胁（默认 50，对齐 isDangerous 数值形态 1-50）。
    const threatCap = Math.max(1, safeNumber(encounterConfig.threatDivisor, 50));
    const threatRatio = clamp(safeNumber(threatLevel) / threatCap, 0, 1);
    const threatMaxChance = clamp(safeNumber(encounterConfig.threatMaxChance, 0.65), 0, 1);
    const threatChance = threatMaxChance * Math.pow(threatRatio, THREAT_CURVE_EXPONENT);

    let encounterChance = safeNumber(encounterConfig.baseChance) + threatChance;

    if (condition === 'on_search') {
        const fatiguePenalty =
            1 +
            (1 - staminaRatio) * safeNumber(config.searchCosts.staminaFatigueFactor) +
            (1 - vigorRatio) * safeNumber(config.searchCosts.vigorFatigueFactor);

        encounterChance +=
            safeNumber(encounterConfig.searchBaseRisk) +
            safeNumber(searchCount) * safeNumber(encounterConfig.searchRiskPerCount) +
            (fatiguePenalty - 1) * safeNumber(encounterConfig.fatiguePenaltyFactor);
    } else if (condition === 'on_sanity_critical') {
        encounterChance += 0.5;
    }

    return clamp(encounterChance, 0, 1);
};

export const calculateSearchCosts = (
    attributes: { wisdom: number; awareness: number },
    staminaPct: number,
    vigorPct: number,
    config: Settings['gameConfig']
) => {
    const { searchCosts } = config;
    const staminaRatio = toRatio(staminaPct);
    const vigorRatio = toRatio(vigorPct);

    const fatiguePenalty = Math.max(
        1,
        safeNumber(searchCosts.fatigueBase) +
        (1 - staminaRatio) * safeNumber(searchCosts.staminaFatigueFactor) +
        (1 - vigorRatio) * safeNumber(searchCosts.vigorFatigueFactor)
    );

    const wisdomResistance = clamp(
        1.0 -
        safeNumber(attributes.wisdom) * safeNumber(searchCosts.wisdomFactor) +
        safeNumber(attributes.awareness) * safeNumber(searchCosts.perceptionFactor),
        0,
        1
    );

    const sanityCost = parseFloat(
        (safeNumber(searchCosts.baseSanity) * wisdomResistance).toFixed(1)
    );

    const costMultiplier = clamp(
        1.0 -
        (safeNumber(attributes.awareness) * safeNumber(searchCosts.perceptionFactor) +
            safeNumber(attributes.wisdom) * safeNumber(searchCosts.wisdomRecoveryFactor)),
        0.2,
        1
    );

    const staminaCost = parseFloat(
        (safeNumber(searchCosts.baseStamina) * costMultiplier * fatiguePenalty).toFixed(1)
    );

    const vigorCost = parseFloat(
        (safeNumber(searchCosts.baseVigor) * costMultiplier * fatiguePenalty).toFixed(1)
    );

    return {
        sanityCost: Math.max(0, sanityCost),
        fatiguePenalty,
        staminaCost: Math.max(0, staminaCost),
        vigorCost: Math.max(0, vigorCost),
    };
};

export const calculatePerceptionScore = (
    attributes: { wisdom: number; awareness: number; agility: number },
    searchCount: number,
    config: Settings['gameConfig']
): number =>
    safeNumber(attributes.wisdom) +
    safeNumber(attributes.agility) * safeNumber(config.perceptionWeights.agility) +
    safeNumber(attributes.awareness) *
    safeNumber(config.perceptionWeights.basePerception) +
    safeNumber(searchCount) * safeNumber(config.perceptionWeights.searchCount);

export const processItemDiscovery = (
    node: Node,
    roll: number,
    config: Settings['gameConfig']
): {
    foundItem: Item | null;
    remainingItems: Item[];
} => {
    const items = node.items || [];
    if (!items.length) return { foundItem: null, remainingItems: items };

    const safeRoll = safeNumber(roll);

    const discoverable = items
        .filter((item) => safeRoll >= safeNumber(item.discoveryThreshold ?? 0))
        .sort(
            (a, b) =>
                safeNumber(b.discoveryThreshold ?? 0) - safeNumber(a.discoveryThreshold ?? 0)
        );

    if (discoverable.length > 0) {
        const foundItem = discoverable[0];

        return {
            foundItem,
            remainingItems: items.filter((item) => item !== foundItem),
        };
    }

    return {
        foundItem: null,
        remainingItems: items,
    };
};

//=============================================================================
// 12. 上下文构建
//=============================================================================

export const buildZoneGenerationContext = (
    config: StoryConfig,
    player: PlayerState,
    analysis?: ChainNarrative['analysis']
): ZoneGenerationContext => {
    if (config.mode.id === 'chain') {
        if (!analysis) {
            throw new Error('[状态流转异常] 链式叙事模式缺失 Analysis 参数');
        }

        if (!config.pacing) {
            throw new Error('[状态流转异常] 链式叙事模式缺失 Pacing 配置');
        }

        const motif = config.motif || {
            id: 'auto',
            prompt: 'AI自适应生成',
        };

        const mainAxis = config.mainAxis || {
            id: 'auto',
            prompt: 'AI自适应生成',
        };

        return {
            base: {
                mode: {
                    id: 'chain',
                    prompt: config.mode.prompt,
                },
                theme: {
                    id: config.aesthetic.id,
                    prompt: config.aesthetic.prompt,
                },
                pacing: {
                    id: config.pacing.id,
                    prompt: config.pacing.prompt,
                },
                motif: {
                    id: motif.id,
                    prompt: motif.prompt,
                },
                mainAxis: {
                    id: mainAxis.id,
                    prompt: mainAxis.prompt,
                },
            },
            params: analysis,
            extra: {
                questAccepted: player.questAccepted,
                prevLocation: player.location.prevLocation,
                currentLocation: player.location.currentLocation,
            },
        } as ChainGenerationContext;
    }

    return {
        base: {
            mode: {
                id: 'episodic',
                prompt: config.mode.prompt,
            },
            theme: {
                id: config.aesthetic.id,
                prompt: config.aesthetic.prompt,
            },
        },
        params: {
            nodeToGenerate: config.nodesCount ?? 8,
            tension: config.tension ?? 500,
        },
        extra: {
            questAccepted: player.questAccepted,
            player: {
                static: player.static,
                dynamic: player.dynamic,
            },
            companions: player.companions,
        },
    } as EpisodicGenerationContext;
};

export const buildDyGenerationContext = (
    player: PlayerState,
    directives: string
): DyGenerationContext => ({
    location: player.location,
    directives,
});

//=============================================================================
// 13. 游戏初始化
//=============================================================================

const updateZoneNode = <T extends Zone | Sanctuary>(
    zone: T,
    nodeId: string,
    updater: (node: Node) => Node
): T => {
    const next = safeDeepClone(zone) as T;
    const nodes = next.nodes as Record<string, Node>;

    if (!nodes[nodeId]) return next;

    nodes[nodeId] = updater(nodes[nodeId]);
    return next;
};

/**
 * 按人口规模生成初始居民池。
 *
 * 庇护所模板只定义 population（整体人口规模），不提供个体居民数据；
 * 若初始化时居民池为空而 population > 0，庇护所界面会出现
 * "REGISTERED_CIVILIANS: 0 / POP: 32" 的空列表断裂。此处按 population
 * 数量从姓名库生成具体居民个体（hp/san 落在健康区间），让人口与居民一致。
 */
const createInitialResidents = (population: number): Resident[] => {
    const count = Math.max(0, Math.floor(Number.isFinite(population) ? population : 0));
    if (count === 0) return [];

    const usedNames = new Set<string>();
    const usedIds = new Set<string>();
    const base = Date.now().toString(36);
    const result: Resident[] = [];

    for (let i = 0; i < count; i++) {
        const name = generateResidentName(usedNames);
        usedNames.add(name);

        let id = `resident_${base}_${i.toString(36)}`;
        while (usedIds.has(id)) id += 'x';
        usedIds.add(id);

        result.push({
            id,
            name,
            hp: 80 + Math.floor(Math.random() * 40),
            san: 55 + Math.floor(Math.random() * 40),
        });
    }

    return result;
};

export const markNodeVisited = <T extends Zone | Sanctuary>(
    zone: T,
    nodeId: string
): T =>
    updateZoneNode(zone, nodeId, (node) => ({
        ...node,
        isVisited: true,
    }));

export const initializeGameFromOrigin = (
    originTemplate: OriginTemplate,
    options?: {
        visualMode?: VisualMode;
        neuralLink?: Partial<NeuralLinkState>;
    }
) => {
    const sanctuaryTemplate = safeDeepClone(originTemplate.sanctuary);
    const initialState = sanctuaryTemplate.initialState;

    // initialState 是模板专用产物：运行时只沿用资源、人口、侵蚀度与设施。
    const { initialState: _templateInitialState, ...sanctuaryZone } = sanctuaryTemplate;

    const necessaryResource: NecessaryResource = {
        food: safeNumber(initialState.necessaryResource.food),
        water: safeNumber(initialState.necessaryResource.water),
    };

    const uniqueResource: UniqueResource[] = initialState.uniqueResource.map((entry) => ({
        id: entry.id,
        name: entry.name,
        desc: entry.desc,
        icon: entry.icon,
        value: safeNumber(entry.value),
        // 契约中 consumptionRate 可选：不参与日常消耗的资源不写该字段。
        ...(entry.consumptionRate === undefined
            ? {}
            : { consumptionRate: safeNumber(entry.consumptionRate) }),
    }));

    // 人口与在册居民池绑定：初始人口即初始居民池规模。
    const residents = createInitialResidents(safeNumber(initialState.population));

    const sanctuaryRuntime = {
        ...sanctuaryZone,
        storage: [],
        necessaryResource,
        uniqueResource,
        facility: createRuntimeFacilities(initialState.facility),
        residents,
        population: residents.length,
        erosion: safeNumber(initialState.erosion),
    } as unknown as Sanctuary;

    let sanctuary = initializeZoneRuntime(sanctuaryRuntime) as Sanctuary;

    const character = originTemplate.player;
    const playerEntity = createPlayerEntity(character);
    const entranceNodeId = sanctuary.entrance;

    if (getNodeByKey(sanctuary, entranceNodeId)) {
        sanctuary = markNodeVisited(sanctuary, entranceNodeId);
    }

    const entranceNode = getNodeByKey(sanctuary, entranceNodeId);

    const visualMode: VisualMode = options?.visualMode ?? 'bio';

    const neuralLink: NeuralLinkState = {
        battery: 100,
        maxBattery: 100,
        integrity: 100,
        maxIntegrity: 100,
        visorLevel: 1,
        noiseLevel: 10,
        ...options?.neuralLink,
    };

    neuralLink.maxBattery = Math.max(0, safeNumber(neuralLink.maxBattery, 100));
    neuralLink.battery = clamp(neuralLink.battery, 0, neuralLink.maxBattery);

    neuralLink.maxIntegrity = Math.max(0, safeNumber(neuralLink.maxIntegrity, 100));
    neuralLink.integrity = clamp(neuralLink.integrity, 0, neuralLink.maxIntegrity);

    neuralLink.visorLevel = Math.max(0, safeNumber(neuralLink.visorLevel, 1));
    neuralLink.noiseLevel = Math.max(0, safeNumber(neuralLink.noiseLevel, 0));

    const player: PlayerState = {
        static: playerEntity.static,
        dynamic: playerEntity.dynamic,

        killCount: 0,
        searchCount: 0,
        exploredZones: 0,
        exploredNodes: entranceNode ? 1 : 0,

        currentZoneTime: {
            day: 0,
            cycle: 0,
            tick: 0,
        },

        currentGameRound: {
            absoluteTick: 0,
            explorationStep: 0,
            combatTurn: 0,
        },

        neuralLink,
        companions: originTemplate.companion?.map(createCompanionEntity) ?? [],
        sanctuary,
        visualMode,

        location: {
            prevLocation: null,
            currentLocation: buildCurrentLocation(sanctuary, entranceNodeId),
        },

        vitalRecord: createInitialVitalRecord(playerEntity.dynamic),

        questAccepted: [],
        questArchived: [],
        archivedArcs: [],
        archivedHiddenAxis: [],
    };

    const zone = sanctuary as unknown as Zone;

    return {
        player,
        sanctuary,
        zone,
        entranceNodeId,
        gameState: GameState.SANCTUARY,
    };
};

//=============================================================================
// 14. 背包网格
//=============================================================================

/**
 * 网格尺寸
 *
 * `[列, 行]`，与元契约 {@link BaseItemTemplate.size} 同构。
 */
export type GridSize = [number, number];

//-------------------------------------------------------------------------
// 数据归档：物品占地与背包网格尺寸规则
//-------------------------------------------------------------------------

/**
 * 物品大类的缺省占地归档
 *
 * 单位是 `[列, 行]`；物品数据未声明 `size` 时按此归档取值。
 */
const ITEM_GRID_SIZE: Record<ItemInstance['type'], GridSize> = {
    weapon: [2, 1],
    armor: [2, 2],
    accessory: [1, 1],
    storage: [2, 2],
    consumable: [1, 1],
    data: [1, 1],
    material: [1, 1],
};

/**
 * 武器形态的缺省占地归档
 *
 * 单位是 `[列, 行]`；数值按"长边水平"给出，长枪更宽、双手武器更厚。
 */
const WEAPON_GRID_SIZE: Record<WeaponType, GridSize> = {
    wave: [2, 1],
    both_wave: [3, 2],
    prick: [2, 1],
    both_prick: [4, 1],
    sniper_rifle: [4, 2],
    assault_rifle: [3, 2],
    smg: [2, 2],
    pistol: [2, 1],
    shotgun: [3, 2],
    sawed_off: [2, 2],
    crossbow: [3, 2],
    throw: [1, 1],
    bow: [3, 2],
    magic: [1, 1],
    shield: [2, 2],
    both_shield: [3, 2],
};

/** 背包网格基础尺寸：[列, 行] */
const BACKPACK_GRID_BASE: GridSize = [6, 4];

/** 背包网格下限：无论力量多低都不会小于该尺寸 */
const BACKPACK_GRID_MIN: GridSize = [6, 4];

/** 背包网格上限：无论力量多高都不会超过该尺寸 */
const BACKPACK_GRID_MAX: GridSize = [12, 7];

/** 力量成长系数：每满该点数追加一列 / 一行 */
const BACKPACK_GRID_GROWTH_STRENGTH = { col: 10, row: 20 };

const toFiniteNumber = (value: unknown): number => {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : 0;
};

const clampInt = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, Math.floor(value)));

/** 读取合法尺寸：必须是正整数对，否则返回 null */
export const normalizeGridSize = (value: unknown): GridSize | null => {
    if (!Array.isArray(value) || value.length < 2) return null;

    const cols = toFiniteNumber(value[0]);
    const rows = toFiniteNumber(value[1]);
    if (!Number.isInteger(cols) || !Number.isInteger(rows)) return null;
    if (cols < 1 || rows < 1) return null;

    return [cols, rows];
};

/**
 * 归一为默认朝向
 *
 * 元契约注释规定"物品默认将长边水平放置"，
 * 故 `[2, 4]` 的狙击枪默认占地为 `[4, 2]`。
 */
const toHorizontalLayout = ([width, height]: GridSize): GridSize =>
    height > width ? [height, width] : [width, height];

/** 按物品大类细分的占地取用表；武器再按形态细分一层 */
const ITEM_SIZE_RESOLVER: Record<
    ItemInstance['type'],
    (item: ItemInstance) => GridSize
> = {
    weapon: (item) => {
        const weaponType = (item as { weaponType?: WeaponType }).weaponType;
        return (
            (weaponType ? WEAPON_GRID_SIZE[weaponType] : undefined) ??
            ITEM_GRID_SIZE.weapon
        );
    },
    armor: () => ITEM_GRID_SIZE.armor,
    accessory: () => ITEM_GRID_SIZE.accessory,
    storage: () => ITEM_GRID_SIZE.storage,
    consumable: () => ITEM_GRID_SIZE.consumable,
    data: () => ITEM_GRID_SIZE.data,
    material: () => ITEM_GRID_SIZE.material,
};

/**
 * 物品占地查表器
 *
 * 契约 `size` 优先；未声明或非法时回落到本节的归档缺省值。
 * 返回值恒为默认朝向（长边水平）。
 */
export const getItemGridSize = (item: ItemInstance): GridSize => {
    const declared = normalizeGridSize((item as { size?: unknown }).size);
    if (declared) return toHorizontalLayout(declared);

    const resolver = ITEM_SIZE_RESOLVER[item.type] ?? ITEM_SIZE_RESOLVER.material;
    return resolver(item);
};

/** 物品在指定朝向下的实际占地：默认长边水平，旋转态宽高互换 */
export const getItemGridFootprint = (
    item: ItemInstance,
    rotated: boolean
): GridSize => {
    const [width, height] = getItemGridSize(item);
    return rotated ? [height, width] : [width, height];
};

/**
 * 背包网格尺寸查表器
 *
 * 契约 `storageSize` 优先；缺失时按力量成长推导，
 * 全程只读不写，不向底层动态态注入任何值。
 */
export const getBackpackGridSize = (source: {
    strength?: unknown;
    storageSize?: unknown;
}): GridSize => {
    const declared = normalizeGridSize(source?.storageSize);
    if (declared) return declared;

    const strength = Math.max(0, toFiniteNumber(source?.strength));

    return [
        clampInt(
            BACKPACK_GRID_BASE[0] +
            Math.floor(strength / BACKPACK_GRID_GROWTH_STRENGTH.col),
            BACKPACK_GRID_MIN[0],
            BACKPACK_GRID_MAX[0]
        ),
        clampInt(
            BACKPACK_GRID_BASE[1] +
            Math.floor(strength / BACKPACK_GRID_GROWTH_STRENGTH.row),
            BACKPACK_GRID_MIN[1],
            BACKPACK_GRID_MAX[1]
        ),
    ];
};

//=============================================================================
// 15. 战斗序列生成
//=============================================================================

/**
 * 战斗序列生成的唯一真源。
 *
 * 同一套档位权重、伤害尺度与防御效率同时服务三条链路，杜绝「面板上看到的分布」
 * 与「实战真正抽到的序列」各算各的：
 *
 * 1. 武器单独序列：只取武器模板固有属性，不叠加任何实体维度
 *    —— `getWeaponAttackOdds(weapon, null, 'base')`；
 * 2. 武器 + 人序列：叠加五维、战斗增益与副手空置加成
 *    —— `getWeaponAttackOdds(weapon, entity, 'contextual')`；
 * 3. 战斗序列：按武器槽位分别生成（主手 / 副手 / 空手统一），防御序列常驻不分主副手
 *    —— `generateAllyResultSequence`。
 *
 * 攻击档位口径：
 * - `miss` = 0；
 * - `graze` ∈ [0, hit)；
 * - `hit` = 基准伤害；
 * - `crit` ∈ [hit, hit + 暴击加成]。
 *
 * 暴击口径以武器模板注释为准：暴击区间基于「武器伤害 + 武器 crit.bonus」；
 * 近程（melee）武器可完整继承实体自身的力量 —— 力量既进命中基准，也作为实体自身的
 * 暴击力叠加到暴击上限（即近程暴击加成 = 武器 crit.bonus + 力量）；
 * 空手没有武器模板，其命中基准与暴击加成均取实体力量，
 * 即「空手最大暴击伤害由实体力量决定」。
 */

/** 每 10 点体力承载 1 节序列 */
export const SEQUENCE_STAMINA_PER_SLOT = 10;

/** 结果序列预测的意志门槛：will 低于该值时完全不具备预判能力 */
export const SEQUENCE_PREDICTION_WILL_THRESHOLD = 50;

/** 越过门槛后，每多少点 will 追加 1 次可预测行动 */
export const SEQUENCE_PREDICTION_PER_WILL = 5;

/** 序列耗尽时扣除的体力比例（基于 maxStamina） */
export const SEQUENCE_EXHAUST_STAMINA_RATIO = 0.1;

/** 免伤比上限：非盾牌口径下，任何裁定值与最终免伤都不得超过该值；盾牌类可挡满（1） */
export const MAX_PARTIAL_REDUCTION = 0.999;

//-------------------------------------------------------------------------
// 15.1 档位权重基准
//-------------------------------------------------------------------------

/** 攻击档位权重基准（无任何修正的裸值） */
const ATTACK_WEIGHT_BASE = { miss: 0.12, graze: 0.18, hit: 0.4, crit: 0.04 };

/** 感知对攻击档位的修正系数：感知越高越不容易落空、越容易暴击 */
const ATTACK_PERCEPTION_SCALE = { miss: 0.004, graze: 0.002, crit: 0.006 };

/** 疲劳对攻击档位的修正系数 */
const ATTACK_FATIGUE_SCALE = { miss: 0.15, graze: 0.08, crit: 0.03 };

/** 攻击档位权重值域 */
const ATTACK_WEIGHT_MIN = { miss: 0.02, graze: 0.05, crit: 0.01 };
const ATTACK_WEIGHT_MAX = { miss: 0.65, graze: 0.45, crit: 0.35 };

/** 防御档位权重基准 */
const DEFENSE_WEIGHT_BASE = { fail: 0.28, partial: 0.45, dodge: 0.05 };

/** 敏捷对防御档位的修正系数 */
const DEFENSE_AGILITY_SCALE = { fail: 0.006, dodge: 0.006 };

/** 疲劳对防御档位的修正系数 */
const DEFENSE_FATIGUE_SCALE = { fail: 0.1, dodge: 0.02 };

/** 防御档位权重值域 */
const DEFENSE_WEIGHT_MIN = { fail: 0.05, dodge: 0.01 };
const DEFENSE_WEIGHT_MAX = { fail: 0.72, dodge: 0.35 };

//-------------------------------------------------------------------------
// 15.1 武器类型特性
//-------------------------------------------------------------------------

/**
 * 武器类型特性表。
 *
 * 契约 `type.ts` 的 `WeaponType` 在每个分支上以注释形式声明了该武器的专属特性。
 * 本表把这些声明收敛为**唯一真源**：序列生成、战斗结算与 UI 提示一律读取此处，
 * 避免同一特性在多处各写一遍后逐渐走样。
 */
export interface WeaponTrait {
    /**
     * 单手武器：另一手为空时攻击序列质量提升（hit / crit 上升，miss / graze 下降）。
     * wave / prick / pistol / crossbow 四条分支皆声明了本项。
     */
    offhandEmptyAccuracy: boolean
    /**
     * 单手武器：另一手为空时命中基准额外 +1 伤害。
     *
     * 契约的措辞在两类武器上不同，必须区别对待：
     * - 挥动类 / 刺击类：「获得**伤害与命中**加成」；
     * - 手枪 / 弩：仅「获得**命中**加成」。
     * 故只有前者参与本项。
     */
    offhandEmptyDamage: boolean
    /** 刺击类：crit 权重提升、hit 权重降低、miss 权重不变 */
    critWeightBias: boolean
    /** 挥动类：攻击时对目标所在格内的其他目标造成溅射（本次判定值 ÷ 其他目标数，向上取整） */
    splash: boolean
    /** 暴击时无视目标防御的比例：1 = 完全无视，0.3 = 无视三成，0 = 不无视 */
    critDefensePierce: number
    /** 防御序列质量下降（双手重型武器） */
    heavyDefensePenalty: boolean
    /** 防御序列恒为 partial，不再出现 dodge 与 fail（双手盾） */
    partialOnlyDefense: boolean
    /** partial 免伤上限可达 1（盾牌类） */
    shieldCapToOne: boolean
    /** 攻击前可消耗 1 AP 瞄准，使下一次攻击判定提升 1 档；原结果为 crit 则伤害翻倍 */
    canAim: boolean
    /** 最佳攻击距离：结算时距离越近越容易降级；0 表示无此特性 */
    optimalRange: number
    /** 攻击判定后若仍有剩余 AP，可消耗 1 点追加判定，且所有判定取最优者结算 */
    repeatForBest: boolean
    /** 本回合尚未移动时，首次攻击不消耗 AP */
    freeFirstAttackIfStationary: boolean
    /** 攻击时对攻击范围内所有目标同时造成伤害 */
    hitsAllInRange: boolean
    /** 距离目标越近，攻击伤害越高 */
    closeRangeDamageBonus: boolean
    /** 每次攻击后必须消耗 1 AP 装填，否则无法再次攻击 */
    requiresReload: boolean
    /** 任意敌方单位进入攻击范围时，立刻进行一次不消耗 AP 的攻击判定 */
    opportunityAttack: boolean
}

/** 无武器（空手）或未声明任何特性的武器的兜底特性：全部关闭。 */
const NO_WEAPON_TRAIT: WeaponTrait = {
    offhandEmptyAccuracy: false,
    offhandEmptyDamage: false,
    critWeightBias: false,
    splash: false,
    critDefensePierce: 0,
    heavyDefensePenalty: false,
    partialOnlyDefense: false,
    shieldCapToOne: false,
    canAim: false,
    optimalRange: 0,
    repeatForBest: false,
    freeFirstAttackIfStationary: false,
    hitsAllInRange: false,
    closeRangeDamageBonus: false,
    requiresReload: false,
    opportunityAttack: false,
}

const weaponTrait = (overrides: Partial<WeaponTrait>): WeaponTrait => ({
    ...NO_WEAPON_TRAIT,
    ...overrides,
})

/** 逐条对应 `type.ts` 中 `WeaponType` 各分支声明的特性。 */
const WEAPON_TRAITS: Record<WeaponType, WeaponTrait> = {
    // 挥动 / 刺击：契约写明「另一手为空则获得伤害与命中加成」。
    wave: weaponTrait({ offhandEmptyAccuracy: true, offhandEmptyDamage: true, splash: true }),
    prick: weaponTrait({
        offhandEmptyAccuracy: true,
        offhandEmptyDamage: true,
        critWeightBias: true,
        critDefensePierce: 1,
    }),
    // 手枪 / 弩：契约只声明「另一手为空则获得命中加成」，不含伤害加成。
    pistol: weaponTrait({
        offhandEmptyAccuracy: true,
        freeFirstAttackIfStationary: true,
    }),
    crossbow: weaponTrait({ offhandEmptyAccuracy: true, requiresReload: true }),

    both_wave: weaponTrait({ splash: true, heavyDefensePenalty: true }),
    both_prick: weaponTrait({
        critWeightBias: true,
        critDefensePierce: 1,
        heavyDefensePenalty: true,
        opportunityAttack: true,
    }),
    // 盾牌：单手武器，契约写明「另一手为空则获得伤害与命中加成」。
    shield: weaponTrait({
        offhandEmptyAccuracy: true,
        offhandEmptyDamage: true,
        shieldCapToOne: true,
    }),
    both_shield: weaponTrait({ shieldCapToOne: true, partialOnlyDefense: true }),
    sniper_rifle: weaponTrait({
        canAim: true,
        critDefensePierce: 0.3,
        optimalRange: 12,
        heavyDefensePenalty: true,
    }),
    assault_rifle: weaponTrait({}),
    smg: weaponTrait({ repeatForBest: true }),
    shotgun: weaponTrait({ hitsAllInRange: true, closeRangeDamageBonus: true }),
    sawed_off: weaponTrait({}),
    throw: weaponTrait({}),
    bow: weaponTrait({}),
    magic: weaponTrait({}),
}

/** 读取某武器类型的特性；未提供或未知类型返回全关闭特性。 */
export const getWeaponTrait = (weaponType?: WeaponType): WeaponTrait =>
    (weaponType ? WEAPON_TRAITS[weaponType] : undefined) ?? NO_WEAPON_TRAIT

/** 按特性谓词反查武器类型集合（供权重表等处做集合判定）。 */
const typesWithTrait = (pick: (trait: WeaponTrait) => boolean): ReadonlySet<WeaponType> =>
    new Set(
        (Object.keys(WEAPON_TRAITS) as WeaponType[]).filter((type) => pick(WEAPON_TRAITS[type]))
    )

/** 单手武器：另一手为空时攻击序列质量提升（档位权重层面） */
const OFFHAND_EMPTY_BONUS_TYPES = typesWithTrait((trait) => trait.offhandEmptyAccuracy)

/** 单手武器：另一手为空时命中基准额外 +1 伤害（伤害层面，仅挥动 / 刺击享有） */
const OFFHAND_EMPTY_DAMAGE_TYPES = typesWithTrait((trait) => trait.offhandEmptyDamage)

/** 刺击类：暴击权重提升、命中权重降低、落空权重不变 */
const CRIT_BIAS_TYPES = typesWithTrait((trait) => trait.critWeightBias)

/** 盾牌类：partial 免伤上限可达 1 */
const SHIELD_TYPES = typesWithTrait((trait) => trait.shieldCapToOne)

/** 重型武器：防御序列质量下降 */
const HEAVY_DEFENSE_PENALTY_TYPES = typesWithTrait((trait) => trait.heavyDefensePenalty)

/** 命中阶梯：miss < graze < hit < crit */
const ATTACK_LADDER: ReadonlyArray<AttackResult[0]> = ['miss', 'graze', 'hit', 'crit'];

/**
 * 命中阶梯的公开只读视图。
 *
 * 档位比较（冲锋枪「取最优者」、瞄准升档、掩体降档）都以此顺序为准，
 * 对外暴露同一份顺序可避免调用方各自硬编码一份数组后走样。
 */
export const ATTACK_RESULT_LADDER: ReadonlyArray<AttackResult[0]> = ATTACK_LADDER;

/** 防御阶梯：fail < partial < dodge */
const DEFENSE_LADDER: ReadonlyArray<DefenseResult[0]> = ['fail', 'partial', 'dodge'];

/** 区间随机（含小数） */
const randomFloat = (min: number, max: number): number => {
    const lower = safeNumber(min);
    const upper = safeNumber(max);
    if (upper <= lower) return lower;
    return Math.random() * (upper - lower) + lower;
};

/**
 * 战斗增益 = clamp(1.0 + (智慧 - 3) × 0.05, 0.5, 2.0)
 */
export const calculateCombatBonus = (wisdom: number): number =>
    clamp(1.0 + (Math.max(0, safeNumber(wisdom)) - 3) * 0.05, 0.5, 2.0);

/** 按未归一化权重抽一个键 */
export const rollWeighted = <K extends string>(weights: Record<K, number>): K => {
    const entries = Object.entries(weights) as Array<[K, number]>;
    if (entries.length === 0) return '' as K;

    const total = entries.reduce((sum, [, weight]) => sum + Math.max(0, safeNumber(weight)), 0);
    if (total <= 0) return entries[0][0];

    let roll = Math.random() * total;
    for (const [key, weight] of entries) {
        roll -= Math.max(0, safeNumber(weight));
        if (roll <= 0) return key;
    }
    return entries[entries.length - 1][0];
};

/** 把未归一化权重按给定阶梯归一为概率分布 */
const normalizeWeights = <K extends string>(
    weights: Record<K, number>,
    ladder: ReadonlyArray<K>
): Record<K, number> => {
    const total = ladder.reduce((sum, key) => sum + Math.max(0, safeNumber(weights[key])), 0);

    return ladder.reduce((acc, key, index) => {
        acc[key] =
            total > 0
                ? Math.max(0, safeNumber(weights[key])) / total
                : index === ladder.length - 1
                    ? 1
                    : 0;
        return acc;
    }, {} as Record<K, number>);
};

//-------------------------------------------------------------------------
// 15.2 序列长度与体力门槛
//-------------------------------------------------------------------------

/** 序列长度 = stamina <= 0 ? 0 : floor(stamina / 10) */
export const getSequenceLength = (stamina: number): number => {
    const value = safeNumber(stamina);
    return value <= 0 ? 0 : Math.floor(value / SEQUENCE_STAMINA_PER_SLOT);
};

/**
 * 灵力预测深度（契约 `CombatAlly.resultSequence`）：
 * - will 为 50 时 n 为 1；
 * - 此后每 5 点 will 使 n 额外 +1；
 * - will 小于 50 时 n 为 0，完全不可预测。
 */
export const getPredictionDepth = (will: number): number => {
    const value = safeNumber(will);
    if (value < SEQUENCE_PREDICTION_WILL_THRESHOLD) return 0;
    return 1 + Math.floor((value - SEQUENCE_PREDICTION_WILL_THRESHOLD) / SEQUENCE_PREDICTION_PER_WILL);
};

/** UI 可见序列长度：预测深度截断到 [0, 序列长度] */
export const getVisibleResultSequenceLength = (will: number, stamina: number): number =>
    clamp(getPredictionDepth(will), 0, getSequenceLength(stamina));

/** 序列耗尽时扣除的体力：maxStamina × 10%，至少 1 点 */
export const getExhaustStaminaCost = (maxStamina: number): number =>
    Math.max(1, Math.floor(safeNumber(maxStamina) * SEQUENCE_EXHAUST_STAMINA_RATIO));

/**
 * 序列耗尽后能否通过扣除体力重新生成。
 * 若扣除后长度仍为 0，则不应实际扣除，实体直接无法行动。
 */
export const canRegenerateSequence = (stamina: number, maxStamina: number): boolean => {
    const after = clamp(
        safeNumber(stamina) - getExhaustStaminaCost(maxStamina),
        0,
        Math.max(0, safeNumber(maxStamina))
    );
    return getSequenceLength(after) > 0;
};

//-------------------------------------------------------------------------
// 15.3 档位权重
//-------------------------------------------------------------------------

/** 攻击档位权重输入 */
export interface AttackWeightInput {
    /** 感知：越高越不容易落空、越容易暴击 */
    awareness?: number;
    /** 疲劳计数：序列耗尽重生成的累计次数 */
    fatigueCount?: number;
    /** 武器类型：决定武器类型专属修正 */
    weaponType?: WeaponType;
    /** 单手武器的另一手是否为空 */
    offhandEmpty?: boolean;
}

/**
 * 攻击档位权重表（未归一化）。
 *
 * 武器类型专属修正：
 * - 刺击类（prick / both_prick）：crit 权重提升、hit 权重降低、miss 权重不变；
 * - 单手武器副手空置（wave / prick / pistol / crossbow）：hit 与 crit 提升，miss 与 graze 下降。
 */
export const getAttackWeights = (
    input: AttackWeightInput = {}
): Record<AttackResult[0], number> => {
    const fatigue = clamp(safeNumber(input.fatigueCount) * 0.08, 0, 0.6);
    const awareness = safeNumber(input.awareness);

    let miss = clamp(
        ATTACK_WEIGHT_BASE.miss -
        awareness * ATTACK_PERCEPTION_SCALE.miss +
        fatigue * ATTACK_FATIGUE_SCALE.miss,
        ATTACK_WEIGHT_MIN.miss,
        ATTACK_WEIGHT_MAX.miss
    );
    let graze = clamp(
        ATTACK_WEIGHT_BASE.graze -
        awareness * ATTACK_PERCEPTION_SCALE.graze +
        fatigue * ATTACK_FATIGUE_SCALE.graze,
        ATTACK_WEIGHT_MIN.graze,
        ATTACK_WEIGHT_MAX.graze
    );
    let crit = clamp(
        ATTACK_WEIGHT_BASE.crit +
        awareness * ATTACK_PERCEPTION_SCALE.crit -
        fatigue * ATTACK_FATIGUE_SCALE.crit,
        ATTACK_WEIGHT_MIN.crit,
        ATTACK_WEIGHT_MAX.crit
    );
    let hit = ATTACK_WEIGHT_BASE.hit;

    if (input.weaponType && CRIT_BIAS_TYPES.has(input.weaponType)) {
        crit += 0.08;
        hit = Math.max(0.1, hit - 0.08);
    }

    if (
        input.offhandEmpty &&
        input.weaponType &&
        OFFHAND_EMPTY_BONUS_TYPES.has(input.weaponType)
    ) {
        hit += 0.08;
        crit += 0.04;
        miss = Math.max(ATTACK_WEIGHT_MIN.miss, miss - 0.04);
        graze = Math.max(ATTACK_WEIGHT_MIN.graze, graze - 0.03);
    }

    return { miss, graze, hit, crit };
};

/** 防御档位权重输入 */
export interface DefenseWeightInput {
    agility?: number;
    fatigueCount?: number;
    /** 装备武器类型：盾牌类与重型武器会改写防御序列质量 */
    weaponType?: WeaponType;
}

/**
 * 防御档位权重表（未归一化）。
 *
 * 武器类型专属修正（由武器类型决定防御效率，武器模板不显式声明该字段）：
 * - 单手盾（shield）：partial 显著提升，dodge 下降，且免伤上限可达 1；
 * - 双手盾（both_shield）：partial 显著提升，且防御序列**不再出现** `dodge` 与 `fail`，
 *   即举盾期间防御判定恒为 partial（权重归零后由 normalizeWeights 全部落到 partial）；
 * - 重型武器（both_wave / both_prick / sniper_rifle）：fail 上升、dodge 受限。
 */
export const getDefenseWeights = (
    input: DefenseWeightInput = {}
): Record<DefenseResult[0], number> => {
    const agility = safeNumber(input.agility);
    const fatigue = clamp(safeNumber(input.fatigueCount) * 0.08, 0, 0.6);

    let fail = clamp(
        DEFENSE_WEIGHT_BASE.fail -
        agility * DEFENSE_AGILITY_SCALE.fail +
        fatigue * DEFENSE_FATIGUE_SCALE.fail,
        DEFENSE_WEIGHT_MIN.fail,
        DEFENSE_WEIGHT_MAX.fail
    );
    let partial = DEFENSE_WEIGHT_BASE.partial;
    let dodge = clamp(
        DEFENSE_WEIGHT_BASE.dodge +
        agility * DEFENSE_AGILITY_SCALE.dodge -
        fatigue * DEFENSE_FATIGUE_SCALE.dodge,
        DEFENSE_WEIGHT_MIN.dodge,
        DEFENSE_WEIGHT_MAX.dodge
    );

    const weaponType = input.weaponType;
    const trait = getWeaponTrait(weaponType);
    if (trait.partialOnlyDefense) {
        // 双手盾：防御序列只保留 partial，彻底剔除 dodge 与 fail。
        partial += 0.35;
        dodge = 0;
        fail = 0;
    } else if (trait.shieldCapToOne) {
        partial += 0.35;
        dodge = Math.max(DEFENSE_WEIGHT_MIN.dodge, dodge - 0.06);
        fail = Math.max(0.02, fail - 0.1);
    } else if (trait.heavyDefensePenalty) {
        fail += 0.12;
        dodge = Math.max(DEFENSE_WEIGHT_MIN.dodge, dodge - 0.05);
    }

    return { fail, partial, dodge };
};

/** 该武器类型下的最大免伤比：盾牌类可挡满，其余不超过 0.999 */
export const getDefenseMaxReduction = (weaponType?: WeaponType): number =>
    weaponType && SHIELD_TYPES.has(weaponType) ? 1 : MAX_PARTIAL_REDUCTION;

/**
 * 角色装备的护甲提供的常驻免伤 = 各护甲 defense 之和。
 *
 * 护甲 defense 可正可负（负值提高所受伤害），故不做 0 下限夹取；
 * 上限受 {@link MAX_PARTIAL_REDUCTION} 约束。
 */
export const getEquipPartialReduction = (equipment?: Partial<EquipState> | null): number => {
    const armors = normalizeEquipState(equipment).armors;
    const raw = armors.reduce((sum, armor) => sum + safeNumber(armor?.defense ?? 0), 0);
    return clamp(raw, -1, MAX_PARTIAL_REDUCTION);
};

/**
 * 敏捷 → 闪避力（额外免伤比）的换算系数：1 点敏捷 = 1.5% 额外免伤。
 *
 * 校准依据：角色敏捷区间 7~23，换算后为 10.5%~34.5% 额外免伤，
 * 与敌人模板 evasion 点数区间（6~36 点，同口径百分化）同档，避免敌我两侧量纲失衡。
 */
export const EVASION_PER_AGILITY = 0.015;

/**
 * 实体的闪避力（额外免伤比）= 敏捷 × {@link EVASION_PER_AGILITY}。
 *
 * 契约 `CombatDynamicState.evasion` 的玩家侧取值来源：引擎写入战斗动态态、
 * 推演口径（{@link getEntityDefenseOdds}）计算最大免伤，都取此处，避免各算一套。
 */
export const getAgilityEvasion = (agility: number): number =>
    clamp(safeNumber(agility) * EVASION_PER_AGILITY, 0, MAX_PARTIAL_REDUCTION);

//-------------------------------------------------------------------------
// 15.4 攻击伤害尺度
//-------------------------------------------------------------------------

/** 攻击伤害尺度：三档伤害的取值 */
export interface AttackDamageScale {
    /** 命中档伤害（= 基准伤害） */
    hit: number;
    /** 擦伤档伤害区间上界 [0, grazeMax] */
    grazeMax: number;
    /** 暴击档伤害区间上界 [hit, critMax] */
    critMax: number;
}

/** 攻击伤害尺度输入 */
export interface AttackScaleInput {
    /** 是否叠加实体维度（false = 纯武器口径） */
    contextual?: boolean;
    strength?: number;
    wisdom?: number;
    /** 主手武器；null 视为空手 */
    weapon?: WeaponTemplate | null;
    /** 单手武器副手空置：命中档额外 +1 伤害（仅挥动 / 刺击类声明了伤害加成） */
    offhandEmpty?: boolean;
}

/**
 * 攻击伤害尺度。
 *
 * 伤害由两部分拼接：**武器自身** + **实体自身**。
 *
 * - 武器自身：基准 = 武器伤害，暴击加成 = 武器 crit.bonus；
 * - 实体自身：基准 = 实体力量；近程（melee）武器可完整继承实体自身的攻击力与暴击力，
 *   远程（range）武器只吃武器伤害，实体不参与；
 * - 空手：基准与暴击加成均取实体力量，故最大暴击伤害 = 2 × 力量（由力量决定）；
 * - 近程持械：命中 = 武器伤害 + 力量，暴击上限 = (武器伤害 + 武器暴击加成) + 实体自身最大暴击伤害
 *   （实体自身最大暴击伤害 = 2 × 力量），即暴击加成 = 武器 crit.bonus + 力量；
 * - 叠加实体维度（contextual）时整体乘以战斗增益。
 */
export const getAttackDamageScale = (input: AttackScaleInput = {}): AttackDamageScale => {
    const strength = Math.max(0, safeNumber(input.strength));
    const weapon = input.weapon ?? null;
    const contextual = input.contextual === true;
    const multiplier = contextual ? calculateCombatBonus(safeNumber(input.wisdom)) : 1;

    let base: number;
    let bonus: number;
    let attribute = 0;

    if (weapon) {
        base = Math.max(0, safeNumber(weapon.damage));
        bonus = Math.max(0, safeNumber(weapon.crit?.bonus));
        if (weapon.weaponDamageType === 'melee') {
            // 近程：实体自身的攻击力进命中基准，实体自身的暴击力另计入暴击加成。
            attribute = strength;
            bonus += strength;
        }
    } else {
        base = strength;
        bonus = strength;
    }

    // 副手空置的伤害加成只对「声明了伤害加成的单手武器」生效：
    // 双手武器本就占满双手；手枪 / 弩的契约措辞只有命中加成，不追加伤害。
    if (
        contextual &&
        input.offhandEmpty &&
        weapon !== null &&
        OFFHAND_EMPTY_DAMAGE_TYPES.has(weapon.weaponType)
    ) {
        base += 1;
    }

    const hit = Math.max(0, Math.floor((base + attribute) * multiplier));
    return {
        hit,
        grazeMax: hit,
        critMax: Math.max(hit, Math.floor(hit + bonus * multiplier)),
    };
};

/**
 * instant 真实伤害：floor(damage × (1 + floor(will / 10) × 0.5) × combatBonus × 0.75)
 *
 * 不参与任何常规结算，不消费结果序列。
 */
export const calculateInstantDamage = (
    weapon: WeaponTemplate | null,
    will: number,
    combatBonus: number
): number => {
    if (!weapon) return 0;
    const willValue = Math.max(0, safeNumber(will));
    return Math.floor(
        safeNumber(weapon.damage) *
        (1 + Math.floor(willValue / 10) * 0.5) *
        safeNumber(combatBonus, 1) *
        0.75
    );
};

/** 敌人攻击力 = 模板 damage */
export const calculateEnemyAttackValue = (damage: number): number =>
    Math.max(0, Math.floor(safeNumber(damage)));

//-------------------------------------------------------------------------
// 15.5 概率契约与推演
//-------------------------------------------------------------------------

/** 攻击阶梯的单档概率与伤害区间 */
export interface AttackLadderOdds {
    ladder: AttackResult[0];
    label: string;
    rate: number;
    minDamage: number;
    maxDamage: number;
}

/** 攻击概率分布（武器单独 / 武器 + 人两种口径共用） */
export interface AttackOddsData {
    miss: AttackLadderOdds;
    graze: AttackLadderOdds;
    hit: AttackLadderOdds;
    crit: AttackLadderOdds;
    /** 命中档最终伤害（已含力量与战斗增益） */
    effectiveDamage: number;
    /** 暴击相对命中的最大额外伤害 */
    effectiveCritBonus: number;
    description: string;
    mode: 'base' | 'contextual';
}

/** 防御阶梯的单档概率与免伤区间 */
export interface DefenseLadderOdds {
    ladder: DefenseResult[0];
    label: string;
    rate: number;
    minReduction: number;
    maxReduction: number;
}

/** 防御概率分布（持武 / 空手两种姿态共用） */
export interface DefenseOddsData {
    fail: DefenseLadderOdds;
    partial: DefenseLadderOdds;
    dodge: DefenseLadderOdds;
    description: string;
    notes: string[];
    mode: 'equipped' | 'unarmed';
}

/**
 * 序列推演的实体来源。
 *
 * 玩家态 / 同伴态 / 战斗态均满足该结构，无需为三者各写一套重载。
 */
export interface SequenceEntitySource {
    dynamic: {
        strength: number;
        agility: number;
        wisdom: number;
        awareness: number;
        will: number;
        equipment: EquipState;
        stamina?: number;
        maxStamina?: number;
    };
    static?: { initialState?: { vital?: { maxStamina?: number } } };
}

/** 单手武器的另一手是否为空（副手空置加成的判定依据） */
export const isOffhandEmpty = (entity?: SequenceEntitySource | null): boolean =>
    !entity?.dynamic?.equipment?.weapons?.side;

/** 攻击序列口径说明的输入：只承载实际参与算式的项 */
interface AttackOddsNotesInput {
    weapon: WeaponTemplate | null;
    strength: number;
    wisdom: number;
    awareness: number;
    offhandEmpty: boolean;
}

/**
 * 攻击序列口径说明。
 *
 * 必须与 {@link getAttackDamageScale} 与 {@link getAttackWeights} 的算式逐项对应，
 * 只写真正参与计算、以及明确不参与的项，避免把无关属性写进口径说明：
 * - 伤害数值：近程武器与空手吃力量，远程武器不吃（只吃武器伤害）；
 * - 伤害数值：三类武器都吃智慧的战斗增益乘算，基准与暴击加成同时被放大；
 * - 档位权重：由感知决定，力量不参与；
 * - 副手空置：对单手武器追加档位权重；其中挥动 / 刺击类另给基准 +1，手枪 / 弩不加伤害。
 */
const describeAttackOdds = (input: AttackOddsNotesInput): string => {
    const combatBonus = calculateCombatBonus(safeNumber(input.wisdom));
    const strengthNote = input.weapon
        ? input.weapon.weaponDamageType === 'melee'
            ? `力量 ${safeNumber(input.strength)} → 进命中基准与暴击加成`
            : '力量不参与伤害（远程武器只吃武器伤害）'
        : `空手：命中基准与暴击加成均取力量 ${safeNumber(input.strength)}`;

    const notes = [
        strengthNote,
        `智慧 ${safeNumber(input.wisdom)} → 战斗增益 ×${combatBonus.toFixed(2)}，乘算基准与暴击加成`,
        `感知 ${safeNumber(input.awareness)} → 只改档位权重`,
    ];
    if (input.offhandEmpty) {
        const weaponType = input.weapon?.weaponType;
        notes.push(
            weaponType && OFFHAND_EMPTY_DAMAGE_TYPES.has(weaponType)
                ? '副手空置 → 基准 +1，并追加档位权重'
                : '副手空置 → 追加档位权重（该武器类型不加伤害）'
        );
    }

    return ['叠加持有者属性后的实际输出序列分布：', ...notes.map((note) => `· ${note}`)].join('\n');
};

/**
 * 武器攻击概率分布。
 *
 * - `mode = 'base'`：武器单独序列，只取武器模板固有属性；
 * - `mode = 'contextual'`：武器 + 人序列，叠加五维、战斗增益与副手空置加成。
 */
export const getWeaponAttackOdds = (
    weapon: WeaponTemplate | null,
    entity?: SequenceEntitySource | null,
    mode: 'base' | 'contextual' = 'base'
): AttackOddsData => {
    const contextual = mode === 'contextual' && Boolean(entity);
    const dynamic = contextual ? entity?.dynamic : undefined;
    const offhandEmpty = contextual ? isOffhandEmpty(entity) : false;
    const weaponType = weapon?.weaponType;

    const weights = normalizeWeights(
        getAttackWeights({
            awareness: dynamic?.awareness,
            weaponType,
            offhandEmpty,
        }),
        ATTACK_LADDER
    );

    const scale = getAttackDamageScale({
        contextual,
        strength: dynamic?.strength,
        wisdom: dynamic?.wisdom,
        weapon,
        offhandEmpty,
    });

    const hit = scale.hit;
    const critBonus = Math.max(0, scale.critMax - hit);
    const description = contextual
        ? describeAttackOdds({
            weapon,
            strength: safeNumber(dynamic?.strength),
            wisdom: safeNumber(dynamic?.wisdom),
            awareness: safeNumber(dynamic?.awareness),
            offhandEmpty,
        })
        : '纯武器固有基础属性推导的理论序列分布。';

    return {
        miss: { ladder: 'miss', label: '未命中', rate: weights.miss, minDamage: 0, maxDamage: 0 },
        graze: {
            ladder: 'graze',
            label: '擦伤',
            rate: weights.graze,
            minDamage: 1,
            maxDamage: Math.max(1, hit),
        },
        hit: { ladder: 'hit', label: '命中', rate: weights.hit, minDamage: hit, maxDamage: hit },
        crit: {
            ladder: 'crit',
            label: '暴击',
            rate: weights.crit,
            minDamage: hit,
            maxDamage: hit + critBonus,
        },
        effectiveDamage: hit,
        effectiveCritBonus: critBonus,
        description,
        mode,
    };
};

/**
 * 实体防御概率分布。
 *
 * - `mode = 'equipped'`：持武姿态，武器类型决定防御效率；
 * - `mode = 'unarmed'`：空手裸装姿态，防御效率不受武器影响。
 *
 * 护甲提供的常驻免伤在两种姿态下都计入 partial 档位下限。
 */
export const getEntityDefenseOdds = (
    entity?: SequenceEntitySource | null,
    weapon?: WeaponTemplate | null,
    mode: 'equipped' | 'unarmed' = 'equipped'
): DefenseOddsData => {
    const dynamic = entity?.dynamic;
    const agility = safeNumber(dynamic?.agility);
    const notes: string[] = [];
    const partialFloor = getEquipPartialReduction(dynamic?.equipment);

    const weaponType = mode === 'equipped' ? weapon?.weaponType : undefined;
    const weights = normalizeWeights(
        getDefenseWeights({ agility, weaponType }),
        DEFENSE_LADDER
    );
    // 最大免伤 = 常驻免伤 + 额外免伤（玩家侧由敏捷推导），再按武器口径封顶：盾牌类可达 1。
    const maxReduction = Math.min(
        getDefenseMaxReduction(weaponType),
        partialFloor + getAgilityEvasion(agility)
    );

    let description = '实体空手裸装状态下的纯敏捷防御序列分布。';
    if (mode === 'equipped' && weapon) {
        if (weaponType && SHIELD_TYPES.has(weaponType)) {
            notes.push(
                '盾牌格挡加成：显著提高格挡率，可实现 100% 满额抵挡（免伤比达 1.0 时仅消耗盾牌耐久）'
            );
            notes.push('持盾机动惩罚：闪避率显著降低');
        } else if (weaponType && HEAVY_DEFENSE_PENALTY_TYPES.has(weaponType)) {
            notes.push('重型武器惩罚：防御序列质量下降，失误率增加，闪避率受限');
        } else {
            notes.push('轻型武器：无机动惩罚，维持正常防御序列');
        }
        description = `装备 ${weapon.name} 时的防御序列分布。`;
    } else if (mode === 'equipped') {
        description = '未装备武器时的实体防御序列分布。';
    }

    return {
        fail: { ladder: 'fail', label: '失误', rate: weights.fail, minReduction: 0, maxReduction: 0 },
        partial: {
            ladder: 'partial',
            label: '减免/格挡',
            rate: weights.partial,
            minReduction: partialFloor,
            maxReduction,
        },
        dodge: {
            ladder: 'dodge',
            label: '完全闪避',
            rate: weights.dodge,
            minReduction: 1,
            maxReduction: 1,
        },
        description,
        notes,
        mode,
    };
};

//-------------------------------------------------------------------------
// 15.6 序列实例化
//-------------------------------------------------------------------------

/**
 * 按档位权重抽一串攻击序列。
 * 三档伤害值域由 {@link AttackDamageScale} 给出，与战斗序列同源。
 */
export const generateAttackSequence = (
    weights: Record<AttackResult[0], number>,
    scale: AttackDamageScale,
    length: number
): AttackResult[] => {
    const count = Math.max(0, Math.floor(safeNumber(length)));
    const results: AttackResult[] = [];

    for (let i = 0; i < count; i += 1) {
        switch (rollWeighted(weights)) {
            case 'miss':
                results.push(['miss', 0]);
                break;
            case 'graze':
                results.push([
                    'graze',
                    Math.max(0, Math.floor(randomFloat(0, Math.max(0, scale.grazeMax)))),
                ]);
                break;
            case 'crit':
                results.push([
                    'crit',
                    Math.max(
                        0,
                        Math.floor(randomFloat(Math.max(0, scale.hit), Math.max(0, scale.critMax)))
                    ),
                ]);
                break;
            default:
                results.push(['hit', Math.max(0, Math.floor(Math.max(0, scale.hit)))]);
                break;
        }
    }

    return results;
};

/** 防御序列的 partial 档位免伤区间 */
export interface DefenseScale {
    /** 裁定值下限（= 常驻免伤） */
    min: number;
    /** 裁定值上限（盾牌类可达 1） */
    max: number;
}

/** 按档位权重抽一串防御序列；partial 的值为最终免伤比本身 */
export const generateDefenseSequence = (
    weights: Record<DefenseResult[0], number>,
    scale: DefenseScale,
    length: number
): DefenseResult[] => {
    const count = Math.max(0, Math.floor(safeNumber(length)));
    const results: DefenseResult[] = [];
    // 上限允许到 1：盾牌类叠加到满额时，部分闪避的裁定值也可以是 1（满额抵挡）。
    const min = clamp(safeNumber(scale.min), -1, 1);
    const max = clamp(safeNumber(scale.max), -1, 1);

    for (let i = 0; i < count; i += 1) {
        switch (rollWeighted(weights)) {
            case 'dodge':
                results.push(['dodge', 1]);
                break;
            case 'fail':
                results.push(['fail', 0]);
                break;
            default:
                results.push(['partial', max > min ? randomFloat(min, max) : min]);
                break;
        }
    }

    return results;
};

/** 由概率分布重新掷骰实例化攻击序列（推演终端用） */
export const instantiateAttackSequence = (
    odds: AttackOddsData,
    length: number
): AttackResult[] =>
    generateAttackSequence(
        {
            miss: odds.miss.rate,
            graze: odds.graze.rate,
            hit: odds.hit.rate,
            crit: odds.crit.rate,
        },
        {
            hit: odds.hit.minDamage,
            grazeMax: odds.graze.maxDamage,
            critMax: odds.crit.maxDamage,
        },
        length
    );

/** 由概率分布重新掷骰实例化防御序列（推演终端用） */
export const instantiateDefenseSequence = (
    odds: DefenseOddsData,
    length: number
): DefenseResult[] =>
    generateDefenseSequence(
        { fail: odds.fail.rate, partial: odds.partial.rate, dodge: odds.dodge.rate },
        { min: odds.partial.minReduction, max: odds.partial.maxReduction },
        length
    );

//-------------------------------------------------------------------------
// 15.7 战斗序列（按武器槽位）
//-------------------------------------------------------------------------

/**
 * 我方战斗结果序列。
 *
 * 与元契约 `CombatAlly.resultSequence` 结构一致：
 * - 主手 / 副手各持一条攻击序列（玩家可能主手远程、副手近程，两者序列不同）；
 * - 主副手皆无武器时只生成统一攻击序列 `attack`；
 * - 防御序列常驻一条，不分主副手。
 */
export interface AllyResultSequence {
    main?: AttackResult[];
    side?: AttackResult[];
    attack?: AttackResult[];
    defense: DefenseResult[];
}

/** 战斗序列生成输入 */
export interface CombatSequenceInput {
    strength: number;
    agility: number;
    wisdom: number;
    awareness: number;
    stamina: number;
    /**
     * 闪避力（额外免伤比）
     *
     * 与 `CombatDynamicState.evasion` 同口径：防御序列的最大免伤 = 常驻免伤 + 本值。
     */
    evasion: number;
    equipment: EquipState;
    fatigueCount?: number;
}

/**
 * 生成我方战斗结果序列。
 *
 * 序列长度为 0（stamina <= 0）时攻击序列为空数组，实体无法行动；
 * 防御序列同样为空，避免出现"无法行动却还有免伤判定"的错位。
 */
export const generateAllyResultSequence = (input: CombatSequenceInput): AllyResultSequence => {
    const length = getSequenceLength(input.stamina);
    const slots = normalizeEquipState(input.equipment).weapons;
    const mainWeapon = slots.main;
    const sideWeapon = slots.side;
    const defenseWeaponType = (mainWeapon ?? sideWeapon)?.weaponType;

    const partialFloor = getEquipPartialReduction(input.equipment);
    const defense = generateDefenseSequence(
        getDefenseWeights({
            agility: input.agility,
            fatigueCount: input.fatigueCount,
            weaponType: defenseWeaponType,
        }),
        {
            min: partialFloor,
            // 最大免伤 = 常驻免伤 + 额外免伤，再按武器口径封顶：盾牌类可达 1（满额抵挡）。
            max: Math.min(
                getDefenseMaxReduction(defenseWeaponType),
                partialFloor + safeNumber(input.evasion)
            ),
        },
        length
    );

    const buildAttack = (
        weapon: WeaponInstance | null,
        offhandEmpty: boolean
    ): AttackResult[] =>
        generateAttackSequence(
            getAttackWeights({
                awareness: input.awareness,
                fatigueCount: input.fatigueCount,
                weaponType: weapon?.weaponType,
                offhandEmpty,
            }),
            getAttackDamageScale({
                contextual: true,
                strength: input.strength,
                wisdom: input.wisdom,
                weapon,
                offhandEmpty,
            }),
            length
        );

    if (!mainWeapon && !sideWeapon) {
        return { attack: buildAttack(null, false), defense };
    }

    return {
        ...(mainWeapon ? { main: buildAttack(mainWeapon, !sideWeapon) } : {}),
        ...(sideWeapon ? { side: buildAttack(sideWeapon, !mainWeapon) } : {}),
        defense,
    };
};

/**
 * 敌人攻击结果。
 *
 * 敌人不预生成序列，在执行前一刻掷骰；新模型无感知维度，
 * 命中权重取无修正基准，暴击倍率取下限 1.5。
 */
export const rollEnemyAttackResult = (
    attackValue: number,
    fatigueCount: number = 0
): AttackResult => {
    const base = Math.max(0, safeNumber(attackValue));

    switch (rollWeighted(getAttackWeights({ fatigueCount }))) {
        case 'miss':
            return ['miss', 0];
        case 'graze':
            return ['graze', Math.max(0, Math.floor(randomFloat(0, base)))];
        case 'crit':
            return ['crit', Math.max(0, Math.floor(randomFloat(base, base * 1.5)))];
        default:
            return ['hit', Math.max(0, Math.floor(base))];
    }
};

/**
 * 敌人 / 实体的防御结果。
 *
 * - 有闪避力（evasion > 常驻免伤）：partial 裁定值 ∈ [defense, evasion]；
 * - 无闪避力（不可移动类）：恒为 `['partial', defense]`，只吃常驻免伤。
 */
export const rollEntityDefenseResult = (defense: number, evasion: number): DefenseResult => {
    const floor = clamp(safeNumber(defense), -1, MAX_PARTIAL_REDUCTION);
    const ceiling = clamp(safeNumber(evasion), -1, MAX_PARTIAL_REDUCTION);
    if (ceiling <= floor) return ['partial', floor];

    const weights = {
        fail: clamp(0.3 - ceiling * 0.4, 0.05, 0.75),
        partial: 0.45,
        dodge: clamp(0.05 + ceiling * 0.5, 0.01, 0.4),
    };

    switch (rollWeighted(weights)) {
        case 'dodge':
            return ['dodge', 1];
        case 'fail':
            return ['fail', 0];
        default:
            return ['partial', randomFloat(floor, ceiling)];
    }
};

//-------------------------------------------------------------------------
// 15.8 武器特性结算
//-------------------------------------------------------------------------

/**
 * 挥动类溅射伤害：对目标所在格内的其他目标造成 `本次判定值 ÷ 其他目标数`（向上取整）。
 *
 * @param judgement 本次攻击的判定值
 * @param otherTargetCount 目标格内**除主目标外**的其他目标数
 */
export const getSplashDamage = (judgement: number, otherTargetCount: number): number => {
    const count = Math.max(0, Math.floor(safeNumber(otherTargetCount)));
    if (count <= 0) return 0;
    return Math.ceil(Math.max(0, safeNumber(judgement)) / count);
};

/**
 * 狙击步枪的距离降级概率。
 *
 * 契约：结算时与目标距离越近，判定结果越容易降级（有概率直接从 crit 降为 miss），
 * 最佳攻击距离为 12 格。此处以「距离相对最佳值的亏损比例」作为降级概率：
 * 满距（≥12）无降级，贴身（1 格）降级概率最高（约 0.9），保证近战贴脸时狙击枪近乎失效。
 */
export const getSniperDowngradeChance = (distance: number, optimalRange: number): number => {
    const optimal = Math.max(1, safeNumber(optimalRange, 12));
    const d = Math.max(0, safeNumber(distance));
    if (d >= optimal) return 0;
    return clamp((optimal - d) / optimal, 0, 0.9);
};

/**
 * 霰弹枪近距离伤害加成：距离越近伤害越高。
 *
 * 契约未给出具体系数，此处按「1 格满加成（+50%），射程边缘无加成」的线性衰减取值，
 * 与狙击枪的距离惩罚方向相反，形成远近武器的对称设计。
 */
export const getCloseRangeDamageMultiplier = (distance: number, range: number): number => {
    const maxRange = Math.max(1, safeNumber(range, 1));
    const d = clamp(safeNumber(distance), 0, maxRange);
    if (d <= 1) return 1.5;
    return 1 + 0.5 * ((maxRange - d) / Math.max(1, maxRange - 1));
};

/**
 * 瞄准（狙击步枪）：使下一次攻击序列的判定结果提升 1 档（miss → graze → hit → crit）；
 * 若原结果为 crit 则伤害翻倍。命中阶梯顺序为 miss < graze < hit < crit。
 *
 * @returns 提升档位后的判定与「是否触发暴击翻倍」
 */
export const applyAimBonus = (
    result: AttackResult
): { result: AttackResult; critDoubled: boolean } => {
    const idx = ATTACK_LADDER.indexOf(result[0]);
    if (idx < 0) return { result, critDoubled: false };
    if (idx === ATTACK_LADDER.length - 1) {
        // 已是 crit：不再升档，改为伤害翻倍。
        return { result: [result[0], Math.max(0, safeNumber(result[1])) * 2], critDoubled: true };
    }
    const nextKind = ATTACK_LADDER[idx + 1];
    // 升档后伤害值由调用方按新档位基准重算，此处仅占位保留原值，避免误用旧档伤害。
    return { result: [nextKind, result[1]], critDoubled: false };
};

/**
 * 暴击无视防御：按武器特性的穿透比例削减目标常驻免伤。
 *
 * 契约：刺击类暴击无视目标**全部** defense（比例 1）；狙击步枪暴击无视 0.3 defense。
 * 其余武器不穿透。
 */
export const getCritDefensePierce = (weaponType?: WeaponType): number =>
    clamp(safeNumber(getWeaponTrait(weaponType).critDefensePierce), 0, 1);