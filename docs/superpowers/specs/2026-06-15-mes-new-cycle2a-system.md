# MES-New 周期2a 设计文档:系统管理(角色/菜单/字典/部门)

- 日期:2026-06-15
- 目标目录:`mes/frontend/apps/mes-new`
- 状态:已通过 brainstorming 评审,待进入实现计划
- 上游设计:`docs/superpowers/specs/2026-06-15-mes-new-frontend-design.md`(总体设计,周期1 已交付)

## 1. 背景与范围裁剪

总体设计第 6 节将"周期 2"定义为:系统管理其余 + 基础数据 + 工艺。经盘点 mes1(`apps/mes1`),该范围实际约 **17+ 页面**,过半含特殊交互(树表、穿梭框、动态表配置、主从、版本化树编辑)。一个实现计划无法可靠覆盖。

**决策(已与用户确认):周期 2 拆分交付,本批次(周期 2a)只做系统管理 4 页:角色 / 菜单 / 字典 / 部门。**

- 周期 2b:基础数据(物料 / 动态表配置 / 动态表数据 / 设备 / 设备组 / 工艺单元 / 工序 / 仓库 / 元器件)。
- 周期 2c:工艺(物料BOM / 工艺路线 / 工艺工序穿梭 / 产品BOM 树形编辑+版本化 / BOM-Flow 绑定)。

选择系统管理先行的理由:它紧接周期 1 的"用户管理"标杆页,且会沉淀两个后续所有模块都要复用的基础能力(树表、勾选树),投入产出最高。

## 2. 后端契约(沿用总体设计,具体端点写计划时回源码核对)

沿用总体设计第 1 节约定:`Result{code,data,msg}`(`code===0` 取 data);分页 `current`+`size` → `{records,total,size,current,pages}`;401 跳登录;开发期 Vite 代理 `/api → :9090`。

**本期涉及端点(以下为 mes1 盘点所得,标注"待核对" —— 写计划时回 `apps/mes1/src/api/` 与后端 Controller 双向核对,严禁臆断字段名/方法/编码):**

| 模块 | 端点 | 方法/编码 | 说明 |
|---|---|---|---|
| 字典 | `/admin/sys/dict/page` | POST form | 分页,`{current,size,nameLike?}` |
| 字典 | `/admin/sys/dict/get-by-id` | GET | `?id=` |
| 字典 | `/admin/sys/dict/add-or-update` | POST form(待核对) | `{id?,name,value,type,descr,sortNum,parentId?}` |
| 字典 | `/admin/sys/dict/delete` | POST form | `{id}` |
| 部门 | `/admin/sys/department/page` | POST form | 分页(返回扁平),`{current,size,nameLike?}` |
| 部门 | `/admin/sys/department/get-by-id` | GET | `?id=` |
| 部门 | `/admin/sys/department/add-or-update` | POST form(待核对) | `{id?,parentId,name,sortNum}` |
| 部门 | `/admin/sys/department/delete` | POST form | `{id}` |
| 菜单 | `/admin/sys/menu/tree` | GET | 返回嵌套 `TreeVO<SysMenu>`(无分页) |
| 菜单 | `/admin/sys/menu/get-by-id` | GET | `?id=` |
| 菜单 | `/admin/sys/menu/add-or-update` | POST form(待核对) | `{id?,code,name,url,parentId,grade,sortNum,type,permission,icon,descr}` |
| 菜单 | `/admin/sys/menu/delete` | POST form | `{id}` |
| 角色 | `/admin/sys/role/page` | POST form | 分页,`{current,size,nameLike?}` |
| 角色 | `/admin/sys/role/get-by-id` | GET | `?id=` |
| 角色 | `/admin/sys/role/add-or-update` | POST **JSON(高度存疑,必须核对)** | mes1 盘点称此端点为 `@RequestBody` JSON,字段 `{id?,name,code,descr,isSystem?,sysMenuIds?[]}`。若属实,是除 `manager/add-or-update`、`flow/process/add-or-update` 外的**第三个** JSON 端点,API 函数须显式设 `Content-Type: application/json`。 |
| 角色 | `/admin/sys/role/delete` | POST form(待核对) | `{id}` |
| 角色 | `/admin/sys/role/tree/{roleId}` | GET | 返回该角色已授权菜单 id 列表 `string[]`(待核对返回形态) |

> **核对纪律**:上表每一行的"方法/编码/字段"在 Task 写到对应 API 函数时,必须先 `Read` mes1 源码确认;`add-or-update` 类端点尤其要确认是 form 还是 JSON(决定是否走表单拦截器或显式 json 头)。

## 3. @workspace/ui 可复用新增(改在设计系统,符合总体设计 3.3)

### 3.1 扩展 `data-table` 支持树表

`data-table.tsx` 当前无展开能力(无 `getExpandedRowModel`/`getSubRows`)。本期接入 TanStack Table 原生展开模型:

- 新增可选 props:`getSubRows?: (row) => T[] | undefined`、`getRowCanExpand?`、默认全展开选项。
- 在首列(或指定列)渲染展开/折叠控件 + 按 `row.depth` 缩进。
- **零破坏**:不传 `getSubRows` 时退化为平表,周期 1 的 `UserList` 不受影响。
- 菜单、部门复用;周期 2c 产品BOM 也将复用。

### 3.2 新建 `TreeView`(勾选树)

shadcn 无树组件。新建递归 `TreeView`,基于 `checkbox` + `collapsible`:

- props:`nodes`(嵌套,含 `id/label/children`)、`checkedIds: Set<string>`、`onCheckedChange`、`defaultExpandAll?`。
- 支持父子级联勾选与 `indeterminate` 半选态(shadcn `checkbox` 支持 indeterminate)。
- 勾选状态计算抽成**纯函数**(便于单测):勾选/取消时的子孙联动、父级半选/全选推导、收集叶子或全部选中 id。
- 用于角色的菜单权限分配。

### 3.3 是否进 ui 包的判定

`data-table` 扩展、`TreeView` 属通用设计系统能力 → 放 `@workspace/ui`。`ParentSelect`(见 4.2)是 MES 业务取向的轻封装 → 放 mes-new `components/`。

## 4. mes-new 新增结构

```
apps/mes-new/src/
├── types/
│   └── system.ts            # SysRole / SysRoleDTO / SysDict / SysDepartment(SysMenu/TreeVO 已在 types/menu.ts)
├── api/system/
│   ├── role.ts              # rolePage/roleGetById/roleAddOrUpdate/roleDelete/roleMenuIds(tree)
│   ├── menu.ts              # menuTree/menuGetById/menuAddOrUpdate/menuDelete(系统菜单 CRUD)
│   ├── dict.ts              # dictPage/dictGetById/dictAddOrUpdate/dictDelete
│   └── dept.ts              # deptPage/deptGetById/deptAddOrUpdate/deptDelete
├── pages/system/
│   ├── role/   RoleList.tsx  RoleForm.tsx  RolePermissionPanel.tsx
│   ├── menu/   MenuList.tsx  MenuForm.tsx
│   ├── dict/   DictList.tsx  DictForm.tsx
│   └── dept/   DeptList.tsx  DeptForm.tsx
├── components/
│   └── ParentSelect.tsx     # 树扁平化为带缩进 label 的下拉(菜单/部门选父级)
└── utils/
    └── tree.ts              # buildTree(扁平→树)/flattenTreeForSelect/树勾选级联纯函数
```

> 命名辨析:`api/system/menu.ts`(系统管理的菜单 CRUD)与已有 `api/menu.ts`(导航用菜单树)是两组不同用途的端点,不要混用。

## 5. 逐页设计

### 5.1 字典 Dict —— 标准 CRUD(标杆复刻)

- List:`SearchForm`(按 name)+ `PageTable`(服务端分页)+ 新建/编辑/删除,完全套用 `UserList` 范式。
- Form:`name` / `value` / `type` / `sortNum` / `descr`,react-hook-form + zod,`ModalForm` 包装。
- 删除走 `AlertDialog` 二次确认。
- 本期按"扁平字典"处理(`parentId` 暂不做层级 UI);若源码显示强依赖父子分组,记入计划再评估。

### 5.2 部门 Dept —— 树表

- 数据:后端返回扁平分页 list → 客户端 `buildTree(list, parentId)` 成树 → 喂给扩展后的 `data-table`(`getSubRows`)。
- 搜索:客户端按 name 过滤(保留命中节点的祖先链)。
- Form:父级(`ParentSelect`)/ `name` / `sortNum`。新建时可预置父级。
- 列:名称(带缩进展开)/ 排序号 / 操作。

### 5.3 菜单 Menu —— 树表

- 数据:`/admin/sys/menu/tree` 直接返回嵌套 → `data-table` 展开渲染。
- 列:名称(缩进)/ 类型(目录/菜单/按钮)/ 权限串 permission / 排序号 / 操作。
- Form:`code` / `name` / `url` / 父级(`ParentSelect`)/ `type`(select:0 目录 /1 菜单 /2 按钮)/ `sortNum` / `permission` / `icon` / `descr`。
- icon:本期用**文本输入**兜底(沿用 `utils/iconMap` 渲染预览即可);图标选择器留待后续。

### 5.4 角色 Role —— CRUD + 菜单权限分配

- List:`SearchForm`(按 name)+ `PageTable` + 新建/编辑/删除(标准范式)。
- Form 基本信息:`name` / `code` / `descr` / `isSystem`。
- 权限分配 `RolePermissionPanel`:在编辑弹窗内嵌或独立弹窗,加载菜单树 + `/role/tree/{roleId}` 已授权 id 回填 `TreeView`;保存时把勾选 id 集合作为 `sysMenuIds` 随 `add-or-update` 提交。
- **编码注意**:若核对确认 `role/add-or-update` 是 JSON 端点,该 API 函数显式设 json 头(参照总体设计两个 JSON 例外端点的写法),不走表单拦截器。

## 6. 测试策略

### 6.1 纯函数 TDD(先 failing test → 实现 → green)

- `utils/tree.ts`:`buildTree`(扁平含 parentId → 嵌套;含孤儿/多根/乱序用例)、`flattenTreeForSelect`(缩进 label + 防自环)、部门客户端搜索的祖先链保留。
- `TreeView` 勾选纯函数:勾选父→全选子孙;取消父→清子孙;子全选→父选中;子部分→父半选(indeterminate);收集选中 id。

### 6.2 静态门禁(贴实际输出)

- `pnpm --filter mes-new exec tsc --noEmit` 通过。
- `pnpm --filter mes-new lint`(沿用周期 1 的 eslint 配置,exit 0)。
- `pnpm --filter mes-new build` 成功。
- ui 包改动后:确认 `apps/mes1` 不引用被改组件、或其行为不退化(`data-table` 扩展为零破坏增量)。

### 6.3 运行时验收(后端 :9090,账号 admin/123,贴实际结果)

- 字典:增 / 改 / 删 / 搜索分页跑通。
- 部门、菜单:树展开/折叠正常,增改删后树刷新正确。
- 角色:新建角色 → 分配菜单权限 → 保存 → 重新打开回填正确。
- D/B 主题一键切换下 4 页与新组件零异常。

## 7. 风险与对策

- **API 契约不确定**:上表多处标"待核对"。对策:每个 API 函数实现前先读 mes1 源码 + 后端 Controller;`add-or-update` 的 form/JSON 归属是关键分叉,核对后再定 API 函数写法。
- **`data-table` 扩展影响 mes1**:对策:纯增量可选 props,默认行为不变;改动后核对 mes1 无回归。
- **`TreeView` 级联状态易错**:对策:状态推导抽纯函数 + TDD 覆盖半选/级联边界。
- **部门客户端建树性能**:数据量小(部门),客户端建树可接受;若后端分页导致树不完整,改为一次性拉全量(size 放大)或后端树接口——写计划时按源码实际定。

## 8. 不在本期范围(YAGNI)

- 基础数据、工艺(归周期 2b / 2c)。
- 图标选择器(本期 icon 文本输入兜底)。
- 字典父子层级 UI(除非源码证明必要)。
- 不改后端;不改 mes1。
