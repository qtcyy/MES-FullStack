import { ref, reactive } from 'vue'
import { streamChat } from '@/api/ai'
import { applyAiEvent } from '@/utils/aiReducer'
import type { AiChatMessage, AiMessageInput } from '@/types/ai'

export function useAiChat() {
  const messages = ref<AiChatMessage[]>([])
  const sending = ref(false)
  let controller: AbortController | null = null

  function stop() {
    controller?.abort()
    controller = null
    sending.value = false
    // 把仍在 streaming 的助手消息收尾
    const last = messages.value[messages.value.length - 1]
    if (last && last.role === 'assistant' && last.status === 'streaming') {
      last.status = 'done'
    }
  }

  function reset() {
    stop()
    messages.value = []
  }

  async function send(text: string) {
    const content = text.trim()
    if (!content || sending.value) return

    messages.value.push({ role: 'user', content, steps: [], status: 'done' })
    const assistant = reactive<AiChatMessage>({
      role: 'assistant',
      content: '',
      steps: [],
      status: 'streaming',
    })
    messages.value.push(assistant)
    sending.value = true
    controller = new AbortController()

    // 历史：用户消息 + 已有内容的助手消息（排除当前空占位）
    const history: AiMessageInput[] = messages.value
      .filter((m) => m.role === 'user' || (m.role === 'assistant' && m.content))
      .map((m) => ({ role: m.role, content: m.content }))

    await streamChat(
      history,
      {
        onEvent: (ev) => {
          Object.assign(assistant, applyAiEvent(assistant, ev))
        },
        onDone: () => {
          if (assistant.status !== 'error') assistant.status = 'done'
          sending.value = false
          controller = null
        },
        onError: (msg) => {
          assistant.status = 'error'
          if (!assistant.content) assistant.content = msg
          sending.value = false
          controller = null
        },
      },
      controller.signal,
    )
  }

  return { messages, sending, send, stop, reset }
}
