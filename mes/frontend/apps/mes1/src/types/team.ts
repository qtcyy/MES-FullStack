export interface SpTeam {
  id: string
  code: string
  name: string
  descr: string
  lineId?: string
  workshopId?: string
  startTime?: string
  endTime?: string
  workdays?: string
  deleted: string
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

export interface SpTeamDTO extends SpTeam {
  lineName?: string
  workshopName?: string
  userCount?: number
  userList?: import('./user').SysUser[]
  userIds?: string[]
}
