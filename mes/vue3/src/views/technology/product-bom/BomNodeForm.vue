<template>
  <FormDialog
    :model-value="modelValue"
    :title="title"
    width="560px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form :model="form" label-width="92px">
      <el-form-item v-if="mode === 'create-root'" label="产品物料">
        <el-select
          v-model="form.productCode"
          filterable
          placeholder="请选择产品物料"
          style="width: 100%"
          @change="handlePickProduct"
        >
          <el-option
            v-for="p in (products ?? [])"
            :key="p.id"
            :label="`${p.materiel ?? ''} ${p.materielDesc}`"
            :value="p.materiel ?? ''"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="节点名称">
        <el-input v-model="form.nodeName" placeholder="请输入节点名称" clearable />
      </el-form-item>

      <el-form-item label="排序">
        <el-input-number v-model="form.sortOrder" :min="0" :precision="0" controls-position="right" style="width: 100%" />
      </el-form-item>

      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="选填" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { useRequest } from '@/composables/useRequest'
import { productBomProducts } from '@/api/technology/productBom'
import { buildBomNodePayload, validateBomNode, type NodeMode } from '@/utils/productBom'
import type { SpProductBom } from '@/types/technology'
import type { SpMaterile } from '@/types/basedata'

const props = defineProps<{
  modelValue: boolean
  mode: NodeMode
  /** add-child 时的父节点 id */
  parentId?: string
  /** edit 时的现有节点(含 id) */
  model: Partial<SpProductBom> | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [Partial<SpProductBom>]
}>()

const title = computed(() => {
  if (props.mode === 'create-root') return '新建产品 BOM'
  if (props.mode === 'add-child') return '新增子节点'
  return '编辑节点'
})

// 产品下拉仅 create-root 需要;immediate 加载,数据量小
const { data: products } = useRequest(productBomProducts, {
  immediate: true,
  initialData: [] as SpMaterile[],
})

const form = reactive<Partial<SpProductBom>>({
  id: undefined,
  productCode: undefined,
  nodeName: '',
  sortOrder: 0,
  remark: undefined,
})

function resetForm() {
  form.id = undefined
  form.productCode = undefined
  form.nodeName = ''
  form.sortOrder = 0
  form.remark = undefined
}

watch(
  () => [props.model, props.modelValue] as const,
  ([val, visible]) => {
    if (!visible) return
    if (props.mode === 'edit' && val) {
      resetForm()
      Object.assign(form, val)
      if (form.sortOrder == null) form.sortOrder = 0
    } else {
      resetForm()
    }
  },
  { immediate: true },
)

/** 选产品 → 默认把节点名带为产品描述(可改) */
function handlePickProduct(code: string) {
  const p = (products.value ?? []).find((x) => x.materiel === code)
  if (p && !form.nodeName) form.nodeName = p.materielDesc
}

function handleSubmit() {
  const err = validateBomNode({ ...form }, props.mode)
  if (err) {
    ElMessage.warning(err)
    return
  }
  emit('submit', buildBomNodePayload({ ...form }, { mode: props.mode, parentId: props.parentId }))
}
</script>
