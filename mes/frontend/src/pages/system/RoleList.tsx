import { useState } from 'react'
import { Form, Button, Input, Tag, Popconfirm, message, Space } from 'antd'
import { PlusOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageContainer from '@/components/PageContainer'
import { ensureArray } from '@/utils/ensureArray'
import SearchForm from '@/components/SearchForm'
import PageTable from '@/components/PageTable'
import ModalForm from '@/components/ModalForm'
import PermissionGuard from '@/components/PermissionGuard'
import { usePagination } from '@/hooks/usePagination'
import * as roleApi from '@/api/system/role'
import RoleForm from './RoleForm'
import type { SysRole } from '@/types/user'

const statusMap: Record<string, { text: string; color: string }> = {
  '0': { text: '正常', color: 'green' },
  '1': { text: '已删除', color: 'red' },
  '2': { text: '已禁用', color: 'orange' },
}

export default function RoleList() {
  const queryClient = useQueryClient()
  const { pagination, onChange, reset } = usePagination()
  const [filters, setFilters] = useState<Record<string, unknown>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formInstance] = Form.useForm()

  // Fetch role list
  const { data, isLoading } = useQuery({
    queryKey: ['roles', pagination, filters],
    queryFn: () =>
      roleApi.page({
        current: pagination.current,
        size: pagination.pageSize,
        ...filters,
      }),
  })

  // Add / Edit mutation
  const saveMutation = useMutation({
    mutationFn: (values: SysRole & { sysMenuIds?: string[] }) =>
      roleApi.addOrUpdate(values),
    onSuccess: () => {
      message.success('操作成功')
      setModalOpen(false)
      setEditId(null)
      formInstance.resetFields()
      queryClient.invalidateQueries({ queryKey: ['roles'] })
    },
  })

  // Delete mutation (soft delete via addOrUpdate)
  const deleteMutation = useMutation({
    mutationFn: (record: SysRole) =>
      roleApi.addOrUpdate({ ...record, deleted: '1' }),
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['roles'] })
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
    formInstance.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (record: SysRole) => {
    setEditId(record.id)
    formInstance.resetFields()
    setModalOpen(true)
  }

  const handleAuthMenu = (record: SysRole) => {
    setEditId(record.id)
    formInstance.resetFields()
    setModalOpen(true)
  }

  const handleDelete = (record: SysRole) => {
    deleteMutation.mutate(record)
  }

  const handleModalCancel = () => {
    setModalOpen(false)
    setEditId(null)
    formInstance.resetFields()
  }

  const handleFormFinish = (values: Record<string, unknown>) => {
    saveMutation.mutate({
      ...values,
      id: editId || undefined,
    })
  }

  const columns = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '角色编码',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '描述',
      dataIndex: 'descr',
      key: 'descr',
    },
    {
      title: '系统角色',
      dataIndex: 'isSystem',
      key: 'isSystem',
      render: (val: string) =>
        val === '1' ? (
          <Tag color="blue">系统角色</Tag>
        ) : (
          <Tag color="default">普通角色</Tag>
        ),
    },
    {
      title: '状态',
      dataIndex: 'deleted',
      key: 'deleted',
      render: (val: string) => {
        const status = statusMap[val] || { text: val, color: 'default' }
        return <Tag color={status.color}>{status.text}</Tag>
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: SysRole) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<SafetyCertificateOutlined />}
            onClick={() => handleAuthMenu(record)}
          >
            授权菜单
          </Button>
          {record.isSystem !== '1' && (
            <Popconfirm title="确定要删除该角色吗？" onConfirm={() => handleDelete(record)}>
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <PageContainer>
      <SearchForm onSearch={handleSearch} onReset={handleReset} loading={isLoading}>
        <Form.Item name="name">
          <Input placeholder="角色名称" />
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
          <PermissionGuard perm="role:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增
            </Button>
          </PermissionGuard>
        }
      />

      <ModalForm
        open={modalOpen}
        title={editId ? '编辑角色' : '新增角色'}
        formInstance={formInstance}
        onCancel={handleModalCancel}
        loading={saveMutation.isPending}
      >
        <RoleForm
          id={editId}
          formInstance={formInstance}
          onFinish={handleFormFinish}
        />
      </ModalForm>
    </PageContainer>
  )
}
