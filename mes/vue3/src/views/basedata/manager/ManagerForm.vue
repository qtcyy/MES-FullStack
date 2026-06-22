<template>
  <FormDialog v-model="visible" :title="model?.id ? '编辑动态表' : '新建动态表'" width="760px" :loading="loading" @submit="onSubmit">
    <el-form :model="header" label-width="90px">
      <el-form-item label="表名" required>
        <el-input v-model="header.tableName" placeholder="物理表名,如 sp_demo" :disabled="!!model?.id" />
      </el-form-item>
      <el-form-item label="表描述">
        <el-input v-model="header.tableDesc" placeholder="中文描述" />
      </el-form-item>
    </el-form>

    <div class="rows-toolbar">
      <span class="rows-title">字段明细</span>
      <el-button type="primary" :icon="Plus" size="small" @click="addRow">添加字段</el-button>
    </div>
    <el-table :data="rows" size="small" border>
      <el-table-column label="序" type="index" width="48" />
      <el-table-column label="字段名(物理列)">
        <template #default="{ row }"><el-input v-model="row.field" placeholder="如 code" /></template>
      </el-table-column>
      <el-table-column label="字段描述">
        <template #default="{ row }"><el-input v-model="row.fieldDesc" placeholder="中文表头" /></template>
      </el-table-column>
      <el-table-column label="必填" width="80">
        <template #default="{ row }"><el-switch v-model="row.mustFill" active-value="1" inactive-value="0" /></template>
      </el-table-column>
      <el-table-column label="操作" width="150">
        <template #default="{ $index }">
          <el-button link size="small" :disabled="$index === 0" @click="rows = moveRow(rows, $index, 'up')">上移</el-button>
          <el-button link size="small" :disabled="$index === rows.length - 1" @click="rows = moveRow(rows, $index, 'down')">下移</el-button>
          <el-button link type="danger" size="small" @click="rows.splice($index, 1)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </FormDialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import FormDialog from '@/components/FormDialog.vue'
import { validateManagerForm, buildUpsertPayload, parseMustFill, moveRow } from '@/utils/manager'
import { managerItemsByTableNameId } from '@/api/basedata/manager'
import type { SpTableManager, SpTableManagerItem, SpTableManagerDto } from '@/types/manager'

const props = defineProps<{ modelValue: boolean; model: SpTableManager | null; loading?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; submit: [SpTableManagerDto] }>()

const visible = ref(props.modelValue)
watch(() => props.modelValue, (v) => (visible.value = v))
watch(visible, (v) => emit('update:modelValue', v))

const header = reactive<SpTableManager>({ tableName: '', tableDesc: '' })
const rows = ref<SpTableManagerItem[]>([])

const addRow = () => rows.value.push({ field: '', fieldDesc: '', mustFill: '0' })

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    header.tableName = props.model?.tableName ?? ''
    header.tableDesc = props.model?.tableDesc ?? ''
    if (props.model?.id) {
      const items = await managerItemsByTableNameId(props.model.id)
      rows.value = items.map((it) => ({ ...it, mustFill: parseMustFill(it.mustFill) ? '1' : '0' }))
    } else {
      rows.value = []
    }
  },
)

const onSubmit = () => {
  const err = validateManagerForm(header, rows.value)
  if (err) {
    ElMessage.warning(err)
    return
  }
  emit('submit', buildUpsertPayload(header, rows.value, props.model?.id))
}
</script>

<style scoped>
.rows-toolbar { display: flex; align-items: center; justify-content: space-between; margin: var(--sp-3) 0 var(--sp-2); }
.rows-title { font-weight: 600; }
</style>
