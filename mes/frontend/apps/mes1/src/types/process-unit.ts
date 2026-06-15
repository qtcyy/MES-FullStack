export interface SpProcessUnit {
  id: string
  code: string
  name: string
  type?: string
  hasLineWarehouse?: string
  descr?: string
  deleted: string
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

export interface SpProcessUnitDTO extends SpProcessUnit {
  teamList?: import('./team').SpTeam[]
}

export interface SpTeam {
  id: string
  code: string
  name: string
  descr?: string
  deleted: string
}
