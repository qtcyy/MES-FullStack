<template>
  <div ref="rootRef" class="login" @mousemove="onPointerMove" @mouseleave="onPointerLeave">
    <!-- 背景:极光层(视差) -->
    <div class="login__aurora" :style="auroraStyle">
      <span class="blob blob--1"></span>
      <span class="blob blob--2"></span>
      <span class="blob blob--3"></span>
    </div>
    <!-- 背景:网格 / 粒子 / 暗角 / 噪点 -->
    <span class="login__mesh"></span>
    <span
      v-for="i in PARTICLES"
      :key="i"
      class="pt"
      :class="`pt--${i}`"
      :style="particleStyle"
    ></span>
    <span class="login__vignette"></span>
    <span class="login__noise"></span>

    <!-- 玻璃登录卡 -->
    <div
      class="login__card"
      v-motion
      :initial="{ opacity: 0, y: 28 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 460 } }"
    >
      <div class="login__brand"><span class="login__mark">M</span> MES智慧管理系统</div>
      <h2 class="login__title">欢迎登录</h2>
      <p class="login__subtitle">智能制造执行系统 · 请登录您的账户</p>

      <el-form ref="formRef" :model="form" :rules="rules" size="large" @keyup.enter="onSubmit">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" :prefix-icon="User" clearable />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="请输入密码"
            :prefix-icon="Lock"
          />
        </el-form-item>
        <el-form-item v-if="!isDev" prop="captcha">
          <div class="login__captcha">
            <el-input v-model="form.captcha" placeholder="验证码" :prefix-icon="Key" />
            <img :src="captchaSrc" alt="验证码" title="点击刷新" @click="refreshCaptcha" />
          </div>
        </el-form-item>

        <div class="login__row">
          <el-checkbox v-model="form.rememberMe">记住我</el-checkbox>
          <a class="login__link" @click="onForgot">忘记密码？</a>
        </div>

        <el-button type="primary" class="login__submit" :loading="loading" @click="onSubmit">
          登 录
        </el-button>
        <p v-if="isDev" class="login__hint">开发环境已关闭验证码,默认 <b>admin / 123</b></p>
      </el-form>
    </div>

    <footer class="login__foot">
      © 2026 MES智慧管理系统 · 智能制造执行系统　|　仅限授权人员访问
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { User, Lock, Key } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'
import { captchaUrl } from '@/api/auth'
import { usePointerParallax } from '@/composables/usePointerParallax'

const PARTICLES = 6

const isDev = import.meta.env.DEV
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const permStore = usePermissionStore()

const formRef = ref<FormInstance>()
const form = reactive({
  username: isDev ? 'admin' : '',
  password: isDev ? '123' : '',
  captcha: '',
  rememberMe: true,
})
const captchaSrc = ref(captchaUrl())
const loading = ref(false)

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { pattern: /^[\w.@-]{2,30}$/, message: '2-30 位字母/数字/.@-', trigger: 'blur' },
  ],
  password: [{ required: true, min: 3, message: '密码至少 3 位', trigger: 'blur' }],
  captcha: [{ required: !isDev, message: '请输入验证码', trigger: 'blur' }],
}

// 鼠标视差:fx/fy ∈ [-0.5,0.5];极光正向位移、粒子反向制造景深;卡片不动
const rootRef = ref<HTMLElement>()
const { fx, fy, onPointerMove, onPointerLeave } = usePointerParallax(rootRef)
const auroraStyle = computed(() => ({
  transform: `translate(${(fx.value * 22).toFixed(1)}px, ${(fy.value * 22).toFixed(1)}px)`,
}))
const particleStyle = computed(() => ({
  translate: `${(fx.value * -16).toFixed(1)}px ${(fy.value * -16).toFixed(1)}px`,
}))

function refreshCaptcha() {
  captchaSrc.value = captchaUrl()
}

function onForgot() {
  ElMessage.info('请联系系统管理员重置密码')
}

async function onSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    await userStore.login(form)
    await permStore.loadMenu()
    router.push((route.query.redirect as string) || '/welcome')
  } catch {
    // 失败提示已由请求拦截器统一处理,这里仅刷新验证码
    refreshCaptcha()
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* 全屏深色场景:flex 居中(不用 transform 居中,避免与 v-motion 内联 transform 冲突) */
.login {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #070b1a;
  color: #e6f0ff;
}

/* 极光层(视差作用于此层) */
.login__aurora {
  position: absolute;
  inset: 0;
  transition: transform 0.25s ease-out;
  will-change: transform;
}
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  opacity: 0.85;
}
.blob--1 {
  width: 30%;
  aspect-ratio: 1;
  left: 6%;
  top: -12%;
  background: #2f7cff;
}
.blob--2 {
  width: 34%;
  aspect-ratio: 1;
  right: 2%;
  top: 0%;
  background: #36e0ff;
  animation: drift 13s ease-in-out infinite;
}
.blob--3 {
  width: 30%;
  aspect-ratio: 1;
  left: 34%;
  bottom: -18%;
  background: #7a5cff;
  animation: drift 16s ease-in-out infinite reverse;
}

/* 科技网格(中心向外淡出) */
.login__mesh {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
  background-size: 38px 38px;
  -webkit-mask: radial-gradient(circle at 50% 42%, #000, transparent 78%);
  mask: radial-gradient(circle at 50% 42%, #000, transparent 78%);
}

/* 浮动粒子 */
.pt {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #9fe8ff;
  box-shadow: 0 0 10px 2px rgba(120, 210, 255, 0.7);
  opacity: 0.7;
  animation: float 9s ease-in-out infinite;
  transition: translate 0.3s ease-out;
}
.pt--1 { left: 18%; top: 30%; }
.pt--2 { left: 80%; top: 24%; animation-delay: 1.4s; }
.pt--3 { left: 26%; top: 70%; animation-delay: 2.6s; }
.pt--4 { left: 72%; top: 66%; animation-delay: 0.8s; }
.pt--5 { left: 60%; top: 18%; width: 3px; height: 3px; animation-delay: 3.2s; }
.pt--6 { left: 40%; top: 80%; width: 3px; height: 3px; animation-delay: 2s; }

/* 暗角 */
.login__vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 90% at 50% 38%, transparent 55%, rgba(2, 5, 14, 0.66) 100%);
}

/* 细噪点 */
.login__noise {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.085;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E");
}

/* 玻璃登录卡(flex 居中,position:relative 仅用于定位流光/层级) */
.login__card {
  position: relative;
  width: 380px;
  max-width: 92vw;
  padding: 36px 34px 30px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 22px;
  backdrop-filter: blur(20px) saturate(120%);
  -webkit-backdrop-filter: blur(20px) saturate(120%);
  box-shadow:
    0 30px 70px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  overflow: hidden;
  z-index: 3;
}
/* 卡片流光(在内容之下、卡面之上,作表面扫光,不冲淡文字) */
.login__card::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 60%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
  background: linear-gradient(100deg, transparent 0%, rgba(255, 255, 255, 0.16) 50%, transparent 100%);
  transform: translateX(-180%) skewX(-12deg);
  animation: sweep 7.5s ease-in-out infinite;
}
.login__card > * {
  position: relative;
  z-index: 2;
}

/* 品牌 / 标题 */
.login__brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  font-size: 14px;
  font-weight: 700;
  color: #36e0ff;
  letter-spacing: 0.3px;
}
.login__mark {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 800;
  color: #04121f;
  background: linear-gradient(135deg, #36e0ff, #2f7cff);
  box-shadow: 0 6px 18px rgba(54, 224, 255, 0.55);
}
.login__title {
  text-align: center;
  font-size: 26px;
  font-weight: 800;
  color: #eaf3ff;
  letter-spacing: 1px;
  margin: 14px 0 0;
}
.login__subtitle {
  text-align: center;
  font-size: 12px;
  color: #8aa0c4;
  margin: 4px 0 18px;
}

/* 验证码行 */
.login__captcha {
  display: flex;
  gap: 8px;
  width: 100%;
}
.login__captcha img {
  height: 40px;
  width: 110px;
  object-fit: cover;
  cursor: pointer;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  transition: filter 0.2s ease;
}
.login__captcha img:hover {
  filter: brightness(1.25);
}

/* 记住我 / 忘记密码 */
.login__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 2px 0 6px;
}
.login__link {
  font-size: 13px;
  color: #7fb0ff;
  cursor: pointer;
  transition: color 0.2s ease;
}
.login__link:hover {
  color: #aaccff;
  text-decoration: underline;
}

/* 登录按钮 */
.login__submit {
  width: 100%;
  height: 48px;
  border: 0;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 6px;
  color: #04121f;
  background: linear-gradient(90deg, #2f7cff, #36e0ff);
  background-size: 160% 100%;
  background-position: 0% 0%;
  box-shadow: 0 14px 30px rgba(54, 224, 255, 0.45);
  transition:
    transform 0.18s ease,
    box-shadow 0.25s ease,
    background-position 0.4s ease;
}
.login__submit:hover {
  transform: translateY(-2px);
  background-position: 100% 0%;
  box-shadow: 0 20px 44px rgba(54, 224, 255, 0.62);
}
.login__submit:active {
  transform: translateY(0);
  box-shadow: 0 10px 24px rgba(54, 224, 255, 0.4);
}

.login__hint {
  text-align: center;
  font-size: 11px;
  color: #62739a;
  margin: 12px 0 0;
}
.login__hint b {
  color: #9fd9ff;
}

.login__foot {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 16px;
  text-align: center;
  font-size: 11px;
  color: #5a6c8c;
  z-index: 3;
}

/* ===== Element Plus 深度改样:玻璃输入框 / 复选框 ===== */
:deep(.el-form-item) {
  margin-bottom: 18px;
}
:deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.06);
  box-shadow: none;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  padding: 1px 14px;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}
:deep(.el-input__wrapper:hover) {
  border-color: rgba(255, 255, 255, 0.3);
}
:deep(.el-input.is-focus .el-input__wrapper) {
  border-color: #36e0ff;
  background: rgba(54, 224, 255, 0.08);
  box-shadow:
    0 0 0 3px rgba(54, 224, 255, 0.18),
    0 0 22px rgba(54, 224, 255, 0.25);
}
:deep(.el-input__inner) {
  height: 44px;
  color: #e6f0ff;
  caret-color: #36e0ff;
}
:deep(.el-input__inner::placeholder) {
  color: #62739a;
}
:deep(.el-input__prefix),
:deep(.el-input__suffix) {
  color: #7d93b8;
}
:deep(.el-input.is-focus .el-input__prefix) {
  color: #36e0ff;
}
/* 校验报错红边 + 提示 */
:deep(.el-form-item.is-error .el-input__wrapper) {
  border-color: #ff6b81;
  background: rgba(255, 107, 129, 0.07);
  box-shadow: 0 0 0 3px rgba(255, 107, 129, 0.16);
}
:deep(.el-form-item__error) {
  color: #ff8095;
  padding-top: 4px;
}
/* 记住我复选框 */
:deep(.el-checkbox__label) {
  color: #aebfdc;
  font-size: 13px;
}
:deep(.el-checkbox__inner) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.3);
}
:deep(.el-checkbox.is-checked .el-checkbox__inner) {
  background: #36e0ff;
  border-color: #36e0ff;
}
:deep(.el-checkbox.is-checked .el-checkbox__inner::after) {
  border-color: #04121f;
}

/* 关键帧 */
@keyframes drift {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-22px, 16px); }
}
@keyframes float {
  0%, 100% { transform: translateY(0); opacity: 0.7; }
  50% { transform: translateY(-12px); opacity: 1; }
}
@keyframes sweep {
  0% { transform: translateX(-180%) skewX(-12deg); }
  55%, 100% { transform: translateX(320%) skewX(-12deg); }
}

/* 降级:尊重"减少动态效果" */
@media (prefers-reduced-motion: reduce) {
  .blob,
  .pt,
  .login__card::after {
    animation: none !important;
  }
  .login__aurora,
  .pt {
    transition: none !important;
  }
}

/* 响应式:窄屏 */
@media (max-width: 480px) {
  .login__card {
    padding: 28px 22px 24px;
  }
  .login__title {
    font-size: 22px;
  }
  .pt--5,
  .pt--6 {
    display: none;
  }
}
</style>
