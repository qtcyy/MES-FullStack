<template>
  <div class="members">
    <div class="members__bar">
      <span class="members__title">班组成员维护</span>
      <el-button type="primary" size="small" :loading="saving" @click="save">保存成员</el-button>
    </div>
    <DualListTransfer
      v-model="selected"
      :candidates="candidates"
      :titles="['可选用户', '班组成员']"
      :loading="loading"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import DualListTransfer from '@/components/DualListTransfer.vue'
import { teamUsers, teamAvailableUsers, teamUsersAdd, teamUserRemove } from '@/api/system/team'
import { teamUserToTransferItem } from '@/utils/team'
import { diffMembers } from '@/utils/device'
import type { TransferItem } from '@/types/technology'

const props = defineProps<{ teamId: string }>()

const candidates = ref<TransferItem[]>([])
const selected = ref<TransferItem[]>([])
const originalMemberIds = ref<string[]>([])
const loading = ref(false)
const saving = ref(false)

async function load() {
  if (!props.teamId) return
  loading.value = true
  try {
    // 候选池=全量可选用户(后端已过滤 is_deleted='0');成员=当前班组成员
    const [allUsers, members] = await Promise.all([teamAvailableUsers(), teamUsers(props.teamId)])
    candidates.value = (allUsers ?? []).map(teamUserToTransferItem)
    selected.value = (members ?? []).map(teamUserToTransferItem)
    originalMemberIds.value = (members ?? []).map((m) => m.id ?? '')
  } finally {
    loading.value = false
  }
}

// 父组件以 :key="team.id" 强制按班组重挂载本组件,避免 load() 并行拉取的后写覆盖竞态
watch(() => props.teamId, load, { immediate: true })

async function save() {
  const nextIds = selected.value.map((i) => i.id)
  const { added, removed } = diffMembers(originalMemberIds.value, nextIds)
  if (!added.length && !removed.length) {
    ElMessage.info('成员未发生变化')
    return
  }
  saving.value = true
  try {
    if (added.length) await teamUsersAdd(props.teamId, added)
    for (const id of removed) {
      await teamUserRemove(props.teamId, id)
    }
    ElMessage.success('成员保存成功')
  } catch {
    /* 响应拦截器已提示 */
  } finally {
    // 无论成功或部分失败,都从服务端真值重新对账,避免残留乐观态
    await load()
    saving.value = false
  }
}
</script>

<style scoped>
.members {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.members__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.members__title {
  font-weight: 600;
}
</style>
