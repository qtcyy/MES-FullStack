import { useState } from 'react'
import {
  Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn,
} from '@workspace/ui'
import { ClipboardList, PackageCheck } from 'lucide-react'
import RelatedPanel from '@/components/RelatedPanel'
import PermissionGuard from '@/components/PermissionGuard'
import ReceiptPostDialog from './ReceiptPostDialog'
import { useQuery$ } from '@/http/hooks'
import { receiptItems } from '@/api/inventory/receipt'
import { postStatusMeta } from '../inventoryStatus'
import type { SpWarehouseReceipt, SpWarehouseReceiptItem } from '@/types/inventory'

interface Props {
  receipt: SpWarehouseReceipt
}

export default function ReceiptItemsPanel({ receipt }: Props) {
  const [posting, setPosting] = useState<SpWarehouseReceiptItem | null>(null)
  const { data: items } = useQuery$(
    ['inventory', 'receipt', 'items', receipt.id],
    () => receiptItems(receipt.id),
  )
  const list = items ?? []

  return (
    <>
      <RelatedPanel icon={ClipboardList} title={`入库明细 · ${receipt.receiptCode}`} count={list.length}>
        {list.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">该入库单暂无明细</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>物料</TableHead>
                <TableHead className="text-right">数量</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>库位</TableHead>
                <TableHead className="w-20">操作</TableHead>
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
                    <TableCell className="text-xs text-muted-foreground">
                      {it.postStatus === 'posted' ? `${it.warehouseName ?? ''} / ${it.locationCode ?? ''}` : '—'}
                    </TableCell>
                    <TableCell>
                      {it.postStatus === 'pending' ? (
                        <PermissionGuard perm="inventory:inbound">
                          <Button size="sm" variant="outline" onClick={() => setPosting(it)}>
                            <PackageCheck className="size-4" />登账
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

      <ReceiptPostDialog item={posting} open={!!posting} onOpenChange={(o) => !o && setPosting(null)} />
    </>
  )
}
