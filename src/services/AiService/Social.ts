/**
 * @file Social.ts
 * @desc AI NPC 服务：Prompt、调用、缓存、输出校验、历史检索。
 *
 * 设计原则：
 * - 只负责 AI 生成，不负责 React 状态。
 * - 所有输出必须收敛到 type.ts / interface.copy.ts 允许的契约内。
 * - 不直接持有社交领域状态，领域计算交给 SocializationService。
 * - Prompt 输出契约统一来自 schema.ts。
 * - 所有枚举、字段、任务结构都必须符合 type.ts / interface.copy.ts。
 */

import type {
    Settings,
    QuestTemplate,
    InteractionDialogueContext,
    InteractionNpcEntity,
    Dialogue,
    PlayerTemplate,
    PlayerDynamicState,
    Mood,
    Entity,
    Words,
    PlayerWordsTag,
    NpcWordsTag,
    Location,
    ItemTemplate,
    AccessoryEffectType,
    ConsumableEffectType,
    CombatStyle,
    MemorySummaries,
    WeaponType,
    WeaponDamageType
} from '../../meta';
import { getRelationScore, normalizeEquipState } from '../../meta';
import type { CompanionTemplate, NodeNpcTemplate } from '../../meta';
import { SocializationService } from '../SocializationService';
import { getSeverity, HP_STATE, SANITY_STATE } from '../../constants';
import { callAi } from './providers';
import {
    BaseProvider,
    AIOutputTruncatedError,
    AIServiceError,
    ErrorType,
    AIResponse,
    GenericCacheManager
} from './providers/base';
import {
    SOCIAL_DIALOGUE_SCHEMA,
    SOCIAL_REACTION_SCHEMA,
    SOCIAL_INTIMACY_SCHEMA,
    SOCIAL_MEMORY_SUMMARY_SCHEMA,
    SOCIAL_MEMORY_CONSOLIDATION_SCHEMA
} from '../../constants/schema';

// =====================
// 常量与工具
// =====================

const MAX_MEMORY_SEARCH_ITERATIONS = 3;

const ATTRIBUTE_TYPES = [
    'strength',
    'agility',
    'wisdom',
    'awareness',
    'will',
    'cthulhu'
] as const;

const VITAL_TYPES = [
    'maxHp',
    'maxSanity',
    'maxStamina',
    'maxVigor'
] as const;

const ACCESSORY_EFFECT_TYPES: readonly string[] = [
    ...ATTRIBUTE_TYPES,
    ...VITAL_TYPES
];

/** 消耗品可用效果键，严格对齐契约 ConsumableEffectType。 */
const CONSUMABLE_EFFECT_TYPES: readonly string[] = [
    ...ACCESSORY_EFFECT_TYPES,
    'hp',
    'sanity',
    'stamina',
    'vigor',
    'battery',
    'integrity'
];

/** 物品品质，严格对齐契约 ItemGrade 的 8 阶物理工造体系。 */
const ITEM_GRADES = [
    'salvaged',
    'standard',
    'reinforced',
    'military',
    'corporate',
    'foundation',
    'prototype',
    'ark_prime'
] as const;

const WEAPON_TYPES = [
    'wave',
    'both_wave',
    'prick',
    'both_prick',
    'shield',
    'both_shield',
    'sniper_rifle',
    'assault_rifle',
    'smg',
    'pistol',
    'shotgun',
    'sawed_off',
    'crossbow',
    'throw',
    'bow',
    'magic'
] as const;
const WEAPON_DAMAGE_TYPES = ['melee', 'range', 'instant'] as const;

/** 武器类型缺省攻击距离（12 档体系，0 = 无限），仅用于 LLM 输出缺失 range 时的兜底。 */
const WEAPON_DEFAULT_RANGE: Record<string, number> = {
    magic: 0,
    sniper_rifle: 12,
    assault_rifle: 10,
    smg: 8,
    pistol: 5,
    shotgun: 4,
    sawed_off: 3,
    crossbow: 7,
    throw: 3,
    bow: 6,
    wave: 1,
    both_wave: 1,
    prick: 1,
    both_prick: 2,
    shield: 1,
    both_shield: 1
};

/** 武器类型缺省占地 [列, 行]，仅用于 LLM 输出缺失 size 时的兜底。 */
const WEAPON_DEFAULT_SIZE: Record<string, [number, number]> = {
    magic: [1, 1],
    sniper_rifle: [4, 2],
    assault_rifle: [3, 2],
    smg: [2, 2],
    pistol: [2, 1],
    shotgun: [3, 2],
    sawed_off: [2, 2],
    crossbow: [3, 2],
    throw: [1, 1],
    bow: [3, 2],
    wave: [2, 1],
    both_wave: [3, 2],
    prick: [2, 1],
    both_prick: [4, 1],
    shield: [2, 2],
    both_shield: [3, 2]
};

/** 物品大类缺省占地 [列, 行]，仅用于 LLM 输出缺失 size 时的兜底。 */
const ITEM_DEFAULT_SIZE: Record<ItemTemplate['type'], [number, number]> = {
    weapon: [2, 1],
    armor: [2, 2],
    accessory: [1, 1],
    storage: [2, 2],
    consumable: [1, 1],
    data: [1, 1],
    material: [1, 1]
};
const COMBAT_STYLES = ['burst', 'attack', 'balance', 'defense', 'skirmish'] as const;

/**
 * 关系阶段的冷暖分组。
 *
 * 阶段名来自 SocializationService 的信任 / 好感阶段表（两条轴互不重名），
 * 这里只做语气倾向分组，供反应生成等轻量 Prompt 引用。
 */
const WARM_RELATION_PHASES = new Set<string>(['长盟', '同气']);
const COLD_RELATION_PHASES = new Set<string>(['猜忌', '防备', '离心', '芥蒂']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date);

const asString = (value: unknown, fallback: string = ''): string =>
    typeof value === 'string' ? value : fallback;

const asNumber = (value: unknown, fallback: number = 0): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const clampNumber = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

const generateFallbackId = (prefix: string): string =>
    `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const normalizeId = (value: unknown, prefix: string): string => {
    const raw = asString(value)
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^\w\u4e00-\u9fa5_-]/g, '');

    return raw || generateFallbackId(prefix);
};

const hashString = (input: string): string => {
    let hash = 0;

    for (let i = 0; i < input.length; i += 1) {
        hash = (hash << 5) - hash + input.charCodeAt(i);
        hash |= 0;
    }

    return Math.abs(hash).toString(36);
};

/**
 * 递归 trim JSON 对象 key。
 * 用于兜底修复 LLM 可能输出的 "response "、"thought " 等带空格 key。
 */
const normalizeObjectKeys = <T>(value: T): T => {
    if (Array.isArray(value)) {
        return value.map((entry) => normalizeObjectKeys(entry)) as unknown as T;
    }

    if (isRecord(value)) {
        return Object.fromEntries(
            Object.entries(value).map(([key, entry]) => [key.trim(), normalizeObjectKeys(entry)])
        ) as T;
    }

    return value;
};

// =====================
// 状态格式化
// =====================

const formatNpcState = (npc: InteractionNpcEntity): string => {
    const hp = asNumber(npc.dynamic.hp, 0);
    const sanity = asNumber(npc.dynamic.sanity, 0);
    const stamina = asNumber(npc.dynamic.stamina, 0);
    const vigor = asNumber(npc.dynamic.vigor, 0);

    const maxHp = Math.max(0, asNumber(npc.dynamic.maxHp, 0));
    const maxSanity = Math.max(0, asNumber(npc.dynamic.maxSanity, 0));
    const maxStamina = Math.max(0, asNumber(npc.dynamic.maxStamina, 0));
    const maxVigor = Math.max(0, asNumber(npc.dynamic.maxVigor, 0));

    const hpPct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
    const sanityPct = maxSanity > 0 ? (sanity / maxSanity) * 100 : 0;
    const staminaPct = maxStamina > 0 ? (stamina / maxStamina) * 100 : 0;
    const vigorPct = maxVigor > 0 ? (vigor / maxVigor) * 100 : 0;

    const hpDesc = HP_STATE[getSeverity(hpPct, HP_STATE)].description(hp, maxHp);
    const sanityDesc = SANITY_STATE[getSeverity(sanityPct, SANITY_STATE)].description(
        sanity,
        maxSanity
    );

    let currentAction = '待命——陷入死寂的观察与倾听。';

    if (hpPct < 30) {
        currentAction = '重伤——每一次呼吸都伴随颤抖。';
    } else if (sanityPct < 30) {
        currentAction = '精神失衡——视线在虚无与真实之间漂移。';
    } else if (staminaPct < 25 || vigorPct < 25) {
        currentAction = '疲惫——动作迟缓，语句短促。';
    }

    const npcEquip = normalizeEquipState(npc.dynamic.equipment);
    const equippedWeapon = npcEquip.weapons.main ?? npcEquip.weapons.side;
    const weaponDesc = equippedWeapon ? `持握着【${equippedWeapon.name}】` : '手无寸铁';

    const armorCount = npcEquip.armors.filter(Boolean).length;
    const armorDesc = armorCount > 0 ? `身上有 ${armorCount} 件护甲` : '没有明显护甲';

    const inventoryDesc = npc.dynamic.inventory?.length
        ? `\n可见随身物品: ${npc.dynamic.inventory.map((i) => i.name).join(', ')}`
        : '';

    return [
        hpDesc,
        sanityDesc,
        `体力: ${Math.round(staminaPct)}%，精力: ${Math.round(vigorPct)}%。`,
        `当前行为: ${currentAction}`,
        `${weaponDesc}；${armorDesc}。`,
        inventoryDesc
    ]
        .filter(Boolean)
        .join('\n');
};

// =====================
// 上下文解析器
// =====================

const ContextParser = {
    parseLocation(location: Location['currentLocation']): string {
        const { zone, node } = location;
        let desc = '';

        if (zone) {
            desc += `当前区域: ${zone.name}。\n`;

            if (zone.desc.background) {
                desc += `区域背景: ${zone.desc.background}。\n`;
            }

            if (zone.desc.topology) {
                desc += `区域结构: ${zone.desc.topology}。\n`;
            }

            if (zone.desc.visualStyle) {
                desc += `视觉风格: ${zone.desc.visualStyle}。\n`;
            }

            if (zone.isSanctuary) {
                desc += `【庇护所资源】已耗竭资源 ${zone.isSanctuary.lackingResource ?? 0} 项。\n`;
            }
        }

        if (node) {
            desc += `当前位置: ${node.name}。环境: ${node.desc}。\n`;

            if (node.isDangerous) {
                desc += '威胁等级: 危险。\n';
            } else {
                desc += '威胁等级: 相对安全。\n';
            }
        }

        return desc || '未知区域。';
    },

    parsePlayerObservation(player?: Entity<PlayerTemplate, PlayerDynamicState>): string {
        if (!player) return '';

        const maxHp = Math.max(0, asNumber(player.dynamic.maxHp, 0));
        const maxSanity = Math.max(0, asNumber(player.dynamic.maxSanity, 0));
        const maxStamina = Math.max(0, asNumber(player.dynamic.maxStamina, 0));
        const maxVigor = Math.max(0, asNumber(player.dynamic.maxVigor, 0));

        if (maxHp <= 0) return '';

        const hpRatio = asNumber(player.dynamic.hp, 0) / maxHp;
        const sanRatio = maxSanity > 0 ? asNumber(player.dynamic.sanity, 0) / maxSanity : 1;
        const staminaRatio = maxStamina > 0 ? asNumber(player.dynamic.stamina, 0) / maxStamina : 1;
        const vigorRatio = maxVigor > 0 ? asNumber(player.dynamic.vigor, 0) / maxVigor : 1;

        const obs: string[] = [];

        if (hpRatio < 0.3) obs.push('满身是伤，摇摇欲坠');
        else if (hpRatio < 0.6) obs.push('身上有明显伤痕');

        if (sanRatio < 0.3) obs.push('眼神涣散，精神状态极差');
        else if (sanRatio < 0.5) obs.push('看起来焦虑不安');

        if (staminaRatio < 0.25) obs.push('呼吸沉重，体力透支');
        if (vigorRatio < 0.25) obs.push('神情疲惫，注意力涣散');

        const playerEquip = normalizeEquipState(player.dynamic.equipment);
        const weapon = playerEquip.weapons.main ?? playerEquip.weapons.side;
        if (weapon && weapon.name !== '无') {
            obs.push(`手持武器[${weapon.name}]`);
        }

        const armorCount = playerEquip.armors.filter(Boolean).length;
        if (armorCount > 0) {
            obs.push(`穿着 ${armorCount} 件护甲`);
        }

        return obs.length > 0 ? `\n【你观察到的玩家状态】${obs.join('；')}` : '';
    },

    inferCoreDrive(style?: CombatStyle | string): string {
        const drives: Record<string, string> = {
            burst: '爆发——一击制敌。',
            attack: '压制——用持续进攻撕开生存空间。',
            balance: '均衡——在进攻与防守之间维持平衡。',
            defense: '守护——用身体挡在危险前面。安全感来源于保护他人的能力。',
            skirmish: '游击——机动、骚扰、消耗。避免正面碰撞，用节奏拖垮敌人。'
        };

        return drives[style || ''] || '生存——在这个扭曲的世界中找到活下去的理由。';
    },

    extractLastPlayerInput(dialogue: Dialogue): string {
        const history = dialogue.dialogue;
        if (!history || history.length === 0) return '';

        const lastRound = history[history.length - 1];
        return lastRound?.[0]?.text || '';
    },

    buildConversationHistory(
        history: Array<[Words<PlayerWordsTag>, Words<NpcWordsTag>]>,
        npcName: string,
        recentWindowSize: number = 3,
        memorySummaries: string[] = []
    ): string {
        if (!history || history.length === 0) return '(初次对话，无历史记录)';

        const allDialogues: string[] = [];

        history.forEach(([pWord, nWord]) => {
            if (pWord?.text) allDialogues.push(`玩家: ${pWord.text}`);
            if (nWord?.text) allDialogues.push(`${npcName}: ${nWord.text}`);
        });

        const sections: string[] = [];

        if (memorySummaries.length > 0) {
            sections.push(`【共同经历】\n${memorySummaries.map((s) => `- ${s}`).join('\n')}`);
        }

        const recentHistory = allDialogues.slice(-recentWindowSize * 2);
        sections.push(`【近期对话】\n${recentHistory.join('\n')}`);

        return sections.join('\n\n');
    }
};

// =====================
// 历史对话检索
// =====================

export const searchHistoricalDialogueByKeywords = (
    dialogueHistory: Dialogue,
    keywords: string[]
): Array<[Words<PlayerWordsTag>, Words<NpcWordsTag>]> => {
    if (!dialogueHistory || !dialogueHistory.dialogue || !keywords || keywords.length === 0) {
        return [];
    }

    const cleanKeywords = keywords
        .map((k) => k.trim().toLowerCase())
        .filter((k) => k.length > 0);

    if (cleanKeywords.length === 0) return [];

    const matchedPairs: Array<[Words<PlayerWordsTag>, Words<NpcWordsTag>]> = [];

    for (const pair of dialogueHistory.dialogue) {
        const [playerWords, npcWords] = pair;
        const playerText = (playerWords?.text || '').toLowerCase();
        const npcText = (npcWords?.text || '').toLowerCase();
        const fullContent = `${playerText} ${npcText}`;

        const isHit = cleanKeywords.some((kw) => fullContent.includes(kw));

        if (isHit) {
            matchedPairs.push(pair);
        }
    }

    return matchedPairs.slice(0, 12);
};

// =====================
// 输出规范化
// =====================

const normalizeMood = (value: unknown): Mood => {
    const raw = asString(value).trim().toLowerCase();

    switch (raw) {
        case 'happy':
        case 'joy':
        case 'excited':
            return 'happy';

        case 'sad':
        case 'depressed':
        case 'melancholy':
            return 'sad';

        case 'angry':
        case 'hostile':
        case 'aggressive':
            return 'angry';

        case 'fearful':
        case 'anxious':
        case 'guarded':
            return 'fearful';

        case 'surprised':
        case 'shocked':
            return 'surprised';

        case 'neutral':
        default:
            return 'neutral';
    }
};

/**
 * 归一化物品占地。
 *
 * 契约 `BaseItemTemplate.size` 为必填的 [列, 行] 正整数对；
 * LLM 漏写或写出非法值时按武器形态 / 物品大类的缺省占地补齐。
 */
const normalizeItemSize = (
    raw: unknown,
    type: ItemTemplate['type'] | undefined,
    weaponType?: WeaponType
): [number, number] => {
    if (Array.isArray(raw) && raw.length >= 2) {
        const cols = Math.floor(Number(raw[0]));
        const rows = Math.floor(Number(raw[1]));
        if (Number.isInteger(cols) && Number.isInteger(rows) && cols >= 1 && rows >= 1) {
            return [cols, rows];
        }
    }

    if (weaponType && WEAPON_DEFAULT_SIZE[weaponType]) return WEAPON_DEFAULT_SIZE[weaponType];
    return type ? ITEM_DEFAULT_SIZE[type] : [1, 1];
};

const normalizeAccessoryEffects = (raw: unknown): Array<[AccessoryEffectType, number]> => {    if (!Array.isArray(raw)) return [];

    return raw.reduce<Array<[AccessoryEffectType, number]>>((acc, entry) => {
        let type: string | undefined;
        let value: number | undefined;

        if (Array.isArray(entry)) {
            type = asString(entry[0]).trim();
            value = Number(entry[1]);
        } else if (isRecord(entry)) {
            type = asString(entry.type).trim();
            value = Number(entry.value);
        }

        if (
            typeof type === 'string' &&
            ACCESSORY_EFFECT_TYPES.includes(type) &&
            Number.isFinite(value)
        ) {
            acc.push([type as AccessoryEffectType, Math.floor(value as number)]);
        }

        return acc;
    }, []);
};

const normalizeConsumableEffects = (
    raw: unknown
): Array<[ConsumableEffectType, number, number?]> => {
    if (!Array.isArray(raw)) return [];

    return raw.reduce<Array<[ConsumableEffectType, number, number?]>>((acc, entry) => {
        let type: string | undefined;
        let value: number | undefined;
        let duration: number | undefined;

        if (Array.isArray(entry)) {
            type = asString(entry[0]).trim();
            value = Number(entry[1]);
            duration = entry.length > 2 ? Number(entry[2]) : undefined;
        } else if (isRecord(entry)) {
            type = asString(entry.type).trim();
            value = Number(entry.value);
            duration = 'duration' in entry ? Number(entry.duration) : undefined;
        }

        if (
            typeof type === 'string' &&
            CONSUMABLE_EFFECT_TYPES.includes(type) &&
            Number.isFinite(value)
        ) {
            if (Number.isFinite(duration)) {
                acc.push([
                    type as ConsumableEffectType,
                    Math.floor(value as number),
                    Math.floor(duration as number)
                ]);
            } else {
                acc.push([type as ConsumableEffectType, Math.floor(value as number)]);
            }
        }

        return acc;
    }, []);
};

const normalizeItemTemplate = (raw: unknown): ItemTemplate | null => {
    if (!isRecord(raw)) return null;

    const id = normalizeId(raw.id, 'item');
    const name = asString(raw.name).trim();
    if (!name) return null;

    const desc = asString(raw.desc, name).trim();
    const type = asString(raw.type).trim() as ItemTemplate['type'];
    const grade = (ITEM_GRADES as readonly unknown[]).includes(raw.grade)
        ? (raw.grade as ItemTemplate['grade'])
        : 'standard';
    const size = normalizeItemSize(
        raw.size,
        type,
        asString(raw.weaponType).trim() as WeaponType
    );

    // 深渊异态三态为可选正交属性，仅在 LLM 给出有效数值时写入，避免污染普通工造物品。
    const anomalyStates = {
        ...(Number.isFinite(Number(raw.fleshFusionState))
            ? { fleshFusionState: Math.max(0, Math.floor(Number(raw.fleshFusionState))) }
            : {}),
        ...(Number.isFinite(Number(raw.cognitiveErosionState))
            ? { cognitiveErosionState: Math.max(0, Math.floor(Number(raw.cognitiveErosionState))) }
            : {}),
        ...(Number.isFinite(Number(raw.causalInversionState))
            ? { causalInversionState: Math.max(0, Math.floor(Number(raw.causalInversionState))) }
            : {})
    };

    switch (type) {
        case 'weapon': {
            const weaponType = (WEAPON_TYPES as readonly unknown[]).includes(raw.weaponType)
                ? (raw.weaponType as WeaponType)
                : 'wave';

            const weaponDamageType = (WEAPON_DAMAGE_TYPES as readonly unknown[]).includes(
                raw.weaponDamageType
            )
                ? (raw.weaponDamageType as WeaponDamageType)
                : 'melee';

            const damage = Math.max(0, Math.floor(asNumber(raw.damage, 5)));
            const critRaw = isRecord(raw.crit) ? raw.crit : {};

            return {
                id,
                name,
                desc,
                grade,
                size,
                ...anomalyStates,
                type: 'weapon',
                weaponType,
                weaponDamageType,
                range: clampNumber(
                    Math.floor(asNumber(raw.range, WEAPON_DEFAULT_RANGE[weaponType] ?? 1)),
                    0,
                    12
                ),
                damage,
                // 契约 WeaponTemplate.crit 为必填结构，缺失时按「无暴击加成」补齐。
                crit: {
                    chance: clampNumber(asNumber(critRaw.chance, 0.1), 0, 1),
                    bonus: Math.max(0, Math.floor(asNumber(critRaw.bonus, Math.floor(damage / 2))))
                },
                maxUses: Math.max(1, Math.floor(asNumber(raw.maxUses, 10)))
            };
        }

        case 'armor': {
            return {
                id,
                name,
                desc,
                grade,
                size,
                ...anomalyStates,
                type: 'armor',
                // 契约 ArmorTemplate 的字段名为 defense（-1~1 的减伤比）。
                defense: clampNumber(asNumber(raw.defense, 0.1), -1, 1),
                maxUses: Math.max(1, Math.floor(asNumber(raw.maxUses, 10)))
            };
        }

        case 'accessory': {
            return {
                id,
                name,
                desc,
                grade,
                size,
                ...anomalyStates,
                type: 'accessory',
                effects: normalizeAccessoryEffects(raw.effects)
            };
        }

        case 'consumable': {
            return {
                id,
                name,
                desc,
                grade,
                size,
                ...anomalyStates,
                type: 'consumable',
                effects: normalizeConsumableEffects(raw.effects)
            };
        }

        case 'storage': {
            return {
                id,
                name,
                desc,
                grade,
                size,
                ...anomalyStates,
                type: 'storage'
            };
        }

        case 'data': {
            const documentContent = asString(raw.documentContent).trim();
            const audioScript = asString(raw.audioScript).trim();

            return {
                id,
                name,
                desc,
                grade,
                size,
                ...anomalyStates,
                type: 'data',
                documentContent: documentContent || undefined,
                audioScript: audioScript || undefined
            };
        }

        case 'material': {
            return {
                id,
                name,
                desc,
                grade,
                size,
                ...anomalyStates,
                type: 'material'
            };
        }

        default:
            return null;
    }
};

/**
 * 归一化 LLM 输出的 NPC 模板。
 *
 * 奖励里的人员是同伴（`affinity` / `needs`），节点 NPC 只以 id 形式出现在任务目标里，
 * 两者共用同一套属性与体征，只有关系字段不同，故按用途补齐对应字段。
 */
function normalizeNpcTemplate(raw: unknown, kind: 'nodeNpc'): NodeNpcTemplate | null;
function normalizeNpcTemplate(raw: unknown, kind: 'companion'): CompanionTemplate | null;
function normalizeNpcTemplate(
    raw: unknown,
    kind: 'nodeNpc' | 'companion'
): NodeNpcTemplate | CompanionTemplate | null {
    if (!isRecord(raw)) return null;

    const maybeNpc =
        raw.type === 'npc' ||
        typeof raw.style === 'string' ||
        (isRecord(raw.initialState) && isRecord((raw.initialState as any).vital));

    if (!maybeNpc) return null;

    const id = normalizeId(raw.id, 'npc');
    const name = asString(raw.name).trim();
    if (!name) return null;

    const desc = asString(raw.desc, name).trim();
    const visualPrompt =
        asString(raw.visualPrompt).trim() ||
        `portrait of ${name}, grim cosmic horror survival RPG character, cinematic lighting, detailed face`;

    const style = COMBAT_STYLES.includes(raw.style as any)
        ? (raw.style as CombatStyle)
        : 'balance';

    const genderRaw = asString(raw.gender).trim().toLowerCase();
    const gender =
        genderRaw === 'male' || genderRaw === 'female' || genderRaw === 'both'
            ? (genderRaw as 'male' | 'female' | 'both')
            : undefined;

    const initialState = isRecord(raw.initialState) ? raw.initialState : {};
    const attributeRaw = isRecord(initialState.attribute) ? initialState.attribute : {};
    const vitalRaw = isRecord(initialState.vital) ? initialState.vital : {};

    return {
        id,
        name,
        desc,
        visualPrompt,
        gender,
        style,
        initialState: {
            attribute: {
                strength: clampNumber(Math.floor(asNumber(attributeRaw.strength, 10)), 0, 100),
                agility: clampNumber(Math.floor(asNumber(attributeRaw.agility, 10)), 0, 100),
                wisdom: clampNumber(Math.floor(asNumber(attributeRaw.wisdom, 10)), 0, 100),
                awareness: clampNumber(Math.floor(asNumber(attributeRaw.awareness, 10)), 0, 100),
                will: clampNumber(Math.floor(asNumber(attributeRaw.will, 10)), 0, 100),
                cthulhu: clampNumber(Math.floor(asNumber(attributeRaw.cthulhu, 0)), 0, 100)
            },
            vital: {
                maxHp: clampNumber(Math.floor(asNumber(vitalRaw.maxHp, 100)), 1, 5000),
                maxSanity: clampNumber(Math.floor(asNumber(vitalRaw.maxSanity, 100)), 1, 5000),
                maxStamina: clampNumber(Math.floor(asNumber(vitalRaw.maxStamina, 100)), 1, 5000),
                maxVigor: clampNumber(Math.floor(asNumber(vitalRaw.maxVigor, 100)), 1, 5000)
            },
            inventory: [],
            ...(kind === 'nodeNpc'
                ? { trust: Math.floor(asNumber(initialState.trust, 0)), quests: [] }
                : { affinity: Math.floor(asNumber(initialState.affinity, 0)), needs: [] })
        }
    } as unknown as NodeNpcTemplate | CompanionTemplate;
}

/**
 * 归一化任务目标项。
 *
 * 契约规定 goals 里的人员只能是「已存在的节点 NPC id」，
 * 因此字符串项直接作为 id 保留，其余按物品模板解析。
 */
const normalizeQuestGoal = (raw: unknown): ItemTemplate | string | null => {
    if (typeof raw === 'string') {
        const id = raw.trim();
        return id.length > 0 ? id : null;
    }

    const asNpcId = isRecord(raw) && typeof raw.id === 'string' ? raw.id.trim() : '';
    const item = normalizeItemTemplate(raw);
    if (item) return item;

    return asNpcId.length > 0 ? asNpcId : null;
};

/**
 * 归一化任务奖励项。
 *
 * 契约规定 rewards 可以为物品模板，也可以是完整同伴模板（永久入队）。
 */
const normalizeQuestReward = (raw: unknown): ItemTemplate | CompanionTemplate | null =>
    normalizeItemTemplate(raw) ?? normalizeNpcTemplate(raw, 'companion');

const normalizeQuestOutput = (raw: unknown): Partial<QuestTemplate> | undefined => {
    if (!isRecord(raw)) return undefined;

    const desc = asString(raw.desc).trim();
    if (!desc) return undefined;

    const id = normalizeId(raw.id, 'quest');

    const goals = Array.isArray(raw.goals)
        ? raw.goals
            .map((entry) => normalizeQuestGoal(entry))
            .filter((x): x is ItemTemplate | string => Boolean(x))
        : [];

    const rewards = Array.isArray(raw.rewards)
        ? raw.rewards
            .map((entry) => normalizeQuestReward(entry))
            .filter((x): x is ItemTemplate | CompanionTemplate => Boolean(x))
        : [];

    return {
        id,
        desc,
        goals,
        rewards,
        difficulty: clampNumber(Math.floor(asNumber(raw.difficulty, 3)), 1, 20)
    };
};

// =====================
// Prompt Builder
// =====================

const PromptBuilder = {
    buildRoleplaySystem(
        settings: Settings,
        npc: InteractionNpcEntity,
        environmentContext: string,
        dialogueHistory?: Dialogue,
        retrievedDialoguePairs?: Dialogue['dialogue']
    ): string {
        const gender =
            npc.static.gender === 'male'
                ? '男性'
                : npc.static.gender === 'female'
                    ? '女性'
                    : '未知';

        const coreDrive = ContextParser.inferCoreDrive(npc.static.style);
        const stateDesc = formatNpcState(npc);

        const relation = SocializationService.resolveRelation(npc.dynamic);
        const relationAxisDesc =
            relation.axis === 'trust' ? '节点 NPC / 社会性与契约性' : '同伴 / 情绪性与偏好性';

        const historyArray = dialogueHistory ? [dialogueHistory] : [];
        const memoryContext = SocializationService.buildMemoryContext(
            npc.dynamic,
            historyArray,
            npc.dynamic.memory
        );

        const specialInstructions = SocializationService.generateSpecialStateInstructions({
            settings,
            dynamic: npc.dynamic,
            sanity: npc.dynamic.sanity,
            hp: npc.dynamic.hp,
            maxHp: npc.dynamic.maxHp
        }).join('\n');

        const retrievedDialogueLines =
            retrievedDialoguePairs && retrievedDialoguePairs.length > 0
                ? retrievedDialoguePairs
                    .map(([p, n]) => {
                        const loc = p?.tag?.location;
                        const locName =
                            [loc?.zone?.name, loc?.node?.name].filter(Boolean).join(' / ') ||
                            '本地存档';

                        const pName = p?.tag?.speaker || '玩家';
                        const nName = n?.tag?.speaker || npc.static.name;

                        const pLine = p?.text ? `  - ${pName} (@ ${locName}): "${p.text}"` : '';
                        const nLine = n?.text ? `  - ${nName} (@ ${locName}): "${n.text}"` : '';

                        return [pLine, nLine].filter(Boolean).join('\n');
                    })
                    .join('\n---\n')
                : null;

        return `
你现在必须严格扮演并“成为”《The Zone — 无尽领域》中的角色「${npc.static.name}」。

【角色档案】
名称: ${npc.static.name}
性别: ${gender}
核心驱动: ${coreDrive}
背景故事: ${npc.static.desc || '未知'}
战斗风格: ${npc.static.style || 'balance'}
与玩家关系轴: ${relation.label}（${relationAxisDesc}）
与玩家关系阶段: ${relation.phase}
${relation.label}读数: ${Math.floor(relation.score)} / ${relation.range.max}（阶段区间 ${relation.range.min}~${relation.range.max}）

【生理与心理状态】
${stateDesc}

【记忆与共同经历】
${memoryContext || '暂无稳定共同经历。'}

${retrievedDialogueLines
                ? `【从本地历史对话文件检索调取的往期记录】\n${retrievedDialogueLines}\n`
                : ''
            }
【环境上下文】
${environmentContext}

【对话风格指令】
${specialInstructions || '保持克制、真实、符合角色处境。'}

【输出契约】
${SOCIAL_DIALOGUE_SCHEMA}
`.trim();
    },

    buildRoleplayUser(
        context: InteractionDialogueContext,
        previousPairs: Dialogue['dialogue'],
        lastInput: string,
        memorySummaries: string[]
    ): string {
        const conversationContext = ContextParser.buildConversationHistory(
            previousPairs,
            context.npc.static.name,
            3,
            memorySummaries
        );

        const playerObservation = ContextParser.parsePlayerObservation(context.player);
        const safeLastInput = lastInput.trim() || '（玩家沉默，没有有效发言）';

        return `
【对话记录】
${conversationContext}
${playerObservation}

【当前玩家发言】
玩家: "${safeLastInput}"

请以角色身份回应。
如果玩家沉默，可以做出简短观察、追问或不安反应。
只输出符合 NPC 对话输出协议的 JSON。
`.trim();
    },

    buildReactionSystem(
        npc: InteractionNpcEntity,
        currentNodeName: string,
        eventDesc: string,
        nodeDesc?: string,
        threatLevel?: number | string
    ): string {
        const relation = SocializationService.resolveRelation(npc.dynamic);
        const stateDesc = formatNpcState(npc);

        const sanityInst =
            npc.dynamic.sanity < 30
                ? '你的精神状态极差——反应可能不合逻辑、带有幻觉色彩、词语轻微错位。'
                : '';

        const relationInst = WARM_RELATION_PHASES.has(relation.phase)
            ? `你${relation.label}玩家，反应中体现这一点，但不要过度煽情。`
            : COLD_RELATION_PHASES.has(relation.phase)
                ? '你对玩家保持警惕，反应中体现距离感、试探或压抑的敌意。'
                : '';

        return `
你现在是《The Zone — 无尽领域》中的角色「${npc.static.name}」。

【角色简况】
${npc.static.desc || ''}

【当前状态】
${stateDesc}
与玩家关系轴: ${relation.label}
与玩家关系阶段: ${relation.phase}（${Math.floor(relation.score)}）
行为基准线: ${relation.behavior}

【环境】
位置: ${currentNodeName}${nodeDesc ? ` — ${nodeDesc}` : ''}
威胁等级: ${threatLevel ?? '未知'}

【触发事件】
${eventDesc}

【指令】
以角色身份对上述事件做出简短反应。
反应必须体现你的性格、当前状态和与玩家的关系。

${sanityInst}
${relationInst}

${SOCIAL_REACTION_SCHEMA}
`.trim();
    },

    buildIntimacySystem(npc: InteractionNpcEntity): string {
        const totalRounds = npc.dynamic.totalDialogueRounds || 0;
        const relation = SocializationService.resolveRelation(npc.dynamic);

        const intimacyScore = SocializationService.calculateIntimacyScore({
            score: relation.score,
            memory: npc.dynamic.memory,
            dialogueTurns: totalRounds
        });

        const gender =
            npc.static.gender === 'male'
                ? '男性'
                : npc.static.gender === 'female'
                    ? '女性'
                    : '未知';

        const memoryDesc =
            npc.dynamic.memory.δ.length > 0
                ? `- 你们的经历: ${npc.dynamic.memory.δ.map((m) => m.summary).join('、')}`
                : '';

        let emotionalContext =
            '恐惧和孤独侵蚀着所有人。在死亡随时降临的世界里，有些界限变得模糊，但双方仍然保留着迟疑与克制。';

        if (intimacyScore > 80) {
            emotionalContext =
                '你们经历了太多。这一刻不是冲动，而是积累已久的必然。仍然保持克制、创伤感与真实感。';
        } else if (npc.dynamic.memory.δ.some((m) => m.keyEntities.includes('肢体接触'))) {
            emotionalContext =
                '之前的肢体接触打开了一道缺口。在这个充满恐惧的世界里，对方的体温是唯一能证明活着的证据。';
        }

        return `
你现在是《The Zone — 无尽领域》中的角色「${npc.static.name}」。

Task: 描写一段玩家与角色之间深刻、克制、带有心理恐怖色彩的亲密时刻。
重点不是露骨色情，而是绝望中的连接、呼吸、体温、颤抖、低语、短暂安全感。

【角色上下文】
性别: ${gender}
性格: ${npc.static.desc || ''}
关系轴: ${relation.label}（${relation.axis === 'trust' ? '契约性 / 社会性' : '情绪性 / 偏好性'}）
关系阶段: ${relation.phase}
${relation.label}读数: ${Math.floor(relation.score)} / ${relation.range.max}
亲密深度评分: ${Math.round(intimacyScore)}
${memoryDesc}

【情感基调】
${emotionalContext}

${SOCIAL_INTIMACY_SCHEMA}
`.trim();
    },

    buildMemorySummarySystem(npcName: string): string {
        return `
你是一个专门负责提取记忆摘要的认知分析引擎。
基于玩家与「${npcName}」的对话切片，提取出最具长期价值的记忆。

${SOCIAL_MEMORY_SUMMARY_SCHEMA}
`.trim();
    },

    buildMemoryConsolidationSystem(npcName: string): string {
        return `
你是一个高级认知整合引擎。
你的任务是将「${npcName}」的多条较低层级记忆片段，整合为一条更高层级的核心记忆摘要。

${SOCIAL_MEMORY_CONSOLIDATION_SCHEMA}
`.trim();
    }
};

// =====================
// 缓存
// =====================

const npcCache = new GenericCacheManager<string>(150, 8 * 60 * 1000);

const generateCacheKey = (
    npcId: string,
    playerInput: string,
    dialogueSignature: string,
    model: { provider: string; model: string } | string
): string => {
    const modelStr =
        typeof model === 'string'
            ? model
            : `${model?.provider || 'unknown'}:${model?.model || 'unknown'}`;

    return JSON.stringify({
        npcId,
        playerInput: playerInput.substring(0, 80),
        dialogueSignature,
        model: modelStr
    });
};

const readCachedJSON = <T>(cacheKey: string): T | null => {
    const cached = npcCache.get(cacheKey);
    if (!cached) return null;

    try {
        return normalizeObjectKeys(JSON.parse(cached)) as T;
    } catch {
        npcCache.delete(cacheKey);
        return null;
    }
};

// =====================
// 降级
// =====================

const getFallbackDialogue = (
    error: unknown,
    userMsg: string
): { text: string; relationChange: number; mood: Mood } => {
    if (error instanceof AIOutputTruncatedError) {
        return { text: '...(信号丢失)...', relationChange: 0, mood: 'neutral' };
    }

    if (error instanceof AIServiceError) {
        if (error.errorType === ErrorType.SAFETY) {
            return { text: '(认知过滤阻断)', relationChange: 0, mood: 'neutral' };
        }

        if (error.errorType === ErrorType.RATE_LIMIT) {
            return { text: '...(精神网络繁忙)...', relationChange: 0, mood: 'neutral' };
        }
    }

    return { text: `...(${userMsg})...`, relationChange: 0, mood: 'neutral' };
};

// =====================
// 对外接口
// =====================

export interface NPCDialogueOutput {
    text: string;
    /**
     * 关系增量。
     *
     * 目标为节点 NPC 时写入信任轴，目标为同伴时写入好感轴，
     * 具体落位由 SocializationService.applyRelationDelta 按动态字段判定。
     */
    relationChange: number;
    mood: Mood;
    thought?: string;
    modelThought?: string;
    quest?: Partial<QuestTemplate>;
    /**
     * 本轮真正注入 Prompt 的记忆摘要 id。
     *
     * 供引擎回写 accessCount / accessRatio / lastAccessedAt（记忆长期维护契约）。
     */
    memoryAccessIds?: string[];
}

export const generateNPCDialogue = async (
    settings: Settings,
    context: InteractionDialogueContext
): Promise<NPCDialogueOutput> => {
    const { npc, player, dialogue, location } = context;

    BaseProvider.validateRequiredParams(
        { settings, npc, player },
        ['settings', 'npc', 'player'],
        'NPC Dialogue Generation'
    );

    const modelToUse = settings.npcDialogueModel || settings.zoneModel;
    if (!modelToUse) throw new Error('No valid model configuration found');

    const environmentContext = ContextParser.parseLocation(location);
    const lastPlayerInput = ContextParser.extractLastPlayerInput(dialogue);

    // 本轮注入 Prompt 的 δ 摘要：同时回报 id，供引擎回写检索计数。
    const injectedMemories = npc.dynamic.memory.δ.slice(-5);
    const memorySummaries = injectedMemories.map((m) => m.summary);
    const memoryAccessIds = injectedMemories.map((m) => m.id);

    const previousPairs = dialogue.dialogue.filter(
        ([p, n]) =>
            (typeof p?.text === 'string' && p.text.trim().length > 0) ||
            (typeof n?.text === 'string' && n.text.trim().length > 0)
    );

    const dialogueSignature = `${dialogue.dialogue.length}:${previousPairs.length}:${hashString(
        lastPlayerInput
    )}`;

    const cacheKey = generateCacheKey(
        npc.static.id,
        lastPlayerInput,
        dialogueSignature,
        modelToUse
    );

    const cached = readCachedJSON<NPCDialogueOutput>(cacheKey);
    if (cached) return cached;

    npcCache.cleanExpiredCache();

    let currentRetrievedDialogue: Dialogue['dialogue'] | undefined;

    try {
        for (let iteration = 0; iteration < MAX_MEMORY_SEARCH_ITERATIONS; iteration += 1) {
            const systemPrompt = PromptBuilder.buildRoleplaySystem(
                settings,
                npc,
                environmentContext,
                dialogue,
                currentRetrievedDialogue
            );

            const userPrompt = PromptBuilder.buildRoleplayUser(
                context,
                previousPairs,
                lastPlayerInput,
                memorySummaries
            );

            const aiResponse = (await callAi(settings, {
                providerId: modelToUse.provider,
                model: modelToUse.model,
                capability: 'npcDialogue',
                systemPrompt,
                userPrompt,
                jsonMode: true
            })) as AIResponse;

            const parsed = BaseProvider.safeJSONParseWithInfo<{
                response?: unknown;
                needMemorySearch?: unknown;
                relationChange?: unknown;
                /** 旧字段：契约迁移前的信任增量，仅作兼容读取。 */
                trustChange?: unknown;
                mood?: unknown;
                thought?: unknown;
                quest?: unknown;
            }>(aiResponse.text, {});

            const data = normalizeObjectKeys(parsed.data);

            const responseText = asString(data.response).trim();

            if (BaseProvider.isTruncated(aiResponse.text) && (!responseText || responseText === '...')) {
                throw new AIOutputTruncatedError();
            }

            if (responseText && responseText !== '...') {
                const result: NPCDialogueOutput = {
                    text: responseText,
                    relationChange: clampNumber(
                        Math.floor(asNumber(data.relationChange ?? data.trustChange, 0)),
                        -100,
                        100
                    ),
                    mood: normalizeMood(data.mood),
                    thought: asString(data.thought) || undefined,
                    modelThought: aiResponse.thought,
                    quest: normalizeQuestOutput(data.quest),
                    memoryAccessIds
                };

                npcCache.set(cacheKey, JSON.stringify(result));
                return result;
            }

            const rawSearch = data.needMemorySearch;
            const rawSearchQuery =
                typeof rawSearch === 'string'
                    ? rawSearch.trim()
                    : Array.isArray(rawSearch)
                        ? rawSearch.map((entry) => asString(entry)).join(',')
                        : '';

            const keywords = rawSearchQuery
                ? rawSearchQuery
                    .split(/[\s,，、;；|/\\-]+/)
                    .map((k) => k.trim())
                    .filter((k) => k.length > 0)
                : [];

            if (keywords.length > 0) {
                const matchedPairs = searchHistoricalDialogueByKeywords(dialogue, keywords);

                if (matchedPairs.length > 0) {
                    currentRetrievedDialogue = [
                        ...(currentRetrievedDialogue || []),
                        ...matchedPairs.filter(
                            (pair) => !(currentRetrievedDialogue || []).includes(pair)
                        )
                    ];
                }

                continue;
            }

            break;
        }

        const fallback = getFallbackDialogue(new Error('No valid response'), lastPlayerInput);

        return {
            ...fallback,
            thought: undefined,
            modelThought: undefined,
            quest: undefined
        };
    } catch (error) {
        const userMsg = BaseProvider.formatErrorForUser(error);

        if (error instanceof AIOutputTruncatedError) {
            BaseProvider.logError('NPC Dialogue Truncated', error, { npcId: npc.static.id });
        }

        return BaseProvider.handleServiceError(
            error,
            'NPC Dialogue Generation',
            {
                npcId: npc.static.id,
                npcName: npc.static.name,
                model: modelToUse,
                inputLength: lastPlayerInput.length
            },
            getFallbackDialogue(error, userMsg)
        ) as NPCDialogueOutput;
    }
};

export const generateNPCReaction = async (
    settings: Settings,
    npc: InteractionNpcEntity,
    location: Location['currentLocation'],
    eventDesc: string
): Promise<{ content: string; isAction: boolean }> => {
    BaseProvider.validateRequiredParams(
        { settings, npc, eventDesc },
        ['settings', 'npc', 'eventDesc'],
        'NPC Reaction Generation'
    );

    const modelToUse =
        settings.npcReactionModel || settings.npcDialogueModel || settings.zoneModel;

    if (!modelToUse) throw new Error('No valid model configuration found');

    const currentNodeName = location.node ? location.node.name : '未知区域';
    const currentNodeDesc = location.node ? location.node.desc : undefined;
    const currentThreatLevel = location.node
        ? (location.node.isDangerous ? '危险' : '安全')
        : '未知';

    const systemPrompt = PromptBuilder.buildReactionSystem(
        npc,
        currentNodeName,
        eventDesc,
        currentNodeDesc,
        currentThreatLevel
    );

    const userPrompt = '以角色身份回应。只输出符合 NPC 反应输出协议的 JSON。';

    const cacheKey = generateCacheKey(
        npc.static.id,
        eventDesc,
        `${currentNodeName}_${currentNodeDesc || ''}`,
        modelToUse
    );

    const cached = readCachedJSON<{ content: string; isAction: boolean }>(cacheKey);
    if (cached) return cached;

    npcCache.cleanExpiredCache();

    try {
        const aiResponse = (await callAi(settings, {
            providerId: modelToUse.provider,
            model: modelToUse.model,
            capability: 'npcReaction',
            systemPrompt,
            userPrompt,
            jsonMode: true
        })) as AIResponse;

        const parsed = BaseProvider.safeJSONParseWithInfo<{
            content?: unknown;
            isAction?: unknown;
        }>(aiResponse.text, {
            content: '',
            isAction: true
        });

        const data = normalizeObjectKeys(parsed.data);

        const result = {
            content: asString(data.content, ''),
            isAction: typeof data.isAction === 'boolean' ? data.isAction : true
        };

        npcCache.set(cacheKey, JSON.stringify(result));
        return result;
    } catch (error) {
        return BaseProvider.handleServiceError(
            error,
            'NPC Reaction Generation',
            { npcId: npc.static.id, eventDesc },
            { content: '', isAction: true }
        ) as { content: string; isAction: boolean };
    }
};

export const generateNPCIntimacy = async (
    settings: Settings,
    npc: InteractionNpcEntity
): Promise<{ desc: string; vocal: string }> => {
    BaseProvider.validateRequiredParams(
        { settings, npc },
        ['settings', 'npc'],
        'NPC Intimacy Generation'
    );

    const modelToUse = settings.npcDialogueModel || settings.zoneModel;
    if (!modelToUse) throw new Error('No valid model configuration found');

    const systemPrompt = PromptBuilder.buildIntimacySystem(npc);
    const userPrompt = '开始生成亲密互动。聚焦感官细节、呼吸、低语与绝望中的连接。只输出 JSON。';

    const cacheKey = generateCacheKey(
        npc.static.id,
        'intimacy',
        String(getRelationScore(npc.dynamic)),
        modelToUse
    );

    const cached = readCachedJSON<{ desc: string; vocal: string }>(cacheKey);
    if (cached) return cached;

    npcCache.cleanExpiredCache();

    try {
        const aiResponse = (await callAi(settings, {
            providerId: modelToUse.provider,
            model: modelToUse.model,
            capability: 'npcDialogue',
            systemPrompt,
            userPrompt,
            jsonMode: true
        })) as AIResponse;

        const parsed = BaseProvider.safeJSONParseWithInfo<{
            desc?: unknown;
            vocal?: unknown;
        }>(aiResponse.text, {
            desc: '...',
            vocal: '...'
        });

        const data = normalizeObjectKeys(parsed.data);

        const result = {
            desc: asString(data.desc, '...'),
            vocal: asString(data.vocal, '...')
        };

        npcCache.set(cacheKey, JSON.stringify(result));
        return result;
    } catch (error) {
        return BaseProvider.handleServiceError(
            error,
            'NPC Intimacy Generation',
            { npcId: npc.static.id },
            { desc: '...', vocal: '...' }
        ) as { desc: string; vocal: string };
    }
};

export const extractNpcMemorySummaries = async (
    settings: Settings,
    npc: InteractionNpcEntity,
    dialogueHistory: Array<[Words<PlayerWordsTag>, Words<NpcWordsTag>]>
): Promise<{ summary: string; keyEntities: string[]; importanceScore: number } | null> => {
    BaseProvider.validateRequiredParams(
        { settings, npc },
        ['settings', 'npc'],
        'NPC Memory Summary Extraction'
    );

    const modelToUse =
        settings.npcMemorySummaryModel || settings.npcDialogueModel || settings.zoneModel;

    if (!modelToUse || !dialogueHistory || dialogueHistory.length === 0) return null;

    const transcript = dialogueHistory
        .map(([pWord, nWord]) => `玩家: ${pWord.text}\n${npc.static.name}: ${nWord.text}`)
        .join('\n');

    const systemPrompt = PromptBuilder.buildMemorySummarySystem(npc.static.name);
    const userPrompt = `【对话片段】\n${transcript}\n\n只输出符合记忆摘要输出协议的 JSON。`;

    try {
        const aiResponse = (await callAi(settings, {
            providerId: modelToUse.provider,
            model: modelToUse.model,
            capability: 'npcDialogue',
            systemPrompt,
            userPrompt,
            jsonMode: true
        })) as AIResponse;

        const parsed = BaseProvider.safeJSONParseWithInfo<{
            summary?: unknown;
            keyEntities?: unknown;
            importanceScore?: unknown;
        }>(aiResponse.text, {
            summary: '',
            keyEntities: [],
            importanceScore: 0
        });

        const data = normalizeObjectKeys(parsed.data);

        return {
            summary: asString(data.summary, ''),
            keyEntities: Array.isArray(data.keyEntities)
                ? data.keyEntities.filter((x): x is string => typeof x === 'string')
                : [],
            importanceScore: clampNumber(asNumber(data.importanceScore, 0), 0, 1)
        };
    } catch (error) {
        BaseProvider.logError('NPC Memory Summary Extraction', error, { npcId: npc.static.id });
        return null;
    }
};

export const consolidateNpcMemories = async (
    settings: Settings,
    npc: InteractionNpcEntity,
    memories: MemorySummaries[]
): Promise<{ summary: string; keyEntities: string[]; importanceScore: number } | null> => {
    BaseProvider.validateRequiredParams(
        { settings, npc },
        ['settings', 'npc'],
        'NPC Memory Consolidation'
    );

    const modelToUse =
        settings.npcMemoryConsolidationModel || settings.npcDialogueModel || settings.zoneModel;

    if (!modelToUse || !memories || memories.length === 0) return null;

    const memoryList = memories.map((m, i) => `片段 ${i + 1}: ${m.summary}`).join('\n');

    const systemPrompt = PromptBuilder.buildMemoryConsolidationSystem(npc.static.name);
    const userPrompt = `【待整合记忆片段】\n${memoryList}\n\n只输出符合记忆整合输出协议的 JSON。`;

    try {
        const aiResponse = (await callAi(settings, {
            providerId: modelToUse.provider,
            model: modelToUse.model,
            capability: 'npcDialogue',
            systemPrompt,
            userPrompt,
            jsonMode: true
        })) as AIResponse;

        const parsed = BaseProvider.safeJSONParseWithInfo<{
            summary?: unknown;
            keyEntities?: unknown;
            importanceScore?: unknown;
        }>(aiResponse.text, {
            summary: '',
            keyEntities: [],
            importanceScore: 0
        });

        const data = normalizeObjectKeys(parsed.data);

        return {
            summary: asString(data.summary, ''),
            keyEntities: Array.isArray(data.keyEntities)
                ? data.keyEntities.filter((x): x is string => typeof x === 'string')
                : [],
            importanceScore: clampNumber(asNumber(data.importanceScore, 0), 0, 1)
        };
    } catch (error) {
        BaseProvider.logError('NPC Memory Consolidation', error, { npcId: npc.static.id });
        return null;
    }
};

export const clearNPCCache = (): void => {
    npcCache.clear();
};

export const getNPCCacheStats = (): { size: number; maxSize: number; ttl: number } => {
    return npcCache.getStats();
};