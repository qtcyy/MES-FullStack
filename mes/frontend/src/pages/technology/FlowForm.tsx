import { useEffect } from 'react'
import { Form, Input } from 'antd'
import type { FormInstance } from 'antd/es/form'
import * as flowApi from '@/api/technology/flow'

interface FlowFormProps {
  id?: string | null
  onFinish?: (values: any) => void
  formInstance: FormInstance
}

function FlowForm({ id, onFinish, formInstance }: FlowFormProps) {
  // Fetch flow data in edit mode
  useEffect(() => {
    if (id) {
      flowApi.getById(id).then((res: any) => {
        formInstance.setFieldsValue(res)
      })
    } else {
      formInstance.resetFields()
    }
  }, [id, formInstance])

  const handleFinish = (values: any) => {
    onFinish?.(values)
  }

  return (
    <Form
      form={formInstance}
      layout="vertical"
      onFinish={handleFinish}
    >
      <Form.Item
        name="flow"
        label="工艺编码"
        rules={[{ required: true, message: '请输入工艺编码' }]}
      >
        <Input placeholder="请输入工艺编码" />
      </Form.Item>

      <Form.Item
        name="flowDesc"
        label="工艺描述"
        rules={[{ required: true, message: '请输入工艺描述' }]}
      >
        <Input placeholder="请输入工艺描述" />
      </Form.Item>

      <Form.Item name="process" label="工序">
        <Input.TextArea
          rows={4}
          placeholder="请输入工序，多个工序用箭头分隔，如 A→B→C"
        />
      </Form.Item>
    </Form>
  )
}

export default FlowForm
