import type { SpOper, TransferItem, SpOperVo, SpFlowDtoReq } from '@/types/technology'

/** 构造工序 add-or-update 提交体:剥空、数值化、generatePlan 兜底 '1' */
export function buildOperPayload(form: Partial<SpOper>): Partial<SpOper> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(form)) {
    if (v === undefined || v === '') continue
    out[k] = v
  }
  if (out.laborHours !== undefined) out.laborHours = Number(out.laborHours)
  if (out.manufacturingCycle !== undefined) out.manufacturingCycle = Number(out.manufacturingCycle)
  if (out.generatePlan === undefined) out.generatePlan = '1'
  return out as Partial<SpOper>
}

/** 校验工序表单,返回错误信息或 null。规则:描述必填、工时/周期非负整数、制造周期 > 工时 */
export function validateOper(form: Partial<SpOper>): string | null {
  if (!form.operDesc || !form.operDesc.trim()) return '请输入工序描述'
  const lh = form.laborHours
  const mc = form.manufacturingCycle
  const bad = (n: number | undefined) => n !== undefined && (!Number.isInteger(n) || n < 0)
  if (bad(lh) || bad(mc)) return '工时与制造周期须为非负整数'
  if (lh !== undefined && mc !== undefined && mc <= lh) return '制造周期必须大于工时'
  return null
}

/** SpOper → 穿梭框项(primary=描述, secondary=编码) */
export function operToTransferItem(o: SpOper): TransferItem {
  return { id: o.id, primary: o.operDesc, secondary: o.operCode }
}

/** 候选池排除已选 id */
export function excludeSelected(pool: TransferItem[], selectedIds: Set<string>): TransferItem[] {
  return pool.filter((it) => !selectedIds.has(it.id))
}

/** 不可变重排:把 idx 处元素按 dir(-1 上/1 下)移动一位;越界原样返回 */
export function moveItem<T>(list: T[], idx: number, dir: -1 | 1): T[] {
  const target = idx + dir
  if (target < 0 || target >= list.length) return list
  const next = [...list]
  ;[next[idx], next[target]] = [next[target], next[idx]]
  return next
}

/** 有序工序项 → SpOperVo[](value=id, title=编码,缺失回落 primary) */
export function toSpOperVoList(items: TransferItem[]): SpOperVo[] {
  return items.map((it) => ({ value: it.id, title: it.secondary ?? it.primary }))
}

/** 组装工艺路线级联保存入参 */
export function buildFlowPayload(
  form: { id?: string; flow: string; flowDesc?: string },
  items: TransferItem[],
): SpFlowDtoReq {
  const payload: SpFlowDtoReq = {
    flow: form.flow.trim(),
    flowDesc: (form.flowDesc ?? '').trim(),
    spOperVoList: toSpOperVoList(items),
  }
  if (form.id) payload.id = form.id
  return payload
}

/** 校验工艺路线表单,返回错误信息或 null */
export function validateFlow(
  form: { flow: string; flowDesc?: string },
  items: TransferItem[],
): string | null {
  if (!form.flow || !form.flow.trim()) return '请输入流程代码'
  if (!form.flowDesc || !form.flowDesc.trim()) return '请输入流程描述'
  if (items.length < 2) return '工艺路线至少需要 2 道工序'
  return null
}
