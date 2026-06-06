-- Team Management Module
-- Creates sp_team and sp_team_user tables, seed data, and menu entry

CREATE TABLE IF NOT EXISTS sp_team (
  id varchar(64) NOT NULL COMMENT '主键',
  code varchar(32) NOT NULL COMMENT '班组代码',
  name varchar(64) NOT NULL COMMENT '班组名称',
  descr varchar(255) DEFAULT '' COMMENT '备注',
  line_id varchar(64) DEFAULT NULL COMMENT '生产线ID',
  workshop_id varchar(64) DEFAULT NULL COMMENT '车间ID',
  start_time varchar(8) DEFAULT NULL COMMENT '上班时间 HH:mm',
  end_time varchar(8) DEFAULT NULL COMMENT '下班时间 HH:mm',
  workdays varchar(32) DEFAULT NULL COMMENT '工作日 1,2,3,4,5,6,7',
  is_deleted varchar(2) NOT NULL DEFAULT '0' COMMENT '0=正常 1=删除 2=禁用',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_team_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='班组表';

CREATE TABLE IF NOT EXISTS sp_team_user (
  id varchar(64) NOT NULL COMMENT '主键',
  team_id varchar(64) NOT NULL COMMENT '班组ID',
  user_id varchar(64) NOT NULL COMMENT '用户ID',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_team_user (team_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='班组用户关联表';

-- Seed: team "生产作业班组1"
INSERT INTO sp_team (id, code, name, descr, start_time, end_time, workdays, is_deleted, create_time, create_username, update_time, update_username)
SELECT REPLACE(UUID(), '-', ''), 'BZ001', '生产作业班组1', '生产作业班组', '08:00', '17:00', '1,2,3,4,5', '0', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_team WHERE code = 'BZ001');

-- Seed: assign user "作业员1" to the team
INSERT INTO sp_team_user (id, team_id, user_id, create_time, create_username, update_time, update_username)
SELECT REPLACE(UUID(), '-', ''), t.id, u.id, NOW(), 'admin', NOW(), 'admin'
FROM sp_team t, sp_sys_user u
WHERE t.code = 'BZ001' AND u.name = '作业员1'
AND NOT EXISTS (SELECT 1 FROM sp_team_user WHERE team_id = t.id AND user_id = u.id);

-- Menu entry under 系统管理 (parent_id=10)
INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '107', 'team', '班组员工定义', '/admin/sys/team/list-ui', '10', '3', '7', '0', 'team:add', 'fa-users', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '107');
