/**
 * components/PlayerStatus.tsx
 * 玩家状态栏：显示所有玩家的当前圈数、位置、手牌数、行动点
 */

import React from 'react';
import { useGameStore } from '../store/gameStore';
import { useSinglePlayer } from '../hooks/useSinglePlayer';
import { PLAYER_COLORS } from '../types/game';

const PlayerStatus: React.FC = () => {
  const { players, mySocketId, currentPlayerId, totalLaps } = useGameStore();
  const { isSinglePlayer } = useSinglePlayer();

  // 单机模式下，人类玩家 ID 是 'player'
  const myId = isSinglePlayer ? 'player' : mySocketId;

  return (
    <div className="flex flex-col gap-2 w-full">
      <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-1">玩家状态</h3>

      {players.map((player) => {
        const isMe      = player.id === myId;
        const isCurrent = player.id === currentPlayerId;
        const colors    = PLAYER_COLORS[player.colorIdx] ?? PLAYER_COLORS[0];

        return (
          <div
            key={player.id}
            className={`relative rounded-xl px-4 py-3 border transition-all ${
              isCurrent
                ? 'border-yellow-400 bg-gray-800 shadow-[0_0_10px_#facc1555]'
                : 'border-gray-700 bg-gray-900'
            }`}
          >
            {/* 当前回合指示器 */}
            {isCurrent && (
              <span className="absolute top-2 right-2 text-yellow-400 text-xs font-bold animate-pulse">
                ▶ 行动中
              </span>
            )}

            {/* 名称 + 颜色点 */}
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: colors.hex }}
              />
              <span className={`text-sm font-bold ${colors.text}`}>
                {player.name}
                {isMe && <span className="text-gray-500 font-normal ml-1 text-xs">（我）</span>}
                {player.finished && (
                  <span className="ml-1 text-xs text-yellow-400">
                    🏁 第 {player.rank} 名
                  </span>
                )}
              </span>
            </div>

            {/* 数据行 */}
            <div className="grid grid-cols-4 gap-2 text-center">
              {/* 圈数 */}
              <div className="bg-gray-800 rounded-lg p-1">
                <div className="text-[10px] text-gray-500">圈数</div>
                <div className="text-sm font-bold text-white">
                  {player.laps}/{totalLaps}
                </div>
              </div>

              {/* 位置 */}
              <div className="bg-gray-800 rounded-lg p-1">
                <div className="text-[10px] text-gray-500">格子</div>
                <div className="text-sm font-bold text-white">{player.position}</div>
              </div>

              {/* 手牌数 */}
              <div className="bg-gray-800 rounded-lg p-1">
                <div className="text-[10px] text-gray-500">手牌</div>
                <div className="text-sm font-bold text-white">🃏 {player.handCount}</div>
              </div>

              {/* 行动点 */}
              <div className="bg-gray-800 rounded-lg p-1">
                <div className="text-[10px] text-gray-500">行动</div>
                <div
                  className={`text-sm font-bold ${
                    player.actionPoints > 0 ? 'text-green-400' : 'text-gray-600'
                  }`}
                >
                  ⚡ {player.actionPoints}
                </div>
              </div>
            </div>

            {/* 进度条（基于位置估算） */}
            <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (player.position / 24) * 100)}%`,
                  backgroundColor: colors.hex,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PlayerStatus;
