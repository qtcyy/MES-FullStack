# 生产甘特图（周期2g）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 mes-new 新增"生产甘特图"页面（资源/订单双视角泳道、计划vs实际、真实进度），后端删除 mock、新增只读聚合端点，并补幂等 mock 数据。

**Architecture:** 一条 `sp_order_dispatch`（扩展 `oper_id`/`progress`）= 订单×工序×班组×作业员的派工任务；后端 1 个只读聚合端点 `POST /order/gantt/tasks` JOIN 出扁平 `GanttTaskVO[]`；前端 `useQuery$` 拉全量后客户端过滤 + 两种分组（资源/订单），自研 `GanttChart`（纯 CSS/div 绝对定位）渲染，hover 详情 + 点击只读 Sheet。

**Tech Stack:** 后端 Spring Boot 2.1.7 + MyBatis-Plus + Shiro；前端 React18 + TS + Vite + `@workspace/ui`(shadcn/Radix) + `@ngify/http` + 自研 `useQuery$`；测试 Vitest(node)。

**约定：**
- DB CLI：`/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -e "..."`（dev profile）。
- 后端构建：`cd mes && ./mvnw -q -DskipTests compile`。
- 前端：`cd mes/frontend && pnpm --filter mes-new run <check-types|lint|test>`。
- 提交沿用仓库 emoji-conventional 中文风格。
- **spec 偏差说明（已审）**：① 菜单 `icon` 用 `schedule`（iconMap 已映射→CalendarClock，零风险），非 spec 写的 `calendar`；② vitest 为 node 环境且只收 `*.test.ts`，故**不做组件渲染冒烟测**，TDD 聚焦 `ganttUtils` 纯函数，组件以 tsc/lint + 集成运行验证；③ DTO/VO 放既有 `order/dto` 包（与 `SpDispatchDTO` 同），非 spec 的 `vo/`/`request/`；④ mock 任务 19 条（完工8/进行中4/逾期2/未开工5），spec 的"~19"。

---

## File Structure

**后端（`mes/src/main/java/com/wangziyang/mes/order`）**
- Modify `entity/SpOrderDispatch.java` — 加 `operId`/`progress`
- Create `dto/GanttQueryReq.java` — 查询过滤入参
- Create `dto/GanttTaskVO.java` — 聚合结果
- Modify `mapper/SpOrderDispatchMapper.java` — 加 `selectGanttTasks`
- Modify `mes/src/main/resources/mapper/order/SpOrderDispatchMapper.xml` — resultMap + select
- Create `service/ISpGanttService.java`、`service/impl/SpGanttServiceImpl.java`
- Create `controller/SpGanttController.java`
- Modify `controller/SpOrderController.java` — 删 `getListGantt`

**SQL（`mes/scripts/sql`）**
- Create `gantt-migration.sql` — ALTER 加列 + 菜单 INSERT（幂等）
- Create `gantt-mock-seed.sql` — 班组成员/7订单/19任务（幂等）

**前端（`mes/frontend/apps/mes-new/src`）**
- Modify `types/order.ts` — `GanttTask`/`GanttQueryParams`
- Create `api/order/gantt.ts` — `fetchGanttTasks`
- Create `pages/order/gantt/ganttUtils.ts` — 纯函数
- Create `pages/order/gantt/__tests__/ganttUtils.test.ts`
- Create `pages/order/gantt/GanttChart.tsx`
- Create `pages/order/gantt/TaskDetailSheet.tsx`
- Create `pages/order/gantt/GanttPage.tsx`
- Modify `router.tsx`、`layouts/routeMeta.ts`

---

## Task 1: DB 迁移（加列 + 菜单）

**Files:**
- Create: `mes/scripts/sql/gantt-migration.sql`

- [ ] **Step 1: 写迁移脚本**

`mes/scripts/sql/gantt-migration.sql`：
```sql
-- 周期2g 生产甘特图 迁移(幂等)
-- 1) sp_order_dispatch 加 oper_id / progress(列存在则跳过)
SET @col_oper := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='sp_order_dispatch' AND COLUMN_NAME='oper_id');
SET @sql := IF(@col_oper=0,
  'ALTER TABLE sp_order_dispatch ADD COLUMN oper_id varchar(64) NULL COMMENT ''工序ID(关联sp_oper);订单级派工时为空''',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col_prog := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='sp_order_dispatch' AND COLUMN_NAME='progress');
SET @sql := IF(@col_prog=0,
  'ALTER TABLE sp_order_dispatch ADD COLUMN progress int NULL COMMENT ''完工进度0-100''',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- 2) 菜单: 计划管理(12) 下新增 生产甘特图(幂等)
DELETE FROM sp_sys_menu WHERE id='123';
INSERT INTO sp_sys_menu
  (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr,
   create_time, create_username, update_time, update_username)
VALUES
  ('123','orderGantt','生产甘特图','/order/gantt','12','3',3,'0','order:gantt','schedule','',
   '2026-06-17 00:00:00','admin','2026-06-17 00:00:00','admin');
```

- [ ] **Step 2: 执行迁移**

Run: `/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data < mes/scripts/sql/gantt-migration.sql`
Expected: 无报错。

- [ ] **Step 3: 验证列与菜单**

Run:
```bash
/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -e "SHOW COLUMNS FROM sp_order_dispatch LIKE 'oper_id'; SHOW COLUMNS FROM sp_order_dispatch LIKE 'progress'; SELECT id,name,url,permission,parent_id FROM sp_sys_menu WHERE id='123';"
```
Expected: 两列各 1 行；菜单 1 行（生产甘特图 /order/gantt order:gantt 12）。

- [ ] **Step 4: 再跑一次验证幂等**

Run: `/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data < mes/scripts/sql/gantt-migration.sql`
Expected: 无报错（不重复加列、菜单先删后插）。

- [ ] **Step 5: 提交**

```bash
git add mes/scripts/sql/gantt-migration.sql
git commit -m "🗃️ feat(order): 甘特图DB迁移(sp_order_dispatch加oper_id/progress + 计划管理下新增生产甘特图菜单,幂等)"
```

---

## Task 2: Mock 数据 seed

**Files:**
- Create: `mes/scripts/sql/gantt-mock-seed.sql`

- [ ] **Step 1: 写 seed 脚本**

`mes/scripts/sql/gantt-mock-seed.sql`：
```sql
-- 周期2g 生产甘特图 mock 数据(幂等: MK- 前缀清理 + 现有订单 UPDATE)
-- 前置: gantt-migration.sql 已执行(oper_id/progress 列存在)。今天=2026-06-17。

-- 0. 已知 ID
SET @t_g2  := '2063224132044075009';              -- 生产组2
SET @t_b1  := '48ad7f4a619b11f1aebc664b457a9374'; -- 生产作业班组1
SET @u_sp  := '1184009088826392578';  -- 宋鹏
SET @u_hz  := '1184010472443396098';  -- 猴子
SET @u_xm  := '1276512902757724162';  -- 小明
SET @u_cm  := '1266201180838801409';  -- cassman
SET @op_zp := '1336864489340960';  -- 装配工序
SET @op_cs := '1336864537575456';  -- 测试工序
SET @op_bz := '1336864575324192';  -- 包装工序
SET @op_jc := '1336864613072928';  -- 集成测试工序
SET @op_hj := '1336868360683552';  -- 焊接
SET @op_fj := '1336868452958240';  -- 封胶工序
SET @op_qx := '1336868562010144';  -- 清洗工序
SET @op_js := '1336868507484192';  -- 加酸工序
SET @op_rk := '1337248255574048';  -- 入库工序

-- 1. 清理旧 mock(幂等)
DELETE FROM sp_order_dispatch WHERE id LIKE 'MK-%';
DELETE FROM sp_team_user WHERE id LIKE 'MK-%';
DELETE FROM sp_order WHERE id LIKE 'MK-%';

-- 2. 班组成员: 生产作业班组1 补 小明/cassman
INSERT INTO sp_team_user (id, team_id, user_id, create_time, create_username, update_time, update_username) VALUES
 ('MK-TU-B1-XM', @t_b1, @u_xm, '2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin'),
 ('MK-TU-B1-CM', @t_b1, @u_cm, '2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin');

-- 3. 现有 2 单 UPDATE(计划窗口/状态/物料描述)
UPDATE sp_order SET plan_start_time='2026-06-10', plan_end_time='2026-06-19', statue=2,
  materiel_desc='CPU主板', order_description='CPU主板量产工单' WHERE order_code='GD2024061001';
UPDATE sp_order SET plan_start_time='2026-06-10', plan_end_time='2026-06-16', statue=2,
  materiel_desc='电源模块', order_description='电源模块量产工单' WHERE order_code='GD2024061002';
SET @o1 := (SELECT id FROM sp_order WHERE order_code='GD2024061001' LIMIT 1);
SET @o2 := (SELECT id FROM sp_order WHERE order_code='GD2024061002' LIMIT 1);

-- 4. 新增 5 单
INSERT INTO sp_order
 (id, order_code, order_description, qty, order_type, flow_id, materiel, materiel_desc,
  plan_start_time, plan_end_time, statue, create_time, create_username, update_time, update_username) VALUES
 ('MK-ORD-03','GD2024061003','控制板量产工单',80,'P','','MAT003','控制板','2026-06-11','2026-06-19',2,'2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin'),
 ('MK-ORD-04','GD2024061004','外壳验证工单',120,'A','','MAT004','外壳','2026-06-18','2026-06-24',1,'2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin'),
 ('MK-ORD-05','GD2024061005','显示屏量产工单',200,'P','','MAT005','显示屏','2026-06-09','2026-06-13',3,'2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin'),
 ('MK-ORD-06','GD2024061006','线束量产工单',60,'P','','MAT006','线束','2026-06-14','2026-06-22',2,'2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin'),
 ('MK-ORD-07','GD2024061007','主板组件返工工单',150,'F','','MAT007','主板组件','2026-06-10','2026-06-20',2,'2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin');

-- 5. 工序级派工任务 19 条(列: id,order_id,oper_id,team_id,user_id,labor_hours,dispatch_status,progress,
--    plan_start_time,plan_end_time,actual_start_time,actual_end_time,remark,审计4列)
INSERT INTO sp_order_dispatch
 (id, order_id, oper_id, team_id, user_id, labor_hours, dispatch_status, progress,
  plan_start_time, plan_end_time, actual_start_time, actual_end_time, remark,
  create_time, create_username, update_time, update_username) VALUES
 -- GD01 生产组2/宋鹏
 ('MK-DSP-0101', @o1, @op_zp, @t_g2, @u_sp, 16, 3, 100, '2026-06-10','2026-06-12','2026-06-10','2026-06-13','延期1天完成','2026-06-09 09:00:00','admin','2026-06-13 17:00:00','admin'),
 ('MK-DSP-0102', @o1, @op_cs, @t_g2, @u_sp, 16, 2, 60,  '2026-06-15','2026-06-18','2026-06-15',NULL,'进行中','2026-06-09 09:00:00','admin','2026-06-17 09:00:00','admin'),
 ('MK-DSP-0103', @o1, @op_bz, @t_g2, @u_sp, 8,  1, 0,   '2026-06-18','2026-06-19',NULL,NULL,'待开工','2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin'),
 -- GD02 生产组2/猴子
 ('MK-DSP-0201', @o2, @op_hj, @t_g2, @u_hz, 24, 3, 100, '2026-06-10','2026-06-14','2026-06-11','2026-06-15','','2026-06-09 09:00:00','admin','2026-06-15 17:00:00','admin'),
 ('MK-DSP-0202', @o2, @op_rk, @t_g2, @u_hz, 8,  2, 40,  '2026-06-15','2026-06-16','2026-06-16',NULL,'逾期未完成','2026-06-09 09:00:00','admin','2026-06-17 09:00:00','admin'),
 -- GD03 班组1/小明+cassman
 ('MK-DSP-0301','MK-ORD-03', @op_zp, @t_b1, @u_xm, 16, 3, 100, '2026-06-11','2026-06-13','2026-06-11','2026-06-13','','2026-06-09 09:00:00','admin','2026-06-13 17:00:00','admin'),
 ('MK-DSP-0302','MK-ORD-03', @op_jc, @t_b1, @u_xm, 24, 2, 70,  '2026-06-14','2026-06-18','2026-06-15',NULL,'进行中','2026-06-09 09:00:00','admin','2026-06-17 09:00:00','admin'),
 ('MK-DSP-0303','MK-ORD-03', @op_bz, @t_b1, @u_cm, 8,  2, 50,  '2026-06-13','2026-06-15','2026-06-13',NULL,'逾期','2026-06-09 09:00:00','admin','2026-06-17 09:00:00','admin'),
 -- GD04 班组1/cassman(未来未开工)
 ('MK-DSP-0401','MK-ORD-04', @op_hj, @t_b1, @u_cm, 24, 1, 0, '2026-06-18','2026-06-21',NULL,NULL,'','2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin'),
 ('MK-DSP-0402','MK-ORD-04', @op_fj, @t_b1, @u_cm, 16, 1, 0, '2026-06-21','2026-06-24',NULL,NULL,'','2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin'),
 -- GD05 生产组2(全部完工)
 ('MK-DSP-0501','MK-ORD-05', @op_zp, @t_g2, @u_sp, 16, 3, 100, '2026-06-09','2026-06-11','2026-06-09','2026-06-11','','2026-06-09 09:00:00','admin','2026-06-11 17:00:00','admin'),
 ('MK-DSP-0502','MK-ORD-05', @op_cs, @t_g2, @u_hz, 16, 3, 100, '2026-06-11','2026-06-13','2026-06-11','2026-06-13','','2026-06-09 09:00:00','admin','2026-06-13 17:00:00','admin'),
 ('MK-DSP-0503','MK-ORD-05', @op_jc, @t_g2, @u_sp, 8,  3, 100, '2026-06-12','2026-06-13','2026-06-12','2026-06-13','','2026-06-09 09:00:00','admin','2026-06-13 17:00:00','admin'),
 -- GD06 班组1/小明 + 生产组2/猴子
 ('MK-DSP-0601','MK-ORD-06', @op_qx, @t_b1, @u_xm, 16, 3, 100, '2026-06-14','2026-06-16','2026-06-14','2026-06-16','','2026-06-09 09:00:00','admin','2026-06-16 17:00:00','admin'),
 ('MK-DSP-0602','MK-ORD-06', @op_js, @t_b1, @u_xm, 24, 2, 20,  '2026-06-16','2026-06-19','2026-06-17',NULL,'进行中','2026-06-09 09:00:00','admin','2026-06-17 09:00:00','admin'),
 ('MK-DSP-0603','MK-ORD-06', @op_rk, @t_g2, @u_hz, 8,  1, 0,   '2026-06-19','2026-06-22',NULL,NULL,'','2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin'),
 -- GD07 生产组2/宋鹏 + 班组1/cassman
 ('MK-DSP-0701','MK-ORD-07', @op_zp, @t_g2, @u_sp, 24, 3, 100, '2026-06-10','2026-06-13','2026-06-12','2026-06-15','延期','2026-06-09 09:00:00','admin','2026-06-15 17:00:00','admin'),
 ('MK-DSP-0702','MK-ORD-07', @op_hj, @t_b1, @u_cm, 24, 2, 55,  '2026-06-15','2026-06-18','2026-06-16',NULL,'进行中','2026-06-09 09:00:00','admin','2026-06-17 09:00:00','admin'),
 ('MK-DSP-0703','MK-ORD-07', @op_cs, @t_g2, @u_hz, 8,  1, 0,   '2026-06-18','2026-06-20',NULL,NULL,'','2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin');
```

- [ ] **Step 2: 执行 seed**

Run: `/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data < mes/scripts/sql/gantt-mock-seed.sql`
Expected: 无报错。

- [ ] **Step 3: 验证数据量**

Run:
```bash
/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -e "SELECT COUNT(*) AS orders FROM sp_order; SELECT COUNT(*) AS tasks FROM sp_order_dispatch WHERE oper_id IS NOT NULL; SELECT dispatch_status,COUNT(*) FROM sp_order_dispatch GROUP BY dispatch_status; SELECT COUNT(*) AS b1_members FROM sp_team_user WHERE team_id='48ad7f4a619b11f1aebc664b457a9374';"
```
Expected: orders=7；tasks=19；dispatch_status 分组(1=5,2=6,3=8)；b1_members=2。

- [ ] **Step 4: 再跑验证幂等**

Run: `/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data < mes/scripts/sql/gantt-mock-seed.sql && /usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -e "SELECT COUNT(*) FROM sp_order_dispatch WHERE oper_id IS NOT NULL;"`
Expected: 仍为 19（无重复）。

- [ ] **Step 5: 提交**

```bash
git add mes/scripts/sql/gantt-mock-seed.sql
git commit -m "🌱 chore(order): 甘特图mock数据seed(班组成员+7订单+19工序级派工任务,四态齐全,幂等可重跑)"
```

---

## Task 3: 后端（实体/DTO/VO/Mapper/XML/Service/Controller + 删 mock）

**Files:**
- Modify: `mes/src/main/java/com/wangziyang/mes/order/entity/SpOrderDispatch.java`
- Create: `mes/src/main/java/com/wangziyang/mes/order/dto/GanttQueryReq.java`
- Create: `mes/src/main/java/com/wangziyang/mes/order/dto/GanttTaskVO.java`
- Modify: `mes/src/main/java/com/wangziyang/mes/order/mapper/SpOrderDispatchMapper.java`
- Modify: `mes/src/main/resources/mapper/order/SpOrderDispatchMapper.xml`
- Create: `mes/src/main/java/com/wangziyang/mes/order/service/ISpGanttService.java`
- Create: `mes/src/main/java/com/wangziyang/mes/order/service/impl/SpGanttServiceImpl.java`
- Create: `mes/src/main/java/com/wangziyang/mes/order/controller/SpGanttController.java`
- Modify: `mes/src/main/java/com/wangziyang/mes/order/controller/SpOrderController.java`

- [ ] **Step 1: 实体加字段**

打开 `entity/SpOrderDispatch.java`，在 `remark` 字段后加：
```java
    /** 工序ID(关联sp_oper);订单级派工时为空 */
    private String operId;

    /** 完工进度 0-100 */
    private Integer progress;
```
若该类**未用** Lombok（无 `@Data`/`@Getter`），在文件末尾对应 getter/setter 区追加：
```java
    public String getOperId() { return operId; }
    public void setOperId(String operId) { this.operId = operId; }
    public Integer getProgress() { return progress; }
    public void setProgress(Integer progress) { this.progress = progress; }
```
（若有 `@Data` 等 Lombok 注解，则只加上面两个字段，跳过 getter/setter。）

- [ ] **Step 2: 创建 GanttQueryReq**

`dto/GanttQueryReq.java`：
```java
package com.wangziyang.mes.order.dto;

/** 甘特图查询过滤(全部可选) */
public class GanttQueryReq {
    private String startTime;
    private String endTime;
    private String orderCode;
    private String teamId;

    public String getStartTime() { return startTime; }
    public void setStartTime(String startTime) { this.startTime = startTime; }
    public String getEndTime() { return endTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }
    public String getOrderCode() { return orderCode; }
    public void setOrderCode(String orderCode) { this.orderCode = orderCode; }
    public String getTeamId() { return teamId; }
    public void setTeamId(String teamId) { this.teamId = teamId; }
}
```

- [ ] **Step 3: 创建 GanttTaskVO**

`dto/GanttTaskVO.java`：
```java
package com.wangziyang.mes.order.dto;

/** 甘特图派工任务(订单×工序×班组×作业员) */
public class GanttTaskVO {
    private String id;
    private String orderId;
    private String orderCode;
    private String materiel;
    private String materielDesc;
    private Integer qty;
    private String orderType;
    private Integer orderStatue;
    private String operId;
    private String operName;
    private String teamId;
    private String teamName;
    private String userId;
    private String userName;
    private String planStartTime;
    private String planEndTime;
    private String actualStartTime;
    private String actualEndTime;
    private Integer dispatchStatus;
    private Integer progress;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }
    public String getOrderCode() { return orderCode; }
    public void setOrderCode(String orderCode) { this.orderCode = orderCode; }
    public String getMateriel() { return materiel; }
    public void setMateriel(String materiel) { this.materiel = materiel; }
    public String getMaterielDesc() { return materielDesc; }
    public void setMaterielDesc(String materielDesc) { this.materielDesc = materielDesc; }
    public Integer getQty() { return qty; }
    public void setQty(Integer qty) { this.qty = qty; }
    public String getOrderType() { return orderType; }
    public void setOrderType(String orderType) { this.orderType = orderType; }
    public Integer getOrderStatue() { return orderStatue; }
    public void setOrderStatue(Integer orderStatue) { this.orderStatue = orderStatue; }
    public String getOperId() { return operId; }
    public void setOperId(String operId) { this.operId = operId; }
    public String getOperName() { return operName; }
    public void setOperName(String operName) { this.operName = operName; }
    public String getTeamId() { return teamId; }
    public void setTeamId(String teamId) { this.teamId = teamId; }
    public String getTeamName() { return teamName; }
    public void setTeamName(String teamName) { this.teamName = teamName; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
    public String getPlanStartTime() { return planStartTime; }
    public void setPlanStartTime(String planStartTime) { this.planStartTime = planStartTime; }
    public String getPlanEndTime() { return planEndTime; }
    public void setPlanEndTime(String planEndTime) { this.planEndTime = planEndTime; }
    public String getActualStartTime() { return actualStartTime; }
    public void setActualStartTime(String actualStartTime) { this.actualStartTime = actualStartTime; }
    public String getActualEndTime() { return actualEndTime; }
    public void setActualEndTime(String actualEndTime) { this.actualEndTime = actualEndTime; }
    public Integer getDispatchStatus() { return dispatchStatus; }
    public void setDispatchStatus(Integer dispatchStatus) { this.dispatchStatus = dispatchStatus; }
    public Integer getProgress() { return progress; }
    public void setProgress(Integer progress) { this.progress = progress; }
}
```

- [ ] **Step 4: Mapper 加方法**

打开 `mapper/SpOrderDispatchMapper.java`，确保为：
```java
package com.wangziyang.mes.order.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wangziyang.mes.order.dto.GanttQueryReq;
import com.wangziyang.mes.order.dto.GanttTaskVO;
import com.wangziyang.mes.order.entity.SpOrderDispatch;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface SpOrderDispatchMapper extends BaseMapper<SpOrderDispatch> {

    List<GanttTaskVO> selectGanttTasks(@Param("req") GanttQueryReq req);
}
```

- [ ] **Step 5: XML 加 resultMap + select**

覆盖 `mes/src/main/resources/mapper/order/SpOrderDispatchMapper.xml`：
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.wangziyang.mes.order.mapper.SpOrderDispatchMapper">

    <resultMap id="ganttTaskMap" type="com.wangziyang.mes.order.dto.GanttTaskVO">
        <id column="id" property="id"/>
        <result column="order_id" property="orderId"/>
        <result column="order_code" property="orderCode"/>
        <result column="materiel" property="materiel"/>
        <result column="materiel_desc" property="materielDesc"/>
        <result column="qty" property="qty"/>
        <result column="order_type" property="orderType"/>
        <result column="order_statue" property="orderStatue"/>
        <result column="oper_id" property="operId"/>
        <result column="oper_name" property="operName"/>
        <result column="team_id" property="teamId"/>
        <result column="team_name" property="teamName"/>
        <result column="user_id" property="userId"/>
        <result column="user_name" property="userName"/>
        <result column="plan_start_time" property="planStartTime"/>
        <result column="plan_end_time" property="planEndTime"/>
        <result column="actual_start_time" property="actualStartTime"/>
        <result column="actual_end_time" property="actualEndTime"/>
        <result column="dispatch_status" property="dispatchStatus"/>
        <result column="progress" property="progress"/>
    </resultMap>

    <select id="selectGanttTasks" resultMap="ganttTaskMap">
        SELECT d.id, d.order_id, o.order_code, o.materiel, o.materiel_desc, o.qty, o.order_type,
               o.statue AS order_statue, d.oper_id, p.oper_desc AS oper_name,
               d.team_id, t.name AS team_name, d.user_id, u.name AS user_name,
               d.plan_start_time, d.plan_end_time, d.actual_start_time, d.actual_end_time,
               d.dispatch_status, d.progress
        FROM sp_order_dispatch d
        LEFT JOIN sp_order o ON o.id = d.order_id
        LEFT JOIN sp_oper p ON p.id = d.oper_id
        LEFT JOIN sp_team t ON t.id = d.team_id
        LEFT JOIN sp_sys_user u ON u.id = d.user_id
        WHERE d.oper_id IS NOT NULL
        <if test="req.orderCode != null and req.orderCode != ''">
            AND o.order_code LIKE CONCAT('%', #{req.orderCode}, '%')
        </if>
        <if test="req.teamId != null and req.teamId != ''">
            AND d.team_id = #{req.teamId}
        </if>
        <if test="req.startTime != null and req.startTime != ''">
            AND d.plan_end_time &gt;= #{req.startTime}
        </if>
        <if test="req.endTime != null and req.endTime != ''">
            AND d.plan_start_time &lt;= #{req.endTime}
        </if>
        ORDER BY d.plan_start_time, d.id
    </select>
</mapper>
```

- [ ] **Step 6: Service 接口**

`service/ISpGanttService.java`：
```java
package com.wangziyang.mes.order.service;

import com.wangziyang.mes.order.dto.GanttQueryReq;
import com.wangziyang.mes.order.dto.GanttTaskVO;

import java.util.List;

public interface ISpGanttService {
    List<GanttTaskVO> listGanttTasks(GanttQueryReq req);
}
```

- [ ] **Step 7: Service 实现**

`service/impl/SpGanttServiceImpl.java`：
```java
package com.wangziyang.mes.order.service.impl;

import com.wangziyang.mes.order.dto.GanttQueryReq;
import com.wangziyang.mes.order.dto.GanttTaskVO;
import com.wangziyang.mes.order.mapper.SpOrderDispatchMapper;
import com.wangziyang.mes.order.service.ISpGanttService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SpGanttServiceImpl implements ISpGanttService {

    @Autowired
    private SpOrderDispatchMapper spOrderDispatchMapper;

    @Override
    public List<GanttTaskVO> listGanttTasks(GanttQueryReq req) {
        if (req == null) {
            req = new GanttQueryReq();
        }
        return spOrderDispatchMapper.selectGanttTasks(req);
    }
}
```

- [ ] **Step 8: Controller**

`controller/SpGanttController.java`：
```java
package com.wangziyang.mes.order.controller;

import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.order.dto.GanttQueryReq;
import com.wangziyang.mes.order.service.ISpGanttService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
@RequestMapping("/order/gantt")
public class SpGanttController extends BaseController {

    @Autowired
    private ISpGanttService spGanttService;

    /** 甘特图任务聚合(只读);入参 form-encoded GanttQueryReq */
    @PostMapping("/tasks")
    @ResponseBody
    public Result tasks(GanttQueryReq req) {
        return Result.success(spGanttService.listGanttTasks(req));
    }
}
```

- [ ] **Step 9: 删除 mock getListGantt**

打开 `controller/SpOrderController.java`，删除第 123-151 行的 `getListGantt` 方法（`@RequestMapping(value = "/gantt/list" ...)` 整段）。删除后若 `import java.util.ArrayList; import java.util.HashMap;` 在本文件不再被其他方法使用，一并删除（`List`/`Map` 多半仍被其他方法使用则保留）。

- [ ] **Step 10: 后端编译**

Run: `cd mes && ./mvnw -q -DskipTests compile`
Expected: BUILD 成功，无编译错误。

- [ ] **Step 11: 直接用 SQL 验证聚合查询逻辑（绕过 Shiro 鉴权）**

Run:
```bash
/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -e "
SELECT d.id, o.order_code, p.oper_desc AS oper_name, t.name AS team_name, u.name AS user_name,
       d.plan_start_time, d.plan_end_time, d.actual_start_time, d.actual_end_time, d.dispatch_status, d.progress
FROM sp_order_dispatch d
LEFT JOIN sp_order o ON o.id=d.order_id
LEFT JOIN sp_oper p ON p.id=d.oper_id
LEFT JOIN sp_team t ON t.id=d.team_id
LEFT JOIN sp_sys_user u ON u.id=d.user_id
WHERE d.oper_id IS NOT NULL
ORDER BY d.plan_start_time, d.id;"
```
Expected: 19 行；oper_name/team_name/user_name 全部解析出中文（如 装配工序/生产组2/宋鹏），无 NULL 名称。

- [ ] **Step 12: 提交**

```bash
git add mes/src/main/java/com/wangziyang/mes/order mes/src/main/resources/mapper/order/SpOrderDispatchMapper.xml
git commit -m "✨ feat(order): 生产甘特图后端聚合端点(/order/gantt/tasks 只读JOIN) + sp_order_dispatch加oper_id/progress + 删除mock getListGantt"
```

---

## Task 4: 前端类型 + API

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/types/order.ts`
- Create: `mes/frontend/apps/mes-new/src/api/order/gantt.ts`

- [ ] **Step 1: 加类型**

在 `types/order.ts` 末尾追加：
```ts
/** 甘特图派工任务(订单×工序×班组×作业员) */
export interface GanttTask {
  id: string
  orderId: string
  orderCode: string
  materiel: string
  materielDesc?: string
  qty: number
  orderType: string
  orderStatue: number
  operId: string
  operName: string
  teamId: string
  teamName: string
  userId: string
  userName: string
  planStartTime?: string
  planEndTime?: string
  actualStartTime?: string
  actualEndTime?: string
  dispatchStatus: number
  progress?: number
}

/** 甘特图查询过滤(全部可选) */
export interface GanttQueryParams {
  startTime?: string
  endTime?: string
  orderCode?: string
  teamId?: string
}
```

- [ ] **Step 2: 加 API 函数**

`api/order/gantt.ts`：
```ts
import { http } from '@/http/client'
import type { GanttTask, GanttQueryParams } from '@/types/order'

/** 拉取甘特图任务(只读聚合);默认 form-encoded,后端 GanttQueryReq 绑定 */
export function fetchGanttTasks(params: GanttQueryParams = {}) {
  return http.post<GanttTask[]>('/order/gantt/tasks', params)
}
```

- [ ] **Step 3: 类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new run check-types`
Expected: 无类型错误。

- [ ] **Step 4: 提交**

```bash
git add mes/frontend/apps/mes-new/src/types/order.ts mes/frontend/apps/mes-new/src/api/order/gantt.ts
git commit -m "✨ feat(mes-new): 甘特图类型 GanttTask + API fetchGanttTasks(/order/gantt/tasks)"
```

---

## Task 5: ganttUtils（TDD 纯函数）

**Files:**
- Test: `mes/frontend/apps/mes-new/src/pages/order/gantt/__tests__/ganttUtils.test.ts`
- Create: `mes/frontend/apps/mes-new/src/pages/order/gantt/ganttUtils.ts`

- [ ] **Step 1: 先写失败测试**

`pages/order/gantt/__tests__/ganttUtils.test.ts`：
```ts
import { describe, it, expect } from 'vitest'
import {
  parseDay, getDisplayStatus, computeRange, daysBetween, timeToX,
  groupByResource, groupByOrder, DAY_MS,
} from '../ganttUtils'
import type { GanttTask } from '@/types/order'

function task(over: Partial<GanttTask>): GanttTask {
  return {
    id: 't', orderId: 'o', orderCode: 'GD', materiel: 'M', qty: 1, orderType: 'P', orderStatue: 2,
    operId: 'op', operName: '装配', teamId: 'team', teamName: '班组', userId: 'u', userName: '张三',
    dispatchStatus: 1, ...over,
  }
}
const NOW = parseDay('2026-06-17')!

describe('parseDay', () => {
  it('解析 yyyy-MM-dd', () => { expect(parseDay('2026-06-10')).toBe(new Date(2026, 5, 10).getTime()) })
  it('忽略时间后缀', () => { expect(parseDay('2026-06-10 08:30:00')).toBe(new Date(2026, 5, 10).getTime()) })
  it('空/非法 → null', () => {
    expect(parseDay('')).toBeNull()
    expect(parseDay(undefined)).toBeNull()
    expect(parseDay('abc')).toBeNull()
    expect(parseDay('2026-13-40')).toBeNull()
  })
})

describe('getDisplayStatus', () => {
  it('有实际完工 → completed', () => {
    expect(getDisplayStatus(task({ actualStartTime: '2026-06-10', actualEndTime: '2026-06-12' }), NOW)).toBe('completed')
  })
  it('已开工且未超期 → inProgress', () => {
    expect(getDisplayStatus(task({ actualStartTime: '2026-06-15', planEndTime: '2026-06-18' }), NOW)).toBe('inProgress')
  })
  it('已开工且计划完工早于今天 → overdue', () => {
    expect(getDisplayStatus(task({ actualStartTime: '2026-06-15', planEndTime: '2026-06-16' }), NOW)).toBe('overdue')
  })
  it('未开工 → notStarted', () => {
    expect(getDisplayStatus(task({ planStartTime: '2026-06-18', planEndTime: '2026-06-20' }), NOW)).toBe('notStarted')
  })
})

describe('daysBetween & timeToX', () => {
  it('同一天 → 0', () => {
    const d = parseDay('2026-06-10')!
    expect(daysBetween(d, d)).toBe(0)
    expect(timeToX(d, d, 44)).toBe(0)
  })
  it('相隔2天 × 44px = 88', () => {
    const a = parseDay('2026-06-10')!
    const b = parseDay('2026-06-12')!
    expect(daysBetween(a, b)).toBe(2)
    expect(timeToX(b, a, 44)).toBe(88)
  })
})

describe('computeRange', () => {
  it('min-1天 .. max+1天', () => {
    const tasks = [
      task({ planStartTime: '2026-06-10', planEndTime: '2026-06-15' }),
      task({ planStartTime: '2026-06-12', planEndTime: '2026-06-20' }),
    ]
    const r = computeRange(tasks, NOW)
    expect(r.startMs).toBe(parseDay('2026-06-09'))
    expect(r.endMs).toBe(parseDay('2026-06-21'))
  })
  it('空 → now ± 3天', () => {
    const r = computeRange([], NOW)
    expect(r.startMs).toBe(NOW - 3 * DAY_MS)
    expect(r.endMs).toBe(NOW + 3 * DAY_MS)
  })
})

describe('groupByResource', () => {
  it('按 班组→作业员 分组,保持出现顺序', () => {
    const tasks = [
      task({ id: 'a', teamId: 'T1', teamName: '班A', userId: 'U1', userName: '宋' }),
      task({ id: 'b', teamId: 'T1', teamName: '班A', userId: 'U1', userName: '宋' }),
      task({ id: 'c', teamId: 'T1', teamName: '班A', userId: 'U2', userName: '猴' }),
      task({ id: 'd', teamId: 'T2', teamName: '班B', userId: 'U3', userName: '明' }),
    ]
    const g = groupByResource(tasks)
    expect(g.map(x => x.label)).toEqual(['班A', '班B'])
    expect(g[0].rows.map(r => r.label)).toEqual(['宋', '猴'])
    expect(g[0].rows[0].tasks.map(t => t.id)).toEqual(['a', 'b'])
  })
})

describe('groupByOrder', () => {
  it('按 订单→工序 分组,工序按计划开始排序并带序号', () => {
    const tasks = [
      task({ id: 'a', orderId: 'O1', orderCode: 'GD1', operName: '测试', planStartTime: '2026-06-13' }),
      task({ id: 'b', orderId: 'O1', orderCode: 'GD1', operName: '装配', planStartTime: '2026-06-10' }),
    ]
    const g = groupByOrder(tasks)
    expect(g).toHaveLength(1)
    expect(g[0].label).toBe('GD1')
    expect(g[0].rows.map(r => r.label)).toEqual(['① 装配', '② 测试'])
    expect(g[0].rows[0].tasks[0].id).toBe('b')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd mes/frontend && pnpm --filter mes-new run test`
Expected: FAIL（`Cannot find module '../ganttUtils'` 或函数未定义）。

- [ ] **Step 3: 实现 ganttUtils**

`pages/order/gantt/ganttUtils.ts`：
```ts
import type { GanttTask } from '@/types/order'

export const DAY_MS = 24 * 60 * 60 * 1000

export type DisplayStatus = 'notStarted' | 'inProgress' | 'overdue' | 'completed'

/** 解析 'yyyy-MM-dd'(可带时间后缀) 为当天本地 00:00 毫秒;空/非法返回 null */
export function parseDay(s?: string | null): number | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const dt = new Date(y, mo - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  return dt.getTime()
}

/** 毫秒下取整到当天 00:00 */
export function floorDay(ms: number): number {
  const dt = new Date(ms)
  dt.setHours(0, 0, 0, 0)
  return dt.getTime()
}

/** 相隔整天数(按天取整) */
export function daysBetween(aMs: number, bMs: number): number {
  return Math.round((floorDay(bMs) - floorDay(aMs)) / DAY_MS)
}

/** 显示状态 */
export function getDisplayStatus(task: GanttTask, nowMs: number): DisplayStatus {
  if (task.actualEndTime) return 'completed'
  if (task.actualStartTime) {
    const pe = parseDay(task.planEndTime)
    if (pe != null && floorDay(nowMs) > pe) return 'overdue'
    return 'inProgress'
  }
  return 'notStarted'
}

/** 时间范围(两侧各 1 天 padding);无数据回退 now±3天 */
export function computeRange(tasks: GanttTask[], nowMs: number): { startMs: number; endMs: number } {
  const days: number[] = []
  for (const t of tasks) {
    for (const s of [t.planStartTime, t.planEndTime, t.actualStartTime, t.actualEndTime]) {
      const d = parseDay(s)
      if (d != null) days.push(d)
    }
  }
  if (days.length === 0) {
    const base = floorDay(nowMs)
    return { startMs: base - 3 * DAY_MS, endMs: base + 3 * DAY_MS }
  }
  return { startMs: Math.min(...days) - DAY_MS, endMs: Math.max(...days) + DAY_MS }
}

/** 枚举范围内每天 00:00 毫秒 */
export function enumerateDays(startMs: number, endMs: number): number[] {
  const out: number[] = []
  const e = floorDay(endMs)
  for (let cur = floorDay(startMs); cur <= e; cur += DAY_MS) out.push(cur)
  return out
}

/** 日期 → x 像素偏移 */
export function timeToX(dateMs: number, rangeStartMs: number, dayWidth: number): number {
  return daysBetween(rangeStartMs, dateMs) * dayWidth
}

export interface BarBox { left: number; width: number }
export interface TaskBars { plan: BarBox | null; actual: BarBox | null }

/** 计划/实际条像素盒;实际进行中(无完工时间)延伸到今天 */
export function taskBars(task: GanttTask, rangeStartMs: number, dayWidth: number, nowMs: number): TaskBars {
  const ps = parseDay(task.planStartTime)
  const pe = parseDay(task.planEndTime)
  const as = parseDay(task.actualStartTime)
  let ae = parseDay(task.actualEndTime)
  let plan: BarBox | null = null
  if (ps != null && pe != null) {
    plan = { left: timeToX(ps, rangeStartMs, dayWidth), width: (daysBetween(ps, pe) + 1) * dayWidth }
  }
  let actual: BarBox | null = null
  if (as != null) {
    if (ae == null) ae = floorDay(nowMs)
    if (ae < as) ae = as
    actual = { left: timeToX(as, rangeStartMs, dayWidth), width: (daysBetween(as, ae) + 1) * dayWidth }
  }
  return { plan, actual }
}

export interface GanttRow { key: string; label: string; sublabel?: string; tasks: GanttTask[] }
export interface GanttGroup { key: string; label: string; tag?: string; rows: GanttRow[] }

const STATUE_TEXT: Record<number, string> = {
  0: '待派工', 1: '已派工', 2: '进行中', 3: '已完成', 4: '已终结',
}

/** 资源视角: 班组 → 作业员(行内多任务),保持出现顺序 */
export function groupByResource(tasks: GanttTask[]): GanttGroup[] {
  const groups: GanttGroup[] = []
  const gIndex = new Map<string, GanttGroup>()
  const rIndex = new Map<string, GanttRow>()
  for (const t of tasks) {
    let g = gIndex.get(t.teamId)
    if (!g) {
      g = { key: t.teamId, label: t.teamName || '未分组班组', rows: [] }
      gIndex.set(t.teamId, g)
      groups.push(g)
    }
    const rk = t.teamId + '/' + t.userId
    let r = rIndex.get(rk)
    if (!r) {
      r = { key: rk, label: t.userName || '未指派', tasks: [] }
      rIndex.set(rk, r)
      g.rows.push(r)
    }
    r.tasks.push(t)
  }
  return groups
}

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']

/** 订单视角: 订单 → 工序(每工序一行,按计划开始排序,带序号) */
export function groupByOrder(tasks: GanttTask[]): GanttGroup[] {
  const groups: GanttGroup[] = []
  const index = new Map<string, { group: GanttGroup; items: GanttTask[] }>()
  for (const t of tasks) {
    let e = index.get(t.orderId)
    if (!e) {
      const tag = [t.materielDesc || t.materiel, t.qty != null ? '×' + t.qty : '', STATUE_TEXT[t.orderStatue] ?? '']
        .filter(Boolean)
        .join(' · ')
      const group: GanttGroup = { key: t.orderId, label: t.orderCode || t.orderId, tag, rows: [] }
      e = { group, items: [] }
      index.set(t.orderId, e)
      groups.push(group)
    }
    e.items.push(t)
  }
  for (const { group, items } of index.values()) {
    items.sort((a, b) => (parseDay(a.planStartTime) ?? 0) - (parseDay(b.planStartTime) ?? 0))
    group.rows = items.map((t, i) => ({
      key: t.id,
      label: (CIRCLED[i] ?? i + 1 + '.') + ' ' + t.operName,
      tasks: [t],
    }))
  }
  return groups
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd mes/frontend && pnpm --filter mes-new run test`
Expected: 全部 PASS（6 个 describe）。

- [ ] **Step 5: 提交**

```bash
git add mes/frontend/apps/mes-new/src/pages/order/gantt/ganttUtils.ts mes/frontend/apps/mes-new/src/pages/order/gantt/__tests__/ganttUtils.test.ts
git commit -m "✨ test(mes-new): 甘特图 ganttUtils 纯函数(时间换算/状态/分组)+单测(TDD,全绿)"
```

---

## Task 6: GanttChart + TaskDetailSheet 组件

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/order/gantt/GanttChart.tsx`
- Create: `mes/frontend/apps/mes-new/src/pages/order/gantt/TaskDetailSheet.tsx`

- [ ] **Step 1: GanttChart 组件**

`pages/order/gantt/GanttChart.tsx`：
```tsx
import { Fragment, useMemo } from 'react'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@workspace/ui'
import type { GanttTask } from '@/types/order'
import {
  enumerateDays, floorDay, getDisplayStatus, taskBars, timeToX,
  type DisplayStatus, type GanttGroup,
} from './ganttUtils'

const LABEL_W = 176
const DAY_W = 44
const ROW_H = 34
const GROUP_H = 30

const STATUS_BAR: Record<DisplayStatus, string> = {
  notStarted: 'bg-slate-400',
  inProgress: 'bg-amber-500',
  overdue: 'bg-red-500',
  completed: 'bg-green-500',
}
const STATUS_TEXT: Record<DisplayStatus, string> = {
  notStarted: '未开工',
  inProgress: '进行中',
  overdue: '逾期',
  completed: '已完工',
}

function fmtDay(ms: number): string {
  const d = new Date(ms)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

interface Props {
  groups: GanttGroup[]
  rangeStartMs: number
  rangeEndMs: number
  nowMs: number
  onTaskClick: (t: GanttTask) => void
}

export default function GanttChart({ groups, rangeStartMs, rangeEndMs, nowMs, onTaskClick }: Props) {
  const days = useMemo(() => enumerateDays(rangeStartMs, rangeEndMs), [rangeStartMs, rangeEndMs])
  const trackWidth = days.length * DAY_W
  const todayLeft = timeToX(floorDay(nowMs), rangeStartMs, DAY_W)
  const showToday = floorDay(nowMs) >= floorDay(rangeStartMs) && floorDay(nowMs) <= floorDay(rangeEndMs)

  const gridStyle = {
    width: trackWidth,
    backgroundImage:
      `repeating-linear-gradient(to right, transparent, transparent ${DAY_W - 1}px, hsl(var(--border)) ${DAY_W - 1}px, hsl(var(--border)) ${DAY_W}px)`,
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
        暂无派工任务数据
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <div style={{ minWidth: LABEL_W + trackWidth }}>
          {/* 表头 */}
          <div className="flex border-b bg-muted/40">
            <div
              className="sticky left-0 z-20 shrink-0 border-r bg-muted/40 px-3 text-xs font-medium text-muted-foreground flex items-center"
              style={{ width: LABEL_W, height: GROUP_H }}
            >
              班组 / 工序
            </div>
            <div className="relative" style={{ width: trackWidth, height: GROUP_H }}>
              {days.map((d, i) => (
                <div
                  key={d}
                  className="absolute top-0 flex h-full items-center justify-center border-r text-[11px] text-muted-foreground"
                  style={{ left: i * DAY_W, width: DAY_W }}
                >
                  {fmtDay(d)}
                </div>
              ))}
              {showToday && (
                <div className="absolute top-0 z-10 h-full w-px bg-red-500/70" style={{ left: todayLeft }} />
              )}
            </div>
          </div>

          {/* 分组 + 行 */}
          {groups.map((g) => (
            <div key={g.key}>
              <div className="flex items-center border-b bg-muted/60" style={{ height: GROUP_H }}>
                <div
                  className="sticky left-0 z-10 shrink-0 truncate border-r bg-muted/60 px-3 text-sm font-semibold"
                  style={{ width: LABEL_W, height: GROUP_H, lineHeight: `${GROUP_H}px` }}
                  title={g.label}
                >
                  {g.label}
                  {g.tag && <span className="ml-1 text-xs font-normal text-muted-foreground">{g.tag}</span>}
                </div>
                <div className="relative" style={{ width: trackWidth, height: GROUP_H }}>
                  {showToday && <div className="absolute top-0 h-full w-px bg-red-500/40" style={{ left: todayLeft }} />}
                </div>
              </div>

              {g.rows.map((row) => (
                <div key={row.key} className="flex border-b last:border-b-0">
                  <div
                    className="sticky left-0 z-10 shrink-0 truncate border-r bg-card px-3 text-sm"
                    style={{ width: LABEL_W, height: ROW_H, lineHeight: `${ROW_H}px` }}
                    title={row.label}
                  >
                    {row.label}
                  </div>
                  <div className="relative" style={{ ...gridStyle, height: ROW_H }}>
                    {showToday && <div className="absolute top-0 z-10 h-full w-px bg-red-500/40" style={{ left: todayLeft }} />}
                    {row.tasks.map((t) => {
                      const bars = taskBars(t, rangeStartMs, DAY_W, nowMs)
                      const st = getDisplayStatus(t, nowMs)
                      return (
                        <Fragment key={t.id}>
                          {bars.plan && (
                            <div
                              className="absolute rounded bg-slate-300/80 dark:bg-slate-600/70"
                              style={{ left: bars.plan.left + 2, width: Math.max(bars.plan.width - 4, 2), top: 4, height: 7 }}
                            />
                          )}
                          {bars.actual && (
                            <HoverCard openDelay={120} closeDelay={60}>
                              <HoverCardTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => onTaskClick(t)}
                                  className={`absolute flex items-center overflow-hidden rounded px-1.5 text-left text-[11px] text-white transition hover:brightness-110 hover:ring-2 hover:ring-ring focus:outline-none focus:ring-2 focus:ring-ring ${STATUS_BAR[st]}`}
                                  style={{ left: bars.actual.left + 2, width: Math.max(bars.actual.width - 4, 14), top: 14, height: ROW_H - 18 }}
                                >
                                  <span className="truncate">
                                    {t.operName}
                                    {t.progress != null ? ` ${t.progress}%` : ''}
                                  </span>
                                </button>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-64 text-xs" side="top">
                                <div className="mb-1 text-sm font-semibold">
                                  {t.orderCode} · {t.operName}
                                </div>
                                <div className="space-y-0.5 text-muted-foreground">
                                  <div>班组：{t.teamName} / {t.userName}</div>
                                  <div>计划：{t.planStartTime || '—'} ~ {t.planEndTime || '—'}</div>
                                  <div>实际：{t.actualStartTime || '—'} ~ {t.actualEndTime || '进行中'}</div>
                                  <div>进度：{t.progress ?? 0}% · {STATUS_TEXT[st]}</div>
                                </div>
                                <div className="mt-1 text-primary">点击查看详情 →</div>
                              </HoverCardContent>
                            </HoverCard>
                          )}
                        </Fragment>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TaskDetailSheet 组件**

`pages/order/gantt/TaskDetailSheet.tsx`：
```tsx
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@workspace/ui'
import type { GanttTask } from '@/types/order'
import { getDisplayStatus, type DisplayStatus } from './ganttUtils'

const STATUS_TEXT: Record<DisplayStatus, string> = {
  notStarted: '未开工',
  inProgress: '进行中',
  overdue: '逾期',
  completed: '已完工',
}
const TYPE_TEXT: Record<string, string> = { P: '量产', A: '验证', F: '返工' }

interface Props {
  task: GanttTask | null
  nowMs: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-b-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right">{value || '—'}</span>
    </div>
  )
}

export default function TaskDetailSheet({ task, nowMs, open, onOpenChange }: Props) {
  const st = task ? getDisplayStatus(task, nowMs) : 'notStarted'
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[380px] sm:max-w-[380px]">
        <SheetHeader>
          <SheetTitle>{task ? `${task.orderCode} · ${task.operName}` : '任务详情'}</SheetTitle>
          <SheetDescription>派工任务只读详情</SheetDescription>
        </SheetHeader>
        {task && (
          <div className="mt-4">
            <Row label="工单编号" value={task.orderCode} />
            <Row label="物料" value={`${task.materielDesc || task.materiel}${task.qty != null ? ' ×' + task.qty : ''}`} />
            <Row label="订单类型" value={TYPE_TEXT[task.orderType] ?? task.orderType} />
            <Row label="工序" value={task.operName} />
            <Row label="班组 / 作业员" value={`${task.teamName} / ${task.userName}`} />
            <Row label="计划时间" value={`${task.planStartTime || '—'} ~ ${task.planEndTime || '—'}`} />
            <Row label="实际时间" value={`${task.actualStartTime || '—'} ~ ${task.actualEndTime || '进行中'}`} />
            <Row label="完工进度" value={`${task.progress ?? 0}%`} />
            <Row label="显示状态" value={STATUS_TEXT[st]} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 3: 类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new run check-types`
Expected: 无类型错误（GanttPage 尚未引用这两个组件时它们未被使用,tsc 不报"未使用"——若 lint 报未使用,留待 Task 7 接线后消除）。

- [ ] **Step 4: 提交**

```bash
git add mes/frontend/apps/mes-new/src/pages/order/gantt/GanttChart.tsx mes/frontend/apps/mes-new/src/pages/order/gantt/TaskDetailSheet.tsx
git commit -m "✨ feat(mes-new): 甘特图组件 GanttChart(泳道/计划vs实际/今天线/hover) + TaskDetailSheet(只读详情)"
```

---

## Task 7: GanttPage + 路由注册 + 集成验证

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/order/gantt/GanttPage.tsx`
- Modify: `mes/frontend/apps/mes-new/src/router.tsx`
- Modify: `mes/frontend/apps/mes-new/src/layouts/routeMeta.ts`

- [ ] **Step 1: GanttPage 页面**

`pages/order/gantt/GanttPage.tsx`：
```tsx
import { useMemo, useState } from 'react'
import {
  Badge, Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Skeleton, Tabs, TabsContent, TabsList, TabsTrigger,
} from '@workspace/ui'
import PageContainer from '@/components/PageContainer'
import { useQuery$ } from '@/http/hooks'
import { fetchGanttTasks } from '@/api/order/gantt'
import type { GanttTask } from '@/types/order'
import { computeRange, groupByOrder, groupByResource } from './ganttUtils'
import GanttChart from './GanttChart'
import TaskDetailSheet from './TaskDetailSheet'

const LEGEND: { cls: string; text: string }[] = [
  { cls: 'bg-slate-300 dark:bg-slate-600', text: '计划' },
  { cls: 'bg-slate-400', text: '未开工' },
  { cls: 'bg-amber-500', text: '进行中' },
  { cls: 'bg-green-500', text: '已完工' },
  { cls: 'bg-red-500', text: '逾期' },
]

export default function GanttPage() {
  const { data, loading, refetch } = useQuery$(['gantt', 'tasks'], () => fetchGanttTasks({}))
  const tasks = useMemo(() => data ?? [], [data])
  const nowMs = useMemo(() => Date.now(), [])

  const [orderCode, setOrderCode] = useState('')
  const [teamId, setTeamId] = useState('all')
  const [tab, setTab] = useState('resource')
  const [active, setActive] = useState<GanttTask | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const teamOptions = useMemo(() => {
    const m = new Map<string, string>()
    for (const t of tasks) m.set(t.teamId, t.teamName)
    return [...m].map(([id, name]) => ({ id, name }))
  }, [tasks])

  const filtered = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (!orderCode || (t.orderCode ?? '').toLowerCase().includes(orderCode.toLowerCase())) &&
          (teamId === 'all' || t.teamId === teamId),
      ),
    [tasks, orderCode, teamId],
  )

  const range = useMemo(() => computeRange(filtered, nowMs), [filtered, nowMs])
  const resourceGroups = useMemo(() => groupByResource(filtered), [filtered])
  const orderGroups = useMemo(() => groupByOrder(filtered), [filtered])

  const onTaskClick = (t: GanttTask) => {
    setActive(t)
    setSheetOpen(true)
  }

  return (
    <PageContainer
      title="生产甘特图"
      description="按资源/订单两个视角查看工序派工的计划与实际进度"
      actions={
        <Button variant="outline" size="sm" onClick={refetch}>
          刷新
        </Button>
      }
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground" htmlFor="g-code">工单编号</label>
          <Input
            id="g-code"
            className="h-9 w-48"
            placeholder="按工单编号过滤"
            value={orderCode}
            onChange={(e) => setOrderCode(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground" htmlFor="g-team">班组</label>
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger id="g-team" className="h-9 w-44">
              <SelectValue placeholder="全部班组" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部班组</SelectItem>
              {teamOptions.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3 pb-1.5">
          {LEGEND.map((l) => (
            <span key={l.text} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`inline-block h-2.5 w-4 rounded-sm ${l.cls}`} />
              {l.text}
            </span>
          ))}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-4">
        <TabsList>
          <TabsTrigger value="resource">资源视角</TabsTrigger>
          <TabsTrigger value="order">订单视角</TabsTrigger>
        </TabsList>
        <TabsContent value="resource" className="pt-3">
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <GanttChart
              groups={resourceGroups}
              rangeStartMs={range.startMs}
              rangeEndMs={range.endMs}
              nowMs={nowMs}
              onTaskClick={onTaskClick}
            />
          )}
        </TabsContent>
        <TabsContent value="order" className="pt-3">
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <GanttChart
              groups={orderGroups}
              rangeStartMs={range.startMs}
              rangeEndMs={range.endMs}
              nowMs={nowMs}
              onTaskClick={onTaskClick}
            />
          )}
        </TabsContent>
      </Tabs>

      <TaskDetailSheet task={active} nowMs={nowMs} open={sheetOpen} onOpenChange={setSheetOpen} />
    </PageContainer>
  )
}
```
> 注：`Badge` 已 import 但本页未必用到 → 若 lint 报未使用，删除 `Badge` import。

- [ ] **Step 2: 注册路由**

打开 `src/router.tsx`：在其它 order 页 import 旁加
```tsx
import GanttPage from '@/pages/order/gantt/GanttPage'
```
在 `{ path: 'order/dispatch', element: <DispatchList /> },` 之后加
```tsx
{ path: 'order/gantt', element: <GanttPage /> },
```

- [ ] **Step 3: 注册路由元信息**

打开 `src/layouts/routeMeta.ts`：在 `'/order/dispatch': { ... },` 之后加
```tsx
  '/order/gantt': { title: '生产甘特图', icon: 'schedule' },
```

- [ ] **Step 4: 类型检查 + lint + 单测**

Run: `cd mes/frontend && pnpm --filter mes-new run check-types && pnpm --filter mes-new run lint && pnpm --filter mes-new run test`
Expected: 三者全绿（如有未使用 import 警告/错误，按 Step1/Task6 注释删除对应 import 后重跑）。

- [ ] **Step 5: 集成验证（端到端，附证据）**

1. 起后端：`cd mes && ./mvnw -q spring-boot:run`（端口 9090，后台运行）。
2. 起前端：`cd mes/frontend && pnpm --filter mes-new dev`（端口 4100）。
3. 浏览器登录后，从侧栏「计划管理 → 生产甘特图」进入 `/order/gantt`（或直接访问）。
4. 确认：
   - 默认「资源视角」：生产组2(宋鹏/猴子)、生产作业班组1(小明/cassman) 泳道，条按计划/实际显示，四态色正确，今天线落在中段；
   - 切「订单视角」：7 张订单分组，工序按序号①②③排列；
   - hover 条出详情卡；点击条右侧弹出只读详情 Sheet；
   - 工单编号/班组过滤生效。
5. 截图保存为证据（资源视角 + 订单视角各一张）。
   - 可用 `verify` 或 `run` skill 驱动浏览器截图。

- [ ] **Step 6: 提交**

```bash
git add mes/frontend/apps/mes-new/src/pages/order/gantt/GanttPage.tsx mes/frontend/apps/mes-new/src/router.tsx mes/frontend/apps/mes-new/src/layouts/routeMeta.ts
git commit -m "✨ feat(mes-new): 生产甘特图页(资源/订单双视角Tabs+过滤+图例+详情Sheet) + 注册 /order/gantt 路由与菜单元信息"
```

---

## 完成判定（对照 spec 验收）
- [ ] 侧栏「计划管理 → 生产甘特图」可达 `/order/gantt`。
- [ ] 资源视角(班组→作业员) + 订单视角(订单→工序) 双 Tab,计划/实际双条 + 进度 + 四态色。
- [ ] hover 详情卡 + 点击只读详情 Sheet。
- [ ] 数据来自真实聚合端点;旧 mock `/order/release/gantt/list` 已删。
- [ ] migration/seed 幂等可重跑(已二次验证)。
- [ ] check-types / lint / test 全绿;集成截图为证。
- [ ] 三主题正常(集成时顺带切换确认)。

---

## Self-Review（写完计划后自查）

**1. Spec 覆盖**：① 双视角→Task5 分组+Task7 Tabs ✓；② 计划vs实际/进度→ganttUtils.taskBars+GanttChart 双条 ✓；③ 只读+hover+详情→GanttChart HoverCard + TaskDetailSheet ✓；④ 后端删mock+聚合端点+加列→Task3 ✓；⑤ mock 中等集→Task2(7单19任务) ✓；⑥ 菜单→Task1 ✓；⑦ 测试 TDD→Task5 ✓；⑧ 路由对齐→Task7 ✓。
**2. 占位符**：无 TBD；所有步骤含完整代码与命令。
**3. 类型一致**：`GanttTask`/`GanttGroup`/`GanttRow`/`DisplayStatus`/`taskBars`/`computeRange`/`groupByResource`/`groupByOrder` 在 Task5 定义,Task6/7 引用名一致；后端 `selectGanttTasks`/`GanttQueryReq`/`GanttTaskVO` Task3 内自洽。
**4. 已知取舍**：组件无渲染单测(vitest node 限制)→集成验证补足；后端 HTTP 需鉴权→用 SQL 直验聚合逻辑 + 前端端到端。
