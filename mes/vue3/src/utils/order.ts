// src/utils/order.ts —— 工单/派工纯函数
import type { SpOrder, SpDispatchAssign } from '@/types/order'

/** 剥空串/空值，qty 数值化；返回可直接提交的 payload */
export function buildOrderPayload(form: Partial<SpOrder>): Partial<SpOrder> {
  const out: Record<string, unknown> = {}
  Object.entries(form).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    out[k] = v
  })
  if (out.qty !== undefined) out.qty = Number(out.qty)
  return out as Partial<SpOrder>
}

/** 校验，返回首条错误文案；合法返回空串 */
export function validateOrder(form: Partial<SpOrder>): string {
  if (!form.orderCode?.trim()) return '请输入工单编号'
  if (!form.qty || Number(form.qty) <= 0) return '数量须为正整数'
  if (!form.orderType) return '请选择工单类型'
  if (!form.materiel) return '请选择物料'
  return ''
}

const TYPE_LABEL: Record<string, string> = { P: '量产', A: '验证', F: '返工' }
export function orderTypeLabel(t?: string): string {
  return (t && TYPE_LABEL[t]) || t || '-'
}

type TagType = 'success' | 'warning' | 'info' | 'primary' | 'danger'
const STATUS_META: Record<number, { label: string; tag: TagType }> = {
  0: { label: '待派工', tag: 'warning' },
  1: { label: '已派工', tag: 'primary' },
  2: { label: '进行中', tag: 'primary' },
  3: { label: '已结束', tag: 'success' },
  4: { label: '已终结', tag: 'info' },
}
export function orderStatusMeta(s?: number): { label: string; tag: TagType } {
  return (s !== undefined && STATUS_META[s]) || { label: '未知', tag: 'info' }
}

/** 派工提交体：注入 orderIds，剥空可选项 */
export function buildDispatchPayload(
  orderIds: string[],
  form: { teamId: string; userId: string; laborHours: number; planStartTime?: string; planEndTime?: string; remark?: string },
): SpDispatchAssign {
  const out: SpDispatchAssign = { orderIds, teamId: form.teamId, userId: form.userId, laborHours: Number(form.laborHours) }
  if (form.planStartTime) out.planStartTime = form.planStartTime
  if (form.planEndTime) out.planEndTime = form.planEndTime
  if (form.remark) out.remark = form.remark
  return out
}

export function validateDispatch(
  orderIds: string[],
  form: { teamId: string; userId: string; laborHours: number },
): string {
  if (!orderIds.length) return '请至少选择一张工单'
  if (!form.teamId) return '请选择班组'
  if (!form.userId) return '请选择作业员'
  if (!form.laborHours || Number(form.laborHours) <= 0) return '工时须大于 0'
  return ''
}
