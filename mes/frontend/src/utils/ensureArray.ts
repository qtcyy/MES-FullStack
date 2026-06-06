/**
 * Ensures the value is a valid array for Ant Design Table dataSource.
 * Handles: undefined, null, object (wrong format), and array.
 */
export function ensureArray<T = any>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  // PageResult format: { records: [...], total, ... }
  if (value && typeof value === 'object' && Array.isArray((value as any).records)) {
    return (value as any).records as T[]
  }
  return []
}
