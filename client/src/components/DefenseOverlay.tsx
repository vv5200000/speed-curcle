/**
 * components/DefenseOverlay.tsx
 * 被攻击时的 5 秒防守弹窗
 */

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useSinglePlayer } from '../hooks/useSinglePlayer';

const DefenseOverlay: React.FC = () => {
  const pendingAttack = useGameStore(s => s.pendingAttack);
  const mySocketId = useGameStore(s => s.mySocketId);
  const isSinglePlayer = useGameStore(s => s.isSinglePlayer);
  const myHand = useGameStore(s => s.myHand);
  const { defendAttack } = useSinglePlayer();
  const [timeLeft, setTimeLeft] = useState(0);

  const myId = isSinglePlayer ? 'player' : mySocketId;
  const isTarget = pendingAttack && pendingAttack.targetId === myId;

  useEffect(() => {
    if (!isTarget || !pendingAttack) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, pendingAttack.expireAt - now);
      setTimeLeft(diff);
      if (diff <= 0) clearInterval(timer);
    }, 50);

    return () => clearInterval(timer);
  }, [isTarget, pendingAttack]);

  if (!isTarget || !pendingAttack) return null;

  const shieldCard = myHand.find(c => (c as any).type === 'shield');
  const progress = (timeLeft / 5000) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
      <div className="bg-gray-900 border-2 border-red-500 rounded-2xl p-6 w-80 shadow-[0_0_30px_#ef444460] animate-in fade-in zoom-in duration-300">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 text-red-500 text-3xl animate-pulse">
            ⚠️
          </div>
          
          <h2 className="text-xl font-bold text-white uppercase tracking-tighter">警告：遭遇攻击！</h2>
          <p className="text-gray-400 text-sm">对手正在对你发动电磁脉冲。你有 5 秒钟时间进行防御！</p>

          {/* 进度条 */}
          <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-red-500 transition-all duration-75 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-red-400 font-mono text-lg">{(timeLeft / 1000).toFixed(1)}s</div>

          {shieldCard ? (
            <button
              onClick={() => defendAttack(shieldCard.id)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transform transition active:scale-95 border-b-4 border-blue-800"
            >
              🛡️ 立即开启护盾
            </button>
          ) : (
            <div className="p-3 bg-gray-800/50 rounded-xl text-gray-500 text-xs italic">
              你没有护盾卡，准备承受冲击...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DefenseOverlay;
