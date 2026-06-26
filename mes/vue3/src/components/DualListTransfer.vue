<script setup lang="ts">
import { ref, computed } from 'vue'
import type { TransferItem } from '@/types/technology'

const props = withDefaults(
  defineProps<{
    modelValue: TransferItem[]
    candidates: TransferItem[]
    titles?: [string, string]
    loading?: boolean
  }>(),
  { titles: () => ['可选项', '已选项'], loading: false },
)

const emit = defineEmits<{ 'update:modelValue': [TransferItem[]] }>()

const keyword = ref('')
const selectedIds = computed(() => new Set(props.modelValue.map((i) => i.id)))

/** 左侧可选 = 候选剔除已选 + 关键词过滤 */
const available = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return props.candidates
    .filter((c) => !selectedIds.value.has(c.id))
    .filter(
      (c) =>
        !kw ||
        c.primary.toLowerCase().includes(kw) ||
        (c.secondary ?? '').toLowerCase().includes(kw),
    )
})

function add(item: TransferItem) {
  if (selectedIds.value.has(item.id)) return
  emit('update:modelValue', [...props.modelValue, item])
}
function remove(id: string) {
  emit(
    'update:modelValue',
    props.modelValue.filter((i) => i.id !== id),
  )
}
</script>

<template>
  <div class="dlt" :aria-busy="loading">
    <div class="dlt__col">
      <div class="dlt__head">
        <span>{{ titles[0] }}</span>
        <el-tag size="small" round>{{ available.length }}</el-tag>
      </div>
      <el-input v-model="keyword" size="small" placeholder="搜索编码/名称" clearable />
      <div class="dlt__list" role="listbox">
        <button
          v-for="it in available"
          :key="it.id"
          type="button"
          class="dlt__item"
          @click="add(it)"
        >
          <span class="dlt__primary">{{ it.primary }}</span>
          <span v-if="it.secondary" class="dlt__secondary">{{ it.secondary }}</span>
        </button>
        <el-empty v-if="!available.length" description="无可选项" :image-size="48" />
      </div>
    </div>

    <div class="dlt__col">
      <div class="dlt__head">
        <span>{{ titles[1] }}</span>
        <el-tag size="small" type="primary" round>{{ modelValue.length }}</el-tag>
      </div>
      <div class="dlt__list" role="listbox">
        <div v-for="it in modelValue" :key="it.id" class="dlt__item dlt__item--selected">
          <span class="dlt__primary">{{ it.primary }}</span>
          <span v-if="it.secondary" class="dlt__secondary">{{ it.secondary }}</span>
          <el-button text size="small" aria-label="移除" @click="remove(it.id)">移除</el-button>
        </div>
        <el-empty v-if="!modelValue.length" description="尚未选择" :image-size="48" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.dlt {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.dlt__col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  padding: 10px;
  min-height: 240px;
}
.dlt__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}
.dlt__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  max-height: 300px;
}
.dlt__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  background: var(--el-fill-color-light);
  border: none;
  cursor: pointer;
  text-align: left;
  width: 100%;
  font: inherit;
  color: inherit;
}
.dlt__item:hover {
  background: var(--el-fill-color);
}
.dlt__item--selected {
  cursor: default;
}
.dlt__primary {
  font-weight: 500;
}
.dlt__secondary {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.dlt__item--selected .el-button {
  margin-left: auto;
}
</style>
