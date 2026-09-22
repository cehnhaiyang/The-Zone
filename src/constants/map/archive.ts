import type { BattleMap, Cover } from '../../meta';
/**
 * 烛火书斋 · 全域战场地图集
 * 覆盖所有 isDangerous 节点
 *
 * 节点威胁度一览：
 * threat 2  : scriptorium / translation_gallery / alchemy_lab / clock_tower / wilted_greenhouse / hypnosis_chamber
 * threat 3  : celestial_map_room / memory_theater / dream_study
 * threat 4  : ritual_circle / echo_gallery
 * threat 5  : observatory
 * threat 6  : forbidden_wing / time_fracture
 * threat 8  : ink_well / abyss_corridor
 * threat 10 : archive_vault / mirror_library
 * threat 12 : void_portal
 * threat 14 : paradox_room
 *
 * 战场坐标系：depthRange [minX, maxX] × laneCount 轨。
 * 我方部署锚点统一在 x=0 附近，敌方部署带在远端，isAmbushed 下敌方部署对我方更加不利。
 * 结构：按照节点分类，而非按照掩体与地图分类，结构需与封印室一致。
 */

/**
 * 烛火书斋 · 封印室（binding_chamber）
 *
 * 定位：档案库「禁书侧翼」的关键节点——封印最危险知识的六边形房间，战斗对象为
 * 叙事型敌人「苏醒的典籍」（living_codex：range 4 / speed 12 / 高减益倾向）。
 *
 * 本文件同时充当该区域后续地图的范式：掩体常数 → 节点专属地图 → 两张注册表，
 * 书写结构与 hospital.ts 保持一致；节点未显式声明 map 字段，由引擎按 nodeId 自动寻址。
 *
 * 空间拓扑（depthRange [-9, 9] × 5 轨，y=0 为北墙、y=4 为南墙）：
 * 六边形房间只在南北被墙线拉直——两面墙线铺满锁链帘幕，仅在我方锚点列两侧留下
 * 两处被扯断的链口（壁龛）；房间两端向中央收口，西端只剩单格宽的入口廊道，
 * 东端由链枢封死，整体呈「窄—宽—窄」的六边形轮廓。
 *
 *                    -9 -8 -7 -6 -5 -4 -3 -2 -1  0  1  2  3  4  5  6  7  8  9
 * y=0 北墙锁链帘        C  C  C  C  C  C  C  .  .  .  .  C  C  C  C  C  C  C  C
 * y=1 北操作廊          C  C  .  .  .  .  .  .  S  .  S  .  .  .  .  .  .  C  C
 * y=2 中央阵线          .  .  .  K  .  .  .  .  .  .  .  .  .  .  K  .  .  .  H
 * y=3 南操作廊          C  C  .  .  .  .  .  .  S  .  S  .  .  .  .  .  .  C  C
 * y=4 南墙锁链帘        C  C  C  C  C  C  C  .  .  .  .  C  C  C  C  C  C  C  C
 *
 * C 锁链帘幕（不可通行 / 60% / 耐久 90，可被斩断）
 * S 封印阵枢（不可通行 / 40% / 耐久 50，可被击碎）
 * K 崩落锁链盘（可跨过，移入额外 1 AP / 30% / 无耐久，永久提供掩护）
 * H 链枢（不可通行 / 75% / 无耐久：房间尽端，悬书铁链自六面墙壁的汇聚点）
 */
export const BINDING_CHAMBER_COVERS: Record<string, Cover> = {
    iron_chain_veil: {
        id: 'iron_chain_veil',
        name: '锁链帘幕',
        desc: '六面墙壁上纵横交错的粗大铁链，环扣被岁月与挣扎磨得发亮；链隙只够视线穿过，弹道与刀锋会被弹开或缠住。砸断若干个环扣，就能在墙上扯出一道缺口。',
        coverRate: 0.6,
        hp: 90,
    },
    seal_anchor_hub: {
        id: 'seal_anchor_hub',
        name: '封印阵枢',
        desc: '银粉封印阵的四角锚枢：一根嵌入地砖的六棱石柱，柱顶刻着仍在缓慢转写的誓约符文。石柱齐胸高、无法翻越，银粉沿柱身爬升，把锚点与地面阵线连成一体。',
        coverRate: 0.4,
        hp: 50,
    },
    fallen_chain_coil: {
        id: 'fallen_chain_coil',
        name: '崩落锁链盘',
        desc: '从墙上整段垮塌下来的锁链在地面盘成及膝的铁环堆，抬脚就能跨过去，但枪线必须从铁环缝隙里找路。链条无人维护，却仍保持着落地的姿态。',
        coverRate: 0.3,
        /* 可跨过：移入额外消耗 1 点行动点。 */
        passable: 1,
    },
    chain_convergence: {
        id: 'chain_convergence',
        name: '链枢',
        desc: '房间尽端，六面墙壁的锁链汇聚绞成一根垂向地面的巨缆——那里本该悬着一本巨大的书。如今缆端只剩撕裂的皮革与仍在缓慢渗出的活体墨水。',
        coverRate: 0.75,
    },
};

/**
 * 烛火书斋 · 封印室战场地图
 *
 * 交火结构（自后向前）：
 * 后区 x=-9~-4：单格宽入口廊道。西端 x=-9,-8 除中央阵线外全部被链幕封边，
 * 崩落锁链盘 K(-6,2) 横在廊道中线上——跨得过去，但把这条唯一通道的枪线压成一条缝。
 *
 * 壁龛线 x=-2~1：南北墙线各被扯断四格，形成两处内凹站位，正好在锚点列两侧，
 * 与封印阵四枢一起把「我方开局能不能藏住」这件事交给玩家自己选。
 *
 * 锚点线 x=0：五轨全空，我方部署列；东向射界只剩中央阵线一条直通，其余两轨被
 * 阵枢 S(-1,1)/S(1,1)/S(-1,3)/S(1,3) 遮断。
 *
 * 前沿 x=2~4：开阔地，唯一可借的遮蔽是壁龛两侧的链幕与敌阵前沿的落链 K(5,2)。
 *
 * 敌阵 x=5~9：链幕把南北两面墙线拉满，把战场切成三段射界；链枢 H(9,2) 封死房间
 * 尽端的中线，典籍挣脱悬吊后只能盘踞在尽端之前，背后没有退路。
 *
 * 部署参考：我方锚点在纵深中线 x=0（五轨全空，第 6 名起顺延至 x=1 的两处壁龛）；
 * 敌方部署带为 x=5~9（10 处可行格），与锚点列最小切比雪夫距离为 5，
 * 正好超出典籍 range 4 的射程——开局必然要给玩家一个动作，再逼近开火。
 *
 * 全图经连通校验：中央阵线贯通东西，两翼仅被阵枢分段、均可由阵线折返，无孤立格；
 * 仅壁龛末端 (1,0)、(1,4) 两处单格凹角。
 */
export const ARCHIVE_BINDING_CHAMBER_MAP: BattleMap = {
    desc: '六边形的石室被锁链从六面墙壁里穿起来，铁环层层垂向地面，只在南北各留一处被扯断的缺口。房间中央的地砖上，银粉封印阵正沿着缝隙缓慢褪色，四角各立一根刻满誓约符文的六棱石柱；尽端的锁链绞成一根巨缆垂下，缆端只剩撕裂的皮革与仍在渗出活体墨水的断面——那本巨书已经不在这里了。',
    depthRange: [-9, 9],
    laneCount: 5,
    covers: [
        // —— 北墙 · 锁链帘幕（y=0）：中段 x=-2~1 是被扯断的链口，兼作站位壁龛 ——
        ['iron_chain_veil', -9, 0],
        ['iron_chain_veil', -8, 0],
        ['iron_chain_veil', -7, 0],
        ['iron_chain_veil', -6, 0],
        ['iron_chain_veil', -5, 0],
        ['iron_chain_veil', -4, 0],
        ['iron_chain_veil', -3, 0],
        ['iron_chain_veil', 2, 0],
        ['iron_chain_veil', 3, 0],
        ['iron_chain_veil', 4, 0],
        ['iron_chain_veil', 5, 0],
        ['iron_chain_veil', 6, 0],
        ['iron_chain_veil', 7, 0],
        ['iron_chain_veil', 8, 0],
        ['iron_chain_veil', 9, 0],
        // —— 南墙 · 锁链帘幕（y=4）：与北墙镜像，缺口同处 x=-2~1 ——
        ['iron_chain_veil', -9, 4],
        ['iron_chain_veil', -8, 4],
        ['iron_chain_veil', -7, 4],
        ['iron_chain_veil', -6, 4],
        ['iron_chain_veil', -5, 4],
        ['iron_chain_veil', -4, 4],
        ['iron_chain_veil', -3, 4],
        ['iron_chain_veil', 2, 4],
        ['iron_chain_veil', 3, 4],
        ['iron_chain_veil', 4, 4],
        ['iron_chain_veil', 5, 4],
        ['iron_chain_veil', 6, 4],
        ['iron_chain_veil', 7, 4],
        ['iron_chain_veil', 8, 4],
        ['iron_chain_veil', 9, 4],
        // —— 西端收口（x=-9,-8）：除中央阵线外全部封边，只留单格宽的入口 ——
        ['iron_chain_veil', -9, 1],
        ['iron_chain_veil', -8, 1],
        ['iron_chain_veil', -9, 3],
        ['iron_chain_veil', -8, 3],
        // —— 东端收口（x=8,9）：链枢两侧封边，敌阵背后没有退路 ——
        ['iron_chain_veil', 8, 1],
        ['iron_chain_veil', 9, 1],
        ['iron_chain_veil', 8, 3],
        ['iron_chain_veil', 9, 3],
        // —— 封印阵四枢：锚点列南北两侧，只留中央阵线一条直通射界 ——
        ['seal_anchor_hub', -1, 1],
        ['seal_anchor_hub', 1, 1],
        ['seal_anchor_hub', -1, 3],
        ['seal_anchor_hub', 1, 3],
        // —— 崩落锁链盘：入口廊道一处（唯一通道上的拦挡） + 敌阵前沿一处（双面掩体） ——
        ['fallen_chain_coil', -6, 2],
        ['fallen_chain_coil', 5, 2],
        // —— 链枢：封死房间尽端的中线 ——
        ['chain_convergence', 9, 2],
    ],
    modifiers: {
        // 锁链把脚步与低语一同折回：六面墙的回声让每次瞄准都慢半拍
        accuracyBonus: -0.1,
        weaponTypeModifier: {
            // 垂落的书页与锁链缠住大开大合的挥砍：伤害 -15%、命中 -5%
            wave: { damageMultiplier: 0.85, accuracyDelta: -0.05 },
            both_wave: { damageMultiplier: 0.85, accuracyDelta: -0.05 },
            // 封印阵的几何缝隙正好容一记直刺穿过去：伤害 +15%
            prick: { damageMultiplier: 1.15 },
            both_prick: { damageMultiplier: 1.15 },
            // 银粉阵线与烛火灵光增幅仪式性法术：伤害 +15%
            magic: { damageMultiplier: 1.15 },
            // 垂落的书页与铁链把长枪的观察线切碎：命中 -10%
            sniper_rifle: { accuracyDelta: -0.1 },
        },
    },
};

// ─────────────────────────────────────────────────────────────
// scriptorium · 静默抄写室 (threat 2)
// 小房间，3 轨，短纵深
// ─────────────────────────────────────────────────────────────

/**
 * 空间拓扑（depthRange [-4, 5] × 3 轨，y=0 为北墙、y=2 为南墙）：
 * 三排斜桌构成主要掩体线，墨瓶架在远端形成第二道防线，羽笔柱悬浮于中央。
 * 我方部署 x=0，敌方部署 x=4~5。
 *
 *            -4 -3 -2 -1  0  1  2  3  4  5
 * y=0          .  .  .  .  W  .  I  .  W  .
 * y=1          .  .  .  .  .  Q  I  .  .  .
 * y=2          .  .  .  .  W  .  I  .  W  .
 *
 * W 抄写斜桌（可跨过，移入额外 1 AP / 25% / 耐久 30）
 * I 墨瓶架（不可通行 / 35% / 耐久 45）
 * Q 悬浮羽笔柱（不可通行 / 20% / 无耐久）
 */
export const SCRIPTORIUM_COVERS: Record<string, Cover> = {
    writing_desk: {
        id: 'writing_desk',
        name: '抄写斜桌',
        desc: '倾斜的橡木书桌，桌面刻满自动书写的划痕。桌腿纤细，仅能挡住低角度弹道。',
        coverRate: 0.25,
        passable: 1,
        hp: 30,
    },
    ink_shelf: {
        id: 'ink_shelf',
        name: '墨瓶架',
        desc: '排列着数百瓶干涸墨水的铁架，瓶身碎裂后溅出的墨雾会短暂遮蔽视线。',
        coverRate: 0.35,
        hp: 45,
    },
    quill_column: {
        id: 'quill_column',
        name: '悬浮羽笔柱',
        desc: '数十支无人持握的羽毛笔悬停在一根不可见的轴线上，笔尖滴落的金墨在地面汇成细流。笔柱本身不阻挡弹道，但会干扰瞄准。',
        coverRate: 0.2,
    },
};

/**
 * 烛火书斋 · 静默抄写室战场地图
 *
 * 交火结构（自后向前）：
 * 后区 x=-4~-1：完全开阔，无任何遮蔽。我方若被迫后撤将完全暴露。
 *
 * 锚点线 x=0：南北两轨各有一张斜桌 W(0,0)/W(0,2)，中央轨空置。
 * 开局可借助斜桌获得 25% 低矮掩护，但斜桌可被跨过、可被击碎。
 *
 * 中央柱 x=1：羽笔柱 Q(1,1) 悬浮于正中，仅提供 20% 干扰性遮蔽，
 * 不可摧毁但也不阻挡弹道——更多是视觉干扰而非实质掩体。
 *
 * 墨瓶架防线 x=2：三轨全被墨瓶架 I 封死，形成一道完整的 35% 掩体墙。
 * 这是全图最坚固的中间防线，但耐久仅 45，集中火力可快速击穿。
 *
 * 远端 x=4：南北两轨再各一张斜桌，中央轨空置，形成敌方的最后掩体。
 *
 * 部署参考：我方锚点 x=0（三轨，两处斜桌掩护）；
 * 敌方部署带 x=4~5（4 处可行格），最小距离 4，短兵器可即刻接敌。
 *
 * 连通校验：中央轨全程贯通，南北两轨被斜桌与墨瓶架分段但均可绕行，无孤立格。
 */
export const ARCHIVE_SCRIPTORIUM_MAP: BattleMap = {
    desc: '一排排倾斜的书桌上摆放着干涸的墨水瓶，金色尘埃在空气中漂浮。无人持握的羽毛笔在羊皮纸上沙沙作响，记录着未发生的历史。',
    depthRange: [-4, 5],
    laneCount: 3,
    covers: [
        // —— 中央羽笔柱 ——
        ['quill_column', 1, 1],
        // —— 前排书桌：锚点线两侧低矮掩护 ——
        ['writing_desk', 0, 0],
        ['writing_desk', 0, 2],
        // —— 中排墨瓶架：三轨完整防线 ——
        ['ink_shelf', 2, 0],
        ['ink_shelf', 2, 1],
        ['ink_shelf', 2, 2],
        // —— 远端书桌：敌方前沿掩体 ——
        ['writing_desk', 4, 0],
        ['writing_desk', 4, 2],
    ],
    modifiers: {
        weaponTypeModifier: {
            // 羽笔的自动书写赋予空间仪式感：法术增幅
            magic: { damageMultiplier: 1.1 },
            // 精确刺击适合在桌缝间穿行
            prick: { damageMultiplier: 1.1 },
            both_prick: { damageMultiplier: 1.1 },
            // 大开大合的挥砍会撞翻书桌
            wave: { accuracyDelta: -0.05 },
            both_wave: { accuracyDelta: -0.05 },
        },
    },
};

// ─────────────────────────────────────────────────────────────
// translation_gallery · 翻译回廊 (threat 2)
// 长条形，3 轨，中等纵深
// ─────────────────────────────────────────────────────────────

/**
 * 空间拓扑（depthRange [-5, 6] × 3 轨，y=0 为北墙、y=2 为南墙）：
 * 狭长回廊，两侧书桌交替排列形成蛇形通道。字母框悬挂在远端墙壁。
 *
 *            -5 -4 -3 -2 -1  0  1  2  3  4  5  6
 * y=0          .  .  .  T  .  .  .  T  .  .  A  .
 * y=1          .  .  .  .  S  .  .  .  .  S  A  .
 * y=2          .  .  .  .  .  T  .  .  T  .  A  .
 *
 * T 翻译书桌（可跨过，移入额外 1 AP / 30% / 耐久 35）
 * S 散落译稿堆（可跨过，移入额外 1 AP / 15% / 无耐久）
 * A 灭绝语言字母框（不可通行 / 40% / 耐久 55）
 */
export const TRANSLATION_GALLERY_COVERS: Record<string, Cover> = {
    translation_desk: {
        id: 'translation_desk',
        name: '翻译书桌',
        desc: '堆满对照词典与未竟译稿的长桌，桌面上的文字在你注视时改变含义。',
        coverRate: 0.3,
        passable: 1,
        hp: 35,
    },
    alphabet_frame: {
        id: 'alphabet_frame',
        name: '灭绝语言字母框',
        desc: '悬挂于墙壁的巨大字母表，某些字母在你注视时改变形状。框架本身是坚实的橡木与黄铜。',
        coverRate: 0.4,
        hp: 55,
    },
    scattered_manuscripts: {
        id: 'scattered_manuscripts',
        name: '散落译稿堆',
        desc: '墨迹未干的手稿在地板上堆成小丘，踩上去会打滑，但能勉强伏低身体。',
        coverRate: 0.15,
        passable: 1,
    },
};

/**
 * 烛火书斋 · 翻译回廊战场地图
 *
 * 交火结构（自后向前）：
 * 后区 x=-5~-3：完全开阔，无遮蔽。
 *
 * 蛇形书桌带 x=-2~3：四张书桌以「北—南—北—南」交替排列，
 * 形成蛇形通道，迫使进攻方反复变向。中央轨仅有两处译稿堆 S 提供
 * 极低矮的 15% 掩护。
 *
 * 远端字母墙 x=5：三轨全被字母框 A 封死，形成 40% 高掩体终点墙。
 * 这是全图最坚固的防线，但仅存在于远端。
 *
 * 部署参考：我方锚点 x=0（三轨全空）；
 * 敌方部署带 x=4~6（字母框后方可藏身），最小距离 4。
 *
 * 连通校验：蛇形通道保证南北两轨可交替通行，中央轨全程贯通，无孤立格。
 */
export const ARCHIVE_TRANSLATION_GALLERY_MAP: BattleMap = {
    desc: '长廊两侧的书桌堆满词典与对照文本，墨迹未干的译稿散落一地。墙壁上的灭绝语言字母表在你注视时改变形状。',
    depthRange: [-5, 6],
    laneCount: 3,
    covers: [
        // —— 蛇形书桌带 ——
        ['translation_desk', -2, 0],
        ['translation_desk', 0, 2],
        ['translation_desk', 2, 0],
        ['translation_desk', 3, 2],
        // —— 中央译稿堆：极低矮掩护 ——
        ['scattered_manuscripts', -1, 1],
        ['scattered_manuscripts', 4, 1],
        // —— 远端字母墙 ——
        ['alphabet_frame', 5, 0],
        ['alphabet_frame', 5, 1],
        ['alphabet_frame', 5, 2],
    ],
    modifiers: {
        // 文字不断重组，所有远程精度微降
        accuracyBonus: -0.05,
        weaponTypeModifier: {
            // 语言学的精密性有利于精准刺击
            prick: { accuracyDelta: 0.05 },
            both_prick: { accuracyDelta: 0.05 },
            // 投掷物会打散译稿堆
            throw: { accuracyDelta: -0.1 },
        },
    },
};

// ─────────────────────────────────────────────────────────────
// alchemy_lab · 炼金实验室 (threat 2)
// 小房间，3 轨
// ─────────────────────────────────────────────────────────────

/**
 * 空间拓扑（depthRange [-4, 5] × 3 轨，y=0 为北墙、y=2 为南墙）：
 * 中央自沸烧瓶为不可摧毁核心，工作台与玻璃架分布在两侧。
 *
 *            -4 -3 -2 -1  0  1  2  3  4  5
 * y=0          .  .  .  L  .  .  .  L  .  .
 * y=1          .  .  .  .  G  B  .  .  G  .
 * y=2          .  .  .  L  .  .  .  L  .  .
 *
 * L 炼金工作台（可跨过，移入额外 1 AP / 35% / 耐久 50）
 * B 自沸烧瓶（不可通行 / 50% / 无耐久：不可摧毁）
 * G 玻璃器皿架（不可通行 / 20% / 耐久 15：极度脆弱）
 */
export const ALCHEMY_LAB_COVERS: Record<string, Cover> = {
    lab_bench: {
        id: 'lab_bench',
        name: '炼金工作台',
        desc: '石质操作台，表面布满烧灼痕迹与残留的炼金阵。台下的管道仍在输送某种温热液体。',
        coverRate: 0.35,
        passable: 1,
        hp: 50,
    },
    glass_rack: {
        id: 'glass_rack',
        name: '玻璃器皿架',
        desc: '排列着蒸馏器、冷凝管与量杯的铁架。极度脆弱，被击中后碎裂的玻璃会溅伤周围。',
        coverRate: 0.2,
        hp: 15,
    },
    boiling_flask: {
        id: 'boiling_flask',
        name: '自沸烧瓶',
        desc: '中央的巨型烧瓶在无热源条件下持续沸腾，蒸汽凝结成转瞬即逝的人脸。瓶体是强化水晶，不可摧毁。',
        coverRate: 0.5,
    },
};

/**
 * 烛火书斋 · 炼金实验室战场地图
 *
 * 交火结构（自后向前）：
 * 后区 x=-4~-2：完全开阔。
 *
 * 工作台线 x=-1：南北两轨各一张工作台 L，中央轨空置。
 * 35% 掩体提供可靠的开局掩护。
 *
 * 中央核心 x=0~1：玻璃架 G(0,1) 与自沸烧瓶 B(1,1) 串联在中央轨。
 * 玻璃架极度脆弱（耐久 15），一旦碎裂将暴露烧瓶侧翼；
 * 烧瓶不可摧毁，50% 掩体是全图最硬的单点。
 *
 * 远端 x=3~4：南北两轨再各一张工作台，中央轨玻璃架 G(4,1)。
 * 对称布局，敌方同样拥有工作台掩护。
 *
 * 部署参考：我方锚点 x=0（三轨，工作台在 x=-1 提供前置掩护）；
 * 敌方部署带 x=3~5，最小距离 3，近程武器可一回合接敌。
 *
 * 连通校验：中央轨被烧瓶阻断但可经南北轨绕行，无孤立格。
 */
export const ARCHIVE_ALCHEMY_LAB_MAP: BattleMap = {
    desc: '玻璃器皿和蒸馏装置占据大部分空间。中央的烧瓶在无加热条件下持续沸腾，蒸汽凝结成微小的人脸。',
    depthRange: [-4, 5],
    laneCount: 3,
    covers: [
        // —— 中央烧瓶（不可摧毁） ——
        ['boiling_flask', 1, 1],
        // —— 工作台：南北对称 ——
        ['lab_bench', -1, 0],
        ['lab_bench', -1, 2],
        ['lab_bench', 3, 0],
        ['lab_bench', 3, 2],
        // —— 玻璃架（极脆弱） ——
        ['glass_rack', 0, 1],
        ['glass_rack', 4, 1],
    ],
    modifiers: {
        weaponTypeModifier: {
            // 炼金能量增幅法术
            magic: { damageMultiplier: 1.15 },
            // 投掷物可能打碎器皿，有误伤风险
            throw: { accuracyDelta: -0.15 },
            // 霰弹近距离在狭窄实验室中反而增强
            shotgun: { damageMultiplier: 1.1 },
            sawed_off: { damageMultiplier: 1.1 },
        },
    },
};

// ─────────────────────────────────────────────────────────────
// clock_tower · 永恒钟楼 (threat 2)
// 小房间，3 轨，齿轮密布
// ─────────────────────────────────────────────────────────────

/**
 * 空间拓扑（depthRange [-4, 5] × 3 轨，y=0 为北墙、y=2 为南墙）：
 * 齿轮组占据大量空间，形成迷宫式通道。摆锤护罩在中央。
 *
 *            -4 -3 -2 -1  0  1  2  3  4  5
 * y=0          .  .  G  .  .  .  G  .  T  .
 * y=1          .  .  .  .  P  .  .  .  .  .
 * y=2          .  .  G  .  .  .  G  .  T  .
 *
 * G 巨型齿轮组（不可通行 / 60% / 无耐久：不可摧毁）
 * P 摆锤护罩（不可通行 / 45% / 无耐久）
 * T 时间残影碎片（可跨过，移入额外 1 AP / 25% / 无耐久：不可摧毁）
 */
export const CLOCK_TOWER_COVERS: Record<string, Cover> = {
    gear_assembly: {
        id: 'gear_assembly',
        name: '巨型齿轮组',
        desc: '在虚空中缓慢咬合的黄铜齿轮，每一枚都有门板大小。齿轮间隙可以藏身，但随时可能被碾碎。',
        coverRate: 0.6,
    },
    pendulum_housing: {
        id: 'pendulum_housing',
        name: '摆锤护罩',
        desc: '保护巨型摆锤的弧形铜罩，表面映出过去与未来的残影。',
        coverRate: 0.45,
    },
    timeline_shard: {
        id: 'timeline_shard',
        name: '时间残影碎片',
        desc: '从齿轮缝隙中飘出的半透明时间碎片，触及时会看到另一个版本的自己。无法被摧毁。',
        coverRate: 0.25,
        passable: 1,
    },
};

/**
 * 烛火书斋 · 永恒钟楼战场地图
 *
 * 交火结构（自后向前）：
 * 后区 x=-4~-3：完全开阔。
 *
 * 齿轮迷宫 x=-2~2：四组齿轮 G 以「北—北—南—南」对称排列于南北两轨，
 * 中央轨仅留摆锤护罩 P(0,1)。齿轮 60% 掩体且不可摧毁，
 * 把南北两轨切成多段，迫使战斗集中在中央轨。
 *
 * 远端 x=4：南北两轨各一片时间残影 T，可跨过但提供 25% 掩护。
 *
 * 部署参考：我方锚点 x=0（中央轨有摆锤护罩，南北轨被齿轮封堵需绕行）；
 * 敌方部署带 x=3~5，最小距离 3。
 *
 * 连通校验：中央轨全程贯通；南北轨被齿轮分段但可经中央轨折返，无孤立格。
 */
export const ARCHIVE_CLOCK_TOWER_MAP: BattleMap = {
    desc: '巨大的齿轮在虚空中缓慢咬合，发出震动灵魂的轰鸣。透过齿轮缝隙，可以看到过去和未来的残影。',
    depthRange: [-4, 5],
    laneCount: 3,
    covers: [
        // —— 齿轮组（不可摧毁）：南北对称 ——
        ['gear_assembly', -2, 0],
        ['gear_assembly', -2, 2],
        ['gear_assembly', 2, 0],
        ['gear_assembly', 2, 2],
        // —— 摆锤护罩：中央核心 ——
        ['pendulum_housing', 0, 1],
        // —— 时间残影：远端可跨过掩体 ——
        ['timeline_shard', 4, 0],
        ['timeline_shard', 4, 2],
    ],
    modifiers: {
        weaponTypeModifier: {
            // 齿轮的精密节奏有利于狙击
            sniper_rifle: { accuracyDelta: 0.05 },
            // 挥砍容易被齿轮卡住
            wave: { damageMultiplier: 0.9 },
            both_wave: { damageMultiplier: 0.9 },
            // 法术在机械空间中被削弱
            magic: { damageMultiplier: 0.9 },
        },
    },
};

// ─────────────────────────────────────────────────────────────
// wilted_greenhouse · 枯萎温室 (threat 2)
// 小房间，3 轨
// ─────────────────────────────────────────────────────────────

/**
 * 空间拓扑（depthRange [-4, 5] × 3 轨，y=0 为北墙、y=2 为南墙）：
 * 玻璃穹顶下的开阔空间，石化花盆散布，中央光之花基座是唯一的坚固掩体。
 *
 *            -4 -3 -2 -1  0  1  2  3  4  5
 * y=0          .  .  F  .  C  .  .  F  .  .
 * y=1          .  .  .  .  .  L  .  .  .  .
 * y=2          .  .  F  .  C  .  .  F  .  .
 *
 * F 石化花盆（不可通行 / 25% / 耐久 20：极度脆弱）
 * C 裂纹玻璃板（不可通行 / 20% / 耐久 15：随时崩塌）
 * L 光之花基座（不可通行 / 45% / 无耐久）
 */
export const WILTED_GREENHOUSE_COVERS: Record<string, Cover> = {
    fossilized_pot: {
        id: 'fossilized_pot',
        name: '石化花盆',
        desc: '已经化石化的植物与花盆融为一体，触碰即碎。',
        coverRate: 0.25,
        hp: 20,
    },
    cracked_glass: {
        id: 'cracked_glass',
        name: '裂纹玻璃板',
        desc: '布满蛛网裂纹的温室玻璃板，随时可能整块崩塌。',
        coverRate: 0.2,
        hp: 15,
    },
    light_flower_pedestal: {
        id: 'light_flower_pedestal',
        name: '光之花基座',
        desc: '悬浮光之花下方的石质基座，花瓣由凝固光线构成，每隔几秒变换颜色。',
        coverRate: 0.45,
    },
};

/**
 * 烛火书斋 · 枯萎温室战场地图
 *
 * 交火结构（自后向前）：
 * 后区 x=-4~-3：完全开阔。
 *
 * 石化花盆线 x=-2：南北两轨各一个石化花盆 F，耐久仅 20，一触即碎。
 *
 * 裂纹玻璃线 x=0：南北两轨各一块裂纹玻璃 C，耐久仅 15。
 * 中央轨完全空置。
 *
 * 中央核心 x=1：光之花基座 L(1,1) 是全图唯一坚固掩体（45%），
 * 不可摧毁，但仅占据中央一格。
 *
 * 远端 x=3：南北两轨各一个石化花盆 F。
 *
 * 部署参考：我方锚点 x=0（玻璃板提供脆弱掩护，中央轨全空）；
 * 敌方部署带 x=3~5，最小距离 3。
 *
 * 连通校验：三轨全程贯通，掩体均为单格点状分布，无阻断，无孤立格。
 */
export const ARCHIVE_WILTED_GREENHOUSE_MAP: BattleMap = {
    desc: '玻璃穹顶布满蛛网裂纹，大部分植物已石化。唯独中央悬浮着一株由凝固光线构成的花，每隔几秒变换颜色。',
    depthRange: [-4, 5],
    laneCount: 3,
    covers: [
        // —— 中央光之花基座 ——
        ['light_flower_pedestal', 1, 1],
        // —— 石化花盆（极脆弱）：南北对称 ——
        ['fossilized_pot', -2, 0],
        ['fossilized_pot', -2, 2],
        ['fossilized_pot', 3, 0],
        ['fossilized_pot', 3, 2],
        // —— 裂纹玻璃板 ——
        ['cracked_glass', 0, 0],
        ['cracked_glass', 0, 2],
    ],
    modifiers: {
        weaponTypeModifier: {
            // 光之花的色彩增幅法术
            magic: { damageMultiplier: 1.1 },
            // 弓弩在开阔温室中精度提升
            bow: { accuracyDelta: 0.05 },
            crossbow: { accuracyDelta: 0.05 },
            // 霰弹会震碎玻璃
            shotgun: { accuracyDelta: -0.05 },
            sawed_off: { accuracyDelta: -0.05 },
        },
    },
};

// ─────────────────────────────────────────────────────────────
// hypnosis_chamber · 催眠室 (threat 2)
// 极小房间，3 轨
// ─────────────────────────────────────────────────────────────

/**
 * 空间拓扑（depthRange [-3, 4] × 3 轨，y=0 为北墙、y=2 为南墙）：
 * 椭圆形隔音房间，中央躺椅与水晶球底座，四周隔音壁板。空间极度狭小。
 *
 *            -3 -2 -1  0  1  2  3  4
 * y=0          .  S  .  .  .  S  .  .
 * y=1          .  .  R  C  .  .  .  .
 * y=2          .  S  .  .  .  S  .  .
 *
 * S 隔音壁板（不可通行 / 40% / 无耐久）
 * R 催眠躺椅（可跨过，移入额外 1 AP / 20% / 无耐久）
 * C 水晶球底座（不可通行 / 45% / 无耐久）
 */
export const HYPNOSIS_CHAMBER_COVERS: Record<string, Cover> = {
    reclining_chair: {
        id: 'reclining_chair',
        name: '催眠躺椅',
        desc: '精致的躺椅，上方悬挂着缓慢旋转的水晶球。',
        coverRate: 0.2,
        passable: 1,
    },
    crystal_pedestal: {
        id: 'crystal_pedestal',
        name: '水晶球底座',
        desc: '支撑催眠水晶球的黄铜底座，球内流体形成漩涡图案。',
        coverRate: 0.45,
    },
    soundproof_wall: {
        id: 'soundproof_wall',
        name: '隔音壁板',
        desc: '完全隔音的椭圆形房间壁板，吸收一切声波。',
        coverRate: 0.4,
    },
};

/**
 * 烛火书斋 · 催眠室战场地图
 *
 * 交火结构（自后向前）：
 * 后区 x=-3：完全开阔，仅一格纵深。
 *
 * 隔音壁板 x=-2：南北两轨各一块隔音壁 S，中央轨空置。
 * 40% 掩体，不可摧毁，构成房间入口处的第一道屏障。
 *
 * 中央 x=-1~0：躺椅 R(-1,1) 可跨过，水晶球底座 C(0,1) 不可通行。
 * 中央轨被底座阻断，南北轨在隔音壁后仅有两格纵深。
 *
 * 前区 x=2：南北两轨各一块隔音壁 S，与后区镜像对称。
 *
 * 部署参考：我方锚点 x=0（中央轨被底座占，南北轨在壁板后方可藏身）；
 * 敌方部署带 x=2~4，最小距离 2——极近，开局即短兵相接。
 *
 * 连通校验：中央轨被底座阻断但南北轨可绕行，无孤立格。
 * 全图仅 8 格纵深 × 3 轨，是书斋中最小的战场。
 */
export const ARCHIVE_HYPNOSIS_CHAMBER_MAP: BattleMap = {
    desc: '完全隔音的椭圆形房间，正中央一张精致躺椅，上方悬挂着缓慢旋转的水晶球。墙上的告示写着：「入梦前请确认你知道自己的名字。」',
    depthRange: [-3, 4],
    laneCount: 3,
    covers: [
        // —— 中央：水晶球底座与躺椅 ——
        ['crystal_pedestal', 0, 1],
        ['reclining_chair', -1, 1],
        // —— 两侧隔音壁：南北对称 ——
        ['soundproof_wall', 2, 0],
        ['soundproof_wall', 2, 2],
        ['soundproof_wall', -2, 0],
        ['soundproof_wall', -2, 2],
    ],
    modifiers: {
        // 隔音空间极度安静，有利于集中
        accuracyBonus: 0.05,
        weaponTypeModifier: {
            // 催眠暗示增幅法术
            magic: { damageMultiplier: 1.15 },
            // 狭小空间不利于长武器
            both_wave: { accuracyDelta: -0.1 },
            both_prick: { accuracyDelta: -0.1 },
            sniper_rifle: { accuracyDelta: -0.15 },
        },
    },
};

// ─────────────────────────────────────────────────────────────
// celestial_map_room · 星穹制图室 (threat 3)
// 中小房间，4 轨
// ─────────────────────────────────────────────────────────────

/**
 * 空间拓扑（depthRange [-5, 6] × 4 轨，y=0 为北墙、y=3 为南墙）：
 * 天球仪基座占据中央，制图桌散布，脱落的金属环段在远端形成障碍。
 *
 *            -5 -4 -3 -2 -1  0  1  2  3  4  5  6
 * y=0          .  .  .  C  .  .  .  .  .  .  R  .
 * y=1          .  .  .  .  .  A  .  .  C  .  R  .
 * y=2          .  .  .  .  .  A  .  .  .  .  R  .
 * y=3          .  .  .  C  .  .  .  .  .  .  R  .
 *
 * A 天球仪基座（不可通行 / 50% / 无耐久）
 * C 制图长桌（可跨过，移入额外 1 AP / 30% / 耐久 40）
 * R 脱落金属环（不可通行 / 40% / 耐久 60）
 */
export const CELESTIAL_MAP_ROOM_COVERS: Record<string, Cover> = {
    armillary_base: {
        id: 'armillary_base',
        name: '天球仪基座',
        desc: '悬浮天球仪下方的精密金属底座，数百个嵌套环的投影在底座上缓缓旋转。',
        coverRate: 0.5,
    },
    cartography_table: {
        id: 'cartography_table',
        name: '制图长桌',
        desc: '散落的圆规、星规与未完成星图覆盖的长桌。',
        coverRate: 0.3,
        passable: 1,
        hp: 40,
    },
    ring_segment: {
        id: 'ring_segment',
        name: '脱落金属环',
        desc: '从天球仪上脱落的弧形金属环段，半埋在地板中，表面镶嵌的宝石仍在闪烁。',
        coverRate: 0.4,
        hp: 60,
    },
};

/**
 * 烛火书斋 · 星穹制图室战场地图
 *
 * 交火结构（自后向前）：
 * 后区 x=-5~-3：开阔，仅南北两轨各有制图桌 C 在 x=-2 提供前置掩护。
 *
 * 天球仪核心 x=0：基座 A 占据中央两轨 (0,1)/(0,2)，50% 掩体不可摧毁，
 * 是全图的战术支点。南北两轨在此处完全开阔。
 *
 * 中段 x=3：北轨制图桌 C(3,1) 提供侧翼掩护。
 *
 * 远端金属环墙 x=5：四轨全被金属环 R 封死，40% 掩体，耐久 60。
 * 这是全图最坚固的防线，敌方可以依托环墙进行持久防御。
 *
 * 部署参考：我方锚点 x=0（天球仪基座提供中央掩护，南北轨开阔）；
 * 敌方部署带 x=4~6（金属环后方可藏身），最小距离 4。
 *
 * 连通校验：南北两轨全程贯通；中央轨被天球仪基座阻断但可经南北轨绕行，无孤立格。
 */
export const ARCHIVE_CELESTIAL_MAP_ROOM_MAP: BattleMap = {
    desc: '房间中央悬浮着由数百个嵌套金属环组成的天球仪，无人触碰却缓慢自转。地面散落着制图工具和未完成的星图。',
    depthRange: [-5, 6],
    laneCount: 4,
    covers: [
        // —— 天球仪基座：中央两轨 ——
        ['armillary_base', 0, 1],
        ['armillary_base', 0, 2],
        // —— 制图桌：散布南北 ——
        ['cartography_table', -2, 0],
        ['cartography_table', -2, 3],
        ['cartography_table', 3, 1],
        // —— 远端金属环墙 ——
        ['ring_segment', 5, 0],
        ['ring_segment', 5, 1],
        ['ring_segment', 5, 2],
        ['ring_segment', 5, 3],
    ],
    modifiers: {
        weaponTypeModifier: {
            // 星辰能量增幅法术
            magic: { damageMultiplier: 1.1 },
            // 天文学的精密性有利于狙击
            sniper_rifle: { accuracyDelta: 0.05 },
            // 金属环的反射对冲锋枪不利
            smg: { accuracyDelta: -0.05 },
        },
    },
};

// ─────────────────────────────────────────────────────────────
// memory_theater · 记忆剧场 (threat 3)
// 小圆形剧场，3 轨
// ─────────────────────────────────────────────────────────────

/**
 * 空间拓扑（depthRange [-4, 5] × 3 轨，y=0 为北墙、y=2 为南墙）：
 * 圆形剧场，座椅在中央，幕布框架在远端，穹顶画眼柱在两侧。
 *
 *            -4 -3 -2 -1  0  1  2  3  4  5
 * y=0          .  .  E  .  .  .  E  .  S  .
 * y=1          .  .  .  .  T  .  .  .  S  .
 * y=2          .  .  E  .  .  .  E  .  S  .
 *
 * E 穹顶画眼柱（不可通行 / 35% / 无耐久）
 * T 天鹅绒座椅（可跨过，移入额外 1 AP / 20% / 无耐久）
 * S 幕布框架（不可通行 / 40% / 无耐久）
 */
export const MEMORY_THEATER_COVERS: Record<string, Cover> = {
    theater_seat: {
        id: 'theater_seat',
        name: '天鹅绒座椅',
        desc: '圆形剧场中孤零零的天鹅绒座椅，坐下就会成为他人记忆的观众。',
        coverRate: 0.2,
        passable: 1,
    },
    screen_frame: {
        id: 'screen_frame',
        name: '幕布框架',
        desc: '支撑空白幕布的厚重木框，幕布上偶尔闪过模糊的画面。',
        coverRate: 0.4,
    },
    eye_mural: {
        id: 'eye_mural',
        name: '穹顶画眼',
        desc: '穹顶上绘制的无数张开的眼睛，它们似乎在注视着你。画框本身是石质的。',
        coverRate: 0.35,
    },
};

/**
 * 烛火书斋 · 记忆剧场战场地图
 *
 * 交火结构（自后向前）：
 * 后区 x=-4~-3：完全开阔。
 *
 * 画眼柱带 x=-2~2：四根画眼柱 E 以南北对称排列，把战场切成
 * 中央通道与两侧窄巷。35% 掩体，不可摧毁。
 *
 * 中央座椅 x=0：天鹅绒座椅 T(0,1) 可跨过，仅提供 20% 极低矮掩护。
 * 这是全图中央轨唯一的遮蔽。
 *
 * 远端幕布墙 x=4：三轨全被幕布框架 S 封死，40% 掩体不可摧毁。
 * 敌方可以完全藏身幕布之后。
 *
 * 部署参考：我方锚点 x=0（中央有座椅，南北被画眼柱遮蔽）；
 * 敌方部署带 x=3~5（幕布框架后方），最小距离 3。
 *
 * 连通校验：中央轨全程贯通；南北轨被画眼柱分段但可经中央轨折返，无孤立格。
 */
export const ARCHIVE_MEMORY_THEATER_MAP: BattleMap = {
    desc: '圆形小剧场，中央一把孤零零的天鹅绒座椅面向空白幕布。穹顶上画着无数张开的眼睛。',
    depthRange: [-4, 5],
    laneCount: 3,
    covers: [
        // —— 中央座椅 ——
        ['theater_seat', 0, 1],
        // —— 远端幕布框架 ——
        ['screen_frame', 4, 0],
        ['screen_frame', 4, 1],
        ['screen_frame', 4, 2],
        // —— 穹顶画眼柱：南北对称 ——
        ['eye_mural', -2, 0],
        ['eye_mural', -2, 2],
        ['eye_mural', 2, 0],
        ['eye_mural', 2, 2],
    ],
    modifiers: {
        // 记忆干扰，所有精度微降
        accuracyBonus: -0.05,
        weaponTypeModifier: {
            // 记忆的能量增幅法术
            magic: { damageMultiplier: 1.1 },
            // 在剧场中近战有表演性质，挥砍增幅
            wave: { damageMultiplier: 1.05 },
            both_wave: { damageMultiplier: 1.05 },
        },
    },
};

// ─────────────────────────────────────────────────────────────
// dream_study · 梦境书房 (threat 3)
// 中小房间，4 轨，半透明空间
// ─────────────────────────────────────────────────────────────

/**
 * 空间拓扑（depthRange [-5, 6] × 4 轨，y=0 为北墙、y=3 为南墙）：
 * 凝固雾气构成的空间，凝雾柱与梦境书架交替，悬浮家具在中间漂移。
 *
 *            -5 -4 -3 -2 -1  0  1  2  3  4  5  6
 * y=0          .  .  .  M  .  D  .  .  .  .  .  .
 * y=1          .  .  .  .  .  .  F  M  .  D  .  .
 * y=2          .  .  .  .  .  .  .  M  F  D  .  .
 * y=3          .  .  .  M  .  D  .  .  .  .  .  .
 *
 * M 凝雾柱（不可通行 / 30% / 耐久 35）
 * D 梦境书架（不可通行 / 40% / 耐久 50）
 * F 悬浮家具（可跨过，移入额外 1 AP / 25% / 无耐久）
 */
export const DREAM_STUDY_COVERS: Record<string, Cover> = {
    mist_pillar: {
        id: 'mist_pillar',
        name: '凝雾柱',
        desc: '由凝固雾气构成的半透明柱体，触感如凝固的棉花。',
        coverRate: 0.3,
        hp: 35,
    },
    dream_shelf: {
        id: 'dream_shelf',
        name: '梦境书架',
        desc: '存放梦境之书的半透明书架，翻开书不会看到文字，而是进入一段梦。',
        coverRate: 0.4,
        hp: 50,
    },
    floating_furniture: {
        id: 'floating_furniture',
        name: '悬浮家具',
        desc: '半透明的悬浮桌椅，在梦境逻辑下缓慢漂移。',
        coverRate: 0.25,
        passable: 1,
    },
};

/**
 * 烛火书斋 · 梦境书房战场地图
 *
 * 交火结构（自后向前）：
 * 后区 x=-5~-3：完全开阔。
 *
 * 凝雾柱带 x=-2：南北两轨各一根凝雾柱 M，30% 掩体，耐久 35。
 *
 * 梦境书架线 x=0：南北两轨各一座书架 D，40% 掩体，耐久 50。
 * 中央两轨完全空置。
 *
 * 中央漂移区 x=1~3：悬浮家具 F 在 (1,1) 与 (3,2) 漂移，
 * 凝雾柱 M 在 (2,1)/(2,2) 形成中央隔断。
 *
 * 远端书架 x=4：中央两轨各一座书架 D。
 *
 * 部署参考：我方锚点 x=0（南北有书架掩护，中央开阔）；
 * 敌方部署带 x=4~6，最小距离 4。
 *
 * 连通校验：中央两轨全程贯通；南北轨被凝雾柱与书架分段但可折返，无孤立格。
 */
export const ARCHIVE_DREAM_STUDY_MAP: BattleMap = {
    desc: '半透明空间，墙壁、地板、天花板都由凝固雾气构成。这里的书不是用墨水写的，而是用梦境。',
    depthRange: [-5, 6],
    laneCount: 4,
    covers: [
        // —— 凝雾柱：南北对称 ——
        ['mist_pillar', -2, 0],
        ['mist_pillar', -2, 3],
        ['mist_pillar', 2, 1],
        ['mist_pillar', 2, 2],
        // —— 梦境书架 ——
        ['dream_shelf', 0, 0],
        ['dream_shelf', 0, 3],
        ['dream_shelf', 4, 1],
        ['dream_shelf', 4, 2],
        // —— 悬浮家具 ——
        ['floating_furniture', 1, 1],
        ['floating_furniture', 3, 2],
    ],
    modifiers: {
        // 梦境逻辑：空间不稳定，精度下降
        accuracyBonus: -0.1,
        weaponTypeModifier: {
            // 梦境能量大幅增幅法术
            magic: { damageMultiplier: 1.2 },
            // 梦境中物理攻击减弱
            wave: { damageMultiplier: 0.9 },
            both_wave: { damageMultiplier: 0.9 },
            prick: { damageMultiplier: 0.9 },
            both_prick: { damageMultiplier: 0.9 },
        },
    },
};

// ─────────────────────────────────────────────────────────────
// ritual_circle · 仪式密室 (threat 4)
// 中型房间，4 轨
// ─────────────────────────────────────────────────────────────

/**
 * 空间拓扑（depthRange [-6, 7] × 4 轨，y=0 为北墙、y=3 为南墙）：
 * 银粉法环占据中央大片区域，石制祭坛在正中，壁画支柱在四角。
 *
 *            -6 -5 -4 -3 -2 -1  0  1  2  3  4  5  6  7
 * y=0          .  .  M  .  .  R  .  .  .  R  .  M  .  .
 * y=1          .  .  .  .  .  .  .  S  .  .  .  .  .  .
 * y=2          .  .  .  .  .  .  .  S  .  .  .  .  .  .
 * y=3          .  .  M  .  .  R  .  .  .  R  .  M  .  .
 *
 * M 壁画支柱（不可通行 / 50% / 无耐久）
 * R 银粉法环（可跨过，移入额外 1 AP / 15% / 无耐久）
 * S 石制祭坛（不可通行 / 65% / 无耐久：不可摧毁）
 */
export const RITUAL_CIRCLE_COVERS: Record<string, Cover> = {
    silver_ring: {
        id: 'silver_ring',
        name: '银粉法环',
        desc: '地板上以银粉绘制的巨大魔法阵边缘，靠近时线条微微发光。银粉层极薄，无法阻挡弹道，但能偏转能量。',
        coverRate: 0.15,
        passable: 1,
    },
    stone_altar: {
        id: 'stone_altar',
        name: '石制祭坛',
        desc: '房间正中央的石制祭坛，表面有干涸的血迹。底部刻着「以血封印，以血解封」。祭坛由整块花岗岩雕成。',
        coverRate: 0.65,
    },
    mural_pillar: {
        id: 'mural_pillar',
        name: '壁画支柱',
        desc: '支撑穹顶的方形石柱，四面绘着被抹去面孔的仪式参与者。石料坚固。',
        coverRate: 0.5,
    },
};

/**
 * 烛火书斋 · 仪式密室战场地图
 *
 * 交火结构（自后向前）：
 * 后区 x=-6~-5：完全开阔。
 *
 * 四角支柱 x=-4~5：四根壁画支柱 M 占据南北两轨的四角，
 * 50% 掩体不可摧毁，构成房间的骨架。
 *
 * 银粉法环 x=-1~3：南北两轨各两处银粉法环 R，仅 15% 掩体，
 * 可跨过，更多是仪式性标记而非实质掩体。
 *
 * 中央祭坛 x=1：石制祭坛 S 占据中央两轨 (1,1)/(1,2)，
 * 65% 掩体不可摧毁，是全图最硬的单点，也是战术核心。
 *
 * 部署参考：我方锚点 x=0（中央轨开阔，南北有银粉法环但掩体极低）；
 * 敌方部署带 x=4~7（支柱后方可藏身），最小距离 4。
 *
 * 连通校验：中央轨被祭坛阻断但可经南北轨绕行；南北轨全程贯通，无孤立格。
 */
export const ARCHIVE_RITUAL_CIRCLE_MAP: BattleMap = {
    desc: '地板上银粉画着巨大魔法阵，中心是石制祭坛。墙上的壁画描绘着面孔被抹去的仪式。银粉线条在靠近时微微发光。',
    depthRange: [-6, 7],
    laneCount: 4,
    covers: [
        // —— 石制祭坛（不可摧毁）：中央两轨 ——
        ['stone_altar', 1, 1],
        ['stone_altar', 1, 2],
        // —— 银粉法环：南北对称 ——
        ['silver_ring', -1, 0],
        ['silver_ring', -1, 3],
        ['silver_ring', 3, 0],
        ['silver_ring', 3, 3],
        // —— 壁画支柱：四角 ——
        ['mural_pillar', -4, 0],
        ['mural_pillar', -4, 3],
        ['mural_pillar', 5, 0],
        ['mural_pillar', 5, 3],
    ],
    modifiers: {
        weaponTypeModifier: {
            // 仪式空间大幅增幅法术
            magic: { damageMultiplier: 1.25 },
            // 冷兵器在仪式空间中被削弱
            wave: { damageMultiplier: 0.85 },
            both_wave: { damageMultiplier: 0.85 },
            prick: { damageMultiplier: 0.85 },
            both_prick: { damageMultiplier: 0.85 },
            // 热武器在银粉阵中精度下降
            assault_rifle: { accuracyDelta: -0.05 },
            smg: { accuracyDelta: -0.05 },
        },
    },
};

// ─────────────────────────────────────────────────────────────
// echo_gallery · 回声长廊 (threat 4)
// 弧形长廊，4 轨
// ─────────────────────────────────────────────────────────────

/**
 * 空间拓扑（depthRange [-6, 7] × 4 轨，y=0 为北墙、y=3 为南墙）：
 * 弧形走廊，声学壁板在两侧，回声柱在中段，空白画框点缀。
 *
 *            -6 -5 -4 -3 -2 -1  0  1  2  3  4  5  6  7
 * y=0          .  .  A  .  .  .  A  .  .  .  A  .  .  .
 * y=1          .  .  .  .  .  E  .  .  .  E  .  .  F  .
 * y=2          .  .  .  .  .  E  .  .  .  E  .  .  F  .
 * y=3          .  .  A  .  .  .  A  .  .  .  A  .  .  .
 *
 * A 声学壁板（不可通行 / 45% / 耐久 55）
 * E 回声柱（不可通行 / 50% / 无耐久）
 * F 空白画框（不可通行 / 30% / 耐久 40）
 */
export const ECHO_GALLERY_COVERS: Record<string, Cover> = {
    acoustic_panel: {
        id: 'acoustic_panel',
        name: '声学壁板',
        desc: '弧形走廊两侧的声学材料壁板，能将声音反射并微妙修改。',
        coverRate: 0.45,
        hp: 55,
    },
    empty_frame: {
        id: 'empty_frame',
        name: '空白画框',
        desc: '墙上悬挂的空白画框，偶尔闪过模糊面孔。框架是坚实的橡木。',
        coverRate: 0.3,
        hp: 40,
    },
    echo_column: {
        id: 'echo_column',
        name: '回声柱',
        desc: '支撑弧形穹顶的石柱，你的每一声呼喊都会在这里被修改后送回。',
        coverRate: 0.5,
    },
};

/**
 * 烛火书斋 · 回声长廊战场地图
 *
 * 交火结构（自后向前）：
 * 后区 x=-6~-5：完全开阔。
 *
 * 声学壁板带 x=-4~4：南北两轨各三块声学壁板 A，等间距排列，
 * 45% 掩体，耐久 55。把南北两轨切成四段，每段两格纵深。
 *
 * 回声柱带 x=-1~3：中央两轨各两根回声柱 E，50% 掩体不可摧毁。
 * 这是中央轨的主要遮蔽，但柱间距三格，射界开阔。
 *
 * 远端画框 x=6：中央两轨各一个空白画框 F，30% 掩体。
 *
 * 部署参考：我方锚点 x=0（中央轨有回声柱遮蔽，南北轨在壁板后可藏身）；
 * 敌方部署带 x=5~7，最小距离 5。
 *
 * 连通校验：中央轨全程贯通；南北轨被壁板分段但可经中央轨折返，无孤立格。
 */
export const ARCHIVE_ECHO_GALLERY_MAP: BattleMap = {
    desc: '弧形长走廊，墙壁是声学材料。你发出的任何声音都会被反射回来——但内容会被微妙地修改。',
    depthRange: [-6, 7],
    laneCount: 4,
    covers: [
        // —— 声学壁板（两侧墙壁）：南北对称 ——
        ['acoustic_panel', -4, 0],
        ['acoustic_panel', -4, 3],
        ['acoustic_panel', 0, 0],
        ['acoustic_panel', 0, 3],
        ['acoustic_panel', 4, 0],
        ['acoustic_panel', 4, 3],
        // —— 回声柱：中央两轨 ——
        ['echo_column', -1, 1],
        ['echo_column', -1, 2],
        ['echo_column', 3, 1],
        ['echo_column', 3, 2],
        // —— 远端空白画框 ——
        ['empty_frame', 6, 1],
        ['empty_frame', 6, 2],
    ],
    modifiers: {
        // 回声干扰：精度下降
        accuracyBonus: -0.08,
        weaponTypeModifier: {
            // 声波对枪械有干扰
            sniper_rifle: { accuracyDelta: -0.1 },
            // 近战在回声中有额外震慑
            wave: { damageMultiplier: 1.1 },
            both_wave: { damageMultiplier: 1.1 },
            // 法术在声学空间中被增幅
            magic: { damageMultiplier: 1.1 },
        },
    },
};

// ─────────────────────────────────────────────────────────────
// observatory · 观星台 (threat 5)
// 中型圆顶房间，4 轨
// ─────────────────────────────────────────────────────────────

/**
 * 空间拓扑（depthRange [-6, 7] × 4 轨，y=0 为北墙、y=3 为南墙）：
 * 圆顶房间，望远镜基座在中央，星图架与穹顶支柱分布在四周。
 *
 *            -6 -5 -4 -3 -2 -1  0  1  2  3  4  5  6  7
 * y=0          .  .  .  S  .  D  .  .  .  S  .  D  .  .
 * y=1          .  .  .  .  .  .  T  .  .  .  .  .  .  .
 * y=2          .  .  .  .  .  .  T  .  .  .  .  .  .  .
 * y=3          .  .  .  S  .  D  .  .  .  S  .  D  .  .
 *
 * T 望远镜基座（不可通行 / 50% / 无耐久）
 * S 星图架（不可通行 / 35% / 耐久 40）
 * D 穹顶支柱（不可通行 / 45% / 无耐久）
 */
export const OBSERVATORY_COVERS: Record<string, Cover> = {
    telescope_mount: {
        id: 'telescope_mount',
        name: '望远镜基座',
        desc: '古老望远镜的铸铁三脚基座，刻满微小符文。沉重且稳固。',
        coverRate: 0.5,
    },
    star_chart_rack: {
        id: 'star_chart_rack',
        name: '星图架',
        desc: '悬挂着数十卷星图的木架，某些星座的位置每天都在变化。',
        coverRate: 0.35,
        hp: 40,
    },
    dome_strut: {
        id: 'dome_strut',
        name: '穹顶支柱',
        desc: '支撑透明穹顶的弧形钢梁，透过缝隙可以看到错误的星空。',
        coverRate: 0.45,
    },
};

/**
 * 烛火书斋 · 观星台战场地图
 *
 * 交火结构（自后向前）：
 * 后区 x=-6~-4：开阔，仅南北两轨在 x=-3 有星图架 S 提供 35% 掩护。
 *
 * 穹顶支柱线 x=-1：南北两轨各一根穹顶支柱 D，45% 掩体不可摧毁。
 * 中央两轨在此处完全开阔。
 *
 * 望远镜核心 x=0：基座 T 占据中央两轨 (0,1)/(0,2)，50% 掩体不可摧毁，
 * 是全图的战术支点。
 *
 * 远端 x=3~5：南北两轨各有星图架 S(3) 与穹顶支柱 D(5)。
 *
 * 部署参考：我方锚点 x=0（望远镜基座提供中央掩护，南北轨有支柱遮蔽）；
 * 敌方部署带 x=4~7，最小距离 4。
 *
 * 连通校验：中央轨被望远镜基座阻断但可经南北轨绕行；南北轨全程贯通，无孤立格。
 */
export const ARCHIVE_OBSERVATORY_MAP: BattleMap = {
    desc: '圆顶房间，天花板透明可见错误星座。房间中央的古老望远镜镜筒上刻满微小符文。',
    depthRange: [-6, 7],
    laneCount: 4,
    covers: [
        // —— 望远镜基座：中央两轨 ——
        ['telescope_mount', 0, 1],
        ['telescope_mount', 0, 2],
        // —— 星图架：南北对称 ——
        ['star_chart_rack', -3, 0],
        ['star_chart_rack', -3, 3],
        ['star_chart_rack', 3, 0],
        ['star_chart_rack', 3, 3],
        // —— 穹顶支柱：南北对称 ——
        ['dome_strut', -1, 0],
        ['dome_strut', -1, 3],
        ['dome_strut', 5, 0],
        ['dome_strut', 5, 3],
    ],
    modifiers: {
        weaponTypeModifier: {
            // 开阔穹顶有利于远程
            sniper_rifle: { accuracyDelta: 0.1 },
            bow: { accuracyDelta: 0.05 },
            crossbow: { accuracyDelta: 0.05 },
            // 近战在开阔空间中不利
            wave: { accuracyDelta: -0.05 },
            both_wave: { accuracyDelta: -0.05 },
            // 星辰能量增幅法术
            magic: { damageMultiplier: 1.1 },
        },
    },
};

// ─────────────────────────────────────────────────────────────
// forbidden_wing · 禁书侧翼 (threat 6)
// 中大型区域，5 轨
// ─────────────────────────────────────────────────────────────

/**
 * 空间拓扑（depthRange [-8, 9] × 5 轨，y=0 为北墙、y=4 为南墙）：
 * 锁链书架构成主要掩体线，标本瓶散布，拖拽刮痕脊在通道中。冷蓝色光芒笼罩。
 *
 *            -8 -7 -6 -5 -4 -3 -2 -1  0  1  2  3  4  5  6  7  8  9
 * y=0          .  .  .  C  .  .  .  .  C  .  S  .  .  D  .  C  .  .
 * y=1          .  .  .  C  .  D  .  .  .  .  .  .  C  .  S  .  .  .
 * y=2          .  .  .  .  .  .  S  .  .  .  .  .  C  .  .  C  .  .
 * y=3          .  .  .  C  .  D  .  .  .  .  .  .  C  .  .  .  .  .
 * y=4          .  .  .  C  .  .  .  .  C  .  S  .  .  D  .  C  .  .
 *
 * C 锁链书架（不可通行 / 55% / 耐久 80）
 * S 福尔马林标本瓶（不可通行 / 30% / 耐久 25）
 * D 拖拽刮痕脊（可跨过，移入额外 1 AP / 20% / 无耐久）
 */
export const FORBIDDEN_WING_COVERS: Record<string, Cover> = {
    chained_shelf: {
        id: 'chained_shelf',
        name: '锁链书架',
        desc: '被生锈铁链锁住的书架，链环在烛光下泛着冷蓝色的光。书籍在链中挣扎、蠕动。',
        coverRate: 0.55,
        hp: 80,
    },
    specimen_jar: {
        id: 'specimen_jar',
        name: '福尔马林标本瓶',
        desc: '浸泡在防腐液中的活体书籍，玻璃瓶壁随内容物的脉搏微微鼓动。',
        coverRate: 0.3,
        hp: 25,
    },
    drag_mark_barrier: {
        id: 'drag_mark_barrier',
        name: '拖拽刮痕脊',
        desc: '地面上由书脊反复刮擦形成的隆起沟脊，深及小腿，可作低矮掩体。',
        coverRate: 0.2,
        passable: 1,
    },
};

/**
 * 烛火书斋 · 禁书侧翼战场地图
 *
 * 交火结构（自后向前）：
 * 后区 x=-8~-6：完全开阔。
 *
 * 第一道书架墙 x=-5：锁链书架 C 占据南北四轨（除中央轨），
 * 55% 掩体，耐久 80，是全图最坚固的防线。中央轨在此处完全开阔。
 *
 * 刮痕脊带 x=-3：南北两轨各一道刮痕脊 D，仅 20% 低矮掩护，可跨过。
 *
 * 标本瓶散布 x=-2~6：四只标本瓶 S 分散在战场各处，30% 掩体，
 * 耐久仅 25，一触即碎。
 *
 * 第二道书架墙 x=0~7：锁链书架 C 以不规则分布构成多道防线，
 * 把战场切成数段射界。
 *
 * 部署参考：我方锚点 x=0（中央轨开阔，南北有书架遮蔽）；
 * 敌方部署带 x=5~9，最小距离 5。
 *
 * 连通校验：中央轨全程贯通；南北轨被书架分段但可经中央轨折返，无孤立格。
 */
export const ARCHIVE_FORBIDDEN_WING_MAP: BattleMap = {
    desc: '书架被生锈铁链锁住，有些书浸泡在福尔马林瓶中，有的还在跳动。灯光变成冰冷的蓝色，地面上有书脊留下的拖拽刮痕。',
    depthRange: [-8, 9],
    laneCount: 5,
    covers: [
        // —— 锁链书架（主要掩体线） ——
        ['chained_shelf', -5, 0],
        ['chained_shelf', -5, 1],
        ['chained_shelf', -5, 3],
        ['chained_shelf', -5, 4],
        ['chained_shelf', 0, 0],
        ['chained_shelf', 0, 4],
        ['chained_shelf', 4, 1],
        ['chained_shelf', 4, 2],
        ['chained_shelf', 4, 3],
        ['chained_shelf', 7, 0],
        ['chained_shelf', 7, 2],
        ['chained_shelf', 7, 4],
        // —— 标本瓶 ——
        ['specimen_jar', -2, 2],
        ['specimen_jar', 2, 0],
        ['specimen_jar', 2, 4],
        ['specimen_jar', 6, 1],
        // —— 拖拽刮痕 ——
        ['drag_mark_barrier', -3, 1],
        ['drag_mark_barrier', -3, 3],
        ['drag_mark_barrier', 5, 0],
        ['drag_mark_barrier', 5, 4],
    ],
    modifiers: {
        // 冷蓝色光芒与不安能量：精度微降
        accuracyBonus: -0.05,
        weaponTypeModifier: {
            // 锁链缠住挥砍
            wave: { damageMultiplier: 0.85 },
            both_wave: { damageMultiplier: 0.85 },
            // 刺击可以穿过链隙
            prick: { damageMultiplier: 1.1 },
            both_prick: { damageMultiplier: 1.1 },
            // 禁书知识增幅法术
            magic: { damageMultiplier: 1.15 },
            // 热武器会惊动书架中的活体书籍
            shotgun: { accuracyDelta: -0.05 },
            sawed_off: { accuracyDelta: -0.05 },
        },
    },
};

// ─────────────────────────────────────────────────────────────
// time_fracture · 时间裂隙 (threat 6)
// 中大型，5 轨，裂隙地形
// ─────────────────────────────────────────────────────────────

/**
 * 空间拓扑（depthRange [-7, 8] × 5 轨，y=0 为北墙、y=4 为南墙）：
 * 裂缝贯穿战场，结晶体与凝固瞬间散布，季节碎片在两侧。
 *
 *            -7 -6 -5 -4 -3 -2 -1  0  1  2  3  4  5  6  7  8
 * y=0          .  .  .  .  C  .  .  .  .  .  F  .  .  .  .  .
 * y=1          .  .  .  S  .  .  .  .  C  .  .  .  .  S  .  .
 * y=2          .  .  .  .  .  .  F  .  .  .  .  .  C  .  .  .
 * y=3          .  .  .  S  .  .  .  .  C  .  .  .  .  S  .  .
 * y=4          .  .  .  .  C  .  .  .  .  .  F  .  .  .  .  .
 *
 * C 裂隙结晶体（不可通行 / 40% / 耐久 50）
 * F 凝固瞬间（不可通行 / 35% / 无耐久）
 * S 季节碎片（可跨过，移入额外 1 AP / 25% / 无耐久）
 */
export const TIME_FRACTURE_COVERS: Record<string, Cover> = {
    crystal_formation: {
        id: 'crystal_formation',
        name: '裂隙结晶体',
        desc: '裂缝边缘不断结晶又溶解的半透明矿物簇，在黎明与黄昏之间闪烁。',
        coverRate: 0.4,
        hp: 50,
    },
    frozen_moment: {
        id: 'frozen_moment',
        name: '凝固瞬间',
        desc: '被时间冻结的爆炸火光、雨滴或碎片，悬浮在半空中。触碰不会改变它们。',
        coverRate: 0.35,
    },
    season_shard: {
        id: 'season_shard',
        name: '季节碎片',
        desc: '春天与冬天交替出现的时间碎片，站在其中会同时感受到温暖与严寒。',
        coverRate: 0.25,
        passable: 1,
    },
};

/**
 * 烛火书斋 · 时间裂隙战场地图
 *
 * 交火结构（自后向前）：
 * 后区 x=-7~-5：完全开阔。
 *
 * 结晶体带 x=-3~5：五块裂隙结晶体 C 以「北—中—南—中—北」对称排列，
 * 40% 掩体，耐久 50，构成战场的主要遮蔽网络。
 *
 * 凝固瞬间 x=-1~3：三块凝固瞬间 F 散布于南北两轨与中央轨，
 * 35% 掩体不可摧毁。
 *
 * 季节碎片 x=-4~6：四片季节碎片 S 在南北两轨边缘，25% 掩体可跨过。
 *
 * 部署参考：我方锚点 x=0（五轨全空，最近掩体在 x=-1）；
 * 敌方部署带 x=4~8，最小距离 4。
 *
 * 连通校验：五轨全程贯通，掩体均为单格点状分布，无阻断，无孤立格。
 */
export const ARCHIVE_TIME_FRACTURE_MAP: BattleMap = {
    desc: '台阶尽头是一道巨大裂缝，现实被撕开。裂缝边缘不断结晶和溶解，透过裂缝可同时看到黎明和黄昏、春天和冬天。',
    depthRange: [-7, 8],
    laneCount: 5,
    covers: [
        // —— 裂隙结晶体：对称分布 ——
        ['crystal_formation', -3, 0],
        ['crystal_formation', -3, 4],
        ['crystal_formation', 1, 1],
        ['crystal_formation', 1, 3],
        ['crystal_formation', 5, 2],
        // —— 凝固瞬间 ——
        ['frozen_moment', -1, 2],
        ['frozen_moment', 3, 0],
        ['frozen_moment', 3, 4],
        // —— 季节碎片：南北边缘 ——
        ['season_shard', -4, 1],
        ['season_shard', -4, 3],
        ['season_shard', 6, 1],
        ['season_shard', 6, 3],
    ],
    modifiers: {
        // 时间异常：因果不稳定
        accuracyBonus: -0.1,
        weaponTypeModifier: {
            // 时间裂隙增幅法术
            magic: { damageMultiplier: 1.2 },
            // 时间冻结有利于精准射击
            sniper_rifle: { accuracyDelta: 0.05 },
            // 近战在时间扭曲中不稳定
            wave: { accuracyDelta: -0.05 },
            both_wave: { accuracyDelta: -0.05 },
        },
    },
};

// ─────────────────────────────────────────────────────────────
// ink_well · 墨池深渊 (threat 8)
// 大型，5 轨，下沉空间
// ─────────────────────────────────────────────────────────────

/**
 * 空间拓扑（depthRange [-8, 9] × 5 轨，y=0 为北墙、y=4 为南墙）：
 * 圆形下沉空间，墨池石沿占据中央大片，墨晶笋散布，下沉台阶在边缘。
 *
 *            -8 -7 -6 -5 -4 -3 -2 -1  0  1  2  3  4  5  6  7  8  9
 * y=0          .  .  .  I  .  .  .  .  .  I  .  .  .  .  .  .  I  .
 * y=1          .  .  .  .  .  .  .  P  .  .  .  P  .  .  .  .  .  .
 * y=2          .  .  S  .  .  .  .  P  .  .  .  P  .  .  .  S  .  .
 * y=3          .  .  .  .  .  .  .  P  .  .  .  P  .  .  .  .  .  .
 * y=4          .  .  .  I  .  .  .  .  .  I  .  .  .  .  .  .  I  .
 *
 * P 墨池石沿（不可通行 / 55% / 无耐久）
 * I 墨晶笋（不可通行 / 45% / 耐久 65）
 * S 下沉台阶（可跨过，移入额外 1 AP / 20% / 无耐久）
 */
export const INK_WELL_COVERS: Record<string, Cover> = {
    pool_rim: {
        id: 'pool_rim',
        name: '墨池石沿',
        desc: '圆形下沉空间中央的巨型石质水池边缘，石沿高及腰部，表面被墨水侵蚀得光滑如镜。',
        coverRate: 0.55,
    },
    ink_stalagmite: {
        id: 'ink_stalagmite',
        name: '墨晶笋',
        desc: '从墨池边缘凝结生长的纯黑色结晶体，内部封存着异星夜空的倒影。',
        coverRate: 0.45,
        hp: 65,
    },
    sunken_step: {
        id: 'sunken_step',
        name: '下沉台阶',
        desc: '通向墨池的半没入黑色液体的石阶，站在上面会被墨水浸没至小腿。',
        coverRate: 0.2,
        passable: 1,
    },
};

/**
 * 烛火书斋 · 墨池深渊战场地图
 *
 * 交火结构（自后向前）：
 * 后区 x=-8~-7：完全开阔。
 *
 * 墨晶笋带 x=-5~6：六根墨晶笋 I 以南北对称排列于边缘两轨，
 * 45% 掩体，耐久 65，构成战场外围的遮蔽网络。
 *
 * 墨池石沿核心 x=-1~3：石沿 P 占据中央三轨的六个格位，
 * 形成一道 55% 掩体的弧形防线，是全图最坚固的中间屏障。
 * 石沿不可摧毁，把战场切成南北两半。
 *
 * 下沉台阶 x=-6~7：南北两轨各一处下沉台阶 S，20% 低矮掩护，可跨过。
 *
 * 部署参考：我方锚点 x=0（中央三轨被石沿阻断，南北轨有墨晶笋遮蔽）；
 * 敌方部署带 x=5~9，最小距离 5。
 * 全局移动消耗 +1（墨液浸没地面）。
 *
 * 连通校验：南北两轨全程贯通；中央三轨被石沿阻断但可经南北轨绕行，无孤立格。
 */
export const ARCHIVE_INK_WELL_MAP: BattleMap = {
    desc: '圆形下沉空间，中央是盛满深不见底黑色墨水的石质水池。墨水表面映出的不是天花板，而是缀满陌生星辰的夜空。',
    depthRange: [-8, 9],
    laneCount: 5,
    covers: [
        // —— 墨池石沿（中央）：弧形防线 ——
        ['pool_rim', -1, 1],
        ['pool_rim', -1, 2],
        ['pool_rim', -1, 3],
        ['pool_rim', 3, 1],
        ['pool_rim', 3, 2],
        ['pool_rim', 3, 3],
        // —— 墨晶笋：南北对称 ——
        ['ink_stalagmite', -5, 0],
        ['ink_stalagmite', -5, 4],
        ['ink_stalagmite', 6, 0],
        ['ink_stalagmite', 6, 4],
        ['ink_stalagmite', 1, 0],
        ['ink_stalagmite', 1, 4],
        // —— 下沉台阶 ——
        ['sunken_step', -6, 2],
        ['sunken_step', 7, 2],
    ],
    modifiers: {
        // 墨水飞溅与深渊低语
        accuracyBonus: -0.08,
        moveCostDelta: 1,
        weaponTypeModifier: {
            // 墨池中的星空能量增幅法术
            magic: { damageMultiplier: 1.2 },
            // 墨水中的近战阻力
            wave: { damageMultiplier: 0.9 },
            both_wave: { damageMultiplier: 0.9 },
            prick: { damageMultiplier: 0.9 },
            both_prick: { damageMultiplier: 0.9 },
            // 狙击在开阔墨池边有优势
            sniper_rifle: { accuracyDelta: 0.05 },
        },
    },
};

// ─────────────────────────────────────────────────────────────
// abyss_corridor · 深渊回廊 (threat 8)
// 大型，5 轨，狭长走廊
// ─────────────────────────────────────────────────────────────

/**
 * 空间拓扑（depthRange [-9, 10] × 5 轨，y=0 为北墙、y=4 为南墙）：
 * 狭长走廊，实体黑暗覆盖大片区域，无名书堆在两侧，脚印光痕标记路径。
 *
 *            -9 -8 -7 -6 -5 -4 -3 -2 -1  0  1  2  3  4  5  6  7  8  9  10
 * y=0          .  .  .  N  .  .  .  .  .  N  .  .  D  .  .  .  .  N  .  .
 * y=1          .  .  .  .  .  D  .  .  .  .  .  .  D  .  N  .  .  .  .  .
 * y=2          .  .  .  .  .  D  .  F  .  .  .  F  .  .  .  F  D  .  .  .
 * y=3          .  .  .  .  .  D  .  .  .  .  .  .  .  .  N  .  D  .  .  .
 * y=4          .  .  .  N  .  .  .  .  .  N  .  .  .  .  .  .  .  N  .  .
 *
 * D 实体黑暗（可跨过，移入额外 2 AP / 30% / 无耐久）
 * N 无名书堆（不可通行 / 40% / 耐久 55）
 * F 脚印光痕（可跨过，移入额外 1 AP / 10% / 无耐久）
 */
export const ABYSS_CORRIDOR_COVERS: Record<string, Cover> = {
    nameless_pile: {
        id: 'nameless_pile',
        name: '无名书堆',
        desc: '没有书名的黑皮书堆叠成的矮墙，靠近时能听见极轻的呼吸声。',
        coverRate: 0.4,
        hp: 55,
    },
    darkness_patch: {
        id: 'darkness_patch',
        name: '实体黑暗',
        desc: '有实体的黑暗贴着地面流动，踏入其中视线被完全吞噬，但身体能感受到它的粘稠。',
        coverRate: 0.3,
        passable: 2,
    },
    footprint_trace: {
        id: 'footprint_trace',
        name: '脚印光痕',
        desc: '走过之处留下的微弱发光脚印，几秒后消失。光痕本身不构成掩体，但能标记安全路径。',
        coverRate: 0.1,
        passable: 1,
    },
};

/**
 * 烛火书斋 · 深渊回廊战场地图
 *
 * 交火结构（自后向前）：
 * 后区 x=-9~-7：完全开阔。
 *
 * 书堆锚点 x=-6~8：八堆无名书堆 N 以南北对称排列于边缘两轨，
 * 40% 掩体，耐久 55，构成走廊的主要遮蔽骨架。
 *
 * 实体黑暗带 x=-4~7：七片实体黑暗 D 覆盖中央三轨的大片区域，
 * 移入需额外 2 AP，30% 掩体。黑暗区域是双刃剑——
 * 提供掩护但严重迟滞机动。
 *
 * 脚印光痕 x=-2~6：三处脚印光痕 F 标记中央轨的安全路径，
 * 仅 10% 掩体，更多是导航标记。
 *
 * 部署参考：我方锚点 x=0（南北轨有书堆遮蔽，中央轨有黑暗区需穿越）；
 * 敌方部署带 x=6~10，最小距离 6。
 *
 * 连通校验：南北两轨全程贯通；中央轨被黑暗区覆盖但可通行（额外 2 AP），无孤立格。
 */
export const ARCHIVE_ABYSS_CORRIDOR_MAP: BattleMap = {
    desc: '没有蜡烛的漆黑走廊，黑暗像有实体般贴着皮肤流动。墙壁上的书架塞满没有书名的书，走过的地方留下微弱脚印光痕。',
    depthRange: [-9, 10],
    laneCount: 5,
    covers: [
        // —— 实体黑暗（大片，移入消耗 2 AP） ——
        ['darkness_patch', -4, 1],
        ['darkness_patch', -4, 2],
        ['darkness_patch', -4, 3],
        ['darkness_patch', 3, 0],
        ['darkness_patch', 3, 1],
        ['darkness_patch', 7, 2],
        ['darkness_patch', 7, 3],
        // —— 无名书堆：南北对称 ——
        ['nameless_pile', -6, 0],
        ['nameless_pile', -6, 4],
        ['nameless_pile', 0, 0],
        ['nameless_pile', 0, 4],
        ['nameless_pile', 5, 1],
        ['nameless_pile', 5, 3],
        ['nameless_pile', 8, 0],
        ['nameless_pile', 8, 4],
        // —— 脚印光痕（标记路径） ——
        ['footprint_trace', -2, 2],
        ['footprint_trace', 2, 2],
        ['footprint_trace', 6, 2],
    ],
    modifiers: {
        // 极度黑暗：精度大幅下降
        accuracyBonus: -0.15,
        weaponTypeModifier: {
            // 黑暗中近战反而增强（不需要瞄准）
            wave: { damageMultiplier: 1.15, accuracyDelta: 0.1 },
            both_wave: { damageMultiplier: 1.15, accuracyDelta: 0.1 },
            prick: { damageMultiplier: 1.1, accuracyDelta: 0.05 },
            both_prick: { damageMultiplier: 1.1, accuracyDelta: 0.05 },
            // 远程在黑暗中严重削弱
            sniper_rifle: { accuracyDelta: -0.15 },
            assault_rifle: { accuracyDelta: -0.1 },
            smg: { accuracyDelta: -0.1 },
            // 法术不受黑暗影响
            magic: { damageMultiplier: 1.1 },
        },
    },
};

// ─────────────────────────────────────────────────────────────
// archive_vault · 禁忌书库 (threat 10)
// 大型，5 轨，铁库结构
// ─────────────────────────────────────────────────────────────

/**
 * 空间拓扑（depthRange [-9, 10] × 5 轨，y=0 为北墙、y=4 为南墙）：
 * 沉重铁库门框在入口，低语书堆与知识压力柱散布，空间压迫感极强。
 *
 *            -9 -8 -7 -6 -5 -4 -3 -2 -1  0  1  2  3  4  5  6  7  8  9  10
 * y=0          .  .  .  .  .  .  W  .  .  .  .  .  .  .  W  .  .  .  .  .
 * y=1          .  .  V  .  .  .  .  .  .  .  W  .  P  .  .  .  .  P  .  .
 * y=2          .  .  V  .  .  .  .  .  P  .  .  .  .  .  W  .  .  .  .  .
 * y=3          .  .  V  .  .  .  .  .  .  .  W  .  P  .  .  .  .  P  .  .
 * y=4          .  .  .  .  .  .  W  .  .  .  .  .  .  .  W  .  .  .  .  .
 *
 * V 铁库门框（不可通行 / 70% / 无耐久：不可摧毁）
 * W 低语书堆（不可通行 / 45% / 耐久 60）
 * P 知识压力柱（不可通行 / 50% / 耐久 70）
 */
export const ARCHIVE_VAULT_COVERS: Record<string, Cover> = {
    vault_door_frame: {
        id: 'vault_door_frame',
        name: '铁库门框',
        desc: '重达数吨的铸铁门框，表面刻满封印铭文。即便门扉已开，门框本身仍是一堵不可撼动的墙。',
        coverRate: 0.7,
    },
    whispering_pile: {
        id: 'whispering_pile',
        name: '低语书堆',
        desc: '数十本窃窃私语的典籍堆叠成塔，声波令周围空气产生可见的扭曲涟漪。',
        coverRate: 0.45,
        hp: 60,
    },
    pressure_column: {
        id: 'pressure_column',
        name: '知识压力柱',
        desc: '未经过滤的原始知识凝结成的半透明柱体，靠近时颅骨会感到物理性的压迫。',
        coverRate: 0.5,
        hp: 70,
    },
};

/**
 * 烛火书斋 · 禁忌书库战场地图
 *
 * 交火结构（自后向前）：
 * 后区 x=-9~-8：完全开阔。
 *
 * 铁库门框 x=-7：三轨（中央三轨）被铁库门框 V 封死，
 * 70% 掩体不可摧毁，是全图最硬的单点。
 * 我方从门框两侧（南北两轨）进入战场。
 *
 * 低语书堆带 x=-3~5：五堆低语书堆 W 以不规则分布散布战场，
 * 45% 掩体，耐久 60，提供中距离遮蔽。
 *
 * 知识压力柱带 x=-1~8：五根压力柱 P 以中央轨为轴对称排列，
 * 50% 掩体，耐久 70，构成战场的纵深骨架。
 *
 * 部署参考：我方锚点 x=0（门框在身后提供 70% 掩体，南北轨开阔）；
 * 敌方部署带 x=6~10，最小距离 6。
 *
 * 连通校验：南北两轨全程贯通；中央轨被门框阻断但可经南北轨绕行，无孤立格。
 */
export const ARCHIVE_ARCHIVE_VAULT_MAP: BattleMap = {
    desc: '沉重铁门保护着最核心的秘密。每一本书都在窃窃私语，声波让空气产生轻微扭曲。知识如同物理压力般压在颅骨上。',
    depthRange: [-9, 10],
    laneCount: 5,
    covers: [
        // —— 铁库门框（不可摧毁）：入口中央三轨 ——
        ['vault_door_frame', -7, 1],
        ['vault_door_frame', -7, 2],
        ['vault_door_frame', -7, 3],
        // —— 低语书堆：不规则分布 ——
        ['whispering_pile', -3, 0],
        ['whispering_pile', -3, 4],
        ['whispering_pile', 1, 1],
        ['whispering_pile', 1, 3],
        ['whispering_pile', 5, 0],
        ['whispering_pile', 5, 2],
        ['whispering_pile', 5, 4],
        // —— 知识压力柱：纵深骨架 ——
        ['pressure_column', -1, 2],
        ['pressure_column', 3, 1],
        ['pressure_column', 3, 3],
        ['pressure_column', 8, 1],
        ['pressure_column', 8, 3],
    ],
    modifiers: {
        // 知识压力与声波扭曲
        accuracyBonus: -0.1,
        weaponTypeModifier: {
            // 禁忌知识大幅增幅法术
            magic: { damageMultiplier: 1.25 },
            // 声波干扰精密射击
            sniper_rifle: { accuracyDelta: -0.1 },
            // 近战在压力柱间穿行
            prick: { damageMultiplier: 1.1 },
            both_prick: { damageMultiplier: 1.1 },
            // 热武器会引发书堆共振
            shotgun: { accuracyDelta: -0.08 },
            sawed_off: { accuracyDelta: -0.08 },
        },
    },
};

// ─────────────────────────────────────────────────────────────
// mirror_library · 镜像图书馆 (threat 10)
// 大型，5 轨，镜面空间
// ─────────────────────────────────────────────────────────────

/**
 * 空间拓扑（depthRange [-9, 10] × 5 轨，y=0 为北墙、y=4 为南墙）：
 * 镜面墙体占据一侧，倒影书架与力场残片散布，空间有镜像对称感。
 *
 *            -9 -8 -7 -6 -5 -4 -3 -2 -1  0  1  2  3  4  5  6  7  8  9  10
 * y=0          .  .  .  M  .  .  .  R  .  .  .  .  .  .  .  .  R  .  .  .
 * y=1          .  .  .  M  .  .  .  .  .  F  .  .  R  .  .  .  .  .  .  .
 * y=2          .  .  .  M  .  .  .  R  .  .  .  .  .  .  F  .  R  .  .  .
 * y=3          .  .  .  M  .  .  .  .  .  F  .  .  R  .  .  .  .  .  .  .
 * y=4          .  .  .  M  .  .  .  R  .  .  .  .  .  .  .  .  R  .  .  .
 *
 * M 镜面墙体（不可通行 / 60% / 无耐久）
 * R 倒影书架（不可通行 / 35% / 耐久 45）
 * F 力场残片（不可通行 / 45% / 耐久 60）
 */
export const MIRROR_LIBRARY_COVERS: Record<string, Cover> = {
    mirror_wall: {
        id: 'mirror_wall',
        name: '镜面墙体',
        desc: '巨大的镜面墙壁，映出与现实一致但多出银光书籍的房间。镜面偶尔泛起涟漪。',
        coverRate: 0.6,
    },
    reflected_shelf: {
        id: 'reflected_shelf',
        name: '倒影书架',
        desc: '仅存在于镜中的书架在现实侧的投影，半透明且闪烁不定。',
        coverRate: 0.35,
        hp: 45,
    },
    force_field_remnant: {
        id: 'force_field_remnant',
        name: '力场残片',
        desc: '封锁镜像入口的晶莹力场破碎后残留的碎片，表面流动着悖论符文。',
        coverRate: 0.45,
        hp: 60,
    },
};

/**
 * 烛火书斋 · 镜像图书馆战场地图
 *
 * 交火结构（自后向前）：
 * 后区 x=-9~-8：完全开阔。
 *
 * 镜面墙 x=-6：五轨全被镜面墙体 M 封死，60% 掩体不可摧毁。
 * 这是全图最坚固的单侧防线，我方从镜面墙后方进入战场。
 * 镜面墙把整个西端封死，只留南北两轨的绕行通道。
 *
 * 倒影书架带 x=-2~7：八座倒影书架 R 以不规则分布散布战场，
 * 35% 掩体，耐久 45，半透明且闪烁不定。
 *
 * 力场残片带 x=0~5：三片力场残片 F 在中央轨与南北轨之间，
 * 45% 掩体，耐久 60，是战场中段的战术支点。
 *
 * 部署参考：我方锚点 x=0（镜面墙在身后提供 60% 掩体，南北轨有书架遮蔽）；
 * 敌方部署带 x=6~10，最小距离 6。
 *
 * 连通校验：南北两轨全程贯通；中央轨被镜面墙阻断但可经南北轨绕行，无孤立格。
 */
export const ARCHIVE_MIRROR_LIBRARY_MAP: BattleMap = {
    desc: '一面墙是巨大镜子，镜中房间与现实一致但多出银光书籍。镜面偶尔泛起涟漪。入口被力场封锁，表面流动着悖论符文。',
    depthRange: [-9, 10],
    laneCount: 5,
    covers: [
        // —— 镜面墙体（一侧）：五轨全封 ——
        ['mirror_wall', -6, 0],
        ['mirror_wall', -6, 1],
        ['mirror_wall', -6, 2],
        ['mirror_wall', -6, 3],
        ['mirror_wall', -6, 4],
        // —— 倒影书架：不规则分布 ——
        ['reflected_shelf', -2, 0],
        ['reflected_shelf', -2, 2],
        ['reflected_shelf', -2, 4],
        ['reflected_shelf', 3, 1],
        ['reflected_shelf', 3, 3],
        ['reflected_shelf', 7, 0],
        ['reflected_shelf', 7, 2],
        ['reflected_shelf', 7, 4],
        // —— 力场残片：中段支点 ——
        ['force_field_remnant', 0, 1],
        ['force_field_remnant', 0, 3],
        ['force_field_remnant', 5, 2],
    ],
    modifiers: {
        // 镜像干扰：空间感混乱
        accuracyBonus: -0.12,
        weaponTypeModifier: {
            // 镜面反射增幅法术
            magic: { damageMultiplier: 1.3 },
            // 镜像干扰远程瞄准
            sniper_rifle: { accuracyDelta: -0.15 },
            assault_rifle: { accuracyDelta: -0.08 },
            // 近战在镜像中更直观
            wave: { accuracyDelta: 0.05 },
            both_wave: { accuracyDelta: 0.05 },
        },
    },
};

// ─────────────────────────────────────────────────────────────
// void_portal · 虚空裂隙 (threat 12)
// 超大型，6 轨，无墙空间
// ─────────────────────────────────────────────────────────────

/**
 * 空间拓扑（depthRange [-10, 11] × 6 轨，y=0 为北缘、y=5 为南缘）：
 * 没有墙壁的房间，只有旋转星空。星涡结晶与星碎柱散布，现实边缘在四周。
 *
 *           -10 -9 -8 -7 -6 -5 -4 -3 -2 -1  0  1  2  3  4  5  6  7  8  9  10 11
 * y=0          .  .  R  .  .  .  .  .  .  .  .  .  V  .  .  .  .  .  .  R  .  .
 * y=1          .  .  .  .  V  .  .  .  .  .  .  .  .  .  .  S  .  .  .  .  .  .
 * y=2          .  .  .  .  .  .  .  S  .  .  R  .  .  .  .  .  .  .  V  .  .  .
 * y=3          .  .  .  .  .  .  .  S  .  .  R  .  .  .  .  .  .  .  V  .  .  .
 * y=4          .  .  .  .  V  .  .  .  .  .  .  .  .  .  .  S  .  .  .  .  .  .
 * y=5          .  .  R  .  .  .  .  .  .  .  .  .  V  .  .  .  .  .  .  R  .  .
 *
 * V 星涡结晶（不可通行 / 65% / 无耐久：不可摧毁）
 * S 星碎柱（不可通行 / 50% / 耐久 75）
 * R 现实边缘（不可通行 / 40% / 无耐久）
 */
export const VOID_PORTAL_COVERS: Record<string, Cover> = {
    vortex_crystal: {
        id: 'vortex_crystal',
        name: '星涡结晶',
        desc: '旋转星空凝结成的棱柱，内部有无数版本的你在注视。不可摧毁。',
        coverRate: 0.65,
    },
    star_fragment_pillar: {
        id: 'star_fragment_pillar',
        name: '星碎柱',
        desc: '从裂隙边缘剥落的星辰碎片堆叠成的柱体，散发着刺骨寒意。',
        coverRate: 0.5,
        hp: 75,
    },
    reality_edge: {
        id: 'reality_edge',
        name: '现实边缘',
        desc: '房间边缘的现实薄膜，此处没有墙壁，只有旋转的星空。站在边缘能感受到无数个版本的自己的注视。',
        coverRate: 0.4,
    },
};

/**
 * 烛火书斋 · 虚空裂隙战场地图
 *
 * 交火结构（自后向前）：
 * 后区 x=-10~-9：完全开阔，脚下即是虚空。
 *
 * 现实边缘带 x=-8~9：六处现实边缘 R 散布于南北两缘，
 * 40% 掩体不可摧毁，标记着战场的物理边界。
 *
 * 星涡结晶带 x=-6~8：六颗星涡结晶 V 以对称分布占据战场核心，
 * 65% 掩体不可摧毁，是全图最硬的遮蔽网络。
 *
 * 星碎柱带 x=-3~5：四根星碎柱 S 在中央四轨，50% 掩体，耐久 75。
 *
 * 中央现实裂隙 x=0：现实边缘 R 在 (0,2)/(0,3)，
 * 把中央轨切成两段，迫使近战单位绕行。
 *
 * 部署参考：我方锚点 x=0（中央有现实边缘，南北有星涡结晶遮蔽）；
 * 敌方部署带 x=6~11，最小距离 6。
 *
 * 连通校验：南北两轨全程贯通；中央轨被现实边缘与星涡结晶分段但可绕行，无孤立格。
 */
export const ARCHIVE_VOID_PORTAL_MAP: BattleMap = {
    desc: '没有墙壁的房间，只有旋转的星空。星光扭曲形成色彩斑斓的漩涡，每一个漩涡都通向不同的世界。无数个版本的你在注视。',
    depthRange: [-10, 11],
    laneCount: 6,
    covers: [
        // —— 星涡结晶（不可摧毁）：对称分布 ——
        ['vortex_crystal', -6, 1],
        ['vortex_crystal', -6, 4],
        ['vortex_crystal', 2, 0],
        ['vortex_crystal', 2, 5],
        ['vortex_crystal', 8, 2],
        ['vortex_crystal', 8, 3],
        // —— 星碎柱：中央四轨 ——
        ['star_fragment_pillar', -3, 2],
        ['star_fragment_pillar', -3, 3],
        ['star_fragment_pillar', 5, 1],
        ['star_fragment_pillar', 5, 4],
        // —— 现实边缘：南北两缘与中央裂隙 ——
        ['reality_edge', -8, 0],
        ['reality_edge', -8, 5],
        ['reality_edge', 0, 2],
        ['reality_edge', 0, 3],
        ['reality_edge', 9, 0],
        ['reality_edge', 9, 5],
    ],
    modifiers: {
        // 虚空：一切法则崩塌
        accuracyBonus: -0.15,
        weaponTypeModifier: {
            // 虚空能量极大增幅法术
            magic: { damageMultiplier: 1.35 },
            // 物理攻击在虚空中衰减
            wave: { damageMultiplier: 0.8 },
            both_wave: { damageMultiplier: 0.8 },
            prick: { damageMultiplier: 0.85 },
            both_prick: { damageMultiplier: 0.85 },
            // 远程在虚空中弹道不稳定
            sniper_rifle: { accuracyDelta: -0.1 },
            assault_rifle: { accuracyDelta: -0.08 },
            smg: { accuracyDelta: -0.08 },
            crossbow: { accuracyDelta: -0.1 },
            bow: { accuracyDelta: -0.1 },
        },
    },
};

// ─────────────────────────────────────────────────────────────
// paradox_room · 悖论之间 (threat 14)
// 最大型，6 轨，非欧空间
// ─────────────────────────────────────────────────────────────

/**
 * 空间拓扑（depthRange [-11, 12] × 6 轨，y=0 为北缘、y=5 为南缘）：
 * 违反欧几里得几何的房间，内部比外部大。折叠多面体在中央，
 * 倒置地板与几何异常点散布。空间逻辑完全失效。
 *
 *           -11-10 -9 -8 -7 -6 -5 -4 -3 -2 -1  0  1  2  3  4  5  6  7  8  9  10 11 12
 * y=0          .  .  .  .  I  .  .  .  .  .  .  .  .  .  G  .  .  .  .  I  .  G  .  .
 * y=1          .  .  .  .  .  .  .  .  I  .  .  .  .  .  .  G  .  .  .  .  I  .  .  .
 * y=2          .  .  .  .  .  .  G  .  .  .  .  P  P  .  .  .  .  G  .  .  .  .  .  .
 * y=3          .  .  .  .  .  .  G  .  .  .  .  P  P  .  .  .  .  G  .  .  .  .  .  .
 * y=4          .  .  .  .  .  .  .  .  I  .  .  .  .  .  .  G  .  .  .  .  I  .  .  .
 * y=5          .  .  .  .  I  .  .  .  .  .  .  .  .  .  G  .  .  .  .  I  .  G  .  .
 *
 * P 折叠多面体（不可通行 / 70% / 无耐久：不可摧毁）
 * I 倒置地板（不可通行 / 50% / 无耐久）
 * G 几何异常点（可跨过，移入额外 1 AP / 35% / 无耐久）
 */
export const PARADOX_ROOM_COVERS: Record<string, Cover> = {
    polytope_core: {
        id: 'polytope_core',
        name: '折叠多面体',
        desc: '房间中央不断折叠又展开的多面体，有的面是三角形，转过去后变成正方形。不可摧毁。',
        coverRate: 0.7,
    },
    inverted_floor: {
        id: 'inverted_floor',
        name: '倒置地板',
        desc: '同时是另一个方向地板的天花板碎片，你能看到自己倒立在上方。空间逻辑在此处失效。',
        coverRate: 0.5,
    },
    geometry_anomaly: {
        id: 'geometry_anomaly',
        name: '几何异常点',
        desc: '空间曲率突变的节点，周围的距离与角度不再遵循欧几里得法则。',
        coverRate: 0.35,
        passable: 1,
    },
};

/**
 * 烛火书斋 · 悖论之间战场地图
 *
 * 交火结构（自后向前）：
 * 后区 x=-11~-8：完全开阔，空间在此处尚且遵循三维逻辑。
 *
 * 倒置地板带 x=-7~8：八块倒置地板 I 以南北对称排列于边缘两轨，
 * 50% 掩体不可摧毁，构成战场的外围骨架。
 *
 * 几何异常点带 x=-5~10：八处几何异常点 G 散布于中央四轨，
 * 35% 掩体可跨过，但空间曲率突变使距离判定失效。
 *
 * 折叠多面体核心 x=0~1：多面体 P 占据中央两轨的四个格位，
 * 70% 掩体不可摧毁，是全图最硬的单点，也是战术核心。
 * 多面体把中央轨完全阻断，迫使所有单位绕行。
 *
 * 部署参考：我方锚点 x=0（多面体在正前方，南北轨有倒置地板遮蔽）；
 * 敌方部署带 x=7~12，最小距离 7。
 * 全局移动消耗 +1（非欧空间扭曲步距）。
 *
 * 连通校验：南北两轨全程贯通；中央轨被多面体阻断但可经南北轨绕行，无孤立格。
 * 全图 24 格纵深 × 6 轨，是书斋中最大的战场。
 */
export const ARCHIVE_PARADOX_ROOM_MAP: BattleMap = {
    desc: '四面墙壁围成的空间比从外面看到的大得多。天花板同时是另一个方向的地板。房间中央漂浮着不断折叠又展开的多面体。',
    depthRange: [-11, 12],
    laneCount: 6,
    covers: [
        // —— 折叠多面体（不可摧毁，中央）：四格 ——
        ['polytope_core', 0, 2],
        ['polytope_core', 0, 3],
        ['polytope_core', 1, 2],
        ['polytope_core', 1, 3],
        // —— 倒置地板：南北对称 ——
        ['inverted_floor', -7, 0],
        ['inverted_floor', -7, 5],
        ['inverted_floor', -3, 1],
        ['inverted_floor', -3, 4],
        ['inverted_floor', 4, 0],
        ['inverted_floor', 4, 5],
        ['inverted_floor', 8, 1],
        ['inverted_floor', 8, 4],
        // —— 几何异常点：散布中央 ——
        ['geometry_anomaly', -5, 2],
        ['geometry_anomaly', -5, 3],
        ['geometry_anomaly', 3, 1],
        ['geometry_anomaly', 3, 4],
        ['geometry_anomaly', 6, 2],
        ['geometry_anomaly', 6, 3],
        ['geometry_anomaly', 10, 0],
        ['geometry_anomaly', 10, 5],
    ],
    modifiers: {
        // 非欧空间：一切判定混乱
        accuracyBonus: -0.2,
        moveCostDelta: 1,
        weaponTypeModifier: {
            // 悖论空间极度增幅法术
            magic: { damageMultiplier: 1.4 },
            // 物理法则失效，所有物理攻击大幅削弱
            wave: { damageMultiplier: 0.7, accuracyDelta: -0.1 },
            both_wave: { damageMultiplier: 0.7, accuracyDelta: -0.1 },
            prick: { damageMultiplier: 0.75, accuracyDelta: -0.05 },
            both_prick: { damageMultiplier: 0.75, accuracyDelta: -0.05 },
            // 远程弹道在非欧空间中弯曲
            sniper_rifle: { accuracyDelta: -0.2 },
            assault_rifle: { accuracyDelta: -0.15 },
            smg: { accuracyDelta: -0.15 },
            pistol: { accuracyDelta: -0.1 },
            shotgun: { accuracyDelta: -0.1 },
            sawed_off: { accuracyDelta: -0.1 },
            crossbow: { accuracyDelta: -0.15 },
            bow: { accuracyDelta: -0.15 },
            throw: { accuracyDelta: -0.2 },
        },
    },
};

// ═══════════════════════════════════════════════════════════
// 注册表
// ═══════════════════════════════════════════════════════════

/**
 * 烛火书斋战场地图注册表（nodeId -> BattleMap）。
 * 键名即节点键名，引擎在未显式声明 node.map 时按 zoneId + nodeId 自动寻址。
 *
 * 注：binding_chamber 已在上方的示范段落中定义，此处不重复注册。
 */
export const ARCHIVE_MAPS: Record<string, BattleMap> = {
    scriptorium: ARCHIVE_SCRIPTORIUM_MAP,
    translation_gallery: ARCHIVE_TRANSLATION_GALLERY_MAP,
    forbidden_wing: ARCHIVE_FORBIDDEN_WING_MAP,
    archive_vault: ARCHIVE_ARCHIVE_VAULT_MAP,
    alchemy_lab: ARCHIVE_ALCHEMY_LAB_MAP,
    ritual_circle: ARCHIVE_RITUAL_CIRCLE_MAP,
    ink_well: ARCHIVE_INK_WELL_MAP,
    observatory: ARCHIVE_OBSERVATORY_MAP,
    clock_tower: ARCHIVE_CLOCK_TOWER_MAP,
    celestial_map_room: ARCHIVE_CELESTIAL_MAP_ROOM_MAP,
    time_fracture: ARCHIVE_TIME_FRACTURE_MAP,
    abyss_corridor: ARCHIVE_ABYSS_CORRIDOR_MAP,
    mirror_library: ARCHIVE_MIRROR_LIBRARY_MAP,
    memory_theater: ARCHIVE_MEMORY_THEATER_MAP,
    paradox_room: ARCHIVE_PARADOX_ROOM_MAP,
    echo_gallery: ARCHIVE_ECHO_GALLERY_MAP,
    wilted_greenhouse: ARCHIVE_WILTED_GREENHOUSE_MAP,
    dream_study: ARCHIVE_DREAM_STUDY_MAP,
    hypnosis_chamber: ARCHIVE_HYPNOSIS_CHAMBER_MAP,
    void_portal: ARCHIVE_VOID_PORTAL_MAP,
};

/**
 * 烛火书斋掩体定义注册表（coverId -> Cover）。
 * 合并所有节点的掩体常数。
 */
export const ARCHIVE_COVERS: Record<string, Cover> = {
    // binding_chamber
    ...BINDING_CHAMBER_COVERS,
    // scriptorium
    ...SCRIPTORIUM_COVERS,
    // translation_gallery
    ...TRANSLATION_GALLERY_COVERS,
    // forbidden_wing
    ...FORBIDDEN_WING_COVERS,
    // archive_vault
    ...ARCHIVE_VAULT_COVERS,
    // alchemy_lab
    ...ALCHEMY_LAB_COVERS,
    // ritual_circle
    ...RITUAL_CIRCLE_COVERS,
    // ink_well
    ...INK_WELL_COVERS,
    // observatory
    ...OBSERVATORY_COVERS,
    // clock_tower
    ...CLOCK_TOWER_COVERS,
    // celestial_map_room
    ...CELESTIAL_MAP_ROOM_COVERS,
    // time_fracture
    ...TIME_FRACTURE_COVERS,
    // abyss_corridor
    ...ABYSS_CORRIDOR_COVERS,
    // mirror_library
    ...MIRROR_LIBRARY_COVERS,
    // memory_theater
    ...MEMORY_THEATER_COVERS,
    // paradox_room
    ...PARADOX_ROOM_COVERS,
    // echo_gallery
    ...ECHO_GALLERY_COVERS,
    // wilted_greenhouse
    ...WILTED_GREENHOUSE_COVERS,
    // dream_study
    ...DREAM_STUDY_COVERS,
    // hypnosis_chamber
    ...HYPNOSIS_CHAMBER_COVERS,
    // void_portal
    ...VOID_PORTAL_COVERS,
};