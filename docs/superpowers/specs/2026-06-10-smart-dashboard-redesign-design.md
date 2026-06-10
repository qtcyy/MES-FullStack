# 智慧大屏（生产指挥中心）重构设计

- **日期**：2026-06-10
- **范围**：仅重构前端 `PlanDashboard.tsx`（数字化看板 / 智慧大屏），视觉与动效全面升级；数据保持 mock，不改动后端。
- **目标**：将现有可滚动的 ECharts 卡片网格，重构为固定满屏、科技蓝风格、富动效的"生产指挥中心"大屏。

---

## 1. 背景与现状

当前智慧大屏即 `mes/frontend/src/pages/digitization/PlanDashboard.tsx`：

- 单文件 537 行，深色主题（`#0f1a2e`），用 `echarts-for-react` 画 6 组图表。
- 布局为 Ant Design `Row/Col` 卡片网格，`minHeight: 100vh`，内容多时可上下滚动。
- **所有数据均为写死的 mock**；后端 `digitization/PlanDataController` 仅返回旧 Freemarker 视图，无真实数据 API。
- 路由：`App.tsx` → `digitization/plan` → `<PlanDashboard />`。

现有 6 类图表（重构后全部保留）：
1. 年度计划与工单趋势（line + bar）
2. 各工厂产量（bar）
3. 各车间产量（bar）
4. 良品率 / 不良率趋势（area line）
5. 地区产量对比（3 个环形图）
6. 设备仪表盘（4 个 gauge）

## 2. 需求确认（brainstorming 结论）

| 维度 | 决定 |
|------|------|
| 范围 | 只重构 `PlanDashboard`，数据保持 mock，不动后端 |
| 布局范式 | 固定满屏指挥中心，16:9 自适应，**不滚动** |
| 视觉风格 | 科技蓝（深蓝底 + 青蓝发光，经典工业大屏） |
| 动效程度 | 丰富动效（数字滚动、入场、流光、轮播高亮、实时刷新、粒子） |
| 布局结构 | 三列经典式（标题栏 + KPI 数字卡排 + 左/中/右三列） |
| 自适应方案 | CSS Grid + flex 弹性填充（方案一） |
| 动画实现 | **混合分工**：motion 管 DOM、CSS 管纯循环装饰、ECharts 管图表内部 |

## 3. 技术栈与依赖

现有：React 19、ECharts 6、echarts-for-react 3、Ant Design 6、Vite 8、TypeScript 6。项目用 inline-style，无 CSS 框架。

**新增依赖**：`motion`（framer-motion 新包名，v11+ 兼容 React 19）。用于 DOM 元素动画。

## 4. 架构与文件结构

将单一大文件拆分为职责清晰的小单元：

```
pages/digitization/
├── PlanDashboard.tsx            # 主容器：CSS Grid 三列布局编排，组合各区块
├── dashboard/
│   ├── theme.ts                 # 科技蓝色板、字号 clamp、阴影/发光常量（单一可信源）
│   ├── mockData.ts              # 所有 mock 数据集中，带 TS 类型（便于将来换真实 API）
│   ├── useCountUp.ts            # 数字滚动 hook（基于 motion useSpring/animate）
│   ├── useRotatingHighlight.ts  # 轮播高亮 hook（定时切换激活项）
│   ├── DashboardHeader.tsx      # 顶部标题栏：标题 + 实时时钟 + 装饰线
│   ├── KpiCard.tsx              # 单个 KPI 数字卡（数字滚动 + 发光 + 趋势标记）
│   ├── KpiBar.tsx               # KPI 卡排（4 个，错峰入场）
│   ├── PanelFrame.tsx           # 通用面板外框：SVG 科技边角 + 标题条 + CSS 流光扫描
│   └── charts/
│       ├── TrendChart.tsx       # 年度计划与工单趋势（中列主图）
│       ├── FactoryBarChart.tsx  # 各工厂产量
│       ├── WorkshopBarChart.tsx # 各车间产量
│       ├── QualityAreaChart.tsx # 良品率/不良率
│       ├── RegionDonutChart.tsx # 地区对比（3 环形）
│       └── GaugePanel.tsx       # 设备仪表盘
```

**设计原则**：
- `theme.ts` 是颜色/尺寸的唯一来源，所有组件引用，便于统一调色。
- `mockData.ts` 把数据与视图分离——将来接真实 API 只改这一个文件。
- `PanelFrame.tsx` 是炫酷感的核心载体，每个图表都套在带科技边角 + 流光扫描的外框里。
- 每个图表组件只负责自己的 ECharts `option`，独立可改、可测。

## 5. 布局与自适应机制

整屏 CSS Grid 三行：

```
┌─────────────────────────────────────────────────────┐
│  DashboardHeader  (标题 + 时钟 + 装饰线)    行高 auto  │
├─────────────────────────────────────────────────────┤
│  KpiBar  [总产量][完成率][良品率][设备OEE]   行高 auto  │
├──────────────┬───────────────────┬──────────────────┤
│  左列 (1fr)   │   中列 (1.4fr)     │   右列 (1fr)      │
│  各工厂产量    │   年度趋势(主图)    │   地区对比        │  行高 1fr
│  各车间产量    │   良品率/不良率     │   设备仪表盘      │
└──────────────┴───────────────────┴──────────────────┘
```

机制：
- **外层**：`width:100vw; height:100vh; overflow:hidden`，铺满不滚动。
- **三行**：`grid-template-rows: auto auto 1fr`，三列区吃掉剩余全部高度。
- **三列**：`grid-template-columns: 1fr 1.4fr 1fr`，中列略宽给主图。
- **列内**：`flex column + gap`，面板各 `flex:1` 等分（中列趋势主图可 `flex:1.5`）。
- **面板内 ECharts**：容器 `flex:1; min-height:0`（关键，防 flex 子项塌陷），图表 `width:100%; height:100%`。
- **字号/间距**：`clamp()` 跟随视口，如 `clamp(12px, 0.9vw, 18px)`，1366 笔记本到 4K 大屏均协调。
- **resize**：echarts-for-react 默认监听 window resize 自动重绘。

**已知坑**：flex 嵌套 ECharts 时父容器须 `min-height:0`，否则图表无法收缩、把布局撑爆——实现时重点处理。

## 6. 视觉风格（科技蓝）

`theme.ts` 集中定义：

```
背景    径向渐变 #0a2a52 → #061325（顶部偏亮，光源感）
主色    青蓝 #00d4ff（发光）/ 深蓝 #1565c0（渐变底）
辅色    青 #3bc9db / 绿 #51cf66 / 橙 #f59f00 / 红 #f03e3e / 紫 #9775fa
文字    主 #c5e4ff / 次 #7fb5e0 / 标签 #5ad8ff
面板    rgba(20,60,110,.35) + 边框 #1e5a9e + inset glow
```

炫酷装饰（`PanelFrame` 承载）：
- **SVG 科技边角**：面板四角 L 型青蓝亮角。
- **标题条**：左侧竖条发光 + 标题 + 右侧装饰点 + 底部渐变分隔线。
- **流光扫描**：面板顶部边框青蓝光点循环横扫（CSS）。
- **背景层**：淡网格线纹理 + 6-10 个缓慢上浮光点粒子。
- **KPI 卡**：大号发光数字 + 单位 + 趋势标记（↑↓）。

ECharts 配色升级：柱状渐变+圆角+发光；折线平滑+渐变面积+发光点；环形发光描边+中心汇总；仪表分段渐变轨道+指针发光。

## 7. 动效设计（混合分工）

| 动效 | 实现层 | 说明 |
|------|--------|------|
| 数字滚动增长 | motion | `useCountUp`（useSpring/animate）缓动到目标值 |
| 卡片/面板入场 | motion | 错峰 stagger 淡入上浮 |
| hover 反馈 | motion | 边框增亮 + 轻微上浮 |
| 轮播高亮 | motion + ECharts | `useRotatingHighlight` + `dispatchAction` 高亮当前项 |
| 实时刷新跳动 | 定时器 + motion | KPI 基准值小范围抖动，触发数字重滚 |
| 图表内部动画 | ECharts | 柱长高/折线绘制/指针——canvas 内部，ECharts 自带 |
| 边框流光扫描 | CSS | 纯循环装饰，CSS keyframes 最轻 |
| 背景网格/粒子 | CSS / motion | 网格 CSS，粒子漂浮可 motion |
| 实时时钟 | setInterval | 每秒更新顶部时间 |

**分工原则**：motion 管 DOM 外壳动画，CSS 管纯循环无状态装饰，ECharts 管 canvas 内部。

**性能与清理**：
- 所有 `setInterval`/RAF/resize 监听在 `useEffect` cleanup 中销毁，杜绝泄漏。
- 动画优先 `transform`/`opacity`（GPU 合成）。
- 数字滚动用 motion 单实例驱动，不为每个数字开独立定时器。
- 粒子 6-10 个，纯装饰。

## 8. 数据 / 错误处理 / 测试

**数据**：mock 集中 `mockData.ts`，带 TS 类型，结构贴合业务字段（如 `monthlyTrend`、`factoryOutput`、`qualityRate`），便于将来替换真实 API。实时跳动为基准值前端随机抖动，不发请求。

**错误处理**：纯前端无网络请求，无接口错误面。防御点：
- ECharts 容器尺寸 0 塌陷 → `min-height:0` + resize 兜底。
- 定时器/RAF/监听 cleanup 销毁防泄漏。
- 窗口 resize 自动重算，无报错路径。

**测试与验证**：
- `npx tsc --noEmit` 类型检查通过。
- `npm run lint` 通过。
- `npm run build` 构建成功（贴输出）。
- dev server + curl 确认页面 HTTP 200。
- 视觉/动效由用户在浏览器实际查看确认（无法自动断言）。
- 项目前端无单测框架，不新建——遵循"无框架则不强加"。

## 9. 不做什么（YAGNI / 范围边界）

- 不改后端、不新增数据 API。
- 不接真实数据库数据。
- 不重构 `Simulation3D` 及其 components。
- 不引入大屏专用框架（datav 等）。
- 不新建前端单测框架。
