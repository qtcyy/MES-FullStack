import type { Router } from 'vue-router'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'

NProgress.configure({ showSpinner: false })

/** 全局守卫:登录拦截 + 权限校验 + 顶部进度条 */
export function setupGuards(router: Router) {
  router.beforeEach(async (to) => {
    NProgress.start()
    const userStore = useUserStore()
    const permStore = usePermissionStore()

    // 公开页放行
    if (to.meta.public) return true

    // 未登录 → 跳登录页并带 redirect
    if (!userStore.logged) {
      return { path: '/login', query: { redirect: to.fullPath } }
    }

    // 已登录但权限未加载(如刷新后)→ 重建菜单/权限
    if (!permStore.loaded) {
      try {
        await permStore.loadMenu()
      } catch {
        // 加载失败(如会话过期)交由请求拦截器的 401 处理
      }
    }

    // 路由级权限:meta.perm 存在则校验
    const perm = to.meta.perm as string | undefined
    if (perm && !permStore.hasPermission(perm)) {
      return { path: '/403' }
    }
    return true
  })

  router.afterEach(() => NProgress.done())
}
