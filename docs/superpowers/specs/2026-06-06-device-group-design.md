# Device Group (编组设备定义) Design

**Date:** 2026-06-06
**Status:** Approved
**Branch:** `rebuild/frontend`

## Overview

Add "编组设备定义" module to MES. Devices are grouped by function, type, or location for unified management. Supports static grouping (manual add/remove). Devices must be defined before grouping; devices linked to active production orders cannot be deleted.

### Concrete Goal

Create device group "EG-1" / "设备编组1", add device "DS11-1" to it.

---

## Data Model

### New Tables

#### `sp_device`

```sql
CREATE TABLE sp_device (
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
);
```

#### `sp_device_group`

```sql
CREATE TABLE sp_device_group (
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
);
```

#### `sp_device_group_item`

```sql
CREATE TABLE sp_device_group_item (
  id varchar(64) NOT NULL COMMENT '主键',
  group_id varchar(64) NOT NULL COMMENT '编组ID',
  device_id varchar(64) NOT NULL COMMENT '设备ID',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_group_device (group_id, device_id)
);
```

### Seed Data

```sql
-- Device: DS11-1
INSERT INTO sp_device (id, code, name, type, status, is_deleted, create_time, create_username, update_time, update_username)
VALUES (REPLACE(UUID(), '-', ''), 'DS11-1', 'DS11-1', '通用设备', '0', '0', NOW(), 'admin', NOW(), 'admin');

-- Group: EG-1
INSERT INTO sp_device_group (id, code, name, descr, is_deleted, create_time, create_username, update_time, update_username)
VALUES (REPLACE(UUID(), '-', ''), 'EG-1', '设备编组1', '设备编组1', '0', NOW(), 'admin', NOW(), 'admin');

-- Assign DS11-1 to EG-1
INSERT INTO sp_device_group_item (id, group_id, device_id, create_time, create_username, update_time, update_username)
SELECT REPLACE(UUID(), '-', ''), g.id, d.id, NOW(), 'admin', NOW(), 'admin'
FROM sp_device_group g, sp_device d
WHERE g.code = 'EG-1' AND d.code = 'DS11-1';
```

### Menu Entry

```sql
INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
VALUES ('108', 'deviceGroup', '编组设备定义', '/basedata/device-group/list-ui', '10', '3', '8', '0', 'device:add', 'fa-cogs', '', NOW(), 'admin', NOW(), 'admin');
```

---

## Backend

Package: `com.wangziyang.mes.basedata`

| File | Purpose |
|------|---------|
| `entity/SpDevice.java` | Maps to `sp_device` |
| `entity/SpDeviceGroup.java` | Maps to `sp_device_group` |
| `entity/SpDeviceGroupItem.java` | Maps to `sp_device_group_item` |
| `mapper/SpDeviceMapper.java` + XML | Paginated query with line name |
| `mapper/SpDeviceGroupMapper.java` + XML | Paginated query with device count |
| `mapper/SpDeviceGroupItemMapper.java` | Basic mapper |
| `service/ISpDeviceService.java` + Impl | CRUD + delete check |
| `service/ISpDeviceGroupService.java` + Impl | CRUD |
| `service/ISpDeviceGroupItemService.java` + Impl | Link management |
| `controller/admin/SpDeviceController.java` | Device CRUD |
| `controller/admin/SpDeviceGroupController.java` | Group CRUD + item management |
| `dto/` | SpDeviceDTO, SpDeviceGroupDTO |
| `request/` | SpDevicePageReq, SpDeviceGroupPageReq |

### Controllers

**SpDeviceController** (`/basedata/device`):
| Method | Path | Description |
|--------|------|-------------|
| POST | `/page` | Paginated list |
| GET | `/{id}` | Get detail |
| POST | `/add-or-update` | Create/update |
| POST | `/delete` | Delete (checks sp_order for references) |

**SpDeviceGroupController** (`/basedata/device-group`):
| Method | Path | Description |
|--------|------|-------------|
| GET | `/list-ui` | Forward to SPA |
| POST | `/page` | Paginated list |
| GET | `/{id}` | Get detail |
| POST | `/add-or-update` | Create/update |
| POST | `/delete` | Soft delete |
| GET | `/items/{groupId}` | List devices in group |
| POST | `/items/add` | Add devices to group |
| POST | `/items/remove` | Remove device from group |

### Business Rules

- Device code unique (DB unique index)
- Group code unique (DB unique index)
- Before deleting a device, check `sp_order` for references. If linked to any order, reject.
- Device-group assignment is many-to-many (a device can be in multiple groups, a group has many devices)

---

## Frontend

### Route

- `/basedata/device-group` → `DeviceGroupPage` component
- Single page with two sections (device management + group management)

### Files

| File | Purpose |
|------|---------|
| `pages/basedata/DeviceGroupPage.tsx` | Main page with device + group sections |
| `pages/basedata/DeviceForm.tsx` | Device form modal |
| `pages/basedata/DeviceGroupForm.tsx` | Group form modal |
| `pages/basedata/DeviceGroupItemModal.tsx` | Assign devices to group modal |
| `api/basedata/device.ts` | Device API functions |
| `api/basedata/device-group.ts` | Group API functions |
| `types/device.ts` | TypeScript interfaces |

### UI Layout

```
DeviceGroupPage
├── Tabs: 设备管理 | 设备编组
│
├── Tab 1: 设备管理
│   ├── SearchForm (code, name, type)
│   ├── PageTable (code, name, type, model, line, location, status)
│   ├── 新增/编辑 ModalForm → DeviceForm
│   └── 删除 (checks for order references)
│
└── Tab 2: 设备编组
    ├── SearchForm (code, name)
    ├── PageTable (code, name, deviceCount, descr)
    ├── 新增/编辑 ModalForm → DeviceGroupForm
    ├── 删除
    └── 设备管理 Modal → DeviceGroupItemModal
        ├── Left: Available devices (search + checkbox)
        └── Right: Current devices (remove button)
```

---

## Implementation Order

1. Database: CREATE TABLE + seed data + menu INSERT
2. Backend: Entities → DTOs → Mappers → Services → Controllers
3. Frontend: Types → APIs → Forms → Modals → Main Page → Route
4. Integration: Build + verify
