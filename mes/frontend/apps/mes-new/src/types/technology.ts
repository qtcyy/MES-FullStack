/** 工序(sp_oper) */
export interface SpOper {
  id: string
  oper?: string
  operCode?: string
  operDesc: string
  processUnitId?: string
  laborHours?: number
  manufacturingCycle?: number
  generatePlan?: string
  remark?: string
}

/** 加工单元下拉项 */
export interface SpProcessUnitOption {
  id: string
  code: string
  name: string
}

/** 工艺路线(sp_flow) */
export interface SpFlow {
  id: string
  flow: string
  flowDesc?: string
  /** 后端自动生成的工序链字符串,分隔符 "->" */
  process?: string
}

/** 流程-工序穿梭对象 */
export interface SpOperVo {
  value: string
  title: string
}

/** 工艺路线级联保存入参 */
export interface SpFlowDtoReq {
  id?: string
  flow: string
  flowDesc?: string
  spOperVoList: SpOperVo[]
}

// ===== 产品 BOM(周期 2e) =====

/** 产品 BOM 节点实体(对应后端 SpProductBom;/page 列表与写操作用) */
export interface SpProductBom {
  id: string
  bomCode?: string
  productCode?: string
  nodeName: string
  parentId?: string
  level?: number
  version?: string
  status?: 'draft' | 'locked'
  remark?: string
  sortOrder?: number
  lockedAt?: string
  lockedBy?: string
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

/** GET /tree 返回的 Map 树节点(11 键;无 parentId/审计,含 children + itemCount) */
export interface BomTreeNode {
  id: string
  bomCode?: string
  nodeName: string
  productCode?: string
  level?: number
  version?: string
  status?: 'draft' | 'locked'
  remark?: string
  sortOrder?: number
  children: BomTreeNode[]
  itemCount: number
}

/** 产品 BOM 物料行(对应后端 SpProductBomItem;注意 material 拼写,与物料表 materiel 不同) */
export interface SpProductBomItem {
  id?: string
  bomId: string
  itemType?: 'material' | 'bom_ref'
  materialCode: string
  materialDesc?: string
  quantity: number
  unit?: string
  sortOrder?: number
}
