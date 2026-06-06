import { useEffect } from 'react'
import { Form, Input, Radio } from 'antd'
import type { FormInstance } from 'antd/es/form'
import * as roleApi from '@/api/system/role'

interface RoleFormProps {
  id?: string | null
  onFinish?: (values: any) => void
  formInstance: FormInstance
}

function RoleForm({ id, onFinish, formInstance }: RoleFormProps) {
  // Fetch role data in edit mode
  useEffect(() => {
    if (id) {
      roleApi.getById(id).then((res: any) => {
        formInstance.setFieldsValue(res)
      })
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
        label="角色名称"
        rules={[{ required: true, message: '请输入角色名称' }]}
      >
        <Input placeholder="请输入角色名称" />
      </Form.Item>

      <Form.Item
        name="code"
        label="角色编码"
        rules={[{ required: true, message: '请输入角色编码' }]}
      >
        <Input placeholder="请输入角色编码" />
      </Form.Item>

      <Form.Item
        name="descr"
        label="描述"
      >
        <Input.TextArea rows={3} placeholder="请输入描述" />
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

export default RoleForm
