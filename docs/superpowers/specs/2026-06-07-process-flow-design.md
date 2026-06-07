# 工艺流程管理 — 设计文档

**日期**: 2026-06-07
**状态**: 已确认

## 1. 概述

新增"工艺流程管理"模块，为产品 BOM 的每个组件节点绑定工艺路线（Flow），每个 Flow 包含顺序排列的工序（Oper）。完成绑定后锁定产品工艺。

### 数据关联：BOM 节点 → Flow → Oper

## 2. 数据库

### 2.1 新建 sp_bom_flow

```sql
CREATE TABLE `sp_bom_flow` (
  `id` varchar(32) NOT NULL,
  `bom_id` varchar(32) NOT NULL COMMENT 'BOM节点ID',
  `flow_id` varchar(32) NOT NULL COMMENT '工艺路线ID',
  `status` varchar(20) DEFAULT 'draft' COMMENT 'draft/locked',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注（工序步骤描述）',
  `sort_order` int DEFAULT 0 COMMENT '排序',
  `create_time` datetime DEFAULT NULL,
  `create_username` varchar(50) DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `update_username` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_bom_id` (`bom_id`),
  KEY `idx_flow_id` (`flow_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2.2 现有关联表

- `sp_product_bom` — BOM 节点（已有）
- `sp_flow` — 工艺路线头表（已有）
- `sp_flow_oper_relation` — 流程-工序链（已有）
- `sp_oper` — 工序定义（已有）

## 3. 后端

### 3.1 新增文件

| 文件 | 说明 |
|------|------|
| `entity/SpBomFlow.java` | BOM-Flow 关联实体 |
| `mapper/SpBomFlowMapper.java` | Mapper |
| `service/ISpBomFlowService.java` | Service 接口 |
| `service/impl/SpBomFlowServiceImpl.java` | Service 实现 |
| `controller/SpBomFlowController.java` | Controller |

### 3.2 API

路径：`/technology/bom-flow`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/list/{productBomRootId}` | 获取产品下所有 BOM 节点的 Flow 绑定 |
| POST | `/bind` | 为 BOM 节点绑定 Flow @RequestBody |
| POST | `/unbind` | 解除 BOM-Flow 绑定 |
| POST | `/lock/{productBomRootId}` | 锁定产品所有 BOM 节点的 Flow |
| POST | `/update-remark` | 更新备注 |

## 4. 前端

### 4.1 文件

- 新建：`ProcessFlowPage.tsx` — 工艺流程管理主页
- 新建：`api/technology/bom-flow.ts` — API 调用

### 4.2 页面交互

**工艺流程管理页**：
1. 选择产品：下拉选择产品 BOM（已有 `sp_product_bom` 根节点）
2. 展示 BOM 树，每个节点显示：
   - 节点名称 + 层级
   - 已绑定的 Flow 信息（flow code + flow desc）
   - 已绑定的工序列表（oper_code 序列）
   - 备注（工序步骤说明）
3. 操作列：编辑工艺规划 → 打开编辑弹窗
4. 编辑弹窗：复用 FlowProcessForm 的工序选择逻辑
5. 锁定按钮：锁定整个产品的工艺流程

### 4.3 路由

`/technology/process-flow` → `ProcessFlowPage`

## 5. 菜单权限

- 菜单名称：工艺流程管理
- 路径：`/technology/process-flow`
- 权限：`process-flow:list`

## 6. 演示数据

- 主板单元 → Flow: "主板装配工艺" → OPR-001
- 机箱单元 → Flow: "机箱装配工艺" → OPR-002
- 台式电脑半成品 → Flow: "主机装配工艺" → OPR-001, OPR-002
