import { useState } from 'react'
import { Form, Button, Select, Popconfirm, message, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageContainer from '@/components/PageContainer'
import { ensureArray } from '@/utils/ensureArray'
import SearchForm from '@/components/SearchForm'
import PageTable from '@/components/PageTable'
import ModalForm from '@/components/ModalForm'
import PermissionGuard from '@/components/PermissionGuard'
import { usePagination } from '@/hooks/usePagination'
import * as flowApi from '@/api/technology/flow'
import FlowProcessForm from './FlowProcessForm'
import type { Flow } from '@/types/common'

export default function FlowProcessList() {
  const queryClient = useQueryClient()
  const { pagination, onChange, reset } = usePagination()
  const [filters, setFilters] = useState<Record<string, unknown>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formInstance] = Form.useForm()
  const [flowOptions, setFlowOptions] = useState<Flow[]>([])

  // Load flow list for search dropdown
  const { data: flowListData } = useQuery({
    queryKey: ['flowList'],
    queryFn: () => flowApi.flowList(),
  })

  // Load flow list when data is available
  useState(() => {
    if (flowListData) {
      setFlowOptions(Array.isArray(flowListData) ? flowListData : [])
    }
  })

  const { data, isLoading } = useQuery({
    queryKey: ['flowProcesses', pagination, filters],
    queryFn: () =>
      flowApi.page({
        current: pagination.current,
        size: pagination.pageSize,
        ...filters,
      }),
  })

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => flowApi.addOrUpdate(values),
    onSuccess: () => {
      message.success('操作成功')
      setModalOpen(false)
      setEditId(null)
      formInstance.resetFields()
      queryClient.invalidateQueries({ queryKey: ['flowProcesses'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => flowApi.deleteById(id),
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['flowProcesses'] })
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

  const handleEdit = (record: Flow) => {
    setEditId(record.id)
    setModalOpen(true)
  }

  const handleDelete = (record: Flow) => {
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
      title: '工艺编码',
      dataIndex: 'flow',
      key: 'flow',
    },
    {
      title: '工艺描述',
      dataIndex: 'flowDesc',
      key: 'flowDesc',
    },
    {
      title: '关联工序',
      dataIndex: 'process',
      key: 'process',
      render: (val: string) => {
        if (!val) return '-'
        const steps = val.split('→').filter(Boolean)
        return (
          <span>
            {steps.map((step, idx) => (
              <span key={idx}>
                <Tag color="blue">{step}</Tag>
                {idx < steps.length - 1 && <span style={{ margin: '0 4px' }}>→</span>}
              </span>
            ))}
          </span>
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Flow) => (
        <span>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定要删除该工艺工序关系吗？" onConfirm={() => handleDelete(record)}>
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
        <Form.Item name="flow">
          <Select placeholder="请选择工艺" allowClear style={{ width: 200 }}>
            {flowOptions.map((f) => (
              <Select.Option key={f.id} value={f.flow}>
                {f.flow} - {f.flowDesc}
              </Select.Option>
            ))}
          </Select>
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
          <PermissionGuard perm="flow:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增
            </Button>
          </PermissionGuard>
        }
      />

      <ModalForm
        open={modalOpen}
        title={editId ? '编辑工艺工序' : '新增工艺工序'}
        formInstance={formInstance}
        onCancel={handleModalCancel}
        loading={saveMutation.isPending}
        width={800}
      >
        <FlowProcessForm
          id={editId}
          formInstance={formInstance}
          onFinish={handleFormFinish}
        />
      </ModalForm>
    </PageContainer>
  )
}
