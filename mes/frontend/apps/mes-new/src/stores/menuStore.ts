import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { firstValueFrom } from 'rxjs'
import type { TreeVO, SysMenu } from '@/types/menu'
import * as menuApi from '@/api/menu'
import { collectPermissions } from './permissions'
import { useAuthStore } from './authStore'

interface MenuState {
  menuInfo: Record<string, TreeVO<SysMenu>> | null
  collapsed: boolean
  loaded: boolean
  fetchMenuTree: () => Promise<void>
  toggleCollapsed: () => void
}

export const useMenuStore = create<MenuState>()(
  persist(
    (set) => ({
      menuInfo: null,
      collapsed: false,
      loaded: false,

      fetchMenuTree: async () => {
        const result = await firstValueFrom(menuApi.getMenuTree())
        set({ menuInfo: result.menuInfo, loaded: true })
        useAuthStore.getState().setPermissions(collectPermissions(result.menuInfo))
      },

      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
    }),
    {
      name: 'mes-new-menu',
      partialize: (s) => ({ collapsed: s.collapsed }),
    },
  ),
)
