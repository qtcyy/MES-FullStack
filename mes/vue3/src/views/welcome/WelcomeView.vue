<template>
  <div class="welcome">
    <!-- 问候横幅 -->
    <section
      class="welcome__banner"
      v-motion
      :initial="{ opacity: 0, y: 16 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 320 } }"
    >
      <div class="welcome__hello">
        <h2>{{ greeting }},{{ user?.name || user?.username || '同学' }} 👋</h2>
        <p>欢迎使用 章鱼师兄 MES · 智能制造执行系统</p>
        <div class="welcome__chips">
          <span class="welcome__chip"><el-icon><Sunny /></el-icon> 系统运行正常</span>
          <span class="welcome__chip"><el-icon><Bell /></el-icon> {{ todos.length }} 项待办</span>
        </div>
      </div>
      <div class="welcome__clock">
        <div class="welcome__time">{{ clock }}</div>
        <div class="welcome__date">{{ today }}</div>
      </div>
    </section>

    <!-- KPI 统计卡 -->
    <section class="welcome__stats">
      <el-card
        v-for="(k, i) in kpis"
        :key="k.key"
        shadow="hover"
        class="welcome__stat"
        :style="{ '--accent': k.color }"
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 300, delay: 80 * i } }"
      >
        <div class="welcome__stat-head">
          <div class="welcome__stat-icon" :style="{ background: k.color + '1a', color: k.color }">
            <el-icon><component :is="k.icon" /></el-icon>
          </div>
          <span
            class="welcome__delta"
            :class="k.delta >= 0 ? 'is-up' : 'is-down'"
          >
            <el-icon><component :is="k.delta >= 0 ? CaretTop : CaretBottom" /></el-icon>
            {{ Math.abs(k.delta) }}%
          </span>
        </div>
        <div class="welcome__stat-value">
          {{ k.value }}<small v-if="k.unit">{{ k.unit }}</small>
        </div>
        <div class="welcome__stat-foot">
          <span class="welcome__stat-label">{{ k.label }}</span>
          <EChart class="welcome__spark" :option="sparkOption(k.spark, k.color)" />
        </div>
      </el-card>
    </section>

    <!-- 数据分析区 -->
    <section class="welcome__analysis">
      <el-card
        shadow="never"
        class="welcome__chart welcome__chart--wide"
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 320, delay: 60 } }"
      >
        <template #header>
          <div class="welcome__chart-title"><el-icon><TrendCharts /></el-icon> 近 7 天产量趋势</div>
        </template>
        <EChart class="welcome__chart-body" :option="trendOption(isDark)" />
      </el-card>

      <el-card
        shadow="never"
        class="welcome__chart"
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 320, delay: 120 } }"
      >
        <template #header>
          <div class="welcome__chart-title"><el-icon><PieChart /></el-icon> 工单状态分布</div>
        </template>
        <EChart class="welcome__chart-body" :option="orderStatusOption(isDark)" />
      </el-card>

      <el-card
        shadow="never"
        class="welcome__chart"
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 320, delay: 180 } }"
      >
        <template #header>
          <div class="welcome__chart-title"><el-icon><Histogram /></el-icon> 各车间稼动率</div>
        </template>
        <EChart class="welcome__chart-body" :option="workshopOeeOption(isDark)" />
      </el-card>
    </section>

    <!-- 底部:快捷入口 + 动态/待办 -->
    <section class="welcome__bottom">
      <!-- 快捷入口 -->
      <el-card shadow="never" class="welcome__quick">
        <template #header>
          <div class="welcome__chart-title"><el-icon><Grid /></el-icon> 快捷入口</div>
        </template>
        <div class="welcome__grid">
          <div
            v-for="(q, i) in quickEntries"
            :key="q.label"
            class="welcome__entry"
            v-motion
            :initial="{ opacity: 0, scale: 0.96 }"
            :enter="{ opacity: 1, scale: 1, transition: { duration: 240, delay: 50 * i } }"
            @click="onEntry(q)"
          >
            <span class="welcome__entry-icon" :style="{ background: q.color + '1a', color: q.color }">
              <el-icon><component :is="q.icon" /></el-icon>
            </span>
            <span class="welcome__entry-label">{{ q.label }}</span>
          </div>
        </div>
      </el-card>

      <!-- 生产动态 + 待办 -->
      <el-card shadow="never" class="welcome__feed">
        <template #header>
          <div class="welcome__chart-title"><el-icon><Bell /></el-icon> 生产动态</div>
        </template>
        <el-timeline class="welcome__timeline">
          <el-timeline-item
            v-for="a in activities"
            :key="a.time + a.text"
            :timestamp="a.time"
            :type="a.type"
            placement="top"
          >
            {{ a.text }}
          </el-timeline-item>
        </el-timeline>

        <div class="welcome__todo-title">待处理事项</div>
        <ul class="welcome__todo">
          <li v-for="t in todos" :key="t.text">
            <el-tag :type="t.tagType" size="small" effect="light">{{ t.tag }}</el-tag>
            <span>{{ t.text }}</span>
          </li>
        </ul>
      </el-card>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Sunny,
  Bell,
  Grid,
  TrendCharts,
  PieChart,
  Histogram,
  CaretTop,
  CaretBottom,
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import EChart from '@/components/EChart.vue'
import { kpis, quickEntries, activities, todos, type QuickEntry } from './mock'
import {
  sparkOption,
  trendOption,
  orderStatusOption,
  workshopOeeOption,
} from './charts'

const router = useRouter()
const userStore = useUserStore()
const appStore = useAppStore()
const user = computed(() => userStore.user)
const isDark = computed(() => appStore.theme === 'dark')

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '凌晨好'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})
const today = computed(() =>
  new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }),
)

// 实时时钟
const clock = ref('')
let timer: ReturnType<typeof setInterval> | undefined
function tick() {
  clock.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
}
onMounted(() => {
  tick()
  timer = setInterval(tick, 1000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

function onEntry(q: QuickEntry) {
  if (q.route) {
    router.push(q.route)
  } else {
    ElMessage.info(`${q.label} 模块将在后续周期上线,敬请期待 🚀`)
  }
}
</script>

<style scoped>
.welcome {
  padding: var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: var(--sp-6);
}

/* 横幅 */
.welcome__banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-6);
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--brand), #36e0ff);
  color: #fff;
  box-shadow: var(--shadow-card);
  overflow: hidden;
}
.welcome__hello h2 {
  margin: 0 0 var(--sp-2);
  font-size: 24px;
}
.welcome__hello p {
  margin: 0;
  opacity: 0.92;
}
.welcome__chips {
  margin-top: var(--sp-4);
  display: flex;
  gap: var(--sp-2);
  flex-wrap: wrap;
}
.welcome__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  font-size: 13px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(4px);
}
.welcome__clock {
  text-align: right;
}
.welcome__time {
  font-size: 34px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 1px;
  line-height: 1.1;
}
.welcome__date {
  font-size: 14px;
  opacity: 0.9;
  margin-top: var(--sp-1);
}

/* KPI 卡 */
.welcome__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--sp-4);
}
.welcome__stat {
  position: relative;
  overflow: hidden;
}
.welcome__stat::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--accent);
}
.welcome__stat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.welcome__stat-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius);
  display: grid;
  place-items: center;
  font-size: 20px;
}
.welcome__delta {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 13px;
  font-weight: 600;
}
.welcome__delta.is-up {
  color: #52c41a;
}
.welcome__delta.is-down {
  color: #f5222d;
}
.welcome__stat-value {
  font-size: 30px;
  font-weight: 700;
  line-height: 1.2;
  margin: var(--sp-3) 0 var(--sp-2);
  color: var(--text-1);
}
.welcome__stat-value small {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-2);
  margin-left: 2px;
}
.welcome__stat-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.welcome__stat-label {
  color: var(--text-2);
}
.welcome__spark {
  width: 96px;
  height: 36px;
}

/* 数据分析区 */
.welcome__analysis {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: var(--sp-4);
}
.welcome__chart-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: var(--text-1);
}
.welcome__chart-body {
  height: 260px;
}

/* 底部 */
.welcome__bottom {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--sp-4);
}
.welcome__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: var(--sp-4);
}
.welcome__entry {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-4) var(--sp-2);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  transition:
    transform var(--dur) var(--ease-standard),
    box-shadow var(--dur) var(--ease-standard);
}
.welcome__entry:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-pop);
}
.welcome__entry-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius);
  display: grid;
  place-items: center;
  font-size: 24px;
}
.welcome__entry-label {
  font-size: 14px;
  color: var(--text-1);
}

/* 动态 / 待办 */
.welcome__timeline {
  padding-top: var(--sp-2);
}
.welcome__todo-title {
  margin: var(--sp-2) 0 var(--sp-3);
  font-weight: 600;
  color: var(--text-1);
}
.welcome__todo {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.welcome__todo li {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  color: var(--text-2);
  font-size: 14px;
}

/* 响应式 */
@media (max-width: 1100px) {
  .welcome__analysis,
  .welcome__bottom {
    grid-template-columns: 1fr;
  }
}
</style>
