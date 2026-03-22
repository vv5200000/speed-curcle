# 开发进度记录 - Neon District Racing (2026-03-22)

本记录总结了今天（2026-03-22）所有的开发进度与架构变动，以便下次开发无缝衔接。

---

## 🎯 今日完成事项 (Phase 4 启动)

今天开始推进 **Phase 4: 多人竞技与策略 (DRAFT & COMBAT PvP Modules)**，主要完成了基础骨架搭建和尾流系统的完整后端逻辑。

### 1. 类型系统扩展 (`client/src/types/game.ts`)

新增了 Phase 4 相关的所有 TypeScript 类型定义：

- **`CardEffect`** 新增 `slipstream?: boolean` 和 `slipstreamTargetId?: string`，用于广播尾流触发事件。
- **`PublicGameState`** 新增 `pendingAttack` 字段，用于在防守等待状态下让所有玩家感知到当前挂起的攻击：
  ```ts
  pendingAttack: { attackerId, targetId, cardId, expireAt } | null
  ```
- **`PlayerMovedEvent`** 新增 `slipstream?: boolean`，广播移动后是否触发了尾流。
- **新增事件载荷类型**：`AttackPendingEvent`（广播挂起的攻击）、`DefendAttackPayload`（防守响应）。

### 2. 尾流系统 (Slipstream) — 后端完整实现

#### 服务端 (`server/game/GameRoom.ts`)
在 `movePlayer()` 方法中，玩家移动落点后，检查其前方 1~2 格是否有其他玩家：
- 若满足，则 `player.actionPoints += 1`，并在返回载荷中标记 `slipstream: true`。
- 同时新增了 `pendingAttack` 和 `pendingAttackTimer` 字段，为防守时间窗口做好了数据结构准备。

```ts
// 新增到 movePlayer() 返回值
const dist = (target.position - newPos + TRACK_LENGTH) % TRACK_LENGTH;
if (dist === 1 || dist === 2) {
  slipstream = true;
  player.actionPoints += 1;
}
```

#### 单机引擎 (`client/src/game/SinglePlayerGame.ts`)
同步修改 `_movePlayer()` 方法，与服务端逻辑保持一致，确保单机体验和联机一致。

### 3. 服务端广播更新 (`server/index.ts`)
`player-moved` 事件载荷新增 `slipstream` 字段，确保客户端收到移动广播时能感知尾流触发。

### 4. 前端消息通知 (`client/src/hooks/useSinglePlayer.ts`)
当 `movePlayer` 返回 `slipstream: true` 时，向消息日志 `addMessage` 推送：
```
💨 蹭到尾流！获得额外行动点！
```

---

## 🚀 下次开发起点 (Phase 4 剩余任务)

下次开发应继续完成 Phase 4 未完成的部分：

### 1. 尾流 UI 视觉特效 (`client/src/components/GameBoard.tsx`)
- 在 SVG 赛车图标后方渲染一道发光拖尾残影（3 个透明度递减的圆形）。
- 使用 React `useState` + `setTimeout` 控制拖尾动画，持续约 1.5 秒后消失。

### 2. 战斗卡牌射程判定 (`server/game/GameRoom.ts` + `SinglePlayerGame.ts`)
在 `playCard()` 的 `slow` 分支中加入射程检验：
```ts
// 仅当两者距离 ≤ 5 格时允许打出攻击卡
const dist = Math.abs(player.position - target.position);
if (dist > 5) return { ok: false, error: '目标过远，超出射程' };
```

### 3. 防守时间窗口 (5s) 系统
这是本次 Phase 4 最核心的功能，所有改动已有类型结构准备（`pendingAttack`/`pendingAttackTimer`），实现方式：
- `playCard()` `slow` 分支中，不立即结算，而是设置 `this.pendingAttack` 并启动 5 秒定时器。
- 服务端向全场广播 `attack-pending` 事件（含 `expireAt` 时间戳）。
- 目标玩家前端弹出防守倒计时弹窗，若有 `shield` 卡可一键打出。
- 新增服务端事件处理：`defend-attack`（防守）和定时器回调（超时自动结算）。
- 单机模式下，AI 收到攻击后以 1~3 秒随机延迟模拟判断是否打出护盾。

### 4. Debuff 视觉效果 (`client/src/components/GameBoard.tsx`)
- 被减速/爆缸的格子上叠加特效层（例如电磁脉冲光晕）。
- 维修站 Pit 经过时弹出强制降温公告。

---

## 🛠 现有架构说明（延续自 Phase 3）

* **测试启动与打包**：
  * 前端：在 `/client` 中运行 `npm run dev`；打包运行 `npm run build`。
  * 服务端：在 `/server` 中使用 `npx tsc --noEmit` 进行类型验证；运行使用 `ts-node index.ts`。
* **单机模式 (Singleplayer)**：
  * 所有多人规则变动（如尾流、防守窗口）**必须同时在 `server/game/GameRoom.ts` 和 `client/src/game/SinglePlayerGame.ts` 中同步**，确保单机体验与联机一致。
