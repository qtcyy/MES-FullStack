/**
 * 工艺文件图片字段(contentImages/inspectionImages)的前端编解码工具。
 * 后端将多张图片的对象 key 以逗号连接存于单个 varchar 列,前端按此解析/序列化。
 */

/** 逗号连接的对象 key 串 → key 数组(trim + 过滤空串,避免 ''.split(',') 产生 ['']) */
export function parseKeys(csv: string | undefined | null): string[] {
  return (csv ?? '').split(',').map((s) => s.trim()).filter(Boolean)
}

/** key 数组 → 逗号连接串(过滤 falsy) */
export function joinKeys(keys: string[]): string {
  return keys.filter(Boolean).join(',')
}
