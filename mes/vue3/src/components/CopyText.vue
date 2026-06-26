<template>
  <span class="copy-text">
    <span class="copy-text__val">{{ display }}</span>
    <el-button
      v-if="display"
      class="copy-text__btn"
      text
      size="small"
      :icon="CopyDocument"
      title="复制"
      @click.stop="handleCopy"
    />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'

const props = defineProps<{ text?: string | number | null }>()

const display = computed(() => {
  const v = props.text
  return v === undefined || v === null ? '' : String(v)
})

async function handleCopy() {
  const val = display.value
  if (!val) return
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(val)
    } else {
      // 兜底:非安全上下文(http)下 navigator.clipboard 不可用,改用临时 textarea
      const ta = document.createElement('textarea')
      ta.value = val
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    ElMessage.success('已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}
</script>

<style scoped>
.copy-text {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
}
.copy-text__val {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.copy-text__btn {
  flex-shrink: 0;
  padding: 2px;
  height: auto;
  color: var(--el-text-color-secondary);
}
.copy-text__btn:hover {
  color: var(--el-color-primary);
}
</style>
