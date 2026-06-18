import { useEffect, useRef, useState } from 'react'
import { Database } from 'lucide-react'
import { Input, toast } from '@workspace/ui'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import type { SpTableManagerItem } from '@/types/manager'
import { commonAddOrUpdate, type DynamicRow } from '@/api/basedata/managerItem'
import { parseMustFill } from '../manager/managerFormUtils'
import { emptyRow, validateRow, buildRowPayload } from './managerItemUtils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  tableName: string
  tableNameId: string
  items: SpTableManagerItem[]
  /** 编辑时传被点行(含 id 与各列值);新增传 null */
  record?: DynamicRow | null
}

export default function ManagerItemForm({
  open,
  onOpenChange,
  tableName,
  tableNameId,
  items,
  record,
}: Props) {
  const isEdit = !!record
  const [values, setValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<string[]>([])
  const { mutate, loading } = useMutation$((body: Record<string, string>) => commonAddOrUpdate(body))

  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => {
    if (!open) return
    setErrors([])
    const currentItems = itemsRef.current
    if (record) {
      const seed: Record<string, string> = {}
      for (const it of currentItems) seed[it.field] = record[it.field] ?? ''
      setValues(seed)
    } else {
      setValues(emptyRow(currentItems))
    }
  }, [open, record])

  const onSubmit = async () => {
    const result = validateRow(items, values)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors([])
    try {
      await mutate(buildRowPayload(tableName, tableNameId, items, values, record?.id))
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["basedata","common","page"')
      onOpenChange(false)
    } catch {
      /* 拦截器已 toast */
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑数据' : '新增数据'}
      description={`维护「${tableName}」的数据行`}
      icon={Database}
      onSubmit={onSubmit}
      submitting={loading}
      contentClassName="sm:max-w-2xl"
    >
      <FormSection title="字段">
        {errors.length > 0 && (
          <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            {errors.map((e) => (
              <div key={e}>{e}</div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {items.map((it) => (
            <FormField
              key={it.field}
              label={it.fieldDesc || it.field}
              htmlFor={`mi-${it.field}`}
              required={parseMustFill(it.mustFill)}
            >
              <Input
                id={`mi-${it.field}`}
                value={values[it.field] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [it.field]: e.target.value }))}
              />
            </FormField>
          ))}
        </div>
      </FormSection>
    </FormDialog>
  )
}
