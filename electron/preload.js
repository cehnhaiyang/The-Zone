
/**
 * The Zone - Preload Script
 * 安全地暴露 Electron API 给渲染进程
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  version: process.versions.electron,

  // AI 请求已改为渲染进程直连，不再经主进程代理；保留 api 对象以兼容 isElectron() 等检测
  api: {},

  // 文件系统
  fs: {
    init: () => ipcRenderer.invoke('fs:init'),

    // 区域
    saveZone: (ZoneTemplate, NM, arcId, index) => ipcRenderer.invoke('fs:save-zone', { ZoneTemplate, NM, arcId, index }),
    listZones: () => ipcRenderer.invoke('fs:list-zones'),
    loadRandomZone: () => ipcRenderer.invoke('fs:load-random-zone'),

    // 叙事管理
    listNarrativeArcs: () => ipcRenderer.invoke('fs:list-narrative-arcs'),
    listEpisodicZones: () => ipcRenderer.invoke('fs:list-episodic-zones'),
    loadArcZone: (arcId, zoneIndex) => ipcRenderer.invoke('fs:load-arc-zone', { arcId, zoneIndex }),
    loadEpisodicZone: (zoneId) => ipcRenderer.invoke('fs:load-episodic-zone', { zoneId }),
    deleteNarrativeArc: (arcId) => ipcRenderer.invoke('fs:delete-narrative-arc', { arcId }),
    deleteEpisodicZone: (zoneId) => ipcRenderer.invoke('fs:delete-episodic-zone', { zoneId }),

    // 图片 - 层级结构
    saveImage: (zoneId, nodeId, filename, base64Data) => ipcRenderer.invoke('fs:save-image', { zoneId, nodeId, filename, base64Data }),
    hasImage: (zoneId, nodeId, filename) => ipcRenderer.invoke('fs:has-image', { zoneId, nodeId, filename }),
    loadImage: (zoneId, nodeId, filename) => ipcRenderer.invoke('fs:load-image', { zoneId, nodeId, filename }),
    listImages: (zoneId, nodeId) => ipcRenderer.invoke('fs:list-images', { zoneId, nodeId }),
    getNextImageIndex: (zoneId, nodeId) => ipcRenderer.invoke('fs:get-next-image-index', { zoneId, nodeId }),

    // 视频 - 层级结构
    saveVideo: (zoneId, nodeId, filename, videoUrl) => ipcRenderer.invoke('fs:save-video', { zoneId, nodeId, filename, videoUrl }),
    hasVideo: (zoneId, nodeId, filename) => ipcRenderer.invoke('fs:has-video', { zoneId, nodeId, filename }),
    getVideoPath: (zoneId, nodeId, filename) => ipcRenderer.invoke('fs:get-video-path', { zoneId, nodeId, filename }),
    listVideos: (zoneId, nodeId) => ipcRenderer.invoke('fs:list-videos', { zoneId, nodeId }),
    getNextVideoIndex: (zoneId, nodeId) => ipcRenderer.invoke('fs:get-next-video-index', { zoneId, nodeId }),

    // 音频 - 层级结构
    saveAudio: (zoneId, nodeId, filename, base64Data) => ipcRenderer.invoke('fs:save-audio', { zoneId, nodeId, filename, base64Data }),
    loadAudio: (zoneId, nodeId, filename) => ipcRenderer.invoke('fs:load-audio', { zoneId, nodeId, filename }),

    // 物品
    saveItems: (items) => ipcRenderer.invoke('fs:save-items', { items }),
    loadItems: () => ipcRenderer.invoke('fs:load-items'),

    // 存档
    saveGame: (saveName, saveData) => ipcRenderer.invoke('fs:save-game', { saveName, saveData }),
    listSaves: () => ipcRenderer.invoke('fs:list-saves'),
    loadGame: (fileName) => ipcRenderer.invoke('fs:load-game', { fileName }),
    deleteSave: (fileName) => ipcRenderer.invoke('fs:delete-save', { fileName }),

    // 配置
    saveConfig: (config) => ipcRenderer.invoke('fs:save-config', { config }),
    loadConfig: () => ipcRenderer.invoke('fs:load-config'),
    saveRawLog: (filename, content) => ipcRenderer.invoke('fs:save-raw-log', { filename, content }),

    // NPC 记忆与对话本地持久化及多人格组管理
    saveNpcMemory: (npcName, dialogue, memory) => ipcRenderer.invoke('fs:save-npc-memory', { npcName, dialogue, memory }),
    loadNpcMemory: (npcName) => ipcRenderer.invoke('fs:load-npc-memory', { npcName }),
    listNpcProfiles: (npcName) => ipcRenderer.invoke('fs:list-npc-profiles', { npcName }),
    saveNpcMemoryProfile: (npcName, profileId, dialogue, memory, metaName) => ipcRenderer.invoke('fs:save-npc-memory-profile', { npcName, profileId, dialogue, memory, metaName }),
    loadNpcMemoryProfile: (npcName, profileId) => ipcRenderer.invoke('fs:load-npc-memory-profile', { npcName, profileId }),
    deleteNpcProfile: (npcName, profileId) => ipcRenderer.invoke('fs:delete-npc-profile', { npcName, profileId }),

    // 叙事库（玩家自建的恐怖域 / 元 / 美学）
    saveNarrativeLibrary: (library) => ipcRenderer.invoke('fs:save-narrative-library', { library }),
    loadNarrativeLibrary: () => ipcRenderer.invoke('fs:load-narrative-library'),
  }
});

console.log('[Preload] Electron API 已注入');
