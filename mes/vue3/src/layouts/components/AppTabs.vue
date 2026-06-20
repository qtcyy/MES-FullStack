<template>
  <div v-if="tabs.length" class="app-tabs">
    <el-tabs :model-value="activePath" type="card" @tab-change="onChange" @tab-remove="onRemove">
      <el-tab-pane
        v-for="t in tabs"
        :key="t.path"
        :name="t.path"
        :label="t.title"
        :closable="t.closable"
      />
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TabPaneName } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

// 多页签:作为导航,内容由 AdminLayout 的 router-view 渲染
const app = useAppStore()
const route = useRoute()
const router = useRouter()

const tabs = computed(() => app.tabs)
const activePath = computed(() => route.fullPath)

function onChange(name: TabPaneName) {
  router.push(String(name))
}
function onRemove(name: TabPaneName) {
  const path = String(name)
  const idx = app.tabs.findIndex((t) => t.path === path)
  app.removeTab(path)
  // 关闭当前页签时跳到相邻页签
  if (path === route.fullPath) {
    const next = app.tabs[idx] || app.tabs[idx - 1]
    router.push(next ? next.path : '/welcome')
  }
}
</script>

<style scoped>
.app-tabs {
  padding: var(--sp-2) var(--sp-4) 0;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
}
.app-tabs :deep(.el-tabs__header) {
  margin: 0;
}
</style>
