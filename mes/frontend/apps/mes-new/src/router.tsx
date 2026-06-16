import { createBrowserRouter, Navigate } from 'react-router-dom'
import PrivateRoute from '@/components/PrivateRoute'
import AdminLayout from '@/layouts/AdminLayout'
import LoginPage from '@/pages/login/LoginPage'
import WelcomePage from '@/pages/welcome/WelcomePage'
import UserList from '@/pages/system/user/UserList'
import RoleList from '@/pages/system/role/RoleList'
import MenuList from '@/pages/system/menu/MenuList'
import DictList from '@/pages/system/dict/DictList'
import DeptList from '@/pages/system/dept/DeptList'
import ComponentList from '@/pages/basedata/component/ComponentList'
import MaterileList from '@/pages/basedata/materile/MaterileList'
import DeviceGroupList from '@/pages/basedata/device-group/DeviceGroupList'
import ProcessUnitList from '@/pages/basedata/process-unit/ProcessUnitList'
import WarehouseList from '@/pages/basedata/warehouse/WarehouseList'
import OperList from '@/pages/basedata/oper/OperList'
import FlowList from '@/pages/technology/flow/FlowList'
import ProductBomList from '@/pages/technology/product-bom/ProductBomList'
import BomFlowList from '@/pages/technology/bom-flow/BomFlowList'
import ProcessContentList from '@/pages/technology/process-content/ProcessContentList'
import OrderList from '@/pages/order/production/OrderList'
import DispatchList from '@/pages/order/dispatch/DispatchList'
import NotFound from '@/pages/error/NotFound'
import Forbidden from '@/pages/error/Forbidden'

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
          { path: 'basedata/component', element: <ComponentList /> },
          { path: 'basedata/materile', element: <MaterileList /> },
          { path: 'basedata/device-group', element: <DeviceGroupList /> },
          { path: 'basedata/process-unit', element: <ProcessUnitList /> },
          { path: 'basedata/warehouse', element: <WarehouseList /> },
          { path: 'basedata/oper', element: <OperList /> },
          { path: 'technology/flow', element: <FlowList /> },
          { path: 'technology/product-bom', element: <ProductBomList /> },
          { path: 'technology/bom-flow', element: <BomFlowList /> },
          { path: 'technology/process-content', element: <ProcessContentList /> },
          { path: 'order/production', element: <OrderList /> },
          { path: 'order/dispatch', element: <DispatchList /> },
          { path: '403', element: <Forbidden /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
])
