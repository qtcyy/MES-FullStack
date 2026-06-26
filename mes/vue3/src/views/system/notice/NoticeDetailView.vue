<template>
  <PageContainer>
    <div class="notice-detail-page">
      <div class="notice-detail-page__bar">
        <el-button :icon="ArrowLeft" @click="goBack">返回收件箱</el-button>
        <el-button
          v-if="data"
          type="danger"
          :icon="Delete"
          @click="handleDelete"
        >
          删除
        </el-button>
      </div>

      <!-- 加载中骨架 -->
      <el-skeleton v-if="loading" :rows="6" animated />

      <!-- 详情正文 -->
      <el-card v-else-if="data" shadow="never" class="notice-detail-page__card">
        <h2 class="notice-detail-page__title">{{ data.title }}</h2>
        <div class="notice-detail-page__meta">
          <el-tag :type="tagType(data.type)" size="small" effect="light">{{ typeLabel(data.type) }}</el-tag>
          <span>发布人：{{ data.sender || '系统' }}</span>
          <span>{{ formatTime(data.noticeTime) }}</span>
          <el-tag :type="data.isRead === '1' ? 'info' : 'danger'" size="small">
            {{ data.isRead === '1' ? '已读' : '未读' }}
          </el-tag>
        </div>
        <div class="notice-detail-page__content">{{ data.content || '（无正文）' }}</div>
      </el-card>

      <!-- 未找到/已失效 -->
      <el-empty v-else description="通知不存在或已被删除" />
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Delete } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import { inboxDetail, inboxDelete } from '@/api/system/notice'
import { useNoticeStore } from '@/stores/notice'
import type { SysNoticeInbox, NoticeType } from '@/types/system'

// 动态路由参数：/system/notice/:id —— 通过 useRoute().params 取收件箱行 id
const route = useRoute()
const router = useRouter()
const store = useNoticeStore()

const data = ref<SysNoticeInbox | null>(null)
const loading = ref(false)

/** 按路由参数 id 拉取详情；后端在 detail 接口内顺带标记已读，故拉取后刷新未读角标 */
async function load(id: string) {
  loading.value = true
  try {
    data.value = await inboxDetail(id)
    await store.refresh()
  } catch {
    data.value = null
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push('/system/notice')
}

async function handleDelete() {
  if (!data.value) return
  try {
    await ElMessageBox.confirm(`确认删除通知「${data.value.title}」?`, '提示', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  await inboxDelete(data.value.id)
  ElMessage.success('删除成功')
  await store.refresh()
  goBack()
}

function tagType(t: NoticeType) {
  return ({ info: 'info', success: 'success', warning: 'warning', error: 'danger' } as const)[t] ?? 'info'
}
function typeLabel(t: NoticeType) {
  return ({ info: '通知', success: '成功', warning: '提醒', error: '警告' } as const)[t] ?? '通知'
}
function formatTime(t?: string) {
  return t ? dayjs(t).format('YYYY-MM-DD HH:mm') : ''
}

// 组合式 API 生命周期钩子：首次进入加载
onMounted(() => load(route.params.id as string))
// 复用同一组件实例时（如从一条通知跳到另一条），监听参数变化重新加载
watch(
  () => route.params.id,
  (id) => {
    if (id) load(id as string)
  },
)
</script>

<style scoped>
.notice-detail-page__bar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}
.notice-detail-page__title {
  margin: 0 0 12px;
  font-size: 20px;
}
.notice-detail-page__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  margin-bottom: 16px;
}
.notice-detail-page__content {
  white-space: pre-wrap;
  line-height: 1.8;
  color: var(--el-text-color-primary);
}
</style>
