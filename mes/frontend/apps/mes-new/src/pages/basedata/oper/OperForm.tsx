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
  Switch,
  Textarea,
  toast,
} from '@workspace/ui'
import { Cog, Info } from 'lucide-react'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { operAddOrUpdate, operProcessUnits } from '@/api/basedata/oper'
import type { SpOper } from '@/types/technology'

const schema = z
  .object({
    operDesc: z.string().min(1, '请输入工序描述'),
    processUnitId: z.string().optional(),
    laborHours: z.coerce.number({ invalid_type_error: '请输入工时' }).int('需为整数').min(1, '工时至少 1 分钟'),
    manufacturingCycle: z.coerce
      .number({ invalid_type_error: '请输入制造周期' })
      .int('需为整数')
      .min(1, '制造周期至少 1 分钟'),
    generatePlan: z.enum(['0', '1']),
    remark: z.string().optional(),
  })
  .refine((d) => d.manufacturingCycle > d.laborHours, {
    message: '制造周期必须大于工时',
    path: ['manufacturingCycle'],
  })

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SpOper | null
}

export default function OperForm({ open, onOpenChange, record }: Props) {
  const isEdit = !!record
  const { data: units } = useQuery$(['oper', 'process-units'], () => operProcessUnits(), { enabled: open })
  const { mutate, loading } = useMutation$((dto: Partial<SpOper>) => operAddOrUpdate(dto))
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { operDesc: '', processUnitId: '', laborHours: 1, manufacturingCycle: 2, generatePlan: '1', remark: '' },
  })

  useEffect(() => {
    if (open) {
      reset({
        operDesc: record?.operDesc ?? '',
        processUnitId: record?.processUnitId ?? '',
        laborHours: record?.laborHours ?? 1,
        manufacturingCycle: record?.manufacturingCycle ?? 2,
        generatePlan: record?.generatePlan === '0' ? '0' : '1',
        remark: record?.remark ?? '',
      })
    }
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutate({
        id: record?.id,
        operDesc: values.operDesc,
        processUnitId: values.processUnitId ?? '',
        laborHours: values.laborHours,
        manufacturingCycle: values.manufacturingCycle,
        generatePlan: values.generatePlan,
        remark: values.remark ?? '',
      })
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["oper","page"')
      onOpenChange(false)
    } catch {
      /* 错误已由响应拦截器 toast */
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑工序' : '新增工序'}
      description="维护工序基础数据"
      icon={Cog}
      onSubmit={onSubmit}
      submitting={loading}
    >
      <FormSection title="基本信息" icon={Info}>
        <FormField label="工序描述" htmlFor="oper-desc" required error={errors.operDesc?.message}>
          <Input id="oper-desc" placeholder="如:主板组装作业工序" aria-invalid={!!errors.operDesc} {...register('operDesc')} />
        </FormField>
        <FormField label="加工单元" htmlFor="oper-unit">
          <Controller
            control={control}
            name="processUnitId"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger id="oper-unit" className="w-full">
                  <SelectValue placeholder="请选择加工单元" />
                </SelectTrigger>
                <SelectContent>
                  {(units ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.code} - {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="工时(分钟)" htmlFor="oper-lh" required error={errors.laborHours?.message}>
            <Input id="oper-lh" type="number" min={1} aria-invalid={!!errors.laborHours} {...register('laborHours')} />
          </FormField>
          <FormField label="制造周期(分钟)" htmlFor="oper-mc" required error={errors.manufacturingCycle?.message}>
            <Input id="oper-mc" type="number" min={1} aria-invalid={!!errors.manufacturingCycle} {...register('manufacturingCycle')} />
          </FormField>
        </div>
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <Label htmlFor="oper-gp">是否生成生产计划</Label>
          <Controller
            control={control}
            name="generatePlan"
            render={({ field }) => (
              <Switch id="oper-gp" checked={field.value === '1'} onCheckedChange={(v) => field.onChange(v ? '1' : '0')} />
            )}
          />
        </div>
        <FormField label="备注" htmlFor="oper-remark">
          <Textarea id="oper-remark" {...register('remark')} />
        </FormField>
      </FormSection>
    </FormDialog>
  )
}
