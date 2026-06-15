import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TreeVO, SysMenu } from '@/types/menu'
import { toReactRoute } from '@/utils/urlMap'
import * as menuApi from '@/api/menu'

interface MenuState {
  menuInfo: Record<string, TreeVO<SysMenu>> | null
  sidebarCollapsed: boolean
  selectedKeys: string[]
  openKeys: string[]

  fetchMenuTree: () => Promise<void>
  toggleSidebar: () => void
  setSelectedKeys: (keys: string[]) => void
  setOpenKeys: (keys: string[]) => void
}

const useMenuStore = create<MenuState>()(
  persist(
    (set) => ({
      menuInfo: null,
      sidebarCollapsed: false,
      selectedKeys: [],
      openKeys: [],

      fetchMenuTree: async () => {
        const result = await menuApi.getMenuTree()
        set({ menuInfo: result.menuInfo })

        // Match current route to menu items using URL mapping
        const pathname = window.location.pathname
        const matchedKeys: string[] = []
        const matchedParents: string[] = []

        const search = (nodes: Record<string, TreeVO<SysMenu>>) => {
          for (const [, node] of Object.entries(nodes)) {
            const mappedUrl = toReactRoute(node.url)
            if (mappedUrl && pathname.startsWith(mappedUrl)) {
              // Leaf node match: add as selected key
              if (mappedUrl === pathname || pathname.startsWith(mappedUrl + '/')) {
                matchedKeys.push(mappedUrl)
              }
            }
            if (node.children && node.children.length > 0) {
              // Check if any child matches the current route
              const hasMatchingChild = node.children.some((child) => {
                const childUrl = toReactRoute(child.url)
                return childUrl && pathname.startsWith(childUrl)
              })
              if (hasMatchingChild) {
                matchedParents.push(node.id)
              }
              const childMap: Record<string, TreeVO<SysMenu>> = {}
              node.children.forEach((child) => {
                childMap[child.id] = child
              })
              search(childMap)
            }
          }
        }

        search(result.menuInfo)

        if (matchedKeys.length > 0) {
          // Merge current-route parents with existing persisted openKeys so
          // previously expanded menus stay open across refreshes.
          const existingOpenKeys = useMenuStore.getState().openKeys
          const mergedOpenKeys = Array.from(new Set([...existingOpenKeys, ...matchedParents]))
          set({ selectedKeys: matchedKeys, openKeys: mergedOpenKeys })
        }
      },

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSelectedKeys: (keys) => set({ selectedKeys: keys }),

      setOpenKeys: (keys) => set({ openKeys: keys }),
    }),
    {
      name: 'menu-storage',
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed, openKeys: state.openKeys }),
    },
  ),
)

export default useMenuStore
