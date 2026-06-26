<template>
  <el-menu
    :default-active="activeMenu"
    :collapse="app.collapsed"
    :collapse-transition="false"
    router
    class="app-sidebar"
  >
    <MenuItem v-for="(group, key) in menuInfo" :key="key" :node="group" />
  </el-menu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { usePermissionStore } from '@/stores/permission'
import MenuItem from './MenuItem.vue'

// 侧栏由 sp_sys_menu 菜单树驱动(不按角色过滤);叶子 index=后端 url,el-menu router 模式直接跳转
const app = useAppStore()
const perm = usePermissionStore()
const route = useRoute()

const menuInfo = computed(() => perm.menuInfo || {})
const activeMenu = computed(() => route.path)
</script>

<style scoped>
.app-sidebar {
  border-right: none;
  background: transparent;
}
.app-sidebar:not(.el-menu--collapse) {
  width: 100%;
}
</style>
