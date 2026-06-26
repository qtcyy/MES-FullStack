<template>
  <VChart class="echart" :option="option" autoresize :theme="undefined" />
</template>

<script setup lang="ts">
/**
 * 轻量 ECharts 封装(按需注册组件,控制体积)。
 * 配色由调用方通过 option 传入,以便随站点主题(浅/深)切换重算。
 */
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
])

defineProps<{ option: EChartsOption }>()
</script>

<style scoped>
.echart {
  width: 100%;
  height: 100%;
}
</style>
