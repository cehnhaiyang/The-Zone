/**
 * 战斗钩子（React 绑定层）
 *
 * 本文件是战斗引擎与 React 之间的唯一接线处，只做三件事：
 * 1. 维护战斗状态容器（敌人 / 友方 / 战场 / 日志 / 立即行动窗口 / 蓄反询问）；
 * 2. 编排阶段推进与演出节奏（异步回合、动画延时、音效）；
 * 3. 对外暴露动作接口（executeTactic / moveAlly / endPlayerPhase / getAttackForecast 等）。
 *
 * 引擎规则不在此实现，也不在此重复声明契约：
 * - 多敌人模型、速度与行动点、友方结果序列、武器类型特性、蓄反 / 差反、pendingDefense、
 *   战场空间与伤害结算顺序的完整说明，以及全部纯函数实现，
 *   见 `meta/tools.ts` 第 18 节「战斗引擎运行时」；
 * - 战场坐标、位移方向、蓄反请求、立即行动窗口、武器特性状态、开战上下文与战前预测的
 *   类型契约，见 `meta/interface.ts`。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { GameState } from '../meta';
import type {
    AllyResultSequence,
    AnyTactic,
    AttackDamageScale,
    AttackForecast,
    AttackForecastOdds,
    AttackForecastSource,
    AttackResult,
    AttackSlot,
    BattleMap,
    BattleStartContext,
    CombatAlly,
    CombatDynamicState,
    CombatEnemy,
    CombatIntent,
    CombatPosition,
    CombatStatus,
    CompanionDynamicState,
    CompanionTemplate,
    CounterAdvanceRequest,
    CounterDecisionResult,
    CounterType,
    Cover,
    DefenseResult,
    DotSoundType,
    EnemyTemplate,
    Entity,
    EnvironmentModifier,
    EquipState,
    InsertActionWindow,
    IntentType,
    ItemInstance,
    ItemTemplate,
    LogType,
    MoveDirection,
    PlayerState,
    TacticEffectType,
    Target,
    WeaponInstance,
    WeaponType,
} from '../meta';
import {
    ATTACK_RESULT_LADDER,
    ATTACK_SLOTS,
    COMBAT_CONFIG,
    MAX_PARTIAL_REDUCTION,
    RESULT_MODIFIER_TYPES,
    addAccumulateCounter,
    addItemToInventory,
    applyCombatToDynamic,
    applyVitalEffect,
    attackValueAt,
    calculateCombatBonus,
    calculateEnemyAttackValue,
    calculateInstantDamage,
    canRegenerateSequence,
    clamp,
    consumeCounterPair,
    consumeJudgementStatuses,
    createCombatantEntity,
    createEnemyEntity,
    createItemInstance,
    createRuntimeCover,
    findNextStepToward,
    fix1,
    formatCombatNumber,
    generateAllyResultSequence,
    getAgilityEvasion,
    getAllyDamageScale,
    getAllyTargetId,
    getAttackDamageScale,
    getAttackOdds,
    getBattleDistance,
    getCombatResultModifiers,
    getCounterPairValue,
    getCoverMaxDurability,
    getCritDefensePierce,
    getCritRangeProfile,
    getDefenseMaxReduction,
    getEnemyDamageScale,
    getEnemyReductionRange,
    getEquipPartialReduction,
    getExhaustStaminaCost,
    getPredictionDepth,
    getPrimaryWeapon,
    getSequenceLength,
    getSequenceShift,
    getShieldWeapon,
    getSniperDowngradeChance,
    getSplashDamage,
    getSteppedCell,
    getTacticWeaponType,
    getVisibleResultSequenceLength,
    getWeaponTrait,
    isCellWalkable,
    isCoverDestructible,
    isDashWeapon,
    isDisplacementEffect,
    isDynamicVitalType,
    isSequenceEffect,
    isVitalEffectType,
    isVitalType,
    isWeaponUsable,
    isWithinRange,
    mergeDeep,
    normalizeEquipState,
    pickOne,
    processDamageDeduction,
    randomInt,
    rebuildSequence,
    resolveAttackSlot,
    resolveAttackWeapon,
    resolveBattleModifiers,
    rollEnemyAttackResult,
    rollEntityDefenseResult,
    round1,
    safeNumber,
    sequenceMinLength,
    settleCounterSlots,
    shiftAttackResult,
    shiftDefenseResult,
    spendActionPoint,
    spendDefenseDurability,
    spendWeaponUse,
    storeStatusItem,
    tickRoundStatuses,
} from '../meta';
import {
    DEFAULT_BATTLE_MAP,
    ENEMY_TEMPLATES,
    getBattleMap,
    getCoverDefinitions,
    getEquippedWeaponOwnTactics,
} from '../constants';
import { AudioService } from '../services';

interface UseCombatParams {
    playerState: PlayerState;
    companions: Array<Entity<CompanionTemplate, CompanionDynamicState>>;
    setPlayerState: Dispatch<SetStateAction<PlayerState>>;
    setCompanions: Dispatch<SetStateAction<Array<Entity<CompanionTemplate, CompanionDynamicState>>>>;
    setGameState: Dispatch<SetStateAction<GameState>>;
    addLog: (text: string, type: LogType) => void;
    /**
     * 蓄反 / 差反预支决策回调。
     * 返回 false 拒绝、true 接受（默认档位）、number 接受并指定档位（差反的 2n）。
     * 未提供时，战斗钩子不会主动预支行动点，只保留被动的蓄反转行动点规则。
     */
    counterDecision?: (
        request: CounterAdvanceRequest
    ) => CounterDecisionResult | Promise<CounterDecisionResult>;
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
     * 按意志预测深度裁剪后的可见结果序列。
     * 仅用于 UI 展示，不参与实际战斗结算。
     * 敌人目标始终返回空序列。
     */
    getVisibleResultSequence: (targetId: string) => AllyResultSequence;
    /**
     * 该单位的序列预测深度 n（契约 `CombatAlly.resultSequence`）：
     * will 为 50 时 n 为 1，此后每 5 点 will 额外 +1；will 小于 50 时 n 为 0。
     * 敌人不预生成序列，恒为 0。
     */
    getPredictionDepthFor: (targetId: string) => number;
    /**
     * 战前预测：指定单位攻击指定目标的命中 / 伤害链路与每一处减益的来源。
     * 序列不可见（意志不足）或已耗尽时返回 null。
     */
    getAttackForecast: (attackerId: string, targetId: string) => AttackForecast | null;
    /**
     * 各角色当前已布设的待触发防御判定。
     * key 为 targetId（player / 同伴 id / 敌人 instanceId）。
     */
    pendingDefense: Record<string, DefenseResult[]>;
    spawnEnemy: (
        specificEnemyData?: Partial<EnemyTemplate>,
        currentZoneId?: string,
        threatLevel?: number,
        context?: BattleStartContext
    ) => void;
    /**
     * 战斗 HUD 外链生成敌人视觉后回写 imageUrl。
     * 入参为资产键：实例 id 命中单个实例，模板 id 命中全部同型实例。
     */
    updateEnemyVisual: (assetId: string, imageUrl: string) => void;
    isCombatActive: boolean;
    isPlayerPhase: boolean;
    isBusy: boolean;
    getTacticsFor: (ownerId: string) => AnyTactic[];
    canUseTactic: (tactic: AnyTactic, casterId: string) => boolean;
    executeTactic: (
        tacticId: string,
        casterId?: string,
        manualTargetId?: string
    ) => Promise<void>;
    endPlayerPhase: () => Promise<void>;
    /** 战场位置表：key 为我方 targetId（player / 同伴 id）或敌方 instanceId。 */
    positions: Record<string, CombatPosition>;
    /** 当前战场地图：纵深范围、轨道数、掩体落点与环境修正。 */
    battleMap: BattleMap;
    /** 运行时掩体（含落点与可破坏耐久）。 */
    covers: Cover[];
    /** 单位当前的攻击距离：我方取主手武器 range，敌方取模板 range；0 = 无限距离。 */
    getUnitRange: (unitId: string) => number;
    /** 两个单位之间的战场距离（切比雪夫距离）。 */
    getDistance: (aId: string, bId: string) => number;
    /** 单次位移的行动点消耗（基础值 + 环境移动修正）。 */
    getMoveCost: () => number;
    /** 我方单位四向位移一步（纵深推进 / 撤离、换轨），消耗行动点。 */
    moveAlly: (allyId: string, dir: MoveDirection) => Promise<void>;
    /** 每单位预支询问跳过开关（player / 同伴 id → 蓄反 / 差反）。 */
    counterSkip: Record<string, Partial<Record<CounterAdvanceRequest['type'], boolean>>>;
    /** 设置 / 取消跳过开关。 */
    setCounterSkip: (unitId: string, type: CounterAdvanceRequest['type'], skip: boolean) => void;

    /**
     * 「立即行动」窗口：预支结算后我方单位的立即行动窗口（敌方窗口由引擎自动执行，不在此列）。
     * 每次行动按其自身行动点成本消耗窗口行动点；行动点耗尽即窗口结束，可随时手动结束。
     */
    insertAction: InsertActionWindow | null;
    /** 手动结束「立即行动」窗口。 */
    endInsertAction: () => void;
}

//==============================================================================
// 表现层胶水（演出节奏与音效，不进入元工具）
//==============================================================================

/** 战斗演出单步延时（毫秒）。 */
const ANIM_DELAY = 150;

/** 战斗日志保留条数上限。 */
const COMBAT_LOG_LIMIT = 200;

const delay = (ms: number = ANIM_DELAY) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));

const playSfx = (sfx: DotSoundType) => {
    try {
        AudioService.playSfx(sfx);
    } catch {
        // noop
    }
};

//==============================================================================
// Hook
//==============================================================================
export const useCombat = ({
    playerState,
    companions,
    setPlayerState,
    setCompanions,
    setGameState,
    addLog,
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
    const [positions, setPositions] = useState<Record<string, CombatPosition>>({});
    /** 当前战场地图：开战时由当前节点的地图解析结果注入。 */
    const [battleMap, setBattleMap] = useState<BattleMap>(DEFAULT_BATTLE_MAP);
    /** 运行时掩体：开战时按地图落点实例化，耐久随战斗变化。 */
    const [covers, setCovers] = useState<Cover[]>([]);
    /** 每单位预支询问跳过开关（玩家方单位卡片上的「跳过蓄反 / 差反询问」）。 */
    const [counterSkip, setCounterSkip] = useState<
        Record<string, Partial<Record<CounterAdvanceRequest['type'], boolean>>>
    >({});
    /** 「立即行动」窗口：预支结算后，我方单位立即行动的行动点池（敌方窗口不在此展示）。 */
    const [insertAction, setInsertAction] = useState<InsertActionWindow | null>(null);


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
    /**
     * 本回合各角色通过蓄反 / 差反已预支的行动点合计（蓄反 n + 差反 2n 累加）。
     * 共享额度上限 = 该角色的 actionPoint.base + actionPoint.current，用尽即不再发起询问。
     * 角色的回合开始时随行动点恢复一并清零。
     */
    const counterPrepayUsedRef = useRef<Record<string, number>>({});
    const counterSkipRef = useRef<
        Record<string, Partial<Record<CounterAdvanceRequest['type'], boolean>>>
    >({});
    const insertActionRef = useRef<InsertActionWindow | null>(null);
    const insertActionResolverRef = useRef<(() => void) | null>(null);
    /**
     * 预支询问函数的前向引用。
     * runInsertAction（定义在前）需要在立即行动的攻击后询问对面，
     * 而 maybeCounterAdvancesAfterAttack 又依赖 runInsertAction，故用 ref 打断循环依赖。
     */
    const counterAskRef = useRef<((attackerId: string, targetId: string) => Promise<void>) | null>(
        null
    );

    const pendingDefenseRef = useRef<Record<string, DefenseResult[]>>({});
    const positionsRef = useRef<Record<string, CombatPosition>>({});
    const battleMapRef = useRef<BattleMap>(DEFAULT_BATTLE_MAP);
    const coversRef = useRef<Cover[]>([]);
    /**
     * 手枪「未移动则首次攻击免 AP」的回合内标记（key = 我方 targetId）。
     * 每回合开始（restoreAP）与开战时重置。
     */
    const movedThisTurnRef = useRef<Record<string, boolean>>({});
    const freePistolShotUsedRef = useRef<Record<string, boolean>>({});
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

    /** 相位 ref：窗口关闭时需要按当前相位恢复「自动结算中」的忙状态。 */
    const playerPhaseRef = useRef(false);
    const setPlayerPhaseSafe = useCallback((value: boolean) => {
        playerPhaseRef.current = value;
        setIsPlayerPhase(value);
    }, []);

    /** 无窗口在开且处于敌方阶段时，引擎应保持「自动结算中」。 */
    const restoreFlowBusy = useCallback(() => {
        setBusy(!playerPhaseRef.current && !insertActionRef.current);
    }, [setBusy]);

    //--------------------------------------------------------------------------
    // 战场空间（纯逻辑层）
    //--------------------------------------------------------------------------
    const setPositionsSafe = useCallback((next: Record<string, CombatPosition>) => {
        positionsRef.current = next;
        setPositions(next);
    }, []);

    const setBattleMapSafe = useCallback((next: BattleMap) => {
        battleMapRef.current = next;
        setBattleMap(next);
    }, []);

    const setCoversSafe = useCallback((value: SetStateAction<Cover[]>) => {
        const next =
            typeof value === 'function'
                ? (value as (prev: Cover[]) => Cover[])(coversRef.current)
                : value;
        coversRef.current = next;
        setCovers(next);
    }, []);

    /** 读取单位在战场上的坐标；未知单位按「纵深下限 / 0 轨」处理。 */
    const getPosition = useCallback((unitId: string): CombatPosition => {
        const stored = positionsRef.current[unitId];
        if (stored) return stored;
        return { x: battleMapRef.current.depthRange[0], y: 0 };
    }, []);

    /** 两个单位之间的战场距离（切比雪夫距离）。 */
    const getDistance = useCallback(
        (aId: string, bId: string): number =>
            getBattleDistance(getPosition(aId), getPosition(bId)),
        [getPosition]
    );

    /** 该格是否可通行：地图范围内且无未摧毁的不可通行掩体。 */
    const isWalkableCell = useCallback(
        (cell: CombatPosition): boolean =>
            isCellWalkable(battleMapRef.current, coversRef.current, cell),
        []
    );

    /** 单次位移的行动点消耗 = 基础值 + 环境移动修正（至少 1 点）。 */
    const getMoveCost = useCallback((): number => {
        const delta = safeNumber(battleMapRef.current.modifiers?.moveCostDelta, 0);
        return Math.max(1, COMBAT_CONFIG.MOVE_AP_COST + Math.floor(delta));
    }, []);

    /**
     * 单位的攻击距离：
     * - 我方 = 主手武器 range（0 = 无限）；未装备武器视为 1（贴身）。
     * - 敌方 = 模板自身 range；缺失时回落到统一默认值。
     */
    const getUnitRange = useCallback((unitId: string): number => {
        const ally = alliesRef.current.find((a, idx) => getAllyTargetId(a, idx) === unitId);
        if (ally) {
            const weapon = getPrimaryWeapon(ally.equipment);
            return weapon ? Math.max(0, safeNumber(weapon.range, 1)) : 1;
        }
        const enemy = enemiesRef.current.find((e) => e.instanceId === unitId);
        if (enemy) return Math.max(0, safeNumber(enemy.range, COMBAT_CONFIG.ENEMY_DEFAULT_RANGE));
        return COMBAT_CONFIG.ENEMY_DEFAULT_RANGE;
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
        (value: SetStateAction<Array<Entity<CompanionTemplate, CompanionDynamicState>>>) => {
            const next =
                typeof value === 'function'
                    ? (value as (
                        prev: Array<Entity<CompanionTemplate, CompanionDynamicState>>
                    ) => Array<
                        Entity<CompanionTemplate, CompanionDynamicState>
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
            setCombatLog((prev) => [...prev.slice(-(COMBAT_LOG_LIMIT - 1)), text]);
            addLog(text, 'combat');
        },
        [addLog]
    );

    /**
     * 写回位置表，并把坐标同步进各实体自身的 `location` 字段。
     *
     * `positions` 是引擎运行时的位置权威源，`location` 是契约要求实体自带的副本，
     * 两者必须同源，否则 UI 与结算会读到两套坐标。
     */
    const syncLocations = useCallback(
        (next: Record<string, CombatPosition>) => {
            setPositionsSafe(next);

            const nextAllies = alliesRef.current.map((ally, idx) => {
                const cell = next[getAllyTargetId(ally, idx)];
                return cell ? { ...ally, location: { ...cell } } : ally;
            });
            if (nextAllies.some((ally, idx) => ally !== alliesRef.current[idx])) {
                setAlliesSafe(nextAllies);
            }

            const nextEnemies = enemiesRef.current.map((enemy) => {
                const cell = next[enemy.instanceId];
                return cell ? { ...enemy, location: { ...cell } } : enemy;
            });
            if (nextEnemies.some((enemy, idx) => enemy !== enemiesRef.current[idx])) {
                setEnemiesSafe(nextEnemies);
            }
        },
        [setPositionsSafe, setAlliesSafe, setEnemiesSafe]
    );

    //--------------------------------------------------------------------------
    // 蓄反槽清理
    //--------------------------------------------------------------------------
    /**
     * 清除与某单位相关的全部蓄反槽。
     * 单位一旦阵亡，它持有的槽（owner）与由它触发的槽（trigger）都立即失效，
     * 既不参与后续判定，也不再于回合结束时转化行动点。
     */
    const purgeCounterSlotsFor = useCallback(
        (unitId: string) => {
            const strip = <T extends CombatDynamicState>(dyn: T): T => {
                const slots = dyn.accumulateCounter ?? [];
                if (!slots.some((entry) => entry.ownerId === unitId || entry.triggerId === unitId)) {
                    return dyn;
                }
                return {
                    ...dyn,
                    accumulateCounter: slots.filter(
                        (entry) => entry.ownerId !== unitId && entry.triggerId !== unitId
                    ),
                } as T;
            };

            const nextAllies = alliesRef.current.map((ally) => strip(ally));
            if (nextAllies.some((ally, idx) => ally !== alliesRef.current[idx])) {
                alliesRef.current = nextAllies;
                setAlliesSafe(nextAllies);
            }
            const nextEnemies = enemiesRef.current.map((enemy) => strip(enemy));
            if (nextEnemies.some((enemy, idx) => enemy !== enemiesRef.current[idx])) {
                setEnemiesSafe(nextEnemies);
            }
        },
        [setAlliesSafe, setEnemiesSafe]
    );

    //--------------------------------------------------------------------------
    // 待触发防御判定（FIFO 消费）
    //--------------------------------------------------------------------------
    const commitPendingDefense = useCallback(() => {
        setPendingDefense({ ...pendingDefenseRef.current });
    }, []);

    const addPendingDefense = useCallback(
        (targetId: string, result: DefenseResult) => {
            // 契约未声明层数上限：防御战术布设的每一层都保留，受击时按 FIFO 逐层消费。
            pendingDefenseRef.current[targetId] = [
                ...(pendingDefenseRef.current[targetId] ?? []),
                result,
            ];
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
            if (ally.hp > 0) acc.push(getAllyTargetId(ally, idx));
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
     * - 敌人（cthulhu / immovable）：四维直取，attack = damage；
     *   defense / evasion 是模板原始点数，不在此覆写（结算时统一百分化）；
     * - 我方：六维 + 装备，attack / defense / evasion / range 全部由装备与属性推导。
     * 实体数值因增益 / 减益变化时不重新生成序列。
     */
    const recalcDerivedDynamic = useCallback(
        (dyn: CombatDynamicState, isEnemy: boolean): CombatDynamicState => {
            if (isEnemy) {
                const enemyDyn = dyn as CombatDynamicState & { damage?: number };
                const speed = Math.max(0, safeNumber(enemyDyn.speed));
                return {
                    ...dyn,
                    speed,
                    attack: calculateEnemyAttackValue(safeNumber(enemyDyn.damage)),
                    actionPoint: { ...dyn.actionPoint, base: Math.floor(speed / 5) },
                };
            }

            const allyDyn = dyn as CombatAlly;
            const equipment = normalizeEquipState(allyDyn.equipment);
            const weapon = getPrimaryWeapon(equipment);
            const speed = Math.max(0, safeNumber(allyDyn.agility));
            return {
                ...dyn,
                combatBonus: calculateCombatBonus(safeNumber(allyDyn.wisdom)),
                speed,
                attack: getAttackDamageScale({
                    contextual: true,
                    strength: allyDyn.strength,
                    wisdom: allyDyn.wisdom,
                    weapon,
                    offhandEmpty: !equipment.weapons.side,
                }).hit,
                defense: getEquipPartialReduction(equipment),
                evasion: getAgilityEvasion(allyDyn.agility),
                range: weapon ? Math.max(0, safeNumber(weapon.range, 1)) : 1,
                actionPoint: { ...dyn.actionPoint, base: Math.floor(speed / 5) },
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
            // 完整快照已包含最终 hp/sanity（applyCombatToDynamic）。
            // 历史版本在此叠加增量（updatePlayer/updateCompanion），会被 React
            // 顺序复合导致双倍结算，已移除。
            // 该路径仅处理我方单位，运行时形状即 CombatAlly（含六维与装备）。
            const combatAlly = dynamic as CombatAlly;
            if (targetId === 'player') {
                setPlayerState((prev) => {
                    const next: PlayerState = {
                        ...prev,
                        dynamic: applyCombatToDynamic(prev.dynamic, combatAlly),
                    };
                    playerStateRef.current = next;
                    return next;
                });
                return;
            }
            setCompanionsSafe((prev) =>
                prev.map((c) =>
                    c.static.id === targetId
                        ? { ...c, dynamic: applyCombatToDynamic(c.dynamic, combatAlly) }
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
                // 结果修正 / 序列修正类效果只存在于状态下，随战斗结束一并失效；
                // 需要回收的只有写进了动态态的体征上限。
                list
                    .filter((fx) => isVitalType(fx.type))
                    .forEach((fx) => {
                        next = applyVitalEffect(next, fx.type, -fx.value);
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
                revertPersistentEffects(getAllyTargetId(ally, idx));
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
        counterPrepayUsedRef.current = {};
        setEnemiesSafe([]);
        setEnemyIntentsSafe([]);
        setPlayerPhaseSafe(false);
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
            purgeCounterSlotsFor(d.instanceId);
            delete fatigueRef.current[d.instanceId];
            delete usedCounterRef.current[d.instanceId];
            delete carryApRef.current[d.instanceId];
            delete counterPrepayUsedRef.current[d.instanceId];
            if (insertActionRef.current?.unitId === d.instanceId) endInsertAction();

            // 敌人已无六维：按四维与体量估算击杀经验（TODO 数值迁移时确认）。
            const xp = 20 + Math.floor(d.attack + d.speed + safeNumber(d.maxHp) / 5);
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
        purgeCounterSlotsFor,
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
            const tid = getAllyTargetId(ally, idx);
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
                    purgeCounterSlotsFor(tid);
                    delete fatigueRef.current[tid];
                    delete usedCounterRef.current[tid];
                    delete carryApRef.current[tid];
                    delete counterPrepayUsedRef.current[tid];
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
            setPlayerPhaseSafe(false);
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
        purgeCounterSlotsFor,
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
     * 各槽位长度不一致时按最小长度对齐，保证同步消费不会错位。
     */
    const prepareSequence = useCallback(
        (entity: CombatAlly, entityId: string): CombatAlly => {
            let next = recalcDerivedDynamic(entity, false) as CombatAlly;

            if (sequenceMinLength(next.resultSequence) === 0) {
                const staminaCost = getExhaustStaminaCost(next.maxStamina);
                const afterStamina = clamp(next.stamina - staminaCost, 0, next.maxStamina);

                // 体力不足以重生成：序列保持全空，实体无法行动。
                if (getSequenceLength(afterStamina) <= 0) {
                    return {
                        ...next,
                        resultSequence: generateAllyResultSequence({
                            strength: next.strength,
                            agility: next.agility,
                            wisdom: next.wisdom,
                            awareness: next.awareness,
                            stamina: 0,
                            evasion: getAgilityEvasion(next.agility),
                            equipment: next.equipment,
                        }),
                    };
                }

                next = { ...next, stamina: afterStamina };
                fatigueRef.current[entityId] = (fatigueRef.current[entityId] ?? 0) + 1;

                return {
                    ...next,
                    resultSequence: generateAllyResultSequence({
                        strength: next.strength,
                        agility: next.agility,
                        wisdom: next.wisdom,
                        awareness: next.awareness,
                        stamina: next.stamina,
                        evasion: getAgilityEvasion(next.agility),
                        equipment: next.equipment,
                        fatigueCount: fatigueRef.current[entityId],
                    }),
                };
            }

            const length = sequenceMinLength(next.resultSequence);
            return next.resultSequence.defense.length === length &&
                ATTACK_SLOTS.every((slot) => (next.resultSequence[slot]?.length ?? 0) === length)
                ? next
                : {
                    ...next, resultSequence: rebuildSequence(
                        next.resultSequence,
                        (list) => list.slice(0, length),
                        (list) => list.slice(0, length)
                    )
                };
        },
        [recalcDerivedDynamic]
    );

    /**
     * 友方攻击：从本次实际使用武器对应的槽位消费一节攻击序列，
     * 同时推进全部序列槽（含防御序列）。
     */
    const drawAttackResult = useCallback(
        <T extends CombatAlly>(
            entity: T,
            entityId: string,
            slot: AttackSlot
        ): { attackResult: AttackResult; updatedEntity: T } => {
            const prepared = prepareSequence(entity, entityId);
            const sequence = prepared.resultSequence;
            const result =
                sequence[slot]?.[0] ?? sequence.attack?.[0] ?? (['miss', 0] as AttackResult);
            return {
                attackResult: result,
                updatedEntity: {
                    ...entity,
                    ...prepared,
                    resultSequence: rebuildSequence(
                        sequence,
                        (list) => list.slice(1),
                        (list) => list.slice(1)
                    ),
                } as T,
            };
        },
        [prepareSequence]
    );

    /**
     * 友方防御：消费常驻防御序列，同时推进全部序列槽。
     * 防御结果储存进 pendingDefense 待消费。
     */
    const drawDefenseResult = useCallback(
        <T extends CombatAlly>(
            entity: T,
            entityId: string
        ): { defenseResult: DefenseResult; updatedEntity: T } => {
            const prepared = prepareSequence(entity, entityId);
            const sequence = prepared.resultSequence;
            const result = sequence.defense[0] ?? (['fail', 0] as DefenseResult);
            return {
                defenseResult: result,
                updatedEntity: {
                    ...entity,
                    ...prepared,
                    resultSequence: rebuildSequence(
                        sequence,
                        (list) => list.slice(1),
                        (list) => list.slice(1)
                    ),
                } as T,
            };
        },
        [prepareSequence]
    );

    //--------------------------------------------------------------------------
    // 伤害结算
    // 最终免伤比 = 防御序列裁定的 partial 值（常驻免伤 ~ 最大免伤）
    // 护盾位于防御结果之后、生命值之前
    // 不在此累积蓄反：蓄反按「每次攻击」在攻击发生处结算（executeTactic / enemyAttack）
    //--------------------------------------------------------------------------
    /**
     * 攻击前的战场修正：环境命中 / 武器类型乘区 / 掩体拦截 / 武器类型专属命中特性。
     *
     * - 命中：按命中阶梯整档移动。EnvironmentModifier.accuracyBonus 与
     *   武器类型的 accuracyDelta 决定升降档，掩体再按覆盖率概率额外降一档；
     * - 瞄准（狙击步枪）：已消耗 1 AP 瞄准时，本次判定提升 1 档；原结果为 crit 则伤害翻倍；
     * - 距离降级（狙击步枪）：距离小于最佳攻击距离时，按距离亏损概率整档降级，
     *   贴身时有概率从 crit 直接降为 miss；
     * - 伤害乘区：weaponTypeModifier[weaponType].damageMultiplier；
     * - 返回拦截掩体，供伤害按覆盖率吸收与掩体耐久结算。
     */
    const applyAttackModifiers = useCallback(
        (
            attackerId: string,
            targetId: string,
            scale: AttackDamageScale,
            rawResult: AttackResult,
            weaponType?: WeaponType
        ): {
            attackResult: AttackResult
            damageMultiplier: number
            blockingCover?: Cover
            /** 瞄准命中 crit 时的伤害翻倍标记。 */
            critDoubled: boolean
        } => {
            const { blockingCover, accuracyDelta, damageMultiplier } = resolveBattleModifiers(
                battleMapRef.current,
                coversRef.current,
                positionsRef.current[attackerId],
                positionsRef.current[targetId],
                weaponType
            );
            const trait = getWeaponTrait(weaponType);

            let steps = 0;
            if (accuracyDelta !== 0 && Math.random() < Math.min(1, Math.abs(accuracyDelta))) {
                steps += accuracyDelta > 0 ? 1 : -1;
            }
            if (blockingCover && Math.random() < clamp(safeNumber(blockingCover.coverRate), 0, 1)) {
                steps -= 1;
            }

            let result = shiftAttackResult(rawResult, scale, steps);
            // 瞄准（aim）不再是武器类型特性：改由战术效果的 a_sequence / aim 键在攻击链路中统一升档，
            // 原结果为 crit 时的「伤害翻倍」也在该处判定（见 resolveAllyAttack）。
            const critDoubled = false;

            // 距离降级：狙击步枪在最佳攻击距离内会随距离缩短而失准。
            if (trait.optimalRange > 0) {
                const from = positionsRef.current[attackerId];
                const to = positionsRef.current[targetId];
                if (from && to) {
                    const distance = getBattleDistance(from, to);
                    const chance = getSniperDowngradeChance(distance, trait.optimalRange);
                    if (chance > 0 && Math.random() < chance) {
                        // 距离越近降级越狠：亏损比例越高，一次跨越的档位越多。
                        const stepCount = clamp(
                            Math.ceil(chance * COMBAT_CONFIG.SNIPER_MAX_DOWNGRADE_STEPS),
                            1,
                            COMBAT_CONFIG.SNIPER_MAX_DOWNGRADE_STEPS
                        );
                        result = shiftAttackResult(result, scale, -stepCount);
                    }
                }
            }

            return {
                attackResult: result,
                damageMultiplier,
                blockingCover,
                critDoubled,
            };
        },
        []
    );

    /**
     * 掩体拦截伤害：按覆盖率吸收，吸收量转为掩体耐久损耗；
     * 耐久归零即被摧毁（此后不再提供掩护）。
     *
     * 契约 `CoverTemplate.canBeDestoryed`：只有声明了该字段的掩体才可被摧毁并计入耐久损耗；
     * 未声明者是永久掩体，只吸收伤害、不掉耐久。
     *
     * @returns 穿透掩体后的实际伤害
     */
    const absorbDamageByCover = useCallback(
        (cover: Cover | undefined, raw: number): number => {
            if (!cover) return raw;
            const rate = clamp(safeNumber(cover.coverRate), 0, 1);
            const absorbed = Math.max(0, safeNumber(raw)) * rate;
            const remaining = Math.max(0, safeNumber(raw) - absorbed);
            if (!isCoverDestructible(cover) || absorbed <= 0) return remaining;

            const nextHp = Math.max(0, safeNumber(cover.hp) - absorbed);
            const destroyed = nextHp <= 0;
            setCoversSafe((prev) =>
                prev.map((entry) => (entry === cover ? { ...entry, hp: nextHp } : entry))
            );
            const maxHp = getCoverMaxDurability(cover) ?? nextHp;
            addCombatLog(
                destroyed
                    ? `[掩体崩解] 掩体「${cover.name}」被彻底摧毁，掩护消失。`
                    : `[掩体承伤] 掩体「${cover.name}」承受 ${Math.round(absorbed)} 点损伤（剩余耐久 ${Math.round(nextHp)}/${Math.round(maxHp)}）。`
            );
            return remaining;
        },
        [setCoversSafe, addCombatLog]
    );

    /**
     * 对敌人结算伤害。
     *
     * @param pierceRatio 暴击无视防御的比例（0~1）：刺击类暴击无视全部 defense，
     *   狙击步枪暴击无视 0.3 defense，其余武器为 0。仅在该次判定为 crit 时由调用方传入。
     */
    const dealDamageToEnemy = useCallback(
        (targetId: string, raw: number, pierceRatio = 0): number => {
            const enemy = getEnemy(targetId);
            if (!enemy || enemy.isDead || enemy.hp <= 0) return 0;

            const mods = getCombatResultModifiers(enemy.status);
            const defense = takePendingDefense(targetId);
            let finalReduction =
                getEnemyReductionRange(enemy).floor + safeNumber(mods.defense) / 100;
            if (defense) {
                if (defense[0] === 'dodge') {
                    playSfx('combat_miss');
                    return 0;
                }
                // partial 的值本身即最终免伤比（防御序列已把常驻免伤并入取值区间）。
                if (defense[0] === 'partial') finalReduction = defense[1];
            }
            // 暴击穿透：按比例削减目标的常驻免伤（免伤比按比例打折，而非直接归零）。
            const pierce = clamp(safeNumber(pierceRatio), 0, 1);
            if (pierce > 0) finalReduction *= 1 - pierce;
            // 敌人无装备，不存在盾牌口径，上限固定为非盾上限 0.999。
            finalReduction = clamp(finalReduction, -1, MAX_PARTIAL_REDUCTION);

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

            const mods = getCombatResultModifiers(ally.status);
            const dSteps = getSequenceShift(ally.status, 'd');

            let defense = takePendingDefense(targetId);
            // 防御序列修正（d_sequence）：按防御阶梯整档移动；该判定同时消耗按判定计数的防御效果。
            if (defense) {
                defense = shiftDefenseResult(defense, dSteps);
                mutateAlly(targetId, (dyn) => ({
                    ...dyn,
                    status: consumeJudgementStatuses(dyn.status, 'd'),
                }));
            }

            // 结果修正：defense / evasion 以百分点给出（与敌人模板点数同口径）。
            let finalReduction = safeNumber(ally.defense) + safeNumber(mods.defense) / 100;
            if (defense) {
                if (defense[0] === 'dodge') {
                    playSfx('combat_miss');
                    return 0;
                }
                // partial 的值本身即最终免伤比（防御序列已把常驻免伤并入取值区间）。
                if (defense[0] === 'partial') finalReduction = defense[1];
            }
            // 上限按武器口径收敛：盾牌类叠加到 1 时部分闪避也可为 1（满额抵挡），其余不超过 0.999。
            const weaponType = getPrimaryWeapon(normalizeEquipState(ally.equipment))?.weaponType;
            const reductionCap = clamp(
                getDefenseMaxReduction(weaponType) + safeNumber(mods.evasion) / 100,
                -1,
                1
            );
            finalReduction = clamp(finalReduction, -1, reductionCap);

            const mitigated = Math.max(0, safeNumber(raw) * (1 - finalReduction));
            const { newShield, actualDmg } = processDamageDeduction(ally.shield, mitigated);
            const actual = fix1(actualDmg);

            // 契约：partial 裁定值为 1 时只消耗盾牌耐久，其余情况每件在役护甲消耗 1 点耐久。
            const shieldOnly = defense?.[0] === 'partial' && safeNumber(defense[1]) >= 1;
            const wornEquipment = spendDefenseDurability(
                normalizeEquipState(ally.equipment) as EquipState,
                shieldOnly
            );

            // 装备（耐久损耗）与护盾、生命一并写回；CombatAlly 在动态态之上另持 equipment。
            const dyn = {
                ...ally,
                equipment: wornEquipment,
                shield: newShield,
                hp: fix1(ally.hp - actual),
            } as CombatDynamicState;

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
            type: TacticEffectType,
            rawValue: number,
            duration = 0,
            sourceId = 'system',
            sourceName = 'System'
        ) => {
            const value = round1(rawValue);
            if (value === 0) return;

            // 位移效果（left / right / up / down）：按战场坐标即时执行一步，不存状态。
            if (isDisplacementEffect(type)) {
                const from = positionsRef.current[targetId];
                if (!from) return;
                const dir: MoveDirection =
                    type === 'left'
                        ? 'lane_left'
                        : type === 'right'
                            ? 'lane_right'
                            : type === 'up'
                                ? 'forward'
                                : 'backward';
                const to = getSteppedCell(from, dir);
                if (!isWalkableCell(to)) return;
                syncLocations({ ...positionsRef.current, [targetId]: to });
                const name = isEnemyTarget(targetId)
                    ? getEnemy(targetId)?.name
                    : getAlly(targetId)?.name;
                addCombatLog(`[位移] ${name ?? targetId} 被强制位移一格。`);
                return;
            }

            /**
             * 效果分三类（契约 TacticEffectType）：
             * - 即时写入（体征 / 体征上限 / 行动点 / 护盾）：直接改写动态态；
             * - 结果修正（speed / damage / aim / crit_chance / crit_bonus / defense / evasion）
             *   与序列修正（a_sequence / d_sequence）：只存状态，判定时由
             *   getCombatResultModifiers / getSequenceShift 读取，不写动态态；
             * - duration = 0 表示下一次结果判定后即消耗（见 consumeJudgementStatuses）。
             */
            const instantWrite = isVitalEffectType(type) || type === 'ap' || type === 'shield';
            const shouldStore = !instantWrite || duration !== 0;
            const statusItem: CombatStatus = { sourceId, sourceName, type, value, duration };

            const apply = (dyn: CombatDynamicState): CombatDynamicState => {
                const applied = instantWrite ? applyVitalEffect(dyn, type, value) : dyn;
                if (!shouldStore) return applied;
                return { ...applied, status: storeStatusItem(applied.status ?? [], statusItem) };
            };

            if (isEnemyTarget(targetId)) {
                const enemy = getEnemy(targetId);
                if (!enemy || enemy.isDead || enemy.hp <= 0) return;
                mutateEnemyById(targetId, apply);
                playSfx(value < 0 || type === 'ap' ? 'combat_debuff' : 'combat_buff');
                checkEnemyDeaths();
                return;
            }

            const ally = getAlly(targetId);
            if (!ally || ally.hp <= 0) return;
            mutateAlly(targetId, apply);
            playSfx(value < 0 || type === 'ap' ? 'combat_debuff' : 'combat_buff');
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
            isWalkableCell,
            syncLocations,
            addCombatLog,
        ]
    );

    /**
     * 回合结束的状态 tick。
     *
     * 判定计数的效果（a_sequence / d_sequence 与 aim）不按回合递减，只按判定次数消耗
     * （见 consumeJudgementStatuses）；其余效果按回合递减，归零时回收体征上限的写入。
     */
    const tickEffects = useCallback(
        (targetId: string) => {
            const target = isEnemyTarget(targetId) ? getEnemy(targetId) : getAlly(targetId);
            if (!target || !target.status || !target.status.length) return;

            const applyEndTick = (dyn: CombatDynamicState): CombatDynamicState => {
                const { remaining, expired } = tickRoundStatuses(
                    dyn.status,
                    (fx) => !(fx.duration > 0 && (isSequenceEffect(fx.type) || fx.type === 'aim'))
                );
                let next = dyn;
                expired
                    .filter((fx) => isVitalType(fx.type))
                    .forEach((fx) => {
                        next = applyVitalEffect(next, fx.type, -fx.value);
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
        async (request: CounterAdvanceRequest): Promise<CounterDecisionResult> => {
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
     * 蓄反积累：当前行动角色发起攻击时，
     * 它对面的所有速度大于它的角色，各自在「自己 × 攻击方」槽内按 |速度差| 累积蓄反值。
     *
     * 与「谁被攻击」无关：一次攻击会同时喂养对面所有更快角色的槽，
     * 受击方是否更快、是否被命中都不影响积累（instant 伤害不走此路径）。
     */
    const accumulateCountersAcrossOpponents = useCallback(
        (attackerId: string) => {
            const attackerIsEnemy = isEnemyTarget(attackerId);
            const attacker = attackerIsEnemy ? getEnemy(attackerId) : getAlly(attackerId);
            if (!attacker || attacker.hp <= 0) return;
            const attackerSpeed = safeNumber(attacker.speed);

            if (attackerIsEnemy) {
                alliesRef.current.forEach((ally, idx) => {
                    if (ally.hp <= 0) return;
                    const opponentId = getAllyTargetId(ally, idx);
                    const diff = safeNumber(ally.speed) - attackerSpeed;
                    if (diff <= 0) return;
                    mutateAlly(opponentId, (dyn) =>
                        addAccumulateCounter(dyn, opponentId, attackerId, diff)
                    );
                });
                return;
            }

            enemiesRef.current.forEach((enemy) => {
                if (enemy.isDead || enemy.hp <= 0) return;
                const diff = safeNumber(enemy.speed) - attackerSpeed;
                if (diff <= 0) return;
                mutateEnemyById(enemy.instanceId, (dyn) =>
                    addAccumulateCounter(dyn, enemy.instanceId, attackerId, diff)
                );
            });
        },
        [isEnemyTarget, getEnemy, getAlly, mutateAlly, mutateEnemyById]
    );

    /** 该角色的 actionPoint.base。 */
    const actionPointBaseOf = useCallback(
        (unit: CombatDynamicState): number => Math.max(0, Math.floor(safeNumber(unit.actionPoint.base))),
        []
    );

    /** 本回合该角色通过蓄反 / 差反已预支的行动点合计。 */
    const prepayUsedOf = useCallback(
        (unitId: string): number => Math.max(0, safeNumber(counterPrepayUsedRef.current[unitId])),
        []
    );

    /**
     * 本回合剩余的预支配额 = actionPoint.base + actionPoint.current − 已预支合计。
     * 蓄反与差反共享该额度：无论触发 / 接受几次，预支的行动点加值都不得超过
     * 「基础行动点 + 当前行动点」；额度耗尽即不再发起询问。
     */
    const prepayQuotaLeftOf = useCallback(
        (unitId: string, unit: CombatDynamicState): number =>
            Math.max(
                0,
                actionPointBaseOf(unit) +
                Math.max(0, safeNumber(unit.actionPoint.current)) -
                prepayUsedOf(unitId)
            ),
        [actionPointBaseOf, prepayUsedOf]
    );

    /** 该单位当前可承受的预支点数（现金 + 可借额度，保证下回合行动不为负）。 */
    const affordableOf = useCallback(
        (unit: CombatDynamicState): number =>
            Math.max(
                0,
                safeNumber(unit.actionPoint.current) +
                Math.max(
                    0,
                    safeNumber(unit.actionPoint.base) - safeNumber(unit.actionPoint.advanced)
                )
            ),
        []
    );

    /**
     * 蓄反 / 差反预支结算（统一处理敌我双方）。
     *
     * 规则 5：预支成本（蓄反 n 点 / 差反 2n 点）优先消耗当前行动点，
     * 不足部分记入下回合 advanced 债务；蓄反额外从「owner × trigger」单槽消耗 5n 点蓄反值。
     * 收益：由 runInsertAction 以 windowAp 为可用行动点开启「立即行动」窗口
     * （蓄反 windowAp = n；差反 windowAp = n，即预支量 2n 的一半）。
     */
    const grantCounterAdvance = useCallback(
        (
            unitId: string,
            type: CounterType,
            prepay: number,
            counterCost: number,
            triggerId: string,
            windowAp: number
        ) => {
            const isAllyUnit = !isEnemyTarget(unitId);
            const name = (isAllyUnit ? getAlly(unitId)?.name : getEnemy(unitId)?.name) ?? unitId;
            const cost = Math.max(0, Math.floor(safeNumber(prepay)));
            const consume = Math.max(0, Math.floor(safeNumber(counterCost)));
            const windowBudget = Math.max(0, Math.floor(safeNumber(windowAp)));
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
            // 累计预支配额：蓄反 / 差反共享，本回合合计不得超过 actionPoint.base。
            counterPrepayUsedRef.current[unitId] = prepayUsedOf(unitId) + cost;
            addCombatLog(
                type === 'accumulate'
                    ? `[蓄反] ${name} 消耗 ${consume} 点蓄反值、预支 ${cost} 点行动力（本回合预支合计 ${counterPrepayUsedRef.current[unitId]}），开启立即行动窗口（可用行动点 ${windowBudget}）。`
                    : `[差反] ${name} 预支 ${cost} 点行动力（本回合预支合计 ${counterPrepayUsedRef.current[unitId]}），开启立即行动窗口（可用行动点 ${windowBudget}）。`
            );
            playSfx('tactic_execute');
        },
        [isEnemyTarget, getAlly, getEnemy, mutateAlly, mutateEnemyById, addCombatLog, prepayUsedOf]
    );

    /**
     * 回合结束结算某单位的蓄反槽：
     * 未消耗蓄反值 × 0.1 向上取整转为额外行动点（该单位下一个回合开始时到账），随后清空其全部槽。
     */
    const settleCounterAtTurnEnd = useCallback(
        (unitId: string, isEnemyUnit: boolean) => {
            const unit = isEnemyUnit ? getEnemy(unitId) : getAlly(unitId);
            if (!unit || unit.isDead || unit.hp <= 0) return;
            if (!(unit.accumulateCounter ?? []).length) return;
            const { extraAp } = settleCounterSlots(unit, unitId);
            if (extraAp > 0) {
                carryApRef.current[unitId] = (carryApRef.current[unitId] ?? 0) + extraAp;
            }
            const mutateUnit = isEnemyUnit ? mutateEnemyById : mutateAlly;
            mutateUnit(unitId, (dyn) => ({
                ...dyn,
                accumulateCounter: dyn.accumulateCounter.filter((entry) => entry.ownerId !== unitId),
            }));
        },
        [getEnemy, getAlly, mutateAlly, mutateEnemyById]
    );

    /**
     * 阶段结束结算：清空全场所有实体的蓄反槽。
     *
     * 蓄反值由「攻击方」在其回合内积累，因此清算必须发生在该阶段结束时：
     * - 玩家阶段结束 → 玩家攻击积累的敌方槽清算（敌方下个回合开始到账）；
     * - 敌方阶段结束 → 敌方攻击积累的我方槽清算（我方下个回合开始到账）。
     * 若只在实体自身回合结束时清算自己的槽，则敌方阶段积累的我方蓄反值会整轮残留
     * （面板显示未清空、额外 AP 延后一轮到账）。
     */
    const settleAllCounterSlots = useCallback(() => {
        alliesRef.current.forEach((ally, idx) => {
            const tid = getAllyTargetId(ally, idx);
            if (ally.hp <= 0) return;
            settleCounterAtTurnEnd(tid, false);
        });
        enemiesRef.current.forEach((enemy) => {
            if (enemy.isDead || enemy.hp <= 0) return;
            settleCounterAtTurnEnd(enemy.instanceId, true);
        });
    }, [settleCounterAtTurnEnd]);

    /** 该单位是否跳过某类预支询问（跳过 = 自动拒绝，不弹询问）。 */
    const isCounterSkipped = useCallback(
        (unitId: string, type: CounterType): boolean =>
            counterSkipRef.current[unitId]?.[type] === true,
        []
    );

    /** 设置 / 取消跳过开关（玩家方单位卡片上的「跳过询问」）。 */
    const setCounterSkipFor = useCallback(
        (unitId: string, type: CounterType, skip: boolean) => {
            const prev = counterSkipRef.current;
            counterSkipRef.current = {
                ...prev,
                [unitId]: { ...(prev[unitId] ?? { accumulate: false, differential: false }), [type]: skip },
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
        // 窗口关闭：恢复「自动结算中」状态（敌方阶段恢复锁定，我方阶段交还操作权）。
        restoreFlowBusy();
        const resolver = insertActionResolverRef.current;
        insertActionResolverRef.current = null;
        if (resolver) resolver();
    }, [restoreFlowBusy]);

    /**
     * 消耗「立即行动」窗口的行动点；耗尽时自动关闭窗口。
     * 窗口按行动点结算而非按「次」：每次行动按其自身行动点成本扣除（移动 1 点、战术取 apCost）。
     */
    const spendInsertActionAp = useCallback(
        (cost: number) => {
            const current = insertActionRef.current;
            if (!current) return;
            const apLeft = Math.max(0, current.apLeft - Math.max(0, safeNumber(cost)));
            if (apLeft <= 0) {
                endInsertAction();
                return;
            }
            insertActionRef.current = { ...current, apLeft };
            setInsertAction(insertActionRef.current);
        },
        [endInsertAction]
    );

    //--------------------------------------------------------------------------
    // 行动点恢复
    //--------------------------------------------------------------------------
    /**
     * 单位回合开始：
     * 基础回复 + 上回合未蓄反 / 差反额外 1 点 + 蓄反转行动点 − 已预支债务。
     * 敌我结算规则一致，仅写回通道不同，故合并为一处。
     */
    const restoreAP = useCallback(
        (unitId: string, isEnemyUnit: boolean) => {
            const mutateUnit = isEnemyUnit ? mutateEnemyById : mutateAlly;
            mutateUnit(unitId, (dyn) => {
                const derived = recalcDerivedDynamic(dyn, isEnemyUnit);
                const bonus = usedCounterRef.current[unitId] ? 0 : 1;
                const carry = carryApRef.current[unitId] ?? 0;
                const current = Math.max(
                    0,
                    derived.actionPoint.base + bonus + carry - derived.actionPoint.advanced
                );
                usedCounterRef.current[unitId] = false;
                carryApRef.current[unitId] = 0;
                // 新回合：重置本回合蓄反 / 差反预支配额（上限 = actionPoint.base）。
                delete counterPrepayUsedRef.current[unitId];
                // 新回合：重置手枪的移动 / 免费射击标记。
                movedThisTurnRef.current[unitId] = false;
                freePistolShotUsedRef.current[unitId] = false;
                return {
                    ...derived,
                    actionPoint: { ...derived.actionPoint, current, advanced: 0 },
                };
            });
        },
        [mutateAlly, mutateEnemyById, recalcDerivedDynamic]
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
            if (!enemyPos) return undefined;
            const range = safeNumber(enemy.range, COMBAT_CONFIG.ENEMY_DEFAULT_RANGE);

            const candidates = allyList
                .map((ally, idx) => ({ ally, id: getAllyTargetId(ally, idx) }))
                .filter(({ ally }) => safeNumber(ally.hp) > 0);

            let nearestDistance = Number.POSITIVE_INFINITY;
            let nearest: Array<{ ally: CombatAlly; id: string }> = [];
            for (const candidate of candidates) {
                const pos = positionsRef.current[candidate.id];
                if (!pos) continue;
                const distance = getBattleDistance(enemyPos, pos);
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
                            desc: `${fix1(enemy.attack)}`,
                            value: fix1(enemy.attack),
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
                    : getAllyTargetId(target, tIdx);

            let desc = '';
            let value: number | undefined;
            switch (type) {
                case 'attack':
                    value = fix1(enemy.attack);
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

    /**
     * 敌人朝目标移动一步：按 BFS 最短路绕开掩体行进（findNextStepToward）。
     * 返回是否发生位移；目标不可达时返回 false。
     */
    const stepEnemyToward = useCallback(
        (enemyId: string, targetId: string): boolean => {
            const from = positionsRef.current[enemyId];
            const to = positionsRef.current[targetId];
            if (!from || !to) return false;

            const next = findNextStepToward(
                battleMapRef.current,
                coversRef.current,
                from,
                to
            );
            if (!next) return false;
            syncLocations({ ...positionsRef.current, [enemyId]: next });
            return true;
        },
        [syncLocations]
    );

    /** 敌人攻击：动态计算攻击结果，不消费预生成序列。 */
    const enemyAttack = useCallback(
        (enemyId: string, targetId: string) => {
            const enemy = getEnemy(enemyId);
            if (!enemy || enemy.isDead || enemy.hp <= 0) return;

            // 蓄反：本次攻击无论是否命中 / 被闪避，都在攻击方对面的所有更快角色处累积。
            accumulateCountersAcrossOpponents(enemyId);

            const targetName = getAlly(targetId)?.name ?? targetId;
            const fatigue = fatigueRef.current[enemyId] ?? 0;
            // 战场修正：环境命中 / 掩体拦截（敌人无武器类型，不吃 weaponTypeModifier）。
            const { attackResult, damageMultiplier, blockingCover } = applyAttackModifiers(
                enemyId,
                targetId,
                getEnemyDamageScale(enemy.attack),
                rollEnemyAttackResult(enemy.attack, fatigue)
            );

            if (attackResult[0] === 'miss') {
                addCombatLog('[未命中] 敌对实体计算落空。');
                playSfx('combat_miss');
                return;
            }

            const raw = absorbDamageByCover(
                blockingCover,
                Math.max(0, attackResult[1]) * damageMultiplier
            );
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
        [
            getEnemy,
            getAlly,
            addCombatLog,
            dealDamageToAlly,
            accumulateCountersAcrossOpponents,
            applyAttackModifiers,
            absorbDamageByCover,
        ]
    );

    /**
     * 开启「立即行动」窗口：预支结算后的标准后续行为。
     *
     * apBudget = 窗口可用行动点（蓄反 = n；差反 = n，即预支 2n 的一半；
     * 预支成本由 grantCounterAdvance 结清）。
     * 窗口内可进行任意行动（不限制攻击次数），每次行动按其自身行动点成本消耗窗口行动点，
     * 行动点耗尽即窗口结束，也可随时主动结束窗口（endInsertAction）。
     *
     * - 我方（玩家方）：挂起主流程，等待玩家以该单位自由行动，行动点耗尽或玩家手动结束后回归原流程；
     * - 敌方：由引擎立即执行（射程内则攻击，否则逼近，直至行动点耗尽），
     *   每次攻击后同样即时询问对面的预支（与常规攻击一致）。
     */
    const runInsertAction = useCallback(
        async (unitId: string, apBudget: number) => {
            const budget = Math.max(0, Math.floor(safeNumber(apBudget)));
            if (!combatActiveRef.current || budget <= 0) return;
            const isAllyUnit = !isEnemyTarget(unitId);

            if (!isAllyUnit) {
                let apLeft = budget;
                while (combatActiveRef.current && apLeft > 0) {
                    const enemy = getEnemy(unitId);
                    if (!enemy || enemy.isDead || enemy.hp <= 0) return;

                    // 窗口内行动不限制次数：射程内攻击、否则逼近，按行动消耗窗口行动点。
                    const targetId = pickTargetByRule(enemy, alliesRef.current, true);
                    if (targetId) {
                        enemyAttack(unitId, targetId);
                        apLeft -= 1;
                        if (checkAllyDeath()) return;
                        // 即时应答：蓄反 / 差反预支（立即行动中的攻击同样询问）。
                        await counterAskRef.current?.(unitId, targetId);
                        if (!combatActiveRef.current) return;
                        if (checkAllyDeath()) return;
                        continue;
                    }

                    const approachId = pickTargetByRule(enemy, alliesRef.current, false);
                    if (!approachId || !stepEnemyToward(unitId, approachId)) {
                        addCombatLog(`[预支] ${enemy.name} 受战场限制，立即行动无法展开。`);
                        return;
                    }
                    addCombatLog(`[预支行动] ${enemy.name} 立即逼近目标。`);
                    apLeft -= 1;
                    await delay(80);
                }
                return;
            }

            await new Promise<void>((resolve) => {
                // 防御性处理：极端情况下若已有悬挂窗口，先放行旧流程，避免旧 Promise 永久挂起。
                insertActionResolverRef.current?.();
                insertActionRef.current = {
                    unitId,
                    apLeft: budget,
                    apMax: budget,
                };
                insertActionResolverRef.current = resolve;
                setInsertAction(insertActionRef.current);
                // 窗口期间把操作权交给玩家：解除锁定，避免敌方阶段结算中无法行动。
                setBusy(false);
                addCombatLog(
                    `[预支行动] ${getAlly(unitId)?.name ?? unitId} 开启立即行动窗口：可用行动点 ${budget} 点。`
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
            setBusy,
        ]
    );

    /**
     * 攻击结算后的即时应答：攻击方对面的相关角色当场选择是否预支行动力换取「立即行动」窗口。
     *
     * - 蓄反：攻击方对面的所有速度大于它的角色，各自按「owner × trigger」单槽独立判定——
     *   该槽达 5n 时 n = min(5n 折算的栈数, 剩余预支配额)，n > 0 则立即询问：
     *   消耗该槽 5n 点蓄反值、预支 n 点行动点，换取可用 n 点行动点的立即行动窗口；
     *   单槽不足 5n、或剩余预支配额不足以预支时，引擎不发起询问；
     * - 差反：攻击方对面所有速度 ≥ 10 的角色都可被询问：各自自选预支档位 2n
     *   （2n <= 剩余预支配额 且 2n <= 可承受额度，档位为不超过该上限的 2 的倍数），
     *   换取可用 n 点行动点的立即行动窗口（不消耗蓄反值）；
     * - 顺序：优先蓄反（全体），后差反（全体）；受击方排在同侧之首；
     * - 开关关闭 / 单位跳过时自动拒绝；
     * - 接受后开启「立即行动」窗口，由 runInsertAction 执行标准后续行为。
     */
    const maybeCounterAdvancesAfterAttack = useCallback(
        async (attackerId: string, targetId: string) => {
            if (!combatActiveRef.current) return;
            const attackerIsEnemy = isEnemyTarget(attackerId);
            const attacker = attackerIsEnemy ? getEnemy(attackerId) : getAlly(attackerId);
            if (!attacker || attacker.hp <= 0) return;
            const attackerSpeed = safeNumber(attacker.speed);
            const readUnit = (unitId: string) =>
                isEnemyTarget(unitId) ? getEnemy(unitId) : getAlly(unitId);

            // 攻击方对面的存活单位；受击方优先应答。
            const opponentIds = attackerIsEnemy
                ? alliesRef.current.reduce<string[]>((acc, ally, idx) => {
                    if (ally.hp > 0) acc.push(getAllyTargetId(ally, idx));
                    return acc;
                }, [])
                : enemiesRef.current
                    .filter((enemy) => !enemy.isDead && enemy.hp > 0)
                    .map((enemy) => enemy.instanceId);
            const orderedIds = [
                ...opponentIds.filter((id) => id === targetId),
                ...opponentIds.filter((id) => id !== targetId),
            ];

            // —— 优先：蓄反（对面所有更快角色，按各自单槽判定，不跨槽合并）——
            for (const unitId of orderedIds) {
                if (!combatActiveRef.current) return;
                const unit = readUnit(unitId);
                if (!unit || unit.isDead || unit.hp <= 0) continue;
                const unitIsAlly = !isEnemyTarget(unitId);
                if (!unitIsAlly && !accumulateCounterEnabled) continue;
                if (isCounterSkipped(unitId, 'accumulate')) continue;
                if (safeNumber(unit.speed) <= attackerSpeed) continue;

                const slotValue = getCounterPairValue(unit, unitId, attackerId);
                const stacks = Math.floor(slotValue / COMBAT_CONFIG.ACCUMULATE_COUNTER_THRESHOLD);
                // 蓄反：预支 n 点、窗口可用 n 点；n 由槽值（5n）决定，
                // 但受本回合剩余预支配额（base + current − 已预支合计）截断。
                const n = Math.min(stacks, prepayQuotaLeftOf(unitId, unit));
                if (n <= 0 || affordableOf(unit) < n) continue;

                const decision = await requestCounterAdvance({
                    type: 'accumulate',
                    entityId: unitId,
                    apToAdvance: n,
                    windowAp: n,
                    existQuota: prepayQuotaLeftOf(unitId, unit),
                });
                if (!mountedRef.current || !combatActiveRef.current) return;
                if (decision === false) continue;
                // 蓄反代价：从「owner × trigger」单槽消耗 5n 点蓄反值。
                const counterCost = n * COMBAT_CONFIG.ACCUMULATE_COUNTER_THRESHOLD;
                grantCounterAdvance(unitId, 'accumulate', n, counterCost, attackerId, n);
                await runInsertAction(unitId, n);
                if (!combatActiveRef.current) return;
            }

            // —— 后：差反（对面所有速度 ≥ 10 的角色；预支 2n 点、窗口可用 n 点，2n 由该单位选择）——
            for (const unitId of orderedIds) {
                if (!combatActiveRef.current) return;
                const unit = readUnit(unitId);
                if (!unit || unit.isDead || unit.hp <= 0) continue;
                const unitIsAlly = !isEnemyTarget(unitId);
                if (!unitIsAlly && !differentialCounterEnabled) continue;
                if (isCounterSkipped(unitId, 'differential')) continue;
                if (safeNumber(unit.speed) < COMBAT_CONFIG.DIFFERENTIAL_COUNTER_SPEED) continue;

                // 档位约束：2n <= 本回合剩余预支配额（base + current − 已预支合计）
                // 且 2n <= 可承受额度；档位为 2 的倍数（2、4、…）。
                const step = COMBAT_CONFIG.DIFFERENTIAL_COUNTER_COST;
                const evenFloor = (value: number) => value - (value % step);
                const maxDebt = Math.min(
                    evenFloor(prepayQuotaLeftOf(unitId, unit)),
                    evenFloor(affordableOf(unit))
                );
                const options: number[] = [];
                for (let debt = step; debt <= maxDebt; debt += step) options.push(debt);
                if (options.length === 0) continue;

                const defaultDebt = options[options.length - 1];
                const decision = await requestCounterAdvance({
                    type: 'differential',
                    entityId: unitId,
                    apToAdvance: defaultDebt,
                    windowAp: Math.floor(defaultDebt / step),
                    existQuota: prepayQuotaLeftOf(unitId, unit),
                });
                if (!mountedRef.current || !combatActiveRef.current) return;
                if (decision === false) continue;
                const debt =
                    typeof decision === 'number' && options.includes(decision)
                        ? decision
                        : defaultDebt;
                const windowAp = Math.floor(debt / step);
                grantCounterAdvance(unitId, 'differential', debt, 0, attackerId, windowAp);
                await runInsertAction(unitId, windowAp);
                if (!combatActiveRef.current) return;
            }
        },
        [
            isEnemyTarget,
            accumulateCounterEnabled,
            differentialCounterEnabled,
            getAlly,
            getEnemy,
            isCounterSkipped,
            prepayQuotaLeftOf,
            affordableOf,
            requestCounterAdvance,
            grantCounterAdvance,
            runInsertAction,
        ]
    );

    /** 供 runInsertAction（定义在前）回调本函数：立即行动中的攻击同样即时询问对面的预支。 */
    useEffect(() => {
        counterAskRef.current = maybeCounterAdvancesAfterAttack;
        return () => {
            counterAskRef.current = null;
        };
    }, [maybeCounterAdvancesAfterAttack]);

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
            const tid = getAllyTargetId(ally, idx);
            clearPendingDefense(tid);
            if (ally.hp <= 0) return;
            mutateAlly(tid, (dyn) => ({ ...dyn, shield: 0 }));
            restoreAP(tid, false);
        });

        if (checkAllyDeath()) return;

        setPlayerPhaseSafe(true);
        setBusy(false);
    }, [
        getAliveEnemies,
        setPlayerState,
        clearPendingDefense,
        mutateAlly,
        tickEffects,
        restoreAP,
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
            if (checkEnemyDeaths()) {
                if (!combatActiveRef.current) return;
                continue;
            }

            restoreAP(enemyId, true);
            if (checkEnemyDeaths()) {
                if (!combatActiveRef.current) return;
                continue;
            }

            let guard = 0;
            while (combatActiveRef.current && guard < COMBAT_CONFIG.ENEMY_ACTION_GUARD) {
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
                            desc: `${fix1(actor.attack)}`,
                            value: fix1(actor.attack),
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
                        // 即时应答：蓄反 / 差反预支（接受则开启立即行动窗口）。
                        await maybeCounterAdvancesAfterAttack(enemyId, attackTargetId);
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
                    // 敌人防御序列不预生成：按模板点数百分化后的 [常驻免伤, 最大免伤] 区间即时掷骰。
                    const range = getEnemyReductionRange(actor);
                    const defenseResult = rollEntityDefenseResult(range.floor, range.ceiling);
                    addPendingDefense(enemyId, defenseResult);
                    addCombatLog(`[偏转矩阵] ${actor.name} 布设防御判定。`);
                    playSfx('combat_block');
                } else if (intent.type === 'buff') {
                    // 契约：战术效果不再修改六维，增益/减益只作用于战斗动态结果修正键。
                    const key = pickOne([...RESULT_MODIFIER_TYPES]);
                    if (key) {
                        addEffect(
                            enemyId,
                            key,
                            3,
                            COMBAT_CONFIG.DEFAULT_BUFF_DURATION,
                            enemyId,
                            actor.name
                        );
                        addCombatLog(`[异常增殖] ${actor.name} 的 ${key} 被强化。`);
                    }
                } else if (intent.type === 'debuff') {
                    const targetId = chooseAliveTarget(intent.targetId);
                    const key = pickOne([...RESULT_MODIFIER_TYPES]);
                    if (key) {
                        addEffect(
                            targetId,
                            key,
                            -2,
                            COMBAT_CONFIG.DEFAULT_BUFF_DURATION,
                            enemyId,
                            actor.name
                        );
                        addCombatLog(
                            `[污染注入] ${getAlly(targetId)?.name ?? targetId} 的 ${key} 被削弱。`
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

            // 该敌人回合结束：仅做效果 tick，蓄反槽留待「敌方阶段结束」统一清算。
            const after = getEnemy(enemyId);
            if (after && !after.isDead && after.hp > 0) {
                tickEffects(enemyId);
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
            // 敌方阶段结束：清算全场蓄反槽（本阶段由敌方攻击积累的我方槽在此结算），
            // 我方额外行动点随即在 beginPlayerPhase 的回合开始恢复中到账。
            settleAllCounterSlots();
            await beginPlayerPhase();
        }
    }, [
        clearPendingDefense,
        mutateEnemyById,
        tickEffects,
        restoreAP,
        settleAllCounterSlots,
        maybeCounterAdvancesAfterAttack,
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
            setPlayerPhaseSafe(false);
            if (combatActiveRef.current) endCombatVictory();
            return;
        }

        setBusy(true);
        setPlayerPhaseSafe(false);
        playSfx('ui_click');

        // 阶段结束：清空全场蓄反槽（本阶段由我方攻击积累的敌方槽在此结算），
        // 未消耗蓄反值 × 0.1 向上取整转为额外行动点，敌方于其下个回合开始到账。
        settleAllCounterSlots();
        alliesRef.current.forEach((ally, idx) => {
            const tid = getAllyTargetId(ally, idx);
            if (ally.hp <= 0) return;
            tickEffects(tid);
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
        settleAllCounterSlots,
        tickEffects,
        checkAllyDeath,
        executeEnemyPhase,
    ]);

    //--------------------------------------------------------------------------
    // 战术读取与执行
    //--------------------------------------------------------------------------
    /**
     * 该单位当前可用战术 = 角色习得的常规战术 + 已装备武器持有的专属战术。
     *
     * 武器专属战术不写入角色的持久化战术表：随装备持有，卸下即失去。
     */
    const getTacticsFor = useCallback((ownerId: string): AnyTactic[] => {
        const dynamic =
            ownerId === 'player'
                ? playerStateRef.current.dynamic
                : companionsRef.current.find((c) => c.static.id === ownerId)?.dynamic;
        if (!dynamic) return [];
        return [...dynamic.tactics, ...getEquippedWeaponOwnTactics(dynamic.equipment)];
    }, []);

    /**
     * 我方单位四向位移一步。
     * dir：forward 纵深推进，backward 纵深撤离，lane_left / lane_right 换轨。
     * 每步消耗 MOVE_AP_COST + 环境移动修正的行动点；不可通行掩体格与地图边界外均不可进入。
     * 「立即行动」窗口内同样消耗窗口行动点，可在窗口行动点耗尽前反复移动。
     */
    const moveAlly = useCallback(
        async (allyId: string, dir: MoveDirection) => {
            // 「立即行动」窗口：预支单位在他人回合内也可行动，消耗窗口行动点。
            const insertWindow = insertActionRef.current;
            const isInsertMover = insertWindow?.unitId === allyId;
            if (
                (!isPlayerPhase && !isInsertMover) ||
                actionLockRef.current ||
                !combatActiveRef.current
            ) {
                return;
            }
            const ally = getAlly(allyId);
            if (!ally || ally.hp <= 0) return;

            const moveCost = getMoveCost();
            const apPool = isInsertMover
                ? safeNumber(insertWindow?.apLeft)
                : safeNumber(ally.actionPoint.current);
            if (apPool < moveCost) {
                playSfx('error');
                return;
            }

            const current = positionsRef.current[allyId];
            if (!current) return;
            const next = getSteppedCell(current, dir);
            if (!isWalkableCell(next)) {
                // 地图边界或不可通行掩体。
                playSfx('error');
                addCombatLog(
                    `[机动受阻] ${ally.name} 无法进入目标格（掩体阻断或已至战场边缘）。`
                );
                return;
            }

            if (!isInsertMover) {
                mutateAlly(allyId, (dyn) => spendActionPoint(dyn, moveCost));
            }
            // 记录本回合已移动：手枪「未移动则首次攻击免 AP」依据此标记失效。
            movedThisTurnRef.current[allyId] = true;
            syncLocations({ ...positionsRef.current, [allyId]: next });
            const actionLabel: Record<MoveDirection, string> = {
                forward: '向前推进',
                backward: '向后撤离',
                lane_left: '向左换轨',
                lane_right: '向右换轨',
            };
            addCombatLog(
                `[机动] ${ally.name} ${actionLabel[dir]}至 纵深 ${next.x} · ${next.y + 1} 轨。`
            );
            playSfx('ui_click');
            await delay(80);
            // 立即行动窗口内：本次移动消耗窗口行动点（移动可反复进行）。
            if (isInsertMover) spendInsertActionAp(moveCost);
        },
        [
            isPlayerPhase,
            getAlly,
            mutateAlly,
            syncLocations,
            addCombatLog,
            spendInsertActionAp,
            getMoveCost,
            isWalkableCell,
        ]
    );

    /**
     * 战术可用性判定。
     *
     * 序列长度为 0 时实体无法行动；但若 stamina 足以支撑「耗尽 → 重生成」，则仍允许行动。
     * instant 武器不消费结果序列，豁免序列门槛。
     */
    const canUseTactic = useCallback(
        (tactic: AnyTactic, casterId: string) => {
            // 「立即行动」窗口：预支单位在他人回合内也可行动，消耗窗口行动点。
            const insertWindow = insertActionRef.current;
            const isInsertCaster = insertWindow?.unitId === casterId;
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

            // 战术声明的武器类型必须真的挂在主手或副手槽位上。
            const requiredWeapon = getTacticWeaponType(tactic);
            const weapon = resolveAttackWeapon(caster.equipment, requiredWeapon);
            if (requiredWeapon && !weapon) return false;

            // 契约：武器每次攻击消耗 1 点耐久，耐久耗尽后无法再用该武器攻击。
            if (tactic.type === 'A' && weapon && !isWeaponUsable(weapon)) return false;

            // 序列耗尽校验：仅当无法通过扣除 stamina 重生成时阻止行动。
            // instant 武器不消费结果序列，豁免此门槛（否则序列耗尽的 instant 玩家被软锁）。
            if (
                sequenceMinLength(caster.resultSequence) === 0 &&
                weapon?.weaponDamageType !== 'instant'
            ) {
                if (!canRegenerateSequence(caster.stamina, caster.maxStamina)) return false;
            }

            // 窗口内：行动按自身行动点成本从窗口池扣除（不再限制攻击次数）。
            if (isInsertCaster) {
                if (!insertWindow || insertWindow.apLeft < safeNumber(tactic.apCost)) return false;
            } else if (caster.actionPoint.current < safeNumber(tactic.apCost)) {
                return false;
            }

            // 攻击战术必须在射程内存有可攻击目标：够不着的距离用不了（range 0 = 无限距离）。
            if (tactic.type === 'A') {
                const range = weapon ? Math.max(0, safeNumber(weapon.range, 1)) : 1;
                // 近程冲刺：实际攻击距离 = 当前 AP + 武器自身 range（AP 池为常规行动点或立即行动窗口）。
                const apPool = isInsertCaster
                    ? safeNumber(insertWindow?.apLeft)
                    : safeNumber(caster.actionPoint.current);
                const reach = isDashWeapon(weapon?.weaponType)
                    ? range + Math.floor(apPool)
                    : range;
                const pos = positionsRef.current[casterId];
                const hasTarget =
                    Boolean(pos) &&
                    enemiesRef.current.some((enemy) => {
                        if (enemy.isDead || enemy.hp <= 0) return false;
                        const enemyPos = positionsRef.current[enemy.instanceId];
                        return (
                            Boolean(enemyPos) &&
                            isWithinRange(reach, getBattleDistance(pos, enemyPos))
                        );
                    });
                if (!hasTarget) return false;
            }
            return true;
        },
        [isPlayerPhase, getAlly, getAliveEnemyIds]
    );

    const resolveTargetIds = useCallback(
        (target: Target, casterId: string, manualTargetId?: string): string[] => {
            const allyIds = getAliveAllyTargetIds();
            const enemyIds = getAliveEnemyIds();
            switch (target) {
                case 'self':
                    return [casterId];
                case 'single_enemy':
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

    //--------------------------------------------------------------------------
    // 武器类型特性结算
    //--------------------------------------------------------------------------
    /**
     * 结算一次我方攻击的完整链路（含武器类型特性）。
     * 契约中各武器类型的攻击特性在此统一落地：
     * - 挥动类（wave / both_wave）：对目标所在格内的其他目标造成溅射；
     * - 刺击类（prick / both_prick）：暴击无视目标全部 defense；
     * - 狙击步枪：暴击无视 0.3 defense，且距离越近越易降级（见 applyAttackModifiers）；
     * - 冲锋枪：判定后若仍有剩余 AP，可消耗 1 点追加判定并取最优者；
     * - 霰弹枪：对射程内所有目标同时造成伤害，且距离越近伤害越高；
     * - 弩：攻击后必须消耗 1 AP 装填，否则无法再次攻击。
     *
     * 副作用（行动点扣减、装填标记）由调用方按需处理，本函数只负责「打出这一击」。
     *
     * @returns 本次攻击是否命中，供战术附带效果判定
     */
    const resolveAllyAttack = useCallback(
        (
            casterId: string,
            targetId: string,
            weapon: WeaponInstance | null,
            /** 是否从窗口池而非实体行动点扣减追加攻击成本。 */
            isInsertCaster: boolean
        ): boolean => {
            const caster = getAlly(casterId);
            if (!caster || caster.hp <= 0) return false;
            // 契约：武器每次攻击消耗 1 点耐久，耐久耗尽无法再用该武器攻击。
            if (weapon && !isWeaponUsable(weapon)) {
                addCombatLog('[损坏] 武器耐久已耗尽，无法攻击。');
                playSfx('error');
                return false;
            }

            const trait = getWeaponTrait(weapon?.weaponType);
            const scale = getAllyDamageScale(caster, weapon);
            const slot = resolveAttackSlot(caster.equipment, weapon);
            /** 结果修正（speed / damage / aim / crit_* / defense / evasion）与攻击序列修正。 */
            const mods = getCombatResultModifiers(caster.status);
            const aSteps = getSequenceShift(caster.status, 'a') + mods.aim;

            /** 距离与射程（冲刺 / 锥形扩散 / 距离暴击共用）。 */
            let distance = getDistance(casterId, targetId);
            const range = weapon ? Math.max(0, safeNumber(weapon.range, 1)) : 1;

            /**
             * 近程冲刺（契约各近程分支）：
             * 攻击时直接向目标冲刺，最多消耗当前 AP 格，每格追加特性伤害；
             * 实际攻击距离 = 当前 AP + 武器自身 range。
             */
            let dashCells = 0;
            if (trait.dashDamagePerCell > 0 && distance > range) {
                const apLeftOf = () =>
                    isInsertCaster
                        ? Math.max(0, safeNumber(insertActionRef.current?.apLeft))
                        : Math.max(0, safeNumber(getAlly(casterId)?.actionPoint.current));
                let remaining = Math.min(
                    Math.floor(apLeftOf()),
                    Math.max(0, distance - range)
                );
                while (remaining > 0 && combatActiveRef.current && apLeftOf() >= 1) {
                    const from = positionsRef.current[casterId];
                    const to = positionsRef.current[targetId];
                    if (!from || !to) break;
                    const next = findNextStepToward(
                        battleMapRef.current,
                        coversRef.current,
                        from,
                        to
                    );
                    if (!next) break;
                    if (isInsertCaster) spendInsertActionAp(1);
                    else mutateAlly(casterId, (dyn) => spendActionPoint(dyn, 1));
                    syncLocations({ ...positionsRef.current, [casterId]: next });
                    dashCells += 1;
                    remaining -= 1;
                    distance = getDistance(casterId, targetId);
                    if (distance <= range) break;
                }
                if (dashCells > 0) {
                    addCombatLog(
                        `[冲刺] ${caster.name} 突进 ${dashCells} 格接敌（伤害 +${dashCells * trait.dashDamagePerCell}）。`
                    );
                }
            }
            const dashBonus = dashCells * trait.dashDamagePerCell;

            // —— 冲锋枪：追加判定取最优 ——
            // 契约：判定后若仍有剩余 AP，可消耗 1 点再判一次，可重复至 AP 耗尽。
            // REPEAT_FIRE_GUARD 只是防御性上限，真实终止条件由循环内的 AP 校验决定。
            const maxExtra = trait.repeatForBest ? COMBAT_CONFIG.REPEAT_FIRE_GUARD : 0;
            const judgementCount = 1 + maxExtra;

            /**
             * 冲锋枪追加判定的取优累加器。
             *
             * 伤害乘区必须与「胜出那一击」绑定：若只保留最后一次判定的乘区，
             * 当最优结果来自较早的判定时，伤害会按错误的环境/武器乘区结算。
             */
            let best:
                | {
                    attackResult: AttackResult
                    blockingCover?: Cover
                    critDoubled: boolean
                    damageMultiplier: number
                }
                | null = null;

            for (let i = 0; i < judgementCount; i += 1) {
                const current = getAlly(casterId);
                if (!current) break;
                const drawn = drawAttackResult(current, casterId, slot);
                commitAlly(casterId, drawn.updatedEntity as CombatAlly);

                let applied = applyAttackModifiers(
                    casterId,
                    targetId,
                    scale,
                    drawn.attackResult,
                    weapon?.weaponType
                );

                // 序列修正（a_sequence）与瞄准（aim）：整体升降档；原结果已是 crit 时改为伤害翻倍。
                if (aSteps !== 0 && applied.attackResult[0] !== 'miss') {
                    if (applied.attackResult[0] === 'crit' && aSteps > 0) {
                        applied = { ...applied, critDoubled: true };
                    } else {
                        applied = {
                            ...applied,
                            attackResult: shiftAttackResult(applied.attackResult, scale, aSteps),
                        };
                    }
                }

                // 暴击率修正（crit_chance，按百分点）：非暴击判定按概率整体升 1 档。
                if (applied.attackResult[0] !== 'crit' && mods.crit_chance > 0) {
                    if (Math.random() < clamp(mods.crit_chance / 100, 0, 1)) {
                        const idx = ATTACK_RESULT_LADDER.indexOf(applied.attackResult[0]);
                        const kind =
                            ATTACK_RESULT_LADDER[
                                Math.min(idx + 1, ATTACK_RESULT_LADDER.length - 1)
                            ];
                        applied = { ...applied, attackResult: [kind, attackValueAt(kind, scale)] };
                    }
                }

                // 距离暴击（霰弹枪 / 短管霰弹枪）：超过上限距离不可暴击，距离越远保留暴击的概率越低。
                const critRange = getCritRangeProfile(weapon?.weaponType);
                if (applied.attackResult[0] === 'crit' && critRange.cutoff > 0) {
                    const keepChance =
                        distance > critRange.cutoff
                            ? 0
                            : clamp(
                                1 -
                                (distance - critRange.optimal) /
                                (critRange.cutoff - critRange.optimal + 1),
                                0,
                                1
                            );
                    if (Math.random() > keepChance) {
                        applied = {
                            ...applied,
                            attackResult: ['hit', attackValueAt('hit', scale)],
                        };
                    }
                }

                if (
                    !best ||
                    ATTACK_RESULT_LADDER.indexOf(applied.attackResult[0]) >
                    ATTACK_RESULT_LADDER.indexOf(best.attackResult[0])
                ) {
                    best = {
                        attackResult: applied.attackResult,
                        blockingCover: applied.blockingCover,
                        critDoubled: applied.critDoubled,
                        damageMultiplier: applied.damageMultiplier,
                    };
                }
                // 追加判定：消耗 1 点行动点（窗口内取自窗口池）；AP 不足即终止追加。
                if (i < judgementCount - 1) {
                    const apLeft = isInsertCaster
                        ? Math.max(0, safeNumber(insertActionRef.current?.apLeft))
                        : Math.max(0, safeNumber(getAlly(casterId)?.actionPoint.current));
                    if (apLeft < 1) break;
                    if (isInsertCaster) spendInsertActionAp(1);
                    else mutateAlly(casterId, (dyn) => spendActionPoint(dyn, 1));
                }
            }

            if (!best) return false;
            const { attackResult, blockingCover, critDoubled, damageMultiplier } = best;
            // 本次攻击判定已结束：消耗按判定计数的效果（a_sequence / aim）。
            mutateAlly(casterId, (dyn) => ({
                ...dyn,
                status: consumeJudgementStatuses(dyn.status, 'a'),
            }));
            if (attackResult[0] === 'miss') {
                addCombatLog('[未命中] 战术计算落空。');
                playSfx('combat_miss');
                return false;
            }

            /** 伤害定项：判定值 + 冲刺追加 + 攻击力修正；暴击时另加暴击伤害修正。 */
            const critMultiplier = critDoubled ? 2 : 1;
            const bonusCrit = attackResult[0] === 'crit' ? mods.crit_bonus : 0;
            const raw = absorbDamageByCover(
                blockingCover,
                (Math.max(0, attackResult[1]) + dashBonus + mods.damage + bonusCrit) *
                    damageMultiplier *
                    critMultiplier
            );

            const label =
                attackResult[0] === 'crit' ? '暴击' : attackResult[0] === 'graze' ? '擦伤' : '命中';
            /** 暴击穿透：仅暴击档生效。 */
            const pierce = attackResult[0] === 'crit' ? getCritDefensePierce(weapon?.weaponType) : 0;

            const actual = dealDamageToEnemy(targetId, raw, pierce);
            if (actual > 0) {
                addCombatLog(`[${label}] 有效倾泻 ${actual} 点动能。`);
            } else {
                addCombatLog('[偏转] 攻击未能穿透目标防护。');
            }

            // —— 锥形范围伤害（霰弹枪 / 短管霰弹枪）：判定值 ÷ 其他目标数，向上取整 ——
            if (trait.coneSplash && combatActiveRef.current) {
                const from = positionsRef.current[casterId];
                const to = positionsRef.current[targetId];
                const others = getAliveEnemies().filter((enemy) => {
                    if (enemy.instanceId === targetId) return false;
                    const pos = positionsRef.current[enemy.instanceId];
                    if (!pos || !from || !to) return false;
                    if (getBattleDistance(from, pos) > range) return false;
                    // 锥形：以「施法者 → 主目标」为轴，横向偏移不超过纵深推进量，且不落在轴后方。
                    const dx = pos.x - from.x;
                    const dy = Math.abs(pos.y - from.y);
                    const dirX = to.x - from.x;
                    if (dx * dirX < 0) return false;
                    return dy <= Math.max(1, Math.abs(dx));
                });
                const splash = getSplashDamage(attackResult[1] + mods.damage, others.length);
                if (splash > 0) {
                    others.forEach((enemy) => {
                        if (!combatActiveRef.current) return;
                        const hit = dealDamageToEnemy(enemy.instanceId, splash * damageMultiplier);
                        addCombatLog(
                            `[锥形扩散] ${enemy.name} 承受 ${hit} 点扩散伤害（判定值 ${formatCombatNumber(attackResult[1])} ÷ ${others.length}）。`
                        );
                    });
                }
            }

            // —— 武器耐久：契约规定每次攻击消耗 1 点 ——
            if (weapon && (slot === 'main' || slot === 'side')) {
                mutateAlly(casterId, (dyn) => {
                    const equipment = normalizeEquipState((dyn as CombatAlly).equipment);
                    return {
                        ...dyn,
                        equipment: {
                            ...equipment,
                            weapons: { ...equipment.weapons, [slot]: spendWeaponUse(weapon) },
                        },
                    } as CombatDynamicState;
                });
            }

            return true;
        },
        [
            getAlly,
            getAliveEnemies,
            getDistance,
            applyAttackModifiers,
            drawAttackResult,
            commitAlly,
            mutateAlly,
            spendInsertActionAp,
            absorbDamageByCover,
            dealDamageToEnemy,
            addCombatLog,
        ]
    );

    const executeTactic = useCallback(
        async (tacticId: string, casterId = 'player', manualTargetId?: string) => {
            // 「立即行动」窗口：预支单位在他人回合内也可行动，消耗窗口行动点。
            const insertWindow = insertActionRef.current;
            const isInsertCaster = insertWindow?.unitId === casterId;
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

            // 战术声明的武器类型必须真的挂在主手或副手槽位上。
            const requiredWeapon = getTacticWeaponType(tactic);
            const weapon = resolveAttackWeapon(caster.equipment, requiredWeapon);
            if (requiredWeapon && !weapon) {
                playSfx('error');
                return;
            }

            // 契约：武器每次攻击消耗 1 点耐久，耐久耗尽后无法再用该武器攻击
            //（与 canUseTactic 同口径，防止绕过 UI 直接调用）。
            if (tactic.type === 'A' && weapon && !isWeaponUsable(weapon)) {
                playSfx('error');
                addCombatLog('[损坏] 武器耐久已耗尽，无法攻击。');
                return;
            }

            // 序列耗尽校验（instant 武器豁免，见 canUseTactic）
            if (
                sequenceMinLength(caster.resultSequence) === 0 &&
                weapon?.weaponDamageType !== 'instant'
            ) {
                if (!canRegenerateSequence(caster.stamina, caster.maxStamina)) {
                    playSfx('error');
                    return;
                }
            }

            if (isInsertCaster) {
                // 窗口内：行动点取自窗口池（按行动自身成本扣除，不限制攻击次数）。
                if (!insertWindow || insertWindow.apLeft < safeNumber(tactic.apCost)) {
                    playSfx('error');
                    return;
                }
            } else if (caster.actionPoint.current < safeNumber(tactic.apCost)) {
                playSfx('error');
                return;
            }

            // 攻击战术：先锁定射程内的目标；目标超距则拒绝执行（range 0 = 无限距离）。
            let attackTargetId: string | undefined;
            if (tactic.type === 'A') {
                const range = weapon ? Math.max(0, safeNumber(weapon.range, 1)) : 1;
                // 近程冲刺：射程按当前 AP 扩展（冲刺本身在攻击结算内逐格消耗 AP）。
                const apPool = isInsertCaster
                    ? safeNumber(insertWindow?.apLeft)
                    : safeNumber(caster.actionPoint.current);
                const reach = isDashWeapon(weapon?.weaponType)
                    ? range + Math.floor(apPool)
                    : range;
                const enemyIds = getAliveEnemyIds();
                const requested =
                    manualTargetId && enemyIds.includes(manualTargetId) ? manualTargetId : undefined;
                attackTargetId =
                    requested ??
                    enemyIds.find((id) => isWithinRange(reach, getDistance(casterId, id)));
                if (
                    !attackTargetId ||
                    !isWithinRange(reach, getDistance(casterId, attackTargetId))
                ) {
                    playSfx('error');
                    addCombatLog('[超距] 目标不在射程内，无法攻击。');
                    return;
                }
            }

            setBusy(true);
            try {
                /**
                 * 手枪特性：首次攻击前若本回合尚未移动，则本次攻击不消耗 AP。
                 * 仅对「攻击战术 + 手枪 + 未移动 + 本回合未用过」成立，每回合至多一次。
                 *
                 * 置于此处而非函数入口：武器 / 序列 / AP / 射程等前置校验都已通过，
                 * 不会出现「因超距被拒的点击白白吃掉本回合免费射击」。
                 */
                const casterTrait = getWeaponTrait(weapon?.weaponType);
                const isFreePistolShot =
                    tactic.type === 'A' &&
                    casterTrait.freeFirstAttackIfStationary &&
                    !movedThisTurnRef.current[casterId] &&
                    !freePistolShotUsedRef.current[casterId];

                if (!isInsertCaster && !isFreePistolShot) {
                    mutateAlly(casterId, (dyn) => spendActionPoint(dyn, tactic.apCost));
                }
                if (isFreePistolShot) {
                    freePistolShotUsedRef.current[casterId] = true;
                    addCombatLog('[未移动] 手枪首次射击不消耗行动点。');
                }
                addCombatLog(`>> [${caster.name}] 执行战术：${tactic.name}`);
                playSfx('ui_click');

                /** 战术附带效果结算：契约的 tacticEffect 恒为四元组，持续回合直接取第四位。 */
                const applyTacticEffects = (source: AnyTactic) => {
                    for (const [target, effectType, value, duration] of source.tacticEffect ?? []) {
                        const ids = resolveTargetIds(target, casterId, manualTargetId);
                        for (const id of ids) {
                            addEffect(id, effectType, value, duration, casterId, caster.name);
                            if (!combatActiveRef.current) return;
                        }
                    }
                };

                if (tactic.type === 'A') {
                    const targetEnemyId = attackTargetId;
                    const updatedCaster = getAlly(casterId);
                    if (!updatedCaster || !targetEnemyId) return;

                    const attackWeapon = resolveAttackWeapon(
                        updatedCaster.equipment,
                        requiredWeapon
                    );
                    const isInstant = attackWeapon?.weaponDamageType === 'instant';

                    if (isInstant) {
                        /**
                         * instant 伤害不参与任何正常结算。
                         * 不消费结果序列。
                         * 直接造成真实伤害，无视护盾、免伤、防御判定。不触发蓄反。
                         */
                        const instantDmg = calculateInstantDamage(
                            attackWeapon,
                            updatedCaster.will,
                            safeNumber(updatedCaster.combatBonus, 1)
                        );
                        const actual = dealInstantDamageToEnemy(targetEnemyId, instantDmg);
                        if (actual > 0) {
                            addCombatLog(`[瞬发] 有效倾泻 ${actual} 点真实伤害。`);
                        } else {
                            addCombatLog('[瞬发] 未能造成有效伤害。');
                        }
                    } else {
                        // 蓄反：本次攻击无论是否命中 / 被闪避，都在攻击方对面的所有更快角色处累积。
                        accumulateCountersAcrossOpponents(casterId);

                        // 完整攻击链路（含挥动溅射 / 刺击穿透 / 狙击降级 / 冲锋枪取优 / 霰弹扩散）。
                        // 弩的装填门槛已在进入本分支前的前置校验中拦截，此处不再重复判定。
                        const didHit = resolveAllyAttack(
                            casterId,
                            targetEnemyId,
                            attackWeapon,
                            isInsertCaster
                        );

                        // 命中后才结算战术附带效果。
                        if (didHit && combatActiveRef.current) {
                            applyTacticEffects(tactic);
                            if (!combatActiveRef.current) return;
                        }

                        // 即时应答：蓄反 / 差反预支（接受则开启立即行动窗口）。
                        if (combatActiveRef.current) {
                            await maybeCounterAdvancesAfterAttack(casterId, targetEnemyId);
                            if (!combatActiveRef.current) return;
                        }
                    }
                } else if (tactic.type === 'D') {
                    // 防御战术：消费常驻防御序列，把结果压入 pendingDefense 待受击时消费。
                    const updatedCaster = getAlly(casterId);
                    if (updatedCaster) {
                        const { defenseResult, updatedEntity } = drawDefenseResult(
                            updatedCaster,
                            casterId
                        );
                        commitAlly(casterId, updatedEntity as CombatAlly);
                        addPendingDefense(casterId, defenseResult);
                    }
                    applyTacticEffects(tactic);
                } else {
                    // 辅助战术（'U'）：不触发攻击 / 防御序列判定，只结算附带效果
                    //（「瞄准」等武器玩法开放为 U 类战术，档位提升由 effect 的 aim 键承担）。
                    applyTacticEffects(tactic);
                }

                await delay();
                // 立即行动窗口内：本次战术按其自身行动点成本消耗窗口行动点。
                if (isInsertCaster) {
                    spendInsertActionAp(safeNumber(tactic.apCost));
                }
            } finally {
                // 结算结束：窗口仍开 / 我方阶段 → 交还操作权；敌方阶段且窗口已关 → 恢复清空锁定。
                if (mountedRef.current) restoreFlowBusy();
            }
        },
        [
            isPlayerPhase,
            getAliveEnemyIds,
            findAllyIndex,
            getTacticsFor,
            setBusy,
            restoreFlowBusy,
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
            maybeCounterAdvancesAfterAttack,
            accumulateCountersAcrossOpponents,
            spendInsertActionAp,
            applyAttackModifiers,
            absorbDamageByCover,
            resolveAllyAttack,
        ]
    );

    //--------------------------------------------------------------------------
    // 可见结果序列（仅 UI 层，按意志预测深度裁剪）
    //--------------------------------------------------------------------------
    /**
     * 该单位的序列预测深度 n。
     * 契约口径：will 为 50 时 n 为 1，此后每 5 点 will 额外 +1；will 小于 50 时 n 为 0。
     * 敌人不预生成结果序列，恒为 0。
     */
    const getPredictionDepthFor = useCallback(
        (targetId: string): number => {
            if (isEnemyTarget(targetId)) return 0;
            const ally = getAlly(targetId);
            return ally ? getPredictionDepth(ally.will) : 0;
        },
        [isEnemyTarget, getAlly]
    );

    const getVisibleResultSequence = useCallback(
        (targetId: string): AllyResultSequence => {
            const empty: AllyResultSequence = { defense: [] };
            if (isEnemyTarget(targetId)) return empty;
            const ally = getAlly(targetId);
            if (!ally) return empty;
            const len = getVisibleResultSequenceLength(ally.will, ally.stamina);
            return rebuildSequence(
                ally.resultSequence,
                (list) => list.slice(0, len),
                (list) => list.slice(0, len)
            );
        },
        [isEnemyTarget, getAlly]
    );

    /**
     * 战前预测：当前单位攻击指定目标时的命中概率、伤害读数与减益来源（XCOM 式战术信息）。
     *
     * 给的是概率分布而不是下一次掷骰结果：档位分布由「与本方序列生成同一套权重表」推导
     * （感知 + 疲劳），因此不依赖、也不泄漏引擎预生成的序列内容——意志再低也能看预测。
     * 命中偏移按概率卷积（环境 + 武器一次判定、掩体另一次），伤害乘区与掩体吸收为确定项。
     */
    const getAttackForecast = useCallback(
        (attackerId: string, targetId: string): AttackForecast | null => {
            const ally = getAlly(attackerId);
            const target = getEnemy(targetId);
            if (!ally || !target || target.isDead || target.hp <= 0) return null;

            const from = positionsRef.current[attackerId];
            const to = positionsRef.current[targetId];
            if (!from || !to) return null;

            const weapon = getPrimaryWeapon(ally.equipment);
            const weaponType = weapon?.weaponType;
            const { blockingCover, accuracyDelta, weaponModifier, damageMultiplier } =
                resolveBattleModifiers(
                    battleMapRef.current,
                    coversRef.current,
                    from,
                    to,
                    weaponType
                );

            /** 与序列生成同源的攻击尺度：命中基准 + 暴击上限。 */
            const attackScale = getAllyDamageScale(ally, weapon);
            const coverRate = blockingCover
                ? clamp(safeNumber(blockingCover.coverRate), 0, 1)
                : 0;
            /** 伤害定项乘区：武器类型 × 穿透掩体后的剩余比例。 */
            const damageScale = damageMultiplier * (1 - coverRate);
            /** 档位代表伤害：擦伤取命中值对半、命中取基准、暴击取暴击上限（与引擎换档口径一致）。 */
            const tierDamage = (kind: AttackResult[0]) =>
                attackValueAt(kind, attackScale) * damageScale;

            const sources: AttackForecastSource[] = [];
            const environmentDelta = safeNumber(
                battleMapRef.current.modifiers?.accuracyBonus,
                0
            );
            if (environmentDelta !== 0) {
                sources.push({
                    kind: 'environment',
                    label: '战场环境',
                    steps: environmentDelta > 0 ? 1 : -1,
                    chance: Math.min(1, Math.abs(environmentDelta)),
                    damageMultiplier: 1,
                });
            }
            const weaponDelta = safeNumber(weaponModifier?.accuracyDelta, 0);
            if (weaponType && (weaponDelta !== 0 || damageMultiplier !== 1)) {
                sources.push({
                    kind: 'weapon',
                    label: '武器类型修正',
                    steps: weaponDelta === 0 ? 0 : weaponDelta > 0 ? 1 : -1,
                    chance: Math.min(1, Math.abs(weaponDelta)),
                    damageMultiplier,
                });
            }
            if (blockingCover) {
                sources.push({
                    kind: 'cover',
                    label: blockingCover.name,
                    steps: -1,
                    chance: coverRate,
                    damageMultiplier: 1 - coverRate,
                });
            }

            // 与引擎一致：环境 + 武器合计一次判定（最多 ±1 档），掩体拦截再独立降 1 档。
            const modifierSteps = accuracyDelta === 0 ? 0 : accuracyDelta > 0 ? 1 : -1;
            const modifierRoll = {
                steps: modifierSteps,
                chance: Math.min(1, Math.abs(accuracyDelta)),
            };
            const coverRoll = blockingCover ? { steps: -1, chance: coverRate } : null;

            // 档位分布：基础权重 → 两处判定的档位偏移依次卷积（端点档位按引擎口径截断）。
            let distribution = getAttackOdds(
                ally.awareness,
                fatigueRef.current[attackerId] ?? 0
            );
            for (const roll of [modifierRoll, coverRoll]) {
                if (!roll || roll.chance <= 0 || roll.steps === 0) continue;
                const next = ATTACK_RESULT_LADDER.map(() => 0);
                distribution.forEach((chance, index) => {
                    if (chance <= 0) return;
                    next[clamp(index + roll.steps, 0, ATTACK_RESULT_LADDER.length - 1)] +=
                        chance * roll.chance;
                    next[index] += chance * (1 - roll.chance);
                });
                distribution = next;
            }
            const odds: AttackForecastOdds[] = ATTACK_RESULT_LADDER.map((ladder, index) => ({
                ladder,
                chance: distribution[index],
                damage: tierDamage(ladder),
            }));

            return {
                odds,
                sources,
                modifierRoll,
                distance: getBattleDistance(from, to),
                range: weapon ? Math.max(0, safeNumber(weapon.range, 1)) : 1,
                weaponType,
                instant: weapon?.weaponDamageType === 'instant',
            };
        },
        [getAlly, getEnemy]
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
            threatLevel = 1,
            context?: BattleStartContext
        ) => {
            cleanupAllEffects(true);
            clearAllPendingDefense();

            const threat = Math.max(1, safeNumber(threatLevel, 1));
            const templates = Object.values(ENEMY_TEMPLATES ?? {}) as EnemyTemplate[];
            const isSpecific = Boolean(specificEnemyData?.id);
            // 数量优先取调用方的显式指定，否则按威胁等级推导
            //（契约：威胁 n 遇敌 (n-1) ~ (n+1)，下限 1）：1 → 1~2、2 → 1~3、3 → 2~4 …… 不设上限。
            const explicitCount = Math.max(0, Math.floor(safeNumber(context?.enemyCount)));
            const enemyCount = isSpecific
                ? Math.max(1, explicitCount)
                : explicitCount > 0
                    ? explicitCount
                    : randomInt(Math.max(1, threat - 1), threat + 1);

            const enemyTemplates: EnemyTemplate[] = [];
            for (let i = 0; i < enemyCount; i += 1) {
                let tpl: EnemyTemplate | undefined;
                if (specificEnemyData?.id) {
                    const predefined = templates.find((t) => t.id === specificEnemyData.id);
                    tpl = predefined
                        ? (mergeDeep(predefined, specificEnemyData) as EnemyTemplate)
                        : (specificEnemyData as EnemyTemplate);
                } else {
                    // 契约 EnemyTemplate 的区域限制在 generationLimit.zone：
                    // 只挑允许出现在当前区域的模板；未声明区域限制的模板作为通用池兜底。
                    const zoneScoped = templates.filter((t) =>
                        t.generationLimit?.zone?.includes(currentZoneId ?? '')
                    );
                    let pool = currentZoneId && zoneScoped.length ? zoneScoped : templates;
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
                setPlayerPhaseSafe(false);
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
            counterPrepayUsedRef.current = {};
            enemyAttackedThisTurnRef.current = {};
            // 新战斗：清空手枪的移动 / 免费射击标记，避免上一场的残留。
            movedThisTurnRef.current = {};
            freePistolShotUsedRef.current = {};
            endInsertAction();

            alliesRef.current = allAllies;
            setAlliesSafe(allAllies);
            setEnemiesSafe(generated);

            // 战场地图：优先节点显式 map 字段，其次按 zoneId + nodeId 约定匹配，最后全局保底。
            const map = getBattleMap(currentZoneId, context?.nodeId, context?.mapOverride);
            const coverDefinitions = getCoverDefinitions(currentZoneId);
            // 掩体实例只实例化契约定义：落点仍留在 map.covers 的元组里，避免两处维护坐标。
            // 实例化时把常量定义的初始 hp 归一为「canBeDestoryed 承载最大耐久、hp 承载当前耐久」。
            const runtimeCovers: Cover[] = (map.covers ?? []).flatMap(([coverId]) => {
                const definition = coverDefinitions[coverId];
                return definition ? [createRuntimeCover(definition)] : [];
            });
            setBattleMapSafe(map);
            setCoversSafe(runtimeCovers);

            // 二维部署：我方锚点取纵深中线，敌方在纵深 75% 之后铺开；
            // 伏击（isAmbushed）按比例压缩双方间隔，使我方开局更被动。
            const [minX, maxX] = map.depthRange;
            const laneCount = Math.max(1, map.laneCount);
            const span = Math.max(0, maxX - minX);
            const ambush = clamp(safeNumber(context?.isAmbushed, 0), 0, 1);
            const deployShift = Math.round(span * COMBAT_CONFIG.AMBUSH_SHIFT_RATIO * ambush);
            const enemyBandStart = clamp(
                minX + Math.round(span * COMBAT_CONFIG.ENEMY_DEPLOY_RATIO) - deployShift,
                minX,
                maxX
            );
            // 我方锚点最多推进到敌方部署带的起点：伏击时开局即贴身，但仍不越过敌阵。
            const allyAnchorX = Math.min(
                clamp(minX + Math.round(span * COMBAT_CONFIG.ALLY_DEPLOY_RATIO) + deployShift, minX, maxX),
                enemyBandStart
            );

            /** 距离目标格最近的可行格（同轨优先，逐格向两侧扩展）。 */
            const findOpenCell = (cell: CombatPosition): CombatPosition | undefined => {
                for (let offset = 0; offset <= span + 1; offset += 1) {
                    const candidates: CombatPosition[] =
                        offset === 0
                            ? [cell]
                            : [
                                { x: cell.x - offset, y: cell.y },
                                { x: cell.x + offset, y: cell.y },
                            ];
                    const found = candidates.find((candidate) =>
                        isCellWalkable(map, runtimeCovers, candidate)
                    );
                    if (found) return found;
                }
                return undefined;
            };

            const initialPositions: Record<string, CombatPosition> = {};
            allAllies.forEach((ally, idx) => {
                const wanted: CombatPosition = {
                    x: allyAnchorX + Math.floor(idx / laneCount),
                    y: idx % laneCount,
                };
                initialPositions[getAllyTargetId(ally, idx)] = findOpenCell(wanted) ?? wanted;
            });

            // 敌方铺位：先在部署带内按格收集可行格并逐个抽取（尽量不重叠）；
            // 敌人数量超过带内容量时，改用整张地图继续铺位，允许同格叠放。
            const collectEnemyCells = (fromX: number): CombatPosition[] => {
                const cells: CombatPosition[] = [];
                for (let x = fromX; x <= maxX; x += 1) {
                    for (let y = 0; y < laneCount; y += 1) {
                        const cell = { x, y };
                        if (isCellWalkable(map, runtimeCovers, cell)) cells.push(cell);
                    }
                }
                return cells;
            };
            let enemyCells = collectEnemyCells(enemyBandStart);
            // 部署带被掩体完全封死时，退化为整图寻位。
            if (enemyCells.length === 0) enemyCells = collectEnemyCells(minX);
            generated.forEach((enemy) => {
                if (enemyCells.length === 0) {
                    // 敌人数量超过部署带容量：整带重铺一轮（同格可容纳多个实体）。
                    enemyCells = collectEnemyCells(enemyBandStart);
                }
                initialPositions[enemy.instanceId] =
                    enemyCells.length > 0
                        ? enemyCells.splice(randomInt(0, enemyCells.length - 1), 1)[0]
                        : findOpenCell({ x: enemyBandStart, y: 0 }) ?? {
                            x: enemyBandStart,
                            y: 0,
                        };
            });
            syncLocations(initialPositions);

            const intentQueues = generated.map((enemy) =>
                generateEnemyIntentQueue(enemy, allAllies)
            );
            enemyIntentQueuesRef.current = intentQueues;
            setEnemyIntentsSafe(intentQueues.map((queue) => queue[0] ?? null));

            combatActiveRef.current = true;
            const names = generated.map((e) => e.name).join('、');
            setCombatLog([
                `[雷达预警] 锁定 ${generated.length} 个敌对生命体`,
                `[战场] ${map.desc ?? '标准交战区'} · ${laneCount} 轨 / 纵深 ${minX} ~ ${maxX}${runtimeCovers.length > 0 ? ` · 掩体 ${runtimeCovers.length} 处` : ''
                }`,
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
            setPlayerPhaseSafe(true);
            setBusy(false);

            allAllies.forEach((ally, idx) => {
                const tid = getAllyTargetId(ally, idx);
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
            syncLocations,
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
        getPredictionDepthFor,
        getAttackForecast,
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
        battleMap,
        covers,
        getUnitRange,
        getDistance,
        getMoveCost,
        moveAlly,
        counterSkip,
        setCounterSkip: setCounterSkipFor,
        insertAction,
        endInsertAction,
    };
};
