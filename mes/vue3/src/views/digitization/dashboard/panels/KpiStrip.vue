<template>
  <div class="kpi-strip">
    <div v-for="item in items" :key="item.key" class="kpi-card">
      <div class="kpi-card__icon" :style="{ color: item.color }">
        <component :is="item.icon" />
      </div>
      <div class="kpi-card__main">
        <div class="kpi-card__value">{{ displays[item.key] }}</div>
        <div class="kpi-card__label">{{ item.label }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useTransition } from '@vueuse/core'
import { Document, Cpu, Box, Share } from '@element-plus/icons-vue'
import type { DashboardKpi } from '@/types/digitization'

const props = defineProps<{ kpi: DashboardKpi }>()

const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const items = [
  { key: 'orderCount', label: '生产订单', color: '#36e0ff', icon: Document },
  { key: 'deviceCount', label: '设备总数', color: '#5b8cff', icon: Cpu },
  { key: 'materielCount', label: '物料种类', color: '#34e3b0', icon: Box },
  { key: 'flowCount', label: '工艺路线', color: '#ffc24b', icon: Share },
] as const

const sources = reactive<Record<string, number>>({
  orderCount: 0,
  deviceCount: 0,
  materielCount: 0,
  flowCount: 0,
})

function toRefSrc(key: keyof typeof sources) {
  return computed(() => sources[key])
}

const opts = { duration: reduceMotion ? 0 : 600 }
const tOrder = useTransition(toRefSrc('orderCount'), opts)
const tDevice = useTransition(toRefSrc('deviceCount'), opts)
const tMateriel = useTransition(toRefSrc('materielCount'), opts)
const tFlow = useTransition(toRefSrc('flowCount'), opts)

const tweens = { orderCount: tOrder, deviceCount: tDevice, materielCount: tMateriel, flowCount: tFlow }
const displays = computed(() => ({
  orderCount: Math.round(tweens.orderCount.value),
  deviceCount: Math.round(tweens.deviceCount.value),
  materielCount: Math.round(tweens.materielCount.value),
  flowCount: Math.round(tweens.flowCount.value),
}))

watch(
  () => props.kpi,
  (k) => {
    sources.orderCount = k.orderCount ?? 0
    sources.deviceCount = k.deviceCount ?? 0
    sources.materielCount = k.materielCount ?? 0
    sources.flowCount = k.flowCount ?? 0
  },
  { immediate: true, deep: true },
)
</script>

<style scoped>
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.kpi-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border: 1px solid rgba(120, 160, 220, 0.18);
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(28, 44, 90, 0.6), rgba(12, 20, 44, 0.5));
}
.kpi-card__icon {
  font-size: 30px;
  width: 30px;
  height: 30px;
}
.kpi-card__value {
  font-size: 30px;
  font-weight: 700;
  line-height: 1.1;
  color: #eaf2ff;
  font-variant-numeric: tabular-nums;
}
.kpi-card__label {
  margin-top: 4px;
  font-size: 13px;
  color: #8aa0c4;
}
@media (max-width: 1100px) {
  .kpi-strip {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
