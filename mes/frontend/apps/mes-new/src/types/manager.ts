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

/** 字段明细提交体(剥离 id) */
export interface ManagerItemPayload {
  field: string
  fieldDesc: string
  mustFill: string
  sortNum: number
}

/** add-or-update 整体提交体(JSON) */
export interface ManagerUpsertPayload {
  id?: string
  tableName: string
  tableDesc: string
  permission: string
  isDeleted: string
  spTableManagerItems: ManagerItemPayload[]
}
