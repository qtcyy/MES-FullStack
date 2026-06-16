import { useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, toast,
} from '@workspace/ui'
import { UserCheck, Info } from 'lucide-react'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { dispatchTeams, dispatchTeamUsers, dispatchAssign } from '@/api/order/dispatch'
import { fromDatetimeLocal } from '@/utils/datetime'
import type { SpDispatchAssign } from '@/types/order'

const schema = z.object({
  teamId: z.string().min(1, '请选择班组'),
  userId: z.string().min(1, '请选择作业员'),
  laborHours: z.coerce.number({ invalid_type_error: '请输入工时' }).positive('工时需大于 0'),
  planStartTime: z.string().optional(),
  planEndTime: z.string().optional(),
  remark: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderIds: string[]
  onAssigned: () => void
}

export default function DispatchDialog({ open, onOpenChange, orderIds, onAssigned }: Props) {
  const { data: teams } = useQuery$(['dispatch', 'teams'], () => dispatchTeams(), { enabled: open })
  const { mutate, loading } = useMutation$((dto: SpDispatchAssign) => dispatchAssign(dto))

  const {
    register, handleSubmit, control, reset, setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { teamId: '', userId: '', laborHours: 8, planStartTime: '', planEndTime: '', remark: '' },
  })

  const teamId = useWatch({ control, name: 'teamId' })
  const { data: users } = useQuery$(
    ['dispatch', 'team-users', teamId],
    () => dispatchTeamUsers(teamId),
    { enabled: open && !!teamId },
  )

  useEffect(() => {
    if (open) {
      reset({ teamId: '', userId: '', laborHours: 8, planStartTime: '', planEndTime: '', remark: '' })
    }
  }, [open, reset])

  const onSubmit = handleSubmit(async (values) => {
    if (orderIds.length === 0) {
      toast.error('请先选择待派工工单')
      return
    }
    try {
      await mutate({
        orderIds,
        teamId: values.teamId,
        userId: values.userId,
        laborHours: values.laborHours,
        planStartTime: fromDatetimeLocal(values.planStartTime),
        planEndTime: fromDatetimeLocal(values.planEndTime),
        remark: values.remark ?? '',
      })
      toast.success(`已派工 ${orderIds.length} 张工单`)
      invalidate('["dispatch","page"')
      onAssigned()
      onOpenChange(false)
    } catch { /* toast */ }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="批量派工"
      description={`将 ${orderIds.length} 张工单派给班组与作业员`}
      icon={UserCheck}
      onSubmit={onSubmit}
      submitting={loading}
      submitText="确认派工"
    >
      <FormSection title="派工信息" icon={Info} tag="必填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="班组" required error={errors.teamId?.message}>
            <Controller
              control={control}
              name="teamId"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={(v) => { field.onChange(v); setValue('userId', '') }}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="请选择班组" /></SelectTrigger>
                  <SelectContent>
                    {(teams ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.code} - {t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label="作业员" required error={errors.userId?.message}>
            <Controller
              control={control}
              name="userId"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange} disabled={!teamId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder={teamId ? '请选择作业员' : '请先选班组'} /></SelectTrigger>
                  <SelectContent>
                    {(users ?? []).map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </div>
        <FormField label="工时(小时)" htmlFor="d-hours" required error={errors.laborHours?.message}>
          <Input id="d-hours" type="number" step="0.5" min={0.5} aria-invalid={!!errors.laborHours} {...register('laborHours')} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="计划开始" htmlFor="d-start">
            <Input id="d-start" type="datetime-local" {...register('planStartTime')} />
          </FormField>
          <FormField label="计划结束" htmlFor="d-end">
            <Input id="d-end" type="datetime-local" {...register('planEndTime')} />
          </FormField>
        </div>
        <FormField label="备注" htmlFor="d-remark">
          <Textarea id="d-remark" {...register('remark')} />
        </FormField>
      </FormSection>
    </FormDialog>
  )
}
