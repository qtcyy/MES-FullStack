-- MySQL dump 10.13  Distrib 8.0.37, for macos14 (arm64)
--
-- Host: 127.0.0.1    Database: mes_data
-- ------------------------------------------------------
-- Server version	8.0.37

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

--
-- Current Database: `mes_data`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `mes_data` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `mes_data`;

--
-- Table structure for table `sp_bom`
--

DROP TABLE IF EXISTS `sp_bom`;
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

--
-- Dumping data for table `sp_bom`
--

LOCK TABLES `sp_bom` WRITE;
/*!40000 ALTER TABLE `sp_bom` DISABLE KEYS */;
INSERT INTO `sp_bom` VALUES ('1268447170115383298','bbbbb','t002','t002','','1',NULL,NULL,'0','2020-06-04 15:39:07','admin','2020-07-16 11:17:20','admin'),('1268811409925582850','0001','2019001','电子元件','','1',NULL,NULL,'0','2020-06-05 15:46:28','admin','2020-07-16 13:30:08','admin'),('1270189758686146562','测试','123','123','','1',NULL,NULL,'0','2020-06-09 11:03:32','admin','2020-07-04 15:32:47','admin'),('1272019534564536322','打算','123','123','','1',NULL,NULL,'2','2020-06-14 12:14:25','admin','2020-07-09 15:10:38','admin'),('1272783744282112002','阿斯顿发送到','t002','t002','','1',NULL,NULL,'0','2020-06-16 14:51:06','admin','2020-06-16 14:51:06','admin'),('1276415594372247554','77','123','123','','1',NULL,NULL,'0','2020-06-26 15:22:47','admin','2020-07-08 15:30:46','admin'),('1276535719725346818','001','123','123','','1',NULL,NULL,'0','2020-06-26 23:20:07','admin','2020-06-26 23:20:07','admin'),('1277125952237973506','A0001','t002','t002','','1',NULL,NULL,'0','2020-06-28 14:25:30','admin','2020-06-28 14:25:30','admin'),('1277599659653836802','Y001','Y001','Y001','','1',NULL,NULL,'0','2020-06-29 21:47:50','admin','2020-06-29 21:47:50','admin'),('1278528374608998401','dc001','Y001','Y001','','1',NULL,NULL,'0','2020-07-02 11:18:13','admin','2020-07-02 11:18:13','admin'),('1280124062753075202','11111','002-2918','曲轴','11111','1',NULL,NULL,'0','2020-07-06 20:58:55','admin','2020-07-06 20:58:55','admin'),('1283634934423203842','333','2019001','电子元件','','1',NULL,NULL,'0','2020-07-16 13:29:52','admin','2020-07-16 13:29:52','admin');
/*!40000 ALTER TABLE `sp_bom` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_bom_flow`
--

DROP TABLE IF EXISTS `sp_bom_flow`;
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
  KEY `idx_bom_id` (`bom_id`),
  KEY `idx_flow_id` (`flow_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sp_bom_flow`
--

LOCK TABLES `sp_bom_flow` WRITE;
/*!40000 ALTER TABLE `sp_bom_flow` DISABLE KEYS */;
INSERT INTO `sp_bom_flow` VALUES ('2066890561461284865','57de67aabc3a485dafe0e4d4f6b8d872','1275430501520486401','draft','',0,'2026-06-16 22:28:05','admin','2026-06-16 22:28:05','admin'),('97cd5785d6654b02a291835b94b769f2','bom-root-001','1275430501520486401','draft',NULL,0,'2026-06-07 18:28:04','admin','2026-06-07 18:28:04','admin'),('bf-001','bom-comp-001','flow-mb','locked','步骤1：主板单元装配',0,'2026-06-07 18:21:54','admin','2026-06-07 18:27:55','admin'),('bf-002','bom-comp-002','flow-case','locked','步骤1：机箱单元装配',1,'2026-06-07 18:21:54','admin','2026-06-07 18:27:55','admin'),('bf-003','bom-sub-001','flow-host','locked','步骤1-2：主机半成品总装',0,'2026-06-07 18:21:54','admin','2026-06-07 18:27:55','admin');
/*!40000 ALTER TABLE `sp_bom_flow` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_bom_item`
--

DROP TABLE IF EXISTS `sp_bom_item`;
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

--
-- Dumping data for table `sp_bom_item`
--

LOCK TABLES `sp_bom_item` WRITE;
/*!40000 ALTER TABLE `sp_bom_item` DISABLE KEYS */;
/*!40000 ALTER TABLE `sp_bom_item` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_component`
--

DROP TABLE IF EXISTS `sp_component`;
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

--
-- Dumping data for table `sp_component`
--

LOCK TABLES `sp_component` WRITE;
/*!40000 ALTER TABLE `sp_component` DISABLE KEYS */;
INSERT INTO `sp_component` VALUES ('2063546337013641217','COMP-001','阀门','355mm阀门','0','2026-06-07 16:59:20','admin','2026-06-08 13:20:38','admin');
/*!40000 ALTER TABLE `sp_component` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_device`
--

DROP TABLE IF EXISTS `sp_device`;
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

--
-- Dumping data for table `sp_device`
--

LOCK TABLES `sp_device` WRITE;
/*!40000 ALTER TABLE `sp_device` DISABLE KEYS */;
INSERT INTO `sp_device` VALUES ('2063228418094280706','DS11-2','DS11-2','11','22','333',NULL,NULL,'2','','0','2026-06-06 19:56:02','admin','2026-06-06 19:56:02','admin'),('8ad43e02619d11f1aebc664b457a9374','DS11-1','DS11-1','通用设备',NULL,NULL,NULL,NULL,'0','','0','2026-06-06 19:47:49','admin','2026-06-06 19:55:34','admin');
/*!40000 ALTER TABLE `sp_device` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_device_group`
--

DROP TABLE IF EXISTS `sp_device_group`;
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

--
-- Dumping data for table `sp_device_group`
--

LOCK TABLES `sp_device_group` WRITE;
/*!40000 ALTER TABLE `sp_device_group` DISABLE KEYS */;
INSERT INTO `sp_device_group` VALUES ('8ad45608619d11f1aebc664b457a9374','EG-1','设备编组1','设备编组1','0','2026-06-06 19:47:49','admin','2026-06-06 19:47:49','admin');
/*!40000 ALTER TABLE `sp_device_group` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_device_group_item`
--

DROP TABLE IF EXISTS `sp_device_group_item`;
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

--
-- Dumping data for table `sp_device_group_item`
--

LOCK TABLES `sp_device_group_item` WRITE;
/*!40000 ALTER TABLE `sp_device_group_item` DISABLE KEYS */;
INSERT INTO `sp_device_group_item` VALUES ('2069226353659482114','8ad45608619d11f1aebc664b457a9374','2063228418094280706','2026-06-23 09:09:42','admin','2026-06-23 09:09:42','admin');
/*!40000 ALTER TABLE `sp_device_group_item` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_factroy`
--

DROP TABLE IF EXISTS `sp_factroy`;
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

--
-- Dumping data for table `sp_factroy`
--

LOCK TABLES `sp_factroy` WRITE;
/*!40000 ALTER TABLE `sp_factroy` DISABLE KEYS */;
INSERT INTO `sp_factroy` VALUES ('1336542027055136','center','中心工厂123','2020-03-12 15:22:02','admin','2020-03-13 10:15:54','admin'),('1336542142398496','123','你好','2020-03-12 15:22:37','admin','2020-03-12 15:22:37','admin'),('1336542951899168','ABC','ABC','2020-03-12 15:29:03','admin','2020-03-12 15:29:03','admin'),('1336850679595040','测试数据12','测试数据12','2020-03-14 08:14:39','admin','2020-03-14 08:14:39','admin'),('1336856843124768','测试数据2','测试数据2','2020-03-14 09:03:38','admin','2020-03-14 09:03:38','admin'),('1336858327908384','你好','你好123','2020-03-14 09:15:26','admin','2020-03-14 09:17:30','admin'),('1336858648772640','订单','的','2020-03-14 09:17:59','admin','2020-03-14 09:17:59','admin'),('1336873681158176','we','wewe','2020-03-14 11:17:27','admin','2020-03-14 11:17:27','admin'),('1336873716809760','ds','sdsdds','2020-03-14 11:17:44','admin','2020-03-14 11:17:44','admin');
/*!40000 ALTER TABLE `sp_factroy` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_flow`
--

DROP TABLE IF EXISTS `sp_flow`;
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

--
-- Dumping data for table `sp_flow`
--

LOCK TABLES `sp_flow` WRITE;
/*!40000 ALTER TABLE `sp_flow` DISABLE KEYS */;
INSERT INTO `sp_flow` VALUES ('1274977236873883649','666','666','装配工序->测试工序->集成测试工序->封胶工序->清洗工序->包装工序','2020-06-22 16:07:16','admin','2020-07-20 20:49:33','admin'),('1275430361590116354','002','111','装配工序->包装工序','2020-06-23 22:07:49','admin','2020-06-23 22:07:49','admin'),('1275430501520486401','111','222','测试工序->焊接','2020-06-23 22:08:23','admin','2020-07-16 09:01:20','admin'),('1277125413169246210','asfds','sdfsd','装配工序->测试工序->封胶工序','2020-06-28 14:23:21','admin','2020-07-20 22:08:39','admin'),('1277176874674663425','A01','A01','装配工序->测试工序','2020-06-28 17:47:50','admin','2020-07-18 20:02:47','admin'),('1277600512544583681','A001','A001','装配工序->测试工序->包装工序','2020-06-29 21:51:14','admin','2020-06-29 21:51:14','admin'),('1278145622063689729','1212','1212','装配工序->包装工序','2020-07-01 09:57:18','admin','2020-07-01 09:57:18','admin'),('1278528234456330242','dc001','斗车','装配工序->测试工序->包装工序','2020-07-02 11:17:40','admin','2020-07-02 11:17:40','admin'),('1279942838902304770','000005','0005','装配工序->包装工序','2020-07-06 08:58:48','admin','2020-07-06 08:59:11','admin'),('1285142116192968706','1234','12222','装配工序->集成测试工序->封胶工序','2020-07-20 17:18:52','admin','2020-07-20 17:18:52','admin'),('flow-case','FLOW-CASE-001','机箱装配工艺','OPR-002→','2026-06-07 18:21:54','admin','2026-06-07 18:21:54','admin'),('flow-host','FLOW-HOST-001','主机总装工艺','OPR-001→OPR-002→','2026-06-07 18:21:54','admin','2026-06-07 18:21:54','admin'),('flow-mb','FLOW-MB-001','主板装配工艺','OPR-001→','2026-06-07 18:21:54','admin','2026-06-07 18:21:54','admin');
/*!40000 ALTER TABLE `sp_flow` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_flow_oper_relation`
--

DROP TABLE IF EXISTS `sp_flow_oper_relation`;
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

--
-- Dumping data for table `sp_flow_oper_relation`
--

LOCK TABLES `sp_flow_oper_relation` WRITE;
/*!40000 ALTER TABLE `sp_flow_oper_relation` DISABLE KEYS */;
INSERT INTO `sp_flow_oper_relation` VALUES ('1267713369412186113','1267713369349271553','1111','','','1336864489340960','ASY-01','1336864537575456','TST-02',1,NULL,'2020-06-02 15:03:15','admin','2020-06-02 15:03:15','admin'),('1267713369412186114','1267713369349271553','1111','1336864489340960','ASY-01','1336864537575456','TST-02','','',2,NULL,'2020-06-02 15:03:15','admin','2020-06-02 15:03:15','admin'),('1267788592622841858','1267788592555732994','01','','','1336864489340960','ASY-01','1336864537575456','TST-02',1,NULL,'2020-06-02 20:02:10','admin','2020-06-02 20:02:10','admin'),('1267788592622841859','1267788592555732994','01','1336864489340960','ASY-01','1336864537575456','TST-02','1336864575324192','APK-01',2,NULL,'2020-06-02 20:02:10','admin','2020-06-02 20:02:10','admin'),('1267788592622841860','1267788592555732994','01','1336864537575456','TST-02','1336864575324192','APK-01','1336864613072928','TST-01',3,NULL,'2020-06-02 20:02:10','admin','2020-06-02 20:02:10','admin'),('1267788592622841861','1267788592555732994','01','1336864575324192','APK-01','1336864613072928','TST-01','','',4,NULL,'2020-06-02 20:02:10','admin','2020-06-02 20:02:10','admin'),('1267990052920864770','1265284426327371778','1','','','1336864489340960','ASY-01','1336864537575456','TST-02',1,NULL,'2020-06-03 09:22:41','admin','2020-06-03 09:22:41','admin'),('1267990052920864771','1265284426327371778','1','1336864489340960','ASY-01','1336864537575456','TST-02','1336868507484192','JS-01',2,NULL,'2020-06-03 09:22:41','admin','2020-06-03 09:22:41','admin'),('1267990052920864772','1265284426327371778','1','1336864537575456','TST-02','1336868507484192','JS-01','1336864575324192','APK-01',3,NULL,'2020-06-03 09:22:41','admin','2020-06-03 09:22:41','admin'),('1267990052920864773','1265284426327371778','1','1336868507484192','JS-01','1336864575324192','APK-01','','',4,NULL,'2020-06-03 09:22:41','admin','2020-06-03 09:22:41','admin'),('1267990103424479234','1265589028092358657','1111','','','1336864489340960','ASY-01','1336864575324192','APK-01',1,NULL,'2020-06-03 09:22:53','admin','2020-06-03 09:22:53','admin'),('1267990103424479235','1265589028092358657','1111','1336864489340960','ASY-01','1336864575324192','APK-01','1337248255574048','RK-01',2,NULL,'2020-06-03 09:22:53','admin','2020-06-03 09:22:53','admin'),('1267990103424479236','1265589028092358657','1111','1336864575324192','APK-01','1337248255574048','RK-01','1336868360683552','HJ-01',3,NULL,'2020-06-03 09:22:53','admin','2020-06-03 09:22:53','admin'),('1267990103424479237','1265589028092358657','1111','1337248255574048','RK-01','1336868360683552','HJ-01','','',4,NULL,'2020-06-03 09:22:53','admin','2020-06-03 09:22:53','admin'),('1268001010259046402','1268001010166771713','22','','','1336864489340960','ASY-01','1336864537575456','TST-02',1,NULL,'2020-06-03 10:06:14','admin','2020-06-03 10:06:14','admin'),('1268001010259046403','1268001010166771713','22','1336864489340960','ASY-01','1336864537575456','TST-02','1336864575324192','APK-01',2,NULL,'2020-06-03 10:06:14','admin','2020-06-03 10:06:14','admin'),('1268001010259046404','1268001010166771713','22','1336864537575456','TST-02','1336864575324192','APK-01','1336864613072928','TST-01',3,NULL,'2020-06-03 10:06:14','admin','2020-06-03 10:06:14','admin'),('1268001010259046405','1268001010166771713','22','1336864575324192','APK-01','1336864613072928','TST-01','1336868360683552','HJ-01',4,NULL,'2020-06-03 10:06:14','admin','2020-06-03 10:06:14','admin'),('1268001010259046406','1268001010166771713','22','1336864613072928','TST-01','1336868360683552','HJ-01','1336868452958240','FJ-01',5,NULL,'2020-06-03 10:06:14','admin','2020-06-03 10:06:14','admin'),('1268001010259046407','1268001010166771713','22','1336868360683552','HJ-01','1336868452958240','FJ-01','1336868507484192','JS-01',6,NULL,'2020-06-03 10:06:14','admin','2020-06-03 10:06:14','admin'),('1268001010259046408','1268001010166771713','22','1336868452958240','FJ-01','1336868507484192','JS-01','1336868562010144','QX-01',7,NULL,'2020-06-03 10:06:14','admin','2020-06-03 10:06:14','admin'),('1268001010259046409','1268001010166771713','22','1336868507484192','JS-01','1336868562010144','QX-01','1337248255574048','RK-01',8,NULL,'2020-06-03 10:06:14','admin','2020-06-03 10:06:14','admin'),('1268001010259046410','1268001010166771713','22','1336868562010144','QX-01','1337248255574048','RK-01','','',9,NULL,'2020-06-03 10:06:14','admin','2020-06-03 10:06:14','admin'),('1270229560290684929','1268552781134016513','撒大声','','','1336864489340960','ASY-01','1336864575324192','APK-01',1,NULL,'2020-06-09 13:41:42','admin','2020-06-09 13:41:42','admin'),('1270229560290684930','1268552781134016513','撒大声','1336864489340960','ASY-01','1336864575324192','APK-01','1336864613072928','TST-01',2,NULL,'2020-06-09 13:41:42','admin','2020-06-09 13:41:42','admin'),('1270229560290684931','1268552781134016513','撒大声','1336864575324192','APK-01','1336864613072928','TST-01','','',3,NULL,'2020-06-09 13:41:42','admin','2020-06-09 13:41:42','admin'),('1270954114197729281','1270954114151591937','121','','','1336864489340960','ASY-01','1336864575324192','APK-01',1,NULL,'2020-06-11 13:40:49','admin','2020-06-11 13:40:49','admin'),('1270954114197729282','1270954114151591937','121','1336864489340960','ASY-01','1336864575324192','APK-01','','',2,NULL,'2020-06-11 13:40:49','admin','2020-06-11 13:40:49','admin'),('1270954292094939138','1270954193277136898','222222','','','1336864537575456','TST-02','1336868360683552','HJ-01',1,NULL,'2020-06-11 13:41:31','admin','2020-06-11 13:41:31','admin'),('1270954292094939139','1270954193277136898','222222','1336864537575456','TST-02','1336868360683552','HJ-01','','',2,NULL,'2020-06-11 13:41:31','admin','2020-06-11 13:41:31','admin'),('1275430361636253697','1275430361590116354','002','','','1336864489340960','ASY-01','1336864575324192','APK-01',1,NULL,'2020-06-23 22:07:49','admin','2020-06-23 22:07:49','admin'),('1275430361636253698','1275430361590116354','002','1336864489340960','ASY-01','1336864575324192','APK-01','','',2,NULL,'2020-06-23 22:07:49','admin','2020-06-23 22:07:49','admin'),('1277600512599109634','1277600512544583681','A001','','','1336864489340960','ASY-01','1336864537575456','TST-02',1,NULL,'2020-06-29 21:51:14','admin','2020-06-29 21:51:14','admin'),('1277600512599109635','1277600512544583681','A001','1336864489340960','ASY-01','1336864537575456','TST-02','1336864575324192','APK-01',2,NULL,'2020-06-29 21:51:14','admin','2020-06-29 21:51:14','admin'),('1277600512599109636','1277600512544583681','A001','1336864537575456','TST-02','1336864575324192','APK-01','','',3,NULL,'2020-06-29 21:51:14','admin','2020-06-29 21:51:14','admin'),('1278145622248239105','1278145622063689729','1212','','','1336864489340960','ASY-01','1336864575324192','APK-01',1,NULL,'2020-07-01 09:57:18','admin','2020-07-01 09:57:18','admin'),('1278145622248239106','1278145622063689729','1212','1336864489340960','ASY-01','1336864575324192','APK-01','','',2,NULL,'2020-07-01 09:57:18','admin','2020-07-01 09:57:18','admin'),('1278528234506661890','1278528234456330242','dc001','','','1336864489340960','ASY-01','1336864537575456','TST-02',1,NULL,'2020-07-02 11:17:40','admin','2020-07-02 11:17:40','admin'),('1278528234506661891','1278528234456330242','dc001','1336864489340960','ASY-01','1336864537575456','TST-02','1336864575324192','APK-01',2,NULL,'2020-07-02 11:17:40','admin','2020-07-02 11:17:40','admin'),('1278528234506661892','1278528234456330242','dc001','1336864537575456','TST-02','1336864575324192','APK-01','','',3,NULL,'2020-07-02 11:17:40','admin','2020-07-02 11:17:40','admin'),('1279942938785460225','1279942838902304770','000005','','','1336864489340960','ASY-01','1336864575324192','APK-01',1,NULL,'2020-07-06 08:59:11','admin','2020-07-06 08:59:11','admin'),('1279942938785460226','1279942838902304770','000005','1336864489340960','ASY-01','1336864575324192','APK-01','','',2,NULL,'2020-07-06 08:59:11','admin','2020-07-06 08:59:11','admin'),('1283567357256773634','1275430501520486401','111','','','1336864537575456','TST-02','1336868360683552','HJ-01',1,NULL,'2020-07-16 09:01:20','admin','2020-07-16 09:01:20','admin'),('1283567357256773635','1275430501520486401','111','1336864537575456','TST-02','1336868360683552','HJ-01','','',2,NULL,'2020-07-16 09:01:20','admin','2020-07-16 09:01:20','admin'),('1284458592561508353','1277176874674663425','A01','','','1336864489340960','ASY-01','1336864537575456','TST-02',1,NULL,'2020-07-18 20:02:47','admin','2020-07-18 20:02:47','admin'),('1284458592561508354','1277176874674663425','A01','1336864489340960','ASY-01','1336864537575456','TST-02','','',2,NULL,'2020-07-18 20:02:47','admin','2020-07-18 20:02:47','admin'),('1285142116356546562','1285142116192968706','1234','','','1336864489340960','ASY-01','1336864613072928','TST-01',1,NULL,'2020-07-20 17:18:52','admin','2020-07-20 17:18:52','admin'),('1285142116385906690','1285142116192968706','1234','1336864489340960','ASY-01','1336864613072928','TST-01','1336868452958240','FJ-01',2,NULL,'2020-07-20 17:18:52','admin','2020-07-20 17:18:52','admin'),('1285142116385906691','1285142116192968706','1234','1336864613072928','TST-01','1336868452958240','FJ-01','','',3,NULL,'2020-07-20 17:18:52','admin','2020-07-20 17:18:52','admin'),('1285195135865544705','1274977236873883649','666','','','1336864489340960','ASY-01','1336864537575456','TST-02',1,NULL,'2020-07-20 20:49:33','admin','2020-07-20 20:49:33','admin'),('1285195135865544706','1274977236873883649','666','1336864489340960','ASY-01','1336864537575456','TST-02','1336864613072928','TST-01',2,NULL,'2020-07-20 20:49:33','admin','2020-07-20 20:49:33','admin'),('1285195135865544707','1274977236873883649','666','1336864537575456','TST-02','1336864613072928','TST-01','1336868452958240','FJ-01',3,NULL,'2020-07-20 20:49:33','admin','2020-07-20 20:49:33','admin'),('1285195135865544708','1274977236873883649','666','1336864613072928','TST-01','1336868452958240','FJ-01','1336868562010144','QX-01',4,NULL,'2020-07-20 20:49:33','admin','2020-07-20 20:49:33','admin'),('1285195135865544709','1274977236873883649','666','1336868452958240','FJ-01','1336868562010144','QX-01','1336864575324192','APK-01',5,NULL,'2020-07-20 20:49:33','admin','2020-07-20 20:49:33','admin'),('1285195135865544710','1274977236873883649','666','1336868562010144','QX-01','1336864575324192','APK-01','','',6,NULL,'2020-07-20 20:49:33','admin','2020-07-20 20:49:33','admin'),('1285215041575149569','1277125413169246210','asfds','','','1336864489340960','ASY-01','1336864537575456','TST-02',1,NULL,'2020-07-20 22:08:39','admin','2020-07-20 22:08:39','admin'),('1285215041575149570','1277125413169246210','asfds','1336864489340960','ASY-01','1336864537575456','TST-02','1336868452958240','FJ-01',2,NULL,'2020-07-20 22:08:39','admin','2020-07-20 22:08:39','admin'),('1285215041575149571','1277125413169246210','asfds','1336864537575456','TST-02','1336868452958240','FJ-01','','',3,NULL,'2020-07-20 22:08:39','admin','2020-07-20 22:08:39','admin'),('b4c65656-625a-11f1-aebc-664b457a9374','flow-mb','FLOW-MB-001',NULL,NULL,'1368297e625511f1aebc664b457a9374','OPR-001',NULL,NULL,1,'firstOper','2026-06-07 18:21:54','admin','2026-06-07 18:21:54','admin'),('b4c68d7e-625a-11f1-aebc-664b457a9374','flow-case','FLOW-CASE-001',NULL,NULL,'13682cee625511f1aebc664b457a9374','OPR-002',NULL,NULL,1,'firstOper','2026-06-07 18:21:54','admin','2026-06-07 18:21:54','admin'),('b4c69a8a-625a-11f1-aebc-664b457a9374','flow-host','FLOW-HOST-001',NULL,NULL,'1368297e625511f1aebc664b457a9374','OPR-001',NULL,NULL,1,'firstOper','2026-06-07 18:21:54','admin','2026-06-07 18:21:54','admin'),('b4c6ad72-625a-11f1-aebc-664b457a9374','flow-host','FLOW-HOST-001','1368297e625511f1aebc664b457a9374','OPR-001','13682cee625511f1aebc664b457a9374','OPR-002',NULL,NULL,2,'lastOper','2026-06-07 18:21:54','admin','2026-06-07 18:21:54','admin');
/*!40000 ALTER TABLE `sp_flow_oper_relation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_inventory`
--

DROP TABLE IF EXISTS `sp_inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_inventory` (
  `id` varchar(64) NOT NULL COMMENT '主键',
  `material_code` varchar(50) NOT NULL COMMENT '物料编码',
  `material_desc` varchar(200) DEFAULT NULL COMMENT '物料描述',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `warehouse_id` varchar(64) NOT NULL COMMENT '库房ID',
  `warehouse_name` varchar(64) DEFAULT NULL COMMENT '库房名称',
  `location_id` varchar(64) NOT NULL COMMENT '库位ID',
  `location_code` varchar(32) DEFAULT NULL COMMENT '库位编码',
  `quantity` decimal(10,2) DEFAULT '0.00' COMMENT '库存数量',
  `status` varchar(20) DEFAULT 'available' COMMENT 'available=可用',
  `last_inbound_time` datetime DEFAULT NULL COMMENT '最近入库时间',
  `create_time` datetime NOT NULL,
  `create_username` varchar(64) NOT NULL,
  `update_time` datetime NOT NULL,
  `update_username` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_location` (`location_id`),
  KEY `idx_material` (`material_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='物料库存表(库位级)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sp_inventory`
--

LOCK TABLES `sp_inventory` WRITE;
/*!40000 ALTER TABLE `sp_inventory` DISABLE KEYS */;
INSERT INTO `sp_inventory` VALUES ('2066051385664860161','PART-001','CPU i7-13700K','个','wh-parts-001','电脑配件库','loc-parts-02','1-010102',100.00,'available','2026-06-14 14:53:30','2026-06-14 14:53:30','admin','2026-06-14 14:53:30','admin'),('2067492107769122818','PART-003','SSD 1TB NVMe','个','2063239974832054274','仓库1','2064530419608580098','1-010101',30.00,'available','2026-06-18 14:18:25','2026-06-18 14:18:25','admin','2026-06-18 14:18:25','admin'),('inv-seed-02','PART-002','DDR5 32GB 内存','条','wh-parts-001','电脑配件库','loc-parts-01','1-010101',200.00,'available','2026-06-17 19:48:21','2026-06-14 17:36:44','admin','2026-06-17 19:48:21','admin'),('inv-seed-03','PART-003','SSD 1TB NVMe','个','wh-parts-001','电脑配件库','loc-parts-03','1-010201',150.00,'available','2026-06-18 14:17:08','2026-06-14 17:36:44','admin','2026-06-18 14:18:25','admin'),('inv-seed-04','PART-004','主板 Z790','个','wh-parts-001','电脑配件库','loc-parts-04','1-010202',100.00,'available','2026-06-14 17:36:44','2026-06-14 17:36:44','admin','2026-06-14 17:36:44','admin'),('inv-seed-05','PART-005','CPU散热器','个','wh-parts-001','电脑配件库','loc-parts-05','1-020101',200.00,'available','2026-06-17 19:48:50','2026-06-14 17:36:44','admin','2026-06-17 19:48:50','admin'),('inv-seed-06','PART-006','机箱外壳 ATX','个','wh-parts-001','电脑配件库','loc-parts-06','1-020102',100.00,'available','2026-06-14 17:36:44','2026-06-14 17:36:44','admin','2026-06-14 17:36:44','admin'),('inv-seed-07','PART-007','电源 750W 金牌','个','wh-parts-001','电脑配件库','loc-parts-07','1-020201',100.00,'available','2026-06-14 17:36:44','2026-06-14 17:36:44','admin','2026-06-14 17:36:44','admin'),('inv-seed-08','PART-008','散热风扇 120mm','个','wh-parts-001','电脑配件库','loc-parts-08','1-020202',100.00,'available','2026-06-14 17:36:44','2026-06-14 17:36:44','admin','2026-06-14 17:36:44','admin');
/*!40000 ALTER TABLE `sp_inventory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_line`
--

DROP TABLE IF EXISTS `sp_line`;
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

--
-- Dumping data for table `sp_line`
--

LOCK TABLES `sp_line` WRITE;
/*!40000 ALTER TABLE `sp_line` DISABLE KEYS */;
INSERT INTO `sp_line` VALUES ('1336867983196192','WZY-ASY-01','装配线体01线','从vv','2020-03-14 10:32:10','admin','2020-06-14 02:20:09','admin'),('1336868041916448','WZY-TEST-01','测试01线体','TST','2020-03-14 10:32:38','admin','2020-03-14 10:32:38','admin'),('1336868662673440','WZY-DC-01','电池组装01线','ASY','2020-03-14 10:37:34','admin','2020-06-16 11:47:04','admin');
/*!40000 ALTER TABLE `sp_line` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_materile`
--

DROP TABLE IF EXISTS `sp_materile`;
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

--
-- Dumping data for table `sp_materile`
--

LOCK TABLES `sp_materile` WRITE;
/*!40000 ALTER TABLE `sp_materile` DISABLE KEYS */;
INSERT INTO `sp_materile` VALUES ('1284051625900748801','000001','答辩XZH','件','产品1组','FG','大','8*8','1279942838902304770','0005','2020-07-17 17:05:39','admin','2026-06-09 09:49:07','admin','0','',1,0,'http://localhost:9000/mes/materile/27596eebc2184cb4bcb7dae3223c7b2c.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=minioadmin%2F20260609%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260609T014905Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Signature=d7caf877c1502d96708b96e16ae89f50cb6e8fcca0609c95ebc8ef1804581dde'),('2063237202598445057','PART-001','CPU i7-13700K','个','AA','零件','大','7.62mm','1277600512544583681','A001','2026-06-06 20:30:57','admin','2026-06-06 20:36:13','admin','0','自制',2,300,'/basedata/materile/image/8f148abf3dd74585ae61a2f28a16552a.png'),('94e1fa14-6252-11f1-aebc-664b457a9374','PROD-001','台式电脑主机','台',NULL,'产品',NULL,NULL,NULL,NULL,'2026-06-07 17:23:44','admin','2026-06-07 17:23:44','admin','0',NULL,1,0,NULL),('94e2082e-6252-11f1-aebc-664b457a9374','PART-002','DDR5 32GB 内存','条',NULL,'零件',NULL,NULL,NULL,NULL,'2026-06-07 17:23:44','admin','2026-06-07 17:23:44','admin','0',NULL,1,0,NULL),('94e20a36-6252-11f1-aebc-664b457a9374','PART-003','SSD 1TB NVMe','个',NULL,'零件',NULL,NULL,NULL,NULL,'2026-06-07 17:23:44','admin','2026-06-07 17:23:44','admin','0',NULL,1,0,NULL),('94e20bb2-6252-11f1-aebc-664b457a9374','PART-004','主板 Z790','个',NULL,'零件',NULL,NULL,NULL,NULL,'2026-06-07 17:23:44','admin','2026-06-07 17:23:44','admin','0',NULL,1,0,NULL),('94e20d06-6252-11f1-aebc-664b457a9374','PART-005','CPU散热器','个',NULL,'零件',NULL,NULL,NULL,NULL,'2026-06-07 17:23:44','admin','2026-06-07 17:23:44','admin','0',NULL,1,0,NULL),('94e20e46-6252-11f1-aebc-664b457a9374','PART-006','机箱外壳 ATX','个',NULL,'零件',NULL,NULL,NULL,NULL,'2026-06-07 17:23:44','admin','2026-06-07 17:23:44','admin','0',NULL,1,0,NULL),('94e20fa4-6252-11f1-aebc-664b457a9374','PART-007','电源 750W 金牌','个',NULL,'零件',NULL,NULL,NULL,NULL,'2026-06-07 17:23:44','admin','2026-06-07 17:23:44','admin','0',NULL,1,0,NULL),('94e210f8-6252-11f1-aebc-664b457a9374','PART-008','散热风扇 120mm','个',NULL,'零件',NULL,NULL,NULL,NULL,'2026-06-07 17:23:44','admin','2026-06-07 17:23:44','admin','0',NULL,1,0,NULL);
/*!40000 ALTER TABLE `sp_materile` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_oper`
--

DROP TABLE IF EXISTS `sp_oper`;
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

--
-- Dumping data for table `sp_oper`
--

LOCK TABLES `sp_oper` WRITE;
/*!40000 ALTER TABLE `sp_oper` DISABLE KEYS */;
INSERT INTO `sp_oper` VALUES ('1336864489340960','ASY-01','装配工序','2020-03-14 10:04:24','admin','2020-03-14 10:04:24','admin',NULL,NULL,0,0,'1',NULL),('1336864537575456','TST-02','测试工序','2020-03-14 10:04:47','admin','2020-03-14 10:04:47','admin',NULL,NULL,0,0,'1',NULL),('1336864575324192','APK-01','包装工序','2020-03-14 10:05:05','admin','2020-03-14 10:05:05','admin',NULL,NULL,0,0,'1',NULL),('1336864613072928','TST-01','集成测试工序','2020-03-14 10:05:23','admin','2020-03-14 10:05:23','admin',NULL,NULL,0,0,'1',NULL),('1336868360683552','HJ-01','焊接','2020-03-14 10:35:10','admin','2020-03-14 10:35:10','admin',NULL,NULL,0,0,'1',NULL),('1336868452958240','FJ-01','封胶工序','2020-03-14 10:35:54','admin','2020-03-14 10:35:54','admin',NULL,NULL,0,0,'1',NULL),('1336868507484192','JS-01','加酸工序','2020-03-14 10:36:20','admin','2020-03-14 10:36:20','admin',NULL,NULL,0,0,'1',NULL),('1336868562010144','QX-01','清洗工序','2020-03-14 10:36:46','admin','2020-03-14 10:36:46','admin',NULL,NULL,0,0,'1',NULL),('1337248255574048','RK-01','入库工序','2020-03-16 12:54:18','admin','2020-03-16 12:54:18','admin',NULL,NULL,0,0,'1',NULL),('1368297e625511f1aebc664b457a9374','OPR-001','主板组装作业工序','2026-06-07 17:41:36','admin','2026-06-07 17:41:36','admin','OPR-001',NULL,30,45,'1','将CPU、内存、SSD、主板等核心部件组装到主板上'),('13682cee625511f1aebc664b457a9374','OPR-002','机箱组装作业工序','2026-06-07 17:41:36','admin','2026-06-07 17:48:24','admin','OPR-002','2063558470795268097',20,35,'1','将主板单元安装到机箱中，连接电源和数据线');
/*!40000 ALTER TABLE `sp_oper` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_order`
--

DROP TABLE IF EXISTS `sp_order`;
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

--
-- Dumping data for table `sp_order`
--

LOCK TABLES `sp_order` WRITE;
/*!40000 ALTER TABLE `sp_order` DISABLE KEYS */;
INSERT INTO `sp_order` VALUES ('a462c220672a11f184e121cc9eb19e04','GD2024061001','CPU主板量产工单',100,'P','','MAT001','CPU主板','2026-06-10','2026-06-19',2,'2026-06-13 21:20:26','admin','2026-06-13 21:20:26','admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('a4630e1a672a11f184e121cc9eb19e04','GD2024061002','电源模块量产工单',50,'P','','MAT002','电源模块','2026-06-10','2026-06-16',2,'2026-06-13 21:20:26','admin','2026-06-13 21:20:26','admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('MK-ORD-03','GD2024061003','控制板量产工单',80,'P','','MAT003','控制板','2026-06-11','2026-06-19',2,'2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('MK-ORD-04','GD2024061004','外壳验证工单',120,'A','','MAT004','外壳','2026-06-18','2026-06-24',1,'2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('MK-ORD-05','GD2024061005','显示屏量产工单',200,'P','','MAT005','显示屏','2026-06-09','2026-06-13',3,'2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('MK-ORD-06','GD2024061006','线束量产工单',60,'P','','MAT006','线束','2026-06-14','2026-06-22',2,'2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('MK-ORD-07','GD2024061007','主板组件返工工单',150,'F','','MAT007','主板组件','2026-06-10','2026-06-20',2,'2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `sp_order` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_order_dispatch`
--

DROP TABLE IF EXISTS `sp_order_dispatch`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_order_dispatch` (
  `id` varchar(64) NOT NULL COMMENT '主键',
  `order_id` varchar(64) NOT NULL COMMENT '工单ID',
  `team_id` varchar(64) NOT NULL COMMENT '班组ID',
  `user_id` varchar(64) NOT NULL COMMENT '作业员ID',
  `labor_hours` decimal(10,2) DEFAULT NULL COMMENT '工时（小时）',
  `dispatch_status` tinyint DEFAULT '1' COMMENT '派工状态: 1=已派工 2=已开工 3=已完工',
  `plan_start_time` varchar(255) DEFAULT NULL COMMENT '计划开始时间',
  `plan_end_time` varchar(255) DEFAULT NULL COMMENT '计划结束时间',
  `actual_start_time` varchar(255) DEFAULT NULL COMMENT '实际开始时间',
  `actual_end_time` varchar(255) DEFAULT NULL COMMENT '实际结束时间',
  `remark` varchar(500) DEFAULT '' COMMENT '备注',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) NOT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '更新时间',
  `update_username` varchar(64) DEFAULT NULL COMMENT '更新人',
  `oper_id` varchar(64) DEFAULT NULL COMMENT '工序ID(关联sp_oper);订单级派工时为空',
  `progress` int DEFAULT NULL COMMENT '完工进度0-100',
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_team_id` (`team_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='工单派工记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sp_order_dispatch`
--

LOCK TABLES `sp_order_dispatch` WRITE;
/*!40000 ALTER TABLE `sp_order_dispatch` DISABLE KEYS */;
INSERT INTO `sp_order_dispatch` VALUES ('MK-DSP-0101','a462c220672a11f184e121cc9eb19e04','2063224132044075009','1184009088826392578',16.00,3,'2026-06-10','2026-06-12','2026-06-10','2026-06-13','延期1天完成','2026-06-09 09:00:00','admin','2026-06-13 17:00:00','admin','1336864489340960',100),('MK-DSP-0102','a462c220672a11f184e121cc9eb19e04','2063224132044075009','1184009088826392578',16.00,2,'2026-06-19 08:30:00','2026-06-21 17:45:00','2026-06-18 10:00:00',NULL,'进行中','2026-06-09 09:00:00','admin','2026-06-18 14:20:20','admin','1336864537575456',60),('MK-DSP-0103','a462c220672a11f184e121cc9eb19e04','2063224132044075009','1184009088826392578',8.00,2,'2026-06-19','2026-06-20','2026-06-18 09:00:00',NULL,'待开工','2026-06-09 09:00:00','admin','2026-06-22 09:14:59','admin','1336864575324192',0),('MK-DSP-0201','a4630e1a672a11f184e121cc9eb19e04','2063224132044075009','1184010472443396098',24.00,3,'2026-06-10','2026-06-14','2026-06-11','2026-06-15','','2026-06-09 09:00:00','admin','2026-06-15 17:00:00','admin','1336868360683552',100),('MK-DSP-0202','a4630e1a672a11f184e121cc9eb19e04','2063224132044075009','1184010472443396098',8.00,2,'2026-06-15','2026-06-16','2026-06-16',NULL,'逾期未完成','2026-06-09 09:00:00','admin','2026-06-17 09:00:00','admin','1337248255574048',40),('MK-DSP-0301','MK-ORD-03','48ad7f4a619b11f1aebc664b457a9374','1276512902757724162',16.00,3,'2026-06-11','2026-06-13','2026-06-11','2026-06-13','','2026-06-09 09:00:00','admin','2026-06-13 17:00:00','admin','1336864489340960',100),('MK-DSP-0302','MK-ORD-03','48ad7f4a619b11f1aebc664b457a9374','1276512902757724162',24.00,2,'2026-06-14','2026-06-18','2026-06-15',NULL,'进行中','2026-06-09 09:00:00','admin','2026-06-17 09:00:00','admin','1336864613072928',70),('MK-DSP-0303','MK-ORD-03','48ad7f4a619b11f1aebc664b457a9374','1266201180838801409',8.00,2,'2026-06-13','2026-06-15','2026-06-13',NULL,'逾期','2026-06-09 09:00:00','admin','2026-06-17 09:00:00','admin','1336864575324192',50),('MK-DSP-0401','MK-ORD-04','48ad7f4a619b11f1aebc664b457a9374','1266201180838801409',24.00,1,'2026-06-18','2026-06-21',NULL,NULL,'','2026-06-09 09:00:00','admin','2026-06-17 13:03:37','admin','1336868360683552',0),('MK-DSP-0402','MK-ORD-04','48ad7f4a619b11f1aebc664b457a9374','1266201180838801409',16.00,1,'2026-06-20','2026-06-23',NULL,NULL,'','2026-06-09 09:00:00','admin','2026-06-17 12:55:21','admin','1336868452958240',0),('MK-DSP-0501','MK-ORD-05','2063224132044075009','1184009088826392578',16.00,3,'2026-06-09','2026-06-11','2026-06-09','2026-06-11','','2026-06-09 09:00:00','admin','2026-06-11 17:00:00','admin','1336864489340960',100),('MK-DSP-0502','MK-ORD-05','2063224132044075009','1184010472443396098',16.00,3,'2026-06-11','2026-06-13','2026-06-11','2026-06-13','','2026-06-09 09:00:00','admin','2026-06-13 17:00:00','admin','1336864537575456',100),('MK-DSP-0503','MK-ORD-05','2063224132044075009','1184009088826392578',8.00,3,'2026-06-12','2026-06-13','2026-06-12','2026-06-13','','2026-06-09 09:00:00','admin','2026-06-13 17:00:00','admin','1336864613072928',100),('MK-DSP-0601','MK-ORD-06','48ad7f4a619b11f1aebc664b457a9374','1276512902757724162',16.00,3,'2026-06-14','2026-06-16','2026-06-14','2026-06-16','','2026-06-09 09:00:00','admin','2026-06-16 17:00:00','admin','1336868562010144',100),('MK-DSP-0602','MK-ORD-06','48ad7f4a619b11f1aebc664b457a9374','1276512902757724162',24.00,2,'2026-06-16','2026-06-19','2026-06-17',NULL,'进行中','2026-06-09 09:00:00','admin','2026-06-17 09:00:00','admin','1336868507484192',20),('MK-DSP-0603','MK-ORD-06','2063224132044075009','1184010472443396098',8.00,1,'2026-06-21','2026-06-24',NULL,NULL,'','2026-06-09 09:00:00','admin','2026-06-17 21:23:12','admin','1337248255574048',0),('MK-DSP-0701','MK-ORD-07','2063224132044075009','1184009088826392578',24.00,3,'2026-06-10','2026-06-13','2026-06-12','2026-06-15','延期','2026-06-09 09:00:00','admin','2026-06-15 17:00:00','admin','1336864489340960',100),('MK-DSP-0702','MK-ORD-07','48ad7f4a619b11f1aebc664b457a9374','1266201180838801409',24.00,2,'2026-06-15','2026-06-18','2026-06-16',NULL,'进行中','2026-06-09 09:00:00','admin','2026-06-17 09:00:00','admin','1336868360683552',55),('MK-DSP-0703','MK-ORD-07','2063224132044075009','1184010472443396098',8.00,1,'2026-06-18','2026-06-20',NULL,NULL,'','2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin','1336864537575456',0);
/*!40000 ALTER TABLE `sp_order_dispatch` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_outbound_order`
--

DROP TABLE IF EXISTS `sp_outbound_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_outbound_order` (
  `id` varchar(64) NOT NULL COMMENT '主键',
  `outbound_code` varchar(64) NOT NULL COMMENT '出库单号',
  `order_id` varchar(64) DEFAULT NULL COMMENT '工单ID',
  `order_code` varchar(255) DEFAULT NULL COMMENT '工单编号',
  `product_code` varchar(50) DEFAULT NULL COMMENT '产品编码',
  `product_desc` varchar(200) DEFAULT NULL COMMENT '产品描述',
  `outbound_status` varchar(20) DEFAULT 'pending' COMMENT 'pending=待确认 partial=部分出库 completed=已完成',
  `total_items` int DEFAULT '0' COMMENT '明细总条数',
  `posted_items` int DEFAULT '0' COMMENT '已登账条数',
  `create_time` datetime NOT NULL,
  `create_username` varchar(64) NOT NULL,
  `update_time` datetime NOT NULL,
  `update_username` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_outbound_code` (`outbound_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='出库单主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sp_outbound_order`
--

LOCK TABLES `sp_outbound_order` WRITE;
/*!40000 ALTER TABLE `sp_outbound_order` DISABLE KEYS */;
INSERT INTO `sp_outbound_order` VALUES ('ob-20240817-001','CK20240817-00001',NULL,'GD20240817-001','PROD-001','台式电脑主机','partial',4,1,'2026-06-14 17:36:44','admin','2026-06-18 14:18:25','admin'),('ob-20240817-002','CK20240817-00002',NULL,'GD20240817-001','PROD-001','台式电脑主机','pending',4,0,'2026-06-14 17:36:44','admin','2026-06-14 17:36:44','admin');
/*!40000 ALTER TABLE `sp_outbound_order` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_outbound_order_item`
--

DROP TABLE IF EXISTS `sp_outbound_order_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_outbound_order_item` (
  `id` varchar(64) NOT NULL COMMENT '主键',
  `outbound_id` varchar(64) NOT NULL COMMENT '关联出库单ID',
  `material_code` varchar(50) NOT NULL COMMENT '物料编码',
  `material_desc` varchar(200) DEFAULT NULL COMMENT '物料描述',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `quantity` decimal(10,2) NOT NULL COMMENT '需出库数量',
  `post_status` varchar(20) DEFAULT 'pending' COMMENT 'pending=待登账 posted=已登账',
  `allocation_detail` varchar(500) DEFAULT NULL COMMENT 'FIFO扣减库位摘要',
  `posted_at` datetime DEFAULT NULL COMMENT '登账时间',
  `create_time` datetime NOT NULL,
  `create_username` varchar(64) NOT NULL,
  `update_time` datetime NOT NULL,
  `update_username` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_outbound_id` (`outbound_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='出库单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sp_outbound_order_item`
--

LOCK TABLES `sp_outbound_order_item` WRITE;
/*!40000 ALTER TABLE `sp_outbound_order_item` DISABLE KEYS */;
INSERT INTO `sp_outbound_order_item` VALUES ('obi-001-1','ob-20240817-001','PART-001','CPU i7-13700K','个',50.00,'pending',NULL,NULL,'2026-06-14 17:36:44','admin','2026-06-14 17:36:44','admin'),('obi-001-2','ob-20240817-001','PART-002','DDR5 32GB 内存','条',50.00,'pending',NULL,NULL,'2026-06-14 17:36:44','admin','2026-06-14 17:36:44','admin'),('obi-001-3','ob-20240817-001','PART-003','SSD 1TB NVMe','个',50.00,'posted','1-010201×50','2026-06-18 14:18:25','2026-06-14 17:36:44','admin','2026-06-18 14:18:25','admin'),('obi-001-4','ob-20240817-001','PART-004','主板 Z790','个',50.00,'pending',NULL,NULL,'2026-06-14 17:36:44','admin','2026-06-14 17:36:44','admin'),('obi-002-1','ob-20240817-002','PART-005','CPU散热器','个',50.00,'pending',NULL,NULL,'2026-06-14 17:36:44','admin','2026-06-14 17:36:44','admin'),('obi-002-2','ob-20240817-002','PART-006','机箱外壳 ATX','个',50.00,'pending',NULL,NULL,'2026-06-14 17:36:44','admin','2026-06-14 17:36:44','admin'),('obi-002-3','ob-20240817-002','PART-007','电源 750W 金牌','个',50.00,'pending',NULL,NULL,'2026-06-14 17:36:44','admin','2026-06-14 17:36:44','admin'),('obi-002-4','ob-20240817-002','PART-008','散热风扇 120mm','个',50.00,'pending',NULL,NULL,'2026-06-14 17:36:44','admin','2026-06-14 17:36:44','admin');
/*!40000 ALTER TABLE `sp_outbound_order_item` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_process_content`
--

DROP TABLE IF EXISTS `sp_process_content`;
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

--
-- Dumping data for table `sp_process_content`
--

LOCK TABLES `sp_process_content` WRITE;
/*!40000 ALTER TABLE `sp_process_content` DISABLE KEYS */;
INSERT INTO `sp_process_content` VALUES ('06dc184093b843a58f4b1f965fed69bf','6c68d770743b4011bd8e7b7ed4c96e8e',NULL,'111','222','http://localhost:9000/mes/process/3f190752327e455d9cb1201823d6fbab.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=minioadmin%2F20260609%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260609T014807Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Signature=edd835014f488ae47f99e18c41d321ca493add119aba7cf5072d678721ed6d17','dfdf','0','http://localhost:9000/mes/process/f4bd4dc5b67f43a49bb87e6c538b5e75.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=minioadmin%2F20260611%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260611T014618Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Signature=7a88572bbd057b5e9cb22262485ec8122d37a1e491eaa07d6414442b781fb371','aaabbb','completed','2026-06-09 09:48:08','admin','2026-06-11 09:46:55','admin'),('42cbbfa895cf47d59a27fb62a66b199c','57de67aabc3a485dafe0e4d4f6b8d872',NULL,'111','222','','','0','','','draft','2026-06-23 09:14:51','admin','2026-06-23 09:15:03','admin'),('bf05374ca7244ba7ab08878fad0a3b92','7166f575aa054d5c92e5d853458ccd84',NULL,'第一个装配','1\n2\n3\n','/technology/process-content/image/04a90f7acd4f4aab91c6d605ef060801.jpg','112233','0','/technology/process-content/image/b364ca704a6f49cbb0d46354acab1b3c.jpg',NULL,'completed','2026-06-07 20:32:26','admin','2026-06-07 21:40:17','admin');
/*!40000 ALTER TABLE `sp_process_content` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_process_document`
--

DROP TABLE IF EXISTS `sp_process_document`;
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

--
-- Dumping data for table `sp_process_document`
--

LOCK TABLES `sp_process_document` WRITE;
/*!40000 ALTER TABLE `sp_process_document` DISABLE KEYS */;
INSERT INTO `sp_process_document` VALUES ('1e7c5de86b0f4674ac7c297b98887625','06dc184093b843a58f4b1f965fed69bf','252601 物联网考试指南.pdf','http://localhost:9000/mes/process/9c1e9b21f631440791f3edf522655d0e.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=minioadmin%2F20260611%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260611T014630Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Signature=cfb9e51258ab908ccb553eaadcd614b1fd91c0d93c01fd21ba8015e3fb2eaa61','2026-06-11 09:46:30','admin','2026-06-11 09:46:30','admin'),('3145bbbb18d348959d46114d51c36dce','bf05374ca7244ba7ab08878fad0a3b92','333.pdf','/technology/process-content/image/d3c5192a32f4405d839294abb13f890d.pdf','2026-06-07 21:39:44','admin','2026-06-07 21:39:44','admin');
/*!40000 ALTER TABLE `sp_process_document` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_process_equipment`
--

DROP TABLE IF EXISTS `sp_process_equipment`;
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

--
-- Dumping data for table `sp_process_equipment`
--

LOCK TABLES `sp_process_equipment` WRITE;
/*!40000 ALTER TABLE `sp_process_equipment` DISABLE KEYS */;
INSERT INTO `sp_process_equipment` VALUES ('a83060f5059c4fe586e56faffe1de963','bf05374ca7244ba7ab08878fad0a3b92','123',1,'123','2026-06-07 20:49:00','admin','2026-06-07 20:49:00','admin'),('ebf265b021554bfbb2801252194e35de','06dc184093b843a58f4b1f965fed69bf','GPU',1,NULL,'2026-06-11 09:46:48','admin','2026-06-11 09:46:48','admin');
/*!40000 ALTER TABLE `sp_process_equipment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_process_unit`
--

DROP TABLE IF EXISTS `sp_process_unit`;
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

--
-- Dumping data for table `sp_process_unit`
--

LOCK TABLES `sp_process_unit` WRITE;
/*!40000 ALTER TABLE `sp_process_unit` DISABLE KEYS */;
INSERT INTO `sp_process_unit` VALUES ('2063558470795268097','675987','生产组2','人员作业单元','0','','0','2026-06-07 17:47:33','admin','2026-06-07 17:47:33','admin');
/*!40000 ALTER TABLE `sp_process_unit` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_process_unit_team`
--

DROP TABLE IF EXISTS `sp_process_unit_team`;
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

--
-- Dumping data for table `sp_process_unit_team`
--

LOCK TABLES `sp_process_unit_team` WRITE;
/*!40000 ALTER TABLE `sp_process_unit_team` DISABLE KEYS */;
/*!40000 ALTER TABLE `sp_process_unit_team` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_product_bom`
--

DROP TABLE IF EXISTS `sp_product_bom`;
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

--
-- Dumping data for table `sp_product_bom`
--

LOCK TABLES `sp_product_bom` WRITE;
/*!40000 ALTER TABLE `sp_product_bom` DISABLE KEYS */;
INSERT INTO `sp_product_bom` VALUES ('3cf75768175a446ead7500e844b3e97a','PBOM-007','PROD-001','主板单元','f16e78f1b3a84a15946fb6eec66f41f6',2,'V2.0','draft','包含CPU、内存、SSD、主板等核心计算部件',0,NULL,NULL,'2026-06-07 18:34:20','admin','2026-06-07 18:34:20','admin'),('4daebead9f594a968ae71b0e74b7ac38','PBOM-012','PROD-001','主板单元','a08ae51956804c4fb6773c0cc00dbb5c',2,'V2.0','draft','包含CPU、内存、SSD、主板等核心计算部件',0,NULL,NULL,'2026-06-16 19:14:07','admin','2026-06-16 19:14:07','admin'),('57de67aabc3a485dafe0e4d4f6b8d872','PBOM-010','PROD-001','台式电脑主机v2',NULL,0,'V2.0','draft','台式电脑主机产品BOM，首批量产版本',0,NULL,NULL,'2026-06-16 19:14:07','admin','2026-06-16 19:58:08','admin'),('6c68d770743b4011bd8e7b7ed4c96e8e','PBOM-005','PROD-001','台式电脑主机',NULL,0,'V2.0','draft','台式电脑主机产品BOM，首批量产版本',0,NULL,NULL,'2026-06-07 18:34:20','admin','2026-06-07 18:34:20','admin'),('7166f575aa054d5c92e5d853458ccd84','PBOM-009','PROD-001','CPU','6c68d770743b4011bd8e7b7ed4c96e8e',1,'V2.0','草稿',NULL,0,NULL,NULL,'2026-06-07 18:34:39','admin','2026-06-07 18:34:49','admin'),('762ea0352e4d413f990a036742011b89','PBOM-013','PROD-001','机箱单元','a08ae51956804c4fb6773c0cc00dbb5c',2,'V2.0','draft','包含机箱、电源、散热风扇等外部设备',1,NULL,NULL,'2026-06-16 19:14:07','admin','2026-06-16 19:14:07','admin'),('a08ae51956804c4fb6773c0cc00dbb5c','PBOM-011','PROD-001','台式电脑半成品','57de67aabc3a485dafe0e4d4f6b8d872',1,'V2.0','draft','台式电脑主机半成品组装单元，包含主板和机箱两个子组件',0,NULL,NULL,'2026-06-16 19:14:07','admin','2026-06-16 19:14:07','admin'),('bom-comp-001','PBOM-003','PROD-001','主板单元','bom-sub-001',2,'V1.0','locked','包含CPU、内存、SSD、主板等核心计算部件',0,'2026-06-07 18:34:15','admin','2026-06-07 17:24:00','admin','2026-06-07 18:34:15','admin'),('bom-comp-002','PBOM-004','PROD-001','机箱单元','bom-sub-001',2,'V1.0','locked','包含机箱、电源、散热风扇等外部设备',1,'2026-06-07 18:34:15','admin','2026-06-07 17:24:00','admin','2026-06-07 18:34:15','admin'),('bom-root-001','PBOM-001','PROD-001','台式电脑主机',NULL,0,'V1.0','locked','台式电脑主机产品BOM，首批量产版本',0,'2026-06-07 18:34:15','admin','2026-06-07 17:24:00','admin','2026-06-07 18:34:15','admin'),('bom-sub-001','PBOM-002','PROD-001','台式电脑半成品','bom-root-001',1,'V1.0','locked','台式电脑主机半成品组装单元，包含主板和机箱两个子组件',0,'2026-06-07 18:34:15','admin','2026-06-07 17:24:00','admin','2026-06-07 18:34:15','admin'),('e2bb3a9be6894651b661c1440b9cdbe4','PBOM-008','PROD-001','机箱单元','f16e78f1b3a84a15946fb6eec66f41f6',2,'V2.0','draft','包含机箱、电源、散热风扇等外部设备',1,NULL,NULL,'2026-06-07 18:34:20','admin','2026-06-07 18:34:20','admin'),('f16e78f1b3a84a15946fb6eec66f41f6','PBOM-006','PROD-001','台式电脑半成品','6c68d770743b4011bd8e7b7ed4c96e8e',1,'V2.0','draft','台式电脑主机半成品组装单元，包含主板和机箱两个子组件',0,NULL,NULL,'2026-06-07 18:34:20','admin','2026-06-07 18:34:20','admin');
/*!40000 ALTER TABLE `sp_product_bom` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_product_bom_item`
--

DROP TABLE IF EXISTS `sp_product_bom_item`;
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

--
-- Dumping data for table `sp_product_bom_item`
--

LOCK TABLES `sp_product_bom_item` WRITE;
/*!40000 ALTER TABLE `sp_product_bom_item` DISABLE KEYS */;
INSERT INTO `sp_product_bom_item` VALUES ('0e55d07015214ced909854dfa38322f9','762ea0352e4d413f990a036742011b89','material','PART-006','机箱外壳 ATX',1.00,'个',0,'2026-06-16 19:14:07','admin','2026-06-16 19:14:07','admin'),('11d4fe52d71247e0bb05bf7dae584e2b','4daebead9f594a968ae71b0e74b7ac38','material','PART-005','CPU散热器',1.00,'个',4,'2026-06-16 19:14:07','admin','2026-06-16 19:14:07','admin'),('1427f6a9a6794e91b037d0a977fca47f','e2bb3a9be6894651b661c1440b9cdbe4','material','PART-007','电源 750W 金牌',1.00,'个',1,'2026-06-07 18:34:20','admin','2026-06-07 18:34:20','admin'),('1633d88c91044f9c974379814ae6008a','4daebead9f594a968ae71b0e74b7ac38','material','PART-001','CPU i7-13700K',1.00,'个',0,'2026-06-16 19:14:07','admin','2026-06-16 19:14:07','admin'),('2687949982874c2e9cae4a4ddd289d5f','3cf75768175a446ead7500e844b3e97a','material','PART-003','SSD 1TB NVMe',1.00,'个',2,'2026-06-07 18:34:20','admin','2026-06-07 18:34:20','admin'),('424dc3b7c1fd4426a3c679135cfa67e8','3cf75768175a446ead7500e844b3e97a','material','PART-005','CPU散热器',1.00,'个',4,'2026-06-07 18:34:20','admin','2026-06-07 18:34:20','admin'),('42a93e86badb4364bf34943dfb2659f9','e2bb3a9be6894651b661c1440b9cdbe4','material','PART-006','机箱外壳 ATX',1.00,'个',0,'2026-06-07 18:34:20','admin','2026-06-07 18:34:20','admin'),('4e20ad95b311474787ea3864cb0f8077','3cf75768175a446ead7500e844b3e97a','material','PART-001','CPU i7-13700K',1.00,'个',0,'2026-06-07 18:34:20','admin','2026-06-07 18:34:20','admin'),('69c3710c40c644fa8d84fff1621cab06','4daebead9f594a968ae71b0e74b7ac38','material','PART-004','主板 Z790',1.00,'个',3,'2026-06-16 19:14:07','admin','2026-06-16 19:14:07','admin'),('6c17e93d0fd94f24abee31a3703b5f2d','762ea0352e4d413f990a036742011b89','material','PART-007','电源 750W 金牌',1.00,'个',1,'2026-06-16 19:14:07','admin','2026-06-16 19:14:07','admin'),('7180f3eb8ea448a3af5761555d473c19','3cf75768175a446ead7500e844b3e97a','material','PART-004','主板 Z790',1.00,'个',3,'2026-06-07 18:34:20','admin','2026-06-07 18:34:20','admin'),('9a59257e5d464bab913c5ed8ab3d5e47','4daebead9f594a968ae71b0e74b7ac38','material','PART-003','SSD 1TB NVMe',1.00,'个',2,'2026-06-16 19:14:07','admin','2026-06-16 19:14:07','admin'),('9b22a98efd204e4eb826c70a582d871b','762ea0352e4d413f990a036742011b89','material','PART-008','散热风扇 120mm',3.00,'个',2,'2026-06-16 19:14:07','admin','2026-06-16 19:14:07','admin'),('eb8535e25bac4b3cbf1a967e87d3d0f8','3cf75768175a446ead7500e844b3e97a','material','PART-002','DDR5 32GB 内存',2.00,'条',1,'2026-06-07 18:34:20','admin','2026-06-07 18:34:20','admin'),('ef113109acc94cbbb803636725c8aee5','e2bb3a9be6894651b661c1440b9cdbe4','material','PART-008','散热风扇 120mm',3.00,'个',2,'2026-06-07 18:34:20','admin','2026-06-07 18:34:20','admin'),('f7ce13d8735c4ace87c28a1991855f5d','4daebead9f594a968ae71b0e74b7ac38','material','PART-002','DDR5 32GB 内存',2.00,'条',1,'2026-06-16 19:14:07','admin','2026-06-16 19:14:07','admin'),('item-001','bom-comp-001','material','PART-001','CPU i7-13700K',1.00,'个',0,'2026-06-07 17:24:00','admin','2026-06-07 17:24:00','admin'),('item-002','bom-comp-001','material','PART-002','DDR5 32GB 内存',2.00,'条',1,'2026-06-07 17:24:00','admin','2026-06-07 17:24:00','admin'),('item-003','bom-comp-001','material','PART-003','SSD 1TB NVMe',1.00,'个',2,'2026-06-07 17:24:00','admin','2026-06-07 17:24:00','admin'),('item-004','bom-comp-001','material','PART-004','主板 Z790',1.00,'个',3,'2026-06-07 17:24:00','admin','2026-06-07 17:24:00','admin'),('item-005','bom-comp-001','material','PART-005','CPU散热器',1.00,'个',4,'2026-06-07 17:24:00','admin','2026-06-07 17:24:00','admin'),('item-006','bom-comp-002','material','PART-006','机箱外壳 ATX',1.00,'个',0,'2026-06-07 17:24:00','admin','2026-06-07 17:24:00','admin'),('item-007','bom-comp-002','material','PART-007','电源 750W 金牌',1.00,'个',1,'2026-06-07 17:24:00','admin','2026-06-07 17:24:00','admin'),('item-008','bom-comp-002','material','PART-008','散热风扇 120mm',3.00,'个',2,'2026-06-07 17:24:00','admin','2026-06-07 17:24:00','admin');
/*!40000 ALTER TABLE `sp_product_bom_item` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_sys_department`
--

DROP TABLE IF EXISTS `sp_sys_department`;
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

--
-- Dumping data for table `sp_sys_department`
--

LOCK TABLES `sp_sys_department` WRITE;
/*!40000 ALTER TABLE `sp_sys_department` DISABLE KEYS */;
/*!40000 ALTER TABLE `sp_sys_department` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_sys_dict`
--

DROP TABLE IF EXISTS `sp_sys_dict`;
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

--
-- Dumping data for table `sp_sys_dict`
--

LOCK TABLES `sp_sys_dict` WRITE;
/*!40000 ALTER TABLE `sp_sys_dict` DISABLE KEYS */;
INSERT INTO `sp_sys_dict` VALUES ('1337618042191904','成品','FG','material_type','物料类型',2,'\"\"','0','2020-03-18 13:53:06','admin','2020-03-18 13:53:06','admin'),('1337618163826720','半成品','PG','material_type','物料类型',3,'\"\"','0','2020-03-18 13:54:04','admin','2020-03-18 13:54:04','admin'),('1337618837012512','个','PCS','ORDER_UNIT','生产单位',1,'\"\"','0','2020-03-18 13:59:25','admin','2020-03-18 13:59:41','admin'),('1337618939772960','箱','BOX','ORDER_UNIT','生产单位',2,'\"\"','0','2020-03-18 14:00:14','admin','2020-03-18 14:00:14','admin');
/*!40000 ALTER TABLE `sp_sys_dict` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_sys_menu`
--

DROP TABLE IF EXISTS `sp_sys_menu`;
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

--
-- Dumping data for table `sp_sys_menu`
--

LOCK TABLES `sp_sys_menu` WRITE;
/*!40000 ALTER TABLE `sp_sys_menu` DISABLE KEYS */;
INSERT INTO `sp_sys_menu` VALUES ('10','system','系统管理','#','0','2',1,'0','user:add','setting','','2019-10-18 11:18:29','SongPeng','2019-10-18 11:18:29','SongPeng'),('101','menu','菜单管理','/admin/sys/menu/list-ui','10','3',1,'0','menu:list','menu','','2019-10-18 11:18:29','SongPeng','2019-10-18 11:18:29','SongPeng'),('102','user','用户管理','/admin/sys/user/list-ui','10','3',2,'0','user:list','user','','2019-10-18 11:18:29','SongPeng','2019-10-18 11:18:29','SongPeng'),('103','role','角色管理','/admin/sys/role/list-ui','10','3',3,'0','role:list','team','','2019-10-18 11:18:29','SongPeng','2019-10-18 11:18:29','SongPeng'),('104','department','部门管理','/admin/sys/department/list-ui','10','3',4,'0','dept:list','apartment','','2019-10-18 11:18:29','SongPeng','2019-10-18 11:18:29','SongPeng'),('105','basedata','基础数据配置平台','/basedata/manager/list-ui','10','3',5,'0','manager:add','database','','2019-10-18 11:18:29','SongPeng','2019-10-18 11:18:29','SongPeng'),('106','basedatamanager','基础数据维护','/basedata/manager/item/list-ui','10','3',6,'0','manager:add','tool','','2019-10-18 11:18:29','SongPeng','2019-10-18 11:18:29','SongPeng'),('107','team','班组员工定义','/admin/sys/team/list-ui','10','3',7,'0','team:add','idcard','','2026-06-06 19:31:39','admin','2026-06-06 19:31:39','admin'),('108','deviceGroup','编组设备定义','/basedata/device-group/list-ui','13','3',8,'0','device:add','deployment-unit','','2026-06-06 19:47:49','admin','2026-06-06 19:47:49','admin'),('109','processUnit','加工单元定义','/basedata/process-unit/list-ui','10','3',9,'0','processUnit:add','gold','','2026-06-06 19:58:46','admin','2026-06-06 19:58:46','admin'),('110','warehouse','库房库位定义','/basedata/warehouse/list-ui','10','3',10,'0','warehouse:add','bank','','2026-06-06 20:37:49','admin','2026-06-06 20:37:49','admin'),('111','compDef','零部件定义','/basedata/component/list-ui','13','3',11,'0','component:add','build','','2026-06-07 09:36:55','admin','2026-06-07 09:36:55','admin'),('112','productBom','产品BOM管理','/technology/product-bom','15','3',3,'0','product-bom:list','block','','2026-06-07 17:24:56','admin','2026-06-07 17:24:56','admin'),('113','operDef','工序信息定义','/technology/oper','15','3',4,'0','oper:list','node-index','','2026-06-07 17:43:23','admin','2026-06-07 17:43:23','admin'),('114','processFlow','工艺流程管理','/technology/process-flow','15','3',5,'0','process-flow:list','partition','','2026-06-07 18:23:11','admin','2026-06-07 18:23:11','admin'),('115','processContent','工艺内容编制','/technology/process-content','15','3',6,'0','process-content:list','edit','\"\"','2026-06-07 18:44:20','admin','2026-06-07 18:44:20','admin'),('116','processQuery','产品工艺查询','/technology/process-query','15','3',7,'0','process-query:list','search','\"\"','2026-06-07 21:49:23','admin','2026-06-07 21:49:23','admin'),('12','order','计划管理','','0','2',4,'0','user:add','schedule','','2019-10-18 11:18:29','Wangziyang','2021-02-21 14:59:56','admin'),('120','noticeInbox','通知中心','/admin/sys/notice/list-ui','10','3',9,'0','notice:view','bell','','2026-06-23 00:00:00','admin','2026-06-23 00:00:00','admin'),('121','orderRelease','工单下达','/order/release/list-ui','12','3',1,'0','order:add','flag','','2019-10-18 11:18:29','Wangziyang','2019-10-18 11:18:29','Wangziyang'),('122','orderDispatch','员工作业派工','/order/dispatch','12','3',2,'0','order:dispatch','fa-id-card','','2026-06-13 21:20:09','admin','2026-06-13 21:20:09','admin'),('123','orderGantt','生产甘特图','/order/gantt','12','3',3,'0','order:gantt','schedule','','2026-06-17 00:00:00','admin','2026-06-17 00:00:00','admin'),('124','noticePublish','通知发布','/admin/sys/notice/admin-ui','10','3',10,'0','notice:publish','message','','2026-06-23 00:00:00','admin','2026-06-23 00:00:00','admin'),('13','materiel','物料管理','#','0','2',2,'0','user:add','shop','','2019-10-18 11:18:29','Wangziyang','2019-10-18 11:18:29','Wangziyang'),('131','matdef','物料维护','/basedata/materile/list-ui','13','3',1,'0','materile:add','experiment','','2019-10-18 11:18:29','SongPeng','2019-10-18 11:18:29','SongPeng'),('132','deviceDef','设备定义','/basedata/device/list-ui','13','3',2,'0','device:add','fa-desktop','','2026-06-22 16:59:15','admin','2026-06-22 16:59:15','admin'),('14','Digitalplatform\n\n','数字化平台','#','0','2',6,'0','user:add','pie-chart','','2019-10-18 11:18:29','Wangziyang','2019-10-18 11:18:29','Wangziyang'),('141','plandg','智慧大屏','/digitization/plan/plan-ui','14','3',1,'0','user:add','dashboard','','2019-10-18 11:18:29','SongPeng','2019-10-18 11:18:29','SongPeng'),('15','ProcessManage','工艺管理','','0','2',3,'0','user:add','tool','','2019-10-18 11:18:29','Wangziyang','2021-02-21 15:01:47','admin'),('151','flowProcess','工艺路线管理','/basedata/flow/process/list-ui','15','3',1,'0','flow:add','branches','','2019-10-18 11:18:29','Wangziyang','2019-10-18 11:18:29','Wangziyang'),('152','bom','工艺BOM管理','/technology/bom/list-ui','15','3',2,'0','bom:add','file-text','','2019-10-18 11:18:29','Wangziyang','2019-10-18 11:18:29','Wangziyang'),('16','wip','在制品管理','#','0','2',5,'0','user:add','cluster','','2019-10-18 11:18:29','SongPeng','2019-10-18 11:18:29','SongPeng'),('161','generalSnProcess','SN通用过程采集','/rrr','16','3',1,'0','sn:add','scan','','2019-10-18 11:18:29','SongPeng','2019-10-18 11:18:29','SongPeng'),('17','DigitalSimulation','黑科数字孪生','#','0','2',7,'0','user:add','cloud-server','','2019-10-18 11:18:29','Wangziyang','2019-10-18 11:18:29','Wangziyang'),('171','DigitalSimulationFrom','数字仿真3D仓库','/digital/simulation/list-ui','17','3',1,'0','warehouse:add','codepen','','2019-10-18 11:18:29','Wangziyang','2019-10-18 11:18:29','Wangziyang'),('18','inventory','库存管理','#','0','0',8,'0','user:add','database','','2026-06-14 14:48:51','admin','2026-06-14 14:48:51','admin'),('181','inventoryReceipt','计划入库确认','/inventory/receipt','18','3',1,'0','inventory:inbound','flag','','2026-06-14 14:48:51','admin','2026-06-14 14:48:51','admin'),('182','inventoryQuery','库存明细查询','/inventory/query','18','3',2,'0','inventory:query','file-text','','2026-06-14 14:48:51','admin','2026-06-14 14:48:51','admin'),('183','outboundConfirm','配套出库确认','/inventory/outbound','18','3',3,'0','inventory:outbound','deployment-unit','','2026-06-14 17:36:44','admin','2026-06-14 17:36:44','admin'),('184','manualInbound','手动入库','/inventory/manual-inbound','18','3',4,'0','inventory:inbound','gold','','2026-06-14 17:36:44','admin','2026-06-14 17:36:44','admin'),('19','workflowTool','流程配置工具','#','0','0',9,'0','workflow:view','deployment-unit','','2026-06-18 22:14:05','admin','2026-06-18 22:14:05','admin'),('191','workflowCategory','流程分类管理','/workflow/category/list-ui','19','3',1,'0','workflow:category:list','apartment','','2026-06-18 22:14:05','admin','2026-06-18 22:14:05','admin'),('192','workflowModel','流程模型设计','/workflow/model/list-ui','19','3',2,'0','workflow:model:list','branches','','2026-06-18 22:14:05','admin','2026-06-18 22:14:05','admin'),('193','workflowForm','流程表单管理','/workflow/form/list-ui','19','3',3,'0','workflow:form:list','form','','2026-06-19 11:19:17','admin','2026-06-19 11:19:17','admin'),('194','workflowDefinition','流程定义管理','/workflow/definition/list-ui','19','3',4,'0','workflow:definition:list','partition','','2026-06-19 11:19:17','admin','2026-06-19 11:19:17','admin'),('2','component','OPC操作','#','0','1',1,'0','component:add','control','','2019-10-18 11:18:29','SongPeng','2019-10-18 11:18:29','SongPeng'),('3','other','其他管理','#','0','1',1,'0','user:add','appstore','','2019-10-18 11:18:29','SongPeng','2019-10-18 11:18:29','SongPeng'),('btn_dept_add','dept_add','部门管理-新增','','104','4',1,'2','dept:add','','','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('btn_dept_delete','dept_delete','部门管理-删除','','104','4',3,'2','dept:delete','','','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('btn_dept_update','dept_update','部门管理-编辑','','104','4',2,'2','dept:update','','','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('btn_menu_add','menu_add','菜单管理-新增','','101','4',1,'2','menu:add','','','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('btn_menu_delete','menu_delete','菜单管理-删除','','101','4',3,'2','menu:delete','','','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('btn_menu_update','menu_update','菜单管理-编辑','','101','4',2,'2','menu:update','','','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('btn_role_add','role_add','角色管理-新增','','103','4',1,'2','role:add','','','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('btn_role_delete','role_delete','角色管理-删除','','103','4',3,'2','role:delete','','','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('btn_role_update','role_update','角色管理-编辑','','103','4',2,'2','role:update','','','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('btn_user_add','user_add','用户管理-新增','','102','4',1,'2','user:add','','','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('btn_user_delete','user_delete','用户管理-删除','','102','4',3,'2','user:delete','','','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('btn_user_update','user_update','用户管理-编辑','','102','4',2,'2','user:update','','','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system');
/*!40000 ALTER TABLE `sp_sys_menu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_sys_notice`
--

DROP TABLE IF EXISTS `sp_sys_notice`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_sys_notice` (
  `id` varchar(64) NOT NULL COMMENT '主键id',
  `title` varchar(255) NOT NULL COMMENT '标题',
  `content` text COMMENT '正文',
  `type` varchar(16) NOT NULL DEFAULT 'info' COMMENT 'info/success/warning/error',
  `target_type` varchar(16) NOT NULL DEFAULT 'all' COMMENT 'all/user/role/dept',
  `target_ids` varchar(1024) DEFAULT '' COMMENT '目标id列表(逗号分隔)',
  `target_desc` varchar(512) DEFAULT '' COMMENT '目标描述(展示用)',
  `sender` varchar(64) DEFAULT '' COMMENT '发布人username',
  `status` varchar(8) NOT NULL DEFAULT '1' COMMENT '1=已发布',
  `recipient_count` int NOT NULL DEFAULT '0' COMMENT '收件人数',
  `is_deleted` varchar(1) NOT NULL DEFAULT '0' COMMENT '软删 0/1',
  `create_time` datetime NOT NULL,
  `create_username` varchar(64) NOT NULL,
  `update_time` datetime NOT NULL,
  `update_username` varchar(64) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='通知主体表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sp_sys_notice`
--

LOCK TABLES `sp_sys_notice` WRITE;
/*!40000 ALTER TABLE `sp_sys_notice` DISABLE KEYS */;
INSERT INTO `sp_sys_notice` VALUES ('demo-notice-1','章鱼师兄 MES 通知中心上线','通知中心已正式上线。今后系统公告、停机维护、生产异常等消息都会通过此处推送。点击右上角铃铛可随时查看未读通知。','info','all','','全体用户','admin','1',5,'0','2026-06-24 02:38:18','admin','2026-06-24 02:38:18','admin'),('demo-notice-2','【维护】本周六 22:00 系统停机升级','为升级 MRP 排产模块，系统将于本周六 22:00-23:30 停机维护，期间请勿提交生产订单。给您带来不便敬请谅解。','warning','all','','全体用户','admin','1',5,'0','2026-06-24 05:38:18','admin','2026-06-24 05:38:18','admin'),('demo-notice-3','本月产量已达成目标 102%','截至今日，本月台式电脑主机累计产出 5,100 台，达成月度目标的 102%。感谢各产线同仁的努力！','success','all','','全体用户','admin','1',5,'0','2026-06-24 07:08:18','admin','2026-06-24 07:08:18','admin'),('demo-notice-4','【管理员】检测到 3 次异常登录','安全模块检测到今日有 3 次来自异地 IP 的登录失败，请管理员尽快核查账号安全并视情况重置密码。','error','role','1185025876737396738','指定角色(管理员)','admin','1',1,'0','2026-06-24 07:58:18','admin','2026-06-24 07:58:18','admin'),('demo-notice-5','请补充 BOM 工艺参数','您负责的\"台式电脑主机\"BOM 缺少贴片工序的节拍参数，请于明日下班前在工艺管理中补充完整。','info','user','1184010472443396098,1276512902757724162','指定用户','admin','1',2,'0','2026-06-24 08:18:18','admin','2026-06-24 08:18:18','admin');
/*!40000 ALTER TABLE `sp_sys_notice` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_sys_notice_user`
--

DROP TABLE IF EXISTS `sp_sys_notice_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_sys_notice_user` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='通知收件箱表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sp_sys_notice_user`
--

LOCK TABLES `sp_sys_notice_user` WRITE;
/*!40000 ALTER TABLE `sp_sys_notice_user` DISABLE KEYS */;
INSERT INTO `sp_sys_notice_user` VALUES ('demo-nu-1-1184009088826392578','demo-notice-1','1184009088826392578','0',NULL,'0','2026-06-24 02:38:18','admin','2026-06-24 02:38:18','admin'),('demo-nu-1-1184010472443396098','demo-notice-1','1184010472443396098','0',NULL,'0','2026-06-24 02:38:18','admin','2026-06-24 02:38:18','admin'),('demo-nu-1-1184019107907227649','demo-notice-1','1184019107907227649','1','2026-06-24 06:38:18','0','2026-06-24 02:38:18','admin','2026-06-24 02:38:18','admin'),('demo-nu-1-1266201180838801409','demo-notice-1','1266201180838801409','0',NULL,'0','2026-06-24 02:38:18','admin','2026-06-24 02:38:18','admin'),('demo-nu-1-1276512902757724162','demo-notice-1','1276512902757724162','0',NULL,'0','2026-06-24 02:38:18','admin','2026-06-24 02:38:18','admin'),('demo-nu-2-1184009088826392578','demo-notice-2','1184009088826392578','0',NULL,'0','2026-06-24 05:38:18','admin','2026-06-24 05:38:18','admin'),('demo-nu-2-1184010472443396098','demo-notice-2','1184010472443396098','0',NULL,'0','2026-06-24 05:38:18','admin','2026-06-24 05:38:18','admin'),('demo-nu-2-1184019107907227649','demo-notice-2','1184019107907227649','1','2026-06-24 06:38:18','0','2026-06-24 05:38:18','admin','2026-06-24 05:38:18','admin'),('demo-nu-2-1266201180838801409','demo-notice-2','1266201180838801409','0',NULL,'0','2026-06-24 05:38:18','admin','2026-06-24 05:38:18','admin'),('demo-nu-2-1276512902757724162','demo-notice-2','1276512902757724162','0',NULL,'0','2026-06-24 05:38:18','admin','2026-06-24 05:38:18','admin'),('demo-nu-3-1184009088826392578','demo-notice-3','1184009088826392578','0',NULL,'0','2026-06-24 07:08:18','admin','2026-06-24 07:08:18','admin'),('demo-nu-3-1184010472443396098','demo-notice-3','1184010472443396098','0',NULL,'0','2026-06-24 07:08:18','admin','2026-06-24 07:08:18','admin'),('demo-nu-3-1184019107907227649','demo-notice-3','1184019107907227649','0',NULL,'0','2026-06-24 07:08:18','admin','2026-06-24 07:08:18','admin'),('demo-nu-3-1266201180838801409','demo-notice-3','1266201180838801409','0',NULL,'0','2026-06-24 07:08:18','admin','2026-06-24 07:08:18','admin'),('demo-nu-3-1276512902757724162','demo-notice-3','1276512902757724162','0',NULL,'0','2026-06-24 07:08:18','admin','2026-06-24 07:08:18','admin'),('demo-nu-4-1184019107907227649','demo-notice-4','1184019107907227649','1','2026-06-24 20:08:37','0','2026-06-24 07:58:18','admin','2026-06-24 07:58:18','admin'),('demo-nu-5-1184010472443396098','demo-notice-5','1184010472443396098','0',NULL,'0','2026-06-24 08:18:18','admin','2026-06-24 08:18:18','admin'),('demo-nu-5-1276512902757724162','demo-notice-5','1276512902757724162','0',NULL,'0','2026-06-24 08:18:18','admin','2026-06-24 08:18:18','admin');
/*!40000 ALTER TABLE `sp_sys_notice_user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_sys_role`
--

DROP TABLE IF EXISTS `sp_sys_role`;
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

--
-- Dumping data for table `sp_sys_role`
--

LOCK TABLES `sp_sys_role` WRITE;
/*!40000 ALTER TABLE `sp_sys_role` DISABLE KEYS */;
INSERT INTO `sp_sys_role` VALUES ('1185025876737396738','超级管理员','admin','超级管理员','0','2019-10-18 10:52:40','SongPeng','2020-03-13 14:06:43','admin','0'),('1232532514523213826','体验者123','experience','体验者','0','2020-02-26 13:07:05','admin','2020-06-03 15:05:59','admin','0'),('1274963902774620161','12','12','12','0','2020-06-22 15:14:17','admin','2020-06-22 15:14:17','admin','0'),('1274963930100510721','1212','1212','1212','0','2020-06-22 15:14:23','admin','2020-06-22 15:14:23','admin','0'),('1274963986383876098','1311','121','111','0','2020-06-22 15:14:37','admin','2020-06-22 15:14:37','admin','0'),('1274964058609790977','12121212','12121','1212','0','2020-06-22 15:14:54','admin','2020-06-22 15:14:54','admin','0'),('1274964096777957377','1313','12121212','121212','0','2020-06-22 15:15:03','admin','2020-06-22 15:15:03','admin','0'),('1274964138322538497','331','1222','22','0','2020-06-22 15:15:13','admin','2020-06-22 15:15:13','admin','0'),('1274964176301961218','1211','1111','1111','0','2020-06-22 15:15:22','admin','2020-06-22 15:15:22','admin','0'),('1274964233344495618','443','333','3','0','2020-06-22 15:15:36','admin','2020-06-22 15:15:36','admin','0'),('1280124406522425346','11','11','11','0','2020-07-06 21:00:17','admin','2020-07-06 21:00:17','admin','0'),('1281217564303929346','2315','4324','42342','0','2020-07-09 21:24:06','admin','2020-07-17 00:34:09','admin','0'),('1336542182244384','王子杨','123','王子杨','0','2020-03-12 15:22:56','admin','2020-03-12 15:22:56','admin','0'),('2064151053577785345','bird','123321','小鸟依人','2','2026-06-09 09:02:16','admin','2026-06-09 09:02:22','admin','0'),('d77bfae4619111f1aebc664b457a9374','数据员','data_clerk','享有基础数据中心权限','0','2026-06-06 18:24:03','admin','2026-06-06 18:24:03','admin','1'),('d77c3982619111f1aebc664b457a9374','工艺员','process_tech','享有工艺管理权限','0','2026-06-06 18:24:03','admin','2026-06-06 18:24:03','admin','1'),('d77c3df6619111f1aebc664b457a9374','生产计划员','prod_planner','享有计划管理权限','0','2026-06-06 18:24:03','admin','2026-06-06 18:24:03','admin','1'),('d77c40c6619111f1aebc664b457a9374','生产主管','prod_supervisor','享有生产管理相关权限','0','2026-06-06 18:24:03','admin','2026-06-06 18:24:03','admin','1'),('d77c42f6619111f1aebc664b457a9374','生产作业员','prod_operator','享有在制品管理权限','0','2026-06-06 18:24:03','admin','2026-06-06 18:24:03','admin','1'),('d77c463e619111f1aebc664b457a9374','库房管理员','warehouse_mgr','享有物料管理权限','0','2026-06-06 18:24:03','admin','2026-06-06 18:24:03','admin','1'),('d77c4832619111f1aebc664b457a9374','质量管理员','quality_mgr','享有质量相关管理权限','0','2026-06-06 18:24:03','admin','2026-06-06 18:24:03','admin','1');
/*!40000 ALTER TABLE `sp_sys_role` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_sys_role_menu`
--

DROP TABLE IF EXISTS `sp_sys_role_menu`;
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

--
-- Dumping data for table `sp_sys_role_menu`
--

LOCK TABLES `sp_sys_role_menu` WRITE;
/*!40000 ALTER TABLE `sp_sys_role_menu` DISABLE KEYS */;
INSERT INTO `sp_sys_role_menu` VALUES ('1','1185025876737396738','1','2019-10-28 14:51:44','admin','2019-10-28 14:51:56','admin'),('2','1185025876737396738','2','2019-10-28 14:51:44','admin','2019-10-28 14:51:56','admin'),('2064151079645384706','2064151053577785345','12','2026-06-09 09:02:22','admin','2026-06-09 09:02:22','admin'),('2064151079657967618','2064151053577785345','121','2026-06-09 09:02:22','admin','2026-06-09 09:02:22','admin'),('2064151079674744834','2064151053577785345','13','2026-06-09 09:02:22','admin','2026-06-09 09:02:22','admin'),('2064151079687327745','2064151053577785345','131','2026-06-09 09:02:22','admin','2026-06-09 09:02:22','admin'),('2064151079695716353','2064151053577785345','14','2026-06-09 09:02:22','admin','2026-06-09 09:02:22','admin'),('2064151079699910658','2064151053577785345','141','2026-06-09 09:02:22','admin','2026-06-09 09:02:22','admin'),('2064151079704104961','2064151053577785345','15','2026-06-09 09:02:22','admin','2026-06-09 09:02:22','admin'),('2064151079708299266','2064151053577785345','112','2026-06-09 09:02:22','admin','2026-06-09 09:02:22','admin'),('2064151079712493569','2064151053577785345','113','2026-06-09 09:02:22','admin','2026-06-09 09:02:22','admin'),('2064151079716687873','2064151053577785345','114','2026-06-09 09:02:22','admin','2026-06-09 09:02:22','admin'),('2064151079720882177','2064151053577785345','115','2026-06-09 09:02:22','admin','2026-06-09 09:02:22','admin'),('2064151079725076482','2064151053577785345','116','2026-06-09 09:02:22','admin','2026-06-09 09:02:22','admin'),('2064151079729270785','2064151053577785345','151','2026-06-09 09:02:22','admin','2026-06-09 09:02:22','admin'),('2064151079733465090','2064151053577785345','152','2026-06-09 09:02:22','admin','2026-06-09 09:02:22','admin'),('2064151079737659394','2064151053577785345','16','2026-06-09 09:02:22','admin','2026-06-09 09:02:22','admin'),('2064151079741853698','2064151053577785345','161','2026-06-09 09:02:22','admin','2026-06-09 09:02:22','admin'),('2064151079746048001','2064151053577785345','17','2026-06-09 09:02:22','admin','2026-06-09 09:02:22','admin'),('2064151079750242306','2064151053577785345','171','2026-06-09 09:02:22','admin','2026-06-09 09:02:22','admin'),('2064151079754436610','2064151053577785345','2','2026-06-09 09:02:22','admin','2026-06-09 09:02:22','admin'),('2064151079758630913','2064151053577785345','3','2026-06-09 09:02:22','admin','2026-06-09 09:02:22','admin'),('3','1185025876737396738','3','2019-10-28 14:51:44','admin','2019-10-28 14:51:56','admin'),('4','1185025876737396738','101','2019-10-28 14:51:44','admin','2019-10-28 14:51:56','admin'),('5','1185025876737396738','102','2019-10-28 14:51:44','admin','2019-10-28 14:51:56','admin'),('6','1185025876737396738','103','2019-10-28 14:51:44','admin','2019-10-28 14:51:56','admin'),('7','1185025876737396738','104','2019-10-28 14:51:44','admin','2019-10-28 14:51:56','admin'),('d77c9fd0619111f1aebc664b457a9374','d77bfae4619111f1aebc664b457a9374','105','2026-06-06 18:24:03','admin','2026-06-06 18:24:03','admin'),('d77ca6f6619111f1aebc664b457a9374','d77bfae4619111f1aebc664b457a9374','106','2026-06-06 18:24:03','admin','2026-06-06 18:24:03','admin'),('d77cd946619111f1aebc664b457a9374','d77c3982619111f1aebc664b457a9374','15','2026-06-06 18:24:03','admin','2026-06-06 18:24:03','admin'),('d77cde5a619111f1aebc664b457a9374','d77c3982619111f1aebc664b457a9374','151','2026-06-06 18:24:03','admin','2026-06-06 18:24:03','admin'),('d77cdfb8619111f1aebc664b457a9374','d77c3982619111f1aebc664b457a9374','152','2026-06-06 18:24:03','admin','2026-06-06 18:24:03','admin'),('d77d06e6619111f1aebc664b457a9374','d77c3df6619111f1aebc664b457a9374','12','2026-06-06 18:24:03','admin','2026-06-06 18:24:03','admin'),('d77d0b78619111f1aebc664b457a9374','d77c3df6619111f1aebc664b457a9374','121','2026-06-06 18:24:03','admin','2026-06-06 18:24:03','admin'),('d77d2b6c619111f1aebc664b457a9374','d77c40c6619111f1aebc664b457a9374','12','2026-06-06 18:24:03','admin','2026-06-06 18:24:03','admin'),('d77d2ea0619111f1aebc664b457a9374','d77c40c6619111f1aebc664b457a9374','121','2026-06-06 18:24:03','admin','2026-06-06 18:24:03','admin'),('d77d2f9a619111f1aebc664b457a9374','d77c40c6619111f1aebc664b457a9374','16','2026-06-06 18:24:03','admin','2026-06-06 18:24:03','admin'),('d77d3062619111f1aebc664b457a9374','d77c40c6619111f1aebc664b457a9374','161','2026-06-06 18:24:03','admin','2026-06-06 18:24:03','admin'),('d77d3116619111f1aebc664b457a9374','d77c40c6619111f1aebc664b457a9374','14','2026-06-06 18:24:03','admin','2026-06-06 18:24:03','admin'),('d77d31ca619111f1aebc664b457a9374','d77c40c6619111f1aebc664b457a9374','141','2026-06-06 18:24:03','admin','2026-06-06 18:24:03','admin'),('d77d583a619111f1aebc664b457a9374','d77c42f6619111f1aebc664b457a9374','16','2026-06-06 18:24:03','admin','2026-06-06 18:24:03','admin'),('d77d5d44619111f1aebc664b457a9374','d77c42f6619111f1aebc664b457a9374','161','2026-06-06 18:24:03','admin','2026-06-06 18:24:03','admin'),('d77d813e619111f1aebc664b457a9374','d77c463e619111f1aebc664b457a9374','13','2026-06-06 18:24:03','admin','2026-06-06 18:24:03','admin'),('d77d84ea619111f1aebc664b457a9374','d77c463e619111f1aebc664b457a9374','131','2026-06-06 18:24:03','admin','2026-06-06 18:24:03','admin'),('d77da38a619111f1aebc664b457a9374','d77c4832619111f1aebc664b457a9374','105','2026-06-06 18:24:03','admin','2026-06-06 18:24:03','admin'),('d77da678619111f1aebc664b457a9374','d77c4832619111f1aebc664b457a9374','106','2026-06-06 18:24:03','admin','2026-06-06 18:24:03','admin'),('d77da70e619111f1aebc664b457a9374','d77c4832619111f1aebc664b457a9374','16','2026-06-06 18:24:03','admin','2026-06-06 18:24:03','admin'),('d77da790619111f1aebc664b457a9374','d77c4832619111f1aebc664b457a9374','161','2026-06-06 18:24:03','admin','2026-06-06 18:24:03','admin'),('rm_admin_10','1185025876737396738','10','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_105','1185025876737396738','105','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_106','1185025876737396738','106','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_107','1185025876737396738','107','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_108','1185025876737396738','108','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_109','1185025876737396738','109','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_110','1185025876737396738','110','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_111','1185025876737396738','111','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_112','1185025876737396738','112','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_113','1185025876737396738','113','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_114','1185025876737396738','114','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_115','1185025876737396738','115','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_116','1185025876737396738','116','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_12','1185025876737396738','12','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_120','1185025876737396738','120','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_121','1185025876737396738','121','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_122','1185025876737396738','122','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_123','1185025876737396738','123','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_124','1185025876737396738','124','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_13','1185025876737396738','13','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_131','1185025876737396738','131','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_132','1185025876737396738','132','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_14','1185025876737396738','14','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_141','1185025876737396738','141','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_15','1185025876737396738','15','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_151','1185025876737396738','151','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_152','1185025876737396738','152','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_16','1185025876737396738','16','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_161','1185025876737396738','161','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_17','1185025876737396738','17','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_171','1185025876737396738','171','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_18','1185025876737396738','18','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_181','1185025876737396738','181','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_182','1185025876737396738','182','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_183','1185025876737396738','183','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_184','1185025876737396738','184','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_19','1185025876737396738','19','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_191','1185025876737396738','191','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_192','1185025876737396738','192','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_193','1185025876737396738','193','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_194','1185025876737396738','194','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_btn_dept_add','1185025876737396738','btn_dept_add','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_btn_dept_delete','1185025876737396738','btn_dept_delete','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_btn_dept_update','1185025876737396738','btn_dept_update','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_btn_menu_add','1185025876737396738','btn_menu_add','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_btn_menu_delete','1185025876737396738','btn_menu_delete','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_btn_menu_update','1185025876737396738','btn_menu_update','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_btn_role_add','1185025876737396738','btn_role_add','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_btn_role_delete','1185025876737396738','btn_role_delete','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_btn_role_update','1185025876737396738','btn_role_update','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_btn_user_add','1185025876737396738','btn_user_add','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_btn_user_delete','1185025876737396738','btn_user_delete','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system'),('rm_admin_btn_user_update','1185025876737396738','btn_user_update','2026-06-25 18:44:30','system','2026-06-25 18:44:30','system');
/*!40000 ALTER TABLE `sp_sys_role_menu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_sys_user`
--

DROP TABLE IF EXISTS `sp_sys_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_sys_user` (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '主键id',
  `name` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '姓名',
  `username` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '用户名',
  `password` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '密码',
  `dept_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '""' COMMENT '部门id',
  `email` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '""' COMMENT '邮箱',
  `mobile` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '手机号',
  `tel` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '""' COMMENT '固定电话',
  `sex` char(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '性别(0:女;1:男;2:其他)',
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

--
-- Dumping data for table `sp_sys_user`
--

LOCK TABLES `sp_sys_user` WRITE;
/*!40000 ALTER TABLE `sp_sys_user` DISABLE KEYS */;
INSERT INTO `sp_sys_user` VALUES ('1184009088826392578','宋鹏','iamsongpeng','9d7281eeaebded0b091340cfa658a7e8','','','13776337795','','1',NULL,'','','','','','','','','','0','2019-10-15 15:32:19','SongPeng','2020-02-28 16:44:59','admin'),('1184010472443396098','猴子','monkey','9d7281eeaebded0b091340cfa658a7e8','123','','137763377','','0',NULL,'','','','','','','','','','0','2019-10-15 15:37:52','SongPeng','2020-02-26 15:03:32','admin'),('1184019107907227649','超级管理员','admin','9d7281eeaebded0b091340cfa658a7e8','11','','13776337796','44','0',NULL,'55','66','77','88','99','10','11','12','13','0','2019-10-15 16:12:08','SongPeng','2020-03-24 11:08:22','admin'),('1266201180838801409','cassman','cassman.yang','0302726d276d6b011d85404f2beb14a4','90573703','cassman.yang@qq.com','1111','86195','1','2019-05-21 00:00:00','#sd','45+645+65+6511','swim','sad','dsa','fasd','daf','dsaf','daf','0','2020-05-29 10:54:21','admin','2020-06-02 16:45:25','admin'),('1276512902757724162','小明','xm','a7c3fcdeca8ce6d49d2680eecd5e7431','1','1@qq.com','19298833438','323232','0','1998-09-12 00:00:00','1','1','12','1','1','1','1','1','1','0','2020-06-26 21:49:27','admin','2020-07-07 14:00:52','admin');
/*!40000 ALTER TABLE `sp_sys_user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_sys_user_role`
--

DROP TABLE IF EXISTS `sp_sys_user_role`;
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

--
-- Dumping data for table `sp_sys_user_role`
--

LOCK TABLES `sp_sys_user_role` WRITE;
/*!40000 ALTER TABLE `sp_sys_user_role` DISABLE KEYS */;
INSERT INTO `sp_sys_user_role` VALUES ('1242287110472966146','1184019107907227649','1185025876737396738','2020-03-24 11:08:22','admin','2020-03-24 11:08:22','admin'),('1267739082731270146','1266201180838801409','1336542182244384','2020-06-02 16:45:25','admin','2020-06-02 16:45:25','admin'),('1280381244774002690','1276512902757724162','1232532514523213826','2020-07-07 14:00:52','admin','2020-07-07 14:00:52','admin');
/*!40000 ALTER TABLE `sp_sys_user_role` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_table_manager`
--

DROP TABLE IF EXISTS `sp_table_manager`;
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

--
-- Dumping data for table `sp_table_manager`
--

LOCK TABLES `sp_table_manager` WRITE;
/*!40000 ALTER TABLE `sp_table_manager` DISABLE KEYS */;
INSERT INTO `sp_table_manager` VALUES ('1283020801696837633','sp_bom','','2020-07-14 20:49:31','admin','2020-07-14 20:49:31','admin','0','\"\"');
/*!40000 ALTER TABLE `sp_table_manager` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_table_manager_item`
--

DROP TABLE IF EXISTS `sp_table_manager_item`;
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

--
-- Dumping data for table `sp_table_manager_item`
--

LOCK TABLES `sp_table_manager_item` WRITE;
/*!40000 ALTER TABLE `sp_table_manager_item` DISABLE KEYS */;
INSERT INTO `sp_table_manager_item` VALUES ('1283020801742974978','1283020801696837633','materiel_desc','888','Y',1,'2020-07-14 20:49:31','admin','2020-07-14 20:49:31','admin');
/*!40000 ALTER TABLE `sp_table_manager_item` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_team`
--

DROP TABLE IF EXISTS `sp_team`;
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

--
-- Dumping data for table `sp_team`
--

LOCK TABLES `sp_team` WRITE;
/*!40000 ALTER TABLE `sp_team` DISABLE KEYS */;
INSERT INTO `sp_team` VALUES ('2063224132044075009','BZ002','生产组2','',NULL,NULL,'','','2,4','0','2026-06-06 19:39:01','admin','2026-06-06 19:39:01','admin'),('48ad7f4a619b11f1aebc664b457a9374','BZ001','生产作业班组1','生产作业班组',NULL,NULL,'08:00','17:00','1,2,3,4,5','0','2026-06-06 19:31:39','admin','2026-06-06 19:31:39','admin');
/*!40000 ALTER TABLE `sp_team` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_team_user`
--

DROP TABLE IF EXISTS `sp_team_user`;
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

--
-- Dumping data for table `sp_team_user`
--

LOCK TABLES `sp_team_user` WRITE;
/*!40000 ALTER TABLE `sp_team_user` DISABLE KEYS */;
INSERT INTO `sp_team_user` VALUES ('2063224696739999745','2063224132044075009','1184009088826392578','2026-06-06 19:41:15','admin','2026-06-06 19:41:15','admin'),('2063224696769359874','2063224132044075009','1184010472443396098','2026-06-06 19:41:15','admin','2026-06-06 19:41:15','admin'),('MK-TU-B1-CM','48ad7f4a619b11f1aebc664b457a9374','1266201180838801409','2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin'),('MK-TU-B1-XM','48ad7f4a619b11f1aebc664b457a9374','1276512902757724162','2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin');
/*!40000 ALTER TABLE `sp_team_user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_warehouse`
--

DROP TABLE IF EXISTS `sp_warehouse`;
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

--
-- Dumping data for table `sp_warehouse`
--

LOCK TABLES `sp_warehouse` WRITE;
/*!40000 ALTER TABLE `sp_warehouse` DISABLE KEYS */;
INSERT INTO `sp_warehouse` VALUES ('2063239974832054274','DD1-123','仓库1','零件库',2,2,2,4,'','0','2026-06-06 20:41:58','admin','2026-06-10 10:09:44','admin'),('2064530273177038849','DD1-124','XZH','零件库',2,2,3,2,'','1','2026-06-10 10:09:09','admin','2026-06-10 10:10:04','admin'),('2064530364944216065','ACBDDDA','XZH','产品库',2,2,3,2,'','1','2026-06-10 10:09:31','admin','2026-06-10 10:10:03','admin'),('2064532624759713793','DD1-1244','XZH','零件库',1,3,3,5,'','1','2026-06-10 10:18:30','admin','2026-06-10 10:18:42','admin'),('2064539576180932609','DD1-3322','XZHHZX','零件库',1,2,3,2,'','0','2026-06-10 10:46:07','admin','2026-06-10 10:46:07','admin'),('wh-parts-001','WH-PARTS','电脑配件库','零件库',1,2,2,2,'台式电脑零件入库专用','0','2026-06-14 14:48:51','admin','2026-06-14 14:48:51','admin');
/*!40000 ALTER TABLE `sp_warehouse` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_warehouse_location`
--

DROP TABLE IF EXISTS `sp_warehouse_location`;
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
  UNIQUE KEY `idx_loc_wh_code` (`warehouse_id`,`code`),
  KEY `idx_loc_wh` (`warehouse_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='库位表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sp_warehouse_location`
--

LOCK TABLES `sp_warehouse_location` WRITE;
/*!40000 ALTER TABLE `sp_warehouse_location` DISABLE KEYS */;
INSERT INTO `sp_warehouse_location` VALUES ('2064530419608580098','2063239974832054274','1-010101',1,1,1,1,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530419637940225','2063239974832054274','1-010102',1,1,1,2,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530419663106049','2063239974832054274','1-010103',1,1,1,3,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530419684077569','2063239974832054274','1-010104',1,1,1,4,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530419705049089','2063239974832054274','1-010201',1,1,2,1,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530419726020609','2063239974832054274','1-010202',1,1,2,2,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530419746992129','2063239974832054274','1-010203',1,1,2,3,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530419767963650','2063239974832054274','1-010204',1,1,2,4,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530419788935169','2063239974832054274','1-020101',1,2,1,1,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530419805712386','2063239974832054274','1-020102',1,2,1,2,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530419830878209','2063239974832054274','1-020103',1,2,1,3,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530419851849730','2063239974832054274','1-020104',1,2,1,4,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530419872821249','2063239974832054274','1-020201',1,2,2,1,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530419885404161','2063239974832054274','1-020202',1,2,2,2,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530419893792769','2063239974832054274','1-020203',1,2,2,3,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530419902181378','2063239974832054274','1-020204',1,2,2,4,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530419914764289','2063239974832054274','2-010101',2,1,1,1,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530419923152897','2063239974832054274','2-010102',2,1,1,2,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530419931541505','2063239974832054274','2-010103',2,1,1,3,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530419939930113','2063239974832054274','2-010104',2,1,1,4,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530419952513026','2063239974832054274','2-010201',2,1,2,1,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530419960901633','2063239974832054274','2-010202',2,1,2,2,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530419977678850','2063239974832054274','2-010203',2,1,2,3,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530419986067457','2063239974832054274','2-010204',2,1,2,4,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530419998650369','2063239974832054274','2-020101',2,2,1,1,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530420007038978','2063239974832054274','2-020102',2,2,1,2,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530420019621889','2063239974832054274','2-020103',2,2,1,3,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530420028010498','2063239974832054274','2-020104',2,2,1,4,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530420032204801','2063239974832054274','2-020201',2,2,2,1,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530420040593410','2063239974832054274','2-020202',2,2,2,2,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530420048982018','2063239974832054274','2-020203',2,2,2,3,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064530420053176322','2063239974832054274','2-020204',2,2,2,4,'0','2026-06-10 10:09:44','admin','2026-06-10 10:09:44','admin'),('2064539576227069953','2064539576180932609','1-010101',1,1,1,1,'0','2026-06-10 10:46:07','admin','2026-06-10 10:46:07','admin'),('2064539576248041473','2064539576180932609','1-010102',1,1,1,2,'0','2026-06-10 10:46:07','admin','2026-06-10 10:46:07','admin'),('2064539576273207298','2064539576180932609','1-010201',1,1,2,1,'0','2026-06-10 10:46:07','admin','2026-06-10 10:46:07','admin'),('2064539576294178818','2064539576180932609','1-010202',1,1,2,2,'0','2026-06-10 10:46:07','admin','2026-06-10 10:46:07','admin'),('2064539576306761729','2064539576180932609','1-010301',1,1,3,1,'0','2026-06-10 10:46:07','admin','2026-06-10 10:46:07','admin'),('2064539576315150338','2064539576180932609','1-010302',1,1,3,2,'0','2026-06-10 10:46:07','admin','2026-06-10 10:46:07','admin'),('2064539576327733250','2064539576180932609','1-020101',1,2,1,1,'0','2026-06-10 10:46:07','admin','2026-06-10 10:46:07','admin'),('2064539576336121857','2064539576180932609','1-020102',1,2,1,2,'0','2026-06-10 10:46:07','admin','2026-06-10 10:46:07','admin'),('2064539576340316161','2064539576180932609','1-020201',1,2,2,1,'0','2026-06-10 10:46:07','admin','2026-06-10 10:46:07','admin'),('2064539576348704770','2064539576180932609','1-020202',1,2,2,2,'0','2026-06-10 10:46:07','admin','2026-06-10 10:46:07','admin'),('2064539576357093377','2064539576180932609','1-020301',1,2,3,1,'0','2026-06-10 10:46:07','admin','2026-06-10 10:46:07','admin'),('2064539576361287681','2064539576180932609','1-020302',1,2,3,2,'0','2026-06-10 10:46:07','admin','2026-06-10 10:46:07','admin'),('loc-parts-01','wh-parts-001','1-010101',1,1,1,1,'0','2026-06-14 14:48:51','admin','2026-06-14 14:48:51','admin'),('loc-parts-02','wh-parts-001','1-010102',1,1,1,2,'0','2026-06-14 14:48:51','admin','2026-06-14 14:48:51','admin'),('loc-parts-03','wh-parts-001','1-010201',1,1,2,1,'0','2026-06-14 14:48:51','admin','2026-06-14 14:48:51','admin'),('loc-parts-04','wh-parts-001','1-010202',1,1,2,2,'0','2026-06-14 14:48:51','admin','2026-06-14 14:48:51','admin'),('loc-parts-05','wh-parts-001','1-020101',1,2,1,1,'0','2026-06-14 14:48:51','admin','2026-06-14 14:48:51','admin'),('loc-parts-06','wh-parts-001','1-020102',1,2,1,2,'0','2026-06-14 14:48:51','admin','2026-06-14 14:48:51','admin'),('loc-parts-07','wh-parts-001','1-020201',1,2,2,1,'0','2026-06-14 14:48:51','admin','2026-06-14 14:48:51','admin'),('loc-parts-08','wh-parts-001','1-020202',1,2,2,2,'0','2026-06-14 14:48:51','admin','2026-06-14 14:48:51','admin');
/*!40000 ALTER TABLE `sp_warehouse_location` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_warehouse_receipt`
--

DROP TABLE IF EXISTS `sp_warehouse_receipt`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_warehouse_receipt` (
  `id` varchar(64) NOT NULL COMMENT '主键',
  `receipt_code` varchar(64) NOT NULL COMMENT '入库单号',
  `source_type` varchar(20) DEFAULT 'MANUAL' COMMENT '来源:MRP/MANUAL',
  `plan_id` varchar(64) DEFAULT NULL COMMENT '关联MRP计划ID(可空)',
  `order_id` varchar(64) DEFAULT NULL COMMENT '工单ID',
  `order_code` varchar(255) DEFAULT NULL COMMENT '工单编号',
  `product_code` varchar(50) DEFAULT NULL COMMENT '产品编码',
  `product_desc` varchar(200) DEFAULT NULL COMMENT '产品描述',
  `receipt_status` varchar(20) DEFAULT 'pending' COMMENT 'pending=待确认 partial=部分登账 completed=已完成',
  `total_items` int DEFAULT '0' COMMENT '明细总条数',
  `posted_items` int DEFAULT '0' COMMENT '已登账条数',
  `create_time` datetime NOT NULL,
  `create_username` varchar(64) NOT NULL,
  `update_time` datetime NOT NULL,
  `update_username` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_receipt_code` (`receipt_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='入库单主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sp_warehouse_receipt`
--

LOCK TABLES `sp_warehouse_receipt` WRITE;
/*!40000 ALTER TABLE `sp_warehouse_receipt` DISABLE KEYS */;
INSERT INTO `sp_warehouse_receipt` VALUES ('rcpt-20240817-001','RK20240817-00001','MANUAL',NULL,NULL,'GD20240817-001','PROD-001','台式电脑主机','partial',8,4,'2026-06-14 14:48:51','admin','2026-06-18 14:17:08','admin');
/*!40000 ALTER TABLE `sp_warehouse_receipt` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_warehouse_receipt_item`
--

DROP TABLE IF EXISTS `sp_warehouse_receipt_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_warehouse_receipt_item` (
  `id` varchar(64) NOT NULL COMMENT '主键',
  `receipt_id` varchar(64) NOT NULL COMMENT '关联入库单ID',
  `material_code` varchar(50) NOT NULL COMMENT '物料编码',
  `material_desc` varchar(200) DEFAULT NULL COMMENT '物料描述',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `quantity` decimal(10,2) NOT NULL COMMENT '入库数量',
  `warehouse_id` varchar(64) DEFAULT NULL COMMENT '登账库房ID',
  `warehouse_name` varchar(64) DEFAULT NULL COMMENT '登账库房名称',
  `location_id` varchar(64) DEFAULT NULL COMMENT '登账库位ID',
  `location_code` varchar(32) DEFAULT NULL COMMENT '登账库位编码',
  `post_status` varchar(20) DEFAULT 'pending' COMMENT 'pending=待登账 posted=已登账',
  `posted_at` datetime DEFAULT NULL COMMENT '登账时间',
  `create_time` datetime NOT NULL,
  `create_username` varchar(64) NOT NULL,
  `update_time` datetime NOT NULL,
  `update_username` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_receipt_id` (`receipt_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='入库单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sp_warehouse_receipt_item`
--

LOCK TABLES `sp_warehouse_receipt_item` WRITE;
/*!40000 ALTER TABLE `sp_warehouse_receipt_item` DISABLE KEYS */;
INSERT INTO `sp_warehouse_receipt_item` VALUES ('item-rcpt-01','rcpt-20240817-001','PART-001','CPU i7-13700K','个',100.00,'wh-parts-001','电脑配件库','loc-parts-02','1-010102','posted','2026-06-14 14:53:30','2026-06-14 14:48:51','admin','2026-06-14 14:53:30','admin'),('item-rcpt-02','rcpt-20240817-001','PART-002','DDR5 32GB 内存','条',100.00,'wh-parts-001','电脑配件库','loc-parts-01','1-010101','posted','2026-06-17 19:48:21','2026-06-14 14:48:51','admin','2026-06-17 19:48:21','admin'),('item-rcpt-03','rcpt-20240817-001','PART-003','SSD 1TB NVMe','个',100.00,'wh-parts-001','电脑配件库','loc-parts-03','1-010201','posted','2026-06-18 14:17:08','2026-06-14 14:48:51','admin','2026-06-18 14:17:08','admin'),('item-rcpt-04','rcpt-20240817-001','PART-004','主板 Z790','个',100.00,NULL,NULL,NULL,NULL,'pending',NULL,'2026-06-14 14:48:51','admin','2026-06-14 14:48:51','admin'),('item-rcpt-05','rcpt-20240817-001','PART-005','CPU散热器','个',100.00,'wh-parts-001','电脑配件库','loc-parts-05','1-020101','posted','2026-06-17 19:48:50','2026-06-14 14:48:51','admin','2026-06-17 19:48:50','admin'),('item-rcpt-06','rcpt-20240817-001','PART-006','机箱外壳 ATX','个',100.00,NULL,NULL,NULL,NULL,'pending',NULL,'2026-06-14 14:48:51','admin','2026-06-14 14:48:51','admin'),('item-rcpt-07','rcpt-20240817-001','PART-007','电源 750W 金牌','个',100.00,NULL,NULL,NULL,NULL,'pending',NULL,'2026-06-14 14:48:51','admin','2026-06-14 14:48:51','admin'),('item-rcpt-08','rcpt-20240817-001','PART-008','散热风扇 120mm','个',100.00,NULL,NULL,NULL,NULL,'pending',NULL,'2026-06-14 14:48:51','admin','2026-06-14 14:48:51','admin');
/*!40000 ALTER TABLE `sp_warehouse_receipt_item` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_work_shop`
--

DROP TABLE IF EXISTS `sp_work_shop`;
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

--
-- Dumping data for table `sp_work_shop`
--

LOCK TABLES `sp_work_shop` WRITE;
/*!40000 ALTER TABLE `sp_work_shop` DISABLE KEYS */;
INSERT INTO `sp_work_shop` VALUES ('1336875254022176','DC-车间1','电池组装车间','2020-03-14 11:29:57','admin','2020-03-18 10:52:39','admin'),('1336875591663648','DC-JS01','加酸车间','2020-03-14 11:32:38','admin','2020-03-14 11:32:38','admin');
/*!40000 ALTER TABLE `sp_work_shop` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_workflow_category`
--

DROP TABLE IF EXISTS `sp_workflow_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_workflow_category` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='流程分类';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sp_workflow_category`
--

LOCK TABLES `sp_workflow_category` WRITE;
/*!40000 ALTER TABLE `sp_workflow_category` DISABLE KEYS */;
/*!40000 ALTER TABLE `sp_workflow_category` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_workflow_definition`
--

DROP TABLE IF EXISTS `sp_workflow_definition`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_workflow_definition` (
  `id` varchar(64) NOT NULL COMMENT '主键id',
  `category_code` varchar(64) NOT NULL COMMENT '流程分类编码',
  `category_name` varchar(255) NOT NULL COMMENT '流程分类名称',
  `process_key` varchar(64) NOT NULL COMMENT '流程key',
  `process_name` varchar(255) NOT NULL COMMENT '流程名称',
  `enabled` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用：1启用，0停用',
  `form_key` varchar(64) DEFAULT NULL COMMENT '关联的流程表单key',
  `version` int NOT NULL DEFAULT '1' COMMENT '版本号(取自模型)',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) NOT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) NOT NULL COMMENT '最后更新人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_process_key` (`process_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='轻量流程定义表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sp_workflow_definition`
--

LOCK TABLES `sp_workflow_definition` WRITE;
/*!40000 ALTER TABLE `sp_workflow_definition` DISABLE KEYS */;
/*!40000 ALTER TABLE `sp_workflow_definition` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_workflow_event_log`
--

DROP TABLE IF EXISTS `sp_workflow_event_log`;
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

--
-- Dumping data for table `sp_workflow_event_log`
--

LOCK TABLES `sp_workflow_event_log` WRITE;
/*!40000 ALTER TABLE `sp_workflow_event_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `sp_workflow_event_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_workflow_event_rule`
--

DROP TABLE IF EXISTS `sp_workflow_event_rule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_workflow_event_rule` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='流程事件规则';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sp_workflow_event_rule`
--

LOCK TABLES `sp_workflow_event_rule` WRITE;
/*!40000 ALTER TABLE `sp_workflow_event_rule` DISABLE KEYS */;
/*!40000 ALTER TABLE `sp_workflow_event_rule` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_workflow_form`
--

DROP TABLE IF EXISTS `sp_workflow_form`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_workflow_form` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='流程表单';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sp_workflow_form`
--

LOCK TABLES `sp_workflow_form` WRITE;
/*!40000 ALTER TABLE `sp_workflow_form` DISABLE KEYS */;
/*!40000 ALTER TABLE `sp_workflow_form` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_workflow_instance`
--

DROP TABLE IF EXISTS `sp_workflow_instance`;
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

--
-- Dumping data for table `sp_workflow_instance`
--

LOCK TABLES `sp_workflow_instance` WRITE;
/*!40000 ALTER TABLE `sp_workflow_instance` DISABLE KEYS */;
/*!40000 ALTER TABLE `sp_workflow_instance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_workflow_model`
--

DROP TABLE IF EXISTS `sp_workflow_model`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sp_workflow_model` (
  `id` varchar(64) NOT NULL COMMENT '主键id',
  `model_key` varchar(64) NOT NULL COMMENT '模型key(字母开头,唯一)',
  `name` varchar(255) NOT NULL COMMENT '模型名称',
  `category_code` varchar(64) DEFAULT NULL COMMENT '分类编码(发布后填入)',
  `category_name` varchar(255) DEFAULT NULL COMMENT '分类名称(发布后填入)',
  `bpmn_xml` longtext COMMENT 'BPMN XML 内容',
  `status` varchar(32) NOT NULL DEFAULT 'DRAFT' COMMENT '状态:DRAFT/PUBLISHED',
  `version` int NOT NULL DEFAULT '1' COMMENT '版本号',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `create_username` varchar(64) DEFAULT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL COMMENT '最后更新时间',
  `update_username` varchar(64) DEFAULT NULL COMMENT '最后更新人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_model_key` (`model_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='流程模型';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sp_workflow_model`
--

LOCK TABLES `sp_workflow_model` WRITE;
/*!40000 ALTER TABLE `sp_workflow_model` DISABLE KEYS */;
INSERT INTO `sp_workflow_model` VALUES ('2069230064792244226','Record','入库流程',NULL,NULL,'<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<bpmn:definitions xmlns:bpmn=\"http://www.omg.org/spec/BPMN/20100524/MODEL\" xmlns:bpmndi=\"http://www.omg.org/spec/BPMN/20100524/DI\" xmlns:dc=\"http://www.omg.org/spec/DD/20100524/DC\" xmlns:di=\"http://www.omg.org/spec/DD/20100524/DI\" xmlns:flowable=\"http://flowable.org/bpmn\" id=\"Definitions_Record\" targetNamespace=\"http://flowable.org/processdef\">\n  <bpmn:process id=\"Record\" name=\"入库流程\" isExecutable=\"true\">\n    <bpmn:startEvent id=\"StartEvent_1\" name=\"开始\" />\n  </bpmn:process>\n  <bpmndi:BPMNDiagram id=\"BPMNDiagram_1\">\n    <bpmndi:BPMNPlane id=\"BPMNPlane_1\" bpmnElement=\"Record\">\n      <bpmndi:BPMNShape id=\"StartEvent_1_di\" bpmnElement=\"StartEvent_1\">\n        <dc:Bounds x=\"180\" y=\"160\" width=\"36\" height=\"36\" />\n      </bpmndi:BPMNShape>\n    </bpmndi:BPMNPlane>\n  </bpmndi:BPMNDiagram>\n</bpmn:definitions>','DRAFT',1,'2026-06-23 09:24:27','admin','2026-06-23 09:24:27','admin');
/*!40000 ALTER TABLE `sp_workflow_model` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sp_workflow_task`
--

DROP TABLE IF EXISTS `sp_workflow_task`;
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

--
-- Dumping data for table `sp_workflow_task`
--

LOCK TABLES `sp_workflow_task` WRITE;
/*!40000 ALTER TABLE `sp_workflow_task` DISABLE KEYS */;
/*!40000 ALTER TABLE `sp_workflow_task` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'mes_data'
--

--
-- Dumping routines for database 'mes_data'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-26 22:58:00
