import { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@workspace/ui'
import { PackageCheck } from 'lucide-react'
import FormDialog from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { warehousePage } from '@/api/basedata/warehouse'
import { postReceiptItem } from '@/api/inventory/receipt'
import LocationSelect from '../LocationSelect'
import type { SpWarehouseReceiptItem } from '@/types/inventory'

interface Props {
  item: SpWarehouseReceiptItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FETCH_SIZE = 200

export default function ReceiptPostDialog({ item, open, onOpenChange }: Props) {
  const [warehouseId, setWarehouseId] = useState('')
  const [locationId, setLocationId] = useState('')

  // 弹窗打开才拉库房;客户端过滤零件库
  const { data: whPage } = useQuery$(
    ['basedata', 'warehouse', 'page', { current: 1, size: FETCH_SIZE }],
    () => warehousePage({ current: 1, size: FETCH_SIZE }),
    { enabled: open },
  )
  const warehouses = (whPage?.records ?? []).filter((w) => w.type === '零件库')

  const { mutate, loading } = useMutation$(
    (dto: { itemId: string; warehouseId: string; locationId: string }) => postReceiptItem(dto),
  )

  useEffect(() => {
    if (open) {
      setWarehouseId('')
      setLocationId('')
    }
  }, [open])

  const onSubmit = async () => {
    if (!item) return
    if (!warehouseId) { toast.error('请选择库房'); return }
    if (!locationId) { toast.error('请选择库位'); return }
    try {
      await mutate({ itemId: item.id, warehouseId, locationId })
      toast.success('入库登账成功')
      invalidate('["inventory","receipt"')
      invalidate('["inventory","stock"')
      onOpenChange(false)
    } catch {
      /* 拦截器已 toast(混放/归属/零件库等业务校验) */
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="入库登账"
      description={item ? `${item.materialCode} · 数量 ${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : ''}
      icon={PackageCheck}
      onSubmit={onSubmit}
      submitting={loading}
      submitText="确认登账"
    >
      <FormField label="库房" required help="仅可选择零件库类型库房">
        <Select value={warehouseId || undefined} onValueChange={(v) => { setWarehouseId(v); setLocationId('') }}>
          <SelectTrigger className="w-full"><SelectValue placeholder="请选择库房" /></SelectTrigger>
          <SelectContent>
            {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}（{w.code}）</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="库位" required help="一库位一物料;已占其他物料的库位不可选">
        <LocationSelect
          warehouseId={warehouseId}
          materialCode={item?.materialCode ?? ''}
          value={locationId}
          onChange={setLocationId}
          disabled={!warehouseId}
        />
      </FormField>
    </FormDialog>
  )
}
