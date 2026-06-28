# 首页（工作台 `/welcome`）重设计 — 设计文档

- **日期**：2026-06-28
- **范围**：仅前端 `mes/frontend/apps/mes-new` 的 `/welcome` 工作台页面重构；不改后端。
- **目标**：更丰富的功能、优雅的色彩与动画、大师级的布局控制。

## 1. 背景与现状

当前首页 `pages/welcome/WelcomePage.tsx`（标签名「工作台」）位于 `AdminLayout` 内（侧边栏 + 头部 + 标签栏，浅色主题）。现状内容单薄：

- 渐变问候横幅；
- 4 个**写死的假数据** KPI 卡（128 / 86 / 23 / 1204）；
- 4 个快捷入口。

问题：KPI 是假数、无图表、无待办/动态、信息密度低、布局单调。项目其实已有真实聚合接口 `/digitization/dashboard/overview` 却未被首页使用；另有独立的全屏 3D 数字孪生大屏 `/digitization/plan`（深色、ECharts），与工作台是两个东西，本次不动它。

## 2. 已确认的方向决策

| 维度 | 决策 |
|---|---|
| 首页定位 | **混合驾驶舱**（Hero + 真实 KPI + 图表 + 待办/快捷区 + 动态） |
| 数据策略 | **真数据优先**：生产数据接真实 `/overview`（出错优雅回退 mock）；最近访问/快捷入口用本地真实数据；待办/公告用占位 mock（标注「示例」，后续接） |
| 布局 | **便当盒网格 Bento Grid**（非对称特征带 + 整齐栅格） |
| 配色 | **多彩强调 · 和谐克制**（浅色，科技蓝主调 + 每类版块一个柔和强调色） |
| Hero 动效 | **极光流光**（深蓝底 + 蓝/青/紫光晕缓慢漂移） |

## 3. 信息架构 — 10 个版块

> 「版块」指逻辑面板（KPI×4 计为一个 ②）。④⑨⑩为独立便当格。

| # | 版块 | 数据来源 | 强调色 |
|---|---|---|---|
| ① | **Hero 问候**（姓名 / 日期 / 星期 / 班次 + 实时数据走马灯） | 真实（用户名 + overview 汇总） | 极光（蓝/青/紫） |
| ② | **KPI ×4**（生产工单 `orderCount` / 设备总数 `deviceCount` / 物料总数 `materielCount` / 工艺路线 `flowCount`） | **真实** `overview.kpi.*` + 数字滚动 | 蓝·青·翠·靛 |
| ③ | **生产趋势**（近 12 月折线/面积：工单数 `orderCount`、完工数 `completedCount`、数量 `totalQty`） | **真实** `overview.monthlyTrend` | 科技蓝 |
| ④ | **待办 / 待审批**（列表 + 计数徽标） | 占位 mock（标「示例」） | 靛紫 |
| ⑤ | **订单状态环图** | **真实** `overview.orderStatus` | 青 |
| ⑥ | **设备状态环图** | **真实** `overview.deviceStatus` | 蓝 |
| ⑦ | **订单类型环图** | **真实** `overview.orderType` | 翠绿 |
| ⑧ | **快捷入口**（图标网格，按权限过滤） | **真实**（`authStore.hasPermission` 门控） | 蓝 |
| ⑨ | **最近访问**（chips） | 真实（`appStore.tabs` 派生） | 琥珀 |
| ⑩ | **系统公告 / 动态**（时间线） | 占位 mock（标「示例」） | 琥珀 |

数据契约：`DashboardOverview = { kpi:{orderCount,deviceCount,materielCount,flowCount}, orderStatus:NameValue[], deviceStatus:NameValue[], orderType:NameValue[], monthlyTrend:MonthlyTrendPoint[] }`（见 `types/digitization.ts`）。

## 4. 布局 — 12 栅格便当盒

桌面 `xl ≥ 1280px`：

```
┌──────────────────────── ① HERO 极光 (col 1-12) ───────────────────────┐
├──────────── ③ 生产趋势 (col 1-8, 大格) ───────────┬─ ④ 待办/审批 (9-12) ─┤
├─ ② KPI(1-3) ─┬─ KPI(4-6) ─┬─ KPI(7-9) ─┬─ KPI(10-12) ──────────────────┤
├─── ⑤ 订单状态环 (1-4) ──┬── ⑥ 设备状态环 (5-8) ──┬─ ⑦ 订单类型环 (9-12) ─┤
├─── ⑧ 快捷入口 (1-4) ────┬── ⑨ 最近访问 (5-8) ────┬── ⑩ 系统公告 (9-12) ──┤
└──────────────────────────────────────────────────────────────────────┘
```

- **节奏**：满宽 Hero → 特征带（大趋势图 col-8 + 高待办 col-4）→ KPI 四连 → 三环图 → 三工具格。非对称特征带 + 整齐栅格 = 视觉「潮」而不乱。
- **响应式**：
  - `md 768–1279`：6 栅格。趋势 / 待办各占 6；KPI 2×2；环图各占 3（订单类型换行）；工具格各占 6 或 3。
  - `< 768`（移动）：单列堆叠；图表保 `min-height`（趋势 ≥200px、环图 ≥180px）。
- 栅格用 CSS Grid（Tailwind `grid-cols-12` + `col-span-*` / `row-span-*`）。具体 span 值实现时可微调，结构骨架以本图为准。

## 5. 色彩系统

在本地 `src/styles.css`（`globals.css` 之后）扩展多彩强调令牌，含浅色 tint 背景：

```css
:root {
  --accent-blue:   #2f7cff;  --accent-blue-bg:   rgba(47,124,255,.10);
  --accent-cyan:   #36e0ff;  --accent-cyan-bg:   rgba(54,224,255,.12);
  --accent-violet: #7c5cff;  --accent-violet-bg: rgba(124,92,255,.12);
  --accent-amber:  #ff9f43;  --accent-amber-bg:  rgba(255,159,67,.14);
  --accent-emerald:#10b981;  --accent-emerald-bg:rgba(16,185,129,.12);
}
```

- 每个便当格：白卡 + 既有 `--shadow-card`，左侧 3px 强调条 + 同色图标底（`accent-*-bg`）。
- 强调色分配：订单/工单=蓝、设备/青=青、物料/完工=翠绿、待办审批=靛紫、公告/告警=琥珀。
- 整体浅色，与后台其余页面一致；深色主题下沿用既有 `.dark` 令牌（强调色保持，阴影加深）。

## 6. 动效方案（全部尊重 `prefers-reduced-motion`）

- **Hero 极光**：3 个模糊径向光晕（蓝/青/紫）缓慢漂移（CSS `@keyframes`，复用/扩展现有 `drift`）；叠加实时数据走马灯（mini stats 横向滚动）。
- **入场**：便当格用 `components/motion/Stagger` 梯级浮入；Hero 用 `Reveal`。
- **数字**：KPI 用 `pages/digitization/useCountUp` 滚动到目标值。
- **图表**：ECharts 原生绘制动画（描线 / 扇区展开）。
- **悬停**：便当格 `-translate-y-1` + `shadow-pop` + 强调色描边，过渡用既有 `--ease-*` / `--dur-*` 令牌。
- reduced-motion：现有 `Stagger`/`Reveal`/`useCountUp` 已内建判断；Hero 光晕与走马灯须额外用 `useReducedMotion()` 或 CSS media query 静态化。

## 7. 技术实现

### 组件拆分（新建 `pages/welcome/` 子目录）

- `WelcomePage.tsx`（重写）— 编排器：取数 → 便当栅格容器 → 各版块。
- `BentoCell.tsx` — **共享格壳**：props 含 `accent`、`title`、`icon`、`className`、`children`；负责强调条 / 图标底 / 标题 / 悬停 / `StaggerItem` 包裹。布局原语，所有格子复用。
- `HeroBanner.tsx` — 极光背景 + 问候 + 实时数据走马灯。
- `MetricCard.tsx` — KPI 卡（图标 + `useCountUp` + 强调色）。
- `TrendChart.tsx` — 折线/面积图（`EChart` + 浅色版选项）。
- `StatusDonut.tsx` — 环图，复用于 ⑤⑥⑦（props: `data`、`accent`、`title`）。
- `TodoPanel.tsx` — 待办/待审批列表（mock，标「示例」）。
- `QuickActions.tsx` — 图标网格，按 `hasPermission` 过滤的快捷入口（curated 列表）。
- `RecentVisits.tsx` — 从 `appStore.tabs` 派生最近访问 chips（排除当前/首页）。
- `AnnouncementPanel.tsx` — 公告/动态时间线（mock）。

### 数据层

- `useWelcomeOverview.ts` — 包 `http/hooks.ts` 的 `useQuery$(fetchOverview)`；`error` 时回退 `welcomeMock` 的兜底 overview；暴露 `{ data, loading, isFallback }`。
- `welcomeMock.ts` — 占位数据：兜底 overview、待办列表、公告列表。

### 复用既有资产

- `@/components/EChart` 渲染容器（与大屏面板同款）。
- **新增浅色版图表选项构建器**（现有 `dashboardOptions.ts` 为深色大屏版，不直接套用）：`buildTrendOption(light)`、`buildDonutOption(light)`，放 `pages/welcome/welcomeCharts.ts`。
- `Stagger`/`StaggerItem`/`Reveal`、`useCountUp`、`authStore.hasPermission`、`appStore.tabs`、`lucide-react` 图标、`@workspace/ui` 卡片基元。

### 后端

- **不改后端**。但按项目惯例（后端多为生成、需审查），实现前先核验 `/digitization/dashboard/overview` 控制器/服务返回结构与 `DashboardOverview` 一致（该接口 `PlanDashboard` 已在用，预期可用）。

## 8. 可访问性 / 响应式 / 性能

- 键盘可达：快捷入口/最近访问为 `<button>`/`<a>`，可聚焦；便当格可点区域有 focus ring。
- `aria-label` 标注图表与图标按钮；数字用 `tabular-nums`。
- reduced-motion 全覆盖（见 §6）。
- 图表懒加载/按需：首屏 KPI + Hero 优先；图表组件可在数据到达后渲染，避免空 `option` 报错。

## 9. 测试与验收

- **冒烟**：`WelcomePage` 在 mock overview 下渲染出 9 个版块、无报错（参考 `src/__smoke__` / `components/__tests__` 既有 vitest 配置）。
- **单测**：`useWelcomeOverview` 在接口报错时回退 mock；`RecentVisits` 从 tabs 正确派生（排除首页/当前页、去重、限量）。
- **门禁**：`pnpm --filter mes-new exec tsc --noEmit`、`pnpm lint`、`pnpm build` 全部通过。
- **人工验收**：浅色主题下布局符合 §4；极光与入场/数字/图表动画生效；reduced-motion 下静态化；窄屏正确折叠。

## 10. 非目标（YAGNI）

- 不做后端新接口（待办/公告/通知聚合）——本期占位 mock。
- 不动 3D 大屏 `/digitization/plan`。
- 不引入新图表库或新动画库（用既有 echarts + motion/react）。
- 不做小组件可拖拽自定义布局（过度设计）。
