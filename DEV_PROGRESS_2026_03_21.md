# 开发进度记录 - Neon District Racing (2026-03-21)

本记录总结了迄今为止（包含今天在内）所有的开发进度与架构变动，以便下次开发无缝衔接。

## 🎯 已完成的里程碑 (Phase 1 ~ Phase 3)

### 1. 基础架构升级与类型系统 (TypeScript)
* **服务端 TypeScript 重构**：将 Node.js 后端全面迁移至 TypeScript (`index.ts`, `GameRoom.ts`, `Player.ts`, `CardDeck.ts`)。
* **ES Modules 兼容**：项目支持 `type: "module"` 与 Node 环境下的新模块解析。
* **共享数据接口**：在 `client/src/types/game.ts` 定义了包含 `PublicPlayer`、`CardEffect` 和各种 Socket 泛型事件载荷的核心接口。

### 2. 核心 UI/UX 落地
* **SVG 拟真赛道**：完成了客户端基于格子的霓虹赛道渲染引擎（`GameBoard.tsx`）。
* **控制中心**：实现了高度互动的发牌控制台（`CardHand.tsx`），包括卡牌动态 Hover（3D 光照特效）、手牌显示与倒计时。
* **状态面板**：在 `PlayerStatus.tsx` 中加入了各玩家圈数进度条、完赛名次以及实时的角色数据监控。
* **单机调试模拟器**：构建 `useSinglePlayer` 配合本地 `SinglePlayerGame.ts`，方便在没有后端联机时进行功能和 AI 的快速调试。

### 3. 热力及进阶驾驶机制 (Heat, Gear, Tire)
完全实现了 GDD 中定义的基础进阶操作：
* **换档系统 (Gear)**：玩家可随时调整预设档位（1-6档）。档位决定了玩家本回合自带的初始行动力 (AP)。
* **跳档惩罚**：如果切换的跨度超过 1 档（例如直接从 1 档切到 3 档），需支付额外的热力值（Heat）。
* **超速过弯与发热**：
  * 为所有弯道（corner）指派了 `speedLimit` 属性。
  * `turnSpeed` 会实时统计玩家单回合内所有的位移增量。
  * 如果 `turnSpeed > speedLimit` 时穿过弯道，根据当前档位的倍率增加 **热量 (Heat)**。
* **爆缸检定 (Spin Out)**：
  * 每个人的热力槽上限 `heatCapacity` 默认为 3。
  * 如果操作后总 Heat 超出上限，车辆将发生爆缸：退回至移动前的位置、档位下降、失去剩下的行动点数、且本回合结束。

## 🚀 下次开发起点 (Phase 4 规划)

下一次开发应直接进入 **Phase 4: 多人竞技与策略 (DRAFT & COMBAT PvP Modules)**。优先处理的核心事项包括：

1. **尾流系统 (Slipstream)**
   * **逻辑层面**：若玩家移动经过或停留在另一位玩家所在格子的正后方 1~2 格，根据相对车速奖励额外的免费行动点或移动距离。
   * **视觉特效**：前端 `GameBoard` 需要出现发光的拖尾 UI，并在获得加成时显示 Toast "蹭到尾流！"。

2. **战斗互坑与射程判定**
   * **目标检定系统**：完善目前减速卡（`slow`）的指定逻辑，加入**范围 (Range)** 以及 **视线 (Line of Sight)**。例如攻击可能需要前车和后车在同一发车道直线区间内。
   * **护盾机制细化**：防守窗口期倒计时——如果被针对，是否能给予对方 3~5 秒的时间打出 `Shield` 防御卡反击。

3. **轮胎损耗模块补充**
   * 目前 `tireTemp` (Cold/Warm) 仅作为预留插槽做了一层减 1 的简易判定。后期应当加入随着圈数递增温度变化，结合 Pit Stop 维修站进行强制冷却和洗牌。

## 🛠 现有遗留架构说明与注意事项

* **测试启动与打包**：
  * 前端：在 `/client` 中可运行 `npm run dev`；打包运行 `npm run build`。
  * 服务端：在 `/server` 中可使用 `npx tsc --noEmit` 进行类型验证。运行方式为 `ts-node index.ts` 结合相关 npm 脚本。
* **单机模式 (Singleplayer)**
  * 目前如果在前端选择“单人游戏”，游戏逻辑完全依赖于 `client/src/game/SinglePlayerGame.ts`。所有新增的多人物理校验（如尾流等），**不仅需要写在服务端的 `GameRoom.ts`，也要在 `SinglePlayerGame.ts` 里同步一遍**，以保证单机体验与联机互通一致。
