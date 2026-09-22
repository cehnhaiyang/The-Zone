/**
 * AI 设施升级定价服务 (Facility Upgrade Pricing Service)
 *
 * 让 LLM 根据设施等级、每日产出与庇护所资源丰裕度，
 * 裁决一次设施升级用哪种资源支付、支付多少（产出契约：{ resourceId, amount, reason }）。
 * LLM 不可用 / 解析失败时降级回引擎兜底（优先废料，其次食物；基准 20 + level × 15）。
 */

import { PlayerState, Sanctuary, Settings, getSanctuaryResourceValue } from '../../meta';
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

/**
 * 设施升级定价结果。
 *
 * 契约允许任意一种资源充当升级货币，故必须同时给出资源键与数量。
 */
export interface FacilityUpgradePricingResult {
    /** 资源键：`food` / `water` 或独特资源 id */
    resourceId: string;
    /** 支付数量 */
    amount: number;
    reason?: string;
}

/**
 * 定价失败时的引擎兜底。
 *
 * 契约允许任意资源支付，故兜底只保证给出一个「当前确实持有」的支付方案：优先废料，其次食物。
 */
const buildFallbackPayment = (
    sanctuary: Sanctuary,
    level: number
): FacilityUpgradePricingResult => ({
    resourceId: getSanctuaryResourceValue(sanctuary, 'scraps') > 0 ? 'scraps' : 'food',
    amount: 20 + level * 15
});

//=============================================================================
// Prompt 构建
//=============================================================================

const buildFacilityUpgradePrompt = (input: FacilityUpgradePricingContext): string => {
    const { sanctuary, player, facilityId } = input;

    const facility = (sanctuary.facility ?? []).find((f) => f.id === facilityId);
    if (!facility) return '';

    const productionText = Object.entries(facility.function ?? {})
        .map(([key, value]) => {
            const amount = value ?? 0;
            return `${key} ${amount > 0 ? '+' : ''}${amount}`;
        })
        .join('，');

    return `
# 角色
你是宇宙恐怖生存 RPG 中庇护所设施维护的定价架构师。
请裁决一次设施升级应当消耗多少资源、以及用哪一种资源支付，并给出简短理由。

# 目标设施
- 名称：${facility.name}
- 当前等级：${facility.level}
- 挂载节点：${facility.nodeMounted}
- 目前每日产出：${productionText || '无'}
- 功能描述：${facility.desc || '无'}

# 庇护所现状
- 名称：${sanctuary.name}
- 人口 ${sanctuary.population} / 侵蚀度 ${sanctuary.erosion}
- 资源清单：
  - 食物（id: food）当前 ${sanctuary.necessaryResource.food}
  - 饮水（id: water）当前 ${sanctuary.necessaryResource.water}
${sanctuary.uniqueResource
            .map((entry) => `  - ${entry.name}（id: ${entry.id}）当前 ${entry.value}`)
            .join('\n')}

# 玩家当前
- HP ${player.dynamic.hp} / 理智 ${player.dynamic.sanity} / 体力 ${player.dynamic.stamina}

# 定价规则
1. 输出 resourceId 为支付所用的资源键，只能是上方资源清单中出现过的 id。
2. 输出 amount 为**正整数**，代表本次升级消耗该资源的数量。
3. 基准参照："基础价 20 + 等级 × 15"（以废料为等价物）。等级越高、产出越强的设施升级代价应越大；
   若选用更稀缺的资源支付，数量应相应压低。
4. 结合该资源的当前库存权衡：库存充裕时可接近基准；库存枯竭时压低数量，
   不应一次性清空库存导致庇护所失去运营余地。
5. 升级收益（产出提升 → 支撑人口）是成立的，但高侵蚀时期代价应更保守。
6. 严禁输出 Markdown 或前言后语，只输出合法 JSON：{"resourceId": "资源id", "amount": 数值, "reason": "一句话理由"}。
`.trim();
};

//=============================================================================
// 对外导出
//=============================================================================

export function getFacilityUpgradePrompt(input: FacilityUpgradePricingContext): string {
    return buildFacilityUpgradePrompt(input);
}

/**
 * LLM 裁决一次设施升级的支付代价（资源 + 数量）。
 *
 * @param settings 游戏全局配置（facilityUpgradeModel）
 * @param input 设施与庇护所状态输入
 * @returns 应支付的资源与数量；任何失败都会降级回引擎兜底
 */
export const priceFacilityUpgrade = async (
    settings: Settings,
    input: FacilityUpgradePricingContext
): Promise<FacilityUpgradePricingResult> => {
    const facility = (input.sanctuary.facility ?? []).find((f) => f.id === input.facilityId);
    const fallback = buildFallbackPayment(input.sanctuary, facility?.level ?? 0);

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
            userPrompt: '裁决本次设施升级的支付资源与数量。',
            jsonMode: true,
        })) as AIResponse;

        BaseProvider.logInfo(
            'FacilityUpgrade',
            `大模型响应成功，IO 耗时: ${Date.now() - startTime}ms`
        );

        const { data, success } = BaseProvider.safeJSONParseWithInfo<FacilityUpgradePricingResult>(
            result.text,
            fallback
        );

        if (!success || !data || !data.resourceId || !Number.isFinite(data.amount) || data.amount <= 0) {
            BaseProvider.logWarn('FacilityUpgrade', '定价解析失败或非法，已降级为引擎兜底');
            return fallback;
        }

        // 约束：不超过该资源当前库存（避免裁决出玩家无法支付的价格），且不低于 1。
        const stock = Math.floor(getSanctuaryResourceValue(input.sanctuary, data.resourceId));
        const amount = Math.max(1, Math.min(stock, Math.floor(data.amount)));

        BaseProvider.logInfo(
            'FacilityUpgrade',
            `LLM 裁决升级代价: ${amount} ${data.resourceId}${data.reason ? `（${data.reason}）` : ''}`
        );

        return { resourceId: data.resourceId, amount };
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
        ) as FacilityUpgradePricingResult;
    }
};