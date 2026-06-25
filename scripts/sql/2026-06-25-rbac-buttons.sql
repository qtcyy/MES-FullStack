-- RBAC 按钮级权限数据补齐(幂等,可重复执行)
-- 1) 规范化页菜单 permission 为 xxx:list,使「授权页面」≠「授权新增」
UPDATE `sp_sys_menu` SET `permission` = 'user:list' WHERE `url` = '/admin/sys/user/list-ui';
UPDATE `sp_sys_menu` SET `permission` = 'role:list' WHERE `url` = '/admin/sys/role/list-ui';
UPDATE `sp_sys_menu` SET `permission` = 'menu:list' WHERE `url` = '/admin/sys/menu/list-ui';
UPDATE `sp_sys_menu` SET `permission` = 'dept:list' WHERE `url` = '/admin/sys/department/list-ui';
UPDATE `sp_sys_menu` SET `permission` = 'dict:list' WHERE `url` = '/admin/sys/dict/list-ui';

-- 2) 补按钮级菜单行(type='2',url='' 不进侧栏);父按 url 关联,code 唯一守幂等
-- 用户管理
INSERT INTO `sp_sys_menu` (id,code,name,url,parent_id,grade,sort_num,type,permission,icon,descr,create_time,create_username,update_time,update_username)
SELECT 'btn_user_add','user_add','用户管理-新增','',p.id,'4',1,'2','user:add','','',NOW(),'system',NOW(),'system'
FROM `sp_sys_menu` p WHERE p.url='/admin/sys/user/list-ui' AND NOT EXISTS (SELECT 1 FROM `sp_sys_menu` m WHERE m.code='user_add');
INSERT INTO `sp_sys_menu` (id,code,name,url,parent_id,grade,sort_num,type,permission,icon,descr,create_time,create_username,update_time,update_username)
SELECT 'btn_user_update','user_update','用户管理-编辑','',p.id,'4',2,'2','user:update','','',NOW(),'system',NOW(),'system'
FROM `sp_sys_menu` p WHERE p.url='/admin/sys/user/list-ui' AND NOT EXISTS (SELECT 1 FROM `sp_sys_menu` m WHERE m.code='user_update');
INSERT INTO `sp_sys_menu` (id,code,name,url,parent_id,grade,sort_num,type,permission,icon,descr,create_time,create_username,update_time,update_username)
SELECT 'btn_user_delete','user_delete','用户管理-删除','',p.id,'4',3,'2','user:delete','','',NOW(),'system',NOW(),'system'
FROM `sp_sys_menu` p WHERE p.url='/admin/sys/user/list-ui' AND NOT EXISTS (SELECT 1 FROM `sp_sys_menu` m WHERE m.code='user_delete');
-- 角色管理
INSERT INTO `sp_sys_menu` (id,code,name,url,parent_id,grade,sort_num,type,permission,icon,descr,create_time,create_username,update_time,update_username)
SELECT 'btn_role_add','role_add','角色管理-新增','',p.id,'4',1,'2','role:add','','',NOW(),'system',NOW(),'system'
FROM `sp_sys_menu` p WHERE p.url='/admin/sys/role/list-ui' AND NOT EXISTS (SELECT 1 FROM `sp_sys_menu` m WHERE m.code='role_add');
INSERT INTO `sp_sys_menu` (id,code,name,url,parent_id,grade,sort_num,type,permission,icon,descr,create_time,create_username,update_time,update_username)
SELECT 'btn_role_update','role_update','角色管理-编辑','',p.id,'4',2,'2','role:update','','',NOW(),'system',NOW(),'system'
FROM `sp_sys_menu` p WHERE p.url='/admin/sys/role/list-ui' AND NOT EXISTS (SELECT 1 FROM `sp_sys_menu` m WHERE m.code='role_update');
INSERT INTO `sp_sys_menu` (id,code,name,url,parent_id,grade,sort_num,type,permission,icon,descr,create_time,create_username,update_time,update_username)
SELECT 'btn_role_delete','role_delete','角色管理-删除','',p.id,'4',3,'2','role:delete','','',NOW(),'system',NOW(),'system'
FROM `sp_sys_menu` p WHERE p.url='/admin/sys/role/list-ui' AND NOT EXISTS (SELECT 1 FROM `sp_sys_menu` m WHERE m.code='role_delete');
-- 菜单管理
INSERT INTO `sp_sys_menu` (id,code,name,url,parent_id,grade,sort_num,type,permission,icon,descr,create_time,create_username,update_time,update_username)
SELECT 'btn_menu_add','menu_add','菜单管理-新增','',p.id,'4',1,'2','menu:add','','',NOW(),'system',NOW(),'system'
FROM `sp_sys_menu` p WHERE p.url='/admin/sys/menu/list-ui' AND NOT EXISTS (SELECT 1 FROM `sp_sys_menu` m WHERE m.code='menu_add');
INSERT INTO `sp_sys_menu` (id,code,name,url,parent_id,grade,sort_num,type,permission,icon,descr,create_time,create_username,update_time,update_username)
SELECT 'btn_menu_update','menu_update','菜单管理-编辑','',p.id,'4',2,'2','menu:update','','',NOW(),'system',NOW(),'system'
FROM `sp_sys_menu` p WHERE p.url='/admin/sys/menu/list-ui' AND NOT EXISTS (SELECT 1 FROM `sp_sys_menu` m WHERE m.code='menu_update');
INSERT INTO `sp_sys_menu` (id,code,name,url,parent_id,grade,sort_num,type,permission,icon,descr,create_time,create_username,update_time,update_username)
SELECT 'btn_menu_delete','menu_delete','菜单管理-删除','',p.id,'4',3,'2','menu:delete','','',NOW(),'system',NOW(),'system'
FROM `sp_sys_menu` p WHERE p.url='/admin/sys/menu/list-ui' AND NOT EXISTS (SELECT 1 FROM `sp_sys_menu` m WHERE m.code='menu_delete');
-- 部门管理
INSERT INTO `sp_sys_menu` (id,code,name,url,parent_id,grade,sort_num,type,permission,icon,descr,create_time,create_username,update_time,update_username)
SELECT 'btn_dept_add','dept_add','部门管理-新增','',p.id,'4',1,'2','dept:add','','',NOW(),'system',NOW(),'system'
FROM `sp_sys_menu` p WHERE p.url='/admin/sys/department/list-ui' AND NOT EXISTS (SELECT 1 FROM `sp_sys_menu` m WHERE m.code='dept_add');
INSERT INTO `sp_sys_menu` (id,code,name,url,parent_id,grade,sort_num,type,permission,icon,descr,create_time,create_username,update_time,update_username)
SELECT 'btn_dept_update','dept_update','部门管理-编辑','',p.id,'4',2,'2','dept:update','','',NOW(),'system',NOW(),'system'
FROM `sp_sys_menu` p WHERE p.url='/admin/sys/department/list-ui' AND NOT EXISTS (SELECT 1 FROM `sp_sys_menu` m WHERE m.code='dept_update');
INSERT INTO `sp_sys_menu` (id,code,name,url,parent_id,grade,sort_num,type,permission,icon,descr,create_time,create_username,update_time,update_username)
SELECT 'btn_dept_delete','dept_delete','部门管理-删除','',p.id,'4',3,'2','dept:delete','','',NOW(),'system',NOW(),'system'
FROM `sp_sys_menu` p WHERE p.url='/admin/sys/department/list-ui' AND NOT EXISTS (SELECT 1 FROM `sp_sys_menu` m WHERE m.code='dept_delete');
-- 字典管理(线上若无该页则空转)
INSERT INTO `sp_sys_menu` (id,code,name,url,parent_id,grade,sort_num,type,permission,icon,descr,create_time,create_username,update_time,update_username)
SELECT 'btn_dict_add','dict_add','字典管理-新增','',p.id,'4',1,'2','dict:add','','',NOW(),'system',NOW(),'system'
FROM `sp_sys_menu` p WHERE p.url='/admin/sys/dict/list-ui' AND NOT EXISTS (SELECT 1 FROM `sp_sys_menu` m WHERE m.code='dict_add');
INSERT INTO `sp_sys_menu` (id,code,name,url,parent_id,grade,sort_num,type,permission,icon,descr,create_time,create_username,update_time,update_username)
SELECT 'btn_dict_update','dict_update','字典管理-编辑','',p.id,'4',2,'2','dict:update','','',NOW(),'system',NOW(),'system'
FROM `sp_sys_menu` p WHERE p.url='/admin/sys/dict/list-ui' AND NOT EXISTS (SELECT 1 FROM `sp_sys_menu` m WHERE m.code='dict_update');
INSERT INTO `sp_sys_menu` (id,code,name,url,parent_id,grade,sort_num,type,permission,icon,descr,create_time,create_username,update_time,update_username)
SELECT 'btn_dict_delete','dict_delete','字典管理-删除','',p.id,'4',3,'2','dict:delete','','',NOW(),'system',NOW(),'system'
FROM `sp_sys_menu` p WHERE p.url='/admin/sys/dict/list-ui' AND NOT EXISTS (SELECT 1 FROM `sp_sys_menu` m WHERE m.code='dict_delete');

-- 3) admin 角色补全所有菜单关联(含新按钮),保证数据自洽;主放行仍靠后端用户名
INSERT INTO `sp_sys_role_menu` (id,role_id,menu_id,create_time,create_username,update_time,update_username)
SELECT CONCAT('rm_admin_', m.id), r.id, m.id, NOW(),'system',NOW(),'system'
FROM `sp_sys_role` r CROSS JOIN `sp_sys_menu` m
WHERE r.code='admin'
  AND NOT EXISTS (SELECT 1 FROM `sp_sys_role_menu` x WHERE x.role_id=r.id AND x.menu_id=m.id);
