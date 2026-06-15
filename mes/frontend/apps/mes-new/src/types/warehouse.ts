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
