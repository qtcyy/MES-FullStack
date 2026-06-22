-- Cycle 2b-1 菜单种子:设备定义 / 零部件定义 / 设备编组(挂在组 13 物料管理下)
-- 幂等:NOT EXISTS 守卫(同时守 id / code / name / url,避开 sp_sys_menu 的 UNIQUE(name)、UNIQUE(code) 约束);需手动执行
--
-- 注意(实测 mes_data 现状):
--   * id=111 已存在 component 菜单(code=compDef, name=零部件定义, url=/basedata/component/list-ui),挂在组 10(系统管理)下;
--   * id=108 已存在 device-group 菜单(code=deviceGroup, name=编组设备定义, url=/basedata/device-group/list-ui),挂在组 10 下;
--   * device(设备定义)菜单尚不存在。
--   因 url/name 的 UNIQUE 约束,133/134 的插入在现状库会被守卫跳过(沿用既有 111/108 行);
--   仅 132(设备定义)会真正写入。urlMap/路由对两种来源的 url 均生效,可达性不受影响。
--   如需将 111/108 改挂到组 13,请另行人工 UPDATE parent_id(本种子不动既有行)。

INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '132', 'deviceDef', '设备定义', '/basedata/device/list-ui', '13', '3', 2, '0', 'device:add', 'fa-desktop', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM sp_sys_menu
  WHERE id = '132' OR code = 'deviceDef' OR name = '设备定义' OR url = '/basedata/device/list-ui'
);

INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '133', 'componentDef', '零部件定义', '/basedata/component/list-ui', '13', '3', 3, '0', 'component:add', 'fa-puzzle-piece', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM sp_sys_menu
  WHERE id = '133' OR code = 'componentDef' OR name = '零部件定义' OR url = '/basedata/component/list-ui'
);

INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '134', 'deviceGroupDef', '设备编组', '/basedata/device-group/list-ui', '13', '3', 4, '0', 'device:add', 'fa-cogs', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM sp_sys_menu
  WHERE id = '134' OR code = 'deviceGroupDef' OR name = '设备编组' OR url = '/basedata/device-group/list-ui'
);
