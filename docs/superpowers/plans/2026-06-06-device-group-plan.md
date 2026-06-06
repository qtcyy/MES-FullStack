# Device Group Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "编组设备定义" module with device CRUD, group CRUD, and device-to-group assignment, including order-reference validation on delete.

**Architecture:** Three new DB tables (`sp_device`, `sp_device_group`, `sp_device_group_item`), backend entities/services/controllers under `basedata/` package, frontend DeviceGroupPage with tabs (设备管理 + 设备编组) + device/group form modals + device assignment modal.

**Tech Stack:** Java 8 + Spring Boot 2.1.7 + MyBatis-Plus 3.1.2, React 18 + TypeScript + Ant Design 5 + TanStack Query

---

### Task 1: Database — Tables, Seed Data, and Menu

**Files:**
- Create: `scripts/sql/device-management.sql`

- [ ] **Step 1: Create and execute SQL script**

```sql
-- Device & Device Group Management Module

CREATE TABLE IF NOT EXISTS sp_device (
  id varchar(64) NOT NULL COMMENT '主键',
  code varchar(32) NOT NULL COMMENT '设备编号',
  name varchar(64) NOT NULL COMMENT '设备名称',
  type varchar(32) DEFAULT NULL COMMENT '设备类型',
  model varchar(64) DEFAULT NULL COMMENT '设备型号',
  specs varchar(255) DEFAULT NULL COMMENT '规格参数',
  line_id varchar(64) DEFAULT NULL COMMENT '所属产线ID',
  location varchar(128) DEFAULT NULL COMMENT '位置',
  status varchar(2) DEFAULT '0' COMMENT '0=空闲 1=运行中 2=维修中 3=报废',
  descr varchar(255) DEFAULT '' COMMENT '备注',
  is_deleted varchar(2) NOT NULL DEFAULT '0' COMMENT '0=正常 1=删除',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_device_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备表';

CREATE TABLE IF NOT EXISTS sp_device_group (
  id varchar(64) NOT NULL COMMENT '主键',
  code varchar(32) NOT NULL COMMENT '编组代码',
  name varchar(64) NOT NULL COMMENT '编组名称',
  descr varchar(255) DEFAULT '' COMMENT '描述',
  is_deleted varchar(2) NOT NULL DEFAULT '0' COMMENT '0=正常 1=删除',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_group_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备编组表';

CREATE TABLE IF NOT EXISTS sp_device_group_item (
  id varchar(64) NOT NULL COMMENT '主键',
  group_id varchar(64) NOT NULL COMMENT '编组ID',
  device_id varchar(64) NOT NULL COMMENT '设备ID',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_group_device (group_id, device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='编组设备关联表';

-- Seed: Device DS11-1
INSERT INTO sp_device (id, code, name, type, status, is_deleted, create_time, create_username, update_time, update_username)
SELECT REPLACE(UUID(), '-', ''), 'DS11-1', 'DS11-1', '通用设备', '0', '0', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_device WHERE code = 'DS11-1');

-- Seed: Group EG-1
INSERT INTO sp_device_group (id, code, name, descr, is_deleted, create_time, create_username, update_time, update_username)
SELECT REPLACE(UUID(), '-', ''), 'EG-1', '设备编组1', '设备编组1', '0', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_device_group WHERE code = 'EG-1');

-- Seed: Assign DS11-1 to EG-1
INSERT INTO sp_device_group_item (id, group_id, device_id, create_time, create_username, update_time, update_username)
SELECT REPLACE(UUID(), '-', ''), g.id, d.id, NOW(), 'admin', NOW(), 'admin'
FROM sp_device_group g, sp_device d
WHERE g.code = 'EG-1' AND d.code = 'DS11-1'
AND NOT EXISTS (SELECT 1 FROM sp_device_group_item WHERE group_id = g.id AND device_id = d.id);

-- Menu entry under 系统管理 (parent_id=10)
INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '108', 'deviceGroup', '编组设备定义', '/basedata/device-group/list-ui', '10', '3', '8', '0', 'device:add', 'fa-cogs', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '108');
```

Execute: `mysql -u root -p12345678 mes_data < scripts/sql/device-management.sql`

- [ ] **Step 2: Commit**

```bash
git add scripts/sql/device-management.sql
git commit -m "feat: add device management tables, seed data, and menu entry"
```

---

### Task 2: Backend — Entities and DTOs

**Files (create 6 files):**
- `mes/src/main/java/com/wangziyang/mes/basedata/entity/SpDevice.java`
- `mes/src/main/java/com/wangziyang/mes/basedata/entity/SpDeviceGroup.java`
- `mes/src/main/java/com/wangziyang/mes/basedata/entity/SpDeviceGroupItem.java`
- `mes/src/main/java/com/wangziyang/mes/basedata/dto/SpDeviceDTO.java`
- `mes/src/main/java/com/wangziyang/mes/basedata/dto/SpDeviceGroupDTO.java`
- `mes/src/main/java/com/wangziyang/mes/basedata/request/SpDevicePageReq.java`
- `mes/src/main/java/com/wangziyang/mes/basedata/request/SpDeviceGroupPageReq.java`

- [ ] **Step 1: Create SpDevice entity**

```java
package com.wangziyang.mes.basedata.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

@TableName("sp_device")
public class SpDevice extends BaseEntity {
    private static final long serialVersionUID = 1L;

    private String code;
    private String name;
    private String type;
    private String model;
    private String specs;
    private String lineId;
    private String location;
    private String status;
    private String descr;

    @TableField(value = "is_deleted")
    private String deleted;

    // getters and setters
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public String getSpecs() { return specs; }
    public void setSpecs(String specs) { this.specs = specs; }
    public String getLineId() { return lineId; }
    public void setLineId(String lineId) { this.lineId = lineId; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getDescr() { return descr; }
    public void setDescr(String descr) { this.descr = descr; }
    public String getDeleted() { return deleted; }
    public void setDeleted(String deleted) { this.deleted = deleted; }
}
```

- [ ] **Step 2: Create SpDeviceGroup entity**

```java
package com.wangziyang.mes.basedata.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

@TableName("sp_device_group")
public class SpDeviceGroup extends BaseEntity {
    private static final long serialVersionUID = 1L;

    private String code;
    private String name;
    private String descr;

    @TableField(value = "is_deleted")
    private String deleted;

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescr() { return descr; }
    public void setDescr(String descr) { this.descr = descr; }
    public String getDeleted() { return deleted; }
    public void setDeleted(String deleted) { this.deleted = deleted; }
}
```

- [ ] **Step 3: Create SpDeviceGroupItem entity**

```java
package com.wangziyang.mes.basedata.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

@TableName("sp_device_group_item")
public class SpDeviceGroupItem extends BaseEntity {
    private static final long serialVersionUID = 1L;

    private String groupId;
    private String deviceId;

    public String getGroupId() { return groupId; }
    public void setGroupId(String groupId) { this.groupId = groupId; }
    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }
}
```

- [ ] **Step 4: Create DTOs and PageReqs**

SpDeviceDTO extends SpDevice, adds: `lineName`, `orderCount` (Integer).
SpDeviceGroupDTO extends SpDeviceGroup, adds: `deviceCount` (Integer), `deviceList` (List<SpDevice>), `deviceIds` (String[]).
SpDevicePageReq extends BasePageReq with: `name`, `code`, `type` String fields.
SpDeviceGroupPageReq extends BasePageReq with: `name`, `code` String fields.

- [ ] **Step 5: Verify compilation** — `cd mes && mvn compiler:compile -q`
- [ ] **Step 6: Commit** — "feat: add device entities, DTOs and page requests"

---

### Task 3: Backend — Mappers with XML

**Files (create 4 files):**
- `mes/src/main/java/com/wangziyang/mes/basedata/mapper/SpDeviceMapper.java`
- `mes/src/main/resources/mapper/basedata/SpDeviceMapper.xml`
- `mes/src/main/java/com/wangziyang/mes/basedata/mapper/SpDeviceGroupMapper.java`
- `mes/src/main/resources/mapper/basedata/SpDeviceGroupMapper.xml`
- `mes/src/main/java/com/wangziyang/mes/basedata/mapper/SpDeviceGroupItemMapper.java`

- [ ] **Step 1: SpDeviceMapper + XML** — `pageWithRelations` method LEFT JOIN sp_line for line name, filters by name/code/type
- [ ] **Step 2: SpDeviceGroupMapper + XML** — `pageWithRelations` method with subquery COUNT from sp_device_group_item for deviceCount
- [ ] **Step 3: SpDeviceGroupItemMapper** — extends BaseMapper, no custom methods
- [ ] **Step 4: Verify compilation**
- [ ] **Step 5: Commit** — "feat: add device mappers with pagination queries"

---

### Task 4: Backend — Services

**Files (create 6 files):**
- `ISpDeviceService.java` / `SpDeviceServiceImpl.java`
- `ISpDeviceGroupService.java` / `SpDeviceGroupServiceImpl.java`
- `ISpDeviceGroupItemService.java` / `SpDeviceGroupItemServiceImpl.java`

- [ ] **Step 1: ISpDeviceService** — `IPage<SpDeviceDTO> pageWithRelations(SpDevicePageReq req)` + `boolean hasOrders(String deviceId)`
- [ ] **Step 2: SpDeviceServiceImpl** — implements pagination, and `hasOrders` checks sp_order table
- [ ] **Step 3: ISpDeviceGroupService** — `IPage<SpDeviceGroupDTO> pageWithRelations(SpDeviceGroupPageReq req)`
- [ ] **Step 4: SpDeviceGroupServiceImpl** — delegates to mapper
- [ ] **Step 5: ISpDeviceGroupItemService / Impl** — basic IService
- [ ] **Step 6: Verify compilation**
- [ ] **Step 7: Commit** — "feat: add device and device group services"

---

### Task 5: Backend — Controllers

**Files (create 2 files):**
- `mes/src/main/java/com/wangziyang/mes/basedata/controller/admin/SpDeviceController.java`
- `mes/src/main/java/com/wangziyang/mes/basedata/controller/admin/SpDeviceGroupController.java`

- [ ] **Step 1: SpDeviceController** (`/basedata/device`)

Endpoints:
- `POST /page` → `spDeviceService.pageWithRelations(req)`
- `GET /{id}` → `spDeviceService.getById(id)`
- `POST /add-or-update` → `spDeviceService.saveOrUpdate(record)`
- `POST /delete` → checks `sp_order` for device references; if found, return error "设备已关联生产作业，无法删除"; otherwise soft-delete

- [ ] **Step 2: SpDeviceGroupController** (`/basedata/device-group`)

Endpoints:
- `GET /list-ui` → forward to index.html
- `POST /page` → `spDeviceGroupService.pageWithRelations(req)`
- `GET /{id}` → getById
- `POST /add-or-update` → saveOrUpdate
- `POST /delete` → soft-delete
- `GET /items/{groupId}` → list devices in group
- `POST /items/add` → batch add (JSON body: groupId, deviceIds[])
- `POST /items/remove` → remove one (JSON body: groupId, deviceId)

All `POST` endpoints with `@RequestBody` must have `Content-Type: application/json` on frontend.

- [ ] **Step 3: Verify compilation** — `cd mes && mvn compiler:compile -q`
- [ ] **Step 4: Commit** — "feat: add device and device group controllers"

---

### Task 6: Frontend — Types and APIs

**Files (create 3 files):**
- `mes/frontend/src/types/device.ts`
- `mes/frontend/src/api/basedata/device.ts`
- `mes/frontend/src/api/basedata/device-group.ts`

- [ ] **Step 1: Create types/device.ts**

```typescript
export interface SpDevice {
  id: string; code: string; name: string; type?: string; model?: string
  specs?: string; lineId?: string; location?: string; status?: string
  descr?: string; deleted: string
  createTime?: string; createUsername?: string; updateTime?: string; updateUsername?: string
}

export interface SpDeviceDTO extends SpDevice {
  lineName?: string; orderCount?: number
}

export interface SpDeviceGroup {
  id: string; code: string; name: string; descr?: string; deleted: string
  createTime?: string; createUsername?: string; updateTime?: string; updateUsername?: string
}

export interface SpDeviceGroupDTO extends SpDeviceGroup {
  deviceCount?: number; deviceList?: SpDevice[]; deviceIds?: string[]
}
```

- [ ] **Step 2: Create api/basedata/device.ts** — `page`, `getById`, `addOrUpdate`, `deleteById` functions. `deleteById` and `addOrUpdate` use JSON content type.

- [ ] **Step 3: Create api/basedata/device-group.ts** — `page`, `getById`, `addOrUpdate`, `deleteById`, `getGroupItems`, `addGroupItems`, `removeGroupItem`. `deleteById`, `addOrUpdate`, `addGroupItems`, `removeGroupItem` use JSON content type.

- [ ] **Step 4: Verify TypeScript** — `cd mes/frontend && npx tsc --noEmit`
- [ ] **Step 5: Commit** — "feat: add device types and API functions"

---

### Task 7: Frontend — DeviceForm and DeviceGroupForm

**Files (create 2 files):**
- `mes/frontend/src/pages/basedata/DeviceForm.tsx`
- `mes/frontend/src/pages/basedata/DeviceGroupForm.tsx`

- [ ] **Step 1: DeviceForm** — Fields: code, name, type, model, specs, lineId (Select), location, status (Select: 空闲/运行中/维修中/报废), descr, deleted. Edit mode: populate from record prop. Time fields not needed.

- [ ] **Step 2: DeviceGroupForm** — Fields: code, name, descr, deleted. Simple form.

- [ ] **Step 3: Verify TypeScript**
- [ ] **Step 4: Commit** — "feat: add DeviceForm and DeviceGroupForm components"

---

### Task 8: Frontend — DeviceGroupItemModal

**Files (create 1 file):**
- `mes/frontend/src/pages/basedata/DeviceGroupItemModal.tsx`

- [ ] **Step 1: Create modal** — Two-panel layout like TeamUserModal:
  - Left: available devices (not in group) with search + checkboxes + "加入编组" button
  - Right: current devices in group with remove button
  - Uses `deviceApi` for available devices and `deviceGroupApi` for group items

- [ ] **Step 2: Verify TypeScript**
- [ ] **Step 3: Commit** — "feat: add DeviceGroupItemModal for device assignment"

---

### Task 9: Frontend — DeviceGroupPage and Route

**Files (create 1, modify 2):**
- Create: `mes/frontend/src/pages/basedata/DeviceGroupPage.tsx`
- Modify: `mes/frontend/src/App.tsx` (+ route)
- Modify: `mes/frontend/src/utils/urlMap.ts` (+ mapping)

- [ ] **Step 1: DeviceGroupPage** — Ant Design Tabs with 2 tabs:
  - Tab "设备管理": Device table + add/edit modal (DeviceForm) + delete (with order check error handling)
  - Tab "设备编组": Group table + add/edit modal (DeviceGroupForm) + delete + "设备管理" button → DeviceGroupItemModal
  - Search, pagination, PermissionGuard on add buttons

- [ ] **Step 2: Add route** — `basedata/device-group` → DeviceGroupPage in App.tsx
- [ ] **Step 3: Add URL map** — `'/basedata/device-group/list-ui': '/basedata/device-group'`
- [ ] **Step 4: Build frontend** — `cd mes/frontend && npm run build`
- [ ] **Step 5: Commit** — "feat: add DeviceGroupPage with device and group management"

---

### Task 10: Integration Verification

- [ ] **Step 1: Execute SQL against DB** — `mysql -u root -p12345678 mes_data < scripts/sql/device-management.sql`
- [ ] **Step 2: Restart backend** — kill + restart spring-boot:run
- [ ] **Step 3: Verify backend compiles** — `mvn compiler:compile -q`
- [ ] **Step 4: Update static assets** — commit built frontend
- [ ] **Step 5: Test endpoints** — verify page endpoint returns data (requires login)
