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
import * as materileApi from '@/api/basedata/materile'
import MaterileForm from './MaterileForm'
import type { Materiel } from '@/types/common'

const deletedMap: Record<string, { text: string; color: string }> = {
  '0': { text: '正常', color: 'green' },
  '1': { text: '已删除', color: 'red' },
}

export default function MaterileList() {
  const queryClient = useQueryClient()
  const { pagination, onChange, reset } = usePagination()
  const [filters, setFilters] = useState<Record<string, unknown>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<Materiel | null>(null)
  const [formInstance] = Form.useForm()

  const { data, isLoading } = useQuery({
    queryKey: ['materiles', pagination, filters],
    queryFn: () =>
      materileApi.page({
        current: pagination.current,
        size: pagination.pageSize,
        ...filters,
      }),
  })

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => materileApi.addOrUpdate(values),
    onSuccess: () => {
      message.success('操作成功')
      setModalOpen(false)
      setEditId(null)
      formInstance.resetFields()
      queryClient.invalidateQueries({ queryKey: ['materiles'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (record: Materiel) =>
      materileApi.addOrUpdate({ ...record, deleted: '1' } as unknown as Record<string, unknown>),
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['materiles'] })
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
    setSelectedRecord(null)
    setModalOpen(true)
  }

  const handleEdit = (record: Materiel) => {
    setEditId(record.id)
    setSelectedRecord(record)
    setModalOpen(true)
  }

  const handleDelete = (record: Materiel) => {
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
      title: '物料编码',
      dataIndex: 'materiel',
      key: 'materiel',
    },
    {
      title: '物料描述',
      dataIndex: 'materielDesc',
      key: 'materielDesc',
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
    },
    {
      title: '产品组',
      dataIndex: 'productGroup',
      key: 'productGroup',
    },
    {
      title: '类型',
      dataIndex: 'matType',
      key: 'matType',
    },
    {
      title: '规格',
      dataIndex: 'size',
      key: 'size',
    },
    {
      title: '工艺',
      dataIndex: 'flowDesc',
      key: 'flowDesc',
    },
    {
      title: '型号',
      dataIndex: 'model',
      key: 'model',
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      render: (v: string) => v || '-',
    },
    {
      title: '图片',
      dataIndex: 'imageUrl',
      key: 'imageUrl',
      render: (v: string) =>
        v ? <img src={v} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} /> : '-',
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
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Materiel) => (
        <span>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定要删除该物料吗？" onConfirm={() => handleDelete(record)}>
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
        <Form.Item name="materiel">
          <Input placeholder="物料编码" />
        </Form.Item>
        <Form.Item name="materielDesc">
          <Input placeholder="物料描述" />
        </Form.Item>
        <Form.Item>
          <PermissionGuard perm="materile:add">
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
        title={editId ? '编辑物料' : '新增物料'}
        width={900}
        formInstance={formInstance}
        onCancel={handleModalCancel}
        loading={saveMutation.isPending}
      >
        <MaterileForm
          id={editId}
          record={selectedRecord}
          formInstance={formInstance}
          onFinish={handleFormFinish}
        />
      </ModalForm>
    </PageContainer>
  )
}
