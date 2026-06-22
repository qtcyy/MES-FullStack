<template>
  <FormDialog
    :model-value="modelValue"
    title="发布流程模型"
    width="480px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <p class="publish__desc">将「{{ model?.name }}」发布到指定流程分类下</p>
    <el-form label-width="80px">
      <el-form-item label="流程分类">
        <el-select v-model="categoryCode" placeholder="选择分类" style="width: 100%">
          <el-option v-for="c in categories" :key="c.code" :label="c.name" :value="c.code" />
        </el-select>
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { categoryList } from '@/api/workflow/category'
import { modelPublish } from '@/api/workflow/model'
import type { WorkflowCategory, WorkflowModel } from '@/types/workflow'

const props = defineProps<{ modelValue: boolean; model: WorkflowModel | null }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; published: [] }>()

const categories = ref<WorkflowCategory[]>([])
const categoryCode = ref('')
const loading = ref(false)

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    categoryCode.value = props.model?.categoryCode ?? ''
    categoryList()
      .then((list) => {
        categories.value = list ?? []
      })
      .catch(() => {
        /* 拦截器已提示 */
      })
  },
)

async function handleSubmit() {
  if (!props.model) return
  if (!categoryCode.value) {
    ElMessage.error('请选择流程分类')
    return
  }
  const cat = categories.value.find((c) => c.code === categoryCode.value)
  if (!cat) {
    ElMessage.error('分类不存在')
    return
  }
  loading.value = true
  try {
    await modelPublish({ id: props.model.id, categoryCode: cat.code, categoryName: cat.name })
    ElMessage.success('发布成功')
    emit('update:modelValue', false)
    emit('published')
  } catch {
    /* 拦截器已提示 */
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.publish__desc {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
