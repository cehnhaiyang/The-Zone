import { useCallback, useEffect, useMemo, useState } from 'react';
import { GameState, isSanctuary, mergeDeep, safeDeepClone } from '../meta';
import type {
    GameStateData,
    GameStateUpdaters,
    LogType,
    PlayerState,
    Settings,
    SoundType,
    Zone,
} from '../meta';
import { PersistenceService, PersistenceClient } from '../services';
import type { SaveFileInfo } from '../services';

//=============================================================================
// 1. 状态恢复
//=============================================================================
/**
 * 可恢复的游戏状态集合。
 *
 * COMBAT / DIALOGUE 不在其中：这两类存档缺少战斗敌人/对话 NPC 的瞬态
 * 上下文，直接恢复会得到"战斗状态但无敌人 / 对话状态但无 NPC"的悬挂界面，
 * 玩家无法行动也退不出。恢复时统一收敛为 PLAYING。
 */
const RESTORABLE_GAME_STATES = new Set<GameState>([
    GameState.PLAYING,
    GameState.SANCTUARY,
    GameState.GAME_OVER,
]);

/**
 * 存档结构最小校验（运行时兜底，不依赖 schema.ts——那里是 LLM 提示词）。
 *
 * 仅校验让状态树可安全消费的关键字段；缺失/非法即拒绝灌入，
 * 避免"可解析但非法"的存档导致加载后首次行动崩溃。
 */
const validateSaveData = (data: unknown): data is GameStateData => {
    const d = data as Partial<GameStateData> | null;
    if (!d || typeof d !== 'object') return false;

    const player = d.player as Partial<PlayerState> | undefined;
    if (!player || typeof player !== 'object') return false;
    if (!player.static || typeof player.static !== 'object') return false;
    const dynamic = player.dynamic as Record<string, unknown> | undefined;
    if (!dynamic || typeof dynamic !== 'object') return false;
    if (typeof dynamic.hp !== 'number' || typeof dynamic.maxHp !== 'number') return false;
    if (typeof dynamic.sanity !== 'number' || typeof dynamic.maxSanity !== 'number') return false;

    const zone = d.currentZone as Partial<Zone> | undefined;
    if (!zone || typeof zone !== 'object') return false;
    if (typeof zone.id !== 'string') return false;
    if (!zone.nodes || typeof zone.nodes !== 'object') return false;

    return typeof d.gameState === 'number';
};

const resolveRestoredNodeId = (data: GameStateData): string => {
    const nodes: Record<string, unknown> = data.currentZone?.nodes ?? {};

    const savedNodeId = data.player?.location?.currentLocation?.node?.id;
    if (savedNodeId && nodes[savedNodeId]) return savedNodeId;

    const entranceId = data.currentZone?.entrance;
    if (entranceId && nodes[entranceId]) return entranceId;

    return Object.keys(nodes)[0] ?? '';
};

const inferRestoredGameState = (data: GameStateData): GameState => {
    if (data.gameState === GameState.GAME_OVER) return GameState.GAME_OVER;

    const currentZoneIsSanctuary = Boolean(data.currentZone && isSanctuary(data.currentZone));
    const playerSanctuaryIsSanctuary = Boolean(
        data.player?.sanctuary && isSanctuary(data.player.sanctuary)
    );

    if (currentZoneIsSanctuary || playerSanctuaryIsSanctuary) return GameState.SANCTUARY;
    if (RESTORABLE_GAME_STATES.has(data.gameState)) return data.gameState;

    return GameState.PLAYING;
};

/**
 * 执行存档状态恢复。
 *
 * 恢复顺序：
 * 1. player
 * 2. currentZone
 * 3. currentNodeId
 * 4. sanctuary
 * 5. settings
 * 6. gameState
 */
export const performStateRestoration = (
    data: GameStateData,
    updaters: GameStateUpdaters
): void => {
    const player = safeDeepClone(data.player);
    const currentZone = safeDeepClone(data.currentZone);
    const restored: GameStateData = {
        ...data,
        player,
        currentZone,
    };

    const nodeId = resolveRestoredNodeId(restored) || 'unknown';

    updaters.setPlayer(player);
    updaters.setCurrentZone(currentZone);
    updaters.setCurrentNodeId(nodeId);

    if (player.sanctuary) {
        updaters.setSanctuary(safeDeepClone(player.sanctuary));
    }

    // 注意：不恢复存档内 settings —— 存档是游戏进度快照，运行配置
    // （代理开关 / API Keys / gameConfig）不应被旧档整快照覆盖。

    updaters.setGameState(inferRestoredGameState(restored));
};

//=============================================================================
// 2. React 持久化钩子
//=============================================================================
interface UsePersistenceParams {
    gameStateData: GameStateData;
    updaters: GameStateUpdaters;
    addLog: (text: string, type: LogType) => void;

    /**
     * 可选音效播放器。
     */
    playSfx?: (sound: SoundType) => void;

    /**
     * 可选音频初始化器。
     * 用于在加载存档前预热浏览器音频上下文。
     */
    initAudio?: () => Promise<void>;
}

interface UsePersistenceReturn {
    isReady: boolean;
    initPersistence: () => Promise<boolean>;
    handleSaveGame: (saveName?: string) => Promise<string | null>;
    handleLoadGame: (fileName: string) => Promise<boolean>;
    handleListSaves: () => Promise<SaveFileInfo[]>;
    handleDeleteSave: (fileName: string) => Promise<boolean>;
    handleSaveConfig: (config?: Settings) => Promise<boolean>;
    handleLoadConfig: (apply?: boolean) => Promise<Settings | null>;

    /**
     * 完整持久化客户端。
     * 可直接调用区域、媒体、物品库、NPC 记忆等扩展能力。
     */
    persistence: PersistenceClient;
}

/**
 * 持久化与存储控制钩子。
 *
 * 处理：
 * - 游戏存档读写
 * - 本地配置同步
 * - Electron 文件系统桥接
 * - 存档状态恢复
 * - 资源与叙事持久化扩展能力透出
 */
export const usePersistence = ({
    gameStateData,
    updaters,
    addLog,
    playSfx,
    initAudio,
}: UsePersistenceParams): UsePersistenceReturn => {
    const { player, settings, gameState, currentZone } = gameStateData;

    const [isReady, setIsReady] = useState<boolean>(PersistenceService.isReady);

    useEffect(() => {
        let active = true;

        void PersistenceService.init().then((ok) => {
            if (active) setIsReady(ok);
        });

        return () => {
            active = false;
        };
    }, []);

    const initPersistence = useCallback(async (): Promise<boolean> => {
        const ok = await PersistenceService.init();
        setIsReady(ok);
        return ok;
    }, []);

    /**
     * 保存当前游戏进度。
     */
    const handleSaveGame = useCallback(
        async (saveName?: string): Promise<string | null> => {
            try {
                // 主菜单/装载中禁止保存：挂载时的默认局（空档初始玩家+初始区域）
                // 不是有效进度，写进用户槽位会覆盖真实存档。
                if (gameState === GameState.MAIN_MENU || gameState === GameState.LOADING) {
                    addLog('保存失败：当前不在可保存的游戏状态。', 'warning');
                    return null;
                }

                if (!player || !currentZone) {
                    addLog('保存失败：当前实体或区域数据不完整，无法建立索引。', 'critical');
                    return null;
                }

                const payload: GameStateData = {
                    player: safeDeepClone(player),
                    settings: safeDeepClone(settings),
                    gameState,
                    currentZone: safeDeepClone(currentZone),
                };

                const normalizedName = saveName?.trim() ? saveName.trim() : null;
                const fileName = await PersistenceService.saveGame(normalizedName, payload);

                if (!fileName) {
                    addLog('警告：底层文件系统返回写入异常。', 'warning');
                    return null;
                }

                addLog(`系统：存档同步成功 [${fileName}]`, 'success');
                playSfx?.('success');
                return fileName;
            } catch (error) {
                addLog('致命：持久化指令执行异常。', 'critical');
                console.error('[Persistence] Save error:', error);
                return null;
            }
        },
        [player, settings, gameState, currentZone, addLog, playSfx]
    );

    /**
     * 加载指定存档。
     */
    const handleLoadGame = useCallback(
        async (fileName: string): Promise<boolean> => {
            try {
                await initAudio?.().catch(() => undefined);

                const normalized = fileName.trim();
                if (!normalized) {
                    addLog('加载失败：存档名称无效。', 'warning');
                    return false;
                }

                const saveData = await PersistenceService.loadGame(normalized);
                if (!validateSaveData(saveData)) {
                    addLog('加载失败：存档文件损坏或数据结构异常。', 'critical');
                    return false;
                }

                performStateRestoration(saveData, updaters);

                addLog(`系统：数据链路重连成功 [${normalized}]`, 'success');
                playSfx?.('success');
                return true;
            } catch (error) {
                addLog('错误：状态恢复过程中发生逻辑冲突。', 'critical');
                console.error('[Persistence] Load error:', error);
                return false;
            }
        },
        [updaters, addLog, playSfx, initAudio]
    );

    /**
     * 获取所有可用存档列表。
     */
    const handleListSaves = useCallback(async (): Promise<SaveFileInfo[]> => {
        return PersistenceService.listSaves();
    }, []);

    /**
     * 删除指定存档文件。
     */
    const handleDeleteSave = useCallback(
        async (fileName: string): Promise<boolean> => {
            const normalized = fileName.trim();
            if (!normalized) return false;

            const success = await PersistenceService.deleteSave(normalized);
            if (success) {
                addLog(`系统：已移除过期数据记录 [${normalized}]`, 'info');
            } else {
                addLog('警告：删除存档失败或文件不存在。', 'warning');
            }

            return success;
        },
        [addLog]
    );

    /**
     * 保存当前或指定配置。
     */
    const handleSaveConfig = useCallback(
        async (config?: Settings): Promise<boolean> => {
            const target = safeDeepClone(config ?? settings);
            const success = await PersistenceService.saveConfig(target);

            if (success) {
                addLog('系统：配置已写入本地。', 'success');
            } else {
                addLog('警告：配置写入失败。', 'warning');
            }

            return success;
        },
        [settings, addLog]
    );

    /**
     * 读取本地配置。
     *
     * @param apply 是否立即合并进当前 Settings。
     */
    const handleLoadConfig = useCallback(
        async (apply = true): Promise<Settings | null> => {
            const config = await PersistenceService.loadConfig();

            if (!config) {
                addLog('警告：未读取到本地配置。', 'warning');
                return null;
            }

            if (apply) {
                const cloned = safeDeepClone(config);
                updaters.setSettings((prev) => mergeDeep(prev, cloned));
                addLog('系统：本地配置已同步。', 'success');
            }

            return config;
        },
        [updaters, addLog]
    );

    return useMemo(
        () => ({
            isReady,
            initPersistence,
            handleSaveGame,
            handleLoadGame,
            handleListSaves,
            handleDeleteSave,
            handleSaveConfig,
            handleLoadConfig,
            persistence: PersistenceService,
        }),
        [
            isReady,
            initPersistence,
            handleSaveGame,
            handleLoadGame,
            handleListSaves,
            handleDeleteSave,
            handleSaveConfig,
            handleLoadConfig,
        ]
    );
};
