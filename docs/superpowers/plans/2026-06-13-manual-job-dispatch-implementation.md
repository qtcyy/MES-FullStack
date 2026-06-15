# 员工作业派工 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 MES 人工作业派工功能 — 查询待派工工单，选择班组和作业员完成派工，查看派工状态

**Architecture:** 双表配合方案 — 扩展 sp_order.statue 新增 0-5 状态值，新建 sp_order_dispatch 表存储派工详情。后端遵循 Controller→Service→Mapper 分层，前端使用 Ant Design 工业车间风格

**Tech Stack:** Java 8, Spring Boot 2.1.7, MyBatis-Plus 3.1.2, React 18, TypeScript, Ant Design 5, motion v12

---

### Task 1: Database Migration + Entity Layer

**Files:**
- Create: `scripts/sql/dispatch-management.sql`
- Create: `mes/src/main/java/com/wangziyang/mes/order/entity/SpOrderDispatch.java`
- Create: `mes/src/main/java/com/wangziyang/mes/order/mapper/SpOrderDispatchMapper.java`
- Create: `mes/src/main/resources/mapper/order/SpOrderDispatchMapper.xml`

- [ ] **Step 1: Write SQL migration script**

```sql
-- Dispatch Management Module
-- Creates sp_order_dispatch table, seed data, and menu entry

CREATE TABLE IF NOT EXISTS sp_order_dispatch (
  id varchar(64) NOT NULL COMMENT '主键',
  order_id varchar(64) NOT NULL COMMENT '工单ID',
  team_id varchar(64) NOT NULL COMMENT '班组ID',
  user_id varchar(64) NOT NULL COMMENT '作业员ID',
  labor_hours decimal(10,2) DEFAULT NULL COMMENT '工时（小时）',
  dispatch_status tinyint DEFAULT 1 COMMENT '派工状态: 1=已派工 2=已开工 3=已完工',
  plan_start_time varchar(255) DEFAULT NULL COMMENT '计划开始时间',
  plan_end_time varchar(255) DEFAULT NULL COMMENT '计划结束时间',
  actual_start_time varchar(255) DEFAULT NULL COMMENT '实际开始时间',
  actual_end_time varchar(255) DEFAULT NULL COMMENT '实际结束时间',
  remark varchar(500) DEFAULT '' COMMENT '备注',
  create_time datetime NOT NULL COMMENT '创建时间',
  create_username varchar(64) NOT NULL COMMENT '创建人',
  update_time datetime NOT NULL COMMENT '更新时间',
  update_username varchar(64) DEFAULT NULL COMMENT '更新人',
  PRIMARY KEY (id),
  KEY idx_order_id (order_id),
  KEY idx_team_id (team_id),
  KEY idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工单派工记录表';

-- Seed: set some existing orders to statue=0 (已下发) for testing
-- Uses orders that exist in the sp_order table
UPDATE sp_order SET statue = 0 WHERE statue = 1 AND order_type = 'P' LIMIT 5;

-- Menu entry under 计划管理 (parent_id=12)
INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '122', 'orderDispatch', '员工作业派工', '/order/dispatch', '12', '3', '2', '0', 'order:dispatch', 'fa-id-card', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '122');
```

- [ ] **Step 2: Write SpOrderDispatch entity**

```java
package com.wangziyang.mes.order.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;
import java.math.BigDecimal;

@TableName("sp_order_dispatch")
public class SpOrderDispatch extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String orderId;
    private String teamId;
    private String userId;
    private BigDecimal laborHours;
    private Integer dispatchStatus;
    private String planStartTime;
    private String planEndTime;
    private String actualStartTime;
    private String actualEndTime;
    private String remark;

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }
    public String getTeamId() { return teamId; }
    public void setTeamId(String teamId) { this.teamId = teamId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public BigDecimal getLaborHours() { return laborHours; }
    public void setLaborHours(BigDecimal laborHours) { this.laborHours = laborHours; }
    public Integer getDispatchStatus() { return dispatchStatus; }
    public void setDispatchStatus(Integer dispatchStatus) { this.dispatchStatus = dispatchStatus; }
    public String getPlanStartTime() { return planStartTime; }
    public void setPlanStartTime(String planStartTime) { this.planStartTime = planStartTime; }
    public String getPlanEndTime() { return planEndTime; }
    public void setPlanEndTime(String planEndTime) { this.planEndTime = planEndTime; }
    public String getActualStartTime() { return actualStartTime; }
    public void setActualStartTime(String actualStartTime) { this.actualStartTime = actualStartTime; }
    public String getActualEndTime() { return actualEndTime; }
    public void setActualEndTime(String actualEndTime) { this.actualEndTime = actualEndTime; }
    public String getRemark() { return remark; }
    public void setRemark(String remark) { this.remark = remark; }
}
```

- [ ] **Step 3: Write SpOrderDispatchMapper interface**

```java
package com.wangziyang.mes.order.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wangziyang.mes.order.entity.SpOrderDispatch;

public interface SpOrderDispatchMapper extends BaseMapper<SpOrderDispatch> {
}
```

- [ ] **Step 4: Write SpOrderDispatchMapper.xml** (empty — no custom SQL needed; MyBatis-Plus BaseMapper handles CRUD)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.wangziyang.mes.order.mapper.SpOrderDispatchMapper">
</mapper>
```

- [ ] **Step 5: Execute SQL against dev database**

Run: `mysql -h 192.168.52.76 -u root -p sparchtype < scripts/sql/dispatch-management.sql`
Expected: Table created, 5 orders updated to statue=0, menu entry inserted

- [ ] **Step 6: Commit**

```bash
git add scripts/sql/dispatch-management.sql \
        mes/src/main/java/com/wangziyang/mes/order/entity/SpOrderDispatch.java \
        mes/src/main/java/com/wangziyang/mes/order/mapper/SpOrderDispatchMapper.java \
        mes/src/main/resources/mapper/order/SpOrderDispatchMapper.xml
git commit -m "feat: 新增 sp_order_dispatch 表、实体和 Mapper"
```

---

### Task 2: Backend DTO + Service Layer

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/order/dto/SpDispatchDTO.java`
- Create: `mes/src/main/java/com/wangziyang/mes/order/service/ISpDispatchService.java`
- Create: `mes/src/main/java/com/wangziyang/mes/order/service/impl/SpDispatchServiceImpl.java`

- [ ] **Step 1: Write SpDispatchDTO**

```java
package com.wangziyang.mes.order.dto;

import java.math.BigDecimal;
import java.util.List;

public class SpDispatchDTO {

    private List<String> orderIds;
    private String teamId;
    private String userId;
    private BigDecimal laborHours;
    private String planStartTime;
    private String planEndTime;
    private String remark;

    public List<String> getOrderIds() { return orderIds; }
    public void setOrderIds(List<String> orderIds) { this.orderIds = orderIds; }
    public String getTeamId() { return teamId; }
    public void setTeamId(String teamId) { this.teamId = teamId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public BigDecimal getLaborHours() { return laborHours; }
    public void setLaborHours(BigDecimal laborHours) { this.laborHours = laborHours; }
    public String getPlanStartTime() { return planStartTime; }
    public void setPlanStartTime(String planStartTime) { this.planStartTime = planStartTime; }
    public String getPlanEndTime() { return planEndTime; }
    public void setPlanEndTime(String planEndTime) { this.planEndTime = planEndTime; }
    public String getRemark() { return remark; }
    public void setRemark(String remark) { this.remark = remark; }
}
```

- [ ] **Step 2: Write ISpDispatchService interface**

```java
package com.wangziyang.mes.order.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.wangziyang.mes.order.dto.SpDispatchDTO;
import com.wangziyang.mes.order.entity.SpOrderDispatch;
import java.util.Map;

public interface ISpDispatchService {

    /**
     * 分页查询待派工工单（statue=0）
     */
    IPage<Map<String, Object>> pageOrdersForDispatch(IPage<?> page, String orderCode);

    /**
     * 执行派工：创建 dispatch 记录 + 更新工单 statue=1
     * 返回创建的 dispatch 记录列表
     */
    void assignWorker(SpDispatchDTO dto);

    /**
     * 查询某工单的派工记录（含作业员姓名、班组名称）
     */
    Map<String, Object> getDispatchByOrderId(String orderId);
}
```

- [ ] **Step 3: Write SpDispatchServiceImpl**

```java
package com.wangziyang.mes.order.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.order.dto.SpDispatchDTO;
import com.wangziyang.mes.order.entity.SpOrder;
import com.wangziyang.mes.order.entity.SpOrderDispatch;
import com.wangziyang.mes.order.mapper.SpOrderDispatchMapper;
import com.wangziyang.mes.order.mapper.SpOrderMapper;
import com.wangziyang.mes.order.service.ISpDispatchService;
import com.wangziyang.mes.system.entity.SpTeam;
import com.wangziyang.mes.system.entity.SpTeamUser;
import com.wangziyang.mes.system.entity.SysUser;
import com.wangziyang.mes.system.mapper.SpTeamMapper;
import com.wangziyang.mes.system.mapper.SpTeamUserMapper;
import com.wangziyang.mes.system.mapper.SysUserMapper;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class SpDispatchServiceImpl extends ServiceImpl<SpOrderDispatchMapper, SpOrderDispatch>
        implements ISpDispatchService {

    private static final Logger logger = LoggerFactory.getLogger(SpDispatchServiceImpl.class);

    @Autowired
    private SpOrderMapper spOrderMapper;

    @Autowired
    private SpTeamMapper spTeamMapper;

    @Autowired
    private SpTeamUserMapper spTeamUserMapper;

    @Autowired
    private SysUserMapper sysUserMapper;

    @Override
    public IPage<Map<String, Object>> pageOrdersForDispatch(IPage<?> page, String orderCode) {
        QueryWrapper<SpOrder> qw = new QueryWrapper<>();
        qw.eq("statue", 0);
        if (StringUtils.isNotEmpty(orderCode)) {
            qw.like("order_code", orderCode);
        }
        qw.orderByDesc("create_time");

        IPage<SpOrder> orderPage = spOrderMapper.selectPage(
                new Page<>(page.getCurrent(), page.getSize()), qw);

        // Build result with dispatch info
        List<Map<String, Object>> records = new ArrayList<>();
        for (SpOrder order : orderPage.getRecords()) {
            Map<String, Object> record = new LinkedHashMap<>();
            record.put("id", order.getId());
            record.put("orderCode", order.getOrderCode());
            record.put("orderDescription", order.getOrderDescription());
            record.put("qty", order.getQty());
            record.put("orderType", order.getOrderType());
            record.put("materiel", order.getMateriel());
            record.put("materielDesc", order.getMaterielDesc());
            record.put("planStartTime", order.getPlanStartTime());
            record.put("planEndTime", order.getPlanEndTime());
            record.put("statue", order.getStatue());

            // Check if already dispatched
            QueryWrapper<SpOrderDispatch> dq = new QueryWrapper<>();
            dq.eq("order_id", order.getId());
            List<SpOrderDispatch> dispatches = baseMapper.selectList(dq);
            if (!dispatches.isEmpty()) {
                SpOrderDispatch dispatch = dispatches.get(0);
                record.put("dispatchStatus", dispatch.getDispatchStatus());
                record.put("laborHours", dispatch.getLaborHours());

                // Get worker name
                SysUser user = sysUserMapper.selectById(dispatch.getUserId());
                record.put("workerName", user != null ? user.getName() : "-");

                // Get team name
                SpTeam team = spTeamMapper.selectById(dispatch.getTeamId());
                record.put("teamName", team != null ? team.getName() : "-");
            } else {
                record.put("dispatchStatus", null);
                record.put("workerName", null);
                record.put("teamName", null);
            }

            records.add(record);
        }

        IPage<Map<String, Object>> result = new Page<>(orderPage.getCurrent(), orderPage.getSize(), orderPage.getTotal());
        result.setRecords(records);
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void assignWorker(SpDispatchDTO dto) {
        for (String orderId : dto.getOrderIds()) {
            // Check order exists and is in statue=0
            SpOrder order = spOrderMapper.selectById(orderId);
            if (order == null) {
                throw new RuntimeException("工单不存在: " + orderId);
            }
            if (order.getStatue() != 0) {
                throw new RuntimeException("工单 " + order.getOrderCode() + " 状态不是已下发，无法派工");
            }

            // Create dispatch record
            SpOrderDispatch dispatch = new SpOrderDispatch();
            dispatch.setOrderId(orderId);
            dispatch.setTeamId(dto.getTeamId());
            dispatch.setUserId(dto.getUserId());
            dispatch.setLaborHours(dto.getLaborHours());
            dispatch.setDispatchStatus(1); // 已派工
            dispatch.setPlanStartTime(dto.getPlanStartTime());
            dispatch.setPlanEndTime(dto.getPlanEndTime());
            dispatch.setRemark(dto.getRemark());
            baseMapper.insert(dispatch);

            // Update order statue to 1 (已派工)
            order.setStatue(1);
            spOrderMapper.updateById(order);

            logger.info("Dispatch created: order={}, team={}, user={}, hours={}",
                    order.getOrderCode(), dto.getTeamId(), dto.getUserId(), dto.getLaborHours());
        }
    }

    @Override
    public Map<String, Object> getDispatchByOrderId(String orderId) {
        QueryWrapper<SpOrderDispatch> qw = new QueryWrapper<>();
        qw.eq("order_id", orderId);
        qw.orderByDesc("create_time");
        SpOrderDispatch dispatch = baseMapper.selectOne(qw);

        if (dispatch == null) return null;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", dispatch.getId());
        result.put("orderId", dispatch.getOrderId());
        result.put("teamId", dispatch.getTeamId());
        result.put("userId", dispatch.getUserId());
        result.put("laborHours", dispatch.getLaborHours());
        result.put("dispatchStatus", dispatch.getDispatchStatus());
        result.put("planStartTime", dispatch.getPlanStartTime());
        result.put("planEndTime", dispatch.getPlanEndTime());

        // Enrich with names
        SysUser user = sysUserMapper.selectById(dispatch.getUserId());
        if (user != null) {
            result.put("workerName", user.getName());
        }
        SpTeam team = spTeamMapper.selectById(dispatch.getTeamId());
        if (team != null) {
            result.put("teamName", team.getName());
        }

        return result;
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/order/dto/SpDispatchDTO.java \
        mes/src/main/java/com/wangziyang/mes/order/service/ISpDispatchService.java \
        mes/src/main/java/com/wangziyang/mes/order/service/impl/SpDispatchServiceImpl.java
git commit -m "feat: 新增派工 Service 层 — 待派工查询、派工分配（事务）、派工详情"
```

---

### Task 3: Backend Controller + Request Class

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/order/request/SpDispatchPageReq.java`
- Create: `mes/src/main/java/com/wangziyang/mes/order/controller/SpDispatchController.java`

- [ ] **Step 1: Write SpDispatchPageReq** (follows existing BasePageReq pattern — form-encoded, no @RequestBody)

```java
package com.wangziyang.mes.order.request;

import com.wangziyang.mes.common.BasePageReq;

public class SpDispatchPageReq extends BasePageReq {
    private String orderCode;

    public String getOrderCode() { return orderCode; }
    public void setOrderCode(String orderCode) { this.orderCode = orderCode; }
}
```

- [ ] **Step 2: Write SpDispatchController** (matches existing codebase patterns: form-encoded for page, @RequestBody for JSON assign)

```java
package com.wangziyang.mes.order.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.order.dto.SpDispatchDTO;
import com.wangziyang.mes.order.request.SpDispatchPageReq;
import com.wangziyang.mes.order.service.ISpDispatchService;
import com.wangziyang.mes.system.entity.SpTeam;
import com.wangziyang.mes.system.entity.SpTeamUser;
import com.wangziyang.mes.system.entity.SysUser;
import com.wangziyang.mes.system.service.ISpTeamService;
import com.wangziyang.mes.system.service.ISpTeamUserService;
import com.wangziyang.mes.system.service.ISysUserService;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/order/dispatch")
public class SpDispatchController extends BaseController {

    @Autowired
    private ISpDispatchService spDispatchService;

    @Autowired
    private ISpTeamService spTeamService;

    @Autowired
    private ISpTeamUserService spTeamUserService;

    @Autowired
    private ISysUserService sysUserService;

    /**
     * 分页查询待派工工单 — form-encoded 风格，匹配现有模式
     */
    @ApiOperation("分页查询待派工工单")
    @PostMapping("/page")
    @ResponseBody
    public Result page(SpDispatchPageReq req) {
        IPage<Map<String, Object>> result = spDispatchService.pageOrdersForDispatch(req, req.getOrderCode());
        return Result.success(result);
    }

    /**
     * 执行派工 — JSON 请求体（前端显式设 Content-Type: application/json）
     */
    @ApiOperation("执行派工")
    @PostMapping("/assign")
    @ResponseBody
    public Result assign(@RequestBody SpDispatchDTO dto) {
        spDispatchService.assignWorker(dto);
        return Result.success();
    }

    /**
     * 查询工单派工详情
     */
    @ApiOperation("查询工单派工详情")
    @GetMapping("/get-by-order/{orderId}")
    @ResponseBody
    public Result getByOrderId(@PathVariable String orderId) {
        Map<String, Object> dispatch = spDispatchService.getDispatchByOrderId(orderId);
        return Result.success(dispatch);
    }

    /**
     * 获取可用班组列表
     */
    @ApiOperation("获取可用班组列表")
    @GetMapping("/teams")
    @ResponseBody
    public Result getTeams() {
        List<SpTeam> teams = spTeamService.list();
        return Result.success(teams);
    }

    /**
     * 获取班组下的作业员列表
     */
    @ApiOperation("获取班组下的作业员列表")
    @GetMapping("/team-users/{teamId}")
    @ResponseBody
    public Result getTeamUsers(@PathVariable String teamId) {
        List<SpTeamUser> teamUsers = spTeamUserService.list(
                new QueryWrapper<SpTeamUser>().eq("team_id", teamId));

        List<SysUser> users = new ArrayList<>();
        for (SpTeamUser tu : teamUsers) {
            SysUser user = sysUserService.getById(tu.getUserId());
            if (user != null) {
                users.add(user);
            }
        }
        return Result.success(users);
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/order/request/SpDispatchPageReq.java \
        mes/src/main/java/com/wangziyang/mes/order/controller/SpDispatchController.java
git commit -m "feat: 新增 SpDispatchController — 派工 REST API"
```

- [ ] **Step 2: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/order/controller/SpDispatchController.java
git commit -m "feat: 新增 SpDispatchController — 派工 REST API"
```

---

### Task 4: Frontend Types + API Layer

**Files:**
- Create: `mes/frontend/src/types/dispatch.ts`
- Create: `mes/frontend/src/api/order/dispatch.ts`

- [ ] **Step 1: Write dispatch TypeScript types**

```typescript
// mes/frontend/src/types/dispatch.ts

/** 派工记录 */
export interface OrderDispatch {
  id: string
  orderId: string
  teamId: string
  userId: string
  laborHours?: number
  dispatchStatus?: number
  planStartTime?: string
  planEndTime?: string
  actualStartTime?: string
  actualEndTime?: string
  remark?: string
  workerName?: string
  teamName?: string
}

/** 带派工信息的工单行 */
export interface DispatchableOrder {
  id: string
  orderCode: string
  orderDescription?: string
  qty?: number
  orderType?: string
  materiel?: string
  materielDesc?: string
  planStartTime?: string
  planEndTime?: string
  statue?: number
  dispatchStatus?: number | null
  workerName?: string | null
  teamName?: string | null
  laborHours?: number | null
}

/** 派工请求 DTO */
export interface DispatchAssignDTO {
  orderIds: string[]
  teamId: string
  userId: string
  laborHours: number
  planStartTime?: string
  planEndTime?: string
  remark?: string
}

/** 派工状态映射 */
export const DISPATCH_STATUS_MAP: Record<number, { text: string; color: string }> = {
  0: { text: '已下发', color: 'blue' },
  1: { text: '已派工', color: 'green' },
  2: { text: '已开工', color: 'orange' },
  3: { text: '已完工', color: 'cyan' },
  4: { text: '待检验', color: 'gold' },
  5: { text: '废补', color: 'red' },
}
```

- [ ] **Step 2: Write dispatch API functions**

```typescript
// mes/frontend/src/api/order/dispatch.ts
import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { DispatchableOrder, OrderDispatch, DispatchAssignDTO } from '@/types/dispatch'
import type { SpTeam } from '@/types/team'
import type { SysUser } from '@/types/user'

/** 分页查询待派工工单 */
export function page(params: PageParams & { orderCode?: string }) {
  return client.post('/order/dispatch/page', params) as Promise<PageResult<DispatchableOrder>>
}

/** 执行派工（JSON 请求体） */
export function assign(dto: DispatchAssignDTO) {
  return client.post('/order/dispatch/assign', dto, {
    headers: { 'Content-Type': 'application/json' },
  })
}

/** 查询工单派工详情 */
export function getByOrderId(orderId: string) {
  return client.get(`/order/dispatch/get-by-order/${orderId}`) as Promise<OrderDispatch>
}

/** 获取可用班组列表 */
export function getTeams() {
  return client.get('/order/dispatch/teams') as Promise<SpTeam[]>
}

/** 获取班组下的作业员列表 */
export function getTeamUsers(teamId: string) {
  return client.get(`/order/dispatch/team-users/${teamId}`) as Promise<SysUser[]>
}
```

- [ ] **Step 3: Commit**

```bash
git add mes/frontend/src/types/dispatch.ts mes/frontend/src/api/order/dispatch.ts
git commit -m "feat: 新增派工前端类型定义与 API 函数"
```

---

### Task 5: Frontend DispatchList Page

**Files:**
- Create: `mes/frontend/src/pages/order/DispatchList.tsx`

**Design Direction:** Industrial/Utilitarian — 工厂派工看板风格。深蓝灰底色 + 琥珀色强调。工单号使用等宽字体。状态使用工业指示灯风格圆点。派工弹窗使用卡片式班组选择。

- [ ] **Step 1: Write DispatchList.tsx**

```tsx
import { useState, useEffect } from 'react'
import { Form, Button, Input, Tag, Select, InputNumber, DatePicker, message, Table, Space, Modal } from 'antd'
import { SearchOutlined, ReloadOutlined, UserSwitchOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageContainer from '@/components/PageContainer'
import { usePagination } from '@/hooks/usePagination'
import * as dispatchApi from '@/api/order/dispatch'
import type { DispatchableOrder, DispatchAssignDTO } from '@/types/dispatch'
import type { SpTeam } from '@/types/team'
import type { SysUser } from '@/types/user'
import { DISPATCH_STATUS_MAP } from '@/types/dispatch'

export default function DispatchList() {
  const queryClient = useQueryClient()
  const { pagination, onChange, reset } = usePagination()
  const [filters, setFilters] = useState<Record<string, unknown>>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [teams, setTeams] = useState<SpTeam[]>([])
  const [users, setUsers] = useState<SysUser[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>()
  const [formInstance] = Form.useForm()

  // Load teams on mount
  useEffect(() => {
    dispatchApi.getTeams().then(setTeams)
  }, [])

  // Load users when team changes
  useEffect(() => {
    if (selectedTeamId) {
      dispatchApi.getTeamUsers(selectedTeamId).then(setUsers)
    } else {
      setUsers([])
    }
  }, [selectedTeamId])

  const { data, isLoading } = useQuery({
    queryKey: ['dispatch-orders', pagination, filters],
    queryFn: () =>
      dispatchApi.page({
        current: pagination.current,
        size: pagination.pageSize,
        ...filters,
      }),
  })

  const assignMutation = useMutation({
    mutationFn: (dto: DispatchAssignDTO) => dispatchApi.assign(dto),
    onSuccess: () => {
      message.success('派工成功')
      setModalOpen(false)
      setSelectedRowKeys([])
      formInstance.resetFields()
      setSelectedTeamId(undefined)
      queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] })
    },
  })

  const handleSearch = (values: Record<string, unknown>) => {
    setFilters(values)
    reset()
  }

  const handleReset = () => {
    setFilters({})
    reset()
  }

  const handleDispatch = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先勾选需要派工的工单')
      return
    }
    setModalOpen(true)
  }

  const handleModalOk = () => {
    formInstance.validateFields().then((values) => {
      assignMutation.mutate({
        orderIds: selectedRowKeys as string[],
        teamId: values.teamId,
        userId: values.userId,
        laborHours: values.laborHours,
        planStartTime: values.planStartTime?.format('YYYY-MM-DD'),
        planEndTime: values.planEndTime?.format('YYYY-MM-DD'),
        remark: values.remark,
      })
    })
  }

  const handleModalCancel = () => {
    setModalOpen(false)
    formInstance.resetFields()
    setSelectedTeamId(undefined)
  }

  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId)
    formInstance.setFieldValue('userId', undefined)
  }

  const columns = [
    {
      title: '工单编码',
      dataIndex: 'orderCode',
      key: 'orderCode',
      render: (val: string) => (
        <span style={{ fontFamily: "'SF Mono', Monaco, 'Cascadia Code', monospace", fontWeight: 600 }}>
          {val}
        </span>
      ),
    },
    {
      title: '描述',
      dataIndex: 'orderDescription',
      key: 'orderDescription',
      ellipsis: true,
    },
    {
      title: '数量',
      dataIndex: 'qty',
      key: 'qty',
      width: 80,
    },
    {
      title: '物料',
      dataIndex: 'materiel',
      key: 'materiel',
    },
    {
      title: '物料描述',
      dataIndex: 'materielDesc',
      key: 'materielDesc',
      ellipsis: true,
    },
    {
      title: '派工状态',
      dataIndex: 'statue',
      key: 'statue',
      width: 100,
      render: (statue: number) => {
        const s = DISPATCH_STATUS_MAP[statue] || DISPATCH_STATUS_MAP[0]
        return (
          <Space size={4}>
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: s.color,
                boxShadow: `0 0 6px ${s.color}`,
              }}
            />
            <span style={{ fontSize: 13 }}>{s.text}</span>
          </Space>
        )
      },
    },
    {
      title: '作业人员',
      dataIndex: 'workerName',
      key: 'workerName',
      width: 100,
      render: (val: string | null) => (
        <span style={{ color: val ? '#1a1a1a' : '#bfbfbf' }}>
          {val || '-'}
        </span>
      ),
    },
  ]

  return (
    <PageContainer
      style={{
        background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%)',
        minHeight: '100%',
      }}
    >
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          padding: '16px 20px',
          background: '#1a2332',
          borderRadius: 8,
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <UserSwitchOutlined style={{ fontSize: 22, color: '#faad14' }} />
          <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: 1 }}>
            员工作业派工
          </span>
          <span
            style={{
              background: '#faad14',
              color: '#1a2332',
              padding: '2px 10px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            待派工 {data?.total ?? 0}
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div
        style={{
          background: '#fff',
          borderRadius: 8,
          padding: '16px 20px',
          marginBottom: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <Form layout="inline" onFinish={handleSearch}>
          <Form.Item name="orderCode">
            <Input
              placeholder="输入工单号查询"
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              style={{ width: 280 }}
              allowClear
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={isLoading}>
              查询
            </Button>
          </Form.Item>
          <Form.Item>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              重置
            </Button>
          </Form.Item>
        </Form>
      </div>

      {/* Order Table */}
      <div
        style={{
          background: '#fff',
          borderRadius: 8,
          padding: '0 20px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
          }}
        >
          <span style={{ fontSize: 13, color: '#8c8c8c' }}>
            {selectedRowKeys.length > 0
              ? `已选 ${selectedRowKeys.length} 个工单`
              : '勾选工单进行派工操作'}
          </span>
          <Button
            type="primary"
            icon={<UserSwitchOutlined />}
            onClick={handleDispatch}
            disabled={selectedRowKeys.length === 0}
            style={{
              background: selectedRowKeys.length > 0 ? '#faad14' : undefined,
              borderColor: selectedRowKeys.length > 0 ? '#faad14' : undefined,
              fontWeight: 600,
            }}
          >
            人员作业派工
          </Button>
        </div>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data?.records ?? []}
          loading={isLoading}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
            getCheckboxProps: (record: DispatchableOrder) => ({
              disabled: record.statue !== 0,
            }),
          }}
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
      </div>

      {/* Dispatch Modal */}
      <Modal
        title={
          <span style={{ fontSize: 16, fontWeight: 600 }}>
            <UserSwitchOutlined style={{ marginRight: 8, color: '#faad14' }} />
            人员作业派工
          </span>
        }
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        confirmLoading={assignMutation.isPending}
        okText="确认派工"
        cancelText="取消"
        width={520}
        destroyOnClose
      >
        {/* Selected orders summary */}
        <div
          style={{
            background: '#f0f5ff',
            border: '1px solid #d6e4ff',
            borderRadius: 6,
            padding: '10px 14px',
            marginBottom: 20,
            fontSize: 13,
            color: '#1d39c4',
          }}
        >
          已选工单：<strong>{selectedRowKeys.length}</strong> 个
        </div>

        <Form
          form={formInstance}
          layout="vertical"
          initialValues={{ laborHours: 8 }}
        >
          <Form.Item
            name="teamId"
            label="生产作业班组"
            rules={[{ required: true, message: '请选择班组' }]}
          >
            <Select
              placeholder="选择班组"
              onChange={handleTeamChange}
              options={teams.map((t) => ({
                value: t.id,
                label: `${t.code} - ${t.name}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="userId"
            label="作业员"
            rules={[{ required: true, message: '请选择作业员' }]}
          >
            <Select
              placeholder={
                selectedTeamId
                  ? users.length === 0
                    ? '该班组暂无作业员'
                    : '选择作业员'
                  : '请先选择班组'
              }
              disabled={!selectedTeamId || users.length === 0}
              options={users.map((u) => ({
                value: u.id,
                label: u.name,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="laborHours"
            label="工时（小时）"
            rules={[{ required: true, message: '请输入工时' }]}
          >
            <InputNumber min={0.5} max={24} step={0.5} style={{ width: '100%' }} />
          </Form.Item>

          <Space size={16}>
            <Form.Item name="planStartTime" label="计划开始">
              <DatePicker placeholder="选择日期" />
            </Form.Item>
            <Form.Item name="planEndTime" label="计划结束">
              <DatePicker placeholder="选择日期" />
            </Form.Item>
          </Space>

          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="可选备注" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add mes/frontend/src/pages/order/DispatchList.tsx
git commit -m "feat: 新增员工作业派工页面 — 工业看板风格"
```

---

### Task 6: Routing + Menu Integration

**Files:**
- Modify: `mes/frontend/src/App.tsx` (add import + route)

- [ ] **Step 1: Add import and route in App.tsx**

Add import line after OrderList import:
```typescript
import DispatchList from '@/pages/order/DispatchList'
```

Add route after the order/production route:
```tsx
<Route path="order/dispatch" element={<DispatchList />} />
```

- [ ] **Step 2: Commit**

```bash
git add mes/frontend/src/App.tsx
git commit -m "feat: 注册员工作业派工路由 /order/dispatch"
```

---

### Task 7: Build + Integration Verification

- [ ] **Step 1: Build frontend**

Run: `cd mes/frontend && npm run build`
Expected: No TypeScript errors, Vite build succeeds

- [ ] **Step 2: TypeScript check**

Run: `cd mes/frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Verify backend compiles**

Run: `cd mes && mvn compile -DskipTests`
Expected: BUILD SUCCESS

- [ ] **Step 4: Verify complete workflow**

Steps to verify manually after backend restart:
1. Open "员工作业派工" page → table loads with statue=0 orders
2. Enter an order code → click 查询 → filtered results
3. Select first order → click 人员作业派工 → modal opens
4. Select 生产作业班组1 → select 作业员1 → enter hours → confirm
5. Verify: order statue changes to 1 (已派工), worker name shown in table
6. Repeat for second order
7. Verify: previously dispatched orders cannot be selected again (checkbox disabled)

- [ ] **Step 5: Commit if any build fixes needed**

```bash
git add -A
git commit -m "chore: 构建验证与修复"
```
