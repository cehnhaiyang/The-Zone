import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, KeyboardEvent as ReactKeyboardEvent, SetStateAction } from 'react';
import type {
    AccessoryInstance,
    ArmorInstance,
    BaseDynamicState,
    ConsumableInstance,
    DataInstance,
    EnemyTemplate,
    EquipState,
    InteractionNpcEntity,
    ItemInstance,
    NeuralLinkState,
    Node,
    PlayerState,
    Puzzle,
    Settings,
    WeaponInstance,
    Zone,
} from '../meta';
import type {
    AttributeType,
    ConsumableEffectType,
    InteractionType,
    LogType,
    VitalType,
} from '../meta';
import {
    addItemToInventory,
    addUniqueItemToInventory,
    applyAttributeUpdates,
    applyEffectDeltas,
    applyEffectDeltasWithSnapshot,
    applyVitalUpdates,
    buildCurrentLocation,
    calculateEncounterChance,
    calculatePerceptionScore,
    calculateSearchCosts,
    checkExitLock,
    clamp,
    clampDynamicVitals,
    collectAccessoryEffects,
    createItemInstance,
    createNodeNpcEntity,
    equipItem,
    getAppliedAccessoryDeltas,
    getEffectValueByType,
    getNodeAmbushRate,
    getNodeSpecificEnemies,
    getNodeThreatLevel,
    hasItemInInventory,
    isAccessoryInstance,
    isArmorInstance,
    isAttributeType,
    isConsumableInstance,
    isDataInstance,
    isEquipmentInstance,
    isVitalType,
    normalizeEquipState,
    isWeaponInstance,
    negateEffectDeltas,
    normalizeEquipmentWithOverflow,
    normalizeUnlockIds,
    processItemDiscovery,
    processStateChange,
    reclaimOverflowEquipments,
    removeItemFromInventory,
    removeInteractionFromNode,
    safeNumber,
    stripEquipEffectSnapshot,
    unequipItem,
    writeEquipEffectSnapshot,
} from '../meta';
import type { EffectDeltas, GridSize } from '../meta';
import { getBackpackGridSize, getItemGridFootprint, getItemGridSize } from '../meta';
import { AiService, AudioService, PersistenceService } from '../services';
import type { BattleStartContext } from './useCombat';

type PuzzleStatus = 'idle' | 'success' | 'error';
type PuzzleStatusMsg = 'AWAITING_INPUT' | 'ACCESS_GRANTED' | 'ACCESS_DENIED' | 'TIME_EXPIRED';
type EquipmentSlotType = 'weapon' | 'armor' | 'accessory';
/** 遭遇裁定的触发渠道：进入节点（仅伏击节点）与搜查。 */
type EncounterCondition = 'on_enter' | 'on_search';

interface ConsumableEffectApplication {
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

const applyConsumableEffects = (
    item: ConsumableInstance,
    player: PlayerState
): ConsumableEffectApplication => {
    const result: ConsumableEffectApplication = {
        attributeUpdates: {},
        vitalUpdates: {},
        neuralLinkUpdates: {},
        hpDelta: 0,
        sanityDelta: 0,
        staminaDelta: 0,
        vigorDelta: 0,
        effectsApplied: [],
    };

    if (!item.effects?.length) return result;

    for (const effect of item.effects) {
        const [effectType, rawValue, duration] = effect;
        const value = Math.floor(safeNumber(rawValue));

        result.effectsApplied.push({
            type: effectType,
            value,
            duration,
        });

        switch (effectType) {
            case 'hp':
                result.hpDelta += value;
                break;

            case 'sanity':
                result.sanityDelta += value;
                break;

            case 'stamina':
                result.staminaDelta += value;
                break;

            case 'vigor':
                result.vigorDelta += value;
                break;

            case 'battery': {
                const currentBattery =
                    result.neuralLinkUpdates.battery ?? safeNumber(player.neuralLink.battery);

                result.neuralLinkUpdates.battery = clamp(
                    currentBattery + value,
                    0,
                    safeNumber(player.neuralLink.maxBattery)
                );
                break;
            }

            case 'integrity': {
                const currentIntegrity =
                    result.neuralLinkUpdates.integrity ?? safeNumber(player.neuralLink.integrity);

                result.neuralLinkUpdates.integrity = clamp(
                    currentIntegrity + value,
                    0,
                    safeNumber(player.neuralLink.maxIntegrity)
                );
                break;
            }

            default: {
                const effectKey = effectType as string;

                if (isAttributeType(effectKey)) {
                    result.attributeUpdates[effectKey] =
                        safeNumber(result.attributeUpdates[effectKey] ?? 0) + value;
                } else if (isVitalType(effectKey)) {
                    result.vitalUpdates[effectKey] =
                        safeNumber(result.vitalUpdates[effectKey] ?? 0) + value;
                } else {
                    console.warn(`[状态流转] 丢弃未知的消耗品效果指令: ${effectKey}`);
                }
            }
        }
    }

    return result;
};

interface UseInteractionParams {
    currentZone: Zone;
    setCurrentZone: Dispatch<SetStateAction<Zone>>;
    currentNodeId: string;
    setCurrentNodeId: Dispatch<SetStateAction<string>>;
    player: PlayerState;
    setPlayer: Dispatch<SetStateAction<PlayerState>>;
    addLog: (text: string, type: LogType) => void;
    handleGameTick: (timePassed?: number) => void;
    updatePlayer: (sanityDelta: number, hpDelta: number) => void;
    setShowCutscene: (show: boolean) => void;
    triggerCompanionReactions: (eventName: string, context?: string) => void;
    spawnEnemy: (
        enemyTemplate?: EnemyTemplate,
        zoneId?: string,
        threatLevel?: number,
        context?: BattleStartContext
    ) => void;
    setActiveInteractionNPC: (npc: InteractionNpcEntity) => void;
    settings: Settings;
    updateCompanion: (npcId: string, sanityDelta: number, hpDelta: number) => void;
}

interface UseInteractionReturn {
    getCurrentNode: () => Node;
    handleLocalMove: (targetId: string, label?: string) => void;
    handleSearch: () => void;
    handleInteraction: (type: InteractionType, targetId?: string) => void;
    activePuzzleNodeId: string | null;
    setActivePuzzleNodeId: Dispatch<SetStateAction<string | null>>;
    activePuzzleInteractionIndex: number | null;
    setActivePuzzleInteractionIndex: Dispatch<SetStateAction<number | null>>;
    getActivePuzzle: () => Puzzle | null;
    handlePuzzleSolve: () => void;
    handlePuzzleFail: () => void;
    recordHintUsed: () => void;
    closePuzzle: () => void;
    puzzleStats: { solved: number; failed: number; hints: number };
    puzzleController: PuzzleInteractionController;
    handleUseItem: (item: ItemInstance, npc?: InteractionNpcEntity) => Promise<void>;
    handleEquipItem: (item: ItemInstance) => void;
    handleDiscardItem: (item: ItemInstance) => void;
    inventoryGrid: InventoryGridReturn;
    loadingAudioId: string | null;
}

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
    handleKeyDown: (e: ReactKeyboardEvent) => void;
    handleUseHint: () => void;
}

interface PuzzleRuntime {
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

const DEFAULT_MAX_PUZZLE_ATTEMPTS = 3;

const normalizeAnswer = (value: unknown): string => String(value ?? '').trim().toLowerCase();

const makeFallbackNode = (name: string, desc: string): Node =>
    ({ name, desc, visualPrompt: desc, searchCount: 0, isVisited: false }) as Node;

const createPuzzleRuntime = (puzzle: Puzzle | null, clozeCells: string[]): PuzzleRuntime => ({
    input: '',
    status: 'idle',
    statusMsg: 'AWAITING_INPUT',
    attempts: 0,
    isShaking: false,
    hintsUsed: 0,
    timeLeft: puzzle?.restrictions?.timeLimit ?? 0,
    showLore: false,
    selectedOptions: [],
    patternInput: puzzle?.body.type === 'cloze' ? clozeCells.map(String) : [],
});

/**
 * 装备槽位序列（主手 → 副手 / 护甲槽 / 饰品槽）。
 *
 * 槽位契约允许 weapons 为对象、armors / accessories 为单件或数组，
 * 这里统一走 normalizeEquipState，保证序号与 equipItem / unequipItem 的槽位语义一致。
 */
const getEquipmentSlots = (
    equipment: EquipState,
    slotType: EquipmentSlotType
): Array<WeaponInstance | ArmorInstance | AccessoryInstance | null> => {
    const normalized = normalizeEquipState(equipment);
    if (slotType === 'weapon') return [normalized.weapons.main, normalized.weapons.side];
    if (slotType === 'armor') return normalized.armors;
    return normalized.accessories;
};

//-------------------------------------------------------------------------
// 背包网格（生化危机式格子仓储）
//-------------------------------------------------------------------------

/**
 * 网格落位
 *
 * 直接取自元契约 {@link BaseItemInstance.gridPlacement} 的内联结构，
 * 不另行定义第二套模型。
 */
type GridPlacement = NonNullable<ItemInstance['gridPlacement']>;

/** 落位表：instanceId → 落位 */
type GridPlacementMap = Record<string, GridPlacement>;

/** 单个待渲染的网格单元 */
interface InventoryGridTile {
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
interface GridBoard {
    cols: number;
    rows: number;
    cells: Array<string | null>;
}

const createGridBoard = ([cols, rows]: GridSize): GridBoard => ({
    cols,
    rows,
    cells: new Array<string | null>(cols * rows).fill(null),
});

const canOccupyGrid = (
    board: GridBoard,
    [width, height]: GridSize,
    x: number,
    y: number
): boolean => {
    if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
    if (x < 0 || y < 0) return false;
    if (x + width > board.cols || y + height > board.rows) return false;

    for (let row = y; row < y + height; row += 1) {
        for (let col = x; col < x + width; col += 1) {
            if (board.cells[row * board.cols + col] !== null) return false;
        }
    }

    return true;
};

const occupyGrid = (
    board: GridBoard,
    [width, height]: GridSize,
    x: number,
    y: number,
    owner: string
): void => {
    for (let row = y; row < y + height; row += 1) {
        for (let col = x; col < x + width; col += 1) {
            board.cells[row * board.cols + col] = owner;
        }
    }
};

/** 落位构造：非旋转态不写 rotated 字段，保持存档干净 */
const toGridPlacement = (x: number, y: number, rotated: boolean): GridPlacement =>
    rotated ? { x, y, rotated: true } : { x, y };

/** 从左到右、从上到下找首个可容纳位；先试默认朝向，再试旋转态 */
const findFirstGridFit = (
    board: GridBoard,
    footprint: GridSize
): GridPlacement | null => {
    const [width, height] = footprint;
    const rotatedFootprint: GridSize = [height, width];
    const canRotate = width !== height;

    for (let y = 0; y < board.rows; y += 1) {
        for (let x = 0; x < board.cols; x += 1) {
            if (canOccupyGrid(board, footprint, x, y)) return { x, y };
            if (canRotate && canOccupyGrid(board, rotatedFootprint, x, y)) {
                return { x, y, rotated: true };
            }
        }
    }

    return null;
};

const putOnGridBoard = (
    board: GridBoard,
    item: ItemInstance,
    placement: GridPlacement
): boolean => {
    const footprint = getItemGridFootprint(item, placement.rotated === true);
    if (!canOccupyGrid(board, footprint, placement.x, placement.y)) return false;

    occupyGrid(board, footprint, placement.x, placement.y, item.instanceId);
    return true;
};

/** 按落位表重建占位板，可排除某个实例以试算它的新位置 */
const buildGridBoard = (
    inventory: ItemInstance[],
    placements: GridPlacementMap,
    size: GridSize,
    excludeInstanceId?: string
): GridBoard => {
    const board = createGridBoard(size);

    inventory.forEach((item) => {
        if (item.instanceId === excludeInstanceId) return;

        const placement = placements[item.instanceId];
        if (!placement) return;

        putOnGridBoard(board, item, placement);
    });

    return board;
};

interface GridLayoutResult {
    placements: GridPlacementMap;
    overflow: ItemInstance[];
    usedCells: number;
    totalCells: number;
}

/**
 * 求解背包布局
 *
 * 两轮扫描：先原地保留已持久化且仍然合法的落位（保证玩家的手动摆放稳定），
 * 再按背包顺序为其余物品补首个可容纳位；两轮都放不下的进溢出区。
 */
const resolveGridPlacements = (
    inventory: ItemInstance[],
    size: GridSize
): GridLayoutResult => {
    const board = createGridBoard(size);
    const placements: GridPlacementMap = {};
    const overflow: ItemInstance[] = [];
    const pending: ItemInstance[] = [];

    inventory.forEach((item) => {
        const stored = item.gridPlacement;

        if (stored && !placements[item.instanceId] && putOnGridBoard(board, item, stored)) {
            placements[item.instanceId] = toGridPlacement(
                stored.x,
                stored.y,
                stored.rotated === true
            );
            return;
        }

        pending.push(item);
    });

    pending.forEach((item) => {
        const fit = findFirstGridFit(board, getItemGridSize(item));

        if (fit && putOnGridBoard(board, item, fit)) {
            placements[item.instanceId] = fit;
            return;
        }

        overflow.push(item);
    });

    const usedCells = board.cells.reduce<number>(
        (count, owner) => (owner === null ? count : count + 1),
        0
    );

    return { placements, overflow, usedCells, totalCells: size[0] * size[1] };
};

/** 把落位写回物品实例；无变化的实例原样返回，避免无谓的对象重建 */
const applyGridPlacements = (
    inventory: ItemInstance[],
    placements: GridPlacementMap
): ItemInstance[] => {
    let changed = false;

    const next = inventory.map((item) => {
        const placement = placements[item.instanceId];
        const current = item.gridPlacement;

        if (!placement) {
            if (!current) return item;

            changed = true;
            const { gridPlacement: _dropped, ...rest } = item;
            return rest as ItemInstance;
        }

        const same =
            current !== undefined &&
            current.x === placement.x &&
            current.y === placement.y &&
            (current.rotated === true) === (placement.rotated === true);

        if (same) return item;

        changed = true;
        return {
            ...item,
            gridPlacement: toGridPlacement(
                placement.x,
                placement.y,
                placement.rotated === true
            ),
        };
    });

    return changed ? next : inventory;
};

/** 试算拖拽：返回新的落位表，不可放置时返回 null */
const tryMoveGrid = (
    inventory: ItemInstance[],
    placements: GridPlacementMap,
    size: GridSize,
    instanceId: string,
    x: number,
    y: number
): GridPlacementMap | null => {
    const item = inventory.find((entry) => entry.instanceId === instanceId);
    if (!item) return null;

    const rotated = placements[instanceId]?.rotated === true;
    const board = buildGridBoard(inventory, placements, size, instanceId);

    if (!canOccupyGrid(board, getItemGridFootprint(item, rotated), x, y)) return null;

    return { ...placements, [instanceId]: toGridPlacement(x, y, rotated) };
};

/** 试算旋转：原位放不下时按就近顺序微调锚点，全落空则返回 null */
const tryRotateGrid = (
    inventory: ItemInstance[],
    placements: GridPlacementMap,
    size: GridSize,
    instanceId: string
): GridPlacementMap | null => {
    const item = inventory.find((entry) => entry.instanceId === instanceId);
    const current = placements[instanceId];
    if (!item || !current) return null;

    const nextRotated = current.rotated !== true;
    const board = buildGridBoard(inventory, placements, size, instanceId);
    const footprint = getItemGridFootprint(item, nextRotated);

    const anchors: Array<[number, number]> = [
        [current.x, current.y],
        [current.x - 1, current.y],
        [current.x, current.y - 1],
        [current.x - 1, current.y - 1],
        [current.x + 1, current.y],
        [current.x, current.y + 1],
    ];

    for (const [x, y] of anchors) {
        if (!canOccupyGrid(board, footprint, x, y)) continue;
        return { ...placements, [instanceId]: toGridPlacement(x, y, nextRotated) };
    }

    return null;
};

/** 自动整理：占地降序的贪心装箱，让长武器与大件先占住完整空间 */
const arrangeGridPlacements = (
    inventory: ItemInstance[],
    size: GridSize
): GridPlacementMap => {
    const board = createGridBoard(size);
    const placements: GridPlacementMap = {};

    const ordered = inventory
        .map((item, index) => ({ item, index, footprint: getItemGridSize(item) }))
        .sort((a, b) => {
            const areaDiff =
                b.footprint[0] * b.footprint[1] - a.footprint[0] * a.footprint[1];
            if (areaDiff !== 0) return areaDiff;

            const longDiff = Math.max(...b.footprint) - Math.max(...a.footprint);
            if (longDiff !== 0) return longDiff;

            return a.index - b.index;
        });

    ordered.forEach(({ item }) => {
        const fit = findFirstGridFit(board, getItemGridSize(item));
        if (!fit || !putOnGridBoard(board, item, fit)) return;

        placements[item.instanceId] = fit;
    });

    return placements;
};

/**
 * 判定物品能否被当前背包容纳
 *
 * 可堆叠物品（消耗品 / 材料）命中同源堆叠时不占新空间，直接视为可容纳；
 * 其余情况按当前布局试放一次。供仓库取出等交付类操作预检。
 */
const canFitGridItem = (
    inventory: ItemInstance[],
    placements: GridPlacementMap,
    size: GridSize,
    item: ItemInstance
): boolean => {
    const stackable = item.type === 'consumable' || item.type === 'material';
    const merged =
        stackable &&
        inventory.some((entry) => entry.id === item.id && entry.type === item.type);

    if (merged) return true;

    return findFirstGridFit(buildGridBoard(inventory, placements, size), getItemGridSize(item)) !== null;
};

/** 背包网格对外契约（由 useInteraction 出参透出，视图层只消费） */
interface InventoryGridReturn {
    /** 背包网格尺寸（列 × 行），随力量成长 */
    size: GridSize;
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

const patchZoneNode = (zone: Zone, nodeId: string, updater: (node: Node) => Node): Zone => {
    const node = zone.nodes[nodeId];
    if (!node) return zone;
    return { ...zone, nodes: { ...zone.nodes, [nodeId]: updater(node) } };
};

const unlockZoneNode = (zone: Zone, nodeId: string): Zone =>
    patchZoneNode(zone, nodeId, (node) => {
        const next: Node = { ...node };
        delete next.lock;
        return next;
    });

const lockZoneNode = (zone: Zone, nodeId: string, reason: string): Zone =>
    patchZoneNode(zone, nodeId, (node) => ({ ...node, lock: reason }));

async function loadNodeMediaResources(
    zoneId: string,
    nodeId: string
): Promise<{ videoUrl?: string; imageUrl?: string }> {
    if (!PersistenceService.isReady) return {};
    const result: { videoUrl?: string; imageUrl?: string } = {};
    try {
        const videos = await PersistenceService.listVideos(zoneId, nodeId);
        const videoFiles = videos.filter((fileName) => /^\d+\.mp4$/i.test(fileName));
        if (videoFiles.length > 0) {
            const maxIdx = videoFiles.reduce((max, fileName) => {
                const matched = fileName.match(/^(\d+)\.mp4$/i);
                const idx = matched ? parseInt(matched[1], 10) : 0;
                return Math.max(max, idx);
            }, 0);
            const path = await PersistenceService.getVideoPath(zoneId, nodeId, String(maxIdx));
            if (path) result.videoUrl = path;
        }
        const images = await PersistenceService.listImages(zoneId, nodeId);
        if (images.length > 0) {
            const latestImage = [...images].sort().pop();
            if (latestImage) {
                const baseName = latestImage.replace(/\.[^/.]+$/, '');
                const data = await PersistenceService.loadImage(zoneId, nodeId, baseName);
                if (data) result.imageUrl = data;
            }
        }
    } catch (error) {
        console.warn(`节点媒体加载故障 [${zoneId}/${nodeId}]:`, error);
    }
    return result;
}

async function handleAudioItem(
    item: DataInstance,
    zone: Zone,
    settings: Settings,
    addLog: (text: string, type: LogType) => void,
    nodeId: string
): Promise<DataInstance> {
    if (item.audioUrl) {
        addLog(`播放音频实体轨: ${item.name}`, 'command');
        AudioService.playPCM(item.audioUrl);
        return item;
    }
    if (!item.audioScript) {
        addLog(`数据损坏: ${item.name} 无法解析。`, 'warning');
        return item;
    }
    addLog(`解析音频轨道: ${item.name}...`, 'command');
    addLog('启动神经解码流...', 'ai-gen');
    try {
        const url = await AiService.generateSpeech(settings, item.audioScript, {
            zoneId: zone.id,
            nodeId,
        });
        if (url) {
            AudioService.playPCM(url);
            return { ...item, audioUrl: url };
        }
    } catch (error) {
        console.error('音频重建协议失败:', error);
    }
    addLog('音频重建异常终止。', 'warning');
    return item;
}

export const useInteraction = ({
    currentZone,
    setCurrentZone,
    currentNodeId,
    setCurrentNodeId,
    player,
    setPlayer,
    addLog,
    handleGameTick,
    updatePlayer,
    setShowCutscene,
    triggerCompanionReactions,
    spawnEnemy,
    setActiveInteractionNPC,
    settings,
    updateCompanion,
}: UseInteractionParams): UseInteractionReturn => {
    const [activePuzzleNodeId, setActivePuzzleNodeId] = useState<string | null>(null);
    const [activePuzzleInteractionIndex, setActivePuzzleInteractionIndex] = useState<number | null>(null);
    const [puzzleStats, setPuzzleStats] = useState({ solved: 0, failed: 0, hints: 0 });
    const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
    const [puzzleRuntime, setPuzzleRuntime] = useState<PuzzleRuntime>(() => createPuzzleRuntime(null, []));

    const mediaAbortControllerRef = useRef<AbortController | null>(null);
    const puzzleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const puzzleCallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const enemySpawnTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

    const clearPuzzleTimers = useCallback(() => {
        if (puzzleTimerRef.current) {
            clearInterval(puzzleTimerRef.current);
            puzzleTimerRef.current = null;
        }
        if (puzzleCallbackTimerRef.current) {
            clearTimeout(puzzleCallbackTimerRef.current);
            puzzleCallbackTimerRef.current = null;
        }
    }, []);

    const scheduleCallback = useCallback((callback: () => void, delay: number) => {
        if (puzzleCallbackTimerRef.current) clearTimeout(puzzleCallbackTimerRef.current);
        puzzleCallbackTimerRef.current = setTimeout(callback, delay);
    }, []);

    useEffect(() => {
        return () => {
            mediaAbortControllerRef.current?.abort();
            clearPuzzleTimers();
            enemySpawnTimersRef.current.forEach((timer) => clearTimeout(timer));
            enemySpawnTimersRef.current.clear();
        };
    }, [clearPuzzleTimers]);

    const playerStateMemo = useMemo(
        () => ({
            staminaPct:
                player.dynamic.maxStamina > 0 ? player.dynamic.stamina / player.dynamic.maxStamina : 0,
            vigorPct:
                player.dynamic.maxVigor > 0 ? player.dynamic.vigor / player.dynamic.maxVigor : 0,
            sanityPct:
                player.dynamic.maxSanity > 0 ? player.dynamic.sanity / player.dynamic.maxSanity : 0,
            attributes: {
                wisdom: player.dynamic.wisdom,
                awareness: player.dynamic.awareness,
                agility: player.dynamic.agility,
            },
        }),
        [
            player.dynamic.maxStamina,
            player.dynamic.stamina,
            player.dynamic.maxVigor,
            player.dynamic.vigor,
            player.dynamic.maxSanity,
            player.dynamic.sanity,
            player.dynamic.wisdom,
            player.dynamic.awareness,
            player.dynamic.agility,
        ]
    );

    const getCurrentNode = useCallback((): Node => {
        if (!currentZone?.nodes) return makeFallbackNode('加载中...', '数据加载中');
        if (!currentNodeId?.trim()) return makeFallbackNode('未定位', '未知坐标');
        if (currentZone.id === 'empty_zone' && Object.keys(currentZone.nodes).length === 0) {
            return makeFallbackNode('虚空', '初始原点');
        }
        return currentZone.nodes[currentNodeId] ?? makeFallbackNode('未定位', '未知坐标');
    }, [currentZone, currentNodeId]);

    /** 由节点构造开战上下文：节点键名决定战场地图，isAmbushed 决定部署压缩。 */
    const buildBattleContext = useCallback(
        (node: Node | undefined, nodeId?: string): BattleStartContext => ({
            nodeId: nodeId ?? currentNodeId,
            mapOverride: node?.map,
            isAmbushed: getNodeAmbushRate(node),
        }),
        [currentNodeId]
    );

    const scheduleEnemySpawn = useCallback(
        (
            delay: number,
            enemyTemplate?: EnemyTemplate,
            customMessage?: string,
            threatLevel?: number,
            context?: BattleStartContext
        ) => {
            // 开战上下文在「调度时刻」快照：延迟期间玩家可能已移动或换区。
            // 调用方若已知本次遭遇所属节点（例如刚进入新节点的当帧），必须显式传入，
            // 否则会读到尚未提交的旧 currentNodeId，导致战场地图回退默认地图。
            const battleContext = context ?? buildBattleContext(getCurrentNode());
            const timer = setTimeout(
                () => {
                    enemySpawnTimersRef.current.delete(timer);
                    // customMessage === '' 表示静默（上游已自行记录日志）
                    if (customMessage !== '') {
                        addLog(
                            customMessage || `侦测到高危实体: ${enemyTemplate?.name ?? '未知'}`,
                            'critical'
                        );
                    }
                    AudioService.playSfx('terrifying');
                    spawnEnemy(enemyTemplate, currentZone.id, threatLevel, battleContext);
                },
                Math.max(0, safeNumber(delay))
            );
            enemySpawnTimersRef.current.add(timer);
        },
        [addLog, spawnEnemy, currentZone.id, getCurrentNode, buildBattleContext]
    );

    /**
     * 节点遭遇裁定（新版遇敌机制）。
     * 契约：
     * - isDangerous 为 EnemyTemplate[] → 该节点的遇敌只产生数组中的敌人（任一触发方式）；
     * - isDangerous 为 { isAmbushed, level } → 进入节点即触发战斗，必定发生；
     * - 数值威胁等级 → 随机遇敌只发生在搜查，按搜查遇敌曲线掷骰；
     *   进入普通节点与执行交互都不会随机遇敌
     *   （交互 / 谜题自带的 spawnEnemy 属于显式生成，不走本函数）。
     * @returns 是否实际触发了敌人生成
     */
    const tryNodeEncounter = useCallback(
        (
            node: Node,
            condition: EncounterCondition,
            delay: number,
            searchCount = 0,
            fallbackMessage?: string,
            nodeId?: string
        ): boolean => {
            const battleContext = buildBattleContext(node, nodeId);
            const specificEnemies = getNodeSpecificEnemies(node);
            if (specificEnemies) {
                if (!specificEnemies.length) return false;
                specificEnemies.forEach((enemy) =>
                    scheduleEnemySpawn(
                        delay,
                        enemy,
                        undefined,
                        getNodeThreatLevel(node),
                        battleContext
                    )
                );
                return true;
            }
            const threatLevel = getNodeThreatLevel(node);
            if (threatLevel <= 0) return false;
            // 伏击节点（isDangerous 为 { isAmbushed, level }）：进入即触发战斗，必定发生；
            // 其部署区间不利由开战上下文（isAmbushed）传给战斗引擎。
            if (condition === 'on_enter' && getNodeAmbushRate(node) > 0) {
                scheduleEnemySpawn(delay, undefined, fallbackMessage, threatLevel, battleContext);
                return true;
            }
            // 新版遇敌机制：随机遇敌只发生在搜查；进入普通节点与交互都不掷遭遇骰。
            if (condition !== 'on_search') return false;
            const encounterChance = calculateEncounterChance(
                threatLevel,
                searchCount,
                playerStateMemo.staminaPct,
                playerStateMemo.vigorPct,
                'on_search',
                settings.gameConfig
            );
            if (Math.random() >= encounterChance) return false;
            scheduleEnemySpawn(delay, undefined, fallbackMessage, threatLevel, battleContext);
            return true;
        },
        [scheduleEnemySpawn, buildBattleContext, playerStateMemo, settings]
    );

    const validateMove = useCallback(
        (targetId: string) => {
            const targetNode = currentZone.nodes[targetId];
            const currentNode = currentZone.nodes[currentNodeId];
            if (!targetNode || !currentNode) {
                return { valid: false, lockReason: '目标坐标不存在。' };
            }
            if (targetNode.lock) {
                return { valid: false, lockReason: `坐标被封锁：${targetNode.lock}` };
            }
            const exitDef = (currentNode.exits ?? []).find((exit) => exit.targetId === targetId);
            if (!exitDef) {
                return { valid: false, lockReason: '未知路径或目标坐标不可达。' };
            }
            if (exitDef.type !== 'local') {
                return { valid: false, lockReason: '该路径需要区域跃迁协议。' };
            }
            const lockStatus = checkExitLock(exitDef, currentZone.nodes);
            if (lockStatus.locked) {
                return { valid: false, lockReason: lockStatus.reason };
            }
            return { valid: true };
        },
        [currentZone, currentNodeId]
    );

    const loadAndAttachNodeMedia = useCallback(
        async (zoneId: string, nodeId: string) => {
            mediaAbortControllerRef.current?.abort();
            const controller = new AbortController();
            mediaAbortControllerRef.current = controller;
            try {
                const media = await loadNodeMediaResources(zoneId, nodeId);
                if (controller.signal.aborted || (!media.videoUrl && !media.imageUrl)) return;
                setCurrentZone((prev) => {
                    const node = prev.nodes[nodeId];
                    if (!node) return prev;
                    return { ...prev, nodes: { ...prev.nodes, [nodeId]: { ...node, ...media } } };
                });
            } catch (error) {
                if (!controller.signal.aborted) console.warn('媒体流中断:', error);
            }
        },
        [setCurrentZone]
    );

    const executeInteraction = useCallback(
        (interactionIndex: number, isPuzzleBypass = false) => {
            const node = getCurrentNode();
            const interaction = node.interactions?.[interactionIndex];
            if (!interaction) return;

            if (interaction.requirements?.items) {
                const missingItems = interaction.requirements.items.filter(
                    (itemId) => !hasItemInInventory(player.dynamic.inventory, itemId)
                );
                if (missingItems.length > 0) {
                    addLog(`校验失败：依赖倒置错配 [${missingItems.join(', ')}]`, 'warning');
                    AudioService.playSfx('error');
                    return;
                }
            }
            if (interaction.requirements?.staff) {
                const missingStaff = interaction.requirements.staff.filter(
                    (npcId) => !player.companions.some((companion) => companion.static.id === npcId)
                );
                if (missingStaff.length > 0) {
                    addLog(`校验失败：缺少协同人员 [${missingStaff.join(', ')}]`, 'warning');
                    AudioService.playSfx('error');
                    return;
                }
            }
            if (!isPuzzleBypass && interaction.requirements?.puzzleSolved) {
                setActivePuzzleInteractionIndex(interactionIndex);
                setActivePuzzleNodeId(currentNodeId);
                AudioService.setTheme('puzzle_ambient');
                AudioService.startMusic();
                return;
            }

            const { results } = interaction;
            addLog(results.narrative || '例程执行完毕。', 'success');
            if (results.soundEffect) AudioService.playSfx(results.soundEffect);
            handleGameTick(Math.max(0, safeNumber(results.timeCost ?? 1)));

            const changes = processStateChange(results.stateChange, player);
            changes.logs.forEach((log) => addLog(log.text, log.type));
            setPlayer((prev) => ({
                ...prev,
                dynamic: { ...prev.dynamic, inventory: changes.inventory ?? prev.dynamic.inventory },
                companions: changes.companions ?? prev.companions,
            }));
            const hpDelta = safeNumber(changes.hpDelta);
            const sanityDelta = safeNumber(changes.sanityDelta);
            if (hpDelta !== 0) updatePlayer(0, hpDelta);
            if (sanityDelta !== 0) updatePlayer(sanityDelta, 0);

            const unlockTargets = changes.unlocks ?? [];
            const hasLockedTargets = unlockTargets.some(({ nodeId }) =>
                Boolean(currentZone.nodes[nodeId]?.lock)
            );
            setCurrentZone((prev) => {
                let next = prev;
                let hasChanged = false;
                const currentNode = next.nodes[currentNodeId];
                const nextInteractions = currentNode
                    ? removeInteractionFromNode(currentNode, interaction)
                    : undefined;
                if (
                    currentNode?.interactions &&
                    nextInteractions &&
                    nextInteractions.length !== currentNode.interactions.length
                ) {
                    next = {
                        ...next,
                        nodes: {
                            ...next.nodes,
                            [currentNodeId]: { ...currentNode, interactions: nextInteractions },
                        },
                    };
                    hasChanged = true;
                }
                unlockTargets.forEach(({ nodeId }) => {
                    if (next.nodes[nodeId]?.lock) {
                        next = unlockZoneNode(next, nodeId);
                        hasChanged = true;
                    }
                });
                return hasChanged ? next : prev;
            });
            if (unlockTargets.length > 0 && hasLockedTargets) AudioService.playSfx('unlock');

            const spawnDelay = settings.gameConfig.mediaLoading.enemySpawnDelay;
            const spawnEnemies = changes.spawnEnemies ?? [];
            if (spawnEnemies.length > 0) {
                // processStateChange 已记录警报日志，此处静默生成
                const nodeContext = buildBattleContext(node, currentNodeId);
                spawnEnemies.forEach((enemy) =>
                    scheduleEnemySpawn(spawnDelay, enemy, '', getNodeThreatLevel(node), nodeContext)
                );
                return;
            }
            // 新版遇敌机制：交互本身不再掷遭遇骰；
            // 交互携带的 spawnEnemy 已在上面按显式生成处理。
        },
        [
            getCurrentNode,
            currentNodeId,
            player,
            setPlayer,
            addLog,
            handleGameTick,
            settings,
            setCurrentZone,
            scheduleEnemySpawn,
            updatePlayer,
            currentZone,
            buildBattleContext,
            setActivePuzzleInteractionIndex,
            setActivePuzzleNodeId,
        ]
    );

    const handleObjectInteraction = useCallback(
        (targetIndexStr?: string, isPuzzleBypass = false) => {
            const node = getCurrentNode();
            if (!node?.interactions?.length) return;
            const index =
                targetIndexStr !== undefined
                    ? parseInt(targetIndexStr, 10)
                    : node.interactions.findIndex((interaction) => {
                        const itemsOk =
                            !interaction.requirements?.items ||
                            interaction.requirements.items.every((itemId) =>
                                hasItemInInventory(player.dynamic.inventory, itemId)
                            );
                        const staffOk =
                            !interaction.requirements?.staff ||
                            interaction.requirements.staff.every((npcId) =>
                                player.companions.some((companion) => companion.static.id === npcId)
                            );
                        return itemsOk && staffOk;
                    });
            if (Number.isNaN(index) || index < 0 || !node.interactions[index]) return;
            executeInteraction(index, isPuzzleBypass);
        },
        [getCurrentNode, player.dynamic.inventory, player.companions, executeInteraction]
    );

    const handleLocalMove = useCallback(
        (targetId: string, label?: string) => {
            if (targetId === currentNodeId) return;
            const targetNode = currentZone.nodes[targetId];
            if (!targetNode) return;
            const validation = validateMove(targetId);
            if (!validation.valid) {
                addLog(validation.lockReason || '无法抵达目标坐标。', 'warning');
                AudioService.playSfx('lock');
                return;
            }

            addLog(`跨越至坐标: ${label || targetNode.name}`, 'command');
            AudioService.playSfx('node_transition');
            setCurrentNodeId(targetId);
            handleGameTick(1);

            const staminaCost = safeNumber(settings.gameConfig.movementCosts.baseStamina);
            const sanityCost = safeNumber(settings.gameConfig.movementCosts.baseSanity);
            const isFirstVisit = !targetNode.isVisited;
            setPlayer((prev) => ({
                ...prev,
                dynamic: {
                    ...prev.dynamic,
                    stamina: clamp(prev.dynamic.stamina - staminaCost, 0, prev.dynamic.maxStamina),
                },
                location: {
                    prevLocation: prev.location.currentLocation,
                    currentLocation: buildCurrentLocation(currentZone, targetId),
                },
                ...(isFirstVisit ? { exploredNodes: prev.exploredNodes + 1 } : {}),
            }));
            if (sanityCost > 0) updatePlayer(-sanityCost, 0);

            const spawnDelay = settings.gameConfig.mediaLoading.enemySpawnDelay;
            if (isFirstVisit) {
                setCurrentZone((prev) => {
                    const node = prev.nodes[targetId];
                    if (!node || node.isVisited) return prev;
                    return {
                        ...prev,
                        nodes: { ...prev.nodes, [targetId]: { ...node, isVisited: true } },
                    };
                });
                setShowCutscene(true);
                triggerCompanionReactions(`接入新坐标: ${targetNode.name}`, targetNode.desc);
                // 进入新节点的当帧 currentNodeId 尚未提交，必须显式传入 targetId，
                // 否则战场地图会按上一个节点解析（回退默认地图）。
                tryNodeEncounter(
                    targetNode,
                    'on_enter',
                    spawnDelay,
                    0,
                    '被动安全协议被破坏，实体接近。',
                    targetId
                );
            } else {
                triggerCompanionReactions(`重返坐标 ${targetNode.name}`);
            }
            loadAndAttachNodeMedia(currentZone.id, targetId);
        },
        [
            currentZone,
            currentNodeId,
            validateMove,
            addLog,
            setCurrentNodeId,
            handleGameTick,
            setPlayer,
            settings,
            setCurrentZone,
            updatePlayer,
            setShowCutscene,
            triggerCompanionReactions,
            tryNodeEncounter,
            loadAndAttachNodeMedia,
        ]
    );

    const handleSearch = useCallback(() => {
        const node = currentZone.nodes[currentNodeId];
        if (!node) return;

        AudioService.playSfx('search');
        addLog('执行深度拓扑扫描...', 'command');
        handleGameTick(1);

        const costs = calculateSearchCosts(
            playerStateMemo.attributes,
            playerStateMemo.staminaPct,
            playerStateMemo.vigorPct,
            settings.gameConfig
        );
        setPlayer((prev) => ({
            ...prev,
            searchCount: safeNumber(prev.searchCount) + 1,
            dynamic: {
                ...prev.dynamic,
                stamina: clamp(
                    prev.dynamic.stamina - safeNumber(costs.staminaCost),
                    0,
                    prev.dynamic.maxStamina
                ),
                vigor: clamp(prev.dynamic.vigor - safeNumber(costs.vigorCost), 0, prev.dynamic.maxVigor),
            },
        }));
        const sanityCost = safeNumber(costs.sanityCost);
        if (sanityCost > 0) updatePlayer(-sanityCost, 0);
        if (safeNumber(costs.fatiguePenalty) > settings.gameConfig.fatigueThresholds.highWarning) {
            addLog('机体效能下降，扫描精度受损。', 'warning');
        }

        const count = safeNumber(node.searchCount) + 1;
        triggerCompanionReactions('执行拓扑扫描');
        const roll =
            Math.random() * 20 +
            calculatePerceptionScore(playerStateMemo.attributes, count, settings.gameConfig);
        const { foundItem, remainingItems } = processItemDiscovery(node, roll, settings.gameConfig);

        if (foundItem) {
            const threshold =
                foundItem.discoveryThreshold ?? settings.gameConfig.discoveryThresholds.low;
            const isRare = threshold > settings.gameConfig.discoveryThresholds.high;
            addLog(
                isRare ? `深层解析成功: 提取实体 [${foundItem.name}]` : `物资确认: ${foundItem.name}`,
                'loot'
            );
            addLog(foundItem.desc, 'info');
            AudioService.playSfx(foundItem.grade !== 'standard' ? 'success' : 'item_pickup');
            const newItem = createItemInstance(foundItem);
            setPlayer((prev) => ({
                ...prev,
                dynamic: {
                    ...prev.dynamic,
                    inventory: addItemToInventory(prev.dynamic.inventory, newItem),
                },
            }));
            triggerCompanionReactions(`取得资产: ${foundItem.name}`);
            if (isDataInstance(newItem) && newItem.documentContent) {
                addLog(`>>> ${foundItem.name} <<<`, 'loot');
                addLog(newItem.documentContent, 'info');
            }
        }

        setCurrentZone((prev) => {
            const currentNode = prev.nodes[currentNodeId];
            if (!currentNode) return prev;
            return {
                ...prev,
                nodes: {
                    ...prev.nodes,
                    [currentNodeId]: { ...currentNode, items: remainingItems, searchCount: count },
                },
            };
        });

        const encounterTriggered = tryNodeEncounter(
            node,
            'on_search',
            settings.gameConfig.mediaLoading.searchEnemySpawnDelay,
            count,
            '主动扫描引发异常环境波动。'
        );
        if (!encounterTriggered && !foundItem) {
            addLog(
                `扫描结束。区域反馈为空。${count > settings.gameConfig.searchThresholds.repetitiveWarning
                    ? '建议终止在此坐标的检索行为。'
                    : ''
                }`,
                'environment'
            );
            AudioService.playSfx('typing_1');
        }
    }, [
        currentZone,
        currentNodeId,
        playerStateMemo,
        setPlayer,
        addLog,
        handleGameTick,
        settings,
        triggerCompanionReactions,
        setCurrentZone,
        tryNodeEncounter,
        updatePlayer,
    ]);

    const handleInteraction = useCallback(
        (type: InteractionType, targetId?: string) => {
            if (type === 'interact_npc') {
                const node = getCurrentNode();
                const npc = node?.nodeNpc;
                if (npc) {
                    if (safeNumber(npc.initialState?.vital?.maxHp) > 0) {
                        addLog(`建立局部物理链接: ${npc.name}`, 'event');
                        const existingCompanion = player.companions.find(
                            (companion) => companion.static.id === npc.id
                        );
                        setActiveInteractionNPC(existingCompanion ?? createNodeNpcEntity(npc));
                    } else {
                        // 历史实现：maxHp<=0 时静默 return，玩家零反馈。
                        addLog(`[${npc.name}] 生命体征异常，无法建立物理链接。`, 'warning');
                        AudioService.playSfx('lock');
                    }
                } else {
                    addLog('该坐标没有可交互的生命体。', 'environment');
                }
                return;
            }
            handleObjectInteraction(targetId);
        },
        [getCurrentNode, addLog, setActiveInteractionNPC, handleObjectInteraction, player.companions]
    );

    // ========================================================================
    // 谜题子系统
    // ========================================================================

    const getActivePuzzle = useCallback((): Puzzle | null => {
        if (!activePuzzleNodeId || activePuzzleInteractionIndex === null) return null;
        const node = currentZone.nodes[activePuzzleNodeId];
        const interaction = node?.interactions?.[activePuzzleInteractionIndex];
        return interaction?.requirements?.puzzleSolved ?? null;
    }, [activePuzzleNodeId, activePuzzleInteractionIndex, currentZone]);

    const activePuzzle = useMemo(() => getActivePuzzle(), [getActivePuzzle]);
    const activePuzzleMaxAttempts = Math.max(
        1,
        safeNumber(activePuzzle?.restrictions?.maxAttempts ?? DEFAULT_MAX_PUZZLE_ATTEMPTS, DEFAULT_MAX_PUZZLE_ATTEMPTS)
    );
    const puzzleTimeLimit = activePuzzle?.restrictions?.timeLimit ?? 0;

    const clozeFlatBody = useMemo<string[]>(() => {
        if (activePuzzle?.body.type !== 'cloze') return [];
        return activePuzzle.body.body.reduce<string[]>((acc, row) => acc.concat(row), []);
    }, [activePuzzle]);

    const clozeBlankIndices = useMemo<number[]>(
        () =>
            clozeFlatBody.reduce<number[]>((acc, cell, index) => {
                if (cell === '') acc.push(index);
                return acc;
            }, []),
        [clozeFlatBody]
    );

    // 谜题切换时重置运行时
    useEffect(() => {
        clearPuzzleTimers();
        setPuzzleRuntime(createPuzzleRuntime(activePuzzle, clozeFlatBody));
    }, [activePuzzle, clozeFlatBody, clearPuzzleTimers]);

    const handlePuzzleSolve = useCallback(() => {
        if (!activePuzzleNodeId || activePuzzleInteractionIndex === null) return;
        const index = activePuzzleInteractionIndex;
        const puzzle = activePuzzle;
        AudioService.stopMusic();
        clearPuzzleTimers();
        setActivePuzzleInteractionIndex(null);
        setActivePuzzleNodeId(null);

        if (puzzle?.rewards) {
            if (puzzle.rewards.sanity) {
                updatePlayer(puzzle.rewards.sanity, 0);
                addLog(`谜题奖励：理智恢复 +${puzzle.rewards.sanity}`, 'success');
            }
            if (puzzle.rewards.items?.length) {
                const rewardItems = puzzle.rewards.items.map(createItemInstance);
                rewardItems.forEach((item) => addLog(`谜题奖励：获得 ${item.name}`, 'loot'));
                setPlayer((prev) => ({
                    ...prev,
                    dynamic: {
                        ...prev.dynamic,
                        inventory: rewardItems.reduce(addItemToInventory, prev.dynamic.inventory),
                    },
                }));
            }
        }
        handleObjectInteraction(index.toString(), true);
        setPuzzleStats((prev) => ({ ...prev, solved: prev.solved + 1 }));
    }, [
        activePuzzleNodeId,
        activePuzzleInteractionIndex,
        activePuzzle,
        handleObjectInteraction,
        updatePlayer,
        setPlayer,
        addLog,
        clearPuzzleTimers,
        setActivePuzzleInteractionIndex,
        setActivePuzzleNodeId,
    ]);

    const handlePuzzleFail = useCallback(() => {
        if (!activePuzzleNodeId) return;
        AudioService.stopMusic();
        clearPuzzleTimers();
        const node = currentZone.nodes[activePuzzleNodeId];
        const interaction =
            activePuzzleInteractionIndex !== null
                ? node?.interactions?.[activePuzzleInteractionIndex]
                : undefined;
        const puzzle = interaction?.requirements?.puzzleSolved;
        if (!interaction || !puzzle) {
            setActivePuzzleNodeId(null);
            setActivePuzzleInteractionIndex(null);
            return;
        }

        addLog('█▓▒░ 逻辑锁校验失败 ░▒▓█', 'critical');
        addLog('触发底层防卫协议。', 'critical');
        AudioService.playSfx('fail');

        const penalties = puzzle.penalties;
        if (penalties?.hp) {
            const hpPenalty = Math.abs(safeNumber(penalties.hp));
            updatePlayer(0, -hpPenalty);
            addLog(`遭遇物理反馈冲击 (-${hpPenalty} HP)`, 'warning');
        }
        if (penalties?.sanity) {
            const sanityPenalty = Math.abs(safeNumber(penalties.sanity));
            updatePlayer(-sanityPenalty, 0);
            addLog(`神经接口过载 (-${sanityPenalty} SAN)`, 'warning');
        }

        setCurrentZone((prev) => {
            let next = prev;
            let hasChanged = false;
            if (penalties?.permanentLock) {
                const currentNode = next.nodes[activePuzzleNodeId];
                const nextInteractions = currentNode
                    ? removeInteractionFromNode(currentNode, interaction)
                    : undefined;
                if (
                    currentNode?.interactions &&
                    nextInteractions &&
                    nextInteractions.length !== currentNode.interactions.length
                ) {
                    next = {
                        ...next,
                        nodes: {
                            ...next.nodes,
                            [activePuzzleNodeId]: { ...currentNode, interactions: nextInteractions },
                        },
                    };
                    hasChanged = true;
                }
            }
            if (penalties?.nodesToLock) {
                normalizeUnlockIds(penalties.nodesToLock).forEach((nodeIdToLock) => {
                    if (next.nodes[nodeIdToLock]) {
                        next = lockZoneNode(next, nodeIdToLock, puzzle.title || '逻辑锁失效');
                        hasChanged = true;
                    }
                });
            }
            return hasChanged ? next : prev;
        });

        if (penalties?.spawnEnemy) {
            addLog('防卫例程激活：实体具象化。', 'critical');
            // 谜题所属节点可能与当前节点不同：优先按谜题节点解析战场地图。
            const puzzleNode = activePuzzleNodeId
                ? currentZone.nodes[activePuzzleNodeId]
                : undefined;
            scheduleEnemySpawn(
                settings.gameConfig.mediaLoading.puzzleFailEnemySpawnDelay,
                penalties.spawnEnemy,
                undefined,
                getNodeThreatLevel(node),
                buildBattleContext(puzzleNode ?? node, activePuzzleNodeId ?? undefined)
            );
        }
        setPuzzleStats((prev) => ({ ...prev, failed: prev.failed + 1 }));
        setActivePuzzleInteractionIndex(null);
        setActivePuzzleNodeId(null);
    }, [
        activePuzzleNodeId,
        activePuzzleInteractionIndex,
        currentZone,
        addLog,
        updatePlayer,
        scheduleEnemySpawn,
        buildBattleContext,
        setCurrentZone,
        settings,
        clearPuzzleTimers,
        setActivePuzzleInteractionIndex,
        setActivePuzzleNodeId,
    ]);

    // 倒计时：纯递减，不含副作用
    useEffect(() => {
        if (!activePuzzle || puzzleTimeLimit <= 0 || puzzleRuntime.status !== 'idle') return;
        puzzleTimerRef.current = setInterval(() => {
            setPuzzleRuntime((prev) =>
                prev.timeLeft > 0 ? { ...prev, timeLeft: prev.timeLeft - 1 } : prev
            );
        }, 1000);
        return () => {
            if (puzzleTimerRef.current) {
                clearInterval(puzzleTimerRef.current);
                puzzleTimerRef.current = null;
            }
        };
    }, [activePuzzle, puzzleTimeLimit, puzzleRuntime.status]);

    // 到期裁定：独立副作用，避免在 setState updater 内触发定时器/音效
    useEffect(() => {
        if (!activePuzzle || puzzleTimeLimit <= 0) return;
        if (puzzleRuntime.status !== 'idle' || puzzleRuntime.timeLeft > 0) return;
        AudioService.playSfx('error');
        setPuzzleRuntime((prev) => ({ ...prev, status: 'error', statusMsg: 'TIME_EXPIRED' }));
        scheduleCallback(handlePuzzleFail, 1500);
    }, [
        activePuzzle,
        puzzleTimeLimit,
        puzzleRuntime.status,
        puzzleRuntime.timeLeft,
        handlePuzzleFail,
        scheduleCallback,
    ]);

    const handlePuzzleInputChange = useCallback((val: string) => {
        setPuzzleRuntime((prev) => (prev.status !== 'idle' ? prev : { ...prev, input: val }));
    }, []);

    const handlePuzzleOptionSelect = useCallback(
        (index: number) => {
            if (puzzleRuntime.status !== 'idle') return;
            AudioService.playSfx('ui_click');
            setPuzzleRuntime((prev) => ({ ...prev, selectedOptions: [index] }));
        },
        [puzzleRuntime.status]
    );

    const handlePuzzlePatternClick = useCallback(
        (index: number) => {
            if (puzzleRuntime.status !== 'idle' || !activePuzzle || activePuzzle.body.type !== 'cloze') {
                return;
            }
            if (!clozeBlankIndices.includes(index)) return;
            const symbols = Array.from(
                new Set(['', ...activePuzzle.body.answer.filter(Boolean).map(String)])
            );
            AudioService.playSfx('ui_click');
            setPuzzleRuntime((prev) => {
                const patternInput = [...prev.patternInput];
                const currentIndex = symbols.indexOf(patternInput[index] ?? '');
                patternInput[index] = symbols[(currentIndex + 1) % symbols.length] ?? '';
                return { ...prev, patternInput };
            });
        },
        [puzzleRuntime.status, activePuzzle, clozeBlankIndices]
    );

    const isPuzzleAnswerCorrect = useCallback((): boolean => {
        if (!activePuzzle) return false;
        const body = activePuzzle.body;
        if (body.type === 'type') {
            const solution = normalizeAnswer(body.answer);
            return solution.length > 0 && normalizeAnswer(puzzleRuntime.input) === solution;
        }
        if (body.type === 'choice') {
            const selectedIndex = puzzleRuntime.selectedOptions[0];
            if (selectedIndex === undefined) return false;
            return normalizeAnswer(body.body[selectedIndex] ?? '') === normalizeAnswer(body.answer);
        }
        if (body.type === 'cloze') {
            const expected = body.answer.map(normalizeAnswer);
            return (
                expected.length === clozeBlankIndices.length &&
                clozeBlankIndices.every(
                    (cellIndex, blankIndex) =>
                        normalizeAnswer(puzzleRuntime.patternInput[cellIndex] ?? '') === expected[blankIndex]
                )
            );
        }
        return false;
    }, [
        activePuzzle,
        puzzleRuntime.input,
        puzzleRuntime.selectedOptions,
        puzzleRuntime.patternInput,
        clozeBlankIndices,
    ]);

    const submitActivePuzzle = useCallback(() => {
        if (!activePuzzle || puzzleRuntime.status !== 'idle') return;
        const attemptCost = safeNumber(activePuzzle.restrictions?.timeCostPerAttempt);
        if (attemptCost > 0) handleGameTick(attemptCost);

        if (isPuzzleAnswerCorrect()) {
            AudioService.playSfx('unlock');
            const hasLore = Boolean(activePuzzle.lore);
            setPuzzleRuntime((prev) => ({
                ...prev,
                status: 'success',
                statusMsg: 'ACCESS_GRANTED',
                showLore: hasLore,
            }));
            scheduleCallback(handlePuzzleSolve, hasLore ? 4000 : 1200);
            return;
        }

        AudioService.playSfx('fail');
        const nextAttempts = puzzleRuntime.attempts + 1;
        setPuzzleRuntime((prev) => ({
            ...prev,
            attempts: nextAttempts,
            status: 'error',
            statusMsg: 'ACCESS_DENIED',
            isShaking: true,
        }));
        scheduleCallback(() => {
            if (nextAttempts >= activePuzzleMaxAttempts) {
                handlePuzzleFail();
            } else {
                setPuzzleRuntime((prev) => ({
                    ...prev,
                    isShaking: false,
                    status: 'idle',
                    statusMsg: 'AWAITING_INPUT',
                }));
            }
        }, 800);
    }, [
        activePuzzle,
        activePuzzleMaxAttempts,
        handleGameTick,
        handlePuzzleFail,
        handlePuzzleSolve,
        isPuzzleAnswerCorrect,
        puzzleRuntime.attempts,
        puzzleRuntime.status,
        scheduleCallback,
    ]);

    const recordHintUsed = useCallback(() => {
        if (!activePuzzleNodeId) return;
        setPuzzleStats((prev) => ({ ...prev, hints: prev.hints + 1 }));
        updatePlayer(-safeNumber(settings.gameConfig.hintCosts.sanityCost), 0);
        addLog('强制提取缓存，理智阈值下降。', 'info');
    }, [activePuzzleNodeId, updatePlayer, addLog, settings.gameConfig]);

    const handlePuzzleUseHint = useCallback(() => {
        if (puzzleRuntime.status !== 'idle') return;
        const hints = activePuzzle?.hints ?? [];
        if (puzzleRuntime.hintsUsed >= hints.length) return;
        AudioService.playSfx('typing_1');
        setPuzzleRuntime((prev) => ({ ...prev, hintsUsed: prev.hintsUsed + 1 }));
        recordHintUsed();
    }, [activePuzzle, puzzleRuntime.hintsUsed, puzzleRuntime.status, recordHintUsed]);

    const closePuzzle = useCallback(() => {
        if (!activePuzzleNodeId || puzzleRuntime.status !== 'idle') return;
        AudioService.stopMusic();
        clearPuzzleTimers();
        setActivePuzzleNodeId(null);
        setActivePuzzleInteractionIndex(null);
        addLog('中断当前例程。', 'info');
    }, [activePuzzleNodeId, puzzleRuntime.status, addLog, clearPuzzleTimers]);

    const handlePuzzleKeyDown = useCallback(
        (e: ReactKeyboardEvent) => {
            if (e.key === 'Escape') {
                closePuzzle();
                return;
            }
            if (e.key === 'Enter') submitActivePuzzle();
        },
        [closePuzzle, submitActivePuzzle]
    );

    const puzzleController = useMemo<PuzzleInteractionController>(
        () => ({
            input: puzzleRuntime.input,
            status: puzzleRuntime.status,
            statusMsg: puzzleRuntime.statusMsg,
            attempts: puzzleRuntime.attempts,
            maxAttempts: activePuzzleMaxAttempts,
            isShaking: puzzleRuntime.isShaking,
            hintsUsed: puzzleRuntime.hintsUsed,
            timeLeft: puzzleRuntime.timeLeft,
            showLore: puzzleRuntime.showLore,
            selectedOptions: puzzleRuntime.selectedOptions,
            patternInput: puzzleRuntime.patternInput,
            type: activePuzzle?.body.type ?? null,
            currentHints: activePuzzle?.hints?.slice(0, puzzleRuntime.hintsUsed) ?? [],
            handleInputChange: handlePuzzleInputChange,
            handleOptionSelect: handlePuzzleOptionSelect,
            handlePatternClick: handlePuzzlePatternClick,
            handleSubmit: submitActivePuzzle,
            handleKeyDown: handlePuzzleKeyDown,
            handleUseHint: handlePuzzleUseHint,
        }),
        [
            activePuzzle,
            activePuzzleMaxAttempts,
            puzzleRuntime,
            handlePuzzleInputChange,
            handlePuzzleOptionSelect,
            handlePuzzlePatternClick,
            handlePuzzleUseHint,
            handlePuzzleKeyDown,
            submitActivePuzzle,
        ]
    );

    // ========================================================================
    // 物品子系统
    // ========================================================================

    /**
     * 装备 / 卸下 / 替换装备。
     *
     * 数值结算严格按「溢出回收 → 旧件回收 → 新件生效」的操作序列执行，
     * 而不是把增量先合并成净额再一次性写入：0 下限夹取参与时两者不等价
     * （例：力量 3，回收 -5、生效 +5 → 逐步结算得 5，净额 0 得 3）。
     */
    const handleEquipItem = useCallback(
        (item: ItemInstance) => {
            if (!isEquipmentInstance(item)) return;
            const itemType: EquipmentSlotType = isWeaponInstance(item)
                ? 'weapon'
                : isArmorInstance(item)
                    ? 'armor'
                    : 'accessory';
            const { equipment, overflow } = normalizeEquipmentWithOverflow(
                player.dynamic.equipment,
                settings.gameConfig
            );
            const slots = getEquipmentSlots(equipment, itemType);
            const equippedIndex = slots.findIndex((entry) => entry?.instanceId === item.instanceId);

            let nextEquipment: EquipState = equipment;
            let nextInventory = player.dynamic.inventory;
            const refunds: ItemInstance[] = [];
            let equipTargetSlot: number | null = null;

            // 槽位配置调小被挤出的装备：退回背包并纳入回收队列
            if (overflow.length > 0) {
                const reclaimed = reclaimOverflowEquipments(overflow, nextInventory);
                nextInventory = reclaimed.inventory;
                refunds.push(...reclaimed.refunds);
                overflow.forEach((spilled) => {
                    addLog(`槽位压缩：${spilled.name} 退回背包`, 'warning');
                });
            }

            if (equippedIndex >= 0) {
                const equippedItem = slots[equippedIndex] ?? null;
                if (equippedItem) refunds.push(equippedItem);
                nextEquipment = unequipItem(equipment, itemType, equippedIndex);
                nextInventory = addUniqueItemToInventory(
                    nextInventory,
                    stripEquipEffectSnapshot(item)
                );
                addLog(`卸载模块: ${item.name}`, 'info');
                AudioService.playSfx('item_unequip');
            } else {
                const emptyIndex = slots.findIndex((entry) => entry === null);
                const targetSlot = emptyIndex >= 0 ? emptyIndex : slots.length - 1;
                if (targetSlot < 0) {
                    addLog('无可用装备槽位。', 'warning');
                    AudioService.playSfx('error');
                    return;
                }
                const oldItem = slots[targetSlot] ?? null;
                if (oldItem) refunds.push(oldItem);
                nextEquipment = equipItem(equipment, item, itemType, targetSlot);
                nextInventory = removeItemFromInventory(nextInventory, item.instanceId);
                if (oldItem) {
                    nextInventory = addUniqueItemToInventory(
                        nextInventory,
                        stripEquipEffectSnapshot(oldItem)
                    );
                }
                addLog(
                    oldItem ? `覆盖挂载 ${oldItem.name} → ${item.name}` : `挂载模块: ${item.name}`,
                    'info'
                );
                AudioService.playSfx('item_equip');
                equipTargetSlot = targetSlot;
            }

            const applyOps = (
                dynamic: BaseDynamicState & Record<AttributeType, number>,
                captureEquipSnapshot: boolean
            ): EffectDeltas => {
                refunds.forEach((refundItem) => {
                    applyEffectDeltas(
                        dynamic,
                        negateEffectDeltas(getAppliedAccessoryDeltas(refundItem))
                    );
                });
                if (!isAccessoryInstance(item) || equipTargetSlot === null) return {};

                const itemDeltas = collectAccessoryEffects(item);
                if (!captureEquipSnapshot) {
                    applyEffectDeltas(dynamic, itemDeltas);
                    return {};
                }
                return applyEffectDeltasWithSnapshot(dynamic, itemDeltas);
            };

            // 先在同源副本上试算，落定新饰品「实际生效」的增量快照
            // （即使实际生效为 0 也要落快照：卸下时据此精确回收，而非回退模板值）
            if (isAccessoryInstance(item) && equipTargetSlot !== null) {
                const probe = {
                    ...player.dynamic,
                    equipment: nextEquipment,
                    inventory: nextInventory,
                };
                const applied = applyOps(probe, true);
                nextEquipment = writeEquipEffectSnapshot(
                    nextEquipment,
                    itemType,
                    equipTargetSlot,
                    applied
                );
            }

            setPlayer((prev) => {
                const nextDynamic = {
                    ...prev.dynamic,
                    equipment: nextEquipment,
                    inventory: nextInventory,
                };
                applyOps(nextDynamic, false);
                clampDynamicVitals(nextDynamic);
                return { ...prev, dynamic: nextDynamic };
            });
        },
        [addLog, player.dynamic, setPlayer, settings]
    );

    const handleDiscardItem = useCallback(
        (item: ItemInstance) => {
            const { equipment, overflow } = normalizeEquipmentWithOverflow(
                player.dynamic.equipment,
                settings.gameConfig
            );
            let nextEquipment: EquipState = equipment;
            let nextInventory = player.dynamic.inventory;
            const refunds: ItemInstance[] = [];

            if (overflow.length > 0) {
                const reclaimed = reclaimOverflowEquipments(overflow, nextInventory);
                nextInventory = reclaimed.inventory;
                refunds.push(...reclaimed.refunds);
                overflow.forEach((spilled) => {
                    addLog(`槽位压缩：${spilled.name} 退回背包`, 'warning');
                });
            }

            if (isEquipmentInstance(item)) {
                const itemType: EquipmentSlotType = isWeaponInstance(item)
                    ? 'weapon'
                    : isArmorInstance(item)
                        ? 'armor'
                        : 'accessory';
                const itemSlots = getEquipmentSlots(equipment, itemType);
                const slotIndex = itemSlots.findIndex(
                    (entry) => entry?.instanceId === item.instanceId
                );
                if (slotIndex !== -1) {
                    const equippedItem = itemSlots[slotIndex] ?? null;
                    if (equippedItem) refunds.push(equippedItem);
                    nextEquipment = unequipItem(equipment, itemType, slotIndex);
                }
            }

            nextInventory = removeItemFromInventory(nextInventory, item.instanceId);
            AudioService.playSfx('item_break');
            addLog(`剔除资产: ${item.name}`, 'info');

            setPlayer((prev) => {
                const nextDynamic = {
                    ...prev.dynamic,
                    equipment: nextEquipment,
                    inventory: nextInventory,
                };
                refunds.forEach((refundItem) => {
                    applyEffectDeltas(
                        nextDynamic,
                        negateEffectDeltas(getAppliedAccessoryDeltas(refundItem))
                    );
                });
                clampDynamicVitals(nextDynamic);
                return { ...prev, dynamic: nextDynamic };
            });
        },
        [setPlayer, addLog, player.dynamic, settings]
    );

    //-------------------------------------------------------------------------
    // 背包网格结算
    //-------------------------------------------------------------------------

    const gridSize = useMemo(
        () =>
            getBackpackGridSize({
                strength: player.dynamic.strength,
                storageSize: player.dynamic.storageSize,
            }),
        [player.dynamic.strength, player.dynamic.storageSize]
    );

    const gridLayout = useMemo(
        () => resolveGridPlacements(player.dynamic.inventory, gridSize),
        [player.dynamic.inventory, gridSize]
    );

    const gridTiles = useMemo<InventoryGridTile[]>(() => {
        const tiles: InventoryGridTile[] = [];

        player.dynamic.inventory.forEach((item) => {
            const placement = gridLayout.placements[item.instanceId];
            if (!placement) return;

            const rotated = placement.rotated === true;
            const [width, height] = getItemGridFootprint(item, rotated);

            tiles.push({
                item,
                x: placement.x,
                y: placement.y,
                width,
                height,
                rotated,
            });
        });

        return tiles;
    }, [player.dynamic.inventory, gridLayout]);

    /**
     * 提交落位表
     *
     * 补丁式写入而非整份背包覆盖：界面渲染与玩家操作之间可能隔着一次拾取或消耗，
     * 整份覆盖会把已经消耗掉的物品复活。
     */
    const commitGridPlacements = useCallback(
        (placements: GridPlacementMap | null): boolean => {
            if (!placements) return false;

            setPlayer((prev) => {
                const nextInventory = applyGridPlacements(
                    prev.dynamic.inventory,
                    placements
                );
                if (nextInventory === prev.dynamic.inventory) return prev;

                return {
                    ...prev,
                    dynamic: { ...prev.dynamic, inventory: nextInventory },
                };
            });

            return true;
        },
        [setPlayer]
    );

    const inventoryGrid = useMemo<InventoryGridReturn>(
        () => ({
            size: gridSize,
            tiles: gridTiles,
            overflow: gridLayout.overflow,
            usedCells: gridLayout.usedCells,
            totalCells: gridLayout.totalCells,
            moveItem: (instanceId, x, y) =>
                commitGridPlacements(
                    tryMoveGrid(
                        player.dynamic.inventory,
                        gridLayout.placements,
                        gridSize,
                        instanceId,
                        x,
                        y
                    )
                ),
            canPlace: (instanceId, x, y) =>
                tryMoveGrid(
                    player.dynamic.inventory,
                    gridLayout.placements,
                    gridSize,
                    instanceId,
                    x,
                    y
                ) !== null,
            canFit: (item) =>
                canFitGridItem(
                    player.dynamic.inventory,
                    gridLayout.placements,
                    gridSize,
                    item
                ),
            rotateItem: (instanceId) =>
                commitGridPlacements(
                    tryRotateGrid(
                        player.dynamic.inventory,
                        gridLayout.placements,
                        gridSize,
                        instanceId
                    )
                ),
            autoArrange: () => {
                commitGridPlacements(
                    arrangeGridPlacements(player.dynamic.inventory, gridSize)
                );
            },
        }),
        [
            commitGridPlacements,
            gridLayout,
            gridSize,
            gridTiles,
            player.dynamic.inventory,
        ]
    );

    const handleUseItem = useCallback(
        async (item: ItemInstance, npc?: InteractionNpcEntity) => {
            // 优先作为交互钥匙消费
            const node = getCurrentNode();
            const interactionIndex =
                node?.interactions?.findIndex((interaction) =>
                    interaction.requirements?.items?.includes(item.id)
                ) ?? -1;
            if (node && interactionIndex >= 0) {
                executeInteraction(interactionIndex, false);
                return;
            }

            if (isEquipmentInstance(item)) {
                handleEquipItem(item);
                return;
            }

            if (isConsumableInstance(item)) {
                if (npc) {
                    addLog(`注入目标 ${npc.static.name}: ${item.name}`, 'command');
                    const sanityDelta = safeNumber(getEffectValueByType(item, 'sanity'));
                    const hpDelta = safeNumber(getEffectValueByType(item, 'hp'));
                    if (sanityDelta) {
                        addLog(
                            `节点同步: 理智 ${sanityDelta >= 0 ? '恢复 +' : '损失 '}${sanityDelta}`,
                            sanityDelta >= 0 ? 'success' : 'warning'
                        );
                    }
                    if (hpDelta) {
                        addLog(
                            `节点同步: 生命 ${hpDelta >= 0 ? '恢复 +' : '损失 '}${hpDelta}`,
                            hpDelta >= 0 ? 'success' : 'warning'
                        );
                    }
                    updateCompanion(npc.static.id, sanityDelta, hpDelta);
                    AudioService.playSfx('item_use');
                    setPlayer((prev) => ({
                        ...prev,
                        dynamic: {
                            ...prev.dynamic,
                            inventory: removeItemFromInventory(prev.dynamic.inventory, item.instanceId),
                        },
                    }));
                    return;
                }

                addLog(`初始化指令: ${item.name}`, 'command');
                const result = applyConsumableEffects(item, player);
                result.effectsApplied.forEach(({ type, value }) => {
                    addLog(`参数覆写 [${type}]: ${value >= 0 ? '+' : ''}${value}`, 'success');
                });
                setPlayer((prev) => {
                    const nextDynamic = { ...prev.dynamic };
                    applyAttributeUpdates(nextDynamic, result.attributeUpdates);
                    applyVitalUpdates(nextDynamic, result.vitalUpdates);
                    nextDynamic.stamina = clamp(
                        nextDynamic.stamina + result.staminaDelta,
                        0,
                        nextDynamic.maxStamina
                    );
                    nextDynamic.vigor = clamp(nextDynamic.vigor + result.vigorDelta, 0, nextDynamic.maxVigor);
                    nextDynamic.inventory = removeItemFromInventory(nextDynamic.inventory, item.instanceId);
                    clampDynamicVitals(nextDynamic);
                    return {
                        ...prev,
                        dynamic: nextDynamic,
                        neuralLink: { ...prev.neuralLink, ...result.neuralLinkUpdates },
                    };
                });
                if (result.hpDelta !== 0 || result.sanityDelta !== 0) {
                    updatePlayer(result.sanityDelta, result.hpDelta);
                }
                AudioService.playSfx('item_use');
                return;
            }

            if (isDataInstance(item)) {
                if (item.audioScript || item.audioUrl) {
                    setLoadingAudioId(item.instanceId);
                    try {
                        const updated = await handleAudioItem(item, currentZone, settings, addLog, currentNodeId);
                        if (updated.audioUrl !== item.audioUrl) {
                            setPlayer((prev) => ({
                                ...prev,
                                dynamic: {
                                    ...prev.dynamic,
                                    inventory: prev.dynamic.inventory.map((entry) =>
                                        entry.instanceId === item.instanceId ? updated : entry
                                    ),
                                },
                            }));
                        }
                    } finally {
                        setLoadingAudioId(null);
                    }
                    return;
                }
                addLog(`提取明文: ${item.name}`, 'command');
                addLog(item.desc, 'info');
                if (item.documentContent) {
                    addLog(`>>> ${item.name} <<<`, 'loot');
                    addLog(item.documentContent, 'info');
                }
                AudioService.playSfx('ui_transition');
                return;
            }

            addLog(`静态审查: ${item.name}`, 'info');
            addLog(item.desc, 'info');
            AudioService.playSfx('ui_click');
        },
        [
            getCurrentNode,
            player,
            currentZone,
            settings,
            executeInteraction,
            handleEquipItem,
            updatePlayer,
            setPlayer,
            currentNodeId,
            addLog,
            updateCompanion,
        ]
    );

    return {
        getCurrentNode,
        handleLocalMove,
        handleSearch,
        handleInteraction,
        activePuzzleNodeId,
        setActivePuzzleNodeId,
        activePuzzleInteractionIndex,
        setActivePuzzleInteractionIndex,
        getActivePuzzle,
        handlePuzzleSolve,
        handlePuzzleFail,
        recordHintUsed,
        closePuzzle,
        puzzleStats,
        puzzleController,
        handleUseItem,
        handleEquipItem,
        handleDiscardItem,
        inventoryGrid,
        loadingAudioId,
    };
};