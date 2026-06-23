<template>
  <PageContainer title="配套出库确认">
    <MasterDetailLayout :has-selection="!!selected" :master-width="440">
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
            <el-input v-model="q.outboundCode" placeholder="出库单号" clearable class="qbox" @keyup.enter="search" />
            <el-button type="primary" @click="search">搜索</el-button>
            <el-button @click="reset">重置</el-button>
          </template>
          <template #col-outboundStatus="{ row }">
            <el-tag :type="outboundStatusMeta(row.outboundStatus).tag" disable-transitions>{{ outboundStatusMeta(row.outboundStatus).label }}</el-tag>
          </template>
        </DataTable>
      </template>
      <template #detail>
        <OutboundItemsPanel v-if="selected" :order="selected" :items="items" :loading="itemsLoading" @post="confirmPost" />
      </template>
    </MasterDetailLayout>
  </PageContainer>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import MasterDetailLayout from '@/components/MasterDetailLayout.vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import OutboundItemsPanel from './OutboundItemsPanel.vue'
import { pageOutbounds, outboundItems, postOutboundItem } from '@/api/inventory/outbound'
import { useRequest } from '@/composables/useRequest'
import { outboundStatusMeta } from '@/utils/inventory'
import type { SpOutboundOrder, SpOutboundOrderItem } from '@/types/inventory'

const columns: Column[] = [
  { prop: 'outboundCode', label: '出库单号', minWidth: 140 },
  { prop: 'orderCode', label: '订单号', width: 120 },
  { prop: 'outboundStatus', label: '状态', width: 100 },
]

const current = ref(1)
const size = ref(10)
const q = reactive({ outboundCode: '' })
const selected = ref<SpOutboundOrder | null>(null)

const { data: page, loading, run: runPage } = useRequest(pageOutbounds)
const { data: items, loading: itemsLoading, run: runItems } = useRequest(outboundItems)

function load() {
  runPage({ current: current.value, size: size.value, outboundCode: q.outboundCode || undefined })
}
function search() { current.value = 1; load() }
function reset() { q.outboundCode = ''; search() }
function onPage(p: number) { current.value = p; load() }
function onSize(s: number) { size.value = s; current.value = 1; load() }

function select(row: SpOutboundOrder) {
  selected.value = row
  runItems(row.id)
}
async function confirmPost(item: SpOutboundOrderItem) {
  try {
    await ElMessageBox.confirm(
      `确认对「${item.materialCode}」按 FIFO 出库 ${item.quantity} ${item.unit ?? ''}?将自动扣减最早批次库存。`,
      'FIFO 出库登账',
      { type: 'warning' },
    )
  } catch {
    return
  }
  await postOutboundItem({ itemId: item.id })
  ElMessage.success('出库登账成功')
  if (selected.value) await runItems(selected.value.id)
  load()
}

load()
</script>

<style scoped>
.qbox { width: 180px; }
</style>
