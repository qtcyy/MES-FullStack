<template>
  <div class="location-select">
    <el-select
      :model-value="modelValue.warehouseId"
      placeholder="选择库房"
      class="location-select__wh"
      @update:model-value="onWarehouse"
    >
      <el-option v-for="w in warehouses ?? []" :key="w.id" :label="w.name" :value="w.id" />
    </el-select>
    <el-select
      :model-value="modelValue.locationId"
      placeholder="选择库位"
      :loading="locLoading"
      :disabled="!modelValue.warehouseId"
      class="location-select__loc"
      @update:model-value="onLocation"
    >
      <el-option
        v-for="l in locations ?? []"
        :key="l.id"
        :label="locationOptionLabel(l.code, occupancy[l.id], targetMaterial)"
        :value="l.id"
      />
    </el-select>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { warehouseList, warehouseLocations } from '@/api/basedata/warehouse'
import { pageInventory } from '@/api/inventory/stock'
import { useRequest } from '@/composables/useRequest'
import { buildOccupancyMap, locationOptionLabel } from '@/utils/inventory'

const props = defineProps<{
  modelValue: { warehouseId?: string; locationId?: string }
  targetMaterial: string
}>()
const emit = defineEmits<{ 'update:modelValue': [{ warehouseId?: string; locationId?: string }] }>()

const { data: warehouses, run: loadWarehouses } = useRequest(warehouseList)
const { data: locations, loading: locLoading, run: loadLocations } = useRequest(warehouseLocations)

/** 库位id → 占用物料编码 */
const occupancy = ref<Record<string, string>>({})

async function loadOccupancy() {
  // 占用标注为辅助信息:取数失败则降级为全部"空闲",不阻断选择
  try {
    const page = await pageInventory({ current: 1, size: 100000 })
    occupancy.value = buildOccupancyMap(page.records ?? [])
  } catch {
    occupancy.value = {}
  }
}

function onWarehouse(warehouseId: string) {
  emit('update:modelValue', { warehouseId, locationId: undefined })
  loadLocations(warehouseId)
}
function onLocation(locationId: string) {
  emit('update:modelValue', { warehouseId: props.modelValue.warehouseId, locationId })
}

// 已选库房时回填库位列表(编辑/复用场景)
watch(
  () => props.modelValue.warehouseId,
  (wid) => {
    if (wid && !(locations.value?.length)) loadLocations(wid)
  },
)

loadWarehouses()
loadOccupancy()
</script>

<style scoped>
.location-select { display: flex; gap: var(--sp-2); }
.location-select__wh, .location-select__loc { flex: 1; min-width: 0; }
</style>
