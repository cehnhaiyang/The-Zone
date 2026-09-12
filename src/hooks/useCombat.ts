/**
 * 多敌人模型：
 * - 所有敌人同时在场。
 * - 敌人回合按敌人数组索引顺序逐一行动。
 * - 每个敌人拥有独立 instanceId、行动点、蓄反槽、效果存储与意图。
 *
 * 已实现（与 interface.copy.ts CombatDynamicState 注释逐条对齐）：
 *
 * 速度 / 行动点：
 * - speed = 敏捷值
 * - actionPoint.base = floor(speed / 5)
 * - actionPoint.current = 当前可用
 * - actionPoint.advanced = 下回合已被蓄反 / 差反预支
 *
 * 友方结果序列：
 * - 预生成长度 = stamina <= 0 ? 0 : floor(stamina / 10)
 * - 攻击 / 防御序列同步消费（每次消费同时推进双侧序列）
 * - 序列耗尽时扣除一定量 stamina（maxStamina × 10%），随后重新生成
 * - 若扣除后仍无法生成序列（长度 0），不扣除 stamina，实体无法行动
 * - 实体数值因增益 / 减益变化时不重新生成序列
 * - 灵力预测深度：每 5 点灵力可预测 1 次行动，0 不可预测
 * - getVisibleResultSequence 仅裁剪 UI 可见长度，不改变实际结算
 *
 * 敌方：
 * - 不预生成结果序列
 * - 攻击 / 防御值在执行前一刻根据五维动态计算
 * - 意图由 intentDistribution 权重表驱动
 *
 * 攻击结果：
 * - miss = 0
 * - graze ∈ [0, baseAttack)
 * - hit = baseAttack
 * - crit ∈ [baseAttack, critMultiplier × baseAttack]
 * - critMultiplier = clamp(1.5 + PER / (PER + 10) × 2.0, 1.5, 3.5)
 *
 * 防御结果：
 * - fail = 0
 * - partial 裁定值 ∈ [0, 0.999 - basePartialReduction]
 *   最终免伤比 = basePartialReduction + 裁定值 ∈ [base, 0.999]
 * - dodge = 1
 *
 * 伤害结算顺序：
 * - 防御结果 → 最终免伤比 → 护盾 → 生命值
 * - 护盾位于防御结果之后、生命值之前
 *
 * 基础攻击力：
 * - 敌人 = damage（模板四维，cthulhu / immovable 通用）
 * - 非敌人 cold = combatBonus × (力量 + 武器伤害)
 * - 非敌人 hot = combatBonus × 武器伤害
 * - 战斗增益 = clamp(1.0 + (wisdom - 3) × 0.05, 0.5, 2.0)
 *
 * 战场空间：
 * - 双方共用一条战线坐标轴 [BATTLE_LINE_MIN, BATTLE_LINE_MAX]（-12 ~ +12），
 *   单位只有前进 / 后退两种位移。
 * - 距离 = 两单位坐标差的绝对值。
 * - 攻击战术仅在目标距离 ≤ 施法者主手武器 range 时可用：
 *   普通武器 range ∈ [1, 12]（精确档位），魔法类 range = 0 视为无视攻击距离。
 *   无武器视为距离 1。
 * - 前进 / 后退每步消耗 MOVE_AP_COST 行动点；敌人超出攻击距离时会主动逼近。
 *
 * instant 真实伤害：
 * - 不参与任何正常结算，不消费结果序列
 * - 无视护盾、免伤、防御判定，不触发蓄反
 * - floor(weapon.damage × (1 + floor(spiritual / 10) × 0.5) × combatBonus × 0.75)
 *
 * 蓄反 / 差反（敌我双方对称适用，攻击结算后即时询问）：
 * - 蓄反槽按「owner（受击方）× trigger（攻击方）」成对维护，槽与槽互不合并；
 * - 蓄反：攻击方速度低于受击方时，每次攻击（无论是否命中 / 被闪避，instant 除外）
 *   在该攻击方与该受击方之间的槽内按 |速度差| 积累蓄反值；
 *   单槽达 5n 且 n 点预支全部可承受时当场询问是否预支：
 *   消耗该槽 5n 蓄反值，立即反击 n 次
 *   （预支优先消耗当前行动点，不足部分记入下回合 advanced 债务）；
 * - 差反：受击方速度 ≥ 10 且可承受 2 点预支时，每次被攻击都询问：
 *   立即反击 1 次，代价为 2 行动点（同样优先消耗当前行动点）；
 * - 顺序：优先蓄反，后差反；玩家方始终询问（单位卡片可设置跳过），
 *   AI 方受 Settings.accumulateCounterEnabled / differentialCounterEnabled 控制（默认关闭）；
 * - 若本次预支（蓄反 n 点 / 差反 2 点）将导致下回合行动为负，则引擎不发起询问，
 *   且蓄反不降级为更小栈数；
 * - 回合结束时所有未消耗蓄反值 × 0.1 向上取整转化为额外行动点；
 * - 任一方回合开始时，该方上回合未蓄反 / 差反的角色额外 +1 行动点。
 *
 * pendingDefense：
 * - 防御战术 / 防御意图主动布设，受击时 FIFO 消费
 *
 * 可选 counterDecision 回调用于接入 UI / LLM 决策蓄反 / 差反预支。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { GameState } from '../meta';
import type {
    ActionEffectType,
    AttackResult,
    AttackTactic,
    AttributeType,
    CharacterTemplate,
    CombatAlly,
    CombatDynamicState,
    CombatEnemy,
    CombatIntent,
    CombatStatus,
    ConsumableEffectType,
    DefenseResult,
    DefenseTactic,
    DotSoundType,
    DynamicVitalType,
    EnemyTemplate,
    Entity,
    EquipState,
    IntentType,
    ItemInstance,
    ItemTemplate,
    LogType,
    NpcDynamicState,
    NpcTemplate,
    PlayerDynamicState,
    PlayerState,
    Tactic,
    Target,
    VitalType,
} from '../meta';
import {
    addItemToInventory,
    clamp,
    createItemInstance,
    generateInstanceId,
    getPrimaryWeapon,
    isAttributeType,
    isDynamicVitalType,
    isVitalType,
    mergeDeep,
    normalizeEquipState,
    randomInt,
    safeDeepClone,
    safeNumber,
} from '../meta';
import { ENEMY_TEMPLATES } from '../constants';
import { AudioService } from '../services';

const pickOne = <T>(list: T[]): T | undefined =>
    list.length === 0 ? undefined : list[randomInt(0, list.length - 1)];

//==============================================================================
// 常量
//==============================================================================
const CC = {
    ANIM_DELAY: 150,
    DEFAULT_BUFF_DURATION: 2,
    MAX_PARTIAL_REDUCTION: 0.999,
    LOG_LIMIT: 200,
    ENEMY_ACTION_GUARD: 10,
    COUNTER_TO_AP_RATIO: 0.1,
    ACCUMULATE_COUNTER_THRESHOLD: 5,
    DIFFERENTIAL_COUNTER_SPEED: 10,
    MAX_ENEMY_COUNT: 5,
    MAX_PENDING_DEFENSE: 3,
    /** 序列耗尽时扣除的体力比例（基于 maxStamina） */
    SEQUENCE_EXHAUST_STAMINA_RATIO: 0.1,
    /** 战线坐标下限（负值 = 我方后方 / 撤退区） */
    BATTLE_LINE_MIN: -12,
    /** 战线坐标上限（正值 = 敌方后方 / 深入区） */
    BATTLE_LINE_MAX: 12,
    /** 我方全体初始站位（统一从 0 格出发） */
    ALLY_START_POS: 0,
    /** 敌方随机分布的起始格（+6 及以后） */
    ENEMY_START_POS: 6,
    /** 单次前进 / 后退消耗的行动点 */
    MOVE_AP_COST: 1,
    /** 敌人模板缺失 range 时的兜底攻击距离 */
    ENEMY_DEFAULT_RANGE: 3,
} as const;

const ATTR_KEYS: ReadonlyArray<AttributeType> = [
    'strength',
    'agility',
    'wisdom',
    'perception',
    'spiritual',
];

const VITAL_TO_DYNAMIC: Record<VitalType, DynamicVitalType> = {
    maxHp: 'hp',
    maxSanity: 'sanity',
    maxStamina: 'stamina',
    maxVigor: 'vigor',
};

const DYNAMIC_VITAL_TO_EFFECT: Record<DynamicVitalType, ConsumableEffectType> = {
    hp: 'heal_hp',
    sanity: 'heal_sanity',
    stamina: 'heal_stamina',
    vigor: 'heal_vigor',
};

const HEAL_TYPES: ReadonlyArray<ConsumableEffectType> = [
    'heal_hp',
    'heal_sanity',
    'heal_stamina',
    'heal_vigor',
];

//==============================================================================
// 类型
//==============================================================================
type HealType =
    | 'heal_hp'
    | 'heal_sanity'
    | 'heal_stamina'
    | 'heal_vigor';

export interface CounterAdvanceRequest {
    /**
     * accumulate：蓄反，每 5 点蓄反值可预支下回合 1 行动点。
     * differential：差反，速度不小于 10 的敌方可预支下回合 2 行动点行动 1 次。
     */
    kind: 'accumulate' | 'differential';
    /** 申请预支行动点的角色 ID。玩家固定为 player，敌人为其 instanceId。 */
    actorId: string;
    /** 本次预支可立即获得的额外行动次数。 */
    advancePoints: number;
    /** 当前可用蓄反值。差反时仅为参考。 */
    availableCounter: number;
    /** 触发阈值。蓄反为 5，差反为 0。 */
    threshold: number;
}

interface UseCombatParams {
    playerState: PlayerState;
    companions: Array<Entity<NpcTemplate, NpcDynamicState>>;
    setPlayerState: Dispatch<SetStateAction<PlayerState>>;
    setCompanions: Dispatch<SetStateAction<Array<Entity<NpcTemplate, NpcDynamicState>>>>;
    gameState: GameState;
    setGameState: Dispatch<SetStateAction<GameState>>;
    addLog: (text: string, type: LogType) => void;
    updatePlayer: (sanityDelta: number, hpDelta: number) => void;
    updateCompanion: (npcId: string, sanityDelta: number, hpDelta: number) => void;
    /**
     * 蓄反 / 差反预支决策回调。
     * 未提供时，战斗钩子不会主动预支行动点，只保留被动的蓄反转行动点规则。
     */
    counterDecision?: (request: CounterAdvanceRequest) => boolean | Promise<boolean>;
    /**
     * 是否启用敌方蓄反询问。
     * 蓄反对敌人有利有弊，默认建议关闭；接入 LLM 战术决策后可按需开启。
     */
    accumulateCounterEnabled?: boolean;
    /**
     * 是否启用敌方差反询问。
     * 差反对敌人有利有弊，默认建议关闭；接入 LLM 战术决策后可按需开启。
     */
    differentialCounterEnabled?: boolean;
}

interface UseCombatReturn {
    enemies: CombatEnemy[];
    aliveEnemyCount: number;
    enemyIntents: Array<CombatIntent | null>;
    allies: CombatAlly[];
    activeAllyId: string;
    setActiveAllyId: Dispatch<SetStateAction<string>>;
    combatLog: string[];
    setCombatLog: Dispatch<SetStateAction<string[]>>;
    /**
     * 按灵力预测深度裁剪后的可见结果序列。
     * 仅用于 UI 展示，不参与实际战斗结算。
     * 敌人目标始终返回空序列。
     */
    getVisibleResultSequence: (targetId: string) => {
        attackResult: AttackResult[];
        defenseResult: DefenseResult[];
    };
    /**
     * 各角色当前已布设的待触发防御判定。
     * key 为 targetId（player / 同伴 id / 敌人 instanceId）。
     */
    pendingDefense: Record<string, DefenseResult[]>;
    spawnEnemy: (
        specificEnemyData?: Partial<EnemyTemplate>,
        currentZoneId?: string,
        threatLevel?: number
    ) => void;
    /**
     * 战斗 HUD 外链生成敌人视觉后回写 imageUrl。
     * 入参为资产键：实例 id 命中单个实例，模板 id 命中全部同型实例。
     */
    updateEnemyVisual: (assetId: string, imageUrl: string) => void;
    isCombatActive: boolean;
    isPlayerPhase: boolean;
    isBusy: boolean;
    getTacticsFor: (ownerId: string) => Tactic[];
    canUseTactic: (tactic: Tactic, casterId: string) => boolean;
    executeTactic: (
        tacticId: string,
        casterId?: string,
        manualTargetId?: string
    ) => Promise<void>;
    endPlayerPhase: () => Promise<void>;
    /** 战场位置表：key 为我方 targetId（player / 同伴 id）或敌方 instanceId。 */
    positions: Record<string, number>;
    /** 战线坐标下限（小地图渲染用）。 */
    battleLineMin: number;
    /** 战线坐标上限（小地图渲染用）。 */
    battleLineMax: number;
    /** 单位当前的攻击距离：我方取主手武器 range，敌方取模板 range；0 = 无限距离。 */
    getUnitRange: (unitId: string) => number;
    /** 两个单位之间的战线距离。 */
    getDistance: (aId: string, bId: string) => number;
    /**
     * 我方单位前进 / 后退一步，消耗行动点。
     * dir：1 前进（靠近敌方），-1 后退（远离敌方）。
     */
    moveAlly: (allyId: string, dir: 1 | -1) => Promise<void>;
    /** 每单位预支询问跳过开关（player / 同伴 id → 蓄反 / 差反）。 */
    counterSkip: Record<string, Partial<Record<CounterAdvanceRequest['kind'], boolean>>>;
    /** 设置 / 取消跳过开关。 */
    setCounterSkip: (unitId: string, kind: CounterAdvanceRequest['kind'], skip: boolean) => void;
    /** 「立即行动」窗口：预支结算后我方单位的立即行动机会（敌方窗口由引擎自动执行，不在此列）。 */
    insertAction: { unitId: string; chancesLeft: number } | null;
    /** 手动结束「立即行动」窗口。 */
    endInsertAction: () => void;
}

//==============================================================================
// 工具函数
//==============================================================================
export const getAllyTargetId = (ally: { id: string }, idx: number): string =>
    idx === 0 ? 'player' : ally.id;

const toTargetId = getAllyTargetId;

const round1 = (value: number): number => parseFloat(safeNumber(value).toFixed(1));
const fix1 = (value: number): number => Math.max(0, round1(value));

/**
 * 攻击距离判定。
 * range = 0 视为无视攻击距离（魔法 / 能量 / 无弹道衰减武器），恒可攻击。
 */
const isWithinRange = (range: number, distance: number): boolean =>
    range === 0 || distance <= range;

const delay = (ms: number = CC.ANIM_DELAY) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));

const playSfx = (sfx: DotSoundType) => {
    try {
        AudioService.playSfx(sfx);
    } catch {
        // noop
    }
};

const isHealType = (type: string): type is HealType =>
    (HEAL_TYPES as readonly string[]).includes(type);

const normalizeEffectType = (type: ActionEffectType): ActionEffectType =>
    isDynamicVitalType(type) ? DYNAMIC_VITAL_TO_EFFECT[type] : type;

const isShieldEffect = (type: ActionEffectType): boolean => type === 'shield';

const isOverTimeEffect = (type: ActionEffectType): boolean =>
    isHealType(type) || isShieldEffect(type);

const applyImmediateEffect = (
    dyn: CombatDynamicState,
    rawType: ActionEffectType,
    rawValue: number
): CombatDynamicState => {
    const type = normalizeEffectType(rawType);
    const value = round1(rawValue);
    if (value === 0) return dyn;

    let next: CombatDynamicState = { ...dyn };

    if (isShieldEffect(type)) {
        next.shield = Math.max(0, fix1(next.shield + value));
        return next;
    }
    if (type === 'heal_hp') {
        next.hp = clamp(next.hp + value, 0, next.maxHp);
        return next;
    }
    if (type === 'heal_sanity') {
        next.sanity = clamp(next.sanity + value, 0, next.maxSanity);
        return next;
    }
    if (type === 'heal_stamina') {
        next.stamina = clamp(next.stamina + value, 0, next.maxStamina);
        return next;
    }
    if (type === 'heal_vigor') {
        next.vigor = clamp(next.vigor + value, 0, next.maxVigor);
        return next;
    }
    if (type === 'ap_reduce') {
        const cost = Math.max(0, value);
        return {
            ...next,
            actionPoint: {
                ...next.actionPoint,
                current: Math.max(0, next.actionPoint.current - cost),
            },
        };
    }
    if (isAttributeType(type)) {
        const record = next as unknown as Record<string, unknown>;
        if (typeof record[type] === 'number') {
            // 玩家方 / 人形敌人：拥有完整五维，直接增减。
            record[type] = Math.max(0, safeNumber(record[type]) + value);
            return next;
        }
        // 新模型敌人（cthulhu / immovable）没有五维：
        // 力量 → damage、敏捷 → speed 按语义映射；其余维度无对应项，效果不生效。
        const mapped = type === 'strength' ? 'damage' : type === 'agility' ? 'speed' : undefined;
        if (mapped) {
            record[mapped] = Math.max(0, safeNumber(record[mapped]) + value);
        }
        return next;
    }
    if (isVitalType(type)) {
        const currentKey = VITAL_TO_DYNAMIC[type];
        const nextMax = Math.max(0, safeNumber(next[type]) + value);
        next[type] = nextMax;
        next[currentKey] = clamp(next[currentKey], 0, nextMax);
        return next;
    }
    return next;
};

/**
 * 读取「owner × trigger」单槽的蓄反值。
 * 蓄反值按对维护：某单位与其他单位之间的槽独立累积，判定与消耗都不跨槽合并。
 */
const getCounterPairValue = (
    dyn: CombatDynamicState,
    ownerId: string,
    triggerId: string
): number =>
    dyn.accumulateCounter.reduce(
        (sum, entry) =>
            entry.ownerId === ownerId && entry.triggerId === triggerId
                ? sum + safeNumber(entry.value)
                : sum,
        0
    );

/** 仅从「owner × trigger」单槽扣除蓄反值，其余槽保持原样。 */
const consumeCounterPair = (
    dyn: CombatDynamicState,
    ownerId: string,
    triggerId: string,
    amount: number
): CombatDynamicState => {
    let remaining = Math.max(0, Math.floor(safeNumber(amount)));
    if (remaining <= 0) return dyn;
    const nextCounter: CombatDynamicState['accumulateCounter'] = [];
    for (const entry of dyn.accumulateCounter) {
        if (entry.ownerId !== ownerId || entry.triggerId !== triggerId || remaining <= 0) {
            nextCounter.push(entry);
            continue;
        }
        const take = Math.min(safeNumber(entry.value), remaining);
        remaining -= take;
        const value = safeNumber(entry.value) - take;
        if (value > 0) nextCounter.push({ ...entry, value });
    }
    return { ...dyn, accumulateCounter: nextCounter };
};

const storeStatusItem = (list: CombatStatus[], item: CombatStatus): CombatStatus[] => {
    const idx = list.findIndex((entry) => entry.type === item.type);
    if (idx === -1) return [...list, item];
    const mergedValue = round1(list[idx].value + item.value);
    if (mergedValue === 0) return list.filter((_, i) => i !== idx);
    return list.map((entry, i) =>
        i === idx
            ? { ...entry, value: mergedValue, duration: Math.max(entry.duration, item.duration) }
            : entry
    );
};

/** 战斗增益 = clamp(1.0 + (KNO - 3) × 0.05, 0.5, 2.0) */
const calculateCombatBonus = (wisdom: number): number =>
    clamp(1.0 + (Math.max(0, safeNumber(wisdom)) - 3) * 0.05, 0.5, 2.0);

/** critMultiplier = clamp(1.5 + PER / (PER + K) × 2.0, 1.5, 3.5)，K = 10 */
const calculateCritMultiplier = (perception: number): number => {
    const K = 10;
    const per = Math.max(0, safeNumber(perception));
    return clamp(1.5 + (per / (per + K)) * 2.0, 1.5, 3.5);
};

/**
 * 行动点。
 * base = floor(speed / 5)。
 * 序列长度为 0 时实体无法行动，base 可为 0。
 */
const createActionPoint = (speed: number) => {
    const base = Math.floor(safeNumber(speed) / 5);
    return { base, current: base, advanced: 0 };
};

/**
 * 基础免伤比 = 角色装备的护甲提供的免伤值的加总。
 * 不乘以任何系数。
 */
const calculateBasePartialReduction = (equipment: EquipState): number => {
    const armors = equipment?.armors ?? [];
    const raw = armors.reduce(
        (sum, armor) => sum + safeNumber(armor?.partialReduction ?? 0),
        0
    );
    return clamp(raw, 0, CC.MAX_PARTIAL_REDUCTION);
};

/**
 * 非敌人基础攻击力：
 * cold = combatBonus × (力量值 + 武器伤害)
 * hot = combatBonus × 武器伤害
 * 无武器时 = combatBonus × 力量值
 * 入参可为持久化玩家动态或战斗态（两者均持有五维与装备）。
 */
const calculatePlayerBaseAttack = (
    dynamic: PlayerDynamicState | CombatAlly,
    combatBonus: number
): number => {
    const weapon = getPrimaryWeapon(dynamic.equipment);
    const bonus = safeNumber(combatBonus, 1);
    if (!weapon) {
        return Math.max(0, Math.floor(safeNumber(dynamic.strength) * bonus));
    }
    const weaponDamage = safeNumber(weapon.damage);
    if (weapon.weaponDamageType === 'cold') {
        return Math.max(
            0,
            Math.floor((safeNumber(dynamic.strength) + weaponDamage) * bonus)
        );
    }
    return Math.max(0, Math.floor(weaponDamage * bonus));
};

/** 敌人基础攻击力 = 模板 damage */
const calculateEnemyBaseAttack = (damage: number): number =>
    Math.max(0, Math.floor(safeNumber(damage)));

/**
 * instant 伤害公式：
 * floor(weapon.damage × (1 + floor(spiritual / 10) × 0.5) × combatBonus × 0.75)
 * 真实伤害，不参与任何正常结算。
 */
const calculateInstantDamage = (dyn: CombatAlly): number => {
    const weapon = getPrimaryWeapon(dyn.equipment);
    if (!weapon) return 0;
    const weaponDamage = safeNumber(weapon.damage);
    const spiritual = Math.max(0, safeNumber(dyn.spiritual));
    const combatBonus = safeNumber(dyn.combatBonus, 1);
    return Math.floor(
        weaponDamage * (1 + Math.floor(spiritual / 10) * 0.5) * combatBonus * 0.75
    );
};

/** 灵力预测深度：每 5 点灵力可预测 1 次行动，0 不可预测 */
const getPredictionDepth = (spiritual: number): number =>
    Math.max(0, Math.floor(safeNumber(spiritual) / 5));

/** 友方结果序列长度 = stamina <= 0 ? 0 : floor(stamina / 10) */
const getSequenceLength = (stamina: number): number => {
    const s = safeNumber(stamina);
    return s <= 0 ? 0 : Math.floor(s / 10);
};

const getVisibleResultSequenceLength = (spiritual: number, stamina: number): number => {
    const seqLen = getSequenceLength(stamina);
    return clamp(getPredictionDepth(spiritual), 0, seqLen);
};

/**
 * 序列耗尽时扣除的 stamina 量。
 * 若扣除后无法生成新序列，则不应实际扣除。
 */
const getExhaustStaminaCost = (maxStamina: number): number =>
    Math.max(1, Math.floor(safeNumber(maxStamina) * CC.SEQUENCE_EXHAUST_STAMINA_RATIO));

/**
 * 检查序列耗尽后能否通过扣除 stamina 重生成。
 * 用于 canUseTactic 与 executeTactic 的前置校验。
 */
const canRegenerateSequence = (stamina: number, maxStamina: number): boolean => {
    const cost = getExhaustStaminaCost(maxStamina);
    const afterStamina = clamp(stamina - cost, 0, maxStamina);
    return getSequenceLength(afterStamina) > 0;
};

const rollWeighted = (weights: Record<string, number>): string => {
    const entries = Object.entries(weights);
    if (entries.length === 0) return '';
    const total = entries.reduce((sum, [, w]) => sum + Math.max(0, w), 0);
    if (total <= 0) return entries[0][0];
    let roll = Math.random() * total;
    for (const [key, w] of entries) {
        roll -= Math.max(0, w);
        if (roll <= 0) return key;
    }
    return entries[entries.length - 1][0];
};

const randomFloat = (min: number, max: number): number => {
    const lower = safeNumber(min);
    const upper = safeNumber(max);
    if (upper < lower) return lower;
    return Math.random() * (upper - lower) + lower;
};

/**
 * 生成友方结果序列。
 * 长度 = stamina <= 0 ? 0 : floor(stamina / 10)。
 *
 * 攻击结果：
 * - miss = 0
 * - graze ∈ [0, baseAttack)
 * - hit = baseAttack
 * - crit ∈ [baseAttack, critMultiplier × baseAttack]
 *
 * 防御结果：
 * - fail = 0
 * - partial 裁定值 ∈ [0, 0.999 - basePartialReduction]
 *   最终免伤比 = basePartialReduction + 裁定值 ∈ [base, 0.999]
 * - dodge = 1
 */
const generateResultSequence = (
    input: {
        agility: number;
        perception: number;
        stamina: number;
        fatigueCount?: number;
    },
    baseAttack: number,
    basePartialReduction: number
): {
    attackResult: AttackResult[];
    defenseResult: DefenseResult[];
} => {
    const length = getSequenceLength(input.stamina);
    if (length <= 0) return { attackResult: [], defenseResult: [] };

    const attackSequence: AttackResult[] = [];
    const defenseSequence: DefenseResult[] = [];

    const agility = safeNumber(input.agility);
    const perception = safeNumber(input.perception);
    const fatiguePenalty = clamp(safeNumber(input.fatigueCount ?? 0) * 0.08, 0, 0.6);
    const safeBaseAttack = Math.max(0, safeNumber(baseAttack));
    const safeBPR = clamp(safeNumber(basePartialReduction), 0, CC.MAX_PARTIAL_REDUCTION);
    const critMultiplier = calculateCritMultiplier(perception);

    /** partial 裁定值上限 = 0.999 - base，确保最终免伤比不超过 0.999 */
    const partialCap = Math.max(0, CC.MAX_PARTIAL_REDUCTION - safeBPR);

    const attack = (result: AttackResult[0], value: number): AttackResult => [
        result,
        Math.max(0, Math.floor(value)),
    ];
    const defense = (result: DefenseResult[0], value: number): DefenseResult => [
        result,
        result === 'dodge' ? 1 : clamp(value, 0, CC.MAX_PARTIAL_REDUCTION),
    ];

    const attackWeights = {
        miss: clamp(0.12 - perception * 0.004 + fatiguePenalty * 0.15, 0.02, 0.65),
        graze: clamp(0.18 - perception * 0.002 + fatiguePenalty * 0.08, 0.05, 0.45),
        crit: clamp(0.04 + perception * 0.006 - fatiguePenalty * 0.03, 0.01, 0.35),
        hit: 0.4,
    };
    const defenseWeights = {
        fail: clamp(0.28 - agility * 0.006 + fatiguePenalty * 0.1, 0.05, 0.72),
        partial: 0.45,
        dodge: clamp(0.05 + agility * 0.006 - fatiguePenalty * 0.02, 0.01, 0.35),
    };

    for (let i = 0; i < length; i += 1) {
        const attackRoll = rollWeighted(attackWeights);
        switch (attackRoll) {
            case 'miss':
                attackSequence.push(attack('miss', 0));
                break;
            case 'graze':
                attackSequence.push(attack('graze', safeBaseAttack * randomFloat(0, 1)));
                break;
            case 'crit':
                attackSequence.push(
                    attack('crit', safeBaseAttack * randomFloat(1, critMultiplier))
                );
                break;
            default:
                attackSequence.push(attack('hit', safeBaseAttack));
                break;
        }

        const defenseRoll = rollWeighted(defenseWeights);
        switch (defenseRoll) {
            case 'fail':
                defenseSequence.push(defense('fail', 0));
                break;
            case 'dodge':
                defenseSequence.push(defense('dodge', 1));
                break;
            default:
                defenseSequence.push(defense('partial', partialCap * randomFloat(0, 1)));
                break;
        }
    }
    return { attackResult: attackSequence, defenseResult: defenseSequence };
};

/**
 * 敌人动态攻击结果。
 * 敌人不预生成序列，在执行前一刻根据四维动态计算。
 * 新模型无感知维度：命中权重取无修正基准，暴击倍率取下限 1.5。
 */
const rollDynamicAttackResult = (
    baseAttack: number,
    fatigueCount: number = 0
): AttackResult => {
    const fatiguePenalty = clamp(safeNumber(fatigueCount) * 0.08, 0, 0.6);
    const safeBaseAttack = Math.max(0, safeNumber(baseAttack));
    const critMultiplier = 1.5;

    const weights = {
        miss: clamp(0.12 + fatiguePenalty * 0.15, 0.02, 0.65),
        graze: clamp(0.18 + fatiguePenalty * 0.08, 0.05, 0.45),
        crit: clamp(0.04 - fatiguePenalty * 0.03, 0.01, 0.35),
        hit: 0.4,
    };
    const roll = rollWeighted(weights);
    switch (roll) {
        case 'miss':
            return ['miss', 0];
        case 'graze':
            return ['graze', Math.max(0, Math.floor(safeBaseAttack * randomFloat(0, 1)))];
        case 'crit':
            return [
                'crit',
                Math.max(0, Math.floor(safeBaseAttack * randomFloat(1, critMultiplier))),
            ];
        default:
            return ['hit', Math.max(0, Math.floor(safeBaseAttack))];
    }
};

/**
 * 敌人模板的免伤 / 闪避数值 → 免伤比（引擎自动百分化）。
 *
 * 模板允许任意正负整数，按 1 点 = 1% 换算：
 * - defense → 最小免伤（叠加进 CombatDynamicState.basePartialReduction）；
 * - evasion → 最大免伤。
 * 结算环节统一 clamp 到 [0, MAX_PARTIAL_REDUCTION]，负数自然归零（不产生增伤）。
 */
const toReductionRatio = (value: number): number => safeNumber(value) / 100;

/**
 * 敌人动态防御结果。
 *
 * 结算语义（与 dealDamageTo* 一致）：最终免伤 = basePartialReduction + 裁定值。
 * - cthulhu：裁定值 ∈ [0, evasion - defense]，即最终免伤 ∈ [defense, evasion]；
 *   保留完全闪避（免伤 = 1）；fail 时仅保留基础免伤 defense。
 * - immovable：无闪避力，无法闪避攻击，只能免伤 → 裁定值恒为 0（免伤恒为 defense）。
 */
const rollEnemyDefenseResult = (enemy: CombatEnemy): DefenseResult => {
    const defense = clamp(safeNumber(enemy.basePartialReduction), 0, CC.MAX_PARTIAL_REDUCTION);
    // 炮塔类 / 预留类型：只有基础免伤。
    if (enemy.type !== 'cthulhu') return ['partial', 0];

    const evasion = toReductionRatio(safeNumber(enemy.evasion));
    const span = Math.max(0, evasion - defense);
    if (span <= 0) return ['partial', 0];

    const weights = {
        fail: clamp(0.3 - evasion * 0.4, 0.05, 0.75),
        partial: 0.45,
        dodge: clamp(0.05 + evasion * 0.5, 0.01, 0.4),
    };
    const roll = rollWeighted(weights);
    switch (roll) {
        case 'dodge':
            return ['dodge', 1];
        case 'fail':
            return ['fail', 0];
        default:
            return ['partial', clamp(randomFloat(0, 1) * span, 0, CC.MAX_PARTIAL_REDUCTION)];
    }
};

/** 伤害扣除：护盾位于防御结果之后、生命值之前。 */
const processDamageDeduction = (
    currentShield: number,
    rawDamage: number
): { newShield: number; actualDmg: number } => {
    const shield = Math.max(0, safeNumber(currentShield));
    const damage = Math.max(0, safeNumber(rawDamage));
    const damageToShield = Math.min(shield, damage);
    return {
        newShield: shield - damageToShield,
        actualDmg: damage - damageToShield,
    };
};

const spendActionPoint = (
    combat: CombatDynamicState,
    cost: number
): CombatDynamicState => {
    const safeCost = Math.max(0, safeNumber(cost));
    if (safeCost <= 0) return combat;
    if (combat.actionPoint.current < safeCost) return combat;
    return {
        ...combat,
        actionPoint: {
            ...combat.actionPoint,
            current: Math.max(0, combat.actionPoint.current - safeCost),
        },
    };
};

const addAccumulateCounter = (
    combat: CombatDynamicState,
    ownerId: string,
    triggerId: string,
    value: number
): CombatDynamicState => {
    const safeValue = Math.max(0, safeNumber(value));
    if (safeValue <= 0) return combat;
    const next = { ...combat, accumulateCounter: [...combat.accumulateCounter] };
    const existing = next.accumulateCounter.find(
        (entry) => entry.ownerId === ownerId && entry.triggerId === triggerId
    );
    if (existing) {
        existing.value = Math.max(0, existing.value + safeValue);
    } else {
        next.accumulateCounter.push({ ownerId, triggerId, value: safeValue });
    }
    return next;
};

/** 将战斗态同步回玩家动态状态（仅我方战斗态持有五维与装备） */
const applyCombatToPlayerDynamic = (
    base: PlayerDynamicState,
    combat: CombatAlly
): PlayerDynamicState => ({
    ...base,
    imageUrl: combat.imageUrl ?? base.imageUrl,
    videoUrl: combat.videoUrl ?? base.videoUrl,
    audioUrl: combat.audioUrl ?? base.audioUrl,
    strength: combat.strength,
    agility: combat.agility,
    wisdom: combat.wisdom,
    perception: combat.perception,
    spiritual: combat.spiritual,
    maxHp: combat.maxHp,
    maxSanity: combat.maxSanity,
    maxStamina: combat.maxStamina,
    maxVigor: combat.maxVigor,
    hp: combat.hp,
    sanity: combat.sanity,
    stamina: combat.stamina,
    vigor: combat.vigor,
    equipment: normalizeEquipState(combat.equipment),
    isDead: combat.isDead || combat.hp <= 0,
});

/** 将战斗态同步回 NPC 动态状态（仅我方战斗态持有五维与装备） */
const applyCombatToNpcDynamic = (
    base: NpcDynamicState,
    combat: CombatAlly
): NpcDynamicState => ({
    ...base,
    imageUrl: combat.imageUrl ?? base.imageUrl,
    videoUrl: combat.videoUrl ?? base.videoUrl,
    audioUrl: combat.audioUrl ?? base.audioUrl,
    strength: combat.strength,
    agility: combat.agility,
    wisdom: combat.wisdom,
    perception: combat.perception,
    spiritual: combat.spiritual,
    maxHp: combat.maxHp,
    maxSanity: combat.maxSanity,
    maxStamina: combat.maxStamina,
    maxVigor: combat.maxVigor,
    hp: combat.hp,
    sanity: combat.sanity,
    stamina: combat.stamina,
    vigor: combat.vigor,
    equipment: normalizeEquipState(combat.equipment),
    isDead: combat.isDead || combat.hp <= 0,
});

//==============================================================================
// 实体工厂
//==============================================================================
/**
 * 敌人实例工厂。
 *
 * 模板为判别联合（cthulhu / immovable）：
 * - cthulhu：speed / damage / defense / evasion 四维直取；
 * - immovable：同 cthulhu 结构但无 evasion（无闪避力，免伤恒为基础免伤）；
 *
 * 敌人不再持有五维与装备；体征（maxHp 等）暂由四维推导，
 * TODO(数值迁移)：待数据迁移时替换为模板显式数值。
 */
const createEnemyEntity = (
    template: EnemyTemplate,
    threatLevel: number = 0
): CombatEnemy => {
    const cloned = safeDeepClone(template);
    const threat = clamp(threatLevel, 0, 50);
    const vitalityScale = 1 + threat / 50;

    const fourDim = cloned as Partial<{
        speed: number;
        damage: number;
        defense: number;
        evasion: number;
    }>;
    const speed = Math.max(0, safeNumber(fourDim.speed));
    const damage = Math.max(0, safeNumber(fourDim.damage));
    const defensePts = Math.max(0, safeNumber(fourDim.defense));
    const evasionPts = Math.max(0, safeNumber(fourDim.evasion));
    const defense = toReductionRatio(defensePts);

    // 体征推导：四维点数和 × 2 × 威胁缩放（量级对齐旧版五维和）。
    const attributeSum = speed + damage + defensePts + evasionPts;
    const maxHp = Math.max(1, Math.floor(attributeSum * 2 * vitalityScale));
    const maxSanity = Math.max(0, maxHp * 2);
    const maxStamina = Math.max(0, maxHp * 2);
    const maxVigor = Math.max(0, maxHp * 2);

    const baseAttack = calculateEnemyBaseAttack(damage);

    return {
        ...cloned,
        instanceId: generateInstanceId('enemy'),
        maxHp,
        maxSanity,
        maxStamina,
        maxVigor,
        hp: maxHp,
        sanity: maxSanity,
        stamina: maxStamina,
        vigor: maxVigor,
        isDead: false,
        speed,
        actionPoint: createActionPoint(speed),
        accumulateCounter: [],
        shield: 0,
        baseAttack,
        basePartialReduction: defense,
        resultSequence: { attackResult: [], defenseResult: [] },
        status: [],
        pendingDefense: [],
    } as CombatEnemy;
};

/**
 * 友方预生成结果序列。
 * 序列长度 = stamina <= 0 ? 0 : floor(stamina / 10)。
 */
const createCombatantEntity = <T extends CharacterTemplate>(
    template: T,
    prevDynamic: PlayerDynamicState | NpcDynamicState
): CombatAlly => {
    const staticPart = { ...template } as Partial<T> & { initialState?: unknown };
    delete staticPart.initialState;

    const equipment = normalizeEquipState(prevDynamic.equipment);
    const combatBonus = calculateCombatBonus(prevDynamic.wisdom);
    const speed = Math.max(0, safeNumber(prevDynamic.agility));
    const baseAttack = calculatePlayerBaseAttack({ ...prevDynamic, equipment }, combatBonus);
    const basePartialReduction = calculateBasePartialReduction(equipment);

    return {
        ...staticPart,
        strength: safeNumber(prevDynamic.strength),
        agility: safeNumber(prevDynamic.agility),
        wisdom: safeNumber(prevDynamic.wisdom),
        perception: safeNumber(prevDynamic.perception),
        spiritual: safeNumber(prevDynamic.spiritual),
        maxHp: safeNumber(prevDynamic.maxHp),
        maxSanity: safeNumber(prevDynamic.maxSanity),
        maxStamina: safeNumber(prevDynamic.maxStamina),
        maxVigor: safeNumber(prevDynamic.maxVigor),
        hp: safeNumber(prevDynamic.hp),
        sanity: safeNumber(prevDynamic.sanity),
        stamina: safeNumber(prevDynamic.stamina),
        vigor: safeNumber(prevDynamic.vigor),
        imageUrl: prevDynamic.imageUrl,
        videoUrl: prevDynamic.videoUrl,
        audioUrl: prevDynamic.audioUrl,
        equipment: safeDeepClone(equipment),
        isDead: prevDynamic.isDead ?? safeNumber(prevDynamic.hp) <= 0,
        tactics: safeDeepClone(prevDynamic.tactics ?? []),
        inventory: safeDeepClone(prevDynamic.inventory ?? []),
        speed,
        actionPoint: createActionPoint(speed),
        accumulateCounter: [],
        shield: 0,
        baseAttack,
        basePartialReduction,
        combatBonus,
        resultSequence: generateResultSequence(
            {
                agility: prevDynamic.agility,
                perception: prevDynamic.perception,
                stamina: prevDynamic.stamina,
            },
            baseAttack,
            basePartialReduction
        ),
        status: [],
        pendingDefense: [],
    } as CombatAlly;
};

//==============================================================================
// Hook
//==============================================================================
export const useCombat = ({
    playerState,
    companions,
    setPlayerState,
    setCompanions,
    gameState,
    setGameState,
    addLog,
    updatePlayer,
    updateCompanion,
    counterDecision,
    accumulateCounterEnabled = false,
    differentialCounterEnabled = false,
}: UseCombatParams): UseCombatReturn => {
    //--------------------------------------------------------------------------
    // State
    //--------------------------------------------------------------------------
    const [enemies, setEnemies] = useState<CombatEnemy[]>([]);
    const [enemyIntents, setEnemyIntents] = useState<Array<CombatIntent | null>>([]);
    const [allies, setAllies] = useState<CombatAlly[]>([]);
    const [combatLog, setCombatLog] = useState<string[]>([]);
    const [isPlayerPhase, setIsPlayerPhase] = useState(false);
    const [isBusy, setIsBusy] = useState(false);
    const [activeAllyId, setActiveAllyId] = useState('player');
    const [pendingDefense, setPendingDefense] = useState<Record<string, DefenseResult[]>>({});
    /** 战场位置表：key 为我方 targetId（player / 同伴 id）或敌方 instanceId。 */
    const [positions, setPositions] = useState<Record<string, number>>({});
    /** 每单位预支询问跳过开关（玩家方单位卡片上的「跳过蓄反 / 差反询问」）。 */
    const [counterSkip, setCounterSkip] = useState<
        Record<string, Partial<Record<CounterAdvanceRequest['kind'], boolean>>>
    >({});
    /** 「立即行动」窗口：预支结算后，我方受击方立即行动的剩余机会（敌方窗口不在此展示）。 */
    const [insertAction, setInsertAction] = useState<{ unitId: string; chancesLeft: number } | null>(
        null
    );

    //--------------------------------------------------------------------------
    // Refs
    //--------------------------------------------------------------------------
    const enemiesRef = useRef<CombatEnemy[]>([]);
    const enemyIntentsRef = useRef<Array<CombatIntent | null>>([]);
    /**
     * 敌人完整意图队列（与 ui 层 enemyIntents 的队首一一对应）。
     * 队首为当前要执行的行为；「接近意图」执行后即出队，让位给后续攻击意图。
     */
    const enemyIntentQueuesRef = useRef<CombatIntent[][]>([]);
    /**
     * 本次敌人阶段内，各敌人是否已成功出手攻击过。
     * 用于攻击流程粘性：未出手且仍是攻击类意图时，阶段结束不重新掷骰，
     * 保证「接近 → 检查 → 接近」会一直走到底，不会中途被掷成防御等无关意图。
     */
    const enemyAttackedThisTurnRef = useRef<Record<string, boolean>>({});
    const alliesRef = useRef<CombatAlly[]>([]);
    const playerStateRef = useRef(playerState);
    const companionsRef = useRef(companions);
    const fatigueRef = useRef<Record<string, number>>({});
    const usedCounterRef = useRef<Record<string, boolean>>({});
    const carryApRef = useRef<Record<string, number>>({});
    const counterSkipRef = useRef<
        Record<string, Partial<Record<CounterAdvanceRequest['kind'], boolean>>>
    >({});
    const insertActionRef = useRef<{ unitId: string; chancesLeft: number } | null>(null);
    const insertActionResolverRef = useRef<(() => void) | null>(null);
    /**
     * 预支询问函数的前向引用。
     * runInsertAction（定义在前）需要在立即行动的攻击后询问受击方，
     * 而 maybeCounterAdvancesAfterHit 又依赖 runInsertAction，故用 ref 打断循环依赖。
     */
    const counterAskRef = useRef<((attackerId: string, targetId: string) => Promise<void>) | null>(
        null
    );
    const pendingDefenseRef = useRef<Record<string, DefenseResult[]>>({});
    const positionsRef = useRef<Record<string, number>>({});
    const actionLockRef = useRef(false);
    const combatActiveRef = useRef(false);
    /** 进入战斗前的全局状态快照，用于战斗结束后恢复（庇护所战斗不应回到 PLAYING）。 */
    const preCombatStateRef = useRef<GameState>(GameState.PLAYING);
    const mountedRef = useRef(true);

    //--------------------------------------------------------------------------
    // 生命周期
    //--------------------------------------------------------------------------
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        playerStateRef.current = playerState;
        companionsRef.current = companions;
    }, [playerState, companions]);

    //--------------------------------------------------------------------------
    // 基础工具
    //--------------------------------------------------------------------------
    const setBusy = useCallback((value: boolean) => {
        actionLockRef.current = value;
        setIsBusy(value);
    }, []);

    //--------------------------------------------------------------------------
    // 战场空间（纯逻辑层）
    //--------------------------------------------------------------------------
    const setPositionsSafe = useCallback((next: Record<string, number>) => {
        positionsRef.current = next;
        setPositions(next);
    }, []);

    /** 读取单位在战线上的坐标；未知单位按 0 处理。 */
    const getPosition = useCallback(
        (unitId: string): number => safeNumber(positionsRef.current[unitId], 0),
        []
    );

    /** 两个单位之间的战线距离。 */
    const getDistance = useCallback(
        (aId: string, bId: string): number =>
            Math.abs(getPosition(aId) - getPosition(bId)),
        [getPosition]
    );

    /**
     * 单位的攻击距离：
     * - 我方 = 主手武器 range（0 = 无限）；未装备武器视为 1（贴身）。
     * - 敌方 = 模板自身 range；缺失时回落到统一默认值。
     */
    const getUnitRange = useCallback((unitId: string): number => {
        const ally = alliesRef.current.find((a, idx) => toTargetId(a, idx) === unitId);
        if (ally) {
            const weapon = getPrimaryWeapon(ally.equipment);
            return weapon ? Math.max(0, safeNumber(weapon.range, 1)) : 1;
        }
        const enemy = enemiesRef.current.find((e) => e.instanceId === unitId);
        if (enemy) return Math.max(0, safeNumber(enemy.range, CC.ENEMY_DEFAULT_RANGE));
        return CC.ENEMY_DEFAULT_RANGE;
    }, []);

    const setEnemiesSafe = useCallback((value: SetStateAction<CombatEnemy[]>) => {
        const next =
            typeof value === 'function'
                ? (value as (prev: CombatEnemy[]) => CombatEnemy[])(enemiesRef.current)
                : value;
        enemiesRef.current = next;
        setEnemies(next);
    }, []);

    const setEnemyIntentsSafe = useCallback(
        (value: SetStateAction<Array<CombatIntent | null>>) => {
            const next =
                typeof value === 'function'
                    ? (value as (prev: Array<CombatIntent | null>) => Array<CombatIntent | null>)(
                        enemyIntentsRef.current
                    )
                    : value;
            enemyIntentsRef.current = next;
            setEnemyIntents(next);
        },
        []
    );

    const setAlliesSafe = useCallback((value: SetStateAction<CombatAlly[]>) => {
        const next =
            typeof value === 'function'
                ? (value as (prev: CombatAlly[]) => CombatAlly[])(alliesRef.current)
                : value;
        alliesRef.current = next;
        setAllies(next);
    }, []);

    const setCompanionsSafe = useCallback(
        (value: SetStateAction<Array<Entity<NpcTemplate, NpcDynamicState>>>) => {
            const next =
                typeof value === 'function'
                    ? (value as (prev: Array<Entity<NpcTemplate, NpcDynamicState>>) => Array<
                        Entity<NpcTemplate, NpcDynamicState>
                    >)(companionsRef.current)
                    : value;
            companionsRef.current = next;
            setCompanions(next);
            setPlayerState((prev) => {
                const updated: PlayerState = { ...prev, companions: next };
                playerStateRef.current = updated;
                return updated;
            });
        },
        [setCompanions, setPlayerState]
    );

    const addCombatLog = useCallback(
        (text: string) => {
            setCombatLog((prev) => [...prev.slice(-(CC.LOG_LIMIT - 1)), text]);
            addLog(text, 'combat');
        },
        [addLog]
    );

    //--------------------------------------------------------------------------
    // 待触发防御判定（FIFO 消费）
    //--------------------------------------------------------------------------
    const commitPendingDefense = useCallback(() => {
        setPendingDefense({ ...pendingDefenseRef.current });
    }, []);

    const addPendingDefense = useCallback(
        (targetId: string, result: DefenseResult) => {
            const list = pendingDefenseRef.current[targetId] ?? [];
            const next = [...list, result];
            while (next.length > CC.MAX_PENDING_DEFENSE) next.shift();
            pendingDefenseRef.current[targetId] = next;
            commitPendingDefense();
        },
        [commitPendingDefense]
    );

    const takePendingDefense = useCallback(
        (targetId: string): DefenseResult | undefined => {
            const list = pendingDefenseRef.current[targetId];
            if (!list || list.length === 0) return undefined;
            const [first, ...rest] = list;
            if (rest.length === 0) delete pendingDefenseRef.current[targetId];
            else pendingDefenseRef.current[targetId] = rest;
            commitPendingDefense();
            return first;
        },
        [commitPendingDefense]
    );

    const clearPendingDefense = useCallback(
        (targetId: string) => {
            if (pendingDefenseRef.current[targetId]) {
                delete pendingDefenseRef.current[targetId];
                commitPendingDefense();
            }
        },
        [commitPendingDefense]
    );

    const clearAllPendingDefense = useCallback(() => {
        pendingDefenseRef.current = {};
        commitPendingDefense();
    }, [commitPendingDefense]);

    //--------------------------------------------------------------------------
    // 友方索引与读取
    //--------------------------------------------------------------------------
    const findAllyIndex = useCallback((targetId: string) => {
        if (targetId === 'player') return alliesRef.current.length > 0 ? 0 : -1;
        return alliesRef.current.findIndex((a) => a.id === targetId);
    }, []);

    const getAlly = useCallback(
        (targetId: string) => {
            const idx = findAllyIndex(targetId);
            return idx >= 0 ? alliesRef.current[idx] : undefined;
        },
        [findAllyIndex]
    );

    const getAliveAllyTargetIds = useCallback(() => {
        return alliesRef.current.reduce<string[]>((acc, ally, idx) => {
            if (ally.hp > 0) acc.push(toTargetId(ally, idx));
            return acc;
        }, []);
    }, []);

    //--------------------------------------------------------------------------
    // 敌方索引与读取
    //--------------------------------------------------------------------------
    const isEnemyTarget = useCallback(
        (targetId: string) => enemiesRef.current.some((e) => e.instanceId === targetId),
        []
    );

    const findEnemyIndex = useCallback(
        (targetId: string) =>
            enemiesRef.current.findIndex((e) => e.instanceId === targetId),
        []
    );

    const getEnemy = useCallback(
        (targetId: string): CombatEnemy | undefined => {
            const idx = findEnemyIndex(targetId);
            return idx >= 0 ? enemiesRef.current[idx] : undefined;
        },
        [findEnemyIndex]
    );

    const getAliveEnemies = useCallback(
        () => enemiesRef.current.filter((e) => !e.isDead && e.hp > 0),
        []
    );

    const getAliveEnemyIds = useCallback(
        () => getAliveEnemies().map((e) => e.instanceId),
        [getAliveEnemies]
    );

    const updateIntentFor = useCallback(
        (targetId: string, intent: CombatIntent | null) => {
            const idx = findEnemyIndex(targetId);
            if (idx < 0) return;
            setEnemyIntentsSafe((prev) => {
                const next = [...prev];
                next[idx] = intent;
                return next;
            });
            // 意图置空（例如敌人死亡）时同步清空内部队列。
            if (intent === null) {
                const queues = [...enemyIntentQueuesRef.current];
                queues[idx] = [];
                enemyIntentQueuesRef.current = queues;
            }
        },
        [findEnemyIndex, setEnemyIntentsSafe]
    );

    /**
     * 写入敌人的意图队列：内部保存完整队列，UI 只暴露队首。
     */
    const applyEnemyIntentQueue = useCallback(
        (enemyId: string, queue: CombatIntent[]) => {
            const idx = findEnemyIndex(enemyId);
            if (idx < 0) return;
            const queues = [...enemyIntentQueuesRef.current];
            queues[idx] = queue;
            enemyIntentQueuesRef.current = queues;
            setEnemyIntentsSafe((prev) => {
                const next = [...prev];
                next[idx] = queue[0] ?? null;
                return next;
            });
        },
        [findEnemyIndex, setEnemyIntentsSafe]
    );

    //--------------------------------------------------------------------------
    // 状态同步
    //--------------------------------------------------------------------------
    const clampCombatVitals = useCallback((dyn: CombatDynamicState): CombatDynamicState => {
        const nonNegative = (v: number) => Math.max(0, safeNumber(v));
        return {
            ...dyn,
            maxHp: nonNegative(dyn.maxHp),
            maxSanity: nonNegative(dyn.maxSanity),
            maxStamina: nonNegative(dyn.maxStamina),
            maxVigor: nonNegative(dyn.maxVigor),
            hp: clamp(dyn.hp, 0, dyn.maxHp),
            sanity: clamp(dyn.sanity, 0, dyn.maxSanity),
            stamina: clamp(dyn.stamina, 0, dyn.maxStamina),
            vigor: clamp(dyn.vigor, 0, dyn.maxVigor),
        };
    }, []);

    /**
     * 重算派生字段。
     * - 敌人（cthulhu / immovable）：四维直取，baseAttack = damage、免伤 = defense；
     * - 我方：五维 + 装备。
     * 实体数值因增益 / 减益变化时不重新生成序列。
     */
    const recalcDerivedDynamic = useCallback(
        (dyn: CombatDynamicState, isEnemy: boolean): CombatDynamicState => {
            if (isEnemy) {
                const enemyDyn = dyn as CombatDynamicState & {
                    damage?: number;
                    defense?: number;
                };
                const speed = Math.max(0, safeNumber(enemyDyn.speed));
                const base = Math.floor(speed / 5);
                const baseAttack = calculateEnemyBaseAttack(safeNumber(enemyDyn.damage));
                const basePartialReduction = clamp(
                    toReductionRatio(safeNumber(enemyDyn.defense)),
                    0,
                    CC.MAX_PARTIAL_REDUCTION
                );
                return {
                    ...dyn,
                    speed,
                    baseAttack,
                    basePartialReduction,
                    actionPoint: { ...dyn.actionPoint, base },
                };
            }

            const allyDyn = dyn as CombatAlly;
            const combatBonus = calculateCombatBonus(safeNumber(allyDyn.wisdom));
            const speed = Math.max(0, safeNumber(allyDyn.agility));
            const base = Math.floor(speed / 5);
            const baseAttack = calculatePlayerBaseAttack(allyDyn, combatBonus);
            const basePartialReduction = calculateBasePartialReduction(allyDyn.equipment);
            return {
                ...dyn,
                combatBonus,
                speed,
                baseAttack,
                basePartialReduction,
                actionPoint: { ...dyn.actionPoint, base },
            } as CombatDynamicState;
        },
        []
    );

    const finalizeDynamic = useCallback(
        (
            _old: CombatDynamicState,
            next: CombatDynamicState,
            _entityId: string,
            isEnemy: boolean
        ): CombatDynamicState => recalcDerivedDynamic(next, isEnemy),
        [recalcDerivedDynamic]
    );

    const syncAllyToOuter = useCallback(
        (targetId: string, dynamic: CombatDynamicState) => {
            // 完整快照已包含最终 hp/sanity（applyCombatToPlayerDynamic/NpcDynamic）。
            // 历史版本在此叠加增量（updatePlayer/updateCompanion），会被 React
            // 顺序复合导致双倍结算，已移除。
            // 该路径仅处理我方单位，运行时形状即 CombatAlly（含五维与装备）。
            const combatAlly = dynamic as CombatAlly;
            if (targetId === 'player') {
                setPlayerState((prev) => {
                    const next: PlayerState = {
                        ...prev,
                        dynamic: applyCombatToPlayerDynamic(prev.dynamic, combatAlly),
                    };
                    playerStateRef.current = next;
                    return next;
                });
                return;
            }
            setCompanionsSafe((prev) =>
                prev.map((c) =>
                    c.static.id === targetId
                        ? { ...c, dynamic: applyCombatToNpcDynamic(c.dynamic, combatAlly) }
                        : c
                )
            );
        },
        [setPlayerState, setCompanionsSafe]
    );

    const commitAlly = useCallback(
        (
            targetId: string,
            dynamic: CombatDynamicState
        ) => {
            const idx = findAllyIndex(targetId);
            if (idx < 0) return;
            const nextDynamic = clampCombatVitals(dynamic);
            const nextAllies = alliesRef.current.map((ally, i) =>
                i === idx ? ({ ...ally, ...nextDynamic } as CombatAlly) : ally
            ) as CombatAlly[];
            alliesRef.current = nextAllies;
            setAlliesSafe(nextAllies);
            syncAllyToOuter(targetId, nextDynamic);
        },
        [findAllyIndex, clampCombatVitals, setAlliesSafe, syncAllyToOuter]
    );

    const mutateAlly = useCallback(
        (targetId: string, mutator: (dyn: CombatDynamicState) => CombatDynamicState) => {
            const idx = findAllyIndex(targetId);
            if (idx < 0) return;
            const old = alliesRef.current[idx];
            const mutated = mutator(old);
            const next = clampCombatVitals(finalizeDynamic(old, mutated, targetId, false));
            commitAlly(targetId, next);
        },
        [findAllyIndex, clampCombatVitals, finalizeDynamic, commitAlly]
    );

    const commitEnemyInstance = useCallback(
        (updated: CombatEnemy) => {
            const next = enemiesRef.current.map((enemy) => {
                if (enemy.instanceId !== updated.instanceId) return enemy;
                const clamped = clampCombatVitals(updated);
                return {
                    ...enemy,
                    ...clamped,
                    instanceId: enemy.instanceId,
                    isDead: updated.isDead ?? enemy.isDead,
                } as CombatEnemy;
            });
            setEnemiesSafe(next);
        },
        [clampCombatVitals, setEnemiesSafe]
    );

    const mutateEnemyById = useCallback(
        (targetId: string, mutator: (dyn: CombatDynamicState) => CombatDynamicState) => {
            const idx = findEnemyIndex(targetId);
            if (idx < 0) return;
            const old = enemiesRef.current[idx];
            if (old.isDead || old.hp <= 0) return;
            const mutated = mutator(old);
            const finalized = finalizeDynamic(old, mutated, targetId, true);
            const next: CombatEnemy = {
                ...old,
                ...clampCombatVitals(finalized),
                instanceId: old.instanceId,
                isDead: false,
            };
            commitEnemyInstance(next);
        },
        [findEnemyIndex, finalizeDynamic, clampCombatVitals, commitEnemyInstance]
    );

    const revertPersistentEffects = useCallback(
        (targetId: string) => {
            const applyRevert = (dyn: CombatDynamicState): CombatDynamicState => {
                const list = dyn.status ?? [];
                if (!list.length) return dyn;
                let next = dyn;
                list
                    .filter((fx) => isAttributeType(fx.type) || isVitalType(fx.type))
                    .forEach((fx) => {
                        next = applyImmediateEffect(next, fx.type, -fx.value);
                    });
                return { ...next, status: [] };
            };
            if (isEnemyTarget(targetId)) {
                mutateEnemyById(targetId, applyRevert);
                return;
            }
            if (findAllyIndex(targetId) >= 0) {
                mutateAlly(targetId, applyRevert);
            }
        },
        [isEnemyTarget, mutateEnemyById, findAllyIndex, mutateAlly]
    );

    const cleanupAllEffects = useCallback(
        (includeEnemies = true) => {
            enemiesRef.current.forEach((enemy) => {
                if (includeEnemies) revertPersistentEffects(enemy.instanceId);
            });
            alliesRef.current.forEach((ally, idx) => {
                revertPersistentEffects(idx === 0 ? 'player' : ally.id);
            });
        },
        [revertPersistentEffects]
    );

    //--------------------------------------------------------------------------
    // 死亡与击杀
    //--------------------------------------------------------------------------
    const endCombatVictory = useCallback(() => {
        combatActiveRef.current = false;
        endInsertAction();
        playSfx('success');
        cleanupAllEffects(true);
        clearAllPendingDefense();
        fatigueRef.current = {};
        usedCounterRef.current = {};
        carryApRef.current = {};
        setEnemiesSafe([]);
        setEnemyIntentsSafe([]);
        setIsPlayerPhase(false);
        setBusy(false);
        setPlayerState((prev) => {
            const next: PlayerState = {
                ...prev,
                currentGameRound: { ...prev.currentGameRound, combatTurn: 0 },
            };
            playerStateRef.current = next;
            return next;
        });
        const playerDead = alliesRef.current.length > 0 && alliesRef.current[0].hp <= 0;
        // 恢复战前状态（庇护所战斗回到 SANCTUARY，而非无条件 PLAYING）。
        setGameState(
            playerDead ? GameState.GAME_OVER : (preCombatStateRef.current ?? GameState.PLAYING)
        );
    }, [
        cleanupAllEffects,
        clearAllPendingDefense,
        setEnemiesSafe,
        setEnemyIntentsSafe,
        setBusy,
        setGameState,
        setPlayerState,
    ]);

    const checkEnemyDeaths = useCallback((): boolean => {
        if (!combatActiveRef.current) return false;
        const dead = enemiesRef.current.filter((e) => !e.isDead && e.hp <= 0);
        if (!dead.length) return false;

        dead.forEach((d) => {
            addCombatLog(`[实体抹除] ${d.name}`);
            playSfx('combat_crit');
            clearPendingDefense(d.instanceId);
            delete fatigueRef.current[d.instanceId];
            delete usedCounterRef.current[d.instanceId];
            delete carryApRef.current[d.instanceId];
            if (insertActionRef.current?.unitId === d.instanceId) endInsertAction();

            // 敌人已无五维：按四维与体量估算击杀经验（TODO 数值迁移时确认）。
            const xp = 20 + Math.floor(d.baseAttack + d.speed + safeNumber(d.maxHp) / 5);
            addCombatLog(`提取数据：+${xp} XP`);

            const lootInstances: ItemInstance[] = [];
            (d.lootTable ?? []).forEach((entry) => {
                if (Math.random() <= safeNumber(entry.dropProbability)) {
                    const { dropProbability: _dp, ...itemTemplate } = entry;
                    void _dp;
                    lootInstances.push(createItemInstance(itemTemplate as ItemTemplate));
                }
            });
            lootInstances.forEach((item) => addCombatLog(`战利品：${item.name}`));

            setPlayerState((prev) => {
                const inventory = lootInstances.reduce(addItemToInventory, prev.dynamic.inventory);
                const next: PlayerState = {
                    ...prev,
                    killCount: prev.killCount + 1,
                    dynamic: { ...prev.dynamic, xp: prev.dynamic.xp + xp, inventory },
                };
                playerStateRef.current = next;
                return next;
            });

            updateIntentFor(d.instanceId, null);
        });

        setEnemiesSafe((prev) =>
            prev.map((e) =>
                dead.some((d) => d.instanceId === e.instanceId)
                    ? { ...e, hp: 0, isDead: true }
                    : e
            )
        );

        if (!enemiesRef.current.some((e) => !e.isDead && e.hp > 0)) {
            endCombatVictory();
        }
        return true;
    }, [
        addCombatLog,
        clearPendingDefense,
        setPlayerState,
        updateIntentFor,
        setEnemiesSafe,
        endCombatVictory,
    ]);

    const checkAllyDeath = useCallback((): boolean => {
        const list = alliesRef.current;
        if (!list.length) return false;
        if (!combatActiveRef.current) return list.some((a) => a.hp <= 0);

        let playerDead = false;
        const survivors: CombatAlly[] = [];
        const deadCompanionIds: string[] = [];

        list.forEach((ally, idx) => {
            const tid = toTargetId(ally, idx);
            if (ally.hp <= 0) {
                if (idx === 0) {
                    playerDead = true;
                    addCombatLog('[系统警报] 操作者生命体征归零，指令链断裂。');
                    playSfx('fail');
                } else {
                    deadCompanionIds.push(ally.id);
                    addCombatLog(`[序列中断] ${ally.name} 生命体征归零，强制脱队。`);
                    playSfx('fail');
                    setActiveAllyId((prev) => (prev === tid ? 'player' : prev));
                    clearPendingDefense(tid);
                    delete fatigueRef.current[tid];
                    delete usedCounterRef.current[tid];
                    delete carryApRef.current[tid];
                    if (insertActionRef.current?.unitId === tid) endInsertAction();
                }
            } else {
                survivors.push(ally);
            }
        });

        if (playerDead) {
            cleanupAllEffects(true);
            clearAllPendingDefense();
            combatActiveRef.current = false;
            setEnemiesSafe([]);
            setEnemyIntentsSafe([]);
            setIsPlayerPhase(false);
            setBusy(false);
            setPlayerState((prev) => {
                const next: PlayerState = {
                    ...prev,
                    currentGameRound: { ...prev.currentGameRound, combatTurn: 0 },
                };
                playerStateRef.current = next;
                return next;
            });
            setGameState(GameState.GAME_OVER);
            return true;
        }

        if (survivors.length !== list.length) {
            alliesRef.current = survivors;
            setAlliesSafe(survivors);
        }
        if (deadCompanionIds.length > 0) {
            setCompanionsSafe((prev) => prev.filter((c) => !deadCompanionIds.includes(c.static.id)));
        }
        return false;
    }, [
        addCombatLog,
        cleanupAllEffects,
        clearPendingDefense,
        clearAllPendingDefense,
        setEnemiesSafe,
        setEnemyIntentsSafe,
        setBusy,
        setGameState,
        setActiveAllyId,
        setAlliesSafe,
        setCompanionsSafe,
        setPlayerState,
    ]);

    //--------------------------------------------------------------------------
    // 友方结果序列准备与抽取
    //--------------------------------------------------------------------------
    /**
     * 友方序列准备。
     * 序列耗尽时扣除一定量 stamina（maxStamina × 10%），随后重新生成。
     * 若扣除后 stamina 仍不足以生成序列（长度 0），不扣除 stamina，实体无法行动。
     */
    const prepareSequence = useCallback(
        (dyn: CombatDynamicState, entityId: string, isEnemy: boolean): CombatDynamicState => {
            // 该路径仅用于我方序列准备：运行时形状为 CombatAlly（五维 + 装备）。
            let next = recalcDerivedDynamic(dyn, isEnemy) as CombatAlly;
            const atkLen = next.resultSequence.attackResult.length;
            const defLen = next.resultSequence.defenseResult.length;

            if (atkLen === 0 || defLen === 0) {
                const staminaCost = getExhaustStaminaCost(next.maxStamina);
                const afterStamina = clamp(next.stamina - staminaCost, 0, next.maxStamina);
                const newLength = getSequenceLength(afterStamina);

                if (newLength <= 0) {
                    return { ...next, resultSequence: { attackResult: [], defenseResult: [] } };
                }

                next = { ...next, stamina: afterStamina };
                fatigueRef.current[entityId] = (fatigueRef.current[entityId] ?? 0) + 1;

                const full = generateResultSequence(
                    {
                        agility: next.agility,
                        perception: next.perception,
                        stamina: next.stamina,
                        fatigueCount: fatigueRef.current[entityId],
                    },
                    next.baseAttack,
                    next.basePartialReduction
                );
                return { ...next, resultSequence: full };
            }

            if (atkLen !== defLen) {
                const len = Math.min(atkLen, defLen);
                return {
                    ...next,
                    resultSequence: {
                        attackResult: next.resultSequence.attackResult.slice(0, len),
                        defenseResult: next.resultSequence.defenseResult.slice(0, len),
                    },
                };
            }
            return next;
        },
        [recalcDerivedDynamic]
    );

    /** 友方攻击：消费序列，同时推进攻击与防御序列。 */
    const drawAttackResult = useCallback(
        <T extends CombatAlly>(
            entity: T,
            entityId: string
        ): { attackResult: AttackResult; updatedEntity: T } => {
            const prepared = prepareSequence(entity, entityId, false);
            const result =
                prepared.resultSequence.attackResult[0] ?? (['miss', 0] as AttackResult);
            return {
                attackResult: result,
                updatedEntity: {
                    ...entity,
                    ...prepared,
                    resultSequence: {
                        attackResult: prepared.resultSequence.attackResult.slice(1),
                        defenseResult: prepared.resultSequence.defenseResult.slice(1),
                    },
                } as T,
            };
        },
        [prepareSequence]
    );

    /**
     * 友方防御：消费序列，同时推进攻击与防御序列。
     * 防御结果储存进 pendingDefense 待消费。
     */
    const drawDefenseResult = useCallback(
        <T extends CombatAlly>(
            entity: T,
            entityId: string
        ): { defenseResult: DefenseResult; updatedEntity: T } => {
            const prepared = prepareSequence(entity, entityId, false);
            const result =
                prepared.resultSequence.defenseResult[0] ?? (['fail', 0] as DefenseResult);
            return {
                defenseResult: result,
                updatedEntity: {
                    ...entity,
                    ...prepared,
                    resultSequence: {
                        attackResult: prepared.resultSequence.attackResult.slice(1),
                        defenseResult: prepared.resultSequence.defenseResult.slice(1),
                    },
                } as T,
            };
        },
        [prepareSequence]
    );

    //--------------------------------------------------------------------------
    // 伤害结算
    // 最终免伤比 = basePartialReduction + 裁定值（0 ~ 0.999）
    // 护盾位于防御结果之后、生命值之前
    // 不在此累积蓄反：蓄反按「每次攻击」在攻击发生处结算（executeTactic / enemyAttack）
    //--------------------------------------------------------------------------
    const dealDamageToEnemy = useCallback(
        (targetId: string, raw: number): number => {
            const enemy = getEnemy(targetId);
            if (!enemy || enemy.isDead || enemy.hp <= 0) return 0;

            const defense = takePendingDefense(targetId);
            let finalReduction = safeNumber(enemy.basePartialReduction);
            if (defense) {
                if (defense[0] === 'dodge') {
                    playSfx('combat_miss');
                    return 0;
                }
                if (defense[0] === 'partial') {
                    finalReduction += clamp(defense[1], 0, CC.MAX_PARTIAL_REDUCTION);
                }
            }
            finalReduction = clamp(finalReduction, 0, CC.MAX_PARTIAL_REDUCTION);

            const mitigated = Math.max(0, safeNumber(raw) * (1 - finalReduction));
            const { newShield, actualDmg } = processDamageDeduction(enemy.shield, mitigated);
            const actual = fix1(actualDmg);

            const dyn: CombatDynamicState = {
                ...enemy,
                shield: newShield,
                hp: fix1(enemy.hp - actual),
            };

            commitEnemyInstance({
                ...enemy,
                ...dyn,
                instanceId: enemy.instanceId,
                isDead: enemy.isDead,
            });

            playSfx(actual > 0 ? 'combat_hit' : 'combat_block');
            checkEnemyDeaths();
            return actual;
        },
        [
            getEnemy,
            takePendingDefense,
            commitEnemyInstance,
            checkEnemyDeaths,
        ]
    );

    const dealDamageToAlly = useCallback(
        (targetId: string, raw: number): number => {
            const idx = findAllyIndex(targetId);
            if (idx < 0) return 0;
            const ally = alliesRef.current[idx];

            const defense = takePendingDefense(targetId);
            let finalReduction = safeNumber(ally.basePartialReduction);
            if (defense) {
                if (defense[0] === 'dodge') {
                    playSfx('combat_miss');
                    return 0;
                }
                if (defense[0] === 'partial') {
                    finalReduction += clamp(defense[1], 0, CC.MAX_PARTIAL_REDUCTION);
                }
            }
            finalReduction = clamp(finalReduction, 0, CC.MAX_PARTIAL_REDUCTION);

            const mitigated = Math.max(0, safeNumber(raw) * (1 - finalReduction));
            const { newShield, actualDmg } = processDamageDeduction(ally.shield, mitigated);
            const actual = fix1(actualDmg);

            const dyn: CombatDynamicState = {
                ...ally,
                shield: newShield,
                hp: fix1(ally.hp - actual),
            };

            commitAlly(targetId, dyn);
            playSfx(actual > 0 ? 'combat_hit' : 'combat_block');
            checkAllyDeath();
            return actual;
        },
        [
            findAllyIndex,
            takePendingDefense,
            commitAlly,
            checkAllyDeath,
        ]
    );

    /**
     * instant 真实伤害：不参与任何正常结算，直接扣 hp。
     * 无视护盾、免伤、防御判定。不触发蓄反。不消费结果序列。
     */
    const dealInstantDamageToEnemy = useCallback(
        (targetId: string, damage: number): number => {
            const enemy = getEnemy(targetId);
            if (!enemy || enemy.isDead || enemy.hp <= 0) return 0;
            const actual = Math.max(0, Math.floor(safeNumber(damage)));
            if (actual <= 0) return 0;
            const nextHp = Math.max(0, enemy.hp - actual);
            commitEnemyInstance({
                ...enemy,
                hp: nextHp,
                isDead: nextHp <= 0,
            });
            playSfx('combat_crit');
            checkEnemyDeaths();
            return actual;
        },
        [getEnemy, commitEnemyInstance, checkEnemyDeaths]
    );

    //--------------------------------------------------------------------------
    // 效果应用与 tick
    //--------------------------------------------------------------------------
    const addEffect = useCallback(
        (
            targetId: string,
            rawType: ActionEffectType,
            rawValue: number,
            duration = 0,
            sourceId = 'system',
            sourceName = 'System'
        ) => {
            const type = normalizeEffectType(rawType);
            const value = round1(rawValue);
            if (value === 0) return;

            const isAttrOrVital = isAttributeType(type) || isVitalType(type);
            const isOverTime = isOverTimeEffect(type);
            const shouldStore = duration > 0 && (isAttrOrVital || isOverTime);
            const statusItem: CombatStatus = { sourceId, sourceName, type, value, duration };

            const apply = (dyn: CombatDynamicState): CombatDynamicState => {
                const applied = applyImmediateEffect(dyn, type, value);
                if (!shouldStore) return applied;
                return { ...applied, status: storeStatusItem(applied.status ?? [], statusItem) };
            };

            if (isEnemyTarget(targetId)) {
                const enemy = getEnemy(targetId);
                if (!enemy || enemy.isDead || enemy.hp <= 0) return;
                mutateEnemyById(targetId, apply);
                playSfx(value < 0 || type === 'ap_reduce' ? 'combat_debuff' : 'combat_buff');
                checkEnemyDeaths();
                return;
            }

            const ally = getAlly(targetId);
            if (!ally || ally.hp <= 0) return;
            mutateAlly(targetId, apply);
            playSfx(value < 0 || type === 'ap_reduce' ? 'combat_debuff' : 'combat_buff');
            checkAllyDeath();
        },
        [
            mutateEnemyById,
            mutateAlly,
            isEnemyTarget,
            getEnemy,
            getAlly,
            checkEnemyDeaths,
            checkAllyDeath,
        ]
    );

    const tickEffects = useCallback(
        (targetId: string, phase: 'start' | 'end') => {
            const target = isEnemyTarget(targetId) ? getEnemy(targetId) : getAlly(targetId);
            if (!target || !target.status || !target.status.length) return;

            if (phase === 'start') {
                const startEffects = target.status.filter((fx) => isOverTimeEffect(fx.type));
                if (!startEffects.length) return;
                const apply = (dyn: CombatDynamicState) =>
                    startEffects.reduce((acc, fx) => applyImmediateEffect(acc, fx.type, fx.value), dyn);
                if (isEnemyTarget(targetId)) mutateEnemyById(targetId, apply);
                else mutateAlly(targetId, apply);
                if (isEnemyTarget(targetId)) checkEnemyDeaths();
                else checkAllyDeath();
                return;
            }

            const applyEndTick = (dyn: CombatDynamicState): CombatDynamicState => {
                const remaining: CombatStatus[] = [];
                const expired: CombatStatus[] = [];
                (dyn.status ?? []).forEach((fx) => {
                    const nextDuration = fx.duration - 1;
                    if (nextDuration <= 0) expired.push(fx);
                    else remaining.push({ ...fx, duration: nextDuration });
                });
                let next = dyn;
                expired
                    .filter((fx) => isAttributeType(fx.type) || isVitalType(fx.type))
                    .forEach((fx) => {
                        next = applyImmediateEffect(next, fx.type, -fx.value);
                    });
                return { ...next, status: remaining };
            };

            if (isEnemyTarget(targetId)) mutateEnemyById(targetId, applyEndTick);
            else mutateAlly(targetId, applyEndTick);
            if (isEnemyTarget(targetId)) checkEnemyDeaths();
            else checkAllyDeath();
        },
        [
            isEnemyTarget,
            getEnemy,
            getAlly,
            mutateEnemyById,
            mutateAlly,
            checkEnemyDeaths,
            checkAllyDeath,
        ]
    );

    //--------------------------------------------------------------------------
    // 蓄反 / 差反预支
    //--------------------------------------------------------------------------
    const requestCounterAdvance = useCallback(
        async (request: CounterAdvanceRequest): Promise<boolean> => {
            if (!counterDecision) return false;
            try {
                return await counterDecision(request);
            } catch {
                return false;
            }
        },
        [counterDecision]
    );

    /**
     * 蓄反 / 差反预支结算（统一处理敌我双方）。
     *
     * 规则 5：预支成本优先消耗当前行动点，不足部分记入下回合 advanced 债务；
     * 蓄反额外从「owner × trigger」单槽消耗 5n 点蓄反值（不跨槽扣减）。
     * 收益：返回本次可立即行动的次数——蓄反 n 次、差反 1 次，
     * 由「立即行动」窗口（runInsertAction）执行标准后续行为。
     */
    const grantCounterAdvance = useCallback(
        (
            unitId: string,
            kind: CounterAdvanceRequest['kind'],
            stacks: number,
            triggerId: string
        ): number => {
            const isAllyUnit = !isEnemyTarget(unitId);
            const name = (isAllyUnit ? getAlly(unitId)?.name : getEnemy(unitId)?.name) ?? unitId;
            const cost = kind === 'accumulate' ? stacks : 2;
            const chances = kind === 'accumulate' ? stacks : 1;
            const consume = kind === 'accumulate' ? stacks * CC.ACCUMULATE_COUNTER_THRESHOLD : 0;
            const mutateUnit = isAllyUnit ? mutateAlly : mutateEnemyById;

            mutateUnit(unitId, (dyn) => {
                const spendNow = Math.min(Math.max(0, safeNumber(dyn.actionPoint.current)), cost);
                const debt = cost - spendNow;
                const next =
                    consume > 0 ? consumeCounterPair(dyn, unitId, triggerId, consume) : dyn;
                return {
                    ...next,
                    actionPoint: {
                        ...next.actionPoint,
                        current: Math.max(0, next.actionPoint.current - spendNow),
                        advanced: next.actionPoint.advanced + debt,
                    },
                };
            });

            usedCounterRef.current[unitId] = true;
            addCombatLog(
                kind === 'accumulate'
                    ? `[蓄反] ${name} 预支 ${cost} 点行动力，获得 ${chances} 次立即行动机会。`
                    : `[差反] ${name} 预支 2 点行动力，获得 1 次立即行动机会。`
            );
            playSfx('tactic_execute');
            return chances;
        },
        [isEnemyTarget, getAlly, getEnemy, mutateAlly, mutateEnemyById, addCombatLog]
    );

    /** 该单位是否跳过某类预支询问（跳过 = 自动拒绝，不弹询问）。 */
    const isCounterSkipped = useCallback(
        (unitId: string, kind: CounterAdvanceRequest['kind']): boolean =>
            counterSkipRef.current[unitId]?.[kind] === true,
        []
    );

    /** 设置 / 取消跳过开关（玩家方单位卡片上的「跳过询问」）。 */
    const setCounterSkipFor = useCallback(
        (unitId: string, kind: CounterAdvanceRequest['kind'], skip: boolean) => {
            const prev = counterSkipRef.current;
            counterSkipRef.current = {
                ...prev,
                [unitId]: { ...(prev[unitId] ?? { accumulate: false, differential: false }), [kind]: skip },
            };
            setCounterSkip(counterSkipRef.current);
        },
        []
    );

    /** 结束「立即行动」窗口并放行被挂起的主流程（主流程在 runInsertAction 中 await）。 */
    const endInsertAction = useCallback(() => {
        if (!insertActionRef.current) return;
        insertActionRef.current = null;
        setInsertAction(null);
        const resolver = insertActionResolverRef.current;
        insertActionResolverRef.current = null;
        if (resolver) resolver();
    }, []);

    /** 消耗一次立即行动机会；机会归零时自动关闭窗口。 */
    const consumeInsertChance = useCallback(() => {
        const current = insertActionRef.current;
        if (!current) return;
        if (current.chancesLeft <= 1) {
            endInsertAction();
            return;
        }
        insertActionRef.current = { ...current, chancesLeft: current.chancesLeft - 1 };
        setInsertAction(insertActionRef.current);
    }, [endInsertAction]);

    //--------------------------------------------------------------------------
    // 行动点恢复
    //--------------------------------------------------------------------------
    /**
     * 己方回合开始：
     * 基础回复 + 上回合未蓄反/差反额外 1 点 + 蓄反转行动点。
     */
    const restoreAllyAP = useCallback(
        (targetId: string) => {
            mutateAlly(targetId, (dyn) => {
                const derived = recalcDerivedDynamic(dyn, false);
                const bonus = usedCounterRef.current[targetId] ? 0 : 1;
                const carry = carryApRef.current[targetId] ?? 0;
                const current = Math.max(
                    0,
                    derived.actionPoint.base + bonus + carry - derived.actionPoint.advanced
                );
                usedCounterRef.current[targetId] = false;
                carryApRef.current[targetId] = 0;
                return {
                    ...derived,
                    actionPoint: { ...derived.actionPoint, current, advanced: 0 },
                };
            });
        },
        [mutateAlly, recalcDerivedDynamic]
    );

    /**
     * 敌方回合开始：基础回复 + 上回合未蓄反 / 差反额外 1 点 + 蓄反转行动点。
     */
    const restoreEnemyAP = useCallback(
        (combatId: string) => {
            mutateEnemyById(combatId, (dyn) => {
                const derived = recalcDerivedDynamic(dyn, true);
                const bonus = usedCounterRef.current[combatId] ? 0 : 1;
                const carry = carryApRef.current[combatId] ?? 0;
                const current = Math.max(
                    0,
                    derived.actionPoint.base + bonus + carry - derived.actionPoint.advanced
                );
                usedCounterRef.current[combatId] = false;
                carryApRef.current[combatId] = 0;
                return {
                    ...derived,
                    actionPoint: { ...derived.actionPoint, current, advanced: 0 },
                };
            });
        },
        [mutateEnemyById, recalcDerivedDynamic]
    );

    //--------------------------------------------------------------------------
    // 敌方意图与行动
    //--------------------------------------------------------------------------
    /**
     * 按规则从存活我方单位中选定目标。
     *
     * 规则：
     * 1. 距离自身最近者优先（按战线坐标差的绝对值）。
     * 2. 多个单位等距（例如一左一右、距离相同）时，取绝对血量更少者。
     * 3. 血量仍完全相同则随机。
     *
     * @param onlyInRange 为 true 时仅考虑敌人攻击距离内的候选（用于攻击目标选定）。
     */
    const pickTargetByRule = useCallback(
        (enemy: CombatEnemy, allyList: CombatAlly[], onlyInRange: boolean): string | undefined => {
            const enemyPos = positionsRef.current[enemy.instanceId];
            if (typeof enemyPos !== 'number') return undefined;
            const range = safeNumber(enemy.range, CC.ENEMY_DEFAULT_RANGE);

            const candidates = allyList
                .map((ally, idx) => ({ ally, id: toTargetId(ally, idx) }))
                .filter(({ ally }) => safeNumber(ally.hp) > 0);

            let nearestDistance = Number.POSITIVE_INFINITY;
            let nearest: Array<{ ally: CombatAlly; id: string }> = [];
            for (const candidate of candidates) {
                const pos = positionsRef.current[candidate.id];
                if (typeof pos !== 'number') continue;
                const distance = Math.abs(enemyPos - pos);
                if (onlyInRange && !isWithinRange(range, distance)) continue;
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearest = [candidate];
                } else if (distance === nearestDistance) {
                    nearest.push(candidate);
                }
            }
            if (!nearest.length) return undefined;
            if (nearest.length === 1) return nearest[0].id;

            let lowestHp = Number.POSITIVE_INFINITY;
            let lowest: Array<{ ally: CombatAlly; id: string }> = [];
            for (const candidate of nearest) {
                const hp = safeNumber(candidate.ally.hp);
                if (hp < lowestHp) {
                    lowestHp = hp;
                    lowest = [candidate];
                } else if (hp === lowestHp) {
                    lowest.push(candidate);
                }
            }
            if (lowest.length === 1) return lowest[0].id;
            return pickOne(lowest)?.id;
        },
        []
    );

    /**
     * 生成敌人本轮的意图队列。
     *
     * 攻击意图只保存「预期目标」用于 UI 展示；
     * 真正是否攻击由执行时动态判定：
     * 射程内无可选目标就在攻击意图前插入接近意图，接近消耗后回到攻击意图再判定，
     * 如此循环，直到射程内出现可选目标才落刀。
     */
    const generateEnemyIntentQueue = useCallback(
        (enemy: CombatEnemy, allyList: CombatAlly[]): CombatIntent[] => {
            // 炮塔类（immovable）：无法移动，意图随「射程内是否存在目标」切换，不插入接近。
            if (enemy.type === 'immovable') {
                const targetId = pickTargetByRule(enemy, allyList, true);
                return targetId
                    ? [
                        {
                            type: 'attack',
                            desc: `${fix1(enemy.baseAttack)}`,
                            value: fix1(enemy.baseAttack),
                            targetId,
                        },
                    ]
                    : [{ type: 'observe', desc: '待机' }];
            }

            const dist = enemy.intentDistribution;
            const entries = Object.entries(dist ?? {});
            const total = entries.reduce((sum, [, w]) => sum + Math.max(0, safeNumber(w)), 0);

            let type: IntentType = 'attack';
            if (entries.length > 0) {
                let roll = Math.random() * Math.max(0, total);
                for (const [t, w] of entries) {
                    roll -= Math.max(0, safeNumber(w));
                    if (roll <= 0) {
                        type = t as IntentType;
                        break;
                    }
                }
            }

            const alive = allyList.filter((a) => a.hp > 0);
            const target = alive.length > 0 ? pickOne(alive) : undefined;
            if (!target) return [{ type: 'observe', desc: '观察' }];

            const tIdx = allyList.findIndex((a) => a.id === target.id);
            const fallbackTargetId =
                type === 'buff' || type === 'defense'
                    ? enemy.instanceId
                    : toTargetId(target, tIdx);

            let desc = '';
            let value: number | undefined;
            switch (type) {
                case 'attack':
                    value = fix1(enemy.baseAttack);
                    desc = `${value}`;
                    break;
                case 'defense':
                    desc = '布设防御判定';
                    break;
                case 'buff':
                    // 敌人无智慧维度：增益 / 减益幅度取固定基准。
                    value = 3;
                    desc = `+${value}`;
                    break;
                case 'debuff':
                    value = 2;
                    desc = `-${value}`;
                    break;
                default:
                    desc = '观察';
                    break;
            }

            // 攻击意图不预先绑定接近步骤：
            // 执行时若射程内无可选目标，会动态向队首插入「接近意图」，直到有目标可打。
            if (type === 'attack') {
                const expectedTargetId =
                    pickTargetByRule(enemy, allyList, false) ?? fallbackTargetId;
                return [{ type: 'attack', desc, value, targetId: expectedTargetId }];
            }

            return [{ type, desc, targetId: fallbackTargetId, value }];
        },
        [pickTargetByRule]
    );

    const chooseAliveTarget = useCallback(
        (preferred?: string) => {
            const alive = getAliveAllyTargetIds();
            if (preferred && alive.includes(preferred)) return preferred;
            return alive[0] ?? 'player';
        },
        [getAliveAllyTargetIds]
    );

    /** 敌人朝目标移动一步（受战线边界限制）；返回是否发生位移。 */
    const stepEnemyToward = useCallback(
        (enemyId: string, targetId: string): boolean => {
            const from = positionsRef.current[enemyId];
            const to = positionsRef.current[targetId];
            if (typeof from !== 'number' || typeof to !== 'number') return false;
            const step = Math.sign(to - from);
            if (step === 0) return false;
            const next = clamp(from + step, CC.BATTLE_LINE_MIN, CC.BATTLE_LINE_MAX);
            if (next === from) return false;
            setPositionsSafe({ ...positionsRef.current, [enemyId]: next });
            return true;
        },
        [setPositionsSafe]
    );

    /** 敌人攻击：动态计算攻击结果，不消费预生成序列。 */
    const enemyAttack = useCallback(
        (enemyId: string, targetId: string) => {
            const enemy = getEnemy(enemyId);
            if (!enemy || enemy.isDead || enemy.hp <= 0) return;

            // 蓄反：攻击方（敌人）速度低于受击方时，每次攻击（无论是否命中 / 被闪避）
            // 都向「受击方 × 攻击方」槽按 |速度差| 累积。
            const targetAlly = getAlly(targetId);
            if (targetAlly && safeNumber(targetAlly.speed) > safeNumber(enemy.speed)) {
                mutateAlly(targetId, (dyn) =>
                    addAccumulateCounter(
                        dyn,
                        targetId,
                        enemyId,
                        Math.abs(safeNumber(dyn.speed) - safeNumber(enemy.speed))
                    )
                );
            }

            const targetName = getAlly(targetId)?.name ?? targetId;
            const fatigue = fatigueRef.current[enemyId] ?? 0;
            const attackResult = rollDynamicAttackResult(enemy.baseAttack, fatigue);

            if (attackResult[0] === 'miss') {
                addCombatLog('[未命中] 敌对实体计算落空。');
                playSfx('combat_miss');
                return;
            }

            const raw = Math.max(0, attackResult[1]);
            const actual = dealDamageToAlly(targetId, raw);
            const label =
                attackResult[0] === 'crit'
                    ? '暴击'
                    : attackResult[0] === 'graze'
                        ? '擦伤'
                        : '命中';

            if (actual > 0) {
                addCombatLog(`[${label}] ${targetName} 承受 ${actual} 点穿透伤害。`);
            } else {
                addCombatLog(`[偏转] ${targetName} 未受到实质伤害。`);
            }
        },
        [getEnemy, getAlly, addCombatLog, dealDamageToAlly, mutateAlly]
    );

    /**
     * 开启「立即行动」窗口：预支结算后的标准后续行为。
     *
     * - 我方（玩家方）：挂起主流程，等待玩家以该单位自由行动
     *   （战术 / 移动，不消耗行动点），机会耗尽或玩家手动结束后回归原流程；
     * - 敌方：由引擎立即执行对应次数的行动（射程内攻击，无目标则向最近我方逼近一步），
     *   每次攻击后同样即时询问受击方是否预支（与常规攻击一致）。
     */
    const runInsertAction = useCallback(
        async (unitId: string, chances: number) => {
            if (!combatActiveRef.current || chances <= 0) return;
            const isAllyUnit = !isEnemyTarget(unitId);

            if (!isAllyUnit) {
                for (let i = 0; i < chances; i += 1) {
                    if (!combatActiveRef.current) return;
                    const enemy = getEnemy(unitId);
                    if (!enemy || enemy.isDead || enemy.hp <= 0) return;

                    const targetId = pickTargetByRule(enemy, alliesRef.current, true);
                    if (targetId) {
                        enemyAttack(unitId, targetId);
                        if (checkAllyDeath()) return;
                        // 受击方即时应答：蓄反 / 差反预支（立即行动中的攻击同样询问）。
                        await counterAskRef.current?.(unitId, targetId);
                        if (!combatActiveRef.current) return;
                        if (checkAllyDeath()) return;
                    } else {
                        const approachId = pickTargetByRule(enemy, alliesRef.current, false);
                        if (!approachId || !stepEnemyToward(unitId, approachId)) {
                            addCombatLog(`[预支] ${enemy.name} 受战线限制，立即行动无法展开。`);
                            return;
                        }
                        addCombatLog(`[预支行动] ${enemy.name} 立即逼近目标。`);
                    }
                }
                return;
            }

            await new Promise<void>((resolve) => {
                // 防御性处理：极端情况下若已有悬挂窗口，先放行旧流程，避免旧 Promise 永久挂起。
                insertActionResolverRef.current?.();
                insertActionRef.current = { unitId, chancesLeft: chances };
                insertActionResolverRef.current = resolve;
                setInsertAction(insertActionRef.current);
                addCombatLog(
                    `[预支行动] ${getAlly(unitId)?.name ?? unitId} 立即行动 ${chances} 次。`
                );
            });
        },
        [
            isEnemyTarget,
            getEnemy,
            getAlly,
            pickTargetByRule,
            enemyAttack,
            checkAllyDeath,
            stepEnemyToward,
            addCombatLog,
        ]
    );

    /**
     * 攻击结算后的即时应答：受击方当场选择是否预支行动力换取立即行动机会。
     *
     * - 蓄反：仅看本次攻击双方的「owner × trigger」槽——该槽达 5n 且 n 点预支全部可承受
     *   → 立即询问（消耗该槽 5n 点蓄反值，换 n 次行动机会）；
     *   单槽不足 5n、或 n 点预支会使下回合行动为负时，引擎不发起询问（不降级为更小栈数）；
     * - 差反：速度 ≥ 10 且可承受 2 点预支 → 每次被攻击都询问（换 1 次行动机会）；
     * - 顺序：优先蓄反，后差反；开关关闭 / 单位跳过时自动拒绝；
     * - 接受后开启「立即行动」窗口，由 runInsertAction 执行标准后续行为。
     */
    const maybeCounterAdvancesAfterHit = useCallback(
        async (attackerId: string, targetId: string) => {
            if (!combatActiveRef.current) return;
            const isAllyUnit = !isEnemyTarget(targetId);
            const readUnit = () => (isAllyUnit ? getAlly(targetId) : getEnemy(targetId));

            /** 该单位当前可承受的预支点数（现金 + 可借额度，保证下回合不为负）。 */
            const affordableOf = (unit: CombatDynamicState): number =>
                Math.max(
                    0,
                    safeNumber(unit.actionPoint.current) +
                        Math.max(
                            0,
                            safeNumber(unit.actionPoint.base) - safeNumber(unit.actionPoint.advanced)
                        )
                );

            // —— 优先：蓄反（按本次攻击双方的单槽判定，不跨槽合并）——
            let unit = readUnit();
            if (
                unit &&
                unit.hp > 0 &&
                (isAllyUnit || accumulateCounterEnabled) &&
                !isCounterSkipped(targetId, 'accumulate')
            ) {
                const slotValue = getCounterPairValue(unit, targetId, attackerId);
                const stacks = Math.floor(slotValue / CC.ACCUMULATE_COUNTER_THRESHOLD);
                if (stacks > 0 && affordableOf(unit) >= stacks) {
                    const ok = await requestCounterAdvance({
                        kind: 'accumulate',
                        actorId: targetId,
                        advancePoints: stacks,
                        availableCounter: slotValue,
                        threshold: CC.ACCUMULATE_COUNTER_THRESHOLD,
                    });
                    if (!mountedRef.current || !combatActiveRef.current) return;
                    if (ok) {
                        const chances = grantCounterAdvance(
                            targetId,
                            'accumulate',
                            stacks,
                            attackerId
                        );
                        await runInsertAction(targetId, chances);
                        if (!combatActiveRef.current) return;
                    }
                }
            }

            // —— 后：差反 ——
            unit = readUnit();
            if (
                unit &&
                unit.hp > 0 &&
                (isAllyUnit || differentialCounterEnabled) &&
                safeNumber(unit.speed) >= CC.DIFFERENTIAL_COUNTER_SPEED &&
                !isCounterSkipped(targetId, 'differential') &&
                affordableOf(unit) >= 2
            ) {
                const ok = await requestCounterAdvance({
                    kind: 'differential',
                    actorId: targetId,
                    advancePoints: 1,
                    availableCounter: getCounterPairValue(unit, targetId, attackerId),
                    threshold: 0,
                });
                if (!mountedRef.current || !combatActiveRef.current) return;
                if (ok) {
                    const chances = grantCounterAdvance(targetId, 'differential', 1, attackerId);
                    await runInsertAction(targetId, chances);
                    if (!combatActiveRef.current) return;
                }
            }
        },
        [
            isEnemyTarget,
            accumulateCounterEnabled,
            differentialCounterEnabled,
            getAlly,
            getEnemy,
            isCounterSkipped,
            requestCounterAdvance,
            grantCounterAdvance,
            runInsertAction,
        ]
    );

    /** 供 runInsertAction（定义在前）回调本函数：立即行动中的攻击同样即时询问受击方。 */
    useEffect(() => {
        counterAskRef.current = maybeCounterAdvancesAfterHit;
        return () => {
            counterAskRef.current = null;
        };
    }, [maybeCounterAdvancesAfterHit]);

    const beginPlayerPhase = useCallback(async () => {
        if (!combatActiveRef.current || !getAliveEnemies().length) return;

        setPlayerState((prev) => {
            const next: PlayerState = {
                ...prev,
                currentGameRound: {
                    ...prev.currentGameRound,
                    combatTurn: prev.currentGameRound.combatTurn + 1,
                },
            };
            playerStateRef.current = next;
            return next;
        });

        alliesRef.current.forEach((ally, idx) => {
            const tid = toTargetId(ally, idx);
            clearPendingDefense(tid);
            if (ally.hp <= 0) return;
            mutateAlly(tid, (dyn) => ({ ...dyn, shield: 0 }));
            tickEffects(tid, 'start');
            restoreAllyAP(tid);
        });

        if (checkAllyDeath()) return;

        setIsPlayerPhase(true);
        setBusy(false);
    }, [
        getAliveEnemies,
        setPlayerState,
        clearPendingDefense,
        mutateAlly,
        tickEffects,
        restoreAllyAP,
        checkAllyDeath,
        setBusy,
    ]);

    const executeEnemyPhase = useCallback(async () => {
        if (!combatActiveRef.current) return;
        const list = enemiesRef.current;

        for (let idx = 0; idx < list.length; idx += 1) {
            const current = enemiesRef.current[idx];
            if (!current || current.isDead || current.hp <= 0) continue;
            const enemyId = current.instanceId;

            clearPendingDefense(enemyId);
            mutateEnemyById(enemyId, (dyn) => ({ ...dyn, shield: 0 }));
            tickEffects(enemyId, 'start');
            if (checkEnemyDeaths()) {
                if (!combatActiveRef.current) return;
                continue;
            }

            restoreEnemyAP(enemyId);
            if (checkEnemyDeaths()) {
                if (!combatActiveRef.current) return;
                continue;
            }

            let guard = 0;
            while (combatActiveRef.current && guard < CC.ENEMY_ACTION_GUARD) {
                const activeEnemy = getEnemy(enemyId);
                if (
                    !activeEnemy ||
                    activeEnemy.isDead ||
                    activeEnemy.hp <= 0 ||
                    activeEnemy.actionPoint.current <= 0
                ) {
                    break;
                }

                let queue = enemyIntentQueuesRef.current[idx];
                if (!queue || queue.length === 0) {
                    queue = generateEnemyIntentQueue(activeEnemy, alliesRef.current);
                    applyEnemyIntentQueue(enemyId, queue);
                }
                let intent = queue[0];

                await delay();
                if (!mountedRef.current || !combatActiveRef.current) return;

                const actor = getEnemy(enemyId);
                if (!actor || actor.isDead || actor.hp <= 0) break;

                // 炮塔类（immovable）：无法移动，意图随「射程内是否存在目标」实时切换（observe ⇄ attack）。
                if (actor.type === 'immovable') {
                    const inRangeTargetId = pickTargetByRule(actor, alliesRef.current, true);
                    const desiredIntent: CombatIntent = inRangeTargetId
                        ? {
                            type: 'attack',
                            desc: `${fix1(actor.baseAttack)}`,
                            value: fix1(actor.baseAttack),
                            targetId: inRangeTargetId,
                        }
                        : { type: 'observe', desc: '待机' };
                    const head = queue[0];
                    const needsSync =
                        !head ||
                        head.approach === true ||
                        head.type !== desiredIntent.type ||
                        head.targetId !== desiredIntent.targetId;
                    if (needsSync) {
                        queue = [desiredIntent];
                        applyEnemyIntentQueue(enemyId, queue);
                        intent = queue[0];
                    }
                }

                if (intent.approach) {
                    // 接近意图：向选定目标移动一步，执行完成后出队，让位给后续攻击意图。
                    // 目标已阵亡时按规则重新选择，避免继续走向尸体。
                    const approachTargetId =
                        intent.targetId && getAliveAllyTargetIds().includes(intent.targetId)
                            ? intent.targetId
                            : pickTargetByRule(actor, alliesRef.current, false);
                    const moved = approachTargetId
                        ? stepEnemyToward(enemyId, approachTargetId)
                        : false;
                    addCombatLog(
                        moved
                            ? `[机动] ${actor.name} 正在逼近目标。`
                            : `[压制] ${actor.name} 受战线限制无法接近。`
                    );
                    applyEnemyIntentQueue(enemyId, queue.slice(1));
                } else if (intent.type === 'attack') {
                    // 每次攻击前重新检查射程内是否有可选目标：
                    // 有 → 直接攻击；没有 → 在攻击意图前插入接近意图，直到有。
                    const attackTargetId = pickTargetByRule(actor, alliesRef.current, true);
                    if (attackTargetId) {
                        enemyAttack(enemyId, attackTargetId);
                        enemyAttackedThisTurnRef.current[enemyId] = true;
                        if (checkAllyDeath()) return;
                        // 受击方即时应答：蓄反 / 差反预支（接受则立即反击）。
                        await maybeCounterAdvancesAfterHit(enemyId, attackTargetId);
                        if (!combatActiveRef.current) return;
                        if (checkAllyDeath()) return;
                    } else {
                        if (actor.type === 'immovable') {
                            // 炮塔类无法移动：转为待机，等待目标重新进入射程。
                            queue = [{ type: 'observe', desc: '待机' }];
                            applyEnemyIntentQueue(enemyId, queue);
                            continue;
                        }
                        const approachTargetId = pickTargetByRule(actor, alliesRef.current, false);
                        if (approachTargetId) {
                            addCombatLog(`[机动] ${actor.name} 射程内无有效目标，开始接近。`);
                            applyEnemyIntentQueue(enemyId, [
                                {
                                    type: 'attack',
                                    approach: true,
                                    desc: '接近目标',
                                    targetId: approachTargetId,
                                },
                                ...queue,
                            ]);
                            // 本次行动未结算：下一轮循环执行刚插入的接近意图。
                            continue;
                        }
                        addCombatLog(`[观测] ${actor.name} 找不到任何可接近的目标。`);
                    }
                } else if (intent.type === 'defense') {
                    const defenseResult = rollEnemyDefenseResult(actor);
                    addPendingDefense(enemyId, defenseResult);
                    addCombatLog(`[偏转矩阵] ${actor.name} 布设防御判定。`);
                    playSfx('combat_block');
                } else if (intent.type === 'buff') {
                    const attr = pickOne([...ATTR_KEYS]);
                    if (attr) {
                        addEffect(
                            enemyId,
                            attr,
                            3,
                            CC.DEFAULT_BUFF_DURATION,
                            enemyId,
                            actor.name
                        );
                        addCombatLog(`[异常增殖] ${actor.name} 强化了 ${attr}。`);
                    }
                } else if (intent.type === 'debuff') {
                    const targetId = chooseAliveTarget(intent.targetId);
                    const attr = pickOne([...ATTR_KEYS]);
                    if (attr) {
                        addEffect(
                            targetId,
                            attr,
                            -2,
                            CC.DEFAULT_BUFF_DURATION,
                            enemyId,
                            actor.name
                        );
                        addCombatLog(
                            `[污染注入] ${getAlly(targetId)?.name ?? targetId} 的 ${attr} 被削弱。`
                        );
                    }
                } else {
                    addCombatLog(
                        actor.type === 'immovable'
                            ? `[待机] ${actor.name} 保持监视，等待目标进入射程。`
                            : `[观测] ${actor.name} 正在评估局势。`
                    );
                }

                if (!combatActiveRef.current) return;
                mutateEnemyById(enemyId, (dyn) => spendActionPoint(dyn, 1));
                guard += 1;
            }

            // 回合结束：未消耗蓄反值 × 0.1 向上取整转行动点
            const after = getEnemy(enemyId);
            if (after && !after.isDead && after.hp > 0) {
                const acc = after.accumulateCounter
                    .filter((e) => e.ownerId === enemyId)
                    .reduce((sum: number, e) => sum + safeNumber(e.value), 0);
                if (acc > 0) {
                    const extra = Math.ceil(acc * CC.COUNTER_TO_AP_RATIO);
                    carryApRef.current[enemyId] = (carryApRef.current[enemyId] ?? 0) + extra;
                    mutateEnemyById(enemyId, (dyn) => ({
                        ...dyn,
                        accumulateCounter: dyn.accumulateCounter.filter((e) => e.ownerId !== enemyId),
                    }));
                }

                tickEffects(enemyId, 'end');
                if (checkEnemyDeaths()) {
                    if (!combatActiveRef.current) return;
                    continue;
                }

                const refreshed = getEnemy(enemyId);
                if (refreshed && !refreshed.isDead && refreshed.hp > 0) {
                    const attackedThisTurn = enemyAttackedThisTurnRef.current[enemyId] === true;
                    enemyAttackedThisTurnRef.current[enemyId] = false;

                    // 攻击流程粘性：本轮未出手且仍是攻击类意图（接近 / 攻击）时，
                    // 保留队列继续推进，绝不在「接近途中」被重新掷骰打断。
                    const head = (enemyIntentQueuesRef.current[idx] ?? [])[0];
                    const keepAttackFlow =
                        !attackedThisTurn &&
                        head !== undefined &&
                        (head.approach === true || head.type === 'attack');

                    if (!keepAttackFlow) {
                        applyEnemyIntentQueue(
                            enemyId,
                            generateEnemyIntentQueue(refreshed, alliesRef.current)
                        );
                    }
                }
            }
        }

        if (combatActiveRef.current) {
            await beginPlayerPhase();
        }
    }, [
        clearPendingDefense,
        mutateEnemyById,
        tickEffects,
        restoreEnemyAP,
        maybeCounterAdvancesAfterHit,
        enemyAttack,
        addPendingDefense,
        checkEnemyDeaths,
        checkAllyDeath,
        addEffect,
        addCombatLog,
        generateEnemyIntentQueue,
        applyEnemyIntentQueue,
        stepEnemyToward,
        pickTargetByRule,
        getAliveAllyTargetIds,
        beginPlayerPhase,
        chooseAliveTarget,
        getEnemy,
        getAlly,
        getDistance,
        getUnitRange,
    ]);

    const endPlayerPhase = useCallback(async () => {
        if (!isPlayerPhase || actionLockRef.current) return;

        if (!combatActiveRef.current || !getAliveEnemies().length) {
            setIsPlayerPhase(false);
            if (combatActiveRef.current) endCombatVictory();
            return;
        }

        setBusy(true);
        setIsPlayerPhase(false);
        playSfx('ui_click');

        // 回合结束：未消耗蓄反值 × 0.1 向上取整转行动点
        alliesRef.current.forEach((ally, idx) => {
            const tid = toTargetId(ally, idx);
            if (ally.hp <= 0) return;

            tickEffects(tid, 'end');
            const updated = alliesRef.current[idx];
            if (!updated || updated.hp <= 0) return;

            const acc = updated.accumulateCounter
                .filter((e) => e.ownerId === tid)
                .reduce((sum: number, e) => sum + safeNumber(e.value), 0);
            if (acc > 0) {
                const extra = Math.ceil(acc * CC.COUNTER_TO_AP_RATIO);
                carryApRef.current[tid] = (carryApRef.current[tid] ?? 0) + extra;
                mutateAlly(tid, (dyn) => ({
                    ...dyn,
                    accumulateCounter: dyn.accumulateCounter.filter((e) => e.ownerId !== tid),
                }));
            }
        });

        if (checkAllyDeath()) {
            setBusy(false);
            return;
        }
        await executeEnemyPhase();
    }, [
        isPlayerPhase,
        getAliveEnemies,
        endCombatVictory,
        setBusy,
        tickEffects,
        mutateAlly,
        checkAllyDeath,
        executeEnemyPhase,
    ]);

    //--------------------------------------------------------------------------
    // 战术读取与执行
    //--------------------------------------------------------------------------
    const getTacticsFor = useCallback((ownerId: string): Tactic[] => {
        const source =
            ownerId === 'player'
                ? playerStateRef.current.dynamic.tactics
                : companionsRef.current.find((c) => c.static.id === ownerId)?.dynamic.tactics ?? [];
        return [...source];
    }, []);

    /**
     * 我方单位前进 / 后退一步。
     * dir：1 前进（靠近敌方），-1 后退（远离敌方）。每次消耗1 AP。
     */
    const moveAlly = useCallback(
        async (allyId: string, dir: 1 | -1) => {
            // 「立即行动」窗口：预支单位在他人回合内也可行动（移动不消耗行动点）。
            const isInsertMover = insertActionRef.current?.unitId === allyId;
            if (
                (!isPlayerPhase && !isInsertMover) ||
                actionLockRef.current ||
                !combatActiveRef.current
            ) {
                return;
            }
            const ally = getAlly(allyId);
            if (!ally || ally.hp <= 0) return;
            if (!isInsertMover && safeNumber(ally.actionPoint.current) < CC.MOVE_AP_COST) {
                playSfx('error');
                return;
            }

            const current = positionsRef.current[allyId];
            if (typeof current !== 'number') return;
            const next = clamp(current + dir, CC.BATTLE_LINE_MIN, CC.BATTLE_LINE_MAX);
            if (next === current) {
                // 已抵达战线边界。
                playSfx('error');
                return;
            }

            if (!isInsertMover) {
                mutateAlly(allyId, (dyn) => spendActionPoint(dyn, CC.MOVE_AP_COST));
            }
            setPositionsSafe({ ...positionsRef.current, [allyId]: next });
            addCombatLog(
                `[机动] ${ally.name} ${dir > 0 ? '向前推进' : '向后撤离'}至 ${next} 号位。`
            );
            playSfx('ui_click');
            await delay(80);
            // 立即行动窗口内：本次移动消耗一次行动机会。
            if (isInsertMover) consumeInsertChance();
        },
        [isPlayerPhase, getAlly, mutateAlly, setPositionsSafe, addCombatLog, consumeInsertChance]
    );

    /**
     * 序列长度为 0 时实体无法行动。
     * 但若 stamina 足以支撑耗尽-重生成，则仍允许行动。
     */
    const canUseTactic = useCallback(
        (tactic: Tactic, casterId: string) => {
            // 「立即行动」窗口：预支单位在他人回合内也可行动（行动不消耗行动点）。
            const isInsertCaster = insertActionRef.current?.unitId === casterId;
            if (
                (!isPlayerPhase && !isInsertCaster) ||
                actionLockRef.current ||
                !combatActiveRef.current ||
                !getAliveEnemyIds().length
            ) {
                return false;
            }

            const caster = getAlly(casterId);
            if (!caster || caster.hp <= 0) return false;

            // 序列耗尽校验：仅当无法通过扣除 stamina 重生成时阻止行动。
            // instant 武器不消费结果序列，豁免此门槛（否则序列耗尽的 instant 玩家被软锁）。
            const seqWeapon = getPrimaryWeapon(caster.equipment);
            if (
                caster.resultSequence.attackResult.length === 0 &&
                seqWeapon?.weaponDamageType !== 'instant'
            ) {
                if (!canRegenerateSequence(caster.stamina, caster.maxStamina)) return false;
            }

            // 预支行动窗口内的行动不消耗行动点（成本已在预支时结清）。
            if (!isInsertCaster && caster.actionPoint.current < safeNumber(tactic.apCost)) {
                return false;
            }

            if (tactic.type === 'attack' && tactic.requireWeapon) {
                const weapon = getPrimaryWeapon(caster.equipment);
                if (!weapon || weapon.weaponType !== tactic.requireWeapon) return false;
            }

            // 攻击战术必须在射程内存有可攻击目标：够不着的距离用不了（range 0 = 无限距离）。
            if (tactic.type === 'attack') {
                const range = getUnitRange(casterId);
                const pos = positionsRef.current[casterId];
                const hasTarget =
                    typeof pos === 'number' &&
                    enemiesRef.current.some((enemy) => {
                        if (enemy.isDead || enemy.hp <= 0) return false;
                        const enemyPos = positionsRef.current[enemy.instanceId];
                        return (
                            typeof enemyPos === 'number' &&
                            isWithinRange(range, Math.abs(pos - enemyPos))
                        );
                    });
                if (!hasTarget) return false;
            }
            return true;
        },
        [isPlayerPhase, getAlly, getAliveEnemyIds, getUnitRange]
    );

    const resolveTargetIds = useCallback(
        (target: Target, casterId: string, manualTargetId?: string): string[] => {
            const allyIds = getAliveAllyTargetIds();
            const enemyIds = getAliveEnemyIds();
            switch (target) {
                case 'self':
                    return [casterId];
                case 'enemy':
                    if (manualTargetId && enemyIds.includes(manualTargetId)) return [manualTargetId];
                    return enemyIds.length ? [enemyIds[0]] : [];
                case 'all_enemies':
                    return enemyIds;
                case 'single_ally':
                    return [
                        manualTargetId && allyIds.includes(manualTargetId) ? manualTargetId : casterId,
                    ];
                case 'single_teammate': {
                    const fallback = allyIds.find((id) => id !== casterId) ?? casterId;
                    return [
                        manualTargetId && allyIds.includes(manualTargetId) ? manualTargetId : fallback,
                    ];
                }
                case 'all_teammates':
                    return allyIds.filter((id) => id !== casterId);
                case 'all_allies':
                    return allyIds;
                case 'none':
                    return [];
                default:
                    return [];
            }
        },
        [getAliveAllyTargetIds, getAliveEnemyIds]
    );

    const executeTactic = useCallback(
        async (tacticId: string, casterId = 'player', manualTargetId?: string) => {
            // 「立即行动」窗口：预支单位在他人回合内也可行动（行动不消耗行动点）。
            const isInsertCaster = insertActionRef.current?.unitId === casterId;
            if (
                (!isPlayerPhase && !isInsertCaster) ||
                actionLockRef.current ||
                !combatActiveRef.current ||
                !getAliveEnemyIds().length
            ) {
                playSfx('error');
                return;
            }

            const casterIdx = findAllyIndex(casterId);
            if (casterIdx < 0) {
                playSfx('error');
                return;
            }

            const caster = alliesRef.current[casterIdx];
            const tactic = getTacticsFor(casterId).find((t) => t.id === tacticId);
            if (!tactic || caster.hp <= 0) {
                playSfx('error');
                return;
            }

            // 序列耗尽校验（instant 武器豁免，见 canUseTactic）
            const seqWeapon = getPrimaryWeapon(caster.equipment);
            if (
                caster.resultSequence.attackResult.length === 0 &&
                seqWeapon?.weaponDamageType !== 'instant'
            ) {
                if (!canRegenerateSequence(caster.stamina, caster.maxStamina)) {
                    playSfx('error');
                    return;
                }
            }

            if (!isInsertCaster && caster.actionPoint.current < safeNumber(tactic.apCost)) {
                playSfx('error');
                return;
            }

            if (tactic.type === 'attack' && tactic.requireWeapon) {
                const weapon = getPrimaryWeapon(caster.equipment);
                if (!weapon || weapon.weaponType !== tactic.requireWeapon) {
                    playSfx('error');
                    return;
                }
            }

            // 攻击战术：先锁定射程内的目标；目标超距则拒绝执行（range 0 = 无限距离）。
            let attackTargetId: string | undefined;
            if (tactic.type === 'attack') {
                const range = getUnitRange(casterId);
                const enemyIds = getAliveEnemyIds();
                const requested =
                    manualTargetId && enemyIds.includes(manualTargetId) ? manualTargetId : undefined;
                attackTargetId =
                    requested ??
                    enemyIds.find((id) => isWithinRange(range, getDistance(casterId, id)));
                if (
                    !attackTargetId ||
                    !isWithinRange(range, getDistance(casterId, attackTargetId))
                ) {
                    playSfx('error');
                    addCombatLog('[超距] 目标不在射程内，无法攻击。');
                    return;
                }
            }

            setBusy(true);
            try {
                if (!isInsertCaster) {
                    mutateAlly(casterId, (dyn) => spendActionPoint(dyn, tactic.apCost));
                }
                addCombatLog(`>> [${caster.name}] 执行战术：${tactic.name}`);
                playSfx('ui_click');

                if (tactic.type === 'attack') {
                    const targetEnemyId = attackTargetId;
                    const updatedCaster = getAlly(casterId);
                    if (!updatedCaster || !targetEnemyId) return;

                    const weapon = getPrimaryWeapon(updatedCaster.equipment);
                    const isInstant = weapon?.weaponDamageType === 'instant';

                    if (isInstant) {
                        /**
                         * instant 伤害不参与任何正常结算。
                         * 不消费结果序列。
                         * 直接造成真实伤害，无视护盾、免伤、防御判定。不触发蓄反。
                         */
                        const instantDmg = calculateInstantDamage(updatedCaster);
                        const actual = dealInstantDamageToEnemy(targetEnemyId, instantDmg);
                        if (actual > 0) {
                            addCombatLog(`[瞬发] 有效倾泻 ${actual} 点真实伤害。`);
                        } else {
                            addCombatLog('[瞬发] 未能造成有效伤害。');
                        }
                    } else {
                        // 蓄反：攻击方速度低于受击方时，每次攻击（无论是否命中 / 被闪避）
                        // 都向「受击方 × 攻击方」槽按 |速度差| 累积。
                        const targetEnemy = getEnemy(targetEnemyId);
                        if (
                            targetEnemy &&
                            safeNumber(targetEnemy.speed) > safeNumber(updatedCaster.speed)
                        ) {
                            mutateEnemyById(targetEnemyId, (dyn) =>
                                addAccumulateCounter(
                                    dyn,
                                    targetEnemyId,
                                    casterId,
                                    Math.abs(
                                        safeNumber(dyn.speed) - safeNumber(updatedCaster.speed)
                                    )
                                )
                            );
                        }

                        const drawn = drawAttackResult(updatedCaster, casterId);
                        commitAlly(casterId, drawn.updatedEntity as CombatAlly);

                        const attackResult = drawn.attackResult;
                        const didHit = attackResult[0] !== 'miss';

                        if (!didHit) {
                            addCombatLog('[未命中] 战术计算落空。');
                            playSfx('combat_miss');
                        } else {
                            const raw = Math.max(0, attackResult[1]);
                            const actual = dealDamageToEnemy(targetEnemyId, raw);
                            const label =
                                attackResult[0] === 'crit'
                                    ? '暴击'
                                    : attackResult[0] === 'graze'
                                        ? '擦伤'
                                        : '命中';
                            if (actual > 0) {
                                addCombatLog(`[${label}] 有效倾泻 ${actual} 点动能。`);
                            } else {
                                addCombatLog('[偏转] 攻击未能穿透目标防护。');
                            }
                        }

                        if (didHit && combatActiveRef.current) {
                            const attackTactic = tactic as AttackTactic;
                            for (const effect of attackTactic.tacticEffect ?? []) {
                                const [target, attr, value, duration] = effect;
                                const ids = resolveTargetIds(target, casterId, manualTargetId);
                                for (const id of ids) {
                                    addEffect(id, attr, value, duration, casterId, caster.name);
                                    if (!combatActiveRef.current) return;
                                }
                            }
                        }

                        // 受击方即时应答：蓄反 / 差反预支（接受则立即反击）。
                        if (combatActiveRef.current) {
                            await maybeCounterAdvancesAfterHit(casterId, targetEnemyId);
                            if (!combatActiveRef.current) return;
                        }
                    }
                } else {
                    const defenseTactic = tactic as DefenseTactic;
                    const updatedCaster = getAlly(casterId);
                    if (updatedCaster) {
                        const { defenseResult, updatedEntity } = drawDefenseResult(
                            updatedCaster,
                            casterId
                        );
                        commitAlly(casterId, updatedEntity as CombatAlly);
                        addPendingDefense(casterId, defenseResult);
                    }

                    for (const effect of defenseTactic.tacticEffect ?? []) {
                        const [target, attr, value] = effect;
                        const ids = resolveTargetIds(target, casterId, manualTargetId);
                        const normalizedType = normalizeEffectType(attr);
                        const duration = isHealType(normalizedType) ? 0 : CC.DEFAULT_BUFF_DURATION;
                        for (const id of ids) {
                            addEffect(id, attr, value, duration, casterId, caster.name);
                            if (!combatActiveRef.current) return;
                        }
                    }
                }

                await delay();
                // 立即行动窗口内：本次战术消耗一次行动机会。
                if (isInsertCaster) consumeInsertChance();
            } finally {
                if (mountedRef.current) setBusy(false);
            }
        },
        [
            isPlayerPhase,
            getAliveEnemyIds,
            findAllyIndex,
            getTacticsFor,
            setBusy,
            mutateAlly,
            mutateEnemyById,
            getEnemy,
            addCombatLog,
            drawAttackResult,
            drawDefenseResult,
            commitAlly,
            addPendingDefense,
            dealDamageToEnemy,
            dealInstantDamageToEnemy,
            resolveTargetIds,
            addEffect,
            getAlly,
            getUnitRange,
            getDistance,
            maybeCounterAdvancesAfterHit,
        ]
    );

    //--------------------------------------------------------------------------
    // 可见结果序列（仅 UI 层，按灵力预测深度裁剪）
    //--------------------------------------------------------------------------
    const getVisibleResultSequence = useCallback(
        (
            targetId: string
        ): { attackResult: AttackResult[]; defenseResult: DefenseResult[] } => {
            const empty = { attackResult: [] as AttackResult[], defenseResult: [] as DefenseResult[] };
            if (isEnemyTarget(targetId)) return empty;
            const ally = getAlly(targetId);
            if (!ally) return empty;
            const len = getVisibleResultSequenceLength(ally.spiritual, ally.stamina);
            return {
                attackResult: ally.resultSequence.attackResult.slice(0, len),
                defenseResult: ally.resultSequence.defenseResult.slice(0, len),
            };
        },
        [isEnemyTarget, getAlly]
    );

    //--------------------------------------------------------------------------
    // 敌人视觉资产回写（战斗 HUD 外链生成后更新 enemies 实体）
    //--------------------------------------------------------------------------
    const updateEnemyVisual = useCallback(
        (assetId: string, imageUrl: string) => {
            // assetId 为资产键：命中实例 id 时只回写该实例；命中模板 id 时回写全部同型实例
            // （敌人肖像按模板 id 归档，同型敌人共享同一份立绘）。
            let hit = false;
            const next = enemiesRef.current.map((enemy) => {
                if (enemy.instanceId === assetId || enemy.id === assetId) {
                    hit = true;
                    return { ...enemy, imageUrl };
                }
                return enemy;
            });
            if (!hit) return;
            enemiesRef.current = next;
            setEnemiesSafe(next);
        },
        [setEnemiesSafe]
    );

    //--------------------------------------------------------------------------
    // 生成敌人并进入战斗
    //--------------------------------------------------------------------------
    const spawnEnemy = useCallback(
        (
            specificEnemyData?: Partial<EnemyTemplate>,
            currentZoneId?: string,
            threatLevel = 1
        ) => {
            cleanupAllEffects(true);
            clearAllPendingDefense();

            const threat = Math.max(1, safeNumber(threatLevel, 1));
            const templates = Object.values(ENEMY_TEMPLATES ?? {}) as EnemyTemplate[];
            const isSpecific = Boolean(specificEnemyData?.id);
            const enemyCount = isSpecific
                ? 1
                : clamp(randomInt(threat, threat + 1), 1, CC.MAX_ENEMY_COUNT);

            const enemyTemplates: EnemyTemplate[] = [];
            for (let i = 0; i < enemyCount; i += 1) {
                let tpl: EnemyTemplate | undefined;
                if (specificEnemyData?.id) {
                    const predefined = templates.find((t) => t.id === specificEnemyData.id);
                    tpl = predefined
                        ? (mergeDeep(predefined, specificEnemyData) as EnemyTemplate)
                        : (specificEnemyData as EnemyTemplate);
                } else {
                    let pool = currentZoneId
                        ? templates.filter((t) => t.zoneId?.includes(currentZoneId))
                        : templates;
                    if (!pool.length) pool = templates.filter((t) => !t.zoneId?.length);
                    if (!pool.length) pool = templates;
                    const base = pickOne(pool);
                    if (base) {
                        tpl = specificEnemyData
                            ? (mergeDeep(base, specificEnemyData) as EnemyTemplate)
                            : base;
                    }
                }
                if (tpl && (tpl.type === 'cthulhu' || tpl.type === 'immovable')) {
                    enemyTemplates.push(tpl);
                }
            }

            if (!enemyTemplates.length) {
                console.error('[useCombat] 无可用敌人模板，无法进入战斗。');
                return;
            }

            const generated = enemyTemplates.map((tpl) => createEnemyEntity(tpl, threat));

            const playerCombat = createCombatantEntity(
                playerStateRef.current.static,
                playerStateRef.current.dynamic
            );
            if (playerCombat.hp <= 0) {
                combatActiveRef.current = false;
                setEnemiesSafe([]);
                setEnemyIntentsSafe([]);
                setIsPlayerPhase(false);
                setBusy(false);
                setGameState(GameState.GAME_OVER);
                return;
            }

            const companionCombat = companionsRef.current
                .filter((c) => c.dynamic.hp > 0)
                .map((c) => createCombatantEntity(c.static, c.dynamic));

            const allAllies: CombatAlly[] = [playerCombat, ...companionCombat];

            fatigueRef.current = {};
            usedCounterRef.current = {};
            carryApRef.current = {};
            enemyAttackedThisTurnRef.current = {};
            endInsertAction();

            alliesRef.current = allAllies;
            setAlliesSafe(allAllies);
            setEnemiesSafe(generated);

            // 战场站位：我方全体从 0 格出发；敌方在 +6 及以后的格子随机分布（尽量不重叠）。
            const initialPositions: Record<string, number> = {};
            allAllies.forEach((ally, idx) => {
                initialPositions[toTargetId(ally, idx)] = CC.ALLY_START_POS;
            });
            const enemyPosPool: number[] = [];
            for (let p = CC.ENEMY_START_POS; p <= CC.BATTLE_LINE_MAX; p += 1) {
                enemyPosPool.push(p);
            }
            generated.forEach((enemy) => {
                const poolIdx = enemyPosPool.length > 0 ? randomInt(0, enemyPosPool.length - 1) : -1;
                initialPositions[enemy.instanceId] =
                    poolIdx >= 0
                        ? enemyPosPool.splice(poolIdx, 1)[0]
                        : randomInt(CC.ENEMY_START_POS, CC.BATTLE_LINE_MAX);
            });
            setPositionsSafe(initialPositions);

            const intentQueues = generated.map((enemy) =>
                generateEnemyIntentQueue(enemy, allAllies)
            );
            enemyIntentQueuesRef.current = intentQueues;
            setEnemyIntentsSafe(intentQueues.map((queue) => queue[0] ?? null));

            combatActiveRef.current = true;
            const names = generated.map((e) => e.name).join('、');
            setCombatLog([
                `[雷达预警] 锁定 ${generated.length} 个敌对生命体`,
                names,
            ]);
            addLog(`[雷达预警] 锁定 ${generated.length} 个敌对生命体`, 'combat');

            setGameState(GameState.COMBAT);
            setPlayerState((prev) => {
                const next: PlayerState = {
                    ...prev,
                    currentGameRound: { ...prev.currentGameRound, combatTurn: 1 },
                };
                playerStateRef.current = next;
                return next;
            });

            setActiveAllyId('player');
            setIsPlayerPhase(true);
            setBusy(false);

            allAllies.forEach((ally, idx) => {
                const tid = toTargetId(ally, idx);
                mutateAlly(tid, (dyn) => ({
                    ...dyn,
                    actionPoint: {
                        ...dyn.actionPoint,
                        current: dyn.actionPoint.base,
                        advanced: 0,
                    },
                }));
            });
        },
        [
            cleanupAllEffects,
            clearAllPendingDefense,
            setEnemiesSafe,
            setEnemyIntentsSafe,
            setAlliesSafe,
            setCombatLog,
            addLog,
            setGameState,
            setPlayerState,
            setActiveAllyId,
            mutateAlly,
            setBusy,
            generateEnemyIntentQueue,
            setPositionsSafe,
        ]
    );

    //--------------------------------------------------------------------------
    // 返回
    //--------------------------------------------------------------------------
    return {
        enemies,
        aliveEnemyCount: enemies.filter((e) => !e.isDead && e.hp > 0).length,
        enemyIntents,
        allies,
        activeAllyId,
        setActiveAllyId,
        combatLog,
        setCombatLog,
        getVisibleResultSequence,
        pendingDefense,
        spawnEnemy,
        updateEnemyVisual,
        isCombatActive: enemies.some((e) => !e.isDead && e.hp > 0),
        isPlayerPhase,
        isBusy,
        getTacticsFor,
        canUseTactic,
        executeTactic,
        endPlayerPhase,
        positions,
        battleLineMin: CC.BATTLE_LINE_MIN,
        battleLineMax: CC.BATTLE_LINE_MAX,
        getUnitRange,
        getDistance,
        moveAlly,
        counterSkip,
        setCounterSkip: setCounterSkipFor,
        insertAction,
        endInsertAction,
    };
};