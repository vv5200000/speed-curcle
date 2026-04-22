# 游戏机制还原任务列表

- [x] **服务端修改**
    - [x] `server/index.ts`: 移除或禁用 `player-move` socket 事件监听
    - [x] `server/game/GameRoom.ts`: 检查并优化档位与行动点的关联逻辑
- [x] **客户端 UI 修改**
    - [x] `client/src/components/CardHand.tsx`: 移除掷骰子按钮、动画及相关状态
    - [x] `client/src/components/GameRulesModal.tsx`: 更新规则说明，删除骰子部分，强调卡牌驱动
    - [x] `client/src/components/Lobby.tsx`: 清理可能存在的模式切换逻辑（保持单一硬核模式）
- [x] **单机与 AI 逻辑更新**
    - [x] `client/src/game/SinglePlayerGame.ts`: 修改 AI 决策逻辑，禁止其进行骰子移动
    - [x] `client/src/hooks/useSinglePlayer.ts`: 移除对人类玩家掷骰子操作的封装调用
- [x] **验证与清理**
    - [x] 确保手牌补充逻辑在没有骰子的情况下依然顺畅
    - [x] 验证过弯结算和热量机制在纯卡牌模式下正常工作
