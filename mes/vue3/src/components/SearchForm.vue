<template>
  <el-form :model="model" inline class="search-form" @submit.prevent>
    <slot />
    <el-form-item>
      <el-button type="primary" :icon="Search" @click="emit('search')">搜索</el-button>
      <el-button :icon="Refresh" @click="emit('reset')">重置</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { Search, Refresh } from '@element-plus/icons-vue'

// 通用行内查询表单:默认插槽放 el-form-item,统一搜索/重置按钮
defineProps<{ model: Record<string, unknown> }>()
const emit = defineEmits<{ search: []; reset: [] }>()
</script>

<style scoped>
.search-form {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2) var(--sp-4);
  margin-bottom: var(--sp-3);
}
</style>
