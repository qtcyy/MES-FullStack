/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      vue(),
      // 自动按需引入 Vue/Router/Pinia/VueUse 的 API
      AutoImport({
        imports: ['vue', 'vue-router', 'pinia', '@vueuse/core'],
        resolvers: [ElementPlusResolver({ importStyle: false })],
        dts: 'src/types/auto-imports.d.ts',
        eslintrc: { enabled: true },
      }),
      // 自动按需引入 Element Plus 组件(tree-shaking)
      Components({
        resolvers: [ElementPlusResolver({ importStyle: false })],
        dts: 'src/types/components.d.ts',
      }),
    ],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 4200,
      proxy: {
        // 开发期代理到后端,避免跨域;后端 Spring Boot 在 9090
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://localhost:9090',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          // 产物分包(函数式,兼容 Vite8/rolldown):核心框架/UI 库各自独立 chunk,利于缓存与首屏
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (id.includes('element-plus') || id.includes('@element-plus')) return 'element'
            if (
              id.includes('vue-router') ||
              id.includes('pinia') ||
              id.includes('@vueuse') ||
              id.includes('@vue') ||
              /[\\/]vue[\\/]/.test(id)
            )
              return 'vue'
          },
        },
      },
    },
    test: {
      // 纯逻辑单测默认 node 环境;组件测试可按文件覆盖为 jsdom
      environment: 'node',
      include: ['tests/**/*.spec.ts'],
    },
  }
})
