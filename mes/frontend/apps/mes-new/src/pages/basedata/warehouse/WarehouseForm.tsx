// apps/mes-new/src/pages/basedata/warehouse/WarehouseForm.tsx
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Label, Textarea, toast } from '@workspace/ui'
import { Warehouse as WarehouseIcon } from 'lucide-react'
import FormDialog, { FormSection } from '@/components/FormDialog'
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
      <FormSection title="基本信息">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="wh-code">库房编码</Label>
            <Input id="wh-code" {...register('code')} />
            {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wh-name">库房名称</Label>
            <Input id="wh-name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wh-type">库房类型</Label>
          <Input id="wh-type" placeholder="如:零件库 / 产品库" {...register('type')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wh-descr">描述</Label>
          <Textarea id="wh-descr" {...register('descr')} />
        </div>
      </FormSection>

      <FormSection title="库位规格">
        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="wh-groups">组</Label>
            <Input id="wh-groups" type="number" min={1} {...register('groups')} />
            {errors.groups && <p className="text-xs text-destructive">{errors.groups.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wh-rows">排</Label>
            <Input id="wh-rows" type="number" min={1} {...register('rows')} />
            {errors.rows && <p className="text-xs text-destructive">{errors.rows.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wh-layers">层</Label>
            <Input id="wh-layers" type="number" min={1} {...register('layers')} />
            {errors.layers && <p className="text-xs text-destructive">{errors.layers.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wh-columns">列</Label>
            <Input id="wh-columns" type="number" min={1} {...register('columns')} />
            {errors.columns && <p className="text-xs text-destructive">{errors.columns.message}</p>}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">保存后后端按「组 × 排 × 层 × 列」自动生成库位。</p>
      </FormSection>
    </FormDialog>
  )
}
