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
  { idx: 5,  type: 'corner',   x: 5,  y: 5 },
  { idx: 6,  type: 'straight', x: 5,  y: 4 },
  { idx: 7,  type: 'pit',      x: 5,  y: 3 },
  { idx: 8,  type: 'straight', x: 5,  y: 2 },
  { idx: 9,  type: 'corner',   x: 5,  y: 1 },
  { idx: 10, type: 'straight', x: 4,  y: 1 },
  { idx: 11, type: 'straight', x: 3,  y: 1 },
  { idx: 12, type: 'straight', x: 2,  y: 1 },
  { idx: 13, type: 'straight', x: 1,  y: 1 },
  { idx: 14, type: 'corner',   x: 0,  y: 1 },
  { idx: 15, type: 'straight', x: 0,  y: 2 },
  { idx: 16, type: 'pit',      x: 0,  y: 3 },
  { idx: 17, type: 'straight', x: 0,  y: 4 },
  { idx: 18, type: 'corner',   x: 1,  y: 4 },
  { idx: 19, type: 'straight', x: 2,  y: 4 },
  { idx: 20, type: 'straight', x: 3,  y: 4 },
  { idx: 21, type: 'corner',   x: 4,  y: 4 },
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
  movePlayer(steps: number): { ok: boolean; error?: string; lapCompleted?: boolean; finished?: boolean } {
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

  _movePlayer(playerId: string, steps: number): { ok: boolean; error?: string; lapCompleted?: boolean; finished?: boolean } {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { ok: false, error: '玩家不存在' };
    if (this.phase !== 'playing') return { ok: false, error: '游戏未进行' };
    if (player.finished) return { ok: false, error: '已完赛' };
    if (player.actionPoints <= 0) return { ok: false, error: '行动点不足' };

    const clampedSteps = Math.max(-3, Math.min(10, steps));
    const oldPos = player.position;
    let newPos = oldPos + clampedSteps;
    let lapCompleted = false;

    // 计圈
    if (newPos >= TRACK_LENGTH) {
      const lapsGained = Math.floor(newPos / TRACK_LENGTH);
      newPos %= TRACK_LENGTH;
      player.laps += lapsGained;
      lapCompleted = true;
      // 完赛补牌
      const newCard = this.deck.draw();
      if (newCard) player.hand.push(newCard);
    }
    if (newPos < 0) newPos = 0;

    player.position = newPos;
    player.actionPoints -= 1;

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
    return { ok: true, lapCompleted, finished };
  }

  // 打牌
  playCard(cardId: string, targetId?: string): { ok: boolean; error?: string; effect?: any } {
    const player = this.getCurrentPlayer();
    if (!player || !player.isAI) {
      return this._playCard('player', cardId, targetId);
    }
    return { ok: false, error: '不是你的回合' };
  }

  // AI 打牌
  aiPlayCard(): { ok: boolean; error?: string } {
    const player = this.getCurrentPlayer();
    if (!player || !player.isAI) {
      return { ok: false, error: '不是AI回合' };
    }

    // 简单 AI：30% 概率打牌，否则直接移动
    if (player.hand.length > 0 && Math.random() < 0.3) {
      const card = player.hand[Math.floor(Math.random() * player.hand.length)];
      const result = this._playCard(player.id, card.id);
      return result;
    }

    // AI 直接移动
    return this.aiMove();
  }

  _playCard(playerId: string, cardId: string, targetId?: string): { ok: boolean; error?: string; effect?: any } {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { ok: false, error: '玩家不存在' };
    if (this.phase !== 'playing') return { ok: false, error: '游戏未进行' };

    const cardIdx = player.hand.findIndex(c => c.id === cardId);
    if (cardIdx === -1) return { ok: false, error: '手牌中没有该卡牌' };

    const card = player.hand.splice(cardIdx, 1)[0];
    let effect: any = { type: card.type, value: card.value, actorId: playerId };

    switch (card.type) {
      case 'move': {
        const moveResult = this._movePlayer(playerId, card.value);
        if (!moveResult.ok) {
          player.hand.push(card);
          return { ok: false, error: moveResult.error };
        }
        player.actionPoints += 1; // 补回
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
      current.actionPoints = 1;
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
      next.actionPoints = 1;
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
}

export const game = new SinglePlayerGame();
