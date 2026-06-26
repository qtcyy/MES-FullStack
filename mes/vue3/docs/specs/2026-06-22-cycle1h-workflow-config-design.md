# 子周期 1h 设计 · 工作流配置（分类 / 表单 / 定义 / 事件）

- 日期：2026-06-22
- 分支：`feature/workflow-config`（从 `develop` 切，完成后 `--no-ff` 合 `develop`）
- 工程：`mes/vue3`（Vue3 课程作业前端，dev `:4200`，代理 `/api`→`:9090`）
- 参考：React 版 `mes/frontend/apps/mes-new`（周期 2m/2n）—— **仅参考接口契约与功能，绝不照抄其 UI**
- 后端改动：**零**（workflow 模块在 mes-new 周期 2n 已完整建好并端到端实测通过）

---

## 1. 目标与范围

实现后端 **workflow** 模块的四个配置页，单分支一次性交付，**Cycle 1 收官**：

1. **流程分类管理**（`/workflow/category`）—— 标准 CRUD（code 唯一）。
2. **流程表单管理**（`/workflow/form`）—— CRUD + 三段地址脚本 + 跳过相同处理人开关（formKey 唯一）。
3. **流程定义管理**（`/workflow/definition`）—— 已发布定义的 启停 / 关联表单 / 事件规则三类操作（无 create/delete）。
4. **流程事件规则**（嵌在定义页弹窗）—— 某定义下事件规则的增删改 + 「填入示例」。

**关键决策（用户拍板）：**
- **四页全做**，对齐路线图与 mes-new 功能边界。
- **流程定义数据源 = 种子 SQL**：新增 seed 预置 1~2 条已发布 `sp_workflow_model` + 对应 `sp_workflow_definition`，让定义页/事件页有数据可演示（BPMN 可视化设计器是 Cycle 3，本周期不做模型页）。
- **后端能不动就不动**：默认零生产代码改动;仅按「每周期必审后端」约定审查 workflow 五个 Controller/Service，**只有暴露出来的真正正确性 bug 才最小修复** + 补 Mockito 守卫单测。

**非目标（明确不做）：**
- **BPMN 模型设计页**（`/workflow/model`）—— 路线图明确排到 Cycle 3（bpmn-js 设计器）。本周期不做模型列表/创建/发布页;定义数据靠 seed 预置。菜单 192「流程模型设计」点击为死链(urlMap 不映射),Cycle 3 补。
- **运行时**（流程实例 / 任务 / 审批 / 事件真正触发）—— 后端运行时表 `sp_workflow_instance/task/event_log` 本周期不碰,与 mes-new 2n 一致留待将来。
- 不引入任何流程图可视化第三方库。

---

## 2. 后端契约（已调研，本周期不改）

时间格式统一 `yyyy-MM-dd HH:mm:ss`。所有端点 POST(除 model GET)，响应 `Result{code,data,msg}`，`code===0` 解包 data。

### 2.1 流程分类 `WorkflowCategoryController`
| 端点 | 方法 | 编码 | 入参 | 出参 |
|---|---|---|---|---|
| `/workflow/category/page` | POST | **form** | `CategoryPageReq{code?, name?, current, size, orderBy?}` | `IPage<SpWorkflowCategory>` |
| `/workflow/category/list` | POST | **form** | 无 | `List<SpWorkflowCategory>` |
| `/workflow/category/add-or-update` | POST | **form** | `SpWorkflowCategory`（无 id=新增） | `String`(id) |
| `/workflow/category/delete` | POST | **JSON** | `{id}` | `null` |

唯一约束 `code`;后端新增/编辑均校验 code 重复则拒。

### 2.2 流程表单 `WorkflowFormController`
| 端点 | 方法 | 编码 | 入参 | 出参 |
|---|---|---|---|---|
| `/workflow/form/page` | POST | **form** | `FormPageReq{name?, formKey?, current, size, orderBy?}` | `IPage<SpWorkflowForm>` |
| `/workflow/form/list` | POST | **form** | 无 | `List<SpWorkflowForm>` |
| `/workflow/form/add-or-update` | POST | **form** | `SpWorkflowForm`（无 id=新增） | `String`(id) |
| `/workflow/form/delete` | POST | **JSON** | `{id}` | `null` |

唯一约束 `formKey`(字母开头);后端新增时 `formType` 缺省 `"URL"`、`skipSameAssignee` 缺省 false。

### 2.3 流程定义 `WorkflowDefinitionController`
| 端点 | 方法 | 编码 | 入参 | 出参 |
|---|---|---|---|---|
| `/workflow/definition/page` | POST | **form** | `DefinitionPageReq{name?, current, size, orderBy?}`（name 模糊匹配 process_name） | `IPage<SpWorkflowDefinition>`（仅已发布） |
| `/workflow/definition/set-enabled` | POST | **JSON** | `{id, enabled:boolean}` | `null` |
| `/workflow/definition/set-form` | POST | **JSON** | `{id, formKey:string\|null}`（null=清除关联） | `null` |

**无 create/delete**;定义由模型发布派生(`definition.id = model.id`)。

### 2.4 流程事件规则 `WorkflowEventController`（全 JSON）
| 端点 | 方法 | 编码 | 入参 | 出参 |
|---|---|---|---|---|
| `/workflow/event/list` | POST | **JSON** | `{definitionId}` | `List<SpWorkflowEventRule>` |
| `/workflow/event/save` | POST | **JSON** | `SpWorkflowEventRule`（无 id=新增） | `String`(id) |
| `/workflow/event/delete` | POST | **JSON** | `{id}` | `null` |

新增时 `enabled` 缺省 true;`definitionId` 必填。

### 2.5 实体字段（关键）
- **SpWorkflowCategory**：id / **code**(唯一) / name / descr / 审计四列。
- **SpWorkflowForm**：id / name / **formKey**(唯一,字母开头) / formType(仅 `URL`) / titleScript / pcUrlScript / mobileUrlScript / **skipSameAssignee**(boolean) / 审计四列。
- **SpWorkflowDefinition**：id(=modelId) / categoryCode / categoryName / processKey / processName / **enabled**(boolean) / formKey(可空) / version(int) / 审计四列。
- **SpWorkflowEventRule**：id / definitionId / name / **trigger**(START·TASK_COMPLETE·END·REJECT,见下映射坑) / businessType(如 ORDER_APPROVAL) / actionType(SET_AUDIT_STATUS·SCRIPT) / targetStatus(DRAFT·APPROVING·APPROVED·REJECTED,仅 SET_AUDIT_STATUS 有效) / script(仅 SCRIPT 有效) / **enabled**(boolean) / 审计四列。

### 2.6 ⚠️ 关键契约坑

1. **事件规则 `trigger` 字段名映射**：Java 字段 `triggerType` → DB 列 `trigger_type` → **API JSON 暴露名 `trigger`**(`@JsonProperty("trigger")`,后端为避开 SQL 保留字所做)。**前端 payload 与读取一律用 `trigger`**,TS 类型字段名即 `trigger`。
2. **编码 form vs JSON**：page/list/add-or-update 走 **form**(`http.post(url, data)` 默认);所有 delete + definition set-enabled/set-form + event list/save/delete 走 **JSON**(`http.post(url, data, true)` 第三参 true)。
3. **definition 无增删**:页面只能 启停 / 关联表单 / 配事件,不能新建或删除定义(删除要删模型,本周期无模型页)。
4. **boolean 往返**:skipSameAssignee / enabled 经 form 编码会变字符串 `"true"`/`"false"`,后端 Boolean 能解析;JSON 端点保持原生 boolean。表单内部用 boolean,提交前不手动转。

---

## 3. 路由 / 菜单 / urlMap

**菜单种子已存在**(无需新建菜单 SQL)：
- `scripts/sql/workflow-flow-config.sql`：菜单 19(流程配置工具顶层) / 191(流程分类管理) / 192(流程模型设计)。
- `scripts/sql/workflow-form-event-config.sql`：菜单 193(流程表单管理) / 194(流程定义管理)。

**urlMap 新增 3 条**(`src/utils/urlMap.ts`,模型 192 本周期不映射):
```ts
'/workflow/category/list-ui': '/workflow/category',
'/workflow/form/list-ui': '/workflow/form',
'/workflow/definition/list-ui': '/workflow/definition',
```

**router 新增 3 路由**(`src/router/index.ts` 的 AdminLayout children):
```ts
{ path: 'workflow/category',   name: 'workflow-category',   component: () => import('@/views/workflow/category/CategoryList.vue'),     meta: { title: '流程分类管理', perm: 'workflow:category:list' } },
{ path: 'workflow/form',       name: 'workflow-form',       component: () => import('@/views/workflow/form/FormList.vue'),             meta: { title: '流程表单管理', perm: 'workflow:form:list' } },
{ path: 'workflow/definition', name: 'workflow-definition', component: () => import('@/views/workflow/definition/DefinitionList.vue'), meta: { title: '流程定义管理', perm: 'workflow:definition:list' } },
```

> 菜单权限串是 `workflow:category:list` 等(见种子);路由 `meta.perm` 须与之一致,否则守卫拦截。

**新增演示数据 seed** `scripts/sql/workflow-demo-seed.sql`(幂等 `WHERE NOT EXISTS`):
- 1~2 条 `sp_workflow_category`(如 code=`ORDER`/审批流程)。
- 1~2 条 `sp_workflow_model`(status=`PUBLISHED`,含最小 BPMN XML 骨架,category 已回填)。
- 对应 `sp_workflow_definition`(**id = model.id**,processKey=modelKey,enabled=1,version=1,formKey 留空待页面关联)。
- 可选 1 条 `sp_workflow_form` + 1~2 条 `sp_workflow_event_rule` 让首屏不空。

---

## 4. 前端架构与文件拆分

### 4.1 类型 `src/types/workflow.ts`（新建）
```ts
export interface WorkflowCategory { id?: string; code: string; name: string; descr?: string; createTime?: string; updateTime?: string }
export interface WorkflowForm {
  id?: string; name: string; formKey: string; formType: 'URL'
  titleScript?: string; pcUrlScript?: string; mobileUrlScript?: string
  skipSameAssignee: boolean; createTime?: string; updateTime?: string
}
export interface WorkflowDefinition {
  id: string; categoryCode?: string; categoryName?: string
  processKey: string; processName: string
  enabled: boolean; formKey?: string | null; version: number; createTime?: string; updateTime?: string
}
export type EventTrigger = 'START' | 'TASK_COMPLETE' | 'END' | 'REJECT'
export type EventAction = 'SET_AUDIT_STATUS' | 'SCRIPT'
export type AuditStatus = 'DRAFT' | 'APPROVING' | 'APPROVED' | 'REJECTED'
export interface WorkflowEventRule {
  id?: string; definitionId: string; name?: string
  trigger: EventTrigger            // ← 注意:API 暴露名 trigger(非 triggerType)
  businessType: string; actionType: EventAction
  targetStatus?: AuditStatus | null; script?: string | null; enabled: boolean
  createTime?: string; updateTime?: string
}
// 分页参数
export interface CategoryPageParams { current: number; size: number; code?: string; name?: string }
export interface FormPageParams { current: number; size: number; name?: string; formKey?: string }
export interface DefinitionPageParams { current: number; size: number; name?: string }
```

### 4.2 API 层 `src/api/workflow/{category,form,definition,event}.ts`（新建）
逐函数对齐 §2 端点。编码规则:page/list/add-or-update 用 `http.post(url, data)`;delete/set-*/event-* 用 `http.post(url, data, true)`。例:
```ts
// category.ts
export const categoryPage   = (p: CategoryPageParams) => http.post<IPage<WorkflowCategory>>('/workflow/category/page', p)
export const categoryList   = () => http.post<WorkflowCategory[]>('/workflow/category/list', {})
export const categorySave   = (r: WorkflowCategory) => http.post<string>('/workflow/category/add-or-update', r)
export const categoryDelete = (id: string) => http.post<void>('/workflow/category/delete', { id }, true)
// definition.ts
export const definitionSetEnabled = (id: string, enabled: boolean) => http.post<void>('/workflow/definition/set-enabled', { id, enabled }, true)
export const definitionSetForm    = (id: string, formKey: string | null) => http.post<void>('/workflow/definition/set-form', { id, formKey }, true)
// event.ts —— 全 JSON
export const eventList = (definitionId: string) => http.post<WorkflowEventRule[]>('/workflow/event/list', { definitionId }, true)
export const eventSave = (r: WorkflowEventRule) => http.post<string>('/workflow/event/save', r, true)
```

### 4.3 纯函数 `src/utils/workflow.ts`（新建,TDD）
无业务副作用、可单测的逻辑全部沉淀这里:
- `validateCategory(form): string[]` — code/name 必填,code 字母数字下划线。
- `validateForm(form): string[]` — name/formKey 必填,formKey `^[a-zA-Z][a-zA-Z0-9_]*$`。
- `validateEventRule(rule): string[]` — trigger/actionType 必填;SET_AUDIT_STATUS 须有 targetStatus,SCRIPT 须有 script。
- `buildCategoryPayload` / `buildFormPayload` / `buildEventPayload` — 剥空、布尔归一、剥审计字段。
- `triggerLabel(t)` / `actionLabel(a)` / `auditStatusLabel(s)` — 枚举 → 中文标签(下拉与展示共用)。
- `sampleEventRules(definitionId): WorkflowEventRule[]` — 「填入示例」三条(START→APPROVING / END→APPROVED / REJECT→REJECTED,businessType=ORDER_APPROVAL)。
- `defaultFormScripts(): {titleScript,pcUrlScript,mobileUrlScript}` — 表单脚本默认模板(可选)。
- 枚举常量 `TRIGGER_OPTIONS / ACTION_OPTIONS / AUDIT_STATUS_OPTIONS`(`{value,label}[]`)。

### 4.4 视图组件
```
src/views/workflow/
├── category/
│   ├── CategoryList.vue       # PageContainer + SearchForm + DataTable + FormDialog
│   └── CategoryForm.vue       # 弹窗内表单(code/name/descr)
├── form/
│   ├── FormList.vue           # 列表:名称/key/类型/跳过相同处理人/时间
│   └── FormForm.vue           # 弹窗:基本信息 + 三段脚本 + 跳过开关
└── definition/
    ├── DefinitionList.vue     # 列表 + 行内三操作(启停/关联表单/事件)
    ├── AssociateFormDialog.vue# 下拉选表单(formList + 未关联) → set-form
    └── EventConfigDialog.vue  # 事件规则编辑器 + 列表(增删改 + 填入示例)
```

页面遵循既有范式(参考 `views/basedata/materile/MaterileList.vue`):
`usePagination()` + `useRequest()` + `reactive({search})` + `computed` 映射 + 组合式处理函数,零 watch。

---

## 5. 核心交互设计

### 5.1 流程分类(标准 CRUD)
- 列表:编码 / 名称 / 备注 / 更新时间 + 操作(编辑/删除,`v-permission`)。
- SearchForm:编码 + 名称模糊。
- 删除前 `ElMessageBox.confirm`。新增/编辑共用 `CategoryForm` 弹窗,提交走 `categorySave`。

### 5.2 流程表单
- 列表:名称 / formKey / 类型(tag) / 跳过相同处理人(是/否 tag) / 更新时间 + 操作。
- `FormForm` 弹窗分三段(用 `el-divider` 或分组标题,**非多步向导**——Vue3 不抄 mes-new 的 wizard UI):
  - 基本信息:名称、formKey(校验字母开头)、表单类型(Select 仅 URL,disabled)。
  - 地址脚本:titleScript / pcUrlScript / mobileUrlScript(`el-input type=textarea`),下方提示可用变量 `${orderCode}/${businessId}/${businessType}/${initiator}/${processName}`。
  - 选项:跳过相同处理人(`el-switch`)。
- formKey 唯一性:后端已校验,前端提交失败 toast 即可(不预查 list,避免额外请求;若需更好 UX 可选预查)。

### 5.3 流程定义 + 事件(主页 + 两弹窗)
- 列表:流程名称 / processKey / 分类 / 版本(v{n}) / 启用状态(tag) / 关联表单(formKey 或「未关联」) / 操作。
- SearchForm:流程名称模糊。
- 行内三操作:
  1. **启用/停用**:`definitionSetEnabled(id, !enabled)`,成功后 refetch。
  2. **关联表单**:打开 `AssociateFormDialog` → `el-select`(选项 = `categoryList` 风格的 formList + 「未关联」`__none__`)→ `definitionSetForm(id, formKey|null)`。
  3. **流程事件**:打开 `EventConfigDialog`。
- `EventConfigDialog`(受控,普通 useState/reactive 草稿,不用 RHF —— Vue 无 DOM clobbering 坑但仍用 reactive 草稿):
  - 上半:规则编辑器 —— 名称 / 触发时机(Select TRIGGER_OPTIONS) / 动作(Select ACTION_OPTIONS) / 条件区(actionType=SET_AUDIT_STATUS 显示目标状态 Select;=SCRIPT 显示脚本 textarea) / 启用 switch / [添加|更新规则] [填入示例] 按钮。
  - 下半:规则列表 —— trigger tag + 动作描述 + 名称 + 停用 tag + 编辑/删除。
  - 数据:打开时 `eventList(definitionId)`;保存 `eventSave`;删除 `eventDelete`;每次成功后重载列表 + 清空草稿。
  - 「填入示例」:`sampleEventRules(definitionId)` 逐条 `eventSave`。

---

## 6. 复用与新增的通用原语

- 复用:`PageContainer` / `SearchForm` / `DataTable`(服务端分页) / `FormDialog` / `useRequest` / `usePagination` / `v-permission`。
- **不新增通用组件**:四页均为标准列表 + 弹窗形态,现有原语足够;事件/关联弹窗用 `FormDialog` 或裸 `el-dialog` 承载。
- 动画:沿用 `DataTable` 内置过渡 + `PageContainer` 入场;事件规则列表可挂 `auto-animate`(可选)。

---

## 7. 后端审查（按「每周期必审」约定）

逐文件读 workflow 五个 Controller + Service/Impl,重点核查:
- category/form 的 add-or-update 唯一性校验是否对「编辑同一条」误判重复(自身 code/key 应排除)。
- definition set-form 传 null 是否真能清除(UpdateWrapper set null vs entity null 被 MyBatis-Plus 忽略)。
- event save 新增/编辑分支、enabled 缺省、`@JsonProperty("trigger")` 读写闭环。
- publish/delete 的 `@Transactional` 与级联(本周期不触发,但审查覆盖)。

mes-new 2n 已端到端验证过这些(含 `trigger` 保留字 bug 已修),预期**零改动**;若发现暴露的真 bug 才最小修复 + Mockito 守卫单测(JUnit4,`Result extends HashMap` 取 `get("code")`,MP3.1.2 `count()` 返回 int)。

---

## 8. 测试策略

- **纯函数单测**(vitest,`tests/workflow.spec.ts`):validate* / build*Payload / sampleEventRules / *Label 枚举 / 校验分支(SET_AUDIT_STATUS 缺 targetStatus、SCRIPT 缺 script、formKey 正则)。目标 ≥ 20 例。
- **组件**:仅 typecheck(沿用约定,组件不做渲染测)。
- **门禁**:`pnpm typecheck`(0 错) / `pnpm test`(全绿) / `pnpm lint:check`(0 error) / `pnpm build`(成功)。
- 后端(若改动):`mvn -q test -Dtest=...` 守卫单测绿 + `mvn compile`。

---

## 9. 验证（人工 :4200 冒烟,待用户确认）

前置:后端 :9090 起 + DB 已跑 `workflow-config-tables.sql`(建表)+ `workflow-flow-config.sql`/`workflow-form-event-config.sql`(菜单)+ `workflow-demo-seed.sql`(演示数据)。`admin/123` 登录。

1. 流程配置工具 → 流程分类管理:新增(code 唯一冲突被拒)/ 编辑 / 删除 / 搜索 / 翻页。
2. 流程表单管理:新增(formKey 字母开头校验 + 三段脚本 + 跳过开关)/ 编辑回填 / 删除。
3. 流程定义管理:列表显示 seed 的已发布定义 → 启停切换 → 关联表单(选 + 清除)→ 配事件:加规则(SET_AUDIT_STATUS / SCRIPT 两类)、填入示例、编辑、删除。

---

## 10. 非目标小结（YAGNI）

- BPMN 模型设计页 / 模型 CRUD / 发布动作 → Cycle 3。
- 运行时(实例/任务/审批/事件触发)→ 将来周期。
- formKey/code 提交前预查唯一性 → 靠后端校验 + toast(可选增强)。
- 多 businessType → 固定 ORDER_APPROVAL(与 mes-new 一致)。
