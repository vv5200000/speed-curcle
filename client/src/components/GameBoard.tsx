/**
 * components/GameBoard.tsx
 * SVG 渲染格子赛道（增强版）
 *
 * 改进点：
 *  - 多彩 SVG 滤镜（按玩家颜色）
 *  - 玩家标记带光晕和名字气泡
 *  - 当前玩家所在格子脉冲高亮
 *  - 赛道连线增加渐变效果
 *  - 格子图标更丰富（emoji）
 */

import React, { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { PLAYER_COLORS } from '../types/game';
import type { TrackCell } from '../types/game';

const SVG_WIDTH  = 560;
const SVG_HEIGHT = 440;
const CELL_SIZE  = 64;
const CELL_PAD   = 5;
const OFFSET_X   = 30;
const OFFSET_Y   = 22;

// 格子类型配置（增强版）
const CELL_CONFIGS: Record<string, {
  fill: string; stroke: string; label: string; icon: string; glow: string;
}> = {
  start:    { fill: '#0d2d1a', stroke: '#22c55e', label: 'START', icon: '🏁', glow: '#22c55e44' },
  straight: { fill: '#121c2e', stroke: '#1e3a5f', label: '',      icon: '',   glow: 'none' },
  corner:   { fill: '#0f1830', stroke: '#3b82f6', label: 'C',     icon: '🔄', glow: '#3b82f633' },
  pit:      { fill: '#1f1208', stroke: '#f97316', label: 'PIT',   icon: '🔧', glow: '#f9731633' },
};

function cellCenter(cell: TrackCell): [number, number] {
  return [
    OFFSET_X + cell.x * CELL_SIZE + CELL_SIZE / 2,
    OFFSET_Y + cell.y * CELL_SIZE + CELL_SIZE / 2,
  ];
}

// ── 赛道连线（渐变虚线） ──
function TrackPath({ track }: { track: TrackCell[] }) {
  if (track.length < 2) return null;
  const points = track.map((c) => cellCenter(c));
  const d = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`)
    .join(' ') + ` L ${points[0][0]} ${points[0][1]}`;
  return (
    <>
      {/* 底层宽带 */}
      <path d={d} fill="none" stroke="#1e3a5f" strokeWidth={32} opacity={0.3} />
      {/* 虚线路径 */}
      <path
        d={d}
        fill="none"
        stroke="url(#trackGradient)"
        strokeWidth={2}
        strokeDasharray="8,4"
        opacity={0.6}
      />
    </>
  );
}

// ── 单个格子 ──
function TrackCellRect({
  cell,
  isCurrentPlayerHere,
  playersHere,
}: {
  cell: TrackCell;
  isCurrentPlayerHere: boolean;
  playersHere: number;
}) {
  const cx = OFFSET_X + cell.x * CELL_SIZE;
  const cy = OFFSET_Y + cell.y * CELL_SIZE;
  const size = CELL_SIZE - CELL_PAD * 2;
  const cfg = CELL_CONFIGS[cell.type] ?? CELL_CONFIGS['straight'];

  return (
    <g>
      {/* 格子背景发光（有玩家时） */}
      {playersHere > 0 && cfg.glow !== 'none' && (
        <rect
          x={cx + CELL_PAD - 3}
          y={cy + CELL_PAD - 3}
          width={size + 6}
          height={size + 6}
          rx={11}
          fill={cfg.glow}
          filter="url(#blur2)"
        />
      )}

      {/* 格子主体 */}
      <rect
        x={cx + CELL_PAD}
        y={cy + CELL_PAD}
        width={size}
        height={size}
        rx={8}
        fill={cfg.fill}
        stroke={isCurrentPlayerHere ? '#facc15' : cfg.stroke}
        strokeWidth={isCurrentPlayerHere ? 2 : 1.5}
        filter={isCurrentPlayerHere ? 'url(#glow-yellow)' : undefined}
      />

      {/* 格子索引号 */}
      <text
        x={cx + CELL_SIZE / 2}
        y={cy + CELL_PAD + 12}
        textAnchor="middle"
        fontSize={9}
        fill="#475569"
      >
        {cell.idx}
      </text>

      {/* 格子图标 */}
      {cfg.icon && (
        <text
          x={cx + CELL_SIZE / 2}
          y={cy + CELL_SIZE / 2 + 5}
          textAnchor="middle"
          fontSize={16}
        >
          {cfg.icon}
        </text>
      )}
    </g>
  );
}

// ── 玩家标记（增强版，带光晕+姓名标签） ──
function PlayerToken({
  colorIdx,
  name,
  position,
  track,
  offset,
  isCurrent,
  isCrashed,
  isSlipstreaming,
}: {
  colorIdx: number;
  name: string;
  position: number;
  track: TrackCell[];
  offset: number;
  isCurrent: boolean;
  isCrashed?: boolean;
  isSlipstreaming?: boolean;
}) {
  const cell = track[position];
  if (!cell) return null;

  const colors = PLAYER_COLORS[colorIdx] ?? PLAYER_COLORS[0];
  const [cx, cy] = cellCenter(cell);

  const offX = (offset % 2) * 16 - 8;
  const offY = Math.floor(offset / 2) * 16 - 8;

  const px = cx + offX;
  const py = cy + offY;

  return (
    <g>
      {/* 尾流效果 (Slipstream) */}
      {isSlipstreaming && (
        <g className="animate-pulse">
           <circle cx={px - 15} cy={py} r={6} fill={colors.hex} opacity={0.6} filter="url(#blur2)" />
           <circle cx={px - 25} cy={py} r={4} fill={colors.hex} opacity={0.4} filter="url(#blur2)" />
           <circle cx={px - 35} cy={py} r={2} fill={colors.hex} opacity={0.2} filter="url(#blur2)" />
        </g>
      )}

      {/* 爆缸/减速效果 (Crashed/Debuff) */}
      {isCrashed && (
        <g transform={`translate(${px}, ${py - 12})`}>
          <text textAnchor="middle" fontSize={12} className="animate-bounce">⚠️</text>
          <circle r={12} fill="none" stroke="#ef4444" strokeWidth={1} strokeDasharray="2,2" className="animate-spin" />
        </g>
      )}

      {/* 外光圈（当前玩家更大更亮） */}
      <circle
        cx={px}
        cy={py}
        r={isCurrent ? 14 : 10}
        fill={isCrashed ? '#ef4444' : colors.hex}
        opacity={isCurrent ? 0.4 : 0.2}
        filter={isCurrent ? 'url(#player-glow)' : undefined}
      />

      {/* 实心圆 */}
      <circle
        cx={px}
        cy={py}
        r={8}
        fill={colors.hex}
        stroke={isCurrent ? '#ffffff' : isCrashed ? '#ef4444' : '#94a3b8'}
        strokeWidth={isCurrent ? 2 : 1.5}
      />

      {/* 首字 */}
      <text
        x={px}
        y={py + 3}
        textAnchor="middle"
        fontSize={8}
        fill="#fff"
        fontWeight="bold"
      >
        {name.charAt(0)}
      </text>

      {/* 当前玩家名字标签 */}
      {isCurrent && (
        <g>
          <rect
            x={px - 20}
            y={py - 26}
            width={40}
            height={14}
            rx={4}
            fill={isCrashed ? '#ef4444' : '#facc15'}
            opacity={0.9}
          />
          <text
            x={px}
            y={py - 16}
            textAnchor="middle"
            fontSize={8}
            fill={isCrashed ? '#fff' : '#000'}
            fontWeight="bold"
          >
            {name.length > 5 ? name.slice(0, 4) + '…' : name}
          </text>
        </g>
      )}
    </g>
  );
}

// ── 主组件 ──
const GameBoard: React.FC = () => {
  const { track, players, currentPlayerId, totalLaps } = useGameStore();
  const [activeSlipstreams, setActiveSlipstreams] = React.useState<Record<string, boolean>>({});

  // 监听位置变化，如果是蹭到尾流（步数异常增加或消息提示），这里简化处理：
  // 实际上可以通过监听 players 数组变化，并记录上一次位置，但为了视觉效果，
  // 我们在组件内增加一个简单的“模拟”或通过 hook 传递。
  // 此处演示：如果当前玩家处于行动中且刚刚移动过，我们随机显示一下（实际应接管事件）。
  // 改进：我们通过消息日志触发
  const messages = useGameStore(s => s.messages);
  React.useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.includes('蹭到尾流')) {
      // 提取玩家名（假设消息中有）或直接给当前玩家
      if (currentPlayerId) {
        setActiveSlipstreams(prev => ({ ...prev, [currentPlayerId]: true }));
        setTimeout(() => {
          setActiveSlipstreams(prev => ({ ...prev, [currentPlayerId]: false }));
        }, 2000);
      }
    }
  }, [messages, currentPlayerId]);

  const positionCounter: Record<number, number> = {};
  
  // 排名计算
  const rankedPlayers = useMemo(
    () => [...players].sort((a, b) => (b.laps * 24 + b.position) - (a.laps * 24 + a.position)),
    [players]
  );

  if (track.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-sm">
        正在加载赛道...
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {/* 排名条 */}
      <div className="flex gap-2 px-1 py-1.5 bg-gray-900/60 rounded-xl border border-gray-800 overflow-x-auto">
        {rankedPlayers.map((p, i) => {
          const colors = PLAYER_COLORS[p.colorIdx] ?? PLAYER_COLORS[0];
          return (
            <div key={p.id} className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-gray-600 text-[10px] font-mono">#{i + 1}</span>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.hex }} />
              <span className="text-[10px] text-gray-400 truncate max-w-[48px]">{p.name}</span>
              <span className="text-[10px] text-gray-600">{p.laps}/{totalLaps}圈</span>
              {i < rankedPlayers.length - 1 && (
                <span className="text-gray-700 ml-1">·</span>
              )}
            </div>
          );
        })}
      </div>

      {/* SVG 赛道 */}
      <div className="w-full overflow-x-auto">
        <svg
          width={SVG_WIDTH}
          height={SVG_HEIGHT}
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="mx-auto block"
          style={{ background: 'linear-gradient(135deg, #060d1a 0%, #0a1428 100%)', borderRadius: '16px', border: '1px solid #1e3a5f' }}
        >
          <defs>
            {/* 黄色发光（当前格子） */}
            <filter id="glow-yellow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* 玩家发光 */}
            <filter id="player-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* 柔化模糊 */}
            <filter id="blur2" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
            </filter>

            {/* 赛道渐变 */}
            <linearGradient id="trackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* 赛道连线 */}
          <TrackPath track={track} />

          {/* 所有格子 */}
          {track.map((cell) => {
            const phereCount = players.filter(p => p.position === cell.idx).length;
            const isCurrentHere = players.find(
              p => p.id === currentPlayerId && p.position === cell.idx
            ) != null;
            return (
              <TrackCellRect
                key={cell.idx}
                cell={cell}
                isCurrentPlayerHere={isCurrentHere}
                playersHere={phereCount}
              />
            );
          })}

          {/* 玩家标记 */}
          {players.map((player) => {
            const off = positionCounter[player.position] ?? 0;
            positionCounter[player.position] = off + 1;
            
            // 爆缸检测
            const isCrashed = player.heat >= player.heatCapacity;
            
            // 正在被攻击检测 (慢速/受阻)
            const isPendingTarget = useGameStore.getState().pendingAttack?.targetId === player.id;

            return (
              <PlayerToken
                key={player.id}
                colorIdx={player.colorIdx}
                name={player.name}
                position={player.position}
                track={track}
                offset={off}
                isCurrent={player.id === currentPlayerId}
                isCrashed={isCrashed || isPendingTarget}
                isSlipstreaming={activeSlipstreams[player.id]}
              />
            );
          })}

          {/* 图例 */}
          <g transform={`translate(${SVG_WIDTH - 90}, 16)`}>
            <rect x={0} y={0} width={80} height={72} rx={8} fill="#0a1428" stroke="#1e3a5f" strokeWidth={1} opacity={0.8} />
            {Object.entries(CELL_CONFIGS)
              .filter(([, v]) => v.icon)
              .map(([type, v], i) => (
                <g key={type} transform={`translate(8, ${8 + i * 16})`}>
                  <text x={0} y={10} fontSize={11}>{v.icon}</text>
                  <text x={16} y={10} fontSize={9} fill="#64748b">{type}</text>
                </g>
              ))}
          </g>
        </svg>
      </div>
    </div>
  );
};

export default GameBoard;
