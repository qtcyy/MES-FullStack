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
import * as dictApi from '@/api/system/dict'
import DictForm from './DictForm'
import type { SysDict } from '@/types/user'

const statusMap: Record<string, { text: string; color: string }> = {
  '0': { text: '正常', color: 'green' },
  '1': { text: '已删除', color: 'red' },
  '2': { text: '已禁用', color: 'orange' },
}

export default function DictList() {
  const queryClient = useQueryClient()
  const { pagination, onChange, reset } = usePagination()
  const [filters, setFilters] = useState<Record<string, unknown>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formInstance] = Form.useForm()

  // Fetch dict list
  const { data, isLoading } = useQuery({
    queryKey: ['dicts', pagination, filters],
    queryFn: () =>
      dictApi.page({
        current: pagination.current,
        size: pagination.pageSize,
        ...filters,
      }),
  })

  // Add / Edit mutation
  const saveMutation = useMutation({
    mutationFn: (values: SysDict) => dictApi.addOrUpdate(values),
    onSuccess: () => {
      message.success('操作成功')
      setModalOpen(false)
      setEditId(null)
      formInstance.resetFields()
      queryClient.invalidateQueries({ queryKey: ['dicts'] })
    },
  })

  // Delete mutation (soft delete via addOrUpdate)
  const deleteMutation = useMutation({
    mutationFn: (record: SysDict) =>
      dictApi.addOrUpdate({ ...record, deleted: '1' }),
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['dicts'] })
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

  const handleEdit = (record: SysDict) => {
    setEditId(record.id)
    setModalOpen(true)
  }

  const handleDelete = (record: SysDict) => {
    deleteMutation.mutate(record)
  }

  const handleModalCancel = () => {
    setModalOpen(false)
    setEditId(null)
  }

  const handleFormFinish = (values: Record<string, unknown>) => {
    saveMutation.mutate({
      ...values,
      id: editId || undefined,
    } as SysDict)
  }

  const columns = [
    {
      title: '字典名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '字典值',
      dataIndex: 'value',
      key: 'value',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '描述',
      dataIndex: 'descr',
      key: 'descr',
    },
    {
      title: '排序',
      dataIndex: 'sortNum',
      key: 'sortNum',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'deleted',
      key: 'deleted',
      width: 100,
      render: (val: string) => {
        const status = statusMap[val] || { text: val, color: 'default' }
        return <Tag color={status.color}>{status.text}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: unknown, record: SysDict) => (
        <span>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定要删除该字典吗？" onConfirm={() => handleDelete(record)}>
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
        <Form.Item name="name">
          <Input placeholder="字典名称" />
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
          <PermissionGuard perm="dict:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增
            </Button>
          </PermissionGuard>
        }
      />

      <ModalForm
        open={modalOpen}
        title={editId ? '编辑字典' : '新增字典'}
        formInstance={formInstance}
        onCancel={handleModalCancel}
        loading={saveMutation.isPending}
      >
        <DictForm
          id={editId}
          formInstance={formInstance}
          onFinish={handleFormFinish}
        />
      </ModalForm>
    </PageContainer>
  )
}
