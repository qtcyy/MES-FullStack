# 流程表单 + 流程定义管理 + 流程事件配置 — 设计文档

- 日期：2026-06-19
- 范围：`mes/frontend/apps/mes-new`（当前活跃前端），workflow 模块
- 深度：**前端 mock**（跟随现有 category/model 模式，localStorage 走 `mockStore`），脚本只存不执行，业务状态同步仅声明配置、不真正运行
- 不涉及：后端 Java（仅提供菜单 seed SQL）、Monaco、脚本执行引擎、真实审批运行时/任务/实例

## 1. 背景与目标

PPT 要求：在「流程定义管理」中，为已发布的生产订单审批流程**关联流程表单**并**设置流程事件**，使审批过程中及结束后同步业务数据（生产订单审批状态）。完成流程模型设计后要为该流程建立「流程表单」，过程中使用脚本语言（语法简单、便于动态调整）。

现状（探索确认）：
- workflow 前端为**纯 mock**（`mockStore` localStorage），已有「流程分类管理」`/workflow/category`、「流程模型设计」`/workflow/model`（含 BPMN 设计器、发布弹窗）。
- 无「流程定义管理 / 流程表单 / 流程事件」页面与类型。
- 后端无 Flowable 引擎、无脚本引擎、无 workflow Java 代码；DB 有 `sp_workflow_definition/instance/task/event_log` 表（无 `sp_workflow_form`），`sp_order.audit_status` 列存在但未进 Java 实体。本周期不动后端。

目标：以 mock 方式补齐 PPT 描述的三块 UI——流程表单管理、流程定义管理、流程事件配置，形成「分类 → 模型 → 定义管理（关联表单+事件）」的闭环演示。

## 2. 架构与页面结构（方案 A）

- **流程表单管理** `/workflow/form`：独立资源页。列表 + 「新增流程表单」向导。
- **流程定义管理** `/workflow/definition`：枢纽页。数据来源 = 已发布模型（status=PUBLISHED）派生为「流程定义」。行内操作：启用/停用、关联流程表单、设置流程事件。
- **流程事件配置**：从流程定义行内弹窗进入（无独立路由）。

数据来源决策：
- 流程定义 **不单独建实体**，由已发布模型派生（`id=modelId`、`processKey=modelKey`、分类、版本）。定义的附加状态（enabled、formKey、事件规则）存 mock，以 `definitionId(=modelId)` 为键。
- 业务状态同步对象：生产订单 `sp_order.audit_status`，取值 `DRAFT/APPROVING/APPROVED/REJECTED`。事件配置仅声明「触发时机 → 设置状态/脚本」，mock 下不执行。

## 3. 流程表单管理 `/workflow/form`

### 3.1 列表页（沿用 DataTable + SearchForm 模式）
- 列：表单名称 / 表单key / 表单类型 / 跳过相同处理人(是/否) / 创建时间 / 操作（编辑、删除）。
- 顶部「新增流程表单」按钮 → 打开向导弹窗。
- 搜索：按 表单名称、表单key 过滤。
- 删除：`AlertDialog` 确认后调用 `formDelete`。

### 3.2 新增/编辑向导（单 `FormDialog` + 3 个 `FormSection`，react-hook-form + zod）

对应 PPT 步骤二~四：

**基本信息**
- 表单名称（必填，文本）—— 示例「生产订单审批流程」
- 表单key（必填，正则 `^[a-zA-Z][a-zA-Z0-9_]*$`，列表内唯一）—— 示例「orderRecord」
- 表单类型（Select，选项仅 `URL表单`，value=`URL`）

**地址脚本**（表单类型=URL表单 时显示）
- 流程标题生成脚本（`ScriptEditor`，必填）
- PC表单地址脚本（`ScriptEditor`，必填）
- 手机表单地址脚本（`ScriptEditor`，必填）

**表单选项**
- `跳过相同处理人` 开关（`Switch`，默认勾选 true；PPT 演示时取消勾选）

### 3.3 ScriptEditor 组件（新增）
- 轻量：等宽字体 `Textarea`（`font-mono`，min 高度若干行）+ 占位模板 + 下方变量提示。
- 可用变量提示（静态文案）：`${orderCode}` 订单号、`${businessId}` 业务主键、`${businessType}` 业务类型、`${initiator}` 发起人、`${processName}` 流程名。
- 不做语法高亮/不引 Monaco（YAGNI，mock 不执行）。
- 默认脚本模板常量（供新建表单时预填，便于演示）：
  - 标题：`"生产订单审批 - " + orderCode`
  - PC 地址：`"/order/detail?id=" + businessId`
  - 手机地址：`"/mobile/order/detail?id=" + businessId`

### 3.4 校验（zod schema + 共享常量）
- 名称非空、key 非空且匹配正则、（URL表单）三个脚本均非空 —— 由 `zod` schema 完成（沿用 app 的 `zodResolver` 模式），UX 即时报错。
- key 规则抽为纯常量 `FORM_KEY_REGEX`（zod 复用 + vitest 测试，保证 DRY，避免与 zod 重复实现 `validateForm`）。
- key 唯一性在提交时于 mock 列表校验（编辑时排除自身）。

## 4. 流程定义管理 `/workflow/definition`

### 4.1 列表页
- 数据来源：`modelPage` 取 `status=PUBLISHED` 的模型，叠加 mock 中该定义的附加状态（enabled 默认 true、formKey）。
- 列：流程名称 / processKey / 分类 / 版本 / 状态（启用·停用 Badge）/ 关联表单（formKey 或「未关联」）/ 操作。
- 行操作：
  1. **启用/停用**：toggle，写 mock `definitionState[definitionId].enabled`。
  2. **关联流程表单**：弹窗，下拉选择流程表单（按 表单名称 + key 展示，来自 `formList`），保存写 `definitionState[definitionId].formKey`。支持「清除关联」。
  3. **设置流程事件**：弹窗（见 §5）。

### 4.2 说明
- 若无已发布模型，列表为空并提示「请先在流程模型设计中发布模型」。
- 定义的「关联表单/事件/启用」均为 mock 附加层，不修改模型本体。

## 5. 流程事件配置（流程定义行内弹窗）

- 每个定义挂一组**事件规则**（`WorkflowEventRule[]`，按 definitionId 存 mock）。弹窗内小表格 + 增/改/删。
- 单条规则字段：
  - 名称（可选，文本）
  - 触发时机（Select）：`START` 流程启动 / `TASK_COMPLETE` 任务完成 / `END` 流程结束(通过) / `REJECT` 流程驳回
  - 业务类型（固定显示「生产订单审批」，value=`ORDER_APPROVAL`）
  - 同步动作（Select）：`SET_AUDIT_STATUS` 设置审批状态 / `SCRIPT` 执行脚本
    - 选 `SET_AUDIT_STATUS` → 目标状态 Select：`DRAFT/APPROVING/APPROVED/REJECTED`
    - 选 `SCRIPT` → `ScriptEditor`
  - 启用（Switch，默认 true）
- **预置示例**（纯函数 `defaultEventRules(definitionId)`，首次打开某定义事件配置且无规则时供「一键填入示例」或空态展示）：
  1. 流程启动 → 设置审批状态 = `APPROVING`
  2. 流程结束(通过) → 设置审批状态 = `APPROVED`
  3. 流程驳回 → 设置审批状态 = `REJECTED`
  - 演示 PPT「审批过程中(APPROVING) + 结束后(APPROVED/REJECTED)同步状态」。

## 6. 类型（`src/types/workflow.ts` 新增）

```ts
export type WorkflowFormType = 'URL'

export interface WorkflowForm {
  id: string
  name: string
  formKey: string
  formType: WorkflowFormType
  titleScript: string
  pcUrlScript: string
  mobileUrlScript: string
  skipSameAssignee: boolean
  createTime?: string
}

/** 流程定义 = 已发布模型派生 + mock 附加状态 */
export interface WorkflowDefinition {
  id: string            // = modelId
  processKey: string    // = modelKey
  processName: string
  categoryCode?: string
  categoryName?: string
  version: number
  enabled: boolean
  formKey?: string
  createTime?: string
}

export type WorkflowEventTrigger = 'START' | 'TASK_COMPLETE' | 'END' | 'REJECT'
export type WorkflowEventActionType = 'SET_AUDIT_STATUS' | 'SCRIPT'
export type OrderAuditStatus = 'DRAFT' | 'APPROVING' | 'APPROVED' | 'REJECTED'

export interface WorkflowEventRule {
  id: string
  definitionId: string
  name?: string
  trigger: WorkflowEventTrigger
  businessType: string          // 'ORDER_APPROVAL'
  actionType: WorkflowEventActionType
  targetStatus?: OrderAuditStatus
  script?: string
  enabled: boolean
  createTime?: string
}
```

## 7. API（mock，`src/api/workflow/`，走 `mockStore`）

与 category/model 一致：返回 `Observable`，端点路径按真后端约定写注释（`下周期真后端`）。

- `form.ts`：`formPage(params)`、`formList()`、`formAddOrUpdate(record)`、`formDelete(id)`。
- `definition.ts`：`definitionPage(params)`（取已发布模型 + 叠加 mock 状态）、`definitionSetEnabled(id, enabled)`、`definitionSetForm(id, formKey | null)`。
- `event.ts`：`eventList(definitionId)`、`eventSave(rule)`、`eventDelete(id)`。
- mock 存储键：`workflow_form`、`workflow_definition_state`（按 id 存 {enabled, formKey}）、`workflow_event_rule`。

## 8. 路由 / 菜单

- 路由（`src/router.tsx`）新增：`{ path: 'workflow/form', element: <FormList/> }`、`{ path: 'workflow/definition', element: <DefinitionList/> }`。
- 菜单 seed SQL（新增 `scripts/sql/workflow-form-event-config.sql`，沿用 `workflow-flow-config.sql` 套路）：在「流程配置」父菜单下新增两项 —— 「流程表单管理」(url=`workflow/form`)、「流程定义管理」(url=`workflow/definition`)。侧边栏由 `sp_sys_menu` 驱动且不按角色过滤，路由须匹配菜单 url，否则点不到。

## 9. 文件清单

| 文件 | 动作 |
|---|---|
| `src/types/workflow.ts` | 改（新增 4 类型） |
| `src/api/workflow/form.ts` | 新增 |
| `src/api/workflow/definition.ts` | 新增 |
| `src/api/workflow/event.ts` | 新增 |
| `src/pages/workflow/form/FormList.tsx` | 新增 |
| `src/pages/workflow/form/FormWizardDialog.tsx` | 新增（新增/编辑向导） |
| `src/pages/workflow/definition/DefinitionList.tsx` | 新增 |
| `src/pages/workflow/definition/AssociateFormDialog.tsx` | 新增（关联表单） |
| `src/pages/workflow/definition/EventConfigDialog.tsx` | 新增（事件配置） |
| `src/components/ScriptEditor.tsx` | 新增（等宽 Textarea + 变量提示） |
| `src/pages/workflow/formUtils.ts` | 新增（`FORM_KEY_REGEX`、脚本模板常量、选项常量、`defaultEventRules`） |
| `src/pages/workflow/__tests__/formUtils.test.ts` | 新增（vitest） |
| `src/router.tsx` | 改（2 条路由） |
| `scripts/sql/workflow-form-event-config.sql` | 新增（菜单 seed） |

## 10. 验证标准

- `pnpm --filter mes-new check-types` 通过
- `pnpm --filter mes-new lint` 0 error
- `pnpm --filter mes-new test` 全绿（含新增 formUtils 用例）
- `pnpm --filter mes-new build` 通过
- 运行时（`:4100`）人工核对：
  1. `/workflow/form` 能新增流程表单：填 名称=生产订单审批流程、key=orderRecord、类型=URL表单、三个脚本、取消「跳过相同处理人」、保存后入列表。
  2. 编辑/删除表单可用；key 唯一与必填校验生效。
  3. `/workflow/definition` 列出已发布模型为定义；启用/停用、关联表单（选 orderRecord）、事件配置弹窗均可用。
  4. 事件配置可增改删，预置示例可填入；触发时机/动作/目标状态联动正确。
  5. 原 category/model 功能不回归。

## 11. 非目标（YAGNI）

- 不引 Monaco / CodeMirror；不做脚本语法高亮或执行。
- 不做真实审批运行时（实例/任务/认领/办理）与真实状态写库。
- 不新增后端 Java；不新增 `sp_workflow_form` 表（mock 存储）。
- 表单类型只实现 `URL表单`，不做自定义/内置表单。
