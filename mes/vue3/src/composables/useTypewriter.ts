import { ref, watch, onUnmounted, type Ref } from 'vue'
import { advance } from '@/utils/typewriter'

/**
 * 打字机 composable：随 full 增长逐字显现 visible。
 * done 为 true 时立即补全全文。
 * @param full 目标全文（响应式）
 * @param done 是否结束（响应式）
 * @param cps  每秒字符数，默认 240
 */
export function useTypewriter(full: Ref<string>, done: Ref<boolean>, cps = 240) {
  const visible = ref('')
  let timer: ReturnType<typeof setInterval> | null = null
  const stepPerTick = Math.max(1, Math.round(cps / 30)) // ~30fps

  function stop() {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  function tick() {
    const next = advance(visible.value.length, full.value.length, stepPerTick)
    visible.value = full.value.slice(0, next)
    if (next >= full.value.length) stop()
  }

  watch(
    [full, done],
    () => {
      if (done.value) {
        visible.value = full.value
        stop()
        return
      }
      if (visible.value.length < full.value.length && timer === null) {
        timer = setInterval(tick, 33)
      }
    },
    { immediate: true },
  )

  onUnmounted(stop)
  return { visible }
}
