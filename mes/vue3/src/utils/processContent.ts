import type {
  SpProcessContent,
  SpProcessEquipment,
  ProcessContentListItem,
  ProcessContentTreeNode,
} from '@/types/technology'

/** 逗号连接 key 串 → 去空白滤空数组 */
export function parseCsvKeys(csv?: string): string[] {
  if (!csv) return []
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** key 数组 → 逗号连接串 */
export function joinKeys(keys: string[]): string {
  return keys.join(',')
}

export function inspectionToBool(s?: string): boolean {
  return s === '1'
}
export function boolToInspection(b: boolean): string {
  return b ? '1' : '0'
}

/** completed 不可编辑;null/draft 可编辑 */
export function canEditContent(status?: string | null): boolean {
  return status !== 'completed'
}

/** 主信息 Tab 表单模型(视图侧,提交前转 payload) */
export interface ContentFormModel {
  bomId: string
  flowId?: string
  mainInfo?: string
  content?: string
  requirements?: string
  notes?: string
  contentImageKeys: string[]
  inspectionImageKeys: string[]
  inspectionRequiredBool: boolean
}

/** 校验:mainInfo/content 必填,返回首个错误文案,合法 null */
export function validateContent(form: { mainInfo?: string; content?: string }): string | null {
  if (!form.mainInfo?.trim()) return '主信息不能为空'
  if (!form.content?.trim()) return '工艺内容不能为空'
  return null
}

/** 构造保存 payload:不带 status(后端管理);inspectionRequired→'1'/'0';图片 joinKeys;有 existingId 则带 id */
export function buildContentPayload(form: ContentFormModel, existingId?: string): SpProcessContent {
  return {
    ...(existingId ? { id: existingId } : {}),
    bomId: form.bomId,
    ...(form.flowId ? { flowId: form.flowId } : {}),
    mainInfo: form.mainInfo?.trim() ?? '',
    content: form.content?.trim() ?? '',
    requirements: form.requirements?.trim() ?? '',
    notes: form.notes?.trim() ?? '',
    contentImages: joinKeys(form.contentImageKeys),
    inspectionImages: joinKeys(form.inspectionImageKeys),
    inspectionRequired: boolToInspection(form.inspectionRequiredBool),
  }
}

/** 设备 payload(挂 contentId) */
export function buildEquipmentPayload(
  form: { id?: string; name: string; quantity?: number; remark?: string },
  contentId: string,
): SpProcessEquipment {
  return {
    ...(form.id ? { id: form.id } : {}),
    contentId,
    name: form.name.trim(),
    quantity: form.quantity ?? 1,
    remark: form.remark?.trim() ?? '',
  }
}

/** 扁平 list → 树:按 bomNode.parentId 建父子,同级 sortOrder 升序,附 content/contentStatus */
export function buildTreeFromList(items: ProcessContentListItem[]): ProcessContentTreeNode[] {
  const map = new Map<string, ProcessContentTreeNode>()
  for (const it of items) {
    map.set(it.bomNode.id, {
      ...it.bomNode,
      content: it.content,
      contentStatus: it.content?.status ?? null,
      children: [],
    })
  }
  const roots: ProcessContentTreeNode[] = []
  for (const it of items) {
    const node = map.get(it.bomNode.id)!
    const pid = it.bomNode.parentId
    if (pid && map.has(pid)) map.get(pid)!.children.push(node)
    else roots.push(node)
  }
  const sortRec = (ns: ProcessContentTreeNode[]) => {
    ns.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    ns.forEach((n) => sortRec(n.children))
  }
  sortRec(roots)
  return roots
}
