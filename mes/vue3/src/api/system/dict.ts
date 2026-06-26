import { http } from '@/api/request'
import type { SysDict, SysDictPageReq, IPage } from '@/types/system'

export const dictPage = (req: SysDictPageReq) => http.post<IPage<SysDict>>('/admin/sys/dict/page', req)
export const dictGetById = (id: string) => http.get<SysDict>('/admin/sys/dict/get-by-id', { id })
export const dictAddOrUpdate = (d: Partial<SysDict>) => http.post<string>('/admin/sys/dict/add-or-update', d)
export const dictDelete = (id: string) => http.post<string>('/admin/sys/dict/delete', { id })
