# 配套出库（Kitting / Coordinated Outbound）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 MES "配套出库" 模块：按出库单逐条 FIFO 扣减库存出库、配送产线，并提供"手动入库"补货。

**Architecture:** 沿用 `com.wangziyang.mes.inventory` 模块。新建出库单主表/明细表 + `SpOutboundController`；FIFO 出库登账事务按 `last_inbound_time` 升序跨库位扣减 `sp_inventory`（扣到 0 删行），明细记录分配摘要。手动入库加到 `ISpInventoryService` 并由现有 `SpReceiptController` 暴露。前端在"库存管理"菜单下加 配套出库确认 + 手动入库 两页。

**Tech Stack:** Java 8 / Spring Boot 2.1.7 / MyBatis-Plus 3.1.2；React 18 + TS + Vite 5 + Ant Design 5 + TanStack Query。

**测试约定：** service 层为 MyBatis-Plus DB CRUD，无内存库/单测框架（与入库模块一致）。以 `mvn compile`（后端）+ `npm run build`（前端）+ 运行期按 PPT 步骤集成验证 替代单测。每个任务完成即提交。构建用 `mvn`（仓库无 mvnw wrapper jar），前端类型检查用 `./node_modules/.bin/tsc --noEmit`。

---

## 文件结构总览

**后端（`mes/src/main/java/com/wangziyang/mes/inventory/`）**
- `entity/SpOutboundOrder.java` / `entity/SpOutboundOrderItem.java`（新建）
- `mapper/SpOutboundOrderMapper.java` / `mapper/SpOutboundOrderItemMapper.java`（新建）
- `dto/PostOutboundItemDTO.java` / `dto/ManualInboundDTO.java`（新建）
- `request/SpOutboundPageReq.java`（新建）
- `service/ISpOutboundOrderService.java` / `ISpOutboundOrderItemService.java`（新建）
- `service/impl/SpOutboundOrderServiceImpl.java`（新建，含 FIFO `postOutboundItem`）/ `SpOutboundOrderItemServiceImpl.java`（新建）
- `service/ISpInventoryService.java`（修改：加 `manualInbound`）/ `service/impl/SpInventoryServiceImpl.java`（修改：实现 `manualInbound`）
- `controller/SpOutboundController.java`（新建）/ `controller/SpReceiptController.java`（修改：加 `/manual-inbound`）

**SQL（`scripts/sql/kitting-outbound.sql`，新建）** — 2 表 + 种子（2 出库单/8 明细 + PART-002~008 库存）+ 菜单（183/184）

**前端（`mes/frontend/src/`）**
- `types/outbound.ts`（新建）
- `api/inventory/outbound.ts`（新建）/ `api/inventory/inventory.ts`（修改：加 `manualInbound`）
- `pages/inventory/OutboundList.tsx` / `pages/inventory/ManualInboundPage.tsx`（新建）
- `App.tsx`（修改：2 路由）

---

## Task 1: 数据库迁移（建表 + 种子 + 菜单）

**Files:**
- Create: `scripts/sql/kitting-outbound.sql`

- [ ] **Step 1: 编写迁移 SQL**

创建 `scripts/sql/kitting-outbound.sql`：

```sql
-- Kitting Outbound (配套出库) Module
-- Creates sp_outbound_order, sp_outbound_order_item; seeds 2 outbound orders + 8 items
-- + inventory for PART-002~008; and menu entries 183/184.

-- ============ 1. 表结构 ============
CREATE TABLE IF NOT EXISTS sp_outbound_order (
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

CREATE TABLE IF NOT EXISTS sp_outbound_order_item (
  id varchar(64) NOT NULL,
  outbound_id varchar(64) NOT NULL COMMENT '关联出库单ID',
  material_code varchar(50) NOT NULL COMMENT '物料编码',
  material_desc varchar(200) DEFAULT NULL COMMENT '物料描述',
  unit varchar(20) DEFAULT NULL COMMENT '单位',
  quantity decimal(10,2) NOT NULL COMMENT '需出库数量',
  post_status varchar(20) DEFAULT 'pending' COMMENT 'pending=待登账 posted=已登账',
  allocation_detail varchar(500) DEFAULT NULL COMMENT 'FIFO扣减库位摘要',
  posted_at datetime DEFAULT NULL COMMENT '登账时间',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_outbound_id (outbound_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='出库单明细表';

-- ============ 2. 种子：2 个出库单（待确认） ============
INSERT INTO sp_outbound_order (id, outbound_code, order_id, order_code, product_code, product_desc, outbound_status, total_items, posted_items, create_time, create_username, update_time, update_username)
SELECT 'ob-20240817-001', 'CK20240817-00001', NULL, 'GD20240817-001', 'PROD-001', '台式电脑主机', 'pending', 4, 0, NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_outbound_order WHERE outbound_code = 'CK20240817-00001');

INSERT INTO sp_outbound_order (id, outbound_code, order_id, order_code, product_code, product_desc, outbound_status, total_items, posted_items, create_time, create_username, update_time, update_username)
SELECT 'ob-20240817-002', 'CK20240817-00002', NULL, 'GD20240817-001', 'PROD-001', '台式电脑主机', 'pending', 4, 0, NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_outbound_order WHERE outbound_code = 'CK20240817-00002');

-- ============ 3. 种子：出库单明细（批1=PART-001~004，批2=PART-005~008，各 50） ============
INSERT INTO sp_outbound_order_item (id, outbound_id, material_code, material_desc, unit, quantity, post_status, create_time, create_username, update_time, update_username)
SELECT * FROM (
  SELECT 'obi-001-1' AS id, 'ob-20240817-001' AS outbound_id, 'PART-001' AS material_code, 'CPU i7-13700K' AS material_desc, '个' AS unit, 50 AS quantity, 'pending' AS post_status, NOW() AS create_time, 'admin' AS create_username, NOW() AS update_time, 'admin' AS update_username
  UNION ALL SELECT 'obi-001-2','ob-20240817-001','PART-002','DDR5 32GB 内存','条',50,'pending',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'obi-001-3','ob-20240817-001','PART-003','SSD 1TB NVMe','个',50,'pending',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'obi-001-4','ob-20240817-001','PART-004','主板 Z790','个',50,'pending',NOW(),'admin',NOW(),'admin'
) t
WHERE NOT EXISTS (SELECT 1 FROM sp_outbound_order_item WHERE outbound_id = 'ob-20240817-001');

INSERT INTO sp_outbound_order_item (id, outbound_id, material_code, material_desc, unit, quantity, post_status, create_time, create_username, update_time, update_username)
SELECT * FROM (
  SELECT 'obi-002-1' AS id, 'ob-20240817-002' AS outbound_id, 'PART-005' AS material_code, 'CPU散热器' AS material_desc, '个' AS unit, 50 AS quantity, 'pending' AS post_status, NOW() AS create_time, 'admin' AS create_username, NOW() AS update_time, 'admin' AS update_username
  UNION ALL SELECT 'obi-002-2','ob-20240817-002','PART-006','机箱外壳 ATX','个',50,'pending',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'obi-002-3','ob-20240817-002','PART-007','电源 750W 金牌','个',50,'pending',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'obi-002-4','ob-20240817-002','PART-008','散热风扇 120mm','个',50,'pending',NOW(),'admin',NOW(),'admin'
) t
WHERE NOT EXISTS (SELECT 1 FROM sp_outbound_order_item WHERE outbound_id = 'ob-20240817-002');

-- ============ 4. 种子：库存 PART-002~008（各 100，到 7 个空闲库位；按 material_code 幂等守卫） ============
-- PART-001 已有库存(用户测试入库)，不在此预置。
INSERT INTO sp_inventory (id, material_code, material_desc, unit, warehouse_id, warehouse_name, location_id, location_code, quantity, status, last_inbound_time, create_time, create_username, update_time, update_username)
SELECT 'inv-seed-02','PART-002','DDR5 32GB 内存','条','wh-parts-001','电脑配件库','loc-parts-01','1-010101',100,'available',NOW(),NOW(),'admin',NOW(),'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_inventory WHERE material_code='PART-002');

INSERT INTO sp_inventory (id, material_code, material_desc, unit, warehouse_id, warehouse_name, location_id, location_code, quantity, status, last_inbound_time, create_time, create_username, update_time, update_username)
SELECT 'inv-seed-03','PART-003','SSD 1TB NVMe','个','wh-parts-001','电脑配件库','loc-parts-03','1-010201',100,'available',NOW(),NOW(),'admin',NOW(),'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_inventory WHERE material_code='PART-003');

INSERT INTO sp_inventory (id, material_code, material_desc, unit, warehouse_id, warehouse_name, location_id, location_code, quantity, status, last_inbound_time, create_time, create_username, update_time, update_username)
SELECT 'inv-seed-04','PART-004','主板 Z790','个','wh-parts-001','电脑配件库','loc-parts-04','1-010202',100,'available',NOW(),NOW(),'admin',NOW(),'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_inventory WHERE material_code='PART-004');

INSERT INTO sp_inventory (id, material_code, material_desc, unit, warehouse_id, warehouse_name, location_id, location_code, quantity, status, last_inbound_time, create_time, create_username, update_time, update_username)
SELECT 'inv-seed-05','PART-005','CPU散热器','个','wh-parts-001','电脑配件库','loc-parts-05','1-020101',100,'available',NOW(),NOW(),'admin',NOW(),'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_inventory WHERE material_code='PART-005');

INSERT INTO sp_inventory (id, material_code, material_desc, unit, warehouse_id, warehouse_name, location_id, location_code, quantity, status, last_inbound_time, create_time, create_username, update_time, update_username)
SELECT 'inv-seed-06','PART-006','机箱外壳 ATX','个','wh-parts-001','电脑配件库','loc-parts-06','1-020102',100,'available',NOW(),NOW(),'admin',NOW(),'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_inventory WHERE material_code='PART-006');

INSERT INTO sp_inventory (id, material_code, material_desc, unit, warehouse_id, warehouse_name, location_id, location_code, quantity, status, last_inbound_time, create_time, create_username, update_time, update_username)
SELECT 'inv-seed-07','PART-007','电源 750W 金牌','个','wh-parts-001','电脑配件库','loc-parts-07','1-020201',100,'available',NOW(),NOW(),'admin',NOW(),'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_inventory WHERE material_code='PART-007');

INSERT INTO sp_inventory (id, material_code, material_desc, unit, warehouse_id, warehouse_name, location_id, location_code, quantity, status, last_inbound_time, create_time, create_username, update_time, update_username)
SELECT 'inv-seed-08','PART-008','散热风扇 120mm','个','wh-parts-001','电脑配件库','loc-parts-08','1-020202',100,'available',NOW(),NOW(),'admin',NOW(),'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_inventory WHERE material_code='PART-008');

-- ============ 5. 菜单：配套出库确认 + 手动入库（父 id=18 库存管理） ============
INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '183', 'outboundConfirm', '配套出库确认', '/inventory/outbound', '18', '3', 3, '0', 'inventory:outbound', 'deployment-unit', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '183');

INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '184', 'manualInbound', '手动入库', '/inventory/manual-inbound', '18', '3', 4, '0', 'inventory:inbound', 'gold', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '184');
```

- [ ] **Step 2: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add scripts/sql/kitting-outbound.sql
git commit -m "feat: 新增配套出库迁移脚本 — 2张表+种子+菜单"
```

> 实际执行迁移在 Task 8 统一进行。

---

## Task 2: 后端实体 + Mapper

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/inventory/entity/SpOutboundOrder.java`
- Create: `mes/src/main/java/com/wangziyang/mes/inventory/entity/SpOutboundOrderItem.java`
- Create: `mes/src/main/java/com/wangziyang/mes/inventory/mapper/SpOutboundOrderMapper.java`
- Create: `mes/src/main/java/com/wangziyang/mes/inventory/mapper/SpOutboundOrderItemMapper.java`

- [ ] **Step 1: `SpOutboundOrder.java`**

```java
package com.wangziyang.mes.inventory.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

/**
 * 出库单主表
 */
@TableName("sp_outbound_order")
public class SpOutboundOrder extends BaseEntity {

    private String outboundCode;
    private String orderId;
    private String orderCode;
    private String productCode;
    private String productDesc;
    private String outboundStatus;
    private Integer totalItems;
    private Integer postedItems;

    public String getOutboundCode() { return outboundCode; }
    public void setOutboundCode(String outboundCode) { this.outboundCode = outboundCode; }
    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }
    public String getOrderCode() { return orderCode; }
    public void setOrderCode(String orderCode) { this.orderCode = orderCode; }
    public String getProductCode() { return productCode; }
    public void setProductCode(String productCode) { this.productCode = productCode; }
    public String getProductDesc() { return productDesc; }
    public void setProductDesc(String productDesc) { this.productDesc = productDesc; }
    public String getOutboundStatus() { return outboundStatus; }
    public void setOutboundStatus(String outboundStatus) { this.outboundStatus = outboundStatus; }
    public Integer getTotalItems() { return totalItems; }
    public void setTotalItems(Integer totalItems) { this.totalItems = totalItems; }
    public Integer getPostedItems() { return postedItems; }
    public void setPostedItems(Integer postedItems) { this.postedItems = postedItems; }
}
```

- [ ] **Step 2: `SpOutboundOrderItem.java`**

```java
package com.wangziyang.mes.inventory.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 出库单明细
 */
@TableName("sp_outbound_order_item")
public class SpOutboundOrderItem extends BaseEntity {

    private String outboundId;
    private String materialCode;
    private String materialDesc;
    private String unit;
    private BigDecimal quantity;
    private String postStatus;
    private String allocationDetail;
    private LocalDateTime postedAt;

    public String getOutboundId() { return outboundId; }
    public void setOutboundId(String outboundId) { this.outboundId = outboundId; }
    public String getMaterialCode() { return materialCode; }
    public void setMaterialCode(String materialCode) { this.materialCode = materialCode; }
    public String getMaterialDesc() { return materialDesc; }
    public void setMaterialDesc(String materialDesc) { this.materialDesc = materialDesc; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
    public String getPostStatus() { return postStatus; }
    public void setPostStatus(String postStatus) { this.postStatus = postStatus; }
    public String getAllocationDetail() { return allocationDetail; }
    public void setAllocationDetail(String allocationDetail) { this.allocationDetail = allocationDetail; }
    public LocalDateTime getPostedAt() { return postedAt; }
    public void setPostedAt(LocalDateTime postedAt) { this.postedAt = postedAt; }
}
```

- [ ] **Step 3: 两个 Mapper**

`SpOutboundOrderMapper.java`：
```java
package com.wangziyang.mes.inventory.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wangziyang.mes.inventory.entity.SpOutboundOrder;
import org.apache.ibatis.annotations.Mapper;

/**
 * 出库单主表 Mapper
 */
@Mapper
public interface SpOutboundOrderMapper extends BaseMapper<SpOutboundOrder> {
}
```

`SpOutboundOrderItemMapper.java`：
```java
package com.wangziyang.mes.inventory.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wangziyang.mes.inventory.entity.SpOutboundOrderItem;
import org.apache.ibatis.annotations.Mapper;

/**
 * 出库单明细 Mapper
 */
@Mapper
public interface SpOutboundOrderItemMapper extends BaseMapper<SpOutboundOrderItem> {
}
```

- [ ] **Step 4: 编译验证**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes && mvn -q compile`
Expected: BUILD SUCCESS。

- [ ] **Step 5: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/src/main/java/com/wangziyang/mes/inventory/entity/SpOutboundOrder.java mes/src/main/java/com/wangziyang/mes/inventory/entity/SpOutboundOrderItem.java mes/src/main/java/com/wangziyang/mes/inventory/mapper/SpOutboundOrderMapper.java mes/src/main/java/com/wangziyang/mes/inventory/mapper/SpOutboundOrderItemMapper.java
git commit -m "feat: 配套出库实体与Mapper层"
```

---

## Task 3: 后端 Service 层（含 FIFO 出库登账 + 手动入库）

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/inventory/dto/PostOutboundItemDTO.java`
- Create: `mes/src/main/java/com/wangziyang/mes/inventory/dto/ManualInboundDTO.java`
- Create: `mes/src/main/java/com/wangziyang/mes/inventory/request/SpOutboundPageReq.java`
- Create: `mes/src/main/java/com/wangziyang/mes/inventory/service/ISpOutboundOrderService.java`
- Create: `mes/src/main/java/com/wangziyang/mes/inventory/service/ISpOutboundOrderItemService.java`
- Create: `mes/src/main/java/com/wangziyang/mes/inventory/service/impl/SpOutboundOrderServiceImpl.java`
- Create: `mes/src/main/java/com/wangziyang/mes/inventory/service/impl/SpOutboundOrderItemServiceImpl.java`
- Modify: `mes/src/main/java/com/wangziyang/mes/inventory/service/ISpInventoryService.java`
- Modify: `mes/src/main/java/com/wangziyang/mes/inventory/service/impl/SpInventoryServiceImpl.java`

- [ ] **Step 1: DTO `PostOutboundItemDTO.java`**

```java
package com.wangziyang.mes.inventory.dto;

/**
 * 出库登账请求
 */
public class PostOutboundItemDTO {

    private String itemId;

    public String getItemId() { return itemId; }
    public void setItemId(String itemId) { this.itemId = itemId; }
}
```

- [ ] **Step 2: DTO `ManualInboundDTO.java`**

```java
package com.wangziyang.mes.inventory.dto;

import java.math.BigDecimal;

/**
 * 手动入库请求
 */
public class ManualInboundDTO {

    private String materialCode;
    private String materialDesc;
    private String unit;
    private String warehouseId;
    private String locationId;
    private BigDecimal quantity;

    public String getMaterialCode() { return materialCode; }
    public void setMaterialCode(String materialCode) { this.materialCode = materialCode; }
    public String getMaterialDesc() { return materialDesc; }
    public void setMaterialDesc(String materialDesc) { this.materialDesc = materialDesc; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public String getWarehouseId() { return warehouseId; }
    public void setWarehouseId(String warehouseId) { this.warehouseId = warehouseId; }
    public String getLocationId() { return locationId; }
    public void setLocationId(String locationId) { this.locationId = locationId; }
    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
}
```

- [ ] **Step 3: `SpOutboundPageReq.java`**

```java
package com.wangziyang.mes.inventory.request;

import com.wangziyang.mes.common.BasePageReq;

/**
 * 出库单分页查询参数
 */
public class SpOutboundPageReq extends BasePageReq {

    private String outboundCode;
    private String outboundStatus;

    public String getOutboundCode() { return outboundCode; }
    public void setOutboundCode(String outboundCode) { this.outboundCode = outboundCode; }
    public String getOutboundStatus() { return outboundStatus; }
    public void setOutboundStatus(String outboundStatus) { this.outboundStatus = outboundStatus; }
}
```

- [ ] **Step 4: 两个出库 Service 接口**

`ISpOutboundOrderService.java`：
```java
package com.wangziyang.mes.inventory.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.inventory.dto.PostOutboundItemDTO;
import com.wangziyang.mes.inventory.entity.SpOutboundOrder;
import com.wangziyang.mes.inventory.request.SpOutboundPageReq;

/**
 * 出库单 Service
 */
public interface ISpOutboundOrderService extends IService<SpOutboundOrder> {

    IPage<SpOutboundOrder> pageOutbounds(SpOutboundPageReq req);

    void postOutboundItem(PostOutboundItemDTO dto);
}
```

`ISpOutboundOrderItemService.java`：
```java
package com.wangziyang.mes.inventory.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.inventory.entity.SpOutboundOrderItem;

import java.util.List;

/**
 * 出库单明细 Service
 */
public interface ISpOutboundOrderItemService extends IService<SpOutboundOrderItem> {

    List<SpOutboundOrderItem> listByOutboundId(String outboundId);
}
```

- [ ] **Step 5: `SpOutboundOrderItemServiceImpl.java`**

```java
package com.wangziyang.mes.inventory.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.inventory.entity.SpOutboundOrderItem;
import com.wangziyang.mes.inventory.mapper.SpOutboundOrderItemMapper;
import com.wangziyang.mes.inventory.service.ISpOutboundOrderItemService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SpOutboundOrderItemServiceImpl
        extends ServiceImpl<SpOutboundOrderItemMapper, SpOutboundOrderItem>
        implements ISpOutboundOrderItemService {

    @Override
    public List<SpOutboundOrderItem> listByOutboundId(String outboundId) {
        return baseMapper.selectList(new QueryWrapper<SpOutboundOrderItem>()
                .eq("outbound_id", outboundId)
                .orderByAsc("material_code"));
    }
}
```

- [ ] **Step 6: `SpOutboundOrderServiceImpl.java`（FIFO 出库登账）**

```java
package com.wangziyang.mes.inventory.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.inventory.dto.PostOutboundItemDTO;
import com.wangziyang.mes.inventory.entity.SpInventory;
import com.wangziyang.mes.inventory.entity.SpOutboundOrder;
import com.wangziyang.mes.inventory.entity.SpOutboundOrderItem;
import com.wangziyang.mes.inventory.mapper.SpInventoryMapper;
import com.wangziyang.mes.inventory.mapper.SpOutboundOrderItemMapper;
import com.wangziyang.mes.inventory.mapper.SpOutboundOrderMapper;
import com.wangziyang.mes.inventory.request.SpOutboundPageReq;
import com.wangziyang.mes.inventory.service.ISpOutboundOrderService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class SpOutboundOrderServiceImpl
        extends ServiceImpl<SpOutboundOrderMapper, SpOutboundOrder>
        implements ISpOutboundOrderService {

    @Autowired
    private SpOutboundOrderItemMapper outboundItemMapper;

    @Autowired
    private SpInventoryMapper inventoryMapper;

    @Override
    public IPage<SpOutboundOrder> pageOutbounds(SpOutboundPageReq req) {
        QueryWrapper<SpOutboundOrder> qw = new QueryWrapper<>();
        if (StringUtils.isNotEmpty(req.getOutboundCode())) {
            qw.like("outbound_code", req.getOutboundCode());
        }
        if (StringUtils.isNotEmpty(req.getOutboundStatus())) {
            qw.eq("outbound_status", req.getOutboundStatus());
        }
        qw.orderByDesc("create_time");
        return baseMapper.selectPage(new Page<>(req.getCurrent(), req.getSize()), qw);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void postOutboundItem(PostOutboundItemDTO dto) {
        // 1. 查明细 + 状态校验
        SpOutboundOrderItem item = outboundItemMapper.selectById(dto.getItemId());
        if (item == null) {
            throw new RuntimeException("出库明细不存在");
        }
        if ("posted".equals(item.getPostStatus())) {
            throw new RuntimeException("该明细已登账，请勿重复操作");
        }

        BigDecimal required = item.getQuantity() != null ? item.getQuantity() : BigDecimal.ZERO;

        // 2. 查可用库存，按 FIFO（入库时间升序）
        List<SpInventory> invRows = inventoryMapper.selectList(
                new QueryWrapper<SpInventory>()
                        .eq("material_code", item.getMaterialCode())
                        .gt("quantity", 0)
                        .orderByAsc("last_inbound_time")
                        .orderByAsc("create_time"));

        // 3. 校验总量
        BigDecimal totalAvail = BigDecimal.ZERO;
        for (SpInventory inv : invRows) {
            BigDecimal q = inv.getQuantity() != null ? inv.getQuantity() : BigDecimal.ZERO;
            totalAvail = totalAvail.add(q);
        }
        if (totalAvail.compareTo(required) < 0) {
            throw new RuntimeException("库存不足:可用 " + totalAvail.stripTrailingZeros().toPlainString()
                    + "，需出库 " + required.stripTrailingZeros().toPlainString() + "，无法出库");
        }

        // 4. FIFO 逐行扣减
        BigDecimal remaining = required;
        LocalDateTime now = LocalDateTime.now();
        List<String> allocations = new ArrayList<>();
        for (SpInventory inv : invRows) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
                break;
            }
            BigDecimal invQty = inv.getQuantity() != null ? inv.getQuantity() : BigDecimal.ZERO;
            BigDecimal take = invQty.min(remaining);
            BigDecimal left = invQty.subtract(take);
            allocations.add(inv.getLocationCode() + "×" + take.stripTrailingZeros().toPlainString());
            if (left.compareTo(BigDecimal.ZERO) == 0) {
                inventoryMapper.deleteById(inv.getId());
            } else {
                inv.setQuantity(left);
                inventoryMapper.updateById(inv);
            }
            remaining = remaining.subtract(take);
        }

        // 5. 更新明细
        item.setPostStatus("posted");
        item.setPostedAt(now);
        item.setAllocationDetail(String.join(", ", allocations));
        outboundItemMapper.updateById(item);

        // 6. 更新出库单头
        SpOutboundOrder order = baseMapper.selectById(item.getOutboundId());
        if (order != null) {
            Integer posted = outboundItemMapper.selectCount(
                    new QueryWrapper<SpOutboundOrderItem>()
                            .eq("outbound_id", order.getId())
                            .eq("post_status", "posted"));
            int total = order.getTotalItems() != null ? order.getTotalItems() : 0;
            order.setPostedItems(posted);
            order.setOutboundStatus(posted >= total ? "completed" : "partial");
            baseMapper.updateById(order);
        }
    }
}
```

- [ ] **Step 7: 修改 `ISpInventoryService.java`（加 `manualInbound`）— 完整新内容**

```java
package com.wangziyang.mes.inventory.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.inventory.dto.ManualInboundDTO;
import com.wangziyang.mes.inventory.entity.SpInventory;
import com.wangziyang.mes.inventory.request.SpInventoryPageReq;

/**
 * 库存 Service
 */
public interface ISpInventoryService extends IService<SpInventory> {

    IPage<SpInventory> pageInventory(SpInventoryPageReq req);

    void manualInbound(ManualInboundDTO dto);
}
```

- [ ] **Step 8: 修改 `SpInventoryServiceImpl.java`（实现 `manualInbound`）— 完整新内容**

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
import com.wangziyang.mes.inventory.dto.ManualInboundDTO;
import com.wangziyang.mes.inventory.entity.SpInventory;
import com.wangziyang.mes.inventory.mapper.SpInventoryMapper;
import com.wangziyang.mes.inventory.request.SpInventoryPageReq;
import com.wangziyang.mes.inventory.service.ISpInventoryService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
public class SpInventoryServiceImpl
        extends ServiceImpl<SpInventoryMapper, SpInventory>
        implements ISpInventoryService {

    @Autowired
    private ISpWarehouseService spWarehouseService;

    @Autowired
    private ISpWarehouseLocationService spWarehouseLocationService;

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

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void manualInbound(ManualInboundDTO dto) {
        // 1. 库房校验
        SpWarehouse wh = spWarehouseService.getById(dto.getWarehouseId());
        if (wh == null || "1".equals(wh.getDeleted())) {
            throw new RuntimeException("库房不存在或已停用");
        }
        if (!"零件库".equals(wh.getType())) {
            throw new RuntimeException("请选择零件库类型的库房(如电脑配件库)");
        }

        // 2. 库位校验
        SpWarehouseLocation loc = spWarehouseLocationService.getById(dto.getLocationId());
        if (loc == null || "1".equals(loc.getDeleted())) {
            throw new RuntimeException("库位不存在或已停用");
        }
        if (!dto.getWarehouseId().equals(loc.getWarehouseId())) {
            throw new RuntimeException("所选库位不属于该库房");
        }

        // 3. 混放校验
        SpInventory inv = baseMapper.selectOne(
                new QueryWrapper<SpInventory>().eq("location_id", dto.getLocationId()));
        if (inv != null && !inv.getMaterialCode().equals(dto.getMaterialCode())) {
            throw new RuntimeException("该库位已存放物料 " + inv.getMaterialCode() + "，只能存放相同物料");
        }

        // 4. upsert 库存
        LocalDateTime now = LocalDateTime.now();
        BigDecimal qty = dto.getQuantity() != null ? dto.getQuantity() : BigDecimal.ZERO;
        if (inv != null) {
            BigDecimal existing = inv.getQuantity() != null ? inv.getQuantity() : BigDecimal.ZERO;
            inv.setQuantity(existing.add(qty));
            inv.setLastInboundTime(now);
            baseMapper.updateById(inv);
        } else {
            SpInventory ninv = new SpInventory();
            ninv.setMaterialCode(dto.getMaterialCode());
            ninv.setMaterialDesc(dto.getMaterialDesc());
            ninv.setUnit(dto.getUnit());
            ninv.setWarehouseId(wh.getId());
            ninv.setWarehouseName(wh.getName());
            ninv.setLocationId(loc.getId());
            ninv.setLocationCode(loc.getCode());
            ninv.setQuantity(qty);
            ninv.setStatus("available");
            ninv.setLastInboundTime(now);
            baseMapper.insert(ninv);
        }
    }
}
```

- [ ] **Step 9: 编译验证**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes && mvn -q compile`
Expected: BUILD SUCCESS。

- [ ] **Step 10: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/src/main/java/com/wangziyang/mes/inventory/dto mes/src/main/java/com/wangziyang/mes/inventory/request/SpOutboundPageReq.java mes/src/main/java/com/wangziyang/mes/inventory/service
git commit -m "feat: 配套出库Service层 — FIFO出库登账 + 手动入库"
```

---

## Task 4: 后端 Controller

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/inventory/controller/SpOutboundController.java`
- Modify: `mes/src/main/java/com/wangziyang/mes/inventory/controller/SpReceiptController.java`

- [ ] **Step 1: `SpOutboundController.java`**

```java
package com.wangziyang.mes.inventory.controller;

import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.inventory.dto.PostOutboundItemDTO;
import com.wangziyang.mes.inventory.request.SpOutboundPageReq;
import com.wangziyang.mes.inventory.service.ISpOutboundOrderItemService;
import com.wangziyang.mes.inventory.service.ISpOutboundOrderService;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

/**
 * 配套出库 Controller
 */
@Controller
@RequestMapping("/inventory/outbound")
public class SpOutboundController extends BaseController {

    @Autowired
    private ISpOutboundOrderService outboundService;

    @Autowired
    private ISpOutboundOrderItemService outboundItemService;

    @ApiOperation("分页查询出库单")
    @PostMapping("/page")
    @ResponseBody
    public Result pageOutbounds(SpOutboundPageReq req) {
        return Result.success(outboundService.pageOutbounds(req));
    }

    @ApiOperation("查询出库单明细")
    @GetMapping("/{outboundId}/items")
    @ResponseBody
    public Result getItems(@PathVariable String outboundId) {
        return Result.success(outboundItemService.listByOutboundId(outboundId));
    }

    @ApiOperation("出库登账(FIFO)")
    @PostMapping("/item/post")
    @ResponseBody
    public Result postOutboundItem(@RequestBody PostOutboundItemDTO dto) {
        outboundService.postOutboundItem(dto);
        return Result.success();
    }
}
```

- [ ] **Step 2: 修改 `SpReceiptController.java`（新增手动入库端点）**

在 import 区加入：
```java
import com.wangziyang.mes.inventory.dto.ManualInboundDTO;
```

在类中（`pageInventory` 方法之后、类结束 `}` 之前）加入方法。`inventoryService`（`ISpInventoryService`）字段已存在,直接复用：
```java
    @ApiOperation("手动入库")
    @PostMapping("/manual-inbound")
    @ResponseBody
    public Result manualInbound(@RequestBody ManualInboundDTO dto) {
        inventoryService.manualInbound(dto);
        return Result.success();
    }
```

- [ ] **Step 3: 编译验证**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes && mvn -q compile`
Expected: BUILD SUCCESS。

- [ ] **Step 4: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/src/main/java/com/wangziyang/mes/inventory/controller
git commit -m "feat: 配套出库Controller + 手动入库端点"
```

---

## Task 5: 前端类型 + API 层

**Files:**
- Create: `mes/frontend/src/types/outbound.ts`
- Create: `mes/frontend/src/api/inventory/outbound.ts`
- Modify: `mes/frontend/src/api/inventory/inventory.ts`

- [ ] **Step 1: `types/outbound.ts`**

```ts
/** 出库单 */
export interface OutboundOrder {
  id: string
  outboundCode: string
  orderId?: string | null
  orderCode?: string
  productCode?: string
  productDesc?: string
  outboundStatus?: string
  totalItems?: number
  postedItems?: number
  createTime?: string
}

/** 出库单明细 */
export interface OutboundOrderItem {
  id: string
  outboundId: string
  materialCode: string
  materialDesc?: string
  unit?: string
  quantity?: number
  postStatus?: string
  allocationDetail?: string | null
  postedAt?: string | null
}

/** 手动入库 DTO */
export interface ManualInboundDTO {
  materialCode: string
  materialDesc?: string
  unit?: string
  warehouseId: string
  locationId: string
  quantity: number
}

/** 出库单状态映射 */
export const OUTBOUND_STATUS_MAP: Record<string, { text: string; color: string }> = {
  pending: { text: '待确认', color: 'blue' },
  partial: { text: '部分出库', color: 'orange' },
  completed: { text: '已完成', color: 'green' },
}

/** 出库明细状态映射 */
export const OUTBOUND_ITEM_STATUS_MAP: Record<string, { text: string; color: string }> = {
  pending: { text: '待登账', color: 'default' },
  posted: { text: '已登账', color: 'green' },
}
```

- [ ] **Step 2: `api/inventory/outbound.ts`**

```ts
import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { OutboundOrder, OutboundOrderItem } from '@/types/outbound'

/** 分页查询出库单 */
export function pageOutbounds(params: PageParams & { outboundCode?: string; outboundStatus?: string }) {
  return client.post('/inventory/outbound/page', params) as Promise<PageResult<OutboundOrder>>
}

/** 查询出库单明细 */
export function getItems(outboundId: string) {
  return client.get(`/inventory/outbound/${outboundId}/items`) as Promise<OutboundOrderItem[]>
}

/** 出库登账（FIFO，JSON 请求体） */
export function postOutboundItem(itemId: string) {
  return client.post('/inventory/outbound/item/post', { itemId }, {
    headers: { 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 3: 修改 `api/inventory/inventory.ts`（加 `manualInbound`）— 完整新内容**

```ts
import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { InventoryRecord } from '@/types/inventory'
import type { ManualInboundDTO } from '@/types/outbound'

/** 分页查询库存明细 */
export function pageInventory(
  params: PageParams & { materialCode?: string; startDate?: string; endDate?: string },
) {
  return client.post('/inventory/page', params) as Promise<PageResult<InventoryRecord>>
}

/** 手动入库（JSON 请求体） */
export function manualInbound(dto: ManualInboundDTO) {
  return client.post('/inventory/manual-inbound', dto, {
    headers: { 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 4: 类型检查**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && ./node_modules/.bin/tsc --noEmit`
Expected: 无类型错误。

- [ ] **Step 5: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/src/types/outbound.ts mes/frontend/src/api/inventory/outbound.ts mes/frontend/src/api/inventory/inventory.ts
git commit -m "feat: 配套出库前端类型与API + 手动入库API"
```

---

## Task 6: 前端「配套出库确认」页面（OutboundList）

**Files:**
- Create: `mes/frontend/src/pages/inventory/OutboundList.tsx`

- [ ] **Step 1: `pages/inventory/OutboundList.tsx`**

```tsx
import { useState } from 'react'
import { Table, Tag, Button, Drawer, Popconfirm, Form, Input, message, Descriptions } from 'antd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import PermissionGuard from '@/components/PermissionGuard'
import { usePagination } from '@/hooks/usePagination'
import * as outboundApi from '@/api/inventory/outbound'
import type { OutboundOrder, OutboundOrderItem } from '@/types/outbound'
import { OUTBOUND_STATUS_MAP, OUTBOUND_ITEM_STATUS_MAP } from '@/types/outbound'

export default function OutboundList() {
  const queryClient = useQueryClient()
  const { pagination, onChange, reset } = usePagination()
  const [filters, setFilters] = useState<Record<string, unknown>>({})
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeOutbound, setActiveOutbound] = useState<OutboundOrder | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['outbounds', pagination, filters],
    queryFn: () =>
      outboundApi.pageOutbounds({
        current: pagination.current,
        size: pagination.pageSize,
        ...filters,
      }),
  })

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['outbound-items', activeOutbound?.id],
    queryFn: () => outboundApi.getItems(activeOutbound!.id),
    enabled: !!activeOutbound,
  })

  const postMutation = useMutation({
    mutationFn: (itemId: string) => outboundApi.postOutboundItem(itemId),
    onSuccess: () => {
      message.success('出库登账成功')
      queryClient.invalidateQueries({ queryKey: ['outbounds'] })
    },
    onError: (e: Error) => message.error(e.message || '出库登账失败'),
  })

  const handleSearch = (values: Record<string, unknown>) => {
    setFilters(values)
    reset()
  }
  const handleReset = () => {
    setFilters({})
    reset()
  }

  const openDrawer = (r: OutboundOrder) => {
    setActiveOutbound(r)
    setDrawerOpen(true)
  }

  const handlePost = (item: OutboundOrderItem) => {
    const outboundId = activeOutbound?.id
    postMutation.mutate(item.id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['outbound-items', outboundId] })
      },
    })
  }

  const outboundColumns = [
    {
      title: '出库单号',
      dataIndex: 'outboundCode',
      key: 'outboundCode',
      render: (val: string) => (
        <span style={{ fontFamily: "'SF Mono', Monaco, monospace", fontWeight: 600 }}>{val}</span>
      ),
    },
    { title: '工单', dataIndex: 'orderCode', key: 'orderCode' },
    { title: '产品', dataIndex: 'productDesc', key: 'productDesc', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'outboundStatus',
      key: 'outboundStatus',
      width: 110,
      render: (val: string) => {
        const s = OUTBOUND_STATUS_MAP[val] || OUTBOUND_STATUS_MAP.pending
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '进度',
      key: 'progress',
      width: 90,
      render: (_: unknown, r: OutboundOrder) => `${r.postedItems ?? 0}/${r.totalItems ?? 0}`,
    },
    { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, r: OutboundOrder) => (
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
    { title: '需出库数量', dataIndex: 'quantity', key: 'quantity', width: 100 },
    {
      title: '状态',
      dataIndex: 'postStatus',
      key: 'postStatus',
      width: 100,
      render: (val: string) => {
        const s = OUTBOUND_ITEM_STATUS_MAP[val] || OUTBOUND_ITEM_STATUS_MAP.pending
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: 'FIFO分配',
      dataIndex: 'allocationDetail',
      key: 'allocationDetail',
      render: (val: string | null) => val || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, item: OutboundOrderItem) => (
        <PermissionGuard perm="inventory:outbound">
          <Popconfirm
            title="确认出库登账?系统将按FIFO自动扣库"
            onConfirm={() => handlePost(item)}
            okText="确认"
            cancelText="取消"
            disabled={item.postStatus === 'posted'}
          >
            <Button type="primary" size="small" disabled={item.postStatus === 'posted'}>
              出库登账
            </Button>
          </Popconfirm>
        </PermissionGuard>
      ),
    },
  ]

  return (
    <PageContainer title="配套出库确认">
      <SearchForm onSearch={handleSearch} onReset={handleReset} loading={isLoading}>
        <Form.Item name="outboundCode">
          <Input placeholder="输入出库单号查询" allowClear style={{ width: 240 }} />
        </Form.Item>
      </SearchForm>

      <Table
        rowKey="id"
        columns={outboundColumns}
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
        title={`出库单明细 — ${activeOutbound?.outboundCode ?? ''}`}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setActiveOutbound(null)
        }}
        width={900}
        destroyOnClose
      >
        {activeOutbound && (
          <Descriptions size="small" column={2} bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label="出库单号">{activeOutbound.outboundCode}</Descriptions.Item>
            <Descriptions.Item label="产品">{activeOutbound.productDesc}</Descriptions.Item>
            <Descriptions.Item label="工单">{activeOutbound.orderCode}</Descriptions.Item>
            <Descriptions.Item label="进度">
              {activeOutbound.postedItems ?? 0}/{activeOutbound.totalItems ?? 0}
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
git add mes/frontend/src/pages/inventory/OutboundList.tsx
git commit -m "feat: 配套出库确认页 — 出库单列表+明细抽屉+FIFO登账"
```

---

## Task 7: 前端「手动入库」页面（ManualInboundPage）+ 路由

**Files:**
- Create: `mes/frontend/src/pages/inventory/ManualInboundPage.tsx`
- Modify: `mes/frontend/src/App.tsx`

- [ ] **Step 1: `pages/inventory/ManualInboundPage.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { Card, Form, Select, InputNumber, Button, message } from 'antd'
import { useMutation } from '@tanstack/react-query'
import PageContainer from '@/components/PageContainer'
import * as inventoryApi from '@/api/inventory/inventory'
import * as warehouseApi from '@/api/basedata/warehouse'
import * as materileApi from '@/api/basedata/materile'
import type { ManualInboundDTO } from '@/types/outbound'
import type { SpWarehouse, SpWarehouseLocation } from '@/types/warehouse'
import type { Materiel } from '@/types/common'

export default function ManualInboundPage() {
  const [form] = Form.useForm()
  const [materials, setMaterials] = useState<Materiel[]>([])
  const [warehouses, setWarehouses] = useState<SpWarehouse[]>([])
  const [locations, setLocations] = useState<SpWarehouseLocation[]>([])

  useEffect(() => {
    materileApi
      .page({ current: 1, size: 200 })
      .then((res) => setMaterials((res.records ?? []).filter((m) => m.deleted === '0')))
      .catch((e) => message.error('加载物料失败: ' + (e as Error).message))
    warehouseApi
      .getList()
      .then((list) => setWarehouses(list.filter((w) => w.type === '零件库' && w.deleted === '0')))
      .catch((e) => message.error('加载库房失败: ' + (e as Error).message))
  }, [])

  const mutation = useMutation({
    mutationFn: (dto: ManualInboundDTO) => inventoryApi.manualInbound(dto),
    onSuccess: () => {
      message.success('手动入库成功')
      form.resetFields()
      setLocations([])
    },
    onError: (e: Error) => message.error(e.message || '手动入库失败'),
  })

  const handleWarehouseChange = (warehouseId: string) => {
    form.setFieldValue('locationId', undefined)
    warehouseApi
      .getLocations(warehouseId)
      .then(setLocations)
      .catch((e) => message.error('加载库位失败: ' + (e as Error).message))
  }

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const mat = materials.find((m) => m.materiel === values.materialCode)
      mutation.mutate({
        materialCode: values.materialCode,
        materialDesc: mat?.materielDesc,
        unit: mat?.unit,
        warehouseId: values.warehouseId,
        locationId: values.locationId,
        quantity: values.quantity,
      })
    })
  }

  return (
    <PageContainer title="手动入库">
      <Card style={{ maxWidth: 520 }}>
        <Form form={form} layout="vertical">
          <Form.Item name="materialCode" label="物料" rules={[{ required: true, message: '请选择物料' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="选择物料"
              options={materials.map((m) => ({ value: m.materiel, label: `${m.materiel} - ${m.materielDesc}` }))}
            />
          </Form.Item>
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
          <Form.Item name="quantity" label="数量" rules={[{ required: true, message: '请输入数量' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={handleSubmit} loading={mutation.isPending}>
              提交补货
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </PageContainer>
  )
}
```

- [ ] **Step 2: 在 `App.tsx` 注册路由**

在 import 区（紧随 `import InventoryList from '@/pages/inventory/InventoryList'` 之后）新增：
```tsx
import OutboundList from '@/pages/inventory/OutboundList'
import ManualInboundPage from '@/pages/inventory/ManualInboundPage'
```

在 `{/* Inventory */}` 路由块内（`inventory/query` 路由之后）新增：
```tsx
                  <Route path="inventory/outbound" element={<OutboundList />} />
                  <Route path="inventory/manual-inbound" element={<ManualInboundPage />} />
```

- [ ] **Step 3: 构建验证（tsc + vite）**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && npm run build`
Expected: tsc 无类型错误，vite build 成功。

- [ ] **Step 4: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/src/pages/inventory/ManualInboundPage.tsx mes/frontend/src/App.tsx
git commit -m "feat: 手动入库页 + 注册配套出库/手动入库路由"
```

---

## Task 8: 集成验证（迁移 + 端到端走查）

**Files:** 无新增（验证 + 必要修复）

- [ ] **Step 1: 执行数据库迁移**

Run:
```bash
mysql -uroot -p12345678 -h127.0.0.1 mes_data < /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/scripts/sql/kitting-outbound.sql
```
Expected: 无报错（守卫幂等）。

- [ ] **Step 2: 校验种子数据**

Run:
```bash
mysql -uroot -p12345678 -h127.0.0.1 mes_data -t -e "SELECT outbound_code, outbound_status, total_items, posted_items FROM sp_outbound_order; SELECT outbound_id, material_code, quantity, post_status FROM sp_outbound_order_item ORDER BY outbound_id, material_code; SELECT material_code, location_code, quantity FROM sp_inventory ORDER BY material_code; SELECT id,name,permission FROM sp_sys_menu WHERE id IN ('183','184');"
```
Expected: 2 个出库单(pending, 4/0)；8 条明细(PART-001~008, 50, pending)；库存含 PART-001~008(各 ≥50)；2 条菜单。

- [ ] **Step 3: 后端整体编译**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes && mvn -q compile`
Expected: BUILD SUCCESS。

- [ ] **Step 4: 前端整体构建**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && npm run build`
Expected: 构建成功。

- [ ] **Step 5: 运行期手动走查（用户启动后端 + 前端 dev）**

按 PPT 步骤(对照 spec 第 7 节验证清单)：
1. 左侧「库存管理」下出现 配套出库确认 / 手动入库
2. 配套出库确认页查到 2 个出库单(待确认)
3. 点「查看/登账」→ 抽屉显示各零件(待登账)
4. 逐条「出库登账」→ Popconfirm 确认 → 该零件"已登账"+FIFO分配摘要(如 "1-010102×50")
5. 一个出库单全部登账 → 单据"已完成"
6. 库存明细查询(上一模块)→ 对应零件数量减少;扣到 0 的库位消失
7. 负向:某零件库存清零后再出库 → "库存不足";已登账明细再登账 → 报错
8. 手动入库页:选物料+库房+库位+数量 提交 → 库存增加,库存明细可见

- [ ] **Step 6: 收尾提交（如有走查修复）**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add -A
git commit -m "fix: 配套出库集成验证修复"   # 若无修复则跳过
```

---

## 自查（Self-Review）

**Spec 覆盖：**
- 2 表 → Task 1（SQL）+ Task 2（实体）✅
- FIFO 出库登账(库存不足校验/跨库位扣减/扣0删行/分配摘要/单头状态)→ Task 3 `postOutboundItem` ✅
- 手动入库(库房/库位/混放校验 + upsert)→ Task 3 `manualInbound` ✅
- API 4 端点(出库 3 + 手动入库 1)→ Task 4 ✅
- 前端 types/api/2 页面/路由 → Task 5/6/7 ✅
- 菜单 183/184 + 权限 → Task 1 SQL ✅
- 种子 2 出库单 + 库存预置 → Task 1 SQL ✅
- 错误处理 5 场景 → Task 3 抛 `RuntimeException` ✅

**占位符扫描：** 无 TBD/TODO；所有代码块完整。✅

**类型一致性：**
- `PostOutboundItemDTO{itemId}` 前后端一致；`postOutboundItem(itemId)` 前端发 `{itemId}` JSON ↔ 后端 `@RequestBody PostOutboundItemDTO` ✅
- `ManualInboundDTO{materialCode,materialDesc,unit,warehouseId,locationId,quantity}` 前后端字段一致(后端 quantity=BigDecimal ↔ 前端 number)✅
- 状态值 `pending/partial/completed`、`pending/posted` 在 实体/SQL/前端映射 三处一致 ✅
- FIFO 排序字段 `last_inbound_time` 存在于 `sp_inventory` ✅
- `manualInbound` 同时加到 `ISpInventoryService` 接口与 `SpInventoryServiceImpl` 实现 ✅
- `SpReceiptController` 复用已有 `inventoryService` 字段,仅加端点 ✅
