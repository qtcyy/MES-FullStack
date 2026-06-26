/** 打字机推进：从 current 朝 targetLen 前进 step 个字符，夹在 [0, targetLen] */
export function advance(current: number, targetLen: number, step: number): number {
  if (current >= targetLen) return targetLen
  return Math.min(targetLen, current + step)
}
