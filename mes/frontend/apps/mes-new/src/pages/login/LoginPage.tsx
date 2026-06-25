import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Input,
  Label,
  Checkbox,
  toast,
} from '@workspace/ui'
import { Factory, RefreshCw } from 'lucide-react'
import Reveal from '@/components/motion/Reveal'
import { usePointerParallax } from '@/hooks/usePointerParallax'
import { useAuthStore } from '@/stores/authStore'
import { useMenuStore } from '@/stores/menuStore'
import { captchaUrl } from '@/api/auth'

const schema = z.object({
  username: z.string().min(1, '请输入登录名'),
  password: z.string().min(1, '请输入密码'),
  captcha: z.string().min(1, '请输入验证码'),
  rememberMe: z.boolean().optional(),
})
type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const fetchMenuTree = useMenuStore((s) => s.fetchMenuTree)
  const [captcha, setCaptcha] = useState(captchaUrl())
  const [submitting, setSubmitting] = useState(false)
  const { ref, fx, fy } = usePointerParallax<HTMLDivElement>()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '', captcha: '', rememberMe: false },
  })

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    try {
      await login(values.username, values.password, values.captcha, values.rememberMe)
      await fetchMenuTree()
      toast.success('登录成功')
      navigate('/welcome', { replace: true })
    } catch {
      setCaptcha(captchaUrl())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      ref={ref}
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      style={{ background: '#070b1a' }}
    >
      {/* 极光 blob 层（随鼠标 +22px） */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ transform: `translate(${(fx * 22).toFixed(1)}px, ${(fy * 22).toFixed(1)}px)` }}
        aria-hidden
      >
        <span className="absolute left-[12%] top-[18%] size-[42vmax] rounded-full" style={{ background: 'radial-gradient(circle, rgba(47,124,255,0.55), transparent 60%)', filter: 'blur(70px)', animation: 'drift 13s ease-in-out infinite' }} />
        <span className="absolute right-[8%] top-[24%] size-[36vmax] rounded-full" style={{ background: 'radial-gradient(circle, rgba(54,224,255,0.45), transparent 60%)', filter: 'blur(70px)', animation: 'drift 16s ease-in-out infinite reverse' }} />
        <span className="absolute bottom-[8%] left-[40%] size-[34vmax] rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.4), transparent 60%)', filter: 'blur(70px)', animation: 'drift 15s ease-in-out infinite' }} />
      </div>

      {/* 细网格层 */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
          backgroundSize: '38px 38px',
          maskImage: 'radial-gradient(circle at 50% 45%, black, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 45%, black, transparent 75%)',
        }}
      />

      {/* 暗角层 */}
      <div className="pointer-events-none absolute inset-0" aria-hidden style={{ background: 'radial-gradient(circle at 50% 50%, transparent 40%, rgba(0,0,0,0.55))' }} />

      {/* 玻璃卡 */}
      <Reveal className="relative w-full max-w-sm">
        <div className="glass rounded-2xl p-7">
          <div className="space-y-2 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-[var(--shadow-brand)]">
              <Factory className="size-6" />
            </div>
            <h1 className="text-xl font-semibold text-white">章鱼MES</h1>
            <p className="text-sm text-white/60">智能制造执行系统</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-white/80">登录名</Label>
              <Input id="username" autoComplete="username" className="border-white/15 bg-white/5 text-white placeholder:text-white/40" {...register('username')} />
              {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-white/80">密码</Label>
              <Input id="password" type="password" autoComplete="current-password" className="border-white/15 bg-white/5 text-white placeholder:text-white/40" {...register('password')} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="captcha" className="text-white/80">验证码</Label>
              <div className="flex gap-2">
                <Input id="captcha" className="flex-1 border-white/15 bg-white/5 text-white placeholder:text-white/40" {...register('captcha')} />
                <button
                  type="button"
                  onClick={() => setCaptcha(captchaUrl())}
                  className="relative h-9 w-24 shrink-0 overflow-hidden rounded-md border border-white/15"
                  title="点击刷新"
                >
                  <img src={captcha} alt="验证码" className="h-full w-full object-cover" />
                  <RefreshCw className="absolute right-1 top-1 size-3 text-white/70" />
                </button>
              </div>
              {errors.captcha && <p className="text-xs text-destructive">{errors.captcha.message}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="rememberMe"
                checked={watch('rememberMe')}
                onCheckedChange={(v) => setValue('rememberMe', v === true)}
              />
              <Label htmlFor="rememberMe" className="text-sm font-normal text-white/80">记住我</Label>
            </div>
            <Button type="submit" variant="brand" className="w-full" disabled={submitting}>
              {submitting ? '登录中…' : '登 录'}
            </Button>
          </form>
        </div>
      </Reveal>
    </div>
  )
}
