import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface TabItem {
  key: string // = path
  title: string
  path: string
  icon?: string
  closable: boolean
}

interface AppState {
  tabs: TabItem[]
  activeKey: string
  addTab: (tab: TabItem) => void
  removeTab: (key: string) => void
  setActive: (key: string) => void
  closeOthers: (key: string) => void
  closeAll: () => void
}

const HOME_TAB: TabItem = { key: '/welcome', title: '工作台', path: '/welcome', closable: false }
const MAX_TABS = 20

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      tabs: [HOME_TAB],
      activeKey: HOME_TAB.key,

      addTab: (tab) => {
        const { tabs } = get()
        const existing = tabs.find((t) => t.key === tab.key)
        if (existing) {
          // 已存在:激活;若标题/图标有更新(如兜底标题→菜单真实名)则刷新该标签
          const changed = existing.title !== tab.title || existing.icon !== tab.icon
          set({
            activeKey: tab.key,
            ...(changed
              ? { tabs: tabs.map((t) => (t.key === tab.key ? { ...t, title: tab.title, icon: tab.icon } : t)) }
              : {}),
          })
          return
        }
        let next = [...tabs, tab]
        if (next.length > MAX_TABS) {
          const idx = next.findIndex((t) => t.key !== HOME_TAB.key)
          if (idx !== -1) next = [...next.slice(0, idx), ...next.slice(idx + 1)]
        }
        set({ tabs: next, activeKey: tab.key })
      },

      removeTab: (key) => {
        if (key === HOME_TAB.key) return
        const { tabs, activeKey } = get()
        const index = tabs.findIndex((t) => t.key === key)
        if (index === -1) return
        const next = tabs.filter((t) => t.key !== key)
        let newActive = activeKey
        if (activeKey === key) newActive = next[Math.min(index, next.length - 1)].key
        set({ tabs: next, activeKey: newActive })
      },

      setActive: (key) => set({ activeKey: key }),
      closeOthers: (key) =>
        set((s) => ({
          tabs: s.tabs.filter((t) => t.key === HOME_TAB.key || t.key === key),
          activeKey: key,
        })),
      closeAll: () => set({ tabs: [HOME_TAB], activeKey: HOME_TAB.key }),
    }),
    {
      name: 'mes-new-app',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ tabs: s.tabs, activeKey: s.activeKey }),
    },
  ),
)
