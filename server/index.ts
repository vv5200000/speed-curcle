/**
 * server/index.js
 * Neon District Racing - Express + Socket.io 服务端入口
 *
 * 事件清单（客户端 → 服务端）：
 *   create-room   { roomName, playerName }
 *   join-room     { roomId, playerName }
 *   player-ready  { ready }
 *   start-game    {}
 *   player-move   { steps }
 *   play-card     { cardId, targetId? }
 *   end-turn      {}
 *   disconnect    (built-in)
 *
 * 事件清单（服务端 → 客户端）：
 *   room-created       { roomId, roomName }
 *   room-joined        { roomId, roomName }
 *   join-error         { error }
 *   game-state-update  { ...publicState }
 *   private-state      { ...privateState }   只发给当前玩家
 *   card-played        { effect }
 *   player-disconnected { playerId, playerName }
 *   game-over          { rankings }
 *   error              { error }
 */

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { GameRoom, PHASE } from './game/GameRoom';

// ── Express 基础配置 ──────────────────────────────
const app    = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// 静态文件：服务前端 dist
// 处理开发环境 (ts-node) 和生产环境 (node dist/index.js) 的路径差异
const DIST_PATH = process.env.NODE_ENV === 'production'
  ? path.join(__dirname, '../../client/dist') // 在 dist/index.js 中，对应 server/dist/../../client/dist
  : path.join(__dirname, '../client/dist');     // 在 index.ts 中，对应 server/../client/dist

app.use(express.static(DIST_PATH));

// 健康检查接口
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// 所有非 API 路由返回 index.html（SPA 路由支持）
app.get('*', (req, res) => {
  if (!req.path.startsWith('/socket.io') && !req.path.startsWith('/health')) {
    const indexPath = path.join(DIST_PATH, 'index.html');
    res.sendFile(indexPath);
  }
});

// ── Socket.io 配置 ────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  allowEIO3: true,  // 兼容旧版客户端
  transports: ['polling', 'websocket'],
});

// ── 内存中的所有房间 Map<roomId, GameRoom> ────────
const rooms = new Map();

// ── 玩家 → 房间 映射 Map<socketId, roomId> ────────
const playerRoom = new Map();

// ──────────────────────────────────────────────────
// 工具函数
// ──────────────────────────────────────────────────

/** 向房间所有人广播公共游戏状态 */
function broadcastGameState(room) {
  const state = room.toPublicState();
  io.to(room.roomId).emit('game-state-update', state);
}

/** 向房间内每位玩家单独发送私有状态（含手牌） */
function sendPrivateStates(room) {
  for (const [pid] of room.players) {
    const socket = io.sockets.sockets.get(pid);
    if (socket) {
      socket.emit('private-state', room.toPrivateState(pid));
    }
  }
}

/** 检查并处理游戏结束 */
function checkGameOver(room) {
  if (!room.isGameOver()) return;

  room.phase = PHASE.FINISHED;

  const rankings = [...room.players.values()]
    .sort((a, b) => (a.rank || 99) - (b.rank || 99))
    .map((p, i) => ({
      rank:     p.rank || i + 2,
      playerId: p.id,
      name:     p.name,
      laps:     p.laps,
    }));

  io.to(room.roomId).emit('game-over', { rankings });
  broadcastGameState(room);
}

// ──────────────────────────────────────────────────
// Socket 事件处理
// ──────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  // ── 创建房间 ────────────────────────────────────
  socket.on('create-room', ({ roomName, playerName }, cb) => {
    try {
      const roomId = uuidv4().slice(0, 6).toUpperCase(); // 6 位大写码
      const room   = new GameRoom(roomId, socket.id, roomName || '霓虹赛场');
      rooms.set(roomId, room);

      const result = room.addPlayer(socket.id, playerName || '玩家1');
      if (!result.ok) {
        return cb?.({ ok: false, error: result.error });
      }

      playerRoom.set(socket.id, roomId);
      socket.join(roomId);

      console.log(`[create-room] roomId=${roomId} host=${playerName}`);
      socket.emit('room-created', { roomId, roomName: room.roomName });
      broadcastGameState(room);
      cb?.({ ok: true, roomId });
    } catch (err) {
      console.error('[create-room error]', err);
      cb?.({ ok: false, error: '服务器内部错误' });
    }
  });

  // ── 加入房间 ────────────────────────────────────
  socket.on('join-room', ({ roomId, playerName }, cb) => {
    try {
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('join-error', { error: `房间 ${roomId} 不存在` });
        return cb?.({ ok: false, error: '房间不存在' });
      }

      const result = room.addPlayer(socket.id, playerName || '玩家');
      if (!result.ok) {
        socket.emit('join-error', { error: result.error });
        return cb?.({ ok: false, error: result.error });
      }

      playerRoom.set(socket.id, roomId);
      socket.join(roomId);

      console.log(`[join-room] roomId=${roomId} player=${playerName}`);
      socket.emit('room-joined', { roomId, roomName: room.roomName });
      broadcastGameState(room);
      sendPrivateStates(room);
      cb?.({ ok: true, roomId });
    } catch (err) {
      console.error('[join-room error]', err);
      cb?.({ ok: false, error: '服务器内部错误' });
    }
  });

  // ── 玩家准备/取消准备 ───────────────────────────
  socket.on('player-ready', ({ ready }) => {
    const roomId = playerRoom.get(socket.id);
    const room   = rooms.get(roomId);
    if (!room) return;

    room.setReady(socket.id, !!ready);
    broadcastGameState(room);
  });

  // ── 开始游戏 ────────────────────────────────────
  socket.on('start-game', (_, cb) => {
    try {
      const roomId = playerRoom.get(socket.id);
      const room   = rooms.get(roomId);
      if (!room) return cb?.({ ok: false, error: '房间不存在' });
      if (room.hostId !== socket.id) {
        return cb?.({ ok: false, error: '只有房主才能开始游戏' });
      }

      // 强制所有人准备（房主点开始即默认同意）
      for (const [, p] of room.players) p.ready = true;

      const result = room.startGame();
      if (!result.ok) return cb?.({ ok: false, error: result.error });

      console.log(`[start-game] roomId=${roomId}`);
      broadcastGameState(room);
      sendPrivateStates(room);
      cb?.({ ok: true });
    } catch (err) {
      console.error('[start-game error]', err);
      cb?.({ ok: false, error: '服务器内部错误' });
    }
  });

  // ── 玩家移动 ────────────────────────────────────
  socket.on('player-move', ({ steps }, cb) => {
    try {
      const roomId = playerRoom.get(socket.id);
      const room   = rooms.get(roomId);
      if (!room) return cb?.({ ok: false, error: '房间不存在' });

      const result = room.movePlayer(socket.id, steps);
      if (!result.ok) {
        socket.emit('error', { error: result.error });
        return cb?.({ ok: false, error: result.error });
      }

      broadcastGameState(room);
      sendPrivateStates(room);

      // 通知房间：某玩家移动了
      io.to(roomId).emit('player-moved', {
        playerId:    socket.id,
        newPosition: result.newPosition,
        lapCompleted: result.lapCompleted,
        finished:    result.finished,
        slipstream:  result.slipstream,
      });

      checkGameOver(room);
      cb?.({ ok: true, ...result });
    } catch (err) {
      console.error('[player-move error]', err);
      cb?.({ ok: false, error: '服务器内部错误' });
    }
  });

  // ── 打出卡牌 ────────────────────────────────────
  socket.on('play-card', ({ cardId, targetId }, cb) => {
    try {
      const roomId = playerRoom.get(socket.id);
      const room   = rooms.get(roomId);
      if (!room) return cb?.({ ok: false, error: '房间不存在' });

      const result = room.playCard(socket.id, cardId, targetId);
      if (!result.ok) {
        socket.emit('error', { error: result.error });
        return cb?.({ ok: false, error: result.error });
      }

      broadcastGameState(room);
      sendPrivateStates(room);

      // 广播卡牌效果给所有人
      io.to(roomId).emit('card-played', {
        playerId: socket.id,
        effect:   result.effect,
      });

      // 如果有挂起的攻击，广播通知
      if (result.effect.pending) {
        io.to(roomId).emit('attack-pending', {
          attackerId: socket.id,
          targetId:   result.effect.targetId,
          cardId,
          expireAt:   result.effect.expireAt,
        });

        // 绑定超时自动广播逻辑
        // 我们需要一种方式让 room 超时后通知这里，或者在这里再次设置一个同步计时器
        setTimeout(() => {
          const freshRoom = rooms.get(roomId);
          if (freshRoom && !freshRoom.pendingAttack && freshRoom.phase === PHASE.PLAYING) {
             // 攻击已结算或被防御，此处通过状态检查
             broadcastGameState(freshRoom);
             sendPrivateStates(freshRoom);
          }
        }, 5100);
      }

      checkGameOver(room);
      cb?.({ ok: true, effect: result.effect });
    } catch (err) {
      console.error('[play-card error]', err);
      cb?.({ ok: false, error: '服务器内部错误' });
    }
  });

  // ── 防御攻击 (Phase 4) ──────────────────────────
  socket.on('defend-attack', ({ cardId }, cb) => {
    try {
      const roomId = playerRoom.get(socket.id);
      const room   = rooms.get(roomId);
      if (!room) return cb?.({ ok: false, error: '房间不存在' });

      const result = room.defendAttack(socket.id, cardId);
      if (!result.ok) {
        return cb?.({ ok: false, error: result.error });
      }

      broadcastGameState(room);
      sendPrivateStates(room);

      // 广播防御成功
      io.to(roomId).emit('card-played', {
        playerId: socket.id,
        effect:   { type: 'shield', actorId: socket.id, targetId: result.attackerId, blocked: true },
      });

      cb?.({ ok: true });
    } catch (err) {
      console.error('[defend-attack error]', err);
      cb?.({ ok: false, error: '服务器内部错误' });
    }
  });

  // ── 换挡 ────────────────────────────────────
  socket.on('change-gear', ({ targetGear }, cb) => {
    try {
      const roomId = playerRoom.get(socket.id);
      const room   = rooms.get(roomId);
      if (!room) return cb?.({ ok: false, error: '房间不存在' });

      const result = room.changeGear(socket.id, targetGear);
      if (!result.ok) {
        socket.emit('error', { error: result.error });
        return cb?.({ ok: false, error: result.error });
      }

      broadcastGameState(room);
      sendPrivateStates(room);

      io.to(roomId).emit('player-gear-changed', {
        playerId: socket.id,
        gear: result.gear,
        heat: result.heat
      });

      cb?.({ ok: true, gear: result.gear, heat: result.heat });
    } catch (err) {
      console.error('[change-gear error]', err);
      cb?.({ ok: false, error: '服务器内部错误' });
    }
  });

  // ── 结束回合 ────────────────────────────────────
  socket.on('end-turn', (_, cb) => {
    try {
      const roomId = playerRoom.get(socket.id);
      const room   = rooms.get(roomId);
      if (!room) return cb?.({ ok: false, error: '房间不存在' });

      const result = room.endTurn(socket.id);
      if (!result.ok) {
        socket.emit('error', { error: result.error });
        return cb?.({ ok: false, error: result.error });
      }

      console.log(`[end-turn] roomId=${roomId} next=${result.nextPlayerId}`);
      broadcastGameState(room);
      sendPrivateStates(room);

      // 通知下一位玩家该他/她行动了
      const nextSocket = io.sockets.sockets.get(result.nextPlayerId);
      if (nextSocket) {
        nextSocket.emit('your-turn');
      }

      cb?.({ ok: true, nextPlayerId: result.nextPlayerId });
    } catch (err) {
      console.error('[end-turn error]', err);
      cb?.({ ok: false, error: '服务器内部错误' });
    }
  });

  // ── 断线处理 ────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id}`);
    const roomId = playerRoom.get(socket.id);
    const room   = rooms.get(roomId);

    if (room) {
      const player = room.players.get(socket.id);
      const name   = player?.name ?? '未知玩家';

      room.removePlayer(socket.id);
      playerRoom.delete(socket.id);

      // 通知剩余玩家
      io.to(roomId).emit('player-disconnected', {
        playerId:   socket.id,
        playerName: name,
      });

      // 房间人数为 0 → 销毁
      if (room.players.size === 0) {
        rooms.delete(roomId);
        console.log(`[room-destroyed] roomId=${roomId}`);
      } else {
        // 若房主离开，把房主转让给第一个玩家
        if (room.hostId === socket.id) {
          room.hostId = [...room.players.keys()][0];
        }
        broadcastGameState(room);
      }
    }
  });
});

// ──────────────────────────────────────────────────
// 启动服务器
// ──────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚦 Neon District Racing Server running on port ${PORT}`);
});
