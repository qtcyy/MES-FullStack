# Cycle 1a 系统管理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `mes/vue3` 实现系统管理 5 页完整 CRUD(用户/角色/菜单/字典/部门),并补齐后端缺失的删除端点。

**Architecture:** 方案 A——复用 Cycle 0 通用组件(`DataTable`/`SearchForm`/`FormDialog`/`useRequest`/`usePagination`),先把纯 CRUD(用户)打磨成范式,再叠加树表(菜单/部门)、权限树(角色)、两级主从(字典)三类特化原语;后端纯新增 5 个删除端点 + 审查修正 add-or-update + 补字典菜单种子。

**Tech Stack:** 前端 Vue 3.5 `<script setup>` + TS + Element Plus + Pinia + Vue Router + Vitest;后端 Spring Boot 2.1.7 + MyBatis-Plus 3.1.2(JDK11 + 系统 `mvn` 编译)。

**关键参考:**
- Spec:`mes/vue3/docs/specs/2026-06-20-cycle1a-system-management-design.md`
- 后端契约见 spec §2;Cycle 0 组件 API 见 `mes/vue3/src/components/{DataTable,FormDialog,SearchForm}.vue`
- 工作目录:前端命令在 `mes/vue3/` 下执行(`pnpm`);后端命令在 `mes/` 下执行(`JAVA_HOME=corretto-11 mvn`);git 在仓库根。
- 凭据:dev `admin/123`(已关验证码);后端 `localhost:9090`,前端 dev `localhost:4200`。
- 分支:已在 `feature/system`(从 `develop` 切)。每个 Task 末尾提交。

---

## 文件结构总览

**前端新增:**
```
src/types/system.ts                              # 实体 + DTO + PageReq 类型
src/utils/urlMap.ts                              # 后端 *-list-ui → 干净 SPA 路由
src/utils/systemTree.ts                          # 纯函数(buildTree/collectSubtreeIds/mergeCheckedMenuIds/buildUserPayload/partitionDict)
src/components/TreeTable.vue                      # 树形表格(菜单/部门复用)
src/components/MasterDetailLayout.vue            # 左主右从两栏(字典复用)
src/api/system/{user,role,menu,dict,dept}.ts     # 各模块 API
src/views/system/user/{UserList,UserForm}.vue
src/views/system/role/{RoleList,RoleForm}.vue
src/views/system/menu/{MenuList,MenuForm}.vue
src/views/system/dept/{DeptList,DeptForm}.vue
src/views/system/dict/{DictList,DictTypeForm,DictItemForm}.vue
src/utils/__tests__/{urlMap,systemTree}.spec.ts
src/api/__tests__/request.spec.ts                # 若已存在则追加数组用例
```
**前端修改:**
```
src/api/request.ts                               # toFormUrlEncoded 数组加固
src/layouts/components/MenuItem.vue              # 叶子 index 经 urlMap 翻译
src/router/index.ts                              # AdminLayout children 追加 5 路由
```
**后端新增/修改:**
```
mes/src/main/java/.../system/controller/admin/Sys{User,Role,Menu,Dict,Department}Controller.java  # +delete
mes/src/main/java/.../system/service/impl/Sys{User,Role,Menu,Dict,Department}ServiceImpl.java       # +软删/物理删 + 审查修正
mes/src/test/java/.../system/Sys*ServiceImplTest.java   # Mockito 守卫
scripts/sql/dict-menu-seed.sql                   # 字典菜单种子(幂等)
```

---

## Phase A — 后端最小改动(先行:让删除端点就绪)

> 每个后端 Task 第一步都是**读真实代码**(controller + serviceImpl + 对应 entity),再施加最小改动。JDK11 编译:`cd mes && JAVA_HOME=$(/usr/libexec/java_home -v 11) mvn -q -o compile`(无 `-o` 亦可)。

### Task A1: 用户/角色/字典/部门软删除端点

**Files:**
- Modify: `mes/src/main/java/com/wangziyang/mes/system/controller/admin/SysUserController.java`
- Modify: `mes/src/main/java/com/wangziyang/mes/system/service/impl/SysUserServiceImpl.java`(及 `SysUserService` 接口)
- 同样改动 Role/Dict/Department 三套
- Test: `mes/src/test/java/com/wangziyang/mes/system/SysDeleteGuardTest.java`(新建)

- [ ] **Step 1: 读现状**

Read 这 4 套 Controller + ServiceImpl + 接口,确认:类名、`@RequestMapping` 前缀、现有方法签名、`baseMapper`/`this.update` 可用性、entity 的 is_deleted 映射字段名(用户=`deleted`,部门=`isDeleted`,见 spec §2)。确认各 `page` 查询是否已过滤 `is_deleted`(角色 `SysRoleServiceImpl` 第 ~55 行已过滤 `is_deleted='0'`;用户/字典/部门**逐个看**,记录是否需补)。

- [ ] **Step 2: 写失败测试(软删行为守卫)**

`SysDeleteGuardTest.java`(Mockito,JDK11):
```java
@ExtendWith(MockitoExtension.class)
class SysDeleteGuardTest {
    @Test
    void softDelete_setsIsDeletedToOne() {
        SysUserMapper mapper = mock(SysUserMapper.class);
        SysUserServiceImpl svc = new SysUserServiceImpl();
        ReflectionTestUtils.setField(svc, "baseMapper", mapper);
        when(mapper.update(isNull(), any(UpdateWrapper.class))).thenReturn(1);

        boolean ok = svc.softDelete("U1");

        assertThat(ok).isTrue();
        ArgumentCaptor<UpdateWrapper> cap = ArgumentCaptor.forClass(UpdateWrapper.class);
        verify(mapper).update(isNull(), cap.capture());
        // 断言 SQL 片段含 is_deleted=1 与 id=U1
        String sql = cap.getValue().getSqlSet();
        assertThat(sql).contains("is_deleted").contains("1");
    }
}
```

- [ ] **Step 3: 运行测试看失败**

Run: `cd mes && JAVA_HOME=$(/usr/libexec/java_home -v 11) mvn -q test -Dtest=SysDeleteGuardTest`
Expected: 编译失败 `cannot find symbol: softDelete`。

- [ ] **Step 4: 实现 service `softDelete` + controller `delete`(4 套)**

`SysUserServiceImpl`(及接口加 `boolean softDelete(String id)`):
```java
@Override
@Transactional(rollbackFor = Exception.class)
public boolean softDelete(String id) {
    if (id == null || id.trim().isEmpty()) {
        throw new RuntimeException("id 不能为空");
    }
    UpdateWrapper<SysUser> uw = new UpdateWrapper<>();
    uw.eq("id", id).set("is_deleted", "1");
    return this.update(uw);
}
```
`SysUserController`:
```java
@ResponseBody
@PostMapping("/delete")
public Result<String> delete(@RequestParam String id) {
    sysUserService.softDelete(id);
    return Result.success(id);
}
```
Role/Dict/Department 同构(改泛型与 service 字段名;Department entity 的 is_deleted 列名一致仍是 `is_deleted`)。**注意** `Result` 的构造/静态方法名以现有代码为准(读 `common/Result.java`)。

- [ ] **Step 5: 补列表过滤(仅对 Step 1 发现未过滤的模块)**

对 page 查询未排除已删的模块,在其 `pageList`/queryWrapper 处补 `.ne("is_deleted", "1")`(最小改动,贴合现有 wrapper 写法)。角色已过滤则跳过。

- [ ] **Step 6: 运行测试 + 编译**

Run: `cd mes && JAVA_HOME=$(/usr/libexec/java_home -v 11) mvn -q test -Dtest=SysDeleteGuardTest && JAVA_HOME=$(/usr/libexec/java_home -v 11) mvn -q compile`
Expected: 测试 PASS,BUILD SUCCESS。

- [ ] **Step 7: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/system/ mes/src/test/java/com/wangziyang/mes/system/SysDeleteGuardTest.java
git commit -m "✨ feat(backend): 补齐用户/角色/字典/部门软删除端点 + 列表过滤 + 守卫单测"
```

### Task A2: 菜单物理删除端点(子守卫 + role_menu 清理)

**Files:**
- Modify: `.../system/controller/admin/SysMenuController.java`
- Modify: `.../system/service/impl/SysMenuServiceImpl.java`(+接口)
- Modify/Read: `.../system/mapper/SysRoleMenuMapper.java`(用于删 role_menu 关联;若无对应 service 则用 mapper)
- Test: 追加到 `SysDeleteGuardTest.java`

- [ ] **Step 1: 读现状** — `SysMenuServiceImpl`、菜单 entity(确认无 is_deleted)、`sp_sys_role_menu` 的 mapper/service(找删除关联的方法,如 `SysRoleMenuMapper.delete(Wrapper)`),以及如何查子菜单(`count(parent_id=id)`)。

- [ ] **Step 2: 写失败测试(子守卫)**
```java
@Test
void deleteMenu_withChildren_throws() {
    SysMenuMapper mapper = mock(SysMenuMapper.class);
    SysMenuServiceImpl svc = new SysMenuServiceImpl();
    ReflectionTestUtils.setField(svc, "baseMapper", mapper);
    when(mapper.selectCount(any())).thenReturn(2); // 有子菜单
    assertThatThrownBy(() -> svc.deletePhysical("M1"))
        .isInstanceOf(RuntimeException.class)
        .hasMessageContaining("子菜单");
}
```

- [ ] **Step 3: 运行看失败** — `mvn -q test -Dtest=SysDeleteGuardTest`,Expected: `cannot find symbol: deletePhysical`。

- [ ] **Step 4: 实现**
```java
// SysMenuServiceImpl
@Override
@Transactional(rollbackFor = Exception.class)
public boolean deletePhysical(String id) {
    if (id == null || id.trim().isEmpty()) throw new RuntimeException("id 不能为空");
    int childCount = this.count(new QueryWrapper<SysMenu>().eq("parent_id", id));
    if (childCount > 0) throw new RuntimeException("请先删除子菜单");
    // 清理角色-菜单关联(防悬挂授权)
    sysRoleMenuMapper.delete(new QueryWrapper<SysRoleMenu>().eq("menu_id", id));
    return this.removeById(id);
}
```
Controller `@PostMapping("/delete")` 委托 `deletePhysical`,返回 `Result.success(id)`。`sysRoleMenuMapper` 用 `@Autowired` 注入(读现有注入风格)。**列名 `parent_id`/`menu_id` 以真实表为准**。

- [ ] **Step 5: 运行测试 + 编译** — Expected: PASS + BUILD SUCCESS。

- [ ] **Step 6: Commit**
```bash
git add mes/src/main/java/com/wangziyang/mes/system/
git commit -m "✨ feat(backend): 菜单物理删除端点(子守卫 + role_menu 关联清理)"
```

### Task A3: 审查修正 add-or-update(仅触及端点,亲验后改)

**Files:** 5 套 `Sys*ServiceImpl.java` 的 add-or-update 路径 + 对应 controller。

- [ ] **Step 1: 逐个读 add-or-update 实现**,对照检查清单记录真实缺陷:
  - 多表写是否在 service 层用 `@Transactional(rollbackFor=Exception.class)` 包裹:用户(save + `roleService.rebuild`)、角色(saveOrUpdate + `roleMenuService.rebuild`)。
  - 是否返回**保存后的 entity id**(非 null):`saveOrUpdate` 后 `return entity.getId()`。
  - 编辑路径是否**误对已存密文重复加盐**(用户):仅新增加盐,编辑 password 空→不动,非空→按新增同法加盐。
  - controller 是否有 `return`(Explore 曾标记"缺 return 假成功")。

- [ ] **Step 2: 仅对发现的真实缺陷施加最小修正**(无缺陷则该模块跳过)。每处修正补一条行为守卫测试到 `SysAddOrUpdateGuardTest.java`,例如:
```java
@Test
void userSave_returnsGeneratedId() {
    // mock baseMapper.insert 写回 id;mock roleService.rebuild;断言返回非空 id 且 rebuild 被调用
}
```

- [ ] **Step 3: 运行测试 + 编译** — `mvn -q test -Dtest=SysAddOrUpdateGuardTest`,Expected: PASS + BUILD SUCCESS。

- [ ] **Step 4: Commit**
```bash
git add mes/src/main/java/com/wangziyang/mes/system/ mes/src/test/java/com/wangziyang/mes/system/SysAddOrUpdateGuardTest.java
git commit -m "♻️ refactor(backend): 审查修正系统 add-or-update(事务/返回id/密码) + 守卫单测"
```
> 若 Step 1 发现各 add-or-update 均无真实缺陷,则提交一条空结论说明并 `git commit --allow-empty -m "📝 docs(backend): add-or-update 审查通过,无需修正"`,保留审查留痕。

### Task A4: 字典菜单种子 SQL

**Files:** Create `scripts/sql/dict-menu-seed.sql`

- [ ] **Step 1: 读种子参考** — Read `scripts/sql/MySQL-20210225.sql` 第 401-405 行(系统组菜单 INSERT 的真实列序与字段),对齐写法。

- [ ] **Step 2: 写幂等种子**
```sql
-- 字典管理菜单(系统管理组 id=10 下,id=105)。幂等:存在则更新。
INSERT INTO `sp_sys_menu`
  (`id`,`code`,`name`,`url`,`parent_id`,`grade`,`sort_num`,`type`,`permission`,`icon`,`descr`,
   `create_time`,`create_username`,`update_time`,`update_username`)
VALUES
  ('105','dict','字典管理','/admin/sys/dict/list-ui','10','3',5,'0','dict:add','book','',
   NOW(),'admin',NOW(),'admin')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`),`url`=VALUES(`url`),`permission`=VALUES(`permission`);
```
> 列名/类型严格对齐 Step 1 真实 DDL(若 `sort_num` 实为 `varchar` 则用 `'5'`;`grade`/`type` 同理)。

- [ ] **Step 3: 提示用户执行** — 在提交说明里注明"需手动跑该 SQL 字典菜单才出现"。

- [ ] **Step 4: Commit**
```bash
git add scripts/sql/dict-menu-seed.sql
git commit -m "🌱 chore(backend): 字典管理菜单种子(幂等,系统组 id=105)"
```

---

## Phase B — 前端基建与纯逻辑(TDD)

### Task B1: 请求层数组编码加固

**Files:**
- Modify: `mes/vue3/src/api/request.ts`(`toFormUrlEncoded`)
- Test: `mes/vue3/src/api/__tests__/request.spec.ts`(若已存在则追加用例,否则新建)

- [ ] **Step 1: 写失败测试**
```ts
import { describe, it, expect } from 'vitest'
import { toFormUrlEncoded } from '@/api/request'

describe('toFormUrlEncoded 数组', () => {
  it('数组追加为重复键', () => {
    expect(toFormUrlEncoded({ a: 1, ids: ['x', 'y'] })).toBe('a=1&ids=x&ids=y')
  })
  it('跳过 undefined/null,保留标量', () => {
    expect(toFormUrlEncoded({ a: 'v', b: undefined, c: null })).toBe('a=v')
  })
})
```

- [ ] **Step 2: 运行看失败** — Run: `cd mes/vue3 && pnpm test -- request`,Expected: FAIL(现实现把数组编成 `ids=x%2Cy`)。

- [ ] **Step 3: 实现加固**

在 `toFormUrlEncoded` 内,把单行 append 改为:
```ts
Object.entries(obj).forEach(([k, v]) => {
  if (v === undefined || v === null) return
  if (Array.isArray(v)) v.forEach((it) => { if (it !== undefined && it !== null) sp.append(k, String(it)) })
  else sp.append(k, String(v))
})
```

- [ ] **Step 4: 运行看通过** — Run: `cd mes/vue3 && pnpm test -- request`,Expected: PASS。

- [ ] **Step 5: Commit**
```bash
git add mes/vue3/src/api/request.ts mes/vue3/src/api/__tests__/request.spec.ts
git commit -m "🦺 fix(vue3): toFormUrlEncoded 数组编码为重复键(sysMenuIds/sysRoleIds 绑定)"
```

### Task B2: urlMap + MenuItem 接入

**Files:**
- Create: `mes/vue3/src/utils/urlMap.ts`
- Modify: `mes/vue3/src/layouts/components/MenuItem.vue`
- Test: `mes/vue3/src/utils/__tests__/urlMap.spec.ts`

- [ ] **Step 1: 写失败测试**
```ts
import { describe, it, expect } from 'vitest'
import { toSpaRoute } from '@/utils/urlMap'

describe('toSpaRoute', () => {
  it('已知后端 url 翻译为干净路由', () => {
    expect(toSpaRoute('/admin/sys/user/list-ui')).toBe('/system/user')
    expect(toSpaRoute('/admin/sys/dict/list-ui')).toBe('/system/dict')
  })
  it('未知 url 原样返回', () => {
    expect(toSpaRoute('/welcome')).toBe('/welcome')
  })
  it('不可导航 → undefined', () => {
    expect(toSpaRoute('#')).toBeUndefined()
    expect(toSpaRoute('')).toBeUndefined()
    expect(toSpaRoute(undefined)).toBeUndefined()
    expect(toSpaRoute('javascript:void(0)')).toBeUndefined()
  })
})
```

- [ ] **Step 2: 运行看失败** — Run: `cd mes/vue3 && pnpm test -- urlMap`,Expected: FAIL(模块不存在)。

- [ ] **Step 3: 实现**
```ts
// src/utils/urlMap.ts
/** 后端 FreeMarker *-list-ui → 干净 SPA 路由 */
const URL_MAP: Record<string, string> = {
  '/admin/welcome-ui': '/welcome',
  '/admin/sys/user/list-ui': '/system/user',
  '/admin/sys/role/list-ui': '/system/role',
  '/admin/sys/menu/list-ui': '/system/menu',
  '/admin/sys/dict/list-ui': '/system/dict',
  '/admin/sys/department/list-ui': '/system/department',
}
/** 不可导航(#/空/javascript:)→ undefined;已知→映射;未知→原样 */
export function toSpaRoute(url?: string): string | undefined {
  if (!url || url === '#' || url.trim() === '' || url.startsWith('javascript:')) return undefined
  return URL_MAP[url] ?? url
}
```

- [ ] **Step 4: 运行看通过** — Run: `cd mes/vue3 && pnpm test -- urlMap`,Expected: PASS。

- [ ] **Step 5: MenuItem 接入** — Modify `MenuItem.vue`:`<script setup>` 引入 `toSpaRoute`,新增 `const target = computed(() => toSpaRoute(props.node.url))`;模板叶子项条件 `v-else-if="target"`,`:index="target"`。`hasUrl` 计算可改为基于 `target`。

- [ ] **Step 6: 类型检查 + 构建** — Run: `cd mes/vue3 && pnpm typecheck && pnpm build`,Expected: 0 错误 + 成功。

- [ ] **Step 7: Commit**
```bash
git add mes/vue3/src/utils/urlMap.ts mes/vue3/src/utils/__tests__/urlMap.spec.ts mes/vue3/src/layouts/components/MenuItem.vue
git commit -m "✨ feat(vue3): urlMap 路由翻译 + MenuItem 接入(侧栏跳干净 SPA 路由)"
```

### Task B3: systemTree 纯函数(TDD)

**Files:**
- Create: `mes/vue3/src/utils/systemTree.ts`
- Test: `mes/vue3/src/utils/__tests__/systemTree.spec.ts`

- [ ] **Step 1: 写失败测试**
```ts
import { describe, it, expect } from 'vitest'
import { buildTree, collectSubtreeIds, mergeCheckedMenuIds, buildUserPayload, partitionDict } from '@/utils/systemTree'

describe('buildTree', () => {
  it('平铺→树(rootId 默认 0)', () => {
    const flat = [
      { id: '1', parentId: '0', name: 'A' },
      { id: '2', parentId: '1', name: 'A-1' },
      { id: '3', parentId: '0', name: 'B' },
    ]
    const tree = buildTree(flat)
    expect(tree).toHaveLength(2)
    expect(tree[0].children).toHaveLength(1)
    expect(tree[0].children![0].id).toBe('2')
  })
})
describe('collectSubtreeIds', () => {
  it('收集自身 + 全部后代', () => {
    const flat = [
      { id: '1', parentId: '0' }, { id: '2', parentId: '1' }, { id: '3', parentId: '2' }, { id: '4', parentId: '0' },
    ]
    expect([...collectSubtreeIds(flat, '1')].sort()).toEqual(['1', '2', '3'])
  })
})
describe('mergeCheckedMenuIds', () => {
  it('合并勾选+半选并去重', () => {
    expect(mergeCheckedMenuIds(['a', 'b'], ['b', 'c']).sort()).toEqual(['a', 'b', 'c'])
  })
})
describe('buildUserPayload', () => {
  it('编辑且密码空→剔除 password', () => {
    const out = buildUserPayload({ id: '1', username: 'u', password: '' }, true)
    expect(out).not.toHaveProperty('password')
  })
  it('新增→保留 password', () => {
    const out = buildUserPayload({ username: 'u', password: '123' }, false)
    expect(out.password).toBe('123')
  })
})
describe('partitionDict', () => {
  it('拆出类型(parentId=0)与按类型分组的项', () => {
    const rows = [
      { id: 't1', parentId: '0', name: '性别' },
      { id: 'i1', parentId: 't1', name: '男' },
      { id: 'i2', parentId: 't1', name: '女' },
    ]
    const { types, itemsByType } = partitionDict(rows)
    expect(types.map((t) => t.id)).toEqual(['t1'])
    expect(itemsByType['t1']).toHaveLength(2)
  })
})
```

- [ ] **Step 2: 运行看失败** — Run: `cd mes/vue3 && pnpm test -- systemTree`,Expected: FAIL(模块不存在)。

- [ ] **Step 3: 实现**
```ts
// src/utils/systemTree.ts
export interface HasIdParent { id: string; parentId: string }
export type Tree<T> = T & { children?: Tree<T>[] }

/** 平铺列表→树;rootId 默认 '0' */
export function buildTree<T extends HasIdParent>(flat: T[], rootId = '0'): Tree<T>[] {
  const map = new Map<string, Tree<T>>()
  flat.forEach((n) => map.set(n.id, { ...n }))
  const roots: Tree<T>[] = []
  map.forEach((node) => {
    if (node.parentId === rootId || !map.has(node.parentId)) {
      if (node.parentId === rootId) roots.push(node)
      else roots.push(node) // 父不在集合内也作根,避免丢节点
    } else {
      const parent = map.get(node.parentId)!
      ;(parent.children ??= []).push(node)
    }
  })
  return roots
}

/** 自身 + 全部后代 id(tree-select 排除自身防环) */
export function collectSubtreeIds<T extends HasIdParent>(flat: T[], targetId: string): Set<string> {
  const childrenOf = new Map<string, string[]>()
  flat.forEach((n) => { (childrenOf.get(n.parentId) ?? childrenOf.set(n.parentId, []).get(n.parentId)!).push(n.id) })
  const out = new Set<string>()
  const stack = [targetId]
  while (stack.length) {
    const id = stack.pop()!
    if (out.has(id)) continue
    out.add(id)
    ;(childrenOf.get(id) ?? []).forEach((c) => stack.push(c))
  }
  return out
}

/** 角色权限树:勾选 + 半选,去重 */
export function mergeCheckedMenuIds(checked: string[], halfChecked: string[]): string[] {
  return [...new Set([...checked, ...halfChecked])]
}

/** 用户表单提交裁剪:编辑且密码空→剔除 password */
export function buildUserPayload(form: Record<string, unknown>, isEdit: boolean): Record<string, unknown> {
  const out = { ...form }
  if (isEdit && (!out.password || String(out.password).trim() === '')) delete out.password
  return out
}

/** 字典两级拆分:类型(parentId==='0')+ 按类型 id 分组的项 */
export function partitionDict<T extends HasIdParent>(rows: T[]): { types: T[]; itemsByType: Record<string, T[]> } {
  const types: T[] = []
  const itemsByType: Record<string, T[]> = {}
  rows.forEach((r) => {
    if (r.parentId === '0') types.push(r)
    else (itemsByType[r.parentId] ??= []).push(r)
  })
  return { types, itemsByType }
}
```

- [ ] **Step 4: 运行看通过** — Run: `cd mes/vue3 && pnpm test -- systemTree`,Expected: PASS(全部用例)。

- [ ] **Step 5: Commit**
```bash
git add mes/vue3/src/utils/systemTree.ts mes/vue3/src/utils/__tests__/systemTree.spec.ts
git commit -m "✨ feat(vue3): systemTree 纯函数(buildTree/子树/权限树合并/用户裁剪/字典拆分) + TDD"
```

### Task B4: TS 类型 `types/system.ts`

**Files:** Create `mes/vue3/src/types/system.ts`

- [ ] **Step 1: 写类型(对照 spec §2 实体字段)**
```ts
// src/types/system.ts
import type { BasePageReq } from './api' // 若 Cycle 0 有分页请求基类则复用;否则内联 current/size

export interface PageReq { current: number; size: number; orderBy?: string }

export interface SysUser {
  id: string; username: string; name: string; deptId?: string
  deleted?: string // is_deleted: 0 正常/1 删除/2 禁用
  email?: string; mobile?: string; tel?: string; sex?: string; birthday?: string
  createTime?: string; updateTime?: string
}
export interface SysUserDTO extends Partial<SysUser> { password?: string; sysRoleIds?: string[] }
export interface SysUserPageReq extends PageReq { usernameLike?: string; nameLike?: string }

export interface SysRole { id: string; name: string; code: string; descr?: string; deleted?: string; isSystem?: string }
export interface SysRoleDTO extends Partial<SysRole> { sysMenuIds?: string[] }
export interface SysRolePageReq extends PageReq { nameLike?: string }

export interface SysDict { id: string; name: string; value?: string; type?: string; parentId: string; sortNum?: number; descr?: string; deleted?: string }
export interface SysDictPageReq extends PageReq { nameLike?: string; type?: string }

export interface SysDepartment { id: string; name: string; parentId: string; sortNum?: number; isDeleted?: string }
export interface SysDepartmentPageReq extends PageReq { nameLike?: string }

// 分页响应(MyBatis-Plus IPage)
export interface IPage<T> { records: T[]; total: number; size: number; current: number; pages: number }
```
> `SysMenu`/`TreeVO` 已在 `types/menu.ts`,直接复用。若 `types/api.ts` 已有 `IPage`/`BasePageReq` 则改为复用,删除此处重复定义。

- [ ] **Step 2: 类型检查** — Run: `cd mes/vue3 && pnpm typecheck`,Expected: 0 错误。

- [ ] **Step 3: Commit**
```bash
git add mes/vue3/src/types/system.ts
git commit -m "🏷️ feat(vue3): 系统管理 TS 类型(User/Role/Dict/Department + PageReq)"
```

### Task B5: `TreeTable.vue` 通用组件

**Files:** Create `mes/vue3/src/components/TreeTable.vue`

- [ ] **Step 1: 实现(对齐 DataTable 插槽约定,但不分页)**
```vue
<template>
  <div class="tree-table">
    <div v-if="$slots.toolbar" class="tree-table__toolbar"><slot name="toolbar" /></div>
    <el-table
      v-loading="loading"
      :data="data"
      row-key="id"
      :tree-props="{ children: 'children' }"
      default-expand-all
      stripe
    >
      <el-table-column
        v-for="c in columns" :key="c.prop" :prop="c.prop" :label="c.label"
        :width="c.width" :min-width="c.minWidth" show-overflow-tooltip
      >
        <template v-if="$slots[`col-${c.prop}`]" #default="{ row }">
          <slot :name="`col-${c.prop}`" :row="row" />
        </template>
      </el-table-column>
      <el-table-column v-if="$slots.actions" label="操作" :width="actionWidth" fixed="right">
        <template #default="{ row }"><slot name="actions" :row="row" /></template>
      </el-table-column>
      <template #empty><el-empty description="暂无数据" /></template>
    </el-table>
  </div>
</template>

<script setup lang="ts" generic="T extends Record<string, unknown>">
/** 列定义(与 DataTable 同形,避免跨 SFC 类型导入) */
export interface Column { prop: string; label: string; width?: number | string; minWidth?: number | string }
withDefaults(
  defineProps<{ data: T[]; columns: Column[]; loading?: boolean; actionWidth?: number | string }>(),
  { loading: false, actionWidth: 200 },
)
</script>

<style scoped>
.tree-table__toolbar { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin-bottom: var(--sp-3); }
</style>
```

- [ ] **Step 2: 类型检查 + 构建** — Run: `cd mes/vue3 && pnpm typecheck && pnpm build`,Expected: 0 错误 + 成功。

- [ ] **Step 3: Commit**
```bash
git add mes/vue3/src/components/TreeTable.vue
git commit -m "✨ feat(vue3): TreeTable 树形表格组件(菜单/部门复用)"
```

### Task B6: `MasterDetailLayout.vue` 通用组件

**Files:** Create `mes/vue3/src/components/MasterDetailLayout.vue`

- [ ] **Step 1: 实现**
```vue
<template>
  <div class="master-detail">
    <div class="master-detail__master"><slot name="master" /></div>
    <div class="master-detail__detail">
      <slot v-if="hasSelection" name="detail" />
      <slot v-else name="detail-empty"><el-empty description="请选择左侧项查看明细" /></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
// 左主右从两栏布局:master 永显,detail 选中才显示(否则 detail-empty 占位)
defineProps<{ hasSelection: boolean }>()
</script>

<style scoped>
.master-detail { display: grid; grid-template-columns: 360px 1fr; gap: var(--sp-4); align-items: start; }
.master-detail__master, .master-detail__detail { min-width: 0; }
@media (max-width: 900px) { .master-detail { grid-template-columns: 1fr; } }
</style>
```

- [ ] **Step 2: 类型检查 + 构建** — Run: `cd mes/vue3 && pnpm typecheck && pnpm build`,Expected: 0 错误 + 成功。

- [ ] **Step 3: Commit**
```bash
git add mes/vue3/src/components/MasterDetailLayout.vue
git commit -m "✨ feat(vue3): MasterDetailLayout 左主右从布局(字典 + 后续复用)"
```

---

## Phase C — API 层

### Task C1: `api/system/*.ts`(5 文件)

**Files:** Create `mes/vue3/src/api/system/{user,role,menu,dict,dept}.ts`

- [ ] **Step 1: 读 `api/request.ts` 的 `http` 用法**(`http.get<T>(url, params)` / `http.post<T>(url, data)`;系统模块全 form 编码,**不传第三参 json**)。

- [ ] **Step 2: 实现 5 个 API 文件**

`api/system/user.ts`:
```ts
import { http } from '@/api/request'
import type { SysUser, SysUserDTO, SysUserPageReq, IPage } from '@/types/system'

export const userPage = (req: SysUserPageReq) => http.post<IPage<SysUser>>('/admin/sys/user/page', req)
export const userGetById = (id: string) => http.get<SysUser>('/admin/sys/user/get-by-id', { id })
export const userAddOrUpdate = (dto: SysUserDTO) => http.post<string>('/admin/sys/user/add-or-update', dto)
export const userDelete = (id: string) => http.post<string>('/admin/sys/user/delete', { id })
```
`role.ts`:
```ts
export const rolePage = (req: SysRolePageReq) => http.post<IPage<SysRole>>('/admin/sys/role/page', req)
export const roleGetById = (id: string) => http.get<SysRole>('/admin/sys/role/get-by-id', { id })
export const roleAddOrUpdate = (dto: SysRoleDTO) => http.post<string>('/admin/sys/role/add-or-update', dto)
export const roleMenuIds = (roleId: string) => http.get<string[]>(`/admin/sys/role/tree/${roleId}`)
export const roleDelete = (id: string) => http.post<string>('/admin/sys/role/delete', { id })
```
`menu.ts`:
```ts
import type { TreeVO, SysMenu } from '@/types/menu'
export const menuTreeAdmin = () => http.get<TreeVO<SysMenu>[]>('/admin/sys/menu/tree')
export const menuPage = (req: { current: number; size: number }) => http.post<IPage<SysMenu>>('/admin/sys/menu/page', req)
export const menuGetById = (id: string) => http.get<SysMenu>('/admin/sys/menu/get-by-id', { id })
export const menuAddOrUpdate = (m: Partial<SysMenu>) => http.post<string>('/admin/sys/menu/add-or-update', m)
export const menuDelete = (id: string) => http.post<string>('/admin/sys/menu/delete', { id })
```
`dict.ts`:
```ts
export const dictPage = (req: SysDictPageReq) => http.post<IPage<SysDict>>('/admin/sys/dict/page', req)
export const dictGetById = (id: string) => http.get<SysDict>('/admin/sys/dict/get-by-id', { id })
export const dictAddOrUpdate = (d: Partial<SysDict>) => http.post<string>('/admin/sys/dict/add-or-update', d)
export const dictDelete = (id: string) => http.post<string>('/admin/sys/dict/delete', { id })
```
`dept.ts`:
```ts
export const deptPage = (req: SysDepartmentPageReq) => http.post<IPage<SysDepartment>>('/admin/sys/department/page', req)
export const deptGetById = (id: string) => http.get<SysDepartment>('/admin/sys/department/get-by-id', { id })
export const deptAddOrUpdate = (d: Partial<SysDepartment>) => http.post<string>('/admin/sys/department/add-or-update', d)
export const deptDelete = (id: string) => http.post<string>('/admin/sys/department/delete', { id })
/** 全量拉取(客户端建树),size 取大值 */
export const deptAll = () => deptPage({ current: 1, size: 9999 })
```
> 各文件按需 import 对应类型。

- [ ] **Step 3: 类型检查** — Run: `cd mes/vue3 && pnpm typecheck`,Expected: 0 错误。

- [ ] **Step 4: Commit**
```bash
git add mes/vue3/src/api/system/
git commit -m "✨ feat(vue3): 系统管理 API 层(user/role/menu/dict/dept,form 编码 + 新增 delete)"
```

---

## Phase D — 页面(逐页;每页同时注册路由)

> 路由统一加在 `router/index.ts` 的 AdminLayout `children` 数组(`path` 用 §4.2 干净路由,`meta:{ title, perm }`)。所有页面用 Element Plus 深度主题,**不抄 mes-new UI**。表单一律普通 `ref` 受控 + `el-form` 规则;避免字段名与 DOM 属性同名(见 [[rhf-field-name-dom-clobbering]] 同理)。

### Task D1: 用户页(范式模板)

**Files:**
- Create: `mes/vue3/src/views/system/user/UserList.vue`、`UserForm.vue`
- Modify: `mes/vue3/src/router/index.ts`

- [ ] **Step 1: `UserForm.vue`(弹窗内表单,props 入/emit 出)**
  - props:`modelValue:boolean`、`model: SysUserDTO | null`(null=新增)、`roles: SysRole[]`、`deptTree: Tree<SysDepartment>[]`、`loading:boolean`。
  - emits:`update:modelValue`、`submit:[SysUserDTO]`。
  - 用 `FormDialog` 包裹;内部 `el-form` + `ref formRef`;本地 `form = reactive<SysUserDTO>({...})`,`watch(() => props.model, ...)` 同步(新增置空、编辑填充)。
  - 字段:`username`(`el-input`,编辑禁用 `:disabled="isEdit"`)、`name`、`password`(`el-input type=password`,`:placeholder="isEdit ? '留空不修改' : ''"`)、角色 `el-select multiple`(options=roles 的 name/id)、部门 `el-tree-select`(data=deptTree,`node-key=id`,`:props="{label:'name'}"`,`check-strictly`)、状态 `el-select`(0 正常/2 禁用)。
  - 校验规则:`username` 必填、`name` 必填、`password` 新增必填(`required: !isEdit`)。
  - 提交:`formRef.validate()` 通过后 `emit('submit', buildUserPayload(form, isEdit) as SysUserDTO)`。

- [ ] **Step 2: `UserList.vue`(列表 + 编排)**
  - `usePagination()` + `useRequest(() => userPage({ current, size, ...search }))`。
  - 顶部 `SearchForm(model=search)`:username、name 两个 `el-input`;`@search` 重置页码并 `run()`,`@reset` 清空再 `run()`。
  - `DataTable`:columns=[登录名 username、姓名 name、状态(`#col-deleted` 插槽渲染徽标:0→成功"正常"/2→警告"禁用"/1→危险"已删除")、创建时间 createTime];`#toolbar`:`<el-button v-permission="'user:add'" @click="openCreate">新增</el-button>`;`#actions`:编辑 + 删除按钮。
  - 角色/部门数据:`onMounted` 拉 `rolePage({current:1,size:9999})` 与 `deptAll()`→`buildTree` 备用给表单。
  - 提交回调:`userAddOrUpdate(dto)` 成功→`ElMessage.success('保存成功')`+关弹窗+`run()`。
  - 删除:`ElMessageBox.confirm('确认删除该用户?')`→`userDelete(row.id)`→`ElMessage.success`+`run()`。

- [ ] **Step 3: 注册路由** — `router/index.ts` AdminLayout children 追加:
```ts
{ path: 'system/user', name: 'system-user', component: () => import('@/views/system/user/UserList.vue'), meta: { title: '用户管理', perm: 'user:add' } },
```

- [ ] **Step 4: 类型检查 + 构建** — Run: `cd mes/vue3 && pnpm typecheck && pnpm build`,Expected: 0 错误 + 成功。

- [ ] **Step 5: Commit**
```bash
git add mes/vue3/src/views/system/user/ mes/vue3/src/router/index.ts
git commit -m "✨ feat(vue3): 用户管理页(列表+表单,CRUD 范式模板)"
```

### Task D2: 角色页(权限树)

**Files:** Create `views/system/role/{RoleList,RoleForm}.vue`;Modify `router/index.ts`

- [ ] **Step 1: `RoleForm.vue`** — 基础字段 `name`/`code`/`descr`(`el-form` 校验 name/code 必填)+ **权限树**:
  - props 增 `menuTree: TreeVO<SysMenu>[]`、`checkedIds: string[]`(编辑态已勾选,新增为空)。
  - `el-tree ref="treeRef"`:`:data="menuTree"`、`node-key="id"`、`show-checkbox`、`:props="{ label: 'name', children: 'children' }"`、`:default-checked-keys="checkedIds"`。
  - 提交:`const sysMenuIds = mergeCheckedMenuIds(treeRef.value.getCheckedKeys() as string[], treeRef.value.getHalfCheckedKeys() as string[])`;`emit('submit', { ...form, sysMenuIds })`。
  - `watch(() => props.checkedIds)`:弹窗打开后用 `treeRef.value?.setCheckedKeys(props.checkedIds)`(`nextTick` 后)。

- [ ] **Step 2: `RoleList.vue`** — `SearchForm`(name);`DataTable` 列:名称/编码/描述/系统角色(`#col-isSystem` 徽标);`#toolbar` 新增(`v-permission="'role:add'"`);`#actions` 编辑/删除。
  - 菜单树:`onMounted` 拉 `menuTreeAdmin()` 缓存给表单。
  - 打开编辑:`roleMenuIds(row.id)` 取已勾选 id 传入表单 `checkedIds`;新增传 `[]`。
  - 删除:`roleDelete(row.id)`(软删)。

- [ ] **Step 3: 注册路由**
```ts
{ path: 'system/role', name: 'system-role', component: () => import('@/views/system/role/RoleList.vue'), meta: { title: '角色管理', perm: 'role:add' } },
```

- [ ] **Step 4: 类型检查 + 构建** — Expected: 0 错误 + 成功。

- [ ] **Step 5: Commit**
```bash
git add mes/vue3/src/views/system/role/ mes/vue3/src/router/index.ts
git commit -m "✨ feat(vue3): 角色管理页(含 el-tree 菜单权限树 勾选/回填/半选提交)"
```

### Task D3: 菜单页(树表)

**Files:** Create `views/system/menu/{MenuList,MenuForm}.vue`;Modify `router/index.ts`

- [ ] **Step 1: `MenuForm.vue`** — 字段 `code`/`name`/上级 `el-tree-select`(data=菜单树,`node-key=id`,`check-strictly`,`:props="{label:'name'}"`;**禁选自身及后代**:用 `collectSubtreeIds(flatMenus, editingId)` 得排除集,给 tree-select 节点 `:disabled`,或过滤数据)/`type`(`el-select` 0 目录/1 菜单/2 按钮)/`url`/`permission`/`icon`/`sortNum`(`el-input-number`)/`descr`。
  - 后端 `TreeVO.pid` → 表单 `parentId`:打开编辑时把选中行的 `pid`(或 `parentId`)填入。
  - **编辑补全**:打开编辑先 `menuGetById(row.id)` 拿全字段(树投影缺 sortNum/descr)再填表单。

- [ ] **Step 2: `MenuList.vue`** — `TreeTable`(data=`menuTreeAdmin()` 返回的树;columns:名称 name/类型(`#col-type` 徽标 目录·菜单·按钮)/权限 permission/url/排序 sortNum);`#toolbar` 新增(`v-permission="'menu:add'"`);`#actions` 编辑/删除/新增子项(预填 parentId=row.id)。
  - 删除:`menuDelete(row.id)`;后端有子菜单会抛错→响应拦截器已 `ElMessage.error` 展示"请先删除子菜单"。

- [ ] **Step 3: 注册路由**
```ts
{ path: 'system/menu', name: 'system-menu', component: () => import('@/views/system/menu/MenuList.vue'), meta: { title: '菜单管理', perm: 'menu:add' } },
```

- [ ] **Step 4: 类型检查 + 构建** — Expected: 0 错误 + 成功。

- [ ] **Step 5: Commit**
```bash
git add mes/vue3/src/views/system/menu/ mes/vue3/src/router/index.ts
git commit -m "✨ feat(vue3): 菜单管理页(TreeTable + 上级树选排除自身 + 编辑补全)"
```

### Task D4: 部门页(树表)

**Files:** Create `views/system/dept/{DeptList,DeptForm}.vue`;Modify `router/index.ts`

- [ ] **Step 1: `DeptForm.vue`** — 字段 `name`/上级 `el-tree-select`(data=部门树,排除自身后代同菜单做法)/`sortNum`。校验 name 必填。

- [ ] **Step 2: `DeptList.vue`** — 取数 `deptAll()` → `buildTree(records)` → `TreeTable`(columns:名称 name/排序 sortNum);`#toolbar` 新增(`v-permission="'dept:add'"`);`#actions` 编辑/删除/新增子项。
  - 删除:`deptDelete(row.id)`(软删)。

- [ ] **Step 3: 注册路由**
```ts
{ path: 'system/department', name: 'system-department', component: () => import('@/views/system/dept/DeptList.vue'), meta: { title: '部门管理', perm: 'dept:add' } },
```

- [ ] **Step 4: 类型检查 + 构建** — Expected: 0 错误 + 成功。

- [ ] **Step 5: Commit**
```bash
git add mes/vue3/src/views/system/dept/ mes/vue3/src/router/index.ts
git commit -m "✨ feat(vue3): 部门管理页(客户端建树 TreeTable + 树选上级)"
```

### Task D5: 字典页(两级主从)

**Files:** Create `views/system/dict/{DictList,DictTypeForm,DictItemForm}.vue`;Modify `router/index.ts`

- [ ] **Step 1: 核实两级数据** — 临时 `dictPage({current:1,size:9999})` 看真实数据:确认类型行判定(`parentId==='0'`)、项的 `parentId` 指向类型 id、`type` 字段含义。如与假设不符,调整 `partitionDict` 调用方式(必要时按 `type` 而非 parentId 分组)。

- [ ] **Step 2: `DictList.vue`(主从编排)** — 用 `MasterDetailLayout :has-selection="!!selectedType"`:
  - `#master`:`SearchForm`(name)+`DataTable`(类型列表=`partitionDict(rows).types`;列:名称/类型 type/排序;行点击 `@row-click` 设 `selectedType`);`#toolbar` 新增类型(`DictTypeForm`)。
  - `#detail`:标题"【{{selectedType.name}}】字典项"+`DataTable`(items=`itemsByType[selectedType.id]`;列:名称/值 value/排序);`#toolbar` 新增项(`DictItemForm`,预置 parentId=selectedType.id、type=selectedType.type);`#actions` 编辑/删除项。
  - `#detail-empty`:占位。
  - 取数:`useRequest(() => dictPage({current:1,size:9999}))`→`partitionDict`;增删改后 `run()` 重拉并保持 `selectedType`。

- [ ] **Step 3: `DictTypeForm.vue` / `DictItemForm.vue`** — 类型表单:name/type/sortNum/descr(parentId 固定 `'0'`);项表单:name/value/sortNum/descr(parentId=当前类型 id、type 继承)。校验 name 必填。提交走 `dictAddOrUpdate`。删除走 `dictDelete`(软删)。

- [ ] **Step 4: 注册路由**
```ts
{ path: 'system/dict', name: 'system-dict', component: () => import('@/views/system/dict/DictList.vue'), meta: { title: '字典管理', perm: 'dict:add' } },
```

- [ ] **Step 5: 类型检查 + 构建** — Expected: 0 错误 + 成功。

- [ ] **Step 6: Commit**
```bash
git add mes/vue3/src/views/system/dict/ mes/vue3/src/router/index.ts
git commit -m "✨ feat(vue3): 字典管理页(MasterDetailLayout 两级:类型→字典项)"
```

---

## Phase E — 收尾

### Task E1: 全量质量门禁 + dev 冒烟

- [ ] **Step 1: 前端门禁** — Run: `cd mes/vue3 && pnpm typecheck && pnpm test && pnpm build`,Expected: 0 错误 / 全绿 / 构建成功。
- [ ] **Step 2: 后端门禁** — Run: `cd mes && JAVA_HOME=$(/usr/libexec/java_home -v 11) mvn -q test -Dtest='Sys*GuardTest' && JAVA_HOME=$(/usr/libexec/java_home -v 11) mvn -q compile`,Expected: 测试绿 + BUILD SUCCESS。
- [ ] **Step 3: dev 冒烟(需用户先起后端 9090 + 跑 `scripts/sql/dict-menu-seed.sql`)** — `pnpm dev`→`admin/123` 登录→侧栏系统管理 5 项可点(干净路由)→每页:列表加载 + 新增 + 编辑 + 删除 + 分页/搜索;角色权限树勾选保存后重开回填一致;字典两级类型→项;菜单/部门树表展开 + 上级树选不含自身。记录任何异常并修复(修复另起 fix 提交)。
- [ ] **Step 4(若有修复): Commit** — `git commit -m "🐛 fix(vue3): 系统管理 dev 冒烟修复(...)"`

### Task E2: ROADMAP 更新 + 合并 develop

- [ ] **Step 1: 更新 ROADMAP** — `mes/vue3/docs/ROADMAP.md` §9.1 把用户/角色/菜单/字典/部门状态由 ☐ 改 ✅(周期标 C1/1a);§8 Cycle 1 注明"按子周期 1a~1h 推进,1a 系统管理已完成";§11 加一行进度快照。
- [ ] **Step 2: Commit**
```bash
git add mes/vue3/docs/ROADMAP.md
git commit -m "📝 docs(vue3): 路线图更新 — 子周期 1a 系统管理完成"
```
- [ ] **Step 3: 合并到 develop**
```bash
git checkout develop && git merge --no-ff feature/system -m "🔀 Merge: 子周期 1a 系统管理完成 (feature/system → develop)"
```
- [ ] **Step 4: 提醒用户** push 与浏览器端到端复核(后端 9090 + 已跑字典菜单种子)。

---

## 自审清单(已执行)

**Spec 覆盖:** 用户/角色/菜单/字典/部门 5 页 → D1-D5;后端 5 删除端点 → A1/A2;add-or-update 审查 → A3;字典菜单种子 → A4;urlMap → B2;数组编码 → B1;纯逻辑 → B3;TreeTable/MasterDetailLayout → B5/B6;类型 → B4;API → C1;权限树/两级字典/树选排除自身/编辑补全 → D2/D5/D3。✅ 全覆盖。

**类型一致性:** `buildTree`/`collectSubtreeIds`/`mergeCheckedMenuIds`/`buildUserPayload`/`partitionDict`(B3 定义)在 D1/D2/D3/D4/D5 的调用签名一致;`toSpaRoute`(B2)在 MenuItem 一致;`softDelete`/`deletePhysical`(A1/A2)命名一致。✅

**占位扫描:** 后端 add-or-update 修正(A3)依赖"读真实代码后定位真实 bug",非空泛"加错误处理"——已给出**具体检查清单**(事务/返回id/密码/return)与守卫测试形态;字典两级(D5 Step1)给出**真实数据核实步骤**。无 TBD/TODO。✅
