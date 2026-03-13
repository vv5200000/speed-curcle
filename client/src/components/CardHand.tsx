/**
 * components/CardHand.tsx
 * 手牌区（增强版）
 *
 * 新增：
 *  - 骰子掷动动画（CSS keyframe spin + bounce）
 *  - 回合倒计时（60秒，超时自动结束回合）
 *  - 打出卡牌时 toast 动画
 *  - 卡牌 hover 3D 效果
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';
import { useSinglePlayer } from '../hooks/useSinglePlayer';
import type { Card } from '../types/game';
import { PLAYER_COLORS } from '../types/game';

const CARD_VISUAL: Record<string, { emoji: string; gradient: string; glowColor: string }> = {
  move:     { emoji: '🚗', gradient: 'from-cyan-700 to-cyan-900',   glowColor: '#06b6d4' },
  boost:    { emoji: '⚡', gradient: 'from-yellow-600 to-yellow-900', glowColor: '#facc15' },
  shield:   { emoji: '🛡️', gradient: 'from-blue-700 to-blue-900',    glowColor: '#3b82f6' },
  slow:     { emoji: '💥', gradient: 'from-red-700 to-red-900',      glowColor: '#ef4444' },
  shortcut: { emoji: '🛤️', gradient: 'from-green-700 to-green-900',  glowColor: '#22c55e' },
};

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const TURN_TIMEOUT = 60; // 秒

const CardHand: React.FC = () => {
  const socket       = useSocket();
  const singlePlayer = useSinglePlayer();

  const { myHand, mySocketId, currentPlayerId, players } = useGameStore();

  const isSinglePlayerMode = singlePlayer.isSinglePlayer;
  const playCardAction = isSinglePlayerMode
    ? singlePlayer.playCard
    : (cardId: string, targetId?: string) => socket.playCard({ cardId, targetId });
  const endTurnAction = isSinglePlayerMode
    ? singlePlayer.endTurn
    : () => socket.endTurn();
  const movePlayerAction = isSinglePlayerMode
    ? singlePlayer.movePlayer
    : (steps: number) => socket.movePlayer({ steps });

  const isMyTurn = isSinglePlayerMode
    ? currentPlayerId === 'player'
    : mySocketId === currentPlayerId;

  const humanPlayerId = isSinglePlayerMode ? 'player' : mySocketId;
  const myPlayer      = players.find((p) =>
    isSinglePlayerMode ? p.id === 'player' : p.id === mySocketId
  );
  const canAct = isMyTurn && (myPlayer?.actionPoints ?? 0) > 0;

  // ── 状态 ──
  const [pendingCard,         setPendingCard]         = useState<Card | null>(null);
  const [targetSelectVisible, setTargetSelectVisible] = useState(false);
  const [feedback,            setFeedback]            = useState<string>('');
  const [feedbackColor,       setFeedbackColor]       = useState<string>('text-cyan-300');

  // 骰子动画
  const [diceRolling, setDiceRolling] = useState(false);
  const [diceValue,   setDiceValue]   = useState(1);
  const diceAnimRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 倒计时
  const [countdown,  setCountdown]  = useState(TURN_TIMEOUT);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 当我的回合开始时，重置并启动倒计时
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);

    if (isMyTurn) {
      setCountdown(TURN_TIMEOUT);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            // 超时自动结束回合
            endTurnAction();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn]);

  const showFeedback = (msg: string, color = 'text-cyan-300') => {
    setFeedback(msg);
    setFeedbackColor(color);
    setTimeout(() => setFeedback(''), 2800);
  };

  // ── 处理打牌 ──
  const handlePlayCard = async (card: Card) => {
    if (!canAct) return;
    if (card.type === 'slow') {
      setPendingCard(card);
      setTargetSelectVisible(true);
      return;
    }
    const res = await playCardAction(card.id) as any;
    if (!res || res.error) {
      showFeedback(`❗ ${res?.error || '打牌失败'}`, 'text-red-400');
    } else {
      showFeedback(`✅ 打出：${card.name}`, 'text-green-400');
    }
  };

  const handleTargetSelected = async (targetId: string) => {
    if (!pendingCard) return;
    setTargetSelectVisible(false);
    const res = await playCardAction(pendingCard.id, targetId) as any;
    if (!res || res.error) {
      showFeedback(`❗ ${res?.error || '打牌失败'}`, 'text-red-400');
    } else {
      showFeedback(`✅ ${pendingCard.name} → 对手减速！`, 'text-yellow-300');
    }
    setPendingCard(null);
  };

  // ── 骰子移动（带动画） ──
  const handleDiceMove = useCallback(() => {
    if (!canAct || diceRolling) return;

    setDiceRolling(true);
    let tick = 0;

    diceAnimRef.current = setInterval(() => {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
      tick++;
      if (tick >= 10) {
        clearInterval(diceAnimRef.current!);
        const finalSteps = Math.floor(Math.random() * 6) + 1;
        setDiceValue(finalSteps);
        setDiceRolling(false);
        movePlayerAction(finalSteps);
        showFeedback(`🎲 掷出 ${finalSteps}！前进 ${finalSteps} 格`, 'text-purple-300');
      }
    }, 80);
  }, [canAct, diceRolling, movePlayerAction]);

  const handleEndTurn = () => {
    if (!isMyTurn) return;
    if (countdownRef.current) clearInterval(countdownRef.current);
    endTurnAction();
    showFeedback('⏭ 回合已结束', 'text-gray-400');
  };

  // ── 倒计时颜色 ──
  const countdownColor =
    countdown > 20 ? 'text-green-400' :
    countdown > 10 ? 'text-yellow-400' :
    'text-red-400 animate-pulse';

  return (
    <div className="w-full">
      {/* 标题 + 倒计时 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs text-gray-500 uppercase tracking-widest">
          手牌 ({myHand.length})
        </h3>
        {isMyTurn ? (
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 text-xs font-bold animate-pulse">⚡ 你的回合</span>
            <span className={`text-xs font-mono font-bold ${countdownColor}`}>
              {countdown}s
            </span>
          </div>
        ) : (
          <span className="text-gray-600 text-xs">
            {isSinglePlayerMode ? '等待 AI...' : '等待其他玩家...'}
          </span>
        )}
      </div>

      {/* 反馈 Toast */}
      {feedback && (
        <div className={`mb-2 text-xs text-center ${feedbackColor} bg-gray-900/60 border border-gray-700 rounded-lg py-1.5 px-2 transition-all`}>
          {feedback}
        </div>
      )}

      {/* 手牌列表 */}
      <div className="flex gap-2 overflow-x-auto pb-2 min-h-[90px]">
        {myHand.length === 0 ? (
          <p className="text-gray-600 text-xs italic self-center">暂无手牌</p>
        ) : (
          myHand.map((card) => {
            const vis = CARD_VISUAL[card.type] ?? { emoji: '❓', gradient: 'from-gray-700 to-gray-900', glowColor: '#888' };
            return (
              <button
                key={card.id}
                onClick={() => handlePlayCard(card)}
                disabled={!canAct}
                title={card.description}
                className={`
                  flex-shrink-0 w-[100px] rounded-xl p-2.5 text-left border transition-all duration-200
                  bg-gradient-to-b ${vis.gradient}
                  ${canAct
                    ? 'border-gray-600 hover:border-transparent hover:scale-110 hover:-translate-y-1 cursor-pointer shadow-md'
                    : 'border-gray-800 opacity-40 cursor-not-allowed'
                  }
                `}
                style={canAct ? {
                  '--glow-color': vis.glowColor,
                } as React.CSSProperties : undefined}
                onMouseEnter={(e) => {
                  if (canAct) {
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 0 14px ${vis.glowColor}66, 0 8px 20px rgba(0,0,0,0.5)`;
                    (e.currentTarget as HTMLElement).style.borderColor = vis.glowColor;
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = '';
                  (e.currentTarget as HTMLElement).style.borderColor = '';
                }}
              >
                <div className="text-xl mb-1">{vis.emoji}</div>
                <div className="text-xs font-bold text-white leading-tight">{card.name}</div>
                <div className="text-[9px] text-gray-400 mt-1 leading-tight line-clamp-2">
                  {card.description}
                </div>
                {card.value !== 0 && (
                  <div
                    className={`text-xs font-bold mt-1 ${
                      card.value > 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {card.value > 0 ? `+${card.value}` : card.value}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* 操作按钮 */}
      {isMyTurn && (
        <div className="flex gap-2 mt-3">
          {/* 骰子按钮 */}
          <button
            onClick={handleDiceMove}
            disabled={!canAct || diceRolling}
            className="flex-1 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white text-sm font-bold py-2 rounded-lg transition flex items-center justify-center gap-1.5"
          >
            <span
              className={`text-lg leading-none ${diceRolling ? 'animate-spin' : ''}`}
              style={{ display: 'inline-block' }}
            >
              {DICE_FACES[diceValue - 1]}
            </span>
            <span>{diceRolling ? '掷骰中...' : '掷骰子'}</span>
          </button>

          {/* 结束回合 */}
          <button
            onClick={handleEndTurn}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold py-2 rounded-lg transition"
          >
            ⏭ 结束
          </button>
        </div>
      )}

      {/* 目标选择 Modal */}
      {targetSelectVisible && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-gray-900 border border-red-700 rounded-2xl p-6 w-80 space-y-3 shadow-2xl shadow-red-900/30">
            <h3 className="text-white font-bold text-center text-lg">⚡ 选择目标</h3>
            <p className="text-gray-400 text-xs text-center">{pendingCard?.description}</p>

            {players
              .filter((p) => p.id !== humanPlayerId && !p.finished)
              .map((p) => {
                const colors = PLAYER_COLORS[p.colorIdx] ?? PLAYER_COLORS[0];
                return (
                  <button
                    key={p.id}
                    onClick={() => handleTargetSelected(p.id)}
                    className="w-full flex items-center gap-3 bg-gray-800 hover:bg-red-900/40 border border-transparent hover:border-red-700 rounded-xl px-4 py-2.5 transition"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: colors.hex }}
                    />
                    <span className="text-sm text-white font-medium">{p.name}</span>
                    <span className="ml-auto text-xs text-gray-500">
                      格 {p.position} · {p.laps}圈
                    </span>
                  </button>
                );
              })}

            <button
              onClick={() => { setTargetSelectVisible(false); setPendingCard(null); }}
              className="w-full text-gray-500 hover:text-gray-300 text-xs mt-1 py-1 rounded-lg hover:bg-gray-800 transition"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardHand;
