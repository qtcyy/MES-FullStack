<template>
  <div class="dashboard">
    <ScreenHeader
      title="MES 智慧生产大屏"
      :last-updated="lastUpdated"
      :loading="loading"
      @refresh="load"
      @back="goBack"
    />

    <div v-if="error && !data" class="dashboard__error">
      <p>数据加载失败</p>
      <el-button type="primary" @click="load">重试</el-button>
    </div>

    <div v-else class="dashboard__body">
      <KpiStrip :kpi="data?.kpi ?? emptyKpi" />

      <div class="dashboard__grid">
        <DistPie title="订单状态分布" :data="data?.orderStatus ?? []" />
        <DistPie title="设备状态分布" :data="data?.deviceStatus ?? []" />
        <DistPie title="工单类型分布" :data="data?.orderType ?? []" />
      </div>

      <div class="dashboard__trend">
        <TrendLine :points="data?.monthlyTrend ?? []" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { dashboardOverview } from '@/api/digitization/dashboard'
import type { DashboardKpi, DashboardOverview } from '@/types/digitization'
import ScreenHeader from '@/layouts/components/ScreenHeader.vue'
import KpiStrip from './panels/KpiStrip.vue'
import DistPie from './panels/DistPie.vue'
import TrendLine from './panels/TrendLine.vue'

const router = useRouter()
const data = ref<DashboardOverview | null>(null)
const loading = ref(false)
const error = ref(false)
const lastUpdated = ref<number | null>(null)
const emptyKpi: DashboardKpi = { orderCount: 0, deviceCount: 0, materielCount: 0, flowCount: 0 }

let timer: ReturnType<typeof setInterval> | undefined

async function load() {
  loading.value = true
  try {
    data.value = await dashboardOverview()
    lastUpdated.value = Date.now()
    error.value = false
  } catch {
    error.value = true
    // http 拦截器已 toast,这里仅标记态
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push('/welcome')
}

onMounted(() => {
  load()
  timer = setInterval(load, 30000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 0;
  background:
    radial-gradient(1200px 600px at 50% -10%, rgba(54, 224, 255, 0.08), transparent),
    var(--bg-body);
  color: #eaf2ff;
}
.dashboard__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 24px 24px;
  overflow: auto;
}
.dashboard__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  min-height: 320px;
}
.dashboard__grid > * {
  min-height: 320px;
}
.dashboard__trend {
  min-height: 300px;
}
.dashboard__trend > * {
  height: 100%;
}
.dashboard__error {
  flex: 1;
  display: grid;
  place-content: center;
  gap: 16px;
  text-align: center;
  color: #8aa0c4;
}
@media (max-width: 1100px) {
  .dashboard__grid {
    grid-template-columns: 1fr;
  }
}
</style>
