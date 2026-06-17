import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  toast,
} from '@workspace/ui'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { postOutboundItem } from '@/api/inventory/outbound'
import type { SpOutboundOrderItem } from '@/types/inventory'

interface Props {
  item: SpOutboundOrderItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function OutboundPostDialog({ item, open, onOpenChange }: Props) {
  const { mutate, loading } = useMutation$((itemId: string) => postOutboundItem({ itemId }))

  const onConfirm = async () => {
    if (!item) return
    try {
      await mutate(item.id)
      toast.success('出库登账成功')
      invalidate('["inventory","outbound"')
      invalidate('["inventory","stock"')
      onOpenChange(false)
    } catch {
      /* 拦截器已 toast(库存不足等) */
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认出库登账</AlertDialogTitle>
          <AlertDialogDescription>
            将对物料「{item?.materialCode}」按数量 {item?.quantity}{item?.unit ? ` ${item.unit}` : ''} 执行
            <strong>先进先出(FIFO)</strong>自动扣减库存,并记录扣减的库位分配。库存不足时无法出库。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction disabled={loading} onClick={(e) => { e.preventDefault(); onConfirm() }}>
            {loading ? '提交中…' : '确认出库'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
