import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Label, toast } from '@workspace/ui'
import ModalForm from '@/components/ModalForm'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { userAddOrUpdate } from '@/api/system/user'
import type { SysUser, SysUserDTO } from '@/types/user'

interface UserFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SysUser | null
  onSaved: () => void
}

const makeSchema = (isEdit: boolean) =>
  z.object({
    username: z.string().min(1, '请输入登录名'),
    name: z.string().min(1, '请输入姓名'),
    password: isEdit ? z.string().optional() : z.string().min(1, '请输入初始密码'),
  })

export default function UserForm({ open, onOpenChange, record, onSaved }: UserFormProps) {
  const isEdit = !!record
  const { mutate, loading } = useMutation$((dto: SysUserDTO) => userAddOrUpdate(dto))

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<ReturnType<typeof makeSchema>>>({
    resolver: zodResolver(makeSchema(isEdit)),
    defaultValues: { username: '', name: '', password: '' },
  })

  useEffect(() => {
    if (open) {
      reset({ username: record?.username ?? '', name: record?.name ?? '', password: '' })
    }
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    const dto: SysUserDTO = {
      ...(record ?? { id: '', username: '', name: '', deleted: '0' }),
      username: values.username,
      name: values.name,
    }
    if (values.password) dto.password = values.password
    try {
      await mutate(dto)
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["sys","user"')
      onOpenChange(false)
      onSaved()
    } catch {
      /* 拦截器已 toast */
    }
  })

  return (
    <ModalForm
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑用户' : '新增用户'}
      onSubmit={onSubmit}
      submitting={loading}
    >
      <div className="space-y-1.5">
        <Label htmlFor="f-username">登录名</Label>
        <Input id="f-username" disabled={isEdit} {...register('username')} />
        {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-name">姓名</Label>
        <Input id="f-name" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-password">{isEdit ? '重置密码(留空不改)' : '初始密码'}</Label>
        <Input id="f-password" type="password" {...register('password')} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
    </ModalForm>
  )
}
