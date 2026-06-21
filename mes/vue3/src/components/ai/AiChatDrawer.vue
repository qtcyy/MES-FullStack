<template>
  <el-drawer
    :model-value="modelValue"
    title="AI 智能助手"
    direction="rtl"
    size="420px"
    :with-header="true"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <template #header>
      <div class="ai-drawer__header">
        <span>🐙 AI 智能助手</span>
        <el-button text size="small" :disabled="!chat.messages.value.length" @click="chat.reset()">
          清空
        </el-button>
      </div>
    </template>

    <div class="ai-drawer">
      <div ref="listEl" class="ai-drawer__list">
        <template v-if="chat.messages.value.length">
          <AiMessage v-for="(m, i) in chat.messages.value" :key="i" :message="m" />
        </template>
        <div v-else class="ai-drawer__empty">
          <p class="ai-drawer__empty-title">你好，我能查询 MES 实时数据并给出分析建议 👋</p>
          <div class="ai-drawer__chips">
            <button
              v-for="q in SUGGESTIONS"
              :key="q"
              class="ai-drawer__chip"
              type="button"
              @click="ask(q)"
            >
              {{ q }}
            </button>
          </div>
        </div>
      </div>

      <div class="ai-drawer__input">
        <el-input
          v-model="draft"
          type="textarea"
          :rows="2"
          resize="none"
          placeholder="输入问题，Enter 发送 / Shift+Enter 换行"
          @keydown="(e: Event) => onKeydown(e as KeyboardEvent)"
        />
        <div class="ai-drawer__actions">
          <el-button v-if="chat.sending.value" type="danger" plain size="small" @click="chat.stop()">
            停止
          </el-button>
          <el-button
            v-else
            type="primary"
            size="small"
            :disabled="!draft.trim()"
            @click="ask(draft)"
          >
            发送
          </el-button>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import AiMessage from './AiMessage.vue'
import type { useAiChat } from '@/composables/useAiChat'

const props = defineProps<{ modelValue: boolean; chat: ReturnType<typeof useAiChat> }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const SUGGESTIONS = [
  '本月生产工单完成情况如何？',
  '当前设备运行状态分布',
  '哪些物料低于安全库存？',
  '给我一份生产看板总览',
]

const draft = ref('')
const listEl = ref<HTMLElement | null>(null)

async function scrollToBottom() {
  await nextTick()
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
}

function ask(text: string) {
  const t = text.trim()
  if (!t || props.chat.sending.value) return
  draft.value = ''
  props.chat.send(t)
  scrollToBottom()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    ask(draft.value)
  }
}

// 消息或流式内容变化时自动滚到底
watch(
  () => props.chat.messages.value.map((m) => m.content + m.steps.length).join('|'),
  scrollToBottom,
)
</script>

<style scoped>
.ai-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ai-drawer {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.ai-drawer__list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 2px;
}
.ai-drawer__empty {
  padding: 24px 8px;
  text-align: center;
  color: var(--text-secondary, #909399);
}
.ai-drawer__empty-title {
  margin-bottom: 16px;
  font-size: 14px;
}
.ai-drawer__chips {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ai-drawer__chip {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-card);
  cursor: pointer;
  font-size: 13px;
  text-align: left;
  transition: border-color 0.2s;
}
.ai-drawer__chip:hover {
  border-color: var(--brand, #409eff);
  color: var(--brand, #409eff);
}
.ai-drawer__input {
  padding-top: 8px;
  border-top: 1px solid var(--border);
}
.ai-drawer__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 6px;
}
</style>
