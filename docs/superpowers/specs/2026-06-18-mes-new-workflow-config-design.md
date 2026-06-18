# 流程配置工具（流程管理模块）前端设计 — mes-new

- 日期：2026-06-18
- 分支：`feat/workflow-config`
- 周期定位：流程管理模块「配置/建模」线第一周期（前端 only）

## 1. 背景与目标

PPT 要求：在车间接受订单前，MES 必须先完成「流程配置」，建立流程模型（确认生产流程"谁提出、谁审批"）。以"生产订单审批流程"为例，演示两件事：

1. **流程分类管理**：新增分类 名称"生产流程"、编码"prod"；检查流程定义完成情况。
2. **流程模型设计**：创建模型 名称"生产订单审批流程"、模型 key "orderRecord"；用设计器添加 2 个用户任务节点 + 1 个结束事件并依次相连——
   - 节点 1「计划员发起」：办理人 = 流程发起人；
   - 节点 2「生产主管审批」：办理人 = 按候选组选择"生产主管"角色；
   - 保存后**发布**该模型到"生产流程"分类下。

### 现状调查结论

- **后端无工作流引擎**（无 Flowable/Activiti/Camunda）。SQL 预置了 4 张轻量级流程表（`sp_workflow_definition`/`instance`/`task`/`event_log`），但**无任何 Java 代码**，且**无处存放流程模型图/BPMN 定义**。
- `technology.SpFlow`（工艺路线 A→B→C）是产线工序，**不是工作流**，勿混淆。
- 前端 `apps/mes-new`：shadcn/Radix + RHF+zod + 自研 `useQuery$/useMutation$`（`@ngify/http`），CRUD 样板成熟（TeamPage/ComponentList）。**无任何 BPMN/画布库**。
- 侧边栏由后端 `sp_sys_menu` 驱动，新页面 url 必须匹配菜单。

## 2. 范围（本周期边界）

- **仅前端**（`apps/mes-new`）。后端 Java（4 张表的 Entity/Service/Controller + 真实发布/运行时）放到**下周期**。
- **数据走 localStorage mock 层**，接口签名按下周期真后端契约设计，下周期把 mock 换成真 `http` 调用即可。
- **只做配置**：① 流程分类 CRUD ② 流程模型设计（列表 + bpmn-js 设计器 + 校验 + 发布到分类）。**不做运行时**（启动实例/任务签收/审批驳回）——下周期与真后端一起做。
- 设计器采用 **bpmn-js（bpmn.io）工业级画布**。
- 候选组的角色下拉用**已存在**的系统角色接口（system 后端已在，非本次延后的 workflow 后端）。

非目标（YAGNI，本周期不做）：运行时审批、流程实例、任务列表、事件日志页、流程版本对比、官方 properties-panel。

## 3. 导航 / 菜单接入

侧边栏菜单驱动，需 `sp_sys_menu` 有对应项。沿用历史每周期做法（如 `team-management.sql` 菜单 107），提供 SQL 菜单种子 `scripts/sql/workflow-flow-config.sql`，三级结构贴合 PPT：

```
流程配置工具 (目录, type=0)
 └─ 流程管控 (目录, type=0)
     ├─ 流程分类管理 (菜单, type=1) url=/workflow/category/list-ui → 路由 /workflow/category
     └─ 流程模型设计 (菜单, type=1) url=/workflow/model/list-ui    → 路由 /workflow/model
```

- 菜单 id 取未占用号段（避免与现有冲突，计划阶段确认具体取值）；带 `permission`（如 `workflow:category:list`、`workflow:model:list`）。
- 前端三处注册：
  - `utils/urlMap.ts`：`/workflow/category/list-ui → /workflow/category`、`/workflow/model/list-ui → /workflow/model`
  - `router.tsx`：`workflow/category`、`workflow/model` 两条路由
  - `layouts/routeMeta.ts`：两条标题/图标元信息
- 前提：**需在 DB 执行该脚本**才能在侧边栏看到（与历史一贯前提一致）。

## 4. 数据层（localStorage Mock，可拔插）

`api/workflow/mockStore.ts`：localStorage 持久化 + 封装成返回 **RxJS Observable** 的函数（模仿真 `http` 的解包后形态），让页面用 `useQuery$/useMutation$` 的写法与真实页面**完全一致**。下周期只需把 `api/workflow/{category,model}.ts` 内部从 mockStore 换成 `http.post(...)`，页面零改动。

- 用一个小 helper（如 `mockOk<T>(data): Observable<T>`，基于 rxjs `of` + 轻微 `delay` 模拟异步）统一返回。
- 分页在 mock 内做内存切片，返回 `{ records, total, size, current, pages }`（对齐 MyBatis-Plus IPage）。
- 首次访问注入空数组（不预置脏数据；演示时由用户按 PPT 现场新增）。

### 接口（按计划后端契约）

`api/workflow/category.ts`：
- `categoryPage(params): Observable<PageResult<WorkflowCategory>>` — 计划真端点 `POST /workflow/category/page`（form 编码）
- `categoryAddOrUpdate(record): Observable<string>` — 计划 `POST /workflow/category/add-or-update`（form 编码）
- `categoryDelete(id): Observable<void>` — 计划 `POST /workflow/category/delete`（JSON_HEADERS）
- `categoryList(): Observable<WorkflowCategory[]>` — 发布弹窗用，计划 `POST /workflow/category/list`

`api/workflow/model.ts`：
- `modelPage(params): Observable<PageResult<WorkflowModel>>` — 计划 `POST /workflow/model/page`
- `modelGet(id): Observable<WorkflowModel>` — 计划 `GET /workflow/model/{id}`（取 bpmnXml）
- `modelSave(dto): Observable<string>` — 新建/保存设计（含 bpmnXml），计划 `POST /workflow/model/save`（JSON_HEADERS，XML 体大）
- `modelDelete(id): Observable<void>` — 计划 `POST /workflow/model/delete`（JSON_HEADERS）
- `modelPublish({id, categoryCode, categoryName}): Observable<void>` — 计划 `POST /workflow/model/publish`（JSON_HEADERS）

### 类型 `types/workflow.ts`

```ts
export interface WorkflowCategory {
  id: string
  code: string
  name: string
  descr?: string
  createTime?: string
}

export type WorkflowModelStatus = 'DRAFT' | 'PUBLISHED'

export interface WorkflowModel {
  id: string
  modelKey: string
  name: string
  categoryCode?: string
  categoryName?: string
  bpmnXml: string
  status: WorkflowModelStatus
  version: number
  createTime?: string
  updateTime?: string
}
```

## 5. 页面一：流程分类管理 `/workflow/category`

标准 CRUD（镜像 TeamPage/ComponentList 形态，UI 不抄 mes1）：

- `CategoryList.tsx`：`PageContainer` + `SearchForm`（按编码/名称）+ `DataTable`（服务端分页）+ 新建/编辑/删除；删除走 `AlertDialog` 二次确认；成功后 `invalidate('["workflow","category"')` + `toast`。
- `CategoryForm.tsx`：`FormDialog` + RHF + zod。字段：分类编码 `code`（必填，如 prod）、分类名称 `name`（必填，如 生产流程）、备注 `descr`（可选）。

> 对应 PPT 步骤三"检查流程定义完成情况"：分类列表即为"流程定义"概览；模型设计页的校验动作（见 §6）补足"完成情况检查"。

## 6. 页面二：流程模型设计 `/workflow/model`

### 6.1 模型列表 `ModelList.tsx`

`PageContainer` + `DataTable`：列 = 名称 / 模型key / 所属分类 / 状态（DRAFT·PUBLISHED 用 Badge）/ 更新时间。操作：**新建** / **设计** / **删除** / **发布**。

### 6.2 新建模型 `ModelCreateDialog.tsx`

`FormDialog` + RHF + zod：名称（生产订单审批流程）+ 模型key（orderRecord，校验 `^[a-zA-Z][a-zA-Z0-9_]*$`）。提交后 `modelSave` 一个含初始 BPMN（仅一个开始事件）的 DRAFT 模型，随即打开设计器。

### 6.3 设计器 `ModelDesignerDialog.tsx`（全屏 Dialog）

布局：顶部工具条（模型名 + 保存 / 校验 / 关闭）+ 左主区 bpmn 画布 + 右属性面板。

- **`BpmnDesigner.tsx`**：bpmn-js `Modeler` 的 React 包装。
  - 挂载时 `new Modeler({ container, moddleExtensions: { flowable } })`，`importXML(xml)`。
  - 通过 `ref`/回调暴露 `getXML()`；监听 `selection.changed` / `element.changed` 回调驱动属性面板。
  - 引入 CSS：`bpmn-js/dist/assets/diagram-js.css`、`bpmn-js/dist/assets/bpmn-font/css/bpmn.css`。
  - 卸载时 `modeler.destroy()`（注意 StrictMode 已全局关闭，见 [[r3f-strictmode-context-lost]]，但仍正确清理）。
- **`PropertiesPanel.tsx`**：自研右侧面板（shadcn 表单，普通 `useState` 受控，规避 [[rhf-field-name-dom-clobbering]]）。选中"用户任务（UserTask）"时配置：
  - 节点名称（写回 `businessObject.name`，经 `modeling.updateProperties`）。
  - 办理人类型：单选 **流程发起人** / **候选组**。
    - 流程发起人 → 写 `flowable:assignee = "${initiator}"`，清空 candidateGroups。
    - 候选组 → 角色下拉（值=角色 code，来自系统角色接口）→ 写 `flowable:candidateGroups = "<code>"`，清空 assignee。
  - 选中其它类型（开始/结束/连线）时面板提示"该节点无需配置办理人"。
- **`flowableModdle.ts`**：最小 Flowable moddle 扩展描述符（JSON），在 `UserTask` 上声明 `flowable:assignee` / `flowable:candidateGroups` 属性，使导出 XML 真带 `flowable:` 命名空间属性，下周期真 Flowable 后端可直接消费。
- **角色数据源**：复用现有系统角色列表接口（`api/system/role`，后端已存在）。候选组演示选"生产主管"角色。

### 6.4 保存 / 校验 / 发布

- **保存**：`getXML()` → `modelSave({...model, bpmnXml})`，状态保持 DRAFT，`toast` 成功。
- **校验**（PPT"检查流程定义完成情况"）：`bpmnUtils.validateModel(xml)` **纯函数**，检查：① 含开始事件；② 含结束事件；③ 每个 UserTask 配了 assignee 或 candidateGroups；④ 节点全部连通（无孤立节点）。返回 `{ ok, issues: string[] }`，UI 列出问题或提示"校验通过"。**纯函数 TDD**。
- **发布** `PublishDialog.tsx`：先 `categoryList()` 取分类下拉 → 选"生产流程" → `modelPublish` 置 PUBLISHED + 回填 categoryCode/Name。发布前先跑一次校验，不通过则拦截并提示。

### 6.5 `bpmnUtils.ts`（纯函数，TDD）

- `initialBpmnXml(modelKey, name): string` — 生成只含一个开始事件的最小 BPMN 2.0 XML（process id = modelKey、name）。
- `validateModel(xml): { ok: boolean; issues: string[] }` — 见上（用 DOMParser 解析 XML 元素做结构校验，node 环境 vitest 需 happy-dom/jsdom 或改用正则/字符串解析；计划阶段确认——倾向解析 XML 节点，必要时 vitest 配 jsdom）。

## 7. 新增依赖

- `bpmn-js`（Modeler + CSS/字体资源）。
- 属性面板自研，**不引** `bpmn-js-properties-panel`/`@bpmn-io/properties-panel`（笨重且默认无 Flowable 适配）。
- 若 `validateModel` 需在 vitest 解析 XML：评估加 `jsdom`/`happy-dom` 到测试环境（计划阶段定）。

## 8. 文件结构

```
mes/frontend/apps/mes-new/src/
├── api/workflow/
│   ├── mockStore.ts          # localStorage + Observable 封装 + 分页切片
│   ├── category.ts           # 分类 5 接口（mock 实现，签名对齐真后端）
│   └── model.ts              # 模型 6 接口
├── types/workflow.ts
├── pages/workflow/
│   ├── category/
│   │   ├── CategoryList.tsx
│   │   └── CategoryForm.tsx
│   └── model/
│       ├── ModelList.tsx
│       ├── ModelCreateDialog.tsx
│       ├── ModelDesignerDialog.tsx
│       ├── BpmnDesigner.tsx
│       ├── PropertiesPanel.tsx
│       ├── PublishDialog.tsx
│       ├── bpmnUtils.ts          # 纯函数 TDD
│       ├── flowableModdle.ts     # Flowable moddle 扩展描述符
│       └── __tests__/bpmnUtils.test.ts
└── (注册) utils/urlMap.ts · router.tsx · layouts/routeMeta.ts

scripts/sql/workflow-flow-config.sql   # 菜单种子（三级）
```

## 9. 验证

- `pnpm --filter mes-new exec tsc --noEmit`（0 err）
- `pnpm lint`（workflow 目录 0 告警）
- `pnpm test`（bpmnUtils/validateModel 纯函数单测全绿）
- `pnpm build`（设计器懒加载独立 chunk，bpmn-js 不进主包）
- 前端 `:4100` 冒烟：两页 HTTP 200；分类 CRUD 往返 localStorage；模型设计器能拖"用户任务/结束事件"、连线、配办理人、保存/校验/发布往返；刷新后数据仍在。

## 10. 风险与权衡

- **bpmn-js 体积**：用 lazy import 设计器，主包不受影响。
- **Flowable moddle**：手写最小描述符即可覆盖 assignee/candidateGroups；如属性写回出问题，回退到把办理人配置存进 `bpmn:documentation`（保底，但 XML 不标准）。
- **mock 返工面**：仅 `api/workflow/*.ts` 内部实现，页面/类型零返工；下周期换真后端面很小。
- **菜单种子依赖 DB 执行**：与历史一致，spec 已显式标注前提。
- **校验在 vitest 解析 XML**：若 node 环境无 DOMParser，计划阶段决定加 jsdom 或改纯字符串解析。

## 11. 下周期衔接（非本周期工作，仅备忘）

后端补 4 张表的 Entity/Mapper/Service/Controller；`category`/`model` 真端点；发布落库 + bpmn_xml 存储（需给 `sp_workflow_definition` 加 `bpmn_xml`/`status` 列或新建模型表 + 新建 `sp_workflow_category` 表）；运行时（实例/任务/审批）。前端把 `api/workflow/*.ts` 从 mock 切真调用。详见 [[mes-rebuild-roadmap]]、[[backend-deepseek-review-each-cycle]]。
