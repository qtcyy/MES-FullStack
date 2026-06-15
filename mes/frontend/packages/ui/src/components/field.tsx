"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import * as SeparatorPrimitive from "@radix-ui/react-separator"

import { cn } from "@workspace/ui/lib/utils"

function Field({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="field"
      className={cn("space-y-2", className)}
      {...props}
    />
  )
}

function FieldGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="field-group"
      className={cn("grid gap-6", className)}
      {...props}
    />
  )
}

function FieldLabel({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="field-label"
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    />
  )
}

function FieldDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="field-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

interface FieldSeparatorProps extends React.ComponentProps<typeof SeparatorPrimitive.Root> {
  children?: React.ReactNode
}

function FieldSeparator({
  className,
  children,
  orientation = "horizontal",
  decorative = true,
  ...props
}: FieldSeparatorProps) {
  if (!children) {
    return (
      <SeparatorPrimitive.Root
        data-slot="field-separator"
        decorative={decorative}
        orientation={orientation}
        className={cn(
          "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
          className
        )}
        {...props}
      />
    )
  }

  return (
    <div
      data-slot="field-separator"
      className={cn("relative", className)}
      {...props}
    >
      <div className="absolute inset-0 flex items-center">
        <span className="bg-border w-full border-t" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span
          data-slot="field-separator-content"
          className="bg-background text-muted-foreground px-2"
        >
          {children}
        </span>
      </div>
    </div>
  )
}

export { Field, FieldGroup, FieldLabel, FieldDescription, FieldSeparator }
