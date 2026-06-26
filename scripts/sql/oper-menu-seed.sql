-- 子周期 1c-1:工序定义菜单(挂在「工艺管理」15 下,与 151 工艺路线管理同级)
-- 幂等执行:删除同 id 再插入
DELETE FROM `sp_sys_menu` WHERE `id` = '153';
INSERT INTO `sp_sys_menu`
  (`id`, `code`, `name`, `url`, `parent_id`, `grade`, `sort_num`, `type`, `permission`, `icon`, `descr`, `create_time`, `create_username`, `update_time`, `update_username`)
VALUES
  ('153', 'operDefine', '工序定义', '/basedata/sp-oper/list-ui', '15', '3', 3, '0', 'oper:add', 'set-up', '', NOW(), 'admin', NOW(), 'admin');
