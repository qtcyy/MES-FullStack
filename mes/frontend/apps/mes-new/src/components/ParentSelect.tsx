// apps/mes-new/src/components/ParentSelect.tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui'
import { flattenTreeForSelect, type SelectTreeNode } from '@/utils/tree'

interface ParentSelectProps {
  nodes: SelectTreeNode[]
  value?: string
  onChange: (value: string) => void
  excludeId?: string
  rootLabel?: string
  rootValue?: string
  placeholder?: string
}

export default function ParentSelect({
  nodes,
  value,
  onChange,
  excludeId,
  rootLabel = '顶级(无上级)',
  rootValue = '0',
  placeholder = '请选择上级',
}: ParentSelectProps) {
  const options = flattenTreeForSelect(nodes, { excludeId })
  return (
    <Select value={value || rootValue} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={rootValue}>{rootLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
