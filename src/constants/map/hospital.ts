import type { Cover, BattleMap } from '../../meta';

/**
 * 消毒供应室 - 专属掩体常数定义
 */
export const STERILIZATION_ROOM_COVERS: Record<string, Cover> = {
    autoclave_bank: {
        id: 'autoclave_bank',
        name: '嵌入式高压灭菌机组',
        desc: '整排嵌进北墙的工业级灭菌锅，金属外壳厚重得能挡住步枪弹；观察窗后的灰白薄膜正贴着舱壁缓慢搏动，余温把整面墙烘得发烫。',
        coverRate: 0.7,
        hp: 120,
    },
    instrument_rack: {
        id: 'instrument_rack',
        name: '不锈钢器械推架',
        desc: '码着器械盘与托盘的推架，轮子还能转，可以推开一条缝挤过去；器械盘斜插在架面上，能挡住低姿的弹道。',
        coverRate: 0.35,
        /** 可推开一条缝挤过去：移入不额外消耗行动点。 */
        passable: 0,
        hp: 40,
    },
    disinfection_sink: {
        id: 'disinfection_sink',
        name: '浸泡池台基',
        desc: '清洗槽与浸泡池的水泥台基，齐腰高、不可翻越；槽内的液体早已不再是水，表面浮着一层随呼吸起伏的膜。',
        coverRate: 0.5,
        hp: 80,
    },
    packaging_stack: {
        id: 'packaging_stack',
        name: '待灭菌包裹堆垛',
        desc: '待灭菌的包裹被堆成半人高的垛，外层包布被渗出的黑色黏液浸透，标签上的红字还洇着——挡得住弹道，却挡不住里面缓慢的搏动。',
        coverRate: 0.45,
        hp: 30,
    },
    central_worktable: {
        id: 'central_worktable',
        name: '中央器械操作台',
        desc: '房间中线上的双层不锈钢操作台，器械盘与托盘被烘得干干净净地摆着；台体沉重不可推动，台面下沿的凝结水正缓慢滴落。',
        coverRate: 0.4,
        hp: 60,
    },
};

/**
 * 圣伊丽莎白纪念医院 - F2 消毒供应室战场地图
 *
 * 空间拓扑：五轨纵深长厅（纵深 [-8, 8] × 5 轨，y=0 为北、y=4 为南）。
 * 房间是南北两堵设备墙夹三条操作廊：北墙嵌满高压灭菌机组，南墙是浸泡池与清洗槽线，
 * 中间的中央台岛线把北、南两条操作廊切成互不直通的通道。
 *
 *                        -8 -7 -6 -5 -4 -3 -2 -1  0  1  2  3  4  5  6  7  8
 *   y=0 北墙灭菌机组列     A  A  A  .  .  A  A  .  .  .  A  .  .  A  A  .  .
 *   y=1 北操作廊           .  .  .  r  .  .  .  .  .  .  P  .  .  .  r  .  .
 *   y=2 中央台岛线         .  .  W  .  .  .  P  .  .  .  .  W  .  P  .  .  r
 *   y=3 南操作廊           .  .  .  .  .  .  .  r  .  .  .  .  .  .  P  r  .
 *   y=4 南墙浸泡池线       S  S  S  .  .  .  S  .  .  S  S  S  .  .  S  S  .
 *
 *   A 灭菌机组(不可通行/70%) · S 浸泡池台(不可通行/50%) · W 中央操作台(不可通行/40%)
 *   P 包裹堆垛(不可通行/45%) · r 器械推架(可通行/35%，射击线仍被架面拦截)
 *
 * 交火结构（自后向前）：
 * - 后区 x<-2：撤退走廊。北墙在 x=-5~-4 留出机组之间的检修口，被推架 r(-5,1) 掩住；
 *   南侧池台分两段，中段 -5~-3 是唯一能沿南墙后撤的通道。
 * - 锚点线 x=0：五轨全空，我方部署列；身后 -1 轨也尽量留空，便于开局换轨。
 * - 前沿口袋 x=1~3：北墙孤垒 A(2,0) 与其后的堆垛 P(2,1) 咬死北线，
 *   台岛 W(3,2) 再据此错开一格，南墙池台 S(1,4)~S(3,4) 封住南线；
 *   想推进只能沿北廊(y=1)、台岛两侧(y=2)或南廊(y=3)织成 Z 字换轨。
 * - 敌阵 x=5~7：北墙机组 A(5,0)+A(6,0) 与南墙池台 S(6,4)+S(7,4) 构成两翼硬点，
 *   堆垛 P(5,2) 与 P(6,3) 在正面交错咬合，把敌阵前沿切成三段射界；
 *   推架 r(6,1)、r(7,3)、r(8,2) 是穿过这些射界的三个落脚点（可通行、但射击线受阻）。
 *
 * 部署参考：我方锚点在纵深中线 x=0（五轨全空）；敌方部署带为 x=4~8（19 处可行格）。
 * 全图经连通校验：无孤立格、无整列封死，仅东南角 (8,4) 一处单格凹角。
 * 医疗主题武器联动：狭长通道与器械缝隙利于穿刺类武器，见 modifiers。
 */
export const HOSPITAL_STERILIZATION_ROOM_MAP: BattleMap = {
    desc: '南北两堵设备墙夹着三条纵深操作廊：北墙嵌满仍在余温中嗡鸣的高压灭菌机组，南墙是浸泡池与清洗槽的水泥台基线，中央的器械操作台把两条操作廊切成互不直通的通道；待灭菌的包裹被堆成垛，在室深三分之一处与推架交错咬合，把整间屋子割成一连串交火口袋，灭菌锅观察窗后的灰白薄膜正随着脚步搏动。',
    depthRange: [-8, 8],
    laneCount: 5,
    covers: [
        // —— 北墙 · 嵌入式灭菌机组列（y=0，重掩体墙，留检修口） ——
        ['autoclave_bank', -8, 0],
        ['autoclave_bank', -7, 0],
        ['autoclave_bank', -6, 0],
        ['autoclave_bank', -3, 0],
        ['autoclave_bank', -2, 0],
        ['autoclave_bank', 2, 0],
        ['autoclave_bank', 5, 0],
        ['autoclave_bank', 6, 0],
        // —— 南墙 · 浸泡池与清洗槽线（y=4，留中段与东段的通行缺口） ——
        ['disinfection_sink', -8, 4],
        ['disinfection_sink', -7, 4],
        ['disinfection_sink', -6, 4],
        ['disinfection_sink', -2, 4],
        ['disinfection_sink', 1, 4],
        ['disinfection_sink', 2, 4],
        ['disinfection_sink', 3, 4],
        ['disinfection_sink', 6, 4],
        ['disinfection_sink', 7, 4],
        // —— 北操作廊（y=1）：机组检修口的推架 + 前沿堆垛 + 敌阵北廊推架 ——
        ['instrument_rack', -5, 1],
        ['packaging_stack', 2, 1],
        ['instrument_rack', 6, 1],
        // —— 中央台岛线（y=2）：把南北两条操作廊隔开的三段台体与堆垛 ——
        ['central_worktable', -6, 2],
        ['packaging_stack', -2, 2],
        ['central_worktable', 3, 2],
        ['packaging_stack', 5, 2],
        ['instrument_rack', 8, 2],
        // —— 南操作廊（y=3）：清洗动线上的推架与敌阵前沿堆垛 ——
        ['instrument_rack', -1, 3],
        ['packaging_stack', 6, 3],
        ['instrument_rack', 7, 3],
    ],
    modifiers: {
        // 余热蒸汽与悬浮的薄膜碎屑干扰瞄准：全场命中整体下降
        accuracyBonus: -0.1,
        weaponTypeModifier: {
            // 操作廊两侧都是器械与台体，大开大合的挥砍施展不开：伤害 -15%、命中 -5%
            wave: { damageMultiplier: 0.85, accuracyDelta: -0.05 },
            both_wave: { damageMultiplier: 0.85, accuracyDelta: -0.05 },
            // 器械缝隙与池台间的窄通道，正好够一记直线刺击穿过去：伤害 +15%
            prick: { damageMultiplier: 1.15 },
            both_prick: { damageMultiplier: 1.15 },
            // 廊道内几乎没有回避空间，近距离火力密度被放大
            shotgun: { damageMultiplier: 1.1 },
            sawed_off: { damageMultiplier: 1.15 },
            // 蒸汽、悬吊管线与密集设备把长枪的视野切碎
            sniper_rifle: { accuracyDelta: -0.05 },
        },
    },
};

/**
 * 圣伊丽莎白纪念医院战场地图注册表（nodeId -> BattleMap）。
 */
export const HOSPITAL_MAPS: Record<string, BattleMap> = {
    sterilization_room: HOSPITAL_STERILIZATION_ROOM_MAP,
};

/**
 * 圣伊丽莎白纪念医院掩体定义注册表（coverId -> Cover）。
 */
export const HOSPITAL_COVERS: Record<string, Cover> = {
    ...STERILIZATION_ROOM_COVERS,
};
