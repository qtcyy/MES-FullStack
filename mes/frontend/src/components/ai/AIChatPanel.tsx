import { useEffect, useRef, useState } from 'react'
import { Input, Button, Space } from 'antd'
import {
  CloseOutlined,
  SendOutlined,
  DeleteOutlined,
  LoadingOutlined,
  ExpandOutlined,
  CompressOutlined,
} from '@ant-design/icons'
import { motion, AnimatePresence } from 'motion/react'
import ChatMessage from './ChatMessage'
import QuickPrompts from './QuickPrompts'
import useAIChatStore from '@/stores/aiChatStore'
import { fetchQuickPrompts } from '@/api/ai'
import type { QuickPrompt } from '@/types/ai'

/** 小窗默认尺寸 */
const PANEL_W = 420
const PANEL_H = 540
const GAP = 24

export default function AIChatPanel() {
  const {
    messages,
    isLoading,
    isOpen,
    isMaximized,
    thinkingText,
    close,
    sendMessage,
    clearMessages,
    toggleMaximize,
  } = useAIChatStore()

  const [inputValue, setInputValue] = useState('')
  const [quickPrompts, setQuickPrompts] = useState<QuickPrompt[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const constraintsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchQuickPrompts().then(setQuickPrompts)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
      if (isMaximized) {
        toggleMaximize()
      } else {
        close()
      }
    }
  }

  const handlePromptClick = (prompt: QuickPrompt) => {
    sendMessage(prompt.text)
  }

  return (
    <>
      {/* 拖拽约束参考层 — 在 AnimatePresence 外部，不参与动画 */}
      {isOpen && (
        <div
          ref={constraintsRef}
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 999,
          }}
        />
      )}

      <AnimatePresence>
        {isOpen && (
          <>
            {/* 最大化半透明遮罩 */}
            {isMaximized && (
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.3)',
                  zIndex: 998,
                }}
                onClick={() => toggleMaximize()}
              />
            )}

            <motion.div
            key="panel"
            drag={!isMaximized}
            dragConstraints={constraintsRef}
            dragElastic={0.05}
            dragMomentum={false}
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={
              isMaximized
                ? {
                    opacity: 1,
                    scale: 1,
                    x: 0,
                    y: 0,
                    width: '100vw',
                    height: '100vh',
                    bottom: 0,
                    right: 0,
                    borderRadius: 0,
                  }
                : {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    width: PANEL_W,
                    height: PANEL_H,
                    bottom: 96,
                    right: GAP,
                    borderRadius: 12,
                  }
            }
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 35,
            }}
            style={{
              position: 'fixed',
              background: '#fff',
              boxShadow:
                '0 8px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 999,
              overflow: 'hidden',
              pointerEvents: 'auto',
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
                cursor: isMaximized ? 'default' : 'grab',
                flexShrink: 0,
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
                  title="清空对话"
                />
                <Button
                  type="text"
                  size="small"
                  icon={
                    isMaximized ? <CompressOutlined /> : <ExpandOutlined />
                  }
                  onClick={toggleMaximize}
                  style={{ color: 'rgba(255,255,255,0.8)' }}
                  title={isMaximized ? '还原' : '最大化'}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={close}
                  style={{ color: 'rgba(255,255,255,0.8)' }}
                  title="关闭"
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
                minHeight: 0,
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
                  flexShrink: 0,
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
                flexShrink: 0,
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

            {/* Inline styles */}
            <style>{`
              @keyframes loading {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
              }
              .chat-bubble--assistant p { margin: 0 0 8px 0; }
              .chat-bubble--assistant p:last-child { margin-bottom: 0; }
              .chat-bubble--assistant ul, .chat-bubble--assistant ol { margin: 4px 0; padding-left: 20px; }
              .chat-bubble--assistant li { margin-bottom: 2px; }
              .chat-bubble--assistant code { background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 4px; font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace; font-size: 13px; }
              .chat-bubble--assistant pre { background: #1e1e1e; color: #d4d4d4; padding: 12px; border-radius: 8px; overflow-x: auto; margin: 8px 0; font-size: 13px; line-height: 1.5; }
              .chat-bubble--assistant pre code { background: none; padding: 0; border-radius: 0; color: inherit; font-size: inherit; }
              .chat-bubble--assistant table { border-collapse: collapse; margin: 8px 0; font-size: 13px; }
              .chat-bubble--assistant th, .chat-bubble--assistant td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
              .chat-bubble--assistant th { background: #f0f0f0; font-weight: 600; }
              .chat-bubble--assistant blockquote { border-left: 3px solid #1677ff; margin: 8px 0; padding: 4px 12px; color: #666; }
              .chat-bubble--assistant strong { font-weight: 600; }
            `}</style>
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
