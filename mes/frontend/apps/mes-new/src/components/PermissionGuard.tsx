import type { ReactNode } from 'react'
import { useAuthStore } from '@/stores/authStore'

interface PermissionGuardProps {
  perm: string
  children: ReactNode
  fallback?: ReactNode
}

/** 有权限才渲染 children */
export default function PermissionGuard({ perm, children, fallback = null }: PermissionGuardProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  return hasPermission(perm) ? <>{children}</> : <>{fallback}</>
}
