import { useState } from 'react'
import {
  Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn,
} from '@workspace/ui'
import { ClipboardList, PackageMinus } from 'lucide-react'
import RelatedPanel from '@/components/RelatedPanel'
import PermissionGuard from '@/components/PermissionGuard'
import OutboundPostDialog from './OutboundPostDialog'
import { useQuery$ } from '@/http/hooks'
import { outboundItems } from '@/api/inventory/outbound'
import { postStatusMeta } from '../inventoryStatus'
import type { SpOutboundOrder, SpOutboundOrderItem } from '@/types/inventory'

interface Props {
  order: SpOutboundOrder
}

export default function OutboundItemsPanel({ order }: Props) {
  const [posting, setPosting] = useState<SpOutboundOrderItem | null>(null)
  const { data: items } = useQuery$(
    ['inventory', 'outbound', 'items', order.id],
    () => outboundItems(order.id),
  )
  const list = items ?? []

  return (
    <>
      <RelatedPanel icon={ClipboardList} title={`出库明细 · ${order.outboundCode}`} count={list.length}>
        {list.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">该出库单暂无明细</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>物料</TableHead>
                <TableHead className="text-right">数量</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>分配明细</TableHead>
                <TableHead className="w-24">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((it) => {
                const meta = postStatusMeta(it.postStatus)
                return (
                  <TableRow key={it.id}>
                    <TableCell>
                      <div className="font-medium">{it.materialCode}</div>
                      <div className="text-xs text-muted-foreground">{it.materialDesc || '—'}</div>
                    </TableCell>
                    <TableCell className="text-right">{it.quantity}{it.unit ? ` ${it.unit}` : ''}</TableCell>
                    <TableCell><Badge className={cn(meta.className)}>{meta.label}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{it.allocationDetail || '—'}</TableCell>
                    <TableCell>
                      {it.postStatus === 'pending' ? (
                        <PermissionGuard perm="inventory:outbound">
                          <Button size="sm" variant="outline" onClick={() => setPosting(it)}>
                            <PackageMinus className="size-4" />出库登账
                          </Button>
                        </PermissionGuard>
                      ) : null}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </RelatedPanel>

      <OutboundPostDialog item={posting} open={!!posting} onOpenChange={(o) => !o && setPosting(null)} />
    </>
  )
}
