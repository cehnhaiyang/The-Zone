
import { useState } from 'react';
import { GameState } from '../../types';
import { useSequence } from './useSequence';
import { useGameInit } from './useGameInit';
import { useEnemyTurn } from './useEnemyTurn';
import { usePlayerTurn } from './usePlayerTurn';

export { useSequence };

/**
 * 游戏核心引擎 Hook
 * 职责：聚合初始化、回合逻辑、玩家动作。
 */
export const useGame = () => {
    const { generateSequence, getDisplayText } = useSequence();
    const [gameState, setGameState] = useState<GameState | null>(null);

    // 1. 初始化逻辑
    const { initGame } = useGameInit(setGameState, generateSequence);

    // 2. 敌人回合逻辑
    const { executeEnemyTurn } = useEnemyTurn(setGameState, generateSequence);

    // 3. 玩家回合逻辑
    const { handleSequenceAction, handleSkillAction } = usePlayerTurn(setGameState, generateSequence, executeEnemyTurn);

    const restartGame = (playerId?: string) => {
        // Default values handled inside initGame
        initGame(playerId);
    };

    return {
        gameState,
        initGame,
        handleSequenceAction,
        handleSkillAction,
        restartGame,
        // Utils exposed for UI components if needed
        generateSequence,
        getDisplayText
    };
};
