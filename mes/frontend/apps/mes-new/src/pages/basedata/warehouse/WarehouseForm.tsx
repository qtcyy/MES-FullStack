// apps/mes-new/src/pages/basedata/warehouse/WarehouseForm.tsx
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Textarea, toast } from '@workspace/ui'
import { Warehouse as WarehouseIcon, Info, LayoutGrid } from 'lucide-react'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { warehouseAddOrUpdate } from '@/api/basedata/warehouse'
import type { SpWarehouse } from '@/types/warehouse'

const schema = z.object({
  code: z.string().min(1, '请输入库房编码'),
  name: z.string().min(1, '请输入库房名称'),
  type: z.string().optional(),
  groups: z.coerce.number().int().min(1, '至少 1 组'),
  rows: z.coerce.number().int().min(1, '至少 1 排'),
  layers: z.coerce.number().int().min(1, '至少 1 层'),
  columns: z.coerce.number().int().min(1, '至少 1 列'),
  descr: z.string().optional(),
})

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SpWarehouse | null
}

export default function WarehouseForm({ open, onOpenChange, record }: Props) {
  const isEdit = !!record
  const { mutate, loading } = useMutation$((dto: Partial<SpWarehouse>) => warehouseAddOrUpdate(dto))
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', name: '', type: '', groups: 1, rows: 1, layers: 1, columns: 1, descr: '' },
  })

  useEffect(() => {
    if (open) {
      reset({
        code: record?.code ?? '',
        name: record?.name ?? '',
        type: record?.type ?? '',
        groups: record?.groups ?? 1,
        rows: record?.rows ?? 1,
        layers: record?.layers ?? 1,
        columns: record?.columns ?? 1,
        descr: record?.descr ?? '',
      })
    }
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      // 仅提交实体字段 + id + deleted,避免把时间戳/无关字段回传给后端
      await mutate({ id: record?.id, deleted: record?.deleted ?? '0', ...values })
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["basedata","warehouse"')
      onOpenChange(false)
    } catch {
      /* toast */
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑仓库' : '新增仓库'}
      description="维护库房主数据;库位将按规格自动生成"
      icon={WarehouseIcon}
      onSubmit={onSubmit}
      submitting={loading}
    >
      <FormSection title="基本信息" icon={Info} tag="必填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="库房编码" htmlFor="wh-code" required error={errors.code?.message}>
            <Input id="wh-code" aria-invalid={!!errors.code} {...register('code')} />
          </FormField>
          <FormField label="库房名称" htmlFor="wh-name" required error={errors.name?.message}>
            <Input id="wh-name" aria-invalid={!!errors.name} {...register('name')} />
          </FormField>
        </div>
        <FormField label="库房类型" htmlFor="wh-type">
          <Input id="wh-type" placeholder="如:零件库 / 产品库" {...register('type')} />
        </FormField>
        <FormField label="描述" htmlFor="wh-descr">
          <Textarea id="wh-descr" {...register('descr')} />
        </FormField>
      </FormSection>
      <FormSection title="库位规格" icon={LayoutGrid} tag="必填">
        <div className="grid grid-cols-4 gap-3">
          <FormField label="组" htmlFor="wh-groups" required error={errors.groups?.message}>
            <Input id="wh-groups" type="number" min={1} aria-invalid={!!errors.groups} {...register('groups')} />
          </FormField>
          <FormField label="排" htmlFor="wh-rows" required error={errors.rows?.message}>
            <Input id="wh-rows" type="number" min={1} aria-invalid={!!errors.rows} {...register('rows')} />
          </FormField>
          <FormField label="层" htmlFor="wh-layers" required error={errors.layers?.message}>
            <Input id="wh-layers" type="number" min={1} aria-invalid={!!errors.layers} {...register('layers')} />
          </FormField>
          <FormField label="列" htmlFor="wh-columns" required error={errors.columns?.message}>
            <Input id="wh-columns" type="number" min={1} aria-invalid={!!errors.columns} {...register('columns')} />
          </FormField>
        </div>
        <p className="text-xs text-muted-foreground">保存后后端按「组 × 排 × 层 × 列」自动生成库位。</p>
      </FormSection>
    </FormDialog>
  )
}
