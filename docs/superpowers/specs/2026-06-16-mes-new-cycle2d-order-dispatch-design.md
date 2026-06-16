# 生产订单 + 派工(Order + Dispatch)设计规格

> 周期 2d。新前端 `mes/frontend/apps/mes-new`(React 19 + TS + Vite + shadcn `@workspace/ui` + react-hook-form + zod + `@ngify/http`/rxjs)。后端 Spring Boot 2.1。

**日期:** 2026-06-16 · **分支:** `feat/frontend-rebuild`

## 1. 目标
重建 MES 运营层第一环:**生产订单 CRUD** + **派工 Dispatch**(把待派工订单分配给班组+作业员),形成"下单 → 派工"闭环。

## 2. 范围
**做:** 订单列表/新增/编辑/删除(物料从主数据选、工艺路线下拉);待派工列表(多选)+ 派工弹窗(班组→作业员级联);后端修正+审查;路由 + ROUTE_META。
**不做(本周期):** 甘特图(后端是 mock 假数据,低价值);订单状态机流转 UI;派工改派/撤回;产品 BOM 关联。

## 3. 约定 / 既有范式
- **后端必审**:本仓库后端多为 DeepSeek 生成、常有 bug,本周期涉及的 `SpOrderController` 等必须审查+修正,前端契约以**修正后的后端**为准(见记忆 backend-deepseek-review-each-cycle)。
- 数据层 `http`/`useQuery$`/`useMutation$`/`invalidate`;POST 默认 form-encode,JSON 接口显式传 `{ headers: { 'Content-Type': 'application/json' } }`。
- 既有组件:`FormDialog`/`FormField`/`FormSection`/`DataTable`(服务端分页 + `enableRowSelection`/`rowSelection`/`onRowSelectionChange`)/`SearchForm`/`PageContainer`/`PermissionGuard`。
- 新页面进侧边栏的机制:菜单树返回**全部**菜单(不按角色过滤),`AppSidebar` 用 `toReactRoute(menu.url)` 映射;`ROUTE_META` 提供标签/页头标题。

## 4. 后端契约(已核实)+ 本周期修正

### 4.1 生产订单 `SpOrderController` @ `/order/release`
现状与**必须的修正**:

| 接口 | 方法 | 现状 | 本周期动作 |
| --- | --- | --- | --- |
| `/page` | POST 表单 | 入参复用 `spMaterileReq`(仅 `materielLike`/`materielDescLike`) | **新增 `SpOrderReq`**(`orderCodeLike` + `materielLike`),page 改用之,支持按工单号搜索 |
| `/get-by-id` | GET `?id=` | 正常返回 `SpOrder` | 不动 |
| `/add-or-update` | POST 表单 | **坏**:`addOrUpdate(SpMaterile)` → `getById(record.getFlowId())` → `saveOrUpdate`,不保存提交字段 | **修正**:`addOrUpdate(SpOrder record)` → 若 `id` 空则 `setStatue(0)`(待派工)→ `saveOrUpdate(record)` |
| `/delete` | POST 表单 `{id}` | `deleteByTableNameId(SpMaterile)` → `removeById(id)`(能用但入参类型不当) | 清理入参为 `SpOrder`,逻辑不变 |
| `/gantt/list` | POST JSON | mock 假数据 | **不动、前端不调用** |

**SpOrder 实体(表 `sp_order`,extends BaseEntity)Java 已映射字段:**
`id`、`orderCode`(工单编号,手输,不自动生成)、`orderDescription`、`qty`(Integer)、`orderType`(String:`P`批量/`A`验证/`F`返工)、`flowId`(工艺路线 id)、`materiel`(物料编码)、`materielDesc`(物料描述)、`planStartTime`(String)、`planEndTime`(String)、`statue`(Integer)。
**statue 语义(以派工逻辑为准,并更新实体注释):** `0` 已下发/待派工 · `1` 已派工 · `2` 进行中 · `3` 订单结束 · `4` 订单终结。新建订单 = `0`。
工艺路线下拉来源:`GET /basedata/flow/list` → `List<SpFlow>{id,flow,flowDesc,process}`。

### 4.2 派工 `SpDispatchController` @ `/order/dispatch`(后端较新、基本可用,本周期审查确认)

| 接口 | 方法 | 入参 | 返回 |
| --- | --- | --- | --- |
| `/page` | POST 表单 | `SpDispatchPageReq`(`orderCode?` + 分页) | `Result<IPage<Map>>`(待派工单 `statue=0`,Map 含订单字段 + `dispatchStatus/workerName/teamName`) |
| `/assign` | POST **JSON** | `SpDispatchDTO`{`orderIds:String[]`,`teamId`,`userId`,`laborHours`(BigDecimal),`planStartTime?`,`planEndTime?`,`remark?`} | `Result`(逐单建 `SpOrderDispatch`,校验 `statue==0`,派工后订单 `statue=1`) |
| `/get-by-order/{orderId}` | GET | path | `Result<Map>`(派工详情) |
| `/teams` | GET | — | `Result<List<SpTeam>>{id,code,name,...}` |
| `/team-users/{teamId}` | GET | path | `Result<List<SysUser>>{id,name,username,...}` |

派工语义:按**整张订单**派给**一个班组 + 一个作业员**,一次可批量多张订单(`orderIds`)。
后端审查:`SpDispatchServiceImpl` 经勘察基本正确(statue=0 过滤、assign 事务、级联用户/班组名);审查任务通读确认,如发现 bug 一并修。

## 5. 前端文件结构

| 文件 | 责任 | 动作 |
| --- | --- | --- |
| `src/types/order.ts` | `SpOrder`、`SpOrderReqParams`、`DispatchableOrder`、`SpDispatchAssign`、`SpTeamOption`、`TeamUserOption` | 新建 |
| `src/utils/datetime.ts`(+ 测试) | `toDatetimeLocal`/`fromDatetimeLocal` 纯函数(字符串 ↔ datetime-local) | 新建(TDD) |
| `src/api/order/order.ts` | 订单 API(page/getById/addOrUpdate/delete) | 新建 |
| `src/api/order/dispatch.ts` | 派工 API(page/assign/byOrder/teams/teamUsers) | 新建 |
| `src/api/technology/flow.ts` | 增加 `flowList()`(GET /basedata/flow/list,供订单工艺下拉) | 改 |
| `src/pages/order/production/OrderForm.tsx` | 订单表单(物料/工艺下拉、计划时间) | 新建 |
| `src/pages/order/production/OrderList.tsx` | 订单列表(分页 + 工单号/物料搜索 + 增删改) | 新建 |
| `src/pages/order/dispatch/DispatchDialog.tsx` | 派工弹窗(班组→作业员级联) | 新建 |
| `src/pages/order/dispatch/DispatchList.tsx` | 待派工列表(多选 + 派工) | 新建 |
| `src/layouts/routeMeta.ts` | 加 `/order/production`、`/order/dispatch` 两条 | 改 |
| `src/router.tsx` | 注册两路由 | 改 |
| `mes/.../order/controller/SpOrderController.java` | 修正 add-or-update/delete + page 用 SpOrderReq | 改 |
| `mes/.../order/request/SpOrderReq.java` | 新增分页请求(orderCodeLike+materielLike) | 新建 |
| `mes/.../order/entity/SpOrder.java` | 更新 statue 注释为派工口径 | 改 |

## 6. 组件设计

### 6.1 订单列表 OrderList(路由 `/order/production`,权限 `order:add`)
- `useQuery$(['order','page',params], () => orderPage(params))`,DataTable 服务端分页。
- 列:工单编号 `orderCode`、物料 `materiel`、物料描述 `materielDesc`、数量 `qty`、类型 `orderType`(Badge:P 批量/A 验证/F 返工)、计划开始/结束、状态 `statue`(Badge:0 待派工/1 已派工/2 进行中/3 已结束/4 已终结)、操作(编辑/删除)。
- 搜索:工单编号(`orderCodeLike`)+ 物料(`materielLike`)。新建/编辑 → OrderForm。删除 → `orderDelete(id)`。

### 6.2 订单表单 OrderForm(`FormDialog`,图标 `ClipboardList`)
- zod:`orderCode` 必填;`qty` `z.coerce.number().int().min(1)`;`orderType` `z.enum(['P','A','F'])` 默认 `P`;`materiel` 必填(选物料带出)、`materielDesc`;`flowId` 可选;`orderDescription`/`planStartTime`/`planEndTime` 可选。
- **物料选择**:Controller + Select,选项来自 `materilePage({current:1,size:200})`,显示 `materiel - materielDesc`,选中后 `setValue('materiel', m.materiel); setValue('materielDesc', m.materielDesc)`。(>200 物料的搜索后续增强,v1 注明。)
- **工艺路线**:Controller + Select,选项来自 `flowList()`,显示 `flow - flowDesc`,值 `flowId`,可清空。
- **计划开始/结束**:`<Input type="datetime-local">`,经 `toDatetimeLocal`/`fromDatetimeLocal` 与后端字符串(`YYYY-MM-DD HH:mm:ss`)互转。
- 不暴露 statue(新建后端置 0;编辑保留原值,提交时回带 `record.statue`)。
- 提交:`orderAddOrUpdate({ id: record?.id, orderCode, orderDescription, qty, orderType, materiel, materielDesc, flowId, planStartTime, planEndTime, ...(record ? { statue: record.statue } : {}) })`(表单编码)→ `invalidate('["order","page"')` + toast。

### 6.3 待派工列表 DispatchList(路由 `/order/dispatch`,权限 `order:dispatch`)
- `useQuery$(['dispatch','page',params], () => dispatchPage(params))`,DataTable 服务端分页 + `enableRowSelection` + 受控 `rowSelection`(`getRowId` 用 order id)。
- 列:工单编号、物料/描述、数量、类型、计划起止、状态。搜索:工单编号。
- 工具栏:`<PermissionGuard perm="order:dispatch">`「批量派工」按钮(选中 ≥1 启用)→ 打开 DispatchDialog 传选中的 orderIds。
- 派工成功后清空选择 + `invalidate('["dispatch","page"')`。

### 6.4 派工弹窗 DispatchDialog(`FormDialog`,图标 `UserCheck`)
- props:`open/onOpenChange/orderIds: string[]/onAssigned`。
- 字段:班组(Select,`dispatchTeams()`,显示 `code - name`)→ onChange 加载 `dispatchTeamUsers(teamId)`;作业员(Select,依赖班组);工时 `laborHours`(number,>0);计划开始/结束(datetime-local);备注(Textarea)。
- **班组→作业员级联**用 rhf:`teamId` 变化时 `setValue('userId','')`;作业员 useQuery$ `enabled: open && !!teamId`。初始化用 `reset`(不在 effect setState)。
- 校验:teamId/userId/laborHours 必填;`orderIds.length>=1`。
- 提交:`dispatchAssign({ orderIds, teamId, userId, laborHours, planStartTime, planEndTime, remark })`(**JSON**)→ toast + `onAssigned()`(父组件清选择+刷新)+ 关闭。

## 7. API 层
`api/order/order.ts`:
- `orderPage(params:{current;size;orderCodeLike?;materielLike?})` → `http.post<PageResult<SpOrder>>('/order/release/page', params)`
- `orderGetById(id)` → `http.get<SpOrder>('/order/release/get-by-id?id='+encodeURIComponent(id))`
- `orderAddOrUpdate(body)` → `http.post<void>('/order/release/add-or-update', body)`(表单)
- `orderDelete(id)` → `http.post<void>('/order/release/delete', { id })`(表单)

`api/order/dispatch.ts`:
- `dispatchPage(params:{current;size;orderCode?})` → `http.post<PageResult<DispatchableOrder>>('/order/dispatch/page', params)`(表单)
- `dispatchAssign(body: SpDispatchAssign)` → `http.post<void>('/order/dispatch/assign', body, JSON_HEADERS)`
- `dispatchByOrder(orderId)` → `http.get<DispatchDetail>('/order/dispatch/get-by-order/'+encodeURIComponent(orderId))`
- `dispatchTeams()` → `http.get<SpTeamOption[]>('/order/dispatch/teams')`
- `dispatchTeamUsers(teamId)` → `http.get<TeamUserOption[]>('/order/dispatch/team-users/'+encodeURIComponent(teamId))`

`api/technology/flow.ts` 增:`flowList()` → `http.get<SpFlow[]>('/basedata/flow/list')`

## 8. 类型(`types/order.ts`)
```ts
export interface SpOrder {
  id: string; orderCode: string; orderDescription?: string
  qty?: number; orderType?: string; flowId?: string
  materiel?: string; materielDesc?: string
  planStartTime?: string; planEndTime?: string; statue?: number
}
export interface DispatchableOrder {
  id: string; orderCode: string; orderDescription?: string
  qty?: number; orderType?: string; materiel?: string; materielDesc?: string
  planStartTime?: string; planEndTime?: string; statue?: number
  dispatchStatus?: number | null; workerName?: string | null; teamName?: string | null
}
export interface SpDispatchAssign {
  orderIds: string[]; teamId: string; userId: string
  laborHours: number; planStartTime?: string; planEndTime?: string; remark?: string
}
export interface SpTeamOption { id: string; code: string; name: string }
export interface TeamUserOption { id: string; name: string; username?: string }
```

## 9. 校验
- 订单:`orderCode` 必填;`qty` 整数 ≥1;`orderType` ∈ {P,A,F} 默认 P;`materiel` 必填。
- 派工:`teamId`/`userId` 必填;`laborHours` > 0;`orderIds.length ≥ 1`(由列表选择保证)。

## 10. 导航 / 权限
- **无需改 urlMap**:菜单「工单下达」(`/order/release/list-ui` → urlMap 已映射 `/order/production`)、「员工作业派工」(`/order/dispatch` 透传)已指向本周期路由。
- `router.tsx` 加 `order/production`(OrderList)、`order/dispatch`(DispatchList)。
- `routeMeta.ts` 加 `/order/production`(标题"生产订单")、`/order/dispatch`(标题"作业派工")。
- 权限:`order:add`(订单增删改)、`order:dispatch`(派工)——均已在菜单 permission 中,`collectPermissions` 会收集。

## 11. 验证
- 单测(vitest):`toDatetimeLocal`/`fromDatetimeLocal`(往返/空值/边界)。
- `pnpm --filter mes-new exec tsc --noEmit` / `lint`(0 error / ≤9 warnings,不得新增 set-state-in-effect)/ `build`。
- 后端:`mvn -q -DskipTests compile`。
- 人工(dev :4100,admin/123,后端 :9090):新建订单(选物料/工艺/时间)→ 保存成功 → 出现在派工列表(statue=0)→ 选中批量派工(班组→作业员)→ 派工后订单状态变已派工、从待派工列表消失;订单列表搜索/编辑/删除;明暗主题。

## 12. 关键决策
1. **修正订单后端**(用户确认):add-or-update 正确保存 SpOrder + 新建 statue=0;并按"后端必审"补 SpOrderReq、清理 delete、统一 statue 注释。
2. **物料从主数据下拉选**(用户确认):选物料带出 materiel+materielDesc。
3. **本周期不做甘特**(用户确认):后端甘特是 mock。
4. **派工 = 按订单批量派给班组+作业员**(后端既有语义)。
5. **mes1 仅功能参考,UI 全新设计**;新页面路由对齐已有菜单 url(免改 urlMap)。
