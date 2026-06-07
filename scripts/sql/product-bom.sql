-- 产品 BOM 管理 - 数据库初始化脚本
-- Created: 2026-06-07

CREATE TABLE IF NOT EXISTS `sp_product_bom` (
  `id` varchar(32) NOT NULL,
  `bom_code` varchar(50) DEFAULT NULL COMMENT 'BOM编码',
  `product_code` varchar(50) DEFAULT NULL COMMENT '产品物料编码',
  `node_name` varchar(100) DEFAULT NULL COMMENT '节点名称',
  `parent_id` varchar(32) DEFAULT NULL COMMENT '父节点ID',
  `level` int DEFAULT 0 COMMENT '层级 0=产品 1=半成品 2=组件',
  `version` varchar(20) DEFAULT 'V1.0' COMMENT '版本号',
  `status` varchar(20) DEFAULT 'draft' COMMENT 'draft=草稿 locked=已锁定',
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

CREATE TABLE IF NOT EXISTS `sp_product_bom_item` (
  `id` varchar(32) NOT NULL,
  `bom_id` varchar(32) NOT NULL COMMENT '所属BOM节点ID',
  `item_type` varchar(20) DEFAULT 'material' COMMENT 'material=物料 bom_ref=BOM节点引用',
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

-- 演示物料（如不存在则插入）
INSERT IGNORE INTO sp_materile (id, materiel, materiel_desc, mat_type, unit, is_deleted, create_time)
VALUES
('mat-prod-001', 'PROD-001', '台式电脑主机', '产品', '台', '0', NOW()),
('mat-part-001', 'PART-001', 'CPU i7-13700K', '零件', '个', '0', NOW()),
('mat-part-002', 'PART-002', 'DDR5 32GB 内存', '零件', '条', '0', NOW()),
('mat-part-003', 'PART-003', 'SSD 1TB NVMe', '零件', '个', '0', NOW()),
('mat-part-004', 'PART-004', '主板 Z790', '零件', '个', '0', NOW()),
('mat-part-005', 'PART-005', 'CPU散热器', '零件', '个', '0', NOW()),
('mat-part-006', 'PART-006', '机箱外壳 ATX', '零件', '个', '0', NOW()),
('mat-part-007', 'PART-007', '电源 750W 金牌', '零件', '个', '0', NOW()),
('mat-part-008', 'PART-008', '散热风扇 120mm', '零件', '个', '0', NOW());

-- 演示 BOM 节点
INSERT IGNORE INTO sp_product_bom (id, bom_code, product_code, node_name, parent_id, level, version, status, remark, sort_order, create_time)
VALUES
('bom-root-001', 'PBOM-001', 'PROD-001', '台式电脑主机', NULL, 0, 'V1.0', 'draft', '台式电脑主机产品BOM，首批量产版本', 0, NOW()),
('bom-sub-001', 'PBOM-002', 'PROD-001', '台式电脑半成品', 'bom-root-001', 1, 'V1.0', 'draft', '台式电脑主机半成品组装单元，包含主板和机箱两个子组件', 0, NOW()),
('bom-comp-001', 'PBOM-003', 'PROD-001', '主板单元', 'bom-sub-001', 2, 'V1.0', 'draft', '包含CPU、内存、SSD、主板等核心计算部件', 0, NOW()),
('bom-comp-002', 'PBOM-004', 'PROD-001', '机箱单元', 'bom-sub-001', 2, 'V1.0', 'draft', '包含机箱、电源、散热风扇等外部设备', 1, NOW());

-- 演示 BOM 行项目
INSERT IGNORE INTO sp_product_bom_item (id, bom_id, item_type, material_code, material_desc, quantity, unit, sort_order, create_time)
VALUES
('item-001', 'bom-comp-001', 'material', 'PART-001', 'CPU i7-13700K', 1, '个', 0, NOW()),
('item-002', 'bom-comp-001', 'material', 'PART-002', 'DDR5 32GB 内存', 2, '条', 1, NOW()),
('item-003', 'bom-comp-001', 'material', 'PART-003', 'SSD 1TB NVMe', 1, '个', 2, NOW()),
('item-004', 'bom-comp-001', 'material', 'PART-004', '主板 Z790', 1, '个', 3, NOW()),
('item-005', 'bom-comp-001', 'material', 'PART-005', 'CPU散热器', 1, '个', 4, NOW()),
('item-006', 'bom-comp-002', 'material', 'PART-006', '机箱外壳 ATX', 1, '个', 0, NOW()),
('item-007', 'bom-comp-002', 'material', 'PART-007', '电源 750W 金牌', 1, '个', 1, NOW()),
('item-008', 'bom-comp-002', 'material', 'PART-008', '散热风扇 120mm', 3, '个', 2, NOW());

-- 菜单权限
INSERT IGNORE INTO sys_menu (id, title, name, parent_id, type, permission, icon, sort, create_time)
VALUES ('112', '产品BOM管理', '/technology/product-bom', '5', '1', 'product-bom:list', 'fa fa-cubes', 8, NOW());

INSERT IGNORE INTO sys_menu (id, title, name, parent_id, type, permission, sort, create_time)
VALUES
('1121', '新增BOM', '', '112', '2', 'product-bom:add', 1, NOW()),
('1122', '编辑BOM', '', '112', '2', 'product-bom:edit', 2, NOW()),
('1123', '删除BOM', '', '112', '2', 'product-bom:delete', 3, NOW()),
('1124', '锁定BOM', '', '112', '2', 'product-bom:lock', 4, NOW());
