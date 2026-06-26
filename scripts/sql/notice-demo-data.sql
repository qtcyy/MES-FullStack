-- ============================================================
-- 通知中心 演示数据 (可选, 幂等)
-- 依赖: 先执行 scripts/sql/notice-center.sql 建表+菜单。
-- 用 INSERT...SELECT 把通知扇出给库内全部未删用户, 不写死 user_id。
-- 幂等: 先删除所有 demo- 前缀的行再插入, 可重复执行。
-- 执行: /usr/local/mysql/bin/mysql -uroot -p12345678 mes_data < scripts/sql/notice-demo-data.sql
-- ============================================================

-- 清理旧 demo 数据
DELETE FROM `sp_sys_notice_user` WHERE `notice_id` LIKE 'demo-notice-%';
DELETE FROM `sp_sys_notice` WHERE `id` LIKE 'demo-notice-%';

-- ── 1) 全员 · 系统公告(info) ────────────────────────────────
INSERT INTO `sp_sys_notice`
  (`id`,`title`,`content`,`type`,`target_type`,`target_ids`,`target_desc`,`sender`,`status`,`recipient_count`,`is_deleted`,`create_time`,`create_username`,`update_time`,`update_username`)
VALUES
  ('demo-notice-1','章鱼师兄 MES 通知中心上线',
   '通知中心已正式上线。今后系统公告、停机维护、生产异常等消息都会通过此处推送。点击右上角铃铛可随时查看未读通知。',
   'info','all','','全体用户','admin','1',
   (SELECT COUNT(*) FROM `sp_sys_user` WHERE `is_deleted`!='1'),
   '0', NOW() - INTERVAL 6 HOUR,'admin', NOW() - INTERVAL 6 HOUR,'admin');

INSERT INTO `sp_sys_notice_user`
  (`id`,`notice_id`,`user_id`,`is_read`,`read_time`,`is_deleted`,`create_time`,`create_username`,`update_time`,`update_username`)
SELECT CONCAT('demo-nu-1-',u.`id`),'demo-notice-1',u.`id`,'0',NULL,'0',
       NOW() - INTERVAL 6 HOUR,'admin', NOW() - INTERVAL 6 HOUR,'admin'
FROM `sp_sys_user` u WHERE u.`is_deleted`!='1';

-- ── 2) 全员 · 计划停机维护(warning) ─────────────────────────
INSERT INTO `sp_sys_notice`
  (`id`,`title`,`content`,`type`,`target_type`,`target_ids`,`target_desc`,`sender`,`status`,`recipient_count`,`is_deleted`,`create_time`,`create_username`,`update_time`,`update_username`)
VALUES
  ('demo-notice-2','【维护】本周六 22:00 系统停机升级',
   '为升级 MRP 排产模块，系统将于本周六 22:00-23:30 停机维护，期间请勿提交生产订单。给您带来不便敬请谅解。',
   'warning','all','','全体用户','admin','1',
   (SELECT COUNT(*) FROM `sp_sys_user` WHERE `is_deleted`!='1'),
   '0', NOW() - INTERVAL 3 HOUR,'admin', NOW() - INTERVAL 3 HOUR,'admin');

INSERT INTO `sp_sys_notice_user`
  (`id`,`notice_id`,`user_id`,`is_read`,`read_time`,`is_deleted`,`create_time`,`create_username`,`update_time`,`update_username`)
SELECT CONCAT('demo-nu-2-',u.`id`),'demo-notice-2',u.`id`,'0',NULL,'0',
       NOW() - INTERVAL 3 HOUR,'admin', NOW() - INTERVAL 3 HOUR,'admin'
FROM `sp_sys_user` u WHERE u.`is_deleted`!='1';

-- ── 3) 全员 · 产量达标(success) ─────────────────────────────
INSERT INTO `sp_sys_notice`
  (`id`,`title`,`content`,`type`,`target_type`,`target_ids`,`target_desc`,`sender`,`status`,`recipient_count`,`is_deleted`,`create_time`,`create_username`,`update_time`,`update_username`)
VALUES
  ('demo-notice-3','本月产量已达成目标 102%',
   '截至今日，本月台式电脑主机累计产出 5,100 台，达成月度目标的 102%。感谢各产线同仁的努力！',
   'success','all','','全体用户','admin','1',
   (SELECT COUNT(*) FROM `sp_sys_user` WHERE `is_deleted`!='1'),
   '0', NOW() - INTERVAL 90 MINUTE,'admin', NOW() - INTERVAL 90 MINUTE,'admin');

INSERT INTO `sp_sys_notice_user`
  (`id`,`notice_id`,`user_id`,`is_read`,`read_time`,`is_deleted`,`create_time`,`create_username`,`update_time`,`update_username`)
SELECT CONCAT('demo-nu-3-',u.`id`),'demo-notice-3',u.`id`,'0',NULL,'0',
       NOW() - INTERVAL 90 MINUTE,'admin', NOW() - INTERVAL 90 MINUTE,'admin'
FROM `sp_sys_user` u WHERE u.`is_deleted`!='1';

-- ── 4) 角色定向 · 管理员(error) ─────────────────────────────
INSERT INTO `sp_sys_notice`
  (`id`,`title`,`content`,`type`,`target_type`,`target_ids`,`target_desc`,`sender`,`status`,`recipient_count`,`is_deleted`,`create_time`,`create_username`,`update_time`,`update_username`)
VALUES
  ('demo-notice-4','【管理员】检测到 3 次异常登录',
   '安全模块检测到今日有 3 次来自异地 IP 的登录失败，请管理员尽快核查账号安全并视情况重置密码。',
   'error','role','1185025876737396738','指定角色(管理员)','admin','1',
   (SELECT COUNT(DISTINCT ur.`user_id`) FROM `sp_sys_user_role` ur WHERE ur.`role_id`='1185025876737396738'),
   '0', NOW() - INTERVAL 40 MINUTE,'admin', NOW() - INTERVAL 40 MINUTE,'admin');

INSERT INTO `sp_sys_notice_user`
  (`id`,`notice_id`,`user_id`,`is_read`,`read_time`,`is_deleted`,`create_time`,`create_username`,`update_time`,`update_username`)
SELECT CONCAT('demo-nu-4-',ur.`user_id`),'demo-notice-4',ur.`user_id`,'0',NULL,'0',
       NOW() - INTERVAL 40 MINUTE,'admin', NOW() - INTERVAL 40 MINUTE,'admin'
FROM (SELECT DISTINCT `user_id` FROM `sp_sys_user_role` WHERE `role_id`='1185025876737396738') ur;

-- ── 5) 指定用户 · 工艺补充(info) ────────────────────────────
--    发给除 admin 外的前两个用户(演示"指定用户"目标)
INSERT INTO `sp_sys_notice`
  (`id`,`title`,`content`,`type`,`target_type`,`target_ids`,`target_desc`,`sender`,`status`,`recipient_count`,`is_deleted`,`create_time`,`create_username`,`update_time`,`update_username`)
VALUES
  ('demo-notice-5','请补充 BOM 工艺参数',
   '您负责的"台式电脑主机"BOM 缺少贴片工序的节拍参数，请于明日下班前在工艺管理中补充完整。',
   'info','user','','指定用户','admin','1',0,
   '0', NOW() - INTERVAL 20 MINUTE,'admin', NOW() - INTERVAL 20 MINUTE,'admin');

-- 选取 username in ('xm','monkey') 作为指定用户, 回填 target_ids 与 recipient_count
INSERT INTO `sp_sys_notice_user`
  (`id`,`notice_id`,`user_id`,`is_read`,`read_time`,`is_deleted`,`create_time`,`create_username`,`update_time`,`update_username`)
SELECT CONCAT('demo-nu-5-',u.`id`),'demo-notice-5',u.`id`,'0',NULL,'0',
       NOW() - INTERVAL 20 MINUTE,'admin', NOW() - INTERVAL 20 MINUTE,'admin'
FROM `sp_sys_user` u WHERE u.`is_deleted`!='1' AND u.`username` IN ('xm','monkey');

UPDATE `sp_sys_notice` n
SET n.`target_ids` = (SELECT GROUP_CONCAT(u.`id`) FROM `sp_sys_user` u WHERE u.`username` IN ('xm','monkey') AND u.`is_deleted`!='1'),
    n.`recipient_count` = (SELECT COUNT(*) FROM `sp_sys_user` u WHERE u.`username` IN ('xm','monkey') AND u.`is_deleted`!='1')
WHERE n.`id`='demo-notice-5';

-- ── 演示混合已读状态: admin 已读公告(1)与停机(2), 其余保持未读 ──
UPDATE `sp_sys_notice_user`
SET `is_read`='1', `read_time`=NOW() - INTERVAL 2 HOUR
WHERE `notice_id` IN ('demo-notice-1','demo-notice-2')
  AND `user_id`=(SELECT `id` FROM (SELECT `id` FROM `sp_sys_user` WHERE `username`='admin') t);
