"use client"

import * as React from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "./button"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Badge } from "./badge"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command"

export interface MultiSelectOption {
  label: string
  value: string
}

export interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
  emptyMessage?: string
  maxDisplayTags?: number // 最多显示的标签数量，超出部分用 +n 显示
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "请选择",
  className,
  emptyMessage = "暂无数据",
  maxDisplayTags,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value]
    onChange(newSelected)
  }

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selected.filter((item) => item !== value))
  }

  const selectedLabels = options
    .filter((option) => selected.includes(option.value))
    .map((option) => option.label)

  // 根据 maxDisplayTags 控制显示的标签
  const displayLabels = maxDisplayTags && selectedLabels.length > maxDisplayTags
    ? selectedLabels.slice(0, maxDisplayTags)
    : selectedLabels

  const remainingCount = maxDisplayTags && selectedLabels.length > maxDisplayTags
    ? selectedLabels.length - maxDisplayTags
    : 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-9 w-full justify-between bg-transparent text-sm font-normal hover:bg-transparent",
            !selected.length && "text-muted-foreground",
            className
          )}
        >
          <div className="flex flex-wrap gap-1 flex-1 overflow-hidden">
            {selected.length === 0 ? (
              <span>{placeholder}</span>
            ) : (
              <>
                {displayLabels.map((label, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="mr-1 rounded-sm px-1 font-normal"
                  >
                    {label}
                    <button
                      className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleRemove(
                            options.find((opt) => opt.label === label)?.value || "",
                            e as any
                          )
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onClick={(e) =>
                        handleRemove(
                          options.find((opt) => opt.label === label)?.value || "",
                          e
                        )
                      }
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </Badge>
                ))}
                {remainingCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="mr-1 rounded-sm px-1 font-normal"
                  >
                    +{remainingCount}
                  </Badge>
                )}
              </>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="搜索..." className="h-9" />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.includes(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </div>
                    <span>{option.label}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
