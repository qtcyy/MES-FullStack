-- ============================================================
-- 字典管理菜单种子(Cycle 1a 系统管理)
-- 基础种子 MySQL-20210225.sql 的 sp_sys_menu 缺「字典管理」一行,
-- 导致 Vue3 前端字典页(/system/dict)无法从菜单驱动的侧栏点到。
-- 本脚本幂等补一行:系统管理组(parent_id=10)下,id=108。
--
-- id 选 108:基础种子里 101~106 已占(菜单/用户/角色/部门/基础数据配置/基础数据维护),
-- 107 被班组管理种子占用,故取 108 避免主键冲突;name/code 亦全库唯一(name/code 有唯一索引)。
-- 需手动执行本脚本字典菜单才会出现;执行后请重新登录以重建前端权限集(含 dict:add)。
-- 列序严格对齐 sp_sys_menu DDL(15 列)。
-- ============================================================

INSERT INTO `sp_sys_menu`
  (`id`, `code`, `name`, `url`, `parent_id`, `grade`, `sort_num`, `type`,
   `permission`, `icon`, `descr`, `create_time`, `create_username`, `update_time`, `update_username`)
VALUES
  ('108', 'dict', '字典管理', '/admin/sys/dict/list-ui', '10', '3', 7, '0',
   'dict:add', 'book', '', '2026-06-20 00:00:00', 'admin', '2026-06-20 00:00:00', 'admin')
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `url` = VALUES(`url`),
  `parent_id` = VALUES(`parent_id`),
  `permission` = VALUES(`permission`),
  `icon` = VALUES(`icon`);
