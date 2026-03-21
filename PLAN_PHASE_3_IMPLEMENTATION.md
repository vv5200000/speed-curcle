# Neon District: Moto Heat - 模块化开发计划书

基于 `MODULAR_GDD_v2.md` 的详细规则体系，本计划书将开发周期划分为五个核心阶段（Phases）。通过渐进式开发，确保核心框架的稳定性，并让可插拔的模块逐一接入。

## User Review Required
> [!IMPORTANT]
> - 本计划书涉及项目的从零开始构建。请确认是否需要在本目录下直接通过 `create-vite` 或其他脚手架初始化前后端工程（如新建 `client/` 和 `server/`）。
> - 计划优先使用 `React + TypeScript + Vite` 作为前端栈，`Node.js + Socket.IO + TypeScript` 作为后端引擎。技术栈是否与您的期望一致？

##Proposed Changes & Phases

### Phase 1: 核心引擎与大厅网络 (Core Engine & Socket)
**目标**：跑通“无UI版的白板桌游”，确保网络通信机制与核心状态机(Core State Machine)可用。
- **构建环境**：初始化前后端工程（`/client` 和 `/server`），配置 TypeScript 环境与共享类型库（`shared/types`）。
- **服务端网络机制**：建立 Socket.IO 房间管理（Room Manager），处理连接、断线、重连等底层通信。
- **状态流转控制器**：实现顶级状态转移（LOBBY -> WAITING -> PLAYING -> FINISHED）。
- **回合基础系统**：实现 TURN_CARD_SELECTION, TURN_MOVE, TURN_END；实现模式A（轻量发牌、出牌、无障碍格子移动）。

### Phase 2: 可视化渲染与基础 UI (UI/UX Foundation)
**目标**：为 Phase 1 提供高保真的界面展示，确立 Neon Cyberpunk 的视觉基调。
- **设计系统（Design System）**：全套 CSS Variables/Tailwind 配置，导入赛博朋克深色调（Neon Cyan/Pink/Purple 等）。
- **静态赛道渲染（SVG/Canvas）**：开发带有特定标记（如终点/弯道）的赛道格子系统（Grid System）。
- **赛车与动画**：利用平滑过渡动画处理赛车从一个格子到另一个格子的移动。
- **基础HUD与手牌UI**：卡牌发光发热的 Hover 动效，手牌队列。

### Phase 3: 热力与档位模块接入 (HEAT & GEAR Modules)
**目标**：使游戏从“休闲骰子”进化为“策略竞速”，引入文档中的资源管理。
- **GEAR 控制层**：前端实现垂直档位挂杆动画，后端加入档位出牌张数限制。
- **HEAT 计算引擎**：实现有效限速 vs 有效速度的核心公式计算（GEAR倍率）。
- **风险与惩罚**：实现热量池溢出（Overheat）触发爆缸逻辑。
- **仪表面板完善**：热量进度槽（Flame Indicator），轮胎保温显示。

### Phase 4: PVP对战与尾流争夺 (COMBAT / DRAFT Modules)
**目标**：将对抗性拉满，打通互动交互链路。
- **尾流探测器（Slipstream）**：在 TURN_MOVE 后，通过网格位置判断前后关系，实现+2格子追踪。
- **Combat 攻击系统**：攻击目标有效性查询，全客户端广播遭遇攻击事件。
- **防御限时窗口响应（Time Window）**：由服务端触发挂起状态进行 5s 延时；前端弹出雷达报警 UI 与[装甲防守]选项。
- **事件负面标记（Debuff）**：场上漏油标记和玩家实体被沉默/封锁挂载。

### Phase 5: AI注入与终局结算 (AI & Polish)
**目标**：补充单人测试环境，完善结束面板与优化。
- **模块化 AI**：依据 `F.2` 的伪代码实现 AI 决策层（选择路线、激进热量阈值判定被动出牌）。
- **结算系统（Finish Line）**：排名收集器，记录里程、伤害，在所有目标结束或超出 200 回合时弹窗。
- **打磨（Polishing）**：微小粒子震动特效（Particles）、音效预留钩子及性能审计。

## Verification Plan
### Automated Tests
- 后端游戏逻辑单元测试（优先对核心计算公式进行 Jest 验证，比如 `B.1.2 过弯热量结算算法` 测试）。
- 使用 Socket.io-client 构建一套 Headless（无头浏览器） 机器人跑完全部 200 回合压力测试。

### Manual Verification
- 进行局域网内开房间多窗口联机联调，确认断线重读是否保留玩家手牌、状态快照是否完整。
- 逐个开关在 GDD 中定义的 Module Toggles 检查无缝加载。
