import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: { globals: globals.browser },
    rules: {
      // 以下为 React Compiler 建议性规则(eslint-plugin-react-hooks v7)。
      // 本项目未启用 React Compiler,而它们命中的均为安全惯用写法:
      //   - refs:latest-ref 模式(在 render 中写 ref.current,见 http/hooks.ts)
      //   - set-state-in-effect:挂载守卫与数据拉取副作用(ThemeSwitch、useQuery$)
      //   - static-components:运行时按菜单 icon 选取组件(getIcon,见 AppSidebar)
      //   - incompatible-library:react-hook-form 的 watch() 固有,无法被编译器记忆化
      //   - immutability:Three.js useLoader() 返回值需就地改写 wrapS/wrapT 是 R3F 标准用法
      // 降为 warn 以保留可见性,同时不阻塞构建/门禁。rules-of-hooks 等核心规则仍为 error。
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/incompatible-library': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
])
