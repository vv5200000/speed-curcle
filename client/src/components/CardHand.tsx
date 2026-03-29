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
  move:     { emoji: '🏎️', gradient: 'from-cyan-700 to-cyan-900',    glowColor: '#06b6d4' },
  boost:    { emoji: '⚡',  gradient: 'from-yellow-600 to-yellow-900', glowColor: '#facc15' },
  shield:   { emoji: '🛡️', gradient: 'from-blue-700 to-blue-900',    glowColor: '#3b82f6' },
  slow:     { emoji: '💥',  gradient: 'from-red-700 to-red-900',      glowColor: '#ef4444' },
  attack:   { emoji: '🚧',  gradient: 'from-orange-700 to-orange-900', glowColor: '#f97316' },
  counter:  { emoji: '🔄',  gradient: 'from-teal-700 to-teal-900',    glowColor: '#14b8a6' },
  cooldown: { emoji: '❄️',  gradient: 'from-sky-700 to-sky-900',      glowColor: '#0ea5e9' },
  shortcut: { emoji: '🛤️', gradient: 'from-green-700 to-green-900',  glowColor: '#22c55e' },
  heat:     { emoji: '🔥',  gradient: 'from-red-900 to-gray-900',     glowColor: '#dc2626' },
};

// 稀有度边框颜色映射
const RARITY_BORDER: Record<string, string> = {
  N: 'border-gray-600',
  R: 'border-blue-500',
  S: 'border-purple-500',
  L: 'border-yellow-400',
};

const RARITY_GLOW: Record<string, string> = {
  N: '',
  R: '0 0 8px #3b82f680',
  S: '0 0 10px #a855f780',
  L: '0 0 14px #facc1580',
};

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const TURN_TIMEOUT = 60; // 秒

const CardHand: React.FC = () => {
  const socket       = useSocket();
  const singlePlayer = useSinglePlayer();

  const { myHand, mySocketId, currentPlayerId, players, pendingAttack } = useGameStore();

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
  const changeGearAction = isSinglePlayerMode
    ? singlePlayer.changeGear
    : (targetGear: number) => socket.changeGear({ targetGear });
  const defendAttackAction = isSinglePlayerMode
    ? singlePlayer.defendAttack
    : (cardId: string) => (socket as any).defendAttack({ cardId });

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
        setCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn]);

  // 监听倒计时，超时则结束回合（避免在 setState 中触发 render side-effects 导致 React 崩溃）
  useEffect(() => {
    if (countdown === 0 && isMyTurn) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      endTurnAction();
    }
  }, [countdown, isMyTurn, endTurnAction]);

  const showFeedback = (msg: string, color = 'text-cyan-300') => {
    setFeedback(msg);
    setFeedbackColor(color);
    setTimeout(() => setFeedback(''), 2800);
  };

  // ── 防御窗口逻辑 (Phase 4) ──
  const [defendTimer, setDefendTimer] = useState(0);
  const isTargeted = pendingAttack?.targetId === humanPlayerId;

  useEffect(() => {
    if (!isTargeted || !pendingAttack) {
      setDefendTimer(0);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((pendingAttack.expireAt - Date.now()) / 1000));
      setDefendTimer(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [isTargeted, pendingAttack]);

  // ── 处理打牌 ──
  const handlePlayCard = async (card: Card) => {
    // 防御状态下点击护盾
    if (isTargeted && card.type === 'shield') {
      defendAttackAction(card.id);
      return;
    }

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

  const handleChangeGear = async (targetGear: number) => {
    if (!canAct) return;
    const res = await changeGearAction(targetGear) as any;
    if (!res || res.error) {
      showFeedback(`❗ 换挡失败: ${res?.error || ''}`, 'text-red-400');
    } else {
      showFeedback(`⚙️ 成功切换至 ${targetGear} 档`, 'text-blue-300');
    }
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
            const isHeatCard = !!(card as any).isHeatCard;
            const rarity: string = (card as any).rarity ?? 'N';
            const rarityBorderClass = RARITY_BORDER[rarity] ?? RARITY_BORDER.N;
            const rarityGlow = RARITY_GLOW[rarity] ?? '';
            const vis = CARD_VISUAL[card.type] ?? { emoji: '❓', gradient: 'from-gray-700 to-gray-900', glowColor: '#888' };

            if (isHeatCard) {
              // 热力卡：红色特殊样式，不可交互
              return (
                <div
                  key={card.id}
                  title="热力卡 — 过弯超速产生，占用手牌格位，不可打出"
                  className="flex-shrink-0 w-[80px] rounded-xl p-2 text-left border border-red-800/60 bg-gradient-to-b from-red-950 to-gray-900 opacity-70 cursor-not-allowed select-none"
                >
                  <div className="text-lg mb-1">🔥</div>
                  <div className="text-[10px] font-bold text-red-400 leading-tight">热力卡</div>
                  <div className="text-[8px] text-red-600 mt-1">⚠ 不可打出</div>
                </div>
              );
            }

            return (
              <button
                key={card.id}
                onClick={() => handlePlayCard(card)}
                disabled={!canAct}
                title={card.description || card.name}
                className={`
                  flex-shrink-0 w-[100px] rounded-xl p-2.5 text-left border transition-all duration-200
                  bg-gradient-to-b ${vis.gradient}
                  ${rarityBorderClass}
                  ${canAct
                    ? 'hover:border-transparent hover:scale-110 hover:-translate-y-1 cursor-pointer shadow-md'
                    : 'opacity-40 cursor-not-allowed'
                  }
                `}
                style={canAct ? { boxShadow: rarityGlow || undefined } : undefined}
                onMouseEnter={(e) => {
                  if (canAct) {
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 0 14px ${vis.glowColor}66, 0 8px 20px rgba(0,0,0,0.5)`;
                    (e.currentTarget as HTMLElement).style.borderColor = vis.glowColor;
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = rarityGlow || '';
                  (e.currentTarget as HTMLElement).style.borderColor = '';
                }}
              >
                <div className="text-xl mb-1">{vis.emoji}</div>
                <div className="text-xs font-bold text-white leading-tight">{card.name}</div>
                {rarity !== 'N' && (
                  <div className={`text-[8px] font-bold mt-0.5 ${
                    rarity === 'L' ? 'text-yellow-400' :
                    rarity === 'S' ? 'text-purple-400' :
                    'text-blue-400'
                  }`}>
                    {'★'.repeat(rarity === 'L' ? 4 : rarity === 'S' ? 3 : 2)}
                  </div>
                )}
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
        <div className="flex flex-col gap-2 mt-3">
          {/* 档位控制 */}
          <div className="flex items-center justify-between bg-gray-800 rounded-lg p-2 border border-gray-700 shadow-inner">
             <span className="text-gray-400 text-xs">
               ⚙️ 当前预设档位: <span className="text-blue-400 font-bold ml-1">{myPlayer?.gear || 1} 档</span>
             </span>
             <div className="flex gap-1">
               {[1, 2, 3, 4, 5, 6].map(g => (
                 <button 
                   key={g} 
                   onClick={() => handleChangeGear(g)}
                   disabled={!canAct || g === myPlayer?.gear}
                   className={`w-7 h-7 rounded text-xs font-bold transition-all ${
                     g === myPlayer?.gear
                       ? 'bg-blue-600 text-white shadow-[0_0_8px_#2563eb]'
                       : 'bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-40 disabled:hover:bg-gray-700'
                   }`}
                   title={`切换至 ${g} 档`}
                 >
                   {g}
                 </button>
               ))}
             </div>
          </div>

          <div className="flex gap-2">
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
            ⏭ 结束回合
          </button>
          </div>
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

          </div>
        </div>
      )}

      {/* 防御预警 Overlay (Phase 4) */}
      {isTargeted && pendingAttack && (
        <div className="fixed inset-0 pointer-events-none flex flex-col items-center justify-center z-[100] animate-pulse">
          <div className="bg-red-900/40 border-4 border-red-600 rounded-full px-8 py-4 pointer-events-auto backdrop-blur-md shadow-[0_0_30px_#ef4444]">
            <div className="text-white font-black text-2xl tracking-tighter text-center">
              ⚠️ 遭受攻击! ⚠️
            </div>
            <div className="text-red-200 text-sm font-bold text-center mt-1">
              打出护盾卡进行防御
            </div>
            <div className="text-white font-mono text-5xl text-center mt-2">
              {defendTimer}s
            </div>
            <div className="w-full bg-gray-900 rounded-full h-2 mt-4 overflow-hidden border border-red-900">
               <div 
                 className="bg-red-500 h-full transition-all duration-500" 
                 style={{ width: `${(defendTimer / 5) * 100}%` }}
               />
            </div>
          </div>
          <div className="mt-8 text-white text-xs font-bold bg-black/60 px-4 py-2 rounded-lg pointer-events-none">
            {players.find(p => p.id === pendingAttack.attackerId)?.name} 正在对你发起冲击...
          </div>
        </div>
      )}
    </div>
  );
};

export default CardHand;
