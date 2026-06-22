# Cycle 2b-1 验证结论(设备 / 零部件 / 设备编组)

- 日期：2026-06-22
- 分支：`feature/basedata-device`(从 `develop` 切)
- spec/plan：`docs/specs/2026-06-22-cycle2b1-basedata-device-design.md` + `docs/plans/2026-06-22-cycle2b1-basedata-device-plan.md`

## 交付

三页一支 + 一个可复用原语：

- **设备维护** `/basedata/device`（标准 CRUD，字段 code/name/type/model/specs/location/status/descr，软删确认）。
- **零部件维护** `/basedata/component`（极简 CRUD，code/name/descr）。
- **设备编组** `/basedata/device-group`（主从：左编组 CRUD + 右成员设备无序穿梭，diff 保存）。
- **`DualListTransfer.vue`**（无序双列穿梭，左候选搜索加入/右已选移除；区别于有序 `OrderedTransfer`；**2c 班组成员面板可复用**）。
- 沉淀 `utils/device.ts`（TDD 15 例）+ `api/basedata/{device,component,deviceGroup}.ts` + `types/basedata.ts` 扩展。

## 编码约定（逐端点核对吻合）

| 端点 | 编码 |
|---|---|
| device page / component page / device-group page | form |
| device add-or-update / delete | JSON |
| **component add-or-update** | **form**（后端无 @RequestBody）|
| component delete | JSON |
| device-group add-or-update / delete / items-add / items-remove | JSON |
| device get-by-id / device-group items | GET |

## 后端审查结论（按每周期必审约定）— 零改动

逐文件读码 + 实连 dev DB（`localhost:3306/mes_data`）复核三模块软删一致性，**全部正确，后端零改动**：

- **设备**：page 经 `SpDeviceMapper.xml` 的 `pageWithRelations`（`WHERE d.is_deleted != '1'`）过滤；delete `setDeleted("1") + updateById`（软删，且有 `hasOrders` 引用守卫）。
- **零部件**：page `qw.ne("is_deleted","1")`；delete `setDeleted("1") + updateById`。
- **设备编组**：page 经 `SpDeviceGroupMapper.xml`（`WHERE g.is_deleted != '1'`）过滤；delete 软删。
- 三实体 `is_deleted` 均为 `@TableField`（非 `@TableLogic`），代码手动过滤/软删正确；`sp_device_group_item` 无软删列（物理删，by-design）。

因后端零改动，未新增 `Cycle2b1BackendTest`。

## 菜单 / 接线（实证）

- DB 实查发现：**零部件菜单 id=111、设备编组菜单 id=108 已存在**但错挂在组 10（系统管理）下；设备菜单不存在。
- `scripts/sql/device-menu-seed.sql`（幂等，需手动跑）：新增 132 设备定义（组 13）+ **UPDATE 重挂 108/111 到组 13**，使物料管理组下整齐排列 materile(131)/设备定义(132)/零部件定义(111)/设备编组(108)。已对 dev DB 执行并 `SELECT` 确认三者 parent_id=13。
- urlMap +3 条、router +3 路由；三页 `*-list-ui → urlMap → 干净路由 → 组件` 端到端可达；route `meta.perm`（device:add / component:add / device:add）与菜单 permission 实测一致。

## 门禁

- `pnpm typecheck` → 0 errors
- `pnpm lint:check` → 0 errors（5 个既有 warn，均在 request.ts / dashboard.spec.ts，本支零新增）
- `pnpm test` → **267 passed / 23 files**（含本支新增 device.spec 15 例）
- `pnpm build` → ✓

## 流程

subagent 驱动逐任务两阶段审查（spec 合规 + 代码质量），逐任务审查抓修：① 设备页提交处理瘦身（去掉列表层重复校验/payload，对齐 MaterileList）；② 编组成员保存 reload 移入 `finally`（部分失败也与服务端对账）+ 重挂载不变量注释；③ 菜单 seed 重挂 108/111 统一分组。opus 整体终审：**Ready to merge**（API 契约逐端点核对吻合）。

## 2b-1 backlog（非阻塞）

1. `utils/device.ts` 的 `validateDevice/validateComponent/validateGroup` + `excludeSelected` 当前未被视图消费（表单校验走 el-form rules、穿梭框内部过滤）；`excludeSelected` 与 `utils/technology` 同名函数重复。保留为一致的校验 API（有 TDD），可后续清理。
2. `DeviceGroupMembers` 候选池用 `devicePage(size:1000)` 兜底全量（`PaginationInterceptor` 上限隐患，全项目同款 backlog）。
3. 设备编组 `delete` 软删后遗留 `sp_device_group_item` 孤儿行（join 表物理删、组已被过滤不可见，低危）；`getGroupItems` 用 `listByIds` 不过滤软删设备（成员面板可能显示已软删设备，次要读路径）；`items/add` 无 `@Transactional`（幂等循环，低危）。
4. 零部件 `add-or-update` 后端可在 code 为空时自动生成 `COMP-xxx`，但 UI 设 code 必填 → 该自动编码路径前端不可达（无害，若需“留空自动编号”UX 再放开）。

## 人工 :4200 冒烟待确认

需后端 9090 + DB 已跑 `scripts/sql/device-management.sql`（建表/演示数据）+ `scripts/sql/device-menu-seed.sql`（菜单，已执行）。`admin/123` 登录 → 物料管理组 → 设备定义（CRUD）/ 零部件定义（CRUD）/ 设备编组（左建组 → 右穿梭加/减设备成员 → 保存 → 刷新对账）。
