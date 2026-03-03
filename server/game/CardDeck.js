/**
 * CardDeck.js
 * 牌组管理：定义所有卡牌、洗牌、发牌
 *
 * 卡牌类型说明：
 *  - move      前进指定步数
 *  - boost     本回合额外获得行动点
 *  - shield    阻挡下一次负面效果
 *  - slow      让目标玩家减速（下次移动-步数）
 *  - shortcut  直接跳到赛道上最近的弯道格
 */

const { v4: uuidv4 } = require('uuid');

/** 基础卡牌模板 */
const CARD_TEMPLATES = [
  // ── 移动卡 ──
  { type: 'move', name: '急速冲刺', description: '前进 3 格', value: 3, count: 6 },
  { type: 'move', name: '全力加速', description: '前进 5 格', value: 5, count: 4 },
  { type: 'move', name: '微步前行', description: '前进 1 格', value: 1, count: 4 },
  { type: 'move', name: '氮气喷射', description: '前进 7 格', value: 7, count: 2 },

  // ── 功能卡 ──
  { type: 'boost', name: '涡轮增压', description: '本回合额外获得 1 次行动', value: 1, count: 3 },
  { type: 'shield', name: '能量护盾', description: '阻挡下一次减速效果', value: 0, count: 3 },
  { type: 'slow', name: '电磁脉冲', description: '让任意对手后退 2 格', value: -2, count: 3 },
  { type: 'shortcut', name: '捷径导航', description: '传送至赛道最近弯道格', value: 0, count: 2 },
];

class CardDeck {
  constructor() {
    /** 抽牌堆 */
    this.drawPile = [];
    /** 弃牌堆 */
    this.discardPile = [];

    this._buildDeck();
    this._shuffle(this.drawPile);
  }

  /**
   * 根据模板生成完整牌组
   * @private
   */
  _buildDeck() {
    for (const tmpl of CARD_TEMPLATES) {
      for (let i = 0; i < tmpl.count; i++) {
        this.drawPile.push({
          id: uuidv4(),
          type: tmpl.type,
          name: tmpl.name,
          description: tmpl.description,
          value: tmpl.value,
        });
      }
    }
  }

  /**
   * Fisher-Yates 洗牌算法
   * @param {Array} arr
   * @private
   */
  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  /**
   * 抽一张牌；若抽牌堆为空，先将弃牌堆洗入
   * @returns {object|null} 卡牌对象，牌堆彻底耗尽时返回 null
   */
  draw() {
    if (this.drawPile.length === 0) {
      if (this.discardPile.length === 0) return null;
      // 将弃牌堆重新洗入抽牌堆
      this.drawPile = [...this.discardPile];
      this.discardPile = [];
      this._shuffle(this.drawPile);
    }
    return this.drawPile.pop();
  }

  /**
   * 一次性抽多张牌
   * @param {number} count
   * @returns {object[]}
   */
  drawMany(count) {
    const cards = [];
    for (let i = 0; i < count; i++) {
      const card = this.draw();
      if (card) cards.push(card);
    }
    return cards;
  }

  /**
   * 将卡牌放入弃牌堆
   * @param {object} card
   */
  discard(card) {
    this.discardPile.push(card);
  }

  /**
   * 返回当前牌堆统计
   */
  stats() {
    return {
      drawPile: this.drawPile.length,
      discardPile: this.discardPile.length,
    };
  }
}

module.exports = CardDeck;
