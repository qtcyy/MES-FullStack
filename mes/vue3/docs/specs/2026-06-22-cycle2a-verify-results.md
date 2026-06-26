# Cycle 2a 后端审查结论 — 库存模块

- 日期: 2026-06-22
- 审查人: vue3 前端周期独立审查 (Task 9)
- 范围: `mes/src/main/java/com/wangziyang/mes/inventory/` 的 5 个 ServiceImpl + 对应 Controller / DTO / Entity / Mapper / 建表 SQL
- 方式: 纯代码阅读复核 (READ-ONLY)，不假设此前 React 周期的 curl/MySQL 验证结论，独立重新推导
- 相关建表: `scripts/sql/planned-inbound.sql`、`scripts/sql/kitting-outbound.sql`

## 结论速览表

| ServiceImpl | 裁定 | 一句话理由 (file:line) |
|---|---|---|
| SpWarehouseReceiptServiceImpl | OK | 库存台账正确累加而非覆盖 (`existingQty.add(inboundQty)` line 110)；幂等守卫 (line 66-68)；`postedItems`/`receiptStatus` 由 DB 重算 (line 131-138)，事务完整 (line 59) |
| SpWarehouseReceiptItemServiceImpl | OK | 仅 `listByReceiptId` 只读查询 (line 18-22)，无写操作 |
| SpOutboundOrderServiceImpl | OK | `@Transactional` (line 51)；FIFO 按 `last_inbound_time,create_time` 升序 (line 69-70)；缺货前置校验 (line 78-81)；批次归零即删除 (line 95-96)；`allocationDetail` 已记录 (line 107) |
| SpOutboundOrderItemServiceImpl | OK | 仅 `listByOutboundId` 只读查询 (line 18-22)，无写操作 |
| SpInventoryServiceImpl | OK | `manualInbound` 同库位累加 (line 92)；混放/库房/库位/数量校验齐全；事务完整 (line 52) |

整体裁定: **OK — 无暴露级 BUG，未改动任何后端代码。**

## 逐项核对 (对照 Audit checklist)

### 1. 入库登账 postItem (SpWarehouseReceiptServiceImpl.java)
- **累加而非覆盖**: ✅ line 107-126。命中已有库位记录时执行 `existingQty.add(inboundQty)` (line 108-110) 后 `updateById`；无记录时 `insert` 新行。
- **库位唯一性支撑**: `sp_inventory` 表 `UNIQUE KEY idx_location (location_id)` (planned-inbound.sql:64)，且写前用 `selectOne(eq("location_id", ...))` (line 89-90) 取该库位唯一行，"一库位一物料"不变量成立，混放校验 (line 91-93) 与累加对象是同一行，逻辑自洽。
- **幂等**: ✅ `posted` 明细直接抛错拒绝重复登账 (line 66-68)。
- **状态机**: ✅ `postStatus`→`posted` (line 102)；`postedItems` 由 `selectCount(post_status=posted)` 从 DB 重算 (line 131-136) 而非自增，重算法对并发/重试更稳健；`receiptStatus = posted>=total ? completed : partial` (line 137)。
- 备注(非缺陷): 未显式回写 `pending`，但 `pending` 是种子默认值，且已登账明细不会回退，前端流不受影响。

### 2. 出库登账 FIFO postOutboundItem (SpOutboundOrderServiceImpl.java)
- **@Transactional**: ✅ line 51 `@Transactional(rollbackFor = Exception.class)`。
- **FIFO**: ✅ `orderByAsc("last_inbound_time").orderByAsc("create_time")` (line 69-70)，最早批次优先。
- **批次归零**: ✅ 取空 (`left == 0`) 即 `deleteById` (line 95-96)，否则 `updateById` 写回余量 (line 98-99)。
- **allocationDetail**: ✅ 逐批拼 `库位×数量` (line 94)，最终 `String.join(", ", ...)` 写入 (line 107)。
- **超量处理**: ✅ 先汇总 `totalAvail` 与 `required` 比较，不足则抛错整单回滚 (line 78-81)，绝不产生负库存；不做部分出库。
- 备注(设计而非缺陷): FIFO 仅按 `material_code` 跨全部库房/库位扣减 (line 65-67)，未限定库房——这是配套出库"按物料全局 FIFO"的预期语义，非 bug。

### 3. 手工入库 manualInbound (SpInventoryServiceImpl.java)
- **累加/去重**: ✅ 同库位命中累加 (line 90-94)，无记录 insert (line 95-108)，与 postItem 同模式。
- **入参/混放校验**: ✅ 数量>0 (line 55-57)、物料非空 (line 58-60)、库房存在+未停用+零件库 (line 63-69)、库位存在+未停用+归属库房 (line 72-78)、混放 (line 83-85)。
- **幂等关注点**: 手工入库本质是"叠加"语义，重复提交会重复叠加——但这是手工录入操作的正常预期(无业务单据幂等键)，与计划入库的明细级幂等不同，不属于缺陷。

### 4. 软删过滤
- `sp_inventory` / `sp_warehouse_receipt` / `sp_warehouse_receipt_item` / `sp_outbound_order` / `sp_outbound_order_item` 五张表 **均无 `is_deleted` 列**(见 planned-inbound.sql、kitting-outbound.sql 建表语句；`BaseEntity` 也不含逻辑删除字段)。因此分页/列表查询无需软删过滤——**不适用，非缺失**。
- 服务中确有的删除校验是针对 `sp_warehouse` / `sp_warehouse_location`(二者 `@TableField("is_deleted") private String deleted`)，代码用 `"1".equals(getDeleted())` 判定停用 (receipt line 72/81、inventory line 64/73)，语义正确。

### 5. 事务完整性
- 所有跨多写方法均已标注 `@Transactional(rollbackFor = Exception.class)`: postItem (line 59)、postOutboundItem (line 51)、manualInbound (line 52)。两个 ItemServiceImpl 仅有只读方法，无需事务。

### 6. 并发 (仅记录，列为 backlog)
- 库存台账 upsert 与 FIFO 扣减均无行锁/乐观锁/`select ... for update`。高并发同库位入库或同物料并发出库存在竞态(读-改-写丢失更新、或两单都通过缺货前置校验后扣成负数)。**LATENT(超出本周期范围)** ——单用户演示前端流不触发，建议后续以 `version` 乐观锁或 `update ... where quantity>=?` 原子扣减加固。

## 结论

库存后端在正常前端调用路径下行为正确：入库累加不覆盖、出库严格 FIFO 且缺货整单回滚、台账状态由 DB 重算保证一致、关键多写方法事务完整、软删过滤对本模块表不适用。**未发现暴露级 BUG，未改动任何后端代码，vue3 前端可按现状直接对接。** 唯一需登记的是并发无锁的 LATENT 风险，属后续加固项，不阻塞本周期。
