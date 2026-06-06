import { Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { TableRowSelection } from 'antd/es/table/interface'
import type { ReactNode } from 'react'

interface PageTableProps<T> {
  columns: ColumnsType<T>
  dataSource: T[]
  loading: boolean
  total: number
  pagination: {
    current: number
    pageSize: number
  }
  onChange: (pagination: { current: number; pageSize: number }) => void
  rowKey?: string
  rowSelection?: TableRowSelection<T>
  toolbar?: ReactNode
  scroll?: { x?: number; y?: number }
}

function PageTable<T extends object>({
  columns,
  dataSource,
  loading,
  total,
  pagination,
  onChange,
  rowKey = 'id',
  rowSelection,
  toolbar,
  scroll,
}: PageTableProps<T>) {
  const paginationConfig = {
    current: pagination.current,
    pageSize: pagination.pageSize,
    total,
    showTotal: (totalItems: number) => `共 ${totalItems} 条`,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
  }

  return (
    <div>
      {toolbar && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
          }}
        >
          {toolbar}
        </div>
      )}

      <Table<T>
        rowKey={rowKey}
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        pagination={paginationConfig}
        onChange={(pag) => {
          if (pag.current && pag.pageSize) {
            onChange({ current: pag.current, pageSize: pag.pageSize })
          }
        }}
        rowSelection={rowSelection}
        scroll={scroll}
      />
    </div>
  )
}

export default PageTable
