import type {
    Dialogue,
    GameStateData,
    ItemTemplate,
    MemoryPyramid,
    NarrativeMode,
    Settings,
    ZoneTemplate,
} from '../meta';

//=============================================================================
// 1. 持久化桥接类型
//=============================================================================
export interface SaveFileInfo {
    name: string;
    size: number;
    modified: string;
}

interface RawSaveFileInfo {
    name: string;
    size?: number;
    modified?: unknown;
}

export interface NarrativeArcSummary {
    title: string;
    mainAxis: string;
    zoneCount: number;
}

export interface EpisodicZoneSummary {
    id: string;
    name: string;
    timestamp: number;
}

export interface NpcProfileMeta {
    profileId: string;
    name: string;
    lastModified: number;
    turnsCount?: number;
}

export type PersistedDialogue = Dialogue | Dialogue[];

export interface NpcMemoryRecord {
    dialogue?: PersistedDialogue;
    memory?: MemoryPyramid;
    meta?: NpcProfileMeta;
}

export type PersistenceIpc<T extends object = object> = {
    success: boolean;
    error?: string;
} & T;

export interface ArcZoneLoadResult {
    data?: ZoneTemplate;
    currentIndex?: number;
    maxIndex?: number;
}

export interface ElectronFS {
    init: () => Promise<PersistenceIpc<{ path?: string }>>;

    // 区域
    saveZone: (
        zone: ZoneTemplate,
        narrativeMode?: NarrativeMode,
        arcId?: string
    ) => Promise<PersistenceIpc>;
    listZones: () => Promise<PersistenceIpc<{ files: string[] }>>;
    loadRandomZone: () => Promise<PersistenceIpc<{ data?: ZoneTemplate }>>;

    // 叙事
    listNarrativeArcs: () => Promise<PersistenceIpc<{ arcs: NarrativeArcSummary[] }>>;
    listEpisodicZones: () => Promise<PersistenceIpc<{ zones: EpisodicZoneSummary[] }>>;
    loadArcZone: (
        arcId: string,
        zoneIndex?: number
    ) => Promise<PersistenceIpc<ArcZoneLoadResult>>;
    loadEpisodicZone: (zoneId?: string) => Promise<PersistenceIpc<{ data?: ZoneTemplate }>>;
    deleteNarrativeArc: (arcId: string) => Promise<PersistenceIpc>;
    deleteEpisodicZone: (zoneId: string) => Promise<PersistenceIpc>;

    // 图片
    saveImage: (
        zoneId: string,
        nodeId: string,
        filename: string,
        base64Data: string
    ) => Promise<PersistenceIpc>;
    hasImage: (
        zoneId: string,
        nodeId: string,
        filename: string
    ) => Promise<PersistenceIpc<{ exists: boolean }>>;
    loadImage: (
        zoneId: string,
        nodeId: string,
        filename: string
    ) => Promise<PersistenceIpc<{ data?: string }>>;
    listImages: (zoneId: string, nodeId: string) => Promise<PersistenceIpc<{ files: string[] }>>;
    getNextImageIndex: (
        zoneId: string,
        nodeId: string
    ) => Promise<PersistenceIpc<{ index: number }>>;

    // 视频
    saveVideo: (
        zoneId: string,
        nodeId: string,
        filename: string,
        videoUrl: string
    ) => Promise<PersistenceIpc>;
    hasVideo: (
        zoneId: string,
        nodeId: string,
        filename: string
    ) => Promise<PersistenceIpc<{ exists: boolean }>>;
    getVideoPath: (
        zoneId: string,
        nodeId: string,
        filename: string
    ) => Promise<PersistenceIpc<{ path?: string }>>;
    listVideos: (zoneId: string, nodeId: string) => Promise<PersistenceIpc<{ files: string[] }>>;
    getNextVideoIndex: (
        zoneId: string,
        nodeId: string
    ) => Promise<PersistenceIpc<{ index: number }>>;

    // 音频
    saveAudio: (
        zoneId: string,
        nodeId: string,
        filename: string,
        base64Data: string
    ) => Promise<PersistenceIpc>;
    loadAudio: (
        zoneId: string,
        nodeId: string,
        filename: string
    ) => Promise<PersistenceIpc<{ data?: string }>>;

    // 物品库
    saveItems: (items: ItemTemplate[]) => Promise<PersistenceIpc>;
    loadItems: () => Promise<PersistenceIpc<{ data?: ItemTemplate[] }>>;

    // 存档
    saveGame: (
        saveName: string | null,
        saveData: GameStateData
    ) => Promise<PersistenceIpc<{ fileName?: string }>>;
    listSaves: () => Promise<PersistenceIpc<{ files: RawSaveFileInfo[] }>>;
    loadGame: (fileName: string) => Promise<PersistenceIpc<{ data?: GameStateData }>>;
    deleteSave: (fileName: string) => Promise<PersistenceIpc>;

    // 配置
    saveConfig: (config: Settings) => Promise<PersistenceIpc>;
    loadConfig: () => Promise<PersistenceIpc<{ data?: Settings }>>;

    // 日志与 NPC 记忆
    saveRawLog: (filename: string, content: string) => Promise<PersistenceIpc>;
    saveNpcMemory: (
        npcName: string,
        dialogue: unknown,
        memory: unknown
    ) => Promise<PersistenceIpc>;
    loadNpcMemory: (
        npcName: string
    ) => Promise<PersistenceIpc<{ dialogue?: unknown; memory?: unknown }>>;

    // NPC 多人格 / 记忆档案
    listNpcProfiles: (
        npcName: string
    ) => Promise<PersistenceIpc<{ profiles: NpcProfileMeta[] }>>;
    saveNpcMemoryProfile: (
        npcName: string,
        profileId: string,
        dialogue: unknown,
        memory: unknown,
        metaName?: string
    ) => Promise<PersistenceIpc>;
    loadNpcMemoryProfile: (
        npcName: string,
        profileId: string
    ) => Promise<
        PersistenceIpc<{ dialogue?: unknown; memory?: unknown; meta?: NpcProfileMeta }>
    >;
    deleteNpcProfile: (npcName: string, profileId: string) => Promise<PersistenceIpc>;
}

export interface ElectronBridge {
    platform: string;
    version: string;
    fs: ElectronFS;
}

declare global {
    interface Window {
        electron?: ElectronBridge;
    }
}

//=============================================================================
// 2. 内部工具
//=============================================================================
const toIsoString = (value: unknown): string => {
    const date = value instanceof Date ? value : new Date(value as string | number);
    return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
};

//=============================================================================
// 3. 持久化客户端
//=============================================================================
export class PersistenceClient {
    private initPromise: Promise<boolean> | null = null;
    private ready = false;
    private unavailableWarned = false;

    get isReady(): boolean {
        return this.ready && typeof window !== 'undefined' && Boolean(window.electron?.fs);
    }

    private get fs(): ElectronFS | undefined {
        return typeof window === 'undefined' ? undefined : window.electron?.fs;
    }

    /**
     * 初始化文件系统连接。
     * 该操作幂等；重复调用只会复用首次初始化结果。
     */
    init(): Promise<boolean> {
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            const fs = this.fs;
            if (!fs) {
                console.warn('[Persistence] 未检测到 Electron 持久化桥接，可能运行在 Web 模式。');
                this.ready = false;
                return false;
            }

            try {
                const result = await fs.init();
                this.ready = Boolean(result?.success);

                if (this.ready) {
                    console.log('[Persistence] 文件系统已就绪:', result?.path ?? '默认路径');
                } else {
                    console.error('[Persistence] 文件系统初始化失败:', result?.error ?? '未知错误');
                }

                return this.ready;
            } catch (error) {
                console.error('[Persistence] 文件系统初始化异常:', error);
                this.ready = false;
                return false;
            }
        })();

        return this.initPromise;
    }

    /**
     * 重置初始化缓存。
     * 仅用于极端场景，例如桥接对象被热替换。
     */
    reset(): void {
        this.initPromise = null;
        this.ready = false;
        this.unavailableWarned = false;
    }

    private warnUnavailable(): void {
        if (this.unavailableWarned) return;
        console.warn('[Persistence] 持久化服务不可用，后续文件操作将被跳过。');
        this.unavailableWarned = true;
    }

    private async raw<R extends object>(
        op: string,
        action: (fs: ElectronFS) => Promise<PersistenceIpc<R>>,
        fallback: R
    ): Promise<PersistenceIpc<R>> {
        const fail: PersistenceIpc<R> = { success: false, ...fallback };

        await this.init();

        const fs = this.fs;
        if (!this.isReady || !fs) {
            this.warnUnavailable();
            return fail;
        }

        try {
            const result = await action(fs);
            if (!result?.success) {
                console.warn(`[Persistence] [${op}] 未成功:`, result?.error ?? '主进程未返回具体错误。');
            }
            return { ...fallback, ...(result ?? {}) } as PersistenceIpc<R>;
        } catch (error) {
            console.error(`[Persistence] [${op}] 异常:`, error);
            return fail;
        }
    }

    private async ok<R extends object>(
        op: string,
        action: (fs: ElectronFS) => Promise<PersistenceIpc<R>>
    ): Promise<boolean> {
        const result = await this.raw(op, action, {} as R);
        return result.success;
    }

    private async pluck<R extends object, K extends string, F>(
        op: string,
        action: (fs: ElectronFS) => Promise<PersistenceIpc<R>>,
        key: K,
        fallback: F
    ): Promise<NonNullable<R[K & keyof R]> | F> {
        const result = await this.raw(op, action, {} as R);
        if (!result.success) return fallback;

        const value = (result as Record<string, unknown>)[key];
        return value == null ? fallback : (value as NonNullable<R[K & keyof R]>);
    }

    //=========================================================================
    // 区域数据
    //=========================================================================
    async saveZone(
        zone: ZoneTemplate,
        narrativeMode?: NarrativeMode,
        arcId?: string
    ): Promise<boolean> {
        return this.ok(`保存区域 (${zone.id})`, (fs) => fs.saveZone(zone, narrativeMode, arcId));
    }

    async listSavedZones(): Promise<string[]> {
        return this.pluck('列出已保存区域', (fs) => fs.listZones(), 'files', [] as string[]);
    }

    async loadRandomZone(): Promise<ZoneTemplate | null> {
        return this.pluck(
            '随机加载区域',
            (fs) => fs.loadRandomZone(),
            'data',
            null as ZoneTemplate | null
        );
    }

    //=========================================================================
    // 叙事管理
    //=========================================================================
    async listNarrativeArcs(): Promise<NarrativeArcSummary[]> {
        return this.pluck(
            '获取叙事链列表',
            (fs) => fs.listNarrativeArcs(),
            'arcs',
            [] as NarrativeArcSummary[]
        );
    }

    async listEpisodicZones(): Promise<EpisodicZoneSummary[]> {
        return this.pluck(
            '获取单元剧列表',
            (fs) => fs.listEpisodicZones(),
            'zones',
            [] as EpisodicZoneSummary[]
        );
    }

    async loadArcZone(arcId: string, zoneIndex?: number): Promise<PersistenceIpc<ArcZoneLoadResult>> {
        return this.raw(`加载叙事链区域 (${arcId})`, (fs) => fs.loadArcZone(arcId, zoneIndex), {
            data: undefined,
            currentIndex: undefined,
            maxIndex: undefined,
        });
    }

    async loadEpisodicZone(zoneId?: string): Promise<PersistenceIpc<{ data?: ZoneTemplate }>> {
        return this.raw('加载单元剧区域', (fs) => fs.loadEpisodicZone(zoneId), {
            data: undefined,
        });
    }

    async deleteNarrativeArc(arcId: string): Promise<boolean> {
        return this.ok(`删除叙事链 (${arcId})`, (fs) => fs.deleteNarrativeArc(arcId));
    }

    async deleteEpisodicZone(zoneId: string): Promise<boolean> {
        return this.ok(`删除单元剧区域 (${zoneId})`, (fs) => fs.deleteEpisodicZone(zoneId));
    }

    //=========================================================================
    // 图片资源
    //=========================================================================
    async saveImage(
        zoneId: string,
        nodeId: string,
        filename: string,
        base64Data: string
    ): Promise<boolean> {
        return this.ok(`保存图片 (${filename})`, (fs) =>
            fs.saveImage(zoneId, nodeId, filename, base64Data)
        );
    }

    async hasImage(zoneId: string, nodeId: string, filename: string): Promise<boolean> {
        return this.pluck(
            '检查图片存在性',
            (fs) => fs.hasImage(zoneId, nodeId, filename),
            'exists',
            false
        );
    }

    async loadImage(zoneId: string, nodeId: string, filename: string): Promise<string | null> {
        return this.pluck(
            `加载图片 (${filename})`,
            (fs) => fs.loadImage(zoneId, nodeId, filename),
            'data',
            null as string | null
        );
    }

    async listImages(zoneId: string, nodeId: string): Promise<string[]> {
        return this.pluck('列出图片', (fs) => fs.listImages(zoneId, nodeId), 'files', [] as string[]);
    }

    async getNextImageIndex(zoneId: string, nodeId: string): Promise<number> {
        return this.pluck(
            '获取图片索引',
            (fs) => fs.getNextImageIndex(zoneId, nodeId),
            'index',
            1
        );
    }

    async autoLoadImage(zoneId: string, nodeId: string, random = false): Promise<string | null> {
        const files = await this.listImages(zoneId, nodeId);
        const matches = files.filter((file) => /^\d+\.(png|jpe?g|webp|avif)$/i.test(file));
        if (matches.length === 0) return null;

        const target = random
            ? matches[Math.floor(Math.random() * matches.length)]
            : matches.sort((a, b) => parseInt(a, 10) - parseInt(b, 10))[0];

        return target ? this.loadImage(zoneId, nodeId, target) : null;
    }

    //=========================================================================
    // 视频资源
    //=========================================================================
    async saveVideo(
        zoneId: string,
        nodeId: string,
        filename: string,
        videoUrl: string
    ): Promise<boolean> {
        return this.ok(`保存视频 (${filename})`, (fs) =>
            fs.saveVideo(zoneId, nodeId, filename, videoUrl)
        );
    }

    async hasVideo(zoneId: string, nodeId: string, filename: string): Promise<boolean> {
        return this.pluck(
            '检查视频存在性',
            (fs) => fs.hasVideo(zoneId, nodeId, filename),
            'exists',
            false
        );
    }

    async getVideoPath(zoneId: string, nodeId: string, filename: string): Promise<string | null> {
        return this.pluck(
            `获取视频路径 (${filename})`,
            (fs) => fs.getVideoPath(zoneId, nodeId, filename),
            'path',
            null as string | null
        );
    }

    async listVideos(zoneId: string, nodeId: string): Promise<string[]> {
        return this.pluck('列出视频', (fs) => fs.listVideos(zoneId, nodeId), 'files', [] as string[]);
    }

    async getNextVideoIndex(zoneId: string, nodeId: string): Promise<number> {
        return this.pluck(
            '获取视频索引',
            (fs) => fs.getNextVideoIndex(zoneId, nodeId),
            'index',
            1
        );
    }

    //=========================================================================
    // 音频资源
    //=========================================================================
    async saveAudio(
        zoneId: string,
        nodeId: string,
        filename: string,
        base64Data: string
    ): Promise<boolean> {
        return this.ok(`保存音频 (${filename})`, (fs) =>
            fs.saveAudio(zoneId, nodeId, filename, base64Data)
        );
    }

    async loadAudio(zoneId: string, nodeId: string, filename: string): Promise<string | null> {
        return this.pluck(
            `加载音频 (${filename})`,
            (fs) => fs.loadAudio(zoneId, nodeId, filename),
            'data',
            null as string | null
        );
    }

    //=========================================================================
    // 物品库
    //=========================================================================
    async saveItems(items: ItemTemplate[]): Promise<boolean> {
        return this.ok('保存物品数据库', (fs) => fs.saveItems(items));
    }

    async loadItems(): Promise<ItemTemplate[] | null> {
        return this.pluck(
            '加载物品数据库',
            (fs) => fs.loadItems(),
            'data',
            null as ItemTemplate[] | null
        );
    }

    //=========================================================================
    // 游戏存档
    //=========================================================================
    async saveGame(saveName: string | null, saveData: GameStateData): Promise<string | null> {
        return this.pluck(
            '保存游戏进度',
            (fs) => fs.saveGame(saveName, saveData),
            'fileName',
            null as string | null
        );
    }

    async listSaves(): Promise<SaveFileInfo[]> {
        const files = await this.pluck(
            '列出存档',
            (fs) => fs.listSaves(),
            'files',
            [] as RawSaveFileInfo[]
        );

        return files.map(({ name, size, modified }) => ({
            name,
            size: Math.max(0, Number(size ?? 0) || 0),
            modified: toIsoString(modified),
        }));
    }

    async loadGame(fileName: string): Promise<GameStateData | null> {
        const normalized = fileName.trim();
        if (!normalized) return null;

        return this.pluck(
            `加载存档 (${normalized})`,
            (fs) => fs.loadGame(normalized),
            'data',
            null as GameStateData | null
        );
    }

    async deleteSave(fileName: string): Promise<boolean> {
        const normalized = fileName.trim();
        if (!normalized) return false;

        return this.ok(`删除存档 (${normalized})`, (fs) => fs.deleteSave(normalized));
    }

    //=========================================================================
    // 配置
    //=========================================================================
    async saveConfig(config: Settings): Promise<boolean> {
        return this.ok('保存配置', (fs) => fs.saveConfig(config));
    }

    async loadConfig(): Promise<Settings | null> {
        return this.pluck(
            '加载配置',
            (fs) => fs.loadConfig(),
            'data',
            null as Settings | null
        );
    }

    //=========================================================================
    // 日志与 NPC 记忆
    //=========================================================================
    async saveRawLog(filename: string, content: string): Promise<boolean> {
        return this.ok('保存原始日志', (fs) => fs.saveRawLog(filename, content));
    }

    async saveNpcMemory(
        npcName: string,
        dialogue: PersistedDialogue | null | undefined,
        memory: MemoryPyramid | null | undefined
    ): Promise<boolean> {
        return this.ok(`保存NPC记忆与对话 (${npcName})`, (fs) =>
            fs.saveNpcMemory(npcName, dialogue ?? null, memory ?? null)
        );
    }

    async loadNpcMemory(npcName: string): Promise<NpcMemoryRecord | null> {
        const result = await this.raw(
            `加载NPC记忆与对话 (${npcName})`,
            (fs) => fs.loadNpcMemory(npcName),
            {
                dialogue: undefined,
                memory: undefined,
            }
        );

        if (!result.success) return null;

        return {
            dialogue: (result.dialogue ?? undefined) as PersistedDialogue | undefined,
            memory: (result.memory ?? undefined) as MemoryPyramid | undefined,
        };
    }

    //=========================================================================
    // NPC 多人格 / 记忆档案
    //=========================================================================
    async listNpcProfiles(npcName: string): Promise<NpcProfileMeta[]> {
        return this.pluck(
            '列出NPC人格记忆组',
            (fs) => fs.listNpcProfiles(npcName),
            'profiles',
            [] as NpcProfileMeta[]
        );
    }

    async saveNpcMemoryProfile(
        npcName: string,
        profileId: string,
        dialogue: PersistedDialogue | null | undefined,
        memory: MemoryPyramid | null | undefined,
        metaName?: string
    ): Promise<boolean> {
        return this.ok(`保存NPC人格记忆组 (${npcName}/${profileId})`, (fs) =>
            fs.saveNpcMemoryProfile(npcName, profileId, dialogue ?? null, memory ?? null, metaName)
        );
    }

    async loadNpcMemoryProfile(
        npcName: string,
        profileId: string
    ): Promise<NpcMemoryRecord | null> {
        const result = await this.raw(
            `加载NPC人格记忆组 (${npcName}/${profileId})`,
            (fs) => fs.loadNpcMemoryProfile(npcName, profileId),
            {
                dialogue: undefined,
                memory: undefined,
                meta: undefined,
            }
        );

        if (!result.success) return null;

        return {
            dialogue: (result.dialogue ?? undefined) as PersistedDialogue | undefined,
            memory: (result.memory ?? undefined) as MemoryPyramid | undefined,
            meta: result.meta,
        };
    }

    async deleteNpcProfile(npcName: string, profileId: string): Promise<boolean> {
        return this.ok(`删除NPC人格记忆组 (${npcName}/${profileId})`, (fs) =>
            fs.deleteNpcProfile(npcName, profileId)
        );
    }
}

/**
 * 全局持久化服务单例。
 */
export const PersistenceService = new PersistenceClient();
