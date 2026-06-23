<template>
  <PageContainer>
    <SearchForm :model="search as Record<string, unknown>" @search="handleSearch" @reset="handleReset">
      <el-form-item label="标题">
        <el-input v-model="search.titleLike" placeholder="按标题搜索" clearable />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="search.isRead" placeholder="全部" clearable style="width: 120px">
          <el-option label="未读" value="0" />
          <el-option label="已读" value="1" />
        </el-select>
      </el-form-item>
    </SearchForm>

    <DataTable
      :data="rows"
      :loading="loading"
      :columns="columns"
      :pager="pager"
      :action-width="140"
      @page-change="(p: number) => { pager.current = p; load() }"
      @size-change="(s: number) => { pager.size = s; pager.current = 1; load() }"
    >
      <!-- 工具栏插槽:全部已读按钮 -->
      <template #toolbar>
        <el-button
          type="primary"
          :icon="Check"
          :disabled="store.unreadCount === 0"
          @click="handleMarkAll"
        >
          全部已读
        </el-button>
      </template>

      <template #col-title="{ row }">
        <span :class="{ 'inbox-unread': (row as SysNoticeInbox).isRead === '0' }">
          <span v-if="(row as SysNoticeInbox).isRead === '0'" class="inbox-dot" />
          {{ (row as SysNoticeInbox).title }}
        </span>
      </template>
      <template #col-type="{ row }">
        <el-tag :type="tagType((row as SysNoticeInbox).type)" size="small" effect="light">
          {{ typeLabel((row as SysNoticeInbox).type) }}
        </el-tag>
      </template>
      <template #col-isRead="{ row }">
        <el-tag :type="(row as SysNoticeInbox).isRead === '1' ? 'info' : 'danger'" size="small">
          {{ (row as SysNoticeInbox).isRead === '1' ? '已读' : '未读' }}
        </el-tag>
      </template>
      <template #actions="{ row }">
        <el-button type="primary" link size="small" @click="openDetail(row as SysNoticeInbox)">查看</el-button>
        <el-button type="danger" link size="small" @click="handleDelete(row as SysNoticeInbox)">删除</el-button>
      </template>
    </DataTable>

    <NoticeDetailDialog v-model="detailVisible" :data="detailData" />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import SearchForm from '@/components/SearchForm.vue'
import DataTable from '@/components/DataTable.vue'
import type { Column } from '@/components/DataTable.vue'
import NoticeDetailDialog from './NoticeDetailDialog.vue'
import { useNoticeStore } from '@/stores/notice'
import { inboxPage, inboxDetail, inboxMarkAllRead, inboxDelete } from '@/api/system/notice'
import type { SysNoticeInbox, NoticeType } from '@/types/system'

const route = useRoute()
const store = useNoticeStore()

const columns: Column[] = [
  { prop: 'title', label: '标题', minWidth: 240 },
  { prop: 'type', label: '类型', width: 90 },
  { prop: 'sender', label: '发布人', width: 120 },
  { prop: 'noticeTime', label: '时间', width: 160 },
  { prop: 'isRead', label: '状态', width: 90 },
]

function tagType(t: NoticeType) {
  return ({ info: 'info', success: 'success', warning: 'warning', error: 'danger' } as const)[t] ?? 'info'
}
function typeLabel(t: NoticeType) {
  return ({ info: '通知', success: '成功', warning: '提醒', error: '警告' } as const)[t] ?? '通知'
}

const search = reactive({ titleLike: '', isRead: '' })
const pager = reactive({ current: 1, size: 10, total: 0 })
const rows = ref<SysNoticeInbox[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await inboxPage({
      current: pager.current,
      size: pager.size,
      titleLike: search.titleLike || undefined,
      isRead: search.isRead || undefined,
    })
    rows.value = res.records
    pager.total = res.total
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pager.current = 1
  load()
}
function handleReset() {
  search.titleLike = ''
  search.isRead = ''
  pager.current = 1
  load()
}

const detailVisible = ref(false)
const detailData = ref<SysNoticeInbox | null>(null)

async function openDetail(row: SysNoticeInbox) {
  detailData.value = await inboxDetail(row.id)
  detailVisible.value = true
  // 标记已读后刷新列表和未读计数
  await Promise.all([load(), store.refresh()])
}

async function handleMarkAll() {
  await inboxMarkAllRead()
  ElMessage.success('已全部标记为已读')
  await Promise.all([load(), store.refresh()])
}

async function handleDelete(row: SysNoticeInbox) {
  try {
    await ElMessageBox.confirm(
      `确认删除通知「${row.title}」?`,
      '提示',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  await inboxDelete(row.id)
  ElMessage.success('删除成功')
  await Promise.all([load(), store.refresh()])
}

onMounted(async () => {
  await load()
  // ?open=<inboxId> 深链接：自动打开指定通知详情
  const openId = route.query.open as string | undefined
  if (openId) {
    const found = rows.value.find((r) => r.id === openId)
    if (found) await openDetail(found)
  }
})
</script>

<style scoped>
.inbox-unread {
  font-weight: 600;
}
.inbox-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--el-color-danger);
  margin-right: 6px;
  vertical-align: middle;
}
</style>
