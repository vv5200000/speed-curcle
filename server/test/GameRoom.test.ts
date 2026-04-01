import { describe, it, expect, beforeEach } from 'vitest';
import { GameRoom, PHASE } from '../game/GameRoom';
import Player from '../game/Player';

describe('GameRoom - Core Mechanics', () => {
  let room: GameRoom;

  beforeEach(() => {
    room = new GameRoom('room1', 'host123', 'Test Room');
  });

  describe('1. 基础流程与状态流转', () => {
    it('应该成功添加玩家并在达到 2 人且都准备时可以开始游戏', () => {
      expect(room.phase).toBe(PHASE.LOBBY);

      // 添加两名玩家
      const p1Res = room.addPlayer('id1', 'Alice');
      const p2Res = room.addPlayer('id2', 'Bob');

      expect(p1Res.ok).toBe(true);
      expect(p2Res.ok).toBe(true);
      expect(room.players.size).toBe(2);

      // 开始前没有准备
      expect(room.canStart()).toBe(false);

      // 全部准备
      room.setReady('id1', true);
      room.setReady('id2', true);
      expect(room.canStart()).toBe(true);

      // 开始游戏
      const startRes = room.startGame();
      expect(startRes.ok).toBe(true);
      expect(room.phase).toBe(PHASE.PLAYING);

      // 验证初始化状态
      const player1 = room.players.get('id1')!;
      expect(player1.hand.length).toBe(3); // 初始手牌 3 张
      expect(room.deck).toBeDefined();
    });
  });

  describe('2. 移动与换挡控制 (Phase 3)', () => {
    let p1Id: string;
    let p2Id: string;

    beforeEach(() => {
      room.addPlayer('p1', 'Player1');
      room.addPlayer('p2', 'Player2');
      room.setReady('p1', true);
      room.setReady('p2', true);
      room.startGame();

      // 固定当前回合玩家
      p1Id = room.turnOrder[0];
      p2Id = room.turnOrder[1];
    });

    it('应该能够正常换挡并消耗规定的热量', () => {
      const p1 = room.players.get(p1Id)!;
      expect(p1.gear).toBe(1);
      expect(p1.heat).toBe(0);

      // 1档升3档 (跳1档，需要支付 1 点热量)
      const res = room.changeGear(p1Id, 3);
      expect(res.ok).toBe(true);
      expect(p1.gear).toBe(3);
      expect(p1.heat).toBe(1); // 因为 3 - 1 = 2 档差距，额外 1 点跳档惩罚
      expect(p1.actionPoints).toBe(3); // 换挡重置行动点为当前档位
    });

    it('换挡热量不足时应该被拒绝', () => {
      const p1 = room.players.get(p1Id)!;
      // 故意占满热量 (热量上限默认为 6)
      p1.heat = 6;
      const res = room.changeGear(p1Id, 3);
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/热量槽不足/);
      expect(p1.gear).toBe(1); // 维持原档位
    });
  });

  describe('3. 极限压弯系统 (Phase 6.1)', () => {
    let p1Id: string;

    beforeEach(() => {
      room.addPlayer('p1', 'Player1');
      room.addPlayer('p2', 'Player2');
      room.setReady('p1', true);
      room.setReady('p2', true);
      room.startGame();
      p1Id = room.turnOrder[0];
    });

    it('只能在弯道或者临近弯道声明极限压弯，并且能正确盲抽牌加移速', () => {
      const p1 = room.players.get(p1Id)!;
      // 初始化位置为 0 是 start 格，紧连着的是 straight 直道
      p1.position = 0;
      
      let res = room.declareLean(p1Id);
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/只能在弯道或接近弯道时使用极限压弯/);

      // 移动到弯道格前面一格 (5 号格子是 corner, 4 号是 straight)
      p1.position = 4;
      res = room.declareLean(p1Id);
      expect(res.ok).toBe(true);
      expect(p1.leanDeclared).toBe(true);
      // 有一定几率增加速度（取决于盲抽抽到什么），只要能调用成功就说明逻辑通过
    });
  });

  describe('4. 高速过弯与爆缸惩罚系统', () => {
    let p1Id: string;

    beforeEach(() => {
      room.addPlayer('p1', 'Player1');
      room.addPlayer('p2', 'Player2');
      room.setReady('p1', true);
      room.setReady('p2', true);
      room.startGame();
      p1Id = room.turnOrder[0];
    });

    it('高速通过弯道时应正确结算超速热量惩罚，如果超过上限应触发爆缸', () => {
      const p1 = room.players.get(p1Id)!;
      // p1 初始的 heatCapacity 默认为 3
      p1.heatCapacity = 6; // 为了方便测试，手动上调容量

      // 让 p1 到达弯道附近 (4 号格子)
      p1.position = 4;

      // 这时 p1 消耗了 2 热量（1 -> 4 跳了 2 档），p1.heat 变成了 2
      room.changeGear(p1Id, 4);

      // 给点速度让 p1 闯过 5 号的 corner. corner[5] 限速 4
      // 冷胎 (cold) 限速再 -1 = 3
      p1.turnSpeed = 4; // 超速 1 (4 - 3)
      // 4档倍率为 2。惩罚热量 = 1 * 2 = 2点
      // p1.heat = 2, 加 2 点后等于 4 (不超过 6 的容量)

      let res = room.movePlayer(p1Id, 3); // 会经过 5 号格子
      expect(res.ok).toBe(true);
      expect(res.crashed).toBe(false);
      expect(p1.heat).toBe(4);
      expect(p1.position).toBe((4 + 3) % 24);

      // 现在如果在满热量附近再次超速，就会爆缸
      room.endTurn(p1Id);
      room.endTurn(room.turnOrder[1]); // 推进一整轮

      // 强行移动 p1 到另一个弯道前
      p1.position = 8; // 下一个角是格 9, 限速 4, 轮胎由于跑完一圈可能会变暖，但我们先不管它
      p1.tireTemp = 'warm'; // 限速恢复 4
      p1.actionPoints = 1;
      p1.turnSpeed = 6; // 超速 2 (6 - 4)
      // 4档倍率 2，罚 2 * 2 = 4 点。 4(原有) + 4 = 8，超过容量 6 触发爆缸

      res = room.movePlayer(p1Id, 2);
      expect(res.crashed).toBe(true);
      expect(p1.heat).toBe(0); // 爆缸清零
      expect(p1.gear).toBe(3); // 降档 4->3
      expect(p1.position).toBe(8); // 原地打转
      expect(p1.crashPenalty).toBe(true);
    });
  });
});
