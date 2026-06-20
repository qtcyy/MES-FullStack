<template>
  <div class="master-detail">
    <div class="master-detail__master"><slot name="master" /></div>
    <div class="master-detail__detail">
      <slot v-if="hasSelection" name="detail" />
      <slot v-else name="detail-empty"><el-empty description="请选择左侧项查看明细" /></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
// 左主右从两栏布局:master 永显,detail 选中才显示(否则 detail-empty 占位)
defineProps<{ hasSelection: boolean }>()
</script>

<style scoped>
.master-detail { display: grid; grid-template-columns: 360px 1fr; gap: var(--sp-4); align-items: start; }
.master-detail__master, .master-detail__detail { min-width: 0; }
@media (max-width: 900px) { .master-detail { grid-template-columns: 1fr; } }
</style>
