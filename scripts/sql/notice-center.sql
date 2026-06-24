-- ============================================================
-- 通知中心 (feat/system-funcs)
-- 方案 A：通知主体表 sp_sys_notice + 每用户收件箱表 sp_sys_notice_user
-- 菜单挂系统管理组(parent_id=10)；id 取 120/124 避开既有 101~108/121~123。
-- 幂等：表用 IF NOT EXISTS，菜单用 ON DUPLICATE KEY UPDATE。
-- 执行后请重新登录以重建前端权限集(含 notice:publish)。
-- ============================================================

CREATE TABLE IF NOT EXISTS `sp_sys_notice` (
  `id` varchar(64) NOT NULL COMMENT '主键id',
  `title` varchar(255) NOT NULL COMMENT '标题',
  `content` text COMMENT '正文',
  `type` varchar(16) NOT NULL DEFAULT 'info' COMMENT 'info/success/warning/error',
  `target_type` varchar(16) NOT NULL DEFAULT 'all' COMMENT 'all/user/role/dept',
  `target_ids` varchar(1024) DEFAULT '' COMMENT '目标id列表(逗号分隔)',
  `target_desc` varchar(512) DEFAULT '' COMMENT '目标描述(展示用)',
  `sender` varchar(64) DEFAULT '' COMMENT '发布人username',
  `status` varchar(8) NOT NULL DEFAULT '1' COMMENT '1=已发布',
  `recipient_count` int NOT NULL DEFAULT 0 COMMENT '收件人数',
  `is_deleted` varchar(1) NOT NULL DEFAULT '0' COMMENT '软删 0/1',
  `create_time` datetime NOT NULL,
  `create_username` varchar(64) NOT NULL,
  `update_time` datetime NOT NULL,
  `update_username` varchar(64) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知主体表';

CREATE TABLE IF NOT EXISTS `sp_sys_notice_user` (
  `id` varchar(64) NOT NULL COMMENT '主键id',
  `notice_id` varchar(64) NOT NULL COMMENT '关联 sp_sys_notice.id',
  `user_id` varchar(64) NOT NULL COMMENT '收件人id',
  `is_read` varchar(1) NOT NULL DEFAULT '0' COMMENT '0未读/1已读',
  `read_time` datetime DEFAULT NULL COMMENT '首次已读时间',
  `is_deleted` varchar(1) NOT NULL DEFAULT '0' COMMENT '软删 0/1',
  `create_time` datetime NOT NULL,
  `create_username` varchar(64) NOT NULL,
  `update_time` datetime NOT NULL,
  `update_username` varchar(64) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notice_user_uid` (`user_id`,`is_read`,`is_deleted`),
  KEY `idx_notice_user_nid` (`notice_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知收件箱表';

INSERT INTO `sp_sys_menu`
  (`id`,`code`,`name`,`url`,`parent_id`,`grade`,`sort_num`,`type`,`permission`,`icon`,`descr`,`create_time`,`create_username`,`update_time`,`update_username`)
VALUES
  ('120','noticeInbox','通知中心','/admin/sys/notice/list-ui','10','3',9,'0','notice:view','bell','','2026-06-23 00:00:00','admin','2026-06-23 00:00:00','admin'),
  ('124','noticePublish','通知发布','/admin/sys/notice/admin-ui','10','3',10,'0','notice:publish','message','','2026-06-23 00:00:00','admin','2026-06-23 00:00:00','admin')
ON DUPLICATE KEY UPDATE
  `name`=VALUES(`name`), `url`=VALUES(`url`), `parent_id`=VALUES(`parent_id`),
  `permission`=VALUES(`permission`), `icon`=VALUES(`icon`);
