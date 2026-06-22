# Cycle 2b-1 设计：设备 / 零部件 / 设备编组

- 日期：2026-06-22
- 分支：`feature/basedata-device`（从 `develop` 切）
- 所属：Cycle 2（库存 + 剩余基础数据 + 组织）·子周期 2b 第 1 支
- 功能/接口参考：`mes/frontend/apps/mes-new`（`pages/basedata/{device-group,component}`，**仅参考功能/契约，绝不照抄 UI**）

## 1. 背景与范围

Cycle 2b「剩余基础数据」拆为两支推进：

- **2b-1（本设计）= 设备 + 零部件 + 设备编组**（设备编组依赖设备，故同支）
- 2b-2 = 仓库库位 + 加工单元（仅 CRUD）

加工单元的「关联班组」面板依赖班组数据（排在 2c），故 2b-2 的加工单元只做基础 CRUD，teams 关联面板留 2c。

本支交付三页一分支，沉淀一个可复用的无序双列穿梭组件供 2c 复用。

## 2. 后端契约（已勘探，零改动为默认）

三模块控制器均已存在，端点形态：

| 模块 | 端点 | 编码 | 形态 |
|---|---|---|---|
| 设备 `SpDeviceController` `/basedata/device` | `page` / `{id}` GET / `add-or-update`(@RequestBody) / `delete`(@RequestBody) | page 走 form；add-or-update、delete 走 **JSON** | 标准 CRUD |
| 零部件 `SpComponentController` `/basedata/component` | `page` / `add-or-update`(**无 @RequestBody**) / `delete`(@RequestBody) | page、add-or-update 走 **form**；delete 走 **JSON** | 标准 CRUD |
| 设备编组 `SpDeviceGroupController` `/basedata/device-group` | `page` / `{id}` GET / `add-or-update`(@RequestBody) / `delete`(@RequestBody) / `items/{groupId}` GET / `items/add`(@RequestBody) / `items/remove`(@RequestBody) | page 走 form；其余写端点走 **JSON** | 主从（组→设备成员） |

> 编码判定依据：`@RequestBody` → 前端用 `http.post(url, data, true)`（JSON）；无 `@RequestBody` → 默认 form 编码。**component 的 add-or-update 是 form**（区别于 device/device-group 的 JSON），实现时逐端点核对。

### 实体字段

- **SpDevice**：`code` `name` `type` `model` `specs` `lineId` `location` `status` `descr` + `is_deleted`（`@TableField`，非 `@TableLogic`）。
  - `lineId` 指向 `sp_line`，**该表无 list 接口/无数据源 → 本周期不做生产线下拉**（字段留空，不在表单暴露）。
  - `type` / `status`：实现时**实连 dev DB（`localhost:3306/mes_data` root/12345678）确认**是否有对应字典 type；有则用 `useDict` 下拉，无则文本输入。默认假设：无专用字典 → 文本输入（保守，避免假下拉）。
- **SpComponent**：`code` `name` `descr` + `is_deleted`。极简。
- **SpDeviceGroup**：`code` `name` `descr` + `is_deleted`（头表）。成员经 `sp_device_group_item(group_id, device_id)` 关联。

### 设备编组成员端点语义（已读实现）

- `GET items/{groupId}` → 返回该组成员的 **SpDevice 全量列表**（空组返回 `[]`）。
- `POST items/add` `{groupId, deviceIds: string[]}` → **批量**新增，后端逐个**去重守卫**（已存在则跳过）。
- `POST items/remove` `{groupId, deviceId}` → **单个**移除。

> 成员是**无序集合**（无 sort 列），故 UI 用无序穿梭，不用有序的 `OrderedTransfer`。

## 3. 前端架构

### 3.1 页面（`src/views/basedata/`）

- **设备维护** `device/DeviceList.vue` + `device/DeviceForm.vue`
  - `PageContainer` + `SearchForm`（code/name 模糊）+ `DataTable`（服务端分页，列：编码/名称/类型/型号/规格/位置/状态/描述）+ 新增·编辑·删除。
  - 表单字段：code/name/type/model/specs/location/status/descr（**不含 lineId**）。`el-form` reactive + 规则校验（code/name 必填）。
- **零部件维护** `component/ComponentList.vue` + `component/ComponentForm.vue`
  - 同上极简形态，列/字段：code/name/descr。
- **设备编组** `device-group/DeviceGroupPage.vue`（主从）
  - `MasterDetailLayout`：左 = 编组 `DataTable`（CRUD，`DeviceGroupForm` 弹窗 code/name/descr）；右 = 选中组的成员面板 `DeviceGroupMembers.vue`（用 `DualListTransfer`：候选=未入组设备、已选=成员）。
  - 成员保存策略：穿梭框在「确认」时 diff 出新增/移除集合 → 新增批量调 `items/add`、移除逐个调 `items/remove`，成功后 refetch `items/{groupId}`。（与后端单/批端点匹配。）

### 3.2 沉淀的可复用原语

- **`src/components/DualListTransfer.vue`（新建）** —— 无序双列穿梭。
  - props：`modelValue: TransferItem[]`（已选）、`candidates: TransferItem[]`（候选全集）、`titles?`、`loading?`。
  - emit：`update:modelValue`。
  - 交互：左候选池（搜索 + 勾选/点击加入）、右已选列表（移除）；**无上/下移、无首末标记**（区别于 `OrderedTransfer`）；`auto-animate` 平滑 + a11y。
  - 零业务耦合，2c 加工单元-班组面板可直接复用。
- **`src/utils/device.ts`（纯函数，TDD）**：
  - `buildDevicePayload(form)`（剥空串字段、`deleted` 默认 `'0'`）、`validateDevice(form)`。
  - `buildComponentPayload(form)`、`validateComponent(form)`。
  - `buildGroupPayload(form)`、`validateGroup(form)`。
  - `excludeSelected(all, selectedIds)`（候选剔除已入组，供穿梭框候选计算）。
  - `diffMembers(originalIds, nextIds)` → `{added: string[], removed: string[]}`（成员保存 diff）。
- **API**：`src/api/basedata/{device,component,deviceGroup}.ts`。
- **类型**：`src/types/basedata.ts` 扩展 `SpDevice` / `SpComponent` / `SpDeviceGroup`（分页参数复用 `PageReq` 基类，对齐 2a 约定）。

### 3.3 菜单 / 路由 / urlMap

- DB 现状：组 **13 物料管理** 下仅有 materile(131)；**设备/零部件菜单未预置**；设备编组在 `device-management.sql` 里是 id=108 但**错挂在组 10（系统管理）**下。
- **新增 `scripts/sql/device-menu-seed.sql`（幂等 `NOT EXISTS`，需手动跑）**：在组 13 下补三菜单——
  - `132` 设备定义 `/basedata/device/list-ui`（perm `device:add`）
  - `133` 零部件定义 `/basedata/component/list-ui`（perm `component:add`）
  - `134` 设备编组 `/basedata/device-group/list-ui`（perm `device:add`）
  - （不复用 108，避免跨组重复；108 是 mes-new 旧 seed，本周期不动它）
- urlMap 加 3 条（`*-list-ui` → 干净 SPA 路由 `/basedata/device|component|device-group`）+ router 加 3 路由。

## 4. 后端审查（按 [[backend-deepseek-review-each-cycle]]，默认零改动）

逐文件读 3 个 ServiceImpl + Controller，重点核查：

1. **软删一致性**（最可能的真 bug）：`SpDevice`/`SpComponent` 有 `is_deleted` 字段（`@TableField` 非 `@TableLogic`）→ ① `page` 是否 `ne("is_deleted","1")` 过滤；② `delete` 是物理删 `removeById` 还是软删 `UpdateWrapper.set("is_deleted","1")`。若漏（参照 1b 物料的同款修法），做**最小纯新增**修复 + Mockito 守卫单测（JUnit4，AssertJ 风格对齐同包 `Cycle*BackendTest`）。
   - 设备编组头表 `sp_device_group` 同样有 `is_deleted`，一并核查。
   - `sp_device_group_item` 无软删列（物理删，by-design）。
2. `items/add` 无 `@Transactional`（幂等循环 save，低危，倾向不改、记 backlog，除非审查认为必要）。
3. `delete` 删除编组时是否级联清理 `sp_device_group_item`（孤儿行隐患）—— 评估是否暴露、是否最小修复。

仅修「审查暴露的正确性问题」，越界/性能项记 backlog。

## 5. 验证与流程

- 前端门禁：`pnpm typecheck`（0）/ `pnpm test`（新增 device.ts 纯函数用例全绿）/ `pnpm lint:check`（0 err）/ `pnpm build`（✓）。
- 后端（若有改动）：`mvn compile` BUILD SUCCESS + 守卫单测绿（JDK11 corretto，系统 mvn，见 [[backend-build-mvnw-broken]]）。
- subagent 驱动逐任务两阶段审查（实现 + spec/质量）+ opus 整体终审（前后端契约逐端点核对）。
- 完成后 `--no-ff` 合 `develop`；更新 ROADMAP + 模块矩阵（9.2）。
- spec/plan：`docs/specs|plans/2026-06-22-cycle2b1-basedata-device*`。
- 人工 :4200 冒烟待用户确认（需后端 9090 + DB 跑 `device-management.sql` 建表/种子 + 新 `device-menu-seed.sql`）。

## 6. 非目标（YAGNI / 明确不做）

- 生产线 `lineId` 下拉（`sp_line` 无 list 接口/数据源）。
- 加工单元、仓库库位（→ 2b-2）；班组（→ 2c）。
- 设备状态机/在线监控、OPC 操作（旧 component 菜单 id=2 是 OPC，与本零部件无关）。
- 成员穿梭的有序/分组/批量移除优化（diff + 单个 remove 已够，demo 规模无碍）。

## 7. 已知 backlog（预登记，非阻塞）

- `items/add` 无 `@Transactional`（幂等循环，低危）。
- 编组删除若不级联清 `sp_device_group_item` → 孤儿行（视审查结论决定是否本周期修）。
- `device:add` 粗粒度权限（无 :list/:update/:delete，沿用全库现状）。
- `type`/`status` 若实为字典但 DB 无种子 → 本周期文本输入，留字典化 backlog。
