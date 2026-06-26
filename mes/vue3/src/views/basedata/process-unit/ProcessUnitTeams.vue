<template>
  <div class="punit-teams">
    <div class="punit-teams__bar">
      <span class="punit-teams__title">关联班组维护</span>
      <el-button type="primary" size="small" :loading="saving" @click="save">保存关联</el-button>
    </div>
    <DualListTransfer
      v-model="selected"
      :candidates="candidates"
      :titles="['可选班组', '已关联班组']"
      :loading="loading"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import DualListTransfer from '@/components/DualListTransfer.vue'
import { teamPage } from '@/api/system/team'
import { processUnitTeams, processUnitTeamAdd, processUnitTeamRemove } from '@/api/basedata/processUnit'
import { teamToTransferItem } from '@/utils/team'
import { diffMembers } from '@/utils/device'
import type { TransferItem } from '@/types/technology'

const props = defineProps<{ unitId: string }>()

const candidates = ref<TransferItem[]>([])
const selected = ref<TransferItem[]>([])
const originalIds = ref<string[]>([])
const loading = ref(false)
const saving = ref(false)

async function load() {
  if (!props.unitId) return
  loading.value = true
  try {
    // 候选=全量班组(大 size 兜底全量,已知 PaginationInterceptor 上限,见 backlog);已绑=该单元关联班组
    const [allRes, bound] = await Promise.all([
      teamPage({ current: 1, size: 1000 }),
      processUnitTeams(props.unitId),
    ])
    candidates.value = (allRes?.records ?? []).map(teamToTransferItem)
    selected.value = (bound ?? []).map(teamToTransferItem)
    originalIds.value = (bound ?? []).map((t) => t.id ?? '')
  } finally {
    loading.value = false
  }
}

// 父组件以 :key="unit.id" 强制重挂载,隔离并行加载竞态
watch(() => props.unitId, load, { immediate: true })

async function save() {
  const nextIds = selected.value.map((i) => i.id)
  const { added, removed } = diffMembers(originalIds.value, nextIds)
  if (!added.length && !removed.length) {
    ElMessage.info('关联未发生变化')
    return
  }
  saving.value = true
  try {
    for (const id of added) {
      await processUnitTeamAdd(props.unitId, id)
    }
    for (const id of removed) {
      await processUnitTeamRemove(props.unitId, id)
    }
    ElMessage.success('关联保存成功')
  } catch {
    /* 响应拦截器已提示 */
  } finally {
    await load()
    saving.value = false
  }
}
</script>

<style scoped>
.punit-teams {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.punit-teams__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.punit-teams__title {
  font-weight: 600;
}
</style>
