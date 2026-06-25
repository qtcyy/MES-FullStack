# 基于角色的权限管控(RBAC)实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 mes-new 能给用户分配角色,并按角色对菜单 / 路由 / 按钮三层收窄访问,admin 始终全权限。

**Architecture:** 后端 `listIndexMenuTree` 按当前登录用户授权菜单剪枝(admin 用户名放行)→ 前端拿到收窄后的菜单树,侧栏 / 权限 Set / 路由白名单全部派生自这棵树。按钮级权限靠补齐系统管理模块的按钮级菜单行 + 规范化 permission 串实现。

**Tech Stack:** 后端 Spring Boot 2.1 + MyBatis-Plus + Shiro(Java 8);前端 React 18 + TS + Vite + shadcn(`@workspace/ui`)+ `@ngify/http` + rxjs hooks + zustand;测试 vitest(前端)/ JUnit(后端纯函数);MySQL 8。

**关联设计文档:** `docs/superpowers/specs/2026-06-25-rbac-role-permission-design.md`

**前置约定:**
- 所有 `git` 命令在仓库根 `/Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack` 执行;当前分支 `develop`。
- 前端命令在 `mes/frontend` 下用 `pnpm --filter mes-new <script>`。
- 后端 maven 若环境受限(见记忆 `[[backend-build-mvnw-broken]]`:`./mvnw` 损坏,用系统 `mvn` + JDK11),则后端 JUnit 用 Task 8 手动验收兜底。

---

## 文件结构

**后端(`mes/src/main/java/com/wangziyang/mes/`)**
- `system/util/MenuTreeFilter.java`(新增):纯静态剪枝函数,可单测。
- `system/util/MenuTreeFilterTest.java`(新增,测试):剪枝逻辑单测。
- `system/service/impl/SysMenuServiceImpl.java`(改):`listIndexMenuTree` 接入剪枝 + admin 放行。
- `system/mapper/SysMenuMapper.java`(改):加 `listMenuIdsByUserId`。
- `system/controller/admin/SysUserController.java`(改):加 `GET /admin/sys/user/roles`。
- `system/service/impl/SysRoleServiceImpl.java`(改):修 `listByUserId` 漏过滤软删角色的 bug。

**数据库**
- `scripts/sql/2026-06-25-rbac-buttons.sql`(新增):规范化页权限串 + 补按钮级菜单 + admin 角色补全关联。

**前端(`mes/frontend/apps/mes-new/src/`)**
- `types/user.ts`(改):加 `SysRolePick`。
- `api/system/user.ts`(改):加 `userRoles`。
- `pages/system/user/UserForm.tsx`(改):角色分配复选框组。
- `hooks/useAllowedRoutes.ts`(新增):`computeAllowedRoutes` 纯函数 + `useAllowedRoutes` hook + `APP_ROUTES`。
- `hooks/__tests__/useAllowedRoutes.test.ts`(新增,测试)。
- `components/RouteAccessGuard.tsx`(新增):未授权跳 403。
- `layouts/AdminLayout.tsx`(改):用守卫包住 `<Outlet/>`。
- `router.tsx`(改):大屏路由 `/digitization/plan` 套守卫。
- `pages/system/role/RoleList.tsx`、`pages/system/menu/MenuList.tsx`、`pages/system/dict/DictList.tsx`、`pages/system/dept/DeptList.tsx`(改):补 `PermissionGuard`。

**实施顺序:** Task 1(数据)→ 2(后端过滤)→ 3(后端接口)→ 4(前端 API/类型)→ 5(角色分配 UI)→ 6(路由守卫)→ 7(按钮守卫)→ 8(验收)。

---

## Task 1: 数据迁移 — 规范化页权限串 + 补按钮级菜单 + admin 角色补全

**Files:**
- Create: `scripts/sql/2026-06-25-rbac-buttons.sql`

幂等、按 `url` / `code` 自适应;线上若无某页(如字典)则该页相关语句自然空转。

- [ ] **Step 1: 写迁移 SQL**

写入 `scripts/sql/2026-06-25-rbac-buttons.sql`:

```sql
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
```

- [ ] **Step 2: 应用迁移到目标库(执行者手动)**

数据库不在本仓库管理(无 Flyway)。由执行者对 dev 库执行一次(连接信息见 `mes/src/main/resources/application-dev.yml`):

Run: `mysql -h <host> -P 3306 -u <user> -p <database> < scripts/sql/2026-06-25-rbac-buttons.sql`
Expected: 无报错;重复执行第二次时受影响行数为 0(幂等)。

> 若此刻无法连库:跳过执行,留待 Task 8 验收时应用;但**必须**先把 SQL 文件提交。

- [ ] **Step 3: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add scripts/sql/2026-06-25-rbac-buttons.sql
git commit -m "🌱 chore(mes): 新增 RBAC 按钮级权限种子(规范化页权限串+补系统管理按钮+admin角色补全)"
```

---

## Task 2: 后端 — 菜单树按角色剪枝(纯函数 + 服务接入)

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/system/util/MenuTreeFilter.java`
- Test: `mes/src/test/java/com/wangziyang/mes/system/util/MenuTreeFilterTest.java`
- Modify: `mes/src/main/java/com/wangziyang/mes/system/mapper/SysMenuMapper.java`
- Modify: `mes/src/main/java/com/wangziyang/mes/system/service/impl/SysMenuServiceImpl.java:55-102`

- [ ] **Step 1: 写剪枝函数的失败测试**

创建 `mes/src/test/java/com/wangziyang/mes/system/util/MenuTreeFilterTest.java`:

```java
package com.wangziyang.mes.system.util;

import com.wangziyang.mes.system.entity.SysMenu;
import com.wangziyang.mes.system.vo.TreeVO;
import org.junit.Assert;
import org.junit.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;

public class MenuTreeFilterTest {

    private TreeVO<SysMenu> node(String id, TreeVO<SysMenu>... children) {
        TreeVO<SysMenu> n = new TreeVO<>();
        n.setId(id);
        n.setCode(id);
        n.setChildren(new java.util.ArrayList<>(Arrays.asList(children)));
        return n;
    }

    @Test
    public void keepsGrantedLeafAndItsAncestor() {
        TreeVO<SysMenu> leaf = node("btn_user_add");
        TreeVO<SysMenu> page = node("user", leaf);
        TreeVO<SysMenu> dir = node("system", page);

        List<TreeVO<SysMenu>> result =
                MenuTreeFilter.prune(Collections.singletonList(dir), new HashSet<>(Arrays.asList("user", "btn_user_add")));

        Assert.assertEquals(1, result.size());
        Assert.assertEquals("system", result.get(0).getId());
        Assert.assertEquals(1, result.get(0).getChildren().size());
        Assert.assertEquals("user", result.get(0).getChildren().get(0).getId());
        Assert.assertEquals(1, result.get(0).getChildren().get(0).getChildren().size());
    }

    @Test
    public void dropsUngrantedSubtreeAndEmptyDir() {
        TreeVO<SysMenu> grantedPage = node("user");
        TreeVO<SysMenu> ungrantedPage = node("role");
        TreeVO<SysMenu> dir = node("system", grantedPage, ungrantedPage);
        TreeVO<SysMenu> emptyDir = node("order", node("plan"));

        List<TreeVO<SysMenu>> result =
                MenuTreeFilter.prune(Arrays.asList(dir, emptyDir), new HashSet<>(Collections.singletonList("user")));

        Assert.assertEquals(1, result.size());
        Assert.assertEquals("system", result.get(0).getId());
        Assert.assertEquals(1, result.get(0).getChildren().size());
        Assert.assertEquals("user", result.get(0).getChildren().get(0).getId());
    }
}
```

- [ ] **Step 2: 运行测试,确认失败**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes && mvn -q -Dtest=MenuTreeFilterTest test`
Expected: 编译失败 / FAIL —— `MenuTreeFilter` 不存在(cannot find symbol)。
> 若 maven 环境不可用,跳过本步,改由 Task 8 手动验收覆盖剪枝效果(并在 Step 4 同样跳过)。

- [ ] **Step 3: 实现剪枝函数**

创建 `mes/src/main/java/com/wangziyang/mes/system/util/MenuTreeFilter.java`:

```java
package com.wangziyang.mes.system.util;

import com.wangziyang.mes.system.entity.SysMenu;
import com.wangziyang.mes.system.vo.TreeVO;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * 菜单树按授权集合剪枝:保留「自身被授权 或 任一后代被授权」的节点,丢弃空目录。
 * 纯函数,无 Spring 依赖,便于单测。
 */
public final class MenuTreeFilter {

    private MenuTreeFilter() {
    }

    public static List<TreeVO<SysMenu>> prune(List<TreeVO<SysMenu>> nodes, Set<String> grantedIds) {
        List<TreeVO<SysMenu>> kept = new ArrayList<>();
        if (nodes == null) {
            return kept;
        }
        for (TreeVO<SysMenu> node : nodes) {
            List<TreeVO<SysMenu>> prunedChildren = prune(node.getChildren(), grantedIds);
            boolean selfGranted = grantedIds.contains(node.getId());
            if (selfGranted || !prunedChildren.isEmpty()) {
                node.setChildren(prunedChildren);
                kept.add(node);
            }
        }
        return kept;
    }
}
```

- [ ] **Step 4: 运行测试,确认通过**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes && mvn -q -Dtest=MenuTreeFilterTest test`
Expected: BUILD SUCCESS,2 个测试通过。

- [ ] **Step 5: 给 Mapper 加按用户查授权菜单 id**

修改 `mes/src/main/java/com/wangziyang/mes/system/mapper/SysMenuMapper.java`,在 `import` 区加:

```java
import org.apache.ibatis.annotations.Select;
```

在接口体内 `listBySearchByName` 方法之后加:

```java
    /**
     * 查询某用户经由其全部角色授权的菜单 id 集合
     *
     * @param userId 用户ID
     * @return 授权菜单 id 列表(去重)
     */
    @Select("SELECT DISTINCT rm.menu_id FROM sp_sys_user_role ur " +
            "JOIN sp_sys_role_menu rm ON rm.role_id = ur.role_id " +
            "WHERE ur.user_id = #{userId}")
    List<String> listMenuIdsByUserId(String userId);
```

- [ ] **Step 6: 服务接入剪枝 + admin 放行**

修改 `mes/src/main/java/com/wangziyang/mes/system/service/impl/SysMenuServiceImpl.java`。

(a) 在 `import` 区(`java.util.*` 已在)加:

```java
import com.wangziyang.mes.system.dto.SysUserDTO;
import com.wangziyang.mes.system.util.MenuTreeFilter;
import org.apache.shiro.SecurityUtils;
```

(b) 把 `listIndexMenuTree()` 末尾这段:

```java
        List<TreeVO<SysMenu>> treeVOS = TreeUtil.buildList(menus, "0");
        for (TreeVO<SysMenu> mTree : treeVOS) {
            menuInfo.put(mTree.getCode(), mTree);
        }
```

替换为:

```java
        List<TreeVO<SysMenu>> treeVOS = TreeUtil.buildList(menus, "0");

        // 按当前登录用户角色剪枝;admin 用户名硬放行(始终全量)
        SysUserDTO current = currentUser();
        if (current != null && !"admin".equals(current.getUsername())) {
            Set<String> granted = new HashSet<>(sysMenuMapper.listMenuIdsByUserId(current.getId()));
            treeVOS = MenuTreeFilter.prune(treeVOS, granted);
        }

        for (TreeVO<SysMenu> mTree : treeVOS) {
            menuInfo.put(mTree.getCode(), mTree);
        }
```

(c) 在类内(如 `deletePhysical` 之后)加私有方法:

```java
    /** 取当前 Shiro 主体(未登录或类型不符返回 null) */
    private SysUserDTO currentUser() {
        Object principal = SecurityUtils.getSubject().getPrincipal();
        return principal instanceof SysUserDTO ? (SysUserDTO) principal : null;
    }
```

- [ ] **Step 7: 编译(确认改动不破坏构建)**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes && mvn -q -DskipTests compile`
Expected: BUILD SUCCESS。
> maven 不可用则跳过,留待 Task 8 整体启动验证。

- [ ] **Step 8: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/src/main/java/com/wangziyang/mes/system/util/MenuTreeFilter.java \
        mes/src/test/java/com/wangziyang/mes/system/util/MenuTreeFilterTest.java \
        mes/src/main/java/com/wangziyang/mes/system/mapper/SysMenuMapper.java \
        mes/src/main/java/com/wangziyang/mes/system/service/impl/SysMenuServiceImpl.java
git commit -m "✨ feat(mes): 首页菜单树按当前用户角色剪枝(admin 放行)"
```

---

## Task 3: 后端 — 用户角色查询接口 + 修复软删角色泄漏

**Files:**
- Modify: `mes/src/main/java/com/wangziyang/mes/system/controller/admin/SysUserController.java`
- Modify: `mes/src/main/java/com/wangziyang/mes/system/service/impl/SysRoleServiceImpl.java:61`

- [ ] **Step 1: 修复 `listByUserId` 漏过滤软删角色**

修改 `SysRoleServiceImpl.java`。把第 61 行:

```java
        List<SysRole> sysRolesAll = sysRoleMapper.selectList(null);
```

改为(使用上方已构造、含「未删除」条件的 `queryWrapper`):

```java
        List<SysRole> sysRolesAll = sysRoleMapper.selectList(queryWrapper);
```

- [ ] **Step 2: 加 `GET /admin/sys/user/roles` 接口**

修改 `SysUserController.java`,在 `getById` 方法之后加:

```java
    /**
     * 角色分配选项:返回全部(未删除)角色 + 对该用户是否已选(checked)。
     * 新增用户(id 为空)时全部 checked=false。
     */
    @GetMapping("/roles")
    @ResponseBody
    public Result roles(String id) throws Exception {
        return Result.success(sysRoleService.listByUserId(id));
    }
```

> `sysRoleService` 字段在该 controller 已注入(见第 44-45 行),无需新增依赖。

- [ ] **Step 3: 编译**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes && mvn -q -DskipTests compile`
Expected: BUILD SUCCESS。
> maven 不可用则跳过,留待 Task 8。

- [ ] **Step 4: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/src/main/java/com/wangziyang/mes/system/controller/admin/SysUserController.java \
        mes/src/main/java/com/wangziyang/mes/system/service/impl/SysRoleServiceImpl.java
git commit -m "✨ feat(mes): 新增用户角色选项接口 /admin/sys/user/roles;🐛 修复 listByUserId 带出软删角色"
```

---

## Task 4: 前端 — 角色选项类型与 API

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/types/user.ts`
- Modify: `mes/frontend/apps/mes-new/src/api/system/user.ts`

- [ ] **Step 1: 加 `SysRolePick` 类型**

修改 `types/user.ts`,在文件末尾追加:

```ts
/** 用户表单角色分配选项:后端 listByUserId 返回(全部角色 + 是否已选) */
export interface SysRolePick {
  id: string
  name: string
  checked: boolean
}
```

- [ ] **Step 2: 加 `userRoles` API**

修改 `api/system/user.ts`。把首行 import 改为同时引入 `SysRolePick`:

```ts
import type { SysUser, SysUserDTO, SysRolePick } from '@/types/user'
```

在文件末尾追加:

```ts
/** 取角色分配选项;新增用户传空 id → 全部 checked=false */
export function userRoles(id?: string) {
  return http.get<SysRolePick[]>('/admin/sys/user/roles', { params: { id: id ?? '' } })
}
```

- [ ] **Step 3: 类型检查**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new check-types`
Expected: 无错误输出(exit 0)。

- [ ] **Step 4: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/types/user.ts mes/frontend/apps/mes-new/src/api/system/user.ts
git commit -m "✨ feat(mes-new): 用户角色选项类型 SysRolePick 与 userRoles API"
```

---

## Task 5: 前端 — 用户表单角色分配

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/pages/system/user/UserForm.tsx`

- [ ] **Step 1: 用完整新版替换 `UserForm.tsx`**

整体替换为(在原表单基础上:基本信息分区 + 角色分配复选框组,提交写 `sysRoleIds`):

```tsx
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Info, ShieldCheck } from 'lucide-react'
import { Checkbox, Input, toast } from '@workspace/ui'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { userAddOrUpdate, userRoles } from '@/api/system/user'
import type { SysUser, SysUserDTO } from '@/types/user'

interface UserFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SysUser | null
  onSaved: () => void
}

const makeSchema = (isEdit: boolean) =>
  z.object({
    username: z.string().min(1, '请输入登录名'),
    name: z.string().min(1, '请输入姓名'),
    password: isEdit ? z.string().optional() : z.string().min(1, '请输入初始密码'),
  })

export default function UserForm({ open, onOpenChange, record, onSaved }: UserFormProps) {
  const isEdit = !!record
  const [checkedRoleIds, setCheckedRoleIds] = useState<string[]>([])
  const { mutate, loading } = useMutation$((dto: SysUserDTO) => userAddOrUpdate(dto))

  const { data: roleOpts } = useQuery$(
    ['sys', 'user', 'roles', record?.id ?? 'new'],
    () => userRoles(record?.id),
    { enabled: open },
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<ReturnType<typeof makeSchema>>>({
    resolver: zodResolver(makeSchema(isEdit)),
    defaultValues: { username: '', name: '', password: '' },
  })

  useEffect(() => {
    if (open) {
      reset({ username: record?.username ?? '', name: record?.name ?? '', password: '' })
    }
  }, [open, record, reset])

  // 角色选项异步到达后,用已选项初始化勾选集
  useEffect(() => {
    if (open && roleOpts) {
      setCheckedRoleIds(roleOpts.filter((r) => r.checked).map((r) => r.id))
    }
  }, [open, roleOpts])

  const toggleRole = (id: string, checked: boolean) =>
    setCheckedRoleIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)))

  const onSubmit = handleSubmit(async (values) => {
    const dto: SysUserDTO = {
      ...(record ?? { id: '', username: '', name: '', deleted: '0' }),
      username: values.username,
      name: values.name,
      sysRoleIds: checkedRoleIds,
    }
    if (values.password) dto.password = values.password
    try {
      await mutate(dto)
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["sys","user"')
      onOpenChange(false)
      onSaved()
    } catch {
      /* 拦截器已 toast */
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑用户' : '新增用户'}
      icon={User}
      description="维护系统用户账号"
      onSubmit={onSubmit}
      submitting={loading}
    >
      <FormSection title="基本信息" icon={Info} tag="必填">
        <FormField label="登录名" htmlFor="f-username" required error={errors.username?.message} help={isEdit ? '登录名创建后不可修改' : undefined}>
          <Input id="f-username" disabled={isEdit} aria-invalid={!!errors.username} {...register('username')} />
        </FormField>
        <FormField label="姓名" htmlFor="f-name" required error={errors.name?.message}>
          <Input id="f-name" aria-invalid={!!errors.name} {...register('name')} />
        </FormField>
        <FormField label={isEdit ? '重置密码' : '初始密码'} htmlFor="f-password" required={!isEdit} error={errors.password?.message} help={isEdit ? '留空表示不修改密码' : '新用户的初始登录密码'}>
          <Input id="f-password" type="password" aria-invalid={!!errors.password} {...register('password')} />
        </FormField>
      </FormSection>

      <FormSection title="角色分配" icon={ShieldCheck}>
        <div className="max-h-48 space-y-2 overflow-auto rounded-md border border-border p-3">
          {(roleOpts ?? []).map((r) => (
            <label key={r.id} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={checkedRoleIds.includes(r.id)}
                onCheckedChange={(c) => toggleRole(r.id, c === true)}
              />
              <span>{r.name}</span>
            </label>
          ))}
          {(roleOpts ?? []).length === 0 && <p className="text-xs text-muted-foreground">暂无可分配角色</p>}
        </div>
      </FormSection>
    </FormDialog>
  )
}
```

- [ ] **Step 2: 类型检查 + lint**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new check-types && pnpm --filter mes-new lint`
Expected: 均 exit 0,无错误。

- [ ] **Step 3: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/system/user/UserForm.tsx
git commit -m "✨ feat(mes-new): 用户表单支持分配角色(复选框组,提交写 sysRoleIds)"
```

---

## Task 6: 前端 — 路由级访问守卫

**Files:**
- Create: `mes/frontend/apps/mes-new/src/hooks/useAllowedRoutes.ts`
- Test: `mes/frontend/apps/mes-new/src/hooks/__tests__/useAllowedRoutes.test.ts`
- Create: `mes/frontend/apps/mes-new/src/components/RouteAccessGuard.tsx`
- Modify: `mes/frontend/apps/mes-new/src/layouts/AdminLayout.tsx`
- Modify: `mes/frontend/apps/mes-new/src/router.tsx`

- [ ] **Step 1: 写 `computeAllowedRoutes` 的失败测试**

创建 `mes/frontend/apps/mes-new/src/hooks/__tests__/useAllowedRoutes.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeAllowedRoutes } from '@/hooks/useAllowedRoutes'
import type { TreeVO, SysMenu } from '@/types/menu'

function node(url: string | undefined, children?: TreeVO<SysMenu>[]): TreeVO<SysMenu> {
  return { id: url ?? 'x', name: url ?? 'x', url, children }
}

describe('computeAllowedRoutes', () => {
  it('始终包含白名单 /welcome 与 /403', () => {
    const set = computeAllowedRoutes(null)
    expect(set.has('/welcome')).toBe(true)
    expect(set.has('/403')).toBe(true)
  })

  it('递归收集菜单 url 映射后的 SPA 路由', () => {
    const menuInfo: Record<string, TreeVO<SysMenu>> = {
      system: node('#', [node('/admin/sys/user/list-ui')]),
    }
    const set = computeAllowedRoutes(menuInfo)
    expect(set.has('/system/user')).toBe(true)
    // 不可导航的占位 url(#)不纳入
    expect(set.has('#')).toBe(false)
  })

  it('未授权页面不在集合内', () => {
    const menuInfo: Record<string, TreeVO<SysMenu>> = {
      system: node('#', [node('/admin/sys/user/list-ui')]),
    }
    const set = computeAllowedRoutes(menuInfo)
    expect(set.has('/system/role')).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试,确认失败**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new test useAllowedRoutes`
Expected: FAIL —— 无法解析 `@/hooks/useAllowedRoutes`(模块不存在)。

- [ ] **Step 3: 实现 hook + 纯函数 + 路由清单**

创建 `mes/frontend/apps/mes-new/src/hooks/useAllowedRoutes.ts`:

```ts
import { useEffect, useMemo } from 'react'
import { useMenuStore } from '@/stores/menuStore'
import { toReactRoute } from '@/utils/urlMap'
import type { TreeVO, SysMenu } from '@/types/menu'

/** 任意登录用户都可访问的白名单 */
const WHITELIST = ['/welcome', '/403']

/**
 * 应用内已注册的页面路由全集(须与 router.tsx 保持一致)。
 * 用于区分「已注册但无权 → 403」与「路径不存在 → 由 NotFound 处理」。
 */
export const APP_ROUTES = new Set<string>([
  '/welcome',
  '/system/user', '/system/role', '/system/menu', '/system/dict', '/system/department', '/system/team',
  '/basedata/component', '/basedata/materile', '/basedata/device-group', '/basedata/process-unit',
  '/basedata/warehouse', '/basedata/oper', '/basedata/manager', '/basedata/manager-item',
  '/technology/flow', '/technology/product-bom', '/technology/process-flow',
  '/technology/process-content', '/technology/process-query',
  '/order/production', '/order/dispatch', '/order/gantt',
  '/inventory/receipt', '/inventory/outbound', '/inventory/query', '/inventory/manual-inbound',
  '/workflow/category', '/workflow/model', '/workflow/form', '/workflow/definition',
  '/digitization/simulation', '/digitization/plan',
])

/** 纯函数:由菜单树派生当前用户可访问的 SPA 路由集合(含白名单) */
export function computeAllowedRoutes(
  menuInfo: Record<string, TreeVO<SysMenu>> | null,
): Set<string> {
  const acc = new Set<string>(WHITELIST)
  const walk = (nodes: TreeVO<SysMenu>[]) => {
    for (const n of nodes) {
      const r = toReactRoute(n.url)
      if (r) acc.add(r)
      if (n.children?.length) walk(n.children)
    }
  }
  if (menuInfo) walk(Object.values(menuInfo))
  return acc
}

/** 守卫用:确保菜单已加载,并返回 { loaded, allowed } */
export function useAllowedRoutes(): { loaded: boolean; allowed: Set<string> } {
  const loaded = useMenuStore((s) => s.loaded)
  const menuInfo = useMenuStore((s) => s.menuInfo)
  const fetchMenuTree = useMenuStore((s) => s.fetchMenuTree)

  useEffect(() => {
    if (!loaded) fetchMenuTree()
  }, [loaded, fetchMenuTree])

  const allowed = useMemo(() => computeAllowedRoutes(menuInfo), [menuInfo])
  return { loaded, allowed }
}
```

- [ ] **Step 4: 运行测试,确认通过**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new test useAllowedRoutes`
Expected: PASS,3 个用例通过。

- [ ] **Step 5: 实现 `RouteAccessGuard`**

创建 `mes/frontend/apps/mes-new/src/components/RouteAccessGuard.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAllowedRoutes, APP_ROUTES } from '@/hooks/useAllowedRoutes'

/**
 * 路由访问守卫:
 * - 菜单未加载 → 占位 loading,不误判;
 * - 已注册路由但不在授权集合 → 跳 /403;
 * - 未注册路由 → 放行,由下游 NotFound 处理(保留 404 语义);
 * - 授权 → 渲染 children(无则 <Outlet/>)。
 */
export default function RouteAccessGuard({ children }: { children?: ReactNode }) {
  const { loaded, allowed } = useAllowedRoutes()
  const location = useLocation()

  if (!loaded) {
    return <div className="p-6 text-sm text-muted-foreground">加载中…</div>
  }
  const path = location.pathname
  if (APP_ROUTES.has(path) && !allowed.has(path)) {
    return <Navigate to="/403" replace />
  }
  return <>{children ?? <Outlet />}</>
}
```

- [ ] **Step 6: 接入 `AdminLayout`(包住 Outlet)**

修改 `layouts/AdminLayout.tsx`:

(a) 加 import(放在 `PageTransition` import 下一行):

```tsx
import RouteAccessGuard from '@/components/RouteAccessGuard'
```

(b) 把:

```tsx
          <PageTransition routeKey={location.pathname}>
            <Outlet />
          </PageTransition>
```

改为:

```tsx
          <PageTransition routeKey={location.pathname}>
            <RouteAccessGuard />
          </PageTransition>
```

> 注:`Outlet` 仍由 `RouteAccessGuard` 在授权时渲染;`AdminLayout` 顶部对 `Outlet` 的 import 可保留(未使用会触发 lint,则一并删除该 import —— 见 Step 8 lint)。

- [ ] **Step 7: 接入大屏路由 `/digitization/plan`**

修改 `router.tsx`:

(a) 加 import(放在 `Forbidden` import 下一行):

```tsx
import RouteAccessGuard from '@/components/RouteAccessGuard'
```

(b) 把大屏路由 element 由:

```tsx
      {
        path: 'digitization/plan',
        element: (
          <Suspense fallback={<div style={{ minHeight: '100vh', background: '#050b16' }} />}>
            <PlanDashboard />
          </Suspense>
        ),
      },
```

改为:

```tsx
      {
        path: 'digitization/plan',
        element: (
          <RouteAccessGuard>
            <Suspense fallback={<div style={{ minHeight: '100vh', background: '#050b16' }} />}>
              <PlanDashboard />
            </Suspense>
          </RouteAccessGuard>
        ),
      },
```

- [ ] **Step 8: 类型检查 + lint(顺带处理 AdminLayout 未用的 Outlet import)**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new check-types && pnpm --filter mes-new lint`
Expected: exit 0。若 lint 报 `AdminLayout.tsx` 的 `Outlet` 未使用,则删掉它:把 `import { Outlet, useLocation } from 'react-router-dom'` 改为 `import { useLocation } from 'react-router-dom'`,再重跑直至通过。

- [ ] **Step 9: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/hooks/useAllowedRoutes.ts \
        mes/frontend/apps/mes-new/src/hooks/__tests__/useAllowedRoutes.test.ts \
        mes/frontend/apps/mes-new/src/components/RouteAccessGuard.tsx \
        mes/frontend/apps/mes-new/src/layouts/AdminLayout.tsx \
        mes/frontend/apps/mes-new/src/router.tsx
git commit -m "✨ feat(mes-new): 路由级访问守卫(无权页面跳 403,大屏同规则)"
```

---

## Task 7: 前端 — 系统管理各页补按钮 PermissionGuard

UserList 已正确(`user:add`/`user:update`/`user:delete`),本任务对齐 Role / Menu / Dict / Dept 四页。

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/pages/system/role/RoleList.tsx`
- Modify: `mes/frontend/apps/mes-new/src/pages/system/menu/MenuList.tsx`
- Modify: `mes/frontend/apps/mes-new/src/pages/system/dict/DictList.tsx`
- Modify: `mes/frontend/apps/mes-new/src/pages/system/dept/DeptList.tsx`

- [ ] **Step 1: RoleList — 编辑/删除按钮加守卫**

修改 `RoleList.tsx`,把 actions 列的:

```tsx
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(row.original); setFormOpen(true) }}>
              <Pencil className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(row.original)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ),
```

改为:

```tsx
        cell: ({ row }) => (
          <div className="flex gap-1">
            <PermissionGuard perm="role:update">
              <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(row.original); setFormOpen(true) }}>
                <Pencil className="size-4" />
              </Button>
            </PermissionGuard>
            <PermissionGuard perm="role:delete">
              <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(row.original)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </PermissionGuard>
          </div>
        ),
```

> `RoleList.tsx` 已 import `PermissionGuard`(第 23 行)且新建按钮已用 `perm="role:add"`,无需新增 import。

- [ ] **Step 2: MenuList — 新建/编辑/删除加守卫 + import**

修改 `MenuList.tsx`:

(a) 在 `import MenuForm from './MenuForm'` 上一行加:

```tsx
import PermissionGuard from '@/components/PermissionGuard'
```

(b) 把 actions 列的:

```tsx
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(toMenu(row.original)); setFormOpen(true) }}>
              <Pencil className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(row.original)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ),
```

改为:

```tsx
        cell: ({ row }) => (
          <div className="flex gap-1">
            <PermissionGuard perm="menu:update">
              <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(toMenu(row.original)); setFormOpen(true) }}>
                <Pencil className="size-4" />
              </Button>
            </PermissionGuard>
            <PermissionGuard perm="menu:delete">
              <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(row.original)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </PermissionGuard>
          </div>
        ),
```

(c) 把页头新建按钮:

```tsx
      actions={
        <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
          <Plus className="size-4" />
          新建菜单
        </Button>
      }
```

改为:

```tsx
      actions={
        <PermissionGuard perm="menu:add">
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="size-4" />
            新建菜单
          </Button>
        </PermissionGuard>
      }
```

- [ ] **Step 3: DictList — 新建/编辑/删除加守卫 + import**

修改 `DictList.tsx`:

(a) 在 `import DictForm from './DictForm'` 上一行加:

```tsx
import PermissionGuard from '@/components/PermissionGuard'
```

(b) 把 actions 列的:

```tsx
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(row.original); setFormOpen(true) }}>
              <Pencil className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(row.original)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ),
```

改为:

```tsx
        cell: ({ row }) => (
          <div className="flex gap-1">
            <PermissionGuard perm="dict:update">
              <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(row.original); setFormOpen(true) }}>
                <Pencil className="size-4" />
              </Button>
            </PermissionGuard>
            <PermissionGuard perm="dict:delete">
              <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(row.original)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </PermissionGuard>
          </div>
        ),
```

(c) 把页头新建按钮:

```tsx
      actions={
        <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
          <Plus className="size-4" />
          新建字典
        </Button>
      }
```

改为:

```tsx
      actions={
        <PermissionGuard perm="dict:add">
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="size-4" />
            新建字典
          </Button>
        </PermissionGuard>
      }
```

- [ ] **Step 4: DeptList — 新建/编辑/删除加守卫 + import**

修改 `DeptList.tsx`:

(a) 在 `import DeptForm from './DeptForm'` 上一行加:

```tsx
import PermissionGuard from '@/components/PermissionGuard'
```

(b) 把 actions 列的:

```tsx
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(row.original); setFormOpen(true) }}>
              <Pencil className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(row.original)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ),
```

改为:

```tsx
        cell: ({ row }) => (
          <div className="flex gap-1">
            <PermissionGuard perm="dept:update">
              <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(row.original); setFormOpen(true) }}>
                <Pencil className="size-4" />
              </Button>
            </PermissionGuard>
            <PermissionGuard perm="dept:delete">
              <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(row.original)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </PermissionGuard>
          </div>
        ),
```

(c) 把页头新建按钮:

```tsx
      actions={
        <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
          <Plus className="size-4" />
          新建部门
        </Button>
      }
```

改为:

```tsx
      actions={
        <PermissionGuard perm="dept:add">
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="size-4" />
            新建部门
          </Button>
        </PermissionGuard>
      }
```

- [ ] **Step 5: 类型检查 + lint**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new check-types && pnpm --filter mes-new lint`
Expected: exit 0。

- [ ] **Step 6: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/system/role/RoleList.tsx \
        mes/frontend/apps/mes-new/src/pages/system/menu/MenuList.tsx \
        mes/frontend/apps/mes-new/src/pages/system/dict/DictList.tsx \
        mes/frontend/apps/mes-new/src/pages/system/dept/DeptList.tsx
git commit -m "✨ feat(mes-new): 系统管理各页增删改按钮按角色权限显隐"
```

---

## Task 8: 集成验收

**Files:** 无(仅运行与人工核对)

- [ ] **Step 1: 前端全量门禁**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new check-types && pnpm --filter mes-new lint && pnpm --filter mes-new test`
Expected: 三者均 exit 0,全部测试通过。

- [ ] **Step 2: 确保数据迁移已应用 + 后端启动**

- 若 Task 1 Step 2 尚未执行,现在对 dev 库执行该 SQL。
- 启动后端(见记忆 `[[backend-build-mvnw-broken]]`:用 JDK11 + 系统 `mvn`):
  Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes && mvn spring-boot:run`
  Expected: 9090 端口启动无异常。
- 启动前端:
  Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new dev`
  Expected: 4100 端口可访问。

- [ ] **Step 3: 人工验收脚本**

1. `admin`/`123` 登录 → 侧栏全量,系统管理各页增删改按钮齐全。
2. 角色管理新建「用户查看员」:RoleForm 菜单树**只勾「用户管理」页**(不勾其下任何按钮)→ 保存。
3. 用户管理把 `monkey` 分配「用户查看员」(取消其它角色)→ 保存。
4. 退出,`monkey`/`123` 登录:
   - 侧栏**仅「用户管理」**;
   - 地址栏直接输 `/system/role` → 跳 `/403`;
   - 用户管理页**无新增/编辑/删除按钮**(只读)。
5. 再建「用户管理员」:勾「用户管理」页 + 其下「新增」「编辑」按钮(不勾删除)→ 分配给某用户登录:用户管理页有新增/编辑、无删除,直接输 `/system/menu` → `/403`。
6. 回到 `admin`:仍全量(验证 admin 用户名放行,即使数据变动)。

Expected: 与上述逐条一致。任一不符 → 回到对应 Task 修正。

- [ ] **Step 4: 更新记忆(完成后)**

完成并验收通过后,更新/新增记忆文件,记录:RBAC 数据流(后端 `listIndexMenuTree` 按角色剪枝 + admin 用户名放行)、按钮级权限依赖 `scripts/sql/2026-06-25-rbac-buttons.sql` 的按钮菜单行、前端 `RouteAccessGuard`/`APP_ROUTES` 须随新增路由同步维护。并在 `MEMORY.md` 加一行指针。

---

## 自检结论(规格覆盖)

- 设计模块 1(后端剪枝)→ Task 2。
- 设计模块 2(按钮数据/规范化/ admin 自洽)→ Task 1。
- 设计模块 3(分配角色:接口 + 前端表单)→ Task 3(接口)+ Task 4/5(前端)。
- 设计模块 4(路由守卫,含大屏)→ Task 6。
- 设计模块 5(按钮串对齐 + 补 Guard)→ Task 7。
- 验收脚本 → Task 8。
- 额外后端 bug(`listByUserId` 带出软删角色)→ Task 3 Step 1。
- 类型一致性:`SysRolePick{id,name,checked}`(Task 4)在 `userRoles`(Task 4)、`UserForm`(Task 5)一致使用;`computeAllowedRoutes`/`APP_ROUTES`(Task 6)在 `RouteAccessGuard`(Task 6)一致使用;权限串 `xxx:add|update|delete` 在 SQL(Task 1)与前端 Guard(Task 5/7)一致。
