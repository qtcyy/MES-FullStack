import type { ReactNode } from 'react'
import useAuthStore from '@/stores/authStore'

interface PermissionGuardProps {
  perm?: string
  children: ReactNode
}

function PermissionGuard({ perm, children }: PermissionGuardProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission)

  if (!perm || hasPermission(perm)) {
    return <>{children}</>
  }

  return null
}

export default PermissionGuard
