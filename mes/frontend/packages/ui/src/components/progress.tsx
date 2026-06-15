"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@workspace/ui/lib/utils"

type ProgressColor = "primary" | "blue" | "yellow" | "orange" | "red" | "green"

interface ProgressProps
  extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  color?: ProgressColor
  indicatorClassName?: string
}

const colorClasses: Record<ProgressColor, string> = {
  primary: "bg-primary",
  blue: "bg-blue-500",
  yellow: "bg-yellow-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  green: "bg-green-500",
}

function Progress({
  className,
  value,
  color = "primary",
  indicatorClassName,
  ...props
}: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-muted relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "h-full w-full flex-1 transition-all",
          colorClasses[color],
          indicatorClassName
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
export type { ProgressProps, ProgressColor }
