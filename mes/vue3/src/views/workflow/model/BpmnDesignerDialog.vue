<template>
  <el-dialog
    :model-value="modelValue"
    fullscreen
    destroy-on-close
    :show-close="true"
    class="bpmn-dialog"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <template #header>
      <div class="bpmn-dialog__header">
        <span class="bpmn-dialog__title">流程模型设计{{ meta ? ` — ${meta.name}` : '' }}</span>
        <div class="bpmn-dialog__actions">
          <el-button size="small" @click="handleValidate">检查定义</el-button>
          <el-button size="small" type="primary" :loading="saving" @click="handleSave">保存</el-button>
        </div>
      </div>
    </template>

    <div class="bpmn-dialog__body">
      <div class="bpmn-dialog__canvas">
        <BpmnDesigner v-if="xml" :key="modelId ?? ''" ref="designerRef" :xml="xml" @select="onSelect" />
      </div>
      <div class="bpmn-dialog__panel">
        <PropertiesPanel
          :element="selected"
          :roles="roles"
          @change-name="onChangeName"
          @change-assignee="onChangeAssignee"
        />
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import BpmnDesigner from './BpmnDesigner.vue'
import PropertiesPanel from './PropertiesPanel.vue'
import { modelGet, modelSave } from '@/api/workflow/model'
import { rolePage } from '@/api/system/role'
import { validateSummary, errorTaskIds, buildAssigneeProps } from '@/utils/bpmn'
import type { SelectedElement, AssigneeType, BpmnSummary } from '@/utils/bpmn'
import type { SysRole } from '@/types/system'

const props = defineProps<{ modelValue: boolean; modelId: string | null }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [] }>()

type DesignerExposed = {
  getXML: () => Promise<string>
  getSummary: () => BpmnSummary
  updateSelected: (p: Record<string, unknown>) => void
  markErrors: (ids: string[]) => void
  clearErrors: () => void
}

const designerRef = ref<DesignerExposed | null>(null)
const selected = ref<SelectedElement | null>(null)
const xml = ref<string | null>(null)
const meta = ref<{ name: string; modelKey: string } | null>(null)
const roles = ref<SysRole[]>([])
const saving = ref(false)

// 打开时加载该模型 xml + 角色;modelId 变化/关闭时用 watch 第三参 onCleanup 置 ignore 丢弃在途响应
watch(
  () => [props.modelValue, props.modelId] as const,
  ([open, id], _old, onCleanup) => {
    if (!open || !id) {
      xml.value = null
      meta.value = null
      selected.value = null
      return
    }
    let ignore = false
    onCleanup(() => {
      ignore = true
    })
    modelGet(id)
      .then((m) => {
        if (ignore) return
        if (m) {
          xml.value = m.bpmnXml
          meta.value = { name: m.name, modelKey: m.modelKey }
        } else {
          ElMessage.error('模型不存在')
          emit('update:modelValue', false)
        }
      })
      .catch(() => {
        /* 拦截器已提示 */
      })
    rolePage({ current: 1, size: 100 })
      .then((r) => {
        if (!ignore) roles.value = r?.records ?? []
      })
      .catch(() => {
        /* 拦截器已提示 */
      })
  },
  { immediate: true },
)

function onSelect(el: SelectedElement | null) {
  selected.value = el
}
function onChangeName(name: string) {
  designerRef.value?.updateSelected({ name })
}
function onChangeAssignee(type: AssigneeType, roleCode?: string) {
  designerRef.value?.updateSelected(buildAssigneeProps(type, roleCode))
}

async function handleSave() {
  if (!props.modelId || !meta.value || !designerRef.value) return
  saving.value = true
  try {
    const out = await designerRef.value.getXML()
    await modelSave({ id: props.modelId, modelKey: meta.value.modelKey, name: meta.value.name, bpmnXml: out })
    ElMessage.success('已保存')
    emit('saved')
  } catch {
    /* 拦截器已提示 */
  } finally {
    saving.value = false
  }
}

function handleValidate() {
  if (!designerRef.value) return
  const summary = designerRef.value.getSummary()
  const result = validateSummary(summary)
  designerRef.value.clearErrors()
  if (result.ok) {
    ElMessage.success('校验通过:流程定义完整')
  } else {
    designerRef.value.markErrors(errorTaskIds(summary))
    ElMessage.error(`校验未通过:${result.issues.join('；')}`)
  }
}
</script>

<style scoped>
.bpmn-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 32px;
}
.bpmn-dialog__title {
  font-size: 16px;
  font-weight: 600;
}
.bpmn-dialog__actions {
  display: flex;
  gap: 8px;
}
.bpmn-dialog__body {
  display: flex;
  height: calc(100vh - 110px);
}
.bpmn-dialog__canvas {
  flex: 1;
  min-width: 0;
  background: var(--el-fill-color-lighter);
}
.bpmn-dialog__panel {
  width: 288px;
  flex-shrink: 0;
  overflow-y: auto;
  border-left: 1px solid var(--el-border-color);
}
</style>
<style>
.bpmn-dialog .el-dialog__body {
  padding: 0;
}
</style>
