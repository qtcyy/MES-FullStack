import { useState, useCallback } from 'react'
import { Form, Input, Button, Table, Modal, Tag } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import type { ColumnsType } from 'antd/es/table'
import PageContainer from '@/components/PageContainer'
import { ensureArray } from '@/utils/ensureArray'
import SearchForm from '@/components/SearchForm'
import { usePagination } from '@/hooks/usePagination'
import * as managerApi from '@/api/basedata/manager'
import type { Manager } from '@/types/common'

const statusMap: Record<string, { text: string; color: string }> = {
  '0': { text: '正常', color: 'green' },
  '1': { text: '已删除', color: 'red' },
}

export default function ManagerItemList() {
  const { pagination, onChange, reset } = usePagination()
  const [filters, setFilters] = useState<Record<string, unknown>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null)
  const [modalPagination, setModalPagination] = useState({ current: 1, pageSize: 10 })
  const [modalData, setModalData] = useState<{ records: Record<string, string>[]; total: number }>({
    records: [],
    total: 0,
  })
  const [modalLoading, setModalLoading] = useState(false)

  // Fetch manager (table) list
  const { data, isLoading } = useQuery({
    queryKey: ['managers', pagination, filters],
    queryFn: () =>
      managerApi.page({
        current: pagination.current,
        size: pagination.pageSize,
        ...filters,
      }),
  })

  const handleSearch = (values: Record<string, unknown>) => {
    setFilters(values)
    reset()
  }

  const handleReset = () => {
    setFilters({})
    reset()
  }

  const handleViewData = (record: Manager) => {
    setSelectedManager(record)
    setModalPagination({ current: 1, pageSize: 10 })
    loadDynamicData(record, 1, 10)
    setModalOpen(true)
  }

  const loadDynamicData = useCallback(
    async (manager: Manager, current: number, size: number) => {
      setModalLoading(true)
      try {
        const res = await managerApi.commonPage({
          tableName: manager.tableName,
          tableNameId: manager.id,
          current,
          size,
        })
        setModalData({ records: res.records || [], total: res.total || 0 })
      } catch {
        setModalData({ records: [], total: 0 })
      } finally {
        setModalLoading(false)
      }
    },
    [],
  )

  const handleModalTableChange = (pag: { current: number; pageSize: number }) => {
    if (selectedManager) {
      setModalPagination({ current: pag.current, pageSize: pag.pageSize })
      loadDynamicData(selectedManager, pag.current, pag.pageSize)
    }
  }

  const handleModalCancel = () => {
    setModalOpen(false)
    setSelectedManager(null)
    setModalData({ records: [], total: 0 })
  }

  // Build dynamic columns from first record keys
  const dynamicColumns: ColumnsType<Record<string, string>> =
    modalData.records.length > 0
      ? Object.keys(modalData.records[0]).map((key) => ({
          title: key,
          dataIndex: key,
          key,
          ellipsis: true,
        }))
      : []

  const columns: ColumnsType<Manager> = [
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
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewData(record)}
        >
          查看数据
        </Button>
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

      <Table
        rowKey="id"
        columns={columns}
        dataSource={ensureArray(data?.records)}
        loading={isLoading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: data?.total || 0,
          showTotal: (totalItems: number) => `共 ${totalItems} 条`,
          showSizeChanger: true,
        }}
        onChange={(pag: any) => {
          if (pag.current && pag.pageSize) {
            onChange({ current: pag.current, pageSize: pag.pageSize })
          }
        }}
      />

      <Modal
        open={modalOpen}
        title={`数据查看 - ${selectedManager?.tableName || ''}`}
        width={960}
        onCancel={handleModalCancel}
        footer={null}
        destroyOnHidden
      >
        <Table
          rowKey={(_record, index) => index?.toString() || Math.random().toString()}
          columns={dynamicColumns}
          dataSource={modalData.records}
          loading={modalLoading}
          scroll={{ x: 'max-content' }}
          pagination={{
            current: modalPagination.current,
            pageSize: modalPagination.pageSize,
            total: modalData.total,
            showTotal: (totalItems: number) => `共 ${totalItems} 条`,
            showSizeChanger: true,
          }}
          onChange={(pag) => {
            if (pag.current && pag.pageSize) {
              handleModalTableChange({ current: pag.current, pageSize: pag.pageSize })
            }
          }}
        />
      </Modal>
    </PageContainer>
  )
}
