import type { Directive } from 'vue'
import { usePermissionStore } from '@/stores/permission'

/**
 * 按钮级权限指令:v-permission="'user:add'"
 * 当前用户无该权限时,直接从 DOM 移除元素。
 */
export const vPermission: Directive<HTMLElement, string> = {
  mounted(el, binding) {
    const store = usePermissionStore()
    if (binding.value && !store.hasPermission(binding.value)) {
      el.parentNode?.removeChild(el)
    }
  },
}
