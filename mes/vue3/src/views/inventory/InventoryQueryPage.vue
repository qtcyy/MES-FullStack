<template>
  <PageContainer title="库存明细查询">
    <DataTable
      :data="data?.records ?? []"
      :loading="loading"
      :columns="columns"
      :pager="{ current, size, total: data?.total ?? 0 }"
      :action-width="0"
      @page-change="onPage"
      @size-change="onSize"
    >
      <template #toolbar>
        <el-input v-model="q.materialCode" placeholder="物料编码" clearable class="qbox" @keyup.enter="search" />
        <el-button type="primary" @click="search">搜索</el-button>
        <el-button @click="reset">重置</el-button>
      </template>
      <template #col-status="{ row }">
        <el-tag :type="row.quantity > 0 ? 'success' : 'info'" disable-transitions>
          {{ row.quantity > 0 ? '在库' : '无库存' }}
        </el-tag>
      </template>
    </DataTable>
  </PageContainer>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import PageContainer from '@/components/PageContainer.vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import { pageInventory } from '@/api/inventory/stock'
import { useRequest } from '@/composables/useRequest'

const columns: Column[] = [
  { prop: 'materialCode', label: '物料编码', width: 160 },
  { prop: 'materialDesc', label: '物料描述', minWidth: 160 },
  { prop: 'unit', label: '单位', width: 80 },
  { prop: 'warehouseName', label: '库房', width: 140 },
  { prop: 'locationCode', label: '库位', width: 120 },
  { prop: 'quantity', label: '数量', width: 100 },
  { prop: 'status', label: '状态', width: 100 },
  { prop: 'lastInboundTime', label: '最近入库', width: 180 },
]

const current = ref(1)
const size = ref(10)
const q = reactive({ materialCode: '' })

const { data, loading, run } = useRequest(pageInventory)
function load() {
  run({ current: current.value, size: size.value, materialCode: q.materialCode || undefined })
}
function search() { current.value = 1; load() }
function reset() { q.materialCode = ''; search() }
function onPage(p: number) { current.value = p; load() }
function onSize(s: number) { size.value = s; current.value = 1; load() }

load()
</script>

<style scoped>
.qbox { width: 200px; }
</style>
