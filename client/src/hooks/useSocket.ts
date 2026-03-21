/**
 * hooks/useSocket.ts
 * 封装 Socket.io 客户端逻辑
 *
 * 用法：
 *   const { socket, createRoom, joinRoom, ... } = useSocket();
 *
 * 该 hook 在整个应用生命周期内只创建一个 Socket 实例（单例）。
 */

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';
import type {
  CreateRoomPayload,
  JoinRoomPayload,
  PlayCardPayload,
  PlayerMovePayload,
  PublicGameState,
  PrivateGameState,
  CardPlayedEvent,
  PlayerMovedEvent,
  PlayerGearChangedEvent,
  PlayerDisconnectedEvent,
  GameOverEvent,
  ChangeGearPayload,
  AckResult,
} from '../types/game';

// 服务端地址：空字符串 = 同源（由 Express 直接服务静态文件）
const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';

// 单例 Socket
let globalSocket: Socket | null = null;

function getSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io(SERVER_URL, {
      autoConnect: false,
      transports: ['polling', 'websocket'],
    });
  }
  return globalSocket;
}

// ──────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────

export function useSocket() {
  const socket = useRef<Socket>(getSocket());

  const {
    setConnected,
    setMySocketId,
    setRoom,
    applyPublicState,
    applyPrivateState,
    setGameOver,
    addMessage,
  } = useGameStore();

  // ── 注册事件监听（只在 mount 时执行一次）──────
  useEffect(() => {
    const s = socket.current;

    // 建立连接
    const onConnect = () => {
      setConnected(true);
      setMySocketId(s.id ?? '');
      addMessage('✅ 已连接到服务器');
    };

    // 断开连接
    const onDisconnect = () => {
      setConnected(false);
      addMessage('❌ 与服务器断开连接');
    };

    // 房间创建成功
    const onRoomCreated = ({ roomId, roomName }: { roomId: string; roomName: string }) => {
      setRoom(roomId, roomName);
      addMessage(`🏠 房间已创建：${roomId}`);
    };

    // 加入房间成功
    const onRoomJoined = ({ roomId, roomName }: { roomId: string; roomName: string }) => {
      setRoom(roomId, roomName);
      addMessage(`🚪 已加入房间：${roomId}`);
    };

    // 公共游戏状态更新
    const onGameStateUpdate = (state: PublicGameState) => {
      applyPublicState(state);
    };

    // 私有状态（含手牌）
    const onPrivateState = (state: PrivateGameState) => {
      applyPrivateState(state);
    };

    // 卡牌被打出
    const onCardPlayed = ({ playerId, effect }: CardPlayedEvent) => {
      const store = useGameStore.getState();
      const actor = store.players.find((p) => p.id === playerId);
      addMessage(`🃏 ${actor?.name ?? playerId} 打出了卡牌（类型: ${effect.type}）`);
    };

    // 玩家移动
    const onPlayerMoved = ({ playerId, newPosition, lapCompleted, finished }: PlayerMovedEvent) => {
      const store = useGameStore.getState();
      const player = store.players.find((p) => p.id === playerId);
      const name = player?.name ?? playerId;
      let msg = `🚗 ${name} 移动到格子 ${newPosition}`;
      if (lapCompleted) msg += ' 🔁（完成一圈！）';
      if (finished)    msg += ' 🏁（已完赛！）';
      addMessage(msg);
    };

    // 玩家换挡
    const onPlayerGearChanged = ({ playerId, gear, heat }: PlayerGearChangedEvent) => {
      const store = useGameStore.getState();
      const player = store.players.find((p) => p.id === playerId);
      addMessage(`⚙️ ${player?.name ?? playerId} 换到了 ${gear} 档 (当前热量: ${heat})`);
    };

    // 轮到自己
    const onYourTurn = () => {
      addMessage('⚡ 轮到你行动了！');
    };

    // 玩家断线
    const onPlayerDisconnected = ({ playerName }: PlayerDisconnectedEvent) => {
      addMessage(`⚠️ ${playerName} 已离开游戏`);
    };

    // 游戏结束
    const onGameOver = ({ rankings }: GameOverEvent) => {
      setGameOver(rankings);
      addMessage('🏆 游戏结束！');
    };

    // 错误
    const onError = ({ error }: { error: string }) => {
      addMessage(`❗ 错误：${error}`);
    };

    // 注册监听
    s.on('connect',              onConnect);
    s.on('disconnect',           onDisconnect);
    s.on('room-created',         onRoomCreated);
    s.on('room-joined',          onRoomJoined);
    s.on('game-state-update',    onGameStateUpdate);
    s.on('private-state',        onPrivateState);
    s.on('card-played',          onCardPlayed);
    s.on('player-moved',         onPlayerMoved);
    s.on('player-gear-changed',  onPlayerGearChanged);
    s.on('your-turn',            onYourTurn);
    s.on('player-disconnected',  onPlayerDisconnected);
    s.on('game-over',            onGameOver);
    s.on('error',                onError);

    // 若未连接则自动连接
    if (!s.connected) s.connect();

    return () => {
      s.off('connect',             onConnect);
      s.off('disconnect',          onDisconnect);
      s.off('room-created',        onRoomCreated);
      s.off('room-joined',         onRoomJoined);
      s.off('game-state-update',   onGameStateUpdate);
      s.off('private-state',       onPrivateState);
      s.off('card-played',         onCardPlayed);
      s.off('player-moved',        onPlayerMoved);
      s.off('player-gear-changed', onPlayerGearChanged);
      s.off('your-turn',           onYourTurn);
      s.off('player-disconnected', onPlayerDisconnected);
      s.off('game-over',           onGameOver);
      s.off('error',               onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ──────────────────────────────────────────────
  // 封装发送方法
  // ──────────────────────────────────────────────

  /** 创建房间 */
  const createRoom = useCallback(
    (payload: CreateRoomPayload): Promise<AckResult> =>
      new Promise((resolve) => {
        socket.current.emit('create-room', payload, resolve);
      }),
    []
  );

  /** 加入房间 */
  const joinRoom = useCallback(
    (payload: JoinRoomPayload): Promise<AckResult> =>
      new Promise((resolve) => {
        socket.current.emit('join-room', payload, resolve);
      }),
    []
  );

  /** 设置准备状态 */
  const setReady = useCallback((ready: boolean) => {
    socket.current.emit('player-ready', { ready });
  }, []);

  /** 开始游戏（房主专用）*/
  const startGame = useCallback(
    (): Promise<AckResult> =>
      new Promise((resolve) => {
        socket.current.emit('start-game', {}, resolve);
      }),
    []
  );

  /** 移动玩家 */
  const movePlayer = useCallback(
    (payload: PlayerMovePayload): Promise<AckResult> =>
      new Promise((resolve) => {
        socket.current.emit('player-move', payload, resolve);
      }),
    []
  );

  /** 打出卡牌 */
  const playCard = useCallback(
    (payload: PlayCardPayload): Promise<AckResult> =>
      new Promise((resolve) => {
        socket.current.emit('play-card', payload, resolve);
      }),
    []
  );

  /** 结束回合 */
  const endTurn = useCallback(
    (): Promise<AckResult> =>
      new Promise((resolve) => {
        socket.current.emit('end-turn', {}, resolve);
      }),
    []
  );

  /** 换挡 */
  const changeGear = useCallback(
    (payload: ChangeGearPayload): Promise<AckResult> =>
      new Promise((resolve) => {
        socket.current.emit('change-gear', payload, resolve);
      }),
    []
  );

  return {
    socket: socket.current,
    createRoom,
    joinRoom,
    setReady,
    startGame,
    movePlayer,
    playCard,
    endTurn,
    changeGear,
  };
}
