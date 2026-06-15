export interface TransferItem {
  id: string
  primary: string
  secondary?: string
}

/** 关键字过滤:对 primary + secondary 做大小写不敏感包含匹配 */
export function filterTransferItems(items: TransferItem[], keyword: string): TransferItem[] {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return items
  return items.filter(
    (it) =>
      it.primary.toLowerCase().includes(kw) ||
      (it.secondary?.toLowerCase().includes(kw) ?? false),
  )
}

/** 从全集中排除已选 id,得到候选 */
export function excludeSelected<T extends { id: string }>(all: T[], selectedIds: string[]): T[] {
  const set = new Set(selectedIds)
  return all.filter((it) => !set.has(it.id))
}
