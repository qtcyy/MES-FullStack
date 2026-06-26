# Cycle 2a · 库存管理 — 设计文档

- 日期：2026-06-22
- 分支：`feature/inventory`（从 `develop` 切）
- 周期：Cycle 2 首个子周期（库存 + 剩余基础数据 + 组织 → 本支只做库存）
- 参考实现：`mes/frontend/apps/mes-new`（周期 2h，仅参考接口契约与功能，**绝不照抄其 UI**）

---

## 1. 目标与范围

用 Vue3 实现库存管理模块的四个页面，对接后端**已存在**的 8 个端点，**零后端生产代码改动**（仅按每周期约定做后端审查，发现真 bug 才最小修正 + 守卫单测）。

四页一次性交付（共享 types/api/状态纯函数，是一个内聚模块）：

| 页面 | 路由 | 形态 | 核心交互 |
|---|---|---|---|
| 计划入库确认 | `/inventory/receipt` | 主从（`MasterDetailLayout`） | 左入库单列表（搜索/分页）→ 右明细面板；逐明细行「登账」→ 占用感知库位选择弹窗 |
| 配套出库确认 | `/inventory/outbound` | 主从 | 左出库单 → 右明细；逐行「FIFO 登账」确认弹窗（只传 itemId，后端按最早批次扣减） |
| 库存明细查询 | `/inventory/query` | 只读列表 | 物料/仓库搜索 + 分页 + 状态徽标 |
| 手动入库 | `/inventory/manual-inbound` | 表单页 | 物料编码/描述/单位/数量 + 占用感知库位选择 → 提交 |

**关键约束（已核实）：**
- 入库/出库单**无创建端点**——controller 只有 `page/items/post`，单据是上游（演示数据）产生的。故四页是**登账工作流**，不是"新建单据"。
- 建表 + 演示单据 + 菜单（18 库存管理 → 181~184 四页）全部由仓库根目录**已存在**的 `scripts/sql/planned-inbound.sql` + `kitting-outbound.sql` 创建（mes-new 2h 时已写好，本 worktree 共享 git 仓库）。**vue3 本支零新增 SQL**。
- 四个菜单 url 已是**干净 SPA 路径**（`/inventory/receipt`、`/inventory/query`、`/inventory/outbound`、`/inventory/manual-inbound`），非 `*-list-ui`，故 urlMap 基本零改动（plan 阶段核实 `toSpaRoute` 对无映射干净路径的透传行为）；router 加 4 条路由匹配这些路径。

**非目标（YAGNI / 本支不做）：**
- 不做"新建入库/出库单"UI（后端无端点）。
- 不改后端分页上限（`PaginationInterceptor` 默认上限属既有 backlog，与 mes-new 一致记 backlog）。
- 不做库存预警/盘点等后端未提供的功能。

---

## 2. 后端契约（8 端点）

| 端点 | 方法/编码 | 入参 | 出参 |
|---|---|---|---|
| `/inventory/receipt/page` | POST form | `{current, size, ...搜索}` | `IPage<SpWarehouseReceipt>` |
| `/inventory/receipt/{receiptId}/items` | GET | path | `SpWarehouseReceiptItem[]` |
| `/inventory/receipt/item/post` | POST JSON | `{itemId, warehouseId, locationId}` | void |
| `/inventory/outbound/page` | POST form | `{current, size, ...搜索}` | `IPage<SpOutboundOrder>` |
| `/inventory/outbound/{outboundId}/items` | GET | path | `SpOutboundOrderItem[]` |
| `/inventory/outbound/item/post` | POST JSON | `{itemId}` | void |
| `/inventory/page` | POST form | `{current, size, ...搜索}` | `IPage<SpInventory>` |
| `/inventory/manual-inbound` | POST JSON | `{materialCode, materialDesc, unit, warehouseId, locationId, quantity}` | void |

**编码约定**（沿用项目惯例）：page 三个走 form（`http.post(url, params)`）；items 两个 GET；item/post 两个 + manual-inbound 走 JSON 体（`http.post(url, dto, true)`）。

**实体字段**（来自后端 entity，已核）：
- `SpWarehouseReceipt`：receiptCode/sourceType/planId/orderId/orderCode/productCode/productDesc/receiptStatus/totalItems/postedItems（+ BaseEntity id/时间）
- `SpWarehouseReceiptItem`：receiptId/materialCode/materialDesc/unit/quantity/warehouseId/warehouseName/locationId/locationCode/postStatus/postedAt
- `SpOutboundOrder`：outboundCode/orderId/orderCode/productCode/productDesc/outboundStatus/totalItems/postedItems
- `SpOutboundOrderItem`：outboundId/materialCode/materialDesc/unit/quantity/postStatus/allocationDetail/postedAt
- `SpInventory`：materialCode/materialDesc/unit/warehouseId/warehouseName/locationId/locationCode/quantity/status/lastInboundTime

---

## 3. 占用感知库位选择

入库登账 + 手工入库共用 `LocationSelect.vue`：

- 选定库房后，并行拉 `warehouse.locations(warehouseId)`（该库房全部库位）+ 全量 `pageInventory`（size 拉大兜底，取当前库存占用）。
- 交叉比对（`locationId` 关联）算出每个库位对**目标物料**的可用性：
  - `空闲`：该库位无任何库存
  - `已存本物料·可累加`：该库位已有目标物料
  - `已占他物料`：该库位被其它物料占用
- 下拉选项标注可用性文案（纯函数 `locationAvailability` / `locationOptionLabel`，从 mes-new 移植）。
- **标注纯属交互引导，不阻断提交**——后端 post 无论选哪个库位都会正确累加同物料（or 占用他物料库位也允许，由后端决定）。

---

## 4. 文件清单

**类型**（扩展 `types/inventory.ts`）：补 `SpWarehouseReceipt`/`SpWarehouseReceiptItem`/`SpOutboundOrder`/`SpOutboundOrderItem` + 三个 DTO（`PostReceiptItemDTO`/`PostOutboundItemDTO`/`ManualInboundDTO`）+ 分页参数；`SpInventory` 补全字段对齐实体。

**API**：
- 新建 `api/inventory/receipt.ts`（pageReceipts / receiptItems / postReceiptItem）
- 新建 `api/inventory/outbound.ts`（pageOutbounds / outboundItems / postOutboundItem）
- 扩展 `api/inventory/stock.ts`（已有 pageInventory，加 `manualInbound`）
- 复用 `api/basedata/warehouse.ts`（1f 已加 list + locations）

**纯函数**（新建 `utils/inventory.ts`，TDD，预计 ~18-22 例）：
- `receiptStatusMeta` / `outboundStatusMeta` / `postStatusMeta`（状态 → 文案 + Element Plus tag type）
- `progressText` / `progressPercent`（登账进度 posted/total，防除零）
- `locationAvailability` / `locationOptionLabel`（占用感知）
- `buildManualInboundPayload` / `validateManualInbound`（手工入库剥空 + 必填/数值校验）

**视图**（`views/inventory/`）：
- `ReceiptPage.vue`（主从）+ `ReceiptItemsPanel.vue` + `ReceiptPostDialog.vue`
- `OutboundPage.vue`（主从）+ `OutboundItemsPanel.vue` + `OutboundPostDialog.vue`
- `InventoryQueryPage.vue`（只读列表）
- `ManualInboundPage.vue`（表单页）
- `LocationSelect.vue`（占用感知库位选择器，入库 + 手工入库共用）

**路由 + urlMap**：router 加 4 条路由（`/inventory/receipt|query|outbound|manual-inbound`）；urlMap 视 `toSpaRoute` 透传行为决定是否加映射（plan 阶段核实）。

**表单受控**：登账弹窗 / 手工入库表单用 Element Plus `el-form` + `reactive`（Vue 无 React 的 DOM clobbering 坑，字段名直接用，参考 1c-2 约定）。

---

## 5. 后端审查（按每周期必审约定）

逐文件读 inventory 5 个 ServiceImpl，重点核：
1. 入库 `postItem` 写库存台账的 upsert 累加 + `postStatus`/`postedItems`/`receiptStatus` 一致性
2. 出库 `postOutboundItem` 的 `@Transactional` 与 FIFO（最早批次先扣）正确性
3. 手工入库去重/累加
4. 各 page 软删过滤

mes-new 周期 2h/2k 已端到端验证过同份后端代码（当时结论无暴露 bug，FIFO/幂等正确）。本周期仍独立复核，发现真 bug 才最小修正 + Mockito 守卫单测（JUnit4，对齐同包 `Cycle1*BackendTest` 风格）。

---

## 6. 验证与交付

- **前端门禁**：`pnpm typecheck` 0 / `pnpm test` 全绿（含新增 `utils/inventory` 纯函数）/ `pnpm lint:check` 0 err / `pnpm build` ✓
- **后端**：若有修正则 `mvn compile` BUILD SUCCESS + 守卫单测绿（JDK11 corretto）
- **流程**：subagent 驱动逐任务两阶段审查 + opus 终审 Ready to merge
- **人工冒烟（:4200，admin/123）前置**：后端 9090 + DB 跑 `scripts/sql/planned-inbound.sql` + `scripts/sql/kitting-outbound.sql`（建表 + 演示单据 + 菜单 181~184）
  - 计划入库确认：选入库单 → 看明细 → 某行登账 → 选库房（占用感知库位）→ 登账后状态/进度更新
  - 配套出库确认：选出库单 → 看明细 → FIFO 登账确认 → 状态更新
  - 库存明细查询：搜索/分页 → 状态徽标
  - 手动入库：填物料/单位/数量 + 占用感知库位 → 提交 → 库存查询可见
- **收尾**：`--no-ff` 合 `develop`；更新 ROADMAP（库存矩阵 4 行 → ✅）

spec/plan：`mes/vue3/docs/specs|plans/2026-06-22-cycle2a-inventory*`。

---

## 7. Backlog（非阻塞）

- `pageInventory` 用大 size 兜底全量（占用感知 + 3D 共用），后端 `PaginationInterceptor` 默认上限隐患（与 mes-new 2h/2k、vue3 1f 同款，记 backlog 不改）。
- 占用感知每次开弹窗都全量拉库存，库存量大时可优化为按库房过滤的轻量查询（演示规模无碍）。
- 状态枚举若后端实际值与假设（pending/partial/completed/posted）不符，以实连 DB / curl 实测为准（plan 阶段或实现期校正）。
