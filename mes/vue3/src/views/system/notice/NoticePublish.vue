<template>
  <PageContainer>
    <div class="pub-toolbar">
      <el-button v-permission="'notice:publish'" type="primary" :icon="Plus" @click="openPublish">
        发布通知
      </el-button>
    </div>

    <DataTable
      :data="rows"
      :loading="loading"
      :columns="columns"
      :pager="pager"
      :action-width="160"
      @page-change="(p: number) => { pager.current = p; load() }"
      @size-change="(s: number) => { pager.size = s; pager.current = 1; load() }"
    >
      <template #col-type="{ row }">
        <el-tag :type="tagType((row as SysNotice).type)" size="small" effect="light">
          {{ typeLabel((row as SysNotice).type) }}
        </el-tag>
      </template>
      <template #actions="{ row }">
        <el-button type="primary" link size="small" @click="openStat(row as SysNotice)">已读统计</el-button>
        <el-button type="danger" link size="small" @click="handleDelete(row as SysNotice)">删除</el-button>
      </template>
    </DataTable>

    <el-dialog v-model="dialogVisible" title="发布通知" width="600px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入标题" clearable />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="form.type" style="width: 100%">
            <el-option label="通知" value="info" />
            <el-option label="成功" value="success" />
            <el-option label="提醒" value="warning" />
            <el-option label="警告" value="error" />
          </el-select>
        </el-form-item>
        <el-form-item label="正文" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="4" placeholder="请输入正文" />
        </el-form-item>
        <el-form-item label="推送目标" prop="targetType">
          <el-radio-group v-model="form.targetType" @change="form.targetIds = []">
            <el-radio value="all">全员</el-radio>
            <el-radio value="user">指定用户</el-radio>
            <el-radio value="role">指定角色</el-radio>
            <el-radio value="dept">指定部门</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.targetType === 'user'" label="选择用户" prop="targetIds">
          <el-select v-model="form.targetIds" multiple filterable placeholder="选择用户" style="width: 100%">
            <el-option v-for="u in users" :key="u.id" :label="u.name || u.username" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.targetType === 'role'" label="选择角色" prop="targetIds">
          <el-select v-model="form.targetIds" multiple filterable placeholder="选择角色" style="width: 100%">
            <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.targetType === 'dept'" label="选择部门" prop="targetIds">
          <el-tree-select
            v-model="form.targetIds"
            :data="deptTree"
            multiple
            :render-after-expand="false"
            node-key="id"
            :props="{ label: 'name', children: 'children' }"
            placeholder="选择部门"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">发布</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="statVisible" title="已读统计" width="360px" append-to-body>
      <el-descriptions v-if="stat" :column="1" border>
        <el-descriptions-item label="收件人数">{{ stat.total }}</el-descriptions-item>
        <el-descriptions-item label="已读">{{ stat.readCount }}</el-descriptions-item>
        <el-descriptions-item label="未读">{{ stat.unreadCount }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import DataTable from '@/components/DataTable.vue'
import type { Column } from '@/components/DataTable.vue'
import { useNoticeStore } from '@/stores/notice'
import { noticePage, noticePublish, noticeReadStat, noticeDelete } from '@/api/system/notice'
import { deptAll } from '@/api/system/dept'
import { userPage } from '@/api/system/user'
import { rolePage } from '@/api/system/role'
import { buildTree } from '@/utils/systemTree'
import type { SysNotice, NoticeType, NoticeReadStat, NoticeTargetType } from '@/types/system'

const store = useNoticeStore()

const columns: Column[] = [
  { prop: 'title', label: '标题', minWidth: 220 },
  { prop: 'type', label: '类型', width: 90 },
  { prop: 'targetDesc', label: '推送目标', width: 140 },
  { prop: 'recipientCount', label: '收件人', width: 90 },
  { prop: 'sender', label: '发布人', width: 110 },
  { prop: 'createTime', label: '发布时间', width: 160 },
]

function tagType(t: NoticeType) {
  return ({ info: 'info', success: 'success', warning: 'warning', error: 'danger' } as const)[t] ?? 'info'
}
function typeLabel(t: NoticeType) {
  return ({ info: '通知', success: '成功', warning: '提醒', error: '警告' } as const)[t] ?? '通知'
}

const pager = reactive({ current: 1, size: 10, total: 0 })
const rows = ref<SysNotice[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await noticePage({ current: pager.current, size: pager.size })
    rows.value = res.records
    pager.total = res.total
  } finally {
    loading.value = false
  }
}

const users = ref<Array<{ id: string; name: string; username: string }>>([])
const roles = ref<Array<{ id: string; name: string }>>([])
const deptTree = ref<Record<string, unknown>[]>([])

async function loadTargets() {
  const [u, r, d] = await Promise.all([
    userPage({ current: 1, size: 9999 }),
    rolePage({ current: 1, size: 9999 }),
    deptAll(),
  ])
  users.value = u.records as Array<{ id: string; name: string; username: string }>
  roles.value = r.records as Array<{ id: string; name: string }>
  deptTree.value = buildTree(d.records) as unknown as Record<string, unknown>[]
}

const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const submitting = ref(false)
const form = reactive<{
  title: string
  content: string
  type: NoticeType
  targetType: NoticeTargetType
  targetIds: string[]
}>({
  title: '',
  content: '',
  type: 'info',
  targetType: 'all',
  targetIds: [],
})

const rules = computed<FormRules>(() => ({
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  targetIds:
    form.targetType === 'all'
      ? []
      : [{ type: 'array', required: true, min: 1, message: '请选择推送目标', trigger: 'change' }],
}))

function openPublish() {
  form.title = ''
  form.content = ''
  form.type = 'info'
  form.targetType = 'all'
  form.targetIds = []
  dialogVisible.value = true
}

async function handleSubmit() {
  await formRef.value?.validate()
  submitting.value = true
  try {
    await noticePublish({
      title: form.title,
      content: form.content,
      type: form.type,
      targetType: form.targetType,
      targetIds: form.targetType === 'all' ? undefined : form.targetIds,
    })
    ElMessage.success('发布成功')
    dialogVisible.value = false
    await Promise.all([load(), store.refresh()])
  } finally {
    submitting.value = false
  }
}

const statVisible = ref(false)
const stat = ref<NoticeReadStat | null>(null)

async function openStat(row: SysNotice) {
  stat.value = await noticeReadStat(row.id)
  statVisible.value = true
}

async function handleDelete(row: SysNotice) {
  try {
    await ElMessageBox.confirm(
      `确认删除通知「${row.title}」?该操作会同时撤回所有收件箱。`,
      '提示',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  await noticeDelete(row.id)
  ElMessage.success('删除成功')
  // 级联撤回收件箱后,刷新铃铛未读数(管理员自身可能是收件人)
  await Promise.all([load(), store.refresh()])
}

onMounted(() => {
  load()
  loadTargets()
})
</script>

<style scoped>
.pub-toolbar {
  margin-bottom: 12px;
}
</style>
