import { http } from '@/http/client'
import type { MenuInfo } from '@/types/menu'

export function getMenuTree() {
  return http.get<MenuInfo>('/admin/list/index/menu/tree')
}
