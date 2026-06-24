# Vue3 登录页玻璃拟态重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `mes/vue3` 登录页重做成「深色极光 + 毛玻璃发光卡」的大厂科技风（含鼠标视差/卡片流光/细噪点/微交互），同时一行不改地保留现有登录业务逻辑。

**Architecture:** 只改一个视图组件 `LoginView.vue`（模板 + 样式大改，脚本增量）；把唯一有真实逻辑的"鼠标视差"抽成纯函数 + composable `usePointerParallax`，按本项目惯例对其做单元测试（其余纯视觉/CSS 部分用 dev server 人工验收，因为本项目无组件测试先例、玻璃拟态 CSS 无法有意义地单测）。Element Plus 表单组件保留（继承校验/可达性），用 `:deep()` 深度改样为玻璃风。

**Tech Stack:** Vue 3.5 `<script setup>` + TypeScript + Element Plus 2.14（`:deep` 改样）+ `@vueuse/motion`（入场，已全局注册 `v-motion`）+ Vitest（node 环境，`tests/**/*.spec.ts`）。

参考规格：`docs/superpowers/specs/2026-06-24-vue3-login-redesign-design.md`

---

## 与 Spec 的一处实现细化（已确认）

Spec §4.1 写"视差逻辑内联在组件内"。规划阶段调整为：**抽到 `src/composables/usePointerParallax.ts`**。理由：本项目的测试惯例是"纯逻辑/composable 单测"（`tests/*.spec.ts`，如 `useTypewriter`），无任何 `.vue` 组件测试；抽出后视差的换算与守卫逻辑可被稳定单测，符合 TDD 且贴合既有模式。属于实现改进，不改变 Spec 的功能与视觉结论。

---

## File Structure

| 文件 | 动作 | 职责 |
|---|---|---|
| `mes/vue3/src/composables/usePointerParallax.ts` | 新建 | `pointerFraction()` 纯换算 + `parallaxDisabled()` 守卫 + `usePointerParallax()` composable（rAF + getBoundingClientRect 接线） |
| `mes/vue3/tests/usePointerParallax.spec.ts` | 新建 | 对 `pointerFraction` / `parallaxDisabled` 的单元测试（node 环境，stub matchMedia） |
| `mes/vue3/src/views/login/LoginView.vue` | 重写 | 登录页模板（背景五层 + 玻璃卡 + EP 表单）、脚本（保留登录逻辑 + 接入视差）、scoped 样式（极光/玻璃/微交互/降级/响应式 + `:deep` 改样 EP） |

> 所有命令默认在 `mes/vue3/` 目录执行（pnpm 与 git 均可在该子目录运行，git 会自动定位仓库根）。

---

## Task 1: 鼠标视差 composable（TDD）

**Files:**
- Create: `mes/vue3/src/composables/usePointerParallax.ts`
- Test: `mes/vue3/tests/usePointerParallax.spec.ts`

- [ ] **Step 1: 写失败测试**

创建 `mes/vue3/tests/usePointerParallax.spec.ts`：

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { pointerFraction, parallaxDisabled } from '@/composables/usePointerParallax'

describe('pointerFraction', () => {
  const rect = { left: 0, top: 0, width: 200, height: 100 }

  it('画面正中返回 0,0', () => {
    expect(pointerFraction(100, 50, rect)).toEqual({ fx: 0, fy: 0 })
  })

  it('左上角返回 -0.5,-0.5', () => {
    expect(pointerFraction(0, 0, rect)).toEqual({ fx: -0.5, fy: -0.5 })
  })

  it('右下角返回 0.5,0.5', () => {
    expect(pointerFraction(200, 100, rect)).toEqual({ fx: 0.5, fy: 0.5 })
  })

  it('计算时减去元素自身偏移', () => {
    expect(
      pointerFraction(150, 80, { left: 100, top: 60, width: 100, height: 40 }),
    ).toEqual({ fx: 0, fy: 0 })
  })

  it('零尺寸 rect 时返回 0,0 不抛错', () => {
    expect(pointerFraction(10, 10, { left: 0, top: 0, width: 0, height: 0 })).toEqual({
      fx: 0,
      fy: 0,
    })
  })
})

describe('parallaxDisabled', () => {
  afterEach(() => vi.unstubAllGlobals())

  function stubMatchMedia(map: Record<string, boolean>) {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: !!map[q] }))
  }

  it('无 matchMedia(如 SSR)时禁用', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(parallaxDisabled()).toBe(true)
  })

  it('prefers-reduced-motion 时禁用', () => {
    stubMatchMedia({ '(prefers-reduced-motion: reduce)': true })
    expect(parallaxDisabled()).toBe(true)
  })

  it('触屏(coarse pointer)时禁用', () => {
    stubMatchMedia({ '(pointer: coarse)': true })
    expect(parallaxDisabled()).toBe(true)
  })

  it('精确指针且未要求减少动效时启用', () => {
    stubMatchMedia({})
    expect(parallaxDisabled()).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试,确认失败**

Run: `pnpm vitest run tests/usePointerParallax.spec.ts`
Expected: FAIL —— 无法解析模块 `@/composables/usePointerParallax`（文件尚不存在）。

- [ ] **Step 3: 写最小实现**

创建 `mes/vue3/src/composables/usePointerParallax.ts`：

```ts
import { ref, type Ref } from 'vue'

/** 把指针位置换算成相对画面中心的偏移(范围 [-0.5, 0.5]),纯函数便于单测 */
export function pointerFraction(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): { fx: number; fy: number } {
  if (rect.width <= 0 || rect.height <= 0) return { fx: 0, fy: 0 }
  return {
    fx: (clientX - rect.left) / rect.width - 0.5,
    fy: (clientY - rect.top) / rect.height - 0.5,
  }
}

/** 是否应禁用视差:无 matchMedia / 要求减少动效 / 触屏 */
export function parallaxDisabled(): boolean {
  const mm = typeof globalThis !== 'undefined' ? globalThis.matchMedia : undefined
  if (typeof mm !== 'function') return true
  return (
    mm('(prefers-reduced-motion: reduce)').matches || mm('(pointer: coarse)').matches
  )
}

/**
 * 鼠标视差 composable:把容器内的指针移动换算成 fx/fy(响应式),
 * 由组件决定把它放大成多少 px、作用到哪一层。自动尊重降级条件。
 */
export function usePointerParallax(target: Ref<HTMLElement | undefined>) {
  const fx = ref(0)
  const fy = ref(0)
  const disabled = parallaxDisabled()
  let raf = 0
  let pending: { x: number; y: number } | null = null

  function onPointerMove(e: MouseEvent) {
    if (disabled || !target.value) return
    pending = { x: e.clientX, y: e.clientY }
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      const el = target.value
      if (!pending || !el) return
      const { fx: nx, fy: ny } = pointerFraction(pending.x, pending.y, el.getBoundingClientRect())
      fx.value = nx
      fy.value = ny
    })
  }

  function onPointerLeave() {
    if (raf) {
      cancelAnimationFrame(raf)
      raf = 0
    }
    pending = null
    fx.value = 0
    fy.value = 0
  }

  return { fx, fy, disabled, onPointerMove, onPointerLeave }
}
```

- [ ] **Step 4: 运行测试,确认通过**

Run: `pnpm vitest run tests/usePointerParallax.spec.ts`
Expected: PASS —— 9 个用例全绿。

- [ ] **Step 5: 类型 + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: 无报错（lint 用 `--fix`,若仅自动修复格式也算通过）。

- [ ] **Step 6: 提交**

```bash
git add src/composables/usePointerParallax.ts tests/usePointerParallax.spec.ts
git commit -m "✨ feat(vue3): 登录页鼠标视差 composable usePointerParallax + 单测"
```

---

## Task 2: 重写 LoginView.vue

**Files:**
- Modify(整体重写): `mes/vue3/src/views/login/LoginView.vue`

- [ ] **Step 1: 用以下完整内容替换 `src/views/login/LoginView.vue`**

```vue
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
/* 全屏深色场景 */
.login {
  position: relative;
  height: 100vh;
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

/* 玻璃登录卡 */
.login__card {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -52%);
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
```

- [ ] **Step 2: 类型检查**

Run: `pnpm typecheck`
Expected: PASS（无 TS 报错）。若报 `el-input`/`el-form` 类型问题,确认 `src/types/components.d.ts` 已由 unplugin 生成（开发期自动生成；必要时先跑一次 `pnpm dev` 让其生成再 Ctrl-C）。

- [ ] **Step 3: lint**

Run: `pnpm lint`
Expected: 无错误（允许自动格式修复）。

- [ ] **Step 4: 启动 dev server 人工验收(纯视觉/交互,不需要后端)**

Run: `pnpm dev`，浏览器打开 `http://localhost:4200/`（未登录会被路由守卫导向 `/login`）。逐项确认：

- [ ] 深色极光背景:青/紫 2 团在缓慢漂移、6 颗粒子上下浮动、网格中心清四周淡、整体有暗角与极淡噪点颗粒。
- [ ] 玻璃登录卡居中、有毛玻璃模糊与顶部高光描边;卡片每 ~7.5s 有一道柔光斜扫过。
- [ ] **鼠标在画面移动 → 极光层轻微视差偏移、粒子反向飘移,而登录卡纹丝不动**（重点:卡片不位移）。
- [ ] 输入框 hover 边框微亮;聚焦时青色光晕 + 前缀图标转青;占位符为深灰。
- [ ] 登录按钮 hover 上浮 2px + 渐变横移 + 辉光增强;按下回落。
- [ ] 「忘记密码？」点击弹出 `ElMessage` "请联系系统管理员重置密码"。
- [ ] dev 环境:**不显示验证码框**、显示"开发环境已关闭验证码,默认 admin / 123"、用户名/密码已预填 admin/123。
- [ ] 清空用户名后点登录:出现红边 + 行内错误提示(校验失败样式)。
- [ ] 窄屏(浏览器开 DevTools 切到 ≤480px 宽):卡片不溢出、标题字号收敛、p5/p6 粒子隐藏。
- [ ] 系统/浏览器开启"减少动态效果"后刷新:极光/粒子/流光静止,页面仍可正常输入(此项可选,能开则验)。

- [ ] **Step 5: 提交**

```bash
git add src/views/login/LoginView.vue
git commit -m "💄 style(vue3): 登录页重设计为玻璃拟态科技风(极光/毛玻璃/视差/微交互)"
```

---

## Task 3: 整体验证与验收

**Files:** 无新增改动（仅运行校验；如发现问题回到对应 Task 修复）

- [ ] **Step 1: 跑全部单测,确认无回归**

Run: `pnpm test`
Expected: 全部 spec 通过（含新增 `usePointerParallax.spec.ts`，且原有 30 个 spec 不受影响）。

- [ ] **Step 2: 类型 + lint + 构建**

Run: `pnpm typecheck && pnpm lint:check && pnpm build`
Expected: 三者均通过；`pnpm build`（`vue-tsc -b && vite build`）成功产出 `dist/`。

- [ ] **Step 3: 对照 Spec §6 验收标准逐条核对(人工)**

参照 `docs/superpowers/specs/2026-06-24-vue3-login-redesign-design.md` §6：
- [ ] dev 下 `admin/123` 可登录并跳转 `/welcome`（需后端在 :9090；若后端未起,至少在 Network 面板确认点击登录发出了 `POST /api/login`）。
- [ ] 开发态隐藏验证码、显示开发提示；生产构建口径下验证码字段出现且点击图片会刷新(URL 带新时间戳)。
- [ ] 校验失败红边 + 行内提示；回车可提交；加载态按钮转圈禁用。
- [ ] hover/focus/视差/流光/噪点 五类效果均如期；登录卡 hover 不位移。
- [ ] `prefers-reduced-motion: reduce` 下动画全关、静态可用；触屏不绑视差。
- [ ] 窄屏布局不溢出、可正常输入登录。

- [ ] **Step 4: 收尾**

若 Step 1–3 有修复,按所属 Task 重新提交;若全部一次通过,本任务无需额外提交。最后运行 `git status` 确认工作区干净(仅保留无关的 `~$设计文档.docx` 临时锁文件,勿提交)。

---

## Self-Review

**1. Spec coverage(逐节核对):**
- §2.1–2.4 视觉/布局/卡内元素 → Task 2 模板 + 样式(背景五层、玻璃卡、品牌/标题/表单/验证码/记住我/忘记密码/按钮/开发提示/页脚)。✓
- §2.5 动效 A 档 + 三点缀 → 漂移/浮动(CSS keyframes)、视差(Task 1 composable + Task 2 接线)、流光(`::after sweep`)、噪点(`.login__noise`)。✓
- §2.6 微交互与状态 → hover/focus(:deep)、加载(el-button `:loading`)、报错(:deep is-error)、入场(`v-motion`)。✓
- §2.7 配色 → 样式内取值与品牌色同源。✓
- §2.8 响应式 / §2.9 无障碍性能 → `@media max-width:480px` 与 `prefers-reduced-motion`、`will-change`、仅 transform/opacity、视差守卫(coarse/reduced)。✓
- §3 功能原样保留 → 脚本与原逻辑一致(表单模型/校验规则/isDev/onSubmit 流程/验证码刷新/回车)。✓
- §4 实现边界 → 仅改 1 视图 + 1 composable + 1 测试;保留 EP 用 :deep。✓（§4.1 inline→composable 的细化已在文首说明）
- §5 YAGNI / §6 验收 → 未引入额外特性;§6 在 Task 3 Step 3 逐条核对。✓

**2. Placeholder 扫描:** 无 TBD/TODO;所有测试与组件代码均为可直接运行的完整内容。✓

**3. 类型/命名一致性:** composable 导出 `pointerFraction` / `parallaxDisabled` / `usePointerParallax`,与测试 import 及组件解构(`fx,fy,onPointerMove,onPointerLeave`)一致;`form` 字段 `{username,password,captcha,rememberMe}` 与 `userStore.login` 入参一致;`captchaUrl`/`User`/`Lock`/`Key`/`ElMessage`/`FormInstance`/`FormRules` 均来自真实模块。✓
