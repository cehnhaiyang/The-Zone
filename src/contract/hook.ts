import type { KeyboardEvent  } from 'react';
import { Tactic, CounterType, WeaponOwnTactic, AttackResult, WeaponType, ItemInstance, PlayerState, AttributeType, VitalType, ConsumableEffectType, NeuralLinkState, Puzzle, BaseItemTemplate, StoryConfig, ChainNarrative } from "./meta";

/** 我方可用战术：角色习得的常规战术 + 已装备武器持有的专属战术。 */
export type AnyTactic = Tactic | WeaponOwnTactic

/**
 * 预支询问的决议。
 * - false：拒绝（保留 / 放弃）；
 * - true：接受，采用请求中的默认预支档位；
 * - number：接受，并指定预支档位（仅差反：2n 档位，须落在该单位可选档位表内）。
 */
export type CounterDecisionResult = boolean | number

/**
 * 蓄反 / 差反预支请求。
 *
 * 引擎在蓄反槽积满或差反条件满足时发起询问，由持有方决定是否预支行动点。
 */
export interface CounterAdvanceRequest {
    /**
     * 蓄反：单槽每积满 5 点即可发起一次询问。
     * 差反：受击且速度不小于 10 时可被询问。
     */
    type: CounterType
    /**
     * 申请预支的实体
     *
     * 玩家为 player；同伴为模板 id；敌人为 instanceId
     */
    entityId: string
    /**
     * 本次将要预支的行动点
     *
     * 蓄反 = n；差反 = 2n（由该单位选择，请求给出的是默认档位）
     */
    apToAdvance: number
    /**
     * 「立即行动」窗口可消耗的行动点总量
     *
     * 蓄反 = n；差反 = n（= 2n / 2）
     */
    windowAp: number
    /**
     * 本回合剩余预支配额 = actionPoint.base + actionPoint.current − 本回合已预支合计
     * （蓄反 n 与差反 2n 共享）。
     * 无论蓄反 / 差反各触发多少次，预支加值合计都不得超过 base + current；用尽即不再询问。
     */
    existQuota: number
}

/**
 * 「立即行动」窗口（蓄反 / 差反预支的直接产物）。
 *
 * 窗口内可进行任意行动（攻击 / 防御 / 移动 / 其他战术均可），
 * 每次行动按其自身行动点成本消耗窗口行动点，可执行「最多 apMax 次」1 点成本的行动；
 * 行动点耗尽即窗口结束，也可随时主动结束。
 */
export interface InsertActionWindow {
    /** 窗口归属单位（player / 同伴 id）。 */
    unitId: string
    /** 窗口内剩余行动点。 */
    apLeft: number
    /** 窗口行动点总量：蓄反 = n；差反 = n（= 2n / 2）。 */
    apMax: number
}

/**
 * 进入战斗时的战场上下文。
 *
 * 由调用方（节点遭遇 / 庇护所事件等）注入，引擎据此解析战场地图与部署形态。
 */
export interface BattleStartContext {
    /** 当前节点键名，用于按约定匹配该节点的专属战场地图。 */
    nodeId?: string
    /** 节点显式配置的 map 字段；优先于按节点键名的约定匹配。 */
    mapOverride?: string
    /** 伏击不利系数（0~1）：越大，我方锚点越靠前、敌方部署带压得越近。 */
    isAmbushed?: number
    /**
     * 显式指定敌人生成数量。
     *
     * 由调用方（如庇护所事件的 impact.spawnEnemy）决定时优先于威胁等级推导；
     * 缺省或为 0 时按威胁等级推导。
     */
    enemyCount?: number
}

/**
 * 战前预测中的单条命中 / 伤害修正来源。
 *
 * 来源必须可辨识：掩体拦截、全局环境修正、武器类型修正分别标注，便于玩家判断
 * 「这个减益是掩体给的，还是全场都在吃的」。
 */
export interface AttackForecastSource {
    /** 来源类型：掩体拦截 / 全局环境修正 / 武器类型修正。 */
    kind: 'cover' | 'environment' | 'weapon'
    /** 来源展示名（掩体名 / 「战场环境」/「武器类型修正」）。 */
    label: string
    /** 命中档位修正：负数降档、正数升档、0 只影响伤害。 */
    steps: number
    /** 该修正生效的概率（0 ~ 1）。 */
    chance: number
    /** 伤害乘区（1 = 不影响伤害；掩体为 1 - coverRate）。 */
    damageMultiplier: number
}

/** 战前预测的单个命中档位：出现概率与该档位的代表伤害（已含全部乘区）。 */
export interface AttackForecastOdds {
    ladder: AttackResult[0]
    /** 最终落入该档位的概率（0 ~ 1，已含三处修正的档位偏移）。 */
    chance: number
    /** 该档位的代表伤害：擦伤取命中值对半、命中取攻击基准、暴击取暴击上限。 */
    damage: number
}

/**
 * 战前预测（我方一次攻击的完整链路）。
 *
 * 给的是**概率**而非下一次掷骰结果：档位分布由感知 / 疲劳权重推导（与序列生成同源），
 * 是玩家凭属性本就能估出的信息，不会泄漏引擎预生成的序列内容。
 * 各来源对档位的偏移按概率卷积进最终分布；伤害乘区与掩体吸收是确定项。
 */
export interface AttackForecast {
    /** 命中档位分布：落空 / 擦伤 / 命中 / 暴击（索引与命中阶梯一致）。 */
    odds: AttackForecastOdds[]
    /** 命中与伤害减益的来源明细（逐条列出，用于标注出处）。 */
    sources: AttackForecastSource[]
    /**
     * 环境 + 武器合计的档位修正（一次判定）。
     *
     * 掩体拦截是另一次独立判定，其档位与概率由 `sources` 中的 cover 项给出，不重复携带。
     */
    modifierRoll: { steps: number; chance: number }
    /** 当前距离与武器射程（0 = 无限）。 */
    distance: number
    range?: number
    weaponType?: WeaponType
    /** 瞬时真实伤害武器：跳过一切常规结算，预测只作说明。 */
    instant: boolean
}

//=============================================================================
// 庇护所钩子契约类型（公开入/出参的子类型）
//=============================================================================

/** 设施升级的支付代价。 */
export interface FacilityUpgradePayment {
    /** 资源键：`food` / `water` 或独特资源 id */
    resourceId: string;
    /** 支付数量 */
    amount: number;
}

/** 休息配置：一次休息的完整结果与代价明细。 */
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

/** 可堆叠物品实例：消耗品或材料。 */
export type StackableItemInstance = Extract<ItemInstance, { type: 'consumable' | 'material' }>;

/** 计划校验失败。 */
export type PlanFailure = {
    ok: false;
    message: string;
    info?: boolean;
};

/** 物品转移计划。 */
export type TransferPlan =
    | PlanFailure
    | {
        ok: true;
        next: PlayerState;
        name: string;
        amount: number;
    };

/** 休息计划。 */
export type RestPlan =
    | PlanFailure
    | {
        ok: true;
        next: PlayerState;
        config: CustomRestConfig;
        daysPassed: number;
    };

//=============================================================================
// 交互钩子契约类型（useInteraction 公开入/出参所依赖的子类型）
//=============================================================================

/** 谜题运行状态。 */
export type PuzzleStatus = 'idle' | 'success' | 'error';

/** 谜题状态提示键。 */
export type PuzzleStatusMsg = 'AWAITING_INPUT' | 'ACCESS_GRANTED' | 'ACCESS_DENIED' | 'TIME_EXPIRED';

/** 装备槽位类型。 */
export type EquipmentSlotType = 'weapon' | 'armor' | 'accessory';

/** 遭遇裁定的触发渠道：进入节点（仅伏击节点）与搜查。 */
export type EncounterCondition = 'on_enter' | 'on_search';

/** 消耗品效果的结算结果：属性 / 生命体征 / 神经链接三类增量。 */
export interface ConsumableEffectApplication {
    attributeUpdates: Partial<Record<AttributeType, number>>;
    vitalUpdates: Partial<Record<VitalType, number>>;
    neuralLinkUpdates: Partial<Pick<NeuralLinkState, 'battery' | 'integrity'>>;
    hpDelta: number;
    sanityDelta: number;
    staminaDelta: number;
    vigorDelta: number;
    effectsApplied: Array<{
        type: ConsumableEffectType;
        value: number;
        duration?: number;
    }>;
}

/** 谜题运行时状态（谜题子系统的内部流转容器）。 */
export interface PuzzleRuntime {
    input: string;
    status: PuzzleStatus;
    statusMsg: PuzzleStatusMsg;
    attempts: number;
    isShaking: boolean;
    hintsUsed: number;
    timeLeft: number;
    showLore: boolean;
    selectedOptions: number[];
    patternInput: string[];
}

/** 谜题交互控制器（由 useInteraction 出参透出，视图层只消费）。 */
export interface PuzzleInteractionController {
    input: string;
    status: PuzzleStatus;
    statusMsg: PuzzleStatusMsg;
    attempts: number;
    maxAttempts: number;
    isShaking: boolean;
    hintsUsed: number;
    timeLeft: number;
    showLore: boolean;
    selectedOptions: number[];
    patternInput: string[];
    type: Puzzle['body']['type'] | null;
    currentHints: string[];
    handleInputChange: (val: string) => void;
    handleOptionSelect: (index: number) => void;
    handlePatternClick: (index: number) => void;
    handleSubmit: () => void;
    handleKeyDown: (e: KeyboardEvent) => void;
    handleUseHint: () => void;
}

//-------------------------------------------------------------------------
// 背包网格（生化危机式格子仓储）
//-------------------------------------------------------------------------

/**
 * 网格落位
 *
 * 直接取自元契约 {@link BaseItemInstance.gridPlacement} 的内联结构，
 * 不另行定义第二套模型。
 */
export type GridPlacement = NonNullable<ItemInstance['gridPlacement']>;

/** 落位表：instanceId → 落位 */
export type GridPlacementMap = Record<string, GridPlacement>;

/** 单个待渲染的网格单元 */
export interface InventoryGridTile {
    item: ItemInstance;
    /** 锚点列坐标 */
    x: number;
    /** 锚点行坐标 */
    y: number;
    /** 实际占位宽度（含旋转态） */
    width: number;
    /** 实际占位高度（含旋转态） */
    height: number;
    rotated: boolean;
}

/** 占位板：以扁平数组记录每一格被哪个实例占用 */
export interface GridBoard {
    cols: number;
    rows: number;
    cells: Array<string | null>;
}

/** 背包布局求解结果。 */
export interface GridLayoutResult {
    placements: GridPlacementMap;
    overflow: ItemInstance[];
    usedCells: number;
    totalCells: number;
}

/** 背包网格对外契约（由 useInteraction 出参透出，视图层只消费） */
export interface InventoryGridReturn {
    /** 背包网格尺寸（列 × 行），随力量成长 */
    size: BaseItemTemplate['size'];
    /** 待渲染的网格单元 */
    tiles: InventoryGridTile[];
    /** 网格容纳不下的物品 */
    overflow: ItemInstance[];
    /** 已占用格数 */
    usedCells: number;
    /** 网格总格数 */
    totalCells: number;
    /** 拖拽落位；不可放置时返回 false，视图据此弹回 */
    moveItem: (instanceId: string, x: number, y: number) => boolean;
    /** 落位预检：仅试算不写入，供拖拽过程中的合法性高亮使用 */
    canPlace: (instanceId: string, x: number, y: number) => boolean;
    /** 收纳预检：该物品能否放进当前背包网格，供仓库取出等交付操作使用 */
    canFit: (item: ItemInstance) => boolean;
    /** 旋转物品；放不下时返回 false */
    rotateItem: (instanceId: string) => boolean;
    /** 自动整理 */
    autoArrange: () => void;
}

//=============================================================================
// 游戏状态钩子契约类型（useGameState 公开入/出参所依赖的子类型）
//=============================================================================

/** 叙事流程步骤。 */
export type NarrativeFlowStep =
    | 'mode'
    | 'pacing'
    | 'aesthetic'
    | 'config'
    | 'details'
    | 'preview'
    | 'library'
    | 'closed';

/** 叙事运行时状态（当前叙事配置 + 链路分析）。 */
export interface NarrativeState {
    config?: StoryConfig;
    analysis: ChainNarrative['analysis'];
}

/**
 * 已落盘叙事产物的索引。
 *
 * 只承载存档列表的元信息（叙事链摘要与单元剧区域摘要），供归档面板渲染；
 * 与 {@link NarrativeLibrary}（玩家自建的恐怖域 / 元 / 美学）是两套互不相干的数据。
 */
export interface NarrativeArchiveIndex {
    arcs: Array<{
        id: string;
        title: string;
        mainAxis: string;
        zoneCount: number;
    }>;
    episodic: Array<{
        id: string;
        name: string;
        timestamp: number;
    }>;
    isLoading: boolean;
}

/**
 * 叙事库条目的契约校验失败项。
 *
 * 字段路径直接呈现给玩家（见 AestheticStudio 的 IssueList），
 * 故 `field` 使用契约里的字段名而非中文。
 */
export interface NarrativeDraftIssue {
    field: string;
    message: string;
}

/**
 * 一次自建叙事库写入 / 删除操作的结果。
 *
 * 校验失败或删除被拒时 ok 为 false，issues 直接呈现给玩家。
 */
export interface NarrativeMutationResult {
    ok: boolean;
    /** 校验失败项；ok 为 true 时为空数组。 */
    issues: NarrativeDraftIssue[];
    /** 删除被拒时，引用该条目的美学名称列表。 */
    blockedBy?: string[];
}
