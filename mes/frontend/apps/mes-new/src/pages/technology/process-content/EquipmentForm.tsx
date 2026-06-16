import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Textarea, toast } from '@workspace/ui'
import { Wrench } from 'lucide-react'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useMutation$ } from '@/http/hooks'
import { processEquipmentSave } from '@/api/technology/process-content'
import type { SpProcessEquipment } from '@/types/technology'

// 字段名避开 DOM 属性 'name'(DOM clobbering 铁律):用 equipName,提交时映射回后端 name。
const schema = z.object({
  equipName: z.string().min(1, '请输入设备名称'),
  quantity: z.coerce.number({ invalid_type_error: '请输入数量' }).min(1, '数量至少 1'),
  remark: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const DEFAULTS: FormValues = {
  equipName: '',
  quantity: 1,
  remark: '',
}

interface EquipmentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contentId: string
  initial?: SpProcessEquipment
  onSaved: () => void
}

export default function EquipmentForm({
  open,
  onOpenChange,
  contentId,
  initial,
  onSaved,
}: EquipmentFormProps) {
  const isEdit = !!initial
  const { mutate, loading } = useMutation$((b: Partial<SpProcessEquipment>) =>
    processEquipmentSave(b),
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  })

  useEffect(() => {
    if (open) {
      reset(
        initial
          ? {
              equipName: initial.name ?? '',
              quantity: initial.quantity ?? 1,
              remark: initial.remark ?? '',
            }
          : DEFAULTS,
      )
    }
  }, [open, initial, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutate({
        id: initial?.id,
        contentId,
        name: values.equipName,
        quantity: values.quantity,
        remark: values.remark ?? '',
      })
      toast.success('已保存设备')
      onSaved()
      onOpenChange(false)
    } catch {
      /* toast by interceptor */
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑工装设备' : '新增工装设备'}
      description="维护工艺文件下的工装设备(名称、数量、备注)"
      icon={Wrench}
      onSubmit={onSubmit}
      submitting={loading}
    >
      <FormSection title="设备信息" tag="必填">
        <FormField label="设备名称" htmlFor="equip-name" required error={errors.equipName?.message}>
          <Input id="equip-name" aria-invalid={!!errors.equipName} {...register('equipName')} />
        </FormField>
        <FormField label="数量" htmlFor="equip-qty" required error={errors.quantity?.message}>
          <Input id="equip-qty" type="number" min={1} aria-invalid={!!errors.quantity} {...register('quantity')} />
        </FormField>
        <FormField label="备注" htmlFor="equip-remark">
          <Textarea id="equip-remark" {...register('remark')} />
        </FormField>
      </FormSection>
    </FormDialog>
  )
}
