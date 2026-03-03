# 🏁 Neon District Racing

> 格子 × 卡牌 多人实时赛车游戏
> 技术栈：React + TypeScript + Tailwind CSS + Node.js + Socket.io

---

## 快速启动

### 1. 安装依赖

```bash
# 安装服务端依赖
cd server && npm install

# 安装客户端依赖
cd ../client && npm install
```

### 2. 启动服务端

```bash
cd server
npm run dev     # 开发模式（nodemon 热重载）
# 或
npm start       # 生产模式
```

服务端默认监听 `http://localhost:3001`

### 3. 启动客户端

```bash
cd client
npm run dev
```

客户端默认访问 `http://localhost:5173`

---

## 目录结构

```
neon-racing/
├── server/
│   ├── index.js            # Express + Socket.io 服务器入口
│   ├── game/
│   │   ├── GameRoom.js     # 房间逻辑（状态机 + 合法性检验）
│   │   ├── Player.js       # 玩家对象
│   │   └── CardDeck.js     # 牌组（洗牌 + 发牌 + 弃牌）
│   └── package.json
└── client/
    ├── src/
    │   ├── App.tsx                    # 根组件（阶段路由）
    │   ├── main.tsx                   # React 入口
    │   ├── index.css                  # 全局样式
    │   ├── components/
    │   │   ├── Lobby.tsx              # 大厅（创建/加入房间）
    │   │   ├── GameBoard.tsx          # SVG 赛道渲染
    │   │   ├── CardHand.tsx           # 手牌区（打牌 + 骰子移动）
    │   │   └── PlayerStatus.tsx       # 玩家状态栏
    │   ├── hooks/
    │   │   └── useSocket.ts           # Socket.io 封装 hook
    │   ├── types/
    │   │   └── game.ts                # TypeScript 类型定义
    │   └── store/
    │       └── gameStore.ts           # Zustand 状态管理
    ├── index.html
    ├── vite.config.ts
    ├── tailwind.config.js
    └── package.json
```

---

## 游戏规则

| 项目 | 说明 |
|------|------|
| 人数 | 2-4 人 |
| 目标 | 最先完成 **3 圈** 的玩家获胜 |
| 赛道 | 24 格环形赛道，含直道 / 弯道 / 维修站 |
| 回合 | 轮流行动，每回合 1 个行动点 |
| 卡牌 | 初始发 4 张，完成一圈/路过维修站时补牌 |

### 卡牌类型

| 类型 | 名称示例 | 效果 |
|------|---------|------|
| `move`     | 急速冲刺 / 氮气喷射 | 前进 N 格 |
| `boost`    | 涡轮增压           | 本回合额外行动点 |
| `shield`   | 能量护盾           | 抵挡下一次减速 |
| `slow`     | 电磁脉冲           | 让指定对手后退 2 格 |
| `shortcut` | 捷径导航           | 传送至最近弯道格 |

### 特殊格子

| 图标 | 类型       | 效果 |
|------|----------|------|
| 🏁   | `start`  | 起跑线 / 终点线，经过计圈 |
| 🔵   | `corner` | 弯道，捷径卡目标格 |
| 🔧   | `pit`    | 维修站，经过时补抽 1 张牌 |

---

## Socket 事件一览

### 客户端 → 服务端

| 事件 | 载荷 | 说明 |
|------|------|------|
| `create-room`  | `{ roomName, playerName }` | 创建房间 |
| `join-room`    | `{ roomId, playerName }`   | 加入房间 |
| `player-ready` | `{ ready: boolean }`       | 准备状态 |
| `start-game`   | `{}`                       | 房主开始游戏 |
| `player-move`  | `{ steps: number }`        | 移动 N 格 |
| `play-card`    | `{ cardId, targetId? }`    | 打出卡牌 |
| `end-turn`     | `{}`                       | 结束回合 |

### 服务端 → 客户端

| 事件 | 载荷 | 说明 |
|------|------|------|
| `game-state-update`    | `PublicGameState`      | 广播给全房间 |
| `private-state`        | `PrivateGameState`     | 含手牌，仅发给本人 |
| `card-played`          | `{ playerId, effect }` | 卡牌效果广播 |
| `player-moved`         | `{ playerId, ... }`    | 移动通知 |
| `your-turn`            | —                      | 轮到你了 |
| `player-disconnected`  | `{ playerId, name }`   | 玩家断线 |
| `game-over`            | `{ rankings }`         | 游戏结束 |
