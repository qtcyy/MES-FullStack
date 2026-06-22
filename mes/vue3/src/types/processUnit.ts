import type { PageReq } from '@/types/system'

/** 加工单元(sp_process_unit) */
export interface SpProcessUnit {
  id?: string
  code?: string
  name?: string
  type?: string
  /** 是否有线边库:'1' 是 / '0' 否 */
  hasLineWarehouse?: string
  descr?: string
}

export interface ProcessUnitPageReq extends PageReq {
  code?: string
  name?: string
}
