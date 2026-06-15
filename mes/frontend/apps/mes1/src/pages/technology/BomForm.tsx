import { useEffect } from 'react'
import { Form, Input, InputNumber, Select } from 'antd'
import { MinusOutlined, PlusOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd/es/form'
import * as bomApi from '@/api/technology/bom'

interface BomFormProps {
  id?: string | null
  onFinish?: (values: any) => void
  formInstance: FormInstance
}

function BomForm({ id, onFinish, formInstance }: BomFormProps) {
  // Fetch bom data in edit mode
  useEffect(() => {
    if (id) {
      bomApi.getById(id).then((res: any) => {
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
      initialValues={{ state: '0', versionNumber: 1 }}
    >
      <Form.Item
        name="bomCode"
        label="BOM编码"
        rules={[{ required: true, message: '请输入BOM编码' }]}
      >
        <Input placeholder="请输入BOM编码" />
      </Form.Item>

      <Form.Item
        name="materielCode"
        label="物料编码"
        rules={[{ required: true, message: '请输入物料编码' }]}
      >
        <Input placeholder="请输入物料编码" />
      </Form.Item>

      <Form.Item name="materielDesc" label="物料描述">
        <Input placeholder="请输入物料描述" />
      </Form.Item>

      <Form.Item name="versionNumber" label="版本号">
        <InputNumber
          style={{ width: '100%' }}
          min={1}
          placeholder="版本号"
          addonBefore={
            <MinusOutlined
              onClick={() => {
                const val = formInstance.getFieldValue('versionNumber')
                if (val > 1) {
                  formInstance.setFieldsValue({ versionNumber: val - 1 })
                }
              }}
              style={{ cursor: 'pointer' }}
            />
          }
          addonAfter={
            <PlusOutlined
              onClick={() => {
                const val = formInstance.getFieldValue('versionNumber') || 0
                formInstance.setFieldsValue({ versionNumber: val + 1 })
              }}
              style={{ cursor: 'pointer' }}
            />
          }
        />
      </Form.Item>

      <Form.Item name="state" label="状态">
        <Select placeholder="请选择状态">
          <Select.Option value="0">草稿</Select.Option>
          <Select.Option value="1">已发布</Select.Option>
          <Select.Option value="2">已作废</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item name="factory" label="工厂">
        <Input placeholder="请输入工厂" />
      </Form.Item>

      <Form.Item name="remark" label="备注">
        <Input.TextArea rows={3} placeholder="请输入备注" />
      </Form.Item>
    </Form>
  )
}

export default BomForm
