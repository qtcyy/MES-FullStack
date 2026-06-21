/** 库位(对应后端 sp_warehouse_location) */
export interface SpWarehouseLocation {
  id: string
  warehouseId: string
  code: string
  groupNo: number
  rowNo: number
  layerNo: number
  colNo: number
  deleted?: string
}

/** 仓库(对应后端 sp_warehouse) */
export interface SpWarehouse {
  id: string
  code: string
  name: string
  type?: string
  groups: number
  rows: number
  layers: number
  columns: number
  descr?: string
  deleted?: string
  createTime?: string
  updateTime?: string
}
