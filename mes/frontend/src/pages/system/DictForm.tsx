import { useEffect } from 'react'
import { Form, Input, InputNumber, Radio } from 'antd'
import type { FormInstance } from 'antd/es/form'
import * as dictApi from '@/api/system/dict'

interface DictFormProps {
  id?: string | null
  onFinish?: (values: any) => void
  formInstance: FormInstance
}

function DictForm({ id, onFinish, formInstance }: DictFormProps) {
  // Fetch dict data in edit mode
  useEffect(() => {
    if (id) {
      dictApi.getById(id).then((res: any) => {
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
      initialValues={{ deleted: '0' }}
    >
      <Form.Item
        name="name"
        label="字典名称"
        rules={[{ required: true, message: '请输入字典名称' }]}
      >
        <Input placeholder="请输入字典名称" />
      </Form.Item>

      <Form.Item
        name="value"
        label="字典值"
        rules={[{ required: true, message: '请输入字典值' }]}
      >
        <Input placeholder="请输入字典值" />
      </Form.Item>

      <Form.Item
        name="type"
        label="类型"
        rules={[{ required: true, message: '请输入类型' }]}
      >
        <Input placeholder="请输入类型" />
      </Form.Item>

      <Form.Item
        name="descr"
        label="描述"
      >
        <Input.TextArea rows={3} placeholder="请输入描述" />
      </Form.Item>

      <Form.Item
        name="sortNum"
        label="排序"
      >
        <InputNumber
          style={{ width: '100%' }}
          placeholder="请输入排序号"
          min={0}
        />
      </Form.Item>

      <Form.Item
        name="parentId"
        label="上级"
      >
        <Input placeholder="请输入上级ID" />
      </Form.Item>

      <Form.Item
        name="deleted"
        label="状态"
        rules={[{ required: true, message: '请选择状态' }]}
      >
        <Radio.Group>
          <Radio value="0">正常</Radio>
          <Radio value="1">已删除</Radio>
          <Radio value="2">已禁用</Radio>
        </Radio.Group>
      </Form.Item>
    </Form>
  )
}

export default DictForm
