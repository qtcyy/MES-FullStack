<template>
  <div v-if="!element" class="pp pp--empty">请选择左侧节点进行配置</div>
  <div v-else class="pp">
    <div class="pp__head">
      <p class="pp__title">节点属性</p>
      <p class="pp__type">{{ element.type }}</p>
    </div>

    <div class="pp__field">
      <label class="pp__label">节点名称</label>
      <el-input v-model="name" placeholder="节点名称" @blur="emit('changeName', name)" />
    </div>

    <template v-if="isUserTask">
      <div class="pp__field">
        <label class="pp__label">办理人</label>
        <el-radio-group v-model="assigneeType" @change="onTypeChange">
          <el-radio value="initiator">流程发起人</el-radio>
          <el-radio value="candidate">候选组(按角色)</el-radio>
        </el-radio-group>
      </div>
      <div v-if="assigneeType === 'candidate'" class="pp__field">
        <label class="pp__label">角色</label>
        <el-select v-model="roleCode" placeholder="选择角色" style="width: 100%" @change="onRoleChange">
          <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="r.code" />
        </el-select>
      </div>
    </template>
    <p v-else class="pp__hint">该节点无需配置办理人</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { SelectedElement, AssigneeType } from '@/utils/bpmn'
import type { SysRole } from '@/types/system'

const props = defineProps<{
  element: SelectedElement | null
  roles: SysRole[]
}>()

const emit = defineEmits<{
  changeName: [string]
  changeAssignee: [AssigneeType, string?]
}>()

const name = ref('')
const assigneeType = ref<AssigneeType>('initiator')
const roleCode = ref('')

const isUserTask = computed(() => props.element?.type === 'bpmn:UserTask')

function deriveType(el: SelectedElement | null): AssigneeType {
  return el?.candidateGroups ? 'candidate' : 'initiator'
}

// 选中元素变化时同步本地受控态
watch(
  () => props.element,
  (el) => {
    name.value = el?.name ?? ''
    assigneeType.value = deriveType(el)
    roleCode.value = el?.candidateGroups ?? ''
  },
  { immediate: true },
)

function onTypeChange(v: string | number | boolean | undefined) {
  const t = v as AssigneeType
  emit('changeAssignee', t, t === 'candidate' ? roleCode.value || undefined : undefined)
}
function onRoleChange(v: string) {
  emit('changeAssignee', 'candidate', v)
}
</script>

<style scoped>
.pp {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 16px;
}
.pp--empty {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}
.pp__title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--el-text-color-secondary);
  margin: 0;
}
.pp__type {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.pp__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pp__label {
  font-size: 13px;
  font-weight: 500;
}
.pp__hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
