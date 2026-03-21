/**
 * components/PlayerStatus.tsx
 * 玩家状态栏：显示所有玩家的当前圈数、位置、手牌数、行动点、护盾状态
 */

import React from 'react';
import { useGameStore } from '../store/gameStore';
import { useSinglePlayer } from '../hooks/useSinglePlayer';
import { PLAYER_COLORS } from '../types/game';

const TRACK_LENGTH = 24;

const PlayerStatus: React.FC = () => {
  const { players, mySocketId, currentPlayerId, totalLaps, deckStats } = useGameStore();
  const { isSinglePlayer } = useSinglePlayer();

  // 单机模式下，人类玩家 ID 是 'player'
  const myId = isSinglePlayer ? 'player' : mySocketId;

  // 计算总进度（圈数 + 当前格子位置占比），用于进度条
  const getOverallProgress = (laps: number, position: number) => {
    const totalCells = totalLaps * TRACK_LENGTH;
    const doneCells = laps * TRACK_LENGTH + position;
    return Math.min(100, (doneCells / totalCells) * 100);
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* 标题 + 牌组统计 */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs text-gray-500 uppercase tracking-widest">玩家状态</h3>
        {deckStats && (
          <div className="flex items-center gap-2 text-[10px] text-gray-600">
            <span title="摸牌堆">🃏 {deckStats.drawPile}</span>
            <span title="弃牌堆">🗑 {deckStats.discardPile}</span>
          </div>
        )}
      </div>

      {players.map((player) => {
        const isMe      = player.id === myId;
        const isCurrent = player.id === currentPlayerId;
        const colors    = PLAYER_COLORS[player.colorIdx] ?? PLAYER_COLORS[0];
        const progress  = getOverallProgress(player.laps, player.position);

        return (
          <div
            key={player.id}
            className={`relative rounded-xl px-3 py-3 border transition-all duration-300 ${
              isCurrent
                ? 'border-yellow-400 bg-gray-800 shadow-[0_0_14px_#facc1540]'
                : 'border-gray-700 bg-gray-900 hover:border-gray-600'
            } ${player.finished ? 'opacity-70' : ''}`}
          >
            {/* 当前回合指示器 */}
            {isCurrent && !player.finished && (
              <span className="absolute top-2 right-2 text-yellow-400 text-[10px] font-bold animate-pulse">
                ▶ 行动中
              </span>
            )}

            {/* 完赛标记 */}
            {player.finished && (
              <span className="absolute top-2 right-2 text-yellow-400 text-[10px] font-bold">
                🏁 #{player.rank}
              </span>
            )}

            {/* 名称行 */}
            <div className="flex items-center gap-2 mb-2">
              {/* 颜色圆点（带护盾圆环） */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: colors.hex }}
                />
                {/* 护盾状态 - 外圈蓝色发光环 */}
                {(player as any).shielded && (
                  <div
                    className="absolute -inset-1 rounded-full border-2 border-blue-400 animate-pulse"
                    title="护盾激活"
                  />
                )}
              </div>

              <span className={`text-sm font-bold ${colors.text} truncate max-w-[90px]`}>
                {player.name}
                {isMe && <span className="text-gray-500 font-normal ml-1 text-xs">（我）</span>}
              </span>
            </div>

            {/* 圈数标签行 */}
            <div className="flex items-center gap-1 mb-2">
              {Array.from({ length: totalLaps }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                    i < player.laps
                      ? ''
                      : 'bg-gray-700'
                  }`}
                  style={i < player.laps ? { backgroundColor: colors.hex } : {}}
                />
              ))}
              <span className="text-[10px] text-gray-500 ml-1 whitespace-nowrap">
                {player.laps}/{totalLaps}圈
              </span>
            </div>

            {/* 数据行 */}
            <div className="grid grid-cols-3 gap-1.5 text-center">
              {/* 格子位置 */}
              <div className="bg-gray-800/80 rounded-lg py-1 px-0.5">
                <div className="text-[9px] text-gray-500">格子</div>
                <div className="text-xs font-bold text-white">#{player.position}</div>
              </div>

              {/* 手牌数 */}
              <div className="bg-gray-800/80 rounded-lg py-1 px-0.5">
                <div className="text-[9px] text-gray-500">手牌</div>
                <div className="text-xs font-bold text-white">🃏 {player.handCount}</div>
              </div>

              {/* 行动点 */}
              <div className="bg-gray-800/80 rounded-lg py-1 px-0.5">
                <div className="text-[9px] text-gray-500">行动</div>
                <div
                  className={`text-xs font-bold ${
                    player.actionPoints > 0 ? 'text-green-400' : 'text-gray-600'
                  }`}
                >
                  ⚡ {player.actionPoints}
                </div>
              </div>
            </div>

            {/* 总进度条 */}
            <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${colors.hex}88, ${colors.hex})`,
                  boxShadow: isCurrent ? `0 0 6px ${colors.hex}` : undefined,
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
              <span>出发</span>
              <span>{Math.round(progress)}%</span>
              <span>终点</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PlayerStatus;
