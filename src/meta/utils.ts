import type {
    AccessoryInstance,
    ArmorInstance,
    ArmorTemplate,
    BaseDynamicState,
    ChainGenerationContext,
    ChainNarrative,
    ConsumableInstance,
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
    NpcDynamicState,
    NpcTemplate,
    OriginTemplate,
    PlayerDynamicState,
    PlayerState,
    PlayerTemplate,
    Resident,
    Sanctuary,
    Settings,
    StoryConfig,
    Vital,
    VitalRecord,
    WeaponInstance,
    WeaponTemplate,
    Zone,
    ZoneGenerationContext,
} from './interface';
import { GameState } from './type';
import type {
    AttributeType,
    ConsumableEffectType,
    DynamicVitalType,
    SanctuaryState,
    VitalType,
    VisualMode,
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
    'perception',
    'spiritual',
];

const VITAL_TYPES: ReadonlyArray<VitalType> = [
    'maxHp',
    'maxSanity',
    'maxStamina',
    'maxVigor',
];

/** 饰品可用的效果键（属性 + 体征上限） */
const ACCESSORY_EFFECT_TYPES: ReadonlySet<string> = new Set<string>([
    ...ATTRIBUTE_TYPES,
    ...VITAL_TYPES,
]);

/** 消耗品在饰品效果之外可用的干预指令 */
const CONSUMABLE_EXTRA_EFFECT_TYPES: ReadonlySet<string> = new Set<string>([
    'heal_hp',
    'heal_sanity',
    'heal_stamina',
    'heal_vigor',
    'restore_battery',
    'repair_integrity',
]);

/** 消耗品可用的效果键（饰品效果 + 生存 / 链接仪干预指令） */
const CONSUMABLE_EFFECT_TYPES: ReadonlySet<string> = new Set<string>([
    ...ACCESSORY_EFFECT_TYPES,
    ...CONSUMABLE_EXTRA_EFFECT_TYPES,
]);

const DYNAMIC_VITAL_TYPES: ReadonlyArray<DynamicVitalType> = [
    'hp',
    'sanity',
    'stamina',
    'vigor',
];

const ITEM_TYPES = [
    'weapon',
    'armor',
    'accessory',
    'consumable',
    'data',
    'material',
] as const;

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

export const isItemTemplate = (tpl: ItemTemplate | NpcTemplate): tpl is ItemTemplate => {
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
    'storage' in zone || 'food' in zone || 'population' in zone;

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

type NormalizedEquipState = Required<Pick<EquipState, 'weapons' | 'armors' | 'accessories'>>;

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
    const armorSlots = resolveSlotCount(
        settings?.equipmentSlots?.armor,
        equipment?.armors?.length,
        DEFAULT_ARMOR_SLOTS
    );

    const accessorySlots = resolveSlotCount(
        settings?.equipmentSlots?.accessory,
        equipment?.accessories?.length,
        DEFAULT_ACCESSORY_SLOTS
    );

    const weapons: [WeaponInstance | null, WeaponInstance | null] = [
        equipment?.weapons?.[0] ?? null,
        equipment?.weapons?.[1] ?? null,
    ];

    return {
        weapons,
        armors: Array.from(
            { length: armorSlots },
            (_, index) => equipment?.armors?.[index] ?? null
        ),
        accessories: Array.from(
            { length: accessorySlots },
            (_, index) => equipment?.accessories?.[index] ?? null
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
        source: Array<WeaponInstance | ArmorInstance | AccessoryInstance | null> | undefined,
        keptLength: number
    ): void => {
        (source ?? []).slice(keptLength).forEach((item) => {
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

    const allowed =
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
        perception: safeNumber(attribute.perception),
        spiritual: safeNumber(attribute.spiritual),

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

export const createNpcEntity = (
    npc: NpcTemplate
): Entity<NpcTemplate, NpcDynamicState> => {
    const base = createPlayerDynamicState(npc);

    return {
        static: safeDeepClone(npc),
        dynamic: {
            ...base,
            trust: safeNumber(npc.initialState.trust ?? 0),
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

    (equipment?.accessories ?? []).forEach((item) => {
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

const pickSanctuaryState = (source: SanctuaryState): SanctuaryState => ({
    food: safeNumber(source.food),
    water: safeNumber(source.water),
    medicine: safeNumber(source.medicine),
    electricity: safeNumber(source.electricity),
    scraps: safeNumber(source.scraps),
    population: safeNumber(source.population),
    morale: safeNumber(source.morale),
    erosion: safeNumber(source.erosion),
});

//=============================================================================
// 7. 地图与层级解析
//=============================================================================

export const normalizeUnlockIds = (ids: string | string[]): string[] =>
    Array.isArray(ids) ? ids : ids.split(',').map((id) => id.trim());

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
        // LLM schema 要求输出单个 EnemyTemplate，但运行时契约是
        // { data: EnemyTemplate[]; spawnCondition }。单模板/裸模板时包装为
        // { data:[t], spawnCondition:'on_enter' } —— 否则 tryNodeEncounter 的
        // spawnCondition 比较恒 false（精英怪永不生成），且区域装载落地器
        // specificEnemy.data.forEach 会因 data undefined 崩溃。
        const rawSpecific = (node as unknown as { specificEnemy?: unknown }).specificEnemy;
        if (rawSpecific && typeof rawSpecific === 'object' && !Array.isArray(rawSpecific)) {
            const candidate = rawSpecific as {
                data?: unknown;
                spawnCondition?: unknown;
            };
            if (Array.isArray(candidate.data)) {
                node.specificEnemy = {
                    data: candidate.data as EnemyTemplate[],
                    spawnCondition:
                        candidate.spawnCondition === 'on_search' ||
                            candidate.spawnCondition === 'on_interact'
                            ? candidate.spawnCondition
                            : 'on_enter',
                };
            } else {
                node.specificEnemy = {
                    data: [candidate as unknown as EnemyTemplate],
                    spawnCondition: 'on_enter',
                };
            }
        }

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
            ...(isSanctuary(zone) ? { isSanctuary: pickSanctuaryState(zone) } : {}),
        },
        node: {
            id: nodeId,
            name: node?.name ?? nodeId,
            desc: node?.desc ?? '',
            ...(node?.threatLevel !== undefined ? { isDangerous: node.threatLevel } : {}),
        },
    };
};

//=============================================================================
// 8. 背包与装备操作
//=============================================================================

export const getPrimaryWeapon = (equipment: EquipState): WeaponInstance | null => {
    const weapons = equipment?.weapons ?? [null, null];
    return weapons.find((weapon): weapon is WeaponInstance => weapon !== null) ?? null;
};

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

export const equipItem = (
    equipment: EquipState,
    item: ItemInstance,
    itemType: 'weapon' | 'armor' | 'accessory',
    slotIndex: number
): EquipState => {
    const next = normalizeEquipState(equipment);

    if (
        itemType === 'weapon' &&
        isWeaponInstance(item) &&
        slotIndex >= 0 &&
        slotIndex < next.weapons.length
    ) {
        next.weapons[slotIndex] = item;
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

    if (itemType === 'weapon' && slotIndex >= 0 && slotIndex < next.weapons.length) {
        next.weapons[slotIndex] = null;
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
    companions?: Array<Entity<NpcTemplate, NpcDynamicState>>;
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
                const npc = createNpcEntity(tpl);
                changes.logs.push({
                    text: `同伴加入: ${npc.static.name}`,
                    type: 'event',
                });
                comps.push(npc);
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

export const calculateEncounterChance = (
    threatLevel: number,
    searchCount: number,
    staminaPct: number,
    vigorPct: number,
    condition: 'on_enter' | 'on_search' | 'on_interact' | 'on_sanity_critical',
    config: Settings['gameConfig']
): number => {
    const staminaRatio = toRatio(staminaPct);
    const vigorRatio = toRatio(vigorPct);
    const threatDivisor = Math.max(1, safeNumber(config.enemyEncounter.threatDivisor, 1));

    let encounterChance =
        safeNumber(config.enemyEncounter.baseChance) +
        safeNumber(threatLevel) / threatDivisor;

    if (condition === 'on_search') {
        const fatiguePenalty =
            1 +
            (1 - staminaRatio) * safeNumber(config.searchCosts.staminaFatigueFactor) +
            (1 - vigorRatio) * safeNumber(config.searchCosts.vigorFatigueFactor);

        encounterChance +=
            safeNumber(config.enemyEncounter.searchBaseRisk) +
            safeNumber(searchCount) * safeNumber(config.enemyEncounter.searchRiskPerCount) +
            (fatiguePenalty - 1) * safeNumber(config.enemyEncounter.fatiguePenaltyFactor);
    } else if (condition === 'on_sanity_critical') {
        encounterChance += 0.5;
    }

    return clamp(encounterChance, 0, 1);
};

export const calculateSearchCosts = (
    attributes: { wisdom: number; perception: number },
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
        safeNumber(attributes.perception) * safeNumber(searchCosts.perceptionFactor),
        0,
        1
    );

    const sanityCost = parseFloat(
        (safeNumber(searchCosts.baseSanity) * wisdomResistance).toFixed(1)
    );

    const costMultiplier = clamp(
        1.0 -
        (safeNumber(attributes.perception) * safeNumber(searchCosts.perceptionFactor) +
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
    attributes: { wisdom: number; perception: number; agility: number },
    searchCount: number,
    config: Settings['gameConfig']
): number =>
    safeNumber(attributes.wisdom) +
    safeNumber(attributes.agility) * safeNumber(config.perceptionWeights.agility) +
    safeNumber(attributes.perception) *
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
                    id: config.theme.id,
                    prompt: config.theme.prompt,
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
                id: config.theme.id,
                prompt: config.theme.prompt,
            },
        },
        params: {
            nodeToGenerate: config.nodeCount ?? 8,
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

    const sanctuaryRuntime = {
        ...sanctuaryTemplate,
        storage: [],
        facility: createRuntimeFacilities(initialState.facility ?? []),
        residents: createInitialResidents(safeNumber(initialState.population)),
        food: safeNumber(initialState.food),
        water: safeNumber(initialState.water),
        medicine: safeNumber(initialState.medicine),
        electricity: safeNumber(initialState.electricity),
        scraps: safeNumber(initialState.scraps),
        population: safeNumber(initialState.population),
        morale: safeNumber(initialState.morale),
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
        companions: originTemplate.companion?.map(createNpcEntity) ?? [],
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