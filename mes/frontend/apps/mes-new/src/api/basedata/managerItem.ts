import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'

/** 动态表数据行:列名→值(含 id 主键) */
export type DynamicRow = Record<string, string>

export interface CommonPageParams extends PageParams {
  tableName: string
  tableNameId: string
}

/** 动态表数据分页(form 编码;后端 QueryTableNameDataReq) */
export function commonPage(params: CommonPageParams) {
  return http.post<PageResult<DynamicRow>>('/basedata/common/page', params)
}

/**
 * 新增/编辑动态行(form 编码;后端读原生 HttpServletRequest)。
 * body 平铺:jsTableName / jsTableNameId / id?(编辑) + 各字段名=值。
 */
export function commonAddOrUpdate(body: Record<string, string>) {
  return http.post<void>('/basedata/common/add-or-update', body)
}

/** 删除动态行(form 编码;后端 CommonDto:tableName + tableNameId + id,tableNameId 供白名单校验) */
export function commonDelete(params: { tableName: string; tableNameId: string; id: string }) {
  return http.post<void>('/basedata/common/delete', params)
}
