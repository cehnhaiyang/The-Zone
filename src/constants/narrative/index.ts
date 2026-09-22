/**
 * index.ts
 *
 * 叙事常量模块的唯一出口。
 *
 * 外部（服务层、UI 层）一律从本文件导入，禁止深度引用内部文件。
 *
 * @see ./domains.ts
 * @see ./atoms.ts
 * @see ./aesthetics.ts
 * @see ./presets.ts
 * @see ./tools.ts
 */

export { HORROR_DOMAINS } from './domains'
export { HORROR_ATOMS } from './atoms'
export { HORROR_AESTHETICS } from './aesthetics'
export { MODES_DEF, NARRATIVE_PACING, MOTIF_PRESETS, AXIS_PRESETS } from './presets'

export {
    findAestheticReferences,
    mergeNarrativeLibrary,
    validateAesthetic,
    validateAtom,
    validateDomain,
} from './tools'
export type { NarrativeDraftContext, NarrativeDraftIssue } from './tools'
