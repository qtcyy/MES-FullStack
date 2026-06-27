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
  Textarea,
  toast,
} from '@workspace/ui'
import { Cpu, Info } from 'lucide-react'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { deviceAddOrUpdate } from '@/api/basedata/device'
import type { SpDevice } from '@/types/device'

const STATUS_OPTIONS = [
  { value: '0', label: '空闲' },
  { value: '1', label: '运行中' },
  { value: '2', label: '维修中' },
  { value: '3', label: '报废' },
]

const schema = z.object({
  code: z.string().min(1, '请输入设备编码'),
  name: z.string().min(1, '请输入设备名称'),
  type: z.string().optional(),
  model: z.string().optional(),
  specs: z.string().optional(),
  location: z.string().optional(),
  status: z.string().optional(),
  descr: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SpDevice | null
}

export default function DeviceForm({ open, onOpenChange, record }: Props) {
  const isEdit = !!record
  const { mutate, loading } = useMutation$((dto: Partial<SpDevice>) => deviceAddOrUpdate(dto))
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', name: '', type: '', model: '', specs: '', location: '', status: '0', descr: '' },
  })

  useEffect(() => {
    if (open) {
      reset({
        code: record?.code ?? '',
        name: record?.name ?? '',
        type: record?.type ?? '',
        model: record?.model ?? '',
        specs: record?.specs ?? '',
        location: record?.location ?? '',
        status: record?.status ?? '0',
        descr: record?.descr ?? '',
      })
    }
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutate({
        id: record?.id,
        code: values.code,
        name: values.name,
        type: values.type ?? '',
        model: values.model ?? '',
        specs: values.specs ?? '',
        location: values.location ?? '',
        status: values.status ?? '0',
        descr: values.descr ?? '',
      })
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["basedata","device","page"')
      onOpenChange(false)
    } catch {
      /* 拦截器已 toast */
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑设备' : '新增设备'}
      description="维护设备基础数据"
      icon={Cpu}
      onSubmit={onSubmit}
      submitting={loading}
    >
      <FormSection title="基本信息" icon={Info} tag="必填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="设备编码" htmlFor="dev-code" required error={errors.code?.message}>
            <Input id="dev-code" aria-invalid={!!errors.code} {...register('code')} />
          </FormField>
          <FormField label="设备名称" htmlFor="dev-name" required error={errors.name?.message}>
            <Input id="dev-name" aria-invalid={!!errors.name} {...register('name')} />
          </FormField>
          <FormField label="类型" htmlFor="dev-type">
            <Input id="dev-type" {...register('type')} />
          </FormField>
          <FormField label="型号" htmlFor="dev-model">
            <Input id="dev-model" {...register('model')} />
          </FormField>
          <FormField label="规格" htmlFor="dev-specs">
            <Input id="dev-specs" {...register('specs')} />
          </FormField>
          <FormField label="位置" htmlFor="dev-location">
            <Input id="dev-location" {...register('location')} />
          </FormField>
          <FormField label="状态" htmlFor="dev-status">
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger id="dev-status" className="w-full">
                    <SelectValue placeholder="请选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </div>
        <FormField label="描述" htmlFor="dev-descr">
          <Textarea id="dev-descr" {...register('descr')} />
        </FormField>
      </FormSection>
    </FormDialog>
  )
}
