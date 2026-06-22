<template>
  <div class="members">
    <div class="members__bar">
      <span class="members__title">编组成员维护</span>
      <el-button type="primary" size="small" :loading="saving" @click="save">保存成员</el-button>
    </div>
    <DualListTransfer
      v-model="selected"
      :candidates="candidates"
      :titles="['可选设备', '编组成员']"
      :loading="loading"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import DualListTransfer from '@/components/DualListTransfer.vue'
import { devicePage } from '@/api/basedata/device'
import { deviceGroupItems, deviceGroupItemsAdd, deviceGroupItemsRemove } from '@/api/basedata/deviceGroup'
import { deviceToTransferItem, diffMembers } from '@/utils/device'
import type { TransferItem } from '@/types/technology'

const props = defineProps<{ groupId: string }>()

const candidates = ref<TransferItem[]>([])
const selected = ref<TransferItem[]>([])
const originalMemberIds = ref<string[]>([])
const loading = ref(false)
const saving = ref(false)

async function load() {
  if (!props.groupId) return
  loading.value = true
  try {
    // 并行拉取:全量设备(候选池,大 size 临时取全集——已知 PaginationInterceptor 上限,见项目 backlog)+ 当前成员
    const [allRes, members] = await Promise.all([
      devicePage({ current: 1, size: 1000 }),
      deviceGroupItems(props.groupId),
    ])
    candidates.value = (allRes?.records ?? []).map(deviceToTransferItem)
    selected.value = (members ?? []).map(deviceToTransferItem)
    originalMemberIds.value = (members ?? []).map((m) => m.id ?? '')
  } finally {
    loading.value = false
  }
}

watch(() => props.groupId, load, { immediate: true })

async function save() {
  const nextIds = selected.value.map((i) => i.id)
  const { added, removed } = diffMembers(originalMemberIds.value, nextIds)
  if (!added.length && !removed.length) {
    ElMessage.info('成员未发生变化')
    return
  }
  saving.value = true
  try {
    if (added.length) await deviceGroupItemsAdd(props.groupId, added)
    for (const id of removed) {
      await deviceGroupItemsRemove(props.groupId, id)
    }
    ElMessage.success('成员保存成功')
    await load()
  } catch {
    /* 响应拦截器已提示 */
  } finally {
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
