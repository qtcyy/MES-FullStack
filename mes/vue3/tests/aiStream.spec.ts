import { describe, it, expect, vi, afterEach } from 'vitest'
import { streamChat } from '@/api/ai'
import type { AiEvent } from '@/types/ai'

/** 用给定文本块构造一个 SSE 响应流 */
function sseResponse(chunks: string[], status = 200): Response {
  const enc = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(c))
      controller.close()
    },
  })
  return new Response(stream, { status })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('streamChat', () => {
  it('解析事件并在 [DONE] 处触发 onDone', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        sseResponse([
          'data: {"type":"tool_start","tool":"get_devices"}\n\n',
          'data: {"type":"content","content":"hi"}\n\n',
          'data: [DONE]\n\n',
        ]),
      ),
    )
    const events: AiEvent[] = []
    let doneCalled = false
    await streamChat([{ role: 'user', content: 'q' }], {
      onEvent: (ev) => events.push(ev),
      onDone: () => { doneCalled = true },
      onError: () => { throw new Error('should not error') },
    })
    expect(events.map((e) => e.type)).toEqual(['tool_start', 'content'])
    expect(doneCalled).toBe(true)
  })

  it('401 跳转登录而不触发 onError', async () => {
    const loc = { href: '' }
    vi.stubGlobal('location', loc as unknown as Location)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse([], 401)))
    let errored = false
    await streamChat([{ role: 'user', content: 'q' }], {
      onEvent: () => {},
      onDone: () => {},
      onError: () => { errored = true },
    })
    expect(loc.href).toBe('/login')
    expect(errored).toBe(false)
  })

  it('error 事件触发 onError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(sseResponse(['data: {"type":"error","content":"boom"}\n\n'])),
    )
    let msg = ''
    await streamChat([{ role: 'user', content: 'q' }], {
      onEvent: () => {},
      onDone: () => {},
      onError: (m) => { msg = m },
    })
    expect(msg).toBe('boom')
  })
})
