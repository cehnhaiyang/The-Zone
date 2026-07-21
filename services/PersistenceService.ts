/**
 * 持久化服务 (Persistence Service)
 * * 负责与本地文件系统的交互。
 * 在 Electron 环境下使用 IPC 通信直接读写文件。
 * * 功能包括：区域数据、图片/视频/音频资源、物品库、游戏存档、配置文件的管理。
 */
import { ElectronBridge, ZoneTemplate, ItemTemplate, GameStateData, Settings } from '../meta';

class PersistenceServiceImpl {
  public isReady: boolean = false;
  private electron?: ElectronBridge;

  constructor() {
    this.init();
  }

  /**
   * 初始化文件系统连接，建立与 Electron 主进程的 IPC 通信通道
   * @returns 初始化是否成功
   */
  async init(): Promise<boolean> {
    if (typeof window !== 'undefined' && window.electron?.fs) {
      this.electron = window.electron;
      try {
        const result = await this.electron.fs.init();
        if (result?.success) {
          this.isReady = true;
          console.log("[Persistence] ✅ Electron 文件系统已就绪:", result.path || '默认路径');
          return true;
        }
        console.error("[Persistence] ❌ 文件系统初始化返回失败状态");
      } catch (error) {
        console.error("[Persistence] ❌ 文件系统初始化失败:", error);
      }
    } else {
      console.warn("[Persistence] ⚠ 未能检测到 Electron 环境或 fs 接口 (可能运行在纯 Web 模式)");
    }
    return false;
  }

  /**
   * 统一 IPC 调用拦截器（核心精简方法）
   * 通过方法重载支持 3 种返回模式，处理所有前置校验与后置解包
   */
  // 1. 仅关心成功与否 (返回 boolean)
  private async invoke(op: string, action: () => Promise<any>): Promise<boolean>;
  // 2. 提取并返回特定字段 (失败返回 fallback)
  private async invoke<V>(op: string, action: () => Promise<any>, key: string, fallback: V): Promise<V>;
  // 3. 返回完整的 IPC 响应对象 (透传原格式)
  private async invoke<T>(op: string, action: () => Promise<T>, raw: true, fallback: Partial<T>): Promise<T>;

  private async invoke(op: string, action: () => Promise<any>, keyOrRaw?: string | boolean, fallback?: any): Promise<any> {
    const isRaw = keyOrRaw === true;
    const key = typeof keyOrRaw === 'string' ? keyOrRaw : undefined;
    const failRet = isRaw ? { success: false, ...fallback } : (fallback !== undefined ? fallback : false);

    if (!this.isReady || !this.electron) {
      console.warn(`[Persistence] ⚠ 跳过 [${op}]：服务未就绪或非 Electron 环境`);
      return failRet;
    }

    try {
      const res = await action();
      if (!res?.success) {
        console.warn(`[Persistence] ⚠ [${op}] 操作未成功:`, res?.error || '主进程未返回具体错误信息');
      }

      if (isRaw) return res || failRet;
      if (key) return res?.success && res[key] !== undefined ? res[key] : fallback;
      return !!res?.success;
    } catch (error) {
      console.error(`[Persistence] ❌ [${op}] 操作抛出异常:`, error);
      return failRet;
    }
  }

  // ==================== 区域数据管理 (Zone Data Management) ====================

  async saveZone(zone: ZoneTemplate, NM?: 'chain' | 'episodic', arcId?: string): Promise<void> {
    await this.invoke(`保存区域 (${zone.id})`, () => this.electron!.fs.saveZone(zone, NM, arcId));
  }

  async listSavedZones(): Promise<string[]> {
    return this.invoke('列出已保存区域', () => this.electron!.fs.listZones(), 'files', []);
  }

  async loadRandomZone(): Promise<ZoneTemplate | null> {
    return this.invoke<ZoneTemplate | null>('随机加载区域', () => this.electron!.fs.loadRandomZone(), 'data', null);
  }

  // ==================== 图片资源管理 (Image Asset Management) ====================

  async saveImage(filename: string, base64Data: string, zoneId?: string, nodeId?: string): Promise<void> {
    await this.invoke(`保存图片 (${filename})`, () => this.electron!.fs.saveImage(zoneId || '', nodeId || '', filename, base64Data));
  }

  async hasImage(filename: string, zoneId?: string, nodeId?: string): Promise<boolean> {
    return this.invoke('检查图片存在性', () => this.electron!.fs.hasImage(zoneId || '', nodeId || '', filename), 'exists', false);
  }

  async loadImage(filename: string, zoneId?: string, nodeId?: string): Promise<string | null> {
    return this.invoke<string | null>(`加载图片 (${filename})`, () => this.electron!.fs.loadImage(zoneId || '', nodeId || '', filename), 'data', null);
  }

  async listImages(zoneId: string, nodeId: string): Promise<string[]> {
    return this.invoke('列出图片', () => this.electron!.fs.listImages(zoneId, nodeId), 'files', []);
  }

  async getNextImageIndex(zoneId: string, nodeId: string): Promise<number> {
    return this.invoke('获取图片索引', () => this.electron!.fs.getNextImageIndex(zoneId, nodeId), 'index', 1);
  }

  async autoLoadImage(zoneId: string, nodeId: string, random: boolean = false): Promise<string | null> {
    if (!this.isReady) return null;
    try {
      const files = await this.listImages(zoneId, nodeId);
      const matches = files.filter(f => /^\d+\.(png|jpe?g)$/i.test(f));
      if (!matches.length) return null;

      const targetFile = random
        ? matches[Math.floor(Math.random() * matches.length)]
        : matches.sort((a, b) => parseInt(a) - parseInt(b))[0];

      return await this.loadImage(targetFile.replace(/\.[^/.]+$/, ""), zoneId, nodeId);
    } catch (error) {
      console.error('[Persistence] ❌ 自动加载图片失败:', error);
      return null;
    }
  }

  // ==================== 视频资源管理 (Video Asset Management) ====================

  async listVideos(zoneId: string, nodeId: string): Promise<string[]> {
    return this.invoke('列出视频', () => this.electron!.fs.listVideos(zoneId, nodeId), 'files', []);
  }

  async getNextVideoIndex(zoneId: string, nodeId: string): Promise<number> {
    return this.invoke('获取视频索引', () => this.electron!.fs.getNextVideoIndex(zoneId, nodeId), 'index', 1);
  }

  async saveVideo(filename: string, videoUrl: string, zoneId?: string, nodeId?: string): Promise<void> {
    await this.invoke(`保存视频 (${filename})`, () => this.electron!.fs.saveVideo(zoneId || '', nodeId || '', filename, videoUrl));
  }

  async hasVideo(filename: string, zoneId?: string, nodeId?: string): Promise<boolean> {
    return this.invoke('检查视频存在性', () => this.electron!.fs.hasVideo(zoneId || '', nodeId || '', filename), 'exists', false);
  }

  async getVideoPath(filename: string, zoneId?: string, nodeId?: string): Promise<string | null> {
    return this.invoke<string | null>(`获取视频路径 (${filename})`, () => this.electron!.fs.getVideoPath(zoneId || '', nodeId || '', filename), 'path', null);
  }

  // ==================== 音频资源管理 (Audio Asset Management) ====================

  async saveAudio(filename: string, base64Data: string, zoneId?: string, nodeId?: string): Promise<void> {
    await this.invoke(`保存音频 (${filename})`, () => this.electron!.fs.saveAudio(zoneId || '', nodeId || '', filename, base64Data));
  }

  async loadAudio(filename: string, zoneId?: string, nodeId?: string): Promise<string | null> {
    return this.invoke<string | null>(`加载音频 (${filename})`, () => this.electron!.fs.loadAudio(zoneId || '', nodeId || '', filename), 'data', null);
  }

  // ==================== 数据存储库 (Items & Saves) ====================

  async saveItems(items: ItemTemplate[]): Promise<boolean> {
    return this.invoke('保存物品数据库', () => this.electron!.fs.saveItems(items));
  }

  async loadItems(): Promise<ItemTemplate[] | null> {
    return this.invoke<ItemTemplate[] | null>('加载物品数据库', () => this.electron!.fs.loadItems(), 'data', null);
  }

  async saveGame(saveName: string | null, GameStateData: GameStateData): Promise<string | null> {
    return this.invoke<string | null>('保存游戏进度', () => this.electron!.fs.saveGame(saveName, GameStateData), 'fileName', null);
  }

  async listSaves(): Promise<Array<{ name: string; size: number; modified: Date }>> {
    return this.invoke('列出存档', () => this.electron!.fs.listSaves(), 'files', []);
  }

  async loadGame(fileName: string): Promise<GameStateData | null> {
    return this.invoke<GameStateData | null>(`加载游戏 (${fileName})`, () => this.electron!.fs.loadGame(fileName), 'data', null);
  }

  async deleteSave(fileName: string): Promise<boolean> {
    return this.invoke(`删除存档 (${fileName})`, () => this.electron!.fs.deleteSave(fileName));
  }

  // ==================== 配置文件管理 (Configuration Management) ====================

  async saveConfig(config: Settings): Promise<boolean> {
    return this.invoke('保存配置', () => this.electron!.fs.saveConfig(config));
  }

  async loadConfig(): Promise<Settings | null> {
    return this.invoke<Settings | null>('加载配置', () => this.electron!.fs.loadConfig(), 'data', null);
  }

  async saveRawLog(filename: string, content: string): Promise<boolean> {
    return this.invoke('保存原始日志', () => this.electron!.fs.saveRawLog(filename, content));
  }

  async saveNpcMemory(npcName: string, dialogue: any, memory: any): Promise<boolean> {
    return this.invoke(`保存NPC记忆与对话(${npcName})`, () => this.electron!.fs.saveNpcMemory(npcName, dialogue, memory));
  }

  async loadNpcMemory(npcName: string): Promise<{ dialogue?: any; memory?: any }> {
    return this.invoke<{ dialogue?: any; memory?: any }>(
      `加载NPC记忆与对话(${npcName})`,
      () => this.electron!.fs.loadNpcMemory(npcName),
      true,
      { dialogue: null, memory: null }
    );
  }

  async listNpcProfiles(npcName: string): Promise<Array<{ profileId: string; name: string; lastModified: number; turnsCount?: number }>> {
    return this.invoke('列出NPC人格记忆组', () => this.electron!.fs.listNpcProfiles(npcName), 'profiles', []);
  }

  async saveNpcMemoryProfile(npcName: string, profileId: string, dialogue: any, memory: any, metaName?: string): Promise<boolean> {
    return this.invoke(`保存NPC人格记忆组(${npcName}/${profileId})`, () => this.electron!.fs.saveNpcMemoryProfile(npcName, profileId, dialogue, memory, metaName));
  }

  async loadNpcMemoryProfile(npcName: string, profileId: string): Promise<{ dialogue?: any; memory?: any; meta?: any }> {
    return this.invoke<{ dialogue?: any; memory?: any; meta?: any }>(
      `加载NPC人格记忆组(${npcName}/${profileId})`,
      () => this.electron!.fs.loadNpcMemoryProfile(npcName, profileId),
      true,
      { dialogue: null, memory: null }
    );
  }

  async deleteNpcProfile(npcName: string, profileId: string): Promise<boolean> {
    return this.invoke(`删除NPC人格记忆组(${npcName}/${profileId})`, () => this.electron!.fs.deleteNpcProfile(npcName, profileId));
  }

  // ==================== 向量存储管理 (Vector Store / ChromaDB) ====================

  async initChroma(persistDir?: string): Promise<boolean> {
    return this.invoke('初始化 ChromaDB', () => this.electron!.chroma.init(persistDir));
  }

  async storeEmbeddings(collection: string, ids: string[], embeddings: number[][], documents: string[], metadatas: Record<string, any>[]): Promise<boolean> {
    return this.invoke(`存储向量数据 (${collection})`, () => this.electron!.chroma.store(collection, ids, embeddings, documents, metadatas));
  }

  async searchEmbeddings(collection: string, queryEmbeddings: number[][], nResults: number, where?: Record<string, any>): Promise<{ documents: (string | null)[][]; metadatas: (Record<string, any> | null)[][]; distances: number[][] } | null> {
    return this.invoke<any>(`向量检索 (${collection})`, () => this.electron!.chroma.search(collection, queryEmbeddings, nResults, where), 'results', null);
  }

  async deleteEmbeddings(collection: string, ids?: string[], where?: Record<string, any>): Promise<boolean> {
    return this.invoke(`删除向量数据 (${collection})`, () => this.electron!.chroma.delete(collection, ids || null, where || null));
  }

  async countEmbeddings(collection: string): Promise<number> {
    return this.invoke('统计向量数量', () => this.electron!.chroma.count(collection), 'count', 0);
  }

  async getEmbeddings(collection: string, where?: Record<string, any>): Promise<{ ids: string[]; documents?: string[]; metadatas?: Record<string, any>[] } | null> {
    return this.invoke<any>(`获取向量数据 (${collection})`, () => this.electron!.chroma.get(collection, where || null), 'docs', null);
  }

  // ==================== 叙事管理 (Narrative Arc Management) ====================

  async listNarrativeArcs(): Promise<{ success: boolean; arcs: Array<{ title: string; mainAxis: string; zoneCount: number }> }> {
    return this.invoke('获取叙事链列表', () => this.electron!.fs.listNarrativeArcs(), true, { arcs: [] });
  }

  async listEpisodicZones(): Promise<{ success: boolean; zones: Array<{ id: string; name: string; timestamp: number }> }> {
    return this.invoke('获取单元剧列表', () => this.electron!.fs.listEpisodicZones(), true, { zones: [] });
  }

  async loadArcZone(arcId: string, zoneIndex?: number): Promise<{ success: boolean; data?: ZoneTemplate; currentIndex?: number; maxIndex?: number }> {
    return this.invoke(`加载叙事链区域 (${arcId})`, () => this.electron!.fs.loadArcZone(arcId, zoneIndex), true, {});
  }

  async loadEpisodicZone(zoneId?: string): Promise<{ success: boolean; data?: ZoneTemplate }> {
    return this.invoke('加载单元剧区域', () => this.electron!.fs.loadEpisodicZone(zoneId), true, {});
  }

  async deleteNarrativeArc(arcId: string): Promise<{ success: boolean }> {
    return this.invoke(`删除叙事链 (${arcId})`, () => this.electron!.fs.deleteNarrativeArc(arcId), true, {});
  }

  async deleteEpisodicZone(zoneId: string): Promise<{ success: boolean }> {
    return this.invoke(`删除单元剧区域 (${zoneId})`, () => this.electron!.fs.deleteEpisodicZone(zoneId), true, {});
  }
}

export const PersistenceService = new PersistenceServiceImpl();