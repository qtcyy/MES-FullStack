-- Cycle 2b-1 菜单种子:设备定义 / 零部件定义 / 设备编组(统一挂在组 13 物料管理下)
-- 幂等 + 需手动执行。
--
-- 现状(实测 mes_data):
--   * device(设备定义, url=/basedata/device/list-ui)菜单尚不存在 → 由本种子真正插入 id=132,挂组 13。
--   * id=111 已存在 component 菜单(code=compDef, name=零部件定义, url=/basedata/component/list-ui),误挂在组 10(系统管理)下。
--   * id=108 已存在 device-group 菜单(code=deviceGroup, name=编组设备定义, url=/basedata/device-group/list-ui),误挂在组 10 下。
--   因 sp_sys_menu 的 UNIQUE(name)/UNIQUE(url) 约束,无法再插入 133/134(url/name 已被 111/108 占用),故移除其 INSERT。
--   改为对既有 108/111 行做 RE-PARENT(只改 parent_id → '13'),令三个 basedata 页面统一分组到 物料管理(13),侧边栏更整洁。
--   UPDATE 带 `parent_id <> '13'` 守卫,重复执行为 no-op;仅改 parent_id,不动 name/code/url/permission。

-- 1) 设备定义:真正新增(id 与 url 双守卫,避免任何潜在碰撞)
INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '132', 'deviceDef', '设备定义', '/basedata/device/list-ui', '13', '3', 2, '0', 'device:add', 'fa-desktop', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM sp_sys_menu
  WHERE id = '132' OR url = '/basedata/device/list-ui'
);

-- 2) 重挂既有的 零部件定义(111) / 设备编组(108) 到组 13;仅改 parent_id,幂等
UPDATE sp_sys_menu SET parent_id = '13' WHERE id IN ('108', '111') AND parent_id <> '13';
