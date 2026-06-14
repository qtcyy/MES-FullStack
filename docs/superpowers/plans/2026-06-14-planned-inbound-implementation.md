# 计划入库（Planned Warehouse Receipt / 入库登账）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 MES "计划入库" 模块：库房管理员对入库申请单明细逐条登账（选库房+库位），物料进入库存台账并可按日期/物料查询。

**Architecture:** 新建 `com.wangziyang.mes.inventory` 后端模块（3 实体 + 3 Mapper + 3 Service + 1 Controller），复用现有 `sp_warehouse`/`sp_warehouse_location` 模块做库房/库位校验；登账核心为单条事务（明细 + 库存台账 + 入库单头原子更新）。前端新增「库存管理」一级菜单下两个页面（计划入库确认 + 库存明细查询）。本模块与 MRP 解耦，用种子数据预置入库单 `RK20240817-00001`。

**Tech Stack:** Java 8 / Spring Boot 2.1.7 / MyBatis-Plus 3.1.2；React 18 + TS + Vite 5 + Ant Design 5 + TanStack Query。

**测试约定：** 本项目 service 层为 MyBatis-Plus 的 DB CRUD，无内存库/独立单测框架（派工模块亦如此）。遵循既有约定，以 `mvn compile`（后端）+ `npm run build`（前端）+ 运行期按 PPT 步骤集成验证 替代单元测试。每个任务完成即提交。

---

## 文件结构总览

**后端（新建 `mes/src/main/java/com/wangziyang/mes/inventory/`）**
- `entity/SpWarehouseReceipt.java` — 入库单主表实体
- `entity/SpWarehouseReceiptItem.java` — 入库单明细实体
- `entity/SpInventory.java` — 库存台账实体
- `mapper/SpWarehouseReceiptMapper.java` / `SpWarehouseReceiptItemMapper.java` / `SpInventoryMapper.java`
- `service/ISpWarehouseReceiptService.java` / `ISpWarehouseReceiptItemService.java` / `ISpInventoryService.java`
- `service/impl/SpWarehouseReceiptServiceImpl.java`（含登账事务 `postItem`）/ `SpWarehouseReceiptItemServiceImpl.java` / `SpInventoryServiceImpl.java`
- `dto/PostItemDTO.java`
- `request/SpReceiptPageReq.java` / `SpInventoryPageReq.java`
- `controller/SpReceiptController.java`

**SQL（新建 `scripts/sql/planned-inbound.sql`）** — 3 张表 + 种子（库房/8 库位/入库单/8 明细）+ 菜单（18/181/182）

**前端（新建 `mes/frontend/src/`）**
- `types/inventory.ts`
- `api/inventory/receipt.ts` / `api/inventory/inventory.ts`
- `pages/inventory/ReceiptList.tsx` / `pages/inventory/InventoryList.tsx`
- 修改 `App.tsx`（新增 2 条路由）

---

## Task 1: 数据库迁移（建表 + 种子 + 菜单）

**Files:**
- Create: `scripts/sql/planned-inbound.sql`

- [ ] **Step 1: 编写迁移 SQL**

创建 `scripts/sql/planned-inbound.sql`：

```sql
-- Planned Inbound (计划入库) Module
-- Creates sp_warehouse_receipt, sp_warehouse_receipt_item, sp_inventory tables,
-- seed data (电脑配件库 + 8 locations + RK20240817-00001 + 8 items), and menu entries.

-- ============ 1. 表结构 ============
CREATE TABLE IF NOT EXISTS sp_warehouse_receipt (
  id varchar(64) NOT NULL COMMENT '主键',
  receipt_code varchar(64) NOT NULL COMMENT '入库单号',
  source_type varchar(20) DEFAULT 'MANUAL' COMMENT '来源:MRP/MANUAL',
  plan_id varchar(64) DEFAULT NULL COMMENT '关联MRP计划ID(可空)',
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

CREATE TABLE IF NOT EXISTS sp_warehouse_receipt_item (
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

CREATE TABLE IF NOT EXISTS sp_inventory (
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
  last_inbound_time datetime DEFAULT NULL COMMENT '最近入库时间',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_location (location_id),
  KEY idx_material (material_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='物料库存表(库位级)';

-- ============ 2. 种子：电脑配件库（零件库） ============
INSERT INTO sp_warehouse (id, code, name, type, `groups`, `rows`, `layers`, `columns`, descr, is_deleted, create_time, create_username, update_time, update_username)
SELECT 'wh-parts-001', 'WH-PARTS', '电脑配件库', '零件库', 1, 2, 2, 2, '台式电脑零件入库专用', '0', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_warehouse WHERE id = 'wh-parts-001');

-- ============ 3. 种子：8 个库位（1-RRLLCC 格式） ============
INSERT INTO sp_warehouse_location (id, warehouse_id, code, group_no, row_no, layer_no, col_no, is_deleted, create_time, create_username, update_time, update_username)
SELECT * FROM (
  SELECT 'loc-parts-01' AS id, 'wh-parts-001' AS warehouse_id, '1-010101' AS code, 1 AS group_no, 1 AS row_no, 1 AS layer_no, 1 AS col_no, '0' AS is_deleted, NOW() AS create_time, 'admin' AS create_username, NOW() AS update_time, 'admin' AS update_username
  UNION ALL SELECT 'loc-parts-02','wh-parts-001','1-010102',1,1,1,2,'0',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'loc-parts-03','wh-parts-001','1-010201',1,1,2,1,'0',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'loc-parts-04','wh-parts-001','1-010202',1,1,2,2,'0',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'loc-parts-05','wh-parts-001','1-020101',1,2,1,1,'0',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'loc-parts-06','wh-parts-001','1-020102',1,2,1,2,'0',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'loc-parts-07','wh-parts-001','1-020201',1,2,2,1,'0',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'loc-parts-08','wh-parts-001','1-020202',1,2,2,2,'0',NOW(),'admin',NOW(),'admin'
) t
WHERE NOT EXISTS (SELECT 1 FROM sp_warehouse_location WHERE warehouse_id = 'wh-parts-001');

-- ============ 4. 种子：入库单 RK20240817-00001（待确认） ============
INSERT INTO sp_warehouse_receipt (id, receipt_code, source_type, plan_id, order_id, order_code, product_code, product_desc, receipt_status, total_items, posted_items, create_time, create_username, update_time, update_username)
SELECT 'rcpt-20240817-001', 'RK20240817-00001', 'MANUAL', NULL, NULL, 'GD20240817-001', 'PROD-001', '台式电脑主机', 'pending', 8, 0, NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_warehouse_receipt WHERE receipt_code = 'RK20240817-00001');

-- ============ 5. 种子：8 条入库明细（PART-001~008，各 100） ============
INSERT INTO sp_warehouse_receipt_item (id, receipt_id, material_code, material_desc, unit, quantity, post_status, create_time, create_username, update_time, update_username)
SELECT * FROM (
  SELECT 'item-rcpt-01' AS id, 'rcpt-20240817-001' AS receipt_id, 'PART-001' AS material_code, 'CPU i7-13700K' AS material_desc, '个' AS unit, 100 AS quantity, 'pending' AS post_status, NOW() AS create_time, 'admin' AS create_username, NOW() AS update_time, 'admin' AS update_username
  UNION ALL SELECT 'item-rcpt-02','rcpt-20240817-001','PART-002','DDR5 32GB 内存','条',100,'pending',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'item-rcpt-03','rcpt-20240817-001','PART-003','SSD 1TB NVMe','个',100,'pending',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'item-rcpt-04','rcpt-20240817-001','PART-004','主板 Z790','个',100,'pending',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'item-rcpt-05','rcpt-20240817-001','PART-005','CPU散热器','个',100,'pending',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'item-rcpt-06','rcpt-20240817-001','PART-006','机箱外壳 ATX','个',100,'pending',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'item-rcpt-07','rcpt-20240817-001','PART-007','电源 750W 金牌','个',100,'pending',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'item-rcpt-08','rcpt-20240817-001','PART-008','散热风扇 120mm','个',100,'pending',NOW(),'admin',NOW(),'admin'
) t
WHERE NOT EXISTS (SELECT 1 FROM sp_warehouse_receipt_item WHERE receipt_id = 'rcpt-20240817-001');

-- ============ 6. 菜单：库存管理（一级）+ 计划入库确认 + 库存明细查询 ============
INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '18', 'inventory', '库存管理', '#', '0', '0', 8, '0', 'user:add', 'database', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '18');

INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '181', 'inventoryReceipt', '计划入库确认', '/inventory/receipt', '18', '3', 1, '0', 'inventory:inbound', 'flag', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '181');

INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '182', 'inventoryQuery', '库存明细查询', '/inventory/query', '18', '3', 2, '0', 'inventory:query', 'file-text', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '182');
```

- [ ] **Step 2: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add scripts/sql/planned-inbound.sql
git commit -m "feat: 新增计划入库迁移脚本 — 3张表+种子+菜单"
```

> 实际执行迁移与数据校验在 Task 8 集成验证统一进行。

---

## Task 2: 后端实体 + Mapper

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/inventory/entity/SpWarehouseReceipt.java`
- Create: `mes/src/main/java/com/wangziyang/mes/inventory/entity/SpWarehouseReceiptItem.java`
- Create: `mes/src/main/java/com/wangziyang/mes/inventory/entity/SpInventory.java`
- Create: `mes/src/main/java/com/wangziyang/mes/inventory/mapper/SpWarehouseReceiptMapper.java`
- Create: `mes/src/main/java/com/wangziyang/mes/inventory/mapper/SpWarehouseReceiptItemMapper.java`
- Create: `mes/src/main/java/com/wangziyang/mes/inventory/mapper/SpInventoryMapper.java`

- [ ] **Step 1: 入库单主表实体 `SpWarehouseReceipt.java`**

```java
package com.wangziyang.mes.inventory.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

@TableName("sp_warehouse_receipt")
public class SpWarehouseReceipt extends BaseEntity {

    private String receiptCode;
    private String sourceType;
    private String planId;
    private String orderId;
    private String orderCode;
    private String productCode;
    private String productDesc;
    private String receiptStatus;
    private Integer totalItems;
    private Integer postedItems;

    public String getReceiptCode() { return receiptCode; }
    public void setReceiptCode(String receiptCode) { this.receiptCode = receiptCode; }
    public String getSourceType() { return sourceType; }
    public void setSourceType(String sourceType) { this.sourceType = sourceType; }
    public String getPlanId() { return planId; }
    public void setPlanId(String planId) { this.planId = planId; }
    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }
    public String getOrderCode() { return orderCode; }
    public void setOrderCode(String orderCode) { this.orderCode = orderCode; }
    public String getProductCode() { return productCode; }
    public void setProductCode(String productCode) { this.productCode = productCode; }
    public String getProductDesc() { return productDesc; }
    public void setProductDesc(String productDesc) { this.productDesc = productDesc; }
    public String getReceiptStatus() { return receiptStatus; }
    public void setReceiptStatus(String receiptStatus) { this.receiptStatus = receiptStatus; }
    public Integer getTotalItems() { return totalItems; }
    public void setTotalItems(Integer totalItems) { this.totalItems = totalItems; }
    public Integer getPostedItems() { return postedItems; }
    public void setPostedItems(Integer postedItems) { this.postedItems = postedItems; }
}
```

- [ ] **Step 2: 入库单明细实体 `SpWarehouseReceiptItem.java`**

```java
package com.wangziyang.mes.inventory.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@TableName("sp_warehouse_receipt_item")
public class SpWarehouseReceiptItem extends BaseEntity {

    private String receiptId;
    private String materialCode;
    private String materialDesc;
    private String unit;
    private BigDecimal quantity;
    private String warehouseId;
    private String warehouseName;
    private String locationId;
    private String locationCode;
    private String postStatus;
    private LocalDateTime postedAt;

    public String getReceiptId() { return receiptId; }
    public void setReceiptId(String receiptId) { this.receiptId = receiptId; }
    public String getMaterialCode() { return materialCode; }
    public void setMaterialCode(String materialCode) { this.materialCode = materialCode; }
    public String getMaterialDesc() { return materialDesc; }
    public void setMaterialDesc(String materialDesc) { this.materialDesc = materialDesc; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
    public String getWarehouseId() { return warehouseId; }
    public void setWarehouseId(String warehouseId) { this.warehouseId = warehouseId; }
    public String getWarehouseName() { return warehouseName; }
    public void setWarehouseName(String warehouseName) { this.warehouseName = warehouseName; }
    public String getLocationId() { return locationId; }
    public void setLocationId(String locationId) { this.locationId = locationId; }
    public String getLocationCode() { return locationCode; }
    public void setLocationCode(String locationCode) { this.locationCode = locationCode; }
    public String getPostStatus() { return postStatus; }
    public void setPostStatus(String postStatus) { this.postStatus = postStatus; }
    public LocalDateTime getPostedAt() { return postedAt; }
    public void setPostedAt(LocalDateTime postedAt) { this.postedAt = postedAt; }
}
```

- [ ] **Step 3: 库存台账实体 `SpInventory.java`**

```java
package com.wangziyang.mes.inventory.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@TableName("sp_inventory")
public class SpInventory extends BaseEntity {

    private String materialCode;
    private String materialDesc;
    private String unit;
    private String warehouseId;
    private String warehouseName;
    private String locationId;
    private String locationCode;
    private BigDecimal quantity;
    private String status;
    private LocalDateTime lastInboundTime;

    public String getMaterialCode() { return materialCode; }
    public void setMaterialCode(String materialCode) { this.materialCode = materialCode; }
    public String getMaterialDesc() { return materialDesc; }
    public void setMaterialDesc(String materialDesc) { this.materialDesc = materialDesc; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public String getWarehouseId() { return warehouseId; }
    public void setWarehouseId(String warehouseId) { this.warehouseId = warehouseId; }
    public String getWarehouseName() { return warehouseName; }
    public void setWarehouseName(String warehouseName) { this.warehouseName = warehouseName; }
    public String getLocationId() { return locationId; }
    public void setLocationId(String locationId) { this.locationId = locationId; }
    public String getLocationCode() { return locationCode; }
    public void setLocationCode(String locationCode) { this.locationCode = locationCode; }
    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getLastInboundTime() { return lastInboundTime; }
    public void setLastInboundTime(LocalDateTime lastInboundTime) { this.lastInboundTime = lastInboundTime; }
}
```

- [ ] **Step 4: 三个 Mapper**

`SpWarehouseReceiptMapper.java`：
```java
package com.wangziyang.mes.inventory.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wangziyang.mes.inventory.entity.SpWarehouseReceipt;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface SpWarehouseReceiptMapper extends BaseMapper<SpWarehouseReceipt> {
}
```

`SpWarehouseReceiptItemMapper.java`：
```java
package com.wangziyang.mes.inventory.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wangziyang.mes.inventory.entity.SpWarehouseReceiptItem;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface SpWarehouseReceiptItemMapper extends BaseMapper<SpWarehouseReceiptItem> {
}
```

`SpInventoryMapper.java`：
```java
package com.wangziyang.mes.inventory.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wangziyang.mes.inventory.entity.SpInventory;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface SpInventoryMapper extends BaseMapper<SpInventory> {
}
```

- [ ] **Step 5: 编译验证**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes && ./mvnw -q compile`
Expected: BUILD 成功，无编译错误。

- [ ] **Step 6: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/src/main/java/com/wangziyang/mes/inventory/entity mes/src/main/java/com/wangziyang/mes/inventory/mapper
git commit -m "feat: 计划入库实体与Mapper层"
```

---

## Task 3: 后端 Service 层（含登账事务）

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/inventory/dto/PostItemDTO.java`
- Create: `mes/src/main/java/com/wangziyang/mes/inventory/request/SpReceiptPageReq.java`
- Create: `mes/src/main/java/com/wangziyang/mes/inventory/request/SpInventoryPageReq.java`
- Create: `mes/src/main/java/com/wangziyang/mes/inventory/service/ISpWarehouseReceiptService.java`
- Create: `mes/src/main/java/com/wangziyang/mes/inventory/service/ISpWarehouseReceiptItemService.java`
- Create: `mes/src/main/java/com/wangziyang/mes/inventory/service/ISpInventoryService.java`
- Create: `mes/src/main/java/com/wangziyang/mes/inventory/service/impl/SpWarehouseReceiptServiceImpl.java`
- Create: `mes/src/main/java/com/wangziyang/mes/inventory/service/impl/SpWarehouseReceiptItemServiceImpl.java`
- Create: `mes/src/main/java/com/wangziyang/mes/inventory/service/impl/SpInventoryServiceImpl.java`

- [ ] **Step 1: DTO `PostItemDTO.java`**

```java
package com.wangziyang.mes.inventory.dto;

public class PostItemDTO {

    private String itemId;
    private String warehouseId;
    private String locationId;

    public String getItemId() { return itemId; }
    public void setItemId(String itemId) { this.itemId = itemId; }
    public String getWarehouseId() { return warehouseId; }
    public void setWarehouseId(String warehouseId) { this.warehouseId = warehouseId; }
    public String getLocationId() { return locationId; }
    public void setLocationId(String locationId) { this.locationId = locationId; }
}
```

- [ ] **Step 2: 两个分页请求类**

`SpReceiptPageReq.java`：
```java
package com.wangziyang.mes.inventory.request;

import com.wangziyang.mes.common.BasePageReq;

public class SpReceiptPageReq extends BasePageReq {

    private String receiptCode;
    private String receiptStatus;

    public String getReceiptCode() { return receiptCode; }
    public void setReceiptCode(String receiptCode) { this.receiptCode = receiptCode; }
    public String getReceiptStatus() { return receiptStatus; }
    public void setReceiptStatus(String receiptStatus) { this.receiptStatus = receiptStatus; }
}
```

`SpInventoryPageReq.java`：
```java
package com.wangziyang.mes.inventory.request;

import com.wangziyang.mes.common.BasePageReq;

public class SpInventoryPageReq extends BasePageReq {

    private String materialCode;
    private String startDate;
    private String endDate;

    public String getMaterialCode() { return materialCode; }
    public void setMaterialCode(String materialCode) { this.materialCode = materialCode; }
    public String getStartDate() { return startDate; }
    public void setStartDate(String startDate) { this.startDate = startDate; }
    public String getEndDate() { return endDate; }
    public void setEndDate(String endDate) { this.endDate = endDate; }
}
```

- [ ] **Step 3: 三个 Service 接口**

`ISpWarehouseReceiptService.java`：
```java
package com.wangziyang.mes.inventory.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.inventory.dto.PostItemDTO;
import com.wangziyang.mes.inventory.entity.SpWarehouseReceipt;
import com.wangziyang.mes.inventory.request.SpReceiptPageReq;

public interface ISpWarehouseReceiptService extends IService<SpWarehouseReceipt> {

    IPage<SpWarehouseReceipt> pageReceipts(SpReceiptPageReq req);

    void postItem(PostItemDTO dto);
}
```

`ISpWarehouseReceiptItemService.java`：
```java
package com.wangziyang.mes.inventory.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.inventory.entity.SpWarehouseReceiptItem;

import java.util.List;

public interface ISpWarehouseReceiptItemService extends IService<SpWarehouseReceiptItem> {

    List<SpWarehouseReceiptItem> listByReceiptId(String receiptId);
}
```

`ISpInventoryService.java`：
```java
package com.wangziyang.mes.inventory.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.inventory.entity.SpInventory;
import com.wangziyang.mes.inventory.request.SpInventoryPageReq;

public interface ISpInventoryService extends IService<SpInventory> {

    IPage<SpInventory> pageInventory(SpInventoryPageReq req);
}
```

- [ ] **Step 4: `SpWarehouseReceiptItemServiceImpl.java`**

```java
package com.wangziyang.mes.inventory.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.inventory.entity.SpWarehouseReceiptItem;
import com.wangziyang.mes.inventory.mapper.SpWarehouseReceiptItemMapper;
import com.wangziyang.mes.inventory.service.ISpWarehouseReceiptItemService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SpWarehouseReceiptItemServiceImpl
        extends ServiceImpl<SpWarehouseReceiptItemMapper, SpWarehouseReceiptItem>
        implements ISpWarehouseReceiptItemService {

    @Override
    public List<SpWarehouseReceiptItem> listByReceiptId(String receiptId) {
        return baseMapper.selectList(new QueryWrapper<SpWarehouseReceiptItem>()
                .eq("receipt_id", receiptId)
                .orderByAsc("material_code"));
    }
}
```

- [ ] **Step 5: `SpInventoryServiceImpl.java`**

```java
package com.wangziyang.mes.inventory.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.inventory.entity.SpInventory;
import com.wangziyang.mes.inventory.mapper.SpInventoryMapper;
import com.wangziyang.mes.inventory.request.SpInventoryPageReq;
import com.wangziyang.mes.inventory.service.ISpInventoryService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

@Service
public class SpInventoryServiceImpl
        extends ServiceImpl<SpInventoryMapper, SpInventory>
        implements ISpInventoryService {

    @Override
    public IPage<SpInventory> pageInventory(SpInventoryPageReq req) {
        QueryWrapper<SpInventory> qw = new QueryWrapper<>();
        if (StringUtils.isNotEmpty(req.getMaterialCode())) {
            qw.like("material_code", req.getMaterialCode());
        }
        if (StringUtils.isNotEmpty(req.getStartDate())) {
            qw.ge("last_inbound_time", req.getStartDate() + " 00:00:00");
        }
        if (StringUtils.isNotEmpty(req.getEndDate())) {
            qw.le("last_inbound_time", req.getEndDate() + " 23:59:59");
        }
        qw.orderByDesc("last_inbound_time");
        return baseMapper.selectPage(new Page<>(req.getCurrent(), req.getSize()), qw);
    }
}
```

- [ ] **Step 6: `SpWarehouseReceiptServiceImpl.java`（含登账事务）**

```java
package com.wangziyang.mes.inventory.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.basedata.entity.SpWarehouse;
import com.wangziyang.mes.basedata.entity.SpWarehouseLocation;
import com.wangziyang.mes.basedata.service.ISpWarehouseLocationService;
import com.wangziyang.mes.basedata.service.ISpWarehouseService;
import com.wangziyang.mes.inventory.dto.PostItemDTO;
import com.wangziyang.mes.inventory.entity.SpInventory;
import com.wangziyang.mes.inventory.entity.SpWarehouseReceipt;
import com.wangziyang.mes.inventory.entity.SpWarehouseReceiptItem;
import com.wangziyang.mes.inventory.mapper.SpInventoryMapper;
import com.wangziyang.mes.inventory.mapper.SpWarehouseReceiptItemMapper;
import com.wangziyang.mes.inventory.mapper.SpWarehouseReceiptMapper;
import com.wangziyang.mes.inventory.request.SpReceiptPageReq;
import com.wangziyang.mes.inventory.service.ISpWarehouseReceiptService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class SpWarehouseReceiptServiceImpl
        extends ServiceImpl<SpWarehouseReceiptMapper, SpWarehouseReceipt>
        implements ISpWarehouseReceiptService {

    @Autowired
    private SpWarehouseReceiptItemMapper receiptItemMapper;

    @Autowired
    private SpInventoryMapper inventoryMapper;

    @Autowired
    private ISpWarehouseService spWarehouseService;

    @Autowired
    private ISpWarehouseLocationService spWarehouseLocationService;

    @Override
    public IPage<SpWarehouseReceipt> pageReceipts(SpReceiptPageReq req) {
        QueryWrapper<SpWarehouseReceipt> qw = new QueryWrapper<>();
        if (StringUtils.isNotEmpty(req.getReceiptCode())) {
            qw.like("receipt_code", req.getReceiptCode());
        }
        if (StringUtils.isNotEmpty(req.getReceiptStatus())) {
            qw.eq("receipt_status", req.getReceiptStatus());
        }
        qw.orderByDesc("create_time");
        return baseMapper.selectPage(new Page<>(req.getCurrent(), req.getSize()), qw);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void postItem(PostItemDTO dto) {
        // 1. 查明细 + 状态校验
        SpWarehouseReceiptItem item = receiptItemMapper.selectById(dto.getItemId());
        if (item == null) {
            throw new RuntimeException("入库明细不存在");
        }
        if ("posted".equals(item.getPostStatus())) {
            throw new RuntimeException("该明细已登账，请勿重复操作");
        }

        // 2. 库房校验：存在 + 未删除 + 零件库
        SpWarehouse wh = spWarehouseService.getById(dto.getWarehouseId());
        if (wh == null || "1".equals(wh.getDeleted())) {
            throw new RuntimeException("库房不存在或已停用");
        }
        if (!"零件库".equals(wh.getType())) {
            throw new RuntimeException("请选择零件库类型的库房(如电脑配件库)");
        }

        // 3. 库位校验：存在 + 未删除 + 属于该库房
        SpWarehouseLocation loc = spWarehouseLocationService.getById(dto.getLocationId());
        if (loc == null || "1".equals(loc.getDeleted())) {
            throw new RuntimeException("库位不存在或已停用");
        }
        if (!dto.getWarehouseId().equals(loc.getWarehouseId())) {
            throw new RuntimeException("所选库位不属于该库房");
        }

        // 4. 混放校验：一个库位只能存一种物料
        SpInventory inv = inventoryMapper.selectOne(
                new QueryWrapper<SpInventory>().eq("location_id", dto.getLocationId()));
        if (inv != null && !inv.getMaterialCode().equals(item.getMaterialCode())) {
            throw new RuntimeException("该库位已存放物料 " + inv.getMaterialCode() + "，只能存放相同物料");
        }

        LocalDateTime now = LocalDateTime.now();

        // 5. 更新明细
        item.setWarehouseId(wh.getId());
        item.setWarehouseName(wh.getName());
        item.setLocationId(loc.getId());
        item.setLocationCode(loc.getCode());
        item.setPostStatus("posted");
        item.setPostedAt(now);
        receiptItemMapper.updateById(item);

        // 6. 库存台账 upsert
        if (inv != null) {
            inv.setQuantity(inv.getQuantity().add(item.getQuantity()));
            inv.setLastInboundTime(now);
            inventoryMapper.updateById(inv);
        } else {
            SpInventory ninv = new SpInventory();
            ninv.setMaterialCode(item.getMaterialCode());
            ninv.setMaterialDesc(item.getMaterialDesc());
            ninv.setUnit(item.getUnit());
            ninv.setWarehouseId(wh.getId());
            ninv.setWarehouseName(wh.getName());
            ninv.setLocationId(loc.getId());
            ninv.setLocationCode(loc.getCode());
            ninv.setQuantity(item.getQuantity());
            ninv.setStatus("available");
            ninv.setLastInboundTime(now);
            inventoryMapper.insert(ninv);
        }

        // 7. 更新入库单头状态
        SpWarehouseReceipt receipt = baseMapper.selectById(item.getReceiptId());
        if (receipt != null) {
            Integer posted = receiptItemMapper.selectCount(
                    new QueryWrapper<SpWarehouseReceiptItem>()
                            .eq("receipt_id", receipt.getId())
                            .eq("post_status", "posted"));
            receipt.setPostedItems(posted);
            receipt.setReceiptStatus(
                    posted >= receipt.getTotalItems() ? "completed" : "partial");
            baseMapper.updateById(receipt);
        }
    }
}
```

> 注：`spWarehouseService.getById` / `spWarehouseLocationService.getById` 来自现有 `com.wangziyang.mes.basedata.service`，由 `IService` 提供；`SpWarehouse.getType()/getDeleted()/getName()`、`SpWarehouseLocation.getWarehouseId()/getCode()/getDeleted()` 为现有实体方法。`selectCount` 在 MyBatis-Plus 3.1.2 返回 `Integer`。

- [ ] **Step 7: 编译验证**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes && ./mvnw -q compile`
Expected: BUILD 成功。

- [ ] **Step 8: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/src/main/java/com/wangziyang/mes/inventory/dto mes/src/main/java/com/wangziyang/mes/inventory/request mes/src/main/java/com/wangziyang/mes/inventory/service
git commit -m "feat: 计划入库Service层 — 分页查询+登账事务"
```

---

## Task 4: 后端 Controller

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/inventory/controller/SpReceiptController.java`

- [ ] **Step 1: `SpReceiptController.java`**

```java
package com.wangziyang.mes.inventory.controller;

import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.inventory.dto.PostItemDTO;
import com.wangziyang.mes.inventory.request.SpInventoryPageReq;
import com.wangziyang.mes.inventory.request.SpReceiptPageReq;
import com.wangziyang.mes.inventory.service.ISpInventoryService;
import com.wangziyang.mes.inventory.service.ISpWarehouseReceiptItemService;
import com.wangziyang.mes.inventory.service.ISpWarehouseReceiptService;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping("/inventory")
public class SpReceiptController extends BaseController {

    @Autowired
    private ISpWarehouseReceiptService receiptService;

    @Autowired
    private ISpWarehouseReceiptItemService receiptItemService;

    @Autowired
    private ISpInventoryService inventoryService;

    @ApiOperation("分页查询入库单")
    @PostMapping("/receipt/page")
    @ResponseBody
    public Result pageReceipts(SpReceiptPageReq req) {
        return Result.success(receiptService.pageReceipts(req));
    }

    @ApiOperation("查询入库单明细")
    @GetMapping("/receipt/{receiptId}/items")
    @ResponseBody
    public Result getItems(@PathVariable String receiptId) {
        return Result.success(receiptItemService.listByReceiptId(receiptId));
    }

    @ApiOperation("入库登账(单条)")
    @PostMapping("/receipt/item/post")
    @ResponseBody
    public Result postItem(@RequestBody PostItemDTO dto) {
        receiptService.postItem(dto);
        return Result.success();
    }

    @ApiOperation("分页查询库存明细")
    @PostMapping("/page")
    @ResponseBody
    public Result pageInventory(SpInventoryPageReq req) {
        return Result.success(inventoryService.pageInventory(req));
    }
}
```

- [ ] **Step 2: 编译验证**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes && ./mvnw -q compile`
Expected: BUILD 成功。

- [ ] **Step 3: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/src/main/java/com/wangziyang/mes/inventory/controller
git commit -m "feat: 计划入库Controller — 入库单/登账/库存明细 API"
```

---

## Task 5: 前端类型 + API 层

**Files:**
- Create: `mes/frontend/src/types/inventory.ts`
- Create: `mes/frontend/src/api/inventory/receipt.ts`
- Create: `mes/frontend/src/api/inventory/inventory.ts`

- [ ] **Step 1: `types/inventory.ts`**

```ts
/** 入库单 */
export interface WarehouseReceipt {
  id: string
  receiptCode: string
  sourceType?: string
  planId?: string | null
  orderId?: string | null
  orderCode?: string
  productCode?: string
  productDesc?: string
  receiptStatus?: string
  totalItems?: number
  postedItems?: number
  createTime?: string
}

/** 入库单明细 */
export interface WarehouseReceiptItem {
  id: string
  receiptId: string
  materialCode: string
  materialDesc?: string
  unit?: string
  quantity?: number
  warehouseId?: string | null
  warehouseName?: string | null
  locationId?: string | null
  locationCode?: string | null
  postStatus?: string
  postedAt?: string | null
}

/** 库存台账记录 */
export interface InventoryRecord {
  id: string
  materialCode: string
  materialDesc?: string
  unit?: string
  warehouseId?: string
  warehouseName?: string
  locationId?: string
  locationCode?: string
  quantity?: number
  status?: string
  lastInboundTime?: string
}

/** 登账请求 DTO */
export interface PostItemDTO {
  itemId: string
  warehouseId: string
  locationId: string
}

/** 入库单状态映射 */
export const RECEIPT_STATUS_MAP: Record<string, { text: string; color: string }> = {
  pending: { text: '待确认', color: 'blue' },
  partial: { text: '部分登账', color: 'orange' },
  completed: { text: '已完成', color: 'green' },
}

/** 明细登账状态映射 */
export const ITEM_STATUS_MAP: Record<string, { text: string; color: string }> = {
  pending: { text: '待登账', color: 'default' },
  posted: { text: '已登账', color: 'green' },
}

/** 库存状态映射 */
export const INVENTORY_STATUS_MAP: Record<string, { text: string; color: string }> = {
  available: { text: '可用', color: 'green' },
}
```

- [ ] **Step 2: `api/inventory/receipt.ts`**

```ts
import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { WarehouseReceipt, WarehouseReceiptItem, PostItemDTO } from '@/types/inventory'

/** 分页查询入库单 */
export function pageReceipts(params: PageParams & { receiptCode?: string; receiptStatus?: string }) {
  return client.post('/inventory/receipt/page', params) as Promise<PageResult<WarehouseReceipt>>
}

/** 查询入库单明细 */
export function getItems(receiptId: string) {
  return client.get(`/inventory/receipt/${receiptId}/items`) as Promise<WarehouseReceiptItem[]>
}

/** 入库登账（单条，JSON 请求体） */
export function postItem(dto: PostItemDTO) {
  return client.post('/inventory/receipt/item/post', dto, {
    headers: { 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 3: `api/inventory/inventory.ts`**

```ts
import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { InventoryRecord } from '@/types/inventory'

/** 分页查询库存明细 */
export function pageInventory(
  params: PageParams & { materialCode?: string; startDate?: string; endDate?: string },
) {
  return client.post('/inventory/page', params) as Promise<PageResult<InventoryRecord>>
}
```

- [ ] **Step 4: 类型检查**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && ./node_modules/.bin/tsc --noEmit`
Expected: 无类型错误（注意：此时页面文件尚未创建，仅校验 types/api 文件本身无误）。

- [ ] **Step 5: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/src/types/inventory.ts mes/frontend/src/api/inventory
git commit -m "feat: 计划入库前端类型与API函数"
```

---

## Task 6: 前端「计划入库确认」页面（ReceiptList）

**Files:**
- Create: `mes/frontend/src/pages/inventory/ReceiptList.tsx`

- [ ] **Step 1: `pages/inventory/ReceiptList.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { Table, Tag, Button, Drawer, Modal, Form, Select, Input, message, Space, Descriptions } from 'antd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import PermissionGuard from '@/components/PermissionGuard'
import { usePagination } from '@/hooks/usePagination'
import * as receiptApi from '@/api/inventory/receipt'
import * as warehouseApi from '@/api/basedata/warehouse'
import type { WarehouseReceipt, WarehouseReceiptItem, PostItemDTO } from '@/types/inventory'
import type { SpWarehouse, SpWarehouseLocation } from '@/types/warehouse'
import { RECEIPT_STATUS_MAP, ITEM_STATUS_MAP } from '@/types/inventory'

export default function ReceiptList() {
  const queryClient = useQueryClient()
  const { pagination, onChange, reset } = usePagination()
  const [filters, setFilters] = useState<Record<string, unknown>>({})

  // 明细抽屉
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeReceipt, setActiveReceipt] = useState<WarehouseReceipt | null>(null)

  // 登账弹窗
  const [postOpen, setPostOpen] = useState(false)
  const [activeItem, setActiveItem] = useState<WarehouseReceiptItem | null>(null)
  const [warehouses, setWarehouses] = useState<SpWarehouse[]>([])
  const [locations, setLocations] = useState<SpWarehouseLocation[]>([])
  const [postForm] = Form.useForm()

  const { data, isLoading } = useQuery({
    queryKey: ['receipts', pagination, filters],
    queryFn: () =>
      receiptApi.pageReceipts({
        current: pagination.current,
        size: pagination.pageSize,
        ...filters,
      }),
  })

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['receipt-items', activeReceipt?.id],
    queryFn: () => receiptApi.getItems(activeReceipt!.id),
    enabled: !!activeReceipt,
  })

  // 打开登账弹窗时加载零件库
  useEffect(() => {
    if (postOpen) {
      warehouseApi
        .getList()
        .then((list) => setWarehouses(list.filter((w) => w.type === '零件库' && w.deleted === '0')))
        .catch((err) => message.error('加载库房失败: ' + err.message))
    }
  }, [postOpen])

  const postMutation = useMutation({
    mutationFn: (dto: PostItemDTO) => receiptApi.postItem(dto),
    onSuccess: () => {
      message.success('入库登账成功')
      setPostOpen(false)
      postForm.resetFields()
      setLocations([])
      queryClient.invalidateQueries({ queryKey: ['receipt-items', activeReceipt?.id] })
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
    },
    onError: (e: Error) => message.error(e.message || '登账失败'),
  })

  const handleSearch = (values: Record<string, unknown>) => {
    setFilters(values)
    reset()
  }
  const handleReset = () => {
    setFilters({})
    reset()
  }

  const openDrawer = (r: WarehouseReceipt) => {
    setActiveReceipt(r)
    setDrawerOpen(true)
  }

  const openPost = (item: WarehouseReceiptItem) => {
    setActiveItem(item)
    postForm.resetFields()
    setLocations([])
    setPostOpen(true)
  }

  const handleWarehouseChange = (warehouseId: string) => {
    postForm.setFieldValue('locationId', undefined)
    warehouseApi
      .getLocations(warehouseId)
      .then(setLocations)
      .catch((err) => message.error('加载库位失败: ' + err.message))
  }

  const handlePostOk = () => {
    postForm.validateFields().then((values) => {
      postMutation.mutate({
        itemId: activeItem!.id,
        warehouseId: values.warehouseId,
        locationId: values.locationId,
      })
    })
  }

  const receiptColumns = [
    {
      title: '入库单号',
      dataIndex: 'receiptCode',
      key: 'receiptCode',
      render: (val: string) => (
        <span style={{ fontFamily: "'SF Mono', Monaco, monospace", fontWeight: 600 }}>{val}</span>
      ),
    },
    {
      title: '来源',
      dataIndex: 'sourceType',
      key: 'sourceType',
      width: 90,
      render: (val: string) => (val === 'MRP' ? 'MRP下发' : '手工'),
    },
    { title: '工单', dataIndex: 'orderCode', key: 'orderCode' },
    { title: '产品', dataIndex: 'productDesc', key: 'productDesc', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'receiptStatus',
      key: 'receiptStatus',
      width: 110,
      render: (val: string) => {
        const s = RECEIPT_STATUS_MAP[val] || RECEIPT_STATUS_MAP.pending
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '进度',
      key: 'progress',
      width: 90,
      render: (_: unknown, r: WarehouseReceipt) => `${r.postedItems ?? 0}/${r.totalItems ?? 0}`,
    },
    { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, r: WarehouseReceipt) => (
        <Button type="link" onClick={() => openDrawer(r)}>
          查看/登账
        </Button>
      ),
    },
  ]

  const itemColumns = [
    { title: '物料编码', dataIndex: 'materialCode', key: 'materialCode' },
    { title: '描述', dataIndex: 'materialDesc', key: 'materialDesc', ellipsis: true },
    { title: '单位', dataIndex: 'unit', key: 'unit', width: 60 },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80 },
    {
      title: '库房',
      dataIndex: 'warehouseName',
      key: 'warehouseName',
      render: (val: string | null) => val || '-',
    },
    {
      title: '库位',
      dataIndex: 'locationCode',
      key: 'locationCode',
      render: (val: string | null) => val || '-',
    },
    {
      title: '状态',
      dataIndex: 'postStatus',
      key: 'postStatus',
      width: 100,
      render: (val: string) => {
        const s = ITEM_STATUS_MAP[val] || ITEM_STATUS_MAP.pending
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, item: WarehouseReceiptItem) => (
        <PermissionGuard perm="inventory:inbound">
          <Button
            type="primary"
            size="small"
            disabled={item.postStatus === 'posted'}
            onClick={() => openPost(item)}
          >
            入库登账
          </Button>
        </PermissionGuard>
      ),
    },
  ]

  return (
    <PageContainer title="计划入库确认">
      <SearchForm onSearch={handleSearch} onReset={handleReset} loading={isLoading}>
        <Form.Item name="receiptCode">
          <Input placeholder="输入入库单号查询" allowClear style={{ width: 240 }} />
        </Form.Item>
      </SearchForm>

      <Table
        rowKey="id"
        columns={receiptColumns}
        dataSource={data?.records ?? []}
        loading={isLoading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: data?.total ?? 0,
          onChange: (page, pageSize) => onChange({ current: page, pageSize }),
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        size="middle"
      />

      <Drawer
        title={`入库单明细 — ${activeReceipt?.receiptCode ?? ''}`}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={900}
        destroyOnClose
      >
        {activeReceipt && (
          <Descriptions size="small" column={2} bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label="入库单号">{activeReceipt.receiptCode}</Descriptions.Item>
            <Descriptions.Item label="产品">{activeReceipt.productDesc}</Descriptions.Item>
            <Descriptions.Item label="工单">{activeReceipt.orderCode}</Descriptions.Item>
            <Descriptions.Item label="进度">
              {activeReceipt.postedItems ?? 0}/{activeReceipt.totalItems ?? 0}
            </Descriptions.Item>
          </Descriptions>
        )}
        <Table
          rowKey="id"
          columns={itemColumns}
          dataSource={items ?? []}
          loading={itemsLoading}
          pagination={false}
          size="small"
        />
      </Drawer>

      <Modal
        title="入库登账"
        open={postOpen}
        onOk={handlePostOk}
        onCancel={() => {
          setPostOpen(false)
          postForm.resetFields()
          setLocations([])
        }}
        confirmLoading={postMutation.isPending}
        okText="确认登账"
        cancelText="取消"
        destroyOnClose
      >
        <div
          style={{
            background: '#f0f5ff',
            border: '1px solid #d6e4ff',
            borderRadius: 6,
            padding: '10px 14px',
            marginBottom: 20,
            fontSize: 13,
          }}
        >
          物料：<strong>{activeItem?.materialCode}</strong> {activeItem?.materialDesc} ·
          数量 <strong>{activeItem?.quantity}</strong> {activeItem?.unit}
        </div>
        <Form form={postForm} layout="vertical">
          <Form.Item name="warehouseId" label="库房" rules={[{ required: true, message: '请选择库房' }]}>
            <Select
              placeholder="选择零件库(如电脑配件库)"
              onChange={handleWarehouseChange}
              options={warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))}
            />
          </Form.Item>
          <Form.Item name="locationId" label="库位" rules={[{ required: true, message: '请选择库位' }]}>
            <Select
              placeholder={locations.length === 0 ? '请先选择库房' : '选择库位'}
              disabled={locations.length === 0}
              options={locations.map((l) => ({ value: l.id, label: l.code }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
```

- [ ] **Step 2: 类型检查**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && ./node_modules/.bin/tsc --noEmit`
Expected: 无类型错误。

- [ ] **Step 3: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/src/pages/inventory/ReceiptList.tsx
git commit -m "feat: 计划入库确认页 — 入库单列表+明细抽屉+逐条登账"
```

---

## Task 7: 前端「库存明细查询」页面（InventoryList）+ 路由

**Files:**
- Create: `mes/frontend/src/pages/inventory/InventoryList.tsx`
- Modify: `mes/frontend/src/App.tsx`

- [ ] **Step 1: `pages/inventory/InventoryList.tsx`**

```tsx
import { useState } from 'react'
import { Table, Tag, Form, Input, DatePicker } from 'antd'
import { useQuery } from '@tanstack/react-query'
import type { Dayjs } from 'dayjs'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import { usePagination } from '@/hooks/usePagination'
import * as inventoryApi from '@/api/inventory/inventory'
import type { InventoryRecord } from '@/types/inventory'
import { INVENTORY_STATUS_MAP } from '@/types/inventory'

const { RangePicker } = DatePicker

export default function InventoryList() {
  const { pagination, onChange, reset } = usePagination()
  const [filters, setFilters] = useState<Record<string, unknown>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', pagination, filters],
    queryFn: () =>
      inventoryApi.pageInventory({
        current: pagination.current,
        size: pagination.pageSize,
        ...filters,
      }),
  })

  const handleSearch = (values: Record<string, unknown>) => {
    const range = values.dateRange as [Dayjs, Dayjs] | undefined
    setFilters({
      materialCode: values.materialCode,
      startDate: range?.[0]?.format('YYYY-MM-DD'),
      endDate: range?.[1]?.format('YYYY-MM-DD'),
    })
    reset()
  }
  const handleReset = () => {
    setFilters({})
    reset()
  }

  const columns = [
    { title: '物料编码', dataIndex: 'materialCode', key: 'materialCode' },
    { title: '描述', dataIndex: 'materialDesc', key: 'materialDesc', ellipsis: true },
    { title: '单位', dataIndex: 'unit', key: 'unit', width: 60 },
    { title: '库房', dataIndex: 'warehouseName', key: 'warehouseName' },
    { title: '库位', dataIndex: 'locationCode', key: 'locationCode' },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 90 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (val: string) => {
        const s = INVENTORY_STATUS_MAP[val] || { text: val, color: 'default' }
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    { title: '最近入库时间', dataIndex: 'lastInboundTime', key: 'lastInboundTime', width: 170 },
  ]

  return (
    <PageContainer title="库存明细查询">
      <SearchForm onSearch={handleSearch} onReset={handleReset} loading={isLoading}>
        <Form.Item name="materialCode">
          <Input placeholder="物料编码" allowClear style={{ width: 180 }} />
        </Form.Item>
        <Form.Item name="dateRange" label="登账日期">
          <RangePicker />
        </Form.Item>
      </SearchForm>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.records ?? []}
        loading={isLoading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: data?.total ?? 0,
          onChange: (page, pageSize) => onChange({ current: page, pageSize }),
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        size="middle"
      />
    </PageContainer>
  )
}
```

- [ ] **Step 2: 在 `App.tsx` 注册路由**

在 import 区（紧随 `import DispatchList from '@/pages/order/DispatchList'` 之后）新增：
```tsx
// -- inventory --
import ReceiptList from '@/pages/inventory/ReceiptList'
import InventoryList from '@/pages/inventory/InventoryList'
```

在 `{/* Order */}` 路由块之后、`{/* Digitization */}` 之前新增：
```tsx
                  {/* Inventory */}
                  <Route path="inventory/receipt" element={<ReceiptList />} />
                  <Route path="inventory/query" element={<InventoryList />} />
```

- [ ] **Step 3: 构建验证（tsc + vite）**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && npm run build`
Expected: tsc 无类型错误，vite build 成功产出 `dist/`。

- [ ] **Step 4: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/src/pages/inventory/InventoryList.tsx mes/frontend/src/App.tsx
git commit -m "feat: 库存明细查询页 + 注册库存管理路由"
```

---

## Task 8: 集成验证（迁移 + 端到端走查）

**Files:** 无新增（验证 + 必要修复）

- [ ] **Step 1: 执行数据库迁移**

Run:
```bash
mysql -uroot -p12345678 -h127.0.0.1 mes_data < /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/scripts/sql/planned-inbound.sql
```
Expected: 无报错（重复执行因 `IF NOT EXISTS` / `WHERE NOT EXISTS` 守卫而幂等）。

- [ ] **Step 2: 校验种子数据**

Run:
```bash
mysql -uroot -p12345678 -h127.0.0.1 mes_data -e "SELECT receipt_code, receipt_status, total_items, posted_items FROM sp_warehouse_receipt; SELECT COUNT(*) AS item_cnt FROM sp_warehouse_receipt_item WHERE receipt_id='rcpt-20240817-001'; SELECT code,name,type FROM sp_warehouse WHERE id='wh-parts-001'; SELECT COUNT(*) AS loc_cnt FROM sp_warehouse_location WHERE warehouse_id='wh-parts-001'; SELECT id,name,permission FROM sp_sys_menu WHERE id IN ('18','181','182');"
```
Expected: 入库单 `RK20240817-00001` status=pending total_items=8 posted_items=0；item_cnt=8；库房 `WH-PARTS 电脑配件库 零件库`；loc_cnt=8；3 条菜单。

- [ ] **Step 3: 后端整体编译**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes && ./mvnw -q compile`
Expected: BUILD 成功。

- [ ] **Step 4: 前端整体构建**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && npm run build`
Expected: 构建成功。

- [ ] **Step 5: 运行期手动走查（用户启动后端 + 前端 dev）**

按 PPT 步骤验证（对照 spec 第 8 节验证清单）：
1. 登录 → 左侧出现「库存管理 → 计划入库确认 / 库存明细查询」
2. 计划入库确认页查到 `RK20240817-00001`（待确认）
3. 点「查看/登账」→ 抽屉显示 8 个零件均「待登账」
4. 对第 1 个零件登账：库房选「电脑配件库」→ 库位选某项 → 确认登账 → 状态变「已登账」
5. 将剩余 7 个全部登账 → 入库单状态变「已完成」，进度 8/8
6. 库存明细查询页（按登账日期）→ 8 个零件状态「可用」
7. 负向：对已登账明细再次登账 → 报错「该明细已登账」；将不同物料登账到已占用库位 → 报错混放

- [ ] **Step 6: 收尾提交（如有走查中的修复）**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add -A
git commit -m "fix: 计划入库集成验证修复"   # 若无修复则跳过
```

---

## 自查（Self-Review）

**Spec 覆盖：**
- 数据模型 3 表 → Task 1（SQL）+ Task 2（实体）✅
- 登账事务（明细+台账+单头，混放/重复/库房类型/库位归属校验）→ Task 3 `postItem` ✅
- 4 个 API 端点 → Task 4 Controller ✅
- 前端 types/api/2 页面/路由 → Task 5/6/7 ✅
- 菜单「库存管理」+ 2 子项 + 权限 → Task 1 SQL ✅
- 种子 `RK20240817-00001` + 电脑配件库 + 8 库位 → Task 1 SQL ✅
- 错误处理 5 场景 → Task 3 `postItem` 抛 `RuntimeException`（全局异常处理转 Result.msg）✅
- 库存明细按日期查询 → Task 3 `pageInventory` + Task 7 RangePicker ✅

**占位符扫描：** 无 TBD/TODO；所有代码块完整。✅

**类型一致性：** `PostItemDTO{itemId,warehouseId,locationId}` 前后端一致；`postStatus` 值 `pending/posted`、`receiptStatus` 值 `pending/partial/completed`、`status` 值 `available` 在实体/SQL/前端映射三处一致；`quantity` 后端 `BigDecimal` ↔ 前端 `number`（JSON 数字）一致。✅
