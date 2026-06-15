import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SysUser } from '@/types/user'
import type { TreeVO, SysMenu } from '@/types/menu'
import * as authApi from '@/api/auth'
import * as menuApi from '@/api/menu'

/**
 * Recursively traverse a menu tree (Record<string, TreeVO>) and collect
 * all non-empty `permission` values into a Set.
 */
function collectPermissions(
  tree: Record<string, TreeVO<SysMenu>>,
): Set<string> {
  const perms = new Set<string>()

  const walk = (node: TreeVO<SysMenu>) => {
    if (node.permission) {
      perms.add(node.permission)
    }
    if (node.children) {
      node.children.forEach(walk)
    }
  }

  for (const key in tree) {
    walk(tree[key])
  }

  return perms
}

interface AuthState {
  user: SysUser | null
  permissions: Set<string>
  isLoggedIn: boolean

  login: (
    username: string,
    password: string,
    captcha: string,
    rememberMe?: boolean,
  ) => Promise<void>
  logout: () => Promise<void>
  fetchUserInfo: () => Promise<void>
  hasPermission: (perm: string) => boolean
  setUser: (user: SysUser) => void
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      permissions: new Set<string>(),
      isLoggedIn: false,

      login: async (username, password, captcha, rememberMe = false) => {
        await authApi.login(username, password, captcha, rememberMe)
        await get().fetchUserInfo()
      },

      logout: async () => {
        try {
          await authApi.logout()
        } finally {
          set({ user: null, permissions: new Set<string>(), isLoggedIn: false })
          window.location.href = '/login'
        }
      },

      fetchUserInfo: async () => {
        const user = (await authApi.getUserInfo()) as SysUser
        const menuData = await menuApi.getMenuTree()
        const permissions = collectPermissions(menuData.menuInfo)
        set({ user, permissions, isLoggedIn: true })
      },

      hasPermission: (perm) => {
        if (!perm) return true
        return get().permissions.has(perm)
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
      // Only persist isLoggedIn so we can show a loading state on page refresh.
      partialize: (state) => ({ isLoggedIn: state.isLoggedIn }),
    },
  ),
)

export default useAuthStore
