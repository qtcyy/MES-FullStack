export interface SpDevice {
  id: string
  code: string
  name: string
  type?: string
  model?: string
  specs?: string
  lineId?: string
  location?: string
  status?: string
  descr?: string
  deleted?: string
  createTime?: string
  updateTime?: string
}

export interface SpDeviceGroup {
  id: string
  code: string
  name: string
  descr?: string
  deleted?: string
  createTime?: string
  updateTime?: string
}

export interface SpDeviceGroupDTO extends SpDeviceGroup {
  deviceCount?: number
  deviceList?: SpDevice[]
  deviceIds?: string[]
  /** 成员设备按状态计数(后端 pageWithRelations 聚合):0空闲/1运行中/2维修中/3报废 */
  idleCount?: number
  runningCount?: number
  repairCount?: number
  scrapCount?: number
}
