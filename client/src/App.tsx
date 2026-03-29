/**
 * App.tsx（增强版）
 * 改进：
 *  - 消息日志颜色分类（🎲移动/💳卡牌/⚡系统/❗错误）
 *  - 游戏结束界面庆祝动画（#1 名特效）
 *  - 顶部 header 加牌组统计徽标
 */

import React from 'react';
import { useGameStore } from './store/gameStore';
import { useSocket } from './hooks/useSocket';

import Lobby        from './components/Lobby';
import GameBoard    from './components/GameBoard';
import CardHand     from './components/CardHand';
import PlayerStatus from './components/PlayerStatus';
import GameRulesModal from './components/GameRulesModal';
import DefenseOverlay from './components/DefenseOverlay';

// 根据消息内容决定颜色
function getMessageColor(msg: string): string {
  if (msg.startsWith('🎲') || msg.startsWith('🏎')) return 'text-purple-400';
  if (msg.startsWith('💳') || msg.startsWith('✅')) return 'text-green-400';
  if (msg.startsWith('❗') || msg.startsWith('⚠')) return 'text-red-400';
  if (msg.startsWith('🤖')) return 'text-cyan-400';
  if (msg.startsWith('🎉') || msg.startsWith('🏆') || msg.startsWith('👑')) return 'text-yellow-400';
  if (msg.startsWith('⏭')) return 'text-gray-500';
  if (msg.startsWith('🛡')) return 'text-blue-400';
  return 'text-gray-400';
}

const App: React.FC = () => {
  useSocket();

  const { phase, roomName, roomId, gameOver, rankings, mySocketId, players, messages, reset, deckStats } =
    useGameStore();
  const [isRulesOpen, setIsRulesOpen] = React.useState(false);

  // ── 游戏结束界面 ──────────────────────────────
  if (gameOver || phase === 'finished') {
    const winner = rankings.find(r => r.rank === 1);
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
        {/* 背景光晕（冠军颜色） */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl" />
        </div>

        {/* 标题 */}
        <div className="text-center mb-8 relative">
          <div className="text-6xl mb-3 animate-bounce">🏆</div>
          <h1 className="text-4xl font-extrabold text-yellow-400 drop-shadow-[0_0_16px_#facc15]">
            游戏结束！
          </h1>
          {winner && (
            <p className="text-gray-400 text-sm mt-2">
              🥇 <span className="text-yellow-300 font-bold">{winner.name}</span> 夺得冠军！
            </p>
          )}
          <p className="text-gray-600 text-xs mt-1">{roomName}</p>
        </div>

        {/* 排行榜 */}
        <div className="w-full max-w-sm space-y-2 relative">
          {rankings.map((r) => (
            <div
              key={r.playerId}
              className={`flex items-center gap-4 rounded-xl px-4 py-3 border transition-all ${
                r.rank === 1
                  ? 'bg-yellow-900/30 border-yellow-500 shadow-[0_0_12px_#facc1540]'
                  : r.rank === 2
                  ? 'bg-gray-700/30 border-gray-400'
                  : r.rank === 3
                  ? 'bg-amber-900/20 border-amber-700'
                  : 'bg-gray-900/60 border-gray-800'
              }`}
            >
              <span className="text-3xl w-8 text-center">
                {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`}
              </span>
              <div className="flex-1">
                <div className="font-bold text-sm flex items-center gap-1">
                  {r.name}
                  {r.playerId === mySocketId && (
                    <span className="text-gray-500 text-xs font-normal">（你）</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">完成 {r.laps} 圈</div>
              </div>
              {r.rank === 1 && <span className="text-yellow-400 text-sm animate-pulse">👑</span>}
            </div>
          ))}
        </div>

        <button
          onClick={reset}
          className="mt-8 bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg shadow-cyan-900/30"
        >
          🔄 返回大厅
        </button>
      </div>
    );
  }

  // ── 大厅 ─────────────────────────────────────
  if (phase === 'lobby') {
    return <Lobby />;
  }

  // ── 游戏主界面 ────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* 顶部导航栏 */}
      <header className="flex items-center justify-between px-4 py-2 bg-gray-900/95 border-b border-gray-800 backdrop-blur-sm">
        <h1 className="text-sm font-extrabold tracking-widest text-cyan-400 drop-shadow-[0_0_8px_#06b6d4]">
          NEON DISTRICT RACING
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsRulesOpen(true)}
            className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 bg-gray-800 hover:text-cyan-300 hover:bg-gray-700 px-2 py-1 rounded-md transition-colors"
          >
            ❓ 游戏规则
          </button>
          
          {deckStats && (
            <div className="hidden sm:flex items-center gap-1 text-[10px] text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">
              <span title="摸牌堆">🃏{deckStats.drawPile}</span>
              <span className="text-gray-700">|</span>
              <span title="弃牌堆">🗑{deckStats.discardPile}</span>
            </div>
          )}
          {roomId && (
            <span className="text-xs text-gray-500 font-mono bg-gray-800 px-2 py-0.5 rounded">
              {roomId}
            </span>
          )}
          <span className="text-xs text-gray-500 truncate max-w-[80px]">{roomName}</span>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex flex-1 overflow-hidden">
        {/* 左侧：赛道 */}
        <div className="flex-1 flex flex-col items-center justify-start p-3 overflow-auto">
          <GameBoard />

          {/* 消息日志（颜色分类版） */}
          <div className="mt-3 w-full max-w-xl bg-gray-900/80 border border-gray-800 rounded-xl p-2.5 max-h-28 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-gray-700 text-xs text-center">游戏日志</p>
            ) : (
              messages.slice(-8).map((m, i) => (
                <p key={i} className={`text-xs leading-relaxed ${getMessageColor(m)}`}>
                  {m}
                </p>
              ))
            )}
          </div>
        </div>

        {/* 右侧面板 */}
        <aside className="w-72 flex-shrink-0 flex flex-col gap-3 p-3 bg-gray-900/90 border-l border-gray-800 overflow-y-auto">
          {/* 玩家状态 */}
          <PlayerStatus />

          {/* 分隔线 */}
          <div className="border-t border-gray-800" />

          {/* 手牌区 */}
          <CardHand />
        </aside>
      </main>

      {/* 规则说明弹窗 */}
      <GameRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      {/* 防守弹窗 (Phase 4) */}
      <DefenseOverlay />
    </div>
  );
};

export default App;
