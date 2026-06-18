-- 流程配置工具菜单(两级:流程配置工具 → 流程分类管理 / 流程模型设计)
-- AppSidebar 仅渲染两级菜单,故不再嵌套"流程管控"中间层。
-- 列序: id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username

-- 顶层目录
INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '19', 'workflowTool', '流程配置工具', '#', '0', '0', 9, '0', 'workflow:view', 'deployment-unit', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '19');

-- 流程分类管理
INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '191', 'workflowCategory', '流程分类管理', '/workflow/category/list-ui', '19', '3', 1, '0', 'workflow:category:list', 'apartment', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '191');

-- 流程模型设计
INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '192', 'workflowModel', '流程模型设计', '/workflow/model/list-ui', '19', '3', 2, '0', 'workflow:model:list', 'branches', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '192');
