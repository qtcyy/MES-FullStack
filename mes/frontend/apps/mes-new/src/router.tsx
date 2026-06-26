import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import PrivateRoute from '@/components/PrivateRoute'
import AdminLayout from '@/layouts/AdminLayout'
import LoginPage from '@/pages/login/LoginPage'
import WelcomePage from '@/pages/welcome/WelcomePage'
import UserList from '@/pages/system/user/UserList'
import RoleList from '@/pages/system/role/RoleList'
import MenuList from '@/pages/system/menu/MenuList'
import DictList from '@/pages/system/dict/DictList'
import DeptList from '@/pages/system/dept/DeptList'
import TeamPage from '@/pages/system/team/TeamPage'
import ComponentList from '@/pages/basedata/component/ComponentList'
import MaterileList from '@/pages/basedata/materile/MaterileList'
import DeviceGroupList from '@/pages/basedata/device-group/DeviceGroupList'
import ProcessUnitList from '@/pages/basedata/process-unit/ProcessUnitList'
import WarehouseList from '@/pages/basedata/warehouse/WarehouseList'
import OperList from '@/pages/basedata/oper/OperList'
import ManagerList from '@/pages/basedata/manager/ManagerList'
import ManagerItemPage from '@/pages/basedata/manager-item/ManagerItemPage'
import FlowList from '@/pages/technology/flow/FlowList'
import ProductBomList from '@/pages/technology/product-bom/ProductBomList'
import BomFlowList from '@/pages/technology/bom-flow/BomFlowList'
import ProcessContentList from '@/pages/technology/process-content/ProcessContentList'
import ProcessQueryPage from '@/pages/technology/process-query/ProcessQueryPage'
import OrderList from '@/pages/order/production/OrderList'
import DispatchList from '@/pages/order/dispatch/DispatchList'
import GanttPage from '@/pages/order/gantt/GanttPage'
import ReceiptList from '@/pages/inventory/receipt/ReceiptList'
import OutboundList from '@/pages/inventory/outbound/OutboundList'
import InventoryQuery from '@/pages/inventory/query/InventoryQuery'
import ManualInbound from '@/pages/inventory/manual/ManualInbound'
import CategoryList from '@/pages/workflow/category/CategoryList'
import ModelList from '@/pages/workflow/model/ModelList'
import FormList from '@/pages/workflow/form/FormList'
import DefinitionList from '@/pages/workflow/definition/DefinitionList'
import NotFound from '@/pages/error/NotFound'
import Forbidden from '@/pages/error/Forbidden'
import RouteAccessGuard from '@/components/RouteAccessGuard'

// eslint-disable-next-line react-refresh/only-export-components -- 路由配置模块:lazy() 使本文件被识别为含组件,但其仅导出 router 配置,无 Fast Refresh 边界需求
const PlanDashboard = lazy(() => import('@/pages/digitization/PlanDashboard'))
// eslint-disable-next-line react-refresh/only-export-components -- 同上:lazy 路由模块
const Simulation3DPage = lazy(() => import('@/pages/digitization/simulation/Simulation3DPage'))

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <PrivateRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="/welcome" replace /> },
          { path: 'welcome', element: <WelcomePage /> },
          { path: 'system/user', element: <UserList /> },
          { path: 'system/role', element: <RoleList /> },
          { path: 'system/menu', element: <MenuList /> },
          { path: 'system/dict', element: <DictList /> },
          { path: 'system/department', element: <DeptList /> },
          { path: 'system/team', element: <TeamPage /> },
          { path: 'basedata/component', element: <ComponentList /> },
          { path: 'basedata/materile', element: <MaterileList /> },
          { path: 'basedata/device-group', element: <DeviceGroupList /> },
          { path: 'basedata/process-unit', element: <ProcessUnitList /> },
          { path: 'basedata/warehouse', element: <WarehouseList /> },
          { path: 'basedata/oper', element: <OperList /> },
          { path: 'basedata/manager', element: <ManagerList /> },
          { path: 'basedata/manager-item', element: <ManagerItemPage /> },
          { path: 'technology/flow', element: <FlowList /> },
          { path: 'technology/product-bom', element: <ProductBomList /> },
          { path: 'technology/process-flow', element: <BomFlowList /> },
          { path: 'technology/process-content', element: <ProcessContentList /> },
          { path: 'technology/process-query', element: <ProcessQueryPage /> },
          { path: 'order/production', element: <OrderList /> },
          { path: 'order/dispatch', element: <DispatchList /> },
          { path: 'order/gantt', element: <GanttPage /> },
          { path: 'inventory/receipt', element: <ReceiptList /> },
          { path: 'inventory/outbound', element: <OutboundList /> },
          { path: 'inventory/query', element: <InventoryQuery /> },
          { path: 'inventory/manual-inbound', element: <ManualInbound /> },
          { path: 'workflow/category', element: <CategoryList /> },
          { path: 'workflow/model', element: <ModelList /> },
          { path: 'workflow/form', element: <FormList /> },
          { path: 'workflow/definition', element: <DefinitionList /> },
          {
            path: 'digitization/simulation',
            element: (
              <Suspense fallback={<div className="p-4 text-muted-foreground">加载 3D 仿真…</div>}>
                <Simulation3DPage />
              </Suspense>
            ),
          },
          { path: '403', element: <Forbidden /> },
          { path: '*', element: <NotFound /> },
        ],
      },
      {
        path: 'digitization/plan',
        element: (
          <RouteAccessGuard>
            <Suspense fallback={<div style={{ minHeight: '100vh', background: '#050b16' }} />}>
              <PlanDashboard />
            </Suspense>
          </RouteAccessGuard>
        ),
      },
    ],
  },
])
