import { useState } from 'react'
import { Select, Button, Table, Tag, Popconfirm, message, Space, Form, Modal, Input } from 'antd'
import { LockOutlined, EditOutlined } from '@ant-design/icons'
import { useQuery, useMutation } from '@tanstack/react-query'
import PageContainer from '@/components/PageContainer'
import { ensureArray } from '@/utils/ensureArray'
import * as bomFlowApi from '@/api/technology/bom-flow'

export default function ProcessFlowPage() {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editBomNode, setEditBomNode] = useState<any>(null)
  const [editForm] = Form.useForm()

  const { data: products } = useQuery({
    queryKey: ['bom-products'],
    queryFn: () => bomFlowApi.getProducts(),
  })

  const { data: bomFlowData, isLoading, refetch } = useQuery({
    queryKey: ['bom-flow-list', selectedProductId],
    queryFn: () => bomFlowApi.getBomFlowList(selectedProductId!),
    enabled: !!selectedProductId,
  })

  const { data: flows } = useQuery({
    queryKey: ['all-flows'],
    queryFn: () => bomFlowApi.getFlows(),
    enabled: editModalOpen,
  })

  const bindMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => bomFlowApi.bind(values),
    onSuccess: () => {
      message.success('工艺绑定成功')
      setEditModalOpen(false)
      refetch()
    },
  })

  const unbindMutation = useMutation({
    mutationFn: (bomId: string) => bomFlowApi.unbind(bomId),
    onSuccess: () => {
      message.success('解绑成功')
      refetch()
    },
  })

  const lockMutation = useMutation({
    mutationFn: () => bomFlowApi.lock(selectedProductId!),
    onSuccess: () => {
      message.success('产品工艺已锁定')
      refetch()
    },
  })

  const nodeList = ensureArray(bomFlowData)
  const isAnyLocked = nodeList.some((n: any) => n.bomFlow?.status === 'locked')
  const isBomLocked = nodeList.length > 0 && nodeList[0]?.bomNode?.status === 'locked'

  const handleEdit = (bomNode: any) => {
    setEditBomNode(bomNode)
    editForm.resetFields()
    if (bomNode.bomFlow) {
      editForm.setFieldsValue({
        flowId: bomNode.bomFlow.flowId,
        remark: bomNode.bomFlow.remark,
      })
    }
    setEditModalOpen(true)
  }

  const handleEditConfirm = () => {
    editForm.validateFields().then(values => {
      bindMutation.mutate({
        bomId: editBomNode?.bomNode?.id,
        ...values,
      })
    })
  }

  const handleUnbind = (bomNode: any) => {
    unbindMutation.mutate(bomNode.bomNode.id)
  }

  const columns = [
    {
      title: '层级',
      dataIndex: ['bomNode', 'level'],
      key: 'level',
      width: 100,
      render: (val: number) => val === 0 ? '🏭 产品' : val === 1 ? '🔧 半成品' : '📦 组件',
    },
    {
      title: 'BOM 节点',
      dataIndex: ['bomNode', 'nodeName'],
      key: 'nodeName',
    },
    {
      title: '工艺编码',
      key: 'flowCode',
      render: (_: unknown, record: any) => record.flow?.flow || '-',
    },
    {
      title: '工艺描述',
      key: 'flowDesc',
      render: (_: unknown, record: any) => record.flow?.flowDesc || '-',
    },
    {
      title: '绑定工序',
      key: 'opers',
      render: (_: unknown, record: any) => {
        const opers = ensureArray(record.opers)
        if (opers.length === 0) return '-'
        return (
          <Space size={4} wrap>
            {opers.map((o: any, i: number) => (
              <Tag key={i} color="blue">
                {o.oper?.operCode || o.relation?.oper} {o.relation?.operType === 'firstOper' ? '(首)' : o.relation?.operType === 'lastOper' ? '(末)' : ''}
              </Tag>
            ))}
          </Space>
        )
      },
    },
    {
      title: '备注（步骤说明）',
      dataIndex: ['bomFlow', 'remark'],
      key: 'remark',
      render: (val: string) => val || '-',
    },
    {
      title: '状态',
      key: 'status',
      render: (_: unknown, record: any) => (
        <Tag color={record.bomFlow?.status === 'locked' ? 'green' : 'default'}>
          {record.bomFlow?.status === 'locked' ? '已锁定' : '草稿'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: any) => {
        const isLocked = record.bomFlow?.status === 'locked'
        return (
          <Space>
            {!isLocked && (
              <>
                <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                  编辑工艺规划
                </Button>
                {record.bomFlow && (
                  <Popconfirm title="确定解除绑定？" onConfirm={() => handleUnbind(record)}>
                    <Button type="link" size="small" danger>解绑</Button>
                  </Popconfirm>
                )}
              </>
            )}
            {isLocked && <span style={{ color: '#888' }}>只读</span>}
          </Space>
        )
      },
    },
  ]

  return (
    <PageContainer>
      <Space style={{ marginBottom: 16 }}>
        <span>选择产品：</span>
        <Select
          style={{ width: 300 }}
          placeholder="请选择产品 BOM"
          value={selectedProductId}
          onChange={setSelectedProductId}
          showSearch
          optionFilterProp="label"
          options={ensureArray(products).map((p: any) => ({
            label: `${p.nodeName || p.productCode} [${p.version || 'V1.0'}]`,
            value: p.id,
          }))}
        />
        {selectedProductId && !isAnyLocked && isBomLocked && (
          <Popconfirm title="确认锁定产品工艺？锁定后不可编辑。" onConfirm={() => lockMutation.mutate()}>
            <Button icon={<LockOutlined />} loading={lockMutation.isPending}>锁定产品工艺</Button>
          </Popconfirm>
        )}
        {selectedProductId && !isBomLocked && (
          <Tag color="orange">请先锁定产品 BOM 结构</Tag>
        )}
        {isAnyLocked && <Tag color="green">产品工艺已锁定</Tag>}
      </Space>

      <Table
        rowKey={(r: any) => r.bomNode?.id}
        columns={columns}
        dataSource={nodeList}
        loading={isLoading}
        pagination={false}
        size="middle"
      />

      <Modal
        title={`编辑工艺规划 — ${editBomNode?.bomNode?.nodeName || ''}`}
        open={editModalOpen}
        onOk={handleEditConfirm}
        onCancel={() => setEditModalOpen(false)}
        confirmLoading={bindMutation.isPending}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="flowId"
            label="选择工艺路线"
            rules={[{ required: true, message: '请选择工艺路线' }]}
          >
            <Select placeholder="请选择工艺路线" showSearch optionFilterProp="label">
              {ensureArray(flows).map((f: any) => (
                <Select.Option key={f.id} value={f.id} label={`${f.flow} - ${f.flowDesc}`}>
                  {f.flow} - {f.flowDesc}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="remark" label="备注（工序步骤说明）">
            <Input.TextArea rows={3} placeholder="如：步骤1：主板单元装配作业" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
