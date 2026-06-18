# 周期 2j-2 动态表数据维护(Layer 2) — 设计文档

- 日期: 2026-06-18
- 模块: 基础数据 / 动态表 Layer 2(动态数据维护)
- 前端 app: `apps/mes-new`(shadcn/Radix + 自研 `useQuery$`/`useMutation$`,**非** mes1/Ant Design)
- 菜单: id=106「基础数据维护」,url=`/basedata/manager/item/list-ui`,permission=`manager:add`

## 1. 背景与目标

动态表 Layer 1(菜单 105「基础数据配置平台」,周期 2j 已完成)负责登记"哪张物理表、显示哪些列、列说明、是否必填、排序"。**Layer 2(本周期,菜单 106)对这些已配置表的物理数据行做完整 CRUD**——这是"基础数据维护"的本义。

mes1 旧前端仅实现了只读分页"查看数据"(阉割版),且配置侧把 `mustFill`(Y/N) 错做成布尔 `required`,契约不可照抄。后端 `basedata/common/*` 端点已存在但存在**严重 SQL 注入**等缺陷,按项目约定"每周期必须审查+修正涉及的后端",本周期一并加固。

**目标**: 在 `apps/mes-new` 交付一个可用、安全的动态表数据维护页(主从单页,完整 CRUD),并彻底消除后端动态 SQL 的注入面。

## 2. 现状摸底(探索发现 — 精确契约)

### 2.1 后端端点契约

**数据行 CRUD(`TableNameDataController` @RequestMapping `basedata/common`,均 `@ResponseBody Result`)**:

- `POST /basedata/common/page` — 分页查动态数据。入参 `QueryTableNameDataReq{tableName, tableNameId, col?, current, size}`(**form 编码**, `extends BasePageReq`=`Page`)。Controller 强校验: `tableName` 或 `tableNameId` 为空 → 抛"未选中表信息"。出参 `Result{data: IPage<Map<String,String>>}`,每行是 `列名→值` 的 Map(含 `id` 列)。列集合 = `id` + `buildCol(tableNameId)` 拼出的配置字段。
- `POST /basedata/common/add-or-update` — 新增/修改。**form 编码**,Controller 读原生 `HttpServletRequest`: `request.getParameter("id")` 非空 → `commonUpdate`,否则 → `commonSave`。必传: `jsTableName`、`jsTableNameId`、`id`(修改时)、以及每个动态字段(参数名 = `sp_table_manager_item.field` 列名值)。新增时后端自动补 `id`(雪花)+ `create/update_username`+`create/update_time`(SYSDATE())。出参 `Result.success()`。
- `POST /basedata/common/delete` — 删除。入参 `CommonDto{tableName, id}`(**form**)。XML: `delete from ${tableName} where id=#{id}`(物理删除)。
- `GET /basedata/common/add-or-update-ui` — 旧 Freemarker 表单视图,**SPA 忽略**。

**字段元数据(渲染列头/表单用)**:
- `POST /basedata/manager/item/by/tableNameId` — 入参 `@RequestParam tableNameId`(form)。出参 `Result{data: List<SpTableManagerItem>}`,`SpTableManagerItem{id, tableNameId, field(物理列名), fieldDesc(中文表头), sortNum(Integer), mustFill(字符串)}`,**已按 sort_num 排序**。前端 mes-new 已封装 `managerItems(tableNameId)`。
  - ⚠️ 注意: `SpTableManagerItemMapper.xml` 的 resultMap 未映射 `sort_num`,该查询返回的 `sortNum` 字段**恒为 null**;列顺序只能依赖后端返回的列表顺序(已排好),不可读 `sortNum` 值。

**表头列表(选表用)**:
- `POST /basedata/manager/page` — 入参 `SpTableManagerReq{tableName?(模糊), tableDesc?(模糊), current, size}`(form)。出参 `Result{data: IPage<SpTableManager>}`,`SpTableManager{id, tableName, tableDesc, isDeleted('0'正常/'1'删/'2'禁用), permission, create/update*}`,按 `updateTime` 倒序。前端 mes-new 已封装 `managerPage(params)`。

### 2.2 后端缺陷(本周期须修正)

1. **SQL 注入(严重)**: `QueryTableNameDataMapper.xml` 全部用 `${tableName}/${col}/${values}` 字符串插值;`TableNameDataServiceImpl.commonSave/commonUpdate` 把 `request.getParameter(field)` 用单引号裸拼进 SQL(值未转义,含单引号即可逃逸)。仅 `where id=#{id}` 参数化。
2. **无白名单**: 后端从不校验前端传的 `tableName` 是否真存在于 `sp_table_manager`,也不校验列名是否属于该表配置的 `field` 集合。绕过前端直接打端点即可注入/写任意表任意列。
3. **`commonSave` 不写 `is_deleted`**: 只补 `id`/`create_*`/`update_*`。而 `sp_bom.is_deleted` 是 `NOT NULL` 无默认 → 新增数据行可能插入失败(潜在 bug)。
4. **类型粗糙**: 所有动态值一律当字符串单引号插入;缺失参数 `getParameter` 返回 null → 插成文本 `'null'`。
5. **物理删除**: `commonDelete` 物理 DELETE(非软删)。

### 2.3 前端复用基础(mes-new 已沉淀)

- HTTP 栈: `@ngify/http` + 自研 `useQuery$`/`useMutation$` + 模块级 `queryCache`(`invalidate(prefix)`)。**写端点默认 form 编码**(`http.post(url, body)`),正好适配 `common/*`;只有 `@RequestBody` 端点才显式加 `JSON_HEADERS`。`useQuery$(key[], factory, {enabled})` 支持依赖式守卫。
- 通用组件: `MasterDetailLayout`(左3右2)、`DataTable`(服务端分页 `pagination.mode='server'`、`getRowId`、`onRowClick`、`rowClassName`、`enableRowSelection`)、`FormDialog`+`FormSection`、`FormField`、`SearchForm`、`PageContainer`、`RelatedPanel`、`AlertDialog`(删除确认)。
- 类型: `types/manager.ts` 已有 `SpTableManager`/`SpTableManagerItem`(`mustFill:'1'|'0'`)。
- 纯函数 `parseMustFill`(支持 `'1'` 与遗留 `'Y'/'y'`),来自 `managerFormUtils.ts`,可复用。
- vitest: node 环境,只收 `src/**/*.test.ts`(不收 `.tsx`)。纯逻辑抽工具文件 + `*.test.ts`。

### 2.4 菜单 / 路由 / 数据前置

- 菜单 106: `id=106, code=basedatamanager, name=基础数据维护, url=/basedata/manager/item/list-ui, parent_id=10, permission=manager:add`(MySQL-20210225.sql:407)。
- `urlMap.ts:12` 已占位映射 `'/basedata/manager/item/list-ui' → '/basedata/manager-item'`,但 `router.tsx` **无对应路由**(孤儿映射),当前点击落 NotFound。新增 `path: 'basedata/manager-item'` 即可对齐,**零 urlMap 改动**。
- 侧边栏由 `sp_sys_menu` 驱动、不按角色过滤,菜单 106 已显示。
- 联调数据: 唯一已配置目标表 = `sp_bom`(`sp_table_manager` 仅 1 行),唯一字段 = `materiel_desc`(`must_fill='Y'`)。`sp_bom` 物理表 + 13 条 seed 数据均存在(MySQL-20210225.sql:24)。

## 3. 设计决策汇总

| 维度 | 决策 |
|---|---|
| 功能范围 | 完整 CRUD(分页查 / 新增 / 编辑 / 删除) |
| 后端加固 | 白名单(表名+列名)+ 值参数化 `#{}` + 修 `is_deleted` 缺省 |
| 交互形态 | 主从单页 `MasterDetailLayout`(左选表 / 右数据表 + FormDialog) |
| 字段控件 | 全文本框(YAGNI,类型感知留 backlog) |
| 删除语义 | 物理删 + 二次确认;page 不加软删过滤 |
| 路由 | `path: 'basedata/manager-item'`(对齐 urlMap,零 urlMap 改动) |
| 权限点 | `manager:add`(与菜单 106/Layer1 一致,页面级 `PermissionGuard`) |

## 4. 架构与数据流

```
ManagerItemPage (主从单页, 菜单106 → /basedata/manager-item)
 ├ 左 master: managerPage()  → DataTable 选表(sp_table_manager, 搜索表名/描述, 单选高亮 onRowClick)
 └ 右 detail (选中表后, useQuery$ enabled=!!selected):
     ├ managerItems(tableNameId) → 字段定义(field/fieldDesc/mustFill, 已排序)
     │    └→ buildColumns(items) 动态构造表格列 + 操作列
     ├ commonPage({tableName,tableNameId,current,size}) → 数据行(Map<列,值>, 含id)
     ├ 工具栏「+新增」(setEditing(null)+open)
     └ 行级「编辑」(setEditing(row)+open) / 「删除」(AlertDialog 二次确认)
   新增/编辑 → FormDialog + ManagerItemForm(全 useState 受控):
     values: Record<field,string>; 按 items 顺序渲染 FormField+Input;
     提交 → validateRow(必填) → buildAddOrUpdatePayload → commonAddOrUpdate(form) → toast + invalidate(commonPage 前缀)
```

数据依赖链: 选表头(拿 `tableName`+`id`) → 取字段定义(渲染列/表单) → 取数据行。`commonPage` 用 `enabled: !!selected` 守卫,避免未选表就触发"未选中表信息"异常。

## 5. 后端详细设计(加固)

Controller 的 form 编码契约**不变**(前端按字段名平铺提交);加固集中在 Service + Mapper。

### 5.1 `TableNameDataServiceImpl` 写入路径重写

```
commonSave(request):
  tableNameId = request.getParameter("jsTableNameId")
  tableName   = request.getParameter("jsTableName")
  assertTableWhitelisted(tableName, tableNameId)        // 见 5.2
  allowedCols = queryItemBytableNameId(tableNameId).stream().map(field)  // 配置字段白名单
  LinkedHashMap<String,Object> data = new LinkedHashMap<>()
  for col in allowedCols:
      if request.getParameter(col) != null: data.put(col, request.getParameter(col))
  // 系统列
  data.put("id", IdUtil 雪花)
  data.put("create_username", currentUser); data.put("create_time", now)
  data.put("update_username", currentUser); data.put("update_time", now)
  if tableHasColumn(tableName, "is_deleted"): data.putIfAbsent("is_deleted", "0")   // 修缺省
  mapper.commonSave(tableName, data)

commonUpdate(request):
  同上取 tableName/tableNameId + assertTableWhitelisted + allowedCols 过滤
  id = request.getParameter("id")(必填, 校验非空)
  data 仅含白名单列 + update_username/update_time
  mapper.commonUpdate(tableName, id, data)
```

- `tableHasColumn`: 复用 `queryTableFieldByName`(查 information_schema)或单独探测,判断目标表是否含 `is_deleted` 列。
- 读取/删除路径: `queryTableNameDataList`、`commonDelete` 同样先 `assertTableWhitelisted(tableName, tableNameId?)`(删除仅有 tableName+id,按 tableName 校验存在于 `sp_table_manager` 且 `is_deleted='0'`)。

### 5.2 白名单校验

```
assertTableWhitelisted(tableName, tableNameId):
  SpTableManager m = sp_table_manager.selectById(tableNameId)    // 或按 tableName 查
  if m == null || !m.tableName.equals(tableName) || !"0".equals(m.isDeleted):
      throw new RuntimeException("非法的表标识")      // 对齐全库异常风格 → Result.failure
```

列名白名单: 提交 Map 只放入 `allowedCols`(来自 `sp_table_manager_item.field`) ∪ 受控系统列,其余前端传参一律剔除。`${col}` 在 Mapper 插值前已被限定在白名单内。

### 5.3 Mapper(`QueryTableNameDataMapper.xml`)参数化

```xml
<insert id="commonSave">
  INSERT INTO ${tableName}
  (<foreach collection="data" index="col" item="val" separator=",">${col}</foreach>)
  VALUES
  (<foreach collection="data" index="col" item="val" separator=",">#{val}</foreach>)
</insert>

<update id="commonUpdate">
  UPDATE ${tableName}
  SET <foreach collection="data" index="col" item="val" separator=",">${col}=#{val}</foreach>
  WHERE id = #{id}
</update>
```

- 列名 `${col}`: 来自白名单过滤后的 Map keys,安全。
- 值 `#{val}`: MyBatis 参数绑定(PreparedStatement),彻底消除值注入;MySQL 对 int/date 列隐式转换字符串值。
- `${tableName}`: 经 `assertTableWhitelisted` 限定为已登记真实表名。

### 5.4 守卫单测(Mockito)

`TableNameDataServiceImplTest`:
- 非法 `tableName`(不在 `sp_table_manager` / `tableName` 不匹配 / `is_deleted!='0'`)→ 抛异常,不触达 mapper。
- 非白名单列被剔除(提交含未配置字段 → data 不含该列)。
- `commonSave` 构造的 data 含 `id`/`create_*`/`update_*`,且表有 `is_deleted` 列时补 `'0'`。
- `commonUpdate` 缺 `id` → 抛异常;data 含 `update_*` 不含 `create_*`/`id`。

## 6. 前端详细设计(`apps/mes-new`)

### 6.1 路由

`router.tsx` 在 basedata 分组下新增 `{ path: 'basedata/manager-item', element: <ManagerItemPage /> }`(懒加载与既有页一致)。零 `urlMap.ts` 改动。

### 6.2 API(`api/basedata/manager.ts` 新增 3 个,form 编码)

```ts
// 均 http.post(...)(默认 form 编码), 不加 JSON_HEADERS
commonPage(params: { tableName: string; tableNameId: string; current: number; size: number })
  : Observable<PageResult<Record<string,string>>>            // POST /basedata/common/page
commonAddOrUpdate(body: Record<string,string>): Observable<void>  // POST /basedata/common/add-or-update
  // body 平铺: { jsTableName, jsTableNameId, id?, ...动态字段 }
commonDelete(params: { tableName: string; id: string }): Observable<void>  // POST /basedata/common/delete
```

### 6.3 纯逻辑 `managerItemUtils.ts`(+ `__tests__/managerItem.test.ts`)

- `buildColumns(items: SpTableManagerItem[]): ColumnDef[]` — 按 items 顺序映射 `{ accessorKey: field, header: fieldDesc }`,末尾不含操作列(操作列在页面侧加,因含 JSX)。
- `validateRow(items, values): { ok, errors }` — 对 `parseMustFill(item.mustFill)===true` 的字段做非空校验。
- `buildAddOrUpdatePayload(tableName, tableNameId, items, values, id?)` — 构造平铺 form body: `{ jsTableName, jsTableNameId, ...仅白名单字段值, id?(编辑) }`。
- `emptyRow(items): Record<string,string>` — 新建初值(每字段空串)。

### 6.4 页面 `pages/basedata/manager-item/ManagerItemPage.tsx`

- 左 master: `SearchForm`(草稿态 tableName/tableDesc)+ `DataTable`(`managerPage`, 服务端分页, `onRowClick` 选表高亮 `rowClassName`)。
- 右 detail: 选中表后 `RelatedPanel` 容器内:
  - `useQuery$(['basedata','manager','item', tableNameId], () => managerItems(id), { enabled: !!selected })` → `buildColumns`。
  - `useQuery$(['basedata','common','page', tableNameId, params], () => commonPage(...), { enabled: !!selected })` → `DataTable`(`getRowId: row => row.id`, 服务端分页, 行尾操作列: 编辑/删除)。
  - 工具栏「+新增」。
- 删除: `AlertDialog` 二次确认 → `commonDelete({ tableName, id })` → `invalidate(commonPage 前缀)`。
- `PermissionGuard perm="manager:add"` 包裹增删改入口。

### 6.5 动态表单 `ManagerItemForm`(全 useState 受控)

- `FormDialog`(title 区分新增/编辑)内,`values: Record<field,string>` 单个 useState;按 `items` 顺序渲染 `FormField(label=fieldDesc, required=parseMustFill(mustFill))` + 受控 `Input`。
- **不使用 react-hook-form**: 动态字段名来自用户配置,可能撞 DOM 属性名(`name`/`id`/`nodeName` 等),用 RHF `register(动态name)` 会触发 DOM clobbering → 提交崩溃 + 整页刷新(见记忆 `rhf-field-name-dom-clobbering`)。受控对象 + 取值用 `values[field]` 隔离。
- 编辑时初值来自被点击行的 Map(已含各列值);新增用 `emptyRow(items)`。
- 提交: `validateRow` → 不过显示行内错误;过 → `buildAddOrUpdatePayload` → `mutate` → `toast.success` → `invalidate` → 关闭。

## 7. 错误处理

- 未选表即查 → `enabled` 守卫避免触发"未选中表信息"。
- 删除二次确认(`AlertDialog`)。
- 必填: 前端 `validateRow` 拦截 + 后端兜底(配置 `mustFill` 仅前端用于校验,后端不强制,故前端必拦)。
- 后端白名单失败 / SQL 异常 → 全局异常处理 → `Result.failure` → 拦截器 `toast`。
- `mustFill` 双轨编码: 用 `parseMustFill` 解码('1' 与遗留 'Y/y' 都算必填)。

## 8. 测试策略

- **前端**: `managerItemUtils` 的 vitest(`buildColumns` 列顺序/表头映射、`validateRow` 必填命中、`buildAddOrUpdatePayload` 平铺正确含 js* 与 id 区分、`emptyRow`)。
- **后端**: `TableNameDataServiceImplTest`(Mockito 守卫,见 5.4)。
- **构建验证**: 前端 `check-types`/`lint`/`test`/`build` 全过;后端 `mvn test`(JDK11,见记忆 `backend-build-mvnw-broken`)+ compile/启动。
- **端到端**: 后端登录需图形验证码,可借助 2k 沉淀的 `mes.captcha.enabled=false`(dev) + `scripts/verify/login.sh` 做 curl 鉴权验证(见记忆 `backend-build-mvnw-broken`);浏览器人工抽查(:4100)对 sp_bom 增删改查闭环。

## 9. 验收标准

1. 菜单 106 可点进 `/basedata/manager-item`(不再 NotFound)。
2. 左侧列出 `sp_table_manager` 表(可搜索),选 `sp_bom` 后右侧按 `materiel_desc` 列渲染数据行。
3. 新增一行 → 列表出现;编辑 → 值更新;删除(二次确认)→ 行消失。三者均无 SQL 异常(尤其新增不因 `is_deleted` 缺省失败)。
4. 后端: 伪造非白名单 `tableName` 或注入字符串值 → 被拒/被参数化,不发生注入。
5. 前端 `check-types`/`lint`/`test`/`build` 全绿;后端守卫单测全绿。

## 10. 边界、已知项与 backlog

- **待核实(实现/审查阶段)**: `SELECT id,${col} FROM ${tableName}` 的分页是否真经 `PaginationInterceptor` 生效(后端探查与菜单探查说法冲突:前者称 `req extends Page` 会自动注入 COUNT+LIMIT,后者称无 LIMIT 全表返回)。须实测;若未生效则补显式分页。
- **字段类型感知**(information_schema 推断 / 扩展 `fieldType` 列): 留 backlog(本周期全文本框)。
- **软删过滤不做**: 通用动态表不保证有 `is_deleted` 列;`sp_bom` 会显示 `is_deleted='2'` 的禁用行(与后端现状一致)。
- **联调数据窄**: 仅 `sp_bom`/`materiel_desc`。建议补几条 `sp_table_manager_item` 种子(多字段)以验证多列渲染/提交;非阻塞。
- **批量删除**: 不做(后端仅单行 delete)。
- **字段级搜索/排序**: 不做(后端 page 无 where/orderBy)。

## 11. 关键文件清单

**后端(改)**:
- `mes/src/main/java/com/wangziyang/mes/basedata/common/service/impl/TableNameDataServiceImpl.java` — 写入路径重写(白名单+参数化+is_deleted)
- `mes/src/main/resources/mapper/basedata/common/QueryTableNameDataMapper.xml` — commonSave/commonUpdate 改 foreach `#{}`
- `mes/src/main/java/com/wangziyang/mes/basedata/common/controller/TableNameDataController.java` — 视需要薄化(契约不变)
- `mes/src/test/.../basedata/common/TableNameDataServiceImplTest.java` — 新增守卫单测

**前端(新增/改)**:
- `mes/frontend/apps/mes-new/src/router.tsx` — 加 `basedata/manager-item` 路由
- `mes/frontend/apps/mes-new/src/api/basedata/manager.ts` — 新增 commonPage/commonAddOrUpdate/commonDelete
- `mes/frontend/apps/mes-new/src/pages/basedata/manager-item/ManagerItemPage.tsx` — 主从单页(新增)
- `mes/frontend/apps/mes-new/src/pages/basedata/manager-item/ManagerItemForm.tsx` — 动态受控表单(新增)
- `mes/frontend/apps/mes-new/src/pages/basedata/manager-item/managerItemUtils.ts` + `__tests__/managerItem.test.ts` — 纯逻辑 + 测试(新增)

**复用(不改)**: `MasterDetailLayout`/`DataTable`/`FormDialog`/`FormField`/`SearchForm`/`RelatedPanel`/`PermissionGuard`、`types/manager.ts`、`managerFormUtils.parseMustFill`、`http/*`(`useQuery$`/`useMutation$`/`invalidate`)。
