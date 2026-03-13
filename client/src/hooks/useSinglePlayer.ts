/**
 * hooks/useSinglePlayer.ts
 * 单机模式 Hook - 管理 AI 对战逻辑
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { SinglePlayerGame } from '../game/SinglePlayerGame';

export interface UseSinglePlayer {
  isSinglePlayer: boolean;
  aiCount: number;
  setAiCount: (n: number) => void;
  startSinglePlayer: (playerName: string, aiCount: number) => void;
  endSinglePlayer: () => void;
  // 游戏操作
  movePlayer: (steps: number) => void;
  playCard: (cardId: string, targetId?: string) => void;
  endTurn: () => void;
  // AI 控制
  isAiTurn: boolean;
}

export function useSinglePlayer(): UseSinglePlayer {
  const [isSinglePlayer, setIsSinglePlayer] = useState(false);
  const [aiCount, setAiCount] = useState(2);
  const [isAiTurn, setIsAiTurn] = useState(false);
  
  // 使用 ref 保存 game 实例，避免 stale closure
  const gameRef = useRef<SinglePlayerGame | null>(null);

  const {
    setMyName,
    applyPublicState,
    applyPrivateState,
    setGameOver,
    addMessage,
    reset,
    currentPlayerId,
  } = useGameStore();

  // 同步状态到 store
  const syncState = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;

    const publicState = game.getPublicState();
    const privateState = game.getPrivateState('player');

    applyPublicState(publicState as any);
    applyPrivateState(privateState as any);

    // 检查游戏结束
    if (game.isGameOver()) {
      const rankings = game.players
        .filter(p => p.finished)
        .sort((a, b) => a.rank - b.rank)
        .map(p => ({
          rank: p.rank,
          playerId: p.id,
          name: p.name,
          laps: p.laps,
        }));
      setGameOver(rankings);
      addMessage('🎉 游戏结束！');
    }
  }, [applyPublicState, applyPrivateState, setGameOver, addMessage]);

  // 启动单人模式
  const startSinglePlayer = useCallback((playerName: string, aiCountNum: number) => {
    const newGame = new SinglePlayerGame();
    newGame.initGame(playerName, aiCountNum);
    
    // 设置状态变化回调
    newGame.onStateChange = () => {
      syncState();
    };
    
    gameRef.current = newGame;
    setIsSinglePlayer(true);
    setMyName(playerName);
    useGameStore.getState().setConnected(true);
    addMessage(`🎮 单人模式开始！你 vs ${aiCountNum} 个 AI`);

    // 初始同步
    setTimeout(syncState, 0);
  }, [setMyName, addMessage, syncState]);

  // 结束单人模式
  const endSinglePlayer = useCallback(() => {
    gameRef.current = null;
    setIsSinglePlayer(false);
    reset();
    addMessage('已退出单人模式');
  }, [reset, addMessage]);

  // 人类玩家移动
  const movePlayer = useCallback((steps: number) => {
    const game = gameRef.current;
    if (!game) return;
    
    const result = game.movePlayer(steps);
    console.log('移动结果:', result);
    if (result.ok) {
      if (result.lapCompleted) {
        addMessage(`🎲 掷出 ${steps} 格，完成了 1 圈！`);
      } else {
        addMessage(`🎲 掷出 ${steps} 格，移动到第 ${game.players.find(p => p.id === 'player')?.position} 格`);
      }
    } else {
      addMessage(`❗ ${result.error}`);
    }
    
    syncState();
  }, [addMessage, syncState]);

  // 人类玩家打牌
  const playCard = useCallback((cardId: string, targetId?: string) => {
    const game = gameRef.current;
    if (!game) return;
    
    console.log('打牌:', cardId, targetId);
    const result = game.playCard(cardId, targetId);
    console.log('打牌结果:', result);
    if (result.ok) {
      addMessage(`💳 打出卡牌`);
    } else {
      addMessage(`❗ ${result.error}`);
    }
    
    syncState();
  }, [addMessage, syncState]);

  // 结束回合
  const endTurn = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    
    const result = game.endTurn();
    if (result.ok) {
      const nextPlayer = game.getCurrentPlayer();
      addMessage(`⏭️ 回合结束，轮到 ${nextPlayer?.name}`);
    }
    
    syncState();
  }, [addMessage, syncState]);

  // AI 行动
  const runAiAction = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;

    const current = game.getCurrentPlayer();
    if (!current || !current.isAI) {
      setIsAiTurn(false);
      return;
    }

    setIsAiTurn(true);
    console.log('AI 开始行动:', current.name);

    // AI 延迟行动
    setTimeout(() => {
      const g = gameRef.current;
      if (!g) return;

      const player = g.getCurrentPlayer();
      if (!player?.isAI) {
        setIsAiTurn(false);
        return;
      }

      console.log('AI 执行行动:', player.name);
      const result = g.aiPlayCard();
      console.log('AI 行动结果:', result);
      
      // 强制结束 AI 回合
      g.endTurn();
      addMessage(`🤖 ${player.name} 结束了回合`);
      
      syncState();
      setIsAiTurn(false);
    }, 1500 + Math.random() * 1000);
  }, [addMessage, syncState]);

  // 监听回合变化，触发 AI
  useEffect(() => {
    if (!isSinglePlayer || !gameRef.current) return;

    const timer = setTimeout(() => {
      const game = gameRef.current;
      if (!game) return;
      
      const current = game.getCurrentPlayer();
      console.log('检查回合:', current?.name, 'isAI:', current?.isAI);
      if (current?.isAI) {
        runAiAction();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [currentPlayerId, isSinglePlayer, runAiAction]);

  return {
    isSinglePlayer,
    aiCount,
    setAiCount,
    startSinglePlayer,
    endSinglePlayer,
    movePlayer,
    playCard,
    endTurn,
    isAiTurn,
  };
}
