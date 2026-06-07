# 工序信息定义 — 设计文档

**日期**: 2026-06-07
**状态**: 已确认

## 1. 概述

增强现有的 `sp_oper`（工序）模块，添加自动编号生成、加工单元绑定、工时/制造周期管理、生成生产计划标记等功能。现有代码为空白壳（Controller 无方法、无前端页面），需完整建设。

## 2. 数据库

### 2.1 ALTER sp_oper

```sql
ALTER TABLE sp_oper
  ADD COLUMN oper_code varchar(50) DEFAULT NULL COMMENT '自动生成工序编号 OPR-XXX',
  ADD COLUMN process_unit_id varchar(64) DEFAULT NULL COMMENT '绑定加工单元ID',
  ADD COLUMN labor_hours int DEFAULT 0 COMMENT '工时(分钟)',
  ADD COLUMN manufacturing_cycle int DEFAULT 0 COMMENT '制造周期(分钟)',
  ADD COLUMN generate_plan char(1) DEFAULT '1' COMMENT '是否生成生产计划 0=否 1=是',
  ADD COLUMN remark varchar(255) DEFAULT NULL COMMENT '备注';
```

### 2.2 演示数据

```sql
INSERT INTO sp_oper (id, oper, oper_code, oper_desc, process_unit_id, labor_hours, manufacturing_cycle, generate_plan, remark, create_time, create_username, update_time, update_username)
VALUES
(UUID(), 'OPR-001', 'OPR-001', '主板组装作业工序', NULL, 30, 45, '1', '将CPU、内存、SSD、主板等核心部件组装到主板上', NOW(), 'admin', NOW(), 'admin'),
(UUID(), 'OPR-002', 'OPR-002', '机箱组装作业工序', NULL, 20, 35, '1', '将主板单元安装到机箱中，连接电源和数据线', NOW(), 'admin', NOW(), 'admin');
```

## 3. 后端

### 3.1 实体增强

`SpOper.java` 新增字段：
- `operCode` → `oper_code`（自动生成，OPR-XXX）
- `processUnitId` → `process_unit_id`
- `laborHours` → `labor_hours`
- `manufacturingCycle` → `manufacturing_cycle`
- `generatePlan` → `generate_plan`
- `remark` → `remark`

### 3.2 Controller

路径不变：`/basedata/sp-oper`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/page` | 分页查询 |
| GET | `/list` | 全部列表（供穿梭框等使用） |
| POST | `/add-or-update` | 新增/编辑。新增时自动生成 oper_code |
| POST | `/delete` | 删除（@RequestBody JSON） |
| GET | `/process-units` | 获取加工单元列表（供下拉选择） |

自动编号规则：`OPR-` + 3位序号（001 起）

### 3.3 校验

- oper_code 唯一
- manufacturing_cycle > labor_hours

## 4. 前端

### 4.1 文件

- 新建：`mes/frontend/src/pages/technology/OperList.tsx`
- 新建：`mes/frontend/src/pages/technology/OperForm.tsx`
- 新建：`mes/frontend/src/api/technology/oper.ts`
- 修改：`mes/frontend/src/types/common.ts`（加 Oper 类型）
- 修改：`mes/frontend/src/App.tsx`（加路由）

### 4.2 页面布局

**列表页**：标准 CRUD（SearchForm + PageTable + ModalForm）
- 列：工序编号、工序描述、加工单元、工时、制造周期、生成计划、备注、操作
- 搜索：工序描述
- 新增/编辑：Modal 内嵌 OperForm

**表单**：竖排布局
- 工序描述（必填）
- 加工单元（Select，从 API 加载）
- 工时（InputNumber，整数）
- 制造周期（InputNumber，整数，校验 > 工时）
- 是否生成生产计划（Radio：是/否，默认是）
- 备注（TextArea）

### 4.3 路由

`/technology/oper` → `OperList`

## 5. 菜单权限

- 菜单名称：工序信息定义
- 路径：`/technology/oper`
- 权限：`oper:list`, `oper:add`, `oper:edit`, `oper:delete`
