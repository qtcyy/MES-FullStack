// apps/mes-new/src/pages/basedata/process-unit/ProcessUnitTeams.tsx
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
import { Link2, Trash2, Users } from 'lucide-react'
import RelatedPanel from '@/components/RelatedPanel'
import DualListTransfer from '@/components/DualListTransfer'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { processUnitTeams, processUnitTeamAdd, processUnitTeamRemove } from '@/api/basedata/process-unit'
import { teamPage } from '@/api/system/team'
import { excludeSelected, type TransferItem } from '@/utils/transfer'
import type { SpProcessUnit, SpTeam } from '@/types/process-unit'

interface Props {
  unit: SpProcessUnit
}

const CANDIDATE_SIZE = 200

export default function ProcessUnitTeams({ unit }: Props) {
  const [transferOpen, setTransferOpen] = useState(false)
  const teamsKey = ['basedata', 'process-unit', 'teams', unit.id]
  const { data: bound } = useQuery$(teamsKey, () => processUnitTeams(unit.id))
  const { data: allTeams } = useQuery$(
    ['admin', 'team', 'page', { current: 1, size: CANDIDATE_SIZE }],
    () => teamPage({ current: 1, size: CANDIDATE_SIZE }),
    { enabled: transferOpen },
  )
  const { mutate: addTeam } = useMutation$((teamId: string) => processUnitTeamAdd(unit.id, teamId))
  const { mutate: removeTeam } = useMutation$((teamId: string) => processUnitTeamRemove(unit.id, teamId))

  const boundList = bound ?? []
  const refresh = () => invalidate(JSON.stringify(teamsKey))

  const toItem = (t: SpTeam): TransferItem => ({ id: t.id, primary: t.name, secondary: t.code })
  const selectedItems = boundList.map(toItem)
  const candidates = excludeSelected(allTeams?.records ?? [], boundList.map((t) => t.id)).map(toItem)

  const handleAdd = async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => addTeam(id)))
      toast.success('已绑定')
      refresh()
    } catch {
      /* toast */
    }
  }
  const handleRemove = async (id: string) => {
    try {
      await removeTeam(id)
      toast.success('已解绑')
      refresh()
    } catch {
      /* toast */
    }
  }

  return (
    <>
      <RelatedPanel
        icon={Users}
        title="绑定班组"
        count={boundList.length}
        actions={
          <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)}>
            <Link2 className="size-4" />
            绑定班组
          </Button>
        }
      >
        {boundList.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">暂无绑定班组</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>班组编码</TableHead>
                <TableHead>班组名称</TableHead>
                <TableHead className="w-16">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boundList.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.code}</TableCell>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleRemove(t.id)}>
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
        title={`绑定「${unit.name}」的班组`}
        description="勾选候选班组绑定,或解绑已绑定班组"
        candidates={candidates}
        selected={selectedItems}
        onAdd={handleAdd}
        onRemove={handleRemove}
      />
    </>
  )
}
