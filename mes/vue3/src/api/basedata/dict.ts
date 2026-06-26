import { http } from '@/api/request'
import type { SpSysDict } from '@/types/basedata'

/** 按字典类型取字典项列表 */
export const dictList = (type: string) =>
  http.get<SpSysDict[]>(`/basedata/dict/list/${type}`)
