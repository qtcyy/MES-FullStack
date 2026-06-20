import { ref, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import { dictList } from '@/api/basedata/dict'
import { toDictOptions, resolveDictLabel, type DictOption } from '@/utils/materile'
import type { SpSysDict } from '@/types/basedata'

/** 模块级缓存:同一 type 只请求一次(多个下拉共享) */
const cache = new Map<string, Promise<SpSysDict[]>>()

function loadDict(type: string): Promise<SpSysDict[]> {
  if (!cache.has(type)) {
    cache.set(
      type,
      dictList(type).catch((e) => {
        cache.delete(type) // 失败不缓存,允许重试
        throw e
      }),
    )
  }
  return cache.get(type)!
}

/**
 * 按字典 type 取数,暴露下拉 options 与 value→label 解析。
 * 取数失败降级为空选项 + 一次 warning,不阻断页面。
 */
export function useDict(type: string): {
  dicts: Ref<SpSysDict[]>
  options: Ref<DictOption[]>
  loading: Ref<boolean>
  labelOf: (value?: string) => string
} {
  const dicts = ref<SpSysDict[]>([])
  const options = ref<DictOption[]>([])
  const loading = ref(true)

  loadDict(type)
    .then((list) => {
      dicts.value = list ?? []
      options.value = toDictOptions(dicts.value)
    })
    .catch(() => {
      ElMessage.warning(`字典「${type}」加载失败`)
    })
    .finally(() => {
      loading.value = false
    })

  const labelOf = (value?: string) => resolveDictLabel(value, dicts.value)

  return { dicts, options, loading, labelOf }
}
