<template>
  <el-container class="admin-layout">
    <el-aside :width="app.collapsed ? '64px' : '220px'" class="admin-layout__aside">
      <div class="admin-layout__logo">
        <span class="admin-layout__logo-mark">🐙</span>
        <span v-show="!app.collapsed" class="admin-layout__logo-text">章鱼师兄 MES</span>
      </div>
      <el-scrollbar class="admin-layout__menu">
        <AppSidebar />
      </el-scrollbar>
    </el-aside>

    <el-container>
      <el-header class="admin-layout__header"><AppHeader /></el-header>
      <AppTabs />
      <el-main class="admin-layout__main">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <keep-alive :max="12">
              <component :is="Component" />
            </keep-alive>
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './components/AppSidebar.vue'
import AppHeader from './components/AppHeader.vue'
import AppTabs from './components/AppTabs.vue'
import { useAppStore } from '@/stores/app'

const app = useAppStore()
const route = useRoute()

// 进入带 title 的路由时登记多页签
watch(
  () => route.fullPath,
  () => {
    if (route.meta.title) {
      app.addTab({
        path: route.fullPath,
        title: route.meta.title as string,
        closable: route.path !== '/welcome',
      })
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.admin-layout {
  height: 100vh;
}
.admin-layout__aside {
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border-right: 1px solid var(--border);
  transition: width var(--dur) var(--ease-standard);
  overflow: hidden;
}
.admin-layout__logo {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  height: 56px;
  padding: 0 var(--sp-4);
  font-weight: 700;
  color: var(--brand);
  white-space: nowrap;
}
.admin-layout__logo-mark {
  font-size: 22px;
}
.admin-layout__menu {
  flex: 1;
}
.admin-layout__header {
  height: 56px;
  padding: 0;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
}
.admin-layout__main {
  background: var(--bg-body);
}
</style>
