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
  deleted: string
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

export interface SpDeviceDTO extends SpDevice {
  lineName?: string
  orderCount?: number
}

export interface SpDeviceGroup {
  id: string
  code: string
  name: string
  descr?: string
  deleted: string
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

export interface SpDeviceGroupDTO extends SpDeviceGroup {
  deviceCount?: number
  deviceList?: SpDevice[]
  deviceIds?: string[]
}
