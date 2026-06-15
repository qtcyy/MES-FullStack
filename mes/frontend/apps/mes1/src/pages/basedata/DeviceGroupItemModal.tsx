import { useEffect, useState } from 'react'
import { Modal, Table, Button, Input, message } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import * as deviceApi from '@/api/basedata/device'
import * as groupApi from '@/api/basedata/device-group'
import type { SpDevice } from '@/types/device'

interface Props {
  open: boolean
  groupId: string | null
  groupName: string
  onClose: () => void
}

function DeviceGroupItemModal({ open, groupId, groupName, onClose }: Props) {
  const [allDevices, setAllDevices] = useState<SpDevice[]>([])
  const [groupDevices, setGroupDevices] = useState<SpDevice[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(false)
  const [availableDevices, setAvailableDevices] = useState<SpDevice[]>([])

  useEffect(() => {
    if (open && groupId) {
      setLoading(true)
      Promise.all([
        deviceApi.page({ current: 1, size: 999 }),
        groupApi.getGroupItems(groupId),
      ])
        .then(([devicesRes, items]) => {
          const all = (devicesRes as any)?.records ?? []
          const members = Array.isArray(items) ? items : []
          const memberIds = new Set(members.map((d: SpDevice) => d.id))
          const uniqueAll = all.filter((d: SpDevice) => d.deleted === '0')
          setAllDevices(uniqueAll)
          setGroupDevices(members)
          setAvailableDevices(uniqueAll.filter((d: SpDevice) => !memberIds.has(d.id)))
        })
        .catch(() => message.error('加载失败'))
        .finally(() => setLoading(false))
    }
  }, [open, groupId])

  const handleAdd = async () => {
    if (selectedIds.length === 0 || !groupId) return
    try {
      await groupApi.addGroupItems(groupId, selectedIds)
      message.success('添加成功')
      const items = await groupApi.getGroupItems(groupId)
      const members = Array.isArray(items) ? items : []
      const memberIds = new Set(members.map((d: SpDevice) => d.id))
      setGroupDevices(members)
      setAvailableDevices(allDevices.filter((d: SpDevice) => !memberIds.has(d.id)))
      setSelectedIds([])
    } catch {
      message.error('添加失败')
    }
  }

  const handleRemove = async (deviceId: string) => {
    if (!groupId) return
    try {
      await groupApi.removeGroupItem(groupId, deviceId)
      message.success('移除成功')
      setGroupDevices((prev) => prev.filter((d) => d.id !== deviceId))
      setAvailableDevices((prev) => {
        const removed = groupDevices.find((d) => d.id === deviceId)
        if (removed) return [...prev, removed]
        return prev
      })
    } catch {
      message.error('移除失败')
    }
  }

  const filteredAvailable = availableDevices.filter(
    (d) => !searchText || d.name?.includes(searchText) || d.code?.includes(searchText),
  )

  return (
    <Modal
      open={open}
      title={`设备管理 - ${groupName}`}
      onCancel={onClose}
      width={900}
      footer={null}
      destroyOnHidden
    >
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1, border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
          <h4>可选设备</h4>
          <Input
            placeholder="搜索设备"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ marginBottom: 8 }}
            allowClear
          />
          <Table
            rowKey="id"
            size="small"
            loading={loading}
            columns={[
              { title: '编号', dataIndex: 'code' },
              { title: '名称', dataIndex: 'name' },
            ]}
            dataSource={filteredAvailable}
            rowSelection={{
              selectedRowKeys: selectedIds,
              onChange: (keys) => setSelectedIds(keys as string[]),
            }}
            pagination={{ pageSize: 8 }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            disabled={selectedIds.length === 0}
            style={{ marginTop: 8 }}
          >
            加入编组
          </Button>
        </div>
        <div style={{ flex: 1, border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
          <h4>已加入设备 ({groupDevices.length})</h4>
          <Table
            rowKey="id"
            size="small"
            loading={loading}
            columns={[
              { title: '编号', dataIndex: 'code' },
              { title: '名称', dataIndex: 'name' },
              {
                title: '操作',
                key: 'action',
                render: (_: any, r: SpDevice) => (
                  <Button
                    type="link"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemove(r.id)}
                  >
                    移除
                  </Button>
                ),
              },
            ]}
            dataSource={groupDevices}
            pagination={{ pageSize: 8 }}
          />
        </div>
      </div>
    </Modal>
  )
}

export default DeviceGroupItemModal
