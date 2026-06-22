# 子周期 1h 工作流配置（分类/表单/定义/事件）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `mes/vue3` 实现 workflow 模块四个配置页——流程分类 CRUD、流程表单 CRUD、流程定义(启停/关联表单/事件规则),对接后端已存在的 12 个端点(category 4 + form 4 + definition 3 + event 3),Cycle 1 收官。

**Architecture:** Vue3 `<script setup>` + Element Plus。沿用既有范式:`useRequest`/`usePagination` 取数、`DataTable`/`SearchForm`/`FormDialog`/`PageContainer` 通用组件、纯函数(`utils/workflow.ts`)承载校验/payload/枚举标签/示例规则并 TDD(vitest,`tests/workflow.spec.ts`)。四页均标准列表+弹窗,不新增通用组件,UI 独立设计不抄 mes-new。后端默认零改动,仅审查+暴露 bug 才最小修。

**Tech Stack:** Vue 3.5 / TypeScript / Element Plus / Vite / Pinia / Vitest / axios(`http` 封装,表单编码默认、JSON 显式 `http.post(url,body,true)`)。

**工作目录:** 前端 `mes/vue3/`、后端 `mes/`、Git 仓库根 `/Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue`。当前分支 `feature/workflow-config`(已从 develop 切)。

**前置(人工/DB):** 后端 9090 + DB 已跑 `scripts/sql/workflow-config-tables.sql`(建 4 表 + definition 补列)、`scripts/sql/workflow-flow-config.sql`+`workflow-form-event-config.sql`(菜单 19/191/192/193/194)、**本周期新增** `scripts/sql/workflow-demo-seed.sql`(已发布模型/定义演示数据)。

**门禁(每完成若干任务跑一次,收尾必跑):** `cd mes/vue3 && pnpm typecheck && pnpm test && pnpm lint:check && pnpm build`

---

## 文件结构

**新建:**
- `src/types/workflow.ts` —— workflow 模块全部 TS 类型 + 分页参数
- `src/api/workflow/category.ts` / `form.ts` / `definition.ts` / `event.ts` —— 四组 API
- `src/utils/workflow.ts` —— 校验/payload/枚举标签/示例规则纯函数
- `tests/workflow.spec.ts` —— 纯函数单测(≥20 例)
- `src/views/workflow/category/CategoryList.vue` / `CategoryForm.vue`
- `src/views/workflow/form/FormList.vue` / `FormForm.vue`
- `src/views/workflow/definition/DefinitionList.vue` / `AssociateFormDialog.vue` / `EventConfigDialog.vue`
- `scripts/sql/workflow-demo-seed.sql` —— 演示数据(分类/已发布模型/定义/可选表单+事件)

**修改:**
- `src/utils/urlMap.ts` —— 加 3 条映射
- `src/router/index.ts` —— 加 3 路由
- `mes/vue3/docs/ROADMAP.md` —— 收尾更新进度矩阵

---

## Task 1: 类型定义 `src/types/workflow.ts`

**Files:** Create `src/types/workflow.ts`

- [ ] **Step 1: 写类型文件** —— 完全对齐 spec §4.1(WorkflowCategory / WorkflowForm / WorkflowDefinition / EventTrigger / EventAction / AuditStatus / WorkflowEventRule + 三个 PageParams)。
  - ⚠️ `WorkflowEventRule.trigger`(非 triggerType);`skipSameAssignee`/`enabled` 为 boolean;`formKey?: string | null`。
  - `IPage<T>` 从 `@/types/system` 导入(既有约定,`@/types/api` 只导 `PageResult`)。
- [ ] **Step 2: typecheck** —— `cd mes/vue3 && pnpm typecheck`(0 错)。
- [ ] **Step 3: Commit** —— `🏷️ feat(vue3): workflow 模块 TS 类型(trigger 映射/boolean/分页参数)`。

---

## Task 2: 纯函数 + 单测(TDD)`src/utils/workflow.ts`

**Files:** Create `tests/workflow.spec.ts`、`src/utils/workflow.ts`

- [ ] **Step 1: 写失败测试** —— Create `tests/workflow.spec.ts`,覆盖:
  - `validateCategory`:code/name 必填、code 合法字符 → 返回错误数组;合法返回 `[]`。
  - `validateForm`:name/formKey 必填、formKey `^[a-zA-Z][a-zA-Z0-9_]*$`(数字开头/含中划线应报错)。
  - `validateEventRule`:trigger/actionType 必填;actionType=SET_AUDIT_STATUS 缺 targetStatus 报错;=SCRIPT 缺 script 报错;合法返回 `[]`。
  - `buildCategoryPayload`/`buildFormPayload`/`buildEventPayload`:剥审计字段、空串归一、boolean 保持。
  - `triggerLabel`/`actionLabel`/`auditStatusLabel`:枚举 → 中文;未知值兜底原样。
  - `sampleEventRules(defId)`:返回 3 条(START→APPROVING / END→APPROVED / REJECT→REJECTED,businessType=ORDER_APPROVAL,actionType=SET_AUDIT_STATUS,enabled=true,definitionId=defId)。
  - `TRIGGER_OPTIONS`/`ACTION_OPTIONS`/`AUDIT_STATUS_OPTIONS`:长度与 value 集合。
- [ ] **Step 2: 运行验证失败** —— `pnpm test`(workflow.spec 全红,函数未实现)。
- [ ] **Step 3: 实现** —— Create `src/utils/workflow.ts`,实现上述全部纯函数与常量。
- [ ] **Step 4: 运行验证通过** —— `pnpm test`(workflow.spec 全绿) + `pnpm typecheck`。
- [ ] **Step 5: Commit** —— `✅ test(vue3): workflow 纯函数单测(校验/payload/枚举/示例规则)` + `✨ feat(vue3): utils/workflow 纯函数`(可合一次提交)。

---

## Task 3: API 层 `src/api/workflow/{category,form,definition,event}.ts`

**Files:** Create 四个 api 文件

- [ ] **Step 1: 写四组 API** —— 严格按 spec §2/§4.2 编码:
  - `category.ts`:`categoryPage`(form) / `categoryList`(form) / `categorySave`(form) / `categoryDelete`(JSON)。
  - `form.ts`:`formPage`(form) / `formList`(form) / `formSave`(form) / `formDelete`(JSON)。
  - `definition.ts`:`definitionPage`(form) / `definitionSetEnabled`(JSON) / `definitionSetForm`(JSON,formKey 可 null)。
  - `event.ts`:`eventList`(JSON) / `eventSave`(JSON) / `eventDelete`(JSON)。
  - ⚠️ JSON 端点必须传第三参 `true`;form 端点不传。返回类型用 Task 1 的类型。
- [ ] **Step 2: typecheck** —— `pnpm typecheck`。
- [ ] **Step 3: Commit** —— `✨ feat(vue3): workflow 四组 API(form/JSON 编码区分)`。

---

## Task 4: 流程分类页 `views/workflow/category/`

**Files:** Create `CategoryList.vue`、`CategoryForm.vue`

- [ ] **Step 1: CategoryForm.vue** —— FormDialog 内 `el-form`:code(必填)/name(必填)/descr(textarea)。`el-form` rules 行内校验 + 提交时 `validateCategory` 兜底。props `modelValue`(boolean)/`record`(编辑回填,可空);emit `update:modelValue`/`saved`。
- [ ] **Step 2: CategoryList.vue** —— `PageContainer` + `SearchForm`(code/name)+ `DataTable`(列:编码/名称/备注/更新时间 + 操作)+ `CategoryForm`。
  - `usePagination` + `useRequest(categoryPage)`;新增/编辑打开弹窗;删除 `ElMessageBox.confirm` → `categoryDelete` → refetch。
  - 操作按钮挂 `v-permission`(编辑/删除可用 `workflow:category:list` 或粗粒度,与兄弟页一致)。
- [ ] **Step 3: typecheck + lint** —— `pnpm typecheck && pnpm lint:check`。
- [ ] **Step 4: Commit** —— `✨ feat(vue3): 流程分类管理页(CRUD/搜索/分页)`。

---

## Task 5: 流程表单页 `views/workflow/form/`

**Files:** Create `FormList.vue`、`FormForm.vue`

- [ ] **Step 1: FormForm.vue** —— FormDialog 内三段(`el-divider` 分组,**非向导**):
  - 基本信息:name / formKey(rules:必填 + `^[a-zA-Z][a-zA-Z0-9_]*$`)/ formType(`el-select` 仅 URL,disabled,默认 URL)。
  - 地址脚本:titleScript / pcUrlScript / mobileUrlScript(`el-input type=textarea`)+ 变量提示文案(`${orderCode}` 等)。
  - 选项:skipSameAssignee(`el-switch`)。
  - 新增时默认值:formType=URL、skipSameAssignee=false;编辑回填 record。
- [ ] **Step 2: FormList.vue** —— 列表(名称/formKey/类型 tag/跳过相同处理人 是否 tag/更新时间 + 操作)+ SearchForm(name/formKey)+ CRUD,范式同 Task 4。
- [ ] **Step 3: typecheck + lint**。
- [ ] **Step 4: Commit** —— `✨ feat(vue3): 流程表单管理页(三段表单/脚本/跳过开关)`。

---

## Task 6: 流程定义页 + 关联表单弹窗 `views/workflow/definition/`

**Files:** Create `DefinitionList.vue`、`AssociateFormDialog.vue`

- [ ] **Step 1: AssociateFormDialog.vue** —— props `modelValue`/`definition`;打开时 `formList()` 取选项;`el-select` 选项 = 「未关联」(`__none__`)+ 各表单(label=`name (formKey)`,value=formKey);初始值取 `definition.formKey`;确认 → `definitionSetForm(id, formKey === '__none__' ? null : formKey)` → emit `saved`。
- [ ] **Step 2: DefinitionList.vue** —— `PageContainer` + SearchForm(流程名称)+ DataTable:
  - 列:流程名称 / processKey / 分类(categoryName)/ 版本(`v{version}`)/ 启用(tag 启用·停用)/ 关联表单(formKey 或「未关联」)/ 操作。
  - 行内三操作:① 启用/停用 `definitionSetEnabled(id, !enabled)` → refetch;② 关联表单(开 AssociateFormDialog,saved 后 refetch);③ 流程事件(开 EventConfigDialog,Task 7)。
  - **无新增/删除按钮**(定义由发布派生)。
- [ ] **Step 3: typecheck + lint**(EventConfigDialog 先占位 import,Task 7 补)。
- [ ] **Step 4: Commit** —— `✨ feat(vue3): 流程定义管理页(启停/关联表单)`。

---

## Task 7: 事件规则配置弹窗 `EventConfigDialog.vue`

**Files:** Create `views/workflow/definition/EventConfigDialog.vue`

- [ ] **Step 1: 实现弹窗** —— props `modelValue`/`definition`;`reactive` 草稿 + 列表两区:
  - 编辑器:name / trigger(Select TRIGGER_OPTIONS) / actionType(Select ACTION_OPTIONS) / 条件区(SET_AUDIT_STATUS→targetStatus Select AUDIT_STATUS_OPTIONS;SCRIPT→script textarea) / enabled switch / [添加|更新规则] [填入示例]。
  - 列表:遍历 rules,每行 trigger tag + 动作描述(`triggerLabel`/`actionLabel`/`auditStatusLabel`)+ name + 停用 tag + 编辑/删除。
  - 打开时 `eventList(definitionId)`;保存前 `validateEventRule`,过 → `eventSave(buildEventPayload(draft))` → 重载 + 清草稿;删除 `eventDelete` → 重载;填入示例:`sampleEventRules` 逐条 `eventSave` → 重载。
  - 列表可挂 `v-auto-animate`(可选)。
- [ ] **Step 2: typecheck + lint**。
- [ ] **Step 3: Commit** —— `✨ feat(vue3): 流程事件规则配置弹窗(增删改/填入示例)`。

---

## Task 8: 路由 / urlMap / 演示 seed SQL

**Files:** Modify `src/utils/urlMap.ts`、`src/router/index.ts`;Create `scripts/sql/workflow-demo-seed.sql`

- [ ] **Step 1: urlMap** —— 加 category/form/definition 三条映射(model 不映射)。
- [ ] **Step 2: router** —— 加 3 路由(spec §3,`meta.perm` 对齐菜单权限串)。
- [ ] **Step 3: workflow-demo-seed.sql** —— 幂等 `WHERE NOT EXISTS`:
  - `sp_workflow_category`:1~2 条(如 code=`ORDER_APPROVAL` 名「订单审批」)。
  - `sp_workflow_model`:1~2 条 status=`PUBLISHED`,bpmn_xml 给最小合法骨架,category_code/name 已回填。
  - `sp_workflow_definition`:**id = 对应 model.id**,process_key=model_key,process_name=name,enabled=1,version=1,form_key NULL,category 回填,审计列 NOW()/admin。
  - 可选:1 条 `sp_workflow_form` + 1~2 条 `sp_workflow_event_rule`(trigger_type 列名,非 trigger)。
  - 固定 id(如 `wf_demo_*`)便于幂等。
- [ ] **Step 4: 门禁全量** —— `pnpm typecheck && pnpm test && pnpm lint:check && pnpm build`。
- [ ] **Step 5: Commit** —— `✨ feat(vue3): workflow 路由/urlMap + 演示数据 seed`。

---

## Task 9: 后端审查(按「每周期必审」约定)

**Files:** 只读 `mes/src/main/java/com/wangziyang/mes/workflow/**`;若有暴露 bug 才改 + Mockito 守卫单测。

- [ ] **Step 1: 逐文件审查** —— 五个 Controller + Service/Impl,核查 spec §7 列出的点(唯一性自身排除、set-form null 清除、event save 分支/enabled 缺省/`@JsonProperty("trigger")` 闭环、@Transactional 级联)。
- [ ] **Step 2: 结论** —— 预期零改动(mes-new 2n 已验)。若发现暴露的真 bug:最小修复 + `Cycle1hBackendTest`(JUnit4,`@RunWith(MockitoJUnitRunner)`,`Result extends HashMap` 取 `get("code")`,MP3.1.2 `count()` 返回 int)+ `mvn -q test -Dtest=Cycle1hBackendTest` 绿 + `mvn compile`。
- [ ] **Step 3: Commit**(若有改动)—— `🐛 fix(mes): workflow <具体bug> + 守卫单测`。

---

## Task 10: 收尾 —— ROADMAP 更新 + 全量门禁

**Files:** Modify `mes/vue3/docs/ROADMAP.md`

- [ ] **Step 1: 更新 ROADMAP** —— §8 把 1h 标 ✅(Cycle 1 收官);§9.8 workflow 矩阵四行 C1 状态 ✅;§11 加进度快照段(分支/交付/门禁/待人工确认 + demo seed 前置)。
- [ ] **Step 2: 全量门禁** —— `cd mes/vue3 && pnpm typecheck && pnpm test && pnpm lint:check && pnpm build` 全绿。
- [ ] **Step 3: Commit** —— `📝 docs(vue3): ROADMAP 标记 1h 工作流配置完成(Cycle 1 收官)`。

---

## 完成标准（DoD）

- [ ] 四页可用:分类 CRUD、表单 CRUD、定义 启停/关联表单/事件规则增删改。
- [ ] `trigger` 字段映射正确(读写均用 trigger);form/JSON 编码各端点正确。
- [ ] 纯函数单测 ≥20 例全绿;typecheck 0 错;lint 0 error;build 成功。
- [ ] 演示 seed 让定义页有已发布定义可操作。
- [ ] 后端审查完成(零改动或最小修+守卫单测)。
- [ ] ROADMAP 更新,Cycle 1 标记收官。
- [ ] subagent 驱动逐任务两阶段审查 + opus 终审 Ready to merge。

## 手动验证清单（人工 :4200,待用户确认）

1. `admin/123` 登录 → 流程配置工具菜单出现三可用项(分类/表单/定义)+ 模型设计死链(Cycle 3)。
2. 流程分类:新增/编辑/删除/搜索/翻页;code 重复被后端拒(toast)。
3. 流程表单:新增(formKey 字母开头校验 + 三段脚本 + 跳过开关)/编辑回填/删除。
4. 流程定义:seed 定义可见 → 启停切换 → 关联表单(选+清除)→ 配事件(SET_AUDIT_STATUS/SCRIPT 两类 + 填入示例 + 编辑 + 删除)。
