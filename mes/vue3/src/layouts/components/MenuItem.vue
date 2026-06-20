<template>
  <!-- 有子节点 → 子菜单(递归);否则有有效 url → 叶子菜单项 -->
  <el-sub-menu v-if="hasChildren" :index="node.id">
    <template #title>
      <el-icon><component :is="resolveIcon(hint)" /></el-icon>
      <span>{{ node.name }}</span>
    </template>
    <MenuItem v-for="child in node.children" :key="child.id" :node="child" />
  </el-sub-menu>

  <el-menu-item v-else-if="target" :index="target">
    <el-icon><component :is="resolveIcon(hint)" /></el-icon>
    <template #title>{{ node.name }}</template>
  </el-menu-item>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TreeVO, SysMenu } from '@/types/menu'
import { resolveIcon } from '@/utils/icon'
import { toSpaRoute } from '@/utils/urlMap'

const props = defineProps<{ node: TreeVO<SysMenu> }>()

const hasChildren = computed(() => !!props.node.children && props.node.children.length > 0)
const target = computed(() => toSpaRoute(props.node.url))
const hint = computed(() => props.node.code || props.node.url || props.node.name)
</script>
