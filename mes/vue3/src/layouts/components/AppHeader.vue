<template>
  <div class="app-header">
    <div class="app-header__left">
      <el-button
        text
        :icon="app.collapsed ? Expand : Fold"
        @click="app.toggleCollapsed()"
      />
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/welcome' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item v-for="b in breadcrumbs" :key="b.path">{{ b.title }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="app-header__right">
      <NoticeBell />
      <ThemeToggle />
      <el-dropdown @command="onCommand">
        <span class="app-header__user">
          <el-avatar :size="28">{{ avatarText }}</el-avatar>
          <span class="app-header__name">{{ user?.name || user?.username }}</span>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Fold, Expand } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'
import ThemeToggle from './ThemeToggle.vue'
import NoticeBell from '@/components/NoticeBell.vue'

const app = useAppStore()
const userStore = useUserStore()
const permStore = usePermissionStore()
const route = useRoute()
const router = useRouter()

const user = computed(() => userStore.user)
const avatarText = computed(() =>
  (user.value?.name || user.value?.username || 'U').charAt(0).toUpperCase(),
)
const breadcrumbs = computed(() =>
  route.matched
    .filter((m) => m.meta?.title)
    .map((m) => ({ path: m.path, title: m.meta.title as string })),
)

async function onCommand(cmd: string) {
  if (cmd !== 'logout') return
  try {
    await ElMessageBox.confirm('确定退出登录吗?', '提示', { type: 'warning' })
  } catch {
    return // 用户取消
  }
  await userStore.logout()
  permStore.reset()
  router.push('/login')
}
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  padding: 0 var(--sp-4);
}
.app-header__left {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
.app-header__right {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
.app-header__user {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  cursor: pointer;
  outline: none;
}
.app-header__name {
  color: var(--text-1);
  font-size: 14px;
}
</style>
