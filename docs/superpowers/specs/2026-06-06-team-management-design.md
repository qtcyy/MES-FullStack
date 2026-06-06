# Team (班组) Management Design

**Date:** 2026-06-06
**Status:** Approved
**Branch:** `rebuild/frontend`

## Overview

Add "班组员工定义" (Team & Employee Definition) module to MES. A 班组 organizes workers of same/similar/different trades for production activities. Each team has one shift schedule defining work hours and workdays. Users are assigned to teams for attendance, scheduling, and permission control.

### Concrete Goal

Create team "生产作业班组1" (code: BZ001), assign user "作业员1" to it.

---

## Data Model

### New Tables

#### `sp_team`

```sql
CREATE TABLE sp_team (
  id varchar(64) NOT NULL COMMENT '主键',
  code varchar(32) NOT NULL COMMENT '班组代码',
  name varchar(64) NOT NULL COMMENT '班组名称',
  descr varchar(255) DEFAULT '' COMMENT '备注',
  line_id varchar(64) DEFAULT NULL COMMENT '生产线ID',
  workshop_id varchar(64) DEFAULT NULL COMMENT '车间ID',
  start_time varchar(8) DEFAULT NULL COMMENT '上班时间 HH:mm',
  end_time varchar(8) DEFAULT NULL COMMENT '下班时间 HH:mm',
  workdays varchar(32) DEFAULT NULL COMMENT '工作日 1,2,3,4,5 (周一到周五)',
  is_deleted varchar(2) NOT NULL DEFAULT '0' COMMENT '0=正常 1=删除 2=禁用',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_team_code (code)
);
```

#### `sp_team_user`

```sql
CREATE TABLE sp_team_user (
  id varchar(64) NOT NULL COMMENT '主键',
  team_id varchar(64) NOT NULL COMMENT '班组ID',
  user_id varchar(64) NOT NULL COMMENT '用户ID',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_team_user (team_id, user_id)
);
```

### Seed Data

```sql
-- Team: 生产作业班组1
INSERT INTO sp_team (id, code, name, descr, start_time, end_time, workdays, is_deleted, create_time, create_username, update_time, update_username)
VALUES (REPLACE(UUID(), '-', ''), 'BZ001', '生产作业班组1', '生产作业班组', '08:00', '17:00', '1,2,3,4,5', '0', NOW(), 'admin', NOW(), 'admin');

-- Assign user "作业员1" if exists
INSERT INTO sp_team_user (id, team_id, user_id, create_time, create_username, update_time, update_username)
SELECT REPLACE(UUID(), '-', ''), t.id, u.id, NOW(), 'admin', NOW(), 'admin'
FROM sp_team t, sp_sys_user u
WHERE t.code = 'BZ001' AND u.name = '作业员1';
```

### Menu Entry

```sql
-- Add "班组员工定义" under 系统管理 (parent_id=10)
INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
VALUES ('107', 'team', '班组员工定义', '/admin/sys/team/list-ui', '10', '3', '7', '0', 'team:add', 'fa-users', '', NOW(), 'admin', NOW(), 'admin');
```

---

## Backend

### Package: `com.wangziyang.mes.system`

Follows existing module conventions (entity/mapper/service/controller under `system/`).

| File | Purpose |
|------|---------|
| `entity/SpTeam.java` | Maps to `sp_team`, extends `BaseEntity` |
| `entity/SpTeamUser.java` | Maps to `sp_team_user`, extends `BaseEntity` |
| `mapper/SpTeamMapper.java` | MyBatis-Plus BaseMapper |
| `mapper/SpTeamUserMapper.java` | MyBatis-Plus BaseMapper |
| `service/ISpTeamService.java` | Interface extends IService |
| `service/ISpTeamUserService.java` | Interface extends IService |
| `service/impl/SpTeamServiceImpl.java` | CRUD + user assignment logic |
| `service/impl/SpTeamUserServiceImpl.java` | Basic impl |
| `controller/admin/SpTeamController.java` | REST endpoints |

### Controller Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/admin/sys/team/page` | Paginated list, joins line/workshop names |
| GET | `/admin/sys/team/{id}` | Get team detail |
| POST | `/admin/sys/team/add-or-update` | Create or update team |
| POST | `/admin/sys/team/delete` | Soft delete (sets is_deleted=1) |
| GET | `/admin/sys/team/users/{teamId}` | List users in a team |
| POST | `/admin/sys/team/users/add` | Add users to team (body: teamId, userIds[]) |
| POST | `/admin/sys/team/users/remove` | Remove user from team (body: teamId, userId) |
| GET | `/admin/sys/team/available-users` | List users not in any team (for selection) |

### DTOs

- `SpTeamDTO extends SpTeam` — adds `lineName`, `workshopName`, `userCount`, `userList`
- `SpTeamPageReq extends BasePageReq` — query params for paginated search

---

## Frontend

### Route

- `/system/team` → `TeamList` component
- Update `App.tsx` routes
- Update `urlMap.ts` mapping
- Update `SpaController.java` (if needed — `/system/**` already covered)

### Files

| File | Purpose |
|------|---------|
| `pages/system/TeamList.tsx` | Search + table + add/edit/delete, opens TeamForm modal and TeamUserModal |
| `pages/system/TeamForm.tsx` | Form: code, name, descr, line_id (Select), workshop_id (Select), start_time (TimePicker), end_time (TimePicker), workdays (Checkbox group: 周一~周日), deleted |
| `pages/system/TeamUserModal.tsx` | Modal: left panel (available users, searchable, checkable), right panel (current members with remove button), add/remove actions |
| `api/system/team.ts` | API functions: page, getById, addOrUpdate, deleteById, getTeamUsers, addTeamUsers, removeTeamUser, getAvailableUsers |
| `types/team.ts` | TypeScript interfaces: SpTeam, SpTeamDTO |

### UI Flow

1. User clicks "班组员工定义" in sidebar → navigates to `/system/team`
2. TeamList loads with paginated table
3. Click "新增" → opens TeamForm modal (empty form)
4. Click "编辑" → opens TeamForm modal (loaded with team data)
5. Click "员工管理" → opens TeamUserModal:
   - Left: searchable user list with checkboxes (users not in this team)
   - Right: current team members with remove button
   - "加入班组" button to add selected users
6. Click "删除" → confirm popup → soft delete

### Workdays Display

Store as comma-separated numbers. Display as Chinese weekday names:
- `"1,2,3,4,5"` → "周一, 周二, 周三, 周四, 周五"
- Checkbox: 周一(1), 周二(2), ..., 周日(7)

---

## Implementation Order

1. Database: CREATE TABLE + seed data + menu INSERT
2. Backend: Entities → Mappers → Services → Controller → DTOs → Request
3. Frontend: Types → API → TeamForm → TeamUserModal → TeamList → Route
4. Integration: Build + manual test
