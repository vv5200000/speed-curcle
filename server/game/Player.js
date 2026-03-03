/**
 * Player.js
 * 玩家对象：保存玩家的所有状态信息
 */

class Player {
  /**
   * @param {string} id       - Socket ID，唯一标识
   * @param {string} name     - 玩家昵称
   * @param {number} colorIdx - 颜色索引（0-3），对应前端展示颜色
   */
  constructor(id, name, colorIdx = 0) {
    this.id = id;           // Socket ID
    this.name = name;       // 玩家昵称
    this.colorIdx = colorIdx; // 颜色索引

    // 赛道位置（格子索引）
    this.position = 0;

    // 当前手牌列表（Card 对象数组）
    this.hand = [];

    // 本局已完成的圈数
    this.laps = 0;

    // 是否已完赛
    this.finished = false;

    // 完赛排名（1-4），0 表示未完赛
    this.rank = 0;

    // 剩余行动点（每回合开始时重置）
    this.actionPoints = 1;

    // 是否已准备（大厅阶段）
    this.ready = false;
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
      handCount: this.hand.length, // 只暴露手牌数量，不暴露内容
      actionPoints: this.actionPoints,
      ready: this.ready,
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
   * 重置本回合行动点
   */
  resetTurn() {
    this.actionPoints = 1;
  }
}

module.exports = Player;
