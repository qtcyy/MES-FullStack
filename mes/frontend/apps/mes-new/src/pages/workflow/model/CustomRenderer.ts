/**
 * CustomRenderer — 语义化节点配色渲染器
 *
 * 不直接 import `diagram-js/lib/draw/BaseRenderer`（该路径在 pnpm 间接依赖下 Rolldown 无法解析），
 * 而是内联 BaseRenderer 的核心逻辑（eventBus 事件注册），行为完全等价。
 * 参考：diagram-js/lib/draw/BaseRenderer.js（MIT）。
 */
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
interface EventBus {
  on(events: string | string[], priority: number, callback: (evt: { type: string }, context: unknown) => unknown): void
}
interface RenderContext {
  element: unknown
  gfx: unknown
  attrs?: Record<string, string>
}

/**
 * 语义化着色：委托默认 BpmnRenderer.drawShape/drawConnection，并通过其 attrs
 * 入参覆盖 fill/stroke（bpmn-js v9+ 支持），不重画形状，最大化兼容默认行为。
 */
export default class CustomRenderer {
  static $inject = ['eventBus', 'bpmnRenderer']
  private bpmnRenderer: BpmnRenderer

  constructor(eventBus: EventBus, bpmnRenderer: BpmnRenderer) {
    this.bpmnRenderer = bpmnRenderer

    // 内联 BaseRenderer 事件注册逻辑
    eventBus.on(['render.shape', 'render.connection'], HIGH_PRIORITY, (evt, context) => {
      const { element, gfx } = context as RenderContext
      if (!this.canRender(element)) return undefined
      if (evt.type === 'render.shape') {
        return this.drawShape(gfx, element)
      }
      return this.drawConnection(gfx, element)
    })
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
