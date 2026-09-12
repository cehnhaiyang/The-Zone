/**
 * AI 设施升级定价服务 (Facility Upgrade Pricing Service)
 *
 * 让 LLM 根据设施等级、每日产出与庇护所资源丰裕度，
 * 裁决一次设施升级应当消耗多少废料（产出契约：{ scrapCost, reason }）。
 * LLM 不可用 / 解析失败时降级回引擎公式（20 + level × 15）。
 */

import { PlayerState, Sanctuary, Settings } from '../../meta';
import { BaseProvider, AIResponse } from './providers/base';
import { callAi } from './providers';

//=============================================================================
// 类型
//=============================================================================

export interface FacilityUpgradePricingContext {
    sanctuary: Sanctuary;
    player: PlayerState;
    facilityId: string;
}

interface FacilityUpgradePricingResult {
    scrapCost: number;
    reason?: string;
}

//=============================================================================
// Prompt 构建
//=============================================================================

const buildFacilityUpgradePrompt = (input: FacilityUpgradePricingContext): string => {
    const { sanctuary, player, facilityId } = input;

    const facility = (sanctuary.facility ?? []).find((f) => f.id === facilityId);
    if (!facility) return '';

    const productionText = Object.entries(facility.production ?? {})
        .map(([key, value]) => `${key} ${value > 0 ? '+' : ''}${value}`)
        .join('，');

    return `
# 角色
你是宇宙恐怖生存 RPG 中庇护所设施维护的定价架构师。
请裁决一次设施升级应当消耗多少废料（scraps），并给出简短理由。

# 目标设施
- 名称：${facility.name}
- 当前等级：${facility.level}
- 挂载节点：${facility.nodeMounted}
- 目前每日产出：${productionText || '无'}
- 功能描述：${facility.desc || '无'}

# 庇护所现状
- 名称：${sanctuary.name}
- 废料库存：${sanctuary.scraps}
- 食物 ${sanctuary.food} / 水 ${sanctuary.water} / 药品 ${sanctuary.medicine}
- 电力 ${sanctuary.electricity} / 人口 ${sanctuary.population} / 士气 ${sanctuary.morale} / 侵蚀度 ${sanctuary.erosion}

# 玩家当前
- HP ${player.dynamic.hp} / 理智 ${player.dynamic.sanity} / 体力 ${player.dynamic.stamina}

# 定价规则
1. 输出 scrapCost 为**正整数**，代表本次升级消耗的废料。
2. 基准参照："基础价 20 + 等级 × 15"。等级越高、产出越强的设施升级代价应越大。
3. 结合庇护所废料库存权衡：库存充裕时裁决可接近基准；库存枯竭时压低价格，
   不应一次性清空库存导致庇护所失去运营余地。
4. 升级收益（产出提升 → 支撑人口）是成立的，但高侵蚀 / 低士气时期价格应更保守。
5. 严禁输出 Markdown 或前言后语，只输出合法 JSON：{"scrapCost": 数值, "reason": "一句话理由"}。
`.trim();
};

//=============================================================================
// 对外导出
//=============================================================================

export function getFacilityUpgradePrompt(input: FacilityUpgradePricingContext): string {
    return buildFacilityUpgradePrompt(input);
}

/**
 * LLM 裁决一次设施升级的废料消耗。
 *
 * @param settings 游戏全局配置（facilityUpgradeModel）
 * @param input 设施与庇护所状态输入
 * @returns 应消耗的 scrapCost；任何失败都会降级回引擎公式
 */
export const priceFacilityUpgrade = async (
    settings: Settings,
    input: FacilityUpgradePricingContext
): Promise<number> => {
    const facility = (input.sanctuary.facility ?? []).find((f) => f.id === input.facilityId);
    const fallback = 20 + (facility?.level ?? 0) * 15;

    BaseProvider.validateRequiredParams(
        { settings, input },
        ['settings', 'input'],
        'Facility Upgrade Pricing'
    );

    const modelToUse =
        settings.facilityUpgradeModel ??
        settings.dyNarrativeModel ??
        settings.npcDialogueModel;
    if (!modelToUse) {
        BaseProvider.logWarn('FacilityUpgrade', '未配置可用定价模型，已降级为引擎公式');
        return fallback;
    }

    const systemPrompt = buildFacilityUpgradePrompt(input);
    if (!systemPrompt) {
        BaseProvider.logWarn('FacilityUpgrade', '设施不存在，已降级为引擎公式');
        return fallback;
    }

    const startTime = Date.now();

    try {
        const result = (await callAi(settings, {
            providerId: modelToUse.provider,
            model: modelToUse.model,
            capability: 'npcDialogue',
            systemPrompt,
            userPrompt: '裁决本次设施升级的废料消耗。',
            jsonMode: true,
        })) as AIResponse;

        BaseProvider.logInfo(
            'FacilityUpgrade',
            `大模型响应成功，IO 耗时: ${Date.now() - startTime}ms`
        );

        const { data, success } = BaseProvider.safeJSONParseWithInfo<FacilityUpgradePricingResult>(
            result.text,
            { scrapCost: fallback }
        );

        if (!success || !data || !Number.isFinite(data.scrapCost) || data.scrapCost <= 0) {
            BaseProvider.logWarn('FacilityUpgrade', '定价解析失败或非正数，已降级为引擎公式');
            return fallback;
        }

        // 约束：不超过当前库存（避免裁决出玩家无法承受的价格），且不低于 1。
        const maxAffordable = Math.max(1, Math.floor(safeNumberCapped(input.sanctuary.scraps)));
        const cost = Math.min(maxAffordable, Math.floor(data.scrapCost));

        BaseProvider.logInfo(
            'FacilityUpgrade',
            `LLM 裁决废料消耗: ${cost}${data.reason ? `（${data.reason}）` : ''}`
        );

        return Math.max(1, cost);
    } catch (error: unknown) {
        BaseProvider.logError(
            'FacilityUpgrade',
            error,
            { elapsedMs: Date.now() - startTime, model: modelToUse }
        );

        return BaseProvider.handleServiceError(
            error,
            'Facility Upgrade Pricing',
            { model: modelToUse },
            fallback
        ) as number;
    }
};

/** 取整且不小于 1 的库存值（约束 LLM 价格上限）。 */
const safeNumberCapped = (value: unknown): number => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 1;
};