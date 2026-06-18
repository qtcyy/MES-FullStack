export interface UserTaskSummary {
  id: string
  name?: string
  assignee?: string
  candidateGroups?: string
}

export interface BpmnSummary {
  hasStart: boolean
  hasEnd: boolean
  userTasks: UserTaskSummary[]
  disconnectedCount: number
}

export interface ValidationResult {
  ok: boolean
  issues: string[]
}

export type AssigneeType = 'initiator' | 'candidate'

/** 转义 XML 属性值(& < > "),避免名称含特殊字符生成非良构 XML 致 bpmn-js 导入失败 */
function escapeXmlAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 生成只含一个开始事件的最小 BPMN 2.0 XML(process id=modelKey) */
export function initialBpmnXml(modelKey: string, name: string): string {
  const safeName = escapeXmlAttr(name)
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:flowable="http://flowable.org/bpmn" id="Definitions_${modelKey}" targetNamespace="http://flowable.org/processdef">
  <bpmn:process id="${modelKey}" name="${safeName}" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" name="开始" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${modelKey}">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="180" y="160" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`
}

/** 纯函数:基于结构摘要校验"流程定义完成情况" */
export function validateSummary(s: BpmnSummary): ValidationResult {
  const issues: string[] = []
  if (!s.hasStart) issues.push('缺少开始事件')
  if (!s.hasEnd) issues.push('缺少结束事件')
  if (s.userTasks.length === 0) issues.push('至少需要一个用户任务节点')
  for (const t of s.userTasks) {
    const label = t.name?.trim() || t.id
    if (!t.name?.trim()) issues.push(`用户任务「${t.id}」未命名`)
    if (!t.assignee && !t.candidateGroups) issues.push(`用户任务「${label}」未配置办理人`)
  }
  if (s.disconnectedCount > 0) issues.push(`存在 ${s.disconnectedCount} 个未连接的节点`)
  return { ok: issues.length === 0, issues }
}

/** 纯函数:由办理人类型计算 flowable 属性(两者互斥,另一个置 undefined 以清除) */
export function buildAssigneeProps(
  type: AssigneeType,
  roleCode?: string,
): { 'flowable:assignee'?: string; 'flowable:candidateGroups'?: string } {
  if (type === 'initiator') {
    return { 'flowable:assignee': '${initiator}', 'flowable:candidateGroups': undefined }
  }
  return { 'flowable:assignee': undefined, 'flowable:candidateGroups': roleCode || undefined }
}
