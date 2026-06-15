import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { Spin } from 'antd'
import useAuthStore from '@/stores/authStore'

function PrivateRoute() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const user = useAuthStore((s) => s.user)
  const fetchUserInfo = useAuthStore((s) => s.fetchUserInfo)
  const [restoring, setRestoring] = useState(true)

  useEffect(() => {
    if (isLoggedIn && !user) {
      fetchUserInfo()
        .catch(() => {
          // Restore failed — treat as not logged in.
          useAuthStore.setState({ isLoggedIn: false })
        })
        .finally(() => setRestoring(false))
    } else {
      setRestoring(false)
    }
    // Run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (restoring) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Spin size="large" />
      </div>
    )
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default PrivateRoute
