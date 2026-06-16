-- ============================================================
-- MES-FullStack 完整数据库初始化脚本
-- 生成日期: 2026-06-07
-- 包含: 39 张表结构 + 种子数据
-- 字符集: utf8mb4 / utf8mb4_0900_ai_ci
-- ============================================================

CREATE DATABASE IF NOT EXISTS `mes_data` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `mes_data`;

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_bom` (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '主键id',
  `bom_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'bom编号',
  `materiel_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '物料ID',
  `materiel_desc` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '物料描述',
  `remark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '备注',
  `version_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '版本号',
  `state` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'BOM状态 creat创建 pass审核通过 ',
  `factory` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '工厂',
  `is_deleted` varchar(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '逻辑删除：1 表示删除，0 表示未删除，2 表示禁用',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '最后更新人',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC COMMENT='BOM主信息表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_bom_flow` (
  `id` varchar(32) NOT NULL,
  `bom_id` varchar(32) NOT NULL COMMENT 'BOM节点ID',
  `flow_id` varchar(32) NOT NULL COMMENT '工艺路线ID',
  `status` varchar(20) DEFAULT 'draft' COMMENT 'draft/locked',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `create_time` datetime DEFAULT NULL,
  `create_username` varchar(50) DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `update_username` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bom_flow_bom` (`bom_id`),
  KEY `idx_flow_id` (`flow_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_bom_item` (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '主键id',
  `bom_head_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'bom编号',
  `materiel_item_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '物料ID',
  `materiel_item_desc` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '物料描述',
  `line_no` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '行号',
  `item_num` decimal(10,0) DEFAULT '0' COMMENT '用量',
  `item_unit` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '子项基本单位',
  `oper_typer` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '所属工序类型',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '最后更新人',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC COMMENT='BOM子项表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_component` (
  `id` varchar(64) NOT NULL COMMENT '主键',
  `code` varchar(32) NOT NULL COMMENT '零部件编号',
  `name` varchar(64) NOT NULL COMMENT '零部件名称',
  `descr` varchar(255) DEFAULT '' COMMENT '备注/特性描述',
  `is_deleted` varchar(2) NOT NULL DEFAULT '0',
  `create_time` datetime NOT NULL,
  `create_username` varchar(64) NOT NULL,
  `update_time` datetime NOT NULL,
  `update_username` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_comp_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='零部件定义表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_device` (
  `id` varchar(64) NOT NULL COMMENT '主键',
  `code` varchar(32) NOT NULL COMMENT '设备编号',
  `name` varchar(64) NOT NULL COMMENT '设备名称',
  `type` varchar(32) DEFAULT NULL COMMENT '设备类型',
  `model` varchar(64) DEFAULT NULL COMMENT '设备型号',
  `specs` varchar(255) DEFAULT NULL COMMENT '规格参数',
  `line_id` varchar(64) DEFAULT NULL COMMENT '所属产线ID',
  `location` varchar(128) DEFAULT NULL COMMENT '位置',
  `status` varchar(2) DEFAULT '0' COMMENT '0=空闲 1=运行中 2=维修中 3=报废',
  `descr` varchar(255) DEFAULT '' COMMENT '备注',
  `is_deleted` varchar(2) NOT NULL DEFAULT '0' COMMENT '0=正常 1=删除',
  `create_time` datetime NOT NULL,
  `create_username` varchar(64) NOT NULL,
  `update_time` datetime NOT NULL,
  `update_username` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_device_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='设备表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_device_group` (
  `id` varchar(64) NOT NULL COMMENT '主键',
  `code` varchar(32) NOT NULL COMMENT '编组代码',
  `name` varchar(64) NOT NULL COMMENT '编组名称',
  `descr` varchar(255) DEFAULT '' COMMENT '描述',
  `is_deleted` varchar(2) NOT NULL DEFAULT '0' COMMENT '0=正常 1=删除',
  `create_time` datetime NOT NULL,
  `create_username` varchar(64) NOT NULL,
  `update_time` datetime NOT NULL,
  `update_username` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_group_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='设备编组表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_device_group_item` (
  `id` varchar(64) NOT NULL COMMENT '主键',
  `group_id` varchar(64) NOT NULL COMMENT '编组ID',
  `device_id` varchar(64) NOT NULL COMMENT '设备ID',
  `create_time` datetime NOT NULL,
  `create_username` varchar(64) NOT NULL,
  `update_time` datetime NOT NULL,
  `update_username` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_group_device` (`group_id`,`device_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='编组设备关联表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_factroy` (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '主键id',
  `factory` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `factory_desc` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '最后更新人',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC COMMENT='工厂表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_flow` (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '主键id',
  `flow` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '流程',
  `flow_desc` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '线体描述',
  `process` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '流程绘制 A——>B——>C',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '最后更新人',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC COMMENT='流程表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_flow_oper_relation` (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '主键id',
  `flow_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '流程ID',
  `flow` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '流程代码',
  `per_oper_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '前道工序ID',
  `per_oper` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '前道工序代码',
  `oper_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '当前工序ID',
  `oper` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '当前工序\r\n',
  `next_oper_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '下道工序ID',
  `next_oper` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '下道工序',
  `sort_num` int NOT NULL COMMENT '排序',
  `oper_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '工序类型（首道工序firstOper;最后一道工序lastOper）',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '最后更新人',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `flow_id_index` (`flow_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC COMMENT='流程与工序关系表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_line` (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '主键id',
  `line` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '线体',
  `line_desc` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '线体描述',
  `process_section` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '工序段代号',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '最后更新人',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC COMMENT='线体表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_materile` (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '主键id',
  `materiel` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '物料编码',
  `materiel_desc` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '物料描述',
  `unit` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '基本单位',
  `product_group` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '产品组',
  `mat_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '物料类型',
  `model` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '型号',
  `size` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '尺寸',
  `flow_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '流程',
  `flow_desc` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '流程描述',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '最后更新人',
  `is_deleted` char(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '0' COMMENT '逻辑删除：1 表示删除，0 表示未删除，2 表示禁用',
  `source` varchar(8) DEFAULT NULL COMMENT '物料来源',
  `lead_time` int DEFAULT '1' COMMENT '需求提前期',
  `safety_stock` int DEFAULT '0' COMMENT '安全库存',
  `image_url` varchar(512) DEFAULT NULL COMMENT '图片路径',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC COMMENT='基础物料表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_oper` (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '主键id',
  `oper` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '工序\r\n',
  `oper_desc` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '工序描述',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '最后更新人',
  `oper_code` varchar(50) DEFAULT NULL COMMENT '自动生成工序编号 OPR-XXX',
  `process_unit_id` varchar(64) DEFAULT NULL COMMENT '绑定加工单元ID',
  `labor_hours` int DEFAULT '0' COMMENT '工时(分钟)',
  `manufacturing_cycle` int DEFAULT '0' COMMENT '制造周期(分钟)',
  `generate_plan` char(1) DEFAULT '1' COMMENT '0=否 1=是',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC COMMENT='工序表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_order` (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '主键id',
  `order_code` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL COMMENT '工单编号',
  `order_description` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL COMMENT '工单描述',
  `qty` int DEFAULT NULL COMMENT '工单数量',
  `order_type` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL COMMENT '订单类型 P 量产 A验证 F返工 ',
  `flow_id` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL COMMENT '流程ID',
  `materiel` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '物料编码',
  `materiel_desc` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '物料描述',
  `plan_start_time` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL COMMENT '计划开始时间',
  `plan_end_time` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '0' COMMENT '计划结束时间',
  `statue` tinyint DEFAULT NULL COMMENT '1,创建 2 进行中，3订单结束，4订单终结',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '最后更新人',
  `order_source` varchar(32) DEFAULT NULL COMMENT '订单来源 DEMAND需求订单 FORECAST预测订单',
  `schedule_mode` varchar(32) DEFAULT NULL COMMENT '排产方式 FORWARD正向排产 BACKWARD逆向排产',
  `bom_id` varchar(64) DEFAULT NULL COMMENT '产品BOM ID',
  `bom_code` varchar(255) DEFAULT NULL COMMENT '产品BOM编码',
  `bom_version` varchar(64) DEFAULT NULL COMMENT 'BOM版本',
  `customer_name` varchar(255) DEFAULT NULL COMMENT '客户名称',
  `contract_no` varchar(255) DEFAULT NULL COMMENT '销售合同号',
  `material_lead_time_days` int DEFAULT NULL COMMENT '物料需求提前期，单位天',
  `daily_capacity` int DEFAULT NULL COMMENT '日标准产能',
  `buffer_days` int DEFAULT NULL COMMENT '缓冲天数',
  `priority` int DEFAULT NULL COMMENT '订单优先级，数字越小优先级越高',
  `audit_status` varchar(32) DEFAULT NULL COMMENT '审批状态 DRAFT草稿 APPROVING审核中 APPROVED审核通过 REJECTED审核驳回',
  `plan_status` varchar(32) DEFAULT NULL COMMENT '计划状态 UNCOMPUTED待运算 COMPUTED已运算 RELEASED已下发 CANCELLED已撤销 DONE已完成',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_process_content` (
  `id` varchar(32) NOT NULL,
  `bom_id` varchar(32) NOT NULL,
  `flow_id` varchar(32) DEFAULT NULL,
  `main_info` varchar(500) DEFAULT NULL,
  `content` text,
  `content_images` varchar(2000) DEFAULT NULL,
  `requirements` text,
  `inspection_required` char(1) DEFAULT '0',
  `inspection_images` varchar(2000) DEFAULT NULL,
  `notes` text,
  `status` varchar(20) DEFAULT 'draft',
  `create_time` datetime DEFAULT NULL,
  `create_username` varchar(50) DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `update_username` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_process_content_bom` (`bom_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_process_document` (
  `id` varchar(32) NOT NULL,
  `content_id` varchar(32) NOT NULL,
  `name` varchar(200) DEFAULT NULL,
  `file_path` varchar(500) DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  `create_username` varchar(50) DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `update_username` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_process_equipment` (
  `id` varchar(32) NOT NULL,
  `content_id` varchar(32) NOT NULL,
  `name` varchar(200) DEFAULT NULL,
  `quantity` int DEFAULT '1',
  `remark` varchar(500) DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  `create_username` varchar(50) DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `update_username` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_process_unit` (
  `id` varchar(64) NOT NULL COMMENT '主键',
  `code` varchar(32) NOT NULL COMMENT '加工单元代码',
  `name` varchar(64) NOT NULL COMMENT '加工单元名称',
  `type` varchar(32) DEFAULT NULL COMMENT '类型: 人员作业单元/设备作业单元',
  `has_line_warehouse` varchar(2) DEFAULT '0' COMMENT '是否有线边库 0=否 1=是',
  `descr` varchar(255) DEFAULT '' COMMENT '备注',
  `is_deleted` varchar(2) NOT NULL DEFAULT '0' COMMENT '0=正常 1=删除',
  `create_time` datetime NOT NULL,
  `create_username` varchar(64) NOT NULL,
  `update_time` datetime NOT NULL,
  `update_username` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_pu_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='加工单元表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_process_unit_team` (
  `id` varchar(64) NOT NULL COMMENT '主键',
  `unit_id` varchar(64) NOT NULL COMMENT '加工单元ID',
  `team_id` varchar(64) NOT NULL COMMENT '班组ID',
  `create_time` datetime NOT NULL,
  `create_username` varchar(64) NOT NULL,
  `update_time` datetime NOT NULL,
  `update_username` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_unit_team` (`unit_id`,`team_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='加工单元班组关联表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_product_bom` (
  `id` varchar(32) NOT NULL,
  `bom_code` varchar(50) DEFAULT NULL COMMENT 'BOM编码',
  `product_code` varchar(50) DEFAULT NULL COMMENT '产品物料编码',
  `node_name` varchar(100) DEFAULT NULL COMMENT '节点名称',
  `parent_id` varchar(32) DEFAULT NULL COMMENT '父节点ID',
  `level` int DEFAULT '0' COMMENT '层级 0=产品 1=半成品 2=组件',
  `version` varchar(20) DEFAULT 'V1.0' COMMENT '版本号',
  `status` varchar(20) DEFAULT 'draft' COMMENT 'draft=草稿 locked=已锁定',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `locked_at` datetime DEFAULT NULL COMMENT '锁定时间',
  `locked_by` varchar(50) DEFAULT NULL COMMENT '锁定人',
  `create_time` datetime DEFAULT NULL,
  `create_username` varchar(50) DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `update_username` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_product_code` (`product_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_product_bom_item` (
  `id` varchar(32) NOT NULL,
  `bom_id` varchar(32) NOT NULL COMMENT '所属BOM节点ID',
  `item_type` varchar(20) DEFAULT 'material' COMMENT 'material=物料 bom_ref=BOM节点引用',
  `material_code` varchar(50) DEFAULT NULL COMMENT '物料编码',
  `material_desc` varchar(200) DEFAULT NULL COMMENT '物料描述',
  `quantity` decimal(10,2) DEFAULT '1.00' COMMENT '用量',
  `unit` varchar(20) DEFAULT '个' COMMENT '单位',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `create_time` datetime DEFAULT NULL,
  `create_username` varchar(50) DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `update_username` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_bom_id` (`bom_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_sys_department` (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '主键id',
  `parent_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `sort_num` int NOT NULL,
  `is_deleted` varchar(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '逻辑删除：1 表示删除，0 表示未删除，2 表示禁用',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '最后更新人',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_sys_dict` (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '主键id',
  `name` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '标签名',
  `value` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '数据值',
  `type` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '类型',
  `descr` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '""' COMMENT '描述',
  `sort_num` int NOT NULL COMMENT '排序（升序）',
  `parent_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '""' COMMENT '父级id',
  `is_deleted` char(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '0' COMMENT '逻辑删除：1 表示删除，0 表示未删除，2 表示禁用',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '最后更新人',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_sp_sys_dict_name` (`type`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC COMMENT='系统字典表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_sys_menu` (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '主键id',
  `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `name` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '菜单名称',
  `url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '菜单URL',
  `parent_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '父菜单ID，一级菜单设为0',
  `grade` varchar(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '层级：1级、2级、3级......',
  `sort_num` int NOT NULL COMMENT '排序',
  `type` varchar(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '类型：0 目录；1 菜单；2 按钮',
  `permission` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '""' COMMENT '授权(多个用逗号分隔，如：sys:menu:list,sys:menu:create)',
  `icon` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '""' COMMENT '菜单图标',
  `descr` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '""' COMMENT '描述',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '最后更新人',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `idx_sp_sys_menu_name` (`name`) USING BTREE,
  UNIQUE KEY `idx_sp_sys_menu_code` (`code`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC COMMENT='系统菜单表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_sys_role` (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '主键id',
  `name` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '角色名称',
  `code` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '角色编码',
  `descr` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '""' COMMENT '角色描述',
  `is_deleted` varchar(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '逻辑删除：1 表示删除，0 表示未删除，2 表示禁用',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '最后更新人',
  `is_system` varchar(1) DEFAULT '0' COMMENT '系统角色 0-否 1-是',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `idx_sp_sys_role_name` (`name`) USING BTREE,
  UNIQUE KEY `idx_sp_sys_role_code` (`code`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC COMMENT='角色表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_sys_role_menu` (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '主键id',
  `role_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '角色id',
  `menu_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '菜单id',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '最后更新人',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC COMMENT='角色对应的菜单表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_sys_user` (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '主键id',
  `name` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '姓名',
  `username` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '用户名',
  `password` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '密码',
  `dept_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '""' COMMENT '部门id',
  `email` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '""' COMMENT '邮箱',
  `mobile` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '手机号',
  `tel` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '""' COMMENT '固定电话',
  `sex` char(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '性别(0:女;1:男;2:其他)',
  `birthday` datetime DEFAULT NULL COMMENT '出生年月日',
  `pic_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '""' COMMENT '图片id，对应sys_file表中的id',
  `id_card` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '""' COMMENT '身份证',
  `hobby` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '""' COMMENT '爱好',
  `province` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '""' COMMENT '省份',
  `city` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '""' COMMENT '城市',
  `district` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '""' COMMENT '区县',
  `street` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '""' COMMENT '街道',
  `street_number` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '""' COMMENT '门牌号',
  `descr` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '""' COMMENT '描述',
  `is_deleted` varchar(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '逻辑删除：1 表示删除，0 表示未删除，2 表示禁用',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '最后更新人',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `idx_sp_sys_user_username` (`username`) USING BTREE COMMENT '用户名唯一索引',
  UNIQUE KEY `idx_sp_sys_user_mobile` (`mobile`) USING BTREE COMMENT '用户手机号唯一索引',
  KEY `idx_sp_sys_user_email` (`email`) USING BTREE COMMENT '用户邮箱唯一索引',
  KEY `idx_sp_sys_user_id_card` (`id_card`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC COMMENT='用户信息表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_sys_user_role` (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '主键id',
  `user_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '用户id',
  `role_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '角色id',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '最后更新人',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC COMMENT='用户对应的角色表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_table_manager` (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '主键',
  `table_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '表名称',
  `table_desc` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '表描述',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '最后更新人',
  `is_deleted` varchar(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '逻辑删除：1 表示删除，0 表示未删除，2 表示禁用',
  `permission` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '""' COMMENT '授权(多个用逗号分隔，如：sys:menu:list,sys:menu:create)',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `index1` (`table_name`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC COMMENT='主数据通用管理';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_table_manager_item` (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '主键',
  `table_name_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '表名称id',
  `field` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '字段',
  `field_desc` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '字段描述',
  `must_fill` varchar(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '是否必填',
  `sort_num` int NOT NULL COMMENT '排序',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '最后更新人',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC COMMENT='主数据基础数据明细表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_team` (
  `id` varchar(64) NOT NULL COMMENT '主键',
  `code` varchar(32) NOT NULL COMMENT '班组代码',
  `name` varchar(64) NOT NULL COMMENT '班组名称',
  `descr` varchar(255) DEFAULT '' COMMENT '备注',
  `line_id` varchar(64) DEFAULT NULL COMMENT '生产线ID',
  `workshop_id` varchar(64) DEFAULT NULL COMMENT '车间ID',
  `start_time` varchar(8) DEFAULT NULL COMMENT '上班时间 HH:mm',
  `end_time` varchar(8) DEFAULT NULL COMMENT '下班时间 HH:mm',
  `workdays` varchar(32) DEFAULT NULL COMMENT '工作日 1,2,3,4,5,6,7',
  `is_deleted` varchar(2) NOT NULL DEFAULT '0' COMMENT '0=正常 1=删除 2=禁用',
  `create_time` datetime NOT NULL,
  `create_username` varchar(64) NOT NULL,
  `update_time` datetime NOT NULL,
  `update_username` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_team_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='班组表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_team_user` (
  `id` varchar(64) NOT NULL COMMENT '主键',
  `team_id` varchar(64) NOT NULL COMMENT '班组ID',
  `user_id` varchar(64) NOT NULL COMMENT '用户ID',
  `create_time` datetime NOT NULL,
  `create_username` varchar(64) NOT NULL,
  `update_time` datetime NOT NULL,
  `update_username` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_team_user` (`team_id`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='班组用户关联表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_warehouse` (
  `id` varchar(64) NOT NULL COMMENT '主键',
  `code` varchar(32) NOT NULL COMMENT '库房编码',
  `name` varchar(64) NOT NULL COMMENT '库房名称',
  `type` varchar(32) DEFAULT NULL COMMENT '库房类型: 零件库/产品库',
  `groups` int DEFAULT '1' COMMENT '组数',
  `rows` int DEFAULT '1' COMMENT '排数',
  `layers` int DEFAULT '1' COMMENT '层数',
  `columns` int DEFAULT '1' COMMENT '列数',
  `descr` varchar(255) DEFAULT '' COMMENT '备注',
  `is_deleted` varchar(2) NOT NULL DEFAULT '0',
  `create_time` datetime NOT NULL,
  `create_username` varchar(64) NOT NULL,
  `update_time` datetime NOT NULL,
  `update_username` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_wh_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='库房表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_warehouse_location` (
  `id` varchar(64) NOT NULL COMMENT '主键',
  `warehouse_id` varchar(64) NOT NULL COMMENT '库房ID',
  `code` varchar(32) NOT NULL COMMENT '库位编码',
  `group_no` int DEFAULT '1' COMMENT '组号',
  `row_no` int DEFAULT '1' COMMENT '排号',
  `layer_no` int DEFAULT '1' COMMENT '层号',
  `col_no` int DEFAULT '1' COMMENT '列号',
  `is_deleted` varchar(2) NOT NULL DEFAULT '0',
  `create_time` datetime NOT NULL,
  `create_username` varchar(64) NOT NULL,
  `update_time` datetime NOT NULL,
  `update_username` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_loc_wh_code` (`warehouse_id`, `code`),
  KEY `idx_loc_wh` (`warehouse_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='库位表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_work_shop` (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '主键id',
  `work_shop` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `work_shop_desc` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '最后更新人',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC COMMENT='工作车间表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_workflow_definition` (
  `id` varchar(64) NOT NULL COMMENT '主键id',
  `category_code` varchar(64) NOT NULL COMMENT '流程分类编码',
  `category_name` varchar(255) NOT NULL COMMENT '流程分类名称',
  `process_key` varchar(64) NOT NULL COMMENT '流程key',
  `process_name` varchar(255) NOT NULL COMMENT '流程名称',
  `enabled` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用：1启用，0停用',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) NOT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) NOT NULL COMMENT '最后更新人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_process_key` (`process_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='轻量流程定义表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_workflow_event_log` (
  `id` varchar(64) NOT NULL COMMENT '主键id',
  `instance_id` varchar(64) NOT NULL COMMENT '流程实例ID',
  `task_id` varchar(64) DEFAULT NULL COMMENT '任务ID',
  `business_type` varchar(64) NOT NULL COMMENT '业务类型',
  `business_id` varchar(64) NOT NULL COMMENT '业务ID',
  `event_type` varchar(64) NOT NULL COMMENT '事件类型',
  `operator_user_id` varchar(64) DEFAULT NULL COMMENT '操作人ID',
  `operator_username` varchar(64) DEFAULT NULL COMMENT '操作人用户名',
  `event_time` datetime NOT NULL COMMENT '事件时间',
  `message` varchar(1000) DEFAULT NULL COMMENT '事件说明',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) NOT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) NOT NULL COMMENT '最后更新人',
  PRIMARY KEY (`id`),
  KEY `idx_instance_id` (`instance_id`),
  KEY `idx_business` (`business_type`,`business_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='轻量流程事件日志表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_workflow_instance` (
  `id` varchar(64) NOT NULL COMMENT '主键id',
  `definition_id` varchar(64) NOT NULL COMMENT '流程定义ID',
  `process_key` varchar(64) NOT NULL COMMENT '流程key',
  `business_type` varchar(64) NOT NULL COMMENT '业务类型',
  `business_id` varchar(64) NOT NULL COMMENT '业务ID',
  `business_code` varchar(255) DEFAULT NULL COMMENT '业务编号',
  `title` varchar(255) NOT NULL COMMENT '流程标题',
  `status` varchar(32) NOT NULL COMMENT '流程状态：RUNNING/COMPLETED/REJECTED/CANCELLED',
  `starter_user_id` varchar(64) DEFAULT NULL COMMENT '发起人ID',
  `starter_username` varchar(64) DEFAULT NULL COMMENT '发起人用户名',
  `start_time` datetime NOT NULL COMMENT '发起时间',
  `end_time` datetime DEFAULT NULL COMMENT '结束时间',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) NOT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) NOT NULL COMMENT '最后更新人',
  PRIMARY KEY (`id`),
  KEY `idx_business` (`business_type`,`business_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='轻量流程实例表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_workflow_task` (
  `id` varchar(64) NOT NULL COMMENT '主键id',
  `instance_id` varchar(64) NOT NULL COMMENT '流程实例ID',
  `task_name` varchar(255) NOT NULL COMMENT '任务名称',
  `task_key` varchar(64) NOT NULL COMMENT '任务key',
  `business_type` varchar(64) NOT NULL COMMENT '业务类型',
  `business_id` varchar(64) NOT NULL COMMENT '业务ID',
  `assignee_user_id` varchar(64) DEFAULT NULL COMMENT '签收人ID',
  `assignee_username` varchar(64) DEFAULT NULL COMMENT '签收人用户名',
  `candidate_role_code` varchar(64) DEFAULT NULL COMMENT '候选角色编码',
  `status` varchar(32) NOT NULL COMMENT '任务状态：PENDING/CLAIMED/COMPLETED/REJECTED/CANCELLED',
  `claim_time` datetime DEFAULT NULL COMMENT '签收时间',
  `complete_time` datetime DEFAULT NULL COMMENT '完成时间',
  `comment` varchar(1000) DEFAULT NULL COMMENT '处理意见',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) NOT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) NOT NULL COMMENT '最后更新人',
  PRIMARY KEY (`id`),
  KEY `idx_instance_id` (`instance_id`),
  KEY `idx_business` (`business_type`,`business_id`),
  KEY `idx_candidate_role` (`candidate_role_code`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='轻量流程任务表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;


-- ============================================================
-- 种子数据
-- ============================================================

-- 系统用户（密码: admin，MD5×3 + username salt）
INSERT INTO sp_sys_user (id, name, username, password, dept_id, email, mobile, tel, sex, is_deleted, create_time, create_username, update_time, update_username)
VALUES ('1', '超级管理员', 'admin', '038bdaf98f7f48c89e7a1d4d5c60cac1', '1', 'admin@mes.com', '13800000000', '', '1', '0', NOW(), 'admin', NOW(), 'admin');

-- 角色
INSERT INTO sp_sys_role (id, name, code, descr, is_deleted, is_system, create_time, create_username, update_time, update_username)
VALUES
('1', '超级管理员', 'admin', '系统超级管理员', '0', '1', NOW(), 'admin', NOW(), 'admin'),
('2', '数据员', 'data_admin', '负责基础数据维护', '0', '1', NOW(), 'admin', NOW(), 'admin'),
('3', '工艺员', 'tech_admin', '负责工艺路线和BOM维护', '0', '1', NOW(), 'admin', NOW(), 'admin'),
('4', '生产计划员', 'plan_admin', '负责生产计划制定', '0', '1', NOW(), 'admin', NOW(), 'admin'),
('5', '生产主管', 'prod_supervisor', '负责生产现场管理', '0', '1', NOW(), 'admin', NOW(), 'admin'),
('6', '生产作业员', 'operator', '负责生产作业执行', '0', '1', NOW(), 'admin', NOW(), 'admin'),
('7', '库房管理员', 'warehouse_admin', '负责库房库位管理', '0', '1', NOW(), 'admin', NOW(), 'admin'),
('8', '质量管理员', 'quality_admin', '负责质量检验管理', '0', '1', NOW(), 'admin', NOW(), 'admin');

-- 用户-角色关联
INSERT INTO sp_sys_user_role (id, user_id, role_id, create_time, create_username, update_time, update_username)
VALUES ('1', '1', '1', NOW(), 'admin', NOW(), 'admin');

-- 部门
INSERT INTO sp_sys_department (id, parent_id, name, sort_num, is_deleted, create_time, create_username, update_time, update_username)
VALUES
('1', '0', '总公司', 1, '0', NOW(), 'admin', NOW(), 'admin'),
('2', '1', '生产部', 2, '0', NOW(), 'admin', NOW(), 'admin'),
('3', '1', '质量部', 3, '0', NOW(), 'admin', NOW(), 'admin'),
('4', '1', '仓储部', 4, '0', NOW(), 'admin', NOW(), 'admin');

-- 演示物料
INSERT INTO sp_materile (id, materiel, materiel_desc, mat_type, unit, is_deleted, create_time, create_username, update_time, update_username)
VALUES
('mat-prod-001', 'PROD-001', '台式电脑主机', '产品', '台', '0', NOW(), 'admin', NOW(), 'admin'),
('mat-part-001', 'PART-001', 'CPU i7-13700K', '零件', '个', '0', NOW(), 'admin', NOW(), 'admin'),
('mat-part-002', 'PART-002', 'DDR5 32GB 内存', '零件', '条', '0', NOW(), 'admin', NOW(), 'admin'),
('mat-part-003', 'PART-003', 'SSD 1TB NVMe', '零件', '个', '0', NOW(), 'admin', NOW(), 'admin'),
('mat-part-004', 'PART-004', '主板 Z790', '零件', '个', '0', NOW(), 'admin', NOW(), 'admin'),
('mat-part-005', 'PART-005', 'CPU散热器', '零件', '个', '0', NOW(), 'admin', NOW(), 'admin'),
('mat-part-006', 'PART-006', '机箱外壳 ATX', '零件', '个', '0', NOW(), 'admin', NOW(), 'admin'),
('mat-part-007', 'PART-007', '电源 750W 金牌', '零件', '个', '0', NOW(), 'admin', NOW(), 'admin'),
('mat-part-008', 'PART-008', '散热风扇 120mm', '零件', '个', '0', NOW(), 'admin', NOW(), 'admin');

-- 演示工序
INSERT INTO sp_oper (id, oper, oper_code, oper_desc, labor_hours, manufacturing_cycle, generate_plan, remark, create_time, create_username, update_time, update_username)
VALUES
('oper-001', 'OPR-001', 'OPR-001', '主板组装作业工序', 30, 45, '1', '将CPU、内存、SSD、主板等核心部件组装到主板上', NOW(), 'admin', NOW(), 'admin'),
('oper-002', 'OPR-002', 'OPR-002', '机箱组装作业工序', 20, 35, '1', '将主板单元安装到机箱中，连接电源和数据线', NOW(), 'admin', NOW(), 'admin');

-- 演示产品 BOM
INSERT INTO sp_product_bom (id, bom_code, product_code, node_name, parent_id, level, version, status, remark, sort_order, create_time, create_username, update_time, update_username)
VALUES
('bom-root-001', 'PBOM-001', 'PROD-001', '台式电脑主机', NULL, 0, 'V1.0', 'draft', '台式电脑主机产品BOM，首批量产版本', 0, NOW(), 'admin', NOW(), 'admin'),
('bom-sub-001', 'PBOM-002', 'PROD-001', '台式电脑半成品', 'bom-root-001', 1, 'V1.0', 'draft', '台式电脑主机半成品组装单元，包含主板和机箱两个子组件', 0, NOW(), 'admin', NOW(), 'admin'),
('bom-comp-001', 'PBOM-003', 'PROD-001', '主板单元', 'bom-sub-001', 2, 'V1.0', 'draft', '包含CPU、内存、SSD、主板等核心计算部件', 0, NOW(), 'admin', NOW(), 'admin'),
('bom-comp-002', 'PBOM-004', 'PROD-001', '机箱单元', 'bom-sub-001', 2, 'V1.0', 'draft', '包含机箱、电源、散热风扇等外部设备', 1, NOW(), 'admin', NOW(), 'admin');

-- 演示 BOM 行项目
INSERT INTO sp_product_bom_item (id, bom_id, item_type, material_code, material_desc, quantity, unit, sort_order, create_time, create_username, update_time, update_username)
VALUES
('item-001', 'bom-comp-001', 'material', 'PART-001', 'CPU i7-13700K', 1, '个', 0, NOW(), 'admin', NOW(), 'admin'),
('item-002', 'bom-comp-001', 'material', 'PART-002', 'DDR5 32GB 内存', 2, '条', 1, NOW(), 'admin', NOW(), 'admin'),
('item-003', 'bom-comp-001', 'material', 'PART-003', 'SSD 1TB NVMe', 1, '个', 2, NOW(), 'admin', NOW(), 'admin'),
('item-004', 'bom-comp-001', 'material', 'PART-004', '主板 Z790', 1, '个', 3, NOW(), 'admin', NOW(), 'admin'),
('item-005', 'bom-comp-001', 'material', 'PART-005', 'CPU散热器', 1, '个', 4, NOW(), 'admin', NOW(), 'admin'),
('item-006', 'bom-comp-002', 'material', 'PART-006', '机箱外壳 ATX', 1, '个', 0, NOW(), 'admin', NOW(), 'admin'),
('item-007', 'bom-comp-002', 'material', 'PART-007', '电源 750W 金牌', 1, '个', 1, NOW(), 'admin', NOW(), 'admin'),
('item-008', 'bom-comp-002', 'material', 'PART-008', '散热风扇 120mm', 3, '个', 2, NOW(), 'admin', NOW(), 'admin');

-- 演示工艺路线
INSERT INTO sp_flow (id, flow, flow_desc, process, create_time, create_username, update_time, update_username)
VALUES
('flow-mb', 'FLOW-MB-001', '主板装配工艺', 'OPR-001→', NOW(), 'admin', NOW(), 'admin'),
('flow-case', 'FLOW-CASE-001', '机箱装配工艺', 'OPR-002→', NOW(), 'admin', NOW(), 'admin'),
('flow-host', 'FLOW-HOST-001', '主机总装工艺', 'OPR-001→OPR-002→', NOW(), 'admin', NOW(), 'admin');

-- BOM-Flow 绑定
INSERT INTO sp_bom_flow (id, bom_id, flow_id, status, remark, sort_order, create_time, create_username, update_time, update_username)
VALUES
('bf-001', 'bom-comp-001', 'flow-mb', 'draft', '步骤1：主板单元装配', 0, NOW(), 'admin', NOW(), 'admin'),
('bf-002', 'bom-comp-002', 'flow-case', 'draft', '步骤1：机箱单元装配', 1, NOW(), 'admin', NOW(), 'admin'),
('bf-003', 'bom-sub-001', 'flow-host', 'draft', '步骤1-2：主机半成品总装', 0, NOW(), 'admin', NOW(), 'admin');
