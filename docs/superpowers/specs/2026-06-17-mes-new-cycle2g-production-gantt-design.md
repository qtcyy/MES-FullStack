# 周期 2g · 生产甘特图（资源/订单双视角 · 计划vs实际）— 设计

- **日期**：2026-06-17
- **前端**：`mes/frontend/apps/mes-new`（当前活跃前端，shadcn/Radix `@workspace/ui` + TanStack Query + Zustand + RR v6）
- **后端**：`mes/src/main/java/com/wangziyang/mes/order`（Spring Boot 2.1.7 + MyBatis-Plus）
- **数据库**：dev `mes_data`（MySQL）
- **状态**：设计已与用户逐节确认（A/B/C 范围、维度、交互、进度、mock 规模、菜单、架构、数据模型、mock、前端、测试）

---

## 1. 目标与范围

把生产订单/派工从"假甘特"变成**真实数据驱动的泳道甘特图**，双视角 Tabs 切换：

- **资源视角**：班组 → 作业员泳道，每行展示派给该作业员的工序任务，计划 vs 实际对比。
- **订单视角**：订单 → 工序泳道，每行（订单分组下）展示工序推进，计划 vs 实际对比。

两视角**复用同一份"派工任务"数据**，仅分组维度不同。

**交互档位**：只读展示 + hover 详情卡 + 点击条 → 右侧只读详情面板。**无写接口**（不做拖拽改期、不做执行回填）。

**进度**：在派工任务上加**真实 progress 字段**（0-100），条内填充显示。

**Mock**：本周期需补造**中等规模演示数据**（幂等可重跑 seed 脚本）。

### 非目标（明确排除，避免范围蔓延）
- 不做拖拽改期 / 执行回填写接口。
- 不做设备(equipment)维度排产（派工模型仅 team+user）。
- 不修 `statue` 拼写（牵连过广，仅注释说明）。
- 不改"派工列表只查 statue=0"的既有行为（属另一功能）。
- `sp_flow` 头表为空属历史遗留，本周期不依赖、不修复。

---

## 2. 现状勘察结论（决定设计的关键事实）

**前端 mes-new**：order 模块已有 `生产订单(OrderList/Form)`、`作业派工(DispatchList/Dialog)`；**无任何甘特/时间轴 UI**；无第三方甘特库；通用件可复用 DataTable/Tooltip/Badge/Tabs/ScrollArea/Sheet/Skeleton + PageContainer；设计系统 = Tailwind + CSS 变量主题(light/dark/custom)。

**后端**：
- `POST /order/release/gantt/list`（`SpOrderController.getListGantt`）是 **100% 假数据**：硬编码 20 条、`/Date(ms)/` 老格式、不查库。**本周期删除**。
- `SpOrder`：`id, orderCode, qty, orderType(P/A/F), materiel, materielDesc, flowId, planStartTime(String), planEndTime(String), statue(0待派工/1已派工/2进行中/3订单结束/4订单终结)` + DB 另有 order_source/schedule_mode/bom_*/customer_name/priority/plan_status/audit_status 等列。
- `SpOrderDispatch`：`id, orderId, teamId, userId, laborHours, dispatchStatus(1派工/2开工/3完工), planStartTime, planEndTime, actualStartTime, actualEndTime, remark`（时间均 varchar）。**无 oper_id、无 progress**。
- 派工/订单时间字段是 `String`，无统一格式规范。

**数据库真实数据**：
- `sp_order` 2 行，都是 statue=0；计划时间真实有值（库存 `yyyy-MM-dd`）。
- `sp_order_dispatch` **空表**。
- `sp_team`：BZ002 生产组2（成员：宋鹏 `1184009088826392578`、猴子 `1184010472443396098`）；BZ001 生产作业班组1（**0 成员**）。
- `sp_sys_user`：宋鹏(iamsongpeng)、猴子(monkey)、admin、cassman(cassman.yang `1266201180838801409`)、小明(xm `1276512902757724162`)。
- `sp_oper` 11 行（带中文 `oper_desc`）；可用工序 id：装配`1336864489340960`/测试`1336864537575456`/包装`1336864575324192`/集成测试`1336864613072928`/焊接`1336868360683552`/封胶`1336868452958240`/加酸`1336868507484192`/清洗`1336868562010144`/入库`1337248255574048`。
- `sp_flow` 头表为空（遗留），但 Gantt 不依赖：任务直接携带 `oper_id`，工序名取自 `sp_oper.oper_desc`。
- `sp_sys_menu`（带 `sp_` 前缀，列：id/code(唯一)/name(唯一)/url/parent_id/grade/sort_num/type/permission/icon/descr/审计列）：计划管理(12) 下有 121 工单下达、122 员工作业派工；数字化平台(14) 下 141 智慧大屏。**无甘特菜单槽，需新增**。菜单树端点不按角色过滤，权限串仅语义对齐。

---

## 3. 架构与数据流

```
scripts/sql/gantt-migration.sql  (ALTER sp_order_dispatch 加 oper_id/progress + INSERT 菜单)
scripts/sql/gantt-mock-seed.sql  (幂等: 班组成员 / 7订单 / ~19工序级派工任务)
        │
        ▼
DB  sp_order_dispatch(+oper_id,+progress)  ← 一条 = 订单×工序×班组×作业员，自带计划/实际/进度
        │
后端  POST /order/gantt/tasks  (只读聚合; SpGanttController→Service→Mapper XML JOIN)
        JOIN sp_order + sp_order_dispatch + sp_oper + sp_team + sp_sys_user
        → 扁平 GanttTaskVO[]（按 plan_start_time 排序）
        │
前端  GanttPage (/order/gantt)
   useQuery(['gantt-tasks',filters]) → tasks[]
     ├─ useMemo groupByResource / groupByOrder
     ├─ Tabs [资源视角|订单视角] 选分组
     └─ <GanttChart> 时间轴 + 泳道 + 计划/实际双条 + 进度 + 状态色
           ├─ hover → 详情卡
           └─ click → <TaskDetailSheet>（只读）
```

**实现方案选型（已确认）**：
- 甘特条渲染 = **纯 CSS/div 绝对定位**（吃 Tailwind/主题、轻、易交互、契合 mes-new 自研组件哲学）。不用 SVG、不引第三方甘特库（避免丑默认样式与主题冲突）。
- 后端表 = **扩展 `sp_order_dispatch`**（纯新增 oper_id/progress，向后兼容）。不新建表。
- 时间粒度 = **天级网格**显示，条按日期换算定位。

---

## 4. 数据模型 + 后端契约

### 4.1 DB 迁移（纯新增，向后兼容）
```sql
ALTER TABLE sp_order_dispatch
  ADD COLUMN oper_id  varchar(64) NULL COMMENT '工序ID(关联sp_oper);订单级派工时为空',
  ADD COLUMN progress int         NULL COMMENT '完工进度 0-100';
```

### 4.2 聚合端点
```
POST /order/gantt/tasks            (只读)
请求(全部可选): { startTime?, endTime?, orderCode?, teamId? }
响应: Result<GanttTaskVO[]>
```
`GanttTaskVO`：
```
id,                                            // 派工任务 id
orderId, orderCode, materiel, materielDesc, qty, orderType, orderStatue,
operId, operName,                              // operName = sp_oper.oper_desc
teamId, teamName, userId, userName,
planStartTime, planEndTime,                    // yyyy-MM-dd
actualStartTime, actualEndTime,                // 可空
dispatchStatus,                                // 1派工/2开工/3完工
progress                                       // 0-100
```
- Mapper XML：`sp_order_dispatch d LEFT JOIN sp_order o ON d.order_id=o.id LEFT JOIN sp_oper p ON d.oper_id=p.id LEFT JOIN sp_team t ON d.team_id=t.id LEFT JOIN sp_sys_user u ON d.user_id=u.id`，`WHERE d.oper_id IS NOT NULL`（只取工序级任务）+ 动态过滤，`ORDER BY d.plan_start_time`。
- **显示状态由前端算**（需 now）。**工序序号 ①②③ 由前端**在订单分组内按 planStartTime 排序得出，后端不存 seq。

### 4.3 后端文件改动（`com.wangziyang.mes.order`）
| 文件 | 改动 |
|---|---|
| `entity/SpOrderDispatch.java` | 加 `operId`、`progress` |
| `controller/SpGanttController.java` | **新建**，`POST /order/gantt/tasks` |
| `service/SpGanttService` + `service/impl/SpGanttServiceImpl.java` | **新建**，聚合 |
| `mapper/SpOrderDispatchMapper.java` + `resources/mapper/order/SpOrderDispatchMapper.xml` | 加 `selectGanttTasks` JOIN |
| `vo/GanttTaskVO.java`、`request/GanttQueryReq.java` | **新建** |
| `controller/SpOrderController.java` | **删除** mock `getListGantt`（`/order/release/gantt/list`，含 `/Date()/`） |

### 4.4 后端审查结论
- ✅ 删 mock gantt + 新增真实聚合端点（核心）。
- ✅ 时间统一 `yyyy-MM-dd`（seed 与新端点遵守）。
- ⚠️ 标记不动：`statue` 拼写、派工列表 statue=0 过滤、执行回填、设备维度（理由见非目标）。

---

## 5. Mock 数据方案（幂等 seed）

> 今天 = 2026-06-17，mock 时间统一落 **2026-06-09 ~ 06-24**，使"今天线"穿中段，自然呈现四态。

### 5.1 班组成员
- 生产组2：宋鹏、猴子（已有）。
- 生产作业班组1：**新增** 小明、cassman（id 用 `MK-TU-*`）。

### 5.2 订单（7 张：现有 2 UPDATE + 5 新增）
| order_code | materiel / 描述 | qty | 类型 | 计划窗口(2026) | statue | 处理 |
|---|---|---|---|---|---|---|
| GD2024061001 | MAT001 / CPU主板 | 100 | P | 6/10–6/19 | 2 进行中 | UPDATE(by order_code) |
| GD2024061002 | MAT002 / 电源模块 | 50 | P | 6/10–6/16 | 2 进行中 | UPDATE |
| GD2024061003 | MAT003 / 控制板 | 80 | P | 6/11–6/19 | 2 进行中 | 新增 `MK-ORD-03` |
| GD2024061004 | MAT004 / 外壳 | 120 | A | 6/18–6/24 | 1 已派工 | 新增 `MK-ORD-04` |
| GD2024061005 | MAT005 / 显示屏 | 200 | P | 6/9–6/13 | 3 完成 | 新增 `MK-ORD-05` |
| GD2024061006 | MAT006 / 线束 | 60 | P | 6/14–6/22 | 2 进行中 | 新增 `MK-ORD-06` |
| GD2024061007 | MAT007 / 主板组件 | 150 | F | 6/10–6/20 | 2 进行中 | 新增 `MK-ORD-07` |

### 5.3 工序级派工任务 ~19 条
- 复用现有 sp_oper（装配/测试/焊接/包装/集成测试/封胶/清洗/加酸/入库）。
- 分散到 4 人 2 班组（生产组2: 宋鹏/猴子；班组1: 小明/cassman）。
- 状态分布刻意齐全：**完工×7、进行中×6、逾期×2、未开工×4**（覆盖绿/琥珀/红/灰四色）。
- 进度：完工=100；进行中=20~70；未开工=0。
- 实际时间：完工=有 actualStart+actualEnd（含若干"延期完成"）；进行中=有 actualStart、无 actualEnd（含 planEnd<今天→逾期）；未开工=均 null。
- id 用 `MK-DSP-*`。

代表样例：
| 工序 | 班组/人 | 计划 | 实际 | 显示态 | progress |
|---|---|---|---|---|---|
| GD01·装配 | 生产组2/宋鹏 | 6/10–6/12 | 6/10–6/13 | 完工(延期) | 100 |
| GD01·测试 | 生产组2/宋鹏 | 6/15–6/18 | 6/15–… | 进行中 | 60 |
| GD02·入库 | 生产组2/猴子 | 6/15–6/16 | 6/16–… | **逾期** | 40 |
| GD04·焊接 | 班组1/cassman | 6/18–6/21 | — | 未开工 | 0 |
| GD05·装配 | 生产组2/宋鹏 | 6/9–6/11 | 6/9–6/11 | 完工 | 100 |

### 5.4 菜单行（计划管理 12 下新增）
```sql
INSERT sp_sys_menu(id,code,name,url,permission,parent_id,grade,sort_num,type,icon,descr,
  create_time,create_username,update_time,update_username)
VALUES('123','orderGantt','生产甘特图','/order/gantt','order:gantt','12','3',3,'0','calendar','',
  '2026-06-17 00:00:00','admin','2026-06-17 00:00:00','admin');
```

### 5.5 幂等写法 & 文件
- 新增行用 `MK-` 前缀确定性 id；菜单 id `123`。
- 脚本开头 `DELETE ... WHERE id LIKE 'MK-%'`（dispatch/team_user/order）+ `DELETE FROM sp_sys_menu WHERE id='123'`，再全量 INSERT；现有 2 单用 `UPDATE ... WHERE order_code=...`；新订单的任务用子查询/已知 id 关联 → **整脚本可反复重跑**。
- 文件：`scripts/sql/gantt-migration.sql`（ALTER + 菜单）、`scripts/sql/gantt-mock-seed.sql`（数据）。两者幂等。

---

## 6. 前端组件设计（`apps/mes-new/src`）

| 文件 | 职责 |
|---|---|
| `api/order/gantt.ts` | `fetchGanttTasks(req)` → POST `/order/gantt/tasks`(JSON)；`GanttTask` 类型 |
| `pages/order/gantt/GanttPage.tsx` | PageContainer + 工具栏 + Tabs + GanttChart + 详情 Sheet |
| `pages/order/gantt/GanttChart.tsx` | 时间轴表头 + 泳道分组 + 行 + 计划/实际双条 + 进度 + 状态色 + hover + click |
| `pages/order/gantt/TaskDetailSheet.tsx` | 点击条 → 右侧只读详情面板 |
| `pages/order/gantt/ganttUtils.ts` | 纯函数：`timeToX` / `getDisplayStatus` / `groupByResource` / `groupByOrder` / `computeRange` |
| `pages/order/gantt/__tests__/ganttUtils.test.ts` | 单测 |
| `router.tsx`、`routeMeta.ts` | 注册 `/order/gantt` → GanttPage；`{title:'生产甘特图'}` |
| 侧栏图标映射 | 菜单 icon `calendar` → lucide |

- `urlMap.ts` 无需改（菜单 url `/order/gantt` == SPA 路由，`toReactRoute` 透传）。三处对齐：菜单 url / router path / routeMeta key。
- **GanttChart**：props `{groups, rangeStart, rangeEnd, onTaskClick}`；`groups:{key,label,tag,rows:{key,label,sublabel,tasks}[]}[]`。左侧固定 label 列(~150px sticky) + 右侧时间轨；天级网格每天固定宽(~44px)，超长 `ScrollArea` 横向滚；今天竖线。每 task：计划条(浅,上)+实际条(状态色,下)+进度填充+文案，位置 `timeToX()`。
- **状态色**（`getDisplayStatus(task, now)`）：有 actualEnd→完工(绿)；有 actualStart 无 actualEnd→`now>planEnd` 逾期(红) 否则 进行中(琥珀)；无 actualStart→未开工(灰)。
- 工具栏：日期范围(默认数据范围) + 订单编号输入 + 班组下拉 + 刷新；Tabs 默认资源视角。
- 复用 @workspace/ui：Tabs/ScrollArea/Tooltip(或 HoverCard)/Badge/Sheet/Skeleton/Button/Input/Select/Separator + PageContainer。
- 设计质量：圆角条、今天线、hover 抬升、状态色适配三主题，全自研、现代好看，不照搬 mes1。
- **无表单**（只读），不涉及 RHF `nodeName` DOM 污染坑。

---

## 7. 测试策略（TDD）

**前端（Vitest）— TDD 主战场**：先写 `ganttUtils.test.ts` 失败用例 → 实现 `ganttUtils.ts`：
- `timeToX(date,range,dayWidth)`：位置换算 + 边界(=起点 / 超范围 clamp)。
- `getDisplayStatus(task,now)`：完工/进行中/逾期/未开工 四分支。
- `groupByResource(tasks)`：班组→作业员 嵌套与排序。
- `groupByOrder(tasks)`：订单→工序(按 planStart) + ①②③ 序号。
- `computeRange(tasks)`：min/max + padding。
- `GanttChart` 渲染冒烟：给 mock groups → 渲染行/条，点击触发 onTaskClick。

**后端**：聚合为纯 SQL，无纯逻辑可单测；若有可连 dev 库的测试 profile 则加 mapper 映射测试，否则以集成验证为准。

**验证纪律（每步贴真实输出）**：
1. 跑 migration + seed → `SELECT COUNT(*)` 证列已加、7 单/~19 任务到位。
2. `pnpm --filter mes-new exec tsc --noEmit` + `pnpm lint`。
3. `pnpm --filter mes-new test`（ganttUtils + 冒烟）。
4. 起后端+前端，`curl /api/order/gantt/tasks` 返回真实 JSON；`/order/gantt` 两 Tab 渲染（observe/截图）。

**实现 TDD 顺序**：ganttUtils 测试(红)→ganttUtils(绿)→组件→后端端点→seed→集成验证。

---

## 8. 验收标准

- [ ] `/order/gantt` 可从侧栏"计划管理 → 生产甘特图"进入。
- [ ] 资源视角：按 班组→作业员 泳道显示工序任务，计划/实际双条 + 进度 + 四态色正确。
- [ ] 订单视角：按 订单→工序 显示，工序按计划时间有序、带序号。
- [ ] hover 出详情卡；点击条出右侧只读详情面板。
- [ ] 数据全部来自真实聚合端点（非 mock），seed 后甘特填满。
- [ ] 旧 mock `/order/release/gantt/list` 已删除。
- [ ] seed/migration 脚本幂等可重跑。
- [ ] tsc / lint / vitest 全绿；集成验证有证据。
- [ ] 三主题(light/dark/custom)下显示正常。
