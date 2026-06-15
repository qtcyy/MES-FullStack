import { useEffect } from 'react'
import { Form, Input, Button, Space, Switch, InputNumber } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd/es/form'
import * as managerApi from '@/api/basedata/manager'

interface ManagerFormProps {
  id?: string | null
  onFinish?: (values: any) => void
  formInstance: FormInstance
}

function ManagerForm({ id, onFinish, formInstance }: ManagerFormProps) {
  // Fetch manager data in edit mode
  useEffect(() => {
    if (id) {
      managerApi.getById(id).then((res: any) => {
        if (typeof res.fields === 'string') {
          try {
            res.fields = JSON.parse(res.fields)
          } catch {
            res.fields = []
          }
        }
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
      initialValues={{ fields: [] }}
    >
      <Form.Item
        name="tableName"
        label="表名"
        rules={[{ required: true, message: '请输入表名' }]}
      >
        <Input placeholder="请输入表名" />
      </Form.Item>

      <Form.Item
        name="tableDesc"
        label="表说明"
        rules={[{ required: true, message: '请输入表说明' }]}
      >
        <Input placeholder="请输入表说明" />
      </Form.Item>

      <Form.Item name="permission" label="权限标识">
        <Input placeholder="请输入权限标识" />
      </Form.Item>

      <Form.List name="fields">
        {(fields, { add, remove }) => (
          <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, padding: 16 }}>
            <div style={{ marginBottom: 12, fontWeight: 500 }}>表字段项</div>
            {fields.map(({ key, name, ...restField }) => (
              <Space
                key={key}
                style={{ display: 'flex', marginBottom: 8 }}
                align="baseline"
              >
                <Form.Item
                  {...restField}
                  name={[name, 'field']}
                  rules={[{ required: true, message: '请输入field名' }]}
                >
                  <Input placeholder="field名" style={{ width: 150 }} />
                </Form.Item>
                <Form.Item
                  {...restField}
                  name={[name, 'fieldDesc']}
                  rules={[{ required: true, message: '请输入field说明' }]}
                >
                  <Input placeholder="field说明" style={{ width: 150 }} />
                </Form.Item>
                <Form.Item {...restField} name={[name, 'required']} valuePropName="checked">
                  <Switch checkedChildren="必填" unCheckedChildren="可选" />
                </Form.Item>
                <Form.Item {...restField} name={[name, 'sortNum']}>
                  <InputNumber placeholder="排序号" min={0} style={{ width: 80 }} />
                </Form.Item>
                <MinusCircleOutlined onClick={() => remove(name)} />
              </Space>
            ))}
            <Form.Item>
              <Button
                type="dashed"
                onClick={() => add()}
                block
                icon={<PlusOutlined />}
              >
                添加字段项
              </Button>
            </Form.Item>
          </div>
        )}
      </Form.List>
    </Form>
  )
}

export default ManagerForm
