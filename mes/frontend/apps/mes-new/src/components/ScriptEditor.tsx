import { Textarea } from '@workspace/ui'
import { SCRIPT_VARIABLES } from '@/pages/workflow/formUtils'

interface ScriptEditorProps {
  id?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  invalid?: boolean
  /** 是否显示底部变量提示(默认显示) */
  showHint?: boolean
}

/** 轻量脚本编辑器：等宽 Textarea + 变量提示(mock 不执行脚本) */
export default function ScriptEditor({
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
  invalid,
  showHint = true,
}: ScriptEditorProps) {
  return (
    <div className="space-y-1">
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        spellCheck={false}
        aria-invalid={invalid}
        className="font-mono text-xs leading-relaxed"
      />
      {showHint && (
        <p className="text-[11px] text-muted-foreground">
          可用变量：{SCRIPT_VARIABLES.map((v) => `${v.token}(${v.label})`).join('、')}
        </p>
      )}
    </div>
  )
}
