import type { App } from 'vue'
import { MotionPlugin } from '@vueuse/motion'
import { autoAnimatePlugin } from '@formkit/auto-animate/vue'
import { vPermission } from '@/directives/permission'

/** 集中注册全局插件与指令:v-motion / v-auto-animate / v-permission */
export function setupPlugins(app: App) {
  app.use(MotionPlugin)
  app.use(autoAnimatePlugin)
  app.directive('permission', vPermission)
}
