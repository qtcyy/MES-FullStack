<template>
  <el-card shadow="hover" class="todo-card">
    <template #header>
      <span>我的待办</span>
      <el-badge :value="rows.length" :max="99" type="warning" style="margin-left:8px" />
      <el-link type="primary" style="float:right" @click="goAll">全部 →</el-link>
    </template>
    <el-empty v-if="!rows.length" description="暂无待办" :image-size="60" />
    <ul v-else class="todo-list">
      <li v-for="t in rows.slice(0, 5)" :key="t.id">
        <el-link type="primary" @click="goAll">{{ t.taskName }}</el-link>
        <span class="biz">{{ t.businessId }}</span>
        <el-tag size="small" :type="t.status === 'PENDING' ? 'warning' : 'primary'">
          {{ t.status === 'PENDING' ? '待签收' : '已签收' }}
        </el-tag>
      </li>
    </ul>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRequest } from '@/composables/useRequest'
import { taskTodo } from '@/api/workflow/task'
import type { WorkflowTask } from '@/types/plan'

const router = useRouter()
const { data } = useRequest(() => taskTodo(), { immediate: true, initialData: [] })
const rows = computed<WorkflowTask[]>(() => data.value ?? [])
function goAll() { router.push('/plan/todo') }
</script>

<style scoped>
.todo-list { list-style: none; margin: 0; padding: 0; }
.todo-list li { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--el-border-color-lighter); }
.todo-list .biz { flex: 1; color: var(--el-text-color-secondary); font-size: 12px; }
</style>
