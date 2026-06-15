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
import * as bomApi from '@/api/technology/bom'
import BomForm from './BomForm'
import type { Bom } from '@/types/common'

const stateMap: Record<string, { text: string; color: string }> = {
  '0': { text: '草稿', color: 'default' },
  '1': { text: '已发布', color: 'green' },
  '2': { text: '已作废', color: 'red' },
}

export default function BomList() {
  const queryClient = useQueryClient()
  const { pagination, onChange, reset } = usePagination()
  const [filters, setFilters] = useState<Record<string, unknown>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formInstance] = Form.useForm()

  const { data, isLoading } = useQuery({
    queryKey: ['boms', pagination, filters],
    queryFn: () =>
      bomApi.page({
        current: pagination.current,
        size: pagination.pageSize,
        ...filters,
      }),
  })

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => bomApi.addOrUpdate(values),
    onSuccess: () => {
      message.success('操作成功')
      setModalOpen(false)
      setEditId(null)
      formInstance.resetFields()
      queryClient.invalidateQueries({ queryKey: ['boms'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bomApi.deleteById(id),
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['boms'] })
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

  const handleEdit = (record: Bom) => {
    setEditId(record.id)
    setModalOpen(true)
  }

  const handleDelete = (record: Bom) => {
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
      title: 'BOM编码',
      dataIndex: 'bomCode',
      key: 'bomCode',
    },
    {
      title: '物料编码',
      dataIndex: 'materielCode',
      key: 'materielCode',
    },
    {
      title: '物料描述',
      dataIndex: 'materielDesc',
      key: 'materielDesc',
    },
    {
      title: '版本号',
      dataIndex: 'versionNumber',
      key: 'versionNumber',
    },
    {
      title: '状态',
      dataIndex: 'state',
      key: 'state',
      render: (val: string) => {
        const s = stateMap[val] || { text: val, color: 'default' }
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '工厂',
      dataIndex: 'factory',
      key: 'factory',
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Bom) => (
        <span>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定要删除该BOM吗？" onConfirm={() => handleDelete(record)}>
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
        <Form.Item name="materielCode">
          <Input placeholder="物料编码" />
        </Form.Item>
        <Form.Item name="materielCodeLike">
          <Input placeholder="物料编码(模糊)" />
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
          <PermissionGuard perm="bom:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增
            </Button>
          </PermissionGuard>
        }
      />

      <ModalForm
        open={modalOpen}
        title={editId ? '编辑BOM' : '新增BOM'}
        formInstance={formInstance}
        onCancel={handleModalCancel}
        loading={saveMutation.isPending}
      >
        <BomForm
          id={editId}
          formInstance={formInstance}
          onFinish={handleFormFinish}
        />
      </ModalForm>
    </PageContainer>
  )
}
