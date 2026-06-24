<template>
  <div class="login">
    <!-- 左侧品牌区 -->
    <div
      class="login__brand"
      v-motion
      :initial="{ opacity: 0, x: -24 }"
      :enter="{ opacity: 1, x: 0, transition: { duration: 420 } }"
    >
      <div class="login__brand-inner">
        <h1>MES智慧管理系统</h1>
        <p>智能制造执行系统</p>
        <ul class="login__features">
          <li>📊 数据可视化大屏</li>
          <li>🏭 3D 数字孪生仓库</li>
          <li>🤖 AI 智能助手</li>
        </ul>
      </div>
    </div>

    <!-- 右侧登录卡片 -->
    <div class="login__panel">
      <el-card
        class="login__card"
        v-motion
        :initial="{ opacity: 0, y: 24 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 420 } }"
      >
        <h2 class="login__title">欢迎登录</h2>
        <el-form ref="formRef" :model="form" :rules="rules" size="large" @keyup.enter="onSubmit">
          <el-form-item prop="username">
            <el-input v-model="form.username" placeholder="用户名" :prefix-icon="User" clearable />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              show-password
              placeholder="密码"
              :prefix-icon="Lock"
            />
          </el-form-item>
          <el-form-item v-if="!isDev" prop="captcha">
            <div class="login__captcha">
              <el-input v-model="form.captcha" placeholder="验证码" :prefix-icon="Key" />
              <img :src="captchaSrc" alt="验证码" title="点击刷新" @click="refreshCaptcha" />
            </div>
          </el-form-item>
          <el-form-item>
            <el-checkbox v-model="form.rememberMe">记住我</el-checkbox>
          </el-form-item>
          <el-button type="primary" class="login__submit" :loading="loading" @click="onSubmit">
            登 录
          </el-button>
          <p v-if="isDev" class="login__hint">开发环境已关闭验证码,默认 admin / 123</p>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { User, Lock, Key } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'
import { captchaUrl } from '@/api/auth'

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

function refreshCaptcha() {
  captchaSrc.value = captchaUrl()
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
.login {
  height: 100vh;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
}
.login__brand {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1b3a8f 0%, #2f7cff 50%, #36e0ff 100%);
  color: #fff;
}
.login__brand-inner h1 {
  font-size: 40px;
  margin: 0 0 var(--sp-2);
}
.login__brand-inner p {
  font-size: 18px;
  opacity: 0.9;
  margin: 0 0 var(--sp-8);
}
.login__features {
  list-style: none;
  padding: 0;
  font-size: 16px;
  line-height: 2.2;
  opacity: 0.95;
}
.login__panel {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-body);
}
.login__card {
  width: 380px;
  border-radius: var(--radius-lg);
}
.login__title {
  text-align: center;
  margin: 0 0 var(--sp-6);
  color: var(--text-1);
}
.login__captcha {
  display: flex;
  gap: var(--sp-2);
  width: 100%;
}
.login__captcha img {
  height: 40px;
  width: 110px;
  object-fit: cover;
  cursor: pointer;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}
.login__submit {
  width: 100%;
}
.login__hint {
  text-align: center;
  color: var(--text-3);
  font-size: 12px;
  margin: var(--sp-3) 0 0;
}

@media (max-width: 768px) {
  .login {
    grid-template-columns: 1fr;
  }
  .login__brand {
    display: none;
  }
}
</style>
