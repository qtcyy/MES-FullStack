-- 工序步骤表(sp_oper_step):每个工序的具体作业步骤
-- 关联 sp_oper.id;step_no 用于排序(上移/下移交换序号)
CREATE TABLE IF NOT EXISTS `sp_oper_step` (
  `id` varchar(64) NOT NULL COMMENT '主键id',
  `oper_id` varchar(64) NOT NULL COMMENT '所属工序ID(sp_oper.id)',
  `step_no` int DEFAULT '0' COMMENT '步骤序号(排序用,从1开始)',
  `step_title` varchar(255) DEFAULT NULL COMMENT '步骤标题',
  `step_desc` varchar(2000) DEFAULT NULL COMMENT '详细说明',
  `est_minutes` int DEFAULT NULL COMMENT '预计耗时(分钟),可空',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `create_username` varchar(64) DEFAULT NULL COMMENT '创建人',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `update_username` varchar(64) DEFAULT NULL COMMENT '更新人',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_oper_id` (`oper_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工序步骤表';
