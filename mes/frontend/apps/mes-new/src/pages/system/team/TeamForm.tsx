import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Users, Info, Clock } from 'lucide-react'
import { Input, Textarea, Checkbox, toast } from '@workspace/ui'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { teamAddOrUpdate } from '@/api/system/team'
import type { SpTeam } from '@/types/process-unit'
import { WEEKDAYS, parseWorkdays, formatWorkdays } from './teamUtils'

interface TeamFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SpTeam | null
  onSaved?: (saved: SpTeam) => void
}

const schema = z.object({
  code: z.string().min(1, '请输入班组代码'),
  name: z.string().min(1, '请输入班组名称'),
  descr: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  workdays: z.array(z.string()).optional(),
})

type FormValues = z.infer<typeof schema>

export default function TeamForm({ open, onOpenChange, record, onSaved }: TeamFormProps) {
  const isEdit = !!record
  const { mutate, loading } = useMutation$((dto: SpTeam) => teamAddOrUpdate(dto))
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', name: '', descr: '', startTime: '', endTime: '', workdays: [] },
  })

  useEffect(() => {
    if (open) {
      reset({
        code: record?.code ?? '',
        name: record?.name ?? '',
        descr: record?.descr ?? '',
        startTime: record?.startTime ?? '',
        endTime: record?.endTime ?? '',
        workdays: parseWorkdays(record?.workdays),
      })
    }
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    const dto: SpTeam = {
      ...(record ?? {
        id: '',
        code: '',
        name: '',
        descr: '',
        lineId: '',
        workshopId: '',
        startTime: '',
        endTime: '',
        workdays: '',
        deleted: '0',
      }),
      code: values.code,
      name: values.name,
      descr: values.descr ?? '',
      startTime: values.startTime ?? '',
      endTime: values.endTime ?? '',
      workdays: formatWorkdays(values.workdays),
    }
    try {
      await mutate(dto)
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["sys","team"')
      onOpenChange(false)
      onSaved?.(dto)
    } catch {
      /* 拦截器已 toast */
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑班组' : '新增班组'}
      icon={Users}
      description="维护班组基本信息与排班"
      onSubmit={onSubmit}
      submitting={loading}
    >
      <FormSection title="基本信息" icon={Info} tag="必填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="班组代码" htmlFor="t-code" required error={errors.code?.message}>
            <Input id="t-code" aria-invalid={!!errors.code} {...register('code')} />
          </FormField>
          <FormField label="班组名称" htmlFor="t-name" required error={errors.name?.message}>
            <Input id="t-name" aria-invalid={!!errors.name} {...register('name')} />
          </FormField>
        </div>
        <FormField label="备注" htmlFor="t-descr">
          <Textarea id="t-descr" {...register('descr')} />
        </FormField>
      </FormSection>

      <FormSection title="排班" icon={Clock} tag="选填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="上班时间" htmlFor="t-start">
            <Input id="t-start" type="time" {...register('startTime')} />
          </FormField>
          <FormField label="下班时间" htmlFor="t-end">
            <Input id="t-end" type="time" {...register('endTime')} />
          </FormField>
        </div>
        <FormField label="工作日">
          <Controller
            control={control}
            name="workdays"
            render={({ field }) => {
              const value = field.value ?? []
              return (
                <div className="flex flex-wrap gap-3 pt-1">
                  {WEEKDAYS.map((w) => (
                    <label key={w.value} className="flex cursor-pointer items-center gap-1.5 text-sm">
                      <Checkbox
                        checked={value.includes(w.value)}
                        onCheckedChange={(v) =>
                          field.onChange(
                            v ? [...value, w.value] : value.filter((x) => x !== w.value),
                          )
                        }
                      />
                      {w.label}
                    </label>
                  ))}
                </div>
              )
            }}
          />
        </FormField>
      </FormSection>
    </FormDialog>
  )
}
