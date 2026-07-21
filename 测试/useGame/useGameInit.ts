
import { useCallback } from 'react';
import { GameState, GameCharacter } from '../../types';
import { CHARACTERS } from '../../constants/sequence';
import { GameAudio } from '../../services/GameAudioService';
import { SequenceModifiers } from './useSequence';

const INITIAL_PLAYER_ID = 'player_warrior';
const INITIAL_ENEMY_ID = 'enemy_goblin';

export const useGameInit = (
    setGameState: React.Dispatch<React.SetStateAction<GameState | null>>,
    generateSequence: (profileId: string, target: 'player' | 'enemy', modifiers?: SequenceModifiers, overrideLength?: number) => string[]
) => {
    const initGame = useCallback((playerId: string = INITIAL_PLAYER_ID, enemyId: string = INITIAL_ENEMY_ID) => {
        const playerConfig = CHARACTERS[playerId as keyof typeof CHARACTERS];
        const enemyConfig = CHARACTERS[enemyId as keyof typeof CHARACTERS];

        if (!playerConfig || !enemyConfig) {
            console.error("Invalid Character ID");
            return;
        }

        const initMods = {
            offensive: { quality: 1.0 },
            defensive: { quality: 1.0 },
            critical: { quality: 1.0 }
        };

        // Cast to any to bypass the union type restrictions on specific fields that don't exist on all variants
        const pConf = playerConfig as any;
        const eConf = enemyConfig as any;

        const playerSequences = {
            offensive: generateSequence(pConf.sequenceProfiles.offensive,'player', initMods.offensive, playerConfig.deckSize),
            defensive: generateSequence(pConf.sequenceProfiles.defensive, 'player', initMods.defensive, playerConfig.deckSize),
            critical: generateSequence(pConf.sequenceProfiles.critical, 'player', initMods.critical, playerConfig.deckSize),
        };

        const enemySequences = {
            action: generateSequence(eConf.sequenceProfiles.action, 'enemy', undefined, enemyConfig.deckSize),
            critical: generateSequence(eConf.sequenceProfiles.critical, 'enemy', undefined, enemyConfig.deckSize),
            offensive: [], defensive: [] 
        };

        const player: GameCharacter = {
            ...playerConfig,
            health: playerConfig.maxHealth,
            maxEnergy: playerConfig.maxEnergy || 100, // Default to 100 if undefined in older config
            energy: playerConfig.maxEnergy || 100,
            sequences: playerSequences,
            criticalProgress: 0,
            defenseState: null,
            statusEffects: [],
            deckQuality: 1.0,
            deckSize: playerConfig.deckSize || 12,
            observableCards: playerConfig.observableCards || 3,
            intentPreview: playerConfig.intentPreview || 1
        };

        const enemy: GameCharacter = {
            ...enemyConfig,
            health: enemyConfig.maxHealth,
            maxEnergy: enemyConfig.maxEnergy || 100,
            energy: enemyConfig.maxEnergy || 100,
            sequences: enemySequences,
            criticalProgress: 0,
            actionProgress: 0,
            defenseState: null,
            statusEffects: [],
            deckQuality: 1.0,
            deckSize: enemyConfig.deckSize || 8,
            observableCards: 1,
            intentPreview: 1
        };

        setGameState({
            turn: 1,
            phase: 'player-choice',
            gameOver: false,
            winner: null,
            player,
            enemy,
            battleLog: [{ message: '战斗开始！直接点击序列发动攻击或防御。', type: 'system', timestamp: Date.now() }]
        });
        
        GameAudio.playSelect();
    }, [generateSequence, setGameState]);

    return { initGame };
};
