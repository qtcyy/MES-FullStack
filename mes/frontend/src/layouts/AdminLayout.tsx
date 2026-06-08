import { useEffect, useMemo, useCallback, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Dropdown, Space, Avatar, Tabs, Modal, Form, Input, message } from 'antd'
import {
  UserOutlined,
  KeyOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import useAuthStore from '@/stores/authStore'
import useMenuStore from '@/stores/menuStore'
import useAppStore from '@/stores/appStore'
import { getIcon } from '@/utils/iconMap'
import { toReactRoute } from '@/utils/urlMap'
import type { TreeVO, SysMenu } from '@/types/menu'

// ---------------------------------------------------------------------------
// Helper: build Ant Design Menu items from the TreeVO structure
// ---------------------------------------------------------------------------

type MenuItemShape = {
  key: string
  label: string
  icon: React.ReactNode
  children?: MenuItemShape[]
}

function buildMenuItem(node: TreeVO<SysMenu>): MenuItemShape | null {
  const IconComp = getIcon(node.icon || '')
  const children = node.children?.filter((c) => c.type !== 2) || []
  const hasChildren = children.length > 0

  // Directory nodes (with children): use id as key (not navigable)
  // Leaf menu nodes: use mapped React route as key
  const route = hasChildren ? undefined : toReactRoute(node.url)

  // Skip leaf nodes that don't have a valid route (e.g., url="#" or unmapped)
  if (!hasChildren && !route) return null

  const key = hasChildren ? node.id : (route || node.id)
  const base: MenuItemShape = { key, label: node.name, icon: <IconComp /> }

  if (hasChildren) {
    const childItems = children
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))
      .map((child) => buildMenuItem(child))
      .filter(Boolean) as MenuItemShape[]
    // Skip directories with no valid children
    if (childItems.length === 0) return null
    return { ...base, children: childItems }
  }

  return base
}

function buildMenuItems(menuInfo: Record<string, TreeVO<SysMenu>>): MenuItemShape[] {
  return Object.values(menuInfo)
    .filter((n) => n.type !== 2)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .map((node) => buildMenuItem(node))
    .filter(Boolean) as MenuItemShape[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [messageApi, contextHolder] = message.useMessage()

  // --- password change modal ---
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [passwordForm] = Form.useForm()
  const [passwordLoading, setPasswordLoading] = useState(false)

  const handlePasswordChange = useCallback(async () => {
    try {
      const values = await passwordForm.validateFields()
      if (values.newPassword !== values.confirmPassword) {
        messageApi.error('两次输入的新密码不一致')
        return
      }
      setPasswordLoading(true)
      // TODO: call actual API when available
      // await api.post('/admin/sys/user/change-password', { ... })
      await new Promise((resolve) => setTimeout(resolve, 600))
      messageApi.success('密码修改成功')
      setPasswordModalOpen(false)
      passwordForm.resetFields()
    } catch {
      // validation failed — do nothing
    } finally {
      setPasswordLoading(false)
    }
  }, [passwordForm, messageApi])

  // --- stores ---
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const menuInfo = useMenuStore((s) => s.menuInfo)
  const sidebarCollapsed = useMenuStore((s) => s.sidebarCollapsed)
  const openKeys = useMenuStore((s) => s.openKeys)
  const fetchMenuTree = useMenuStore((s) => s.fetchMenuTree)
  const toggleSidebar = useMenuStore((s) => s.toggleSidebar)
  const setOpenKeys = useMenuStore((s) => s.setOpenKeys)

  const tabs = useAppStore((s) => s.tabs)
  const activeTabKey = useAppStore((s) => s.activeTabKey)
  const addTab = useAppStore((s) => s.addTab)
  const removeTab = useAppStore((s) => s.removeTab)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const closeAllTabs = useAppStore((s) => s.closeAllTabs)

  // --- fetch menu tree on mount ---
  useEffect(() => {
    fetchMenuTree()
  }, [fetchMenuTree])

  // --- selected keys derived from the current route path ---
  const selectedKeys = useMemo(() => [location.pathname], [location.pathname])

  // --- build Ant Design menu items from the menu tree ---
  const menuItems: MenuProps['items'] = useMemo(() => {
    if (!menuInfo) return []
    return buildMenuItems(menuInfo) as MenuProps['items']
  }, [menuInfo])

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleMenuClick: MenuProps['onClick'] = useCallback(
    ({ key }) => {
      // Directory nodes (non-route keys) don't navigate — just expand/collapse
      if (!key.startsWith('/')) return

      // Find the menu node name for the tab title by searching the tree
      let title = key
      const searchInNodes = (nodes: Record<string, TreeVO<SysMenu>> | TreeVO<SysMenu>[]): boolean => {
        const arr = Array.isArray(nodes) ? nodes : Object.values(nodes)
        for (const node of arr) {
          if (toReactRoute(node.url) === key) { title = node.name; return true }
          if (node.children) {
            if (searchInNodes(node.children)) return true
          }
        }
        return false
      }
      if (menuInfo) searchInNodes(menuInfo)

      addTab({ key, title, path: key, closable: true })
      navigate(key)
    },
    [menuInfo, navigate, addTab],
  )

  const handleTabChange = useCallback(
    (key: string) => {
      setActiveTab(key)
      navigate(key)
    },
    [setActiveTab, navigate],
  )

  const handleTabEdit = useCallback(
    (
      targetKey: React.MouseEvent | React.KeyboardEvent | string,
      action: 'add' | 'remove',
    ) => {
      if (action === 'remove' && typeof targetKey === 'string') {
        removeTab(targetKey)
        const newActiveKey = useAppStore.getState().activeTabKey
        navigate(newActiveKey)
      }
    },
    [removeTab, navigate],
  )

  const handleLogout = useCallback(async () => {
    closeAllTabs()
    await logout()
  }, [closeAllTabs, logout])

  const userDisplayName = user?.name || user?.username || ''

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      {/* ---- Sidebar ---- */}
      <Layout.Sider
        collapsible
        collapsed={sidebarCollapsed}
        onCollapse={toggleSidebar}
        theme="dark"
        width={256}
        style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}
      >
        <div className="admin-logo">{sidebarCollapsed ? 'MES' : 'MES 章鱼师兄'}</div>

        <div className="admin-menu-scroll">
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={selectedKeys}
            openKeys={openKeys}
            onOpenChange={setOpenKeys}
            items={menuItems}
            onClick={handleMenuClick}
          />
        </div>
      </Layout.Sider>

      {/* ---- Main area ---- */}
      <Layout style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {contextHolder}

        {/* Header */}
        <Layout.Header
          style={{
            background: '#fff',
            padding: '0 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: 64,
          }}
        >
          <div
            style={{ fontSize: 18, cursor: 'pointer' }}
            onClick={toggleSidebar}
          >
            {sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>

          <Dropdown
            menu={{
              items: [
                {
                  key: 'profile',
                  label: '个人信息',
                  icon: <UserOutlined />,
                },
                {
                  key: 'password',
                  label: '修改密码',
                  icon: <KeyOutlined />,
                  onClick: () => setPasswordModalOpen(true),
                },
                { type: 'divider' as const },
                {
                  key: 'logout',
                  label: '退出登录',
                  icon: <LogoutOutlined />,
                  danger: true,
                  onClick: handleLogout,
                },
              ],
            }}
          >
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <span>{userDisplayName}</span>
            </Space>
          </Dropdown>
        </Layout.Header>

        {/* Tab bar */}
        <Tabs
          type="editable-card"
          activeKey={activeTabKey}
          onChange={handleTabChange}
          onEdit={handleTabEdit}
          className="admin-tabs"
          items={tabs.map((t) => ({
            key: t.key,
            label: t.title,
            closable: t.closable,
          }))}
          hideAdd
        />

        {/* Content outlet */}
        <Layout.Content
          style={{
            margin: 16,
            padding: 24,
            background: '#fff',
            flex: 1,
            overflowY: 'auto',
          }}
        >
          <Outlet />
        </Layout.Content>

        {/* Password change modal */}
        <Modal
          title="修改密码"
          open={passwordModalOpen}
          onOk={handlePasswordChange}
          onCancel={() => {
            setPasswordModalOpen(false)
            passwordForm.resetFields()
          }}
          confirmLoading={passwordLoading}
          destroyOnHidden
        >
          <Form
            form={passwordForm}
            layout="vertical"
            style={{ marginTop: 16 }}
          >
            <Form.Item
              name="oldPassword"
              label="旧密码"
              rules={[{ required: true, message: '请输入旧密码' }]}
            >
              <Input.Password autoComplete="current-password" />
            </Form.Item>
            <Form.Item
              name="newPassword"
              label="新密码"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '密码长度不能少于6位' },
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="确认新密码"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: '请确认新密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'))
                  },
                }),
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          </Form>
        </Modal>
      </Layout>
    </Layout>
  )
}
