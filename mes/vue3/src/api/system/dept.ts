import { http } from '@/api/request'
import type { SysDepartment, SysDepartmentPageReq, IPage } from '@/types/system'

export const deptPage = (req: SysDepartmentPageReq) => http.post<IPage<SysDepartment>>('/admin/sys/department/page', req)
export const deptGetById = (id: string) => http.get<SysDepartment>('/admin/sys/department/get-by-id', { id })
export const deptAddOrUpdate = (d: Partial<SysDepartment>) => http.post<string>('/admin/sys/department/add-or-update', d)
export const deptDelete = (id: string) => http.post<string>('/admin/sys/department/delete', { id })
/** 全量拉取(客户端建树),size 取大值 */
export const deptAll = () => deptPage({ current: 1, size: 9999 })
