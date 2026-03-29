/**
 * CardDeck.ts
 * 牌组管理：完整 Phase 5 卡组（40张）
 *
 * 卡牌稀有度:
 *  - N (普通)  白色边框
 *  - R (稀有)  蓝色边框
 *  - S (史诗)  紫色边框
 *  - L (传说)  金色边框
 *
 * 卡牌类型说明：
 *  - move      前进指定步数
 *  - cooldown  冷却热力卡（将热力卡从手牌移回热量池）
 *  - shield    阻挡下一次负面效果（防御窗口用）
 *  - slow      让目标玩家后退（PVP 攻击）
 *  - attack    特殊 PVP 攻击（路障/漏油/碰撞）
 *  - counter   反制卡（减少或反弹攻击效果）
 *  - shortcut  直接跳到赛道上最近的弯道格
 *  - heat      热力卡——不可主动打出，过弯超速时自动生成
 */

import { v4 as uuidv4 } from 'uuid';
import { Card } from './Player';

/** 卡牌模板接口 */
interface CardTemplate {
  type: string;
  name: string;
  description: string;
  value: number;
  rarity: 'N' | 'R' | 'S' | 'L';
  isHeatCard?: boolean;
  count: number;
}

/** 完整卡牌模板表（不含热力卡，热力卡在游戏中动态生成）*/
const CARD_TEMPLATES: CardTemplate[] = [
  // ── 基础移动牌（N 普通）──────────────────────────────
  { type: 'move', name: '轻踩油门',    description: '前进 1 格',       value: 1,  rarity: 'N', count: 4 },
  { type: 'move', name: '稳健加速',    description: '前进 2 格',       value: 2,  rarity: 'N', count: 6 },
  { type: 'move', name: '急速冲刺',    description: '前进 3 格',       value: 3,  rarity: 'N', count: 5 },

  // ── 稀有移动牌（R 稀有）─────────────────────────────
  { type: 'move', name: '氮气喷射',    description: '前进 4 格',       value: 4,  rarity: 'R', count: 4 },
  { type: 'move', name: '全力加速',    description: '前进 5 格',       value: 5,  rarity: 'R', count: 3 },

  // ── 史诗移动牌（S 史诗）─────────────────────────────
  { type: 'move', name: '超频驱动',    description: '前进 6 格，但下回合热量 +1', value: 6,  rarity: 'S', count: 2 },

  // ── 冷却牌（主动散热）────────────────────────────────
  { type: 'cooldown', name: '冷却液',       description: '将 1 张热力卡从手牌移回热量池', value: 1, rarity: 'R', count: 3 },
  { type: 'cooldown', name: '热力疏导',     description: '将手牌中所有热力卡移回热量池，本回合不可再出其他牌', value: 99, rarity: 'S', count: 1 },

  // ── 防御牌（护盾/反制）───────────────────────────────
  { type: 'shield',  name: '能量护盾',  description: '阻挡下一次负面效果', value: 0, rarity: 'R', count: 2 },
  { type: 'counter', name: '黑客反制',  description: '将对手攻击效果反弹回给攻击者', value: 0, rarity: 'S', count: 1 },
  { type: 'counter', name: '紧急规避',  description: '将即将受到的位移惩罚减少 1 格', value: 1, rarity: 'N', count: 2 },

  // ── PVP 攻击牌────────────────────────────────────────
  { type: 'slow',   name: '电磁脉冲',    description: '让任意对手后退 2 格（射程 5 格）', value: -2, rarity: 'R', count: 2 },
  { type: 'attack', name: '路障投掷',    description: '让目标下回合移动 -2（射程 3 格）', value: -2, rarity: 'N', count: 2 },
  { type: 'attack', name: '碰撞冲击',    description: '紧邻前方玩家后退 1 格（必须紧邻）', value: -1, rarity: 'R', count: 2 },

  // ── 特殊牌──────────────────────────────────────────
  { type: 'shortcut', name: '捷径导航',  description: '传送至赛道最近弯道格',        value: 0,  rarity: 'R', count: 1 },
];

/** 热力卡模板（单独管理，不进入常规牌库）*/
export const HEAT_CARD_TEMPLATE: CardTemplate = {
  type: 'heat',
  name: '热力',
  description: '⚠ 占用手牌格位，不可打出。过弯超速自动生成。',
  value: 0,
  rarity: 'N',
  isHeatCard: true,
  count: 0, // 动态生成，不写入初始牌库
};

export function createHeatCard(): Card {
  return {
    id: uuidv4(),
    type: 'heat',
    name: '热力',
    description: '⚠ 占用手牌格位，不可打出。',
    value: 0,
    rarity: 'N',
    isHeatCard: true,
    isPlayable: false,
  };
}

export default class CardDeck {
  drawPile: Card[];
  discardPile: Card[];

  constructor() {
    this.drawPile = [];
    this.discardPile = [];
    this._buildDeck();
    this._shuffle(this.drawPile);
  }

  _buildDeck() {
    for (const tmpl of CARD_TEMPLATES) {
      for (let i = 0; i < tmpl.count; i++) {
        this.drawPile.push({
          id: uuidv4(),
          type: tmpl.type,
          name: tmpl.name,
          description: tmpl.description,
          value: tmpl.value,
          rarity: tmpl.rarity,
          isHeatCard: tmpl.isHeatCard ?? false,
          isPlayable: !(tmpl.isHeatCard),
        });
      }
    }
  }

  _shuffle(arr: Card[]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  draw(): Card | null {
    if (this.drawPile.length === 0) {
      if (this.discardPile.length === 0) return null;
      // 弃牌堆洗入（热力卡不进弃牌堆，不参与洗牌）
      this.drawPile = [...this.discardPile];
      this.discardPile = [];
      this._shuffle(this.drawPile);
    }
    return this.drawPile.pop() ?? null;
  }

  drawMany(count: number): Card[] {
    const cards: Card[] = [];
    for (let i = 0; i < count; i++) {
      const c = this.draw();
      if (c) cards.push(c);
    }
    return cards;
  }

  discard(card: Card) {
    // 热力卡不进弃牌堆（单独追踪）
    if (!card.isHeatCard) {
      this.discardPile.push(card);
    }
  }

  stats() {
    return {
      drawPile: this.drawPile.length,
      discardPile: this.discardPile.length,
    };
  }
}
