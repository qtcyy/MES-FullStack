# 周期 2i-1 · 智慧大屏(数字化看板) — 设计文档

- 日期：2026-06-17
- 范围：`apps/mes-new` 新建**全屏数字化大屏**一个页面，配套**最小纯新增、只读**后端聚合端点
- 前置：系统管理 / 基础数据 / 工艺技术线 / 生产订单+甘特 / 库存 均已完成
- 排期共识：… → 库存(✅) → **数字化(本周期起)**。数字化拆两子周期：**2i-1 智慧大屏(本周期)**、2i-2 3D 仿真(下周期)
- 关联记忆：[[active-frontend-app]]、[[mes1-ui-not-a-reference]]、[[backend-deepseek-review-each-cycle]]、[[menu-driven-sidebar-route-mapping]]、[[rhf-field-name-dom-clobbering]]、[[backend-build-mvnw-broken]]

---

## 1. 目标与范围

在活跃前端 `mes/frontend/apps/mes-new` 重建数字化"智慧大屏"（预置菜单 id 141，`数字化平台` 下）。一个全屏深色 kiosk 大屏页面，聚合展示生产经营核心指标。

**3D 仿真不在本周期**（菜单 id 171，留作 2i-2）。**地区产量对比、各工厂产量**按 YAGNI 不做（对本 MES 无数据模型/无实际意义）。

**后端范围（最小、纯新增、只读）：** digitization 模块当前仅有一个返回 FTL 的 `PlanDataController`，无任何数据 REST 端点。mes1 大屏 100% 用 mock。本周期**纯新增**一个只读聚合控制器 + service（+ 一个聚合 SQL），复用已验证的统计逻辑（`ToolExecutor.get_dashboard_summary`），**不改任何现有生产代码**。符合路线图"确有必要时允许最小纯新增后端改动"（先例：周期 2c-1 只读 `/opers/{flowId}`）。

**数据策略 = 混合：** 有数据模型支撑的面板走真实聚合端点；无数据模型的演示面板（OEE 仪表盘 / 良品率趋势 / 车间产量）用前端 mock，并在 UI 上以"演示"角标明示，与"真实"角标区分。

页面 ↔ 预置菜单路由（**必须精确匹配**，否则侧边栏点不到——侧边栏由 `sp_sys_menu` 驱动，见 [[menu-driven-sidebar-route-mapping]]）：

| 菜单 id | 菜单名 | DB url | urlMap → React 路由 | 本周期 |
|---|---|---|---|---|
| 141 | 智慧大屏 | `/digitization/plan/plan-ui` | `/digitization/plan` | ✅ 本周期 |
| 171 | 数字仿真3D仓库 | `/digital/simulation/list-ui` | `/digitization/simulation` | ⏭️ 2i-2 |

`urlMap.ts` 已预置 `/digitization/plan/plan-ui → /digitization/plan` 映射（无需改 urlMap）。菜单 141 在 `MySQL-20210225.sql` 已存在，dev DB 通常已落库（计划阶段确认）。

---

## 2. 形态与视觉

### 2.1 形态：全屏 kiosk 大屏（不套 AdminLayout）

- 深色全屏，**无侧边栏 / 无顶栏 / 无多页签**，铺满视口。
- 路由 `/digitization/plan` 挂在 `PrivateRoute` 之下、**与 `AdminLayout` 节点平级**（而非 AdminLayout 的子节点），从而全屏且仍受登录保护。
- 右上角"返回"按钮 → `navigate('/welcome')`（回到带外壳的首页，确保 AdminLayout/菜单干净重挂）。
- 从侧边栏点"智慧大屏"导航至此 → AdminLayout 卸载、大屏铺满；点"返回"回到外壳。

### 2.2 视觉：深空蓝科技风（方案 A，已确认）

- 背景：`radial-gradient(ellipse at 50% -10%, #0c2444 0%, #050b16 72%)`。
- 主色青蓝 `#5fd8ff`/`#2fe0ff`(辉光)，辅助绿 `#46d68a`、橙 `#f5a623`、红 `#f0506e`。
- 面板：半透明深蓝玻璃 `#0a1c33`，边框 `#1e5a9e`，`inset` 内辉光，**左上角 L 形科技边角装饰**。
- 标题栏：居中流光标题 + 右侧实时时钟（每秒走字）。
- 自研 React/CSS 元素：KPI **滚动数字**(count-up)、面板标题流光、状态色点。
- **主题样式 scoped 到大屏根容器**（如 `.dashboard-screen` 作用域 / 独立 css），**不污染全站浅色 shadcn 主题**。
- 不照抄 mes1 的丑大屏（[[mes1-ui-not-a-reference]]）：仅参考其"哪些面板/数据维度"，视觉全新设计、克制高级。

### 2.3 布局：经典三列 + 中心主视觉（方案 A，已确认）

```
┌─ 标题栏:  章鱼师兄·生产数字化大屏 ················· 2026-06-17 14:32:08 [返回] ┐
├─ KPI 卡 ×4:  [订单总数] [设备总数] [物料总数] [工艺路线]                        ┤
├──────────── 左列(1fr) ──────┬──── 中列(1.5fr) ────┬──── 右列(1fr) ───────────┤
│  订单状态分布 (环) 真实        │ 月度订单趋势(主视觉)  │  设备综合效率 OEE (仪表盘) 演示 │
│  设备状态分布 (环) 真实        │  折线+柱  真实        │  工单类型分布 (柱/饼)  真实     │
│                              │ 良品率/不良率趋势 演示 │  各车间产量 (柱)  演示          │
└──────────────────────────────┴─────────────────────┴───────────────────────────┘
```

CSS Grid：顶部 KPI `repeat(4,1fr)`；主体 `grid-template-columns: 1fr 1.5fr 1fr`；各列内 `flex-direction:column` 堆叠面板。响应式：宽度不足时允许列自适应换行（最低保证 1280px 设计基准）。

---

## 3. 后端契约（最小、纯新增、只读）

### 3.1 新增端点

| 方法 | 路径 | 编码 | 入参 | 出参 |
|---|---|---|---|---|
| GET | `/digitization/dashboard/overview` | — | 无 | `Result<DashboardOverviewVO>` |

**单一聚合端点**：一次性返回大屏全部真实数据快照，便于大屏一次拉取 + 定时刷新（避免多端点竞态）。

### 3.2 返回结构 `DashboardOverviewVO`

```jsonc
{
  "code": 0,
  "msg": "操作成功",
  "data": {
    "kpi": { "orderCount": 128, "deviceCount": 36, "materielCount": 256, "flowCount": 18 },
    "orderStatus":  [ {"name":"已下发","value":12}, {"name":"已派工","value":20}, {"name":"进行中","value":42}, {"name":"订单结束","value":40}, {"name":"订单终结","value":14} ],
    "deviceStatus": [ {"name":"空闲","value":8},  {"name":"运行中","value":24}, {"name":"维修中","value":3},  {"name":"报废","value":1} ],
    "orderType":    [ {"name":"批量","value":90}, {"name":"验证","value":24}, {"name":"返工","value":14} ],
    "monthlyTrend": [ {"month":"2025-07","orderCount":10,"totalQty":1200,"completedCount":8}, … 共 12 项 … ]
  }
}
```

- `NameValueVO { String name; long value; }`
- `MonthlyTrendVO { String month; long orderCount; long totalQty; long completedCount; }`（`month` 格式 `yyyy-MM`）
- `DashboardKpiVO { long orderCount; long deviceCount; long materielCount; long flowCount; }`

### 3.3 数据来源映射（全部 evidence-based，已核查）

| 字段 | 来源 | 证据 |
|---|---|---|
| `kpi.orderCount` | `spOrderMapper.selectCount(null)` | ToolExecutor.java:572 |
| `kpi.deviceCount` | `spDeviceMapper.selectCount(null)` | ToolExecutor.java:597 |
| `kpi.materielCount` | `spMaterileMapper.selectCount(null)` | ToolExecutor.java:612 |
| `kpi.flowCount` | `spFlowMapper.selectCount(null)` | ToolExecutor.java:620 |
| `orderStatus` | `spOrderMapper.selectList(null)` → 按 `statue` 内存分组；按 **SpOrder.statue 实体权威语义** 映射 0→已下发 1→已派工 2→进行中 3→订单结束 4→订单终结（**不沿用 ToolExecutor 的 1→创建,后者映射有误且漏 0**，审查时已更正） | SpOrder.java:62-65（实体注释为准） |
| `deviceStatus` | `spDeviceMapper.selectList(null)` → 按 `status` 内存分组；映射 0→空闲 1→运行中 2→维修中 3→报废 | SpDevice.java:22；MySQL-init-all.sql:103 |
| `orderType` | `spOrderMapper.selectList(null)` → 按 `orderType` 内存分组；映射 P→批量 A→验证 F→返工 | SpOrder.java:35；OrderForm.tsx:85-90；MySQL-init-all.sql:258 |
| `monthlyTrend` | **新增** `DashboardMapper.selectMonthlyTrend()`：`GROUP BY DATE_FORMAT(create_time,'%Y-%m')`，service 补齐"近 12 个月"——**截至服务器当前月的连续 12 个自然月**（含当前月，缺失月份补 0、按月升序） | SpOrder 有 create_time(datetime)/qty/statue；SpOrderMapper.xml 为空，需新增 |

**实现取舍：**
- 计数与分布走 `selectList` 内存分组（对齐 ToolExecutor 已验证逻辑，Mockito 易测：stub `selectList` 返回若干实体，断言分组结果）。本项目数据量小，可接受。
- `monthlyTrend` 走专用 SQL（跨 12 月聚合，SQL 比内存清晰），用 `DashboardMapper`（digitization 模块内新增，**XML 实现** `resources/mapper/digitization/DashboardMapper.xml`，`resultType=MonthlyTrendVO`；遵循项目"自定义查询走 XML"惯例，非注解），**不触碰 order 模块的 mapper**，保持纯新增。
- `completedCount` 定义：`statue IN (3,4)`（订单结束/终结）计为完成。

### 3.4 新增后端文件

```
mes/src/main/java/com/wangziyang/mes/digitization/
├── controller/
│   ├── PlanDataController.java               # 现有,不动
│   └── DashboardController.java              # 新增 @Controller + @ResponseBody, GET /digitization/dashboard/overview
├── service/
│   ├── IDashboardService.java                # overview()
│   └── impl/DashboardServiceImpl.java        # 注入各 mapper,聚合 + code→label 映射 + 12 月补齐
├── mapper/
│   └── DashboardMapper.java                  # selectMonthlyTrend() → List<MonthlyTrendVO>（不继承 BaseMapper）
└── dto/
    ├── DashboardOverviewVO.java
    ├── DashboardKpiVO.java
    ├── NameValueVO.java
    └── MonthlyTrendVO.java
```
（另含 `resources/mapper/digitization/DashboardMapper.xml` 提供 `selectMonthlyTrend` 的聚合 SQL。）

- `DashboardController` 继承 `BaseController`（沿用项目范式），`@RequestMapping("/digitization/dashboard")` + `@GetMapping("/overview")` + `@ResponseBody` + 返回 `Result.success(...)`。范例：SpOrderController / SpDeviceController。
- `@MapperScan` 已覆盖 `**.mapper*`（入口 `SparchetypeApplication`），`DashboardMapper` 自动注册。
- 不改 Shiro 配置：`/digitization/**` 默认 `authc`（已登录可访问），与其它 admin 端点一致。

---

## 4. 前端架构

### 4.1 新增前端文件

```
mes/frontend/apps/mes-new/src/
├── api/digitization/
│   └── dashboard.ts                # fetchOverview(): Observable<DashboardOverview>
├── types/digitization.ts           # DashboardOverview + 子类型(与后端 VO 对齐)
├── components/
│   └── EChart.tsx                  # 通用 ECharts 容器:init/dispose/ResizeObserver 自适应,option 变更 setOption
└── pages/digitization/
    ├── PlanDashboard.tsx           # 大屏主页面:布局编排 + useQuery$ + 30s 轮询 + 实时时钟 + 返回
    ├── dashboard.css               # 深空蓝主题(scoped 到 .dashboard-screen)
    ├── dashboardMock.ts            # 演示面板数据(OEE / 良品率不良率 / 车间产量),含 "演示" 标记
    ├── dashboardOptions.ts         # 纯函数:各 ECharts option 构造器(真实+演示)
    ├── dashboardOptions.test.ts    # 纯函数单测(vitest, node)
    └── panels/
        ├── PanelFrame.tsx          # 玻璃面板外框(标题 + 真实/演示角标 + L 形边角)
        ├── KpiStrip.tsx            # 4 KPI 卡(自研 count-up 滚动数字)
        ├── OrderStatusPanel.tsx    # 订单状态环 (ECharts pie/doughnut) 真实
        ├── DeviceStatusPanel.tsx   # 设备状态环 (ECharts pie/doughnut) 真实
        ├── OrderTrendPanel.tsx     # 月度订单趋势 (ECharts line+bar) 真实 · 主视觉
        ├── OrderTypePanel.tsx      # 工单类型分布 (ECharts bar 或 pie) 真实
        ├── OeeGaugePanel.tsx       # 设备综合效率 OEE (ECharts gauge) 演示
        ├── QualityTrendPanel.tsx   # 良品率/不良率趋势 (ECharts area line) 演示
        └── WorkshopOutputPanel.tsx # 各车间产量 (ECharts bar) 演示
```

### 4.2 依赖

- 新增 `echarts`（按需引入：`echarts/core` + 用到的 charts(BarChart/LineChart/PieChart/GaugeChart) + components(Grid/Tooltip/Legend/Title) + `CanvasRenderer`，控制包体）。
- 不引 `echarts-for-react`：自封装 `EChart.tsx`（`useRef` + `echarts.init` + `ResizeObserver` resize + 卸载 `dispose`，props.option 变更时 `setOption(option, true)`）。

### 4.3 数据流 / 缓存 / 轮询

- 读：自研 `useQuery$(['digitization','overview'], fetchOverview)`（`@ngify/http` + rxjs）。
- **轮询**：`useQuery$` 无内置 interval（见 http/hooks.ts）。在 `PlanDashboard` 用 `useEffect` 起 `setInterval(() => refetch(), 30000)`，卸载 `clearInterval`。30s 刷新真实数据快照。
- 演示面板数据来自 `dashboardMock.ts`（静态/可加轻量随机波动，但保持纯函数可测、不依赖 `Date.now`/`Math.random` 的测试用确定输入）。
- 实时时钟：`PlanDashboard` 内 `setInterval(1000)` 更新 `new Date()` 显示（仅 UI，无测试）。

### 4.4 ECharts 深色主题

- 不全局注册主题；各 option 构造器内直接给定深色配色（坐标轴/分割线/文字色用大屏 token），保证与背景协调。
- 复用调色板常量（青蓝/绿/橙/红）集中在 `dashboardOptions.ts`。

---

## 5. 纯函数与可测点（TDD）

`dashboardOptions.ts`（纯函数，`dashboardOptions.test.ts` 覆盖）：

1. `buildOrderTrendOption(monthlyTrend)` → 断言 x 轴为 12 个月、series 含订单数(柱)+完成数(线，或双轴)、数据长度=12。
2. `buildPieOption(items, palette)` → 断言 series[0].data 与输入 name/value 对齐、doughnut radius 配置存在。
3. `buildOrderTypeOption(items)` / `buildGaugeOption(value)` / `buildQualityAreaOption(mock)` / `buildWorkshopBarOption(mock)` → 断言关键结构（data 映射、areaStyle 存在、gauge max/value）。
4. `formatCount(n)` / count-up 目标值解析等小工具（若有）。

> 后端的"分布分组 + code→label 映射 + 12 月补齐"是后端单测覆盖点（见 §7），前端不重复。前端纯函数聚焦 option 构造（输入数据 → ECharts 配置结构）。
> 沿用本项目约定：vitest node 环境**仅收 `*.test.ts`**，**组件不做渲染测**。先写 failing test → 实现 → 通过。

---

## 6. 错误处理 / 加载态 / 空态

- 加载：首次 `loading` 时大屏显示骨架/占位（面板框先出、内容区 loading）。
- 失败：`overview` 拉取失败 → 响应拦截器统一 `toast.error(msg)`；真实面板降级为"暂无数据"占位，**演示面板不受影响仍渲染**（大屏不至于全空）。
- 空态：真实分布为空数组时，对应环图/柱图显示"暂无数据"。
- 轮询失败不清空已有数据（保留上一次快照，仅 toast 提示），避免大屏闪烁。

---

## 7. 测试策略

- **前端纯函数**：`dashboardOptions.ts` → `dashboardOptions.test.ts`（vitest node，仅 `*.test.ts`，TDD）。
- **后端 Mockito 单测**（推荐，作为审查证据，沿用 2g-3/2h 先例）：`DashboardServiceImplTest`
  - 订单状态分组 + 1/2/3/4→中文映射（stub `spOrderMapper.selectList` 返回若干 SpOrder，断言 `orderStatus`）。
  - 设备状态分组 + 0/1/2/3→中文映射。
  - 工单类型分组 + P/A/F→中文映射（含 orderType 为 null 的剔除）。
  - KPI 计数（stub `selectCount`）。
  - `monthlyTrend` 12 月补齐：stub `DashboardMapper.selectMonthlyTrend` 返回部分月份，断言补齐 12 项、缺失月 0、升序。
  - `completedCount` = `statue∈{3,4}` 计数正确。
  - `@InjectMocks` 注入 ServiceImpl，`@Mock` 各 mapper（当前 Mockito 版本可用，2h 已验证）。

---

## 8. 验证计划

- 前端静态：`pnpm --filter mes-new exec tsc --noEmit`、`pnpm lint`、`pnpm --filter mes-new test`、`pnpm build`（贴实际输出）。
- 后端单测：系统 `mvn -pl mes test -Dtest=DashboardServiceImplTest`（JDK11+ 系统 mvn；`./mvnw` 已坏，见 [[backend-build-mvnw-broken]]），贴输出。
- 多 agent 审查：每任务 spec 合规审查 → fix → re-review → 代码质量审查 → fix → re-review；周期末 opus 终审。
- **人工双端联调待做**：后端 :9090 + 前端 :4100，登录需图形验证码无法脚本化（[[backend-build-mvnw-broken]]）。人工走查：侧边栏点"智慧大屏"→ 全屏大屏渲染 → KPI/订单状态/设备状态/工单类型/月度趋势显示真实数据 → 演示面板正常 → 30s 自动刷新 → 返回回到外壳。

---

## 9. 风险 / 依赖 / 注意

- **菜单 141 须在 dev DB**：未落库则侧边栏点不到（[[menu-driven-sidebar-route-mapping]]）。计划阶段确认；`MySQL-20210225.sql` 已含,通常已在。
- **全屏路由不在 AdminLayout 下**：硬刷新 `/digitization/plan` 时 AdminLayout 不挂载、菜单不加载——大屏不需要菜单，但需确保 `PrivateRoute` 鉴权在直接进入时仍成立（与全站现状一致，不在本周期解决全局鉴权持久化）。返回统一走 `/welcome`。
- **后端纯新增**：不改任何现有生产代码；新增控制器/服务/mapper/DTO + 一段 SQL + 单测。仍按 [[backend-deepseek-review-each-cycle]] 审查本周期所写后端（这次是我们自己写的新代码，TDD + 审查覆盖）。
- **echarts 包体**：按需引入，关注 build 体积；如显著增大在 review 记录。
- **不引入 RHF 表单**：大屏无表单输入，规避 [[rhf-field-name-dom-clobbering]] 无关。
- **演示数据明示**：OEE/良品率/车间产量面板必须有"演示"角标，不得伪装真实。

---

## 10. 交付物清单

后端（纯新增）：
- `digitization/controller/DashboardController.java`
- `digitization/service/IDashboardService.java` + `impl/DashboardServiceImpl.java`
- `digitization/mapper/DashboardMapper.java`
- `digitization/dto/{DashboardOverviewVO,DashboardKpiVO,NameValueVO,MonthlyTrendVO}.java`
- `test/.../digitization/DashboardServiceImplTest.java`（Mockito）

前端（纯新增）：
- `api/digitization/dashboard.ts`
- `types/digitization.ts`
- `components/EChart.tsx`
- `pages/digitization/PlanDashboard.tsx`、`dashboard.css`、`dashboardMock.ts`、`dashboardOptions.ts`、`dashboardOptions.test.ts`
- `pages/digitization/panels/{PanelFrame,KpiStrip,OrderStatusPanel,DeviceStatusPanel,OrderTrendPanel,OrderTypePanel,OeeGaugePanel,QualityTrendPanel,WorkshopOutputPanel}.tsx`
- `router.tsx`：在 `PrivateRoute` 下、`AdminLayout` 节点平级新增 `{ path: 'digitization/plan', element: <PlanDashboard /> }`
- `package.json`：新增 `echarts` 依赖

不做（本周期外）：3D 仿真(2i-2)、地区对比、各工厂产量、动态表 Manager。
