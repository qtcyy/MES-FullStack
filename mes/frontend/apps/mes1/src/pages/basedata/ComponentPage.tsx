import { useState, useEffect } from 'react'
import { Form, Button, Input, Tag, Popconfirm, message, Radio } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageContainer from '@/components/PageContainer'
import { ensureArray } from '@/utils/ensureArray'
import SearchForm from '@/components/SearchForm'
import PageTable from '@/components/PageTable'
import ModalForm from '@/components/ModalForm'
import PermissionGuard from '@/components/PermissionGuard'
import { usePagination } from '@/hooks/usePagination'
import * as componentApi from '@/api/basedata/component'
import type { SpComponent } from '@/types/component'

const deletedMap: Record<string, { text: string; color: string }> = {
  '0': { text: '正常', color: 'green' },
  '1': { text: '已删除', color: 'red' },
}

export default function ComponentPage() {
  const queryClient = useQueryClient()
  const { pagination, onChange, reset } = usePagination()
  const [filters, setFilters] = useState<Record<string, unknown>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<SpComponent | null>(null)
  const [formInstance] = Form.useForm()

  const { data, isLoading } = useQuery({
    queryKey: ['components', pagination, filters],
    queryFn: () =>
      componentApi.page({
        current: pagination.current,
        size: pagination.pageSize,
        ...filters,
      }),
  })

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => componentApi.addOrUpdate(values),
    onSuccess: () => {
      message.success('操作成功')
      setModalOpen(false)
      setEditId(null)
      formInstance.resetFields()
      queryClient.invalidateQueries({ queryKey: ['components'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => componentApi.deleteById(id),
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['components'] })
    },
  })

  // Populate form fields when opening the modal for editing
  useEffect(() => {
    if (modalOpen) {
      if (editId && selectedRecord) {
        formInstance.setFieldsValue(selectedRecord)
      } else {
        formInstance.resetFields()
      }
    }
  }, [modalOpen, editId, selectedRecord, formInstance])

  const handleSearch = (values: Record<string, unknown>) => {
    setFilters(values)
    reset()
  }

  const handleReset = () => {
    setFilters({})
    reset()
  }

  const handleAdd = () => {
    setEditId(null)
    setSelectedRecord(null)
    setModalOpen(true)
  }

  const handleEdit = (record: SpComponent) => {
    setEditId(record.id)
    setSelectedRecord(record)
    setModalOpen(true)
  }

  const handleDelete = (record: SpComponent) => {
    deleteMutation.mutate(record.id)
  }

  const handleModalCancel = () => {
    setModalOpen(false)
    setEditId(null)
  }

  const handleFormFinish = (values: Record<string, unknown>) => {
    saveMutation.mutate({
      ...values,
      id: editId || undefined,
    })
  }

  const columns = [
    {
      title: '组件编码',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '组件名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'descr',
      key: 'descr',
      render: (v: string) => v || '-',
    },
    {
      title: '状态',
      dataIndex: 'deleted',
      key: 'deleted',
      render: (val: string) => {
        const s = deletedMap[val] || { text: val, color: 'default' }
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      render: (v: string) => v || '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: SpComponent) => (
        <span>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定要删除该组件吗？" onConfirm={() => handleDelete(record)}>
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </span>
      ),
    },
  ]

  return (
    <PageContainer>
      <SearchForm onSearch={handleSearch} onReset={handleReset} loading={isLoading}>
        <Form.Item name="code">
          <Input placeholder="组件编码" />
        </Form.Item>
        <Form.Item name="name">
          <Input placeholder="组件名称" />
        </Form.Item>
        <Form.Item>
          <PermissionGuard perm="component:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增
            </Button>
          </PermissionGuard>
        </Form.Item>
      </SearchForm>

      <PageTable
        rowKey="id"
        columns={columns}
        dataSource={ensureArray(data?.records)}
        loading={isLoading}
        total={data?.total || 0}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
        }}
        onChange={onChange}
      />

      <ModalForm
        open={modalOpen}
        title={editId ? '编辑组件' : '新增组件'}
        width={600}
        formInstance={formInstance}
        onCancel={handleModalCancel}
        loading={saveMutation.isPending}
      >
        <Form
          form={formInstance}
          layout="vertical"
          onFinish={handleFormFinish}
          initialValues={{ deleted: '0' }}
        >
          <Form.Item
            name="code"
            label="组件编码"
            tooltip="由系统自动生成"
          >
            <Input placeholder="系统自动生成" disabled />
          </Form.Item>
          <Form.Item
            name="name"
            label="组件名称"
            rules={[{ required: true, message: '请输入组件名称' }]}
          >
            <Input placeholder="请输入组件名称" />
          </Form.Item>
          <Form.Item name="descr" label="描述">
            <Input.TextArea placeholder="请输入描述" rows={3} />
          </Form.Item>
          <Form.Item
            name="deleted"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Radio.Group>
              <Radio value="0">正常</Radio>
              <Radio value="1">已删除</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </ModalForm>
    </PageContainer>
  )
}
