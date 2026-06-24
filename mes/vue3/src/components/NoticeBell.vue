<template>
  <el-popover placement="bottom-end" :width="340" trigger="click" @show="loadRecent">
    <template #reference>
      <el-badge :value="store.unreadCount" :hidden="store.unreadCount === 0" :max="99" class="notice-bell">
        <el-icon :size="20"><Bell /></el-icon>
      </el-badge>
    </template>

    <div class="notice-pop">
      <div class="notice-pop__head">
        <span>通知</span>
        <el-button v-if="store.unreadCount > 0" link type="primary" size="small" @click="handleMarkAll">
          全部已读
        </el-button>
      </div>
      <el-scrollbar max-height="320px">
        <el-empty v-if="recent.length === 0" description="暂无通知" :image-size="60" />
        <div
          v-for="it in recent"
          :key="it.id"
          class="notice-item"
          :class="{ 'notice-item--unread': it.isRead === '0' }"
          @click="openDetail(it)"
        >
          <span v-if="it.isRead === '0'" class="notice-item__dot" />
          <div class="notice-item__body">
            <div class="notice-item__title">
              <el-tag :type="tagType(it.type)" size="small" effect="light">{{ typeLabel(it.type) }}</el-tag>
              <span class="notice-item__text">{{ it.title }}</span>
            </div>
            <div class="notice-item__time">{{ formatTime(it.noticeTime) }}</div>
          </div>
        </div>
      </el-scrollbar>
      <div class="notice-pop__foot">
        <el-button link type="primary" size="small" @click="goCenter">查看全部</el-button>
      </div>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useIntervalFn } from '@vueuse/core'
import { Bell } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { useNoticeStore } from '@/stores/notice'
import { inboxRecent, inboxMarkAllRead } from '@/api/system/notice'
import type { SysNoticeInbox, NoticeType } from '@/types/system'

const router = useRouter()
const store = useNoticeStore()
const recent = ref<SysNoticeInbox[]>([])

function tagType(t: NoticeType) {
  return ({ info: 'info', success: 'success', warning: 'warning', error: 'danger' } as const)[t] ?? 'info'
}
function typeLabel(t: NoticeType) {
  return ({ info: '通知', success: '成功', warning: '提醒', error: '警告' } as const)[t] ?? '通知'
}
function formatTime(t?: string) {
  return t ? dayjs(t).format('MM-DD HH:mm') : ''
}

async function loadRecent() {
  recent.value = (await inboxRecent(10)) ?? []
}
function openDetail(it: SysNoticeInbox) {
  // 跳转到动态路由详情页 /system/notice/:id
  router.push({ name: 'system-notice-detail', params: { id: it.id } })
}
function goCenter() {
  router.push('/system/notice')
}
async function handleMarkAll() {
  await inboxMarkAllRead()
  await Promise.all([store.refresh(), loadRecent()])
}

// 30s 轮询未读数；组件挂载即拉一次
const { pause } = useIntervalFn(() => store.refresh(), 30000, { immediate: false })
onMounted(() => { store.refresh() })
onBeforeUnmount(() => pause())
</script>

<style scoped>
.notice-bell { cursor: pointer; display: flex; align-items: center; }
.notice-pop__head { display: flex; justify-content: space-between; align-items: center; padding: 4px 4px 8px; font-weight: 600; border-bottom: 1px solid var(--el-border-color-lighter); }
.notice-item { display: flex; gap: 8px; padding: 10px 4px; cursor: pointer; border-bottom: 1px solid var(--el-border-color-lighter); }
.notice-item:hover { background: var(--el-fill-color-light); }
.notice-item--unread .notice-item__text { font-weight: 600; }
.notice-item__dot { width: 6px; height: 6px; border-radius: 50%; background: var(--el-color-danger); margin-top: 7px; flex: 0 0 auto; }
.notice-item__body { flex: 1; min-width: 0; }
.notice-item__title { display: flex; align-items: center; gap: 6px; }
.notice-item__text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.notice-item__time { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 2px; }
.notice-pop__foot { text-align: center; padding-top: 6px; }
</style>
