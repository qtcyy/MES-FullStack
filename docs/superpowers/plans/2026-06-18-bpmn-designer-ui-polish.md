# BPMN 流程模型设计器 UI 完善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `/workflow/model` 的 bpmn-js 设计器画布从默认外观提升为「专业流程图」级别——语义化节点配色（方向 A）、画布外壳主题统一、缩放/撤销/重做浮层工具栏、小地图、检查定义错误高亮。

**Architecture:** 混合方案——CSS 主题层（`bpmn-theme.css`）管画布外壳；高优先级 diagram-js `CustomRenderer` 通过给默认 `BpmnRenderer.drawShape/drawConnection` 传 `attrs`（`fill`/`stroke`）实现语义着色，不重画形状；React 浮层工具栏用 `@workspace/ui` Button 调 modeler 的 `canvas`/`commandStack`；接入 `diagram-js-minimap` 模块。纯色彩映射与错误节点提取逻辑抽成纯函数并用 vitest TDD。

**Tech Stack:** React 18 + TS + Vite，bpmn-js ^18.18.0，diagram-js-minimap，@workspace/ui（shadcn/Radix），lucide-react，vitest，Tailwind v4。

**Spec:** `docs/superpowers/specs/2026-06-18-bpmn-designer-ui-polish-design.md`

**通用工作目录：** pnpm 命令在 `mes/frontend` 下执行（用 `--filter mes-new` 定位 app）。git 命令中的 `<repo-root>` 一律指仓库根绝对路径 `/Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack`。

---

## File Structure

| 文件 | 职责 | 动作 |
|---|---|---|
| `apps/mes-new/package.json` | 新增 `diagram-js-minimap` 依赖 | Modify |
| `src/pages/workflow/model/bpmnTheme.ts` | 语义配色常量映射 + `colorFor` + `currentMode` 纯函数 | Create |
| `src/pages/workflow/model/__tests__/bpmnTheme.test.ts` | `colorFor`/`currentMode` 单测 | Create |
| `src/pages/workflow/model/CustomRenderer.ts` | diagram-js 渲染模块：委托默认渲染并按类型着色 | Create |
| `src/pages/workflow/model/bpmn-theme.css` | 画布外壳主题（网格/调色板/上下文菜单/选中态/错误高亮/小地图 chrome/暗色标签） | Create |
| `src/types/diagram-js-minimap.d.ts` | `diagram-js-minimap` 与 diagram-js 子模块的环境声明 | Create |
| `src/pages/workflow/model/BpmnDesigner.tsx` | 注册模块、import 主题/小地图 CSS、浮层工具栏、暴露 `markErrors`/`clearErrors`、缩放/撤销状态 | Modify |
| `src/pages/workflow/model/bpmnUtils.ts` | 新增纯函数 `errorTaskIds` | Modify |
| `src/pages/workflow/model/__tests__/bpmnUtils.test.ts` | `errorTaskIds` 单测 | Create |
| `src/pages/workflow/model/ModelDesignerDialog.tsx` | 检查定义联动错误高亮 | Modify |

---

## Task 1: 依赖 + 画布外壳主题（CSS / 网格 / 小地图模块）

**Files:**
- Modify: `apps/mes-new/package.json`（经 pnpm add 自动写入）
- Create: `src/pages/workflow/model/bpmn-theme.css`
- Create: `src/types/diagram-js-minimap.d.ts`
- Modify: `src/pages/workflow/model/BpmnDesigner.tsx`（import CSS、注册 minimap 模块、默认折叠）

- [ ] **Step 1: 安装 diagram-js-minimap**

Run（在 `mes/frontend` 仓库根，用 filter 定位 app）:
```bash
cd mes/frontend && pnpm --filter mes-new add diagram-js-minimap
```
Expected: 安装成功，`apps/mes-new/package.json` 的 dependencies 出现 `"diagram-js-minimap": "^5.x"`（或当前最新），pnpm-lock 更新。

- [ ] **Step 2: 为无类型的包补环境声明**

Create `src/types/diagram-js-minimap.d.ts`:
```ts
declare module 'diagram-js-minimap' {
  const minimapModule: { __init__: string[]; [key: string]: unknown }
  export default minimapModule
}

declare module 'diagram-js/lib/draw/BaseRenderer' {
  export default class BaseRenderer {
    constructor(eventBus: unknown, priority?: number)
    canRender(element: unknown): boolean
    drawShape(parent: unknown, element: unknown): SVGElement
    drawConnection(parent: unknown, element: unknown): SVGElement
    getShapePath(element: unknown): string
    getConnectionPath(connection: unknown): string
  }
}
```

- [ ] **Step 3: 创建画布外壳主题 CSS**

Create `src/pages/workflow/model/bpmn-theme.css`:
```css
/* BPMN 设计器外壳主题：跟随 app 的 shadcn/Tailwind token，亮/暗自适应。
   语义节点配色由 CustomRenderer 负责，这里只管画布外壳与标签/错误态。 */

/* 点阵网格背景 */
.djs-container {
  background-color: var(--background);
  background-image: radial-gradient(var(--border) 1px, transparent 1px);
  background-size: 18px 18px;
}

/* 调色板：卡片化 */
.djs-palette {
  border: 1px solid var(--border) !important;
  border-radius: var(--radius, 8px) !important;
  background: var(--card) !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08) !important;
  overflow: hidden;
}
.djs-palette .entry {
  color: var(--muted-foreground) !important;
  border-radius: 6px;
  margin: 2px;
  transition: background-color 0.12s, color 0.12s;
}
.djs-palette .entry:hover {
  background: var(--accent) !important;
  color: var(--accent-foreground) !important;
}
.djs-palette .separator {
  border-bottom: 1px solid var(--border) !important;
  margin: 4px 6px !important;
}

/* 上下文菜单：卡片化 */
.djs-context-pad .entry {
  border-radius: 6px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12) !important;
  background: var(--card) !important;
  color: var(--muted-foreground) !important;
  border: 1px solid var(--border) !important;
}
.djs-context-pad .entry:hover {
  background: var(--accent) !important;
  color: var(--accent-foreground) !important;
}

/* 选中 / hover 态 */
.djs-element.selected .djs-outline {
  stroke: var(--primary) !important;
  stroke-width: 2px !important;
}
.djs-element.hover .djs-outline {
  stroke: var(--ring) !important;
}

/* 暗色画布下标签文字提亮（语义填充为半透明，需保证对比度） */
.dark .djs-label,
.dark text.djs-label,
.dark .djs-element text {
  fill: #e6e9ef;
}

/* 检查定义未通过：问题节点红色描边 + 脉冲 */
.djs-element.bpmn-error .djs-visual > :nth-child(1) {
  stroke: #e11d48 !important;
  stroke-width: 2.5px !important;
}
.djs-element.bpmn-error {
  animation: bpmn-error-pulse 1.1s ease-in-out infinite;
}
@keyframes bpmn-error-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}

/* 小地图 chrome 卡片化 */
.djs-minimap {
  border: 1px solid var(--border) !important;
  border-radius: var(--radius, 8px) !important;
  background: var(--card) !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1) !important;
  overflow: hidden;
}
.djs-minimap .toggle {
  background: var(--muted) !important;
  color: var(--muted-foreground) !important;
}
.djs-minimap .map {
  background: var(--background) !important;
}
```

- [ ] **Step 4: 在 BpmnDesigner 注册小地图模块并引入 CSS**

Modify `src/pages/workflow/model/BpmnDesigner.tsx` —— 在文件顶部的 import 区，把现有 css import 段替换为下列内容（新增 minimap css、本地主题 css、minimap 模块）：

把：
```ts
import Modeler from 'bpmn-js/lib/Modeler'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import flowableModdle from './flowableModdle'
```
改为：
```ts
import Modeler from 'bpmn-js/lib/Modeler'
import minimapModule from 'diagram-js-minimap'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import 'diagram-js-minimap/assets/diagram-js-minimap.css'
import './bpmn-theme.css'
import flowableModdle from './flowableModdle'
```

然后把 modeler 实例化（`const modeler = new Modeler({...})`）改为带 `additionalModules`：
```ts
    const modeler = new Modeler({
      container: containerRef.current,
      additionalModules: [minimapModule],
      moddleExtensions: { flowable: flowableModdle },
    })
```

并在 `importXML(...).then(...)` 的回调里，`canvas.zoom('fit-viewport')` 之后追加默认折叠小地图（同一 then 块内）：
```ts
      .then(() => {
        const canvas = modeler.get<{ zoom: (m: string) => void }>('canvas')
        canvas.zoom('fit-viewport')
        const minimap = modeler.get<{ close: () => void }>('minimap')
        minimap.close()
      })
```

> 注：`bpmn-theme.css` 在 bpmn-js 默认样式表之后 import，保证覆盖优先级。

- [ ] **Step 5: 类型检查 + lint + 构建**

Run:
```bash
cd mes/frontend && pnpm --filter mes-new check-types && pnpm --filter mes-new lint && pnpm --filter mes-new build
```
Expected: 三者均无错误退出（exit 0）。若 `minimap.close` 类型报错，确认 `modeler.get<...>('minimap')` 的泛型与调用一致。

- [ ] **Step 6: 运行时人工核对（dev）**

Run（后台起 dev，或用户已开着）:
```bash
cd mes/frontend && pnpm --filter mes-new dev
```
打开 `http://localhost:4100/workflow/model` → 进入任一模型设计器，核对：
- 画布出现点阵网格背景
- 左侧调色板为卡片样式（圆角/边框/阴影），hover 高亮
- 右下角出现小地图（默认折叠态，可点击展开）
- 切到暗色主题画布与外壳协调

- [ ] **Step 7: Commit**

```bash
git -C <repo-root> add mes/frontend/apps/mes-new/package.json mes/frontend/pnpm-lock.yaml \
  mes/frontend/apps/mes-new/src/pages/workflow/model/bpmn-theme.css \
  mes/frontend/apps/mes-new/src/types/diagram-js-minimap.d.ts \
  mes/frontend/apps/mes-new/src/pages/workflow/model/BpmnDesigner.tsx
git -C <repo-root> commit -m "✨ feat(mes-new): BPMN 设计器画布外壳主题(网格/调色板/小地图)"
```

---

## Task 2: 语义化配色（bpmnTheme 纯函数 TDD + CustomRenderer）

**Files:**
- Create: `src/pages/workflow/model/bpmnTheme.ts`
- Test: `src/pages/workflow/model/__tests__/bpmnTheme.test.ts`
- Create: `src/pages/workflow/model/CustomRenderer.ts`
- Modify: `src/pages/workflow/model/BpmnDesigner.tsx`（注册 CustomRenderer 模块）

- [ ] **Step 1: 写失败测试（颜色映射纯函数）**

Create `src/pages/workflow/model/__tests__/bpmnTheme.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { colorFor } from '../bpmnTheme'

describe('colorFor', () => {
  it('开始事件 → 绿(亮色)', () => {
    expect(colorFor('bpmn:StartEvent', 'light')).toEqual({ stroke: '#059669', fill: '#d1fae5' })
  })
  it('结束事件 → 红(暗色)', () => {
    expect(colorFor('bpmn:EndEvent', 'dark')).toEqual({ stroke: '#fb7185', fill: 'rgba(244,63,94,.18)' })
  })
  it('用户任务 → 蓝(亮色)', () => {
    expect(colorFor('bpmn:UserTask', 'light')).toEqual({ stroke: '#2563eb', fill: '#dbeafe' })
  })
  it('普通任务也按任务着色', () => {
    expect(colorFor('bpmn:Task', 'light')?.stroke).toBe('#2563eb')
  })
  it('网关 → 琥珀(亮色)', () => {
    expect(colorFor('bpmn:ExclusiveGateway', 'light')).toEqual({ stroke: '#d97706', fill: '#fef3c7' })
  })
  it('未覆盖类型返回 null(保留默认渲染)', () => {
    expect(colorFor('bpmn:SubProcess', 'light')).toBeNull()
    expect(colorFor(undefined, 'light')).toBeNull()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
cd mes/frontend && pnpm --filter mes-new exec vitest run src/pages/workflow/model/__tests__/bpmnTheme.test.ts
```
Expected: FAIL —— 报 `Cannot find module '../bpmnTheme'` 或 `colorFor is not a function`。

- [ ] **Step 3: 实现 bpmnTheme.ts**

Create `src/pages/workflow/model/bpmnTheme.ts`:
```ts
/** 节点语义配色（方向 A：语义鲜明 / 填充色）。详见 spec §3。 */
export type ThemeMode = 'light' | 'dark'
export interface NodeColor {
  stroke: string
  fill: string
}

type Category = 'start' | 'end' | 'task' | 'gateway'

const PALETTE: Record<Category, Record<ThemeMode, NodeColor>> = {
  start: {
    light: { stroke: '#059669', fill: '#d1fae5' },
    dark: { stroke: '#34d399', fill: 'rgba(16,185,129,.18)' },
  },
  end: {
    light: { stroke: '#e11d48', fill: '#ffe4e6' },
    dark: { stroke: '#fb7185', fill: 'rgba(244,63,94,.18)' },
  },
  task: {
    light: { stroke: '#2563eb', fill: '#dbeafe' },
    dark: { stroke: '#60a5fa', fill: 'rgba(59,130,246,.20)' },
  },
  gateway: {
    light: { stroke: '#d97706', fill: '#fef3c7' },
    dark: { stroke: '#fbbf24', fill: 'rgba(245,158,11,.18)' },
  },
}

/** 连线描边色（中性灰） */
export const FLOW_STROKE: Record<ThemeMode, string> = {
  light: '#64748b',
  dark: '#7c8699',
}

function categoryOf(type: string): Category | null {
  if (type === 'bpmn:StartEvent') return 'start'
  if (type === 'bpmn:EndEvent') return 'end'
  if (type.includes('Gateway')) return 'gateway'
  if (type.includes('Task')) return 'task'
  return null
}

/** 按节点类型 + 主题返回语义配色；未覆盖类型返回 null（交回默认渲染）。 */
export function colorFor(type: string | undefined, mode: ThemeMode): NodeColor | null {
  if (!type) return null
  const cat = categoryOf(type)
  return cat ? PALETTE[cat][mode] : null
}

/** 读取当前主题模式：html 带 .dark 类即暗色。 */
export function currentMode(): ThemeMode {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
    return 'dark'
  }
  return 'light'
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
cd mes/frontend && pnpm --filter mes-new exec vitest run src/pages/workflow/model/__tests__/bpmnTheme.test.ts
```
Expected: PASS（6 个用例全绿）。

- [ ] **Step 5: 实现 CustomRenderer.ts**

Create `src/pages/workflow/model/CustomRenderer.ts`:
```ts
import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer'
import { colorFor, currentMode, FLOW_STROKE } from './bpmnTheme'

const HIGH_PRIORITY = 1500

interface El {
  type?: string
  labelTarget?: unknown
  businessObject?: { $type?: string }
}
interface BpmnRenderer {
  drawShape(parent: unknown, element: unknown, attrs?: Record<string, string>): SVGElement
  drawConnection(parent: unknown, element: unknown, attrs?: Record<string, string>): SVGElement
}

/**
 * 语义化着色：委托默认 BpmnRenderer.drawShape/drawConnection，并通过其 attrs
 * 入参覆盖 fill/stroke（bpmn-js v9+ 支持），不重画形状，最大化兼容默认行为。
 */
export default class CustomRenderer extends BaseRenderer {
  static $inject = ['eventBus', 'bpmnRenderer']
  private bpmnRenderer: BpmnRenderer

  constructor(eventBus: unknown, bpmnRenderer: BpmnRenderer) {
    super(eventBus, HIGH_PRIORITY)
    this.bpmnRenderer = bpmnRenderer
  }

  canRender(element: unknown): boolean {
    // 接管形状与连线渲染，跳过外部标签（labelTarget 存在即为标签）
    return !(element as El).labelTarget
  }

  drawShape(parent: unknown, element: unknown): SVGElement {
    const type = (element as El).businessObject?.$type ?? (element as El).type
    const c = colorFor(type, currentMode())
    return c
      ? this.bpmnRenderer.drawShape(parent, element, { fill: c.fill, stroke: c.stroke })
      : this.bpmnRenderer.drawShape(parent, element)
  }

  drawConnection(parent: unknown, element: unknown): SVGElement {
    return this.bpmnRenderer.drawConnection(parent, element, { stroke: FLOW_STROKE[currentMode()] })
  }
}

export const customRendererModule = {
  __init__: ['customRenderer'],
  customRenderer: ['type', CustomRenderer] as ['type', typeof CustomRenderer],
}
```

- [ ] **Step 6: 在 BpmnDesigner 注册 CustomRenderer 模块**

Modify `src/pages/workflow/model/BpmnDesigner.tsx`：

在 import 区新增（紧跟 `import minimapModule from 'diagram-js-minimap'` 之后）：
```ts
import { customRendererModule } from './CustomRenderer'
```

把 `additionalModules` 改为同时包含两个模块：
```ts
      additionalModules: [minimapModule, customRendererModule],
```

- [ ] **Step 7: 类型检查 + lint + 测试 + 构建**

Run:
```bash
cd mes/frontend && pnpm --filter mes-new check-types && pnpm --filter mes-new lint && pnpm --filter mes-new test && pnpm --filter mes-new build
```
Expected: 全部 exit 0；vitest 含新增 bpmnTheme 用例全绿。

- [ ] **Step 8: 运行时人工核对**

`http://localhost:4100/workflow/model` 设计器内核对：开始事件绿、结束事件红、用户/普通任务蓝、网关琥珀、连线中性灰；暗色主题下颜色仍清晰（标签文字提亮）。

> 已知限制：设计器打开期间切换亮/暗主题，已渲染节点不会即时重新着色（需重新打开弹窗）。属可接受的次要项，记录于 spec 非目标。

- [ ] **Step 9: Commit**

```bash
git -C <repo-root> add mes/frontend/apps/mes-new/src/pages/workflow/model/bpmnTheme.ts \
  mes/frontend/apps/mes-new/src/pages/workflow/model/__tests__/bpmnTheme.test.ts \
  mes/frontend/apps/mes-new/src/pages/workflow/model/CustomRenderer.ts \
  mes/frontend/apps/mes-new/src/pages/workflow/model/BpmnDesigner.tsx
git -C <repo-root> commit -m "✨ feat(mes-new): BPMN 节点语义化配色(开始绿/任务蓝/网关琥珀/结束红)"
```

---

## Task 3: 缩放 / 撤销 / 重做 浮层工具栏

**Files:**
- Modify: `src/pages/workflow/model/BpmnDesigner.tsx`（relative 包裹 + 浮层工具栏 + modeler 状态订阅）

- [ ] **Step 1: 在 BpmnDesigner 顶部补充图标与 Button import**

Modify `src/pages/workflow/model/BpmnDesigner.tsx`，在 import 区新增：
```ts
import { Button } from '@workspace/ui'
import { ZoomIn, ZoomOut, Maximize, RotateCcw, Undo2, Redo2 } from 'lucide-react'
```
并确保从 `react` 引入了 `useState`（现有为 `useEffect, useImperativeHandle, useRef`，改为）：
```ts
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
```

- [ ] **Step 2: 新增工具栏状态 + modeler 事件订阅**

在组件内（`const onSelectRef = useRef(onSelect)` 之后）新增状态：
```ts
  const [zoom, setZoom] = useState(1)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
```

在创建 modeler 的 `useEffect` 内，`element.changed` 订阅之后、`importXML` 之前，新增订阅：
```ts
    modeler.on('canvas.viewbox.changed', (e: unknown) => {
      const scale = (e as { viewbox: { scale: number } }).viewbox?.scale
      if (typeof scale === 'number') setZoom(scale)
    })
    modeler.on('commandStack.changed', () => {
      const cs = modeler.get<{ canUndo: () => boolean; canRedo: () => boolean }>('commandStack')
      setCanUndo(cs.canUndo())
      setCanRedo(cs.canRedo())
    })
```

- [ ] **Step 3: 新增工具栏操作 handler**

在组件内、`useImperativeHandle(...)` 调用之后、`return (...)` 之前新增：
```ts
  const getCanvas = () =>
    modelerRef.current?.get<{ zoom: (s?: number | string, c?: string) => number }>('canvas')
  const getStack = () =>
    modelerRef.current?.get<{ undo: () => void; redo: () => void }>('commandStack')

  const zoomBy = (factor: number) => {
    const canvas = getCanvas()
    if (!canvas) return
    canvas.zoom(canvas.zoom() * factor)
  }
  const fit = () => getCanvas()?.zoom('fit-viewport', 'auto')
  const reset = () => getCanvas()?.zoom(1)
  const undo = () => getStack()?.undo()
  const redo = () => getStack()?.redo()
```

- [ ] **Step 4: 用 relative 容器包裹画布并加浮层工具栏**

把组件末尾的：
```tsx
  return <div ref={containerRef} className="h-full w-full" />
```
替换为：
```tsx
  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-lg border bg-card/95 px-1.5 py-1 shadow-md backdrop-blur">
        <Button variant="ghost" size="icon" className="size-8" title="缩小" onClick={() => zoomBy(1 / 1.2)}>
          <ZoomOut className="size-4" />
        </Button>
        <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <Button variant="ghost" size="icon" className="size-8" title="放大" onClick={() => zoomBy(1.2)}>
          <ZoomIn className="size-4" />
        </Button>
        <div className="mx-1 h-5 w-px bg-border" />
        <Button variant="ghost" size="icon" className="size-8" title="适应窗口" onClick={fit}>
          <Maximize className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" className="size-8" title="实际大小(100%)" onClick={reset}>
          <RotateCcw className="size-4" />
        </Button>
        <div className="mx-1 h-5 w-px bg-border" />
        <Button variant="ghost" size="icon" className="size-8" title="撤销" disabled={!canUndo} onClick={undo}>
          <Undo2 className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" className="size-8" title="重做" disabled={!canRedo} onClick={redo}>
          <Redo2 className="size-4" />
        </Button>
      </div>
    </div>
  )
```

> 注：工具栏放底部居中（不与右下角小地图重叠）。

- [ ] **Step 5: 类型检查 + lint + 构建**

Run:
```bash
cd mes/frontend && pnpm --filter mes-new check-types && pnpm --filter mes-new lint && pnpm --filter mes-new build
```
Expected: 全部 exit 0。若 `Button` 无 `size="icon"`，改用 `size="sm"` 并保留 `className="size-8 p-0"`（先确认 `@workspace/ui` Button 的 size 取值；shadcn 默认含 `icon`）。

- [ ] **Step 6: 运行时人工核对**

设计器内：底部浮层工具栏可见；放大/缩小改变缩放且百分比实时更新；适应窗口居中铺满；100% 复位；初始无操作时撤销/重做禁用，编辑后启用并生效。

- [ ] **Step 7: Commit**

```bash
git -C <repo-root> add mes/frontend/apps/mes-new/src/pages/workflow/model/BpmnDesigner.tsx
git -C <repo-root> commit -m "✨ feat(mes-new): BPMN 设计器缩放/撤销/重做浮层工具栏"
```

---

## Task 4: 检查定义 → 问题节点红色高亮联动

**Files:**
- Modify: `src/pages/workflow/model/bpmnUtils.ts`（新增 `errorTaskIds`）
- Test: `src/pages/workflow/model/__tests__/bpmnUtils.test.ts`
- Modify: `src/pages/workflow/model/BpmnDesigner.tsx`（`BpmnDesignerHandle` 增 `markErrors`/`clearErrors`）
- Modify: `src/pages/workflow/model/ModelDesignerDialog.tsx`（handleValidate 联动）

- [ ] **Step 1: 写失败测试（问题用户任务 id 提取）**

Create `src/pages/workflow/model/__tests__/bpmnUtils.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { errorTaskIds } from '../bpmnUtils'
import type { BpmnSummary } from '../bpmnUtils'

function summary(userTasks: BpmnSummary['userTasks']): BpmnSummary {
  return { hasStart: true, hasEnd: true, userTasks, disconnectedCount: 0 }
}

describe('errorTaskIds', () => {
  it('未命名的任务被标记', () => {
    expect(errorTaskIds(summary([{ id: 'T1', assignee: '${initiator}' }]))).toEqual(['T1'])
  })
  it('未配置办理人的任务被标记', () => {
    expect(errorTaskIds(summary([{ id: 'T2', name: '审批' }]))).toEqual(['T2'])
  })
  it('名称为纯空白视为未命名', () => {
    expect(errorTaskIds(summary([{ id: 'T3', name: '   ', candidateGroups: 'role_a' }]))).toEqual(['T3'])
  })
  it('完整配置的任务不被标记', () => {
    expect(errorTaskIds(summary([{ id: 'T4', name: '审批', assignee: '${initiator}' }]))).toEqual([])
  })
  it('混合：只返回有问题的 id', () => {
    const ids = errorTaskIds(
      summary([
        { id: 'A', name: '好', candidateGroups: 'r1' },
        { id: 'B', name: '坏' },
      ]),
    )
    expect(ids).toEqual(['B'])
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
cd mes/frontend && pnpm --filter mes-new exec vitest run src/pages/workflow/model/__tests__/bpmnUtils.test.ts
```
Expected: FAIL —— `errorTaskIds` 未导出 / 不是函数。

- [ ] **Step 3: 实现 errorTaskIds**

Modify `src/pages/workflow/model/bpmnUtils.ts`，在 `validateSummary` 函数之后新增：
```ts
/** 纯函数:提取「未命名」或「未配置办理人」的用户任务 id（与 validateSummary 判定一致），用于画布错误高亮。 */
export function errorTaskIds(s: BpmnSummary): string[] {
  return s.userTasks
    .filter((t) => !t.name?.trim() || (!t.assignee && !t.candidateGroups))
    .map((t) => t.id)
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
cd mes/frontend && pnpm --filter mes-new exec vitest run src/pages/workflow/model/__tests__/bpmnUtils.test.ts
```
Expected: PASS（5 个用例全绿）。

- [ ] **Step 5: 给 BpmnDesignerHandle 增加 markErrors / clearErrors**

Modify `src/pages/workflow/model/BpmnDesigner.tsx`：

在 `BpmnDesignerHandle` 接口内新增两个方法声明：
```ts
export interface BpmnDesignerHandle {
  getXML: () => Promise<string>
  getSummary: () => BpmnSummary
  updateSelected: (props: Record<string, unknown>) => void
  /** 给指定节点加红色错误标记 */
  markErrors: (ids: string[]) => void
  /** 清除上一次的错误标记 */
  clearErrors: () => void
}
```

在组件内新增已标记 id 的引用（与其它 ref 放一起）：
```ts
  const errorIdsRef = useRef<string[]>([])
```

在 `useImperativeHandle(ref, () => ({ ... }))` 的返回对象内，`updateSelected(...)` 之后新增两个方法：
```ts
    markErrors(ids: string[]) {
      const modeler = modelerRef.current
      if (!modeler) return
      const canvas = modeler.get<{
        addMarker: (id: string, cls: string) => void
        removeMarker: (id: string, cls: string) => void
      }>('canvas')
      errorIdsRef.current.forEach((id) => canvas.removeMarker(id, 'bpmn-error'))
      ids.forEach((id) => canvas.addMarker(id, 'bpmn-error'))
      errorIdsRef.current = ids
    },
    clearErrors() {
      const modeler = modelerRef.current
      if (!modeler) return
      const canvas = modeler.get<{ removeMarker: (id: string, cls: string) => void }>('canvas')
      errorIdsRef.current.forEach((id) => canvas.removeMarker(id, 'bpmn-error'))
      errorIdsRef.current = []
    },
```

- [ ] **Step 6: 在 ModelDesignerDialog 的 handleValidate 联动高亮**

Modify `src/pages/workflow/model/ModelDesignerDialog.tsx`：

把 import 行：
```ts
import { validateSummary, buildAssigneeProps, type AssigneeType } from './bpmnUtils'
```
改为：
```ts
import { validateSummary, errorTaskIds, buildAssigneeProps, type AssigneeType } from './bpmnUtils'
```

把 `handleValidate` 整体替换为：
```ts
  const handleValidate = () => {
    if (!designerRef.current) return
    const summary = designerRef.current.getSummary()
    const result = validateSummary(summary)
    designerRef.current.clearErrors()
    if (result.ok) {
      toast.success('校验通过:流程定义完整')
    } else {
      designerRef.current.markErrors(errorTaskIds(summary))
      toast.error(`校验未通过:${result.issues.join('；')}`)
    }
  }
```

> 行为：每次「检查定义」先清除旧标记；通过则无标记，未通过则高亮问题用户任务。再次检查会刷新标记。

- [ ] **Step 7: 类型检查 + lint + 全量测试 + 构建**

Run:
```bash
cd mes/frontend && pnpm --filter mes-new check-types && pnpm --filter mes-new lint && pnpm --filter mes-new test && pnpm --filter mes-new build
```
Expected: 全部 exit 0；vitest 含 bpmnTheme + bpmnUtils 新用例全绿。

- [ ] **Step 8: 运行时人工核对**

设计器内拖入一个未命名/未配置办理人的用户任务 → 点「检查定义」→ 该节点红色描边 + 脉冲；补全名称与办理人后再次检查 → 提示通过且高亮消失。原「保存」功能不回归。

- [ ] **Step 9: Commit**

```bash
git -C <repo-root> add mes/frontend/apps/mes-new/src/pages/workflow/model/bpmnUtils.ts \
  mes/frontend/apps/mes-new/src/pages/workflow/model/__tests__/bpmnUtils.test.ts \
  mes/frontend/apps/mes-new/src/pages/workflow/model/BpmnDesigner.tsx \
  mes/frontend/apps/mes-new/src/pages/workflow/model/ModelDesignerDialog.tsx
git -C <repo-root> commit -m "✨ feat(mes-new): 检查定义联动高亮问题用户任务节点"
```

---

## 最终验证（对照 spec §6）

- [ ] `pnpm --filter mes-new check-types` 通过
- [ ] `pnpm --filter mes-new lint` 通过
- [ ] `pnpm --filter mes-new test` 全绿
- [ ] `pnpm --filter mes-new build` 通过
- [ ] 运行时 `http://localhost:4100/workflow/model` 七项人工核对（见 spec §6）逐条确认
```
