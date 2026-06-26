<template>
  <section
    class="page-container"
    v-motion
    :initial="{ opacity: 0, y: 12 }"
    :enter="{ opacity: 1, y: 0, transition: { duration: 240 } }"
  >
    <header v-if="title || $slots.extra" class="page-container__header">
      <h3 v-if="title" class="page-container__title">{{ title }}</h3>
      <div class="page-container__extra"><slot name="extra" /></div>
    </header>
    <slot />
  </section>
</template>

<script setup lang="ts">
// 统一页容器:标题区 + 入场动画(v-motion)
defineProps<{ title?: string }>()
</script>

<style scoped>
.page-container {
  padding: var(--sp-4);
}
.page-container__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-4);
}
.page-container__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-1);
}
</style>
