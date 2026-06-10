import { UserOutlined, RobotOutlined } from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from '@/stores/aiChatStore'

interface ChatMessageProps {
  message: Message
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        marginBottom: 16,
        flexDirection: isUser ? 'row-reverse' : 'row',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: isUser ? '#1677ff' : '#52c41a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {isUser ? (
          <UserOutlined style={{ color: '#fff', fontSize: 14 }} />
        ) : (
          <RobotOutlined style={{ color: '#fff', fontSize: 14 }} />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`chat-bubble ${isUser ? 'chat-bubble--user' : 'chat-bubble--assistant'}`}
        style={{
          maxWidth: '80%',
          padding: '10px 14px',
          borderRadius: 12,
          borderTopRightRadius: isUser ? 4 : 12,
          borderTopLeftRadius: isUser ? 12 : 4,
          background: isUser ? '#e8f4fd' : '#f5f5f5',
          color: '#333',
          fontSize: 14,
          lineHeight: 1.6,
          whiteSpace: isUser ? 'pre-wrap' : 'normal',
          wordBreak: 'break-word',
        }}
      >
        {/* Tool call steps */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            {message.toolCalls.map((tc, i) => (
              <div
                key={i}
                style={{
                  fontSize: 12,
                  color: tc.status === 'error' ? '#ff4d4f' : '#666',
                  padding: '4px 8px',
                  background: tc.status === 'running' ? '#e6f7ff' : '#f5f5f5',
                  borderRadius: 4,
                  marginTop: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {tc.status === 'running' && <span>⏳ 正在查询：{tc.tool}</span>}
                {tc.status === 'done' && <span>✅ {tc.summary || tc.tool}</span>}
                {tc.status === 'error' && <span>❌ {tc.summary || tc.tool}</span>}
              </div>
            ))}
          </div>
        )}

        {message.content ? (
          isUser ? (
            message.content
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          )
        ) : (
          <span
            style={{
              display: 'inline-block',
              width: 24,
              height: 16,
              background:
                'linear-gradient(90deg, #1677ff 25%, #e8f4fd 50%, #1677ff 75%)',
              backgroundSize: '200% 100%',
              borderRadius: 2,
            }}
          />
        )}
      </div>
    </div>
  )
}
