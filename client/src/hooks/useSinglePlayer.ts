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
  changeGear: (targetGear: number) => void;
  defendAttack: (cardId: string) => void;
  // Phase 6
  declareLean: () => void;
  declareWheelie: () => void;
  adjustBodyWeight: (direction: 1 | -1) => void;
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
    pendingAttack,
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
      if (result.slipstream) {
        addMessage(`💨 蹭到尾流！获得额外行动点！`);
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

  // 换挡
  const changeGear = useCallback((targetGear: number) => {
    if (!globalGameInstance) return;
    const result = globalGameInstance.changeGear(targetGear);
    if (result.ok) {
      addMessage(`⚙️ 你换到了 ${targetGear} 档`);
    } else {
      addMessage(`❗ 换挡失败: ${result.error}`);
    }
    syncState();
  }, [addMessage, syncState]);

  // 人类玩家防御
  const defendAttack = useCallback((cardId: string) => {
    if (!globalGameInstance) return;
    const result = globalGameInstance.defendAttack('player', cardId);
    if (result.ok) {
      addMessage(`🛡️ 防御成功！你开启了护盾并抵消了攻击！`);
    } else {
      addMessage(`❗ 防御失败: ${result.error}`);
    }
    syncState();
  }, [addMessage, syncState]);

  // Phase 6.1: 极限压弯
  const declareLean = useCallback(() => {
    if (!globalGameInstance) return;
    const result = (globalGameInstance as any).declareLean('player');
    if (result.ok) {
      addMessage(`🏍️ 你声明了极限压弯！${result.blindCard ? `盲抽到 +${result.blindCard.value} 速度` : ''}`);
    } else {
      addMessage(`❗ ${result.error}`);
    }
    syncState();
  }, [addMessage, syncState]);

  // Phase 6.2: 翘头冲刺
  const declareWheelie = useCallback(() => {
    if (!globalGameInstance) return;
    const result = (globalGameInstance as any).declareWheelie('player');
    if (result.ok) {
      addMessage(`💥 翘头冲刺启动！本回合移动力全面提升！`);
    } else {
      addMessage(`❗ ${result.error}`);
    }
    syncState();
  }, [addMessage, syncState]);

  // Phase 6.3: 重心微调
  const adjustBodyWeight = useCallback((direction: 1 | -1) => {
    if (!globalGameInstance) return;
    const result = (globalGameInstance as any).adjustBodyWeight('player', direction);
    if (result.ok) {
      addMessage(`⚖️ 消耗重心标记，预先微调位移 ${direction > 0 ? '+1' : '-1'} 格`);
    } else {
      addMessage(`❗ ${result.error}`);
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

  // 监听挂起的攻击（AI 自动防御）
  useEffect(() => {
    if (!isSinglePlayer || !globalGameInstance || !pendingAttack) return;

    const targetId = pendingAttack.targetId;
    const target = globalGameInstance.players.find(p => p.id === targetId);

    if (target?.isAI) {
      // AI 尝试防御
      const shieldCard = target.hand.find(c => c.type === 'shield');
      if (shieldCard) {
        // 随机延迟 1-3.5 秒后防御
        const delay = 1000 + Math.random() * 2500;
        const timer = setTimeout(() => {
          if (globalGameInstance && globalGameInstance.pendingAttack?.targetId === targetId) {
            globalGameInstance.defendAttack(targetId, shieldCard.id);
            addMessage(`🛡️ ${target.name} 使用了护盾，成功防御！`);
          }
        }, delay);
        return () => clearTimeout(timer);
      }
    }
  }, [pendingAttack, isSinglePlayer, addMessage]);

  return {
    isSinglePlayer,
    aiCount,
    setAiCount,
    startSinglePlayer,
    endSinglePlayer,
    movePlayer,
    playCard,
    endTurn,
    changeGear,
    defendAttack,
    declareLean,
    declareWheelie,
    adjustBodyWeight,
    isAiTurn,
  };
}
