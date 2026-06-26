<template>
  <FormDialog
    :model-value="modelValue"
    :title="isEdit ? '编辑物料行' : '新增物料行'"
    width="560px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form :model="form" label-width="92px">
      <el-form-item label="物料" prop="materialCode">
        <el-select
          v-model="form.materialCode"
          filterable
          placeholder="请选择物料"
          style="width: 100%"
          @change="handlePickMaterial"
        >
          <el-option
            v-for="m in (materials ?? [])"
            :key="m.id"
            :label="`${m.materiel ?? ''} ${m.materielDesc}`"
            :value="m.materiel ?? ''"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="物料描述">
        <el-input v-model="form.materialDesc" placeholder="选择物料后自动带出" />
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="用量" prop="quantity">
            <el-input-number v-model="form.quantity" :min="0.01" :precision="2" :step="1" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="单位">
            <el-input v-model="form.unit" placeholder="个" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="排序">
        <el-input-number v-model="form.sortOrder" :min="0" :precision="0" controls-position="right" style="width: 100%" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { useRequest } from '@/composables/useRequest'
import { materilePage } from '@/api/basedata/materile'
import { buildBomItemPayload, validateBomItem, materielToItem } from '@/utils/productBom'
import type { SpProductBomItem } from '@/types/technology'
import type { SpMaterile } from '@/types/basedata'

const props = defineProps<{
  modelValue: boolean
  /** 所属节点 id */
  bomId: string
  /** null=新增;有 id=编辑 */
  model: Partial<SpProductBomItem> | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [Partial<SpProductBomItem>]
}>()

const isEdit = computed(() => !!props.model?.id)

// 全量物料下拉(组件行可选任意物料)
const { data: materialsPage } = useRequest(
  () => materilePage({ current: 1, size: 9999 }),
  { immediate: true },
)
const materials = computed<SpMaterile[]>(() => materialsPage.value?.records ?? [])

const form = reactive<Partial<SpProductBomItem>>({
  id: undefined,
  itemType: 'material',
  materialCode: '',
  materialDesc: '',
  quantity: 1,
  unit: '个',
  sortOrder: 0,
})

function resetForm() {
  form.id = undefined
  form.itemType = 'material'
  form.materialCode = ''
  form.materialDesc = ''
  form.quantity = 1
  form.unit = '个'
  form.sortOrder = 0
}

watch(
  () => props.model,
  (val) => {
    if (val) Object.assign(form, { itemType: 'material', quantity: 1, unit: '个', sortOrder: 0, ...val })
    else resetForm()
  },
  { immediate: true },
)

/** 选物料 → 自动带出描述/单位 */
function handlePickMaterial(code: string) {
  const m = materials.value.find((x) => x.materiel === code)
  if (m) {
    const mapped = materielToItem(m)
    form.materialDesc = mapped.materialDesc
    form.unit = mapped.unit
  }
}

function handleSubmit() {
  const err = validateBomItem({ ...form })
  if (err) {
    ElMessage.warning(err)
    return
  }
  emit('submit', buildBomItemPayload({ ...form, bomId: props.bomId }))
}
</script>
