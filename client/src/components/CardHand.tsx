/**
 * components/CardHand.tsx
 * 手牌区：展示当前玩家的手牌，支持点击打出
 *
 * - 非当前回合时，手牌显示为不可交互状态
 * - slow 类型卡牌需要先选择目标玩家
 */

import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';
import type { Card } from '../types/game';
import { PLAYER_COLORS } from '../types/game';

// 卡牌类型对应的视觉配置
const CARD_VISUAL: Record<string, { emoji: string; gradient: string }> = {
  move:     { emoji: '🚗', gradient: 'from-cyan-700 to-cyan-900' },
  boost:    { emoji: '⚡', gradient: 'from-yellow-600 to-yellow-900' },
  shield:   { emoji: '🛡️', gradient: 'from-blue-700 to-blue-900' },
  slow:     { emoji: '⚡💥', gradient: 'from-red-700 to-red-900' },
  shortcut: { emoji: '🛤️', gradient: 'from-green-700 to-green-900' },
};

const CardHand: React.FC = () => {
  const { playCard, endTurn, movePlayer } = useSocket();

  const {
    myHand,
    mySocketId,
    currentPlayerId,
    players,
  } = useGameStore();

  const isMyTurn   = mySocketId === currentPlayerId;
  const myPlayer   = players.find((p) => p.id === mySocketId);
  const canAct     = isMyTurn && (myPlayer?.actionPoints ?? 0) > 0;

  // 需要选择目标的卡牌 id
  const [pendingCard,   setPendingCard]   = useState<Card | null>(null);
  const [targetSelectVisible, setTargetSelectVisible] = useState(false);
  const [feedback,      setFeedback]      = useState<string>('');

  /** 打出一张牌（若需要目标则弹出选择） */
  const handlePlayCard = async (card: Card) => {
    if (!canAct) return;

    if (card.type === 'slow') {
      // 需要选择目标
      setPendingCard(card);
      setTargetSelectVisible(true);
      return;
    }

    const res = await playCard({ cardId: card.id });
    if (!res.ok) {
      setFeedback(`❗ ${res.error}`);
    } else {
      setFeedback(`✅ 打出：${card.name}`);
    }
    setTimeout(() => setFeedback(''), 2500);
  };

  /** 对目标打出慢速卡 */
  const handleTargetSelected = async (targetId: string) => {
    if (!pendingCard) return;
    setTargetSelectVisible(false);

    const res = await playCard({ cardId: pendingCard.id, targetId });
    if (!res.ok) {
      setFeedback(`❗ ${res.error}`);
    } else {
      setFeedback(`✅ ${pendingCard.name} → 对手减速！`);
    }
    setPendingCard(null);
    setTimeout(() => setFeedback(''), 2500);
  };

  /** 直接骰子移动（不打牌） */
  const handleDiceMove = async () => {
    if (!canAct) return;
    const steps = Math.ceil(Math.random() * 4) + 1; // 随机 2-5 步
    const res = await movePlayer({ steps });
    if (!res.ok) {
      setFeedback(`❗ ${res.error}`);
    } else {
      setFeedback(`🎲 骰子：前进 ${steps} 格`);
    }
    setTimeout(() => setFeedback(''), 2500);
  };

  /** 结束回合 */
  const handleEndTurn = async () => {
    if (!isMyTurn) return;
    const res = await endTurn();
    if (!res.ok) setFeedback(`❗ ${res.error}`);
    setTimeout(() => setFeedback(''), 2500);
  };

  // ──────────────────────────────────────────────
  // 渲染
  // ──────────────────────────────────────────────
  return (
    <div className="w-full">
      {/* 回合提示 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs text-gray-500 uppercase tracking-widest">
          手牌 ({myHand.length})
        </h3>
        {isMyTurn ? (
          <span className="text-yellow-400 text-xs font-bold animate-pulse">⚡ 你的回合</span>
        ) : (
          <span className="text-gray-600 text-xs">等待其他玩家...</span>
        )}
      </div>

      {/* 反馈消息 */}
      {feedback && (
        <div className="mb-2 text-xs text-center text-cyan-300 bg-cyan-900/30 rounded-lg py-1">
          {feedback}
        </div>
      )}

      {/* 手牌列表 */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {myHand.length === 0 ? (
          <p className="text-gray-600 text-xs italic">暂无手牌</p>
        ) : (
          myHand.map((card) => {
            const vis = CARD_VISUAL[card.type] ?? { emoji: '❓', gradient: 'from-gray-700 to-gray-900' };
            return (
              <button
                key={card.id}
                onClick={() => handlePlayCard(card)}
                disabled={!canAct}
                className={`
                  flex-shrink-0 w-28 rounded-xl p-3 text-left border transition-all
                  bg-gradient-to-b ${vis.gradient}
                  ${canAct
                    ? 'border-gray-600 hover:border-cyan-400 hover:scale-105 cursor-pointer shadow-lg'
                    : 'border-gray-800 opacity-50 cursor-not-allowed'
                  }
                `}
              >
                <div className="text-xl mb-1">{vis.emoji}</div>
                <div className="text-xs font-bold text-white leading-tight">{card.name}</div>
                <div className="text-[10px] text-gray-400 mt-1 leading-tight">{card.description}</div>
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
          <button
            onClick={handleDiceMove}
            disabled={!canAct}
            className="flex-1 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white text-sm font-bold py-2 rounded-lg transition"
          >
            🎲 骰子移动
          </button>
          <button
            onClick={handleEndTurn}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold py-2 rounded-lg transition"
          >
            ⏭ 结束回合
          </button>
        </div>
      )}

      {/* 目标选择 Modal */}
      {targetSelectVisible && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-red-800 rounded-2xl p-6 w-80 space-y-3">
            <h3 className="text-white font-bold text-center">选择目标玩家</h3>
            <p className="text-gray-400 text-xs text-center">{pendingCard?.description}</p>

            {players
              .filter((p) => p.id !== mySocketId && !p.finished)
              .map((p) => {
                const colors = PLAYER_COLORS[p.colorIdx] ?? PLAYER_COLORS[0];
                return (
                  <button
                    key={p.id}
                    onClick={() => handleTargetSelected(p.id)}
                    className="w-full flex items-center gap-3 bg-gray-800 hover:bg-gray-700 rounded-xl px-4 py-2 transition"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: colors.hex }}
                    />
                    <span className="text-sm text-white">{p.name}</span>
                    <span className="ml-auto text-xs text-gray-500">格 {p.position}</span>
                  </button>
                );
              })}

            <button
              onClick={() => {
                setTargetSelectVisible(false);
                setPendingCard(null);
              }}
              className="w-full text-gray-500 hover:text-gray-300 text-xs mt-2"
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
