"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"
import { useTheme } from "@workspace/ui/hooks/use-theme"

const themeToggleVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "icon",
    },
  }
)

export interface ThemeToggleProps
  extends Omit<React.ComponentProps<"button">, "onClick">,
    VariantProps<typeof themeToggleVariants> {
  className?: string
}

const ThemeToggle = React.forwardRef<HTMLButtonElement, ThemeToggleProps>(
  ({ className, variant, size, ...props }, ref) => {
    const { theme, setTheme, resolvedTheme } = useTheme()

    const toggleTheme = () => {
      setTheme(theme === "light" ? "dark" : "light")
    }

    return (
      <button
        ref={ref}
        className={cn(themeToggleVariants({ variant, size, className }))}
        onClick={toggleTheme}
        aria-label="Toggle theme"
        {...props}
      >
        {resolvedTheme === "dark" ? (
          <Sun className="size-4" />
        ) : (
          <Moon className="size-4" />
        )}
        <span className="sr-only">Toggle theme</span>
      </button>
    )
  }
)

ThemeToggle.displayName = "ThemeToggle"

export { ThemeToggle, themeToggleVariants }