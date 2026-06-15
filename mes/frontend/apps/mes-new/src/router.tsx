import { createBrowserRouter, Navigate } from 'react-router-dom'
import PrivateRoute from '@/components/PrivateRoute'
import AdminLayout from '@/layouts/AdminLayout'
import LoginPage from '@/pages/login/LoginPage'
import WelcomePage from '@/pages/welcome/WelcomePage'
import UserList from '@/pages/system/user/UserList'
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
          { path: '403', element: <Forbidden /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
])
