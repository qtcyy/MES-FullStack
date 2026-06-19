import { map, type Observable } from 'rxjs'
import type { PageResult } from '@/types/api'
import type { WorkflowDefinition, WorkflowModel } from '@/types/workflow'
import { ok, readList, writeList, paginate } from './mockStore'
import { modelPage } from './model'

// 下周期真后端:流程定义由发布动作落库;当前由已发布模型派生 + mock 附加状态
const STATE_KEY = 'wf_definition_state'

interface DefinitionState {
  id: string
  enabled: boolean
  formKey?: string
}

export interface DefinitionPageParams {
  current: number
  size: number
  name?: string
}

function readState(id: string): DefinitionState {
  const all = readList<DefinitionState>(STATE_KEY)
  return all.find((s) => s.id === id) ?? { id, enabled: true }
}

function writeState(next: DefinitionState): void {
  const all = readList<DefinitionState>(STATE_KEY)
  const idx = all.findIndex((s) => s.id === next.id)
  if (idx >= 0) all[idx] = next
  else all.push(next)
  writeList(STATE_KEY, all)
}

/** 定义分页：取已发布模型，叠加 mock 附加状态(enabled/formKey) */
export function definitionPage(params: DefinitionPageParams): Observable<PageResult<WorkflowDefinition>> {
  // 取足够大的一页已发布模型(mock 数据量小),前端再分页
  return modelPage({ current: 1, size: 9999, name: params.name }).pipe(
    map((page) => {
      const defs: WorkflowDefinition[] = page.records
        .filter((m: WorkflowModel) => m.status === 'PUBLISHED')
        .map((m) => {
          const st = readState(m.id)
          return {
            id: m.id,
            processKey: m.modelKey,
            processName: m.name,
            categoryCode: m.categoryCode,
            categoryName: m.categoryName,
            version: m.version,
            enabled: st.enabled,
            formKey: st.formKey,
            createTime: m.createTime,
          }
        })
      return paginate(defs, params.current, params.size)
    }),
  )
}

/** 启用/停用 */
export function definitionSetEnabled(id: string, enabled: boolean): Observable<void> {
  const st = readState(id)
  writeState({ ...st, enabled })
  return ok(undefined as unknown as void)
}

/** 关联/清除流程表单(formKey 为 null 清除) */
export function definitionSetForm(id: string, formKey: string | null): Observable<void> {
  const st = readState(id)
  writeState({ ...st, formKey: formKey ?? undefined })
  return ok(undefined as unknown as void)
}
