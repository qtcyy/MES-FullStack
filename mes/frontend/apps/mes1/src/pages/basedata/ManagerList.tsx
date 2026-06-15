import { useState } from 'react'
import { Form, Button, Input, Tag, Popconfirm, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageContainer from '@/components/PageContainer'
import { ensureArray } from '@/utils/ensureArray'
import SearchForm from '@/components/SearchForm'
import PageTable from '@/components/PageTable'
import ModalForm from '@/components/ModalForm'
import PermissionGuard from '@/components/PermissionGuard'
import { usePagination } from '@/hooks/usePagination'
import * as managerApi from '@/api/basedata/manager'
import ManagerForm from './ManagerForm'
import type { Manager } from '@/types/common'

const statusMap: Record<string, { text: string; color: string }> = {
  '0': { text: '正常', color: 'green' },
  '1': { text: '已删除', color: 'red' },
}

export default function ManagerList() {
  const queryClient = useQueryClient()
  const { pagination, onChange, reset } = usePagination()
  const [filters, setFilters] = useState<Record<string, unknown>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formInstance] = Form.useForm()

  const { data, isLoading } = useQuery({
    queryKey: ['managers', pagination, filters],
    queryFn: () =>
      managerApi.page({
        current: pagination.current,
        size: pagination.pageSize,
        ...filters,
      }),
  })

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => managerApi.addOrUpdate(values),
    onSuccess: () => {
      message.success('操作成功')
      setModalOpen(false)
      setEditId(null)
      formInstance.resetFields()
      queryClient.invalidateQueries({ queryKey: ['managers'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => managerApi.deleteById(id),
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['managers'] })
    },
  })

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
    setModalOpen(true)
  }

  const handleEdit = (record: Manager) => {
    setEditId(record.id)
    setModalOpen(true)
  }

  const handleDelete = (record: Manager) => {
    deleteMutation.mutate(record.id)
  }

  const handleModalCancel = () => {
    setModalOpen(false)
    setEditId(null)
  }

  const handleFormFinish = (values: Record<string, unknown>) => {
    // Convert Form.List items array to JSON string for fields
    const formData = { ...values }
    if (formData.fields && Array.isArray(formData.fields)) {
      formData.fields = JSON.stringify(formData.fields)
    }
    saveMutation.mutate({
      ...formData,
      id: editId || undefined,
    })
  }

  const columns = [
    {
      title: '表名',
      dataIndex: 'tableName',
      key: 'tableName',
    },
    {
      title: '表说明',
      dataIndex: 'tableDesc',
      key: 'tableDesc',
    },
    {
      title: '权限标识',
      dataIndex: 'permission',
      key: 'permission',
    },
    {
      title: '状态',
      dataIndex: 'deleted',
      key: 'deleted',
      render: (val: string) => {
        const s = statusMap[val] || { text: val, color: 'default' }
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Manager) => (
        <span>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定要删除该表管理吗？" onConfirm={() => handleDelete(record)}>
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
        <Form.Item name="tableName">
          <Input placeholder="表名" />
        </Form.Item>
        <Form.Item name="tableDesc">
          <Input placeholder="表说明" />
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
        toolbar={
          <PermissionGuard perm="manager:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增
            </Button>
          </PermissionGuard>
        }
      />

      <ModalForm
        open={modalOpen}
        title={editId ? '编辑表管理' : '新增表管理'}
        formInstance={formInstance}
        onCancel={handleModalCancel}
        loading={saveMutation.isPending}
      >
        <ManagerForm
          id={editId}
          formInstance={formInstance}
          onFinish={handleFormFinish}
        />
      </ModalForm>
    </PageContainer>
  )
}
