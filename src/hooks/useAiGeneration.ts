import { useCallback, useRef } from 'react';
import {
    Zone, PlayerState, Settings, ZoneGenerationContext, ChainGenerationContext, EpisodicGenerationContext,
    ItemInstance, initializeZoneRuntime, Node, LogType, DyGenerationContext, buildZoneGenerationContext,
    InteractionNpcEntity, CurrentLocation
} from '../meta';
import { AiService, AudioService, ChainNarrativeService, DynamicNarrativeService, PersistenceService } from '../services';

interface UseAiGenerationParams {
    player: PlayerState;
    currentZone: Zone;
    settings: Settings;
    addLog: (text: string, type: LogType) => void;
    setLoadingStatus: (status: string) => void;
    handleAsyncError: (error: unknown, context: string) => void;
}

interface UseAiGenerationReturn {
    generateNewDy: (playerState: PlayerState, currentNode: Node | null, currentNodeKey: string) => Promise<string | undefined>;
    generateNewZone: (params?: ZoneGenerationContext) => Promise<Zone | null>;
    handleAutoGeneration: (zone: Zone, options?: { images?: boolean; videos?: boolean; audios?: boolean }) => Promise<Zone>;
    generateNewAsset: (
        mediaType: 'image' | 'video',
        type: 'scene' | 'enemy' | 'npc' | 'player',
        obj?: { name: string; id?: string; visualPrompt?: string; desc?: string; }
    ) => Promise<string | undefined>;
    generateNewNPCReaction: (
        npc: InteractionNpcEntity,
        location: CurrentLocation,
        eventDesc: string
    ) => Promise<{ content: string; isAction: boolean } | null>;
}

const createMediaContext = (zoneId: string, nodeId: string, zoneName: string, nodeName: string, entityName?: string) =>
    ({ zoneId, nodeId, zoneName, nodeName, entityName });

const createVisualPrompt = (visualStyle: string, nodeName: string, visualPrompt?: string, desc?: string) =>
    `Art Style: ${visualStyle}. Subject: ${nodeName}. desc: ${visualPrompt || desc}`;

/**
 * 安全解析 LLM 返回的区域 JSON：
 * 1) 剥离 ```json ... ``` / ``` ... ``` markdown 围栏；
 * 2) 首个解析失败时容错修复尾逗号（LLM 高频输出）。
 */
const parseZoneJson = (text: string): unknown => {
    let content = String(text ?? '').trim();
    const fence = content.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/);
    if (fence) content = fence[1].trim();

    try {
        return JSON.parse(content);
    } catch {
        const fixed = content
            .replace(/,(\s*[}\]])/g, '$1') // 删除尾逗号
            .replace(/,\s*([}\]])/g, '$1'); // 两次覆盖嵌套尾逗号
        return JSON.parse(fixed);
    }
};


export const useAiGeneration = ({
    player,
    currentZone,
    settings,
    addLog,
    setLoadingStatus,
    handleAsyncError,
}: UseAiGenerationParams): UseAiGenerationReturn => {

    // 内部状态指针，负责防抖、限流及生命周期请求阻断
    const lastTriggerTimeRef = useRef<number>(0);
    const lastNodeKeyRef = useRef<string | null>(null);
    const isGeneratingDyRef = useRef<boolean>(false);
    const generatingAssetKeysRef = useRef<Set<string>>(new Set());
    const dySessionRef = useRef<string>('');
    const lastPlayerStateRef = useRef<PlayerState | null>(null);

    /**
     * 动态叙事生成器
     * 基于玩家生存指标、位置迁移状态与时空上下文，触发大模型环境认知更新。
     */
    const generateNewDy = useCallback(async (
        playerState: PlayerState,
        currentNode: Node | null,
        currentNodeKey: string
    ): Promise<string | undefined> => {
        if (!currentNode || isGeneratingDyRef.current) return undefined;

        const now = Date.now();
        const isNodeChanged = currentNodeKey !== lastNodeKeyRef.current;
        const timeSinceLastTrigger = now - lastTriggerTimeRef.current;
        // 阈值冷却：最小触发间隔 30000 毫秒
        const MIN_TRIGGER_INTERVAL = 30000;

        // 若未发生物理位置移动，仅当核心生存状态发生剧烈变动时强制击穿冷却期
        if (!isNodeChanged) {
            if (timeSinceLastTrigger < MIN_TRIGGER_INTERVAL) return undefined;

            if (lastPlayerStateRef.current) {
                // 基于最新元契约，直接通过运行时 dynamic 容器抽取核心生存边界
                const maxHp = playerState.dynamic.maxHp;
                const currentHpPercent = maxHp > 0 ? (playerState.dynamic.hp / maxHp) * 100 : 0;

                const maxSanity = playerState.dynamic.maxSanity;
                const currentSanityPercent = maxSanity > 0 ? (playerState.dynamic.sanity / maxSanity) * 100 : 0;

                const lastMaxHp = lastPlayerStateRef.current.dynamic.maxHp;
                const lastHpPercent = lastMaxHp > 0 ? (lastPlayerStateRef.current.dynamic.hp / lastMaxHp) * 100 : 0;

                const lastMaxSanity = lastPlayerStateRef.current.dynamic.maxSanity;
                const lastSanityPercent = lastMaxSanity > 0 ? (lastPlayerStateRef.current.dynamic.sanity / lastMaxSanity) * 100 : 0;

                const hpChange = Math.abs(currentHpPercent - lastHpPercent);
                const sanityChange = Math.abs(currentSanityPercent - lastSanityPercent);

                // 生存指标波动不足 10% 时拦截重组请求
                if (hpChange < 10 && sanityChange < 10) return undefined;
            }
        }

        const directives = DynamicNarrativeService.generateDyDirectives(playerState);
        const context: DyGenerationContext = {
            location: playerState.location,
            directives
        };


        isGeneratingDyRef.current = true;
        lastTriggerTimeRef.current = now;
        lastNodeKeyRef.current = currentNodeKey;
        lastPlayerStateRef.current = playerState;

        // 会话 token：provider 层不接受 abort signal（网络请求无法真正中断），
        // 旧请求在玩家切换节点后仍可能返回——用 token 比对丢弃过期结果，
        // 避免旧区叙事串到新节点。
        const sessionKey = `${currentNodeKey}_${now}`;
        dySessionRef.current = sessionKey;

        try {
            const narrative = await AiService.generateDyNarrative(settings, context);

            if (dySessionRef.current === sessionKey && narrative) {
                return narrative;
            }
        } catch (error: unknown) {
            console.warn('[系统] 动态叙事生成异常，回退原生节点描述:', error);
        } finally {
            if (dySessionRef.current === sessionKey) {
                isGeneratingDyRef.current = false;
            }
        }
        return undefined;
    }, [settings]);

    /**
     * 区域宏观生成器
     * 联合叙事引擎产出包含拓扑节点、遭遇、伏笔的完整区域树状数据结构。
     */
    const generateNewZone = useCallback(async (params?: ZoneGenerationContext): Promise<Zone | null> => {
        setLoadingStatus("INITIALIZING_CONTEXT...");

        let genContext: ZoneGenerationContext;

        if (params) {
            genContext = params;
        } else if (player.activeArc?.config) {
            // 依赖全局服务解耦构建上下文
            const analysis = ChainNarrativeService.analyzeChainNarrative(player);
            genContext = buildZoneGenerationContext(player.activeArc.config, player, analysis);
        } else {
            throw new Error('[状态越界] 缺失有效的叙事配置上下文');
        }

        setLoadingStatus("GENERATING_NEURAL_PROFILE...");

        if (genContext.base.mode.id === 'chain') {
            const chainContext = genContext as ChainGenerationContext;
            const engineParams = chainContext.params.params;
            const engineReturn = chainContext.params.output;

            addLog(`[叙事引擎] 区域规模: ${engineReturn.nodeToGenerate} 节点 | 阶段: ${engineParams.progress.macro}`, "command");
            if (engineReturn.ppToGenerate.m > 0 || engineReturn.ppToGenerate.s > 0) {
                addLog(`[叙事引擎] 执行线索编织 (主线: ${engineReturn.ppToGenerate.m}, 支线: ${engineReturn.ppToGenerate.s})`, "ai-gen");
            }
            if (engineReturn.ppToSolve > 0) {
                addLog(`[叙事引擎] 启动收束协议 (解答指标: ${engineReturn.ppToSolve})`, "ai-gen");
            }
            if (engineParams.tension > 700) {
                addLog(`[叙事引擎] 警告：张力参数超出安全阈值 (${(engineParams.tension / 10).toFixed(0)}%)`, "critical");
            }
        } else {
            const episodicContext = genContext as EpisodicGenerationContext;
            addLog(`[单元剧] 区域规模: ${episodicContext.params.nodeToGenerate} 节点`, "command");
            addLog(`[单元剧] 张力设定: ${(episodicContext.params.tension / 10).toFixed(0)}%`, "info");
        }

        setLoadingStatus("ESTABLISHING_NEURAL_UPLINK...");

        // 区域生成不设超时：LLM 长文生成耗时 3-5 分钟以上属常态，
        // 掐断请求会直接丢弃一次已完成的推演（失败回滚由 proceedToNextZone 的 catch 负责）。
        const result = (await AiService.generateZone(
            settings,
            genContext,
            setLoadingStatus
        )) as { text: string; thought?: string };

        try {
            const rawZone = parseZoneJson(result.text) as Record<string, any>;

            if (Array.isArray(rawZone.nodes)) {
                const normalizedNodes: Record<string, any> = {};
                for (const node of rawZone.nodes) {
                    if (node && node.id) {
                        normalizedNodes[node.id] = node;
                    }
                }
                rawZone.nodes = normalizedNodes;
            }

            // 强制应用父子拓扑校验与运行时环境初始化
            const newZone = initializeZoneRuntime(rawZone as Zone) as Zone;

            if (newZone && PersistenceService.isReady) {
                try {
                    const isChain = genContext.base.mode.id === 'chain';
                    const chainCtx = isChain ? (genContext as ChainGenerationContext) : undefined;
                    const arcId = isChain
                        ? (player.activeArc?.id || `${chainCtx?.base.theme.id}_${chainCtx?.base.motif?.id ?? 'nomotif'}_${chainCtx?.base.mainAxis?.id ?? 'noaxis'}`)
                        : undefined;
                    const expectedIndex = isChain
                        ? (player.activeArc?.currentIndex || 0) + 1
                        : undefined;

                    const saveResult = await PersistenceService.saveZone(
                        newZone,
                        genContext.base.mode.id as 'chain' | 'episodic',
                        arcId,
                        expectedIndex
                    );
                    const savedIndex = saveResult.index ?? expectedIndex;
                    const modeText = isChain ? `叙事链[${arcId}][#${savedIndex}]` : '单元剧';
                    addLog(`[系统] 区域数据已写入底层存储 (${modeText}): ${newZone.id}`, "success");
                } catch (e: unknown) {
                    addLog(`[系统] 区域数据存档失败: ${e}`, "warning");
                }
            }
            return newZone;
        } catch (e: unknown) {
            const debugFileName = `failed_zone_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            await PersistenceService.saveRawLog(debugFileName, result.text);
            addLog(`[系统] 序列化断言失败。原内容已转储至 [logs/${debugFileName}]。`, "warning");
            throw new Error(`区域数据解析失败: 数据结构异常。参阅日志文件。`);
        }
    }, [player, settings, setLoadingStatus, addLog]);

    /**
     * 自动资源合成协议
     * 一次性遍历并阻塞请求新区域内的所有媒体资源完成数据水合。
     * 引擎本地决策是否生成资产，不依赖外部配置。
     */
    const handleAutoGeneration = useCallback(async (zone: Zone, options?: { images?: boolean; videos?: boolean; audios?: boolean }): Promise<Zone> => {
        // 若未提供选项则熔断进程
        if (!options || (!options.images && !options.videos && !options.audios)) {
            return zone;
        }

        addLog("[协议] 启动全区域同步生成进程", "critical");
        const nodeIds = Object.keys(zone.nodes);
        const totalNodes = nodeIds.length;
        const updatedZone = { ...zone };

        if (options.videos || options.images) {
            setLoadingStatus(options.videos ? "GENERATING_VIDEOS..." : "GENERATING_IMAGES...");
            for (let i = 0; i < totalNodes; i++) {
                const nodeId = nodeIds[i];
                const nodeTemplate = updatedZone.nodes[nodeId];
                const prompt = createVisualPrompt(zone.visualStyle, nodeTemplate.name, nodeTemplate.visualPrompt || nodeTemplate.desc);
                const progressPercent = Math.floor(((i + 1) / totalNodes) * 100);

                setLoadingStatus(`VISUAL_SYNTHESIS::${nodeTemplate.name.slice(0, 12).toUpperCase()} [${progressPercent}%]`);

                const mediaContext = createMediaContext(zone.id, nodeId, zone.name, nodeTemplate.name);

                try {
                    // 独立 if：历史实现用 else if，同时勾选时图像被视频静默吞掉。
                    if (options.videos) {
                        addLog(`[影像] (${i + 1}/${totalNodes}) 处理节点: ${nodeTemplate.name}`, "command");
                        const result = await AiService.generateVideo(settings, prompt, mediaContext);
                        if (result.url) {
                            updatedZone.nodes[nodeId].videoUrl = result.url;
                        }
                    }
                    if (options.images) {
                        addLog(`[图像] (${i + 1}/${totalNodes}) 处理节点: ${nodeTemplate.name}`, "command");
                        const result = await AiService.generateVisual(settings, prompt, 'scene', mediaContext);
                        if (result.url) {
                            updatedZone.nodes[nodeId].imageUrl = result.url;
                        }
                    }
                } catch (e: unknown) {
                    handleAsyncError(e, `${options.videos ? '影像' : '图像'}请求超时或拒绝 (${nodeTemplate.name})`);
                }
            }
        }

        if (options.audios) {
            addLog("[音频] 处理环境特征波形", "command");
            for (const nodeId of nodeIds) {
                const nodeItems = updatedZone.nodes[nodeId].items || [];
                for (const itemRef of nodeItems) {
                    const item = (Array.isArray(itemRef) ? itemRef[0] : itemRef) as ItemInstance;

                    let targetScript = "";
                    // 强制基于元契约断言提取文本载体
                    if ('audioScript' in item) {
                        targetScript = (item as { audioScript: string }).audioScript;
                    } else if (item.type === 'data' && 'documentContent' in item) {
                        targetScript = (item as { documentContent: string }).documentContent;
                    }

                    if (targetScript) {
                        setLoadingStatus(`AUDIO_DECRYPTION::${item.name?.substring(0, 10) || 'UNKNOWN'}...`);

                        try {
                            const audioData = await AiService.generateSpeech(settings, targetScript, {
                                zoneId: zone.id,
                                nodeId,
                            });

                            if (audioData) {
                                item.audioUrl = audioData;
                            }
                        } catch (e: unknown) {
                            handleAsyncError(e, `音频处理异常 (${item.name || '未知物件'})`);
                        }
                    }
                }
            }
        }

        addLog("[协议] 同步进程执行完毕。", "success");
        return updatedZone;
    }, [settings, setLoadingStatus, handleAsyncError, addLog]);

    /**
     * 单例资产合成器
     * 按需生成单一媒体资产，并重定向至底层持久化挂载卷。
     */
    const generateNewAsset = useCallback(async (
        mediaType: 'image' | 'video',
        type: 'scene' | 'enemy' | 'npc' | 'player',
        obj?: { name: string; id?: string; visualPrompt?: string; desc?: string; }
    ): Promise<string | undefined> => {
        if (!obj?.id || !obj.visualPrompt) return undefined;
        const taskKey = `${mediaType}_${type}_${obj.id}`;
        if (generatingAssetKeysRef.current.has(taskKey)) return undefined;
        generatingAssetKeysRef.current.add(taskKey);

        try {
            const archiveZone = type === 'npc' || type === 'player' ? 'character'
                : type === 'enemy' ? 'enemy'
                    : currentZone.id;

            const context = createMediaContext(archiveZone, obj.id, currentZone.name, '', obj.name);

            addLog(`[系统] 初始化资源合成序列: ${obj.name || type}`, "ai-gen");
            AudioService.playSfx('ui_notification');

            const result = mediaType === 'image'
                ? await AiService.generateVisual(settings, obj.visualPrompt, type, context)
                : await AiService.generateVideo(settings, obj.visualPrompt, context);

            if (result.url) {
                addLog(`[系统] 资源合成并挂载成功。`, "success");
            }

            return result.url || undefined;
        } catch (e: unknown) {
            handleAsyncError(e, mediaType === 'image' ? "图像管线崩溃" : "视频管线崩溃");
            return undefined;
        } finally {
            generatingAssetKeysRef.current.delete(taskKey);
        }
    }, [currentZone.id, currentZone.name, settings, addLog, handleAsyncError]);

    const generateNewNPCReaction = useCallback(async (
        npc: InteractionNpcEntity,
        location: CurrentLocation,
        eventDesc: string
    ): Promise<{ content: string; isAction: boolean } | null> => {
        try {
            return await AiService.generateNPCReaction(settings, npc, location, eventDesc);
        } catch (error) {
            console.warn(`[系统异常] 同伴 ${npc.static.name} 反应生成失败:`, error);
            return null;
        }
    }, [settings]);

    return {
        generateNewDy,
        generateNewZone,
        handleAutoGeneration,
        generateNewAsset,
        generateNewNPCReaction
    }
}