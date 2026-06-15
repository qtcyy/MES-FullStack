import { useEffect, useState } from 'react'
import { Form, Input, Radio, Select, TimePicker, Checkbox } from 'antd'
import dayjs from 'dayjs'
import type { FormInstance } from 'antd/es/form'
import type { SpTeam } from '@/types/team'
import client from '@/api/client'

interface TeamFormProps {
  id?: string | null
  record?: SpTeam | null
  onFinish?: (values: any) => void
  formInstance: FormInstance
}

const WEEKDAY_OPTIONS = [
  { label: '周一', value: '1' },
  { label: '周二', value: '2' },
  { label: '周三', value: '3' },
  { label: '周四', value: '4' },
  { label: '周五', value: '5' },
  { label: '周六', value: '6' },
  { label: '周日', value: '7' },
]

function TeamForm({ id, record, onFinish, formInstance }: TeamFormProps) {
  const [lineOptions, setLineOptions] = useState<{ id: string; name: string }[]>([])
  const [workshopOptions, setWorkshopOptions] = useState<{ id: string; name: string }[]>([])

  // Fetch line and workshop data from backend
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const lines = await client.get('/admin/sys/team/lines') as any[]
        setLineOptions(Array.isArray(lines) ? lines.map((l: any) => ({ id: l.id, name: l.line || l.name || '' })) : [])
      } catch { /* endpoint not available yet */ }
      try {
        const workshops = await client.get('/admin/sys/team/workshops') as any[]
        setWorkshopOptions(Array.isArray(workshops) ? workshops.map((w: any) => ({ id: w.id, name: w.workShop || w.name || '' })) : [])
      } catch { /* endpoint not available yet */ }
    }
    loadOptions()
  }, [])

  // Populate form when editing
  useEffect(() => {
    if (id && record) {
      formInstance.setFieldsValue({
        ...record,
        workdays: record.workdays ? record.workdays.split(',').filter(Boolean) : [],
        startTime: record.startTime ? dayjs(record.startTime, 'HH:mm') : null,
        endTime: record.endTime ? dayjs(record.endTime, 'HH:mm') : null,
      })
    } else if (!id) {
      formInstance.resetFields()
    }
  }, [id, record, formInstance])

  const handleFinish = (values: any) => {
    const payload = {
      ...values,
      workdays: Array.isArray(values.workdays) ? values.workdays.join(',') : '',
      startTime: values.startTime ? dayjs(values.startTime).format('HH:mm') : '',
      endTime: values.endTime ? dayjs(values.endTime).format('HH:mm') : '',
    }
    onFinish?.(payload)
  }

  return (
    <Form
      form={formInstance}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{ deleted: '0', workdays: [] }}
    >
      {/* Top: Left-right layout for basic fields */}
      <div style={{ display: 'flex', gap: 24 }}>
        {/* Left column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Form.Item
            name="code"
            label="班组代码"
            rules={[{ required: true, message: '请输入班组代码' }]}
          >
            <Input placeholder="请输入班组代码" />
          </Form.Item>

          <Form.Item
            name="name"
            label="班组名称"
            rules={[{ required: true, message: '请输入班组名称' }]}
          >
            <Input placeholder="请输入班组名称" />
          </Form.Item>

          <Form.Item name="descr" label="备注">
            <Input.TextArea rows={2} placeholder="请输入备注" />
          </Form.Item>

          <Form.Item name="lineId" label="所属生产线">
            <Select placeholder="请选择生产线" allowClear>
              {lineOptions.map((l) => (
                <Select.Option key={l.id} value={l.id}>{l.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        {/* Right column */}
        <div
          style={{
            flex: 1,
            borderLeft: '1px solid #f0f0f0',
            paddingLeft: 24,
            minWidth: 0,
          }}
        >
          <Form.Item name="workshopId" label="所属车间">
            <Select placeholder="请选择车间" allowClear>
              {workshopOptions.map((w) => (
                <Select.Option key={w.id} value={w.id}>{w.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="startTime" label="上班时间">
            <TimePicker format="HH:mm" placeholder="上班时间" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="endTime" label="下班时间">
            <TimePicker format="HH:mm" placeholder="下班时间" style={{ width: '100%' }} />
          </Form.Item>
        </div>
      </div>

      {/* Bottom: Full-width fields */}
      <Form.Item
        name="workdays"
        label="工作日"
        style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}
      >
        <Checkbox.Group options={WEEKDAY_OPTIONS} />
      </Form.Item>

      <Form.Item name="deleted" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
        <Radio.Group>
          <Radio value="0">正常</Radio>
          <Radio value="1">已删除</Radio>
          <Radio value="2">已禁用</Radio>
        </Radio.Group>
      </Form.Item>
    </Form>
  )
}

export default TeamForm
