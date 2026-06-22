import type { PageReq } from '@/types/system'

/** 班组(sp_team)。workdays 为 CSV "1,2,3";is_deleted 映射后端 deleted */
export interface SpTeam {
  id?: string
  code?: string
  name?: string
  descr?: string
  startTime?: string
  endTime?: string
  /** 工作日 CSV:"1,2,3,4,5" */
  workdays?: string
  deleted?: string
}

/** 班组分页记录(含后端派生只读字段) */
export interface SpTeamDTO extends SpTeam {
  userCount?: number
  lineName?: string
  workshopName?: string
}

export interface TeamPageReq extends PageReq {
  code?: string
  name?: string
}

/** 班组表单模型:workdays 用数组驱动多选,提交时经 formatWorkdays 转 CSV */
export interface TeamFormModel {
  id?: string
  code?: string
  name?: string
  startTime?: string
  endTime?: string
  workdays?: string[]
  descr?: string
}
