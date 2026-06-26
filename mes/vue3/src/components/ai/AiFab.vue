<template>
  <button class="ai-fab" type="button" title="AI 智能助手" @click="emit('click')">
    <el-icon :size="24"><ChatDotRound /></el-icon>
  </button>
</template>

<script setup lang="ts">
import { ChatDotRound } from '@element-plus/icons-vue'
const emit = defineEmits<{ click: [] }>()
</script>

<style scoped>
.ai-fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: var(--brand, #409eff);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(64, 158, 255, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}
.ai-fab:hover {
  transform: scale(1.08);
  box-shadow: 0 8px 22px rgba(64, 158, 255, 0.6);
}
</style>
