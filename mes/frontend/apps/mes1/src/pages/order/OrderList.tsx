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
import * as productionApi from '@/api/order/production'
import OrderForm from './OrderForm'
import type { ProductionOrder } from '@/types/common'

const orderTypeMap: Record<string, { text: string; color: string }> = {
  P: { text: '批量', color: 'blue' },
  A: { text: '验证', color: 'orange' },
  F: { text: '返工', color: 'red' },
}

const statueMap: Record<string, { text: string; color: string }> = {
  '1': { text: '已创建', color: 'default' },
  '2': { text: '进行中', color: 'processing' },
  '3': { text: '已完成', color: 'success' },
  '4': { text: '已终止', color: 'error' },
}

export default function OrderList() {
  const queryClient = useQueryClient()
  const { pagination, onChange, reset } = usePagination()
  const [filters, setFilters] = useState<Record<string, unknown>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formInstance] = Form.useForm()

  const { data, isLoading } = useQuery({
    queryKey: ['orders', pagination, filters],
    queryFn: () =>
      productionApi.page({
        current: pagination.current,
        size: pagination.pageSize,
        ...filters,
      }),
  })

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => productionApi.addOrUpdate(values),
    onSuccess: () => {
      message.success('操作成功')
      setModalOpen(false)
      setEditId(null)
      formInstance.resetFields()
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productionApi.deleteById(id),
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
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

  const handleEdit = (record: ProductionOrder) => {
    setEditId(record.id)
    setModalOpen(true)
  }

  const handleDelete = (record: ProductionOrder) => {
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
      title: '工单编码',
      dataIndex: 'orderCode',
      key: 'orderCode',
    },
    {
      title: '描述',
      dataIndex: 'orderDescription',
      key: 'orderDescription',
      ellipsis: true,
    },
    {
      title: '数量',
      dataIndex: 'qty',
      key: 'qty',
    },
    {
      title: '类型',
      dataIndex: 'orderType',
      key: 'orderType',
      render: (val: string) => {
        const t = orderTypeMap[val] || { text: val, color: 'default' }
        return <Tag color={t.color}>{t.text}</Tag>
      },
    },
    {
      title: '物料',
      dataIndex: 'materiel',
      key: 'materiel',
    },
    {
      title: '物料描述',
      dataIndex: 'materielDesc',
      key: 'materielDesc',
    },
    {
      title: '计划开始',
      dataIndex: 'planStartTime',
      key: 'planStartTime',
    },
    {
      title: '计划结束',
      dataIndex: 'planEndTime',
      key: 'planEndTime',
    },
    {
      title: '状态',
      dataIndex: 'statue',
      key: 'statue',
      render: (val: string) => {
        const s = statueMap[val] || { text: val, color: 'default' }
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: ProductionOrder) => (
        <span>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定要删除该工单吗？" onConfirm={() => handleDelete(record)}>
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
        <Form.Item name="orderCode">
          <Input placeholder="工单编码" />
        </Form.Item>
        <Form.Item name="materiel">
          <Input placeholder="物料编码" />
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
          <PermissionGuard perm="order:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增
            </Button>
          </PermissionGuard>
        }
      />

      <ModalForm
        open={modalOpen}
        title={editId ? '编辑工单' : '新增工单'}
        formInstance={formInstance}
        onCancel={handleModalCancel}
        loading={saveMutation.isPending}
      >
        <OrderForm
          id={editId}
          formInstance={formInstance}
          onFinish={handleFormFinish}
        />
      </ModalForm>
    </PageContainer>
  )
}
