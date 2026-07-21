import { VisualLayoutConfig } from '../meta';
import { DEFAULT_LAYOUT_CONFIG } from '../constants/config';

/**
 * RenderService - 渲染逻辑核心服务
 * 
 * 负责处理与 UI 渲染相关的计算逻辑，包括：
 * 1. 布局配置的持久化存储与加载
 * 2. 神经矩阵 (Neural Matrix) 的底层参数计算
 * 3. 媒体资源显示的逻辑判定
 */
export class RenderService {
    private static readonly STORAGE_KEY = 'THE_ZONE_LAYOUT_CONFIG';

    /**
     * 从 localStorage 加载布局配置
     */
    static loadLayoutConfig(): VisualLayoutConfig {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (!saved) return DEFAULT_LAYOUT_CONFIG;

        try {
            return { ...DEFAULT_LAYOUT_CONFIG, ...JSON.parse(saved) };
        } catch (e) {
            console.error("加载布局配置失败:", e);
            return DEFAULT_LAYOUT_CONFIG;
        }
    }

    /**
     * 保存布局配置到 localStorage
     */
    static saveLayoutConfig(config: VisualLayoutConfig): void {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    }

    /**
     * 计算神经噪声矩阵参数
     * @param neuralNoiseLevel 神经噪声等级
     */
    static calculateMatrixParams(neuralNoiseLevel: number) {
        const safeLevel = Math.max(0, neuralNoiseLevel);
        const slope = 3 + (safeLevel * 10);
        const intercept = -0.8 + (Math.min(1, safeLevel / 3) * 0.6);
        return { slope, intercept };
    }

    /**
     * 获取指定颜色的 RGB 配置
     */
    static getColorRgb(color: string) {
        const colors: Record<string, { r: number, g: number, b: number }> = {
            green: { r: 0, g: 1, b: 0.2 },
            red: { r: 1, g: 0.1, b: 0.1 },
            purple: { r: 0.7, g: 0.2, b: 1 },
            amber: { r: 1, g: 0.6, b: 0 },
            cyan: { r: 0, g: 1, b: 1 }
        };
        return colors[color] || colors.cyan;
    }

    /**
     * 判断是否应显示特定媒体类型
     */
    static getDisplayMedia(params: {
        isCombat?: boolean;
        preferredMediaType: 'image' | 'video';
        imageUrl?: string;
        videoUrl?: string;
        overrideImageUrl?: string | null;
    }) {
        const { isCombat = false, preferredMediaType, imageUrl = '', videoUrl, overrideImageUrl } = params;

        const hasOverride = isCombat && !!overrideImageUrl;
        const displayImageUrl = hasOverride ? overrideImageUrl! : imageUrl;

        // 战斗状态或首选图片时，不显示视频
        const displayVideoUrl = (isCombat || preferredMediaType === 'image') ? undefined : videoUrl;

        return {
            displayImageUrl,
            displayVideoUrl,
            displayHasVideo: !!displayVideoUrl,
            hasOverride
        };
    }
}
