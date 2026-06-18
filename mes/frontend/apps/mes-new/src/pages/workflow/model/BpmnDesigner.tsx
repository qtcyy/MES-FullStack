import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import Modeler from 'bpmn-js/lib/Modeler'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import flowableModdle from './flowableModdle'
import type { BpmnSummary, UserTaskSummary } from './bpmnUtils'

/** 当前选中元素的扁平视图(驱动属性面板) */
export interface SelectedElement {
  id: string
  type: string
  name?: string
  assignee?: string
  candidateGroups?: string
}

export interface BpmnDesignerHandle {
  getXML: () => Promise<string>
  getSummary: () => BpmnSummary
  /** 给当前选中的用户任务写属性(name 或 flowable:* );值为 undefined 即清除 */
  updateSelected: (props: Record<string, unknown>) => void
}

interface BpmnDesignerProps {
  xml: string
  onSelect: (el: SelectedElement | null) => void
}

/** bpmn-js businessObject 的最小形状 */
interface Bo {
  $type: string
  id: string
  name?: string
  assignee?: string
  candidateGroups?: string
  /** moddle 提供的属性读取器 */
  get?: (name: string) => unknown
  /** 未注册到描述符的扩展属性原始存放处 */
  $attrs?: Record<string, unknown>
}
interface El {
  id: string
  type: string
  businessObject: Bo
  incoming?: unknown[]
  outgoing?: unknown[]
}

/**
 * 健壮读取 flowable 扩展属性:写入用限定名(flowable:assignee),但 moddle 的回读形式
 * 因版本/注册方式而异——可能在 bo.get(限定名)、bo[本地名]、或 bo.$attrs[限定名]。
 * 依次尝试以兼容三者,避免写入后面板读回为空。
 */
function readFlowableAttr(bo: Bo, qualified: string, local: 'assignee' | 'candidateGroups'): string | undefined {
  const viaGet = typeof bo.get === 'function' ? bo.get(qualified) : undefined
  if (viaGet != null && viaGet !== '') return String(viaGet)
  const direct = bo[local]
  if (direct != null && direct !== '') return String(direct)
  const viaAttrs = bo.$attrs?.[qualified]
  if (viaAttrs != null && viaAttrs !== '') return String(viaAttrs)
  return undefined
}

function toSelected(el: El | null): SelectedElement | null {
  if (!el || !el.businessObject) return null
  const bo = el.businessObject
  return {
    id: bo.id,
    type: bo.$type,
    name: bo.name,
    assignee: readFlowableAttr(bo, 'flowable:assignee', 'assignee'),
    candidateGroups: readFlowableAttr(bo, 'flowable:candidateGroups', 'candidateGroups'),
  }
}

const BpmnDesigner = forwardRef<BpmnDesignerHandle, BpmnDesignerProps>(function BpmnDesigner(
  { xml, onSelect },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const modelerRef = useRef<Modeler | null>(null)
  const currentRef = useRef<El | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    if (!containerRef.current) return
    const modeler = new Modeler({
      container: containerRef.current,
      moddleExtensions: { flowable: flowableModdle },
    })
    modelerRef.current = modeler

    modeler.on('selection.changed', (e: unknown) => {
      const sel = (e as { newSelection: El[] }).newSelection
      const el = sel && sel.length === 1 ? sel[0] : null
      currentRef.current = el
      onSelectRef.current(toSelected(el))
    })
    modeler.on('element.changed', (e: unknown) => {
      const changed = (e as { element: El }).element
      if (currentRef.current && changed && changed.id === currentRef.current.id) {
        currentRef.current = changed
        onSelectRef.current(toSelected(changed))
      }
    })

    modeler
      .importXML(xml)
      .then(() => {
        const canvas = modeler.get<{ zoom: (m: string) => void }>('canvas')
        canvas.zoom('fit-viewport')
      })
      .catch((err) => {
        console.error('[BpmnDesigner] importXML 失败', err)
      })

    return () => {
      modeler.destroy()
      modelerRef.current = null
    }
    // 仅挂载时创建一次;xml 后续变化通过重建组件(key) 处理
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useImperativeHandle(ref, () => ({
    async getXML() {
      const modeler = modelerRef.current
      if (!modeler) return xml
      const { xml: out } = await modeler.saveXML({ format: true })
      return out
    },
    getSummary(): BpmnSummary {
      const modeler = modelerRef.current
      const empty: BpmnSummary = { hasStart: false, hasEnd: false, userTasks: [], disconnectedCount: 0 }
      if (!modeler) return empty
      const registry = modeler.get<{ getAll: () => El[] }>('elementRegistry')
      const all = registry.getAll()
      let hasStart = false
      let hasEnd = false
      const userTasks: UserTaskSummary[] = []
      let disconnectedCount = 0
      for (const el of all) {
        const bo = el.businessObject
        const t = bo?.$type
        if (!t || t === 'bpmn:Process' || t === 'bpmn:Collaboration' || t === 'bpmn:SequenceFlow') continue
        if (!t.startsWith('bpmn:')) continue
        if (t === 'bpmn:StartEvent') hasStart = true
        if (t === 'bpmn:EndEvent') hasEnd = true
        if (t === 'bpmn:UserTask') {
          userTasks.push({
            id: bo.id,
            name: bo.name,
            assignee: readFlowableAttr(bo, 'flowable:assignee', 'assignee'),
            candidateGroups: readFlowableAttr(bo, 'flowable:candidateGroups', 'candidateGroups'),
          })
        }
        const inc = el.incoming?.length ?? 0
        const out = el.outgoing?.length ?? 0
        if (inc === 0 && out === 0) disconnectedCount++
      }
      return { hasStart, hasEnd, userTasks, disconnectedCount }
    },
    updateSelected(props: Record<string, unknown>) {
      const modeler = modelerRef.current
      const el = currentRef.current
      if (!modeler || !el) return
      const modeling = modeler.get<{ updateProperties: (e: El, p: Record<string, unknown>) => void }>('modeling')
      modeling.updateProperties(el, props)
    },
  }))

  return <div ref={containerRef} className="h-full w-full" />
})

export default BpmnDesigner
