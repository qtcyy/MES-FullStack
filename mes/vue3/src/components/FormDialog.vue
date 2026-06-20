<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    :width="width"
    destroy-on-close
    append-to-body
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <slot />
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="loading" @click="emit('submit')">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// 通用弹窗表单容器:visible 双向绑定,确定/取消由父级处理(校验后再 submit)
withDefaults(
  defineProps<{ modelValue: boolean; title?: string; width?: string; loading?: boolean }>(),
  { title: '', width: '520px', loading: false },
)
const emit = defineEmits<{ 'update:modelValue': [boolean]; submit: [] }>()
</script>
