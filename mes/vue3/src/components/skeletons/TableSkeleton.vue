<template>
  <div class="table-skeleton">
    <el-skeleton v-for="i in rows" :key="i" animated :rows="0">
      <template #template>
        <el-skeleton-item variant="text" class="table-skeleton__row" />
      </template>
    </el-skeleton>
  </div>
</template>

<script setup lang="ts">
// 表格加载骨架屏:渲染 N 行占位
withDefaults(defineProps<{ rows?: number }>(), { rows: 8 })
</script>

<style scoped>
.table-skeleton {
  padding: var(--sp-2) 0;
}
.table-skeleton__row {
  width: 100%;
  height: 38px;
  margin-bottom: var(--sp-2);
}
</style>
