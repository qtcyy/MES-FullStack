import { defineStore } from 'pinia'
import { inboxUnreadCount } from '@/api/system/notice'

export const useNoticeStore = defineStore('notice', {
  state: () => ({
    unreadCount: 0 as number,
  }),
  actions: {
    async refresh() {
      try {
        this.unreadCount = (await inboxUnreadCount()) ?? 0
      } catch {
        // 静默：未登录/网络错误由拦截器处理
      }
    },
    reset() {
      this.unreadCount = 0
    },
  },
})
