import { useEffect, useState } from 'react'
import { Form, Input, InputNumber, Select, DatePicker } from 'antd'
import type { FormInstance } from 'antd/es/form'
import * as productionApi from '@/api/order/production'
import * as flowApi from '@/api/technology/flow'
import type { Flow } from '@/types/common'
import dayjs from 'dayjs'

interface OrderFormProps {
  id?: string | null
  onFinish?: (values: any) => void
  formInstance: FormInstance
}

function OrderForm({ id, onFinish, formInstance }: OrderFormProps) {
  const [flowOptions, setFlowOptions] = useState<Flow[]>([])

  // Fetch flow list for dropdown
  useEffect(() => {
    flowApi.flowList().then((res: any) => {
      setFlowOptions(Array.isArray(res) ? res : [])
    })
  }, [])

  // Fetch order data in edit mode
  useEffect(() => {
    if (id) {
      productionApi.getById(id).then((res: any) => {
        if (res.planStartTime) {
          res.planStartTime = dayjs(res.planStartTime)
        }
        if (res.planEndTime) {
          res.planEndTime = dayjs(res.planEndTime)
        }
        formInstance.setFieldsValue(res)
      })
    } else {
      formInstance.resetFields()
    }
  }, [id, formInstance])

  const handleFinish = (values: any) => {
    // Convert dayjs objects back to strings for API
    const formData = { ...values }
    if (formData.planStartTime && dayjs.isDayjs(formData.planStartTime)) {
      formData.planStartTime = formData.planStartTime.format('YYYY-MM-DD HH:mm:ss')
    }
    if (formData.planEndTime && dayjs.isDayjs(formData.planEndTime)) {
      formData.planEndTime = formData.planEndTime.format('YYYY-MM-DD HH:mm:ss')
    }
    onFinish?.(formData)
  }

  return (
    <Form
      form={formInstance}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{ statue: '1', orderType: 'P' }}
    >
      <Form.Item
        name="orderCode"
        label="工单编码"
        rules={[{ required: true, message: '请输入工单编码' }]}
      >
        <Input placeholder="请输入工单编码" />
      </Form.Item>

      <Form.Item name="orderDescription" label="描述">
        <Input placeholder="请输入工单描述" />
      </Form.Item>

      <Form.Item
        name="qty"
        label="数量"
        rules={[{ required: true, message: '请输入数量' }]}
      >
        <InputNumber
          style={{ width: '100%' }}
          min={1}
          placeholder="请输入数量"
        />
      </Form.Item>

      <Form.Item name="orderType" label="类型">
        <Select placeholder="请选择类型">
          <Select.Option value="P">批量</Select.Option>
          <Select.Option value="A">验证</Select.Option>
          <Select.Option value="F">返工</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="materiel"
        label="物料"
        rules={[{ required: true, message: '请输入物料编码' }]}
      >
        <Input placeholder="请输入物料编码" />
      </Form.Item>

      <Form.Item name="materielDesc" label="物料描述">
        <Input placeholder="请输入物料描述" />
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

      <Form.Item name="planStartTime" label="计划开始">
        <DatePicker
          style={{ width: '100%' }}
          showTime
          placeholder="请选择计划开始时间"
        />
      </Form.Item>

      <Form.Item name="planEndTime" label="计划结束">
        <DatePicker
          style={{ width: '100%' }}
          showTime
          placeholder="请选择计划结束时间"
        />
      </Form.Item>

      <Form.Item name="statue" label="状态">
        <Select placeholder="请选择状态">
          <Select.Option value="1">已创建</Select.Option>
          <Select.Option value="2">进行中</Select.Option>
          <Select.Option value="3">已完成</Select.Option>
          <Select.Option value="4">已终止</Select.Option>
        </Select>
      </Form.Item>
    </Form>
  )
}

export default OrderForm
