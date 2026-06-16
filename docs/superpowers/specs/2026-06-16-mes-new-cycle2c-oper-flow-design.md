# 工艺路线核心(工序 Oper + 工艺路线 Flow)设计规格

> 周期 2c · 第一个子周期。新前端 `mes/frontend/apps/mes-new`(React 19 + TS + Vite + shadcn `@workspace/ui` + react-hook-form + zod + `@ngify/http`/rxjs 数据层)。

**日期:** 2026-06-16
**分支:** `feat/frontend-rebuild`

---

## 1. 目标

在 `mes-new` 重建 MES 工艺技术线的**第一块**:

1. **工序 Oper**(基础数据)—— 完整 CRUD。
2. **工艺路线 Flow**(技术)—— 列表 + **工序编排**(把多个工序按顺序串成一条有序工艺路线)。

招牌交互:工艺路线的「工序编排」用**双栏穿梭 + 右栏有序流水线**(全部用 shadcn 重新设计)。

## 2. 范围

**做(In):**
- 工序 Oper:列表(服务端分页 + 描述搜索)、新增/编辑(FormDialog)、删除。
- 工艺路线 Flow:列表(服务端分页,工序链以 chips 呈现)、工序编排编辑器(宽弹窗)、删除。
- 新组件 `OrderedTransfer`(双栏穿梭 + 右栏可重排有序列表)。
- 后端**纯新增**一个只读接口(暴露已有 service 方法),供编辑态回填工序链。
- 路由 + 权限守卫。

**不做(Out,后续子周期):**
- 产品 BOM 树(`SpProductBom`)、BOM-Flow 绑定(`SpBomFlow`)、工艺文件(`SpProcessContent`)、BOM 主表/明细。
- Flow 列表服务端搜索(`SpFlowReq` 现无过滤字段;工艺路线通常很少,v1 不做,见 §11)。
- 引入拖拽库 `@dnd-kit`(用原生 HTML5 DnD + 上下移按钮,零新依赖)。

## 3. 约定 / 既有范式

- **mes1 不是 UI 参考**:旧版 `apps/mes1`(Ant Design)只用于确认业务/接口/字段语义,**绝不照抄其 UI**(如 Antd Transfer)。新 UI 从 mes-new 既有组件出发重新设计。
- **数据层**:`http`(`@/http/client`)单例;`http.post<T>(url, body, opts?)` / `http.get<T>(url)`;`useQuery$(key[], factory, {enabled?})`、`useMutation$((...args)=>Observable)→{mutate,loading,error}`(`@/http/hooks`);`invalidate(prefix)`(`@/http/queryCache`,对 `JSON.stringify(key)` 做 startsWith)。
- **表单编码拦截器**:POST 默认自动 form-encode,**除非**显式设 `Content-Type: application/json`(JSON 接口必须显式传 `{ headers: { 'Content-Type': 'application/json' } }`)。
- **既有 UI 组件**:`FormDialog`(增强弹窗,头部图标徽标 + 分区)、`FormField`(label/必填/helper/error)、`FormSection`、`DataTable`(服务端分页 + 行点击/选中)、`MasterDetailLayout`、`RelatedPanel`、`DualListTransfer`(穿梭弹窗,无序)、`utils/transfer.ts`(`TransferItem`、`filterTransferItems`、`excludeSelected`)。
- **响应**:后端 `Result{code,data,msg}`,`code===0` 成功;分页 `{current,size}→{records,total,size,current,pages}`。

## 4. 后端契约(已逐一核实)

### 4.1 工序 SpOper —— `SpOperController` @ `/basedata/sp-oper`

| 接口 | 方法 | 路径 | 入参形态 | 返回 |
| --- | --- | --- | --- | --- |
| 分页 | POST | `/basedata/sp-oper/page` | **表单** `SpOperReq`(`current`,`size`,`orderBy`,`operDescLike`) | `Result<IPage<SpOper>>` |
| 全量下拉 | GET | `/basedata/sp-oper/list` | 无 | `Result<List<SpOper>>`(按 `oper_code` 升序) |
| 新增/修改 | POST | `/basedata/sp-oper/add-or-update` | **表单**(无 @RequestBody),实体 `SpOper` | `Result<String>`(记录 id) |
| 删除 | POST | `/basedata/sp-oper/delete` | **JSON** `{id}` | `Result<Void>` |
| 加工单元下拉 | GET | `/basedata/sp-oper/process-units` | 无 | `Result<List<SpProcessUnit>>`(未删) |

后端行为:
- `add-or-update`:`id` 空 → 自动生成 `operCode = OPR-NNN`(3 位递增,首条 `OPR-001`),并把 `oper` 赋值=code;`generatePlan` 空则默认 `"1"`。
- 校验:`laborHours != null && manufacturingCycle != null && manufacturingCycle <= laborHours` → `Result.failure("制造周期必须大于工时")`。
- `page` 过滤:`operDescLike` 非空 → `like("oper_desc", ...)`;`orderByDesc("create_time")`。

**SpOper 字段**(表 `sp_oper`,extends BaseEntity):

| Java 字段 | DB 列 | 类型 | 含义 |
| --- | --- | --- | --- |
| id | id | String | 主键 |
| oper | oper | String | 工序(冗余=operCode) |
| operCode | oper_code | String | 工序编号 `OPR-NNN`(后端自动生成,前端不输入) |
| operDesc | oper_desc | String | 工序描述/名称(用户输入,搜索目标) |
| processUnitId | process_unit_id | String | 加工单元 id(关联 `sp_process_unit.id`) |
| laborHours | labor_hours | Integer | 工时(分钟) |
| manufacturingCycle | manufacturing_cycle | Integer | 制造周期(分钟,须 > 工时) |
| generatePlan | generate_plan | String(char1) | 是否生成生产计划 `"0"`/`"1"`(默认 `"1"`) |
| remark | remark | String | 备注 |

**SpProcessUnit(下拉)** 用到的字段:`id`、`code`(单元代码)、`name`(单元名称)。下拉显示 `{code} - {name}`,值 = `id`。

### 4.2 工艺路线 Flow —— 两个 Controller

**`SpFlowController` @ `/basedata/flow`**

| 接口 | 方法 | 路径 | 入参 | 返回 |
| --- | --- | --- | --- | --- |
| 分页 | POST | `/basedata/flow/page` | **表单** `SpFlowReq`(仅 `current`/`size`/`orderBy`,**无过滤字段**) | `Result<IPage<SpFlow>>` |
| 全量 | GET | `/basedata/flow/list` | 无 | `Result<List<SpFlow>>` |
| 按 id 查 | GET | `/basedata/flow/get-by-id` | Query `id` | `Result<SpFlow>`(只含 flow/flowDesc/process,**不含工序链**) |

**`SpFlowOperRelationController` @ `/basedata/flow/process`**

| 接口 | 方法 | 路径 | 入参 | 返回 |
| --- | --- | --- | --- | --- |
| 级联保存 | POST | `/basedata/flow/process/add-or-update` | **JSON** `SpFlowDto` | `Result` |
| 删除 | POST | `/basedata/flow/process/delete` | **表单** `SpFlowDto`(用 `id`) | `Result` |
| **(新增)取有序工序链** | GET | `/basedata/flow/process/opers/{flowId}` | PathVariable `flowId` | `Result<List<SpOperVo>>` |

**SpFlow 字段**(表 `sp_flow`):`id`、`flow`(流程代码)、`flowDesc`(流程描述)、`process`(工序链字符串,后端自动生成,**分隔符 `->` 无空格**,如 `下料->车削->铣削`)。

**SpFlowDto**(`extends SpFlow`,`@JsonIgnoreProperties(ignoreUnknown=true)`):额外字段 `spOperVoList: List<SpOperVo>`。

**SpOperVo**:`{ value: String /*operId*/, title: String /*显示标题=operDesc*/ }`。

**级联保存语义(后端全包,前端只给有序列表):**
- 入参 `spOperVoList` 必须 **≥ 2**,否则后端抛 `流程下必须存在至少两个工序`。
- `id` 非空 → 先删旧关系(`deleteOperRelationByFlowId`);`id` 空 → 先存 `SpFlow` 取 id。
- 遍历列表按**位置**自动算:`sortNum=i+1`;首(i=0)`perOper=""`+下道;末(i=末)上道+`nextOper=""`;中间前后都填;`operType` 由位置定(首/末/中间)。
- `process` = 各工序 `operDesc` 用 `->` 拼接,写回 `SpFlow.process`。
- **前端只需保证:`flow`、`flowDesc`、有序的 `spOperVoList`(≥2),每项 `{value:operId, title:operDesc}`。** `sortNum/前后道/首末道/process` 一律不传(后端推导)。

**删除语义:** 表单 `{id}` → `iSpFlowService.removeById(id)` + 按 `flow_id` 删关系。

### 4.3 后端唯一改动(纯新增,零新逻辑)

`ISpFlowOperRelationService.currentOperViewServer(flowId)` 已存在(`service/ISpFlowOperRelationService.java:43`)并由 impl 调用现成 Mapper `queryOperRelationByFlowId`(`SpFlowOperRelationMapper.xml`,`ORDER BY sort_num`,resultMap `value=oper_id, title=oper`)。

仅在 `SpFlowOperRelationController` 增加:

```java
@ApiOperation("查询流程下有序工序链")
@GetMapping("/opers/{flowId}")
@ResponseBody
public Result opers(@PathVariable String flowId) throws Exception {
    return Result.success(iSpFlowOperRelationService.currentOperViewServer(flowId));
}
```

不改 service / mapper / xml / 实体。验证:`mvn -q -DskipTests compile`。

## 5. 前端文件结构

| 文件 | 责任 | 动作 |
| --- | --- | --- |
| `src/types/technology.ts` | `SpOper`、`SpProcessUnitOption`、`SpFlow`、`SpOperVo`、`SpFlowDto` 类型 | 新建 |
| `src/api/basedata/oper.ts` | 工序 API(page/list/addOrUpdate/deleteById/processUnits) | 新建 |
| `src/api/technology/flow.ts` | 工艺路线 API(page/getById/saveProcess/deleteById/opersByFlowId) | 新建 |
| `src/utils/transfer.ts` | 复用 `excludeSelected`;新增纯函数 `moveItem` | 改 |
| `src/utils/__tests__/transfer.test.ts` | 为 `moveItem` 补单测 | 改 |
| `src/components/OrderedTransfer.tsx` | **双栏穿梭 + 右栏有序流水线**(招牌组件) | 新建 |
| `src/pages/basedata/oper/OperForm.tsx` | 工序新增/编辑表单 | 新建 |
| `src/pages/basedata/oper/OperList.tsx` | 工序列表 | 新建 |
| `src/pages/technology/flow/FlowProcessEditor.tsx` | 工艺路线编排宽弹窗 | 新建 |
| `src/pages/technology/flow/FlowList.tsx` | 工艺路线列表 | 新建 |
| `src/router.tsx` | 注册 `basedata/oper`、`technology/flow` 两路由 | 改 |
| `mes/src/.../SpFlowOperRelationController.java` | 加 `/opers/{flowId}` GET | 改 |

(前端路径相对 `mes/frontend/apps/mes-new/`。)

## 6. 组件设计

### 6.1 工序 Oper

**OperList.tsx**(参照 `ProcessUnitList`/`ComponentList` 范式):
- `useQuery$(['oper','page',{current,size,operDescLike}], () => operApi.page(...))`。
- DataTable 服务端分页;列:`operCode`(无值 `-`)、`operDesc`、`laborHours`、`manufacturingCycle`、`generatePlan`(Badge:`1`→"是"主色 / `0`→"否"灰)、`remark`(截断)、操作(编辑 + 删除带确认)。
- 顶部:标题 + 搜索框(工序描述 → `operDescLike`,回车/按钮触发) + `<PermissionGuard perm="oper:add">` 包"新增"。
- 删除:`useMutation$` → `operApi.deleteById({id})` → `invalidate('["oper"')` + toast。

**OperForm.tsx**(`FormDialog` + `FormField`,图标 `Cog`,description「维护工序基础数据」):
- zod schema:
  - `operDesc` `z.string().min(1,'请输入工序描述')`
  - `processUnitId` `z.string().optional()`
  - `laborHours` `z.coerce.number({invalid_type_error:'请输入工时'}).int().min(1,'工时至少 1 分钟')`
  - `manufacturingCycle` `z.coerce.number().int().min(1,'制造周期至少 1 分钟')`
  - `generatePlan` `z.enum(['0','1']).default('1')`
  - `remark` `z.string().optional()`
  - `.refine(d => d.manufacturingCycle > d.laborHours, { message:'制造周期必须大于工时', path:['manufacturingCycle'] })`
- 字段:工序描述(必填 Input)、加工单元(Controller + Select,选项 `code - name`,可清空)、工时(number ≥1)、制造周期(number ≥1)、是否生成计划(Controller + Switch,bool↔`'1'/'0'`,默认是)、备注(Textarea)。
- 提交:`operApi.addOrUpdate({ id: record?.id, ...values })`(表单编码),成功 `invalidate` + toast + 关闭。

### 6.2 OrderedTransfer(招牌组件)

```ts
interface OrderedItem { id: string; primary: string; secondary?: string }
interface OrderedTransferProps {
  candidates: OrderedItem[]          // 全量工序池
  value: OrderedItem[]               // 已选有序列表(受控)
  onChange: (next: OrderedItem[]) => void
  leftTitle?: string                 // 默认「可选工序」
  rightTitle?: string                // 默认「工序流水线」
  firstLabel?: string                // 默认「首道」
  lastLabel?: string                 // 默认「末道」
  className?: string
}
```

布局:`grid lg:grid-cols-2 gap-4`,两张卡(沿用 `DualListTransfer` 视觉:卡头图标 + 标题 + 计数 Badge + 搜索框)。

- **左卡「可选工序」**:`excludeSelected(candidates, value.map(v=>v.id))` 后再 `filterTransferItems` 搜索;每行显示 `primary`(+ `secondary` 次要灰字);点行或行尾 `→` 按钮 → 追加到 `value` 末尾。空态提示。
- **右卡「工序流水线」**:渲染 `value`(有序)。每行:序号徽标 `①②③…`、`primary`(+ secondary)、**位置徽标**(idx===0 且 len≥2 → `首道` 主色 Badge;idx===len-1 且 len≥2 → `末道` 次色 Badge)、上移/下移按钮(`ChevronUp/Down`,首/末禁用对应方向)、`✕` 移除、`⋮`(`GripVertical`)拖拽手柄。
  - **重排**:① 上下移按钮(核心,a11y) ② 原生 HTML5 DnD(行 `draggable`,`onDragStart` 记 fromIndex,`onDragOver` preventDefault,`onDrop` 调 `moveItem`)。
  - 行间显示细 `↓`/连接线强化"链"感;`motion-reduce` 友好。
- **底部预览**:`value` 的 `primary` 用 `→` 连成 chips(`下料 → 车削 → 铣削`);为空提示「请从左侧添加工序(至少 2 个)」。

纯逻辑(进 `utils/transfer.ts`,单测覆盖):
- 复用 `excludeSelected(all, ids)`。
- 新增 `moveItem<T>(list: T[], from: number, to: number): T[]`(返回新数组;越界/同位返回原序的副本)。

### 6.3 工艺路线 Flow

**FlowList.tsx**:
- `useQuery$(['flow','page',{current,size}], () => flowApi.page(...))`,DataTable 服务端分页。
- 列:`flow`(流程代码)、`flowDesc`(描述)、**`process` → chips**(按 `->` split,空显示 `-`;chips 间插 `→` 分隔)、操作(编辑 + 删除带确认)。
- 顶部:标题 + `<PermissionGuard perm="flow:add">` 包"新增工艺路线"。
- 新增/编辑 → 打开 `FlowProcessEditor`。

**FlowProcessEditor.tsx**(宽弹窗 `FormDialog`,`contentClassName="sm:max-w-3xl"`,图标 `Workflow`/`Route`,description「编排工序生成工艺路线」):
- 顶部 `FormSection「基本信息」`:`FormField` 流程代码(必填 Input)、流程描述(必填 Input),两列网格。
- 主体 `FormSection「工序编排」`:`OrderedTransfer`,`candidates` 来自 `operApi.list()`(映射 `{id, primary:operDesc, secondary:operCode}`),`value` 为受控本地 state。
- **数据流**:
  - 新增:`value=[]`,流程字段空。
  - 编辑:并行取 `flowApi.getById(id)`(回填 flow/flowDesc)+ `flowApi.opersByFlowId(id)`(返回 `SpOperVo[]` → 映射成 `OrderedItem`:`id=value`,`primary=title`;再用 `candidates` 按 id 补 `secondary=operCode`,缺失则只用 title)。`enabled: open && isEdit`。
- 提交:`flow`/`flowDesc` 必填 + `value.length >= 2`(否则 toast `工艺路线至少需要 2 个工序`,不提交);组装 `flowApi.saveProcess({ id: record?.id, flow, flowDesc, spOperVoList: value.map(v=>({value:v.id, title:v.primary})) })`(**JSON**);成功 `invalidate('["flow"')` + toast + 关闭。
- 删除(列表内):`flowApi.deleteById({id})`(表单)。

## 7. API 层

`api/basedata/oper.ts`:
- `page(params: {current; size; operDescLike?})` → `http.post<PageResult<SpOper>>('/basedata/sp-oper/page', params)`
- `list()` → `http.get<SpOper[]>('/basedata/sp-oper/list')`
- `addOrUpdate(body)` → `http.post<string>('/basedata/sp-oper/add-or-update', body)`(表单)
- `deleteById(body:{id})` → `http.post<void>('/basedata/sp-oper/delete', body, JSON_HEADERS)`
- `processUnits()` → `http.get<SpProcessUnitOption[]>('/basedata/sp-oper/process-units')`

`api/technology/flow.ts`:
- `page(params:{current;size})` → `http.post<PageResult<SpFlow>>('/basedata/flow/page', params)`
- `getById(id)` → `http.get<SpFlow>('/basedata/flow/get-by-id?id='+encodeURIComponent(id))`
- `saveProcess(body: SpFlowDtoReq)` → `http.post<unknown>('/basedata/flow/process/add-or-update', body, JSON_HEADERS)`
- `deleteById(body:{id})` → `http.post<unknown>('/basedata/flow/process/delete', body)`(表单)
- `opersByFlowId(flowId)` → `http.get<SpOperVo[]>('/basedata/flow/process/opers/'+encodeURIComponent(flowId))`

`JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }`(同既有模块约定)。

## 8. 类型(`types/technology.ts`)

```ts
export interface SpOper {
  id: string; oper?: string; operCode?: string; operDesc: string
  processUnitId?: string; laborHours?: number; manufacturingCycle?: number
  generatePlan?: string; remark?: string
}
export interface SpProcessUnitOption { id: string; code: string; name: string }
export interface SpFlow { id: string; flow: string; flowDesc?: string; process?: string }
export interface SpOperVo { value: string; title: string }
export interface SpFlowDtoReq { id?: string; flow: string; flowDesc?: string; spOperVoList: SpOperVo[] }
```

## 9. 校验汇总

- **Oper**:`operDesc` 必填;`laborHours`/`manufacturingCycle` 整数 ≥1;`manufacturingCycle > laborHours`(zod refine,后端二次兜底);`generatePlan` 默认 `'1'`。
- **Flow**:`flow`、`flowDesc` 必填;工序 `≥2`(前端 toast 拦截 + 后端硬性兜底)。

## 10. 导航 / 权限

- `router.tsx` 新增受 `PrivateRoute` 保护的两路由:`basedata/oper`(OperList)、`technology/flow`(FlowList)。
- 权限串:`oper:add`(工序新增/编辑/删除按钮)、`flow:add`(工艺路线新增/编辑/删除按钮),用 `<PermissionGuard>` 包裹。
- **侧边栏菜单**(DB 菜单树驱动):可用**已重建的「系统管理 > 菜单管理」页面**手动添加「工序」(`basedata/oper`)、「工艺路线」(`technology/flow`)两个菜单项及权限;不加也能通过 URL 直达,功能不受影响。(不在本周期写死 SQL。)

## 11. 验证策略

- **单测**(vitest,`environment:'node'`,仅纯逻辑):`moveItem` 的重排/越界/同位 + 复用 `excludeSelected`。
- **类型**:`pnpm --filter mes-new exec tsc --noEmit`。
- **Lint**:`pnpm --filter mes-new lint`(基线 0 error)。
- **构建**:`pnpm --filter mes-new build`。
- **后端**:`cd mes && mvn -q -DskipTests compile`(新 Controller 方法编译)。
- **人工核对**(dev :4100,账号 admin/123,后端 :9090):工序增删改查 + 周期/工时校验提示;工艺路线新增(穿梭加工序、上下移/拖拽重排、首末道徽标、≥2 校验、保存)、编辑(回填工序链)、列表 chips、删除;明/暗主题。

## 12. 关键决策与取舍

1. **编排交互 = 双栏穿梭 + 右栏有序流水线**(用户选定)。后端是线性链(单前/后道 + sortNum),无需节点图;有序列表最贴合。
2. **编辑读取 = 新增只读后端接口**(用户选定)。复用已存在的 service/mapper,Controller 仅加一个 GET,robust 且零新逻辑;**避免 mes1 那种按 `process` 字符串反查的脆弱方案**(且 mes1 用 `→` split 而后端实际是 `->`,本就不一致)。
3. **零新前端依赖**:重排用原生 HTML5 DnD + 上下移按钮,不引入 `@dnd-kit`。
4. **Flow 列表 v1 不做服务端搜索**:`SpFlowReq` 无过滤字段且工艺路线少,避免额外动后端;需要时再补 `flowLike`。
5. **mes1 仅功能参考,不抄 UI**:全部用 `@workspace/ui` 重新设计。
