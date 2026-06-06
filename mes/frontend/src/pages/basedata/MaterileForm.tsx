import { useEffect, useState } from 'react'
import { Form, Input, Radio, Select, InputNumber, Upload, message, Row, Col, Divider } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd/es/form'
import * as flowApi from '@/api/technology/flow'
import type { Flow } from '@/types/common'

interface MaterileFormProps {
  id?: string | null
  record?: any | null
  onFinish?: (values: any) => void
  formInstance: FormInstance
}

const MAT_TYPE_OPTIONS = ['产品', '零件', '标准件', '其他']
const SOURCE_OPTIONS = ['自制', '外购']

const TYPE_DEFAULTS: Record<string, { source: string; leadTime: number }> = {
  '产品': { source: '自制', leadTime: 3 },
  '零件': { source: '外购', leadTime: 1 },
  '标准件': { source: '外购', leadTime: 1 },
  '其他': { source: '外购', leadTime: 1 },
}

function MaterileForm({ id, record, onFinish, formInstance }: MaterileFormProps) {
  const [flowOptions, setFlowOptions] = useState<Flow[]>([])
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    flowApi.flowList().then((res: any) => {
      setFlowOptions(Array.isArray(res) ? res : [])
    })
  }, [])

  useEffect(() => {
    if (id && record) {
      formInstance.setFieldsValue(record)
      setImageUrl(record.imageUrl || null)
    } else if (!id) {
      formInstance.resetFields()
      setImageUrl(null)
    }
  }, [id, record, formInstance])

  const handleFinish = (values: any) => {
    onFinish?.({ ...values, imageUrl })
  }

  const handleTypeChange = (matType: string) => {
    const defaults = TYPE_DEFAULTS[matType]
    if (defaults) {
      formInstance.setFieldsValue({ source: defaults.source, leadTime: defaults.leadTime })
    }
  }

  const [uploading, setUploading] = useState(false)

  const handleUpload = async (options: any) => {
    const { file, onSuccess, onError } = options
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { default: client } = await import('@/api/client')
      const res = await client.post('/basedata/materile/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = (res as any)?.url || ''
      setImageUrl(url)
      onSuccess?.({ url }, file)
      message.success('上传成功')
    } catch {
      onError?.(new Error('上传失败'))
      message.error('上传失败')
    }
    setUploading(false)
  }

  return (
    <Form
      form={formInstance}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{ deleted: '0', leadTime: 1, safetyStock: 0 }}
    >
      <Divider plain style={{ fontSize: 13, marginTop: 0 }}>基本信息</Divider>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="matType" label="物料类型" rules={[{ required: true, message: '请选择' }]}>
            <Select placeholder="请选择物料类型" onChange={handleTypeChange}>
              {MAT_TYPE_OPTIONS.map((t) => (
                <Select.Option key={t} value={t}>{t}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="materiel" label="物料编码" tooltip="由系统自动生成">
            <Input placeholder="自动生成" disabled />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="materielDesc" label="物料描述" rules={[{ required: true, message: '请输入' }]}>
            <Input placeholder="请输入物料描述" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="model" label="型号">
            <Input placeholder="请输入型号" />
          </Form.Item>
        </Col>
      </Row>

      <Divider plain style={{ fontSize: 13 }}>属性信息</Divider>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="unit" label="单位">
            <Input placeholder="例如：个、台、kg" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="source" label="物料来源">
            <Select placeholder="请选择物料来源" allowClear>
              {SOURCE_OPTIONS.map((s) => <Select.Option key={s} value={s}>{s}</Select.Option>)}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="size" label="规格">
            <Input placeholder="请输入规格" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="productGroup" label="产品组">
            <Input placeholder="请输入产品组" />
          </Form.Item>
        </Col>
      </Row>

      <Divider plain style={{ fontSize: 13 }}>库存与工艺</Divider>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="leadTime" label="需求提前期(天)" tooltip="最小为1天">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="safetyStock" label="安全库存">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Form.Item name="flowId" label="工艺">
            <Select placeholder="请选择工艺" allowClear>
              {flowOptions.map((f) => (
                <Select.Option key={f.id} value={f.id}>{f.flow} - {f.flowDesc}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Divider plain style={{ fontSize: 13 }}>图片与状态</Divider>

      <Form.Item label="物料图片">
        <Upload
          accept=".jpg,.jpeg,.png"
          listType="picture-card"
          showUploadList={false}
          customRequest={handleUpload}
          beforeUpload={(file) => {
            const isImage = file.type.startsWith('image/')
            if (!isImage) { message.error('仅支持图片文件'); return Upload.LIST_IGNORE }
            const isLt2M = file.size / 1024 / 1024 < 2
            if (!isLt2M) { message.error('图片大小不能超过2MB'); return Upload.LIST_IGNORE }
            return true
          }}
        >
          {imageUrl ? (
            <img src={imageUrl} alt="物料图片" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
          ) : (
            <div>
              <PlusOutlined />
              <div style={{ marginTop: 8 }}>上传图片</div>
            </div>
          )}
        </Upload>
        {imageUrl && (
          <a onClick={() => setImageUrl(null)} style={{ display: 'block', marginTop: 4, color: '#ff4d4f', fontSize: 12 }}>
            移除图片
          </a>
        )}
      </Form.Item>

      <Form.Item name="deleted" label="状态" rules={[{ required: true }]}>
        <Radio.Group>
          <Radio value="0">正常</Radio>
          <Radio value="1">已删除</Radio>
        </Radio.Group>
      </Form.Item>
    </Form>
  )
}

export default MaterileForm
