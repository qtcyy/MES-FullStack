import { http } from '@/api/request'
import type { ManagerDataPageReq, ManagerDataRow, IPage } from '@/types/manager'

/** 动态数据分页(form) */
export const managerDataPage = (req: ManagerDataPageReq) =>
  http.post<IPage<ManagerDataRow>>('/basedata/common/page', req)

/** 新增/编辑(form 平铺:jsTableName/jsTableNameId/id?/动态字段值) */
export const managerDataAddOrUpdate = (body: Record<string, string>) =>
  http.post<void>('/basedata/common/add-or-update', body)

/**
 * 删除(form)。后端 commonDelete 经 assertTableWhitelisted(tableName, tableNameId) 校验,
 * tableNameId(表头 id,CommonDto 字段名,非 jsTableNameId)缺失会抛「未选中表信息」,故必传。
 */
export const managerDataDelete = (tableName: string, tableNameId: string, id: string) =>
  http.post<void>('/basedata/common/delete', { tableName, tableNameId, id })
