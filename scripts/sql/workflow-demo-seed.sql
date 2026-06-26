-- =====================================================================
-- 工作流配置演示数据(周期 1h:Vue3 工作流配置页演示用)
-- 说明:BPMN 可视化设计器在 Cycle 3,本脚本预置 2 条「已发布」模型 +
--       对应流程定义,让「流程定义管理」页有数据可演示(启停/关联表单/事件)。
-- 前置:先执行 workflow-config-tables.sql(建 4 表 + definition 补 form_key/version)。
-- 幂等:全部 WHERE NOT EXISTS,可重复执行。
-- 约定:definition.id = model.id(发布动作落库语义);id 用 wf_demo_* 便于识别。
-- =====================================================================

-- 1) 流程分类
INSERT INTO sp_workflow_category (id, code, name, descr, create_time, create_username, update_time, update_username)
SELECT 'wf_demo_cat_order', 'ORDER_APPROVAL', '订单审批', '生产订单审批类流程', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_workflow_category WHERE id = 'wf_demo_cat_order');

INSERT INTO sp_workflow_category (id, code, name, descr, create_time, create_username, update_time, update_username)
SELECT 'wf_demo_cat_quality', 'QUALITY', '质量管控', '质量检验类流程', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_workflow_category WHERE id = 'wf_demo_cat_quality');

-- 2) 流程表单(供「关联表单」演示)
INSERT INTO sp_workflow_form (id, name, form_key, form_type, title_script, pc_url_script, mobile_url_script, skip_same_assignee, create_time, create_username, update_time, update_username)
SELECT 'wf_demo_form_order', '订单审批表单', 'orderApprovalForm', 'URL',
       '生产订单审批 - ${orderCode}', '/order/detail?id=${businessId}', '/mobile/order/detail?id=${businessId}',
       0, NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_workflow_form WHERE id = 'wf_demo_form_order');

-- 3) 流程模型(status=PUBLISHED,含最小合法 BPMN 骨架,分类已回填)
INSERT INTO sp_workflow_model (id, model_key, name, category_code, category_name, bpmn_xml, status, version, create_time, create_username, update_time, update_username)
SELECT 'wf_demo_model_order', 'orderApproval', '订单审批流程', 'ORDER_APPROVAL', '订单审批',
       '<?xml version="1.0" encoding="UTF-8"?><definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:flowable="http://flowable.org/bpmn" targetNamespace="mes"><process id="orderApproval" name="订单审批流程" isExecutable="true"><startEvent id="start" name="开始"/><userTask id="approve" name="审批" flowable:assignee="${initiator}"/><endEvent id="end" name="结束"/><sequenceFlow id="f1" sourceRef="start" targetRef="approve"/><sequenceFlow id="f2" sourceRef="approve" targetRef="end"/></process></definitions>',
       'PUBLISHED', 1, NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_workflow_model WHERE id = 'wf_demo_model_order');

INSERT INTO sp_workflow_model (id, model_key, name, category_code, category_name, bpmn_xml, status, version, create_time, create_username, update_time, update_username)
SELECT 'wf_demo_model_quality', 'qualityCheck', '质量检验流程', 'QUALITY', '质量管控',
       '<?xml version="1.0" encoding="UTF-8"?><definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:flowable="http://flowable.org/bpmn" targetNamespace="mes"><process id="qualityCheck" name="质量检验流程" isExecutable="true"><startEvent id="start" name="开始"/><userTask id="check" name="检验" flowable:assignee="${initiator}"/><endEvent id="end" name="结束"/><sequenceFlow id="f1" sourceRef="start" targetRef="check"/><sequenceFlow id="f2" sourceRef="check" targetRef="end"/></process></definitions>',
       'PUBLISHED', 1, NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_workflow_model WHERE id = 'wf_demo_model_quality');

-- 4) 流程定义(id = 对应 model.id;process_key = model_key;enabled=1;form_key 留空待页面关联)
INSERT INTO sp_workflow_definition (id, category_code, category_name, process_key, process_name, enabled, form_key, version, create_time, create_username, update_time, update_username)
SELECT 'wf_demo_model_order', 'ORDER_APPROVAL', '订单审批', 'orderApproval', '订单审批流程', 1, NULL, 1, NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_workflow_definition WHERE id = 'wf_demo_model_order');

INSERT INTO sp_workflow_definition (id, category_code, category_name, process_key, process_name, enabled, form_key, version, create_time, create_username, update_time, update_username)
SELECT 'wf_demo_model_quality', 'QUALITY', '质量管控', 'qualityCheck', '质量检验流程', 1, NULL, 1, NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_workflow_definition WHERE id = 'wf_demo_model_quality');

-- 5) 流程事件规则(订单审批定义下两条;注意 DB 列名 trigger_type,非 trigger)
INSERT INTO sp_workflow_event_rule (id, definition_id, name, trigger_type, business_type, action_type, target_status, script, enabled, create_time, create_username, update_time, update_username)
SELECT 'wf_demo_rule_start', 'wf_demo_model_order', '发起即审批中', 'START', 'ORDER_APPROVAL', 'SET_AUDIT_STATUS', 'APPROVING', NULL, 1, NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_workflow_event_rule WHERE id = 'wf_demo_rule_start');

INSERT INTO sp_workflow_event_rule (id, definition_id, name, trigger_type, business_type, action_type, target_status, script, enabled, create_time, create_username, update_time, update_username)
SELECT 'wf_demo_rule_end', 'wf_demo_model_order', '通过置审批通过', 'END', 'ORDER_APPROVAL', 'SET_AUDIT_STATUS', 'APPROVED', NULL, 1, NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_workflow_event_rule WHERE id = 'wf_demo_rule_end');
