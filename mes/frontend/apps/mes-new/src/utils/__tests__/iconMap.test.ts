import { describe, it, expect } from 'vitest'
import { User, LayoutGrid } from 'lucide-react'
import { getIcon } from '@/utils/iconMap'

describe('getIcon', () => {
  it('已知 key 返回对应图标', () => {
    expect(getIcon('user')).toBe(User)
  })
  it('未知 key 返回兜底图标', () => {
    expect(getIcon('not-exist')).toBe(LayoutGrid)
  })
})
