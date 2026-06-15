import { useEffect } from 'react'
import { Form, Input, Radio } from 'antd'
import type { FormInstance } from 'antd/es/form'
import type { SpDeviceGroup } from '@/types/device'

interface DeviceGroupFormProps {
  id?: string | null
  record?: SpDeviceGroup | null
  onFinish?: (values: any) => void
  formInstance: FormInstance
}

function DeviceGroupForm({ id, record, onFinish, formInstance }: DeviceGroupFormProps) {
  useEffect(() => {
    if (id && record) {
      formInstance.setFieldsValue(record)
    } else if (!id) {
      formInstance.resetFields()
    }
  }, [id, record, formInstance])

  return (
    <Form form={formInstance} layout="vertical" onFinish={onFinish}
      initialValues={{ deleted: '0' }}>
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Form.Item name="code" label="编组代码" rules={[{ required: true, message: '请输入编组代码' }]}>
            <Input placeholder="请输入编组代码" />
          </Form.Item>
          <Form.Item name="name" label="编组名称" rules={[{ required: true, message: '请输入编组名称' }]}>
            <Input placeholder="请输入编组名称" />
          </Form.Item>
        </div>
        <div style={{ flex: 1, minWidth: 0, borderLeft: '1px solid #f0f0f0', paddingLeft: 24 }}>
          <Form.Item name="descr" label="描述">
            <Input.TextArea rows={2} placeholder="请输入描述" />
          </Form.Item>
          <Form.Item name="deleted" label="状态" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio value="0">正常</Radio>
              <Radio value="1">已删除</Radio>
              <Radio value="2">已禁用</Radio>
            </Radio.Group>
          </Form.Item>
        </div>
      </div>
    </Form>
  )
}

export default DeviceGroupForm
