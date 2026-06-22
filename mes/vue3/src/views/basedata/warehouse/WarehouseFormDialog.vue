<template>
  <FormDialog
    :model-value="modelValue"
    :title="isEdit ? '编辑仓库' : '新增仓库'"
    width="640px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="88px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="库房编码" prop="code">
            <el-input v-model="form.code" placeholder="如 WH-01" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="库房名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入库房名称" clearable />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="库房类型" prop="type">
        <!-- sp_warehouse.type 无对应字典,按自由文本处理 -->
        <el-input v-model="form.type" placeholder="如 零件库 / 产品库" clearable />
      </el-form-item>

      <el-form-item label="库位规格" required>
        <div class="wh-dims">
          <el-form-item prop="groups" label="组" label-width="32px">
            <el-input-number v-model="form.groups" :min="1" :step="1" controls-position="right" />
          </el-form-item>
          <el-form-item prop="rows" label="排" label-width="32px">
            <el-input-number v-model="form.rows" :min="1" :step="1" controls-position="right" />
          </el-form-item>
          <el-form-item prop="layers" label="层" label-width="32px">
            <el-input-number v-model="form.layers" :min="1" :step="1" controls-position="right" />
          </el-form-item>
          <el-form-item prop="columns" label="列" label-width="32px">
            <el-input-number v-model="form.columns" :min="1" :step="1" controls-position="right" />
          </el-form-item>
        </div>
      </el-form-item>

      <el-alert
        v-if="isEdit && dimsWarning"
        type="warning"
        :closable="false"
        show-icon
        title="修改库位规格将重建该仓库全部库位（既有库位编码会重置）"
        class="wh-warn"
      />

      <el-form-item label="描述" prop="descr">
        <el-input v-model="form.descr" type="textarea" :rows="2" placeholder="请输入描述" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { buildWarehousePayload, dimensionsChanged } from '@/utils/warehouse'
import type { SpWarehouse } from '@/types/warehouse'

const props = defineProps<{
  modelValue: boolean
  /** null = 新增;Partial(有 id) = 编辑 */
  model: Partial<SpWarehouse> | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [Partial<SpWarehouse>]
}>()

const formRef = ref<FormInstance>()
const isEdit = computed(() => !!props.model?.id)

// 记录打开编辑时的原始维度,用于「维度是否改动」提示
const originalDims = ref<Pick<SpWarehouse, 'groups' | 'rows' | 'layers' | 'columns'> | null>(null)

const form = reactive<Partial<SpWarehouse>>({
  id: undefined,
  code: '',
  name: '',
  type: undefined,
  groups: 1,
  rows: 1,
  layers: 1,
  columns: 1,
  descr: undefined,
})

function resetForm() {
  form.id = undefined
  form.code = ''
  form.name = ''
  form.type = undefined
  form.groups = 1
  form.rows = 1
  form.layers = 1
  form.columns = 1
  form.descr = undefined
}

watch(
  () => props.model,
  (val) => {
    if (val) {
      Object.assign(form, { ...val })
      originalDims.value = {
        groups: val.groups ?? 1,
        rows: val.rows ?? 1,
        layers: val.layers ?? 1,
        columns: val.columns ?? 1,
      }
    } else {
      resetForm()
      originalDims.value = null
    }
  },
  { immediate: true },
)

const dimsWarning = computed(() =>
  dimensionsChanged(originalDims.value, {
    groups: form.groups ?? 1,
    rows: form.rows ?? 1,
    layers: form.layers ?? 1,
    columns: form.columns ?? 1,
  }),
)

const rules: FormRules = {
  code: [{ required: true, message: '请输入库房编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入库房名称', trigger: 'blur' }],
  groups: [{ required: true, message: '请输入组数', trigger: 'change' }],
  rows: [{ required: true, message: '请输入排数', trigger: 'change' }],
  layers: [{ required: true, message: '请输入层数', trigger: 'change' }],
  columns: [{ required: true, message: '请输入列数', trigger: 'change' }],
}

async function handleSubmit() {
  await formRef.value?.validate()
  emit('submit', buildWarehousePayload({ ...form }))
}
</script>

<style scoped>
.wh-dims { display: flex; gap: 8px; flex-wrap: wrap; }
.wh-dims :deep(.el-input-number) { width: 110px; }
.wh-warn { margin-bottom: 16px; }
</style>
