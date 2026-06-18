import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// 不启用 React.StrictMode:开发期 StrictMode 的双挂载(mount→unmount→remount)会在那次卸载时
// dispose React-Three-Fiber 的 WebGLRenderer(数字仿真大屏 /digitization/simulation),重挂后 WebGL
// 上下文不恢复 → 画面闪现后空白 + 控制台 "THREE.WebGLRenderer: Context Lost"。这是 WebGL/R3F 与
// StrictMode 的固有不兼容(库层面),React 无法对单个子树关闭 StrictMode。StrictMode 仅作用于开发期、
// 对生产构建零影响,WebGL/three 应用普遍不启用它,故此处全局关闭。
createRoot(document.getElementById('root')!).render(
  <App />,
)
