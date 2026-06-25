import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAllowedRoutes, APP_ROUTES } from '@/hooks/useAllowedRoutes'
import { useAuthStore } from '@/stores/authStore'

/**
 * 路由访问守卫:
 * - admin 永远全权限(按用户名放行,与后端一致):不受菜单/路由集合限制,
 *   覆盖「有路由但无对应菜单」的孤儿页面(如字典页),避免 admin 被误判 403;
 * - 菜单未加载 → 占位 loading,不误判;
 * - 已注册路由但不在授权集合 → 跳 /403;
 * - 未注册路由 → 放行,由下游 NotFound 处理(保留 404 语义);
 * - 授权 → 渲染 children(无则 <Outlet/>)。
 */
export default function RouteAccessGuard({ children }: { children?: ReactNode }) {
  const isAdmin = useAuthStore((s) => s.user?.username === 'admin')
  const { loaded, allowed } = useAllowedRoutes()
  const location = useLocation()

  if (isAdmin) {
    return <>{children ?? <Outlet />}</>
  }

  if (!loaded) {
    return <div className="p-6 text-sm text-muted-foreground">加载中…</div>
  }
  const path = location.pathname
  if (APP_ROUTES.has(path) && !allowed.has(path)) {
    return <Navigate to="/403" replace />
  }
  return <>{children ?? <Outlet />}</>
}
