// apps/mes-new/src/components/TreeView.tsx
import { useState } from 'react'
import { Checkbox, cn } from '@workspace/ui'
import { ChevronRight } from 'lucide-react'
import { getCheckState, toggleNode } from '@/utils/tree'

export interface TreeViewNode {
  id: string
  label: string
  children?: TreeViewNode[]
}

interface TreeViewProps {
  nodes: TreeViewNode[]
  checkedIds: string[]
  onCheckedChange: (ids: string[]) => void
  className?: string
}

function collectAllIds(nodes: TreeViewNode[]): Set<string> {
  const set = new Set<string>()
  const walk = (list: TreeViewNode[]) =>
    list.forEach((n) => {
      set.add(n.id)
      if (n.children) walk(n.children)
    })
  walk(nodes)
  return set
}

export default function TreeView({ nodes, checkedIds, onCheckedChange, className }: TreeViewProps) {
  const checked = new Set(checkedIds)
  const [expanded, setExpanded] = useState<Set<string>>(() => collectAllIds(nodes))

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const onToggle = (node: TreeViewNode) => onCheckedChange(Array.from(toggleNode(node, checked)))

  const renderNodes = (list: TreeViewNode[], depth: number) =>
    list.map((node) => {
      const state = getCheckState(node, checked)
      const hasChildren = !!node.children?.length
      const isOpen = expanded.has(node.id)
      return (
        <div key={node.id}>
          <div className="flex items-center gap-1.5 py-1" style={{ paddingLeft: `${depth * 1.25}rem` }}>
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.id)}
                className="inline-flex size-5 items-center justify-center rounded hover:bg-muted"
                aria-label="展开或折叠"
              >
                <ChevronRight className={cn('size-4 transition-transform', isOpen && 'rotate-90')} />
              </button>
            ) : (
              <span className="inline-block size-5" />
            )}
            <Checkbox
              checked={state === 'indeterminate' ? 'indeterminate' : state === 'checked'}
              onCheckedChange={() => onToggle(node)}
            />
            <span className="text-sm">{node.label}</span>
          </div>
          {hasChildren && isOpen && renderNodes(node.children!, depth + 1)}
        </div>
      )
    })

  return <div className={cn('select-none', className)}>{renderNodes(nodes, 0)}</div>
}
