<template>
  <AiFab @click="open = !open" />
  <Transition name="ai-window">
    <AiChatWindow v-if="open" v-model="open" :chat="chat" :fw="fw" />
  </Transition>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AiFab from './AiFab.vue'
import AiChatWindow from './AiChatWindow.vue'
import { useAiChat } from '@/composables/useAiChat'
import { useFloatingWindow } from '@/composables/useFloatingWindow'
import { clampToViewport, type Geometry, type SizeConstraints } from '@/utils/floatingWindow'

// 会话与开关状态持有于此，开关期间保留历史与窗口几何
const open = ref(false)
const chat = useAiChat()

const W = 380
const H = 560
const vw = window.innerWidth
const vh = window.innerHeight
const initial: Geometry = clampToViewport({ x: vw - W - 24, y: vh - H - 24, w: W, h: H }, vw, vh)
const constraints: SizeConstraints = { minW: 320, minH: 360, maxW: vw, maxH: vh }
const fw = useFloatingWindow(initial, constraints)
</script>
