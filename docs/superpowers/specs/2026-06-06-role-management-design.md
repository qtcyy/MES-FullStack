# Role Management Enhancement Design

**Date:** 2026-06-06
**Status:** Approved
**Branch:** `rebuild/frontend`

## Overview

Enhance the MES role management module to support:
- Role CRUD with system-role flag (system roles are non-deletable, editable only for permissions)
- Menu/permission assignment via tree checkbox UI
- 7 preset roles with pre-configured menu permissions

## Current State

### What Exists

| Component | Status |
|-----------|--------|
| Backend `SysRole` entity + CRUD | Done |
| Backend `sp_sys_role_menu` join table | Done (table exists, no service method) |
| Backend `SysRoleMenuMapper/Service` | Done (no `rebuild` method) |
| Backend menu tree endpoint `/admin/sys/menu/tree` | Done |
| Frontend `RoleList.tsx` + `RoleForm.tsx` | Done (basic CRUD, no menu assignment) |
| Frontend API `addOrUpdate` accepts `sysMenuIds` | Done (param not used by form) |
| Frontend `TreeVO.checked` field | Done (not consumed anywhere) |

### Gaps

1. `sp_sys_role` table has no `is_system` column
2. `SysRoleController` lacks endpoint to get/save role-menu assignments
3. `SysRoleMenuServiceImpl` has no `rebuild(roleId, menuIds)` method
4. `RoleForm.tsx` has no menu tree selector
5. `SysRole` TypeScript type lacks `isSystem` and `sysMenuIds`
6. `RoleList.tsx` has no "Authorize Menus" action button

---

## Design

### 1. Database

#### 1.1 Schema Change

```sql
ALTER TABLE sp_sys_role ADD COLUMN is_system varchar(1) DEFAULT '0'
  COMMENT '系统角色 0-否 1-是';
```

#### 1.2 Seed Data — 7 Preset Roles

| Role | Code | is_system | descr |
|------|------|-----------|-------|
| 数据员 | data_clerk | 1 | 享有基础数据中心权限 |
| 工艺员 | process_tech | 1 | 享有工艺管理权限 |
| 生产计划员 | prod_planner | 1 | 享有计划管理权限 |
| 生产主管 | prod_supervisor | 1 | 享有生产管理相关权限 |
| 生产作业员 | prod_operator | 1 | 享有在制品管理权限 |
| 库房管理员 | warehouse_mgr | 1 | 享有物料管理权限 |
| 质量管理员 | quality_mgr | 1 | 享有质量相关管理权限 |

#### 1.3 Seed Data — Role-Menu Assignments

| Role | Assigned Menu IDs |
|------|-------------------|
| 数据员 | 105, 106 (基础数据配置平台 + 维护) |
| 工艺员 | 15, 151, 152 (工艺管理 + 路线 + BOM) |
| 生产计划员 | 12, 121 (计划管理 + 工单下达) |
| 生产主管 | 12, 121, 16, 161, 14, 141 (计划 + 在制品 + 数字化) |
| 生产作业员 | 16, 161 (在制品管理 + SN采集) |
| 库房管理员 | 13, 131 (物料管理 + 物料维护) |
| 质量管理员 | 105, 106, 16, 161 (基础数据 + 在制品) |

### 2. Backend

#### 2.1 `SysRole` Entity

Add field:

```java
@TableField("is_system")
private String isSystem;  // "0"=normal, "1"=system role
```

#### 2.2 `SysRoleController` — New Endpoints

**GET `/admin/sys/role/tree/{roleId}`**
- Returns list of menu IDs currently assigned to the role
- Used by frontend to initialize checkbox tree state

**POST `/admin/sys/role/add-or-update` (modify)**
- Already exists; ensure it handles `sysMenuIds` parameter via `SysRoleDTO`
- After saving the role, call `sysRoleMenuService.rebuild(roleId, menuIds)`

#### 2.3 `SysRoleMenuServiceImpl` — New Method

```java
void rebuild(String roleId, String[] menuIds);
```

Logic:
1. Delete all existing `SysRoleMenu` records where `role_id = roleId`
2. For each `menuId` in `menuIds`, insert a new `SysRoleMenu(roleId, menuId)`
3. Use `@Transactional`

#### 2.4 `SysRoleDTO`

Add field:
```java
private String[] sysMenuIds;
```

### 3. Frontend

#### 3.1 Types (`types/user.ts`)

```typescript
export interface SysRole {
  // ... existing fields
  isSystem?: string     // "0" | "1"
  sysMenuIds?: string[] // menu IDs for tree selection
}
```

#### 3.2 RoleForm.tsx — Changes

- Add `isSystem` Switch/Radio field: "系统角色" toggle
- After existing form fields, add an Ant Design `<Tree>` component with `checkable`
- Load menu tree via `systemMenuApi.tree()` (`GET /admin/sys/menu/tree`)
- Convert menu data to Ant Design `DataNode[]` format (`key`, `title`, `children`)
- In edit mode, load role detail (which now includes `sysMenuIds`) and set `checkedKeys`
- On form submit, pass `sysMenuIds` (the checked tree keys) and `isSystem` to the API

#### 3.3 RoleList.tsx — Changes

- Add "系统角色" column with Tag (blue for system role, green for normal)
- Add "授权菜单" action button in operations column — opens a dedicated modal containing only the menu tree for quick permission editing
- System roles (`isSystem === '1'`): hide the delete button

#### 3.4 API (`api/system/role.ts`)

Add:
```typescript
getRoleMenuTree(roleId: string): Promise<string[]>  // GET /admin/sys/role/tree/{roleId}
```

### 4. Error Handling

- Role name uniqueness: backend returns error message, frontend displays via `message.error`
- Role code uniqueness: same pattern
- System role delete attempt: backend rejects with clear message; frontend hides the button
- Empty menu selection: allowed (role with no menus)

### 5. Testing

- Backend: verify `rebuild` transactional behavior (rollback on partial failure)
- Frontend: verify tree renders, checkboxes work, form submits with menu IDs
- Manual: verify each preset role's menu assignments after seed data insertion

---

## Implementation Order

1. Database: ALTER TABLE + seed data INSERT
2. Backend: Entity → DTO → Service → Controller
3. Frontend: Types → API → RoleForm → RoleList
4. Integration: End-to-end test with seed data roles
