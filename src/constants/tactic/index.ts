import type { Tactic } from '../../meta';
import { publicAttackTactics } from './attack';
import { publicDefenseTactics } from './defense';

export { publicAttackTactics, publicDefenseTactics };

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