/**
 * Overlay 入参契约
 *
 * 各覆盖场景只消费其中一部分字段；集中声明一份，便于分发器整体透传
 * （`<XxxContent {...props} />`），避免为每个场景重复声明入参。
 */
import type { NodeTemplate, OverlayType } from '../../contract';

export interface OverlayProps {
    /** 覆盖层显示类型 */
    type: OverlayType;
    // 过场动画数据
    node?: NodeTemplate;
    nodeId?: string;
    onCutsceneComplete?: () => void;
    // 游戏结束数据
    deathReason?: string;
    onReset?: () => void;
    // 生成 / 加载数据
    status?: string;
    modelName?: string;
    startTime?: number;
    error?: string;
    onCancel?: () => void;
}
