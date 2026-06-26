import { defineStore } from 'pinia'

export interface TabItem {
  path: string
  title: string
  closable: boolean
}

/** 应用级 UI 状态:主题 / 侧栏折叠 / 多页签(均持久化) */
export const useAppStore = defineStore('app', {
  state: () => ({
    theme: 'light' as 'light' | 'dark',
    collapsed: false,
    tabs: [] as TabItem[],
  }),
  actions: {
    /** 把当前主题应用到 <html>(切换/启动时调用) */
    applyTheme() {
      document.documentElement.classList.toggle('dark', this.theme === 'dark')
    },
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
      this.applyTheme()
    },
    toggleCollapsed() {
      this.collapsed = !this.collapsed
    },
    addTab(tab: TabItem) {
      if (!this.tabs.find((t) => t.path === tab.path)) this.tabs.push(tab)
    },
    removeTab(path: string) {
      this.tabs = this.tabs.filter((t) => t.path !== path)
    },
  },
  persist: { pick: ['theme', 'collapsed', 'tabs'] },
})
