-- 周期2g 生产甘特图 迁移(幂等)
-- 前提: dispatch-management.sql 已执行(sp_order_dispatch 表存在),否则 ALTER 会失败。
-- 1) sp_order_dispatch 加 oper_id / progress(列存在则跳过)
SET @col_oper := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='sp_order_dispatch' AND COLUMN_NAME='oper_id');
SET @sql := IF(@col_oper=0,
  'ALTER TABLE sp_order_dispatch ADD COLUMN oper_id varchar(64) NULL COMMENT ''工序ID(关联sp_oper);订单级派工时为空''',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col_prog := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='sp_order_dispatch' AND COLUMN_NAME='progress');
SET @sql := IF(@col_prog=0,
  'ALTER TABLE sp_order_dispatch ADD COLUMN progress int NULL COMMENT ''完工进度0-100''',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- 2) 菜单: 计划管理(12) 下新增 生产甘特图(幂等)
DELETE FROM sp_sys_menu WHERE id='123';
INSERT INTO sp_sys_menu
  (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr,
   create_time, create_username, update_time, update_username)
VALUES
  ('123','orderGantt','生产甘特图','/order/gantt','12','3',3,'0','order:gantt','schedule','',
   '2026-06-17 00:00:00','admin','2026-06-17 00:00:00','admin');
