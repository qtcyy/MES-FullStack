# mes-new Cycle 2l — 班组员工定义页设计

- 日期: 2026-06-18
- 路由: `/system/team`（菜单「班组员工定义」, sp_sys_menu id=107, parent=系统管理, permission=`team:add`）
- 关联后端: `SpTeamController` (`/admin/sys/team`)，已存在且完整（见 `2026-06-06-team-management-design.md`）
- 前端 app: `mes/frontend/apps/mes-new`（shadcn/Radix `@workspace/ui` + RHF + zod + TanStack Query）

## 1. 背景与问题

菜单「班组员工定义」点击后跳 `/system/team`，但前端缺路由 → 渲染 404（NotFound）。
根因核实：
- `urlMap.ts` 已映射 `'/admin/sys/team/list-ui' → '/system/team'`（菜单可点）。
- `router.tsx` **无** `system/team` 路由；`routeMeta.ts` **无** 该 tab 元数据 → 404。

后端已完全就绪（班组 CRUD + 成员维护 + 候选用户池），本周期仅做**前端页面 + 接线**，并按例顺带审查涉及后端。

## 2. 范围（已与用户确认）

- 班组表单字段：**代码、名称、备注、上班时间、下班时间、工作日（周一~周日多选）**。
- 生产线(`lineId`)/车间(`workshopId`)：本系统无 `sp_line`/`sp_work_shop` 的 list 接口、前端无数据源，**本页不放入表单**（留空，不影响保存；后端 `add-or-update` 接受缺省）。
- 布局：**方案 A 主从页**——左班组列表 CRUD + 右选中班组成员维护。
- 按钮权限：与同级系统页（DictList/UserList）保持一致（计划阶段确认其做法后照做；当前预期不加按钮级 PermissionGuard，侧边栏本就不按角色过滤）。

## 3. 后端接口契约（既有，不改；仅审查）

`@RequestMapping("/admin/sys/team")`，`SpTeamController`：

| 端点 | 方法 | 入参 | 出参 | 编码 |
|---|---|---|---|---|
| `/page` | POST | `SpTeamPageReq{current,size,name?,code?}` | `IPage<SpTeamDTO>` | form |
| `/{id}` | GET | path id | `SpTeam` | — |
| `/add-or-update` | POST | `SpTeam record`（非 @RequestBody） | `id` | **form** |
| `/delete` | POST | `@RequestBody {id}` | null（软删 is_deleted='1'） | **JSON** |
| `/users/{teamId}` | GET | path teamId | `SysUser[]`（该班组成员） | — |
| `/users/add` | POST | `@RequestBody {teamId, userIds:[]}` | null（已存在则跳过） | **JSON** |
| `/users/remove` | POST | `@RequestBody {teamId, userId}` | null | **JSON** |
| `/available-users` | GET | — | `SysUser[]`（全部 is_deleted='0'） | — |

`SpTeamDTO` extends `SpTeam`：额外 `lineName, workshopName, userCount, userList, userIds`。
`pageWithRelations` 仅填充 `lineName/workshopName/userCount`（**不填 userList**）→ 成员列表走专用 `GET /users/{teamId}`。
`SpTeam` 字段：`code, name, descr, lineId, workshopId, startTime, endTime, workdays, deleted(@TableField is_deleted)`。
`SysUser` 展示字段：`name`(姓名), `username`(登录名)。

## 4. 文件清单

### 新建 `src/pages/system/team/`
| 文件 | 职责 |
|---|---|
| `TeamPage.tsx` | 编排器：`MasterDetailLayout`；状态 selected/searchParams/formOpen/editing；班组 page 查询 + add-or-update/delete mutation；删除/切换时清瞬态 |
| `TeamForm.tsx` | 班组新增/编辑 `FormDialog`（RHF+zod），工作日多选、上下班时间 |
| `TeamMembers.tsx` | 右侧成员面板：`RelatedPanel`（标题+计数+添加按钮）+ 成员行（移除）+ `DualListTransfer` 添加弹窗 |
| `teamUtils.ts` | 纯函数：`parseWorkdays`/`formatWorkdays`/`workdaysLabel` + `WEEKDAYS` 常量 |
| `__tests__/teamUtils.test.ts` | 纯函数单测 |

### 改动（接线）
- `src/api/system/team.ts` — 在现有 `teamPage` 上补全全部端点函数（见 §3 编码差异）。
- 类型：`SpTeam` 现已定义于 `src/types/process-unit.ts`（`api/system/team.ts` 即从此导入）。本次新增 `SpTeamDTO`（extends SpTeam，含 `userCount/lineName/workshopName/startTime/endTime/workdays`）与成员/请求类型，统一放入 `src/types/system.ts`（不存在则新建），其中从 `process-unit` 复用 `SpTeam`，避免重复定义。
- `src/router.tsx` — `import TeamPage from '@/pages/system/team/TeamPage'` + 路由 `{ path: 'system/team', element: <TeamPage /> }`（系统块内）。
- `src/layouts/routeMeta.ts` — `'/system/team': { title: '班组员工定义', icon: 'team' }`。
- `urlMap.ts` — 已映射，**不改**。

## 5. 组件与数据流

**左 master**：`SearchForm`(代码/名称) + `DataTable`(服务端分页；列：代码、名称、工作日`workdaysLabel`、成员数`userCount`、操作✎🗑) + `+ 新增班组`。点行 `setSelected`，选中行高亮（`rowClassName`）。分页 `current`(1基) ↔ DataTable `pageIndex`(0基) 换算同 DictList。

**右 detail**：未选 → 占位提示卡。选中 → `RelatedPanel` 标题「『{name}』成员（{count}）」+ `+ 添加成员`；逐行成员（primary=name, secondary=username）+ 移除按钮。`+ 添加成员` 打开 `DualListTransfer`：
- 候选 = `teamAvailableUsers()` 经 `excludeSelected(all, 已在组ids)`（复用 `utils/transfer.ts`）映射为 `{id, primary:name, secondary:username}`。
- 已选 = 当前成员同映射。
- `onAdd(ids)` → `teamUsersAdd(teamId, ids)`；`onRemove(id)` → `teamUserRemove(teamId, id)`。

**查询键**
- `['sys','team','page', params]`
- `['sys','team','users', teamId]`（enabled: `!!selected`）
- `['sys','team','available-users']`（enabled: 弹窗 open）

**失效联动**
- 成员 增/移 → 失效 `['sys','team','users',teamId]` **且** `['sys','team','page']`（userCount 列变化）。
- 班组 增/改/删 → 失效 `['sys','team','page']`。
- 失效用既有 prefix 约定（如 `invalidate('["sys","team"')`）。

## 6. 表单与校验（TeamForm）

zod schema：
- `code`: `z.string().min(1,'请输入班组代码')`
- `name`: `z.string().min(1,'请输入班组名称')`
- `descr`: `z.string().optional()`
- `startTime`/`endTime`: `z.string().optional()`（`<input type="time">`，HH:mm）
- `workdays`: `z.array(z.string()).optional()`（周一~周日复选；提交 `formatWorkdays` → `"1,2,..."`）

行为：
- 编辑回填 `useEffect(open)` + `reset(...)`；工作日用 `parseWorkdays(record.workdays)` 还原数组。
- 新增不传 `id`（后端雪花生成）；`deleted` 默认 `'0'`。
- 提交合并：`{ ...(record ?? 默认空), code, name, descr, startTime, endTime, workdays: formatWorkdays(values.workdays) }` → `teamAddOrUpdate`。
- **RHF 字段名规避 DOM 冲突**（见 rhf-field-name-dom-clobbering）：`name` 是 form DOM 属性名，存在 register 冲突风险。本表单的多选/受控字段（workdays）用 `Controller`；对 `name`/`code` 字段，计划阶段实测 `register('name')` 提交是否触发整页刷新——若有任何异常，整表单字段改用受控 `Controller` + `useState`/`setValue` 方案（与 ManagerItemForm 同策略）。

## 7. 错误处理与防御性卫生

- 业务错误/HTTP 401 由 `http` 拦截器统一 toast/跳转；mutation `try/catch{}`（空 catch，拦截器已 toast），成功显式 toast。
- 删除走 `AlertDialog` 二次确认。
- `code` DB 唯一键（`idx_team_code`）冲突 → 后端报错 → 拦截器 toast。
- **瞬态卫生**（对齐 cycle2j-2 终审习惯）：切换选中班组或删除时，关闭成员弹窗、清编辑态；删除的恰为当前选中班组 → 清 selected、右栏回占位。

## 8. teamUtils 规格

- `WEEKDAYS: {value:'1'..'7', label:'周一'..'周日'}[]`
- `parseWorkdays(csv?: string): string[]` — 按 `,` 拆、去空、保序。
- `formatWorkdays(arr?: string[]): string` — 数值升序去重后 `join(',')`；空 → `''`。
- `workdaysLabel(csv?: string): string` — 转中文星期串（如 `周一 周二 周三 周四 周五`）；空 → `'-'`。

## 9. 测试与验证

- **单测**（vitest, `pnpm test`）：`teamUtils.test.ts` 覆盖空串、乱序、越界值、`parse↔format` 往返一致、`workdaysLabel` 渲染。成员候选排除由既有 `transfer.test.ts` 覆盖。
- **门禁全绿**：`pnpm check-types`、`pnpm lint`、`pnpm test`、`pnpm build`。
- **端到端**（dev `:4100`，登录后）：
  1. 点菜单「班组员工定义」→ 不再 404，渲染主从页。
  2. 新增班组（含工作日/上下班时间）→ 列表出现、工作日列正确。
  3. 选中班组 → 右栏成员；`+ 添加成员` 勾选若干 → 成员出现、左表成员数 +N。
  4. 移除成员 → 消失、成员数 -1。
  5. 编辑班组（改名/工作日）→ 列表刷新。
  6. 删除班组 → 软删消失、若为选中则右栏回占位。
  贴运行/截图证据。
- **后端审查**（backend-deepseek-review-each-cycle）：审 `SpTeamController`/`SpTeamServiceImpl`/`SpTeamMapper.xml` —— 重点 `users/add` 去重逻辑、软删过滤（`is_deleted != '1'`）、`available-users` 是否应排除已在组用户（当前不排除，由前端 `excludeSelected` 处理，确认可接受）。发现 bug 一并修并记录。

## 10. 非目标（YAGNI）

- 生产线/车间字段与下拉（无数据源）。
- 成员的角色/工时/考勤等扩展属性。
- `available-users` 的服务端分页（班组场景用户量小，一次性加载 + 前端过滤即可）。
