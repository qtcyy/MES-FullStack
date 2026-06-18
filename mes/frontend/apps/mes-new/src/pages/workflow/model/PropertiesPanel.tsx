import { useEffect, useState } from 'react'
import {
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui'
import type { SelectedElement } from './BpmnDesigner'
import type { AssigneeType } from './bpmnUtils'
import type { SysRole } from '@/types/system'

interface PropertiesPanelProps {
  element: SelectedElement | null
  roles: SysRole[]
  onChangeName: (name: string) => void
  onChangeAssignee: (type: AssigneeType, roleCode?: string) => void
}

function deriveType(el: SelectedElement | null): AssigneeType {
  if (el?.candidateGroups) return 'candidate'
  return 'initiator'
}

export default function PropertiesPanel({
  element,
  roles,
  onChangeName,
  onChangeAssignee,
}: PropertiesPanelProps) {
  const [name, setName] = useState('')
  const [assigneeType, setAssigneeType] = useState<AssigneeType>('initiator')
  const [roleCode, setRoleCode] = useState<string>('')

  // 选中元素变化时同步本地受控态
  useEffect(() => {
    setName(element?.name ?? '')
    setAssigneeType(deriveType(element))
    setRoleCode(element?.candidateGroups ?? '')
  }, [element])

  if (!element) {
    return (
      <div className="p-4 text-sm text-muted-foreground">请选择左侧节点进行配置</div>
    )
  }

  const isUserTask = element.type === 'bpmn:UserTask'

  return (
    <div className="space-y-5 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          节点属性
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{element.type}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pp-name">节点名称</Label>
        <Input
          id="pp-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => onChangeName(name)}
        />
      </div>

      {isUserTask ? (
        <div className="space-y-3">
          <Label>办理人</Label>
          <RadioGroup
            value={assigneeType}
            onValueChange={(v) => {
              const t = v as AssigneeType
              setAssigneeType(t)
              onChangeAssignee(t, t === 'candidate' ? roleCode || undefined : undefined)
            }}
          >
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="initiator" id="pp-initiator" />
              流程发起人
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="candidate" id="pp-candidate" />
              候选组(按角色)
            </label>
          </RadioGroup>

          {assigneeType === 'candidate' && (
            <div className="space-y-1.5">
              <Label htmlFor="pp-role">生产主管角色</Label>
              <Select
                value={roleCode}
                onValueChange={(v) => {
                  setRoleCode(v)
                  onChangeAssignee('candidate', v)
                }}
              >
                <SelectTrigger id="pp-role">
                  <SelectValue placeholder="选择角色" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.code}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">该节点无需配置办理人</p>
      )}
    </div>
  )
}
