import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
    GameState,
    addItemToInventory,
    clamp,
    clampDynamicVitals,
    findItemInInventory,
    generateInstanceId,
    removeItemFromInventory,
    safeDeepClone,
    safeNumber,
} from '../meta';
import type {
    BaseDynamicState,
    Facility,
    FacilityTemplate,
    ItemInstance,
    LogType,
    NeuralLinkState,
    PlayerState,
    Resident,
    Sanctuary,
    SanctuaryEventChange,
    SanctuaryEvent,
    SanctuaryState,
    Vital,
    VitalRecord,
    ZoneDate,
} from '../meta';
import { generateResidentName } from '../constants';
import { AudioService } from '../services';

const asSanctuaryResourceRecord = (
    target: Sanctuary
): Record<keyof SanctuaryState, number> =>
    target as unknown as Record<keyof SanctuaryState, number>;

/**
 * 汇总单个设施的每日产出增量（含负产出）。
 */
const getFacilityDailyProduction = (
    facility: Pick<FacilityTemplate, 'production'>
): Partial<SanctuaryState> => {
    const result: Partial<SanctuaryState> = {};
    const source = facility.production ?? {};
    for (const key of Object.keys(source) as Array<keyof SanctuaryState>) {
        result[key] = safeNumber(source[key]);
    }
    return result;
};

/**
 * 汇总庇护所全部设施的每日产出增量（含负产出）。
 */
export const getSanctuaryDailyProduction = (
    sanctuary: Pick<Sanctuary, 'facility'>
): Partial<SanctuaryState> => {
    const result: Partial<SanctuaryState> = {};
    for (const facility of sanctuary.facility ?? []) {
        const daily = getFacilityDailyProduction(facility);
        for (const key of Object.keys(daily) as Array<keyof SanctuaryState>) {
            result[key] = safeNumber(result[key]) + safeNumber(daily[key]);
        }
    }
    return result;
};

/**
 * 应用设施每日产出（跨 days 天结算）。
 *
 * 产出会真实加减资源；侵蚀度/士气等软性指标被钳制在合法范围内，
 * 硬资源（食物/水/药/电/废料/人口）钳制在 [0, +∞)。
 */
export const applyFacilityDailyProduction = (
    sanctuary: Sanctuary,
    days: number = 1
): Sanctuary => {
    const safeDays = Math.max(0, Math.floor(safeNumber(days, 1)));
    if (safeDays === 0) return sanctuary;

    const daily = getSanctuaryDailyProduction(sanctuary);
    const next = safeDeepClone(sanctuary);
    const record = asSanctuaryResourceRecord(next);

    for (const key of Object.keys(daily) as Array<keyof SanctuaryState>) {
        const delta = Math.floor(safeNumber(daily[key]) * safeDays);
        if (delta === 0) continue;

        if (key === 'morale' || key === 'erosion') {
            record[key] = clamp(safeNumber(record[key]) + delta, 0, 100);
        } else {
            record[key] = Math.max(0, safeNumber(record[key]) + delta);
        }
    }

    return next;
};

/**
 * 设施升级：消耗 scraps、等级 +1。
 *
 * 升级成本与成败判定由 LLM 决定（见 Facility 注释），
 * 本函数只负责状态应用：成功则扣废料并升级，失败则仅扣废料。
 */
export const applyFacilityLevelUp = (
    sanctuary: Sanctuary,
    facilityId: string,
    scrapCost: number,
    success: boolean
): Sanctuary => {
    const cost = Math.max(0, Math.floor(safeNumber(scrapCost, 0)));
    if (cost <= 0) return sanctuary;

    const next = safeDeepClone(sanctuary);
    const record = asSanctuaryResourceRecord(next);
    record.scraps = Math.max(0, safeNumber(record.scraps) - cost);

    if (success) {
        const facility = next.facility?.find((f) => f.id === facilityId);
        if (facility) {
            facility.level = Math.max(0, Math.floor(safeNumber(facility.level, 1)) + 1);
        }
    }

    return next;
};

//=============================================================================
// 6.2 居民系统（运行时）
//=============================================================================

/**
 * 从姓名库（constants/residents）随机生成一个居民（hp/san 落在健康区间）。
 */
const generateRandomResident = (sanctuary?: Pick<Sanctuary, 'residents'>): Resident => {
    const pool = sanctuary?.residents ?? [];
    const usedIds = new Set(pool.map((r) => r.id));
    const usedNames = new Set(pool.map((r) => r.name));

    const name = generateResidentName(usedNames);

    let id = `resident_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    while (usedIds.has(id)) {
        id = `resident_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    }

    return {
        id,
        name,
        hp: 80 + Math.floor(Math.random() * 40),
        san: 55 + Math.floor(Math.random() * 40),
    };
};

const isResidentObject = (entry: unknown): entry is Resident =>
    typeof entry === 'object' && entry !== null && 'id' in entry && 'name' in entry;

/**
 * 按 id 查找居民。
 */
export const getResidentById = (
    sanctuary: Pick<Sanctuary, 'residents'>,
    id: string
): Resident | undefined =>
    (sanctuary.residents ?? []).find((r) => r.id === id);

/**
 * 应用事件造成的居民变化（两形态）：
 *
 * - number：正数 → 随机生成 N 名新居民；负数 → 随机失去 N 名已有居民。
 * - 数组：Resident 对象 → 加入/覆盖；id 字符串 → 移除；
 *   [id, 操作码, 数值] → 1=hp恢复 2=hp消耗 3=san恢复 4=san消耗。
 */
const applyResidentChange = (
    sanctuary: Sanctuary,
    residents: SanctuaryEvent['choices'][number]['stateChange']['residents']
): Sanctuary => {
    if (residents === undefined) return sanctuary;

    const next = safeDeepClone(sanctuary);
    const residentsPool: Resident[] = Array.isArray(next.residents) ? next.residents : [];

    const applyNumber = (delta: number): void => {
        if (!Number.isFinite(delta)) return;

        if (delta > 0) {
            for (let i = 0; i < Math.floor(delta); i++) {
                residentsPool.push(generateRandomResident({ residents: residentsPool }));
            }
        } else {
            const loseCount = Math.min(residentsPool.length, Math.floor(-delta));
            for (let i = 0; i < loseCount; i++) {
                residentsPool.splice(Math.floor(Math.random() * residentsPool.length), 1);
            }
        }
    };

    const applyTuple = (id: string, op: number, value: number): void => {
        const resident = residentsPool.find((r) => r.id === id);
        if (!resident) return;
        const safeValue = Math.max(0, Math.floor(safeNumber(value, 0)));

        switch (op) {
            case 1:
                resident.hp = clamp(safeNumber(resident.hp) + safeValue, 0, 500);
                break;
            case 2:
                resident.hp = clamp(safeNumber(resident.hp) - safeValue, 0, 500);
                break;
            case 3:
                resident.san = clamp(safeNumber(resident.san) + safeValue, 0, 500);
                break;
            case 4:
                resident.san = clamp(safeNumber(resident.san) - safeValue, 0, 500);
                break;
            default:
                break;
        }
    };

    if (typeof residents === 'number') {
        applyNumber(residents);
    } else if (Array.isArray(residents)) {
        for (const entry of residents) {
            if (isResidentObject(entry)) {
                const index = residentsPool.findIndex((r) => r.id === entry.id);
                if (index >= 0) {
                    residentsPool[index] = { ...residentsPool[index], ...entry };
                } else {
                    residentsPool.push({
                        id: entry.id,
                        name: entry.name,
                        hp: clamp(safeNumber(entry.hp, 100), 0, 500),
                        san: clamp(safeNumber(entry.san, 100), 0, 500),
                    });
                }
            } else if (typeof entry === 'string') {
                const index = residentsPool.findIndex((r) => r.id === entry);
                if (index >= 0) residentsPool.splice(index, 1);
            } else if (Array.isArray(entry) && entry.length === 3) {
                applyTuple(entry[0], entry[1], entry[2]);
            }
        }
    }

    next.residents = residentsPool;
    return next;
};

//=============================================================================
// 6.3 庇护所事件（运行时）
//=============================================================================

/**
 * 应用一次庇护所事件抉择（stateChange）。
 *
 * 返回更新后的庇护所与 spawnEnemy 标记（true 表示需要生成敌人突袭）。
 */
export const applySanctuaryEventChoice = (
    sanctuary: Sanctuary,
    stateChange: SanctuaryEventChange
): { sanctuary: Sanctuary; spawnEnemy: boolean } => {
    const next = safeDeepClone(sanctuary);
    const record = asSanctuaryResourceRecord(next);

    const resources: Array<keyof SanctuaryState> = [
        'food',
        'water',
        'medicine',
        'electricity',
        'scraps',
        'population',
        'morale',
        'erosion',
    ];

    for (const key of resources) {
        const delta = safeNumber((stateChange as Record<string, unknown>)[key], 0);
        if (delta === 0) continue;

        if (key === 'morale' || key === 'erosion') {
            record[key] = clamp(safeNumber(record[key]) + delta, 0, 100);
        } else {
            record[key] = Math.max(0, safeNumber(record[key]) + delta);
        }
    }

    const withResidents = applyResidentChange(next, stateChange.residents);
    return {
        sanctuary: withResidents,
        spawnEnemy: stateChange.spawnEnemy === true,
    };
};


const TIME_CONFIG = {
    TICKS_PER_CYCLE: 30,
    CYCLES_PER_DAY: 12,
    TICKS_PER_HOUR: 15,
} as const;

const SANCTUARY_CONFIG = {
    BACKPACK_CAPACITY: 10,
    BASE_STORAGE_CAPACITY: 20,
    STORAGE_CAPACITY_PER_POPULATION: 5,
    MEDICINE_HEAL_VALUE: 15,
    COMPANION_RECOVERY_RATE: 0.8,
    MORALE_MAX: 100,
    MORALE_THRESHOLD: {
        CRITICAL_LOW: 20,
        HIGH: 80,
    },
} as const;

const RESOURCE_EXCHANGE_RATES = {
    food: 2,
    water: 2,
    medicine: 4,
    electricity: 3,
} as const;

type TradableResource = keyof typeof RESOURCE_EXCHANGE_RATES;

const TRADABLE_RESOURCES = Object.keys(RESOURCE_EXCHANGE_RATES) as TradableResource[];

const RESOURCE_LABELS: Record<TradableResource, string> = {
    food: '食物',
    water: '水',
    medicine: '药品',
    electricity: '电力',
};

const REST_CONFIG = {
    MIN_HOURS: 1,
    MAX_HOURS: 24,
    RECOVERY: {
        hp: 0.05,
        sanity: 0.03,
        stamina: 0.08,
        vigor: 0.08,
        battery: 2,
    },
    CONSUMPTION: {
        food: 0.1,
        water: 0.15,
        electricity: 0.05,
    },
    NEURAL_DAMAGE_PER_HOUR: 1,
    MORALE_GAIN_PER_HOUR: 0.5,
    EFFICIENCY_THRESHOLDS: {
        HIGH: 12,
        MEDIUM: 18,
        LOW: 24,
    },
} as const;

export interface CustomRestConfig {
    hours: number;
    hpRecovery: number;
    sanityRecovery: number;
    staminaRecovery: number;
    vigorRecovery: number;
    batteryRecovery: number;
    foodConsumption: number;
    waterConsumption: number;
    electricityConsumption: number;
    neuralDamage: number;
    moraleGain: number;
    efficiency: number;
}

interface UseSanctuaryParams {
    player: PlayerState;
    setPlayer: Dispatch<SetStateAction<PlayerState>>;
    addLog: (text: string, type: LogType) => void;
    gameState: GameState;
}

interface UseSanctuaryReturn {
    getStorageCapacity: () => number;
    getBackpackCapacity: () => number;
    transferItem: (item: ItemInstance, toStorage: boolean, quantity?: number) => void;
    handleRest: (hours: number) => void;
    handleResourceTrade: (target: keyof SanctuaryState, amount: number) => void;
    handleUseMedicine: (amount?: number) => void;
    handleFacilityUpgrade: (facilityId: string, scrapCost: number, success?: boolean) => void;
    handleSanctuaryEvent: (stateChange: SanctuaryEventChange) => boolean;
    getCustomRestConfig: (hours: number) => CustomRestConfig | null;
    morale: number;
    isLowMorale: boolean;
    maxStorage: number;
    backpackCapacity: number;
    facilities: Facility[];
    dailyProduction: Partial<SanctuaryState>;
    residents: Resident[];
}

type StackableItemInstance = Extract<ItemInstance, { type: 'consumable' | 'material' }>;

type RestResources = Pick<SanctuaryState, 'food' | 'water' | 'electricity'>;

type PlanFailure = {
    ok: false;
    message: string;
    info?: boolean;
};

type TransferPlan =
    | PlanFailure
    | {
        ok: true;
        next: PlayerState;
        name: string;
        amount: number;
    };

type RestPlan =
    | PlanFailure
    | {
        ok: true;
        next: PlayerState;
        config: CustomRestConfig;
        daysPassed: number;
    };

type MedicinePlan =
    | PlanFailure
    | {
        ok: true;
        next: PlayerState;
        amount: number;
    };

type TradePlan =
    | PlanFailure
    | {
        ok: true;
        next: PlayerState;
        resource: TradableResource;
        amount: number;
        cost: number;
    };

export const advanceZoneTime = (
    current: ZoneDate,
    timePassed: number,
    dilationFactor: number = 1
): ZoneDate => {
    const baseDay = Math.max(0, Math.floor(safeNumber(current.day)));
    const baseCycle = Math.max(0, Math.floor(safeNumber(current.cycle)));
    const baseTick = Math.max(0, Math.floor(safeNumber(current.tick)));

    const effectiveDelta = Math.max(
        0,
        Math.floor(safeNumber(timePassed) * Math.max(0, safeNumber(dilationFactor, 1)))
    );

    const totalTicks = baseTick + effectiveDelta;
    const tick = totalTicks % TIME_CONFIG.TICKS_PER_CYCLE;
    const extraCycles = Math.floor(totalTicks / TIME_CONFIG.TICKS_PER_CYCLE);

    const totalCycles = baseCycle + extraCycles;
    const cycle = totalCycles % TIME_CONFIG.CYCLES_PER_DAY;
    const day = baseDay + Math.floor(totalCycles / TIME_CONFIG.CYCLES_PER_DAY);

    return {
        day,
        cycle,
        tick,
    };
};

const parsePositiveInt = (value: unknown): number | null => {
    const parsed = safeNumber(value, Number.NaN);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const asResourceRecord = (target: Sanctuary): Record<keyof SanctuaryState, number> =>
    target as unknown as Record<keyof SanctuaryState, number>;

const isTradableResource = (resource: keyof SanctuaryState): resource is TradableResource =>
    (TRADABLE_RESOURCES as readonly string[]).includes(resource);

const isStackableItem = (item: ItemInstance): item is StackableItemInstance =>
    item.type === 'consumable' || item.type === 'material';

const getQuantity = (item: StackableItemInstance): number =>
    Math.max(1, Math.floor(safeNumber(item.quantity, 1)));

const getPopulation = (source: Pick<SanctuaryState, 'population'>): number =>
    Math.max(1, Math.floor(safeNumber(source.population, 1)));

const getOccupantCount = (
    source: Pick<SanctuaryState, 'population'>,
    companionCount: number
): number => {
    const partyCount = 1 + Math.max(0, Math.floor(safeNumber(companionCount)));
    return Math.max(partyCount, getPopulation(source));
};

const calculateStorageCapacity = (source: Pick<SanctuaryState, 'population'>): number => {
    const population = getPopulation(source);
    return (
        SANCTUARY_CONFIG.BASE_STORAGE_CAPACITY +
        (population - 1) * SANCTUARY_CONFIG.STORAGE_CAPACITY_PER_POPULATION
    );
};

const calculateBackpackCapacity = (
    source: Pick<PlayerState['dynamic'], 'strength'>
): number => {
    const strength = Math.max(0, safeNumber(source.strength));
    return SANCTUARY_CONFIG.BACKPACK_CAPACITY + Math.floor(strength / 10);
};

const getRestEfficiency = (hours: number, morale: number): number => {
    let efficiency = 1;

    if (hours >= REST_CONFIG.EFFICIENCY_THRESHOLDS.LOW) {
        efficiency = 0.6;
    } else if (hours >= REST_CONFIG.EFFICIENCY_THRESHOLDS.MEDIUM) {
        efficiency = 0.8;
    } else if (hours >= REST_CONFIG.EFFICIENCY_THRESHOLDS.HIGH) {
        efficiency = 0.9;
    }

    const safeMorale = safeNumber(morale);
    if (safeMorale >= SANCTUARY_CONFIG.MORALE_THRESHOLD.HIGH) {
        efficiency += 0.1;
    } else if (safeMorale < SANCTUARY_CONFIG.MORALE_THRESHOLD.CRITICAL_LOW) {
        efficiency -= 0.2;
    }

    return clamp(efficiency, 0.1, 1);
};

const calculateCustomRestConfig = (
    hours: number,
    population: number,
    morale: number
): CustomRestConfig => {
    const safeHours = Math.max(0, Math.floor(safeNumber(hours)));
    const safePopulation = Math.max(1, Math.floor(safeNumber(population, 1)));
    const efficiency = getRestEfficiency(safeHours, morale);

    const hpRecovery = safeHours * REST_CONFIG.RECOVERY.hp * efficiency;
    const sanityRecovery = safeHours * REST_CONFIG.RECOVERY.sanity * efficiency;
    const staminaRecovery = safeHours * REST_CONFIG.RECOVERY.stamina * efficiency;
    const vigorRecovery = safeHours * REST_CONFIG.RECOVERY.vigor * efficiency;
    const batteryRecovery = safeHours * REST_CONFIG.RECOVERY.battery * efficiency;

    const foodConsumption = safeHours * REST_CONFIG.CONSUMPTION.food * safePopulation;
    const waterConsumption = safeHours * REST_CONFIG.CONSUMPTION.water * safePopulation;
    const electricityConsumption =
        safeHours * REST_CONFIG.CONSUMPTION.electricity * safePopulation;

    const neuralDamage = safeHours * REST_CONFIG.NEURAL_DAMAGE_PER_HOUR;
    const moraleGain = Math.floor(safeHours * REST_CONFIG.MORALE_GAIN_PER_HOUR * efficiency);

    return {
        hours: safeHours,
        hpRecovery,
        sanityRecovery,
        staminaRecovery,
        vigorRecovery,
        batteryRecovery,
        foodConsumption,
        waterConsumption,
        electricityConsumption,
        neuralDamage,
        moraleGain,
        efficiency,
    };
};

const validateRestResources = (
    config: CustomRestConfig,
    resources: RestResources
): { isValid: boolean; missingResources: string[] } => {
    const missingResources: string[] = [];

    if (safeNumber(resources.food) < config.foodConsumption) {
        missingResources.push(`食物 ${config.foodConsumption.toFixed(1)} 单位`);
    }

    if (safeNumber(resources.water) < config.waterConsumption) {
        missingResources.push(`水 ${config.waterConsumption.toFixed(1)} 单位`);
    }

    if (safeNumber(resources.electricity) < config.electricityConsumption) {
        missingResources.push(`电力 ${config.electricityConsumption.toFixed(1)} 单位`);
    }

    return {
        isValid: missingResources.length === 0,
        missingResources,
    };
};

const snapshotVital = (dynamic: BaseDynamicState): Vital => ({
    maxHp: safeNumber(dynamic.maxHp),
    maxSanity: safeNumber(dynamic.maxSanity),
    maxStamina: safeNumber(dynamic.maxStamina),
    maxVigor: safeNumber(dynamic.maxVigor),
});

const createNextVitalRecord = (
    state: PlayerState,
    tick: number,
    dynamic: PlayerState['dynamic']
): VitalRecord => {
    const previousCurrent = state.vitalRecord?.currentVital ?? {
        currentTick: safeNumber(state.currentGameRound.absoluteTick),
        currentVital: snapshotVital(state.dynamic),
    };

    return {
        prevVital: {
            prevTick: previousCurrent.currentTick,
            prevVital: previousCurrent.currentVital,
        },
        currentVital: {
            currentTick: tick,
            currentVital: snapshotVital(dynamic),
        },
    };
};

const adjustSanctuaryResources = (
    sanctuary: Sanctuary,
    deltas: Partial<Record<keyof SanctuaryState, number>>
): Sanctuary => {
    const next: Sanctuary = { ...sanctuary };
    const record = asResourceRecord(next);

    for (const key of Object.keys(deltas) as Array<keyof SanctuaryState>) {
        const delta = deltas[key];
        if (delta === undefined) continue;
        record[key] = Math.max(0, safeNumber(record[key]) + safeNumber(delta));
    }

    return next;
};

const adjustNeuralLink = (
    neuralLink: NeuralLinkState,
    batteryDelta: number,
    integrityDelta: number
): NeuralLinkState => ({
    ...neuralLink,
    battery: clamp(
        safeNumber(neuralLink.battery) + safeNumber(batteryDelta),
        0,
        safeNumber(neuralLink.maxBattery)
    ),
    integrity: clamp(
        safeNumber(neuralLink.integrity) + safeNumber(integrityDelta),
        0,
        safeNumber(neuralLink.maxIntegrity)
    ),
});

const recoverDynamic = <T extends BaseDynamicState>(
    dynamic: T,
    config: CustomRestConfig,
    rate: number
): T => {
    const next = { ...dynamic } as T;

    next.hp = safeNumber(next.hp) + safeNumber(next.maxHp) * config.hpRecovery * rate;
    next.sanity =
        safeNumber(next.sanity) + safeNumber(next.maxSanity) * config.sanityRecovery * rate;
    next.stamina =
        safeNumber(next.stamina) + safeNumber(next.maxStamina) * config.staminaRecovery * rate;
    next.vigor =
        safeNumber(next.vigor) + safeNumber(next.maxVigor) * config.vigorRecovery * rate;

    clampDynamicVitals(next);
    return next;
};

const resolveTransferQuantity = (item: ItemInstance, quantity?: number): number => {
    if (!isStackableItem(item)) return 1;

    const owned = getQuantity(item);
    if (quantity === undefined) return owned;

    return clamp(Math.floor(safeNumber(quantity, owned)), 1, owned);
};

const createTransferItem = (
    source: ItemInstance,
    amount: number,
    target: ItemInstance[]
): ItemInstance => {
    if (!isStackableItem(source)) {
        return { ...source } as ItemInstance;
    }

    const sourceQuantity = getQuantity(source);
    const hasTargetStack = target.some(
        (entry) => entry.id === source.id && entry.type === source.type
    );

    const moved = { ...source, quantity: amount } as ItemInstance;

    if (amount < sourceQuantity && !hasTargetStack) {
        return { ...moved, instanceId: generateInstanceId('item') } as ItemInstance;
    }

    return moved;
};

const createTransferPlan = (
    state: PlayerState,
    instanceId: string,
    toStorage: boolean,
    requested?: number
): TransferPlan => {
    if (requested !== undefined && (!Number.isInteger(requested) || requested <= 0)) {
        return {
            ok: false,
            message: '转移数量必须为正整数。',
        };
    }

    const source = toStorage ? state.dynamic.inventory : state.sanctuary.storage;
    const sourceItem = findItemInInventory(source, instanceId);

    if (!sourceItem) {
        return {
            ok: false,
            message: toStorage ? '物品不存在于背包中。' : '物品不存在于仓库中。',
        };
    }

    if (requested !== undefined && !isStackableItem(sourceItem) && requested > 1) {
        return {
            ok: false,
            message: '该物品不可拆分。',
        };
    }

    const amount = resolveTransferQuantity(sourceItem, requested);
    const target = toStorage ? state.sanctuary.storage : state.dynamic.inventory;
    const movedItem = createTransferItem(sourceItem, amount, target);
    const nextTarget = addItemToInventory(target, movedItem);

    const capacity = toStorage
        ? calculateStorageCapacity(state.sanctuary)
        : calculateBackpackCapacity(state.dynamic);

    if (nextTarget.length > capacity) {
        return {
            ok: false,
            message: toStorage
                ? `仓库已满 (${nextTarget.length}/${capacity})。`
                : `背包已满 (${nextTarget.length}/${capacity})。`,
        };
    }

    const nextSource = removeItemFromInventory(source, sourceItem.instanceId, amount);

    if (toStorage) {
        return {
            ok: true,
            next: {
                ...state,
                dynamic: {
                    ...state.dynamic,
                    inventory: nextSource,
                },
                sanctuary: {
                    ...state.sanctuary,
                    storage: nextTarget,
                },
            },
            name: sourceItem.name,
            amount,
        };
    }

    return {
        ok: true,
        next: {
            ...state,
            dynamic: {
                ...state.dynamic,
                inventory: nextTarget,
            },
            sanctuary: {
                ...state.sanctuary,
                storage: nextSource,
            },
        },
        name: sourceItem.name,
        amount,
    };
};

const createRestPlan = (state: PlayerState, hours: number): RestPlan => {
    const safeHours = Math.floor(safeNumber(hours));

    if (safeHours < REST_CONFIG.MIN_HOURS || safeHours > REST_CONFIG.MAX_HOURS) {
        return {
            ok: false,
            message: `休息时间必须在 ${REST_CONFIG.MIN_HOURS}-${REST_CONFIG.MAX_HOURS} 小时之间。`,
        };
    }

    const occupantCount = getOccupantCount(state.sanctuary, state.companions?.length ?? 0);
    const config = calculateCustomRestConfig(
        safeHours,
        occupantCount,
        safeNumber(state.sanctuary.morale)
    );

    const validation = validateRestResources(config, state.sanctuary);
    if (!validation.isValid) {
        return {
            ok: false,
            message: `资源不足，无法开始休息。缺少：${validation.missingResources.join('、')}`,
        };
    }

    const timePassed = safeHours * TIME_CONFIG.TICKS_PER_HOUR;
    const dilationFactor = Math.max(0, safeNumber(state.sanctuary.dilationFactor, 1));

    const nextZoneTime = advanceZoneTime(state.currentZoneTime, timePassed, dilationFactor);
    const nextAbsoluteTick = Math.max(
        0,
        safeNumber(state.currentGameRound.absoluteTick) + timePassed
    );

    const nextDynamic = recoverDynamic(state.dynamic, config, 1);

    const companions = state.companions ?? [];
    const nextCompanions = companions.map((companion) => ({
        ...companion,
        dynamic: recoverDynamic(
            companion.dynamic,
            config,
            SANCTUARY_CONFIG.COMPANION_RECOVERY_RATE
        ),
    }));

    const nextNeuralLink = adjustNeuralLink(
        state.neuralLink,
        config.batteryRecovery,
        -config.neuralDamage
    );

    const nextSanctuaryBase = adjustSanctuaryResources(state.sanctuary, {
        food: -config.foodConsumption,
        water: -config.waterConsumption,
        electricity: -config.electricityConsumption,
        morale: config.moraleGain,
    });

    const nextSanctuary: Sanctuary = {
        ...nextSanctuaryBase,
        morale: clamp(
            safeNumber(nextSanctuaryBase.morale),
            0,
            SANCTUARY_CONFIG.MORALE_MAX
        ),
    };

    // 跨天结算：设施每日产出按经过的天数累加。
    const daysPassed = Math.max(0, nextZoneTime.day - safeNumber(state.currentZoneTime.day));
    const withFacilityProduction =
        daysPassed > 0
            ? applyFacilityDailyProduction(nextSanctuary, daysPassed)
            : nextSanctuary;

    return {
        ok: true,
        next: {
            ...state,
            dynamic: nextDynamic,
            companions: nextCompanions,
            neuralLink: nextNeuralLink,
            sanctuary: withFacilityProduction,
            currentZoneTime: nextZoneTime,
            currentGameRound: {
                ...state.currentGameRound,
                absoluteTick: nextAbsoluteTick,
                combatTurn: 0,
            },
            vitalRecord: createNextVitalRecord(state, nextAbsoluteTick, nextDynamic),
        },
        config,
        daysPassed,
    };
};

const createMedicinePlan = (state: PlayerState, amount: number): MedicinePlan => {
    const safeAmount = parsePositiveInt(amount);

    if (safeAmount === null) {
        return {
            ok: false,
            message: '药品数量必须为正整数。',
        };
    }

    const missingHp = Math.max(
        0,
        safeNumber(state.dynamic.maxHp) - safeNumber(state.dynamic.hp)
    );

    if (missingHp <= 0) {
        return {
            ok: false,
            message: '生命值已满，无需使用药品。',
            info: true,
        };
    }

    const effectiveAmount = Math.min(
        safeAmount,
        Math.ceil(missingHp / SANCTUARY_CONFIG.MEDICINE_HEAL_VALUE)
    );

    if (safeNumber(state.sanctuary.medicine) < effectiveAmount) {
        return {
            ok: false,
            message: '庇护所药品储备不足。',
        };
    }

    const nextDynamic = { ...state.dynamic };
    nextDynamic.hp =
        safeNumber(nextDynamic.hp) +
        effectiveAmount * SANCTUARY_CONFIG.MEDICINE_HEAL_VALUE;
    clampDynamicVitals(nextDynamic);

    const nextSanctuary = adjustSanctuaryResources(state.sanctuary, {
        medicine: -effectiveAmount,
    });

    return {
        ok: true,
        next: {
            ...state,
            dynamic: nextDynamic,
            sanctuary: nextSanctuary,
        },
        amount: effectiveAmount,
    };
};

const createTradePlan = (
    state: PlayerState,
    target: keyof SanctuaryState,
    amount: number
): TradePlan => {
    if (!isTradableResource(target)) {
        return {
            ok: false,
            message: '该目标不支持物资兑换。',
        };
    }

    const safeAmount = parsePositiveInt(amount);
    if (safeAmount === null) {
        return {
            ok: false,
            message: '兑换数量必须为正整数。',
        };
    }

    const rate = RESOURCE_EXCHANGE_RATES[target];
    const cost = safeAmount * rate;

    if (safeNumber(state.sanctuary.scraps) < cost) {
        return {
            ok: false,
            message: `碎片不足，无法兑换 ${safeAmount} 单位${RESOURCE_LABELS[target]}。`,
        };
    }

    const deltas: Partial<Record<keyof SanctuaryState, number>> = {
        scraps: -cost,
    };
    deltas[target] = safeAmount;

    return {
        ok: true,
        next: {
            ...state,
            sanctuary: adjustSanctuaryResources(state.sanctuary, deltas),
        },
        resource: target,
        amount: safeAmount,
        cost,
    };
};

export const useSanctuary = ({
    player,
    setPlayer,
    addLog,
    gameState,
}: UseSanctuaryParams): UseSanctuaryReturn => {
    const lastMoraleStateRef = useRef<'low' | 'high' | null>(null);

    const morale = useMemo(() => safeNumber(player.sanctuary.morale), [
        player.sanctuary.morale,
    ]);

    const isLowMorale = useMemo(
        () => morale < SANCTUARY_CONFIG.MORALE_THRESHOLD.CRITICAL_LOW,
        [morale]
    );

    const storageCapacity = useMemo(
        () => calculateStorageCapacity(player.sanctuary),
        [player.sanctuary.population]
    );

    const backpackCapacity = useMemo(
        () => calculateBackpackCapacity(player.dynamic),
        [player.dynamic.strength]
    );

    useEffect(() => {
        if (gameState !== GameState.SANCTUARY) {
            lastMoraleStateRef.current = null;
            return;
        }

        const nextState =
            morale < SANCTUARY_CONFIG.MORALE_THRESHOLD.CRITICAL_LOW
                ? 'low'
                : morale > SANCTUARY_CONFIG.MORALE_THRESHOLD.HIGH
                    ? 'high'
                    : null;

        if (nextState === lastMoraleStateRef.current) return;

        lastMoraleStateRef.current = nextState;

        if (nextState === 'low') {
            addLog('警告：庇护所士气极低，同伴可能会离开。', 'warning');
        } else if (nextState === 'high') {
            addLog('庇护所士气高昂，各项效率提升。', 'success');
        }
    }, [gameState, morale, addLog]);

    const getStorageCapacity = useCallback((): number => storageCapacity, [storageCapacity]);

    const getBackpackCapacity = useCallback((): number => backpackCapacity, [
        backpackCapacity,
    ]);

    const transferItem = useCallback(
        (item: ItemInstance, toStorage: boolean, quantity?: number) => {
            if (gameState !== GameState.SANCTUARY) {
                addLog('只能在庇护所中整理物资。', 'warning');
                AudioService.playSfx('error');
                return;
            }

            let requestedQuantity: number | undefined;
            if (quantity !== undefined) {
                requestedQuantity = parsePositiveInt(quantity) ?? undefined;
                if (requestedQuantity === undefined) {
                    addLog('转移数量必须为正整数。', 'warning');
                    AudioService.playSfx('error');
                    return;
                }
            }

            const plan = createTransferPlan(
                player,
                item.instanceId,
                toStorage,
                requestedQuantity
            );

            if (!plan.ok) {
                addLog(plan.message, 'warning');
                AudioService.playSfx('error');
                return;
            }

            setPlayer((prev) => {
                const replan = createTransferPlan(
                    prev,
                    item.instanceId,
                    toStorage,
                    requestedQuantity
                );
                return replan.ok ? replan.next : prev;
            });

            const quantityText = plan.amount > 1 ? ` x${plan.amount}` : '';

            AudioService.playSfx(toStorage ? 'ui_click' : 'item_pickup');
            addLog(
                toStorage
                    ? `存入仓库: ${plan.name}${quantityText}`
                    : `取出物品: ${plan.name}${quantityText}`,
                'info'
            );
        },
        [gameState, player, addLog, setPlayer]
    );

    const handleRest = useCallback(
        (hours: number) => {
            if (gameState !== GameState.SANCTUARY) {
                addLog('只能在庇护所中休息。', 'warning');
                AudioService.playSfx('error');
                return;
            }

            const plan = createRestPlan(player, hours);

            if (!plan.ok) {
                addLog(plan.message, 'warning');
                AudioService.playSfx('error');
                return;
            }

            setPlayer((prev) => {
                const replan = createRestPlan(prev, hours);
                return replan.ok ? replan.next : prev;
            });

            const productionText = plan.daysPassed > 0
                ? `，设施结算 ${plan.daysPassed} 天产出`
                : '';

            addLog(
                `完成 ${plan.config.hours} 小时休息，消耗食物 ${plan.config.foodConsumption.toFixed(
                    1
                )}、水 ${plan.config.waterConsumption.toFixed(
                    1
                )}、电力 ${plan.config.electricityConsumption.toFixed(1)}${productionText}。`,
                'event'
            );
            AudioService.playSfx('success');
        },
        [gameState, player, addLog, setPlayer]
    );

    const handleUseMedicine = useCallback(
        (amount: number = 1) => {
            if (gameState !== GameState.SANCTUARY) {
                addLog('只能在庇护所中使用药品。', 'warning');
                AudioService.playSfx('error');
                return;
            }

            const plan = createMedicinePlan(player, amount);

            if (!plan.ok) {
                addLog(plan.message, plan.info ? 'info' : 'warning');
                AudioService.playSfx(plan.info ? 'ui_click' : 'error');
                return;
            }

            setPlayer((prev) => {
                const replan = createMedicinePlan(prev, amount);
                return replan.ok ? replan.next : prev;
            });

            addLog(`消耗 ${plan.amount} 单位药品。生命体征已部分修复。`, 'success');
            AudioService.playSfx('success');
        },
        [gameState, player, addLog, setPlayer]
    );

    const handleResourceTrade = useCallback(
        (target: keyof SanctuaryState, amount: number) => {
            if (gameState !== GameState.SANCTUARY) {
                addLog('只能在庇护所中进行物资兑换。', 'warning');
                AudioService.playSfx('error');
                return;
            }

            const plan = createTradePlan(player, target, amount);

            if (!plan.ok) {
                addLog(plan.message, 'warning');
                AudioService.playSfx('error');
                return;
            }

            setPlayer((prev) => {
                const replan = createTradePlan(prev, target, amount);
                return replan.ok ? replan.next : prev;
            });

            addLog(
                `消耗 ${plan.cost} 碎片兑换了 ${plan.amount} 单位${RESOURCE_LABELS[plan.resource]
                }。`,
                'info'
            );
            AudioService.playSfx('ui_click');
        },
        [gameState, player, addLog, setPlayer]
    );

    const getCustomRestConfig = useCallback(
        (hours: number): CustomRestConfig | null => {
            const safeHours = Math.floor(safeNumber(hours));

            if (safeHours < REST_CONFIG.MIN_HOURS || safeHours > REST_CONFIG.MAX_HOURS) {
                return null;
            }

            const occupantCount = getOccupantCount(
                player.sanctuary,
                player.companions?.length ?? 0
            );

            return calculateCustomRestConfig(safeHours, occupantCount, morale);
        },
        [player.sanctuary, player.companions?.length, morale]
    );

    const facilities = useMemo(
        () => (player.sanctuary?.facility ?? []) as Facility[],
        [player.sanctuary]
    );

    const dailyProduction = useMemo(
        () => getSanctuaryDailyProduction(player.sanctuary),
        [player.sanctuary]
    );

    const residents = useMemo(
        () => (player.sanctuary?.residents ?? []) as Resident[],
        [player.sanctuary]
    );

    /**
     * 设施升级：扣 scraps、设施等级 +1。
     *
     * - scrapCost 由调用方（LLM 定价）传入；
     * - success 缺省按 90% 基础成功率判定；其余交给引擎/UI 预案。
     */
    const handleFacilityUpgrade = useCallback(
        (facilityId: string, scrapCost: number, success?: boolean) => {
            if (gameState !== GameState.SANCTUARY) {
                addLog('只能在庇护所中升级设施。', 'warning');
                AudioService.playSfx('error');
                return;
            }

            const facility = player.sanctuary?.facility?.find((f) => f.id === facilityId);
            if (!facility) {
                addLog('未找到该设施。', 'warning');
                AudioService.playSfx('error');
                return;
            }

            const cost = Math.max(0, Math.floor(safeNumber(scrapCost, 0)));
            if (cost <= 0) {
                addLog('升级消耗必须为正数。', 'warning');
                AudioService.playSfx('error');
                return;
            }

            if (safeNumber(player.sanctuary.scraps) < cost) {
                addLog('废料不足，无法升级设施。', 'warning');
                AudioService.playSfx('error');
                return;
            }

            const successFlag = success ?? Math.random() < 0.9;

            setPlayer((prev) => ({
                ...prev,
                sanctuary: applyFacilityLevelUp(
                    prev.sanctuary,
                    facilityId,
                    cost,
                    successFlag
                ),
            }));

            addLog(
                successFlag
                    ? `设施 [${facility.name}] 升级成功！当前等级 ${facility.level + 1}，消耗 ${cost} 废料。`
                    : `设施 [${facility.name}] 升级失败，消耗了 ${cost} 废料。`,
                successFlag ? 'success' : 'warning'
            );
            AudioService.playSfx(successFlag ? 'success' : 'error');
        },
        [gameState, player.sanctuary, addLog, setPlayer]
    );

    /**
     * 应用一次庇护所事件抉择（stateChange）。
     *
     * 返回 true 表示该抉择触发了敌人突袭（spawnEnemy），
     * 由上层决定如何生成敌人。
     */
    const handleSanctuaryEvent = useCallback(
        (stateChange: SanctuaryEventChange): boolean => {
            if (gameState !== GameState.SANCTUARY) {
                addLog('只能在庇护所中处理事件。', 'warning');
                return false;
            }

            const { sanctuary: nextSanctuary, spawnEnemy } = applySanctuaryEventChoice(
                player.sanctuary,
                stateChange
            );

            setPlayer((prev) => ({
                ...prev,
                sanctuary: nextSanctuary,
            }));

            return spawnEnemy;
        },
        [gameState, player.sanctuary, addLog, setPlayer]
    );

    return {
        getStorageCapacity,
        getBackpackCapacity,
        transferItem,
        handleRest,
        handleResourceTrade,
        handleUseMedicine,
        handleFacilityUpgrade,
        handleSanctuaryEvent,
        getCustomRestConfig,
        morale,
        isLowMorale,
        maxStorage: storageCapacity,
        backpackCapacity,
        facilities,
        dailyProduction,
        residents,
    };
};