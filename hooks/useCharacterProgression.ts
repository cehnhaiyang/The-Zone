import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { PlayerState, LogType, AttributeType, Entity, NpcTemplate, NpcDynamicState } from '../meta';
import { AudioService } from '../services';

export interface UseCharacterProgressionParams {
    player: PlayerState;
    setPlayer: Dispatch<SetStateAction<PlayerState>>;
    addLog: (text: string, type: LogType) => void;
}

export interface UseCharacterProgressionReturn {
    levelUp: (targetId: string, attr: AttributeType) => void;
    gainExperience: (amount: number) => void;
}

export const useCharacterProgression = ({
    setPlayer,
    addLog
}: UseCharacterProgressionParams): UseCharacterProgressionReturn => {

    const levelUp = useCallback((targetId: string, attr: AttributeType) => {
        setPlayer((prev: PlayerState) => {
            const isPlayer = targetId === 'player' || targetId === prev.static.id;
            let currentLevel = 1;

            // 识别目标实体并提取运行时等级
            if (isPlayer) {
                currentLevel = prev.dynamic.level;
            } else {
                const comp = prev.companions.find((c: Entity<NpcTemplate, NpcDynamicState>) => c.static.id === targetId);
                if (!comp) return prev;
                currentLevel = comp.dynamic.level;
            }

            const cost = currentLevel * 100;

            // 经验值统一从玩家的动态状态中扣除
            if (prev.dynamic.xp < cost) {
                addLog(`经验不足，需要 ${cost} XP。`, 'warning');
                AudioService.playSfx('error');
                return prev;
            }

            const nextPlayerDynamic = {
                ...prev.dynamic,
                xp: prev.dynamic.xp - cost
            };

            // 玩家升级逻辑：直接作用于 dynamic 的扁平化属性与体征上限
            if (isPlayer) {
                const nextLevel = currentLevel + 1;
                const nextMaxHp = prev.dynamic.maxHp + 5;
                const nextMaxSanity = prev.dynamic.maxSanity + 3;

                return {
                    ...prev,
                    dynamic: {
                        ...nextPlayerDynamic,
                        level: nextLevel,
                        [attr]: prev.dynamic[attr] + 1,
                        maxHp: nextMaxHp,
                        maxSanity: nextMaxSanity,
                        hp: nextMaxHp,
                        sanity: nextMaxSanity
                    }
                };
            }

            // 同伴升级逻辑：维持伴随关系的深层复制防劣化
            const nextCompanions = prev.companions.map((c: Entity<NpcTemplate, NpcDynamicState>) => {
                if (c.static.id !== targetId) return c;

                const nextLevel = c.dynamic.level + 1;
                const nextMaxHp = c.dynamic.maxHp + 5;
                const nextMaxSanity = c.dynamic.maxSanity + 3;

                return {
                    ...c,
                    dynamic: {
                        ...c.dynamic,
                        level: nextLevel,
                        [attr]: c.dynamic[attr] + 1,
                        maxHp: nextMaxHp,
                        maxSanity: nextMaxSanity,
                        hp: nextMaxHp,
                        sanity: nextMaxSanity
                    }
                };
            });

            return {
                ...prev,
                dynamic: nextPlayerDynamic,
                companions: nextCompanions
            };
        });
    }, [addLog, setPlayer]);

    const gainExperience = useCallback((amount: number) => {
        setPlayer((prev: PlayerState) => ({
            ...prev,
            dynamic: {
                ...prev.dynamic,
                xp: prev.dynamic.xp + amount
            }
        }));
    }, [setPlayer]);

    return {
        levelUp,
        gainExperience
    };
};