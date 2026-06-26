import { describe, it, expect } from 'vitest'
import { applyAiEvent } from '@/utils/aiReducer'
import type { AiChatMessage } from '@/types/ai'

function blank(): AiChatMessage {
  return { role: 'assistant', content: '', steps: [], status: 'streaming' }
}

describe('applyAiEvent', () => {
  it('thinking 保持 streaming，不加步骤', () => {
    const m = applyAiEvent(blank(), { type: 'thinking', content: '正在查询数据...' })
    expect(m.status).toBe('streaming')
    expect(m.steps).toHaveLength(0)
  })

  it('tool_start 追加 running 步骤', () => {
    const m = applyAiEvent(blank(), {
      type: 'tool_start',
      tool: 'get_production_orders',
      args: { statue: 2 },
    })
    expect(m.steps).toHaveLength(1)
    expect(m.steps[0]).toMatchObject({ tool: 'get_production_orders', status: 'running', args: { statue: 2 } })
  })

  it('tool_result 把对应 running 步骤标 done + summary', () => {
    let m = applyAiEvent(blank(), { type: 'tool_start', tool: 'get_devices' })
    m = applyAiEvent(m, { type: 'tool_result', tool: 'get_devices', summary: '查询到 8 条记录' })
    expect(m.steps[0]).toMatchObject({ tool: 'get_devices', status: 'done', summary: '查询到 8 条记录' })
  })

  it('content 写入文本并保持 streaming（交给打字机显现）', () => {
    const m = applyAiEvent(blank(), { type: 'content', content: '# 结论\n占比 60%' })
    expect(m.content).toBe('# 结论\n占比 60%')
    expect(m.status).toBe('streaming')
  })

  it('done 置为 done', () => {
    const m = applyAiEvent(blank(), { type: 'done' })
    expect(m.status).toBe('done')
  })

  it('error 置为 error 并写入错误文案', () => {
    const m = applyAiEvent(blank(), { type: 'error', content: 'AI 服务响应为空' })
    expect(m.status).toBe('error')
    expect(m.content).toBe('AI 服务响应为空')
  })

  it('不修改入参（返回新对象）', () => {
    const src = blank()
    const m = applyAiEvent(src, { type: 'tool_start', tool: 'x' })
    expect(src.steps).toHaveLength(0)
    expect(m).not.toBe(src)
  })
})
