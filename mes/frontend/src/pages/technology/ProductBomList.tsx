import { useState } from 'react'
import { Form, Button, Input, Tag, Popconfirm, message, Space, Radio, Tree, Modal, Select } from 'antd'
import { PlusOutlined, UnorderedListOutlined, ApartmentOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import { ensureArray } from '@/utils/ensureArray'
import SearchForm from '@/components/SearchForm'
import PageTable from '@/components/PageTable'
import PermissionGuard from '@/components/PermissionGuard'
import { usePagination } from '@/hooks/usePagination'
import * as productBomApi from '@/api/technology/product-bom'
import type { ProductBom } from '@/types/common'
import type { DataNode } from 'antd/es/tree'

const statusMap: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  locked: { text: '已锁定', color: 'green' },
}

export default function ProductBomList() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { pagination, onChange, reset } = usePagination()
  const [filters, setFilters] = useState<Record<string, unknown>>({})
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list')
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [products, setProducts] = useState<{ id: string; materiel: string; materielDesc: string }[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['product-boms', pagination, filters],
    queryFn: () =>
      productBomApi.page({
        current: pagination.current,
        size: pagination.pageSize,
        ...filters,
      }),
    enabled: viewMode === 'list',
  })

  const { data: treeData } = useQuery({
    queryKey: ['product-bom-tree'],
    queryFn: () => productBomApi.tree(),
    enabled: viewMode === 'tree',
  })

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => productBomApi.addOrUpdate(values),
    onSuccess: (newId: any) => {
      message.success('BOM 根节点创建成功')
      setAddModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['product-boms'] })
      queryClient.invalidateQueries({ queryKey: ['product-bom-tree'] })
      const id = typeof newId === 'string' ? newId : (newId as any)?.data
      if (id) navigate(`/technology/product-bom/${id}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productBomApi.deleteBom(id),
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['product-boms'] })
      queryClient.invalidateQueries({ queryKey: ['product-bom-tree'] })
    },
  })

  const lockMutation = useMutation({
    mutationFn: (id: string) => productBomApi.lockBom(id),
    onSuccess: () => {
      message.success('BOM 已锁定')
      queryClient.invalidateQueries({ queryKey: ['product-boms'] })
      queryClient.invalidateQueries({ queryKey: ['product-bom-tree'] })
    },
  })

  const newVersionMutation = useMutation({
    mutationFn: (id: string) => productBomApi.newVersion(id),
    onSuccess: (newId: any) => {
      message.success('新版本创建成功')
      queryClient.invalidateQueries({ queryKey: ['product-boms'] })
      queryClient.invalidateQueries({ queryKey: ['product-bom-tree'] })
      const id = typeof newId === 'string' ? newId : (newId as any)?.data
      if (id) navigate(`/technology/product-bom/${id}`)
    },
  })

  const handleSearch = (values: Record<string, unknown>) => {
    setFilters(values)
    reset()
  }

  const handleReset = () => {
    setFilters({})
    reset()
  }

  const handleAdd = async () => {
    try {
      const prods = await productBomApi.getProducts()
      setProducts(ensureArray(prods) as any)
    } catch {
      setProducts([])
    }
    setSelectedProduct(null)
    setAddModalOpen(true)
  }

  const handleAddConfirm = () => {
    if (!selectedProduct) {
      message.warning('请选择产品物料')
      return
    }
    const prod = products.find(p => p.materiel === selectedProduct)
    saveMutation.mutate({
      productCode: selectedProduct,
      nodeName: prod?.materielDesc || selectedProduct,
      remark: '',
    })
  }

  const handleEdit = (record: ProductBom) => {
    navigate(`/technology/product-bom/${record.id}`)
  }

  const handleDelete = (record: ProductBom) => {
    deleteMutation.mutate(record.id)
  }

  const handleLock = (record: ProductBom) => {
    lockMutation.mutate(record.id)
  }

  const handleNewVersion = (record: ProductBom) => {
    newVersionMutation.mutate(record.id)
  }

  const columns = [
    {
      title: 'BOM编码',
      dataIndex: 'bomCode',
      key: 'bomCode',
      render: (val: string, record: ProductBom) => (
        <a onClick={() => handleEdit(record)}>{val}</a>
      ),
    },
    {
      title: '产品物料编码',
      dataIndex: 'productCode',
      key: 'productCode',
    },
    {
      title: '节点名称',
      dataIndex: 'nodeName',
      key: 'nodeName',
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (val: string) => {
        const s = statusMap[val] || { text: val, color: 'default' }
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: ProductBom) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>
            {record.status === 'locked' ? '查看' : '编辑'}
          </Button>
          {record.status === 'draft' && (
            <>
              <Popconfirm
                title="确认锁定BOM结构？锁定后不可编辑。"
                onConfirm={() => handleLock(record)}
              >
                <Button type="link" size="small">
                  锁定
                </Button>
              </Popconfirm>
              <Popconfirm title="确定要删除该BOM吗？" onConfirm={() => handleDelete(record)}>
                <Button type="link" size="small" danger>
                  删除
                </Button>
              </Popconfirm>
            </>
          )}
          {record.status === 'locked' && (
            <Popconfirm
              title={`将在 ${record.version} 基础上创建新版本？`}
              onConfirm={() => handleNewVersion(record)}
            >
              <Button type="link" size="small">
                新版本
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  const buildTreeNodes = (nodes: ProductBom[]): DataNode[] => {
    return nodes.map((node: ProductBom) => ({
      key: node.id,
      title: `${node.level === 0 ? '🏭 ' : node.level === 1 ? '🔧 ' : '📦 '}${node.nodeName || ''} [${node.status === 'locked' ? '已锁定' : '草稿'}] ${node.version || ''}`,
      children: node.children ? buildTreeNodes(node.children) : undefined,
    }))
  }

  return (
    <PageContainer>
      <SearchForm onSearch={handleSearch} onReset={handleReset} loading={isLoading}>
        <Form.Item name="productCodeLike">
          <Input placeholder="产品编码" />
        </Form.Item>
        <Form.Item name="nodeNameLike">
          <Input placeholder="节点名称" />
        </Form.Item>
      </SearchForm>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Radio.Group
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            optionType="button"
            buttonStyle="solid"
            size="small"
          >
            <Radio.Button value="list">
              <UnorderedListOutlined /> 列表
            </Radio.Button>
            <Radio.Button value="tree">
              <ApartmentOutlined /> 树形
            </Radio.Button>
          </Radio.Group>
        </Space>
        <PermissionGuard perm="product-bom:add">
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增
          </Button>
        </PermissionGuard>
      </div>

      {viewMode === 'list' ? (
        <PageTable
          rowKey="id"
          columns={columns}
          dataSource={ensureArray(data?.records)}
          loading={isLoading}
          total={data?.total || 0}
          pagination={{ current: pagination.current, pageSize: pagination.pageSize }}
          onChange={onChange}
        />
      ) : (
        <div style={{ padding: 16 }}>
          <Tree
            showLine={{ showLeafIcon: false }}
            defaultExpandAll
            treeData={buildTreeNodes(ensureArray(treeData) as ProductBom[])}
          />
        </div>
      )}

      <Modal
        title="新增产品 BOM"
        open={addModalOpen}
        onOk={handleAddConfirm}
        onCancel={() => setAddModalOpen(false)}
        confirmLoading={saveMutation.isPending}
      >
        <Form layout="vertical">
          <Form.Item label="选择产品物料（仅显示产品类型）" required>
            <Select
              showSearch
              placeholder="请选择产品物料"
              value={selectedProduct}
              onChange={setSelectedProduct}
              optionFilterProp="label"
              options={products.map(p => ({
                label: `${p.materiel} - ${p.materielDesc}`,
                value: p.materiel,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
