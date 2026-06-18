import type { ReactNode } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui'
import type { SpWarehouse, SpWarehouseLocation } from '@/types/warehouse'
import type { SpInventory } from '@/types/inventory'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  location: SpWarehouseLocation | null
  warehouse: SpWarehouse | null
  inventory: SpInventory | null
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-foreground">{value || '—'}</dd>
    </div>
  )
}

export default function LocationDetailSheet({ open, onOpenChange, location, warehouse, inventory }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-[360px] flex-col gap-0 p-0 sm:max-w-[360px]">
        <SheetHeader className="gap-2 border-b px-5 pb-4 pr-12 pt-5">
          <SheetTitle className="text-base">{location?.code || '库位详情'}</SheetTitle>
          <SheetDescription>{warehouse?.name || '—'}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Field label="库位码" value={location?.code} />
            <Field
              label="坐标"
              value={
                location
                  ? `${location.groupNo}组·${location.rowNo}排·${location.layerNo}层·${location.colNo}列`
                  : '—'
              }
            />
          </dl>

          {inventory ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
              <Field label="物料编码" value={inventory.materialCode} />
              <Field label="物料描述" value={inventory.materialDesc} />
              <Field
                label="在库量"
                value={`${inventory.quantity}${inventory.unit ? ' ' + inventory.unit : ''}`}
              />
              <Field label="状态" value={inventory.status} />
              <Field label="最近入库" value={inventory.lastInboundTime} />
            </dl>
          ) : (
            <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              空库位（暂无在库物料）
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
