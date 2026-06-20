-- 子周期 1c-2:产品BOM 菜单(挂在「工艺管理」15 下,与 151 工艺路线管理同级)
-- 注:152「工艺BOM管理」是旧扁平 SpBom,vue3 不实现,本菜单用新 id 154。
-- 幂等执行:删除同 id 再插入
DELETE FROM `sp_sys_menu` WHERE `id` = '154';
INSERT INTO `sp_sys_menu`
  (`id`, `code`, `name`, `url`, `parent_id`, `grade`, `sort_num`, `type`, `permission`, `icon`, `descr`, `create_time`, `create_username`, `update_time`, `update_username`)
VALUES
  ('154', 'productBom', '产品BOM管理', '/technology/product-bom/list-ui', '15', '3', 4, '0', 'product-bom:add', 'files', '', NOW(), 'admin', NOW(), 'admin');
