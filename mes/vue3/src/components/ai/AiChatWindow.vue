<template>
  <div class="ai-window" :class="{ 'is-dragging': fw.dragging.value }" :style="fw.style.value">
    <!-- 8 个缩放手柄（置于内容之上） -->
    <div
      v-for="dir in RESIZE_DIRS"
      :key="dir"
      :class="`ai-window__resize ai-window__resize--${dir}`"
      @pointerdown="(e) => fw.startResize(e as PointerEvent, dir)"
    />

    <!-- header = 拖拽手柄 -->
    <div class="ai-window__header" @pointerdown="fw.startDrag">
      <span class="ai-window__title">🐙 AI 智能助手</span>
      <div class="ai-window__hactions">
        <el-button
          text
          size="small"
          :disabled="!chat.messages.value.length"
          @pointerdown.stop
          @click="chat.reset()"
        >
          清空
        </el-button>
        <button
          class="ai-window__close"
          type="button"
          title="关闭"
          @pointerdown.stop
          @click="emit('update:modelValue', false)"
        >
          <el-icon><Close /></el-icon>
        </button>
      </div>
    </div>

    <div class="ai-window__body">
      <div ref="listEl" class="ai-window__list">
        <template v-if="chat.messages.value.length">
          <AiMessage v-for="(m, i) in chat.messages.value" :key="i" :message="m" />
        </template>
        <div v-else class="ai-window__empty">
          <p class="ai-window__empty-title">你好，我能查询 MES 实时数据并给出分析建议 👋</p>
          <div class="ai-window__chips">
            <button
              v-for="q in SUGGESTIONS"
              :key="q"
              class="ai-window__chip"
              type="button"
              @click="ask(q)"
            >
              {{ q }}
            </button>
          </div>
        </div>
      </div>

      <div class="ai-window__input">
        <el-input
          v-model="draft"
          type="textarea"
          :rows="2"
          resize="none"
          placeholder="输入问题，Enter 发送 / Shift+Enter 换行"
          @keydown="(e: Event) => onKeydown(e as KeyboardEvent)"
        />
        <div class="ai-window__actions">
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
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { Close } from '@element-plus/icons-vue'
import AiMessage from './AiMessage.vue'
import type { useAiChat } from '@/composables/useAiChat'
import type { useFloatingWindow } from '@/composables/useFloatingWindow'
import type { ResizeDir } from '@/utils/floatingWindow'

const props = defineProps<{
  modelValue: boolean
  chat: ReturnType<typeof useAiChat>
  fw: ReturnType<typeof useFloatingWindow>
}>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const RESIZE_DIRS: ResizeDir[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

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

watch(
  () => props.chat.messages.value.map((m) => m.content + m.steps.length).join('|'),
  scrollToBottom,
)
</script>

<style scoped>
/* 开合动画：从右下角悬浮球缩放淡入 */
.ai-window-enter-active,
.ai-window-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: bottom right;
}
.ai-window-enter-from,
.ai-window-leave-to {
  opacity: 0;
  transform: scale(0.85);
}

.ai-window {
  position: fixed;
  z-index: 2001;
  display: flex;
  flex-direction: column;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border, #e4e7ed);
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}
.ai-window.is-dragging {
  user-select: none;
}

.ai-window__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 12px;
  border-bottom: 1px solid var(--border, #e4e7ed);
  cursor: move;
  user-select: none;
  flex: 0 0 auto;
}
.ai-window__title {
  font-weight: 600;
  font-size: 14px;
}
.ai-window__hactions {
  display: flex;
  align-items: center;
  gap: 4px;
}
.ai-window__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--text-secondary, #909399);
  cursor: pointer;
  transition: background 0.15s;
}
.ai-window__close:hover {
  background: var(--bg-body, #f5f7fa);
}

.ai-window__body {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  padding: 8px 12px 12px;
}
.ai-window__list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 2px;
}
.ai-window__empty {
  padding: 24px 8px;
  text-align: center;
  color: var(--text-secondary, #909399);
}
.ai-window__empty-title {
  margin-bottom: 16px;
  font-size: 14px;
}
.ai-window__chips {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ai-window__chip {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-card);
  cursor: pointer;
  font-size: 13px;
  text-align: left;
  transition: border-color 0.2s;
}
.ai-window__chip:hover {
  border-color: var(--brand, #409eff);
  color: var(--brand, #409eff);
}
.ai-window__input {
  padding-top: 8px;
  border-top: 1px solid var(--border);
  flex: 0 0 auto;
}
.ai-window__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 6px;
}

/* 缩放手柄：边 6px、角 12px，置于内容之上 */
.ai-window__resize {
  position: absolute;
  z-index: 5;
}
.ai-window__resize--n {
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  cursor: ns-resize;
}
.ai-window__resize--s {
  bottom: 0;
  left: 0;
  right: 0;
  height: 6px;
  cursor: ns-resize;
}
.ai-window__resize--e {
  top: 0;
  bottom: 0;
  right: 0;
  width: 6px;
  cursor: ew-resize;
}
.ai-window__resize--w {
  top: 0;
  bottom: 0;
  left: 0;
  width: 6px;
  cursor: ew-resize;
}
.ai-window__resize--ne,
.ai-window__resize--nw,
.ai-window__resize--se,
.ai-window__resize--sw {
  width: 12px;
  height: 12px;
  z-index: 6;
}
.ai-window__resize--ne {
  top: 0;
  right: 0;
  cursor: nesw-resize;
}
.ai-window__resize--nw {
  top: 0;
  left: 0;
  cursor: nwse-resize;
}
.ai-window__resize--se {
  bottom: 0;
  right: 0;
  cursor: nwse-resize;
}
.ai-window__resize--sw {
  bottom: 0;
  left: 0;
  cursor: nesw-resize;
}
</style>
