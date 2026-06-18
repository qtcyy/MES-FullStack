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
import { UserPlus, Trash2, Users } from 'lucide-react'
import RelatedPanel from '@/components/RelatedPanel'
import DualListTransfer from '@/components/DualListTransfer'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import {
  teamUsers,
  teamAvailableUsers,
  teamUsersAdd,
  teamUserRemove,
} from '@/api/system/team'
import { excludeSelected, type TransferItem } from '@/utils/transfer'
import type { SpTeamDTO } from '@/types/system'
import type { SysUser } from '@/types/user'

interface Props {
  team: SpTeamDTO
}

export default function TeamMembers({ team }: Props) {
  const [transferOpen, setTransferOpen] = useState(false)
  const { data: members } = useQuery$(['sys', 'team', 'users', team.id], () => teamUsers(team.id))
  const { data: available } = useQuery$(
    ['sys', 'team', 'available-users'],
    () => teamAvailableUsers(),
    { enabled: transferOpen },
  )
  const { mutate: addUsers } = useMutation$((userIds: string[]) => teamUsersAdd(team.id, userIds))
  const { mutate: removeUser } = useMutation$((userId: string) => teamUserRemove(team.id, userId))

  const memberList = members ?? []
  const refresh = () => invalidate('["sys","team"')

  const toItem = (u: SysUser): TransferItem => ({ id: u.id, primary: u.name, secondary: u.username })
  const selectedItems = memberList.map(toItem)
  const candidates = excludeSelected(available ?? [], memberList.map((u) => u.id)).map(toItem)

  const handleAdd = async (ids: string[]) => {
    try {
      await addUsers(ids)
      toast.success('已添加成员')
      refresh()
    } catch {
      /* 拦截器已 toast */
    }
  }
  const handleRemove = async (id: string) => {
    try {
      await removeUser(id)
      toast.success('已移除成员')
      refresh()
    } catch {
      /* 拦截器已 toast */
    }
  }

  return (
    <>
      <RelatedPanel
        icon={Users}
        title={`「${team.name}」成员`}
        count={memberList.length}
        actions={
          <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)}>
            <UserPlus className="size-4" />
            添加成员
          </Button>
        }
      >
        {memberList.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            暂无成员,点击「添加成员」分配员工
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>登录名</TableHead>
                <TableHead className="w-16">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberList.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleRemove(u.id)}>
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
        title={`为「${team.name}」添加成员`}
        description="勾选候选员工加入班组,或移除已在组成员"
        candidates={candidates}
        selected={selectedItems}
        onAdd={handleAdd}
        onRemove={handleRemove}
      />
    </>
  )
}
