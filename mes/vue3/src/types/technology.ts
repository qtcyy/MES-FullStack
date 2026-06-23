import type { PageReq, IPage } from '@/types/system'

export type { IPage }

/** 工序(对应 sp_oper) */
export interface SpOper {
  id: string
  oper?: string                // 工序名(后端用 operCode 同值填充)
  operCode?: string            // 工序编号 OPR-XXX(后端自动生成)
  operDesc: string             // 工序描述(必填)
  processUnitId?: string       // 加工单元 id(可空)
  laborHours?: number          // 工时(分钟)
  manufacturingCycle?: number  // 制造周期(分钟),须 > laborHours
  generatePlan?: string        // '0' 否 / '1' 是
  remark?: string
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

/** 工序分页请求 */
export interface OperPageReq extends PageReq {
  operDescLike?: string
}

/** 加工单元下拉选项(对应 sp_process_unit,取 id + name) */
export interface SpProcessUnitOption {
  id: string
  code?: string
  name: string
  type?: string
}

/** 工艺路线(对应 sp_flow) */
export interface SpFlow {
  id: string
  flow: string         // 流程代码
  flowDesc?: string    // 流程/线体描述
  process?: string     // 工序链串(后端生成,只读,形如 A->B->C)
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

/** 工艺路线分页请求 */
export type FlowPageReq = PageReq

/** 穿梭框/关系 VO(后端 SpOperVo) value=工序id, title=工序编码 */
export interface SpOperVo {
  value: string
  title: string
}

/** 工艺路线级联保存入参(后端 SpFlowDto) */
export interface SpFlowDtoReq {
  id?: string
  flow: string
  flowDesc?: string
  spOperVoList: SpOperVo[]   // 有序,顺序即执行顺序
}

/** 通用穿梭框项 */
export interface TransferItem {
  id: string
  primary: string       // 主显(工序描述)
  secondary?: string    // 次显(工序编码)
}

/** 产品 BOM 节点(对应 sp_product_bom) */
export interface SpProductBom {
  id: string
  bomCode?: string                  // PBOM-XXX(后端生成)
  productCode?: string              // 产品物料编码(仅根节点必填)
  nodeName: string                  // 节点名称(必填)
  parentId?: string                 // 父节点 id(空=根)
  level?: number                    // 层级 0 产品 /1 半成品 /2 组件
  version?: string                  // 版本号(默认 V1.0)
  status?: 'draft' | 'locked'       // 草稿 / 已锁定
  remark?: string
  sortOrder?: number
  lockedAt?: string
  lockedBy?: string
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

/** /tree 返回的树形节点(含 children + itemCount,无 parentId/审计) */
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
  itemCount?: number
  children?: BomTreeNode[]
}

/** 产品 BOM 行项目(对应 sp_product_bom_item) */
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

/** 产品 BOM 分页请求 */
export interface ProductBomPageReq extends PageReq {
  productCodeLike?: string
  nodeNameLike?: string
}

/** 工艺路线-工序关系(对应 sp_flow_oper_relation,本页只读预览用其中几列) */
export interface SpFlowOperRelation {
  id: string
  flowId?: string
  operId?: string
  oper?: string          // 工序编码(后端存 oper 列)
  sortNum?: number       // 执行顺序
  operType?: string      // 'firstOper' | 'lastOper' | 其它
}

/** 工序预览项(后端 list/opers 端点 opers 数组元素) */
export interface FlowOperItem {
  relation: SpFlowOperRelation
  oper?: SpOper | null   // join 出的工序详情(operDesc 等)
}

/** BOM-工艺绑定行(对应 sp_bom_flow) */
export interface SpBomFlow {
  id: string
  bomId: string
  flowId: string
  status?: 'draft' | 'locked'
  remark?: string
  sortOrder?: number
}

/** list/{rootId} 返回的扁平节点项(无绑定时仅 bomNode) */
export interface BomFlowNodeVO {
  bomNode: SpProductBom
  bomFlow?: SpBomFlow | null
  flow?: SpFlow | null
  opers?: FlowOperItem[]
}

/** 前端构建的树节点:展平 bomNode 到顶层(供 TreeTable row-key/列),挂 flow/opers/children */
export interface BomFlowTreeNode extends SpProductBom {
  bomFlow?: SpBomFlow | null
  flow?: SpFlow | null
  opers?: FlowOperItem[]
  children: BomFlowTreeNode[]
}

// ============ 工艺内容编制(Cycle 3c-1)============
export interface SpProcessContent {
  id?: string
  bomId: string
  flowId?: string
  mainInfo?: string
  content?: string
  contentImages?: string // 逗号连接的对象 key 列表
  requirements?: string
  inspectionRequired?: string // '0' | '1'
  inspectionImages?: string // 逗号连接的对象 key 列表
  notes?: string
  status?: string // 'draft' | 'completed'
}

export interface SpProcessEquipment {
  id?: string
  contentId: string
  name: string
  quantity?: number
  remark?: string
}

export interface SpProcessDocumentVO {
  id: string
  contentId: string
  name: string
  filePath: string
  fileUrl?: string // 后端 get 重签
}

/** /get/{bomId} 响应 */
export interface ProcessContentDetail {
  content: SpProcessContent | null
  equipment: SpProcessEquipment[]
  documents: SpProcessDocumentVO[]
  contentImageUrls: string[]
  inspectionImageUrls: string[]
}

/** /list/{rootId} 行 */
export interface ProcessContentListItem {
  bomNode: SpProductBom
  content: SpProcessContent | null
}

/** 左树节点:BOM 节点字段 + 编制状态 + children */
export interface ProcessContentTreeNode extends SpProductBom {
  content: SpProcessContent | null
  contentStatus: string | null // null=未编制 / 'draft' / 'completed'
  children: ProcessContentTreeNode[]
}

/** 工艺 BOM 头表(对应 sp_bom) */
export interface SpBom {
  id: string
  bomCode: string        // BOM 编号(必填)
  materielCode: string   // 物料编号(必填)
  materielDesc: string   // 物料名称(必填)
  versionNumber: string  // 版本号(必填,默认 '1')
  factory?: string       // 所属工厂
  state?: string         // BOM 状态(后端遗留字段,旧 UI 未使用)
  deleted?: string       // 状态:'0' 正常 / '1' 已删除 / '2' 已禁用
  remark?: string
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

/** 工艺 BOM 分页请求(后端仅支持物料编号 likeRight) */
export interface BomPageReq extends PageReq {
  materielCodeLike?: string
}
