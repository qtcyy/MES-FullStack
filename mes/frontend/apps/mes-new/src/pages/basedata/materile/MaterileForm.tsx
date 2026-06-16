// apps/mes-new/src/pages/basedata/materile/MaterileForm.tsx
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@workspace/ui'
import { Package, Info, Boxes, Image as ImageIcon } from 'lucide-react'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import ImageUpload from '@/components/ImageUpload'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { materileAddOrUpdate } from '@/api/basedata/materile'
import type { Materiel } from '@/types/basedata'

interface MaterileFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: Materiel | null
  onSaved: () => void
}

const MAT_TYPES = ['产品', '零件', '标准件', '其他'] as const
const SOURCES = ['自制', '外购'] as const
const TYPE_DEFAULTS: Record<string, { source: string; leadTime: number }> = {
  产品: { source: '自制', leadTime: 3 },
  零件: { source: '外购', leadTime: 1 },
  标准件: { source: '外购', leadTime: 1 },
  其他: { source: '外购', leadTime: 1 },
}

const schema = z.object({
  matType: z.string().min(1, '请选择物料类型'),
  materielDesc: z.string().min(1, '请输入物料描述'),
  model: z.string().optional(),
  unit: z.string().optional(),
  source: z.string().optional(),
  size: z.string().optional(),
  productGroup: z.string().optional(),
  leadTime: z.coerce.number().int().min(1, '提前期最小为 1'),
  safetyStock: z.coerce.number().int().min(0, '安全库存不能为负'),
  imageUrl: z.string().optional(),
})

export default function MaterileForm({ open, onOpenChange, record, onSaved }: MaterileFormProps) {
  const isEdit = !!record
  const { mutate, loading } = useMutation$((dto: Partial<Materiel>) => materileAddOrUpdate(dto))
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { matType: '', materielDesc: '', model: '', unit: '', source: '', size: '', productGroup: '', leadTime: 1, safetyStock: 0, imageUrl: '' },
  })

  useEffect(() => {
    if (open) {
      reset({
        matType: record?.matType ?? '',
        materielDesc: record?.materielDesc ?? '',
        model: record?.model ?? '',
        unit: record?.unit ?? '',
        source: record?.source ?? '',
        size: record?.size ?? '',
        productGroup: record?.productGroup ?? '',
        leadTime: record?.leadTime ?? 1,
        safetyStock: record?.safetyStock ?? 0,
        imageUrl: record?.imageUrl ?? '',
      })
    }
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    const dto: Partial<Materiel> = {
      ...(record ?? { deleted: '0' }),
      matType: values.matType,
      materielDesc: values.materielDesc,
      model: values.model ?? '',
      unit: values.unit ?? '',
      source: values.source ?? '',
      size: values.size ?? '',
      productGroup: values.productGroup ?? '',
      leadTime: values.leadTime,
      safetyStock: values.safetyStock,
      imageUrl: values.imageUrl ?? '',
    }
    try {
      await mutate(dto)
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["basedata","materile"')
      onOpenChange(false)
      onSaved()
    } catch {
      /* 拦截器已 toast */
    }
  })

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={isEdit ? '编辑物料' : '新增物料'} icon={Package} description="维护物料主数据与图片" onSubmit={onSubmit} submitting={loading} contentClassName="sm:max-w-2xl">
      <FormSection title="基本信息" icon={Info} tag="必填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="物料类型" required error={errors.matType?.message}>
            <Controller
              control={control}
              name="matType"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v)
                    const d = TYPE_DEFAULTS[v]
                    if (d) {
                      setValue('source', d.source)
                      setValue('leadTime', d.leadTime)
                    }
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="请选择类型" /></SelectTrigger>
                  <SelectContent>
                    {MAT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          {isEdit && (
            <FormField label="物料编码" htmlFor="m-materiel">
              <Input id="m-materiel" value={record?.materiel ?? ''} disabled />
            </FormField>
          )}
        </div>
        <FormField label="物料描述" htmlFor="m-desc" required error={errors.materielDesc?.message}>
          <Input id="m-desc" aria-invalid={!!errors.materielDesc} {...register('materielDesc')} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="型号" htmlFor="m-model">
            <Input id="m-model" {...register('model')} />
          </FormField>
          <FormField label="单位" htmlFor="m-unit">
            <Input id="m-unit" {...register('unit')} />
          </FormField>
        </div>
      </FormSection>
      <FormSection title="采购与库存" icon={Boxes} tag="选填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="物料来源">
            <Controller
              control={control}
              name="source"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="请选择来源" /></SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label="规格" htmlFor="m-size">
            <Input id="m-size" {...register('size')} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="提前期(天)" htmlFor="m-lead" required error={errors.leadTime?.message}>
            <Input id="m-lead" type="number" aria-invalid={!!errors.leadTime} {...register('leadTime')} />
          </FormField>
          <FormField label="安全库存" htmlFor="m-stock" required error={errors.safetyStock?.message}>
            <Input id="m-stock" type="number" aria-invalid={!!errors.safetyStock} {...register('safetyStock')} />
          </FormField>
        </div>
        <FormField label="产品组" htmlFor="m-group">
          <Input id="m-group" {...register('productGroup')} />
        </FormField>
      </FormSection>
      <FormSection title="物料图片" icon={ImageIcon}>
        <Controller
          control={control}
          name="imageUrl"
          render={({ field }) => <ImageUpload value={field.value} onChange={field.onChange} />}
        />
      </FormSection>
    </FormDialog>
  )
}
