import { useEffect, useState } from 'react'
import { Modal, Table, Button, Input, message } from 'antd'
import { UserAddOutlined, UserDeleteOutlined } from '@ant-design/icons'
import * as teamApi from '@/api/system/team'
import type { SysUser } from '@/types/user'

interface TeamUserModalProps {
  open: boolean
  teamId: string | null
  teamName: string
  onClose: () => void
}

function TeamUserModal({ open, teamId, teamName, onClose }: TeamUserModalProps) {
  const [availableUsers, setAvailableUsers] = useState<SysUser[]>([])
  const [teamUsers, setTeamUsers] = useState<SysUser[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && teamId) {
      setLoading(true)
      Promise.all([
        teamApi.getAvailableUsers(),
        teamApi.getTeamUsers(teamId),
      ])
        .then(([available, members]) => {
          const availArr = Array.isArray(available) ? available : []
          const memberArr = Array.isArray(members) ? members : []
          const memberIds = new Set(memberArr.map((u: SysUser) => u.id))
          setAvailableUsers(
            availArr.filter((u: SysUser) => !memberIds.has(u.id))
          )
          setTeamUsers(memberArr)
        })
        .catch(() => {
          message.error('加载数据失败')
        })
        .finally(() => setLoading(false))
    }
  }, [open, teamId])

  const handleAddUsers = async () => {
    if (selectedUserIds.length === 0 || !teamId) return
    try {
      await teamApi.addTeamUsers(teamId, selectedUserIds)
      message.success('添加成功')
      const [available, members] = await Promise.all([
        teamApi.getAvailableUsers(),
        teamApi.getTeamUsers(teamId),
      ])
      const availArr = Array.isArray(available) ? available : []
      const memberArr = Array.isArray(members) ? members : []
      const memberIds = new Set(memberArr.map((u: SysUser) => u.id))
      setAvailableUsers(
        availArr.filter((u: SysUser) => !memberIds.has(u.id))
      )
      setTeamUsers(memberArr)
      setSelectedUserIds([])
    } catch {
      message.error('添加失败')
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (!teamId) return
    try {
      await teamApi.removeTeamUser(teamId, userId)
      message.success('移除成功')
      setTeamUsers((prev) => prev.filter((u) => u.id !== userId))
      const available = await teamApi.getAvailableUsers()
      const availArr = Array.isArray(available) ? available : []
      setAvailableUsers(
        availArr.filter((u: SysUser) => u.id !== userId)
      )
    } catch {
      message.error('移除失败')
    }
  }

  const filteredUsers = availableUsers.filter(
    (u) =>
      !searchText ||
      u.name?.includes(searchText) ||
      u.username?.includes(searchText)
  )

  const availableColumns = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '用户名', dataIndex: 'username', key: 'username' },
  ]

  const memberColumns = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '用户名', dataIndex: 'username', key: 'username' },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: SysUser) => (
        <Button
          type="link"
          size="small"
          danger
          icon={<UserDeleteOutlined />}
          onClick={() => handleRemoveUser(record.id)}
        >
          移除
        </Button>
      ),
    },
  ]

  return (
    <Modal
      open={open}
      title={`班组员工管理 - ${teamName}`}
      onCancel={onClose}
      width={900}
      footer={null}
      destroyOnHidden
    >
      <div style={{ display: 'flex', gap: 16 }}>
        <div
          style={{
            flex: 1,
            border: '1px solid #f0f0f0',
            borderRadius: 8,
            padding: 12,
          }}
        >
          <h4>可选用户</h4>
          <Input
            placeholder="搜索用户"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ marginBottom: 8 }}
            allowClear
          />
          <Table
            rowKey="id"
            columns={availableColumns}
            dataSource={filteredUsers}
            loading={loading}
            size="small"
            rowSelection={{
              selectedRowKeys: selectedUserIds,
              onChange: (keys) =>
                setSelectedUserIds(keys as string[]),
            }}
            pagination={{ pageSize: 8 }}
          />
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={handleAddUsers}
            disabled={selectedUserIds.length === 0}
            style={{ marginTop: 8 }}
          >
            加入班组
          </Button>
        </div>
        <div
          style={{
            flex: 1,
            border: '1px solid #f0f0f0',
            borderRadius: 8,
            padding: 12,
          }}
        >
          <h4>已加入员工 ({teamUsers.length})</h4>
          <Table
            rowKey="id"
            columns={memberColumns}
            dataSource={teamUsers}
            loading={loading}
            size="small"
            pagination={{ pageSize: 8 }}
          />
        </div>
      </div>
    </Modal>
  )
}

export default TeamUserModal
