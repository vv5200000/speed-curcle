/**
 * GameRoom.js
 * 房间核心逻辑：状态管理、合法性检验、回合控制、胜负判断
 *
 * 赛道格子结构（TRACK）：
 *   每个格子包含 type / x / y / connections 等字段
 *   type：
 *     'start'   - 起跑线（同时也是终点线）
 *     'straight'- 直道
 *     'corner'  - 弯道（可成为 shortcut 传送目标）
 *     'pit'     - 维修站（经过时补抽 1 张牌）
 *
 *  赛道以线性数组表示，玩家沿索引递增方向移动，
 *  到达最后一格后回到索引 0（计圈）。
 */

import Player from './Player';
import CardDeck from './CardDeck';

// ──────────────────────────────────────────────
// 赛道定义（共 24 格，简单矩形环形赛道）
// x/y 为格子在棋盘上的坐标，单位：格
// ──────────────────────────────────────────────
export const TRACK = [
  // 底边 → 右下角
  { idx: 0,  type: 'start',    x: 0,  y: 5 },
  { idx: 1,  type: 'straight', x: 1,  y: 5 },
  { idx: 2,  type: 'straight', x: 2,  y: 5 },
  { idx: 3,  type: 'straight', x: 3,  y: 5 },
  { idx: 4,  type: 'straight', x: 4,  y: 5 },
  { idx: 5,  type: 'corner',   x: 5,  y: 5, speedLimit: 4 },
  // 右边 ↑
  { idx: 6,  type: 'straight', x: 5,  y: 4 },
  { idx: 7,  type: 'pit',      x: 5,  y: 3 },
  { idx: 8,  type: 'straight', x: 5,  y: 2 },
  { idx: 9,  type: 'corner',   x: 5,  y: 1, speedLimit: 4 },
  // 顶边 ←
  { idx: 10, type: 'straight', x: 4,  y: 1 },
  { idx: 11, type: 'straight', x: 3,  y: 1 },
  { idx: 12, type: 'straight', x: 2,  y: 1 },
  { idx: 13, type: 'straight', x: 1,  y: 1 },
  { idx: 14, type: 'corner',   x: 0,  y: 1, speedLimit: 3 },
  // 左边 ↓
  { idx: 15, type: 'straight', x: 0,  y: 2 },
  { idx: 16, type: 'pit',      x: 0,  y: 3 },
  { idx: 17, type: 'straight', x: 0,  y: 4 },
  // 回到 start ─ 多出几个格子增加变数
  { idx: 18, type: 'corner',   x: 1,  y: 4, speedLimit: 4 },
  { idx: 19, type: 'straight', x: 2,  y: 4 },
  { idx: 20, type: 'straight', x: 3,  y: 4 },
  { idx: 21, type: 'corner',   x: 4,  y: 4, speedLimit: 5 },
  { idx: 22, type: 'straight', x: 4,  y: 5 }, // 内圈辅助格
  { idx: 23, type: 'straight', x: 3,  y: 5 }, // 内圈辅助格，回到 0 计圈
];

export const TRACK_LENGTH = TRACK.length; // 24
export const TOTAL_LAPS   = 3;            // 完成 3 圈即获胜
export const HAND_SIZE    = 4;            // 每人初始手牌数

// 游戏阶段枚举
export const PHASE = {
  LOBBY:    'lobby',    // 大厅等待
  PLAYING:  'playing',  // 游戏进行中
  FINISHED: 'finished', // 游戏结束
};

export class GameRoom {
  roomId: string;
  hostId: string;
  roomName: string;
  players: Map<string, Player>;
  phase: string;
  turnOrder: string[];
  currentTurnIndex: number;
  deck: CardDeck | null;
  finishRank: number;
  createdAt: number;
  pendingAttack: { attackerId: string; targetId: string; cardId: string; expireAt: number; card: any } | null;
  pendingAttackTimer: ReturnType<typeof setTimeout> | null;

  /**
   * @param roomId   - 房间 ID
   * @param hostId   - 房主 Socket ID
   * @param roomName - 房间名称
   */
  constructor(roomId: string, hostId: string, roomName: string) {
    this.roomId   = roomId;
    this.hostId   = hostId;
    this.roomName = roomName;

    /** id → Player */
    this.players = new Map();

    /** 当前阶段 */
    this.phase = PHASE.LOBBY;

    /** 回合顺序（Player id 数组） */
    this.turnOrder = [];

    /** 当前回合所属玩家的索引（在 turnOrder 中） */
    this.currentTurnIndex = 0;

    /** 公共牌组 */
    this.deck = null;

    /** 完赛名次计数器 */
    this.finishRank = 0;

    /** 创建时间戳 */
    this.createdAt = Date.now();

    /** Phase 4: 挂起的攻击（5s 防守窗口）*/
    this.pendingAttack = null;
    this.pendingAttackTimer = null;
  }

  // ──────────────────────────────────────────────
  // 大厅阶段
  // ──────────────────────────────────────────────

  /**
   * 添加玩家到房间
   * @param {string} id   - Socket ID
   * @param {string} name - 玩家昵称
   * @returns {{ ok: boolean, error?: string, player?: Player }}
   */
  addPlayer(id, name) {
    if (this.phase !== PHASE.LOBBY) {
      return { ok: false, error: '游戏已开始，无法加入' };
    }
    if (this.players.size >= 4) {
      return { ok: false, error: '房间已满（最多 4 人）' };
    }
    if ([...this.players.values()].some((p) => p.name === name)) {
      return { ok: false, error: '昵称已被使用' };
    }

    const colorIdx = this.players.size; // 0-3 对应不同颜色
    const player = new Player(id, name, colorIdx);
    this.players.set(id, player);
    return { ok: true, player };
  }

  /**
   * 移除玩家（断线处理）
   * @param {string} id
   */
  removePlayer(id) {
    this.players.delete(id);
    // 若移除的是当前回合玩家，跳到下一位
    this.turnOrder = this.turnOrder.filter((pid) => pid !== id);
    if (this.turnOrder.length > 0) {
      this.currentTurnIndex = this.currentTurnIndex % this.turnOrder.length;
    }
  }

  /**
   * 设置玩家准备状态
   * @param {string} id
   * @param {boolean} ready
   */
  setReady(id, ready) {
    const player = this.players.get(id);
    if (player) player.ready = ready;
  }

  /**
   * 检查是否所有玩家都已准备，且人数 ≥ 2
   */
  canStart() {
    if (this.players.size < 2) return false;
    return [...this.players.values()].every((p) => p.ready);
  }

  // ──────────────────────────────────────────────
  // 游戏开始
  // ──────────────────────────────────────────────

  /**
   * 开始游戏：初始化牌组、发牌、确定回合顺序
   * @returns {{ ok: boolean, error?: string }}
   */
  startGame() {
    if (this.phase !== PHASE.LOBBY) {
      return { ok: false, error: '游戏已在进行中' };
    }
    if (this.players.size < 2) {
      return { ok: false, error: '至少需要 2 名玩家' };
    }

    this.phase = PHASE.PLAYING;
    this.deck  = new CardDeck();

    // 回合顺序随机打乱
    this.turnOrder = [...this.players.keys()];
    this._shuffleArray(this.turnOrder);
    this.currentTurnIndex = 0;

    // 所有玩家起点归零，发初始手牌
    for (const player of this.players.values()) {
      player.position     = 0;
      player.laps         = 0;
      player.finished     = false;
      player.rank         = 0;
      player.actionPoints = 1;
      player.hand         = this.deck.drawMany(HAND_SIZE);
    }

    return { ok: true };
  }

  // ──────────────────────────────────────────────
  // 移动逻辑
  // ──────────────────────────────────────────────

  /**
   * 处理玩家移动请求
   * @param {string} playerId
   * @param {number} steps      - 要前进的步数（正数前进，负数后退）
   * @returns {{ ok: boolean, error?: string, newPosition?: number, lapCompleted?: boolean }}
   */
  movePlayer(playerId, steps) {
    if (this.phase !== PHASE.PLAYING) {
      return { ok: false, error: '游戏未在进行中' };
    }
    if (!this._isCurrentTurn(playerId)) {
      return { ok: false, error: '现在不是你的回合' };
    }

    const player = this.players.get(playerId);
    if (!player) return { ok: false, error: '玩家不存在' };
    if (player.finished) return { ok: false, error: '你已完赛' };
    if (player.actionPoints <= 0) return { ok: false, error: '行动点不足' };

    // 步数限制：最大单次移动 10 格，后退不超过 -3
    const clampedSteps = Math.max(-3, Math.min(10, steps));

    const oldPos = player.position;
    let newPos   = oldPos + clampedSteps;
    let lapCompleted = false;
    let heatAdded = 0;
    let crashed = false;

    // ── 检查弯道超速 ──
    if (clampedSteps > 0) {
      let checkPos = oldPos;
      for (let i = 1; i <= clampedSteps; i++) {
        checkPos += 1;
        if (checkPos >= TRACK_LENGTH) checkPos %= TRACK_LENGTH;
        const cell = TRACK[checkPos] as any;
        if (cell.type === 'corner') {
          const limit = cell.speedLimit || 4;
          const effectiveLimit = player.tireTemp === 'cold' ? limit - 1 : limit;
          if (player.turnSpeed > effectiveLimit) {
            const limitExceeded = player.turnSpeed - effectiveLimit;
            // 档位倍率：1档:x0, 2:x1, 3:x1, 4:x2, 5:x2, 6:x3
            const mult = player.gear >= 6 ? 3 : player.gear >= 4 ? 2 : player.gear >= 2 ? 1 : 0;
            heatAdded += limitExceeded * mult;
          }
        }
      }
    }

    // 处理爆缸 (Spin Out)
    if (player.heat + heatAdded > player.heatCapacity) {
      crashed = true;
      player.heat = player.heatCapacity;
      player.gear = Math.max(1, player.gear - 1); // 降档
      player.actionPoints = 0; // 丢失剩余行动次数
      player.turnSpeed = 0; // 速度清零
      // 爆缸停留在原地，不前进
      newPos = oldPos;
    } else {
      player.heat += heatAdded;
    }

    // 处理圈数 (只有在未爆缸且前进跨越终点时才算完成一圈)
    if (!crashed && oldPos + clampedSteps >= TRACK_LENGTH && clampedSteps > 0) {
      const lapsGained = Math.floor((oldPos + clampedSteps) / TRACK_LENGTH);
      newPos = (oldPos + clampedSteps) % TRACK_LENGTH;
      player.laps += lapsGained;
      lapCompleted = true;

      // 每完成一圈补抽 1 张牌
      const newCard = this.deck!.draw();
      if (newCard) player.addCard(newCard);
    }
    // 后退越界时限制在 0
    if (newPos < 0) newPos = 0;

    // Phase 4: 尾流系统 (Slipstream)
    let slipstream = false;
    let slipstreamTargetId: string | undefined;

    if (clampedSteps > 0 && !crashed) {
      for (const [id, target] of this.players.entries()) {
        if (id === playerId || target.finished) continue;
        // 在新位置的正前方 1~2 格是否有对手
        const dist = (target.position - newPos + TRACK_LENGTH) % TRACK_LENGTH;
        if (dist === 1 || dist === 2) {
          slipstream = true;
          slipstreamTargetId = id;
          player.actionPoints += 1; // 奖励额外行动点
          break;
        }
      }
    }

    player.moveTo(newPos);
    
    // 如果没有爆缸，扣除一个基础行动点 (如果是打牌调用，外层会补回来)
    if (!crashed) {
      player.actionPoints -= 1;
    }

    // 维修站效果：经过 pit 格时补抽 1 张牌
    const cell = TRACK[newPos];
    let pitDraw = null;
    if (cell && cell.type === 'pit') {
      pitDraw = this.deck.draw();
      if (pitDraw) player.addCard(pitDraw);
    }

    // 检查完赛条件
    const finished = player.laps >= TOTAL_LAPS;
    if (finished && !player.finished) {
      player.finished = true;
      this.finishRank += 1;
      player.rank = this.finishRank;
    }

    return {
      ok: true,
      newPosition: newPos,
      lapCompleted,
      finished,
      pitDraw,
      heatAdded,
      crashed,
      heat: player.heat,
      slipstream,
      slipstreamTargetId,
    };
  }

  // ──────────────────────────────────────────────
  // 进阶机制：换挡 (Gear)
  // ──────────────────────────────────────────────
  changeGear(playerId: string, targetGear: number) {
    if (this.phase !== PHASE.PLAYING) return { ok: false, error: '游戏未在进行中' };
    if (!this._isCurrentTurn(playerId)) return { ok: false, error: '现在不是你的回合' };
    
    const player = this.players.get(playerId);
    if (!player) return { ok: false, error: '玩家不存在' };
    if (targetGear < 1 || targetGear > 6) return { ok: false, error: '非法档位' };

    const diff = Math.abs(targetGear - player.gear);
    let heatCost = 0;
    if (diff > 1) {
      heatCost = diff - 1; // 跳档惩罚
    }

    if (player.heat + heatCost > player.heatCapacity) {
      return { ok: false, error: '热量槽不足以支持跳步换挡' };
    }

    player.gear = targetGear;
    player.heat += heatCost;
    player.actionPoints = targetGear; // 换挡时将行动点设为新档位对应的值

    return { ok: true, heat: player.heat, gear: player.gear, actionPoints: player.actionPoints };
  }

  // ──────────────────────────────────────────────
  // 卡牌逻辑
  // ──────────────────────────────────────────────

  /**
   * 玩家打出一张卡牌
   * @param {string} playerId
   * @param {string} cardId
   * @param {string|null} targetId  - 目标玩家 ID（某些卡牌需要）
   * @returns {{ ok: boolean, error?: string, effect?: object }}
   */
  playCard(playerId, cardId, targetId) {
    if (this.phase !== PHASE.PLAYING) {
      return { ok: false, error: '游戏未在进行中' };
    }
    if (!this._isCurrentTurn(playerId)) {
      return { ok: false, error: '现在不是你的回合' };
    }

    const player = this.players.get(playerId);
    if (!player) return { ok: false, error: '玩家不存在' };

    const card = player.removeCard(cardId);
    if (!card) return { ok: false, error: '手牌中没有该卡牌' };

    let effect: any = { type: card.type, value: card.value, actorId: playerId };
    let error: string | null = null;

    switch (card.type) {
      case 'move': {
        // 累加本回合速度
        player.turnSpeed += card.value;
        const moveResult = this.movePlayer(playerId, card.value);
        if (!moveResult.ok) {
          // 移动失败则退回卡牌并减去速度
          player.turnSpeed -= card.value;
          player.addCard(card);
          return { ok: false, error: moveResult.error };
        }
        // 移动已经消耗了 actionPoints，此处不再重复扣除
        // 但 movePlayer 内已扣减，需要补回来保证语义：
        // ── 打牌本身消耗行动，移动不额外消耗 ──
        player.actionPoints += 1; // 补回 movePlayer 里扣的那次
        effect = { ...effect, ...moveResult };
        break;
      }
      case 'boost': {
        // 增加行动点
        player.actionPoints += card.value;
        effect.newActionPoints = player.actionPoints;
        break;
      }
      case 'shield': {
        // 能量护盾：标记玩家受保护（简单 flag）
        player.shielded = true;
        effect.shielded = true;
        break;
      }
      case 'slow': {
        // 减速：让目标玩家后退
        const target = this.players.get(targetId);
        if (!target) {
          player.addCard(card);
          return { ok: false, error: '目标玩家不存在' };
        }
        if (target.shielded) {
          // 护盾抵消效果
          target.shielded = false;
          effect.blocked  = true;
          effect.targetId = targetId;
        } else {
          const slowSteps  = card.value; // 负数
          let newPos = Math.max(0, target.position + slowSteps);
          target.moveTo(newPos);
          effect.targetId    = targetId;
          effect.newPosition = newPos;
        }
        break;
      }
      case 'shortcut': {
        // 捷径：传送到赛道上前方最近的 corner 格
        const corner = this._nextCorner(player.position);
        if (corner !== null) {
          player.moveTo(corner);
          effect.newPosition = corner;
        }
        break;
      }
      default:
        error = `未知卡牌类型: ${card.type}`;
        player.addCard(card);
        return { ok: false, error };
    }

    // 打出的牌放入弃牌堆
    this.deck.discard(card);

    return { ok: true, effect };
  }

  /**
   * 结束当前玩家的回合，推进到下一位
   * @param {string} playerId
   * @returns {{ ok: boolean, nextPlayerId?: string, error?: string }}
   */
  endTurn(playerId) {
    if (!this._isCurrentTurn(playerId)) {
      return { ok: false, error: '现在不是你的回合' };
    }

    const player = this.players.get(playerId);
    if (player) player.resetTurn();

    // 移动到下一位（跳过已完赛玩家）
    let attempts = 0;
    do {
      this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;
      attempts++;
    } while (
      attempts < this.turnOrder.length &&
      this.players.get(this.turnOrder[this.currentTurnIndex])?.finished
    );

    const nextId = this.turnOrder[this.currentTurnIndex];
    const next   = this.players.get(nextId);
    if (next) {
      next.resetTurn();
      // 每回合开始时补抽一张牌（如果手牌 < HAND_SIZE）
      if (next.hand.length < HAND_SIZE) {
        const drawn = this.deck.draw();
        if (drawn) next.addCard(drawn);
      }
    }

    return { ok: true, nextPlayerId: nextId };
  }

  // ──────────────────────────────────────────────
  // 状态序列化
  // ──────────────────────────────────────────────

  /**
   * 生成可广播给所有玩家的公共游戏状态
   */
  toPublicState() {
    return {
      roomId:           this.roomId,
      roomName:         this.roomName,
      phase:            this.phase,
      turnOrder:        this.turnOrder,
      currentTurnIndex: this.currentTurnIndex,
      currentPlayerId:  this.turnOrder[this.currentTurnIndex] ?? null,
      players:          [...this.players.values()].map((p) => p.toPublic()),
      track:            TRACK,
      totalLaps:        TOTAL_LAPS,
      deckStats:        this.deck ? this.deck.stats() : null,
    };
  }

  /**
   * 生成发给指定玩家的私有状态（含手牌）
   * @param {string} playerId
   */
  toPrivateState(playerId) {
    const base   = this.toPublicState();
    const player = this.players.get(playerId);
    return {
      ...base,
      myHand: player ? player.hand : [],
    };
  }

  // ──────────────────────────────────────────────
  // 私有辅助方法
  // ──────────────────────────────────────────────

  _isCurrentTurn(playerId) {
    return this.turnOrder[this.currentTurnIndex] === playerId;
  }

  _shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  /**
   * 找到当前位置之后（含）最近的 corner 格索引
   * @param {number} from
   * @returns {number|null}
   */
  _nextCorner(from) {
    for (let i = 1; i <= TRACK_LENGTH; i++) {
      const idx = (from + i) % TRACK_LENGTH;
      if (TRACK[idx].type === 'corner') return idx;
    }
    return null;
  }

  /**
   * 判断游戏是否结束（所有玩家均完赛，或只剩最后一人未完赛）
   */
  isGameOver() {
    if (this.phase !== PHASE.PLAYING) return false;
    const unfinished = [...this.players.values()].filter((p) => !p.finished);
    return unfinished.length === 0 ||
      (this.players.size > 1 && unfinished.length <= 1);
  }
}

