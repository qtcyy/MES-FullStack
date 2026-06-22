<template>
  <FormDialog
    :model-value="modelValue"
    :title="rowId ? '编辑数据' : '新增数据'"
    width="560px"
    :loading="loading"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
    @submit="onSubmit"
  >
    <el-form :model="values" label-width="120px">
      <el-form-item
        v-for="it in items"
        :key="it.field"
        :label="it.fieldDesc || it.field"
        :required="parseMustFill(it.mustFill)"
      >
        <el-input v-model="values[it.field]" :placeholder="it.field" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { parseMustFill } from '@/utils/manager'
import { emptyRow, validateRow, buildDataPayload } from '@/utils/managerData'
import type { SpTableManagerItem, ManagerDataRow } from '@/types/manager'

const props = defineProps<{
  modelValue: boolean
  items: SpTableManagerItem[]
  tableName: string
  tableNameId: string
  row: ManagerDataRow | null
  loading?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; submit: [Record<string, string>] }>()

const values = reactive<Record<string, string>>({})
const rowId = ref<string | undefined>(undefined)

// 打开时回填:编辑用 row 值,新增用空行;先清残留键
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    const base = props.row ?? emptyRow(props.items)
    for (const k of Object.keys(values)) delete values[k]
    for (const it of props.items) values[it.field] = base[it.field] ?? ''
    rowId.value = props.row?.id
  },
)

const onSubmit = () => {
  const err = validateRow(props.items, values)
  if (err) {
    ElMessage.warning(err)
    return
  }
  emit('submit', buildDataPayload(props.items, values, props.tableName, props.tableNameId, rowId.value))
}
</script>
