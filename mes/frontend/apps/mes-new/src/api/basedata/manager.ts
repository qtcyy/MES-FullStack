import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SpTableManager, SpTableManagerItem, ManagerUpsertPayload } from '@/types/manager'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

export interface ManagerPageParams extends PageParams {
  tableName?: string
  tableDesc?: string
}

/** 表头分页(form 编码;后端 SpTableManagerReq 绑定 current/size/tableName/tableDesc) */
export function managerPage(params: ManagerPageParams) {
  return http.post<PageResult<SpTableManager>>('/basedata/manager/page', params)
}

/** 取某表头的字段明细(form 编码;后端 @RequestParam tableNameId) */
export function managerItems(tableNameId: string) {
  return http.post<SpTableManagerItem[]>('/basedata/manager/item/by/tableNameId', { tableNameId })
}

/** 整体新增/更新(JSON;后端 @RequestBody SpTableManagerDto)→ 返回表头 id */
export function managerAddOrUpdate(payload: ManagerUpsertPayload) {
  return http.post<string>('/basedata/manager/add-or-update', payload, JSON_HEADERS)
}

/** 级联删除(form 编码;后端 SpTableManager req 绑定 id) */
export function managerDelete(id: string) {
  return http.post<void>('/basedata/manager/delete/by/tableNameId', { id })
}
