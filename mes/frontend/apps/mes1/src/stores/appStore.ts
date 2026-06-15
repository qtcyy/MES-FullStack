import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface TabItem {
  key: string // route path
  title: string // display name
  icon?: string
  path: string // route path
  closable: boolean // home tab is not closable
}

interface AppState {
  tabs: TabItem[]
  activeTabKey: string
  themeColor: string

  addTab: (tab: TabItem) => void
  removeTab: (key: string) => void
  setActiveTab: (key: string) => void
  closeOtherTabs: (key: string) => void
  closeAllTabs: () => void
  setThemeColor: (color: string) => void
}

const HOME_TAB: TabItem = {
  key: '/welcome',
  title: '首页',
  path: '/welcome',
  closable: false,
}

const MAX_TABS = 20

const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      tabs: [HOME_TAB],
      activeTabKey: HOME_TAB.key,
      themeColor: localStorage.getItem('app-theme-color') || '#1890ff',

      addTab: (tab) => {
        const { tabs, activeTabKey } = get()

        // If the tab already exists, just switch to it.
        const existing = tabs.find((t) => t.key === tab.key)
        if (existing) {
          if (activeTabKey !== tab.key) {
            set({ activeTabKey: tab.key })
          }
          return
        }

        // Clamp to MAX_TABS tabs. Remove the oldest non-home tab when full.
        let newTabs = [...tabs, tab]
        if (newTabs.length > MAX_TABS) {
          const idx = newTabs.findIndex((t) => t.key !== HOME_TAB.key)
          if (idx !== -1) {
            newTabs = [...newTabs.slice(0, idx), ...newTabs.slice(idx + 1)]
          }
        }

        set({ tabs: newTabs, activeTabKey: tab.key })
      },

      removeTab: (key) => {
        if (key === HOME_TAB.key) return // home tab is not closable

        const { tabs, activeTabKey } = get()
        const index = tabs.findIndex((t) => t.key === key)
        if (index === -1) return

        const newTabs = tabs.filter((t) => t.key !== key)

        // If the active tab was closed, activate the nearest one.
        let newActiveKey = activeTabKey
        if (activeTabKey === key) {
          const targetIndex = Math.min(index, newTabs.length - 1)
          newActiveKey = newTabs[targetIndex].key
        }

        set({ tabs: newTabs, activeTabKey: newActiveKey })
      },

      setActiveTab: (key) => set({ activeTabKey: key }),

      closeOtherTabs: (key) => {
        const currentTabs = get().tabs
        const newTabs = currentTabs.filter(
          (t) => t.key === HOME_TAB.key || t.key === key,
        )
        set({ tabs: newTabs, activeTabKey: key })
      },

      closeAllTabs: () => {
        set({
          tabs: [HOME_TAB],
          activeTabKey: HOME_TAB.key,
        })
      },

      setThemeColor: (color) => {
        localStorage.setItem('app-theme-color', color)
        set({ themeColor: color })
      },
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => sessionStorage),
      // Persist tab navigation to sessionStorage; themeColor is handled
      // separately via localStorage (see setThemeColor and the initial state).
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabKey: state.activeTabKey,
      }),
    },
  ),
)

export default useAppStore
