import { useState } from 'react'
import { Table, Tag, Button, Drawer, Popconfirm, Form, Input, message, Descriptions } from 'antd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import PermissionGuard from '@/components/PermissionGuard'
import { usePagination } from '@/hooks/usePagination'
import * as outboundApi from '@/api/inventory/outbound'
import type { OutboundOrder, OutboundOrderItem } from '@/types/outbound'
import { OUTBOUND_STATUS_MAP, OUTBOUND_ITEM_STATUS_MAP } from '@/types/outbound'

export default function OutboundList() {
  const queryClient = useQueryClient()
  const { pagination, onChange, reset } = usePagination()
  const [filters, setFilters] = useState<Record<string, unknown>>({})
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeOutbound, setActiveOutbound] = useState<OutboundOrder | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['outbounds', pagination, filters],
    queryFn: () =>
      outboundApi.pageOutbounds({
        current: pagination.current,
        size: pagination.pageSize,
        ...filters,
      }),
  })

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['outbound-items', activeOutbound?.id],
    queryFn: () => outboundApi.getItems(activeOutbound!.id),
    enabled: !!activeOutbound,
  })

  const postMutation = useMutation({
    mutationFn: (itemId: string) => outboundApi.postOutboundItem(itemId),
    onSuccess: () => {
      message.success('出库登账成功')
      queryClient.invalidateQueries({ queryKey: ['outbounds'] })
    },
    onError: (e: Error) => message.error(e.message || '出库登账失败'),
  })

  const handleSearch = (values: Record<string, unknown>) => {
    setFilters(values)
    reset()
  }
  const handleReset = () => {
    setFilters({})
    reset()
  }

  const openDrawer = (r: OutboundOrder) => {
    setActiveOutbound(r)
    setDrawerOpen(true)
  }

  const handlePost = (item: OutboundOrderItem) => {
    const outboundId = activeOutbound?.id
    postMutation.mutate(item.id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['outbound-items', outboundId] })
      },
    })
  }

  const outboundColumns = [
    {
      title: '出库单号',
      dataIndex: 'outboundCode',
      key: 'outboundCode',
      render: (val: string) => (
        <span style={{ fontFamily: "'SF Mono', Monaco, monospace", fontWeight: 600 }}>{val}</span>
      ),
    },
    { title: '工单', dataIndex: 'orderCode', key: 'orderCode' },
    { title: '产品', dataIndex: 'productDesc', key: 'productDesc', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'outboundStatus',
      key: 'outboundStatus',
      width: 110,
      render: (val: string) => {
        const s = OUTBOUND_STATUS_MAP[val] || OUTBOUND_STATUS_MAP.pending
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '进度',
      key: 'progress',
      width: 90,
      render: (_: unknown, r: OutboundOrder) => `${r.postedItems ?? 0}/${r.totalItems ?? 0}`,
    },
    { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, r: OutboundOrder) => (
        <Button type="link" onClick={() => openDrawer(r)}>
          查看/登账
        </Button>
      ),
    },
  ]

  const itemColumns = [
    { title: '物料编码', dataIndex: 'materialCode', key: 'materialCode' },
    { title: '描述', dataIndex: 'materialDesc', key: 'materialDesc', ellipsis: true },
    { title: '单位', dataIndex: 'unit', key: 'unit', width: 60 },
    { title: '需出库数量', dataIndex: 'quantity', key: 'quantity', width: 100 },
    {
      title: '状态',
      dataIndex: 'postStatus',
      key: 'postStatus',
      width: 100,
      render: (val: string) => {
        const s = OUTBOUND_ITEM_STATUS_MAP[val] || OUTBOUND_ITEM_STATUS_MAP.pending
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: 'FIFO分配',
      dataIndex: 'allocationDetail',
      key: 'allocationDetail',
      render: (val: string | null) => val || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, item: OutboundOrderItem) => (
        <PermissionGuard perm="inventory:outbound">
          <Popconfirm
            title="确认出库登账?系统将按FIFO自动扣库"
            onConfirm={() => handlePost(item)}
            okText="确认"
            cancelText="取消"
            disabled={item.postStatus === 'posted'}
          >
            <Button type="primary" size="small" disabled={item.postStatus === 'posted'}>
              出库登账
            </Button>
          </Popconfirm>
        </PermissionGuard>
      ),
    },
  ]

  return (
    <PageContainer title="配套出库确认">
      <SearchForm onSearch={handleSearch} onReset={handleReset} loading={isLoading}>
        <Form.Item name="outboundCode">
          <Input placeholder="输入出库单号查询" allowClear style={{ width: 240 }} />
        </Form.Item>
      </SearchForm>

      <Table
        rowKey="id"
        columns={outboundColumns}
        dataSource={data?.records ?? []}
        loading={isLoading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: data?.total ?? 0,
          onChange: (page, pageSize) => onChange({ current: page, pageSize }),
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        size="middle"
      />

      <Drawer
        title={`出库单明细 — ${activeOutbound?.outboundCode ?? ''}`}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setActiveOutbound(null)
        }}
        width={900}
        destroyOnClose
      >
        {activeOutbound && (
          <Descriptions size="small" column={2} bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label="出库单号">{activeOutbound.outboundCode}</Descriptions.Item>
            <Descriptions.Item label="产品">{activeOutbound.productDesc}</Descriptions.Item>
            <Descriptions.Item label="工单">{activeOutbound.orderCode}</Descriptions.Item>
            <Descriptions.Item label="进度">
              {activeOutbound.postedItems ?? 0}/{activeOutbound.totalItems ?? 0}
            </Descriptions.Item>
          </Descriptions>
        )}
        <Table
          rowKey="id"
          columns={itemColumns}
          dataSource={items ?? []}
          loading={itemsLoading}
          pagination={false}
          size="small"
        />
      </Drawer>
    </PageContainer>
  )
}
