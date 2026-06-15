"use client"

import { useEffect, useState } from "react"
import { useTheme as useNextTheme } from "next-themes"
import {
  hexToOklch,
  generateContrastColor,
  isValidHex,
} from "../lib/color-utils"

const CUSTOM_PRIMARY_COLOR_KEY = "custom-theme-primary-color"
const DEFAULT_CUSTOM_COLOR = "#3b82f6" // 默认蓝色

export type ThemeMode = "light" | "dark" | "custom"

export interface UseThemeReturn {
  /** 当前主题模式 */
  theme: ThemeMode | undefined
  /** 设置主题模式 */
  setTheme: (theme: ThemeMode) => void
  /** 解析后的主题（考虑系统偏好） */
  resolvedTheme: string | undefined
  /** 是否为暗色主题 */
  isDark: boolean
  /** 是否为自定义主题 */
  isCustom: boolean
  /** 切换 light/dark 主题 */
  toggleTheme: () => void
  /** 设置自定义主题的primary颜色（hex格式） */
  setCustomTheme: (hex: string) => void
  /** 当前自定义的primary颜色 */
  customPrimaryColor: string | null
  /** 主题系统是否已挂载（避免SSR/CSR不一致） */
  isReady: boolean
}

export function useTheme(): UseThemeReturn {
  const { theme, setTheme, resolvedTheme } = useNextTheme()
  const [customPrimaryColor, setCustomPrimaryColor] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  // 初始化：从localStorage读取自定义颜色，如果没有则使用默认蓝色
  useEffect(() => {
    setIsReady(true)
    const savedColor = localStorage.getItem(CUSTOM_PRIMARY_COLOR_KEY)
    if (savedColor && isValidHex(savedColor)) {
      setCustomPrimaryColor(savedColor)
    } else {
      // 首次访问或没有保存的颜色，使用默认蓝色
      setCustomPrimaryColor(DEFAULT_CUSTOM_COLOR)
      localStorage.setItem(CUSTOM_PRIMARY_COLOR_KEY, DEFAULT_CUSTOM_COLOR)
    }
  }, [])

  // 监听自定义主题：动态设置CSS变量
  useEffect(() => {
    if (theme === "custom" && customPrimaryColor && isValidHex(customPrimaryColor)) {
      const root = document.documentElement
      const primaryOklch = hexToOklch(customPrimaryColor)
      const foregroundOklch = generateContrastColor(customPrimaryColor)

      root.style.setProperty("--custom-primary", primaryOklch)
      root.style.setProperty("--custom-primary-foreground", foregroundOklch)
    }
  }, [theme, customPrimaryColor])

  // 计算派生状态
  const isDark = resolvedTheme === "dark"
  const isCustom = theme === "custom"

  // 切换light/dark主题
  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark")
    } else {
      setTheme("light")
    }
  }

  // 设置自定义主题
  const setCustomThemeHandler = (hex: string) => {
    if (!isValidHex(hex)) {
      console.warn(`[useTheme] Invalid hex color: ${hex}`)
      return
    }

    // 保存到localStorage
    localStorage.setItem(CUSTOM_PRIMARY_COLOR_KEY, hex)
    setCustomPrimaryColor(hex)

    // 切换到custom主题
    setTheme("custom")
  }

  return {
    theme: theme as ThemeMode | undefined,
    setTheme: setTheme as (theme: ThemeMode) => void,
    resolvedTheme,
    isDark,
    isCustom,
    toggleTheme,
    setCustomTheme: setCustomThemeHandler,
    customPrimaryColor,
    isReady,
  }
}