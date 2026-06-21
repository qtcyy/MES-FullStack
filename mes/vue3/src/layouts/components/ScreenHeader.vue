<template>
  <header class="screen-header">
    <div class="screen-header__left">
      <span class="screen-header__dot" />
      <h1 class="screen-header__title">{{ title }}</h1>
    </div>
    <div class="screen-header__right">
      <span class="screen-header__clock">{{ clock }}</span>
      <span v-if="lastUpdated" class="screen-header__updated">
        最后更新 {{ lastUpdatedText }}
      </span>
      <el-button :loading="loading" size="small" @click="emit('refresh')">刷新</el-button>
      <el-button size="small" @click="emit('back')">返回后台</el-button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{ title: string; lastUpdated?: number | null; loading?: boolean }>()
const emit = defineEmits<{ refresh: []; back: [] }>()

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => (now.value = Date.now()), 1000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const pad = (n: number) => String(n).padStart(2, '0')
const fmt = (ms: number) => {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
const clock = computed(() => {
  const d = new Date(now.value)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${fmt(now.value)}`
})
const lastUpdatedText = computed(() => (props.lastUpdated ? fmt(props.lastUpdated) : ''))
</script>

<style scoped>
.screen-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 64px;
  border-bottom: 1px solid rgba(120, 160, 220, 0.18);
}
.screen-header__left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.screen-header__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #36e0ff;
  box-shadow: 0 0 10px #36e0ff;
  animation: pulse 2s ease-in-out infinite;
}
.screen-header__title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #eaf2ff;
}
.screen-header__right {
  display: flex;
  align-items: center;
  gap: 14px;
}
.screen-header__clock {
  font-size: 15px;
  color: #c7d6f5;
  font-variant-numeric: tabular-nums;
}
.screen-header__updated {
  font-size: 12px;
  color: #6b7da6;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
@media (prefers-reduced-motion: reduce) {
  .screen-header__dot { animation: none; }
}
</style>
