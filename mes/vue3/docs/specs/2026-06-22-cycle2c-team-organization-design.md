# 子周期 2c 组织·班组 — 设计文档

- 日期：2026-06-22
- 分支：`feature/team-organization`（从 `develop` 切）
- 周期归属：Cycle 2（库存 + 剩余基础数据 + 组织），**2c 组织·班组**
- 功能/接口参考：React 版 `mes/frontend/apps/mes-new`（**周期 2l 班组员工定义** + `ProcessUnitTeams` 面板），**仅参考接口契约与功能，绝不照抄 UI**

---

## 1. 目标

完成「组织·班组」业务线，覆盖后端 `sp_team` / `sp_team_user` / `sp_process_unit_team` 三张表的全部功能：

1. **班组管理（含成员维护）** — 新页 `/system/team`，挂系统管理组。
2. **加工单元-班组关联** — 改造 2b-2 现有加工单元页 `/basedata/process-unit` 为主从，右侧增「关联班组」面板。

完成后模块覆盖矩阵 §9.1「班组管理（成员）」由 ☐ → ✅，Cycle 2 推进至 2c。

---

## 2. 后端契约（均已存在，预期零生产代码改动）

### 2.1 班组 `SpTeamController` `/admin/sys/team`

| 端点 | 方法 | 编码 | 说明 |
|---|---|---|---|
| `/page` | POST | form | 分页（`pageWithRelations`，记录含 userCount 等派生字段） |
| `/{id}` | GET | — | 按 id 取班组 |
| `/add-or-update` | POST | **form**（后端 `SpTeam record`，非 @RequestBody） | 新增/编辑，返回 id |
| `/delete` | POST | **JSON** `{id}` | 软删 `is_deleted='1'` |
| `/users/{teamId}` | GET | — | 班组成员（`List<SysUser>`） |
| `/users/add` | POST | **JSON** `{teamId, userIds[]}` | 批量加成员，后端按 (team_id,user_id) 去重 |
| `/users/remove` | POST | **JSON** `{teamId, userId}` | 移除单个成员 |
| `/available-users` | GET | — | 全部可选用户（`is_deleted='0'`），候选池由前端 `excludeSelected` 排除已在组者 |

### 2.2 加工单元-班组关联 `SpProcessUnitController` `/basedata/process-unit`

| 端点 | 方法 | 编码 | 说明 |
|---|---|---|---|
| `/teams/{unitId}` | GET | — | 该单元已绑班组（`List<SpTeam>`） |
| `/teams/add` | POST | **JSON** `{unitId, teamId}` | 绑定（后端按 unit_id+team_id 去重） |
| `/teams/remove` | POST | **JSON** `{unitId, teamId}` | 解绑 |

> 加工单元自身的 page/add-or-update/delete 端点 2b-2 已对接，本周期不动。

### 2.3 `SpTeam` 实体字段

`code` / `name` / `descr` / `lineId` / `workshopId` / `startTime` / `endTime` / `workdays` / `is_deleted`（`@TableField("is_deleted")` 映射 Java `deleted`）。

---

## 3. 前端实现

### 3.1 班组管理页 `/system/team`（新页）

形态：`MasterDetailLayout` 主从。

- **左（主）**：班组 `DataTable`
  - 服务端分页 + code/name `SearchForm` 搜索
  - 工具栏「新增」（`v-permission="'team:add'"`）
  - 列：代码 / 名称 / 上下班时间（`startTime~endTime`）/ 工作日（`workdaysLabel`）/ 成员数（userCount）
  - 行操作：编辑 / 删除（软删，`ElMessageBox` 二次确认）
  - `@row-click` 选中 → 驱动右侧面板
- **右（从）**：成员维护面板 `TeamMembers.vue`
  - 未选中班组 → 空态提示
  - 选中 → 成员列表（`teamUsers(teamId)`）+「管理成员」按钮
  - 「管理成员」→ `DualListTransfer` 弹窗：
    - 候选 = `teamAvailableUsers()` 经 `excludeSelected(已在组 userIds)`
    - 已选 = 当前成员
    - `onAdd(userIds[])` → `teamUsersAdd(teamId, userIds)`；`onRemove(userId)` → `teamUserRemove(teamId, userId)`
    - 写后 reload 成员列表（置于 `finally`，部分失败也与服务端对账）
  - 右面板 `:key=班组id` 强制按班组重挂载，隔离并行加载竞态（同 2b-1 device-group 约定）

表单 `TeamFormDialog.vue`（`FormDialog` + `el-form`）：

| 字段 | 控件 | 校验 |
|---|---|---|
| 班组代码 code | `el-input` | 必填 |
| 班组名称 name | `el-input` | 必填 |
| 上班时间 startTime | `el-time-picker`（`HH:mm`，`value-format`） | 可空 |
| 下班时间 endTime | `el-time-picker`（`HH:mm`） | 可空 |
| 工作日 workdays | `el-select multiple`（周一~周日，7 项） | 可空 |
| 备注 descr | `el-input type=textarea` | 可空 |

> 提交时 workdays 多选数组经 `formatWorkdays` → CSV（`"1,2,3"`）；回填时 `parseWorkdays` CSV → 数组。

### 3.2 加工单元页改造 `/basedata/process-unit`（现页升级）

把现有 `ProcessUnitList.vue`（`PageContainer` + `SearchForm` + `DataTable` 纯列表）改造为 `MasterDetailLayout`：

- **左（主）**：加工单元 CRUD —— **现有逻辑全部保留**（搜索/分页/新增/编辑/删除/线边库标签列/表单弹窗），仅新增 `@row-click` 选中状态。
- **右（从）**：关联班组面板 `ProcessUnitTeams.vue`
  - 未选中 → 空态
  - 选中 → 已绑班组列表（`processUnitTeams(unitId)`，列：班组编码/名称 + 解绑）+「绑定班组」按钮
  - 「绑定班组」→ `DualListTransfer` 弹窗：候选 = `teamPage({size:大})` 经 `excludeSelected(已绑 teamIds)`；`onAdd` 逐个 `processUnitTeamAdd`、`onRemove` `processUnitTeamRemove`
  - `:key=单元id` 重挂载

> 删除某加工单元后，右面板需在选中项失效时回退空态（防御性置 `selected=null`）。

### 3.3 沉淀

- `src/utils/team.ts`（纯函数 + TDD）：
  - `WEEKDAYS`（周一1..周日7）
  - `parseWorkdays(csv)` → `string[]`（去空白/空段，保序）
  - `formatWorkdays(days[])` → CSV（过滤非法/去重/数值升序）
  - `workdaysLabel(csv)` → `"周一 周二"`（升序空格连接，空→`-`）
  - `buildTeamPayload(form)` → 提交体（workdays 数组转 CSV、剥空、deleted 默认）
  - `validateTeam(form)` → 校验结果（code/name 必填）
- `src/api/system/team.ts`（8 端点，编码差异见 §2.1）
- `src/api/basedata/processUnit.ts`：补 `processUnitTeams` / `processUnitTeamAdd` / `processUnitTeamRemove`
- `src/types`：`SpTeam`（补 startTime/endTime/workdays）+ `SpTeamDTO`（userCount/lineName/workshopName 等派生只读字段）
- 复用既有：`MasterDetailLayout` / `DataTable` / `DualListTransfer` / `excludeSelected`（utils/device 已有，按需复用或在 utils/team 重导出，避免重复定义）

---

## 4. 关键决策

1. **生产线/车间（lineId/workshopId）不做**：`sp_line` / `sp_work_shop` 无 list 接口、无数据源 → 表单不含这两项（沿用 mes-new 2l 先例）。提交 payload 不带 lineId/workshopId（后端字段保持 NULL）。
2. **成员/班组绑定统一形态**：右面板「列表 + 按钮开 `DualListTransfer` 弹窗」，候选池经 `excludeSelected` 排除已选。批量 add、逐个 remove（对齐后端端点粒度）。
3. **编码约定**：team page/add-or-update 走 form；delete/users-add/users-remove 走 JSON；users/{teamId}、available-users 走 GET。process-unit teams/{unitId} 走 GET、teams/add、teams/remove 走 JSON。
4. **Vue 无 RHF DOM clobbering 坑**：`el-form` + reactive 字段名直接用 `workdays`/`startTime` 等，无需别名（对齐 1c-2 结论）。

---

## 5. 后端审查（按 [[backend-deepseek-review-each-cycle]] 每周期必审）

预期零改动，但必须复核：

- `SpTeamController`：mes-new 2l 已审无 bug（`saveOrUpdate` 空 id 走雪花插入安全、delete 软删、available-users 过滤 is_deleted='0'、users/add 去重）。本周期复核一遍。
- `SpProcessUnitController` 的 `/teams/*` 三端点 + 关联 service：vue3 周期首次复核（add 去重守卫、remove 物理删、teams 查询）。
- 若发现暴露 bug 才做**最小、纯新增**修正 + Mockito 守卫单测（JUnit4，对齐同包既有测试风格）。

---

## 6. 菜单 / 路由

- **班组**：复用既有 `scripts/sql/team-management.sql`（建表 + 种子 + **菜单 107「班组员工定义」**挂系统管理组 parent 10，url `/admin/sys/team/list-ui`，perm `team:add`，**需手动跑**）。前端：urlMap +1（`/admin/sys/team/list-ui` → `/system/team`）+ router +1（meta.perm `team:add`）。
- **加工单元**：零菜单/urlMap 改动（改造现页，菜单 134 + urlMap 映射 2b-2 已就位）。

---

## 7. 验证

- 前端门禁：`pnpm typecheck`（0）/ `pnpm test`（新增 team utils 测试，总数较 281 上升）/ `pnpm lint:check`（0 err）/ `pnpm build`（✓）
- 后端：`mvn compile` BUILD SUCCESS（JDK11）+ 若有守卫单测 `mvn test -Dtest=...` 绿
- subagent 驱动逐任务两阶段审查（spec 符合 + 质量）+ opus 整体终审
- **人工 :4200 冒烟待用户确认**：需后端 9090 + DB 跑 `team-management.sql`，`admin/123` 登录 →
  - 系统管理 → 班组员工定义：新增班组（填工作日/上下班）→ 选中 → 管理成员（穿梭框加/减）→ 编辑 → 软删
  - 物料管理 → 加工单元：选中单元 → 绑定班组（穿梭框）→ 解绑

---

## 8. 范围外（明确不做）

- 生产线/车间维护与下拉（无数据源）。
- 班组排班的复杂规则（仅 startTime/endTime/workdays 三字段，无班次轮转）。
- team → 加工单元 反向查询页（后端无该方向端点）。

---

## 9. backlog（预登记，非阻塞）

- `getTeamUsers` / `processUnitTeams` 不过滤成员/班组软删状态（与 mes-new 2l 判定一致：加过滤会与 userCount 徽标不一致；班组软删后关联行成孤儿，跨模块低危）。
- 候选池 `teamPage`/`available-users` 大 size 兜底全量（PaginationInterceptor 上限隐患，同 1f/2a/2b-1）。
- `process-unit/teams/add` 无 `@Transactional`（单行 insert，低危）。
</content>
</invoke>
