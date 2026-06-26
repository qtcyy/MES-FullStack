import { http } from './request'
import type { MenuInfo } from '@/types/menu'

/** 获取登录后菜单树(驱动侧栏 + 权限收集) */
export function getMenuTree() {
  return http.get<MenuInfo>('/admin/list/index/menu/tree')
}
