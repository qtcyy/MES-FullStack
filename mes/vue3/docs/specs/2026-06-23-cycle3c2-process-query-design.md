# Cycle 3c-2 工艺查询只读页 — 设计文档

- 日期：2026-06-23
- 分支：`feature/process-query`（从 `develop` 切）
- 状态：设计已确认，待写实现计划
- 目标：交付 `/technology/process-query`（菜单 116），按产品浏览 BOM 结构，**纯只读**查看各节点已编制的工艺文件。**Cycle 3 收官，整条业务线完结。**

---

## 1. 背景与定位

3c-1（`feature/process-content`，已合入 develop）交付了工艺**内容编制**页 `/technology/process-content`：浏览→主从→7 Tab 可编辑编辑器 + 状态机（draft 可编/completed 只读）+ 设备/文档子资源 CRUD + 多图/PDF 上传。

3c-2 是 Cycle 3 的最后一支：**工艺查询只读页**。它与编制页共享同一份后端工艺内容数据，但**纯查看**——无任何编辑/上传/状态变更入口。这是 mes-new 周期 2k 已交付的 `ProcessQueryPage.tsx` 的 Vue3 镜像（功能/接口对齐，UI 不照抄）。

### 为什么不复用编制页的编辑器

3c-1 的 `ProcessContentEditor.vue` 当 `status==='completed'` 时本就只读（按钮禁用、无增删上传），但它仍携带完整表单 reactive 模型、save/complete/设备文档 CRUD、上传 handler、watch 回填等编辑机器，且会渲染禁用态的「保存主信息/完成编制」按钮——对纯查询页不合适。

**决策（用户已确认）：独立只读查看器**，不改动刚交付的 3c-1 编辑器（隔离、零回归风险），也避免在已 387 行的编辑器文件里塞入第二套关注点。

---

## 2. 范围

### In scope
- 新页 `/technology/process-query`（浏览态：产品下拉 → **选产品即展开主从** + 自动选中产品根节点）。
- 只读 7 Tab 查看器（完整镜像编制页 7 个 Tab）。
- 复用 3c-1 已有的 4 个只读 GET 端点，**零后端生产代码改动**。
- 后端只读审查（按每周期审查约定，对 4 个 GET 端点核验，预期零 bug——mes-new 2k 已端到端验证同份后端）。
- 菜单 116 路由接入（urlMap +1 / router +1）。

### Out of scope（YAGNI）
- 任何写操作：编辑、保存、完成、设备/文档增删、图片/PDF 上传。
- 工艺路线绑定、BOM 结构编辑（属 1c 系列，已完成的独立页）。
- 旧扁平工艺 BOM（`/technology/bom`，菜单 152），按 1c-2 既定不实现。
- 后端任何改动（除非审查发现暴露 bug，按"最小纯新增"原则处理）。

---

## 3. 组件结构（2 个新文件）

目录：`src/views/technology/process-query/`

### 3.1 `ProcessQueryPage.vue`（编排）
- 浏览态：`PageContainer` + 产品 `el-select`（filterable，数据来自 `pcProducts`）。
- **选中产品即展开** `MasterDetailLayout`（不再有"进入查看"按钮，区别于 process-content 的两态）：
  - 左 `master`：`TreeTable`（BOM 树，列：节点名称 / 层级 / 编制状态徽标），点击节点 `selectNode(bomId)`。
  - 右 `detail`：`ProcessQueryDetail`（`:key="selectedBomId"` 切节点重挂）。
  - `#detail-empty`：`el-empty` 提示"请选择左侧节点"。
- **自动选中产品根节点**：选产品后 `selectedBomId = rootId`（镜像 mes-new `onPickProduct`）。
- 取数 + `selToken` 守卫：照搬 ProcessContentPage 的 `selectNode`（`Promise.all([pcGet, pcBomItems])` + token 防快速切节点乱序 + catch 降级空详情），**去掉所有写操作**（无 onSave/onComplete/reloadNode/saving）。
- 切换产品时重置 `selectedBomId` 与 `detail`，重新 `pcList` 建树。

### 3.2 `ProcessQueryDetail.vue`（只读查看器）
- props：`{ bomId, detail: ProcessContentDetail, bomItems: SpProductBomItem[] }`，无 emits。
- 顶部：节点状态徽标（已完成/草稿/未编制，复用编制器同逻辑）。**无操作按钮。**
- `el-tabs` 7 Tab（**完整镜像编制页**，全只读）：
  1. **主信息**：`mainInfo`、`content`（`el-input type=textarea readonly` 或纯文本展示）+ 工序图（`MultiImageUpload :disabled` + `:urls`，无图给"暂无图片"占位）。
  2. **工序要求**：`requirements`（readonly textarea / 文本）。
  3. **检验**：是否需要检验（`el-tag` 是/否，由 `inspectionToBool(inspectionRequired)` 派生）+ 检验图（`MultiImageUpload :disabled`）。
  4. **注意事项**：`notes`（readonly）。
  5. **工装设备**：只读 `el-table`（设备名称 / 数量 / 备注），无操作列，空态 `el-empty`。
  6. **技术文档**：只读 `el-table`（文档名称 `el-link target=_blank` 预览），无删除列，空态 `el-empty`。
  7. **物料清单**：只读 `el-table`（物料编码 / 描述 / 数量 / 单位），空态 `el-empty`。

> 只读文本展示统一用 `el-input ... readonly`（含 `type=textarea`，与编制页视觉一致，已确认）；图片区复用 `MultiImageUpload :disabled`（已支持），文档/物料/设备复用原生 `el-table`（与编制器子表一致，子表不分页故不用 DataTable）。**不加额外查询页搜索过滤**（保持范围最小，纯镜像 mes-new）。

---

## 4. 数据流

复用 `src/api/technology/processContent.ts` 的 4 个 GET：
- `pcProducts()` → 产品根 BOM 列表（下拉）。
- `pcList(rootId)` → 该产品全量节点列表 → `buildTreeFromList` 建树。
- `pcGet(bomId)` → `ProcessContentDetail`（content + equipment + documents + contentImageUrls + inspectionImageUrls）。
- `pcBomItems(bomId)` → 物料清单。

无 mutation。后端图片 key 由 `get` 端点重签为可访问 URL（3c-1 已验，单次重签不双签）。

---

## 5. 复用 vs 新增

### 复用（不重定义）
- 组件：`TreeTable` / `MasterDetailLayout` / `PageContainer` / `MultiImageUpload`（`:disabled`）。
- 工具：`buildTreeFromList` / `parseCsvKeys` / `inspectionToBool`（均 3c-1 已 TDD）。
- 类型：`SpProductBom` / `SpProductBomItem` / `ProcessContentDetail` / `ProcessContentTreeNode` / `SpProcessEquipment` / `SpProcessDocumentVO`（`@/types/technology`）。
- API：`pcProducts` / `pcList` / `pcGet` / `pcBomItems`。

### 新增纯函数（唯一新增逻辑，TDD）
- `levelLabel(level?: number): string` → `0→产品 / 1→半成品 / ≥2→组件`，加进 `src/utils/processContent.ts`，TDD ~4 例（0 / 1 / 2 / undefined 边界）。镜像 mes-new 的层级文案。

---

## 6. 菜单与路由

- 实现时**先核验 dev DB 菜单 116** 的真实 `url` 与 `permission`：
  - 预期 perm `process-query:list`（对齐 mes-new 2k）。
  - 若菜单 116 已存在 → urlMap +1（其后端 list-ui url → `/technology/process-query`）+ router +1。
  - 若 dev DB 无菜单 116 → 新增幂等 `scripts/sql/process-query-menu-seed.sql`（父 15 工艺管理，需手动跑），形式对齐 3c-1/既往 seed。
- router：`path: '/technology/process-query'`，`name: 'technology-process-query'`，`component` 路由级懒加载（独立 chunk），`meta: { perm: 'process-query:list', title: '工艺查询' }`。

---

## 7. 后端审查（按 backend-deepseek-review-each-cycle）

对 4 个只读 GET 端点核验：
- `/products`、`/list/{rootId}`、`/get/{bomId}`、`/bom-items/{bomId}` 是否正确过滤软删 / 图片 key 单次重签不双签 / 树列表含根节点。
- 预期 ZERO EXPOSED BUGS（mes-new 2f 修 12 bug + 2k curl 验证、3c-1 后端审查均已覆盖同份后端代码）。
- 若发现暴露 bug，按"最小纯新增/纯修正"原则处理并补守卫单测。

---

## 8. 验证与门禁

- 前端：`pnpm typecheck`（0）/ `pnpm test`（全绿，含 levelLabel 新增用例）/ `pnpm lint:check`（0 err，容忍既有 warn）/ `pnpm build`（✓，查询页独立懒加载 chunk）。
- 流程：subagent 驱动逐簇两阶段审查（基础层/查看器/编排页+接线/后端审查）+ opus 整体终审 READY TO MERGE。
- 收尾：`feature/process-query` → `--no-ff` 合 `develop`；更新 ROADMAP + memory；人工 :4200 冒烟待用户确认。

---

## 9. 风险与已知项

- **菜单 116 url 未实证**：实现首步必须查 dev DB 确认 url/perm，避免侧栏点不到（[[menu-driven-sidebar-route-mapping]]）。
- **遗留图片数据双签 latent**（3c-1-backlog 同款）：旧记录若存完整 URL 而非裸 key，`get` 重签可能图坏——属 3c-1/2f 图片管线遗留，非本周期 bug，新数据不触发。记 3c-2-backlog。
- **Vue el-form 无 React RHF 的 DOM clobbering 坑**（[[rhf-field-name-dom-clobbering]] 仅 React 适用）——本页纯只读、无表单提交，更无此风险。
