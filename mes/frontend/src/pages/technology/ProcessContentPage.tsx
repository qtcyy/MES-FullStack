import { useState, useEffect } from 'react'
import { Select, Button, Steps, Form, Input, Radio, Upload, Table, Popconfirm, message, Space, Modal } from 'antd'
import { PlusOutlined, CheckCircleOutlined, InboxOutlined, FilePdfOutlined } from '@ant-design/icons'
import { useQuery, useMutation } from '@tanstack/react-query'
import PageContainer from '@/components/PageContainer'
import { ensureArray } from '@/utils/ensureArray'
import * as api from '@/api/technology/process-content'

const { Dragger } = Upload

export default function ProcessContentPage() {
  const [form] = Form.useForm()
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [selectedBomId, setSelectedBomId] = useState<string | null>(null)
  const [contentId, setContentId] = useState<string | null>(null)
  const [contentImages, setContentImages] = useState<string[]>([])
  const [inspectionImages, setInspectionImages] = useState<string[]>([])
  const [equipmentList, setEquipmentList] = useState<any[]>([])
  const [docList, setDocList] = useState<any[]>([])
  const [previewDoc, setPreviewDoc] = useState<any>(null)
  const [equipForm] = Form.useForm()

  const { data: products } = useQuery({ queryKey: ['pc-products'], queryFn: () => api.getProducts() })

  const { data: bomNodes } = useQuery({
    queryKey: ['pc-bom-nodes', selectedProductId],
    queryFn: () => api.listByProduct(selectedProductId!),
    enabled: !!selectedProductId,
  })

  const { data: contentData, refetch } = useQuery({
    queryKey: ['pc-content', selectedBomId],
    queryFn: () => api.getByBomId(selectedBomId!),
    enabled: !!selectedBomId,
  })

  const { data: bomItems } = useQuery({
    queryKey: ['pc-bom-items', selectedBomId],
    queryFn: () => api.getBomItems(selectedBomId!),
    enabled: !!selectedBomId,
  })

  useEffect(() => {
    if (contentData) {
      const c = (contentData as any).content
      if (c) {
        setContentId(c.id)
        setContentImages(c.contentImages ? c.contentImages.split(',').filter(Boolean) : [])
        setInspectionImages(c.inspectionImages ? c.inspectionImages.split(',').filter(Boolean) : [])
        form.setFieldsValue(c)
      } else {
        setContentId(null)
        setContentImages([])
        setInspectionImages([])
        form.resetFields()
      }
      setEquipmentList(ensureArray((contentData as any).equipment))
      setDocList(ensureArray((contentData as any).documents))
    }
  }, [contentData, form])

  useEffect(() => {
    setCurrentStep(0)
  }, [selectedBomId])

  const [pendingStep, setPendingStep] = useState<number | null>(null)

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.save(values),
    onSuccess: (newId: any) => {
      message.success('保存成功')
      if (!contentId) setContentId(newId as string)
      refetch()
      if (pendingStep !== null) {
        setCurrentStep(pendingStep)
        setPendingStep(null)
      }
    },
  })

  const handleSaveAndNext = (nextStep: number) => {
    form.validateFields().then(values => {
      setPendingStep(nextStep)
      saveMutation.mutate({ id: contentId, bomId: selectedBomId, ...values })
    })
  }

  const handleSaveOnly = () => {
    form.validateFields().then(values => {
      saveMutation.mutate({ id: contentId, bomId: selectedBomId, ...values })
    })
  }

  const completeMutation = useMutation({
    mutationFn: () => api.complete(contentId!),
    onSuccess: () => { message.success('编制完成！'); refetch() },
  })

  const equipSaveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.saveEquipment(values),
    onSuccess: () => { message.success('设备保存成功'); refetch(); equipForm.resetFields() },
  })

  const equipDelMutation = useMutation({
    mutationFn: (id: string) => api.deleteEquipment(id),
    onSuccess: () => { message.success('已删除'); refetch() },
  })

  const docSaveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.saveDocument(values),
    onSuccess: () => { message.success('文档保存成功'); refetch() },
  })

  const docDelMutation = useMutation({
    mutationFn: (id: string) => api.deleteDocument(id),
    onSuccess: () => { message.success('已删除'); refetch() },
  })

  const isCompleted = (contentData as any)?.content?.status === 'completed'


  const handleImageUpload = async (file: File, type: 'content' | 'inspection') => {
    const res: any = await api.uploadImage(file)
    const url = res?.url || res?.data?.url
    if (url) {
      if (type === 'content') {
        const imgs = [...contentImages, url]
        setContentImages(imgs)
        saveMutation.mutate({ id: contentId, bomId: selectedBomId, contentImages: imgs.join(',') })
      } else {
        const imgs = [...inspectionImages, url]
        setInspectionImages(imgs)
        saveMutation.mutate({ id: contentId, bomId: selectedBomId, inspectionImages: imgs.join(',') })
      }
    }
    return false
  }

  const handleDocUpload = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'pdf') {
      message.error('只支持 PDF 格式')
      return false
    }
    const res: any = await api.uploadDocument(file)
    const url = res?.url || res?.data?.url
    const name = res?.name || res?.data?.name || file.name
    if (url) {
      docSaveMutation.mutate({ contentId, name, filePath: url })
    }
    return false
  }

  const addEquipment = () => {
    equipForm.validateFields().then(v => {
      equipSaveMutation.mutate({ contentId, ...v })
    })
  }

  const bomItemColumns = [
    { title: '物料编码', dataIndex: 'materialCode', key: 'code' },
    { title: '物料描述', dataIndex: 'materialDesc', key: 'desc' },
    { title: '用量', dataIndex: 'quantity', key: 'qty' },
    { title: '单位', dataIndex: 'unit', key: 'unit' },
  ]

  const equipColumns = [
    { title: '设备名称', dataIndex: 'name' },
    { title: '数量', dataIndex: 'quantity' },
    { title: '备注', dataIndex: 'remark' },
    { title: '操作', render: (_: any, r: any) => !isCompleted ? (
      <Popconfirm title="确定删除？" onConfirm={() => equipDelMutation.mutate(r.id)}>
        <Button type="link" size="small" danger>删除</Button>
      </Popconfirm>
    ) : null },
  ]

  const docColumns = [
    { title: '文档名称', dataIndex: 'name' },
    { title: '操作', render: (_: any, r: any) => (
      <Space>
        <Button type="link" size="small" onClick={() => setPreviewDoc(r)}>预览</Button>
        {!isCompleted && (
          <Popconfirm title="确定删除？" onConfirm={() => docDelMutation.mutate(r.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        )}
      </Space>
    )},
  ]

  const steps = [
    { title: '工艺主信息' },
    { title: '工序要求' },
    { title: '辅助信息' },
    { title: '物料核对' },
    { title: '完成编制' },
  ]

  return (
    <PageContainer>
      <Space style={{ marginBottom: 16 }}>
        <Select style={{ width: 240 }} placeholder="选择产品" value={selectedProductId} onChange={v => { setSelectedProductId(v); setSelectedBomId(null) }}
          options={ensureArray(products).map((p: any) => ({ label: p.nodeName || p.productCode, value: p.id }))} />
        {selectedProductId && (
          <Select style={{ width: 240 }} placeholder="选择零部件节点" value={selectedBomId} onChange={setSelectedBomId}
            options={ensureArray(bomNodes).map((n: any) => ({ label: `${n.bomNode?.level === 0 ? '🏭' : n.bomNode?.level === 1 ? '🔧' : '📦'} ${n.bomNode?.nodeName}`, value: n.bomNode?.id }))} />
        )}
        {isCompleted && <span style={{ color: '#5cb85c' }}><CheckCircleOutlined /> 已编制完成</span>}
      </Space>

      {selectedBomId && (
        <>
          <Steps current={currentStep} onChange={isCompleted ? setCurrentStep : undefined} size="small" items={steps} style={{ marginBottom: 24 }} />

          <div style={{ maxWidth: 800 }}>
            {currentStep === 0 && (
              <Form form={form} layout="vertical" disabled={isCompleted}>
                <Form.Item name="mainInfo" label="工序主信息" rules={[{ required: true }]}>
                  <Input.TextArea rows={2} placeholder="如：主板单元装配作业 — 将CPU、内存等核心部件组装到主板上" />
                </Form.Item>
                <Form.Item name="content" label="工序内容" rules={[{ required: true }]}>
                  <Input.TextArea rows={5} placeholder="详细描述操作步骤..." />
                </Form.Item>
                <Form.Item label="工序图片">
                  <Upload listType="picture-card" showUploadList fileList={contentImages.map((url, i) => ({ uid: `c-${i}`, url, name: `img-${i}`, status: 'done' as const }))}
                    beforeUpload={(f) => { handleImageUpload(f, 'content'); return false }}>
                    {!isCompleted && <PlusOutlined />}
                  </Upload>
                </Form.Item>
                {!isCompleted && <Button type="primary" onClick={() => handleSaveAndNext(1)} loading={saveMutation.isPending}>保存并进入下一步</Button>}
              </Form>
            )}

            {currentStep === 1 && (
              <Form form={form} layout="vertical" disabled={isCompleted}>
                <Form.Item name="requirements" label="工序要求" rules={[{ required: true }]}>
                  <Input.TextArea rows={4} placeholder="如：CPU安装到位无歪斜，内存卡扣完全锁紧..." />
                </Form.Item>
                <Form.Item name="inspectionRequired" label="是否需要检验" initialValue="0">
                  <Radio.Group><Radio value="1">是</Radio><Radio value="0">否</Radio></Radio.Group>
                </Form.Item>
                <Form.Item label="检验标准图片">
                  <Upload listType="picture-card" showUploadList fileList={inspectionImages.map((url, i) => ({ uid: `i-${i}`, url, name: `ins-${i}`, status: 'done' as const }))}
                    beforeUpload={(f) => { handleImageUpload(f, 'inspection'); return false }}>
                    {!isCompleted && <PlusOutlined />}
                  </Upload>
                </Form.Item>
                {!isCompleted && <Button type="primary" onClick={() => handleSaveAndNext(2)} loading={saveMutation.isPending}>保存并进入下一步</Button>}
              </Form>
            )}

            {currentStep === 2 && (
              <>
                <Form form={form} layout="vertical" disabled={isCompleted}>
                  <Form.Item name="notes" label="注意事项">
                    <Input.TextArea rows={4} placeholder="如：操作前需佩戴防静电手环，主板需轻拿轻放..." />
                  </Form.Item>
                  {!isCompleted && <Button onClick={handleSaveOnly} loading={saveMutation.isPending}>保存注意事项</Button>}
                </Form>

                <h4 style={{ marginTop: 24 }}>工装设备</h4>
                <Table rowKey="id" columns={equipColumns} dataSource={equipmentList} pagination={false} size="small" />
                {!isCompleted && (
                  <Space style={{ marginTop: 8 }}>
                    <Form form={equipForm} layout="inline">
                      <Form.Item name="name" rules={[{ required: true }]}><Input placeholder="设备名称" /></Form.Item>
                      <Form.Item name="quantity" initialValue={1}><Input type="number" placeholder="数量" style={{ width: 80 }} /></Form.Item>
                      <Form.Item name="remark"><Input placeholder="备注" /></Form.Item>
                      <Button type="primary" onClick={addEquipment} loading={equipSaveMutation.isPending}>新增设备</Button>
                    </Form>
                  </Space>
                )}

                <h4 style={{ marginTop: 24 }}>技术文档</h4>
                <Table rowKey="id" columns={docColumns} dataSource={docList} pagination={false} size="small" />
                {!isCompleted && (
                  <Dragger style={{ marginTop: 8 }} showUploadList={false} accept=".pdf"
                    beforeUpload={(f) => { handleDocUpload(f); return false }}>
                    <InboxOutlined style={{ fontSize: 36 }} /><p>点击或拖拽上传技术文档（仅支持 PDF）</p>
                  </Dragger>
                )}

                {!isCompleted && <Button type="primary" style={{ marginTop: 16 }} onClick={() => setCurrentStep(3)}>保存并进入下一步</Button>}
              </>
            )}

            {currentStep === 3 && (
              <>
                <h4>物料清单核对</h4>
                <Table rowKey="id" columns={bomItemColumns} dataSource={ensureArray(bomItems)} pagination={false} size="small" />
                {!isCompleted && <Button type="primary" style={{ marginTop: 16 }} onClick={() => setCurrentStep(4)}>进入下一步</Button>}
              </>
            )}

            {currentStep === 4 && (
              <div style={{ textAlign: 'center', padding: 40 }}>
                {!isCompleted ? (
                  <Space direction="vertical" size="large">
                    <CheckCircleOutlined style={{ fontSize: 64, color: '#5cb85c' }} />
                    <h3>所有信息已编制完成</h3>
                    <Button type="primary" size="large" onClick={() => completeMutation.mutate()} loading={completeMutation.isPending}>
                      完成编制
                    </Button>
                  </Space>
                ) : (
                  <Space direction="vertical" size="large">
                    <CheckCircleOutlined style={{ fontSize: 64, color: '#5cb85c' }} />
                    <h3 style={{ color: '#5cb85c' }}>该工序内容已编制完成</h3>
                  </Space>
                )}
              </div>
            )}
          </div>
        </>
      )}
      <Modal
        open={!!previewDoc}
        title={<Space><FilePdfOutlined style={{ color: '#f5222d' }} />{previewDoc?.name || 'PDF 预览'}</Space>}
        onCancel={() => setPreviewDoc(null)}
        footer={null}
        width="80vw"
        style={{ top: 20 }}
        destroyOnClose
      >
        {previewDoc && (
          <iframe src={previewDoc.filePath} style={{ width: '100%', height: '75vh', border: 'none' }} title={previewDoc.name} />
        )}
      </Modal>
    </PageContainer>
  )
}
