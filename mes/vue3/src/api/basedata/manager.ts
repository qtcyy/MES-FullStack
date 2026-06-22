import { http } from '@/api/request'
import type { SpTableManager, SpTableManagerItem, SpTableManagerDto, ManagerPageReq, IPage } from '@/types/manager'

/** 列表分页(form) */
export const managerPage = (req: ManagerPageReq) =>
  http.post<IPage<SpTableManager>>('/basedata/manager/page', req)

/** 字段明细(form,@RequestParam tableNameId) */
export const managerItemsByTableNameId = (tableNameId: string) =>
  http.post<SpTableManagerItem[]>('/basedata/manager/item/by/tableNameId', { tableNameId })

/** 整体保存表头+明细(JSON)→ 返回表头 id */
export const managerAddOrUpdate = (dto: SpTableManagerDto) =>
  http.post<string>('/basedata/manager/add-or-update', dto, true)

/** 级联删除(form) */
export const managerDelete = (id: string) =>
  http.post<void>('/basedata/manager/delete/by/tableNameId', { id })
