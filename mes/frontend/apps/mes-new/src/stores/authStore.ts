import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { firstValueFrom } from 'rxjs'
import type { SysUser } from '@/types/user'
import * as authApi from '@/api/auth'

interface AuthState {
  user: SysUser | null
  isLoggedIn: boolean
  permissions: Set<string>
  login: (username: string, password: string, captcha: string, rememberMe?: boolean) => Promise<void>
  logout: () => Promise<void>
  fetchUserInfo: () => Promise<void>
  setPermissions: (perms: Set<string>) => void
  hasPermission: (perm: string) => boolean
  reset: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoggedIn: false,
      permissions: new Set<string>(),

      login: async (username, password, captcha, rememberMe = false) => {
        await firstValueFrom(authApi.login(username, password, captcha, rememberMe))
        await get().fetchUserInfo()
      },

      logout: async () => {
        try {
          await firstValueFrom(authApi.logout())
        } finally {
          get().reset()
        }
      },

      fetchUserInfo: async () => {
        const user = await firstValueFrom(authApi.userInfo())
        set({ user, isLoggedIn: true })
      },

      setPermissions: (permissions) => set({ permissions }),
      hasPermission: (perm) => get().permissions.has(perm),
      reset: () => set({ user: null, isLoggedIn: false, permissions: new Set<string>() }),
    }),
    {
      name: 'mes-new-auth',
      // permissions 是 Set,不持久化;登录态保留后由 menuStore.fetchMenuTree 重建权限
      partialize: (s) => ({ user: s.user, isLoggedIn: s.isLoggedIn }),
    },
  ),
)
