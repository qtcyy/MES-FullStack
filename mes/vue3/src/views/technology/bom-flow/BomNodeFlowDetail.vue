<template>
  <div class="bf-detail">
    <!-- 节点信息 -->
    <el-descriptions :column="2" border size="small" title="节点信息">
      <el-descriptions-item label="节点名称">{{ node.bomNode.nodeName }}</el-descriptions-item>
      <el-descriptions-item label="层级">{{ levelText(node.bomNode.level) }}</el-descriptions-item>
      <el-descriptions-item label="编码">{{ node.bomNode.bomCode ?? '-' }}</el-descriptions-item>
      <el-descriptions-item label="状态">
        <el-tag :type="node.bomNode.status === 'locked' ? 'warning' : 'info'" size="small" disable-transitions>
          {{ node.bomNode.status === 'locked' ? '已锁定' : '草稿' }}
        </el-tag>
      </el-descriptions-item>
    </el-descriptions>

    <!-- 已绑工艺 -->
    <div class="bf-flow-card">
      <div class="bf-flow-card__head">
        <span class="bf-flow-card__title">已绑工艺路线</span>
        <div class="bf-flow-card__ops">
          <el-button type="primary" size="small" :disabled="!canWrite" @click="$emit('bind')">
            {{ node.bomFlow ? '换绑' : '绑定' }}
          </el-button>
          <el-button
            v-if="node.bomFlow"
            type="danger"
            size="small"
            :disabled="!canWrite"
            @click="$emit('unbind')"
          >解绑</el-button>
        </div>
      </div>
      <div v-if="node.flow" class="bf-flow-card__body">
        <span class="bf-flow-card__name">{{ node.flow.flow }}</span>
        <span class="bf-flow-card__desc">{{ node.flow.flowDesc ?? '' }}</span>
      </div>
      <el-empty v-else description="未绑定工艺路线" :image-size="60" />
    </div>

    <!-- 工序链预览(只读) -->
    <div v-if="rows.length" class="bf-opers">
      <div class="bf-opers__title">工序链预览</div>
      <el-table :data="rows" size="small" border>
        <el-table-column prop="seq" label="序号" width="70" />
        <el-table-column prop="operDesc" label="工序" min-width="160" />
        <el-table-column prop="mark" label="标记" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.mark" size="small" type="success" disable-transitions>{{ row.mark }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { flowOperRows } from '@/utils/bomFlow'
import type { BomFlowNodeVO } from '@/types/technology'

const props = defineProps<{
  node: BomFlowNodeVO
  canWrite: boolean
}>()
defineEmits<{ bind: []; unbind: [] }>()

const rows = computed(() => flowOperRows(props.node.opers))

function levelText(level?: number): string {
  if (level === 0) return '产品'
  if (level === 1) return '半成品'
  if (level === 2) return '组件'
  return '-'
}
</script>

<style scoped>
.bf-detail { display: flex; flex-direction: column; gap: var(--sp-3); }
.bf-flow-card { border: 1px solid var(--el-border-color); border-radius: 6px; padding: var(--sp-3); }
.bf-flow-card__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-2); }
.bf-flow-card__title { font-weight: 600; }
.bf-flow-card__body { display: flex; flex-direction: column; gap: 2px; }
.bf-flow-card__name { font-weight: 600; color: var(--el-color-primary); }
.bf-flow-card__desc { color: var(--el-text-color-secondary); font-size: 13px; }
.bf-opers__title { font-weight: 600; margin-bottom: var(--sp-2); }
</style>
