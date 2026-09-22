/**
 * weapon.ts
 * 武器专属战术
 *
 * 契约：`WeaponOwnTactic`，通过 `weaponOwn` 直接绑定到武器类型上，
 * 由装备该类型武器的实体在战斗中自动持有，不参与公共战术池抽取。
 *
 * 设计基准：
 * - 每类武器至少持有一条攻击战术（'A'）。
 * - 枪械类统一命名为「开火」，AP：手枪 / 短管霰弹枪 1；冲锋枪 / 霰弹枪 2；突击步枪 / 狙击步枪 3。
 * - 近战单手 1 AP，双手 2 AP；弓 / 弩 2 AP；法术 1 AP。
 * - 盾牌额外提供防御战术（'D'）；弩提供装填战术；狙击与法术提供辅助战术。
 * - 效果优先使用可直接参与战斗结算的键：`damage`、`speed`、`awareness`、`will`。
 *
 * @version 2.0.0
 */
import type { Target, TacticEffectType, WeaponOwnTactic, WeaponType } from '../../meta'

type TacticEffect = Array<[Target, TacticEffectType, number, number]>

const make = (
    type: WeaponOwnTactic['type'],
    weaponOwn: WeaponType,
    id: string,
    name: string,
    desc: string,
    apCost: number,
    tacticEffect?: TacticEffect,
): WeaponOwnTactic => ({
    type,
    weaponOwn,
    id: `weapon_${weaponOwn}_${id}`,
    name,
    desc,
    apCost,
    ...(tacticEffect ? { tacticEffect } : {}),
})

const atk = (
    weaponOwn: WeaponType,
    id: string,
    name: string,
    desc: string,
    apCost: number,
    tacticEffect?: TacticEffect,
): WeaponOwnTactic => make('A', weaponOwn, id, name, desc, apCost, tacticEffect)

const def = (
    weaponOwn: WeaponType,
    id: string,
    name: string,
    desc: string,
    apCost: number,
    tacticEffect?: TacticEffect,
): WeaponOwnTactic => make('D', weaponOwn, id, name, desc, apCost, tacticEffect)

const util = (
    weaponOwn: WeaponType,
    id: string,
    name: string,
    desc: string,
    apCost: number,
    tacticEffect?: TacticEffect,
): WeaponOwnTactic => make('U', weaponOwn, id, name, desc, apCost, tacticEffect)

const fire = (
    weaponOwn: WeaponType,
    apCost: number,
    desc: string,
    tacticEffect?: TacticEffect,
): WeaponOwnTactic => atk(weaponOwn, 'fire', '开火', desc, apCost, tacticEffect)

export const weaponOwnTactics: WeaponOwnTactic[] = [
    // --------------------------------------------------------------------------
    // 近战：挥动 / 双手挥动
    // --------------------------------------------------------------------------
    atk('wave', 'slash', '挥击', '以挥动类武器横扫目标，借势扩大近身杀伤。', 1),
    atk('both_wave', 'cleave', '巨弧挥斩', '双手划出大弧度重斩，以重量压制正面。', 2),

    // --------------------------------------------------------------------------
    // 近战：刺击 / 双手刺击
    // --------------------------------------------------------------------------
    atk('prick', 'thrust', '突刺', '收束力量刺向缝隙，提高命中与暴击窗口。', 1),
    atk('both_prick', 'lunge', '双手贯突', '双手贯穿突刺，牺牲机动换取弱点锁定。', 2),

    // --------------------------------------------------------------------------
    // 盾牌
    // --------------------------------------------------------------------------
    atk('shield', 'bash', '盾击', '以盾面撞击目标，打乱其行动节奏。', 1, [
        ['single_enemy', 'speed', -1, 1],
    ]),
    def('shield', 'guard', '举盾', '以盾牌护住要害，进入防御序列。', 1),

    atk('both_shield', 'bulwark_ram', '盾墙冲撞', '双手举盾整体冲撞，强行撕开敌方架势。', 2, [
        ['single_enemy', 'speed', -2, 1],
    ]),
    def('both_shield', 'wall', '盾墙', '以重盾构成正面屏障，进入防御序列。', 2),

    // --------------------------------------------------------------------------
    // 投掷 / 弓 / 弩
    // --------------------------------------------------------------------------
    atk('throw', 'hurl', '投掷', '将投掷物抛出，干扰目标行动。', 1, [
        ['single_enemy', 'speed', -1, 1],
    ]),
    atk('bow', 'loose', '射击', '张弓搭箭完成一次静音射击。', 2),

    atk('crossbow', 'bolt', '弩击', '以器械张力发射弩矢，弹道平直易瞄准。', 2, [
        ['self', 'awareness', 1, 0],
    ]),
    util('crossbow', 'rearm', '装填', '为弩具重新上弦；装填完成前无法再次发射。', 1),

    // --------------------------------------------------------------------------
    // 枪械
    // --------------------------------------------------------------------------
    fire('pistol', 1, '单手持枪完成一次短促点射。'),

    fire('smg', 2, '以冲锋枪扫射，压制敌方火力输出。', [
        ['all_enemies', 'damage', -1, 1],
    ]),

    fire('assault_rifle', 3, '以突击步枪长点射压制全场敌人。', [
        ['all_enemies', 'damage', -2, 1],
    ]),

    fire('shotgun', 2, '在近距离释放霰弹弹幕，冲击目标行动节奏。', [
        ['single_enemy', 'speed', -1, 1],
    ]),

    fire('sawed_off', 1, '以短管霰弹枪贴身轰击，强行制造破绽。', [
        ['single_enemy', 'speed', -1, 1],
    ]),

    fire('sniper_rifle', 3, '以狙击步枪完成一次精算单发射击。'),
    util('sniper_rifle', 'steady_aim', '精确瞄准', '屏息校准弹道，提升下一次射击的命中判定质量。', 1, [
        ['self', 'awareness', 2, 1],
    ]),

    // --------------------------------------------------------------------------
    // 法术
    // --------------------------------------------------------------------------
    atk('magic', 'cast', '施法', '以法术武器引导一次能量投射。', 1),
    util('magic', 'channel', '引导', '短暂集中精神，提高下一次法术结算的意志投射。', 1, [
        ['self', 'will', 2, 1],
    ]),
]

/** 按武器类型筛选专属战术（同一武器类型可持有多条） */
export const getWeaponOwnTactics = (
    weaponTypes: ReadonlyArray<WeaponType>,
): WeaponOwnTactic[] => {
    const types = new Set(weaponTypes)
    return weaponOwnTactics.filter(t => types.has(t.weaponOwn))
}