export interface Materiel {
  id: string
  materiel: string // 物料编码,后端自动生成
  materielDesc: string
  unit?: string
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
  deleted: string // 0=正常 1=删除
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

export interface SpComponent {
  id: string
  code: string // 组件编码,后端自动生成
  name: string
  descr?: string
  deleted: string
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}
