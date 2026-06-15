// apps/mes-new/src/pages/basedata/device-group/DeviceGroupMembers.tsx
import { useState } from 'react'
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from '@workspace/ui'
import { Cpu, Settings2, Trash2 } from 'lucide-react'
import RelatedPanel from '@/components/RelatedPanel'
import DualListTransfer from '@/components/DualListTransfer'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import {
  deviceGroupItems,
  deviceGroupItemsAdd,
  deviceGroupItemsRemove,
  devicePage,
} from '@/api/basedata/device-group'
import { excludeSelected, type TransferItem } from '@/utils/transfer'
import type { SpDevice, SpDeviceGroup } from '@/types/device'

interface Props {
  group: SpDeviceGroup
}

/** 候选设备拉取上限(穿梭弹窗内可再搜索过滤) */
const CANDIDATE_SIZE = 200

export default function DeviceGroupMembers({ group }: Props) {
  const [transferOpen, setTransferOpen] = useState(false)
  const membersKey = ['basedata', 'device-group', 'items', group.id]
  const { data: members } = useQuery$(membersKey, () => deviceGroupItems(group.id))
  const { data: allDevices } = useQuery$(
    ['basedata', 'device', 'page', { current: 1, size: CANDIDATE_SIZE }],
    () => devicePage({ current: 1, size: CANDIDATE_SIZE }),
    { enabled: transferOpen },
  )
  const { mutate: addItems } = useMutation$((deviceIds: string[]) => deviceGroupItemsAdd(group.id, deviceIds))
  const { mutate: removeItem } = useMutation$((deviceId: string) => deviceGroupItemsRemove(group.id, deviceId))

  const memberList = members ?? []
  const refresh = () => invalidate(JSON.stringify(membersKey))

  const toItem = (d: SpDevice): TransferItem => ({ id: d.id, primary: d.name, secondary: d.code })
  const selectedItems = memberList.map(toItem)
  const candidates = excludeSelected(allDevices?.records ?? [], memberList.map((d) => d.id)).map(toItem)

  const handleAdd = async (ids: string[]) => {
    try {
      await addItems(ids)
      toast.success('已加入')
      refresh()
    } catch {
      /* toast */
    }
  }
  const handleRemove = async (id: string) => {
    try {
      await removeItem(id)
      toast.success('已移除')
      refresh()
    } catch {
      /* toast */
    }
  }

  return (
    <>
      <RelatedPanel
        icon={Cpu}
        title="成员设备"
        count={memberList.length}
        actions={
          <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)}>
            <Settings2 className="size-4" />
            管理成员
          </Button>
        }
      >
        {memberList.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">暂无成员设备</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>设备编码</TableHead>
                <TableHead>设备名称</TableHead>
                <TableHead className="w-16">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberList.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.code}</TableCell>
                  <TableCell>{d.name}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleRemove(d.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </RelatedPanel>

      <DualListTransfer
        open={transferOpen}
        onOpenChange={setTransferOpen}
        title={`管理「${group.name}」的成员设备`}
        description="勾选候选设备加入,或移除已加入设备"
        candidates={candidates}
        selected={selectedItems}
        onAdd={handleAdd}
        onRemove={handleRemove}
      />
    </>
  )
}
