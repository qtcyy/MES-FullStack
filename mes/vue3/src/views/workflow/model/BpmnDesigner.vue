<template>
  <div class="bpmn-designer">
    <div ref="containerRef" class="bpmn-designer__canvas" />
    <div class="bpmn-designer__toolbar">
      <el-button text size="small" title="缩小" @click="zoomBy(1 / 1.2)">
        <el-icon><ZoomOut /></el-icon>
      </el-button>
      <span class="bpmn-designer__zoom">{{ Math.round(zoom * 100) }}%</span>
      <el-button text size="small" title="放大" @click="zoomBy(1.2)">
        <el-icon><ZoomIn /></el-icon>
      </el-button>
      <el-divider direction="vertical" />
      <el-button text size="small" title="适应窗口" @click="fit">
        <el-icon><FullScreen /></el-icon>
      </el-button>
      <el-button text size="small" title="实际大小(100%)" @click="resetZoom">
        <el-icon><RefreshRight /></el-icon>
      </el-button>
      <el-divider direction="vertical" />
      <el-button text size="small" title="撤销" :disabled="!canUndo" @click="undo">
        <el-icon><Back /></el-icon>
      </el-button>
      <el-button text size="small" title="重做" :disabled="!canRedo" @click="redo">
        <el-icon><Right /></el-icon>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ZoomIn, ZoomOut, FullScreen, RefreshRight, Back, Right } from '@element-plus/icons-vue'
import Modeler from 'bpmn-js/lib/Modeler'
import minimapModule from 'diagram-js-minimap'
import flowableModdle from '@/utils/flowableModdle'
import type { BpmnSummary, UserTaskSummary, SelectedElement } from '@/utils/bpmn'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import 'diagram-js-minimap/assets/diagram-js-minimap.css'
import '@/assets/styles/bpmn-theme.css'

const props = defineProps<{ xml: string }>()
const emit = defineEmits<{ select: [SelectedElement | null] }>()

/** bpmn-js businessObject 的最小形状 */
interface Bo {
  $type: string
  id: string
  name?: string
  assignee?: string
  candidateGroups?: string
  get?: (name: string) => unknown
  $attrs?: Record<string, unknown>
}
interface El {
  id: string
  type: string
  businessObject: Bo
  incoming?: unknown[]
  outgoing?: unknown[]
}

const containerRef = ref<HTMLDivElement>()
const zoom = ref(1)
const canUndo = ref(false)
const canRedo = ref(false)

// 非响应式实例(不进 ref/reactive,避免 Vue 代理 bpmn-js 内部对象)
let modeler: Modeler | null = null
let current: El | null = null
let errorIds: string[] = []

/**
 * 健壮读取 flowable 扩展属性:写入用限定名(flowable:assignee),回读形式因版本而异
 * (bo.get(限定名) / bo[本地名] / bo.$attrs[限定名]),依次兜底避免写后读空。
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

onMounted(async () => {
  if (!containerRef.value) return
  modeler = new Modeler({
    container: containerRef.value,
    additionalModules: [minimapModule],
    moddleExtensions: { flowable: flowableModdle },
  })

  modeler.on('selection.changed', (e: unknown) => {
    const sel = (e as { newSelection: El[] }).newSelection
    const el = sel && sel.length === 1 ? sel[0] : null
    current = el
    emit('select', toSelected(el))
  })
  modeler.on('element.changed', (e: unknown) => {
    const changed = (e as { element: El }).element
    if (current && changed && changed.id === current.id) {
      current = changed
      emit('select', toSelected(changed))
    }
    // 元素变更时清除该节点的错误高亮(用户正在修正),delete-safe
    if (modeler && changed && errorIds.includes(changed.id)) {
      const canvas = modeler.get<{ removeMarker: (id: string, cls: string) => void }>('canvas')
      const registry = modeler.get<{ get: (id: string) => unknown }>('elementRegistry')
      if (registry.get(changed.id)) canvas.removeMarker(changed.id, 'bpmn-error')
      errorIds = errorIds.filter((id) => id !== changed.id)
    }
  })
  modeler.on('canvas.viewbox.changed', (e: unknown) => {
    const scale = (e as { viewbox: { scale: number } }).viewbox?.scale
    if (typeof scale === 'number') zoom.value = scale
  })
  modeler.on('commandStack.changed', () => {
    if (!modeler) return
    const cs = modeler.get<{ canUndo: () => boolean; canRedo: () => boolean }>('commandStack')
    canUndo.value = cs.canUndo()
    canRedo.value = cs.canRedo()
  })

  try {
    await modeler.importXML(props.xml)
    const canvas = modeler.get<{ zoom: (m: string) => void }>('canvas')
    canvas.zoom('fit-viewport')
    const minimap = modeler.get<{ close: () => void }>('minimap')
    minimap.close()
  } catch (err) {
    console.error('[BpmnDesigner] importXML 失败', err)
  }
})

onBeforeUnmount(() => {
  modeler?.destroy()
  modeler = null
})

function getCanvas() {
  return modeler?.get<{ zoom: (s?: number | string, c?: string) => number }>('canvas')
}
function getStack() {
  return modeler?.get<{ undo: () => void; redo: () => void }>('commandStack')
}
function zoomBy(factor: number) {
  const canvas = getCanvas()
  if (!canvas) return
  canvas.zoom(canvas.zoom() * factor)
}
function fit() {
  getCanvas()?.zoom('fit-viewport')
}
function resetZoom() {
  getCanvas()?.zoom(1)
}
function undo() {
  getStack()?.undo()
}
function redo() {
  getStack()?.redo()
}

defineExpose({
  async getXML(): Promise<string> {
    if (!modeler) return props.xml
    const { xml } = await modeler.saveXML({ format: true })
    return xml ?? ''
  },
  getSummary(): BpmnSummary {
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
  updateSelected(propsToSet: Record<string, unknown>) {
    if (!modeler || !current) return
    const modeling = modeler.get<{ updateProperties: (e: El, p: Record<string, unknown>) => void }>('modeling')
    modeling.updateProperties(current, propsToSet)
  },
  markErrors(ids: string[]) {
    if (!modeler) return
    const canvas = modeler.get<{
      addMarker: (id: string, cls: string) => void
      removeMarker: (id: string, cls: string) => void
    }>('canvas')
    const registry = modeler.get<{ get: (id: string) => unknown }>('elementRegistry')
    errorIds.forEach((id) => {
      if (registry.get(id)) canvas.removeMarker(id, 'bpmn-error')
    })
    const present = ids.filter((id) => registry.get(id))
    present.forEach((id) => canvas.addMarker(id, 'bpmn-error'))
    errorIds = present
  },
  clearErrors() {
    if (!modeler) return
    const canvas = modeler.get<{ removeMarker: (id: string, cls: string) => void }>('canvas')
    const registry = modeler.get<{ get: (id: string) => unknown }>('elementRegistry')
    errorIds.forEach((id) => {
      if (registry.get(id)) canvas.removeMarker(id, 'bpmn-error')
    })
    errorIds = []
  },
})
</script>

<style scoped>
.bpmn-designer {
  position: relative;
  height: 100%;
  width: 100%;
}
.bpmn-designer__canvas {
  height: 100%;
  width: 100%;
}
.bpmn-designer__toolbar {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--el-bg-color-overlay);
  box-shadow: var(--el-box-shadow-light);
}
.bpmn-designer__zoom {
  min-width: 44px;
  text-align: center;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-secondary);
}
</style>
