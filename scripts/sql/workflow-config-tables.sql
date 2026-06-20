-- =====================================================================
-- 流程配置工具 — 配置层建表脚本(周期 2n:后端补齐)
-- 说明:周期 2m 仅前端 mock。本脚本为「流程分类 / 流程模型 / 流程表单 /
--       流程事件规则」四张配置表建表,并给已存在的运行时表
--       sp_workflow_definition 补 form_key / version 两列(发布动作落库用)。
-- 运行时表(sp_workflow_instance / sp_workflow_task / sp_workflow_event_log)
--       本轮不动,留待将来运行时周期。
-- 本脚本仅需执行一次(ALTER 不含 IF NOT EXISTS)。
-- =====================================================================

-- 1) 流程分类
CREATE TABLE IF NOT EXISTS `sp_workflow_category` (
  `id` varchar(64) NOT NULL COMMENT '主键id',
  `code` varchar(64) NOT NULL COMMENT '分类编码(唯一)',
  `name` varchar(255) NOT NULL COMMENT '分类名称',
  `descr` varchar(500) DEFAULT NULL COMMENT '备注',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) DEFAULT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) DEFAULT NULL COMMENT '最后更新人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_category_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='流程分类';

-- 2) 流程模型(含 BPMN XML)
CREATE TABLE IF NOT EXISTS `sp_workflow_model` (
  `id` varchar(64) NOT NULL COMMENT '主键id',
  `model_key` varchar(64) NOT NULL COMMENT '模型key(字母开头,唯一)',
  `name` varchar(255) NOT NULL COMMENT '模型名称',
  `category_code` varchar(64) DEFAULT NULL COMMENT '分类编码(发布后填入)',
  `category_name` varchar(255) DEFAULT NULL COMMENT '分类名称(发布后填入)',
  `bpmn_xml` longtext COMMENT 'BPMN XML 内容',
  `status` varchar(32) NOT NULL DEFAULT 'DRAFT' COMMENT '状态:DRAFT/PUBLISHED',
  `version` int(11) NOT NULL DEFAULT '1' COMMENT '版本号',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) DEFAULT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) DEFAULT NULL COMMENT '最后更新人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_model_key` (`model_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='流程模型';

-- 3) 流程表单
CREATE TABLE IF NOT EXISTS `sp_workflow_form` (
  `id` varchar(64) NOT NULL COMMENT '主键id',
  `name` varchar(255) NOT NULL COMMENT '表单名称',
  `form_key` varchar(64) NOT NULL COMMENT '表单key(字母开头,唯一)',
  `form_type` varchar(32) NOT NULL DEFAULT 'URL' COMMENT '表单类型:目前仅 URL',
  `title_script` varchar(500) DEFAULT NULL COMMENT '流程标题生成脚本',
  `pc_url_script` varchar(500) DEFAULT NULL COMMENT 'PC 表单地址脚本',
  `mobile_url_script` varchar(500) DEFAULT NULL COMMENT '手机表单地址脚本',
  `skip_same_assignee` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否跳过相同处理人',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) DEFAULT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) DEFAULT NULL COMMENT '最后更新人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_form_key` (`form_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='流程表单';

-- 4) 流程事件规则(配置层,区别于运行时 sp_workflow_event_log)
CREATE TABLE IF NOT EXISTS `sp_workflow_event_rule` (
  `id` varchar(64) NOT NULL COMMENT '主键id',
  `definition_id` varchar(64) NOT NULL COMMENT '所属流程定义ID',
  `name` varchar(255) DEFAULT NULL COMMENT '规则名称',
  `trigger_type` varchar(32) NOT NULL COMMENT '触发时机:START/TASK_COMPLETE/END/REJECT',
  `business_type` varchar(64) NOT NULL COMMENT '业务类型(如 ORDER_APPROVAL)',
  `action_type` varchar(32) NOT NULL COMMENT '动作类型:SET_AUDIT_STATUS/SCRIPT',
  `target_status` varchar(32) DEFAULT NULL COMMENT '目标审批状态(SET_AUDIT_STATUS 时有效)',
  `script` text COMMENT '业务脚本(SCRIPT 时有效)',
  `enabled` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) DEFAULT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) DEFAULT NULL COMMENT '最后更新人',
  PRIMARY KEY (`id`),
  KEY `idx_definition_id` (`definition_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='流程事件规则';

-- 5) 已存在的轻量流程定义表补两列(发布动作落库 + 关联表单)
--    若你的库尚未建 sp_workflow_definition,请先执行 MySQL-init-all.sql。
ALTER TABLE `sp_workflow_definition`
  ADD COLUMN `form_key` varchar(64) DEFAULT NULL COMMENT '关联的流程表单key' AFTER `enabled`,
  ADD COLUMN `version` int(11) NOT NULL DEFAULT '1' COMMENT '版本号(取自模型)' AFTER `form_key`;
