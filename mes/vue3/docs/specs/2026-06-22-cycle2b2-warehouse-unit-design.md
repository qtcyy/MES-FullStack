# Cycle 2b-2 设计：仓库库位 / 加工单元（CRUD）

- 日期：2026-06-22
- 分支：`feature/basedata-warehouse-unit`（从 `develop` 切）
- 所属：Cycle 2（库存 + 剩余基础数据 + 组织）·子周期 2b 第 2 支（Cycle 2 基础数据收尾）
- 功能/接口参考：`mes/frontend/apps/mes-new`（`pages/basedata/{warehouse,process-unit}`，**仅参考功能/契约，绝不照抄 UI**）

## 1. 背景与范围

Cycle 2b「剩余基础数据」拆两支推进：

- 2b-1（已完成）= 设备 + 零部件 + 设备编组（沉淀 `DualListTransfer`）
- **2b-2（本设计）= 仓库（库位）+ 加工单元（仅 CRUD）**

本支交付**两页一分支**：

1. **仓库管理**（`/basedata/warehouse`）—— 主从布局（左仓库 CRUD + 右只读库位面板）。
2. **加工单元管理**（`/basedata/process-unit`）—— 标准 CRUD。

**范围裁剪（已确认）**：加工单元的「班组关联面板」（`teams/*` 端点）依赖班组数据（`sp_team` 排在 2c），故本期**只做加工单元基础 CRUD**，teams 面板留 2c。

至此 Cycle 2 基础数据（设备/零部件/编组/仓库/加工单元）全部落地，仅余 2c 组织·班组。

## 2. 后端契约（已勘探）

两控制器均已存在。端点形态与编码：

| 模块 | 端点 | 编码 | 形态 |
|---|---|---|---|
| 仓库 `SpWarehouseController` `/basedata/warehouse` | `page` / `list` GET / `{id}` GET / `locations/{warehouseId}` GET / `add-or-update`(@RequestBody) / `delete`(@RequestBody) | page 走 **form**；add-or-update、delete 走 **JSON**（`http.post(url,dto,true)`）；list/getById/locations 走 GET | 主从（仓库 → 只读库位） |
| 加工单元 `SpProcessUnitController` `/basedata/process-unit` | `page` / `{id}` GET / `add-or-update`(@RequestBody) / `delete`(@RequestBody) / `list-ui` forward / `teams/*`（**本期不接**） | page 走 **form**；add-or-update、delete 走 **JSON** | 标准 CRUD |

> 编码判定依据：`@RequestBody` → 前端 `http.post(url, data, true)`（JSON）；无 `@RequestBody` → 默认 form 编码。两模块的 add-or-update/delete 均带 `@RequestBody`，故走 JSON。

### 2.1 仓库实体字段（`sp_warehouse`）

`code` / `name` / `type`（自由文本）/ `groups` / `rows` / `layers` / `columns`（Integer 维度）/ `descr` / `is_deleted`。
保存时后端按 `groups × rows × layers × columns` 生成库位（`sp_warehouse_location`：`code`=`组-排层列`如 `1-010101`、`groupNo/rowNo/layerNo/colNo`），库位**只读**（由规格派生，UI 不直接增删）。

### 2.2 加工单元实体字段（`sp_process_unit`）

`code` / `name` / `type`（自由文本）/ `hasLineWarehouse`（'1'/'0' 是否有线边库）/ `descr` / `is_deleted`。

## 3. 后端改动（按 [[backend-deepseek-review-each-cycle]] 每周期必审）

### 3.1 仓库库位重生成隐患修正（1 处真修正）

**现状 bug**：`SpWarehouseController.addOrUpdate` **无条件** `remove`(按 warehouse_id 清空) + 全量重建库位 —— 即便只改库房名称也会重建全部库位、**库位 id 全部变化**，而 2a 库存 `sp_inventory.location_id` 引用的是库位 id → 编辑仓库后既有库存记录指向的库位 id 失效（孤儿引用）。

**修正**：
- `addOrUpdate` 内先 `getById(record.getId())` 取旧维度（新建时为 null）；
- 抽 `dimensionsChanged(old, record)`：旧记录为空（新建）或 `groups/rows/layers/columns` 任一不等 → 需重建；
- **仅当需重建时**才调 `regenerateLocations`；维度未变（仅改 name/type/descr）则**跳过**，保留既有库位 id 与库存引用。
- 保持 `@Transactional`。

**守卫单测**（Mockito，JUnit4，对齐同包 `Cycle2b1BackendTest` / AssertJ 风格）：
1. 新建仓库 → 生成库位（regenerate 调用 1 次）；
2. 编辑仅改 name（维度不变）→ **不**重建库位（regenerate 不调用）；
3. 编辑改维度（如 columns 2→3）→ 重建库位（regenerate 调用 1 次）。

### 3.2 仓库 `list-ui` forward 补齐

`SpWarehouseController` 缺 `GET /basedata/warehouse/list-ui`（process-unit 已有）。补 `@GetMapping("/list-ui") public String listUI(){ return "forward:/index.html"; }`，保硬刷新 / 直接访问 SPA 路由 parity。

### 3.3 加工单元后端：零改动

实连 dev DB 复核 `page` 过滤 `is_deleted != '1'`、`delete` 走 `setDeleted("1")+updateById` 软删，确认正确即零改动（按 2b-1 审查约定）。

> 其余仓库端点（page 软删过滤 + 排序、delete 软删、locations 软删过滤 + 排序）勘探已正确，零改动。

## 4. 前端实现

### 4.1 目录与文件

```
mes/vue3/src/
├── api/basedata/
│   ├── warehouse.ts        # 扩展：补 page / getById / addOrUpdate / delete（已有 list / locations）
│   └── processUnit.ts      # 新增：page / getById / addOrUpdate / delete
├── types/
│   ├── warehouse.ts        # 已有 SpWarehouse / SpWarehouseLocation；补 WarehousePageReq
│   └── processUnit.ts      # 新增：SpProcessUnit / ProcessUnitPageReq
├── utils/
│   ├── warehouse.ts        # 新增纯函数（TDD）
│   └── processUnit.ts      # 新增纯函数（TDD）
├── views/basedata/
│   ├── warehouse/
│   │   ├── WarehousePage.vue        # 主从壳（列表 + 选中 → 库位面板）
│   │   ├── WarehouseFormDialog.vue  # 新增/编辑弹窗（维度改动警示）
│   │   └── WarehouseLocations.vue    # 只读库位面板（网格徽标 + 表格 + 空态）
│   └── process-unit/
│       ├── ProcessUnitList.vue       # 列表 CRUD
│       └── ProcessUnitFormDialog.vue # 新增/编辑弹窗（hasLineWarehouse 开关）
├── router/index.ts          # +2 懒加载路由
└── utils/urlMap.ts          # +2 list-ui → SPA 映射
```

> 复用既有通用原语：`MasterDetailLayout` / `DataTable` / `SearchForm` / `FormDialog`（或项目既定弹窗封装）。库位面板是只读表格，直接写，无需新通用组件。

### 4.2 纯函数（`utils/warehouse.ts`，TDD）

- `buildWarehousePayload(form, record?)` → 仅提交实体字段 + `id` + `deleted`（避免回传时间戳/无关字段），`groups/rows/layers/columns` 强制 Number。
- `validateWarehouse(form)` → code/name 必填；四维度均为整数且 ≥1；返回错误 map。
- `locationGridSummary(w)` → `{ total, label }`，label 形如「2组 × 3排 × 2层 × 4列 = 48」。
- `dimensionsChanged(oldW, newForm)` → boolean，四维度任一不同（与后端守卫语义**对称**）；新建（无 oldW）视为 true。前端编辑弹窗据此决定是否显示「修改维度将重建全部库位」警示。

### 4.3 纯函数（`utils/processUnit.ts`，TDD）

- `buildProcessUnitPayload(form, record?)` → `hasLineWarehouse` bool → '1'/'0'，提交实体字段 + id + deleted。
- `validateProcessUnit(form)` → code/name 必填；返回错误 map。

### 4.4 关键交互

- **仓库主从**：左 `DataTable` 仓库列（编码/名称/类型/规格 `g×r×l×c`/操作）+ 搜索（code/name）+ 分页；点选行 → 右 `WarehouseLocations` 按 `warehouseId` 拉 `locations`（`:key="选中id"` 强制按仓库重挂，隔离并发加载）；未选 → 右空态。
- **仓库表单**：基本信息（code/name/type/descr）+ 库位规格（组/排/层/列，number，min 1）；**编辑态**且维度字段被改动时，弹窗内显式提示「保存将重建全部库位（既有库位编码/引用会重置）」（基于 `dimensionsChanged`）。删除走 `AlertDialog` 二次确认 + 软删；删除选中项时清空右面板选中。
- **加工单元**：列表（编码/名称/类型/有无线边库/操作）+ 搜索 + 分页 + 新增/编辑弹窗（含 `hasLineWarehouse` 开关）+ 软删二次确认。

## 5. 菜单种子 / 路由 / urlMap

### 5.1 菜单种子

主 schema **无** `/basedata/warehouse/list-ui` 与 `/basedata/process-unit/list-ui` 菜单（`warehouse:add` 仅被 3D 仿真菜单 171 占用）。

新增 `scripts/sql/warehouse-unit-menu-seed.sql`（**需手动跑**，幂等 + `id`/`url`/`name` 三守卫，沿用 2b-1 经验）：

- 仓库管理：`url=/basedata/warehouse/list-ui`，`permission=warehouse:add`，挂物料管理组 `13`。
- 加工单元管理：`url=/basedata/process-unit/list-ui`，`permission=process-unit:add`，挂组 `13`。

> **实现时先实测 mes_data**（如 2b-1 发现 108/111「已存在但错挂」那样）：若菜单已存在则改用 RE-PARENT/不动；若 `url`/`name` 已被占用则避免 INSERT 碰撞 `UNIQUE(name)/UNIQUE(url)`。permission 字符串以实测菜单为准（与 router `meta.perm` 对齐）。

### 5.2 urlMap（+2）

```
'/basedata/warehouse/list-ui': '/basedata/warehouse',
'/basedata/process-unit/list-ui': '/basedata/process-unit',
```

### 5.3 router（+2，懒加载）

- `/basedata/warehouse` → `views/basedata/warehouse/WarehousePage.vue`，`meta.perm='warehouse:add'`
- `/basedata/process-unit` → `views/basedata/process-unit/ProcessUnitList.vue`，`meta.perm='process-unit:add'`

（perm 实现时与实测菜单 permission 核对一致。）

## 6. 质量门禁

- 前端：`typecheck` 0 / `test` 全绿（+~12 例：warehouse ~7 + processUnit ~5）/ `lint` 0 err / `build` ✓。
- 后端：`mvn compile` BUILD SUCCESS（JDK11）+ 仓库守卫单测 3 绿。
- subagent 驱动逐任务两阶段审查（实现 + spec 对齐 + 质量）；opus 整体终审「Ready to merge」。
- 提交：Conventional Commits（中文），按页面/功能增量提交。

## 7. 验收（人工 :4200 冒烟，待后续确认）

需后端 9090 + DB 跑库表脚本（`sp_warehouse`/`sp_warehouse_location`/`sp_process_unit` 建表，确认演示数据脚本路径）+ `warehouse-unit-menu-seed.sql`（菜单），`admin/123` 登录 → 物料管理：

- 仓库管理：新建（填规格 → 保存 → 右面板出现自动生成库位网格）→ 仅改名（库位不变、id 不变）→ 改维度（弹重建警示 → 保存 → 库位重生成）→ 软删（右面板清空）。
- 加工单元：新建/编辑（含有无线边库开关）/ 软删。

## 8. backlog（非阻塞）

- ① 库位重生成仍是「删后插」批量，未做增量 diff（维度变化时全量重建可接受，demo 规模无碍；与 2a 库存引用的强一致仍依赖「维度不变即不重建」守卫）。
- ② 加工单元 teams 班组关联面板留 2c（依赖 `sp_team`）。
- ③ warehouse/process-unit 的 `type` 为自由文本，未字典化（对齐 mes-new；可后续接 `useDict`）。
- ④ `pageWarehouse`/`pageProcessUnit` 分页正常，无 1f/2a 那种「大 size 兜底全量」隐患。
