import { useEffect, useRef, useState } from 'react'
import { Input, Button, Space } from 'antd'
import { CloseOutlined, SendOutlined, DeleteOutlined, LoadingOutlined } from '@ant-design/icons'
import ChatMessage from './ChatMessage'
import QuickPrompts from './QuickPrompts'
import useAIChatStore from '@/stores/aiChatStore'
import { fetchQuickPrompts } from '@/api/ai'
import type { QuickPrompt } from '@/types/ai'


export default function AIChatPanel() {
  const {
    messages,
    isLoading,
    isOpen,
    thinkingText,
    close,
    sendMessage,
    clearMessages,
  } = useAIChatStore()

  const [inputValue, setInputValue] = useState('')
  const [quickPrompts, setQuickPrompts] = useState<QuickPrompt[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load quick prompts on mount
  useEffect(() => {
    fetchQuickPrompts().then(setQuickPrompts)
  }, [])

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

  const handlePromptClick = (prompt: QuickPrompt) => {
    sendMessage(prompt.text)
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
        {messages.length === 0 && quickPrompts.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100%',
              paddingTop: 40,
            }}
          >
            <QuickPrompts
              prompts={quickPrompts}
              onPromptClick={handlePromptClick}
            />
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Thinking indicator */}
      {thinkingText && (
        <div
          style={{
            padding: '8px 16px',
            color: '#1677ff',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#e6f7ff',
            borderTop: '1px solid #91d5ff',
          }}
        >
          <LoadingOutlined spin />
          {thinkingText}
        </div>
      )}

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

        /* ---- Markdown styles for AI assistant messages ---- */
        .chat-bubble--assistant p {
          margin: 0 0 8px 0;
        }
        .chat-bubble--assistant p:last-child {
          margin-bottom: 0;
        }
        .chat-bubble--assistant ul,
        .chat-bubble--assistant ol {
          margin: 4px 0;
          padding-left: 20px;
        }
        .chat-bubble--assistant li {
          margin-bottom: 2px;
        }
        .chat-bubble--assistant code {
          background: rgba(0,0,0,0.06);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
          font-size: 13px;
        }
        .chat-bubble--assistant pre {
          background: #1e1e1e;
          color: #d4d4d4;
          padding: 12px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 8px 0;
          font-size: 13px;
          line-height: 1.5;
        }
        .chat-bubble--assistant pre code {
          background: none;
          padding: 0;
          border-radius: 0;
          color: inherit;
          font-size: inherit;
        }
        .chat-bubble--assistant table {
          border-collapse: collapse;
          margin: 8px 0;
          font-size: 13px;
        }
        .chat-bubble--assistant th,
        .chat-bubble--assistant td {
          border: 1px solid #ddd;
          padding: 6px 10px;
          text-align: left;
        }
        .chat-bubble--assistant th {
          background: #f0f0f0;
          font-weight: 600;
        }
        .chat-bubble--assistant blockquote {
          border-left: 3px solid #1677ff;
          margin: 8px 0;
          padding: 4px 12px;
          color: #666;
        }
        .chat-bubble--assistant strong {
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}
