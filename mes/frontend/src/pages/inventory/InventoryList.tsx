import { useState } from 'react'
import { Table, Tag, Form, Input, DatePicker } from 'antd'
import { useQuery } from '@tanstack/react-query'
import type { Dayjs } from 'dayjs'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import { usePagination } from '@/hooks/usePagination'
import * as inventoryApi from '@/api/inventory/inventory'
import { INVENTORY_STATUS_MAP } from '@/types/inventory'

const { RangePicker } = DatePicker

export default function InventoryList() {
  const { pagination, onChange, reset } = usePagination()
  const [filters, setFilters] = useState<Record<string, unknown>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', pagination, filters],
    queryFn: () =>
      inventoryApi.pageInventory({
        current: pagination.current,
        size: pagination.pageSize,
        ...filters,
      }),
  })

  const handleSearch = (values: Record<string, unknown>) => {
    const range = values.dateRange as [Dayjs, Dayjs] | undefined
    setFilters({
      materialCode: values.materialCode,
      startDate: range?.[0]?.format('YYYY-MM-DD'),
      endDate: range?.[1]?.format('YYYY-MM-DD'),
    })
    reset()
  }
  const handleReset = () => {
    setFilters({})
    reset()
  }

  const columns = [
    { title: '物料编码', dataIndex: 'materialCode', key: 'materialCode' },
    { title: '描述', dataIndex: 'materialDesc', key: 'materialDesc', ellipsis: true },
    { title: '单位', dataIndex: 'unit', key: 'unit', width: 60 },
    { title: '库房', dataIndex: 'warehouseName', key: 'warehouseName' },
    { title: '库位', dataIndex: 'locationCode', key: 'locationCode' },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 90 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (val: string) => {
        const s = INVENTORY_STATUS_MAP[val] || { text: val, color: 'default' }
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    { title: '最近入库时间', dataIndex: 'lastInboundTime', key: 'lastInboundTime', width: 170 },
  ]

  return (
    <PageContainer title="库存明细查询">
      <SearchForm onSearch={handleSearch} onReset={handleReset} loading={isLoading}>
        <Form.Item name="materialCode">
          <Input placeholder="物料编码" allowClear style={{ width: 180 }} />
        </Form.Item>
        <Form.Item name="dateRange" label="登账日期">
          <RangePicker />
        </Form.Item>
      </SearchForm>

      <Table
        rowKey="id"
        columns={columns}
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
    </PageContainer>
  )
}
