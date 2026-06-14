-- Planned Inbound (计划入库) Module
-- Creates sp_warehouse_receipt, sp_warehouse_receipt_item, sp_inventory tables,
-- seed data (电脑配件库 + 8 locations + RK20240817-00001 + 8 items), and menu entries.

-- ============ 1. 表结构 ============
CREATE TABLE IF NOT EXISTS sp_warehouse_receipt (
  id varchar(64) NOT NULL COMMENT '主键',
  receipt_code varchar(64) NOT NULL COMMENT '入库单号',
  source_type varchar(20) DEFAULT 'MANUAL' COMMENT '来源:MRP/MANUAL',
  plan_id varchar(64) DEFAULT NULL COMMENT '关联MRP计划ID(可空)',
  order_id varchar(64) DEFAULT NULL COMMENT '工单ID',
  order_code varchar(255) DEFAULT NULL COMMENT '工单编号',
  product_code varchar(50) DEFAULT NULL COMMENT '产品编码',
  product_desc varchar(200) DEFAULT NULL COMMENT '产品描述',
  receipt_status varchar(20) DEFAULT 'pending' COMMENT 'pending=待确认 partial=部分登账 completed=已完成',
  total_items int DEFAULT 0 COMMENT '明细总条数',
  posted_items int DEFAULT 0 COMMENT '已登账条数',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_receipt_code (receipt_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='入库单主表';

CREATE TABLE IF NOT EXISTS sp_warehouse_receipt_item (
  id varchar(64) NOT NULL COMMENT '主键',
  receipt_id varchar(64) NOT NULL COMMENT '关联入库单ID',
  material_code varchar(50) NOT NULL COMMENT '物料编码',
  material_desc varchar(200) DEFAULT NULL COMMENT '物料描述',
  unit varchar(20) DEFAULT NULL COMMENT '单位',
  quantity decimal(10,2) NOT NULL COMMENT '入库数量',
  warehouse_id varchar(64) DEFAULT NULL COMMENT '登账库房ID',
  warehouse_name varchar(64) DEFAULT NULL COMMENT '登账库房名称',
  location_id varchar(64) DEFAULT NULL COMMENT '登账库位ID',
  location_code varchar(32) DEFAULT NULL COMMENT '登账库位编码',
  post_status varchar(20) DEFAULT 'pending' COMMENT 'pending=待登账 posted=已登账',
  posted_at datetime DEFAULT NULL COMMENT '登账时间',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_receipt_id (receipt_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='入库单明细表';

CREATE TABLE IF NOT EXISTS sp_inventory (
  id varchar(64) NOT NULL COMMENT '主键',
  material_code varchar(50) NOT NULL COMMENT '物料编码',
  material_desc varchar(200) DEFAULT NULL COMMENT '物料描述',
  unit varchar(20) DEFAULT NULL COMMENT '单位',
  warehouse_id varchar(64) NOT NULL COMMENT '库房ID',
  warehouse_name varchar(64) DEFAULT NULL COMMENT '库房名称',
  location_id varchar(64) NOT NULL COMMENT '库位ID',
  location_code varchar(32) DEFAULT NULL COMMENT '库位编码',
  quantity decimal(10,2) DEFAULT 0 COMMENT '库存数量',
  status varchar(20) DEFAULT 'available' COMMENT 'available=可用',
  last_inbound_time datetime DEFAULT NULL COMMENT '最近入库时间',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_location (location_id),
  KEY idx_material (material_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='物料库存表(库位级)';

-- ============ 2. 种子：电脑配件库（零件库） ============
INSERT INTO sp_warehouse (id, code, name, type, `groups`, `rows`, `layers`, `columns`, descr, is_deleted, create_time, create_username, update_time, update_username)
SELECT 'wh-parts-001', 'WH-PARTS', '电脑配件库', '零件库', 1, 2, 2, 2, '台式电脑零件入库专用', '0', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_warehouse WHERE id = 'wh-parts-001' OR code = 'WH-PARTS');

-- ============ 3. 种子：8 个库位（1-RRLLCC 格式） ============
INSERT INTO sp_warehouse_location (id, warehouse_id, code, group_no, row_no, layer_no, col_no, is_deleted, create_time, create_username, update_time, update_username)
SELECT * FROM (
  SELECT 'loc-parts-01' AS id, 'wh-parts-001' AS warehouse_id, '1-010101' AS code, 1 AS group_no, 1 AS row_no, 1 AS layer_no, 1 AS col_no, '0' AS is_deleted, NOW() AS create_time, 'admin' AS create_username, NOW() AS update_time, 'admin' AS update_username
  UNION ALL SELECT 'loc-parts-02','wh-parts-001','1-010102',1,1,1,2,'0',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'loc-parts-03','wh-parts-001','1-010201',1,1,2,1,'0',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'loc-parts-04','wh-parts-001','1-010202',1,1,2,2,'0',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'loc-parts-05','wh-parts-001','1-020101',1,2,1,1,'0',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'loc-parts-06','wh-parts-001','1-020102',1,2,1,2,'0',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'loc-parts-07','wh-parts-001','1-020201',1,2,2,1,'0',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'loc-parts-08','wh-parts-001','1-020202',1,2,2,2,'0',NOW(),'admin',NOW(),'admin'
) t
WHERE NOT EXISTS (SELECT 1 FROM sp_warehouse_location WHERE warehouse_id = 'wh-parts-001');

-- ============ 4. 种子：入库单 RK20240817-00001（待确认） ============
INSERT INTO sp_warehouse_receipt (id, receipt_code, source_type, plan_id, order_id, order_code, product_code, product_desc, receipt_status, total_items, posted_items, create_time, create_username, update_time, update_username)
SELECT 'rcpt-20240817-001', 'RK20240817-00001', 'MANUAL', NULL, NULL, 'GD20240817-001', 'PROD-001', '台式电脑主机', 'pending', 8, 0, NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_warehouse_receipt WHERE receipt_code = 'RK20240817-00001');

-- ============ 5. 种子：8 条入库明细（PART-001~008，各 100） ============
INSERT INTO sp_warehouse_receipt_item (id, receipt_id, material_code, material_desc, unit, quantity, post_status, create_time, create_username, update_time, update_username)
SELECT * FROM (
  SELECT 'item-rcpt-01' AS id, 'rcpt-20240817-001' AS receipt_id, 'PART-001' AS material_code, 'CPU i7-13700K' AS material_desc, '个' AS unit, 100 AS quantity, 'pending' AS post_status, NOW() AS create_time, 'admin' AS create_username, NOW() AS update_time, 'admin' AS update_username
  UNION ALL SELECT 'item-rcpt-02','rcpt-20240817-001','PART-002','DDR5 32GB 内存','条',100,'pending',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'item-rcpt-03','rcpt-20240817-001','PART-003','SSD 1TB NVMe','个',100,'pending',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'item-rcpt-04','rcpt-20240817-001','PART-004','主板 Z790','个',100,'pending',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'item-rcpt-05','rcpt-20240817-001','PART-005','CPU散热器','个',100,'pending',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'item-rcpt-06','rcpt-20240817-001','PART-006','机箱外壳 ATX','个',100,'pending',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'item-rcpt-07','rcpt-20240817-001','PART-007','电源 750W 金牌','个',100,'pending',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'item-rcpt-08','rcpt-20240817-001','PART-008','散热风扇 120mm','个',100,'pending',NOW(),'admin',NOW(),'admin'
) t
WHERE NOT EXISTS (SELECT 1 FROM sp_warehouse_receipt_item WHERE receipt_id = 'rcpt-20240817-001');

-- ============ 6. 菜单：库存管理（一级）+ 计划入库确认 + 库存明细查询 ============
INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '18', 'inventory', '库存管理', '#', '0', '0', 8, '0', 'user:add', 'database', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '18');

INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '181', 'inventoryReceipt', '计划入库确认', '/inventory/receipt', '18', '3', 1, '0', 'inventory:inbound', 'flag', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '181');

INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '182', 'inventoryQuery', '库存明细查询', '/inventory/query', '18', '3', 2, '0', 'inventory:query', 'file-text', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '182');
