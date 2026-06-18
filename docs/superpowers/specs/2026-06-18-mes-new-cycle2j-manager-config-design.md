# 周期 2j · 动态表 Manager 配置(Layer 1) — 设计文档

- 日期：2026-06-18
- 范围：`apps/mes-new` 前端新建「动态表 Manager」配置页 `/basedata/manager`(表头 + 字段明细二级,纯元数据 CRUD),并对涉及的后端 `add-or-update` 做**最小必要修复**
- 前置：系统管理 / 基础数据(物料/构件/设备组/工艺单元/仓库)/ 工艺技术线 / 生产订单+甘特 / 库存 / 数字化(KPI 大屏 + 3D 仿真)均已完成
- 排期共识：业务模块基本收官,**本周期 = 基础数据收尾的动态表 Manager(高复杂度模块,本周期只做 Layer 1)**

---

## 1. 目标与范围

在活跃前端 `mes/frontend/apps/mes-new` 重建「动态表 Manager」**配置层(Layer 1)**:一个二级主从结构,管理"动态表定义"——

- **表头**(`sp_table_manager`):table_name / table_desc / permission
- **字段明细**(`sp_table_manager_item`):field / field_desc / must_fill / sort_num,一对多挂在表头下

**Layer 1 是纯元数据 CRUD,不创建/不读写任何物理业务表。**

### 1.1 明确不做(YAGNI / 留作下一周期)

- **Layer 2 动态数据维护页**(`/basedata/manager-item`,菜单 106):基于配置对**已存在的物理表**做通用增删改查(后端 `/basedata/common/*`,运行时动态生成列与表单,`Map<String,String>` 传输,**裸字符串拼接 SQL 有注入风险**)。复杂度与风险远高于 Layer 1,单列下一周期(2j-2)重做设计 + 后端 SQL 加固。本周期菜单 106 维持现状(今天就是死链,不在范围内)。
- **字段类型(type)**:`sp_table_manager_item` 无类型列,旧 mes1 亦未实现(全部视为文本)。加类型需 DB 迁移 → 本周期不做。
- **字段数(item count)列**:见 §6 决策①。

### 1.2 路由 ↔ 预置菜单(零菜单/seed 改动)

| 路由 | 页面 | 形态 | 后端菜单 |
|---|---|---|---|
| `/basedata/manager` | 动态表配置 | 列表 + 编辑大弹窗 | 菜单 105,url=`/basedata/manager/list-ui` |

`urlMap.ts` **已存在**映射 `/basedata/manager/list-ui` → `/basedata/manager`;侧边栏由 `sp_sys_menu` 驱动且不按角色过滤,菜单 105 已存在。**只需在 `router.tsx` 注册路由即可点到**,无需改菜单或 SQL seed。参见 [[menu-driven-sidebar-route-mapping]]。

---

## 2. 后端最小修复(已逐行读码确认,required)

按 [[backend-deepseek-review-each-cycle]] 亲审 `SpTableManagerController.addOrUpdate`(131–151 行),**确认 4 个真实缺陷**(非 agent 误报):

1. **行 137 `Result.failure(...)` 缺 `return`** → 字段明细为空时不报错,继续往下,最终 `return Result.success(record.getId())` = **假成功**。
2. **行 131 整方法无 `@Transactional`** → 表头已存、明细保存失败 = 孤儿表头,无回滚。
3. **行 150 返回 `record.getId()`** → 新增场景 `record.getId()` 为 `null`(`saveOrUpdate` 把生成 id 写进了 `spTableManager` 而非 `record`),前端拿不到新建 id。
4. **更新分支(行 141–147)明细未挂 `tableNameId`**(`setTableNameId` 只在新增 else 分支里做);且前端若回带旧 item id,`deleteItemBytableNameId` 删旧行后 `saveOrUpdateBatch` 对这些 id 走 `updateById` 命中 0 行 → **明细静默丢失**。

### 2.1 修法(下沉到 service,保证事务真正生效)

新增 service 方法承载保存逻辑并加事务注解(避免在 `@Controller` 方法上挂 `@Transactional` 这种依赖代理生效的 smell):

- `ISpTableManagerService`:新增 `String saveOrUpdateWithItems(SpTableManagerDto dto)`。
- `SpTableManagerServiceImpl.saveOrUpdateWithItems`,标 `@Transactional(rollbackFor = Exception.class)`:
  1. `BeanUtils.copyProperties(dto, header)`;
  2. `saveOrUpdate(header)`;
  3. 若 `StringUtils.isNotEmpty(dto.getId())` → `itemService.deleteItemBytableNameId(dto.getId())`(更新先删旧明细);
  4. **遍历明细统一 `item.setId(null)` + `item.setTableNameId(header.getId())`**(新增/更新一致,强制重新插入,根除丢失);
  5. `itemService.saveOrUpdateBatch(items)`;
  6. `return header.getId()`(生成 id)。
- `SpTableManagerController.addOrUpdate`:仅保留「`CollectionUtil.isEmpty(items)` → `return Result.failure(...)`」早返回 + 委托 `return Result.success(service.saveOrUpdateWithItems(record))`。

### 2.2 后端可选增强(推荐,最小纯新增)——服务端搜索

现 `SpTableManagerReq extends BasePageReq{}` 无任何查询字段,`service.page(req)` 无条件分页 → 列表搜索框无意义。为支撑 §4 列表搜索:

- `SpTableManagerReq` 加 `private String tableName;`、`private String tableDesc;`(+ getter/setter)。
- `SpTableManagerServiceImpl.page`:用 `LambdaQueryWrapper`,对非空的 `tableName`/`tableDesc` 加 `like`,按 `update_time` 倒序。

> 这是允许的"最小、纯新增"后端改动(先例:周期 2c-1 给已有 service 加只读端点)。参见 [[mes-rebuild-roadmap]] 的「后端改动尺度」。

### 2.3 后端测试

新增 Mockito 守卫单测(沿用 2g/2h 的 ServiceImpl Mockito 模式,`@Mock` baseMapper + itemService、`@InjectMocks` impl)覆盖修复点:

- 空明细 → controller 返回 failure 且不触达 service(或 service 层防御);
- **更新**(id 非空)→ 调 `deleteItemBytableNameId` 一次;**新增**(id 空)→ 不调 delete;
- 明细统一 `tableNameId = header.getId()` 且 `id == null`;
- `saveOrUpdateBatch` 被调用且返回 `header.getId()`。

(精确 mock 写法在实现计划中给完整可运行代码;若 Mockito 模拟 id 生成困难,则抽 `normalizeItems(headerId, items)` 纯静态方法单测之。)

---

## 3. 接口契约(对接现有端点,零新增端点)

| 用途 | 端点 | 编码 | 入参 | 出参 |
|---|---|---|---|---|
| 列表分页 | `POST /basedata/manager/page` | form | `{current, size, tableName?, tableDesc?}` | `IPage<SpTableManager>` |
| 编辑回填明细 | `POST /basedata/manager/item/by/tableNameId` | form | `{tableNameId}`(`@RequestParam`) | `List<SpTableManagerItem>` |
| 新增/更新(整体 upsert) | `POST /basedata/manager/add-or-update` | **JSON** | `SpTableManagerDto`(见下) | 表头 id(String) |
| 级联删除 | `POST /basedata/manager/delete/by/tableNameId` | form | `{id}` | void |

**保存请求体(JSON,必须带 `JSON_HEADERS`):**

```json
{
  "id": null,
  "tableName": "product",
  "tableDesc": "产品表",
  "permission": "",
  "isDeleted": "0",
  "spTableManagerItems": [
    { "field": "product_code", "fieldDesc": "产品代码", "mustFill": "1", "sortNum": 1 },
    { "field": "product_name", "fieldDesc": "产品名称", "mustFill": "0", "sortNum": 2 }
  ]
}
```

- **编辑时**:`id` 为表头 id;`spTableManagerItems` **不回带 item id**(由前端 `buildUpsertPayload` 剥离),与后端"删后重插"一致(后端亦会 `setId(null)` 双保险)。
- `mustFill` 用 **"1"/"0"** 串编码(UI boolean ↔ string)。
- `isDeleted` 固定送 `"0"`:`sp_table_manager` 删除是**硬删**(`removeById`),该列实为冗余。

### 3.1 前端类型(`types/manager.ts`)

```ts
export interface SpTableManager {
  id: string
  tableName: string
  tableDesc?: string
  permission?: string
  isDeleted?: string
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

export interface SpTableManagerItem {
  id?: string
  tableNameId?: string
  field: string
  fieldDesc: string
  mustFill: string     // "1" | "0"
  sortNum: number
}
```

UI 内部编辑态另用一个带 boolean `mustFill` 的行模型(见 §5),提交时由 `buildUpsertPayload` 转回 `"1"/"0"`。

---

## 4. 前端结构(mes-new)

| 文件 | 职责 |
|---|---|
| `src/types/manager.ts` | `SpTableManager` / `SpTableManagerItem` / payload 类型 |
| `src/api/basedata/manager.ts` | `managerPage` / `managerItems` / `managerAddOrUpdate`(JSON_HEADERS)/ `managerDelete` |
| `src/pages/basedata/manager/ManagerList.tsx` | 列表页:`DataTable` + 搜索 + 新建 + 行内编辑/删除 |
| `src/pages/basedata/manager/ManagerForm.tsx` | 编辑大弹窗:`FormDialog`,表头区 + 字段明细编辑器 |
| `src/pages/basedata/manager/managerForm.ts` | 纯函数:`validateManagerForm` / `buildUpsertPayload` / `moveRow` / `emptyRow` |
| `src/pages/basedata/manager/managerForm.test.ts` | 上述纯函数 TDD(vitest node) |
| `src/router.tsx` | 注册 `{ path: 'basedata/manager', element: <ManagerList /> }` |

**ManagerList**:`useQuery$(['basedata','manager','page', params], () => managerPage(params))`;列 = 表名 / 表描述 / 权限 / 更新时间 / 操作(编辑、删除带确认)。搜索 = 表名/描述(服务端,见 §2.2)。新建/编辑打开 `ManagerForm`。删除走 `managerDelete` + 成功后 `refetch`。

**ManagerForm**(受控,见 §5):打开"编辑"时先 `managerItems(id)` 拉明细回填;"新建"给一个空行起步。保存调 `managerAddOrUpdate(buildUpsertPayload(...))`,成功 `refetch` 列表 + 关闭弹窗。

API 模块以 `api/basedata/warehouse.ts` 为模板(`http` + `JSON_HEADERS`;`/page` 与 `/item/by/tableNameId` 走默认 form 编码,`/add-or-update` 带 `JSON_HEADERS`)。

---

## 5. 字段明细编辑器与状态管理

**全 `useState` 受控,不使用 react-hook-form。** 理由:(1) 规避 RHF 字段名 DOM 冲突坑 [[rhf-field-name-dom-clobbering]](本项目 gantt/库存登账表单已统一此做法);(2) 动态增删行的字段数组用受控数组更直接。

编辑态行模型:`{ key: string; field: string; fieldDesc: string; mustFill: boolean; }`(`key` 仅前端用于 React list key 与行操作,提交时丢弃;`sortNum` 由数组下标在 `buildUpsertPayload` 时生成,1-based)。

行操作:
- **添加字段**:追加 `emptyRow()`。
- **删除行**:按 key 过滤。
- **↑ / ↓ 调序**:纯函数 `moveRow(rows, index, dir)` 交换相邻行(`sortNum` 在提交时按最终下标重排,无需行内存号)。

提交校验 `validateManagerForm(header, rows)`(纯函数,返回 `{ ok, errors }`):
- 表名(tableName)必填、非空白;
- 至少 1 个字段行;
- 每行 field、fieldDesc 非空;
- **field(字段名)在表内不重复**(忽略大小写);
- 校验不过 → 弹窗内联报错,不提交。

`buildUpsertPayload(header, rows, existingId)`:产出 §3 的 JSON 体——`mustFill` → `"1"/"0"`,`sortNum` = 行下标+1,**不含 item id**,`isDeleted: "0"`。

---

## 6. 已定决策(brainstorming 已与用户确认)

1. **列表省掉「字段数」列**:`/basedata/manager/page` 返回纯表头,要取字段数得 N+1 或加 join VO,代价不值。列表显示 表名/描述/权限/更新时间/操作。(此处偏离选定 mockup,已确认。)
2. **服务端搜索**:加入(§2.2 最小后端新增)。
3. **表单全 `useState` 受控**(§5)。
4. **`mustFill` 用 "1"/"0"**(§3)。

---

## 7. 测试与验收门

- **前端**:`managerForm.test.ts` 覆盖 `validateManagerForm`(各失败分支 + 成功)、`buildUpsertPayload`(mustFill 转码 / sortNum 重排 / 剥离 item id / 新增 vs 编辑)、`moveRow`(上/下/边界)。vitest node 环境,组件不做渲染测(沿用约定:仅收 `*.test.ts`)。
- **后端**:§2.3 Mockito 守卫单测。
- **验收**:`pnpm --filter mes-new exec tsc --noEmit`(check-types)/ `pnpm lint` / `pnpm test`(全绿)/ `pnpm build`(成功)+ 后端 `mvn -q -pl mes test`(用系统 mvn/JDK11,`./mvnw` 已坏,见 [[backend-build-mvnw-broken]])+ subagent 驱动两阶段审查(spec 合规 + 代码质量)+ 终审 Ready to merge。
- **人工双端联调**:后端登录需图形验证码,无法脚本化鉴权(见 [[backend-build-mvnw-broken]]),运行期联调留作人工逐项确认,记入路线图。

---

## 8. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 后端 `@Transactional` 在 controller 上不生效 | 下沉到 service 方法加注解(§2.1),代理层确定生效 |
| 编辑回带 item id 致删后丢失 | 前端 `buildUpsertPayload` 剥离 id + 后端 `setId(null)` 双保险 |
| RHF 字段名 DOM 冲突 | 全 `useState` 受控,不引 RHF([[rhf-field-name-dom-clobbering]]) |
| `mustFill` 编码与历史数据冲突 | `sp_table_manager` 默认为空表,无历史数据;统一 "1"/"0" |
| 搜索后端改动引入回归 | 纯新增字段 + 条件 like,非空才加条件,默认行为不变;Mockito 守卫 |

见 [[active-frontend-app]]、[[mes1-ui-not-a-reference]]、[[backend-deepseek-review-each-cycle]]。
