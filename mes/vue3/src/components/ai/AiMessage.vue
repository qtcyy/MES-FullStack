<template>
  <div class="ai-msg" :class="`ai-msg--${message.role}`">
    <div class="ai-msg__bubble">
      <template v-if="message.role === 'assistant'">
        <AiToolSteps :steps="message.steps" />
        <div v-if="html" class="ai-msg__md" v-html="html" />
        <div v-else-if="message.status === 'streaming'" class="ai-msg__typing">
          <span class="ai-msg__dot" /><span class="ai-msg__dot" /><span class="ai-msg__dot" />
        </div>
      </template>
      <template v-else>
        <span class="ai-msg__text">{{ message.content }}</span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AiToolSteps from './AiToolSteps.vue'
import { useTypewriter } from '@/composables/useTypewriter'
import { renderMarkdown } from '@/utils/markdown'
import type { AiChatMessage } from '@/types/ai'

const props = defineProps<{ message: AiChatMessage }>()

const full = computed(() => props.message.content)
const done = computed(() => props.message.status !== 'streaming')
const { visible } = useTypewriter(full, done)
const html = computed(() => (visible.value ? renderMarkdown(visible.value) : ''))
</script>

<style scoped>
.ai-msg {
  display: flex;
  margin-bottom: 12px;
}
.ai-msg--user {
  justify-content: flex-end;
}
.ai-msg__bubble {
  max-width: 86%;
  padding: 10px 12px;
  border-radius: 10px;
  line-height: 1.6;
  font-size: 14px;
  word-break: break-word;
}
.ai-msg--user .ai-msg__bubble {
  background: var(--brand, #409eff);
  color: #fff;
}
.ai-msg--assistant .ai-msg__bubble {
  background: var(--bg-card, #f5f7fa);
  color: var(--text-primary, #303133);
}
.ai-msg__md :deep(p) {
  margin: 4px 0;
}
.ai-msg__md :deep(ul),
.ai-msg__md :deep(ol) {
  margin: 4px 0;
  padding-left: 20px;
}
.ai-msg__md :deep(table) {
  border-collapse: collapse;
  margin: 6px 0;
}
.ai-msg__md :deep(th),
.ai-msg__md :deep(td) {
  border: 1px solid var(--border);
  padding: 3px 8px;
}
.ai-msg__md :deep(code) {
  background: rgba(0, 0, 0, 0.06);
  padding: 1px 4px;
  border-radius: 3px;
}
.ai-msg__md :deep(pre) {
  background: rgba(0, 0, 0, 0.06);
  padding: 8px;
  border-radius: 6px;
  overflow-x: auto;
}
.ai-msg__typing {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}
.ai-msg__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-secondary, #bbb);
  animation: ai-blink 1.2s infinite;
}
.ai-msg__dot:nth-child(2) {
  animation-delay: 0.2s;
}
.ai-msg__dot:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes ai-blink {
  0%,
  60%,
  100% {
    opacity: 0.3;
  }
  30% {
    opacity: 1;
  }
}
</style>
