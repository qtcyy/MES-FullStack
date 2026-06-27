# 设备管理(设备定义)页面 — 设计文档

- 日期:2026-06-27
- 背景:菜单「设备定义」(`sp_sys_menu` id=132,url `/basedata/device/list-ui`,权限 `device:add`)是**死链**——后端 `SpDeviceController` 已有完整 CRUD、菜单也预置,但前端缺页面+路由+url 映射,点击/访问即 404。设备组"管理成员"的候选设备因此只能用种子数据,无法新增设备。
- 目标:补上前端「设备管理」CRUD 页,套用既有 `OperList`/`DeviceGroupList` 样板;设备「状态」可编辑,与已实现的"设备组状态"功能联动。

## 后端现状(无需改动)

- `POST /basedata/device/page`(form,`SpDevicePageReq`:name/code/type)→ `pageWithRelations`
- `GET  /basedata/device/{id}`
- `POST /basedata/device/add-or-update`(**@RequestBody JSON** `SpDevice`)
- `POST /basedata/device/delete`(**@RequestBody** `{id}`;后端校验 `hasOrders` 已关联生产作业则拒删)
- `SpDevice` 字段:code/name/type/model/specs/lineId/location/status/descr。
- 状态码约定:`0空闲/1运行中/2维修中/3报废`(复用 `utils/deviceStatus.ts`)。

## 设计

### 表单字段(`DeviceForm`)
编码*、名称*、类型(文本)、型号、规格、位置、**状态(下拉:空闲/运行中/维修中/报废)**、描述。
- 不含 `lineId`(库中全空、无产线选择器组件,YAGNI;后端 saveOrUpdate 不传即可)。
- `add-or-update` 为 JSON @RequestBody,API 显式 `Content-Type: application/json`。
- 编辑沿用既有约定:`...(record ?? {…})` 仅展开必要字段(避免回传 createTime,且后端已有 JSON 反序列化器兜底)。

### 列表(`DeviceList`)
列:编码、名称、类型、位置、**状态(Badge,复用 `deviceStatusMeta`)**、操作(编辑/删除)。
搜索:编码、名称(沿用分页参数 code/name)。删除走 `/delete`,后端拒删时拦截器 toast 提示。

### 接线
- **新增** `api/basedata/device.ts`:`devicePage / deviceGetById / deviceAddOrUpdate / deviceDelete` + `DevicePageParams`(作为设备 API 的唯一出处)。
- `api/basedata/device-group.ts`:`devicePage`/`DevicePageParams` 改为从 `./device` 导入,删除本地重复定义(DRY)。
- `router.tsx`:`import DeviceList`,新增 `{ path: 'basedata/device', element: <DeviceList /> }`。
- `utils/urlMap.ts`:加 `'/basedata/device/list-ui': '/basedata/device'`。
- `layouts/routeMeta.ts`:`'/basedata/device': { title: '设备管理', icon: 'tool' }`。

### 不做
- 不改 `sp_sys_menu`(菜单已存在);不加新权限码(沿用 `device:add` 等 `device:*`)。
- 不做 lineId/产线关联;不做设备导入导出。

## 验证
- `tsc --noEmit`、`pnpm lint`。
- 起后端后:进入 `/basedata/device` 能增改删设备;新建设备后在设备组「管理成员」候选池可见;设置状态=运行中后,设备组列表状态列显示「占用中」。
