<template>
  <div class="error-page">
    <el-result icon="error" title="403" sub-title="抱歉,你没有访问该页面的权限">
      <template #extra>
        <el-button type="primary" @click="$router.push('/')">返回首页</el-button>
      </template>
    </el-result>
  </div>
</template>

<style scoped>
.error-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 70vh;
}
</style>
