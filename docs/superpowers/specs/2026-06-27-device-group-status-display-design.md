# 设备组状态显示 — 设计文档

- 日期:2026-06-27
- 页面:`/basedata/device-group`(设备组管理)
- 目标:在设备组页面显示每个设备组的"使用/占用状态",由成员设备状态派生。

## 背景与现状

- 设备组列表(`DeviceGroupList.tsx`)是主从布局:左侧列表(编组代码/名称/描述),右侧成员设备面板(`DeviceGroupMembers.tsx`,只显示 编码/名称/操作)。
- `SpDevice` 有 `status` 字段;`SpDeviceGroup` **无**状态字段 → 设备组状态只能从成员设备**派生**。
- 设备状态码约定(复用大屏 `DashboardServiceImpl.deviceStatusLabel`):
  `0=空闲`、`1=运行中`、`2=维修中`、`3=报废`。
- order/派工模块**不引用 device**,设备未与生产订单关联 → "占用"无法按"被订单派工"口径定义。
  可用的占用信号只有 `device.status`,其中 **"运行中" 即占用**。

## 需求(已与用户确认)

1. 列表新增「状态」列:**汇总徽标 + 占用计数明细**。
2. 右侧成员面板:给每台设备加一个**状态徽标**。

## 状态口径

主徽标优先级(自上而下命中即取):

| 条件 | 主徽标 | 色 |
|---|---|---|
| 有 运行中(1) | 占用中 | 蓝 |
| 否则有 维修中(2) | 维修中 | 琥珀 |
| 否则有 空闲(0) | 空闲 | 绿 |
| 否则有 报废(3) | 报废 | 灰 |
| 无成员设备 | 无设备 | 灰 |

明细文字:`运行N·维修N·空闲N·报废N`,**只显示非零项**。

成员设备单台徽标:直接按 `0/1/2/3` 映射 空闲/运行中/维修中/报废(+对应色),未知/空值 → 原值或 `—`。

## 实现方式

采用**后端聚合**(单次分页查询返回每组四个状态计数,无 N+1)。

备选与否决:前端逐组拉成员(N+1,否决);给设备组加持久化状态字段(冗余+同步,过度设计,否决)。

## 改动清单

### 后端(2 文件,无新接口)

1. `mapper/basedata/SpDeviceGroupMapper.xml` `pageWithRelations`:
   在现有 `device_count` 子查询旁,新增四个按状态计数的子查询,均 `JOIN sp_device d ON d.id = dgi.device_id AND d.is_deleted != '1'`:
   - `idle_count`(`d.status='0'`)、`running_count`(`'1'`)、`repair_count`(`'2'`)、`scrap_count`(`'3'`)
   - resultMap 增 4 列映射。
2. `basedata/dto/SpDeviceGroupDTO.java`:加 `Integer idleCount/runningCount/repairCount/scrapCount` 及 getter/setter。

### 前端(4 文件)

1. **新增** `src/utils/deviceStatus.ts`(仿 `pages/inventory/inventoryStatus.ts`):
   - `deviceStatusMeta(status?: string): StatusMeta` — 单台设备 `0/1/2/3` → {label, className}。
   - `GroupStatusCounts` 类型 + `deriveGroupStatusMeta(counts): { meta: StatusMeta; detail: string }` — 主徽标(优先级)+ 明细文字(非零项)。
2. `types/device.ts`:`SpDeviceGroupDTO` 加 `idleCount?/runningCount?/repairCount?/scrapCount?: number`。
3. `pages/basedata/device-group/DeviceGroupList.tsx`:列表加「状态」列(`Badge` 主徽标 + 明细 muted 文字)。
4. `pages/basedata/device-group/DeviceGroupMembers.tsx`:成员表加「状态」列(每台一个 `Badge`)。

### 测试

- **新增** `src/utils/__tests__/deviceStatus.test.ts`(vitest,仿 `inventoryStatus.test.ts`):
  覆盖 `deviceStatusMeta` 各码 + 未知/空;`deriveGroupStatusMeta` 的优先级各分支(占用/维修/空闲/报废/无设备)与明细只显非零。

## 边界

- 成员设备被软删除(`is_deleted='1'`)不计入四桶;统计以非删除设备为准。
- `device.status` 为空/异常值不落入任何桶 → 明细之和可能 < `deviceCount`(可接受)。
- 空组(`deviceCount=0` 或四桶全 0)→「无设备」。
- 无新增数据库表 / 菜单 / 路由;在既有页面内完成。

## 验证

- 后端:`mvn compiler:compile`;并对 dev 库 `mes_data` 跑改后的 `pageWithRelations` SQL 验证四列计数正确。
- 前端:`tsc --noEmit`、`pnpm lint`、`vitest` 跑 `deviceStatus.test.ts`。
