# Changelog - 2026-04-23

## [Modified] 游戏机制核心还原 (Heat-Style Revert)

### 移除内容
- **完全移除掷骰子系统**：隐藏了客户端 `CardHand` 中的掷骰子按钮，禁用了服务端的 `player-move` socket 事件。
- **禁用 AI 随机移动**：单机模式 AI 不再尝试掷骰子，完全依赖卡牌策略。

### 新增/优化内容
- **手牌管理升级**：
    - 将手牌上限从 5 张调整为 **7 张**。
    - 实现了回合结束时的**手牌全额补满**机制，以支持高档位出牌策略。
- **档位逻辑强化**：确保档位（Gear）与行动点（Action Points）严格挂钩，维持卡牌驱动的稳定性。
- **AI 决策优化**：AI 现在支持在单回合内打出多张移动卡，行为更加智能。
- **UI/UX 更新**：
    - 更新了 `GameRulesModal`，删除了骰子相关规则，明确了档位驱动卡牌的玩法。
    - 调整了 `CardHand` 的操作面板排版。

### 涉及文件
- `server/index.ts`: 禁用 `player-move` 事件。
- `server/game/GameRoom.ts`: 实现补牌至上限逻辑。
- `server/game/Player.ts`: 调整 `HAND_LIMIT` 为 7。
- `client/src/types/game.ts`: 同步 `HAND_SIZE`。
- `client/src/components/CardHand.tsx`: 移除骰子 UI。
- `client/src/components/GameRulesModal.tsx`: 更新规则描述。
- `client/src/game/SinglePlayerGame.ts`: 更新 AI 逻辑与补牌。
- `client/src/hooks/useSinglePlayer.ts`: 禁用旧移动 Hook。
