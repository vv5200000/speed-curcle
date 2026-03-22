/**
 * SinglePlayerGame.ts
 * 单机版游戏引擎 - 运行在浏览器端，不需要服务器
 */

import type { Card, TrackCell, PublicPlayer, GamePhase } from '../types/game';

// 赛道定义（与 server 一致）
const TRACK: TrackCell[] = [
  { idx: 0,  type: 'start',    x: 0,  y: 5 },
  { idx: 1,  type: 'straight', x: 1,  y: 5 },
  { idx: 2,  type: 'straight', x: 2,  y: 5 },
  { idx: 3,  type: 'straight', x: 3,  y: 5 },
  { idx: 4,  type: 'straight', x: 4,  y: 5 },
  { idx: 5,  type: 'corner',   x: 5,  y: 5, speedLimit: 4 },
  { idx: 6,  type: 'straight', x: 5,  y: 4 },
  { idx: 7,  type: 'pit',      x: 5,  y: 3 },
  { idx: 8,  type: 'straight', x: 5,  y: 2 },
  { idx: 9,  type: 'corner',   x: 5,  y: 1, speedLimit: 4 },
  { idx: 10, type: 'straight', x: 4,  y: 1 },
  { idx: 11, type: 'straight', x: 3,  y: 1 },
  { idx: 12, type: 'straight', x: 2,  y: 1 },
  { idx: 13, type: 'straight', x: 1,  y: 1 },
  { idx: 14, type: 'corner',   x: 0,  y: 1, speedLimit: 3 },
  { idx: 15, type: 'straight', x: 0,  y: 2 },
  { idx: 16, type: 'pit',      x: 0,  y: 3 },
  { idx: 17, type: 'straight', x: 0,  y: 4 },
  { idx: 18, type: 'corner',   x: 1,  y: 4, speedLimit: 4 },
  { idx: 19, type: 'straight', x: 2,  y: 4 },
  { idx: 20, type: 'straight', x: 3,  y: 4 },
  { idx: 21, type: 'corner',   x: 4,  y: 4, speedLimit: 5 },
  { idx: 22, type: 'straight', x: 4,  y: 5 },
  { idx: 23, type: 'straight', x: 3,  y: 5 },
];

const TRACK_LENGTH = TRACK.length;
const TOTAL_LAPS = 3;
const HAND_SIZE = 4;

// 卡牌类型定义
export type CardType = 'move' | 'boost' | 'shield' | 'slow' | 'shortcut';

export interface GameCard {
  id: string;
  type: CardType;
  value: number;
  name: string;
}

// 玩家接口
export interface LocalPlayer {
  id: string;
  name: string;
  colorIdx: number;
  position: number;
  laps: number;
  finished: boolean;
  rank: number;
  actionPoints: number;
  hand: GameCard[];
  shielded: boolean;
  isAI: boolean;
  gear: number;
  heat: number;
  heatCapacity: number;
  tireTemp: 'cold' | 'warm';
  turnSpeed: number;
}

// 牌组
class LocalDeck {
  cards: GameCard[];
  discard: GameCard[];

  constructor() {
    this.cards = this._createDeck();
    this.discard = [];
    this._shuffle();
  }

  _createDeck(): GameCard[] {
    const deck: GameCard[] = [];
    let id = 0;

    // 移动卡 (2-5格)
    for (let i = 0; i < 8; i++) {
      deck.push({ id: `c${id++}`, type: 'move', value: Math.floor(Math.random() * 4) + 2, name: '急速冲刺' });
    }
    // 加速卡 (+1 行动点)
    for (let i = 0; i < 6; i++) {
      deck.push({ id: `c${id++}`, type: 'boost', value: 1, name: '涡轮增压' });
    }
    // 护盾
    for (let i = 0; i < 4; i++) {
      deck.push({ id: `c${id++}`, type: 'shield', value: 0, name: '能量护盾' });
    }
    // 减速 (后退2格)
    for (let i = 0; i < 4; i++) {
      deck.push({ id: `c${id++}`, type: 'slow', value: -2, name: '电磁脉冲' });
    }
    // 捷径
    for (let i = 0; i < 3; i++) {
      deck.push({ id: `c${id++}`, type: 'shortcut', value: 0, name: '捷径导航' });
    }

    return deck;
  }

  _shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  draw(): GameCard | null {
    if (this.cards.length === 0) {
      if (this.discard.length === 0) return null;
      this.cards = [...this.discard];
      this.discard = [];
      this._shuffle();
    }
    return this.cards.pop() || null;
  }

  drawMany(count: number): GameCard[] {
    const result: GameCard[] = [];
    for (let i = 0; i < count; i++) {
      const c = this.draw();
      if (c) result.push(c);
    }
    return result;
  }

  discardCard(card: GameCard) {
    this.discard.push(card);
  }
}

// 单机游戏引擎
export class SinglePlayerGame {
  players: LocalPlayer[] = [];
  deck: LocalDeck;
  turnOrder: string[] = [];
  currentTurnIndex: number = 0;
  phase: GamePhase = 'lobby';
  totalLaps = TOTAL_LAPS;
  track = TRACK;
  finishRank = 0;

  // 回调
  onStateChange?: () => void;

  constructor() {
    this.deck = new LocalDeck();
  }

  // 初始化游戏
  initGame(playerName: string, aiCount: number = 2) {
    this.players = [];
    this.deck = new LocalDeck();
    this.finishRank = 0;

    // 添加人类玩家
    this.players.push(this._createPlayer('player', playerName, 0, false));

    // 添加 AI 玩家
    const aiNames = ['AI-小红', 'AI-小蓝', 'AI-小绿'];
    for (let i = 0; i < aiCount; i++) {
      this.players.push(this._createPlayer(`ai_${i}`, aiNames[i] || `AI-${i + 1}`, i + 1, true));
    }

    // 随机顺序
    this.turnOrder = this.players.map(p => p.id);
    this._shuffle(this.turnOrder);
    this.currentTurnIndex = 0;

    // 初始化玩家状态
    for (const p of this.players) {
      p.position = 0;
      p.laps = 0;
      p.finished = false;
      p.rank = 0;
      p.actionPoints = 1;
      p.hand = this.deck.drawMany(HAND_SIZE);
      p.shielded = false;
    }

    this.phase = 'playing';
    this._notify();
  }

  _createPlayer(id: string, name: string, colorIdx: number, isAI: boolean): LocalPlayer {
    return {
      id,
      name,
      colorIdx,
      position: 0,
      laps: 0,
      finished: false,
      rank: 0,
      actionPoints: 1,
      hand: [],
      shielded: false,
      isAI,
      gear: 1,
      heat: 0,
      heatCapacity: 3,
      tireTemp: 'cold',
      turnSpeed: 0,
    };
  }

  _shuffle(arr: string[]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // 获取当前玩家
  getCurrentPlayer(): LocalPlayer | null {
    const id = this.turnOrder[this.currentTurnIndex];
    return this.players.find(p => p.id === id) || null;
  }

  // 人类玩家移动（掷骰子）
  movePlayer(steps: number): { ok: boolean; error?: string; lapCompleted?: boolean; finished?: boolean; slipstream?: boolean } {
    const player = this.getCurrentPlayer();
    if (!player || !player.isAI) {
      // 人类玩家
      return this._movePlayer('player', steps);
    }
    return { ok: false, error: '不是你的回合' };
  }

  // AI 移动
  aiMove(): { ok: boolean; error?: string } {
    const player = this.getCurrentPlayer();
    if (!player || !player.isAI) {
      return { ok: false, error: '不是AI回合' };
    }

    // 简单 AI：随机 1-6 步
    const steps = Math.floor(Math.random() * 6) + 1;
    return this._movePlayer(player.id, steps);
  }

  _movePlayer(playerId: string, steps: number): { ok: boolean; error?: string; lapCompleted?: boolean; finished?: boolean; slipstream?: boolean } {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { ok: false, error: '玩家不存在' };
    if (this.phase !== 'playing') return { ok: false, error: '游戏未进行' };
    if (player.finished) return { ok: false, error: '已完赛' };
    if (player.actionPoints <= 0) return { ok: false, error: '行动点不足' };

    const clampedSteps = Math.max(-3, Math.min(10, steps));
    const oldPos = player.position;
    let newPos = oldPos + clampedSteps;
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
      player.gear = Math.max(1, player.gear - 1);
      player.actionPoints = 0;
      player.turnSpeed = 0;
      newPos = oldPos;
    } else {
      player.heat += heatAdded;
    }

    // 计圈
    if (!crashed && newPos >= TRACK_LENGTH && clampedSteps > 0) {
      const lapsGained = Math.floor(newPos / TRACK_LENGTH);
      newPos %= TRACK_LENGTH;
      player.laps += lapsGained;
      lapCompleted = true;
      // 完赛补牌
      const newCard = this.deck.draw();
      if (newCard) player.hand.push(newCard);
    }
    if (newPos < 0) newPos = 0;

    let slipstream = false;
    if (clampedSteps > 0 && !crashed) {
      for (const target of this.players) {
        if (target.id === playerId || target.finished) continue;
        const dist = (target.position - newPos + TRACK_LENGTH) % TRACK_LENGTH;
        if (dist === 1 || dist === 2) {
          slipstream = true;
          player.actionPoints += 1;
          break;
        }
      }
    }

    player.position = newPos;
    if (!crashed) {
      player.actionPoints -= 1;
    }

    // 维修站效果
    const cell = TRACK[newPos];
    if (cell?.type === 'pit') {
      const pitCard = this.deck.draw();
      if (pitCard) player.hand.push(pitCard);
    }

    // 检查完赛
    const finished = player.laps >= TOTAL_LAPS;
    if (finished && !player.finished) {
      player.finished = true;
      this.finishRank += 1;
      player.rank = this.finishRank;
    }

    this._notify();
    return { ok: true, lapCompleted, finished, slipstream };
  }

  // 打牌
  playCard(cardId: string, targetId?: string): { ok: boolean; error?: string; effect?: any } {
    const player = this.getCurrentPlayer();
    if (!player || !player.isAI) {
      return this._playCard('player', cardId, targetId);
    }
    return { ok: false, error: '不是你的回合' };
  }

  // AI 打牌（智能策略版）
  aiPlayCard(): { ok: boolean; error?: string } {
    const player = this.getCurrentPlayer();
    if (!player || !player.isAI) {
      return { ok: false, error: '不是AI回合' };
    }

    const myProgress = player.laps * TRACK_LENGTH + player.position;
    const otherPlayers = this.players.filter(p => p.id !== player.id && !p.finished);

    // 找出领先最多的对手（进度最高）
    const bestOpponent = otherPlayers.reduce<typeof otherPlayers[0] | null>((best, p) => {
      const progress = p.laps * TRACK_LENGTH + p.position;
      if (!best) return p;
      const bestProgress = best.laps * TRACK_LENGTH + best.position;
      return progress > bestProgress ? p : best;
    }, null);

    const bestOpponentProgress = bestOpponent
      ? bestOpponent.laps * TRACK_LENGTH + bestOpponent.position
      : 0;
    const isLeading = myProgress >= bestOpponentProgress;
    const isFarBehind = bestOpponentProgress - myProgress > 8;

    // 按优先级评分选牌
    if (player.hand.length > 0 && Math.random() < 0.75) {
      // 分类手牌
      const moveCards    = player.hand.filter(c => c.type === 'move');
      const shortcutCards = player.hand.filter(c => c.type === 'shortcut');
      const boostCards   = player.hand.filter(c => c.type === 'boost');
      const slowCards    = player.hand.filter(c => c.type === 'slow');
      const shieldCards  = player.hand.filter(c => c.type === 'shield');

      // 策略1：落后超过8格时，优先使用捷径快速追赶
      if (isFarBehind && shortcutCards.length > 0) {
        const result = this._playCard(player.id, shortcutCards[0].id);
        if (result.ok) return result;
      }

      // 策略2：有高价值移动卡时（4+格），优先使用
      const highMoveCard = moveCards.find(c => c.value >= 4);
      if (highMoveCard && Math.random() < 0.65) {
        const result = this._playCard(player.id, highMoveCard.id);
        if (result.ok) return result;
      }

      // 策略3：当有对手比自己领先且有减速卡时，45%概率攻击领先对手
      if (!isLeading && slowCards.length > 0 && bestOpponent && bestOpponentProgress > myProgress && Math.random() < 0.45) {
        // 找一个没有护盾的对手
        const vulnerableOpponent = otherPlayers.find(p => !(p as any).shielded);
        if (vulnerableOpponent) {
          const result = this._playCard(player.id, slowCards[0].id, vulnerableOpponent.id);
          if (result.ok) return result;
        }
      }

      // 策略4：行动点为0时，使用 boost 卡
      if (player.actionPoints <= 0 && boostCards.length > 0) {
        const result = this._playCard(player.id, boostCards[0].id);
        if (result.ok) return result;
      }

      // 策略5：对手有减速卡且自己没护盾时，35%概率给自己加护盾
      const opponentHasSlow = otherPlayers.some(p => p.hand?.length > 0);
      if (opponentHasSlow && !player.shielded && shieldCards.length > 0 && Math.random() < 0.35) {
        const result = this._playCard(player.id, shieldCards[0].id);
        if (result.ok) return result;
      }

      // 策略6：普通移动（随机选一张移动卡）
      if (moveCards.length > 0 && Math.random() < 0.5) {
        const card = moveCards[Math.floor(Math.random() * moveCards.length)];
        const result = this._playCard(player.id, card.id);
        if (result.ok) return result;
      }
    }

    // 默认：骰子移动
    return this.aiMove();
  }

  _playCard(playerId: string, cardId: string, targetId?: string): { ok: boolean; error?: string; effect?: any } {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { ok: false, error: '玩家不存在' };
    if (this.phase !== 'playing') return { ok: false, error: '游戏未进行' };

    if (player.actionPoints <= 0) return { ok: false, error: '行动点不足' };

    const cardIdx = player.hand.findIndex(c => c.id === cardId);
    if (cardIdx === -1) return { ok: false, error: '手牌中没有该卡牌' };

    // 扣除行动点
    player.actionPoints -= 1;

    const card = player.hand.splice(cardIdx, 1)[0];
    let effect: any = { type: card.type, value: card.value, actorId: playerId };

    switch (card.type) {
      case 'move': {
        player.turnSpeed += card.value;
        const moveResult = this._movePlayer(playerId, card.value);
        if (!moveResult.ok) {
          player.hand.push(card);
          player.turnSpeed -= card.value;
          return { ok: false, error: moveResult.error };
        }
        player.actionPoints += 1; // 补回因为 _movePlayer 内部扣除的行动点，保证该卡牌整体只消耗刚才打牌的 1 点
        effect = { ...effect, ...moveResult };
        break;
      }
      case 'boost': {
        player.actionPoints += card.value;
        effect.newActionPoints = player.actionPoints;
        break;
      }
      case 'shield': {
        player.shielded = true;
        effect.shielded = true;
        break;
      }
      case 'slow': {
        const target = this.players.find(p => p.id === targetId);
        if (!target) {
          player.hand.push(card);
          player.actionPoints += 1; // 失败退还
          return { ok: false, error: '目标玩家不存在' };
        }
        if (target.shielded) {
          target.shielded = false;
          effect.blocked = true;
          effect.targetId = targetId;
        } else {
          const newPos = Math.max(0, target.position + card.value);
          target.position = newPos;
          effect.targetId = targetId;
          effect.newPosition = newPos;
        }
        break;
      }
      case 'shortcut': {
        const corner = this._nextCorner(player.position);
        if (corner !== null) {
          player.position = corner;
          effect.newPosition = corner;
        }
        break;
      }
    }

    this.deck.discardCard(card);
    this._notify();
    return { ok: true, effect };
  }

  _nextCorner(from: number): number | null {
    for (let i = 1; i <= TRACK_LENGTH; i++) {
      const idx = (from + i) % TRACK_LENGTH;
      if (TRACK[idx].type === 'corner') return idx;
    }
    return null;
  }

  // 结束回合
  endTurn(): { ok: boolean; nextPlayerId?: string; error?: string } {
    const current = this.getCurrentPlayer();
    if (current) {
      current.actionPoints = current.gear;
      current.turnSpeed = 0;
    }

    // 跳到下一位
    let attempts = 0;
    do {
      this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;
      attempts++;
    } while (
      attempts < this.turnOrder.length &&
      this.players.find(p => p.id === this.turnOrder[this.currentTurnIndex])?.finished
    );

    const next = this.getCurrentPlayer();
    if (next) {
      next.actionPoints = next.gear;
      next.turnSpeed = 0;
      // 回合开始补牌
      if (next.hand.length < HAND_SIZE) {
        const drawn = this.deck.draw();
        if (drawn) next.hand.push(drawn);
      }
    }

    this._notify();
    return { ok: true, nextPlayerId: next?.id };
  }

  // 检查游戏是否结束
  isGameOver(): boolean {
    if (this.phase !== 'playing') return false;
    const unfinished = this.players.filter(p => !p.finished);
    return unfinished.length === 0 || (this.players.length > 1 && unfinished.length <= 1);
  }

  // 获取公共状态
  getPublicState() {
    return {
      roomId: 'single-player',
      roomName: '单人模式',
      phase: this.phase,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        colorIdx: p.colorIdx,
        position: p.position,
        laps: p.laps,
        finished: p.finished,
        rank: p.rank,
        actionPoints: p.actionPoints,
        handCount: p.hand.length,
        ready: true,
        shielded: p.shielded,
        gear: p.gear,
        heat: p.heat,
        heatCapacity: p.heatCapacity,
        tireTemp: p.tireTemp,
      })),
      turnOrder: this.turnOrder,
      currentTurnIndex: this.currentTurnIndex,
      currentPlayerId: this.turnOrder[this.currentTurnIndex] || null,
      track: this.track,
      totalLaps: this.totalLaps,
      deckStats: { drawPile: this.deck.cards.length, discardPile: this.deck.discard.length },
    };
  }

  // 获取玩家私有状态
  getPrivateState(playerId: string) {
    const base = this.getPublicState();
    const player = this.players.find(p => p.id === playerId);
    return {
      ...base,
      myHand: player?.hand || [],
    };
  }

  _notify() {
    if (this.onStateChange) {
      this.onStateChange();
    }
  }

  // 换挡
  changeGear(targetGear: number): { ok: boolean; error?: string; gear?: number; heat?: number } {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== 'player') return { ok: false, error: '不是你的回合' };
    if (targetGear < 1 || targetGear > 6) return { ok: false, error: '非法档位' };

    const diff = Math.abs(targetGear - player.gear);
    let heatCost = 0;
    if (diff > 1) {
      heatCost = diff - 1;
    }

    if (player.heat + heatCost > player.heatCapacity) {
      return { ok: false, error: '热量槽不足以支持跳步换挡' };
    }

    player.gear = targetGear;
    player.heat += heatCost;
    player.actionPoints = targetGear;
    
    this._notify();
    return { ok: true, gear: player.gear, heat: player.heat };
  }
}

export const game = new SinglePlayerGame();
