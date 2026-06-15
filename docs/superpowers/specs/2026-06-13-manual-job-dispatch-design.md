# 员工作业派工功能设计

> 日期：2026-06-13
> 状态：已确认
> 分支：feature/manual-job-dispatch

## 1. 概述

在生产管理流程中，"人工作业派工"安排在"物料准备相关活动"之后。当物料计划入库和配套出库完成后，将生产任务派发给合适的工人或班组。

### 1.1 目标

实现 MES"员工作业派工"功能模块，支持：
- 按工单号查询待派工任务清单
- 选择班组和作业员完成派工操作
- 查看派工状态和作业人员列表
- 批量派工支持

### 1.2 技术约束

- Java 8, Spring Boot 2.1.7, MyBatis-Plus 3.1.2
- React 18 + TypeScript + Ant Design 5
- 遵循现有分层架构：Controller → Service → Mapper
- 遵循前端 CRUD 模式

## 2. 数据模型

### 2.1 双表配合方案

- **sp_order.statue**：扩展工单高层状态
- **sp_order_dispatch**：新建派工记录表，存储派工详情

### 2.2 sp_order.statue 扩展

| 值 | 含义 | 说明 |
|----|------|------|
| 0 | 已下发 | 物料准备完成，等待派工 |
| 1 | 已派工 | 已分配作业员 |
| 2 | 已开工 | 作业员已开始生产 |
| 3 | 已完工 | 生产完成 |
| 4 | 待检验 | 等待质检 |
| 5 | 废补 | 废弃/补单 |

原有值（1=创建, 2=进行中, 3=订单结束, 4=订单终结）在 statue 扩展后仍然保留语义，已下发(0)是新增的起始状态。

### 2.3 sp_order_dispatch 表

```sql
CREATE TABLE sp_order_dispatch (
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
```

## 3. 架构设计

### 3.1 分层职责

| 层 | 类 | 路径 | 职责 |
|---|---|---|---|
| Controller | `SpDispatchController` | `order/controller/` | REST 接口 |
| Service | `ISpDispatchService` / `SpDispatchServiceImpl` | `order/service/` | 派工业务逻辑 |
| Mapper | `SpOrderDispatchMapper` | `order/mapper/` | 派工记录数据访问 |
| Entity | `SpOrderDispatch` | `order/entity/` | 派工记录实体 |

### 3.2 依赖关系

```
SpDispatchController
    └── ISpDispatchService
            ├── SpOrderDispatchMapper
            ├── ISpOrderService (更新工单 statue)
            ├── ISpTeamService (查询班组)
            └── ISysUserService (查询用户)
```

## 4. API 设计

### 4.1 端点列表

| 端点 | 方法 | 说明 |
|------|------|------|
| `/order/dispatch/page` | POST | 分页查询待派工工单（statue=0，按 orderCode 筛选） |
| `/order/dispatch/assign` | POST | 执行派工：创建 dispatch 记录 + 更新 statue=1 |
| `/order/dispatch/get-by-order/{orderId}` | GET | 查询某工单的派工记录详情 |
| `/order/dispatch/team-users/{teamId}` | GET | 获取班组下的作业员列表 |

### 4.2 请求/响应

**POST `/order/dispatch/page`**
```json
// Request
{ "current": 1, "size": 10, "orderCode": "GD20240101" }
// Response
{ "code": 0, "data": { "records": [...], "total": 5 }, "msg": "" }
```

**POST `/order/dispatch/assign`**
```json
// Request - 支持单个或批量
{ "orderIds": ["id1", "id2"], "teamId": "...", "userId": "...", "laborHours": 8, "planStartTime": "2024-01-10", "planEndTime": "2024-01-10", "remark": "" }
// Response
{ "code": 0, "data": null, "msg": "派工成功" }
```

### 4.3 事务保证

`assign` 方法使用 `@Transactional`，确保：
1. 创建 sp_order_dispatch 记录
2. 更新 sp_order.statue = 1
3. 两步操作原子提交或回滚

## 5. 前端设计

### 5.1 美学方向

- **Tone**: Industrial/Utilitarian — 工厂派工看板风格
- **色彩**: 深蓝灰底色 + 琥珀色强调 + 状态指示灯色
- **字体**: 工单号使用等宽字体（Tabular Nums），营造车间标签感

### 5.2 文件清单

| 文件 | 路径 | 说明 |
|------|------|------|
| DispatchList.tsx | `pages/order/DispatchList.tsx` | 派工管理页面 |
| dispatch.ts (API) | `api/order/dispatch.ts` | 派工 API 调用 |
| dispatch.ts (types) | `types/dispatch.ts` | 派工类型定义 |

### 5.3 页面结构

```
PageContainer
  ├─ PageHeader — 顶栏，标题 + 待派工计数徽章
  ├─ SearchForm — 工单号输入框 + 查询/重置
  ├─ PageTable — 工单列表（行选择 Checkbox）
  │   ├─ 工单编码（等宽字体）
  │   ├─ 描述、数量、物料
  │   ├─ 派工状态 Tag（工业指示灯风格圆点）
  │   ├─ 作业人员（已派工显示姓名，未派工显示"-"）
  │   └─ 工具栏：[人员作业派工] 按钮
  └─ ModalForm — 派工弹窗
       ├─ 工单摘要条（浓缩已选工单信息）
       ├─ 班组选择（Select 下拉）
       ├─ 作业员选择（Select，按班组联动过滤）
       ├─ 工时输入（InputNumber）
       ├─ 计划开始/结束（DatePicker）
       └─ 确认/取消
```

### 5.4 状态色彩体系

| 状态 | 颜色 | 指示灯 |
|------|------|--------|
| 已下发 | blue | 🔵 |
| 已派工 | green | 🟢 |
| 已开工 | orange | 🟠 |
| 已完工 | dark green | ✅ |
| 待检验 | gold | 🟡 |
| 废补 | red | 🔴 |

### 5.5 交互流程

1. 打开"员工作业派工"页面 → 自动加载待派工工单列表
2. 输入工单号 → 查询 → 表格显示匹配结果
3. 勾选一个或多个工单 → 点击"人员作业派工"
4. 弹窗打开 → 选择班组 → 作业员下拉联动过滤 → 填写工时
5. 确认 → 表格刷新 → 工单状态变为"已派工"绿点

## 6. 路由与菜单

- **路由**: `/order/dispatch`
- **菜单项**: 生产订单 → 员工作业派工
- **权限**: `order:dispatch`
- **菜单插入 SQL**: parent_id 使用生产订单菜单 ID

## 7. 错误处理

| 场景 | 处理 |
|------|------|
| 工单已被他人派工 | 后端检查 statue != 0，返回错误"该工单已派工" |
| 班组无作业员 | 前端作业员下拉为空，placeholder 提示 |
| 未勾选工单点派工 | 前端按钮 disabled |
| 事务失败 | `@Transactional` 自动回滚，返回错误信息 |

## 8. 验证清单

- [ ] 查询待派工工单：输入工单号，只返回 statue=0 的工单
- [ ] 派工操作：选择班组+作业员，确认后 statue 变为 1
- [ ] 派工记录：sp_order_dispatch 表中正确创建记录
- [ ] 作业人员列表：已派工工单显示作业员姓名
- [ ] 批量派工：多选工单一次派工
- [ ] 重复派工防护：已派工工单不可再次派工
- [ ] 前端构建：tsc + vite build 无错误
