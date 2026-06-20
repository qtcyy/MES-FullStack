<template>
  <el-button
    circle
    text
    :icon="app.theme === 'dark' ? Sunny : Moon"
    :title="app.theme === 'dark' ? '切换浅色' : '切换深色'"
    @click="app.toggleTheme()"
  />
</template>

<script setup lang="ts">
import { Sunny, Moon } from '@element-plus/icons-vue'
import { useAppStore } from '@/stores/app'

// 主题切换(状态持久化到 localStorage,详见 app store)
const app = useAppStore()
</script>
