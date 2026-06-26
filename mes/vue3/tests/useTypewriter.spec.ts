// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ref, nextTick, defineComponent, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useTypewriter } from '@/composables/useTypewriter'

/** 把 composable 挂进一个真实组件实例，暴露 visible 以便断言 */
function mountTypewriter(full: Ref<string>, done: Ref<boolean>, cps = 300) {
  const Comp = defineComponent({
    setup(_, { expose }) {
      const tw = useTypewriter(full, done, cps)
      expose({ tw })
      return () => null
    },
  })
  return mount(Comp)
}

afterEach(() => {
  vi.useRealTimers()
})

describe('useTypewriter', () => {
  it('content 与 done 同批到达（首帧 done=false）时仍逐字动画，不瞬间补全', async () => {
    vi.useFakeTimers()
    const full = ref('')
    const done = ref(false)
    const wrapper = mountTypewriter(full, done)
    const tw = (wrapper.vm as unknown as { tw: { visible: Ref<string> } }).tw
    await nextTick()

    // 模拟后端在挂载后同步抛出 content + done
    full.value = 'hello world'
    done.value = true
    await nextTick()

    // 动画刚启动，尚未补全
    expect(tw.visible.value.length).toBeLessThan(full.value.length)

    // 推进定时器让它跑完
    vi.advanceTimersByTime(2000)
    expect(tw.visible.value).toBe('hello world')
  })

  it('首帧 done 已为 true（历史消息重渲染）直接补全，不重放动画', async () => {
    vi.useFakeTimers()
    const full = ref('completed answer')
    const done = ref(true)
    const wrapper = mountTypewriter(full, done)
    const tw = (wrapper.vm as unknown as { tw: { visible: Ref<string> } }).tw
    await nextTick()

    expect(tw.visible.value).toBe('completed answer')
  })
})
