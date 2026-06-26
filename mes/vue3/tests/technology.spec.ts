import { describe, it, expect } from 'vitest'
import {
  buildOperPayload,
  validateOper,
  operToTransferItem,
  excludeSelected,
  moveItem,
  toSpOperVoList,
  buildFlowPayload,
  validateFlow,
} from '@/utils/technology'
import type { SpOper, TransferItem } from '@/types/technology'

const item = (id: string, primary: string, secondary?: string): TransferItem => ({ id, primary, secondary })

describe('buildOperPayload', () => {
  it('剥空串、数值化、generatePlan 兜底 1', () => {
    const p = buildOperPayload({ operDesc: '装配', remark: '', laborHours: '5' as unknown as number, manufacturingCycle: 8 })
    expect(p).toEqual({ operDesc: '装配', laborHours: 5, manufacturingCycle: 8, generatePlan: '1' })
  })
  it('保留 id 与已填 generatePlan', () => {
    const p = buildOperPayload({ id: 'o1', operDesc: 'd', generatePlan: '0' })
    expect(p.id).toBe('o1')
    expect(p.generatePlan).toBe('0')
  })
})

describe('validateOper', () => {
  it('描述必填', () => {
    expect(validateOper({ operDesc: '' })).toBe('请输入工序描述')
  })
  it('制造周期须大于工时', () => {
    expect(validateOper({ operDesc: 'd', laborHours: 8, manufacturingCycle: 8 })).toBe('制造周期必须大于工时')
    expect(validateOper({ operDesc: 'd', laborHours: 8, manufacturingCycle: 5 })).toBe('制造周期必须大于工时')
  })
  it('工时/周期须为非负整数', () => {
    expect(validateOper({ operDesc: 'd', laborHours: -1, manufacturingCycle: 5 })).toBe('工时与制造周期须为非负整数')
    expect(validateOper({ operDesc: 'd', laborHours: 1.5, manufacturingCycle: 5 })).toBe('工时与制造周期须为非负整数')
  })
  it('合法返回 null', () => {
    expect(validateOper({ operDesc: 'd', laborHours: 5, manufacturingCycle: 8 })).toBeNull()
    expect(validateOper({ operDesc: 'd' })).toBeNull()
  })
})

describe('operToTransferItem', () => {
  it('SpOper → TransferItem(primary=描述, secondary=编码)', () => {
    const o = { id: 'o1', operDesc: '装配工序', operCode: 'OPR-001' } as SpOper
    expect(operToTransferItem(o)).toEqual({ id: 'o1', primary: '装配工序', secondary: 'OPR-001' })
  })
})

describe('excludeSelected', () => {
  it('候选池排除已选 id', () => {
    const pool = [item('a', 'A'), item('b', 'B'), item('c', 'C')]
    expect(excludeSelected(pool, new Set(['b']))).toEqual([item('a', 'A'), item('c', 'C')])
  })
})

describe('moveItem', () => {
  const list = [item('a', 'A'), item('b', 'B'), item('c', 'C')]
  it('上移(dir=-1)', () => {
    expect(moveItem(list, 1, -1).map((x) => x.id)).toEqual(['b', 'a', 'c'])
  })
  it('下移(dir=1)', () => {
    expect(moveItem(list, 1, 1).map((x) => x.id)).toEqual(['a', 'c', 'b'])
  })
  it('越界不变(首项上移/末项下移)', () => {
    expect(moveItem(list, 0, -1)).toEqual(list)
    expect(moveItem(list, 2, 1)).toEqual(list)
  })
  it('不可变(不改原数组)', () => {
    const copy = [...list]
    moveItem(list, 1, -1)
    expect(list).toEqual(copy)
  })
})

describe('toSpOperVoList', () => {
  it('有序项 → [{value=id, title=编码}],保持顺序', () => {
    expect(toSpOperVoList([item('a', '装配', 'OPR-001'), item('b', '测试', 'OPR-002')])).toEqual([
      { value: 'a', title: 'OPR-001' },
      { value: 'b', title: 'OPR-002' },
    ])
  })
  it('secondary 缺失时回落 primary', () => {
    expect(toSpOperVoList([item('a', '装配')])).toEqual([{ value: 'a', title: '装配' }])
  })
})

describe('buildFlowPayload', () => {
  it('新增:无 id,组装 spOperVoList', () => {
    const p = buildFlowPayload({ flow: 'F1', flowDesc: '线A' }, [item('a', '装配', 'OPR-001'), item('b', '测试', 'OPR-002')])
    expect(p).toEqual({ flow: 'F1', flowDesc: '线A', spOperVoList: [{ value: 'a', title: 'OPR-001' }, { value: 'b', title: 'OPR-002' }] })
  })
  it('编辑:带 id', () => {
    const p = buildFlowPayload({ id: 'x', flow: 'F1', flowDesc: '线A' }, [item('a', '装配', 'OPR-001'), item('b', '测试', 'OPR-002')])
    expect(p.id).toBe('x')
  })
})

describe('validateFlow', () => {
  const two = [item('a', '装配'), item('b', '测试')]
  it('流程代码必填', () => {
    expect(validateFlow({ flow: '', flowDesc: 'd' }, two)).toBe('请输入流程代码')
  })
  it('流程描述必填', () => {
    expect(validateFlow({ flow: 'F1', flowDesc: '' }, two)).toBe('请输入流程描述')
  })
  it('至少 2 道工序', () => {
    expect(validateFlow({ flow: 'F1', flowDesc: 'd' }, [item('a', '装配')])).toBe('工艺路线至少需要 2 道工序')
  })
  it('合法返回 null', () => {
    expect(validateFlow({ flow: 'F1', flowDesc: 'd' }, two)).toBeNull()
  })
})
