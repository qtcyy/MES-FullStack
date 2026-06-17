# 周期 2h · 库存管理 — 设计文档

- 日期：2026-06-17
- 范围：`apps/mes-new` 前端新建库存管理 4 个页面，对接后端**已存在**的 8 个端点
- 前置：系统管理 / 基础数据（含仓库 + 物料）/ 工艺技术线 / 生产订单+甘特 均已完成
- 排期共识：基础数据 → 工艺技术线(✅) → 生产订单(✅含甘特) → **库存(本周期)** → 数字化

---

## 1. 目标与范围

在活跃前端 `mes/frontend/apps/mes-new` 重建库存管理模块，一个周期完成 4 个页面，对接后端 `com.wangziyang.mes.inventory` 已实现的 8 个端点。

**后端范围（最小原则）：零生产代码改动。** 已通过逐文件读码审查，确认现有逻辑正确（详见 §2.3）。仅可选补 Mockito 守卫单测以固化行为、作为审查证据。

业务本质不是普通 CRUD，而是**"登账(post)"工作流**：入库单/出库单带 `pending` 明细，逐行登账 → 库存台账增减。

4 页 ↔ 预置菜单路由（**必须精确匹配**，否则侧边栏点不到——侧边栏由 `sp_sys_menu` 驱动）：

| 路由 | 页面 | 形态 | 菜单 id |
|---|---|---|---|
| `/inventory/receipt` | 计划入库确认 | 主从 + 弹窗登账 | 181 |
| `/inventory/query` | 库存明细查询 | 纯列表（只读）| 182 |
| `/inventory/outbound` | 配套出库确认 | 主从 + 确认登账 | 183 |
| `/inventory/manual-inbound` | 手动入库 | 表单页 | 184 |

父菜单：`18 库存管理`（url=`#`）。

---

## 2. 后端契约（已确认，零改动）

### 2.1 端点

| 方法 | 路径 | 编码 | 入参 | 出参 | 控制器 |
|---|---|---|---|---|---|
| POST | `/inventory/receipt/page` | form | receiptCode, receiptStatus, current, size | `IPage<SpWarehouseReceipt>` | SpReceiptController |
| GET | `/inventory/receipt/{receiptId}/items` | — | path | `List<SpWarehouseReceiptItem>` | SpReceiptController |
| POST | `/inventory/receipt/item/post` | **JSON** | `{itemId, warehouseId, locationId}` | void | SpReceiptController |
| POST | `/inventory/page` | form | materialCode, startDate, endDate, current, size | `IPage<SpInventory>` | SpReceiptController |
| POST | `/inventory/manual-inbound` | **JSON** | `{materialCode, materialDesc, unit, warehouseId, locationId, quantity}` | void | SpReceiptController |
| POST | `/inventory/outbound/page` | form | outboundCode, outboundStatus, current, size | `IPage<SpOutboundOrder>` | SpOutboundController |
| GET | `/inventory/outbound/{outboundId}/items` | — | path | `List<SpOutboundOrderItem>` | SpOutboundController |
| POST | `/inventory/outbound/item/post` | **JSON** | `{itemId}` | void | SpOutboundController |

**易错点：**
- 库存查询端点是 `/inventory/page`（挂在 ReceiptController 上），**不是** `/inventory/inventory/page`。
- 出库列表是 `/inventory/outbound/page`（OutboundController 的 `@RequestMapping("/inventory/outbound")` + `@PostMapping("/page")`）。
- 3 个 `post` 端点用 `@RequestBody` → 前端必须用 `JSON_HEADERS` 跳过默认 form 编码；3 个 `page` 端点无 `@RequestBody` → 走默认 form 编码。

### 2.2 实体字段（来自后端实体，作前端类型依据）

全部实体继承 `BaseEntity`：`id`(雪花串)、`createTime`、`createUsername`、`updateTime`、`updateUsername`。

- **SpWarehouseReceipt**（入库单主表 `sp_warehouse_receipt`）：`receiptCode`, `sourceType`, `planId`, `orderId`, `orderCode`, `productCode`, `productDesc`, `receiptStatus`(pending/partial/completed), `totalItems`(Integer), `postedItems`(Integer)
- **SpWarehouseReceiptItem**（入库明细 `sp_warehouse_receipt_item`）：`receiptId`, `materialCode`, `materialDesc`, `unit`, `quantity`(BigDecimal), `warehouseId`, `warehouseName`, `locationId`, `locationCode`, `postStatus`(pending/posted), `postedAt`
- **SpOutboundOrder**（出库单主表 `sp_outbound_order`）：`outboundCode`, `orderId`, `orderCode`, `productCode`, `productDesc`, `outboundStatus`(pending/partial/completed), `totalItems`, `postedItems`
- **SpOutboundOrderItem**（出库明细 `sp_outbound_order_item`）：`outboundId`, `materialCode`, `materialDesc`, `unit`, `quantity`(BigDecimal), `postStatus`(pending/posted), `allocationDetail`(FIFO 分配摘要，如 `库位A×10, 库位B×5`), `postedAt`
- **SpInventory**（库存台账 `sp_inventory`，库位级）：`materialCode`, `materialDesc`, `unit`, `warehouseId`, `warehouseName`, `locationId`, `locationCode`, `quantity`(BigDecimal), `status`(available), `lastInboundTime`

`quantity` 为 `BigDecimal`，JSON 序列化为数字，前端类型用 `number`。

### 2.3 审查结论（逐文件读码，evidence-based）

按 [[backend-deepseek-review-each-cycle]] 完成审查。探查 agent 标记的两个"疑似 bug" **经核实均为误报**：

1. **`post_status='posted'` 一致性** — 赋值与统计查询完全一致：
   - `SpWarehouseReceiptServiceImpl.postItem()` 行102 `item.setPostStatus("posted")` ↔ 行134 `.eq("post_status","posted")` ✓
   - `SpOutboundOrderServiceImpl.postOutboundItem()` 行105 ↔ 行116 ✓
   - 进度统计正确（在同一事务内先 update 后 count）。
2. **FIFO 事务安全** — `postOutboundItem()` 行51 有 `@Transactional(rollbackFor=Exception.class)`，多行 UPDATE+DELETE 中途失败整体回滚，不存在半扣。

三个写方法（`postItem` / `postOutboundItem` / `manualInbound`）均有：事务、零件库类型校验、库位归属校验、混放校验（一库位一物料）、库存充足校验，业务逻辑完整。

**结论：现有 8 端点无阻塞性 bug，本周期后端零生产代码改动。** 已知缺口（库存流水表 / 出库单创建端点 / 盘点）属本周期范围外，本周期不做（用户已选最小后端范围）。

---

## 3. 文件结构（全部新增）

```
mes/frontend/apps/mes-new/src/
├── api/inventory/
│   ├── receipt.ts      # pageReceipts / receiptItems / postReceiptItem
│   ├── outbound.ts     # pageOutbounds / outboundItems / postOutboundItem
│   └── stock.ts        # pageInventory(库存查询) / manualInbound
├── types/inventory.ts  # 5 实体 + 3 分页参数 + 3 DTO 类型
└── pages/inventory/
    ├── inventoryStatus.ts          # 纯函数:状态→中文标签/色变体、进度计算(vitest)
    ├── inventoryStatus.test.ts     # 纯函数单测
    ├── receipt/
    │   ├── ReceiptList.tsx         # 主从主页(左单据列表)
    │   ├── ReceiptItemsPanel.tsx   # 右明细面板
    │   └── ReceiptPostDialog.tsx   # 入库登账弹窗(选库房→级联库位)
    ├── outbound/
    │   ├── OutboundList.tsx        # 主从主页
    │   ├── OutboundItemsPanel.tsx  # 右明细面板
    │   └── OutboundPostDialog.tsx  # 出库登账确认弹窗(FIFO 自动)
    ├── query/
    │   └── InventoryQuery.tsx      # 库存明细查询(只读列表)
    └── manual/
        └── ManualInbound.tsx       # 手动入库表单页
```

- 路由注册进 `router.tsx`：AdminLayout 下 4 个 `/inventory/*`。
- 复用 `api/basedata/warehouse.ts`（`warehousePage` / `warehouseLocations(warehouseId)`）与 `api/basedata/materile.ts`（`materilePage`）。
- 复用组件：`DataTable` / `MasterDetailLayout` / `RelatedPanel` / `SearchForm` / `FormDialog` / `FormField` / `PageContainer` / `PermissionGuard`。
- 参考样板：`pages/basedata/device-group/`（主从 + 关联面板）、`pages/basedata/warehouse/`（主从只读）。

---

## 4. 页面设计

### ① 计划入库确认 `/inventory/receipt`（主从右面板）

- **左**：入库单列表 `DataTable` + `SearchForm`（单号 / 状态）。列：单号、来源(sourceType)、订单号、产品(productDesc)、状态徽章、进度 `postedItems/totalItems`、创建时间。`POST /inventory/receipt/page`。
- **右**：选中行 → `RelatedPanel` 展示明细 `GET /inventory/receipt/{id}/items`。明细列：物料编码、描述、数量、状态徽章、（已登账显示库房/库位）、操作。
- **登账**：未登账(`pending`)行点【登账】→ `FormDialog`（`ReceiptPostDialog`）：
  - 选**库房**（下拉，客户端过滤 `type==='零件库'`）→ 选定后级联加载**库位** `warehouseLocations(warehouseId)`。
  - 提交 `postReceiptItem({itemId, warehouseId, locationId})`（JSON）。
  - 混放/归属/零件库校验由后端把关，前端仅必填校验；后端业务异常经响应拦截器统一 `toast.error(msg)`。
- **成功后 invalidate**：`['inventory','receipt',id,'items']` + `['inventory','receipt']`（进度/状态变化）+ `['inventory','stock']`（库存增加）。

### ② 库存明细查询 `/inventory/query`（只读）

- `SearchForm`（物料编码 materialCode、起止日期 startDate/endDate）+ `DataTable`。
- 列：物料编码、描述、单位、库房(warehouseName)、库位(locationCode)、数量、状态、最近入库时间(lastInboundTime)。
- `POST /inventory/page`。无写操作。

### ③ 配套出库确认 `/inventory/outbound`（主从右面板）

- **左**：出库单列表（单号 / 状态搜索）。列：出库单号、订单号(orderCode)、产品、状态、进度、创建时间。`POST /inventory/outbound/page`。
- **右**：明细面板 `GET /inventory/outbound/{id}/items`。明细列：物料、数量、状态、分配明细 `allocationDetail`（已登账显示）、操作。
- **登账**：未登账行点【出库登账】→ **确认弹窗**（`OutboundPostDialog`，FIFO 自动分配，无需选库位，提示"将按先进先出自动扣减库存"）→ `postOutboundItem({itemId})`（JSON）。库存不足由后端拦截 toast。
- **成功后 invalidate**：`['inventory','outbound',id,'items']` + `['inventory','outbound']` + `['inventory','stock']`（库存减少）。

### ④ 手动入库 `/inventory/manual-inbound`（表单页）

- `PageContainer` + 卡片表单：
  - 物料（`materilePage` 搜索选择，选定后带出 `materialDesc` / `unit`）
  - 库房（零件库下拉）→ 级联库位
  - 数量（number，>0）
- 提交 `manualInbound({materialCode, materialDesc, unit, warehouseId, locationId, quantity})`（JSON）。
- 成功：`toast.success` + 重置表单 + invalidate `['inventory','stock']`。

---

## 5. 数据流 / 缓存键

- 读：自研 `useQuery$`（`@ngify/http` + rxjs）；写：`useMutation$` + 成功后 `invalidate` 前缀匹配。
- 缓存键：
  - `['inventory','receipt']`（列表）、`['inventory','receipt', id, 'items']`（明细）
  - `['inventory','outbound']`（列表）、`['inventory','outbound', id, 'items']`（明细）
  - `['inventory','stock']`（库存查询）
- 登账/手动入库成功后按 §4 各页 invalidate 对应前缀，列表与库存自动刷新（无整页刷新）。

---

## 6. 错误处理 / 空态 / 加载态

- 后端业务异常（混放冲突、库存不足、非零件库、库位不属于该库房、重复登账）→ 响应拦截器统一 `toast.error(msg)`，抛 `BusinessError`；前端不重复实现业务规则，仅做必填/数字基本校验。
- 空态：未选单据时右面板提示"请选择左侧单据查看明细"；明细空、列表空给空态。
- 加载态：`useQuery$ loading` 驱动；提交中禁用按钮（`useMutation$ loading`）。

---

## 7. 测试策略

- **前端纯函数**：`inventoryStatus.ts`（状态→中文标签/色变体映射、`postedItems/totalItems` 进度计算）写 `inventoryStatus.test.ts`。vitest node 环境仅收 `*.test.ts`，组件不做渲染测（沿用本项目约定）。先写 failing test → 实现 → 通过（TDD）。
- **后端（可选，推荐）**：给 `postItem` / `postOutboundItem` / `manualInbound` 补 Mockito 守卫单测（混放冲突 / 库存不足 / 重复登账 / FIFO 跨库位扣减 / 非零件库），固化已验证的正确行为。沿用甘特周期(2g-3)先例。**这是仅有的允许的后端改动（测试代码，无生产代码）。**

---

## 8. 验证计划

- 静态：`pnpm --filter mes-new exec tsc --noEmit`、`pnpm lint`、`pnpm build`（贴实际输出）。
- 后端（若加单测）：系统 `mvn test -Dtest=...`（JDK11+；`./mvnw` 已坏，见 [[backend-build-mvnw-broken]]）。
- 人工双端联调：后端 :9090 + 前端 :4100；先应用 seed → 登录（图形验证码人工）→ 走查 4 页全链路：
  入库登账（选库房库位）→ 库存查询见增量 → 出库登账（FIFO）→ 库存查询见减量 → 手动入库 → 库存查询见增量。
- 多 agent 审查：spec 合规审查 + 代码质量审查，各一轮 fix + re-review。

---

## 9. 风险 / 依赖

- **Seed 与菜单必须落库**：菜单 `18 / 181~184` 未应用则侧边栏点不到（[[menu-driven-sidebar-route-mapping]]）；库存/单据 seed（`scripts/sql/planned-inbound.sql` + `kitting-outbound.sql`）未应用则页面空。计划阶段确认 dev DB 是否已应用，未应用给出幂等应用步骤。
- **库房类型过滤**：`warehousePage` 若无 `type` 入参则客户端过滤 `零件库`（seed 仅一个电脑配件库 `wh-parts-001`）。
- **无法脚本化鉴权**（登录需图形验证码），后端联调靠人工。
- `quantity` 为后端 `BigDecimal` → JSON 数字 → 前端 `number`。

---

## 10. 交付物清单

- `api/inventory/{receipt,outbound,stock}.ts`
- `types/inventory.ts`
- `pages/inventory/inventoryStatus.ts` + `inventoryStatus.test.ts`
- `pages/inventory/receipt/{ReceiptList,ReceiptItemsPanel,ReceiptPostDialog}.tsx`
- `pages/inventory/outbound/{OutboundList,OutboundItemsPanel,OutboundPostDialog}.tsx`
- `pages/inventory/query/InventoryQuery.tsx`
- `pages/inventory/manual/ManualInbound.tsx`
- `router.tsx` 注册 4 路由
- （可选）后端 Mockito 守卫单测
