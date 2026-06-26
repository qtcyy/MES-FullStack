import { describe, it, expect } from 'vitest'
import { validateProcessUnit, buildProcessUnitPayload } from '@/utils/processUnit'

describe('validateProcessUnit', () => {
  it('code/name 必填', () => {
    expect(validateProcessUnit({ code: '', name: '' })).toContain('单元代码必填')
    expect(validateProcessUnit({ code: 'U1', name: '' })).toContain('单元名称必填')
  })
  it('齐全 → 空数组', () => {
    expect(validateProcessUnit({ code: 'U1', name: '装配单元' })).toEqual([])
  })
})

describe('buildProcessUnitPayload', () => {
  it('hasLineWarehouse 默认 0、剥空串、保留 id', () => {
    expect(buildProcessUnitPayload({ id: 'x', code: 'U1', name: '装配', type: '', descr: undefined })).toEqual({
      id: 'x',
      code: 'U1',
      name: '装配',
      hasLineWarehouse: '0',
    })
  })
  it('hasLineWarehouse=1 透传', () => {
    const p = buildProcessUnitPayload({ code: 'U1', name: '装配', hasLineWarehouse: '1' })
    expect(p.hasLineWarehouse).toBe('1')
  })
})
