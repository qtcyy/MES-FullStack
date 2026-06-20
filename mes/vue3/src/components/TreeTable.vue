<template>
  <div class="tree-table">
    <div v-if="$slots.toolbar" class="tree-table__toolbar"><slot name="toolbar" /></div>
    <el-table
      v-loading="loading"
      :data="data"
      row-key="id"
      :tree-props="{ children: 'children' }"
      default-expand-all
      stripe
    >
      <el-table-column
        v-for="c in columns" :key="c.prop" :prop="c.prop" :label="c.label"
        :width="c.width" :min-width="c.minWidth" show-overflow-tooltip
      >
        <template v-if="$slots[`col-${c.prop}`]" #default="{ row }">
          <slot :name="`col-${c.prop}`" :row="row" />
        </template>
      </el-table-column>
      <el-table-column v-if="$slots.actions" label="操作" :width="actionWidth" fixed="right">
        <template #default="{ row }"><slot name="actions" :row="row" /></template>
      </el-table-column>
      <template #empty><el-empty description="暂无数据" /></template>
    </el-table>
  </div>
</template>

<script setup lang="ts" generic="T extends Record<string, unknown>">
/** 列定义(与 DataTable 同形,避免跨 SFC 类型导入) */
export interface Column { prop: string; label: string; width?: number | string; minWidth?: number | string }
withDefaults(
  defineProps<{ data: T[]; columns: Column[]; loading?: boolean; actionWidth?: number | string }>(),
  { loading: false, actionWidth: 200 },
)
</script>

<style scoped>
.tree-table__toolbar { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin-bottom: var(--sp-3); }
</style>
