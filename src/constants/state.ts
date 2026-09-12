/**
 * @file 状态描述配置 —— 叙事管线与社交管线共享
 * 将玩家/NPC 各项数值的百分比映射为严重等级与对应的描述/叙事文本。
 */
import { SeverityLevel, StateConfig } from '../meta';

/** 判定严重等级 */
export const getSeverity = (percent: number, config: Record<SeverityLevel, StateConfig>): SeverityLevel => {
    if (percent < config[SeverityLevel.CRITICAL].threshold) return SeverityLevel.CRITICAL;
    if (percent < config[SeverityLevel.SEVERE].threshold) return SeverityLevel.SEVERE;
    if (percent < config[SeverityLevel.MODERATE].threshold) return SeverityLevel.MODERATE;
    return SeverityLevel.NORMAL;
};

export const HP_STATE_CONFIG: Record<SeverityLevel, StateConfig> = {
    [SeverityLevel.CRITICAL]: {
        threshold: 30,
        description: (hp: number, max: number) => `HP: ${hp}/${max} — 濒危状态。脏器似乎在内部尖叫。每一次呼吸都是对虚空的乞求。语言支离破碎，疼痛如果实般坠落。`,
        narrative: (pct: number) => `【濒死感知】生命值 ${pct.toFixed(1)}%。视界开始染上褪色的铁锈红。环境实体变得透明且具威胁性——墙壁似乎在脉动，喉咙里满是干涸的血腥味。正成为这片废墟的一部分。`
    },
    [SeverityLevel.SEVERE]: {
        threshold: 60,
        description: (hp: number, max: number) => `HP: ${hp}/${max} — 重伤。由于疼痛，无法长时间维持集中视线。肢体颤抖，试图将外流的力量锁进躯壳。`,
        narrative: (pct: number) => `【重创感知】生命值 ${pct.toFixed(1)}%。光线变得粘稠且刺眼。伤口的节奏与环境中的风声同步。重力增加了，每走一步都像是在拖动沉重的影子。`
    },
    [SeverityLevel.MODERATE]: {
        threshold: 80,
        description: (hp: number, max: number) => `HP: ${hp}/${max} — 轻伤。空气中弥漫着危险的静电感。伤口隐隐作痛。`,
        narrative: (pct: number) => `【不适感知】生命值 ${pct.toFixed(1)}%。环境边缘出现了细微的重影。空气中有一种若有若无的金属味。`
    },
    [SeverityLevel.NORMAL]: {
        threshold: 100,
        description: (hp: number, max: number) => `HP: ${hp}/${max} — 状态尚可。还能勉强维持理性的体面。`,
        narrative: () => ''
    }
};

export const SANITY_STATE_CONFIG: Record<SeverityLevel, StateConfig> = {
    [SeverityLevel.CRITICAL]: {
        threshold: 30,
        description: (val: number, max: number) => `理智: ${val}/${max} — 精神崩坏。看到事物褪去外壳后的真实样貌。开始理解某种无法言说的真理，而这种理解让人无法言语。`,
        narrative: (pct: number) => `【认知坍塌】理智 ${pct.toFixed(1)}%。叙事逻辑开始自我反噬——影子在独立行动，耳语声取代了寂静。无法分辨哪些是回忆，哪些是眼前的实相。环境被异态扭曲，出现不属于这个维度的细节。`
    },
    [SeverityLevel.SEVERE]: {
        threshold: 60,
        description: (val: number, max: number) => `理智: ${val}/${max} — 精神失常。偏执如毒素般扩散。怀疑每一个影子的目的，确信墙壁正在倾听。`,
        narrative: (pct: number) => `【失常感知】理智 ${pct.toFixed(1)}%。环境比例失调——走廊无限延伸，或天花板正在压低。正常的物理规则似乎成了某种不真诚的伪装。`
    },
    [SeverityLevel.MODERATE]: {
        threshold: 80,
        description: (val: number, max: number) => `理智: ${val}/${max} — 焦躁不安。注意力的边缘出现了噪点。感到莫名的违和感。`,
        narrative: (pct: number) => `【不稳感知】理智 ${pct.toFixed(1)}%。场景描述中混入一丝超自然的违和感——空气的颜色似乎稍有偏色，或者是身后的倒影慢了半秒。`
    },
    [SeverityLevel.NORMAL]: {
        threshold: 100,
        description: (val: number, max: number) => `理智: ${val}/${max} — 精神相对稳固。还能欺骗自己这是一个正常的现实。`,
        narrative: () => ''
    }
};

export const STAMINA_STATE_CONFIG: Record<SeverityLevel, StateConfig> = {
    [SeverityLevel.CRITICAL]: {
        threshold: 30,
        description: (val: number, max: number) => `体力: ${val}/${max} — 体力透支。世界在向下塌陷。每一步挪动都要与粘稠的阻力博弈。`,
        narrative: (pct: number) => `【体力透支】体力 ${pct.toFixed(1)}%。世界在向下塌陷。每一步挪动都要与粘稠的阻力博弈。走廊无限拉长。`
    },
    [SeverityLevel.SEVERE]: {
        threshold: 60,
        description: (val: number, max: number) => `体力: ${val}/${max} — 过度疲劳。空气仿佛变稠了。动作带有明显的滞后感。`,
        narrative: (pct: number) => `【过度疲劳】体力 ${pct.toFixed(1)}%。空气仿佛变稠了。动作带有明显的滞后感。强调重力感。`
    },
    [SeverityLevel.MODERATE]: {
        threshold: 80,
        description: (val: number, max: number) => `体力: ${val}/${max} — 体力损耗。肌肉震颤。声音被心跳声覆盖。`,
        narrative: (pct: number) => `【体力损耗】体力 ${pct.toFixed(1)}%。微弱肌肉震颤。环境声音被心跳声覆盖。`
    },
    [SeverityLevel.NORMAL]: {
        threshold: 100,
        description: (val: number, max: number) => `体力: ${val}/${max} — 状态尚可。`,
        narrative: () => ''
    }
};

export const VIGOR_STATE_CONFIG: Record<SeverityLevel, StateConfig> = {
    [SeverityLevel.CRITICAL]: {
        threshold: 30,
        description: (val: number, max: number) => `精力: ${val}/${max} — 精力枯竭。视觉焦点滑移。现实边缘模糊。感知空洞。`,
        narrative: (pct: number) => `【精力枯竭】精力 ${pct.toFixed(1)}%。视觉焦点滑移。现实边缘由于像素化而显得模糊。感知空洞。`
    },
    [SeverityLevel.SEVERE]: {
        threshold: 60,
        description: (val: number, max: number) => `精力: ${val}/${max} — 精力低迷。色彩流失。声音回响。遗漏细节。`,
        narrative: (pct: number) => `【精力低迷】精力 ${pct.toFixed(1)}%。色彩从场景中流失。环境声音听起来像是从深水传来的回响。`
    },
    [SeverityLevel.MODERATE]: {
        threshold: 80,
        description: (val: number, max: number) => `精力: ${val}/${max} — 精力不足。边缘模糊。不真实的恍惚感。`,
        narrative: (pct: number) => `【精力不足】精力 ${pct.toFixed(1)}%。场景边缘出现细微模糊。不真实的恍惚感。`
    },
    [SeverityLevel.NORMAL]: {
        threshold: 100,
        description: (val: number, max: number) => `精力: ${val}/${max} — 状态尚可。`,
        narrative: () => ''
    }
};

export const NEURAL_LINK_CONFIG = {
    glitch: { threshold: 40, narrative: (integrity: number) => `【链接不稳】链接完整度 ${integrity}%。视觉反馈中混入大量的数字噪点和静态色彩。` },
    noise: { threshold: 60, narrative: (noise: number) => `【高信噪比】背景噪音控制失效(${noise}%)。耳鸣声中夹杂着意义不明的数字低语。` },
    lowBattery: { threshold: 20, narrative: (battery: number) => `【能源匮乏】能源剩余 ${battery}%。视野亮度在明暗间切换。` }
};

export const EQUIPMENT_STATE_CONFIG = {
    broken: { threshold: 15, narrative: (name: string, pct: number) => `【装备将碎】"${name}"即将报废(${pct}%)。场景中的威胁元素被放大。` },
    worn: { threshold: 40, narrative: (name: string, pct: number) => `【装备老化】"${name}"磨损严重(${pct}%)。在场景中暗示脆弱感。` },
    unarmed: { narrative: () => `【无武备】没有任何武器防身。场景中的每个角落都暗藏致命威胁。` }
};
