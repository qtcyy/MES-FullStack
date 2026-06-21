import type { AiChatMessage, AiEvent, AiStep } from '@/types/ai'

/** 把一条 SSE 事件应用到 assistant 消息上，返回新消息（不可变） */
export function applyAiEvent(msg: AiChatMessage, ev: AiEvent): AiChatMessage {
  switch (ev.type) {
    case 'thinking':
      return { ...msg, status: 'streaming' }

    case 'tool_start': {
      const step: AiStep = { tool: ev.tool ?? '', args: ev.args, status: 'running' }
      return { ...msg, status: 'streaming', steps: [...msg.steps, step] }
    }

    case 'tool_result': {
      const steps = msg.steps.slice()
      // 从后往前找同名 running 步骤标记完成
      for (let i = steps.length - 1; i >= 0; i--) {
        if (steps[i].tool === ev.tool && steps[i].status === 'running') {
          steps[i] = { ...steps[i], status: 'done', summary: ev.summary }
          break
        }
      }
      return { ...msg, steps }
    }

    case 'content':
      return { ...msg, content: ev.content ?? '', status: 'streaming' }

    case 'done':
      return { ...msg, status: 'done' }

    case 'error':
      return { ...msg, status: 'error', content: ev.content || msg.content || 'AI 服务出错' }

    default:
      return msg
  }
}
