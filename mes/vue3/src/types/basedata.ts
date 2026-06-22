import type { PageReq, IPage } from '@/types/system'

export type { IPage }

/** 物料实体(对应 sp_materile) */
export interface SpMaterile {
  id: string
  materiel?: string          // 物料编码(新建留空,后端按 matType 生成)
  materielDesc: string       // 物料描述(必填)
  unit?: string              // 基本单位(字典 ORDER_UNIT 的 value)
  productGroup?: string      // 产品组
  matType?: string           // 物料类型(字典 material_type 的 value)
  size?: string              // 规格
  model?: string             // 型号
  source?: string            // 来源(自制/外购)
  leadTime?: number          // 需求提前期(天)
  safetyStock?: number       // 安全库存
  imageUrl?: string          // 物料图片 URL
  flowId?: string            // 工艺路线(本周期不用)
  flowDesc?: string
  deleted?: string           // is_deleted:'0' 正常 / '1' 删除
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

/** 物料分页请求 */
export interface MaterilePageReq extends PageReq {
  materielLike?: string
  materielDescLike?: string
}

/** 字典项(对应 sp_sys_dict) */
export interface SpSysDict {
  id: string
  name: string   // 显示名(如「成品」)
  value: string  // 业务值(如「FG」)
  type: string   // 字典类型(如「material_type」)
  descr?: string
  sortNum?: number
}

/** 设备(sp_device) */
export interface SpDevice {
  id?: string
  code?: string
  name?: string
  type?: string
  model?: string
  specs?: string
  location?: string
  status?: string
  descr?: string
}
export interface DevicePageReq extends PageReq {
  code?: string
  name?: string
}

/** 零部件(sp_component) */
export interface SpComponent {
  id?: string
  code?: string
  name?: string
  descr?: string
}
export interface ComponentPageReq extends PageReq {
  code?: string
  name?: string
}

/** 设备编组(sp_device_group) */
export interface SpDeviceGroup {
  id?: string
  code?: string
  name?: string
  descr?: string
}
export interface DeviceGroupPageReq extends PageReq {
  code?: string
  name?: string
}
