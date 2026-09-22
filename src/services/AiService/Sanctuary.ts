/**
 * AI 庇护所事件服务 (Sanctuary Event Service)
 *
 * 根据庇护所当前状态与居民池，让 LLM 构思日常事件与抉择
 * （产出契约见 SanctuaryEvent，嵌入 SANCTUARY_EVENT_GENERATION_SCHEMA）。
 */

import { Settings, SanctuaryEvent, SanctuaryEventGenerationContext } from '../../meta';
import { BaseProvider, AIResponse } from './providers/base';
import { callAi } from './providers';

import { SANCTUARY_EVENT_GENERATION_SCHEMA } from '../../constants/schema';

//=============================================================================
// Prompt 构建
//=============================================================================

const buildSanctuaryEventPrompt = (input: SanctuaryEventGenerationContext): string => {
    const {
        sanctuary,
        player,
        time,
        lastEventDesc,
    } = input;

    const dailyProduction = (sanctuary.facility ?? [])
        .map((f) => {
            const parts = Object.entries(f.function ?? {})
                .map(([key, value]) => {
                    const amount = value ?? 0;
                    return `${key} ${amount > 0 ? '+' : ''}${amount}`;
                })
                .join('，');
            return `【${f.name}】Lv.${f.level}（挂载：${f.nodeMounted}）—— 每日 ${parts}`;
        })
        .join('\n');

    // 资源清单 = 必要资源（food / water）+ 独特资源，impact.resource 只允许使用这里的键。
    const necessaryText =
        `- 食物（id: food）当前 ${sanctuary.necessaryResource.food}\n` +
        `- 饮水（id: water）当前 ${sanctuary.necessaryResource.water}`;

    const uniqueText = sanctuary.uniqueResource
        .map((entry) => {
            const rate = (entry.consumptionRate ?? 0) > 0
                ? `，每人每日消耗 ${entry.consumptionRate}`
                : '，不随日常消耗';
            return `- ${entry.name}（id: ${entry.id}）当前 ${entry.value}${rate}：${entry.desc}`;
        })
        .join('\n');

    const resourceText = [necessaryText, uniqueText].filter(Boolean).join('\n');

    const residentsText = (sanctuary.residents ?? []).length > 0
        ? (sanctuary.residents ?? []).map((r) => `- ${r.name}（hp ${r.hp} / san ${r.san}）`).join('\n')
        : '（暂无在册居民，居民池为空）';

    return `
# 角色
你是宇宙恐怖生存 RPG 中庇护所日常事件的架构师。
请根据庇护所当前运转状况，生成一个发生在庇护所内的【日常事件】及其抉择。

# 当前庇护所状态
- 名称：${sanctuary.name}
- 第 ${time.day} 天，时段 ${time.cycle} / ${time.tick}
- 人口 ${sanctuary.population} / 侵蚀度 ${sanctuary.erosion}
- 资源清单：
${resourceText || '（该庇护所暂无资源）'}

# 设施与每日产出
${dailyProduction || '（暂无设施）'}

# 在册居民
${residentsText}

# 玩家当前
- HP ${player.dynamic.hp} / 理智 ${player.dynamic.sanity} / 体力 ${player.dynamic.stamina}
- 当前定位：${player.location?.currentLocation?.node?.name ?? '庇护所内'}${lastEventDesc ? `\n- 上次事件余波：${lastEventDesc}` : ''}

# 事件设计规则
1. 事件必须贴合庇护所资源与居民池现状，是有据可依的"运转问题"，而非凭空灾难。
2. choices 提供 2~3 个抉择，每个抉择的 impact 必须明确具体数字；
   impact.resource 的键只能是上方资源清单中出现过的 id。
3. residents 变更与居民池强相关：只有居民池非空时才能写下失去/点名操作；
   居民池为空时请用正数（自然增长）或省略 residents。
4. 保持宇宙恐怖基调：即使是日常事件，也要有潜伏的诡异感。
5. 严禁输出 Markdown 或前言后语，只输出合法 JSON。

# Schema
请严格按以下 Schema 输出庇护所事件：

${SANCTUARY_EVENT_GENERATION_SCHEMA}

# 输出规则
只输出 JSON 对象本身，对象包含 desc 与 choices 两个键。
`.trim();
};

//=============================================================================
// 对外导出
//=============================================================================

export function getSanctuaryEventPrompt(input: SanctuaryEventGenerationContext): string {
    return buildSanctuaryEventPrompt(input);
}

/**
 * 生成庇护所日常事件。
 *
 * @param settings 游戏全局配置
 * @param input 庇护所状态输入
 * @returns 解析后的事件上下文（降级返回基础空事件）
 */
export const generateSanctuaryEvent = async (
    settings: Settings,
    input: SanctuaryEventGenerationContext
): Promise<SanctuaryEvent> => {
    BaseProvider.validateRequiredParams(
        { settings, input },
        ['settings', 'input'],
        'Sanctuary Event Generation'
    );

    const modelToUse =
        settings.sanctuaryEventModel ??
        settings.npcDialogueModel ??
        settings.dyNarrativeModel;
    if (!modelToUse) {
        BaseProvider.logWarn('SanctuaryEvent', '未配置可用事件生成模型，已降级返回空事件');
        return { desc: '', choices: [] };
    }

    const systemPrompt = buildSanctuaryEventPrompt(input);

    BaseProvider.logInfo(
        'SanctuaryEvent',
        `系统提示词构建完成，最终字符长度: ${systemPrompt.length}`
    );

    const startTime = Date.now();

    try {
        const result = (await callAi(settings, {
            providerId: modelToUse.provider,
            model: modelToUse.model,
            capability: 'npcDialogue',
            systemPrompt,
            userPrompt: '生成庇护所日常事件 JSON。',
            jsonMode: true,
        })) as AIResponse;

        const elapsed = Date.now() - startTime;

        BaseProvider.logInfo('SanctuaryEvent', `大模型响应成功，IO 耗时: ${elapsed}ms`);

        const { data, success } = BaseProvider.safeJSONParseWithInfo<SanctuaryEvent>(
            result.text,
            { desc: '', choices: [] }
        );

        if (!success || !data || !data.desc) {
            BaseProvider.logWarn('SanctuaryEvent', '事件解析失败或为空，返回降级空事件');
            return { desc: '', choices: [] };
        }

        return data;
    } catch (error: unknown) {
        const elapsed = Date.now() - startTime;

        BaseProvider.logError('SanctuaryEvent', error, {
            elapsedMs: elapsed,
            model: modelToUse,
        });

        return BaseProvider.handleServiceError(
            error,
            'Sanctuary Event Generation',
            { model: modelToUse },
            { desc: '', choices: [] }
        ) as SanctuaryEvent;
    }
};