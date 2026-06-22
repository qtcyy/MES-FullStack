<template>
  <FormDialog
    :model-value="modelValue"
    :title="model?.id ? '编辑动态表' : '新建动态表'"
    width="760px"
    :loading="loading"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
    @submit="onSubmit"
  >
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
          <el-button link size="small" :disabled="$index === 0" @click="moveUp($index)">上移</el-button>
          <el-button link size="small" :disabled="$index === rows.length - 1" @click="moveDown($index)">下移</el-button>
          <el-button link type="danger" size="small" @click="removeRow($index)">删除</el-button>
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

const header = reactive<SpTableManager>({ tableName: '', tableDesc: '' })
const rows = ref<SpTableManagerItem[]>([])

const addRow = () => rows.value.push({ field: '', fieldDesc: '', mustFill: '0' })
const moveUp = (index: number) => (rows.value = moveRow(rows.value, index, 'up'))
const moveDown = (index: number) => (rows.value = moveRow(rows.value, index, 'down'))
const removeRow = (index: number) => rows.value.splice(index, 1)

// 守卫:每次打开自增 token,await 返回后比对,过期结果丢弃,防快速切换编辑不同行的竞态
let loadToken = 0
watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    header.tableName = props.model?.tableName ?? ''
    header.tableDesc = props.model?.tableDesc ?? ''
    rows.value = [] // 先清空,避免 await 期间表头已切换但仍显示上次明细
    const id = props.model?.id
    if (!id) return
    const token = ++loadToken
    try {
      const items = await managerItemsByTableNameId(id)
      if (token !== loadToken) return // 已被后续打开覆盖,丢弃过期结果
      rows.value = items.map((it) => ({ ...it, mustFill: parseMustFill(it.mustFill) ? '1' : '0' }))
    } catch {
      if (token === loadToken) rows.value = [] // 接口失败兜底,响应拦截器已提示
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
