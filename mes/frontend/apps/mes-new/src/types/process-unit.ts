export interface SpTeam {
  id: string
  code: string
  name: string
  descr?: string
  lineId?: string
  workshopId?: string
  startTime?: string
  endTime?: string
  workdays?: string
  deleted?: string
}

export interface SpProcessUnit {
  id: string
  code: string
  name: string
  type?: string
  /** 是否有线边库:'0' 无 / '1' 有 */
  hasLineWarehouse?: string
  descr?: string
  deleted?: string
  createTime?: string
  updateTime?: string
}

export interface SpProcessUnitDTO extends SpProcessUnit {
  teamList?: SpTeam[]
}
