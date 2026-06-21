import { ref, watch, onUnmounted, type Ref } from 'vue'
import { advance } from '@/utils/typewriter'

/**
 * 打字机 composable：随 full 增长逐字显现 visible。
 *
 * 关键：done 只表示「不会再有新内容」，已到达的内容仍需逐字显现，
 * 因此 done 为 true 时**不**直接补全——否则后端 content 与 done 同批到达
 * （无 tool 的直接回答路径）时，动画会被立即跳过。
 * 仅当**首帧渲染**时 done 已为 true（历史/已完成消息重渲染）才直接补全，
 * 避免重新打开抽屉时重放整段动画。
 *
 * @param full 目标全文（响应式）
 * @param done 是否结束（响应式）
 * @param cps  每秒字符数，默认 240
 */
export function useTypewriter(full: Ref<string>, done: Ref<boolean>, cps = 240) {
  const visible = ref('')
  let timer: ReturnType<typeof setInterval> | null = null
  let firstRun = true
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
      // 历史消息（首帧就已结束）直接补全，不重放动画
      if (firstRun && done.value) {
        visible.value = full.value
        firstRun = false
        return
      }
      firstRun = false
      // 其余情况：朝 full 逐字推进（done 不再触发立即补全）
      if (visible.value.length < full.value.length && timer === null) {
        timer = setInterval(tick, 33)
      }
    },
    { immediate: true },
  )

  onUnmounted(stop)
  return { visible }
}
