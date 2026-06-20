# Cycle 1a — 系统管理(用户/角色/菜单/字典/部门)· 设计文档(Spec)

- 文档版本：v1（2026-06-20 创建）
- 所属：Vue3 前端大作业 `mes/vue3`，Cycle 1 的首个子周期（1a）
- 分支：`feature/system`（从 `develop` 切）
- 后端：Spring Boot @ `localhost:9090`（dev 关验证码，凭据 `admin/123`）
- 关联：[ROADMAP](../ROADMAP.md) §8/§9.1；功能/接口参考 React 版 `mes-new`（**仅参考契约与功能，绝不照抄 UI**）

> 本 spec 的所有后端契约均**已核实真实代码**（Controller/Entity/Mapper/SQL 种子），非roadmap推测。

---

## 1. 范围与战略目的

### 1.1 范围
子周期 1a 实现**系统管理 5 个页面的完整 CRUD**：用户、角色（+菜单权限树）、菜单（树）、字典（两级主从）、部门（树）。一条 `feature/system` 分支，独立 spec→plan→实现→审查→合并。

### 1.2 战略目的
1a 是 Cycle 1 拆出的 8 个子周期（1a~1h）的第一个，承担**基建定型**职责：
- 把 Cycle 0 通用脚手架（`DataTable`/`SearchForm`/`FormDialog`/`useRequest`/`usePagination`）**第一次接到真后端跑通**，沉淀可复用 CRUD 范式。
- 沉淀后续 7 个子周期高频复用的三类特化原语：**树表 `TreeTable`**、**权限树（el-tree）**、**两级主从 `MasterDetailLayout`**。
- 打通 **urlMap 路由翻译机制**（侧栏菜单 url → 干净 SPA 路由）。
- 端到端验证 Cycle 0 鉴权/菜单驱动栈（登录→菜单→CRUD 往返）。

### 1.3 实现架构（方案 A：组合复用 + 渐进特化）
复用现有通用组件，**先把纯 CRUD（用户）打磨成范式模板**，再在其上叠加树表（菜单/部门）、权限树（角色）、两级主从（字典）、关联下拉（用户的角色/部门）四类特化。不做 `useCrud`/`CrudPage` 声明式高阶封装（5 页差异大，过早抽象违反 YAGNI）。

---

## 2. 后端契约（权威，已核实）

### 通用约定
- **编码**：系统模块**所有 POST 端点都是 `@RequestParam`（form 编码）**；GET 走 query/path。→ Cycle 0 `request.ts` 默认表单编码直接适用，**零 JSON 特例**。
- **分页**：请求 `current`/`size`（`BasePageReq` 继承 MyBatis-Plus `Page`，默认 `orderBy=update_time`）；响应 `IPage`：`{records,total,size,current,pages}`。
- **密码**：后端在新增（save）时 MD5×3 加盐（盐=username）；编辑（update）密码字段为空=不改。**前端不得自行 hash**。
- **统一响应**：`Result<T>{code,data,msg}`；`code===0` 取 `data`。
- **软删列语义**：`is_deleted` = `'0'` 正常 / `'1'` 删除 / `'2'` 禁用。

### 2.1 用户 `/admin/sys/user`（`SysUserController`）
| 方法 | 路径 | 入参 | 返回 |
|---|---|---|---|
| POST | `/page` | form：current/size/orderBy/`usernameLike`/`nameLike` | `IPage<SysUser>` |
| GET | `/get-by-id` | `id` | `SysUser` |
| POST | `/add-or-update` | form：`SysUserDTO` | `String`(id) |
| POST | `/delete` ⭐新增 | `id` | `String` |

- `SysUserDTO` 字段：`id?`、`username`、`password?`、`name`、`deptId`、`sysRoleIds: String[]`、（扩展 email/mobile/tel/sex/birthday）、`deleted`(is_deleted)。
- 关联：后端用 `SysRoleService.rebuild(dto)` 删旧 `sp_sys_user_role` 再插新（无脏数据）。

### 2.2 角色 `/admin/sys/role`（`SysRoleController`）
| 方法 | 路径 | 入参 | 返回 |
|---|---|---|---|
| POST | `/page` | form：current/size/`nameLike` | `IPage<SysRole>`（**已过滤 `is_deleted='0'`**，`SysRoleServiceImpl:55`） |
| GET | `/get-by-id` | `id` | `SysRole` |
| POST | `/add-or-update` | form：`SysRoleDTO` | `String`(id) |
| GET | `/tree/{roleId}` | path | `List<String>`（该角色**已勾选菜单 id 列表**，非树结构） |
| POST | `/delete` ⭐新增 | `id` | `String` |

- `SysRoleDTO` 字段：`id?`、`name`、`code`、`descr`、`isSystem`、`sysMenuIds: String[]`。
- **权限树关键**：后端只返回已勾选 id 数组；前端自取 `/menu/tree` 整树 + id 数组回填勾选；保存提交 `sysMenuIds`（含半选父节点 id，见 §5.4）。

### 2.3 菜单 `/admin/sys/menu`（`SysMenuController`）
| 方法 | 路径 | 入参 | 返回 |
|---|---|---|---|
| POST | `/page` | form：`SysMenuPageReq` | `IPage<SysMenu>`（**平铺非树**） |
| GET | `/get-by-id` | `id` | `SysMenu`（含树投影缺的 sortNum/grade/descr） |
| GET | `/tree` | 无 | `List<TreeVO<SysMenu>>` |
| POST | `/add-or-update` | form：`SysMenu` | `String`(id) |
| POST | `/delete` ⭐新增 | `id` | `String`（物理删，见 §6.1） |

- `SysMenu` 字段：`id`、`code`、`name`、`parentId`（'0'=一级）、`url`、`grade`、`type`(0 目录/1 菜单/2 按钮)、`permission`、`sortNum`、`icon`、`descr`。
- `TreeVO` 中后端把 `parentId` 映射为 `pid`；前端表单需 `pid→parentId` 还原。
- **菜单无 `is_deleted` 列**（已核 DDL）→ 删除只能物理删。

### 2.4 字典 `/admin/sys/dict`（`SysDictController`）
| 方法 | 路径 | 入参 | 返回 |
|---|---|---|---|
| POST | `/page` | form：`SysDictPageReq` | `IPage<SysDict>` |
| GET | `/get-by-id` | `id` | `SysDict` |
| POST | `/add-or-update` | form：`SysDict` | `String`(id) |
| POST | `/delete` ⭐新增 | `id` | `String`（软删） |

- `SysDict` 字段：`id`、`name`、`value`、`type`、`parentId`、`sortNum`、`descr`、`deleted`(is_deleted)。
- **两级单表**：类型记录 `parentId='0'`；字典项记录 `parentId=类型记录id`。无独立 `dict/list/{type}` 端点。实现首步**用真实数据核实父/类型联结**（类型行的判定字段）。

### 2.5 部门 `/admin/sys/department`（`SysDepartmentController`）
| 方法 | 路径 | 入参 | 返回 |
|---|---|---|---|
| POST | `/page` | form：`SysDepartmentPageReq` | `IPage<SysDepartment>` |
| GET | `/get-by-id` | `id` | `SysDepartment` |
| POST | `/add-or-update` | form：`SysDepartment` | `String`(id) |
| POST | `/delete` ⭐新增 | `id` | `String`（软删） |

- `SysDepartment` 字段：`id`、`name`、`parentId`（'0'=顶级）、`sortNum`、`isDeleted`。
- 无专用 tree 端点 → 前端 `deptPage({current:1,size:大值})` 拉全量、客户端建树（作业数据量可接受）。

---

## 3. 前端架构

### 3.1 新增文件
```
src/api/system/{user,role,menu,dict,dept}.ts   # 各模块 API 函数（含新增 delete）
src/types/system.ts                             # SysUser(DTO)/SysRole(DTO)/SysDict/SysDepartment + 各 PageReq
                                                # （SysMenu/TreeVO 已在 types/menu.ts，复用）
src/views/system/
  user/{UserList,UserForm}.vue
  role/{RoleList,RoleForm}.vue                  # + 权限树
  menu/{MenuList,MenuForm}.vue                  # 树表
  dict/{DictList,DictItemForm,DictTypeForm}.vue # 两级主从
  dept/{DeptList,DeptForm}.vue                  # 树表
src/components/TreeTable.vue                     # 新增：树形表格（菜单/部门复用）
src/components/MasterDetailLayout.vue            # 新增：左主右从两栏布局（字典 + 后续 BOM/库存复用）
src/utils/urlMap.ts                             # 新增：后端 *-list-ui → 干净 SPA 路由
src/utils/systemTree.ts                          # 纯函数（buildTree / collectCheckedMenuIds / stripPasswordIfEmpty / partitionDict / excludeSelfSubtree），供 TDD
```

### 3.2 复用现有（零改动）
`DataTable`、`SearchForm`、`FormDialog`、`PageContainer`、`TableSkeleton`、`useRequest`、`usePagination`、`v-permission` 指令、`permission`/`user`/`app` store、`AdminLayout`。

### 3.3 逐页设计
- **用户 `UserList`/`UserForm`**：
  - 列表：`SearchForm`(username/name) + `DataTable`（列：登录名/姓名/状态徽标/创建时间；`actions`：编辑/删除）。
  - 表单：`FormDialog` + `el-form`：`username`（编辑禁用）、`name`、`password`（新增必填·编辑留空=不改，占位提示"留空不修改"）、角色多选（`el-select multiple`，选项取 `rolePage` 全量）、部门（`el-tree-select`，数据=部门树）、状态。
  - 提交裁剪：编辑且密码空→不带 `password` 字段（`stripPasswordIfEmpty`，TDD）。
- **角色 `RoleList`/`RoleForm`**：
  - 列表：`SearchForm`(name) + `DataTable`（名称/编码/描述/系统角色徽标；编辑/删除）。
  - 表单：`name`/`code`/`descr` + **权限树**：`el-tree`（`show-checkbox`、`node-key=id`、`default-checked-keys`）。打开时并行加载 `menuTree`（缓存）+ `roleMenuIds(roleId)`；提交合成 `sysMenuIds = checkedKeys + halfCheckedKeys`（§5.4）。
- **菜单 `MenuList`/`MenuForm`**：
  - 列表：`TreeTable`（数据=`menuTree`；列：名称/类型徽标(目录/菜单/按钮)/权限/url/排序；编辑/删除/"新增子项"）。
  - 表单：`code`/`name`/上级（`el-tree-select`，**排除自身及后代** `excludeSelfSubtree`，pid→parentId 还原）/`type`/`url`/`permission`/`icon`/`sortNum`/`descr`。**编辑时调 `menuGetById` 补全**树投影缺的字段。
- **部门 `DeptList`/`DeptForm`**：
  - 列表：`TreeTable`（`deptPage` 全量→`buildTree` 客户端建树；列：名称/排序；编辑/删除/新增子项）。
  - 表单：`name`/上级（`el-tree-select`，排除自身后代）/`sortNum`。
- **字典 `DictList`（两级主从）**：见 §7。

---

## 4. 路由与权限

### 4.1 urlMap 翻译机制（修订 Cycle 0 原假设）
Cycle 0 原假设"路由 path 对齐后端 url"，但后端菜单 url 是 `*-list-ui`（如 `/admin/sys/user/list-ui`）。本子周期引入 `src/utils/urlMap.ts`（复刻 mes-new 成熟做法）：
```ts
const URL_MAP: Record<string,string> = {
  '/admin/sys/user/list-ui': '/system/user',
  '/admin/sys/role/list-ui': '/system/role',
  '/admin/sys/menu/list-ui': '/system/menu',
  '/admin/sys/dict/list-ui': '/system/dict',          // 配套 §6.3 字典菜单种子
  '/admin/sys/department/list-ui': '/system/department',
}
export function toSpaRoute(url?: string): string | undefined { /* '#'/空/javascript: → undefined */ }
```
`MenuItem.vue` 叶子 `index` 改为 `toSpaRoute(node.url) ?? node.url`（不可导航项不渲染为可点）。`el-menu router` 模式直接跳干净路由。

### 4.2 路由表追加（`router/index.ts` 的 AdminLayout children）
```
/system/user        → views/system/user/UserList.vue       meta:{title:'用户管理', perm:'user:add'}
/system/role        → views/system/role/RoleList.vue       meta:{title:'角色管理', perm:'role:add'}
/system/menu        → views/system/menu/MenuList.vue       meta:{title:'菜单管理', perm:'menu:add'}
/system/dict        → views/system/dict/DictList.vue       meta:{title:'字典管理', perm:'dict:add'}
/system/department  → views/system/dept/DeptList.vue       meta:{title:'部门管理', perm:'dept:add'}
```

### 4.3 权限粒度现状（重要约束）
菜单种子的 `permission` 列**只有粗粒度 `<模块>:add`**（如 `user:add`/`role:add`/`menu:add`/`dept:add`），**无 `:list/:update/:delete`**。`permission` store 已把全部菜单 permission 收进 Set。因此：
- **路由 `meta.perm`** 用对应模块的 `<x>:add`（Set 中存在，登录后即放行——侧栏本就菜单驱动不按角色过滤）。
- **按钮级 `v-permission`** 在"新增"按钮上演示 `<x>:add`（真实种子权限，命中评分③）；编辑/删除按钮因无对应细权限，暂沿用 `<x>:add` 作粗门控。
- 丰富按钮级权限需扩 menu 种子 → 列 backlog（§10），本子周期不做（避免改共享菜单数据）。

---

## 5. 数据流与编码契约

### 5.1 请求层数组编码加固（最小、必要）
`toFormUrlEncoded` 现用 `sp.append(k, String(v))`，数组会被 `String(['a','b'])` → `"a,b"` 编成单键，对后端 `String[]`/`List<String>` 绑定脆弱。**增强为数组追加重复键**：
```ts
if (Array.isArray(v)) v.forEach((it) => sp.append(k, String(it)))
else sp.append(k, String(v))
```
重复键 `sysMenuIds=a&sysMenuIds=b` 是 Spring 对 `String[]`/`List<String>` 最稳的绑定形式（向后兼容标量）。实现首步以 `sysMenuIds`/`sysRoleIds` 端到端验证。

### 5.2 CRUD 流（每页一致）
`useRequest(listFetcher)` 管 loading/data → 搜索：重置 `pager.current=1` 再拉 → `FormDialog` submit → `el-form.validate()` → `addOrUpdate` → 关闭 + 重拉 + `ElMessage.success` → 删除：`ElMessageBox.confirm` → `delete(id)` → 重拉。

### 5.3 错误/反馈
沿用响应拦截器解包 `Result`（`code≠0`→`ElMessage.error`+reject；401→`/login`）；`el-form` 必填/正则校验；`DataTable` 空态 + 骨架屏；`useRequest` loading。

### 5.4 角色权限树流（细节）
打开表单 → 并行 `menuTree`（模块级缓存，避免每次拉）+ `roleMenuIds(roleId)`（编辑态）→ `el-tree` `default-checked-keys` 仅设**叶子/已存 id**（父节点由 el-tree 自动半选）→ 提交 `sysMenuIds = tree.getCheckedKeys().concat(tree.getHalfCheckedKeys())`（半选父节点也要带，否则后端重建丢失中间层授权）。`collectCheckedMenuIds` 纯函数封装 + TDD。

---

## 6. 后端改动（最小新增 + 审查修正）

> 遵循 [[backend-deepseek-review-each-cycle]]：仅修**亲验的真实 bug**，改动纯新增/最小化，每处配 Mockito 守卫单测。JDK11 + 系统 `mvn` 编译。

### 6.1 新增 5 个删除端点（POST `@RequestParam id`，下沉 service + `@Transactional`）
- **用户/角色/字典/部门**：软删（`UPDATE set is_deleted='1'`，用 `UpdateWrapper` 或 service 方法）。
  - **配套列表过滤**：角色 page **已过滤** `is_deleted='0'`（无需改）；用户/字典/部门 page 查询**逐个核实**，若未排除 `is_deleted='1'` 则补最小过滤（`.ne("is_deleted","1")`），否则软删=假删。
- **菜单**：物理删（无软删列），但 **① 守卫**：有子菜单则拒绝（抛 `RuntimeException("请先删除子菜单")`）；**② 清理** `sp_sys_role_menu` 中该 menuId 的关联，避免悬挂授权。`@Transactional`。

### 6.2 审查修正 `add-or-update`（仅触及端点，亲验后改）
Explore 标记疑点，逐条验证真实代码后最小修正：
- 多表操作缺 `@Transactional`：用户+角色 rebuild、角色+菜单 rebuild。
- `saveOrUpdate` 空 id 走 insert 的正确性 + 返回 id 正确性。
- 编辑时密码加盐路径是否正确（编辑不应重复加盐已存密文）。
- 守卫单测覆盖上述。

### 6.3 字典菜单种子（新增 SQL，必要）
全 SQL **无字典菜单行** → 字典页侧栏点不到。新增幂等种子 `scripts/sql/dict-menu-seed.sql`：
```sql
-- 字典管理菜单（系统管理组 id=10 下）
INSERT INTO sp_sys_menu (id,code,name,url,parent_id,grade,sort_num,type,permission,icon,...)
VALUES ('105','dict','字典管理','/admin/sys/dict/list-ui','10','3',5,'0','dict:add','book',...)
ON DUPLICATE KEY UPDATE ...;   -- 幂等，需用户手动执行
```
（实现时对齐种子既有列序/字段；用户需手动跑该 SQL 菜单才出现。）

---

## 7. 字典两级主从 + `MasterDetailLayout`

### 7.1 `MasterDetailLayout.vue`（新增通用组件）
左主右从两栏（`props: title/selected`；slots：`master`/`detail`/`detail-empty`）。纯布局、props/$emit 驱动、零业务耦合。后续 BOM 树/库存等子周期高频复用。

### 7.2 `DictList` 形态
- **左(主)**：字典**类型**列表（`parentId='0'` 的记录）——`DataTable` 或紧凑列表，搜索 name，增删改类型（`DictTypeForm`）。
- **右(从)**：选中类型 → 该类型的**字典项**（`parentId=类型id`）——`DataTable`，增删改项（`DictItemForm`：name/value/sortNum/descr，parentId=当前类型id、type 继承）。
- 未选类型 → `detail-empty` 占位。
- `partitionDict` 纯函数（从分页结果分出类型/项，或分别查询）+ TDD；实现首步核实真实数据的类型行判定。

---

## 8. 树表 `TreeTable.vue`（新增通用组件）
- `el-table` + `row-key` + `:tree-props="{children:'children'}"` + `default-expand-all`（或受控展开）。
- `props: data(树形)/columns/loading`；slots：`col-{prop}`/`actions`/`toolbar`（对齐 `DataTable` 插槽约定）。
- **不分页**（树为全量）；菜单/部门复用。
- `buildTree(flatList, {id,parentId,rootId:'0'})` 纯函数 + TDD（部门客户端建树；菜单已有 `/tree` 端点可直接用，部门用此函数）。

---

## 9. 测试与质量门禁

### 9.1 前端单测（Vitest，纯逻辑 TDD）
`buildTree`、`collectCheckedMenuIds`（勾选+半选合并、去重）、`stripPasswordIfEmpty`、`partitionDict`、`excludeSelfSubtree`、`urlMap.toSpaRoute`、`toFormUrlEncoded`（数组重复键）。组件渲染不做单测（沿用 vue3 约定；纯逻辑下沉到 `utils/systemTree.ts` 便于测）。

### 9.2 后端单测（Mockito 守卫，JDK11）
5 个删除端点（软删 set='1'、菜单子守卫拒绝 + role_menu 清理、关联）+ add-or-update 事务修正守卫。

### 9.3 质量门禁（全绿才算完成）
- 前端：`pnpm typecheck`（0 错）/ `pnpm test`（全绿）/ `pnpm build`（成功）。
- 后端：`mvn compile` + 定向测试 BUILD SUCCESS。
- dev 冒烟：`admin/123` 登录 → 侧栏五项可点 → 五页加载 → 每页 CRUD 往返 + 角色权限树勾选保存 + 字典两级 + 树表展开。

### 9.4 Git
`feature/system` ← `develop`；按页面/功能增量 emoji conventional 提交（中文）；收尾 `--no-ff` 合 `develop`。

---

## 10. 风险与缓解
| # | 风险 | 缓解 |
|---|---|---|
| 1 | 数组参数 `sysMenuIds`/`sysRoleIds` 编码 | §5.1 请求层加固 + 实现首步端到端验证 |
| 2 | 菜单树投影缺 sortNum/descr | 编辑时 `menuGetById` 补全 |
| 3 | 软删后列表仍显示（假删） | §6.1 逐模块核实/补 page 过滤（角色已过滤） |
| 4 | 软删 page 过滤影响老应用/mes-new | 属正确化（删行不该显示），已知会 |
| 5 | 树选择器自身/后代环路 | `excludeSelfSubtree` + TDD |
| 6 | 字典两级父/类型联结判定 | 实现首步用真实数据核实 |
| 7 | 部门全量客户端建树性能 | 作业数据量可接受；记 backlog |
| 8 | dev 后端需手动跑字典菜单种子 | spec/交付说明标注 |

---

## 11. 决策记录（用户拍板）
1. **Cycle 1 分解** 为子周期 1a~1h，从 **1a 系统管理** 起步。
2. **1a 粒度**：5 页合为一个子周期。
3. **后端范围**：最小补齐(5 删除端点) + 审查修正 add-or-update bug。
4. **实现架构**：方案 A（组合复用 + 渐进特化）。
5. **字典形态**：两级主从（+ `MasterDetailLayout`）。
6. **路由机制**：urlMap 翻译 → 干净 SPA 路由。
7. **删除语义**：用户/角色/字典/部门软删 + 列表过滤；菜单物理删 + 子守卫 + role_menu 清理。

---

## 12. 验收标准（Definition of Done）
- [ ] 5 页 CRUD 全部可用（增/删/改/查/分页/搜索），UI 为 Element Plus 深度主题、非抄 mes-new。
- [ ] 角色权限树勾选→保存→重开回填一致；字典两级主从增删改；菜单/部门树表展开 + 树选择器。
- [ ] 后端 5 删除端点 + add-or-update 修正,Mockito 守卫单测绿;字典菜单种子幂等可跑。
- [ ] 请求层数组编码加固；urlMap 接入,侧栏五项跳干净路由可达。
- [ ] 前端 typecheck/test/build 全绿;后端 compile + 测试绿;dev 冒烟全过。
- [ ] `v-permission` 在新增按钮演示;`meta.perm` 路由守卫生效。
- [ ] 增量 emoji 提交,`--no-ff` 合 `develop`;ROADMAP §9.1 状态更新为 ✅。

## 13. 不在本子周期范围（Out of Scope）
- 班组管理（C2）、基础数据/物料（1b）、其余亮点（1e-1g）。
- 按钮级细粒度权限种子扩充（backlog）。
- 部门专用后端 tree 端点、字典专用 `list/{type}` 端点（YAGNI，前端已可应对）。
- 用户扩展字段（email/mobile/sex…)的完整表单（按需精简；核心字段优先）。
