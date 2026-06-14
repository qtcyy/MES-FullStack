# 配套出库（Kitting / Coordinated Outbound）功能设计

> 日期：2026-06-14
> 状态：已确认
> 分支：feature/manual-job-dispatch

## 1. 概述

实现 MES"配套出库"功能模块,围绕"台式电脑主机"生产任务,把零件按出库单从库存取出、配送到产线。配套出库是计划入库的下游:**系统依据物料入库时间按先入先出(FIFO)规则自动分配库存**。同时提供"手动入库"功能,在库存不足时补货。

### 1.1 业务流程（对齐 PPT）

1. 进入"配套出库确认",看到 2 个出库单,状态"待确认"
2. 对本次作业的零件逐条点击"出库登账"
3. 确认后完成单条出库登账(FIFO 自动扣库);配套必须齐全,再完成剩余零件
4. 库存不足的零件不能出库;急需时用"手动入库"补货

### 1.2 与计划入库的关系

复用计划入库已建的库存台账 `sp_inventory`(库位级)。出库登账按 FIFO 扣减库存;库位扣到 0 删除该库存行(释放库位)。本模块新建出库单主表/明细表,与入库模块对称。

### 1.3 技术约束

- Java 8, Spring Boot 2.1.7, MyBatis-Plus 3.1.2;React 18 + TS + Ant Design 5
- 遵循现有分层架构,实体继承 `BaseEntity`,沿用 `com.wangziyang.mes.inventory` 模块
- 复用现有库房/库位模块(`sp_warehouse` / `sp_warehouse_location`)与库存表(`sp_inventory`)

## 2. 数据模型

### 2.1 sp_outbound_order — 出库单主表

```sql
CREATE TABLE sp_outbound_order (
  id varchar(64) NOT NULL,
  outbound_code varchar(64) NOT NULL COMMENT '出库单号',
  order_id varchar(64) DEFAULT NULL COMMENT '工单ID',
  order_code varchar(255) DEFAULT NULL COMMENT '工单编号',
  product_code varchar(50) DEFAULT NULL COMMENT '产品编码',
  product_desc varchar(200) DEFAULT NULL COMMENT '产品描述',
  outbound_status varchar(20) DEFAULT 'pending' COMMENT 'pending=待确认 partial=部分出库 completed=已完成',
  total_items int DEFAULT 0 COMMENT '明细总条数',
  posted_items int DEFAULT 0 COMMENT '已登账条数',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_outbound_code (outbound_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='出库单主表';
```

### 2.2 sp_outbound_order_item — 出库单明细

```sql
CREATE TABLE sp_outbound_order_item (
  id varchar(64) NOT NULL,
  outbound_id varchar(64) NOT NULL COMMENT '关联出库单ID',
  material_code varchar(50) NOT NULL COMMENT '物料编码',
  material_desc varchar(200) DEFAULT NULL COMMENT '物料描述',
  unit varchar(20) DEFAULT NULL COMMENT '单位',
  quantity decimal(10,2) NOT NULL COMMENT '需出库数量',
  post_status varchar(20) DEFAULT 'pending' COMMENT 'pending=待登账 posted=已登账',
  allocation_detail varchar(500) DEFAULT NULL COMMENT 'FIFO扣减库位摘要,如"1-010102×50"',
  posted_at datetime DEFAULT NULL COMMENT '登账时间',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_outbound_id (outbound_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='出库单明细表';
```

### 2.3 库存复用

复用计划入库已建的 `sp_inventory`(库位级,`UNIQUE(location_id)`)。出库登账按 FIFO 扣减;库位 quantity 扣到 0 删除该行。手动入库向 `sp_inventory` 补货(upsert)。

### 2.4 种子数据

- **2 个出库单**(待确认,按生产顺序分批 — 约束5):
  - `CK20240817-00001` 台式电脑主机配套出库(批1):`PART-001`~`PART-004`,各 50
  - `CK20240817-00002` 台式电脑主机配套出库(批2):`PART-005`~`PART-008`,各 50
- **库存预置**:给 `PART-002`~`PART-008` 各预置 100(到 7 个空闲库位 `1-010101`/`1-010201`/`1-010202`/`1-020101`/`1-020102`/`1-020201`/`1-020202`),`PART-001` 已有库存。每条 `WHERE NOT EXISTS (material_code=X)` 守卫,幂等且不覆盖已有库存。
- 结果:8 个零件均有 ≥50 库存,两个出库单可直接登账。

> 库位编码与 `sp_warehouse_location` 种子一致;库存行 `warehouse_id='wh-parts-001'`、`warehouse_name='电脑配件库'`、`status='available'`。

## 3. 后端

### 3.1 实体 / Mapper / Service

| 实体 | 表 | Mapper | Service |
|------|-----|--------|---------|
| `SpOutboundOrder` | sp_outbound_order | `SpOutboundOrderMapper` | `ISpOutboundOrderService` / Impl |
| `SpOutboundOrderItem` | sp_outbound_order_item | `SpOutboundOrderItemMapper` | `ISpOutboundOrderItemService` / Impl |

- 手动入库加到现有 `ISpInventoryService.manualInbound(ManualInboundDTO)` / Impl(注入 `ISpWarehouseService` + `ISpWarehouseLocationService` 做校验)。
- FIFO 登账放 `ISpOutboundOrderService.postOutboundItem`,注入 `SpOutboundOrderItemMapper`、`SpInventoryMapper`。

### 3.2 FIFO 出库登账 `postOutboundItem(PostOutboundItemDTO)` — `@Transactional(rollbackFor=Exception.class)`

```
DTO: { itemId }
1. 查明细;断言 post_status='pending',否则报错"该明细已登账，请勿重复操作"
2. required = 明细 quantity
3. 查 sp_inventory WHERE material_code=明细物料 AND quantity>0
     ORDER BY last_inbound_time ASC, create_time ASC   (先入先出)
4. totalAvail = Σ quantity
     若 totalAvail < required → 报错"库存不足:可用 X，需出库 Y，无法出库"(约束1)
5. remaining=required;逐行(最早优先)扣减:
     take = min(行.quantity, remaining)
     行.quantity -= take;累计分配摘要 "库位编码×take"(take 用 stripTrailingZeros().toPlainString())
     若 行.quantity 比较等于 0 → inventoryMapper.deleteById(行.id)(释放库位);否则 updateById
     remaining -= take;remaining==0 时 break
6. 更新明细:post_status='posted'、posted_at=now、allocation_detail=分配摘要(", " 连接)
7. 更新出库单头:posted = selectCount(outbound_id 且 post_status='posted');
     posted_items=posted;outbound_status = posted>=total_items? 'completed':'partial'
```

数量比较用 `BigDecimal.compareTo`(非 `equals`)。`take = 行.quantity.min(remaining)`。

### 3.3 手动入库 `manualInbound(ManualInboundDTO)` — `@Transactional(rollbackFor=Exception.class)`

```
DTO: { materialCode, materialDesc, unit, warehouseId, locationId, quantity }
1. 库房校验:getById 存在 + 未删除 + type='零件库',否则报错
2. 库位校验:getById 存在 + 未删除 + warehouse_id 匹配,否则报错
3. 混放校验:按 location_id 查库存,已存且 material_code 不同 → 报错"该库位已存放物料 X，只能存放相同物料"
4. upsert:已存(同物料)→ quantity = quantity.add(qty),last_inbound_time=now,updateById;
     否则新建库存行(warehouse/location 信息 + quantity=qty,status='available',last_inbound_time=now)
```

### 3.4 Controller

| 端点 | 方法 | 请求体 | 说明 |
|------|------|--------|------|
| `/inventory/outbound/page` | POST | form (`SpOutboundPageReq`) | 分页查出库单(按单号、状态过滤) |
| `/inventory/outbound/{outboundId}/items` | GET | `@PathVariable` | 出库单明细 |
| `/inventory/outbound/item/post` | POST | `@RequestBody PostOutboundItemDTO` | **FIFO 出库登账** |
| `/inventory/manual-inbound` | POST | `@RequestBody ManualInboundDTO` | 手动入库 |

- 出库端点放新建 `SpOutboundController`(`@RequestMapping("/inventory/outbound")`)。
- 手动入库端点加到现有 `SpReceiptController`(`/inventory`),调用 `inventoryService.manualInbound`。
- `@Controller` + `@ResponseBody`,返回 `Result`,沿用现有模式。

### 3.5 DTO / Request
- `PostOutboundItemDTO { String itemId; }`
- `ManualInboundDTO { String materialCode; String materialDesc; String unit; String warehouseId; String locationId; java.math.BigDecimal quantity; }`
- `SpOutboundPageReq extends BasePageReq { String outboundCode; String outboundStatus; }`

## 4. 前端

### 4.1 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `types/outbound.ts` | 新建 | `OutboundOrder`、`OutboundOrderItem`、`ManualInboundDTO` + 状态映射 |
| `api/inventory/outbound.ts` | 新建 | `pageOutbounds`、`getItems`、`postOutboundItem`(JSON) |
| `api/inventory/inventory.ts` | 修改 | 增加 `manualInbound`(JSON) |
| `pages/inventory/OutboundList.tsx` | 新建 | 配套出库确认页 |
| `pages/inventory/ManualInboundPage.tsx` | 新建 | 手动入库页 |
| `App.tsx` | 修改 | 新增路由 `inventory/outbound`、`inventory/manual-inbound` |

### 4.2 OutboundList（配套出库确认）

```
PageContainer "配套出库确认"
 ├─ SearchForm:出库单号(Input)
 ├─ 出库单表格:单号(monospace)、工单、产品、状态Tag、进度(posted/total)、创建时间、操作[查看/登账]
 └─ 明细抽屉(Drawer,点查看打开):
      明细表格:物料编码、描述、单位、需出库数量、登账状态Tag、FIFO分配摘要(allocation_detail or '-')
       操作列:<PermissionGuard perm="inventory:outbound"> [出库登账](仅 pending 可点)
          → Popconfirm "确认出库登账?(系统按FIFO自动扣库)" → postOutboundItem({itemId})
       成功后:刷新明细 + 列表;明细行显示 已登账 + 分配摘要;全部登账后单据"已完成"
```
> 出库登账无需选库位(FIFO 自动分配),故用 Popconfirm 直接确认。失败(库存不足)时 message.error 显示后端消息。

### 4.3 ManualInboundPage（手动入库）

```
PageContainer "手动入库"
 └─ Card + Form(layout vertical, 限宽):
      物料(Select,取自物料列表 API,选中带出 materialDesc/unit)
      库房(Select,过滤 type='零件库' && deleted='0')
      库位(Select,选库房后联动 getLocations)
      数量(InputNumber, min 1)
      [提交补货] → manualInbound(dto);成功 message.success + 重置表单
```
> 物料下拉取自现有物料列表 API(实现时确认 `api/basedata/materile` 取列表函数;若无 list 函数则用 page 取一页)。库房/库位复用 `/basedata/warehouse/list` + `locations/{id}`。

### 4.4 状态映射（`types/outbound.ts`）
- 出库单:`pending`=待确认(蓝) / `partial`=部分出库(橙) / `completed`=已完成(绿)
- 明细:`pending`=待登账(default) / `posted`=已登账(绿)

## 5. 路由与菜单

```
父菜单 库存管理 (id=18) 下新增:
183  配套出库确认  /inventory/outbound        permission=inventory:outbound
184  手动入库      /inventory/manual-inbound  permission=inventory:inbound (复用)
```

- 菜单种子写入 `sp_sys_menu`(`grade='3'`, `type='0'`, `WHERE NOT EXISTS id` 守卫)。
- 路由注册在 `App.tsx` 的 AdminLayout 鉴权组内。

## 6. 错误处理

| 场景 | 处理 |
|------|------|
| 明细已登账 | "该明细已登账，请勿重复操作" |
| 库存不足 | "库存不足:可用 X，需出库 Y，无法出库" |
| 手动入库库房非零件库 | "请选择零件库类型的库房(如电脑配件库)" |
| 手动入库库位不属于库房 | "所选库位不属于该库房" |
| 手动入库库位混放 | "该库位已存放物料 X，只能存放相同物料" |

## 7. 验证清单

- [ ] migration 建 2 张表 + 种子(2 出库单/8 明细 + PART-002~008 库存)+ 菜单(183/184)
- [ ] 配套出库确认页查到 2 个出库单(待确认)
- [ ] 查看明细 → 各零件"待登账"
- [ ] 逐条出库登账 → FIFO 扣库成功,明细显示"已登账"+分配摘要(如 "1-010102×50")
- [ ] 出库后 `sp_inventory` 对应库位数量减少(扣到 0 的行被删除)
- [ ] 一个出库单全部登账 → 单据"已完成"
- [ ] 负向:对已登账明细再登账 → 报错;某零件库存清零后再出库 → "库存不足"
- [ ] 手动入库:选物料+库房+库位+数量提交 → 库存增加;库存明细查询可见
- [ ] 后端 `mvn compile` 通过;前端 `npm run build` 通过
