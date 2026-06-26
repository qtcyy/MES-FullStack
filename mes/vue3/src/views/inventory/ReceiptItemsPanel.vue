<template>
  <el-card>
    <template #header>
      <span>入库单 {{ receipt.receiptCode }} 明细</span>
      <el-tag class="hdr-tag" :type="receiptStatusMeta(receipt.receiptStatus).tag" disable-transitions>
        {{ receiptStatusMeta(receipt.receiptStatus).label }}
      </el-tag>
      <span class="hdr-prog">登账 {{ progressText(receipt.postedItems, receipt.totalItems) }}</span>
    </template>
    <el-table v-loading="loading" :data="items ?? []" stripe>
      <el-table-column prop="materialCode" label="物料编码" width="150" />
      <el-table-column prop="materialDesc" label="描述" min-width="140" />
      <el-table-column prop="quantity" label="数量" width="90" />
      <el-table-column prop="unit" label="单位" width="70" />
      <el-table-column prop="locationCode" label="库位" width="110" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="postStatusMeta((row as SpWarehouseReceiptItem).postStatus).tag" disable-transitions>{{ postStatusMeta((row as SpWarehouseReceiptItem).postStatus).label }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button v-if="(row as SpWarehouseReceiptItem).postStatus !== 'posted'" type="primary" link @click="emit('post', row as SpWarehouseReceiptItem)">登账</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { receiptStatusMeta, postStatusMeta, progressText } from '@/utils/inventory'
import type { SpWarehouseReceipt, SpWarehouseReceiptItem } from '@/types/inventory'

defineProps<{
  receipt: SpWarehouseReceipt
  items: SpWarehouseReceiptItem[] | undefined
  loading: boolean
}>()
const emit = defineEmits<{ post: [SpWarehouseReceiptItem] }>()
</script>

<style scoped>
.hdr-tag { margin-left: var(--sp-2); }
.hdr-prog { margin-left: var(--sp-3); color: var(--el-text-color-secondary); font-size: 13px; }
</style>
