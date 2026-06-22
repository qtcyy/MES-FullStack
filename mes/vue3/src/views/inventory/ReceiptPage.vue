<template>
  <PageContainer title="计划入库确认">
    <MasterDetailLayout :has-selection="!!selected">
      <template #master>
        <DataTable
          :data="page?.records ?? []"
          :loading="loading"
          :columns="columns"
          :pager="{ current, size, total: page?.total ?? 0 }"
          :action-width="0"
          @row-click="select"
          @page-change="onPage"
          @size-change="onSize"
        >
          <template #toolbar>
            <el-input v-model="q.receiptCode" placeholder="入库单号" clearable class="qbox" @keyup.enter="search" />
            <el-button type="primary" @click="search">搜索</el-button>
            <el-button @click="reset">重置</el-button>
          </template>
          <template #col-receiptStatus="{ row }">
            <el-tag :type="receiptStatusMeta(row.receiptStatus).tag" disable-transitions>{{ receiptStatusMeta(row.receiptStatus).label }}</el-tag>
          </template>
        </DataTable>
      </template>
      <template #detail>
        <ReceiptItemsPanel v-if="selected" :receipt="selected" :items="items" :loading="itemsLoading" @post="openPost" />
      </template>
    </MasterDetailLayout>
    <ReceiptPostDialog v-model="postOpen" :item="activeItem" @posted="afterPost" />
  </PageContainer>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import PageContainer from '@/components/PageContainer.vue'
import MasterDetailLayout from '@/components/MasterDetailLayout.vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import ReceiptItemsPanel from './ReceiptItemsPanel.vue'
import ReceiptPostDialog from './ReceiptPostDialog.vue'
import { pageReceipts, receiptItems } from '@/api/inventory/receipt'
import { useRequest } from '@/composables/useRequest'
import { receiptStatusMeta } from '@/utils/inventory'
import type { SpWarehouseReceipt, SpWarehouseReceiptItem } from '@/types/inventory'

const columns: Column[] = [
  { prop: 'receiptCode', label: '入库单号', minWidth: 140 },
  { prop: 'orderCode', label: '订单号', width: 120 },
  { prop: 'receiptStatus', label: '状态', width: 100 },
]

const current = ref(1)
const size = ref(10)
const q = reactive({ receiptCode: '' })
const selected = ref<SpWarehouseReceipt | null>(null)

const { data: page, loading, run: runPage } = useRequest(pageReceipts)
const { data: items, loading: itemsLoading, run: runItems } = useRequest(receiptItems)

const postOpen = ref(false)
const activeItem = ref<SpWarehouseReceiptItem | null>(null)
// 弹窗关闭后清空当前明细引用,避免关闭动画期间渲染陈旧数据
watch(postOpen, (open) => { if (!open) activeItem.value = null })

function load() {
  runPage({ current: current.value, size: size.value, receiptCode: q.receiptCode || undefined })
}
function search() { current.value = 1; load() }
function reset() { q.receiptCode = ''; search() }
function onPage(p: number) { current.value = p; load() }
function onSize(s: number) { size.value = s; current.value = 1; load() }

function select(row: SpWarehouseReceipt) {
  selected.value = row
  runItems(row.id)
}
function openPost(item: SpWarehouseReceiptItem) {
  activeItem.value = item
  postOpen.value = true
}
async function afterPost() {
  if (selected.value) await runItems(selected.value.id)
  load()
}

load()
</script>

<style scoped>
.qbox { width: 180px; }
</style>
