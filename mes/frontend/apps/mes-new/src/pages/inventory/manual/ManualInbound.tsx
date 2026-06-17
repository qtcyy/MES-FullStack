import { useState } from 'react'
import {
  Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast,
} from '@workspace/ui'
import PageContainer from '@/components/PageContainer'
import FormField from '@/components/FormField'
import { FormSection } from '@/components/FormDialog'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { materilePage } from '@/api/basedata/materile'
import { warehousePage } from '@/api/basedata/warehouse'
import { manualInbound } from '@/api/inventory/stock'
import LocationSelect from '../LocationSelect'
import type { ManualInboundDTO } from '@/types/inventory'

const FETCH_SIZE = 200

export default function ManualInbound() {
  const [materialCode, setMaterialCode] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [quantity, setQuantity] = useState('')

  const { data: matPage } = useQuery$(
    ['basedata', 'materile', 'page', { current: 1, size: FETCH_SIZE }],
    () => materilePage({ current: 1, size: FETCH_SIZE }),
  )
  const { data: whPage } = useQuery$(
    ['basedata', 'warehouse', 'page', { current: 1, size: FETCH_SIZE }],
    () => warehousePage({ current: 1, size: FETCH_SIZE }),
  )
  const materials = matPage?.records ?? []
  const warehouses = (whPage?.records ?? []).filter((w) => w.type === '零件库')

  const { mutate, loading } = useMutation$((dto: ManualInboundDTO) => manualInbound(dto))

  const reset = () => { setMaterialCode(''); setWarehouseId(''); setLocationId(''); setQuantity('') }

  const onSubmit = async () => {
    const mat = materials.find((m) => m.materiel === materialCode)
    if (!materialCode || !mat) { toast.error('请选择物料'); return }
    if (!warehouseId) { toast.error('请选择库房'); return }
    if (!locationId) { toast.error('请选择库位'); return }
    const qty = Number(quantity)
    if (!quantity || Number.isNaN(qty) || qty <= 0) { toast.error('入库数量必须大于 0'); return }
    try {
      await mutate({
        materialCode: mat.materiel,
        materialDesc: mat.materielDesc,
        unit: mat.unit,
        warehouseId,
        locationId,
        quantity: qty,
      })
      toast.success('手动入库成功')
      invalidate('["inventory","stock"')
      reset()
    } catch {
      /* 拦截器已 toast(混放/归属/零件库等) */
    }
  }

  return (
    <PageContainer title="手动入库" description="补货/退货等非计划入库,直接生成库存台账">
      <div className="max-w-xl rounded-lg border border-border bg-card p-6">
        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); onSubmit() }}>
          <FormSection title="入库信息" tag="必填">
            <FormField label="物料" required>
              <Select value={materialCode || undefined} onValueChange={(v) => { setMaterialCode(v); setLocationId('') }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="请选择物料" /></SelectTrigger>
                <SelectContent>
                  {materials.map((m) => <SelectItem key={m.id} value={m.materiel}>{m.materiel} · {m.materielDesc}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="库房" required help="仅零件库">
                <Select value={warehouseId || undefined} onValueChange={(v) => { setWarehouseId(v); setLocationId('') }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="请选择库房" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}（{w.code}）</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="库位" required help="已占其他物料的库位不可选">
                <LocationSelect
                  warehouseId={warehouseId}
                  materialCode={materialCode}
                  value={locationId}
                  onChange={setLocationId}
                  disabled={!warehouseId}
                />
              </FormField>
            </div>
            <FormField label="数量" htmlFor="mi-qty" required>
              <Input id="mi-qty" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </FormField>
          </FormSection>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={reset}>重置</Button>
            <Button type="submit" disabled={loading}>{loading ? '提交中…' : '确认入库'}</Button>
          </div>
        </form>
      </div>
    </PageContainer>
  )
}
