
import { useCallback, useRef } from 'react';
import { GameState, GameStatusEffect } from '../../types';
import { PERKS } from '../../constants/sequence';
import { GameAudio } from '../../services/GameAudioService';
import { SequenceModifiers, useSequence } from './useSequence';
import { CONSTANTS, getModifiers, refreshSequences } from './gameUtils';

export const usePlayerTurn = (
    setGameState: React.Dispatch<React.SetStateAction<GameState | null>>,
    generateSequence: (profileId: string, target: 'player' | 'enemy', modifiers?: SequenceModifiers, overrideLength?: number) => string[],
    executeEnemyTurn: () => void
) => {
    const { getDisplayText } = useSequence();
    const enemyTurnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const triggerEnemyTurn = () => {
        if (enemyTurnTimerRef.current) clearTimeout(enemyTurnTimerRef.current);
        enemyTurnTimerRef.current = setTimeout(() => {
            executeEnemyTurn();
        }, 1000);
    };

    const handleSequenceAction = useCallback((type: 'offensive' | 'defensive') => {
        GameAudio.playSelect();

        setGameState(prev => {
            if (!prev || prev.phase !== 'player-choice' || prev.gameOver) return prev;

            const newState = { ...prev, phase: 'resolution' as const };
            let player = { 
                ...newState.player,
                sequences: { 
                    ...newState.player.sequences, 
                    offensive: [...newState.player.sequences.offensive], 
                    defensive: [...newState.player.sequences.defensive],
                    critical: [...newState.player.sequences.critical] 
                }
            };
            const enemy = { ...newState.enemy };
            const logs = [...newState.battleLog];
            const mods = getModifiers(player.statusEffects, player.deckQuality);

            const offRaw = player.sequences.offensive.shift();
            const defRaw = player.sequences.defensive.shift();
            
            // 牌库耗尽检测与洗牌
            if (player.sequences.offensive.length === 0) {
                player.deckQuality = Math.max(0.25, player.deckQuality - 0.25);
                logs.push({ message: `⚠️ 牌库耗尽！洗牌后质量下降至 ${player.deckQuality * 100}%`, type: 'system', timestamp: Date.now() });
                GameAudio.playBuff();

                const newMods = getModifiers(player.statusEffects, player.deckQuality);

                player.sequences.offensive = generateSequence(player.sequenceProfiles.offensive!, 'player', newMods.offensive, player.deckSize);
                player.sequences.defensive = generateSequence(player.sequenceProfiles.defensive!, 'player', newMods.defensive, player.deckSize);
                player.sequences.critical = generateSequence(player.sequenceProfiles.critical!, 'player', newMods.critical, player.deckSize);
                player.criticalProgress = 0;
                logs.push({ message: `暴击序列已同步刷新`, type: 'system', timestamp: Date.now() });
            }

            if (type === 'offensive') {
                const rawString = offRaw || 'miss';
                const [resultType, valStr] = rawString.split(':');
                const valPct = valStr ? parseInt(valStr) : 0;
                
                if (resultType === 'miss') {
                    logs.push({ message: `攻击未命中！`, type: 'miss', timestamp: Date.now() });
                    GameAudio.playMiss();
                } else {
                    let damage = CONSTANTS.BASE_ATTACK_DAMAGE;
                    let multiplier = 1.0;

                    if (resultType === 'graze') {
                        multiplier = valPct / 100;
                        damage = Math.floor(damage * multiplier);
                    }

                    let isCrit = false;
                    if (resultType === 'hit') {
                        const critSeq = player.sequences.critical;
                        const critResult = critSeq[player.criticalProgress];
                        player.criticalProgress = (player.criticalProgress + 1) % critSeq.length;

                        if (critResult === 'critical') {
                            isCrit = true;
                        }
                    }

                    if (isCrit) {
                        damage = Math.floor(damage * CONSTANTS.CRIT_MULTIPLIER * mods.critDamageMultiplier);
                        logs.push({ message: `暴击！造成 ${damage} 点伤害`, type: 'damage', timestamp: Date.now() });
                        GameAudio.playCrit();
                    } else {
                        const hitTypeMsg = resultType === 'graze' ? `擦伤(${valPct}%)` : '命中';
                        logs.push({ message: `${hitTypeMsg}！造成 ${damage} 点伤害`, type: 'damage', timestamp: Date.now() });
                        GameAudio.playHit(false);
                    }
                    enemy.health = Math.max(0, enemy.health - damage);
                }
            } else if (type === 'defensive') {
                const rawString = defRaw || 'fail';
                const [resultType, valStr] = rawString.split(':');
                const valPct = valStr ? parseInt(valStr) : 0;
                
                let reduction = 0;
                
                if (resultType === 'block') {
                    reduction = valPct / 100;
                } else if (resultType === 'dodge') {
                    reduction = 1.0;
                }
                
                player.defenseState = { type: resultType || 'fail', damageReduction: reduction };
                
                let logMsg = `准备防御: ${getDisplayText(rawString, 'defensive')}`;
                logs.push({ message: logMsg, type: 'system', timestamp: Date.now() });
                
                if (resultType === 'fail') GameAudio.playMiss();
                else GameAudio.playSelect();
            }

            newState.player = player;
            newState.enemy = enemy;
            newState.battleLog = logs;
            return newState;
        });

        triggerEnemyTurn();

    }, [generateSequence, getDisplayText, executeEnemyTurn, setGameState]);

    const handleSkillAction = useCallback((perkId: string) => {
        setGameState(prev => {
            if (!prev || prev.phase !== 'player-choice' || prev.gameOver) return prev;

            const perk = PERKS[perkId];
            if (!perk) return prev;

            // --- Check Energy Cost ---
            if (prev.player.energy < perk.cost) {
                // Not enough energy
                return {
                    ...prev,
                    battleLog: [...prev.battleLog, { message: `精力不足！需要 ${perk.cost} 精力。`, type: 'system', timestamp: Date.now() }]
                };
            }

            GameAudio.playSkill();

            const newState = { ...prev, phase: 'resolution' as const };
            let player = { 
                ...newState.player, 
                statusEffects: [...newState.player.statusEffects],
                sequences: {
                    ...newState.player.sequences, 
                    offensive: [...newState.player.sequences.offensive], 
                    defensive: [...newState.player.sequences.defensive],
                    critical: [...newState.player.sequences.critical]
                }
            };
            let enemy = { ...newState.enemy };
            const logs = [...newState.battleLog];
            
            // Deduct Energy
            player.energy -= perk.cost;

            if (perk.advancesBothSequences) {
                player.sequences.offensive.shift();
                player.sequences.defensive.shift();
                
                if (player.sequences.offensive.length === 0) {
                    // Emergency refill if shift depleted it
                    player.deckQuality = Math.max(0.25, player.deckQuality - 0.25);
                    const newMods = getModifiers(player.statusEffects, player.deckQuality);
                    player.sequences.offensive = generateSequence(player.sequenceProfiles.offensive!, 'player', newMods.offensive, player.deckSize);
                    player.sequences.defensive = generateSequence(player.sequenceProfiles.defensive!, 'player', newMods.defensive, player.deckSize);
                    player.sequences.critical = generateSequence(player.sequenceProfiles.critical!, 'player', newMods.critical, player.deckSize);
                    player.criticalProgress = 0;
                    logs.push({ message: `行动序列已重置 (质量 ${player.deckQuality * 100}%)`, type: 'system', timestamp: Date.now() });
                }
            }

            let shouldRefillDeck = false;

            perk.effects.forEach(effect => {
                if (effect.type === 'apply_buff') {
                    const newBuff: GameStatusEffect = { id: effect.buffId, duration: effect.duration, stacks: 1, data: {} };
                    const existingIdx = player.statusEffects.findIndex(e => e.id === newBuff.id);
                    if (existingIdx !== -1) {
                        player.statusEffects[existingIdx] = newBuff;
                    } else {
                        player.statusEffects.push(newBuff);
                    }
                    
                    logs.push({ message: `释放技能 [${perk.name}]`, type: 'system', timestamp: Date.now() });
                    // Mark to refill deck fully
                    shouldRefillDeck = true;

                } else if (effect.type === 'damage') {
                    const dmg = effect.baseAmount || 0;
                    enemy.health = Math.max(0, enemy.health - dmg);
                    logs.push({ message: `技能 [${perk.name}] 造成 ${dmg} 点伤害`, type: 'damage', timestamp: Date.now() });
                } else if (effect.type === 'heal') {
                    const amount = effect.baseAmount || 0;
                    player.health = Math.min(player.maxHealth, player.health + amount);
                    logs.push({ message: `技能 [${perk.name}] 恢复 ${amount} 点生命`, type: 'heal', timestamp: Date.now() });
                    GameAudio.playBuff();
                }
            });

            // Refill deck logic: Regenerate FULL deck with new weights
            if (shouldRefillDeck) {
                logs.push({ message: `技能效果触发：牌库已刷新并填充`, type: 'system', timestamp: Date.now() });
                const tempPlayer = refreshSequences(player, generateSequence);
                // Assign FULL replenished sequences
                player.sequences.offensive = tempPlayer.sequences.offensive;
                player.sequences.defensive = tempPlayer.sequences.defensive;
                player.sequences.critical = tempPlayer.sequences.critical;
                // Don't reset quality here, assuming refills from skills maintain current quality
            }

            newState.player = player;
            newState.enemy = enemy;
            newState.battleLog = logs;
            return newState;
        });

        triggerEnemyTurn();

    }, [generateSequence, executeEnemyTurn, setGameState]);

    return { handleSequenceAction, handleSkillAction };
};
