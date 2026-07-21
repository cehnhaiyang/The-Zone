
import { useCallback } from 'react';
import { GameState } from '../../types';
import { GameAudio } from '../../services/GameAudioService';
import { SequenceModifiers } from './useSequence';
import { CONSTANTS, getEffectDef, refreshSequences, checkGameEnd, processTurnEffects } from './gameUtils';

export const useEnemyTurn = (
    setGameState: React.Dispatch<React.SetStateAction<GameState | null>>,
    generateSequence: (profileId: string, target: 'player' | 'enemy', modifiers?: SequenceModifiers, overrideLength?: number) => string[]
) => {
    const executeEnemyTurn = useCallback(() => {
        setGameState(prev => {
            if (!prev || prev.gameOver) return prev;
            if (prev.player.health <= 0 || prev.enemy.health <= 0) return prev;

            const newState: GameState = { ...prev, phase: 'enemy-turn' };
            let enemy = { ...newState.enemy };
            let player = { ...newState.player };
            const logs = [...newState.battleLog];

            // 1. 结算 Player 的周期性效果
            processTurnEffects(player, logs);
            if (player.health <= 0) {
                newState.player = player;
                newState.battleLog = logs;
                newState.gameOver = true;
                newState.winner = 'enemy';
                GameAudio.playLose();
                return newState;
            }

            // 2. 更新 Player Buff 持续时间
            const nextStatusEffects = player.statusEffects
                .map(e => ({ ...e, duration: e.duration - 1 }))
                .filter(e => e.duration > 0);
            
            // Check if any buff expired
            const hasExpired = nextStatusEffects.length !== player.statusEffects.length;
            
            if (hasExpired) {
                const expired = player.statusEffects.filter(e => e.duration === 1); 
                expired.forEach(e => logs.push({ message: `状态 [${getEffectDef(e.id)?.name || e.id}] 已结束`, type: 'system', timestamp: Date.now() }));
                player.statusEffects = nextStatusEffects;
                
                // Refill deck completely on buff expiration
                logs.push({ message: `状态变化：牌库已刷新并填充`, type: 'system', timestamp: Date.now() });
                const tempPlayer = refreshSequences(player, generateSequence);
                // Assign FULL sequences (Refill)
                player.sequences.offensive = tempPlayer.sequences.offensive;
                player.sequences.defensive = tempPlayer.sequences.defensive;
                player.sequences.critical = tempPlayer.sequences.critical;
            } else {
                player.statusEffects = nextStatusEffects;
            }

            // 3. 敌人 AI 决策
            const actionSeq = enemy.sequences.action!;
            const actionType = actionSeq[enemy.actionProgress || 0];
            enemy.actionProgress = ((enemy.actionProgress || 0) + 1) % actionSeq.length;

            if (enemy.actionProgress === 0) {
                enemy.sequences.action = generateSequence(enemy.sequenceProfiles.action!, 'enemy', undefined, enemy.deckSize);
            }

            // 4. 执行行动
            if (actionType === 'attack' || actionType === 'skill') {
                let damage = actionType === 'skill' ? CONSTANTS.SKILL_DAMAGE_BASE : 10;

                const critSeq = enemy.sequences.critical!;
                const critType = critSeq[enemy.criticalProgress];
                enemy.criticalProgress = (enemy.criticalProgress + 1) % critSeq.length;
                
                if (critType === 'critical') {
                    damage = Math.floor(damage * CONSTANTS.CRIT_MULTIPLIER);
                    logs.push({ message: `敌人发动了暴击！`, type: 'system', timestamp: Date.now() });
                }

                if (player.defenseState) {
                    if (player.defenseState.type === 'dodge') {
                        damage = 0;
                        logs.push({ message: `你完美闪避了敌人的攻击！`, type: 'miss', timestamp: Date.now() });
                        GameAudio.playDodge();
                    } else if (player.defenseState.type === 'block') {
                        damage = Math.floor(damage * (1 - player.defenseState.damageReduction));
                        logs.push({ 
                            message: `你格挡了攻击(减免${Math.round(player.defenseState.damageReduction * 100)}%)，受到 ${damage} 点伤害`, 
                            type: 'damage', 
                            timestamp: Date.now() 
                        });
                        GameAudio.playBlock();
                    } else {
                        logs.push({ message: `防御失败，受到 ${damage} 点伤害`, type: 'damage', timestamp: Date.now() });
                        GameAudio.playHit(critType === 'critical');
                    }
                    player.defenseState = null;
                } else {
                    logs.push({ message: `你直接受到 ${damage} 点伤害`, type: 'damage', timestamp: Date.now() });
                    GameAudio.playHit(critType === 'critical');
                }
                
                player.health = Math.max(0, player.health - damage);

            } else if (actionType === 'defend') {
                const heal = CONSTANTS.DEFEND_HEAL;
                enemy.health = Math.min(enemy.maxHealth, enemy.health + heal);
                logs.push({ message: `敌人调整姿态，恢复 ${heal} 点生命`, type: 'heal', timestamp: Date.now() });
                GameAudio.playBuff();
            }

            // 5. 状态更新与回合结束判定
            newState.player = player;
            newState.enemy = enemy;
            newState.battleLog = logs;
            
            if (player.health <= 0) {
                newState.gameOver = true;
                newState.winner = 'enemy';
                newState.battleLog.push({ message: '战斗失败', type: 'system', timestamp: Date.now() });
                GameAudio.playLose();
            } else if (enemy.health <= 0) {
                newState.gameOver = true;
                newState.winner = 'player';
                newState.battleLog.push({ message: '战斗胜利！', type: 'system', timestamp: Date.now() });
                GameAudio.playWin();
            } else {
                newState.turn += 1;
                newState.phase = 'player-choice';
            }

            return newState;
        });
    }, [generateSequence, setGameState]);

    return { executeEnemyTurn };
};
