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
          { path: '403', element: <Forbidden /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
])
