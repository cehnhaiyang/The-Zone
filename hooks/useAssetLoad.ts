import { useCallback } from 'react';
import { Zone, LogType, AssetType } from '../meta';
import { PersistenceService, AudioService } from '../services';

// --- 局部常量与辅助函数 ---
const REGEX_IMAGE_FILE = /^\d+\.png$/i;
const REGEX_VIDEO_FILE = /^\d+\.mp4$/i;

/**
 * 提取文件名中的数字索引 (例如 "12.mp4" -> 12)
 */
const extractFileIndex = (filename: string): number => {
    return parseInt(filename, 10) || 0;
};

/**
 * 资产业务分类
 */
export type AssetCategory = 'scene' | 'enemy' | 'npc' | 'player';

/**
 * 入参契约
 */
interface UseAssetLoadParams {
    currentZone: Zone;
    addLog: (text: string, type: LogType) => void;
    onUpdateAsset?: (mediaType: 'image' | 'video', type: AssetCategory, objId: string, url: string) => void;
}

/**
 * 出参契约
 */
interface UseAssetLoadReturn {
    autoLoadAssets: (category: AssetCategory, objId: string) => Promise<{ imageUrl: string | null; videoUrl: string | null }>;
    handleRandomSwitch: (mediaType: AssetType, category: AssetCategory, objId?: string, currentUrl?: string) => Promise<string | null>;
    hasMultipleVariants: (mediaType: AssetType, category: AssetCategory, objId?: string) => Promise<boolean>;
}

export const useAssetLoad = ({
    currentZone,
    addLog,
    onUpdateAsset,
}: UseAssetLoadParams): UseAssetLoadReturn => {

    const autoLoadAssets = useCallback(async (
        category: AssetCategory,
        objId: string
    ): Promise<{ imageUrl: string | null; videoUrl: string | null }> => {
        if (!PersistenceService.isReady) return { imageUrl: null, videoUrl: null };

        const archiveZone = category === 'npc' || category === 'player' ? 'character'
            : category === 'enemy' ? 'enemy'
                : currentZone.id;

        try {
            const videoFiles = await PersistenceService.listVideos(archiveZone, objId);
            const matchingVideos = videoFiles.filter(f => REGEX_VIDEO_FILE.test(f));

            if (matchingVideos.length > 0) {
                const maxIndex = Math.max(...matchingVideos.map(extractFileIndex));
                const videoUrl = await PersistenceService.getVideoPath(String(maxIndex), archiveZone, objId);
                if (videoUrl) {
                    addLog(`已加载本地视频资产。`, 'info');
                    return { imageUrl: null, videoUrl };
                }
            }

            const imageFiles = await PersistenceService.listImages(archiveZone, objId);
            const matchingImages = imageFiles.filter(f => REGEX_IMAGE_FILE.test(f));

            if (matchingImages.length > 0) {
                const targetFile = matchingImages[Math.floor(Math.random() * matchingImages.length)];
                const baseName = targetFile.split('.')[0];
                const imageUrl = await PersistenceService.loadImage(baseName, archiveZone, objId);
                if (imageUrl) {
                    addLog(`已加载本地图片资产。`, 'info');
                    return { imageUrl, videoUrl: null };
                }
            }

            return { imageUrl: null, videoUrl: null };
        } catch (error) {
            console.error(`[Asset Loader] 加载资产时发生异常:`, error);
            return { imageUrl: null, videoUrl: null };
        }
    }, [currentZone.id, addLog]);

    const handleRandomSwitch = useCallback(async (
        mediaType: AssetType,
        category: AssetCategory,
        objId?: string,
        currentUrl?: string
    ): Promise<string | null> => {
        if (!PersistenceService.isReady || !objId) return null;

        const archiveZone = category === 'npc' || category === 'player' ? 'character'
            : category === 'enemy' ? 'enemy'
                : currentZone.id;

        const isImage = mediaType === 'image';
        const extRegex = isImage ? REGEX_IMAGE_FILE : REGEX_VIDEO_FILE;

        try {
            const files = isImage
                ? await PersistenceService.listImages(archiveZone, objId)
                : await PersistenceService.listVideos(archiveZone, objId);

            const matchingFiles = files.filter(f => extRegex.test(f));

            if (matchingFiles.length <= 1) {
                addLog(`没有其他${isImage ? '视觉' : '视频'}变体可供切换。`, 'warning');
                return null;
            }

            for (let attempts = 0; attempts < 10; attempts++) {
                const targetFile = matchingFiles[Math.floor(Math.random() * matchingFiles.length)];
                const baseName = targetFile.split('.')[0];

                const loadedUrl = isImage
                    ? await PersistenceService.loadImage(baseName, archiveZone, objId)
                    : await PersistenceService.getVideoPath(baseName, archiveZone, objId);

                if (loadedUrl && loadedUrl !== currentUrl) {
                    AudioService.playSfx('click');
                    addLog(`已切换至另一${isImage ? '视觉' : '视频'}变体。`, 'info');
                    // 调用回调更新状态
                    if (onUpdateAsset && objId) {
                        onUpdateAsset(mediaType, category, objId, loadedUrl);
                    }
                    return loadedUrl;
                }
            }

            addLog(`多次尝试后未能找到不同变体。`, 'warning');
            return null;
        } catch (error) {
            console.error(`[Asset Loader] 切换资产变体时发生异常:`, error);
            addLog(`资源变体切换失败，请检查档案系统。`, 'critical');
            return null;
        }
    }, [currentZone.id, addLog]);

    const hasMultipleVariants = useCallback(async (
        mediaType: AssetType,
        category: AssetCategory,
        objId?: string
    ): Promise<boolean> => {
        if (!objId || !PersistenceService.isReady) return false;

        const archiveZone = category === 'npc' || category === 'player' ? 'character'
            : category === 'enemy' ? 'enemy'
                : currentZone.id;

        try {
            const files = mediaType === 'image'
                ? await PersistenceService.listImages(archiveZone, objId)
                : await PersistenceService.listVideos(archiveZone, objId);

            const regex = mediaType === 'image' ? REGEX_IMAGE_FILE : REGEX_VIDEO_FILE;
            return files.filter(f => regex.test(f)).length > 1;
        } catch (error) {
            console.error(`[Asset Loader] 检查变体数量时发生异常:`, error);
            return false;
        }
    }, [currentZone.id]);

    return {
        autoLoadAssets,
        handleRandomSwitch,
        hasMultipleVariants
    };
};