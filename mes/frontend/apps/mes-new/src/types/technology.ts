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

// ===== BOM-Flow 绑定(周期 2f, D) =====

/** 工艺路线-工序关系(sp_flow_oper_relation,前端只用部分字段) */
export interface SpFlowOperRelation {
  id: string
  flowId?: string
  operId?: string
  oper?: string
  sortNum?: number
  /** firstOper / lastOper */
  operType?: string
}

/** /bom-flow/opers/{flowId} 与 list 内 opers 项 */
export interface FlowOperItem {
  relation: SpFlowOperRelation
  oper?: SpOper | null
}

/** BOM-Flow 绑定行(sp_bom_flow) */
export interface SpBomFlow {
  id: string
  bomId: string
  flowId: string
  status?: 'draft' | 'locked'
  remark?: string
  sortOrder?: number
}

/** /bom-flow/list/{rootId} 的扁平节点项(未绑定节点仅 bomNode) */
export interface BomFlowNodeVO {
  bomNode: SpProductBom
  bomFlow?: SpBomFlow | null
  flow?: SpFlow | null
  opers?: FlowOperItem[]
}

// ===== 工艺文件(周期 2f, E) =====

/** 工艺文件内容(sp_process_content);图片字段为逗号连接的对象 key 列表 */
export interface SpProcessContent {
  id?: string
  bomId: string
  flowId?: string
  mainInfo?: string
  content?: string
  contentImages?: string
  requirements?: string
  /** '0' | '1' 字符串(切勿发 boolean) */
  inspectionRequired?: string
  inspectionImages?: string
  notes?: string
  status?: 'draft' | 'completed'
}

/** 工装设备(sp_process_equipment) */
export interface SpProcessEquipment {
  id?: string
  contentId: string
  name: string
  quantity?: number
  remark?: string
}

/** 技术文档(sp_process_document);filePath 存对象 key,fileUrl 为后端读时重签的可访问 url */
export interface SpProcessDocument {
  id?: string
  contentId: string
  name: string
  filePath: string
  fileUrl?: string
}

/** /process-content/get/{bomId} 返回 */
export interface ProcessContentDetailVO {
  content: SpProcessContent | null
  equipment: SpProcessEquipment[]
  documents: SpProcessDocument[]
  /** 与 content.contentImages 的非空 key 顺序对齐的展示 url */
  contentImageUrls: string[]
  inspectionImageUrls: string[]
}

/** /process-content/list/{rootId} 节点项 */
export interface ProcessContentNodeVO {
  bomNode: SpProductBom
  content: SpProcessContent | null
}
