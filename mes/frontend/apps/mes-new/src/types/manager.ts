/** 动态表表头(sp_table_manager) */
export interface SpTableManager {
  id: string
  tableName: string
  tableDesc?: string
  permission?: string
  isDeleted?: string
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

/** 字段明细(sp_table_manager_item) */
export interface SpTableManagerItem {
  id?: string
  tableNameId?: string
  field: string
  fieldDesc: string
  mustFill: string // "1" | "0"
  sortNum: number
}

/** 字段明细提交体(从 SpTableManagerItem 剥离 id / tableNameId,避免双重维护漂移) */
export type ManagerItemPayload = Omit<SpTableManagerItem, 'id' | 'tableNameId'>

/** add-or-update 整体提交体(JSON);写模型:tableDesc/permission 须为字符串(允许空串),后端可存 null */
export interface ManagerUpsertPayload {
  id?: string
  tableName: string
  tableDesc: string
  permission: string
  isDeleted: string
  spTableManagerItems: ManagerItemPayload[]
}
