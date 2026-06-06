import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App as AntApp } from 'antd'
import LoginPage from '@/pages/login/LoginPage'
import PrivateRoute from '@/components/PrivateRoute'
import ErrorBoundary from '@/components/ErrorBoundary'
import AdminLayout from '@/layouts/AdminLayout'
// -- welcome --
import WelcomePage from '@/pages/welcome/WelcomePage'
// -- system --
import UserList from '@/pages/system/UserList'
import RoleList from '@/pages/system/RoleList'
import MenuList from '@/pages/system/MenuList'
import DictList from '@/pages/system/DictList'
import DeptList from '@/pages/system/DeptList'
// -- basedata --
import MaterileList from '@/pages/basedata/MaterileList'
import ManagerList from '@/pages/basedata/ManagerList'
import ManagerItemList from '@/pages/basedata/ManagerItemList'
// -- technology --
import BomList from '@/pages/technology/BomList'
import FlowList from '@/pages/technology/FlowList'
import FlowProcessList from '@/pages/technology/FlowProcessList'
// -- order --
import OrderList from '@/pages/order/OrderList'
// -- digitization --
import PlanDashboard from '@/pages/digitization/PlanDashboard'
import Simulation3D from '@/pages/digitization/Simulation3D'
// -- error --
import ForbiddenPage from '@/pages/error/ForbiddenPage'
import NotFoundPage from '@/pages/error/NotFoundPage'
import ServerErrorPage from '@/pages/error/ServerErrorPage'
// -- system tools --
import IconPickerPage from '@/pages/system/tool/IconPickerPage'
import ColorPickerPage from '@/pages/system/tool/ColorPickerPage'
import EditorPage from '@/pages/system/tool/EditorPage'
import StepFormPage from '@/pages/system/tool/StepFormPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={zhCN}>
        <AntApp>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              {/* Authenticated routes — wrapped in AdminLayout */}
              <Route element={<PrivateRoute />}>
                <Route element={<ErrorBoundary><AdminLayout /></ErrorBoundary>}>
                  <Route index element={<Navigate to="/welcome" replace />} />
                  <Route path="welcome" element={<WelcomePage />} />

                  {/* System */}
                  <Route path="system/user" element={<UserList />} />
                  <Route path="system/role" element={<RoleList />} />
                  <Route path="system/menu" element={<MenuList />} />
                  <Route path="system/dict" element={<DictList />} />
                  <Route path="system/department" element={<DeptList />} />

                  {/* Basedata */}
                  <Route path="basedata/materile" element={<MaterileList />} />
                  <Route path="basedata/manager" element={<ManagerList />} />
                  <Route path="basedata/manager-item" element={<ManagerItemList />} />

                  {/* Technology */}
                  <Route path="technology/bom" element={<BomList />} />
                  <Route path="technology/flow" element={<FlowList />} />
                  <Route path="technology/flowprocess" element={<FlowProcessList />} />

                  {/* Order */}
                  <Route path="order/production" element={<OrderList />} />

                  {/* Digitization */}
                  <Route path="digitization/plan" element={<PlanDashboard />} />
                  <Route path="digitization/simulation" element={<Simulation3D />} />

                  {/* System tools */}
                  <Route path="system/tool/icon" element={<IconPickerPage />} />
                  <Route path="system/tool/color" element={<ColorPickerPage />} />
                  <Route path="system/tool/editor" element={<EditorPage />} />
                  <Route path="system/tool/step-form" element={<StepFormPage />} />
                </Route>
              </Route>

              {/* Error pages */}
              <Route path="/403" element={<ForbiddenPage />} />
              <Route path="/500" element={<ServerErrorPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  )
}

export default App
