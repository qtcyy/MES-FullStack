# 子周期 1c-3 · BOM-工艺绑定 — 设计文档

- 日期：2026-06-20
- 分支：`feature/bom-flow`（从 `develop` 切）
- 所属：Cycle 1 · 工艺技术线收尾（1c-3）
- 参考：React 版 `mes/frontend/apps/mes-new`（路由 `/technology/process-flow`）= **功能/接口契约参考，绝不照抄 UI**
- 前序：1c-1 工艺路线（`OrderedTransfer`/`utils/technology`）、1c-2 产品 BOM（`utils/productBom`/`MasterDetailLayout`/`TreeTable`）

---

## 1. 目标与范围

给「产品 BOM 树」的每个节点**绑定一条工艺路线**，形成"哪个零件/半成品/产品走哪条工艺"的映射，并支持整树锁定冻结。

**本周期交付：**
- 单页双态页 `/technology/bom-flow`（菜单父 15「工艺管理」）。
- 浏览态：选产品根 → 进入绑定。
- 编辑态（主从）：左 BOM 结构树点选节点；右节点详情（信息卡 + 已绑工艺卡 + 只读工序链预览）；绑定/换绑/解绑；锁定整树工艺。

**明确不做（YAGNI）：**
- `update-remark` 端点：mes-new 页面亦未使用（备注随 `bind` 一并提交），本周期不接，记 backlog。
- 工序链编排 / `OrderedTransfer`：契约不支持（见 §2 关键约束）。
- 删除 BOM 节点时 `sp_bom_flow` 残留清理：跨模块，记 backlog。

---

## 2. 关键约束（后端契约决定的设计前提）

实连后端 `SpBomFlowController` / `SpBomFlowServiceImpl` / `sp_bom_flow` 表确认：

1. **一节点一路线**：`sp_bom_flow` 对 `bom_id` 有唯一约束 `uk_bom_flow_bom` → 每个 BOM 节点最多绑一条工艺路线。
2. **绑定即换绑**：`bind` 端点内部走 `replaceBinding`（`@Transactional(rollbackFor=Exception.class)` 先删后插，status='draft'）→ 绑定与换绑是**同一个动作**，无"有序多选"语义。
3. **工序链只读**：工序链是工艺路线（1c-1）自带的，本页只**只读预览**，不编排。
4. **结论**：绑定 = 给节点选 **1 条**工艺路线（单选下拉）+ 备注。`OrderedTransfer`（构建有序列表）在此用不上——路线图原预估"复用 OrderedTransfer"与真实契约不符，**放弃**。

---

## 3. 后端接口契约（已存在，零新增端点）

基础路由 `@RequestMapping("/technology/bom-flow")`。

| 端点 | 方法 | URL | 编码 | 入参 | 返回 |
|---|---|---|---|---|---|
| 产品根列表 | GET | `/products` | query | — | `SpProductBom[]`（所有根 BOM） |
| 节点+绑定列表 | GET | `/list/{rootId}` | query | `rootId`（path） | `BomFlowNodeVO[]`（扁平，含 bomNode/bomFlow/flow/opers） |
| 工艺路线全表 | GET | `/flows` | query | — | `SpFlow[]`（绑定下拉用） |
| 工序链预览 | GET | `/opers/{flowId}` | query | `flowId`（path） | `FlowOperItem[]`（`{relation, oper}`） |
| 绑定/换绑 | POST | `/bind` | **JSON** | `{bomId, flowId, remark?}` | `string`（新绑定 id） |
| 解绑 | POST | `/unbind` | **JSON** | `{bomId}` | `null` |
| 锁定整树 | POST | `/lock/{rootId}` | **JSON** | `rootId`（path）, body `{}` | `null` |
| ~~改备注~~ | POST | `/update-remark` | JSON | `{id, remark}` | `null` | **本周期不接** |

> 编码约定（`api/request.ts`）：GET 走 query；JSON 端点用 `http.post(url, data, true)`（第三参 true 强制 `application/json`）。

### 实体 / 表
`sp_bom_flow`（继承 `BaseEntity`）：`bomId` / `flowId` / `status`('draft'|'locked') / `remark` / `sortOrder`；唯一键 `uk_bom_flow_bom(bom_id)`，索引 `idx_flow_id`。

### 锁定语义（务必精确镜像 mes-new）
- **`canWrite`（可绑/换/解的前提）** = `rootStatus !== 'locked'` **且** `(bind?.status ?? 'draft') !== 'locked'` **且** `bomNode.status !== 'locked'`。
- **「锁定工艺」按钮仅当 `rootStatus === 'locked'` 时启用**——即 BOM 结构须先在 1c-2 产品 BOM 页锁定，本页才能把工艺绑定一并冻结为只读、不可撤销。
- 工作流：draft 态绑定各节点 → 1c-2 锁 BOM 结构（rootStatus→locked）→ 本页「锁定工艺」把绑定 status→locked（一次性、不可逆）。

---

## 4. 前端实现

### 4.1 目录与组件（`src/views/technology/bom-flow/`）

| 文件 | 职责 |
|---|---|
| `BomFlowPage.vue` | 编排：双态切换、`bomFlowList` 取数、选中节点派生、对话框开关、mutation 后刷新；浏览态产品下拉 + 「进入绑定」也并入此页 |
| `BomNodeFlowDetail.vue` | 右面板：节点信息卡（名称/层级/编码/状态）+ 已绑工艺卡（路线名/描述 + 绑/换/解按钮，`canWrite` 控 disabled）+ 只读工序链预览（`DataTable`：序号/工序描述/首末道标记） |
| `FlowBindDialog.vue` | 绑定/换绑弹窗：`FormDialog` + **单选工艺路线下拉**（`bomFlowFlows()`）+ 备注 textarea；提交 `bomFlowBind` |

- 左树复用通用 `TreeTable`（`col-nodeName` 插槽做点选高亮，列：节点名/层级/已绑工艺/状态徽章）。
- 主从复用 `MasterDetailLayout`（`#master` 树 / `#detail` 详情 / `#detail-empty` 占位）。
- 字段名直接用业务名（Vue `el-form`+reactive 无 React RHF 的 DOM clobbering 坑；沿用 1c-2 经验）。

### 4.2 纯函数（`src/utils/bomFlow.ts`，TDD）

| 函数 | 签名 | 说明 |
|---|---|---|
| `buildBomNodeTree` | `(items: BomFlowNodeVO[]) => BomFlowTreeNode[]` | 扁平→树：按 `bomNode.parentId` 建父子，同级按 `bomNode.sortOrder` 升序（移植 mes-new `buildBomNodeTree`） |
| `canWriteBomFlow` | `(rootStatus?, bindStatus?, nodeStatus?) => boolean` | 三重锁定判定（§3） |
| `buildBindPayload` | `(bomId, flowId, remark?) => {bomId, flowId, remark?}` | 组装 bind 入参，剥空 remark |
| `flowOperRows` | `(opers?: FlowOperItem[]) => OperPreviewRow[]` | 预览行：`{seq, operDesc, mark}`（mark 由 `relation.operType` firstOper/lastOper 派生） |

### 4.3 API（`src/api/technology/bomFlow.ts`）+ 类型（`types/technology.ts` 增补）

- 7 个端点函数（products/list/flows/opers GET；bind/unbind/lock JSON `http.post(...,true)`）。`update-remark` 不实现。
- 类型增补：`SpBomFlow`、`BomFlowNodeVO`（`{bomNode: SpProductBom; bomFlow?: SpBomFlow|null; flow?: SpFlow|null; opers?: FlowOperItem[]}`）、`FlowOperItem`（`{relation: SpFlowOperRelation; oper?: SpOper|null}`）。复用已有 `SpFlow`/`SpProductBom`/`SpOper`/`SpFlowOperRelation`。

### 4.4 取数与状态（`BomFlowPage.vue`）

- `useRequest(bomFlowProducts, {immediate:true})` → 浏览态下拉。
- 进入绑定：`editingRootId = pickedRootId` → `useRequest(() => bomFlowList(editingRootId))` 拉扁平数据。
- computed 派生：`treeData = buildBomNodeTree(flat)`；`selected = flat.find(x => x.bomNode.id === selectedBomId)`；`rootStatus`/`rootName`；`canWrite = canWriteBomFlow(rootStatus, selected?.bomFlow?.status, selected?.bomNode?.status)`。
- 写操作（bind/unbind/lock）成功后重新 `bomFlowList(editingRootId)` 刷新；`ElMessageBox.confirm` 守解绑/锁定。

---

## 5. 接入（菜单 / 路由）

- 新种子 `scripts/sql/bom-flow-menu-seed.sql`：菜单 **id=155**「BOM工艺绑定」，父 15，grade '3'，url `/technology/bom-flow/list-ui`，permission `bom-flow:add`（**需手动跑**；与 1c-1/1c-2 种子同风格，幂等 INSERT）。
- `utils/urlMap`：加 `/technology/bom-flow/list-ui` → `/technology/bom-flow`。
- `router/index.ts`：加 1 路由 `{ path: 'technology/bom-flow', name: 'technology-bom-flow', component: () => import('@/views/technology/bom-flow/BomFlowPage.vue'), meta: { title: 'BOM工艺绑定', perm: 'bom-flow:add' } }`。

---

## 6. 后端审查（按 backend-deepseek-review-each-cycle，必做）

`SpBomFlowController` / `SpBomFlowServiceImpl` 多为生成代码，逐文件审查重点：

1. `bind` 锁定校验是否完整（root / 现有 bind / node 三态拦截，与前端 `canWrite` 对齐）。
2. `unbind` / `lock` 的事务与状态守卫（`lock` 要求 root 已锁定；`unbind` 双重锁定检查）。
3. `list` 端点 N+1 查询（逐节点回查 flow/opers）——演示规模可容忍，仅记 backlog，不优化。
4. 跨模块：删除 BOM 节点时 `sp_bom_flow` 残留——记 backlog，本周期不动。

原则：只做**最小、暴露的正确性修复** + Mockito 守卫单测（JUnit4；注意 `Result extends HashMap` 取 `get("code")`、MP 3.1.2 `count()` 返回 `int`、`@InjectMocks` 须 mock 全部注入字段）。

---

## 7. 测试与质量门禁

- Vitest 纯函数单测：`buildBomNodeTree`（建树/排序/多根）、`canWriteBomFlow`（三态组合）、`buildBindPayload`（剥空 remark）、`flowOperRows`（首末道标记/空态）。
- 门禁全绿：`pnpm typecheck` 0 / `pnpm test` / `pnpm lint:check` 0 err / `pnpm build` ✓。
- 后端：`mvn compile` BUILD SUCCESS（JDK11）+ 守卫单测绿。
- subagent 驱动逐任务两阶段审查 + opus 终审；spec/plan 落 `docs/specs|plans/2026-06-20-cycle1c3-bom-flow*`。

---

## 8. 验收（人工 :4200 冒烟，待用户）

需后端 9090 + 已跑 `scripts/sql/bom-flow-menu-seed.sql`（+ 1c-2 的 `product-bom.sql` 建表与数据）：
`admin/123` 登录 → 工艺管理 → BOM工艺绑定 → 选产品根 → 进入绑定 → 左树点节点 → 绑定工艺路线（下拉选 + 备注）→ 右侧工序链预览出现 → 换绑（换另一条）→ 解绑 → 回 1c-2 锁 BOM 结构 → 回本页「锁定工艺」→ 全部绑定变只读。
