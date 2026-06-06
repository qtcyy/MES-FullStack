import client from './client'
import type { MenuInfo, TreeVO, SysMenu } from '@/types/menu'

export function getMenuTree() {
  return client.get('/admin/list/index/menu/tree') as Promise<MenuInfo>
}

export function searchMenuTree(menuName: string) {
  return client.get(`/admin/list/index/menu/search/tree/${menuName}`) as Promise<{
    menuInfo: Record<string, TreeVO<SysMenu>>
  }>
}
