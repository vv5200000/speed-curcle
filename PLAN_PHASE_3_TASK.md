# Neon District: Moto Heat - Development Plan

- [x] **Phase 1: 核心基础架构 (Core Engine & Socket)**
  - [x] 初始化前后端项目 (Vite + React / Node.js + Socket.io)
  - [x] 实现基础数据结构与 TypeScript 类型定义 (Models & Interfaces)
  - [x] 搭建服务端核心状态机 (LOBBY -> WAITING -> PLAYING)
  - [x] 实现基础 Socket 事件通信 (创建/加入房间, 准备)
  - [x] 核心卡牌移动与回合流转系统 (TURN_CARD_SELECTION, TURN_MOVE)

- [x] **Phase 2: 前端赛道与仪表盘 (UI/UX Foundation)**
  - [x] 搭建 CSS 样式体系 (Neon Cyberpunk 色彩变量与布局)
  - [x] 绘制可缩放的基础赛道组件 (SVG Track Render)
  - [x] 实现赛车/玩家位置的平滑动画更新
  - [x] 构建手牌区域 UI (抽牌、出牌、选中动画)
  - [x] 集成基础游戏 HUD (圈数、排名、基础仪表)

- [x] **Phase 3: 热力与进阶系统 (HEAT, GEAR & TIRE Modules)**
  - [x] 服务端实现 Heat 模块逻辑 (超速计算、爆缸判定、冷却)
  - [x] 服务端实现 Gear 模块 (换档结算、倍率应用)
  - [x] 前端构建动态 Heat 表盘组件
  - [x] 前端构建 Gear 换档控制组件
  - [x] 整合轮胎状态指示与维修站格子交互

- [ ] **Phase 4: 多人竞技与策略 (DRAFT & COMBAT PvP Modules)**
  - [ ] 尾流 (Slipstream) 引擎计算判定与 UI 拖尾效果
  - [ ] 战斗卡牌目标判定系统 (距离与范围计算)
  - [ ] 防御响应时间窗口 (5s) 的前端倒计时与服务端状态阻塞
  - [ ] 各类 Debuff 效果渲染 (漏油、路障、电磁脉冲)

- [ ] **Phase 5: AI 兜底与终局结算**
  - [ ] 开发机器人决策树 (AI Behavior Logic)
  - [ ] 断线重连机制完善 (全量快照同步)
  - [ ] 胜负排名判定逻辑与同局并发完成排序
  - [ ] 结算面板与数据统计汇总 UI
  - [ ] 全局性能优化与测试 (Beta RC)

