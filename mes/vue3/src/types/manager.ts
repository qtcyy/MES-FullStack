import type { PageReq, IPage } from '@/types/system'

export type { IPage }

/** 动态表表头(sp_table_manager) */
export interface SpTableManager {
  id?: string
  tableName: string
  tableDesc: string
  permission?: string
  isDeleted?: string
}

/** 字段明细(sp_table_manager_item) */
export interface SpTableManagerItem {
  id?: string
  tableNameId?: string
  field: string
  fieldDesc: string
  sortNum?: number
  /** 读容忍 Y/y/1;写回统一 "1"/"0" */
  mustFill?: string
}

/** Layer1 整体保存 DTO(表头 + 明细) */
export interface SpTableManagerDto extends SpTableManager {
  spTableManagerItems: SpTableManagerItem[]
}

/** Layer1 列表分页请求 */
export interface ManagerPageReq extends PageReq {
  tableName?: string
  tableDesc?: string
}

/** Layer2 动态数据分页请求 */
export interface ManagerDataPageReq extends PageReq {
  tableName: string
  tableNameId: string
}

/** Layer2 动态数据行(后端返回 Map<String,String>) */
export type ManagerDataRow = Record<string, string>
