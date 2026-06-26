# 子周期 3a BPMN 模型设计器 — 设计文档

- 日期：2026-06-22
- 分支：`feature/workflow-bpmn`（从 `develop` 切）
- 周期归属：Cycle 3（工作流设计器 + 动态主数据 + 工艺深化），**3a BPMN 模型设计器**
- 功能/接口参考：React 版 `mes/frontend/apps/mes-new` **周期 2m**（`BpmnDesigner`/`PropertiesPanel`/`flowableModdle`/`bpmnUtils`/`ModelList`/`ModelDesignerDialog`/`ModelCreateDialog`/`PublishDialog`），**仅参考接口契约与逻辑，绝不照抄其 UI**

---

## 1. 目标

完成工作流模块最后一块——**流程模型设计**（`/workflow/model`，菜单 192）。1h 已交付分类/表单/定义/事件四个配置页（定义页数据此前靠 `workflow-demo-seed.sql` 预置）；本周期补 bpmn-js 设计器，让用户**可视化建模 → 保存草稿 → 校验 → 发布到分类**，发布后**真正派生流程定义**（替代 seed 预置）。完成后矩阵 §9.8「BPMN 模型设计器」由 ☐ → ✅，工作流模块全功能闭环。

---

## 2. 后端契约（`WorkflowModelController` `/workflow/model`，均已存在，预期零改动）

| 端点 | 方法 | 编码 | 说明 |
|---|---|---|---|
| `/page` | POST | form | 模型分页（name/modelKey LIKE + update_time 倒序），返回 `IPage<WorkflowModel>` |
| `/{id}` | GET | — | 取单个模型（含 `bpmnXml`） |
| `/save` | POST | **JSON** `ModelSaveDTO{id?,modelKey,name,bpmnXml}` | 空 id 走新建（置 `status=DRAFT`/`version=1`）；有 id 仅更新 name/modelKey/bpmnXml（保留 status/version/分类，发布不可逆）；modelKey 唯一（`.ne(id)` 排除自身）；返回 id |
| `/delete` | POST | **JSON** `{id}` | 删除模型；若已派生定义（def.id=model.id）则 `@Transactional` 级联清理定义 + 其事件规则 |
| `/publish` | POST | **JSON** `ModelPublishDTO{id,categoryCode,categoryName}` | 置 `PUBLISHED` + 回填分类 + **upsert 流程定义**（`def.id=model.id`，processKey/Name/分类/version 同步，新建则 `enabled=true`） |

`SpWorkflowModel` 字段：`id`/`modelKey`/`name`/`bpmnXml`(longtext)/`status`(DRAFT/PUBLISHED)/`version`/`categoryCode`/`categoryName`。

> 发布语义关键：`/publish` 内 `def.id = model.id`，与 1h 流程定义页（只列已发布定义）严丝合缝。删除模型级联清定义 + 事件规则，避免孤儿。

---

## 3. 前端实现

### 3.1 列表页 `ModelList.vue`（`/workflow/model`）

- `PageContainer` + `SearchForm`（名称 / modelKey）+ `DataTable`（服务端分页）。
- 列：名称 / modelKey / 状态徽标（DRAFT 灰 / PUBLISHED 绿）/ 版本 / 分类名 / 更新时间。
- 工具栏「新建」（`v-permission="'workflow:model:list'"`）。
- 行操作：**设计**（打开设计器弹窗）/ **发布**（打开发布弹窗，仅状态允许时）/ **删除**（`ElMessageBox` 二次确认）。
- 编排三个子弹窗：`ModelCreateDialog`、`BpmnDesignerDialog`、`PublishDialog`；成功后 `run()` 刷新。

### 3.2 新建弹窗 `ModelCreateDialog.vue`

- `FormDialog` + `el-form`：名称（必填）+ modelKey（必填，**字母开头**校验，对齐 1h formKey 约定）。
- 提交：`modelSave({ modelKey, name, bpmnXml: initialBpmnXml(modelKey, name) })`（空 id → 新建 DRAFT）→ 成功后可选直接打开设计器（或回列表，由 ModelList 决定）。

### 3.3 设计器弹窗 `BpmnDesignerDialog.vue`（全屏 `el-dialog`）

- `el-dialog` `fullscreen` + `destroy-on-close`（每次打开重挂载 `BpmnDesigner`，保证 Modeler 干净重建）。
- 打开时 `modelGet(id)` 取 `bpmnXml` 喂给 `BpmnDesigner`（取数加 `ignore` 守卫防过期）。
- 布局：左 `BpmnDesigner`（画布，flex 撑满）+ 右 `PropertiesPanel`（固定宽侧栏）。
- 顶部操作：**校验**（`getSummary` → `validateSummary` → toast 问题清单 + `markErrors(errorTaskIds)`；无问题 toast 成功）+ **保存**（`getXML` → `modelSave({ id, modelKey, name, bpmnXml })`，草稿可存即使校验未过）+ **关闭**。
- 属性面板回写：`onChangeName(name)` → `designerRef.updateSelected({ name })`；`onChangeAssignee(type, roleCode)` → `designerRef.updateSelected(buildAssigneeProps(type, roleCode))`。

### 3.4 设计器组件 `BpmnDesigner.vue`（Vue 包装 vanilla bpmn-js）

镜像 1f `WarehouseScene.vue` 的「`onMounted` 手管实例 + `onBeforeUnmount` 彻底清理」模式：

- `props: { xml: string }`；`emits: { select: [SelectedElement | null] }`。
- `onMounted`：`new Modeler({ container, additionalModules:[minimapModule], moddleExtensions:{ flowable: flowableModdle } })` → 注册监听（`selection.changed`/`element.changed`/`canvas.viewbox.changed`/`commandStack.changed`）→ `importXML(xml)` → `canvas.zoom('fit-viewport')` + `minimap.close()`。
- `onBeforeUnmount`：`modeler.destroy()`（清实例）。
- `defineExpose`：`getXML()`（`saveXML({format:true})`）/ `getSummary()`（遍历 `elementRegistry.getAll()` 抽 `BpmnSummary`）/ `updateSelected(props)`（`modeling.updateProperties`）/ `markErrors(ids)` / `clearErrors()`（canvas addMarker/removeMarker `bpmn-error` class，`elementRegistry.get` 存在性守卫，delete-safe）。
- `readFlowableAttr` 三形式兜底读 `flowable:*`（`bo.get(限定名)` / `bo[本地名]` / `bo.$attrs[限定名]`，对齐 mes-new，避免写后读空）。
- 底部工具栏（缩放 ±/百分比/适应窗口/实际大小/撤销/重做，`commandStack.canUndo/canRedo` 驱动禁用态）。
- CSS：import `bpmn-js/dist/assets/{diagram-js,bpmn-js}.css` + `bpmn-font` + `diagram-js-minimap` + 本地 `bpmn-theme.css`。

### 3.5 属性面板 `PropertiesPanel.vue`

- `props: { element: SelectedElement | null, roles: SysRole[] }`；`emits: { changeName, changeAssignee }`。
- 未选中 → 占位提示。选中 → 节点名称输入（blur 提交）+ 类型展示。
- 仅 `bpmn:UserTask` 显示「办理人」：`el-radio-group`（流程发起人 / 候选组）+ 候选组时 `el-select` 选角色（`rolePage` 取真角色，value=role.code）。
- 选中元素变化时同步本地受控态（`watch(() => props.element)`）。

### 3.6 发布弹窗 `PublishDialog.vue`

- `FormDialog`：选分类（`categoryPage` 列出分类，value=code，同时带 name）→ `modelPublish({ id, categoryCode, categoryName })`。

### 3.7 沉淀（纯逻辑 + 资源）

- `src/utils/bpmn.ts`（**TDD**）：`escapeXmlAttr`（内部）/`initialBpmnXml(modelKey,name)`/`validateSummary(summary)`/`errorTaskIds(summary)`/`buildAssigneeProps(type,roleCode)` + 类型 `UserTaskSummary`/`BpmnSummary`/`ValidationResult`/`AssigneeType`/`SelectedElement`。**近乎逐字移植 mes-new bpmnUtils.ts**。
- `src/utils/flowableModdle.ts`：moddle 扩展（`flowable:assignee`/`candidateGroups`/`candidateUsers`，让导出 XML 真带 `flowable:` 命名空间）。
- `src/assets/bpmn-theme.css`（或就近放 model 目录）：节点配色/字体主题 + `.bpmn-error` 错误高亮样式。
- `src/api/workflow/model.ts`：5 端点（page 走 form，save/delete/publish 走 JSON，get 走 GET）。
- `src/types/workflow.ts` 扩展：`WorkflowModel`/`WorkflowModelStatus`/`ModelSaveDTO`/`ModelPublishDTO`/`ModelPageParams`。
- `src/types/bpmn-js.d.ts`：手写最小模块声明（`bpmn-js/lib/Modeler`、`diagram-js-minimap`、CSS 资源 + asset 声明）让 TS 通过。

---

## 4. 新依赖

- `bpmn-js@^18`、`diagram-js-minimap@^5`（框架无关 vanilla JS + CSS）。
- **route-level 懒加载**：`/workflow/model` 路由本就动态 `import()`，`BpmnDesigner.vue` 静态 import bpmn-js → 落入该路由 chunk，不污染首屏 bundle。
- **Vite manualChunks**：bpmn-js 体积大，确认其进入按需 chunk（见 [[vue3-env-gotchas]]，必要时给 vite.config manualChunks 加一档 `bpmn`）。

---

## 5. 关键决策

1. **校验薄取数 + 纯函数分离**：`getSummary`（组件内从 `elementRegistry` 抽 `BpmnSummary`，薄 glue）+ `validateSummary`（纯函数，可测）。保持 vitest node 环境不引 jsdom（对齐 mes-new）。
2. **CustomRenderer（自绘节点）本周期不做**（最高风险，覆盖 diagram-js 渲染）→ backlog；本周期 theme css + 错误高亮足够。
3. **办理人两类互斥**：`buildAssigneeProps` 一类置值另一类 `undefined`（清除），导出 XML 带 `flowable:assignee=${initiator}` 或 `flowable:candidateGroups=角色code`。
4. **设计器宿主 = 全屏 `el-dialog`**（用户拍板）：单一入口、路由简单、bpmn-js 容器尺寸稳定；`destroy-on-close` 保证重挂载干净。
5. **生命周期**：Modeler `onMounted` 创建 / `onBeforeUnmount` `destroy`。Vue 无 React StrictMode 双挂载问题（[[r3f-strictmode-context-lost]] 不适用），但清理仍必须防 WebGL/DOM 泄漏。
6. **草稿可存**：保存不强制校验通过（校验是引导，非闸门），与 mes-new 一致。

---

## 6. 后端审查（按 [[backend-deepseek-review-each-cycle]] 每周期必审）

预期零改动，复核：
- `save` 唯一性 `.ne(id)` 排除自身（编辑不误判）+ 有 id 仅更新 name/key/xml 保留 status/version（发布不可逆 by-design）。
- `publish` upsert 定义 `def.id=model.id` + 新建 `enabled=true`。
- `delete` `@Transactional` 级联清定义 + 事件规则（def.id=model.id）。
- mes-new 周期 2n 已对同份后端端到端 curl 验证全过（含 bpmnXml `&`/`&lt;` 转义保留、唯一性拒绝、发布 upsert、级联删 DB 校验）。

若发现暴露 bug 才做最小纯新增修正 + 守卫单测；否则记 backlog。

---

## 7. 菜单 / 路由

- **菜单 192 已种**（`scripts/sql/workflow-flow-config.sql`，url `/workflow/model/list-ui`，perm `workflow:model:list`，挂流程配置工具组 19，**需手动跑**——1h 已要求跑该 SQL）。
- 前端：urlMap +1（`/workflow/model/list-ui` → `/workflow/model`，**删除 1h 留的占位注释**）+ router +1（`workflow/model`，name `workflow-model`，meta.perm `workflow:model:list`）。

---

## 8. 验证

- 前端门禁：`pnpm typecheck`(0) / `pnpm test`（+ bpmn utils TDD，总数较 293 上升） / `pnpm lint:check`(0 err) / `pnpm build`(✓，bpmn-js 独立/按需 chunk)。
- **Setup 风险提前验**：装 `bpmn-js@18`+`diagram-js-minimap@5` 后立即 import 冒烟（Vite8/rolldown 兼容，见 [[vue3-env-gotchas]]）——若构建报错优先解决再继续。
- 后端 `mvn compile`（若有改动）。
- subagent 驱动逐任务两阶段审查 + 后端独立审查 + opus 整体终审。
- **人工 :4200 冒烟待确认**：后端 9090 + DB 已跑 `workflow-config-tables.sql` + `workflow-flow-config.sql`，`admin/123` 登录 → 流程配置工具 → 流程模型设计：新建模型 → 设计（拖用户任务、连线、配办理人）→ 校验（缺结束事件/未配办理人 → 红色高亮 + toast）→ 保存 → 发布到分类 → 1h 流程定义页出现该定义。

---

## 9. 范围外（明确不做）

- CustomRenderer 自绘节点（backlog）。
- 流程运行时（实例/任务/审批/事件触发）——Cycle 之外，后端运行时表未接。
- 模型版本历史/回滚（后端 version 仅自增占位，不做 UI）。
- BPMN 导入外部 .bpmn 文件 / 导出下载（YAGNI，演示不需要）。

---

## 10. backlog（预登记，非阻塞）

- CustomRenderer 自绘节点（视觉深化）。
- bpmn-js d.ts 手写最小声明，`saveXML` 返回类型对真库乐观（真 `saveXML` 可能 undefined）→ `getXML` 加兜底（对齐 mes-new 2m-backlog）。
- `getSummary` 把「仅开始事件」的空模型算 1 个孤立节点（校验提示略噪，仅 toast 不阻断，完整流程为 0，演示不受影响）。
- 后端运行时（实例/任务/事件真正触发）留将来。
</content>
