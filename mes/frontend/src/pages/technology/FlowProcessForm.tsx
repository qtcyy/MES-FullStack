import { useEffect, useState } from 'react'
import { Form, Select, Transfer } from 'antd'
import type { FormInstance } from 'antd/es/form'
import type { TransferItem } from 'antd/es/transfer'
import * as flowApi from '@/api/technology/flow'
import type { Flow } from '@/types/common'

interface FlowProcessFormProps {
  id?: string | null
  onFinish?: (values: any) => void
  formInstance: FormInstance
}

function FlowProcessForm({ id, onFinish, formInstance }: FlowProcessFormProps) {
  const [flowOptions, setFlowOptions] = useState<Flow[]>([])
  const [selectedFlow, setSelectedFlow] = useState<string | undefined>()
  const [allOperations, setAllOperations] = useState<TransferItem[]>([])
  const [targetKeys, setTargetKeys] = useState<React.Key[]>([])

  // Load flow list for dropdown
  useEffect(() => {
    flowApi.flowList().then((res: any) => {
      setFlowOptions(Array.isArray(res) ? res : [])
    })
  }, [])

  // Load mock operations data (in real system this would come from an operations API)
  useEffect(() => {
    // This would typically be loaded from a dedicated operations API
    // For now, provide some sample operations
    const mockOps: TransferItem[] = [
      { key: 'OP001', title: '下料' },
      { key: 'OP002', title: '车削' },
      { key: 'OP003', title: '铣削' },
      { key: 'OP004', title: '钻孔' },
      { key: 'OP005', title: '磨削' },
      { key: 'OP006', title: '热处理' },
      { key: 'OP007', title: '焊接' },
      { key: 'OP008', title: '装配' },
      { key: 'OP009', title: '测试' },
      { key: 'OP010', title: '包装' },
    ]
    setAllOperations(mockOps)
  }, [])

  // Fetch existing flow data in edit mode
  useEffect(() => {
    if (id) {
      flowApi.getById(id).then((res: any) => {
        setSelectedFlow(res.flow)
        formInstance.setFieldsValue({ flow: res.flow })

        if (res.process) {
          const ops = res.process.split('→').filter(Boolean)
          setTargetKeys(ops)
        }
      })
    } else {
      formInstance.resetFields()
      setSelectedFlow(undefined)
      setTargetKeys([])
    }
  }, [id, formInstance])

  const handleFlowChange = (value: string) => {
    setSelectedFlow(value)
    formInstance.setFieldsValue({ flow: value })
    // When flow changes, load its associated operations
    // For now, this is handled by the edit mode load
  }

  const handleTransferChange = (nextTargetKeys: React.Key[]) => {
    setTargetKeys(nextTargetKeys.map(String))
  }

  const handleFinish = (values: any) => {
    // Build the operation list from target keys
    const selectedOps = targetKeys.map((key) => {
      const op = allOperations.find((o) => o.key === key)
      return { value: key, title: op?.title || key }
    })

    // Build process string from selected operations
    const processStr = selectedOps.map((op) => op.title).join('→')

    onFinish?.({
      ...values,
      process: processStr,
      spOperVoList: selectedOps,
    })
  }

  return (
    <Form
      form={formInstance}
      layout="vertical"
      onFinish={handleFinish}
    >
      <Form.Item
        name="flow"
        label="工艺编码"
        rules={[{ required: true, message: '请选择工艺' }]}
      >
        <Select
          placeholder="请选择工艺"
          onChange={handleFlowChange}
          value={selectedFlow}
        >
          {flowOptions.map((f) => (
            <Select.Option key={f.id} value={f.flow}>
              {f.flow} - {f.flowDesc}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item label="工序列表">
        <Transfer
          dataSource={allOperations}
          targetKeys={targetKeys}
          onChange={handleTransferChange}
          render={(item) => item.title || ''}
          titles={['可选工序', '已选工序']}
          listStyle={{ width: 280, height: 300 }}
          showSearch
          filterOption={(inputValue, item) =>
            (item.title || '').toLowerCase().includes(inputValue.toLowerCase())
          }
        />
      </Form.Item>
    </Form>
  )
}

export default FlowProcessForm
