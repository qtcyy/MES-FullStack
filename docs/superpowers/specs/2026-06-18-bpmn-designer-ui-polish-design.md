# BPMN 流程模型设计器 UI 完善 — 设计文档

- 日期：2026-06-18
- 范围：`mes/frontend/apps/mes-new`（当前活跃前端），路由 `/workflow/model` 的流程模型设计器弹窗
- 不涉及：后端、BPMN XML 结构、apps/mes1

## 1. 背景与问题

`/workflow/model` 的设计器（`ModelDesignerDialog` 内嵌 `BpmnDesigner`）目前仅引入 bpmn-js v18 默认样式表（`diagram-js.css` / `bpmn-js.css` / `bpmn-font`），无任何自定义主题，呈现原始的 bpmn-js 外观：

- 调色板/上下文菜单/连线/节点均为默认灰白配色，与 app 的 shadcn + Tailwind 主题割裂，且不适配暗色模式
- 无缩放控件、无撤销/重做、无适应窗口按钮（仅导入时 `fit-viewport` 一次）
- 无小地图，大流程图浏览困难
- 节点不区分语义配色（开始/结束/任务/网关视觉一致，可读性差）

目标：在不改 BPMN XML 结构、不动后端的前提下，把设计器画布提升为「专业流程图」级别的视觉与交互。

## 2. 技术约束

bpmn-js 将节点的 `fill`/`stroke` 以 inline SVG 属性渲染，纯 CSS 无法可靠地「按节点类型」着色。因此：

- **语义化配色** → 必须用 diagram-js 标准扩展点 **自定义 Renderer 模块**实现
- **画布外壳**（调色板、上下文菜单、连线、网格、选中/hover 态、小地图 chrome）→ 用 CSS 覆盖 `.djs-*` 类最稳

最终采用**混合方案**：CSS 主题层 + 高优先级 CustomRenderer（委托默认渲染后改色，不重画形状）+ React 浮层工具栏 + `diagram-js-minimap` 模块。

## 3. 配色风格

采用**专业流程图语义化配色**（参考 Camunda/Flowable 语义），而非单纯跟随 app 主题：

| 节点类型 | stroke | fill | 说明 |
|---|---|---|---|
| StartEvent | emerald 600 / 暗色 400 | emerald 50 / 暗色半透明 | 开始绿 |
| EndEvent | rose 600 / 暗色 400 | rose 50 / 暗色半透明 | 结束红 |
| UserTask / Task | primary（`--primary`） | 任务浅蓝 / `--card` | 任务蓝 |
| Gateway | amber 500 | amber 50 | 网关琥珀 |
| SequenceFlow | 中性灰（`--muted-foreground`） | — | 连线中性 |

画布外壳（调色板/面板/工具栏/小地图）走 app 主题 token（`--card` `--border` `--primary` `--ring` `--accent` `--muted-foreground`），自动适配亮/暗/自定义三套主题。语义节点色在暗色下用对应色阶的较亮值 + 半透明填充，保证对比度。

## 4. 模块设计

新增/修改集中在 `mes/frontend/apps/mes-new/src/pages/workflow/model/`。

### 4.1 画布外壳主题层 — 新增 `bpmn-theme.css`

CSS 覆盖（在 BpmnDesigner 内于默认 bpmn-js 样式表之后 import，确保优先级）：

- **点阵网格背景**：`.djs-container` 用 radial-gradient 点阵，颜色基于 `--border`，暗色自适应
- **调色板** `.djs-palette`：卡片化（圆角 `--radius`、阴影、`--card` 背景、`--border` 边框）；图标 hover 用 `--accent` 背景
- **上下文菜单** `.djs-context-pad` `.entry`：同样卡片化、hover 高亮
- **连线** `.djs-connection`：默认描边交由 Renderer，CSS 仅管 hover/选中
- **标签字体**：跟随 app 字体栈
- **选中态**：`.djs-element.selected` outline 用 `--primary`；**hover** 用 `--ring`
- **校验错误高亮**：`.bpmn-error` 类（由「检查定义」联动添加）→ 红色描边 + 轻微脉冲动画
- **小地图 chrome** `.djs-minimap`：卡片化、`--card`/`--border`、暗色适配

### 4.2 语义化 Renderer — 新增 `CustomRenderer.ts`

diagram-js 模块，导出 `{ __init__: ['customRenderer'], customRenderer: ['type', CustomRenderer] }`：

- `CustomRenderer extends BaseRenderer`，构造时注入 `bpmnRenderer`（默认 `BpmnRenderer`），`priority` 设为高于默认（如 1500）
- `canRender(element)` 返回 true（接管渲染）
- `drawShape(parentNode, element)`：先调用默认 `bpmnRenderer.drawShape` 得到 gfx，再按 `element.type`（或 businessObject.$type）修改返回 SVG 的 `fill`/`stroke`（用 tinycolor 无需引入，直接读 CSS 变量计算的最终色值或固定色阶常量），并加圆角/轻投影
- `drawConnection`：委托默认后改连线描边为中性灰
- 颜色取值：定义常量映射表（含亮/暗两套），运行时根据 `document.documentElement` 当前主题类选择；或直接用与 globals.css 协调的固定 hex（实现阶段二选一，优先固定 hex 常量 + 暗色变体，简单可靠）

注册：在 `BpmnDesigner` 的 `new Modeler({ additionalModules: [customRendererModule, minimapModule], ... })`。

### 4.3 React 浮层工具栏 — 修改 `BpmnDesigner.tsx`（内联渲染或抽小组件）

画布右下角绝对定位浮层，用 `@workspace/ui` 的 `Button`（size icon / variant outline）+ lucide 图标，卡片化容器（`--card`/`--border`/阴影）：

- 放大（`ZoomIn`）→ `zoomScroll.stepZoom(1)` 或 `canvas.zoom(canvas.zoom() * 1.2)`
- 缩小（`ZoomOut`）→ 反向
- 适应窗口（`Maximize`）→ `canvas.zoom('fit-viewport')`
- 重置 100%（`Scan`/`RotateCcw`）→ `canvas.zoom(1)` 并居中
- 撤销（`Undo2`）→ `commandStack.undo()`，可用性绑定 `commandStack.canUndo()`
- 重做（`Redo2`）→ `commandStack.redo()`，绑定 `canRedo()`
- 当前缩放百分比文字展示（监听 `canvas.viewbox.changed`）

工具栏需能访问 modeler 实例：在 BpmnDesigner 内通过 ref 持有的 modeler 暴露操作；undo/redo 可用性用 state + `commandStack.changed`/`canvas.viewbox.changed` 事件同步。

### 4.4 小地图 — 新增依赖 `diagram-js-minimap`

- `pnpm --filter mes-new add diagram-js-minimap`
- import 其 CSS 与模块，加入 `additionalModules`
- 通过 `minimap` 服务设默认折叠（`minimap.toggle(false)`），右下角，外壳 CSS 见 4.1

### 4.5 校验错误联动 — 修改 `ModelDesignerDialog.tsx`

「检查定义」当前调用 `validateSummary` 弹文字结果。增强：校验失败时，对问题用户任务（未命名/无办理人）通过 `canvas.addMarker(elementId, 'bpmn-error')` 高亮；下次校验或元素变更时 `removeMarker` 清除。需要 BpmnDesigner 暴露 `markErrors(ids: string[])` / `clearErrors()` 命令式方法（加入 `BpmnDesignerHandle`）。

## 5. 文件清单

| 文件 | 动作 |
|---|---|
| `pages/workflow/model/bpmn-theme.css` | 新增（外壳主题 + 错误高亮 + 小地图 chrome） |
| `pages/workflow/model/CustomRenderer.ts` | 新增（语义化节点/连线着色模块） |
| `pages/workflow/model/BpmnDesigner.tsx` | 修改（注册模块、import 主题 CSS、浮层工具栏、暴露 markErrors/clearErrors、缩放/撤销状态） |
| `pages/workflow/model/ModelDesignerDialog.tsx` | 修改（检查定义联动错误高亮） |
| `apps/mes-new/package.json` | 新增依赖 `diagram-js-minimap` |

## 6. 验证标准

- `pnpm --filter mes-new exec tsc --noEmit` 通过
- `pnpm --filter mes-new build` 通过（或 dev 起服无报错）
- `pnpm lint` 通过
- 运行时（:4100 `/workflow/model` 打开设计器）人工核对：
  1. 节点按语义着色（开始绿/结束红/任务蓝/网关琥珀），连线中性灰
  2. 调色板/上下文菜单/小地图卡片化，亮/暗主题切换下均协调
  3. 点阵网格背景显示
  4. 右下浮层工具栏：放大/缩小/适应/重置/撤销/重做可用，缩放百分比实时更新，undo/redo 在无可撤销时禁用
  5. 小地图右下角可展开/折叠、可点击导航
  6. 「检查定义」失败时问题节点红色高亮，修正后清除
  7. 保存/检查定义原有功能不回归

## 7. 非目标（YAGNI）

- 不重写 PropertiesPanel（仅在错误联动需要时小改）
- 不新增节点类型/不改 flowableModdle
- 不做完整 bpmn-js properties-panel 官方面板替换
- 不改后端、不改 BPMN XML 模板
