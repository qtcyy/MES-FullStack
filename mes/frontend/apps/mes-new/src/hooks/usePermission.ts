import { useAuthStore } from '@/stores/authStore'

/** 权限判定 hook */
export function usePermission() {
  const has = useAuthStore((s) => s.hasPermission)
  return { has }
}
