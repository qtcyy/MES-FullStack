-- =============================================================================
-- Phase 5 种子数据：生产订单录入 + BPMN 订单审批
-- 内容：
--   1) 角色：计划员(planner) / 生产主管(prod_supervisor)
--   2) 账号：planner/123、supervisor/123（密码哈希严格按后端登录算法生成）
--   3) 用户-角色绑定
--   4) 菜单：生产计划中心 + 生产订单录入(/plan/order) + 待办任务(/plan/todo)
--   5) 角色-菜单绑定
--   6) 台式电脑主机 BOM（state=pass）+ BOM 子项
--   7) 订单审批 BPMN 模型(PUBLISHED) + 流程定义(process_key=orderAudit)
--
-- 密码算法（与 ShiroConfig + ShiroRealm + SysUserServiceImpl 完全一致）：
--   new Md5Hash(password, username, 3).toString()
--   == new SimpleHash("md5", password, ByteSource.Util.bytes(username), 3).toHex()
--   即：MD5、salt=用户名、迭代 3 次、十六进制输出。
--   已用 shiro-core-1.4.0（应用同款依赖）实测生成并校验。
--   注意：MySQL-init-all.sql 中 admin 的存量哈希 038bdaf... 经实测无法由该算法
--        反推出 admin/admin（属历史脏数据），本脚本不依赖它，按真实算法落库。
--        admin/admin 在该算法下实际应为 3fed7a346e430ea4c2aa10250928f4de。
--
-- 幂等：每段 INSERT 前先按固定 id（及唯一键）DELETE，可重复执行。
-- 依赖：需先执行 MySQL-init-all.sql 与 workflow-config-tables.sql
--      （后者为 sp_workflow_definition 增加 form_key/version 两列、并建 sp_workflow_model）。
-- =============================================================================

SET NAMES utf8mb4;

-- -----------------------------------------------------------------------------
-- 1) 角色
--    sp_sys_role 对 name、code 均有唯一键。生产主管(prod_supervisor)与存量
--    角色(id=5)冲突，故先按 id 及唯一键清理，再以固定 id 落库（幂等可重跑）。
-- -----------------------------------------------------------------------------
DELETE FROM sp_sys_role
 WHERE id IN ('r_planner','r_supervisor')
    OR name IN ('计划员','生产主管')
    OR code IN ('planner','prod_supervisor');
INSERT INTO sp_sys_role (id,name,code,descr,is_deleted,create_time,create_username,update_time,update_username,is_system) VALUES
('r_planner',   '计划员',  'planner',        '生产计划录入', '0', NOW(),'admin',NOW(),'admin','1'),
('r_supervisor','生产主管','prod_supervisor','生产订单审批', '0', NOW(),'admin',NOW(),'admin','1');

-- -----------------------------------------------------------------------------
-- 2) 账号（密码均为 123；哈希按上文算法实测生成）
--    sp_sys_user.mobile NOT NULL 且唯一；email/tel 等给定合理值。
-- -----------------------------------------------------------------------------
DELETE FROM sp_sys_user
 WHERE id IN ('u_planner','u_supervisor')
    OR username IN ('planner','supervisor')
    OR mobile IN ('13800000001','13800000002');
INSERT INTO sp_sys_user (id,name,username,password,dept_id,email,mobile,tel,sex,is_deleted,create_time,create_username,update_time,update_username) VALUES
('u_planner',   '计划员',  'planner',   '9cfada4efab506fd3fdceb0a6b082c02','2','planner@mes.com','13800000001','','1','0',NOW(),'admin',NOW(),'admin'),
('u_supervisor','生产主管','supervisor','93d9b09fdc2af179241c022fc829869c','2','sup@mes.com',    '13800000002','','1','0',NOW(),'admin',NOW(),'admin');

-- -----------------------------------------------------------------------------
-- 3) 用户-角色
-- -----------------------------------------------------------------------------
DELETE FROM sp_sys_user_role WHERE id IN ('ur_planner','ur_supervisor');
INSERT INTO sp_sys_user_role (id,user_id,role_id,create_time,create_username,update_time,update_username) VALUES
('ur_planner',   'u_planner',   'r_planner',   NOW(),'admin',NOW(),'admin'),
('ur_supervisor','u_supervisor','r_supervisor',NOW(),'admin',NOW(),'admin');

-- -----------------------------------------------------------------------------
-- 4) 菜单（sp_sys_menu 对 name、code 均有唯一键；顶级 parent_id 约定为 '0'）
--    grade/type 为 varchar(1)，sort_num 为 int。
-- -----------------------------------------------------------------------------
DELETE FROM sp_sys_menu
 WHERE id IN ('m_plan','m_plan_order','m_plan_todo')
    OR code IN ('planCenter','planOrderEntry','planTodo')
    OR name IN ('生产计划中心','生产订单录入','待办任务');
INSERT INTO sp_sys_menu (id,code,name,url,parent_id,grade,sort_num,type,permission,icon,descr,create_time,create_username,update_time,update_username) VALUES
('m_plan',      'planCenter',    '生产计划中心','/plan',      '0',     '1',60,'0','',                                                       'el-icon-Calendar','',NOW(),'admin',NOW(),'admin'),
('m_plan_order','planOrderEntry','生产订单录入','/plan/order','m_plan','2', 1,'1','plan:order:list,plan:order:add',                          'el-icon-Document','',NOW(),'admin',NOW(),'admin'),
('m_plan_todo', 'planTodo',      '待办任务',    '/plan/todo', 'm_plan','2', 2,'1','plan:todo:list,workflow:task:claim,workflow:task:complete','el-icon-Bell',    '',NOW(),'admin',NOW(),'admin');

-- -----------------------------------------------------------------------------
-- 5) 角色-菜单（计划员 + 生产主管 均挂这三个菜单；id 固定以便幂等）
-- -----------------------------------------------------------------------------
DELETE FROM sp_sys_role_menu
 WHERE role_id IN ('r_planner','r_supervisor')
   AND menu_id IN ('m_plan','m_plan_order','m_plan_todo');
INSERT INTO sp_sys_role_menu (id,role_id,menu_id,create_time,create_username,update_time,update_username)
SELECT CONCAT(r.id,'_',m.id), r.id, m.id, NOW(),'admin',NOW(),'admin'
FROM (SELECT 'r_planner' id UNION SELECT 'r_supervisor') r,
     (SELECT 'm_plan' id UNION SELECT 'm_plan_order' UNION SELECT 'm_plan_todo') m;

-- -----------------------------------------------------------------------------
-- 6) 台式电脑主机 BOM（state=pass）+ BOM 子项
--    sp_bom_item: line_no 为 varchar(10)（带引号）；item_num 为 decimal；
--    oper_typer 允许 NULL。共 12 列。
-- -----------------------------------------------------------------------------
DELETE FROM sp_bom WHERE id='bom_pc_host';
INSERT INTO sp_bom (id,bom_code,materiel_code,materiel_desc,remark,version_number,state,factory,is_deleted,create_time,create_username,update_time,update_username) VALUES
('bom_pc_host','BOM-PC-HOST','PC-HOST-001','台式电脑主机','示例产品BOM','V1.0','pass','F001','0',NOW(),'admin',NOW(),'admin');

DELETE FROM sp_bom_item WHERE bom_head_id='bom_pc_host';
INSERT INTO sp_bom_item (id,bom_head_id,materiel_item_code,materiel_item_desc,line_no,item_num,item_unit,oper_typer,create_time,create_username,update_time,update_username) VALUES
('bi_pc_1','bom_pc_host','PART-CPU','CPU i7',    '10',1,'个',NULL,NOW(),'admin',NOW(),'admin'),
('bi_pc_2','bom_pc_host','PART-MB', '主板',      '20',1,'块',NULL,NOW(),'admin',NOW(),'admin'),
('bi_pc_3','bom_pc_host','PART-RAM','内存16G',   '30',2,'条',NULL,NOW(),'admin',NOW(),'admin'),
('bi_pc_4','bom_pc_host','PART-SSD','固态硬盘1T','40',1,'块',NULL,NOW(),'admin',NOW(),'admin');

-- -----------------------------------------------------------------------------
-- 7) 订单审批 BPMN 模型(PUBLISHED) + 流程定义(orderAudit)
--    sp_workflow_definition: enabled 为 tinyint(1)（取 1）；process_key 唯一；
--    form_key/version 由 workflow-config-tables.sql 补列。
-- -----------------------------------------------------------------------------
DELETE FROM sp_workflow_model WHERE id='wfm_order_audit' OR model_key='orderAudit';
INSERT INTO sp_workflow_model (id,model_key,name,category_code,category_name,bpmn_xml,status,version,create_time,create_username,update_time,update_username) VALUES
('wfm_order_audit','orderAudit','订单审批流程','order','订单管理',
'<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:flowable="http://flowable.org/bpmn" targetNamespace="http://flowable.org/processdef"><bpmn:process id="orderAudit" name="订单审批流程" isExecutable="true"><bpmn:startEvent id="start" name="开始"/><bpmn:userTask id="approve" name="生产主管审批" flowable:candidateGroups="prod_supervisor"/><bpmn:endEvent id="end" name="结束"/><bpmn:sequenceFlow id="f1" sourceRef="start" targetRef="approve"/><bpmn:sequenceFlow id="f2" sourceRef="approve" targetRef="end"/></bpmn:process></bpmn:definitions>',
'PUBLISHED',1,NOW(),'admin',NOW(),'admin');

DELETE FROM sp_workflow_definition WHERE id='wfd_order_audit' OR process_key='orderAudit';
INSERT INTO sp_workflow_definition (id,category_code,category_name,process_key,process_name,enabled,form_key,version,create_time,create_username,update_time,update_username) VALUES
('wfd_order_audit','order','订单管理','orderAudit','订单审批流程',1,NULL,1,NOW(),'admin',NOW(),'admin');
