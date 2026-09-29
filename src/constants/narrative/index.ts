/**
 * index.ts
 *
 * 叙事常量模块的唯一出口。
 *
 * 外部（服务层、UI 层）一律从本文件导入，禁止深度引用内部文件。
 *
 * 本模块只承载预设数据；恐怖域 / 元 / 美学的契约校验、合并与引用检查
 * 属于引擎规则，已迁至 `../../meta/tools.ts`。
 *
 * @see ./domains.ts
 * @see ./atoms.ts
 * @see ./aesthetics.ts
 * @see ./presets.ts
 * @see ../../meta/tools.ts
 */

export { HORROR_DOMAINS } from './domains'
export { HORROR_ATOMS } from './atoms'
export { HORROR_AESTHETICS } from './aesthetics'
export { MODES_DEF, NARRATIVE_PACING, MOTIF_PRESETS, AXIS_PRESETS } from './presets'
