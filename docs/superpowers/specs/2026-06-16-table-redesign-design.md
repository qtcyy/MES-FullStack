# 列表表格视觉重设计 设计稿（DataTable 全站统一皮肤）

> 日期：2026-06-16　范围：`mes/frontend/apps/mes-new`　性质：纯视觉重构，零业务逻辑改动

## 1. 背景与目标

全站 10 个列表页（系统管理 + 主数据）共用 `@workspace/ui` 的 `DataTable` 组件渲染表格。当前表格沿用 shadcn 原生样式 + 各页一层包裹，视觉粗糙、中英混杂、双层边框。

**目标：** 重做共享 `DataTable` 的视觉皮肤，使其精致统一；改动落在共享组件上，**菜单/角色/用户/部门/字典/物料/工艺单元/仓库/设备组/构件 等所有列表页一次性升级**。全程不改任何数据流、分页参数、列定义、增删改逻辑。

**视觉方向（已通过浏览器 mockup 确认）：** **A 骨架 + B 表头**
- **A 骨架**：单层圆角边框卡片、仅横向细分隔线、舒适行高、整行悬浮高亮。
- **B 表头**：实填充底色 + 加粗（2px）灰色底边线，表头有明确存在感。
- 表头底边线**用灰色，不用主色蓝**（已对比确认）。

## 2. 现状诊断

| # | 问题 | 根因（文件） |
| --- | --- | --- |
| 1 | **双层边框嵌套**（外框 + 内框，廉价感） | 各列表页 `<div className="rounded-lg border border-border bg-card p-2">` 包裹，而 `DataTable` 内部又有 `<div className="rounded-md border">` |
| 2 | **表头无层次** | `table.tsx` 的 `TableHead` 仅 `h-10 px-2`，无背景填充，与数据行区分弱 |
| 3 | **行密度局促** | `TableCell` 仅 `p-2` |
| 4 | **中英混杂** | `data-table.tsx` 分页为 `Previous`/`Next`、空状态 `No results.`、选中态 `X of Y row(s) selected.` |
| 5 | **分页器简陋** | 仅上一页/下一页两个按钮，无页码、无总数中文展示 |

## 3. 设计决策

### 3.1 架构：卡片下沉到 DataTable，移除各页包裹层

把"卡片外观（边框 + 圆角 + 阴影）"统一收进 `DataTable` 内部容器，并把分页条**移入卡片内**（顶部细线分隔）。各列表页删除多余的 `<div className="rounded-lg border border-border bg-card p-2">` 包裹层，直接渲染 `<DataTable .../>`。

**理由：** 单一来源、彻底消除双层边框；所有页面零散包裹收敛为组件内统一实现；后续再调表格外观只改一处。

**备选（未采纳）：** 保留各页包裹层、只在页面层调样式 —— 会导致 10 处重复样式、双层边框难根治、风格易漂移。

### 3.2 全程用主题令牌（暗色模式安全）

mockup 为亮色，但应用支持明/暗主题切换。**所有颜色用 CSS 变量令牌**（`bg-card` / `border-border` / `bg-muted` / `text-muted-foreground` / `bg-primary` 等），不写死十六进制，确保暗色模式自动适配。

> 注：mockup 的表头灰底线取色 `#cbd5e1`，落地用 `border-border` 令牌（亮色约 `#d8dee7`，肉眼接近且暗色安全）；底色 `#f1f5f9` 即 `--muted` 令牌，完全一致。

## 4. 详细视觉规格

全部以 Tailwind 工具类表达；改动集中在 `data-table.tsx`，`table.tsx` 原语**不动**（通过在 `data-table.tsx` 渲染 `TableHead/TableCell/TableRow` 时传 `className` 覆盖，借 tailwind-merge 让后传类胜出）。

### 4.1 卡片容器
- 替换内部 `<div className="rounded-md border">` → `rounded-xl border border-border bg-card shadow-sm overflow-hidden`
- `overflow-hidden` 让表头填充色与圆角对齐裁切。

### 4.2 表头（B）
- `TableHeader` 行：底色 `bg-muted`
- `TableHead`：`px-4 py-3`、`text-xs font-medium text-muted-foreground`、`border-b-2 border-border`（2px 加粗灰线）

### 4.3 数据行（A）
- `TableCell`：`px-4 py-3`（舒适行高）
- 行分隔：`TableRow` 追加 `border-b border-border/60`（更柔的横线）；最后一行无底边（`table.tsx` 既有 `[&_tr:last-child]:border-0` 生效）
- 悬浮高亮：沿用 `table.tsx` `TableRow` 既有 `hover:bg-muted/50`；选中行沿用 `data-[state=selected]:bg-muted`
- 树形展开行（菜单管理）：缩进/展开按钮逻辑**保持原样**（见 §6）

### 4.4 分页条（移入卡片内）
- 容器：移入卡片，顶部 `border-t border-border`，`px-4 py-3`，`text-sm text-muted-foreground`
- **左侧文案（中文）**：server 模式且有 `totalRows` → `共 {totalRows} 条 · 每页 {pageSize} 条`；无 `totalRows` → `第 {pageIndex+1} / {totalPages} 页`
- **右侧页码器**：`‹ 1 2 … N ›` 数字按钮
  - 当前页：`bg-primary text-primary-foreground font-medium`
  - 其余页：`border border-border bg-card`
  - 上/下页箭头：`‹` `›`，首/末页禁用
  - 页码省略逻辑：始终显示首页、末页、当前页及其相邻页（current ± 1），其间以 `…` 折叠；总页数 ≤ 7 时全部平铺
- 非 server 模式（本项目列表页均为 server 模式，此分支保底兼容）：保留 上一页/下一页，文案中文化

### 4.5 空状态
- 替换 `No results.` → 居中区块：lucide `Inbox` 图标（`size-8 text-muted-foreground/60`）+ 文案 `暂无数据`（`text-sm text-muted-foreground`），保留原 `h-24`/合适高度，`colSpan={columns.length}`

### 4.6 选中态文案
- `X of Y row(s) selected.` → `已选 {n} / {total} 行`（仅 `enableRowSelection` 时出现，本次列表页未启用，做中文化兜底）

### 4.7 加载骨架
- 沿用现有 `Skeleton` 行渲染（`loadingRowCount`），单元格内边距随 §4.3 自然变舒适，无需额外改动

## 5. 改动文件清单

| 文件 | 动作 | 说明 |
| --- | --- | --- |
| `packages/ui/src/components/data-table.tsx` | 改 | 核心：卡片容器、表头/行/分页样式、中文数字分页器、空状态、选中态文案 |
| `packages/ui/src/components/table.tsx` | **不改** | 原语保持通用；样式通过 data-table 传 className 覆盖 |
| `apps/mes-new/src/pages/system/user/UserList.tsx` | 改 | 删除 `<div className="rounded-lg border border-border bg-card p-2">` 包裹层 |
| `apps/mes-new/src/pages/system/menu/MenuList.tsx` | 改 | 同上（树形表，仅外观，见 §6） |
| `apps/mes-new/src/pages/system/role/RoleList.tsx` | 改 | 同上 |
| `apps/mes-new/src/pages/system/dept/DeptList.tsx` | 改 | 同上 |
| `apps/mes-new/src/pages/system/dict/DictList.tsx` | 改 | 同上 |
| `apps/mes-new/src/pages/basedata/materile/MaterileList.tsx` | 改 | 同上 |
| `apps/mes-new/src/pages/basedata/process-unit/ProcessUnitList.tsx` | 改 | 同上（在 MasterDetail 布局内，删包裹层后需核对仍居于网格单元内） |
| `apps/mes-new/src/pages/basedata/warehouse/WarehouseList.tsx` | 改 | 同上（MasterDetail，同上核对） |
| `apps/mes-new/src/pages/basedata/device-group/DeviceGroupList.tsx` | 改 | 同上（MasterDetail，同上核对） |
| `apps/mes-new/src/pages/basedata/component/ComponentList.tsx` | 改 | 同上 |

共 1 个共享组件 + 10 个列表页。

## 6. 范围与非目标

**在范围内：**
- 共享 `DataTable` 的视觉皮肤升级；10 个列表页去除包裹层。
- 分页/空状态/选中态全中文化；数字页码分页器。
- 明/暗主题均正常。

**非目标（明确不做）：**
- **菜单管理树形表格的结构/交互优化**：本次菜单管理仅随共享组件套上新外观（边框/表头/行距/分页），其树形展开-折叠、缩进、`getSubRows` 等行为**保持原样不动**。树形表格的专项优化由用户后续单独发起，不在本次范围。
- 不改各页的列定义（`columns`）、状态徽章、操作按钮（这些已是页面层实现，且视觉可接受）。
- 不改数据请求、分页参数（`current`/`size`）、增删改逻辑、权限守卫。
- 不引入新依赖（页码器用现有 `Button` 或原生按钮 + Tailwind 实现）。
- 操作列对齐方式等页面层微调不在本次（保持现状）。

## 7. 测试与验证

沿用项目约定（vitest `environment: 'node'`，仅逻辑测试，无组件测试设施；本次为纯视觉重构，不写组件级测试）。每步验证 = 类型检查 + 提交；最后统一 lint + build + dev 人工核对。

- 类型检查：`cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit`
- 共享组件类型检查：`cd mes/frontend && pnpm --filter @workspace/ui exec tsc --noEmit`（若该包配置了 tsc）
- Lint：`cd mes/frontend && pnpm --filter mes-new lint`
- 构建：`cd mes/frontend && pnpm --filter mes-new build`
- dev 人工核对（:4100）逐页清单：
  - [ ] 单层圆角边框卡片，**无双层边框**
  - [ ] 表头实填充底色 + 2px 灰色加粗底边线，层次清晰
  - [ ] 行距舒适、横向细分隔线、整行悬浮变浅
  - [ ] 分页：左「共 N 条 · 每页 M 条」、右数字页码器（当前页主色高亮、‹ › 箭头、… 省略、首末页禁用），全中文
  - [ ] 空数据：居中 Inbox 图标 + 「暂无数据」
  - [ ] 菜单管理：套上新外观，且树形展开/折叠/缩进**行为不变**
  - [ ] 主数据 MasterDetail 三页（工艺单元/仓库/设备组）表格仍正确居于布局内
  - [ ] 明/暗主题切换，表格、表头、分页、空状态均正常
  - [ ] 加载骨架屏正常

## 8. Self-Review（设计稿自检）

- **占位符扫描**：无 TBD/TODO。
- **一致性**：§3 架构（卡片下沉 + 去包裹）与 §5 文件清单一致；§4 视觉规格全部用令牌，与 §3.2 暗色安全约定一致。
- **范围**：聚焦单一共享组件 + 10 页去包裹，适合一份实现计划完成；树形优化已明确划出。
- **歧义**：表头底边线已明确「灰色 `border-border` 2px，不用主色蓝」；分页省略逻辑已给出明确规则（≤7 平铺，否则首/末/当前±1 + …）。
