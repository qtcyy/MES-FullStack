<template>
  <el-dialog
    :model-value="modelValue"
    :title="data?.title || '通知详情'"
    width="560px"
    append-to-body
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <div v-if="data" class="notice-detail">
      <div class="notice-detail__meta">
        <el-tag :type="tagType(data.type)" size="small" effect="light">{{ typeLabel(data.type) }}</el-tag>
        <span class="notice-detail__sender">发布人：{{ data.sender || '系统' }}</span>
        <span class="notice-detail__time">{{ formatTime(data.noticeTime) }}</span>
      </div>
      <div class="notice-detail__content">{{ data.content || '（无正文）' }}</div>
    </div>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import type { SysNoticeInbox, NoticeType } from '@/types/system'

defineProps<{ modelValue: boolean; data: SysNoticeInbox | null }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

function tagType(t: NoticeType) {
  return ({ info: 'info', success: 'success', warning: 'warning', error: 'danger' } as const)[t] ?? 'info'
}
function typeLabel(t: NoticeType) {
  return ({ info: '通知', success: '成功', warning: '提醒', error: '警告' } as const)[t] ?? '通知'
}
function formatTime(t?: string) {
  return t ? dayjs(t).format('YYYY-MM-DD HH:mm') : ''
}
</script>

<style scoped>
.notice-detail__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  margin-bottom: 14px;
}
.notice-detail__content {
  white-space: pre-wrap;
  line-height: 1.7;
  color: var(--el-text-color-primary);
}
</style>
