import { useRef, useState } from 'react'
import { firstValueFrom } from 'rxjs'
import { Button, toast, cn } from '@workspace/ui'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { http } from '@/http/client'

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  uploadUrl?: string
  className?: string
}

export default function ImageUpload({
  value,
  onChange,
  uploadUrl = '/basedata/materile/upload-image',
  className,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (inputRef.current) inputRef.current.value = '' // 允许重选同一文件
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('仅支持图片文件')
      return
    }
    if (file.size / 1024 / 1024 >= 2) {
      toast.error('图片大小不能超过 2MB')
      return
    }
    const fd = new FormData()
    fd.append('file', file)
    setUploading(true)
    try {
      // FormData 经 formEncodingInterceptor 原样透传;resultUnwrap 解包得 { url }
      const data = await firstValueFrom(http.post<{ url: string }>(uploadUrl, fd))
      onChange(data?.url ?? '')
      toast.success('上传成功')
    } catch {
      /* 拦截器已 toast */
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      {value ? (
        <div className="relative size-20 overflow-hidden rounded-md border border-border">
          <img src={value} alt="预览" className="size-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-0 top-0 inline-flex size-5 items-center justify-center rounded-bl bg-black/50 text-white hover:bg-black/70"
            aria-label="移除图片"
          >
            <X className="size-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex size-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
        >
          {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
          <span className="text-xs">{uploading ? '上传中' : '上传图片'}</span>
        </button>
      )}
      {value && (
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          重新上传
        </Button>
      )}
    </div>
  )
}
