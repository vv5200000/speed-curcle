/**
 * types/game.ts
 * 游戏核心 TypeScript 类型定义
 * 与服务端 GameRoom.js / Player.js / CardDeck.js 数据结构保持一致
 */

// ──────────────────────────────────────────────
// 赛道相关
// ──────────────────────────────────────────────

/** 赛道格子类型 */
export type CellType = 'start' | 'straight' | 'corner' | 'pit';

export interface TrackCell {
  idx: number;   // 格子在赛道数组中的索引
  type: CellType;
  x: number;     // 棋盘列坐标
  y: number;     // 棋盘行坐标
  speedLimit?: number; // 弯道限速 (Phase 3)
}

// ──────────────────────────────────────────────
// 卡牌相关
// ──────────────────────────────────────────────

/** 卡牌类型 */
export type CardType = 'move' | 'boost' | 'shield' | 'slow' | 'shortcut';

/** 卡牌对象 */
export interface Card {
  id: string;
  type: CardType;
  name: string;
  description: string;
  value: number;   // 正数为增益，负数为减益
}

/** 卡牌效果广播载荷 */
export interface CardEffect {
  type: CardType;
  value: number;
  actorId: string;
  targetId?: string;
  newPosition?: number;
  newActionPoints?: number;
  lapCompleted?: boolean;
  finished?: boolean;
  shielded?: boolean;
  blocked?: boolean;
  heatAdded?: number;
  crashed?: boolean;
  heat?: number;
  slipstream?: boolean;          // Phase 4: 尾流触发标识
  slipstreamTargetId?: string;   // Phase 4: 蹭到了谁的尾流
}

// ──────────────────────────────────────────────
// 玩家相关
// ──────────────────────────────────────────────

/** 玩家公开信息（广播给所有人） */
export interface PublicPlayer {
  id: string;
  name: string;
  colorIdx: number;    // 0-3，用于选择颜色
  position: number;    // 当前赛道格子索引
  laps: number;        // 已完成圈数
  finished: boolean;
  rank: number;        // 完赛名次（0 = 未完赛）
  handCount: number;   // 手牌数量
  actionPoints: number;
  ready: boolean;
  shielded?: boolean;
  gear: number;
  heat: number;
  heatCapacity: number;
  tireTemp: 'cold' | 'warm';
}

/** 玩家私有信息（仅发给本人） */
export interface PrivatePlayer extends PublicPlayer {
  hand: Card[];
}

// ──────────────────────────────────────────────
// 游戏阶段
// ──────────────────────────────────────────────

export type GamePhase = 'lobby' | 'playing' | 'finished';

// ──────────────────────────────────────────────
// 牌组统计
// ──────────────────────────────────────────────

export interface DeckStats {
  drawPile: number;
  discardPile: number;
}

// ──────────────────────────────────────────────
// 游戏状态
// ──────────────────────────────────────────────

/** 公共游戏状态（所有人可见） */
export interface PublicGameState {
  roomId: string;
  roomName: string;
  phase: GamePhase;
  turnOrder: string[];            // 玩家 id 数组，按回合顺序
  currentTurnIndex: number;
  currentPlayerId: string | null;
  players: PublicPlayer[];
  track: TrackCell[];
  totalLaps: number;
  deckStats: DeckStats | null;
  pendingAttack: { 
    attackerId: string; 
    targetId: string; 
    cardId: string; 
    expireAt: number 
  } | null; // Phase 4: 挂起的攻击状态
}

/** 私有游戏状态（含本人手牌） */
export interface PrivateGameState extends PublicGameState {
  myHand: Card[];
}

// ──────────────────────────────────────────────
// Socket 事件载荷
// ──────────────────────────────────────────────

/** create-room 请求 */
export interface CreateRoomPayload {
  roomName: string;
  playerName: string;
}

/** join-room 请求 */
export interface JoinRoomPayload {
  roomId: string;
  playerName: string;
}

/** play-card 请求 */
export interface PlayCardPayload {
  cardId: string;
  targetId?: string;
}

/** defend-attack 请求 (Phase 4) */
export interface DefendAttackPayload {
  cardId: string; // shield 卡的 ID
}

/** change-gear 请求 */
export interface ChangeGearPayload {
  targetGear: number;
}

/** player-move 请求 */
export interface PlayerMovePayload {
  steps: number;
}

/** card-played 广播 */
export interface CardPlayedEvent {
  playerId: string;
  effect: CardEffect;
}

/** attack-pending 广播 (Phase 4) */
export interface AttackPendingEvent {
  attackerId: string;
  targetId: string;
  cardId: string;
  expireAt: number;
}

/** player-moved 广播 */
export interface PlayerMovedEvent {
  playerId: string;
  newPosition: number;
  lapCompleted: boolean;
  finished: boolean;
  slipstream?: boolean;
}

/** player-gear-changed 广播 */
export interface PlayerGearChangedEvent {
  playerId: string;
  gear: number;
  heat: number;
}

/** player-disconnected 广播 */
export interface PlayerDisconnectedEvent {
  playerId: string;
  playerName: string;
}

/** game-over 广播 */
export interface GameOverEvent {
  rankings: Array<{
    rank: number;
    playerId: string;
    name: string;
    laps: number;
  }>;
}

/** 通用错误响应 */
export interface ErrorPayload {
  error: string;
}

/** ack 回调通用结果 */
export interface AckResult {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}

// ──────────────────────────────────────────────
// 颜色映射（colorIdx → Tailwind/hex）
// ──────────────────────────────────────────────

export const PLAYER_COLORS: Record<number, { bg: string; text: string; hex: string }> = {
  0: { bg: 'bg-cyan-500',    text: 'text-cyan-400',    hex: '#06b6d4' },
  1: { bg: 'bg-pink-500',    text: 'text-pink-400',    hex: '#ec4899' },
  2: { bg: 'bg-yellow-400',  text: 'text-yellow-300',  hex: '#facc15' },
  3: { bg: 'bg-green-500',   text: 'text-green-400',   hex: '#22c55e' },
};
