import { useEffect, useRef, useState } from 'react'
import { Input, Button, Space, Typography } from 'antd'
import { CloseOutlined, SendOutlined, DeleteOutlined } from '@ant-design/icons'
import ChatMessage from './ChatMessage'
import useAIChatStore from '@/stores/aiChatStore'

const { Text } = Typography

export default function AIChatPanel() {
  const {
    messages,
    isLoading,
    isOpen,
    close,
    sendMessage,
    clearMessages,
  } = useAIChatStore()

  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 新消息自动滚底
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 面板关闭时清空输入
  useEffect(() => {
    if (!isOpen) setInputValue('')
  }, [isOpen])

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return
    sendMessage(inputValue)
    setInputValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape') {
      close()
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 96,
        right: 24,
        width: 420,
        height: 540,
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 8px 40px rgba(0, 0, 0, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 999,
        overflow: 'hidden',
        border: '1px solid #f0f0f0',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#1677ff',
          color: '#fff',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 15,
          fontWeight: 500,
        }}
      >
        <span>🤖 AI 助手</span>
        <Space size={4}>
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            onClick={clearMessages}
            style={{ color: 'rgba(255,255,255,0.8)' }}
          />
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={close}
            style={{ color: 'rgba(255,255,255,0.8)' }}
          />
        </Space>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
          background: '#fafafa',
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: '#bbb',
              marginTop: 120,
            }}
          >
            <Text type="secondary">
              👋 你好！我是 MES 章鱼师兄的 AI 助手
              <br />
              可以问我关于系统功能的任何问题
            </Text>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          borderTop: '1px solid #f0f0f0',
          padding: 12,
          background: '#fff',
        }}
      >
        <Space.Compact style={{ width: '100%' }}>
          <Input.TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Enter 发送)"
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={isLoading}
            style={{ resize: 'none' }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={isLoading}
            disabled={!inputValue.trim() || isLoading}
          />
        </Space.Compact>
      </div>

      {/* Loading animation style */}
      <style>{`
        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
