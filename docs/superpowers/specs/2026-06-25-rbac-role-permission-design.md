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

## 2. 目标

1. **分配角色**:用户表单可多选角色,保存写入 `sp_sys_user_role`。
2. **访问收窄(三层)**:
   - 菜单层:侧栏只显示角色授权的菜单。
   - 路由层:直接输入未授权 URL 跳 `/403`。
   - 按钮层:系统管理页(用户/角色)的增删改按钮按角色显隐。
3. **admin 始终全权限**(按用户名 `admin` 硬放行)。

非目标(YAGNI):
- 不给全站所有模块补按钮级权限;按钮层仅覆盖**用户管理、角色管理**两页作为可演示切片,其余模块仅菜单+路由层(同样的按钮模式后续可平移)。
- 不重构 Shiro 认证链路、不改密码哈希、不动 `/admin/sys/menu/tree`(角色编辑取全量,必须保持)。

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

### 模块 2 — 后端:按钮级权限数据补齐(用户/角色页)

新增幂等迁移:`scripts/sql/2026-06-25-rbac-buttons.sql`

内容:
- 在用户管理(menu id `102`)下新增 `type='2'` 按钮菜单行,permission 规范化:
  - `user:add`(沿用,确保存在)、`user:update`、`user:delete`
- 在角色管理(menu id `103`)下新增 `type='2'` 按钮菜单行:
  - `role:add`(沿用)、`role:update`、`role:delete`
- 约束:`sp_sys_menu` 对 `name`、`code` 有**唯一索引** → 每个按钮行需唯一 `code`(如 `user_update`)与唯一 `name`(如 `用户管理-编辑`);`url` 置空(不进侧栏);`parent_id` 指向对应页菜单;`grade`/`sort_num` 合理填充。
- 幂等:每条 `INSERT INTO sp_sys_menu (...) SELECT ... WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE code = '...')`。
- admin 角色(id `1185025876737396738`)授权:由模块 1 的用户名硬放行覆盖,**无需**为这些按钮补 `sp_sys_role_menu` 关联;但脚本可选地为 admin 角色补关联以保持数据自洽(用 NOT EXISTS 幂等)。

效果:这些按钮行会出现在 RoleForm 的菜单树(`/admin/sys/menu/tree`)中作为可勾选叶子;授权给某角色后,该角色用户的 `permissions` Set 才会含对应串。

### 模块 3 — 前端:用户表单角色分配

后端接口(新增 JSON 端点):`GET /admin/sys/user/roles?id={userId}`
- 文件:`SysUserController.java`,新增 `@ResponseBody` 方法,复用 `sysRoleService.listByUserId(id)` 返回 `List<SysRoleDTO>`(全部角色 + `checked` 标记)。
- 新用户(无 id)→ `listByUserId(null/"")` 返回全部角色且 `checked=false`(SQL `sur.user_id = #{userId}` 命中空集)。

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
- `allowedRoutes` 计算用 `useMemo` 依赖 `menuInfo`。

`/digitization/plan`(在 `AdminLayout` 外、`PrivateRoute` 内的独立大屏路由):对应菜单 141「智慧大屏」。同规则校验 —— 复用 allowedRoutes 判定(可抽一个 `useAllowedRoutes` hook 供两处使用),未授权跳 `/403`。

### 模块 5 — 前端:按钮权限串对齐

- 模块 1 生效后 `permissions` 已正确收窄,`PermissionGuard` 自然起效,**无需改 `PermissionGuard` 本身**。
- 对齐 perm 串,与模块 2 的 DB permission 一致:
  - `UserList.tsx`:已用 `user:add` / `user:update` / `user:delete`(保持)。
  - `RoleList.tsx`:新增按钮 `<PermissionGuard>` 包裹 —— 新建用 `role:add`(已有),编辑/删除补 `role:update` / `role:delete`。
- admin 全量 → 所有按钮可见。

## 5. 验收

1. 新建角色「用户查看员」:RoleForm 中只勾「用户管理」页(不勾「用户管理-删除」按钮)。
2. 新建用户 `monkey` 分配该角色(模块 3)。
3. 用 `monkey` 登录:
   - 侧栏仅「用户管理」;
   - 直接访问 `/system/role` → `/403`;
   - 用户管理页**无删除按钮**(有/无新增按钮取决于是否授权 `user:add` 按钮)。
4. 用 `admin` 登录:全量菜单 + 全量按钮。
5. `pnpm --filter mes-new exec tsc --noEmit` 与 `pnpm lint` 通过。

## 6. 错误处理 / 边界

- 用户零角色 → `allowedRoutes` 仅白名单,侧栏空,仅可停留 `/welcome`,不报错。
- 菜单树请求失败 → 守卫停在 loading(已有拦截器 toast),不误跳 403。
- admin 始终放行(用户名级),即使其角色未授权任何菜单。
- 按钮行 `url` 为空 → `toReactRoute` 返回 undefined → 不进侧栏、不进 allowedRoutes,仅供权限串提取。

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
- `pages/system/role/RoleList.tsx`(按钮 perm 对齐)
- `components/RouteAccessGuard.tsx`(新增)+ `layouts/AdminLayout.tsx`(接入)
- (可能)`hooks/useAllowedRoutes.ts` 或 `stores/menuStore.ts` 派生

## 8. 实施顺序建议

1. 模块 2(SQL 数据)→ 2. 模块 1(后端过滤)→ 3. 模块 3(分配角色)→ 4. 模块 4(路由守卫)→ 5. 模块 5(按钮对齐)→ 6. 验收。
（先备好数据与后端过滤,前端各层才能在真实收窄的树上验证。）
