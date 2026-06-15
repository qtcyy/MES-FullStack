// apps/mes-new/src/api/system/menu.ts
import { http } from '@/http/client'
import type { TreeVO, SysMenu } from '@/types/menu'

export function menuTree() {
  return http.get<TreeVO<SysMenu>[]>('/admin/sys/menu/tree')
}

/** 按 id 取完整菜单(菜单树 TreeVO 不含 sortNum/grade/descr,编辑须拉完整记录) */
export function menuGetById(id: string) {
  return http.get<SysMenu>('/admin/sys/menu/get-by-id', { params: { id } })
}

export function menuAddOrUpdate(record: SysMenu) {
  return http.post<void>('/admin/sys/menu/add-or-update', record)
}

/** 菜单为硬删除 */
export function menuDelete(id: string) {
  return http.post<void>('/admin/sys/menu/delete', { id })
}
