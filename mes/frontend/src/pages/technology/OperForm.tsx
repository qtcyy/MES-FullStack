import { useEffect, useState } from 'react'
import { Form, Input, InputNumber, Radio, Select } from 'antd'
import type { FormInstance } from 'antd/es/form'
import * as operApi from '@/api/technology/oper'
import { ensureArray } from '@/utils/ensureArray'

interface OperFormProps {
  id?: string | null
  record?: any
  onFinish?: (values: Record<string, unknown>) => void
  formInstance: FormInstance
}

function OperForm({ record, onFinish, formInstance }: OperFormProps) {
  const [processUnits, setProcessUnits] = useState<{ id: string; code: string; name: string }[]>([])

  useEffect(() => {
    operApi.getProcessUnits().then((res: any) => {
      setProcessUnits(ensureArray(res) as any)
    }).catch(() => setProcessUnits([]))
  }, [])

  useEffect(() => {
    if (record) {
      formInstance.setFieldsValue(record)
    } else {
      formInstance.resetFields()
    }
  }, [record, formInstance])

  const handleFinish = (values: Record<string, unknown>) => {
    onFinish?.(values)
  }

  return (
    <Form
      form={formInstance}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{ generatePlan: '1', laborHours: 0, manufacturingCycle: 0 }}
    >
      <Form.Item
        name="operDesc"
        label="工序描述"
        rules={[{ required: true, message: '请输入工序描述' }]}
      >
        <Input placeholder="如：主板组装作业工序" />
      </Form.Item>

      <Form.Item name="processUnitId" label="加工单元">
        <Select placeholder="请选择加工单元" allowClear>
          {processUnits.map(u => (
            <Select.Option key={u.id} value={u.id}>
              {u.code} - {u.name}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="laborHours"
        label="工时（分钟）"
        rules={[{ required: true, message: '请输入工时' }]}
      >
        <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入工时" />
      </Form.Item>

      <Form.Item
        name="manufacturingCycle"
        label="制造周期（分钟）"
        rules={[
          { required: true, message: '请输入制造周期' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || value > getFieldValue('laborHours')) {
                return Promise.resolve()
              }
              return Promise.reject(new Error('制造周期必须大于工时'))
            },
          }),
        ]}
      >
        <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入制造周期" />
      </Form.Item>

      <Form.Item name="generatePlan" label="是否生成生产计划">
        <Radio.Group>
          <Radio value="1">是</Radio>
          <Radio value="0">否</Radio>
        </Radio.Group>
      </Form.Item>

      <Form.Item name="remark" label="备注">
        <Input.TextArea rows={3} placeholder="请输入备注信息" />
      </Form.Item>
    </Form>
  )
}

export default OperForm
