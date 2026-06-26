<template>
  <PanelFrame title="近 12 月生产趋势" :empty="empty">
    <EChart :option="option" />
  </PanelFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import EChart from '@/components/EChart.vue'
import PanelFrame from './PanelFrame.vue'
import { buildTrendOption } from '@/utils/dashboard'
import type { MonthlyTrendPoint } from '@/types/digitization'

const props = defineProps<{ points: MonthlyTrendPoint[] }>()
const empty = computed(() => !props.points.length)
const option = computed(() => buildTrendOption(props.points))
</script>
