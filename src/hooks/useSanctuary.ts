import { useCallback, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
    GameState,
    addItemToInventory,
    applySanctuaryResourceDeltas,
    clamp,
    clampDynamicVitals,
    findItemInInventory,
    findUniqueResource,
    getSanctuaryResourceValue,
    generateInstanceId,
    removeItemFromInventory,
    safeDeepClone,
    safeNumber,
} from '../meta';
import type {
    BaseDynamicState,
    ChoiceImpact,
    Facility,
    FacilityTemplate,
    ItemInstance,
    LogType,
    NecessaryResource,
    NeuralLinkState,
    PlayerState,
    Resident,
    Sanctuary,
    Vital,
    VitalRecord,
    ZoneDate,
} from '../meta';
import { generateResidentName } from '../constants';
import { AudioService } from '../services';

/** 侵蚀度上限：契约中它是庇护所的顶层比例读数。 */
const SANCTUARY_EROSION_MAX = 100;

/**
 * 必要资源（food / water）每人每天的消耗量。
 *
 * 契约中必要资源只声明数量、不携带 consumptionRate，故日常消耗速率由引擎配平。
 */
export const NECESSARY_RESOURCE_CONSUMPTION_PER_DAY: NecessaryResource = {
    food: 0.2,
    water: 0.3,
};

/** 必要资源的显示名：契约未给必要资源名称字段，由引擎固定。 */
const NECESSARY_RESOURCE_LABELS: Record<keyof NecessaryResource, string> = {
    food: '食物',
    water: '饮水',
};

/**
 * 结算一组「资源键 → 增量」变化（原地修改）。
 *
 * - `food` / `water` 落到 necessaryResource；
 * - 其余键按 id 落到 uniqueResource，未声明的资源被忽略；
 * - erosion 是契约中庇护所的顶层字段、不属于资源，故单独取出结算。
 */
const applySanctuaryChanges = (
    sanctuary: Sanctuary,
    changes: Record<string, number> | undefined
): void => {
    if (!changes) return;

    const { erosion, ...resourceDeltas } = changes;
    applySanctuaryResourceDeltas(sanctuary, resourceDeltas);

    if (erosion !== undefined) {
        sanctuary.erosion = clamp(
            safeNumber(sanctuary.erosion) + safeNumber(erosion),
            0,
            SANCTUARY_EROSION_MAX
        );
    }
};

/**
 * 汇总单个设施的每日产出增量（含负产出）。
 *
 * 键为庇护所资源 id（或顶层字段 erosion）；庇护所未声明的 id 会在结算时被忽略。
 */
const getFacilityDailyProduction = (
    facility: Pick<FacilityTemplate, 'function'>
): Record<string, number> => {
    const result: Record<string, number> = {};
    for (const [key, value] of Object.entries(facility.function)) {
        result[key] = safeNumber(value);
    }
    return result;
};

/**
 * 汇总庇护所全部设施的每日产出增量（含负产出）。
 */
export const getSanctuaryDailyProduction = (
    sanctuary: Pick<Sanctuary, 'facility'>
): Record<string, number> => {
    const result: Record<string, number> = {};
    for (const facility of sanctuary.facility) {
        const daily = getFacilityDailyProduction(facility);
        for (const [key, value] of Object.entries(daily)) {
            result[key] = safeNumber(result[key]) + safeNumber(value);
        }
    }
    return result;
};

/**
 * 应用设施每日产出（跨 days 天结算）。
 *
 * 资源数量钳制在 [0, +∞)，侵蚀度钳制在 [0, 100]。
 * 庇护所未声明的资源不受影响。
 */
export const applyFacilityDailyProduction = (
    sanctuary: Sanctuary,
    days: number = 1
): Sanctuary => {
    const safeDays = Math.max(0, Math.floor(safeNumber(days, 1)));
    if (safeDays === 0) return sanctuary;

    const daily = getSanctuaryDailyProduction(sanctuary);
    const next = safeDeepClone(sanctuary);

    const changes: Record<string, number> = {};
    for (const [key, value] of Object.entries(daily)) {
        const delta = Math.floor(safeNumber(value) * safeDays);
        if (delta === 0) continue;
        changes[key] = delta;
    }

    applySanctuaryChanges(next, changes);
    return next;
};

/**
 * 设施升级的支付代价。
 *
 * 契约允许任意一种资源充当升级货币，故代价需同时给出资源键与数量。
 */
export interface FacilityUpgradePayment {
    /** 资源键：`food` / `water` 或独特资源 id */
    resourceId: string;
    /** 支付数量 */
    amount: number;
}

/**
 * 设施升级：按代价扣除对应资源、设施等级 +1。
 *
 * 升级代价与成败判定由 LLM 决定（见 Facility 注释），
 * 本函数只负责状态应用：成功则扣资源并升级，失败则仅扣资源。
 */
export const applyFacilityLevelUp = (
    sanctuary: Sanctuary,
    facilityId: string,
    payment: FacilityUpgradePayment,
    success: boolean
): Sanctuary => {
    const amount = Math.max(0, Math.floor(safeNumber(payment.amount, 0)));
    if (amount <= 0) return sanctuary;

    const next = safeDeepClone(sanctuary);
    applySanctuaryResourceDeltas(next, { [payment.resourceId]: -amount });

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
    residents: ChoiceImpact['residents']
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
    // 人口与在册居民池绑定：人口即居民池规模。
    next.population = residentsPool.length;
    return next;
};

//=============================================================================
// 6.3 庇护所事件（运行时）
//=============================================================================

/**
 * 应用一次庇护所事件抉择（impact）。
 *
 * impact.resource 的键为庇护所资源 id，未声明的 id 会被忽略；
 * impact.erosion 作用于庇护所顶层侵蚀度。
 *
 * @returns 更新后的庇护所，以及本次抉择需要抽取的敌人数量（0 表示不触发突袭）
 */
export const applySanctuaryEventChoice = (
    sanctuary: Sanctuary,
    impact: ChoiceImpact
): { sanctuary: Sanctuary; spawnEnemyCount: number } => {
    const next = safeDeepClone(sanctuary);

    const changes: Record<string, number> = { ...impact.resource };
    if (impact.erosion !== undefined) {
        changes.erosion = impact.erosion;
    }
    applySanctuaryChanges(next, changes);

    const withResidents = applyResidentChange(next, impact.residents);
    return {
        sanctuary: withResidents,
        spawnEnemyCount: Math.max(0, Math.floor(safeNumber(impact.spawnEnemy))),
    };
};


const TIME_CONFIG = {
    TICKS_PER_CYCLE: 30,
    CYCLES_PER_DAY: 12,
    TICKS_PER_HOUR: 15,
} as const;

const SANCTUARY_CONFIG = {
    COMPANION_RECOVERY_RATE: 0.8,
} as const;

/** 一天的小时数：资源消耗速率以「每人每天」为单位，休息按小时折算到天。 */
const HOURS_PER_DAY = 24;

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
    NEURAL_DAMAGE_PER_HOUR: 1,
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
    /** 休息期间按人口消耗的庇护所资源，键为资源 id。 */
    consumption: Record<string, number>;
    neuralDamage: number;
    efficiency: number;
}

interface UseSanctuaryParams {
    player: PlayerState;
    setPlayer: Dispatch<SetStateAction<PlayerState>>;
    addLog: (text: string, type: LogType) => void;
    gameState: GameState;
}

interface UseSanctuaryReturn {
    transferItem: (item: ItemInstance, toStorage: boolean, quantity?: number) => void;
    handleRest: (hours: number) => void;
    handleFacilityUpgrade: (facilityId: string, payment: FacilityUpgradePayment, success?: boolean) => void;
    handleSanctuaryEvent: (impact: ChoiceImpact) => number;
    getCustomRestConfig: (hours: number) => CustomRestConfig | null;
    facilities: Facility[];
    dailyProduction: Record<string, number>;
    residents: Resident[];
}

type StackableItemInstance = Extract<ItemInstance, { type: 'consumable' | 'material' }>;

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

const isStackableItem = (item: ItemInstance): item is StackableItemInstance =>
    item.type === 'consumable' || item.type === 'material';

const getQuantity = (item: StackableItemInstance): number =>
    Math.max(1, Math.floor(safeNumber(item.quantity, 1)));

/** 读取庇护所人口（与在册居民池绑定的引擎读数）。 */
const getPopulation = (source: Pick<Sanctuary, 'population'>): number =>
    Math.max(1, Math.floor(safeNumber(source.population, 1)));

const getOccupantCount = (
    source: Pick<Sanctuary, 'population'>,
    companionCount: number
): number => {
    const partyCount = 1 + Math.max(0, Math.floor(safeNumber(companionCount)));
    return Math.max(partyCount, getPopulation(source));
};

/** 取资源显示名：必要资源用引擎标签，独特资源用其自身声明，未知键退回键名。 */
const getResourceName = (sanctuary: Sanctuary, key: string): string => {
    if (key === 'food' || key === 'water') return NECESSARY_RESOURCE_LABELS[key];
    return findUniqueResource(sanctuary.uniqueResource, key)?.name ?? key;
};

/** 休息效率：仅由休息时长决定，时间越长效率越低。 */
const getRestEfficiency = (hours: number): number => {
    if (hours >= REST_CONFIG.EFFICIENCY_THRESHOLDS.LOW) return 0.6;
    if (hours >= REST_CONFIG.EFFICIENCY_THRESHOLDS.MEDIUM) return 0.8;
    if (hours >= REST_CONFIG.EFFICIENCY_THRESHOLDS.HIGH) return 0.9;
    return 1;
};

const calculateCustomRestConfig = (
    hours: number,
    population: number,
    sanctuary: Pick<Sanctuary, 'uniqueResource'>
): CustomRestConfig => {
    const safeHours = Math.max(0, Math.floor(safeNumber(hours)));
    const safePopulation = Math.max(1, Math.floor(safeNumber(population, 1)));
    const efficiency = getRestEfficiency(safeHours);

    const hpRecovery = safeHours * REST_CONFIG.RECOVERY.hp * efficiency;
    const sanityRecovery = safeHours * REST_CONFIG.RECOVERY.sanity * efficiency;
    const staminaRecovery = safeHours * REST_CONFIG.RECOVERY.stamina * efficiency;
    const vigorRecovery = safeHours * REST_CONFIG.RECOVERY.vigor * efficiency;
    const batteryRecovery = safeHours * REST_CONFIG.RECOVERY.battery * efficiency;

    // 消耗量按「每人每天」折算到本次休息时长：必要资源用引擎配平速率，独特资源用各自声明的速率。
    const restDays = safeHours / HOURS_PER_DAY;
    const consumption: Record<string, number> = {};
    for (const [key, ratePerDay] of Object.entries(NECESSARY_RESOURCE_CONSUMPTION_PER_DAY)) {
        consumption[key] = ratePerDay * safePopulation * restDays;
    }
    for (const entry of sanctuary.uniqueResource) {
        const rate = safeNumber(entry.consumptionRate);
        if (rate <= 0) continue;
        consumption[entry.id] = rate * safePopulation * restDays;
    }

    const neuralDamage = safeHours * REST_CONFIG.NEURAL_DAMAGE_PER_HOUR;

    return {
        hours: safeHours,
        hpRecovery,
        sanityRecovery,
        staminaRecovery,
        vigorRecovery,
        batteryRecovery,
        consumption,
        neuralDamage,
        efficiency,
    };
};

/**
 * 校验休息所需资源是否充足。
 *
 * 只校验本庇护所声明过的资源：没有这项资源就不构成消耗，也不会阻塞休息。
 */
const validateRestResources = (
    config: CustomRestConfig,
    sanctuary: Sanctuary
): { isValid: boolean; missingResources: string[] } => {
    const missingResources: string[] = [];

    for (const [key, required] of Object.entries(config.consumption)) {
        if (getSanctuaryResourceValue(sanctuary, key) < required) {
            missingResources.push(`${getResourceName(sanctuary, key)} ${required.toFixed(1)} 单位`);
        }
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

/**
 * 返回应用资源增量后的庇护所副本。
 *
 * 键为资源 id（erosion 为顶层字段），未在庇护所中声明的资源 id 会被忽略。
 */
const adjustSanctuaryResources = (
    sanctuary: Sanctuary,
    changes: Record<string, number>
): Sanctuary => {
    const next = safeDeepClone(sanctuary);
    applySanctuaryChanges(next, changes);
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

    // 仓库无容量上限，存入不设门槛；取出的背包容纳性由格子背包在组合层拦截
    // （见 hooks/index.ts → transferItem），此处不做件数判定。
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
    const config = calculateCustomRestConfig(safeHours, occupantCount, state.sanctuary);

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

    const restChanges: Record<string, number> = {};
    for (const [key, amount] of Object.entries(config.consumption)) {
        restChanges[key] = -amount;
    }

    const nextSanctuary = adjustSanctuaryResources(state.sanctuary, restChanges);

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

export const useSanctuary = ({
    player,
    setPlayer,
    addLog,
    gameState,
}: UseSanctuaryParams): UseSanctuaryReturn => {
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

            const consumptionText = Object.entries(plan.config.consumption)
                .map(
                    ([key, amount]) =>
                        `${getResourceName(player.sanctuary, key)} ${amount.toFixed(1)}`
                )
                .join('、');

            addLog(
                `完成 ${plan.config.hours} 小时休息${consumptionText ? `，消耗 ${consumptionText}` : ''
                }${productionText}。`,
                'event'
            );
            AudioService.playSfx('success');
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

            return calculateCustomRestConfig(safeHours, occupantCount, player.sanctuary);
        },
        [player.sanctuary, player.companions?.length]
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
     * 设施升级：按代价扣除任意一种资源、设施等级 +1。
     *
     * - payment 由调用方（LLM 定价）传入；
     * - success 缺省按 90% 基础成功率判定；其余交给引擎/UI 预案。
     */
    const handleFacilityUpgrade = useCallback(
        (facilityId: string, payment: FacilityUpgradePayment, success?: boolean) => {
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

            const amount = Math.max(0, Math.floor(safeNumber(payment.amount, 0)));
            if (amount <= 0) {
                addLog('升级消耗必须为正数。', 'warning');
                AudioService.playSfx('error');
                return;
            }

            const resourceName = getResourceName(player.sanctuary, payment.resourceId);
            if (getSanctuaryResourceValue(player.sanctuary, payment.resourceId) < amount) {
                addLog(`${resourceName}不足，无法升级设施。`, 'warning');
                AudioService.playSfx('error');
                return;
            }

            const successFlag = success ?? Math.random() < 0.9;

            setPlayer((prev) => ({
                ...prev,
                sanctuary: applyFacilityLevelUp(
                    prev.sanctuary,
                    facilityId,
                    payment,
                    successFlag
                ),
            }));

            addLog(
                successFlag
                    ? `设施 [${facility.name}] 升级成功！当前等级 ${facility.level + 1}，消耗 ${amount} ${resourceName}。`
                    : `设施 [${facility.name}] 升级失败，消耗了 ${amount} ${resourceName}。`,
                successFlag ? 'success' : 'warning'
            );
            AudioService.playSfx(successFlag ? 'success' : 'error');
        },
        [gameState, player.sanctuary, addLog, setPlayer]
    );

    /**
     * 应用一次庇护所事件抉择（impact）。
     *
     * @returns 需要抽取的敌人数量（0 表示不触发突袭），由上层决定如何生成敌人。
     */
    const handleSanctuaryEvent = useCallback(
        (impact: ChoiceImpact): number => {
            if (gameState !== GameState.SANCTUARY) {
                addLog('只能在庇护所中处理事件。', 'warning');
                return 0;
            }

            const { sanctuary: nextSanctuary, spawnEnemyCount } = applySanctuaryEventChoice(
                player.sanctuary,
                impact
            );

            setPlayer((prev) => ({
                ...prev,
                sanctuary: nextSanctuary,
            }));

            return spawnEnemyCount;
        },
        [gameState, player.sanctuary, addLog, setPlayer]
    );

    return {
        transferItem,
        handleRest,
        handleFacilityUpgrade,
        handleSanctuaryEvent,
        getCustomRestConfig,
        facilities,
        dailyProduction,
        residents,
    };
};