# 游戏规则优化：还原《Heat》核心机制实施计划

根据您的要求，我们将撤回之前的“轻量模式”简化方案。目标是**保留档位、热量、PVP攻防等深度机制**，但**完全隐藏/删除“掷骰子”随机移动**，使游戏回归到类似《Heat: Pedal to the Metal》桌游的纯卡牌驱动模式。

## 核心变更点

1. **移除随机性**：删除所有与掷骰子移动（Dice Roll）相关的 UI 和逻辑。
2. **强化卡牌驱动**：移动必须且仅能通过打出“移动卡”来实现。
3. **档位关联**：维持“档位 = 本回合可行动次数/可打卡牌数”的逻辑（目前代码已实现 `actionPoints = gear`）。

## Proposed Changes

### 1. 服务端逻辑调整 (`server/game/`)

#### [MODIFY] [GameRoom.ts](file:///Users/wanglipeng/speed-curcle/server/game/GameRoom.ts)
- **禁用 `player-move` 事件**：在 `server/index.ts` 中停止调用 `room.movePlayer`（由掷骰子触发的部分），或在 `GameRoom.ts` 中将该功能标记为内部私有，仅供卡牌调用。
- **强制卡牌移动**：确保玩家在没有行动点时只能结束回合。

#### [MODIFY] [CardDeck.ts](file:///Users/wanglipeng/speed-curcle/server/game/CardDeck.ts)
- **优化牌库分布**：由于删除了骰子，基础移动牌的权重需要微调，确保玩家不会因为抽不到移动牌而完全无法行动（增加低数值基础移动牌的比例）。

### 2. 客户端界面调整 (`client/src/`)

#### [MODIFY] [CardHand.tsx](file:///Users/wanglipeng/speed-curcle/client/src/components/CardHand.tsx)
- **移除骰子 UI**：删除 `handleDiceMove` 函数、`diceRolling` 状态以及界面上的紫色“掷骰子”按钮。
- **操作面板重构**：将“结束回合”和“换挡”作为核心操作，腾出空间给档位和热量显示。

#### [MODIFY] [GameRulesModal.tsx](file:///Users/wanglipeng/speed-curcle/client/src/components/GameRulesModal.tsx)
- **更新规则说明**：
  - 删除关于“掷骰子随机移动”的所有描述。
  - 明确说明“档位决定本回合可以打出的卡牌数量”。
  - 强调热量管理与过弯限速的博弈。

#### [MODIFY] [Lobby.tsx](file:///Users/wanglipeng/speed-curcle/client/src/components/Lobby.tsx)
- **删除模式选择**：不再需要“轻量模式”开关，游戏将统一采用这套硬核竞速规则。

### 3. 单机模式与 AI 调整

#### [MODIFY] [SinglePlayerGame.ts](file:///Users/wanglipeng/speed-curcle/client/src/game/SinglePlayerGame.ts)
- **AI 策略更新**：修改 `aiPlayCard` 逻辑，使其完全依赖卡牌策略，不再进行骰子移动尝试。

## 验证计划

### 自动化测试
- 运行现有的 `vitest` 测试，并增加针对“零骰子”环境的测试用例。
- 验证 `changeGear` 后的 `actionPoints` 是否正确限制了出牌数量。

### 手动验证
- 在单人模式下测试：确认界面上没有骰子按钮，必须通过打牌才能移动。
- 确认经过弯道时，档位对热量惩罚的倍率（Gear Multiplier）依然生效。
- 确认 PVP 攻击（EMP/路障）和防御（护盾）在纯卡牌环境下依然运作正常。
