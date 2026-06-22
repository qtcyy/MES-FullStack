<template>
  <div class="wh-locations">
    <div class="wh-locations__head">
      <span class="wh-locations__title">库位（{{ list.length }}）</span>
      <el-tag type="info" effect="plain">{{ summary.label }}</el-tag>
    </div>

    <el-empty v-if="!loading && list.length === 0" description="暂无库位（保存仓库后自动生成）" />

    <el-table v-else v-loading="loading" :data="list" height="100%" size="small" border>
      <el-table-column prop="code" label="库位编码" min-width="120" />
      <el-table-column prop="groupNo" label="组" width="60" />
      <el-table-column prop="rowNo" label="排" width="60" />
      <el-table-column prop="layerNo" label="层" width="60" />
      <el-table-column prop="colNo" label="列" width="60" />
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRequest } from '@/composables/useRequest'
import { warehouseLocations } from '@/api/basedata/warehouse'
import { locationGridSummary } from '@/utils/warehouse'
import type { SpWarehouse, SpWarehouseLocation } from '@/types/warehouse'

const props = defineProps<{ warehouse: SpWarehouse }>()

const { data, loading } = useRequest(() => warehouseLocations(props.warehouse.id!), { immediate: true })

const list = computed<SpWarehouseLocation[]>(() => data.value ?? [])
const summary = computed(() => locationGridSummary(props.warehouse))
</script>

<style scoped>
.wh-locations { display: flex; flex-direction: column; height: 100%; gap: 12px; }
.wh-locations__head { display: flex; align-items: center; justify-content: space-between; }
.wh-locations__title { font-weight: 600; }
</style>
