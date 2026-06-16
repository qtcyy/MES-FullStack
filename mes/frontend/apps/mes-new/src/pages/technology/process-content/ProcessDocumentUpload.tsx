import { useRef, useState } from 'react'
import { firstValueFrom } from 'rxjs'
import { Button, toast } from '@workspace/ui'
import { Loader2, Upload } from 'lucide-react'
import { http } from '@/http/client'
import { PROCESS_UPLOAD_DOCUMENT_URL, processDocumentSave } from '@/api/technology/process-content'

export default function ProcessDocumentUpload({
  contentId,
  disabled,
  onSaved,
}: {
  contentId: string
  disabled?: boolean
  onSaved: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('只支持 PDF 格式')
      return
    }
    if (file.size / 1024 / 1024 >= 20) {
      toast.error('文件不能超过 20MB')
      return
    }
    const fd = new FormData()
    fd.append('file', file)
    setUploading(true)
    try {
      const data = await firstValueFrom(
        http.post<{ key: string; url: string; name: string }>(PROCESS_UPLOAD_DOCUMENT_URL, fd),
      )
      if (data?.key) {
        await firstValueFrom(
          processDocumentSave({ contentId, name: data.name ?? file.name, filePath: data.key }),
        )
        toast.success('已上传文档')
        onSaved()
      }
    } catch {
      /* 拦截器已 toast */
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={onPick} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        上传 PDF
      </Button>
    </>
  )
}
