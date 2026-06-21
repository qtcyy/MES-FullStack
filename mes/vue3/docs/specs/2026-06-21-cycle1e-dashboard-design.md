# 子周期 1e — 数字化大屏(智慧大屏)设计

- 日期:2026-06-21
- 分支:`feature/digitization-dashboard`(从 `develop` 切)
- 范围:Vue3 课程作业前端 `mes/vue3`,数字化亮点①「数据可视化大屏(ECharts)」
- 参考(仅功能/接口契约,**不抄 UI**):mes-new 周期 2i-1 智慧大屏 + 后端 `digitization` 模块

## 1. 目标

落地一块**全屏深色科技风**的数字化看板 kiosk,只用后端**真实数据**做数据可视化,营造实时大屏效果。本周期同时首次把预置的 `ScreenLayout` 壳接入路由(后续 1f 3D 数字孪生复用),并沉淀可复用的 `ScreenHeader`、`PanelFrame` 与 ECharts option 纯函数。

## 2. 关键决策(已与用户确认)

1. **面板范围 = 纯真实数据(5 组)**:KPI 计数、订单状态分布、设备状态分布、工单类型分布、近 12 月趋势。**绝不造 mock**;OEE/良率/车间产量等 mes-new 的派生或 mock 面板**本周期不做**。
2. **呈现形态 = 独立全屏 kiosk**:单独顶层路由 + `ScreenLayout` 全屏深色,不嵌 AdminLayout(无侧栏/顶栏);内置「返回后台」。
3. **实时感 = 自动轮询 30s + 手动刷新**:`setInterval` 每 30s 静默 refetch,顶部显示「最后更新时间」与手动刷新按钮。
4. **动画 = 克制亮点**:KPI 数字补间滚动 + 面板入场淡入/上滑(交错)+ 少量呼吸点缀;统一 duration/easing token;尊重 `prefers-reduced-motion`;只走 transform/opacity。
5. **OrderType 图形 = 环形饼**(与订单/设备状态三饼视觉统一)。
6. **ScreenHeader = 沉淀为可复用组件**(供 1f 3D 复用)。

## 3. 后端契约(已存在,本周期纯前端消费)

端点:`GET /digitization/dashboard/overview`(`DashboardController`,只读聚合,已有单测 `DashboardServiceImplTest`)。

返回 `DashboardOverviewVO`:

```ts
interface DashboardOverview {
  kpi: { orderCount: number; deviceCount: number; materielCount: number; flowCount: number }
  orderStatus:  { name: string; value: number }[]
  deviceStatus: { name: string; value: number }[]
  orderType:    { name: string; value: number }[]
  monthlyTrend: { month: string /* yyyy-MM */; orderCount: number; totalQty: number; completedCount: number }[]
}
```

- 编码:GET,无 body;经 `http` 封装解 `Result`(`code===0` 取 data)。
- `Result extends HashMap`(成功 code=0/失败 1),沿用现有 `http` 封装。

## 4. 路由 / 菜单 / 导航

- **菜单预置零种子**:原始 schema 已有 父 `14`「数字化平台」→ `141`「智慧大屏」(`url=/digitization/plan/plan-ui`,perm `user:add`,icon dashboard)。沿用 131/121 模式,不新增菜单种子;仅冒烟时核验 141 在 `mes_data` 存在(若缺再补 seed)。
- **urlMap**:`src/utils/urlMap.ts` 加 `'/digitization/plan/plan-ui': '/digitization/dashboard'`。侧栏 `MenuItem` 经 `toSpaRoute` 跳转。
- **router**:新增**顶层**路由块(与 `/`AdminLayout 平级):

  ```
  {
    path: '/digitization/dashboard',
    component: () => import('@/layouts/ScreenLayout.vue'),
    children: [{
      path: '',
      name: 'digitization-dashboard',
      component: () => import('@/views/digitization/dashboard/PlanDashboard.vue'),
      meta: { title: '智慧大屏', perm: 'user:add' },
    }],
  }
  ```

  - 路由级动态 `import()` → ECharts 进独立 chunk 懒加载。
  - 非 public,经 `guards.ts` 鉴权(已登录方可进)。
- **返回后台**:`ScreenHeader` 的「返回后台」按钮 → `router.push('/welcome')`(回到 AdminLayout 壳)。

## 5. 组件分解

```
src/views/digitization/dashboard/
├── PlanDashboard.vue        # 编排:取数 + 30s 轮询 + count-up + 面板网格
└── panels/
    ├── PanelFrame.vue       # 科技风带标题边框容器(slot)
    ├── KpiStrip.vue         # 4 张 count-up 卡(订单/设备/物料/工艺路线)
    ├── OrderStatusPie.vue   # 订单状态环形饼
    ├── DeviceStatusPie.vue  # 设备状态环形饼
    ├── OrderTypePie.vue     # 工单类型环形饼
    └── TrendLine.vue        # 近12月折线(3 序列:订单数/总数量/完工数)

src/layouts/components/ScreenHeader.vue   # 标题+时钟+最后更新+刷新+返回后台(1f 复用)
src/utils/dashboard.ts                    # ECharts option 纯函数(TDD)
src/api/digitization/dashboard.ts         # dashboardOverview() GET
src/types/digitization.ts                 # 镜像后端 VO(5 组)
```

- 每个饼/折线面板:接收对应数据切片 prop → 调 `utils/dashboard` 纯函数得 option → 喂 `<VChart>`。
- 面板内部不取数,数据自上而下;无数据时 `PanelFrame` 渲染空态占位。

## 6. 数据流

1. `PlanDashboard` 挂载 → `useQuery$(dashboardOverview)` 取全量 overview。
2. 切片:`kpi`→KpiStrip,`orderStatus`/`deviceStatus`/`orderType`→三饼,`monthlyTrend`→TrendLine。
3. `setInterval(refetch, 30000)`;每次成功更新 `lastUpdated`(reactive 时间戳);卸载清 interval。
4. KPI 卡用 `@vueuse/core` `useTransition` 对数值补间滚动(数据更新时重新补间)。
5. 状态态:页级 loading 骨架/占位、error 显示重试按钮;面板级数据为空显空态。**纯真实数据**,任何派生(如完工率)只来自返回的真实数字,本周期不引入派生面板。

## 7. ECharts 集成

- `vue-echarts` 的 `<VChart>` + 按需 `echarts/core` `use([CanvasRenderer, PieChart, LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent])`(集中在一处注册,控体积)。
- 深色主题:option 内配色用 ScreenLayout 的 CSS 变量族同系科技色(直接在 option 里给定深色友好色板,不依赖 echarts 主题注册)。
- 容器自适应:`<VChart autoresize>`。

## 8. 动画(克制守则)

- KPI 数字:`useTransition`,统一 duration(如 600ms)+ 标准缓动。
- 面板入场:`@vueuse/motion` `v-motion` 淡入+上滑,按面板序号交错(stagger)。
- 少量呼吸点缀(如「实时」指示点),不做无限炫光。
- `prefers-reduced-motion: reduce` 时禁用入场/补间,直接终值。
- 设计 token:在 `utils/dashboard.ts` 或局部常量统一 duration/easing。

## 9. 后端审查(按规矩,见 [[backend-deepseek-review-each-cycle]])

本周期不改后端生产代码,但消费前必须验证端点正确:

- 读审 `DashboardServiceImpl` + `DashboardMapper`(+ XML 若有),核对 5 组聚合 SQL 语义(计数 / 三组 group-by 分布 / 近 12 月趋势按月聚合)无 bug。
- 用 `scripts/verify/login.sh`(admin/123)+ curl 对 `mes_data`(localhost:3306,root/12345678)实测 `GET /digitization/dashboard/overview`,确认结构与非空。
- 若发现真 bug,走「最小、纯新增/最小修正」先例处理并补/改 Mockito 守卫单测(JUnit4)。

## 10. 测试与门禁

- `tests/**/*.spec.ts`(vitest 4,node 环境):覆盖 `utils/dashboard` 纯函数 —— 各 option 构造器(序列/坐标轴/配色键)、空态判定、百分比/格式化。
- 门禁:`pnpm typecheck && pnpm test && pnpm lint:check && pnpm build` 全绿。
- 组件不做渲染测(沿用 vue3 既有约定)。

## 11. 交付物

- 路由块 + urlMap 1 条;`ScreenLayout` 接入。
- 1 个编排页 + 6 个 panels/容器组件 + 1 个 ScreenHeader + 1 个 utils + 1 个 api + 类型。
- 纯函数单测;门禁全绿。
- 后端端点审查结论(含 curl 实测证据)。

## 12. 非目标(YAGNI / 留后续)

- OEE / 良率 / 车间产量等派生或 mock 面板(本周期严格只做 5 组真实数据)。
- WebSocket 真推送(后端无,30s 轮询替代)。
- 大屏轮播分页、可拖拽自定义布局、导出截图。
- 1f 3D 数字孪生(独立子周期,本周期只沉淀 ScreenLayout/ScreenHeader 供其复用)。

## 13. 已知风险 / backlog

- `monthlyTrend` 若后端按 `yyyy-MM` 文本排序,跨年顺序需前端按月排序兜底(util 处理)。
- 设备状态数据源若为空(无设备台账)→ 面板长期空态,属真实数据如实呈现,非 bug。
- ECharts 深色色板为手工配置,后续如需统一可抽 token(本周期内联)。
</content>
</invoke>
