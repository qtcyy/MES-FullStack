<template>
  <PanelFrame :title="title" :empty="empty">
    <EChart :option="option" />
  </PanelFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import EChart from '@/components/EChart.vue'
import PanelFrame from './PanelFrame.vue'
import { buildDonutOption, isEmptyDist } from '@/utils/dashboard'
import type { NameValue } from '@/types/digitization'

const props = defineProps<{ title: string; data: NameValue[] }>()
const empty = computed(() => isEmptyDist(props.data))
const option = computed(() => buildDonutOption(props.title, props.data))
</script>
