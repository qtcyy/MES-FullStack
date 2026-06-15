# 周期 2b-2 设计稿:基础数据(设备组 / 工艺单元 / 仓库)

> 目标前端:`mes/frontend/apps/mes-new`(**不要碰 `apps/mes1`**)
> 技术栈:React 19 + TS + Vite + shadcn/`@workspace/ui` + react-hook-form + zod + `@ngify/http` 数据层
> 主题:D(Slate Pro 浅色,主色 `#2563eb`)/ B(`.dark` 青色)一键切换

## 1. 范围

本周期交付三类基础数据页面,**完整交付 = 主表 CRUD + 关联管理**:

| 页面 | 路由 | 主表 CRUD | 关联管理 |
|---|---|---|---|
| 设备组 | `/basedata/device-group` | ✅ | 成员设备:穿梭弹窗批量加 / 单个移除 |
| 工艺单元 | `/basedata/process-unit` | ✅ | 班组绑定:选择弹窗加 / 解绑 |
| 仓库 | `/basedata/warehouse` | ✅(含规格四数字) | 库位:只读查看(后端按规格自动生成) |

**不在本周期**:2b-3 动态表配置(Manager/ManagerItem,机制完全不同,独立周期)。

## 2. UI 视觉语言(本周期重点)

用户反馈现有 `ModalForm` 过于单调。本周期在 **Slate Pro 既有语言内做精致化**(克制、不引入割裂新美学/新字体)。

### 2.1 新增增强弹窗 `FormDialog`(新组件,不改旧 `ModalForm`)

- **不替换**现有 `components/ModalForm.tsx`;新建 `components/FormDialog.tsx`,**仅供 2b-2 新页面使用**。旧页面(User/Role/物料等)本周期保持不变,待用户看过效果后再决定是否全站迁移。
- Props:`open / onOpenChange / title / onSubmit / submitting / submitText`(沿用 ModalForm),**新增** `icon?: LucideIcon`、`description?: string`、`contentClassName?`。
- Header:
  - 极淡主色渐变背景 `bg-gradient-to-r from-primary/5 to-transparent`(已确认加入)。
  - 左侧主色竖条 `w-1 self-stretch rounded-full bg-primary`。
  - 图标芯片 `size-9 rounded-lg bg-primary/10 text-primary grid place-items-center`,渲染传入的 `icon`。
  - 标题(`text-lg font-semibold`)+ 描述副行(`text-sm text-muted-foreground`)竖排。
  - Header 下方 `Separator`。
- Body:`ScrollArea` 限高 `max-h-[70vh]`,内容区 `space-y-4`。
- Footer:`border-t pt-4` + 右对齐;主按钮带 `Check` 图标;`submitting` 时显示 spinner + "提交中…"。

### 2.2 `FormSection`(轻量分区,FormDialog 同文件导出或独立文件)

- 小标题(`text-xs font-medium text-muted-foreground uppercase tracking-wide`)+ 细分隔线;`children` 为该区字段。
- 用于把长表单分组(例:仓库表单分"基本信息 / 库位规格"),缓解"一坨字段"观感。

### 2.3 `MasterDetailLayout`(主从布局)

- 左右两栏(`grid` 或 `flex`,左 `flex-[3]`,右 `flex-[2]`,响应式小屏堆叠)。
- 左:可选中行的主表(基于 `DataTable`),**选中行**用左主色竖条 + `bg-accent` 高亮(覆盖默认灰)。
- 右:关联面板 `children`,随选中项变化;**未选中**时显示居中空态(lucide 图标 + 提示文案)。
- 受控:`selectedId` / `onSelect(id)`。

### 2.4 关联面板 & 穿梭弹窗视觉

- 关联面板:卡片式(`rounded-lg border bg-card`),头部带图标 + 计数 `Badge`(如"成员设备 · 12");空态居中图标 + 文案。
- `DualListTransfer`(穿梭弹窗,**用独立 `Dialog`**——它是穿梭交互而非表单提交,不复用 FormDialog 的 submit footer):左右两卡(候选 / 已选),各带搜索框 + 计数 Badge,中间方向箭头图标;行 hover 反馈;左侧多选 checkbox → `onAdd(ids[])`,右侧行内移除 → `onRemove(id)`;底部仅"关闭"按钮。

## 3. 页面与字段

### 3.1 设备组 `basedata/device-group`
- 主表字段:`code` 编组代码、`name` 编组名称(必填)、`descr` 描述。
- 列表:搜索 `name`/`code`、分页、`[+新建]`(`device:add` 门控)、编辑、删除。
- 关联面板:成员设备表(来自 `SpDeviceGroupDTO.deviceList`,或 `items/{groupId}` 查询),头部计数 Badge;`[管理成员]` 按钮 → `DualListTransfer`(候选设备 ↔ 已加入)。

### 3.2 工艺单元 `basedata/process-unit`
- 主表字段:`code`、`name`(必填)、`type`(类型,如"人员作业单元/设备作业单元")、`hasLineWarehouse`(是否有线边库 0/1,Switch)、`descr`。
- 列表:同上,新建门控 `processUnit:add`。
- 关联面板:班组绑定表(`teams/{unitId}`);`[绑定班组]` → 班组选择弹窗(候选班组来自全量班组接口),`teams/add` / `teams/remove`。

### 3.3 仓库 `basedata/warehouse`
- 主表字段:`code`、`name`(必填)、`type`(库房类型)、规格四数字 `groups`/`rows`/`layers`/`columns`(均 `int ≥ 1`)、`descr`。
- 表单分两区:"基本信息"(code/name/type/descr)+ "库位规格"(四数字并排)。
- 列表:同上,新建门控 `warehouse:add`。
- 关联面板:库位列表(`locations/{warehouseId}`,**只读**,后端按规格自动生成);规格变更保存后 invalidate 库位 key 刷新。

## 4. 数据层与约定

### 4.1 类型(`apps/mes-new/src/types/`)
- `device.ts`:`SpDeviceGroup`、`SpDevice`、`SpDeviceGroupDTO`(扩展 `deviceCount/deviceList/deviceIds`)。
- `process-unit.ts`:`SpProcessUnit`、`SpTeam`、`SpProcessUnitDTO`(扩展 `teamList`)。
- `warehouse.ts`:`SpWarehouse`、`SpWarehouseLocation`。

### 4.2 API(`apps/mes-new/src/api/basedata/`)

后端契约(已探明):

| 数据 | endpoint | 方法 | 形态 |
|---|---|---|---|
| 通用 | `/basedata/{module}/page` | POST | **form-encoded** |
| 通用 | `/basedata/{module}/add-or-update` | POST | **@RequestBody JSON** |
| 通用 | `/basedata/{module}/delete` | POST | **@RequestBody JSON** |
| 设备组 | `/basedata/device-group/items/{groupId}` | GET | 查询成员 |
| 设备组 | `/basedata/device-group/items/add` | POST | **JSON** 批量加 |
| 设备组 | `/basedata/device-group/items/remove` | POST | **JSON** 移除 |
| 工艺单元 | `/basedata/process-unit/teams/{unitId}` | GET | 查询班组 |
| 工艺单元 | `/basedata/process-unit/teams/add` | POST | **JSON** |
| 工艺单元 | `/basedata/process-unit/teams/remove` | POST | **JSON** |
| 仓库 | `/basedata/warehouse/locations/{warehouseId}` | GET | 查询库位 |

- **JSON 端点**(add-or-update / delete / items.add / items.remove / teams.add / teams.remove)必须显式 `headers: { 'Content-Type': 'application/json' }`(对标元器件 delete,绕过 `formEncodingInterceptor`)。
- `page` 走默认 form-encoded。
- 分页参数 `current`/`size` + 搜索 `name`/`code`;响应 `{records,total,size,current,pages}`。
- 班组全量来源:沿用 mes1 的 `/admin/sys/team/page`(规划阶段核实实际可用端点)。
- **删除语义**:三者走专用 `/delete` 端点(JSON 传 id/对象),非软删改字段。

### 4.3 权限
- 新建按钮门控:设备组 `device:add`、工艺单元 `processUnit:add`、仓库 `warehouse:add`。
- 编辑/删除/关联管理:不门控(沿用 2a/2b-1 约定)。

### 4.4 缓存失效
- 主表:`invalidate('["basedata","device-group"')` 等。
- 关联子数据:独立 key,如 `["basedata","device-group","items",groupId]`。

## 5. 错误处理

- 沿用 `resultUnwrap` 拦截器统一 toast;页面 `try/catch` 静默兜底(同 2b-1)。
- 仓库规格 zod:`z.coerce.number().int().min(1)`;改规格 → 后端重建库位 → 保存成功后 invalidate 库位 key。

## 6. 测试

- **vitest 单测**(对标 2a 的 `tree.ts` TDD):
  - `DualListTransfer` 的选择/加入/移除纯逻辑(候选与已选的集合运算)抽成可测函数并单测。
  - `MasterDetailLayout` 的选中态 / 空态渲染逻辑(如可抽纯函数则单测,否则靠 tsc+build+人工)。
- **静态门禁**:`pnpm --filter mes-new exec tsc --noEmit`、`pnpm lint`、`pnpm --filter mes-new build` 全绿。
- **人工浏览器验收**(admin/123,backend :9090):三页 CRUD + 关联管理 + D/B 主题 + 新 `FormDialog` 观感。

## 7. 文件清单(预计新增)

```
apps/mes-new/src/
├── components/
│   ├── FormDialog.tsx          # 新增强弹窗(icon/description/渐变 header/分区/scroll)
│   ├── FormSection.tsx         # 表单分区(或并入 FormDialog)
│   ├── MasterDetailLayout.tsx  # 主从布局
│   └── DualListTransfer.tsx    # 穿梭弹窗
├── types/
│   ├── device.ts
│   ├── process-unit.ts
│   └── warehouse.ts
├── api/basedata/
│   ├── device-group.ts
│   ├── process-unit.ts
│   └── warehouse.ts
├── pages/basedata/
│   ├── device-group/{DeviceGroupList,DeviceGroupForm,DeviceGroupMembers}.tsx
│   ├── process-unit/{ProcessUnitList,ProcessUnitForm,ProcessUnitTeams}.tsx
│   └── warehouse/{WarehouseList,WarehouseForm,WarehouseLocations}.tsx
└── (router.tsx 注册 3 条路由 — 由集成方统一改,并行 agent 不碰)
```

## 8. 执行方式

- 共享积木(FormDialog/FormSection/MasterDetailLayout/DualListTransfer)先建,因三页都依赖。
- 三个页面互不重叠文件 → **并行派发 agent**;agent 不碰 `router.tsx`、不 build、不 commit。
- 集成方统一注册路由 + 全量验证(tsc/lint/test/build)+ 两阶段 review(spec 合规 + 代码质量)。
