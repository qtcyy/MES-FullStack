-- ============================================================
-- Role Management Enhancement Migration
--
-- 1. Add is_system column to sp_sys_role
-- 2. Insert 7 preset roles (system roles)
-- 3. Assign role-menu mappings for each preset role
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- 1. Add is_system column to sp_sys_role
-- ----------------------------
ALTER TABLE sp_sys_role ADD COLUMN is_system varchar(1) DEFAULT '0'
  COMMENT '系统角色 0-否 1-是';

-- ----------------------------
-- 2. Insert 7 preset roles
-- ----------------------------
INSERT INTO sp_sys_role (id, name, code, descr, is_deleted, is_system, create_time, create_username, update_time, update_username)
VALUES
(REPLACE(UUID(), '-', ''), '数据员', 'data_clerk', '享有基础数据中心权限', '0', '1', NOW(), 'admin', NOW(), 'admin'),
(REPLACE(UUID(), '-', ''), '工艺员', 'process_tech', '享有工艺管理权限', '0', '1', NOW(), 'admin', NOW(), 'admin'),
(REPLACE(UUID(), '-', ''), '生产计划员', 'prod_planner', '享有计划管理权限', '0', '1', NOW(), 'admin', NOW(), 'admin'),
(REPLACE(UUID(), '-', ''), '生产主管', 'prod_supervisor', '享有生产管理相关权限', '0', '1', NOW(), 'admin', NOW(), 'admin'),
(REPLACE(UUID(), '-', ''), '生产作业员', 'prod_operator', '享有在制品管理权限', '0', '1', NOW(), 'admin', NOW(), 'admin'),
(REPLACE(UUID(), '-', ''), '库房管理员', 'warehouse_mgr', '享有物料管理权限', '0', '1', NOW(), 'admin', NOW(), 'admin'),
(REPLACE(UUID(), '-', ''), '质量管理员', 'quality_mgr', '享有质量相关管理权限', '0', '1', NOW(), 'admin', NOW(), 'admin');

-- ----------------------------
-- 3. Insert role-menu assignments
-- ----------------------------

-- 数据员: menu_ids 105 (基础数据配置平台), 106 (基础数据维护)
INSERT INTO sp_sys_role_menu (id, role_id, menu_id, create_time, create_username, update_time, update_username)
SELECT REPLACE(UUID(), '-', ''), r.id, m.id, NOW(), 'admin', NOW(), 'admin'
FROM sp_sys_role r, (SELECT '105' AS id UNION SELECT '106') m
WHERE r.code = 'data_clerk' AND r.is_system = '1';

-- 工艺员: menu_ids 15 (工艺管理), 151 (工艺路线管理), 152 (工艺BOM管理)
INSERT INTO sp_sys_role_menu (id, role_id, menu_id, create_time, create_username, update_time, update_username)
SELECT REPLACE(UUID(), '-', ''), r.id, m.id, NOW(), 'admin', NOW(), 'admin'
FROM sp_sys_role r, (SELECT '15' AS id UNION SELECT '151' UNION SELECT '152') m
WHERE r.code = 'process_tech' AND r.is_system = '1';

-- 生产计划员: menu_ids 12 (计划管理), 121 (工单下达)
INSERT INTO sp_sys_role_menu (id, role_id, menu_id, create_time, create_username, update_time, update_username)
SELECT REPLACE(UUID(), '-', ''), r.id, m.id, NOW(), 'admin', NOW(), 'admin'
FROM sp_sys_role r, (SELECT '12' AS id UNION SELECT '121') m
WHERE r.code = 'prod_planner' AND r.is_system = '1';

-- 生产主管: menu_ids 12 (计划管理), 121 (工单下达), 16 (在制品管理), 161 (SN通用过程采集), 14 (数字化平台), 141 (智慧大屏)
INSERT INTO sp_sys_role_menu (id, role_id, menu_id, create_time, create_username, update_time, update_username)
SELECT REPLACE(UUID(), '-', ''), r.id, m.id, NOW(), 'admin', NOW(), 'admin'
FROM sp_sys_role r, (SELECT '12' AS id UNION SELECT '121' UNION SELECT '16' UNION SELECT '161' UNION SELECT '14' UNION SELECT '141') m
WHERE r.code = 'prod_supervisor' AND r.is_system = '1';

-- 生产作业员: menu_ids 16 (在制品管理), 161 (SN通用过程采集)
INSERT INTO sp_sys_role_menu (id, role_id, menu_id, create_time, create_username, update_time, update_username)
SELECT REPLACE(UUID(), '-', ''), r.id, m.id, NOW(), 'admin', NOW(), 'admin'
FROM sp_sys_role r, (SELECT '16' AS id UNION SELECT '161') m
WHERE r.code = 'prod_operator' AND r.is_system = '1';

-- 库房管理员: menu_ids 13 (物料管理), 131 (物料维护)
INSERT INTO sp_sys_role_menu (id, role_id, menu_id, create_time, create_username, update_time, update_username)
SELECT REPLACE(UUID(), '-', ''), r.id, m.id, NOW(), 'admin', NOW(), 'admin'
FROM sp_sys_role r, (SELECT '13' AS id UNION SELECT '131') m
WHERE r.code = 'warehouse_mgr' AND r.is_system = '1';

-- 质量管理员: menu_ids 105 (基础数据配置平台), 106 (基础数据维护), 16 (在制品管理), 161 (SN通用过程采集)
INSERT INTO sp_sys_role_menu (id, role_id, menu_id, create_time, create_username, update_time, update_username)
SELECT REPLACE(UUID(), '-', ''), r.id, m.id, NOW(), 'admin', NOW(), 'admin'
FROM sp_sys_role r, (SELECT '105' AS id UNION SELECT '106' UNION SELECT '16' UNION SELECT '161') m
WHERE r.code = 'quality_mgr' AND r.is_system = '1';

SET FOREIGN_KEY_CHECKS = 1;
