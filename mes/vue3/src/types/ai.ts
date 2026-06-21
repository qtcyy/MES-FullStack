/** AI 助手相关类型 */

export type AiRole = 'user' | 'assistant'

/** 发往后端的消息（只含 role + content） */
export interface AiMessageInput {
  role: AiRole
  content: string
}

/** 后端 SSE 事件类型 */
export type AiEventType = 'thinking' | 'tool_start' | 'tool_result' | 'content' | 'done' | 'error'

/** 后端 SSE 事件（data: 里的 JSON） */
export interface AiEvent {
  type: AiEventType
  content?: string
  tool?: string
  args?: Record<string, unknown>
  summary?: string
}

/** 一次工具调用在前端的展示态 */
export interface AiStep {
  tool: string
  args?: Record<string, unknown>
  status: 'running' | 'done'
  summary?: string
}

/** 一条聊天消息（前端状态） */
export interface AiChatMessage {
  role: AiRole
  content: string
  steps: AiStep[]
  status: 'streaming' | 'done' | 'error'
}
