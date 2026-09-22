/**
 * tools.ts
 *
 * 叙事域的纯函数工具集。
 *
 * 只承载「恐怖域 / 恐怖元 / 恐怖美学」三者共用的校验、查表与合并逻辑，
 * 不持有任何状态，供常量层、服务层与 UI 层共同调用。
 *
 * @see ../../meta/interface.ts
 */

import type { HorrorAesthetic, HorrorAtom, HorrorDomain } from '../../meta'

/**
 * 骨架主导度之和的允许误差。
 *
 * 契约要求「所有元相加须为 1.0」，但玩家手工录入的小数累加必然存在浮点误差，
 * 故以 1e-6 作为判定容差，超出即视为非法。
 */
const DOMINANCE_EPSILON = 1e-6

/**
 * 自建内容 id 的合法形态。
 *
 * 允许 snake_case 与 camelCase：预设美学使用 camelCase（如 `cyberOccult`），
 * 预设主轴同样使用 camelCase，故不能强推 snake_case。
 * 首字符限定为字母，避免出现纯数字 id 与文件名冲突。
 */
const NARRATIVE_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/

/** 校验失败项。 */
export interface NarrativeDraftIssue {
    /** 出错的字段路径，如 `structure.skeleton`。 */
    field: string
    /** 中文错误说明，可直接呈现给玩家。 */
    message: string
}

/** 校验上下文：既有 id 集合用于查重，域与元集合用于引用校验。 */
export interface NarrativeDraftContext {
    /** 需要排除的自身 id（编辑场景下，自身不算冲突）。 */
    selfId?: string
    /** 全部已占用的 id（预设 + 自建）。 */
    takenIds: string[]
    domains: HorrorDomain[]
    atoms: HorrorAtom[]
}

/** 共鸣条目：契约的 resonance 是判别联合，取其元素类型。 */
type ResonanceEntry = NonNullable<HorrorAesthetic['structure']['resonance']>[number]

/**
 * 判断共鸣条目是否为「共生 / 拮抗」形态。
 *
 * symbiosis / polarization 用 atomId，parasitism / herald 用 source + target。
 * 以 `atomId` 是否存在作为判别依据，让 TypeScript 能在两分支间正确窄化。
 */
const isAtomListResonance = (
    entry: ResonanceEntry,
): entry is { atomId: string[]; type: 'symbiosis' | 'polarization' } => 'atomId' in entry

/** 校验 id 形态与唯一性。 */
const validateId = (
    id: string,
    label: string,
    context: NarrativeDraftContext,
): NarrativeDraftIssue[] => {
    const trimmed = id.trim()
    if (!trimmed) {
        return [{ field: 'id', message: `${label} id 不能为空。` }]
    }
    if (!NARRATIVE_ID_PATTERN.test(trimmed)) {
        return [{ field: 'id', message: `${label} id 只能由字母、数字与下划线组成，且必须以字母开头。` }]
    }
    if (trimmed !== context.selfId && context.takenIds.includes(trimmed)) {
        return [{ field: 'id', message: `${label} id「${trimmed}」已被占用。` }]
    }
    return []
}

/** 校验 _Nar 基底四字段中除 id 外的三项。 */
const validateNarFields = (
    entity: { name: string; desc: string; prompt: string },
    label: string,
): NarrativeDraftIssue[] => {
    const issues: NarrativeDraftIssue[] = []
    if (!entity.name.trim()) issues.push({ field: 'name', message: `${label}名称不能为空。` })
    if (!entity.desc.trim()) issues.push({ field: 'desc', message: `${label}描述不能为空。` })
    if (!entity.prompt.trim()) issues.push({ field: 'prompt', message: `${label}提示词不能为空。` })
    return issues
}

/** 校验恐怖域草稿。 */
export const validateDomain = (
    draft: HorrorDomain,
    context: NarrativeDraftContext,
): NarrativeDraftIssue[] => [
    ...validateId(draft.id, '恐怖域', context),
    ...validateNarFields(draft, '恐怖域'),
]

/** 校验恐怖元草稿。 */
export const validateAtom = (
    draft: HorrorAtom,
    context: NarrativeDraftContext,
): NarrativeDraftIssue[] => [
    ...validateId(draft.id, '恐怖元', context),
    ...validateNarFields(draft, '恐怖元'),
]

/**
 * 校验恐怖美学草稿。
 *
 * 除 id 与文本字段外，重点校验三类结构性约束：
 * 1. 主控域必须存在，渗透域必须存在且不与主控域重复；
 * 2. 骨架至少一项，且 dominance 之和严格为 1.0；
 * 3. 骨架 / 血肉 / 共鸣引用的恐怖元必须真实存在。
 */
export const validateAesthetic = (
    draft: HorrorAesthetic,
    context: NarrativeDraftContext,
): NarrativeDraftIssue[] => {
    const issues: NarrativeDraftIssue[] = [
        ...validateId(draft.id, '恐怖美学', context),
        ...validateNarFields(draft, '恐怖美学'),
    ]

    const domainIds = new Set(context.domains.map((d) => d.id))
    const atomIds = new Set(context.atoms.map((a) => a.id))

    if (!domainIds.has(draft.primaryDomain)) {
        issues.push({ field: 'primaryDomain', message: `主控域「${draft.primaryDomain}」不存在。` })
    }

    const interfering = draft.interferingDomains ?? []
    interfering.forEach((id, index) => {
        if (!domainIds.has(id)) {
            issues.push({ field: `interferingDomains[${index}]`, message: `渗透域「${id}」不存在。` })
        }
        if (id === draft.primaryDomain) {
            issues.push({ field: `interferingDomains[${index}]`, message: `渗透域不能与主控域相同。` })
        }
    })

    const skeleton = draft.structure?.skeleton ?? []
    if (skeleton.length === 0) {
        issues.push({ field: 'structure.skeleton', message: '骨架至少需要包含一个恐怖元。' })
    }

    const dominanceSum = skeleton.reduce(
        (sum, entry) => sum + (Number.isFinite(entry.dominance) ? entry.dominance : 0),
        0,
    )
    if (skeleton.length > 0 && Math.abs(dominanceSum - 1) > DOMINANCE_EPSILON) {
        issues.push({
            field: 'structure.skeleton',
            message: `骨架主导度之和必须为 1.0，当前为 ${Number(dominanceSum.toFixed(4))}。`,
        })
    }

    const checkAtomRefs = (ids: string[], field: string) => {
        ids.forEach((id, index) => {
            if (!atomIds.has(id)) {
                issues.push({ field: `${field}[${index}]`, message: `恐怖元「${id}」不存在。` })
            }
        })
    }

    skeleton.forEach((entry, index) => checkAtomRefs([entry.atomId], `structure.skeleton[${index}].atomId`))
    ;(draft.structure?.flesh ?? []).forEach((entry, index) =>
        checkAtomRefs([entry.atomId], `structure.flesh[${index}].atomId`),
    )
    ;(draft.structure?.resonance ?? []).forEach((entry, index) => {
        if (isAtomListResonance(entry)) {
            checkAtomRefs(entry.atomId, `structure.resonance[${index}].atomId`)
        } else {
            checkAtomRefs(entry.source, `structure.resonance[${index}].source`)
            checkAtomRefs(entry.target, `structure.resonance[${index}].target`)
        }
    })

    return issues
}

/**
 * 收集某恐怖域 / 恐怖元被哪些恐怖美学引用。
 *
 * 强校验策略下，删除前必须确认无引用者，否则会产生指向不存在元的美学。
 */
export const findAestheticReferences = (
    aesthetics: HorrorAesthetic[],
    target: { kind: 'domain' | 'atom'; id: string },
): HorrorAesthetic[] =>
    aesthetics.filter((aesthetic) => {
        if (target.kind === 'domain') {
            return (
                aesthetic.primaryDomain === target.id ||
                (aesthetic.interferingDomains ?? []).includes(target.id)
            )
        }
        const structure = aesthetic.structure
        return (
            structure.skeleton.some((entry) => entry.atomId === target.id) ||
            (structure.flesh ?? []).some((entry) => entry.atomId === target.id) ||
            (structure.resonance ?? []).some((entry) =>
                isAtomListResonance(entry)
                    ? entry.atomId.includes(target.id)
                    : entry.source.includes(target.id) || entry.target.includes(target.id),
            )
        )
    })

/**
 * 按 id 合并预设库与自建库。
 *
 * 自建内容 id 在保存前已通过唯一性校验，不会与预设冲突；
 * 此处仍做一次覆盖，保证即使外部文件被手工篡改也不会产生重复条目。
 */
export const mergeNarrativeLibrary = <T extends { id: string }>(
    presets: T[],
    custom: T[],
): T[] => {
    const merged = new Map<string, T>()
    presets.forEach((item) => merged.set(item.id, item))
    custom.forEach((item) => merged.set(item.id, item))
    return Array.from(merged.values())
}
