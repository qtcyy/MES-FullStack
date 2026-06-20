<template>
  <div class="bom-detail">
    <!-- 节点信息卡 -->
    <el-descriptions :title="node.nodeName" :column="2" border size="small">
      <el-descriptions-item label="层级">{{ levelLabel }}</el-descriptions-item>
      <el-descriptions-item label="版本">{{ node.version ?? '-' }}</el-descriptions-item>
      <el-descriptions-item label="产品编码">{{ node.productCode ?? '-' }}</el-descriptions-item>
      <el-descriptions-item label="BOM 编码">{{ node.bomCode ?? '-' }}</el-descriptions-item>
      <el-descriptions-item label="备注" :span="2">{{ node.remark ?? '-' }}</el-descriptions-item>
    </el-descriptions>

    <div class="bom-detail__ops">
      <el-button :disabled="!canWrite" type="primary" :icon="Plus" size="small" @click="emit('add-child')">加子节点</el-button>
      <el-button :disabled="!canWrite" :icon="Edit" size="small" @click="emit('edit-node')">编辑节点</el-button>
      <el-button
        v-if="!isRoot"
        :disabled="!canWrite"
        type="danger"
        :icon="Delete"
        size="small"
        @click="emit('delete-node')"
      >删除节点</el-button>
    </div>

    <!-- 物料行表 -->
    <div class="bom-detail__items-header">
      <span class="bom-detail__title">物料行</span>
      <el-button :disabled="!canWrite" type="primary" :icon="Plus" size="small" @click="emit('add-item')">新增物料</el-button>
    </div>

    <DataTable
      :data="pagedItems"
      :loading="itemsLoading"
      :columns="itemColumns"
      :pager="itemPager"
      :action-width="canWrite ? 120 : 0"
      @page-change="(p) => (itemPager.current = p)"
      @size-change="(s) => { itemPager.size = s; itemPager.current = 1 }"
    >
      <template v-if="canWrite" #actions="{ row }">
        <el-button type="primary" link size="small" @click="emit('edit-item', row as SpProductBomItem)">编辑</el-button>
        <el-button type="danger" link size="small" @click="emit('delete-item', row as SpProductBomItem)">删除</el-button>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import type { BomTreeNode, SpProductBomItem } from '@/types/technology'

const props = defineProps<{
  node: BomTreeNode
  isRoot: boolean
  canWrite: boolean
  items: SpProductBomItem[]
  itemsLoading?: boolean
}>()

const emit = defineEmits<{
  'add-child': []
  'edit-node': []
  'delete-node': []
  'add-item': []
  'edit-item': [SpProductBomItem]
  'delete-item': [SpProductBomItem]
}>()

const levelLabel = computed(() => {
  const map: Record<number, string> = { 0: '产品', 1: '半成品', 2: '组件' }
  return map[props.node.level ?? -1] ?? `L${props.node.level ?? '?'}`
})

const itemColumns: Column[] = [
  { prop: 'materialCode', label: '物料编码', width: 140 },
  { prop: 'materialDesc', label: '物料描述', minWidth: 160 },
  { prop: 'quantity', label: '用量', width: 90 },
  { prop: 'unit', label: '单位', width: 80 },
]

// 物料行客户端分页 — DataTable 不自己 slice,需在此做切片再传 :data
const itemPager = reactive({ current: 1, size: 10, total: 0 })

watch(
  () => props.items,
  (list) => {
    itemPager.total = list.length
    itemPager.current = 1
  },
  { immediate: true },
)

// 切片后的当页数据
const pagedItems = computed<SpProductBomItem[]>(() => {
  const start = (itemPager.current - 1) * itemPager.size
  return props.items.slice(start, start + itemPager.size)
})
</script>

<style scoped>
.bom-detail__ops { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin: var(--sp-3) 0; }
.bom-detail__items-header { display: flex; align-items: center; justify-content: space-between; margin: var(--sp-3) 0 var(--sp-2); }
.bom-detail__title { font-size: 15px; font-weight: 600; color: var(--el-text-color-primary); }
</style>
