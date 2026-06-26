# Cycle 3b — 动态主数据(Dynamic Master Data)设计

> 分支 `feature/dynamic-master-data`(从 `develop` 切)。vue3 课程作业前端(`mes/vue3`,端口 4200)。
> 参考 mes-new 周期 2j(Layer1)/ 2j-2(Layer2),**功能/接口参考,绝不照抄其 UI**。

## 1. 目标与范围

一支分支交付**两页**,**零后端生产代码改动**:

- **Layer1 动态表配置** `/basedata/manager`(菜单 105「基础数据配置平台」)——
  登记/维护 `sp_table_manager` 表头 + `sp_table_manager_item` 字段明细。**列表 + 编辑大弹窗**形态。
- **Layer2 动态数据维护** `/basedata/manager-item`(菜单 106「基础数据维护」)——
  对任一已登记表做通用动态数据 CRUD,经已加固的 `/basedata/common/*`。**主从单页**(`MasterDetailLayout`)。

后端 Layer1 `saveOrUpdateWithItems`(事务 + 删旧重插 + 返回 id)与 Layer2 三层注入加固(表名白名单 / 列名正则 / 值 `#{}` 参数化 / `is_deleted` 缺省)均已在共享后端就位(mes-new 2j/2j-2 完成并 curl 验证)。本周期**默认零后端改动**,按 [[backend-deepseek-review-each-cycle]] 仍独立审查确认在位。

非目标(YAGNI):字段类型感知(全文本框)、软删过滤(通用表不保证有 is_deleted 列)、Layer2 友好 JSON 异常(后端全局 HTML 500,前端 `enabled` 守卫只传合法表故正常路径不触发)。

## 2. 数据流与契约

### Layer1 端点(4)

| 端点 | 方法 | URL | 编码 | 入参 | 返回 |
|---|---|---|---|---|---|
| 列表分页 | POST | `/basedata/manager/page` | **form** | `{tableName?, tableDesc?, current, size}` | `IPage<SpTableManager>` |
| 字段明细 | POST | `/basedata/manager/item/by/tableNameId` | **form** | `@RequestParam tableNameId` | `SpTableManagerItem[]`(按 sortNum 升序) |
| 整体保存 | POST | `/basedata/manager/add-or-update` | **JSON** | `SpTableManagerDto`(表头 + `spTableManagerItems[]`) | 表头 id(String) |
| 级联删除 | POST | `/basedata/manager/delete/by/tableNameId` | **form** | `{id}` | null |

`SpTableManagerDto` = `SpTableManager{id?, tableName, tableDesc, permission?, isDeleted}` + `spTableManagerItems: SpTableManagerItem[]`。
`SpTableManagerItem{id?, tableNameId, field, fieldDesc, sortNum, mustFill}`。

### Layer2 端点(3,对接已加固 `/basedata/common/*`)

| 端点 | 方法 | URL | 编码 | 入参 | 返回 |
|---|---|---|---|---|---|
| 数据分页 | POST | `/basedata/common/page` | **form** | `{tableName, tableNameId, current, size}` | `IPage<Map<String,String>>` |
| 新增/编辑 | POST | `/basedata/common/add-or-update` | **form 平铺** | `{jsTableName, jsTableNameId, id?, [动态字段值...]}` | null |
| 删除 | POST | `/basedata/common/delete` | **form** | `{tableName, id}` | null |

后端写入路径:`assertTableWhitelisted(tableName, tableNameId)`(校验表已登记且 `is_deleted='0'`,返回 DB 登记表名)→ 按字段明细逐列 `assertSafeColumn`(正则 `^[A-Za-z0-9_]+$`)→ 值 `#{}` 参数化插入 / 更新;新增自动补 id/审计列 + `is_deleted` 缺省 '0'。

### 关键契约坑(已知)

1. **`mustFill` 编码**:读容忍 `Y/y/1`=必填,写回统一 `"1"/"0"`(`parseMustFill` 自愈)。
2. **编辑剥离 item id**:Layer1 保存时明细一律 `id=null`(后端删旧重插)。
3. **Layer2 form 平铺**:`add-or-update` 不带 JSON header,字段名 = 用户配置的物理列名;`jsTableName`/`jsTableNameId` 是固定键。
4. **编码区分**:Layer1 `page`/`item/by/tableNameId`/`delete` 走 form,`add-or-update` 走 JSON(`http.post(url, dto, true)`);Layer2 三端点全 form。

## 3. 架构与沉淀

### 类型 / API
- `types/manager.ts` — `SpTableManager` / `SpTableManagerItem` / `SpTableManagerDto` / `QueryTableNameDataReq` / `ManagerDataRow`(`Record<string,string>`)。
- `api/basedata/manager.ts` — Layer1 4 端点(`managerPage` / `managerItemsByTableNameId` / `managerAddOrUpdate`[JSON] / `managerDelete`)。
- `api/basedata/managerData.ts` — Layer2 3 端点(`managerDataPage` / `managerDataAddOrUpdate` / `managerDataDelete`,全 form)。

### 纯函数(TDD)
- `utils/manager.ts`(Layer1):
  - `parseMustFill(raw): boolean` — Y/y/1 → true。
  - `validateManagerForm(header, rows): string|null` — 表名必填、≥1 字段、字段名不重复、字段名非空。
  - `buildUpsertPayload(header, rows, existingId?): SpTableManagerDto` — mustFill→"1"/"0"、按行序生成 sortNum(从 1)、剥 item id、挂 tableNameId(编辑时)。
  - `moveRow(rows, index, dir): rows` — 行上/下移(纯函数,越界返回原数组)。
- `utils/managerData.ts`(Layer2):
  - `buildColumns(items): {field, label}[]` — 字段明细 → 表格列定义(按 sortNum)。
  - `emptyRow(items): Record<string,string>` — 新建初值(各字段空串)。
  - `validateRow(items, values): string|null` — 必填(mustFill)校验。
  - `buildDataPayload(items, values, tableName, tableNameId, id?): Record<string,string>` — 平铺 form body(仅白名单字段 + jsTableName/jsTableNameId/id?)。

### 视图组件
- Layer1:`views/basedata/manager/ManagerList.vue`(列表 + 搜索 + 增删改触发)+ `ManagerForm.vue`(大弹窗:表头 + 明细行编辑,增删行 + moveRow 排序)。
- Layer2:`views/basedata/manager-item/ManagerDataPage.vue`(`MasterDetailLayout`:左表选择 + 右动态数据表)+ `ManagerDataForm.vue`(动态行弹窗,字段来自所选表元数据)。

动态行表单字段名来自用户配置 → **`el-form` + `reactive` 直接用字段名作 prop**(Vue 无 React RHF 的 DOM clobbering 坑,[[rhf-field-name-dom-clobbering]] 仅 React 适用,1c-2 已确认)。

## 4. 菜单 / urlMap / 路由

- 菜单 105`/basedata/manager/list-ui`(perm `manager:add`)、106`/basedata/manager/item/list-ui`(perm `manager:add`)在 `MySQL-20210225.sql` 预置;vue3 dev DB(`mes_data`)从 `MySQL-init-all.sql` 初始化 → **plan/实现阶段核验 105/106 是否在 dev DB 实际存在,缺则补幂等 seed SQL**(沿用历史 menu-seed 做法,需手动跑)。
- urlMap +2:`/basedata/manager/list-ui`→`/basedata/manager`、`/basedata/manager/item/list-ui`→`/basedata/manager-item`。
- router +2:`basedata/manager`(name `basedata-manager`)、`basedata/manager-item`(name `basedata-manager-item`),route-level 懒加载。

## 5. 测试与门禁

- vitest node 纯函数:`tests/**/manager.spec.ts`(Layer1 ~12 例)+ `managerData.spec.ts`(Layer2 ~10 例)。组件不做渲染测(沿用既有约定)。
- 门禁:`cd mes/vue3 && pnpm typecheck && pnpm test && pnpm lint:check && pnpm build` 全绿。
- 后端按 [[backend-deepseek-review-each-cycle]] 独立审查:确认 Layer1 `saveOrUpdateWithItems` 事务/删旧重插/返回 id 在位,Layer2 三层加固在位;预期零改动。

## 6. backlog(非阻塞)

- `ValidationResult` 等类型若与既有 utils 重复,可提 `@/types`(不强求)。
- 字段类型感知 = 全文本框(YAGNI)。
- 软删过滤不做(通用动态表不保证有 is_deleted 列)。
- Layer2 后端异常返回 HTML 500 而非 JSON Result(全局风格,前端守卫规避正常路径触发;要友好 toast 需改全局异常处理,越界)。

见 [[vue3-homework-frontend]]、[[mes-rebuild-roadmap]]、[[vue3-env-gotchas]]。
