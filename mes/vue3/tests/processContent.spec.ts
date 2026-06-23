import { describe, it, expect } from 'vitest'
import {
  parseCsvKeys,
  joinKeys,
  inspectionToBool,
  boolToInspection,
  canEditContent,
  validateContent,
  buildContentPayload,
  buildEquipmentPayload,
  buildTreeFromList,
  levelLabel,
} from '@/utils/processContent'
import type { ProcessContentListItem, SpProcessContent } from '@/types/technology'

describe('parseCsvKeys / joinKeys', () => {
  it('parse 去空白滤空', () => {
    expect(parseCsvKeys('a, b ,,c')).toEqual(['a', 'b', 'c'])
    expect(parseCsvKeys('')).toEqual([])
    expect(parseCsvKeys(undefined)).toEqual([])
  })
  it('join 用逗号连接', () => {
    expect(joinKeys(['a', 'b'])).toBe('a,b')
    expect(joinKeys([])).toBe('')
  })
})

describe('inspectionToBool / boolToInspection', () => {
  it("'1'→true 其余→false", () => {
    expect(inspectionToBool('1')).toBe(true)
    expect(inspectionToBool('0')).toBe(false)
    expect(inspectionToBool(undefined)).toBe(false)
  })
  it("true→'1' false→'0'", () => {
    expect(boolToInspection(true)).toBe('1')
    expect(boolToInspection(false)).toBe('0')
  })
})

describe('canEditContent', () => {
  it('completed 不可编辑,其余可', () => {
    expect(canEditContent('completed')).toBe(false)
    expect(canEditContent('draft')).toBe(true)
    expect(canEditContent(undefined)).toBe(true)
  })
})

describe('validateContent', () => {
  it('mainInfo/content 必填', () => {
    expect(validateContent({ bomId: 'b', mainInfo: '', content: 'x' })).toContain('主信息')
    expect(validateContent({ bomId: 'b', mainInfo: 'm', content: '  ' })).toContain('内容')
  })
  it('齐全→null', () => {
    expect(validateContent({ bomId: 'b', mainInfo: 'm', content: 'c' })).toBeNull()
  })
})

describe('buildContentPayload', () => {
  it('不带 status;inspectionRequired 归一;图片 joinKeys;新增不带 id', () => {
    const out = buildContentPayload({
      bomId: 'b1',
      mainInfo: ' m ',
      content: 'c',
      contentImageKeys: ['k1', 'k2'],
      inspectionImageKeys: ['k3'],
      inspectionRequiredBool: true,
      requirements: 'r',
      notes: 'n',
    })
    expect(out.status).toBeUndefined()
    expect(out.id).toBeUndefined()
    expect(out.bomId).toBe('b1')
    expect(out.mainInfo).toBe('m')
    expect(out.contentImages).toBe('k1,k2')
    expect(out.inspectionImages).toBe('k3')
    expect(out.inspectionRequired).toBe('1')
  })
  it('编辑传 existingId→带 id,仍不带 status', () => {
    const out = buildContentPayload(
      {
        bomId: 'b1',
        mainInfo: 'm',
        content: 'c',
        contentImageKeys: [],
        inspectionImageKeys: [],
        inspectionRequiredBool: false,
      },
      'C9',
    )
    expect(out.id).toBe('C9')
    expect(out.status).toBeUndefined()
    expect(out.inspectionRequired).toBe('0')
  })
})

describe('buildTreeFromList', () => {
  const list: ProcessContentListItem[] = [
    {
      bomNode: { id: '1', nodeName: '产品', parentId: null, sortOrder: 1 } as never,
      content: { bomId: '1', status: 'draft' } as SpProcessContent,
    },
    { bomNode: { id: '2', nodeName: '半成品', parentId: '1', sortOrder: 1 } as never, content: null },
    {
      bomNode: { id: '3', nodeName: '组件', parentId: '1', sortOrder: 2 } as never,
      content: { bomId: '3', status: 'completed' } as SpProcessContent,
    },
  ]
  it('按 parentId 重建,附 contentStatus', () => {
    const tree = buildTreeFromList(list)
    expect(tree).toHaveLength(1)
    expect(tree[0].id).toBe('1')
    expect(tree[0].contentStatus).toBe('draft')
    expect(tree[0].children.map((c) => c.id)).toEqual(['2', '3'])
    expect(tree[0].children[0].contentStatus).toBeNull()
    expect(tree[0].children[1].contentStatus).toBe('completed')
  })
})

describe('buildEquipmentPayload', () => {
  it('挂 contentId、trim、quantity 默认 1、新增不带 id', () => {
    const out = buildEquipmentPayload({ name: ' 车床 ', remark: ' r ' }, 'C1')
    expect(out).toEqual({ contentId: 'C1', name: '车床', quantity: 1, remark: 'r' })
    expect(out.id).toBeUndefined()
  })
  it('编辑带 id、保留 quantity', () => {
    const out = buildEquipmentPayload({ id: 'E9', name: '钻床', quantity: 3 }, 'C1')
    expect(out.id).toBe('E9')
    expect(out.quantity).toBe(3)
    expect(out.remark).toBe('')
  })
})

describe('levelLabel', () => {
  it('0→产品 / 1→半成品 / ≥2→组件', () => {
    expect(levelLabel(0)).toBe('产品')
    expect(levelLabel(1)).toBe('半成品')
    expect(levelLabel(2)).toBe('组件')
    expect(levelLabel(5)).toBe('组件')
  })
  it('undefined 按 0 处理→产品', () => {
    expect(levelLabel(undefined)).toBe('产品')
  })
})
