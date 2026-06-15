import type { QuickPrompt } from '@/types/ai'

interface QuickPromptsProps {
  /** 提示词列表 */
  prompts: QuickPrompt[]
  /** 用户点击某个提示词时的回调 */
  onPromptClick: (prompt: QuickPrompt) => void
}

/** 便利贴样式的快捷提示词卡片 */
export default function QuickPrompts({ prompts, onPromptClick }: QuickPromptsProps) {
  if (!prompts || prompts.length === 0) return null

  return (
    <div
      style={{
        background: '#fffef0',
        border: '1px solid #f0e8c0',
        borderRadius: 8,
        padding: 18,
        maxWidth: 320,
        margin: '0 auto',
        boxShadow: '2px 2px 8px rgba(0,0,0,0.08)',
        lineHeight: 2.2,
        fontSize: 13,
        color: '#555',
        width: '100%',
      }}
    >
      <style>{`
.quick-prompt-link {
  color: #1677ff;
  border-bottom: 1px dashed #1677ff;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}
.quick-prompt-link:hover {
  color: #0958d9;
  border-bottom-color: #0958d9;
  border-bottom-style: solid;
}
`}</style>
      <p style={{ margin: '0 0 8px 0' }}>&#128075; 您好！我可以帮您：</p>
      {prompts.map((prompt) => (
        <p key={prompt.id} style={{ margin: '4px 0' }}>
          {prompt.icon && <span style={{ marginRight: 4 }}>{prompt.icon}</span>}
          <span
            className="quick-prompt-link"
            onClick={() => onPromptClick(prompt)}
          >
            {prompt.displayText}
          </span>
        </p>
      ))}
    </div>
  )
}
