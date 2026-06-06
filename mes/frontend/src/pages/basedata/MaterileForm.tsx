import { useEffect, useState } from 'react'
import { Form, Input, Radio, Select } from 'antd'
import type { FormInstance } from 'antd/es/form'
import * as materileApi from '@/api/basedata/materile'
import * as flowApi from '@/api/technology/flow'
import type { Flow } from '@/types/common'

interface MaterileFormProps {
  id?: string | null
  onFinish?: (values: any) => void
  formInstance: FormInstance
}

function MaterileForm({ id, onFinish, formInstance }: MaterileFormProps) {
  const [flowOptions, setFlowOptions] = useState<Flow[]>([])

  // Fetch flow list for dropdown
  useEffect(() => {
    flowApi.flowList().then((res: any) => {
      setFlowOptions(Array.isArray(res) ? res : [])
    })
  }, [])

  // Fetch materile data in edit mode
  useEffect(() => {
    if (id) {
      materileApi.getById(id).then((res: any) => {
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
        name="materiel"
        label="物料编码"
        rules={[{ required: true, message: '请输入物料编码' }]}
      >
        <Input placeholder="请输入物料编码" />
      </Form.Item>

      <Form.Item
        name="materielDesc"
        label="物料描述"
        rules={[{ required: true, message: '请输入物料描述' }]}
      >
        <Input placeholder="请输入物料描述" />
      </Form.Item>

      <Form.Item name="unit" label="单位">
        <Input placeholder="请输入单位" />
      </Form.Item>

      <Form.Item name="productGroup" label="产品组">
        <Input placeholder="请输入产品组" />
      </Form.Item>

      <Form.Item name="matType" label="类型">
        <Select placeholder="请选择类型" allowClear>
          <Select.Option value="原材料">原材料</Select.Option>
          <Select.Option value="半成品">半成品</Select.Option>
          <Select.Option value="成品">成品</Select.Option>
          <Select.Option value="辅料">辅料</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item name="size" label="规格">
        <Input placeholder="请输入规格" />
      </Form.Item>

      <Form.Item name="flowId" label="工艺">
        <Select placeholder="请选择工艺" allowClear>
          {flowOptions.map((f) => (
            <Select.Option key={f.id} value={f.id}>
              {f.flow} - {f.flowDesc}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item name="model" label="型号">
        <Input placeholder="请输入型号" />
      </Form.Item>

      <Form.Item
        name="deleted"
        label="状态"
        rules={[{ required: true, message: '请选择状态' }]}
      >
        <Radio.Group>
          <Radio value="0">正常</Radio>
          <Radio value="1">已删除</Radio>
        </Radio.Group>
      </Form.Item>
    </Form>
  )
}

export default MaterileForm
