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
      </div>
      <div class="welcome__date">{{ today }}</div>
    </section>

    <!-- 今日概览(占位,Cycle 1 接入大屏数据) -->
    <section class="welcome__stats">
      <el-card
        v-for="(s, i) in stats"
        :key="s.label"
        shadow="hover"
        class="welcome__stat"
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 300, delay: 80 * i } }"
      >
        <div class="welcome__stat-value" :style="{ color: s.color }">{{ s.value }}</div>
        <div class="welcome__stat-label">{{ s.label }}</div>
      </el-card>
    </section>

    <!-- 快捷入口 -->
    <section class="welcome__quick">
      <h3 class="welcome__quick-title">快捷入口</h3>
      <div class="welcome__grid">
        <el-card
          v-for="(q, i) in quickEntries"
          :key="q.label"
          shadow="hover"
          class="welcome__entry"
          v-motion
          :initial="{ opacity: 0, scale: 0.96 }"
          :enter="{ opacity: 1, scale: 1, transition: { duration: 260, delay: 60 * i } }"
          @click="onEntry"
        >
          <el-icon class="welcome__entry-icon" :style="{ color: q.color }">
            <component :is="q.icon" />
          </el-icon>
          <span>{{ q.label }}</span>
        </el-card>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Setting, Box, Share, Tickets, DataBoard, House } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const user = computed(() => userStore.user)

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

// 占位数据,Cycle 1 由 /digitization/dashboard/overview 替换
const stats = [
  { label: '生产工单', value: '128', color: '#2f7cff' },
  { label: '在制物料', value: '1,284', color: '#13c2c2' },
  { label: '设备稼动率', value: '92.3%', color: '#52c41a' },
  { label: '今日良率', value: '98.6%', color: '#fa8c16' },
]

const quickEntries = [
  { label: '系统管理', icon: Setting, color: '#2f7cff' },
  { label: '物料管理', icon: Box, color: '#13c2c2' },
  { label: '工艺路线', icon: Share, color: '#722ed1' },
  { label: '计划工单', icon: Tickets, color: '#fa8c16' },
  { label: '智慧大屏', icon: DataBoard, color: '#eb2f96' },
  { label: '数字孪生', icon: House, color: '#52c41a' },
]

function onEntry() {
  ElMessage.info('该模块将在 Cycle 1 上线,敬请期待 🚀')
}
</script>

<style scoped>
.welcome {
  padding: var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: var(--sp-6);
}
.welcome__banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-6);
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--brand), #36e0ff);
  color: #fff;
  box-shadow: var(--shadow-card);
}
.welcome__hello h2 {
  margin: 0 0 var(--sp-2);
}
.welcome__hello p {
  margin: 0;
  opacity: 0.9;
}
.welcome__date {
  font-size: 14px;
  opacity: 0.9;
}
.welcome__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--sp-4);
}
.welcome__stat {
  text-align: center;
}
.welcome__stat-value {
  font-size: 30px;
  font-weight: 700;
  line-height: 1.2;
}
.welcome__stat-label {
  margin-top: var(--sp-2);
  color: var(--text-2);
}
.welcome__quick-title {
  margin: 0 0 var(--sp-4);
  color: var(--text-1);
}
.welcome__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--sp-4);
}
.welcome__entry {
  cursor: pointer;
  text-align: center;
  transition: transform var(--dur) var(--ease-standard);
}
.welcome__entry:hover {
  transform: translateY(-4px);
}
.welcome__entry-icon {
  display: block;
  margin: 0 auto var(--sp-2);
  font-size: 32px;
}
</style>
