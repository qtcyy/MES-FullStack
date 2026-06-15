import { useState, useEffect } from 'react'
import { Table, Tag, Button, Drawer, Modal, Form, Select, Input, message, Descriptions } from 'antd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import PermissionGuard from '@/components/PermissionGuard'
import { usePagination } from '@/hooks/usePagination'
import * as receiptApi from '@/api/inventory/receipt'
import * as warehouseApi from '@/api/basedata/warehouse'
import type { WarehouseReceipt, WarehouseReceiptItem, PostItemDTO } from '@/types/inventory'
import type { SpWarehouse, SpWarehouseLocation } from '@/types/warehouse'
import { RECEIPT_STATUS_MAP, ITEM_STATUS_MAP } from '@/types/inventory'

export default function ReceiptList() {
  const queryClient = useQueryClient()
  const { pagination, onChange, reset } = usePagination()
  const [filters, setFilters] = useState<Record<string, unknown>>({})

  // 明细抽屉
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeReceipt, setActiveReceipt] = useState<WarehouseReceipt | null>(null)

  // 登账弹窗
  const [postOpen, setPostOpen] = useState(false)
  const [activeItem, setActiveItem] = useState<WarehouseReceiptItem | null>(null)
  const [warehouses, setWarehouses] = useState<SpWarehouse[]>([])
  const [locations, setLocations] = useState<SpWarehouseLocation[]>([])
  const [postForm] = Form.useForm()

  const { data, isLoading } = useQuery({
    queryKey: ['receipts', pagination, filters],
    queryFn: () =>
      receiptApi.pageReceipts({
        current: pagination.current,
        size: pagination.pageSize,
        ...filters,
      }),
  })

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['receipt-items', activeReceipt?.id],
    queryFn: () => receiptApi.getItems(activeReceipt!.id),
    enabled: !!activeReceipt,
  })

  // 打开登账弹窗时加载零件库
  useEffect(() => {
    if (postOpen) {
      warehouseApi
        .getList()
        .then((list) => setWarehouses(list.filter((w) => w.type === '零件库' && w.deleted === '0')))
        .catch((err) => message.error('加载库房失败: ' + (err as Error).message))
    }
  }, [postOpen])

  const postMutation = useMutation({
    mutationFn: (dto: PostItemDTO) => receiptApi.postItem(dto),
    onSuccess: () => {
      message.success('入库登账成功')
      setPostOpen(false)
      postForm.resetFields()
      setLocations([])
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
    },
    onError: (e: Error) => message.error(e.message || '登账失败'),
  })

  const handleSearch = (values: Record<string, unknown>) => {
    setFilters(values)
    reset()
  }
  const handleReset = () => {
    setFilters({})
    reset()
  }

  const openDrawer = (r: WarehouseReceipt) => {
    setActiveReceipt(r)
    setDrawerOpen(true)
  }

  const openPost = (item: WarehouseReceiptItem) => {
    setActiveItem(item)
    postForm.resetFields()
    setLocations([])
    setPostOpen(true)
  }

  const handleWarehouseChange = (warehouseId: string) => {
    postForm.setFieldValue('locationId', undefined)
    warehouseApi
      .getLocations(warehouseId)
      .then(setLocations)
      .catch((err) => message.error('加载库位失败: ' + (err as Error).message))
  }

  const handlePostOk = () => {
    postForm.validateFields().then((values) => {
      const receiptId = activeReceipt?.id
      postMutation.mutate(
        {
          itemId: activeItem!.id,
          warehouseId: values.warehouseId,
          locationId: values.locationId,
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['receipt-items', receiptId] })
          },
        },
      )
    })
  }

  const receiptColumns = [
    {
      title: '入库单号',
      dataIndex: 'receiptCode',
      key: 'receiptCode',
      render: (val: string) => (
        <span style={{ fontFamily: "'SF Mono', Monaco, monospace", fontWeight: 600 }}>{val}</span>
      ),
    },
    {
      title: '来源',
      dataIndex: 'sourceType',
      key: 'sourceType',
      width: 90,
      render: (val: string) => (val === 'MRP' ? 'MRP下发' : '手工'),
    },
    { title: '工单', dataIndex: 'orderCode', key: 'orderCode' },
    { title: '产品', dataIndex: 'productDesc', key: 'productDesc', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'receiptStatus',
      key: 'receiptStatus',
      width: 110,
      render: (val: string) => {
        const s = RECEIPT_STATUS_MAP[val] || RECEIPT_STATUS_MAP.pending
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '进度',
      key: 'progress',
      width: 90,
      render: (_: unknown, r: WarehouseReceipt) => `${r.postedItems ?? 0}/${r.totalItems ?? 0}`,
    },
    { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, r: WarehouseReceipt) => (
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
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80 },
    {
      title: '库房',
      dataIndex: 'warehouseName',
      key: 'warehouseName',
      render: (val: string | null) => val || '-',
    },
    {
      title: '库位',
      dataIndex: 'locationCode',
      key: 'locationCode',
      render: (val: string | null) => val || '-',
    },
    {
      title: '状态',
      dataIndex: 'postStatus',
      key: 'postStatus',
      width: 100,
      render: (val: string) => {
        const s = ITEM_STATUS_MAP[val] || ITEM_STATUS_MAP.pending
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, item: WarehouseReceiptItem) => (
        <PermissionGuard perm="inventory:inbound">
          <Button
            type="primary"
            size="small"
            disabled={item.postStatus === 'posted'}
            onClick={() => openPost(item)}
          >
            入库登账
          </Button>
        </PermissionGuard>
      ),
    },
  ]

  return (
    <PageContainer title="计划入库确认">
      <SearchForm onSearch={handleSearch} onReset={handleReset} loading={isLoading}>
        <Form.Item name="receiptCode">
          <Input placeholder="输入入库单号查询" allowClear style={{ width: 240 }} />
        </Form.Item>
      </SearchForm>

      <Table
        rowKey="id"
        columns={receiptColumns}
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
        title={`入库单明细 — ${activeReceipt?.receiptCode ?? ''}`}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setActiveReceipt(null)
        }}
        width={900}
        destroyOnClose
      >
        {activeReceipt && (
          <Descriptions size="small" column={2} bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label="入库单号">{activeReceipt.receiptCode}</Descriptions.Item>
            <Descriptions.Item label="产品">{activeReceipt.productDesc}</Descriptions.Item>
            <Descriptions.Item label="工单">{activeReceipt.orderCode}</Descriptions.Item>
            <Descriptions.Item label="进度">
              {activeReceipt.postedItems ?? 0}/{activeReceipt.totalItems ?? 0}
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

      <Modal
        title="入库登账"
        open={postOpen}
        onOk={handlePostOk}
        onCancel={() => {
          setPostOpen(false)
          postForm.resetFields()
          setLocations([])
        }}
        confirmLoading={postMutation.isPending}
        okText="确认登账"
        cancelText="取消"
        destroyOnClose
      >
        <div
          style={{
            background: '#f0f5ff',
            border: '1px solid #d6e4ff',
            borderRadius: 6,
            padding: '10px 14px',
            marginBottom: 20,
            fontSize: 13,
          }}
        >
          物料：<strong>{activeItem?.materialCode}</strong> {activeItem?.materialDesc} ·
          数量 <strong>{activeItem?.quantity}</strong> {activeItem?.unit}
        </div>
        <Form form={postForm} layout="vertical">
          <Form.Item name="warehouseId" label="库房" rules={[{ required: true, message: '请选择库房' }]}>
            <Select
              placeholder="选择零件库(如电脑配件库)"
              onChange={handleWarehouseChange}
              options={warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))}
            />
          </Form.Item>
          <Form.Item name="locationId" label="库位" rules={[{ required: true, message: '请选择库位' }]}>
            <Select
              placeholder={locations.length === 0 ? '请先选择库房' : '选择库位'}
              disabled={locations.length === 0}
              options={locations.map((l) => ({ value: l.id, label: l.code }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
