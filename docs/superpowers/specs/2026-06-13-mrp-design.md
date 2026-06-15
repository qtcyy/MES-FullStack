# 物料需求计划（MRP）功能设计

> 日期：2026-06-13
> 状态：已确认
> 分支：feature/manual-job-dispatch

## 1. 概述

实现 MES"物料需求计划"功能模块，用于"台式电脑主机"生产中的物料需求计划过程。MRP 是一种系统化方法，通过分析主生产计划、物料清单（BOM）和库存数据，计算各种物料的需求量和需求时间。

### 1.1 两大阶段

1. **MRP 运算**：对已审批工单执行 MRP 计算，生成生产计划和物料需求计划
2. **MRP 下发**：将物料需求计划下发，生成入库申请单

### 1.2 技术约束

- Java 8, Spring Boot 2.1.7, MyBatis-Plus 3.1.2
- React 18 + TypeScript + Ant Design 5
- 遵循现有分层架构

## 2. 数据模型

### 2.1 sp_mrp_plan — MRP 计划头表

```sql
CREATE TABLE sp_mrp_plan (
  id varchar(64) NOT NULL COMMENT '主键',
  order_id varchar(64) NOT NULL COMMENT '工单ID',
  order_code varchar(255) NOT NULL COMMENT '工单编号',
  product_code varchar(50) DEFAULT NULL COMMENT '产品物料编码',
  product_desc varchar(200) DEFAULT NULL COMMENT '产品描述',
  order_qty int DEFAULT NULL COMMENT '工单数量',
  plan_status varchar(20) DEFAULT 'draft' COMMENT 'draft=草稿 released=已下发',
  calculated_at datetime DEFAULT NULL COMMENT '运算时间',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='MRP计划头表';
```

### 2.2 sp_mrp_plan_item — MRP 计划明细

```sql
CREATE TABLE sp_mrp_plan_item (
  id varchar(64) NOT NULL COMMENT '主键',
  plan_id varchar(64) NOT NULL COMMENT '关联计划头ID',
  material_code varchar(50) DEFAULT NULL COMMENT '物料编码',
  material_desc varchar(200) DEFAULT NULL COMMENT '物料描述',
  unit varchar(20) DEFAULT NULL COMMENT '单位',
  bom_quantity decimal(10,2) DEFAULT NULL COMMENT 'BOM单件用量',
  gross_req decimal(10,2) DEFAULT NULL COMMENT '毛需求',
  available_stock decimal(10,2) DEFAULT 0 COMMENT '可用库存',
  safety_stock int DEFAULT 0 COMMENT '安全库存',
  net_req decimal(10,2) DEFAULT NULL COMMENT '净需求',
  lead_time int DEFAULT 0 COMMENT '提前期（天）',
  order_release_date varchar(20) DEFAULT NULL COMMENT '订单发布时间',
  receipt_status varchar(20) DEFAULT 'pending' COMMENT 'pending=待下发 generated=已生成入库单',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_plan_id (plan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='MRP计划明细表';
```

### 2.3 sp_inventory — 库存表

```sql
CREATE TABLE sp_inventory (
  id varchar(64) NOT NULL COMMENT '主键',
  material_code varchar(50) NOT NULL COMMENT '物料编码',
  quantity decimal(10,2) DEFAULT 0 COMMENT '当前库存数量',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_material_code (material_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='物料库存表';
```

### 2.4 sp_warehouse_receipt — 入库申请单

```sql
CREATE TABLE sp_warehouse_receipt (
  id varchar(64) NOT NULL COMMENT '主键',
  receipt_code varchar(64) NOT NULL COMMENT '入库单号',
  plan_id varchar(64) NOT NULL COMMENT '关联MRP计划ID',
  order_id varchar(64) DEFAULT NULL COMMENT '工单ID',
  receipt_status varchar(20) DEFAULT 'generated' COMMENT 'generated=已生成 received=已入库',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_plan_id (plan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='入库申请单';
```

## 3. MRP 运算算法

```
输入：工单 ID (orderId)

1. 查工单 (sp_order) → 获取 orderCode, qty, materiel (产品编码), planStartTime
2. 查产品 BOM (sp_product_bom WHERE product_code = 产品编码)
3. 递归遍历 BOM 树 → 对每个节点查 sp_product_bom_item WHERE bom_id = node.id
4. 收集所有 itemType='material' 的物料，按 material_code 合并累加用量
5. 对每个物料：
   a. 查 sp_materile → leadTime, safetyStock
   b. 查 sp_inventory → availableStock（无记录则=0）
   c. grossReq = orderQty × bomQuantity（工单数量 × BOM 单件用量）
   d. netReq = grossReq - availableStock + safetyStock
   e. orderReleaseDate = planStartTime - leadTime 天
6. 保存 sp_mrp_plan (plan_status='draft') + sp_mrp_plan_item 列表
7. 返回计算结果
```

## 4. 后端 API

### 4.1 端点列表

| 端点 | 方法 | 说明 |
|------|------|------|
| `POST /order/mrp/calculate/{orderId}` | POST | MRP 运算 |
| `POST /order/mrp/plan/page` | POST | 分页查询 MRP 计划列表 |
| `GET /order/mrp/plan/{planId}/items` | GET | 查询 MRP 计划明细 |
| `POST /order/mrp/plan/{planId}/release` | POST | 下发 → 生成入库申请单 |

### 4.2 事务保证

- `calculate`：无事务（纯计算+写入，失败无副作用）
- `release`：`@Transactional` — 创建入库单 + 更新计划状态 + 更新库存

## 5. 前端设计

### 5.1 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `pages/order/OrderList.tsx` | 修改 | 操作列增加"运算"按钮 |
| `pages/order/MrpPlanList.tsx` | 新建 | 物料需求计划（明细）页面 |
| `api/order/mrp.ts` | 新建 | MRP API 函数 |
| `types/mrp.ts` | 新建 | MRP 类型定义 |
| `App.tsx` | 修改 | 新增路由 /order/mrp-plan |

### 5.2 OrderList 改动

操作列增加"运算"按钮（仅 statue=0 显示）：
- 点击 → `POST /order/mrp/calculate/{id}`
- 成功后提示"MRP 运算完成，订单编号：xxx"
- 按钮可 loading 状态显示运算中

### 5.3 MrpPlanList 页面结构

```
PageContainer
  ├─ PageHeader — "物料需求计划（明细）"
  ├─ SearchForm — 订单号输入 + 查询
  ├─ Table — MRP 计划列表
  │   ├─ 订单编号、产品编码、工单数量、计划状态 Tag（draft=草稿/released=已下发）、运算时间
  │   └─ 操作列：[查看明细] [生成入库单]（仅 draft 状态可用）
  └─ Modal — 物料明细
       ├─ 物料编码、描述、BOM用量、毛需求、可用库存、净需求、提前期、发布时间
       ├─ 配送状态 Tag（pending=待下发 / generated=已生成入库单）
       └─ 全选 + [生成入库单] 按钮
```

## 6. 路由与菜单

- **路由**: `/order/mrp-plan`
- **菜单项**: 计划管理 (parent_id=12) → 物料需求计划（明细）
- **权限**: `order:mrp`

## 7. 错误处理

| 场景 | 处理 |
|------|------|
| 工单无对应 BOM | 提示"该产品无 BOM 数据，无法进行 MRP 运算" |
| 重复运算 | 提示"该工单已进行 MRP 运算，是否重新计算？" |
| MRP 计划已下发 | "生成入库单"按钮置灰 |
| BOM 无物料子件 | 提示"BOM 结构中无物料，无需生成物料需求" |

## 8. 验证清单

- [ ] OrderList 中 statue=0 工单显示"运算"按钮
- [ ] 点击运算 → MRP 计算完成 → 提示订单编号
- [ ] 物料需求计划页面可查询到 MRP 计划
- [ ] 点击查看明细 → 显示所有物料需求行
- [ ] 全选物料 → 生成入库单 → 配送状态变为"已生成"
- [ ] 入库申请单记录创建成功
- [ ] 订单查询"MO20240815-002"格式正常工作
- [ ] 前端构建：tsc + vite build 无错误
