import { useEffect, useRef, useState } from 'react'
import { firstValueFrom } from 'rxjs'
import { Button, Input, Switch, toast } from '@workspace/ui'
import { AlertCircle, ArrowDown, ArrowUp, Database, Plus, Trash2 } from 'lucide-react'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { managerAddOrUpdate, managerItems } from '@/api/basedata/manager'
import {
  buildUpsertPayload,
  moveRow,
  parseMustFill,
  validateManagerForm,
  type FieldRow,
  type ManagerHeader,
} from './managerFormUtils'
import type { ManagerUpsertPayload, SpTableManager } from '@/types/manager'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SpTableManager | null
}

export default function ManagerForm({ open, onOpenChange, record }: Props) {
  const isEdit = !!record
  const [header, setHeader] = useState<ManagerHeader>({ tableName: '', tableDesc: '', permission: '' })
  const [rows, setRows] = useState<FieldRow[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const keySeq = useRef(0)
  const newKey = () => {
    keySeq.current += 1
    return `row-${keySeq.current}`
  }

  const { mutate, loading } = useMutation$((payload: ManagerUpsertPayload) => managerAddOrUpdate(payload))

  // 打开时初始化:新建给一个空行;编辑拉明细回填
  useEffect(() => {
    if (!open) return
    setErrors([])
    setHeader({
      tableName: record?.tableName ?? '',
      tableDesc: record?.tableDesc ?? '',
      permission: record?.permission ?? '',
    })
    if (record?.id) {
      setLoadingItems(true)
      firstValueFrom(managerItems(record.id))
        .then((items) => {
          setRows(
            (items ?? []).map((it) => ({
              key: newKey(),
              field: it.field ?? '',
              fieldDesc: it.fieldDesc ?? '',
              mustFill: parseMustFill(it.mustFill),
            })),
          )
        })
        .catch(() => {
          /* 拦截器已 toast */
        })
        .finally(() => setLoadingItems(false))
    } else {
      setRows([{ key: newKey(), field: '', fieldDesc: '', mustFill: false }])
    }
  }, [open, record])

  const addRow = () => setRows((rs) => [...rs, { key: newKey(), field: '', fieldDesc: '', mustFill: false }])
  const removeRow = (key: string) => setRows((rs) => rs.filter((r) => r.key !== key))
  const updateRow = (key: string, patch: Partial<FieldRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const move = (index: number, dir: -1 | 1) => setRows((rs) => moveRow(rs, index, dir))

  const onSubmit = async () => {
    const result = validateManagerForm(header, rows)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors([])
    try {
      await mutate(buildUpsertPayload(header, rows, record?.id))
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["basedata","manager","page"')
      onOpenChange(false)
    } catch {
      /* 拦截器已 toast */
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑动态表' : '新建动态表'}
      description="维护动态表表头与字段明细"
      icon={Database}
      onSubmit={onSubmit}
      submitting={loading}
      contentClassName="sm:max-w-3xl"
    >
      <FormSection title="表头信息" icon={Database}>
        <FormField label="表名" htmlFor="m-table-name" required>
          <Input
            id="m-table-name"
            placeholder="如:product"
            value={header.tableName}
            onChange={(e) => setHeader((h) => ({ ...h, tableName: e.target.value }))}
          />
        </FormField>
        <FormField label="表描述" htmlFor="m-table-desc">
          <Input
            id="m-table-desc"
            placeholder="如:产品表"
            value={header.tableDesc}
            onChange={(e) => setHeader((h) => ({ ...h, tableDesc: e.target.value }))}
          />
        </FormField>
        <FormField label="权限标识" htmlFor="m-permission" help="多个用逗号分隔,如 product:list,product:edit">
          <Input
            id="m-permission"
            placeholder="选填"
            value={header.permission}
            onChange={(e) => setHeader((h) => ({ ...h, permission: e.target.value }))}
          />
        </FormField>
      </FormSection>

      <FormSection title="字段明细" icon={Plus} tag={`${rows.length} 个字段`}>
        {errors.length > 0 && (
          <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
            <div className="flex items-center gap-1.5 font-medium">
              <AlertCircle className="size-3.5" />
              请修正以下问题
            </div>
            <ul className="list-disc pl-5">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        {loadingItems ? (
          <div className="py-6 text-center text-sm text-muted-foreground">加载字段明细…</div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[2rem_1fr_1fr_4rem_5rem] items-center gap-2 px-1 text-[11px] font-medium text-muted-foreground">
              <span>序</span>
              <span>字段名 *</span>
              <span>显示名 *</span>
              <span className="text-center">必填</span>
              <span className="text-right">操作</span>
            </div>
            {rows.map((r, i) => (
              <div key={r.key} className="grid grid-cols-[2rem_1fr_1fr_4rem_5rem] items-center gap-2">
                <span className="text-xs text-muted-foreground">{i + 1}</span>
                <Input
                  className="h-8"
                  placeholder="product_code"
                  value={r.field}
                  onChange={(e) => updateRow(r.key, { field: e.target.value })}
                />
                <Input
                  className="h-8"
                  placeholder="产品代码"
                  value={r.fieldDesc}
                  onChange={(e) => updateRow(r.key, { fieldDesc: e.target.value })}
                />
                <div className="flex justify-center">
                  <Switch checked={r.mustFill} onCheckedChange={(v) => updateRow(r.key, { mustFill: v })} />
                </div>
                <div className="flex justify-end gap-0.5">
                  <Button type="button" variant="ghost" size="icon-sm" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={i === rows.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" disabled={rows.length === 1} onClick={() => removeRow(r.key)}>
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={addRow}>
              <Plus className="size-4" />
              添加字段
            </Button>
          </div>
        )}
      </FormSection>
    </FormDialog>
  )
}
