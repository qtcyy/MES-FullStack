import type { ReactNode } from 'react'
import { Label, cn } from '@workspace/ui'

interface FormFieldProps {
  label: string
  htmlFor?: string
  required?: boolean
  error?: string
  help?: string
  /** 跨列/自定义容器类,如 'col-span-2' */
  className?: string
  children: ReactNode
}

export default function FormField({
  label, htmlFor, required, error, help, className, children,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error
        ? <p className="text-xs text-destructive">{error}</p>
        : help
          ? <p className="text-xs text-muted-foreground">{help}</p>
          : null}
    </div>
  )
}
