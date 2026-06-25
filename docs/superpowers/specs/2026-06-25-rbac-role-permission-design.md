# 设计:基于角色的权限管控(RBAC)

- 日期:2026-06-25
- 范围:mes-new 前端(`mes/frontend/apps/mes-new`)+ 后端 system 模块
- 关联记忆:`[[menu-driven-sidebar-route-mapping]]`、`[[backend-deepseek-review-each-cycle]]`、`[[mes-new-design-system]]`

## 1. 背景与问题

用户管理页(`/system/user`)新建用户时**无法为用户分配角色/权限**;开发要求规定"用角色权限区分,用户对应角色没有的权限无法访问"。现状勘查结论:

1. **分配角色 — 后端已就绪,前端缺口**
   - `SysUserDTO.sysRoleIds: String[]` 已存在;`POST /admin/sys/user/add-or-update` 保存时调 `SysRoleServiceImpl.rebuild()`,先清后插 `sp_sys_user_role`。
   - 但 `UserForm.tsx` 只暴露 登录名/姓名/密码,**根本没有角色字段**。

2. **访问收窄 — 当前完全未生效(更严重)**
   - 登录后 mes-new 调 `GET /admin/list/index/menu/tree` → `SysMenuServiceImpl.listIndexMenuTree()`,**返回全部菜单,未按角色过滤**。
   - 后果:`collectPermissions` 把**所有**权限串塞进 `authStore.permissions` → `hasPermission` 恒真 → `PermissionGuard` 形同虚设;侧栏对所有人显示全部菜单。
   - `PrivateRoute` 只校验"是否登录",不校验"能否访问该页",直接输 URL 即可进任意页面。

3. **按钮级权限 — 数据层面不支持**
   - `sp_sys_menu.permission` 基本是占位符:几乎所有菜单都写成 `user:add`,角色管理是 `role:add`,**没有独立的按钮级菜单行**(无单独"删除按钮"菜单)。
   - 因此前端 `PermissionGuard perm="user:update"`/`"user:delete"` 在 DB 里**没有对应权限串**,一旦菜单树按角色过滤生效,这两个按钮会对**所有人**隐藏。
   - 且页菜单 permission 复用了 `xxx:add`:若不规范化,授权页菜单就等于自动授权了"新增"按钮,无法做"只读查看"角色。

4. **种子文件已过时**
   - `scripts/sql/MySQL-20210225.sql` 只含 2019–2021 的旧菜单(系统管理下仅 101/102/103/104 + 基础数据两项,**无字典菜单行**)。
   - 但 mes-new 侧栏由 `sp_sys_menu` 驱动且已能显示大量新页面(见 `[[menu-driven-sidebar-route-mapping]]`),说明**线上 DB 的菜单数据已被扩充**。⇒ SQL 迁移**不能写死 parent id**,须按稳定的 `code`/`url` 自适应引用,且对不存在的父菜单自然跳过。

5. **后端不做权限串鉴权**
   - 全仓库**无 `@RequiresPermissions`/`@RequiresRoles` 注解**;唯一 Shiro 授权是工作流 `subject.hasRole(候选角色code)`(用角色编码,非权限串)。filter chain 对 `/admin/**` 只要求 `authc`。
   - ⇒ 改 `permission` 串对后端鉴权零影响;权限拦截发生在**前端**。

## 2. 目标

1. **分配角色**:用户表单可多选角色,保存写入 `sp_sys_user_role`。
2. **访问收窄(三层)**:
   - 菜单层:侧栏只显示角色授权的菜单。
   - 路由层:直接输入未授权 URL 跳 `/403`。
   - 按钮层:**系统管理模块**各页(用户 / 角色 / 菜单 / 部门 / 字典)的增删改按钮按角色显隐。
3. **admin 始终全权限**(按用户名 `admin` 硬放行)。

非目标(YAGNI):
- 按钮层只覆盖**系统管理模块**;其余模块(基础数据 / 工艺 / 订单 / 库存 / 工作流)仅菜单+路由层(同样的按钮模式后续可平移)。
- **不做后端按页 / 按端点鉴权**:本期拦截在前端(满足"界面上无法访问")。后端 API 直连不拦截属已知边界,后续若需可加 Shiro 注解/过滤器(单独立项)。
- 不重构 Shiro 认证链路、不改密码哈希、不动 `/admin/sys/menu/tree`(角色编辑取全量,必须保持)、不改任何角色 `code`(工作流 `hasRole` 依赖)。

## 3. 架构总览 / 数据流

```
登录
  └─ 后端 listIndexMenuTree【按当前登录用户角色过滤】   ← 模块 1
       └─ 前端 menuStore 拿到「已收窄」菜单树
            ├─ AppSidebar(已 menu-driven,自动跟随收窄)
            ├─ collectPermissions → authStore.permissions(自动跟随)→ PermissionGuard 按钮  ← 模块 5
            └─ allowedRoutes(新增派生)→ RouteAccessGuard 路由守卫                          ← 模块 4
```

**核心不变量**:前端所有收窄(侧栏 / 按钮 / 路由)都派生自后端那一棵被过滤的菜单树。前端不另立权限规则,后端是唯一权威。
**一致性保证**:`allowedRoutes` 用与侧栏**完全相同**的 `toReactRoute(node.url)` 计算 —— "侧栏点得到的页面就能访问;不在你侧栏里的页面直连即 403"。

## 4. 模块详细设计

### 模块 1 — 后端:菜单树按角色过滤(核心)

文件:`mes/src/main/java/com/wangziyang/mes/system/service/impl/SysMenuServiceImpl.java`(`listIndexMenuTree()`)

逻辑:
1. 取当前 Shiro 主体 `SysUserDTO`(`SecurityUtils.getSubject().getPrincipal()`)。
2. **admin 放行**:`"admin".equals(user.getUsername())` → 不过滤,走原全量逻辑。
3. 否则计算该用户授权菜单 id 集合 `grantedIds`:
   - 首选取自认证主体已加载的 `sysRoleDTOs → sysMenuDtos` 的 id;
   - 若该数据不可靠/为空,新增 `SysMenuMapper.listByUserId(userId)`(join `sp_sys_user_role` → `sp_sys_role_menu` → `sp_sys_menu`)兜底。
4. **剪枝构树**:在原有"全量列表 → 树"基础上,保留满足"自身 ∈ grantedIds **或** 任一后代 ∈ grantedIds"的节点;空目录丢弃。保证树连通,不因只授权子节点而丢失父目录。

约束:
- 仅改 `listIndexMenuTree`;`SysMenuController` 的 `/admin/sys/menu/tree` 全量逻辑不动。
- **后端审查点(DeepSeek 常带 bug)**:核对现有构树/分组逻辑、principal 强转安全、空集合与 NPE。

### 模块 2 — 后端:系统管理模块按钮级权限数据补齐

新增**幂等、按 code 自适应**的迁移:`scripts/sql/2026-06-25-rbac-buttons.sql`

针对系统管理各页(父菜单 `code` ∈ `{menu, user, role, department, dict}`,**字典等若线上不存在则自然跳过**):

1. **规范化页菜单 permission** 为 `xxx:list`(可进入/查看标记),使"授权页面"不再等于"授权新增":
   - `UPDATE sp_sys_menu SET permission='user:list' WHERE code='user'`;`role:list`/`menu:list`/`dept:list`/`dict:list` 同理。
2. **新增按钮行**(`type='2'`,`url=''` → 不进侧栏),permission 规范:`xxx:add` / `xxx:update` / `xxx:delete`。
   - 父引用按 code:`... SELECT <id>, 'user_add', '用户管理-新增', '', p.id, '4', 1, '2', 'user:add', ... FROM sp_sys_menu p WHERE p.code='user'`。
   - `sp_sys_menu` 对 `name`、`code` 有**唯一索引** → 按钮行需唯一 `code`(如 `user_update`)与唯一 `name`(如 `用户管理-编辑`);`id` 用固定不冲突的字符串。
   - 幂等:每条用 `... AND NOT EXISTS (SELECT 1 FROM sp_sys_menu m WHERE m.code='user_update')`;父不存在时 `SELECT FROM p` 无行,自动跳过。
3. **admin 角色数据自洽**:幂等地给 admin 角色(`code='admin'`,如 `id=1185025876737396738`)补 `sp_sys_role_menu` 关联,覆盖这些页菜单 + 新按钮行(`INSERT ... SELECT ... WHERE NOT EXISTS`)。主放行仍靠模块 1 用户名,本步仅保证 RoleForm 里 admin 角色显示完整。

效果:按钮行出现在 RoleForm 菜单树(`/admin/sys/menu/tree`)中作为可勾选叶子;授权给某角色后,该角色用户 `permissions` Set 才含对应串。

### 模块 3 — 前端:用户表单角色分配

后端接口(新增 JSON 端点):`GET /admin/sys/user/roles?id={userId}`
- 文件:`SysUserController.java`,新增 `@ResponseBody` 方法,复用 `sysRoleService.listByUserId(id)` 返回 `List<SysRoleDTO>`(全部角色 + `checked` 标记)。
- 新用户(无 id)→ `listByUserId(null/"")` 命中空集 → 返回全部角色且 `checked=false`。

前端:
- `src/api/system/user.ts`:加 `userRoles(id?: string)` → `GET /admin/sys/user/roles`,返回 `SysRolePick[]`(`{ id, name, checked }`)。
- `src/types`:补 `SysRolePick`(或复用 `SysRole` + `checked`)。
- `src/pages/system/user/UserForm.tsx`:
  - 用 `useQuery$` 拉 `userRoles(record?.id)`(表单 open 时)。
  - 新增 `FormSection title="角色分配"`,渲染角色复选框组(`@workspace/ui` `Checkbox`),用本地 `checkedRoleIds: string[]` 状态,初值取 `checked===true` 的项。
  - `onSubmit` 时把 `checkedRoleIds` 写入 `dto.sysRoleIds`(`SysUserDTO.sysRoleIds` 已存在)。
  - 表单关闭/重开时重置(对齐现有 `useEffect(open)` 模式)。

### 模块 4 — 前端:路由级访问守卫

新增 `src/components/RouteAccessGuard.tsx`:
- 在 `AdminLayout` 内包住 `<Outlet/>`(`AdminLayout` 已负责触发 `fetchMenuTree` 且持有 `loaded`)。
- 由 `menuInfo` 计算 `allowedRoutes: Set<string>`:递归遍历树,`node.url → toReactRoute(node.url)`,非空者纳入;并入白名单 `/welcome`、`/403`。
- `menuStore.loaded === false` → 渲染 loading 占位,**不**做跳转判断(避免菜单未到时误判 403)。
- `loaded` 且当前 `location.pathname` ∉ `allowedRoutes` → `<Navigate to="/403" replace />`;否则 `<Outlet/>`。
- `allowedRoutes` 计算用 `useMemo` 依赖 `menuInfo`;抽 `useAllowedRoutes()` hook 供大屏路由复用。

`/digitization/plan`(在 `AdminLayout` 外、`PrivateRoute` 内的独立大屏路由):对应菜单「智慧大屏」。复用 `useAllowedRoutes()` 同规则校验,未授权跳 `/403`。

### 模块 5 — 前端:按钮权限串对齐 + 补 PermissionGuard

- 模块 1 生效后 `permissions` 已正确收窄,`PermissionGuard` 自然起效,**无需改 `PermissionGuard` 本身**。
- 对齐 perm 串,与模块 2 的 DB permission 一致(`xxx:add`/`xxx:update`/`xxx:delete`):
  - `UserList.tsx`:已用 `user:add`/`user:update`/`user:delete`(保持)。
  - `RoleList.tsx`:新建用 `role:add`(已有),编辑/删除按钮**补** `PermissionGuard` → `role:update`/`role:delete`。
  - `MenuList.tsx`、`DeptList.tsx`、`DictList.tsx`:当前**无** `PermissionGuard`,给新建/编辑/删除按钮分别补 `menu:add|update|delete`、`dept:add|update|delete`、`dict:add|update|delete`。
- admin 全量 → 所有按钮可见。

## 5. 验收

1. 新建角色「用户查看员」:RoleForm 中只勾「用户管理」页(不勾其下任何按钮)。
2. 新建用户 `monkey` 分配该角色(模块 3)。
3. 用 `monkey` 登录:
   - 侧栏仅「用户管理」;
   - 直接访问 `/system/role` → `/403`;
   - 用户管理页**无新增/编辑/删除按钮**(只读)。
4. 再建角色「用户管理员」:勾「用户管理」页 + 其下「新增/编辑」按钮(不勾删除)→ 对应用户登录:用户管理页有新增/编辑、无删除。
5. 用 `admin` 登录:全量菜单 + 全量按钮。
6. `pnpm --filter mes-new exec tsc --noEmit` 与 `pnpm lint` 通过。

## 6. 错误处理 / 边界

- 用户零角色 → `allowedRoutes` 仅白名单,侧栏空,仅可停留 `/welcome`,不报错。
- 菜单树请求失败 → 守卫停在 loading(已有拦截器 toast),不误跳 403。
- admin 始终放行(用户名级),即使其角色未授权任何菜单。
- 按钮行 `url` 为空 → `toReactRoute` 返回 undefined → 不进侧栏、不进 allowedRoutes,仅供权限串提取。
- **后端不拦截**:权限隔离在前端;直接调后端 API 不受限(本期范围外,见非目标)。
- 线上 DB 菜单与种子文件不一致:SQL 按 `code` 自适应,父不存在则跳过,不报错。

## 7. 涉及文件清单(预估)

后端:
- `system/service/impl/SysMenuServiceImpl.java`(改 `listIndexMenuTree`)
- `system/controller/admin/SysUserController.java`(加 `GET /roles`)
- (可能)`SysMenuMapper.java` + `resources/mapper/system/SysMenuMapper.xml`(`listByUserId` 兜底)
- `scripts/sql/2026-06-25-rbac-buttons.sql`(新增迁移)

前端(`mes/frontend/apps/mes-new/src`):
- `api/system/user.ts`(加 `userRoles`)
- `types/*`(补 `SysRolePick`)
- `pages/system/user/UserForm.tsx`(角色分配)
- `pages/system/role/RoleList.tsx`、`pages/system/menu/MenuList.tsx`、`pages/system/dict/DictList.tsx`、`pages/system/dept/DeptList.tsx`(补/对齐 `PermissionGuard`)
- `components/RouteAccessGuard.tsx`(新增)+ `layouts/AdminLayout.tsx`(接入)
- `hooks/useAllowedRoutes.ts`(新增,守卫 + 大屏路由复用)

## 8. 实施顺序建议

1. 模块 2(SQL 数据)→ 2. 模块 1(后端过滤)→ 3. 模块 3(分配角色)→ 4. 模块 4(路由守卫)→ 5. 模块 5(按钮对齐)→ 6. 验收。
（先备好数据与后端过滤,前端各层才能在真实收窄的树上验证。）
