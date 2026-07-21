/**
 * @file SocializationService.ts
 * @desc 社交系统核心服务 - 整合状态描述、社交动作求值、关系管理与记忆金字塔逻辑
 */
import {
    Entity, NpcTemplate, NpcDynamicState, MemoryPyramid,
    MemorySummaries_δ, MemorySummaries_γ, MemorySummaries_β, MemorySummaries_α,
    MemorySummaries, ZoneDate, Dialogue, RelationshipPhase, Relationship, Settings, Words, PlayerWordsTag, NpcWordsTag, SeverityLevel, StateConfig, _Array
} from '../meta';
import { AiService } from './AiService';

export const RELATIONSHIP_CONFIGS: Relationship[] = [
    {
        phase: RelationshipPhase.HOSTILE,
        behavior: '极度排斥。仅用单音词或冷笑回应。拒绝分享任何生存情报。肢体语言呈现绝对的防备或攻击性。随时准备在背后捅玩家一刀。',
        trustRange: { min: 0, max: 9 }
    },
    {
        phase: RelationshipPhase.GUARDED,
        behavior: '充满猜忌。用防御性的反问评估对方。不会主动提供物资。对话中混入对玩家动机的恶意揣测。',
        trustRange: { min: 10, max: 24 }
    },
    {
        phase: RelationshipPhase.NEUTRAL,
        behavior: '例行公事。礼貌但极其疏离。回答问题如读说明书。在死亡威胁面前，会毫不犹豫地抛下对方。',
        trustRange: { min: 25, max: 44 }
    },
    {
        phase: RelationshipPhase.FAMILIAR,
        behavior: '点头之交。偶尔会分享一个苦涩的玩笑。开始透露一点过去的碎片。在安全的前提下愿意提供微小的协助。',
        trustRange: { min: 45, max: 64 }
    },
    {
        phase: RelationshipPhase.TRUSTING,
        behavior: '并肩作战。坦诚地描述自己的恐惧。语气带有末日下的温情。主动关注玩家的生理状态，愿意分享重要的战术信息。',
        trustRange: { min: 65, max: 84 }
    },
    {
        phase: RelationshipPhase.BONDED,
        behavior: '绝望的依赖。你们是彼此在噩梦中唯一的锚点。病态地关切对方的存亡。愿意分享最深层的禁忌秘密，甚至为保护对方而献祭自己的部分人性。',
        trustRange: { min: 85, max: 100 }
    }
];

export const getRelationship = (trust: number): Relationship => {
    const clampedTrust = Math.max(0, Math.min(100, trust));
    const config = RELATIONSHIP_CONFIGS.find(cfg =>
        clampedTrust >= cfg.trustRange.min && clampedTrust <= cfg.trustRange.max
    );
    return config || RELATIONSHIP_CONFIGS[2];
};

const HP_STATE_CONFIG: Record<SeverityLevel, StateConfig> = {
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

const SANITY_STATE_CONFIG: Record<SeverityLevel, StateConfig> = {
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

const STAMINA_STATE_CONFIG: Record<SeverityLevel, StateConfig> = {
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

const VIGOR_STATE_CONFIG: Record<SeverityLevel, StateConfig> = {
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

const NEURAL_LINK_CONFIG = {
    glitch: { threshold: 40, narrative: (integrity: number) => `【链接不稳】链接完整度 ${integrity}%。视觉反馈中混入大量的数字噪点和静态色彩。` },
    noise: { threshold: 60, narrative: (noise: number) => `【高信噪比】背景噪音控制失效(${noise}%)。耳鸣声中夹杂着意义不明的数字低语。` },
    lowBattery: { threshold: 20, narrative: (battery: number) => `【能源匮乏】能源剩余 ${battery}%。视野亮度在明暗间切换。` }
};

const EQUIPMENT_STATE_CONFIG = {
    broken: { threshold: 15, narrative: (name: string, pct: number) => `【装备将碎】"${name}"即将报废(${pct}%)。场景中的威胁元素被放大。` },
    worn: { threshold: 40, narrative: (name: string, pct: number) => `【装备老化】"${name}"磨损严重(${pct}%)。在场景中暗示脆弱感。` },
    unarmed: { narrative: () => `【无武备】没有任何武器防身。场景中的每个角落都暗藏致命威胁。` }
};

const MEMORY_COLLAPSE_THRESHOLD = 5;

/**
 * 社交系统核心服务
 */
export class SocializationService {

    // ========================================================================
    // 1. 状态描述 (State Management)
    // ========================================================================

    private static getSeverity(percent: number, config: Record<SeverityLevel, StateConfig>): SeverityLevel {
        if (percent < config[SeverityLevel.CRITICAL].threshold) return SeverityLevel.CRITICAL;
        if (percent < config[SeverityLevel.SEVERE].threshold) return SeverityLevel.SEVERE;
        if (percent < config[SeverityLevel.MODERATE].threshold) return SeverityLevel.MODERATE;
        return SeverityLevel.NORMAL;
    }

    /**
     * 构建 NPC 生理与环境交互状态描述
     */
    static buildPhysicalStateDescription(npc: Entity<NpcTemplate, NpcDynamicState>): string {
        const { hp, sanity } = npc.dynamic;
        const { maxHp, maxSanity } = npc.static.initialState.vital;

        const hpPct = (hp / maxHp) * 100;
        const sanityPct = (sanity / maxSanity) * 100;

        const hpDesc = HP_STATE_CONFIG[this.getSeverity(hpPct, HP_STATE_CONFIG)].description(hp, maxHp);
        const sanityDesc = SANITY_STATE_CONFIG[this.getSeverity(sanityPct, SANITY_STATE_CONFIG)].description(sanity, maxSanity);

        const currentAction = (npc.dynamic as any).currentAction || '待命——陷入死寂的观察与倾听。';

        const equippedWeapon = npc.dynamic.equipment.weapons[0] || npc.dynamic.equipment.weapons[1];
        const weaponDesc = equippedWeapon ? `持握着【${equippedWeapon.name}】` : '手无寸铁';

        const inventoryDesc = npc.dynamic.inventory && npc.dynamic.inventory.length > 0
            ? `\n可见随身物品: ${npc.dynamic.inventory.map(i => i.name).join(', ')}`
            : '';

        return `${hpDesc}\n${sanityDesc}\n当前行为: ${currentAction}。${weaponDesc}。${inventoryDesc}`;
    }

    /**
     * 构建动态叙事状态层（适用于玩家及全局旁白注入）
     */
    static buildDynamicNarrativeStates(
        hpPercent: number,
        sanityPercent: number,
        staminaPercent: number,
        vigorPercent: number,
        equipment?: Array<{ slot: 'weapon' | 'armor' | 'accessory'; name: string; durabilityPercent: number }>,
        neuralLink?: { battery: number; integrity: number; noiseLevel: number },
        companions?: Array<{ name: string; hpPercent: number; sanityPercent: number; trust: number }>
    ): string {
        const layers = [
            HP_STATE_CONFIG[this.getSeverity(hpPercent, HP_STATE_CONFIG)].narrative(hpPercent),
            SANITY_STATE_CONFIG[this.getSeverity(sanityPercent, SANITY_STATE_CONFIG)].narrative(sanityPercent),
            STAMINA_STATE_CONFIG[this.getSeverity(staminaPercent, STAMINA_STATE_CONFIG)].narrative(staminaPercent),
            VIGOR_STATE_CONFIG[this.getSeverity(vigorPercent, VIGOR_STATE_CONFIG)].narrative(vigorPercent),

            neuralLink && neuralLink.integrity < NEURAL_LINK_CONFIG.glitch.threshold && NEURAL_LINK_CONFIG.glitch.narrative(neuralLink.integrity),
            neuralLink && neuralLink.noiseLevel > NEURAL_LINK_CONFIG.noise.threshold && NEURAL_LINK_CONFIG.noise.narrative(neuralLink.noiseLevel),
            neuralLink && neuralLink.battery < NEURAL_LINK_CONFIG.lowBattery.threshold && NEURAL_LINK_CONFIG.lowBattery.narrative(neuralLink.battery),

            (sanityPercent < 30 && vigorPercent < 30) && `【认知湮灭】理智与精力双重崩塌。现实已不再是逻辑的产物，几何结构呈现令人作呕的非欧形态。`,
            (sanityPercent < 30 && vigorPercent > 70) && `【躁狂性多疑】精神高度紧绷，感官异常敏锐。每一个阴影都在试图执行刺杀协议。`,
            (staminaPercent < 20 && hpPercent < 40) && `【肉体极限】灵魂正在被腐朽的肉体排斥。痛苦成为唯一能证明还活着的锚点。`
        ];

        if (equipment?.length) {
            let hasWeapon = false;
            equipment.forEach(e => {
                if (e.slot === 'weapon') hasWeapon = true;
                if (e.durabilityPercent < EQUIPMENT_STATE_CONFIG.broken.threshold) layers.push(EQUIPMENT_STATE_CONFIG.broken.narrative(e.name, e.durabilityPercent));
                else if (e.durabilityPercent < EQUIPMENT_STATE_CONFIG.worn.threshold) layers.push(EQUIPMENT_STATE_CONFIG.worn.narrative(e.name, e.durabilityPercent));
            });
            if (!hasWeapon) layers.push(EQUIPMENT_STATE_CONFIG.unarmed.narrative());
        } else {
            layers.push(EQUIPMENT_STATE_CONFIG.unarmed.narrative());
        }

        if (companions) {
            companions.forEach(c => {
                if (c.hpPercent < 25) layers.push(`【同伴危急】${c.name}的生命体征正在衰竭(HP ${c.hpPercent.toFixed(0)}%)。鲜血和绝望的气味在蔓延。`);
                else if (c.trust < 20) layers.push(`【信任崩塌】${c.name}投来的目光如同注视一具即将尸变的残骸(信任 ${c.trust.toFixed(0)}%)。防备随时可能演变为背叛。`);
            });
        }

        return layers.filter(Boolean).join('\n');
    }

    /**
     * 生成玩家外观状态描述，用于 AI 判断环境对玩家的影响
     */
    static buildPlayerAppearanceDescription(hpPercent: number, sanityPercent: number, weapon?: string): string {
        const obs: string[] = [];
        if (hpPercent < 30) obs.push('满身致命创伤，行动迟缓摇摇欲坠');
        else if (hpPercent < 60) obs.push('衣服被撕裂，身上有明显血迹与伤痕');
        if (sanityPercent < 30) obs.push('瞳孔涣散不自觉抽搐，精神游走在崩溃边缘');
        else if (sanityPercent < 50) obs.push('神情极度焦虑，频繁扫视不存在的阴影');
        if (weapon) obs.push(`紧紧握着${weapon}，指关节发白`);
        return obs.length > 0 ? obs.join('；') : '外表维持着虚假的镇定与正常';
    }

    // ========================================================================
    // 2. 关系与行为评估求值 (Relationship & Action Evaluation)
    // ========================================================================

    static getRelationshipPhase(trust: number): RelationshipPhase {
        return getRelationship(trust).phase;
    }

    static getRelationshipBehavior(trust: number): string {
        return getRelationship(trust).behavior;
    }

    static generateSpecialStateInstructions(trust: number, sanity: number, hp: number, maxHp: number, phase?: RelationshipPhase): string[] {
        const instructions: string[] = [];
        const currentPhase = phase ?? this.getRelationshipPhase(trust);
        const hpRatio = maxHp > 0 ? (hp / maxHp) : 0;
        const isSanityCritical = sanity < 30;

        // 交叉状态验证
        if (trust < 20 && isSanityCritical) instructions.push('⚠ 低信任+低理智: 回应必须混入严重的被害妄想、逻辑断层与无差别的敌意。');
        if (hpRatio < 0.3 && trust > 60) instructions.push('⚠ 重创濒死+高信任: 表现出对虚无的恐惧，并将玩家视为溺水前唯一能抓住的浮木。');
        if (hpRatio < 0.3 && trust < 20) instructions.push('⚠ 重创濒死+低信任: 困兽犹斗。如同一头受伤的野兽，防卫机制全开，随时可能拉玩家同归于尽。');
        if (isSanityCritical && hpRatio < 0.3) instructions.push('⚠ 肉体与认知双重崩溃: 无法组织连贯的语言。台词中应包含幻觉妄语与生理痛苦的残喘。');

        // 阶段基准锚定
        switch (currentPhase) {
            case RelationshipPhase.BONDED: instructions.push('⚠ 羁绊指令: 语气体现出病态的依赖与偏执，甚至认为保护玩家的优先级高于自身存活。'); break;
            case RelationshipPhase.TRUSTING: instructions.push('⚠ 信任指令: 毫不掩饰地暴露脆弱面，分享战略信息，将玩家视为平等的战友。'); break;
            case RelationshipPhase.FAMILIAR: instructions.push('⚠ 熟识指令: 带有克制的友好，愿意交流非致命的隐私，但底线不容试探。'); break;
            case RelationshipPhase.NEUTRAL: instructions.push('⚠ 中立指令: 实用主义与利己主义。语气较冷漠、机械。'); break;
            case RelationshipPhase.GUARDED: instructions.push('⚠ 戒备指令: 拒绝正面回答任何关于动机的问题，习惯用尖锐的反问掌握对话主动权。'); break;
            case RelationshipPhase.HOSTILE: instructions.push('⚠ 敌意指令: 充满不可调和的攻击性，寻找言语上的破绽并施以恶毒的嘲讽或威胁。'); break;
        }
        return instructions;
    }

    static buildMemoryContext(trust: number, history: Dialogue[], memory: MemoryPyramid): string {
        const relationship = getRelationship(trust);
        // 统计所有 Dialogue 对象中的实际对话轮次（pair 数），而非 Dialogue 对象数
        const total = history.reduce((acc, d) => acc + (d.dialogue?.length || 0), 0);
        const duration = total > 20 ? '深陷循环的同伴' : total > 10 ? '多次生死的交集' : total > 4 ? '初步试探' : '初次相遇的陌生人';

        let block = `【认知链路与关系网】\n- 关系阶段: ${relationship.phase} (信任标量 ${Math.floor(trust)}/100)\n- 纠缠深度: ${duration}\n`;

        if (memory.α && memory.α.length > 0) {
            block += `【核心执念 / 绝对长期记忆 (α层)】\n`;
            memory.α.forEach((m: MemorySummaries_α) => block += `- ${m.summary}\n`);
        }

        if (memory.β && memory.β.length > 0) {
            block += `【重要事件 / 中长期结构化记忆 (β层)】\n`;
            memory.β.forEach((m: MemorySummaries_β) => block += `- ${m.summary}\n`);
        }

        if (memory.γ && memory.γ.length > 0) {
            block += `【阶段总结 / 整合记忆 (γ层)】\n`;
            memory.γ.forEach((m: MemorySummaries_γ) => block += `- ${m.summary}\n`);
        }

        if (memory.δ && memory.δ.length > 0) {
            block += `【短期记忆切片 / 近期经历 (δ层)】\n`;
            memory.δ.slice(-5).forEach((m: MemorySummaries_δ) => {
                block += `- ${m.summary}\n`;
                if (m.keyEntities && m.keyEntities.length > 0) block += `  (触发锚点: ${m.keyEntities.join(', ')})\n`;
            });
        }

        block += `- 行为基准线协议: ${relationship.behavior}`;
        return block;
    }

    static calculateIntimacyScore(trust: number, memory: MemoryPyramid, shared: number = 0, dialogues: number = 0): number {
        let score = trust;
        const all: MemorySummaries[] = [
            ...(memory.α || []),
            ...(memory.β || []),
            ...(memory.γ || []),
            ...(memory.δ || [])
        ];
        if (all.length > 0) {
            const avg = all.reduce((sum, m) => sum + (m.importanceScore || 0), 0) / all.length;
            score += avg * 15; // 高权重记忆拉升亲密度基准
        }
        // 对话轮数与共享经历提供额外缓释加成
        score += Math.min(dialogues * 0.5, 20) + shared * 2;
        return Math.max(0, Math.min(100, score));
    }

    // ========================================================================
    // 3. 记忆金字塔 (Memory Pyramid Lifecycle)
    // ========================================================================

    /**
     * 摘要对话切片并生成 δ 层记忆 (Step 1-3)
     */
    static async summarizeDialogueSlice(
        settings: Settings,
        npc: Entity<NpcTemplate, NpcDynamicState>,
        dialogueHistory: Array<[Words<PlayerWordsTag>, Words<NpcWordsTag>]>,
        startIndex: number,
        endIndex: number,
        currentTime: ZoneDate
    ): Promise<MemorySummaries_δ | null> {
        // 1. 语义摘要请求
        const summaryData = await AiService.extractNpcMemorySummaries(settings, npc, dialogueHistory);
        if (!summaryData || !summaryData.summary) return null;

        // 2. 向量嵌入生成 (非阻断)
        let summaryEmbedding: number[] | undefined;
        let entitiesEmbedding: number[] | undefined;
        try {
            const textsToEmbed: string[] = [summaryData.summary];
            const entitiesText = (summaryData.keyEntities || []).join(' ');
            if (entitiesText.trim()) {
                textsToEmbed.push(entitiesText);
            }
            const embeddings = await AiService.generateEmbeddings(settings, textsToEmbed);
            summaryEmbedding = embeddings[0];
            entitiesEmbedding = textsToEmbed.length > 1 ? embeddings[1] : undefined;
        } catch (e) {
            console.warn('[SocializationService] 认知嵌入异常，向量生成失败:', e);
        }

        // 3. 记忆节点实例化
        return {
            id: `mem_δ_${npc.static.id}_${Date.now()}`,
            owner: { id: npc.static.id, name: npc.static.name },
            summary: summaryData.summary,
            keyEntities: summaryData.keyEntities || [],
            importanceScore: summaryData.importanceScore || 0.1,
            summaryEmbedding,
            entitiesEmbedding,
            hierarchy: 'δ',
            dialogueIndex: { start: startIndex, end: endIndex },
            accessCount: 0,
            accessRatio: 0,
            startTime: currentTime,
            endTime: currentTime
        };
    }

    /**
     * 推进记忆层级演化 (Step 4 - 跨维坍缩)
     */
    static async evolve(
        settings: Settings,
        npc: Entity<NpcTemplate, NpcDynamicState>,
        currentTime: ZoneDate
    ): Promise<MemoryPyramid | null> {
        const pyramid: MemoryPyramid = {
            α: [...(npc.dynamic.memory.α || [])],
            β: [...(npc.dynamic.memory.β || [])],
            γ: [...(npc.dynamic.memory.γ || [])],
            δ: [...(npc.dynamic.memory.δ || [])]
        };
        let changed = false;

        // 内部防腐助手：提取有效层级摘要 (记忆整合)
        const summarizeHierarchy = async (memories: MemorySummaries[]) => {
            return await AiService.consolidateNpcMemories(settings, npc, memories);
        };

        // 1. δ -> γ
        const unparentedDelta = pyramid.δ.filter((m: MemorySummaries_δ) => !m.parentId);
        if (unparentedDelta.length >= MEMORY_COLLAPSE_THRESHOLD) {
            const slice = unparentedDelta.slice(0, MEMORY_COLLAPSE_THRESHOLD);
            const data = await summarizeHierarchy(slice);
            if (data && data.summary) {
                const parent: MemorySummaries_γ = {
                    ...this.createBaseSummary(npc.static.id, npc.static.name, data, currentTime),
                    hierarchy: 'γ',
                    childIds: slice.map((m: MemorySummaries_δ) => m.id) as _Array<string, 5>
                };
                slice.forEach((c: MemorySummaries_δ) => c.parentId = parent.id);
                pyramid.γ.push(parent);
                changed = true;
            }
        }

        // 2. γ -> β
        const unparentedGamma = pyramid.γ.filter((m: MemorySummaries_γ) => !m.parentId);
        if (unparentedGamma.length >= MEMORY_COLLAPSE_THRESHOLD) {
            const slice = unparentedGamma.slice(0, MEMORY_COLLAPSE_THRESHOLD);
            const data = await summarizeHierarchy(slice);
            if (data && data.summary) {
                const parent: MemorySummaries_β = {
                    ...this.createBaseSummary(npc.static.id, npc.static.name, data, currentTime),
                    hierarchy: 'β',
                    childIds: slice.map((m: MemorySummaries_γ) => m.id) as _Array<string, 5>
                };
                slice.forEach((c: MemorySummaries_γ) => c.parentId = parent.id);
                pyramid.β.push(parent);
                changed = true;
            }
        }

        // 3. β -> α (形成核心执念)
        const unparentedBeta = pyramid.β.filter((m: MemorySummaries_β) => !m.parentId);
        if (unparentedBeta.length >= MEMORY_COLLAPSE_THRESHOLD) {
            const slice = unparentedBeta.slice(0, MEMORY_COLLAPSE_THRESHOLD);
            const data = await summarizeHierarchy(slice);
            if (data && data.summary) {
                const parent: MemorySummaries_α = {
                    ...this.createBaseSummary(npc.static.id, npc.static.name, data, currentTime),
                    hierarchy: 'α',
                    childIds: slice.map((m: MemorySummaries_β) => m.id) as _Array<string, 5>
                };
                slice.forEach((c: MemorySummaries_β) => c.parentId = parent.id);
                pyramid.α.push(parent);
                changed = true;
            }
        }

        return changed ? pyramid : null;
    }

    /**
     * 记录记忆检索命中率 (Step 5 - 巩固与遗忘)
     */
    static recordMemoryAccess(pyramid: MemoryPyramid, memoryId: string, currentTime: ZoneDate): void {
        const all: MemorySummaries[] = [
            ...(pyramid.α || []),
            ...(pyramid.β || []),
            ...(pyramid.γ || []),
            ...(pyramid.δ || [])
        ];
        const target = all.find(m => m.id === memoryId);
        if (target) {
            target.accessCount = (target.accessCount || 0) + 1;
            target.lastAccessedAt = currentTime;
            // 神经可塑性模拟：反复检索的记忆会逐渐提升其在网格中的重要性比重，最高趋近绝对真理(1.0)
            const elasticityFactor = 0.015;
            target.importanceScore = Math.min(1.0, (target.importanceScore || 0.1) + elasticityFactor);
            // 访问率的重计算可由外层定时器聚合批处理，此处仅维持增量累加
        }
    }

    private static createBaseSummary(npcId: string, npcName: string, data: any, time: ZoneDate): MemorySummaries {
        return {
            id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            owner: { id: npcId, name: npcName },
            summary: data.summary,
            keyEntities: data.keyEntities || [],
            importanceScore: data.importanceScore || 0.5,
            accessCount: 0,
            accessRatio: 0,
            startTime: time,
            endTime: time
        };
    }
}