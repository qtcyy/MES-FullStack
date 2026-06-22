<template>
  <el-dialog
    :model-value="modelValue"
    title="流程事件规则"
    width="760px"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <div v-if="definition" class="event-cfg">
      <!-- 编辑器 -->
      <el-form :model="draft" label-width="92px" class="event-cfg__editor">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="规则名称">
              <el-input v-model="draft.name" placeholder="可选,如:发起即审批中" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="触发时机">
              <el-select v-model="draft.trigger" style="width: 100%">
                <el-option v-for="o in TRIGGER_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="动作类型">
              <el-select v-model="draft.actionType" style="width: 100%">
                <el-option v-for="o in ACTION_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item v-if="draft.actionType === 'SET_AUDIT_STATUS'" label="目标状态">
              <el-select v-model="draft.targetStatus" style="width: 100%" clearable>
                <el-option v-for="o in AUDIT_STATUS_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item v-if="draft.actionType === 'SCRIPT'" label="业务脚本">
          <el-input v-model="draft.script" type="textarea" :rows="3" placeholder="请输入业务脚本" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="draft.enabled" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSaveRule">
            {{ draft.id ? '更新规则' : '添加规则' }}
          </el-button>
          <el-button v-if="draft.id" @click="resetDraft">取消编辑</el-button>
          <el-button text @click="handleFillSample">填入示例</el-button>
        </el-form-item>
      </el-form>

      <!-- 规则列表 -->
      <el-divider content-position="left">已配置规则({{ rules.length }})</el-divider>
      <div v-loading="loading" class="event-cfg__list">
        <el-empty v-if="!rules.length" description="暂无事件规则" :image-size="60" />
        <div v-for="r in rules" v-else :key="r.id" class="event-cfg__item">
          <div class="event-cfg__item-main">
            <el-tag size="small">{{ triggerLabel(r.trigger) }}</el-tag>
            <span class="event-cfg__desc">{{ ruleDesc(r) }}</span>
            <span v-if="r.name" class="event-cfg__name">{{ r.name }}</span>
            <el-tag v-if="!r.enabled" size="small" type="info">已停用</el-tag>
          </div>
          <div class="event-cfg__item-ops">
            <el-button type="primary" link size="small" @click="editRule(r)">编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDeleteRule(r)">删除</el-button>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  TRIGGER_OPTIONS,
  ACTION_OPTIONS,
  AUDIT_STATUS_OPTIONS,
  triggerLabel,
  actionLabel,
  auditStatusLabel,
  validateEventRule,
  buildEventPayload,
  sampleEventRules,
} from '@/utils/workflow'
import { eventList, eventSave, eventDelete } from '@/api/workflow/event'
import type { WorkflowDefinition, WorkflowEventRule } from '@/types/workflow'

const props = defineProps<{
  modelValue: boolean
  definition: WorkflowDefinition | null
}>()

const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const rules = ref<WorkflowEventRule[]>([])
const loading = ref(false)

function blankDraft(): Partial<WorkflowEventRule> {
  return {
    id: undefined,
    definitionId: props.definition?.id,
    name: '',
    trigger: 'START',
    businessType: 'ORDER_APPROVAL',
    actionType: 'SET_AUDIT_STATUS',
    targetStatus: 'APPROVING',
    script: '',
    enabled: true,
  }
}

const draft = reactive<Partial<WorkflowEventRule>>(blankDraft())

function resetDraft() {
  Object.assign(draft, blankDraft())
}

async function loadRules() {
  if (!props.definition) return
  loading.value = true
  try {
    rules.value = await eventList(props.definition.id)
  } finally {
    loading.value = false
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    resetDraft()
    loadRules()
  },
)

function ruleDesc(r: WorkflowEventRule): string {
  if (r.actionType === 'SET_AUDIT_STATUS') {
    return `${actionLabel(r.actionType)} → ${auditStatusLabel(r.targetStatus)}`
  }
  return actionLabel(r.actionType)
}

function editRule(r: WorkflowEventRule) {
  Object.assign(draft, blankDraft(), r)
}

async function handleSaveRule() {
  const err = validateEventRule(draft)
  if (err) {
    ElMessage.warning(err)
    return
  }
  await eventSave(buildEventPayload({ ...draft, definitionId: props.definition!.id }))
  ElMessage.success('保存成功')
  resetDraft()
  loadRules()
}

async function handleDeleteRule(r: WorkflowEventRule) {
  try {
    await ElMessageBox.confirm('确认删除该事件规则?', '提示', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await eventDelete(r.id!)
    ElMessage.success('删除成功')
    loadRules()
  } catch { /* 响应拦截器已提示 */ }
}

async function handleFillSample() {
  if (!props.definition) return
  const samples = sampleEventRules(props.definition.id)
  for (const s of samples) {
    await eventSave(buildEventPayload(s))
  }
  ElMessage.success('示例规则已填入')
  loadRules()
}
</script>

<style scoped>
.event-cfg__list {
  min-height: 80px;
}
.event-cfg__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  margin-bottom: 8px;
}
.event-cfg__item-main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.event-cfg__desc {
  color: var(--el-text-color-primary);
}
.event-cfg__name {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
