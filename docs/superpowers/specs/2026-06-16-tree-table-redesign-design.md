# 树形表格专项优化设计稿（TreeDataTable + 展开/收缩动画）

> 日期：2026-06-16　范围：`mes/frontend/apps/mes-new` + `packages/ui`　性质：新增专用组件 + 两页迁移 + 共享组件瘦身，零业务逻辑改动

## 1. 背景与目标

「列表表格视觉重设计」已完成（共享 `DataTable` 套上新皮肤）。其中**菜单管理**是特殊的树形表格，上一轮只随共享组件套了外观，**树形交互未做专项优化**。本轮专门处理树形表格。

当前树形渲染寄生在 `DataTable` 内（`getSubRows` + TanStack `getExpandedRowModel` + cell0 `paddingLeft` 缩进 + chevron 旋转）。**核心缺陷：展开/收缩时子行由 TanStack 行模型瞬间增删，没有任何高度过渡——子树是"啪"地出现/消失，体验生硬。**

**目标：**
1. 新建一个**专用的树形表格组件 `TreeDataTable`**，承载所有树形渲染与交互，视觉皮肤与 `DataTable` 保持一致（同一卡片/表头/分隔线风格）。
2. **加上平滑的展开/收缩动画**（子行高度 + 透明度过渡，chevron 旋转保留）。
3. 顺带做树形可读性优化：**层级缩进引导线**、**展开全部/折叠全部**工具条。
4. 把 `MenuList`（本轮目标）与 `DeptList`（同型树形，一并统一）迁移到 `TreeDataTable`，并从 `DataTable` 中**移除已无人使用的树形死代码**，让 `DataTable` 回归纯扁平/分页表。

**用户诉求原文：** "专门优化一下'菜单管理'中的树形 table。可以新增或复用一个专门的组件…同时加上展开收缩的动画。"

## 2. 关键技术约束与选型

| 约束 | 结论 |
| --- | --- |
| 依赖现状 | TanStack react-table v8.21、Tailwind v4.1、`tw-animate-css`；**无 framer-motion / motion** |
| 动画方案 | **纯 CSS：`grid-template-rows: 0fr ↔ 1fr`** 高度过渡（零依赖、GPU 友好、暗色安全），叠加内容 `opacity` 淡入淡出 + chevron 旋转 |
| `<table>` 语义 | **保留真实 `<table>`**（列对齐、可访问性免费获得），动画落在每个单元格内的折叠容器上 |
| 行挂载策略 | **全树常驻渲染**（TanStack `state.expanded = true` 恒为真 → 行模型始终扁平化输出全部行），可见性由组件自管的 `collapsedIds` 决定，从而支持"收起"也能播放退出动画 |
| 折叠状态键 | TanStack `getRowId` 用节点真实 `id`（`MenuList`/`DeptList` 节点均有 `id: string`），`collapsedIds` 以真实 id 为键，刷新/重取数据后状态稳定 |
| 减少动效 | `motion-reduce:transition-none` 兜底无障碍 |
| 颜色 | 全部走主题令牌（`bg-card`/`border-border`/`bg-muted`/`text-muted-foreground` 等），明暗自适配 |

### 为何新建组件而非继续塞进 DataTable
- `DataTable` 被 10 个页面共用，仅 2 个是树形。把"全树常驻 + 自管可见性 + 逐格折叠动画"塞进 `DataTable`，会让 8 个非树页面承担无关复杂度与分支。
- 树形组件无需分页 / server 模式 / 行选择，专用组件可精简到位，同时复用同一套 `Table` 原语和卡片皮肤保证视觉一致。
- 仅 `MenuList`/`DeptList` 两个消费者，迁移成本低；迁移后即可从 `DataTable` 删除树形死代码（DRY、无死代码）。

## 3. 组件设计：`TreeDataTable`

文件：`packages/ui/src/components/tree-data-table.tsx`，从 `packages/ui/src/index.ts` 导出。

### 3.1 Props

```ts
interface TreeDataTableProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** 返回该行子行数组（树形必填） */
  getSubRows: (row: TData) => TData[] | undefined;
  /** 行稳定 id（折叠状态键）。默认取 row.id */
  getRowId?: (row: TData) => string;
  loading?: boolean;
  loadingRowCount?: number;
  /** 初始是否全部折叠（默认 false = 全部展开，与旧 defaultExpanded=true 行为一致） */
  defaultCollapsed?: boolean;
  /** 是否显示"展开全部/折叠全部"工具条（默认 true，仅当存在可展开行时渲染） */
  showExpandAll?: boolean;
}
```

`getRowId` 默认实现：`(row) => String((row as { id?: string | number }).id)`。

### 3.2 状态与可见性

- `const [collapsedIds, setCollapsedIds] = React.useState<Set<string>>(() => new Set())`（默认空集 = 全展开）。
  - `defaultCollapsed` 为 `true` → 在拿到**首批非空行**时一次性初始化为全部"可展开行 id"。两个消费者均异步取数（首帧 `rows` 为空，惰性初值此刻算不出 id），故用 `useRef` 守卫在渲染期做一次性初始化（React 官方"渲染期按数据初始化"模式，幂等、不成环、不覆盖用户后续手动展开/折叠）；默认 `false` 时该分支不触发。
- TanStack 配置：`getCoreRowModel` + `getExpandedRowModel` + `getSubRows` + `getRowId`，`state: { expanded: true }` 恒真（保证行模型输出**全部**行、保持父在前子在后的扁平顺序、提供 `row.depth` 与 `row.getParentRows()`），`onExpandedChange` 为 no-op（我们不走 TanStack 的展开切换）。
- 每行计算：
  - `isOpen = !collapsedIds.has(row.id)`（驱动 chevron 旋转）
  - `visible = row.getParentRows().every((p) => !collapsedIds.has(p.id))`（任一祖先折叠则不可见 → 驱动行高度动画）
- 切换：`toggle(id)` → 在 `collapsedIds` 中增删该 id（不可变更新）。
- 展开全部：`setCollapsedIds(new Set())`；折叠全部：`setCollapsedIds(new Set(allExpandableIds))`，其中 `allExpandableIds = table.getRowModel().rows.filter(r => r.getCanExpand()).map(r => r.id)`。

> 选用"折叠集合"而非"展开集合"：默认空集即全展开（匹配旧 `defaultExpanded=true`）；**新增节点默认展开**（不在折叠集合内）；删除节点遗留的 id 无害。

### 3.3 渲染结构

外层卡片：`overflow-hidden rounded-xl border border-border bg-card shadow-sm`（与 `DataTable` 一致）。

**工具条**（`showExpandAll` 且存在可展开行且非 loading 时）：卡片顶部一条 `border-b border-border px-3 py-2`，右对齐两个 ghost 小按钮「展开全部 / 折叠全部」（`ChevronsUpDownIcon` / `ChevronsDownUpIcon`，`text-xs text-muted-foreground`）。

**表头**：复用重设计皮肤 `bg-muted` + `border-b-2 border-border` + `px-4 py-3 text-xs font-medium text-muted-foreground`，`flexRender` 渲染。

**表体**：
- loading → 渲染 `loadingRowCount` 行骨架（每列 `<Skeleton className="h-5 w-full" />`，单元格 `px-4 py-3`），与 `DataTable` 一致。
- 空 → 居中 `InboxIcon`（`size-8 opacity-60`）+「暂无数据」。
- 有数据 → 遍历 `table.getRowModel().rows`，每行用**自定义 `<tr>`**（完全掌控 hover/可见性，避免继承 `TableRow` 原语里 `has-aria-expanded:bg-muted/50` 等隐式规则）：

```tsx
<tr
  key={row.id}
  // 不可见行整体 inert:同时移出键盘 Tab 序、阻断点击、从无障碍树移除
  inert={!visible || undefined}
  className={cn(
    "transition-colors",
    // 分隔线落在 <tr>:整行一条、天然与 hover 背景对齐;折叠行不画线避免 0 高行残留 1px 堆叠
    visible && "border-b border-border/60 hover:bg-muted/50"
  )}
>
  {row.getVisibleCells().map((cell, cellIndex) => (
    <TableCell
      key={cell.id}
      className={cn("border-0 p-0 align-middle", cellIndex === 0 && "relative")}
    >
      {/* 缩进引导线:绝对铺满整格(行高),与内容解耦 → 竖线连续且与 hover/分隔线对齐 */}
      {cellIndex === 0 && row.depth > 0 && (
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-4 flex">
          {Array.from({ length: row.depth }).map((_, i) => (
            <span key={i} className="flex w-5 justify-center">
              <span className="h-full w-px bg-border/40" />
            </span>
          ))}
        </div>
      )}
      {/* 高度动画层:grid 0fr↔1fr */}
      <div className={cn(
        "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
        visible ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      )}>
        <div className="overflow-hidden">
          {/* 内容层:padding + 透明度淡入淡出,随高度一起收起。cell0 用 paddingLeft 缩进 + chevron */}
          <div className={cn(
            "px-4 py-3 transition-opacity duration-200 motion-reduce:transition-none",
            visible ? "opacity-100" : "opacity-0"
          )}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </div>
        </div>
      </div>
    </TableCell>
  ))}
</tr>
```

> **对齐关键点（修复 hover/分隔线错位）**：各列内容高度天然不同（操作列图标按钮 > 文字行），若把分隔线放进单元格内层会因 `align-middle` 居中而错位、且 hover 背景超出分隔线。故：
> 1. **分隔线落在 `<tr>` 上**（整行一条、与 hover 背景同元素，天然对齐）；折叠行不画线，避免 0 高行残留描边堆叠。
> 2. 单元格 `p-0`、内容 `align-middle` 居中（恢复正常表格观感）；内边距在动画内容层内，收起时随高度归零。
> 3. **缩进引导线改为绝对定位**（`inset-y-0` 铺满整格＝行高，与内容解耦），保证竖线连续且与 hover/分隔线严丝合缝；竖线在 `w-5`（1.25rem，与缩进单位一致）块内居中，恰好对齐父级 chevron 中心；深度 0 无竖线。

**cell0 树形单元**（内容层内，缩进引导线见上方绝对层）：

```tsx
<div className="flex items-center py-3 pr-4 ..." style={{ paddingLeft: `${1 + row.depth * 1.25}rem` }}>
  {row.getCanExpand() ? (
    <button
      type="button"
      aria-label={isOpen ? "折叠" : "展开"}
      aria-expanded={isOpen}
      onClick={() => toggle(row.id)}
      className="mr-1 inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <ChevronRightIcon className={cn("size-4 transition-transform duration-200 motion-reduce:transition-none", isOpen && "rotate-90")} />
    </button>
  ) : (
    <span className="mr-1 inline-block size-5 shrink-0" />
  )}
  <div className="min-w-0 flex-1">{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
</div>
```

### 3.4 无障碍
- chevron 按钮带 `aria-expanded` + 动态 `aria-label`（折叠/展开），并带与全站一致的 `focus-visible` 焦点环。
- 不可见（被折叠）行整体置 `inert`：一举移出键盘 Tab 序、阻断点击、并从无障碍树移除，避免键盘聚焦到高度塌缩为 0 的隐藏控件（仅靠 `aria-hidden`+`pointer-events-none` 挡不住键盘焦点）。
- 所有过渡（高度、透明度、chevron 旋转）均受 `motion-reduce:transition-none` 约束。

## 4. 改动文件清单

| 文件 | 动作 | 说明 |
| --- | --- | --- |
| `packages/ui/src/components/tree-data-table.tsx` | **新建** | `TreeDataTable` 组件（核心） |
| `packages/ui/src/index.ts` | 改 | barrel 增加 `export { TreeDataTable, type TreeDataTableProps } from "./components/tree-data-table"` |
| `packages/ui/src/components/data-table.tsx` | 改 | **移除树形死代码**：`getSubRows`/`defaultExpanded` props、`expanded` state、`getExpandedRowModel`/`getSubRows`/`onExpandedChange`/`ExpandedState` 相关、cell0 缩进分支（回退为纯 `flexRender`）。保留 `onRowClick`/`rowClassName`（MasterDetail 用）与其余一切 |
| `apps/mes-new/src/pages/system/menu/MenuList.tsx` | 改 | `DataTable` → `TreeDataTable`（props 等价：columns/data/loading/loadingRowCount/getSubRows） |
| `apps/mes-new/src/pages/system/dept/DeptList.tsx` | 改 | 同上 |

共 1 新建组件 + 1 barrel + 1 瘦身 + 2 页迁移。

## 5. 范围与非目标

**在范围内：**
- 新建 `TreeDataTable`；展开/收缩高度+透明度动画 + chevron 旋转。
- 缩进引导线、展开全部/折叠全部工具条。
- `MenuList`/`DeptList` 迁移；`DataTable` 移除树形死代码。
- 明/暗主题、减少动效、a11y。

**非目标（明确不做）：**
- 不改菜单/部门的列定义（`columns`）、类型徽章、操作按钮、增删改/删除确认逻辑、数据请求与 `invalidate` 逻辑。
- 不引入新依赖（纯 CSS 动画）。
- 不改 `DataTable` 的分页/搜索/行选择/MasterDetail（`onRowClick`/`rowClassName`）等非树形能力。
- 不为树形加排序/过滤/分页（树是全量渲染）。
- 不改 `table.tsx` 原语。

## 6. 测试与验证

沿用项目约定（无组件测试设施，本次为纯视觉/交互重构，不写组件级测试）。验证 = 类型检查 + lint + build + 人工核对：

- 共享组件类型检查：`cd mes/frontend && pnpm --filter @workspace/ui check-types`
- 应用类型检查：`cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit`
- Lint：`cd mes/frontend && pnpm --filter mes-new lint`
- 构建：`cd mes/frontend && pnpm --filter mes-new build`
- dev 人工核对（:4100）清单：
  - [ ] 菜单管理：展开/折叠子树有平滑高度动画（非瞬间增删），chevron 旋转同步
  - [ ] 缩进引导竖线正确显示层级
  - [ ] 「展开全部/折叠全部」工具条生效
  - [ ] 部门管理同样迁移生效、搜索过滤后树仍正确
  - [ ] 卡片/表头/行皮肤与其余列表页一致（无双层边框）
  - [ ] 空数据 Inbox + 「暂无数据」；loading 骨架正常
  - [ ] 明/暗主题切换正常；系统开启"减少动效"时无过渡
  - [ ] 其余 8 个非树形列表页（用户/角色/字典/物料/构件/工艺单元/仓库/设备组）不受影响

## 7. Self-Review（设计稿自检）

- **占位符扫描**：无 TBD/TODO。
- **一致性**：§3 组件设计与 §4 文件清单一致；动画方案（§2）贯穿 §3.3；§5 非目标与 §4 改动范围互不矛盾。
- **行为保留**：默认全展开（`collapsedIds` 空集 = 旧 `defaultExpanded=true`）；`getSubRows=(row)=>row.children` 语义不变；列定义/删除逻辑不动。
- **回归面**：迁移 `DeptList` 属本轮主动统一（同型树形），其搜索→建树→展示链路不变，仅渲染组件替换；`DataTable` 删树代码后仅余扁平/分页/MasterDetail 消费者。
- **歧义**：动画时长统一 200ms ease-out；折叠状态键明确为节点真实 id；引导线取 `border-border/40`、缩进单位 1.25rem 与旧值一致。
