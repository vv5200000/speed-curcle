/**
 * store/gameStore.ts
 * 使用 Zustand 管理全局游戏状态
 */

import { create } from 'zustand';
import type {
  PrivateGameState,
  PublicGameState,
  Card,
  GamePhase,
  TrackCell,
  PublicPlayer,
  DeckStats,
} from '../types/game';

// ──────────────────────────────────────────────
// Store 接口定义
// ──────────────────────────────────────────────

interface GameStore {
  // ── 连接状态 ──
  connected: boolean;
  setConnected: (v: boolean) => void;

  // ── 房间信息 ──
  roomId: string | null;
  roomName: string;
  mySocketId: string | null;
  myName: string;

  setRoom: (roomId: string, roomName: string) => void;
  setMySocketId: (id: string) => void;
  setMyName: (name: string) => void;

  // ── 游戏阶段 ──
  phase: GamePhase;

  // ── 玩家列表（公开） ──
  players: PublicPlayer[];

  // ── 我的手牌 ──
  myHand: Card[];

  // ── 回合信息 ──
  turnOrder: string[];
  currentTurnIndex: number;
  currentPlayerId: string | null;

  // ── 赛道 ──
  track: TrackCell[];
  totalLaps: number;

  // ── 牌组统计 ──
  deckStats: DeckStats | null;

  // ── 游戏结束 ──
  gameOver: boolean;
  rankings: Array<{ rank: number; playerId: string; name: string; laps: number }>;

  // ── 单机模式状态 ──
  isSinglePlayer: boolean;
  setIsSinglePlayer: (v: boolean) => void;
  aiCount: number;
  setAiCount: (n: number) => void;
  isAiTurn: boolean;
  setIsAiTurn: (v: boolean) => void;

  // ── 消息日志 ──
  messages: string[];
  addMessage: (msg: string) => void;

  // ── 更新方法 ──
  applyPublicState: (state: PublicGameState) => void;
  applyPrivateState: (state: PrivateGameState) => void;
  setGameOver: (
    rankings: Array<{ rank: number; playerId: string; name: string; laps: number }>
  ) => void;
  reset: () => void;
}

// ──────────────────────────────────────────────
// 默认值
// ──────────────────────────────────────────────

const DEFAULT_STATE = {
  connected: false,
  roomId: null as string | null,
  roomName: '',
  mySocketId: null as string | null,
  myName: '',
  phase: 'lobby' as GamePhase,
  players: [] as PublicPlayer[],
  myHand: [] as Card[],
  turnOrder: [] as string[],
  currentTurnIndex: 0,
  currentPlayerId: null as string | null,
  track: [] as TrackCell[],
  totalLaps: 3,
  deckStats: null as DeckStats | null,
  gameOver: false,
  rankings: [] as Array<{ rank: number; playerId: string; name: string; laps: number }>,
  messages: [] as string[],
  isSinglePlayer: false,
  aiCount: 2,
  isAiTurn: false,
};

// ──────────────────────────────────────────────
// Store 实现
// ──────────────────────────────────────────────

export const useGameStore = create<GameStore>((set) => ({
  ...DEFAULT_STATE,

  // ── 连接 ──
  setConnected: (v) => set({ connected: v }),

  // ── 房间 ──
  setRoom:       (roomId, roomName) => set({ roomId, roomName }),
  setMySocketId: (id)               => set({ mySocketId: id }),
  setMyName:     (name)             => set({ myName: name }),

  // ── 单机模式 ──
  setIsSinglePlayer: (v) => set({ isSinglePlayer: v }),
  setAiCount:        (n) => set({ aiCount: n }),
  setIsAiTurn:       (v) => set({ isAiTurn: v }),

  // ── 消息日志（最多保留 50 条） ──
  addMessage: (msg) =>
    set((s) => ({
      messages: [...s.messages.slice(-49), msg],
    })),

  // ── 更新公开状态 ──
  applyPublicState: (state) =>
    set({
      phase:            state.phase,
      players:          state.players,
      turnOrder:        state.turnOrder,
      currentTurnIndex: state.currentTurnIndex,
      currentPlayerId:  state.currentPlayerId,
      track:            state.track,
      totalLaps:        state.totalLaps,
      deckStats:        state.deckStats,
      roomId:           state.roomId,
      roomName:         state.roomName,
    }),

  // ── 更新私有状态（含手牌） ──
  applyPrivateState: (state) =>
    set({
      phase:            state.phase,
      players:          state.players,
      myHand:           state.myHand,
      turnOrder:        state.turnOrder,
      currentTurnIndex: state.currentTurnIndex,
      currentPlayerId:  state.currentPlayerId,
      track:            state.track,
      totalLaps:        state.totalLaps,
      deckStats:        state.deckStats,
      roomId:           state.roomId,
      roomName:         state.roomName,
    }),

  // ── 游戏结束 ──
  setGameOver: (rankings) => set({ gameOver: true, rankings }),

  // ── 重置（返回大厅）──
  reset: () => set({ ...DEFAULT_STATE }),
}));
