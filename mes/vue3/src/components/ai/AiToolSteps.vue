<template>
  <div v-if="steps.length" class="ai-steps">
    <button class="ai-steps__head" type="button" @click="open = !open">
      <el-icon :class="{ 'is-open': open }"><CaretRight /></el-icon>
      <span>查询过程（{{ steps.length }} 步）</span>
      <el-icon v-if="hasRunning" class="ai-steps__spin"><Loading /></el-icon>
    </button>
    <ul v-show="open" class="ai-steps__list">
      <li v-for="(s, i) in steps" :key="i" class="ai-steps__item">
        <el-icon v-if="s.status === 'running'" class="ai-steps__spin"><Loading /></el-icon>
        <el-icon v-else class="ai-steps__ok"><Select /></el-icon>
        <span class="ai-steps__label">{{ toolLabel(s.tool) }}</span>
        <span v-if="s.summary" class="ai-steps__summary">{{ s.summary }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { CaretRight, Loading, Select } from '@element-plus/icons-vue'
import { toolLabel } from '@/utils/aiTools'
import type { AiStep } from '@/types/ai'

const props = defineProps<{ steps: AiStep[] }>()
const hasRunning = computed(() => props.steps.some((s) => s.status === 'running'))
// 运行中默认展开，全部完成后自动折叠
const open = ref(true)
watch(hasRunning, (running) => {
  if (!running) open.value = false
})
</script>

<style scoped>
.ai-steps {
  margin-bottom: 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-body);
  font-size: 13px;
}
.ai-steps__head {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 10px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary, #888);
}
.ai-steps__head .el-icon {
  transition: transform 0.2s;
}
.ai-steps__head .el-icon.is-open {
  transform: rotate(90deg);
}
.ai-steps__list {
  list-style: none;
  margin: 0;
  padding: 0 10px 8px 26px;
}
.ai-steps__item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
}
.ai-steps__ok {
  color: var(--el-color-success);
}
.ai-steps__spin {
  animation: ai-spin 0.9s linear infinite;
}
.ai-steps__summary {
  color: var(--text-secondary, #999);
  margin-left: auto;
}
@keyframes ai-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
