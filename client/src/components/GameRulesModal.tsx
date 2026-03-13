/**
 * components/GameRulesModal.tsx
 * 游戏规则说明弹窗
 */

import React from 'react';
import { CardType } from '../types/game';

interface GameRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CARD_EXPLANATIONS: Record<CardType, { icon: string; name: string; desc: string }> = {
  move: { icon: '🚗', name: '移动卡', desc: '根据卡牌数值（通常1-3格）直接在赛道上前进相应的距离。' },
  boost: { icon: '⚡', name: '加速卡 (Boost)', desc: '增加你的行动点，或者获得大幅度的前进爆发力，让你跑得更远。' },
  shortcut: { icon: '🛤️', name: '捷径卡 (Shortcut)', desc: '无视普通路径，直接瞬移一段距离，是落后时追赶的利器。' },
  slow: { icon: '💥', name: '减速卡 (Slow)', desc: '指定一名其他玩家，使其受到攻击！目标玩家不仅会后退格子，甚至可能会跳过回合。' },
  shield: { icon: '🛡️', name: '护盾卡 (Shield)', desc: '激活后，在接下来的一回合内免疫其他玩家的“减速卡”攻击。' },
};

const CELL_EXPLANATIONS = [
  { icon: '🏁', name: '起点/终点', desc: '完成一圈的标志。每次经过这里，不仅圈数+1，还会额外摸一张牌。' },
  { icon: '🔄', name: '弯道', desc: '普通的弯道路段。' },
  { icon: '🔧', name: '维修站 (Pit)', desc: '不幸踩中维修站的玩家，下回合会少一个行动点，被迫休整。' },
];

const GameRulesModal: React.FC<GameRulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div 
        className="bg-gray-900 border border-cyan-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl shadow-cyan-900/40 relative animate-fade-in-up"
      >
        {/* 头部 */}
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-extrabold text-cyan-400 neon-cyan flex items-center gap-2">
            📖 游戏规则手册
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 内容区 */}
        <div className="p-6 space-y-8 text-sm text-gray-300">
          
          {/* 游戏目标 */}
          <section>
            <h3 className="text-yellow-400 font-bold text-lg mb-2 flex items-center gap-2">
              🏆 游戏目标
            </h3>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 leading-relaxed">
              <p>
                欢迎来到 <strong>Neon District Racing（霓虹竞速）</strong>！这是一个回合制的策略赛车游戏。
                你的目标是率先在赛道上完成 <strong>规定的圈数（默认 3 圈）</strong> 即可获得冠军！🥇
              </p>
            </div>
          </section>

          {/* 如何游玩 */}
          <section>
            <h3 className="text-green-400 font-bold text-lg mb-2 flex items-center gap-2">
              🕹️ 回合机制与操作
            </h3>
            <ul className="space-y-3 bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <li className="flex gap-2">
                <span className="text-green-300">⚡</span>
                <span><strong>行动机制：</strong> 轮到你的回合时，你需要选择：是 <strong>掷骰子随机移动</strong>，还是 <strong>打出一张手牌</strong>。</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-300">⏳</span>
                <span><strong>时间限制：</strong> 每回合有 60 秒倒计时，如果不做选择，超时将自动结束回合。</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-300">🃏</span>
                <span><strong>补牌规则：</strong> 回合结束时如果手牌未满，会自动补充手牌。每次经过终点线（跑完一圈）不仅圈数+1，还会额外奖励手牌！</span>
              </li>
            </ul>
          </section>

          {/* 卡牌图鉴 */}
          <section>
            <h3 className="text-purple-400 font-bold text-lg mb-3 flex items-center gap-2">
              🎴 手牌图鉴
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(CARD_EXPLANATIONS).map(([key, info]) => (
                <div key={key} className="bg-gray-800/80 rounded-xl p-3 border border-gray-700 flex gap-3 hover:border-gray-500 transition-colors">
                  <div className="text-3xl flex-shrink-0 bg-gray-900 rounded-lg w-12 h-12 flex items-center justify-center">
                    {info.icon}
                  </div>
                  <div>
                    <div className="font-bold text-white mb-1">{info.name}</div>
                    <div className="text-xs text-gray-400 leading-tight">{info.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 赛道地形 */}
          <section>
            <h3 className="text-orange-400 font-bold text-lg mb-3 flex items-center gap-2">
              🗺️ 赛道地形
            </h3>
            <div className="flex flex-col gap-2">
              {CELL_EXPLANATIONS.map((info, idx) => (
                <div key={idx} className="bg-gray-800/50 rounded-xl p-3 border border-gray-700 flex items-center gap-3">
                  <div className="text-xl w-8 text-center">{info.icon}</div>
                  <div>
                    <span className="font-bold text-white mr-2">{info.name}:</span>
                    <span className="text-gray-400">{info.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
        
        {/* 底部 */}
        <div className="sticky bottom-0 bg-gray-900/95 backdrop-blur-md border-t border-gray-800 p-4 text-center">
          <button 
            onClick={onClose}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-8 rounded-xl transition-all shadow-lg shadow-cyan-900/30"
          >
            我明白了，开始飙车！🏎️
          </button>
        </div>

      </div>
    </div>
  );
};

export default GameRulesModal;
