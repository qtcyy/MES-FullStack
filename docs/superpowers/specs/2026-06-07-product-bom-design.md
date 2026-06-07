# 产品 BOM 管理 — 设计文档

**日期**: 2026-06-07  
**状态**: 待审核

## 1. 概述

在 MES 系统中新增"产品BOM管理"模块，独立于现有的"工艺BOM管理"。支持以树形层级结构定义产品 BOM（Bill of Materials），从制造层次上界定产品的每个步骤，并提供 BOM 锁定/定版机制。

### 1.1 核心需求

| # | 需求 | 说明 |
|---|------|------|
| 1 | 产品绑定 | 创建 BOM 必须对应产品物料，不能是组件或零件 |
| 2 | 制造层级 | 每个层次代表制程中某一个步骤的完成 |
| 3 | 自上而下创建 | 先创建父节点，再创建子节点 |
| 4 | 备注信息 | 每个 BOM 节点的备注要清晰准确 |
| 5 | 及时刷新 | 每完成一个组件的 BOM 后刷新视图 |
| 6 | 锁定定版 | BOM 定版后整棵树只读，不可编辑修改 |
| 7 | 版本更新 | 可复制已有 BOM 创建新版本 |

### 1.2 BOM 层级示例

```
台式电脑主机（产品 · level 0）
  └─ 台式电脑半成品（半成品 · level 1）
      ├─ 主板单元（组件 · level 2）
      │   ├─ CPU i7-13700K × 1
      │   ├─ DDR5 32GB × 2
      │   └─ SSD 1TB NVMe × 1
      └─ 机箱单元（组件 · level 2）
          ├─ 机箱外壳 ATX × 1
          └─ 电源 750W × 1
```

## 2. 架构决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 模块定位 | 新增独立"产品BOM管理" | 产品BOM 的树形层级与工艺BOM 的平表结构不同，独立建模更清晰 |
| 列表页展示 | 列表视图 + 树形视图，工具栏切换 | 兼顾快速浏览和层级查看 |
| 物料来源 | 支持从物料主数据选择 + 手动输入 | 灵活性与数据规范性兼顾 |
| 锁定范围 | 锁定产品节点 = 整棵树只读 | 确保制造数据版本一致性 |

## 3. 数据库设计

### 3.1 sp_product_bom（产品 BOM 节点表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | varchar(32) | Snowflake 主键 |
| bom_code | varchar(50) | BOM 编码，自动生成 PBOM-XXX |
| product_code | varchar(50) | 产品物料编码（根节点关联 sp_materile） |
| node_name | varchar(100) | 节点名称 |
| parent_id | varchar(32) | 父节点 ID（null = 根节点） |
| level | int | 层级：0=产品, 1=半成品, 2=组件 |
| version | varchar(20) | 版本号，如 V1.0 |
| status | varchar(20) | draft=草稿, locked=已锁定 |
| remark | varchar(500) | 备注信息 |
| sort_order | int | 同级排序 |
| locked_at | datetime | 锁定时间 |
| locked_by | varchar(50) | 锁定人 |
| create_time | datetime | 创建时间（BaseEntity） |
| update_time | datetime | 更新时间（BaseEntity） |

### 3.2 sp_product_bom_item（BOM 行项目表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | varchar(32) | Snowflake 主键 |
| bom_id | varchar(32) | 所属 BOM 节点 ID |
| item_type | varchar(20) | material=物料, bom_ref=BOM节点引用 |
| material_code | varchar(50) | 物料编码 |
| material_desc | varchar(200) | 物料描述 |
| quantity | decimal(10,2) | 用量 |
| unit | varchar(20) | 单位 |
| sort_order | int | 排序 |
| create_time | datetime | 创建时间 |
| update_time | datetime | 更新时间 |

### 3.3 DDL

```sql
CREATE TABLE `sp_product_bom` (
  `id` varchar(32) NOT NULL,
  `bom_code` varchar(50) DEFAULT NULL COMMENT 'BOM编码',
  `product_code` varchar(50) DEFAULT NULL COMMENT '产品物料编码',
  `node_name` varchar(100) DEFAULT NULL COMMENT '节点名称',
  `parent_id` varchar(32) DEFAULT NULL COMMENT '父节点ID',
  `level` int DEFAULT 0 COMMENT '层级',
  `version` varchar(20) DEFAULT 'V1.0' COMMENT '版本号',
  `status` varchar(20) DEFAULT 'draft' COMMENT 'draft/locked',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  `sort_order` int DEFAULT 0 COMMENT '排序',
  `locked_at` datetime DEFAULT NULL COMMENT '锁定时间',
  `locked_by` varchar(50) DEFAULT NULL COMMENT '锁定人',
  `create_time` datetime DEFAULT NULL,
  `create_username` varchar(50) DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `update_username` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_product_code` (`product_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `sp_product_bom_item` (
  `id` varchar(32) NOT NULL,
  `bom_id` varchar(32) NOT NULL COMMENT '所属BOM节点ID',
  `item_type` varchar(20) DEFAULT 'material' COMMENT 'material/bom_ref',
  `material_code` varchar(50) DEFAULT NULL COMMENT '物料编码',
  `material_desc` varchar(200) DEFAULT NULL COMMENT '物料描述',
  `quantity` decimal(10,2) DEFAULT 1.00 COMMENT '用量',
  `unit` varchar(20) DEFAULT '个' COMMENT '单位',
  `sort_order` int DEFAULT 0 COMMENT '排序',
  `create_time` datetime DEFAULT NULL,
  `create_username` varchar(50) DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `update_username` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_bom_id` (`bom_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 4. 后端设计

### 4.1 包结构

```
com.wangziyang.mes.technology/
├── entity/
│   ├── SpProductBom.java          # BOM 节点实体
│   └── SpProductBomItem.java      # BOM 行项目实体
├── mapper/
│   ├── SpProductBomMapper.java
│   └── SpProductBomItemMapper.java
├── service/
│   ├── ISpProductBomService.java
│   ├── ISpProductBomItemService.java
│   └── impl/
│       ├── SpProductBomServiceImpl.java
│       └── SpProductBomItemServiceImpl.java
├── controller/
│   └── SpProductBomController.java  # @RequestBody JSON
├── request/
│   └── SpProductBomPageReq.java
└── dto/
    └── SpProductBomDto.java
```

### 4.2 API 设计

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/technology/product-bom/page` | 分页查询（列表视图），返回 `IPage<SpProductBom>`，仅查根节点 (parent_id IS NULL) |
| GET | `/technology/product-bom/tree` | 树形查询（树形视图），返回整棵树 `List<SpProductBom>` |
| GET | `/technology/product-bom/tree/{id}` | 获取单个 BOM 的树，返回节点及其所有子节点 |
| POST | `/technology/product-bom/add-or-update` | 新增/更新 BOM 节点 @RequestBody |
| POST | `/technology/product-bom/delete` | 删除 BOM 节点，同时删除子节点 @RequestBody |
| POST | `/technology/product-bom/lock` | 锁定 BOM 结构 @RequestBody `{id}` |
| POST | `/technology/product-bom/new-version` | 复制整棵树创建新版本 @RequestBody `{id}` |
| POST | `/technology/product-bom/item/add-or-update` | 新增/更新 BOM 行项目 @RequestBody |
| POST | `/technology/product-bom/item/delete` | 删除 BOM 行项目 @RequestBody `{id}` |
| GET | `/technology/product-bom/items/{bomId}` | 获取某节点的所有行项目 |

### 4.3 核心业务逻辑

**锁定 BOM（lock）**：
1. 根据 id 查找产品根节点
2. 校验 status != 'locked'
3. 递归查找所有子节点
4. 将所有节点的 status 设为 'locked'
5. 记录 locked_at 和 locked_by

**创建新版本（new-version）**：
1. 根据 id 查找产品根节点（必须为 locked 状态）
2. 深拷贝整棵 BOM 树（节点 + 行项目）
3. 新版本号 = 旧版本号 + 1（如 V1.0 → V2.0）
4. BOM 编码自动生成新的
5. 状态设为 'draft'

**新增 BOM 根节点**：
1. 校验 product_code 对应的物料类型为"产品"（`mat_type = '产品'`）
2. 自动生成 BOM 编码（PBOM-XXX 序号）
3. level = 0, parent_id = null

**新增子节点**：
1. 校验父节点存在且未锁定
2. level = 父节点 level + 1
3. 自动设置 sort_order

## 5. 前端设计

### 5.1 文件结构

```
mes/frontend/src/
├── api/technology/product-bom.ts           # API 调用
├── pages/technology/
│   ├── ProductBomList.tsx                   # 列表页（列表/树形切换）
│   └── ProductBomEditor.tsx                 # BOM 编制界面（树 + 详情）
└── types/common.ts                          # 新增 ProductBom 类型
```

### 5.2 路由

- `/technology/product-bom` → `ProductBomList`（产品BOM管理列表）
- `/technology/product-bom/:id` → `ProductBomEditor`（BOM编制界面）

### 5.3 页面交互

**列表页（ProductBomList）**：
- 搜索栏：产品编码、产品描述
- 工具栏：列表/树形切换按钮（Radio.Group 或 Segmented）+ 新增按钮
- 列表视图：使用 PageTable，编码列可点击跳转
- 树形视图：使用 Ant Design Tree，按产品分组展示，操作按钮内嵌
- 新增：弹出 Modal → Select 选择产品物料（只显示 mat_type='产品'）→ 确认后创建根节点并跳转

**编制界面（ProductBomEditor）**：
- 顶部面包屑：产品BOM管理 > 台式电脑主机
- 左侧面板（~300px）：Ant Design Tree 展示 BOM 节点，支持添加子节点
- 右侧面板：选中节点的详情表单 + 行项目表格
  - 节点表单：名称、备注、层级（只读）、状态（只读）
  - 行项目表格：物料选择（支持 Select + 手动输入）、用量、单位、操作
- 产品节点（level=0）：显示"锁定BOM结构"按钮
- 锁定后：所有表单和表格变为只读，隐藏操作按钮
- 已锁定的产品节点：显示"创建新版本"按钮

### 5.4 状态处理

| 场景 | 行为 |
|------|------|
| 草稿 BOM | 所有节点可编辑，编码链接 → 编辑模式 |
| 已锁定 BOM | 所有节点只读，编码链接 → 查看模式，显示"创建新版本" |
| 锁定操作 | 二次确认弹窗："确认锁定BOM结构？锁定后不可编辑。" |
| 新版本操作 | 二次确认弹窗："将在V1.0基础上创建新版本V2.0？" |

## 6. 菜单权限

- 菜单名称：产品BOM管理
- 菜单路径：`/technology/product-bom`
- 权限标识：`product-bom:list`
- 操作权限：`product-bom:add`, `product-bom:edit`, `product-bom:delete`, `product-bom:lock`

## 7. 与现有模块的关系

- **物料信息定义**：BOM 根节点必须选择 mat_type='产品' 的物料；行项目可引用任意物料
- **工艺BOM管理**：保持不变，与产品BOM管理并存于"工艺管理"菜单下
- **零部件定义**：BOM 行项目可引用零部件物料
- **生产订单**：后续可关联产品 BOM，此处预留 product_code 字段

## 8. 演示数据

在数据库中预置"台式电脑主机"产品 BOM 演示数据：

### 8.1 物料准备

确保 `sp_materile` 表中存在以下物料：
- **台式电脑主机**（物料编码：PROD-001，mat_type='产品'）
- CPU i7-13700K（物料编码：PART-001）
- DDR5 32GB 内存（物料编码：PART-002）
- SSD 1TB NVMe（物料编码：PART-003）
- 主板 Z790（物料编码：PART-004）
- 散热器（物料编码：PART-005）
- 机箱外壳 ATX（物料编码：PART-006）
- 电源 750W 金牌（物料编码：PART-007）
- 散热风扇 120mm（物料编码：PART-008）

### 8.2 BOM 演示数据

```sql
-- BOM 节点
INSERT INTO sp_product_bom (id, bom_code, product_code, node_name, parent_id, level, version, status, remark, sort_order, create_time)
VALUES
('bom-root-001', 'PBOM-001', 'PROD-001', '台式电脑主机', NULL, 0, 'V1.0', 'draft', '台式电脑主机产品BOM，首批量产版本', 0, NOW()),
('bom-sub-001', 'PBOM-002', 'PROD-001', '台式电脑半成品', 'bom-root-001', 1, 'V1.0', 'draft', '台式电脑主机半成品组装单元', 0, NOW()),
('bom-comp-001', 'PBOM-003', 'PROD-001', '主板单元', 'bom-sub-001', 2, 'V1.0', 'draft', '包含CPU、内存、主板等核心计算部件', 0, NOW()),
('bom-comp-002', 'PBOM-004', 'PROD-001', '机箱单元', 'bom-sub-001', 2, 'V1.0', 'draft', '包含机箱、电源、散热等外部设备', 1, NOW());

-- BOM 行项目（主板单元）
INSERT INTO sp_product_bom_item (id, bom_id, item_type, material_code, material_desc, quantity, unit, sort_order, create_time)
VALUES
('item-001', 'bom-comp-001', 'material', 'PART-001', 'CPU i7-13700K', 1, '个', 0, NOW()),
('item-002', 'bom-comp-001', 'material', 'PART-002', 'DDR5 32GB 内存', 2, '条', 1, NOW()),
('item-003', 'bom-comp-001', 'material', 'PART-003', 'SSD 1TB NVMe', 1, '个', 2, NOW()),
('item-004', 'bom-comp-001', 'material', 'PART-004', '主板 Z790', 1, '个', 3, NOW()),
('item-005', 'bom-comp-001', 'material', 'PART-005', 'CPU散热器', 1, '个', 4, NOW());

-- BOM 行项目（机箱单元）
INSERT INTO sp_product_bom_item (id, bom_id, item_type, material_code, material_desc, quantity, unit, sort_order, create_time)
VALUES
('item-006', 'bom-comp-002', 'material', 'PART-006', '机箱外壳 ATX', 1, '个', 0, NOW()),
('item-007', 'bom-comp-002', 'material', 'PART-007', '电源 750W 金牌', 1, '个', 1, NOW()),
('item-008', 'bom-comp-002', 'material', 'PART-008', '散热风扇 120mm', 3, '个', 2, NOW());
```

## 9. 边界与约束

- BOM 最大层级深度：5 层
- 每个 BOM 节点的子节点数：不限
- 每个 BOM 节点的行项目数：不限
- 锁定后不可编辑（任何节点、任何行项目）
- 新版本通过复制创建，不可直接解锁
- 删除 BOM 节点时级联删除所有子节点及其行项目
