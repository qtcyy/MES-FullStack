import { useRef, useState } from 'react'
import { firstValueFrom } from 'rxjs'
import { toast, cn } from '@workspace/ui'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { http } from '@/http/client'
import { PROCESS_UPLOAD_IMAGE_URL } from '@/api/technology/process-content'

interface MultiImageUploadProps {
  /** 对象 key 列表 */
  keys: string[]
  /** 与 keys 等长的展示 url 列表 */
  urls: string[]
  onChange: (keys: string[], urls: string[]) => void
  uploadUrl?: string
  disabled?: boolean
  max?: number
}

export default function MultiImageUpload({
  keys, urls, onChange, uploadUrl = PROCESS_UPLOAD_IMAGE_URL, disabled, max = 8,
}: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('仅支持图片文件'); return }
    if (file.size / 1024 / 1024 >= 2) { toast.error('图片大小不能超过 2MB'); return }
    if (keys.length >= max) { toast.error(`最多 ${max} 张`); return }
    const fd = new FormData()
    fd.append('file', file)
    setUploading(true)
    try {
      const data = await firstValueFrom(http.post<{ key: string; url: string }>(uploadUrl, fd))
      if (data?.key) {
        onChange([...keys, data.key], [...urls, data.url ?? ''])
        toast.success('上传成功')
      }
    } catch { /* 拦截器已 toast */ } finally { setUploading(false) }
  }

  const removeAt = (i: number) => {
    onChange(keys.filter((_, idx) => idx !== i), urls.filter((_, idx) => idx !== i))
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      {keys.map((k, i) => (
        <div key={k + i} className="relative size-20 overflow-hidden rounded-md border border-border">
          <img src={urls[i]} alt="预览" className="size-full object-cover" />
          {!disabled && (
            <button type="button" onClick={() => removeAt(i)}
              className="absolute right-0 top-0 inline-flex size-5 items-center justify-center rounded-bl bg-black/50 text-white hover:bg-black/70"
              aria-label="移除图片">
              <X className="size-3" />
            </button>
          )}
        </div>
      ))}
      {!disabled && keys.length < max && (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className={cn('flex size-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50')}>
          {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
          <span className="text-xs">{uploading ? '上传中' : '添加图片'}</span>
        </button>
      )}
    </div>
  )
}
