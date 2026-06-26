import { describe, it, expect } from 'vitest'
import { createSseParser } from '@/utils/sse'

describe('createSseParser', () => {
  it('单帧完整事件提取 data 负载', () => {
    const p = createSseParser()
    expect(p.push('data: {"type":"content"}\n\n')).toEqual(['{"type":"content"}'])
  })

  it('半包：跨两次 push 才凑齐一帧', () => {
    const p = createSseParser()
    expect(p.push('data: {"a":1')).toEqual([])
    expect(p.push('}\n\n')).toEqual(['{"a":1}'])
  })

  it('粘包：一次 push 含多帧', () => {
    const p = createSseParser()
    expect(p.push('data: a\n\ndata: b\n\n')).toEqual(['a', 'b'])
  })

  it('字节流被任意切断仍能拼回', () => {
    const p = createSseParser()
    const out: string[] = []
    out.push(...p.push('data: hel'))
    out.push(...p.push('lo\n'))
    out.push(...p.push('\ndata: world\n\n'))
    expect(out).toEqual(['hello', 'world'])
  })

  it('[DONE] 哨兵原样返回', () => {
    const p = createSseParser()
    expect(p.push('data: [DONE]\n\n')).toEqual(['[DONE]'])
  })

  it('忽略非 data 行与空帧', () => {
    const p = createSseParser()
    expect(p.push(': comment\n\ndata: x\n\n')).toEqual(['x'])
  })
})
