// apps/mes-new/src/pages/basedata/materile/MaterileForm.tsx
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@workspace/ui'
import { Package } from 'lucide-react'
import FormDialog from '@/components/FormDialog'
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
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>物料类型</Label>
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
          {errors.matType && <p className="text-xs text-destructive">{errors.matType.message}</p>}
        </div>
        {isEdit && (
          <div className="space-y-1.5">
            <Label htmlFor="m-materiel">物料编码</Label>
            <Input id="m-materiel" value={record?.materiel ?? ''} disabled />
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="m-desc">物料描述</Label>
        <Input id="m-desc" {...register('materielDesc')} />
        {errors.materielDesc && <p className="text-xs text-destructive">{errors.materielDesc.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="m-model">型号</Label>
          <Input id="m-model" {...register('model')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-unit">单位</Label>
          <Input id="m-unit" {...register('unit')} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>物料来源</Label>
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
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-size">规格</Label>
          <Input id="m-size" {...register('size')} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="m-lead">提前期(天)</Label>
          <Input id="m-lead" type="number" {...register('leadTime')} />
          {errors.leadTime && <p className="text-xs text-destructive">{errors.leadTime.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-stock">安全库存</Label>
          <Input id="m-stock" type="number" {...register('safetyStock')} />
          {errors.safetyStock && <p className="text-xs text-destructive">{errors.safetyStock.message}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="m-group">产品组</Label>
        <Input id="m-group" {...register('productGroup')} />
      </div>
      <div className="space-y-1.5">
        <Label>物料图片</Label>
        <Controller
          control={control}
          name="imageUrl"
          render={({ field }) => <ImageUpload value={field.value} onChange={field.onChange} />}
        />
      </div>
    </FormDialog>
  )
}
