<template>
  <el-dialog :model-value="modelValue" title="入库登账" width="520px" append-to-body @update:model-value="close">
    <el-form v-if="item" label-width="90px">
      <el-form-item label="物料">{{ item.materialCode }} · {{ item.materialDesc }}</el-form-item>
      <el-form-item label="数量">{{ item.quantity }} {{ item.unit }}</el-form-item>
      <el-form-item label="库位" required>
        <LocationSelect v-model="loc" :target-material="item.materialCode" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">确认登账</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import LocationSelect from './LocationSelect.vue'
import { postReceiptItem } from '@/api/inventory/receipt'
import type { SpWarehouseReceiptItem } from '@/types/inventory'

const props = defineProps<{ modelValue: boolean; item: SpWarehouseReceiptItem | null }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; posted: [] }>()

const loc = ref<{ warehouseId?: string; locationId?: string }>({})
const submitting = ref(false)

watch(() => props.modelValue, (v) => { if (v) loc.value = {} })

function close() { emit('update:modelValue', false) }

async function submit() {
  if (!props.item) return
  if (!loc.value.warehouseId || !loc.value.locationId) { ElMessage.warning('请选择库房与库位'); return }
  submitting.value = true
  try {
    await postReceiptItem({ itemId: props.item.id, warehouseId: loc.value.warehouseId, locationId: loc.value.locationId })
    ElMessage.success('登账成功')
    emit('posted')
    close()
  } finally {
    submitting.value = false
  }
}
</script>
