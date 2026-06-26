import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
// Element Plus 组件 JS 按需引入(unplugin),样式整体引入一次以覆盖编程式服务(Message/MessageBox)
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import './styles/index.scss'
import App from './App.vue'
import router from './router'
import { setupGuards } from './router/guards'
import { setupPlugins } from './plugins'
import { useAppStore } from './stores/app'

const app = createApp(App)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)
app.use(router)

setupGuards(router)
setupPlugins(app)

// 应用持久化的主题(刷新后保持明/暗)
useAppStore().applyTheme()

app.mount('#app')
