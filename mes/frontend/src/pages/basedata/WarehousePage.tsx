import { useState, useEffect } from 'react'
import { Form, Button, Input, InputNumber, Select, Tag, Popconfirm, message, Space, Table } from 'antd'
import { PlusOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageContainer from '@/components/PageContainer'
import { ensureArray } from '@/utils/ensureArray'
import SearchForm from '@/components/SearchForm'
import PageTable from '@/components/PageTable'
import ModalForm from '@/components/ModalForm'
import PermissionGuard from '@/components/PermissionGuard'
import { usePagination } from '@/hooks/usePagination'
import * as whApi from '@/api/basedata/warehouse'
import type { SpWarehouse, SpWarehouseLocation } from '@/types/warehouse'

const statusMap: Record<string, { text: string; color: string }> = {
  '0': { text: '正常', color: 'green' },
  '1': { text: '已删除', color: 'red' },
  '2': { text: '已禁用', color: 'orange' },
}

const WH_TYPES = ['零件库', '产品库']

export default function WarehousePage() {
  const queryClient = useQueryClient()
  const { pagination, onChange, reset } = usePagination()
  const [filters, setFilters] = useState<Record<string, unknown>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editRecord, setEditRecord] = useState<SpWarehouse | null>(null)
  const [form] = Form.useForm()
  const [selectedWh, setSelectedWh] = useState<SpWarehouse | null>(null)
  const [locations, setLocations] = useState<SpWarehouseLocation[]>([])

  useEffect(() => {
    if (editId && editRecord) {
      form.setFieldsValue(editRecord)
    }
  }, [editId, editRecord, form])

  const { data, isLoading } = useQuery({
    queryKey: ['warehouses', pagination, filters],
    queryFn: () => whApi.page({ current: pagination.current, size: pagination.pageSize, ...filters }),
  })

  const saveMutation = useMutation({
    mutationFn: (v: Partial<SpWarehouse>) => whApi.addOrUpdate(v),
    onSuccess: () => {
      message.success('操作成功')
      setModalOpen(false)
      setEditId(null)
      setEditRecord(null)
      form.resetFields()
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (r: SpWarehouse) => whApi.deleteById(r.id),
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
    },
  })

  const [locLoading, setLocLoading] = useState(false)

  const handleSelect = async (record: SpWarehouse) => {
    setSelectedWh(record)
    setLocLoading(true)
    setLocations([])
    try {
      const locs = await whApi.getLocations(record.id)
      setLocations(Array.isArray(locs) ? locs : [])
    } catch {
      setLocations([])
    } finally {
      setLocLoading(false)
    }
  }

  const columns = [
    { title: '库房编码', dataIndex: 'code', key: 'code' },
    { title: '库房名称', dataIndex: 'name', key: 'name' },
    { title: '库房类型', dataIndex: 'type', key: 'type', render: (v: string) => v || '-' },
    {
      title: '规格', key: 'spec',
      render: (_: any, r: SpWarehouse) =>
        `${r.groups || 1}组 x ${r.rows || 1}排 x ${r.layers || 1}层 x ${r.columns || 1}列`,
    },
    {
      title: '库位数', key: 'locCount',
      render: (_: any, r: SpWarehouse) =>
        (r.groups || 1) * (r.rows || 1) * (r.layers || 1) * (r.columns || 1),
    },
    {
      title: '状态', dataIndex: 'deleted', key: 'deleted',
      render: (v: string) => {
        const s = statusMap[v] || { text: v, color: 'default' }
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    { title: '创建时间', dataIndex: 'createTime', key: 'createTime' },
    {
      title: '操作', key: 'action',
      render: (_: any, r: SpWarehouse) => (
        <Space>
          <Button type="link" size="small"
            onClick={() => { setEditId(r.id); setEditRecord(r); setModalOpen(true) }}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => deleteMutation.mutate(r)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const locColumns = [
    { title: '库位编码', dataIndex: 'code', key: 'code' },
    { title: '组', dataIndex: 'groupNo', key: 'groupNo' },
    { title: '排', dataIndex: 'rowNo', key: 'rowNo' },
    { title: '层', dataIndex: 'layerNo', key: 'layerNo' },
    { title: '列', dataIndex: 'colNo', key: 'colNo' },
  ]

  return (
    <PageContainer>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 2 }}>
          <SearchForm
            onSearch={(v) => { setFilters(v); reset() }}
            onReset={() => { setFilters({}); reset() }}
            loading={isLoading}
          >
            <Form.Item name="code"><Input placeholder="库房编码" /></Form.Item>
            <Form.Item name="name"><Input placeholder="库房名称" /></Form.Item>
          </SearchForm>
          <PageTable
            rowKey="id"
            columns={columns}
            dataSource={ensureArray(data?.records)}
            loading={isLoading}
            total={data?.total || 0}
            pagination={{ current: pagination.current, pageSize: pagination.pageSize }}
            onChange={onChange}
            onRow={(r: SpWarehouse) => ({
              onClick: () => handleSelect(r),
              style: {
                cursor: 'pointer',
                background: selectedWh?.id === r.id ? '#e6f7ff' : undefined,
              },
            })}
            toolbar={
              <PermissionGuard perm="warehouse:add">
                <Button type="primary" icon={<PlusOutlined />}
                  onClick={() => { form.resetFields(); setEditId(null); setEditRecord(null); setModalOpen(true) }}>新增库房</Button>
              </PermissionGuard>
            }
          />
          <ModalForm
            open={modalOpen}
            title={editId ? '编辑库房' : '新增库房'}
            formInstance={form}
            onCancel={() => { setModalOpen(false); setEditId(null); setEditRecord(null); form.resetFields() }}
            loading={saveMutation.isPending}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={(v) => saveMutation.mutate({ ...v, id: editId || undefined })}
              initialValues={{ deleted: '0', groups: 1, rows: 1, layers: 1, columns: 1 }}
            >
              <Form.Item name="code" label="库房编码" rules={[{ required: true }]}>
                <Input placeholder="请输入" />
              </Form.Item>
              <Form.Item name="name" label="库房名称" rules={[{ required: true }]}>
                <Input placeholder="请输入" />
              </Form.Item>
              <Form.Item name="type" label="库房类型" rules={[{ required: true }]}>
                <Select options={WH_TYPES.map(t => ({ label: t, value: t }))} />
              </Form.Item>
              <Form.Item label="库房规格">
                <Space>
                  <Form.Item name="groups" noStyle>
                    <InputNumber min={1} placeholder="组" style={{ width: 70 }} />
                  </Form.Item><span>组</span>
                  <Form.Item name="rows" noStyle>
                    <InputNumber min={1} placeholder="排" style={{ width: 70 }} />
                  </Form.Item><span>排</span>
                  <Form.Item name="layers" noStyle>
                    <InputNumber min={1} placeholder="层" style={{ width: 70 }} />
                  </Form.Item><span>层</span>
                  <Form.Item name="columns" noStyle>
                    <InputNumber min={1} placeholder="列" style={{ width: 70 }} />
                  </Form.Item><span>列</span>
                </Space>
              </Form.Item>
              <Form.Item name="descr" label="备注">
                <Input.TextArea rows={2} />
              </Form.Item>
              <Form.Item name="deleted" label="状态" rules={[{ required: true }]}>
                <Select
                  options={[
                    { label: '正常', value: '0' },
                    { label: '已删除', value: '1' },
                    { label: '已禁用', value: '2' },
                  ]}
                />
              </Form.Item>
            </Form>
          </ModalForm>
        </div>

        <div style={{ flex: 1, border: '1px solid #f0f0f0', borderRadius: 8, padding: 16, minWidth: 350 }}>
          <h3><EnvironmentOutlined style={{ marginRight: 8 }} />库位管理</h3>
          {selectedWh ? (
            <>
              <p>库房: <strong>{selectedWh.name}</strong> ({selectedWh.code})</p>
              <p>规格: {selectedWh.groups || 1}组 x {selectedWh.rows || 1}排 x {selectedWh.layers || 1}层 x {selectedWh.columns || 1}列 = {locations.length} 个库位</p>
              <Table rowKey="id" size="small" columns={locColumns} dataSource={locations} loading={locLoading} pagination={{ pageSize: 20 }} />
            </>
          ) : (
            <p style={{ color: '#999' }}>请点击左侧库房查看库位</p>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
