-- Kitting Outbound (配套出库) Module
-- Creates sp_outbound_order, sp_outbound_order_item; seeds 2 outbound orders + 8 items
-- + inventory for PART-002~008; and menu entries 183/184.

-- ============ 1. 表结构 ============
CREATE TABLE IF NOT EXISTS sp_outbound_order (
  id varchar(64) NOT NULL COMMENT '主键',
  outbound_code varchar(64) NOT NULL COMMENT '出库单号',
  order_id varchar(64) DEFAULT NULL COMMENT '工单ID',
  order_code varchar(255) DEFAULT NULL COMMENT '工单编号',
  product_code varchar(50) DEFAULT NULL COMMENT '产品编码',
  product_desc varchar(200) DEFAULT NULL COMMENT '产品描述',
  outbound_status varchar(20) DEFAULT 'pending' COMMENT 'pending=待确认 partial=部分出库 completed=已完成',
  total_items int DEFAULT 0 COMMENT '明细总条数',
  posted_items int DEFAULT 0 COMMENT '已登账条数',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_outbound_code (outbound_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='出库单主表';

CREATE TABLE IF NOT EXISTS sp_outbound_order_item (
  id varchar(64) NOT NULL COMMENT '主键',
  outbound_id varchar(64) NOT NULL COMMENT '关联出库单ID',
  material_code varchar(50) NOT NULL COMMENT '物料编码',
  material_desc varchar(200) DEFAULT NULL COMMENT '物料描述',
  unit varchar(20) DEFAULT NULL COMMENT '单位',
  quantity decimal(10,2) NOT NULL COMMENT '需出库数量',
  post_status varchar(20) DEFAULT 'pending' COMMENT 'pending=待登账 posted=已登账',
  allocation_detail varchar(500) DEFAULT NULL COMMENT 'FIFO扣减库位摘要',
  posted_at datetime DEFAULT NULL COMMENT '登账时间',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_outbound_id (outbound_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='出库单明细表';

-- ============ 2. 种子：2 个出库单（待确认） ============
INSERT INTO sp_outbound_order (id, outbound_code, order_id, order_code, product_code, product_desc, outbound_status, total_items, posted_items, create_time, create_username, update_time, update_username)
SELECT 'ob-20240817-001', 'CK20240817-00001', NULL, 'GD20240817-001', 'PROD-001', '台式电脑主机', 'pending', 4, 0, NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_outbound_order WHERE outbound_code = 'CK20240817-00001');

INSERT INTO sp_outbound_order (id, outbound_code, order_id, order_code, product_code, product_desc, outbound_status, total_items, posted_items, create_time, create_username, update_time, update_username)
SELECT 'ob-20240817-002', 'CK20240817-00002', NULL, 'GD20240817-001', 'PROD-001', '台式电脑主机', 'pending', 4, 0, NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_outbound_order WHERE outbound_code = 'CK20240817-00002');

-- ============ 3. 种子：出库单明细（批1=PART-001~004，批2=PART-005~008，各 50） ============
INSERT INTO sp_outbound_order_item (id, outbound_id, material_code, material_desc, unit, quantity, post_status, create_time, create_username, update_time, update_username)
SELECT * FROM (
  SELECT 'obi-001-1' AS id, 'ob-20240817-001' AS outbound_id, 'PART-001' AS material_code, 'CPU i7-13700K' AS material_desc, '个' AS unit, 50 AS quantity, 'pending' AS post_status, NOW() AS create_time, 'admin' AS create_username, NOW() AS update_time, 'admin' AS update_username
  UNION ALL SELECT 'obi-001-2','ob-20240817-001','PART-002','DDR5 32GB 内存','条',50,'pending',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'obi-001-3','ob-20240817-001','PART-003','SSD 1TB NVMe','个',50,'pending',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'obi-001-4','ob-20240817-001','PART-004','主板 Z790','个',50,'pending',NOW(),'admin',NOW(),'admin'
) t
WHERE NOT EXISTS (SELECT 1 FROM sp_outbound_order_item WHERE outbound_id = 'ob-20240817-001');

INSERT INTO sp_outbound_order_item (id, outbound_id, material_code, material_desc, unit, quantity, post_status, create_time, create_username, update_time, update_username)
SELECT * FROM (
  SELECT 'obi-002-1' AS id, 'ob-20240817-002' AS outbound_id, 'PART-005' AS material_code, 'CPU散热器' AS material_desc, '个' AS unit, 50 AS quantity, 'pending' AS post_status, NOW() AS create_time, 'admin' AS create_username, NOW() AS update_time, 'admin' AS update_username
  UNION ALL SELECT 'obi-002-2','ob-20240817-002','PART-006','机箱外壳 ATX','个',50,'pending',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'obi-002-3','ob-20240817-002','PART-007','电源 750W 金牌','个',50,'pending',NOW(),'admin',NOW(),'admin'
  UNION ALL SELECT 'obi-002-4','ob-20240817-002','PART-008','散热风扇 120mm','个',50,'pending',NOW(),'admin',NOW(),'admin'
) t
WHERE NOT EXISTS (SELECT 1 FROM sp_outbound_order_item WHERE outbound_id = 'ob-20240817-002');

-- ============ 4. 种子：库存 PART-002~008（各 100，到 7 个空闲库位；按 material_code 幂等守卫） ============
-- PART-001 已有库存(用户测试入库)，不在此预置。
INSERT INTO sp_inventory (id, material_code, material_desc, unit, warehouse_id, warehouse_name, location_id, location_code, quantity, status, last_inbound_time, create_time, create_username, update_time, update_username)
SELECT 'inv-seed-02','PART-002','DDR5 32GB 内存','条','wh-parts-001','电脑配件库','loc-parts-01','1-010101',100,'available',NOW(),NOW(),'admin',NOW(),'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_inventory WHERE material_code='PART-002')
  AND NOT EXISTS (SELECT 1 FROM sp_inventory WHERE location_id='loc-parts-01');

INSERT INTO sp_inventory (id, material_code, material_desc, unit, warehouse_id, warehouse_name, location_id, location_code, quantity, status, last_inbound_time, create_time, create_username, update_time, update_username)
SELECT 'inv-seed-03','PART-003','SSD 1TB NVMe','个','wh-parts-001','电脑配件库','loc-parts-03','1-010201',100,'available',NOW(),NOW(),'admin',NOW(),'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_inventory WHERE material_code='PART-003')
  AND NOT EXISTS (SELECT 1 FROM sp_inventory WHERE location_id='loc-parts-03');

INSERT INTO sp_inventory (id, material_code, material_desc, unit, warehouse_id, warehouse_name, location_id, location_code, quantity, status, last_inbound_time, create_time, create_username, update_time, update_username)
SELECT 'inv-seed-04','PART-004','主板 Z790','个','wh-parts-001','电脑配件库','loc-parts-04','1-010202',100,'available',NOW(),NOW(),'admin',NOW(),'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_inventory WHERE material_code='PART-004')
  AND NOT EXISTS (SELECT 1 FROM sp_inventory WHERE location_id='loc-parts-04');

INSERT INTO sp_inventory (id, material_code, material_desc, unit, warehouse_id, warehouse_name, location_id, location_code, quantity, status, last_inbound_time, create_time, create_username, update_time, update_username)
SELECT 'inv-seed-05','PART-005','CPU散热器','个','wh-parts-001','电脑配件库','loc-parts-05','1-020101',100,'available',NOW(),NOW(),'admin',NOW(),'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_inventory WHERE material_code='PART-005')
  AND NOT EXISTS (SELECT 1 FROM sp_inventory WHERE location_id='loc-parts-05');

INSERT INTO sp_inventory (id, material_code, material_desc, unit, warehouse_id, warehouse_name, location_id, location_code, quantity, status, last_inbound_time, create_time, create_username, update_time, update_username)
SELECT 'inv-seed-06','PART-006','机箱外壳 ATX','个','wh-parts-001','电脑配件库','loc-parts-06','1-020102',100,'available',NOW(),NOW(),'admin',NOW(),'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_inventory WHERE material_code='PART-006')
  AND NOT EXISTS (SELECT 1 FROM sp_inventory WHERE location_id='loc-parts-06');

INSERT INTO sp_inventory (id, material_code, material_desc, unit, warehouse_id, warehouse_name, location_id, location_code, quantity, status, last_inbound_time, create_time, create_username, update_time, update_username)
SELECT 'inv-seed-07','PART-007','电源 750W 金牌','个','wh-parts-001','电脑配件库','loc-parts-07','1-020201',100,'available',NOW(),NOW(),'admin',NOW(),'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_inventory WHERE material_code='PART-007')
  AND NOT EXISTS (SELECT 1 FROM sp_inventory WHERE location_id='loc-parts-07');

INSERT INTO sp_inventory (id, material_code, material_desc, unit, warehouse_id, warehouse_name, location_id, location_code, quantity, status, last_inbound_time, create_time, create_username, update_time, update_username)
SELECT 'inv-seed-08','PART-008','散热风扇 120mm','个','wh-parts-001','电脑配件库','loc-parts-08','1-020202',100,'available',NOW(),NOW(),'admin',NOW(),'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_inventory WHERE material_code='PART-008')
  AND NOT EXISTS (SELECT 1 FROM sp_inventory WHERE location_id='loc-parts-08');

-- ============ 5. 菜单：配套出库确认 + 手动入库（父 id=18 库存管理） ============
INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '183', 'outboundConfirm', '配套出库确认', '/inventory/outbound', '18', '3', 3, '0', 'inventory:outbound', 'deployment-unit', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '183');

INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '184', 'manualInbound', '手动入库', '/inventory/manual-inbound', '18', '3', 4, '0', 'inventory:inbound', 'gold', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '184');
