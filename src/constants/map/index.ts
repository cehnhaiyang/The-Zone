import type { BattleMap, Cover } from '../../meta';
import { HOSPITAL_COVERS, HOSPITAL_MAPS } from './hospital';
import { BUNKER_COVERS, BUNKER_MAPS } from './bunker';
import { ARCHIVE_COVERS, ARCHIVE_MAPS } from './archive';

/**
 * 全局保底默认战场地图
 *
 * 规格：标准线性战线 [-12, 12]，单轨，无额外掩体与环境惩罚。
 */
export const DEFAULT_BATTLE_MAP: BattleMap = {
    desc: '视野平坦的标准线性交战走廊，无明显掩体阻隔。',
    depthRange: [-12, 12],
    laneCount: 1,
    covers: [],
};

/**
 * 区域与节点地图全局注册表
 *
 * 结构：zoneId -> nodeId -> BattleMap
 */
export const BATTLE_MAP_REGISTRY: Record<string, Record<string, BattleMap>> = {
    hospital: HOSPITAL_MAPS,
    bunker: BUNKER_MAPS,
    archive: ARCHIVE_MAPS,
};

/**
 * 区域掩体定义注册表
 *
 * 结构：zoneId -> coverId -> Cover
 *
 * 战场地图的 covers 字段只登记 `[coverId, x, y]` 落点，
 * 覆盖率、可通行性、耐久等属性在此按区域解析。
 */
const COVER_REGISTRY: Record<string, Record<string, Cover>> = {
    hospital: HOSPITAL_COVERS,
    bunker: BUNKER_COVERS,
    archive: ARCHIVE_COVERS,
};

/**
 * 查询某区域的掩体定义表（未登记区域返回空表）。
 */
export const getCoverDefinitions = (zoneId?: string): Record<string, Cover> =>
    (zoneId ? COVER_REGISTRY[zoneId] : undefined) ?? {};

/**
 * 按 ID 全局扁平化索引（用于 map 字段显式跨区域指定）
 */
const FLAT_MAP_BY_ID: Record<string, BattleMap> = {
    default: DEFAULT_BATTLE_MAP,
    ...HOSPITAL_MAPS,
    ...BUNKER_MAPS,
    ...ARCHIVE_MAPS,
};

/**
 * 战场地图查表器
 *
 * 决策优先级流水线：
 * 1. 若显式指定了 mapOverride（即 node.map 字符串）：
 *    在全局索引与区域索引中精确匹配对应地图；未找到时抛出警告并回退至全局默认地图。
 * 2. 若未显式指定 mapOverride：
 *    - 扫描并优先匹配当前区域下以当前节点名 (nodeId) 注册的地图；
 *    - 若未找到，匹配当前区域的通用默认地图 (zoneId/default)；
 *    - 若依然未找到，抛出警告并回退至全局默认地图 (DEFAULT_BATTLE_MAP)。
 *
 * @param zoneId 区域标识符（如 'hospital'）
 * @param nodeId 节点标识符（如 'sterilization_room'）
 * @param mapOverride 节点模板中显式配置的 map 字段值
 */
export const getBattleMap = (
    zoneId?: string,
    nodeId?: string,
    mapOverride?: string
): BattleMap => {
    // 1. 显式覆盖优先
    if (mapOverride && typeof mapOverride === 'string' && mapOverride.trim().length > 0) {
        const trimmed = mapOverride.trim();
        // 先在全局扁平表中查找
        if (FLAT_MAP_BY_ID[trimmed]) {
            return FLAT_MAP_BY_ID[trimmed];
        }
        // 尝试在当前 zone 下按 nodeId 别名查
        if (zoneId && BATTLE_MAP_REGISTRY[zoneId]?.[trimmed]) {
            return BATTLE_MAP_REGISTRY[zoneId][trimmed];
        }
        console.warn(
            `[BattleMap] 节点显式配置的地图标识符 "${trimmed}" 未在注册表中找到，回退到全局默认地图。`
        );
        return DEFAULT_BATTLE_MAP;
    }

    // 2. 约定匹配：根据 zoneId 与 nodeId 寻址
    if (zoneId && nodeId) {
        const zoneMaps = BATTLE_MAP_REGISTRY[zoneId];
        if (zoneMaps) {
            // 精确匹配节点专属地图
            if (zoneMaps[nodeId]) {
                return zoneMaps[nodeId];
            }
            // 匹配区域保底地图
            if (zoneMaps.default) {
                return zoneMaps.default;
            }
        }
    }

    // 3. 兜底回退
    if (zoneId || nodeId) {
        console.warn(
            `[BattleMap] 未检索到区域 "${zoneId ?? '未知'}" 节点 "${nodeId ?? '未知'}" 的专属地图，回退到全局默认地图。`
        );
    }
    return DEFAULT_BATTLE_MAP;
};