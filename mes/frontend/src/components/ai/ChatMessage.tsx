import { UserOutlined, RobotOutlined } from '@ant-design/icons'
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
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {message.content || (
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
