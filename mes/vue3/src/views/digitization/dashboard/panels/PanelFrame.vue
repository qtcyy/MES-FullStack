<template>
  <section class="panel-frame">
    <header class="panel-frame__title">
      <span class="panel-frame__bar" />
      {{ title }}
    </header>
    <div class="panel-frame__body">
      <div v-if="empty" class="panel-frame__empty">暂无数据</div>
      <slot v-else />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{ title: string; empty?: boolean }>()
</script>

<style scoped>
.panel-frame {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid rgba(120, 160, 220, 0.18);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(20, 32, 66, 0.55), rgba(12, 20, 44, 0.45));
  backdrop-filter: blur(2px);
  overflow: hidden;
}
.panel-frame__title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 600;
  color: #cfe0ff;
  border-bottom: 1px solid rgba(120, 160, 220, 0.14);
}
.panel-frame__bar {
  width: 4px;
  height: 14px;
  border-radius: 2px;
  background: #36e0ff;
  box-shadow: 0 0 8px #36e0ff;
}
.panel-frame__body {
  position: relative;
  flex: 1;
  min-height: 0;
  padding: 8px;
}
.panel-frame__empty {
  display: grid;
  place-items: center;
  height: 100%;
  color: #6b7da6;
  font-size: 13px;
}
</style>
