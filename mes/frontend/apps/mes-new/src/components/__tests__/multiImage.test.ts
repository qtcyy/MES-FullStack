import { describe, it, expect } from 'vitest'
import { parseKeys, joinKeys } from '@/utils/imageKeys'

describe('imageKeys helpers', () => {
  it('parseKeys filters empties (no [""])', () => {
    expect(parseKeys('')).toEqual([])
    expect(parseKeys(undefined)).toEqual([])
    expect(parseKeys('a, b ,,c')).toEqual(['a', 'b', 'c'])
  })
  it('joinKeys drops falsy and joins by comma', () => {
    expect(joinKeys(['a', '', 'b'])).toBe('a,b')
    expect(joinKeys([])).toBe('')
  })
})
