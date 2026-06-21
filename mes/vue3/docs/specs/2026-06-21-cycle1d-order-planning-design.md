# 子周期 1d 设计 · 计划：工单下达 / 派工 / 甘特排程

- 日期：2026-06-21
- 分支：`feature/order-planning`（从 `develop` 切，完成后 `--no-ff` 合 `develop`）
- 工程：`mes/vue3`（Vue3 课程作业前端，dev `:4200`，代理 `/api`→`:9090`）
- 参考：React 版 `mes/frontend/apps/mes-new` —— **仅参考接口契约与功能，绝不照抄其 UI**

---

## 1. 目标与范围

实现后端 **order（计划）** 模块的三大功能，单分支一次性交付：

1. **工单下达**（`/order/release`）—— 生产订单 CRUD。
2. **员工作业派工**（`/order/dispatch`）—— 待派工工单批量指派班组+作业员。
3. **甘特排程**（`/order/gantt`）—— 全量交互：双视角可视化 + 拖拽改期 + 执行回填。

**关键决策（用户拍板）：**
- 三屏放**同一分支** `feature/order-planning`，按「工单 → 派工 → 甘特」顺序增量提交。
- 甘特**双视角都做**（资源视角 班组→作业员 / 订单视角 订单→工序）。
- 甘特做到**全量交互**（拖拽改期 + 执行回填），接全部 5 个写端点。
- **后端能不动就不动**：默认零生产代码改动；仅按「每周期必审后端」约定审查，**只有暴露出来的真正正确性 bug 才最小修复** + 补 Mockito 守卫单测，绝不越界重构。

**非目标（明确不做）：**
- 工单删除维持后端现状（**物理删**，不擅自改软删——除非审查发现这是 bug）。
- 不引入任何甘特第三方库（自研 CSS/div + 纯函数，命中评分「创新/深度优化」）。
- 不做 WebSocket 实时（后端无此能力）。

---

## 2. 后端契约（已调研，本周期不改）

### 2.1 工单下达 `SpOrderController`
| 端点 | 方法 | 编码 | 入参 | 出参 |
|---|---|---|---|---|
| `/order/release/page` | POST | **form** | `SpOrderReq{orderCodeLike, materielLike, current, size, orderBy}` | `IPage<SpOrder>` |
| `/order/release/get-by-id?id=` | GET | — | id | `SpOrder` |
| `/order/release/add-or-update` | POST | **form** | `SpOrder`（无 id=新增） | `null` |
| `/order/release/delete` | POST | **form** | `{id}`（物理删） | `null` |

### 2.2 派工 `SpDispatchController`
| 端点 | 方法 | 编码 | 入参 | 出参 |
|---|---|---|---|---|
| `/order/dispatch/page` | POST | **form** | `SpDispatchPageReq{orderCode, current, size}` | `IPage<Map>`（仅 statue=0 待派工） |
| `/order/dispatch/assign` | POST | **JSON** | `SpDispatchDTO{orderIds[], teamId, userId, laborHours, planStartTime?, planEndTime?, remark?}` | `null` |
| `/order/dispatch/teams` | GET | — | — | `List<SpTeam>` |
| `/order/dispatch/team-users/{teamId}` | GET | — | teamId | `List<SysUser>` |

派工业务：创建 `SpOrderDispatch`（dispatchStatus=1）并把订单 statue 0→1，`@Transactional`。

### 2.3 甘特 `SpGanttController`
| 端点 | 方法 | 编码 | 入参 | 守卫 |
|---|---|---|---|---|
| `/order/gantt/tasks` | POST | **form** | `GanttQueryReq{startTime?, endTime?, orderCode?, teamId?}` | 只读，返回 `List<GanttTaskVO>` |
| `/order/gantt/reschedule` | POST | **JSON** | `{id, planStartTime, planEndTime}` | status∈{1,2}（非3）；planStart≤planEnd |
| `/order/gantt/start` | POST | **JSON** | `{id, actualStartTime?}` | status 1→2；空时间取 now |
| `/order/gantt/finish` | POST | **JSON** | `{id, actualEndTime?}` | status 2→3 且 progress=100；actualEnd≥actualStart |
| `/order/gantt/progress` | POST | **JSON** | `{id, progress}` | status=2 且 0≤progress≤100 |
| `/order/gantt/actual` | POST | **JSON** | `{id, actualStartTime?, actualEndTime?}` | status≥2；部分更新；都给则 start≤end |

### 2.4 实体字段（关键）
- **SpOrder**：orderCode / orderDescription / qty / orderType(P量产·A验证·F返工) / flowId / materiel / materielDesc / planStartTime / planEndTime / **statue**(0待派工·1已派工·2进行中·3结束·4终结)。
- **SpOrderDispatch**：orderId / teamId / userId / laborHours / **dispatchStatus**(1派工·2开工·3完工) / planStartTime / planEndTime / actualStartTime / actualEndTime / remark / operId / progress(0-100)。
- **GanttTaskVO**（只读聚合）：id(dispatch) / orderId / orderCode / materiel / materielDesc / qty / orderType / orderStatue / operId / operName / teamId / teamName / userId / userName / planStartTime / planEndTime / actualStartTime / actualEndTime / dispatchStatus / progress。

时间格式统一 `yyyy-MM-dd HH:mm:ss`。

---

## 3. 路由 / 菜单 / urlMap

- **菜单已预置**（父 12 计划管理），**无需新种子 SQL**：
  - 121 工单下达 `/order/release/list-ui` perm `order:add`（主 SQL `MySQL-20210225.sql` 已有）
  - 122 员工作业派工 `/order/dispatch` perm `order:dispatch`（`scripts/sql/dispatch-management.sql`，**含建 sp_order_dispatch 表**，需 DB 已跑）
  - 123 生产甘特图 `/order/gantt` perm `order:gantt`（`scripts/sql/gantt-migration.sql`，**含给 sp_order_dispatch 加 oper_id/progress 列**，需 DB 已跑）
  - 演示数据可选 `scripts/sql/gantt-mock-seed.sql`。
- **urlMap** 加 3 条：`/order/release/list-ui`→`/order/release`、`/order/dispatch`→`/order/dispatch`、`/order/gantt`→`/order/gantt`。
- **router** 加 3 路由（AdminLayout children）：
  - `order/release`（title 工单下达，perm `order:add`）
  - `order/dispatch`（title 员工作业派工，perm `order:dispatch`）
  - `order/gantt`（title 生产甘特图，perm `order:gantt`）

---

## 4. API 层 + 类型

新建 `src/types/order.ts` 与 `src/api/order/{order,dispatch,gantt}.ts`，写法对齐既有 `api/request.ts`（`http.post(url, data)` 表单 / `http.post(url, data, true)` JSON / `http.get`）。

`src/types/order.ts`：
```ts
SpOrder { id?, orderCode, orderDescription?, qty?, orderType?, flowId?, materiel?, materielDesc?, planStartTime?, planEndTime?, statue? }
DispatchableOrder extends SpOrder { dispatchStatus?, workerName?, teamName? }
SpDispatchAssign { orderIds: string[]; teamId; userId; laborHours; planStartTime?; planEndTime?; remark? }
SpTeamOption { id; code?; name }
TeamUserOption { id; name; username? }
GanttTask { id; orderId; orderCode; materiel; materielDesc?; qty; orderType; orderStatue; operId; operName; teamId; teamName; userId; userName; planStartTime?; planEndTime?; actualStartTime?; actualEndTime?; dispatchStatus; progress? }
GanttQueryParams { startTime?; endTime?; orderCode?; teamId? }
GanttReschedule { id; planStartTime; planEndTime }
GanttStart { id; actualStartTime? }
GanttFinish { id; actualEndTime? }
GanttProgress { id; progress }
GanttActual { id; actualStartTime?; actualEndTime? }
```

`api/order/order.ts`：`orderPage`(form) / `orderGetById`(GET) / `orderAddOrUpdate`(form) / `orderDelete`(form)。
`api/order/dispatch.ts`：`dispatchPage`(form) / `dispatchAssign`(JSON) / `dispatchTeams`(GET) / `dispatchTeamUsers(teamId)`(GET)。
`api/order/gantt.ts`：`ganttTasks`(form) / `ganttReschedule`/`ganttStart`/`ganttFinish`/`ganttProgress`/`ganttActual`（均 JSON）。

---

## 5. 屏 1 — 工单下达 `views/order/release/`

- **OrderList.vue**：`DataTable` 服务端分页 + `SearchForm`（orderCodeLike / materielLike）+ 新建/编辑/删除按钮。列：编码、描述、数量、类型徽标(P/A/F)、物料、计划起止、状态徽标(statue 0-4)、操作。
- **OrderForm.vue**（`FormDialog` + el-form 校验）：
  - 必填：orderCode、qty(>0)、orderType（el-select P量产/A验证/F返工）、materiel。
  - 选 materiel（物料下拉，复用 `materilePage`/已有物料接口）→ 自动带出 materielDesc。
  - flowId：工艺路线下拉（复用 1c-1 的 flow 列表接口）。
  - planStartTime/planEndTime：`el-date-picker` type=datetime，`value-format="YYYY-MM-DD HH:mm:ss"`。
  - 提交 `orderAddOrUpdate`（编辑携带 id）。
- 删除：`ElMessageBox.confirm` → `orderDelete`（后端物理删，审查确认无副作用）。
- 纯函数 `utils/order.ts`：`buildOrderPayload`（剥空/数值化 qty）、`validateOrder`、`orderTypeLabel`、`orderStatusMeta`（label+tag 类型）。TDD。

---

## 6. 屏 2 — 员工作业派工 `views/order/dispatch/`

- **DispatchList.vue**：`dispatchPage` 列表（后端只返 statue=0 待派工），`DataTable` 开启**多选**（行勾选）+ `SearchForm`（orderCode）。选中行后顶部「派工(N)」按钮启用。
- **DispatchDialog.vue**（`FormDialog`）：
  - 班组 el-select（`dispatchTeams`，显示 code+name）。
  - 作业员 el-select：**级联**，选班组后 `dispatchTeamUsers(teamId)` 拉取并清空旧选择。
  - 工时 el-input-number（默认 8，step 0.5，>0）。
  - 计划起止（可选 datetime）、备注（可选）。
  - 提交 `dispatchAssign`（JSON，批量当前选中 orderIds）→ toast「已派工 N 张工单」→ 清空选择 + refetch。
- 纯函数沉淀进 `utils/order.ts`：`buildDispatchPayload`、`validateDispatch`。TDD。

---

## 7. 屏 3 — 甘特排程 `views/order/gantt/`（全量交互，双视角）

### 7.1 组成
- **GanttPage.vue**（编排）：`ganttTasks` 取数 → 前端按 orderCode/teamId 过滤 → 双视角 Tabs → 传 GanttChart；持有 activeTaskId 与抽屉显隐；各写操作成功后 `refetch`。一次 `nowMs` 快照保证时间线一致。
- **GanttChart.vue**（自研 CSS/div，UI 独立设计）：左侧粘性标签列 + 右侧按天网格 + 分组头（班组/订单）+ 每任务**计划条(灰)在上、实际条(状态色)在下** + 今日红线 + 横向滚动。
- **TaskDetailSheet.vue**（el-drawer，普通 ref 受控）：概览(只读) + 时间摘要 + 进度条 + 按 dispatchStatus 门控的执行回填区。
- **utils/gantt.ts**（纯函数，TDD）。

### 7.2 双视角（都做）
- **资源视角**：班组 → 作业员（一作业员一行，可多任务），`groupByResource`。
- **订单视角**：订单 → 工序（按 planStartTime 排序，工序编号①②③），`groupByOrder`。

### 7.3 状态色（`getDisplayStatus`）
- 有 actualEndTime → completed（绿）
- 有 actualStartTime 且 今日>planEndTime → overdue（红）；否则 inProgress（琥珀）
- 否则 notStarted（灰）

### 7.4 拖拽改期（plan 条）
- 中段抓取=整体平移；两端 handle=缩放起/止。
- pointer 事件按天吸附；`pxToDays`/`shiftPlanByDays`（move/resize-start/resize-end，**保留时分秒**，缩放至少留 1 天）。
- 拖拽中本地预览（previewDays），松手 delta>0 → `ganttReschedule`；delta=0 视为点击 → 打开抽屉。成功 refetch（清本地覆盖），失败回退。

### 7.5 执行回填
- 悬停计划/实际条快捷：status=1 显「开工」、status=2 显「完工」。
- 抽屉按 dispatchStatus 门控：
  - 1 → 记录开工（datetime，可空取 now）→ `ganttStart`
  - 2 → 记录完工（`ganttFinish`）+ 更新进度（0-100，`ganttProgress`）
  - ≥2 → 纠时（actualStart/actualEnd，`ganttActual`）
  - 3 → 只读提示
- 时间用 `el-date-picker` datetime（`YYYY-MM-DD HH:mm:ss`）。

### 7.6 utils/gantt.ts 纯函数清单（自实现，TDD 覆盖）
`parseDay` / `floorDay` / `daysBetween` / `getDisplayStatus` / `computeRange` / `enumerateDays` / `timeToX` / `taskBars`（计划+实际条像素位置）/ `groupByResource` / `groupByOrder` / `pxToDays` / `shiftPlanByDays`。

---

## 8. 后端审查计划（按「每周期必审」约定）

- 确认 gantt 5 写端点状态机守卫的 Mockito 单测（mes-new 周期已写 15 例）仍存在且绿；如不在本工程测试目录则补齐。
- 审 `SpDispatchServiceImpl`：派工 `@Transactional`、statue 0→1、枚举一致、dispatchStatus 初值=1。
- 审 `SpOrderController` add-or-update/delete：DeepSeek 常见坑（假成功无 return、缺事务、返回 null id、物理删副作用）。
- **判定标准**：仅修「暴露出来的正确性 bug」，最小修复 + 补守卫单测；latent/越界项记 backlog 不动。后端 `Result extends HashMap`（取 `get("code")`）、JUnit4 `@RunWith(MockitoJUnitRunner)`、MP3.1.2 `count()` 返回 int。

---

## 9. 质量门禁与节奏

- 前端：`pnpm typecheck && test && lint:check && build` 全绿。新增单测：`utils/gantt`（多函数）、`utils/order`（payload/校验/状态 label）。
- 后端（若改动）：`mvn compile` BUILD SUCCESS + 守卫单测绿（JDK11）。
- subagent 驱动逐任务两阶段审查 + opus 终审 Ready to merge。
- Git：emoji conventional 中文提交，按页面/功能增量；完成 `--no-ff` 合 `develop`（develop 超前 origin，用户自行 push）。

---

## 10. 风险与备注

- **Vue 无 React RHF 的 DOM clobbering 坑**，字段名可直用 nodeName 等；但仍保留「纯函数校验 + ref 受控」风格便于 TDD。
- 拖拽用 pointer 事件 + 按天吸附，注意 `el-date-picker` 与拖拽改期两条改期入口数据一致（都经 `shiftPlanByDays`/同一 payload 构造）。
- `sp_order` / `GanttTaskVO` 时间是字符串 `yyyy-MM-dd HH:mm:ss`，`parseDay` 按本地 00:00 解析，避免时区漂移。
- DB 前置：需已跑 `dispatch-management.sql` + `gantt-migration.sql`（否则派工表/列缺失）。

---

## 11. 验收

启动后端（9090）+ DB 已跑上述脚本后，浏览器 `:4200` 冒烟（`admin/123`）：
1. 计划管理 → 工单下达：搜索/分页 → 新建（类型/物料带描述/工艺路线/计划起止）→ 编辑 → 删除。
2. 员工作业派工：勾选待派工工单 → 派工弹窗（班组→级联作业员→工时/计划/备注）→ 提交后该工单从待派工列表消失。
3. 生产甘特图：双视角切换 → 计划/实际双条+状态色+今日线 → 拖拽改期（平移/缩放）→ 悬停快捷开工/完工 → 抽屉回填（开工→进度→完工→纠时）→ 改动后条体刷新。
