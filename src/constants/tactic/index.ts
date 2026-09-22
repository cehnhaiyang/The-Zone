/**
 * 公共战术池
 *
 * 三类战术的归属边界：
 * - 公共攻击 / 防御战术：由角色后天习得（初始模板 uniqueTactic 或升级抽取），
 *   需要特定武器类型时通过 `requireWeapon` 声明；
 * - 武器专属战术：见 `./weapon`，由 `weaponOwn` 绑定到武器类型，
 *   随装备自动持有，不参与公共池抽取。
 */

import type { EquipState, Tactic, WeaponOwnTactic, WeaponType } from '../../meta';
import { normalizeEquipState } from '../../meta';
import { publicAttackTactics } from './attack';
import { publicDefenseTactics } from './defense';
import { getWeaponOwnTactics, weaponOwnTactics } from './weapon';

export { publicAttackTactics, publicDefenseTactics, weaponOwnTactics, getWeaponOwnTactics };

/** 公共战术池：攻击 + 防御全集。 */
export const PUBLIC_TACTIC_POOL: Tactic[] = [
    ...publicAttackTactics,
    ...publicDefenseTactics,
];

/**
 * 从公共战术池中随机抽取 N 个不重复的战术。
 * @param count  抽取数量
 * @param excludeIds  需要排除的战术 ID（例如角色已拥有的）
 */
export const pickRandomTactics = (
    count: number,
    excludeIds: string[] = [],
): Tactic[] => {
    const available = PUBLIC_TACTIC_POOL.filter(t => !excludeIds.includes(t.id));
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
};

/**
 * 已装备武器持有的专属战术（主手 + 副手）。
 *
 * 武器战术不写入角色持久化战术表：卸下武器即失去对应战术，
 * 装备才持有，避免出现"背着敌人的枪却会用它的专属战术"。
 */
export const getEquippedWeaponOwnTactics = (equipment: EquipState): WeaponOwnTactic[] => {
    const weapons = normalizeEquipState(equipment).weapons;
    const types = [weapons.main?.weaponType, weapons.side?.weaponType].filter(
        (type): type is WeaponType => Boolean(type),
    );
    return getWeaponOwnTactics(types);
};
