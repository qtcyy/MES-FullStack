import { useEffect, useRef, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  toast,
} from '@workspace/ui'
import { Save, CheckCircle2 } from 'lucide-react'
import { firstValueFrom } from 'rxjs'
import { useMutation$, useQuery$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { modelGet, modelSave } from '@/api/workflow/model'
import { rolePage } from '@/api/system/role'
import BpmnDesigner, { type BpmnDesignerHandle, type SelectedElement } from './BpmnDesigner'
import PropertiesPanel from './PropertiesPanel'
import { validateSummary, errorTaskIds, buildAssigneeProps, type AssigneeType } from './bpmnUtils'
import type { SysRole } from '@/types/system'

interface ModelDesignerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  modelId: string | null
}

export default function ModelDesignerDialog({ open, onOpenChange, modelId }: ModelDesignerDialogProps) {
  const designerRef = useRef<BpmnDesignerHandle>(null)
  const [selected, setSelected] = useState<SelectedElement | null>(null)
  const [xml, setXml] = useState<string | null>(null)
  const [modelMeta, setModelMeta] = useState<{ name: string; modelKey: string } | null>(null)

  const { data: roleData } = useQuery$(['workflow', 'roles'], () => rolePage({ current: 1, size: 100 }), {
    enabled: open,
  })
  const roles: SysRole[] = roleData?.records ?? []
  const { mutate: saveModel, loading: saving } = useMutation$(
    (args: { id: string; modelKey: string; name: string; bpmnXml: string }) => modelSave(args),
  )

  // 打开时加载该模型的 bpmnXml(mock 同步返回)
  useEffect(() => {
    if (!open || !modelId) {
      setXml(null)
      setModelMeta(null)
      setSelected(null)
      return
    }
    // ignore 守卫:modelId 变化/关闭时丢弃在途响应(下周期接真后端异步加载防过期)
    let ignore = false
    firstValueFrom(modelGet(modelId)).then((m) => {
      if (ignore) return
      if (m) {
        setXml(m.bpmnXml)
        setModelMeta({ name: m.name, modelKey: m.modelKey })
      } else {
        toast.error('模型不存在')
        onOpenChange(false)
      }
    })
    return () => {
      ignore = true
    }
  }, [open, modelId, onOpenChange])

  const handleChangeName = (name: string) => {
    designerRef.current?.updateSelected({ name })
  }
  const handleChangeAssignee = (type: AssigneeType, roleCode?: string) => {
    designerRef.current?.updateSelected(buildAssigneeProps(type, roleCode))
  }

  const handleSave = async () => {
    if (!modelId || !modelMeta || !designerRef.current) return
    try {
      const out = await designerRef.current.getXML()
      await saveModel({ id: modelId, modelKey: modelMeta.modelKey, name: modelMeta.name, bpmnXml: out })
      toast.success('已保存')
      invalidate('["workflow","model"')
    } catch {
      /* 拦截器已 toast */
    }
  }

  const handleValidate = () => {
    if (!designerRef.current) return
    const summary = designerRef.current.getSummary()
    const result = validateSummary(summary)
    designerRef.current.clearErrors()
    if (result.ok) {
      toast.success('校验通过:流程定义完整')
    } else {
      designerRef.current.markErrors(errorTaskIds(summary))
      toast.error(`校验未通过:${result.issues.join('；')}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[85vh] max-h-[96vh] min-h-[420px] w-[90vw] min-w-[520px] max-w-[98vw] resize flex-col gap-0 overflow-hidden p-0 sm:max-w-[98vw]"
      >
        <DialogHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
          <DialogTitle className="text-base">
            流程模型设计{modelMeta ? ` — ${modelMeta.name}` : ''}
          </DialogTitle>
          <div className="flex gap-2 pr-8">
            <Button size="sm" variant="outline" onClick={handleValidate}>
              <CheckCircle2 className="size-4" />
              检查定义
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="size-4" />
              {saving ? '保存中…' : '保存'}
            </Button>
          </div>
        </DialogHeader>
        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 bg-muted/20">
            {xml && <BpmnDesigner key={modelId} ref={designerRef} xml={xml} onSelect={setSelected} />}
          </div>
          <div className="w-72 shrink-0 overflow-y-auto border-l">
            <PropertiesPanel
              element={selected}
              roles={roles}
              onChangeName={handleChangeName}
              onChangeAssignee={handleChangeAssignee}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
