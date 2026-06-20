<template>
  <div class="ot">
    <!-- 左栏:候选池 -->
    <div class="ot__col">
      <div class="ot__head">
        <span>{{ titles[0] }}</span>
        <el-tag size="small" type="info" round>{{ available.length }}</el-tag>
      </div>
      <el-input v-model="keyword" placeholder="搜索工序" clearable size="small" class="ot__search">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <div class="ot__list" v-auto-animate>
        <button
          v-for="it in available"
          :key="it.id"
          type="button"
          class="ot__item ot__item--pick"
          @click="add(it)"
        >
          <span class="ot__primary">{{ it.primary }}</span>
          <span v-if="it.secondary" class="ot__secondary">{{ it.secondary }}</span>
          <el-icon class="ot__plus"><Plus /></el-icon>
        </button>
        <el-empty v-if="!available.length" description="无可选工序" :image-size="48" />
      </div>
    </div>

    <!-- 右栏:有序流水线 -->
    <div class="ot__col">
      <div class="ot__head">
        <span>{{ titles[1] }}</span>
        <el-tag size="small" type="primary" round>{{ modelValue.length }}</el-tag>
      </div>
      <div class="ot__list ot__list--ordered" v-auto-animate>
        <div v-for="(it, idx) in modelValue" :key="it.id" class="ot__item">
          <span class="ot__index">{{ idx + 1 }}</span>
          <span class="ot__primary">{{ it.primary }}</span>
          <span v-if="it.secondary" class="ot__secondary">{{ it.secondary }}</span>
          <el-tag v-if="modelValue.length >= 2 && idx === 0" size="small" type="success">首道</el-tag>
          <el-tag v-if="modelValue.length >= 2 && idx === modelValue.length - 1" size="small" type="warning">末道</el-tag>
          <span class="ot__ops">
            <el-button text size="small" :disabled="idx === 0" aria-label="上移" @click="move(idx, -1)">
              <el-icon><Top /></el-icon>
            </el-button>
            <el-button text size="small" :disabled="idx === modelValue.length - 1" aria-label="下移" @click="move(idx, 1)">
              <el-icon><Bottom /></el-icon>
            </el-button>
            <el-button text size="small" type="danger" aria-label="移除" @click="remove(it.id)">
              <el-icon><Close /></el-icon>
            </el-button>
          </span>
        </div>
        <el-empty v-if="!modelValue.length" :description="minHint" :image-size="48" />
      </div>
      <div v-if="modelValue.length" class="ot__preview">{{ chainPreview }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, Plus, Top, Bottom, Close } from '@element-plus/icons-vue'
import { excludeSelected, moveItem } from '@/utils/technology'
import type { TransferItem } from '@/types/technology'

const props = withDefaults(
  defineProps<{
    modelValue: TransferItem[]
    candidates: TransferItem[]
    titles?: [string, string]
    minHint?: string
  }>(),
  { titles: () => ['可选工序', '工序流水线'], minHint: '从左侧添加工序(至少 2 道)' },
)

const emit = defineEmits<{ 'update:modelValue': [TransferItem[]] }>()

const keyword = ref('')

const selectedIds = computed(() => new Set(props.modelValue.map((i) => i.id)))

const available = computed(() => {
  const pool = excludeSelected(props.candidates, selectedIds.value)
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return pool
  return pool.filter(
    (it) => it.primary.toLowerCase().includes(kw) || (it.secondary ?? '').toLowerCase().includes(kw),
  )
})

const chainPreview = computed(() => props.modelValue.map((i) => i.primary).join(' → '))

function add(it: TransferItem) {
  emit('update:modelValue', [...props.modelValue, it])
}
function remove(id: string) {
  emit('update:modelValue', props.modelValue.filter((i) => i.id !== id))
}
function move(idx: number, dir: -1 | 1) {
  emit('update:modelValue', moveItem(props.modelValue, idx, dir))
}
</script>

<style scoped>
.ot { display: flex; gap: var(--sp-4); }
.ot__col { flex: 1; min-width: 0; border: 1px solid var(--el-border-color); border-radius: 6px; padding: var(--sp-3); display: flex; flex-direction: column; }
.ot__head { display: flex; align-items: center; justify-content: space-between; font-weight: 600; margin-bottom: var(--sp-2); }
.ot__search { margin-bottom: var(--sp-2); }
.ot__list { flex: 1; min-height: 220px; max-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: var(--sp-1); }
.ot__item { display: flex; align-items: center; gap: var(--sp-2); padding: 6px 8px; border-radius: 4px; background: var(--el-fill-color-light); width: 100%; text-align: left; border: none; }
.ot__item--pick { cursor: pointer; }
.ot__item--pick:hover { background: var(--el-color-primary-light-9); }
.ot__index { width: 20px; height: 20px; line-height: 20px; text-align: center; border-radius: 50%; background: var(--el-color-primary); color: #fff; font-size: 12px; flex: none; }
.ot__primary { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ot__secondary { color: var(--el-text-color-secondary); font-size: 12px; flex: none; }
.ot__plus { margin-left: auto; color: var(--el-color-primary); }
.ot__ops { display: flex; align-items: center; margin-left: auto; flex: none; }
.ot__preview { margin-top: var(--sp-2); padding-top: var(--sp-2); border-top: 1px dashed var(--el-border-color); color: var(--el-text-color-secondary); font-size: 13px; word-break: break-all; }
</style>
