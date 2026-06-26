-- 子周期 1c-3:BOM工艺绑定 菜单(挂在「工艺管理」15 下,与 151/153/154 同级)
-- 幂等执行:删除同 id 再插入
DELETE FROM `sp_sys_menu` WHERE `id` = '155';
INSERT INTO `sp_sys_menu`
  (`id`, `code`, `name`, `url`, `parent_id`, `grade`, `sort_num`, `type`, `permission`, `icon`, `descr`, `create_time`, `create_username`, `update_time`, `update_username`)
VALUES
  ('155', 'bomFlow', 'BOM工艺绑定', '/technology/bom-flow/list-ui', '15', '3', 5, '0', 'bom-flow:add', 'link', '', NOW(), 'admin', NOW(), 'admin');
