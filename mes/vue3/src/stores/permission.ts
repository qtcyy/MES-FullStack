import { defineStore } from 'pinia'
import type { MenuInfo } from '@/types/menu'
import { getMenuTree } from '@/api/menu'
import { collectPermissions } from '@/utils/permission'

/**
 * 权限态:菜单树 + 权限 Set。
 * Set 不便 JSON 持久化,故不持久化;登录或刷新后由 loadMenu 重建。
 */
export const usePermissionStore = defineStore('permission', {
  state: () => ({
    menuInfo: null as MenuInfo['menuInfo'] | null,
    permissions: new Set<string>(),
    loaded: false,
  }),
  getters: {
    hasPermission: (state) => (perm?: string) => !perm || state.permissions.has(perm),
  },
  actions: {
    async loadMenu() {
      const info = await getMenuTree()
      this.menuInfo = info.menuInfo
      this.permissions = collectPermissions(info.menuInfo)
      this.loaded = true
    },
    reset() {
      this.menuInfo = null
      this.permissions = new Set()
      this.loaded = false
    },
  },
})
