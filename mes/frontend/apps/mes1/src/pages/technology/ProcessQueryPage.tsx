import { useState } from 'react'
import { Select, Tree, Collapse, Table, Image, Tag, Modal, Space, Button, Empty } from 'antd'
import { CheckCircleOutlined, FilePdfOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import PageContainer from '@/components/PageContainer'
import { ensureArray } from '@/utils/ensureArray'
import * as api from '@/api/technology/process-content'
import type { DataNode } from 'antd/es/tree'

export default function ProcessQueryPage() {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [selectedBomId, setSelectedBomId] = useState<string | null>(null)
  const [previewPdf, setPreviewPdf] = useState<string | null>(null)

  const { data: products } = useQuery({ queryKey: ['pq-products'], queryFn: () => api.getProducts() })

  const { data: bomNodes } = useQuery({
    queryKey: ['pq-bom-nodes', selectedProductId],
    queryFn: () => api.listByProduct(selectedProductId!),
    enabled: !!selectedProductId,
  })

  const { data: contentData } = useQuery({
    queryKey: ['pq-content', selectedBomId],
    queryFn: () => api.getByBomId(selectedBomId!),
    enabled: !!selectedBomId,
  })

  const { data: bomItems } = useQuery({
    queryKey: ['pq-bom-items', selectedBomId],
    queryFn: () => api.getBomItems(selectedBomId!),
    enabled: !!selectedBomId,
  })

  const nodeList = ensureArray(bomNodes)
  const contentInfo = (contentData as any)?.content
  const equipList = ensureArray((contentData as any)?.equipment)
  const docList = ensureArray((contentData as any)?.documents)
  const contentImages = contentInfo?.contentImages ? contentInfo.contentImages.split(',').filter(Boolean) : []
  const inspectionImages = contentInfo?.inspectionImages ? contentInfo.inspectionImages.split(',').filter(Boolean) : []

  const buildTree = (): DataNode[] => {
    const map = new Map<string, any>()
    nodeList.forEach((n: any) => {
      const node = n.bomNode
      const isCompleted = n.content?.status === 'completed'
      map.set(node.id, {
        key: node.id,
        title: (
          <span onClick={() => setSelectedBomId(node.id)}>
            {node.level === 0 ? '🏭 ' : node.level === 1 ? '🔧 ' : '📦 '}
            {node.nodeName}
            {isCompleted && <CheckCircleOutlined style={{ color: '#5cb85c', marginLeft: 8 }} />}
          </span>
        ),
        children: [] as DataNode[],
      })
    })

    const roots: DataNode[] = []
    nodeList.forEach((n: any) => {
      const node = n.bomNode
      const treeNode = map.get(node.id)
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId).children.push(treeNode)
      } else {
        roots.push(treeNode)
      }
    })
    return roots
  }

  const equipColumns = [
    { title: '设备名称', dataIndex: 'name' },
    { title: '数量', dataIndex: 'quantity' },
    { title: '备注', dataIndex: 'remark' },
  ]

  const docColumns = [
    { title: '文档名称', dataIndex: 'name' },
    { title: '操作', render: (_: any, r: any) => (
      <Button type="link" size="small" onClick={() => setPreviewPdf(r.filePath)}>预览</Button>
    )},
  ]

  const itemColumns = [
    { title: '物料编码', dataIndex: 'materialCode' },
    { title: '物料描述', dataIndex: 'materialDesc' },
    { title: '用量', dataIndex: 'quantity' },
    { title: '单位', dataIndex: 'unit' },
  ]

  const collapseItems = [
    {
      key: '1', label: '工艺主信息',
      children: (
        <div>
          <p><strong>工序主信息：</strong>{contentInfo?.mainInfo || '-'}</p>
          <p><strong>工序内容：</strong>{contentInfo?.content || '-'}</p>
          {contentImages.length > 0 && (
            <div><strong>工序图片：</strong>
              <Image.PreviewGroup>{contentImages.map((url: string, i: number) => <Image key={i} src={url} width={120} style={{ marginRight: 8 }} />)}</Image.PreviewGroup>
            </div>
          )}
        </div>
      ),
    },
    {
      key: '2', label: '工序要求',
      children: (
        <div>
          <p><strong>工序要求：</strong>{contentInfo?.requirements || '-'}</p>
          <p><strong>是否检验：</strong>{contentInfo?.inspectionRequired === '1' ? <Tag color="blue">是</Tag> : <Tag>否</Tag>}</p>
          {inspectionImages.length > 0 && (
            <div><strong>检验标准图片：</strong>
              <Image.PreviewGroup>{inspectionImages.map((url: string, i: number) => <Image key={i} src={url} width={120} style={{ marginRight: 8 }} />)}</Image.PreviewGroup>
            </div>
          )}
        </div>
      ),
    },
    {
      key: '3', label: '注意事项',
      children: <p>{contentInfo?.notes || '-'}</p>,
    },
    {
      key: '4', label: '工装设备',
      children: <Table rowKey="id" columns={equipColumns} dataSource={equipList} pagination={false} size="small" />,
    },
    {
      key: '5', label: '技术文档',
      children: <Table rowKey="id" columns={docColumns} dataSource={docList} pagination={false} size="small" />,
    },
    {
      key: '6', label: '物料清单',
      children: <Table rowKey="id" columns={itemColumns} dataSource={ensureArray(bomItems)} pagination={false} size="small" />,
    },
  ]

  return (
    <PageContainer>
      <Space style={{ marginBottom: 16 }}>
        <Select style={{ width: 260 }} placeholder="选择产品" value={selectedProductId}
          onChange={v => { setSelectedProductId(v); setSelectedBomId(null) }}
          options={ensureArray(products).map((p: any) => ({ label: p.nodeName || p.productCode, value: p.id }))} />
      </Space>

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: '0 0 300px', border: '1px solid #d9d9d9', borderRadius: 8, padding: 12, minHeight: 400 }}>
          <h4 style={{ marginBottom: 8 }}>BOM 结构</h4>
          {nodeList.length > 0 ? (
            <Tree showLine defaultExpandAll treeData={buildTree()} selectedKeys={selectedBomId ? [selectedBomId] : []}
              onSelect={keys => { if (keys.length > 0) setSelectedBomId(keys[0] as string) }} />
          ) : (
            <Empty description="请选择产品" />
          )}
        </div>

        <div style={{ flex: 1, border: '1px solid #d9d9d9', borderRadius: 8, padding: 12, minHeight: 400 }}>
          {selectedBomId && contentInfo ? (
            <>
              <h4 style={{ marginBottom: 12 }}>
                {contentInfo.status === 'completed' && <CheckCircleOutlined style={{ color: '#5cb85c', marginRight: 8 }} />}
                工艺详情 {contentInfo.status === 'completed' ? '(已完成)' : '(草稿)'}
              </h4>
              <Collapse items={collapseItems} defaultActiveKey={['1']} />
            </>
          ) : (
            <Empty description="请选择 BOM 节点查看工艺详情" />
          )}
        </div>
      </div>

      <Modal open={!!previewPdf} title={<Space><FilePdfOutlined style={{ color: '#f5222d' }} />PDF 预览</Space>}
        onCancel={() => setPreviewPdf(null)} footer={null} width="80vw" style={{ top: 20 }} destroyOnClose>
        {previewPdf && <iframe src={previewPdf} style={{ width: '100%', height: '75vh', border: 'none' }} />}
      </Modal>
    </PageContainer>
  )
}
