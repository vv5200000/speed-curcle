/**
 * Player.ts
 * 玩家对象：保存玩家的所有状态信息
 */

export interface Card {
  id: string;
  type: string;
  value: number;
  rarity?: string;
  isHeatCard?: boolean;
  isPlayable?: boolean;
  [key: string]: any;
}

/** 手牌上限（含热力卡） */
export const HAND_LIMIT = 5;

export default class Player {
  id: string;
  name: string;
  colorIdx: number;
  position: number = 0;
  hand: Card[] = [];        // 普通手牌 + 热力卡均在此数组，上限 HAND_LIMIT 张
  laps: number = 0;
  finished: boolean = false;
  rank: number = 0;
  actionPoints: number = 1;
  ready: boolean = false;
  shielded?: boolean;
  crashPenalty: boolean = false; // Phase 6: 爆缸后下回合换档惩罚标记

  // 进阶模块状态 (Phase 3)
  gear: number = 1;
  heat: number = 0;          // 热量槽当前值（不再用手牌数量表示）
  heatCapacity: number = 3;  // 热量槽上限
  tireTemp: 'cold' | 'warm' = 'cold';
  turnSpeed: number = 0;

  // Phase 6: 进阶驾驶机制
  bodyWeightMarkers: number = 3;   // 重心标记（每圈重置为3）
  leanDeclared: boolean = false;   // 本回合已声明极限压弯
  wheeling: boolean = false;       // 本回合已声明翘头冲刺
  pendingMoveAdjust: number = 0;   // 重心标记消耗的 ±1 微调量

  constructor(id: string, name: string, colorIdx: number = 0) {
    this.id = id;
    this.name = name;
    this.colorIdx = colorIdx;
  }

  /** 手牌中热力卡数量 */
  get heatCardCount(): number {
    return this.hand.filter(c => c.isHeatCard).length;
  }

  /** 手牌中普通可用牌数量 */
  get normalCardCount(): number {
    return this.hand.filter(c => !c.isHeatCard).length;
  }

  /** 是否还能接收新卡（手牌未满）*/
  get canDrawCard(): boolean {
    return this.hand.length < HAND_LIMIT;
  }

  toPublic() {
    return {
      id: this.id,
      name: this.name,
      colorIdx: this.colorIdx,
      position: this.position,
      laps: this.laps,
      finished: this.finished,
      rank: this.rank,
      handCount: this.hand.length,
      actionPoints: this.actionPoints,
      ready: this.ready,
      shielded: this.shielded,
      gear: this.gear,
      heat: this.heat,
      heatCapacity: this.heatCapacity,
      tireTemp: this.tireTemp,
      heatCardCount: this.heatCardCount,
      crashPenalty: this.crashPenalty,
      // Phase 6
      bodyWeightMarkers: this.bodyWeightMarkers,
      leanDeclared: this.leanDeclared,
      wheeling: this.wheeling,
    };
  }

  toPrivate() {
    return {
      ...this.toPublic(),
      hand: this.hand,
    };
  }

  moveTo(targetCell: number) {
    this.position = targetCell;
  }

  removeCard(cardId: string): Card | null {
    const idx = this.hand.findIndex(c => c.id === cardId);
    if (idx === -1) return null;
    const [card] = this.hand.splice(idx, 1);
    return card;
  }

  addCard(card: Card) {
    this.hand.push(card);
  }

  /**
   * 冷却手牌中的热力卡（将其移出手牌，热量槽数值对应减少）
   * @param count 要冷却的热力卡数量（0 = 全部）
   */
  coolHeatCards(count: number = 0): number {
    const heatCards = this.hand.filter(c => c.isHeatCard);
    const toRemove = count === 0 || count >= heatCards.length ? heatCards : heatCards.slice(0, count);
    for (const card of toRemove) {
      const idx = this.hand.findIndex(c => c.id === card.id);
      if (idx !== -1) this.hand.splice(idx, 1);
    }
    const removed = toRemove.length;
    this.heat = Math.max(0, this.heat - removed);
    return removed;
  }

  resetTurn() {
    this.actionPoints = this.gear;
    this.turnSpeed = 0;
    this.leanDeclared = false;
    this.wheeling = false;
    this.pendingMoveAdjust = 0;
    // 轮胎：完成第一圈后变暖
    if (this.laps >= 1 && this.tireTemp === 'cold') {
      this.tireTemp = 'warm';
    }
    // 每圈重置重心标记
    if (this.laps > 0 && this.bodyWeightMarkers < 3) {
      this.bodyWeightMarkers = 3;
    }
  }
}
