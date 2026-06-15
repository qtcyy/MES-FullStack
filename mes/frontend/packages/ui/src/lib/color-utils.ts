/**
 * 颜色转换工具函数
 * 支持 Hex → OKLch 转换及相关颜色处理
 */

/**
 * 将hex颜色转换为RGB
 * @param hex - 颜色值，支持 #RGB, #RRGGBB 格式
 * @returns RGB对象 {r: 0-255, g: 0-255, b: 0-255}
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  // 移除 # 号
  const cleanHex = hex.replace(/^#/, "")

  // 处理简写格式 #RGB -> #RRGGBB
  const fullHex =
    cleanHex.length === 3
      ? cleanHex
          .split("")
          .map((char) => char + char)
          .join("")
      : cleanHex

  const num = parseInt(fullHex, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

/**
 * 将RGB转换为线性RGB（移除gamma校正）
 */
function rgbToLinearRgb(r: number, g: number, b: number): [number, number, number] {
  const toLinear = (channel: number) => {
    const normalized = channel / 255
    return normalized <= 0.04045
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4)
  }

  return [toLinear(r), toLinear(g), toLinear(b)]
}

/**
 * 将线性RGB转换为XYZ色彩空间（D65白点）
 */
function linearRgbToXyz(lr: number, lg: number, lb: number): [number, number, number] {
  // sRGB to XYZ (D65) 转换矩阵
  const x = lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375
  const y = lr * 0.2126729 + lg * 0.7151522 + lb * 0.072175
  const z = lr * 0.0193339 + lg * 0.119192 + lb * 0.9503041

  return [x, y, z]
}

/**
 * 将XYZ转换为OKLab色彩空间
 */
function xyzToOklab(x: number, y: number, z: number): [number, number, number] {
  // XYZ to LMS
  const l = 0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z
  const m = 0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z
  const s = 0.0482003018 * x + 0.2643662691 * y + 0.6338517070 * z

  // 非线性变换
  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)

  // LMS to OKLab
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
  const b = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_

  return [L, a, b]
}

/**
 * 将OKLab转换为OKLch
 */
function oklabToOklch(L: number, a: number, b: number): [number, number, number] {
  // 色度 (Chroma)
  const c = Math.sqrt(a * a + b * b)

  // 色相 (Hue) - 转换为度数
  let h = (Math.atan2(b, a) * 180) / Math.PI
  if (h < 0) h += 360

  return [L, c, h]
}

/**
 * 将Hex颜色转换为OKLch格式
 * @param hex - Hex颜色值
 * @returns OKLch字符串，格式: "oklch(L C H)"
 */
export function hexToOklch(hex: string): string {
  const { r, g, b } = hexToRgb(hex)
  const [lr, lg, lb] = rgbToLinearRgb(r, g, b)
  const [x, y, z] = linearRgbToXyz(lr, lg, lb)
  const [L, a, bVal] = xyzToOklab(x, y, z)
  const [l, c, h] = oklabToOklch(L, a, bVal)

  // 格式化输出，保留3位小数
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(3)})`
}

/**
 * 计算颜色的相对亮度（WCAG标准）
 * @param hex - Hex颜色值
 * @returns 相对亮度值 (0-1)
 */
export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const [lr, lg, lb] = rgbToLinearRgb(r, g, b)

  // WCAG相对亮度公式
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
}

/**
 * 判断颜色是否为深色
 * @param hex - Hex颜色值
 * @returns true表示深色，false表示浅色
 */
export function isDarkColor(hex: string): boolean {
  return getRelativeLuminance(hex) < 0.5
}

/**
 * 为给定颜色生成对比色（用于foreground）
 * @param hex - 背景颜色的Hex值
 * @returns 对比色的OKLch字符串
 */
export function generateContrastColor(hex: string): string {
  // 如果是深色背景，返回浅色文字；反之返回深色文字
  const isDark = isDarkColor(hex)

  if (isDark) {
    // 浅色文字（类似 --primary-foreground: oklch(0.985 0 0)）
    return "oklch(0.985 0 0)"
  } else {
    // 深色文字（类似 --primary-foreground: oklch(0.205 0 0)）
    return "oklch(0.205 0 0)"
  }
}

/**
 * 验证Hex颜色格式
 * @param hex - 待验证的颜色字符串
 * @returns 是否为有效的Hex颜色
 */
export function isValidHex(hex: string): boolean {
  return /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)
}
