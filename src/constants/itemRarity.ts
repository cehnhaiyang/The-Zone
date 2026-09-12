import type { ItemRarity } from '../meta'

/**
 * 稀有度视觉变量（契约）
 *
 * 键名原样绑定到元素内联 style，由 `src/index.css` 的两档消费层读取：
 *  - `.rarity-card` 皮肤档：需要 `<div class="rarity-skin">` 子层，全量表达（底色/裁切/叠加/动效）
 *  - `.rarity-cell` 单元素档：行 / 装备槽 / 背囊条目，只取色彩与染色
 * 未提供的键一律由 index.css 的默认值兜底，因此低阶可保持数据稀疏。
 */
export interface RarityVisualVars {
    /* ── 色彩核心 ── */
    /** 基础主题色：皮肤底、行首色条 */
    '--r-base': string
    /** 高亮辅助色：悬停描边、角标、内缘高光 */
    '--r-accent': string
    /** 近距发光色（text-shadow / 描边辉光） */
    '--r-glow': string
    /** 主文字色 */
    '--r-text': string
    /** 边框色 */
    '--r-border': string
    /** 远距光晕色（悬停时的大范围外发光） */
    '--r-halo'?: string
    /** 铺底色：行 / 槽 / 徽章的半透明染色 */
    '--r-wash'?: string
    /** 内缘高光色：皮肤内侧 1px 亮边 */
    '--r-edge'?: string

    /* ── 表面与叠加 ── */
    /** 皮肤底色（渐变） */
    '--r-bg': string
    /** box-shadow 值 */
    '--r-shadow'?: string
    /** 叠加纹样（扫描线 / 网格 / 光带 / 斑驳） */
    '--r-overlay'?: string
    /** 叠加纹样 background-size */
    '--r-overlay-size'?: string
    /** 叠加纹样混合模式 */
    '--r-overlay-blend'?: string
    /** 叠加纹样不透明度 0–1 */
    '--r-overlay-opacity'?: number
    /** 皮肤静态 filter */
    '--r-filter'?: string

    /* ── 形态 ── */
    /** 皮肤 clip-path 形状（仅皮肤档生效，不裁剪内容） */
    '--r-clip'?: string
    /** 皮肤圆角 */
    '--r-radius'?: string
    /** 皮肤边框宽度 */
    '--r-border-width'?: string

    /* ── 排版与动效 ── */
    /** 名称字重 */
    '--r-weight': number
    /** 名称字间距 */
    '--r-tracking': string
    /** 皮肤动效（呼吸 / 故障 / 失稳） */
    '--r-anim-card'?: string
    /** 叠加纹样动效（流光 / 扫描 / 故障） */
    '--r-anim-overlay'?: string
    /** 名称动效 */
    '--r-anim-name'?: string
}

/**
 * 稀有度元数据接口
 */
export interface IR {
    level: ItemRarity
    name: string
    desc: string
    /**
     * 装饰强度 0–3：0 克制 / 1 内敛 / 2 显赫 / 3 失控。
     * index.css 依此收敛低阶的叠加层与动效，避免密集界面被噪声淹没。
     */
    intensity: 0 | 1 | 2 | 3
    vars: RarityVisualVars
}

export const RARITY_META = [
    {
        level: 'salvaged',
        name: '回收',
        desc: '废墟、尸体、二手设备中扒出的失稳物资。',
        intensity: 0,
        vars: {
            '--r-base': '#7a6f5f',
            '--r-accent': '#a79781',
            '--r-glow': 'rgba(122,111,95,0.14)',
            '--r-halo': 'rgba(122,111,95,0.10)',
            '--r-text': '#9b9081',
            '--r-border': 'rgba(80,72,60,0.75)',
            '--r-edge': 'rgba(167,151,129,0.14)',
            '--r-wash': 'rgba(122,111,95,0.06)',
            '--r-shadow': '0 0 0 rgba(0,0,0,0)',
            '--r-bg': 'linear-gradient(145deg, #181512 0%, #241f19 55%, #1b1713 100%)',
            '--r-overlay': 'repeating-linear-gradient(115deg, rgba(255,255,255,0.018) 0 1px, transparent 1px 6px)',
            '--r-overlay-blend': 'overlay',
            '--r-overlay-opacity': 0.5,
            '--r-filter': 'saturate(0.72) brightness(0.92) contrast(0.98)',
            '--r-radius': '2px',
            '--r-border-width': '1px',
            '--r-weight': 400,
            '--r-tracking': '0.04em',
        },
    },
    {
        level: 'standard',
        name: '标准',
        desc: '安全但弱小。',
        intensity: 0,
        vars: {
            '--r-base': '#9aa3ab',
            '--r-accent': '#d3d9de',
            '--r-glow': 'rgba(154,163,171,0.18)',
            '--r-halo': 'rgba(154,163,171,0.12)',
            '--r-text': '#b8c0c8',
            '--r-border': 'rgba(74,81,89,0.85)',
            '--r-edge': 'rgba(211,217,222,0.16)',
            '--r-wash': 'rgba(154,163,171,0.06)',
            '--r-shadow': '0 0 1px var(--r-glow)',
            '--r-bg': 'linear-gradient(145deg, #171a1e 0%, #23282e 60%, #1a1e23 100%)',
            '--r-overlay': 'linear-gradient(180deg, rgba(255,255,255,0.04), transparent 34%)',
            '--r-overlay-blend': 'screen',
            '--r-overlay-opacity': 0.6,
            '--r-radius': '2px',
            '--r-border-width': '1px',
            '--r-weight': 500,
            '--r-tracking': '0.05em',
        },
    },
    {
        level: 'reliable',
        name: '可靠',
        desc: '稳定可靠。',
        intensity: 1,
        vars: {
            '--r-base': '#56a86d',
            '--r-accent': '#8fd3a0',
            '--r-glow': 'rgba(86,168,109,0.25)',
            '--r-halo': 'rgba(86,168,109,0.20)',
            '--r-text': '#8fd3a0',
            '--r-border': 'rgba(23,53,31,0.9)',
            '--r-edge': 'rgba(143,211,160,0.28)',
            '--r-wash': 'rgba(86,168,109,0.08)',
            '--r-shadow': '0 0 10px var(--r-glow)',
            '--r-bg': 'linear-gradient(150deg, #08130b 0%, #123019 55%, #0a1b0f 100%)',
            '--r-overlay': 'linear-gradient(105deg, transparent 25%, rgba(143,211,160,0.16) 50%, transparent 75%)',
            '--r-overlay-size': '260% 100%',
            '--r-overlay-blend': 'screen',
            '--r-overlay-opacity': 0.9,
            '--r-clip': 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
            '--r-anim-overlay': 'r-shimmer 4.2s linear infinite',
            '--r-border-width': '1px',
            '--r-weight': 600,
            '--r-tracking': '0.08em',
        },
    },
    {
        level: 'organized',
        name: '组织',
        desc: '组织级资源。',
        intensity: 1,
        vars: {
            '--r-base': '#4c86e8',
            '--r-accent': '#93b8ff',
            '--r-glow': 'rgba(76,134,232,0.34)',
            '--r-halo': 'rgba(76,134,232,0.26)',
            '--r-text': '#93b8ff',
            '--r-border': 'rgba(17,31,61,0.92)',
            '--r-edge': 'rgba(147,184,255,0.30)',
            '--r-wash': 'rgba(76,134,232,0.09)',
            '--r-shadow': '0 0 12px var(--r-glow)',
            '--r-bg': 'linear-gradient(150deg, #060b18 0%, #102242 58%, #070d1a 100%)',
            '--r-overlay': 'radial-gradient(circle at 50% 18%, rgba(147,184,255,0.14), transparent 62%)',
            '--r-overlay-blend': 'screen',
            '--r-overlay-opacity': 0.9,
            '--r-clip': 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
            '--r-filter': 'drop-shadow(0 0 2px rgba(76,134,232,0.28))',
            '--r-anim-card': 'r-pulse-glow 2.4s ease-in-out infinite',
            '--r-border-width': '1px',
            '--r-weight': 700,
            '--r-tracking': '0.10em',
        },
    },
    {
        level: 'foundation',
        name: '基金会',
        desc: '深渊基金会受控列装。',
        intensity: 2,
        vars: {
            '--r-base': '#7d5cff',
            '--r-accent': '#bda7ff',
            '--r-glow': 'rgba(125,92,255,0.36)',
            '--r-halo': 'rgba(125,92,255,0.28)',
            '--r-text': '#bda7ff',
            '--r-border': 'rgba(27,16,56,0.92)',
            '--r-edge': 'rgba(189,167,255,0.34)',
            '--r-wash': 'rgba(125,92,255,0.10)',
            '--r-shadow': '0 0 15px var(--r-glow)',
            '--r-bg': 'linear-gradient(155deg, #0a0617 0%, #1c1140 55%, #0b0718 100%)',
            '--r-overlay': 'repeating-linear-gradient(0deg, transparent 0 2px, rgba(189,167,255,0.055) 2px 4px)',
            '--r-overlay-size': '100% 220%',
            '--r-overlay-blend': 'screen',
            '--r-overlay-opacity': 1,
            '--r-clip': 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)',
            '--r-filter': 'drop-shadow(0 0 3px rgba(125,92,255,0.32))',
            '--r-anim-overlay': 'r-scan-y 5s linear infinite',
            '--r-border-width': '1px',
            '--r-weight': 700,
            '--r-tracking': '0.12em',
        },
    },
    {
        level: 'deep',
        name: '深层',
        desc: '深层科技。',
        intensity: 2,
        vars: {
            '--r-base': '#b04df0',
            '--r-accent': '#dc9bff',
            '--r-glow': 'rgba(176,77,240,0.42)',
            '--r-halo': 'rgba(176,77,240,0.32)',
            '--r-text': '#dc9bff',
            '--r-border': 'rgba(42,15,69,0.94)',
            '--r-edge': 'rgba(220,155,255,0.36)',
            '--r-wash': 'rgba(176,77,240,0.11)',
            '--r-shadow': '0 0 20px var(--r-glow)',
            '--r-bg': 'linear-gradient(150deg, #120522 0%, #2d0f49 55%, #140624 100%)',
            '--r-overlay': 'linear-gradient(90deg, transparent 0%, rgba(220,155,255,0.08) 12%, transparent 20%, rgba(220,155,255,0.05) 62%, transparent 72%)',
            '--r-overlay-size': '180% 100%',
            '--r-overlay-blend': 'screen',
            '--r-overlay-opacity': 1,
            '--r-clip': 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)',
            '--r-filter': 'drop-shadow(0 0 4px rgba(176,77,240,0.35)) hue-rotate(-4deg)',
            '--r-anim-card': 'r-glitch-subtle 5s infinite',
            '--r-anim-overlay': 'r-overlay-glitch 5s steps(14) infinite',
            '--r-border-width': '1px',
            '--r-weight': 800,
            '--r-tracking': '0.12em',
        },
    },
    {
        level: 'prototype',
        name: '原型',
        desc: '受控顶级科技。',
        intensity: 2,
        vars: {
            '--r-base': '#45e0e0',
            '--r-accent': '#a7ffff',
            '--r-glow': 'rgba(69,224,224,0.46)',
            '--r-halo': 'rgba(69,224,224,0.34)',
            '--r-text': '#a7ffff',
            '--r-border': 'rgba(4,48,48,0.94)',
            '--r-edge': 'rgba(167,255,255,0.38)',
            '--r-wash': 'rgba(69,224,224,0.11)',
            '--r-shadow': '0 0 25px var(--r-glow)',
            '--r-bg': 'linear-gradient(150deg, #021414 0%, #084040 58%, #031a1a 100%)',
            '--r-overlay': 'repeating-linear-gradient(90deg, transparent 0 8px, rgba(167,255,255,0.05) 8px 9px)',
            '--r-overlay-size': '180% 100%',
            '--r-overlay-blend': 'screen',
            '--r-overlay-opacity': 1,
            '--r-clip': 'polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 18px 100%, 0 calc(100% - 18px))',
            '--r-filter': 'drop-shadow(0 0 5px rgba(69,224,224,0.4)) contrast(1.15)',
            '--r-anim-card': 'r-glitch-strong 3.2s infinite',
            '--r-anim-overlay': 'r-scan-x 3.2s linear infinite',
            '--r-border-width': '1px',
            '--r-weight': 800,
            '--r-tracking': '0.16em',
        },
    },
    {
        level: 'ark',
        name: '方舟',
        desc: '方舟核心储备 / 降临前顶层资源。',
        intensity: 3,
        vars: {
            '--r-base': '#e3b34c',
            '--r-accent': '#ffe19a',
            '--r-glow': 'rgba(227,179,76,0.5)',
            '--r-halo': 'rgba(227,179,76,0.40)',
            '--r-text': '#ffe19a',
            '--r-border': 'rgba(61,42,8,0.95)',
            '--r-edge': 'rgba(255,225,154,0.42)',
            '--r-wash': 'rgba(227,179,76,0.12)',
            '--r-shadow': '0 0 25px var(--r-glow)',
            '--r-bg': 'linear-gradient(150deg, #1a1204 0%, #493209 58%, #1d1305 100%)',
            '--r-overlay': 'linear-gradient(100deg, transparent 22%, rgba(255,225,154,0.22) 50%, transparent 78%)',
            '--r-overlay-size': '300% 100%',
            '--r-overlay-blend': 'screen',
            '--r-overlay-opacity': 1,
            '--r-clip': 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)',
            '--r-filter': 'drop-shadow(0 0 6px rgba(227,179,76,0.42)) brightness(1.04)',
            '--r-anim-overlay': 'r-shimmer 2.8s linear infinite',
            '--r-border-width': '1px',
            '--r-weight': 900,
            '--r-tracking': '0.16em',
        },
    },
    {
        level: 'abyssal',
        name: '深渊',
        desc: '失控深渊产物。',
        intensity: 3,
        vars: {
            '--r-base': '#9c1440',
            '--r-accent': '#ff4d76',
            '--r-glow': 'rgba(156,20,64,0.55)',
            '--r-halo': 'rgba(156,20,64,0.42)',
            '--r-text': '#ff4d76',
            '--r-border': 'rgba(20,3,11,0.96)',
            '--r-edge': 'rgba(255,77,118,0.38)',
            '--r-wash': 'rgba(156,20,64,0.14)',
            '--r-shadow': '0 0 20px rgba(156,20,64,0.4), inset 0 0 14px rgba(255,77,118,0.16)',
            '--r-bg': 'radial-gradient(circle at 50% 38%, #3a0816 0%, #20050d 46%, #100207 100%)',
            '--r-overlay': 'radial-gradient(circle at 50% 45%, rgba(255,77,118,0.22), transparent 62%)',
            '--r-overlay-blend': 'screen',
            '--r-overlay-opacity': 1,
            '--r-clip': 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
            '--r-filter': 'drop-shadow(0 0 5px rgba(156,20,64,0.45)) saturate(1.45)',
            '--r-anim-card': 'r-pulse-flesh 1.6s ease-in-out infinite',
            '--r-anim-overlay': 'r-overlay-pulse 1.6s ease-in-out infinite',
            '--r-border-width': '1px',
            '--r-weight': 900,
            '--r-tracking': '0.12em',
        },
    },
    {
        level: 'forbidden',
        name: '禁忌',
        desc: '认知危害与真相。',
        intensity: 3,
        vars: {
            '--r-base': '#e02f2f',
            '--r-accent': '#ff8f7a',
            '--r-glow': 'rgba(224,47,47,0.6)',
            '--r-halo': 'rgba(224,47,47,0.46)',
            '--r-text': '#ff8f7a',
            '--r-border': 'rgba(35,4,4,0.96)',
            '--r-edge': 'rgba(255,143,122,0.40)',
            '--r-wash': 'rgba(224,47,47,0.14)',
            '--r-shadow': '0 0 30px rgba(224,47,47,0.42), inset 0 0 18px rgba(255,143,122,0.2)',
            '--r-bg': 'linear-gradient(160deg, #190303 0%, #310606 52%, #1b0303 100%)',
            '--r-overlay': 'repeating-linear-gradient(45deg, rgba(255,143,122,0.07) 0 10px, transparent 10px 22px)',
            '--r-overlay-blend': 'screen',
            '--r-overlay-opacity': 1,
            '--r-clip': 'polygon(6% 0, 94% 0, 100% 6%, 100% 94%, 94% 100%, 6% 100%, 0 94%, 0 6%)',
            '--r-filter': 'drop-shadow(0 0 8px rgba(224,47,47,0.5)) contrast(1.35) hue-rotate(4deg)',
            '--r-anim-card': 'r-glitch-violent 0.9s infinite',
            '--r-anim-overlay': 'r-overlay-glitch 0.9s steps(8) infinite',
            '--r-border-width': '2px',
            '--r-weight': 900,
            '--r-tracking': '0.22em',
        },
    },
    {
        level: 'ineffable',
        name: '不可名状',
        desc: '彼侧信息实体化，理解即代价。',
        intensity: 3,
        vars: {
            '--r-base': '#f4efff',
            '--r-accent': '#b78cff',
            '--r-glow': 'rgba(244,239,255,0.65)',
            '--r-halo': 'rgba(244,239,255,0.50)',
            '--r-text': '#ffffff',
            '--r-border': 'rgba(255,255,255,0.35)',
            '--r-edge': 'rgba(255,255,255,0.50)',
            '--r-wash': 'rgba(244,239,255,0.10)',
            '--r-shadow': '0 0 36px rgba(244,239,255,0.34), inset 0 0 22px rgba(255,255,255,0.26)',
            '--r-bg': 'conic-gradient(from 180deg at 50% 42%, #ffffff, #b78cff, #6ef0dd, #ff7ad1, #ffffff)',
            '--r-overlay': 'radial-gradient(circle at 50% 42%, rgba(9,5,14,0.68), transparent 70%)',
            '--r-overlay-blend': 'multiply',
            '--r-overlay-opacity': 1,
            '--r-clip': 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
            '--r-filter': 'saturate(1.15) contrast(1.05)',
            '--r-anim-card': 'r-ineffable-shift 7s ease-in-out infinite',
            '--r-anim-overlay': 'r-overlay-pulse 6s ease-in-out infinite',
            '--r-anim-name': 'r-text-reveal 5s ease-in-out infinite',
            '--r-border-width': '1px',
            '--r-weight': 300,
            '--r-tracking': '0.34em',
        },
    },
] as const satisfies readonly IR[]

/**
 * 稀有度查表器：按 ItemRarity 深度查找元数据。
 * 全项目唯一数据源，禁止在视图层另行维护稀有度的名称与配色映射。
 */
export const RARITY_MAP: Record<ItemRarity, IR> = RARITY_META.reduce(
    (map, meta) => {
        map[meta.level] = meta
        return map
    },
    {} as Record<ItemRarity, IR>,
)

/**
 * 稀有度阶梯序号：数值越大越稀有，与 RARITY_META 的声明顺序一致。
 */
export const RARITY_INDEX: Record<ItemRarity, number> = RARITY_META.reduce(
    (map, meta, index) => {
        map[meta.level] = index
        return map
    },
    {} as Record<ItemRarity, number>,
)