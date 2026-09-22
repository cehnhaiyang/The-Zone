import type { BattleMap, Cover } from '../../meta';

/**
 * 铁锈前哨 · 全域战场地图集
 *
 * 区域定位与威胁曲线：
 * 地表外层 1~6 → 工程区 5~7 → 深层掩体 7~11 + 脚本 Boss。
 *
 * 战场坐标系：depthRange [minX, maxX] × laneCount 轨。
 * 我方部署锚点统一设在 x=0 附近，敌方部署带位于深层远端。
 * 遵循严整的军工掩体体系与克苏鲁异化风格。
 */

// ─────────────────────────────────────────────────────────────
// patient_zero_containment · 零号收容单元 (threat 11 / Boss 战)
// ─────────────────────────────────────────────────────────────

/**
 * 铁锈前哨 · 零号收容单元（patient_zero_containment）
 *
 * 定位：深层掩体的禁忌核心、代号「铁壁」生化实验的最终封印与奇点爆发地。
 * 对应剧情：托马斯神父委托调查的「最初接触记录」所在地，驻守终极克苏鲁首领「零号回声」
 * （patient_zero_echo：range 8 / speed 48 / damage 62 / defense 38 / evasion 40）。
 *
 * 空间拓扑（depthRange [-9, 10] × 5 轨，y=0 为北侧重铅观测壁、y=4 为南侧重水泄流壁）：
 * 挑空的超重型反应大厅。中央由原本悬吊、后被高维力量自内向外暴力撕裂的 30cm 厚钛合金球体主导。
 * 外翻装甲板与下坠的工业悬吊臂在南北管廊交错，四周地面烙印着同心圆高能射线灼痕熔沟。
 *
 *                  -9 -8 -7 -6 -5 -4 -3 -2 -1  0  1  2  3  4  5  6  7  8  9 10
 * y=0 北壁辐射观测台   .  .  L  .  .  .  .  T  .  .  .  .  L  .  .  .  T  .  .  .
 * y=1 北侧液压管廊     .  .  .  .  K  .  .  .  .  .  R  .  .  .  K  .  .  .  .  .
 * y=2 中央重力收容轴   .  .  .  .  .  .  L  .  .  .  .  .  .  T  .  .  C  C  .  .
 * y=3 南侧液压管廊     .  .  .  .  K  .  .  .  .  .  R  .  .  .  K  .  .  .  .  .
 * y=4 南壁辐射观测台   .  .  L  .  .  .  .  T  .  .  .  .  L  .  .  .  T  .  .  .
 *
 * C 撕裂的零号球核（不可通行 / 80% / 无耐久：中央尽端重力异变奇点，绝对阻断）
 * T 外翻钛装甲片（不可通行 / 65% / 耐久 120：暴力撕裂的 30cm 抗爆合金板）
 * L 铅化防辐射控制台（不可通行 / 45% / 耐久 60：战术观测操作台）
 * K 坠落悬吊桁架（可跨过，移入额外 1 AP / 30% / 无耐久：交错落地的工字钢臂）
 * R 辐射灼痕残沟（可跨过，移入额外 1 AP / 20% / 无耐久：同心圆高热熔沟）
 */
export const PATIENT_ZERO_CONTAINMENT_COVERS: Record<string, Cover> = {
    torn_titanium_plating: {
        id: 'torn_titanium_plating',
        name: '外翻钛装甲片',
        desc: '从三十厘米厚收容球体上被高维存在暴力撕开向外卷曲的钛合金板，断口呈锋利的犬齿状。厚度能彻底偏折重火药直射弹道，但撕裂处的孔隙仍可供伏地窥探射击。',
        coverRate: 0.65,
        hp: 120,
    },
    lead_shield_console: {
        id: 'lead_shield_console',
        name: '铅化防辐射控制台',
        desc: '深层实验室的液压联锁控制操作台，台体浇筑重铅层以屏蔽球心高能射线。防爆荧幕虽已震裂，厚实的铅化台身仍是人员伏低射击的标准据点。',
        coverRate: 0.45,
        hp: 60,
    },
    fallen_suspension_truss: {
        id: 'fallen_suspension_truss',
        name: '坠落悬吊桁架',
        desc: '原用于在穹顶锁死收容球体的重工业高碳钢悬臂，坠地砸弯后横跨在地面上。可以翻身跨过，交错的钢梁与油压管道对枪线形成半遮掩的过滤网。',
        coverRate: 0.3,
        /* 可跨过：移入额外消耗 1 点行动点。 */
        passable: 1,
    },
    ruptured_sphere_core: {
        id: 'ruptured_sphere_core',
        name: '撕裂的零号球核',
        desc: '深层掩体中轴尽头悬垂的球体核心残躯。外壳爆裂翻卷，中心区域已坍缩为一个不断溢散灼热青蓝辐射与低频嗡鸣的重力异变空洞，不可摧毁且吞噬一切直射火力。',
        coverRate: 0.8,
    },
    radiation_scorch_trench: {
        id: 'radiation_scorch_trench',
        name: '辐射灼痕残沟',
        desc: '零号破体瞬间的高能射线将防爆地砖汽化熔蚀出的放射状环形残沟。沟沿玻化反光，伏低身姿可避开高位流弹，但灼热余温阻滞机动。',
        coverRate: 0.2,
        /* 可跨过：移入额外消耗 1 点行动点。 */
        passable: 1,
    },
};

/**
 * 铁锈前哨 · 零号收容单元战场地图
 *
 * 交火结构（自后向前）：
 * 后区 x=-9~-3：入口防爆气闸向内延伸的后退缓冲区。两翼在 x=-7 留有控制台 L，
 * 液压管廊在 x=-5 横跨悬吊桁架 K，中轴在 x=-3 构筑控制台 L，为我方撤退重整提供两道梯次依托。
 *
 * 锚点线 x=0：五轨全空，我方标准部署列；两翼身后的外翻钛装甲片 T(-2,0)/T(-2,4)
 * 为开局侧翼提供 65% 高抗爆庇护，保证换轨与走位安全。
 *
 * 中前沿交火区 x=1~5：辐射灼痕沟 R(1,1)/R(1,3) 横在前进线上；
 * 中央收容中轴在 x=4 处立有一堵外翻钛装甲板 T(4,2)，直接切断敌我正面对射射界，
 * 迫使火力向南北两翼走廊分流；控制台 L(3,0)/L(3,4) 与悬臂 K(5,1)/K(5,3) 形成前出掩护口袋。
 *
 * 敌阵核心 x=6~10：Boss「零号回声」部署带位于 x=6~10。
 * 与我方锚点线相距 6~8 格，正好卡在其极限射程（range 8）边缘，开局形成射程与步法的深度博弈；
 * 中央收容中轴由双格撕裂球核 C(7,2)/C(8,2) 封死，南北两翼各由钛装甲板 T(7,0)/T(7,4) 镇守。
 *
 * 连通校验：五轨无孤立格，南北管廊全程贯通；中央轴线仅阻断于球核与装甲片，
 * 可经南北管廊随时折返绕行，保证战术机动性。
 */
export const BUNKER_PATIENT_ZERO_CONTAINMENT_MAP: BattleMap = {
    desc: '挑空的深层防爆反应大厅，浓重的臭氧与铁锈味在空气中胶着。半空中悬吊着被从内部暴力撕裂的巨大钛合金球体，断口翻卷如巨兽巨口，青蓝色的重力畸变光晕在破口处低沉闪烁；地面上辐射烙印沿同心圆向外扩散，坠落的高碳钢桁架与外翻装甲板将大厅割裂为危机四伏的交火阵地。',
    depthRange: [-9, 10],
    laneCount: 5,
    covers: [
        // —— 撕裂的零号球核（不可摧毁）：深层中轴核心奇点 ——
        ['ruptured_sphere_core', 7, 2],
        ['ruptured_sphere_core', 8, 2],
        // —— 外翻钛装甲片（高耐久防爆合金板）：南北侧护与正面断射屏障 ——
        ['torn_titanium_plating', -2, 0],
        ['torn_titanium_plating', -2, 4],
        ['torn_titanium_plating', 4, 2],
        ['torn_titanium_plating', 7, 0],
        ['torn_titanium_plating', 7, 4],
        // —— 铅化防辐射控制台（坚实半身掩体）：两翼观测台与中轴战术支点 ——
        ['lead_shield_console', -7, 0],
        ['lead_shield_console', -7, 4],
        ['lead_shield_console', -3, 2],
        ['lead_shield_console', 3, 0],
        ['lead_shield_console', 3, 4],
        // —— 坠落悬吊桁架（可跨过障碍）：南北管廊交错落钢 ——
        ['fallen_suspension_truss', -5, 1],
        ['fallen_suspension_truss', -5, 3],
        ['fallen_suspension_truss', 5, 1],
        ['fallen_suspension_truss', 5, 3],
        // —— 辐射灼痕残沟（可跨过低矮掩护）：前沿环形熔蚀凹陷 ——
        ['radiation_scorch_trench', 1, 1],
        ['radiation_scorch_trench', 1, 3],
    ],
    modifiers: {
        // 重力透镜与空气高频电离导致光线微偏，基准命中微降
        accuracyBonus: -0.05,
        weaponTypeModifier: {
            // 狭窄防爆室内，霰弹枪与突击步枪产生高压冲击震波与二次破片：伤害 +10%
            shotgun: { damageMultiplier: 1.1 },
            sawed_off: { damageMultiplier: 1.12 },
            assault_rifle: { damageMultiplier: 1.08 },
            // 破损管廊与翻卷装甲缝隙极利于穿刺直击弱点：伤害 +12%
            prick: { damageMultiplier: 1.12 },
            both_prick: { damageMultiplier: 1.12 },
            // 空间内散落钢梁管道交错，宽幅劈砍大开大合动作受阻：伤害 -10%、命中 -5%
            wave: { damageMultiplier: 0.9, accuracyDelta: -0.05 },
            both_wave: { damageMultiplier: 0.9, accuracyDelta: -0.05 },
            // 靠近深渊实验奇点，虚空神经共振异常强烈：神秘学伤害 +15%
            magic: { damageMultiplier: 1.15 },
            // 厚重装甲遮挡与光线扭曲对超远距狙击视野造成干扰：命中 -8%
            sniper_rifle: { accuracyDelta: -0.08 },
        },
    },
};

// ═══════════════════════════════════════════════════════════
// 注册表
// ═══════════════════════════════════════════════════════════

/**
 * 铁锈前哨战场地图注册表（nodeId -> BattleMap）。
 * 键名与 bunker.ts 节点键名精确对齐，引擎按 zoneId + nodeId 自动寻址。
 */
export const BUNKER_MAPS: Record<string, BattleMap> = {
    patient_zero_containment: BUNKER_PATIENT_ZERO_CONTAINMENT_MAP,
};

/**
 * 铁锈前哨掩体定义注册表（coverId -> Cover）。
 * 合并全区节点的掩体定义。
 */
export const BUNKER_COVERS: Record<string, Cover> = {
    ...PATIENT_ZERO_CONTAINMENT_COVERS,
};

