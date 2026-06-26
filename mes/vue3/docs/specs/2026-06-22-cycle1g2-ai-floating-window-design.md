# 设计：AI 对话栏 → 可拖拽缩放浮动窗

- **日期**：2026-06-22
- **分支**：`feature/ai-floating-window`
- **范围**：Vue3 前端（`mes/vue3`），把 AI 助手对话栏从右侧 `el-drawer` 改为可自由拖拽 + 八方向缩放的浮动窗，带优雅开合动画与流畅跟手体验。
- **后端改动**：零。不改会话逻辑 / SSE / 打字机。

---

## 1. 背景

1g 已交付 AI 助手：`AiAssistant`（持有 `open` + `useAiChat`）→ `AiFab`（悬浮球）+ `AiChatDrawer`（`el-drawer` 外壳，内部 header / 消息列表 / 输入区）。

本次只改**承载外壳的交互形态**：抽屉 → 浮动窗。内部内容（步骤时间线、打字机 Markdown 气泡、建议 chip、输入框、清空）原样保留。

可用依赖：`@vueuse/core@14.3`（含 `useDraggable`，但本设计用自管 pointer 逻辑以便统一处理缩放与边界）、`@vueuse/motion`。

---

## 2. 架构与文件拆分（三层：纯函数 / composable / 组件）

### 2.1 新增 `src/utils/floatingWindow.ts`（纯函数，可单测）

类型：
```ts
export type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
export interface Geometry { x: number; y: number; w: number; h: number }
export interface SizeConstraints { minW: number; minH: number; maxW: number; maxH: number }
```

函数：
- `clampToViewport(geom, vw, vh): Geometry`
  - 宽高先夹到 `[0, vw]` / `[0, vh]`；再把 `x` 夹到 `[0, vw - w]`、`y` 夹到 `[0, vh - h]`（保证窗口完全在视口内）。
- `resizeGeometry(start, dir, dx, dy, c, vw, vh): Geometry`
  - **对侧边锚定**算法。以拖拽开始时的 `start` 几何 + 累计位移 `(dx,dy)` 计算：
    - 含 `e`：`w = start.w + dx`；含 `w`：右边固定 `right=start.x+start.w`，`w = start.w - dx`，再 `x = right - w`。
    - 含 `s`：`h = start.h + dy`；含 `n`：底固定 `bottom=start.y+start.h`，`h = start.h - dy`，再 `y = bottom - h`。
  - `w` 夹到 `[c.minW, c.maxW]`、`h` 夹到 `[c.minH, c.maxH]`；夹完后对 `w`/`n` 方向重算 `x`/`y` 使对侧边保持锚定。
  - 最终 `clampToViewport` 兜底。

### 2.2 新增 `src/composables/useFloatingWindow.ts`

```ts
export function useFloatingWindow(initial: Geometry, constraints: SizeConstraints)
// 返回 { x, y, w, h, style, startDrag, startResize, reset? }
```
- 持有响应式 `x/y/w/h`（用 `reactive` 或四个 ref）。
- `style = computed(() => ({ left: x+'px', top: y+'px', width: w+'px', height: h+'px' }))`。
- `startDrag(e: PointerEvent)`：记录起始指针与几何，`window` 上挂 `pointermove`/`pointerup`，move 时 `x/y = clampToViewport(start + delta)`；up 时移除监听。
- `startResize(e: PointerEvent, dir: ResizeDir)`：同上，move 时调用 `resizeGeometry`。
- 视口尺寸用 `window.innerWidth/innerHeight`。
- 拖拽/缩放期间设置一个 `dragging` 标志（供组件关掉 transition）。
- 组件卸载时 `onScopeDispose`/`onUnmounted` 清理任何残留监听。

> geometry 在 `AiAssistant` 中实例化并持有 → 开关期间位置/尺寸保留（与会话内存一致）。

### 2.3 `AiChatDrawer.vue` → 重命名 `AiChatWindow.vue`

- 外壳：`el-drawer` 改为 `position: fixed` 的定位 div，`:style="fw.style"`。
- **内部 header / 消息列表 / 空状态 chip / 输入区 / 清空逻辑全部原样保留**。
- header 作拖拽手柄：标题区 `@pointerdown="fw.startDrag"`；清空按钮、新增的关闭 × 按钮加 `@pointerdown.stop` 防误触发拖拽。
- 新增关闭 × 按钮（emit `update:modelValue=false`），因为浮动窗没有抽屉遮罩可点关闭。
- 八个 resize 手柄（4 边 + 4 角）：每个绝对定位的小 div，`@pointerdown="(e)=>fw.startResize(e, dir)"`，对应 `cursor`（n/s=ns-resize、e/w=ew-resize、ne/sw=nesw-resize、nw/se=nwse-resize）。
- props：`modelValue: boolean`、`chat: ReturnType<typeof useAiChat>`、`fw: ReturnType<typeof useFloatingWindow>`。
- 拖拽中（`fw.dragging`）给根节点加类名以临时关闭 `transition`（避免与跟手位移打架）。

### 2.4 `AiAssistant.vue` 改造

- 实例化 `const fw = useFloatingWindow(initialGeom, constraints)`（geometry 持久于此）。
- `<AiFab @click="open = !open" />`（toggle）。
- `<Transition name="ai-window"><AiChatWindow v-if="open" v-model="open" :chat="chat" :fw="fw" /></Transition>`。

---

## 3. 动画

- **开合**：`<Transition name="ai-window">` + CSS：
  - enter-from / leave-to：`opacity: 0; transform: scale(0.85)`；
  - `transform-origin: bottom right`（对准右下角悬浮球弹出原点）；
  - `transition: opacity .2s, transform .22s cubic-bezier(.16,1,.3,1)`；关闭逆向。
- **跟手**：拖拽/缩放期间根节点加 `is-dragging` 类，置 `transition: none`，靠 `left/top/width/height` 直接跟手，松手即停。
- 悬浮球既有 hover 缩放动画保留。

---

## 4. 默认值与约束

- 初始尺寸 `380 × 560`；初始位置贴右下角：`x = vw - 380 - 24`、`y = vh - 560 - 24`（贴近 FAB），并 `clampToViewport`。
- 约束 `minW 320 / minH 360 / maxW = vw / maxH = vh`。
- z-index 高于 FAB（FAB 2000 → 窗口 2001）。
- pointer 事件天然兼容触摸。
- 窗口打开时若视口很小，初始几何经 `clampToViewport` 自适应。

---

## 5. 测试

- `tests/floatingWindow.spec.ts`（纯函数）：
  - `resizeGeometry` 八方向：e/s 从固定边生长；w/n 对侧锚定；min 触底时对侧边不动；max 截顶；角方向同时作用两轴。
  - `clampToViewport`：超右/超下回拉、宽高超视口被夹、负坐标归零。
- composable / 组件：`pnpm typecheck` + `pnpm build` + 手动验证（沿用本项目无组件单测惯例）。

---

## 6. 非目标（YAGNI）

- 不持久化位置/尺寸到 localStorage（仅会话内存）。
- 不做最小化 / 最大化 / 吸附边缘。
- 不改会话状态机 / SSE / 打字机 / 后端。
- 不改悬浮球位置与样式（仅改其点击为 toggle）。
