import { http } from '@/api/request'
import type { TreeVO, SysMenu } from '@/types/menu'
import type { IPage } from '@/types/system'

export const menuTreeAdmin = () => http.get<TreeVO<SysMenu>[]>('/admin/sys/menu/tree')
export const menuPage = (req: { current: number; size: number }) => http.post<IPage<SysMenu>>('/admin/sys/menu/page', req)
export const menuGetById = (id: string) => http.get<SysMenu>('/admin/sys/menu/get-by-id', { id })
export const menuAddOrUpdate = (m: Partial<SysMenu>) => http.post<string>('/admin/sys/menu/add-or-update', m)
export const menuDelete = (id: string) => http.post<string>('/admin/sys/menu/delete', { id })
