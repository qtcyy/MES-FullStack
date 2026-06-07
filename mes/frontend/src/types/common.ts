// Materiel / material types
export interface Materiel {
  id: string
  materiel: string
  materielDesc: string
  unit: string
  productGroup?: string
  matType?: string
  size?: string
  flowDesc?: string
  flowId?: string
  model?: string
  source?: string
  leadTime?: number
  safetyStock?: number
  imageUrl?: string
  deleted: string
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

// Table manager types
export interface Manager {
  id: string
  tableName: string
  tableDesc?: string
  permission?: string
  fields?: string
  deleted: string
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

// Table manager field item
export interface SpTableManagerItem {
  field: string
  fieldDesc: string
  required: boolean
  sortNum: number
}

// BOM types
export interface Bom {
  id: string
  bomCode: string
  materielCode: string
  materielDesc?: string
  versionNumber?: number
  state?: string
  factory?: string
  remark?: string
  deleted: string
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

// Product BOM types
export interface ProductBom {
  id: string
  bomCode: string
  productCode: string
  nodeName: string
  parentId?: string
  level: number
  version: string
  status: string // 'draft' | 'locked'
  remark?: string
  sortOrder?: number
  childCount?: number
  itemCount?: number
  children?: ProductBom[]
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

export interface ProductBomItem {
  id?: string
  bomId: string
  itemType?: string // 'material' | 'bom_ref'
  materialCode: string
  materialDesc: string
  quantity: number
  unit: string
  sortOrder?: number
}

// Flow / process types
export interface Flow {
  id: string
  flow: string
  flowDesc: string
  process?: string
  deleted: string
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

// Flow DTO for flow-process add-or-update
export interface SpFlowDto {
  flow: string
  flowDesc: string
  spOperVoList?: { value: string; title: string }[]
}

// Production order types
export interface ProductionOrder {
  id: string
  orderCode: string
  orderDescription?: string
  qty?: number
  orderType?: string
  materiel?: string
  materielDesc?: string
  flowId?: string
  planStartTime?: string
  planEndTime?: string
  statue?: string
  deleted: string
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

// Oper types
export interface Oper {
  id: string
  oper: string
  operCode?: string
  operDesc: string
  processUnitId?: string
  laborHours?: number
  manufacturingCycle?: number
  generatePlan?: string
  remark?: string
  createTime?: string
}

// Gantt chart data
export interface GanttItem {
  id: string
  orderNo: string
  materielName: string
  quantity: number
  status: number
  planStartTime: string
  planEndTime: string
  actualStartTime?: string
  actualEndTime?: string
  progress: number
}
