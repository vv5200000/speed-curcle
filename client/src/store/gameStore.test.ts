import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';
import type { PublicGameState, PrivateGameState } from '../types/game';

describe('useGameStore', () => {
  beforeEach(() => {
    // 每次测试前重置 store 状态
    useGameStore.getState().reset();
  });

  it('应该能够更新连接状态、房间号和玩家信息', () => {
    const store = useGameStore.getState();
    expect(store.connected).toBe(false);

    store.setConnected(true);
    expect(useGameStore.getState().connected).toBe(true);

    store.setRoom('room-123', 'My Awesome Room');
    expect(useGameStore.getState().roomId).toBe('room-123');
    expect(useGameStore.getState().roomName).toBe('My Awesome Room');

    store.setMySocketId('socket-abc');
    store.setMyName('Jack');
    expect(useGameStore.getState().mySocketId).toBe('socket-abc');
    expect(useGameStore.getState().myName).toBe('Jack');
  });

  it('应该能够应用 applyPublicState 更新全局状态', () => {
    const mockPublicState: PublicGameState = {
      roomId: 'room1',
      roomName: 'Main',
      phase: 'playing',
      turnOrder: ['player1', 'player2'],
      currentTurnIndex: 1,
      currentPlayerId: 'player2',
      players: [
        {
          id: 'player1',
          name: 'P1',
          colorIdx: 0,
          position: 10,
          laps: 1,
          finished: false,
          rank: 0,
          handCount: 3,
          actionPoints: 1,
          ready: true,
          gear: 2,
          heat: 1,
          heatCapacity: 6,
          tireTemp: 'warm',
          heatCardCount: 0,
          crashPenalty: false,
          bodyWeightMarkers: 3,
          leanDeclared: false,
          wheeling: false
        }
      ],
      track: [],
      totalLaps: 3,
      deckStats: { drawPile: 50, discardPile: 10 },
      pendingAttack: null,
    };

    useGameStore.getState().applyPublicState(mockPublicState);
    const store = useGameStore.getState();

    expect(store.phase).toBe('playing');
    expect(store.currentTurnIndex).toBe(1);
    expect(store.currentPlayerId).toBe('player2');
    expect(store.players.length).toBe(1);
    expect(store.players[0].name).toBe('P1');
    expect(store.deckStats?.drawPile).toBe(50);
  });

  it('应该能够应用 applyPrivateState 更新私有状态包含手牌', () => {
    const mockPrivateState: PrivateGameState = {
      roomId: 'room1',
      roomName: 'Main',
      phase: 'playing',
      turnOrder: ['player1', 'player2'],
      currentTurnIndex: 0,
      currentPlayerId: 'player1',
      players: [],
      track: [],
      totalLaps: 3,
      deckStats: { drawPile: 40, discardPile: 5 },
      pendingAttack: null,
      myHand: [
        { id: 'card1', type: 'move', value: 3, name: 'Move 3', description: 'desc' },
        { id: 'card2', type: 'boost', value: 1, name: 'Boost 1', description: 'desc' },
      ],
    };

    useGameStore.getState().applyPrivateState(mockPrivateState);
    const store = useGameStore.getState();

    expect(store.myHand.length).toBe(2);
    expect(store.myHand[0].type).toBe('move');
  });

  it('应该能够添加消息最多保留50条', () => {
    const store = useGameStore.getState();
    expect(store.messages.length).toBe(0);

    for (let i = 0; i < 60; i++) {
      store.addMessage(`Msg ${i}`);
    }

    const { messages } = useGameStore.getState();
    // 应该只保留最后的 50 条消息
    expect(messages.length).toBe(50);
    // 第一条消息应该是 Msg 10 (索引偏移) 但是由于它是通过 slice(-49) 添加的
    // 最新一条是 Msg 59，保留 50 条意味着最旧的一条是 Msg 10
    expect(messages[0]).toBe('Msg 10');
    expect(messages[49]).toBe('Msg 59');
  });
});
