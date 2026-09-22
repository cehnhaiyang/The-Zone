import type { ItemGrade } from '../meta'

/**
 * 稀有度视觉变量（CSS 契约）
 *
 * 键名直接绑定至元素内联 style，由样式系统的两档消费层读取：
 *  - `.grade-card` 皮肤档：需要 `<div class="rarity-skin">` 子层，全量渲染（渐变底色 / 多边形裁切 / 纹理叠加 / 物理动效）
 *  - `.grade-cell` 单元素档：网格条目、装备插槽、背囊列表，仅读取色彩渲染与半透明染色
 * 未提供的可选键一律由默认样式表兜底，低阶工造保持数据稀疏。
 */
export interface RarityVisualVars {
    /* ── 色彩核心 ── */
    /** 基础主题色十六进制代码：皮肤底色、指示色条、主边框 */
    '--r-base': string
    /** 基础主题色 RGB 通道分解值（例如 "122, 111, 95"），便于运行时动态构建 rgba() */
    '--r-base-rgb': string
    /** 高亮辅助色：悬停高光、战术角标、内缘亮线 */
    '--r-accent': string
    /** 高亮辅助色 RGB 通道分解值 */
    '--r-accent-rgb': string
    /** 近距辉光（text-shadow / 描边发光） */
    '--r-glow': string
    /** 远距光晕（容器大范围外发光） */
    '--r-halo'?: string
    /** 主标题 / 物品名称文字色 */
    '--r-text': string
    /** 边框线条颜色 */
    '--r-border': string
    /** 皮肤内侧 1px 战术高光边 */
    '--r-edge'?: string
    /** 底衬染色：背囊网格槽位的半透明铺底色 */
    '--r-wash'?: string

    /* ── 表面与叠加 ── */
    /** 皮肤渐变底色 */
    '--r-bg': string
    /** box-shadow 投影参数 */
    '--r-shadow'?: string
    /** 叠加层纹样（扫描线 / 金属网格 / 光导带 / 噪点） */
    '--r-overlay'?: string
    /** 叠加层纹样 background-size */
    '--r-overlay-size'?: string
    /** 叠加层混合模式（如 'screen' | 'overlay' | 'soft-light'） */
    '--r-overlay-blend'?: string
    /** 叠加层不透明度 0.0–1.0 */
    '--r-overlay-opacity'?: number
    /** 皮肤滤镜组合（saturate / brightness / contrast / drop-shadow） */
    '--r-filter'?: string

    /* ── 形态与轮廓 ── */
    /** 皮肤多边形 clip-path 裁切形状（仅限皮肤档生效，不影响内部交互容器） */
    '--r-clip'?: string
    /** 基础圆角半径 */
    '--r-radius'?: string
    /** 边框描边粗细 */
    '--r-border-width'?: string

    /* ── 排版与战术动效 ── */
    /** 物品名称字重 (Font Weight) */
    '--r-weight': number
    /** 物品名称字间距 (Letter Spacing) */
    '--r-tracking': string
    /** 容器卡面动效（脉冲 / 呼吸 / 极境失稳） */
    '--r-anim-card'?: string
    /** 叠加层动画（流光扫掠 / 荧光屏垂直扫描） */
    '--r-anim-overlay'?: string
    /** 名称文字特效（字符色差裂变） */
    '--r-anim-name'?: string
}

/**
 * 品质工造元接口 (Item Grade Meta Interface)
 */
export interface IG {
    /** 品质标识（严格对齐 type.ts 中 ItemGrade 的 8 阶物理工造体系） */
    level: ItemGrade
    /** 序号位次（1–8） */
    tier: number
    /** 战术工造代号（T1–T8） */
    code: string
    /** 界面显示标准名称 */
    name: string
    /** 军工规范与工业别名 */
    alias: string
    /** 世界观背景与材质工艺考据说明 */
    desc: string
    /**
     * 装饰渲染强度 0–3：
     * 0: 克制 (收敛动效与叠加，避免低阶物品引发视觉噪点)
     * 1: 内敛 (微弱光晕与细微流光)
     * 2: 显赫 (多边形几何切角与常驻呼吸发光)
     * 3: 奇点极境 (高维黑晶或旧文明终极工程，全量粒子与高斯辉光)
     */
    intensity: 0 | 1 | 2 | 3
    /** 地面战术标记 / 掉落射线标准色 */
    dropColor: string
    /** 视觉样式变量集 */
    vars: RarityVisualVars
}

/**
 * 八阶物理工造谱系元数据常量列表 (RARITY_META)
 *
 * 严格遵循《背景设定.md》第六章物理工造标准：
 * 深渊异态（血肉融合、认知侵蚀、因果倒错）属于正交属性，
 * 物品的基础物理骨架严格按此 8 档排列。
 */
export const RARITY_META: IG[] = [
    {
        level: 'salvaged',
        tier: 1,
        code: 'T1',
        name: '废土粗制',
        alias: '拼凑残损',
        desc: '利用废墟碎铁、电线与绝缘胶布手工拼凑的原始造物。结构脆弱，公差极大，耐久极低。',
        intensity: 0,
        dropColor: '#7a6f5f',
        vars: {
            '--r-base': '#7a6f5f',
            '--r-base-rgb': '122, 111, 95',
            '--r-accent': '#a79781',
            '--r-accent-rgb': '167, 151, 129',
            '--r-glow': 'rgba(122, 111, 95, 0.14)',
            '--r-halo': 'rgba(122, 111, 95, 0.08)',
            '--r-text': '#9b9081',
            '--r-border': 'rgba(80, 72, 60, 0.75)',
            '--r-edge': 'rgba(167, 151, 129, 0.12)',
            '--r-wash': 'rgba(122, 111, 95, 0.06)',
            '--r-shadow': '0 0 0 rgba(0, 0, 0, 0)',
            '--r-bg': 'linear-gradient(145deg, #181512 0%, #241f19 55%, #1b1713 100%)',
            '--r-overlay': 'repeating-linear-gradient(115deg, rgba(255, 255, 255, 0.015) 0 1px, transparent 1px 6px)',
            '--r-overlay-blend': 'overlay',
            '--r-overlay-opacity': 0.45,
            '--r-filter': 'saturate(0.72) brightness(0.92) contrast(0.98)',
            '--r-radius': '2px',
            '--r-border-width': '1px',
            '--r-weight': 400,
            '--r-tracking': '0.04em',
        },
    },
    {
        level: 'standard',
        tier: 2,
        code: 'T2',
        name: '旧世民用',
        alias: '规整标准',
        desc: '大灾变前随处可见的工业流水线民用消费品。符合民用安全规范，但缺乏抵御高维恶意的韧度。',
        intensity: 0,
        dropColor: '#94a3b8',
        vars: {
            '--r-base': '#94a3b8',
            '--r-base-rgb': '148, 163, 184',
            '--r-accent': '#cbd5e1',
            '--r-accent-rgb': '203, 213, 225',
            '--r-glow': 'rgba(148, 163, 184, 0.18)',
            '--r-halo': 'rgba(148, 163, 184, 0.10)',
            '--r-text': '#b0bac7',
            '--r-border': 'rgba(71, 85, 105, 0.82)',
            '--r-edge': 'rgba(203, 213, 225, 0.16)',
            '--r-wash': 'rgba(148, 163, 184, 0.06)',
            '--r-shadow': '0 0 2px var(--r-glow)',
            '--r-bg': 'linear-gradient(145deg, #15191e 0%, #20262e 60%, #171b21 100%)',
            '--r-overlay': 'linear-gradient(180deg, rgba(255, 255, 255, 0.035), transparent 36%)',
            '--r-overlay-blend': 'screen',
            '--r-overlay-opacity': 0.6,
            '--r-radius': '2px',
            '--r-border-width': '1px',
            '--r-weight': 500,
            '--r-tracking': '0.05em',
        },
    },
    {
        level: 'reinforced',
        tier: 3,
        code: 'T3',
        name: '强治安保',
        alias: '加固特勤',
        desc: '旧联邦特警防暴队与重装押运配发的加固器材。结构抗冲击性能优秀，重点部位附着加厚冷轧钢。',
        intensity: 1,
        dropColor: '#38bdf8',
        vars: {
            '--r-base': '#38bdf8',
            '--r-base-rgb': '56, 189, 248',
            '--r-accent': '#7dd3fc',
            '--r-accent-rgb': '125, 211, 252',
            '--r-glow': 'rgba(56, 189, 248, 0.26)',
            '--r-halo': 'rgba(56, 189, 248, 0.18)',
            '--r-text': '#7dd3fc',
            '--r-border': 'rgba(12, 74, 110, 0.90)',
            '--r-edge': 'rgba(125, 211, 252, 0.28)',
            '--r-wash': 'rgba(56, 189, 248, 0.08)',
            '--r-shadow': '0 0 10px var(--r-glow)',
            '--r-bg': 'linear-gradient(150deg, #071726 0%, #0d2842 58%, #091a2b 100%)',
            '--r-overlay': 'repeating-linear-gradient(135deg, transparent 0 6px, rgba(125, 211, 252, 0.06) 6px 7px)',
            '--r-overlay-blend': 'screen',
            '--r-overlay-opacity': 0.8,
            '--r-clip': 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
            '--r-border-width': '1px',
            '--r-weight': 600,
            '--r-tracking': '0.06em',
        },
    },
    {
        level: 'military',
        tier: 4,
        code: 'T4',
        name: '正规军工',
        alias: '军械制式',
        desc: '正规国防军步兵班组制式列装。具备经受实战检验的可靠致伤力与耐候性，模块化接口齐备。',
        intensity: 1,
        dropColor: '#22c55e',
        vars: {
            '--r-base': '#22c55e',
            '--r-base-rgb': '34, 197, 94',
            '--r-accent': '#86efac',
            '--r-accent-rgb': '134, 239, 172',
            '--r-glow': 'rgba(34, 197, 94, 0.28)',
            '--r-halo': 'rgba(34, 197, 94, 0.20)',
            '--r-text': '#86efac',
            '--r-border': 'rgba(20, 83, 45, 0.92)',
            '--r-edge': 'rgba(134, 239, 172, 0.30)',
            '--r-wash': 'rgba(34, 197, 94, 0.09)',
            '--r-shadow': '0 0 12px var(--r-glow)',
            '--r-bg': 'linear-gradient(150deg, #051a0d 0%, #0f381c 55%, #082111 100%)',
            '--r-overlay': 'linear-gradient(105deg, transparent 20%, rgba(134, 239, 172, 0.16) 50%, transparent 80%)',
            '--r-overlay-size': '240% 100%',
            '--r-overlay-blend': 'screen',
            '--r-overlay-opacity': 0.85,
            '--r-clip': 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
            '--r-anim-overlay': 'r-shimmer 4s linear infinite',
            '--r-border-width': '1px',
            '--r-weight': 600,
            '--r-tracking': '0.08em',
        },
    },
    {
        level: 'corporate',
        tier: 5,
        code: 'T5',
        name: '寡头特材',
        alias: '尖端防务',
        desc: '跨国科技巨头私兵专属防务装备。采用多层碳纳米复合纤维与军工电控元器件，兼具轻量与极致坚固。',
        intensity: 2,
        dropColor: '#3b82f6',
        vars: {
            '--r-base': '#3b82f6',
            '--r-base-rgb': '59, 130, 246',
            '--r-accent': '#93c5fd',
            '--r-accent-rgb': '147, 197, 253',
            '--r-glow': 'rgba(59, 130, 246, 0.36)',
            '--r-halo': 'rgba(59, 130, 246, 0.26)',
            '--r-text': '#93c5fd',
            '--r-border': 'rgba(30, 58, 138, 0.94)',
            '--r-edge': 'rgba(147, 197, 253, 0.32)',
            '--r-wash': 'rgba(59, 130, 246, 0.10)',
            '--r-shadow': '0 0 16px var(--r-glow)',
            '--r-bg': 'linear-gradient(155deg, #071226 0%, #122852 58%, #081630 100%)',
            '--r-overlay': 'radial-gradient(circle at 50% 20%, rgba(147, 197, 253, 0.18), transparent 65%)',
            '--r-overlay-blend': 'screen',
            '--r-overlay-opacity': 0.9,
            '--r-clip': 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
            '--r-filter': 'drop-shadow(0 0 3px rgba(59, 130, 246, 0.32))',
            '--r-anim-card': 'r-pulse-glow 2.8s ease-in-out infinite',
            '--r-border-width': '1px',
            '--r-weight': 700,
            '--r-tracking': '0.10em',
        },
    },
    {
        level: 'foundation',
        tier: 6,
        code: 'T6',
        name: '基金会机要',
        alias: '深层收容',
        desc: '深渊基金会外勤清理人特供物资。外壳电镀厚重铅硼合金隔绝层，对高辐射与微观认知侵蚀具备严密防护。',
        intensity: 2,
        dropColor: '#8b5cf6',
        vars: {
            '--r-base': '#8b5cf6',
            '--r-base-rgb': '139, 92, 246',
            '--r-accent': '#c4b5fd',
            '--r-accent-rgb': '196, 181, 253',
            '--r-glow': 'rgba(139, 92, 246, 0.42)',
            '--r-halo': 'rgba(139, 92, 246, 0.30)',
            '--r-text': '#c4b5fd',
            '--r-border': 'rgba(46, 16, 101, 0.95)',
            '--r-edge': 'rgba(196, 181, 253, 0.36)',
            '--r-wash': 'rgba(139, 92, 246, 0.11)',
            '--r-shadow': '0 0 20px var(--r-glow)',
            '--r-bg': 'linear-gradient(155deg, #0f0a21 0%, #251352 56%, #120b29 100%)',
            '--r-overlay': 'repeating-linear-gradient(0deg, transparent 0 2px, rgba(196, 181, 253, 0.065) 2px 4px)',
            '--r-overlay-size': '100% 200%',
            '--r-overlay-blend': 'screen',
            '--r-overlay-opacity': 1,
            '--r-clip': 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)',
            '--r-filter': 'drop-shadow(0 0 4px rgba(139, 92, 246, 0.35))',
            '--r-anim-overlay': 'r-scan-y 4.5s linear infinite',
            '--r-border-width': '1px',
            '--r-weight': 700,
            '--r-tracking': '0.12em',
        },
    },
    {
        level: 'prototype',
        tier: 7,
        code: 'T7',
        name: '试作极境',
        alias: '奇点工程',
        desc: '基金会地下黑室未定型的概念尖端兵器。通过逆向工程勉强驯服了高维黑晶的震荡频率，杀伤力失稳且狂暴。',
        intensity: 3,
        dropColor: '#06b6d4',
        vars: {
            '--r-base': '#06b6d4',
            '--r-base-rgb': '6, 182, 212',
            '--r-accent': '#67e8f9',
            '--r-accent-rgb': '103, 232, 249',
            '--r-glow': 'rgba(6, 182, 212, 0.52)',
            '--r-halo': 'rgba(6, 182, 212, 0.38)',
            '--r-text': '#67e8f9',
            '--r-border': 'rgba(8, 51, 68, 0.96)',
            '--r-edge': 'rgba(103, 232, 249, 0.42)',
            '--r-wash': 'rgba(6, 182, 212, 0.13)',
            '--r-shadow': '0 0 26px var(--r-glow), inset 0 0 12px rgba(103, 232, 249, 0.16)',
            '--r-bg': 'linear-gradient(150deg, #021a24 0%, #073b4c 58%, #03212e 100%)',
            '--r-overlay': 'repeating-linear-gradient(90deg, transparent 0 8px, rgba(103, 232, 249, 0.07) 8px 9px)',
            '--r-overlay-size': '180% 100%',
            '--r-overlay-blend': 'screen',
            '--r-overlay-opacity': 1,
            '--r-clip': 'polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 18px 100%, 0 calc(100% - 18px))',
            '--r-filter': 'drop-shadow(0 0 6px rgba(6, 182, 212, 0.45)) contrast(1.18)',
            '--r-anim-card': 'r-glitch-strong 3s infinite',
            '--r-anim-overlay': 'r-scan-x 3s linear infinite',
            '--r-border-width': '1.5px',
            '--r-weight': 800,
            '--r-tracking': '0.15em',
        },
    },
    {
        level: 'ark_prime',
        tier: 8,
        code: 'T8',
        name: '方舟原铸',
        alias: '文明遗珍',
        desc: '封存于十二方舟最深处的人类纯物理工造巅峰结晶。凝结着大灾变前三维旧文明的终极智慧与最高材料学，无视岁月风化。',
        intensity: 3,
        dropColor: '#f59e0b',
        vars: {
            '--r-base': '#f59e0b',
            '--r-base-rgb': '245, 158, 11',
            '--r-accent': '#fde68a',
            '--r-accent-rgb': '253, 230, 138',
            '--r-glow': 'rgba(245, 158, 11, 0.58)',
            '--r-halo': 'rgba(245, 158, 11, 0.42)',
            '--r-text': '#fef3c7',
            '--r-border': 'rgba(69, 39, 4, 0.98)',
            '--r-edge': 'rgba(253, 230, 138, 0.48)',
            '--r-wash': 'rgba(245, 158, 11, 0.14)',
            '--r-shadow': '0 0 32px var(--r-glow), inset 0 0 16px rgba(253, 230, 138, 0.22)',
            '--r-bg': 'linear-gradient(150deg, #1f1402 0%, #4a3206 56%, #241703 100%)',
            '--r-overlay': 'linear-gradient(100deg, transparent 20%, rgba(253, 230, 138, 0.24) 50%, transparent 80%)',
            '--r-overlay-size': '300% 100%',
            '--r-overlay-blend': 'screen',
            '--r-overlay-opacity': 1,
            '--r-clip': 'polygon(14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px), 0 14px)',
            '--r-filter': 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.50)) brightness(1.05)',
            '--r-anim-overlay': 'r-shimmer 2.5s linear infinite',
            '--r-border-width': '1.5px',
            '--r-weight': 900,
            '--r-tracking': '0.18em',
        },
    },
]

/**
 * 稀有度映射字典：按 ItemGrade 键值检索完整元数据
 */
export const RARITY_MAP: Record<ItemGrade, IG> = RARITY_META.reduce(
    (map, meta) => {
        map[meta.level] = meta
        return map
    },
    {} as Record<ItemGrade, IG>,
)

/**
 * 品质数组下标索引（0–7），严格对齐声明顺序，供快速数组运算与阈值比较
 */
export const RARITY_INDEX: Record<ItemGrade, number> = RARITY_META.reduce(
    (map, meta, index) => {
        map[meta.level] = index
        return map
    },
    {} as Record<ItemGrade, number>,
)

/**
 * 品质战术阶位（1–8）
 */
export const RARITY_TIER: Record<ItemGrade, number> = RARITY_META.reduce(
    (map, meta) => {
        map[meta.level] = meta.tier
        return map
    },
    {} as Record<ItemGrade, number>,
)

/* ── 辅助工具函数族 ── */

/**
 * 安全获取物品品质元数据，若传入未知或空值则回退兜底为旧世民用 (standard)
 */
export function getItemGradeMeta(grade: ItemGrade | string | undefined | null): IG {
    if (grade && grade in RARITY_MAP) {
        return RARITY_MAP[grade as ItemGrade]
    }
    return RARITY_MAP.standard
}

/**
 * 获取品质索引阶次（0–7），用于排序比较与数组切片
 */
export function getItemGradeIndex(grade: ItemGrade | string | undefined | null): number {
    if (grade && grade in RARITY_INDEX) {
        return RARITY_INDEX[grade as ItemGrade]
    }
    return RARITY_INDEX.standard
}

/**
 * 获取物理工造战术阶位（1–8）
 */
export function getItemGradeTier(grade: ItemGrade | string | undefined | null): number {
    if (grade && grade in RARITY_TIER) {
        return RARITY_TIER[grade as ItemGrade]
    }
    return RARITY_TIER.standard
}

/**
 * 比较两件物品的物理工造阶次（可用作 Array.prototype.sort 的比较函数）
 * @returns >0 表示 a 高于 b，<0 表示 a 低于 b，0 表示同阶
 */
export function compareItemGrade(a: ItemGrade, b: ItemGrade): number {
    return getItemGradeIndex(a) - getItemGradeIndex(b)
}

/**
 * 判定物品品质是否达到或超过指定门槛
 */
export function isGradeAtLeast(grade: ItemGrade, minGrade: ItemGrade): boolean {
    return getItemGradeIndex(grade) >= getItemGradeIndex(minGrade)
}

/**
 * 判定物品是否属于尖端/高危高阶工造（T5 寡头特材及以上）
 */
export function isHighTierGrade(grade: ItemGrade | string | undefined | null): boolean {
    return getItemGradeIndex(grade) >= RARITY_INDEX.corporate
}

/**
 * 提取品质 CSS 变量集，可直接注入 React 组件的 `style` 属性中
 */
export function getItemGradeStyle(grade: ItemGrade | string | undefined | null): Record<string, string | number> {
    const meta = getItemGradeMeta(grade)
    return meta.vars as unknown as Record<string, string | number>
}

/**
 * 格式化带战术代码的工造品质名称，例如 "[T4] 正规军工"
 */
export function formatGradeWithCode(grade: ItemGrade | string | undefined | null): string {
    const meta = getItemGradeMeta(grade)
    return `[${meta.code}] ${meta.name}`
}