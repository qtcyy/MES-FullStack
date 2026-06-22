<template>
  <el-card>
    <template #header>
      <span>出库单 {{ order.outboundCode }} 明细</span>
      <el-tag class="hdr-tag" :type="outboundStatusMeta(order.outboundStatus).tag" disable-transitions>
        {{ outboundStatusMeta(order.outboundStatus).label }}
      </el-tag>
      <span class="hdr-prog">出库 {{ progressText(order.postedItems, order.totalItems) }}</span>
    </template>
    <el-table v-loading="loading" :data="items ?? []" stripe>
      <el-table-column prop="materialCode" label="物料编码" width="150" />
      <el-table-column prop="materialDesc" label="描述" min-width="140" />
      <el-table-column prop="quantity" label="数量" width="90" />
      <el-table-column prop="unit" label="单位" width="70" />
      <el-table-column prop="allocationDetail" label="扣减明细" min-width="160" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="postStatusMeta((row as SpOutboundOrderItem).postStatus).tag" disable-transitions>{{ postStatusMeta((row as SpOutboundOrderItem).postStatus).label }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="110">
        <template #default="{ row }">
          <el-button v-if="(row as SpOutboundOrderItem).postStatus !== 'posted'" type="primary" link @click="emit('post', row as SpOutboundOrderItem)">FIFO 登账</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { outboundStatusMeta, postStatusMeta, progressText } from '@/utils/inventory'
import type { SpOutboundOrder, SpOutboundOrderItem } from '@/types/inventory'

defineProps<{
  order: SpOutboundOrder
  items: SpOutboundOrderItem[] | undefined
  loading: boolean
}>()
const emit = defineEmits<{ post: [SpOutboundOrderItem] }>()
</script>

<style scoped>
.hdr-tag { margin-left: var(--sp-2); }
.hdr-prog { margin-left: var(--sp-3); color: var(--el-text-color-secondary); font-size: 13px; }
</style>
