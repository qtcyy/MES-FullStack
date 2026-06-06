# Team Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "班组员工定义" module with team CRUD, shift schedule, and employee assignment to MES.

**Architecture:** Two new DB tables (`sp_team`, `sp_team_user`), backend entities/services/controller under `system/` package following existing MyBatis-Plus patterns, frontend TeamList/TeamForm/TeamUserModal components with Ant Design, new route `/system/team`.

**Tech Stack:** Java 8 + Spring Boot 2.1.7 + MyBatis-Plus 3.1.2, React 18 + TypeScript + Ant Design 5 + TanStack Query

---

### Task 1: Database — Tables, Seed Data, and Menu

**Files:**
- Create: `scripts/sql/team-management.sql`

- [ ] **Step 1: Create SQL script**

```sql
-- Team Management Module
-- Creates sp_team and sp_team_user tables, seed data, and menu entry

CREATE TABLE IF NOT EXISTS sp_team (
  id varchar(64) NOT NULL COMMENT '主键',
  code varchar(32) NOT NULL COMMENT '班组代码',
  name varchar(64) NOT NULL COMMENT '班组名称',
  descr varchar(255) DEFAULT '' COMMENT '备注',
  line_id varchar(64) DEFAULT NULL COMMENT '生产线ID',
  workshop_id varchar(64) DEFAULT NULL COMMENT '车间ID',
  start_time varchar(8) DEFAULT NULL COMMENT '上班时间 HH:mm',
  end_time varchar(8) DEFAULT NULL COMMENT '下班时间 HH:mm',
  workdays varchar(32) DEFAULT NULL COMMENT '工作日 1,2,3,4,5,6,7',
  is_deleted varchar(2) NOT NULL DEFAULT '0' COMMENT '0=正常 1=删除 2=禁用',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_team_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='班组表';

CREATE TABLE IF NOT EXISTS sp_team_user (
  id varchar(64) NOT NULL COMMENT '主键',
  team_id varchar(64) NOT NULL COMMENT '班组ID',
  user_id varchar(64) NOT NULL COMMENT '用户ID',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_team_user (team_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='班组用户关联表';

-- Seed: team "生产作业班组1"
INSERT INTO sp_team (id, code, name, descr, start_time, end_time, workdays, is_deleted, create_time, create_username, update_time, update_username)
SELECT REPLACE(UUID(), '-', ''), 'BZ001', '生产作业班组1', '生产作业班组', '08:00', '17:00', '1,2,3,4,5', '0', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_team WHERE code = 'BZ001');

-- Seed: assign user "作业员1" to the team
INSERT INTO sp_team_user (id, team_id, user_id, create_time, create_username, update_time, update_username)
SELECT REPLACE(UUID(), '-', ''), t.id, u.id, NOW(), 'admin', NOW(), 'admin'
FROM sp_team t, sp_sys_user u
WHERE t.code = 'BZ001' AND u.name = '作业员1'
AND NOT EXISTS (SELECT 1 FROM sp_team_user WHERE team_id = t.id AND user_id = u.id);

-- Menu entry under 系统管理 (parent_id=10)
INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '107', 'team', '班组员工定义', '/admin/sys/team/list-ui', '10', '3', '7', '0', 'team:add', 'fa-users', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '107');
```

- [ ] **Step 2: Execute against database**

```bash
mysql -u root -p12345678 mes_data < scripts/sql/team-management.sql
```

Expected: Tables created, seed data inserted.

- [ ] **Step 3: Commit**

```bash
git add scripts/sql/team-management.sql
git commit -m "feat: add team management tables, seed data, and menu entry"
```

---

### Task 2: Backend — Entities

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/system/entity/SpTeam.java`
- Create: `mes/src/main/java/com/wangziyang/mes/system/entity/SpTeamUser.java`

- [ ] **Step 1: Create SpTeam entity**

```java
package com.wangziyang.mes.system.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

/**
 * 班组实体
 *
 * @author MES Team
 * @since 2026-06-06
 */
@TableName("sp_team")
public class SpTeam extends BaseEntity {

    private static final long serialVersionUID = 1L;

    /** 班组代码 */
    private String code;

    /** 班组名称 */
    private String name;

    /** 备注 */
    private String descr;

    /** 生产线ID */
    private String lineId;

    /** 车间ID */
    private String workshopId;

    /** 上班时间 */
    private String startTime;

    /** 下班时间 */
    private String endTime;

    /** 工作日 */
    private String workdays;

    /** 状态(0:正常;1:删除;2:禁用) */
    @TableField(value = "is_deleted")
    private String deleted;

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescr() { return descr; }
    public void setDescr(String descr) { this.descr = descr; }
    public String getLineId() { return lineId; }
    public void setLineId(String lineId) { this.lineId = lineId; }
    public String getWorkshopId() { return workshopId; }
    public void setWorkshopId(String workshopId) { this.workshopId = workshopId; }
    public String getStartTime() { return startTime; }
    public void setStartTime(String startTime) { this.startTime = startTime; }
    public String getEndTime() { return endTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }
    public String getWorkdays() { return workdays; }
    public void setWorkdays(String workdays) { this.workdays = workdays; }
    public String getDeleted() { return deleted; }
    public void setDeleted(String deleted) { this.deleted = deleted; }
}
```

- [ ] **Step 2: Create SpTeamUser entity**

```java
package com.wangziyang.mes.system.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

/**
 * 班组用户关联实体
 *
 * @author MES Team
 * @since 2026-06-06
 */
@TableName("sp_team_user")
public class SpTeamUser extends BaseEntity {

    private static final long serialVersionUID = 1L;

    /** 班组ID */
    private String teamId;

    /** 用户ID */
    private String userId;

    public String getTeamId() { return teamId; }
    public void setTeamId(String teamId) { this.teamId = teamId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
}
```

- [ ] **Step 3: Verify compilation**

```bash
cd mes && mvn compiler:compile -q
```

Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/system/entity/SpTeam.java \
        mes/src/main/java/com/wangziyang/mes/system/entity/SpTeamUser.java
git commit -m "feat: add SpTeam and SpTeamUser entities"
```

---

### Task 3: Backend — DTOs

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/system/dto/SpTeamDTO.java`
- Create: `mes/src/main/java/com/wangziyang/mes/system/request/SpTeamPageReq.java`

- [ ] **Step 1: Create SpTeamDTO**

```java
package com.wangziyang.mes.system.dto;

import com.wangziyang.mes.system.entity.SpTeam;
import com.wangziyang.mes.system.entity.SysUser;
import java.util.List;

/**
 * 班组DTO — 扩展生产线/车间名称和员工列表
 */
public class SpTeamDTO extends SpTeam {

    /** 生产线名称 */
    private String lineName;

    /** 车间名称 */
    private String workshopName;

    /** 员工数量 */
    private Integer userCount;

    /** 员工列表 */
    private List<SysUser> userList;

    /** 员工ID数组(用于表单提交) */
    private String[] userIds;

    public String getLineName() { return lineName; }
    public void setLineName(String lineName) { this.lineName = lineName; }
    public String getWorkshopName() { return workshopName; }
    public void setWorkshopName(String workshopName) { this.workshopName = workshopName; }
    public Integer getUserCount() { return userCount; }
    public void setUserCount(Integer userCount) { this.userCount = userCount; }
    public List<SysUser> getUserList() { return userList; }
    public void setUserList(List<SysUser> userList) { this.userList = userList; }
    public String[] getUserIds() { return userIds; }
    public void setUserIds(String[] userIds) { this.userIds = userIds; }
}
```

- [ ] **Step 2: Create SpTeamPageReq**

```java
package com.wangziyang.mes.system.request;

import com.wangziyang.mes.common.BasePageReq;

/**
 * 班组分页查询请求
 */
public class SpTeamPageReq extends BasePageReq {

    /** 班组名称(模糊搜索) */
    private String name;

    /** 班组代码(模糊搜索) */
    private String code;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
}
```

- [ ] **Step 3: Verify compilation**

```bash
cd mes && mvn compiler:compile -q
```

Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/system/dto/SpTeamDTO.java \
        mes/src/main/java/com/wangziyang/mes/system/request/SpTeamPageReq.java
git commit -m "feat: add SpTeamDTO and SpTeamPageReq"
```

---

### Task 4: Backend — Mappers

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/system/mapper/SpTeamMapper.java`
- Create: `mes/src/main/java/com/wangziyang/mes/system/mapper/SpTeamUserMapper.java`
- Create: `mes/src/main/resources/mapper/system/SpTeamMapper.xml`

- [ ] **Step 1: Create SpTeamMapper interface**

```java
package com.wangziyang.mes.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangziyang.mes.system.dto.SpTeamDTO;
import com.wangziyang.mes.system.entity.SpTeam;
import org.apache.ibatis.annotations.Param;

/**
 * 班组 Mapper
 */
public interface SpTeamMapper extends BaseMapper<SpTeam> {

    /**
     * 分页查询班组（关联生产线和车间名称）
     */
    IPage<SpTeamDTO> pageWithRelations(Page<SpTeam> page, @Param("name") String name, @Param("code") String code);
}
```

- [ ] **Step 2: Create SpTeamMapper.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.wangziyang.mes.system.mapper.SpTeamMapper">

    <resultMap id="teamResultMap" type="com.wangziyang.mes.system.dto.SpTeamDTO">
        <id column="id" property="id"/>
        <result column="code" property="code"/>
        <result column="name" property="name"/>
        <result column="descr" property="descr"/>
        <result column="line_id" property="lineId"/>
        <result column="workshop_id" property="workshopId"/>
        <result column="start_time" property="startTime"/>
        <result column="end_time" property="endTime"/>
        <result column="workdays" property="workdays"/>
        <result column="is_deleted" property="deleted"/>
        <result column="create_time" property="createTime"/>
        <result column="create_username" property="createUsername"/>
        <result column="update_time" property="updateTime"/>
        <result column="update_username" property="updateUsername"/>
        <result column="line_name" property="lineName"/>
        <result column="workshop_name" property="workshopName"/>
        <result column="user_count" property="userCount"/>
    </resultMap>

    <select id="pageWithRelations" resultMap="teamResultMap">
        SELECT t.*,
               l.line AS line_name,
               w.work_shop AS workshop_name,
               (SELECT COUNT(*) FROM sp_team_user tu WHERE tu.team_id = t.id) AS user_count
        FROM sp_team t
        LEFT JOIN sp_line l ON t.line_id = l.id
        LEFT JOIN sp_work_shop w ON t.workshop_id = w.id
        WHERE t.is_deleted != '1'
        <if test="name != null and name != ''">
            AND t.name LIKE CONCAT('%', #{name}, '%')
        </if>
        <if test="code != null and code != ''">
            AND t.code LIKE CONCAT('%', #{code}, '%')
        </if>
        ORDER BY t.create_time DESC
    </select>

</mapper>
```

- [ ] **Step 3: Create SpTeamUserMapper interface**

```java
package com.wangziyang.mes.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wangziyang.mes.system.entity.SpTeamUser;

/**
 * 班组用户关联 Mapper
 */
public interface SpTeamUserMapper extends BaseMapper<SpTeamUser> {
}
```

- [ ] **Step 4: Verify compilation**

```bash
cd mes && mvn compiler:compile -q
```

Expected: BUILD SUCCESS

- [ ] **Step 5: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/system/mapper/SpTeamMapper.java \
        mes/src/main/java/com/wangziyang/mes/system/mapper/SpTeamUserMapper.java \
        mes/src/main/resources/mapper/system/SpTeamMapper.xml
git commit -m "feat: add SpTeamMapper and SpTeamUserMapper with pagination query"
```

---

### Task 5: Backend — Services

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/system/service/ISpTeamService.java`
- Create: `mes/src/main/java/com/wangziyang/mes/system/service/ISpTeamUserService.java`
- Create: `mes/src/main/java/com/wangziyang/mes/system/service/impl/SpTeamServiceImpl.java`
- Create: `mes/src/main/java/com/wangziyang/mes/system/service/impl/SpTeamUserServiceImpl.java`

- [ ] **Step 1: Create ISpTeamService**

```java
package com.wangziyang.mes.system.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.system.dto.SpTeamDTO;
import com.wangziyang.mes.system.entity.SpTeam;
import com.wangziyang.mes.system.request.SpTeamPageReq;

/**
 * 班组服务接口
 */
public interface ISpTeamService extends IService<SpTeam> {

    /**
     * 分页查询班组（含关联信息）
     */
    IPage<SpTeamDTO> pageWithRelations(SpTeamPageReq req) throws Exception;
}
```

- [ ] **Step 2: Create ISpTeamUserService**

```java
package com.wangziyang.mes.system.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.system.entity.SpTeamUser;

/**
 * 班组用户关联服务接口
 */
public interface ISpTeamUserService extends IService<SpTeamUser> {
}
```

- [ ] **Step 3: Create SpTeamServiceImpl**

```java
package com.wangziyang.mes.system.service.impl;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.system.dto.SpTeamDTO;
import com.wangziyang.mes.system.entity.SpTeam;
import com.wangziyang.mes.system.mapper.SpTeamMapper;
import com.wangziyang.mes.system.request.SpTeamPageReq;
import com.wangziyang.mes.system.service.ISpTeamService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * 班组服务实现
 */
@Service
public class SpTeamServiceImpl extends ServiceImpl<SpTeamMapper, SpTeam> implements ISpTeamService {

    @Autowired
    private SpTeamMapper spTeamMapper;

    @Override
    public IPage<SpTeamDTO> pageWithRelations(SpTeamPageReq req) throws Exception {
        Page<SpTeam> page = new Page<>(req.getCurrent(), req.getSize());
        return spTeamMapper.pageWithRelations(page, req.getName(), req.getCode());
    }
}
```

- [ ] **Step 4: Create SpTeamUserServiceImpl**

```java
package com.wangziyang.mes.system.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.system.entity.SpTeamUser;
import com.wangziyang.mes.system.mapper.SpTeamUserMapper;
import com.wangziyang.mes.system.service.ISpTeamUserService;
import org.springframework.stereotype.Service;

/**
 * 班组用户关联服务实现
 */
@Service
public class SpTeamUserServiceImpl extends ServiceImpl<SpTeamUserMapper, SpTeamUser> implements ISpTeamUserService {
}
```

- [ ] **Step 5: Verify compilation**

```bash
cd mes && mvn compiler:compile -q
```

Expected: BUILD SUCCESS

- [ ] **Step 6: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/system/service/
git commit -m "feat: add SpTeam and SpTeamUser services"
```

---

### Task 6: Backend — Controller

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/system/controller/admin/SpTeamController.java`

- [ ] **Step 1: Create SpTeamController**

```java
package com.wangziyang.mes.system.controller.admin;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.system.dto.SpTeamDTO;
import com.wangziyang.mes.system.entity.SpTeam;
import com.wangziyang.mes.system.entity.SpTeamUser;
import com.wangziyang.mes.system.entity.SysUser;
import com.wangziyang.mes.system.request.SpTeamPageReq;
import com.wangziyang.mes.system.service.ISpTeamService;
import com.wangziyang.mes.system.service.ISpTeamUserService;
import com.wangziyang.mes.system.service.ISysUserService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 班组管理控制器
 */
@Controller("adminSpTeamController")
@RequestMapping("/admin/sys/team")
public class SpTeamController extends BaseController {

    @Autowired
    private ISpTeamService spTeamService;

    @Autowired
    private ISpTeamUserService spTeamUserService;

    @Autowired
    private ISysUserService sysUserService;

    @GetMapping("/list-ui")
    public String listUI() {
        return "forward:/index.html";
    }

    @PostMapping("/page")
    @ResponseBody
    public Result page(SpTeamPageReq req) throws Exception {
        return Result.success(spTeamService.pageWithRelations(req));
    }

    @GetMapping("/{id}")
    @ResponseBody
    public Result getById(@PathVariable String id) {
        SpTeam team = spTeamService.getById(id);
        return Result.success(team);
    }

    @PostMapping("/add-or-update")
    @ResponseBody
    public Result addOrUpdate(SpTeam record) {
        spTeamService.saveOrUpdate(record);
        return Result.success(record.getId());
    }

    @PostMapping("/delete")
    @ResponseBody
    public Result delete(@RequestBody Map<String, String> params) {
        String id = params.get("id");
        SpTeam team = new SpTeam();
        team.setId(id);
        team.setDeleted("1");
        spTeamService.updateById(team);
        return Result.success(null);
    }

    @GetMapping("/users/{teamId}")
    @ResponseBody
    public Result getTeamUsers(@PathVariable String teamId) {
        QueryWrapper<SpTeamUser> qw = new QueryWrapper<>();
        qw.eq("team_id", teamId);
        List<SpTeamUser> teamUsers = spTeamUserService.list(qw);
        List<String> userIds = teamUsers.stream()
                .map(SpTeamUser::getUserId)
                .collect(Collectors.toList());
        if (userIds.isEmpty()) {
            return Result.success(java.util.Collections.emptyList());
        }
        List<SysUser> users = (List<SysUser>) sysUserService.listByIds(userIds);
        return Result.success(users);
    }

    @PostMapping("/users/add")
    @ResponseBody
    public Result addTeamUsers(@RequestBody Map<String, Object> params) {
        String teamId = (String) params.get("teamId");
        @SuppressWarnings("unchecked")
        List<String> userIds = (List<String>) params.get("userIds");
        if (userIds != null) {
            for (String userId : userIds) {
                SpTeamUser existing = spTeamUserService.getOne(
                    new QueryWrapper<SpTeamUser>().eq("team_id", teamId).eq("user_id", userId)
                );
                if (existing == null) {
                    SpTeamUser tu = new SpTeamUser();
                    tu.setTeamId(teamId);
                    tu.setUserId(userId);
                    spTeamUserService.save(tu);
                }
            }
        }
        return Result.success(null);
    }

    @PostMapping("/users/remove")
    @ResponseBody
    public Result removeTeamUser(@RequestBody Map<String, String> params) {
        String teamId = params.get("teamId");
        String userId = params.get("userId");
        QueryWrapper<SpTeamUser> qw = new QueryWrapper<>();
        qw.eq("team_id", teamId).eq("user_id", userId);
        spTeamUserService.remove(qw);
        return Result.success(null);
    }

    @GetMapping("/available-users")
    @ResponseBody
    public Result getAvailableUsers() {
        List<SysUser> allUsers = sysUserService.list(
            new QueryWrapper<SysUser>().eq("is_deleted", "0")
        );
        return Result.success(allUsers);
    }
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd mes && mvn compiler:compile -q
```

Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/system/controller/admin/SpTeamController.java
git commit -m "feat: add SpTeamController with CRUD and user management endpoints"
```

---

### Task 7: Frontend — Types and API

**Files:**
- Create: `mes/frontend/src/types/team.ts`
- Create: `mes/frontend/src/api/system/team.ts`

- [ ] **Step 1: Create team types**

```typescript
// mes/frontend/src/types/team.ts

export interface SpTeam {
  id: string
  code: string
  name: string
  descr: string
  lineId?: string
  workshopId?: string
  startTime?: string
  endTime?: string
  workdays?: string
  deleted: string
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

export interface SpTeamDTO extends SpTeam {
  lineName?: string
  workshopName?: string
  userCount?: number
  userList?: SysUser[]
  userIds?: string[]
}

import type { SysUser } from './user'
```

- [ ] **Step 2: Create team API functions**

```typescript
// mes/frontend/src/api/system/team.ts

import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { SpTeam, SpTeamDTO } from '@/types/team'
import type { SysUser } from '@/types/user'

export function page(params: PageParams & { name?: string; code?: string }) {
  return client.post('/admin/sys/team/page', params) as Promise<PageResult<SpTeamDTO>>
}

export function getById(id: string) {
  return client.get(`/admin/sys/team/${id}`) as Promise<SpTeam>
}

export function addOrUpdate(record: Partial<SpTeam>) {
  return client.post('/admin/sys/team/add-or-update', record)
}

export function deleteById(id: string) {
  return client.post('/admin/sys/team/delete', { id })
}

export function getTeamUsers(teamId: string) {
  return client.get(`/admin/sys/team/users/${teamId}`) as Promise<SysUser[]>
}

export function addTeamUsers(teamId: string, userIds: string[]) {
  return client.post('/admin/sys/team/users/add', { teamId, userIds })
}

export function removeTeamUser(teamId: string, userId: string) {
  return client.post('/admin/sys/team/users/remove', { teamId, userId })
}

export function getAvailableUsers() {
  return client.get('/admin/sys/team/available-users') as Promise<SysUser[]>
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd mes/frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add mes/frontend/src/types/team.ts mes/frontend/src/api/system/team.ts
git commit -m "feat: add team types and API functions"
```

---

### Task 8: Frontend — TeamForm Component

**Files:**
- Create: `mes/frontend/src/pages/system/TeamForm.tsx`

- [ ] **Step 1: Create TeamForm with all fields**

```tsx
import { useEffect, useState } from 'react'
import { Form, Input, Radio, Select, TimePicker, Checkbox } from 'antd'
import dayjs from 'dayjs'
import type { FormInstance } from 'antd/es/form'
import * as teamApi from '@/api/system/team'
import type { SpTeam } from '@/types/team'

interface TeamFormProps {
  id?: string | null
  record?: SpTeam | null
  onFinish?: (values: any) => void
  formInstance: FormInstance
}

const WEEKDAY_OPTIONS = [
  { label: '周一', value: '1' },
  { label: '周二', value: '2' },
  { label: '周三', value: '3' },
  { label: '周四', value: '4' },
  { label: '周五', value: '5' },
  { label: '周六', value: '6' },
  { label: '周日', value: '7' },
]

function TeamForm({ id, record, onFinish, formInstance }: TeamFormProps) {
  const [lines, setLines] = useState<{ id: string; line: string }[]>([])
  const [workshops, setWorkshops] = useState<{ id: string; workShop: string }[]>([])

  // Fetch line and workshop options
  useEffect(() => {
    // Lines are in sp_line table - we'll query via generic approach
    // For now, use the existing basedata API pattern
    import('@/api/client').then(({ default: client }) => {
      client.get('/basedata/line/list').then((data: any) => {
        if (Array.isArray(data)) setLines(data)
      }).catch(() => {})
      client.get('/basedata/workshop/list').then((data: any) => {
        if (Array.isArray(data)) setWorkshops(data)
      }).catch(() => {})
    })
  }, [])

  // Populate form when editing
  useEffect(() => {
    if (id && record) {
      formInstance.setFieldsValue({
        ...record,
        workdays: record.workdays ? record.workdays.split(',').filter(Boolean) : [],
        startTime: record.startTime ? dayjs(record.startTime, 'HH:mm') : null,
        endTime: record.endTime ? dayjs(record.endTime, 'HH:mm') : null,
      })
    } else if (!id) {
      formInstance.resetFields()
    }
  }, [id, record, formInstance])

  const handleFinish = (values: any) => {
    const payload = {
      ...values,
      workdays: Array.isArray(values.workdays) ? values.workdays.join(',') : '',
      startTime: values.startTime ? dayjs(values.startTime).format('HH:mm') : '',
      endTime: values.endTime ? dayjs(values.endTime).format('HH:mm') : '',
    }
    onFinish?.(payload)
  }

  return (
    <Form
      form={formInstance}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{ deleted: '0', workdays: [] }}
    >
      <Form.Item
        name="code"
        label="班组代码"
        rules={[{ required: true, message: '请输入班组代码' }]}
      >
        <Input placeholder="请输入班组代码" />
      </Form.Item>

      <Form.Item
        name="name"
        label="班组名称"
        rules={[{ required: true, message: '请输入班组名称' }]}
      >
        <Input placeholder="请输入班组名称" />
      </Form.Item>

      <Form.Item name="descr" label="备注">
        <Input.TextArea rows={2} placeholder="请输入备注" />
      </Form.Item>

      <Form.Item name="lineId" label="所属生产线">
        <Select placeholder="请选择生产线" allowClear>
          {lines.map((l: any) => (
            <Select.Option key={l.id} value={l.id}>
              {l.line || l.name}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item name="workshopId" label="所属车间">
        <Select placeholder="请选择车间" allowClear>
          {workshops.map((w: any) => (
            <Select.Option key={w.id} value={w.id}>
              {w.workShop || w.name}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item name="startTime" label="上班时间">
        <TimePicker format="HH:mm" placeholder="上班时间" style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item name="endTime" label="下班时间">
        <TimePicker format="HH:mm" placeholder="下班时间" style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item name="workdays" label="工作日">
        <Checkbox.Group options={WEEKDAY_OPTIONS} />
      </Form.Item>

      <Form.Item
        name="deleted"
        label="状态"
        rules={[{ required: true, message: '请选择状态' }]}
      >
        <Radio.Group>
          <Radio value="0">正常</Radio>
          <Radio value="1">已删除</Radio>
          <Radio value="2">已禁用</Radio>
        </Radio.Group>
      </Form.Item>
    </Form>
  )
}

export default TeamForm
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd mes/frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add mes/frontend/src/pages/system/TeamForm.tsx
git commit -m "feat: add TeamForm component with shift schedule fields"
```

---

### Task 9: Frontend — TeamUserModal Component

**Files:**
- Create: `mes/frontend/src/pages/system/TeamUserModal.tsx`

- [ ] **Step 1: Create TeamUserModal**

```tsx
import { useEffect, useState } from 'react'
import { Modal, Table, Button, Input, message, Space } from 'antd'
import { UserAddOutlined, UserDeleteOutlined } from '@ant-design/icons'
import * as teamApi from '@/api/system/team'
import type { SysUser } from '@/types/user'

interface TeamUserModalProps {
  open: boolean
  teamId: string | null
  teamName: string
  onClose: () => void
}

function TeamUserModal({ open, teamId, teamName, onClose }: TeamUserModalProps) {
  const [availableUsers, setAvailableUsers] = useState<SysUser[]>([])
  const [teamUsers, setTeamUsers] = useState<SysUser[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(false)

  // Load data when modal opens
  useEffect(() => {
    if (open && teamId) {
      setLoading(true)
      Promise.all([
        teamApi.getAvailableUsers(),
        teamApi.getTeamUsers(teamId),
      ]).then(([available, members]) => {
        const memberIds = new Set((members as any[] || []).map((u: SysUser) => u.id))
        setAvailableUsers((available as any[] || []).filter((u: SysUser) => !memberIds.has(u.id)))
        setTeamUsers(members as any[] || [])
      }).finally(() => setLoading(false))
    }
  }, [open, teamId])

  const handleAddUsers = async () => {
    if (selectedUserIds.length === 0 || !teamId) return
    await teamApi.addTeamUsers(teamId, selectedUserIds)
    message.success('添加成功')
    // Refresh
    const [available, members] = await Promise.all([
      teamApi.getAvailableUsers(),
      teamApi.getTeamUsers(teamId),
    ])
    const memberIds = new Set(members.map((u: SysUser) => u.id))
    setAvailableUsers(available.filter((u: SysUser) => !memberIds.has(u.id)))
    setTeamUsers(members)
    setSelectedUserIds([])
  }

  const handleRemoveUser = async (userId: string) => {
    if (!teamId) return
    await teamApi.removeTeamUser(teamId, userId)
    message.success('移除成功')
    setTeamUsers((prev) => prev.filter((u) => u.id !== userId))
    const available = await teamApi.getAvailableUsers()
    setAvailableUsers(available)
  }

  const filteredUsers = availableUsers.filter(
    (u) =>
      !searchText ||
      u.name?.includes(searchText) ||
      u.username?.includes(searchText)
  )

  const availableColumns = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '用户名', dataIndex: 'username', key: 'username' },
  ]

  const memberColumns = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '用户名', dataIndex: 'username', key: 'username' },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: SysUser) => (
        <Button
          type="link"
          size="small"
          danger
          icon={<UserDeleteOutlined />}
          onClick={() => handleRemoveUser(record.id)}
        >
          移除
        </Button>
      ),
    },
  ]

  return (
    <Modal
      open={open}
      title={`班组员工管理 - ${teamName}`}
      onCancel={onClose}
      width={900}
      footer={null}
      destroyOnHidden
    >
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Left: Available users */}
        <div style={{ flex: 1, border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
          <h4>可选用户</h4>
          <Input
            placeholder="搜索用户"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ marginBottom: 8 }}
            allowClear
          />
          <Table
            rowKey="id"
            columns={availableColumns}
            dataSource={filteredUsers}
            loading={loading}
            size="small"
            rowSelection={{
              selectedRowKeys: selectedUserIds,
              onChange: (keys) => setSelectedUserIds(keys as string[]),
            }}
            pagination={{ pageSize: 8 }}
            style={{ maxHeight: 360, overflow: 'auto' }}
          />
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={handleAddUsers}
            disabled={selectedUserIds.length === 0}
            style={{ marginTop: 8 }}
          >
            加入班组
          </Button>
        </div>

        {/* Right: Current members */}
        <div style={{ flex: 1, border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
          <h4>已加入员工 ({teamUsers.length})</h4>
          <Table
            rowKey="id"
            columns={memberColumns}
            dataSource={teamUsers}
            loading={loading}
            size="small"
            pagination={{ pageSize: 8 }}
            style={{ maxHeight: 420, overflow: 'auto' }}
          />
        </div>
      </div>
    </Modal>
  )
}

export default TeamUserModal
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd mes/frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add mes/frontend/src/pages/system/TeamUserModal.tsx
git commit -m "feat: add TeamUserModal for employee assignment"
```

---

### Task 10: Frontend — TeamList Page and Route

**Files:**
- Create: `mes/frontend/src/pages/system/TeamList.tsx`
- Modify: `mes/frontend/src/App.tsx` (add route)
- Modify: `mes/frontend/src/utils/urlMap.ts` (add mapping)

- [ ] **Step 1: Create TeamList page**

```tsx
import { useState } from 'react'
import { Form, Button, Input, Tag, Popconfirm, message, Space } from 'antd'
import { PlusOutlined, TeamOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageContainer from '@/components/PageContainer'
import { ensureArray } from '@/utils/ensureArray'
import SearchForm from '@/components/SearchForm'
import PageTable from '@/components/PageTable'
import ModalForm from '@/components/ModalForm'
import PermissionGuard from '@/components/PermissionGuard'
import { usePagination } from '@/hooks/usePagination'
import * as teamApi from '@/api/system/team'
import TeamForm from './TeamForm'
import TeamUserModal from './TeamUserModal'
import type { SpTeam, SpTeamDTO } from '@/types/team'

const statusMap: Record<string, { text: string; color: string }> = {
  '0': { text: '正常', color: 'green' },
  '1': { text: '已删除', color: 'red' },
  '2': { text: '已禁用', color: 'orange' },
}

const WEEKDAY_MAP: Record<string, string> = {
  '1': '周一', '2': '周二', '3': '周三', '4': '周四',
  '5': '周五', '6': '周六', '7': '周日',
}

function formatWorkdays(workdays?: string): string {
  if (!workdays) return '-'
  return workdays.split(',').map((d) => WEEKDAY_MAP[d] || d).join(', ')
}

export default function TeamList() {
  const queryClient = useQueryClient()
  const { pagination, onChange, reset } = usePagination()
  const [filters, setFilters] = useState<Record<string, unknown>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<SpTeam | null>(null)
  const [formInstance] = Form.useForm()

  // User modal state
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [userModalTeamId, setUserModalTeamId] = useState<string | null>(null)
  const [userModalTeamName, setUserModalTeamName] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['teams', pagination, filters],
    queryFn: () =>
      teamApi.page({
        current: pagination.current,
        size: pagination.pageSize,
        ...filters,
      }),
  })

  const saveMutation = useMutation({
    mutationFn: (values: Partial<SpTeam>) => teamApi.addOrUpdate(values),
    onSuccess: () => {
      message.success('操作成功')
      setModalOpen(false)
      setEditId(null)
      setSelectedRecord(null)
      formInstance.resetFields()
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (record: SpTeamDTO) => teamApi.deleteById(record.id),
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
  })

  const handleAdd = () => {
    setEditId(null)
    setSelectedRecord(null)
    setModalOpen(true)
  }

  const handleEdit = (record: SpTeamDTO) => {
    setEditId(record.id)
    setSelectedRecord(record as SpTeam)
    setModalOpen(true)
  }

  const handleUserManage = (record: SpTeamDTO) => {
    setUserModalTeamId(record.id)
    setUserModalTeamName(record.name)
    setUserModalOpen(true)
  }

  const handleDelete = (record: SpTeamDTO) => {
    deleteMutation.mutate(record)
  }

  const handleFormFinish = (values: Record<string, unknown>) => {
    saveMutation.mutate({ ...values, id: editId || undefined })
  }

  const columns = [
    { title: '班组代码', dataIndex: 'code', key: 'code' },
    { title: '班组名称', dataIndex: 'name', key: 'name' },
    { title: '生产线', dataIndex: 'lineName', key: 'lineName', render: (v: string) => v || '-' },
    { title: '车间', dataIndex: 'workshopName', key: 'workshopName', render: (v: string) => v || '-' },
    { title: '上班时间', dataIndex: 'startTime', key: 'startTime', render: (v: string) => v || '-' },
    { title: '下班时间', dataIndex: 'endTime', key: 'endTime', render: (v: string) => v || '-' },
    {
      title: '工作日', dataIndex: 'workdays', key: 'workdays',
      render: (v: string) => formatWorkdays(v),
    },
    {
      title: '员工数', dataIndex: 'userCount', key: 'userCount',
      render: (v: number) => v ?? 0,
    },
    {
      title: '状态', dataIndex: 'deleted', key: 'deleted',
      render: (val: string) => {
        const s = statusMap[val] || { text: val, color: 'default' }
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    { title: '创建时间', dataIndex: 'createTime', key: 'createTime' },
    {
      title: '操作', key: 'action',
      render: (_: unknown, record: SpTeamDTO) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" size="small" icon={<TeamOutlined />} onClick={() => handleUserManage(record)}>
            员工管理
          </Button>
          <Popconfirm title="确定要删除该班组吗？" onConfirm={() => handleDelete(record)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <PageContainer>
      <SearchForm onSearch={(v) => { setFilters(v); reset() }} onReset={() => { setFilters({}); reset() }} loading={isLoading}>
        <Form.Item name="name"><Input placeholder="班组名称" /></Form.Item>
        <Form.Item name="code"><Input placeholder="班组代码" /></Form.Item>
      </SearchForm>

      <PageTable
        rowKey="id"
        columns={columns}
        dataSource={ensureArray(data?.records)}
        loading={isLoading}
        total={data?.total || 0}
        pagination={{ current: pagination.current, pageSize: pagination.pageSize }}
        onChange={onChange}
        toolbar={
          <PermissionGuard perm="team:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增班组</Button>
          </PermissionGuard>
        }
      />

      <ModalForm
        open={modalOpen}
        title={editId ? '编辑班组' : '新增班组'}
        formInstance={formInstance}
        onCancel={() => { setModalOpen(false); setEditId(null); setSelectedRecord(null); formInstance.resetFields() }}
        loading={saveMutation.isPending}
      >
        <TeamForm id={editId} record={selectedRecord} formInstance={formInstance} onFinish={handleFormFinish} />
      </ModalForm>

      <TeamUserModal
        open={userModalOpen}
        teamId={userModalTeamId}
        teamName={userModalTeamName}
        onClose={() => { setUserModalOpen(false); queryClient.invalidateQueries({ queryKey: ['teams'] }) }}
      />
    </PageContainer>
  )
}
```

- [ ] **Step 2: Add route in App.tsx**

In `mes/frontend/src/App.tsx`, add this import:

```tsx
import TeamList from './pages/system/TeamList'
```

And add the route after the system routes (after line 70):

```tsx
                  <Route path="system/team" element={<TeamList />} />
```

- [ ] **Step 3: Add URL mapping in urlMap.ts**

In `mes/frontend/src/utils/urlMap.ts`, add to the URL_MAP object:

```typescript
  '/admin/sys/team/list-ui': '/system/team',
```

- [ ] **Step 4: Verify TypeScript and build**

```bash
cd mes/frontend && npx tsc --noEmit && npm run build
```

Expected: No errors, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add mes/frontend/src/pages/system/TeamList.tsx \
        mes/frontend/src/App.tsx \
        mes/frontend/src/utils/urlMap.ts
git commit -m "feat: add TeamList page, route, and URL mapping"
```

---

### Task 11: Integration — Database Execution and Verification

- [ ] **Step 1: Execute SQL against database**

```bash
mysql -u root -p12345678 mes_data < scripts/sql/team-management.sql
```

- [ ] **Step 2: Restart backend**

```bash
pkill -f "spring-boot:run" 2>/dev/null
cd mes && nohup mvn spring-boot:run -Dskip.npm -Dskip.installnodenpm -Dfrontend.skip=true > /tmp/backend.log 2>&1 &
```

- [ ] **Step 3: Verify backend compilation**

```bash
cd mes && mvn compiler:compile -q
```

Expected: BUILD SUCCESS

- [ ] **Step 4: Verify endpoints (after backend starts)**

```bash
# Wait for backend
sleep 20
# Login
curl -s -c /tmp/cookies.txt http://localhost:9090/login -X POST \
  -d "username=admin&password=admin&captcha=&rememberMe=true" -o /dev/null
# Test team page API
curl -s -b /tmp/cookies.txt http://localhost:9090/admin/sys/team/page -X POST \
  -d "current=1&size=10" | python3 -m json.tool
```

Expected: Returns paginated team list.

- [ ] **Step 5: Commit any final adjustments**

```bash
git status
git add -A
git commit -m "chore: final integration adjustments for team management"
```
