// apps/mes-new/src/pages/basedata/warehouse/WarehouseLocations.tsx
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui'
import { MapPin } from 'lucide-react'
import RelatedPanel from '@/components/RelatedPanel'
import { useQuery$ } from '@/http/hooks'
import { warehouseLocations } from '@/api/basedata/warehouse'
import type { SpWarehouse } from '@/types/warehouse'

interface Props {
  warehouse: SpWarehouse
}

export default function WarehouseLocations({ warehouse }: Props) {
  const { data: locations } = useQuery$(
    ['basedata', 'warehouse', 'locations', warehouse.id],
    () => warehouseLocations(warehouse.id),
  )
  const list = locations ?? []
  const total = warehouse.groups * warehouse.rows * warehouse.layers * warehouse.columns

  return (
    <RelatedPanel
      icon={MapPin}
      title="库位"
      count={list.length}
      actions={
        <Badge variant="outline">
          {warehouse.groups}组 × {warehouse.rows}排 × {warehouse.layers}层 × {warehouse.columns}列 = {total}
        </Badge>
      }
    >
      {list.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">暂无库位(保存仓库后自动生成)</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>库位编码</TableHead>
              <TableHead>组</TableHead>
              <TableHead>排</TableHead>
              <TableHead>层</TableHead>
              <TableHead>列</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((loc) => (
              <TableRow key={loc.id}>
                <TableCell>{loc.code}</TableCell>
                <TableCell>{loc.groupNo}</TableCell>
                <TableCell>{loc.rowNo}</TableCell>
                <TableCell>{loc.layerNo}</TableCell>
                <TableCell>{loc.colNo}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </RelatedPanel>
  )
}
