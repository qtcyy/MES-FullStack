# 子周期 1f 3D 数字孪生仓库 — 验证记录

- 日期:2026-06-21
- 分支:`feature/simulation-3d`

## 后端端点审查(按 backend-deepseek-review-each-cycle)

纯前端消费,本周期**后端零改动**。逐端点读审 + MySQL 佐证(后端未在 :9090,curl 跳过,直连 `mes_data` localhost:3306 验证)。

| 端点 | 结论 | 证据 |
|---|---|---|
| `GET /basedata/warehouse/list` | **OK** | `SpWarehouseController:47-53` `qw.ne("is_deleted","1").orderByDesc("create_time")`,与 `/page` 过滤对称;DB:6 仓库 3 软删,只返 3 条有效,无 phantom 区 |
| `GET /basedata/warehouse/locations/{warehouseId}` | **OK** | `:81-89` `eq("warehouse_id",id).ne("is_deleted","1").orderByAsc(group_no,row_no,layer_no,col_no)`,正确按仓过滤 + 软删过滤;DB:52 库位全 `is_deleted='0'`,无跨仓泄漏、无孤儿 |
| `POST /inventory/page` | **LATENT(未改)** | `SpInventoryServiceImpl:48` `selectPage(new Page<>(current,size),qw)` 分页本身正确,IPage 参数正常;但 `MybatisPlusConfig` 的 `PaginationInterceptor.setLimit(500)` 默认上限未解除 → 前端 `size=100000` 会被**静默截断为 500**。`sp_inventory` 无 is_deleted 列(无需过滤),9 条记录 location_id 全部在 sp_warehouse_location 存在(无孤儿),字段 camelCase `locationId` 正常序列化,form 编码与前端一致 |

### MySQL 佐证

- `sp_warehouse` 6 行(3 软删 / 3 有效);`sp_warehouse_location` 52 行(全 `'0'`,无属已删仓库的孤儿);`sp_inventory` 9 行(无 is_deleted 列),location_id 引用完整性 100%。

### 结论

**当前数据量(9 条库存)下三端点可安全消费,无暴露 bug。** 不做后端改动:

- `inventory/page` 500 上限是**全局** `PaginationInterceptor` 行为,修改影响全应用所有分页端点(非"最小纯新增"),且与 mes-new 2h/2k 同款 `size=100000` 处理一致(当时亦记 backlog 未改)。spec §16 已预登记 → 记 1f-backlog。
- `warehouse/delete` 软删仓库不级联删库位(当前 regenerateLocations 物理重建,无孤儿)= 设计隐患 LATENT,跨模块,记 backlog。

## 前端验证

门禁(`mes/vue3`):见下方 Task 9 收尾(typecheck / test / lint:check / build)。

## Backlog(1f)

- `inventory/page` 单次 `size=100000` 受 MyBatis-Plus 默认 500 上限静默截断;库存 >500 库位时 3D 着色不全。修法二选一:① 后端 `PaginationInterceptor.setLimit(-1或更大)`(全局影响,需评估);② 前端改分批拉取。
- `warehouse/delete` 软删不级联库位(跨模块隐患)。
- 库位坐标依赖真实 group_no/row_no/layer_no/col_no;缺失时 WarehouseScene 用顺序索引兜底(已实现)。
- 浏览器 :4200 端到端冒烟待用户确认(需后端 :9090 + DB 有仓库/库位/库存)。
</content>
