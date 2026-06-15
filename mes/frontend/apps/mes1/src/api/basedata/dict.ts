import client from '../client'
import type { SysDict } from '@/types/user'

export function listByType(type: string) {
  return client.get(`/basedata/dict/list/${type}`) as Promise<SysDict[]>
}
