import { RobotOutlined, CloseOutlined } from '@ant-design/icons'
import useAIChatStore from '@/stores/aiChatStore'

export default function FloatButton() {
  const isOpen = useAIChatStore((s) => s.isOpen)
  const toggle = useAIChatStore((s) => s.toggle)

  return (
    <div
      onClick={toggle}
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: isOpen
          ? '#ff4d4f'
          : 'linear-gradient(135deg, #1677ff, #69b1ff)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: isOpen
          ? '0 4px 14px rgba(255, 77, 79, 0.35)'
          : '0 4px 14px rgba(22, 119, 255, 0.35)',
        zIndex: 1000,
        transition: 'all 0.25s ease',
        transform: 'scale(1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.07)'
        e.currentTarget.style.boxShadow = isOpen
          ? '0 6px 20px rgba(255, 77, 79, 0.5)'
          : '0 6px 20px rgba(22, 119, 255, 0.5)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.boxShadow = isOpen
          ? '0 4px 14px rgba(255, 77, 79, 0.35)'
          : '0 4px 14px rgba(22, 119, 255, 0.35)'
      }}
      title={isOpen ? '关闭 AI 助手' : '打开 AI 助手'}
    >
      {isOpen ? (
        <CloseOutlined style={{ color: '#fff', fontSize: 22 }} />
      ) : (
        <RobotOutlined style={{ color: '#fff', fontSize: 24 }} />
      )}
    </div>
  )
}
