-- Dispatch Management Module
-- Creates sp_order_dispatch table, seed data, and menu entry

CREATE TABLE IF NOT EXISTS sp_order_dispatch (
  id varchar(64) NOT NULL COMMENT '主键',
  order_id varchar(64) NOT NULL COMMENT '工单ID',
  team_id varchar(64) NOT NULL COMMENT '班组ID',
  user_id varchar(64) NOT NULL COMMENT '作业员ID',
  labor_hours decimal(10,2) DEFAULT NULL COMMENT '工时（小时）',
  dispatch_status tinyint DEFAULT 1 COMMENT '派工状态: 1=已派工 2=已开工 3=已完工',
  plan_start_time varchar(255) DEFAULT NULL COMMENT '计划开始时间',
  plan_end_time varchar(255) DEFAULT NULL COMMENT '计划结束时间',
  actual_start_time varchar(255) DEFAULT NULL COMMENT '实际开始时间',
  actual_end_time varchar(255) DEFAULT NULL COMMENT '实际结束时间',
  remark varchar(500) DEFAULT '' COMMENT '备注',
  create_time datetime NOT NULL COMMENT '创建时间',
  create_username varchar(64) NOT NULL COMMENT '创建人',
  update_time datetime NOT NULL COMMENT '更新时间',
  update_username varchar(64) DEFAULT NULL COMMENT '更新人',
  PRIMARY KEY (id),
  KEY idx_order_id (order_id),
  KEY idx_team_id (team_id),
  KEY idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工单派工记录表';

-- Seed: set some existing orders to statue=0 (已下发) for testing
-- Uses orders that exist in the sp_order table
UPDATE sp_order SET statue = 0 WHERE statue = 1 AND order_type = 'P' LIMIT 5;

-- Menu entry under 计划管理 (parent_id=12)
INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '122', 'orderDispatch', '员工作业派工', '/order/dispatch', '12', '3', '2', '0', 'order:dispatch', 'fa-id-card', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '122');
