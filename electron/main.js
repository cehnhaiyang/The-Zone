/**
 * The Zone - Electron 主进程
 * 负责窗口管理、API代理、文件系统操作
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

// ==================== LanceDB 嵌入式向量存储 ====================
const lancedb = require('@lancedb/lancedb');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    backgroundColor: '#000000',
    title: 'The Zone',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // 开发环境下允许跨域，但在生产环境应谨慎
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png')
  });

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ==================== 辅助函数 ====================

const getAppDataPath = () => path.join(app.getPath('userData'), 'the-zone-data');
const sanitize = (name) => name.replace(/[^a-z0-9_\-\.]/gi, '_').replace(/_{2,}/g, '_');

const ensureDir = async (dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    return true;
  } catch { return false; }
};

/**
 * 获取媒体文件的存储目录 (层级结构: type/zoneId/nodeId)
 */
const getMediaDir = (type, zoneId, nodeId) => {
  // 兼容旧模式：如果 zoneId/nodeId 为空，使用根目录
  if (!zoneId || !nodeId) {
    return path.join(getAppDataPath(), type);
  }

  // 如果 zoneId 为 character 或 enemy，则区分保存至其独立的文件夹
  if (zoneId === 'character' || zoneId === 'enemy') {
    return path.join(getAppDataPath(), type, zoneId, sanitize(nodeId));
  }

  // 否则存至 zone 文件夹
  return path.join(getAppDataPath(), type, 'zone', sanitize(zoneId), sanitize(nodeId));
};

// ==================== 文件系统 ====================

ipcMain.handle('fs:init', async () => {
  try {
    const dataDir = getAppDataPath();
    const dirs = ['maps', 'images', 'videos', 'audios', 'saves', 'logs', 'memory'];
    await ensureDir(dataDir);
    for (const d of dirs) await ensureDir(path.join(dataDir, d));
    return { success: true, path: dataDir };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 区域数据
ipcMain.handle('fs:save-zone', async (_, { ZoneTemplate, NM, arcId, index }) => {
  try {
    console.log('[fs:save-zone] 接收参数:', {
      zoneId: ZoneTemplate.id,
      NM,
      arcId,
      index
    });

    let filePath;
    let savedIndex;

    if (NM === 'chain' && arcId) {
      // 链式模式：保存到 maps/chain/{arcId}/{index}.json
      const arcDir = path.join(getAppDataPath(), 'maps', 'chain', sanitize(arcId));
      await ensureDir(arcDir);

      // 获取索引号
      const existingFiles = fsSync.existsSync(arcDir)
        ? (await fs.readdir(arcDir)).filter(f => /^\d+\.json$/.test(f))
        : [];

      if (typeof index === 'number' && Number.isFinite(index) && index > 0) {
        savedIndex = Math.floor(index);
      } else {
        savedIndex = existingFiles.length > 0
          ? Math.max(...existingFiles.map(f => parseInt(f.match(/^(\d+)\.json$/)[1]))) + 1
          : 1;
      }

      filePath = path.join(arcDir, `${savedIndex}.json`);
      console.log('[fs:save-zone] 链式模式，保存路径:', filePath, '索引:', savedIndex);
    } else if (NM === 'episodic') {
      // 单元剧模式：保存到 maps/episodic/{zoneId}.json
      const episodicDir = path.join(getAppDataPath(), 'maps', 'episodic');
      await ensureDir(episodicDir);
      filePath = path.join(episodicDir, `${sanitize(ZoneTemplate.id)}.json`);
      console.log('[fs:save-zone] 单元剧模式，保存路径:', filePath);
    } else {
      // 历史"兼容旧模式"（无叙事模式时写 maps/zone_{id}.json）已移除，
      // 叙事模式必须显式传入 chain/episodic。
      throw new Error(`未知叙事模式：${NM}`);
    }

    await fs.writeFile(filePath, JSON.stringify(ZoneTemplate, null, 2), 'utf-8');
    console.log('[fs:save-zone] 保存成功');
    return { success: true, index: savedIndex };
  } catch (error) {
    console.error('[fs:save-zone] 保存失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:list-zones', async () => {
  try {
    const mapsDir = path.join(getAppDataPath(), 'maps');
    if (!fsSync.existsSync(mapsDir)) return { success: true, files: [] };
    const files = (await fs.readdir(mapsDir)).filter(f => f.endsWith('.json'));
    return { success: true, files };
  } catch (error) {
    return { success: false, error: error.message, files: [] };
  }
});

ipcMain.handle('fs:load-random-zone', async () => {
  try {
    const mapsDir = path.join(getAppDataPath(), 'maps');
    if (!fsSync.existsSync(mapsDir)) return { success: true, data: null };
    const files = (await fs.readdir(mapsDir)).filter(f => f.endsWith('.json'));
    if (files.length === 0) return { success: true, data: null };
    const content = await fs.readFile(path.join(mapsDir, files[Math.floor(Math.random() * files.length)]), 'utf-8');
    return { success: true, data: JSON.parse(content) };
  } catch (error) {
    return { success: false, error: error.message, data: null };
  }
});

// ==================== 叙事管理 ====================

/**
 * 获取所有叙事链列表
 * 返回按主轴分组的叙事链信息
 */
ipcMain.handle('fs:list-narrative-arcs', async () => {
  try {
    const chainDir = path.join(getAppDataPath(), 'maps', 'chain');
    if (!fsSync.existsSync(chainDir)) return { success: true, arcs: [] };

    const arcFolders = await fs.readdir(chainDir);
    const arcs = [];

    for (const folder of arcFolders) {
      const arcPath = path.join(chainDir, folder);
      const stat = await fs.stat(arcPath);

      if (stat.isDirectory()) {
        // 读取该叙事链下的所有区域文件
        const zoneFiles = (await fs.readdir(arcPath)).filter(f => f.endsWith('.json'));

        // 读取第一个区域文件以获取主轴信息
        let mainAxis = '未知';
        if (zoneFiles.length > 0) {
          try {
            const firstZone = JSON.parse(await fs.readFile(path.join(arcPath, zoneFiles[0]), 'utf-8'));
            // 尝试从区域数据中提取主轴信息（如果有的话）
            mainAxis = firstZone.mainAxis || firstZone.theme || '未知';
          } catch (e) {
            console.error('读取区域文件失败:', e);
          }
        }

        arcs.push({
          title: folder,
          mainAxis,
          zoneCount: zoneFiles.length
        });
      }
    }

    return { success: true, arcs };
  } catch (error) {
    return { success: false, error: error.message, arcs: [] };
  }
});

/**
 * 获取单元剧区域列表
 */
ipcMain.handle('fs:list-episodic-zones', async () => {
  try {
    const episodicDir = path.join(getAppDataPath(), 'maps', 'episodic');
    if (!fsSync.existsSync(episodicDir)) return { success: true, zones: [] };

    const zoneFiles = (await fs.readdir(episodicDir)).filter(f => f.endsWith('.json'));
    const zones = [];

    for (const file of zoneFiles) {
      const filePath = path.join(episodicDir, file);
      const stat = await fs.stat(filePath);
      const content = JSON.parse(await fs.readFile(filePath, 'utf-8'));

      zones.push({
        id: content.id,
        name: content.name,
        timestamp: stat.mtime.getTime()
      });
    }

    // 按时间倒序排序
    zones.sort((a, b) => b.timestamp - a.timestamp);

    return { success: true, zones };
  } catch (error) {
    return { success: false, error: error.message, zones: [] };
  }
});

/**
 * 加载指定叙事链的区域
 * @param arcId - 叙事链标题
 * @param zoneIndex - 区域索引（1, 2, 3...）（可选，不指定则加载索引1）
 */
ipcMain.handle('fs:load-arc-zone', async (_, { arcId, zoneIndex }) => {
  try {
    const arcDir = path.join(getAppDataPath(), 'maps', 'chain', sanitize(arcId));
    if (!fsSync.existsSync(arcDir)) return { success: false, error: '叙事链不存在', data: null };

    const zoneFiles = (await fs.readdir(arcDir))
      .filter(f => /^\d+\.json$/.test(f))
      .sort((a, b) => parseInt(a) - parseInt(b)); // 按数字排序

    if (zoneFiles.length === 0) return { success: false, error: '叙事链中没有区域', data: null };

    let targetFile;
    if (zoneIndex !== undefined && zoneIndex !== null) {
      // 加载指定索引的区域
      targetFile = `${zoneIndex}.json`;
      if (!zoneFiles.includes(targetFile)) {
        return { success: false, error: `索引 ${zoneIndex} 的区域不存在`, data: null };
      }
    } else {
      // 默认加载索引 1
      targetFile = zoneFiles[0];
    }

    const content = await fs.readFile(path.join(arcDir, targetFile), 'utf-8');
    const data = JSON.parse(content);

    // 返回数据时附带当前索引和最大索引
    return {
      success: true,
      data,
      currentIndex: parseInt(targetFile.match(/^(\d+)\.json$/)[1]),
      maxIndex: parseInt(zoneFiles[zoneFiles.length - 1].match(/^(\d+)\.json$/)[1])
    };
  } catch (error) {
    return { success: false, error: error.message, data: null };
  }
});

/**
 * 加载单元剧区域
 * @param zoneId - 区域ID（可选，不指定则随机加载）
 */
ipcMain.handle('fs:load-episodic-zone', async (_, { zoneId }) => {
  try {
    const episodicDir = path.join(getAppDataPath(), 'maps', 'episodic');
    if (!fsSync.existsSync(episodicDir)) return { success: false, error: '没有单元剧区域', data: null };

    const zoneFiles = (await fs.readdir(episodicDir)).filter(f => f.endsWith('.json'));
    if (zoneFiles.length === 0) return { success: false, error: '没有单元剧区域', data: null };

    let targetFile;
    if (zoneId) {
      // 加载指定区域
      targetFile = zoneFiles.find(f => f.includes(sanitize(zoneId)));
      if (!targetFile) return { success: false, error: '指定区域不存在', data: null };
    } else {
      // 随机加载
      targetFile = zoneFiles[Math.floor(Math.random() * zoneFiles.length)];
    }

    const content = await fs.readFile(path.join(episodicDir, targetFile), 'utf-8');
    return { success: true, data: JSON.parse(content) };
  } catch (error) {
    return { success: false, error: error.message, data: null };
  }
});

/**
 * 删除叙事链
 * @param arcId - 叙事链标题
 */
ipcMain.handle('fs:delete-narrative-arc', async (_, { arcId }) => {
  try {
    const arcDir = path.join(getAppDataPath(), 'maps', 'chain', sanitize(arcId));
    if (!fsSync.existsSync(arcDir)) return { success: false, error: '叙事链不存在' };

    // 递归删除目录及其所有内容
    await fs.rm(arcDir, { recursive: true, force: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * 删除单元剧区域
 * @param zoneId - 区域ID
 */
ipcMain.handle('fs:delete-episodic-zone', async (_, { zoneId }) => {
  try {
    const episodicDir = path.join(getAppDataPath(), 'maps', 'episodic');
    const zoneFiles = (await fs.readdir(episodicDir)).filter(f => f.includes(sanitize(zoneId)) && f.endsWith('.json'));

    if (zoneFiles.length === 0) return { success: false, error: '区域不存在' };

    // 删除匹配的文件
    for (const file of zoneFiles) {
      await fs.unlink(path.join(episodicDir, file));
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 图片 - 升级为层级存储 (images/zoneId/nodeId/)
ipcMain.handle('fs:save-image', async (_, { zoneId, nodeId, filename, base64Data }) => {
  try {
    const dir = getMediaDir('images', zoneId, nodeId);
    await ensureDir(dir);

    let safeName = sanitize(filename);
    if (!safeName.endsWith('.png')) safeName += '.png';
    const base64String = base64Data.split(',')[1] || base64Data;

    await fs.writeFile(path.join(dir, safeName), Buffer.from(base64String, 'base64'));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:has-image', async (_, { zoneId, nodeId, filename }) => {
  try {
    const dir = getMediaDir('images', zoneId, nodeId);
    let safeName = sanitize(filename);
    if (!safeName.endsWith('.png')) safeName += '.png';
    return { success: true, exists: fsSync.existsSync(path.join(dir, safeName)) };
  } catch { return { success: true, exists: false }; }
});

ipcMain.handle('fs:load-image', async (_, { zoneId, nodeId, filename }) => {
  try {
    const dir = getMediaDir('images', zoneId, nodeId);
    let safeName = sanitize(filename);
    if (!safeName.endsWith('.png')) safeName += '.png';

    const filePath = path.join(dir, safeName);
    if (!fsSync.existsSync(filePath)) return { success: true, data: null };
    const buffer = await fs.readFile(filePath);
    return { success: true, data: `data:image/png;base64,${buffer.toString('base64')}` };
  } catch (error) {
    return { success: false, error: error.message, data: null };
  }
});

// 列出某个节点下的所有图片
ipcMain.handle('fs:list-images', async (_, { zoneId, nodeId }) => {
  try {
    const dir = getMediaDir('images', zoneId, nodeId);
    if (!fsSync.existsSync(dir)) return { success: true, files: [] };
    const files = (await fs.readdir(dir)).filter(f => f.endsWith('.png'));
    return { success: true, files };
  } catch (error) {
    return { success: false, error: error.message, files: [] };
  }
});

// 获取下一个可用的图片编号 (基于节点目录，纯数字命名)
ipcMain.handle('fs:get-next-image-index', async (_, { zoneId, nodeId }) => {
  try {
    const dir = getMediaDir('images', zoneId, nodeId);
    if (!fsSync.existsSync(dir)) return { success: true, index: 1 };

    const files = (await fs.readdir(dir)).filter(f => /^\d+\.png$/i.test(f));
    if (files.length === 0) return { success: true, index: 1 };

    const indices = files.map(f => parseInt(f.match(/^(\d+)\.png$/i)[1], 10));
    return { success: true, index: Math.max(...indices) + 1 };
  } catch (error) {
    return { success: false, error: error.message, index: 1 };
  }
});

// 视频 - 升级为层级存储
ipcMain.handle('fs:save-video', async (_, { zoneId, nodeId, filename, videoUrl }) => {
  try {
    const dir = getMediaDir('videos', zoneId, nodeId);
    await ensureDir(dir);

    let safeName = sanitize(filename);
    if (!safeName.endsWith('.mp4')) safeName += '.mp4';
    const filePath = path.join(dir, safeName);

    if (videoUrl.startsWith('http')) {
      const res = await fetch(videoUrl);
      const buffer = Buffer.from(await res.arrayBuffer());
      await fs.writeFile(filePath, buffer);
    } else if (videoUrl.startsWith('data:video')) {
      await fs.writeFile(filePath, Buffer.from(videoUrl.split(',')[1], 'base64'));
    } else {
      return { success: false, error: '不支持的格式' };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:has-video', async (_, { zoneId, nodeId, filename }) => {
  try {
    const dir = getMediaDir('videos', zoneId, nodeId);
    let safeName = sanitize(filename);
    if (!safeName.endsWith('.mp4')) safeName += '.mp4';
    return { success: true, exists: fsSync.existsSync(path.join(dir, safeName)) };
  } catch { return { success: true, exists: false }; }
});

ipcMain.handle('fs:get-video-path', async (_, { zoneId, nodeId, filename }) => {
  try {
    const dir = getMediaDir('videos', zoneId, nodeId);
    let safeName = sanitize(filename);
    if (!safeName.endsWith('.mp4')) safeName += '.mp4';
    const filePath = path.join(dir, safeName);
    if (!fsSync.existsSync(filePath)) return { success: true, path: null };
    return { success: true, path: `file://${filePath}` };
  } catch (error) {
    return { success: false, error: error.message, path: null };
  }
});

// 列出某个节点下的所有视频
ipcMain.handle('fs:list-videos', async (_, { zoneId, nodeId }) => {
  try {
    const dir = getMediaDir('videos', zoneId, nodeId);
    if (!fsSync.existsSync(dir)) return { success: true, files: [] };
    const files = (await fs.readdir(dir)).filter(f => f.endsWith('.mp4'));
    return { success: true, files };
  } catch (error) {
    return { success: false, error: error.message, files: [] };
  }
});

// 获取下一个可用的视频编号 (基于节点目录，纯数字命名)
ipcMain.handle('fs:get-next-video-index', async (_, { zoneId, nodeId }) => {
  try {
    const dir = getMediaDir('videos', zoneId, nodeId);
    if (!fsSync.existsSync(dir)) return { success: true, index: 1 };

    const files = (await fs.readdir(dir)).filter(f => /^\d+\.mp4$/i.test(f));
    if (files.length === 0) return { success: true, index: 1 };

    const indices = files.map(f => parseInt(f.match(/^(\d+)\.mp4$/i)[1], 10));
    return { success: true, index: Math.max(...indices) + 1 };
  } catch (error) {
    return { success: false, error: error.message, index: 1 };
  }
});

// 音频 - 升级为层级存储
ipcMain.handle('fs:save-audio', async (_, { zoneId, nodeId, filename, base64Data }) => {
  try {
    const dir = getMediaDir('audios', zoneId, nodeId);
    await ensureDir(dir);

    let safeName = sanitize(filename);
    if (!safeName.endsWith('.mp3')) safeName += '.mp3';
    const base64String = base64Data.split(',')[1] || base64Data;
    await fs.writeFile(path.join(dir, safeName), Buffer.from(base64String, 'base64'));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:load-audio', async (_, { zoneId, nodeId, filename }) => {
  try {
    const dir = getMediaDir('audios', zoneId, nodeId);
    let safeName = sanitize(filename);
    if (!safeName.endsWith('.mp3')) safeName += '.mp3';
    const filePath = path.join(dir, safeName);
    if (!fsSync.existsSync(filePath)) return { success: true, data: null };
    const buffer = await fs.readFile(filePath);
    return { success: true, data: `data:audio/mp3;base64,${buffer.toString('base64')}` };
  } catch (error) {
    return { success: false, error: error.message, data: null };
  }
});

// 物品数据库
ipcMain.handle('fs:save-items', async (_, { items }) => {
  try {
    await fs.writeFile(path.join(getAppDataPath(), 'items', 'items_database.json'), JSON.stringify(items, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:load-items', async () => {
  try {
    const filePath = path.join(getAppDataPath(), 'items', 'items_database.json');
    if (!fsSync.existsSync(filePath)) return { success: true, data: null };
    return { success: true, data: JSON.parse(await fs.readFile(filePath, 'utf-8')) };
  } catch (error) {
    return { success: false, error: error.message, data: null };
  }
});

// 游戏存档
ipcMain.handle('fs:save-game', async (_, { saveName, saveData }) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = saveName ? `${sanitize(saveName)}.json` : `save_${timestamp}.json`;
    await fs.writeFile(path.join(getAppDataPath(), 'saves', fileName), JSON.stringify(saveData, null, 2), 'utf-8');
    return { success: true, fileName };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:list-saves', async () => {
  try {
    const savesDir = path.join(getAppDataPath(), 'saves');
    if (!fsSync.existsSync(savesDir)) return { success: true, files: [] };
    const files = (await fs.readdir(savesDir)).filter(f => f.endsWith('.json'));
    const saveFiles = await Promise.all(files.map(async (file) => {
      const stats = await fs.stat(path.join(savesDir, file));
      return { name: file, size: stats.size, modified: stats.mtime };
    }));
    return { success: true, files: saveFiles };
  } catch (error) {
    return { success: false, error: error.message, files: [] };
  }
});

ipcMain.handle('fs:load-game', async (_, { fileName }) => {
  try {
    const filePath = path.join(getAppDataPath(), 'saves', sanitize(fileName));
    if (!fsSync.existsSync(filePath)) return { success: false, error: '存档不存在', data: null };
    return { success: true, data: JSON.parse(await fs.readFile(filePath, 'utf-8')) };
  } catch (error) {
    return { success: false, error: error.message, data: null };
  }
});

ipcMain.handle('fs:delete-save', async (_, { fileName }) => {
  try {
    const filePath = path.join(getAppDataPath(), 'saves', sanitize(fileName));
    if (fsSync.existsSync(filePath)) await fs.unlink(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 配置
ipcMain.handle('fs:save-config', async (_, { config }) => {
  try {
    await fs.writeFile(path.join(getAppDataPath(), 'config.json'), JSON.stringify(config, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:load-config', async () => {
  try {
    const filePath = path.join(getAppDataPath(), 'config.json');
    if (!fsSync.existsSync(filePath)) return { success: true, data: null };
    return { success: true, data: JSON.parse(await fs.readFile(filePath, 'utf-8')) };
  } catch (error) {
    return { success: false, error: error.message, data: null };
  }
});

// 调试原始日志
ipcMain.handle('fs:save-raw-log', async (_, { filename, content }) => {
  try {
    const logDir = path.join(getAppDataPath(), 'logs');
    await ensureDir(logDir);
    const filePath = path.join(logDir, sanitize(filename));
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// NPC 记忆与对话按名称独立落盘保存 (memory/<npcName>/)
ipcMain.handle('fs:save-npc-memory', async (_, { npcName, dialogue, memory }) => {
  try {
    const memDir = path.join(getAppDataPath(), 'memory', sanitize(npcName || 'unknown'));
    await ensureDir(memDir);
    if (dialogue) {
      await fs.writeFile(path.join(memDir, 'dialogue.json'), JSON.stringify(dialogue, null, 2), 'utf-8');
    }
    if (memory) {
      await fs.writeFile(path.join(memDir, 'pyramid.json'), JSON.stringify(memory, null, 2), 'utf-8');
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:load-npc-memory', async (_, { npcName }) => {
  try {
    const memDir = path.join(getAppDataPath(), 'memory', sanitize(npcName || 'unknown'));
    if (!fsSync.existsSync(memDir)) return { success: true, dialogue: null, memory: null };
    let dialogue = null;
    let memory = null;
    const diagPath = path.join(memDir, 'dialogue.json');
    const pyrPath = path.join(memDir, 'pyramid.json');
    if (fsSync.existsSync(diagPath)) {
      dialogue = JSON.parse(await fs.readFile(diagPath, 'utf-8'));
    }
    if (fsSync.existsSync(pyrPath)) {
      memory = JSON.parse(await fs.readFile(pyrPath, 'utf-8'));
    }
    return { success: true, dialogue, memory };
  } catch (error) {
    return { success: false, error: error.message, dialogue: null, memory: null };
  }
});

// 多人格组/记忆档案管理 (memory/<npcName>/<profileId>/)
ipcMain.handle('fs:list-npc-profiles', async (_, { npcName }) => {
  try {
    const memDir = path.join(getAppDataPath(), 'memory', sanitize(npcName || 'unknown'));
    if (!fsSync.existsSync(memDir)) return { success: true, profiles: [] };

    const entries = await fs.readdir(memDir, { withFileTypes: true });
    const profiles = [];

    // 兼容根目录默认记录
    if (fsSync.existsSync(path.join(memDir, 'dialogue.json')) || fsSync.existsSync(path.join(memDir, 'pyramid.json'))) {
      const stat = fsSync.statSync(path.join(memDir, 'dialogue.json'));
      profiles.push({
        profileId: 'default',
        name: '默认传统组',
        lastModified: stat ? stat.mtimeMs : Date.now()
      });
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subDir = path.join(memDir, entry.name);
        const metaPath = path.join(subDir, 'meta.json');
        let metaName = entry.name;
        let lastModified = Date.now();
        if (fsSync.existsSync(metaPath)) {
          try {
            const parsed = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
            metaName = parsed.name || entry.name;
            lastModified = parsed.lastModified || lastModified;
          } catch { }
        } else {
          const stat = fsSync.statSync(subDir);
          lastModified = stat ? stat.mtimeMs : lastModified;
        }
        profiles.push({
          profileId: entry.name,
          name: metaName,
          lastModified
        });
      }
    }

    profiles.sort((a, b) => b.lastModified - a.lastModified);
    return { success: true, profiles };
  } catch (error) {
    return { success: false, error: error.message, profiles: [] };
  }
});

ipcMain.handle('fs:save-npc-memory-profile', async (_, { npcName, profileId, dialogue, memory, metaName }) => {
  try {
    const pId = sanitize(profileId || 'default');
    const memDir = path.join(getAppDataPath(), 'memory', sanitize(npcName || 'unknown'), pId);
    await ensureDir(memDir);
    if (dialogue) {
      await fs.writeFile(path.join(memDir, 'dialogue.json'), JSON.stringify(dialogue, null, 2), 'utf-8');
    }
    if (memory) {
      await fs.writeFile(path.join(memDir, 'pyramid.json'), JSON.stringify(memory, null, 2), 'utf-8');
    }
    const meta = {
      profileId: pId,
      name: metaName || pId,
      lastModified: Date.now()
    };
    await fs.writeFile(path.join(memDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:load-npc-memory-profile', async (_, { npcName, profileId }) => {
  try {
    const pId = sanitize(profileId || 'default');
    let memDir = path.join(getAppDataPath(), 'memory', sanitize(npcName || 'unknown'), pId);
    // 兼容根目录模式
    if (pId === 'default' && !fsSync.existsSync(memDir)) {
      memDir = path.join(getAppDataPath(), 'memory', sanitize(npcName || 'unknown'));
    }
    if (!fsSync.existsSync(memDir)) return { success: true, dialogue: null, memory: null, meta: null };
    let dialogue = null;
    let memory = null;
    let meta = null;
    const diagPath = path.join(memDir, 'dialogue.json');
    const pyrPath = path.join(memDir, 'pyramid.json');
    const metaPath = path.join(memDir, 'meta.json');
    if (fsSync.existsSync(diagPath)) dialogue = JSON.parse(await fs.readFile(diagPath, 'utf-8'));
    if (fsSync.existsSync(pyrPath)) memory = JSON.parse(await fs.readFile(pyrPath, 'utf-8'));
    if (fsSync.existsSync(metaPath)) meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
    return { success: true, dialogue, memory, meta };
  } catch (error) {
    return { success: false, error: error.message, dialogue: null, memory: null, meta: null };
  }
});

ipcMain.handle('fs:delete-npc-profile', async (_, { npcName, profileId }) => {
  try {
    const pId = sanitize(profileId || '');
    if (!pId) return { success: false, error: 'Invalid profileId' };
    const memDir = path.join(getAppDataPath(), 'memory', sanitize(npcName || 'unknown'), pId);
    if (fsSync.existsSync(memDir)) {
      await fs.rm(memDir, { recursive: true, force: true });
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==================== 叙事库（玩家自建的恐怖域 / 元 / 美学） ====================

const getNarrativeLibraryPath = () => path.join(getAppDataPath(), 'narrative', 'narrative_library.json');

ipcMain.handle('fs:save-narrative-library', async (_, { library }) => {
  try {
    const dir = path.join(getAppDataPath(), 'narrative');
    await ensureDir(dir);
    await fs.writeFile(getNarrativeLibraryPath(), JSON.stringify(library, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:load-narrative-library', async () => {
  try {
    const filePath = getNarrativeLibraryPath();
    if (!fsSync.existsSync(filePath)) return { success: true, data: null };
    return { success: true, data: JSON.parse(await fs.readFile(filePath, 'utf-8')) };
  } catch (error) {
    return { success: false, error: error.message, data: null };
  }
});