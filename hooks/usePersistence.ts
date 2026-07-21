import { useCallback } from 'react';
import {
    LogType,
    Dialogue,
    GameStateData,
    GameStateUpdaters,
    performStateRestoration,
    safeDeepClone,
} from '../meta';
import { PersistenceService, AudioService, AiService } from '../services';

interface UsePersistenceParams {
    gameStateData: GameStateData;
    updaters: GameStateUpdaters;
    addLog: (text: string, type: LogType) => void;
}

interface UsePersistenceReturn {
    handleSaveGame: (saveName?: string) => Promise<string | null>;
    handleLoadGame: (fileName: string) => Promise<boolean>;
    handleListSaves: () => Promise<Array<{ name: string; size: number; modified: Date }>>;
    handleDeleteSave: (fileName: string) => Promise<boolean>;
    handleInitChroma: (persistDir?: string) => Promise<boolean>;
    handleAddDialogue: (npcId: string, dialogue: Dialogue, startIndex: number) => Promise<void>;
    handleSemanticSearch: (npcId: string, query: string, topK?: number) => Promise<Array<{ text: string; speaker: string; timestamp: number; distance: number }>>;
    handleAddSummary: (npcId: string, summary: string, startIndex: number, endIndex: number) => Promise<void>;
    handleSearchSummaries: (npcId: string, query: string, topK?: number) => Promise<Array<{ summary: string; startIndex: number; endIndex: number }>>;
    handleClearNpcHistory: (npcId: string) => Promise<void>;
}

/**
 * 持久化与存储控制钩子
 * 处理游戏存档读写、配置同步以及基于向量数据库的语义记忆管理
 */
export const usePersistence = ({
    gameStateData,
    updaters,
    addLog
}: UsePersistenceParams): UsePersistenceReturn => {
    const { player, settings, gameState, currentZone } = gameStateData;

    /**
     * 保存当前游戏进度
     * 流程：克隆状态 -> 调用服务持久化 -> 反馈结果
     */
    const handleSaveGame = useCallback(async (saveName?: string): Promise<string | null> => {
        try {
            if (!player || !currentZone) {
                addLog("保存失败：当前实体或区域数据不完整，无法建立索引。", "critical");
                return null;
            }

            // 执行深拷贝切断内存引用，防止序列化过程中的对象变异
            const baseSaveData: GameStateData = {
                player: safeDeepClone(player),
                settings: safeDeepClone(settings),
                gameState,
                currentZone: safeDeepClone(currentZone),
            };

            const fileName = await PersistenceService.saveGame(saveName || null, baseSaveData);

            if (fileName) {
                addLog(`系统：存档同步成功 [${fileName}]`, "success");
                AudioService.playSfx('success');
                return fileName;
            } else {
                addLog("警告：底层文件系统返回写入异常。", "warning");
                return null;
            }
        } catch (error) {
            addLog("致命：持久化指令执行异常。", "critical");
            console.error("[Persistence] Save error:", error);
            return null;
        }
    }, [player, settings, gameState, currentZone, addLog]);

    /**
     * 加载指定存档
     * 流程：初始化音频上下文 -> 读取文件 -> 校验数据 -> 批量恢复状态
     */
    const handleLoadGame = useCallback(async (fileName: string): Promise<boolean> => {
        try {
            // 预热音频系统 (防止现代浏览器策略阻塞)
            await AudioService.init();

            const saveData = await PersistenceService.loadGame(fileName);

            if (!saveData) {
                addLog("加载失败：存档文件损坏或拒绝访问。", "critical");
                return false;
            }

            // 执行状态重置
            performStateRestoration(saveData, updaters);

            addLog(`系统：数据链路重连成功 [${fileName}]`, "success");
            AudioService.playSfx('success');

            return true;
        } catch (error) {
            addLog("错误：状态恢复过程中发生逻辑冲突。", "critical");
            console.error("[Persistence] Load error:", error);
            return false;
        }
    }, [updaters, addLog]);

    /**
     * 获取所有可用存档列表
     */
    const handleListSaves = useCallback(async () => {
        return await PersistenceService.listSaves();
    }, []);

    /**
     * 删除指定存档文件
     */
    const handleDeleteSave = useCallback(async (fileName: string): Promise<boolean> => {
        if (!fileName.trim()) return false;

        const success = await PersistenceService.deleteSave(fileName);
        if (success) {
            addLog(`系统：已移除过期数据记录 [${fileName}]`, "info");
        }
        return success;
    }, [addLog]);

    /**
     * 初始化向量数据库 (ChromaDB)
     */
    const handleInitChroma = useCallback(async (persistDir?: string): Promise<boolean> => {
        return await PersistenceService.initChroma(persistDir);
    }, []);

    /**
     * 存储对话数据至向量空间
     * 用于 NPC 的长期语义记忆构建
     */
    const handleAddDialogue = useCallback(async (
        npcId: string,
        dialogue: Dialogue,
        startIndex: number
    ): Promise<void> => {
        // 过滤空对话并构建处理块 (处理 [PlayerWords, NpcWords] 元组)
        const chunks: any[] = [];
        dialogue.dialogue.forEach(([pWords, nWords], idx) => {
            const dialogueIdx = startIndex + idx;
            if (pWords) {
                chunks.push({
                    id: `${npcId}_p_${dialogueIdx}`,
                    text: pWords.text,
                    speaker: 'player',
                    timestamp: player.currentRealTime.getTime(),
                    dialogueIndex: dialogueIdx
                });
            }
            if (nWords) {
                chunks.push({
                    id: `${npcId}_n_${dialogueIdx}`,
                    text: nWords.text,
                    speaker: 'npc',
                    timestamp: player.currentRealTime.getTime(),
                    dialogueIndex: dialogueIdx
                });
            }
        });

        if (chunks.length === 0) return;

        try {
            const embeddings = await AiService.generateEmbeddings(
                settings,
                chunks.map(c => c.text)
            );

            await PersistenceService.storeEmbeddings(
                'dialogues',
                chunks.map(c => c.id),
                embeddings,
                chunks.map(c => c.text),
                chunks.map(c => ({
                    speaker: c.speaker,
                    timestamp: c.timestamp,
                    npcId,
                    dialogueIndex: c.dialogueIndex
                }))
            );
        } catch (error) {
            console.error('[Persistence] Dialogue vectorization failed:', error);
        }
    }, [settings, player.currentRealTime]);

    /**
     * 语义检索对话历史
     */
    const handleSemanticSearch = useCallback(async (
        npcId: string,
        query: string,
        topK: number = 3
    ): Promise<Array<{ text: string; speaker: string; timestamp: number; distance: number }>> => {
        try {
            const queryEmbedding = await AiService.generateEmbedding(settings, query);
            const results = await PersistenceService.searchEmbeddings(
                'dialogues',
                [queryEmbedding],
                topK,
                { npcId }
            );

            if (!results?.documents?.[0]) return [];

            return results.documents[0].map((doc, idx) => ({
                text: doc || "",
                speaker: results.metadatas?.[0]?.[idx]?.speaker ?? 'unknown',
                timestamp: results.metadatas?.[0]?.[idx]?.timestamp ?? 0,
                distance: results.distances?.[0]?.[idx] ?? 0
            }));
        } catch (error) {
            console.error('[Persistence] Semantic search exception:', error);
            return [];
        }
    }, [settings]);

    /**
     * 存储剧情摘要至向量空间
     */
    const handleAddSummary = useCallback(async (
        npcId: string,
        summary: string,
        startIndex: number,
        endIndex: number
    ): Promise<void> => {
        try {
            const summaryId = `summary_${npcId}_${startIndex}_${endIndex}_${Date.now()}`;
            const embedding = await AiService.generateEmbedding(settings, summary);

            await PersistenceService.storeEmbeddings(
                'summaries',
                [summaryId],
                [embedding],
                [summary],
                [{ npcId, startIndex, endIndex, timestamp: Date.now() }]
            );
        } catch (error) {
            console.error('[Persistence] Summary storage failed:', error);
        }
    }, [settings]);

    /**
     * 语义检索剧情摘要
     */
    const handleSearchSummaries = useCallback(async (
        npcId: string,
        query: string,
        topK: number = 2
    ): Promise<Array<{ summary: string; startIndex: number; endIndex: number }>> => {
        try {
            const queryEmbedding = await AiService.generateEmbedding(settings, query);
            const results = await PersistenceService.searchEmbeddings(
                'summaries',
                [queryEmbedding],
                topK,
                { npcId }
            );

            if (!results?.documents?.[0]) return [];

            return results.documents[0].map((doc, idx) => ({
                summary: doc || "",
                startIndex: results.metadatas?.[0]?.[idx]?.startIndex ?? 0,
                endIndex: results.metadatas?.[0]?.[idx]?.endIndex ?? 0
            }));
        } catch (error) {
            console.error('[Persistence] Summary search failure:', error);
            return [];
        }
    }, [settings]);

    /**
     * 清理特定 NPC 的所有向量历史（重置记忆）
     */
    const handleClearNpcHistory = useCallback(async (npcId: string): Promise<void> => {
        try {
            await PersistenceService.deleteEmbeddings('dialogues', undefined, { npcId });
            await PersistenceService.deleteEmbeddings('summaries', undefined, { npcId });
            addLog(`系统：NPC [${npcId}] 的神经记忆链路已切断。`, "info");
        } catch (error) {
            console.error('[Persistence] Memory wipe failed:', error);
        }
    }, [addLog]);

    return {
        handleSaveGame,
        handleLoadGame,
        handleListSaves,
        handleDeleteSave,
        handleInitChroma,
        handleAddDialogue,
        handleSemanticSearch,
        handleAddSummary,
        handleSearchSummaries,
        handleClearNpcHistory
    };
};