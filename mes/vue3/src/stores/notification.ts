import { defineStore } from 'pinia'

export interface NoticeItem {
  id: string
  title: string
  time: string
  read: boolean
}

/** 通知中心(占位,Cycle 4 接入轮询/SSE 增强) */
export const useNotificationStore = defineStore('notification', {
  state: () => ({
    list: [] as NoticeItem[],
  }),
  getters: {
    unread: (s) => s.list.filter((n) => !n.read).length,
  },
  actions: {
    push(n: NoticeItem) {
      this.list.unshift(n)
    },
    markAllRead() {
      this.list.forEach((n) => (n.read = true))
    },
    clear() {
      this.list = []
    },
  },
})
