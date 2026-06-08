import { useEffect } from 'react'
import { Form, Input, Radio, Select } from 'antd'
import type { FormInstance } from 'antd/es/form'
import type { SpDevice } from '@/types/device'

interface DeviceFormProps {
  id?: string | null
  record?: SpDevice | null
  onFinish?: (values: any) => void
  formInstance: FormInstance
}

const STATUS_OPTIONS = [
  { label: '空闲', value: '0' },
  { label: '运行中', value: '1' },
  { label: '维修中', value: '2' },
  { label: '报废', value: '3' },
]

function DeviceForm({ id, record, onFinish, formInstance }: DeviceFormProps) {
  useEffect(() => {
    if (id && record) {
      formInstance.setFieldsValue(record)
    } else if (!id) {
      formInstance.resetFields()
    }
  }, [id, record, formInstance])

  return (
    <Form form={formInstance} layout="vertical" onFinish={onFinish}
      initialValues={{ deleted: '0', status: '0' }}>
      <div style={{ display: 'flex', gap: 24 }}>
        {/* Left column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Form.Item name="code" label="设备编号" rules={[{ required: true, message: '请输入设备编号' }]}>
            <Input placeholder="请输入设备编号" />
          </Form.Item>
          <Form.Item name="name" label="设备名称" rules={[{ required: true, message: '请输入设备名称' }]}>
            <Input placeholder="请输入设备名称" />
          </Form.Item>
          <Form.Item name="type" label="设备类型">
            <Input placeholder="请输入设备类型" />
          </Form.Item>
          <Form.Item name="model" label="设备型号">
            <Input placeholder="请输入设备型号" />
          </Form.Item>
          <Form.Item name="location" label="位置">
            <Input placeholder="请输入位置" />
          </Form.Item>
        </div>
        {/* Right column */}
        <div style={{ flex: 1, minWidth: 0, borderLeft: '1px solid #f0f0f0', paddingLeft: 24 }}>
          <Form.Item name="specs" label="规格参数">
            <Input.TextArea rows={2} placeholder="请输入规格参数" />
          </Form.Item>
          <Form.Item name="status" label="运行状态">
            <Select options={STATUS_OPTIONS} />
          </Form.Item>
          <Form.Item name="descr" label="备注">
            <Input.TextArea rows={2} placeholder="请输入备注" />
          </Form.Item>
          <Form.Item name="deleted" label="数据状态" rules={[{ required: true }]}>
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

export default DeviceForm
