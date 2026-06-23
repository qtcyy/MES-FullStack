<template>
  <PageContainer>
    <el-card shadow="never">
      <template #header>
        <span style="font-weight:600">我的待办任务</span>
        <el-badge :value="rows.length" :max="99" type="warning" style="margin-left:8px" />
        <el-button style="float:right" :icon="Refresh" circle @click="run" />
      </template>

      <el-table :data="rows" v-loading="loading" empty-text="暂无待办">
        <el-table-column prop="taskName" label="任务" min-width="160">
          <template #default="{ row }">
            <el-link type="primary" @click="open(row as WorkflowTask)">{{ row.taskName }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="businessId" label="业务单号" min-width="160" />
        <el-table-column prop="status" label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="row.status === 'PENDING' ? 'warning' : 'primary'">
              {{ row.status === 'PENDING' ? '待签收' : '已签收' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="发起时间" width="180" />
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="open(row as WorkflowTask)">处理</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <TodoApprovalDrawer v-model="drawer" :task="current" @done="run" />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import TodoApprovalDrawer from './TodoApprovalDrawer.vue'
import { useRequest } from '@/composables/useRequest'
import { taskTodo } from '@/api/workflow/task'
import type { WorkflowTask } from '@/types/plan'

const { data, loading, run } = useRequest(() => taskTodo(), { immediate: true, initialData: [] })
const rows = computed<WorkflowTask[]>(() => data.value ?? [])

const drawer = ref(false)
const current = ref<WorkflowTask | null>(null)
function open(row: WorkflowTask) { current.value = row; drawer.value = true }
</script>
