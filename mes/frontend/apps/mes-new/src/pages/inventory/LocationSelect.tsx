import { useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@workspace/ui'
import { useQuery$ } from '@/http/hooks'
import { warehouseLocations } from '@/api/basedata/warehouse'
import { pageInventory } from '@/api/inventory/stock'
import { locationAvailability, locationOptionLabel } from './inventoryStatus'

interface LocationSelectProps {
  warehouseId: string
  materialCode: string
  value: string
  onChange: (locationId: string) => void
  disabled?: boolean
}

/** 拉取库存上限(端点无库房入参,前端按 warehouseId 过滤建占用映射) */
const OCCUPANCY_FETCH_SIZE = 1000

/** 排序权重:可选(空闲/可累加)在前,已占在后 */
const RANK: Record<string, number> = { empty: 0, same: 1, other: 2 }

/** 库位选择器:显示每个库位对当前物料的三态,已占他物料的禁选 */
export default function LocationSelect({ warehouseId, materialCode, value, onChange, disabled }: LocationSelectProps) {
  const { data: locations } = useQuery$(
    ['basedata', 'warehouse', 'locations', warehouseId],
    () => warehouseLocations(warehouseId),
    { enabled: !!warehouseId },
  )
  const { data: invPage } = useQuery$(
    ['inventory', 'stock', 'page', { current: 1, size: OCCUPANCY_FETCH_SIZE }],
    () => pageInventory({ current: 1, size: OCCUPANCY_FETCH_SIZE }),
    { enabled: !!warehouseId },
  )

  // locationId → 该库位当前所存物料编码(仅本库房)
  const occupancy = useMemo(() => {
    const map = new Map<string, string>()
    for (const inv of invPage?.records ?? []) {
      if (inv.warehouseId === warehouseId && inv.locationId) {
        map.set(inv.locationId, inv.materialCode)
      }
    }
    return map
  }, [invPage, warehouseId])

  const options = useMemo(() => {
    const list = (locations ?? []).map((l) => {
      const occupiedBy = occupancy.get(l.id)
      const avail = locationAvailability(occupiedBy, materialCode)
      return {
        id: l.id,
        code: l.code,
        label: locationOptionLabel(l.code, occupiedBy, materialCode),
        disabled: avail === 'other',
        rank: RANK[avail],
      }
    })
    return list.sort((a, b) => a.rank - b.rank || a.code.localeCompare(b.code))
  }, [locations, occupancy, materialCode])

  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={warehouseId ? '请选择库位' : '请先选择库房'} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id} disabled={o.disabled} className={cn(o.disabled && 'text-muted-foreground')}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
