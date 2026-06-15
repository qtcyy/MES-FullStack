import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Breadcrumb, Button, Form, Input, InputNumber, Select, Popconfirm, message, Space, Table, Tree, Spin, Row, Col } from 'antd'
import { PlusOutlined, LockOutlined, CopyOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageContainer from '@/components/PageContainer'
import { ensureArray } from '@/utils/ensureArray'
import * as productBomApi from '@/api/technology/product-bom'
import type { ProductBom, ProductBomItem } from '@/types/common'
import type { DataNode } from 'antd/es/tree'

export default function ProductBomEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const [itemForm] = Form.useForm()
  const [selectedNode, setSelectedNode] = useState<ProductBom | null>(null)
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])
  const [addChildModalOpen, setAddChildModalOpen] = useState(false)
  const [childForm] = Form.useForm()

  const { data: nodes, isLoading } = useQuery({
    queryKey: ['product-bom-tree', id],
    queryFn: () => productBomApi.getTree(id!),
    enabled: !!id,
  })

  const { data: items, refetch: refetchItems } = useQuery({
    queryKey: ['product-bom-items', selectedNode?.id],
    queryFn: () => productBomApi.getItems(selectedNode!.id),
    enabled: !!selectedNode?.id,
  })

  const allNodes = ensureArray(nodes) as ProductBom[]
  const rootNode = allNodes.find(n => !n.parentId)
  const isLocked = rootNode?.status === 'locked'

  useEffect(() => {
    if (allNodes.length > 0 && !selectedNode) {
      setSelectedNode(allNodes[0])
      setExpandedKeys(allNodes.map(n => n.id))
    }
  }, [nodes])

  useEffect(() => {
    if (selectedNode) {
      form.setFieldsValue({
        nodeName: selectedNode.nodeName,
        bomCode: selectedNode.bomCode,
        level: selectedNode.level,
        status: selectedNode.status === 'locked' ? '已锁定' : '草稿',
        remark: selectedNode.remark,
      })
    }
  }, [selectedNode, form])

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      productBomApi.addOrUpdate({ ...values, id: selectedNode?.id }),
    onSuccess: () => {
      message.success('保存成功')
      queryClient.invalidateQueries({ queryKey: ['product-bom-tree', id] })
    },
  })

  const addChildMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      productBomApi.addOrUpdate({ ...values, parentId: selectedNode?.id }),
    onSuccess: () => {
      message.success('子节点添加成功')
      setAddChildModalOpen(false)
      childForm.resetFields()
      queryClient.invalidateQueries({ queryKey: ['product-bom-tree', id] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (nodeId: string) => productBomApi.deleteBom(nodeId),
    onSuccess: () => {
      message.success('节点已删除')
      setSelectedNode(rootNode || null)
      queryClient.invalidateQueries({ queryKey: ['product-bom-tree', id] })
    },
  })

  const lockMutation = useMutation({
    mutationFn: () => productBomApi.lockBom(rootNode!.id),
    onSuccess: () => {
      message.success('BOM 已锁定，所有节点变为只读')
      queryClient.invalidateQueries({ queryKey: ['product-bom-tree', id] })
    },
  })

  const newVersionMutation = useMutation({
    mutationFn: () => productBomApi.newVersion(rootNode!.id),
    onSuccess: (newId: any) => {
      message.success('新版本创建成功')
      const nid = typeof newId === 'string' ? newId : (newId as any)?.data
      if (nid) navigate(`/technology/product-bom/${nid}`)
    },
  })

  const saveItemMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      productBomApi.addOrUpdateItem({ ...values, bomId: selectedNode?.id }),
    onSuccess: () => {
      message.success('物料添加成功')
      itemForm.resetFields()
      refetchItems()
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => productBomApi.deleteItem(itemId),
    onSuccess: () => {
      message.success('物料已删除')
      refetchItems()
    },
  })

  const handleNodeSelect = useCallback((selectedKeys: any[]) => {
    if (selectedKeys.length > 0) {
      const node = allNodes.find(n => n.id === selectedKeys[0])
      if (node) setSelectedNode(node)
    }
  }, [allNodes])

  const handleNodeSave = () => {
    form.validateFields().then(values => {
      saveMutation.mutate(values)
    })
  }

  const handleAddChild = () => {
    childForm.resetFields()
    setAddChildModalOpen(true)
  }

  const handleAddChildConfirm = () => {
    childForm.validateFields().then(values => {
      addChildMutation.mutate(values)
    })
  }

  const handleDeleteNode = () => {
    if (selectedNode) deleteMutation.mutate(selectedNode.id)
  }

  const handleAddItem = () => {
    itemForm.validateFields().then(values => {
      saveItemMutation.mutate(values)
    })
  }

  const handleDeleteItem = (item: ProductBomItem) => {
    if (item.id) deleteItemMutation.mutate(item.id)
  }

  const buildTreeNode = (node: ProductBom): DataNode => {
    const levelIcon = node.level === 0 ? '🏭 ' : node.level === 1 ? '🔧 ' : '📦 '
    const statusText = node.status === 'locked' ? ' [已锁定]' : ' [草稿]'
    return {
      key: node.id,
      title: `${levelIcon}${node.nodeName || ''}${statusText}`,
      children: allNodes
        .filter(n => n.parentId === node.id)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map(buildTreeNode),
    }
  }

  const treeData: DataNode[] = rootNode ? [buildTreeNode(rootNode)] : []

  const itemColumns = [
    {
      title: '物料编码',
      dataIndex: 'materialCode',
      key: 'materialCode',
    },
    {
      title: '物料描述',
      dataIndex: 'materialDesc',
      key: 'materialDesc',
    },
    {
      title: '用量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 60,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: ProductBomItem) =>
        !isLocked && (
          <Popconfirm title="确定删除？" onConfirm={() => handleDeleteItem(record)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        ),
    },
  ]

  if (isLoading) {
    return <PageContainer><Spin size="large" style={{ display: 'block', margin: '200px auto' }} /></PageContainer>
  }

  return (
    <PageContainer>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <a onClick={() => navigate('/technology/product-bom')}>产品BOM管理</a> },
          { title: rootNode?.nodeName || 'BOM 编制' },
        ]}
      />

      <Row gutter={16}>
        <Col span={8}>
          <div style={{
            border: '1px solid #d9d9d9',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            background: '#fafafa',
          }}>
            <Space style={{ marginBottom: 12 }}>
              <Button
                size="small"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/technology/product-bom')}
              >
                返回
              </Button>
              <span style={{ fontWeight: 'bold', fontSize: 14 }}>BOM 结构树</span>
            </Space>
            <div style={{ marginBottom: 8 }}>
              <Space>
                {!isLocked && (
                  <Button
                    size="small"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddChild}
                    disabled={!selectedNode}
                  >
                    添加子节点
                  </Button>
                )}
                {rootNode && !isLocked && (
                  <Popconfirm
                    title="确认锁定BOM结构？锁定后不可编辑。"
                    onConfirm={() => lockMutation.mutate()}
                  >
                    <Button
                      size="small"
                      icon={<LockOutlined />}
                      loading={lockMutation.isPending}
                    >
                      锁定BOM结构
                    </Button>
                  </Popconfirm>
                )}
                {isLocked && (
                  <Popconfirm
                    title={`将在 ${rootNode?.version} 基础上创建新版本？`}
                    onConfirm={() => newVersionMutation.mutate()}
                  >
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      loading={newVersionMutation.isPending}
                    >
                      创建新版本
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            </div>
            <Tree
              treeData={treeData}
              selectedKeys={selectedNode ? [selectedNode.id] : []}
              expandedKeys={expandedKeys}
              onExpand={(keys) => setExpandedKeys(keys as string[])}
              onSelect={handleNodeSelect}
            />
            {addChildModalOpen && (
              <div style={{
                border: '1px solid #5bc0de',
                borderRadius: 8,
                padding: 12,
                marginTop: 12,
                background: '#f0f9ff',
              }}>
                <h4 style={{ marginBottom: 12 }}>添加子节点</h4>
                <Form form={childForm} layout="vertical">
                  <Form.Item
                    name="nodeName"
                    label="节点名称"
                    rules={[{ required: true, message: '请输入节点名称' }]}
                  >
                    <Input placeholder="如：主板单元" />
                  </Form.Item>
                  <Form.Item name="remark" label="备注">
                    <Input.TextArea rows={2} placeholder="请输入备注信息" />
                  </Form.Item>
                  <Form.Item style={{ marginBottom: 0 }}>
                    <Space>
                      <Button type="primary" onClick={handleAddChildConfirm} loading={addChildMutation.isPending}>
                        确认添加
                      </Button>
                      <Button onClick={() => setAddChildModalOpen(false)}>取消</Button>
                    </Space>
                  </Form.Item>
                </Form>
              </div>
            )}
          </div>
        </Col>

        <Col span={16}>
          {selectedNode && (
            <>
              <div style={{
                border: '1px solid #d9d9d9',
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
                background: '#fafafa',
              }}>
                <h4 style={{ marginBottom: 12 }}>
                  {selectedNode.level === 0 ? '🏭 ' : selectedNode.level === 1 ? '🔧 ' : '📦 '}
                  节点信息
                  {!isLocked && selectedNode.id !== rootNode?.id && (
                    <Popconfirm
                      title="确定删除此节点及其所有子节点？"
                      onConfirm={handleDeleteNode}
                    >
                      <Button size="small" danger style={{ float: 'right' }}>删除节点</Button>
                    </Popconfirm>
                  )}
                </h4>
                <Form form={form} layout="vertical" disabled={isLocked}>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item name="nodeName" label="节点名称">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="bomCode" label="BOM编码">
                        <Input disabled />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item name="level" label="层级">
                        <Input disabled />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item name="status" label="状态">
                        <Input disabled />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item name="remark" label="备注">
                    <Input.TextArea rows={2} placeholder="请输入备注信息，说明此节点的制造步骤和用途" />
                  </Form.Item>
                  {!isLocked && (
                    <Button type="primary" onClick={handleNodeSave} loading={saveMutation.isPending}>
                      保存节点信息
                    </Button>
                  )}
                </Form>
              </div>

              <div style={{
                border: '1px solid #d9d9d9',
                borderRadius: 8,
                padding: 16,
                background: '#fafafa',
              }}>
                <h4 style={{ marginBottom: 12 }}>📦 物料清单</h4>
                <Table
                  rowKey="id"
                  columns={itemColumns}
                  dataSource={ensureArray(items)}
                  pagination={false}
                  size="small"
                />
                {!isLocked && (
                  <div style={{ marginTop: 16, padding: 12, background: '#fff', borderRadius: 6 }}>
                    <Form form={itemForm} layout="inline">
                      <Form.Item
                        name="materialCode"
                        rules={[{ required: true, message: '请输入物料编码' }]}
                      >
                        <Input placeholder="物料编码" style={{ width: 130 }} />
                      </Form.Item>
                      <Form.Item
                        name="materialDesc"
                        rules={[{ required: true, message: '请输入物料描述' }]}
                      >
                        <Input placeholder="物料描述" style={{ width: 160 }} />
                      </Form.Item>
                      <Form.Item
                        name="quantity"
                        initialValue={1}
                        rules={[{ required: true, message: '请输入' }]}
                      >
                        <InputNumber min={0.01} step={0.01} placeholder="用量" style={{ width: 70 }} />
                      </Form.Item>
                      <Form.Item
                        name="unit"
                        initialValue="个"
                        rules={[{ required: true, message: '请选择' }]}
                      >
                        <Select style={{ width: 70 }}>
                          <Select.Option value="个">个</Select.Option>
                          <Select.Option value="条">条</Select.Option>
                          <Select.Option value="台">台</Select.Option>
                          <Select.Option value="套">套</Select.Option>
                          <Select.Option value="kg">kg</Select.Option>
                          <Select.Option value="m">m</Select.Option>
                        </Select>
                      </Form.Item>
                      <Form.Item>
                        <Button type="primary" onClick={handleAddItem} loading={saveItemMutation.isPending}>
                          添加物料
                        </Button>
                      </Form.Item>
                    </Form>
                  </div>
                )}
              </div>
            </>
          )}
        </Col>
      </Row>
    </PageContainer>
  )
}
