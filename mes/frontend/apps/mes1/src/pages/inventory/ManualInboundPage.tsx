import { useState, useEffect } from 'react'
import { Card, Form, Select, InputNumber, Button, message } from 'antd'
import { useMutation } from '@tanstack/react-query'
import PageContainer from '@/components/PageContainer'
import * as inventoryApi from '@/api/inventory/inventory'
import * as warehouseApi from '@/api/basedata/warehouse'
import * as materileApi from '@/api/basedata/materile'
import type { ManualInboundDTO } from '@/types/inventory'
import type { SpWarehouse, SpWarehouseLocation } from '@/types/warehouse'
import type { Materiel } from '@/types/common'

export default function ManualInboundPage() {
  const [form] = Form.useForm()
  const [materials, setMaterials] = useState<Materiel[]>([])
  const [warehouses, setWarehouses] = useState<SpWarehouse[]>([])
  const [locations, setLocations] = useState<SpWarehouseLocation[]>([])

  useEffect(() => {
    materileApi
      .page({ current: 1, size: 200 })
      .then((res) => setMaterials((res.records ?? []).filter((m) => m.deleted === '0')))
      .catch((e) => message.error('加载物料失败: ' + (e as Error).message))
    warehouseApi
      .getList()
      .then((list) => setWarehouses(list.filter((w) => w.type === '零件库' && w.deleted === '0')))
      .catch((e) => message.error('加载库房失败: ' + (e as Error).message))
  }, [])

  const mutation = useMutation({
    mutationFn: (dto: ManualInboundDTO) => inventoryApi.manualInbound(dto),
    onSuccess: () => {
      message.success('手动入库成功')
      form.resetFields()
      setLocations([])
    },
    onError: (e: Error) => message.error(e.message || '手动入库失败'),
  })

  const handleWarehouseChange = (warehouseId: string) => {
    form.setFieldValue('locationId', undefined)
    warehouseApi
      .getLocations(warehouseId)
      .then(setLocations)
      .catch((e) => message.error('加载库位失败: ' + (e as Error).message))
  }

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const mat = materials.find((m) => m.materiel === values.materialCode)
      mutation.mutate({
        materialCode: values.materialCode,
        materialDesc: mat?.materielDesc,
        unit: mat?.unit,
        warehouseId: values.warehouseId,
        locationId: values.locationId,
        quantity: values.quantity,
      })
    })
  }

  return (
    <PageContainer title="手动入库">
      <Card style={{ maxWidth: 520 }}>
        <Form form={form} layout="vertical">
          <Form.Item name="materialCode" label="物料" rules={[{ required: true, message: '请选择物料' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="选择物料"
              options={materials.map((m) => ({ value: m.materiel, label: `${m.materiel} - ${m.materielDesc}` }))}
            />
          </Form.Item>
          <Form.Item name="warehouseId" label="库房" rules={[{ required: true, message: '请选择库房' }]}>
            <Select
              placeholder="选择零件库(如电脑配件库)"
              onChange={handleWarehouseChange}
              options={warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))}
            />
          </Form.Item>
          <Form.Item name="locationId" label="库位" rules={[{ required: true, message: '请选择库位' }]}>
            <Select
              placeholder={locations.length === 0 ? '请先选择库房' : '选择库位'}
              disabled={locations.length === 0}
              options={locations.map((l) => ({ value: l.id, label: l.code }))}
            />
          </Form.Item>
          <Form.Item name="quantity" label="数量" rules={[{ required: true, message: '请输入数量' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={handleSubmit} loading={mutation.isPending}>
              提交补货
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </PageContainer>
  )
}
