<template>
  <!-- 有子节点 → 子菜单(递归);否则有有效 url → 叶子菜单项 -->
  <el-sub-menu v-if="hasChildren" :index="node.id">
    <template #title>
      <el-icon><component :is="resolveIcon(hint)" /></el-icon>
      <span>{{ node.name }}</span>
    </template>
    <MenuItem v-for="child in node.children" :key="child.id" :node="child" />
  </el-sub-menu>

  <el-menu-item v-else-if="hasUrl" :index="node.url ?? node.id">
    <el-icon><component :is="resolveIcon(hint)" /></el-icon>
    <template #title>{{ node.name }}</template>
  </el-menu-item>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TreeVO, SysMenu } from '@/types/menu'
import { resolveIcon } from '@/utils/icon'

const props = defineProps<{ node: TreeVO<SysMenu> }>()

const hasChildren = computed(() => !!props.node.children && props.node.children.length > 0)
const hasUrl = computed(() => {
  const u = props.node.url
  return !!u && u !== '#' && u.trim() !== ''
})
const hint = computed(() => props.node.code || props.node.url || props.node.name)
</script>
