<template>
  <AiFab @click="open = true" />
  <AiChatDrawer v-model="open" :chat="chat" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AiFab from './AiFab.vue'
import AiChatDrawer from './AiChatDrawer.vue'
import { useAiChat } from '@/composables/useAiChat'

// 在此持有会话与开关，保证抽屉关闭再打开时历史仍在
const open = ref(false)
const chat = useAiChat()
</script>
