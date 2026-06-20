<template>
  <div class="data-table">
    <div v-if="$slots.toolbar" class="data-table__toolbar"><slot name="toolbar" /></div>

    <TableSkeleton v-if="loading && !data.length" :rows="pager.size" />

    <el-table v-else v-loading="loading" :data="data" :row-key="rowKey" stripe v-auto-animate>
      <el-table-column
        v-for="c in columns"
        :key="c.prop"
        :prop="c.prop"
        :label="c.label"
        :width="c.width"
        :min-width="c.minWidth"
        show-overflow-tooltip
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

    <el-pagination
      class="data-table__pager"
      :current-page="pager.current"
      :page-size="pager.size"
      :total="pager.total"
      :page-sizes="[10, 20, 50, 100]"
      background
      layout="total, sizes, prev, pager, next, jumper"
      @current-change="(p: number) => emit('page-change', p)"
      @size-change="(s: number) => emit('size-change', s)"
    />
  </div>
</template>

<script setup lang="ts" generic="T extends object">
import TableSkeleton from './skeletons/TableSkeleton.vue'

/** 列定义 */
export interface Column {
  prop: string
  label: string
  width?: number | string
  minWidth?: number | string
}

// 通用表格:服务端分页 + 工具栏/行操作/自定义列插槽 + 骨架屏 + 空态 + 列表动画
withDefaults(
  defineProps<{
    data: T[]
    loading?: boolean
    columns: Column[]
    pager: { current: number; size: number; total: number }
    rowKey?: string
    actionWidth?: number | string
  }>(),
  { loading: false, rowKey: 'id', actionWidth: 180 },
)
const emit = defineEmits<{ 'page-change': [number]; 'size-change': [number] }>()
</script>

<style scoped>
.data-table__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-bottom: var(--sp-3);
}
.data-table__pager {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--sp-4);
}
</style>
