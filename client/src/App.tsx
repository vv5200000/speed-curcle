/**
 * App.tsx
 * 应用根组件：根据游戏阶段渲染不同界面
 *
 * 阶段：
 *   lobby    → Lobby 大厅
 *   playing  → 游戏主界面（GameBoard + CardHand + PlayerStatus）
 *   finished → 结束界面（排行榜）
 */

import React, { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { useSocket } from './hooks/useSocket';

import Lobby        from './components/Lobby';
import GameBoard    from './components/GameBoard';
import CardHand     from './components/CardHand';
import PlayerStatus from './components/PlayerStatus';

const App: React.FC = () => {
  // 初始化 Socket 连接（hook 内部处理单例）
  useSocket();

  const { phase, roomName, roomId, gameOver, rankings, mySocketId, players, messages, reset } =
    useGameStore();

  // ── 游戏结束界面 ──────────────────────────────
  if (gameOver || phase === 'finished') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-white">
        <h1 className="text-3xl font-extrabold text-yellow-400 mb-2 drop-shadow-[0_0_12px_#facc15]">
          🏆 游戏结束！
        </h1>
        <p className="text-gray-500 text-sm mb-8">{roomName}</p>

        <div className="w-full max-w-sm space-y-3">
          {rankings.map((r) => (
            <div
              key={r.playerId}
              className={`flex items-center gap-4 rounded-xl px-4 py-3 border ${
                r.rank === 1
                  ? 'bg-yellow-900/30 border-yellow-500'
                  : r.rank === 2
                  ? 'bg-gray-700/30 border-gray-400'
                  : r.rank === 3
                  ? 'bg-amber-900/30 border-amber-700'
                  : 'bg-gray-900 border-gray-700'
              }`}
            >
              <span className="text-2xl">
                {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`}
              </span>
              <div className="flex-1">
                <div className="font-bold text-sm">
                  {r.name}
                  {r.playerId === mySocketId && (
                    <span className="ml-1 text-gray-500 text-xs font-normal">（你）</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">完成 {r.laps} 圈</div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={reset}
          className="mt-8 bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-8 py-3 rounded-xl transition"
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
      <header className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <h1 className="text-lg font-extrabold tracking-widest text-cyan-400">
          NEON DISTRICT RACING
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 font-mono bg-gray-800 px-2 py-0.5 rounded">
            {roomId}
          </span>
          <span className="text-xs text-gray-400">{roomName}</span>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex flex-1 overflow-hidden">
        {/* 左侧：赛道 */}
        <div className="flex-1 flex flex-col items-center justify-start p-4 overflow-auto">
          <GameBoard />

          {/* 消息日志 */}
          <div className="mt-4 w-full max-w-xl bg-gray-900 border border-gray-800 rounded-xl p-3 max-h-24 overflow-y-auto">
            {messages.slice(-6).map((m, i) => (
              <p key={i} className="text-xs text-gray-400 leading-relaxed">
                {m}
              </p>
            ))}
          </div>
        </div>

        {/* 右侧面板 */}
        <aside className="w-72 flex-shrink-0 flex flex-col gap-4 p-4 bg-gray-900 border-l border-gray-800 overflow-y-auto">
          {/* 玩家状态 */}
          <PlayerStatus />

          {/* 分隔线 */}
          <div className="border-t border-gray-800" />

          {/* 手牌区 */}
          <CardHand />
        </aside>
      </main>
    </div>
  );
};

export default App;
