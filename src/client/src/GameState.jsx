import { createContext, useContext, useState } from 'react';

// 游戏状态上下文
export const GameStateContext = createContext();

// 游戏状态提供者
export function GameStateProvider({ children }) {
  const [gameState, setGameState] = useState({
    players: [],
    communityCards: [],
    pot: 0,
    currentBet: 0,
    currentPlayer: null,
    gameStage: 'WAITING', // WAITING, PREFLOP, FLOP, TURN, RIVER, SHOWDOWN
    playerAction: null, // FOLD, CHECK, CALL, RAISE, ALL_IN
  });

  // 更新游戏状态
  const updateGameState = (newState) => {
    setGameState(prev => ({
      ...prev,
      ...newState
    }));
  };

  return (
    <GameStateContext.Provider value={{ gameState, updateGameState }}>
      {children}
    </GameStateContext.Provider>
  );
}

// 自定义hook
export function useGameState() {
  return useContext(GameStateContext);
}