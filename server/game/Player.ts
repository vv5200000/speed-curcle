/**
 * Player.js
 * 玩家对象：保存玩家的所有状态信息
 */

export interface Card {
  id: string;
  type: string;
  value: number;
  [key: string]: any;
}

export default class Player {
  id: string;
  name: string;
  colorIdx: number;
  position: number = 0;
  hand: Card[] = [];
  laps: number = 0;
  finished: boolean = false;
  rank: number = 0;
  actionPoints: number = 1;
  ready: boolean = false;
  shielded?: boolean;

  // 进阶模块状态 (Phase 3)
  gear: number = 1; // 1-6 档
  heat: number = 0; // 当前热量
  heatCapacity: number = 3; // 热量槽上限
  tireTemp: 'cold' | 'warm' = 'cold'; // 轮胎温度
  turnSpeed: number = 0; // 本回合累计速度

  /**
   * @param id       - Socket ID，唯一标识
   * @param name     - 玩家昵称
   * @param colorIdx - 颜色索引（0-3），对应前端展示颜色
   */
  constructor(id: string, name: string, colorIdx: number = 0) {
    this.id = id;
    this.name = name;
    this.colorIdx = colorIdx;
  }

  /**
   * 将玩家数据序列化为可传输的纯对象（隐去私有信息）
   * @returns {object}
   */
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
    };
  }

  /**
   * 将玩家数据序列化（含手牌），仅发给该玩家自己
   * @returns {object}
   */
  toPrivate() {
    return {
      ...this.toPublic(),
      hand: this.hand,
    };
  }

  /**
   * 将玩家移动到指定格子
   * @param {number} targetCell - 目标格子索引
   */
  moveTo(targetCell) {
    this.position = targetCell;
  }

  /**
   * 从手牌中移除指定卡牌
   * @param {string} cardId
   * @returns {object|null} 被移除的卡牌，不存在则返回 null
   */
  removeCard(cardId) {
    const idx = this.hand.findIndex((c) => c.id === cardId);
    if (idx === -1) return null;
    const [card] = this.hand.splice(idx, 1);
    return card;
  }

  /**
   * 向手牌中添加卡牌
   * @param {object} card
   */
  addCard(card) {
    this.hand.push(card);
  }

  /**
   * 重置本回合初始状态，根据当前档位分配行动点
   */
  resetTurn() {
    this.actionPoints = this.gear;
    this.turnSpeed = 0;
  }
}

