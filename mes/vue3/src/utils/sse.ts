/**
 * SSE 分帧器：按空行(\n\n)切分事件帧，提取并拼接 data: 负载。
 * 处理半包/粘包；多行 data 按 SSE 规范用 \n 连接。
 * 返回的字符串里包含 [DONE] 哨兵，由调用方判断。
 */
export function createSseParser() {
  let buffer = ''
  return {
    push(chunk: string): string[] {
      buffer += chunk
      const out: string[] = []
      let idx: number
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)
        const data = frame
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).replace(/^ /, '').replace(/\r$/, ''))
          .join('\n')
        if (data) out.push(data)
      }
      return out
    },
  }
}
