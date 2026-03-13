/**
 * hooks/useSinglePlayer.ts
 * 单机模式全局管理器
 */

import { useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { SinglePlayerGame } from '../game/SinglePlayerGame';

// 全局单机游戏实例
let globalGameInstance: SinglePlayerGame | null = null;

export interface UseSinglePlayer {
  isSinglePlayer: boolean;
  aiCount: number;
  setAiCount: (n: number) => void;
  startSinglePlayer: (playerName: string, aiCount: number) => void;
  endSinglePlayer: () => void;
  movePlayer: (steps: number) => void;
  playCard: (cardId: string, targetId?: string) => void;
  endTurn: () => void;
  isAiTurn: boolean;
}

export function useSinglePlayer(): UseSinglePlayer {
  const {
    isSinglePlayer,
    setIsSinglePlayer,
    aiCount,
    setAiCount,
    isAiTurn,
    setIsAiTurn,
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
    if (!globalGameInstance) return;

    const publicState = globalGameInstance.getPublicState();
    const privateState = globalGameInstance.getPrivateState('player');

    applyPublicState(publicState as any);
    applyPrivateState(privateState as any);

    // 检查游戏结束
    if (globalGameInstance.isGameOver()) {
      const rankings = globalGameInstance.players
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
    globalGameInstance = new SinglePlayerGame();
    globalGameInstance.initGame(playerName, aiCountNum);
    
    // 监听状态变化同步
    globalGameInstance.onStateChange = () => {
      syncState();
    };
    
    setIsSinglePlayer(true);
    setMyName(playerName);
    useGameStore.getState().setConnected(true);
    addMessage(`🎮 单人模式开始！你 vs ${aiCountNum} 个 AI`);

    // 初始同步
    setTimeout(syncState, 0);
  }, [setMyName, addMessage, syncState, setIsSinglePlayer]);

  // 结束单机模式
  const endSinglePlayer = useCallback(() => {
    globalGameInstance = null;
    setIsSinglePlayer(false);
    reset();
    addMessage('已退出单人模式');
  }, [reset, addMessage, setIsSinglePlayer]);

  // 人类玩家移动
  const movePlayer = useCallback((steps: number) => {
    if (!globalGameInstance) return;
    const result = globalGameInstance.movePlayer(steps);
    if (result.ok) {
      if (result.lapCompleted) {
        addMessage(`🎲 跑完一圈啦！完成圈数`);
      } else {
        addMessage(`🎲 快速移动了 ${steps} 格！`);
      }
    } else {
      addMessage(`❗ ${result.error}`);
    }
    syncState();
  }, [addMessage, syncState]);

  // 人类玩家打牌
  const playCard = useCallback((cardId: string, targetId?: string) => {
    if (!globalGameInstance) return;
    const result = globalGameInstance.playCard(cardId, targetId);
    if (result.ok) {
      addMessage(`💳 成功发动卡牌效果`);
    } else {
      addMessage(`❗ ${result.error}`);
    }
    syncState();
  }, [addMessage, syncState]);

  // 结束回合
  const endTurn = useCallback(() => {
    if (!globalGameInstance) return;
    const result = globalGameInstance.endTurn();
    if (result.ok) {
      const nextPlayer = globalGameInstance.getCurrentPlayer();
      addMessage(`⏭️ 回合跳过，现在轮到 ${nextPlayer?.name}`);
    }
    syncState();
  }, [addMessage, syncState]);

  // AI 行动
  const runAiAction = useCallback(() => {
    if (!globalGameInstance) return;

    const current = globalGameInstance.getCurrentPlayer();
    if (!current || !current.isAI) {
      if (isAiTurn) setIsAiTurn(false);
      return;
    }

    if (isAiTurn) return; // 已经在行动中，不要重复触发
    setIsAiTurn(true);

    // AI 延迟行动
    setTimeout(() => {
      if (!globalGameInstance) return;

      const player = globalGameInstance.getCurrentPlayer();
      if (!player?.isAI) {
        setIsAiTurn(false);
        return;
      }

      globalGameInstance.aiPlayCard();
      globalGameInstance.endTurn();
      addMessage(`🤖 ${player.name} 结束了它的回合`);
      
      syncState();
      setIsAiTurn(false);
    }, 1500 + Math.random() * 1000);
  }, [addMessage, syncState, isAiTurn, setIsAiTurn]);

  // 监听回合变化触发 AI
  useEffect(() => {
    if (!isSinglePlayer || !globalGameInstance) return;

    const timer = setTimeout(() => {
      if (!globalGameInstance) return;
      const current = globalGameInstance.getCurrentPlayer();
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
