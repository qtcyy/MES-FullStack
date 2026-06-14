# 计划入库（Planned Warehouse Receipt / 入库登账）功能设计

> 日期：2026-06-14
> 状态：已确认
> 分支：feature/manual-job-dispatch

## 1. 概述

实现 MES"计划入库"功能模块，用于"台式电脑主机"所采购物料的入库过程。计划入库配合物料需求计划（MRP）执行：当 MRP 下发后生成"入库申请单"，库房管理员对入库单明细**逐条登账**——选择库房与库位，确认后物料进入库存台账，状态变为"可用"。

### 1.1 业务流程（对齐 PPT）

1. 进入"计划入库确认"菜单，看到一张入库单 `RK20240817-00001` 处于"待确认"
2. 对入库单明细**逐条**点击"入库登账"
3. 库房选择"电脑配件库"（零件库），并确认
4. 库位选择自定义；**只有相同物料才能入同一库位**，每个库位编码唯一
5. 点击"确认登账"
6. 查询该入库单，确认某零件状态为"已登账"
7. 把剩余所有零件全部"入库登账"
8. 进入"库存明细查询"，按登账日期查询，确认所有零件状态"可用"

### 1.2 与 MRP 的关系（解耦）

本模块**独立实现**：自建入库单主表 + 明细表，用种子数据预置 `RK20240817-00001`。MRP 留待后续单独实现，届时由 MRP 下发生成 `source_type='MRP'` 的入库单，本模块登账逻辑不变。

### 1.3 技术约束

- Java 8, Spring Boot 2.1.7, MyBatis-Plus 3.1.2
- React 18 + TypeScript + Ant Design 5
- 遵循现有分层架构（`controller → service/impl → mapper + entity/dto/request`）
- 实体继承 `BaseEntity`（雪花 ID + `create/update` 字段自动填充）
- 复用现有库房/库位模块（`sp_warehouse` / `sp_warehouse_location`）

## 2. 核心思路

**库存台账采用「库位级明细」模型**：`sp_inventory` 每行 = 一个库位存一种物料，`UNIQUE(location_id)` 强制"一库位一物料"，登账时累加数量。既满足 PPT 的库位选择/混放校验，又能按 `material_code` 聚合（未来 MRP 计算"可用库存"可直接复用）。

**登账采用「逐条 + 事务」**：每条明细单独选择库房 + 库位登账，事务内原子更新「明细 + 库存台账 + 入库单头状态」三者。

> 已排除方案：库存只记物料总量（不记库位）——无法支撑 PPT 的库位选择与库存明细查询。

## 3. 数据模型

### 3.1 sp_warehouse_receipt — 入库单主表

```sql
CREATE TABLE sp_warehouse_receipt (
  id varchar(64) NOT NULL COMMENT '主键',
  receipt_code varchar(64) NOT NULL COMMENT '入库单号',
  source_type varchar(20) DEFAULT 'MANUAL' COMMENT '来源:MRP/MANUAL',
  plan_id varchar(64) DEFAULT NULL COMMENT '关联MRP计划ID(可空,未来MRP下发填入)',
  order_id varchar(64) DEFAULT NULL COMMENT '工单ID',
  order_code varchar(255) DEFAULT NULL COMMENT '工单编号',
  product_code varchar(50) DEFAULT NULL COMMENT '产品编码',
  product_desc varchar(200) DEFAULT NULL COMMENT '产品描述',
  receipt_status varchar(20) DEFAULT 'pending' COMMENT 'pending=待确认 partial=部分登账 completed=已完成',
  total_items int DEFAULT 0 COMMENT '明细总条数',
  posted_items int DEFAULT 0 COMMENT '已登账条数',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_receipt_code (receipt_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='入库单主表';
```

### 3.2 sp_warehouse_receipt_item — 入库单明细表

```sql
CREATE TABLE sp_warehouse_receipt_item (
  id varchar(64) NOT NULL COMMENT '主键',
  receipt_id varchar(64) NOT NULL COMMENT '关联入库单ID',
  material_code varchar(50) NOT NULL COMMENT '物料编码',
  material_desc varchar(200) DEFAULT NULL COMMENT '物料描述',
  unit varchar(20) DEFAULT NULL COMMENT '单位',
  quantity decimal(10,2) NOT NULL COMMENT '入库数量',
  warehouse_id varchar(64) DEFAULT NULL COMMENT '登账库房ID',
  warehouse_name varchar(64) DEFAULT NULL COMMENT '登账库房名称',
  location_id varchar(64) DEFAULT NULL COMMENT '登账库位ID',
  location_code varchar(32) DEFAULT NULL COMMENT '登账库位编码',
  post_status varchar(20) DEFAULT 'pending' COMMENT 'pending=待登账 posted=已登账',
  posted_at datetime DEFAULT NULL COMMENT '登账时间',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_receipt_id (receipt_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='入库单明细表';
```

### 3.3 sp_inventory — 库存表（库位级明细）

```sql
CREATE TABLE sp_inventory (
  id varchar(64) NOT NULL COMMENT '主键',
  material_code varchar(50) NOT NULL COMMENT '物料编码',
  material_desc varchar(200) DEFAULT NULL COMMENT '物料描述',
  unit varchar(20) DEFAULT NULL COMMENT '单位',
  warehouse_id varchar(64) NOT NULL COMMENT '库房ID',
  warehouse_name varchar(64) DEFAULT NULL COMMENT '库房名称',
  location_id varchar(64) NOT NULL COMMENT '库位ID',
  location_code varchar(32) DEFAULT NULL COMMENT '库位编码',
  quantity decimal(10,2) DEFAULT 0 COMMENT '库存数量',
  status varchar(20) DEFAULT 'available' COMMENT 'available=可用',
  last_inbound_time datetime DEFAULT NULL COMMENT '最近入库时间(供库存明细按日期查询)',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_location (location_id),
  KEY idx_material (material_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='物料库存表(库位级)';
```

### 3.4 种子数据（对齐 PPT）

- **库房**：`电脑配件库`（id=`wh-parts-001`, code=`WH-PARTS`, type=`零件库`, groups=1, rows=2, layers=2, columns=2）
- **库位**：`wh-parts-001` 下 8 个库位，编码 `1-010101`、`1-010102`、`1-010201`、`1-010202`、`1-020101`、`1-020102`、`1-020201`、`1-020202`
- **入库单**：`RK20240817-00001`（source_type=`MANUAL`, plan_id=NULL, order_code/product 关联台式电脑主机, receipt_status=`pending`, total_items=8, posted_items=0）
- **入库单明细**：8 条，对应 `PART-001`~`PART-008`（material_desc/unit 取自 `sp_materile` 种子），每条 `quantity=100`, post_status=`pending`

> 种子库位编码格式遵循现有 `SpWarehouseController.regenerateLocations()` 的 `{group}-{row2}{layer2}{col2}` 规则。

## 4. 后端 API

### 4.1 实体 / Service / Mapper

| 实体 | 表 | Mapper | Service |
|------|-----|--------|---------|
| `SpWarehouseReceipt` | sp_warehouse_receipt | `SpWarehouseReceiptMapper` | `ISpWarehouseReceiptService` / Impl |
| `SpWarehouseReceiptItem` | sp_warehouse_receipt_item | `SpWarehouseReceiptItemMapper` | `ISpWarehouseReceiptItemService` / Impl |
| `SpInventory` | sp_inventory | `SpInventoryMapper` | `ISpInventoryService` / Impl |

- 复用现有 `ISpWarehouseService`、`ISpWarehouseLocationService` 做库房/库位校验，无需新建。
- 登账核心逻辑放在 `ISpWarehouseReceiptService.postItem(PostItemDTO)`。

### 4.2 Controller：`SpReceiptController` `@RequestMapping("/inventory")`

放置于 `order` 模块或新建 `inventory` 子包（实现时确定，倾向新建 `com.wangziyang.mes.inventory`）。`@Controller` + `@ResponseBody`，继承 `BaseController`。

| 端点 | 方法 | 请求体 | 说明 |
|------|------|--------|------|
| `/inventory/receipt/page` | POST | form-encoded (`SpReceiptPageReq`) | 分页查入库单（按单号、状态过滤） |
| `/inventory/receipt/{receiptId}/items` | GET | `@PathVariable` | 查某入库单的明细列表 |
| `/inventory/receipt/item/post` | POST | `@RequestBody` JSON (`PostItemDTO`) | **入库登账（单条）** |
| `/inventory/page` | POST | form-encoded (`SpInventoryPageReq`) | 分页查库存明细（按物料、登账日期范围过滤） |

> 库房/库位下拉**复用** `GET /basedata/warehouse/list` + `GET /basedata/warehouse/locations/{id}`，前端按 `type='零件库'` 过滤。

### 4.3 DTO / Request

- `PostItemDTO { String itemId; String warehouseId; String locationId; }`
- `SpReceiptPageReq extends BasePageReq { String receiptCode; String receiptStatus; }`
- `SpInventoryPageReq extends BasePageReq { String materialCode; String startDate; String endDate; }`

### 4.4 登账事务 `postItem(PostItemDTO)` — `@Transactional(rollbackFor = Exception.class)`

```
1. 按 itemId 查明细；断言 post_status='pending'，否则报错"该明细已登账，请勿重复操作"
2. 查库房：存在 + 未删除 + type='零件库'，否则报错"请选择零件库类型的库房(如电脑配件库)"
3. 查库位：存在 + 未删除 + warehouse_id 匹配所选库房，否则报错"所选库位不属于该库房"
4. 混放校验：按 location_id 查 sp_inventory
     若已存在且 material_code ≠ 本明细物料 → 报错"该库位已存放物料 XXX，只能存放相同物料"
5. 更新明细：warehouse_id/name、location_id/code、post_status='posted'、posted_at=now
6. 库存台账 upsert：
     已存在(同物料) → quantity += 明细数量，last_inbound_time=now
     不存在 → 新建一行(quantity=明细数量，status='available'，last_inbound_time=now)
7. 更新入库单头：posted_items=已登账条数；
     若 posted_items==total_items → receipt_status='completed'，否则 'partial'
```

### 4.5 事务保证

- `postItem`：`@Transactional(rollbackFor=Exception.class)` — 明细 + 库存台账 + 入库单头三者原子更新，任一失败全回滚。
- 查询类端点：无事务。

## 5. 前端设计

### 5.1 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `types/inventory.ts` | 新建 | `WarehouseReceipt`、`WarehouseReceiptItem`、`InventoryRecord`、`PostItemDTO` + 状态映射 |
| `api/inventory/receipt.ts` | 新建 | `pageReceipts`、`getItems`、`postItem`（Content-Type: application/json） |
| `api/inventory/inventory.ts` | 新建 | `pageInventory` |
| `pages/inventory/ReceiptList.tsx` | 新建 | 计划入库确认页 |
| `pages/inventory/InventoryList.tsx` | 新建 | 库存明细查询页 |
| `App.tsx` | 修改 | 新增路由 `inventory/receipt`、`inventory/query` |

### 5.2 ReceiptList（计划入库确认）

```
PageContainer
 ├─ 入库单表格：单号、来源、工单、产品、状态Tag(待确认/部分登账/已完成)、进度(已登账/总数)、创建时间
 │    操作列：[查看明细/登账]
 └─ 明细抽屉(Drawer，点单号打开)：
      ├─ 入库单信息条
      └─ 明细表格：物料编码、描述、单位、数量、库房、库位、状态Tag(待登账/已登账)
           操作列：[入库登账](仅 待登账 可点)
            └─ 登账 Modal：库房下拉(零件库，默认电脑配件库) → 库位下拉(联动该库房库位) → [确认登账]
```

- 登账成功 → 刷新明细 + 入库单列表；全部登账后单据状态变"已完成"。
- 库房下拉调 `/basedata/warehouse/list` 并过滤 `type==='零件库'`；选库房后调 `/basedata/warehouse/locations/{id}` 取库位。
- 登账操作用 `<PermissionGuard perm="inventory:inbound">` 包裹。

### 5.3 InventoryList（库存明细查询）

```
PageContainer
 ├─ SearchForm：物料编码 + 登账日期范围(RangePicker)
 └─ 库存表格：物料编码、描述、库房、库位、数量、状态Tag(可用/绿色)、最近入库时间
```

### 5.4 状态映射（`types/inventory.ts`）

- 入库单：`pending`=待确认(蓝) / `partial`=部分登账(橙) / `completed`=已完成(绿)
- 明细：`pending`=待登账(灰) / `posted`=已登账(绿)
- 库存：`available`=可用(绿)

## 6. 路由与菜单

```
库存管理 (一级菜单, parent_id=0, icon=数据库/仓库)
 ├─ 计划入库确认   /inventory/receipt   permission=inventory:inbound
 └─ 库存明细查询   /inventory/query     permission=inventory:query
```

- 菜单种子写入 `sp_menu`；具体 `id`/`sort` 在实现时对照现有 `sp_menu` 种子选取不冲突的值。
- 权限字符串通过菜单树加载进前端权限 `Set`，`PermissionGuard` 校验。

## 7. 错误处理

| 场景 | 处理 |
|------|------|
| 明细已登账 | 报错"该明细已登账，请勿重复操作" |
| 库房非零件库 | 报错"请选择零件库类型的库房(如电脑配件库)" |
| 库位不属于所选库房 | 报错"所选库位不属于该库房" |
| 库位混放（已存其他物料） | 报错"该库位已存放物料 XXX，只能存放相同物料" |
| 入库单无明细 | 明细列表正常显示为空，不报错 |

## 8. 验证清单

- [ ] migration 建 3 张表并写入种子（库房 + 8 库位 + 入库单 + 8 明细）
- [ ] 计划入库确认页查到 `RK20240817-00001`，状态"待确认"
- [ ] 查看明细 → 8 个零件均"待登账"
- [ ] 对第一个零件登账（电脑配件库 + 某库位）→ 状态"已登账"
- [ ] 其余 7 个零件全部登账 → 入库单状态"已完成"
- [ ] 库存明细查询（按登账日期）→ 8 个零件状态"可用"
- [ ] 混放校验：将不同物料登账到已占用库位 → 报错
- [ ] 重复登账同一明细 → 报错
- [ ] 前端 `tsc --noEmit` + `vite build` 无错误
- [ ] 后端 `mvn compile` 通过
