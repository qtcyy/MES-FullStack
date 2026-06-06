import { useEffect } from 'react'
import { Form, Input, Radio } from 'antd'
import type { FormInstance } from 'antd/es/form'
import * as userApi from '@/api/system/user'

interface UserFormProps {
  id?: string | null
  onFinish?: (values: any) => void
  formInstance: FormInstance
}

function UserForm({ id, onFinish, formInstance }: UserFormProps) {
  const isEdit = Boolean(id)

  // Fetch user data in edit mode
  useEffect(() => {
    if (id) {
      userApi.getById(id).then((res: any) => {
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
        name="username"
        label="用户名"
        rules={[{ required: true, message: '请输入用户名' }]}
      >
        <Input placeholder="请输入用户名" />
      </Form.Item>

      <Form.Item
        name="name"
        label="姓名"
        rules={[{ required: true, message: '请输入姓名' }]}
      >
        <Input placeholder="请输入姓名" />
      </Form.Item>

      <Form.Item
        name="password"
        label="密码"
        rules={
          isEdit ? [] : [{ required: true, message: '请输入密码' }]
        }
      >
        <Input.Password
          placeholder={isEdit ? '留空则不修改密码' : '请输入密码'}
        />
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

export default UserForm
