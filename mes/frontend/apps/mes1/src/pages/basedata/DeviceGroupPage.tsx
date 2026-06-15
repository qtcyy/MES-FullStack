import { useState } from 'react'
import { Form, Button, Input, Tag, Popconfirm, message, Space, Tabs } from 'antd'
import { PlusOutlined, AppstoreOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageContainer from '@/components/PageContainer'
import { ensureArray } from '@/utils/ensureArray'
import SearchForm from '@/components/SearchForm'
import PageTable from '@/components/PageTable'
import ModalForm from '@/components/ModalForm'
import PermissionGuard from '@/components/PermissionGuard'
import { usePagination } from '@/hooks/usePagination'
import * as deviceApi from '@/api/basedata/device'
import * as groupApi from '@/api/basedata/device-group'
import DeviceForm from './DeviceForm'
import DeviceGroupForm from './DeviceGroupForm'
import DeviceGroupItemModal from './DeviceGroupItemModal'
import type { SpDevice, SpDeviceDTO, SpDeviceGroup, SpDeviceGroupDTO } from '@/types/device'

const statusMap: Record<string, { text: string; color: string }> = {
  '0': { text: '正常', color: 'green' },
  '1': { text: '已删除', color: 'red' },
  '2': { text: '已禁用', color: 'orange' },
}

const deviceStatusMap: Record<string, { text: string; color: string }> = {
  '0': { text: '空闲', color: 'green' },
  '1': { text: '运行中', color: 'blue' },
  '2': { text: '维修中', color: 'orange' },
  '3': { text: '报废', color: 'red' },
}

export default function DeviceGroupPage() {
  const queryClient = useQueryClient()
  const { pagination: devPagination, onChange: devOnChange, reset: devReset } = usePagination()
  const { pagination: grpPagination, onChange: grpOnChange, reset: grpReset } = usePagination()
  const [devFilters, setDevFilters] = useState<Record<string, unknown>>({})
  const [grpFilters, setGrpFilters] = useState<Record<string, unknown>>({})
  const [activeTab, setActiveTab] = useState('devices')

  // Device modal state
  const [devModalOpen, setDevModalOpen] = useState(false)
  const [devEditId, setDevEditId] = useState<string | null>(null)
  const [devRecord, setDevRecord] = useState<SpDevice | null>(null)
  const [devForm] = Form.useForm()

  // Group modal state
  const [grpModalOpen, setGrpModalOpen] = useState(false)
  const [grpEditId, setGrpEditId] = useState<string | null>(null)
  const [grpRecord, setGrpRecord] = useState<SpDeviceGroup | null>(null)
  const [grpForm] = Form.useForm()

  // Group item modal state
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [itemGroupId, setItemGroupId] = useState<string | null>(null)
  const [itemGroupName, setItemGroupName] = useState('')

  // Device queries
  const { data: devData, isLoading: devLoading } = useQuery({
    queryKey: ['devices', devPagination, devFilters],
    queryFn: () => deviceApi.page({ current: devPagination.current, size: devPagination.pageSize, ...devFilters }),
  })

  const devSave = useMutation({
    mutationFn: (v: Partial<SpDevice>) => deviceApi.addOrUpdate(v),
    onSuccess: () => {
      message.success('操作成功'); setDevModalOpen(false); setDevEditId(null); setDevRecord(null)
      devForm.resetFields(); queryClient.invalidateQueries({ queryKey: ['devices'] })
    },
  })

  const devDelete = useMutation({
    mutationFn: (r: SpDeviceDTO) => deviceApi.deleteById(r.id),
    onSuccess: () => { message.success('删除成功'); queryClient.invalidateQueries({ queryKey: ['devices'] }) },
  })

  // Group queries
  const { data: grpData, isLoading: grpLoading } = useQuery({
    queryKey: ['deviceGroups', grpPagination, grpFilters],
    queryFn: () => groupApi.page({ current: grpPagination.current, size: grpPagination.pageSize, ...grpFilters }),
  })

  const grpSave = useMutation({
    mutationFn: (v: Partial<SpDeviceGroup>) => groupApi.addOrUpdate(v),
    onSuccess: () => {
      message.success('操作成功'); setGrpModalOpen(false); setGrpEditId(null); setGrpRecord(null)
      grpForm.resetFields(); queryClient.invalidateQueries({ queryKey: ['deviceGroups'] })
    },
  })

  const grpDelete = useMutation({
    mutationFn: (r: SpDeviceGroupDTO) => groupApi.deleteById(r.id),
    onSuccess: () => { message.success('删除成功'); queryClient.invalidateQueries({ queryKey: ['deviceGroups'] }) },
  })

  // Device columns
  const devColumns = [
    { title: '设备编号', dataIndex: 'code', key: 'code' },
    { title: '设备名称', dataIndex: 'name', key: 'name' },
    { title: '设备类型', dataIndex: 'type', key: 'type', render: (v: string) => v || '-' },
    { title: '设备型号', dataIndex: 'model', key: 'model', render: (v: string) => v || '-' },
    { title: '产线', dataIndex: 'lineName', key: 'lineName', render: (v: string) => v || '-' },
    { title: '位置', dataIndex: 'location', key: 'location', render: (v: string) => v || '-' },
    { title: '运行状态', dataIndex: 'status', key: 'status',
      render: (v: string) => { const s = deviceStatusMap[v] || { text: v || '-', color: 'default' }; return <Tag color={s.color}>{s.text}</Tag> }
    },
    { title: '状态', dataIndex: 'deleted', key: 'deleted',
      render: (v: string) => { const s = statusMap[v] || { text: v, color: 'default' }; return <Tag color={s.color}>{s.text}</Tag> }
    },
    {
      title: '操作', key: 'action',
      render: (_: any, r: SpDeviceDTO) => (
        <Space>
          <Button type="link" size="small" onClick={() => { setDevEditId(r.id); setDevRecord(r as SpDevice); setDevModalOpen(true) }}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => devDelete.mutate(r)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // Group columns
  const grpColumns = [
    { title: '编组代码', dataIndex: 'code', key: 'code' },
    { title: '编组名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'descr', key: 'descr', render: (v: string) => v || '-' },
    { title: '设备数量', dataIndex: 'deviceCount', key: 'deviceCount', render: (v: number) => v ?? 0 },
    { title: '状态', dataIndex: 'deleted', key: 'deleted',
      render: (v: string) => { const s = statusMap[v] || { text: v, color: 'default' }; return <Tag color={s.color}>{s.text}</Tag> }
    },
    {
      title: '操作', key: 'action',
      render: (_: any, r: SpDeviceGroupDTO) => (
        <Space>
          <Button type="link" size="small" onClick={() => { setGrpEditId(r.id); setGrpRecord(r as SpDeviceGroup); setGrpModalOpen(true) }}>编辑</Button>
          <Button type="link" size="small" icon={<AppstoreOutlined />}
            onClick={() => { setItemGroupId(r.id); setItemGroupName(r.name); setItemModalOpen(true) }}>设备管理</Button>
          <Popconfirm title="确定删除？" onConfirm={() => grpDelete.mutate(r)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <PageContainer>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        {
          key: 'devices', label: '设备管理',
          children: (
            <>
              <SearchForm onSearch={(v) => { setDevFilters(v); devReset() }} onReset={() => { setDevFilters({}); devReset() }} loading={devLoading}>
                <Form.Item name="code"><Input placeholder="设备编号" /></Form.Item>
                <Form.Item name="name"><Input placeholder="设备名称" /></Form.Item>
                <Form.Item name="type"><Input placeholder="设备类型" /></Form.Item>
              </SearchForm>
              <PageTable rowKey="id" columns={devColumns} dataSource={ensureArray(devData?.records)} loading={devLoading}
                total={devData?.total || 0} pagination={{ current: devPagination.current, pageSize: devPagination.pageSize }}
                onChange={devOnChange}
                toolbar={<PermissionGuard perm="device:add"><Button type="primary" icon={<PlusOutlined />}
                  onClick={() => { setDevEditId(null); setDevRecord(null); setDevModalOpen(true) }}>新增设备</Button></PermissionGuard>} />
              <ModalForm open={devModalOpen} title={devEditId ? '编辑设备' : '新增设备'} width={820} formInstance={devForm}
                onCancel={() => { setDevModalOpen(false); setDevEditId(null); setDevRecord(null); devForm.resetFields() }}
                loading={devSave.isPending}>
                <DeviceForm id={devEditId} record={devRecord} formInstance={devForm} onFinish={(v) => devSave.mutate({ ...v, id: devEditId || undefined })} />
              </ModalForm>
            </>
          ),
        },
        {
          key: 'groups', label: '设备编组',
          children: (
            <>
              <SearchForm onSearch={(v) => { setGrpFilters(v); grpReset() }} onReset={() => { setGrpFilters({}); grpReset() }} loading={grpLoading}>
                <Form.Item name="code"><Input placeholder="编组代码" /></Form.Item>
                <Form.Item name="name"><Input placeholder="编组名称" /></Form.Item>
              </SearchForm>
              <PageTable rowKey="id" columns={grpColumns} dataSource={ensureArray(grpData?.records)} loading={grpLoading}
                total={grpData?.total || 0} pagination={{ current: grpPagination.current, pageSize: grpPagination.pageSize }}
                onChange={grpOnChange}
                toolbar={<PermissionGuard perm="device:add"><Button type="primary" icon={<PlusOutlined />}
                  onClick={() => { setGrpEditId(null); setGrpRecord(null); setGrpModalOpen(true) }}>新增编组</Button></PermissionGuard>} />
              <ModalForm open={grpModalOpen} title={grpEditId ? '编辑编组' : '新增编组'} width={720} formInstance={grpForm}
                onCancel={() => { setGrpModalOpen(false); setGrpEditId(null); setGrpRecord(null); grpForm.resetFields() }}
                loading={grpSave.isPending}>
                <DeviceGroupForm id={grpEditId} record={grpRecord} formInstance={grpForm} onFinish={(v) => grpSave.mutate({ ...v, id: grpEditId || undefined })} />
              </ModalForm>
              <DeviceGroupItemModal open={itemModalOpen} groupId={itemGroupId} groupName={itemGroupName}
                onClose={() => { setItemModalOpen(false); queryClient.invalidateQueries({ queryKey: ['deviceGroups'] }) }} />
            </>
          ),
        },
      ]} />
    </PageContainer>
  )
}
