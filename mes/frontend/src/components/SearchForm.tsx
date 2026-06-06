import { Form, Button, Space } from 'antd'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'

interface SearchFormProps {
  onSearch: (values: Record<string, unknown>) => void
  onReset?: () => void
  loading?: boolean
  children: ReactNode
}

function SearchForm({ onSearch, onReset, loading, children }: SearchFormProps) {
  const [form] = Form.useForm()

  const handleSearch = () => {
    const values = form.getFieldsValue()
    onSearch(values)
  }

  const handleReset = () => {
    form.resetFields()
    onReset?.()
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <Form form={form} layout="inline">
        {children}

        <Form.Item>
          <Space>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              loading={loading}
              onClick={handleSearch}
            >
              搜索
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              重置
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  )
}

export default SearchForm
