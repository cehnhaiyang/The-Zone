
import { CHARACTERS, STATUS_EFFECTS } from '../../constants/sequence';
import { GameCharacter, GameState, GameStatusEffect, GameLogEntry } from '../../types';
import { SequenceModifiers } from './useSequence';
import { GameAudio } from '../../services/GameAudioService';

export const CONSTANTS = {
    BASE_ATTACK_DAMAGE: 12,
    CRIT_MULTIPLIER: 2.0,
    SKILL_DAMAGE_BASE: 20,
    DEFEND_HEAL: 10
};

export const getEffectDef = (id: string) => STATUS_EFFECTS.find(e => e.id === id);

/**
 * 根据当前 Buff/Debuff 计算序列修正参数
 */
export const getModifiers = (effects: GameStatusEffect[], deckQuality: number = 1.0): { 
    offensive: SequenceModifiers, 
    defensive: SequenceModifiers, 
    critical: SequenceModifiers,
    critDamageMultiplier: number
} => {
    const mods: {
        offensive: SequenceModifiers, 
        defensive: SequenceModifiers, 
        critical: SequenceModifiers,
        critDamageMultiplier: number
    } = {
        offensive: { weights: {}, upgradeChance: 0, quality: deckQuality },
        defensive: { weights: {}, upgradeChance: 0, quality: deckQuality },
        critical: { weights: {}, upgradeChance: 0, quality: deckQuality },
        critDamageMultiplier: 1.0
    };

    const activeIds = effects.map(e => e.id);

    // 战士: 怒吼
    if (activeIds.includes('buff_roar')) {
        mods.offensive.weights!['hit'] = 1.5;
        mods.defensive.weights!['block'] = 3.0;
        mods.defensive.weights!['fail'] = 0.1;
        mods.critical.upgradeChance = 0.1;
    }

    // 法师: 专注
    if (activeIds.includes('buff_focus')) {
        mods.offensive.weights!['hit'] = 5.0;
        mods.offensive.weights!['miss'] = 0.0;
        mods.critical.upgradeChance = 0.6;
    }

    // 盗贼: 背刺 (原刺杀)
    if (activeIds.includes('buff_backstab')) {
        mods.offensive.weights!['hit'] = 2.0;
        mods.offensive.weights!['graze'] = 0.0;
        // 极高的暴击权重
        mods.critical.weights!['critical'] = 20.0;
        mods.critDamageMultiplier = 2.5;
        
        // 防御惩罚
        mods.defensive.weights!['dodge'] = 0.2;
        mods.defensive.weights!['block'] = 0.0;
        mods.defensive.weights!['fail'] = 5.0;
    }

    // 牧师: 神圣庇护
    if (activeIds.includes('buff_divine')) {
        mods.defensive.weights!['block'] = 5.0; // 极高格挡
        mods.defensive.weights!['fail'] = 0.0;  // 几乎不会失败
        mods.defensive.upgradeChance = 0.3;     // 有机会升级防御效果(如果有更高阶防御)
    }

    // 武士: 居合心眼
    if (activeIds.includes('buff_iaido')) {
        // 下一击必暴击且伤害极高
        mods.critical.weights!['critical'] = 50.0; 
        mods.critical.weights!['normal'] = 0.0;
        mods.critDamageMultiplier = 3.0;
        
        // 命中率修正，居合不应该 Miss
        mods.offensive.weights!['miss'] = 0.0;
        mods.offensive.weights!['hit'] = 5.0;
    }

    return mods;
};

/**
 * 刷新角色的序列
 * 返回包含新序列的 Character 对象
 */
export const refreshSequences = (
    player: GameCharacter, 
    generateSequence: (profileId: string, target: 'player' | 'enemy', modifiers?: SequenceModifiers, overrideLength?: number) => string[]
): GameCharacter => {
    const mods = getModifiers(player.statusEffects, player.deckQuality);
    
    return {
        ...player,
        sequences: {
            offensive: generateSequence(player.sequenceProfiles.offensive!, 'player', mods.offensive, player.deckSize),
            defensive: generateSequence(player.sequenceProfiles.defensive!, 'player', mods.defensive, player.deckSize),
            critical: generateSequence(player.sequenceProfiles.critical!, 'player', mods.critical, player.deckSize),
            // Enemy specific (will be undefined for player usually)
            action: player.sequences.action
        }
    };
};

/**
 * 检查游戏结束条件
 */
export const checkGameEnd = (state: GameState, setGameState: React.Dispatch<React.SetStateAction<GameState | null>>): boolean => {
    if (state.player.health <= 0) {
        setGameState(prev => prev ? ({ 
            ...prev, 
            gameOver: true, 
            winner: 'enemy', 
            battleLog: [...prev.battleLog, { message: '战斗结束，你输了！', type: 'system', timestamp: Date.now() }] 
        }) : null);
        GameAudio.playLose();
        return true;
    }
    if (state.enemy.health <= 0) {
        setGameState(prev => prev ? ({ 
            ...prev, 
            gameOver: true, 
            winner: 'player', 
            battleLog: [...prev.battleLog, { message: '战斗胜利！', type: 'system', timestamp: Date.now() }] 
        }) : null);
        GameAudio.playWin();
        return true;
    }
    return false;
};

/**
 * 处理周期性效果 (DoT/HoT)
 */
export const processTurnEffects = (char: GameCharacter, logs: GameLogEntry[]) => {
    let hpChange = 0;
    
    char.statusEffects.forEach(effect => {
        const def = getEffectDef(effect.id);
        if (!def) return;

        def.effects.forEach(eff => {
            if (eff.type === 'periodic_damage') {
                const dmg = eff.amount * effect.stacks;
                hpChange -= dmg;
                logs.push({ 
                    message: `[${char.name}] 受到 [${def.name}] 伤害 ${dmg} 点`, 
                    type: 'damage', 
                    timestamp: Date.now() 
                });
            }
        });
    });

    if (hpChange !== 0) {
        char.health = Math.max(0, Math.min(char.maxHealth, char.health + hpChange));
    }
    
    return hpChange !== 0;
};
