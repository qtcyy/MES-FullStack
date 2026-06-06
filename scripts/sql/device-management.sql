CREATE TABLE IF NOT EXISTS sp_device (
  id varchar(64) NOT NULL COMMENT '主键',
  code varchar(32) NOT NULL COMMENT '设备编号',
  name varchar(64) NOT NULL COMMENT '设备名称',
  type varchar(32) DEFAULT NULL COMMENT '设备类型',
  model varchar(64) DEFAULT NULL COMMENT '设备型号',
  specs varchar(255) DEFAULT NULL COMMENT '规格参数',
  line_id varchar(64) DEFAULT NULL COMMENT '所属产线ID',
  location varchar(128) DEFAULT NULL COMMENT '位置',
  status varchar(2) DEFAULT '0' COMMENT '0=空闲 1=运行中 2=维修中 3=报废',
  descr varchar(255) DEFAULT '' COMMENT '备注',
  is_deleted varchar(2) NOT NULL DEFAULT '0' COMMENT '0=正常 1=删除',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_device_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备表';

CREATE TABLE IF NOT EXISTS sp_device_group (
  id varchar(64) NOT NULL COMMENT '主键',
  code varchar(32) NOT NULL COMMENT '编组代码',
  name varchar(64) NOT NULL COMMENT '编组名称',
  descr varchar(255) DEFAULT '' COMMENT '描述',
  is_deleted varchar(2) NOT NULL DEFAULT '0' COMMENT '0=正常 1=删除',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_group_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备编组表';

CREATE TABLE IF NOT EXISTS sp_device_group_item (
  id varchar(64) NOT NULL COMMENT '主键',
  group_id varchar(64) NOT NULL COMMENT '编组ID',
  device_id varchar(64) NOT NULL COMMENT '设备ID',
  create_time datetime NOT NULL,
  create_username varchar(64) NOT NULL,
  update_time datetime NOT NULL,
  update_username varchar(64) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_group_device (group_id, device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='编组设备关联表';

INSERT INTO sp_device (id, code, name, type, status, is_deleted, create_time, create_username, update_time, update_username)
SELECT REPLACE(UUID(), '-', ''), 'DS11-1', 'DS11-1', '通用设备', '0', '0', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_device WHERE code = 'DS11-1');

INSERT INTO sp_device_group (id, code, name, descr, is_deleted, create_time, create_username, update_time, update_username)
SELECT REPLACE(UUID(), '-', ''), 'EG-1', '设备编组1', '设备编组1', '0', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_device_group WHERE code = 'EG-1');

INSERT INTO sp_device_group_item (id, group_id, device_id, create_time, create_username, update_time, update_username)
SELECT REPLACE(UUID(), '-', ''), g.id, d.id, NOW(), 'admin', NOW(), 'admin'
FROM sp_device_group g, sp_device d
WHERE g.code = 'EG-1' AND d.code = 'DS11-1'
AND NOT EXISTS (SELECT 1 FROM sp_device_group_item WHERE group_id = g.id AND device_id = d.id);

INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '108', 'deviceGroup', '编组设备定义', '/basedata/device-group/list-ui', '10', '3', '8', '0', 'device:add', 'fa-cogs', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '108');
