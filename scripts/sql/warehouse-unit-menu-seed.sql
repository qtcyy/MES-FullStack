-- Cycle 2b-2 菜单种子:仓库管理 / 加工单元(统一挂在组 13 物料管理下)
-- 幂等 + 需手动执行。id/url/name 三守卫,避免 UNIQUE(name)/UNIQUE(url) 碰撞。
-- 实现前请实测 mes_data:若菜单已存在(url/name 被占),改为 RE-PARENT 既有行而非 INSERT。

-- 1) 仓库管理:url/id 双守卫新增(id=133,若被占用请实现时换号)
INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '133', 'warehouseDef', '仓库管理', '/basedata/warehouse/list-ui', '13', '3', 3, '0', 'warehouse:add', 'fa-database', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM sp_sys_menu WHERE id = '133' OR url = '/basedata/warehouse/list-ui'
);

-- 2) 加工单元:url/id 双守卫新增(id=134,若被占用请实现时换号)
INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '134', 'processUnitDef', '加工单元', '/basedata/process-unit/list-ui', '13', '3', 4, '0', 'process-unit:add', 'fa-cogs', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM sp_sys_menu WHERE id = '134' OR url = '/basedata/process-unit/list-ui'
);

-- 3) 若上述菜单已存在但错挂他组,统一重挂到组 13(仅改 parent_id,幂等)
UPDATE sp_sys_menu SET parent_id = '13'
WHERE url IN ('/basedata/warehouse/list-ui', '/basedata/process-unit/list-ui') AND parent_id <> '13';
