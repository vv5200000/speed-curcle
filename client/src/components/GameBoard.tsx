/**
 * components/GameBoard.tsx
 * SVG 渲染格子赛道
 *
 * 渲染逻辑：
 *  - 赛道由 TRACK 数组定义，每个格子有 (x, y) 坐标
 *  - 棋盘以 7×7 网格为基础，格子大小 = CELL_SIZE
 *  - 玩家用圆形标记表示，同格时错开显示
 *  - 使用不同颜色区分：start(金)、corner(蓝)、pit(绿)、straight(灰)
 */

import React, { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { PLAYER_COLORS } from '../types/game';
import type { TrackCell } from '../types/game';

// SVG 视口尺寸
const SVG_WIDTH  = 560;
const SVG_HEIGHT = 420;

// 格子尺寸和间距
const CELL_SIZE = 64;
const CELL_PAD  = 6;   // 格子内边距

// 棋盘左上角偏移（留出边距）
const OFFSET_X = 32;
const OFFSET_Y = 20;

// 格子类型颜色
const CELL_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  start:    { fill: '#1c3a1c', stroke: '#22c55e', label: 'S'  },
  straight: { fill: '#1a2230', stroke: '#334155', label: ''   },
  corner:   { fill: '#1a2040', stroke: '#3b82f6', label: 'C'  },
  pit:      { fill: '#2a1a10', stroke: '#f97316', label: 'P'  },
};

// 格子中心坐标
function cellCenter(cell: TrackCell): [number, number] {
  return [
    OFFSET_X + cell.x * CELL_SIZE + CELL_SIZE / 2,
    OFFSET_Y + cell.y * CELL_SIZE + CELL_SIZE / 2,
  ];
}

// ──────────────────────────────────────────────
// 赛道连线（相邻格子之间画线）
// ──────────────────────────────────────────────
function TrackPath({ track }: { track: TrackCell[] }) {
  if (track.length < 2) return null;

  const points = track.map((c) => cellCenter(c));
  // 首尾相连
  const d = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`)
    .join(' ') + ` L ${points[0][0]} ${points[0][1]}`;

  return (
    <path
      d={d}
      fill="none"
      stroke="#334155"
      strokeWidth={3}
      strokeDasharray="6,3"
      opacity={0.5}
    />
  );
}

// ──────────────────────────────────────────────
// 单个格子
// ──────────────────────────────────────────────
function TrackCellRect({
  cell,
  isPlayerHere,
}: {
  cell: TrackCell;
  isPlayerHere: boolean;
}) {
  const cx = OFFSET_X + cell.x * CELL_SIZE;
  const cy = OFFSET_Y + cell.y * CELL_SIZE;
  const size = CELL_SIZE - CELL_PAD * 2;
  const visual = CELL_COLORS[cell.type] ?? CELL_COLORS['straight'];

  return (
    <g>
      {/* 格子背景 */}
      <rect
        x={cx + CELL_PAD}
        y={cy + CELL_PAD}
        width={size}
        height={size}
        rx={8}
        fill={visual.fill}
        stroke={isPlayerHere ? '#facc15' : visual.stroke}
        strokeWidth={isPlayerHere ? 2.5 : 1.5}
        filter={isPlayerHere ? 'url(#glow-yellow)' : undefined}
      />

      {/* 格子索引号 */}
      <text
        x={cx + CELL_SIZE / 2}
        y={cy + CELL_SIZE / 2 - 6}
        textAnchor="middle"
        fontSize={10}
        fill="#94a3b8"
      >
        {cell.idx}
      </text>

      {/* 格子类型标签 */}
      {visual.label && (
        <text
          x={cx + CELL_SIZE / 2}
          y={cy + CELL_SIZE / 2 + 8}
          textAnchor="middle"
          fontSize={9}
          fill={visual.stroke}
          fontWeight="bold"
        >
          {visual.label === 'S' ? '🏁' : visual.label === 'P' ? '🔧' : visual.label}
        </text>
      )}
    </g>
  );
}

// ──────────────────────────────────────────────
// 玩家标记
// ──────────────────────────────────────────────
function PlayerToken({
  playerId,
  colorIdx,
  name,
  position,
  track,
  offset,   // 同格玩家错开
}: {
  playerId: string;
  colorIdx: number;
  name: string;
  position: number;
  track: TrackCell[];
  offset: number;
}) {
  const cell = track[position];
  if (!cell) return null;

  const colors = PLAYER_COLORS[colorIdx] ?? PLAYER_COLORS[0];
  const [cx, cy] = cellCenter(cell);

  // 错开偏移（最多 4 人，按 2x2 排列）
  const offX = (offset % 2) * 14 - 7;
  const offY = Math.floor(offset / 2) * 14 - 7;

  return (
    <g>
      {/* 外光圈 */}
      <circle
        cx={cx + offX}
        cy={cy + offY}
        r={10}
        fill={colors.hex}
        opacity={0.3}
      />
      {/* 实心圆 */}
      <circle
        cx={cx + offX}
        cy={cy + offY}
        r={7}
        fill={colors.hex}
        stroke="#fff"
        strokeWidth={1.5}
      />
      {/* 名字（截取首字）*/}
      <text
        x={cx + offX}
        y={cy + offY + 4}
        textAnchor="middle"
        fontSize={8}
        fill="#fff"
        fontWeight="bold"
      >
        {name.charAt(0)}
      </text>
    </g>
  );
}

// ──────────────────────────────────────────────
// 主组件
// ──────────────────────────────────────────────
const GameBoard: React.FC = () => {
  const { track, players } = useGameStore();

  // 统计每个格子上的玩家（用于 isPlayerHere 高亮）
  const positionSet = useMemo(
    () => new Set(players.map((p) => p.position)),
    [players]
  );

  // 同格玩家计数（用于错开显示）
  const positionCounter: Record<number, number> = {};

  if (track.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-sm">
        正在加载赛道...
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width={SVG_WIDTH}
        height={SVG_HEIGHT}
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="mx-auto block"
        style={{ background: '#0f172a', borderRadius: '16px' }}
      >
        {/* SVG 滤镜：黄色发光 */}
        <defs>
          <filter id="glow-yellow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 赛道连线 */}
        <TrackPath track={track} />

        {/* 所有格子 */}
        {track.map((cell) => (
          <TrackCellRect
            key={cell.idx}
            cell={cell}
            isPlayerHere={positionSet.has(cell.idx)}
          />
        ))}

        {/* 玩家标记 */}
        {players.map((player) => {
          const offset = positionCounter[player.position] ?? 0;
          positionCounter[player.position] = offset + 1;
          return (
            <PlayerToken
              key={player.id}
              playerId={player.id}
              colorIdx={player.colorIdx}
              name={player.name}
              position={player.position}
              track={track}
              offset={offset}
            />
          );
        })}

        {/* 图例 */}
        <g transform="translate(460, 20)">
          {Object.entries(CELL_COLORS)
            .filter(([, v]) => v.label)
            .map(([type, v], i) => (
              <g key={type} transform={`translate(0, ${i * 18})`}>
                <rect x={0} y={0} width={10} height={10} rx={2} fill={v.fill} stroke={v.stroke} strokeWidth={1} />
                <text x={14} y={9} fontSize={9} fill="#94a3b8">
                  {type}
                </text>
              </g>
            ))}
        </g>
      </svg>
    </div>
  );
};

export default GameBoard;
