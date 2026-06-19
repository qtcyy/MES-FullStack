-- 流程配置工具新增菜单:流程表单管理 / 流程定义管理(挂在 sp_sys_menu#19 流程配置工具下)
-- 列序: id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username
-- 注:前端 urlMap 将 /workflow/form/list-ui → /workflow/form, /workflow/definition/list-ui → /workflow/definition

-- 流程表单管理
INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '193', 'workflowForm', '流程表单管理', '/workflow/form/list-ui', '19', '3', 3, '0', 'workflow:form:list', 'form', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '193');

-- 流程定义管理
INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '194', 'workflowDefinition', '流程定义管理', '/workflow/definition/list-ui', '19', '3', 4, '0', 'workflow:definition:list', 'partition', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '194');
