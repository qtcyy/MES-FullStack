<template>
  <div class="screen-layout">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@/stores/app'

// 大屏/3D 强制深色科技风;离开时恢复用户主题
const app = useAppStore()

onMounted(() => {
  document.documentElement.classList.add('dark')
})
onUnmounted(() => {
  app.applyTheme()
})
</script>

<style scoped>
.screen-layout {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-body);
  color: var(--text-1);
}
</style>
