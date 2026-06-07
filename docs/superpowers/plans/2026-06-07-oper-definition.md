# 工序信息定义 实现计划

> **Goal:** 增强现有 sp_oper 模块，添加自动编号、加工单元绑定、工时/制造周期管理

**Architecture:** ALTER 现有表 + 重写空壳 Controller + 新建前端 CRUD 页面

---

### Task 1: ALTER 数据库表 + 演示数据

```sql
ALTER TABLE sp_oper ADD COLUMN oper_code varchar(50) DEFAULT NULL COMMENT '自动生成工序编号 OPR-XXX';
ALTER TABLE sp_oper ADD COLUMN process_unit_id varchar(64) DEFAULT NULL COMMENT '绑定加工单元ID';
ALTER TABLE sp_oper ADD COLUMN labor_hours int DEFAULT 0 COMMENT '工时(分钟)';
ALTER TABLE sp_oper ADD COLUMN manufacturing_cycle int DEFAULT 0 COMMENT '制造周期(分钟)';
ALTER TABLE sp_oper ADD COLUMN generate_plan char(1) DEFAULT '1' COMMENT '0=否 1=是';
ALTER TABLE sp_oper ADD COLUMN remark varchar(255) DEFAULT NULL COMMENT '备注';
```

### Task 2: 增强 SpOper 实体

添加 operCode, processUnitId, laborHours, manufacturingCycle, generatePlan, remark 字段及 getter/setter。

### Task 3: 重写 SpOperController

5 个 API 端点：page, list, add-or-update（自动编号 + 校验）, delete, /process-units

### Task 4: 前端类型 + API + 页面 + 路由 + 菜单

OperList.tsx + OperForm.tsx + oper.ts API + 类型 + 路由 + 菜单

### Task 5: 构建验证
