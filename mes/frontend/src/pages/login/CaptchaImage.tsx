import { useState, type CSSProperties } from 'react'
import type { MouseEvent } from 'react'

interface CaptchaImageProps {
  className?: string
  style?: CSSProperties
}

function CaptchaImage({ className, style }: CaptchaImageProps) {
  const [timestamp, setTimestamp] = useState(Date.now())

  const baseUrl = import.meta.env.DEV ? '/api' : ''
  const captchaUrl = `${baseUrl}/verification/code?t=${timestamp}`

  const handleRefresh = (e: MouseEvent) => {
    e.preventDefault()
    setTimestamp(Date.now())
  }

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        cursor: 'pointer',
        ...style,
      }}
      onClick={handleRefresh}
    >
      <img
        src={captchaUrl}
        alt="验证码"
        style={{ height: 28, borderRadius: 4 }}
      />
      <span style={{ fontSize: 12, color: '#1890ff', whiteSpace: 'nowrap' }}>
        换一张
      </span>
    </div>
  )
}

export default CaptchaImage
